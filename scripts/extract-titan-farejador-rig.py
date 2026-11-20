"""Prepara o Farejador de Duna com rig (ADR 0064) para o jogo: GLB leve, **uma malha só**, com skin, e textura de cor reduzida.

Entrada : assets-src/titan/farejador/Farejador_de_Duna_Rig.glb   (pacote de arte: 81 malhas skinadas, 23.768 triângulos, 18 ossos de deformação, mapas 2K Normal + ORM + Base Color,
                                                                  modelo voltado para −X, altura +Y no glTF, pivô no chão)
Saída   : src/assets/titan-farejador-rig.glb   as 81 malhas fundidas numa só (POSITION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0), o esqueleto original (mesmos nós e ossos), um material com
                                                a Base Color de 1024 × 1024 em JPEG (os mapas Normal e ORM ficam de fora: o jogo não usa luzes de cena, ver ADR 0064)
O script falha se a contagem de triângulos, de ossos ou de vértices mudar. Uso: python3 -I scripts/extract-titan-farejador-rig.py
"""
import array
import io
import json
import struct
import sys

from PIL import Image

SRC, OUT = 'assets-src/titan/farejador/Farejador_de_Duna_Rig.glb', 'src/assets/titan-farejador-rig.glb'
TEX = 1024
FMT = {5126: ('f', 4), 5123: ('H', 2), 5121: ('B', 1), 5125: ('I', 4)}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def main():
    b = open(SRC, 'rb').read()
    magic, ver, _ = struct.unpack('<III', b[:12])
    assert magic == 0x46546C67 and ver == 2
    off, chunks = 12, []
    while off < len(b):
        cl, _t = struct.unpack('<II', b[off:off + 8]); chunks.append(b[off + 8:off + 8 + cl]); off += 8 + cl
    j, binb = json.loads(chunks[0]), chunks[1]

    def read(i):
        a = j['accessors'][i]; v = j['bufferViews'][a['bufferView']]; code, size = FMT[a['componentType']]; n = NC[a['type']]
        base = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        stride = v.get('byteStride') or n * size
        out = array.array(code)
        for k in range(a['count']):
            out.extend(struct.unpack_from('<' + code * n, binb, base + k * stride))
        return out, n

    pos, nrm, uv, jts, wts, idx = array.array('f'), array.array('f'), array.array('f'), array.array('B'), array.array('f'), array.array('I')
    tris, mesh_nodes = 0, []
    for ni, nd in enumerate(j['nodes']):
        if 'mesh' not in nd:
            continue
        mesh_nodes.append(ni)
        for p in j['meshes'][nd['mesh']]['primitives']:
            at = p['attributes']
            base = len(pos) // 3
            P, _ = read(at['POSITION']); N, _ = read(at['NORMAL']); U, _ = read(at['TEXCOORD_0']); J, _ = read(at['JOINTS_0']); W, _ = read(at['WEIGHTS_0']); I, _ = read(p['indices'])
            pos.extend(P); nrm.extend(N); uv.extend(U); jts.extend(J); wts.extend(W); idx.extend(base + i for i in I)
            tris += len(I) // 3
    nv = len(pos) // 3
    assert tris == 23768 and nv == 16785 and len(j['skins'][0]['joints']) == 18 and len(mesh_nodes) == 81, (tris, nv, len(mesh_nodes))
    assert nv < 65536
    idx16 = array.array('H', idx)
    mins = [min(pos[a::3]) for a in range(3)]; maxs = [max(pos[a::3]) for a in range(3)]
    print('caixa', [round(m, 3) for m in mins], [round(m, 3) for m in maxs])

    # textura de cor: imagem do material (a de índice 2 do arquivo é a Base Color RGBA de 2K)
    m0 = j['materials'][0]
    tex = j['textures'][m0['pbrMetallicRoughness']['baseColorTexture']['index']]
    iv = j['bufferViews'][j['images'][tex['source']]['bufferView']]
    im = Image.open(io.BytesIO(binb[iv.get('byteOffset', 0):iv.get('byteOffset', 0) + iv['byteLength']])).convert('RGB').resize((TEX, TEX), Image.LANCZOS)
    jb = io.BytesIO(); im.save(jb, 'JPEG', quality=88, optimize=True)
    jpeg = jb.getvalue()

    ibm = j['accessors'][j['skins'][0]['inverseBindMatrices']]
    ibv = j['bufferViews'][ibm['bufferView']]
    ibm_bytes = binb[ibv.get('byteOffset', 0) + ibm.get('byteOffset', 0):ibv.get('byteOffset', 0) + ibm.get('byteOffset', 0) + ibm['count'] * 64]

    blob = bytearray(); views, accs = [], []

    def add(data, target=None):
        while len(blob) % 4:
            blob.append(0)
        views.append({'buffer': 0, 'byteOffset': len(blob), 'byteLength': len(data), **({'target': target} if target else {})})
        blob.extend(data)
        return len(views) - 1

    def acc(view, ctype, count, typ, **kw):
        accs.append({'bufferView': view, 'componentType': ctype, 'count': count, 'type': typ, **kw}); return len(accs) - 1

    a_ibm = acc(add(ibm_bytes), 5126, ibm['count'], 'MAT4')
    a_pos = acc(add(pos.tobytes(), 34962), 5126, nv, 'VEC3', min=mins, max=maxs)
    a_nrm = acc(add(nrm.tobytes(), 34962), 5126, nv, 'VEC3')
    a_uv = acc(add(uv.tobytes(), 34962), 5126, nv, 'VEC2')
    a_jt = acc(add(jts.tobytes(), 34962), 5121, nv, 'VEC4')
    a_wt = acc(add(wts.tobytes(), 34962), 5126, nv, 'VEC4')
    a_ix = acc(add(idx16.tobytes(), 34963), 5123, len(idx16), 'SCALAR')
    v_img = add(jpeg)

    nodes = json.loads(json.dumps(j['nodes']))
    for k, ni in enumerate(mesh_nodes):
        nodes[ni].pop('mesh'); nodes[ni].pop('skin', None)
        if k == 0:
            nodes[ni]['mesh'] = 0; nodes[ni]['skin'] = 0; nodes[ni]['name'] = 'Farejador de Duna · malha'
    skin = {'joints': j['skins'][0]['joints'], 'inverseBindMatrices': a_ibm, 'name': j['skins'][0].get('name', 'Esqueleto')}
    if 'skeleton' in j['skins'][0]:
        skin['skeleton'] = j['skins'][0]['skeleton']
    out = {
        'asset': {'version': '2.0', 'generator': 'orvalis extract-titan-farejador-rig.py'},
        'scene': 0, 'scenes': j['scenes'], 'nodes': nodes, 'skins': [skin],
        'meshes': [{'name': 'Farejador de Duna', 'primitives': [{'attributes': {'POSITION': a_pos, 'NORMAL': a_nrm, 'TEXCOORD_0': a_uv, 'JOINTS_0': a_jt, 'WEIGHTS_0': a_wt}, 'indices': a_ix, 'material': 0}]}],
        'materials': [{'name': 'Farejador', 'doubleSided': True, 'pbrMetallicRoughness': {'baseColorTexture': {'index': 0}, 'metallicFactor': 0, 'roughnessFactor': 1}}],
        'textures': [{'sampler': 0, 'source': 0}], 'samplers': [{'magFilter': 9729, 'minFilter': 9987, 'wrapS': 33071, 'wrapT': 33071}],
        'images': [{'bufferView': v_img, 'mimeType': 'image/jpeg'}],
        'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': len(blob)}],
    }
    js = json.dumps(out, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    while len(blob) % 4:
        blob.append(0)
    glb = struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
    open(OUT, 'wb').write(glb)
    print(f'{OUT}: {len(glb) / 1024:.0f} KiB, {tris} triângulos, {nv} vértices, textura {TEX}² JPEG {len(jpeg) / 1024:.0f} KiB')


if __name__ == '__main__':
    sys.exit(main())
