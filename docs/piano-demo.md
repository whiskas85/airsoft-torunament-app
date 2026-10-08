# Piano per la demo (autorizzazione FIGT)

> Bozza 1 del 2026-10-08. Scopo: arrivare a una **demo usabile in una gara di prova** da mostrare alla federazione (R8).
> Architettura: app separata, sullo stesso server del team-management, in **container Docker separati**.

## Cosa deve dimostrare la demo

1. **Una gara PLR e una PCR configurate senza codice**, con i template ricavati dalle tabelle FIGT (A, A+E, E, F/G, H, contro, esfiltrazione, recon C, way point B).
2. **Arbitri e squadre lavorano completamente offline**: luci verdi, cronometro, scheda, **firma via QR** (art. 15.1 d), contestazioni a due voci, fuori finestra, recon con foto, esfiltrazione anche anticipata.
3. **Sincronizzazione automatica** al ritorno della rete, senza perdite e senza doppioni.
4. **Direzione gara**: code (modalità centralizzata o dislocata), lista delle contestazioni con le regole automatiche, valutazione delle recon, squalifica, esfiltrazioni, debriefing.
5. **Classifica** provvisoria e ufficiale con il dettaglio per obiettivo, il **grafico stile F1** e i punti di campionato.

## Fuori dalla demo (già previsti nel modello dei dati)

- Ricerca e designazione automatica degli arbitri (area di pertinenza).
- Pagamenti in app: nella demo solo pagato / non pagato.
- Editor grafico dei template: nella demo i template sono **caricati come dati** (JSON) e l'editor arriva dopo.
- Joulometro Bluetooth: nella demo **inserimento manuale** della misura, con la lettura Bluetooth in parallelo (vedi M6).
- Finali, playoff, gestione completa dei prestiti.
- Collegamento con i gestionali del team-management.

## Tappe

| # | Tappa | Contenuto | Si verifica con |
|---|---|---|---|
| **M1** | Fondamenta | Repository, Docker (app + Postgres), Caddy (`siti/torneo.caddy`), login, ruoli, modello dei dati in Prisma, **dati iniziali FIGT** (ente, coordinamento Piemonte, PLR e PCR, template, regole art. 14) | Login e consultazione della configurazione dal browser |
| **M2** | Evento e iscrizioni | Creazione dell'evento da una tipologia, obiettivi, squadre e partecipanti (fasce, prestito semplice), arbitri e assegnazione degli obiettivi, documenti (regolamento, book), stati Bozza → Pubblicato → **Avvio con congelamento** | Un evento di prova completo, avviato |
| **M3** | Motore offline | App installabile che funziona senza rete, base dati locale, **registro delle operazioni**, chiavi di firma per dispositivo, ora del server, sync in invio e ricezione, **QR delle operazioni** (riuso del prototipo) | Due telefoni in modalità aereo che si scambiano operazioni e poi sincronizzano |
| **M4** | Arbitro e squadra | Code delle luci verdi (prenotata e coda all'ingresso PCR), cronometro, scheda dal template, firma QR, contestazioni, fuori finestra, segnalazioni, recon con foto, esfiltrazione e esfiltrazione anticipata, test ASG manuale | Simulazione completa di un obiettivo, offline |
| **M5** | Direzione e classifiche | Dashboard, code centralizzate, contestazioni con regole automatiche, recon, squalifica, debriefing e controlli, **calcolo dei punti**, classifiche, **grafico F1**, campionato | Classifica di una gara simulata |
| **M6** | Prova sul campo | Gara di prova con Zero Dark (anche piccola), backup cartaceo come raccomanda il regolamento, misure di affidabilità (QR letti al primo colpo, tempi, batteria), correzioni. In parallelo: **lettura del joulometro** | Demo per la FIGT |

Ogni tappa si chiude con una prova su telefoni veri, **iPhone compresi**.

## Rischi principali

| Rischio | Contromisura |
|---|---|
| iPhone: limiti delle app web (dati cancellati, sync solo ad app aperta) | Installazione in Home obbligatoria per chi va in campo, test su iPhone da M3 in poi |
| QR difficili da leggere al sole o con schermi rovinati | Un solo QR per scheda (già misurato), luminosità al massimo, testo di riserva incollabile |
| Orologi dei telefoni sbagliati | Scarto rispetto al server registrato a ogni sync, avvisi alla direzione per operazioni "troppo vecchie" |
| Memoria del server (4 GB condivisi) | Misura dei consumi in M1, possibilità di spostare l'app su un'altra macchina |
| Protocollo Bluetooth del joulometro non documentato | Inserimento manuale sempre disponibile; analisi del Bluetooth in M6 |
