# ADR 0038 — Santuário: Vale Goblin (terceiro bloco, ao norte do original)

**Status:** aceito (dono do produto, 18/11/2026). Estende o ADR 0037 (Fazenda a partir de heightmap) e o 0036 (Santuário isométrico solo).

## Contexto
O dono do produto enviou o terreno de um "vale goblin" (`assets-src/santuario-vale-goblin/seed.json`, schema `orvalis-terreno-v1`, seed 641107): 64 × 64 células com alturas de
2 a 32, superfície (grama, trilha, rocha), uma caverna na borda sul, a fogueira do acampamento e 7 goblins. Pediu "mais um espaço no mundo Santuário".

## Decisão
1. **Mais 16 chunks, ao NORTE do bloco original** (revisado na v0.93.159: primeiro foi a leste da Fazenda, e a caverna abria para o vazio): o Vale Goblin é `cx −2..1`, `cy −6..−3`, de modo que a plataforma da caverna (borda sul do vale, x 8..11) encosta na borda norte do original (y = −32). O mundo passa a 8 × 8 chunks (`cx −2..5`, `cy −6..1`); o retângulo de limites é único (o `World` não aceita buracos), então o canto sem bloco (`cx 2..5`, `cy −6..−3`, ao norte da Fazenda) tem chão **VOID** (céu aberto: não pisável, não aceita bloco).
2. **Conversão para a pilha de 8 níveis** (`world/sanctuaryValeGoblin.ts`, dados em `world/valeGoblinData.ts` por `scripts/make-vale-goblin-data.py`): o chão do vale (3) é a planície de 2 cubos; os terraços
   de grama (3–14, 12 valores) são comprimidos para 2–6 e alisados (vizinhos caminháveis diferem ≤ 1: o degrau da Deusa); a rocha (15–32) vira 7 ou 8 (paredes; sem objetos em cima). Pedra no fundo, terra nas
   paredes dos terraços, grama ou Caminho de Terra (trilha) no topo.
3. **Caverna:** os 24 vazios do pacote viram um túnel de piso no nível 3 (o da trilha), dois níveis livres e teto de rocha; a trilha do vale, o túnel e a plataforma externa (lampiões nos dois lados da boca) são
   contínuos a pé. A plataforma externa (piso 3) é um degrau acima da planície do original (piso 2): do ponto de nascimento dá para ir a pé até a fogueira do vale pela caverna (teste). A faixa x 6..13 junto à borda norte do original fica sem árvores.
4. **Objetos:** fogueira na posição do pacote, duas barracas, caixa e barris no acampamento, árvores (carvalho e as 12 do conjunto), arbustos e pedras. **Os 7 goblins** (v0.93.160) são `Block.ISO_GOBLIN`, malhas 3D estáticas desenhadas por `render/three/isoGoblins.ts` com o modelo do dono do produto; o Santuário
   é solo, sem monstros nem combate, então não se movem nem atacam.

## Consequências
- Mais faces para o renderer (mundo 2× maior em chunks, 64): conferir desempenho em aparelho real. O canto VOID aparece como fundo escuro com grade, não como o céu degradê das bordas comuns.
- Pendências: monstros no Santuário (goblins), relevo mais fiel (a compressão perde a altura real das montanhas), posição exata das barracas (o pacote só traz a fogueira).
