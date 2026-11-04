import type { Transport } from './loopback';
import type { ServerMessage } from './protocol';

/** Endereço do servidor do Orvalis (ADR 0015): por configuração, para trocar de domínio sem mexer no código. */
export const SERVER_URL: string = import.meta.env.VITE_SERVER_URL ?? 'wss://orvalis-servidor.pensamentos.online/ws';

/**
 * Conexão real com o servidor (só no navegador; o pacote do servidor não inclui este arquivo). Mensagens que chegam
 * antes da conexão abrir são guardadas e enviadas ao abrir.
 */
export class SocketTransport implements Transport {
  onMessage: ((m: ServerMessage) => void) | null = null;
  onClose: (() => void) | null = null;
  private readonly ws: WebSocket;
  private readonly queue: string[] = [];

  constructor(url: string = SERVER_URL) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => { for (const t of this.queue.splice(0)) this.ws.send(t); };
    this.ws.onmessage = (e) => {
      try {
        this.onMessage?.(JSON.parse(String(e.data)) as ServerMessage);
      } catch { /* mensagem que não é JSON: ignora */ }
    };
    this.ws.onclose = () => this.onClose?.();
  }

  send(text: string): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(text);
    else if (this.ws.readyState === WebSocket.CONNECTING) this.queue.push(text);
  }

  close(): void {
    this.ws.close();
  }
}
