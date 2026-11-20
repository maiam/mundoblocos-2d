import { describe, expect, it } from 'vitest';
import glbInline from '../assets/titan-adaga-rocha.glb?inline';
import { handPose, REST, SWING_S, swingCurve } from './heldPose';

describe('item na mão em primeira pessoa (ADR 0071)', () => {
  it('curva do golpe: começa e termina em 0, recua, corta além do repouso e volta', () => {
    expect(swingCurve(0)).toBe(0); expect(swingCurve(1)).toBe(0); expect(swingCurve(-1)).toBe(0); expect(swingCurve(2)).toBe(0);
    expect(swingCurve(0.25)).toBeCloseTo(-0.45, 5); expect(swingCurve(0.55)).toBeCloseTo(1, 5);
    let max = -9, min = 9; for (let t = 0; t <= 1; t += 0.01) { max = Math.max(max, swingCurve(t)); min = Math.min(min, swingCurve(t)); }
    expect(max).toBeCloseTo(1, 1); expect(min).toBeCloseTo(-0.45, 1);
  });
  it('pose: parada fica no repouso (só um balanço de milímetros); no corte a mão avança e gira; passado o tempo volta', () => {
    const r = handPose(-1, 0);
    expect(r.x).toBe(REST.x); expect(r.rx).toBe(REST.rx); expect(Math.abs(r.y - REST.y)).toBeLessThan(0.006);
    const hit = handPose(SWING_S * 0.55, 0);
    expect(hit.z).toBeLessThan(REST.z - 0.1); expect(hit.rx).toBeGreaterThan(REST.rx + 0.8); expect(hit.y).toBeLessThan(REST.y);
    const done = handPose(SWING_S + 0.01, 0); expect(done.rx).toBe(REST.rx); expect(done.z).toBe(REST.z);
    for (const t of [0, 0.05, 0.1, 0.2, 0.3]) for (const v of Object.values(handPose(t, 1.3))) expect(Number.isFinite(v)).toBe(true);
  });
  it('o GLB leve da Adaga de Rocha tem 3 peças sob o pivô CTRL_Adaga com o marcador da palma, uma textura WebP e cabe em 2 MB', () => {
    const bin = atob(glbInline.slice(glbInline.indexOf(',') + 1)), b = Uint8Array.from(bin, (c) => c.charCodeAt(0)), dv = new DataView(b.buffer);
    expect(dv.getUint32(0, true)).toBe(0x46546c67);
    const j = JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + dv.getUint32(12, true))));
    const names: string[] = j.nodes.map((n: { name: string }) => n.name);
    expect(names).toEqual(expect.arrayContaining(['CTRL_Adaga', 'Socket_Palma', 'Lâmina de basalto', 'Cabo de junco', 'Amarrações de fibra']));
    expect(j.meshes).toHaveLength(3); expect(j.images).toHaveLength(1); expect(j.images[0].mimeType).toBe('image/webp'); expect(j.textures).toHaveLength(1);
    const tris = j.meshes.reduce((s: number, m: { primitives: Array<{ indices: number }> }) => s + m.primitives.reduce((a, p) => a + j.accessors[p.indices].count / 3, 0), 0);
    expect(tris).toBe(6272);
    expect(b.length).toBeLessThan(2 * 1024 * 1024); // orçamento do dono do produto
  });
});
