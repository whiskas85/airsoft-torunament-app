'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { ErroreRegola } from '@/lib/permessi';
import { esegui, testo, type StatoForm } from '@/lib/form';
import { creaTipologia, parametriDaForm, salvaParametri, type ParametriTipologia } from '@/lib/tipologie';

/** Le tipologie le gestisce l'amministratore dell'ente (D2). */
async function admin() {
  const u = await richiediUtente();
  const r = u.ruoli.find((x) => x.ruolo === 'AMMINISTRATORE');
  if (!r) throw new ErroreRegola('Solo l’amministratore dell’ente gestisce le tipologie.');
  return r.enteId;
}

/** Sigla breve, maiuscola, senza spazi: finisce nei codici degli eventi (PLR-1610-K7Q). */
function codiceValido(fd: FormData) {
  const c = testo(fd, 'codice').toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9&]{2,8}$/.test(c)) throw new ErroreRegola('La sigla va da 2 a 8 lettere o cifre (es. PLR, PCR, SS, DAS).');
  return c;
}

export async function nuovaTipologia(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  let id = '';
  const r = await esegui(async () => {
    const enteId = await admin();
    const codice = codiceValido(fd);
    const nome = testo(fd, 'nome');
    if (!nome) throw new ErroreRegola('Serve il nome della tipologia.');
    if (await prisma.tipologiaGara.findUnique({ where: { enteId_codice: { enteId, codice } } })) throw new ErroreRegola(`La sigla ${codice} è già usata.`);
    id = (await creaTipologia(enteId, codice, nome, testo(fd, 'daId') || null)).id;
  });
  if (r.errore) return r;
  redirect(`/impostazioni/tipologie/${id}`);
}

export async function aggiornaTipologia(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  return esegui(async () => {
    const enteId = await admin();
    const t = await prisma.tipologiaGara.findFirst({
      where: { id: testo(fd, 'tipologiaId'), enteId },
      include: { versioni: { orderBy: { numero: 'desc' }, take: 1 } },
    });
    if (!t) throw new ErroreRegola('Tipologia non trovata.');
    const codice = codiceValido(fd);
    const nome = testo(fd, 'nome');
    if (!nome) throw new ErroreRegola('Serve il nome della tipologia.');
    if (codice !== t.codice && (await prisma.tipologiaGara.findUnique({ where: { enteId_codice: { enteId, codice } } }))) {
      throw new ErroreRegola(`La sigla ${codice} è già usata.`);
    }
    const parametri = parametriDaForm(fd, t.versioni[0].parametri as ParametriTipologia);
    await prisma.tipologiaGara.update({ where: { id: t.id }, data: { codice, nome } });
    await salvaParametri(t.id, parametri);
    revalidatePath('/impostazioni/tipologie');
  });
}

export async function archiviaTipologia(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  return esegui(async () => {
    const enteId = await admin();
    const t = await prisma.tipologiaGara.findFirst({ where: { id: testo(fd, 'tipologiaId'), enteId } });
    if (!t) throw new ErroreRegola('Tipologia non trovata.');
    await prisma.tipologiaGara.update({ where: { id: t.id }, data: { archiviata: !t.archiviata } });
    revalidatePath('/impostazioni/tipologie');
    return { ok: t.archiviata ? 'Tipologia riattivata.' : 'Tipologia archiviata: non si propone più per nuovi eventi e campionati.' };
  });
}
