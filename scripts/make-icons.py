"""Gera os ícones do PWA em public/ a partir do ícone oficial do Orvalis (assets-src/icone-orvalis.webp, selo redondo
com cantos transparentes). Uso: python3 scripts/make-icons.py (requer Pillow).

  icon-192.png / icon-512.png       selo inteiro, cantos transparentes (purpose "any"; favicon do navegador)
  icon-maskable-512.png             selo a 80% sobre fundo escuro: cabe na zona segura dos ícones "maskable" do Android
  apple-touch-icon.png (180×180)    selo sobre fundo escuro opaco (o iOS pinta a transparência de preto)
"""
from PIL import Image

BG = (18, 15, 44, 255)  # #120f2c, a cor do tema em manifest e index.html
src = Image.open('assets-src/icone-orvalis.webp').convert('RGBA')
src = src.crop(src.getchannel('A').getbbox())  # tira a margem transparente
side = max(src.size)
badge = Image.new('RGBA', (side, side), (0, 0, 0, 0))
badge.alpha_composite(src, ((side - src.width) // 2, (side - src.height) // 2))


def render(size: int, fill: float, background=None) -> Image.Image:
    icon = Image.new('RGBA', (size, size), background or (0, 0, 0, 0))
    d = round(size * fill)
    icon.alpha_composite(badge.resize((d, d), Image.LANCZOS), ((size - d) // 2, (size - d) // 2))
    return icon


for name, icon in {
    'icon-192.png': render(192, 1.0),
    'icon-512.png': render(512, 1.0),
    'icon-maskable-512.png': render(512, 0.80, BG),
    'apple-touch-icon.png': render(180, 0.92, BG),
}.items():
    icon.save(f'public/{name}', optimize=True)
    print(f'public/{name}')
