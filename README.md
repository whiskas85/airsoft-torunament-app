# Tournament App

Gestione dei tornei di softair: luci verdi, schede punteggio, firme, contestazioni, esfiltrazioni e classifiche,
con **arbitri e squadre che lavorano anche completamente offline**.

L'app è **generica**: le regole di un ente (es. una federazione) e delle sue tipologie di gara (es. PLR e PCR)
sono **dati di configurazione**, non codice. Nel seed c'è una configurazione d'esempio ricavata dai regolamenti FIGT.

## Documenti

| | |
|---|---|
| [docs/requisiti.md](docs/requisiti.md) | Requisiti funzionali (principi P1–P11, ruoli, template, luci verdi, esfiltrazione, contestazioni, classifiche) |
| [docs/modello-dati.md](docs/modello-dati.md) | Modello dei dati: configurazione congelata + registro delle operazioni di gara |
| [docs/piano-demo.md](docs/piano-demo.md) | Tappe M1–M6 verso la demo |
| [docs/analisi-regolamenti-figt.md](docs/analisi-regolamenti-figt.md) | Cosa dicono i regolamenti FIGT e come diventano configurazione |
| [docs/analisi-team-management.md](docs/analisi-team-management.md) | Rapporto con il gestionale delle squadre e con il server |
| [deploy/DEPLOY.md](deploy/DEPLOY.md) | Messa in produzione su `tournament-app.zerodarkteam.it` |

## Stack

Next.js 15 (App Router, server actions) · React 19 · TypeScript · Prisma 6 · PostgreSQL 16 · Tailwind.
Lo stesso del team-management, per riusare competenze e rilascio.

## Sviluppo in locale

```bash
npm install
cp .env.example .env
docker compose up -d db          # Postgres su localhost:5442
npx prisma migrate dev           # crea lo schema
npm run db:seed                  # configurazione FIGT d'esempio, squadre ed eventi demo
npm run dev                      # http://localhost:3100
```

Con `DEBUG_LOGIN=1` (già impostato in `.env.example`) la pagina di accesso mostra un **pulsante per ogni account
di prova**: si entra con un clic, senza password. In produzione è spento (`0`) se non lo si accende dal rilascio (opzione `debug`, vedi [DEPLOY](deploy/DEPLOY.md)).

Account di prova (password = `SEED_PASSWORD` in `.env`):

| Account | Ruolo |
|---|---|
| `admin@demo.torneo` | Amministratore dell'ente (vede configurazione e tabella punteggi) |
| `direzione@demo.torneo` | Direzione gara degli eventi demo |
| `arbitro1@demo.torneo` … `arbitro4@demo.torneo` | Capo arbitro (1) e arbitri di obiettivo (2–4) |
| `zdt@`, `alfa@`, `bravo@`, `charlie@`, `delta@demo.torneo` | Capi pattuglia delle squadre (Delta è organizzatrice) |

Per ripartire da zero: `npx prisma migrate reset` (azzera il database e riesegue il seed).

## Stato

**M1 — Fondamenta**: schema completo, configurazione FIGT come dati (tipologie PLR/PCR, 13 template, regole art. 14,
regole di campionato), login, home per ruolo, consultazione di configurazione ed eventi, anteprima dei template
generata dai dati, immagine Docker e compose di produzione.

**M2 — Evento e iscrizioni**: creazione dell'evento da una tipologia; obiettivi con fasi e tabella punteggi, controllati
con i limiti della tipologia (abbinamenti, durata finestra, area temporale, ordine PCR); iscrizione delle squadre
(dal membro o dalla direzione) con presenze, ruoli, fasce e prestiti; designazione degli arbitri con accetta/rifiuta,
blocco degli impegni sovrapposti e avviso di conflitto di interessi; regolamento e book con codice di controllo;
pubblicazione e **avvio con congelamento** (fotografia della configurazione senza tabella punteggi).

**M3 — Motore offline**: app di campo `/campo` installabile, che si riapre anche a server spento (service worker);
ogni telefono ha la sua coppia di chiavi ECDSA P-256 (la privata non è esportabile); pacchetto dell'evento con la
configurazione congelata filtrata per ruolo, le chiavi pubbliche dei partecipanti e i documenti verificati con SHA-256;
registro delle operazioni firmate con ora ufficiale (scarto dal server) e GPS; sincronizzazione idempotente in invio
e ricezione con segnalibro; scambio delle operazioni via QR con verifica delle firme anche offline e consegna per conto
di altri. Collaudo automatico: `node scripts/prova-sync.mjs` (con il server di sviluppo acceso).

Prossima tappa: **M4 — Arbitro e squadra** (vedi [piano](docs/piano-demo.md)).
