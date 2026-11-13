# ADR 0031 — Plano de migração do Mundo principal para Three.js (2.5D)

- **Status:** **aceita em 13/11/2026** (recomendações aprovadas pelo dono do produto; M1 entregue na v0.93.29)
- **Data:** 2026-11-13 (v0.93.28)
- **Relaciona:** ADR 0026 (render 2.5D em WebGL — esta ADR detalha as Fases 4–6 para o Mundo), 0027 (paredes; W5), 0028 (escala),
  0029 (iluminação), 0030 (orientação vertical), 0010/0013 (arte por mundo, assets), 0012 (cidade), 0014 (interiores), 0016/0021 (multiplayer).

## 1. Ponto de partida (medido no código, v0.93.28)
**Santuário (já em Three.js):** projeção oblíqua K = 1, paredes autotile com arte e porta (3 quadros), luz dinâmica atrás de `?luz=`,
a Deusa em billboard. Cobre só o que o Santuário usa: pelo contrato `SANCTUARY_THREE_OPTIONS` ficam **ignorados** os atores, itens caídos,
ovelha sob o cursor, dia/noite (`time`), flash de dano, dungeon (`inDungeon`, `entrance`, `dungeonArea`), interiores e fade.
10 chunks fixos, `worldSignature` global, sem chão com transições.

**Mundo (Canvas 2D):** `render/renderer.ts` (821 linhas) + `chunkRenderer.ts` (243, chão por chunk com Material V2 e transições) +
`textures.ts` (863) + `townArt.ts`, `blockArt.ts`, `particles.ts`, `damageNumbers.ts`, `daycycle.ts`, `minimap.ts`. Ordenação por linha
(profundidade), atores de ~dezenas de espécies (herói por ferramenta/golpe, NPCs, ovelhas, animais, goblins, monstros), árvores/cultura/cercas/portas
como sprites, prédios da cidade como imagens grandes, interiores como cômodos isolados desenhados à parte, dungeon com penumbra 2D, água com
fluxo e brilho, sombras de nuvens. Mundo **infinito** (chunks de 16 × 16, `MAX_STACK = 2`, `STEP_HEIGHT = 1` com degrau automático), online (sala).

**Escala:** o Mundo ainda usa a escala antiga (célula 32 px, frente de cubo `CUBE_FRONT` = 18/32). O Santuário já usa K = 1 (cubo 1,0, parede ≈ 1,2,
personagem ≈ 1,2). O Mundo "adota a escala na migração" (NEXT_STEPS).

## 2. Decisões propostas (a validar)
1. **Mesmo contrato, novo renderer.** O Mundo ganha `WorldThreeRenderer` que implementa `GameRenderer`; o `Game` não muda. Antes, extrair o
   **núcleo genérico** de `sanctuaryThreeRenderer.ts` (548 linhas) para `render/three/` (câmera oblíqua, materiais/atlas, malhas por chunk, luz,
   paredes, atores) e deixar Santuário e Mundo como configurações dele. Não crescer o arquivo do Santuário.
2. **Tudo por chunk.** Malha instanciada por chunk, reconstruída só quando `chunk.version` muda, com **orçamento de reconstrução por quadro**
   e corte pela câmera (a tela mostra ~3 × 2 chunks + margem; nunca o mundo todo). Substitui o `worldSignature` global.
3. **Chão = textura do `ChunkRenderer`** (ADR 0026): o Material V2 e as transições continuam sendo pintados em 2D e viram `CanvasTexture`
   por chunk. Sem shader de transição e **sem ler pixels de canvas**.
4. **Atores em billboards** com as folhas atuais (`SpriteSheet.request` continua baixando sob demanda) e sombra no chão; o z-buffer substitui a
   ordenação por linha. Escala K = 1 e `CHARACTER_SCALE_FACTOR` valem para **todas** as espécies (herói, NPCs, animais, goblins, monstros).
5. **Objetos altos** (árvores, cultura, cercas, postes, baú, tenda, fogueira): planos verticais ancorados na pegada, como as paredes; portas
   `OAK_DOOR` e portão ficam como estão (par de estados no id) até o W5.
