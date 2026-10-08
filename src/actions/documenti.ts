'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { ErroreRegola, eventoModificabile } from '@/lib/permessi';
import { esegui, testo, type StatoForm } from '@/lib/form';
import { salvaFile } from '@/lib/storage';
import type { TipoDocumento } from '@prisma/client';

const RUOLI: TipoDocumento[] = ['REGOLAMENTO', 'BOOK', 'MODULO', 'MAPPA', 'ALTRO'];
const MAX_BYTE = 50 * 1024 * 1024;

export async function caricaDocumento(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    const ruolo = (RUOLI.includes(testo(fd, 'ruolo') as TipoDocumento) ? testo(fd, 'ruolo') : 'ALTRO') as TipoDocumento;
    const file = fd.get('file');
    if (!(file instanceof File) || file.size === 0) throw new ErroreRegola('Scegli un file.');
    if (file.size > MAX_BYTE) throw new ErroreRegola('File troppo grande (massimo 50 MB).');
    const titolo = testo(fd, 'titolo') || file.name;
    const estensione = file.name.includes('.') ? file.name.split('.').pop()! : '';
    const { hash, file: percorso } = await salvaFile(Buffer.from(await file.arrayBuffer()), estensione);

    // il regolamento è uno solo: uno nuovo sostituisce il precedente (finché l'evento non è avviato)
    if (ruolo === 'REGOLAMENTO') await prisma.eventoDocumento.deleteMany({ where: { eventoId: ev.id, ruolo: 'REGOLAMENTO' } });
    const doc = await prisma.documento.create({
      data: { enteId: ev.enteId, titolo, tipo: ruolo, file: percorso, mime: file.type || 'application/octet-stream', byte: file.size, hash },
    });
    await prisma.eventoDocumento.create({ data: { eventoId: ev.id, documentoId: doc.id, ruolo } });
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    return { ok: `${titolo} caricato (${(file.size / 1024 / 1024).toFixed(1)} MB).` };
  });
}

export async function rimuoviDocumento(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const ev = await eventoModificabile(u, testo(fd, 'eventoId'));
    await prisma.eventoDocumento.deleteMany({ where: { eventoId: ev.id, documentoId: testo(fd, 'documentoId') } });
    revalidatePath(`/eventi/${ev.codice}`, 'layout');
    return { ok: 'Documento tolto dall’evento.' };
  });
}
