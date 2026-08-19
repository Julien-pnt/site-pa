#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
 *  test-scenarios.js — Banc de test du moteur de complétude et de défense.
 *
 *  Vérifie sur trois scénarios que :
 *    · la checklist s'adapte au contexte (les items sans objet sortent
 *      du dénominateur au lieu de pénaliser le score) ;
 *    · un rapport incomplet n'est jamais validé ;
 *    · la fiche de défense cite les bons articles.
 *
 *  Usage : node tools/test-scenarios.js
 * ═══════════════════════════════════════════════════════════════════ */
'use strict';

const RULES = require('../legal-rules.js');
const DEFENSE = require('../defense.js');

let pass = 0, fail = 0;
const failures = [];

function check(scenario, label, cond, detail) {
    if (cond) { pass++; return; }
    fail++;
    failures.push('  ✗ [' + scenario + '] ' + label + (detail ? '\n      → ' + detail : ''));
}

// ═══════════════════════════════════════════════════════════════════════
// Contexte de base — tous les champs, à remplir par scénario.
// ═══════════════════════════════════════════════════════════════════════
function baseCtx(over) {
    const c = {
        module: 'standard',
        date: '19/08/2026', time: '01h35',
        secteur: '', lieu: '',
        agents: [],
        motif: '',
        denouement: '',
        suspect: { nom: '', prenom: '', dob: '', sexe: '' },
        hasVehicle: false,
        verifPlaque: '', verifCasier: '',
        pursuit: false, heureFinPoursuite: '', lieuFinPoursuite: '',
        collision: false,
        cuffed: false,
        force: { used: false, weapon: false, moyens: [], justification: '', sommation: '', menace: '' },
        injured: false, injuredByOfficer: false,
        medical: { cause: '', nature: '', heureEvac: '', etablissement: '', heureSortie: '', rapport12h: '' },
        miranda: { heure: '', reaction: '' },
        lawyer: { requested: false, heureContact: '', heureArrivee: '' },
        transport: { heure: '', destination: '' },
        fouille: { effectuee: false, base: '', objets: [] },
        charges: [],
        heureArrestation: '',
        heurePresentationProcureur: '',
        chronoStamps: [],
        reportText: ''
    };
    return Object.assign(c, over || {});
}

// Recalcule les horodatages du déroulé à partir des heures renseignées.
function withStamps(ctx) {
    const s = [];
    const add = (label, h) => { if (RULES.parseHeure(h) !== null) s.push({ label, heure: h }); };
    add('Faits', ctx.time);
    add('Fin de poursuite', ctx.heureFinPoursuite);
    add('Interpellation', ctx.heureArrestation);
    add('Évacuation', ctx.medical.heureEvac);
    add('Sortie médicale', ctx.medical.heureSortie);
    add('Notification des droits', ctx.miranda.heure);
    add('Contact avocat', ctx.lawyer.heureContact);
    add('Transport', ctx.transport.heure);
    ctx.chronoStamps = s;
    return ctx;
}

const AGENTS = [
    { grade: 'Detective III', name: 'RHYNE Cassius' },
    { grade: 'Police Officer II', name: 'BISHOP Nick' }
];

