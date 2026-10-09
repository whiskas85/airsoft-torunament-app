'use client';

import { useActionState, useEffect, useId, useRef, useState, startTransition } from 'react';
import type { StatoForm } from '@/lib/form';
import { useSalvataggio } from './Salvataggio';

/**
 * Modulo collegato a un'azione server: mostra l'esito (errore o conferma) e blocca il pulsante durante l'invio.
 * I campi si passano come figli; i valori nascosti con `nascosti`.
 *
 * Due modi:
 * - **dati** (`dati`): niente pulsante proprio. Il modulo si registra presso il «Salva» dell'intestazione,
 *   che lo salva insieme agli altri moduli modificati della pagina (C1-06).
 * - **comando** (predefinito): un pulsante con un verbo («Pubblica», «Iscrivi», «Elimina»…), per le azioni
 *   che non sono un salvataggio.
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
  dati = false,
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
  /** modulo di dati: lo salva il pulsante dell'intestazione */
  dati?: boolean;
}) {
  if (dati) return <ModuloDati {...{ azione, children, nascosti, classe, svuotaSeOk }} />;
  return <ModuloComando {...{ azione, children, etichetta, nascosti, classe, secondario, conferma, svuotaSeOk }} />;
}

function ModuloComando({
  azione, children, etichetta, nascosti, classe, secondario, conferma, svuotaSeOk,
}: {
  azione: (prev: StatoForm, fd: FormData) => Promise<StatoForm>;
  children?: React.ReactNode; etichetta: string; nascosti: Record<string, string>; classe: string;
  secondario: boolean; conferma?: string; svuotaSeOk: boolean;
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

function ModuloDati({
  azione, children, nascosti, classe, svuotaSeOk,
}: {
  azione: (prev: StatoForm, fd: FormData) => Promise<StatoForm>;
  children?: React.ReactNode; nascosti: Record<string, string>; classe: string; svuotaSeOk: boolean;
}) {
  const id = useId();
  const ctx = useSalvataggio();
  const modulo = useRef<HTMLFormElement>(null);
  const [stato, setStato] = useState<StatoForm>({});
  const [sporco, setSporco] = useState(false);

  // la funzione di salvataggio cambia a ogni render (vede l'azione attuale): la si ri-registra
  useEffect(() => {
    if (!ctx) return;
    ctx.registra(id, async () => {
      const f = modulo.current;
      if (!f) return {};
      // i controlli del browser (campi obbligatori, minimi…) prima di disturbare il server
      if (!f.reportValidity()) return null;
      const r = (await azione({}, new FormData(f))) ?? {};
      setStato(r);
      if (!r.errore) {
        setSporco(false);
        ctx.segna(id, false);
        if (svuotaSeOk) f.reset();
      }
      return r;
    });
  });
  useEffect(() => () => ctx?.rimuovi(id), [ctx, id]);

  const modificato = () => {
    if (sporco) return;
    setSporco(true);
    setStato({});
    ctx?.segna(id, true);
  };

  return (
    <form
      ref={modulo}
      method="post"
      className={`${classe} ${sporco ? 'rounded-lg outline outline-1 outline-offset-4 outline-accento/40' : ''}`}
      onInput={modificato}
      onChange={modificato}
      onSubmit={(e) => {
        // Invio da tastiera: salva tutta la pagina, come il pulsante in alto
        e.preventDefault();
        void ctx?.salvaTutto();
      }}
    >
      {Object.entries(nascosti).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      {children}
      {/* la conferma la dà l'intestazione; qui solo l'errore, vicino ai campi da correggere */}
      {stato.errore && <p className="text-sm text-errore">{stato.errore}</p>}
    </form>
  );
}
