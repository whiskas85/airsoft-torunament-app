import 'server-only';
import { prisma } from './db';
import type { UtenteCorrente } from './auth';

export type RuoloInEvento = 'AMMINISTRATORE' | 'DIREZIONE' | 'ARBITRO' | 'SQUADRA';

/** Gli eventi visibili all'utente, ciascuno con i ruoli che l'utente ha al suo interno. */
export async function mieiEventi(u: UtenteCorrente) {
  const entiAdmin = u.ruoli.filter((r) => r.ruolo === 'AMMINISTRATORE').map((r) => r.enteId);
  const eventi = await prisma.evento.findMany({
    where: {
      OR: [
        { enteId: { in: entiAdmin } },
        { direzione: { some: { utenteId: u.id } } },
        { arbitri: { some: { personaId: u.personaId } } },
        { squadre: { some: { partecipanti: { some: { personaId: u.personaId } } } } },
      ],
    },
    include: {
      versioneTipologia: { include: { tipologia: true } },
      direzione: { where: { utenteId: u.id } },
      arbitri: { where: { personaId: u.personaId } },
      squadre: { where: { partecipanti: { some: { personaId: u.personaId } } }, include: { squadra: true } },
      _count: { select: { obiettivi: true, squadre: true } },
    },
    orderBy: { inizio: 'asc' },
  });
  return eventi.map((e) => {
    const ruoli: RuoloInEvento[] = [];
    if (entiAdmin.includes(e.enteId)) ruoli.push('AMMINISTRATORE');
    if (e.direzione.length) ruoli.push('DIREZIONE');
    if (e.arbitri.length) ruoli.push('ARBITRO');
    if (e.squadre.length) ruoli.push('SQUADRA');
    return { ...e, ruoli, miaSquadra: e.squadre[0]?.squadra ?? null };
  });
}

export const NOME_RUOLO: Record<RuoloInEvento, string> = {
  AMMINISTRATORE: 'Ente',
  DIREZIONE: 'Direzione gara',
  ARBITRO: 'Arbitro',
  SQUADRA: 'Squadra',
};

export const NOME_STATO_EVENTO: Record<string, string> = {
  BOZZA: 'Bozza',
  PUBBLICATO: 'Pubblicato',
  IN_CORSO: 'In corso',
  DEBRIEFING: 'Debriefing',
  TERMINATO: 'Classifica provvisoria',
  UFFICIALE: 'Classifica ufficiale',
  ANNULLATO: 'Annullato',
};
