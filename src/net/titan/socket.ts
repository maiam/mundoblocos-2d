import { SERVER_URL } from '../socket';
import type { TitanTransport } from './loopback';
import type { TitanServerMessage } from './protocol';

/** Conexão real com o servidor para as salas do Titã (só no navegador; o pacote do servidor não inclui este arquivo). Mensagens antes da conexão abrir ficam na fila. */
export class TitanSocket implements TitanTransport {
  onMessage: ((m: TitanServerMessage) => void) | null = null;
  onClose: (() => void) | null = null;
  private readonly ws: WebSocket;
  private readonly queue: string[] = [];

  constructor(url: string = SERVER_URL) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => { for (const t of this.queue.splice(0)) this.ws.send(t); };
    this.ws.onmessage = (e) => { try { this.onMessage?.(JSON.parse(String(e.data)) as TitanServerMessage); } catch { /* não é JSON: ignora */ } };
    this.ws.onclose = () => this.onClose?.();
  }

  send(text: string): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(text);
    else if (this.ws.readyState === WebSocket.CONNECTING) this.queue.push(text);
  }

  close(): void { this.ws.close(); }
}
