'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { richiediUtente, type UtenteCorrente } from '@/lib/auth';
import { ErroreRegola, STATI_MODIFICABILI, puoGestire } from '@/lib/permessi';
import { esegui, testo, intero, type StatoForm } from '@/lib/form';
import type { RuoloPartecipante, RuoloSquadraEvento } from '@prisma/client';

type Parametri = { operatori: { min: number; max: number } };

/** Chi può toccare l'iscrizione di una squadra: i suoi membri (solo a evento pubblicato) o ente e direzione. */
async function permessoSquadra(u: UtenteCorrente, eventoId: string, squadraId: string) {
  const ev = await prisma.evento.findUnique({ where: { id: eventoId }, include: { coordinamenti: true, versioneTipologia: true } });
  if (!ev) throw new ErroreRegola('Evento non trovato.');
  if (!STATI_MODIFICABILI.includes(ev.stato)) throw new ErroreRegola('L’evento è avviato: iscrizioni e presenze sono congelate.');
  const gestore = await puoGestire(u, ev);
  if (gestore) return { ev, gestore };
  const membro = await prisma.membroSquadra.findFirst({ where: { squadraId, personaId: u.personaId, al: null } });
  if (!membro) throw new ErroreRegola('Non sei membro di questa squadra.');
  if (ev.stato !== 'PUBBLICATO') throw new ErroreRegola('Le iscrizioni aprono quando l’evento è pubblicato.');
  return { ev, gestore };
}

export async function iscriviSquadra(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const squadraId = testo(fd, 'squadraId');
    const { ev, gestore } = await permessoSquadra(u, testo(fd, 'eventoId'), squadraId);
    const squadra = await prisma.squadra.findUnique({ where: { id: squadraId } });
    if (!squadra || squadra.enteId !== ev.enteId) throw new ErroreRegola('Squadra non valida per questo ente.');
    // una squadra vede (e si iscrive a) gli eventi del suo coordinamento; ente e direzione possono iscrivere chiunque dell'ente
    if (!gestore && ev.coordinamenti.length && !ev.coordinamenti.some((c) => c.coordinamentoId === squadra.coordinamentoId)) {
      throw new ErroreRegola('L’evento non è aperto al coordinamento della tua squadra.');
    }
    if (await prisma.squadraEvento.findUnique({ where: { eventoId_squadraId: { eventoId: ev.id, squadraId } } })) {
      throw new ErroreRegola('Squadra già iscritta.');
    }
    const identificativo = (testo(fd, 'identificativo') || squadra.sigla || squadra.nome.slice(0, 3)).toUpperCase();
    if (await prisma.squadraEvento.findUnique({ where: { eventoId_identificativo: { eventoId: ev.id, identificativo } } })) {
      throw new ErroreRegola(`L’identificativo ${identificativo} è già usato da un’altra squadra: scegline un altro.`);
    }
    // in campionato se la squadra è iscritta ad almeno uno dei campionati dell'evento, altrimenti "open"
    const campionati = await prisma.eventoCampionato.findMany({ where: { eventoId: ev.id } });
    const inCampionato = campionati.length > 0 && (await prisma.iscrizioneCampionato.count({
      where: { squadraId, campionatoId: { in: campionati.map((c) => c.campionatoId) } },
    })) > 0;
    await prisma.squadraEvento.create({ data: { eventoId: ev.id, squadraId, identificativo, inCampionato } });
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    revalidatePath('/');
    return { ok: `${squadra.nome} iscritta come ${identificativo}${inCampionato ? '' : ' (open)'}. Ora indica le presenze.` };
  });
}

export async function ritiraIscrizione(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const se = await prisma.squadraEvento.findUnique({ where: { id: testo(fd, 'squadraEventoId') } });
    if (!se) throw new ErroreRegola('Iscrizione non trovata.');
    const { ev } = await permessoSquadra(u, se.eventoId, se.squadraId);
    await prisma.$transaction([
      prisma.partecipanteEvento.deleteMany({ where: { squadraEventoId: se.id } }),
      prisma.squadraEvento.delete({ where: { id: se.id } }),
    ]);
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    revalidatePath('/');
    return { ok: 'Iscrizione ritirata.' };
  });
}

/**
 * Presenze: per ogni membro della squadra se partecipa, con quale numero di fascia e ruolo.
 * I campi arrivano come presente_<personaId>, fascia_<personaId>, ruolo_<personaId>.
 */
