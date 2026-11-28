"""Ficha de caixas do Grunho Casca-Rachada (ADR 0147): peças, tamanhos, juntas e posição de cada face no atlas UV (64 × 64 unidades; 1 unidade = 1/16 de bloco).

Saída: assets-src/orvalis-voxel/mobs/grunho-uv.json (mesmo formato de `fazenda-uv.json`: `mobs.grunho.parts[]` com `sizePx` = largura × altura × profundidade,
`pivotPx` (junta, no espaço do pai), `meshOffsetPx` (centro da caixa em relação à junta), `restEulerRad`, `uvPx` por face em unidades do atlas).
Frente = −Z; _e (esquerda) em −X e _d (direita) em +X, como nos animais. As planificações são empacotadas em prateleiras; cada cruz tem (2d + 2w) × (2d + h) unidades
(topo em cima da frente; esquerda, frente, direita e costas em fila; base embaixo), o que a prancha ortográfica precisa trazer (`make-orvalis-fazenda-prancha.py grunho`).
Repetível. Uso: python3 -I scripts/make-orvalis-grunho-ficha.py
"""
import json

OUT = 'assets-src/orvalis-voxel/mobs/grunho-uv.json'
ATLAS = 64

# id, pai, (largura, altura, profundidade), junta, deslocamento da malha
PECAS = [
    ('corpo', None, (8, 8, 5), (0, 10, 0), (0, 0, 0)),
    ('perna_e', 'corpo', (3, 6, 3), (-2, -4, 0), (0, -3, 0)),
    ('perna_d', 'corpo', (3, 6, 3), (2, -4, 0), (0, -3, 0)),
    ('braco_e', 'corpo', (3, 8, 3), (-5.5, 3.5, 0), (0, -3.5, 0)),
    ('braco_d', 'corpo', (3, 8, 3), (5.5, 3.5, 0), (0, -3.5, 0)),
    ('cabeca', 'corpo', (9, 8, 8), (0, 4, 0), (0, 4, 0)),
    ('orelha_e', 'cabeca', (4, 3, 1), (-6.5, 4.5, 0), (0, 0, 0)),
    ('orelha_d', 'cabeca', (4, 3, 1), (6.5, 4.5, 0), (0, 0, 0)),
    ('nariz', 'cabeca', (2, 3, 3), (0, 3.5, -5.5), (0, 0, 0)),
    ('clava_cabo', 'braco_d', (2, 10, 2), (0, -6, -2.5), (0, 3, 0)),
    ('clava_cabeca', 'clava_cabo', (4, 5, 4), (0, 10.5, 0), (0, 0, 0)),
]


def cruz(d, w, h):
    return (2 * d + 2 * w, 2 * d + h)


def empacota():
    """Prateleiras: peças maiores primeiro, da esquerda para a direita; devolve {id: (x, y)} em unidades."""
    itens = sorted(PECAS, key=lambda p: (-cruz(p[2][2], p[2][0], p[2][1])[1], -cruz(p[2][2], p[2][0], p[2][1])[0], p[0]))
    pos, x, y, alt = {}, 0, 0, 0
    for pid, _, (w, h, d), _, _ in itens:
        cw, ch = cruz(d, w, h)
        if x + cw > ATLAS:
            x, y, alt = 0, y + alt, 0
        assert y + ch <= ATLAS, ('não cabe no atlas', pid)
        pos[pid] = (x, y)
        x += cw
        alt = max(alt, ch)
    return pos, y + alt


def main():
    pos, usado = empacota()
    parts = []
    for pid, pai, (w, h, d), junta, off in PECAS:
        ox, oy = pos[pid]
        parts.append({
            'id': pid, 'parent': pai, 'sizePx': [w, h, d], 'pivotPx': list(junta), 'meshOffsetPx': list(off), 'restEulerRad': [0, 0, 0],
            'uvPx': {'+X': [ox, oy + d, d, h], '-X': [ox + d + w, oy + d, d, h], '+Y': [ox + d, oy, w, d], '-Y': [ox + d, oy + d + h, w, d], '+Z': [ox + 2 * d + w, oy + d, w, h], '-Z': [ox + d, oy + d, w, h]},
        })
    ficha = {'schema': 'orvalis-uv-atlas/1', 'textureSize': [ATLAS, ATLAS], 'unitsPerBlock': 16, 'axes': {'front': '-Z', 'up': '+Y'}, 'boxGeometryFaceOrder': ['+X', '-X', '+Y', '-Y', '+Z', '-Z'],
             'mobs': {'grunho': {'name': 'Grunho Casca-Rachada', 'parts': parts}}}
    json.dump(ficha, open(OUT, 'w'), ensure_ascii=False, indent=1)
    print('ok', len(parts), 'peças; atlas usado até y =', usado, 'de', ATLAS)


if __name__ == '__main__':
    main()
