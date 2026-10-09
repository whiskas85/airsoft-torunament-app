import Link from 'next/link';
import { prisma } from '@/lib/db';
import { richiediAmministratore } from '@/lib/permessi';
import { FormAzione } from '@/components/FormAzione';
import { nuovaTipologia } from '@/actions/tipologie';
import type { ParametriTipologia } from '@/lib/tipologie';

/** Elenco delle tipologie di gara dell'ente, con la creazione di una nuova (C1-04). */
export default async function Tipologie() {
  const { enteId } = await richiediAmministratore();
  const tipologie = await prisma.tipologiaGara.findMany({
    where: { enteId },
    orderBy: [{ archiviata: 'asc' }, { codice: 'asc' }],
    include: {
      versioni: { orderBy: { numero: 'desc' }, take: 1, include: { _count: { select: { tipiObiettivo: true } } } },
      _count: { select: { campionati: true } },
    },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div>
        <Link href="/impostazioni" className="link text-sm">← Impostazioni</Link>
        <h1 className="mt-1 text-xl font-bold">Tipologie di gara</h1>
        <p className="text-sm text-tenue">Ogni tipologia porta con sé parametri, tipi di obiettivo e regole di punteggio. Eventi e campionati partono da qui.</p>
      </div>

      <div className="space-y-2">
        {tipologie.map((t) => {
          const v = t.versioni[0];
          const p = v.parametri as ParametriTipologia;
          return (
            <Link key={t.id} href={`/impostazioni/tipologie/${t.id}`} className={`carta flex flex-wrap items-center gap-3 transition hover:ring-1 hover:ring-accento ${t.archiviata ? 'opacity-60' : ''}`}>
              <span className="pill bg-accento text-black">{t.codice}</span>
              <span className="font-semibold">{t.nome}</span>
              {t.archiviata && <span className="pill bg-bordo">archiviata</span>}
              <span className="ml-auto text-sm text-tenue">
                {p.operatori.min}–{p.operatori.max} operatori · {v._count.tipiObiettivo} tipi di obiettivo · {t._count.campionati} campionati
              </span>
            </Link>
          );
        })}
      </div>

      <section className="carta">
        <h2 className="mb-1 font-semibold">Nuova tipologia</h2>
        <p className="mb-3 text-sm text-tenue">Conviene partire da una tipologia simile: se ne copiano parametri, tipi di obiettivo, regole e schede.</p>
        <FormAzione azione={nuovaTipologia} etichetta="Crea" classe="grid items-end gap-3 sm:grid-cols-[7rem_1fr_1fr_auto]">
          <div>
            <label className="etichetta">Sigla</label>
            <input name="codice" required maxLength={8} className="campo font-mono uppercase" placeholder="SS" />
          </div>
          <div>
            <label className="etichetta">Nome</label>
            <input name="nome" required className="campo" placeholder="Sniper & Spotter" />
          </div>
          <div>
            <label className="etichetta">Parti da</label>
            <select name="daId" className="campo" defaultValue={tipologie[0]?.id ?? ''}>
              {tipologie.map((t) => <option key={t.id} value={t.id}>{t.codice} · {t.nome}</option>)}
              <option value="">Vuota</option>
            </select>
          </div>
        </FormAzione>
      </section>
    </main>
  );
}
