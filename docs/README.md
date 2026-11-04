# Documentação — índice

Documentação viva de **Orvalis** (antes MundoBlocos 2D). Agentes de IA: comece por [`../CLAUDE.md`](../CLAUDE.md).

## Ordem de leitura
| # | Documento | Para quê | Atualizar quando |
|---|---|---|---|
| 1 | [PROJECT_CONTEXT](PROJECT_CONTEXT.md) | O que é, objetivos, independência (ADR 0015) | Muda o propósito ou o escopo |
| 2 | [CURRENT_STATE](CURRENT_STATE.md) | O que funciona hoje e limitações | **Toda entrega** |
| 3 | [ARCHITECTURE](ARCHITECTURE.md) | Módulos, fluxo do frame, dependências, desempenho | Arquivo/módulo novo ou fluxo alterado |
| 4 | [MAPS](MAPS.md) | Diagramas: módulos, frame, regras, ciclos, assets, "onde mexer" | Junto com ARCHITECTURE/domínios |
| 5 | [CONVENTIONS](CONVENTIONS.md) | Regras de código, arte e organização | Padrão novo ou armadilha descoberta |
| 6 | [NEXT_STEPS](NEXT_STEPS.md) | Prioridades e pendências | **Toda entrega** |
| 7 | [OPERATIONS](OPERATIONS.md) | Comandos, pipeline de assets, Artifact, testes | Comando/script/processo novo |
| 8 | [DECISIONS](DECISIONS.md) + [adr/](adr/) | Decisões registradas | Decisão de arquitetura ou de produto |
| 9 | [CHANGELOG](CHANGELOG.md) | Histórico por versão | **Toda entrega** |

## Domínios (`domains/`)
| Domínio | Fonte de verdade | Documento |
|---|---|---|
| Mundo: blocos, geração, regras de pisar/colocar/quebrar | `src/world/` (`World`, `WorldGenerator`, `blocks.ts`) | [world.md](domains/world.md) |
| Cultivo, itens, ferramentas, inventário | `world/items.ts`, `World` (plantio), `game/inventory.ts` | [farming.md](domains/farming.md) |
| Jogador: movimento, câmera, entrada, botão de ação, tela | `game/player.ts`, `game/walker.ts`, `game/game.ts`, `game/actionController.ts` | [player.md](domains/player.md) |
| NPCs: ovelhas, reprodução | `game/sheep.ts`, `game/entities.ts` | [npc.md](domains/npc.md) |
| Mundos: perfis, Santuário Celestial, limites | `world/profiles.ts`, `World` | [worlds.md](domains/worlds.md) |
| Cidade do Despertar: início, muralha, ruas, construções | `world/town.ts`, `render/townArt.ts`, `World` | [town.md](domains/town.md) |
| Dungeon e monstros: área protegida, aranhas, chefe | `world/dungeon.ts`, `game/monster.ts`, `game/entities.ts` | [dungeon.md](domains/dungeon.md) |
| Salvamento e menu | `game/save.ts`, `game/menu.ts`, `main.ts` | [save.md](domains/save.md) |
| Render e arte | `src/render/`, `assets-src/`, `scripts/` | [render.md](domains/render.md) |

## ADRs
0001 geração pura e chunks · 0002 texturas procedurais (parcialmente substituída) · 0003 vista 3/4 ·
0004 entidades `Walker` · 0005 itens e inventário · 0006 materiais da prancha · 0007 assets em WebP · 0008 perfis de mundo.

## Histórico
Mudanças antigas (vista lateral, cavernas, biomas removidos) aparecem só no CHANGELOG e nas ADRs, como
registro. Os demais documentos descrevem **apenas o estado atual**.
