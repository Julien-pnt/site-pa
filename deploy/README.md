# Déploiement — lenavire.duckdns.org

Site **statique** (HTML/CSS/JS, aucune base de données). Servi par nginx en HTTPS.

## 1. Fichiers à déployer

Copie le contenu du site dans la racine web `/var/www/lenavire/` :

```
/var/www/lenavire/
├── lspd-revision.html      ← page d'accueil (index)
├── app.js
├── disclaimer.js           ← briefing affiché à chaque connexion
├── styles.css
├── fonts.css               ← @font-face (polices auto-hébergées)
├── 403.html  404.html  405.html  50x.html   ← pages d'erreur
└── assets/                 ← images, favicons, insignes, fonts/ (woff2)…
```

```bash
sudo mkdir -p /var/www/lenavire /var/www/certbot
sudo rsync -a --delete ./ /var/www/lenavire/ \
  --exclude '.git' --exclude '.claude' --exclude 'deploy'
sudo chown -R www-data:www-data /var/www/lenavire
```

> La page d'accueil reste `lspd-revision.html` (directive `index`). Pour une URL plus
> classique tu peux la renommer `index.html` et adapter `index` dans le `.conf`.

## 2. DNS (DuckDNS)

Sur https://www.duckdns.org : le sous-domaine **lenavire** doit pointer vers l'IP publique
du serveur. Garde le updater DuckDNS actif (cron) si ton IP est dynamique :

```bash
# exemple cron toutes les 5 min
*/5 * * * * curl -s "https://www.duckdns.org/update?domains=lenavire&token=TON_TOKEN&ip="
```

Ouvre les ports **80** et **443** (firewall / box).

## 3. nginx + certificat Let's Encrypt

```bash
sudo apt install nginx certbot
sudo cp deploy/lenavire.duckdns.org.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/lenavire.duckdns.org.conf /etc/nginx/sites-enabled/

# 1er certificat via le challenge webroot (le bloc :80 du .conf sert /.well-known)
sudo certbot certonly --webroot -w /var/www/certbot -d lenavire.duckdns.org

sudo nginx -t && sudo systemctl reload nginx
```

Renouvellement auto : le timer `certbot.timer` est installé par défaut. Vérifie :

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

## 4. Vérification sécurité

```bash
curl -sI https://lenavire.duckdns.org | grep -i -E 'strict-transport|content-security|x-frame|x-content|referrer|permissions-policy'
```

Tests en ligne recommandés :
- **https://securityheaders.com** → vise A/A+
- **https://www.ssllabs.com/ssltest/** → vise A/A+ (TLS 1.2+1.3, pas de protocole faible)
- **https://csp-evaluator.withgoogle.com** → coller la CSP

## Belles URLs (routeur)

Chaque section a son URL propre. Le **routeur JS** (`app.js`) met à jour l'URL au clic
(History API), lit l'URL au chargement pour ouvrir le bon onglet, et gère les boutons
précédent/suivant du navigateur. Côté serveur, le `.conf` sert la page unique pour ces
chemins (et redirige `/grades/` → `/grades` pour ne pas casser les chemins relatifs).

| URL | Section |
|---|---|
| `/` ou `/grades` | Grades & Insignes |
| `/tenues` | Tenues & Apparence |
| `/codes-penaux` | Codes Pénaux |
| `/codes-radio` | Codes Radio |
| `/miranda` | Droits Miranda |
| `/procedures` | Procédures |
| `/traffic-stop` | Traffic & Felony Stop |
| `/divisions` | Divisions |
| `/quiz` | Quiz |

Les URLs inconnues renvoient un vrai **404** (page d'erreur LSPD). Les liens sont
partageables et rechargeables.

## Mode maintenance

Bascule le site en **503** (page « Central hors service ») le temps d'une intervention,
sans toucher à nginx :

```bash
sudo WEBROOT=/var/www/lenavire deploy/maintenance.sh on      # site -> 503
sudo WEBROOT=/var/www/lenavire deploy/maintenance.sh status  # état courant
sudo WEBROOT=/var/www/lenavire deploy/maintenance.sh off     # site rétabli
```

Le script crée/supprime un drapeau `.maintenance` à la racine du site. La conf nginx
teste sa présence **à chaque requête** (`if (-f $document_root/.maintenance)`), donc la
bascule est instantanée — **aucun `reload`** nécessaire. Le fichier est masqué du web
(règle « fichiers cachés ») et la page d'erreur garde ses assets (pas de boucle).

> `WEBROOT` est optionnel (défaut `/var/www/lenavire`). Rends le script exécutable une
> fois : `chmod +x deploy/maintenance.sh`.

## Avertissement à chaque connexion (disclaimer)

Au chargement de la page, un **briefing** s'affiche (arrière-plan flouté) rappelant que
les notes sont celles d'un joueur, qu'il faut d'abord se faire confiance et que ce n'est
qu'une aide. L'utilisateur coche la case d'acceptation puis **Valider** pour entrer.
Géré par `disclaimer.js` (chargé en `defer`, conforme à la CSP `script-src 'self'`),
sans `localStorage` : il réapparaît à chaque connexion.

## Durcissement appliqué (rappel)

| Élément | Détail |
|---|---|
| Redirection | 80 → 443 (301), HSTS 2 ans |
| TLS | 1.2 + 1.3 uniquement, ciphers ECDHE/AEAD, OCSP stapling, tickets off |
| CSP | `script-src 'self'` (aucun script inline), `style-src 'self' 'unsafe-inline'`, `font-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'` |
| Polices | **auto-hébergées** (woff2 latin + latin-ext) — aucune dépendance tierce, aucune fuite d'IP vers Google |
| En-têtes | X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy no-referrer, Permissions-Policy, COOP/CORP |
| Divers | `server_tokens off`, méthodes limitées à GET/HEAD, fichiers cachés bloqués, body max 1 Mo |
| Cache | assets 30 j (`expires`, sans casser l'héritage des en-têtes), HTML `no-cache` |
| Erreurs | pages 403 / 404 / 405 / 50x personnalisées (thème LSPD) |

> Note : `frame-ancestors` et HSTS ne sont efficaces qu'en **en-tête HTTP** (ici via nginx),
> pas en `<meta>` — c'est pour ça que cette conf complète le `<meta>` CSP déjà présent dans la page.
