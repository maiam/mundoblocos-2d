# ADR 0015 — Orvalis independente do maiamapps, com servidor próprio

**Status:** aceito (2026-11-04). Substitui, para o Orvalis, a regra "contas, nuvem e multiplayer pertencem ao core
`core.maiamapps.com.br`" (ADR 0011, PROJECT_CONTEXT) e o "voltar a `maiamapps.com.br`" (OPERATIONS).

## Contexto
O jogo nasceu como parte do ecossistema maiamapps (frontends + backend central `core.maiamapps.com.br`). Para o
multiplayer é preciso um servidor em tempo real. Decisão do dono do produto: **o maiamapps não deve ser acessível ao
Orvalis**. O Orvalis será um produto com **domínio próprio** no futuro; até lá usa **`pensamentos.online`** (Hostinger).

## Decisão
1. **Nenhuma dependência do maiamapps**: o Orvalis não chama `core.maiamapps.com.br`, não usa o domínio
   `maiamapps.com.br` e não compartilha contas/dados com ele.
2. **Backend próprio do Orvalis**, em **repositório separado** (este continua só frontend: site estático, sem
   servidor). Ele é a fonte de verdade de tudo que é compartilhado: salas/mundos multijogador, sincronização em
   tempo real e, depois, contas e salvamento na nuvem.
3. **Endereços** (provisórios, até o domínio próprio): jogo em `orvalis.pensamentos.online` (já no ar); servidor num
   **subdomínio próprio** de `pensamentos.online` (criado: `orvalis-servidor.pensamentos.online`), como app separado do
   site — publicar o jogo não reinicia o servidor nem derruba quem está jogando. Endereços entram por configuração
   (`VITE_SERVER_URL`), nunca fixos no código, para a troca de domínio ser só configuração.
4. **Regras do mundo compartilhadas, não copiadas**: o servidor usa o mesmo código de `src/world/` (puro, sem DOM —
   ADR 0001) para validar ações; nenhuma regra de jogo é reescrita no servidor. Como compartilhar (pacote, submódulo)
   fica para a ADR do multiplayer.

## Consequências
- Docs e CLAUDE.md passam a apontar "backend do Orvalis" no lugar de "core". O salvamento local (ADR 0011) segue como
  está; nuvem e contas virão do backend do Orvalis.
- Hospedagem do servidor: WebSocket de entrada **validado** num app web Node.js da Hostinger (2026-11-04, servidor de
  eco do `maiam/orvalis-servidor`). O carregador da hospedagem faz `require` do arquivo de entrada: o servidor liga
  sempre em `server.js` (CommonJS). VPS fica como plano B se a hospedagem limitar conexões. Ver NEXT_STEPS, Fase M.
- Troca para o domínio próprio: novo apontamento na Hostinger + `VITE_SERVER_URL`; salvamentos locais continuam (as
  chaves `mundoblocos:save:…` não dependem do domínio, mas o navegador separa armazenamento por endereço — migrar
  exigirá exportar/importar ou a nuvem).
