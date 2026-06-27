#!/usr/bin/env bash
# =============================================================================
#  maintenance.sh — bascule le site lenavire.duckdns.org en mode maintenance.
#
#  Principe : crée/supprime un fichier-drapeau ".maintenance" à la racine du
#  site. La conf nginx teste sa présence à CHAQUE requête (-f $document_root/
#  .maintenance) et renvoie alors un 503 + la page 50x.html, sur tout le site.
#
#  Aucun reload nginx nécessaire : le test est fait par requête, en direct.
#
#  Usage :
#     sudo ./maintenance.sh on        # active la maintenance (503)
#     sudo ./maintenance.sh off       # rétablit le site
#     sudo ./maintenance.sh status    # affiche l'état courant
#
#  Racine du site : variable d'env WEBROOT (défaut /var/www/lenavire).
#     sudo WEBROOT=/var/www/site-pa ./maintenance.sh on
# =============================================================================
set -euo pipefail

WEBROOT="${WEBROOT:-/var/www/lenavire}"
FLAG="$WEBROOT/.maintenance"

c_red=$'\033[31m'; c_grn=$'\033[32m'; c_ylw=$'\033[33m'; c_rst=$'\033[0m'

die() { printf '%serreur :%s %s\n' "$c_red" "$c_rst" "$1" >&2; exit 1; }

usage() {
  cat >&2 <<EOF
Usage : $(basename "$0") {on|off|status}

  on       Active la maintenance — le site renvoie 503 (page 50x.html).
  off      Désactive la maintenance — le site redevient accessible.
  status   Affiche l'état courant.

Racine du site (WEBROOT) : $WEBROOT
EOF
  exit 1
}

[ $# -eq 1 ] || usage
[ -d "$WEBROOT" ] || die "racine introuvable : $WEBROOT (définis WEBROOT=/chemin/du/site)"

case "$1" in
  on|start|enable)
    : > "$FLAG"
    printf '%sMAINTENANCE ACTIVÉE%s — le site renvoie désormais 503.\n' "$c_ylw" "$c_rst"
    printf 'Drapeau : %s\n' "$FLAG"
    ;;
  off|stop|disable)
    rm -f "$FLAG"
    printf '%sMAINTENANCE DÉSACTIVÉE%s — le site est de nouveau en ligne.\n' "$c_grn" "$c_rst"
    ;;
  status)
    if [ -f "$FLAG" ]; then
      printf 'État : %sMAINTENANCE (ON)%s  [%s]\n' "$c_ylw" "$c_rst" "$FLAG"
    else
      printf 'État : %sEN LIGNE (OFF)%s\n' "$c_grn" "$c_rst"
    fi
    ;;
  -h|--help|help) usage ;;
  *) usage ;;
esac
