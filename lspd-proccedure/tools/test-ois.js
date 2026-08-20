#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
 *  test-ois.js — Rapport d'Incident (OIS), question interne, fiche IAD.
 *
 *  Vérifie trois choses distinctes :
 *
 *   1. le module Rapport d'Incident couvre TOUTES les rubriques du gabarit
 *      docs/template-ois.md, dans l'ordre et avec les mêmes intitulés ;
 *   2. la question interne « qui a fait usage de son arme » ne laisse
 *      AUCUNE trace dans le rapport d'arrestation, ni dans sa copie, ni
 *      dans ses exports — mais déclenche bien le rappel OIS à l'écran ;
 *   3. la fiche de préparation à l'audition FID/IAD se construit depuis le
 *      rapport d'incident, avec ses articles et ses points de procédure.
 *
 *  Usage :  node tools/test-ois.js [--print]
 * ═══════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const HARNESS = path.join(ROOT, '_test-harness.html');

const CANDIDATS = [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
];
const BROWSER = CANDIDATS.find(p => fs.existsSync(p));
if (!BROWSER) { console.error('✗ Aucun navigateur Chromium trouvé — test ignoré.'); process.exit(0); }

// Le marqueur ne doit apparaître NULLE PART dans le rapport d'arrestation.
const MARQUEUR_INTERNE = 'Le rédacteur de ce rapport';

