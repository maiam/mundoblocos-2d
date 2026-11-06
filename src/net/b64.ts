/**
 * Bytes ↔ base64 (sem dependências; funciona no navegador e no Node do servidor). Usado no salvamento local
 * (`game/save.ts`) e no mundo das salas (chunks no `welcome` e no arquivo do servidor).
 */
export function toB64(a: Uint8Array): string {
  let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
}

export function fromB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
