#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════
 *  build-legal.js — Compile les deux codes Markdown en un module JS.
 *
 *  Pourquoi une précompilation plutôt qu'un fetch() : la CSP de la page
 *  est `connect-src https://*.workers.dev` (sans 'self'), donc un fetch
 *  same-origin des .md serait bloqué par le navigateur. Un <script src>
 *  passe par `script-src 'self'` — aucune modification de CSP requise.
 *
 *  Usage  :  node tools/build-legal.js
 *  Sortie :  legal-data.js  (window.LSPD_LEGAL)
 * ═══════════════════════════════════════════════════════════════════ */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LEGAL_DIR = path.join(ROOT, 'legal');
const OUT = path.join(ROOT, 'legal-data.js');

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }

if (!fs.existsSync(LEGAL_DIR)) fail('Dossier legal/ introuvable.');

// ─── Localisation tolérante des deux sources ───
// Les noms de fichiers peuvent varier (accents, casse, tirets) : on résout
// par mots-clés plutôt que par nom exact.
const mdFiles = fs.readdirSync(LEGAL_DIR)
    .filter(f => f.toLowerCase().endsWith('.md'))
    .map(f => path.join(LEGAL_DIR, f));

if (!mdFiles.length) fail('Aucun fichier .md dans legal/.');

const procPath = mdFiles.find(p => /proc[ée]dure/i.test(path.basename(p)));
if (!procPath) fail('Code de procédure introuvable dans legal/ (nom contenant « procédure »).');

// Le code pénal est le .md restant qui mentionne « pénal », sinon le premier autre.
const others = mdFiles.filter(p => p !== procPath);
const penalPath = others.find(p => /p[ée]nal/i.test(path.basename(p))) || others[0];
if (!penalPath) fail('Code pénal introuvable dans legal/.');

// ═══════════════════════════════════════════════════════════════════════
// PARSING — CODE PÉNAL
//
// Le fichier mélange DEUX gabarits, il faut gérer les deux :
//
//  a) Infractions (Titre II et suivants) — titre en dièses + barème :
//            ### Art. 211 — Homicide volontaire
//            - **Catégorie :** Crime
//            - **Prison :** Peine Capitale
//            - **Amende :** $125.000
//            <description libre>
//
//  b) Dispositions générales (Titre I : principes, responsabilité pénale)
//     — article en gras inline, sans barème. C'est le gabarit des articles
//     121 à 125, dont l'Art. 123 (usage des armes par les forces de l'ordre),
//     central pour l'analyse de proportionnalité :
//            **Art. 123** — Dans l'exercice de leurs fonctions…
// ═══════════════════════════════════════════════════════════════════════

