# ADR 0108 — Orvalis em voxel: pedra de obra (Pedra Lisa, Tijolo de Pedra e Laje de Pedra) — v0.175.0, entrega E2a

**Status:** Aceita. Terceira entrega do pacote Texturas16px. O pacote P1-04 traz também **degrau** e **mureta** de pedra; eles pedem formas novas e foram separados em **E2b** (degrau) e **E2c** (mureta), na fila do `NEXT_STEPS` (o degrau do Titã é um modelo 3D de junco; o de pedra pede malha própria; a mureta pede conexões com os vizinhos).

## Decisão
- **Blocos 107–110** (`T`): `STONE_SMOOTH` (Pedra Lisa), `STONE_BRICK` (Tijolo de Pedra), `STONE_SLAB` e `STONE_SLAB_TOP` (Laje de Pedra, inferior e superior). `T_MAX` = 110. **Itens 57–59** (atlas de itens **4 × 15**). A Pedra (bruta, id 92) segue sendo o que se extrai do terreno.
- **Laje na família existente:** `isSlab`/`isSlabBottom`/`slabPartner` ganharam a pedra e `slabs.ts` ganhou a família `stone`: **duas lajes de pedra na mesma célula viram a Pedra Lisa** (como a de junco vira o Bloco de Junco); só funde com a laje da mesma família. A colocação (`placeFromSlot`) passou a testar `isSlabBottom(block)` em vez de listar lajes. A laje superior devolve a mesma laje; a lisa devolve 1 bloco (1 bloco = 2 lajes). A lateral da laje do pacote vem na metade de **baixo** do PNG: recortada a 16 × 8 e posta na metade de cima do tile (convenção do atlas).
- **Receitas** (Mesa de Carpintaria ou do Titã, `world: 'orvalis'`): 1 Pedra → 1 Pedra Lisa (**provisório**: no Minecraft é fundição; o Braseiro não existe no Orvalis ainda); 4 Pedra → 4 Tijolos de Pedra; 3 Pedra Lisa → 6 Lajes de Pedra.
- Quebra: lisa e tijolo 1,6 s (picareta de rocha × 0,6), laje 1 s; som provisório de rocha. Ícones isométricos gerados (a laje com meia altura, `half`); a vitrine ganhou uma fileira (terreno, madeira e pedra, Titã).

## Consequências
- Sem mudança de gerador, save nem protocolo. Testes novos em `orvalis/pedraObra.test.ts`; `madeira.test.ts` e `texturas.test.ts` ajustados (contagens e linhas da vitrine).
- Pendências: fundição da Pedra Lisa no Braseiro (quando houver); degrau (E2b) e mureta (E2c); calibrar receitas.
