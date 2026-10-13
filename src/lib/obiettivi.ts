import 'server-only';
import { prisma } from './db';
import { perInputData } from './contesto';
import type { Fase } from './template';

type PuntiObiettivo = { valorePositivo?: number; fasi?: Record<string, number> };
type Parcheggio = { nome: string; lat: number; lon: number };

/** Tutto ciò che serve al modulo dell'obiettivo oltre all'obiettivo stesso: tipi, altri obiettivi, mappa, persone. */
export async function contestoModuloObiettivo(ev: { id: string; versioneTipologiaId: string; lat: number | null; lon: number | null; parcheggi: unknown }, escludi?: string) {
  const [tipi, altri, utenti] = await Promise.all([
    prisma.tipoObiettivo.findMany({ where: { versioneId: ev.versioneTipologiaId }, orderBy: { codice: 'asc' } }),
    prisma.obiettivo.findMany({ where: { eventoId: ev.id, ...(escludi ? { id: { not: escludi } } : {}) }, orderBy: [{ ordine: 'asc' }, { codice: 'asc' }], select: { id: true, codice: true, nome: true, lat: true, lon: true } }),
    prisma.utente.findMany({ where: { attivo: true }, include: { persona: true }, orderBy: [{ persona: { cognome: 'asc' } }, { persona: { nome: 'asc' } }] }),
  ]);
  return {
    tipi: tipi.map((t) => ({ codice: t.codice, nome: t.nome, richiedeArbitro: t.richiedeArbitro, richiedeFinestra: t.richiedeFinestra, abbinabileCon: t.abbinabileCon })),
    altri,
    contesto: { campo: ev.lat != null && ev.lon != null ? { lat: ev.lat, lon: ev.lon } : null, parcheggi: (ev.parcheggi as Parcheggio[]) ?? [] },
    utenti: utenti.map((u) => ({ id: u.id, nome: `${u.persona.cognome} ${u.persona.nome}` })),
  };
}

/** L'obiettivo nel formato del modulo, con i suoi punti presi dalla tabella punteggi. */
export async function valoriModuloObiettivo(o: {
  codice: string; nome: string; tipi: string[]; durataMin: number; areaDa: Date | null; areaA: Date | null; ultimaFinestra: Date | null;
  ordine: number | null; lat: number | null; lon: number | null; geometria: unknown; fasi: unknown; dipendeDa: string[]; capoUtenteId: string | null; eventoId: string;
}) {
  const tabella = await prisma.tabellaPunteggi.findUnique({ where: { eventoId: o.eventoId } });
  const p: PuntiObiettivo = ((tabella?.regole as { obiettivi?: Record<string, PuntiObiettivo> }) ?? {}).obiettivi?.[o.codice] ?? {};
  return {
    codice: o.codice, nome: o.nome, tipi: o.tipi, durataMin: o.durataMin,
    areaDa: perInputData(o.areaDa), areaA: perInputData(o.areaA), ultimaFinestra: perInputData(o.ultimaFinestra),
    ordine: o.ordine, lat: o.lat, lon: o.lon, geometria: o.geometria as object,
    fasi: (o.fasi as Fase[]).map((f) => ({ nome: f.nome, punti: p.fasi?.[f.codice] ?? null })),
    valorePositivo: p.valorePositivo ?? null, dipendeDa: o.dipendeDa, capoUtenteId: o.capoUtenteId,
  };
}
