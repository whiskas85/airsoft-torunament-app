# Requisiti — App gestione tornei softair

> Fonte: dettatura e risposte di Marco Allario (2026-10-08).
> Stato: **bozza, parte 11**. Tutte le domande risolte (1–34, R1–R11). Modello dei dati in `modello-dati.md`, piano della demo in `piano-demo.md`.

## 0. Principi guida (validi per tutto)

- **P1 — Funzionamento offline totale per arbitri e squadre.** Si deve poter compilare e discutere un punteggio e farlo confermare in una zona senza rete. La rete può mancare a entrambi, solo all'arbitro o solo alla squadra.
- **P2 — Scambio offline totalmente affidabile.** Il meccanismo si può scegliere liberamente, ma deve funzionare sempre. Esperienza negativa già vista: un'altra app per tornei usava QR così grandi che i telefoni non li leggevano, e la gente non la usava.
- **P3 — Non legata a una sola federazione.** Si propone prima a FIGT, ma potrebbe andare ad altri enti. La documentazione FIGT è solo uno spunto: regole, punteggi e template **non devono essere fissi nel codice**.
- **P4 — Multi-ente (multi-tenant).** L'app è unica e globale. In Italia possono svolgersi più gare contemporaneamente, ciascuna con i suoi arbitri, squadre e direzione.
- **P5 — App sempre generica.** Né nell'app né nel codice si stabilisce che è "per FIGT" o per un altro ente. Si usano termini neutri: per esempio **"tessera"** e non "tessera FIGT".
- **P6 — Ogni operazione dell'arbitro registra l'orario.** Firma del punteggio, luce verde, cronometro, fuori finestra, contestazioni: tutto porta l'orario in cui è stato fatto. L'orario della firma *è* l'orario ufficiale della scheda.
- **P6bis — Due orari per ogni operazione.** L'**orario dell'operazione** (quando è stata fatta, fissato in quel momento e mai più modificabile) e l'**orario di ricezione** (quando è arrivata al server, magari ore dopo per via dell'offline). In gara vale sempre l'orario dell'operazione.
- **P7 — L'orario ufficiale è quello del server.** Tutte le app usano l'ora del server, non quella del telefono (vedi §8.6).
- **P8 — Ogni operazione registra la posizione GPS.** Firma compresa, con la sua **precisione**. Se il GPS manca, l'operazione lo dice esplicitamente ("GPS non disponibile") e non viene bloccata. Serve per le verifiche successive (es. "non ero lì in quel momento").
- **P9 — Non si può fingersi qualcun altro.** Una squadra non deve potersi spacciare per un'altra. Un arbitro non deve poter attribuire un'azione alla squadra sbagliata, né per errore né di proposito. Ogni operazione deve dimostrare **chi** l'ha fatta, **quando** e **dove** (vedi §11).
- **P10 — Storico completo, niente si cancella.** Restano nello storico eventi, arbitri presenti, squadre e persone presenti, tornei fatti da ogni squadra e da ogni arbitro, numero di partecipanti, schede, contestazioni…
- **P11 — Ogni evento ha un identificativo univoco.** Ogni QR e ogni dato scambiato porta l'identificativo dell'evento, così con molti eventi contemporanei i dati non si mescolano: l'app rifiuta un QR di un altro evento.

## 1. Ruoli e permessi

| Ruolo | Cosa può fare | Cosa **non** può fare | Offline obbligatorio |
|---|---|---|---|
| **Ente** (federazione / associazione) | Crea eventi; crea, modifica e versiona template e regolamenti; ricarica il regolamento di una gara già esistente; certifica e assegna gli arbitri | — | No |
| **Direzione gara** (è l'ente per quell'evento) | Come l'ente per il suo evento; vede e modifica la tabella punteggi **fino all'avvio della gara**; gestisce le contestazioni; verifica le recon; dashboard live | Modificare qualsiasi cosa "di gara" dopo l'avvio (vedi §6bis) | No |
| **Arbitro** | Genera schede punteggio dai template e le modifica; gestisce le luci verdi dei propri obiettivi; dichiara il fuori finestra; registra la propria contestazione | Modificare template, regolamento o tabella punteggi; vedere i punti | **Sì** |
| **Squadra** (qualsiasi membro presente **con account**: non solo il caposquadra) | Iscrive la squadra e dà le presenze; **visualizza e conferma** la scheda; registra la propria contestazione; compila gli obiettivi *recon* (con foto); vede le proprie luci verdi | Modificare schede, template o regolamento; vedere i punti | **Sì** |

## 2. Template di punteggio

