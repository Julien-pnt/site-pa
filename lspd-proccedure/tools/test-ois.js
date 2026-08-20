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
            oisOffNom: 'MENDES Ignacio', oisOffBadge: '1004',
            oisOffGrade: 'Police Officer II', oisOffDivision: 'Patrol Division',
            oisArmeType: 'Pistolet', oisArmeModele: 'Glock 17',
            oisArmeCalibre: '9mm', oisArmeSerie: '1784832418171',
            oisMunitionsTirees: '3', oisChargeur: '17 / 14',
            oisTemoins: 'COLE Ethan — 1102 — couverture\\nMCCOY Jesse — 2001 — négociation',
            oisSuspectNom: 'LOTARE Lucie',
            oisSuspectDesc: 'femme, 1m70, veste sombre',
            oisSuspectArme: 'oui — Glock 17 modifié (switch)',
            oisMotif: 'appel du dispatch signalant des coups de feu',
            oisVehicule: 'Vapid Scout — 14A56',
            oisDistance: '8', oisPosition: 'à couvert derrière le véhicule de service',
            oisRiposteNb: '2',
            oisRecit: "À notre arrivée, l'individu a fait feu en direction de notre position. Après sommation restée sans effet, j'ai fait usage de mon arme de service à trois reprises.",
            oisOffBlesse: 'Non', oisSuspectTouche: '1 impact, bras droit',
            oisCivilTouche: 'Non', oisDommages: 'pare-brise du véhicule de service',
            oisBodycamRef: 'BC-2026-0812', oisBodycamHeures: '23:00 — 23:35'
        };
        Object.keys(ois).forEach(function (k) { set('#' + k, ois[k]); });
        tag('#oisSuspectEtat', 'Interpellé');
        tag('#oisSommations', 'Oui');
        tag('#oisRiposte', 'Oui');
        tag('#oisBodycam', 'Oui');

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
    ['numéro de dossier', /Numéro de dossier : OIS-2026-0007/],
    ["date de l'incident", /Date de l'incident : 08\/08\/2026/],
    ["heure de l'incident", /Heure de l'incident : 23h12/],
    ['lieu', /Lieu : San Andreas Avenue/],
    ['1 · officier impliqué', /1\. OFFICIER IMPLIQUÉ/],
    ['identité, badge, grade, division', /Badge n° : 1004[\s\S]*Division \/ Affectation : Patrol Division/],
    ['arme — type, modèle, calibre, série', /Type d'arme : Pistolet[\s\S]*Numéro de série : 1784832418171/],
    ['munitions tirées et chargeur', /munitions tirées : 3[\s\S]*Chargeur avant \/ après incident : 17 \/ 14/],
    ['2 · officiers témoins', /2\. OFFICIERS TÉMOINS \/ PRÉSENTS[\s\S]*COLE Ethan/],
    ['3 · suspect', /3\. SUSPECT\(S\) IMPLIQUÉ\(S\)[\s\S]*LOTARE Lucie/],
    ['état du suspect coché', /☑ Interpellé/],
    ['4 · contexte', /4\. CONTEXTE DE L'INTERVENTION/],
    ['5 · circonstances du tir', /5\. CIRCONSTANCES DU TIR/],
    ['amorce du récit imposée', /je me trouvais dans la patrouille composée de/],
    ['distance et position', /Distance approximative : 8 mètres[\s\S]*Position de l'officier : à couvert/],
    ['sommations cochées', /Sommations effectuées : ☑ Oui/],
    ['riposte du suspect', /Tirs ripostés par le suspect : ☑ Oui.*Nombre : 2/],
    ['6 · blessures et dommages', /6\. BLESSURES & DOMMAGES[\s\S]*pare-brise/],
    ['7 · éléments fournis', /7\. ÉLÉMENTS FOURNIS PAR L'OFFICIER/],
    ['restriction bodycam rappelée', /ne peut fournir que l'enregistrement de sa bodycam/],
    ['bodycam cochée et référencée', /☑ Enregistrement bodycam remis — Réf\. : BC-2026-0812/],
    ['heures d\'enregistrement', /23:00 — 23:35/],
    ['saisie de l\'arme par le FID', /saisie par le FID\/IAD pour expertise balistique/],
    ['signature', /Signature de l'officier/],
    ['rappel de procédure', /remet immédiatement sa bodycam au/]
];
RUBRIQUES.forEach(([label, re]) => verifie(label, re.test(oisTexte)));

console.log('');
console.log('═══ FICHE D\'AUDITION FID / IAD ═══');
verifie('le titre de la modale change', /FID\/IAD/.test(ligne('IAD_TITRE')), ligne('IAD_TITRE'));
verifie('la fiche est produite', iad.length > 400, iad.slice(0, 120));
verifie("elle cite l'Art. 123", /Art\. 123/.test(iad));
verifie('elle cite une procédure interne', /Procédure interne LSPD/.test(iad));
verifie('elle interroge sur les sommations', /sommation/i.test(iad));
verifie('elle interroge sur la bodycam', /bodycam/i.test(iad));
verifie('elle interroge sur le décompte des munitions', /coups avez-vous tirés/i.test(iad));
verifie('elle interroge sur la scène', /touché à des éléments de la scène/i.test(iad));
verifie('elle ne contient pas la réponse interne', iad.indexOf(MARQUEUR_INTERNE) === -1);

if (process.argv.includes('--print')) {
    console.log('');
    console.log('─── Rapport OIS ───');
    console.log(oisTexte);
}

console.log('');
if (echecs) { console.log('✗ ' + echecs + ' écart(s).'); process.exit(1); }
console.log('✓ Module OIS complet, question interne étanche, fiche IAD exploitable.');
