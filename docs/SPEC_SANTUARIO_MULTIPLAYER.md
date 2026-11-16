# SPEC — Santuário Multiplayer (v1.0, 16/11/2026, dono do produto)

Resumo operacional da especificação que orienta o PR #239 (`feat/santuario-sala-multiplayer`). **Regra principal: nada pode mudar o comportamento, o inventário, a câmera ou a persistência da Sala 1.**

## Salas
| | Sala 1 | Sala 2 — Santuário |
|---|---|---|
| ID / seed | 1 / 20261106 | 2 / 20261115 |
| Tipo | `normal` (sobrevivência) | `sanctuary` (criativo) |
| Terreno e Cidade do Despertar | procedural completo | **os mesmos** (gerador e cidade iguais, seed própria) |
| Blocos | limitados, com coleta | infinitos (hotbar fixa com todos), sem material ao quebrar |
| Câmeras | padrão | 3 por jogador (Atual, Isométrica, Primeira pessoa), nunca sincronizadas |
| Persistência | independente | independente (snapshot só restaura sala + seed iguais) |

As regras ficam em **`ROOM_RULES`** (`net/protocol.ts`): `mode`, `infiniteBlocks`, `collectBlockDrops`, `allowCameraModes`, `protectTown`, `maxBuildLevels`; `roomRules(id)` (sala desconhecida = Sala 1). Cliente (`main.ts`) e servidor (`Room.rules`) leem a mesma tabela — nada de `room.id === 2`.

## Restrições
Não modificar a `main` antes da aprovação; não alterar a seed da Sala 1; sem regras criativas globais; sem compartilhar snapshots entre salas; protocolo versionado (hoje **29**); publicar cliente e servidor compatíveis (**servidor primeiro**); compilar não é concluir.

## Plano e estado (v0.93.123)
**Validação do dono do produto (16/11/2026): câmeras (Atual, Isométrica, Primeira pessoa), construção criativa, dois jogadores, persistência e Sala 1 sem regressão — "validado"; PR liberado para merge (servidor primeiro).** As marcações "pendente" abaixo são as de antes da validação.
**Fase 1 — build e testes:** `tsc`, `npm test` (650+), `npm run build`, `build:net` ✔ · Sala 2 registrada no servidor local (`GET /salas` lista as duas, `/saude` protocolo 29) ✔ · Cidade gerada nas duas salas (teste) ✔.
**Fase 2 — construção criativa:** regras centralizadas ✔ · quebrar não solta material no Santuário e solta na Sala 1 (teste de sala) ✔ · cidade protegida nas duas salas (teste) ✔ · **pendente:** validar visualmente blocos infinitos/hotbar e limites verticais (5 níveis só depois de verificar `maxStack`/`cubeLevels`/serialização; **não** mudar a altura global).
**Fase 3 — câmeras:** seletor e modos vêm do PR #238 (mesclado) ✔ · **pendente (precisa de navegador):** isométrica (projeção/raycast), primeira pessoa (mira, faces, sprite do jogador, alcance), chunks pela câmera ativa, iluminação, alternância contínua, celular/tablet.
**Fase 4 — multiplayer real:** construir/remover e snapshot de reinício cobertos em teste de `Room` (A coloca → B vê → B remove → A vê; sala renasce do snapshot; Sala 1 não vê a obra) ✔ · **pendente:** dois navegadores reais, reconexão, reinício do servidor, limite de jogadores.
**Fase 5 — regressão e publicação:** pendente (Sala 1 em PC e celular, desempenho/memória, publicar servidor e depois o jogo, verificar persistência).

## Implantação e reversão
1. Servidor (`orvalis-servidor`): vendor desta versão, deploy; conferir `GET /salas` (2 salas) e `/saude` (protocolo 29). 2. Jogo: merge e publicação. **Reversão:** voltar o jogo e o servidor à versão anterior (a Sala 1 não é tocada; os dados da Sala 2 ficam em arquivo próprio e podem ser apagados sem afetar a Sala 1).
