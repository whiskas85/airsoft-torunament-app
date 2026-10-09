import Link from 'next/link';
import { prisma } from '@/lib/db';
import { richiediOrganizzatore } from '@/lib/permessi';
import { FormAzione } from '@/components/FormAzione';
import { CampiEvento } from '@/components/CampiEvento';
import { SceltaCampionato } from '@/components/SceltaCampionato';
import { creaEvento } from '@/actions/eventi';

export default async function NuovoEvento({ searchParams }: { searchParams: Promise<{ campionato?: string }> }) {
  const { campionato } = await searchParams;
  const o = await richiediOrganizzatore();
  const mieiCoord = o.coordinamenti ? { id: { in: o.coordinamenti } } : {};

  const [versioni, coordinamenti, campionati] = await Promise.all([
    prisma.versioneTipologia.findMany({
      where: { stato: 'PUBBLICATA', tipologia: { enteId: o.enteId, archiviata: false } },
      include: { tipologia: true },
      orderBy: [{ tipologia: { codice: 'asc' } }, { numero: 'desc' }],
    }),
    prisma.coordinamento.findMany({ where: { enteId: o.enteId, ...mieiCoord }, orderBy: { nome: 'asc' } }),
    prisma.campionato.findMany({
      where: { enteId: o.enteId, ...(o.coordinamenti ? { coordinamenti: { some: { coordinamentoId: { in: o.coordinamenti } } } } : {}) },
      include: { eventi: { include: { evento: { select: { nome: true, inizio: true } } } } },
      orderBy: [{ stagione: 'desc' }, { nome: 'asc' }],
    }),
  ]);
  // una sola versione per tipologia: la più recente pubblicata
  const ultime = versioni.filter((v, i) => versioni.findIndex((x) => x.tipologiaId === v.tipologiaId) === i);

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <Link href="/eventi" className="link text-sm">← Eventi</Link>
      <h1 className="text-xl font-bold">Nuovo evento</h1>
      <p className="text-sm text-tenue">
        L’evento eredita dalla tipologia regolamento, schede, tipi di obiettivo, parametri e punteggi. Nasce in bozza: lo vedi solo tu
        finché non lo pubblichi. Compila e premi <b>Salva</b> in alto.
      </p>
      <section className="carta">
        <FormAzione azione={creaEvento} dati>
          <SceltaCampionato
            tipologie={ultime.map((v) => ({ versioneId: v.id, tipologiaId: v.tipologiaId, etichetta: `${v.tipologia.codice} · ${v.tipologia.nome}` }))}
            campionati={campionati.map((c) => ({
              id: c.id, nome: c.nome, stagione: c.stagione, tipologiaId: c.tipologiaId,
              tappe: c.eventi.map((x) => ({ nome: x.evento.nome, inizio: x.evento.inizio.toISOString() })),
            }))}
            campionatoIniziale={campionato}
          />
          <CampiEvento />
          <div>
            <span className="etichetta">Aperto ai coordinamenti</span>
            <div className="flex flex-wrap gap-3 text-sm">
              {coordinamenti.map((c) => <label key={c.id} className="flex items-center gap-1.5"><input type="checkbox" name="coordinamenti" value={c.id} defaultChecked className="h-4 w-4" /> {c.nome}</label>)}
            </div>
          </div>
        </FormAzione>
      </section>
    </main>
  );
}
