# LSPD Justice OS

> SPA ERP pour le Los Santos Police Department — Moteur narratif "Zéro Clavier" pour GTA V RP.
> Application intégrée au Manuel de Révision LSPD (onglet « Terminal »).

## Présentation

**LSPD Justice OS** est une application web mono-page (SPA) permettant aux agents du LSPD de rédiger des rapports d'intervention complets **sans taper de texte libre**. Le système de tags cliquables et de sliders génère automatiquement un compte-rendu narratif en français formel, prêt à être copié ou exporté.

## Fonctionnalités

| Module | Description |
|--------|-------------|
| **Dashboard** | Statistiques de session, gestion du roster, référence rapide des codes radio (intervention + procéduraux) |
| **Rapport de Patrouille** | Narrative builder avec 10-codes, tags (arrivée, action, riposte, conclusion), sliders tactiques, identification suspect + véhicule, calculateur pénal intégré |
| **GND — Stupéfiants** | Saisie de drogue, conditionnement, affiliation gang, armes saisies, calculateur pénal intégré |
| **CID — Crimes Majeurs** | Scène de crime, balistique, empreintes, mandats judiciaires |
| **Interrogatoire** | Procès-verbal avec blocs Q/R dynamiques |
| **Code Pénal** | Calculateur de peines avec fiche de charges auto-générée |

### Entretien guidé (étape 4 du Rapport de Patrouille)

L'étape « Déroulement » n'est **pas** un mur de tags : c'est un **entretien**. L'agent
choisit un scénario, puis répond à une suite de questions ordonnées **à réponses toutes
faites**, affichées **inline** (aucune pop-up, aucun tiroir). Chaque réponse alimente une
**phrase précise du récit** — le rapport final est un texte fluide, pas une énumération.

Un **aperçu du récit se met à jour en direct** sous les questions, et une barre de
progression indique les questions restantes. Les questions conditionnelles n'apparaissent
que si elles ont du sens (ex. « Quelle unité en renfort ? » seulement si un incident a
affecté l'unité).

| # | Scénario | Questions |
|---|----------|-----------|
| 1 | Refus d'obtempérer & course-poursuite | 14 |
| 2 | Accident & dommages collatéraux | 11 |
| 3 | Fusillade & violences armées | 10 |
| 4 | Braquage & prise d'otages | 12 |
| 5 | Stupéfiants, contrebande & perquisition | 8 |
| 6 | Violences domestiques & personnes vulnérables | 7 |
| 7 | Scène de décès / DOA | 10 |
| 8 | Incident spécial | 9 |

Les questions et rédacteurs de récit vivent dans **`interview.js`** (données pures, aucun
DOM) ; le rendu et le câblage sont dans `app.js`. Ajouter un scénario = ajouter une entrée
dans `SCEN` avec ses `questions` et sa fonction `narrate(answers, ctx)`.

Le moteur gère les **contractions françaises** (`de` + voyelle → `d'`, `à` + `le` → `au`,
`que` + voyelle → `qu'`) et l'**exclusivité** des réponses « aucun » (impossible de cocher
« Aucun blessé » *et* « Blessés légers »).

**Exemple de sortie** (refus d'obtempérer) :

> Mon unité, composée du Sgt I LANGFORD Ryker et de l'agent IGNACIO Mendes, a été affectée
> par le dispatch à un appel signalant une attaque sur un ATM au niveau du Kortz Center.
>
> Nous avons immédiatement pris la route, gyrophares et sirène enclenchés. Une fois sur
> place, nous avons constaté qu'un véhicule Chavos V6 de couleur bleue descendait à vive
> allure. Nous avons donc effectué un demi-tour afin de procéder à l'interpellation du
> conducteur. […]

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
index.html       — Structure SPA (6 modules + sidebar + modals)
style.css        — Thème complet + couche d'identité LSPD, responsive 900px
interview.js     — Entretien guidé : 8 scénarios (questions + rédacteurs de récit)
app.js           — Logique applicative (DB, state, moteur narratif, exports)
vendor/leaflet/  — Leaflet auto-hébergé (js, css, images)
```

> `interview.js` est chargé **avant** `app.js` et expose `window.LSPD_IV`
> (`SCEN`, `visibleQuestions`, `progress`, `narrate`). Il ne touche jamais au DOM.

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

