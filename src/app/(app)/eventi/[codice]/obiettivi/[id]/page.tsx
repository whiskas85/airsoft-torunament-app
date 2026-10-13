import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { contestoEvento } from '@/lib/contesto';
import { contestoModuloObiettivo, valoriModuloObiettivo } from '@/lib/obiettivi';
import { FormAzione } from '@/components/FormAzione';
import { CampiObiettivo } from '@/components/CampiObiettivo';
import { AnteprimaTemplate } from '@/components/AnteprimaTemplate';
import { aggiornaObiettivo, eliminaObiettivo } from '@/actions/obiettivi';
import type { DefinizioneTemplate, Fase } from '@/lib/template';

export default async function Obiettivo({ params }: { params: Promise<{ codice: string; id: string }> }) {
  const { codice, id } = await params;
  const { ev, gestore, modificabile, parametri } = await contestoEvento(codice);
  if (!gestore) notFound();

  const o = await prisma.obiettivo.findFirst({ where: { id, eventoId: ev.id }, include: { versioneTemplate: { include: { template: true } } } });
  if (!o) notFound();
  const evento = await prisma.evento.findUniqueOrThrow({ where: { id: ev.id }, select: { id: true, versioneTipologiaId: true, lat: true, lon: true, parcheggi: true } });
  const [ctx, valori] = await Promise.all([contestoModuloObiettivo(evento, o.id), valoriModuloObiettivo(o)]);
  const nascosti = { eventoId: ev.id, obiettivoId: o.id };

  return (
    <div className="space-y-6">
      <Link href={`/eventi/${ev.codice}/obiettivi`} className="link text-sm">← Obiettivi</Link>

      <section className="carta">
        <h2 className="mb-3 text-lg font-semibold">{o.codice} · {o.nome}</h2>
        {modificabile ? (
          <FormAzione azione={aggiornaObiettivo} nascosti={nascosti} dati>
            <CampiObiettivo {...ctx} valori={valori} sequenza={parametri.obiettiviInSequenza} finestra={parametri.finestra} />
          </FormAzione>
        ) : (
          <p className="text-sm text-tenue">Evento avviato: l’obiettivo è congelato.</p>
        )}
      </section>

      {o.versioneTemplate && (
        <section className="carta">
          <h2 className="mb-1 text-lg font-semibold">Scheda che compilerà l’arbitro</h2>
          <p className="mb-3 text-sm text-tenue">{o.versioneTemplate.template.nome} · versione {o.versioneTemplate.numero}, con le fasi di questo obiettivo.</p>
          <AnteprimaTemplate def={o.versioneTemplate.campi as DefinizioneTemplate} fasi={o.fasi as Fase[]} />
        </section>
      )}

      {modificabile && (
        <FormAzione azione={eliminaObiettivo} nascosti={nascosti} etichetta={`Elimina ${o.codice}`} secondario classe=""
          conferma={`Eliminare ${o.codice}? Verranno tolti anche gli arbitri assegnati e i suoi punteggi.`} />
      )}
    </div>
  );
}
