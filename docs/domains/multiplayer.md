# Domínio: multiplayer (Jogar com amigos)

Decisões: ADR [0015](../adr/0015-orvalis-independente.md) (backend próprio, repositório separado),
[0016](../adr/0016-multiplayer-coop.md) (co-op, servidor autoritativo), [0020](../adr/0020-salas-fixas-salvas.md) (salas
fixas salvas), [0021](../adr/0021-bichos-da-sala.md) (bichos da sala). Plano e pendências: `NEXT_STEPS.md`, Fase M.

## Quem é dono do quê
- **Este repositório** guarda o cliente **e** o código compartilhado com o servidor: `src/net/`, `src/world/` (inclui
  `world/actions.ts`) e `game/entities.ts` com tudo o que ela importa. Esse código **não pode usar DOM nem arte**.
- **Servidor** (repositório `maiam/orvalis-servidor`, app Node.js na Hostinger em `orvalis-servidor.pensamentos.online`):
  WebSocket → `Room`. Recebe uma cópia do pacote gerado por `npm run build:net` (`dist-net/orvalis-net.cjs`, copiado
  para `vendor/` com `npm run sync-net`). Grava `sala-<n>.json` em `DATA_DIR` e responde `GET /salas`.
- Mudou uma mensagem de forma incompatível → suba `PROTOCOL_VERSION` (hoje **18**) e o servidor junto; servidor novo e
  cliente antigo (e o inverso) recebem `error: version`.

## Módulos (`src/net/`)
| Arquivo | Papel |
|---|---|
| `protocol.ts` | `ClientMessage`/`ServerMessage`, `PROTOCOL_VERSION`, `ROOMS` (Sala 1, seed fixa), `MAX_PLAYERS` (10), `APPEARANCE_BODIES`, validação (`parseClientMessage`, `parseState`, `parseBag`…) |
| `room.ts` | `Room`: sala pura e autoritativa — `join/leave/handle/tick/snapshot/restore`; roda `World` + `Entities` |
| `session.ts` | `NetSession`: lado do cliente (meu id, outros jogadores, `welcome`, fila de ações) |
| `socket.ts` | WebSocket do navegador, `SERVER_URL`, `onlineAvailable` (lista `ONLINE_HOSTS` espelha as origens do servidor), `fetchRoomCounts` |
| `loopback.ts` | `LoopbackServer`: servidor em memória para testes (mesma `Room`) |
| `b64.ts` | base64 compartilhado com o salvamento local |
| `index.ts` | ponto de entrada do pacote do servidor |

No jogo: `game/remotePlayers.ts` (desenha os outros com nome, personagem e ferramenta/golpe), `game/creatureMirror.ts`
(espelha animais e monstros da sala), `main.ts` (`goOnline`, tempo limite de conexão de 10 s com uma nova tentativa).

## Fluxo
1. Menu ☰ → **Sala 1** → `hello` (versão, nome, sala, aparência). Nome repetido, sala cheia ou versão diferente → `error`.
2. `welcome`: mundo da sala como está (chunks editados + crescimento), hora, bolsa guardada **para aquele nome**, itens no
   chão e baús.
3. Em jogo: `state` (posição, direção, ferramenta, golpes, sentado) ~10×/s; `action` (quebrar, colocar, arar, plantar,
   porta…) só vale quando a sala devolve `applied` (senão `rejected` e o aparelho desfaz); `take` (pegar item: quem pedir
   primeiro leva), `chest`, `bag` (a cada 5 s e ao sair), `strike`, `feed`.
4. A sala manda `mobs` (bichos a até 22 células de cada jogador, ~10×/s), `hits`, `bite`, `fed`, `drops`, `taken`,
   `grow`, `time` (a cada 30 s), `joined`/`left`.

## Regras importantes
- **Mapa:** ação que muda o mapa só vale quando o servidor confirma (`applied`). O terreno não editado é função da seed,
  então só as edições trafegam.
- **Hora e crescimento** são da sala (`Room.time`, `Room.tick`); o aparelho na sala não cresce plantas sozinho
  (`World.tick(..., grow = false)`).
- **Itens no chão e baús** são da sala (`ActionContext.sharedLoot`): quem quebra não cria o item; só entra na bolsa o que
  a sala confirmar. Dois mexendo no mesmo baú ao mesmo tempo: vale o último (sem trava).
- **Bichos:** a sala roda as mesmas `Entities` (jogadores como `avatars`); o aparelho só espelha. Moradores seguem locais.
  Monstros não são salvos (renascem pela seed); animais são salvos desde a v0.73.0 (`RoomSnapshot` v3).
- **Salvamento:** na sala nada vai para o salvamento local; bolsa, posição, mundo e animais ficam no servidor
  (`RoomSnapshot`, versão `ROOM_SNAPSHOT_VERSION` = 4; aceita v1–v4; v4 traz `holes`, as idades dos buracos).
- **Lista de personagens** (`APPEARANCE_BODIES`) é única para rede e jogo; personagem novo = acrescentar lá, a arte e o
  `SPECS` (e subir o protocolo, pois um servidor antigo trocaria por Heroína).

## Testes
`net.test.ts`, `online.test.ts`, `shared.test.ts`, `sharedLoot.test.ts`, `fixedRoom.test.ts`, `creatures.test.ts`
(todos usam `LoopbackServer`, sem rede).

## Pendências
Medir CPU e banda na Hostinger com gente de verdade; comprimir o `welcome` quando o mundo editado crescer; mais salas
(`ROOMS`); moradores compartilhados; descarregar chunks do servidor; chat e grupos nas cidades (Fase M, item 4).
