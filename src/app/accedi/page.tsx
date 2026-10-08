import { accediProva } from '@/actions/auth';
import { ACCOUNT_PROVA, debugLoginAttivo } from '@/lib/prova';
import { ModuloAccesso } from './ModuloAccesso';

export const dynamic = 'force-dynamic';

export default function Accedi() {
  const debug = debugLoginAttivo();
  const gruppi = ['Organizzazione', 'Arbitri', 'Squadre'] as const;

  return (
    <main className={`mx-auto flex min-h-screen flex-col justify-center gap-6 px-4 py-8 ${debug ? 'max-w-4xl lg:flex-row lg:items-center' : 'max-w-sm'}`}>
      <div className={debug ? 'w-full lg:max-w-sm' : 'w-full'}>
        <h1 className="mb-1 text-2xl font-bold">TOURNAMENT<span className="text-accento">APP</span></h1>
        <p className="mb-6 text-sm text-tenue">Arbitri, punteggi e luci verdi. Anche senza rete.</p>
        <ModuloAccesso />
      </div>

      {debug && (
        <section className="w-full rounded-xl border border-dashed border-avviso p-4">
          <div className="mb-3 flex items-center gap-2">
            <span className="pill bg-avviso text-black">DEBUG</span>
            <span className="text-sm text-tenue">Accesso rapido con gli account di prova (DEBUG_LOGIN=1)</span>
          </div>
          <div className="space-y-4">
            {gruppi.map((g) => (
              <div key={g}>
                <div className="etichetta">{g}</div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {ACCOUNT_PROVA.filter((a) => a.gruppo === g).map((a) => (
                    <form key={a.email} action={accediProva}>
                      <input type="hidden" name="email" value={a.email} />
                      <button className="w-full rounded-lg bg-carta px-3 py-2.5 text-left transition hover:ring-1 hover:ring-accento">
                        <div className="text-sm font-semibold">{a.etichetta}</div>
                        <div className="text-xs text-tenue">{a.dettaglio}</div>
                      </button>
                    </form>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
