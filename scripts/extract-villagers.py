#!/usr/bin/env python3
"""Moradores da Cidade do Despertar: personagens-base (roupa branca) + roupas em camadas.

Fontes em assets-src/villagers/ (folhas 4×4 transparentes, ordem frente, esquerda, direita, costas):
- villager-<cabelo>-sheet.png → src/assets/villager-<cabelo>.png (personagem com roupa branca);
- outfit-<nome>-sheet.png     → src/assets/outfit-<nome>.png (só a roupa: a cabeça careca da prancha é removida).

Todas as folhas passam pela MESMA grade, o MESMO recorte e a MESMA escala (caixa comum a todas), para que a roupa
desenhada por cima do personagem caia exatamente no lugar (render/character.ts desenha base + roupa).
Remoção da cabeça da roupa: em cada quadro acha a cabeça (maior região cor de pele ligada ao topo do desenho) e apaga
tudo acima do queixo; abaixo dele fica a roupa (mãos incluídas). Acima do queixo vale a cabeça do personagem-base.

Depois: python3 scripts/optimize-assets.py. `--preview <png>` grava uma folha com cada personagem vestido.
"""
import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'villagers'
OUT = ROOT / 'src' / 'assets'
FRAME_H = 144
COLS = ROWS = 4
ALPHA_MIN = 48  # resíduos fracos do fundo (os pontinhos vermelhos têm alfa 1) viram transparência


def cells_of(path: Path):
    a = np.asarray(Image.open(path).convert('RGBA')).copy()
    a[..., 3][a[..., 3] < ALPHA_MIN] = 0
    H, W = a.shape[:2]
    ch, cw = H / ROWS, W / COLS
    return [a[round(r * ch):round((r + 1) * ch), round(c * cw):round((c + 1) * cw)].copy()
            for r in range(ROWS) for c in range(COLS)]


def keep_largest(cell):
    """Só o maior pedaço opaco (8-vizinhança) + a borda suave encostada nele."""
    m = cell[..., 3] >= 64
    h, w = m.shape
    label = np.zeros((h, w), np.int32)
    best, best_n, cur = 0, 0, 0
    for sy, sx in zip(*np.nonzero(m)):
        if label[sy, sx]:
            continue
        cur += 1
        label[sy, sx] = cur
        q, n = deque([(sy, sx)]), 0
        while q:
            y, x = q.popleft()
            n += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and m[ny, nx] and not label[ny, nx]:
                        label[ny, nx] = cur
                        q.append((ny, nx))
        if n > best_n:
            best, best_n = cur, n
    keep = label == best
    grown = keep.copy()
    grown[1:, :] |= keep[:-1, :]; grown[:-1, :] |= keep[1:, :]
    grown[:, 1:] |= keep[:, :-1]; grown[:, :-1] |= keep[:, 1:]
    cell[..., 3][~grown] = 0


def strip_head(cell):
    """Apaga a cabeça careca: tudo acima do queixo (fundo da região de pele que contém o alto do desenho)."""
    rgb = cell[..., :3].astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    skin = (cell[..., 3] > 128) & (r > 200) & (g > 150) & (b > 120) & (r - b > 20) & (r - g < 70)
    ys, xs = np.nonzero(cell[..., 3] > 128)
    top = ys.min()
    # Semente: pele na coluna do meio do desenho, um pouco abaixo do topo.
    cx = int((xs.min() + xs.max()) / 2)
    seed = next(((y, x) for y in range(top, top + 120) for x in range(cx - 30, cx + 31) if skin[y, x]), None)
    if seed is None:
        raise SystemExit('cabeça não encontrada no quadro')
    seen = np.zeros_like(skin)
    seen[seed] = True
    q = deque([seed])
    chin = seed[0]
    h, w = skin.shape
    while q:
        y, x = q.popleft()
        chin = max(chin, y)
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and skin[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))
    cell[:chin + 1, :, 3] = 0
    return chin


def main():
    bases = sorted(SRC.glob('villager-*-sheet.png'))
    outfits = sorted(SRC.glob('outfit-*-sheet.png'))
    sheets = {p: cells_of(p) for p in bases + outfits}
    for cells in sheets.values():
        for cell in cells:
            keep_largest(cell)
    # Caixa comum a TODAS as folhas (alinhamento entre personagem e roupa), centrada na largura do quadro.
    mh = min(c.shape[0] for cs in sheets.values() for c in cs)
    mw = min(c.shape[1] for cs in sheets.values() for c in cs)
    ys, xs = [], []
    for cs in sheets.values():
        for c in cs:
            yy, xx = np.nonzero(c[:mh, :mw, 3] > 0)
            ys += [yy.min(), yy.max()]; xs += [xx.min(), xx.max()]
    top, bottom = min(ys), max(ys) + 1
    half = max(mw / 2 - min(xs), max(xs) + 1 - mw / 2)
    left, right = max(0, int(mw / 2 - half)), min(mw, int(mw / 2 + half))
    for p in outfits:
        for c in sheets[p]:
            strip_head(c)
    scale = FRAME_H / (bottom - top)
    fw = int(round((right - left) * scale))
    made = {}
    for p, cs in sheets.items():
        sheet = Image.new('RGBA', (fw * COLS, FRAME_H * ROWS))
        for i, c in enumerate(cs):
            crop = Image.fromarray(c[top:bottom, left:right], 'RGBA')
            frame = crop.convert('RGBa').resize((fw, FRAME_H), Image.LANCZOS).convert('RGBA')
            sheet.paste(frame, ((i % COLS) * fw, (i // COLS) * FRAME_H))
        name = p.name.replace('-sheet.png', '.png')
        sheet.save(OUT / name, optimize=True)
        made[name] = sheet
        print(f'{name}: quadros {fw}x{FRAME_H}, desenho na origem {bottom - top}px (célula {mh}px)')
    if '--preview' in sys.argv:
        dest = Path(sys.argv[sys.argv.index('--preview') + 1])
        vs = [made[p.name.replace('-sheet.png', '.png')] for p in bases]
        os_ = [made[p.name.replace('-sheet.png', '.png')] for p in outfits]
        W, H = vs[0].size
        prev = Image.new('RGBA', (W * len(os_), H * len(vs)), (90, 140, 90, 255))
        for i, v in enumerate(vs):
            for j, o in enumerate(os_):
                t = v.copy()
                t.alpha_composite(o)
                prev.alpha_composite(t, (j * W, i * H))
        prev.save(dest)
        print('prévia:', dest)


if __name__ == '__main__':
    main()
