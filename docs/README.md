# Documentação — índice

Documentação viva de **Orvalis** (antes MundoBlocos 2D). Agentes de IA: comece por [`../CLAUDE.md`](../CLAUDE.md).

Para planejar mecânicas, consulte o [Guia de regras de mundo aberto](GUIA_REGRAS_MUNDO_ABERTO.md).

## Ordem de leitura
| # | Documento | Para quê | Atualizar quando |
|---|---|---|---|
| 1 | [PROJECT_CONTEXT](PROJECT_CONTEXT.md) | O que é, objetivos, independência (ADR 0015) | Muda o propósito ou o escopo |
| 2 | [CURRENT_STATE](CURRENT_STATE.md) | O que funciona hoje e limitações | **Toda entrega** |
| 3 | [ARCHITECTURE](ARCHITECTURE.md) | Módulos do motor voxel, dependências | Arquivo/módulo novo ou fluxo alterado |
| 4 | [MAPS](MAPS.md) | "Onde mexer para…" | Junto com ARCHITECTURE/domínios |
| 5 | [CONVENTIONS](CONVENTIONS.md) | Regras de código, arte e organização | Padrão novo ou armadilha descoberta |
| 6 | [NEXT_STEPS](NEXT_STEPS.md) | Prioridades e pendências | **Toda entrega** |
| 7 | [OPERATIONS](OPERATIONS.md) | Comandos, pipeline de assets, Artifact, testes | Comando/script/processo novo |
| 8 | [DECISIONS](DECISIONS.md) + [adr/](adr/) | Decisões registradas | Decisão de arquitetura ou de produto |
| 9 | [CHANGELOG](CHANGELOG.md) | Histórico por versão | **Toda entrega** |

## Domínios (`domains/`)
| Domínio | Fonte de verdade | Documento |
|---|---|---|
| Titã e Orvalis 3D: motor voxel solo, geração, save, malha, receitas, itens (ADR 0039, 0105) | `src/titan/`, `render/titanRenderer.ts` | [titan.md](domains/titan.md) |
| Mundos: escolha do mundo, limites | `titan/worldId.ts` | [worlds.md](domains/worlds.md) |

> Os domínios do **Orvalis 2D/2.5D** (mundo, cultivo 2D, jogador, NPCs, cidade, vila, dungeon, multiplayer 2.5D, salvamento, render 2.5D) foram removidos do código na v0.183.0 (ADR 0115) e ficam em [archive/2d/](archive/2d/) como histórico.

## Guias de produção

- [Auditoria das regras de mundo](AUDITORIA_REGRAS.md) — **regra do dono do produto (ADR 0116):** Minecraft Wiki → estado atual → proposta → aprovação, antes de mudar qualquer regra; lista e estado de cada regra.

- [Guia de itens e texturas](GUIA_ITENS_TEXTURAS.md) — catálogo de candidatos para Orvalis e Titã, prioridades e arte por tipo de peça.

## ADRs
Índice completo com a decisão de cada um em [DECISIONS.md](DECISIONS.md) (arquivos em [adr/](adr/)): 0001 geração pura e
chunks · 0002 texturas procedurais (parcialmente substituída) · 0003 vista 3/4 · 0004 entidades `Walker` · 0005 itens e
inventário · 0006 materiais da prancha · 0007 assets em WebP · 0008 perfis de mundo · 0009 dungeon sobreposta · 0010 arte
por mundo · 0011 salvamento local · 0012 cidade fixa · 0013 imagens em arquivos separados · 0014 interiores · 0015 Orvalis
independente · 0016 multiplayer co-op · 0017 personagem modular (removido)  · 0018 ferramentas por material · 0019 covil isolado e
andares · 0020 salas fixas salvas · 0021 bichos da sala · 0022 escala visual e cena de escala · 0025 NPCs nomeados e caixa de conversa · 0026 render 2.5D em WebGL · 0027 paredes de nível único · 0028 escala (relações Core Keeper) · 0029 iluminação 2.5D · 0030 orientação vertical · 0023 Padrão de Materiais V2 (em validação). · 0031 plano de migração do Mundo para Three.js (aceita)

## Histórico
O **Orvalis 2D/2.5D e o Santuário** (removidos na v0.183.0, ADR 0115) estão documentados em [archive/2d/](archive/2d/) (estado, arquitetura, mapas, operações, convenções, plano antigo, domínios, Materiais V2) e no CHANGELOG/ADRs. O diário técnico por versão até a v0.80.0 está em [archive/estado-por-versao.md](archive/estado-por-versao.md). Os demais documentos descrevem **apenas o estado atual**.

## Mapa de pastas do repositório
| Pasta | Conteúdo |
|---|---|
| `src/` | jogo: `titan/` (motor voxel e mundos Orvalis 3D e Titã), `render/` (Three.js, arte em `render/art/titan.ts`), `net/titan/` (salas do Titã), `world/` (só `noise.ts` e `random.ts`), `assets/` (WebP/JSON gerados) |
| `assets-src/` | arte original do voxel (`titan/`, `orvalis-voxel/`, `materiais/`, ícone); fonte dos scripts |
| `scripts/` | pipeline de arte do voxel (Python) e builds do artifact e do pacote de rede (Node) |
| `docs/` | esta documentação; `adr/` decisões, `domains/` por assunto, `archive/` histórico (`archive/2d/` = o 2.5D removido), `assets/` imagens de apoio |
| `public/`, `.github/` | manifesto PWA e ícones, CI (Verificação) |
