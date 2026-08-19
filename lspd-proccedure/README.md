# LSPD Justice OS

> SPA ERP pour le Los Santos Police Department — Moteur narratif "Zéro Clavier" pour GTA V RP.
> Application intégrée au Manuel de Révision LSPD (onglet « Terminal »).

## Présentation

**LSPD Justice OS** est une application web mono-page (SPA) permettant aux agents du LSPD de rédiger des rapports d'intervention complets **sans taper de texte libre**. Le système de tags cliquables et de sliders génère automatiquement un compte-rendu narratif en français formel, prêt à être copié ou exporté.

## Fonctionnalités

| Module | Description |
|--------|-------------|
| **Dashboard** | Statistiques de session, gestion du roster, référence rapide des codes radio (intervention + procéduraux) |
| **Rapport Rapide** | Blocs de procédure pré-rédigés, chronologie horodatée, contrôle de complétude bloquant et préparation à la défense |
| **Rapport de Patrouille** | Narrative builder avec 10-codes, tags (arrivée, action, riposte, conclusion), sliders tactiques, identification suspect + véhicule, calculateur pénal, contrôle de complétude bloquant et préparation à la défense |
| **GND — Stupéfiants** | Saisie de drogue, conditionnement, affiliation gang, armes saisies, calculateur pénal intégré |
| **CID — Crimes Majeurs** | Scène de crime, balistique, empreintes, mandats judiciaires |
| **Interrogatoire** | Procès-verbal avec blocs Q/R dynamiques |
| **Code Pénal** | Calculateur de peines avec fiche de charges auto-générée |

### Complétude & conformité légale (Rapport Rapide + Rapport de Patrouille)

Les deux modules d'arrestation sont adossés aux deux codes de `legal/` : un rapport
incomplet **n'est pas validable**, et chaque exigence est rattachée à son article.

Une section « Chronologie & conformité » est rendue **à l'identique** dans les deux
modules depuis une spec unique (`COMPLIANCE_FIELDS`). Les champs n'apparaissent que
lorsqu'ils s'appliquent : pas de blessé, pas de champ médical.

| | Rapport Rapide | Rapport de Patrouille |
|---|---|---|
| Point de montage | section de la colonne saisie | étape 5 du rail de progression |
| Source du contexte | blocs `RAPPORT_BLOCKS` + champs `#rf*` | `state.patrol.tags` + fiches personnes + véhicule |
| Blocage | bouton « ✓ Valider » | avant l'ouverture du récap de génération |

**La règle de validation est double**, et les deux conditions sont cumulatives :

1. la complétude atteint **90 %** des éléments applicables ;
2. **aucun élément critique** ne manque.

