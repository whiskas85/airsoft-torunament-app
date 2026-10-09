import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { contestoEvento } from '@/lib/contesto';
import { FormAzione } from '@/components/FormAzione';
import { CampiObiettivo } from '@/components/CampiObiettivo';
import { AnteprimaTemplate } from '@/components/AnteprimaTemplate';
import { aggiornaObiettivo, eliminaObiettivo, salvaPuntiObiettivo } from '@/actions/obiettivi';
import type { DefinizioneTemplate, Fase } from '@/lib/template';

type PuntiObiettivo = { valorePositivo?: number; fasi?: Record<string, number> };

export default async function Obiettivo({ params }: { params: Promise<{ codice: string; id: string }> }) {
  const { codice, id } = await params;
  const { ev, gestore, modificabile, parametri } = await contestoEvento(codice);
  if (!gestore) notFound();

  const o = await prisma.obiettivo.findFirst({ where: { id, eventoId: ev.id }, include: { versioneTemplate: { include: { template: true } } } });
  if (!o) notFound();
  const tipi = await prisma.tipoObiettivo.findMany({ where: { versioneId: ev.versioneTipologiaId }, orderBy: { codice: 'asc' } });
  const tabella = await prisma.tabellaPunteggi.findUnique({ where: { eventoId: ev.id } });
  const p = (((tabella?.regole as { obiettivi?: Record<string, PuntiObiettivo> }) ?? {}).obiettivi ?? {})[o.codice] ?? {};
  const fasi = o.fasi as Fase[];
  const nascosti = { eventoId: ev.id, obiettivoId: o.id };

  return (
    <div className="space-y-6">
      <Link href={`/eventi/${ev.codice}/obiettivi`} className="link text-sm">← Obiettivi</Link>

      <section className="carta">
        <h2 className="mb-3 text-lg font-semibold">{o.codice} · {o.nome}</h2>
        {modificabile ? (
          <FormAzione azione={aggiornaObiettivo} nascosti={nascosti} dati>
            <CampiObiettivo tipi={tipi} valori={{ ...o, geometria: o.geometria as object, fasi }} sequenza={parametri.obiettiviInSequenza} finestra={parametri.finestra} />
          </FormAzione>
        ) : (
          <p className="text-sm text-tenue">Evento avviato: l’obiettivo è congelato.</p>
        )}
      </section>

      <section className="carta">
        <h2 className="text-lg font-semibold">Tabella punteggi di questo obiettivo</h2>
        <p className="mb-3 text-sm text-tenue">
          Solo ente e direzione la vedono, e si modifica solo fino all’avvio. Il valore positivo serve anche per il fuori finestra
          (che toglie tanti punti quanti ne vale l’obiettivo).
        </p>
        {modificabile ? (
          <FormAzione azione={salvaPuntiObiettivo} nascosti={nascosti} dati>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="etichetta">Valore positivo dell’obiettivo</label>
                <input name="valorePositivo" type="number" min={0} defaultValue={p.valorePositivo ?? ''} className="campo" />
              </div>
              {fasi.map((f) => (
                <div key={f.codice}>
                  <label className="etichetta">{f.codice} · {f.nome}</label>
                  <input name={`fase_${f.codice}`} type="number" defaultValue={p.fasi?.[f.codice] ?? ''} className="campo" />
                </div>
              ))}
            </div>
          </FormAzione>
        ) : (
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Valore positivo: <b className="text-accento">{p.valorePositivo ?? '—'}</b></span>
            {fasi.map((f) => <span key={f.codice}>{f.codice} · {f.nome}: <b className="text-accento">{p.fasi?.[f.codice] ?? '—'}</b></span>)}
          </div>
        )}
      </section>

      {o.versioneTemplate && (
        <section className="carta">
          <h2 className="mb-1 text-lg font-semibold">Scheda che compilerà l’arbitro</h2>
          <p className="mb-3 text-sm text-tenue">{o.versioneTemplate.template.nome} · versione {o.versioneTemplate.numero}, con le fasi di questo obiettivo.</p>
          <AnteprimaTemplate def={o.versioneTemplate.campi as DefinizioneTemplate} fasi={fasi} />
        </section>
      )}

      {modificabile && (
        <section className="carta">
          <FormAzione azione={eliminaObiettivo} nascosti={nascosti} etichetta={`Elimina ${o.codice}`} secondario classe=""
            conferma={`Eliminare ${o.codice}? Verranno tolti anche gli arbitri assegnati e i suoi punteggi.`} />
        </section>
      )}
    </div>
  );
}
