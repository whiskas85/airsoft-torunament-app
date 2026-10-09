#!/usr/bin/env bash
# Il lavoro sul server, mandato da GitHub (.github/workflows/rilascio.yml) con
#   ssh ... 'bash -s -- <comando>' < deploy/server.sh
# oppure lanciato a mano da /opt/tournament-app.
#
#   stato      guarda soltanto: versione, container, memoria, disco, DNS
#   rilascia   la prima volta clona, crea .env.prod con chiavi nuove e accende
#              tutto; le altre volte: backup del database, codice e immagine
#              nuovi, ritorno all'immagine precedente se l'app non risponde.
#              Sempre: proxy collegato alla rete ta-bordo e sito nel proxy.
#
# Variabili facoltative (le passa il workflow):
#   REGISTRO      es. ghcr.io/whiskas85: l'immagine si scarica da lì (tag = commit)
#   RAMO          il ramo da mettere in produzione (predefinito main)
#   SEED_PASSWORD_NUOVA  password degli account demo, solo alla prima installazione
set -euo pipefail

CARTELLA=/opt/tournament-app
REPO=https://github.com/whiskas85/airsoft-torunament-app.git
PROXY_SITI=/opt/gestionale/siti
DOMINIO=tournament-app.zerodarkteam.it
RAMO=${RAMO:-main}
REGISTRO=${REGISTRO:-}

ta() { docker compose -p tournament-app -f "$CARTELLA/docker-compose.prod.yml" --env-file "$CARTELLA/.env.prod" --project-directory "$CARTELLA" "$@"; }

# L'indirizzo di un nome come lo vede internet: chiesto a Cloudflare dal
# container di Caddy, altrimenti al DNS della macchina (come in team-management).
indirizzo() {
  local ip
  ip=$({ docker exec zd-proxy nslookup "$1" 1.1.1.1 2>/dev/null || true; } \
    | awk '/^Address/ && $2 !~ /:/ {print $2; exit}')
  [ -n "$ip" ] || ip=$({ getent ahostsv4 "$1" 2>/dev/null || true; } | awk 'NR==1 {print $1}')
  printf '%s' "$ip"
}

dns_pronto() {
  local nostro questo
  nostro=$(indirizzo ops.zerodarkteam.it)
  questo=$(indirizzo "$DOMINIO")
  echo "DNS: $DOMINIO -> ${questo:-nessun indirizzo} (questa macchina: ${nostro:-?})"
  [ -n "$questo" ] && [ "$questo" = "$nostro" ]
}

salute() {
  local i
  for i in $(seq 1 30); do
    if docker exec ta-app wget -qO- http://127.0.0.1:3100/api/salute 2>/dev/null | grep -q '"ok":true'; then
      return 0
    fi
    sleep 4
  done
  return 1
}

stato() {
  echo "== Codice"
  if [ -d "$CARTELLA/.git" ]; then
    git -C "$CARTELLA" log --oneline -1
    git -C "$CARTELLA" status --short
    git -C "$CARTELLA" fetch -q origin "$RAMO" && {
      echo "== Cosa arriverebbe con il rilascio"
      git -C "$CARTELLA" log --oneline "HEAD..origin/$RAMO" || true
    }
  else
    [ -d "$CARTELLA" ] && echo "installata a mano, senza git: il primo «rilascio» la collega al repository" \
      || echo "non ancora installata: il primo «rilascio» la crea"
  fi
  echo "== .env.prod: $( [ -f "$CARTELLA/.env.prod" ] && echo presente || echo assente )"
  echo "== Container"
  docker ps -a --filter name='^ta-' --format '{{.Names}}\t{{.Image}}\t{{.Status}}'
  echo "== Proxy nella rete ta-bordo"
  docker network inspect ta-bordo --format '{{range .Containers}}{{.Name}} {{end}}' 2>/dev/null || echo "rete assente"
  echo "== Sito nel proxy: $( [ -f "$PROXY_SITI/tournament-app.caddy" ] && echo presente || echo assente )"
  dns_pronto || echo "!! il nome non punta ancora a questa macchina"
  echo "== Salute"
  curl -s --max-time 10 "https://$DOMINIO/api/salute" || echo "(non raggiungibile da fuori)"
  echo
  echo "== Macchina"
  free -h
  df -h /
  docker stats --no-stream --format '{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
}

prima_installazione() {
  if [ -d "$CARTELLA" ]; then
    # installata a mano, senza git: si salva una copia e la cartella diventa
    # una copia del repository. .env.prod e gli altri file ignorati restano.
    echo "== $CARTELLA c'e' gia' ma non e' una copia git: la collego al repository"
    mkdir -p /root/backup
    tar -czf "/root/backup/tournament-app-$(date +%F-%H%M).tgz" -C /opt tournament-app
    echo "copia di sicurezza in /root/backup"
    git -C "$CARTELLA" init -q
    git -C "$CARTELLA" remote add origin "$REPO" 2>/dev/null || git -C "$CARTELLA" remote set-url origin "$REPO"
    git -C "$CARTELLA" fetch -q origin "$RAMO"
    git -C "$CARTELLA" checkout -q -f -B "$RAMO" "origin/$RAMO"
  else
    echo "== Prima installazione in $CARTELLA"
    git clone -q --branch "$RAMO" "$REPO" "$CARTELLA"
  fi
}

