#!/usr/bin/env python3
"""Ícones de hotbar/bolsa dos materiais V2 novos (cubo 3/4: topo em cima, frente embaixo), a partir de top.png/front.png.

Uso: python3 scripts/make-material-icons.py <material> <nome-do-icone> [--front-share 0.42]
Ex.: python3 scripts/make-material-icons.py tora-de-cerejeira icon-block-cherry-log
Grava src/assets/<nome-do-icone>.webp (56×64, cantos arredondados e contorno escuro, como os ícones de bloco existentes).
Sem frente própria (front.png ausente) a frente repete o topo, como no jogo.
"""
import argparse
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
W, H = 56, 64
OUTLINE = (42, 26, 20, 255)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('material')
    ap.add_argument('icon')
    ap.add_argument('--front-share', type=float, default=0.42, help='fração da altura ocupada pela frente')
    args = ap.parse_args()
    d = ROOT / 'assets-src' / 'materiais' / args.material
    top = Image.open(d / 'top.png').convert('RGBA')
    front = Image.open(d / 'front.png').convert('RGBA') if (d / 'front.png').exists() else top
    fh = round(H * args.front_share)
    th = H - fh
    icon = Image.new('RGBA', (W, H))
    icon.alpha_composite(top.resize((W, th), Image.LANCZOS), (0, 0))
    icon.alpha_composite(front.crop((0, 0, front.width, round(front.height * fh / th))).resize((W, fh), Image.LANCZOS), (0, th))
    # Sombra suave na frente e linha de divisão.
    shade = Image.new('RGBA', (W, fh), (30, 20, 60, 46))
    icon.alpha_composite(shade, (0, th))
    mask = Image.new('L', (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, W - 1, H - 1), radius=6, fill=255)
    out = Image.new('RGBA', (W, H))
    border = ImageChops.subtract(mask, mask.resize((W, H)).crop((0, 0, W, H)).point(lambda v: 0))
    out.paste(icon, (0, 0), mask)
    edge = Image.new('RGBA', (W, H), OUTLINE)
    inner = Image.new('L', (W, H), 0)
    ImageDraw.Draw(inner).rounded_rectangle((2, 2, W - 3, H - 3), radius=4, fill=255)
    ring = ImageChops.subtract(mask, inner)
    out.paste(edge, (0, 0), ring)
    ImageDraw.Draw(out).line((2, th, W - 3, th), fill=(255, 255, 255, 60), width=1)
    path = ROOT / 'src' / 'assets' / f'{args.icon}.webp'
    out.save(path, 'WEBP', quality=92, alpha_quality=100, method=6)
    print(f'{path.relative_to(ROOT)} ({path.stat().st_size} B)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
