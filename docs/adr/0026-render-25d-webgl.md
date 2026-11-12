# ADR 0026 — Render 2.5D em WebGL (Three.js), referência Core Keeper

- **Status:** aceita
- **Data:** 2026-11-12 (v0.93.4)
- **Relaciona:** ADR 0010 (arte por mundo), 0013 (assets em arquivos), 0022 (escala visual), 0023 (Materiais V2); PRs #89–#101 (Santuário em Three.js).

## Contexto
O dono do produto começou a migrar o render para Three.js pelo Santuário (hoje oficial, com `?render=2d` de reserva) e definiu
**Core Keeper como referência** do jogo. O `SanctuaryThreeRenderer` cobre só o que o Santuário usa (chão e blocos, Deusa,
seleção); atores, itens, dano, dia/noite, partículas, dungeon, interiores, cidade e o chão com transições só existem no
`Renderer` Canvas 2D, que segue sendo o do Mundo principal.

## Decisões
- **Direção: 2.5D, não 3D.** A arte continua 2D e é a fonte de verdade: blocos = cubos com textura (topo, frente, franja),
  atores/NPCs/monstros = planos verticais (billboards) com as folhas atuais. Geometria só onde há altura (paredes/cubos).
  Nada de modelagem 3D. O ganho do WebGL é profundidade correta (z-buffer), **iluminação dinâmica e escuridão** (o que mais
  lembra Core Keeper) e menos chamadas de desenho.
- **Meta:** o jogo inteiro, em etapas; o Santuário é o laboratório. O Mundo só passa ao WebGL atrás de flag (`?render=3d`,
  dev) até haver paridade validada.
- **Física: parede sólida, sem degrau automático** (como Core Keeper e o Santuário 3D; `MAX_STACK = 2`). No Mundo é mudança
  de jogabilidade: só entra junto com o piloto, atrás de flag.
- **Fallback:** o Canvas 2D fica até o piloto do Mundo passar em celular, tablet e Safari, mais uma versão depois da virada.
- **Uma só biblioteca:** Three.js (não introduzir PixiJS): o z-buffer entre paredes e atores já funciona.
- **Chão = textura por chunk:** o `ChunkRenderer` 2D continua gerando o chão (Material V2 e transições) e o 3D o usa como
  `CanvasTexture` de um plano por chunk. Sem shader de transição. Não lê pixels de canvas (regra do CLAUDE.md).
- **Tudo por chunk:** uma malha por chunk, reconstruída só quando `chunk.version` muda, com orçamento por quadro e corte pela
  câmera (o `worldSignature` global do Santuário só serve a 10 chunks).
- **Orçamento:** 30 FPS em celular médio (medido na Fase 1); teto de luzes dinâmicas por tela, com modo reduzido (tinta de
  tela) e o 2D como reserva; JS embutido no Artifact e arte inicial (< 3 MB) com tetos definidos na Fase 1.
- **Invariantes mantidos:** render só **lê** o mundo; `world/` sem DOM; arte importada só em `render/art/<mundo>.ts`; texturas
  nunca giram/espelham por célula; protocolo, save e servidor não mudam por causa do render.

## Vista oblíqua — aprovada e padrão (v0.93.9 experimento; v0.93.10 padrão)
Em vez de uma câmera inclinada (que achata tudo o que é vertical por cos da elevação: a Deusa a ~39% da altura a 67°), a recomendação é a projeção **oblíqua**: câmera reta para baixo, altura como deslocamento fixo de 18/32 de célula por nível (a proporção da arte 3/4). Implementada primeiro atrás de `?vista=obliqua`; aprovada pelo dono do produto em 12/11/2026 e tornada padrão (`?vista=inclinada` é a reserva). A matemática é pura e testada (`sanctuaryObliqueView.ts`).

## Fases (detalhe em `NEXT_STEPS.md`)
1. Consolidar o Santuário (validação visual, perda de contexto, tipagem, linha de base de desempenho, contrato completo,
   núcleo genérico separado do mármore). 2. Núcleo 3D por chunk. 3. Atores, itens e efeitos — **iluminação primeiro**.
4. Objetos do Mundo (árvores, portas, cidade, água, dungeon, interiores). 5. Piloto `?render=3d`. 6. Virada.

## Consequências
- Durante a transição há duas bases de render a manter em paridade.
- O Mundo ganha escuridão/tochas e profundidade correta; perde o degrau automático (decisão consciente).
- Celulares fracos são o risco principal: por isso o orçamento e o modo reduzido vêm antes de conteúdo novo.
