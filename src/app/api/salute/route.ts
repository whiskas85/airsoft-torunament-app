import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Per il controllo di salute del container: risponde 200 solo se anche il database risponde. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 503 });
  }
}
