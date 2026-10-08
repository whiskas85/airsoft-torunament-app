import { utenteCorrente } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Chi è collegato: il telefono lo salva per riconoscere l'utente anche offline. */
export async function GET() {
  const u = await utenteCorrente();
  if (!u) return Response.json({ errore: 'accesso richiesto' }, { status: 401 });
  return Response.json({ utenteId: u.id, personaId: u.personaId, nome: `${u.persona.nome} ${u.persona.cognome}`, email: u.email, ora: Date.now() });
}
