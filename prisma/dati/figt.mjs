// Configurazione FIGT ricavata dai regolamenti (Regolamento PLR & PCR ed. 8, tabelle arbitrali 2024,
// manuale attuativo ed. 1). È un ESEMPIO di configurazione: nel codice dell'app non c'è niente di FIGT.

// ─────────────── mattoncini delle tabelle arbitrali ───────────────

const contatore = (chiave, etichetta, max) => ({ chiave, tipo: 'contatore', etichetta, max });
const sino = (chiave, etichetta) => ({ chiave, tipo: 'sino', etichetta });
const numero = (chiave, etichetta, max) => ({ chiave, tipo: 'numero', etichetta, min: 0, max });

/** Penalità della tabella arbitrale PLR (caselle 1…N) */
const PENALITA_PLR = [
  contatore('bivacco', 'Bivacco', 6),
  contatore('aiuto_cartografico', 'Aiuto cartografico', 6),
  contatore('non_dichiarato', 'Operatore non dichiarato', 3),
  contatore('marcatura_asg_assente', 'Marcatura ASG assente', 6),
  contatore('non_in_coppia', 'Operatore non in coppia', 6),
  contatore('fascia_non_esposta', 'Fascia non esposta o manomessa', 6),
  contatore('operatore_squalificato', 'Operatore squalificato', 8),
  contatore('interferenza_arbitrale', 'Interferenza arbitrale', 3),
  contatore('comportamento_antisportivo', 'Comportamento antisportivo', 3),
  contatore('asg_over_joule', 'ASG over joule', 3),
  contatore('sacco_rifiuti', 'Sacco dei rifiuti cestinato in OBJ', 3),
];

/** Penalità della tabella arbitrale PCR */
const PENALITA_PCR = [
  contatore('operatore_squalificato', 'Operatore squalificato', 8),
  contatore('fascia_non_esposta', 'Fascia non esposta', 3),
  contatore('non_dichiarato', 'Operatore non dichiarato', 3),
  contatore('interferenza_arbitrale', 'Interferenza arbitrale', 3),
  contatore('comportamento_antisportivo', 'Comportamento antisportivo', 3),
  contatore('asg_over_joule', 'ASG over joule', 3),
  contatore('marcatura_asg_assente', 'Marcatura ASG assente', 3),
];

const FASI = { chiave: 'fasi', tipo: 'fasi', etichetta: 'Fasi E (prove)' };
const MINUTI_PCR = {
  chiave: 'minuti_impiegati', tipo: 'tempo', etichetta: 'Minuti impiegati',
  sorgente: 'cronometro', arrotonda: 'minuto_per_eccesso', max: 30,
};

function obiettivo(penalita, esito, extra = []) {
  return {
    sezioni: [
      { chiave: 'esito', titolo: 'Esito', campi: esito },
      ...extra,
      { chiave: 'penalita', titolo: 'Penalità', campi: penalita },
    ],
  };
}

// ─────────────── template ───────────────

