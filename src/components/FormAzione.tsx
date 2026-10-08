'use client';

import { useActionState, useEffect, useRef, useState, startTransition } from 'react';
import type { StatoForm } from '@/lib/form';

/**
 * Modulo collegato a un'azione server: mostra l'esito (errore o conferma) e blocca il pulsante durante l'invio.
 * I campi si passano come figli; i valori nascosti con `nascosti`.
 *
 * Non usa `<form action>` perché React 19 svuota il modulo dopo ogni invio, anche quando il server risponde
 * con un errore: chi compila perderebbe tutto. Qui i valori restano, e si svuota solo se `svuotaSeOk`.
 */
export function FormAzione({
  azione,
  children,
  etichetta = 'Salva',
  nascosti = {},
  classe = 'space-y-3',
  secondario = false,
  conferma,
  svuotaSeOk = false,
}: {
  azione: (prev: StatoForm, fd: FormData) => Promise<StatoForm>;
  children?: React.ReactNode;
  etichetta?: string;
  nascosti?: Record<string, string>;
  classe?: string;
  secondario?: boolean;
  /** se presente, chiede conferma prima di inviare */
  conferma?: string;
  /** moduli di creazione: dopo un salvataggio riuscito si ripresentano vuoti */
  svuotaSeOk?: boolean;
}) {
  const [stato, invia, inCorso] = useActionState<StatoForm, FormData>(azione, {});
  const modulo = useRef<HTMLFormElement>(null);
  // finché React non ha preso il controllo della pagina il pulsante resta spento: un invio "nativo"
  // finirebbe nell'indirizzo della pagina invece che all'azione
  const [pronto, setPronto] = useState(false);
  useEffect(() => setPronto(true), []);

  useEffect(() => {
    if (svuotaSeOk && stato.ok) modulo.current?.reset();
  }, [stato, svuotaSeOk]);

  return (
    <form
      ref={modulo}
      method="post"
      className={classe}
      onSubmit={(e) => {
        e.preventDefault();
        if (conferma && !window.confirm(conferma)) return;
        const fd = new FormData(e.currentTarget);
        startTransition(() => invia(fd));
      }}
    >
      {Object.entries(nascosti).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button className={secondario ? 'bottone-sec' : 'bottone'} disabled={!pronto || inCorso}>{inCorso ? 'Attendi…' : etichetta}</button>
        {stato.errore && <span className="text-sm text-errore">{stato.errore}</span>}
        {stato.ok && <span className="text-sm text-ok">{stato.ok}</span>}
      </div>
    </form>
  );
}
