# ADR 0104 — Titã: salas do servidor, cooperativas de sobrevivência (v0.163.0, fatia A)

**Status:** Aceita (fatia A de três). Pedido: salas do servidor para o Titã como no mundo principal; escolha do dono: **cooperativa de sobrevivência** (vida, fome, ar e morte valem; sem modo criativo).

## Contexto
O Titã tem motor próprio (`TitanVolume` sobre `TitanGenerator`, sem `World`/`SUBDIV`), então a `Room` do mundo principal (ADR 0016) não serve. O servidor (`maiam/orvalis-servidor`) é outro repositório: este repositório entrega o código **compartilhado** (puro, sem DOM) e documenta o que o servidor precisa.

## Decisão (entregue na fatia A)
1. **Protocolo paralelo** (`src/net/titan/protocol.ts`, `TITAN_PROTOCOL_VERSION = 1`, `TITAN_ROOMS`: **Titã 1**, id 101, seed 20261122; ids acima dos do mundo principal). Cliente→servidor: `hello`, `state`, `act` (`place`/`break`/`use` com `seq`), `bag`. Servidor→cliente: `welcome` (cabeçalho no formato do save local + chunks editados + jogadores + o estado de quem entra), `joined`/`left`, `players` (~10×/s), `applied` (com a bolsa), `edits` (células mudadas, para todos), `drops`, `bag`, `time`, `error`. Validação estrita em `parseTitanClientMessage`.
2. **`TitanRoom` autoritativa e pura** (`src/net/titan/room.ts`): mesmo formato de uso da `Room` (`join/leave/handle/tick/snapshot/restore`). Roda **as mesmas regras de `titan/actions.ts`** do jogo solo (`placeFromSlot`, `breakOrCollect`, `useDoor`, `useBed`, `collectNearby`) — nenhuma regra duplicada.
3. **Visão por jogador** (`playerView`): `Object.create(sessão do mundo)` com corpo, bolsa, vida, seleção, ponto de retorno e receitas próprios; o mundo (volume, baús, braseiros, plantas, itens soltos, rebrotes, relógio) é compartilhado por herança, e os contadores que as ações incrementam (`time`, `days`, `dropsRev`, `metaRev`, `collectedRev`) escrevem direto no mundo. Assim as ações existentes funcionam sem mudança.
4. **Repasse de edições:** `TitanVolume.onSet` (gancho nulo fora da sala) junta as células mudadas por ações e pelo tick (braseiro que acende) e a sala as manda a todos em `edits`; mudança de itens soltos manda `drops`.
5. **Regras de sala:** ação só vale com alcance (8 m do olho à célula) e vem confirmada em `applied`; a bolsa fica no servidor, **por nome** (cópia do aparelho via `bag`; o servidor devolve a bolsa em cada `applied`/`bag`); o relógio, brotos (`tickCrops`, `tickRegrow`), braseiros e a gravidade dos itens soltos correm na sala; o aparelho não os simula.
6. **Persistência:** `snapshot()`/`restore()` (`TITAN_SNAPSHOT_VERSION = 1`): cabeçalho do mundo (mesmo `headerOf` do save local, restaurado por `resume`), chunks editados e jogadores por nome. `TitanLoopbackServer` (JSON, sem rede) para testes e dois aparelhos na mesma tela.

## Fora da fatia A (próximas)
- **B — cliente:** `TitanNetSession`, `?sala=`/menu ☰ com a lista de salas do Titã, jogadores remotos desenhados no renderer 3D, tela de espera e reconexão; `applied`/`rejected` desfazem a previsão local.
- **C — sobrevivência compartilhada:** vida/fome/ar/morte e queda **na sala** (hoje só no aparelho), Farejadores espelhados (`session.creatures` com `avatars`), baús e braseiros abertos por mais de um jogador (mensagens `chest`/`furnace`), sono e cama com a sala (hora é de todos), recolher por `take`.
- **Servidor** (`orvalis-servidor`): rotear `hello` com `room ≥ 101` para `TitanRoom`, `build:net` + `sync-net`, gravar `titan-sala-<id>.json` com `snapshot()`, tick ~10×/s, `GET /salas` listando as do Titã. **Não testado contra o servidor real** (só loopback).

## Consequências
- Sem mudança de gerador, de save local nem do protocolo do mundo principal. `resume` do `session.ts` passou a ser exportado (usado por `restore`).
- Riscos conhecidos: bolsa reorganizada no aparelho e ação simultânea no servidor (vale o último, como no mundo principal); fabricação/baús/braseiro ainda só locais (fatia C); o corpo vem do aparelho (sem anti-trapaça de movimento).
- Testes: `titanRoom.test.ts` (+9: entrar/sair/recusas, analisador, colocar e alcance, quebrar e recolher, porta, relógio/revisões compartilhados, snapshot/restore, dois aparelhos pelo loopback). 1.221 no total.
