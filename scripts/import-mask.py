#!/usr/bin/env python3
"""Importa uma máscara de transição horizontal (Padrão V2, ADR 0023, assets-src/materiais/CONTRATO.md).

Uso: python3 scripts/import-mask.py <nome> arquivo.png
A máscara é uma FORMA: só o alfa vale (a cor do arquivo é descartada: a textura que aparece por ela vem do material que
avança). Orientação do arquivo: a parte sólida fica à ESQUERDA e a borda irregular aponta para a DIREITA (o material que
avança vem do oeste); o `build-materials.py` gira para as outras direções e monta os cantos.
Reduz para 256×256 com alfa pré-multiplicado, zera o ruído do alfa e grava em assets-src/materiais/_mascaras/<nome>.png.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SIZE = 256


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    name, path = sys.argv[1], sys.argv[2]
    img = Image.open(path).convert('RGBA')
    if img.size[0] != img.size[1]:
        print(f'a máscara precisa ser quadrada (veio {img.size})', file=sys.stderr)
        return 1
    a = np.asarray(img)[..., 3]
    white = Image.fromarray(np.dstack([np.full_like(a, 255)] * 3 + [a]), 'RGBA')  # só o alfa vale
    small = np.array(white.convert('RGBa').resize((SIZE, SIZE), Image.LANCZOS).convert('RGBA'))
    small[..., :3] = 255
    small[small[..., 3] < 8] = (255, 255, 255, 0)
    out = ROOT / 'assets-src' / 'materiais' / '_mascaras' / f'{name}.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(small, 'RGBA').save(out)
    cov = (small[..., 3] > 128).mean(0)
    solid = int(np.where(cov > 0.98)[0].max()) + 1
    reach = int(np.where(cov > 0)[0].max()) + 1
    print(f'{name}: sólida até {solid / SIZE:.0%} da largura, dedos até {reach / SIZE:.0%} → {out.relative_to(ROOT)}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
