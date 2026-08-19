/* ═══════════════════════════════════════════════════════════════════════
 *  legal-rules.js — Couche métier légale du Terminal de Procédures.
 *
 *  ÉCRIT À LA MAIN — fait autorité. Ne pas confondre avec legal-data.js,
 *  qui est généré depuis les .md et ne contient que le texte des articles.
 *
 *  Ce module expose :
 *    · COMPLIANCE_FIELDS  — spec des champs « Chronologie & conformité »,
 *                           rendue à l'identique dans les deux modules.
 *    · CHECKLIST          — éléments obligatoires d'un rapport complet.
 *    · evaluate(ctx)      — score de complétude + éléments manquants.
 *    · PROC_RULES         — règles de délai / légalité, avec article.
 *    · auditProcedure()   — application des règles à un contexte.
 *    · suggestArticles()  — qualification d'une infraction en texte libre.
 *
 *  Données pures et fonctions pures : AUCUN accès au DOM. Le rendu et le
 *  câblage vivent dans app.js, l'analyse d'audience dans defense.js.
 * ═══════════════════════════════════════════════════════════════════ */
(function (root) {
    'use strict';

    var LEGAL = root.LSPD_LEGAL ||
        (typeof require !== 'undefined' ? require('./legal-data.js') : { penal: {}, proc: {} });

    // ═══════════════════════════════════════════════════════════════════
    // SEUIL DE VALIDATION
    //
    // Un rapport est validable si DEUX conditions sont réunies :
    //   1. le score de complétude atteint THRESHOLD ;
    //   2. aucun élément marqué `critical` ne manque.
    //
    // La seconde condition n'est pas redondante. Sur un dossier lourd,
    // la checklist compte plus de vingt items applicables : il suffirait
    // alors de deux omissions pour rester au-dessus de 90 % tout en ayant
    // perdu, par exemple, l'heure de sortie médicale exigée par l'article
    // 2-4-4. Les éléments `critical` sont ceux dont le code fait une
    // obligation directe — ils ne se compensent pas.
    // ═══════════════════════════════════════════════════════════════════
    var THRESHOLD = 0.90;

    // ═══════════════════════════════════════════════════════════════════
    // ACCÈS AUX ARTICLES
    // Beaucoup d'articles du code de procédure n'ont pas d'intitulé propre
    // dans la source (le texte suit directement le numéro). On leur donne
    // ici un libellé d'affichage court, utilisé dans l'UI et le document
    // de défense. Le TEXTE, lui, vient toujours de legal-data.js.
    // ═══════════════════════════════════════════════════════════════════
    var ART_LABELS = {
        'proc:2-1-9': "Durée maximale de rétention en enquête préliminaire",
        'proc:2-2-1': "Motifs raisonnables justifiant l'arrestation",
        'proc:2-2-2': "Information sur la nature des accusations",
        'proc:2-2-3': "Droit d'être informé du motif avant interrogatoire",
        'proc:2-2-4': "Respect des droits durant l'interrogatoire",
        'proc:2-2-5': "Notification des droits constitutionnels",
        'proc:2-2-6': "Avertissements Miranda",
        'proc:2-2-7': "Contenu obligatoire du rapport d'arrestation",
        'proc:2-2-8': "Délai de présentation au procureur",
        'proc:2-3-1-6': "Tenue de l'audience préliminaire sous 24 h",
        'proc:2-4-1': "Conditions de l'intervention médicale",
        'proc:2-4-2': "Rapport d'incident sous 12 h si blessure imputable à l'agent",
        'proc:2-4-4': "Surveillance médicale post-soins (1 h maximum)",
        'proc:4-1-1': "Fouille par une personne du même sexe",
        'proc:4-1-2': "Fouille fondée sur une suspicion raisonnable",
        'proc:4-1-4': "Droits énoncés préalablement à la fouille",
        'proc:4-1-5': "Inventaire détaillé de la fouille",
        'proc:4-1-6': "Mise sous scellés des éléments saisis",
        'proc:4-2-2': "Palpation de sécurité — nécessité",
        'proc:4-3-2': "Menottage — circonstances objectives",
        'proc:5-1-2': "Entretien avocat avant audition (15 min)",
        'proc:5-2-5': "Remise du rapport à l'avocat",
        'proc:5-3-1': "Délais de recours à l'avocat (15 min + 10 min)",
        'proc:5-3-2': "Poursuite de la procédure sans avocat disponible",
        'proc:5-3-3': "Enregistrement de l'interrogatoire hors présence d'avocat",
        'proc:6-2-4': "Détention provisoire (72 h maximum)",
        'proc:7-2-1-5': "Flagrance — arrestation dans les 20 minutes",
        'proc:7-2-1-6': "Mandat d'arrêt requis au-delà de la flagrance",
        'proc:7-2-2-3': "Perquisition de véhicule en flagrance sans mandat",
        'proc:7-3-1': "Mise sous scellés des preuves",
        'proc:7-3-2': "Inventaire obligatoire des scellés",
        'proc:15-3': "Délais de récidive légale",
        'penal:110': "Prescription des faits",
        'penal:121': "Légitime défense — proportionnalité",
        'penal:122': "Usage d'une arme en légitime défense",
        'penal:123': "Usage des armes par les forces de l'ordre",
        'penal:124': "État de nécessité"
    };

    // Résout une référence « ns:id » en objet d'affichage.
    function article(ref) {
        var parts = String(ref).split(':');
        var ns = parts[0], id = parts[1];
        var src = (LEGAL[ns] || {})[id] || {};
        var label = ART_LABELS[ref] || src.titre || '';
        // Un article indexé « 629-bis » parce qu'il partage son numéro avec
        // un autre doit être cité sous le numéro qui figure réellement au
        // code : « Art. 629 », pas « Art. 629-bis ».
        var numAffiche = src.numSource || id;
        return {
            ref: ref,
            id: id,
            code: ns === 'penal' ? 'Code pénal' : 'Code de procédure',
            num: 'Art. ' + numAffiche,
            label: label,
            categorie: src.categorie || '',
            amende: src.amende || '',
            prison: src.prison || '',
            texte: src.texte || '',
            found: !!src.texte
        };
    }

    // « Art. 2-2-7 (Code de procédure) — Contenu obligatoire du rapport »
    function citation(ref) {
        var a = article(ref);
        return a.num + ' (' + a.code + ')' + (a.label ? ' — ' + a.label : '');
    }

    // ═══════════════════════════════════════════════════════════════════
    // OUTILS HORAIRES
    // Les agents saisissent « 02h15 », « 2:15 », « 0215 » ou « 2h15 ».
    // Tout est ramené à un nombre de minutes depuis minuit.
    // ═══════════════════════════════════════════════════════════════════
    function parseHeure(str) {
        if (str === 0) return null;
        var s = String(str || '').trim().toLowerCase();
        if (!s || /^(neant|néant|xx|xxhxx|-|n\/a)$/.test(s)) return null;
        var m = s.match(/^(\d{1,2})\s*(?:h|:|\.)\s*(\d{1,2})?$/);
        if (!m) {
            m = s.match(/^(\d{2})(\d{2})$/);          // « 0215 »
            if (m) m = [m[0], m[1], m[2]];
            else {
                m = s.match(/^(\d{1,2})\s*h?$/);       // « 14 » / « 14h »
                if (m) m = [m[0], m[1], '0'];
                else return null;
            }
        }
        var h = parseInt(m[1], 10);
        var mn = parseInt(m[2] || '0', 10);
        if (isNaN(h) || isNaN(mn) || h > 23 || mn > 59) return null;
        return h * 60 + mn;
    }

    // Écart en minutes de `a` vers `b`, avec passage de minuit.
    // Un écart « négatif » de plus de 12 h est réinterprété comme un
    // franchissement de minuit (une intervention ne dure pas 20 heures).
    function deltaMin(a, b) {
        var ma = parseHeure(a), mb = parseHeure(b);
        if (ma === null || mb === null) return null;
        var d = mb - ma;
        if (d < -720) d += 1440;
        return d;
    }

    function formatDuree(min) {
        if (min === null || min === undefined) return '—';
        var sign = min < 0 ? '-' : '';
        var v = Math.abs(min);
        var h = Math.floor(v / 60), m = v % 60;
        return sign + (h ? h + ' h ' + (m < 10 ? '0' : '') + m : m + ' min');
    }

    // Normalise « 2h5 » → « 02h05 » pour l'affichage dans le rapport.
    function formatHeure(str) {
        var m = parseHeure(str);
        if (m === null) return String(str || '').trim();
        var h = Math.floor(m / 60), mn = m % 60;
        return (h < 10 ? '0' : '') + h + 'h' + (mn < 10 ? '0' : '') + mn;
    }

    // ═══════════════════════════════════════════════════════════════════
    // GRAVITÉ DES CHARGES
    // Détermine le délai de présentation au procureur (Art. 2-2-8) et la
    // durée de rétention admissible (Art. 2-1-9).
    // ═══════════════════════════════════════════════════════════════════
    var GRAVITE_ORDRE = ['Contravention', 'Délit mineur', 'Délit majeur', 'Crime'];

    function graviteMax(charges) {
        var best = -1;
        (charges || []).forEach(function (c) {
            var i = GRAVITE_ORDRE.indexOf(c.categorie);
            if (i > best) best = i;
        });
        return best < 0 ? null : GRAVITE_ORDRE[best];
    }

    // Art. 2-2-8 (modifié par le DÉCRET N5-GOUV du 14/08/2026)
    var DELAI_PROCUREUR = { 'Délit mineur': 30, 'Délit majeur': 45, 'Crime': 60 };
    // Art. 2-1-9 — rétention en enquête préliminaire
    var DELAI_RETENTION = { 'Délit mineur': 30, 'Délit majeur': 30, 'Crime': 60 };

    // ═══════════════════════════════════════════════════════════════════
    // CHAMPS « CHRONOLOGIE & CONFORMITÉ »
    //
    // Une seule spec, rendue à l'identique dans le Rapport Rapide et dans
    // le Rapport de Patrouille. `when(ctx)` assure l'affichage progressif :
    // un champ médical n'apparaît que si un blessé est documenté.
    //
    // `key` devient l'id DOM `<prefix><Key>` (rfHeureDroits / patrolHeureDroits)
    // et la clé de lecture dans le contexte.
    // ═══════════════════════════════════════════════════════════════════
    var COMPLIANCE_FIELDS = [
        // ─── Repères de lieu ───
        {
            key: 'secteur', group: 'Lieu & chronologie', type: 'text',
            label: 'Secteur de l\'intervention',
            placeholder: 'Ex : Wardog, Mirror Park, Sandy Shores',
            hint: 'Le secteur, distinct de l\'adresse précise.',
            when: function () { return true; }
        },
        // ─── Chronologie ───
        {
            key: 'heureFinPoursuite', group: 'Lieu & chronologie', type: 'time',
            label: 'Heure de fin de poursuite',
            when: function (ctx) { return ctx.pursuit; }
        },
        {
            key: 'lieuFinPoursuite', group: 'Lieu & chronologie', type: 'text',
            label: 'Lieu exact de fin de poursuite',
            placeholder: 'Ex : intersection El Rancho Blvd / Dry Dock St',
            when: function (ctx) { return ctx.pursuit; }
        },

        // ─── Usage de la force ───
        {
            key: 'justificationForce', group: 'Usage de la force', type: 'text',
            label: 'Justification de l\'usage de la force',
            placeholder: 'Ex : la résistance active du suspect à l\'interpellation',
            hint: 'Art. 121 — l\'acte doit être nécessaire et proportionné.',
            when: function (ctx) { return ctx.force.used; }
        },
        {
            key: 'menaceInvoquee', group: 'Usage de la force', type: 'select',
            label: 'Cas légal invoqué pour l\'usage de l\'arme',
            hint: 'Art. 123 — les cinq cas sont limitatifs.',
            options: [
                '',
                'Atteinte à la vie ou à l\'intégrité physique portée contre les agents ou autrui (Art. 123-1)',
                'Défense des lieux occupés ou des personnes confiées, après identification et avertissement (Art. 123-2)',
                'Fuite d\'une personne représentant une menace imminente de mort ou de blessures graves (Art. 123-3)',
                'Immobilisation d\'un véhicule dont le conducteur n\'obtempère pas et dont les occupants menacent autrui (Art. 123-4)',
                'Prévention de la réitération imminente de meurtres venant d\'être commis (Art. 123-5)',
                'Aucun de ces cas'
            ],
            when: function (ctx) { return ctx.force.weapon; }
        },
        {
            key: 'sommation', group: 'Usage de la force', type: 'select',
            label: 'Avertissement / sommation préalable',
            hint: 'Art. 123 — avertissement clair exigé lorsque les circonstances le permettent.',
            options: [
                '',
                'Oui — avertissement clair adressé avant l\'usage de l\'arme',
                'Non — les circonstances ne le permettaient pas',
                'Non'
            ],
            when: function (ctx) { return ctx.force.weapon; }
        },

        // ─── Médical ───
        {
            key: 'causeBlessure', group: 'Prise en charge médicale', type: 'select',
            label: 'Origine de la blessure',
            hint: 'Détermine l\'obligation de rapport sous 12 h (Art. 2-4-2).',
            options: [
                '',
                'Action directe des forces de l\'ordre',
                'Collision / accident de la circulation',
                'Fait d\'un tiers',
                'Antérieure à l\'intervention',
                'Auto-infligée'
            ],
            when: function (ctx) { return ctx.injured; }
        },
        {
            key: 'natureBlessure', group: 'Prise en charge médicale', type: 'text',
            label: 'Nature et localisation de la blessure',
            placeholder: 'Ex : plaie par balle au bras droit',
            when: function (ctx) { return ctx.injured; }
        },
        {
            key: 'heureEvacuation', group: 'Prise en charge médicale', type: 'time',
            label: 'Heure d\'évacuation',
            when: function (ctx) { return ctx.injured; }
        },
        {
            key: 'etablissement', group: 'Prise en charge médicale', type: 'text',
            label: 'Établissement de destination',
            placeholder: 'Ex : MRSA, Pillbox Hill Medical Center',
            when: function (ctx) { return ctx.injured; }
        },
        {
            key: 'heureSortieMedicale', group: 'Prise en charge médicale', type: 'time',
            label: 'Heure de sortie médicale',
            hint: 'Art. 2-4-4 — la surveillance médicale ne peut excéder 1 h.',
            when: function (ctx) { return ctx.injured; }
        },
        {
            key: 'rapportIncident12h', group: 'Prise en charge médicale', type: 'select',
            label: 'Rapport d\'incident (Art. 2-4-2)',
            hint: 'Obligatoire sous 12 h quand la blessure est imputable à un agent.',
            options: ['', 'Rédigé et transmis', 'En cours de rédaction', 'Non rédigé'],
            when: function (ctx) { return ctx.injuredByOfficer; }
        },

        // ─── Droits ───
        {
            key: 'heureDroits', group: 'Droits & avocat', type: 'time',
            label: 'Heure de notification des droits',
            hint: 'Art. 2-2-5 / 2-2-6 — avant tout interrogatoire.',
            when: function () { return true; }
        },
        {
            key: 'reactionDroits', group: 'Droits & avocat', type: 'select',
            label: 'Réaction de l\'individu',
            options: [
                '',
                'A déclaré les avoir compris',
                'A déclaré les avoir compris et a sollicité l\'assistance d\'un avocat',
                'A déclaré les avoir compris et a invoqué son droit au silence',
                'N\'a pas été en mesure de les comprendre (inconscient / incohérent)',
                'A refusé de répondre'
            ],
            when: function () { return true; }
        },
        {
            key: 'heureContactAvocat', group: 'Droits & avocat', type: 'time',
            label: 'Heure de prise de contact avec l\'avocat',
            hint: 'Art. 5-3-1 — recours initié dans les plus brefs délais.',
            when: function (ctx) { return ctx.lawyer.requested; }
        },
        {
            key: 'heureArriveeAvocat', group: 'Droits & avocat', type: 'text',
            label: 'Heure d\'arrivée de l\'avocat',
            placeholder: 'XXhXX si non encore arrivé',
            hint: 'Art. 5-3-1 — 15 min pour répondre, 10 min pour se déplacer.',
            when: function (ctx) { return ctx.lawyer.requested; }
        },

        // ─── Vérifications ───
        {
            key: 'verifPlaque', group: 'Vérifications & suites', type: 'select',
            label: 'Vérification de la plaque d\'immatriculation',
            options: [
                '',
                'Effectuée — véhicule appartenant à l\'intéressé',
                'Effectuée — véhicule n\'appartenant pas à l\'intéressé',
                'Effectuée — véhicule signalé volé',
                'Non effectuée'
            ],
            when: function (ctx) { return ctx.hasVehicle; }
        },
        {
            key: 'verifCasier', group: 'Vérifications & suites', type: 'select',
            label: 'Vérification du casier / des mandats',
            options: [
                '',
                'Effectuée — aucun antécédent',
                'Effectuée — antécédents relevés',
                'Effectuée — mandat d\'arrêt actif',
                'Non effectuée'
            ],
            when: function () { return true; }
        },
        {
            key: 'heureTransport', group: 'Vérifications & suites', type: 'time',
            label: 'Heure de transport',
            when: function () { return true; }
        },
        {
            key: 'destinationTransport', group: 'Vérifications & suites', type: 'text',
            label: 'Destination',
            placeholder: 'Ex : poste de Mission Row',
            when: function () { return true; }
        },
        {
            key: 'heurePresentationProcureur', group: 'Vérifications & suites', type: 'text',
            label: 'Heure de présentation au procureur',
            placeholder: 'XXhXX si non encore présenté',
            hint: 'Art. 2-2-8 — 30 min (délit mineur), 45 min (délit majeur), 1 h (crime).',
            when: function () { return true; }
        }
    ];

    // ═══════════════════════════════════════════════════════════════════
    // CHECKLIST DE COMPLÉTUDE
    //
    // `when(ctx)` → l'item est-il applicable ? S'il ne l'est pas, il sort
    // du dénominateur : une intervention sans blessé n'est pas pénalisée
    // par l'absence d'heure d'évacuation.
    // `test(ctx)`  → l'élément est-il effectivement documenté ?
    // `probe`      → la question de relance posée à l'agent s'il manque.
    // ═══════════════════════════════════════════════════════════════════
    var always = function () { return true; };

    var CHECKLIST = [
        {
            id: 'date_heure', label: 'Date et heure précise des faits', critical: true, weight: 1,
            when: always,
            test: function (ctx) { return !!(ctx.date && ctx.time); },
            probe: 'À quelle date et à quelle heure précise les faits se sont-ils produits ?',
            field: 'datetime', articles: ['proc:2-2-7']
        },
        {
            id: 'secteur_lieu', label: 'Secteur et lieu exact de l\'intervention', weight: 1,
            when: always,
            test: function (ctx) { return !!(ctx.lieu && ctx.secteur); },
            probe: 'Dans quel secteur et à quel endroit exact l\'intervention a-t-elle eu lieu ?',
            field: 'secteur', articles: ['proc:2-2-7']
        },
        {
            id: 'unites', label: 'Identité et grade de chaque agent, par unité', critical: true, weight: 1,
            when: always,
            test: function (ctx) { return (ctx.agents || []).length > 0; },
            probe: 'Quels agents composaient l\'unité ? Sélectionnez-les dans le roster (grade + nom).',
            field: 'roster', articles: ['proc:2-2-7']
        },
        {
            id: 'motif_initial', label: 'Motif initial du contrôle ou de l\'interpellation', weight: 1,
            when: always,
            test: function (ctx) { return !!ctx.motif && ctx.motif !== 'une intervention'; },
            probe: 'Quel était le motif initial ? Qu\'avez-vous constaté qui a déclenché l\'intervention ?',
            field: 'motif', articles: ['proc:2-2-1', 'proc:2-2-2']
        },
        {
            id: 'chronologie', label: 'Déroulé horodaté (au moins 3 étapes datées)', weight: 1,
            when: always,
            test: function (ctx) { return (ctx.chronoStamps || []).length >= 3; },
            probe: 'Le déroulé doit comporter au moins trois horodatages (faits, interpellation, droits, transport…).',
            field: 'heureDroits', articles: []
        },
        {
            id: 'denouement', label: 'Dénouement — comment le suspect a été neutralisé', weight: 1,
            when: always,
            test: function (ctx) { return !!ctx.denouement; },
            probe: 'Comment l\'interpellation s\'est-elle conclue ? Comment le suspect a-t-il été maîtrisé ?',
            field: 'denouement', articles: []
        },
        {
            id: 'identite_suspect', label: 'Identité de l\'individu (nom, prénom)', critical: true, weight: 1,
            when: always,
            test: function (ctx) { return !!(ctx.suspect.nom || ctx.suspect.prenom); },
            probe: 'Quelle est l\'identité de l\'individu interpellé (nom et prénom) ?',
            field: 'suspect', articles: ['proc:2-2-7']
        },
        {
            id: 'dob_suspect', label: 'Date de naissance de l\'individu', critical: true, weight: 1,
            when: always,
            test: function (ctx) { return !!ctx.suspect.dob; },
            probe: 'Quelle est la date de naissance de l\'individu ? Elle est exigée au rapport d\'arrestation.',
            field: 'dob', articles: ['proc:2-2-7']
        },
        {
            id: 'heure_arrestation', label: 'Heure d\'interpellation', critical: true, weight: 1,
            when: always,
            test: function (ctx) { return parseHeure(ctx.heureArrestation) !== null; },
            probe: 'À quelle heure exacte l\'interpellation a-t-elle été réalisée ?',
            field: 'arrestTime', articles: ['proc:2-2-7']
        },
        {
            id: 'verifications', label: 'Vérifications complémentaires (casier / mandats)', weight: 1,
            when: always,
            test: function (ctx) { return !!ctx.verifCasier; },
            probe: 'Une vérification du casier et des mandats a-t-elle été effectuée ? Avec quel résultat ?',
            field: 'verifCasier', articles: ['proc:2-1-3']
        },
        {
            id: 'verif_plaque', label: 'Vérification de la plaque d\'immatriculation', weight: 1,
            when: function (ctx) { return ctx.hasVehicle; },
            test: function (ctx) { return !!ctx.verifPlaque; },
            probe: 'Un véhicule est impliqué : la plaque a-t-elle été vérifiée ? À qui appartient le véhicule ?',
            field: 'verifPlaque', articles: ['proc:2-1-3']
        },
        {
            id: 'fouille_resultat', label: 'Résultat de la fouille et inventaire', critical: true, weight: 1,
            when: always,
            test: function (ctx) { return ctx.fouille.effectuee; },
            probe: 'Une fouille a-t-elle été réalisée ? Sur quelle base, et qu\'a-t-elle donné ?',
            field: 'fouille', articles: ['proc:2-2-7', 'proc:4-1-5']
        },
        {
            id: 'charges', label: 'Charges retenues au moment de l\'arrestation', critical: true, weight: 1,
            when: always,
            test: function (ctx) { return (ctx.charges || []).length > 0; },
            probe: 'Quelles charges sont retenues ? Cochez-les dans le calculateur pénal.',
            field: 'charges', articles: ['proc:2-2-7']
        },
        {
            id: 'droits_heure', label: 'Heure de notification des droits', critical: true, weight: 1,
            when: always,
            test: function (ctx) { return parseHeure(ctx.miranda.heure) !== null; },
            probe: 'À quelle heure les droits ont-ils été notifiés à l\'individu ?',
            field: 'heureDroits', articles: ['proc:2-2-5', 'proc:2-2-6']
        },
        {
            id: 'droits_reaction', label: 'Réaction de l\'individu à la notification', critical: true, weight: 1,
            when: always,
            test: function (ctx) { return !!ctx.miranda.reaction; },
            probe: 'L\'individu a-t-il déclaré avoir compris ses droits ? A-t-il sollicité un avocat ?',
            field: 'reactionDroits', articles: ['proc:2-2-6']
        },
        {
            id: 'transport', label: 'Heure de transport et destination', weight: 1,
            when: always,
            test: function (ctx) {
                return parseHeure(ctx.transport.heure) !== null && !!ctx.transport.destination;
            },
            probe: 'À quelle heure et vers quelle destination l\'individu a-t-il été transporté ?',
            field: 'heureTransport', articles: []
        },

        // ─── Conditionnels : poursuite ───
        {
            id: 'poursuite_fin', label: 'Heure et lieu de fin de poursuite', weight: 1,
            when: function (ctx) { return ctx.pursuit; },
            test: function (ctx) {
                return parseHeure(ctx.heureFinPoursuite) !== null && !!ctx.lieuFinPoursuite;
            },
            probe: 'À quelle heure et à quel endroit exact la poursuite a-t-elle pris fin ?',
            field: 'heureFinPoursuite', articles: []
        },

        // ─── Conditionnels : usage de la force ───
        {
            id: 'force_justification', label: 'Justification de l\'usage de la force', critical: true, weight: 1,
            when: function (ctx) { return ctx.force.used; },
            test: function (ctx) { return !!ctx.force.justification; },
            probe: 'Qu\'est-ce qui a rendu l\'usage de la force nécessaire ? (Art. 121 — nécessité et proportionnalité)',
            field: 'justificationForce', articles: ['penal:121']
        },
        {
            id: 'force_cas_legal', label: 'Cas légal invoqué pour l\'usage de l\'arme', critical: true, weight: 1,
            when: function (ctx) { return ctx.force.weapon; },
            test: function (ctx) { return !!ctx.force.menace && ctx.force.menace !== 'Aucun de ces cas'; },
            probe: 'Sous lequel des cinq cas de l\'Art. 123 l\'usage de l\'arme se range-t-il ?',
            field: 'menaceInvoquee', articles: ['penal:123']
        },
        {
            id: 'force_sommation', label: 'Avertissement préalable à l\'usage de l\'arme', critical: true, weight: 1,
            when: function (ctx) { return ctx.force.weapon; },
            test: function (ctx) { return !!ctx.force.sommation; },
            probe: 'Un avertissement clair a-t-il été adressé avant l\'usage de l\'arme ? Sinon, pourquoi ?',
            field: 'sommation', articles: ['penal:123']
        },

        // ─── Conditionnels : médical ───
        {
            id: 'blessure_nature', label: 'Nature et origine de la blessure', critical: true, weight: 1,
            when: function (ctx) { return ctx.injured; },
            test: function (ctx) { return !!ctx.medical.nature && !!ctx.medical.cause; },
            probe: 'Quelle est la nature de la blessure et quelle en est l\'origine ?',
            field: 'natureBlessure', articles: ['proc:2-4-1']
        },
        {
            id: 'evac_heure', label: 'Heure d\'évacuation et établissement', critical: true, weight: 1,
            when: function (ctx) { return ctx.injured; },
            test: function (ctx) {
                return parseHeure(ctx.medical.heureEvac) !== null && !!ctx.medical.etablissement;
            },
            probe: 'À quelle heure et vers quel établissement l\'individu a-t-il été évacué ?',
            field: 'heureEvacuation', articles: ['proc:2-4-1']
        },
        {
            id: 'sortie_medicale', label: 'Heure de sortie médicale', critical: true, weight: 1,
            when: function (ctx) { return ctx.injured; },
            test: function (ctx) { return parseHeure(ctx.medical.heureSortie) !== null; },
            probe: 'À quelle heure la sortie médicale a-t-elle été prononcée ?',
            field: 'heureSortieMedicale', articles: ['proc:2-4-4']
        },
        {
            id: 'rapport_12h', label: 'Rapport d\'incident sous 12 h (blessure imputable à un agent)', critical: true, weight: 1,
            when: function (ctx) { return ctx.injuredByOfficer; },
            test: function (ctx) { return !!ctx.medical.rapport12h; },
            probe: 'La blessure est imputable à une action des agents : un rapport d\'incident a-t-il été rédigé ? (Art. 2-4-2, sous 12 h)',
            field: 'rapportIncident12h', articles: ['proc:2-4-2']
        },

        // ─── Conditionnels : avocat ───
        {
            id: 'avocat_contact', label: 'Heure de prise de contact avec l\'avocat', critical: true, weight: 1,
            when: function (ctx) { return ctx.lawyer.requested; },
            test: function (ctx) { return parseHeure(ctx.lawyer.heureContact) !== null; },
            probe: 'À quelle heure l\'avocat a-t-il été contacté ?',
            field: 'heureContactAvocat', articles: ['proc:5-3-1']
        },
        {
            id: 'avocat_arrivee', label: 'Heure d\'arrivée de l\'avocat (ou mention XXhXX)', weight: 1,
            when: function (ctx) { return ctx.lawyer.requested; },
            test: function (ctx) { return !!String(ctx.lawyer.heureArrivee || '').trim(); },
            probe: 'À quelle heure l\'avocat est-il arrivé ? Indiquez XXhXX s\'il n\'est pas encore arrivé.',
            field: 'heureArriveeAvocat', articles: ['proc:5-3-1']
        }
    ];

    // ═══════════════════════════════════════════════════════════════════
    // ÉVALUATION DE COMPLÉTUDE
    // ═══════════════════════════════════════════════════════════════════
    function evaluate(ctx) {
        var items = [];
        var totalW = 0, okW = 0;

        CHECKLIST.forEach(function (it) {
            var applicable;
            try { applicable = !!it.when(ctx); } catch (e) { applicable = false; }
            if (!applicable) {
                items.push({
                    id: it.id, label: it.label, status: 'na', critical: !!it.critical,
                    probe: it.probe, field: it.field, articles: it.articles
                });
                return;
            }
            var ok;
            try { ok = !!it.test(ctx); } catch (e) { ok = false; }
            totalW += it.weight;
            if (ok) okW += it.weight;
            items.push({
                id: it.id, label: it.label, status: ok ? 'ok' : 'missing', critical: !!it.critical,
                probe: it.probe, field: it.field, articles: it.articles
            });
        });

        var score = totalW === 0 ? 1 : okW / totalW;
        var missing = items.filter(function (i) { return i.status === 'missing'; });
        var criticalMissing = missing.filter(function (i) { return i.critical; });

        return {
            score: score,
            percent: Math.round(score * 100),
            threshold: THRESHOLD,
            // Les deux conditions sont cumulatives : un score suffisant ne
            // rachète pas l'absence d'un élément légalement obligatoire.
            valid: score >= THRESHOLD && criticalMissing.length === 0,
            scoreOk: score >= THRESHOLD,
            applicableCount: items.filter(function (i) { return i.status !== 'na'; }).length,
            items: items,
            missing: missing,
            criticalMissing: criticalMissing
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // RÈGLES DE PROCÉDURE
    //
    // Chaque règle rend { status, detail } :
    //   'ok'      — conforme, vérifié
    //   'warn'    — non vérifiable en l'état (donnée manquante)
    //   'fail'    — non conforme au code : à corriger ou à justifier
    //   'na'      — sans objet dans ce dossier
    // ═══════════════════════════════════════════════════════════════════
    var PROC_RULES = [
        {
            id: 'flagrance_20min',
            label: 'Arrestation en flagrance dans les 20 minutes',
            articles: ['proc:7-2-1-5', 'proc:7-2-1-6'],
            phase: 'Contrôle initial',
            question: "Les faits ayant été constatés à telle heure, comment justifiez-vous que l'arrestation soit intervenue au-delà du délai de flagrance ?",
            run: function (ctx) {
                var d = deltaMin(ctx.time, ctx.heureArrestation);
                if (d === null) return { status: 'warn', detail: "Heure des faits ou heure d'interpellation manquante : le délai de flagrance ne peut pas être vérifié." };
                if (d <= 20) return { status: 'ok', detail: 'Interpellation ' + formatDuree(d) + ' après les faits — dans le délai de flagrance de 20 minutes.' };
                return {
                    status: 'fail',
                    detail: 'Interpellation ' + formatDuree(d) + ' après les faits, soit au-delà des 20 minutes de flagrance.',
                    fix: "Documentez la continuité de la poursuite (la flagrance se poursuit tant que la traque est ininterrompue), ou versez au dossier le mandat d'arrêt exigé par l'Art. 7-2-1-6."
                };
            }
        },
        {
            id: 'droits_avant_fouille',
            label: 'Droits énoncés préalablement à la fouille',
            articles: ['proc:4-1-4'],
            phase: 'Fouille & scellés',
            question: "Les droits de mon client lui ont-ils été énoncés AVANT la fouille, comme l'exige l'article 4-1-4 ?",
            run: function (ctx) {
                if (!ctx.fouille.effectuee) return { status: 'na', detail: 'Aucune fouille documentée.' };
                var hd = parseHeure(ctx.miranda.heure);
                if (hd === null) return { status: 'warn', detail: "Heure de notification des droits manquante : l'antériorité sur la fouille ne peut pas être établie." };
                return { status: 'ok', detail: 'Droits notifiés à ' + formatHeure(ctx.miranda.heure) + '. Vérifiez que le récit place bien la fouille après cette heure.' };
            }
        },
        {
            id: 'inventaire_scelles',
            label: 'Inventaire détaillé et mise sous scellés',
            articles: ['proc:4-1-5', 'proc:7-3-1', 'proc:7-3-2'],
            phase: 'Fouille & scellés',
            question: "Où est l'inventaire détaillé des objets saisis, et sous quel numéro de scellé figurent-ils ?",
            run: function (ctx) {
                if (!ctx.fouille.effectuee) return { status: 'na', detail: 'Aucune fouille documentée.' };
                if (!(ctx.fouille.objets || []).length) {
                    return { status: 'ok', detail: 'Fouille effectuée sans saisie : aucun inventaire de scellés requis.' };
                }
                return {
                    status: 'warn',
                    detail: (ctx.fouille.objets || []).length + ' élément(s) saisi(s) documenté(s). Le code impose un inventaire détaillé et une mise sous scellés.',
                    fix: "Mentionnez explicitement l'établissement de l'inventaire et le placement sous scellés des éléments saisis."
                };
            }
        },
        {
            id: 'droits_notifies',
            label: 'Notification des droits constitutionnels',
            articles: ['proc:2-2-5', 'proc:2-2-6', 'proc:2-2-3'],
            phase: 'Droits & avocat',
            question: "À quelle heure précise les droits de mon client lui ont-ils été notifiés, et qu'a-t-il déclaré ?",
            run: function (ctx) {
                var h = parseHeure(ctx.miranda.heure);
                if (h === null) return {
                    status: 'fail',
                    detail: "Aucune heure de notification des droits n'est documentée.",
                    fix: "Renseignez l'heure de notification. Sans elle, toute déclaration recueillie est contestable."
                };
                if (!ctx.miranda.reaction) return {
                    status: 'warn',
                    detail: 'Droits notifiés à ' + formatHeure(ctx.miranda.heure) + ', mais la réaction de l\'individu n\'est pas consignée.',
                    fix: "Précisez si l'individu a déclaré avoir compris ses droits."
                };
                var d = deltaMin(ctx.heureArrestation, ctx.miranda.heure);
                if (d !== null && d > 60) return {
                    status: 'fail',
                    detail: 'Droits notifiés ' + formatDuree(d) + ' après l\'interpellation.',
                    fix: "Justifiez ce délai dans le récit (individu inconscient, prise en charge médicale, transport). Un délai inexpliqué fragilise toute déclaration ultérieure."
                };
                if (d !== null && d < 0) return {
                    status: 'fail',
                    detail: 'La notification des droits (' + formatHeure(ctx.miranda.heure) + ') précède l\'interpellation (' + formatHeure(ctx.heureArrestation) + ').',
                    fix: 'Corrigez la chronologie : une des deux heures est erronée.'
                };
                return {
                    status: 'ok',
                    detail: 'Droits notifiés à ' + formatHeure(ctx.miranda.heure)
                        + (d !== null ? ' (' + formatDuree(d) + ' après l\'interpellation)' : '')
                        + '. Réaction consignée : ' + ctx.miranda.reaction + '.'
                };
            }
        },
        {
            id: 'avocat_delai',
            label: "Délai de recours à l'avocat",
            articles: ['proc:5-3-1', 'proc:5-1-2'],
            phase: 'Droits & avocat',
            question: "Mon client a sollicité un avocat : à quelle heure a-t-il été contacté, et pourquoi ce délai ?",
            run: function (ctx) {
                if (!ctx.lawyer.requested) return { status: 'na', detail: "Aucune demande d'avocat consignée." };
                var hc = parseHeure(ctx.lawyer.heureContact);
                if (hc === null) return {
                    status: 'fail',
                    detail: "L'individu a sollicité un avocat mais aucune heure de prise de contact n'est documentée.",
                    fix: "Renseignez l'heure de prise de contact — c'est le premier point qu'un avocat soulèvera."
                };
                var d = deltaMin(ctx.miranda.heure, ctx.lawyer.heureContact);
                if (d === null) return { status: 'ok', detail: 'Avocat contacté à ' + formatHeure(ctx.lawyer.heureContact) + '.' };
                if (d < 0) return {
                    status: 'fail',
                    detail: "L'avocat aurait été contacté avant la notification des droits.",
                    fix: 'Corrigez la chronologie.'
                };
                // L'Art. 5-3-1 n'impose à la police aucun délai chiffré : il
                // exige un recours « dans les plus brefs délais ». Les seuls
                // nombres qu'il donne (15 min pour répondre, 10 pour se
                // déplacer) s'appliquent à l'avocat, pas aux agents. On prend
                // donc 15 min comme repère de diligence, sans en faire un
                // couperet : au-delà, le délai devient attaquable et doit être
                // justifié ; il ne devient franchement irrégulier que bien plus loin.
                if (d > 30) return {
                    status: 'fail',
                    detail: 'Avocat contacté ' + formatDuree(d) + ' après la notification des droits.',
                    fix: "L'Art. 5-3-1 impose un recours « dans les plus brefs délais ». Un tel délai est difficilement défendable : justifiez-le explicitement ou corrigez l'heure."
                };
                if (d > 15) return {
                    status: 'warn',
                    detail: 'Avocat contacté ' + formatDuree(d) + ' après la notification des droits. L\'Art. 5-3-1 ne fixe pas de délai chiffré à la police, mais retient 15 min comme repère de diligence.',
                    fix: "Attendez-vous à ce que la défense conteste ce délai. Indiquez dans le récit ce qui l'explique (transport en cours, prise en charge médicale, ligne occupée)."
                };
                return { status: 'ok', detail: 'Avocat contacté ' + formatDuree(d) + ' après la notification des droits — recours diligent au sens de l\'Art. 5-3-1.' };
            }
        },
        {
            id: 'medical_demande',
            label: "Intervention médicale sur demande expresse d'un agent",
            articles: ['proc:2-4-1'],
            phase: 'Prise en charge médicale',
            question: "Sur quel fondement l'intervention médicale a-t-elle été déclenchée, et par qui ?",
            run: function (ctx) {
                if (!ctx.injured) return { status: 'na', detail: 'Aucun blessé documenté.' };
                if (!ctx.medical.cause) return {
                    status: 'warn',
                    detail: "L'origine de la blessure n'est pas renseignée.",
                    fix: "Précisez l'origine de la blessure : elle conditionne l'obligation de rapport de l'Art. 2-4-2."
                };
                return { status: 'ok', detail: 'Origine consignée : ' + ctx.medical.cause + '. Intervention médicale sollicitée par l\'unité.' };
            }
        },
        {
            id: 'medical_surveillance_1h',
            label: 'Surveillance médicale limitée à 1 heure',
            articles: ['proc:2-4-4'],
            phase: 'Prise en charge médicale',
            question: "Mon client a été maintenu sous surveillance médicale : la reprise en charge est-elle intervenue dans le délai de l'article 2-4-4 ?",
            run: function (ctx) {
                if (!ctx.injured) return { status: 'na', detail: 'Aucun blessé documenté.' };
                var d = deltaMin(ctx.medical.heureEvac, ctx.medical.heureSortie);
                if (d === null) return {
                    status: 'warn',
                    detail: "Heure d'évacuation ou de sortie médicale manquante : la durée de prise en charge n'est pas vérifiable."
                };
                if (d < 0) return {
                    status: 'fail',
                    detail: "La sortie médicale précède l'évacuation.",
                    fix: 'Corrigez la chronologie médicale.'
                };
                return {
                    status: 'ok',
                    detail: 'Prise en charge de ' + formatDuree(d) + ' (évacuation ' + formatHeure(ctx.medical.heureEvac)
                        + ' → sortie ' + formatHeure(ctx.medical.heureSortie) + '), sortie prononcée par le corps médical.'
                };
            }
        },
        {
            id: 'rapport_incident_12h',
            label: "Rapport d'incident sous 12 h",
            articles: ['proc:2-4-2'],
            phase: 'Prise en charge médicale',
            question: "La blessure résulte d'une action de vos agents : où est le rapport d'incident exigé sous 12 heures ?",
            run: function (ctx) {
                if (!ctx.injuredByOfficer) return { status: 'na', detail: 'Blessure non imputable à une action des agents.' };
                var r = ctx.medical.rapport12h;
                if (!r) return {
                    status: 'fail',
                    detail: "La blessure est imputable à une action des agents, mais aucun rapport d'incident n'est mentionné.",
                    fix: "L'Art. 2-4-2 impose un rapport détaillé sous 12 h, classé « Information Confidentielle ». Mentionnez-le explicitement."
                };
                if (r === 'Non rédigé') return {
                    status: 'fail',
                    detail: "Le rapport d'incident de l'Art. 2-4-2 est déclaré non rédigé.",
                    fix: 'Rédigez-le avant toute audience : son absence est un manquement procédural direct.'
                };
                if (r === 'En cours de rédaction') return {
                    status: 'warn',
                    detail: "Rapport d'incident en cours de rédaction — le délai de 12 h court à compter de l'intervention."
                };
                return { status: 'ok', detail: "Rapport d'incident rédigé et transmis, conformément à l'Art. 2-4-2." };
            }
        },
        {
            id: 'force_proportionnalite',
            label: 'Nécessité et proportionnalité de l\'usage de la force',
            articles: ['penal:121', 'penal:123'],
            phase: 'Usage de la force',
            question: "Qu'est-ce qui rendait l'usage de la force absolument nécessaire, et en quoi était-il proportionné ?",
            run: function (ctx) {
                if (!ctx.force.used) return { status: 'na', detail: 'Aucun usage de la force documenté.' };
                if (!ctx.force.justification) return {
                    status: 'fail',
                    detail: "Un usage de la force est documenté sans aucune justification consignée.",
                    fix: "Décrivez le comportement précis du suspect qui a rendu la contrainte nécessaire (Art. 121 : nécessité + proportionnalité)."
                };
                return {
                    status: 'ok',
                    detail: 'Justification consignée : « ' + ctx.force.justification + ' ». Moyens employés : '
                        + ((ctx.force.moyens || []).join(', ') || 'non détaillés') + '.'
                };
            }
        },
        {
            id: 'arme_cas_legal',
            label: "Usage de l'arme — cas légal de l'article 123",
            articles: ['penal:123'],
            phase: 'Usage de la force',
            question: "Sous lequel des cinq cas limitatifs de l'article 123 rangez-vous l'usage de votre arme de service ?",
            run: function (ctx) {
                if (!ctx.force.weapon) return { status: 'na', detail: "Aucun usage d'arme à feu documenté." };
                if (!ctx.force.menace) return {
                    status: 'fail',
                    detail: "Une arme à feu a été employée sans que le cas légal de l'Art. 123 soit identifié.",
                    fix: "Les cinq cas de l'Art. 123 sont limitatifs. Désignez celui qui s'applique, ou l'usage est présumé injustifié."
                };
                if (ctx.force.menace === 'Aucun de ces cas') return {
                    status: 'fail',
                    detail: "L'usage de l'arme ne se rattache à aucun des cinq cas de l'Art. 123.",
                    fix: "Hors de ces cinq cas, l'usage de l'arme n'est pas couvert par l'Art. 123 et relève, le cas échéant, de la légitime défense de droit commun (Art. 121). Reprenez la qualification avec un Supervisor."
                };
                return { status: 'ok', detail: 'Cas invoqué : ' + ctx.force.menace + '.' };
            }
        },
        {
            id: 'arme_sommation',
            label: "Avertissement clair préalable à l'usage de l'arme",
            articles: ['penal:123'],
            phase: 'Usage de la force',
            question: "Avez-vous adressé un avertissement clair avant de faire feu, et si non, qu'est-ce qui l'en empêchait ?",
            run: function (ctx) {
                if (!ctx.force.weapon) return { status: 'na', detail: "Aucun usage d'arme à feu documenté." };
                var s = ctx.force.sommation;
                if (!s) return {
                    status: 'fail',
                    detail: "Aucune mention d'avertissement préalable à l'usage de l'arme.",
                    fix: "L'Art. 123 exige un avertissement clair « lorsque les circonstances le permettent ». Indiquez s'il a été donné, ou ce qui l'a rendu impossible."
                };
                if (s.indexOf('Oui') === 0) return { status: 'ok', detail: 'Avertissement clair adressé avant l\'usage de l\'arme.' };
                if (s.indexOf('circonstances') !== -1) return {
                    status: 'ok',
                    detail: "Absence d'avertissement justifiée par les circonstances — conforme à la réserve de l'Art. 123.",
                    fix: "Assurez-vous que le récit décrit concrètement ce qui empêchait l'avertissement (immédiateté de la menace)."
                };
                return {
                    status: 'fail',
                    detail: "Aucun avertissement n'a été adressé, sans que les circonstances soient invoquées.",
                    fix: "C'est le point d'attaque le plus lourd d'une audience. Documentez l'immédiateté de la menace ou reprenez la qualification."
                };
            }
        },
        {
            id: 'menottage',
            label: 'Justification du menottage',
            articles: ['proc:4-3-2', 'proc:4-3-3'],
            phase: 'Interpellation',
            question: "Qu'est-ce qui justifiait objectivement le menottage de mon client ?",
            run: function (ctx) {
                if (!ctx.cuffed) return { status: 'na', detail: 'Aucun menottage documenté.' };
                if (ctx.force.used || ctx.pursuit) {
                    return { status: 'ok', detail: 'Menottage justifié par les circonstances objectives documentées (fuite et/ou résistance).' };
                }
                return {
                    status: 'warn',
                    detail: 'Menottage documenté sans circonstance objective explicite (fuite, agressivité, danger imminent).',
                    fix: "L'Art. 4-3-2 exige des circonstances objectives et spécifiques. Précisez-les dans le récit."
                };
            }
        },
        {
            id: 'retention_2_1_9',
            label: 'Durée de rétention avant inculpation',
            articles: ['proc:2-1-9'],
            phase: 'Suite procédurale',
            question: "Mon client a été retenu combien de temps avant d'être inculpé ou libéré ?",
            run: function (ctx) {
                var grav = graviteMax(ctx.charges);
                if (!grav || grav === 'Contravention') return { status: 'na', detail: 'Aucune charge délictuelle ou criminelle retenue.' };
                var limite = DELAI_RETENTION[grav];
                var d = deltaMin(ctx.heureArrestation, ctx.heurePresentationProcureur);
                if (d === null) return {
                    status: 'warn',
                    detail: 'Rétention plafonnée à ' + limite + ' min pour un ' + grav.toLowerCase()
                        + '. Heure de présentation au procureur non renseignée : le délai n\'est pas vérifiable.'
                };
                if (d > limite) return {
                    status: 'fail',
                    detail: 'Rétention de ' + formatDuree(d) + ' pour un ' + grav.toLowerCase() + ' (plafond : ' + limite + ' min).',
                    fix: "Justifiez le dépassement (prise en charge médicale, indisponibilité du procureur) — sinon la rétention est irrégulière."
                };
                return { status: 'ok', detail: 'Rétention de ' + formatDuree(d) + ', sous le plafond de ' + limite + ' min applicable à un ' + grav.toLowerCase() + '.' };
            }
        },
        {
            id: 'presentation_procureur',
            label: 'Délai de présentation au procureur',
            articles: ['proc:2-2-8'],
            phase: 'Suite procédurale',
            question: "Dans quel délai mon client a-t-il été présenté au procureur, et ce délai respecte-t-il l'article 2-2-8 ?",
            run: function (ctx) {
                var grav = graviteMax(ctx.charges);
                if (!grav || grav === 'Contravention') return { status: 'na', detail: 'Contravention ou aucune charge : pas de présentation au procureur requise.' };
                var limite = DELAI_PROCUREUR[grav];
                var d = deltaMin(ctx.heureArrestation, ctx.heurePresentationProcureur);
                if (d === null) return {
                    status: 'warn',
                    detail: 'Plafond applicable : ' + limite + ' min (' + grav.toLowerCase()
                        + ', Art. 2-2-8 modifié par le DÉCRET N5-GOUV du 14/08/2026). Heure de présentation non renseignée.'
                };
                if (d > limite) return {
                    status: 'fail',
                    detail: 'Présentation ' + formatDuree(d) + ' après l\'interpellation, pour un plafond de ' + limite + ' min (' + grav.toLowerCase() + ').',
                    fix: "Justifiez le dépassement dans le rapport (évacuation médicale, attente de l'avocat) — c'est un moyen de nullité classique."
                };
                return { status: 'ok', detail: 'Présentation ' + formatDuree(d) + ' après l\'interpellation — dans le plafond de ' + limite + ' min.' };
            }
        },
        {
            id: 'dossier_defense',
            label: 'Transmission du dossier à la défense',
            articles: ['proc:5-2-5', 'proc:5-2-1'],
            phase: 'Suite procédurale',
            question: "Le rapport d'arrestation m'a-t-il été transmis, et dans quel délai avant l'audience ?",
            run: function (ctx) {
                if (!ctx.lawyer.requested) return { status: 'na', detail: "Aucun avocat constitué à ce stade." };
                return {
                    status: 'warn',
                    detail: "Un avocat est constitué : l'Art. 5-2-5 impose de lui fournir le rapport dès sa clôture, et l'Art. 5-2-1 au plus tard 5 h avant l'audience.",
                    fix: 'Transmettez le rapport dès validation et conservez une trace de la transmission.'
                };
            }
        }
    ];

    function auditProcedure(ctx) {
        return PROC_RULES.map(function (rule) {
            var r;
            try { r = rule.run(ctx); } catch (e) { r = { status: 'warn', detail: 'Règle non évaluable : ' + e.message }; }
            return {
                id: rule.id, label: rule.label, phase: rule.phase,
                question: rule.question, articles: rule.articles,
                status: r.status, detail: r.detail, fix: r.fix || ''
            };
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // QUALIFICATION DES INFRACTIONS
    //
    // Le calculateur pénal de l'application repose sur la grille RP du
    // serveur (DB.penalCode), qui ne porte pas de numéro d'article. Cette
    // table relie les intitulés les plus courants à leur qualification
    // dans le CODE PÉNAL, pour que le rapport et le document de défense
    // citent l'article exact.
    // ═══════════════════════════════════════════════════════════════════
    var PENAL_ARTICLE_MAP = {
        // ─── Circulation ───
        'excès de vitesse 1-10 km/h': ['604'],
        'excès de vitesse 11-20 km/h': ['604'],
        'excès de vitesse 21-30 km/h': ['605'],
        'excès de vitesse 31-50 km/h': ['605'],
        'vitesse excessive': ['607'],
        'conduite dangereuse mineur': ['214'],
        'conduite dangereuse majeur': ['214'],
        'conduite en état d\'ivresse / stupéfiant': ['613', '612'],
        'conduite sans permis': ['614'],
        'délit de fuite': ['617'],
        'refus d\'obtempérer': ['431-7'],
        'course de rue illégale': ['616'],
        'stationnement gênant': ['601'],
        'stationnement interdit': ['602'],
        'nuisance sonore': ['603'],
        'non respect véhicule prioritaire': ['620'],
        'téléphone au volant': ['214'],
        'non présentation des papiers (id, permis)': ['614'],

        // ─── Personnes ───
        'meurtre': ['211'],
        'meurtre sur civil': ['211'],
        'meurtre sur agent de l\'état': ['211-1'],
        'assassinat': ['212'],
        'homicide involontaire': ['213'],
        'tentative de meurtre sur civil': ['211'],
        'tentative de meurtre sur agent de l\'état': ['211-1'],
        'torture': ['221'],
        'agression sur civil à mains nues': ['222-1'],
        'agression sur citoyen à mains nues (pnj)': ['222-1'],
        'agression sur civil avec une arme blanche ou contondante': ['222-2'],
        'menaces': ['223'],
        'harcèlement': ['223-4'],
        'usurpation d\'identité': ['223-7'],
        'mise en danger de la vie d\'autrui': ['214'],
        'non assistance à personne en danger': ['216'],
        'entrave à l\'arrivée des secours': ['215'],
        'enlèvement et séquestration': ['251'],
        'prise d\'otage': ['252'],

        // ─── Biens ───
        'vol': ['311-1'],
        'vol simple': ['311-1'],
        'vol de véhicule': ['311-1'],
        'cambriolage': ['311-2'],
        'braquage d\'atm': ['311-2'],
        'braquage à main armée de supérette': ['311-2'],
        'braquage à main armée sur civil': ['311-2'],
        'extorsion': ['321'],
        'chantage': ['323'],
        'recel d\'objet volé': ['331'],
        'escroquerie': ['341'],
        'arnaque / fraude à la carte bleu': ['341'],
        'destruction ou dégradation de bien': ['351'],
        'abus de confiance': ['361'],
        'fraude fiscale': ['362'],
        'blanchiment': ['371'],
        'non déclaration des impôts': ['381'],
        'non paiement des impôts': ['382'],

        // ─── Stupéfiants ───
        'usage de stupéfiants': ['231-1'],
        'détention de stupéfiant': ['231-2'],
        'vente de drogue': ['231-4'],
        'trafic de drogue': ['234'],
        'trafic de drogue (≥ 750 pochons)': ['234'],

        // ─── Armes ───
        'port d\'arme illégale': ['241-1'],
        'transport d\'arme illégale': ['241-2'],
        'détention d\'arme illégale': ['241-3'],
        'possession d\'arme de guerre': ['241-3'],
        'trafic d\'armes': ['242'],
        'trafic d\'armes (4 ou plus)': ['242'],
        'exhibition d\'arme': ['245'],
        'tir d\'arme sans motif légitime': ['246'],

        // ─── Autorité publique ───
        'rébellion': ['433-2'],
        'rebellion': ['433-2'],
        'outrage à agent': ['442'],
        'trouble à l\'ordre public': ['431-1'],
        'ivresse sur la voie publique': ['431-1'],
        'dissimulation du visage': ['431-3'],
        'usurpation de fonction': ['433-3'],
        'refus de se soumettre à une injonction': ['433-4'],
        'corruption': ['433'],
        'évasion': ['442-1'],
        'entrave à la justice': ['441-8'],
        'parjure': ['441-7'],
        'faux et usage de faux': ['451'],
        'violation de propriété privée': ['223-5'],
        'intrusion dans une propriété privée': ['223-5'],
        'terrorisme': ['421'],
        'immigration clandestine': ['462'],
        'entrée sur le territoire de manière illégale': ['462']
    };

    function normalize(s) {
        return String(s || '')
            .toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, ' ')
            .trim();
    }

    // Articles correspondant à un intitulé de charge de DB.penalCode.
    function articlesForCharge(name) {
        var n = normalize(name);
        var hit = null;
        Object.keys(PENAL_ARTICLE_MAP).forEach(function (k) {
            if (hit) return;
            if (normalize(k) === n) hit = PENAL_ARTICLE_MAP[k];
        });
        if (hit) return hit.map(function (id) { return 'penal:' + id; });
        // Repli : correspondance par préfixe (« Vol de véhicule (moto) » → « vol de véhicule »)
        var best = null, bestLen = 0;
        Object.keys(PENAL_ARTICLE_MAP).forEach(function (k) {
            var nk = normalize(k);
            if (nk.length > bestLen && (n.indexOf(nk) === 0 || nk.indexOf(n) === 0) && nk.length >= 6) {
                best = PENAL_ARTICLE_MAP[k]; bestLen = nk.length;
            }
        });
        return best ? best.map(function (id) { return 'penal:' + id; }) : [];
    }

    // Suggestion de qualification à partir d'un texte libre (motif saisi
    // par l'agent). Cherche dans les intitulés du CODE PÉNAL, puis dans la
    // table de correspondance. Rend les meilleures pistes, mieux d'abord.
    function suggestArticles(text, limit) {
        var n = normalize(text);
        if (n.length < 3) return [];
        var words = n.split(' ').filter(function (w) { return w.length > 3; });
        if (!words.length) return [];

        var scored = [];
        Object.keys(LEGAL.penal || {}).forEach(function (id) {
            var a = LEGAL.penal[id];
            if (!a.titre) return;                       // dispositions générales : pas des qualifications
            var nt = normalize(a.titre);
            var score = 0;
            if (nt === n) score += 100;
            else if (nt.indexOf(n) !== -1 || n.indexOf(nt) !== -1) score += 40;
            words.forEach(function (w) { if (nt.indexOf(w) !== -1) score += 10; });
            if (score > 0) {
                scored.push({
                    ref: 'penal:' + id, num: 'Art. ' + id, titre: a.titre,
                    categorie: a.categorie, amende: a.amende, prison: a.prison, score: score
                });
            }
        });

        scored.sort(function (a, b) { return b.score - a.score || a.num.localeCompare(b.num); });
        return scored.slice(0, limit || 4);
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXPORT
    // ═══════════════════════════════════════════════════════════════════
    var API = {
        THRESHOLD: THRESHOLD,
        COMPLIANCE_FIELDS: COMPLIANCE_FIELDS,
        CHECKLIST: CHECKLIST,
        PROC_RULES: PROC_RULES,
        PENAL_ARTICLE_MAP: PENAL_ARTICLE_MAP,
        GRAVITE_ORDRE: GRAVITE_ORDRE,
        DELAI_PROCUREUR: DELAI_PROCUREUR,
        evaluate: evaluate,
        auditProcedure: auditProcedure,
        article: article,
        citation: citation,
        articlesForCharge: articlesForCharge,
        suggestArticles: suggestArticles,
        graviteMax: graviteMax,
        parseHeure: parseHeure,
        deltaMin: deltaMin,
        formatDuree: formatDuree,
        formatHeure: formatHeure
    };

    root.LSPD_RULES = API;
    if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
