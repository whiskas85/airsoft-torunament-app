/**
 * Regole di punteggio (tabella punteggi). Vivono solo sul server e sui telefoni della direzione.
 * Il motore di calcolo arriva in M5: qui ci sono i tipi e la descrizione leggibile.
 */
export type Regola = {
  campo: string;
  tipo: 'per_unita' | 'se_si' | 'scaglioni_gara' | 'valore_obiettivo' | 'da_obiettivo' | 'percentuale' | 'segnalazione';
  punti?: number;
  scaglioni?: number[];
  squalificaAl?: number;
  min?: number;
  max?: number;
  segno?: number;
  annullaPositivi?: boolean;
  soloSeCompletato?: boolean;
  bonusTutti?: number;
  tipiContestazione?: string[];
  nota?: string;
};

const conSegno = (n: number) => (n > 0 ? `+${n}` : String(n));

export function descriviRegola(r: Regola): string {
  switch (r.tipo) {
    case 'per_unita':
      return `${conSegno(r.punti ?? 0)} per unità${r.soloSeCompletato ? ', solo se l’obiettivo è completato' : ''}${r.bonusTutti ? `, +${r.bonusTutti} se tutti` : ''}`;
    case 'se_si':
      return `${conSegno(r.punti ?? 0)} se sì`;
    case 'scaglioni_gara':
      return `${(r.scaglioni ?? []).join(', ')} · squalifica al ${r.squalificaAl}° (contati su tutta la gara)`;
    case 'valore_obiettivo':
      return '− valore positivo dell’obiettivo, annulla i punti positivi';
    case 'da_obiettivo':
      return `valore deciso per ogni obiettivo (${r.min}–${r.max})`;
    case 'percentuale':
      return `in percentuale sulle risposte corrette (${r.min}–${r.max})`;
    case 'segnalazione':
      return 'segnalazione alla direzione';
  }
}
