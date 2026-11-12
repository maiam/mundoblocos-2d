# ADR 0028 — Escala do mundo: 1 célula = 1 m

- **Status:** aceita (direção); valores finais por espécie conferidos no teste `?mundo=santuario&paredes=teste`
- **Data:** 2026-11-12 (v0.93.12)
- **Relaciona:** ADR 0026 (vista oblíqua), ADR 0027 (paredes). **Substitui** o `OBLIQUE_K = 18/32` do experimento da v0.93.9.

## Contexto
A célula não tinha medida: a Deusa tinha 2,2 células de altura (2,2 m, se a célula for 1 m) e cada cubo subia só 0,56 célula na
tela. Por isso o mundo parecia "sem proporção" (o personagem grande demais para casas, árvores e portas) e uma parede de dois
cubos (1,125 célula na tela) ficaria mais baixa que o personagem. A referência (foto do dono do produto) mostra paredes com
frente quase quadrada e a cabeça do personagem aparecendo por cima.

## Decisões
- **1 célula = 1 m**, em largura, profundidade e altura. Física, velocidades, colisão e dados do mundo seguem em células (não mudam).
- **Vista oblíqua com K = 1,0:** cada metro de altura sobe 1,0 célula na tela. O cubo tem frente **quadrada**; sprites (visão
  de frente, sem achatar) e geometria usam a mesma proporção, sem ajuste por objeto.
- **Parede = 2 cubos = 2 m** (2,0 células de frente na tela), de nível único (ADR 0027); coincide com `MAX_STACK = 2`.
- **Personagem ≈ 1,75 m** (≈ 0,8 × a escala antiga de 2,2). Alturas de referência (ajustáveis): goblin ~1,25; ovelha ~1,0;
  vaca ~1,4; cavalo ~1,7; lobo ~0,8 (cernelha); aranha pequena ~0,4, grande ~0,9, Rainha ~2,5.
- **Santuário primeiro, Mundo na migração do render** (ADR 0026, Fase 4): o Mundo 2D mantém a escala antiga até migrar;
  personagens, árvores, casas e interiores serão reproporcionados nessa migração.
- **Arte:** a frente de cada cubo passa a ser **quadrada** (Material V2 128×128 sem achatar; 32 px por metro no jogo); a frente
  da parede tem 2 cubos de altura (ex.: 128×256 por peça).

## Consequências
- Todo tamanho passa a ter leitura em metros; casas e portas (2 m) combinam com o personagem (1,75 m).
- Frentes de bloco da arte atual (18/32) deixam de servir na vista nova: a arte de frente é refeita no padrão quadrado.
- Até o Mundo migrar, existem duas escalas (2D antiga no Mundo; 1 m no Santuário 3D).