crea_env() {
  local seed=${SEED_PASSWORD_NUOVA:-}
  [ -n "$seed" ] || seed=$(openssl rand -hex 8)
  umask 077
  cat > "$CARTELLA/.env.prod" <<EOF
# Creato dal primo rilascio il $(date +%F). Solo sul server, mai nel repository.
POSTGRES_USER=torneo
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=torneo
SESSION_SECRET=$(openssl rand -hex 32)
DOMINIO=$DOMINIO
# 1 = crea i dati demo FIGT, solo se il database è vuoto
SEED_DEMO=1
SEED_PASSWORD=$seed
EOF
  chmod 600 "$CARTELLA/.env.prod"
  echo ".env.prod creato con chiavi nuove (password degli account demo: $( [ -n "${SEED_PASSWORD_NUOVA:-}" ] && echo 'quella del secret SEED_PASSWORD' || echo "in $CARTELLA/.env.prod" ))"
}

backup() {
  docker ps -q --filter name='^ta-db$' | grep -q . || return 0
  mkdir -p "$CARTELLA/backup"
  local f
  f="$CARTELLA/backup/torneo-$(date +%F-%H%M).sql.gz"
  docker exec ta-db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$f"
  chmod 600 "$f"
  echo "backup: $f ($(du -h "$f" | cut -f1))"
  # se ne tengono dieci
  ls -1t "$CARTELLA"/backup/torneo-*.sql.gz | tail -n +11 | xargs -r rm -f
}

immagine() {
  local commit
  commit=$(git -C "$CARTELLA" rev-parse HEAD)
  # l'immagine che gira adesso, per tornare indietro
  docker image inspect tournament-app:latest > /dev/null 2>&1 \
    && docker tag tournament-app:latest tournament-app:precedente
  if [ -n "$REGISTRO" ] && [ "$(uname -m)" = x86_64 ] \
    && docker pull -q "$REGISTRO/tournament-app:$commit" > /dev/null; then
    docker tag "$REGISTRO/tournament-app:$commit" tournament-app:latest
    echo "immagine $commit scaricata dal registro"
  else
    echo "!! immagine non nel registro: la costruisco qui (serve circa un giga di memoria)"
    docker build -q -t tournament-app:latest "$CARTELLA"
  fi
}

proxy() {
  docker network inspect ta-bordo --format '{{range .Containers}}{{.Name}} {{end}}' \
    | grep -qw zd-proxy || docker network connect ta-bordo zd-proxy
  if ! dns_pronto; then
    echo "!! $DOMINIO non punta ancora a questa macchina: il sito nel proxy non lo accendo"
    echo "   (Caddy chiederebbe il certificato a vuoto). Rilanciare il rilascio dopo il DNS."
    return 0
  fi
  if ! cmp -s "$CARTELLA/deploy/tournament-app.caddy" "$PROXY_SITI/tournament-app.caddy"; then
    cp "$CARTELLA/deploy/tournament-app.caddy" "$PROXY_SITI/tournament-app.caddy"
    docker exec zd-proxy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile > /dev/null
    docker exec zd-proxy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile \
      || docker restart zd-proxy
    echo "sito nel proxy aggiornato"
  fi
}

rilascia() {
  if [ -d "$CARTELLA/.git" ]; then
    git -C "$CARTELLA" fetch -q origin "$RAMO"
    git -C "$CARTELLA" checkout -q "$RAMO"
    git -C "$CARTELLA" merge -q --ff-only "origin/$RAMO"
  else
    prima_installazione
  fi
  echo "== Codice: $(git -C "$CARTELLA" log --oneline -1)"
  [ -f "$CARTELLA/.env.prod" ] || crea_env

  echo "== Backup"
  backup
  echo "== Immagine"
  immagine
  echo "== Avvio"
  ta up -d --no-build
  if salute; then
    echo "l'app risponde"
  else
    docker logs ta-app --tail 40 2>&1 | grep -viE 'password|secret' || true
    if docker image inspect tournament-app:precedente > /dev/null 2>&1; then
      echo "!! l'app nuova non risponde: torno all'immagine precedente (il database resta com'è; backup sopra)"
      docker tag tournament-app:precedente tournament-app:latest
      ta up -d --no-build
    fi
    exit 1
  fi
  echo "== Proxy"
  proxy
  echo "== Pulizia"
  docker image prune -f --filter until=24h > /dev/null
  echo "== Controllo da fuori"
  sleep 5
  curl -s --max-time 20 "https://$DOMINIO/api/salute" || echo "(ancora non raggiungibile: il certificato può richiedere un minuto)"
  echo
}

case "${1:-stato}" in
  stato) stato ;;
  rilascia) rilascia ;;
  *) echo "uso: $0 stato|rilascia"; exit 2 ;;
esac
