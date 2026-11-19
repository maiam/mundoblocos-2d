# ADR 0049 — Titã: bancada 3 × 3 interativa e painéis de basalto

**Status:** aceito (dono do produto, 19/11/2026, "Prompt para o programador · Titã — Bancada 3 × 3 e painéis de basalto"). Estende a ADR 0047.

## Decisão
1. **Grade 3 × 3 da Mesa de Trabalho** (`titan/inventory.ts`): nove espaços próprios (`BENCH_START` 41–49) e uma saída virtual (`BENCH_OUT` 50), **separados da grade pessoal 2 × 2** (36–39). `Inventory.move` põe **uma unidade por toque** nas duas grades. A grade só existe com a mesa **ativa e ao alcance**: o grupo **Montar 3 × 3** (à esquerda, acima da Bolsa) só aparece com a estação aberta por Usar/F; **Receitas** (ou "Todas") volta ao livro.
2. **Validação pelo mesmo catálogo** (`recipes.ts: matchBench`): as quantidades por item têm de ser **exatas** (qualquer disposição, inclusive várias unidades na mesma célula). Lente (1 fragmento de gelo), lanterna (2 fragmentos de rocha + 1 lente + 1 brasa) e laje (3 blocos de rocha escura → 6 lajes). Ingrediente extra, errado ou faltando deixa a saída vazia e nada é consumido. A receita pessoal (mesa) não entra na bancada.
3. **Retirada atômica** (`Inventory.takeBenchResult`): consome **todos** os ingredientes da grade e entrega o resultado numa operação só; sem espaço no resultado devolve `full` e mantém tudo na grade. A interface revalida a **mesa e o alcance a cada toque** (`takeBench`): se a mesa sumiu ou saiu do alcance, a tela fecha e os ingredientes voltam à bolsa. A saída mostra ícone e quantidade (×6 nas lajes) e nome, com destaque âmbar quando pronta.
4. **Fechar devolve** (`Inventory.returnBench`): ao fechar a tela, perder a mesa ou abrir o save, os ingredientes voltam à hotbar/bolsa (uma unidade por vez); o que não couber **fica na grade e no save**, com aviso. Reabrir a bancada mostra o pendente.
5. **Save:** o inventário gravado passa a `v: 3` com `bench` (só quando há itens). Saves `v: 1` e `v: 2` abrem com a grade vazia, pilhas, seleção e grade 2 × 2 intactas. **Sem mudar** `TITAN_SAVE_VERSION`.
6. **Arte dos painéis** (`scripts/make-titan-basalt.py`): um ladrilho de basalto de 32 × 32 px **sem emenda** (placas em carvão e violeta escuro, borda escura de 1 px, leve brilho de relevo, grão; WebP sem perdas), exportado por `render/art/titan.ts` e aplicado por uma variável CSS (`--basalt`) na moldura e nos fundos dos painéis e da hotbar, com acabamento **cobre fosco**. O **âmbar** fica só para seleção, foco e saída pronta; os fundos dos espaços são lisos e calmos para dar contraste aos ícones e às contagens.
7. **Celular em paisagem (360 px):** grade 3 × 3, saída, ✕ e hotbar ficam à vista sem rolar (conferido a 740 × 360); a lista de receitas e a bolsa rolam dentro do painel; o toque do mundo continua isolado com a tela aberta (ADR 0047).

## Consequências
- `Inventory.s` passa a 50 posições (índice 40 sem uso); `convertItem` e a migração continuam valendo para as três grades.
- Fora desta entrega: padrão de disposição (receitas com formato), arrastar parte de uma pilha e o mesmo botão para a grade pessoal.
