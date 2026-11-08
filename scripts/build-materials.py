#!/usr/bin/env python3
"""Pipeline do Padrão de Materiais V2 (ADR 0023, assets-src/materiais/CONTRATO.md).

Lê assets-src/materiais/<material>/{top,front,front_overlay}.png (128×128), valida o contrato e gera:
  src/assets/materials-v2.webp   — atlas, uma coluna de 64 px por material (TEX_RES 2):
      linha top      64×64  ← top.png inteiro
      linha front    64×64  ← front.png INTEIRO (textura seamless nas 4 bordas, como o topo); sem front.png, o topo.
                             O motor fatia: cada nível de uma pilha lê as próximas 72 linhas (18 px no mundo), voltando
                             ao início no fim — a parede fica contínua na vertical (ADR 0023)
      linha overlay  64×36  ← front_overlay.png, janela 128×72 (só o nível mais alto da pilha usa)
  src/assets/materials-v2.json   — manifesto {cell, rows: {nome: [y, h]}, materials: [nomes], overlay: [nomes]}
Máscaras de transição (assets-src/materiais/_mascaras/<forma>.png, de scripts/import-mask.py): FORMA só de alfa, sólida à
esquerda e irregular à direita (o material que avança vem do oeste). O script gira a forma para as outras três direções
(rotação da FORMA é permitida; a textura que aparece por ela nunca gira) e monta os 4 cantos (só vizinho diagonal) como a
interseção de duas bordas recuadas. Saída: src/assets/transitions-v2.webp, uma linha por forma (de scripts/import-transition.py;
formas com <forma>.overlay.png trazem a faixa pintada), 24 células de 64 px: 8 máscaras, 8 halos (fora da forma) e 8
espumas (dentro), na ordem N, E, S, W, NE, SE, SW, NW (manifesto: "masks").
Relatório: emenda do topo e da frente (horizontal e vertical) relativa ao miolo (1,0 = invisível; ⚠ acima de 1,6);
--preview grava um 3×3 de cada topo e de cada frente em assets-src/materiais/_preview/ (fora do git).
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
MASKS_DIR = SRC / '_mascaras'
OUT_MASKS = ROOT / 'src' / 'assets' / 'transitions-v2.webp'
MASK_ORDER = ['N', 'E', 'S', 'W', 'NE', 'SE', 'SW', 'NW']
CORNER_PULL = 0.42  # quanto cada borda recua para o canto ficar só uma ponta (fração da célula)
SIZE = 128
CELL = 64
# Frente de 18 (decisão de 2026-11-07, ADR 0023): janela 128×72 → 64×36 no atlas → 32×18 no mundo.
WINDOW = 72
FRINGE = 32  # altura máxima da franja na fonte (8 px no mundo)
ROWS = [('top', None, 64), ('front', None, 64), ('overlay', WINDOW, 36)]
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


def shift(a: np.ndarray, dx: int, dy: int) -> np.ndarray:
    """Desloca o alfa (dx, dy) px sem repetir: o que sai do quadro some e o resto fica transparente."""
    out = np.zeros_like(a)
    h, w = a.shape
    ys, yd = (slice(0, h - dy), slice(dy, h)) if dy >= 0 else (slice(-dy, h), slice(0, h + dy))
    xs, xd = (slice(0, w - dx), slice(dx, w)) if dx >= 0 else (slice(-dx, w), slice(0, w + dx))
    out[yd, xd] = a[ys, xs]
    return out


def soft(a: np.ndarray, r: int) -> np.ndarray:
    """Média em caixa (r px) de um plano 2D, para dilatar uma máscara de forma suave."""
    k = 2 * r + 1
    out = a.astype(np.float32)
    for axis in (0, 1):
        pad = [(0, 0), (0, 0)]
        pad[axis] = (r, r)
        c = np.cumsum(np.pad(out, pad, mode='edge'), axis=axis, dtype=np.float64)
        c = np.concatenate([np.zeros_like(np.take(c, [0], axis=axis)), c], axis=axis)
        out = ((np.take(c, range(k, c.shape[axis]), axis=axis) - np.take(c, range(0, c.shape[axis] - k), axis=axis)) / k).astype(np.float32)
    return out


def build_masks() -> list[str]:
    """Atlas das formas: por forma, 8 máscaras (as 4 bordas = forma girada; os 4 cantos = interseção de duas bordas
    recuadas) e 8 faixas pintadas (espuma/água rasa/halo, só nas formas com `.overlay.png`; mesma geometria)."""
    shapes = sorted(p.stem for p in MASKS_DIR.glob('*.png') if not p.stem.endswith('.overlay')) if MASKS_DIR.exists() else []
    if not shapes:
        return []
    cell = CELL
    atlas = Image.new('RGBA', (cell * len(MASK_ORDER) * 3, cell * len(shapes)))
    with_overlay: list[str] = []
    pull = int(round(cell * CORNER_PULL))
    rotations = {'W': None, 'N': -90, 'E': 180, 'S': 90}  # o material que avança vem do lado indicado
    corners = {'NE': ('N', 'E'), 'SE': ('S', 'E'), 'SW': ('S', 'W'), 'NW': ('N', 'W')}

    def rot(img: Image.Image, k: str) -> Image.Image:
        return img if rotations[k] is None else img.rotate(rotations[k])

    def pulled(arr: np.ndarray, k: str) -> np.ndarray:  # cada borda recua em direção ao próprio lado
        return {'W': lambda a: shift4(a, -pull, 0), 'E': lambda a: shift4(a, pull, 0),
                'N': lambda a: shift4(a, 0, -pull), 'S': lambda a: shift4(a, 0, pull)}[k](arr)

    for row, name in enumerate(shapes):
        src = Image.open(MASKS_DIR / f'{name}.png').convert('RGBA')
        w = src.resize((cell, cell), Image.LANCZOS).getchannel('A')
        edge = {k: np.asarray(rot(w, k)).astype(np.float32) for k in rotations}
        pm = {k: pulled(edge[k], k) for k in rotations}
        cells = dict(edge)
        for k, (a, b) in corners.items():
            cells[k] = pm[a] * pm[b] / 255.0
        for i, key in enumerate(MASK_ORDER):
            alpha = Image.fromarray(np.clip(cells[key], 0, 255).astype(np.uint8), 'L')
            white = Image.new('RGBA', (cell, cell), (255, 255, 255, 0))
            white.putalpha(alpha)
            atlas.paste(white, (i * cell, row * cell))
        ov_path = MASKS_DIR / f'{name}.overlay.png'
        if ov_path.exists():
            with_overlay.append(name)
            ov = Image.open(ov_path).convert('RGBA').convert('RGBa').resize((cell, cell), Image.LANCZOS)  # alfa pré-multiplicado
            ev = {k: np.asarray(rot(ov, k)).astype(np.float32) for k in rotations}  # RGBa (cor já × alfa)
            pv = {k: pulled(ev[k], k) for k in rotations}
            ocells = dict(ev)
            for k, (a, b) in corners.items():
                # Perto da divisa de A só vale onde o canto (a metade de B recuada, dilatada) está; e vice-versa.
                near_b = np.clip(soft(pm[b], max(2, pull // 3)) / 255.0 * 2, 0, 1)[..., None]
                near_a = np.clip(soft(pm[a], max(2, pull // 3)) / 255.0 * 2, 0, 1)[..., None]
                ca = pv[a] * near_b
                cb = pv[b] * near_a
                ocells[k] = ca + cb * (1 - ca[..., 3:4] / 255.0)  # 'over' em RGBa
            for i, key in enumerate(MASK_ORDER):
                # Duas camadas: o halo do lado de FORA da forma (areia molhada etc., desenhado ANTES das peças, para outra
                # peça de água cobrir) e a espuma do lado de DENTRO (por cima); assim a faixa de uma borda não suja a água
                # que outra borda da mesma célula já pôs.
                inside = ocells[key] * (cells[key] / 255.0)[..., None]
                for part, layer in ((1, ocells[key] - inside), (2, inside)):
                    img = Image.fromarray(np.clip(layer, 0, 255).astype(np.uint8), 'RGBa').convert('RGBA')
                    atlas.paste(img, ((part * len(MASK_ORDER) + i) * cell, row * cell))
        print(f'forma {name}: 4 bordas + 4 cantos' + (' + faixa pintada' if name in with_overlay else ''))
    atlas.save(OUT_MASKS, 'WEBP', lossless=True, method=6)
    print(f'{OUT_MASKS.relative_to(ROOT)} {atlas.size[0]}×{atlas.size[1]} ({OUT_MASKS.stat().st_size // 1024} kB)')
    build_masks.overlay = with_overlay  # type: ignore[attr-defined]
    return shapes


def shift4(a: np.ndarray, dx: int, dy: int) -> np.ndarray:
    """`shift` para um plano 2D ou H×W×C (só desloca os dois primeiros eixos)."""
    if a.ndim == 2:
        return shift(a, dx, dy)
    return np.dstack([shift(a[..., c], dx, dy) for c in range(a.shape[2])])


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
        if (f[..., 3] < 255).any():
            errors.append(f'{n}/front.png: a frente precisa cobrir o quadrado inteiro (sem transparência)')
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
        fbx = np.mean([edge_diff(f[:, i:i + 1], f[:, i + 1:i + 2]) for i in range(1, SIZE - 2)]) or 1
        fby = np.mean([edge_diff(f[i:i + 1], f[i + 1:i + 2]) for i in range(1, SIZE - 2)]) or 1
        seam_front = max(edge_diff(f[:, :1], f[:, -1:]) / fbx, edge_diff(f[:1], f[-1:]) / fby)
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
            r = Image.new('RGBA', (SIZE * 3, SIZE * 3))
            for i in range(9):
                r.paste(front, ((i % 3) * SIZE, (i // 3) * SIZE))
            r.save(pv / f'{n}-front-3x3.png')
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
                img = front
            elif over is not None:
                img = over.crop((0, 0, SIZE, src_h))
            else:
                continue
            atlas.paste(wrap_resize(img, CELL, h, vertical=key in ('top', 'front')), (i * CELL, y))
        y += h
    # Sem perdas: o WebP com perdas mistura a cor da coluna vizinha nas bordas (fio na emenda do chão).
    atlas.save(OUT_IMG, 'WEBP', lossless=True, method=6)
    manifest = {'cell': CELL, 'rows': rows, 'materials': [m[0] for m in mats],
                'overlay': [m[0] for m in mats if m[3] is not None]}
    shapes = build_masks()
    if shapes:
        manifest['masks'] = {'cell': CELL, 'order': MASK_ORDER, 'shapes': shapes, 'overlay': build_masks.overlay}  # type: ignore[attr-defined]
    OUT_JSON.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'{OUT_IMG.relative_to(ROOT)} {atlas.size[0]}×{atlas.size[1]} ({OUT_IMG.stat().st_size // 1024} kB) + manifesto')
    return 0


if __name__ == '__main__':
    sys.exit(main())