// ═══════════════════════════════════════════════════════════════════════
// SCÉNARIO 1 — Interpellation simple, sans force ni blessé ni avocat.
// Attendu : les items force / médical / avocat / poursuite / plaque
// sortent du dénominateur. Le rapport complet doit être validable.
// ═══════════════════════════════════════════════════════════════════════
function scenario1() {
    const NAME = 'S1 interpellation simple';
    const ctx = withStamps(baseCtx({
        secteur: 'Mirror Park', lieu: 'Mirror Park Blvd',
        agents: AGENTS,
        motif: 'un individu en état d\'ivresse manifeste sur la voie publique',
        denouement: 'individu maîtrisé sans résistance et menotté',
        suspect: { nom: 'JOHNSON', prenom: 'Marcus', dob: '15/03/1992', sexe: 'Masculin' },
        cuffed: true,
        verifCasier: 'Effectuée — aucun antécédent',
        miranda: { heure: '01h42', reaction: 'A déclaré les avoir compris' },
        transport: { heure: '01h50', destination: 'poste de Mission Row' },
        fouille: { effectuee: true, base: 'incidente à l\'arrestation', objets: [] },
        charges: [{ name: 'Ivresse sur la voie publique', categorie: 'Contravention', articles: ['penal:431-1'] }],
        heureArrestation: '01h38',
        heurePresentationProcureur: '02h00'
    }));

    const ev = RULES.evaluate(ctx);

    const naIds = ev.items.filter(i => i.status === 'na').map(i => i.id);
    check(NAME, 'les items médicaux sortent du calcul',
        naIds.includes('blessure_nature') && naIds.includes('evac_heure') && naIds.includes('sortie_medicale'),
        'na = ' + naIds.join(', '));
    check(NAME, 'les items usage de la force sortent du calcul',
        naIds.includes('force_justification') && naIds.includes('force_cas_legal') && naIds.includes('force_sommation'));
    check(NAME, 'les items avocat sortent du calcul',
        naIds.includes('avocat_contact') && naIds.includes('avocat_arrivee'));
    check(NAME, 'l\'item plaque sort du calcul (aucun véhicule)', naIds.includes('verif_plaque'));
    check(NAME, 'l\'item fin de poursuite sort du calcul', naIds.includes('poursuite_fin'));
    check(NAME, 'rapport complet validé (score ≥ 90 %)', ev.valid,
        'score = ' + ev.percent + ' %, manquants = ' + ev.missing.map(m => m.id).join(', '));

    // Le même dossier amputé de la notification des droits doit être refusé.
    const ctxKo = withStamps(baseCtx(Object.assign({}, ctx, {
        miranda: { heure: '', reaction: '' }
    })));
    const evKo = RULES.evaluate(ctxKo);
    check(NAME, 'sans notification des droits, le rapport est refusé', !evKo.valid,
        'score = ' + evKo.percent + ' %');

    const audit = RULES.auditProcedure(ctx);
    const flagrance = audit.find(a => a.id === 'flagrance_20min');
    check(NAME, 'délai de flagrance conforme (3 min)', flagrance.status === 'ok', flagrance.detail);

    return { ctx, ev };
}

