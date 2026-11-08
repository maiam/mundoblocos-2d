#!/usr/bin/env python3
"""Monta a tira de variantes de uma espécie de árvore (adulta; sem estágios de crescimento — v0.88.0).

Uso: python3 scripts/process-trees.py <especie> imagem1.png imagem2.png ... [--cut ALFA] [--width 420] [--scale S --frame LxA]
Cada imagem é uma árvore adulta inteira em PNG com alfa (fundo transparente). O script:
- guarda a imagem original em assets-src/arvores/<especie>/NN.png (fonte; nada é perdido);
- limpa o alfa (--cut zera brilhos/halos semitransparentes de fundo abaixo desse alfa; abertura remove pontinhos soltos
  que sobraram do recorte) e recorta o miolo;
- reduz todas pela MESMA escala (a árvore mais larga fica com --width px), mantendo as proporções entre as variantes;
- cola lado a lado, alinhadas pelo pé e centradas, em quadros iguais → src/assets/tree-<especie>.webp.
Duas tiras que precisam casar quadro a quadro (macieira carregada × colhida) usam a mesma escala e o mesmo quadro: rode a primeira,
leia "escala" e "quadro" no relatório e passe `--scale` e `--frame` à segunda.
O jogo lê a quantidade de quadros e a proporção de textures.ts (TREE_FRAMES); a variante de cada árvore é sorteada pela
posição (hash), então o mesmo mapa sempre sai igual. Depois: nada de optimize-assets (já sai em WebP).
"""
import argparse
import shutil
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent


def clean(img: Image.Image, cut: int) -> Image.Image:
    img = img.convert('RGBA')
    a = np.asarray(img.getchannel('A')).astype(np.float32)
    if cut:
        a = np.clip((a - cut) * (255.0 / (255 - cut)), 0, 255)  # halo semitransparente some; o miolo sólido fica
    la = Image.fromarray(a.astype(np.uint8), 'L')
    opened = la.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))  # tira pontinhos soltos (< 5 px)
    keep = opened.filter(ImageFilter.MaxFilter(5))
    la = Image.fromarray(np.minimum(np.asarray(la), np.asarray(keep)), 'L')
    out = img.copy()
    out.putalpha(la)
    return out.crop(la.point(lambda v: 255 if v > 8 else 0).getbbox())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('species')
    ap.add_argument('files', nargs='+')
    ap.add_argument('--cut', type=int, default=0)
    ap.add_argument('--width', type=int, default=420)
    ap.add_argument('--scale', type=float, default=0, help='escala fixa (em vez de --width)')
    ap.add_argument('--frame', default='', help='quadro fixo LxA (em vez do calculado)')
    args = ap.parse_args()
    src_dir = ROOT / 'assets-src' / 'arvores' / args.species
    src_dir.mkdir(parents=True, exist_ok=True)
    trees = []
    for i, f in enumerate(args.files, 1):
        shutil.copyfile(f, src_dir / f'{i:02d}.png')
        trees.append(clean(Image.open(f), args.cut))
    s = args.scale or args.width / max(t.width for t in trees)
    small = [t.resize((max(1, round(t.width * s)), max(1, round(t.height * s))), Image.LANCZOS) for t in trees]
    fw = max(t.width for t in small) + 4
    fh = max(t.height for t in small) + 4
    if args.frame:
        fw, fh = (int(v) for v in args.frame.lower().split('x'))
        assert all(t.width <= fw and t.height <= fh - 2 for t in small), 'quadro fixo pequeno demais'
    sheet = Image.new('RGBA', (fw * len(small), fh), (0, 0, 0, 0))
    for i, t in enumerate(small):
        sheet.alpha_composite(t, (i * fw + (fw - t.width) // 2, fh - 2 - t.height))
    out = ROOT / 'src' / 'assets' / f'tree-{args.species}.webp'
    sheet.save(out, 'WEBP', quality=90, alpha_quality=100, method=6)
    print(f'{args.species}: {len(small)} variantes, quadro {fw}×{fh}, escala {s:.3f} → {out.relative_to(ROOT)} ({out.stat().st_size // 1024} kB)')
    for i, t in enumerate(small, 1):
        print(f'  {i}: {t.width}×{t.height}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
