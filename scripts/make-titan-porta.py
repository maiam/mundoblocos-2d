"""Porta de Junco do Titã (ADR 0102): a folha frontal e o ícone de 32 px a partir da arte do pacote ("Porta-De-Junco.png" do Drive, vista 3/4 em fundo branco, reduzida a 448 × 600 em `assets-src/titan/junco/`).

Entradas : assets-src/titan/junco/Porta-De-Junco_448x600.png
Saídas   : src/assets/titan-porta.webp                          64 × 128 sem perdas: a folha de frente (a perspectiva da arte é desfeita por um recorte em quadrilátero); dobradiças à esquerda, argola à direita
           assets-src/titan/arte32/Porta_de_Junco_Item_32px.png  ícone de 32 px (a porta inteira, vista 3/4, sem o fundo)
Depois rode `make-titan-arte32.py` (o atlas de itens ganha a linha 11). Repetível e determinístico. Uso: python3 -I scripts/make-titan-porta.py
"""
import importlib.util

from PIL import Image

SRC = 'assets-src/titan/junco/Porta-De-Junco_448x600.png'
# cantos da folha na arte (NO, SO, SE, NE), em px da imagem de 448 × 600
QUAD = (90, 82, 90, 572, 382, 526, 382, 98)


def junco_module():
    spec = importlib.util.spec_from_file_location('junco', 'scripts/make-titan-junco.py')
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main() -> None:
    im = Image.open(SRC).convert('RGB')
    leaf = im.transform((128, 256), Image.QUAD, QUAD, Image.BICUBIC).resize((64, 128), Image.LANCZOS)
    leaf.save('src/assets/titan-porta.webp', 'WEBP', lossless=True, quality=100, method=6)
    j = junco_module()
    j.SRC = 'assets-src/titan/junco/'
    # o ícone sai da mesma arte: `icon_from_art` lê `<nome>_512.png`; aqui a imagem tem outro nome, então grava-se uma cópia temporária com o nome esperado
    tmp = 'assets-src/titan/junco/Porta-De-Junco_512.png'
    im.save(tmp)
    try:
        j.icon_from_art('Porta-De-Junco', 'Porta_de_Junco_Item_32px.png')
    finally:
        import os
        os.remove(tmp)
    print('src/assets/titan-porta.webp (64 × 128) e ícone de 32 px')


if __name__ == '__main__':
    main()