// ═══════════════════════════════════════════════════════════════════════
// SCÉNARIO 2 — Poursuite avec collision, aucun blessé.
// Attendu : items poursuite + plaque actifs, items médicaux toujours
// hors calcul. Dépassement du délai de flagrance signalé.
// ═══════════════════════════════════════════════════════════════════════
function scenario2() {
    const NAME = 'S2 poursuite + collision';
    const ctx = withStamps(baseCtx({
        secteur: 'Wardog', lieu: 'El Rancho Blvd / Dry Dock St',
        agents: AGENTS,
        motif: 'un véhicule circulant à une vitesse manifestement excessive en agglomération',
        denouement: 'véhicule immobilisé par barrage, occupants interpellés sur place',
        suspect: { nom: 'ZAYRON', prenom: 'Mosley', dob: '02/11/1988', sexe: 'Masculin' },
        hasVehicle: true,
        verifPlaque: 'Effectuée — véhicule n\'appartenant pas à l\'intéressé',
        verifCasier: 'Effectuée — antécédents relevés',
        pursuit: true, heureFinPoursuite: '01h44', lieuFinPoursuite: 'intersection El Rancho Blvd / Dry Dock St',
        collision: true,
        cuffed: true,
        force: {
            used: true, weapon: false, moyens: ['barrage véhicule', 'maîtrise physique'],
            justification: 'la fuite persistante du conducteur malgré les injonctions',
            sommation: '', menace: ''
        },
        miranda: { heure: '01h50', reaction: 'A déclaré les avoir compris' },
        transport: { heure: '01h58', destination: 'poste de Mission Row' },
        fouille: { effectuee: true, base: 'incidente à l\'arrestation', objets: ['un téléphone', 'un jeu de clés'] },
        charges: [
            { name: 'Vitesse excessive', categorie: 'Contravention', articles: ['penal:607'] },
            { name: 'Refus d\'obtempérer', categorie: 'Délit mineur', articles: ['penal:431-7'] }
        ],
        heureArrestation: '01h46',
        heurePresentationProcureur: '02h10'
    }));

    const ev = RULES.evaluate(ctx);
    const naIds = ev.items.filter(i => i.status === 'na').map(i => i.id);

    check(NAME, 'les items médicaux restent hors calcul (aucun blessé)',
        naIds.includes('evac_heure') && naIds.includes('sortie_medicale') && naIds.includes('rapport_12h'));
    check(NAME, 'l\'item fin de poursuite est actif', !naIds.includes('poursuite_fin'));
    check(NAME, 'l\'item vérification plaque est actif', !naIds.includes('verif_plaque'));
    check(NAME, 'la justification de la force est requise', !naIds.includes('force_justification'));
    check(NAME, 'le cas légal Art. 123 reste hors calcul (pas d\'arme à feu)', naIds.includes('force_cas_legal'));
    check(NAME, 'rapport complet validé', ev.valid,
        'score = ' + ev.percent + ' %, manquants = ' + ev.missing.map(m => m.id).join(', '));

    const audit = RULES.auditProcedure(ctx);
    const flagrance = audit.find(a => a.id === 'flagrance_20min');
    check(NAME, 'dépassement du délai de flagrance détecté (11 min → conforme)',
        flagrance.status === 'ok', flagrance.detail);

    const proc = audit.find(a => a.id === 'presentation_procureur');
    check(NAME, 'délai procureur conforme pour un délit mineur (24 min ≤ 30)',
        proc.status === 'ok', proc.detail);

    // Un dossier identique mais présenté 50 min après doit être signalé.
    const ctxLate = withStamps(baseCtx(Object.assign({}, ctx, { heurePresentationProcureur: '02h40' })));
    const procLate = RULES.auditProcedure(ctxLate).find(a => a.id === 'presentation_procureur');
    check(NAME, 'dépassement du délai procureur détecté (54 min > 30)',
        procLate.status === 'fail', procLate.detail);

    // Point d'attaque propre au refus d'obtempérer (sommation, Art. 431-7).
    const doc = DEFENSE.buildDefenseDoc(ctx, ev);
    const hasSommation = doc.groups.some(g => g.items.some(i => /sommation claire/i.test(i.question)));
    check(NAME, 'la défense soulève la sommation exigée par l\'Art. 431-7', hasSommation);

    return { ctx, ev, doc };
}

