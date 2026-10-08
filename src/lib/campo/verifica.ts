/**
 * Verifica della firma di un'operazione con la chiave pubblica del dispositivo.
 * Usa Web Crypto, presente sia nel browser sia in Node: lo stesso codice verifica sul telefono (offline,
 * con le chiavi scaricate nel pacchetto) e sul server.
 */
import { ALGORITMO, FIRMA, base64url, testoDaFirmare, type Operazione } from './operazione';

const chiaviImportate = new Map<string, Promise<CryptoKey>>();

function importa(jwk: string): Promise<CryptoKey> {
  let k = chiaviImportate.get(jwk);
  if (!k) {
    k = globalThis.crypto.subtle.importKey('jwk', JSON.parse(jwk) as JsonWebKey, ALGORITMO, false, ['verify']);
    chiaviImportate.set(jwk, k);
  }
  return k;
}

export async function firmaValida(op: Operazione, chiavePubblicaJwk: string): Promise<boolean> {
  try {
    const chiave = await importa(chiavePubblicaJwk);
    const dati = new TextEncoder().encode(testoDaFirmare(op));
    return await globalThis.crypto.subtle.verify(FIRMA, chiave, base64url.a(op.firma), dati);
  } catch {
    return false;
  }
}