function pilote() {
    return `(function () {
    var out = [];
    function $(s) { return document.querySelector(s); }
    function all(s) { return [].slice.call(document.querySelectorAll(s)); }
    function set(sel, v) {
        var el = $(sel); if (!el) { out.push('CHAMP ABSENT ' + sel); return false; }
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
    }
    function tag(container, t) {
        var b = all(container + ' .tag-btn').filter(function (x) { return x.dataset.tag === t; })[0];
        if (b) b.click(); else out.push('TAG ABSENT ' + t + ' @ ' + container);
    }

    function run() {
        // ══ Partie A — rapport d'arrestation avec question interne ══
        $('.nav-link[data-module="dashboard"]').click();
        set('#rosterNewGrade', 'Police Officer II'); set('#rosterNewName', 'MENDES Ignacio');
        set('#rosterNewMatricule', '1004'); $('#btnAddAgent').click();

        $('.nav-link[data-module="patrol"]').click();
        var b = all('#patrolRoster .roster-grid .tag-btn').filter(function (o) {
            return /MENDES Ignacio/.test(o.textContent);
        })[0];
        if (b) b.click();

        set('#patrolDatetime', '2026-08-08T23:02');
        set('#patrolLocation', 'San Andreas Avenue');
        set('#patrolArrestTime', '23h27');
        tag('#tenCodeSelector', '10-31');
        var c = $('#patrolSuspectCards .suspect-card');
        if (c) {
            [['.suspect-lastname', 'LOTARE'], ['.suspect-firstname', 'Lucie'], ['.suspect-dob', '14/06/1994']]
                .forEach(function (p) {
                    var el = c.querySelector(p[0]);
                    if (el) { el.value = p[1]; el.dispatchEvent(new Event('input', { bubbles: true })); }
                });
            var g = c.querySelector('.suspect-gender .tag-btn[data-tag="Féminin"]');
            if (g) g.click();
        }
        tag('#mod-patrol .tag-group[data-category="force"]', 'Les agents ont riposté par arme à feu (tirs de riposte)');
        tag('#patrolEvidence', 'Arme à feu saisie');

        var conf = {
            origineIntervention: 'Appel du dispatch',
            constatationInitiale: 'des coups de feu sur la position de l\\'unité requérante',
            secteur: 'Vespucci',
            natureControle: 'Palpation de sécurité',
            motifPalpation: 'Individu signalé comme armé',
            resultatGsr: 'Positif',
            justificationForce: 'la menace directe représentée par les tirs essuyés',
            menaceInvoquee: 'Atteinte à la vie ou à l\\'intégrité physique portée contre les agents ou autrui (Art. 123-1)',
            sommation: 'Oui — avertissement clair adressé avant l\\'usage de l\\'arme',
            heureDroits: '23h32',
            reactionDroits: 'A déclaré les avoir compris et a déclaré ne pas souhaiter en faire usage',
            heureTransport: '23h28',
            destinationTransport: 'poste de Vespucci',
            heurePresentationProcureur: '23h50',
            verifCasier: 'Effectuée — aucun antécédent',
            sanction: 'amende 23500 $, 0 mois de prison',
            reglementSanction: 'Non réglée'
        };
        Object.keys(conf).forEach(function (k) { set('#patrolCf_' + k, conf[k]); });
        var cb = $('#patrolPenalInfractions input[type="checkbox"]');
        if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }

        // La question interne : le rédacteur est l'auteur du tir.
        var champInterne = $('#patrolCf_auteurUsageArme');
        out.push('QUESTION_INTERNE_PRESENTE ' + (champInterne ? 'oui' : 'non'));
        set('#patrolCf_auteurUsageArme', 'Le rédacteur de ce rapport');

        out.push('DIAG score=' + (($('#patrolCompleteness .cp-score') || {}).textContent || '?').trim()
            + ' manquants=' + all('#patrolProbes .probe-q').map(function (q) {
                return q.textContent.trim().slice(0, 38);
            }).join(' | '));

        $('#btnGeneratePatrol').click();
        var r = $('#recapModal');
        if (r && r.classList.contains('active')) $('#btnRecapConfirm').click();

        var el = $('#patrolReportOutput span') || $('#patrolReportOutput');
        out.push('<<<<RAPPORT>>>>'); out.push(el ? el.textContent : ''); out.push('<<<<FIN>>>>');

        // Le récap et la fiche de défense sont aussi des sorties.
        if (!$('#patrolDefense').disabled) {
            $('#patrolDefense').click();
            out.push('<<<<DEFENSE>>>>'); out.push($('#defenseBody').textContent); out.push('<<<<FIN>>>>');
            $('#btnDefenseClose').click();
        }

        out.push('RAPPEL_OIS ' + ($('#patrolCompleteness .ois-reminder') ? 'affiche' : 'absent'));

        // ══ Partie B — module Rapport d'Incident ══
        $('.nav-link[data-module="ois"]').click();
        out.push('MODULE_OIS ' + ($('#mod-ois.module.active') ? 'actif' : 'inactif'));

        var ois = {
            oisDossier: 'OIS-2026-0007',
            oisDatetime: '2026-08-08T23:12',
            oisLieu: 'San Andreas Avenue',
            oisMeteo: 'nuit, pluie fine, éclairage public partiel',
            oisOffNom: 'MENDES Ignacio', oisOffBadge: '1004',
            oisOffGrade: 'Police Officer II', oisOffAffectation: 'Patrol Division',
            oisArmeType: 'Pistolet', oisArmeModele: 'Glock 17',
            oisArmeCalibre: '9mm', oisArmeSerie: '1784832418171',
            oisMunitionsTirees: '3', oisChargeur: '17 / 14',
            oisOfficiersForce: 'COLE Ethan (1102 — tirs de couverture)',
            oisTemoins: 'MCCOY Jesse (2001 — négociation)',
            oisSuspectNom: 'LOTARE Lucie',
            oisSuspectDesc: 'femme, 1m70, veste sombre',
            oisSuspectArme: 'Glock 17 modifié (switch)',
            oisMotif: 'appel du dispatch signalant des coups de feu',
            oisUnite: '14A56',
            oisDistance: '8', oisPosition: 'à couvert derrière le véhicule de service',
            oisRiposteNb: '2',
            oisSommationsPrecision: '« Police, lâchez votre arme », à deux reprises',
            oisRecit: "À notre arrivée, l'individu a fait feu en direction de notre position. Après sommation restée sans effet, j'ai fait usage de mon arme de service à trois reprises.",
            oisMenacePercue: "L'individu a braqué son arme dans ma direction à moins de dix mètres, en position de tir.",
            oisAlternatives: "Injonctions verbales à deux reprises, mise à couvert derrière le véhicule ; aucun moyen intermédiaire disponible face à une arme à feu.",
            oisOffBlesseDetail: 'aucune blessure',
            oisSuspectTouche: '1 impact, bras droit',
            oisCivilToucheDetail: 'néant',
            oisSoinsPlace: 'compression de la plaie en attendant le LSFD',
            oisDommages: 'pare-brise du véhicule de service',
            oisSecurisationScene: 'périmètre établi, circulation détournée',
            oisTemoinsIdentifies: 'deux passants, coordonnées relevées',
            oisSuperviseur: 'Sergeant I GRAVES Logan', oisSuperviseurHeure: '23h18',
            oisBodycamRef: 'BC-2026-0812', oisBodycamHeures: '23:00 / 23:35',
            oisEnquetePenale: 'Force Investigation Division',
            oisEnqueteAdmin: 'Internal Affairs Division'
        };
        Object.keys(ois).forEach(function (k) { set('#' + k, ois[k]); });
        tag('#oisSuspectEtat', 'Interpellé');
        tag('#oisSommations', 'Oui');
        tag('#oisRiposte', 'Oui');
        tag('#oisBodycam', 'Oui');
        tag('#oisRapportDetaille', 'Oui');
        tag('#oisOffBlesse', 'Non');
        tag('#oisCivilTouche', 'Non');

        out.push('OIS_SCORE ' + (($('#oisCompleteness .cp-score') || {}).textContent || '?').trim());
        out.push('<<<<OIS>>>>'); out.push($('#ois-preview').value); out.push('<<<<FIN>>>>');

        // ══ Partie C — fiche IAD ══
        $('#oisDefense').click();
        out.push('<<<<IAD>>>>'); out.push($('#defenseBody').textContent); out.push('<<<<FIN>>>>');
        out.push('IAD_TITRE ' + (($('#defenseModal h3') || {}).textContent || ''));
    }

    function start() {
        try { run(); } catch (e) { out.push('EXCEPTION ' + e.message + ' | ' + (e.stack || '').split('\\n')[1]); }
        document.getElementById('testResults').textContent =
            '\\n===RESULTAT===\\n' + out.join('\\n') + '\\n===FIN===\\n';
    }
    if (document.readyState === 'complete') setTimeout(start, 400);
    else window.addEventListener('load', function () { setTimeout(start, 400); });
})();`;
}

