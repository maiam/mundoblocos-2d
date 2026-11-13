"""Gera o gabarito da arte das paredes (assets-src/paredes/gabarito.png) a partir das MESMAS medidas do código
(world/walls.ts + render/worldScale.ts), para a especificação (assets-src/paredes/CONTRATO.md) nunca divergir do jogo.

Medidas (1 célula = CELL px), com a espessura de cada eixo em células (`--tx` largura das faixas e do poste; `--tz` profundidade da
tampa); o padrão 1,0 / 0,35 (decisão final de 13/11/2026: coluna da largura da célula) dá: laje 128 × 44 px, braços N/S de 42 px, frente de 154 px.
Gera também `assets-src/paredes/CONTRATO.md` a partir de `CONTRATO.tpl.md` (os números do contrato saem das mesmas medidas).
Uso: python3 scripts/make-wall-guide.py [--tx 1.0] [--tz 0.35] [--saida assets-src/paredes/gabarito.png] [--sem-contrato]
"""
import argparse

from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--tx', type=float, default=1.0, help='largura das faixas norte–sul e do poste (células)')
ap.add_argument('--tz', type=float, default=0.35, help='profundidade da tampa das fileiras leste–oeste (células)')
ap.add_argument('--franja', type=int, default=16, help='espessura única da franja clara, em px (decisão: 16)')
ap.add_argument('--saida', default='assets-src/paredes/gabarito.png')
ap.add_argument('--sem-contrato', action='store_true', help='não regerar o CONTRATO.md')
args = ap.parse_args()

CELL = 128
TX = round(args.tx * CELL / 2) * 2           # largura do poste (px, par para os braços ficarem inteiros)
TZ = round(args.tz * CELL / 2) * 2           # profundidade do poste e da tampa (px)
ARM = (CELL - TX) // 2                       # braço leste/oeste até a borda da célula
ARMZ = (CELL - TZ) // 2                      # braço norte/sul até a borda da célula
C0, C1 = ARM, ARM + TX                       # poste em x
Z0, Z1 = ARMZ, ARMZ + TZ                     # poste em z
T = TX
H = round(1.2 * CELL)                        # altura da frente (154)
BG, INK, GRID = (244, 240, 232), (40, 36, 48), (170, 166, 180)
FRONT, FRONT2, CAP, CAPRIM = (214, 168, 120), (186, 140, 96), (66, 48, 38), (110, 84, 66)
OUT = args.saida

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
    r = [(C0, Z0, C1, Z1)]
    if n: r.append((C0, 0, C1, Z0))
    if s: r.append((C0, Z1, C1, CELL))
    if w: r.append((0, Z0, C0, Z1))
    if e: r.append((C1, Z0, CELL, Z1))
    return [q for q in r if q[2] > q[0] and q[3] > q[1]]  # com x = 1 os braços L/O têm largura zero: não existem


text(40, 24, 'Gabarito da arte das paredes — Orvalis', 34, True)
text(40, 72, f'1 célula = {CELL} px  ·  laje = {TX} px de largura × {TZ} px de profundidade (x = {args.tx:g}, z = {args.tz:g})  ·  braço L/O = {ARM} px, N/S = {ARMZ} px  ·  altura da frente = {H} px (1,2 célula)', 20)
text(40, 102, 'Cada peça é um PNG RGBA transparente, recortado exato (sem margem). Cinza tracejado = limite da célula (não desenhar).', 18, fill=(100, 96, 110))

