import { describe, expect, it } from 'vitest';
import glbInline from '../assets/titan-adaga-rocha.glb?inline';
import picaInline from '../assets/titan-picareta-rocha.glb?inline';
import { bobOffset, DIP_LOOP, DIP_SINGLE, HandAnim, handPose, REST, STYLES, SWING_S, swingCurves } from './heldPose';

describe('item na mão em primeira pessoa (ADR 0071, 0074)', () => {
  it('curvas do Minecraft: sin1 sobe e desce (pico em p = 0,5), sin2 acelera o começo (pico em p = 0,25), sinSq gira o pulso no fim; tudo 0 fora de 0–1', () => {
    for (const p of [-1, 0, 1, 2]) expect(swingCurves(p)).toEqual({ sin1: 0, sin2: 0, sinSq: 0 });
    expect(swingCurves(0.5).sin1).toBeCloseTo(1, 6); expect(swingCurves(0.25).sin2).toBeCloseTo(1, 6);
    expect(swingCurves(0.1).sin2).toBeGreaterThan(swingCurves(0.1).sin1); // o começo é rápido (ease-out)
    expect(swingCurves(0.9).sinSq).toBeGreaterThan(swingCurves(0.5).sinSq * 0.3);
    expect(SWING_S).toBe(0.3); // 6 ticks
  });
  it('pose: parada fica no repouso; no corte a mão cruza para a esquerda, avança, sobe e a lâmina desce 48°; em 1 volta ao repouso', () => {
    const r = handPose(0);
    expect(r).toEqual({ x: REST.x, y: REST.y, z: REST.z, rx: REST.rx, ry: REST.ry, rz: REST.rz });
    const mid = handPose(0.25);
    expect(mid.x).toBeLessThan(REST.x - 0.25); expect(mid.z).toBeLessThan(REST.z - 0.15); expect(mid.rx).toBeLessThan(REST.rx - 0.75); expect(mid.rz).toBeGreaterThan(REST.rz + 0.7);
    expect(handPose(0.5).y).toBeGreaterThan(REST.y + 0.05); expect(handPose(1)).toEqual(handPose(0));
    expect(handPose(0, { x: 0, y: 0 }, 1).y).toBeCloseTo(REST.y - 0.3, 6); // afundamento depois do golpe
    for (const p of [0, 0.1, 0.3, 0.6, 0.9]) for (const v of Object.values(handPose(p, bobOffset(1.3, 3, true), 0.2))) expect(Number.isFinite(v)).toBe(true);
  });
  it('balanço: andando no chão oscila; parado, só uma respiração de milímetros', () => {
    expect(Math.abs(bobOffset(0.4, 4, true).y)).toBeGreaterThan(0.005); expect(Math.abs(bobOffset(0.4, 4, true).x)).toBeGreaterThan(0.01);
    expect(Math.abs(bobOffset(0.4, 0, true).x)).toBe(0); expect(Math.abs(bobOffset(0.4, 0, true).y)).toBeLessThan(0.007); expect(bobOffset(0.4, 4, false).x).toBe(0); // no ar não balança
  });
  it('HandAnim: um golpe isolado dura 0,3 s e para; segurando, o golpe se repete sem pausa; o afundamento é recuperado', () => {
    const a = new HandAnim(); a.update(0.016, 0, true, false); expect(a.swinging).toBe(false);
    a.trigger(); expect(a.swinging).toBe(true); expect(a.equipOffset).toBeCloseTo(DIP_SINGLE, 6);
    for (let i = 0; i < 9; i++) a.update(0.03, 0, true, false); expect(a.swinging).toBe(true); // 0,27 s
    a.update(0.03, 0, true, false); a.update(0.03, 0, true, false); expect(a.swinging).toBe(false);
    for (let t = 0; t < 0.6; t += 0.03) a.update(0.03, 0, true, false); expect(a.equipOffset).toBe(0);
    const l = new HandAnim(); let starts = 0, was = false;
    for (let t = 0; t < 1.5; t += 0.016) { l.update(0.016, 0, true, true); if (l.swinging && !was) starts++; was = l.swinging; }
    expect(starts).toBe(1); expect(l.swinging).toBe(true); // ficou em golpe contínuo (nunca parou entre os ciclos)
    let stops = 0; const m = new HandAnim(); m.trigger(); for (let t = 0; t < 1.5; t += 0.016) { m.update(0.016, 0, true, true); if (!m.swinging) stops++; } expect(stops).toBe(0);
    for (let t = 0; t < 0.5; t += 0.016) l.update(0.016, 0, true, false); expect(l.swinging).toBe(false); // soltou: termina o ciclo e para
    expect(l.equipOffset).toBeLessThanOrEqual(DIP_LOOP);
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
  it('picareta (ADR 0078): repouso e golpe próprios; desce por cima (gira mais em X e menos de lado que a adaga); o HandAnim usa o estilo do item', () => {
    const rest = handPose(0, { x: 0, y: 0 }, 0, 'pick'), hit = handPose(0.25, { x: 0, y: 0 }, 0, 'pick'), dag = handPose(0.25, { x: 0, y: 0 }, 0, 'dagger');
    expect(rest).toEqual({ ...STYLES.pick.rest }); expect(rest.rx).not.toBe(REST.rx);
    expect(hit.rx).toBeLessThan(rest.rx - 1.2); expect(Math.abs(hit.rz - rest.rz)).toBeLessThan(Math.abs(dag.rz - REST.rz)); expect(handPose(1, { x: 0, y: 0 }, 0, 'pick')).toEqual(rest);
    const a = new HandAnim(); a.kind = 'pick'; a.trigger(); const p = a.update(0.075, 0, true, false);
    expect(p.rx).toBeLessThan(STYLES.pick.rest.rx); expect(p.x).toBeLessThan(STYLES.pick.rest.x + 0.01);
  });
  it('o GLB leve da Picareta de Rocha: uma malha de 4.632 triângulos, sem osso nem clipe, uma textura WebP, cabe em 2 MB', () => {
    const bin = atob(picaInline.slice(picaInline.indexOf(',') + 1)), b = Uint8Array.from(bin, (c) => c.charCodeAt(0)), dv = new DataView(b.buffer);
    expect(dv.getUint32(0, true)).toBe(0x46546c67);
    const j = JSON.parse(new TextDecoder().decode(b.subarray(20, 20 + dv.getUint32(12, true))));
    expect(j.meshes).toHaveLength(1); expect(j.skins).toBeUndefined(); expect(j.animations).toBeUndefined(); expect(j.images).toHaveLength(1); expect(j.images[0].mimeType).toBe('image/webp');
    expect(j.accessors[j.meshes[0].primitives[0].indices].count / 3).toBe(4632);
    expect(b.length).toBeLessThan(2 * 1024 * 1024);
  });
});

import { EQUIP_DEPTH, EQUIP_DOWN_S, EQUIP_UP_S, EquipAnim } from './heldPose';

describe('troca de item (ADR 0087)', () => {
  it('parada: sem deslocamento e o item novo já aparece', () => {
    expect(new EquipAnim().update(0.016)).toEqual({ offset: 0, swapped: true });
  });
  it('afunda, troca no fundo e sobe de volta ao repouso', () => {
    const e = new EquipAnim(); e.start();
    expect(e.active).toBe(true);
    const meio = e.update(EQUIP_DOWN_S / 2); expect(meio.swapped).toBe(false); expect(meio.offset).toBeCloseTo(-EQUIP_DEPTH / 2, 6);
    const fundo = e.update(EQUIP_DOWN_S / 2 + 0.001); expect(fundo.swapped).toBe(true); expect(fundo.offset).toBeLessThan(-EQUIP_DEPTH * 0.97);
    const subindo = e.update(EQUIP_UP_S / 2); expect(subindo.swapped).toBe(true); expect(subindo.offset).toBeCloseTo(-EQUIP_DEPTH / 2, 1);
    const fim = e.update(EQUIP_UP_S); expect(fim).toEqual({ offset: 0, swapped: true }); expect(e.active).toBe(false);
  });
  it('trocar de novo no meio da subida volta a afundar sem salto', () => {
    const e = new EquipAnim(); e.start(); e.update(EQUIP_DOWN_S + EQUIP_UP_S * 0.5);
    const antes = -EQUIP_DEPTH * 0.5;
    e.start();
    expect(e.update(0).offset).toBeCloseTo(antes, 6);
    expect(e.update(0.001).swapped).toBe(false);
  });
  it('toda categoria tem estilo de repouso e amplitudes de golpe', () => {
    for (const k of ['dagger', 'pick', 'hand', 'block', 'flat', 'tool'] as const) { expect(STYLES[k].rest).toBeDefined(); expect(STYLES[k].drx).toBeGreaterThan(0); }
  });
});
