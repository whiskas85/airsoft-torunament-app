import 'server-only';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import type { UtenteCorrente } from '../auth';
import { puoGestire } from '../permessi';
import { erroreDiForma, type Operazione } from './operazione';
import { firmaValida } from './verifica';

/** Il ruolo dell'utente in un evento, visto dal campo. */
export async function ruoloInCampo(u: UtenteCorrente, eventoId: string) {
  const ev = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!ev) return null;
  const direzione = await puoGestire(u, ev);
  const arbitro = await prisma.arbitroEvento.findFirst({
    where: { eventoId, personaId: u.personaId, stato: 'ACCETTATA' },
    include: { obiettivi: true },
  });
  const squadre = await prisma.squadraEvento.findMany({
    where: {
      eventoId,
      OR: [
        { partecipanti: { some: { personaId: u.personaId } } },
        { squadra: { membri: { some: { personaId: u.personaId, al: null } } } },
      ],
    },
  });
  if (!direzione && !arbitro && squadre.length === 0) return null;
  return {
    evento: ev,
    direzione,
    arbitroEventoId: arbitro?.id ?? null,
    obiettivi: arbitro?.obiettivi.map((o) => o.obiettivoId) ?? [],
    squadre: squadre.map((s) => s.id),
  };
}
export type RuoloInCampo = NonNullable<Awaited<ReturnType<typeof ruoloInCampo>>>;

/**
 * Quali operazioni riceve chi sincronizza:
 *   direzione → tutte; arbitro → quelle dei suoi obiettivi e quelle generali dell'evento;
 *   squadra → quelle della sua squadra. Più, sempre, le proprie.
 */
export function filtroVisibilita(u: UtenteCorrente, r: RuoloInCampo): Prisma.OperazioneWhereInput {
  if (r.direzione) return {};
  const o: Prisma.OperazioneWhereInput[] = [{ autoreUtenteId: u.id }];
  if (r.squadre.length) o.push({ squadraEventoId: { in: r.squadre } });
  if (r.arbitroEventoId) {
    o.push({ obiettivoId: { in: r.obiettivi } });
    o.push({ squadraEventoId: null, obiettivoId: null });
  }
  return { OR: o };
}

/**
 * Il pacchetto che il telefono scarica prima di andare in campo: configurazione congelata
 * (filtrata per ruolo), chiavi pubbliche dei partecipanti per verificare le firme offline, documenti.
 * Non contiene mai la tabella punteggi.
 */
export async function pacchettoEvento(u: UtenteCorrente, r: RuoloInCampo) {
  const ev = r.evento;
  if (!ev.configurazioneCongelata || !ev.hashConfigurazione) return null;
  type Conf = { squadre: { id: string; partecipanti: { personaId: string }[] }[]; arbitri: { personaId: string }[] } & Record<string, unknown>;
  const conf = structuredClone(ev.configurazioneCongelata) as Conf;

  // una squadra non vede i nomi degli operatori delle altre: solo identificativo e fasce
  if (!r.direzione && !r.arbitroEventoId) {
    conf.squadre = conf.squadre.map((s) => (r.squadre.includes(s.id) ? s : { ...s, partecipanti: [] }));
  }

  // chiavi pubbliche dei dispositivi di chi ha un ruolo nell'evento
  const persone = new Set<string>([
    ...conf.arbitri.map((a) => a.personaId),
    ...((ev.configurazioneCongelata as Conf).squadre.flatMap((s) => s.partecipanti.map((p) => p.personaId))),
  ]);
  const direzione = await prisma.membroDirezione.findMany({ where: { eventoId: ev.id }, select: { utenteId: true } });
  const dispositivi = await prisma.dispositivo.findMany({
    where: { revocato: false, OR: [{ utente: { personaId: { in: [...persone] } } }, { utenteId: { in: direzione.map((d) => d.utenteId) } }] },
    include: { utente: { include: { persona: true } } },
  });

  return {
    evento: { id: ev.id, codice: ev.codice, nome: ev.nome, stato: ev.stato },
    hash: ev.hashConfigurazione,
    configurazione: conf,
    io: {
      utenteId: u.id,
      personaId: u.personaId,
      nome: `${u.persona.nome} ${u.persona.cognome}`,
      direzione: r.direzione,
      arbitroEventoId: r.arbitroEventoId,
      obiettivi: r.obiettivi,
      squadre: r.squadre,
    },
    chiavi: dispositivi.map((d) => ({
      dispositivo: d.id, utente: d.utenteId, nome: `${d.utente.persona.nome} ${d.utente.persona.cognome}`, chiavePubblica: d.chiavePubblica,
    })),
    scaricatoIl: new Date().toISOString(),
  };
}