# ---------------- 1) FRENTE ----------------
y0 = 170
text(40, y0 - 32, '1) FRENTE (face sul da parede) — 4 peças por material', 26, True)
pieces = [
    ('front_mid', CELL, 0, ['célula inteira', 'emenda nos DOIS lados'], [(0, ARM, 'braço O'), (ARM, TX, 'laje'), (ARM + TX, ARM, 'braço L')]),
    ('front_end_left', CELL - C0, C0, ['ponta ESQUERDA', 'acabamento só à esquerda'], [(0, TX, 'laje'), (TX, ARM, 'braço L')]),
    ('front_end_right', C1, 0, ['ponta DIREITA', 'acabamento só à direita'], [(0, ARM, 'braço O'), (ARM, TX, 'laje')]),
    ('front_post', TX, 0, ['bloco isolado / fim de coluna', 'acabamento nos dois lados'], [(0, TX, 'laje')]),
]
x = 40
for name, w, _, desc, parts in pieces:
    top = y0 + 30
    d.rectangle([x, top, x + w, top + H], fill=FRONT, outline=INK, width=2)
    d.line([(x, top + 14), (x + w, top + 14)], fill=FRONT2, width=3)  # faixa do topo (aresta clara/escura)
    px = x
    for off, ww, lab in [q for q in parts if q[1] > 0]:
        d.rectangle([px + off + 1, top + 24, px + off + ww - 1, top + H - 8], outline=FRONT2)
        text(px + off + ww // 2, top + H // 2, lab, 13, fill=INK, anchor='mm')
    text(x, top - 24, name, 20, True)
    text(x, top + H + 8, f'{w} × {H} px', 18)
    for i, line in enumerate(desc):
        text(x, top + H + 34 + i * 20, line, 14, fill=(100, 96, 110))
    x += max(w, 190) + 150
text(40, y0 + 30 + H + 70, 'As 4 frentes têm 128 px e só aparecem onde NÃO há parede ao sul. Moldura com a franja única de 16 px; 100% opacas.', 17, fill=(80, 76, 92))

# ---------------- 2) TAMPA ----------------
y1 = 560
text(40, y1 - 40, '2) TAMPA (vista de cima, 128 × 128 cada) — 16 peças por material, uma por combinação de vizinhos', 26, True)
text(40, y1 - 12, 'Só os vizinhos N/S mudam a FORMA (4 formas); L/O mudam só o acabamento das bordas esquerda/direita. Coluna: franja | miolo | franja; fileira: franja fina ao norte. O resto transparente.', 16, fill=(80, 76, 92))
names = {0: 'solta'}
for m in range(16):
    col, row = m % 4, m // 4
    tx, ty = 40 + col * (CELL + 130), y1 + 24 + row * (CELL + 70)
    n, e, s, w = bool(m & 1), bool(m & 2), bool(m & 4), bool(m & 8)
    dashed_rect(tx, ty, tx + CELL, ty + CELL)
    for (a, b, c, dd) in footprint(n, e, s, w):
        d.rectangle([tx + a, ty + b, tx + c - 1, ty + dd - 1], fill=CAP)
        d.rectangle([tx + a, ty + b, tx + c - 1, ty + dd - 1], outline=CAPRIM)
    # franja única (F px): faixas claras desenhadas sobre a forma escura (ver CONTRATO, seção 4)
    FJ = args.franja
    top_, bot_ = (0 if n else Z0), (CELL if s else Z1)
    LIGHT = (214, 168, 120)
    def fr(x0, y0, x1, y1):
        if x1 > x0 and y1 > y0:
            d.rectangle([tx + x0, ty + y0, tx + x1 - 1, ty + y1 - 1], fill=LIGHT)
    if not n:
        fr(0, Z0, CELL, Z0 + FJ)                      # fechamento do topo (franja da borda norte)
    elif e or w:                                      # coluna chega à fileira: a franja faz a curva
        if w: fr(0, Z0, FJ, Z0 + FJ)
        if e: fr(CELL - FJ, Z0, CELL, Z0 + FJ)
    if n or s:                                        # franjas laterais da coluna
        for (xa, xb, side_open) in ((0, FJ, w), (CELL - FJ, CELL, e)):
            if side_open:
                fr(xa, top_ + (FJ if not n else 0), xb, Z0); fr(xa, Z1, xb, bot_)
            else:
                fr(xa, top_ + (FJ if not n else 0), xb, bot_)
    flags = ''.join(k for k, v in zip('NESW', (n, e, s, w)) if v) or '—'
    text(tx, ty + CELL + 6, f'cap_{m:02d}', 17, True)
    text(tx + 78, ty + CELL + 6, f'vizinhos: {flags}', 15)
text(1000, y1 + 24, 'Índice = N·1 + L·2 + S·4 + O·8', 20, True)
text(1000, y1 + 54, 'N = parede ao norte, L = leste, S = sul, O = oeste.', 17)
text(1000, y1 + 84, f'cap_00 = laje isolada ({TX} × {TZ} no centro).', 17)
text(1000, y1 + 114, 'cap_05 / cap_10 = coluna norte–sul / fileira leste–oeste.', 17)
text(1000, y1 + 144, 'cap_15 = cruz (parede nos 4 lados).', 17)
text(1000, y1 + 190, 'Nomes: <material>/cap_00.png … cap_15.png', 17)
text(1000, y1 + 250, f'Cor clara = franja de {args.franja} px (a MESMA espessura em tudo).', 18, True)
text(1000, y1 + 280, 'Coluna: franja | miolo | franja. Onde a coluna toca a fileira,', 17)
text(1000, y1 + 306, 'a franja faz a CURVA e segue como franja da fileira (borda norte).', 17)
text(1000, y1 + 332, 'O miolo da coluna não é cortado por nenhuma linha.', 17)
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
    d.rectangle([ox + x0, oy + Z1 - H, ox + x1 - 1, oy + Z1 - 1], fill=FRONT, outline=INK)

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
text(40, gy + 3 * CELL + 116, f'FRENTE: a base fica em y = {Z1} (face sul do poste) e o topo em y = {Z1 - H}, logo abaixo da tampa; a frente invade a célula de cima.', 17)
text(40, gy + 3 * CELL + 144, f'A face sul fica {CELL - Z1} px para dentro da célula (o chão aparece à frente da parede).', 17)
text(40, gy + 3 * CELL + 172, 'O desenho NÃO inclui sombra de contato nem iluminação do jogo (feitas em código).', 17)

im.save(OUT)
print(OUT, im.size)

if not args.sem_contrato and TX != CELL:
    print('contrato não regerado: o modelo CONTRATO.tpl.md vale para a coluna de largura da célula (--tx 1.0)')
elif not args.sem_contrato:
    fmt = lambda v: f'{v:g}'.replace('.', ',')
    tokens = {
        'TX': TX, 'TZ': TZ, 'TXC': fmt(args.tx), 'TZC': fmt(args.tz), 'ARMX': ARM, 'ARMZ': ARMZ, 'H': H,
        'ENDW': CELL - C0, 'C0': C0, 'C1': C1, 'C1M1': C1 - 1, 'ARMXM1': ARM - 1,
        'Z0': Z0, 'Z1': Z1, 'Z0M1': Z0 - 1, 'Z1M1': Z1 - 1, 'YTOP': Z1 - H, 'INSIDE': CELL - Z1,
        'F': args.franja, 'CORE': CELL - 2 * args.franja, 'ROWCORE': TZ - args.franja, 'FEND': CELL - args.franja, 'Z0RIM': Z0 + args.franja - 1, 'Z0RIM1': Z0 + args.franja,
    }
    text_tpl = open('assets-src/paredes/CONTRATO.tpl.md', encoding='utf-8').read()
    for k, v in tokens.items():
        text_tpl = text_tpl.replace(f'<<{k}>>', str(v))
    assert '<<' not in text_tpl, 'token sem valor no modelo do contrato'
    header = '<!-- GERADO por scripts/make-wall-guide.py a partir de CONTRATO.tpl.md: não edite à mão. -->\n\n'
    open('assets-src/paredes/CONTRATO.md', 'w', encoding='utf-8').write(header + text_tpl)
    print('assets-src/paredes/CONTRATO.md')
