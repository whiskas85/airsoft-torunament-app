import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { richiediAmministratore } from '@/lib/permessi';
import { descriviRegola, type Regola } from '@/lib/regole';
import { FormAzione } from '@/components/FormAzione';
import { aggiornaTipologia, archiviaTipologia } from '@/actions/tipologie';
import type { ParametriTipologia } from '@/lib/tipologie';

export default async function Tipologia({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { enteId } = await richiediAmministratore();
  const t = await prisma.tipologiaGara.findFirst({
    where: { id, enteId },
    include: { versioni: { orderBy: { numero: 'desc' }, take: 1, include: { tipiObiettivo: { orderBy: { codice: 'asc' } } } } },
  });
  if (!t) notFound();
  const v = t.versioni[0];
  const p = v.parametri as ParametriTipologia;
  const regole = (v.regolePredefinite as { regole: Regola[] }).regole;
  const template = await prisma.template.findMany({ where: { enteId }, include: { versioni: { orderBy: { numero: 'desc' }, take: 1 } } });
  const perId = Object.fromEntries(template.map((x) => [x.id, x]));

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Link href="/impostazioni/tipologie" className="link text-sm">← Tipologie</Link>

      <FormAzione azione={aggiornaTipologia} nascosti={{ tipologiaId: t.id }} dati classe="space-y-4">
        <section className="carta space-y-3">
          <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
            <div>
              <label className="etichetta">Sigla</label>
              <input name="codice" required maxLength={8} defaultValue={t.codice} className="campo font-mono uppercase" />
            </div>
            <div>
              <label className="etichetta">Nome</label>
              <input name="nome" required defaultValue={t.nome} className="campo text-lg font-semibold" />
            </div>
          </div>
        </section>

        <section className="carta space-y-4">
          <h2 className="font-semibold">Parametri di gara</h2>
          <div>
            <span className="etichetta">Operatori per pattuglia</span>
            <div className="grid grid-cols-3 gap-3">
              <label className="text-sm">minimo<input name="operatoriMin" type="number" min={1} required defaultValue={p.operatori.min} className="campo mt-1" /></label>
              <label className="text-sm">massimo<input name="operatoriMax" type="number" min={1} required defaultValue={p.operatori.max} className="campo mt-1" /></label>
              <label className="text-sm">minimo per restare in gara<input name="minimoInGara" type="number" min={1} required defaultValue={p.operatori.minimoInGara} className="campo mt-1" /></label>
            </div>
          </div>
          <div>
            <span className="etichetta">Finestre di attacco</span>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">durata minima (min)<input name="finestraMin" type="number" min={1} required defaultValue={p.finestra.minMin} className="campo mt-1" /></label>
              <label className="text-sm">durata massima (min)<input name="finestraMax" type="number" min={1} required defaultValue={p.finestra.maxMin} className="campo mt-1" /></label>
              <label className="text-sm">come si ottengono
                <select name="modalita" defaultValue={p.finestra.modalita} className="campo mt-1">
                  <option value="PRENOTATA">Prenotate (luce verde)</option>
                  <option value="CODA_INGRESSO">Coda alla Porta IN</option>
                </select>
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="obiettiviInSequenza" defaultChecked={p.obiettiviInSequenza} className="h-5 w-5" /> Obiettivi in sequenza (OBJ1 → OBJ2 → …)</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="orarioMassimo" defaultChecked={p.esfiltrazione.orarioMassimo} className="h-5 w-5" /> Esfiltrazione con orario massimo</label>
          </div>
        </section>
      </FormAzione>

      <section className="carta space-y-2">
        <h2 className="font-semibold">Tipi di obiettivo</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {v.tipiObiettivo.length === 0 && <p className="text-sm text-tenue">Nessuno.</p>}
          {v.tipiObiettivo.map((o) => {
            const tpl = o.templateId ? perId[o.templateId] : null;
            return (
              <div key={o.id} className="rounded-lg border border-bordo p-2 text-sm">
                <b className="text-accento">{o.codice}</b> · {o.nome}
                <div className="text-xs text-tenue">
                  {o.richiedeArbitro ? 'con arbitro' : 'senza arbitro'} · {o.richiedeFinestra ? 'con finestra' : 'senza finestra'}
                  {o.compilatoDa === 'SQUADRA' ? ' · compila la squadra' : ''}
                  {o.fotoMinime ? ` · ${o.fotoMinime} foto minime` : ''}
                  {tpl && <> · <Link className="link" href={`/impostazioni/template/${tpl.versioni[0].id}`}>{tpl.codice}</Link></>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <details className="carta">
        <summary className="cursor-pointer font-semibold">Regole di punteggio predefinite ({regole.length})</summary>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {regole.map((r, i) => (
              <tr key={i} className="border-t border-bordo align-top">
                <td className="py-1.5 pr-2">{descriviRegola(r)}</td>
                <td className="py-1.5 text-xs text-tenue">{r.nota}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>

      <section className="carta flex flex-wrap items-center gap-3">
        <p className="mr-auto text-sm text-tenue">
          {t.archiviata ? 'Archiviata: non si propone per nuovi eventi e campionati.' : 'Una tipologia non più usata si archivia: gli eventi passati restano com’erano.'}
        </p>
        <FormAzione azione={archiviaTipologia} nascosti={{ tipologiaId: t.id }} etichetta={t.archiviata ? 'Riattiva' : 'Archivia'} secondario classe="" />
      </section>
    </main>
  );
}
