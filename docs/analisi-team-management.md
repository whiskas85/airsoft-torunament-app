# Analisi: team-management e app tornei

> Fonte: repository `whiskas85/team-management` (v3.38.2), letto il 2026-10-08.
> Scopo: capire dove e come ospitare l'app tornei e cosa si può riusare.

## Com'è fatto il team-management

| Aspetto | Situazione |
|---|---|
| **Stack** | Next.js 15 (server actions), React 19, TypeScript, Prisma 6, PostgreSQL, Tailwind |
| **Modello** | **Un'installazione per squadra**: ogni squadra ha il suo gestionale, database, chiavi e dominio (`sq-<nome>`). Zero Dark è una delle squadre ospitate |
| **Server** | VPS Aruba, 2 vCPU, **4 GB RAM**, 80 GB, Ubuntu 24.04, datacenter in Italia |
| **Proxy** | Caddy con certificati Let's Encrypt automatici; un file `siti/*.caddy` per ogni sito |
| **Database** | Un Postgres comune per le squadre ospitate, con un database per squadra (`sq_<nome>`) |
| **Rilascio** | GitHub Actions → ssh → `deploy/squadra-server.sh`, versione fissata per ogni squadra |
| **PWA** | Installabile, con notifiche push (web-push). Il service worker **non conserva le pagine di proposito** (dati sensibili): fuori rete mostra "sei offline" |
| **Collegamento fra gestionali** | Identità con **chiavi Ed25519**, messaggi server-a-server firmati, coda con nuovi tentativi, **eventi condivisi** con presenze e costi per le squadre ospiti |
| **FIGT** | Lettura dei tesseramenti dal portale federale (intranetasnwg.it) con le credenziali dell'associazione: non c'è un'API, si leggono le pagine |

## Differenze con l'app tornei

| | team-management | app tornei |
|---|---|---|
| Destinatari | Una squadra (un'installazione ciascuna) | **Tutti**: enti, direzioni, arbitri, squadre. **Un'unica installazione per tutti gli enti** (P4) |
| Rete | Online, e fuori rete si ferma di proposito | **Funziona offline** (P1): dati e regolamento sul telefono |
| Dati sul telefono | Nessuno, per scelta | Regolamento, book, schede, code delle luci verdi, firme, foto |
| Legame con FIGT | Sì, nel prodotto | **No**: l'app è generica (P5) |
| Picchi di carico | Bassi | Nei giorni di gara: molti telefoni che sincronizzano insieme |

**Conclusione: l'app tornei è un'applicazione separata, non un modulo del team-management.** Ha un modello diverso (un'unica installazione per tutti gli enti, contro una per squadra), una logica offline opposta, ed è generica invece che legata a FIGT. Infilarla nel gestionale romperebbe entrambe le cose.

## Proposta

> **Decisione (2026-10-08, Marco):** app tornei sullo **stesso server**, in **container Docker separati**.

### Dove ospitarla
- **Sullo stesso server**, come sito in più: per esempio `torneo.zerodarkteam.it` o un dominio neutro, visto che l'app è generica.
  - Un file `siti/torneo.caddy`, i suoi container e il suo database nel Postgres comune (o un Postgres suo).
  - Nessun nuovo server e nessun nuovo certificato da gestire a mano.
- **Attenzione alla memoria**: 4 GB sono già condivisi fra più gestionali. L'app tornei va tenuta leggera e va misurato il consumo reale prima di un evento vero. Se non basta, si sposta su una macchina sua senza cambiare nulla, perché ha già dominio e database propri.

### Stack
- **Stesso stack del team-management** (Next.js, TypeScript, Prisma, Postgres, Tailwind) per riusare competenze, rilascio, Caddy e i pezzi di codice.
- **Parte di campo offline-first** (arbitri e squadre):
  - l'app parte anche senza rete, con le sue pagine salvate sul telefono;
  - i dati stanno in una base dati locale nel browser (IndexedDB);
  - la sincronizzazione invia le operazioni in coda, ognuna con un identificativo unico, così un invio ripetuto non crea doppioni.
- **Parte online** (ente e direzione): pagine normali, come nel gestionale.

### Cosa si può riusare dal team-management
| Pezzo | Uso nell'app tornei |
|---|---|
| Login e sessioni (`jose`), ruoli | Account di arbitri, membri delle squadre, direzione |
| Notifiche push (`web-push`, `push.ts`) | "Nuova recon da verificare", "La tua luce verde è alle 10:40" |
| Firme Ed25519 fra server (`federazione.ts`) | **Collegamento facoltativo** con i gestionali delle squadre: per esempio, iscrivere la squadra al torneo passando le presenze dal gestionale |
| Rilascio (GitHub Actions + script) e Caddy | Rilascio dell'app tornei |
| Caricamento allegati e anteprime (`sharp`) | Locandina, book, foto delle recon |

### Firme sui telefoni
- Fra un telefono e l'altro conviene **ECDSA P-256** con le funzioni crittografiche del browser. Ed25519 nel browser c'è solo sui telefoni recenti, e ci saranno iPhone vecchi.
- Il server continua a usare Ed25519 per parlare con i gestionali.

### Integrazione con il team-management (facoltativa)
- L'app tornei **non dipende** dal gestionale: una squadra senza gestionale si iscrive con un account personale.
- Una squadra **con** il gestionale può collegarlo, con lo stesso meccanismo di collegamento già esistente. Così iscrizione, presenze e operatori con la tessera passano da soli.
