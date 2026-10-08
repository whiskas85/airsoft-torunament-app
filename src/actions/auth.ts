'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { apriSessione, chiudiSessione } from '@/lib/auth';

export type StatoAccesso = { errore?: string };

export async function accedi(_prev: StatoAccesso, fd: FormData): Promise<StatoAccesso> {
  const email = String(fd.get('email') ?? '').trim().toLowerCase();
  const password = String(fd.get('password') ?? '');
  if (!email || !password) return { errore: 'Inserisci email e password.' };

  const u = await prisma.utente.findUnique({ where: { email } });
  // stesso messaggio per email sconosciuta e password sbagliata: non si rivela chi è registrato
  if (!u || !u.attivo || !(await bcrypt.compare(password, u.passwordHash))) {
    return { errore: 'Email o password non corrette.' };
  }
  await prisma.utente.update({ where: { id: u.id }, data: { ultimoAccesso: new Date() } });
  await apriSessione(u.id);
  redirect('/');
}

export async function esci() {
  await chiudiSessione();
  redirect('/accedi');
}