function construireHarness() {
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '');
    html = html.replace('<script src="vendor/leaflet/leaflet.js"></script>',
        '<script>window.L={map:function(){return{setView:function(){return this},on:function(){return this}}},'
        + 'tileLayer:function(){return{addTo:function(){}}},marker:function(){return{addTo:function(){return{bindPopup:function(){}}}}},'
        + 'latLngBounds:function(){return{}},imageOverlay:function(){return{addTo:function(){}}},CRS:{Simple:1},divIcon:function(){}};</script>');
    ['legal-data.js', 'legal-rules.js', 'defense.js', 'app.js'].forEach(nom => {
        const code = fs.readFileSync(path.join(ROOT, nom), 'utf8');
        html = html.replace(`<script src="${nom}"></script>`, () => `<script>\n${code}\n</script>`);
    });
    html = html.replace('</body>', () =>
        `<div id="testResults" style="display:none"></div>\n<script>\n${pilote()}\n</script>\n</body>`);
    fs.writeFileSync(HARNESS, html, 'utf8');
}

let dom;
try {
    construireHarness();
    const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'lspd-ois-'));
    try {
        dom = execFileSync(BROWSER, [
            '--headless', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=14000',
            '--user-data-dir=' + profil, '--dump-dom', 'file:///' + HARNESS.replace(/\\/g, '/')
        ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    } finally { try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) { /* ignore */ } }
} finally { try { fs.unlinkSync(HARNESS); } catch (e) { /* ignore */ } }

