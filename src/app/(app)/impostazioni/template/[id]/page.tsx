import Link from 'next/link';
import { notFound } from 'next/navigation';
import { richiediUtente } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { AnteprimaTemplate } from '@/components/AnteprimaTemplate';
import type { DefinizioneTemplate } from '@/lib/template';

export default async function Template({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const u = await richiediUtente();
  const v = await prisma.versioneTemplate.findUnique({ where: { id }, include: { template: true } });
  if (!v || !u.ruoli.some((r) => r.ruolo === 'AMMINISTRATORE' && r.enteId === v.template.enteId)) notFound();

  return (
    <>
      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <Link href="/impostazioni/template" className="link text-sm">← Template</Link>
        <div>
          <div className="font-mono text-xs text-tenue">{v.template.codice} · versione {v.numero} · {v.stato.toLowerCase()}</div>
          <h1 className="text-xl font-bold">{v.template.nome}</h1>
          <p className="text-sm text-tenue">
            Anteprima generata dalla definizione salvata nel database. Intestazione (arbitro, squadra, finestra), firme e
            contestazioni le aggiunge l’app a ogni scheda.
          </p>
        </div>
        <div className="carta"><AnteprimaTemplate def={v.campi as DefinizioneTemplate} /></div>
        <details className="carta">
          <summary className="cursor-pointer text-sm font-semibold">Definizione (JSON) · codice di controllo {v.hash?.slice(0, 12)}…</summary>
          <pre className="mt-2 max-h-96 overflow-auto text-xs text-tenue">{JSON.stringify(v.campi, null, 2)}</pre>
        </details>
      </main>
    </>
  );
}
