import { utenteCorrente } from '@/lib/auth';
import { pacchettoEvento, ruoloInCampo } from '@/lib/campo/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await utenteCorrente();
  if (!u) return Response.json({ errore: 'accesso richiesto' }, { status: 401 });
  const r = await ruoloInCampo(u, id);
  if (!r) return Response.json({ errore: 'nessun ruolo in questo evento' }, { status: 403 });
  const p = await pacchettoEvento(u, r);
  if (!p) return Response.json({ errore: 'l’evento non è ancora avviato: la configurazione non è congelata' }, { status: 409 });
  return Response.json(p, { headers: { 'Cache-Control': 'no-store' } });
}
