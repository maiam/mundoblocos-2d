"""Gera o gabarito da arte das paredes (assets-src/paredes/gabarito.png) a partir das MESMAS medidas do código
(world/walls.ts + render/worldScale.ts), para a especificação (assets-src/paredes/CONTRATO.md) nunca divergir do jogo.

Medidas (1 célula = CELL px): espessura T = 0,3 → 38 px; braço = (128 − 38) / 2 = 45 px; altura da frente = 1,2 célula = 154 px.
Uso: python3 scripts/make-wall-guide.py
"""
from PIL import Image, ImageDraw, ImageFont

CELL = 128
T = round(0.3 * CELL)            # espessura da placa (38)
ARM = (CELL - T) // 2            # braço até a borda da célula (45)
C0, C1 = ARM, ARM + T            # poste: de 45 a 83
H = round(1.2 * CELL)            # altura da frente (154)
BG, INK, GRID = (244, 240, 232), (40, 36, 48), (170, 166, 180)
FRONT, FRONT2, CAP, CAPRIM = (214, 168, 120), (186, 140, 96), (66, 48, 38), (110, 84, 66)
OUT = 'assets-src/paredes/gabarito.png'

F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
font = lambda s, b=False: ImageFont.truetype(FB if b else F, s)

W, Hh = 1820, 2330
im = Image.new('RGB', (W, Hh), BG)
d = ImageDraw.Draw(im)


def text(x, y, s, size=18, bold=False, fill=INK, anchor='la'):
    d.text((x, y), s, font=font(size, bold), fill=fill, anchor=anchor)


def dashed_rect(x0, y0, x1, y1, fill=GRID, step=8):
    for x in range(x0, x1, step * 2):
        d.line([(x, y0), (min(x + step, x1), y0)], fill=fill)
        d.line([(x, y1), (min(x + step, x1), y1)], fill=fill)
    for y in range(y0, y1, step * 2):
        d.line([(x0, y), (x0, min(y + step, y1))], fill=fill)
        d.line([(x1, y), (x1, min(y + step, y1))], fill=fill)


def footprint(n, e, s, w):
    """Mesmos retângulos de `wallFootprint` (walls.ts), em px da célula: poste + braços."""
    r = [(C0, C0, C1, C1)]
    if n: r.append((C0, 0, C1, C0))
    if s: r.append((C0, C1, C1, CELL))
    if w: r.append((0, C0, C0, C1))
    if e: r.append((C1, C0, CELL, C1))
    return r


text(40, 24, 'Gabarito da arte das paredes — Orvalis', 34, True)
text(40, 72, f'1 célula = {CELL} px  ·  espessura da placa T = {T} px (0,3)  ·  braço = {ARM} px  ·  poste = {T} px  ·  altura da frente = {H} px (1,2 célula)', 20)
text(40, 102, 'Cada peça é um PNG RGBA transparente, recortado exato (sem margem). Cinza tracejado = limite da célula (não desenhar).', 18, fill=(100, 96, 110))