export async function salvaPresenze(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const se = await prisma.squadraEvento.findUnique({
      where: { id: testo(fd, 'squadraEventoId') },
      include: { squadra: { include: { membri: { where: { al: null } } } }, partecipanti: true },
    });
    if (!se) throw new ErroreRegola('Iscrizione non trovata.');
    const { ev } = await permessoSquadra(u, se.eventoId, se.squadraId);
    const par = ev.versioneTipologia.parametri as Parametri;

    // membri della squadra + eventuali operatori in prestito già aggiunti
    const persone = new Set([...se.squadra.membri.map((m) => m.personaId), ...se.partecipanti.map((p) => p.personaId)]);
    const scelte = [...persone]
      .filter((id) => fd.get(`presente_${id}`) === 'on')
      .map((id) => ({
        personaId: id,
        numeroFascia: intero(fd, `fascia_${id}`),
        ruolo: (['CAPO_PATTUGLIA', 'VICE'].includes(testo(fd, `ruolo_${id}`)) ? testo(fd, `ruolo_${id}`) : 'OPERATORE') as RuoloPartecipante,
      }));

    if (se.ruolo === 'GAREGGIA' && scelte.length > 0) {
      if (scelte.length > par.operatori.max) throw new ErroreRegola(`Al massimo ${par.operatori.max} operatori per questa tipologia di gara.`);
      if (scelte.filter((s) => s.ruolo === 'CAPO_PATTUGLIA').length !== 1) throw new ErroreRegola('Serve esattamente un capo pattuglia.');
      const fasce = scelte.map((s) => s.numeroFascia).filter((n): n is number => n != null);
      if (fasce.some((n) => n < 0 || n > 9)) throw new ErroreRegola('I numeri di fascia vanno da 0 a 9.');
      if (new Set(fasce).size !== fasce.length) throw new ErroreRegola('Due operatori con lo stesso numero di fascia.');
    }

    const prestiti = Object.fromEntries(se.partecipanti.map((p) => [p.personaId, p.prestitoDaId]));
    await prisma.$transaction([
      prisma.partecipanteEvento.deleteMany({ where: { squadraEventoId: se.id } }),
      ...scelte.map((s) => prisma.partecipanteEvento.create({ data: { ...s, squadraEventoId: se.id, prestitoDaId: prestiti[s.personaId] ?? null } })),
    ]);
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    const avviso = se.ruolo === 'GAREGGIA' && scelte.length < par.operatori.min ? ` Attenzione: ne servono almeno ${par.operatori.min} per partire.` : '';
    return { ok: `Presenze salvate: ${scelte.length} operatori.${avviso}` };
  });
}

/** Prestito semplice (R10): si aggiunge un operatore di un'altra squadra cercandolo per numero di tessera. */
export async function aggiungiPrestito(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const se = await prisma.squadraEvento.findUnique({ where: { id: testo(fd, 'squadraEventoId') }, include: { evento: true } });
    if (!se) throw new ErroreRegola('Iscrizione non trovata.');
    const { ev } = await permessoSquadra(u, se.eventoId, se.squadraId);
    const numero = testo(fd, 'tessera');
    const tessera = await prisma.tessera.findUnique({ where: { enteId_numero: { enteId: ev.enteId, numero } }, include: { persona: true } });
    if (!tessera) throw new ErroreRegola(`Nessun tesserato con tessera ${numero}.`);
    const giaIscritto = await prisma.partecipanteEvento.findFirst({ where: { personaId: tessera.personaId, squadraEvento: { eventoId: ev.id } } });
    if (giaIscritto) throw new ErroreRegola(`${tessera.persona.nome} ${tessera.persona.cognome} partecipa già a questo evento.`);
    const provenienza = await prisma.membroSquadra.findFirst({ where: { personaId: tessera.personaId, al: null }, include: { squadra: true } });
    if (provenienza?.squadraId === se.squadraId) throw new ErroreRegola('È già un membro della squadra: segnalo tra le presenze.');
    await prisma.partecipanteEvento.create({
      data: { squadraEventoId: se.id, personaId: tessera.personaId, prestitoDaId: provenienza?.squadraId ?? null },
    });
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    return { ok: `${tessera.persona.nome} ${tessera.persona.cognome} aggiunto${provenienza ? ` in prestito da ${provenienza.squadra.nome}` : ''}.` };
  });
}

/** Impostazioni che decide l'organizzazione: identificativo, ruolo, campionato/open, pagamento. */
export async function impostaSquadraEvento(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const se = await prisma.squadraEvento.findUnique({ where: { id: testo(fd, 'squadraEventoId') }, include: { evento: true } });
    if (!se) throw new ErroreRegola('Iscrizione non trovata.');
    if (!(await puoGestire(u, se.evento))) throw new ErroreRegola('Lo decidono ente e direzione.');
    const identificativo = testo(fd, 'identificativo').toUpperCase() || se.identificativo;
    const ruolo = (['GAREGGIA', 'ORGANIZZATRICE', 'AIUTO'].includes(testo(fd, 'ruolo')) ? testo(fd, 'ruolo') : se.ruolo) as RuoloSquadraEvento;
    const congelato = !STATI_MODIFICABILI.includes(se.evento.stato);
    if (congelato && (identificativo !== se.identificativo || ruolo !== se.ruolo)) {
      throw new ErroreRegola('A evento avviato si può cambiare solo lo stato del pagamento.');
    }
    if (identificativo !== se.identificativo && (await prisma.squadraEvento.findUnique({ where: { eventoId_identificativo: { eventoId: se.eventoId, identificativo } } }))) {
      throw new ErroreRegola(`L’identificativo ${identificativo} è già usato.`);
    }
    await prisma.squadraEvento.update({
      where: { id: se.id },
      data: congelato
        ? { pagato: fd.get('pagato') === 'on' }
        : { identificativo, ruolo, inCampionato: fd.get('inCampionato') === 'on', pagato: fd.get('pagato') === 'on' },
    });
    revalidatePath(`/eventi/${se.evento.codice}`, 'layout');
    return { ok: 'Salvato.' };
  });
}
