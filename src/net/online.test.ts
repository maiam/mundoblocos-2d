import { describe, expect, it } from 'vitest';
import { onlineAvailable } from './socket';

describe('Jogar com amigos: onde funciona', () => {
  it('site oficial e desenvolvimento local, sim; Artifact e prévias da Hostinger, não', () => {
    expect(onlineAvailable('orvalis.pensamentos.online', false)).toBe(true);
    expect(onlineAvailable('localhost', false)).toBe(true);
    expect(onlineAvailable('darkviolet-lapwing-653239.hostingersite.com', false)).toBe(false);
    expect(onlineAvailable('abc123.claudeusercontent.com', false)).toBe(false);
    // Servidor próprio configurado no build (VITE_SERVER_URL): quem configurou sabe de onde conecta.
    expect(onlineAvailable('qualquer.exemplo', true)).toBe(true);
  });
});
