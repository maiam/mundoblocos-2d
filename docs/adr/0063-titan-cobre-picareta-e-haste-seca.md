# ADR 0063 — Titã: cobre de Duna, Haste Seca e Picareta de Rocha (gerador v7, v0.120.0)

**Status:** Aceita (etapa 1 de 4 do pacote "O que a duna guarda": cobre e primeira picareta). Contexto: história e 13 ilustrações de conceito do dono do produto (Drive); números provisórios autorizados por ele.

## Decisão
1. **Gerador v7** (`GENERATOR_VERSION` 7; a v6 já estava em `main`, então não foi reaberta): `placeCopper` (2 afloramentos = montes de rocha escura como as formações, em terra seca alcançável a pé, 18–55 blocos da chegada, ≥ 10 da costa, afastados ≥ 20 entre si, 3 veios de cobre no topo de cada) e `dryReedsFor` (até 8 **hastes secas** no chão, em areia perto dos juncos). A enseada de Noz de Duna e a toca do Farejador ficam ≥ 28 blocos dos afloramentos: **o minério fica fora do território do animal**. Region e relevo da v6 inalterados.
2. **Veio de Cobre de Duna** = bloco 24 (`T.VEIN_COPPER`, tile 11 do atlas de terreno, mesma arte nas 6 faces; `scripts/make-titan-veio-cobre.py`: rocha violeta, veios cor de cobre, manchas verde-oliva, provisório a partir da ilustração). Sólido, soa como rocha. **Só se quebra com picareta**: sem ela `breakTotalMs` devolve `null` e o jogo avisa "Só pó nos dedos. Falta uma picareta."; com ela leva `BREAK_MS.rock × PICK_FACTOR` (0,6). Solta `COPPER_YIELD` = 2 Fragmentos de Cobre **no chão** (drop persistente como a lasca do veio), nunca o bloco.
3. **Itens 17–20** (`items.ts`): Fragmento de Cobre de Duna, Lingote de Cobre de Duna (ainda sem receita: vem com o braseiro), Haste Seca de Junco, Picareta de Rocha. **Ferramentas** por `TOOLS`/`toolOf`/`isPick` (não empilham; sem durabilidade, provisório); com picareta na mão a rocha, o veio de rocha e as lajes cedem a 60 % do tempo.
4. **Haste Seca**: id `dry:x,y,z`, recolhida à mão como a lasca (item no chão desenhado pelo atlas), não volta. **Receita** na Mesa, grupo novo **Ferramentas**: 3 Fragmentos de Rocha + 2 Hastes Secas → 1 Picareta de Rocha.
5. **Arte**: atlas de itens passou a 128 × 256 (4 colunas × 8 linhas, 32 ids; CSS e `titanRenderer` leem `4 × 8`). Ícones de 32 px **provisórios** gerados das ilustrações (`scripts/make-titan-icones-conceito.py`: recorte, redução, paleta curta, contorno); trocar o PNG em `assets-src/titan/arte32/` e rodar `make-titan-arte32.py`.

## Consequências
- Etapas seguintes (mesmo pacote): Braseiro de Rocha + Lingote + Picareta/Adaga de Cobre; Placa e Revestimento de Carapaça; vida do Farejador, carne crua e assada e combate com adaga.
- Pendências: durabilidade (decidir), textura final do veio, modelo 3D dos itens na mão, haste seca desenhada como ícone plano (sem sprite próprio no mundo).
- Testes: `cobre.test.ts` (+8), catálogo de receitas e itens atualizados.
