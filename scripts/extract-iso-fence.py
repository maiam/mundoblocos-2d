#!/usr/bin/env python3
"""Cerca e portão do modelo 3D do Blockbench para a câmera isométrica do Santuário (ADR 0036, v0.93.142).

Os mesmos modelos de `scripts/extract-fence-model.py` (`assets-src/cerca-betula/*.bbmodel`), mas **como geometria**, não como sprites: o Santuário
os desenha como malhas 3D de verdade (`render/three/isoFences.ts`), então valem em qualquer ângulo de câmera.
Saídas:
  src/assets/iso-fence-model.json  as peças usadas (estaca, travessas, portão), cada uma = lista de faces, cada face = lista de vértices [x, y, z]
                                   em unidades do modelo (12 u = 1 célula; norte = −z; y para cima), arredondados a 0,01.
  src/assets/iso-wood.webp         texturas de madeira (carvalho, bétula, cerejeira; `assets-src/iso-set/madeira-*.png`): 3 quadrados de 256 px em 1 linha.
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

# Texturas de madeira do dono do produto (v0.93.145): 1 imagem por madeira (4 tábuas, emendável), reduzida a 256 px; o render projeta 24 u do modelo por imagem.
WOODS = ['carvalho', 'betula', 'cerejeira']   # a ordem de `Wood` em render/three/isoFences.ts
TEX = 256
atlas = Image.new('RGB', (len(WOODS) * TEX, TEX))
for i, w in enumerate(WOODS):
    atlas.paste(Image.open(ROOT / 'assets-src' / 'iso-set' / f'madeira-{w}.png').convert('RGB').resize((TEX, TEX), Image.LANCZOS), (i * TEX, 0))
atlas.save(OUT / 'iso-wood.webp', quality=88)
size = (OUT / 'iso-fence-model.json').stat().st_size
print(f'ok: {len(data["fence"])} peças de cerca, {len(data["gate"])} do portão, modelo {size // 1024} KB, texturas {TEX}px')
