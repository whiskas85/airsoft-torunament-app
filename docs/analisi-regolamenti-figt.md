# Analisi dei regolamenti FIGT

> Documenti letti il 2026-10-08, in `Regolamenti/FIGT/`:
> - Regolamento di gioco PLR & PCR, **ed. 8 del 31.01.2026**
> - Manuale attuativo per l'organizzazione, ed. 1/2024
> - Specifica sulla pubblicazione dei punteggi ufficiali
> - Regolamento dei Comitati Regionali, ed. 12
> - Regolamento del Settore Arbitrale, ed. 10
> - Regolamento di giustizia sportiva, ed. 9 (solo scorso)
> - Tabelle arbitrali PLR e PCR (A, A+D, E, F+G, H, controinterdizione, esfiltrazione), modulo recon tipo C, schede di registrazione atleti
>
> Uso: sono **un esempio di configurazione**, non regole da scrivere nel codice (P3, P5). Tutto ciò che è FIGT diventa **dati di configurazione** dell'ente "FIGT".

## 1. Prima scoperta: il regolamento prevede già un'app

Il regolamento ed. 8 parla esplicitamente di "sistemi informatizzati / App" in molti articoli, e fissa regole che l'app deve rispettare:

| Articolo | Cosa dice |
|---|---|
| 12 a–c | L'organizzazione può usare un'app al posto della carta. **Oggi è autorizzata solo l'app "SOFTAIR TOURNAMENT"** (iOS/Android). Si consiglia un backup cartaceo |
| 2.1 p | Con l'app, la pattuglia **controlla e convalida** quanto inserito dall'arbitro "mediante la procedura dell'apparato" |
| 15.1 d, 15.1 e | **"La firma verrà richiesta tramite la scansione di un QR-code assegnato alla Pattuglia incursori"** |
| 13 c, 13 g | Con l'app **i punti sono visibili a tutte le pattuglie** |
| 13 f | Con l'app lo spareggio sul tempo di esfiltrazione è automatico |
| 13 h | Con l'app la **pubblicazione nell'app** vale come pubblicazione ufficiale |
| 16 g | Con l'app non ci sono errori di somma da contestare: l'articolo è nullo |
| 4.3 a | Obiettivo B: il cartello si acquisisce "nelle modalità dell'app" |
| 3.1 a | Esfiltrazione anticipata confermata con un messaggio, anche "mediante eventuale App" |
| 1 h, 5.1 b | **L'orario ufficiale è quello GPS / standard**: conferma il principio P7 |

**Conseguenza importante:** per essere usata in un campionato FIGT, la nostra app deve essere **autorizzata dalla federazione** (art. 12 b) come lo è oggi "Softair Tournament". Probabilmente è l'app con i QR troppo grandi di cui parlavi. Il regolamento le dà già un ruolo preciso: firma via QR, punti visibili, pubblicazione ufficiale.

## 2. Discipline: PLR e PCR

Lo stesso ente ha **due discipline con regole diverse**. Nel modello dei dati la **disciplina** è un livello di configurazione fra regolamento e template.

| | PLR (lungo raggio) | PCR (corto raggio) |
|---|---|---|
| Movimento | Libero nell'area operativa (AO) | Percorso obbligato, obiettivi in sequenza (OBJ1 → OBJ2 → …) |
| Durata | Da 6 a 45 ore | Non specificata |
| Pattuglia | 3–6 operatori; sotto 2 deve esfiltrare | 3–8 operatori; sotto 3 deve esfiltrare |
| Tipologie di obiettivo | 8: A, B, C, D, E, F, G, H | 6: niente B e C |
| Finestra di attacco | **Prenotata** via radio, all'arbitro oppure all'organizzazione ("**finestra centralizzata**") | **Niente prenotazione**: la pattuglia aspetta alla Porta IN, in ordine di arrivo; l'arbitro **apre la finestra con 2 fischi** |
| Controinterdizione | Sì, con una sua tabella (scontri vinti o persi) | No |
| Esfiltrazione | Orario massimo; −50 punti per ogni minuto di ritardo; **tempo risparmiato** usato per gli spareggi | Senza tempo |
| Bonus | Punteggio minimo di 50 per obiettivo | **+10 punti per ogni minuto risparmiato** sulla finestra, solo se l'obiettivo è completato al 100% |

