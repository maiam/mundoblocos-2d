import { describe, expect, it } from 'vitest';
import glbInline from '../assets/titan-farejador-rig.glb?inline'; // o GLB como data URI: o teste lê o arquivo sem `node:fs`
import { roleOf } from './farejadorRig';

describe('Farejador com rig (ADR 0064)', () => {
  it('reconhece os 18 ossos pelo nome, com o nome original ou o sanitizado pelo GLTFLoader', () => {
    const nomes = ['Tronco', 'Pescoço', 'Cabeça', 'Cauda_01', 'Cauda_02', 'Cauda_03', 'PernaAlta.DE', 'PernaBaixa.DE', 'Pé.DE', 'PernaAlta.DD', 'PernaBaixa.DD', 'Pé.DD', 'PernaAlta.TE', 'PernaBaixa.TE', 'Pé.TE', 'PernaAlta.TD', 'PernaBaixa.TD', 'Pé.TD'];
    const roles = nomes.map(roleOf);
    expect(roles.every(Boolean)).toBe(true); expect(new Set(roles).size).toBe(18);
    expect(roleOf('PernaAltaDE')).toBe('alta1'); expect(roleOf('PéDD')).toBe('pe0'); expect(roleOf('PernaBaixaTD')).toBe('baixa2'); expect(roleOf('PernaAltaTE')).toBe('alta3');
    expect(roleOf('Cauda_03')).toBe('cauda3'); expect(roleOf('Garra 01 · Dianteira direita')).toBeNull();
  });
  it('o GLB leve tem uma malha skinada de 23.768 triângulos, 18 ossos e uma textura JPEG, e é pequeno', () => {
    const bin = atob(glbInline.slice(glbInline.indexOf(',') + 1)), b = Uint8Array.from(bin, (c) => c.charCodeAt(0)), dv = new DataView(b.buffer);
    expect(dv.getUint32(0, true)).toBe(0x46546c67);
    const jl = dv.getUint32(12, true), j = JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + jl)));
    expect(j.meshes).toHaveLength(1); expect(j.skins[0].joints).toHaveLength(18); expect(j.images).toHaveLength(1); expect(j.images[0].mimeType).toBe('image/jpeg');
    const p = j.meshes[0].primitives[0];
    expect(j.accessors[p.indices].count / 3).toBe(23768); expect(j.accessors[p.attributes.POSITION].count).toBe(16785);
    for (const a of ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0']) expect(p.attributes[a]).toBeDefined();
    expect(b.length).toBeLessThan(2 * 1024 * 1024); // carrega em segundo plano, mas continua leve
    expect(j.nodes.filter((n: { mesh?: number }) => n.mesh !== undefined)).toHaveLength(1); // as 81 malhas viraram uma
  });
});
