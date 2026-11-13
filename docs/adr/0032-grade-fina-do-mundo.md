# ADR 0032 — Grade fina do Mundo: células menores, mundo do mesmo tamanho

- **Status:** **proposta (13/11/2026)** — direção e padrão-alvo (Stardew Valley) confirmados pelo dono do produto; falta aprovar as perguntas abertas (seção 6); F1 (protótipo em dev) liberada
- **Data:** 2026-11-13 (v0.93.50)
- **Relaciona:** ADR 0028 (escala do mundo — esta ADR a **substitui** para o Mundo se aprovada), 0027 (paredes), 0031 (render 3D do Mundo),
  0011 (save), 0016/0021 (protocolo e sala), 0012/0014 (cidade e interiores), `docs/domains/world.md`.

## 1. Problema (palavras do dono do produto, 13/11/2026)
Com a vista nova (K = 1) o personagem tem o tamanho certo, mas **a célula e os objetos ficaram grandes perto dele** (terra arada, trigo e cenoura "gigantes"). O dono do produto **gosta do mundo no tamanho de hoje** e quer **células e objetos proporcionais ao personagem**, "mesmo que dê mais trabalho refazendo artes e tudo mais".
Experimento `?celulas=28` (v0.93.50): células e objetos ficaram bons, **mas o mundo inteiro também encolheu** (cidade, árvores, casas, rios) — **não** é o que se quer.

## 2. Decisão proposta
- **A célula do mapa passa a ter metade do lado** (`SUBDIV = 2`: 1 célula atual = 2 × 2 células novas, 4 blocos). O personagem mantém os pixels; **o que é "mundo" mantém os pixels de hoje** (cidade, casas, árvores, rios, lagos, dungeon); **o que é "item de célula"** (terra arada, plantações, cercas, cubos de construção, baús, móveis, paredes) **encolhe** junto com a célula.
- Não é grade só de seleção: a grade nova é a do `World` (fonte de verdade). Uma grade só de seleção deixaria o bloco arado com 96 px.
- **Padrão-alvo: Stardew Valley** (pedido do dono do produto, 13/11): uma grade só, sem subdivisões; personagem de **1 × 2 tiles**; terra arada, planta e cerca = 1 tile; porta 1 × 2; parede de interior 2–3 tiles; prédios em vários tiles; árvore com **tronco 1 × 1 e desenho alto**; movimento e colisão livres em pixels; a grade só define o que se constrói/planta. (Números do Stardew de memória, não conferidos.)

### 2.1 O que "exatamente Stardew" quer dizer aqui
- **Adotamos:** proporção personagem/tile, tamanhos em tiles de cada categoria de objeto, tronco 1 × 1 com desenho alto, porta 1 × 2, parede 2–3 tiles, uma grade só (sem camada fina separada), movimento livre em pixels (já é assim).
- **Conta do personagem:** hoje ele tem ≈ 1,2 célula atual = **2,4 células novas** (`SUBDIV = 2`), um pouco acima dos 2,0 do Stardew. Para ficar em 2,0 exatos o personagem teria de ficar ~17% menor na tela (ele foi aprovado no tamanho atual) — **decidir olhando o protótipo (pergunta 5)**. Células visíveis na vertical: 28 com `SUBDIV = 2`; o Stardew mostra ~17–20 porque o personagem ocupa mais da tela; chegar lá com o mesmo número de tiles exigiria um personagem maior na tela (não pedido).
- **Árvores e prédios:** o Stardew tem árvore de ~3 tiles (1,5× o personagem). Aqui o dono do produto quer **o mundo no tamanho de hoje** (árvore ≈ 3× o personagem); mantemos os pixels e comparamos no protótipo.
- **Não adotado agora (é outra decisão, de controle, não de escala):** ação sempre no tile à frente e com alcance de 1 tile. Hoje a ação usa cursor/botão dentro de `REACH` (4,5 células) e o toque no celular; esse esquema continua, com o alcance convertido em células novas (× `SUBDIV`). Pergunta 6.

## 3. O que muda, por camada (tamanho medido no código em 13/11/2026)
| Camada | Hoje | Com `SUBDIV = 2` |
|---|---|---|
| `config.ts` | `TILE = 32`, `CHUNK_SIZE = 16` | célula em px mundo = `32 / SUBDIV`; `CHUNK_SIZE` 32 (cada chunk cobre a mesma área em px; decidir, pergunta 2); constantes derivadas (`STEP_HEIGHT`, `MAX_STACK`, `CUBE_FRONT`) revisadas |
| Gerador (`generator.ts`, função pura da seed) | ruído em `x / 70`, `x / 420`… | ruído avaliado em `x / SUBDIV`: **mesmas formas** de continentes, rios e biomas, só com mais resolução (bordas mais suaves). Itens por célula (árvores, flores, pedras) por hash precisam de nova regra: **uma âncora por área antiga**, para a densidade e o desenho não mudarem |
| `town.ts` (649 linhas), `dungeon.ts` (596), `interiors.ts` (205) | desenhados em células | mapas lógicos **ampliados 2 × 2** (mesmo tamanho em px); portas passam a 1 × 2; conferir `town.test.ts`/`dungeon.test.ts`/`interiors.test.ts` |
| `World` e regras (pisar/colocar/quebrar/plantar) | 1 id por célula | mesma regra, 4× mais células; passo do personagem = 1 nível novo (≈ joelho) |
| Jogabilidade em células (`player.ts` `speed 4.2`, `actionController.ts` `REACH 4.5`, raios de lobos/goblins, coleta, nascimento, namoro, alcance de NPC) | em células | **× `SUBDIV`** por uma constante (o personagem anda/age a mesma distância em px) |
| Render (`worldThreeRenderer`, `ChunkFloor/Blocks/Sprites`, 2D de reserva, câmera) | 14 células na vertical; fator dos atores 1,2/2,2 | 28 células (`SANCTUARY_CELLS_TALL × SUBDIV`); `actorScaleFor` já existe (v0.93.50); sprites declaram o tamanho em células novas (tabela de objetos, seção 4) |
| Save (`game/save.ts`) | `SAVE_VERSION = 15` | **16**, migração: cada célula editada vira 2 × 2 (blocos, plantações, caídos, removidos, baús); formato por chunk mudaria de tamanho |
| Protocolo (`net/`, `PROTOCOL_VERSION = 20`) e servidor (`orvalis-servidor`) | coordenadas de ação em células | coordenadas passam a células novas → **`PROTOCOL_VERSION` 21**, `build:net` + `sync-net` e deploy do servidor **juntos** |
| Desempenho | ~14 × 25 células visíveis | **~4× mais células** a desenhar e simular; medir (`?fps=1`, `perf:cpu:3d`, `leak:3d`) por fase; no celular ~13 px por célula em 360 px de altura (conferir legibilidade) |

