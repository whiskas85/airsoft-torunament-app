/**
 * Accesso rapido con gli account di prova creati dal seed.
 * Funziona solo con DEBUG_LOGIN=1: in produzione i pulsanti spariscono e l'azione rifiuta.
 */
export const debugLoginAttivo = () => process.env.DEBUG_LOGIN === '1';

export type AccountProva = { email: string; etichetta: string; dettaglio: string; gruppo: 'Organizzazione' | 'Arbitri' | 'Squadre' };

export const ACCOUNT_PROVA: AccountProva[] = [
  { email: 'admin@demo.torneo', etichetta: 'Ente', dettaglio: 'Amministratore FIGT', gruppo: 'Organizzazione' },
  { email: 'responsabile@demo.torneo', etichetta: 'Coordinamento', dettaglio: 'Responsabile Piemonte', gruppo: 'Organizzazione' },
  { email: 'direzione@demo.torneo', etichetta: 'Direzione gara', dettaglio: 'Eventi demo', gruppo: 'Organizzazione' },
  { email: 'arbitro1@demo.torneo', etichetta: 'Arbitro 1', dettaglio: 'Capo arbitro · nazionale', gruppo: 'Arbitri' },
  { email: 'arbitro2@demo.torneo', etichetta: 'Arbitro 2', dettaglio: 'Obiettivo · regionale', gruppo: 'Arbitri' },
  { email: 'arbitro3@demo.torneo', etichetta: 'Arbitro 3', dettaglio: 'Obiettivo · regionale', gruppo: 'Arbitri' },
  { email: 'arbitro4@demo.torneo', etichetta: 'Arbitro 4', dettaglio: 'Obiettivo · ausiliare', gruppo: 'Arbitri' },
  { email: 'zdt@demo.torneo', etichetta: 'Zero Dark Team', dettaglio: 'Capo pattuglia', gruppo: 'Squadre' },
  { email: 'alfa@demo.torneo', etichetta: 'Squadra Alfa', dettaglio: 'Capo pattuglia', gruppo: 'Squadre' },
  { email: 'bravo@demo.torneo', etichetta: 'Squadra Bravo', dettaglio: 'Capo pattuglia', gruppo: 'Squadre' },
  { email: 'charlie@demo.torneo', etichetta: 'Squadra Charlie', dettaglio: 'Capo pattuglia', gruppo: 'Squadre' },
  { email: 'delta@demo.torneo', etichetta: 'Squadra Delta', dettaglio: 'Organizzatrice', gruppo: 'Squadre' },
];
