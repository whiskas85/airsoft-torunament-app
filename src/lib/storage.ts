import 'server-only';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';

const cartella = () => path.resolve(process.env.UPLOAD_DIR || './uploads');

/**
 * Salva un file con il suo SHA-256 come nome: lo stesso file caricato due volte occupa spazio una volta sola,
 * e il codice di controllo è quello che i telefoni verificano dopo il download.
 */
export async function salvaFile(dati: Buffer, estensione: string) {
  const hash = createHash('sha256').update(dati).digest('hex');
  const nome = `${hash}${estensione ? '.' + estensione.replace(/[^a-z0-9]/gi, '').toLowerCase() : ''}`;
  const dir = path.join(cartella(), hash.slice(0, 2));
  await mkdir(dir, { recursive: true });
  const percorso = path.join(dir, nome);
  try {
    await stat(percorso);
  } catch {
    await writeFile(percorso, dati);
  }
  return { hash, file: path.join(hash.slice(0, 2), nome).replaceAll('\\', '/') };
}

export async function leggiFile(file: string) {
  const assoluto = path.resolve(cartella(), file);
  // niente percorsi che escono dalla cartella dei caricamenti
  if (!assoluto.startsWith(cartella())) throw new Error('Percorso non valido');
  return readFile(assoluto);
}
