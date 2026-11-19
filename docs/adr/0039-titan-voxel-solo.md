# ADR 0039 — Titã: mundo voxel volumétrico solo, fora do motor de chão e pilhas

**Status:** aceito (dono do produto, 19/11/2026, briefing "Titã — Briefing para o programador"). Primeira entrega: costa jogável e persistente.

## Contexto
O dono do produto pediu o mundo **Titã** (`?mundo=titan`): primeira pessoa, terreno voxel com ocupação por `(x, y, z)`, domínio Y de −64 a 319, seleção por face, lago líquido deslocável e
save próprio. O motor atual (`World`/`Chunk`/`Game`) guarda **chão + pilha de níveis por célula** e depende de `SUBDIV` (ADR 0032) e de blocos de 1/4 (ADR 0033); o briefing pede para **não mudar a
grade global** do Mundo principal e do Santuário.

## Decisão
1. **Perfil `titan` entra só na resolução da URL** (`world/profiles.ts`: `WorldId` + `WORLD_PROFILES.titan`, campos do motor 2.5D desligados e nunca lidos). `main.ts` abre `src/titan/titanGame.ts` **no lugar
   do `Game`** (`titanWorld`), antes do pacote de arte do Mundo, sem `World`, `Entities`, `SaveStore`, sala/servidor ou `SUBDIV`. Principal e Santuário seguem pelo mesmo caminho de antes.
2. **A representação voxel mora em `src/titan/`** (sem DOM, sem `Math.random()`, testável em Node): `voxel.ts` (ids, Y, endereçamento), `generator.ts` (base pura da seed), `volume.ts` (base + edições; fonte
   de verdade de leitura/colisão/edição), `mesher.ts` (malha por seção), `physics.ts` (corpo, mira, posição segura), `save.ts` + `session.ts` (IndexedDB, retomada). O renderer é `render/titanRenderer.ts`
   (Three.js, só lê o volume) e a arte vem de `render/art/titan.ts` (ADR 0010).
3. **Gerador versionado** (`GENERATOR_VERSION = 1`): seeds derivadas por finalidade (`derive`), ruído de `world/noise.ts`, colunas memoizadas. Heightmap + campo do lago (`lakeField`) → colunas
   `{top, surface, sub}`; subsolo de rocha escura, veios de gelo em −32..−1, rocha-mãe em −64. **Chegada:** busca em ordem determinística (sorteios derivados, 600 tentativas, depois varredura fixa) de uma
   clareira de 6 × 6 seca perto da costa; nivelada em Y = 64 (anel de 2 blocos entre 63 e 65); pés em Y = 65, olhar para o lago. Duas **formações** (rocha escura, gelo) em terra seca e alcançável,
   reservadas para a coleta da entrega 2. Região de teste **4 × 4 chunks** (x/z em [−32, 32)), com parede invisível (colisão) e rocha-mãe indestrutível.
4. **Edições = deltas por chunk**: ausência = base; entrada = id gravado (0 = remoção explícita). Devolver a célula ao que a base diz **apaga** a entrada: a bacia recupera o líquido ao retirar o sólido que
   o deslocou, e a remoção de um bloco da praia fica gravada como ar. Uma versão nova do gerador nunca reinterpreta partida antiga (`generatorFor`; versão desconhecida → aviso, não abre).
5. **Save em IndexedDB** (`orvalis-titan`, stores `games` e `chunks`, `TITAN_SAVE_VERSION = 1`), separado do `localStorage` dos outros mundos: cabeçalho + jogador + chunks sujos na **mesma transação**
   (`flush`; "confirmado" só no `oncomplete`; falha preserva o último estado e tenta de novo). A partida mais recente vem do próprio banco (índice `savedAt`), sem ponteiro em `localStorage`. Sem `?seed=`:
   continua a última, ou sorteia na primeira visita; "Nova partida" (UI, confirmação por segundo toque) sorteia outra.
6. **Malha**: 1 `BufferGeometry` por seção 16³ para o opaco e outra para o líquido; cópia da seção com margem de 1 bloco (junção sem frestas); edição na borda refaz também as seções vizinhas e aparece no
   mesmo quadro. Atlas compartilhado (WebP sem perdas), pixels nítidos, luz de tarde fixa nos vértices, névoa âmbar de 70% do alcance, céu em degradê.

## Consequências
- Titã **não** compartilha `World`, `Entities`, HUD, inventário nem sala com o Orvalis; a segunda entrega (hotbar, mochila, fragmentos, lanterna) amplia `games` (campo `inventory`) sem migrar chunks.
- Multiplayer/servidor de Titã exigem integrar `src/titan/` ao protocolo do `orvalis-servidor` (fora desta entrega; `src/titan/` já é livre de DOM).
- Limitações aceitas nesta entrega: malha na thread principal (workers depois), sem greedy meshing, sem luz local/AO, sem ciclo de céu, só 4 × 4 chunks.
