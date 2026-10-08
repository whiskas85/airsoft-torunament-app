import Link from 'next/link';
import { notFound } from 'next/navigation';
import { richiediUtente } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { mieiEventi, NOME_RUOLO, NOME_STATO_EVENTO } from '@/lib/ruoli';
import { fmtDataOra, fmtOra } from '@/lib/formato';
import { Intestazione } from '@/components/Intestazione';
import type { Fase } from '@/lib/template';

type PuntiObiettivo = { valorePositivo?: number; fasi?: Record<string, number> };

export default async function Evento({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const u = await richiediUtente();
  const mio = (await mieiEventi(u)).find((e) => e.codice === codice);
  if (!mio) notFound();

  const ev = await prisma.evento.findUniqueOrThrow({
    where: { id: mio.id },
    include: {
      versioneTipologia: { include: { tipologia: true, tipiObiettivo: true } },
      campionati: { include: { campionato: true } },
      obiettivi: {
        orderBy: [{ ordine: 'asc' }, { codice: 'asc' }],
        include: { arbitri: { include: { arbitroEvento: { include: { persona: true } } } }, versioneTemplate: { include: { template: true } } },
      },
      squadre: { include: { squadra: true, _count: { select: { partecipanti: true } } }, orderBy: { identificativo: 'asc' } },
      arbitri: { include: { persona: { include: { qualifiche: true } } } },
    },
  });

  // la tabella punteggi esce dal server solo per ente e direzione
  const vedePunti = mio.ruoli.includes('AMMINISTRATORE') || mio.ruoli.includes('DIREZIONE');
  const tabella = vedePunti ? await prisma.tabellaPunteggi.findUnique({ where: { eventoId: ev.id } }) : null;
  const puntiObj = (tabella?.regole as { obiettivi?: Record<string, PuntiObiettivo> } | undefined)?.obiettivi ?? {};

  const tipiPerCodice = Object.fromEntries(ev.versioneTipologia.tipiObiettivo.map((t) => [t.codice, t]));
  const mieiObiettivi = new Set(
    ev.obiettivi.filter((o) => o.arbitri.some((a) => a.arbitroEvento.personaId === u.personaId)).map((o) => o.id),
  );

  return (
    <>
      <Intestazione utente={u} />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-6">
        <div>
          <Link href="/" className="link text-sm">← Home</Link>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="pill bg-accento text-black">{ev.versioneTipologia.tipologia.codice}</span>
            <span className="pill bg-bordo text-tenue">{NOME_STATO_EVENTO[ev.stato]}</span>
            {mio.ruoli.map((r) => <span key={r} className="pill bg-bordo">{NOME_RUOLO[r]}</span>)}
            <span className="ml-auto font-mono text-xs text-tenue">{ev.codice}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold">{ev.nome}</h1>
          <p className="text-sm text-tenue">
            {fmtDataOra(ev.inizio)} → {fmtDataOra(ev.fine)} · {ev.luogo}
            {ev.campionati.map((c) => ` · ${c.campionato.nome}, tappa ${c.tappa}`)}
          </p>
        </div>

        <section className="carta">
          <h2 className="mb-3 text-lg font-semibold">Obiettivi</h2>
          <div className="space-y-2">
            {ev.obiettivi.map((o) => {
              const fasi = o.fasi as Fase[];
              const senzaArbitro = o.tipi.every((t) => tipiPerCodice[t] && !tipiPerCodice[t].richiedeArbitro);
              const p = puntiObj[o.codice];
              return (
                <div key={o.id} className={`rounded-lg border p-3 ${mieiObiettivi.has(o.id) ? 'border-accento' : 'border-bordo'}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <b>{o.codice}</b>
                    <span>{o.nome}</span>
                    <span className="pill bg-bordo">tipo {o.tipi.join('+')}</span>
                    {o.ordine && <span className="pill bg-bordo text-tenue">{o.ordine}° nel percorso</span>}
                    {mieiObiettivi.has(o.id) && <span className="pill bg-accento text-black">il tuo obiettivo</span>}
                    <span className="ml-auto text-xs text-tenue">{o.versioneTemplate?.template.codice}</span>
                  </div>
                  <div className="mt-1 text-sm text-tenue">
                    {senzaArbitro
                      ? 'Senza arbitro: compila la squadra'
                      : `Finestra di ${o.durataMin} min · attivo ${fmtOra(o.areaDa)}–${fmtOra(o.areaA)} · ultima finestra ${fmtOra(o.ultimaFinestra)}`}
                    {!senzaArbitro && ` · arbitro: ${o.arbitri.map((a) => `${a.arbitroEvento.persona.nome} ${a.arbitroEvento.persona.cognome}`).join(', ') || 'da assegnare'}`}
                  </div>
                  {fasi.length > 0 && (
                    <div className="mt-1 text-sm">
                      {fasi.map((f) => (
                        <span key={f.codice} className="mr-3">
                          {f.codice} · {f.nome}{vedePunti && p?.fasi?.[f.codice] != null ? <b className="text-accento"> +{p.fasi[f.codice]}</b> : null}
                        </span>
                      ))}
                    </div>
                  )}
                  {vedePunti && p?.valorePositivo != null && (
                    <div className="mt-1 text-xs text-avviso">Valore positivo dell’obiettivo: {p.valorePositivo} (solo direzione)</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="carta">
            <h2 className="mb-3 text-lg font-semibold">Squadre</h2>
            <table className="w-full text-sm">
              <tbody>
                {ev.squadre.map((s) => {
                  const fasce = (s.squadra.fasce as { colori?: string[] } | null)?.colori ?? [];
                  return (
                    <tr key={s.id} className="border-t border-bordo first:border-0">
                      <td className="py-2 pr-2 font-mono font-bold">{s.identificativo}</td>
                      <td className="py-2 pr-2">
                        {s.squadra.nome}
                        <div className="text-xs text-tenue">fascia {fasce.join('/')} · {s._count.partecipanti} operatori</div>
                      </td>
                      <td className="py-2 text-right text-xs">
                        {s.ruolo === 'ORGANIZZATRICE' && <span className="pill bg-avviso text-black">organizza</span>}
                        {s.ruolo === 'GAREGGIA' && !s.inCampionato && <span className="pill bg-bordo">open</span>}
                        {vedePunti && <span className={`pill ml-1 ${s.pagato ? 'bg-ok text-black' : 'bg-errore'}`}>{s.pagato ? 'pagato' : 'da pagare'}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="carta">
            <h2 className="mb-3 text-lg font-semibold">Staff arbitrale</h2>
            <table className="w-full text-sm">
              <tbody>
                {ev.arbitri.map((a) => (
                  <tr key={a.id} className="border-t border-bordo first:border-0">
                    <td className="py-2 pr-2">{a.persona.nome} {a.persona.cognome}</td>
                    <td className="py-2 pr-2 text-xs text-tenue">{a.persona.qualifiche[0]?.livello.toLowerCase()}</td>
                    <td className="py-2 text-right text-xs">{a.ruoli.map((r) => r.replace('_', ' ').toLowerCase()).join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {vedePunti && (
          <p className="text-xs text-tenue">
            Stai vedendo i valori della tabella punteggi perché sei {mio.ruoli.includes('DIREZIONE') ? 'in direzione gara' : 'amministratore dell’ente'}:
            arbitri e squadre non li ricevono mai.
          </p>
        )}
      </main>
    </>
  );
}
