import { prisma } from '@/lib/db';
import { utenteCorrente } from '@/lib/auth';
import { accogliOperazioni, filtroVisibilita, inFormatoScambio, ruoloInCampo } from '@/lib/campo/server';
import type { Operazione } from '@/lib/campo/operazione';

export const dynamic = 'force-dynamic';

const MAX_PER_GIRO = 500;

/**
 * Sincronizzazione: il telefono manda le operazioni che il server non ha ancora,
 * e riceve quelle nuove che gli competono a partire dal suo segnalibro (`dopo`).
 * Ripetere lo stesso invio non fa danni: le operazioni già presenti vengono confermate e basta.
 */
export async function POST(req: Request) {
  try {
    return await sincronizza(req);
  } catch (e) {
    // il telefono deve sempre ricevere una risposta leggibile: le sue operazioni restano in coda
    console.error('sync', e);
    return Response.json({ errore: 'errore del server durante la sincronizzazione' }, { status: 500 });
  }
}

async function sincronizza(req: Request) {
  const u = await utenteCorrente();
  if (!u) return Response.json({ errore: 'accesso richiesto' }, { status: 401 });
  const b = (await req.json().catch(() => null)) as { evento?: string; dispositivo?: string; operazioni?: Operazione[]; dopo?: string } | null;
  if (!b?.evento) return Response.json({ errore: 'evento mancante' }, { status: 400 });

  const r = await ruoloInCampo(u, b.evento);
  if (!r) return Response.json({ errore: 'nessun ruolo in questo evento' }, { status: 403 });

  const inviate = (b.operazioni ?? []).slice(0, MAX_PER_GIRO);
  const esito = await accogliOperazioni(u, b.evento, inviate);

  if (b.dispositivo) {
    await prisma.dispositivo.updateMany({ where: { id: b.dispositivo, utenteId: u.id }, data: { ultimoSync: new Date() } });
  }

  let dopo = 0n;
  try { dopo = BigInt(b.dopo ?? '0'); } catch { /* segnalibro non valido: si riparte da zero */ }
  // Solo le operazioni arrivate da almeno 1,5 s: due invii contemporanei possono registrare un numero
  // più basso un attimo dopo uno più alto, e il segnalibro lo salterebbe. Così arriva al giro successivo.
  const nuove = await prisma.operazione.findMany({
    where: { eventoId: b.evento, seq: { gt: dopo }, ricevutaIl: { lte: new Date(Date.now() - 1500) }, ...filtroVisibilita(u, r) },
    orderBy: { seq: 'asc' },
    take: MAX_PER_GIRO,
  });
  const ultimo = nuove.length ? nuove[nuove.length - 1].seq : dopo;

  return Response.json(
    {
      ...esito,
      nuove: nuove.map(inFormatoScambio),
      segnalibro: ultimo.toString(),
      altre: nuove.length === MAX_PER_GIRO,
      ora: Date.now(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
