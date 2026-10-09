'use server';

import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { ErroreRegola } from '@/lib/permessi';
import { esegui, testo, testoOpz, type StatoForm } from '@/lib/form';

/** Dati personali e, se compilata, la nuova password (C1-07). */
export async function aggiornaProfilo(_p: StatoForm, fd: FormData): Promise<StatoForm> {
  const u = await richiediUtente();
  return esegui(async () => {
    const nome = testo(fd, 'nome');
    const cognome = testo(fd, 'cognome');
    const email = testo(fd, 'email').toLowerCase();
    if (!nome || !cognome) throw new ErroreRegola('Nome e cognome sono obbligatori.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new ErroreRegola('L’email non sembra valida.');
    if (email !== u.email && (await prisma.utente.findUnique({ where: { email } }))) {
      throw new ErroreRegola('Questa email è già usata da un altro account.');
    }

    const nuova = String(fd.get('nuovaPassword') ?? '');
    let passwordHash: string | undefined;
    if (nuova) {
      if (nuova.length < 8) throw new ErroreRegola('La nuova password deve avere almeno 8 caratteri.');
      if (nuova !== String(fd.get('ripetiPassword') ?? '')) throw new ErroreRegola('Le due password nuove non coincidono.');
      const attuale = String(fd.get('passwordAttuale') ?? '');
      if (!(await bcrypt.compare(attuale, u.passwordHash))) throw new ErroreRegola('La password attuale non è corretta.');
      passwordHash = await bcrypt.hash(nuova, 10);
    }

    await prisma.$transaction([
      prisma.persona.update({ where: { id: u.personaId }, data: { nome, cognome, telefono: testoOpz(fd, 'telefono') } }),
      prisma.utente.update({ where: { id: u.id }, data: { email, ...(passwordHash ? { passwordHash } : {}) } }),
    ]);
    revalidatePath('/', 'layout');
    return { ok: passwordHash ? 'Profilo e password salvati.' : 'Profilo salvato.' };
  });
}
