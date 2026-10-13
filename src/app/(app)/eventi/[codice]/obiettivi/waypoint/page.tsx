import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { contestoEvento } from '@/lib/contesto';
import { FormAzione } from '@/components/FormAzione';
import { InserimentoWaypoint } from '@/components/mappa/InserimentoWaypoint';
import { creaWaypoint } from '@/actions/obiettivi';

export default async function Waypoint({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const { ev, gestore, modificabile } = await contestoEvento(codice);
  if (!gestore || !modificabile) notFound();
  const [evento, tipi, obiettivi] = await Promise.all([
    prisma.evento.findUniqueOrThrow({ where: { id: ev.id }, select: { lat: true, lon: true } }),
    // solo i tipi senza arbitro e senza finestra: way point, ricognizione…
    prisma.tipoObiettivo.findMany({ where: { versioneId: ev.versioneTipologiaId, richiedeArbitro: false, richiedeFinestra: false }, orderBy: { codice: 'asc' } }),
    prisma.obiettivo.findMany({ where: { eventoId: ev.id }, select: { codice: true, lat: true, lon: true } }),
  ]);
  if (tipi.length === 0) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/eventi/${ev.codice}/obiettivi`} className="link text-sm">← Obiettivi</Link>
      <section className="carta space-y-3">
        <h2 className="text-lg font-semibold">Waypoint in serie</h2>
        <FormAzione azione={creaWaypoint} nascosti={{ eventoId: ev.id }} dati>
          <div className="max-w-xs">
            <label className="etichetta">Tipo</label>
            <select name="tipo" className="campo">
              {tipi.map((t) => <option key={t.codice} value={t.codice}>{t.codice} · {t.nome}</option>)}
            </select>
          </div>
          <InserimentoWaypoint
            esistenti={obiettivi.filter((o) => o.lat != null && o.lon != null) as { codice: string; lat: number; lon: number }[]}
            campo={evento.lat != null && evento.lon != null ? { lat: evento.lat, lon: evento.lon } : null}
            prefisso="WP"
          />
        </FormAzione>
      </section>
    </div>
  );
}