### 2.1 Template → scheda punteggio
- Il **template** è il modello: lo crea e lo modifica **solo l'ente o la direzione gara**.
- Dal template **si genera la scheda punteggio**. L'arbitro **non modifica il template**, ma modifica la scheda che ne deriva: compila i campi, aggiunge note, cambia le scelte già impostate.
- **Varianti precompilate**: un template si può compilare in parte e salvare come nuovo template.
  - Esempio "scontro": stessa tabella, ma la variante *scontro vinto* ha alcuni campi già selezionati e la variante *scontro perso* ne ha altri.
- **Versioni dei template**: ogni modifica crea una nuova versione. Un evento usa una versione precisa. Il meccanismo di aggiornamento delle versioni è da progettare.

### 2.2 Due livelli: fatti e punti
| Livello | Chi lo vede | Contenuto | Esempio |
|---|---|---|---|
| **Scheda** (cosa è successo) | Arbitro e squadra | Fatti: sì/no, numeri, note, tempi, foto | "E1 – Bomba disinnescata: sì" · "Colpiti in attacco: 3" |
| **Tabella punteggi** (quanto vale) | **Solo server e direzione gara** | Punti per ogni fatto | E1 sì = **+200** · ogni colpito = **−50** |

- L'arbitro **non assegna punti**: il punteggio si calcola automaticamente applicando la tabella punteggi.
- La tabella punteggi **non arriva mai** sui telefoni di arbitri e squadre, nemmeno nascosta nell'app.
- **Visibilità dei punti** (R1):
  - **durante la gara** è **configurabile per evento**: punti visibili alle squadre oppure no;
  - **in classifica** (provvisoria e ufficiale) sono **sempre visibili a tutti**, con il dettaglio per obiettivo, come richiede il regolamento FIGT (art. 13 g).
  - Anche quando i punti sono visibili, i telefoni ricevono solo i **punti già calcolati** dal server, mai la tabella dei pesi.
- **Punteggio totale = somma** di tutti i contributi, **positivi e negativi**. Il totale **può scendere sotto zero**.
- La tabella punteggi si può modificare **solo fino all'avvio della gara**. Dopo è bloccata per tutti, direzione compresa: cambiare i punteggi a gara in corso potrebbe favorire una squadra.

### 2.3 Tipi di campo
| Tipo | Note |
|---|---|
| **Sì/No** | Esempio: azione E1 eseguita |
| **Numero** | Con **massimo configurabile**. Esempio: "colpiti in attacco" (max 10), "colpiti in difesa". Ogni unità vale la sua quota di punti (es. −50) |
| **Note** | Testo libero |
| **Tempo** | Tempo impiegato, compilato dal cronometro (vedi §8.4) |
| **Foto** | Scattata **dall'app**. Può essere **obbligatoria** (es. almeno 1–2 foto). Usata soprattutto negli obiettivi recon |

## 2bis. Tipologie di gara (es. PLR, PCR)

- Una **tipologia di gara** è un **pacchetto** definito dall'ente, con versioni. Contiene:
  - **regolamento** e documenti tipici (moduli, schede di registrazione…);
  - **template** (schede obiettivo, contro, esfiltrazione, recon, controlli, test ASG);
  - **tipologie di obiettivo** (A–H per FIGT) con le loro regole: arbitro sì/no, finestra sì/no, chi compila, foto obbligatorie;
  - **parametri di gara**: operatori minimi e massimi, durata minima e massima della finestra, modalità delle finestre, obiettivi in sequenza sì/no, esfiltrazione con orario massimo sì/no, bonus…;
  - **regole di calcolo dei punti** predefinite, che ogni evento può poi copiare e adattare.