export const TEMPLATE = [
  // PLR
  { codice: 'PLR-OBJ-AD', nome: 'Tabella obiettivo PLR — A e D', genere: 'OBIETTIVO',
    campi: obiettivo(PENALITA_PLR, [sino('fuori_finestra', 'F.F. (fuori finestra)'), sino('punteggio_minimo', 'Punteggio minimo'),
      numero('difensori_eliminati', 'Difensori eliminati', 4), numero('civili_colpiti', 'Civili colpiti', 4), FASI]) },
  { codice: 'PLR-OBJ-E', nome: 'Tabella obiettivo PLR — E', genere: 'OBIETTIVO',
    campi: obiettivo(PENALITA_PLR, [sino('fuori_finestra', 'F.F. (fuori finestra)'), sino('punteggio_minimo', 'Punteggio minimo'), FASI]) },
  { codice: 'PLR-OBJ-FG', nome: 'Tabella obiettivo PLR — F e G', genere: 'OBIETTIVO',
    campi: obiettivo(PENALITA_PLR, [sino('fuori_finestra', 'F.F. (fuori finestra)'), sino('punteggio_minimo', 'Punteggio minimo'),
      numero('ribelli_eliminati', 'Ribelli colpiti', 10), numero('civili_colpiti', 'Civili colpiti', 6), FASI]) },
  { codice: 'PLR-OBJ-H', nome: 'Tabella obiettivo PLR — H', genere: 'OBIETTIVO',
    campi: obiettivo(PENALITA_PLR, [sino('fuori_finestra', 'F.F. (fuori finestra)'), sino('punteggio_minimo', 'Punteggio minimo'),
      numero('difensori_eliminati', 'Difensori colpiti', 4), numero('ribelli_eliminati', 'Ribelli colpiti', 8),
      numero('civili_colpiti', 'Civili colpiti', 4), FASI]) },
  { codice: 'PLR-CONTRO', nome: 'Modulo contro interdizione PLR', genere: 'CONTRO',
    campi: { sezioni: [
      { chiave: 'scontri', titolo: 'Esito scontri', campi: [{ chiave: 'scontri', tipo: 'ripetuto', etichetta: 'Scontro', max: 6,
        campi: [{ chiave: 'esito', tipo: 'scelta', etichetta: 'Esito', opzioni: ['VINTA', 'PERSA'] }], firmaPerRiga: true }] },
      { chiave: 'penalita', titolo: 'Penalità', campi: PENALITA_PLR },
    ] } },
  { codice: 'PLR-ESFILTRAZIONE', nome: 'Modulo esfiltrazione PLR', genere: 'ESFILTRAZIONE',
    campi: { sezioni: [
      { chiave: 'esfiltrazione', titolo: 'Esfiltrazione', campi: [
        { chiave: 'orario', tipo: 'orario', etichetta: 'Orario esfiltrazione' },
        numero('operatori_esfiltrati', 'Operatori esfiltrati', 6),
        numero('operatori_anticipati', 'Operatori esfiltrati anticipatamente', 6),
      ] },
      { chiave: 'senza_arbitro', titolo: 'Obiettivi senza arbitro', campi: [
        { chiave: 'obiettivi', tipo: 'obiettivi_senza_arbitro', etichetta: 'E senza arbitro · C report consegnato · B foto visionate' },
      ] },
      { chiave: 'penalita', titolo: 'Penalità', campi: PENALITA_PLR },
    ] } },
  { codice: 'PLR-RECON-C', nome: 'Modulo recon obiettivi C', genere: 'RECON',
    campi: { sezioni: [{ chiave: 'osservazioni', titolo: 'Osservazioni', campi: [
      { chiave: 'osservazioni', tipo: 'ripetuto', etichetta: 'Osservazione', max: 4, campi: [
        { chiave: 'posizione', tipo: 'scelta', etichetta: 'Posizione cardinale', opzioni: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'] },
        { chiave: 'testo', tipo: 'testo', etichetta: 'Cosa è stato osservato' },
      ] },
    ] }] } },
  { codice: 'PLR-WAYPOINT-B', nome: 'Way point (obiettivo B)', genere: 'RECON',
    campi: { sezioni: [{ chiave: 'prova', titolo: 'Prova del passaggio', campi: [
      { chiave: 'foto', tipo: 'foto', etichetta: 'Foto del cartello con almeno 2 operatori con fascia visibile', min: 1, max: 3 },
    ] }] } },
  // PCR
  { codice: 'PCR-OBJ-A', nome: 'Tabella obiettivo PCR — A', genere: 'OBIETTIVO',
    campi: obiettivo(PENALITA_PCR, [sino('fuori_finestra', 'F.F. (fuori finestra)'),
      numero('difensori_eliminati', 'Difensori colpiti', 5), numero('civili_colpiti', 'Civili colpiti', 5), FASI],
      [{ chiave: 'tempo', titolo: 'Tempo', campi: [MINUTI_PCR] }]) },
  { codice: 'PCR-OBJ-E', nome: 'Tabella obiettivo PCR — E', genere: 'OBIETTIVO',
    campi: obiettivo(PENALITA_PCR, [sino('fuori_finestra', 'F.F. (fuori finestra)'), FASI],
      [{ chiave: 'tempo', titolo: 'Tempo', campi: [MINUTI_PCR] }]) },
  { codice: 'PCR-OBJ-FG', nome: 'Tabella obiettivo PCR — F e G', genere: 'OBIETTIVO',
    campi: obiettivo(PENALITA_PCR, [sino('fuori_finestra', 'F.F. (fuori finestra)'),
      numero('ribelli_eliminati', 'Ribelli colpiti', 12), numero('civili_colpiti', 'Civili colpiti', 6), FASI],
      [{ chiave: 'tempo', titolo: 'Tempo', campi: [MINUTI_PCR] }]) },
  { codice: 'PCR-OBJ-H', nome: 'Tabella obiettivo PCR — H', genere: 'OBIETTIVO',
    campi: obiettivo(PENALITA_PCR, [sino('fuori_finestra', 'F.F. (fuori finestra)'),
      numero('difensori_eliminati', 'Difensori colpiti', 5), numero('ribelli_eliminati', 'Ribelli colpiti', 12),
      numero('civili_colpiti', 'Civili colpiti', 5), FASI],
      [{ chiave: 'tempo', titolo: 'Tempo', campi: [MINUTI_PCR] }]) },
  // comuni
  { codice: 'TEST-ASG', nome: 'Test ASG (crooning)', genere: 'TEST_ASG',
    campi: { sezioni: [{ chiave: 'misura', titolo: 'Misura', campi: [
      { chiave: 'modello', tipo: 'testo', etichetta: 'Modello ASG' },
      { chiave: 'velocita', tipo: 'decimale', etichetta: 'Velocità (m/s)', min: 0, max: 400 },
      { chiave: 'peso_pallino', tipo: 'decimale', etichetta: 'Peso pallino (g)', min: 0.1, max: 0.5, predefinito: 0.2 },
    ] }] } },
];

// ─────────────── regole di punteggio (art. 14 / 14.1) ───────────────
// Formato: ogni regola guarda un campo (sezione.chiave) e dice quanto vale.
//   per_unita · se_si · scaglioni_gara · valore_obiettivo · da_obiettivo · percentuale · bonus_completamento

const NEGATIVE_COMUNI = [
  { campo: 'esito.fuori_finestra', tipo: 'valore_obiettivo', segno: -1, annullaPositivi: true,
    nota: 'Art. 14 a: tanti punti negativi quanti quelli positivi previsti per l\'obiettivo' },
  { campo: 'penalita.non_dichiarato', tipo: 'scaglioni_gara', scaglioni: [-200, -800], squalificaAl: 3,
    nota: 'Art. 14 b-c: 1° −200, 2° −800, 3° squalifica (contati su tutta la gara)' },
  { campo: 'penalita.asg_over_joule', tipo: 'per_unita', punti: -700, nota: 'Art. 14 d' },
  { campo: 'penalita.fascia_non_esposta', tipo: 'per_unita', punti: -250, nota: 'Art. 14 e' },
  { campo: 'penalita.interferenza_arbitrale', tipo: 'per_unita', punti: -500, nota: 'Art. 14 f' },
  { campo: 'penalita.comportamento_antisportivo', tipo: 'per_unita', punti: -500, nota: 'Art. 14 g' },
  { campo: 'penalita.marcatura_asg_assente', tipo: 'per_unita', punti: -150, nota: 'Art. 14 n' },
  { campo: 'esito.civili_colpiti', tipo: 'per_unita', punti: -25, nota: 'Art. 14 o' },
  { campo: 'penalita.operatore_squalificato', tipo: 'segnalazione', nota: 'Squalifica del singolo operatore: decide la direzione' },
  { campo: 'contestazione.respinta', tipo: 'per_unita', punti: -600,
    tipiContestazione: ['non_dichiarato', 'fuori_finestra', 'civili_colpiti', 'comportamento', 'interferenza_arbitrale', 'fascia', 'esfiltrazione'],
    nota: 'Art. 16 b' },
];

const POSITIVE_COMUNI = [
  { campo: 'esito.difensori_eliminati', tipo: 'per_unita', punti: 40, nota: 'Art. 14.1 b' },
  { campo: 'esito.ribelli_eliminati', tipo: 'per_unita', punti: 30, nota: 'Art. 14.1 c' },
  { campo: 'esito.fasi', tipo: 'da_obiettivo', min: 50, max: 600, nota: 'Art. 14.1 g: valore di ogni fase E deciso per obiettivo' },
];

export const REGOLE_PLR = {
  regole: [
    ...NEGATIVE_COMUNI,
    { campo: 'penalita.bivacco', tipo: 'per_unita', punti: -500, nota: 'Art. 14 j: scoperta di bivacco' },
    { campo: 'penalita.aiuto_cartografico', tipo: 'per_unita', punti: -300, nota: 'Art. 14 k' },
    { campo: 'penalita.non_in_coppia', tipo: 'per_unita', punti: -1000, nota: 'Art. 14 m' },
    { campo: 'penalita.sacco_rifiuti', tipo: 'per_unita', punti: 0, nota: 'Valore da definire: non indicato nell\'art. 14' },
    { campo: 'contro.scontri.PERSA', tipo: 'per_unita', punti: -300, nota: 'Art. 14 h' },
    { campo: 'contro.scontri.VINTA', tipo: 'per_unita', punti: -100, nota: 'Art. 14 i' },
    { campo: 'esfiltrazione.ritardo_minuti', tipo: 'per_unita', punti: -50, nota: 'Art. 14 l' },
    ...POSITIVE_COMUNI,
    { campo: 'esito.punteggio_minimo', tipo: 'se_si', punti: 50, nota: 'Art. 14.1 a' },
    { campo: 'waypoint.foto', tipo: 'per_unita', punti: 50, bonusTutti: 150, nota: 'Art. 14.1 d-e' },
    { campo: 'recon.osservazioni', tipo: 'percentuale', min: 50, max: 500, nota: 'Art. 14.1 f: in % sui report corretti' },
  ],
};

export const REGOLE_PCR = {
  regole: [
    ...NEGATIVE_COMUNI,
    { campo: 'esito.autoeliminazione', tipo: 'per_unita', punti: -500, nota: 'Art. 14 u (PCR)' },
    ...POSITIVE_COMUNI,
    { campo: 'tempo.minuti_risparmiati', tipo: 'per_unita', punti: 10, soloSeCompletato: true,
      nota: 'Art. 12.2 e 14.1 i: 10 punti per minuto risparmiato, solo con obiettivo completato al 100%' },
  ],
};

// ─────────────── parametri delle tipologie ───────────────

export const PARAMETRI_PLR = {
  operatori: { min: 3, max: 6, minimoInGara: 2 },
  finestra: { minMin: 5, maxMin: 30, modalita: 'PRENOTATA', gestione: 'DISLOCATA' },
  obiettiviInSequenza: false,
  esfiltrazione: { orarioMassimo: true },
  controinterdizione: true,
  durataGaraOre: { min: 6, max: 45 },
};

export const PARAMETRI_PCR = {
  operatori: { min: 3, max: 8, minimoInGara: 3 },
  finestra: { minMin: 5, maxMin: 30, modalita: 'CODA_INGRESSO', gestione: 'DISLOCATA' },
  obiettiviInSequenza: true,
  esfiltrazione: { orarioMassimo: false },
  controinterdizione: false,
  bonusMinutiRisparmiati: true,
};

// ─────────────── tipi di obiettivo (art. 4.1) ───────────────

export const TIPI_PLR = [
  { codice: 'A', nome: 'Area esecuzione controllata da difensori', template: 'PLR-OBJ-AD', abbinabileCon: ['E'] },
  { codice: 'B', nome: 'Way point', template: 'PLR-WAYPOINT-B', richiedeArbitro: false, richiedeFinestra: false, compilatoDa: 'SQUADRA', fotoMinime: 1 },
  { codice: 'C', nome: 'Ricognizione', template: 'PLR-RECON-C', richiedeArbitro: false, richiedeFinestra: false, compilatoDa: 'SQUADRA' },
  { codice: 'D', nome: 'Automezzo in movimento controllato da ribelli', template: 'PLR-OBJ-AD', abbinabileCon: ['E'] },
  { codice: 'E', nome: 'Azione da svolgere', template: 'PLR-OBJ-E' },
  { codice: 'F', nome: 'Ispezione o soccorso', template: 'PLR-OBJ-FG', abbinabileCon: ['E'] },
  { codice: 'G', nome: 'Scorta ad automezzi o VIP', template: 'PLR-OBJ-FG', abbinabileCon: ['E'] },
  { codice: 'H', nome: 'Controllato da difensori e ribelli', template: 'PLR-OBJ-H', abbinabileCon: ['E'] },
];

export const TIPI_PCR = [
  { codice: 'A', nome: 'Area esecuzione controllata da difensori', template: 'PCR-OBJ-A', abbinabileCon: ['E'] },
  { codice: 'D', nome: 'Automezzo in movimento controllato da ribelli', template: 'PCR-OBJ-A', abbinabileCon: ['E'] },
  { codice: 'E', nome: 'Azione da svolgere', template: 'PCR-OBJ-E' },
  { codice: 'F', nome: 'Ispezione o soccorso', template: 'PCR-OBJ-FG', abbinabileCon: ['E'] },
  { codice: 'G', nome: 'Scorta ad automezzi o VIP', template: 'PCR-OBJ-FG', abbinabileCon: ['E'] },
  { codice: 'H', nome: 'Controllato da difensori e ribelli', template: 'PCR-OBJ-H', abbinabileCon: ['E'] },
];

// ─────────────── regole di campionato (manuale attuativo art. 4) ───────────────

export const REGOLE_CAMPIONATO = {
  puntiPerPosizione: [25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4],
  puntiDallaPosizioneSuccessiva: 3,
  pariMerito: 'MEDIA_POSIZIONI',
  miglioriRisultati: 3,
  tappeMinime: { giocate: 3, organizzateOAiuto: 1 },
  organizzatrici: { regola: 'MEDIA', anche: ['AIUTO'], penalitaAiutoAssente: -5 },
  squalifica: { contaInMediaCome: 0 },
  spareggi: ['NUMERO_PRIMI_POSTI', 'NUMERO_SECONDI_POSTI', 'NUMERO_TERZI_POSTI', 'MINUTI_ESFILTRAZIONE_RISPARMIATI'],
};
