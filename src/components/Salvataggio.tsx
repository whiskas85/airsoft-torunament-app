'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { StatoForm } from '@/lib/form';

/**
 * Un solo «Salva», nell'intestazione, per tutta la pagina (C1-06).
 * Ogni modulo di dati si registra qui e dice se ha modifiche; il pulsante le salva tutte,
 * nell'ordine in cui i moduli compaiono. Se si esce con modifiche non salvate, l'app chiede conferma.
 */
type Voce = { sporco: boolean; salva: () => Promise<StatoForm | null> };
type Contesto = {
  registra: (id: string, salva: Voce['salva']) => void;
  rimuovi: (id: string) => void;
  segna: (id: string, sporco: boolean) => void;
  salvaTutto: () => Promise<void>;
};

const Ctx = createContext<Contesto | null>(null);

type Esito = { tipo: 'ok' | 'errore'; testo: string } | null;
const CtxStato = createContext<{ sporchi: number; inCorso: boolean; esito: Esito }>({ sporchi: 0, inCorso: false, esito: null });

const AVVISO_USCITA = 'Ci sono modifiche non salvate. Uscire senza salvare?';

export function ProviderSalvataggio({ children }: { children: React.ReactNode }) {
  const voci = useRef(new Map<string, Voce>());
  const [sporchi, setSporchi] = useState(0);
  const [inCorso, setInCorso] = useState(false);
  const [esito, setEsito] = useState<Esito>(null);

  const conta = () => setSporchi([...voci.current.values()].filter((v) => v.sporco).length);

  const registra = useCallback((id: string, salva: Voce['salva']) => {
    const v = voci.current.get(id);
    voci.current.set(id, { sporco: v?.sporco ?? false, salva });
  }, []);
  const rimuovi = useCallback((id: string) => { voci.current.delete(id); conta(); }, []);
  const segna = useCallback((id: string, sporco: boolean) => {
    const v = voci.current.get(id);
    if (!v || v.sporco === sporco) return;
    v.sporco = sporco;
    conta();
    if (sporco) setEsito(null);
  }, []);

  const salvaTutto = useCallback(async () => {
    const daSalvare = [...voci.current.values()].filter((v) => v.sporco);
    if (daSalvare.length === 0) return;
    setInCorso(true);
    setEsito(null);
    const errori: string[] = [];
    try {
      for (const v of daSalvare) {
        const r = await v.salva();
        if (r === null) { errori.push('Controlla i campi evidenziati.'); break; }
        if (r.errore) errori.push(r.errore);
      }
    } finally {
      setInCorso(false);
      conta();
    }
    setEsito(errori.length ? { tipo: 'errore', testo: errori[0] } : { tipo: 'ok', testo: 'Salvato' });
  }, []);

  // conferma prima di lasciare la pagina con modifiche non salvate
  useEffect(() => {
    if (!sporchi) return;
    const primaDiUscire = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    const clic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a');
      if (!a || a.target === '_blank' || e.defaultPrevented) return;
      if (!window.confirm(AVVISO_USCITA)) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', primaDiUscire);
    document.addEventListener('click', clic, true);
    return () => {
      window.removeEventListener('beforeunload', primaDiUscire);
      document.removeEventListener('click', clic, true);
    };
  }, [sporchi]);

  // Ctrl+S / Cmd+S salva, come in ogni programma
  useEffect(() => {
    const tasto = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void salvaTutto(); }
    };
    window.addEventListener('keydown', tasto);
    return () => window.removeEventListener('keydown', tasto);
  }, [salvaTutto]);

  // la conferma sparisce da sola dopo qualche secondo
  useEffect(() => {
    if (esito?.tipo !== 'ok') return;
    const t = setTimeout(() => setEsito(null), 3000);
    return () => clearTimeout(t);
  }, [esito]);

  // il contesto dei moduli non deve cambiare a ogni render, o i moduli si ri-registrerebbero perdendo lo stato
  const funzioni = useMemo(() => ({ registra, rimuovi, segna, salvaTutto }), [registra, rimuovi, segna, salvaTutto]);
  const stato = useMemo(() => ({ sporchi, inCorso, esito }), [sporchi, inCorso, esito]);
  return (
    <Ctx.Provider value={funzioni}>
      <CtxStato.Provider value={stato}>{children}</CtxStato.Provider>
    </Ctx.Provider>
  );
}

export const useSalvataggio = () => useContext(Ctx);

/** Il pulsante dell'intestazione: spento finché non c'è niente da salvare. */
export function PulsanteSalva() {
  const ctx = useContext(Ctx);
  const { sporchi, inCorso, esito } = useContext(CtxStato);
  return (
    <div className="flex items-center gap-2">
      {esito && (
        <span className={`hidden max-w-xs truncate text-sm sm:inline ${esito.tipo === 'ok' ? 'text-ok' : 'text-errore'}`} title={esito.testo}>
          {esito.tipo === 'ok' ? '✔ ' : ''}{esito.testo}
        </span>
      )}
      <button
        type="button"
        onClick={() => void ctx?.salvaTutto()}
        disabled={!sporchi || inCorso}
        className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 font-semibold transition ${
          sporchi ? 'bg-accento text-black' : esito?.tipo === 'errore' ? 'bg-errore text-black' : 'bg-bordo text-tenue'
        } disabled:cursor-default`}
        title={sporchi ? 'Salva le modifiche (Ctrl+S)' : 'Nessuna modifica da salvare'}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
          <path d="M5 3h11l3 3v15H5z" /><path d="M8 3v5h8V3M8 21v-7h8v7" />
        </svg>
        {inCorso ? 'Salvo…' : 'Salva'}
        {sporchi > 1 && !inCorso && <span className="rounded-full bg-black/20 px-1.5 text-xs">{sporchi}</span>}
      </button>
    </div>
  );
}