## 4. Tabela de objetos (primeira versão, a confirmar com capturas por fatia)
- **Encolhem com a célula** (mesmo tamanho em células novas = metade em px): terra arada, plantações, flores, grama alta, cercas, baú, caldeirão, fogueira, cadeira, bancos, cubos e paredes de construção, itens caídos.
- **Mantêm os pixels de hoje** (dobram em células novas): personagem, NPCs, animais, lobos, goblins, aranhas; árvores (tronco **1 × 1**, desenho alto — só o render muda); casas, torres e prédios da cidade (pegada × 2); portas (1 × 2).
- **A decidir** (pergunta 3): altura da parede — hoje ≈ 1,2 célula (≈ 115 px, a altura do personagem) = 2,4 células novas; a conta do dono do produto era 2 níveis finos (~96 px).

## 5. Plano por fases (cada uma com PR, testes e medição; nenhuma muda o jogo no ar antes da F7)
- **F0 — esta ADR** + tabela de objetos revisada.
- **F1 — ✅ feita na v0.93.51 — protótipo atrás de `?grade=2` (dev):** `SUBDIV` nas constantes, gerador em `x / SUBDIV`, câmera 28, jogabilidade × `SUBDIV`, mundo aberto sem cidade/dungeon/interiores. Objetivo: ver o mundo "do mesmo tamanho com células menores" e medir o custo. Padrão e saves intocados.
- **F2 — objetos:** tamanhos em células por categoria (árvore 1 × 1 com desenho alto; plantas/cercas/móveis menores); rever arte que não aguente a redução.
- **F3 — cidade** (`buildTown` ampliado, portas 1 × 2, arte ampliada). **F4 — interiores e dungeon.** **F5 — paredes** (altura decidida na pergunta 3; atlas novos ou nível duplo).
- **F6 — save e protocolo:** `SAVE_VERSION` 16 com migração, `PROTOCOL_VERSION` 21, servidor (`build:net` + `sync-net`), sala.
- **F7 — virada:** `SUBDIV = 2` como padrão, 2D de reserva ajustado (ou removido no M7), Artifact, CURRENT_STATE/CONVENTIONS/CLAUDE.md.

## 6. Perguntas abertas (ao dono do produto)
1. **Mundos salvos:** migrar (cada célula editada vira 2 × 2; formas do terreno iguais, bordas e posição de árvores com pequenas diferenças) **ou** aceitar mundo novo para quem já tem save?
2. **Tamanho do chunk em células:** 32 (mesma área em px; recomendado) ou 16 (chunk menor, mais chunks).
3. **Altura da parede:** 2 níveis finos (~96 px) ou manter ≈ 115 px (2,4 células)?
4. **Celular:** se 28 células na vertical ficar pequeno demais no celular, aceitar menos células visíveis só nele (mundo maior na tela) ou manter igual em todo aparelho?
5. **Altura do personagem:** manter ≈ 2,4 células novas (mesmos pixels de hoje) ou reduzir para 2,0 (padrão Stardew exato, ~17% menor)?
6. **Controle de ação:** manter cursor/botão com alcance (convertido) ou adotar a ação no tile à frente (Stardew)?

## 7. Alternativas descartadas
- **Só `?celulas=N` (zoom out):** encolhe o mundo também (recusado pelo dono do produto).
- **Re-autoria do conteúdo em células maiores sem mudar a grade:** mesmo resultado visual do zoom out, com a cidade e as árvores a redesenhar maiores — mais trabalho de arte e não dá células menores.
- **Grade só de seleção / camada fina só para decoração:** o bloco de terra continua grande; duas fontes de verdade.
- **Encolher só objetos altos por fator próprio:** deixa chão e terra grandes; um fator por objeto é difícil de manter.

## 8. Riscos
Mudar o gerador e o save é o ponto mais sensível (testes de determinismo/spawn, `town.test.ts`); 4× mais células pesa no celular e no servidor (a sala simula `Entities` em células); coordenadas do protocolo mudam de sentido; arte reduzida pela metade precisa ser conferida (pixel art de 48 px).
