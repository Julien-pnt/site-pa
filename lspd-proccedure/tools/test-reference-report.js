#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
 *  test-reference-report.js — Fidélité au modèle de rapport du DOJ.
 *
 *  Pilote l'application dans Chrome headless, saisit exactement les données
 *  du rapport de référence, puis vérifie que le texte produit conserve la
 *  structure du modèle (8 paragraphes, mêmes temps forts dans le même
 *  ordre) et n'omet aucune des informations qu'il contient.
 *
 *  Le rapport généré peut être PLUS riche que le modèle — il porte des
 *  mentions exigées par le code que le modèle n'a pas (justification de
 *  l'usage de la force, résultats de fouille) — mais jamais plus pauvre.
 *
 *  Usage :  node tools/test-reference-report.js [--print]
 *  Requiert Chrome ou Edge installé.
 * ═══════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const HARNESS = path.join(ROOT, '_test-harness.html');

// ─── Localisation du navigateur ───
const CANDIDATS = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];
const BROWSER = CANDIDATS.find(p => fs.existsSync(p));
if (!BROWSER) {
    console.error('✗ Aucun navigateur Chromium trouvé — test ignoré.');
    process.exit(0);
}

// ─── Données du rapport de référence ───
const DONNEES = {
    agents: [
        ['Detective III', 'RHYNE Cassius', '1001'],
        ['Police Officer II', 'BISHOP Nick', '1002']
    ],
    datetime: '2026-08-19T01:35',
    lieu: 'intersection El Rancho Boulevard / Dry Dock Street',
    heureArrestation: '01h46',
    suspect: ['ZAYRON', 'Mosley', '02/11/1988'],
    conformite: {
        origineIntervention: 'Constatation directe en patrouille',
        constatationInitiale: "la présence d'un véhicule circulant à une vitesse manifestement excessive et inadaptée à la circulation en agglomération",
        uniteRenfort: 'du Detective Jae Seung KIM et du Police Officer II Ignacio MENDES',
        manoeuvreInterception: 'le Detective KIM a positionné son véhicule de service en travers de la voie',
        issuePoursuite: 'Collision du véhicule suspect avec le véhicule de service',
        secteur: 'Wardog',
        heureFinPoursuite: '01h44',
        lieuFinPoursuite: "l'intersection entre El Rancho Boulevard et Dry Dock Street",
        justificationForce: 'la fuite du conducteur après la collision',
        menaceInvoquee: "Fuite d'une personne représentant une menace imminente de mort ou de blessures graves (Art. 123-3)",
        sommation: "Oui — avertissement clair adressé avant l'usage de l'arme",
        causeBlessure: "Action directe des forces de l'ordre",
        natureBlessure: 'des blessures au bras droit suite à un coup de feu tiré par un officier après la collision',
        heureEvacuation: '01h49',
        etablissement: 'MRSA',
        heureSortieMedicale: '02h10',
        rapportIncident12h: 'Rédigé et transmis',
        heureDroits: '02h15',
        reactionDroits: "A déclaré les avoir compris et a expressément sollicité l'assistance d'un avocat",
        heureContactAvocat: '02h41',
        heureArriveeAvocat: 'XXhXX',
        verifPlaque: "Effectuée — véhicule n'appartenant pas à l'intéressé",
        verifCasier: 'Effectuée — antécédents relevés',
        heureTransport: '02h20',
        destinationTransport: 'poste',
        heurePresentationProcureur: '02h30'
    }
};

