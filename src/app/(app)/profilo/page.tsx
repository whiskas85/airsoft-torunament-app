import { prisma } from '@/lib/db';
import { richiediUtente } from '@/lib/auth';
import { FormAzione } from '@/components/FormAzione';
import { aggiornaProfilo } from '@/actions/profilo';

export default async function Profilo() {
  const u = await richiediUtente();
  const [tessere, squadre] = await Promise.all([
    prisma.tessera.findMany({ where: { personaId: u.personaId } }),
    prisma.membroSquadra.findMany({ where: { personaId: u.personaId, al: null }, include: { squadra: true } }),
  ]);
  const p = u.persona;

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">Il mio profilo</h1>
      <FormAzione azione={aggiornaProfilo} dati classe="space-y-4">
        <section className="carta space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="etichetta">Nome</label>
              <input name="nome" required defaultValue={p.nome} className="campo" autoComplete="given-name" />
            </div>
            <div>
              <label className="etichetta">Cognome</label>
              <input name="cognome" required defaultValue={p.cognome} className="campo" autoComplete="family-name" />
            </div>
            <div>
              <label className="etichetta">Email (serve per accedere)</label>
              <input name="email" type="email" required defaultValue={u.email} className="campo" autoComplete="email" />
            </div>
            <div>
              <label className="etichetta">Telefono</label>
              <input name="telefono" type="tel" defaultValue={p.telefono ?? ''} className="campo" autoComplete="tel" />
            </div>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-tenue">
            <span>Tessera: {tessere.map((t) => t.numero).join(', ') || 'nessuna'}</span>
            <span>Squadra: {squadre.map((s) => s.squadra.nome).join(', ') || 'nessuna'}</span>
          </div>
        </section>

        <section className="carta space-y-3">
          <h2 className="font-semibold">Cambia la password</h2>
          <p className="text-sm text-tenue">Lascia vuoto per tenere quella di adesso.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="etichetta">Password attuale</label>
              <input name="passwordAttuale" type="password" className="campo" autoComplete="current-password" />
            </div>
            <div>
              <label className="etichetta">Nuova password</label>
              <input name="nuovaPassword" type="password" minLength={8} className="campo" autoComplete="new-password" />
            </div>
            <div>
              <label className="etichetta">Ripeti la nuova</label>
              <input name="ripetiPassword" type="password" minLength={8} className="campo" autoComplete="new-password" />
            </div>
          </div>
        </section>
      </FormAzione>
    </main>
  );
}
