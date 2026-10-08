# Messa in produzione

L'app tornei gira **sulla stessa macchina del team-management** (VPS Aruba, 4 GB), ma in **container suoi**:
`ta-app` (l'app) e `ta-db` (il suo Postgres). Il proxy Caddy già presente (`zd-proxy`) le porta il traffico
di `tournament-app.zerodarkteam.it`, con il certificato Let's Encrypt che chiede da solo.

```
internet ──443──▶ zd-proxy (Caddy, del team-management)
                     │  rete ta-bordo (solo proxy e app)
                     ▼
                  ta-app :3100 ──rete interna──▶ ta-db :5432 (nessuna porta pubblicata)
```

## Una volta sola

1. **DNS**: record `A` di `tournament-app.zerodarkteam.it` verso l'indirizzo pubblico della macchina.
   Va fatto *prima* di accendere il sito: Caddy chiede subito il certificato.
2. **Codice** sulla macchina:
   ```bash
   git clone https://github.com/whiskas85/airsoft-torunament-app.git /opt/tournament-app
   cd /opt/tournament-app
   cp .env.prod.example .env.prod && chmod 600 .env.prod   # e compilarlo
   ```
3. **Avvio**:
   ```bash
   docker compose -p tournament-app -f docker-compose.prod.yml --env-file .env.prod up -d --build
   docker network connect ta-bordo zd-proxy
   ```
4. **Sito nel proxy**: copiare `deploy/tournament-app.caddy` in `/opt/gestionale/siti/` e riavviare il proxy
   (il Caddyfile è montato come file: un reload rilegge quello vecchio).
   ```bash
   cp deploy/tournament-app.caddy /opt/gestionale/siti/
   docker restart zd-proxy
   ```
5. Controllo: `curl https://tournament-app.zerodarkteam.it/api/salute` → `{"ok":true}`.

## Aggiornamenti

```bash
cd /opt/tournament-app && git pull
docker compose -p tournament-app -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker network connect ta-bordo zd-proxy 2>/dev/null || true   # se il proxy è stato ricreato
```

All'avvio il container applica solo le migrazioni mancanti (`prisma migrate deploy`): un riavvio non cancella dati.

## Memoria

La macchina ha 4 GB condivisi con i gestionali. Tetti iniziali: `ta-db` 384 MB, `ta-app` 512 MB.
Da rivedere con le misure reali (`docker stats ta-app ta-db`). Se non bastano, l'app si sposta su una
macchina sua senza cambiare nulla: ha già dominio e database propri.

## Attenzione

- Il repository è **pubblico**: `.env.prod`, indirizzi e chiavi del server non si scrivono qui.
- `docker compose ... down -v` **cancella il database**.
