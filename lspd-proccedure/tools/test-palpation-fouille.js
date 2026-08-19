#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
 *  test-palpation-fouille.js — Distinction des deux régimes du Titre IV.
 *
 *  Palpation de sécurité (chapitre 2) et fouille (chapitre 1) ne relèvent
 *  pas des mêmes conditions. Ce test pilote l'application dans Chrome
 *  headless et vérifie, sur une même intervention, que basculer d'un
 *  régime à l'autre change :
 *    · les champs de motif proposés dans le formulaire ;
 *    · le paragraphe produit dans le rapport ;
 *    · les articles cités dans la fiche de défense.
 *
 *  Usage :  node tools/test-palpation-fouille.js [--print]
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
if (!BROWSER) {
    console.error('✗ Aucun navigateur Chromium trouvé — test ignoré.');
    process.exit(0);
}

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
        if (b) b.click();
    }
    function champsVisibles() {
        return all('#patrolComplianceFields .cf-field').map(function (f) { return f.dataset.cfKey; });
    }
    function rapport() {
        var sc = $('#patrolCompleteness .cp-score');
        out.push('DIAG score=' + (sc ? sc.textContent.trim() : '?')
            + ' manquants=' + all('#patrolProbes .probe-q').map(function (q) {
                return q.textContent.trim().slice(0, 40);
            }).join(' | '));
        $('#btnGeneratePatrol').click();
        var r = $('#recapModal');
        if (r && r.classList.contains('active')) $('#btnRecapConfirm').click();
        var el = $('#patrolReportOutput span') || $('#patrolReportOutput');
        return el ? el.textContent : '';
    }
    function defense() {
        if ($('#patrolDefense').disabled) return '(bouton défense inactif)';
        $('#patrolDefense').click();
        var t = $('#defenseBody').textContent;
        $('#btnDefenseClose').click();
        return t;
    }

    function run() {
        // Roster minimal
        $('.nav-link[data-module="dashboard"]').click();
        set('#rosterNewGrade', 'Police Officer II'); set('#rosterNewName', 'MCCOY Jesse');
        set('#rosterNewMatricule', '2001'); $('#btnAddAgent').click();
        $('.nav-link[data-module="patrol"]').click();
        var b = all('#patrolRoster .roster-grid .tag-btn').filter(function (o) {
            return /MCCOY Jesse/.test(o.textContent);
        })[0];
        if (b) b.click();

        set('#patrolDatetime', '2026-08-08T23:02');
        set('#patrolLocation', 'parking de Playa Vista');
        set('#patrolArrestTime', '23h25');
        tag('#tenCodeSelector', '10-56');

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
        tag('#patrolEvidence', 'Arme à feu saisie');
        // Dénouement de l'interpellation : sans lui, la porte de complétude
        // bloque légitimement la génération.
        tag('#mod-patrol .tag-group[data-category="force"]', 'Maîtrise physique / Plaquage au sol');

        var conf = {
            origineIntervention: 'Appel du dispatch',
            constatationInitiale: 'un individu en train de braquer un tiers à main armée',
            secteur: 'Vespucci',
            heureDroits: '23h32',
            reactionDroits: 'A déclaré les avoir compris',
            heureTransport: '23h28',
            destinationTransport: 'poste de Vespucci',
            heurePresentationProcureur: '23h50',
            verifCasier: 'Effectuée — aucun antécédent',
            heureFinPoursuite: '23h25',
            lieuFinPoursuite: 'le parking de Playa Vista',
            justificationForce: "la fuite des individus malgré les injonctions"
        };
        Object.keys(conf).forEach(function (k) { set('#patrolCf_' + k, conf[k]); });
        var cb = $('#patrolPenalInfractions input[type="checkbox"]');
        if (cb) { cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }

        // ─── Cas 1 : palpation de sécurité ───
        set('#patrolCf_natureControle', 'Palpation de sécurité');
        out.push('CHAMPS_PALPATION ' + champsVisibles().join(','));
        set('#patrolCf_motifPalpation', 'Individu signalé comme armé');
        set('#patrolCf_discretionPalpation', "Réalisée à l'abri du regard du public");
        set('#patrolCf_auteurControle', 'le Police Officer II Jesse McCoy');
        out.push('<<<<RAPPORT_PALPATION>>>>'); out.push(rapport()); out.push('<<<<FIN>>>>');
        out.push('<<<<DEFENSE_PALPATION>>>>'); out.push(defense()); out.push('<<<<FIN>>>>');

        // ─── Cas 2 : fouille ───
        set('#patrolCf_natureControle', 'Fouille');
        out.push('CHAMPS_FOUILLE ' + champsVisibles().join(','));
        set('#patrolCf_motifFouille', 'Suspicion raisonnable de détention de preuves');
        set('#patrolCf_memeSexeFouille', 'Agent du même sexe que la personne fouillée');
        set('#patrolCf_auteurControle', 'le Police Officer II Jesse McCoy');
        out.push('<<<<RAPPORT_FOUILLE>>>>'); out.push(rapport()); out.push('<<<<FIN>>>>');
        out.push('<<<<DEFENSE_FOUILLE>>>>'); out.push(defense()); out.push('<<<<FIN>>>>');

        // ─── Cas 3 : palpation sans saisie ───
        // Sans résultat à rapporter, le récit énonce la finalité de sûreté
        // que la palpation poursuivait (Art. 4-2-3).
        tag('#patrolEvidence', 'Arme à feu saisie');   // désélection
        set('#patrolCf_natureControle', 'Palpation de sécurité');
        set('#patrolCf_motifPalpation', 'Individu signalé comme armé');
        out.push('<<<<RAPPORT_PALPATION_SANS_SAISIE>>>>'); out.push(rapport()); out.push('<<<<FIN>>>>');

        // ─── Le Rapport Rapide applique la même distinction ───
        $('.nav-link[data-module="standard"]').click();
        all('#rfBlocks .rf-block').forEach(function (bl) {
            if (bl.dataset.block === 'fouille') bl.querySelector('.rf-block-toggle').click();
        });
        var champObjets = $('#rfBlocks .rf-block[data-block="fouille"] .rf-input');
        if (champObjets) {
            champObjets.value = 'un pistolet Glock 17';
            champObjets.dispatchEvent(new Event('input', { bubbles: true }));
        }
        out.push('CHAMPS_STANDARD ' + all('#rfComplianceFields .cf-field').map(function (f) {
            return f.dataset.cfKey;
        }).join(','));
        set('#rfCf_natureControle', 'Palpation de sécurité');
        set('#rfCf_motifPalpation', 'Individu signalé comme armé');
        out.push('<<<<STANDARD_PALPATION>>>>'); out.push($('#rf-preview').value); out.push('<<<<FIN>>>>');
        set('#rfCf_natureControle', 'Fouille');
        set('#rfCf_motifFouille', "Fouille incidente à l'arrestation");
        out.push('<<<<STANDARD_FOUILLE>>>>'); out.push($('#rf-preview').value); out.push('<<<<FIN>>>>');
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
    const profil = fs.mkdtempSync(path.join(os.tmpdir(), 'lspd-pf-'));
    try {
        dom = execFileSync(BROWSER, [
            '--headless', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=12000',
            '--user-data-dir=' + profil, '--dump-dom', 'file:///' + HARNESS.replace(/\\/g, '/')
        ], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
    } finally { try { fs.rmSync(profil, { recursive: true, force: true }); } catch (e) { /* ignore */ } }
} finally {
    try { fs.unlinkSync(HARNESS); } catch (e) { /* ignore */ }
}

const bloc = /===RESULTAT===([\s\S]*?)===FIN===/.exec(dom);
if (!bloc) { console.error("✗ Le pilote n'a pas produit de résultat."); process.exit(1); }
const sortie = bloc[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

function extraire(balise) {
    const m = new RegExp('<<<<' + balise + '>>>>([\\s\\S]*?)<<<<FIN>>>>').exec(sortie);
    return m ? m[1].trim() : '';
}
function champs(prefixe) {
    const m = new RegExp(prefixe + ' (.*)').exec(sortie);
    return m ? m[1].split(',') : [];
}

const rapportP = extraire('RAPPORT_PALPATION');
const rapportF = extraire('RAPPORT_FOUILLE');
const defenseP = extraire('DEFENSE_PALPATION');
const defenseF = extraire('DEFENSE_FOUILLE');
const rapportSansSaisie = extraire('RAPPORT_PALPATION_SANS_SAISIE');
const stdPalpation = extraire('STANDARD_PALPATION');
const stdFouille = extraire('STANDARD_FOUILLE');
const champsP = champs('CHAMPS_PALPATION');
const champsF = champs('CHAMPS_FOUILLE');

let echecs = 0;
function verifie(label, ok, detail) {
    console.log('   ' + (ok ? '✓' : '✗') + ' ' + label + (ok || !detail ? '' : '\n       → ' + detail));
    if (!ok) echecs++;
}

// Remonte les avertissements du pilote (champ absent, exception, diagnostic).
sortie.split(/\r?\n/).filter(l => /^(DIAG|EXCEPTION|CHAMP ABSENT|TAG ABSENT)/.test(l.trim()))
    .forEach(l => console.log('   ⓘ ' + l.trim()));

console.log('');
console.log('═══ PALPATION DE SÉCURITÉ vs FOUILLE ═══');
console.log('');
console.log('Champs du formulaire');
verifie('la palpation propose son motif propre', champsP.includes('motifPalpation'), champsP.join(','));
verifie('la palpation propose la condition de discrétion (Art. 4-2-4)', champsP.includes('discretionPalpation'));
verifie('la palpation ne propose pas la base légale de la fouille', !champsP.includes('motifFouille'));
verifie('la fouille propose sa base légale', champsF.includes('motifFouille'), champsF.join(','));
verifie('la fouille propose la règle du même sexe (Art. 4-1-1)', champsF.includes('memeSexeFouille'));
verifie('la fouille ne propose pas le motif de palpation', !champsF.includes('motifPalpation'));

console.log('');
console.log('Texte du rapport');
verifie('la palpation est rédigée comme telle', /palpation de sécurité/i.test(rapportP));
verifie('la palpation avec saisie en rapporte le résultat', /a permis la saisie sur/i.test(rapportP));
verifie('la palpation sans saisie énonce sa finalité de sûreté',
    /objet dangereux/i.test(rapportSansSaisie), rapportSansSaisie.slice(0, 120));
verifie('la palpation sans saisie ne mentionne aucun scellé',
    !/scellés/i.test(rapportSansSaisie));
verifie('la palpation mentionne la discrétion', /abri du regard du public/i.test(rapportP));
verifie('le rapport de palpation ne parle pas de fouille', !/Une fouille a été réalisée/i.test(rapportP));
verifie('la fouille est rédigée comme telle', /Une fouille a été réalisée/i.test(rapportF));
verifie('la fouille énonce sa base légale', /suspicions raisonnables/i.test(rapportF));
verifie('la fouille mentionne inventaire et scellés', /inventaire détaillé/i.test(rapportF));
verifie('le rapport de fouille ne parle pas de palpation', !/palpation de sécurité/i.test(rapportF));
verifie('les deux textes diffèrent', rapportP !== rapportF);

console.log('');
console.log('Rapport Rapide');
verifie('le champ de régime est proposé', champs('CHAMPS_STANDARD').includes('natureControle'),
    champs('CHAMPS_STANDARD').join(','));
verifie('la palpation y est rédigée comme telle', /palpation de sécurité/i.test(stdPalpation),
    stdPalpation.slice(0, 100));
verifie('la fouille y est rédigée comme telle', /Une fouille a été réalisée/i.test(stdFouille));
verifie('les deux textes y diffèrent', stdPalpation !== stdFouille);

console.log('');
console.log('Fiche de défense');
verifie("la palpation cite l'Art. 4-2-3", /Art\. 4-2-3/.test(defenseP));
verifie("la palpation cite l'Art. 4-2-4", /Art\. 4-2-4/.test(defenseP));
verifie("la palpation ne cite pas l'Art. 4-1-2", !/Art\. 4-1-2/.test(defenseP));
verifie("la fouille cite l'Art. 4-1-2", /Art\. 4-1-2/.test(defenseF));
verifie("la fouille cite l'Art. 4-1-1", /Art\. 4-1-1/.test(defenseF));
verifie("la fouille ne cite pas l'Art. 4-2-3", !/Art\. 4-2-3/.test(defenseF));

if (process.argv.includes('--print')) {
    const para = (t, re) => (t.split(/\n\s*\n/).find(p => re.test(p)) || '(paragraphe introuvable)').trim();
    console.log('');
    console.log('─── Paragraphe — palpation ───');
    console.log(para(rapportP, /palpation/i));
    console.log('');
    console.log('─── Paragraphe — fouille ───');
    console.log(para(rapportF, /fouille/i));
}

console.log('');
if (echecs) { console.log('✗ ' + echecs + ' écart(s).'); process.exit(1); }
console.log('✓ Les deux régimes produisent des champs, un texte et des articles distincts.');
