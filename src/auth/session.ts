/**
 * Conta do jogador (v0.93.128 — **só a casca**): a barra da landing page já tem **Entrar** e **Cadastrar** e este módulo é o ponto onde o login vai se encaixar.
 * Hoje ninguém entra (`user()` é sempre null) e as ações respondem "em breve". Quando existir o serviço de contas (backend do Orvalis, repositório separado — ADR 0015:
 * nunca o maiamapps), só este arquivo muda: `signIn`/`signUp` falam com o servidor, guardam a sessão e `user()` devolve a pessoa; a landing e o jogo já leem daqui.
 * Contrato previsto (ver `docs/NEXT_STEPS.md`): `POST /conta/entrar`, `POST /conta/cadastrar`, `POST /conta/sair`, `GET /conta/eu` (cookie de sessão), mais o vínculo do
 * salvamento e da bolsa da sala ao `id` da conta em vez do nome.
 */
export interface AuthUser {
  id: string;
  name: string;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface SignUpData extends Credentials {
  name: string;
}

/** Resultado de uma ação de conta: `coming-soon` enquanto o serviço não existe. */
export type AuthResult = { ok: true; user: AuthUser } | { ok: false; reason: 'coming-soon' | 'invalid' | 'network' };

export interface AuthService {
  /** Quem está logado agora (null = visitante). */
  user(): AuthUser | null;
  signIn(c: Credentials): Promise<AuthResult>;
  signUp(d: SignUpData): Promise<AuthResult>;
  signOut(): Promise<void>;
  /** Avisa quando entra/sai alguém (a barra da landing se atualiza). Devolve como cancelar. */
  onChange(fn: (user: AuthUser | null) => void): () => void;
}

const listeners = new Set<(user: AuthUser | null) => void>();

/** Serviço provisório: visitante sempre. Trocar a implementação aqui quando o backend de contas existir. */
export const auth: AuthService = {
  user: () => null,
  signIn: async () => ({ ok: false, reason: 'coming-soon' }),
  signUp: async () => ({ ok: false, reason: 'coming-soon' }),
  signOut: async () => { for (const fn of listeners) fn(null); },
  onChange: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
};
