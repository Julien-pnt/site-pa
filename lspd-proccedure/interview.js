/* ═══════════════════════════════════════════════════════════════════════
   LSPD JUSTICE OS — ENTRETIEN GUIDÉ (moteur narratif par scénario)

   Principe : au lieu d'une soupe de tags, l'agent répond à une suite de
   questions ordonnées à réponses toutes faites. Chaque réponse alimente
   une phrase précise du récit — le rapport final est un texte fluide,
   pas une énumération.

   Ce fichier n'expose que des DONNÉES + des fonctions pures (aucun DOM).
   Le rendu et le câblage vivent dans app.js.
   ═══════════════════════════════════════════════════════════════════════ */

window.LSPD_IV = (function () {
    'use strict';

    /* ── helpers de rédaction ───────────────────────────────────────── */

    // "a, b et c" — le connecteur final est paramétrable ("ainsi que", "puis"…)
    function j(arr, conn) {
        const a = (arr || []).filter(Boolean);
        if (!a.length) return '';
        if (a.length === 1) return a[0];
        return a.slice(0, -1).join(', ') + ' ' + (conn || 'et') + ' ' + a[a.length - 1];
    }
    function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

    // Contractions/élisions françaises : « de » + mot  →  du / de la / de l' / d' / des
    function de(x) {
        if (!x) return '';
        if (/^le /i.test(x)) return 'du ' + x.slice(3);
        if (/^les /i.test(x)) return 'des ' + x.slice(4);
        if (/^la /i.test(x)) return 'de la ' + x.slice(3);
        if (/^l'/i.test(x)) return "de l'" + x.slice(2);
        if (/^[aeiouyàâäéèêëîïôöûüh]/i.test(x)) return "d'" + x;
        return 'de ' + x;
    }
    // « à » + mot  →  au / à la / à l' / aux
    function aa(x) {
        if (!x) return '';
        if (/^le /i.test(x)) return 'au ' + x.slice(3);
        if (/^les /i.test(x)) return 'aux ' + x.slice(4);
        return 'à ' + x;
    }
    // « que » + mot  →  qu' devant voyelle
    function que(x) {
        if (!x) return '';
        return (/^[aeiouyàâäéèêëîïôöûü]/i.test(x) ? "qu'" : 'que ') + x;
    }
    // Une réponse « aucun / rien » exclut les autres : on l'ignore si d'autres
    // cases sont cochées (sinon « aucun blessé et blessés légers »).
    function multiN(q, sel) {
        let vals = (sel || []).slice();
        if (vals.length > 1) {
            const exc = (q.answers || []).filter(o => o.exclusive).map(o => o.v);
            if (exc.length) vals = vals.filter(v => exc.indexOf(v) < 0);
        }
        return vals.map(v => { const o = (q.answers || []).find(x => x.v === v); return o && o.n; }).filter(Boolean);
    }
    function onlyExclusive(q, sel) {
        return (sel || []).length === 1 && (q.answers || []).some(o => o.v === sel[0] && o.exclusive);
    }
    // Assemble des morceaux de phrase en un paragraphe propre.
    function para() {
        const parts = [].slice.call(arguments).filter(Boolean);
        if (!parts.length) return '';
        return parts.join(' ').replace(/\s+/g, ' ').replace(/\s+([.,;])/g, '$1').trim();
    }
    // Récupère le libellé narratif d'une réponse choisie.
    function P(q, answers, key) {
        const v = answers[key];
        if (!v) return null;
        const opt = (q.answers || []).find(o => o.v === v);
        if (!opt) return null;
        let n = opt.n != null ? opt.n : opt.l;
        if (opt.text && answers[key + '_text']) n = n.replace('…', answers[key + '_text']);
        return n;
    }

    /* ── fabriques de questions communes ────────────────────────────── */

    const Q = {
        engage: () => ({
            id: 'engage', q: "Comment votre unité a-t-elle été engagée ?", type: 'single',
            answers: [
                { v: 'dispatch', l: "Affectée par le dispatch", n: "a été affectée par le dispatch à un appel signalant" },
                { v: 'patrol', l: "Constat direct en patrouille", n: "a constaté les faits au cours de sa patrouille" },
                { v: 'backup', l: "En renfort d'une autre unité", n: "est intervenue en renfort d'une unité déjà engagée sur" },
                { v: 'bolo', l: "Sur signalement / BOLO", n: "a été engagée sur un avis de recherche concernant" },
                { v: 'civil', l: "Alertée par un civil sur place", n: "a été alertée sur place par un civil signalant" }
            ]
        }),
        call: (opts) => ({
            id: 'call', q: "Que signalait l'appel / le motif d'engagement ?", type: 'single',
            answers: opts.concat([{ v: 'other', l: "Autre (préciser)", n: "…", text: true }])
        }),
        response: () => ({
            id: 'response', q: "Comment avez-vous répondu ?", type: 'single',
            answers: [
                { v: 'immediate', l: "Immédiatement, gyrophares et sirène", n: "Nous avons immédiatement pris la route, gyrophares et sirène enclenchés." },
                { v: 'priority', l: "En urgence, gyrophares seuls", n: "Nous avons immédiatement pris la route, gyrophares enclenchés." },
                { v: 'normal', l: "En circulation normale", n: "Nous avons pris la route en circulation normale." },
                { v: 'onsite', l: "Nous étions déjà sur place", n: "Nous nous trouvions déjà sur les lieux." }
            ]
        }),
        care: () => ({
            id: 'care', q: "L'individu a-t-il reçu des soins ?", type: 'single',
            answers: [
                { v: 'refused', l: "A refusé les soins", n: "n'a pas souhaité recevoir de soins" },
                { v: 'ems', l: "Pris en charge par les secours (EMS)", n: "a été pris en charge par les services de secours" },
                { v: 'hospital', l: "Évacué vers l'hôpital", n: "a été évacué vers l'hôpital pour y recevoir des soins" },
                { v: 'onsite', l: "Soins prodigués sur place", n: "a reçu des soins sur place" },
                { v: 'none', l: "Indemne, aucun soin nécessaire", n: "était indemne et n'a nécessité aucun soin" }
            ]
        }),
        outcome: () => ({
            id: 'outcome', q: "Quelle suite a été donnée ?", type: 'single',
            answers: [
                { v: 'station', l: "Conduit au poste pour arrestation", n: "Il a été conduit au poste afin de procéder à son arrestation." },
                { v: 'custody', l: "Placé en garde à vue", n: "Il a été placé en garde à vue." },
                { v: 'released', l: "Relâché après vérifications", n: "Il a été relâché après vérifications." },
                { v: 'fined', l: "Verbalisé puis relâché", n: "Il a été verbalisé sur place puis relâché." },
                { v: 'hospital', l: "Placé sous garde à l'hôpital", n: "Il a été placé sous garde à l'hôpital." },
                { v: 'morgue', l: "Corps confié au médecin légiste", n: "Le corps a été confié au médecin légiste." },
                { v: 'escaped', l: "A pris la fuite / non interpellé", n: "L'individu n'a pas pu être interpellé ; un avis de recherche a été diffusé." }
            ]
        }),
        backupUnit: (cond) => ({
            id: 'backupUnit', q: "Quelle unité est intervenue en renfort ? (grades et noms)", type: 'text',
            placeholder: "Ex: Sgt I MCCALL Raphaël et agent HAÜLT Dirk", when: cond, optional: true
        })
    };

    /* ── SCÉNARIOS ──────────────────────────────────────────────────── */

    const SCEN = {

        /* ───────────── 1. REFUS D'OBTEMPÉRER & COURSE-POURSUITE ───────────── */
        pursuit: {
            label: "Refus d'obtempérer & course-poursuite",
            icon: "🚨", codes: ['10-56', '10-55'],
            questions: [
                Q.engage(),
                Q.call([
                    { v: 'atm', l: "Attaque d'un distributeur (ATM)", n: "une attaque sur un ATM" },
                    { v: 'store', l: "Braquage de supérette", n: "un braquage de supérette" },
                    { v: 'bank', l: "Braquage de banque", n: "un braquage de banque" },
                    { v: 'jewel', l: "Braquage de bijouterie", n: "un braquage de bijouterie" },
                    { v: 'shots', l: "Coups de feu", n: "des coups de feu" },
                    { v: 'stolen', l: "Vol de véhicule", n: "un vol de véhicule" },
                    { v: 'reckless', l: "Conduite dangereuse", n: "une conduite dangereuse" },
                    { v: 'drug', l: "Vente de stupéfiants", n: "une vente de stupéfiants" },
                    { v: 'burglary', l: "Cambriolage", n: "un cambriolage" },
                    { v: 'control', l: "Contrôle routier de routine", n: "un contrôle routier" }
                ]),
                Q.response(),
                {
                    id: 'arrival', q: "Qu'avez-vous constaté sur place ?", type: 'single',
                    answers: [
                        { v: 'fleeing', l: "Un véhicule quittait les lieux à vive allure", n: "descendait à vive allure" },
                        { v: 'parked', l: "Le véhicule suspect était à l'arrêt", n: "se trouvait à l'arrêt sur les lieux" },
                        { v: 'driving', l: "Le véhicule circulait normalement", n: "circulait sur la voie" },
                        { v: 'matching', l: "Un véhicule correspondait au signalement", n: "correspondait au signalement diffusé" }
                    ]
                },
                {
                    id: 'maneuver', q: "Quelle manœuvre avez-vous effectuée ?", type: 'single',
                    answers: [
                        { v: 'uturn', l: "Demi-tour pour interpeller", n: "effectué un demi-tour afin de procéder à l'interpellation du conducteur" },
                        { v: 'intercept', l: "Interception directe", n: "entrepris d'intercepter directement le véhicule" },
                        { v: 'follow', l: "Suivi discret", n: "pris le véhicule en filature" },
                        { v: 'signal', l: "Sommation de s'arrêter", n: "fait signe au conducteur de s'immobiliser" },
                        { v: 'block', l: "Blocage de la voie", n: "entrepris de bloquer la voie de circulation" }
                    ]
                },
                {
                    id: 'reaction', q: "Comment le conducteur a-t-il réagi ?", type: 'single',
                    answers: [
                        { v: 'flee', l: "A pris la fuite", n: "a pris la fuite" },
                        { v: 'accelerate', l: "A brusquement accéléré", n: "a brusquement accéléré pour se soustraire au contrôle" },
                        { v: 'ignore', l: "A ignoré les sommations", n: "a ignoré nos sommations et poursuivi sa route" },
                        { v: 'ram', l: "A tenté de percuter l'unité", n: "a tenté de percuter notre véhicule avant de prendre la fuite" }
                    ]
                },
                {
                    id: 'driving', q: "Que lui reprochez-vous durant la poursuite ?", type: 'multi',
                    answers: [
                        { v: 'code', l: "Infractions au Code de la route", n: "de nombreuses infractions au Code de la route" },
                        { v: 'danger', l: "Conduites dangereuses pour les usagers", n: "plusieurs conduites dangereuses mettant en danger les autres usagers" },
                        { v: 'speed', l: "Vitesse excessive en ville", n: "des excès de vitesse en agglomération" },
                        { v: 'wrongway', l: "Circulation à contresens", n: "une circulation à contresens" },
                        { v: 'offroad', l: "Conduite hors-piste", n: "une conduite hors-piste" },
                        { v: 'peds', l: "Mise en danger de piétons", n: "la mise en danger délibérée de piétons" },
                        { v: 'brake', l: "Freinages pièges (brake-check)", n: "des freinages pièges à l'encontre de nos unités" },
                        { v: 'redlight', l: "Refus de priorités / feux rouges", n: "le franchissement de plusieurs feux rouges" }
                    ]
                },
                {
                    id: 'incident', q: "Un incident a-t-il affecté votre unité durant la poursuite ?", type: 'single',
                    answers: [
                        { v: 'none', l: "Aucun incident", n: null },
                        { v: 'smoke', l: "Notre véhicule a commencé à fumer", n: "notre véhicule a commencé à émettre de la fumée" },
                        { v: 'engine', l: "Panne moteur", n: "notre véhicule a subi une panne moteur" },
                        { v: 'tire', l: "Pneu crevé / éclaté", n: "notre véhicule a subi l'éclatement d'un pneumatique" },
                        { v: 'crash', l: "Nous avons été accidentés", n: "notre véhicule a été accidenté" },
                        { v: 'fuel', l: "Panne d'essence", n: "notre véhicule s'est retrouvé en panne de carburant" },
                        { v: 'lost', l: "Perte de visuel", n: "nous avons perdu le visuel sur le fuyard" }
                    ]
                },
                {
                    id: 'backup', q: "Un renfort est-il intervenu ?", type: 'single',
                    when: a => a.incident && a.incident !== 'none',
                    answers: [
                        { v: 'relay', l: "Une unité a repris la poursuite", n: "relay" },
                        { v: 'support', l: "Une unité est venue en appui", n: "support" },
                        { v: 'none', l: "Aucun renfort", n: null }
                    ]
                },
                Q.backupUnit(a => a.backup === 'relay' || a.backup === 'support'),
                {
                    id: 'endPlace', q: "Où la poursuite s'est-elle terminée ?", type: 'single',
                    answers: [
                        { v: 'marina', l: "Le long de la Marina", n: "le long de la Marina" },
                        { v: 'highway', l: "Sur l'autoroute", n: "sur l'autoroute" },
                        { v: 'downtown', l: "En centre-ville", n: "en plein centre-ville" },
                        { v: 'sandy', l: "Vers Sandy Shores", n: "vers Sandy Shores" },
                        { v: 'paleto', l: "Vers Paleto Bay", n: "vers Paleto Bay" },
                        { v: 'offroad', l: "En terrain accidenté", n: "en terrain accidenté" },
                        { v: 'other', l: "Autre lieu (préciser)", n: "…", text: true }
                    ]
                },
                {
                    id: 'endHow', q: "Comment la poursuite s'est-elle terminée ?", type: 'single',
                    answers: [
                        { v: 'water', l: "Erreur de pilotage → fini dans l'eau", n: "l'individu a commis une erreur de manipulation et a fini sa course dans l'eau" },
                        { v: 'crash', l: "Perte de contrôle → accident", n: "l'individu a perdu le contrôle de son véhicule et a terminé sa course dans un accident" },
                        { v: 'pit', l: "Manœuvre PIT réussie", n: "une manœuvre PIT a permis d'immobiliser le véhicule" },
                        { v: 'spikes', l: "Herses déployées", n: "le déploiement de herses a immobilisé le véhicule" },
                        { v: 'boxing', l: "Blocage en boîte", n: "un blocage en boîte a contraint le véhicule à s'immobiliser" },
                        { v: 'engine', l: "Panne du véhicule fuyard", n: "le véhicule du fuyard est tombé en panne" },
                        { v: 'blocked', l: "Véhicule bloqué (circulation/obstacle)", n: "le véhicule s'est retrouvé bloqué" },
                        { v: 'surrender', l: "Le conducteur s'est rendu", n: "le conducteur a fini par s'immobiliser de lui-même et se rendre" },
                        { v: 'foot', l: "Abandon du véhicule, fuite à pied", n: "l'individu a abandonné son véhicule pour prendre la fuite à pied" }
                    ]
                },
                {
                    id: 'footEnd', q: "Issue de la fuite à pied ?", type: 'single',
                    when: a => a.endHow === 'foot',
                    answers: [
                        { v: 'physical', l: "Appréhendé physiquement", n: "il a été rattrapé et maîtrisé physiquement" },
                        { v: 'taser', l: "Appréhendé au Taser", n: "il a été neutralisé à l'aide d'un Taser" },
                        { v: 'k9', l: "Neutralisé par unité K9", n: "il a été neutralisé par notre unité canine" },
                        { v: 'lost', l: "Perdu de vue", n: "il est parvenu à se soustraire à notre visuel" }
                    ]
                },
                {
                    id: 'arrest', q: "Interpellation effectuée ?", type: 'single',
                    answers: [
                        { v: 'yes', l: "Oui, sans résistance", n: "Nous avons alors procédé à son interpellation." },
                        { v: 'resist', l: "Oui, avec résistance", n: "Nous avons procédé à son interpellation, l'individu opposant une résistance physique." },
                        { v: 'force', l: "Oui, après usage de la force", n: "Nous avons procédé à son interpellation après un recours mesuré à la force." },
                        { v: 'no', l: "Non, l'individu a échappé", n: "L'individu est parvenu à échapper à notre interpellation." }
                    ]
                },
                Q.care(), Q.outcome()
            ],
            narrate(a, c) {
                const qs = this.questions;
                const gq = id => qs.find(x => x.id === id);
                const out = [];

                // P1 — engagement
                const eng = P(gq('engage'), a, 'engage');
                const call = P(gq('call'), a, 'call');
                out.push(para(
                    `Mon unité, composée ${c.officers}, ${eng || 'est intervenue sur'}`,
                    call, c.locPhrase + '.'
                ));

                // P2 — route, constat, manœuvre
                const resp = P(gq('response'), a, 'response');
                const arr = P(gq('arrival'), a, 'arrival');
                const man = P(gq('maneuver'), a, 'maneuver');
                out.push(para(
                    resp,
                    arr ? `Une fois sur place, nous avons constaté qu'un véhicule ${c.vehicleDesc} ${arr}.` : null,
                    man ? `Nous avons donc ${man}.` : null
                ));

                // P3 — prise de fuite + reproches
                const rea = P(gq('reaction'), a, 'reaction');
                const drv = (a.driving || []).map(v => {
                    const o = gq('driving').answers.find(x => x.v === v); return o && o.n;
                }).filter(Boolean);
                out.push(para(
                    rea ? `À cet instant, le conducteur, identifié comme étant ${c.suspect}, ${rea}.` : null,
                    drv.length ? `Durant la poursuite, il a commis ${j(drv, 'ainsi que')}.` : null
                ));

                // P4 — incident unité + renfort
                const inc = P(gq('incident'), a, 'incident');
                if (inc) {
                    const bk = a.backup;
                    let s = `Après plusieurs minutes, ${inc}`;
                    if (bk === 'relay' || bk === 'support') {
                        s += `, nous contraignant à demander une unité supplémentaire en renfort.`;
                        const bu = (a.backupUnit || '').trim();
                        const who = bu ? `L'unité du ${bu}` : `Une unité supplémentaire`;
                        s += ` ${who} a ${bk === 'relay' ? 'repris la poursuite' : 'pris notre appui'}.`;
                    } else s += '.';
                    out.push(s);
                }

                // P5 — fin de poursuite + interpellation
                const ep = P(gq('endPlace'), a, 'endPlace');
                const eh = P(gq('endHow'), a, 'endHow');
                const fe = P(gq('footEnd'), a, 'footEnd');
                const ar = P(gq('arrest'), a, 'arrest');
                out.push(para(
                    (ep || eh) ? `Quelques minutes plus tard, la poursuite s'est dirigée ${ep || ''}${eh ? `, où ${eh}` : ''}.` : null,
                    fe ? cap(fe) + '.' : null,
                    ar
                ));

                // P6 — soins + suite
                const care = P(gq('care'), a, 'care');
                const outc = P(gq('outcome'), a, 'outcome');
                out.push(para(care ? `L'individu ${care}.` : null, outc));

                return out.filter(Boolean);
            }
        },

        /* ───────────── 2. ACCIDENT & DOMMAGES COLLATÉRAUX ───────────── */
        accident: {
            label: "Accident & dommages collatéraux",
            icon: "💥", codes: ['10-50', '10-51'],
            questions: [
                Q.engage(),
                Q.call([
                    { v: 'crash', l: "Accident de la circulation", n: "un accident de la circulation" },
                    { v: 'severe', l: "Accident grave avec blessés", n: "un accident grave faisant des blessés" },
                    { v: 'hitrun', l: "Délit de fuite", n: "un délit de fuite" },
                    { v: 'pileup', l: "Carambolage", n: "un carambolage" },
                    { v: 'pedestrian', l: "Piéton renversé", n: "un piéton renversé" }
                ]),
                Q.response(),
                {
                    id: 'collision', q: "Type de collision constaté ?", type: 'single',
                    answers: [
                        { v: 'twoveh', l: "Entre deux véhicules", n: "une collision entre deux véhicules" },
                        { v: 'multi', l: "Carambolage (3+ véhicules)", n: "un carambolage impliquant plusieurs véhicules" },
                        { v: 'fixed', l: "Contre un obstacle fixe", n: "une collision contre un obstacle fixe" },
                        { v: 'ped', l: "Véhicule contre piéton", n: "une collision entre un véhicule et un piéton" },
                        { v: 'police', l: "Impliquant une unité de police", n: "une collision impliquant une unité de police" },
                        { v: 'rollover', l: "Tonneau / véhicule retourné", n: "un véhicule ayant fait plusieurs tonneaux" }
                    ]
                },
                {
                    id: 'cause', q: "Cause apparente ?", type: 'single',
                    answers: [
                        { v: 'speed', l: "Vitesse excessive", n: "une vitesse manifestement excessive" },
                        { v: 'priority', l: "Refus de priorité", n: "un refus de priorité" },
                        { v: 'dui', l: "Conduite sous influence", n: "une conduite sous l'emprise de substances" },
                        { v: 'phone', l: "Inattention / téléphone", n: "un défaut d'attention du conducteur" },
                        { v: 'weather', l: "Conditions / chaussée", n: "l'état de la chaussée" },
                        { v: 'mech', l: "Défaillance mécanique", n: "une défaillance mécanique" },
                        { v: 'pursuit', l: "Consécutif à une poursuite", n: "la fuite du conducteur face à nos unités" },
                        { v: 'unknown', l: "Indéterminée", n: "une cause indéterminée à ce stade" }
                    ]
                },
                {
                    id: 'victims', q: "Bilan humain ?", type: 'multi',
                    answers: [
                        { v: 'none', l: "Aucun blessé", n: "aucun blessé", exclusive: true },
                        { v: 'light', l: "Blessés légers", n: "blessés légers" },
                        { v: 'serious', l: "Blessés graves", n: "blessés graves" },
                        { v: 'trapped', l: "Personne(s) incarcérée(s)", n: "une ou plusieurs personnes incarcérées dans les tôles" },
                        { v: 'dead', l: "Décès sur place", n: "un décès constaté sur place" },
                        { v: 'ped', l: "Piéton touché", n: "un piéton touché" },
                        { v: 'officer', l: "Agent blessé", n: "un agent du LSPD blessé" }
                    ]
                },
                {
                    id: 'ems', q: "Intervention des secours ?", type: 'single',
                    answers: [
                        { v: 'called', l: "EMS demandés et intervenus", n: "Les services de secours ont été requis et sont intervenus sur les lieux." },
                        { v: 'firefighters', l: "Pompiers pour désincarcération", n: "Les pompiers ont été requis afin de procéder à la désincarcération." },
                        { v: 'onsite', l: "Premiers soins par nos soins", n: "Nous avons prodigué les premiers secours dans l'attente des renforts médicaux." },
                        { v: 'none', l: "Aucun secours nécessaire", n: null }
                    ]
                },
                {
                    id: 'scene', q: "Mesures prises sur la scène ?", type: 'multi',
                    answers: [
                        { v: 'perimeter', l: "Périmètre de sécurité", n: "l'établissement d'un périmètre de sécurité" },
                        { v: 'traffic', l: "Régulation de la circulation", n: "la régulation de la circulation" },
                        { v: 'closure', l: "Fermeture de la voie", n: "la fermeture de la voie" },
                        { v: 'tow', l: "Enlèvement des véhicules", n: "l'enlèvement des véhicules accidentés" },
                        { v: 'photos', l: "Relevés et photographies", n: "les relevés et photographies d'usage" },
                        { v: 'witness', l: "Recueil de témoignages", n: "le recueil des témoignages" }
                    ]
                },
                {
                    id: 'liable', q: "Responsabilité établie ?", type: 'single',
                    answers: [
                        { v: 'suspect', l: "Le mis en cause est responsable", n: "La responsabilité de l'accident incombe au mis en cause." },
                        { v: 'other', l: "Un tiers est responsable", n: "La responsabilité incombe à un tiers identifié." },
                        { v: 'shared', l: "Responsabilité partagée", n: "Les responsabilités apparaissent partagées." },
                        { v: 'unclear', l: "À déterminer", n: "Les responsabilités restent à déterminer." }
                    ]
                },
                Q.care(), Q.outcome()
            ],
            narrate(a, c) {
                const qs = this.questions, gq = id => qs.find(x => x.id === id), out = [];
                const eng = P(gq('engage'), a, 'engage'), call = P(gq('call'), a, 'call');
                out.push(para(`Mon unité, composée ${c.officers}, ${eng || 'est intervenue sur'}`, call, c.locPhrase + '.'));

                const resp = P(gq('response'), a, 'response');
                const col = P(gq('collision'), a, 'collision');
                out.push(para(resp, col ? `Une fois sur place, nous avons constaté ${col}.` : null));

                const cause = P(gq('cause'), a, 'cause');
                const vic = multiN(gq('victims'), a.victims);
                const noVictim = onlyExclusive(gq('victims'), a.victims);
                out.push(para(
                    cause ? `Les constatations font apparaître ${cause} comme cause de l'accident.` : null,
                    noVictim ? `Aucun blessé n'est à déplorer.`
                        : (vic.length ? `Le bilan fait état ${de(j(vic))}.` : null)
                ));

                const ems = P(gq('ems'), a, 'ems');
                const sc = (a.scene || []).map(v => { const o = gq('scene').answers.find(x => x.v === v); return o && o.n; }).filter(Boolean);
                out.push(para(ems, sc.length ? `Nous avons procédé ${j(sc.map(aa))}.` : null));

                const li = P(gq('liable'), a, 'liable');
                const care = P(gq('care'), a, 'care'), outc = P(gq('outcome'), a, 'outcome');
                out.push(para(li, care ? `L'individu ${care}.` : null, outc));
                return out.filter(Boolean);
            }
        },

        /* ───────────── 3. FUSILLADE & VIOLENCES ARMÉES ───────────── */
        shooting: {
            label: "Fusillade & violences armées",
            icon: "🔫", codes: ['10-32', '10-31'],
            questions: [
                Q.engage(),
                Q.call([
                    { v: 'shots', l: "Coups de feu entendus", n: "des coups de feu" },
                    { v: 'active', l: "Fusillade en cours", n: "une fusillade en cours" },
                    { v: 'armed', l: "Individu armé", n: "la présence d'un individu armé" },
                    { v: 'driveby', l: "Drive-by", n: "un drive-by" },
                    { v: 'officer', l: "Agent pris pour cible", n: "un agent pris pour cible" },
                    { v: 'gang', l: "Affrontement entre gangs", n: "un affrontement entre bandes rivales" }
                ]),
                Q.response(),
                {
                    id: 'initiator', q: "Qui a ouvert le feu en premier ?", type: 'single',
                    answers: [
                        { v: 'suspect', l: "Le suspect, sur nos unités", n: "le suspect a ouvert le feu en direction de nos unités" },
                        { v: 'suspect_civ', l: "Le suspect, sur des civils", n: "le suspect a ouvert le feu en direction de civils" },
                        { v: 'between', l: "Entre tiers (avant arrivée)", n: "l'échange de tirs opposait des tiers avant notre arrivée" },
                        { v: 'police', l: "Nos unités, en riposte", n: "nos unités ont fait usage de leur arme en riposte" },
                        { v: 'unknown', l: "Indéterminé", n: "l'origine des tirs n'a pu être déterminée" }
                    ]
                },
                {
                    id: 'weapons', q: "Armes employées par le ou les suspects ?", type: 'multi',
                    answers: [
                        { v: 'pistol', l: "Arme de poing", n: "une arme de poing" },
                        { v: 'smg', l: "Pistolet-mitrailleur", n: "un pistolet-mitrailleur" },
                        { v: 'rifle', l: "Fusil d'assaut", n: "un fusil d'assaut" },
                        { v: 'shotgun', l: "Fusil à pompe", n: "un fusil à pompe" },
                        { v: 'sniper', l: "Fusil de précision", n: "un fusil de précision" },
                        { v: 'melee', l: "Arme blanche", n: "une arme blanche" },
                        { v: 'unknown', l: "Non identifiée", n: "une arme non identifiée" }
                    ]
                },
                {
                    id: 'response_force', q: "Réponse de vos unités ?", type: 'single',
                    answers: [
                        { v: 'return', l: "Riposte par le feu", n: "Nous avons riposté par l'usage de notre arme de service." },
                        { v: 'cover', l: "Mise à couvert sans tirer", n: "Nous nous sommes mis à couvert sans faire usage de nos armes." },
                        { v: 'less', l: "Force intermédiaire (Taser/beanbag)", n: "Nous avons fait usage d'une force intermédiaire." },
                        { v: 'perimeter', l: "Périmètre et attente des renforts", n: "Nous avons établi un périmètre dans l'attente des renforts spécialisés." },
                        { v: 'swat', l: "Engagement du SWAT", n: "L'unité SWAT a été engagée sur les lieux." }
                    ]
                },
                {
                    id: 'casualties', q: "Bilan de la fusillade ?", type: 'multi',
                    answers: [
                        { v: 'none', l: "Aucune victime", n: "aucune victime n'est à déplorer", exclusive: true },
                        { v: 'suspect_hit', l: "Suspect touché", n: "le suspect a été touché" },
                        { v: 'suspect_dead', l: "Suspect décédé", n: "le suspect est décédé" },
                        { v: 'civ_hit', l: "Civil touché", n: "un civil a été touché" },
                        { v: 'civ_dead', l: "Civil décédé", n: "un civil est décédé" },
                        { v: 'officer_hit', l: "Agent touché", n: "un agent du LSPD a été touché" },
                        { v: 'damage', l: "Dégâts matériels", n: "des dégâts matériels ont été constatés" }
                    ]
                },
                {
                    id: 'seized', q: "Armes saisies ?", type: 'single',
                    answers: [
                        { v: 'yes', l: "Oui, saisies et placées sous scellés", n: "Les armes ont été saisies et placées sous scellés." },
                        { v: 'partial', l: "Partiellement (certaines non retrouvées)", n: "Une partie de l'armement a été saisie, le reste n'ayant pu être retrouvé." },
                        { v: 'no', l: "Non, aucune arme retrouvée", n: "Aucune arme n'a pu être retrouvée sur les lieux." }
                    ]
                },
                {
                    id: 'ballistic', q: "Relevés effectués ?", type: 'multi', optional: true,
                    answers: [
                        { v: 'shells', l: "Douilles collectées", n: "la collecte des douilles" },
                        { v: 'impacts', l: "Impacts relevés", n: "le relevé des impacts" },
                        { v: 'photos', l: "Photographies de scène", n: "les photographies de scène" },
                        { v: 'witness', l: "Témoignages recueillis", n: "le recueil des témoignages" },
                        { v: 'cctv', l: "Vidéosurveillance saisie", n: "la saisie des images de vidéosurveillance" }
                    ]
                },
                Q.care(), Q.outcome()
            ],
            narrate(a, c) {
                const qs = this.questions, gq = id => qs.find(x => x.id === id), out = [];
                const eng = P(gq('engage'), a, 'engage'), call = P(gq('call'), a, 'call');
                out.push(para(`Mon unité, composée ${c.officers}, ${eng || 'est intervenue sur'}`, call, c.locPhrase + '.'));

                const resp = P(gq('response'), a, 'response');
                const ini = P(gq('initiator'), a, 'initiator');
                out.push(para(resp, ini ? `Une fois sur place, nous avons constaté ${que(ini)}.` : null));

                const w = (a.weapons || []).map(v => { const o = gq('weapons').answers.find(x => x.v === v); return o && o.n; }).filter(Boolean);
                const rf = P(gq('response_force'), a, 'response_force');
                out.push(para(
                    w.length ? `Le ou les mis en cause faisaient usage ${de(j(w))}.` : null,
                    rf
                ));

                const cas = multiN(gq('casualties'), a.casualties);
                const sz = P(gq('seized'), a, 'seized');
                out.push(para(cas.length ? cap(j(cas)) + '.' : null, sz));

                const b = (a.ballistic || []).map(v => { const o = gq('ballistic').answers.find(x => x.v === v); return o && o.n; }).filter(Boolean);
                const care = P(gq('care'), a, 'care'), outc = P(gq('outcome'), a, 'outcome');
                out.push(para(
                    b.length ? `Il a été procédé ${j(b.map(aa))}.` : null,
                    care ? `L'individu ${care}.` : null, outc
                ));
                return out.filter(Boolean);
            }
        },

        /* ───────────── 4. BRAQUAGE & PRISE D'OTAGES ───────────── */
        robbery: {
            label: "Braquage & prise d'otages",
            icon: "🏦", codes: ['10-61', '10-40', '10-62', '10-74'],
            questions: [
                Q.engage(),
                Q.call([
                    { v: 'bank', l: "Braquage de banque", n: "un braquage de banque" },
                    { v: 'store', l: "Braquage de supérette", n: "un braquage de supérette" },
                    { v: 'jewel', l: "Braquage de bijouterie", n: "un braquage de bijouterie" },
                    { v: 'atm', l: "Attaque de distributeur", n: "une attaque de distributeur automatique" },
                    { v: 'smash', l: "Smash and grab / racket", n: "un racket avec destruction de vitrine" },
                    { v: 'hostage', l: "Prise d'otages", n: "une prise d'otages" }
                ]),
                Q.response(),
                {
                    id: 'stage', q: "État de l'action à votre arrivée ?", type: 'single',
                    answers: [
                        { v: 'inprogress', l: "Braquage en cours", n: "l'action était toujours en cours" },
                        { v: 'barricaded', l: "Suspects retranchés", n: "les suspects s'étaient retranchés à l'intérieur" },
                        { v: 'fleeing', l: "Suspects en fuite", n: "les suspects venaient de quitter les lieux" },
                        { v: 'over', l: "Terminé, suspects partis", n: "l'action était terminée et les auteurs avaient quitté les lieux" }
                    ]
                },
                {
                    id: 'nbSuspects', q: "Combien d'auteurs ?", type: 'single',
                    answers: [
                        { v: '1', l: "1 auteur", n: "un auteur" }, { v: '2', l: "2 auteurs", n: "deux auteurs" },
                        { v: '3', l: "3 auteurs", n: "trois auteurs" }, { v: '4', l: "4 auteurs", n: "quatre auteurs" },
                        { v: '5+', l: "5 ou plus", n: "cinq auteurs ou plus" }, { v: 'unknown', l: "Indéterminé", n: "un nombre indéterminé d'auteurs" }
                    ]
                },
                {
                    id: 'hostages', q: "Y avait-il des otages ?", type: 'single',
                    answers: [
                        { v: 'none', l: "Aucun otage", n: null },
                        { v: 'few', l: "1 à 3 otages", n: "un à trois otages" },
                        { v: 'several', l: "4 à 10 otages", n: "quatre à dix otages" },
                        { v: 'many', l: "Plus de 10 otages", n: "plus de dix otages" }
                    ]
                },
                {
                    id: 'demands', q: "Revendications des preneurs d'otages ?", type: 'multi',
                    when: a => a.hostages && a.hostages !== 'none', optional: true,
                    answers: [
                        { v: 'vehicle', l: "Véhicule de fuite", n: "un véhicule de fuite" },
                        { v: 'money', l: "Rançon", n: "le versement d'une rançon" },
                        { v: 'free', l: "Libération d'un détenu", n: "la libération d'un détenu" },
                        { v: 'exit', l: "Sortie libre", n: "une sortie libre" },
                        { v: 'none', l: "Aucune revendication", n: "aucune revendication formulée" }
                    ]
                },
                {
                    id: 'negotiation', q: "Négociation engagée ?", type: 'single',
                    when: a => a.hostages && a.hostages !== 'none',
                    answers: [
                        { v: 'success', l: "Oui, aboutie", n: "Une négociation a été engagée et a abouti." },
                        { v: 'partial', l: "Oui, libération partielle", n: "Une négociation a permis la libération d'une partie des otages." },
                        { v: 'failed', l: "Oui, échec", n: "La négociation engagée n'a pas abouti." },
                        { v: 'none', l: "Non, assaut direct", n: "Aucune négociation n'a pu être engagée." }
                    ]
                },
                {
                    id: 'resolution', q: "Comment l'intervention s'est-elle dénouée ?", type: 'single',
                    answers: [
                        { v: 'surrender', l: "Reddition des auteurs", n: "les auteurs se sont rendus" },
                        { v: 'assault', l: "Assaut des unités", n: "un assaut a été donné par nos unités" },
                        { v: 'swat', l: "Assaut du SWAT", n: "l'unité SWAT a donné l'assaut" },
                        { v: 'shootout', l: "Fusillade", n: "l'intervention s'est soldée par un échange de tirs" },
                        { v: 'pursuit', l: "Fuite → course-poursuite", n: "les auteurs ont pris la fuite, donnant lieu à une course-poursuite" },
                        { v: 'escaped', l: "Auteurs en fuite (non interpellés)", n: "les auteurs sont parvenus à prendre la fuite" }
                    ]
                },
                {
                    id: 'loot', q: "Butin ?", type: 'single',
                    answers: [
                        { v: 'recovered', l: "Intégralement récupéré", n: "Le butin a été intégralement récupéré et placé sous scellés." },
                        { v: 'partial', l: "Partiellement récupéré", n: "Une partie du butin a été récupérée et placée sous scellés." },
                        { v: 'none', l: "Non récupéré", n: "Le butin n'a pas été récupéré." },
                        { v: 'nothing', l: "Aucun butin emporté", n: "Aucun butin n'a été emporté." }
                    ]
                },
                {
                    id: 'hostageOutcome', q: "État des otages ?", type: 'single',
                    when: a => a.hostages && a.hostages !== 'none',
                    answers: [
                        { v: 'safe', l: "Tous sains et saufs", n: "L'ensemble des otages a été libéré sain et sauf." },
                        { v: 'injured', l: "Blessés parmi les otages", n: "Des blessés sont à déplorer parmi les otages." },
                        { v: 'dead', l: "Décès parmi les otages", n: "Un décès est à déplorer parmi les otages." }
                    ]
                },
                Q.care(), Q.outcome()
            ],
            narrate(a, c) {
                const qs = this.questions, gq = id => qs.find(x => x.id === id), out = [];
                const eng = P(gq('engage'), a, 'engage'), call = P(gq('call'), a, 'call');
                out.push(para(`Mon unité, composée ${c.officers}, ${eng || 'est intervenue sur'}`, call, c.locPhrase + '.'));

                const resp = P(gq('response'), a, 'response');
                const st = P(gq('stage'), a, 'stage');
                const nb = P(gq('nbSuspects'), a, 'nbSuspects');
                out.push(para(resp,
                    st ? `Une fois sur place, nous avons constaté ${que(st)}.` : null,
                    nb ? `L'action était le fait ${de(nb)}.` : null));

                const ho = P(gq('hostages'), a, 'hostages');
                const dm = (a.demands || []).map(v => { const o = gq('demands').answers.find(x => x.v === v); return o && o.n; }).filter(Boolean);
                const ng = P(gq('negotiation'), a, 'negotiation');
                if (ho || ng) out.push(para(
                    ho ? `Les auteurs retenaient ${ho}.` : null,
                    dm.length ? `Ils exigeaient ${j(dm)}.` : null, ng));

                const res = P(gq('resolution'), a, 'resolution');
                const lt = P(gq('loot'), a, 'loot');
                const hout = P(gq('hostageOutcome'), a, 'hostageOutcome');
                out.push(para(res ? `L'intervention s'est dénouée lorsque ${res}.` : null, hout, lt));

                const care = P(gq('care'), a, 'care'), outc = P(gq('outcome'), a, 'outcome');
                out.push(para(care ? `L'individu ${care}.` : null, outc));
                return out.filter(Boolean);
            }
        },

        /* ───────────── 5. STUPÉFIANTS & PERQUISITION ───────────── */
        narco: {
            label: "Stupéfiants, contrebande & perquisition",
            icon: "💊", codes: ['10-60'],
            questions: [
                Q.engage(),
                Q.call([
                    { v: 'sale', l: "Vente de stupéfiants", n: "une vente de stupéfiants" },
                    { v: 'lab', l: "Laboratoire clandestin", n: "un laboratoire clandestin" },
                    { v: 'traffic', l: "Trafic organisé", n: "un trafic de stupéfiants organisé" },
                    { v: 'possession', l: "Détention suspectée", n: "une détention de stupéfiants" },
                    { v: 'smuggling', l: "Contrebande", n: "une affaire de contrebande" },
                    { v: 'warrant', l: "Exécution d'un mandat de perquisition", n: "l'exécution d'un mandat de perquisition" }
                ]),
                Q.response(),
                {
                    id: 'observed', q: "Qu'avez-vous constaté ?", type: 'single',
                    answers: [
                        { v: 'transaction', l: "Transaction en cours", n: "une transaction en cours entre plusieurs individus" },
                        { v: 'exchange', l: "Échange main à main", n: "un échange main à main caractéristique" },
                        { v: 'stash', l: "Cache de produits", n: "une cache de produits stupéfiants" },
                        { v: 'lab', l: "Installation de production", n: "une installation de production" },
                        { v: 'consumption', l: "Consommation sur la voie publique", n: "une consommation sur la voie publique" },
                        { v: 'flight', l: "Individus prenant la fuite", n: "des individus prenant la fuite à notre approche" }
                    ]
                },
                {
                    id: 'searchBasis', q: "Sur quelle base la fouille a-t-elle été menée ?", type: 'single',
                    answers: [
                        { v: 'plainview', l: "Produits en vue directe", n: "les produits se trouvaient en vue directe" },
                        { v: 'consent', l: "Consentement de l'intéressé", n: "l'intéressé a consenti à la fouille" },
                        { v: 'incident', l: "Fouille incidente à l'arrestation", n: "il a été procédé à une fouille incidente à l'arrestation" },
                        { v: 'warrant', l: "Mandat de perquisition", n: "un mandat de perquisition régulièrement délivré" },
                        { v: 'probable', l: "Motif raisonnable (odeur, indices)", n: "des motifs raisonnables caractérisés" },
                        { v: 'k9', l: "Marquage par unité K9", n: "le marquage effectué par notre unité canine" }
                    ]
                },
                {
                    id: 'drugs', q: "Produits découverts ?", type: 'multi',
                    answers: [
                        { v: 'cannabis', l: "Cannabis", n: "cannabis" }, { v: 'cocaine', l: "Cocaïne", n: "cocaïne" },
                        { v: 'crack', l: "Crack", n: "crack" }, { v: 'heroin', l: "Héroïne", n: "héroïne" },
                        { v: 'meth', l: "Méthamphétamine", n: "méthamphétamine" }, { v: 'ecstasy', l: "Ecstasy", n: "ecstasy" },
                        { v: 'fentanyl', l: "Fentanyl", n: "fentanyl" }, { v: 'seeds', l: "Graines / produits transformables", n: "produits transformables" },
                        { v: 'none', l: "Aucun produit", n: null, exclusive: true }
                    ]
                },
                {
                    id: 'packaging', q: "Conditionnement constaté ?", type: 'single', optional: true,
                    answers: [
                        { v: 'doses', l: "Doses individuelles (revente)", n: "conditionnés en doses individuelles, caractéristiques de la revente" },
                        { v: 'bulk', l: "En vrac / gros volume", n: "conditionnés en gros volume" },
                        { v: 'bricks', l: "Pains / briques compressées", n: "conditionnés en pains compressés" },
                        { v: 'personal', l: "Quantité d'usage personnel", n: "en quantité correspondant à un usage personnel" }
                    ]
                },
                {
                    id: 'seizures', q: "Autres saisies ?", type: 'multi', optional: true,
                    answers: [
                        { v: 'cash', l: "Argent liquide", n: "une somme d'argent liquide" },
                        { v: 'weapons', l: "Armes", n: "des armes" },
                        { v: 'scales', l: "Balances / matériel de découpe", n: "du matériel de pesée et de découpe" },
                        { v: 'phones', l: "Téléphones", n: "plusieurs téléphones" },
                        { v: 'vehicle', l: "Véhicule", n: "un véhicule" },
                        { v: 'documents', l: "Documents / comptabilité", n: "des documents comptables" }
                    ]
                },
                {
                    id: 'gang', q: "Affiliation criminelle constatée ?", type: 'single', optional: true,
                    answers: [
                        { v: 'yes', l: "Oui, affiliation établie", n: "Une affiliation à une organisation criminelle a été établie." },
                        { v: 'suspected', l: "Suspectée", n: "Une affiliation à une organisation criminelle est suspectée." },
                        { v: 'no', l: "Aucune", n: null }
                    ]
                },
                Q.care(), Q.outcome()
            ],
            narrate(a, c) {
                const qs = this.questions, gq = id => qs.find(x => x.id === id), out = [];
                const eng = P(gq('engage'), a, 'engage'), call = P(gq('call'), a, 'call');
                out.push(para(`Mon unité, composée ${c.officers}, ${eng || 'est intervenue sur'}`, call, c.locPhrase + '.'));

                const resp = P(gq('response'), a, 'response');
                const ob = P(gq('observed'), a, 'observed');
                out.push(para(resp, ob ? `Une fois sur place, nous avons constaté ${ob}.` : null));

                const sb = P(gq('searchBasis'), a, 'searchBasis');
                const dr = multiN(gq('drugs'), a.drugs);
                const pk = P(gq('packaging'), a, 'packaging');
                out.push(para(
                    sb ? `La fouille a été menée sur le fondement suivant : ${sb}.` : null,
                    dr.length ? `Elle a permis la découverte de ${j(dr)}${pk ? `, ${pk}` : ''}.` : null
                ));

                const sz = (a.seizures || []).map(v => { const o = gq('seizures').answers.find(x => x.v === v); return o && o.n; }).filter(Boolean);
                const gg = P(gq('gang'), a, 'gang');
                out.push(para(
                    sz.length ? `Ont également été saisis et placés sous scellés : ${j(sz)}.` : null, gg
                ));

                const care = P(gq('care'), a, 'care'), outc = P(gq('outcome'), a, 'outcome');
                out.push(para(care ? `L'individu ${care}.` : null, outc));
                return out.filter(Boolean);
            }
        },

        /* ───────────── 6. VIOLENCES DOMESTIQUES & PERSONNES VULNÉRABLES ───────────── */
        domestic: {
            label: "Violences domestiques & personnes vulnérables",
            icon: "🏠", codes: ['DV'],
            questions: [
                Q.engage(),
                Q.call([
                    { v: 'dispute', l: "Dispute conjugale", n: "une dispute conjugale" },
                    { v: 'violence', l: "Violences domestiques", n: "des violences domestiques" },
                    { v: 'noise', l: "Tapage / cris", n: "des cris et du tapage" },
                    { v: 'psy', l: "Crise psychologique", n: "une personne en crise" },
                    { v: 'wellness', l: "Contrôle de bien-être", n: "une demande de contrôle de bien-être" },
                    { v: 'child', l: "Enfant en danger", n: "un enfant en danger" },
                    { v: 'missing', l: "Disparition inquiétante", n: "une disparition inquiétante" }
                ]),
                Q.response(),
                {
                    id: 'onArrival', q: "Qu'avez-vous constaté à votre arrivée ?", type: 'single',
                    answers: [
                        { v: 'ongoing', l: "Altercation en cours", n: "une altercation toujours en cours" },
                        { v: 'calm', l: "Situation apaisée", n: "une situation déjà apaisée" },
                        { v: 'injured', l: "Victime blessée", n: "une victime présentant des blessures" },
                        { v: 'damage', l: "Logement dégradé", n: "un logement présentant des dégradations" },
                        { v: 'crisis', l: "Personne en crise", n: "une personne en état de crise manifeste" },
                        { v: 'nobody', l: "Personne ne répondait", n: "que personne ne répondait" }
                    ]
                },
                {
                    id: 'victimState', q: "État de la victime ?", type: 'multi', optional: true,
                    answers: [
                        { v: 'none', l: "Aucune blessure apparente", n: "ne présentait aucune blessure apparente", exclusive: true },
                        { v: 'bruises', l: "Ecchymoses / marques", n: "présentait des ecchymoses" },
                        { v: 'wounds', l: "Blessures nécessitant des soins", n: "présentait des blessures nécessitant des soins" },
                        { v: 'shock', l: "État de choc", n: "se trouvait en état de choc" },
                        { v: 'refuses', l: "Refuse de porter plainte", n: "a refusé de porter plainte" },
                        { v: 'minor', l: "Mineur présent sur les lieux", n: "un mineur était présent sur les lieux" }
                    ]
                },
                {
                    id: 'deescalation', q: "Techniques de désescalade employées ?", type: 'multi', optional: true,
                    answers: [
                        { v: 'dialogue', l: "Dialogue et écoute active", n: "un dialogue et une écoute active" },
                        { v: 'separate', l: "Séparation des parties", n: "la séparation des parties" },
                        { v: 'calm', l: "Apaisement verbal", n: "un apaisement verbal" },
                        { v: 'specialist', l: "Appel à un spécialiste / négociateur", n: "l'intervention d'un spécialiste" },
                        { v: 'none', l: "Aucune (intervention immédiate)", n: null, exclusive: true }
                    ]
                },
                {
                    id: 'protective', q: "Mesures de protection prises ?", type: 'multi', optional: true,
                    answers: [
                        { v: 'eviction', l: "Éviction de l'auteur", n: "l'éviction de l'auteur du domicile" },
                        { v: 'shelter', l: "Mise à l'abri de la victime", n: "la mise à l'abri de la victime" },
                        { v: 'ems', l: "Prise en charge médicale", n: "une prise en charge médicale" },
                        { v: 'social', l: "Signalement aux services sociaux", n: "un signalement aux services sociaux" },
                        { v: 'psy', l: "Évaluation psychiatrique", n: "une évaluation psychiatrique" },
                        { v: 'child', l: "Protection de l'enfance saisie", n: "la saisine des services de protection de l'enfance" }
                    ]
                },
                {
                    id: 'resolution', q: "Issue de l'intervention ?", type: 'single',
                    answers: [
                        { v: 'arrest', l: "Interpellation de l'auteur", n: "L'auteur des faits a été interpellé." },
                        { v: 'calm', l: "Situation apaisée, aucune suite", n: "La situation a été apaisée sans qu'aucune suite pénale ne soit engagée." },
                        { v: 'psy', l: "Placement en évaluation psychiatrique", n: "La personne a été placée en évaluation psychiatrique." },
                        { v: 'complaint', l: "Plainte enregistrée", n: "Une plainte a été enregistrée." },
                        { v: 'nobody', l: "Aucune suite (personne absente)", n: "Aucune suite n'a pu être donnée en l'absence des occupants." }
                    ]
                },
                Q.care(), Q.outcome()
            ],
            narrate(a, c) {
                const qs = this.questions, gq = id => qs.find(x => x.id === id), out = [];
                const eng = P(gq('engage'), a, 'engage'), call = P(gq('call'), a, 'call');
                out.push(para(`Mon unité, composée ${c.officers}, ${eng || 'est intervenue sur'}`, call, c.locPhrase + '.'));

                const resp = P(gq('response'), a, 'response');
                const oa = P(gq('onArrival'), a, 'onArrival');
                out.push(para(resp, oa ? `Une fois sur place, nous avons constaté ${oa}.` : null));

                const vs = multiN(gq('victimState'), a.victimState);
                const de = (a.deescalation || []).map(v => { const o = gq('deescalation').answers.find(x => x.v === v); return o && o.n; }).filter(Boolean);
                out.push(para(
                    vs.length ? `La victime ${j(vs)}.` : null,
                    de.length ? `Nous avons privilégié ${j(de)} afin de faire retomber la tension.` : null
                ));

                const pr = (a.protective || []).map(v => { const o = gq('protective').answers.find(x => x.v === v); return o && o.n; }).filter(Boolean);
                const rs = P(gq('resolution'), a, 'resolution');
                out.push(para(pr.length ? `Nous avons procédé ${j(pr.map(aa))}.` : null, rs));

                const care = P(gq('care'), a, 'care'), outc = P(gq('outcome'), a, 'outcome');
                out.push(para(care ? `L'individu ${care}.` : null, outc));
                return out.filter(Boolean);
            }
        },

        /* ───────────── 7. SCÈNE DE DÉCÈS / DOA ───────────── */
        doa: {
            label: "Scène de décès / DOA",
            icon: "⚰️", codes: ['DOA'],
            questions: [
                Q.engage(),
                Q.call([
                    { v: 'body', l: "Découverte d'un corps", n: "la découverte d'un corps sans vie" },
                    { v: 'suicide', l: "Suicide", n: "un suicide" },
                    { v: 'overdose', l: "Overdose fatale", n: "une overdose fatale" },
                    { v: 'homicide', l: "Homicide", n: "un homicide" },
                    { v: 'accident', l: "Décès accidentel", n: "un décès accidentel" },
                    { v: 'natural', l: "Mort naturelle suspectée", n: "un décès de cause apparemment naturelle" }
                ]),
                Q.response(),
                {
                    id: 'discovery', q: "Qui a découvert le corps ?", type: 'single',
                    answers: [
                        { v: 'civilian', l: "Un passant / civil", n: "le corps a été découvert par un civil" },
                        { v: 'family', l: "Un proche", n: "le corps a été découvert par un proche" },
                        { v: 'unit', l: "Notre unité", n: "nous avons nous-mêmes découvert le corps" },
                        { v: 'ems', l: "Les secours", n: "le corps a été découvert par les services de secours" },
                        { v: 'worker', l: "Un employé sur site", n: "le corps a été découvert par un employé" }
                    ]
                },
                {
                    id: 'bodyState', q: "État constaté du corps ?", type: 'multi',
                    answers: [
                        { v: 'recent', l: "Décès récent", n: "un décès manifestement récent" },
                        { v: 'rigor', l: "Rigidité cadavérique", n: "une rigidité cadavérique installée" },
                        { v: 'advanced', l: "Décomposition avancée", n: "un état de décomposition avancée" },
                        { v: 'trauma', l: "Traumatismes visibles", n: "des traumatismes visibles" },
                        { v: 'gunshot', l: "Blessure par arme à feu", n: "une blessure par arme à feu" },
                        { v: 'stab', l: "Blessure par arme blanche", n: "une blessure par arme blanche" },
                        { v: 'nomark', l: "Aucune marque apparente", n: "aucune marque apparente de violence", exclusive: true }
                    ]
                },
                {
                    id: 'ems_confirm', q: "Décès confirmé par ?", type: 'single',
                    answers: [
                        { v: 'ems', l: "Les secours sur place", n: "Le décès a été confirmé sur place par les services de secours." },
                        { v: 'doctor', l: "Un médecin", n: "Le décès a été constaté par un médecin." },
                        { v: 'coroner', l: "Le médecin légiste", n: "Le décès a été constaté par le médecin légiste." },
                        { v: 'evident', l: "Décès évident (constat d'unité)", n: "Le décès était manifeste et a été constaté par nos soins." }
                    ]
                },
                {
                    id: 'sceneMeasures', q: "Mesures de préservation de la scène ?", type: 'multi',
                    answers: [
                        { v: 'freeze', l: "Gel des lieux", n: "le gel des lieux" },
                        { v: 'perimeter', l: "Périmètre de sécurité", n: "l'établissement d'un périmètre de sécurité" },
                        { v: 'log', l: "Registre des entrées/sorties", n: "la tenue d'un registre des entrées et sorties" },
                        { v: 'photos', l: "Photographies de scène", n: "les photographies de scène" },
                        { v: 'cid', l: "Saisine du CID", n: "la saisine de la division des crimes majeurs" },
                        { v: 'witness', l: "Recueil des témoignages", n: "le recueil des témoignages" }
                    ]
                },
                {
                    id: 'suspicious', q: "Caractère suspect du décès ?", type: 'single',
                    answers: [
                        { v: 'criminal', l: "Origine criminelle suspectée", n: "Les constatations orientent vers une origine criminelle." },
                        { v: 'suspicious', l: "Circonstances suspectes", n: "Les circonstances du décès apparaissent suspectes." },
                        { v: 'nonsuspicious', l: "Aucun caractère suspect", n: "Le décès ne présente aucun caractère suspect apparent." },
                        { v: 'pending', l: "À déterminer par autopsie", n: "La cause du décès reste à déterminer par autopsie." }
                    ]
                },
                {
                    id: 'idBody', q: "Identification du défunt ?", type: 'single',
                    answers: [
                        { v: 'id', l: "Identifié (papiers/proches)", n: "Le défunt a pu être identifié." },
                        { v: 'prints', l: "Identifié par empreintes", n: "Le défunt a été identifié par relevé d'empreintes." },
                        { v: 'unknown', l: "Non identifié à ce stade", n: "Le défunt n'a pu être identifié à ce stade." }
                    ]
                },
                {
                    // Suite spécifique : sur une scène de décès, « conduit au poste »
                    // n'a pas de sens — le corps est confié au légiste.
                    id: 'outcome', q: "Quelle suite a été donnée ?", type: 'single',
                    answers: [
                        { v: 'morgue', l: "Corps confié au médecin légiste", n: "Le corps a été confié au médecin légiste." },
                        { v: 'autopsy', l: "Autopsie ordonnée", n: "Une autopsie a été ordonnée afin de déterminer les causes du décès." },
                        { v: 'cid', l: "Enquête confiée au CID", n: "L'enquête a été confiée à la division des crimes majeurs." },
                        { v: 'family', l: "Proches avisés", n: "Les proches du défunt ont été avisés." },
                        { v: 'closed', l: "Aucune suite pénale", n: "Aucune suite pénale n'a été engagée." }
                    ]
                }
            ],
            narrate(a, c) {
                const qs = this.questions, gq = id => qs.find(x => x.id === id), out = [];
                const eng = P(gq('engage'), a, 'engage'), call = P(gq('call'), a, 'call');
                out.push(para(`Mon unité, composée ${c.officers}, ${eng || 'est intervenue sur'}`, call, c.locPhrase + '.'));

                const resp = P(gq('response'), a, 'response');
                const dc = P(gq('discovery'), a, 'discovery');
                out.push(para(resp, dc ? `Une fois sur place, il est apparu que ${dc}.` : null));

                const bs = multiN(gq('bodyState'), a.bodyState);
                const ec = P(gq('ems_confirm'), a, 'ems_confirm');
                out.push(para(bs.length ? `Le corps présentait ${j(bs)}.` : null, ec));

                const sm = (a.sceneMeasures || []).map(v => { const o = gq('sceneMeasures').answers.find(x => x.v === v); return o && o.n; }).filter(Boolean);
                const sp = P(gq('suspicious'), a, 'suspicious');
                out.push(para(sm.length ? `Nous avons procédé ${j(sm.map(aa))}.` : null, sp));

                const ib = P(gq('idBody'), a, 'idBody');
                const outc = P(gq('outcome'), a, 'outcome');
                out.push(para(ib, outc));
                return out.filter(Boolean);
            }
        },

        /* ───────────── 8. INCIDENT SPÉCIAL ───────────── */
        special: {
            label: "Incident spécial",
            icon: "⚠️", codes: ['SPEC'],
            questions: [
                Q.engage(),
                Q.call([
                    { v: 'bomb', l: "Alerte à la bombe", n: "une alerte à la bombe" },
                    { v: 'riot', l: "Émeute / trouble à l'ordre public", n: "une émeute" },
                    { v: 'swatting', l: "Swatting", n: "un appel malveillant de type swatting" },
                    { v: 'barricade', l: "Individu retranché", n: "un individu retranché" },
                    { v: 'jump', l: "Menace de suicide en hauteur", n: "une personne menaçant de se jeter dans le vide" },
                    { v: 'escort', l: "Escorte / convoi sensible", n: "une mission d'escorte" },
                    { v: 'vip', l: "Protection de personnalité", n: "une mission de protection de personnalité" },
                    { v: 'disaster', l: "Catastrophe / sinistre", n: "un sinistre majeur" }
                ]),
                Q.response(),
                {
                    id: 'situation', q: "Situation constatée sur place ?", type: 'single',
                    answers: [
                        { v: 'confirmed', l: "Menace confirmée", n: "la menace signalée était confirmée" },
                        { v: 'hoax', l: "Appel malveillant / canular", n: "il s'agissait d'un appel malveillant" },
                        { v: 'escalating', l: "Situation en dégradation", n: "la situation se dégradait rapidement" },
                        { v: 'contained', l: "Situation contenue", n: "la situation était déjà contenue" },
                        { v: 'crowd', l: "Rassemblement hostile", n: "un rassemblement hostile" }
                    ]
                },
                {
                    id: 'perimeter', q: "Périmètre de sécurité établi ?", type: 'single',
                    answers: [
                        { v: 'small', l: "Restreint (≈ 50 m)", n: "un périmètre de sécurité restreint" },
                        { v: 'medium', l: "Moyen (≈ 100 m)", n: "un périmètre de sécurité de cent mètres" },
                        { v: 'large', l: "Large (≈ 300 m et plus)", n: "un large périmètre de sécurité" },
                        { v: 'none', l: "Aucun", n: null }
                    ]
                },
                {
                    id: 'evac', q: "Évacuation de civils ?", type: 'single',
                    answers: [
                        { v: 'full', l: "Évacuation totale de la zone", n: "L'ensemble de la zone a été évacué." },
                        { v: 'partial', l: "Évacuation partielle", n: "Une évacuation partielle de la zone a été menée." },
                        { v: 'shelter', l: "Confinement sur place", n: "Les civils ont été confinés sur place." },
                        { v: 'none', l: "Aucune évacuation nécessaire", n: null }
                    ]
                },
                {
                    id: 'units', q: "Unités spécialisées engagées ?", type: 'multi', optional: true,
                    answers: [
                        { v: 'swat', l: "SWAT", n: "l'unité SWAT" },
                        { v: 'bomb', l: "Déminage", n: "l'équipe de déminage" },
                        { v: 'negotiator', l: "Négociateur", n: "un négociateur" },
                        { v: 'air', l: "Unité aérienne (ASD)", n: "l'unité aérienne" },
                        { v: 'k9', l: "Unité canine", n: "l'unité canine" },
                        { v: 'ems', l: "Secours médicaux", n: "les secours médicaux" },
                        { v: 'fire', l: "Pompiers", n: "les pompiers" }
                    ]
                },
                {
                    id: 'resolution', q: "Dénouement de l'incident ?", type: 'single',
                    answers: [
                        { v: 'peaceful', l: "Résolution pacifique", n: "L'incident s'est dénoué pacifiquement." },
                        { v: 'surrender', l: "Reddition de l'individu", n: "L'individu s'est rendu aux forces de l'ordre." },
                        { v: 'assault', l: "Assaut des unités spécialisées", n: "Un assaut a été donné par les unités spécialisées." },
                        { v: 'neutralized', l: "Menace neutralisée", n: "La menace a été neutralisée." },
                        { v: 'dispersed', l: "Foule dispersée", n: "Le rassemblement a été dispersé." },
                        { v: 'nothreat', l: "Aucune menace réelle", n: "Aucune menace réelle n'a été caractérisée." }
                    ]
                },
                {
                    id: 'balance', q: "Bilan de l'incident ?", type: 'multi', optional: true,
                    answers: [
                        { v: 'none', l: "Aucun blessé ni dégât", n: "aucun blessé ni dégât", exclusive: true },
                        { v: 'injured', l: "Blessés civils", n: "des blessés parmi les civils" },
                        { v: 'officer', l: "Agent blessé", n: "un agent blessé" },
                        { v: 'damage', l: "Dégâts matériels", n: "des dégâts matériels" },
                        { v: 'arrests', l: "Interpellations multiples", n: "plusieurs interpellations" }
                    ]
                },
                Q.care(), Q.outcome()
            ],
            narrate(a, c) {
                const qs = this.questions, gq = id => qs.find(x => x.id === id), out = [];
                const eng = P(gq('engage'), a, 'engage'), call = P(gq('call'), a, 'call');
                out.push(para(`Mon unité, composée ${c.officers}, ${eng || 'est intervenue sur'}`, call, c.locPhrase + '.'));

                const resp = P(gq('response'), a, 'response');
                const si = P(gq('situation'), a, 'situation');
                out.push(para(resp, si ? `Une fois sur place, nous avons constaté ${que(si)}.` : null));

                const pe = P(gq('perimeter'), a, 'perimeter');
                const ev = P(gq('evac'), a, 'evac');
                const un = (a.units || []).map(v => { const o = gq('units').answers.find(x => x.v === v); return o && o.n; }).filter(Boolean);
                out.push(para(
                    pe ? `Nous avons établi ${pe}.` : null, ev,
                    un.length ? `${cap(j(un))} ${un.length > 1 ? 'ont été engagés' : 'a été engagée'} sur les lieux.` : null
                ));

                const rs = P(gq('resolution'), a, 'resolution');
                const bl = multiN(gq('balance'), a.balance);
                const noBal = onlyExclusive(gq('balance'), a.balance);
                out.push(para(rs, noBal ? `Aucun blessé ni dégât n'est à déplorer.`
                    : (bl.length ? `Le bilan fait état ${de(j(bl))}.` : null)));

                const care = P(gq('care'), a, 'care'), outc = P(gq('outcome'), a, 'outcome');
                out.push(para(care ? `L'individu ${care}.` : null, outc));
                return out.filter(Boolean);
            }
        }
    };

    /* ── moteur ─────────────────────────────────────────────────────── */

    // Questions effectivement visibles compte tenu des réponses déjà données.
    function visibleQuestions(scenKey, answers) {
        const s = SCEN[scenKey];
        if (!s) return [];
        return s.questions.filter(q => !q.when || q.when(answers || {}));
    }

    // Progression : répondues / visibles (les optionnelles ne bloquent pas).
    function progress(scenKey, answers) {
        const vis = visibleQuestions(scenKey, answers);
        const req = vis.filter(q => !q.optional);
        const done = req.filter(q => {
            const v = (answers || {})[q.id];
            return Array.isArray(v) ? v.length > 0 : (v != null && v !== '');
        });
        return { done: done.length, total: req.length, all: vis.length };
    }

    // Récit final : tableau de paragraphes.
    function narrate(scenKey, answers, ctx) {
        const s = SCEN[scenKey];
        if (!s || typeof s.narrate !== 'function') return [];
        try { return s.narrate(answers || {}, ctx || {}); }
        catch (e) { return []; }
    }

    return { SCEN, visibleQuestions, progress, narrate, _j: j };
})();
