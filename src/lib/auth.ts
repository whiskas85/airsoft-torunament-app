import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';

const COOKIE = 'ta_sessione';
const DURATA_GIORNI = 30;

function chiave() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error('SESSION_SECRET mancante o troppo corta');
  return new TextEncoder().encode(s);
}

export async function apriSessione(utenteId: string) {
  const token = await new SignJWT({ sub: utenteId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${DURATA_GIORNI}d`)
    .sign(chiave());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.COOKIE_SECURE === '1',
    path: '/',
    maxAge: DURATA_GIORNI * 86400,
  });
}

export async function chiudiSessione() {
  (await cookies()).delete(COOKIE);
}

/** L'utente collegato con persona e ruoli d'ente, oppure null. */
export async function utenteCorrente() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chiave());
    if (!payload.sub) return null;
    return await prisma.utente.findFirst({
      where: { id: payload.sub, attivo: true },
      include: { persona: true, ruoli: { include: { ente: true } } },
    });
  } catch {
    return null;
  }
}

export async function richiediUtente() {
  const u = await utenteCorrente();
  if (!u) redirect('/accedi');
  return u;
}

export type UtenteCorrente = NonNullable<Awaited<ReturnType<typeof utenteCorrente>>>;
