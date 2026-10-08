/**
 * Definizione dei campi di un template (colonna VersioneTemplate.campi).
 * È un dato configurato dall'ente: l'app disegna le schede leggendo questa struttura.
 */
export type Campo =
  | { chiave: string; tipo: 'sino'; etichetta: string }
  | { chiave: string; tipo: 'numero' | 'decimale'; etichetta: string; min?: number; max?: number; predefinito?: number }
  | { chiave: string; tipo: 'contatore'; etichetta: string; max: number }
  | { chiave: string; tipo: 'scelta'; etichetta: string; opzioni: string[] }
  | { chiave: string; tipo: 'tempo'; etichetta: string; sorgente: 'cronometro' | 'manuale'; arrotonda?: string; max?: number }
  | { chiave: string; tipo: 'orario'; etichetta: string }
  | { chiave: string; tipo: 'foto'; etichetta: string; min?: number; max?: number }
  | { chiave: string; tipo: 'testo'; etichetta: string }
  | { chiave: string; tipo: 'fasi'; etichetta: string }
  | { chiave: string; tipo: 'obiettivi_senza_arbitro'; etichetta: string }
  | { chiave: string; tipo: 'ripetuto'; etichetta: string; max: number; campi: Campo[]; firmaPerRiga?: boolean };

export type Sezione = { chiave: string; titolo: string; campi: Campo[] };
export type DefinizioneTemplate = { sezioni: Sezione[] };

export type Fase = { codice: string; nome: string };
