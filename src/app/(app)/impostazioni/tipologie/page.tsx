import Link from 'next/link';
import { notFound } from 'next/navigation';
import { richiediUtente } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { descriviRegola, type Regola } from '@/lib/regole';

type Parametri = {
  operatori: { min: number; max: number; minimoInGara: number };
  finestra: { minMin: number; maxMin: number; modalita: 'PRENOTATA' | 'CODA_INGRESSO' };
  obiettiviInSequenza: boolean;
  esfiltrazione: { orarioMassimo: boolean };
};
export default async function Tipologie() {
  const u = await richiediUtente();
  const enti = u.ruoli.filter((r) => r.ruolo === 'AMMINISTRATORE').map((r) => r.enteId);
  if (enti.length === 0) notFound();

  const tipologie = await prisma.tipologiaGara.findMany({
    where: { enteId: { in: enti } },
    include: { versioni: { orderBy: { numero: 'desc' }, include: { tipiObiettivo: { orderBy: { codice: 'asc' } } } } },
  });
  const template = await prisma.template.findMany({
    where: { enteId: { in: enti } },
    include: { versioni: { orderBy: { numero: 'desc' }, take: 1 } },
    orderBy: { codice: 'asc' },
  });
  const perId = Object.fromEntries(template.map((t) => [t.id, t]));

  return (
    <>
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <Link href="/impostazioni" className="link text-sm">← Impostazioni</Link>
          <h1 className="mt-1 text-xl font-bold">Tipologie di gara</h1>
          <p className="text-sm text-tenue">
            Ogni tipologia porta con sé parametri, tipi di obiettivo e regole di punteggio. Gli eventi e i campionati partono da qui.
          </p>
        </div>

        {tipologie.map((t) => {
          const v = t.versioni[0];
          const p = v.parametri as Parametri;
          const regole = (v.regolePredefinite as { regole: Regola[] }).regole;
          return (
            <section key={t.id} className="carta space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="pill bg-accento text-black">{t.codice}</span>
                <h2 className="text-lg font-semibold">{t.nome}</h2>
                <span className="pill bg-bordo text-tenue">versione {v.numero} · {v.stato.toLowerCase()}</span>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-3">
                <div><span className="etichetta">Operatori</span>{p.operatori.min}–{p.operatori.max} (minimo in gara {p.operatori.minimoInGara})</div>
                <div>
                  <span className="etichetta">Finestra</span>
                  {p.finestra.minMin}–{p.finestra.maxMin} min · {p.finestra.modalita === 'PRENOTATA' ? 'prenotata' : 'coda all’ingresso'}
                </div>
                <div>
                  <span className="etichetta">Percorso</span>
                  {p.obiettiviInSequenza ? 'obiettivi in sequenza' : 'navigazione libera'}
                  {p.esfiltrazione.orarioMassimo ? ' · esfiltrazione con orario massimo' : ''}
                </div>
              </div>
              <div>
                <span className="etichetta">Tipi di obiettivo</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {v.tipiObiettivo.map((o) => {
                    const tpl = o.templateId ? perId[o.templateId] : null;
                    return (
                      <div key={o.id} className="rounded-lg border border-bordo p-2 text-sm">
                        <b className="text-accento">{o.codice}</b> · {o.nome}
                        <div className="text-xs text-tenue">
                          {o.richiedeArbitro ? 'con arbitro' : 'senza arbitro'} · {o.richiedeFinestra ? 'con finestra' : 'senza finestra'}
                          {o.compilatoDa === 'SQUADRA' ? ' · compila la squadra' : ''}
                          {o.fotoMinime ? ` · ${o.fotoMinime} foto minime` : ''}
                          {tpl && (
                            <>
                              {' · '}
                              <Link className="link" href={`/impostazioni/template/${tpl.versioni[0].id}`}>{tpl.codice}</Link>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <details>
                <summary className="cursor-pointer text-sm font-semibold">Regole di punteggio predefinite ({regole.length})</summary>
                <table className="mt-2 w-full text-sm">
                  <tbody>
                    {regole.map((r, i) => (
                      <tr key={i} className="border-t border-bordo align-top">
                        <td className="py-1.5 pr-2 font-mono text-xs">{r.campo}</td>
                        <td className="py-1.5 pr-2">{descriviRegola(r)}</td>
                        <td className="py-1.5 text-xs text-tenue">{r.nota}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
          );
        })}

      </main>
    </>
  );
}
