import Link from 'next/link';
import { prisma } from '@/lib/db';
import { richiediAmministratore } from '@/lib/permessi';

export default async function ElencoTemplate() {
  const { enteId } = await richiediAmministratore();
  const template = await prisma.template.findMany({
    where: { enteId },
    include: { versioni: { orderBy: { numero: 'desc' }, take: 1 } },
    orderBy: { codice: 'asc' },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div>
        <Link href="/impostazioni" className="link text-sm">← Impostazioni</Link>
        <h1 className="mt-1 text-xl font-bold">Template delle schede</h1>
        <p className="text-sm text-tenue">Le schede che compilano arbitri e squadre. Ogni tipo di obiettivo ne usa uno.</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {template.map((t) => (
          <Link key={t.id} href={`/impostazioni/template/${t.versioni[0].id}`} className="carta block p-3 text-sm hover:ring-1 hover:ring-accento">
            <div className="font-mono text-xs text-tenue">{t.codice} · v{t.versioni[0].numero}</div>
            {t.nome}
          </Link>
        ))}
      </div>
    </main>
  );
}
