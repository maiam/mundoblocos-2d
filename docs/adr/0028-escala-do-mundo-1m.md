# ADR 0028 — Escala do mundo: relações do Core Keeper (K = 1)

- **Status:** aceita (v0.93.14). Substitui a proposta inicial de "1 célula = 1 m" (personagem 1,75; parede de 2 cubos), recusada
  pelo dono do produto depois de comparar três escalas no teste `?mundo=santuario&paredes=teste`.
- **Data:** 2026-11-12
- **Nota (13/11/2026):** para o Mundo, a **ADR 0032 (proposta)** substitui a escala em células desta ADR (grade fina, padrão Stardew).
- **Relaciona:** ADR 0026 (vista oblíqua), ADR 0027 (paredes).

## Contexto
A célula não tinha medida: a Deusa tinha 2,2 células de altura e cada cubo subia só 0,56 célula na tela, o que fazia o mundo
parecer "sem proporção" (personagem grande demais para casas, árvores e portas). Uma cena do Core Keeper foi medida em pixels
(captura de 1500×844; tile ≈ 50 px; ±10%, um único quadro): personagem ≈ 1,2 tile de altura × 0,7 de largura; **frente da parede
≈ 1,15–1,2 (≈ a altura do personagem)**; vaca ≈ 1,2 × 1,0; cerca ≈ 0,65; árvore 3,5–4 de altura (copa ≈ 2,4); cena visível ≈ 30 × 17;
tampa das paredes quase preta; paredes laterais e do sul finas; iluminação dinâmica com neblina escura.

## Decisões
- **Vale a relação, não "1 m".** Em células na tela, com a vista oblíqua de **K = 1** (um metro de altura = uma célula):
  frente do cubo **1,0** (quadrada); frente da parede **≈ 1,2** (ADR 0027); personagem **≈ 1,2**.
  Constantes em `render/worldScale.ts` (`WORLD_SCALE`).
- **Espécies** (referência, ajustáveis olhando; em células): goblin ~1,0; vaca ~1,2 × 1,0; ovelha ~0,8; cavalo ~1,4; lobo ~0,7;
  aranha pequena ~0,35, grande ~0,7, Rainha ~2,0; árvore 3,5–4 (copa ~2,4).
- **Visão:** o render 3D pede ~14 células na vertical (`SANCTUARY_CELLS_TALL`, via `GameRenderer.preferredCellsTall` e
  `Camera.setCellsTall`); o Core Keeper mostra ~17. O Mundo 2D segue com 10.
- **Cubos empilhados:** os 2 níveis (`MAX_STACK = 2`) ficam por ora no Santuário; a parede é uma peça própria (ADR 0027).
  Dois cubos empilhados (2,0) passam bem do personagem; a decisão de manter o empilhamento fica para depois.
- **Santuário primeiro, Mundo na migração do render** (ADR 0026, Fase 4): o Mundo 2D mantém a escala antiga até migrar;
  personagens, árvores, casas e interiores são reproporcionados nessa migração.
- **Arte:** a frente de cada cubo é **quadrada** (Material V2 128×128 sem achatar); a frente da parede tem ≈ 1,2 de altura.
- **Referência a explorar** (NEXT_STEPS): paredes do sul/laterais finas para não esconder o cômodo; tampa escura; luz dinâmica
  e neblina escura; bordas de terreno orgânicas; decoração pequena e densa.

## Consequências
- Mundo percebido como maior; casas e portas combinam com o personagem; a mesma unidade serve a geometria e aos sprites.
- Frentes de bloco da arte antiga (18/32) deixam de servir na vista oblíqua: a arte de frente é refeita no padrão quadrado.
  Enquanto isso o render usa a imagem do topo como frente (escurecida), sem achatar.
- Até o Mundo migrar, existem duas escalas (2D antiga no Mundo; Core Keeper no Santuário 3D).