## 3. Le tabelle arbitrali → struttura dei template

La **Tabella Arbitrale Obiettivo** (PLR A+D) ha questa struttura:

| Sezione | Campi | Tipo nel nostro modello |
|---|---|---|
| Intestazione | Nome arbitro, qualifica, data, canali radio, nome e tipologia dell'obiettivo, telefoni dell'organizzazione | Compilata in automatico (arbitro, evento, obiettivo) |
| **Penalità** (contatori con un massimo) | Bivacco (6), Aiuto cartografico (6), Operatore non dichiarato (3), Marcatura ASG assente (6), Operatore non in coppia (6), Fascia non esposta (6), Operatore squalificato (8), Interferenza arbitrale (3), Comportamento antisportivo (3), ASG over joule (3), Sacco rifiuti cestinato (3) | **Numero con massimo** (come previsto in §2.3 dei requisiti) |
| Finestra | Durata, inizio e fine dell'obiettivo, tipologia | Compilata dalla luce verde e dal cronometro |
| Esito | ID pattuglia, **F.F.** (fuori finestra), **PUN MIN** (punteggio minimo), **Difensori eliminati 0–4**, **Civili colpiti 0–4**, **fino a 7 fasi E (SI/NO)** | Sì/No, numeri con massimo, sì/no per fase |
| PCR | **Minuti impiegati 1–30**, arrotondati per eccesso (8 min 15 s = 9) | Tempo, con regola di arrotondamento |
| Note e contestazioni | **Sezione pattuglia** e **sezione arbitro**, separate e firmate | Le contestazioni a due voci previste in §5 dei requisiti |
| Firme | Capo pattuglia e arbitro | Firma digitale (§11 dei requisiti) |

Altre schede:
- **Contro interdizione** (PLR): fino a 6 scontri, ciascuno *vinto / perso* con la firma del capo pattuglia sotto **ogni esito**. È l'esempio "scontro vinto / perso" che avevi fatto.
- **Modulo esfiltrazione**: orario di esfiltrazione, operatori esfiltrati, tempo risparmiato, operatori esfiltrati in anticipo, le stesse penalità, e l'elenco degli **obiettivi senza arbitro** (E senza arbitro, C con "report consegnato", B con "foto visionate") come SI/NO. Ha anche le note e contestazioni per gli obiettivi senza arbitro.
- **Modulo recon C**: fino a 4 osservazioni, ognuna con la sua posizione cardinale. Il punteggio è la **percentuale di risposte corrette**.
- **Obiettivo B (way point)**: **foto del cartello con almeno 2 operatori con la fascia visibile**.

## 4. Punteggi → cosa deve saper calcolare l'app

Dall'art. 14 risultano regole di calcolo **più ricche di "quantità × punti"**:

| Regola FIGT | Tipo di regola da supportare |
|---|---|
| Difensore eliminato +40, ribelle +30, civile colpito −25, over joule −700 per ASG | **Per unità** (già previsto) |
| **Fuori finestra = meno i punti positivi previsti per quell'obiettivo** | **Riferita al valore dell'obiettivo** |
| **Non dichiarato: 1° = −200, 2° = −800, 3° = squalifica della pattuglia** | **A scaglioni**, contati **su tutta la gara** e non sulla singola scheda, con **squalifica** automatica |
| Bonus PCR: +10 per minuto risparmiato **solo se l'obiettivo è completato al 100%** | **Condizionata** |
| Recon C: da 50 a 500 in **percentuale** delle risposte corrette | **Percentuale** |
| Way point B +50 ciascuno, **+150 se presi tutti** | **Bonus di completamento** |
| Ritardo all'esfiltrazione: −50 per minuto | **Per minuto** |
| Contestazione su giudizio arbitrale respinta: **−600** | **Esito della contestazione** |
| Punteggio minimo 50 per obiettivo (PLR) | **Minimo garantito** |
| Esfiltrazione anticipata: l'operatore perde i punti positivi e tiene i negativi | **Regola per operatore** |
| Pattuglia disturbata da un'altra durante la sua finestra: **punteggio massimo** | **Assegnazione del massimo** |

