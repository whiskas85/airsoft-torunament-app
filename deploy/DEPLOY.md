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

## Rilascio da GitHub (come il team-management)

**Actions → Rilascio → Run workflow**, dal ramo `main`:

- `prova`: si collega al server e guarda soltanto (codice, container, rete del proxy, DNS, memoria).
- `rilascio`: costruisce l'immagine su GitHub e la pubblica in `ghcr.io/whiskas85/tournament-app:<commit>`,
  poi sul server lancia `deploy/server.sh rilascia`:
  - **la prima volta** clona in `/opt/tournament-app` e crea `.env.prod` con chiavi nuove (password del
    database e chiave di sessione generate sul server, mai nel log) e i dati demo;
  - poi: backup del database in `/opt/tournament-app/backup` (gli ultimi dieci), immagine nuova,
    **ritorno all'immagine precedente** se l'app non risponde;
  - sempre: `zd-proxy` collegato alla rete `ta-bordo` e `deploy/tournament-app.caddy` copiato in
    `/opt/gestionale/siti/` con reload del proxy, **solo se il DNS punta già alla macchina**.

### Da fare una volta sola

1. **DNS**: record `A` di `tournament-app.zerodarkteam.it` verso lo stesso indirizzo di `ops.zerodarkteam.it`.
2. **Secret del repository** (Settings → Secrets and variables → Actions), gli stessi del team-management:
   `SERVER_USER`, `SERVER_SSH_KEY`. Facoltativo `SEED_PASSWORD`: la password degli account demo
   (se manca, ne viene generata una e resta in `/opt/tournament-app/.env.prod`).
3. Lanciare `rilascio`. Controllo: `https://tournament-app.zerodarkteam.it/api/salute` → `{"ok":true}`.

Se il DNS arriva dopo il primo rilascio, basta rilanciarlo: accende il sito nel proxy.

## A mano, sul server

```bash
cd /opt/tournament-app && bash deploy/server.sh stato
RAMO=main bash deploy/server.sh rilascia      # senza REGISTRO costruisce l'immagine sul server
```

All'avvio il container applica solo le migrazioni mancanti (`prisma migrate deploy`): un riavvio non cancella dati.

## Memoria

La macchina ha 4 GB condivisi con i gestionali. Tetti iniziali: `ta-db` 384 MB, `ta-app` 512 MB.
Da rivedere con le misure reali (`docker stats ta-app ta-db`). Se non bastano, l'app si sposta su una
macchina sua senza cambiare nulla: ha già dominio e database propri.

## Attenzione

- Il repository è **pubblico**: `.env.prod`, indirizzi e chiavi del server non si scrivono qui.
- `docker compose ... down -v` **cancella il database**.
