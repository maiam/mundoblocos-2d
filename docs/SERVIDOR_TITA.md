# Integração das salas do Titã no servidor (`orvalis-servidor`)

Roteiro para quem for mexer no repositório `maiam/orvalis-servidor` (ADR 0104). **Estado em 22/11/2026:** o servidor no ar ainda roda o código anterior — `GET /salas` lista só a Sala 1 e o Santuário, e o `hello` do Titã recebe `{"t":"error","code":"room","message":"Sala não encontrada."}`. O jogo já cai para o modo solo com aviso e desativa o botão quando `/salas` não traz a sala 101.

## O que o pacote traz (`dist-net/orvalis-net.cjs`, gerado aqui por `npm run build:net` e copiado por `npm run sync-net`)
`TitanRoom`, `TITAN_ROOMS` (`[{ id: 101, name: 'Titã 1', seed: 20261122 }]`), `titanRoomById`, `parseTitanClientMessage`, `TITAN_PROTOCOL_VERSION` (hoje **2**), `TITAN_MAX_PLAYERS`, `TITAN_SNAPSHOT_VERSION`, tipos `TitanClientMessage`/`TitanServerMessage`/`TitanOutgoing`/`TitanRoomSnapshot`.

`TitanRoom` expõe o que o `src/app.js` do servidor lê das salas: `id`, `name`, `size` (jogadores), `dirty` (grava quando há mudança; `snapshot()` e `restore()` limpam), `tick`, `join`, `handle`, `leave`, `snapshot`, `restore`. `droppedOnRestore` não existe nela (o servidor trata como indefinido).

## O que o servidor precisa fazer
1. **Criar as salas:** para cada item de `TITAN_ROOMS`, `new TitanRoom(r.id, r.name, r.seed)` (o terceiro argumento opcional é o `rand`, padrão `Math.random`). Restaurar do arquivo `titan-sala-<id>.json` em `DATA_DIR` com `room.restore(JSON.parse(...))` antes de aceitar conexões (devolve `false` se a seed ou o gerador não batem: nesse caso comece a sala limpa e preserve o arquivo antigo).
2. **Rotear pelo `hello`:** o primeiro texto de cada conexão é um `hello`; leia só `room` e `t` (JSON). `room >= 100` (ou `titanRoomById(room)`) → fluxo do Titã; senão, o fluxo atual. Uma conexão fica numa sala só.
3. **Fluxo do Titã por conexão:**
   - `parseTitanClientMessage(texto)`; `null` → `{"t":"error","code":"bad","message":"Mensagem inválida."}`.
   - Primeiro `hello` → `room.join(m)` devolve `{ id, out }`; sem `id` (erro) mande o `out` e feche.
   - Depois → `room.handle(id, m)`; ao fechar a conexão → `room.leave(id)`.
   - Cada item de `out` tem `to`: `0` (só quem pediu, antes de entrar), um id, `'all'` ou `{ except: id }`. Entregue como `JSON.stringify(msg)` às conexões da sala (a `Room` do mundo principal usa a mesma convenção; o `TitanLoopbackServer` de `src/net/titan/loopback.ts` é a referência de roteamento).
4. **Tick:** `room.tick(dt)` ~10×/s (`TITAN_PLAYERS_EVERY` = 0,1 s) com `dt` real em segundos (limite sugerido 0,25), roteando o `out`. Sem jogadores a sala pode ficar parada, mas a hora do dia, os braseiros e as plantas só andam no tick: mantenha-o também sem ninguém **ou** aceite que o mundo congele vazio (decisão do dono).
5. **Persistência:** a cada ~30 s e ao encerrar, `room.snapshot()` → `titan-sala-<id>.json` (escrita atômica: arquivo temporário + rename). Quem está na sala entra no snapshot com o estado atual.
6. **`GET /salas`:** incluir `{ numero: 101, nome: 'Titã 1', jogadores: room.playerCount, maximo: TITAN_MAX_PLAYERS }` junto das salas do mundo principal (é o que faz o botão do ☰ mostrar a contagem e sair do estado "servidor sem suporte").
7. **Origem/CORS:** o `WebSocket` do Titã sai do mesmo site (`orvalis.pensamentos.online`); as regras de origem atuais valem.
8. **Versões:** `TITAN_PROTOCOL_VERSION` diferente no `hello` → `join` já responde `error: version`. Mudou o protocolo aqui → rode `build:net` + `sync-net` e republique o servidor junto com o jogo.

## Como conferir depois do deploy
- `curl https://orvalis-servidor.pensamentos.online/salas` traz a sala 101.
- Um `hello` `{ t: 'hello', v: 2, name: 'Teste', room: 101 }` pelo WebSocket recebe `welcome` (com `header.world === 'titan'`).
- No jogo: `?mundo=titan` → ☰ → **Jogar na sala: Titã 1 (0/10)**.
