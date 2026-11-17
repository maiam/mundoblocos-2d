import { describe, expect, it } from 'vitest';
import { auth } from './session';

describe('conta do jogador (casca, v0.93.128)', () => {
  it('visitante por enquanto: ninguém logado e entrar/cadastrar respondem "em breve"', async () => {
    expect(auth.user()).toBeNull();
    expect(await auth.signIn({ email: 'a@b.c', password: 'x' })).toEqual({ ok: false, reason: 'coming-soon' });
    expect(await auth.signUp({ name: 'Ana', email: 'a@b.c', password: 'x' })).toEqual({ ok: false, reason: 'coming-soon' });
  });

  it('sair avisa quem ouve a mudança, e dá para parar de ouvir', async () => {
    const seen: Array<unknown> = [];
    const off = auth.onChange((u) => seen.push(u));
    await auth.signOut();
    off();
    await auth.signOut();
    expect(seen).toEqual([null]);
  });
});