// ─── Informations que le modèle contient et que le rapport doit reprendre ───
const ATTENDUS = [
    ['date et heure', /19\/08\/2026.*01h35/],
    ['composition de la 1re unité', /Detective III .*RHYNE.*Police Officer II .*BISHOP/],
    ['patrouille de routine', /effectuait une patrouille de routine/],
    ['constatation de la vitesse', /vitesse manifestement excessive et inadapt/],
    ['prise en chasse', /prendre le véhicule en chasse/],
    ['renfort sollicité par radio', /sollicité du renfort par radio/],
    ['composition de la 2e unité', /KIM.*MENDES/],
    ['secteur', /secteur de Wardog/],
    ['intersection de fin de poursuite', /El Rancho Boulevard et Dry Dock Street/],
    ['manœuvre de blocage', /en travers de la voie/],
    ['collision', /entré en collision avec le véhicule de service/],
    ['immobilisation définitive', /immobilisation définitive/],
    ['interpellation des occupants', /occupants ont aussitôt été interpellés/],
    ['identification du conducteur', /Monsieur Mosley Zayron a été identifié/],
    ['vérification de la plaque', /vérification effectuée sur la plaque/],
    ['véhicule non détenu par le suspect', /n'appartenait pas à l'intéressé/],
    ['nature de la blessure', /blessures au bras droit/],
    ['origine — coup de feu', /coup de feu tiré par un officier/],
    ['intervention du LSFD', /services du LSFD/],
    ['évacuation MRSA 01h49', /MRSA à 01h49/],
    ['sortie médicale 02h10', /sortie a été prononcée à 02h10/],
    ['autorisation du corps médical', /autorisation expresse du corps médical/],
    ['reprise en charge', /rendus sur place afin de reprendre en charge/],
    ['notification des droits 02h15', /droits lui ont été notifiés à 02h15/],
    ['droits compris', /déclaré les avoir compris/],
    ['avocat sollicité', /sollicité l'assistance d'un avocat/],
    ['transport au poste', /transporté vers le poste|transporté au poste/],
    ['contact avocat 02h41', /prise de contact : 0?2h41/],
    ['arrivée avocat XXhXX', /Heure d'arrivée : XXhXX/]
];

const PARAGRAPHES_MODELE = 8;

// ─── Pilote injecté dans la page ───
function pilote() {
    return `(function () {
    var out = [];
    function $(s) { return document.querySelector(s); }
    function all(s) { return [].slice.call(document.querySelectorAll(s)); }
    function set(sel, v) {
        var el = $(sel); if (!el) { out.push('CHAMP ABSENT ' + sel); return; }
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function tag(container, t) {
        var b = all(container + ' .tag-btn').filter(function (x) { return x.dataset.tag === t; })[0];
        if (b) b.click(); else out.push('TAG ABSENT ' + t);
    }
    var D = ${JSON.stringify(DONNEES)};

    function run() {
        $('.nav-link[data-module="dashboard"]').click();
        D.agents.forEach(function (a) {
            set('#rosterNewGrade', a[0]); set('#rosterNewName', a[1]); set('#rosterNewMatricule', a[2]);
            $('#btnAddAgent').click();
        });
        $('.nav-link[data-module="patrol"]').click();

        var vus = {};
        all('#patrolRoster .roster-grid .tag-btn').filter(function (o) {
            var t = o.textContent.trim();
            if (!/RHYNE Cassius|BISHOP Nick/.test(t)) return false;
            var k = t.replace(/\\s*\\d+\\s*$/, '');
            if (vus[k]) return false; vus[k] = 1; return true;
        }).forEach(function (o) { o.click(); });

        set('#patrolDatetime', D.datetime);
        set('#patrolLocation', D.lieu);
        set('#patrolArrestTime', D.heureArrestation);
        tag('#tenCodeSelector', '10-56');
        set('#patrolVehicleModel', 'berline');
        set('#patrolVehiclePlate', 'INCONNUE');
        tag('#patrolVehicleState', 'Accidenté');

        var c = $('#patrolSuspectCards .suspect-card');
        if (c) {
            [['.suspect-lastname', D.suspect[0]], ['.suspect-firstname', D.suspect[1]], ['.suspect-dob', D.suspect[2]]]
                .forEach(function (p) {
                    var el = c.querySelector(p[0]);
                    if (el) { el.value = p[1]; el.dispatchEvent(new Event('input', { bubbles: true })); }
                });
            ['.suspect-gender .tag-btn[data-tag="Masculin"]',
             '.suspect-health .tag-btn[data-tag="Blessure par balle (GSW)"]',
             '.suspect-medical-end .tag-btn[data-tag="Transport Centre Hospitalier"]']
                .forEach(function (sel) { var el = c.querySelector(sel); if (el) el.click(); });
        }

        tag('#mod-patrol .tag-group[data-category="force"]', 'Les agents ont riposté par arme à feu (tirs de riposte)');
        tag('#mod-patrol .tag-group[data-category="search_person"]', "Fouille incidente à l'arrestation");
        tag('#mod-patrol .tag-group[data-category="miranda"]', 'Droits Miranda lus et compris');
        tag('#mod-patrol .tag-group[data-category="miranda"]', 'Demande un avocat');
        tag('#mod-patrol .tag-group[data-category="medical_end"]', 'Transport Centre Hospitalier');

        Object.keys(D.conformite).forEach(function (k) { set('#patrolCf_' + k, D.conformite[k]); });

        var cb = $('#patrolPenalInfractions input[type="checkbox"]');
        if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }

        $('#btnGeneratePatrol').click();
        var r = $('#recapModal');
        if (r && r.classList.contains('active')) $('#btnRecapConfirm').click();

        var el = $('#patrolReportOutput span') || $('#patrolReportOutput');
        out.push('<<<<RAPPORT>>>>');
        out.push(el ? el.textContent : '(vide)');
        out.push('<<<<FIN>>>>');
    }

    function start() {
        try { run(); } catch (e) { out.push('EXCEPTION ' + e.message); }
        document.getElementById('testResults').textContent =
            '\\n===RESULTAT===\\n' + out.join('\\n') + '\\n===FIN===\\n';
    }
    if (document.readyState === 'complete') setTimeout(start, 400);
    else window.addEventListener('load', function () { setTimeout(start, 400); });
})();`;
}

// ─── Fabrication de la copie de test ───
function construireHarness() {
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

    // La CSP interdit les scripts inline : on la retire dans la COPIE de test.
    html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '');

    // Leaflet est inutile ici et ralentit le démarrage headless.
    html = html.replace('<script src="vendor/leaflet/leaflet.js"></script>',
        '<script>window.L={map:function(){return{setView:function(){return this},on:function(){return this}}},'
        + 'tileLayer:function(){return{addTo:function(){}}},marker:function(){return{addTo:function(){return{bindPopup:function(){}}}}},'
        + 'latLngBounds:function(){return{}},imageOverlay:function(){return{addTo:function(){}}},CRS:{Simple:1},divIcon:function(){}};</script>');

    // Scripts inlinés : en file://, une erreur dans un <script src> externe
    // ne remonte que comme « Script error. », sans ligne exploitable.
    ['legal-data.js', 'legal-rules.js', 'defense.js', 'app.js'].forEach(nom => {
        const code = fs.readFileSync(path.join(ROOT, nom), 'utf8');
        html = html.replace(`<script src="${nom}"></script>`, () => `<script>\n${code}\n</script>`);
    });

    // Remplacement par FONCTION : « $$ » serait sinon interprété par
    // String.replace comme un « $ » littéral.
    html = html.replace('</body>', () =>
        `<div id="testResults" style="display:none"></div>\n<script>\n${pilote()}\n</script>\n</body>`);

    fs.writeFileSync(HARNESS, html, 'utf8');
}

