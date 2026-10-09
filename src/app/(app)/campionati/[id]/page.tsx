import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { richiediOrganizzatore } from '@/lib/permessi';
import { fmtData } from '@/lib/formato';
import { FormAzione } from '@/components/FormAzione';
import { aggiornaCampionato, eliminaCampionato } from '@/actions/campionati';

type Regole = { puntiPerPosizione: number[]; puntiDallaPosizioneSuccessiva: number; miglioriRisultati: number };

export default async function Campionato({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await richiediOrganizzatore();
  const c = await prisma.campionato.findFirst({
    where: { id, enteId: o.enteId },
    include: { tipologia: true, coordinamenti: true, eventi: { include: { evento: true } } },
  });
  if (!c) notFound();
  if (o.coordinamenti && !c.coordinamenti.some((x) => o.coordinamenti!.includes(x.coordinamentoId))) notFound();
  const coordinamenti = await prisma.coordinamento.findMany({ where: { enteId: o.enteId, ...(o.coordinamenti ? { id: { in: o.coordinamenti } } : {}) }, orderBy: { nome: 'asc' } });
  const r = c.regole as Regole;
  const tappe = [...c.eventi].sort((a, b) => +a.evento.inizio - +b.evento.inizio);

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Link href="/campionati" className="link text-sm">← Campionati</Link>
      <div className="flex items-center gap-2">
        <span className="pill bg-accento text-black">{c.tipologia.codice}</span>
        <span className="text-sm text-tenue">{c.tipologia.nome}</span>
      </div>

      <FormAzione azione={aggiornaCampionato} nascosti={{ campionatoId: c.id }} dati classe="space-y-4">
        <section className="carta space-y-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
            <div>
              <label className="etichetta">Nome</label>
              <input name="nome" required defaultValue={c.nome} className="campo text-lg font-semibold" />
            </div>
            <div>
              <label className="etichetta">Stagione</label>
              <input name="stagione" required defaultValue={c.stagione} className="campo" />
            </div>
          </div>
          <div>
            <span className="etichetta">Coordinamenti</span>
            <div className="flex flex-wrap gap-3 text-sm">
              {coordinamenti.map((x) => (
                <label key={x.id} className="flex items-center gap-1.5">
                  <input type="checkbox" name="coordinamenti" value={x.id} defaultChecked={c.coordinamenti.some((y) => y.coordinamentoId === x.id)} className="h-4 w-4" /> {x.nome}
                </label>
              ))}
            </div>
          </div>
        </section>

        <section className="carta space-y-3">
          <h2 className="font-semibold">Punti di campionato</h2>
          <div>
            <label className="etichetta">Punti per posizione (1°, 2°, 3°…)</label>
            <input name="puntiPerPosizione" required defaultValue={r.puntiPerPosizione.join(', ')} className="campo font-mono" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Punti per le posizioni successive<input name="puntiDopo" type="number" min={0} defaultValue={r.puntiDallaPosizioneSuccessiva} className="campo mt-1" /></label>
            <label className="text-sm">Contano i migliori risultati<input name="miglioriRisultati" type="number" min={1} defaultValue={r.miglioriRisultati} className="campo mt-1" /></label>
          </div>
        </section>
      </FormAzione>

      <section className="carta space-y-2">
        <div className="flex items-center">
          <h2 className="mr-auto font-semibold">Tappe</h2>
          <Link href={`/eventi/nuovo?campionato=${c.id}`} className="bottone-sec px-3 py-1.5 text-sm">+ Nuova tappa</Link>
        </div>
        {tappe.length === 0 && <p className="text-sm text-tenue">Nessuna tappa ancora.</p>}
        <ol className="space-y-1">
          {tappe.map((x, i) => (
            <li key={x.eventoId}>
              <Link href={`/eventi/${x.evento.codice}`} className="flex gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-bordo">
                <span className="w-16 font-semibold text-accento">Tappa {i + 1}</span>
                <span className="w-24 text-tenue">{fmtData(x.evento.inizio)}</span>
                <span>{x.evento.nome}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      {tappe.length === 0 && (
        <FormAzione azione={eliminaCampionato} nascosti={{ campionatoId: c.id }} etichetta="Elimina il campionato" secondario classe=""
          conferma={`Eliminare «${c.nome}»?`} />
      )}
    </main>
  );
}
