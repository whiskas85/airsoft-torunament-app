import { createHash } from 'node:crypto';

/** JSON con chiavi ordinate: lo stesso contenuto dà sempre la stessa stringa, e quindi lo stesso codice di controllo. */
export function canonico(v: unknown): string {
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (Array.isArray(v)) return '[' + v.map(canonico).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => JSON.stringify(k) + ':' + canonico((v as Record<string, unknown>)[k])).join(',') + '}';
  }
  return JSON.stringify(v ?? null);
}

export const hashCanonico = (v: unknown) => createHash('sha256').update(canonico(v)).digest('hex');