function lancerNavigateur() {
    const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'lspd-test-'));
    try {
        return execFileSync(BROWSER, [
            '--headless', '--disable-gpu', '--no-sandbox',
            '--virtual-time-budget=12000',
            '--user-data-dir=' + profil,
            '--dump-dom', 'file:///' + HARNESS.replace(/\\/g, '/')
        ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    } finally {
        try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    }
}

// ─── Exécution ───
let dom;
try {
    construireHarness();
    dom = lancerNavigateur();
} finally {
    try { fs.unlinkSync(HARNESS); } catch (e) { /* ignore */ }
}

const bloc = /===RESULTAT===([\s\S]*?)===FIN===/.exec(dom);
if (!bloc) {
    console.error("✗ Le pilote n'a pas produit de résultat.");
    process.exit(1);
}
const sortie = bloc[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const rapportMatch = /<<<<RAPPORT>>>>([\s\S]*?)<<<<FIN>>>>/.exec(sortie);
if (!rapportMatch) {
    console.error('✗ Rapport introuvable.\n' + sortie.slice(0, 600));
    process.exit(1);
}
const rapport = rapportMatch[1].trim();

// Corps narratif : du titre jusqu'aux annexes.
let corps = rapport;
const debut = corps.indexOf("RÉSUMÉ DES FAITS ET DE L'ARRESTATION");
if (debut >= 0) corps = corps.slice(debut + "RÉSUMÉ DES FAITS ET DE L'ARRESTATION".length);
['\nVéhicule impliqué', '\nCharges retenues', "\nAssistance d'un Avocat"].forEach(stop => {
    const i = corps.indexOf(stop);
    if (i > 0) corps = corps.slice(0, i);
});
const paragraphes = corps.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

let echecs = 0;
console.log('');
console.log('═══ FIDÉLITÉ AU MODÈLE DE RAPPORT ═══');
console.log('');
console.log('Paragraphes narratifs : ' + paragraphes.length + ' (modèle : ' + PARAGRAPHES_MODELE + ')');
paragraphes.forEach((p, i) => {
    const ph = p.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    console.log('   ' + (i + 1) + '. ' + ph + ' phrase(s), ' + p.split(/\s+/).length
        + ' mots — ' + p.slice(0, 46).replace(/\s+/g, ' ') + '…');
});
if (paragraphes.length !== PARAGRAPHES_MODELE) {
    console.log('   ✗ structure divergente');
    echecs++;
}

console.log('');
console.log('Informations du modèle :');
ATTENDUS.forEach(([label, motif]) => {
    const ok = motif.test(rapport);
    if (!ok) echecs++;
    console.log('   ' + (ok ? '✓' : '✗') + ' ' + label);
});

console.log('');
if (process.argv.includes('--print')) {
    console.log('─── Rapport généré ───');
    console.log(rapport);
    console.log('');
}
if (echecs) {
    console.log('✗ ' + echecs + ' écart(s) avec le modèle.');
    process.exit(1);
}
console.log('✓ Structure et informations conformes au modèle ('
    + ATTENDUS.length + ' informations, ' + paragraphes.length + ' paragraphes).');