6. **Cidade:** na paridade, os prédios (`townArt`) viram planos verticais sobre a pegada, **sem mudar o mapa nem o gerador**. A reconstrução das
   casas com paredes autotile é o **W5** (item pendente, abaixo) e só vem depois que o Mundo já renderiza em 3D.
7. **Interiores e dungeon:** interiores deixam de ser "cômodo desenhado à parte" e passam a cena do mesmo renderer (cômodo isolado em coordenadas
   fixas, como hoje, com paredes autotile e teto ocultável); a penumbra da dungeon vira **luz dinâmica + escuridão** (`SanctuaryLighting`), com
   modo reduzido para celular fraco.
8. **Física:** parede sólida e **sem degrau automático** (ADR 0026) muda a jogabilidade do Mundo. Entra **atrás de flag** no piloto, não na paridade.
   Como a sala (servidor) roda o mesmo `World`/`Walker`, a regra tem de ser a mesma nos dois lados.
9. **Servidor:** o render não muda servidor, mas física, paredes/porta e perfil do Mundo mudam. Todo marco que toca `world/`, `net/` ou ações
   exige `build:net` + `sync-net` e conferir `PROTOCOL_VERSION`; o servidor só entra em marcos com esse efeito.
10. **Flag e reserva:** `?render=3d` (dev) até a paridade; Canvas 2D fica até o piloto passar em celular, tablet e Safari, mais **uma versão**
    depois da virada (ADR 0026). Sem PixiJS: uma biblioteca só.

## 3. Fases
Cada fase fecha com `tsc`, testes, captura 2D × 3D, FPS medido, docs e PR de versão. Estimativa em PRs, não em dias.

| Fase | Entrega | Critério de aceite |
|---|---|---|
| **M0 — pré-requisitos** | FPS/memória medidos **em aparelho real** (celular médio, iPad, Safari) com o Santuário; validação visual pendente da Fase 1; tetos de JS/arte (< 3 MB inicial) | números registrados em `CURRENT_STATE`; teto de luzes definido |
| **M1 — núcleo genérico** | extrair `render/three/` do renderer do Santuário; contrato `GameRenderer` ganha o que faltar; Santuário continua idêntico (captura antes × depois) | testes verdes; Santuário sem diferença visual |
| **M2 — Mundo estático** | `WorldThreeRenderer`: chão por chunk, cubos/terreno, água estática, árvores e objetos altos, `?render=3d`; câmera oblíqua do Mundo; **escala K = 1** | seed 42 sem faltas visuais; reconstrução ≤ orçamento; pick correto |
| **M3 — atores e efeitos** | herói, NPCs, animais, goblins/monstros, itens caídos, dano, partículas, HUD em camada 2D, minimapa; luz e ciclo dia/noite (`time`) | paridade de `RenderOptions` (todos os campos `honored` ou justificados); sala multiplayer ok |
| **M4 — cidade, interiores, dungeon** | prédios como planos, interiores como cena, dungeon com luz dinâmica, fade de porta, farol/seta da entrada | `town.test.ts` e interiores intactos; entrar/sair de casa e do covil sem salto |
| **M5 — piloto** | checklist de paridade (capturas 2D × 3D por cenário), celular/tablet/vertical (ADR 0030), WebGL no iframe do Artifact, perda de contexto, **física sem degrau atrás de flag** | 30 FPS em celular médio; sem regressão de toque/zoom |
| **M6 — virada** | 3D padrão no Mundo; 2D de reserva por **uma** versão | uma versão estável em uso |
| **M7 — limpeza** | remover `renderer.ts`/`chunkRenderer` 2D duplicados (o `ChunkRenderer` fica, pois pinta o chão), flags, docs | `docs/domains/render.md` só com o caminho 3D |

## 4. W5 — paredes no Mundo (pendente; depois do M4)
Levar paredes e porta de parede ao perfil do Mundo e reconstruir casas e interiores com elas. **Não faz parte da paridade** (M2–M4): primeiro o
Mundo renderiza em 3D com o que já tem; depois W5.
- **Perfil e economia:** `WALL_BLOCKS`/`WALL_DOOR_BLOCKS` no perfil principal com receitas no Construtor (`world/items.ts`), custo de material e coleta
  (o Mundo é de coleta; o Santuário é infinito). Itens/drops em `world/items.ts`, propriedades em `world/blocks.ts`.
