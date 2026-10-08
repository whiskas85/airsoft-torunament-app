'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { ErroreRegola, eventoModificabile, puoGestire } from '@/lib/permessi';
import { esegui, testo, testoOpz, intero, dataOra, tutti, type StatoForm } from '@/lib/form';
import { controlliEvento, puoPassare } from '@/lib/controlli';
import { costruisciConfigurazione } from '@/lib/congelamento';

type Parametri = { finestra: { modalita: string }; esfiltrazione: { orarioMassimo: boolean } };

function opzioniDaForm(fd: FormData, par: Parametri) {
  const gestione = testo(fd, 'gestioneFinestre') === 'CENTRALIZZATA' ? 'CENTRALIZZATA' : 'DISLOCATA';
  const esf = dataOra(fd, 'esfiltrazioneMassima');
  return {
    puntiVisibiliInGara: fd.get('puntiVisibiliInGara') === 'on',
    finestre: { gestione: par.finestra.modalita === 'PRENOTATA' ? gestione : 'DISLOCATA' },
    periodoContestazioniOre: Math.max(0, intero(fd, 'periodoContestazioniOre') ?? 24),
    esfiltrazioneMassima: par.esfiltrazione.orarioMassimo && esf ? esf.toISOString() : null,
  };
}

/** Codice breve leggibile e univoco, es. PLR-1510-K7Q */
async function nuovoCodice(tipologia: string, inizio: Date) {
  const giorno = `${String(inizio.getDate()).padStart(2, '0')}${String(inizio.getMonth() + 1).padStart(2, '0')}`;
  for (;;) {
    const c = `${tipologia}-${giorno}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    if (!(await prisma.evento.findUnique({ where: { codice: c } }))) return c;
  }
}

export async function creaEvento(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  let codice = '';
  const r = await esegui(async () => {
    const versione = await prisma.versioneTipologia.findUnique({ where: { id: testo(fd, 'versioneTipologiaId') }, include: { tipologia: true } });
    if (!versione || versione.stato !== 'PUBBLICATA') throw new ErroreRegola('Scegli una tipologia di gara pubblicata.');
    const enteId = versione.tipologia.enteId;
    if (!u.ruoli.some((x) => x.ruolo === 'AMMINISTRATORE' && x.enteId === enteId)) throw new ErroreRegola('Solo l’ente crea gli eventi.');

    const nome = testo(fd, 'nome');
    const inizio = dataOra(fd, 'inizio');
    const fine = dataOra(fd, 'fine');
    if (!nome) throw new ErroreRegola('Serve il nome dell’evento.');
    if (!inizio || !fine || fine <= inizio) throw new ErroreRegola('Inizio e fine: la fine deve venire dopo l’inizio.');

    const coordinamenti = tutti(fd, 'coordinamenti');
    const campionati = tutti(fd, 'campionati');
    codice = await nuovoCodice(versione.tipologia.codice, inizio);
    await prisma.evento.create({
      data: {
        codice, nome, enteId, inizio, fine, luogo: testoOpz(fd, 'luogo'), versioneTipologiaId: versione.id,
        opzioni: opzioniDaForm(fd, versione.parametri as Parametri),
        coordinamenti: { create: coordinamenti.map((coordinamentoId) => ({ coordinamentoId })) },
        campionati: { create: campionati.map((campionatoId) => ({ campionatoId, tappa: intero(fd, `tappa_${campionatoId}`) })) },
        // la tabella punteggi parte dalle regole predefinite della tipologia; i valori per obiettivo si aggiungono dopo
        tabella: { create: { regole: { ...(versione.regolePredefinite as object), obiettivi: {} } } },
      },
    });
  });
  if (r.errore) return r;
  redirect(`/eventi/${codice}`);
}

export async function aggiornaEvento(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    const nome = testo(fd, 'nome');
    const inizio = dataOra(fd, 'inizio');
    const fine = dataOra(fd, 'fine');
    if (!nome) throw new ErroreRegola('Serve il nome dell’evento.');
    if (!inizio || !fine || fine <= inizio) throw new ErroreRegola('La fine deve venire dopo l’inizio.');
    await prisma.evento.update({
      where: { id: ev.id },
      data: {
        nome, inizio, fine, luogo: testoOpz(fd, 'luogo'), locandinaUrl: testoOpz(fd, 'locandinaUrl'),
        opzioni: opzioniDaForm(fd, ev.versioneTipologia.parametri as Parametri),
      },
    });
    revalidatePath(`/eventi/${ev.codice}`);
    return { ok: 'Dati dell’evento salvati.' };
  });
}

export async function pubblicaEvento(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    if (ev.stato !== 'BOZZA') throw new ErroreRegola('L’evento è già pubblicato.');
    const { pubblicazione } = await controlliEvento(ev.id);
    if (!puoPassare(pubblicazione)) throw new ErroreRegola('Mancano dei requisiti per la pubblicazione: vedi l’elenco.');
    await prisma.evento.update({ where: { id: ev.id }, data: { stato: 'PUBBLICATO', pubblicatoIl: new Date() } });
    revalidatePath(`/eventi/${ev.codice}`);
    return { ok: 'Evento pubblicato: ora le squadre dei coordinamenti lo vedono e possono iscriversi.' };
  });
}

export async function riportaInBozza(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    if (ev.stato !== 'PUBBLICATO') throw new ErroreRegola('Solo un evento pubblicato torna in bozza.');
    const iscritte = await prisma.squadraEvento.count({ where: { eventoId: ev.id } });
    if (iscritte > 0) throw new ErroreRegola('Ci sono squadre iscritte: non si può tornare in bozza.');
    await prisma.evento.update({ where: { id: ev.id }, data: { stato: 'BOZZA' } });
    revalidatePath(`/eventi/${ev.codice}`);
    return { ok: 'Evento riportato in bozza.' };
  });
}

/**
 * Avvio: si congela tutto ciò che è "di gara" (§6bis). Da qui nessuno, direzione compresa,
 * modifica più regolamento, template, obiettivi o tabella punteggi.
 */
export async function avviaEvento(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    const { avvio } = await controlliEvento(ev.id);
    if (!puoPassare(avvio)) throw new ErroreRegola('Mancano dei requisiti per l’avvio: vedi l’elenco.');
    const { configurazione, hash, hashTabella } = await costruisciConfigurazione(ev.id);
    await prisma.$transaction([
      prisma.evento.update({
        where: { id: ev.id },
        data: { stato: 'IN_CORSO', avviatoIl: new Date(), configurazioneCongelata: configurazione as object, hashConfigurazione: hash, hashTabella },
      }),
      prisma.squadraEvento.updateMany({ where: { eventoId: ev.id, ruolo: 'GAREGGIA', stato: 'ISCRITTA' }, data: { stato: 'IN_GARA' } }),
    ]);
    revalidatePath(`/eventi/${ev.codice}`);
    return { ok: `Evento avviato. Configurazione congelata, codice ${hash.slice(0, 12)}…` };
  });
}

/** Per le prove: riporta un evento avviato a "pubblicato". Solo con DEBUG_LOGIN=1. */
export async function annullaAvvioProva(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    if (process.env.DEBUG_LOGIN !== '1') throw new ErroreRegola('Disponibile solo in ambiente di prova.');
    const ev = await prisma.evento.findUnique({ where: { id: testo(fd, 'eventoId') } });
    if (!ev || !(await puoGestire(u, ev))) throw new ErroreRegola('Non hai i permessi per questo evento.');
    const operazioni = await prisma.operazione.count({ where: { eventoId: ev.id } });
    if (operazioni > 0) throw new ErroreRegola('Ci sono già operazioni di gara registrate.');
    await prisma.$transaction([
      prisma.evento.update({ where: { id: ev.id }, data: { stato: 'PUBBLICATO', avviatoIl: null, configurazioneCongelata: Prisma.DbNull, hashConfigurazione: null, hashTabella: null } }),
      prisma.squadraEvento.updateMany({ where: { eventoId: ev.id, stato: 'IN_GARA' }, data: { stato: 'ISCRITTA' } }),
    ]);
    revalidatePath(`/eventi/${ev.codice}`);
    return { ok: 'Avvio annullato (solo prova).' };
  });
}
