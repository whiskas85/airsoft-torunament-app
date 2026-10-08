export const RUOLI_ARBITRO = ['CAPO_ARBITRO', 'OBIETTIVO', 'CONTRO', 'ESFILTRAZIONE', 'COMMISSIONE'] as const;

export const NOME_RUOLO_ARBITRO: Record<(typeof RUOLI_ARBITRO)[number], string> = {
  CAPO_ARBITRO: 'Capo arbitro',
  OBIETTIVO: 'Arbitro di obiettivo',
  CONTRO: 'Controinterdizione',
  ESFILTRAZIONE: 'Esfiltrazione',
  COMMISSIONE: 'Commissione di gara',
};
