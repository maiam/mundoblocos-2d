# Auditoria das regras de mundo (ADR 0116)

**Regra (dono do produto, 27/11/2026):** antes de implementar ou mudar uma regra de mundo, consultar a **Minecraft Wiki** (https://minecraft.wiki), apresentar o **Orvalis e o Titã atuais**, formular a **proposta** (manter, adaptar ou retirar, e por quê) e **aguardar a aprovação**. Vale também para as regras **já implementadas**: o que não passou por esse ciclo está **pendente de auditoria**, mesmo funcionando.

Ciclo de cada regra: **1.** Minecraft Wiki (funcionamento, fontes, parâmetros) → **2.** estado atual no código (comportamento e valores) → **3.** proposta (manter / adaptar / retirar) → **4.** aprovação → só então a alteração.

Estados: **pendente** (nunca auditada) · **proposta enviada** (aguardando resposta) · **aprovada** (decidida; a alteração, se houver, ainda não feita) · **implementada** (código e docs alinhados). A ordem das auditorias é a que o dono do produto escolher; uma regra por vez.

| # | Área | Regra | Onde está no código | Estado |
|---|---|---|---|---|
| 1 | Geração | Seed e fontes de aleatoriedade por finalidade (`PURPOSE`, `derive`) | `titan/orvalis/generator.ts`, `titan/generator.ts`, `world/random.ts` | pendente |
| 2 | Geração | Relevo, mar e rios (nível do mar Y = 64, baías, rios cavados) | `titan/orvalis/generator.ts`, `titan/generator.ts` | pendente |
| 3 | Geração | Biomas e superfície/subsolo (Campos, Bosque de Sakura, praia, pedra em encostas) | `titan/orvalis/generator.ts`, `titan/biomes.ts` | pendente |
| 4 | Geração | Árvores e vegetação (grade de sorteio, copas) | `titan/orvalis/generator.ts` | pendente |
| 5 | Geração | Chegada e renascimento (clareira, `arrival`) | `titan/orvalis/generator.ts`, `titan/session.ts` | pendente |
| 6 | Geração | Veios e minérios do Titã (`ORE_RULES`) e fontes garantidas | `titan/ores.ts`, `titan/generator.ts` | pendente |
| 7 | Geração | Região finita (128 × 128, parede invisível) e versão do gerador | `titan/generator.ts` (`regionFor`), `titan/terrain.ts` | pendente |
| 8 | Chunks e custo | Chunks 16 × 16, seções 16³, distância de desenho (`RANGE` 64) e de simulação (56 m) | `titan/volume.ts`, `titan/sections.ts`, `render/titanRenderer.ts` | pendente |
| 9 | Luz | Luz de bloco (lanterna 15, braseiro 13), propagação e bloqueio | `titan/light.ts`, `titan/voxel.ts` | pendente |
| 10 | Tempo | Ciclo de dia e noite (20 min), céu e relógio de jogo | `titan/sky.ts` | implementada (ADR 0118, v0.185.0) |
| 11 | Tempo | Random ticks e passo de simulação (cultivo, braseiro, respawn) | `titan/crops.ts`, `titan/session.ts` | pendente |
| 12 | Física | Gravidade, pulo, corrida, velocidade e dano de queda | `titan/physics.ts`, `titan/vitals.ts` | pendente |
| 13 | Física | Colisão por caixa, degrau automático (0,6 m), salto automático, escada | `titan/physics.ts`, `titan/voxel.ts` | pendente |
| 14 | Física | Água: flutuar, sair da água, mergulho, balde (sem fluxo) | `titan/physics.ts`, `titan/underwater.ts`, `titan/actions.ts` | pendente |
| 15 | Blocos e ações | Colocar bloco: alcance, apoio, colisão com o jogador, orientação | `titan/actions.ts`, `titan/aim.ts`, `titan/slabs.ts` | pendente |
| 16 | Blocos e ações | Quebra progressiva: tempo por bloco, ferramenta certa, mão nua | `titan/breaking.ts`, `titan/gesture.ts` | implementada (ADR 0117, v0.184.0) |
| 17 | Blocos e ações | Durabilidade das ferramentas e custo por ação | `titan/wear.ts`, `titan/items.ts` | pendente |
| 18 | Blocos e ações | Drops de bloco e coleta (itens soltos: gravidade, tempo de coleta, validade) | `titan/drops.ts`, `titan/actions.ts` (`spillBlock`) | pendente |
| 19 | Blocos e ações | Formas especiais: laje, degrau, mureta, porta, cama, baú, escada, esteira | `titan/voxel.ts`, `titan/slabs.ts`, `titan/actions.ts` | pendente |
| 20 | Fabricação | Receitas, bancada 3 × 3 e estações | `titan/recipes.ts`, `titan/inventory.ts` | pendente |
| 21 | Fabricação | Braseiro: fundição, combustível e tempo | `titan/furnace.ts` | pendente |
| 22 | Cultivo | Junco, Noz de Duna e horta: crescimento, fertilidade, umidade, colheita | `titan/crops.ts`, `titan/soil.ts`, `titan/nuts.ts` | pendente |
| 23 | Sobrevivência | Vida, fome, saturação, ar, regeneração e inanição | `titan/vitals.ts` | pendente |
| 24 | Sobrevivência | Morte, itens da morte, renascer, cama e sono | `titan/actions.ts` (`dieAndRespawn`, `useBed`), `titan/sleep.ts` | pendente |
| 25 | Combate e fauna | Dano, alcance, intervalo, espólio e volta dos animais (Farejador) | `titan/combat.ts`, `titan/creature.ts` | pendente |
| 26 | Combate e fauna | Onde nascem os animais e quantos (`creatureSpecs`) | `titan/generator.ts`, `titan/biomes.ts` | pendente |
| 27 | Itens | Pilhas (64), hotbar 9 + bolsa 27, mover e dividir | `titan/inventory.ts`, `titan/items.ts` | pendente |
| 28 | Interface de jogo | Gesto (toque curto coloca, segurar quebra), mira, alcance, vista isométrica | `titan/gesture.ts`, `titan/aim.ts`, `titan/iso.ts` | pendente |
| 29 | Multiplayer | Salas cooperativas: autoridade do servidor, limites, ação confirmada (`applied`) | `net/titan/` | pendente |
| 30 | Salvamento | Persistência do mundo editado, do inventário e do estado (chunks, `header`) | `titan/save.ts`, `titan/session.ts` | pendente |
| 31 | Tempo | Clima: chuva e tempestade (hoje inexistente) | — `titan/weather.ts`, `titan/sky.ts`, `net/titan/room.ts` | implementada (ADR 0118, v0.185.0) |

## Registro das auditorias
_(cada auditoria entra aqui com a data, a decisão e a ADR ou item do CHANGELOG que a implementou.)_

- **#16 Quebra progressiva** — 27/11/2026: Wiki (fórmula dureza × 1,5 s ÷ velocidade) → proposta aprovada → implementada na v0.184.0 ([ADR 0117](adr/0117-quebra-por-dureza-do-bloco-minecraft-wiki.md)). Pendente: afinar as durezas provisórias dos blocos próprios do Titã e a velocidade do cobre.
- **#10 Ciclo de dia e noite e #31 Clima** — 27/11/2026: Wiki ("Daylight cycle", "Weather") → proposta aprovada → implementadas na v0.185.0 ([ADR 0118](adr/0118-ciclo-de-dia-e-noite-lua-e-clima-minecraft-wiki.md)). Pendente: trovão/raios e neve (fora do combinado), oclusão da chuva sob telhado, hidratação da enxada com chuva.
