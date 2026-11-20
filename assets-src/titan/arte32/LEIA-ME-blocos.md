# Titã · Blocos da Margem Silenciosa

Seis ícones de inventário em 32 × 32 px com transparência binária. Cada ícone usa as texturas do terreno ou, no caso da Mesa de Trabalho, a malha e a textura do modelo do jogo. A vista 3/4 usa projeção ortográfica a 45° de azimute e 30° de elevação. A Mesa está orientada para expor o arco e a marca do tampo.

A largura desenhada da laje é a mesma da Rocha Escura. A vista em perspectiva revela o topo de ambas, portanto a altura aparente em pixels da laje é maior que metade da altura aparente do cubo.

## Atlas de interface

Células de 32 × 32 px em um atlas de 128 × 64 px. Origem no canto superior esquerdo, coordenadas em pixels. PNG e WebP sem perdas têm os mesmos pixels RGBA. As duas últimas células são transparentes.

| Bloco | ItemId | X | Y |
|---|---:|---:|---:|
| Areia ocre | 1 | 0 | 0 |
| Areia úmida | 2 | 32 | 0 |
| Rocha escura | 3 | 64 | 0 |
| Gelo fosco | 4 | 96 | 0 |
| Laje de rocha | 13 | 0 | 32 |
| Mesa de Trabalho | 9 | 32 | 32 |

Mapeie o ItemId explicitamente para a célula. Este atlas contém apenas os seis ícones da prancha e usa uma ordem própria. Use 32 px ou 64 px em CSS com `image-rendering: pixelated`. A prancha compara 64 px e 128 px sobre fundos escuros.

Fonte visual local do jogo no commit `318b451`. Os ícones foram conferidos na prancha. A validação na hotbar e na bolsa dentro do jogo está pendente.
