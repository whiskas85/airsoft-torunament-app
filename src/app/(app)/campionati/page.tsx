import Link from 'next/link';
import { prisma } from '@/lib/db';
import { richiediOrganizzatore } from '@/lib/permessi';
import { fmtData } from '@/lib/formato';
import { NOME_STATO_EVENTO } from '@/lib/ruoli';
import { FormAzione } from '@/components/FormAzione';
import { creaCampionato } from '@/actions/campionati';

/** Stagione in corso: da settembre si passa a quella nuova (es. ottobre 2026 → 2026-2027). */
function stagioneAttuale() {
  const d = new Date();
  const a = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1;
  return `${a}-${a + 1}`;
}

/** Campionati per tipologia, ognuno con le sue tappe in ordine di data (C1-05, C1-12). */
export default async function Campionati() {
  const o = await richiediOrganizzatore();
  const [tipologie, coordinamenti] = await Promise.all([
    prisma.tipologiaGara.findMany({
      where: { enteId: o.enteId },
      orderBy: [{ archiviata: 'asc' }, { codice: 'asc' }],
      include: {
        campionati: {
          // il responsabile vede i campionati dei suoi coordinamenti
          where: o.coordinamenti ? { coordinamenti: { some: { coordinamentoId: { in: o.coordinamenti } } } } : {},
          orderBy: { stagione: 'desc' },
          include: { coordinamenti: { include: { coordinamento: true } }, _count: { select: { iscrizioni: true } }, eventi: { include: { evento: true } } },
        },
      },
    }),
    prisma.coordinamento.findMany({ where: { enteId: o.enteId, ...(o.coordinamenti ? { id: { in: o.coordinamenti } } : {}) }, orderBy: { nome: 'asc' } }),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold">Campionati</h1>
        <p className="text-sm text-tenue">Ogni campionato appartiene a una tipologia di gara; le sue tappe sono gli eventi, in ordine di data.</p>
      </div>

      {tipologie.filter((t) => !t.archiviata || t.campionati.length).map((t) => (
        <section key={t.id} className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <span className="pill bg-accento text-black">{t.codice}</span> {t.nome}
          </h2>
          {t.campionati.length === 0 && <p className="text-sm text-tenue">Nessun campionato.</p>}
          {t.campionati.map((c) => {
            const tappe = [...c.eventi].sort((a, b) => +a.evento.inizio - +b.evento.inizio);
            return (
              <div key={c.id} className="carta space-y-3">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Link href={`/campionati/${c.id}`} className="text-lg font-bold hover:text-accento">{c.nome}</Link>
                  <span className="pill bg-bordo">{c.stagione}</span>
                  <span className="text-sm text-tenue">{c.coordinamenti.map((x) => x.coordinamento.nome).join(', ') || 'tutti i coordinamenti'}</span>
                  <span className="ml-auto text-sm text-tenue">{c._count.iscrizioni} squadre iscritte</span>
                  <Link href={`/campionati/${c.id}`} className="link text-sm">Modifica</Link>
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
                <Link href={`/eventi/nuovo?campionato=${c.id}`} className="bottone-sec px-3 py-1.5 text-sm">+ Nuova tappa</Link>
              </div>
            );
          })}
        </section>
      ))}

      <section className="carta">
        <h2 className="mb-3 font-semibold">Nuovo campionato</h2>
        <FormAzione azione={creaCampionato} etichetta="Crea il campionato" classe="space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_2fr_9rem]">
            <div>
              <label className="etichetta">Tipologia</label>
              <select name="tipologiaId" required className="campo">
                {tipologie.filter((t) => !t.archiviata).map((t) => <option key={t.id} value={t.id}>{t.codice} · {t.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="etichetta">Nome</label>
              <input name="nome" required className="campo" placeholder="es. Campionato regionale PLR Piemonte" />
            </div>
            <div>
              <label className="etichetta">Stagione</label>
              <input name="stagione" required defaultValue={stagioneAttuale()} className="campo" />
            </div>
          </div>
          <div>
            <span className="etichetta">Coordinamenti</span>
            <div className="flex flex-wrap gap-3 text-sm">
              {coordinamenti.map((c) => (
                <label key={c.id} className="flex items-center gap-1.5">
                  <input type="checkbox" name="coordinamenti" value={c.id} defaultChecked={coordinamenti.length === 1} className="h-4 w-4" /> {c.nome}
                </label>
              ))}
            </div>
          </div>
        </FormAzione>
      </section>
    </main>
  );
}