## 5. Luci verdi: cosa aggiunge il regolamento

- **Area temporale**: ogni obiettivo è attivo solo in certi orari (es. dalle 8:00 dell'11/9 alle 9:00 del 12/9), con un'**ultima finestra utile**. Fuori da quegli orari l'app non deve proporre finestre.
- **Durata della finestra**: da 5 a 30 minuti (FIGT). È un limite di configurazione.
- **Finestra centralizzata** (PLR): le richieste arrivano all'organizzazione invece che all'arbitro dell'obiettivo. L'ente sceglie la modalità per ogni evento. Serve quindi una **gestione delle code dalla dashboard della direzione**.
- **Tempo per rimettere a posto l'obiettivo**: l'arbitro lo verifica all'arrivo (Settore Arbitrale 15.3) e diventa la pausa minima fra due finestre. Conferma "la pausa la decide l'arbitro".
- **L'arbitro può cambiare una finestra già assegnata** per motivi sopraggiunti, e mettere una pattuglia "in attesa" (art. 5.1 h). → Vedi la domanda R2.
- **Stima dell'attesa**: la pattuglia può chiedere quanto deve aspettare (art. 5.1 j). È proprio la funzione "prima finestra libera".
- **Fuori finestra** (art. 5.2), con un caso in più rispetto ai requisiti: **la finestra scade senza nessun ingaggio positivo** (la pattuglia non si è presentata). Gli altri casi: ingaggio senza finestra valida, presenza nell'area di esecuzione senza finestra, ingaggio da parte della controinterdizione nella zona obiettivo.
- **Pattuglia disturbata** (art. 2.1 t): chi ha la finestra prende il punteggio massimo e aspetta la fine della finestra. Chi disturba prende fuori finestra (o "contro persa" se aveva già fatto l'obiettivo). È il caso "spari alle 10:38" che avevi descritto.
- **Protocollo di sospensione** (manuale, art. 8): un obiettivo **chiuso temporaneamente** continua a prendere prenotazioni normalmente. Chi entra riceve il punteggio pieno ma deve aspettare tutta la finestra. **Le squadre non vengono avvisate.** → Serve uno stato "sospeso" visibile solo ad arbitro e direzione.
- **Fase non eseguibile per un problema** (manuale, art. 7.4): la fase viene "abbuonata".
- **Obiettivo senza arbitro sostituibile** (Settore Arbitrale 13.5): l'obiettivo viene chiuso e **i punti positivi già assegnati vengono annullati**.

## 6. Esfiltrazione = il nostro "rientro"

Quello che nei requisiti si chiama "rientro squadra" nel regolamento è l'**esfiltrazione** (art. 3):
- il tempo si prende **alle coordinate di esfiltrazione**, quando ci sono **tutti gli operatori** e il materiale è stato consegnato;
- dopo la chiusura del contenitore **niente altro è valido**: è il nostro "congelamento";
- **esfiltrazione anticipata di singoli operatori**, confermata con un messaggio (anche dall'app), per gli operatori che lasciano prima;
- l'**arbitro di esfiltrazione** compila il modulo di esfiltrazione: è un ruolo da prevedere;
- in esfiltrazione si possono contestare **solo** le cose che non si potevano contestare prima (es. obiettivi senza arbitro). Altrimenti −600.

## 7. Contestazioni: regole precise

- Valgono solo quelle scritte sulle tabelle **firmate da arbitro e capo pattuglia** (art. 16 a).
- **Manca la firma della pattuglia e non c'è contestazione** → il risultato è accettato tacitamente.
- **Manca la firma della pattuglia ma c'è una contestazione** → la contestazione è **respinta**.
- **L'arbitro non compila la propria sezione** sulla contestazione → la contestazione è **accolta automaticamente** (art. 15.2 d).
- L'arbitro **può scrivere la sua dichiarazione dopo**, non davanti alla pattuglia (art. 15.2 e). → Nell'app diventa un **compito in sospeso** per l'arbitro, da completare anche offline prima della commissione.
- Esaminano la **Commissione di gara** (capo arbitro e 2 arbitri di **team diversi**) insieme all'organizzazione. L'arbitro può essere **sentito a porte chiuse**.
- Contestazioni respinte su certi giudizi (non dichiarato, fuori finestra, civili colpiti, comportamenti, interferenza, fascia, contestazioni fatte all'esfiltrazione) → **−600**.
- **Dopo la classifica**: reclamo entro **24 ore** dalla classifica ufficiale; la classifica resta **sospesa** fino alla decisione della Commissione regionale (15 giorni), con eventuale ricorso alla Commissione federale.
- **Classifica ufficiale entro 24 ore** (regolamento) o **48 ore** (specifica di pubblicazione). Contenuto obbligatorio: numero di tappa, data, luogo, associazioni organizzatrici, elenco delle pattuglie, **punteggio dettagliato per obiettivo**, tempo risparmiato.

## 8. Campionato

Dal manuale (art. 4), una conferma e un'estensione di quanto avevi detto:
- **Punti per posizione** (FIGT): 25, 22, 20, 18, 16, 15, poi uno in meno a ogni posizione fino alla 17ª, e **3 punti dalla 18ª in giù**.
- **Pari merito in una tappa**: si dà la **media dei punti** delle posizioni coinvolte, e la squadra seguente scala di un posto.
- **Classifica finale = i 3 migliori risultati giocati + il punteggio medio** per l'organizzazione o l'**aiuto**.
- Per entrare in classifica servono **almeno 4 tappe**: 3 giocate e 1 organizzata o in aiuto.
- Oltre alle **organizzatrici** ci sono le **ASD "in aiuto"**: anche loro prendono la media. Se un'ASD in aiuto non si presenta perde la media e prende −5.
- **Spareggio a fine campionato**: numero di primi posti, poi di secondi, e così via; poi i minuti di esfiltrazione risparmiati.
- **Squalifica** = 0 nel calcolo della media; **"non classificato"** (iscritta ma assente) conta come presente nella media.
- **Campionato interregionale**: una classifica generale più **una per ogni comitato**. Conferma il modello "classifica generale + classifiche per campionato".
- **PCR**: più pattuglie della stessa ASD possono partecipare, ma **solo una va in classifica** (quella che entra per prima sul percorso).
- **Fasi finali e playoff**: c'è un'intera logica di qualificazione. → **Fuori dalla prima versione.**

Tutto questo va reso **configurabile per ogni campionato**: tabella dei punti per posizione, regola per i pari merito, "migliori N risultati", regola per organizzatrici e aiuto, criteri di spareggio, numero minimo di tappe.

## 9. Arbitri e registrazione

- **Qualifiche**: *Ausiliare* (dopo l'esame scritto), *Regionale* (dopo una tappa valutata positivamente dal capo arbitro), *Nazionale* (almeno 2 anni da regionale e 10 gare). Servono qualifiche diverse per ruoli diversi: per la controinterdizione almeno regionale; nelle gare nazionali di preferenza nazionali.
- **Ruoli dello staff in gara**: capo arbitro, arbitro di obiettivo, arbitro di controinterdizione, arbitro di esfiltrazione, commissione di gara.
- **Designazione**: la fa il **responsabile arbitrale regionale**. L'arbitro può rinunciare entro 10 giorni, con motivazione. È il flusso "proposta → accetta / rifiuta" dei requisiti.
- **Ogni ASD partecipante deve portare un arbitro** (Comitati, art. 22 f): legame arbitro ↔ squadra, con un possibile **conflitto di interessi**.
- **Storico arbitri** (attestato di arbitraggio): per ogni gara, il ruolo, una valutazione e **il numero di note e contestazioni**. L'app può produrlo da sola (P10).
- **Registrazione atleti**: identificativo della pattuglia, **colori della fascia**, e per ogni operatore tessera, ruolo (capo pattuglia, vice), **numero di fascia**, nome, segnalazione ASG oltre 0,95 J. In più: ASG di scorta, telefoni dei responsabili, ASG ritirate al test.
- **Fasce** (Comitati, art. 25): ogni ASD ha una **serie di 10 fasce numerate da 0 a 9**, con due colori assegnati per estrazione. È l'**identificativo in campo**: serve per segnalare una squadra che non si identifica.

---

## Domande nate dai regolamenti

> Risposte di Marco (2026-10-08):
> - **R1**: durante la gara la visibilità dei punti è configurabile; in classifica sono sempre visibili.
> - **R2**: ok, la proposta va bene.
> - **R3**: le finestre le possono gestire sia gli arbitri sia la direzione; la modalità *centralizzata* o *dislocata* si configura.
> - **R8**: appena c'è una demo, Marco avvia il percorso di autorizzazione.
>
> - **R5**: la squalifica la segnala l'arbitro e la assegna la direzione. Da lì le finestre della squadra si cancellano e la squadra non è più selezionabile.
> - **R6**: le regole si applicano nell'app, ma decide sempre la direzione; l'arbitro si limita a contestare.
> - **R7**: sì, si chiama "esfiltrazione" e c'è l'esfiltrazione anticipata dei singoli operatori.
> - **R9**: si segnala, non si blocca.
> - **R10**: il test ASG va digitalizzato, prima della gara, con il joulometro Bluetooth; il prestito di atleti in versione semplice. Finali e playoff restano fuori.
>
> - **R4**: sì, anche la PCR entra nella prima versione. PLR e PCR sono **tipologie di gara** che portano con sé documentazione, template e parametri.
> - Limite Bluetooth (solo Android o PC): va bene.
>
> - **R11**: joulometro Acetech AC6000 BT (protocollo Bluetooth non pubblicato, da ricavare).
>
> Nessuna domanda aperta.

**R1. Visibilità dei punti.** Il regolamento dice che con l'app i punti di ogni obiettivo sono visibili a tutte le pattuglie. Nei requisiti avevamo deciso che la squadra non vede i punti.
→ *Proposta: nascosti durante la gara (anche alla cieca); visibili a tutti, con il dettaglio per obiettivo, dalla classifica provvisoria in poi.*

**R2. Finestra già accettata.** Il regolamento permette all'**arbitro** di cambiarla per motivi sopraggiunti.
→ *Proposta: la squadra non può tornare indietro; l'arbitro può spostarla solo indicando un motivo obbligatorio, l'operazione è registrata con orario e GPS e la squadra la vede.*

**R3. Finestra centralizzata.** Va prevista per la prima versione (la direzione gestisce le code di tutti gli obiettivi), o basta la prenotazione all'arbitro dell'obiettivo?

**R4. PCR.** Va gestita già nella prima versione? Il flusso è diverso: coda alla Porta IN in ordine di arrivo, apertura con 2 fischi ("Avvia finestra adesso"), obiettivi in sequenza, bonus per minuti risparmiati.

**R5. Penalità contate su tutta la gara.** Il "non dichiarato" a scaglioni (−200, −800, squalifica al terzo) si conta su tutte le schede della pattuglia. Confermi che l'app deve gestire regole che sommano più schede e possono **squalificare in automatico** la pattuglia (con conferma della direzione)?

**R6. Contestazioni automatiche.** Applichiamo in automatico le regole dell'art. 15.2? Cioè: senza firma della pattuglia la contestazione è respinta; senza dichiarazione dell'arbitro è accolta; quando la direzione respinge una contestazione di certi tipi scatta il −600. Oppure l'app si limita a segnalarle e decide la commissione?

**R7. Esfiltrazione.** Rinominiamo "rientro" in **esfiltrazione** (o "fine missione", per restare generici) e aggiungiamo l'**esfiltrazione anticipata dei singoli operatori** dall'app?

**R8. Autorizzazione FIGT.** Oggi l'unica app autorizzata è "Softair Tournament". Hai già un contatto per far autorizzare la nostra, o pensi di usarla prima fuori campionato (gare "normali") per farla conoscere?

**R9. Arbitro della stessa squadra.** Ogni ASD porta un arbitro. L'app deve **impedire** (o solo segnalare) che un arbitro giudichi la propria squadra, o entri nella commissione di gara quando la sua squadra è coinvolta?

**R10. Prima versione: cosa resta fuori.** Propongo di lasciare fuori qualificazione alle finali, playoff, prestiti e cessioni di atleti, e test ASG con il registro delle ASG ritirate. Sei d'accordo?
