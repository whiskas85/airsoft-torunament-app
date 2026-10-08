# Modello dei dati — app tornei

> Bozza 1 del 2026-10-08, basata su `requisiti.md` (parte 11) e `analisi-regolamenti-figt.md`.
> I nomi sono in italiano come nel team-management. Le tabelle vere (Prisma) verranno da qui.

## 0. Due idee che reggono tutto

### A. Configurazione separata dai fatti
- **Configurazione**: chi è chi, come si gioca, quanto vale ogni cosa (ente, tipologie, template, eventi, obiettivi, tabella punteggi).
  - Si scrive **online**, dall'ente o dalla direzione.
  - **All'avvio dell'evento si congela**: se ne salva una **copia identificata da un codice di controllo (hash)**. Tutti i telefoni lavorano su quella copia.
- **Fatti di gara**: ciò che succede in campo (luci verdi, schede, firme, contestazioni, esfiltrazioni…).
  - Si scrivono **sui telefoni, anche offline**.

### B. I fatti di gara sono un registro che si aggiunge e non si modifica
- Ogni fatto è un'**operazione**:
  - ha un **identificativo unico** creato sul telefono;
  - è **firmata** da chi la fa;
  - registra **orario** (P6bis) e **GPS** (P8).
- Niente si modifica o si cancella. Una correzione è una nuova operazione che fa riferimento alla precedente (P10).
- Lo **stato** (code, schede, classifiche) si **calcola** rileggendo le operazioni, sia sul server sia sul telefono.
- Perché funziona offline:
  - due telefoni che si scambiano operazioni (via QR o via server) arrivano sempre allo **stesso stato**, perché le operazioni si sommano senza conflitti;
  - un'operazione arrivata due volte non conta doppio;
  - un telefono può **trasportare** operazioni di altri (es. la recon passata alla direzione in debriefing) e la firma ne garantisce l'autore.

---

## 1. Enti, persone, identità

