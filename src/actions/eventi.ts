'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { controllaCoordinamenti, ErroreRegola, eventoModificabile, organizzatore, puoGestire } from '@/lib/permessi';
import { esegui, testo, testoOpz, intero, decimale, dataOra, tutti, type StatoForm } from '@/lib/form';
import { controlliEvento, puoPassare } from '@/lib/controlli';
import { costruisciConfigurazione } from '@/lib/congelamento';
import { salvaFile } from '@/lib/storage';
import { CAMPO_RITARDO, type RegolaPunti } from '@/lib/punteggi';

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

/** Campo di gara e parcheggi dalla mappa (C1-16, C1-17). */
function datiLuogo(fd: FormData) {
  let parcheggi: { nome: string; descrizione: string; lat: number; lon: number }[] = [];
  try {
    const grezzi = JSON.parse(testo(fd, 'parcheggi') || '[]') as Record<string, unknown>[];
    parcheggi = grezzi
      .filter((p) => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lon)))
      .map((p, i) => ({ nome: String(p.nome ?? '').trim() || `Parcheggio ${i + 1}`, descrizione: String(p.descrizione ?? '').trim(), lat: Number(p.lat), lon: Number(p.lon) }));
  } catch {
    throw new ErroreRegola('Parcheggi non leggibili: riprova a posizionarli sulla mappa.');
  }
  const prefisso = testo(fd, 'prefissoSquadre').toUpperCase().replace(/\s+/g, '');
  return { lat: decimale(fd, 'lat'), lon: decimale(fd, 'lon'), parcheggi, prefissoSquadre: prefisso || null };
}

/** Locandina caricata come immagine (C1-21): diventa un documento dell'evento, servito dalla sua rotta. */
async function salvaLocandina(fd: FormData, ev: { id: string; enteId: string }) {
  const file = fd.get('locandina');
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith('image/')) throw new ErroreRegola('La locandina deve essere un’immagine (JPG, PNG…).');
  if (file.size > 15 * 1024 * 1024) throw new ErroreRegola('Locandina troppo grande (massimo 15 MB).');
  const estensione = file.name.includes('.') ? file.name.split('.').pop()! : 'jpg';
  const { hash, file: percorso } = await salvaFile(Buffer.from(await file.arrayBuffer()), estensione);
  const doc = await prisma.documento.create({
    data: { enteId: ev.enteId, titolo: 'Locandina', tipo: 'ALTRO', file: percorso, mime: file.type, byte: file.size, hash },
  });
  await prisma.eventoDocumento.create({ data: { eventoId: ev.id, documentoId: doc.id, ruolo: 'ALTRO' } });
  return `/api/documenti/${doc.id}`;
}

/** `vuotoTiene`: alla creazione un campo vuoto lascia il valore della tipologia (es. FIGT −50). */
async function salvaPenalitaRitardo(eventoId: string, fd: FormData, vuotoTiene = false) {
  if (fd.get('penalitaRitardo') === null) return;
  const valore = intero(fd, 'penalitaRitardo');
  if (valore == null && vuotoTiene) return;
  if (valore != null && valore < 0) throw new ErroreRegola('Il malus per minuto si scrive positivo: −10 punti al minuto si scrive 10.');
  const t = await prisma.tabellaPunteggi.findUnique({ where: { eventoId } });
  if (!t) return;
  const tab = t.regole as { regole?: RegolaPunti[] } & Record<string, unknown>;
  const altre = (tab.regole ?? []).filter((x) => x.campo !== CAMPO_RITARDO);
  const prima = (tab.regole ?? []).find((x) => x.campo === CAMPO_RITARDO);
  if ((prima ? Math.abs(prima.punti) : null) === valore) return;
  const regole = valore ? [...altre, { campo: CAMPO_RITARDO, tipo: 'per_unita', punti: -valore, nota: prima?.nota ?? 'Ritardo all’esfiltrazione' }] : altre;
  await prisma.tabellaPunteggi.update({ where: { eventoId }, data: { regole: { ...tab, regole }, versione: { increment: 1 } } });
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
    const o = organizzatore(u);
    if (!o) throw new ErroreRegola('Solo l’ente e i responsabili dei coordinamenti creano gli eventi.');
    const versione = await prisma.versioneTipologia.findUnique({ where: { id: testo(fd, 'versioneTipologiaId') }, include: { tipologia: true } });
    if (!versione || versione.stato !== 'PUBBLICATA' || versione.tipologia.enteId !== o.enteId) throw new ErroreRegola('Scegli una tipologia di gara.');
    const enteId = o.enteId;

    const nome = testo(fd, 'nome');
    const inizio = dataOra(fd, 'inizio');
    const fine = dataOra(fd, 'fine');
    if (!nome) throw new ErroreRegola('Serve il nome dell’evento.');
    if (!inizio || !fine || fine <= inizio) throw new ErroreRegola('Inizio e fine: la fine deve venire dopo l’inizio.');

    const coordinamenti = tutti(fd, 'coordinamenti');
    controllaCoordinamenti(o, coordinamenti);

    // tappa di campionato o gara open (C1-13); il campionato deve essere della stessa tipologia (C1-11)
    let campionatoId: string | null = null;
    if (testo(fd, 'tipoGara') === 'CAMPIONATO') {
      const c = await prisma.campionato.findFirst({ where: { id: testo(fd, 'campionatoId'), enteId } });
      if (!c) throw new ErroreRegola('Scegli il campionato, oppure «Gara open».');
      if (c.tipologiaId !== versione.tipologiaId) throw new ErroreRegola('Il campionato è di un’altra tipologia di gara.');
      campionatoId = c.id;
    }
    codice = await nuovoCodice(versione.tipologia.codice, inizio);
    const creato = await prisma.evento.create({
      data: {
        codice, nome, enteId, inizio, fine, luogo: testoOpz(fd, 'luogo'), versioneTipologiaId: versione.id, ...datiLuogo(fd),
        opzioni: opzioniDaForm(fd, versione.parametri as Parametri),
        coordinamenti: { create: coordinamenti.map((coordinamentoId) => ({ coordinamentoId })) },
        // il numero di tappa non si salva: è l'ordine delle date nel campionato (C1-20)
        campionati: { create: campionatoId ? [{ campionatoId }] : [] },
        // la tabella punteggi parte dalle regole predefinite della tipologia; i valori per obiettivo si aggiungono dopo
        tabella: { create: { regole: { ...(versione.regolePredefinite as object), obiettivi: {} } } },
      },
    });
    await salvaPenalitaRitardo(creato.id, fd, true);
    const locandina = await salvaLocandina(fd, creato);
    if (locandina) await prisma.evento.update({ where: { id: creato.id }, data: { locandinaUrl: locandina } });
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
        nome, inizio, fine, luogo: testoOpz(fd, 'luogo'), ...datiLuogo(fd),
        opzioni: opzioniDaForm(fd, ev.versioneTipologia.parametri as Parametri),
      },
    });
    await salvaPenalitaRitardo(ev.id, fd);
    const locandina = await salvaLocandina(fd, ev);
    if (locandina) await prisma.evento.update({ where: { id: ev.id }, data: { locandinaUrl: locandina } });
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
