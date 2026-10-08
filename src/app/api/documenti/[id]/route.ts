import { prisma } from '@/lib/db';
import { utenteCorrente } from '@/lib/auth';
import { mieiEventi } from '@/lib/ruoli';
import { leggiFile } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/** Scarica un documento: lo può fare chiunque abbia un ruolo in un evento che lo usa. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await utenteCorrente();
  if (!u) return new Response('Accesso richiesto', { status: 401 });

  const doc = await prisma.documento.findUnique({ where: { id }, include: { eventi: true } });
  if (!doc) return new Response('Non trovato', { status: 404 });
  const miei = new Set((await mieiEventi(u)).map((e) => e.id));
  const admin = u.ruoli.some((r) => r.ruolo === 'AMMINISTRATORE' && r.enteId === doc.enteId);
  if (!admin && !doc.eventi.some((e) => miei.has(e.eventoId))) return new Response('Non autorizzato', { status: 403 });

  const dati = await leggiFile(doc.file);
  const nome = encodeURIComponent(doc.titolo);
  return new Response(new Uint8Array(dati), {
    headers: {
      'Content-Type': doc.mime,
      'Content-Length': String(dati.length),
      'Content-Disposition': `inline; filename*=UTF-8''${nome}`,
      // il contenuto non cambia mai (il nome è il suo hash): il telefono può tenerlo per sempre
      'Cache-Control': 'private, max-age=31536000, immutable',
      'X-Hash-Sha256': doc.hash,
    },
  });
}