// Deux cas de collision d'identifiant coexistent dans la source, et ils
// n'appellent pas le même traitement :
//
//  · RÉPÉTITION — le TITRE VI est présent deux fois, avec les mêmes
//    articles. On garde la première occurrence et on l'ignore.
//  · HOMONYMIE — deux articles DIFFÉRENTS portent le même numéro (le n° 629
//    désigne à la fois « Conduite d'un aéronef sous l'emprise d'un état
//    alcoolique » et « Survol d'une zone prohibée »). Écraser ou ignorer
//    ferait disparaître un article : on le conserve sous « 629-bis » et on
//    le signale, car c'est une anomalie du code qui mérite correction.
function norm(s) {
    return String(s || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Deux entrées désignent le même article si leur intitulé concorde, ou si
// leur corps de texte concorde. Le second critère est indispensable : le
// TITRE VI répété comporte des variantes de libellé (l'Art. 624 s'intitule
// « …usage de substance… » d'un côté et « …usage de plante ou substance… »
// de l'autre) qui ne sont pas des articles distincts pour autant.
function sameArticle(a, b) {
    if (norm(a.titre) === norm(b.titre)) return true;
    if (a.texte && b.texte && norm(a.texte) === norm(b.texte)) return true;
    return false;
}

// Toutes les entrées déjà indexées sous ce numéro, suffixes compris.
function entriesForNumber(out, num) {
    return Object.keys(out)
        .filter(k => k === num || k.indexOf(num + '-') === 0)
        .map(k => out[k])
        .filter(e => (e.numSource || e.id) === num || e.id === num);
}

// Un aperçu tronqué au début du texte masquerait une divergence située plus
// loin (la coquille « gêne »/« gène » de l'Art. 601 tombe au 75e caractère).
// On centre donc l'extrait sur le premier caractère qui diffère.
function extraitDivergent(texte, autre) {
    const t = String(texte || '');
    if (!t) return '(vide)';
    const b = String(autre || '');
    let i = 0;
    while (i < t.length && i < b.length && t[i] === b[i]) i++;
    if (i >= t.length && i >= b.length) return t.slice(0, 60);
    const debut = Math.max(0, i - 25);
    return (debut ? '…' : '') + t.slice(debut, i + 35) + (i + 35 < t.length ? '…' : '');
}

function derivedId(out, baseId) {
    const suffixes = ['bis', 'ter', 'quater', 'quinquies'];
    for (const s of suffixes) {
        const candidate = baseId + '-' + s;
        if (!out[candidate]) return candidate;
    }
    return baseId + '-' + Date.now();
}

function parsePenal(md) {
    const lines = md.split(/\r?\n/);
    const out = {};
    const dupes = [];
    const homonymes = [];
    const variantes = [];
    let cur = null;

    const flush = () => {
        if (!cur) return;
        cur.texte = cur._buf.join(' ').replace(/\s+/g, ' ').trim();
        delete cur._buf;
        const num = cur.id;

        if (!out[num] && !entriesForNumber(out, num).length) {
            out[num] = cur;
            cur = null;
            return;
        }

        const jumeau = entriesForNumber(out, num).find(e => sameArticle(e, cur));
        if (jumeau) {
            dupes.push(num);
            // Répétition, mais pas forcément à l'identique : on signale les
            // écarts de libellé ou de texte pour qu'ils soient tranchés
            // dans la source plutôt qu'arbitrés silencieusement ici.
            if (jumeau.titre !== cur.titre) {
                variantes.push({ num, champ: 'intitulé', retenu: jumeau.titre, ignore: cur.titre });
            } else if (jumeau.texte !== cur.texte) {
                variantes.push({
                    num, champ: 'texte',
                    retenu: extraitDivergent(jumeau.texte, cur.texte),
                    ignore: extraitDivergent(cur.texte, jumeau.texte)
                });
            }
        } else {
            const nid = derivedId(out, num);
            homonymes.push({ num, id: nid, titre: cur.titre, autre: out[num].titre });
            cur.numSource = num;              // le numéro tel qu'il figure au code
            cur.id = nid;
            out[nid] = cur;
        }
        cur = null;
    };

    for (const line of lines) {
        // (a) Titre d'article : 1 à 4 dièses, « Art. » puis l'identifiant.
        // L'identifiant tolère « 431.4 » comme « 431-4 » (les deux existent).
        const head = line.match(/^#{1,4}\s+Art\.\s*([0-9][0-9.\-]*)\s*(?:—|–|-)\s*(.+?)\s*$/);
        if (head) {
            flush();
            cur = {
                id: head[1].replace(/\.$/, ''),
                titre: head[2].trim(),
                categorie: '', prison: '', amende: '', texte: '', _buf: []
            };
            continue;
        }

        // (b) Article en gras inline (dispositions générales, sans barème).
        const bold = line.match(/^\*\*Art\.\s*([0-9][0-9.\-]*)\s*(?:—|–|-)?\s*([^*]*)\*\*\s*(?:—|–|-)?\s*(.*)$/);
        if (bold) {
            flush();
            cur = {
                id: bold[1].replace(/\.$/, ''),
                titre: bold[2].trim(),
                categorie: '', prison: '', amende: '', texte: '', _buf: []
            };
            if (bold[3].trim()) cur._buf.push(bold[3].trim().replace(/\*\*/g, ''));
            continue;
        }

        if (!cur) continue;

        const meta = line.match(/^\s*[-*]\s*\*\*(Cat[ée]gorie|Prison|Amende)\s*:?\s*\*\*\s*:?\s*(.*)$/i);
        if (meta) {
            const key = meta[1].toLowerCase();
            const val = meta[2].trim();
            if (key.indexOf('cat') === 0) cur.categorie = val;
            else if (key === 'prison') cur.prison = val;
            else cur.amende = val;
            continue;
        }
        // Une nouvelle section de haut niveau, ou un filet horizontal,
        // clôt l'article courant (sinon « --- » finit dans le texte).
        if (/^#{1,2}\s/.test(line) || /^-{3,}\s*$/.test(line)) { flush(); continue; }
        if (line.trim()) cur._buf.push(line.trim().replace(/\*\*/g, ''));
    }
    flush();
    return { articles: out, dupes, homonymes, variantes };
}

// ═══════════════════════════════════════════════════════════════════════
// PARSING — CODE DE PROCÉDURE
// Gabarit :  **Art. 2-2-7** — texte…            (parfois + alinéas numérotés)
//            **Art. 6-2-1 — La liberté sous condition** texte…
// ═══════════════════════════════════════════════════════════════════════

function parseProc(md) {
    const lines = md.split(/\r?\n/);
    const out = {};
    let cur = null;
    let titre = '', chapitre = '';

    const flush = () => {
        if (!cur) return;
        cur.texte = cur._buf.join(' ').replace(/\s+/g, ' ').trim();
        delete cur._buf;
        if (!out[cur.id]) out[cur.id] = cur;
        cur = null;
    };

    for (const line of lines) {
        const t = line.match(/^##\s+(Titre\s+.+?)\s*$/i);
        if (t) { flush(); titre = t[1].trim(); chapitre = ''; continue; }
        const c = line.match(/^#{3,4}\s+(.+?)\s*$/);
        if (c) { flush(); chapitre = c[1].trim(); continue; }

        const head = line.match(/^\*\*Art\.\s*([0-9][0-9.\-]*)\s*(?:—|–|-)?\s*([^*]*)\*\*\s*(?:—|–|-)?\s*(.*)$/);
        if (head) {
            flush();
            cur = {
                id: head[1].replace(/\.$/, ''),
                titre: head[2].trim(),
                section: [titre, chapitre].filter(Boolean).join(' · '),
                texte: '', _buf: []
            };
            if (head[3].trim()) cur._buf.push(head[3].trim().replace(/\*\*/g, ''));
            continue;
        }
        if (!cur) continue;
        if (/^#{1,4}\s/.test(line) || /^---\s*$/.test(line)) { flush(); continue; }
        if (line.trim()) cur._buf.push(line.trim().replace(/\*\*/g, ''));
    }
    flush();
    return out;
}

// ═══════════════════════════════════════════════════════════════════════
// ÉMISSION
// ═══════════════════════════════════════════════════════════════════════

const { articles: penal, dupes, homonymes, variantes } = parsePenal(fs.readFileSync(penalPath, 'utf8'));
const proc = parseProc(fs.readFileSync(procPath, 'utf8'));

if (Object.keys(penal).length < 100) fail(`Parsing du code pénal suspect : ${Object.keys(penal).length} articles seulement.`);
if (Object.keys(proc).length < 100) fail(`Parsing du code de procédure suspect : ${Object.keys(proc).length} articles seulement.`);

// Troncature des textes très longs : la couche défense cite le code, elle ne
// le republie pas. 600 caractères suffisent pour une citation exploitable.
function trimTexts(o) {
    for (const k of Object.keys(o)) {
        if (o[k].texte && o[k].texte.length > 600) {
            o[k].texte = o[k].texte.slice(0, 597).replace(/\s+\S*$/, '') + '…';
        }
    }
    return o;
}

const payload = { penal: trimTexts(penal), proc: trimTexts(proc) };

const banner = [
    '/* ═══════════════════════════════════════════════════════════════════════',
    ' *  legal-data.js — GÉNÉRÉ AUTOMATIQUEMENT — NE PAS ÉDITER À LA MAIN',
    ' *',
    ' *  Sources   : legal/' + path.basename(penalPath),
    ' *              legal/' + path.basename(procPath),
    ' *  Régénérer : node tools/build-legal.js',
    ' *',
    ' *  ' + Object.keys(penal).length + ' articles du code pénal · '
        + Object.keys(proc).length + ' articles du code de procédure',
    ' * ═══════════════════════════════════════════════════════════════════ */',
    ''
].join('\n');

const body = [
    '(function (root) {',
    "    'use strict';",
    '    root.LSPD_LEGAL = ' + JSON.stringify(payload) + ';',
    "    if (typeof module !== 'undefined' && module.exports) module.exports = root.LSPD_LEGAL;",
    "})(typeof window !== 'undefined' ? window : globalThis);",
    ''
].join('\n');

fs.writeFileSync(OUT, banner + body, 'utf8');

console.log('✓ legal-data.js écrit');
console.log('  Code pénal     : ' + Object.keys(penal).length + ' articles  (' + path.basename(penalPath) + ')');
console.log('  Code procédure : ' + Object.keys(proc).length + ' articles  (' + path.basename(procPath) + ')');
if (dupes.length) {
    const uniq = [...new Set(dupes)];
    console.log('  ⓘ ' + dupes.length + ' répétition(s) à l’identique, 1re occurrence retenue : '
        + uniq.slice(0, 8).join(', ') + (uniq.length > 8 ? '…' : ''));
}
if (homonymes.length) {
    console.log('  ⚠ ' + homonymes.length + ' article(s) partagent un numéro avec un autre article DIFFÉRENT.');
    console.log('    Conservés sous un identifiant dérivé pour ne rien perdre — à corriger dans la source :');
    homonymes.forEach(h => {
        console.log('      Art. ' + h.num + ' = « ' + h.autre +' »');
        console.log('               et « ' + h.titre + ' »  →  indexé « ' + h.id + ' »');
    });
}
if (variantes.length) {
    console.log('  ⚠ ' + variantes.length + ' écart(s) entre occurrences répétées (1re retenue) :');
    variantes.forEach(v => {
        console.log('      Art. ' + v.num + ' — ' + v.champ);
        console.log('        retenu  : ' + v.retenu);
        console.log('        ignoré  : ' + v.ignore);
    });
}
