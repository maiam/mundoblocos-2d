# ADR 0038 — Santuário: Vale Goblin (terceiro bloco, a leste da Fazenda)

**Status:** aceito (dono do produto, 18/11/2026). Estende o ADR 0037 (Fazenda a partir de heightmap) e o 0036 (Santuário isométrico solo).

## Contexto
O dono do produto enviou o terreno de um "vale goblin" (`assets-src/santuario-vale-goblin/seed.json`, schema `orvalis-terreno-v1`, seed 641107): 64 × 64 células com alturas de
2 a 32, superfície (grama, trilha, rocha), uma caverna na borda sul, a fogueira do acampamento e 7 goblins. Pediu "mais um espaço no mundo Santuário".

## Decisão
1. **Mais 16 chunks a leste da Fazenda:** o mundo passa a 12 × 4 chunks (`cx −2..9`, 192 × 64 células); o Vale Goblin é `cx 6..9`. O retângulo de limites segue único (o `World` não aceita buracos).
2. **Conversão para a pilha de 8 níveis** (`world/sanctuaryValeGoblin.ts`, dados em `world/valeGoblinData.ts` por `scripts/make-vale-goblin-data.py`): o chão do vale (3) é a planície de 2 cubos; os terraços
   de grama (3–14, 12 valores) são comprimidos para 2–6 e alisados (vizinhos caminháveis diferem ≤ 1: o degrau da Deusa); a rocha (15–32) vira 7 ou 8 (paredes; sem objetos em cima). Pedra no fundo, terra nas
   paredes dos terraços, grama ou Caminho de Terra (trilha) no topo.
3. **Caverna:** os 24 vazios do pacote viram um túnel de piso no nível 3 (o da trilha), dois níveis livres e teto de rocha; a trilha do vale, o túnel e a plataforma externa (lampiões nos dois lados da boca) são
   contínuos a pé. Ela abre na borda sul do mundo: não há passagem pronta entre a Fazenda e o vale — quem quiser entrar cava (qualquer bloco quebra em 1 s).
4. **Objetos:** fogueira na posição do pacote, duas barracas, caixa e barris no acampamento, árvores (carvalho e as 12 do conjunto), arbustos e pedras. **Os 7 goblins ficam só como dados** (`VALE_GOBLINS`): o Santuário
   é solo, sem monstros nem combate.

## Consequências
- Mais faces para o renderer (mundo 1,5× maior): conferir desempenho em aparelho real.
- Pendências: monstros no Santuário (goblins), passagem entre a Fazenda e o vale, relevo mais fiel (a compressão perde a altura real das montanhas), posição exata das barracas (o pacote só traz a fogueira).
