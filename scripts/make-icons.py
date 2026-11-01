"""Gera public/icon-192.png e icon-512.png a partir do quadro parado de frente da heroína.
Uso: python3 scripts/make-icons.py (requer Pillow)."""
from PIL import Image, ImageDraw

sheet = Image.open('src/assets/heroine.png').convert('RGBA')
fw, fh = sheet.width // 4, sheet.height // 4
frame = sheet.crop((0, 0, fw, fh))
for size in (192, 512):
    icon = Image.new('RGBA', (size, size), (18, 15, 44, 255))
    d = ImageDraw.Draw(icon)
    # Disco dourado suave atrás da personagem (área segura para ícone "maskable").
    r = int(size * 0.40)
    d.ellipse((size // 2 - r, size // 2 - r, size // 2 + r, size // 2 + r), fill=(90, 75, 176, 255))
    h = int(size * 0.72)
    w = int(h * fw / fh)
    sprite = frame.resize((w, h), Image.LANCZOS)
    icon.alpha_composite(sprite, ((size - w) // 2, int(size * 0.14)))
    icon.save(f'public/icon-{size}.png', optimize=True)
    print(f'public/icon-{size}.png')
