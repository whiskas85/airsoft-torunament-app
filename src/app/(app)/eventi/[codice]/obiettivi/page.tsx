import Link from 'next/link';
import { prisma } from '@/lib/db';
import { contestoEvento } from '@/lib/contesto';
import { fmtOra } from '@/lib/formato';
import { MappaPanoramica } from '@/components/mappa/MappaPanoramica';
import type { Fase } from '@/lib/template';

type PuntiObiettivo = { valorePositivo?: number; fasi?: Record<string, number> };
type Geometria = { areaEsecuzioneM?: number | null; zonaObiettivoM?: number | null; portaIn?: { lat: number; lon: number } | null; portaOut?: { lat: number; lon: number } | null } | null;

export default async function Obiettivi({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const { ev, gestore, modificabile, u } = await contestoEvento(codice);

  const [obiettivi, tipi, tabella, evento] = await Promise.all([
    prisma.obiettivo.findMany({
      where: { eventoId: ev.id },
      orderBy: [{ ordine: 'asc' }, { codice: 'asc' }],
      include: { arbitri: { include: { arbitroEvento: { include: { persona: true } } } }, versioneTemplate: { include: { template: true } }, capo: { include: { persona: true } } },
    }),
    prisma.tipoObiettivo.findMany({ where: { versioneId: ev.versioneTipologiaId }, orderBy: { codice: 'asc' } }),
    // la tabella punteggi esce dal server solo per chi gestisce l'evento
    gestore ? prisma.tabellaPunteggi.findUnique({ where: { eventoId: ev.id } }) : null,
    prisma.evento.findUniqueOrThrow({ where: { id: ev.id }, select: { lat: true, lon: true, parcheggi: true } }),
  ]);
  const punti = ((tabella?.regole as { obiettivi?: Record<string, PuntiObiettivo> }) ?? {}).obiettivi ?? {};
  const perCodice = Object.fromEntries(tipi.map((t) => [t.codice, t]));
  const codicePerId = Object.fromEntries(obiettivi.map((o) => [o.id, o.codice]));
  const conArbitro = (o: (typeof obiettivi)[number]) => o.tipi.some((t) => perCodice[t]?.richiedeArbitro !== false);
  const principali = obiettivi.filter(conArbitro);
  const waypoint = obiettivi.filter((o) => !conArbitro(o));
  const ciSonoTipiWaypoint = tipi.some((t) => !t.richiedeArbitro && !t.richiedeFinestra);

  return (
    <div className="space-y-6">
      {gestore && modificabile && (
        <div className="flex flex-wrap gap-2">
          <Link href={`/eventi/${ev.codice}/obiettivi/nuovo`} className="bottone">+ Nuovo obiettivo</Link>
          {ciSonoTipiWaypoint && <Link href={`/eventi/${ev.codice}/obiettivi/waypoint`} className="bottone-sec">+ Waypoint in serie</Link>}
        </div>
      )}

      {gestore && (obiettivi.some((o) => o.lat != null) || evento.lat != null) && (
        <MappaPanoramica
          campo={evento.lat != null && evento.lon != null ? { lat: evento.lat, lon: evento.lon } : null}
          parcheggi={(evento.parcheggi as { nome: string; lat: number; lon: number }[]) ?? []}
          obiettivi={obiettivi.filter((o) => o.lat != null && o.lon != null).map((o) => {
            const g = o.geometria as Geometria;
            return { codice: o.codice, lat: o.lat!, lon: o.lon!, esecuzioneM: g?.areaEsecuzioneM, zonaM: g?.zonaObiettivoM, portaIn: g?.portaIn, portaOut: g?.portaOut, waypoint: !conArbitro(o) };
          })}
        />
      )}

      <section className="space-y-2">
        {obiettivi.length === 0 && <p className="text-tenue">Nessun obiettivo ancora.</p>}
        {principali.map((o) => {
          const fasi = o.fasi as Fase[];
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
                {incompleto && <span className="pill bg-errore">punti da completare</span>}
                {o.lat == null && gestore && <span className="pill bg-bordo text-avviso">senza posizione</span>}
                {gestore && <Link href={`/eventi/${ev.codice}/obiettivi/${o.id}`} className="link ml-auto text-sm">{modificabile ? 'Modifica' : 'Dettagli'}</Link>}
              </div>
              <div className="mt-1 text-sm text-tenue">
                {o.durataMin > 0 ? `Finestra ${o.durataMin} min` : 'Senza finestra'} · attivo {fmtOra(o.areaDa)}–{fmtOra(o.areaA)}
                {o.ultimaFinestra ? ` · ultima finestra ${fmtOra(o.ultimaFinestra)}` : ''}
                {gestore && ` · arbitro: ${o.arbitri.map((a) => `${a.arbitroEvento.persona.nome} ${a.arbitroEvento.persona.cognome}`).join(', ') || 'da assegnare'}`}
                {gestore && o.capo && ` · capo obiettivo: ${o.capo.persona.nome} ${o.capo.persona.cognome}`}
              </div>
              {o.dipendeDa.length > 0 && (
                <div className="mt-1 text-sm text-avviso">Compare dopo: {o.dipendeDa.map((id) => codicePerId[id] ?? '?').join(', ')}</div>
              )}
              {fasi.length > 0 && (
                <div className="mt-1 text-sm">
                  {fasi.map((f) => (
                    <span key={f.codice} className="mr-3">{f.codice} · {f.nome}{gestore && p?.fasi?.[f.codice] != null && <b className="text-accento"> +{p.fasi[f.codice]}</b>}</span>
                  ))}
                </div>
              )}
              {gestore && p?.valorePositivo != null && <div className="mt-1 text-xs text-avviso">Valore: {p.valorePositivo} punti (lo vedono solo organizzazione e direzione)</div>}
            </div>
          );
        })}
      </section>

      {waypoint.length > 0 && (
        <section className="carta">
          <h2 className="mb-2 font-semibold">Waypoint e ricognizioni ({waypoint.length})</h2>
          <div className="flex flex-wrap gap-2">
            {waypoint.map((o) =>
              gestore ? (
                <Link key={o.id} href={`/eventi/${ev.codice}/obiettivi/${o.id}`} className="rounded-lg border border-bordo px-2.5 py-1 text-sm hover:border-accento">
                  <b>{o.codice}</b> {o.nome !== o.codice && <span className="text-tenue">{o.nome}</span>}
                </Link>
              ) : (
                <span key={o.id} className="rounded-lg border border-bordo px-2.5 py-1 text-sm"><b>{o.codice}</b> {o.nome !== o.codice && <span className="text-tenue">{o.nome}</span>}</span>
              ),
            )}
          </div>
        </section>
      )}
    </div>
  );
}