# ---------------- 1) FRENTE ----------------
y0 = 170
text(40, y0 - 32, '1) FRENTE (face sul da parede) — 4 peças por material', 26, True)
pieces = [
    ('front_mid', CELL, 0, ['célula inteira', 'emenda nos DOIS lados'], [(0, ARM, 'braço O'), (ARM, T, 'poste'), (ARM + T, ARM, 'braço L')]),
    ('front_end_left', CELL - C0, C0, ['ponta ESQUERDA', 'acabamento só à esquerda'], [(0, T, 'poste'), (T, ARM, 'braço L')]),
    ('front_end_right', C1, 0, ['ponta DIREITA', 'acabamento só à direita'], [(0, ARM, 'braço O'), (ARM, T, 'poste')]),
    ('front_post', T, 0, ['poste isolado / fim de coluna', 'acabamento nos dois lados'], [(0, T, 'poste')]),
]
x = 40
for name, w, _, desc, parts in pieces:
    top = y0 + 30
    d.rectangle([x, top, x + w, top + H], fill=FRONT, outline=INK, width=2)
    d.line([(x, top + 14), (x + w, top + 14)], fill=FRONT2, width=3)  # faixa do topo (aresta clara/escura)
    px = x
    for off, ww, lab in parts:
        d.rectangle([px + off + 1, top + 24, px + off + ww - 1, top + H - 8], outline=FRONT2)
        text(px + off + ww // 2, top + H // 2, lab, 13, fill=INK, anchor='mm')
    text(x, top - 24, name, 20, True)
    text(x, top + H + 8, f'{w} × {H} px', 18)
    for i, line in enumerate(desc):
        text(x, top + H + 34 + i * 20, line, 14, fill=(100, 96, 110))
    x += max(w, 190) + 150
text(40, y0 + 30 + H + 70, 'As frentes de "braço só" (ex.: canto de cômodo) são RECORTES de front_mid: por isso front_mid precisa emendar com ele mesmo. '
     'Altura da frente é a mesma em todas.', 17, fill=(80, 76, 92))

# ---------------- 2) TAMPA ----------------
y1 = 560
text(40, y1 - 40, '2) TAMPA (vista de cima, 128 × 128 cada) — 16 peças por material, uma por combinação de vizinhos', 26, True)
text(40, y1 - 12, 'Preencher só a forma escura (poste + braços); o resto transparente. Bordas externas com a aresta clara; onde há braço, a tampa CONTINUA até a borda e emenda com a da célula vizinha.', 16, fill=(80, 76, 92))
names = {0: 'solta'}
for m in range(16):
    col, row = m % 4, m // 4
    tx, ty = 40 + col * (CELL + 130), y1 + 24 + row * (CELL + 70)
    n, e, s, w = bool(m & 1), bool(m & 2), bool(m & 4), bool(m & 8)
    dashed_rect(tx, ty, tx + CELL, ty + CELL)
    for (a, b, c, dd) in footprint(n, e, s, w):
        d.rectangle([tx + a, ty + b, tx + c - 1, ty + dd - 1], fill=CAP)
        d.rectangle([tx + a, ty + b, tx + c - 1, ty + dd - 1], outline=CAPRIM)
    flags = ''.join(k for k, v in zip('NESW', (n, e, s, w)) if v) or '—'
    text(tx, ty + CELL + 6, f'cap_{m:02d}', 17, True)
    text(tx + 78, ty + CELL + 6, f'vizinhos: {flags}', 15)
text(1000, y1 + 24, 'Índice = N·1 + L·2 + S·4 + O·8', 20, True)
text(1000, y1 + 54, 'N = parede ao norte, L = leste, S = sul, O = oeste.', 17)
text(1000, y1 + 84, 'cap_00 = poste isolado (38 × 38 no centro).', 17)
text(1000, y1 + 114, 'cap_05 / cap_10 = coluna norte–sul / fileira leste–oeste.', 17)
text(1000, y1 + 144, 'cap_15 = cruz (parede nos 4 lados).', 17)
text(1000, y1 + 190, 'Nomes: <material>/cap_00.png … cap_15.png', 17)
text(1000, y1 + 220, 'Cada peça de tampa tem 128 × 128 e o MESMO canto superior-esquerdo da célula.', 17)

# ---------------- 3) MONTAGEM ----------------
y2 = 1470
text(40, y2 - 40, '3) MONTAGEM — onde cada peça cai (exemplo: fileira leste–oeste de 3 células e coluna norte–sul de 3 células)', 26, True)
S = 1  # 1:1
gx, gy = 140, y2 + H + 40  # origem do chão da 1ª célula (canto superior-esquerdo)
def cell_box(cx, cy):
    return (gx + cx * CELL, gy + cy * CELL)

def draw_cap(cx, cy, mask):
    ox, oy = cell_box(cx, cy)
    for (a, b, c, dd) in footprint(bool(mask & 1), bool(mask & 2), bool(mask & 4), bool(mask & 8)):
        d.rectangle([ox + a, oy - H + b, ox + c - 1, oy - H + dd - 1], fill=CAP, outline=CAPRIM)

def draw_front(cx, cy, x0, x1):
    ox, oy = cell_box(cx, cy)
    d.rectangle([ox + x0, oy + C1 - H, ox + x1 - 1, oy + C1 - 1], fill=FRONT, outline=INK)

# chão das células
for cx in range(3):
    ox, oy = cell_box(cx, 0)
    dashed_rect(ox, oy, ox + CELL, oy + CELL)
for cy in range(3):
    ox, oy = cell_box(5, cy)
    dashed_rect(ox, oy, ox + CELL, oy + CELL)
# fileira L–O: células (0..2, 0)
draw_front(0, 0, C0, CELL); draw_front(1, 0, 0, CELL); draw_front(2, 0, 0, C1)
draw_cap(0, 0, 2); draw_cap(1, 0, 2 | 8); draw_cap(2, 0, 8)
# coluna N–S: células (5, 0..2): só o último (sul) mostra a frente
draw_cap(5, 0, 4); draw_cap(5, 1, 1 | 4); draw_cap(5, 2, 1)
draw_front(5, 2, C0, C1)
text(gx, gy + CELL + 14, 'fileira leste–oeste: frente em cada célula (ponta E + meio + ponta D)', 17)
text(gx + 5 * CELL - 30, gy + 3 * CELL + 14, 'coluna norte–sul: só o último bloco ao sul tem frente', 17)
text(40, gy + 3 * CELL + 60,
     f'Posição (origem = canto superior-esquerdo da célula no chão):', 18, True)
text(40, gy + 3 * CELL + 88, f'TAMPA: a peça 128 × 128 é desenhada {H} px ACIMA da célula (y − {H}).', 17)
text(40, gy + 3 * CELL + 116, f'FRENTE: a base fica em y = {C1} (face sul do poste) e o topo em y = {C1 - H}, logo abaixo da tampa; a frente invade a célula de cima.', 17)
text(40, gy + 3 * CELL + 144, f'A face sul fica {CELL - C1} px para dentro da célula (o chão aparece à frente da parede).', 17)
text(40, gy + 3 * CELL + 172, 'O desenho NÃO inclui sombra de contato nem iluminação do jogo (feitas em código).', 17)

im.save(OUT)
print(OUT, im.size)
