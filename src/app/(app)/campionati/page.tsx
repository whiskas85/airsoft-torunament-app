import Link from 'next/link';
import { prisma } from '@/lib/db';
import { richiediAmministratore } from '@/lib/permessi';
import { fmtData } from '@/lib/formato';
import { NOME_STATO_EVENTO } from '@/lib/ruoli';

type RegoleCampionato = { puntiPerPosizione: number[]; puntiDallaPosizioneSuccessiva: number; miglioriRisultati: number };

/** Campionati per tipologia, ognuno con le sue tappe in ordine di data (C1-05, C1-12). */
export default async function Campionati() {
  const { enteId } = await richiediAmministratore();
  const tipologie = await prisma.tipologiaGara.findMany({
    where: { enteId },
    orderBy: { codice: 'asc' },
    include: {
      campionati: {
        orderBy: { stagione: 'desc' },
        include: {
          coordinamenti: { include: { coordinamento: true } },
          _count: { select: { iscrizioni: true } },
          eventi: { include: { evento: true } },
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="mr-auto">
          <h1 className="text-xl font-bold">Campionati</h1>
          <p className="text-sm text-tenue">Ogni campionato appartiene a una tipologia di gara; le sue tappe sono gli eventi, in ordine di data.</p>
        </div>
        <Link href="/eventi/nuovo" className="bottone">Nuova tappa</Link>
      </div>

      {tipologie.map((t) => (
        <section key={t.id} className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <span className="pill bg-accento text-black">{t.codice}</span> {t.nome}
          </h2>
          {t.campionati.length === 0 && <p className="text-sm text-tenue">Nessun campionato.</p>}
          {t.campionati.map((c) => {
            const r = c.regole as RegoleCampionato;
            const tappe = [...c.eventi].sort((a, b) => +a.evento.inizio - +b.evento.inizio);
            return (
              <div key={c.id} className="carta space-y-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <b className="text-lg">{c.nome}</b>
                  <span className="pill bg-bordo">{c.stagione}</span>
                  <span className="text-sm text-tenue">{c.coordinamenti.map((x) => x.coordinamento.nome).join(', ') || 'tutti i coordinamenti'}</span>
                  <span className="ml-auto text-sm text-tenue">{c._count.iscrizioni} squadre iscritte</span>
                </div>
                <ol className="space-y-1">
                  {tappe.length === 0 && <li className="text-sm text-tenue">Nessuna tappa ancora.</li>}
                  {tappe.map((x, i) => (
                    <li key={x.eventoId}>
                      <Link href={`/eventi/${x.evento.codice}`} className="flex flex-wrap items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-bordo">
                        <span className="w-16 font-semibold text-accento">Tappa {i + 1}</span>
                        <span className="w-24 text-tenue">{fmtData(x.evento.inizio)}</span>
                        <span>{x.evento.nome}</span>
                        <span className="pill ml-auto bg-bordo text-tenue">{NOME_STATO_EVENTO[x.evento.stato]}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-tenue">
                  Punti per posizione {r.puntiPerPosizione.slice(0, 6).join(', ')}… poi {r.puntiDallaPosizioneSuccessiva} · contano i migliori {r.miglioriRisultati} risultati
                </p>
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
