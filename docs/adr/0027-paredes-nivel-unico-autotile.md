# ADR 0027 — Paredes de nível único com altura fixa e autotile

- **Status:** aceita (modelo); altura definida na ADR 0028 (≈ 1,2 célula)
- **Data:** 2026-11-12 (v0.93.11)
- **Relaciona:** ADR 0026 (render 2.5D, vista oblíqua), ADR 0014 (interiores). **Aposenta** o mármore V2/V3 (PRs #92–#101).

## Contexto
O mármore celestial nasceu como teste de paredes: dois cubos empilhados com geometria especial (meia parede, canto em L,
base em duas células em planta, âncoras, `marblePlacements`, `marbleV3Bases`). Foi calibrado a 67°, ficou frágil e não serve
de base para casas e interiores. O dono do produto aprovou a vista oblíqua (frente de 18/32 de célula por nível) e pediu para
repensar as paredes **já pensando no Mundo**. Referência visual: Core Keeper — parede de frente com cerca de uma célula de
altura, tampa escura em cima, personagem mais alta que a parede (a cabeça aparece por cima).

## Decisões
- **Parede = bloco de nível único, sólido,** com frente de **≈ 1,2 célula** na tela (ADR 0028: ≈ a altura do personagem, K = 1;
  `WORLD_SCALE.wall`). Não empilha sobre outra parede nem usa dois níveis de bloco. Ocupa uma célula; sem degrau.
- **Paredes do sul e laterais finas** (referência Core Keeper, a validar): só a faixa escura da tampa, para não esconder o cômodo;
  a frente cheia aparece nas paredes cuja face dá para o interior (ao norte do cômodo).
- **Placa fina (medida no Core Keeper, v0.93.16):** a parede é uma placa de espessura `WALL_THICKNESS` ≈ 0,3 célula nos dois
  sentidos, no centro da célula: um poste central mais um braço até a borda em cada lado com parede vizinha (`wallFootprint`).
  A espessura tem **dois valores** (`WallThickness`: `x` faixas/poste, `z` tampa), hoje 0,3 / 0,3 e ajustáveis para casar com a referência (`?espessura=`). A **colisão continua sendo a célula inteira**; só o desenho é fino. Daí saem sozinhos os comportamentos observados:
  fileira leste–oeste com frente de célula inteira (altura ≈ 1,2); fileira norte–sul como faixa fina em que **só o último
  bloco ao sul mostra a frente** (fina), os demais só mostram a tampa; bloco isolado = poste fino.
- **Autotile por vizinhança** (função pura `world/walls.ts`, testada):
  - **Frente:** `single` (poste), `end` (último bloco ao sul de uma fileira norte–sul), `left`/`mid`/`right` (fileira leste–oeste);
    `null` quando nada aparece (continuação de uma fileira norte–sul). `wallFrontRanges` dá as faixas de x expostas.
  - **Tampa:** máscara de 4 bits dos vizinhos (16 peças) e cantos internos; `wallThin` marca a peça sem vizinho leste/oeste.
  - **Faixa centralizada** na célula (decisão adotada); parede atrás de parede mostra só a tampa.
- **Porta** substitui a frente de um segmento (a existente continua valendo como pilar nas conexões).
- **Vale para Santuário e Mundo** (casas, muros, interiores): o modelo é do `World` (propriedade do bloco: `wall`), a aparência
  é por material (`render/`), como nos demais blocos. Nenhuma lógica de parede no cliente além do desenho.
- **Mármore V2/V3 aposentado** depois da migração: remover `sanctuaryMarble*`, `sanctuaryV3Surfaces`, `adaptiveWalls`,
  `marblePlacements`/`marbleV3Bases` do mundo e do save (`SAVE_VERSION` sobe; blocos antigos viram parede do mesmo material ou
  somem, a decidir na migração) e `MAX_STACK` volta a valer só para cubos de terreno.
- **Teste de escala** (`render/sanctuaryWallProportionTest.ts`, v0.93.12): compara a escala atual e a nova (ADR 0028) lado a lado,
  com cubo, parede de 2 cubos, régua de 1 m e personagem de referência. Descartável; sem lógica de jogo.

## Fases
- **W0** teste de proporção (v0.93.11) → o dono do produto escolhe a altura.
- **W1** arte por material (contrato em `assets-src/paredes/CONTRATO.md`, com `gabarito.png`): frente larga (esquerda/meio/direita), frente fina (poste e fim de coluna), tampa larga e fina, cantos, T, cruz e cantos internos, mais a porta (aberta e fechada). **Protótipo com cores lisas** (v0.93.16): `?mundo=santuario&paredes=autotile`.
- **W2** domínio: bloco `wall` no `World` (colocar/quebrar/colisão/porta), regra de autotile pura e testada, save e protocolo.
- **W3** render: parede no Three.js (frente + tampa) com oclusão correta da personagem.
- **W4** migração e remoção do mármore V2/V3.
- **W5** Mundo: casas e interiores com o mesmo conjunto.

## Consequências
- Física e save ficam mais simples que no V3 (sem base em duas células nem âncoras).
- Exige arte nova (frente e tampa por material). Até lá o mármore atual é provisório.
