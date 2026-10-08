import { prisma } from '@/lib/db';
import { utenteCorrente } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Registrazione del telefono: arriva solo la chiave PUBBLICA; la privata resta nel telefono.
 * Va fatta online, prima di andare in campo (§11 dei requisiti).
 */
export async function POST(req: Request) {
  const u = await utenteCorrente();
  if (!u) return Response.json({ errore: 'accesso richiesto' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { id?: string; chiavePubblica?: string; nome?: string; versioneApp?: string } | null;
  if (!b?.id || !/^[0-9a-f-]{36}$/i.test(b.id) || !b.chiavePubblica) return Response.json({ errore: 'dati mancanti' }, { status: 400 });

  let jwk: JsonWebKey;
  try {
    jwk = JSON.parse(b.chiavePubblica);
    // deve essere una chiave pubblica P-256 valida, e senza parte privata
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || 'd' in jwk) throw new Error();
    await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  } catch {
    return Response.json({ errore: 'chiave pubblica non valida' }, { status: 400 });
  }

  const esistente = await prisma.dispositivo.findUnique({ where: { id: b.id } });
  if (esistente && esistente.utenteId !== u.id) return Response.json({ errore: 'dispositivo di un altro utente' }, { status: 409 });
  if (esistente && esistente.chiavePubblica !== b.chiavePubblica) return Response.json({ errore: 'la chiave di un dispositivo non si cambia' }, { status: 409 });

  const d = await prisma.dispositivo.upsert({
    where: { id: b.id },
    create: { id: b.id, utenteId: u.id, chiavePubblica: b.chiavePubblica, nome: b.nome?.slice(0, 80) ?? null, versioneApp: b.versioneApp ?? null },
    update: { nome: b.nome?.slice(0, 80) ?? undefined, versioneApp: b.versioneApp ?? undefined },
  });
  return Response.json({ ok: true, dispositivo: d.id, registratoIl: d.registratoIl });
}
