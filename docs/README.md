# Documentação — índice

Documentação viva de **Orvalis** (antes MundoBlocos 2D). Agentes de IA: comece por [`../CLAUDE.md`](../CLAUDE.md).

Para planejar mecânicas, consulte o [Guia de regras de mundo aberto](GUIA_REGRAS_MUNDO_ABERTO.md).

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
| Titã: mundo voxel solo, geração, save, malha (ADR 0039) | `src/titan/`, `render/titanRenderer.ts` | [titan.md](domains/titan.md) |
| Mundos: perfis, Santuário Celestial, limites | `world/profiles.ts`, `World` | [worlds.md](domains/worlds.md) |
| Cidade do Despertar: início, muralha, ruas, construções | `world/town.ts`, `render/townArt.ts`, `World` | [town.md](domains/town.md) |
| Vila Camponesa: área fixa ao sul da cidade (arte recebida; código a fazer) | `world/village.ts` (a criar), `assets-src/vila-camponesa/` | [village.md](domains/village.md) |
| Dungeon e monstros: área protegida, aranhas, chefe | `world/dungeon.ts`, `game/monster.ts`, `game/entities.ts` | [dungeon.md](domains/dungeon.md) |
| Multiplayer: salas, protocolo, servidor, bichos da sala | `src/net/`, `world/actions.ts`, `game/entities.ts` | [multiplayer.md](domains/multiplayer.md) |
| Salvamento e menu | `game/save.ts`, `game/menu.ts`, `main.ts` | [save.md](domains/save.md) |
| Render e arte | `src/render/`, `assets-src/`, `scripts/` | [render.md](domains/render.md) |

## Guias de produção

- [Guia de itens e texturas](GUIA_ITENS_TEXTURAS.md) — catálogo de candidatos para Orvalis e Titã, prioridades e arte por tipo de peça.

## ADRs
Índice completo com a decisão de cada um em [DECISIONS.md](DECISIONS.md) (arquivos em [adr/](adr/)): 0001 geração pura e
chunks · 0002 texturas procedurais (parcialmente substituída) · 0003 vista 3/4 · 0004 entidades `Walker` · 0005 itens e
inventário · 0006 materiais da prancha · 0007 assets em WebP · 0008 perfis de mundo · 0009 dungeon sobreposta · 0010 arte
por mundo · 0011 salvamento local · 0012 cidade fixa · 0013 imagens em arquivos separados · 0014 interiores · 0015 Orvalis
independente · 0016 multiplayer co-op · 0017 personagem modular (removido)  · 0018 ferramentas por material · 0019 covil isolado e
andares · 0020 salas fixas salvas · 0021 bichos da sala · 0022 escala visual e cena de escala · 0025 NPCs nomeados e caixa de conversa · 0026 render 2.5D em WebGL · 0027 paredes de nível único · 0028 escala (relações Core Keeper) · 0029 iluminação 2.5D · 0030 orientação vertical · 0023 Padrão de Materiais V2 (em validação). · 0031 plano de migração do Mundo para Three.js (aceita)

## Histórico
Mudanças antigas (vista lateral, cavernas, biomas removidos) aparecem só no CHANGELOG e nas ADRs, como
registro. Os demais documentos descrevem **apenas o estado atual**. O diário técnico por versão que o `CURRENT_STATE`
acumulou até a v0.80.0 está em [archive/estado-por-versao.md](archive/estado-por-versao.md) (arquivo, não atualizar).

## Mapa de pastas do repositório
| Pasta | Conteúdo |
|---|---|
| `src/` | jogo: `world/` (regras puras), `game/` (execução), `render/` (desenho, arte em `render/art/`), `net/` (multiplayer), `assets/` (WebP gerado) |
| `assets-src/` | arte original (folhas, pranchas, contratos de personagem e ferramentas); fonte dos scripts |
| `scripts/` | pipeline de arte (Python) e builds do artifact e do pacote de rede (Node) |
| `docs/` | esta documentação; `adr/` decisões, `domains/` por assunto, `archive/` histórico, `assets/` imagens de apoio |
| `bench/`, `public/`, `.github/` | benchmarks, manifesto PWA e ícones, CI (Verificação) |
