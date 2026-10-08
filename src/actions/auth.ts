'use server';

import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { apriSessione, chiudiSessione } from '@/lib/auth';
import { ACCOUNT_PROVA, debugLoginAttivo } from '@/lib/prova';

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

/** Accesso con un account di prova, senza password. Solo con DEBUG_LOGIN=1. */
export async function accediProva(fd: FormData) {
  if (!debugLoginAttivo()) throw new Error('Accesso rapido disattivato');
  const email = String(fd.get('email') ?? '');
  // solo gli account di prova previsti, mai un indirizzo qualsiasi
  if (!ACCOUNT_PROVA.some((a) => a.email === email)) throw new Error('Account di prova sconosciuto');
  const u = await prisma.utente.findUnique({ where: { email } });
  if (!u || !u.attivo) throw new Error('Account di prova non presente: eseguire il seed');
  await prisma.utente.update({ where: { id: u.id }, data: { ultimoAccesso: new Date() } });
  await apriSessione(u.id);
  redirect('/');
}

export async function esci() {
  await chiudiSessione();
  redirect('/accedi');
}