| Entità | Campi principali | Note |
|---|---|---|
| **Ente** | nome, logo, etichetta della tessera (es. "Tessera FIGT") | Multi-ente (P4). Nulla nel codice dipende da un ente specifico (P5) |
| **Coordinamento** | ente, nome (es. "Piemonte") | Raggruppa squadre, arbitri, eventi |
| **Persona** | nome, cognome, data di nascita | Esiste **anche senza account** (elenco dei tesserati dell'ente) |
| **Tessera** | persona, ente, numero, validità | Una persona può avere tessere di enti diversi |
| **Utente** | persona, email, credenziali | L'account: chi accede all'app |
| **Dispositivo** | utente, **chiave pubblica** (ECDSA P-256), registrato il, ultimo **scarto dell'orologio** rispetto al server, versione dell'app | La chiave privata **non lascia mai il telefono**. Va registrato **online prima dell'evento** (§11) |
| **RuoloEnte** | utente, ente, ruolo (amministratore ente, responsabile arbitri…), coordinamento facoltativo | Permessi a livello di ente |
| **QualificaArbitro** | persona, ente, livello (configurabile: Ausiliare / Regionale / Nazionale per FIGT), dal, coordinamento | Storico delle qualifiche |
| **AreaPertinenza** | arbitro, regione **oppure** punto + raggio in km | Fase futura (§9) |

## 2. Squadre

| Entità | Campi principali | Note |
|---|---|---|
| **Squadra** | ente, coordinamento, nome, logo, **serie di fasce** (due colori) | Equivale all'ASD |
| **MembroSquadra** | squadra, persona, dal / al, ruolo abituale | Elenco dei membri, anche importato dall'ente |
| **CollegamentoGestionale** | squadra, indirizzo del gestionale, chiave pubblica | Facoltativo: collegamento al team-management |

## 3. Tipologie di gara, regolamenti, template

```
Ente
└── TipologiaGara (es. "PLR", "PCR")
    └── VersioneTipologia  ── congelata quando pubblicata
        ├── parametri (JSON): operatori min/max, finestra min/max, modalità finestre,
        │   obiettivi in sequenza, esfiltrazione con orario max, …
        ├── Documenti: regolamento, moduli tipici
        ├── TipiObiettivo: A … H (regole per tipo)
        ├── VersioniTemplate usate
        └── RegolePunteggioPredefinite (copiate negli eventi)
```

| Entità | Campi principali | Note |
|---|---|---|
| **TipologiaGara** | ente, nome | Es. PLR, PCR |
| **VersioneTipologia** | tipologia, numero, stato (bozza/pubblicata), **parametri**, codice di controllo | Una volta pubblicata non si modifica più: si crea una nuova versione |
| **Documento** | ente, titolo, tipo (regolamento, book, modulo, mappa…), file (PDF, HTML, immagini, zip), dimensione, **codice di controllo** | Il codice di controllo garantisce che ogni telefono abbia lo stesso file |
| **TipoObiettivo** | versione tipologia, codice (A–H), nome, **richiede arbitro**, **richiede finestra**, **compilato da** (arbitro / squadra), foto minime, combinabile con, template predefinito | Esempio: B = squadra, nessuna finestra, 1 foto |
| **Template** | ente, nome, genere (obiettivo, contro, esfiltrazione, recon, controllo, registrazione, test ASG) | |
| **VersioneTemplate** | template, numero, **campi** (JSON), **derivato da** + **valori preimpostati**, codice di controllo | La "variante" (es. scontro perso) è una versione derivata con valori già scelti |

**Campi di un template**

| Tipo di campo | Opzioni |
|---|---|
| `sino` | etichetta, gruppo (es. "Fase E2") |
| `numero` | minimo, **massimo**, passo |
| `contatore` | come numero, mostrato come caselle 1…N (le penalità delle tabelle FIGT) |
| `scelta` | elenco di opzioni (es. vinto / perso) |
| `tempo` | sorgente (cronometro / manuale), arrotondamento (es. minuto per eccesso) |
| `foto` | minimo / massimo, solo dalla fotocamera |
| `testo` | note |
| `osservazioni` | elenco ripetibile (es. recon C: posizione cardinale + testo) |
| `sezione` | raggruppa i campi (penalità, esito, fasi…) |

Ogni campo ha una **chiave stabile** (es. `penalita.non_dichiarato`). Le regole di punteggio si riferiscono a quelle chiavi.

## 4. Campionati

| Entità | Campi principali | Note |
|---|---|---|
| **Campionato** | ente, coordinamenti, tipologia, stagione (es. 2026-27), **regole** (JSON) | Regole: punti per posizione, gestione dei pari merito, migliori N risultati, regola per organizzatrici e aiuto (media / min / max / media senza estremi), spareggi, tappe minime |
| **IscrizioneCampionato** | campionato, squadra, dal | Le altre squadre sono "open" |

## 5. Evento

| Entità | Campi principali | Note |
|---|---|---|
| **Evento** | ente, **uuid + codice breve** (P11), nome, locandina, inizio e fine (data e ora), luogo, versione tipologia, **stato** (§6bis requisiti), **opzioni** (visibilità punti in gara, modalità finestre, durata del periodo contestazioni, tolleranze…), **codice di controllo della configurazione congelata** | |
| **EventoCoordinamento** | evento, coordinamento | A chi è rivolto |
| **EventoCampionato** | evento, campionato, numero di tappa | Una gara può valere per più campionati |
| **EventoDocumento** | evento, documento, ruolo (regolamento, book…) | Scaricati sul telefono all'accettazione o iscrizione |
| **Obiettivo** | evento, codice (OBJ1…), nome, **tipi** (es. A+E), coordinate, raggi delle aree, Porta IN / OUT, **durata della finestra**, **area temporale** (da / a), ultima finestra utile, **ordine** (sequenza PCR), **fasi** (E1, E2…), versione template, stato (attivo / **sospeso** / chiuso) | "Sospeso" (protocollo di sospensione) lo vedono solo arbitri e direzione |
| **TabellaPunteggi** | evento, **regole** (JSON), versione | **Solo server e direzione.** Congelata all'avvio |

**Regole di punteggio** (esempi in formato leggibile; il formato vero sarà JSON):

```
"esito.difensori_eliminati"   per unità            +40
"esito.civili_colpiti"        per unità            −25
"esito.fasi.E1"               se sì                +200
"esito.fuori_finestra"        se sì                − valore positivo dell'obiettivo
"penalita.non_dichiarato"     a scaglioni su TUTTA la gara: 1° −200, 2° −800, 3° → proposta di squalifica
"tempo.minuti_risparmiati"    per unità +10, solo se obiettivo completato al 100% (PCR)
"recon.osservazioni_corrette" percentuale tra 50 e 500
"obiettivo"                   minimo garantito +50 (PLR)
"esfiltrazione.ritardo_min"   per unità −50
"contestazione.respinta"      se tipo ∈ {…}       −600
```

## 6. Partecipanti

| Entità | Campi principali | Note |
|---|---|---|
| **SquadraEvento** | evento, squadra, **identificativo pattuglia**, stato (iscritta / in gara / esfiltrata / in debriefing / terminata / **squalificata** / non classificata), pagato sì/no, ruolo (**gareggia / organizzatrice / aiuto**), campionato o open | |
| **PartecipanteEvento** | squadra evento, persona, ruolo (capo pattuglia, vice, operatore), **numero di fascia**, **in prestito da** (squadra), stato (in gioco / **esfiltrato in anticipo** alle …) | |
| **ArbitroEvento** | evento, persona, ruoli (capo arbitro, obiettivo, contro, esfiltrazione, commissione), **stato della designazione** (proposta / accettata / rifiutata con motivo), **obiettivi assegnati** | Avviso di conflitto di interessi (R9) |
| **MembroDirezione** | evento, utente, ruolo (direzione, commissione di gara, organizzazione) | |
| **TestASG** | partecipante, modello ASG, misura, unità, pallini, strumento (**joulometro Bluetooth** o inserimento manuale), esito, marcatore, trattenuta sì/no, da ritestare all'esfiltrazione | Prima della gara (§11bis) |

## 7. Operazioni di gara (il registro)

**Busta comune** a tutte le operazioni:

| Campo | Significato |
|---|---|
| `id` | Identificativo unico creato sul telefono |
| `evento` | uuid dell'evento (P11): l'app rifiuta operazioni di altri eventi |
| `tipo` | vedi elenco sotto |
| `autore` | utente + dispositivo |
| `ora_dispositivo` | orologio del telefono |
| `scarto_orologio` | ultimo scarto noto rispetto al server |
| `ora_ufficiale` | ora del telefono corretta con lo scarto (P7) |
| `gps` | latitudine, longitudine, **precisione**, oppure "non disponibile" (P8) |
| `rif` | operazioni a cui si riferisce (es. la scheda che si firma) |
| `dati` | contenuto specifico del tipo |
| `firma` | firma ECDSA di tutto quanto sopra |
| `ricevuta_il` | orario di arrivo al server (P6bis); solo lato server |

**Tipi di operazione**

| Area | Operazioni |
|---|---|
| Luci verdi | `finestra.assegnata` (squadra, obiettivo, inizio, fine) · `finestra.spostata` (**motivo**) · `finestra.in_attesa` · `finestra.cancellata` (es. per squalifica) · `finestra.avviata` (PCR: "Avvia adesso") · `finestra.inserita_a_mano` (squadra o arbitro offline) |
| Esecuzione | `cronometro.stop` · `fuori_finestra` (squadra, motivo: mancata presentazione / dopo la fine / anticipo / squadra non in coda) · `segnalazione` (squadra non identificata: fascia, descrizione) |
| Schede | `scheda.creata` (versione template, squadra, obiettivo, finestra, valori) · `scheda.aggiornata` (prima della firma) · `scheda.firmata_arbitro` · `scheda.firmata_squadra` (firmatario, codice della scheda, firma dell'arbitro) · `contestazione.arbitro` · `contestazione.squadra` · `dichiarazione.arbitro` |
| Recon / senza arbitro | `recon.inviata` (scheda esecuzione + **codici delle foto**) · `recon.valutata` (direzione: positiva / negativa) |
| Esfiltrazione | `esfiltrazione` (squadra, operatori presenti) · `esfiltrazione.anticipata` (operatore) |
| Direzione | `squalifica.segnalata` (arbitro) · `squalifica.assegnata` (direzione) · `contestazione.decisa` (accolta / respinta, motivo) · `controllo.compilato` (debriefing) · `stato_evento` / `stato_squadra` |

**Foto**: il file non viaggia nel QR. L'operazione ne contiene il **codice di controllo (hash)**, e il file si carica quando c'è rete. Il server verifica che il file corrisponda al codice.

## 8. Dati calcolati (solo server)

| Entità | Contenuto |
|---|---|
| **PunteggioScheda** | Punti di ogni scheda e dettaglio per regola. Si ricalcola in qualunque momento, perché le regole sono congelate |
| **ClassificaEvento** | Generale + una per campionato. Fotografie **provvisoria** e **ufficiale**, con data |
| **ClassificaCampionato** | Si aggiorna a ogni classifica ufficiale. Il punteggio delle organizzatrici resta provvisorio fino all'ultima tappa |
| **Andamento** | Serie temporale dei punti cumulati e delle posizioni per squadra: alimenta il **grafico stile F1** |
| **StoricoArbitro** | Eventi, ruoli, numero di contestazioni ricevute: alimenta l'attestato di arbitraggio |

## 9. Cosa sta su ogni telefono

| Ruolo | Riceve | Non riceve mai |
|---|---|---|
| **Arbitro** | Configurazione congelata dell'evento (senza tabella punteggi), regolamento, book, squadre e fasce, chiavi pubbliche dei partecipanti, code e schede dei **propri** obiettivi | Tabella punteggi, schede di altri obiettivi |
| **Squadra** | Configurazione congelata (senza tabella punteggi), regolamento, book, le **proprie** finestre, schede e recon. I punti solo se l'evento li rende visibili in gara | Tabella punteggi, dati di altre squadre |
| **Direzione** | Tutto l'evento, tabella punteggi compresa | — |

## 10. Scambio offline (QR)

Ogni QR trasporta **operazioni firmate** compresse (formato già provato nel prototipo: compressione + Base45, un solo QR fino a ~1000 caratteri). Il contenuto tipico:
1. arbitro → squadra: `scheda.creata` + `scheda.firmata_arbitro`;
2. squadra → arbitro: `scheda.firmata_squadra` (+ `contestazione.squadra`);
3. a ogni passaggio il telefono che riceve **verifica le firme** con le chiavi pubbliche scaricate prima dell'evento.

Così non c'è un formato "speciale" per il QR: è lo stesso registro che va al server, solo trasportato in un altro modo.