La seconde n'est pas redondante : sur un dossier lourd (plus de vingt items
applicables), deux omissions laissent encore le score au-dessus de 90 % alors qu'il
peut manquer, par exemple, l'heure de sortie médicale exigée par l'Art. 2-4-4. Les
éléments critiques sont l'énumération de l'**Art. 2-2-7** (date, identité, date de
naissance, heure d'arrestation, résultats de fouille, charges) et les obligations
conditionnelles (Art. 123, 2-4-1, 2-4-2, 2-4-4, 5-3-1). Ils ne se compensent pas.

Chaque élément manquant produit une **relance** : la question posée à l'agent,
l'article qui la fonde, et un bouton qui l'amène directement au champ concerné.

### Palpation de sécurité ou fouille

Le Titre IV du code de procédure sépare deux régimes que l'application ne
confondait pas moins jusqu'ici. Le champ « Nature du contrôle effectué » les
distingue désormais, et tout le reste en découle : les champs proposés, le
paragraphe rédigé et les articles cités.

| | Palpation de sécurité (ch. 2) | Fouille (ch. 1) |
|---|---|---|
| Finalité | sûreté — écarter un objet dangereux (4-2-3) | preuve — rechercher des éléments (4-1-2) |
| Condition | nécessité pour la sécurité (4-2-2), **jamais systématique** (4-2-1) | suspicion raisonnable sur éléments objectifs (4-1-2, 4-1-3) |
| Droits | pas d'antériorité exigée | **énoncés au préalable** (4-1-4) |
| Même sexe | — | dans la mesure du possible (4-1-1) |
| Discrétion | à l'abri du public si possible (4-2-4) | — |
| Suites | scellés au régime général (7-3-1) | inventaire détaillé + scellés (4-1-5, 4-1-6) |

Deux motifs contraires au code sont proposés dans les listes et signalés comme
faiblesses par la fiche de défense : la palpation « systématique », que
l'Art. 4-2-1 exclut, et la fouille fondée sur les antécédents judiciaires, que
l'Art. 4-1-3 écarte expressément.

### Préparer la défense

Une fois le rapport validé, le bouton **⚖ Défense** produit une fiche de préparation
à l'audience RP, au format `question probable → article → ce que le rapport y répond
→ à défaut, ce qu'il faut ajouter` :

1. **Délais** — arithmétique réelle sur les heures saisies (flagrance 20 min,
   présentation au procureur 30/45/60 min selon la gravité, surveillance médicale
   1 h, recours à l'avocat), chacun confronté à son plafond légal ;
2. **Qualification des charges** — chaque charge rattachée à son article, les charges
   non qualifiées signalées ;
3. **Points d'attaque** groupés par phase (contrôle initial → poursuite → usage de la
   force → interpellation → fouille & scellés → droits & avocat → médical → suites) ;
4. **À corriger avant de se présenter**.

Les points d'attaque propres à une qualification sont couverts : l'Art. 431-7 exige
une sommation claire, l'Art. 607 se distingue des Art. 605/606 par l'absence de
preuve radar, une charge d'arme suppose une arme saisie et placée sous scellés.

### Recherche

| Fonctionnalité | Détail |
|----------------|--------|
| **Recherche globale** (`Ctrl+K`) | Overlay de recherche unifié : code pénal, codes radio, indicatifs 10-codes, unités |
| **Filtre inline par module** | Barre de filtre `⌕` dans chaque section Charges & Amendes (Patrouille, GND, Code Pénal) avec mise en évidence des correspondances |

### Calculateur pénal

| Fonctionnalité | Détail |
|----------------|--------|
| **Calcul unitaire** | Pour les infractions à taux variable (drogues, munitions, objets volés…), saisie de la quantité avec aperçu en temps réel `fine × qty` |
| **Prison variable** | Pour les crimes à seuil (`≥ 750 pochons`, fraude fiscale…), calcul automatique `base + ⌈qty/seuil⌉ jours` |
| **Rapport de charges** | Fiche générée avec `[×N unité]` et total correct quand une quantité > 1 est renseignée |

**Items avec quantité configurable :**
`Héroïne` · `Cannabis` · `Cocaïne` · `Crack` · `Ecstasy` · `Fentanyl` · `Méthamphétamine` · `Graines / produits transformables` · `Munitions non autorisées` · `Production de cannabis` · `Recel d'objet volé` · `Vente de drogue` · `Amendes impayées` · `Détention/stockage de drogue (≥ 750)` · `Importation/exportation de drogue (≥ 750)` · `Trafic de drogue (≥ 750)` · `Fraude fiscale`

## Rapport final : zéro code radio

Les 10-codes et status codes servent **uniquement de déclencheurs dans l'interface**
(sélecteurs, chaîne chronologique, référence Dashboard). Le **rapport généré est
toujours rédigé en langage clair** : chaque code est reformulé (« refus d'obtempérer »,
« fusillade », « intervention urgente avec sirènes »…). Un filtre de sortie
(`sanitizeRadioCodes`) est appliqué à tous les rapports (Patrouille, GND, CID,
interrogatoire, fiche de charges), aux exports, à l'aperçu du récap, aux éditions
manuelles et aux réponses de l'IA — aucun code radio ne peut subsister dans le texte final.

## Stack technique

- **HTML / CSS / JS** pur — aucun framework, aucune dépendance CDN
- Thème navy/gold aligné sur le **Manuel de Révision LSPD** (tokens CSS partagés)
- Polices : Oswald (titres) + Barlow (UI) + JetBrains Mono (données) — auto-hébergées
  via `../fonts.css` du site parent
- Leaflet 1.9.4 **vendorisé** (`vendor/leaflet/`) pour la carte GTA
- Persistance du roster via `localStorage` (migration automatique des anciennes clés `bcso_*`)
- Export : Markdown (Discord) + Texte brut (.txt)

## Structure

```
index.html        — Structure SPA (6 modules + sidebar + modals)
style.css         — Thème complet + couche d'identité LSPD, responsive 900px
legal/            — CODE PÉNAL.md + Code de procédure (sources de vérité)
legal-data.js     — GÉNÉRÉ depuis legal/ par tools/build-legal.js
legal-rules.js    — Checklist, règles de délai, table infraction → article
defense.js        — Construction de la fiche de préparation à l'audience
app.js            — Logique applicative (DB, state, moteur narratif, exports)
tools/            — build-legal.js (compilation) + test-scenarios.js (banc de test)
vendor/leaflet/   — Leaflet auto-hébergé (js, css, images)
```

> `legal-data.js`, `legal-rules.js` et `defense.js` sont chargés **avant** `app.js`
> et exposent `window.LSPD_LEGAL`, `window.LSPD_RULES` et `window.LSPD_DEFENSE`.
> Ce sont des données et fonctions pures : ils ne touchent jamais au DOM.

### Régénérer les données légales

`legal-data.js` est **généré** — ne pas l'éditer à la main. Après toute modification
des `.md` de `legal/` :

```bash
node tools/build-legal.js
```

La précompilation n'est pas un choix de confort : la CSP de la page est
`connect-src https://*.workers.dev` (sans `'self'`), donc un `fetch()` same-origin
des `.md` serait bloqué par le navigateur. Un `<script src>` passe par
`script-src 'self'`, sans toucher à la CSP.

### Bancs de test

```bash
node tools/test-scenarios.js          # 46 assertions — checklist & défense
node tools/test-scenarios.js --print  # + un exemple de fiche de défense
node tools/test-reference-report.js   # fidélité au modèle de rapport du DOJ
node tools/test-reference-report.js --print   # + le rapport généré
node tools/test-palpation-fouille.js  # distinction des deux régimes du Titre IV
node tools/test-palpation-fouille.js --print  # + les deux paragraphes produits
```

`test-scenarios.js` couvre trois scénarios — interpellation simple, poursuite avec
collision, usage d'arme avec blessure et avocat — et vérifie que la checklist
s'adapte au contexte, qu'un rapport incomplet est refusé, et que la fiche de défense
cite les bons articles.

`test-reference-report.js` pilote l'application dans Chrome headless, saisit les
données du rapport de référence du DOJ et contrôle que le texte produit conserve
**la structure du modèle** (8 paragraphes, mêmes temps forts dans le même ordre) et
n'omet **aucune** des 29 informations qu'il contient. Le rapport généré peut être
plus riche que le modèle — il porte des mentions que le code exige et que le modèle
n'a pas (justification de l'usage de la force au titre des Art. 121 et 123,
résultats de fouille au titre de l'Art. 2-2-7) — mais jamais plus pauvre.

`test-palpation-fouille.js` vérifie sur une même intervention que basculer de la
palpation à la fouille change les champs proposés, le paragraphe rédigé et les
articles cités, dans les deux modules.

## Lancement

Ouvrir `index.html` dans un navigateur. Aucune installation requise.

## Sécurité

- Content-Security-Policy strict (`script-src 'self'`, `default-src 'none'`)
- Échappement HTML systématique (`escapeHtml()`) sur toutes les insertions dynamiques
- Validation et sanitisation des données `localStorage` au chargement
- Limites de taille sur les champs (HTML `maxlength` + JS `.slice()`)
- Cap du roster à 50 agents
- IIFE pour isolation du scope global
- Aucune dépendance CDN : polices et Leaflet auto-hébergés (seules les tuiles de la
  carte GTA et le Worker IA sont distants, autorisés explicitement par la CSP)

## Utilisation

1. **Ajouter des agents** depuis le Dashboard (Grade, Nom, Matricule)
2. **Naviguer** vers un module via la sidebar
3. **Sélectionner les tags** correspondant à l'intervention
4. **Cocher les infractions** — saisir la quantité si applicable
5. **Générer** le rapport en un clic
6. **Copier** ou **Exporter** (Markdown / Texte)

## Déploiement du Worker Cloudflare

Le fichier `worker.js` est un proxy CORS stateless qui relaie les requêtes
vers l'API Anthropic. La clé API n'est jamais stockée côté Worker : elle
est fournie par le navigateur via le header `x-api-key`.

```bash
# Première fois
npm install -g wrangler
wrangler login

# Déploiement
wrangler deploy
```

La configuration est définie dans `wrangler.toml` (`name = "lspd-proxy"`).
Une fois déployé, l'URL est de la forme :

```
https://lspd-proxy.<account>.workers.dev
```

## Configuration de l'IA

1. Cliquer sur **⚙ Claude AI** dans le bas de la sidebar.
2. Renseigner :
   - **Clé API Anthropic** : `sk-ant-...`
   - **URL Worker** : l'URL obtenue à l'étape précédente.
3. Sauvegarder.

Les valeurs sont conservées dans `localStorage`. La clé ne quitte jamais
le navigateur excepté vers le Worker (lui-même relayant directement vers
Anthropic).

## Codes radio supportés

### 10-Codes d'intervention

| Code | Signification |
|------|---------------|
| 10-14 | Escorte / Convoi |
| 10-27 | Sujet recherché (APB / BOLO) |
| 10-29 | Vérification mandat / dossier citoyen |
| 10-31 | Coups de feu |
| 10-32 | Fusillade |
| 10-35 | Demande de renfort |
| 10-37 | Cambriolage |
| 10-38 | Contrôle routier |
| 10-40 | Braquage Supérette / Binco |
| 10-50 | Accident |
| 10-51 | Accident grave (fin de poursuite) |
| 10-52 | Appel EMS |
| 10-55 | Délit de fuite |
| 10-56 | Refus d'obtempérer |
| 10-57 | Vol véhicule |
| 10-60 | Vente drogue |
| 10-61 | Braquage Banque |
| 10-62 | Braquage Bijouterie |
| 10-74 | Racket / Smash and Grab |

### 10-Codes procéduraux

| Code | Signification |
|------|---------------|
| 10-1 | Fréquence compromise |
| 10-2 | Signal clair, bonne réception |
| 10-3 | Retour/arrivée fréquence |
| 10-4 | Bien reçu |
| 10-6 | Occupé (sauf urgence) |
| 10-7 | Indisponible (sauf urgence, radio coupée) |
| 10-8 | Début de patrouille / service |
| 10-9 | Répéter la dernière transmission |
| 10-10 | Fin de patrouille / service |
| 10-12 | Attente de dispatch |
| 10-15 | Transport de suspect |
| 10-17 | Refuel / Essence |
| 10-19 | En route vers... (préciser localisation) |
| 10-20 | Votre localisation |
| 10-22 | Annuler / Ignorer la dernière transmission |
| 10-98 | Retour en patrouille |

### Status codes & codes spéciaux

| Code | Signification |
|------|---------------|
| Code 2 | Réponse urgente sans sirènes |
| Code 3 | Réponse urgente avec sirènes |
| Code 4 | Situation sous contrôle |
| Code 4-ADAM | Sous contrôle, pas de renforts |
| Code 5 | Stake-out / Surveillance |
| Code 6 | En intervention |
| Code 99 | Tous les agents répondent |
| Code ROBERT | Requête pour déploiement d'**arme lourde** |
| Code SAM | Requête pour déploiement d'un **beanbag** |
| Sitrep | Situation Report — État de la situation |

## Licence

[MIT](LICENSE) — voir le fichier `LICENSE`.

