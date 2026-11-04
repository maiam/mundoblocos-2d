#!/usr/bin/env python3
"""Moradores da Cidade do Despertar: personagens-base (roupa branca) + roupas em camadas.

Fontes em assets-src/villagers/ (folhas 4×4 transparentes, ordem frente, esquerda, direita, costas):
- villager-<cabelo>-sheet.png → src/assets/villager-<cabelo>.png (personagem com roupa branca);
- outfit-<nome>-sheet.png     → src/assets/outfit-<nome>.png (só a roupa: a cabeça careca da prancha é removida).

Folha que não veio transparente (fundo claro): o fundo ligado à borda de cada quadro é removido (`remove_bg`).
Todas as folhas passam pela MESMA grade, o MESMO recorte e a MESMA escala (caixa comum a todas), para que a roupa
desenhada por cima do personagem caia exatamente no lugar (render/character.ts desenha base + roupa).
Remoção da cabeça da roupa: em cada quadro acha a cabeça (maior região cor de pele ligada ao topo do desenho) e apaga
tudo acima do queixo; abaixo dele fica a roupa (mãos incluídas). Acima do queixo vale a cabeça do personagem-base.

Expressões (assets-src/expressions/expressions-<front|left|right>-sheet.png: 16 rostos num personagem careca de roupa
branca, um por quadro, na ordem de `EXPRESSIONS`) → src/assets/expr-<id>.png (o rosto, desenhado POR CIMA do personagem)
+ expr-<id>-fx.png (efeitos fora do rosto: zzz, veia de raiva, tracinhos de susto; por cima do cabelo) e, para cada
personagem-base, villager-<cabelo>-bangs.png (a franja/mechas que caem sobre a área do rosto, redesenhadas por cima da
expressão). Ordem no render: base → expressão → franja → efeitos → roupa. O careca vem de outro molde (escala e posição
diferentes): `CALIB` leva a expressão 0 de cada folha ao rosto do morador loiro na coluna 0 (medido uma vez por
sobreposição); o deslocamento de cada quadro vem do topo da cabeça careca e, no morador, da caminhada (busca por
semelhança). Costas não têm rosto (linha vazia).

Depois: python3 scripts/optimize-assets.py. `--preview <png>` grava uma folha com cada personagem vestido e
`--expr-preview <png>` uma com as 16 expressões em cada personagem-base.
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
EXPR_SRC = ROOT / 'assets-src' / 'expressions'
# Ordem dos 16 quadros das folhas de expressão (linha a linha) — mesma lista em game/villager.ts (EXPRESSIONS).
EXPRESSIONS = ['calm', 'happy', 'smile', 'laugh', 'surprised', 'wink', 'content', 'excited',
               'sad', 'scared', 'angry', 'smug', 'guffaw', 'neutral', 'shy', 'sleepy']
# Pixel da expressão 0 (careca) → pixel do morador loiro na coluna 0 da mesma direção: v = s·b + (dx, dy).
CALIB = {'front': (1.08, -8, -14), 'left': (1.08, -13, -23), 'right': (1.0, -1, -17)}
DIR_ROW = {'front': 0, 'left': 1, 'right': 2}
SKIN = np.array([250, 218, 200])


def remove_bg(cell):
    """Fundo claro/semitransparente ligado à borda do quadro (folha que não veio transparente): flood fill por pixels
    de alfa < 235 ou claros e pouco saturados. O contorno escuro do desenho segura o avanço (a camisa branca fica)."""
    rgb = cell[..., :3].astype(int)
    mx, mn = rgb.max(axis=2), rgb.min(axis=2)
    like = (cell[..., 3] < 235) | ((mn > 190) & (mx - mn < 24))
    h, w = like.shape
    bg = np.zeros((h, w), bool)
    q = deque((y, x) for y in range(h) for x in (0, w - 1) if like[y, x])
    q.extend((y, x) for x in range(w) for y in (0, h - 1) if like[y, x])
    for y, x in q:
        bg[y, x] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
            if 0 <= ny < h and 0 <= nx < w and like[ny, nx] and not bg[ny, nx]:
                bg[ny, nx] = True
                q.append((ny, nx))
    cell[..., 3][bg] = 0


def cells_of(path: Path):
    a = np.asarray(Image.open(path).convert('RGBA')).copy()
    opaque = (a[..., 3] < ALPHA_MIN).mean() < 0.4  # folha sem transparência de verdade (fundo claro)
    a[..., 3][a[..., 3] < ALPHA_MIN] = 0
    H, W = a.shape[:2]
    ch, cw = H / ROWS, W / COLS
    cells = [a[round(r * ch):round((r + 1) * ch), round(c * cw):round((c + 1) * cw)].copy()
             for r in range(ROWS) for c in range(COLS)]
    if opaque:
        for c in cells:
            remove_bg(c)
    return cells


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


def components(mask):
    """Rótulos (8-vizinhança) e tamanhos dos pedaços de uma máscara."""
    h, w = mask.shape
    label = np.zeros((h, w), np.int32)
    sizes = [0]
    for sy, sx in zip(*np.nonzero(mask)):
        if label[sy, sx]:
            continue
        k = len(sizes)
        label[sy, sx] = k
        q, n = deque([(sy, sx)]), 0
        while q:
            y, x = q.popleft()
            n += 1
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not label[ny, nx]:
                        label[ny, nx] = k
                        q.append((ny, nx))
        sizes.append(n)
    return label, sizes


def skinlike(rgb):
    """Pele ou blush rosado (o resto, na área do rosto, é traço do rosto ou cabelo)."""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    # Pele é quente (r − b > 25) e com azul alto (o loiro tem azul baixo; o brilho do cabelo escuro é cinza, sem calor).
    return ((np.abs(rgb - SKIN).sum(axis=2) < 80) & (r - b > 25) & (b > 165)) | ((r > 200) & (g > 135) & (b > 125) & (r - b > 30))


def shifted(img, s, ox, oy, shape):
    """`img` (RGBA) escalada por `s` e posta em (ox, oy) numa tela do tamanho `shape`."""
    im = Image.fromarray(img)
    if s != 1:
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    canvas = Image.new('RGBA', (shape[1], shape[0]))
    canvas.paste(im, (int(round(ox)), int(round(oy))))
    return np.asarray(canvas).copy()


def head_anchor(body):
    """Topo da cabeça careca e centro das linhas logo abaixo dele."""
    ys, xs = np.nonzero(body[..., 3] > 128)
    top = ys.min()
    band = body[top + 5:top + 40, :, 3] > 128
    return float(np.nonzero(band)[1].mean()), float(top)


def walk_shift(ref, cur):
    """Deslocamento (dx, dy) da cabeça do morador num quadro da caminhada em relação à coluna 0."""
    ys, _ = np.nonzero(ref[..., 3] > 128)
    y0, y1 = ys.min(), ys.min() + 190
    a = ref[y0:y1].astype(np.float32)
    best = (1e18, (0, 0))
    for dy in range(-24, 25):
        for dx in range(-24, 25):
            if y0 + dy < 0:
                continue
            b = np.roll(cur, -dx, axis=1)[y0 + dy:y1 + dy].astype(np.float32)
            if b.shape != a.shape:
                continue
            cost = np.abs(a - b).sum()
            if cost < best[0]:
                best = (cost, (dx, dy))
    return best[1]


def build_expressions(bases, top, bottom, left, right, fw):
    """Camadas de expressão (rosto + efeitos) e franjas por personagem-base, já no quadro final (ver docstring)."""
    out = {}
    sheets = {d: cells_of(EXPR_SRC / f'expressions-{d}-sheet.png') for d in DIR_ROW}
    # Quadros da grade têm 313 ou 314 px (arredondamento): tudo numa tela comum, ancorada no canto superior esquerdo.
    hh = max(c.shape[0] for cs in list(bases.values()) + list(sheets.values()) for c in cs)
    ww = max(c.shape[1] for cs in list(bases.values()) + list(sheets.values()) for c in cs)
    pad = lambda c: np.pad(c, ((0, hh - c.shape[0]), (0, ww - c.shape[1]), (0, 0)))
    bases = {n: [pad(c) for c in cs] for n, cs in bases.items()}
    sheets = {d: [pad(c) for c in cs] for d, cs in sheets.items()}
    ref = bases['blond']
    cell_shape = ref[0].shape
    face = {e: [np.zeros(cell_shape, np.uint8) for _ in range(COLS * ROWS)] for e in EXPRESSIONS}
    fx = {e: [np.zeros(cell_shape, np.uint8) for _ in range(COLS * ROWS)] for e in EXPRESSIONS}
    bangs = {n: [np.zeros(cell_shape, np.uint8) for _ in range(COLS * ROWS)] for n in bases}
    for d, row in DIR_ROW.items():
        s, dx, dy = CALIB[d]
        cells = sheets[d]
        bodies = []
        for c in cells:
            b = c.copy()
            keep_largest(b)
            bodies.append(b)
        a0 = head_anchor(bodies[0])
        shifts_v = [walk_shift(ref[row * COLS], ref[row * COLS + k]) for k in range(COLS)]
        # Traços do rosto de cada expressão (no quadro do morador, coluna 0) → janela comum do rosto.
        placed, feats = {}, []
        for i, e in enumerate(EXPRESSIONS):
            ax, ay = head_anchor(bodies[i])
            ox, oy = dx - s * (ax - a0[0]), dy - s * (ay - a0[1])
            body = shifted(bodies[i], s, ox, oy, cell_shape)
            extra = cells[i].copy()
            extra[..., 3][bodies[i][..., 3] > 0] = 0
            lab, sizes = components(extra[..., 3] > 0)
            small = np.isin(lab, [k for k, n in enumerate(sizes) if n < 40])
            extra[..., 3][small] = 0
            placed[e] = (body, shifted(extra, s, ox, oy, cell_shape))
            al = body[..., 3] > 200
            ys_, xs_ = np.nonzero(al)
            htop = ys_.min()
            inner = al.copy()
            for _ in range(9):  # longe do contorno da cabeça
                inner[1:] &= al[:-1] & inner[1:]; inner[:-1] &= inner[1:]; inner[:, 1:] &= inner[:, :-1]; inner[:, :-1] &= inner[:, 1:]
            f = inner & ~skinlike(body[..., :3].astype(int))
            f[:htop + int(0.30 * 160)] = False
            f[htop + 175:] = False
            hx = np.nonzero(al[htop + 5:htop + 60])[1]
            cx0, cx1 = hx.min(), hx.max()
            if d == 'front':
                m = (cx1 - cx0) * 0.18
                f[:, :int(cx0 + m)] = False; f[:, int(cx1 - m):] = False
            elif d == 'right':
                f[:, :int((cx0 + cx1) / 2)] = False
            else:
                f[:, int((cx0 + cx1) / 2):] = False
            feats.append(f)
        union = np.any(feats, axis=0)
        ys_, xs_ = np.nonzero(union)
        wy0, wy1, wx0, wx1 = ys_.min() - 6, ys_.max() + 6, xs_.min() - 6, xs_.max() + 6
        # Miolo = olhos e boca do próprio morador (alinhados aos da expressão 0), dilatados: lá a franja não volta.
        core = feats[0].copy()
        for _ in range(2):
            c2 = core.copy(); c2[1:] |= core[:-1]; c2[:-1] |= core[1:]; c2[:, 1:] |= core[:, :-1]; c2[:, :-1] |= core[:, 1:]; core = c2
        H, W = cell_shape[:2]
        yy, xx = np.mgrid[0:H, 0:W]
        for k in range(COLS):
            sx_, sy_ = shifts_v[k]
            cx, cy = (wx0 + wx1) / 2 + sx_, (wy0 + wy1) / 2 + sy_
            rx, ry = (wx1 - wx0) / 2 + 2, (wy1 - wy0) / 2 + 2
            win = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2
            soft = np.clip((1.0 - win) / 0.12, 0, 1)  # borda suave
            corem = np.roll(np.roll(core, sy_, axis=0), sx_, axis=1)
            idx = row * COLS + k
            vin = ref[idx][..., 3] > 0  # só dentro do desenho do morador
            for e in EXPRESSIONS:
                body, extra = placed[e]
                b = np.roll(np.roll(body, sy_, axis=0), sx_, axis=1)
                # Sem o contorno da cabeça careca (o morador mantém o próprio contorno do rosto).
                inner = b[..., 3] > 200
                for _ in range(6):
                    inner[1:] &= inner[:-1].copy(); inner[:-1] &= inner[1:].copy(); inner[:, 1:] &= inner[:, :-1].copy(); inner[:, :-1] &= inner[:, 1:].copy()
                f = b.copy()
                f[..., 3] = (b[..., 3] * soft * inner * vin).astype(np.uint8)
                face[e][idx] = f
                ex = np.roll(np.roll(extra, sy_, axis=0), sx_, axis=1).copy()
                # Efeitos ficam na altura da cabeça (a sombra no chão e restos da folha ficam de fora).
                ex[int(wy1 + sy_ + 20):, :, 3] = 0
                # Marca vermelha na cabeça fora do rosto (veia de raiva) também é efeito.
                rgb = b[..., :3].astype(int)
                vein = (b[..., 3] > 128) & (rgb[..., 0] > 170) & (rgb[..., 1] < 110) & (rgb[..., 2] < 110) & (soft == 0)
                ex[vein] = b[vein]
                fx[e][idx] = ex
            for n, cs in bases.items():
                v = cs[idx]
                # Cabelo = traço não-pele ligado (por traços não-pele) ao que está fora da janela do rosto: a franja
                # vem de fora; olhos e boca do morador ficam cercados de pele e não entram.
                ns = (v[..., 3] > 0) & ~skinlike(v[..., :3].astype(int))
                hair = ns & (win >= 1.0)
                q = deque(zip(*np.nonzero(hair & (win < 1.6))))
                while q:
                    y, x = q.popleft()
                    for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                        if 0 <= ny < hh and 0 <= nx < ww and ns[ny, nx] and not hair[ny, nx] and not corem[ny, nx]:
                            hair[ny, nx] = True
                            q.append((ny, nx))
                # Mechas soltas dentro da janela (sem ligação visível): pela cor do cabelo, amostrada no alto da cabeça.
                rgb = v[..., :3].astype(int)
                vy = np.nonzero(v[..., 3] > 200)[0].min()
                pal = rgb[vy + 4:vy + 30][v[vy + 4:vy + 30, :, 3] > 200][::9]
                cand = ns & (win < 1.15) & ~corem & ~hair
                ys_h, xs_h = np.nonzero(cand)
                if len(ys_h):
                    d2 = np.min(np.abs(rgb[ys_h, xs_h][:, None, :] - pal[None, :, :]).sum(axis=2), axis=1)
                    hair[ys_h[d2 < 40], xs_h[d2 < 40]] = True
                hair &= win < 1.15
                bg = np.zeros(cell_shape, np.uint8)
                bg[hair] = v[hair]
                bangs[n][idx] = bg

    def save(name, frames):
        sheet = Image.new('RGBA', (fw * COLS, FRAME_H * ROWS))
        for i, c in enumerate(frames):
            crop = Image.fromarray(c[top:bottom, left:right], 'RGBA')
            sheet.paste(crop.convert('RGBa').resize((fw, FRAME_H), Image.LANCZOS).convert('RGBA'),
                        ((i % COLS) * fw, (i // COLS) * FRAME_H))
        sheet.save(OUT / name, optimize=True)
        out[name] = sheet
    for e in EXPRESSIONS:
        save(f'expr-{e}.png', face[e])
        if sum(int((f[..., 3] > 40).sum()) for f in fx[e]) > 400:  # só efeitos de verdade (não restos)
            save(f'expr-{e}-fx.png', fx[e])
    for n in bases:
        save(f'villager-{n}-bangs.png', bangs[n])
    print(f'expressões: {len(EXPRESSIONS)} rostos, efeitos em', [e for e in EXPRESSIONS if f'expr-{e}-fx.png' in out])
    return out


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
    base_cells = {p.name.replace('villager-', '').replace('-sheet.png', ''): sheets[p] for p in bases}
    made.update(build_expressions(base_cells, top, bottom, left, right, fw))
    if '--expr-preview' in sys.argv:
        dest = Path(sys.argv[sys.argv.index('--expr-preview') + 1])
        names = sorted(base_cells)
        tiles = []
        for e in EXPRESSIONS:
            for n in names:
                t = made[f'villager-{n}.png'].copy()
                for layer in (f'expr-{e}.png', f'villager-{n}-bangs.png', f'expr-{e}-fx.png'):
                    if layer in made:
                        t.alpha_composite(made[layer])
                tiles.append(t)
        W, H = tiles[0].size
        # Uma linha por expressão: frente col 0, esquerda col 0, direita col 0 de cada personagem.
        prev = Image.new('RGBA', (fw * 3 * len(names), FRAME_H * len(EXPRESSIONS)), (90, 140, 90, 255))
        for i, t in enumerate(tiles):
            e, n = divmod(i, len(names))
            for k, row in enumerate((0, 1, 2)):
                prev.alpha_composite(t.crop((0, row * FRAME_H, fw, (row + 1) * FRAME_H)), ((n * 3 + k) * fw, e * FRAME_H))
        prev.save(dest)
        print('prévia de expressões:', dest)
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
