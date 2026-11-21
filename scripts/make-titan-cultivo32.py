"""Atlas do cultivo do Junco de Vidro (ADR 0083): 4 colunas de 32 × 32 px (muda, crescendo, adulto de duas mudas, ressecado) em `src/assets/titan-cultivo-32px.webp`.

Entradas : `assets-src/titan/cultivo/junco/01_muda_plantada.png`, `02_junco_crescendo.png`, `03_junco_adulto_duas_mudas.png`, `04_junco_ressecado.png` (arte do dono do produto, 32 × 32, transparente).
Saída    : WebP sem perdas, 128 × 32. A ordem das colunas é a de `spriteFrame` em `src/titan/crops.ts` (`CROP_FRAMES` = 4). Uso: python3 -I scripts/make-titan-cultivo32.py
"""
from PIL import Image

SRC = 'assets-src/titan/cultivo/junco/'
NAMES = ['01_muda_plantada', '02_junco_crescendo', '03_junco_adulto_duas_mudas', '04_junco_ressecado']
OUT = 'src/assets/titan-cultivo-32px.webp'


def main() -> None:
    atlas = Image.new('RGBA', (32 * len(NAMES), 32), (0, 0, 0, 0))
    for i, n in enumerate(NAMES):
        im = Image.open(f'{SRC}{n}.png').convert('RGBA')
        assert im.size == (32, 32), (n, im.size)
        atlas.paste(im, (i * 32, 0))
    atlas.save(OUT, 'WEBP', lossless=True, quality=100, method=6)
    print(OUT, atlas.size)


if __name__ == '__main__':
    main()
