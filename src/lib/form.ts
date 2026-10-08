import { ErroreRegola } from './permessi';

/** Esito di un'azione da modulo: un messaggio di errore o di conferma. */
export type StatoForm = { errore?: string; ok?: string };

export const testo = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
export const testoOpz = (fd: FormData, k: string) => testo(fd, k) || null;
export function intero(fd: FormData, k: string): number | null {
  const v = testo(fd, k);
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
}
export function decimale(fd: FormData, k: string): number | null {
  const v = testo(fd, k).replace(',', '.');
  if (v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
/** <input type="datetime-local"> è senza fuso: lo leggiamo come ora italiana. */
export function dataOra(fd: FormData, k: string): Date | null {
  const v = testo(fd, k);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
export const tutti = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);

/** Esegue un'azione trasformando gli errori di regola in messaggi per l'utente. */
export async function esegui(fn: () => Promise<StatoForm | void>): Promise<StatoForm> {
  try {
    return (await fn()) ?? { ok: 'Salvato.' };
  } catch (e) {
    if (e instanceof ErroreRegola) return { errore: e.message };
    // redirect() e notFound() di Next lanciano eccezioni speciali: vanno lasciate passare
    if (e && typeof e === 'object' && 'digest' in e) throw e;
    console.error(e);
    return { errore: 'Errore imprevisto: riprova.' };
  }
}
