# ADR 0050 — Titã: grade 3 × 3 única e prévia com itens distribuídos

**Status:** aceito (dono do produto, 19/11/2026: "Precisa aparecer sempre a grade 3x3, essa é a única"; opção "Virar a 3 × 3 da Bolsa"). Estende as ADR 0047 e 0049.

## Decisão
1. **Uma grade só, 3 × 3.** A grade pessoal 2 × 2 (posições 36–39) e sua saída (40) saem da interface e do domínio (`craftRecipe/craftResult/takeResult/matchGrid` removidos). As posições 36–39 continuam no formato do save **só para ler partidas antigas**: `Inventory.returnCraft` as devolve à bolsa ao abrir e ao fechar. Sem mudar `TITAN_SAVE_VERSION`.
2. **A grade 3 × 3 de montagem fica no grupo "Bolsa"** (os 27 espaços + a grade), sem exigir a Mesa. O grupo "Montar 3 × 3" e o botão "Receitas" deixam de existir. `matchBench` vale para **todas** as receitas (quantidades exatas, qualquer disposição); quem exige a Mesa de Trabalho é a retirada: `takeBenchResult(at)` devolve `station` para receita da mesa fora da mesa (nada é consumido; a interface mostra "Precisa da Mesa de Trabalho" e a saída fica bloqueada). Mesa de Trabalho (4 rochas) monta-se na grade sem estação.
3. **Prévia do livro de receitas sempre 3 × 3** (`recipes.ts: previewCells`): **uma célula por unidade pedida** (4 rochas = 4 células com 1 ícone, 5 vazias) e, em cada célula, o número é a parte do que o jogador tem repartida por igual, com o resto nas primeiras: tem 4 → 1,1,1,1; tem 3 → 1,1,1,0; tem 12 → 3,3,3,3; tem 9 → 3,2,2,2. Célula com 0 fica em vermelho (falta). Cada ingrediente reparte entre as suas próprias células. Até 9 células (o catálogo pede no máximo 4).

## Consequências
- Receita com formato continua fora de escopo (a prévia não impõe posição). Saves antigos com itens na 2 × 2 voltam à bolsa; o que não couber fica na posição legada até haver espaço.
