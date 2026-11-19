"""Arte da fabricação de Titã (ADR 0045): sprites de item, tile do depósito de brasa e junco, a partir do pacote de arte em `assets-src/titan/fabricacao/`.

Entradas : Atlas_Texturas_Margem_16px.png (80 × 40, grade de 20 px com 2 px de borda: tile 5 = lente de gelo, 6 = brasa de âmbar, 7 = junco de vidro),
           Mesa_de_Trabalho.png (ilustração de referência da mesa, reduzida a 16 × 16 só para o ícone da hotbar).
Saídas   : src/assets/titan-hotbar-sprites-16px.webp  64 × 48 (grade 4 × 3): acrescenta 8 = mesa, 9 = lente de gelo, 10 = brasa, 11 = junco de vidro (índice = id do item − 1); a laje (segunda entrega) pede uma linha nova
           src/assets/titan-atlas-16px.webp           tile 10 = rocha com cristal de brasa (depósito de brasa de âmbar), mesma arte nas 6 faces
           src/assets/titan-reed-16px.webp            16 × 16 RGBA: o junco de vidro (faixa cruzada no renderer)
Tudo em WebP SEM perdas (fora do optimize-assets.py). Repetível. Uso: python3 -I scripts/make-titan-fabricacao.py
"""
from PIL import Image, ImageEnhance

SRC = 'assets-src/titan/fabricacao/'
HOTBAR, TERRAIN, REED = 'src/assets/titan-hotbar-sprites-16px.webp', 'src/assets/titan-atlas-16px.webp', 'src/assets/titan-reed-16px.webp'


def tile20(img, i):  # grade de 20 px, tile de 16 px com 2 px de borda
    x, y = (i % 4) * 20 + 2, (i // 4) * 20 + 2
    return img.crop((x, y, x + 16, y + 16)).convert('RGBA')


def put20(img, i, t):
    x, y = (i % 4) * 20 + 2, (i // 4) * 20 + 2
    img.paste(t, (x, y))
    for k in range(1, 3):
        for d in range(16):
            img.putpixel((x - k, y + d), t.getpixel((0, d))); img.putpixel((x + 15 + k, y + d), t.getpixel((15, d)))
            img.putpixel((x + d, y - k), t.getpixel((d, 0))); img.putpixel((x + d, y + 15 + k), t.getpixel((d, 15)))
        for j in range(1, 3):
            img.putpixel((x - k, y - j), t.getpixel((0, 0))); img.putpixel((x + 15 + k, y - j), t.getpixel((15, 0)))
            img.putpixel((x - k, y + 15 + j), t.getpixel((0, 15))); img.putpixel((x + 15 + k, y + 15 + j), t.getpixel((15, 15)))


def main():
    art = Image.open(SRC + 'Atlas_Texturas_Margem_16px.png').convert('RGBA')
    assert art.size == (80, 40)
    lens, ember, reed = tile20(art, 5), tile20(art, 6), tile20(art, 7)
    for n, t in (('lente', lens), ('brasa', ember), ('junco', reed)):
        assert sum(1 for a in t.getchannel('A').tobytes() if a > 0) > 40, f'sprite {n} vazio'

    # ícone da mesa: a ilustração de referência (RGBA, fundo transparente), recortada pelo canal alfa, centrada num quadrado e reduzida (média por caixa) a 16 × 16 com contraste leve
    ref = Image.open(SRC + 'Mesa_de_Trabalho.png').convert('RGBA')
    bbox = ref.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox()
    crop = ref.crop(bbox)
    side = max(crop.size)
    sq = Image.new('RGBA', (side, side), (0, 0, 0, 0)); sq.paste(crop, ((side - crop.width) // 2, (side - crop.height) // 2))
    small = sq.resize((16, 16), Image.BOX)
    alpha = small.getchannel('A').point(lambda v: 255 if v > 96 else 0)
    mesa = ImageEnhance.Contrast(small.convert('RGB')).enhance(1.4).convert('RGBA')
    mesa.putalpha(alpha)

    hot = Image.open(HOTBAR).convert('RGBA')
    assert hot.size in ((64, 32), (64, 48))
    if hot.size == (64, 32):
        big = Image.new('RGBA', (64, 48), (0, 0, 0, 0)); big.paste(hot, (0, 0)); hot = big
    for i, t in ((8, mesa), (9, lens), (10, ember), (11, reed)):
        hot.paste(Image.new('RGBA', (16, 16), (0, 0, 0, 0)), ((i % 4) * 16, (i // 4) * 16))
        hot.alpha_composite(t, ((i % 4) * 16, (i // 4) * 16))
    hot.save(HOTBAR, 'WEBP', lossless=True, method=6)

    # depósito de brasa: a rocha escura (tile 4) com o cristal embutido
    atlas = Image.open(TERRAIN).convert('RGBA')
    assert atlas.size == (80, 60)
    rock = tile20(atlas, 4)
    dep = rock.copy(); dep.alpha_composite(ember)
    put20(atlas, 10, dep)
    atlas.save(TERRAIN, 'WEBP', lossless=True, method=6)

    reed.save(REED, 'WEBP', lossless=True, method=6)
    print('hotbar', hot.size, '· atlas', atlas.size, '· junco', reed.size)
    prev = Image.new('RGBA', (16 * 6 * 4, 16 * 4), (40, 36, 34, 255))
    for n, t in enumerate((mesa, lens, ember, dep, reed, rock)): prev.alpha_composite(t.resize((64, 64), Image.NEAREST), (n * 64, 0))
    prev.save('/tmp/claude-0/fabricacao-prev.png')


if __name__ == '__main__':
    main()
