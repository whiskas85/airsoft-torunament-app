'use client';

import { useActionState } from 'react';
import { accedi, type StatoAccesso } from '@/actions/auth';

export default function Accedi() {
  const [stato, azione, inCorso] = useActionState<StatoAccesso, FormData>(accedi, {});
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-1 text-2xl font-bold">TOURNAMENT<span className="text-accento">APP</span></h1>
      <p className="mb-6 text-sm text-tenue">Arbitri, punteggi e luci verdi. Anche senza rete.</p>
      <form action={azione} className="carta space-y-4">
        <div>
          <label className="etichetta" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="username" required className="campo" />
        </div>
        <div>
          <label className="etichetta" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="campo" />
        </div>
        {stato.errore && <p className="text-sm text-errore">{stato.errore}</p>}
        <button className="bottone w-full" disabled={inCorso}>{inCorso ? 'Accesso…' : 'Accedi'}</button>
      </form>
    </main>
  );
}
