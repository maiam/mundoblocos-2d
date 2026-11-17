#!/usr/bin/env python3
"""Cerca e portão do modelo 3D do Blockbench para a câmera isométrica do Santuário (ADR 0036, v0.93.142).

Os mesmos modelos de `scripts/extract-fence-model.py` (`assets-src/cerca-betula/*.bbmodel`), mas **como geometria**, não como sprites: o Santuário
os desenha como malhas 3D de verdade (`render/three/isoFences.ts`), então valem em qualquer ângulo de câmera.
Saídas:
  src/assets/iso-fence-model.json  as peças usadas (estaca, travessas, portão), cada uma = lista de faces, cada face = lista de vértices [x, y, z]
                                   em unidades do modelo (12 u = 1 célula; norte = −z; y para cima), arredondados a 0,01.
  src/assets/iso-wood.webp         tábuas das 3 madeiras (carvalho, bétula, cerejeira): por madeira, o topo e a frente (64 px) — a mesma tábua do
                                   Padrão de Materiais V2 que a cerca 2D usa. Layout: 6 quadrados de 64 px em 1 linha (carvalho topo/frente, bétula…, cerejeira…).
Uso: python3 scripts/extract-iso-fence.py
"""
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'src' / 'assets'
models = ROOT / 'assets-src' / 'cerca-betula'
fence = json.loads(next(models.glob('cerca-*.bbmodel')).read_text())
gate = json.loads(next(models.glob('portao-*.bbmodel')).read_text())
FENCE_PARTS = ['Frente 3', 'Frontal 2 | nível 5', 'Frontal 2 | nível 12', 'Retorno 1 | nível 5', 'Retorno 1 | nível 12']


def faces(e):
    out = []
    for f in e['faces'].values():
        vs = [[round(c, 2) for c in e['vertices'][i]] for i in f['vertices']]
        if len(vs) >= 3:
            out.append(vs)
    return out


data = {
    'fence': {e['name']: faces(e) for e in fence['elements'] if e['name'] in FENCE_PARTS},
    'gate': [{'name': e['name'], 'faces': faces(e)} for e in gate['elements']],
}
assert len(data['fence']) == len(FENCE_PARTS), data['fence'].keys()
(OUT / 'iso-fence-model.json').write_text(json.dumps(data, separators=(',', ':'), ensure_ascii=False))

mats = json.loads((OUT / 'materials-v2.json').read_text())
sheet = Image.open(OUT / 'materials-v2.webp').convert('RGBA')
cell = mats['cell']
atlas = Image.new('RGBA', (6 * cell, cell))
for w, name in enumerate(['tabuas-de-carvalho', 'tabuas-de-betula', 'tabuas-de-cerejeira']):
    i = mats['materials'].index(name)
    for k, row in enumerate(['top', 'front']):
        atlas.paste(sheet.crop((i * cell, mats['rows'][row][0], (i + 1) * cell, mats['rows'][row][0] + cell)), ((w * 2 + k) * cell, 0))
atlas.save(OUT / 'iso-wood.webp', lossless=True)
size = (OUT / 'iso-fence-model.json').stat().st_size
print(f'ok: {len(data["fence"])} peças de cerca, {len(data["gate"])} do portão, modelo {size // 1024} KB, tábuas {cell}px')
