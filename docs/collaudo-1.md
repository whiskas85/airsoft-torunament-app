# Collaudo 1 — osservazioni e piano

> Osservazioni di Marco del 2026-10-09 dopo il primo giro sull'app pubblicata (modalità debug).
> Ogni punto ha un codice (C1-…) da citare nei commit e nelle discussioni.
> Principio guida: **l'app va in mano a persone che devono vedere le cose semplici.** Se è un bordello, la lasciano perdere.

## 1. Navigazione e pagina principale

| # | Osservazione | Intervento |
|---|---|---|
| C1-01 | Nessun menu, nessuna dashboard con i pulsanti per creare gli eventi | **Menu fisso** (barra in alto su computer, barra in basso su telefono) e **home per ruolo** con le azioni principali a pulsantoni: "Nuovo evento", "I miei eventi", "Campionati"… |
| C1-02 | L'ente è ridondante: chi entra come FIGT è FIGT | L'ente **non si mostra** quando l'utente ne ha uno solo (cioè sempre, oggi). Resta nei dati: vedi decisione D1 |
| C1-03 | Tipologie e template insieme confondono | Due voci separate. I **template** diventano roba da "impostazioni avanzate" dell'ente |
| C1-04 | Tipologie non modificabili (sembrano scritte nel codice) | Sono dati, ma manca l'interfaccia. **Gestione delle tipologie**: crea, modifica, archivia (non si cancellano se usate da eventi: si archiviano) |
| C1-05 | Campionati nella stessa pagina | **Pagina propria**, dentro la tipologia (vedi §2) |
| C1-06 | Mille pulsanti di salvataggio | **Un solo "Salva" nell'intestazione**, sempre visibile, che salva tutto ciò che è cambiato nella pagina; segnale "modifiche non salvate" e avviso se si esce senza salvare |
| C1-07 | Il profilo utente non si modifica | Pagina **Profilo**: nome, cognome, telefono, email, password, tessera |

## 2. Organizzazione: ente, coordinamenti, attività, campionati

Struttura descritta da Marco:

```
Ente (es. FIGT) ── amministratore dell'ente: gestisce i coordinamenti
 └─ Coordinamento (Piemonte, Liguria, Lombardia… e "Nazionale")
     ├─ responsabili del coordinamento: organizzano le gare
     └─ Attività / tipologia (PLR, PCR, Sniper & Spotter, DAS… create da loro)
         └─ Campionato (26/27, 27/28)
             └─ Tappe (eventi) del campionato
 Eventi "open": fuori campionato, usano comunque l'app
```

