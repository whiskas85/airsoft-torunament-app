import Link from 'next/link';
import { prisma } from '@/lib/db';
import { richiediAmministratore } from '@/lib/permessi';

/** Indice delle impostazioni dell'ente: poche voci, ognuna con la sua pagina (C1-03, C1-05). */
export default async function Impostazioni() {
  const { enteId } = await richiediAmministratore();
  const [tipologie, template, coordinamenti] = await Promise.all([
    prisma.tipologiaGara.count({ where: { enteId } }),
    prisma.template.count({ where: { enteId } }),
    prisma.coordinamento.count({ where: { enteId } }),
  ]);

  const voci = [
    { href: '/impostazioni/tipologie', titolo: 'Tipologie di gara', testo: 'PLR, PCR…: parametri, tipi di obiettivo e regole di punteggio.', n: tipologie },
    { href: '/campionati', titolo: 'Campionati', testo: 'Stagioni e tappe, per ogni tipologia.', n: null },
    { href: '/impostazioni/template', titolo: 'Template delle schede', testo: 'Le schede che compilano gli arbitri. Impostazione avanzata.', n: template },
  ];

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold">Impostazioni</h1>
        <p className="text-sm text-tenue">{coordinamenti} coordinamenti.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {voci.map((v) => (
          <Link key={v.href} href={v.href} className="carta block transition hover:ring-1 hover:ring-accento">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold">{v.titolo}</span>
              {v.n !== null && <span className="ml-auto text-2xl font-bold text-accento">{v.n}</span>}
            </div>
            <p className="mt-1 text-sm text-tenue">{v.testo}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
