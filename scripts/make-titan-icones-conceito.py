"""Ícones provisórios de 32 × 32 px dos itens novos do Titã (ADR 0063), a partir das ilustrações de conceito do pacote de arte (Drive "O que a duna guarda").

As ilustrações são renders grandes (≈ 1254 × 1254) sem versão de 32 px. Cada uma é recortada no contorno, reduzida (LANCZOS, com o alfa pré-multiplicado para não escurecer a borda), quantizada em uma paleta curta,
com corte de alfa (sem meio-tom), contorno escuro de 1 px e centrada em 32 × 32. É um **provisório**: troque o PNG de saída em `assets-src/titan/arte32/` por arte própria quando existir (o `make-titan-arte32.py` o usa).
Entradas : assets-src/titan/conceito/<nome>.png (fundo transparente ou branco)   Saídas: assets-src/titan/arte32/<nome>_Item_32px.png
Uso: python3 -I scripts/make-titan-icones-conceito.py
"""
from PIL import Image, ImageFilter

SRC, OUT = 'assets-src/titan/conceito/', 'assets-src/titan/arte32/'
ITEMS = ['Fragmento_de_Cobre_de_Duna', 'Lingote_de_Cobre_de_Duna', 'Haste_Seca_de_Junco', 'Picareta_de_Rocha', 'Braseiro_de_Rocha', 'Adaga_de_Rocha', 'Picareta_de_Cobre', 'Adaga_de_Cobre']
SIZE, PALETTE = 28, 22


def load(name):
    im = Image.open(SRC + name + '.png').convert('RGBA')
    a = im.getchannel('A')
    if a.getextrema()[0] > 250:  # sem transparência: tira o fundo branco (flood simples por cor próxima de branco)
        px = im.load()
        w, h = im.size
        bg = Image.new('L', im.size, 0)
        bp = bg.load()
        stack = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
        while stack:
            x, y = stack.pop()
            if x < 0 or y < 0 or x >= w or y >= h or bp[x, y]:
                continue
            r, g, b, _ = px[x, y]
            if min(r, g, b) < 236:
                continue
            bp[x, y] = 255
            stack += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        im.putalpha(bg.point(lambda v: 0 if v else 255).filter(ImageFilter.MinFilter(3)))
    return im


def make(name):
    im = load(name)
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 16 else 0).getbbox())
    w, h = im.size
    s = SIZE / max(w, h)
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    a = im.getchannel('A')
    pm = Image.merge('RGBA', [Image.eval(c, lambda v: v) for c in im.split()])
    r, g, b, _ = pm.split()
    pre = [Image.composite(c, Image.new('L', im.size, 0), a) for c in (r, g, b)]  # alfa pré-multiplicado
    rs = [c.resize((nw, nh), Image.LANCZOS) for c in pre]
    ar = a.resize((nw, nh), Image.LANCZOS)
    ap = ar.load()
    rgb = Image.new('RGB', (nw, nh))
    px = rgb.load()
    rp = [c.load() for c in rs]
    for y in range(nh):
        for x in range(nw):
            al = max(ap[x, y], 1) / 255
            px[x, y] = tuple(min(255, int(rp[k][x, y] / al)) for k in range(3))
    q = rgb.quantize(colors=PALETTE, method=Image.MEDIANCUT, dither=Image.NONE).convert('RGB')
    out = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    mask = ar.point(lambda v: 255 if v >= 128 else 0)
    ox, oy = (32 - nw) // 2, (32 - nh) // 2
    # contorno de 1 px: pixels vazios vizinhos de um preenchido, na cor mais escura da paleta
    cols = sorted(set(q.get_flattened_data() if hasattr(q, 'get_flattened_data') else q.getdata()), key=sum)
    edge = tuple(int(c * 0.55) for c in cols[0])
    mp, qp, op = mask.load(), q.load(), out.load()
    for y in range(nh):
        for x in range(nw):
            if mp[x, y]:
                op[ox + x, oy + y] = qp[x, y] + (255,)
    solid = {(x, y) for y in range(32) for x in range(32) if op[x, y][3] == 255}  # cópia: o contorno não pode alimentar a si mesmo
    for y in range(32):
        for x in range(32):
            if (x, y) not in solid and any((x + dx, y + dy) in solid for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                op[x, y] = edge + (255,)
    out.save(OUT + name + '_Item_32px.png')
    print(name, out.getbbox())


if __name__ == '__main__':
    for n in ITEMS:
        make(n)
