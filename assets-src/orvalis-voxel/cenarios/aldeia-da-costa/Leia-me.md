# Orvalis — REGION_V6 · Aldeia da Costa

Seed reproduzível `128064`. Ilha com praia de areia, floresta e encostas rochosas ao norte. A aldeia fica no platô sudeste, com três talhões, dois cercados, quatro bases edificáveis e um muro de pedra com portões norte e sul.

| Parâmetro | Valor |
| --- | --- |
| Região horizontal | 128 × 128 colunas, de X/Z −64 a 63 inclusivos |
| Limites geométricos | Planos X/Z em −64 e +64 |
| Chunks | 8 × 8 de 16 × 16 blocos, índices −4 a 3 |
| Faixa vertical | Y −64 a 319, 384 camadas |
| Rocha-mãe | Y −64 em toda a região |
| Mar adotado | Y 63 |
| Superfície gerada | Y 34 a 119 |
| Platô da aldeia | Y 70 |
| Muro | Pedra, quatro blocos entre Y 71 e 74 |

## Leitura dos arquivos

- `REGION_V6_heightmap_128x128_16bit.png` — escala de cinza de 16 bits, linear. Leia os valores brutos sem correção de gama. Para uma amostra inteira `p`, o Y do voxel sólido mais alto é `round(p * 383 / 65535) - 64`.
- `REGION_V6_superficies.png` — máscara categórica de 8 bits. Os valores inteiros de 0 a 8 correspondem aos IDs descritos no JSON. Use amostragem por vizinho mais próximo.
- `REGION_V6_implantacao.json` — posições das árvores, trilha, limites dos talhões, cercados, bases das construções, células de muro e aberturas dos portões. A origem dos dois PNGs é a célula (−64, −64), no canto superior esquerdo. Colunas aumentam em +X (leste), linhas em +Z (sul).
- `REGION_V6_planta.png` — planta geral e ampliação da aldeia desenhadas a partir dos dados exportados.
- `gerar_region_v6.py` — fonte reproduzível com NumPy, SciPy, Pillow e Matplotlib.

Para montar as colunas no motor, coloque rocha-mãe em Y −64 e material sólido até o Y de superfície, inclusive. Para as colunas submersas, preencha do primeiro voxel acima do fundo até Y 63, inclusive, com água. Atribua os materiais de superfície pela máscara e instancie as estruturas pelo JSON. O muro de pedra da aldeia tem geometria própria. O limite invisível externo é configurado no motor sobre os quatro planos em X/Z −64 e +64.

## Validação

As 16.384 alturas inteiras foram recuperadas do PNG de 16 bits e conferidas com os dados gerados. A ilha e o mar são contínuos. Todas as células do perímetro estão sob água, com profundidade mínima de 9 blocos. Na grade, a navegação a partir do cruzamento da aldeia alcança a praia, os dois portões, os três talhões e o interior dos dois cercados com passos ortogonais de até um bloco de desnível. A importação e a colisão no jogo dependem do motor.