| # | Osservazione | Intervento |
|---|---|---|
| C1-08 | Utente che gestisce i coordinamenti | Ruolo **amministratore dell'ente**: crea coordinamenti e ne nomina i responsabili |
| C1-09 | Responsabili del coordinamento che organizzano le gare | Ruolo nuovo **responsabile di coordinamento** (oggi c'è solo AMMINISTRATORE/SEGRETERIA) |
| C1-10 | Tipologie create dal coordinamento (PLR, PCR, S&S, DAS) | Le tipologie restano dell'**ente** (il regolamento è federale), con l'elenco dei coordinamenti che le usano. Da confermare: D2 |
| C1-11 | Campionato con la sua tipologia; creando una gara PLR non si propone un campionato PCR | Il campionato **ha già** la tipologia nei dati; il modulo dell'evento **filtra** i campionati per tipologia (e il contrario) |
| C1-12 | Più tappe per campionato | Già nei dati; serve la pagina del campionato con l'elenco delle tappe |
| C1-13 | Tappe open fuori campionato | Già possibile (evento senza campionato): va reso esplicito nel modulo, "Gara open" |
| C1-14 | Campionato italiano: un **ente organizzatore** gestisce l'evento, nomina le squadre organizzatrici, che nominano i capi obiettivo | Ruoli a cascata sull'evento: **organizzatore** (persona o squadra) → squadre organizzatrici → **capo obiettivo** |
| C1-15 | Non posso nominare organizzatori di una gara | Pagina "Staff" dell'evento: organizzatori (una o più persone), direzione, capi obiettivo |

## 3. Creazione dell'evento

| # | Osservazione | Intervento |
|---|---|---|
| C1-16 | Il campo si cerca su mappa, con coordinate | **Ricerca del luogo + mappa** con il segnaposto trascinabile; coordinate salvate. Vedi D3 (Google o OpenStreetMap) |
| C1-17 | Parcheggi per le squadre, anche più di uno | Elenco di **parcheggi** sulla mappa (nome, descrizione, coordinata) |
| C1-18 | Malus per minuto di ritardo all'esfiltrazione (es. 10 pt/min) | Campo **"penalità per minuto di ritardo"** nell'evento (precompilato dalla tipologia: FIGT PLR −50). Calcolo **automatico** appena si registra l'ora di esfiltrazione |
| C1-19 | Tipologia PLR → solo campionati PLR | Vedi C1-11 |
| C1-20 | Numero di tappa scomodo | Al posto del numero, l'**elenco delle gare del campionato ordinate per data** con la nuova inserita al suo posto: il numero lo calcola l'app |
| C1-21 | Locandina da upload | Caricamento immagine (come già per regolamento e book) |

## 4. Obiettivi

| # | Osservazione | Intervento |
|---|---|---|
| C1-22 | Le fasi E sono orrende: una per riga, punteggio facoltativo | **Elenco di caselle**: nome + punti (precompilati, modificabili dall'organizzatore) e **maniglia** per riordinare (solo la maniglia trascina) |
| C1-23 | Porta IN con testo, descrizione e coordinata | Porta IN = **nome** ("Porta IN"), **descrizione** per le squadre, **coordinata** |
| C1-24 | Manca la Porta OUT | Stessa struttura della Porta IN |
| C1-25 | Due raggi: area dell'obiettivo e area più grande | Due raggi in metri: **area di esecuzione** (interna) e **zona obiettivo** (esterna, dove agisce la controinterdizione). *Nomi presi dall'art. 5.2 citato nei nostri appunti: da confermare sul testo del regolamento*. **Disegno sulla mappa**: centro, due cerchi, Porta IN e Porta OUT trascinabili |
| C1-26 | Obiettivi che compaiono dopo altri | Campo **"compare dopo"**: elenco di obiettivi che devono essere **tutti** acquisiti con esito positivo. Finché non lo sono, la squadra non lo vede |
| C1-27 | Obiettivo solo E senza finestra | La finestra dipende dal tipo: se nessun tipo scelto la richiede, **i campi della finestra spariscono** |
| C1-28 | Waypoint: ne servono ~15, vanno creati velocemente | **Inserimento in serie**: tabella con una riga per waypoint (nome, coordinata, punti), "aggiungi riga", oppure clic sulla mappa = nuovo waypoint |
| C1-29 | Il modulo dell'obiettivo è fuorviante (finestra chiesta al waypoint, poi "manca la finestra") | Modulo che **cambia in base al tipo**: mostra solo i campi che servono a quel tipo, e i controlli non chiedono ciò che il tipo non prevede |

## 5. Squadre iscritte

| # | Osservazione | Intervento |
|---|---|---|
| C1-30 | Identificativo di gara (es. PREBE) e squadre numerate | Campo **prefisso** nell'evento; all'iscrizione l'app propone **PREBE 1, PREBE 2…** (numero successivo libero), modificabile |

## 6. Vista della squadra (membro)

| # | Osservazione | Intervento |
|---|---|---|
| C1-31 | Non vede le squadre iscritte | Elenco squadre iscritte visibile ai partecipanti (solo nome e identificativo) |
| C1-32 | Non deve vedere lo staff arbitrale | Arbitri e assegnazioni **nascosti** ai membri delle squadre |
| C1-33 | Non può chiedere le luci verdi in app | **Richiesta della luce verde** dall'app (era previsto in M4) |
| C1-34 | Non ha l'elenco delle sue luci verdi | **Le mie luci verdi**: richieste, confermate, orari (M4) |

## 7. Motore di gioco (arbitro e squadra)

| # | Osservazione | Intervento |
|---|---|---|
| C1-35 | L'app non gestisce ancora il motore di gioco | È la tappa **M4** del piano: coda delle luci verdi, cronometro, scheda punteggi dal template, firma QR, contestazioni, esfiltrazione |
| C1-36 | L'arbitro non può fare nulla: punteggi, contro… | Idem: M4. L'infrastruttura offline (M3) è pronta, mancano le schermate |

## 8. Intelligenza artificiale

| # | Osservazione | Intervento |
|---|---|---|
| C1-37 | Collegamento AI (MCP) per utente, semplice da aggiungere per terzi | **Server MCP** dell'app (`/api/mcp`) con un **token personale** generato dal profilo: l'AI vede e fa solo ciò che può fare quell'utente. Pagina "Collega un assistente" con l'indirizzo e il token da copiare |

## Ordine proposto

1. **Fondamenta dell'interfaccia** (C1-01…07): menu, home, Salva unico, profilo. Senza questo ogni altra pagina resta scomoda.
2. **Organizzazione** (C1-08…15): ruoli, coordinamenti, tipologie e campionati gestibili, staff dell'evento.
3. **Evento e obiettivi con la mappa** (C1-16…30).
4. **M4, motore di gioco** (C1-31…36): vista squadra, luci verdi, arbitro.
5. **MCP** (C1-37): piccolo, si può anticipare.

## Decisioni (2026-10-09)

- **D1 — Un'app per ente.** Ogni ente (FIGT, AICS…) ha la sua installazione, con indirizzo e database propri, come le squadre ospitate dal team-management. Il modello dei dati resta com'è (l'ente c'è), ma in ogni installazione ce n'è **uno solo** e l'interfaccia non lo nomina mai. Supera il principio P4.
- **D2 — Le tipologie le crea l'ente.** I coordinamenti le usano e ci creano i campionati.
- **D3 — OpenStreetMap con satellite Esri** (Leaflet): gratis, nessuna chiave.
- **D4 — Nomi dei due raggi**: in attesa del testo del regolamento; per ora "area di esecuzione" e "zona obiettivo".
- **Ordine**: prima interfaccia e organizzazione (C1-01…15), poi evento e obiettivi con mappa, poi motore di gioco.
