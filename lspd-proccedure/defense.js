/* ═══════════════════════════════════════════════════════════════════════
 *  defense.js — « Préparer la défense ».
 *
 *  À partir d'un rapport validé, produit une fiche de préparation à
 *  l'audience : ce qu'un avocat, un procureur ou un juge va attaquer,
 *  l'article qui fonde la question, ce que le rapport y répond déjà, et
 *  à défaut ce qu'il faut y ajouter AVANT de se présenter.
 *
 *  Données pures : aucun accès au DOM. app.js appelle buildDefenseDoc()
 *  puis rend le résultat (modale + export).
 * ═══════════════════════════════════════════════════════════════════ */
(function (root) {
    'use strict';

    var RULES = root.LSPD_RULES ||
        (typeof require !== 'undefined' ? require('./legal-rules.js') : null);

    // ═══════════════════════════════════════════════════════════════════
    // POINTS D'ATTAQUE PROPRES À CERTAINES QUALIFICATIONS
    //
    // Certaines infractions ont un élément constitutif que le rapport doit
    // impérativement établir, faute de quoi la charge tombe à l'audience.
    // Indexé par identifiant d'article du CODE PÉNAL.
    // ═══════════════════════════════════════════════════════════════════
    var CHARGE_ATTACKS = {
        '431-7': {
            question: "Quelle sommation claire et intelligible a été adressée à mon client avant que vous ne lui reprochiez un refus d'obtempérer ?",
            element: "sommation claire et intelligible préalable",
            fix: "L'Art. 431-7 fait de la sommation un élément constitutif. Le récit doit préciser qui l'a adressée, comment (haut-parleur, gyrophares, injonction verbale) et à quel moment."
        },
        '433-2': {
            question: "En quoi la résistance de mon client était-elle « violente » au sens de l'article 433-2, et non une simple réticence ?",
            element: "résistance violente caractérisée",
            fix: "Décrivez les gestes précis (coups portés, agrippement, projection) — la rébellion suppose une résistance violente, pas un refus passif."
        },
        '607': {
            question: "Sur quelle base avez-vous établi la vitesse de mon client, en l'absence de preuve radar ?",
            element: "constatation visuelle par un officier",
            fix: "L'Art. 607 est précisément la qualification retenue quand la vitesse est constatée sans radar. Si vous disposez d'une mesure, requalifiez en Art. 605 ou 606, plus lourds."
        },
        '605': {
            question: "Où figure la mesure radar fondant cet excès de vitesse ?",
            element: "mesure de vitesse documentée",
            fix: "Les Art. 604 à 606 supposent une mesure. Sans preuve radar, la qualification correcte est l'Art. 607 (vitesse excessive)."
        },
        '606': {
            question: "Où figure la mesure radar fondant ce délit de grande vitesse ?",
            element: "mesure de vitesse documentée",
            fix: "Sans preuve radar, l'Art. 606 est indéfendable — repliez-vous sur l'Art. 607."
        },
        '617': {
            question: "Comment établissez-vous que mon client savait qu'il venait de causer un accident ?",
            element: "connaissance de l'accident par le conducteur",
            fix: "Le délit de fuite suppose que le conducteur savait avoir causé l'accident. Documentez la visibilité du choc, l'arrêt momentané, ou tout élément établissant cette connaissance."
        },
        '211': {
            question: "Sur quels éléments matériels fondez-vous l'intention homicide ?",
            element: "intention homicide déduite des circonstances",
            fix: "L'Art. 211 permet de déduire l'intention des moyens employés et de la partie du corps visée. Le récit doit fournir ces éléments."
        },
        '212': {
            question: "Quels éléments établissent la préméditation ou le guet-apens ?",
            element: "préméditation caractérisée",
            fix: "Sans élément de préméditation documenté, la qualification retombe sur l'Art. 211."
        },
        '241-1': {
            question: "L'arme reprochée à mon client a-t-elle été saisie, inventoriée et placée sous scellés ?",
            element: "arme saisie et placée sous scellés",
            fix: "Une charge d'arme sans arme au dossier est la première chose qu'un avocat attaquera. Documentez la saisie, le modèle, le numéro de série et le scellé (Art. 4-1-5, 7-3-1)."
        },
        '241-3': {
            question: "L'arme reprochée à mon client a-t-elle été saisie, inventoriée et placée sous scellés ?",
            element: "arme saisie et placée sous scellés",
            fix: "Documentez la saisie, le modèle, le numéro de série et la mise sous scellés (Art. 4-1-5, 7-3-1)."
        },
        '246': {
            question: "Qu'est-ce qui établit l'absence de motif légitime au tir reproché à mon client ?",
            element: "absence de motif légitime",
            fix: "Précisez le contexte du tir : lieu public, direction, absence de menace justifiant une légitime défense (Art. 121)."
        },
        '234': {
            question: "Quelle quantité exacte a été saisie, pesée et placée sous scellés ?",
            element: "quantité saisie et inventoriée",
            fix: "Le seuil quantitatif conditionne la qualification. Documentez la pesée, l'inventaire et le numéro de scellé."
        },
        '311-2': {
            question: "Quelles circonstances aggravantes retenez-vous, et sur quels éléments ?",
            element: "circonstances aggravantes caractérisées",
            fix: "L'Art. 311-2 exige une ou deux circonstances aggravantes explicites. Nommez-les, sinon la qualification retombe sur le vol simple (Art. 311-1)."
        }
    };

    // Ordre d'affichage des phases de la procédure.
    var PHASE_ORDER = [
        'Contrôle initial',
        'Poursuite',
        'Usage de la force',
        'Interpellation',
        'Fouille & scellés',
        'Droits & avocat',
        'Prise en charge médicale',
        'Qualification des charges',
        'Suite procédurale'
    ];

    var SEVERITY_RANK = { fail: 0, warn: 1, ok: 2, na: 3 };

    // ═══════════════════════════════════════════════════════════════════
    // CONSTRUCTION DU DOCUMENT
    // ═══════════════════════════════════════════════════════════════════
    function buildDefenseDoc(ctx, evaluation) {
        var audit = RULES.auditProcedure(ctx);

        // ─── Points d'attaque issus des règles de procédure ───
        var attacks = audit
            .filter(function (r) { return r.status !== 'na'; })
            .map(function (r) {
                return {
                    phase: r.phase,
                    question: r.question,
                    articles: r.articles,
                    reponse: (r.status === 'ok' || r.status === 'warn') ? r.detail : '',
                    manque: (r.status === 'fail') ? r.detail : '',
                    aFaire: r.fix || '',
                    severity: r.status
                };
            });

        // ─── Points d'attaque propres aux qualifications retenues ───
        (ctx.charges || []).forEach(function (charge) {
            (charge.articles || []).forEach(function (ref) {
                var id = String(ref).split(':')[1];
                var spec = CHARGE_ATTACKS[id];
                if (!spec) return;
                if (attacks.some(function (a) { return a.question === spec.question; })) return;
                attacks.push({
                    phase: 'Qualification des charges',
                    question: spec.question,
                    articles: [ref],
                    reponse: '',
                    manque: 'Charge retenue : « ' + charge.name + ' ». Le rapport doit établir : ' + spec.element + '.',
                    aFaire: spec.fix,
                    severity: 'warn'
                });
            });
        });

        // ─── Charges sans qualification identifiée ───
        var unmapped = (ctx.charges || []).filter(function (c) { return !(c.articles || []).length; });
        if (unmapped.length) {
            attacks.push({
                phase: 'Qualification des charges',
                question: "Sur quel article du code pénal fondez-vous précisément cette charge ?",
                articles: [],
                reponse: '',
                manque: unmapped.length + ' charge(s) sans article identifié : '
                    + unmapped.map(function (c) { return '« ' + c.name + ' »'; }).join(', ') + '.',
                aFaire: "Rattachez chaque charge à un article du CODE PÉNAL avant l'audience. Une charge non qualifiée ne se défend pas.",
                severity: 'warn'
            });
        }

        // ─── Lacunes de complétude converties en points d'attaque ───
        (evaluation.missing || []).forEach(function (m) {
            attacks.push({
                phase: 'Contrôle initial',
                question: "Pourquoi le rapport ne mentionne-t-il pas : " + m.label.toLowerCase() + " ?",
                articles: m.articles || [],
                reponse: '',
                manque: 'Élément absent du rapport : ' + m.label + '.',
                aFaire: m.probe,
                severity: 'fail'
            });
        });

        // ─── Regroupement par phase, le plus grave d'abord ───
        var byPhase = {};
        attacks.forEach(function (a) {
            var p = a.phase || 'Suite procédurale';
            (byPhase[p] = byPhase[p] || []).push(a);
        });
        var groups = PHASE_ORDER
            .filter(function (p) { return byPhase[p] && byPhase[p].length; })
            .map(function (p) {
                byPhase[p].sort(function (x, y) { return SEVERITY_RANK[x.severity] - SEVERITY_RANK[y.severity]; });
                return { phase: p, items: byPhase[p] };
            });

        // ─── Tableau des délais ───
        var delays = buildDelays(ctx);

        // ─── Synthèse ───
        var counts = { fail: 0, warn: 0, ok: 0 };
        attacks.forEach(function (a) { if (counts[a.severity] !== undefined) counts[a.severity]++; });
        audit.forEach(function (r) { if (r.status === 'ok') counts.ok++; });

        // ─── À corriger avant validation ───
        var todo = attacks
            .filter(function (a) { return a.severity === 'fail' || (a.severity === 'warn' && a.aFaire); })
            .map(function (a) { return { question: a.question, articles: a.articles, aFaire: a.aFaire || a.manque, severity: a.severity }; });

        return {
            meta: {
                date: ctx.date, time: ctx.time,
                lieu: ctx.lieu, secteur: ctx.secteur,
                suspect: [ctx.suspect.prenom, ctx.suspect.nom].filter(Boolean).join(' ') || 'Non identifié',
                agents: (ctx.agents || []).map(function (a) { return (a.grade || '') + ' ' + (a.name || ''); }),
                gravite: RULES.graviteMax(ctx.charges) || '—',
                completude: evaluation.percent
            },
            counts: counts,
            delays: delays,
            groups: groups,
            todo: todo,
            charges: (ctx.charges || []).map(function (c) {
                return {
                    name: c.name,
                    categorie: c.categorie || '',
                    citations: (c.articles || []).map(function (r) { return RULES.citation(r); })
                };
            })
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // TABLEAU DES DÉLAIS — arithmétique réelle sur les heures saisies
    // ═══════════════════════════════════════════════════════════════════
    function buildDelays(ctx) {
        var rows = [];
        var grav = RULES.graviteMax(ctx.charges);

        // `limite` = plafond au-delà duquel le délai est irrégulier.
        // `repere` = seuil intermédiaire, facultatif : entre les deux, le
        // délai reste soutenable mais devra être justifié à l'audience.
        function row(label, from, to, limite, ref, repere) {
            var d = RULES.deltaMin(from, to);
            var statut;
            if (d === null) statut = 'non vérifiable';
            else if (limite === null) statut = 'mesuré';
            else if (d > limite) statut = 'DÉPASSÉ';
            else if (repere && d > repere) statut = 'à justifier';
            else statut = 'conforme';
            rows.push({
                label: label,
                mesure: d === null ? '—' : RULES.formatDuree(d),
                limite: limite === null ? '—' : (repere ? repere + '–' : '') + limite + ' min',
                statut: statut,
                citation: ref ? RULES.citation(ref) : ''
            });
        }

        row('Faits → interpellation (flagrance)', ctx.time, ctx.heureArrestation, 20, 'proc:7-2-1-5');
        row('Interpellation → notification des droits', ctx.heureArrestation, ctx.miranda.heure, null, 'proc:2-2-5');
        if (grav && grav !== 'Contravention') {
            row('Interpellation → présentation au procureur',
                ctx.heureArrestation, ctx.heurePresentationProcureur,
                RULES.DELAI_PROCUREUR[grav] || null, 'proc:2-2-8');
        }
        if (ctx.lawyer.requested) {
            row('Notification des droits → contact avocat', ctx.miranda.heure, ctx.lawyer.heureContact, 30, 'proc:5-3-1', 15);
            row('Contact avocat → arrivée avocat', ctx.lawyer.heureContact, ctx.lawyer.heureArrivee, 25, 'proc:5-3-1');
        }
        if (ctx.injured) {
            row('Évacuation → sortie médicale', ctx.medical.heureEvac, ctx.medical.heureSortie, 60, 'proc:2-4-4');
            row('Interpellation → évacuation', ctx.heureArrestation, ctx.medical.heureEvac, null, 'proc:2-4-1');
        }
        if (ctx.pursuit) {
            row('Faits → fin de poursuite', ctx.time, ctx.heureFinPoursuite, null, null);
        }
        row('Interpellation → transport', ctx.heureArrestation, ctx.transport.heure, null, null);

        return rows;
    }

    // ═══════════════════════════════════════════════════════════════════
    // RENDU TEXTE (copie / export Markdown)
    // ═══════════════════════════════════════════════════════════════════
    var MARK = { fail: '✗', warn: '!', ok: '✓', na: '·' };

    function renderText(doc) {
        var L = [];
        L.push('FICHE DE PRÉPARATION À L\'AUDIENCE');
        L.push('═══════════════════════════════════════════════');
        L.push('');
        L.push('Affaire      : ' + doc.meta.suspect);
        L.push('Faits        : le ' + doc.meta.date + ' vers ' + doc.meta.time
            + (doc.meta.secteur ? ' — secteur ' + doc.meta.secteur : ''));
        if (doc.meta.lieu) L.push('Lieu         : ' + doc.meta.lieu);
        L.push('Unité        : ' + (doc.meta.agents.join(', ') || 'non renseignée'));
        L.push('Gravité max  : ' + doc.meta.gravite);
        L.push('Complétude   : ' + doc.meta.completude + ' %');
        L.push('');
        L.push('Synthèse : ' + doc.counts.fail + ' point(s) bloquant(s), '
            + doc.counts.warn + ' point(s) à consolider, ' + doc.counts.ok + ' point(s) conforme(s).');
        L.push('');

        // ─── Délais ───
        L.push('───────────────────────────────────────────────');
        L.push('1. RESPECT DES DÉLAIS');
        L.push('───────────────────────────────────────────────');
        L.push('');
        doc.delays.forEach(function (d) {
            L.push('• ' + d.label);
            L.push('    Mesuré : ' + d.mesure + '   |   Plafond : ' + d.limite + '   |   ' + d.statut.toUpperCase());
            if (d.citation) L.push('    ' + d.citation);
        });
        L.push('');

        // ─── Charges ───
        if (doc.charges.length) {
            L.push('───────────────────────────────────────────────');
            L.push('2. QUALIFICATION DES CHARGES');
            L.push('───────────────────────────────────────────────');
            L.push('');
            doc.charges.forEach(function (c) {
                L.push('• ' + c.name + (c.categorie ? '  [' + c.categorie + ']' : ''));
                if (c.citations.length) c.citations.forEach(function (ci) { L.push('    ' + ci); });
                else L.push('    ⚠ Aucun article identifié — à qualifier avant l\'audience.');
            });
            L.push('');
        }

        // ─── Points d'attaque ───
        L.push('───────────────────────────────────────────────');
        L.push('3. POINTS D\'ATTAQUE ANTICIPÉS');
        L.push('───────────────────────────────────────────────');
        doc.groups.forEach(function (g) {
            L.push('');
            L.push('▸ ' + g.phase.toUpperCase());
            g.items.forEach(function (it) {
                L.push('');
                L.push('  [' + MARK[it.severity] + '] Q : ' + it.question);
                if (it.articles && it.articles.length) {
                    it.articles.forEach(function (r) { L.push('      Fondement  : ' + RULES.citation(r)); });
                }
                if (it.reponse) L.push('      Le rapport : ' + it.reponse);
                if (it.manque) L.push('      Faiblesse  : ' + it.manque);
                if (it.aFaire) L.push('      À ajouter  : ' + it.aFaire);
            });
        });
        L.push('');

        // ─── À corriger ───
        if (doc.todo.length) {
            L.push('───────────────────────────────────────────────');
            L.push('4. À CORRIGER AVANT DE SE PRÉSENTER');
            L.push('───────────────────────────────────────────────');
            L.push('');
            doc.todo.forEach(function (t, i) {
                L.push((i + 1) + '. ' + t.aFaire);
                if (t.articles && t.articles.length) L.push('   ' + t.articles.map(function (r) { return RULES.citation(r); }).join(' ; '));
            });
            L.push('');
        }

        L.push('───────────────────────────────────────────────');
        L.push('Document interne de préparation — ne pas verser au dossier.');

        return L.join('\n');
    }

    var API = {
        buildDefenseDoc: buildDefenseDoc,
        renderText: renderText,
        CHARGE_ATTACKS: CHARGE_ATTACKS,
        PHASE_ORDER: PHASE_ORDER
    };

    root.LSPD_DEFENSE = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
