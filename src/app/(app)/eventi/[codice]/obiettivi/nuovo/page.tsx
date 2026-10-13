import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { contestoEvento } from '@/lib/contesto';
import { contestoModuloObiettivo } from '@/lib/obiettivi';
import { FormAzione } from '@/components/FormAzione';
import { CampiObiettivo } from '@/components/CampiObiettivo';
import { creaObiettivo } from '@/actions/obiettivi';

export default async function NuovoObiettivo({ params }: { params: Promise<{ codice: string }> }) {
  const { codice } = await params;
  const { ev, gestore, modificabile, parametri } = await contestoEvento(codice);
  if (!gestore || !modificabile) notFound();
  const evento = await prisma.evento.findUniqueOrThrow({ where: { id: ev.id }, select: { id: true, versioneTipologiaId: true, lat: true, lon: true, parcheggi: true } });
  const ctx = await contestoModuloObiettivo(evento);
  // primo codice OBJn libero
  const usati = new Set(ctx.altri.map((o) => o.codice));
  let n = 1;
  while (usati.has(`OBJ${n}`)) n++;

  return (
    <div className="space-y-4">
      <Link href={`/eventi/${ev.codice}/obiettivi`} className="link text-sm">← Obiettivi</Link>
      <section className="carta">
        <h2 className="mb-3 text-lg font-semibold">Nuovo obiettivo</h2>
        <FormAzione azione={creaObiettivo} nascosti={{ eventoId: ev.id }} dati>
          <CampiObiettivo {...ctx} sequenza={parametri.obiettiviInSequenza} finestra={parametri.finestra} prossimoCodice={`OBJ${n}`} />
        </FormAzione>
      </section>
    </div>
  );
}