- Un evento **sceglie una tipologia** (e la sua versione) e ne eredita tutto. All'avvio la copia diventa **congelata** (§6bis).
- **PLR e PCR sono entrambe nella prima versione** (R4). Le differenze stanno **nella tipologia**, non nel codice:

  | Parametro | PLR | PCR |
  |---|---|---|
  | Modalità finestre | Prenotata (dislocata o centralizzata) | **Coda all'ingresso**: ordine di arrivo alla Porta IN, finestra aperta subito dall'arbitro ("Avvia finestra adesso") |
  | Obiettivi in sequenza | No | Sì (OBJ1 → OBJ2 → …) |
  | Esfiltrazione con orario massimo | Sì (ritardo, tempo risparmiato) | No |
  | Operatori | 3–6 (minimo in gara: 2) | 3–8 (minimo in gara: 3) |
  | Tipologie di obiettivo | A, B, C, D, E, F, G, H | A, D, E, F, G, H |
  | Bonus minuti risparmiati | No | Sì (se l'obiettivo è completato al 100%) |
  | Controinterdizione | Sì | No |

## 3. Obiettivi

- Ogni obiettivo ha: **tipologia** (A, B, C, D, E, F, G…, configurabili dall'ente), **coordinate**, **durata** (es. 20 min), **template** associato, **fasi** (E1, E2, E3…) e **penalità per fuori finestra** (vedi §8.5).
- **Obiettivi con arbitro**: la scheda la compila l'arbitro e la squadra la conferma.
- **Obiettivi recon / liberi**: alcune tipologie (es. B, C, E) non hanno arbitro né difesa.
  - La compila **la squadra stessa**: non è una "scheda punteggio" ma una **scheda esecuzione**.
  - Di solito richiedono **1–2 foto scattate dall'app** per dimostrare di essere stati sul posto, di aver preso il contenuto o di aver fatto una certa azione.
  - È la configurazione della tipologia di obiettivo a stabilire chi compila e se le foto sono obbligatorie.
- **Verifica delle recon**: la fa **la direzione gara**, quando la recon arriva con la sincronizzazione (anche a gara in corso).
  - All'arrivo di una recon, chi è di turno in direzione riceve una **notifica**, guarda le foto e la scheda, e dà l'esito (positivo o negativo).
- **Stato della recon visto dalla squadra** (badge):
  | Badge | Quando |
  |---|---|
  | **Non sincronizzato** | Compilata sul telefono, non ancora inviata (es. offline) |
  | **In attesa** | Arrivata al server, la direzione non l'ha ancora valutata |
  | **Completato** | La direzione l'ha valutata, **con qualunque esito**: la squadra non vede se è positivo o negativo, né i punti |
- Una recon **non si può rifare**: niente secondo tentativo dopo la valutazione.

## 4. Flusso della scheda in campo (offline)

1. L'arbitro genera la scheda dal template (con luce verde: già compilata, vedi §8.4) e la compila.
2. Se lo ritiene, l'arbitro aggiunge la **propria contestazione** (testo libero).
3. La squadra **visualizza** la scheda e **conferma**. Se lo ritiene, aggiunge la **propria contestazione** (testo libero). Non può modificare nient'altro.
4. Firma e orari vengono registrati su entrambi i telefoni (oggi con un QR in una sola schermata e un codice di controllo).
5. Quando torna la rete, tutto viene sincronizzato con il server.

## 5. Contestazioni

- **Possono arrivare da due parti**: dall'**arbitro** e dalla **squadra**, entrambe come **testo libero** sulla scheda.
- Le gestisce la **direzione gara**.
- La direzione ha una **lista contestazioni ben evidente**. Ogni contestazione mostra **chi** l'ha fatta (arbitro e/o squadra, con nome), **quando**, su quale obiettivo e scheda, e il testo.
- **L'arbitro si limita a contestare**, cioè a scrivere la sua parte. **Decide sempre la direzione** (commissione di gara): accoglie o respinge.
- **Regole automatiche applicate dall'app** (R6, regolamento FIGT art. 15.2 e 16, configurabili per regolamento). L'app propone l'esito e la direzione conferma:
  | Situazione | Esito proposto dall'app |
  |---|---|
  | Scheda senza firma della squadra e senza contestazione | Risultato **accettato tacitamente** |
  | Contestazione della squadra **senza la sua firma** | Contestazione **respinta** |
  | Contestazione della squadra **senza la dichiarazione dell'arbitro** | Contestazione **accolta** |
  | Contestazione di un certo tipo (non dichiarato, fuori finestra, civili colpiti, comportamento, interferenza, fascia, contestazioni fatte all'esfiltrazione) **respinta** dalla direzione | Penalità per contestazione respinta (FIGT: **−600**) |
- **Dichiarazione dell'arbitro in un secondo momento**: l'arbitro può scriverla dopo, non davanti alla squadra. Nell'app diventa un **compito in sospeso** dell'arbitro, completabile anche offline, che va chiuso prima della decisione della direzione.

## 6. Evento (gara o torneo): composizione

```
Ente (es. una federazione)
├── Coordinamenti (sottogruppi, es. "Piemonte"): raggruppano squadre e arbitri
├── Campionati (es. "PCR 2026-2027", "PLR 2026-2027"), ognuno con la sua classifica
└── Eventi
    ├── ID univoco (P11)
    ├── Coordinamento (o coordinamenti) a cui è rivolto
    ├── Campionato a cui assegna punti (facoltativo: senza campionato è una gara "normale")
    └── ... composizione qui sotto

Evento
├── Testata: nome, **data e ora di inizio**, **data e ora di fine** (anche su più giorni), luogo/coordinate, ente, LOCANDINA (immagine, c'è sempre)
├── Squadre organizzatrici (vedi §6ter, campionati)
├── Book dell'evento (scaricato e bloccato, vedi §7)
├── Regolamento (versione bloccata, vedi §7)
├── Versioni dei template usati (bloccate)
├── Tabella punteggi (solo direzione; congelata all'avvio)
├── Squadre
│   ├── Segno di riconoscimento in campo (es. **fascia**: colore / numero)
│   ├── Stato della squadra nel torneo (vedi §6bis)
│   └── Operatori (con tessera, vedi P5)
├── Arbitri (assegnati all'evento e a N obiettivi, vedi §8.3 e §9)
└── Obiettivi (vedi §3)
```

## 6bis. Ciclo di vita del torneo e delle squadre

### Stati del torneo
```
BOZZA ─pubblica─▶ PUBBLICATO ─avvia─▶ IN CORSO ─(ora di fine)─▶ DEBRIEFING ─"Fine debriefing"─▶ TERMINATO
   (classifica PROVVISORIA) ─(fine periodo contestazioni)─▶ UFFICIALE
```

| Stato | Cosa succede | Cosa si può modificare |
|---|---|---|
| **Bozza** | L'ente prepara l'evento: testata, locandina, book, regolamento, obiettivi, template, tabella punteggi | Tutto |
| **Pubblicato** | Evento visibile ai coordinamenti. Iscrizioni di squadre e operatori, assegnazione degli arbitri e degli arbitri agli obiettivi | Tutto (l'ente può anche ricaricare il regolamento) |
| **In corso** | Dall'avvio fino alla **data e ora di fine** prevista. Si gioca | **Niente di gara, nemmeno la direzione**: regolamento, book, template, tabella punteggi e obiettivi sono **congelati** all'avvio. Si registrano solo i fatti (luci verdi, schede, firme, contestazioni, recon) |
| **Debriefing** | Rientri, controlli finali, verifiche delle recon e delle schede mancanti, contestazioni | Solo i fatti di debriefing (controlli, valutazioni) |
| **Terminato** (classifica provvisoria) | La direzione preme **"Fine debriefing"**. Viene pubblicata la **classifica provvisoria**. Parte il **periodo per le contestazioni** (durata configurabile) | Solo gli esiti delle contestazioni, che possono cambiare la classifica |
| **Ufficiale** | Finito il periodo delle contestazioni, la classifica diventa **ufficiale** e si assegnano i punti ai campionati | Niente |

- Le squadre vedono nell'app **sia la classifica provvisoria sia quella ufficiale**.

### Stati della squadra nel torneo
```
ISCRITTA ─▶ IN GARA ─"Esfiltrazione"─▶ IN DEBRIEFING ─"Fine debriefing squadra"─▶ TERMINATA
                │
                └─(squalifica decisa dalla direzione)─▶ SQUALIFICATA
```
- **Esfiltrazione** (prima si chiamava "rientro"; R7): la squadra arriva al punto di esfiltrazione con **tutti gli operatori ancora in gioco** e consegna il materiale. L'**arbitro di esfiltrazione** (o la direzione) registra l'**orario di esfiltrazione** e **il tempo della squadra viene congelato**.
  - Dopo l'esfiltrazione **nessun arbitro e nessuna squadra può registrare operazioni con orario successivo** per quella squadra.
  - Le operazioni fatte **prima** dell'esfiltrazione ma arrivate **dopo** (offline) restano valide: conta l'orario dell'operazione, non quello di ricezione (P6bis).
  - Il **modulo di esfiltrazione** è un template come gli altri: orario, operatori esfiltrati, eventuali penalità, elenco degli obiettivi senza arbitro (E, report C consegnato, foto B), note e contestazioni.
  - Dall'orario di esfiltrazione si calcolano il **ritardo** rispetto all'orario massimo (penalità per minuto) e il **tempo risparmiato**, che serve per gli spareggi.
- **Esfiltrazione anticipata di singoli operatori** (R7): la squadra la segnala dall'app per ciascun operatore, con orario e GPS (vale come il "messaggio di conferma" del regolamento FIGT, art. 3.1).
  - L'operatore esce dal gioco. Gli effetti sui punti si configurano: FIGT toglie i punti positivi legati al materiale che l'operatore aveva con sé e lascia i negativi.
  - Se gli operatori in gioco scendono **sotto il minimo** previsto dalla disciplina, l'app avvisa che la squadra deve esfiltrare.
- **Squalifica** (R5):
  1. **l'arbitro segnala** la penalità che comporta la squalifica (es. terzo "non dichiarato") oppure un fatto da squalifica;
  2. la segnalazione arriva alla **direzione**, che **assegna la squalifica**. L'app aiuta riconoscendo da sola le soglie, per esempio il terzo "non dichiarato" sommando tutte le schede;
  3. dal momento della squalifica:
     - **tutte le finestre della squadra ancora aperte o prenotate vengono cancellate**, liberando le code;
     - la squadra **non può più chiedere luci verdi** e **non compare più fra le squadre selezionabili** da arbitri e direzione;
     - la squadra appare come **SQUALIFICATA** ovunque (code, schede, classifiche);
  4. in classifica la squadra squalificata è esclusa ("non classificata"). Nel campionato vale la regola configurata (FIGT: 0 punti nel calcolo della media).
- **Debriefing della squadra**: la direzione (che può anche fare da arbitro) compila gli obiettivi di **controllo**. Esempio: "materiale riportato: A sì, B sì, C no". Sono normali template di tipo controllo, e possono portare punti in più o in meno.
- **Fine debriefing della squadra**: la squadra passa a **Terminata**.

### Recupero di operazioni mancanti in debriefing
- Esempio: la direzione dice "non risulta la Recon 1". La squadra controlla nell'app: la Recon 1 c'è, salvata alle 11:00 ma mai arrivata al server.
- La squadra la **passa alla direzione via QR**. La scheda esecuzione mantiene **l'orario originale (11:00)**, non quello del passaggio.
- Siccome è stata fatta prima dell'esfiltrazione, è valida.

## 6ter. Iscrizioni e campionati

- L'ente crea l'evento **per uno o più coordinamenti**: le squadre di quei coordinamenti lo vedono.
- **Iscrizione**: una persona della squadra con il proprio account (non serve un "account di squadra") iscrive la squadra e **dà la presenza** dei componenti.
- **Pagamenti**: per ora solo lo stato **pagato / non pagato**. Il pagamento dentro l'app è previsto in futuro.
- **Prestito di atleti** (R10), **versione semplice**: all'iscrizione si può aggiungere un operatore di un'altra squadra, segnandolo **"in prestito da …"**. Il prestito resta nello storico. Nulla osta, limiti numerici e durata del prestito per ora non sono gestiti: li controlla la direzione.
- L'ente ha **l'elenco delle persone di ogni squadra** con la tessera: le presenze si scelgono da quell'elenco.
- **Account obbligatorio per almeno un membro** della squadra: serve per iscriversi e accettare il torneo, e chi firma in campo deve avere l'account. Deve **accedere all'app prima dell'inizio della gara**.
- **Campionati**:
  - un ente può avere più campionati in parallelo (es. regionale Piemonte e regionale Liguria);
  - ogni campionato ha l'**elenco delle squadre iscritte al campionato**;
  - le altre squadre possono partecipare a una gara **"open"**: giocano quella gara ma non sono nel campionato.
- **Classifiche di una gara**:
  1. **generale (di giornata)**: tutte le squadre, open comprese, con i punti di gara;
  2. **una per ogni campionato** a cui la gara è assegnata: si **tolgono le squadre open** e le posizioni si ricalcolano.
- **Punti campionato per posizione**: ogni campionato ha la sua tabella, configurabile.
- Esempio:

  | Squadra | Classifica generale | Classifica campionato | Punti campionato |
  |---|---|---|---|
  | Squadra A (open) | 1ª — 11.300 punti | — (esclusa) | — |
  | Squadra B (campionato) | 2ª — 10.200 punti | **1ª** | **25** |
  | Squadra C (campionato) | 3ª | **2ª** | **20** |
- **Più campionati**: una squadra può essere iscritta a più campionati, e una gara può valere per più campionati. **Ogni campionato è separato dagli altri**: classifica, punti e calcoli sono indipendenti.
- **Squadre organizzatrici**: ogni evento ha le sue squadre organizzatrici, da configurare. Non giocano la gara che organizzano, quindi non fanno punteggio.
  - Se sono in campionato, ricevono un **punteggio calcolato** dalle altre gare del campionato, con una **regola configurabile**: media, minimo, massimo, media senza il migliore e il peggiore, …
  - Il calcolo usa **tutte le gare del campionato**, quindi questo punteggio resta **provvisorio fino all'ultima gara** e si aggiorna man mano.
  - Se una squadra organizza gare in due campionati diversi, il punteggio si calcola **separatamente in ciascun campionato**, usando solo le gare di quel campionato.

## 7. Regolamento e book

- **Disponibile a tutti**, squadre e arbitri: è il riferimento su cui si basa tutto.
- **Scaricato sul telefono** quando l'arbitro accetta l'evento (e quando la squadra si iscrive). Anche se l'app si chiude, alla riapertura si legge dal telefono, senza rete.
- **Versioni**: lo carica l'ente, che può **ricaricarlo anche per una gara già esistente** finché non è avviata. All'avvio viene congelato (§6bis). Per l'evento successivo l'app non riusa la copia vecchia ma scarica la versione di quell'evento.
- **Book dell'evento**: stesse regole del regolamento (scaricato sul telefono e bloccato per l'evento). Contenuto: **PDF, mappe, altri file, pagine HTML**.
  - Nota tecnica: scaricare un book pesante occupa spazio sul telefono. Va mostrata la dimensione e il download va completato *prima* di andare in campo.

## 8. Luci verdi

Un obiettivo può ricevere molte squadre (es. 50), ma **una alla volta**, ciascuna nella propria finestra di luce verde.

### 8.0 Chi gestisce le code: modalità configurabile per evento (R3)
| Modalità | Chi prende le richieste e assegna le finestre |
|---|---|
| **Dislocata** | L'**arbitro dell'obiettivo**, dal proprio telefono, anche offline |
| **Centralizzata** | La **direzione gara**, per tutti gli obiettivi, dalla dashboard. L'arbitro sul campo vede la coda aggiornata (quando c'è rete) e gestisce l'esecuzione |

- Le regole (prima finestra libera, pause, niente doppie prenotazioni, spostamento con motivo) sono le stesse in entrambe le modalità.
- **Attenzione offline in modalità centralizzata**: se l'arbitro sul campo è senza rete, non riceve le finestre assegnate dalla direzione. La direzione le comunica via radio e l'arbitro le **inserisce a mano**. Quando torna la rete, l'app confronta le due versioni e segnala le differenze, come per la squadra (§8.6).

### 8.1 La finestra
- **Finestra = dall'inizio della luce verde all'inizio + la durata dell'obiettivo.** Esempio: luce verde alle 10:40 e obiettivo da 20 minuti, finestra **10:40–11:00**.
- Dentro la finestra la squadra entra quando vuole. Se entra alle 10:50 e finisce alle 10:55 va bene. **Alle 11:00 in punto la finestra si chiude comunque**: i minuti persi entrando in ritardo sono a carico della squadra.
- **Nessuna tolleranza**, né in ritardo né **in anticipo**: chi ingaggia l'obiettivo prima dell'inizio della finestra è fuori finestra (vedi §8.5).

### 8.2 Prenotazione
1. La squadra chiede la luce verde **via radio**, oppure **via app** se l'evento lo consente (opzione *"Permetti luci verdi digitali"*).
2. L'app mostra all'arbitro **la prima finestra disponibile**: la fine dell'ultima finestra in coda.
3. **La pausa fra due squadre la decide l'arbitro**, per esempio perché l'obiettivo è da rimettere a posto o è rotto. L'app propone, l'arbitro sceglie.
4. Interfaccia proposta: pulsante **"Aggiungi"** e selettore dell'orario a scorrimento. L'app inserisce una **finestra provvisoria (non accettata)** e ne mostra inizio e fine.
5. La squadra decide:
   - **Accetta** → l'arbitro preme "Accetta finestra". **La squadra non può più tornare indietro**: la finestra è quella, e se non la rispetta è fuori finestra.
     - **Solo chi gestisce la coda** (arbitro o direzione) può **spostarla o mettere la squadra in attesa** per motivi sopraggiunti (R2, regolamento FIGT art. 5.1 h). Il **motivo è obbligatorio**, l'operazione registra orario e GPS, e la squadra vede la modifica.
   - **Rifiuta** → l'arbitro cancella la finestra provvisoria. Non resta nulla e la squadra può richiederne un'altra.
6. **Niente doppie prenotazioni**: una squadra con una luce verde già accettata su un obiettivo non può riceverne una seconda sullo stesso obiettivo.

### 8.3 Arbitro e obiettivi
- L'arbitro è **assegnato a uno o più obiettivi**: di solito uno, ma l'associazione è a N. Esempio: obiettivo 1 più gli scontri.
- L'arbitro vede **solo le code e le schede dei propri obiettivi**, così non può sbagliare obiettivo o finestra.

### 8.4 Esecuzione e cronometro
- All'inizio della finestra l'arbitro vede **la squadra di turno e il template da usare**. Con un tocco apre la scheda **già compilata**: arbitro, squadra, obiettivo, finestra.
- Il **conto alla rovescia parte da solo all'inizio della finestra**, anche se la squadra non è ancora entrata, e arriva a zero alla fine della finestra.
- **STOP**: se la squadra finisce prima, l'arbitro ferma il tempo.
- Il **tempo impiegato (minuti e secondi)** viene salvato nella scheda (campo Tempo) e si conta **dall'inizio della finestra** fino allo STOP.
  - Esempio: finestra 10:40–11:00, STOP alle 10:55: tempo **15 minuti**, anche se la squadra è entrata alle 10:50.
  - Motivo: l'arbitro non può sapere quando la squadra è partita davvero, ma sa con certezza quando la finestra inizia e quando deve finire.

### 8.5 Fuori finestra
- L'arbitro può **dichiarare il fuori finestra**, con l'orario registrato, per due motivi:
  1. **mancata presentazione**: la squadra non si è presentata entro la fine della finestra;
  2. **arrivo dopo la fine**: per esempio arriva alle 11:20 con finestra 10:40–11:00;
  3. **ingaggio in anticipo**: per esempio alle 10:38 l'arbitro sente sparare sull'obiettivo prima dell'inizio della finestra (10:40). Fischia, ferma l'azione e va dalla squadra che ha ingaggiato, che deve **identificarsi**:
     - se è la squadra con la luce verde → **fuori finestra (anticipo di 2 minuti)**: obiettivo perso;
     - se è **un'altra squadra** → il fuori finestra è di **quella squadra**. Dall'app l'arbitro deve poter registrare un fuori finestra anche per una squadra che non è in coda.
- **Diritto di rifare l'obiettivo** dopo un ingaggio senza luce verde: di norma è perso, ma va **configurato** perché dipende dal regolamento.
- **Squadra che non si identifica** (scappa): l'arbitro fa una **segnalazione** con quello che ha visto, per esempio il colore o il numero della **fascia**. Se nessuno la riconosce, può farla franca.
- Conseguenza: **l'obiettivo è perso**, più l'eventuale **penalità** prevista nella configurazione dell'obiettivo.

### 8.6 Lato squadra e orari
- Quando l'arbitro inserisce la luce verde, la squadra la vede nella propria app se c'è rete. Offline può **inserirla a mano**; quando torna la rete, se c'è una differenza fa fede quella dell'arbitro e la differenza viene segnalata.
- **Ora del server**: l'app conosce di quanto il telefono è avanti o indietro rispetto al server, e lo aggiorna a ogni sincronizzazione. Offline usa l'ultimo valore noto. Ogni operazione salva sia l'ora del server sia quella del telefono.

## 9. Arbitri: certificazione, disponibilità, assegnazione *(fase futura)*

- L'ente **certifica** gli arbitri: all'utente viene associata l'etichetta "arbitro".
- L'arbitro imposta un'**area di pertinenza**: una regione oppure un raggio in km da un punto.
- Gli arbitri possono essere iscritti a un **coordinamento**.
- L'ente crea l'evento con le coordinate e indica quanti arbitri servono. L'app **propone gli N più adatti** in base a: appartenenza al coordinamento, area di pertinenza o distanza, disponibilità, **esperienza** (numero di eventi arbitrati, dallo storico, P10).
- **Accettazione o rifiuto, sempre.** Se accetta, l'arbitro sparisce dalle ricerche per altri eventi concomitanti; se rifiuta, torna disponibile.
- **Conflitto di interessi** (R9): se un arbitro appartiene a una squadra in gara, l'app lo **segnala** (all'assegnazione degli obiettivi, quando giudica la propria squadra, nella commissione di gara) **ma non lo blocca**. Di solito non si assegnano arbitri con la propria squadra in campo.

## 10. Dashboard direzione gara

- In modalità centralizzata (§8.0): **gestione delle code di tutti gli obiettivi**.

- Andamento live: avanzamento degli obiettivi e classifica (già nel prototipo).
- Lista contestazioni ben evidente (§5).
- **Classifica configurabile dalla direzione gara**: *pulita* (con i punti) oppure *alla cieca* (solo le posizioni).
- **Grafico "stile Formula 1"**:
  - asse X = orario degli eventi di gara, a partire da zero per tutte le squadre;
  - ogni squadra è una linea che sale o scende a ogni scheda (punti presi o persi) e mostra i sorpassi;
  - proposta: in modalità *pulita* l'asse Y sono i **punti cumulati**; in modalità *alla cieca* l'asse Y è la **posizione** (1ª, 2ª…), come il grafico dei giri della F1: si vedono i sorpassi ma non i punti.

## 11. Firma, identità e prova di presenza

- **Chi firma per la squadra**: qualsiasi membro della squadra presente all'evento, non solo il caposquadra.
- **Firma digitale fatta sul momento**: generata in quell'istante (es. passando un QR), non riutilizzabile e non preparabile in anticipo.
- **Ogni firma porta**: chi firma (persona e squadra), ora del server (P7), **GPS con precisione** (P8) e il codice di controllo della scheda.
- **Verifica successiva**: la direzione deve poter controllare che la firma sia avvenuta **fra quelle due persone, in quel momento e in quel luogo**. Per esempio, che arbitro e squadra fossero vicini.
- Proposta tecnica:
  - ogni persona ha una **chiave di firma personale** creata sul proprio telefono e registrata sul server con l'account, almeno una volta online e prima dell'evento;
  - offline la firma si fa con quella chiave: nessuno può firmare a nome di un altro, e una scheda modificata dopo la firma non è più valida;
  - la firma della squadra copre anche quella dell'arbitro, quindi le due sono legate fra loro.

## 11bis. Test ASG digitale (prima della gara)

- Il **test delle ASG** (regolamento FIGT art. 11.1) si fa **prima della gara** ed è **digitalizzato nell'app**.
- Per ogni ASG: operatore, modello, **misura** (joule o m/s), pallini e strumento usati, esito (regolare / oltre la soglia di attenzione / **over joule**), marcatore applicato.
  - FIGT: limite di 1 J; oltre 0,95 J doppio marcatore e nuovo test all'esfiltrazione; l'ASG over joule viene trattenuta.
- Le soglie sono **configurabili per regolamento**.
- Registro delle **ASG trattenute** e delle **ASG da ritestare all'esfiltrazione**.
- **Regola di avvio**: la gara non può partire finché tutte le squadre non hanno finito il test (FIGT art. 11.1 i). L'app lo mostra alla direzione prima del pulsante "Avvia".
- **Joulometro Bluetooth**: si vuole collegare all'app il joulometro Bluetooth di Marco, così la misura arriva direttamente senza essere trascritta.
  - **Limite tecnico importante**: un'app web può collegarsi a un dispositivo Bluetooth **solo da Chrome su Android o da computer**, **non da iPhone**. Il test ASG si fa al tavolo di registrazione, quindi basta che *quel* dispositivo sia Android o un PC.
  - **Modello** (R11): Acetech AC6000 BT, che di serie si usa con l'app ACESoft.
    - Il suo protocollo Bluetooth **non è pubblicato**: va ricavato osservando cosa trasmette mentre si spara (pagina di prova sul telefono Android o nRF Connect).
    - Lo strumento misura la **velocità (m/s)**; i joule si calcolano dal peso del pallino: J = ½ · massa · v². Esempio: 0,20 g a 99,49 m/s ≈ 0,99 J.
    - Finché il collegamento non è pronto resta sempre l'**inserimento manuale** della misura.

## 12. Piattaforma

- **Obiettivo: installazione facilissima.** App web installabile (PWA): si apre un indirizzo e si installa in due passi.
- Gli store (Apple e Google) solo se la PWA ha limiti bloccanti. Per ora sono considerati complicati da gestire.
- **Telefoni vecchi e nuovi, e quasi sicuramente iPhone**: su iOS servono attenzione e test particolari.
- **Limiti noti della PWA da verificare** (soprattutto su iPhone):
  - **sync solo ad app aperta**: su iOS la sincronizzazione in background non esiste, quindi i dati partono quando l'utente riapre l'app con la rete;
  - **GPS solo ad app aperta**: va bene, perché la posizione serve nel momento dell'operazione;
  - **GPS falsificabile**: sui telefoni Android si può simulare una posizione finta; un'app web non può accorgersene, un'app nativa in parte sì. Le firme incrociate (arbitro e squadra vicini) riducono il problema;
  - **spazio sul telefono** per foto, regolamento e book: va misurato sugli iPhone;
  - **dati cancellati**: Safari può cancellare i dati di un sito non installato; l'app installata in Home ne è esclusa, quindi l'installazione va resa obbligatoria per chi va in campo;
  - **notifiche** (es. "la tua luce verde è alle 10:40"): su iPhone solo con app installata e iOS 16.4 o successivi.
- **Numeri**: eventi contemporanei potenzialmente molti, senza un tetto noto. Il sistema deve reggere più eventi in parallelo, tenuti separati dall'ID evento (P11).

---

## Domande aperte

Nessuna: tutte le domande da 1 a 34 hanno avuto risposta e sono state incorporate nelle sezioni sopra.
