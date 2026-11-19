# ADR 0046 — Titã: Laje de Rocha (bloco de meia altura), colisão e mira por altura

**Status:** aceito (dono do produto, 19/11/2026: o teste da mesa em celular real passou; **segunda entrega** do prompt "Uma luz para voltar"). Estende as ADRs 0039–0045.

## Decisão
1. **Bloco `T.SLAB` (12), item 13 "Laje de Rocha"** (pilha de 64, ícone no índice 12 do atlas de itens, agora 64 × 64). Receita `laje`: **3 blocos de rocha escura → 6 lajes, na Mesa de Trabalho** (mesmo catálogo e fabricação atômica da ADR 0045; descoberta junto das receitas da mesa). Quebrar = 1,0 s (meio bloco de rocha) e devolve 1 laje (se não couber, fica no lugar). Colocar gasta 1; a laje é só de **fundo** (metade de baixo da célula).
2. **Altura por bloco** (`voxel.ts`): `blockHeight(id)` (1 cubo, 0,5 laje, 0 não sólido) e `isFull(id)` (cubo inteiro: só ele esconde faces vizinhas). `TitanVolume.bodyHeight` leva a altura à física.
3. **Física** (`physics.ts`): `collides` só considera a laje se os pés estão abaixo do topo dela; ao cair, `landingY` pousa no topo mais alto sob os pés (cubo inteiro ou laje); **degrau automático de 0,5 m** (`STEP`) quando o corpo está no chão e a laje (ou um cubo a meio bloco acima do piso) barra o passo — contra um cubo inteiro a partir do piso o degrau não vale. O salto de 1,25 m não muda; a laje não é teto para quem passa por baixo (1,8 m). `canPlaceAt` recebe a altura do bloco: a laje cabe junto ao corpo onde um cubo invadiria.
4. **Mira** (`raycast`): como a lanterna, a laje é testada por **raio × caixa** `[x, y, z, x+1, y+½, z+1]`: o raio por cima dela segue para o que está atrás; o contorno tem meia altura (`Hit.box`); a face de colocação vem da entrada na caixa.
5. **Malha** (`mesher.ts`): a laje é terreno (não instância): topo em y + 0,5, laterais com **16 × 8 px** (os 8 px de cima do tile da rocha escura, mesma densidade de texels), base e laterais omitidas contra cubo inteiro (laterais também contra outra laje); o culling dos cubos passou de `isSolid` para `isFull` (um cubo ao lado de uma laje mostra a face inteira). Textura: o tile 4 (rocha escura), sem arte nova de terreno.
6. **Persistência:** a laje é edição de chunk (`volume.load` aceita ids até 12); nada muda no formato do save, no gerador (`GENERATOR_VERSION` 4) nem no protocolo. A luz trata a laje como opaca (simplificação: não deixa a luz passar pela metade de cima).
7. **Fora desta entrega:** laje de teto/inversa, empilhar duas lajes numa célula (laje dupla = cubo), degraus de escada, e a **segunda enseada**, que segue para depois do teste desse ciclo.

## Consequências
- Atlas de itens 64 × 64 (`scripts/make-titan-fabricacao.py`; sprites de item 8–12); `TitanRenderer` e o CSS passam a 4 linhas.
- Colocar um bloco em cima de uma laje põe o bloco na célula de cima (fica meio bloco de vão, como em outros jogos de voxel).