const TOLLERANZA_FUTURO_MS = 2 * 60_000;

/**
 * Accetta (o rifiuta, con un motivo) le operazioni inviate da un telefono.
 * Il telefono può consegnare anche operazioni di altri, ricevute via QR: contano la firma e l'autore, non chi consegna.
 */
export async function accogliOperazioni(u: UtenteCorrente, eventoId: string, operazioni: Operazione[]) {
  const accettate: string[] = [];
  const rifiutate: { id: string; motivo: string }[] = [];
  const ev = await prisma.evento.findUnique({ where: { id: eventoId } });
  if (!ev) return { accettate, rifiutate: operazioni.map((o) => ({ id: o.id, motivo: 'evento sconosciuto' })) };

  for (const op of operazioni) {
    const rifiuta = (motivo: string) => rifiutate.push({ id: String(op?.id ?? '?'), motivo });
    const forma = erroreDiForma(op);
    if (forma) { rifiuta(forma); continue; }
    if (op.evento !== eventoId) { rifiuta('operazione di un altro evento'); continue; }
    if (await prisma.operazione.findUnique({ where: { id: op.id }, select: { id: true } })) { accettate.push(op.id); continue; }
    if (!['IN_CORSO', 'DEBRIEFING'].includes(ev.stato)) { rifiuta('l’evento non è in corso'); continue; }

    const disp = await prisma.dispositivo.findUnique({ where: { id: op.dispositivo } });
    if (!disp || disp.revocato) { rifiuta('dispositivo sconosciuto o revocato'); continue; }
    if (disp.utenteId !== op.autore) { rifiuta('il dispositivo non appartiene all’autore'); continue; }
    if (!(await firmaValida(op, disp.chiavePubblica))) { rifiuta('firma non valida'); continue; }
    if (Date.parse(op.oraUfficiale) > Date.now() + TOLLERANZA_FUTURO_MS) { rifiuta('orario nel futuro: orologio da controllare'); continue; }

    // l'autore deve avere un ruolo nell'evento
    const autore = await prisma.utente.findUnique({ where: { id: op.autore }, include: { persona: true, ruoli: { include: { ente: true } } } });
    if (!autore || !(await ruoloInCampo(autore, eventoId))) { rifiuta('l’autore non ha un ruolo in questo evento'); continue; }

    await prisma.operazione.create({
      data: {
        id: op.id, eventoId, tipo: op.tipo, autoreUtenteId: op.autore, dispositivoId: op.dispositivo,
        oraDispositivo: new Date(op.oraDispositivo), scartoOrologioMs: Math.round(op.scartoMs), oraUfficiale: new Date(op.oraUfficiale),
        gps: op.gps ?? Prisma.JsonNull, squadraEventoId: op.squadra, obiettivoId: op.obiettivo,
        rif: op.rif, dati: op.dati as Prisma.InputJsonValue, firma: op.firma, firmaValida: true,
        consegnataDa: op.autore === u.id ? null : u.id,
      },
    });
    accettate.push(op.id);
  }
  return { accettate, rifiutate };
}

/** Da database a formato di scambio, uguale a quello creato dal telefono. */
export function inFormatoScambio(o: Prisma.OperazioneGetPayload<object>): Operazione & { seq: string; ricevutaIl: string } {
  return {
    v: 1, id: o.id, evento: o.eventoId, tipo: o.tipo, autore: o.autoreUtenteId, dispositivo: o.dispositivoId,
    oraDispositivo: o.oraDispositivo.toISOString(), scartoMs: o.scartoOrologioMs, oraUfficiale: o.oraUfficiale.toISOString(),
    gps: (o.gps as Operazione['gps']) ?? null, squadra: o.squadraEventoId, obiettivo: o.obiettivoId,
    rif: o.rif, dati: o.dati as Record<string, unknown>, firma: o.firma,
    seq: o.seq.toString(), ricevutaIl: o.ricevutaIl.toISOString(),
  };
}
