#!/usr/bin/env python3
"""Pipeline do Padrão de Materiais V2 (ADR 0023, assets-src/materiais/CONTRATO.md).

Lê assets-src/materiais/<material>/{top,front,front_overlay}.png (128×128), valida o contrato e gera:
  src/assets/materials-v2.webp   — atlas, uma coluna de 64 px por material (TEX_RES 2):
      linha top      64×64  ← top.png inteiro
      linha front    64×36  ← front.png (0,0,128,72) — frente de 18 px no mundo (CUBE_FRONT); sem front.png, o topo
      linha overlay  64×36  ← front_overlay.png, mesma janela (transparente se o material não tem franja)
  src/assets/materials-v2.json   — manifesto {cell, rows: {nome: [y, h]}, materials: [nomes], overlay: [nomes]}
Relatório: emenda do topo e da frente relativa ao miolo (1,0 = invisível; ⚠ acima de 1,6);
--preview grava um 3×3 de cada topo e a frente repetida 3× em assets-src/materiais/_preview/ (fora do git).
Redução: LANCZOS (suavizada; contrato § 7). Já sai em WebP sem perdas (não precisa de optimize-assets.py).
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets-src' / 'materiais'
OUT_IMG = ROOT / 'src' / 'assets' / 'materials-v2.webp'
OUT_JSON = ROOT / 'src' / 'assets' / 'materials-v2.json'
SIZE = 128
CELL = 64
# Frente de 18 (decisão de 2026-11-07, ADR 0023): janela 128×72 → 64×36 no atlas → 32×18 no mundo.
WINDOW = 72
FRINGE = 32  # altura máxima da franja na fonte (8 px no mundo)
ROWS = [('top', None, 64), ('front', WINDOW, 36), ('overlay', WINDOW, 36)]
SEAM_WARN = 1.6  # emenda / vizinhança interna: acima disso a costura provavelmente aparece no jogo


def edge_diff(a: np.ndarray, b: np.ndarray) -> float:
    m = (a[..., 3] > 0) & (b[..., 3] > 0)
    if not m.any():
        return 0.0
    return float(np.abs(a[..., :3].astype(int) - b[..., :3].astype(int))[m].mean())


def wrap_resize(img: Image.Image, w: int, h: int, vertical: bool) -> Image.Image:
    """Reduz como ladrilho: repete a imagem em volta antes de reduzir, para a borda continuar no lado oposto (reduzir
    o quadro solto 'estica' o pixel da borda e o chão ganha um fio em cada emenda). A frente só repete na horizontal."""
    iw, ih = img.size
    ny = 3 if vertical else 1
    big = Image.new('RGBA', (iw * 3, ih * ny))
    for i in range(3):
        for j in range(ny):
            big.paste(img, (i * iw, j * ih))
    big = big.resize((w * 3, h * ny), Image.LANCZOS)
    return big.crop((w, h if vertical else 0, w * 2, h * 2 if vertical else h))


def load(path: Path, errors: list[str]) -> Image.Image | None:
    if not path.exists():
        return None
    img = Image.open(path).convert('RGBA')
    if img.size != (SIZE, SIZE):
        errors.append(f'{path.relative_to(ROOT)}: {img.size[0]}×{img.size[1]} (precisa ser {SIZE}×{SIZE})')
        return None
    return img


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('--preview', action='store_true', help='grava 3×3 dos topos e frentes repetidas em _preview/')
    args = ap.parse_args()
    names = sorted(p.name for p in SRC.iterdir() if p.is_dir() and not p.name.startswith('_'))
    errors: list[str] = []
    mats = []
    for n in names:
        top = load(SRC / n / 'top.png', errors)
        # Sem frente própria, a frente repete o topo (regra do dono do produto).
        front = load(SRC / n / 'front.png', errors) or top
        over = load(SRC / n / 'front_overlay.png', errors)
        if top is None:
            errors.append(f'{n}: precisa de top.png')
            continue
        t = np.asarray(top)
        if (t[..., 3] < 255).any():
            errors.append(f'{n}/top.png: topo precisa cobrir o quadrado inteiro (sem transparência)')
        f = np.asarray(front)
        if (f[:WINDOW, :, 3] < 255).any():
            errors.append(f'{n}/front.png: a janela útil (0,0,128,{WINDOW}) precisa ser opaca')
        fringe = 0
        if over is not None:
            oa = np.asarray(over)[..., 3]
            rows_on = np.where(oa.max(1) > 0)[0]
            fringe = int(rows_on.max()) + 1 if len(rows_on) else 0
            if fringe > FRINGE:
                errors.append(f'{n}/front_overlay.png: franja de {fringe} px (contrato: até {FRINGE}; '
                              'scripts/import-material.py --fit-fringe)')
        # Emenda relativa: diferença entre as bordas que se encostam ÷ diferença média entre colunas/linhas vizinhas
        # do miolo (textura pintada sempre varia um pouco de pixel a pixel; 1 = emenda invisível).
        base_x = np.mean([edge_diff(t[:, i:i + 1], t[:, i + 1:i + 2]) for i in range(1, SIZE - 2)]) or 1
        base_y = np.mean([edge_diff(t[i:i + 1], t[i + 1:i + 2]) for i in range(1, SIZE - 2)]) or 1
        seam_top = max(edge_diff(t[:, :1], t[:, -1:]) / base_x, edge_diff(t[:1], t[-1:]) / base_y)
        fb = np.mean([edge_diff(f[:WINDOW, i:i + 1], f[:WINDOW, i + 1:i + 2]) for i in range(1, SIZE - 2)]) or 1
        seam_front = edge_diff(f[:WINDOW, :1], f[:WINDOW, -1:]) / fb
        flag = lambda v: ' ⚠' if v > SEAM_WARN else ''
        print(f'{n:10s} emenda topo {seam_top:4.2f}{flag(seam_top)}  frente {seam_front:4.2f}{flag(seam_front)}'
              f'  overlay {f"franja {fringe} px" if over is not None else "não"}'
              f'{"  (PROVISÓRIO)" if (SRC / n / "PROVISORIO.txt").exists() else ""}')
        mats.append((n, top, front, over))
        if args.preview:
            pv = SRC / '_preview'
            pv.mkdir(exist_ok=True)
            g = Image.new('RGBA', (SIZE * 3, SIZE * 3))
            for i in range(9):
                g.paste(top, ((i % 3) * SIZE, (i // 3) * SIZE))
            g.save(pv / f'{n}-top-3x3.png')
            r = Image.new('RGBA', (SIZE * 3, WINDOW))
            for i in range(3):
                r.paste(front.crop((0, 0, SIZE, WINDOW)), (i * SIZE, 0))
            r.save(pv / f'{n}-front-3x.png')
    if errors:
        print('\n'.join('ERRO ' + e for e in errors), file=sys.stderr)
        return 1
    height = sum(h for _, _, h in ROWS)
    atlas = Image.new('RGBA', (CELL * len(mats), height))
    rows = {}
    y = 0
    for key, src_h, h in ROWS:
        rows[key] = [y, h]
        for i, (_, top, front, over) in enumerate(mats):
            if key == 'top':
                img = top
            elif key == 'front':
                img = front.crop((0, 0, SIZE, src_h))
            elif over is not None:
                img = over.crop((0, 0, SIZE, src_h))
            else:
                continue
            atlas.paste(wrap_resize(img, CELL, h, vertical=key == 'top'), (i * CELL, y))
        y += h
    # Sem perdas: o WebP com perdas mistura a cor da coluna vizinha nas bordas (fio na emenda do chão).
    atlas.save(OUT_IMG, 'WEBP', lossless=True, method=6)
    manifest = {'cell': CELL, 'rows': rows, 'materials': [m[0] for m in mats],
                'overlay': [m[0] for m in mats if m[3] is not None]}
    OUT_JSON.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'{OUT_IMG.relative_to(ROOT)} {atlas.size[0]}×{atlas.size[1]} ({OUT_IMG.stat().st_size // 1024} kB) + manifesto')
    return 0


if __name__ == '__main__':
    sys.exit(main())
