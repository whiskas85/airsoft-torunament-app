import { utenteCorrente } from '@/lib/auth';
import { mieiEventi } from '@/lib/ruoli';

export const dynamic = 'force-dynamic';

/** Gli eventi dell'utente: quelli avviati si possono scaricare per il campo. */
export async function GET() {
  const u = await utenteCorrente();
  if (!u) return Response.json({ errore: 'accesso richiesto' }, { status: 401 });
  const eventi = await mieiEventi(u);
  return Response.json(
    eventi.map((e) => ({
      id: e.id, codice: e.codice, nome: e.nome, stato: e.stato, inizio: e.inizio, fine: e.fine, luogo: e.luogo,
      tipologia: e.versioneTipologia.tipologia.codice, ruoli: e.ruoli,
      scaricabile: !!e.hashConfigurazione, hash: e.hashConfigurazione,
    })),
  );
}
