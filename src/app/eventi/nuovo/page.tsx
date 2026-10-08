import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { Intestazione } from '@/components/Intestazione';
import { FormAzione } from '@/components/FormAzione';
import { CampiEvento } from '@/components/CampiEvento';
import { creaEvento } from '@/actions/eventi';

export default async function NuovoEvento() {
  const u = await richiediUtente();
  const enti = u.ruoli.filter((r) => r.ruolo === 'AMMINISTRATORE').map((r) => r.enteId);
  if (enti.length === 0) notFound();

  const [versioni, coordinamenti, campionati] = await Promise.all([
    prisma.versioneTipologia.findMany({ where: { stato: 'PUBBLICATA', tipologia: { enteId: { in: enti } } }, include: { tipologia: { include: { ente: true } } }, orderBy: { numero: 'desc' } }),
    prisma.coordinamento.findMany({ where: { enteId: { in: enti } }, orderBy: { nome: 'asc' } }),
    prisma.campionato.findMany({ where: { enteId: { in: enti } }, include: { tipologia: true }, orderBy: { nome: 'asc' } }),
  ]);
  // una sola versione per tipologia: la più recente pubblicata
  const ultime = versioni.filter((v, i) => versioni.findIndex((x) => x.tipologiaId === v.tipologiaId) === i);

  return (
    <>
      <Intestazione utente={u} />
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Link href="/" className="link text-sm">← Home</Link>
        <h1 className="text-xl font-bold">Nuovo evento</h1>
        <p className="text-sm text-tenue">L’evento eredita dalla tipologia regolamento, template, tipi di obiettivo, parametri e regole di punteggio. Nasce in bozza: lo vedi solo tu finché non lo pubblichi.</p>
        <section className="carta">
          <FormAzione azione={creaEvento} etichetta="Crea l’evento">
            <div>
              <label className="etichetta">Tipologia di gara</label>
              <select name="versioneTipologiaId" required className="campo">
                {ultime.map((v) => <option key={v.id} value={v.id}>{v.tipologia.codice} · {v.tipologia.nome} (versione {v.numero}) · {v.tipologia.ente.sigla}</option>)}
              </select>
            </div>
            <CampiEvento />
            <div>
              <span className="etichetta">Aperto ai coordinamenti</span>
              <div className="flex flex-wrap gap-3 text-sm">
                {coordinamenti.map((c) => <label key={c.id} className="flex items-center gap-1.5"><input type="checkbox" name="coordinamenti" value={c.id} defaultChecked className="h-4 w-4" /> {c.nome}</label>)}
              </div>
            </div>
            <div>
              <span className="etichetta">Vale per i campionati (facoltativo: senza, è una gara «normale»)</span>
              <div className="space-y-2">
                {campionati.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-1.5"><input type="checkbox" name="campionati" value={c.id} className="h-4 w-4" /> {c.nome} · {c.stagione} ({c.tipologia.codice})</label>
                    <input name={`tappa_${c.id}`} type="number" min={1} placeholder="tappa n°" className="campo w-28 py-1.5" />
                  </div>
                ))}
              </div>
            </div>
          </FormAzione>
        </section>
      </main>
    </>
  );
}
