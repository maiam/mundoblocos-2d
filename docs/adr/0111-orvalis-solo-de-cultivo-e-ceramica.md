# ADR 0111 — Orvalis em voxel: solo de cultivo e cerâmica (v0.178.0, entrega E3)

**Status:** Aceita. Quinta entrega do pacote Texturas16px (P1-05 solo de cultivo e P2-01 cerâmica). Só cubos inteiros e itens: as regras que dependem de ferramenta, água e argila no terreno ficam para E4, E5 e uma versão futura do gerador, e as receitas daqui são **provisórias** por isso.

## Decisão
- **Blocos 131–136** (`T`; `T_MAX` = 136): `FARMLAND_DRY`, `FARMLAND_WET` (topo e lateral próprios), `PATH` (idem), `DIRT_INFERTILE`, `CLAY_BLOCK`, `BRICK_BLOCK`. **Itens 62–67** são os blocos (`ORVALIS_ITEM_BLOCKS`); **68 Bola de Argila** e **69 Tijolo** são itens sem bloco (sprite 16 × 16 extrudado, ADR 0097, PNG do pacote em `assets-src/titan/arte16/`). Atlas de itens **4 × 18** (72 ids, 69 em uso); atlas de terreno com **82 tiles** (9 novos no fim de `tiles.json`, `BLOCK_TILES`).
- Todos são **cubos inteiros** (`isFull`: a mureta liga a eles). Terra arada e caminho no Minecraft têm 15/16 de altura; aqui ficam cubos, por simplicidade (pendência). Quebra: solo e argila como a terra, tijolos como a pedra; som provisório (areia/rocha). Quebrar devolve o próprio bloco (não as 4 bolas/tijolos).
- **Receitas provisórias** (Mesa de Carpintaria, `world: 'orvalis'`): 1 Terra → Terra Arada Seca; 1 Seca → Úmida; 1 Terra → Caminho; 1 Terra + 1 Areia da Praia → 2 Terra Infértil; 2 Terra + 1 Areia → 2 Bolas de Argila; 1 Bola → 1 Tijolo; 4 Bolas → Bloco de Argila; 4 Tijolos → Bloco de Tijolos.
- Ícones isométricos gerados (`make-orvalis-voxel-arte.py`); vitrine: os 6 blocos na fila 2.

## Consequências
- Sem mudança de gerador, save nem protocolo (ids acima do `T_MAX` anterior).
- **Dependências registradas (não implementadas):** enxada (E4) ara a terra e pá faz o caminho (a receita de Terra Arada some); **a terra arada úmida/seca deve reagir à água e aos brotos (E5, ADR 0083)**; argila no terreno (gerador do Orvalis v2) e fundição do tijolo (Braseiro no Orvalis); vasos (flor e decorado) ficam sem entrega por pedirem modelo/uso; altura de 15/16.
- Testes: `orvalis/solo.test.ts` (ids, itens, nomes, tiles, tempos e sons, receitas, colocar e quebrar); limites `isItem(61)` → 70 nos antigos. Conferido no navegador.
