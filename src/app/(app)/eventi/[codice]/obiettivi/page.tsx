import Link from 'next/link';
import { prisma } from '@/lib/db';
import { contestoEvento } from '@/lib/contesto';
import { fmtOra } from '@/lib/formato';
import { FormAzione } from '@/components/FormAzione';
import { CampiObiettivo } from '@/components/CampiObiettivo';
import { creaObiettivo } from '@/actions/obiettivi';
import type { Fase } from '@/lib/template';

type PuntiObiettivo = { valorePositivo?: number; fasi?: Record<string, number> };

export default async function Obiettivi({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const { ev, gestore, modificabile, parametri, u } = await contestoEvento(codice);

  const [obiettivi, tipi, tabella] = await Promise.all([
    prisma.obiettivo.findMany({
      where: { eventoId: ev.id },
      orderBy: [{ ordine: 'asc' }, { codice: 'asc' }],
      include: { arbitri: { include: { arbitroEvento: { include: { persona: true } } } }, versioneTemplate: { include: { template: true } } },
    }),
    prisma.tipoObiettivo.findMany({ where: { versioneId: ev.versioneTipologiaId }, orderBy: { codice: 'asc' } }),
    // la tabella punteggi esce dal server solo per chi gestisce l'evento
    gestore ? prisma.tabellaPunteggi.findUnique({ where: { eventoId: ev.id } }) : null,
  ]);
  const punti = ((tabella?.regole as { obiettivi?: Record<string, PuntiObiettivo> }) ?? {}).obiettivi ?? {};
  const perCodice = Object.fromEntries(tipi.map((t) => [t.codice, t]));
  const prossimo = `OBJ${obiettivi.length + 1}`;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        {obiettivi.length === 0 && <p className="text-tenue">Nessun obiettivo ancora.</p>}
        {obiettivi.map((o) => {
          const fasi = o.fasi as Fase[];
          const senzaArbitro = o.tipi.every((t) => perCodice[t] && !perCodice[t].richiedeArbitro);
          const p = punti[o.codice];
          const incompleto = gestore && (p?.valorePositivo == null || fasi.some((f) => p?.fasi?.[f.codice] == null));
          const mio = o.arbitri.some((a) => a.arbitroEvento.personaId === u.personaId);
          return (
            <div key={o.id} className={`carta ${mio ? 'ring-1 ring-accento' : ''}`}>
              <div className="flex flex-wrap items-center gap-2">
                <b>{o.codice}</b><span>{o.nome}</span>
                <span className="pill bg-bordo">tipo {o.tipi.join('+')}</span>
                {o.ordine && <span className="pill bg-bordo text-tenue">{o.ordine}° nel percorso</span>}
                {o.stato !== 'ATTIVO' && <span className="pill bg-avviso text-black">{o.stato.toLowerCase()}</span>}
                {mio && <span className="pill bg-accento text-black">il tuo obiettivo</span>}
                {incompleto && <span className="pill bg-errore">punteggi da completare</span>}
                {gestore && <Link href={`/eventi/${ev.codice}/obiettivi/${o.id}`} className="link ml-auto text-sm">{modificabile ? 'Modifica' : 'Dettagli'}</Link>}
              </div>
              <div className="mt-1 text-sm text-tenue">
                {senzaArbitro
                  ? 'Senza arbitro: compila la squadra'
                  : `Finestra ${o.durataMin} min · attivo ${fmtOra(o.areaDa)}–${fmtOra(o.areaA)}${o.ultimaFinestra ? ` · ultima finestra ${fmtOra(o.ultimaFinestra)}` : ''} · arbitro: ${o.arbitri.map((a) => `${a.arbitroEvento.persona.nome} ${a.arbitroEvento.persona.cognome}`).join(', ') || 'da assegnare'}`}
                {' · '}{o.versioneTemplate?.template.codice ?? 'nessun template'}
              </div>
              {fasi.length > 0 && (
                <div className="mt-1 text-sm">
                  {fasi.map((f) => (
                    <span key={f.codice} className="mr-3">{f.codice} · {f.nome}{gestore && p?.fasi?.[f.codice] != null && <b className="text-accento"> +{p.fasi[f.codice]}</b>}</span>
                  ))}
                </div>
              )}
              {gestore && p?.valorePositivo != null && <div className="mt-1 text-xs text-avviso">Valore positivo: {p.valorePositivo} (visibile solo a ente e direzione)</div>}
            </div>
          );
        })}
      </section>

      {gestore && modificabile && (
        <section className="carta">
          <h2 className="mb-3 text-lg font-semibold">Nuovo obiettivo</h2>
          <FormAzione azione={creaObiettivo} nascosti={{ eventoId: ev.id }} dati svuotaSeOk>
            <CampiObiettivo tipi={tipi} sequenza={parametri.obiettiviInSequenza} finestra={parametri.finestra} prossimoCodice={prossimo} />
          </FormAzione>
        </section>
      )}
    </div>
  );
}