// ═══════════════════════════════════════════════════════════════════════
// SCÉNARIO 3 — Usage d'arme, blessure imputable aux agents, avocat.
// C'est le scénario de l'exemple de référence.
// Attendu : tous les items conditionnels actifs, Art. 123 et 2-4-2
// mobilisés, et refus de validation si la sortie médicale manque.
// ═══════════════════════════════════════════════════════════════════════
function scenario3() {
    const NAME = 'S3 usage d\'arme + blessé + avocat';
    const full = {
        secteur: 'Wardog', lieu: 'El Rancho Blvd / Dry Dock St',
        agents: AGENTS,
        motif: 'un véhicule circulant à une vitesse manifestement excessive en agglomération',
        denouement: 'véhicule immobilisé par collision avec le véhicule de service, conducteur neutralisé',
        suspect: { nom: 'ZAYRON', prenom: 'Mosley', dob: '02/11/1988', sexe: 'Masculin' },
        hasVehicle: true,
        verifPlaque: 'Effectuée — véhicule n\'appartenant pas à l\'intéressé',
        verifCasier: 'Effectuée — antécédents relevés',
        pursuit: true, heureFinPoursuite: '01h44', lieuFinPoursuite: 'intersection El Rancho Blvd / Dry Dock St',
        collision: true,
        cuffed: true,
        force: {
            used: true, weapon: true, moyens: ['arme de service'],
            justification: 'la tentative de fuite du conducteur, armé, après la collision',
            sommation: 'Oui — avertissement clair adressé avant l\'usage de l\'arme',
            menace: 'Fuite d\'une personne représentant une menace imminente de mort ou de blessures graves (Art. 123-3)'
        },
        injured: true, injuredByOfficer: true,
        medical: {
            cause: 'Action directe des forces de l\'ordre',
            nature: 'plaie par balle au bras droit',
            heureEvac: '01h49', etablissement: 'MRSA',
            heureSortie: '02h10', rapport12h: 'Rédigé et transmis'
        },
        miranda: { heure: '02h15', reaction: 'A déclaré les avoir compris et a sollicité l\'assistance d\'un avocat' },
        lawyer: { requested: true, heureContact: '02h41', heureArrivee: 'XXhXX' },
        transport: { heure: '02h20', destination: 'poste de Mission Row' },
        fouille: { effectuee: true, base: 'incidente à l\'arrestation', objets: ['une arme de poing'] },
        charges: [
            { name: 'Vitesse excessive', categorie: 'Contravention', articles: ['penal:607'] },
            { name: 'Refus d\'obtempérer', categorie: 'Délit mineur', articles: ['penal:431-7'] },
            { name: 'Port d\'arme illégale', categorie: 'Délit majeur', articles: ['penal:241-1'] }
        ],
        heureArrestation: '01h46',
        heurePresentationProcureur: '02h25'
    };

    const ctx = withStamps(baseCtx(full));
    const ev = RULES.evaluate(ctx);
    const naIds = ev.items.filter(i => i.status === 'na').map(i => i.id);

    check(NAME, 'tous les items conditionnels sont actifs',
        !naIds.includes('force_cas_legal') && !naIds.includes('force_sommation')
        && !naIds.includes('evac_heure') && !naIds.includes('sortie_medicale')
        && !naIds.includes('rapport_12h') && !naIds.includes('avocat_contact'),
        'na = ' + naIds.join(', '));
    check(NAME, 'rapport complet validé', ev.valid,
        'score = ' + ev.percent + ' %, manquants = ' + ev.missing.map(m => m.id).join(', '));

    // ─── Sans heure de sortie médicale → doit être refusé ───
    const ctxKo = withStamps(baseCtx(Object.assign({}, full, {
        medical: Object.assign({}, full.medical, { heureSortie: '' })
    })));
    const evKo = RULES.evaluate(ctxKo);
    check(NAME, 'sans heure de sortie médicale, le rapport est refusé', !evKo.valid,
        'score = ' + evKo.percent + ' %');
    check(NAME, 'l\'élément manquant est bien identifié',
        evKo.missing.some(m => m.id === 'sortie_medicale'));
    // Le score reste au-dessus du seuil : c'est le caractère critique de
    // l'élément, et non le pourcentage, qui bloque la validation.
    check(NAME, 'le refus vient du caractère critique de l\'élément, pas du score',
        evKo.scoreOk && evKo.criticalMissing.some(m => m.id === 'sortie_medicale'),
        'score ' + evKo.percent + ' % (seuil atteint : ' + evKo.scoreOk + '), critiques manquants : '
        + evKo.criticalMissing.map(m => m.id).join(', '));

    // ─── Audit ───
    const audit = RULES.auditProcedure(ctx);
    const arme = audit.find(a => a.id === 'arme_cas_legal');
    check(NAME, 'le cas légal Art. 123 est reconnu conforme', arme.status === 'ok', arme.detail);

    const r12 = audit.find(a => a.id === 'rapport_incident_12h');
    check(NAME, 'le rapport d\'incident Art. 2-4-2 est vérifié', r12.status === 'ok', r12.detail);

    const surv = audit.find(a => a.id === 'medical_surveillance_1h');
    check(NAME, 'la surveillance médicale (21 min) est conforme à l\'Art. 2-4-4',
        surv.status === 'ok', surv.detail);

    // 26 min : au-delà du repère de diligence de 15 min de l'Art. 5-3-1,
    // sans atteindre l'irrégularité franche. Doit être signalé « à justifier ».
    const av = audit.find(a => a.id === 'avocat_delai');
    check(NAME, 'le délai de contact avocat (26 min) est signalé à justifier',
        av.status === 'warn', av.detail);

    const ctxAvLate = withStamps(baseCtx(Object.assign({}, full, {
        lawyer: Object.assign({}, full.lawyer, { heureContact: '03h05' })
    })));
    const avLate = RULES.auditProcedure(ctxAvLate).find(a => a.id === 'avocat_delai');
    check(NAME, 'un contact avocat à 50 min est signalé bloquant',
        avLate.status === 'fail', avLate.detail);

    // ─── Sans cas légal invoqué → l'usage de l'arme doit être bloquant ───
    const ctxNoCase = withStamps(baseCtx(Object.assign({}, full, {
        force: Object.assign({}, full.force, { menace: 'Aucun de ces cas' })
    })));
    const armeKo = RULES.auditProcedure(ctxNoCase).find(a => a.id === 'arme_cas_legal');
    check(NAME, 'hors des cinq cas de l\'Art. 123, l\'usage de l\'arme est signalé bloquant',
        armeKo.status === 'fail', armeKo.detail);

    // ─── Document de défense ───
    const doc = DEFENSE.buildDefenseDoc(ctx, ev);
    const txt = DEFENSE.renderText(doc);

    check(NAME, 'la fiche de défense cite l\'Art. 123', /Art\. 123/.test(txt));
    check(NAME, 'la fiche de défense cite l\'Art. 2-4-2', /Art\. 2-4-2/.test(txt));
    check(NAME, 'la fiche de défense cite l\'Art. 5-3-1', /Art\. 5-3-1/.test(txt));
    check(NAME, 'la fiche contient le tableau des délais', /RESPECT DES DÉLAIS/.test(txt));
    check(NAME, 'la fiche contient les points d\'attaque', /POINTS D'ATTAQUE ANTICIPÉS/.test(txt));
    check(NAME, 'la fiche contient une section à corriger', /À CORRIGER AVANT/.test(txt));
    check(NAME, 'le délai avocat apparaît comme à justifier dans le tableau',
        doc.delays.some(d => /contact avocat/i.test(d.label) && d.statut === 'à justifier'),
        JSON.stringify(doc.delays.find(d => /contact avocat/i.test(d.label))));
    check(NAME, 'la fiche est substantielle (> 2000 caractères)', txt.length > 2000, txt.length + ' caractères');
    check(NAME, 'aucun code radio ne subsiste', !/\b10-\d{1,2}\b/.test(txt));

    return { ctx, ev, doc, txt };
}

// ═══════════════════════════════════════════════════════════════════════
// EXÉCUTION
// ═══════════════════════════════════════════════════════════════════════
console.log('');
console.log('═══ BANC DE TEST — complétude & défense ═══');
console.log('');

const s1 = scenario1();
const s2 = scenario2();
const s3 = scenario3();

// ═══════════════════════════════════════════════════════════════════════
// ANGLES MORTS — omissions qui désactivaient silencieusement un contrôle.
// Un élément dont la valeur conditionne l'applicabilité d'une obligation
// légale doit être critique, sinon l'omettre fait disparaître l'obligation
// du contrôle au lieu de la signaler.
// ═══════════════════════════════════════════════════════════════════════
function anglesMorts() {
    const NAME = 'Angles morts';
    const base = {
        secteur: 'Wardog', lieu: 'El Rancho Blvd',
        agents: AGENTS, motif: 'un refus d\'obtempérer', denouement: 'individu maîtrisé',
        suspect: { nom: 'ZAYRON', prenom: 'Mosley', dob: '02/11/1988', sexe: 'Masculin' },
        cuffed: true, verifCasier: 'Effectuée — aucun antécédent',
        miranda: { heure: '02h15', reaction: 'A déclaré les avoir compris' },
        transport: { heure: '02h20', destination: 'poste de Mission Row' },
        fouille: { effectuee: true, base: 'incidente', objets: [] },
        charges: [{ name: 'Rébellion', categorie: 'Délit majeur', articles: ['penal:433-2'] }],
        heureArrestation: '01h46', heurePresentationProcureur: '02h25'
    };

    // Blessure documentée mais origine laissée vide : sans criticité, le
    // rapport passait à 94 % et l'obligation de l'Art. 2-4-2 devenait « na ».
    const sansCause = withStamps(baseCtx(Object.assign({}, base, {
        injured: true, injuredByOfficer: false,
        medical: {
            cause: '', nature: 'plaie par balle au bras droit',
            heureEvac: '01h49', etablissement: 'MRSA', heureSortie: '02h10', rapport12h: ''
        }
    })));
    const evCause = RULES.evaluate(sansCause);
    check(NAME, 'origine de blessure omise → rapport refusé', !evCause.valid,
        'score ' + evCause.percent + ' %');
    check(NAME, 'l\'omission est signalée comme critique',
        evCause.criticalMissing.some(m => m.id === 'blessure_nature'));

    // Usage de la force sans justification : l'Art. 121 subordonne tout
    // usage à la nécessité et à la proportionnalité.
    const sansJustif = withStamps(baseCtx(Object.assign({}, base, {
        force: { used: true, weapon: false, moyens: ['maîtrise physique'], justification: '', sommation: '', menace: '' }
    })));
    const evJustif = RULES.evaluate(sansJustif);
    check(NAME, 'force employée sans justification → rapport refusé', !evJustif.valid,
        'score ' + evJustif.percent + ' %');
    check(NAME, 'la justification manquante est critique',
        evJustif.criticalMissing.some(m => m.id === 'force_justification'));

    // L'article homonyme récupéré doit être citable sous son vrai numéro.
    check(NAME, 'Art. 629 « Survol d\'une zone prohibée » récupéré',
        /Art\. 629 .*Survol/.test(RULES.citation('penal:629-bis')),
        RULES.citation('penal:629-bis'));
}

// ═══════════════════════════════════════════════════════════════════════
// PALPATION DE SÉCURITÉ vs FOUILLE
// Deux chapitres distincts du Titre IV. Le régime retenu doit changer les
// articles cités et les points d'attaque soulevés.
// ═══════════════════════════════════════════════════════════════════════
function palpationVsFouille() {
    const NAME = 'Palpation vs fouille';
    const commun = {
        secteur: 'Vespucci', lieu: 'Playa Vista',
        agents: AGENTS, motif: 'une demande de renfort', denouement: 'individus interpellés',
        suspect: { nom: 'LOTARE', prenom: 'Lucie', dob: '14/06/1994', sexe: 'Féminin' },
        cuffed: true, verifCasier: 'Effectuée — aucun antécédent',
        miranda: { heure: '23h32', reaction: 'A déclaré les avoir compris' },
        transport: { heure: '23h28', destination: 'poste de Vespucci' },
        charges: [{ name: "Port d'arme illégale", categorie: 'Délit majeur', articles: ['penal:241-1'] }],
        heureArrestation: '23h25', heurePresentationProcureur: '23h50'
    };

    const base = { effectuee: true, base: '', objets: ['un pistolet Glock 17 modifié'], auteur: 'le Police Officer II Jesse McCoy' };

    const palpation = withStamps(baseCtx(Object.assign({}, commun, {
        fouille: Object.assign({}, base, {
            nature: 'Palpation de sécurité',
            motifPalpation: "Individu signalé comme armé",
            discretionPalpation: "Réalisée à l'abri du regard du public",
            motifFouille: '', memeSexeFouille: ''
        })
    })));
    const fouille = withStamps(baseCtx(Object.assign({}, commun, {
        fouille: Object.assign({}, base, {
            nature: 'Fouille',
            motifFouille: 'Suspicion raisonnable de détention de preuves',
            memeSexeFouille: 'Agent du même sexe que la personne fouillée',
            motifPalpation: '', discretionPalpation: ''
        })
    })));

    const auditP = RULES.auditProcedure(palpation);
    const auditF = RULES.auditProcedure(fouille);
    const actifs = a => a.filter(r => r.status !== 'na').map(r => r.id);

    check(NAME, 'la palpation déclenche les règles du chapitre 2',
        actifs(auditP).includes('palpation_conditions') && actifs(auditP).includes('palpation_discretion'),
        actifs(auditP).join(', '));
    check(NAME, 'la palpation ne déclenche pas les règles de la fouille',
        !actifs(auditP).includes('fouille_conditions') && !actifs(auditP).includes('fouille_meme_sexe'));
    check(NAME, "la palpation écarte l'antériorité des droits (propre à la fouille)",
        auditP.find(r => r.id === 'droits_avant_fouille').status === 'na');

    check(NAME, 'la fouille déclenche les règles du chapitre 1',
        actifs(auditF).includes('fouille_conditions') && actifs(auditF).includes('fouille_meme_sexe'));
    check(NAME, 'la fouille ne déclenche pas les règles de la palpation',
        !actifs(auditF).includes('palpation_conditions') && !actifs(auditF).includes('palpation_discretion'));
    check(NAME, "la fouille impose l'antériorité des droits",
        auditF.find(r => r.id === 'droits_avant_fouille').status !== 'na');

    // Les articles cités doivent différer.
    const artP = new Set(); auditP.filter(r => r.status !== 'na').forEach(r => (r.articles || []).forEach(a => artP.add(a)));
    const artF = new Set(); auditF.filter(r => r.status !== 'na').forEach(r => (r.articles || []).forEach(a => artF.add(a)));
    check(NAME, 'la palpation cite les Art. 4-2-x', [...artP].some(a => /4-2-/.test(a)), [...artP].join(' '));
    check(NAME, 'la fouille cite les Art. 4-1-x', [...artF].some(a => /4-1-/.test(a)), [...artF].join(' '));
    check(NAME, 'la palpation ne cite pas les conditions de la fouille', ![...artP].includes('proc:4-1-2'));
    check(NAME, 'la fouille ne cite pas les conditions de la palpation', ![...artF].includes('proc:4-2-2'));

    // Les deux motifs contraires au code doivent être signalés.
    const palpSysteme = withStamps(baseCtx(Object.assign({}, commun, {
        fouille: Object.assign({}, base, {
            nature: 'Palpation de sécurité',
            motifPalpation: 'Aucun motif particulier — palpation systématique'
        })
    })));
    const rSys = RULES.auditProcedure(palpSysteme).find(r => r.id === 'palpation_conditions');
    check(NAME, "la palpation systématique est signalée (Art. 4-2-1)", rSys.status === 'fail', rSys.detail);

    const fouilleAntec = withStamps(baseCtx(Object.assign({}, commun, {
        fouille: Object.assign({}, base, {
            nature: 'Fouille',
            motifFouille: "Antécédents judiciaires de l'individu"
        })
    })));
    const rAnt = RULES.auditProcedure(fouilleAntec).find(r => r.id === 'fouille_conditions');
    check(NAME, 'la fouille fondée sur les antécédents est signalée (Art. 4-1-3)',
        rAnt.status === 'fail', rAnt.detail);

    // Le motif manquant bloque la validation, quel que soit le régime.
    const sansMotif = withStamps(baseCtx(Object.assign({}, commun, {
        fouille: Object.assign({}, base, { nature: 'Fouille', motifFouille: '' })
    })));
    const evSans = RULES.evaluate(sansMotif);
    check(NAME, 'motif de contrôle manquant → rapport refusé', !evSans.valid,
        'score ' + evSans.percent + ' %');
    check(NAME, 'le motif manquant est critique',
        evSans.criticalMissing.some(m => m.id === 'controle_motif'));

    // La fiche de défense doit refléter la distinction.
    const docP = DEFENSE.renderText(DEFENSE.buildDefenseDoc(palpation, RULES.evaluate(palpation)));
    const docF = DEFENSE.renderText(DEFENSE.buildDefenseDoc(fouille, RULES.evaluate(fouille)));
    check(NAME, 'la fiche palpation cite l\'Art. 4-2-3', /Art\. 4-2-3/.test(docP));
    check(NAME, 'la fiche fouille cite l\'Art. 4-1-2', /Art\. 4-1-2/.test(docF));
    check(NAME, 'la fiche palpation ne cite pas l\'Art. 4-1-2', !/Art\. 4-1-2/.test(docP));
    check(NAME, 'la fiche fouille ne cite pas l\'Art. 4-2-3', !/Art\. 4-2-3/.test(docF));
}

anglesMorts();
palpationVsFouille();

// ─── Couverture par catégorie du plan ───
// Les 10 catégories du cahier des charges, chacune adossée aux items de
// checklist qui la matérialisent. Une catégorie sans item applicable est
// « sans objet » pour le scénario et sort du calcul.
const CATEGORIES = [
    ['Date, heure, secteur et lieu', ['date_heure', 'secteur_lieu']],
    ['Identité et grade des agents par unité', ['unites']],
    ['Motif initial du contrôle', ['motif_initial']],
    ['Déroulé chronologique horodaté', ['chronologie', 'heure_arrestation', 'poursuite_fin']],
    ['Dénouement de l\'interpellation', ['denouement', 'force_justification', 'force_cas_legal', 'force_sommation']],
    ['Identité du suspect et vérifications', ['identite_suspect', 'dob_suspect', 'verifications', 'verif_plaque', 'fouille_resultat', 'charges']],
    ['Blessures, secours, évacuation, sortie', ['blessure_nature', 'evac_heure', 'sortie_medicale', 'rapport_12h']],
    ['Notification des droits et réaction', ['droits_heure', 'droits_reaction']],
    ['Heure de transport et destination', ['transport']],
    ['Assistance d\'un avocat', ['avocat_contact', 'avocat_arrivee']]
];

function couverture(nom, ev) {
    console.log('── ' + nom + ' — complétude globale ' + ev.percent + ' % '
        + (ev.valid ? '(validé)' : '(REFUSÉ)'));
    let couvertes = 0, applicables = 0;
    CATEGORIES.forEach(([label, ids]) => {
        const items = ev.items.filter(i => ids.indexOf(i.id) !== -1);
        const actifs = items.filter(i => i.status !== 'na');
        if (!actifs.length) { console.log('   ·  ' + label + ' — sans objet'); return; }
        applicables++;
        const ok = actifs.filter(i => i.status === 'ok').length;
        const complet = ok === actifs.length;
        if (complet) couvertes++;
        console.log('   ' + (complet ? '✓' : '✗') + '  ' + label + '  (' + ok + '/' + actifs.length + ')');
    });
    const pct = Math.round(couvertes / applicables * 100);
    console.log('   → ' + couvertes + '/' + applicables + ' catégories applicables couvertes = ' + pct + ' %');
    console.log('');
    return pct;
}

console.log('');
console.log('═══ COUVERTURE PAR CATÉGORIE DU PLAN ═══');
console.log('');
const pct1 = couverture('S1 interpellation simple', RULES.evaluate(s1.ctx));
const pct2 = couverture('S2 poursuite avec collision', RULES.evaluate(s2.ctx));
const pct3 = couverture('S3 usage d\'arme', RULES.evaluate(s3.ctx));

check('Couverture', 'S1 ≥ 90 % des catégories', pct1 >= 90, pct1 + ' %');
check('Couverture', 'S2 ≥ 90 % des catégories', pct2 >= 90, pct2 + ' %');
check('Couverture', 'S3 ≥ 90 % des catégories', pct3 >= 90, pct3 + ' %');

console.log('Résultat : ' + pass + ' assertion(s) OK, ' + fail + ' échec(s).');
if (failures.length) {
    console.log('');
    failures.forEach(f => console.log(f));
}
console.log('');

if (process.argv.includes('--print')) {
    console.log('─── Exemple de fiche produite (scénario 3) ───');
    console.log('');
    console.log(s3.txt);
}

process.exit(fail === 0 ? 0 : 1);
