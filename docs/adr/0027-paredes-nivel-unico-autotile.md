# ADR 0027 — Paredes de nível único com altura fixa e autotile

- **Status:** aceita (modelo); **altura visual pendente do teste de proporção** (`?mundo=santuario&paredes=teste`)
- **Data:** 2026-11-12 (v0.93.11)
- **Relaciona:** ADR 0026 (render 2.5D, vista oblíqua), ADR 0014 (interiores). **Aposenta** o mármore V2/V3 (PRs #92–#101).

## Contexto
O mármore celestial nasceu como teste de paredes: dois cubos empilhados com geometria especial (meia parede, canto em L,
base em duas células em planta, âncoras, `marblePlacements`, `marbleV3Bases`). Foi calibrado a 67°, ficou frágil e não serve
de base para casas e interiores. O dono do produto aprovou a vista oblíqua (frente de 18/32 de célula por nível) e pediu para
repensar as paredes **já pensando no Mundo**. Referência visual: Core Keeper — parede de frente com cerca de uma célula de
altura, tampa escura em cima, personagem mais alta que a parede (a cabeça aparece por cima).

## Decisões
- **Parede = bloco de nível único, sólido,** com **altura visual fixa** (frente ≈ 1 célula na tela; valor final sai do teste
  de proporção: 0,75 / 1,0 / 1,25). Não empilha sobre outra parede nem usa dois níveis. Ocupa uma célula; sem degrau.
- **Autotile por vizinhança** (função pura em `render/`, testável em Node):
  - **Frente:** aparece só onde o vizinho ao sul não é parede. Variantes: solta, ponta esquerda, meio, ponta direita.
  - **Tampa:** peça no topo da célula escolhida pelos 4 vizinhos (16 peças), com cantos internos/externos.
  - **Parede atrás de parede:** só a tampa.
- **Porta** substitui a frente de um segmento (a existente continua valendo como pilar nas conexões).
- **Vale para Santuário e Mundo** (casas, muros, interiores): o modelo é do `World` (propriedade do bloco: `wall`), a aparência
  é por material (`render/`), como nos demais blocos. Nenhuma lógica de parede no cliente além do desenho.
- **Mármore V2/V3 aposentado** depois da migração: remover `sanctuaryMarble*`, `sanctuaryV3Surfaces`, `adaptiveWalls`,
  `marblePlacements`/`marbleV3Bases` do mundo e do save (`SAVE_VERSION` sobe; blocos antigos viram parede do mesmo material ou
  somem, a decidir na migração) e `MAX_STACK` volta a valer só para cubos de terreno.
- **Teste de proporção** (`render/sanctuaryWallProportionTest.ts`): três paredes lisas com a frente de 0,75/1,0/1,25 célula,
  com régua de 1 célula no chão e a Deusa para andar ao redor. Descartável; sem lógica de jogo.

## Fases
- **W0** teste de proporção (v0.93.11) → o dono do produto escolhe a altura.
- **W1** arte: frente (4 variantes) e tampa (16 peças) por material, mais a porta (aberta e fechada).
- **W2** domínio: bloco `wall` no `World` (colocar/quebrar/colisão/porta), regra de autotile pura e testada, save e protocolo.
- **W3** render: parede no Three.js (frente + tampa) com oclusão correta da personagem.
- **W4** migração e remoção do mármore V2/V3.
- **W5** Mundo: casas e interiores com o mesmo conjunto.

## Consequências
- Física e save ficam mais simples que no V3 (sem base em duas células nem âncoras).
- Exige arte nova (frente e tampa por material). Até lá o mármore atual é provisório.