- **Casas e cidade:** decidir se `buildTown`/casas são refeitos com paredes autotile (muda a cidade de todos: `town.test.ts`) ou se só as casas
  construídas pelo jogador usam paredes. `OAK_DOOR` antiga é substituída pela porta de parede ou convive (a decidir).
- **Interiores** (`world/interiors.ts`): mapa lógico `#`/`.`/`E` com paredes reais; entrada pela porta de parede.
- **Servidor e save:** `build:net` + `sync-net`, `PROTOCOL_VERSION`, `SAVE_VERSION` se mudar formato; a sala precisa aceitar os blocos 240–243.
- **Arte:** porta de Pedra, ícones de arte das paredes na hotbar, paredes de outros materiais (cerejeira, bétula, pedras) seguindo o contrato
  `assets-src/paredes/CONTRATO.md`.

## 5. Riscos
- **Desempenho em celular/Safari** é o risco principal: por isso o M0 mede antes de qualquer conteúdo; luzes têm teto e modo reduzido; 2D de reserva.
- **Escala do Mundo (K = 1):** toda a arte do Mundo foi calibrada para a escala antiga (frente do cubo de 18/32). Trocar para frente quadrada altera
  a proporção de blocos, árvores, casas, atores e a câmera (`preferredCellsTall`). É a maior decisão visual da migração — ver perguntas.
- **Duas bases de render** em paralelo (custo de manutenção até o M7); mudança no Mundo 2D durante a migração deve ser mínima.
- **Física sem degrau** muda a jogabilidade e o servidor; precisa de flag e de teste de sala.
- **Contexto WebGL perdido / iframe do Artifact:** já tratado no Santuário (perda de contexto); validar no Mundo, que tem mais memória.
- **Mundo infinito:** reconstrução de malhas e texturas de chão por chunk pode gerar picos ao andar; daí o orçamento por quadro.

## 6. Decisões do dono do produto (13/11/2026) — antes eram perguntas
Aprovadas as recomendações: (1) **K = 1 no Mundo desde o M2**; (2) **degrau automático sai, atrás de flag no piloto**; (3) **prédios como planos na paridade**, casas com paredes no W5; (4) **interiores isolados mantidos** no M4, teto avaliado no W5; (5) arte de frente dos blocos e árvores em escala nova **provisória** (derivada do topo/escala) até a arte chegar; (6) **luz/escuridão só à noite e na dungeon** (decidido em 13/11/2026, recomendação aceita; implementado no M3.3, v0.93.36). Texto original das perguntas:
1. **Escala:** o Mundo adota K = 1 (cubo 1,0 / parede ≈ 1,2 / personagem ≈ 1,2) já no M2, com ajuste de toda a arte, ou mantém a escala antiga na
   paridade e muda depois? (Recomendação: K = 1 desde o M2; muda uma vez só.)
2. **Física:** o degrau automático sai (parede sólida, como Core Keeper) já no piloto, atrás de flag? (Recomendação: sim, atrás de flag.)
3. **Cidade:** na paridade os prédios viram planos verticais (sem refazer arte); as casas com paredes autotile ficam para o W5. De acordo?
4. **Interiores:** manter o cômodo isolado ao norte (como hoje) ou casas reais com teto que some ao entrar (Core Keeper)? (Recomendação: manter o isolado
   no M4 e avaliar o teto no W5.)
5. **Arte:** a frente própria de cada bloco Material V2 (hoje o topo escurecido serve de frente) e árvores/objetos altos em escala nova — enviar antes do
   M2 ou aceitar provisório?
6. **Clima padrão:** luz/escuridão no Mundo liga por padrão no M3 ou só na dungeon e à noite?

## 7. Consequências
- O Mundo ganha profundidade correta, luz e escuridão (Core Keeper) e menos chamadas de desenho; perde o degrau automático (decisão consciente).
- Durante M2–M6 o jogo tem dois caminhos de render; o contrato `GameRenderer` e o mapa de paridade (`OptionSupport`) são a trava contra divergência.
- Nenhuma decisão de gameplay, protocolo ou save é tomada por este plano: cada uma é registrada no marco em que entra.
