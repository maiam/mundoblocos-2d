"""Aldeia da Costa (ADR 0142): converte o pacote REGION_V6 do Drive em dados puros para o gerador, sem decodificar PNG em tempo de execução (o servidor roda sem DOM).

Entradas : assets-src/orvalis-voxel/cenarios/aldeia-da-costa/REGION_V6_heightmap_128x128_16bit.png   Y do voxel sólido mais alto: round(p * 383 / 65535) − 64 (X/Z de −64 a 63; linhas em +Z)
           assets-src/orvalis-voxel/cenarios/aldeia-da-costa/REGION_V6_superficies.png            máscara 0–8 (oceano, areia, grama, floresta, pedra, caminho, plantio, pasto, base edificável)
           assets-src/orvalis-voxel/cenarios/aldeia-da-costa/REGION_V6_implantacao.json            muro, portões, cercas, cercados, bases, árvores, trilha
Saída    : src/titan/orvalis/costaData.ts   alturas (1 byte por coluna, Y 34–119) e máscara (1 byte) em base64, e a implantação enxuta em JSON. Não edite à mão: rode este script.
Uso: python3 -I scripts/make-orvalis-costa.py   (precisa de Pillow e NumPy)
"""
import base64
import json

import numpy as np
from PIL import Image

D = 'assets-src/orvalis-voxel/cenarios/aldeia-da-costa/'
OUT = 'src/titan/orvalis/costaData.ts'


def main() -> None:
    hm = np.array(Image.open(D + 'REGION_V6_heightmap_128x128_16bit.png')).astype(np.int64)
    assert hm.shape == (128, 128), hm.shape
    y = np.rint(hm * 383 / 65535).astype(np.int64) - 64
    assert y.min() >= 0 and y.max() <= 255, (y.min(), y.max())
    mask = np.array(Image.open(D + 'REGION_V6_superficies.png'))
    assert mask.shape == (128, 128) and mask.max() <= 8
    imp = json.load(open(D + 'REGION_V6_implantacao.json'))
    a = imp['aldeia']
    data = {
        'muro': {'y': a['muro']['y_incl'], 'celulas': a['muro']['celulas_xz']},
        'portoes': [{'nome': p['nome'], 'x': p['x_incl'], 'z': p['z']} for p in a['portoes']],
        'cercas': {'yBase': a['cercas']['y_base'], 'celulas': a['cercas']['celulas_xz']},
        'cercados': [{'nome': c['nome'], 'caixa': c['limites_x0_z0_x1_z1'], 'porteira': c['porteira_xz']} for c in a['cercados']],
        'talhoes': [{'nome': t['nome'], 'caixa': t['limites_x0_z0_x1_z1']} for t in a['talhoes']],
        'bases': [{'nome': b['nome'], 'caixa': b['limites_x0_z0_x1_z1']} for b in a['bases_edificaveis']],
        'arvores': imp['arvores_xz'],
        'soloY': a['solo_y'],
    }
    ts = (
        '// GERADO por scripts/make-orvalis-costa.py a partir do pacote REGION_V6 do Drive (ADR 0142): não edite à mão.\n'
        '/** Y do voxel sólido mais alto de cada coluna (128 × 128; índice `(z + 64) * 128 + (x + 64)`), 1 byte, em base64. */\n'
        f"export const COSTA_HEIGHT_B64 = '{base64.b64encode(y.astype(np.uint8).tobytes()).decode()}';\n"
        '/** Máscara de superfície (0 oceano, 1 areia, 2 grama, 3 floresta, 4 pedra, 5 caminho, 6 plantio, 7 pasto, 8 base edificável), mesmo índice, em base64. */\n'
        f"export const COSTA_MASK_B64 = '{base64.b64encode(mask.astype(np.uint8).tobytes()).decode()}';\n"
        '/** Implantação da aldeia (muro, portões, cercas, cercados, bases, árvores). */\n'
        f"export const COSTA_PLAN = {json.dumps(data, separators=(',', ':'))} as const;\n"
    )
    open(OUT, 'w').write(ts)
    print(OUT, len(ts) // 1024, 'KB')


if __name__ == '__main__':
    main()