const bloc = /===RESULTAT===([\s\S]*?)===FIN===/.exec(dom);
if (!bloc) { console.error("✗ Le pilote n'a pas produit de résultat."); process.exit(1); }
const sortie = bloc[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const extraire = (b) => {
    const m = new RegExp('<<<<' + b + '>>>>([\\s\\S]*?)<<<<FIN>>>>').exec(sortie);
    return m ? m[1].trim() : '';
};
const ligne = (p) => {
    const m = new RegExp('^' + p + ' (.*)$', 'm').exec(sortie);
    return m ? m[1].trim() : '';
};

const rapport = extraire('RAPPORT');
const defense = extraire('DEFENSE');
const oisTexte = extraire('OIS');
const iad = extraire('IAD');

let echecs = 0;
const verifie = (label, ok, detail) => {
    console.log('   ' + (ok ? '✓' : '✗') + ' ' + label + (ok || !detail ? '' : '\n       → ' + detail));
    if (!ok) echecs++;
};

sortie.split(/\r?\n/).filter(l => /^(EXCEPTION|CHAMP ABSENT|TAG ABSENT|DIAG)/.test(l.trim()))
    .forEach(l => console.log('   ⓘ ' + l.trim()));

console.log('');
console.log('═══ QUESTION INTERNE — étanchéité ═══');
verifie('la question est posée dans le formulaire', ligne('QUESTION_INTERNE_PRESENTE') === 'oui');
verifie('le rapport a bien été généré', rapport.length > 300, rapport.slice(0, 120));
verifie('la réponse interne n\'apparaît pas dans le rapport',
    rapport.indexOf(MARQUEUR_INTERNE) === -1,
    (rapport.match(/.{0,60}rédacteur.{0,40}/i) || [''])[0]);
verifie('le libellé de la question n\'apparaît pas dans le rapport',
    !/fait usage de son arme \?/i.test(rapport));
verifie('la réponse interne n\'apparaît pas dans la fiche de défense',
    defense.indexOf(MARQUEUR_INTERNE) === -1);
verifie('le rappel OIS est affiché à l\'écran', ligne('RAPPEL_OIS') === 'affiche');

console.log('');
console.log('═══ MODULE RAPPORT D\'INCIDENT ═══');
verifie('le module est accessible', ligne('MODULE_OIS') === 'actif');
verifie('toutes les rubriques du gabarit sont renseignables',
    ligne('OIS_SCORE') === '100 %', 'score ' + ligne('OIS_SCORE'));

// Rubriques attendues, reprises de docs/template-ois.md.
const RUBRIQUES = [
    ['en-tête du rapport', /RAPPORT OIS — OFFICER INVOLVED SHOOTING/],
    ['numéro de dossier', /Numéro de dossier : OIS-2026-0007/],
    ["date, heure et lieu sur une ligne", /Date de l'incident : 08\/08\/2026\s+Heure : 23h12\s+Lieu : San Andreas Avenue/],
    ['conditions météo / luminosité', /Conditions météo \/ luminosité : nuit, pluie fine/],
    ['1 · officier impliqué', /1\. OFFICIER IMPLIQUÉ/],
    ['nom, badge, grade, affectation', /Badge n° : 1004[\s\S]*Affectation : Patrol Division/],
    ['arme — type, modèle, calibre, série', /- Type : Pistolet[\s\S]*- Numéro de série : 1784832418171/],
    ["munitions tirées « selon l'officier »", /- Munitions tirées \(selon l'officier\) : 3/],
    ['chargeur avant / après', /- Chargeur avant \/ après : 17 \/ 14/],
    ['2 · autres officiers', /2\. AUTRES OFFICIERS/],
    ['officiers ayant fait usage de la force', /Officiers ayant fait usage de la force :[\s\S]*COLE Ethan \(1102/],
    ['officiers témoins non impliqués', /Officiers témoins \(non impliqués dans le tir\) :[\s\S]*MCCOY Jesse/],
    ['3 · suspect', /3\. SUSPECT\(S\)[\s\S]*LOTARE Lucie/],
    ['arme du suspect', /Arme \(si applicable\) : Glock 17 modifié/],
    ['état du suspect coché', /☑ Interpellé/],
    ['4 · contexte', /4\. CONTEXTE[\s\S]*Motif de l'intervention :/],
    ['5 · circonstances', /5\. CIRCONSTANCES/],
    ["amorce du récit à l'unité", /je me trouvais dans la patrouille composée de[\s\S]*à bord de l'unité 14A56, lorsque/],
    ['menace perçue', /Menace perçue \(comportement et actions du suspect\) :[\s\S]*braqué son arme/],
    ['alternatives / désescalade', /Alternatives envisagées \/ tentative de désescalade :[\s\S]*Injonctions verbales/],
    ['distance et position', /Distance : 8 mètres\s+Position au moment du tir : à couvert/],
    ['sommations cochées et précisées', /Sommations : ☑ Oui.*préciser : « Police, lâchez votre arme »/],
    ['riposte du suspect', /Tirs ripostés par le suspect : ☑ Oui.*nombre : 2/],
    ['6 · blessures et dommages', /6\. BLESSURES & DOMMAGES/],
    ['officier blessé coché', /Officier\(s\) blessé\(s\) : ☐ Oui\s+☑ Non — aucune blessure/],
    ['civil touché coché', /Civil\(s\) touché\(s\) : ☐ Oui\s+☑ Non — néant/],
    ['soins prodigués sur place', /Soins prodigués sur place : compression de la plaie/],
    ['dommages matériels', /Dommages matériels : pare-brise/],
    ['7 · actions post-incident', /7\. ACTIONS POST-INCIDENT/],
    ['sécurisation de la scène', /Sécurisation de la scène : périmètre établi/],
    ['témoins identifiés', /Témoins identifiés : deux passants/],
    ['superviseur contacté et heure', /Superviseur contacté : Sergeant I GRAVES Logan \(heure : 23h18\)/],
    ['8 · éléments fournis', /8\. ÉLÉMENTS FOURNIS PAR L'OFFICIER/],
    ['bodycam cochée, réf. et horaires', /☑ Enregistrement bodycam remis — réf\. : BC-2026-0812 \(début \/ fin : 23:00 \/ 23:35\)/],
    ['présent rapport détaillé coché', /☑ Présent rapport détaillé/],
    ['bodycam non exclusive', /pièce de preuve importante mais non exclusive/],
    ['rapport = déclaration principale', /reste la déclaration principale de l'officier/],
    ["collecte par l'équipe d'enquête", /assurée par[\s\S]*équipe d'enquête désignée/],
    ['arme de remplacement attribuée', /Une arme de remplacement lui est attribuée/],
    ['unité enquête pénale', /Enquête pénale \(usage de la force\) — unité : Force Investigation Division/],
    ['unité enquête administrative', /Enquête administrative \(respect des procédures\) — unité : Internal Affairs Division/],
    ['note de séparation des enquêtes', /ne peut être utilisée dans le volet pénal/],
    ['signature', /Signature de l'officier/]
];
RUBRIQUES.forEach(([label, re]) => verifie(label, re.test(oisTexte)));

console.log('');
console.log('═══ FICHE D\'AUDITION FID / IAD ═══');
verifie("le titre de la modale bascule sur l'audition", /audition/i.test(ligne('IAD_TITRE')), ligne('IAD_TITRE'));
verifie('la fiche est produite', iad.length > 400, iad.slice(0, 120));
verifie("elle cite l'Art. 123", /Art\. 123/.test(iad));
verifie('elle cite une procédure interne', /Procédure interne LSPD/.test(iad));
verifie('elle interroge sur les sommations', /sommation/i.test(iad));
verifie('elle interroge sur la bodycam', /bodycam/i.test(iad));
verifie('elle interroge sur le décompte des munitions', /coups avez-vous tirés/i.test(iad));
verifie('elle interroge sur la menace perçue', /menace que vous perceviez/i.test(iad));
verifie('elle interroge sur les alternatives / désescalade', /alternatives avez-vous envisagées/i.test(iad));
verifie('elle interroge sur les actions post-incident', /scène sécurisée, superviseur prévenu/i.test(iad));
verifie('elle interroge sur les soins prodigués', /soins avez-vous prodigués/i.test(iad));
verifie('elle traite la séparation pénal / administratif', /volet administratif/i.test(iad));
verifie('elle ne parle plus de « FID/IAD » comme guichet unique',
    !/collecte des preuves réservée aux enquêteurs FID\/IAD/i.test(iad));
verifie('elle ne contient pas la réponse interne', iad.indexOf(MARQUEUR_INTERNE) === -1);

if (process.argv.includes('--print')) {
    console.log('');
    console.log('─── Rapport OIS ───');
    console.log(oisTexte);
}

console.log('');
if (echecs) { console.log('✗ ' + echecs + ' écart(s).'); process.exit(1); }
console.log('✓ Module OIS complet, question interne étanche, fiche IAD exploitable.');
