import * as THREE from 'three';
import { titanFarejadorModel, titanNozFrutosModel, titanNozPlantaModel, titanLanternModel, titanMarcoModel, titanPainelModel, titanWorkbenchModel, type LanternBatch, type ModelData } from './art/titan';
import type { Box } from '../titan/lantern';
import { meshSection, type MeshData } from '../titan/mesher';
import { EYE_HEIGHT } from '../titan/physics';
import { initialSections } from '../titan/sections';
import { horizonAt, skyAt, type Sky } from '../titan/sky';
import { SkyDome } from './titanSkyDome';
import type { TitanPerf } from '../titan/perf';
import type { TitanVolume } from '../titan/volume';
import { REED_COLUMNS, REED_VARIANTS, reedVariant } from '../titan/reeds';
import { nutTurn } from '../titan/nuts';
import { eyeDepth, eyesSubmerged, stepUnderwater, underwaterAmbient, underwaterFar, UNDERWATER_FOG_NEAR, type UnderwaterState } from '../titan/underwater';
import { T } from '../titan/voxel';

/**
 * Renderer do Titã (ADR 0039): Three.js, câmera em primeira pessoa, uma `BufferGeometry` por seção de 16³ para o terreno opaco e outra para o
 * líquido, atlas compartilhado de pixels nítidos, sombreado fixo por face nos vértices, **luz do dia como uniform do shader** (ADR 0041: mudar a hora não
 * refaz malha e a luz da lanterna, no atributo `glow`, não depende dela), céu em degradê com sol e névoa que seguem a hora. Só **lê** o volume.
 * Malhas feitas no quadro (limite por quadro, mais perto primeiro); workers ficam para a otimização posterior (NEXT_STEPS).
 */
/** Alcance de render (blocos): a região de teste é pequena; a névoa começa em 70% e fecha antes da borda carregada. */
const RANGE = 64;
const MESH_BUDGET_MS = 6;

export class TitanRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  private readonly scene = new THREE.Scene();
  private readonly opaqueMat: THREE.MeshBasicMaterial;
  private readonly liquidMat: THREE.MeshBasicMaterial;
  private readonly liquidTex: THREE.Texture;
  private readonly sections = new Map<string, { opaque?: THREE.Mesh; liquid?: THREE.Mesh; rev: number }>();
  private readonly pending = new Set<string>();
  private readonly outline: THREE.LineSegments;
  private readonly sky: SkyDome;
  private curSky!: Sky;
  private lastFogYaw = 1e9;
  private readonly sun: THREE.Sprite;
  /** Sobreposição de rachaduras sobre o bloco em quebra: uma caixa só, reaproveitada (nenhuma malha de chunk muda). */
  private readonly crack: THREE.Mesh;
  private readonly crackTex: THREE.Texture;
  /** Luz do dia compartilhada pelos materiais do terreno (uniform do shader). */
  private readonly ambient = { value: new THREE.Vector3(1, 1, 1) };
  /** Luz do dia sem a atenuação submersa (a `ambient` é esta × o fator de profundidade). */
  private readonly ambientBase = new THREE.Vector3(1, 1, 1);
  private under: UnderwaterState = { mix: 0, adapt: 0 };
  private underDepth = 0;
  private lastRenderT = 0;
  /** Cor da névoa/fundo do céu do lado para onde a câmera olha (sem o mergulho). */
  private readonly skyFog = new THREE.Color(0xd2a066);
  private readonly waterFog = new THREE.Color(0x2b2742);
  /** 0 (fora d'água) a 1 (submerso): a interface desenha o véu de tela com isto. */
  get submersion(): number { return this.under.mix; }
  /** Modelos 3D colocados (mesa, Marco, Painel): uma `InstancedMesh` por modelo, atualizada quando `volume.modelVersion` muda. */
  private readonly modelMeshes = {} as Record<ModelKind, THREE.InstancedMesh>;
  private modelSeen = -1;
  /** Junco de Vidro: uma malha instanciada por silhueta (broto baixo, haste bifurcada, tufo aberto), cada uma com o seu terço do atlas. */
  private reedMeshes: THREE.InstancedMesh[] = [];
  private reedGeos: THREE.BufferGeometry[] = [];
  private reedMat!: THREE.MeshBasicMaterial;
  /** Planta da Noz de Duna (todas as plantas) e as nozes (só as maduras): duas malhas instanciadas do mesmo atlas. */
  private nutPlantMesh!: THREE.InstancedMesh;
  private nutFruitMesh!: THREE.InstancedMesh;
  /** Farejadores de Duna: um grupo de partes (tronco, cabeça, cauda, 4 patas) por animal, cada parte girando em torno do pivô; criados sob demanda (geometria e material compartilhados). */
  private farejadores: Array<{ group: THREE.Group; parts: Record<string, THREE.Mesh> }> = [];
  private farejadorGeos = {} as Record<string, THREE.BufferGeometry>;
  private farejadorMat!: THREE.MeshBasicMaterial;
  private readonly timeU = { value: 0 };
  private lanternStructure: THREE.InstancedMesh;
  private lanternCore: THREE.InstancedMesh;
  private lanternSeen = -1;
  private lastSky = -1;
  private frame = 0;
  /** Seções refeitas no quadro atual (medição). */
  private built = 0;
  private readonly itemSprites = new Map<string, { sprite: THREE.Sprite; baseY: number }>();
  private readonly itemMats: Record<number, THREE.SpriteMaterial> = {};

  constructor(private readonly canvas: HTMLCanvasElement, private readonly volume: TitanVolume, atlas: HTMLImageElement, hotbarAtlas: HTMLImageElement, cracksAtlas: HTMLImageElement, lanternAtlas: HTMLImageElement, extra: { workbenchAtlas: HTMLImageElement; reed: HTMLImageElement; lake: HTMLImageElement; margemAtlas: HTMLImageElement; nozAtlas: HTMLImageElement; farejadorAtlas: HTMLImageElement }, private readonly perf: TitanPerf | null = null) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene.background = new THREE.Color(0xd2a066);
    this.scene.fog = new THREE.Fog(0xd2a066, RANGE * 0.7, RANGE * 0.97);
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.05, 400);
    this.camera.rotation.order = 'YXZ';

    const tex = new THREE.Texture(atlas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.opaqueMat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, fog: true });
    patchDayLight(this.opaqueMat, this.ambient);
    // o líquido tem atlas próprio de 32 px (Lago Escuro V2, ADR 0057: topo 1, topo 2, lateral, lateral) e alterna o quadro deslocando o UV em 1 célula (0,25); a face de cima aparece também por baixo
    this.liquidTex = new THREE.Texture(extra.lake);
    this.liquidTex.colorSpace = THREE.SRGBColorSpace;
    this.liquidTex.magFilter = THREE.NearestFilter;
    this.liquidTex.minFilter = THREE.NearestFilter;
    this.liquidTex.generateMipmaps = false;
    this.liquidTex.needsUpdate = true;
    this.liquidMat = new THREE.MeshBasicMaterial({ map: this.liquidTex, vertexColors: true, fog: true, transparent: true, opacity: 0.94, side: THREE.DoubleSide });
    patchDayLight(this.liquidMat, this.ambient);

    const htex = new THREE.Texture(hotbarAtlas);
    htex.colorSpace = THREE.SRGBColorSpace;
    htex.magFilter = THREE.NearestFilter;
    htex.minFilter = THREE.NearestFilter;
    htex.generateMipmaps = false;
    htex.needsUpdate = true;
    this.hotbarTex = htex;

    // céu: cúpula com shader (degradê, bruma direcional, faixas de bruma, estrelas e Saturno raro; ADR 0048) que acompanha a câmera
    this.sky = new SkyDome();
    this.scene.add(this.sky.mesh);
    // sol: um ponto quadrado (combina com os voxels), só aparece com o sol alto
    this.sun = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xfff0c8, fog: false, transparent: true, depthWrite: false }));
    this.sun.scale.set(16, 16, 1);
    this.sun.visible = false;
    this.scene.add(this.sun);
    this.setSky(0.375);

    // rachaduras: caixa do tamanho do bloco (um pouco maior, com polygonOffset, para não cintilar sobre as faces), atlas de 10 estágios deslocado por estágio
    this.crackTex = new THREE.Texture(cracksAtlas);
    this.crackTex.colorSpace = THREE.SRGBColorSpace;
    this.crackTex.magFilter = THREE.NearestFilter;
    this.crackTex.minFilter = THREE.NearestFilter;
    this.crackTex.generateMipmaps = false;
    this.crackTex.repeat.set(0.1, 1);
    this.crackTex.needsUpdate = true;
    this.crack = new THREE.Mesh(new THREE.BoxGeometry(1.004, 1.004, 1.004), new THREE.MeshBasicMaterial({ map: this.crackTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: true }));
    this.crack.visible = false;
    this.crack.matrixAutoUpdate = true;
    this.scene.add(this.crack);

    // lanternas (ADR 0043): modelo 3D em duas instâncias (estrutura e núcleo âmbar), 2 chamadas de desenho para quantas houver; atlas com flipY = false (UV do glTF)
    const ltex = new THREE.Texture(lanternAtlas);
    ltex.colorSpace = THREE.SRGBColorSpace;
    ltex.magFilter = THREE.NearestFilter;
    ltex.minFilter = THREE.NearestFilter;
    ltex.generateMipmaps = false;
    ltex.flipY = false;
    ltex.needsUpdate = true;
    const lmat = new THREE.MeshBasicMaterial({ map: ltex, vertexColors: true, fog: true });
    patchDayLight(lmat, this.ambient);
    this.lanternStructure = new THREE.InstancedMesh(lanternGeometry(titanLanternModel.structure, false), lmat, 16);
    this.lanternCore = new THREE.InstancedMesh(lanternGeometry(titanLanternModel.core, true), lmat, 16);
    for (const m of [this.lanternStructure, this.lanternCore]) { m.count = 0; m.frustumCulled = false; this.scene.add(m); }

    // Mesa de Trabalho (ADR 0045): o mesmo modelo para todas as instâncias; `iGlow` por instância leva a luz de lanterna das células vizinhas (o terreno recebe a dele nos vértices)
    const wtex = new THREE.Texture(extra.workbenchAtlas);
    wtex.colorSpace = THREE.SRGBColorSpace;
    wtex.magFilter = THREE.NearestFilter;
    wtex.minFilter = THREE.NearestFilter;
    wtex.generateMipmaps = false;
    wtex.flipY = false;
    wtex.needsUpdate = true;
    const wmat = new THREE.MeshBasicMaterial({ map: wtex, vertexColors: true, fog: true });
    patchDayLight(wmat, this.ambient, { instGlow: true });
    // Marco de Margem e Painel de Junco (ADR 0058): atlas de 144 × 72 px compartilhado; mesma luz de lanterna por instância (`iGlow`) e luz do dia por uniform
    const mtex = new THREE.Texture(extra.margemAtlas);
    mtex.colorSpace = THREE.SRGBColorSpace;
    mtex.magFilter = THREE.NearestFilter;
    mtex.minFilter = THREE.NearestFilter;
    mtex.generateMipmaps = false;
    mtex.flipY = false;
    mtex.needsUpdate = true;
    const mmat = new THREE.MeshBasicMaterial({ map: mtex, vertexColors: true, fog: true });
    patchDayLight(mmat, this.ambient, { instGlow: true });
    const batches: Array<[ModelKind, ModelData, THREE.Material]> = [['workbench', titanWorkbenchModel, wmat], ['marco', titanMarcoModel, mmat], ['painel', titanPainelModel, mmat]];
    for (const [kind, model, material] of batches) {
      const mesh = new THREE.InstancedMesh(modelGeometry(model), material, 8);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.modelMeshes[kind] = mesh;
    }

    // Noz de Duna (ADR 0060): atlas de 144 × 36 px; planta e frutos em malhas separadas para a colhida perder só os frutos. Sem brilho de lanterna por instância (decoração baixa).
    const ntex = new THREE.Texture(extra.nozAtlas);
    ntex.colorSpace = THREE.SRGBColorSpace;
    ntex.magFilter = THREE.NearestFilter;
    ntex.minFilter = THREE.NearestFilter;
    ntex.generateMipmaps = false;
    ntex.flipY = false;
    ntex.needsUpdate = true;
    const nmat = new THREE.MeshBasicMaterial({ map: ntex, vertexColors: true, fog: true, side: THREE.DoubleSide });
    patchDayLight(nmat, this.ambient);
    for (const [model, key] of [[titanNozPlantaModel, 'nutPlantMesh'], [titanNozFrutosModel, 'nutFruitMesh']] as const) {
      const mesh = new THREE.InstancedMesh(modelGeometry(model), nmat, 8);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this[key] = mesh;
    }

    // Farejador de Duna (ADR 0061): atlas de 224 × 36 px; uma malha por parte, em torno do pivô de cada uma
    const ftex = new THREE.Texture(extra.farejadorAtlas);
    ftex.colorSpace = THREE.SRGBColorSpace;
    ftex.magFilter = THREE.NearestFilter;
    ftex.minFilter = THREE.NearestFilter;
    ftex.generateMipmaps = false;
    ftex.flipY = false;
    ftex.needsUpdate = true;
    const fmat = new THREE.MeshBasicMaterial({ map: ftex, vertexColors: true, fog: true });
    patchDayLight(fmat, this.ambient);
    this.farejadorMat = fmat;
    for (const [name, part] of Object.entries(titanFarejadorModel.parts)) this.farejadorGeos[name] = modelGeometry(part);

    // junco de vidro: duas faixas cruzadas por planta, balanço leve no shader (uTime), sem colisão (não existe no volume)
    const rtex = new THREE.Texture(extra.reed);
    rtex.colorSpace = THREE.SRGBColorSpace;
    rtex.magFilter = THREE.NearestFilter;
    rtex.minFilter = THREE.NearestFilter;
    rtex.generateMipmaps = false;
    rtex.needsUpdate = true;
    const rmat = new THREE.MeshBasicMaterial({ map: rtex, vertexColors: true, fog: true, alphaTest: 0.5, side: THREE.DoubleSide });
    patchDayLight(rmat, this.ambient, { time: this.timeU });
    this.reedMat = rmat;
    for (let v = 0; v < REED_VARIANTS; v++) {
      const geo = reedGeometry(v);
      const mesh = new THREE.InstancedMesh(geo, rmat, 32);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.reedGeos.push(geo);
      this.reedMeshes.push(mesh);
    }

    // contorno da célula apontada
    const box = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1));
    this.outline = new THREE.LineSegments(box, new THREE.LineBasicMaterial({ color: 0xfff3d8 }));
    this.outline.visible = false;
    this.scene.add(this.outline);

    // fila inicial: todas as seções não vazias da região (4 × 4 chunks), da mais perto da chegada para fora
    for (const k of initialSections(this.volume)) this.pending.add(k);
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  /** Refaz as instâncias das lanternas quando alguma foi posta ou retirada (ou o mapa foi carregado). Cresce a capacidade dobrando. */
  private syncLanterns(): void {
    if (this.lanternSeen === this.volume.lanternVersion) return;
    this.lanternSeen = this.volume.lanternVersion;
    const cells = this.volume.lanternCells();
    if (cells.length > this.lanternStructure.instanceMatrix.count) {
      const cap = Math.max(cells.length, this.lanternStructure.instanceMatrix.count * 2);
      for (const m of [this.lanternStructure, this.lanternCore]) {
        const n = new THREE.InstancedMesh(m.geometry, m.material, cap);
        n.frustumCulled = false;
        this.scene.remove(m);
        this.scene.add(n);
        if (m === this.lanternStructure) this.lanternStructure = n; else this.lanternCore = n;
      }
    }
    const mat = new THREE.Matrix4();
    cells.forEach(([x, y, z], i) => { mat.makeTranslation(x + 0.5, y, z + 0.5); this.lanternStructure.setMatrixAt(i, mat); this.lanternCore.setMatrixAt(i, mat); });
    this.lanternStructure.count = this.lanternCore.count = cells.length;
    this.lanternStructure.instanceMatrix.needsUpdate = this.lanternCore.instanceMatrix.needsUpdate = true;
  }

  /** Refaz as instâncias dos modelos 3D (mesa, Marco, Painel: postos, retirados, carregados) e o brilho de cada uma (maior luz de lanterna nas 6 células vizinhas). */
  private syncModels(force: boolean): void {
    if (!force && this.modelSeen === this.volume.modelVersion) return;
    this.modelSeen = this.volume.modelVersion;
    const mat = new THREE.Matrix4();
    for (const kind of ['workbench', 'marco', 'painel'] as const) {
      const cells = this.volume.modelCells(kind);
      let mesh = this.modelMeshes[kind];
      if (cells.length > mesh.instanceMatrix.count) {
        const n = new THREE.InstancedMesh(mesh.geometry, mesh.material, Math.max(cells.length, mesh.instanceMatrix.count * 2));
        n.frustumCulled = false;
        this.scene.remove(mesh);
        this.scene.add(n);
        mesh = this.modelMeshes[kind] = n;
      }
      const glow = new Float32Array(mesh.instanceMatrix.count * 3);
      cells.forEach(([x, y, z, turn], i) => {
        mat.makeRotationY(turn * Math.PI / 2).setPosition(x + 0.5, y, z + 0.5);
        mesh.setMatrixAt(i, mat);
        let lv = 0;
        for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) lv = Math.max(lv, this.volume.light(x + dx, y + dy, z + dz));
        const w = lv > 0 ? Math.pow(lv / 15, 1.3) * 0.7 : 0;
        glow.set([w, w * 0.72, w * 0.38], i * 3);
      });
      mesh.geometry.setAttribute('iGlow', new THREE.InstancedBufferAttribute(glow, 3));
      mesh.count = cells.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Mesas desenhadas (diagnóstico e testes de navegador). */
  get workbenchCount(): number { return this.modelMeshes.workbench.count; }
  /** Marcos e Painéis desenhados (diagnóstico e testes de navegador). */
  get marcoCount(): number { return this.modelMeshes.marco.count; }
  get painelCount(): number { return this.modelMeshes.painel.count; }

  /** Juncos de vidro: `list` = células de ar sobre areia úmida (o jogo filtra as que foram construídas). Silhueta, rotação e tamanho por planta, determinísticos pela posição. */
  setReeds(list: ReadonlyArray<{ x: number; y: number; z: number }>): void {
    const groups: Array<Array<{ x: number; y: number; z: number; f: number }>> = Array.from({ length: REED_VARIANTS }, () => []);
    for (const r of list) {
      const h = Math.sin(r.x * 12.9898 + r.z * 78.233) * 43758.5453, f = h - Math.floor(h);
      groups[reedVariant(r.x, r.z)].push({ ...r, f });
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    groups.forEach((g, v) => {
      let mesh = this.reedMeshes[v];
      if (g.length > mesh.instanceMatrix.count) {
        this.scene.remove(mesh);
        mesh = new THREE.InstancedMesh(this.reedGeos[v], this.reedMat, Math.max(g.length, mesh.instanceMatrix.count * 2));
        mesh.frustumCulled = false;
        this.scene.add(mesh);
        this.reedMeshes[v] = mesh;
      }
      g.forEach((r, i) => {
        q.setFromAxisAngle(up, r.f * Math.PI);
        sc.set(0.85 + r.f * 0.3, 0.8 + ((r.f * 7) % 1) * 0.5, 0.85 + r.f * 0.3);
        m.compose(p.set(r.x + 0.5, r.y, r.z + 0.5), q, sc);
        mesh.setMatrixAt(i, m);
      });
      mesh.count = g.length;
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  /** Plantas de Noz de Duna de pé: a planta sempre, os frutos só nas maduras. Giro fixo pela posição. */
  setNuts(list: ReadonlyArray<{ x: number; y: number; z: number; ripe: boolean }>): void {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    const fill = (mesh: THREE.InstancedMesh, items: ReadonlyArray<{ x: number; y: number; z: number }>): THREE.InstancedMesh => {
      if (items.length > mesh.instanceMatrix.count) {
        const n = new THREE.InstancedMesh(mesh.geometry, mesh.material, Math.max(items.length, mesh.instanceMatrix.count * 2));
        n.frustumCulled = false;
        this.scene.remove(mesh);
        this.scene.add(n);
        mesh = n;
      }
      items.forEach((n, i) => { q.setFromAxisAngle(up, nutTurn(n.x, n.z) * Math.PI * 2); m.compose(p.set(n.x + 0.5, n.y, n.z + 0.5), q, sc); mesh.setMatrixAt(i, m); });
      mesh.count = items.length;
      mesh.instanceMatrix.needsUpdate = true;
      return mesh;
    };
    this.nutPlantMesh = fill(this.nutPlantMesh, list);
    this.nutFruitMesh = fill(this.nutFruitMesh, list.filter((n) => n.ripe));
  }
  /** Farejadores de Duna: pés, giro (`rotation.y`), escala, rolagem de costas e pose das partes de cada animal; a lista vazia esconde todos. */
  setFarejadores(list: ReadonlyArray<{ x: number; y: number; z: number; yaw: number; scale: number; pose: { bob: number; roll: number; headPitch: number; headYaw: number; tailYaw: number; legs: readonly number[] } }>): void {
    while (this.farejadores.length < list.length) {
      const group = new THREE.Group(), parts: Record<string, THREE.Mesh> = {};
      group.rotation.order = 'YXZ'; // gira em Y (rumo) e depois rola em X (eixo do comprimento: o modelo olha para −X)
      for (const [name, part] of Object.entries(titanFarejadorModel.parts)) {
        const mesh = new THREE.Mesh(this.farejadorGeos[name], this.farejadorMat);
        mesh.position.set(part.pivot[0], part.pivot[1], part.pivot[2]);
        mesh.frustumCulled = false;
        parts[name] = mesh; group.add(mesh);
      }
      this.scene.add(group);
      this.farejadores.push({ group, parts });
    }
    this.farejadores.forEach(({ group, parts }, i) => {
      const s = list[i];
      group.visible = !!s;
      if (!s) return;
      group.scale.setScalar(s.scale);
      group.position.set(s.x, s.y + (s.pose.bob + 0.72 * Math.sin(s.pose.roll / 2)) * s.scale, s.z); // de costas o dorso fica no chão: sobe o centro para não afundar
      group.rotation.set(s.pose.roll, s.yaw, 0);
      parts.cabeca.rotation.set(0, s.pose.headYaw, s.pose.headPitch);
      parts.cauda.rotation.set(0, s.pose.tailYaw, 0);
      (['pata_dd', 'pata_de', 'pata_td', 'pata_te'] as const).forEach((k, j) => parts[k].rotation.set(0, 0, s.pose.legs[j]));
    });
  }
  /** Plantas e nozes desenhadas (diagnóstico e testes de navegador). */
  get nutPlantCount(): number { return this.nutPlantMesh.count; }
  get nutFruitCount(): number { return this.nutFruitMesh.count; }

  /** Lanternas desenhadas (diagnóstico e testes de navegador). */
  get lanternCount(): number { return this.lanternStructure.count; }

  readonly resize = (): void => {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  };

  /** Fragmentos de superfície ainda no mundo (sprites do atlas da hotbar: rocha = índice 4, gelo = 5). Chamar de novo depois de uma coleta. */
  setItems(items: Array<{ id: string; item: number; x: number; y: number; z: number }>): void {
    const keep = new Set(items.map((i) => i.id));
    for (const [id, e] of this.itemSprites) if (!keep.has(id)) { this.scene.remove(e.sprite); this.itemSprites.delete(id); }
    for (const it of items) {
      if (this.itemSprites.has(it.id)) continue;
      const mat = this.itemMats[it.item] ??= this.spriteMaterial(it.item - 1);
      mat.color.setScalar(this.itemDim);
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.6, 0.6, 1);
      const baseY = it.y + 0.32;
      sprite.position.set(it.x + 0.5, baseY, it.z + 0.5);
      this.scene.add(sprite);
      this.itemSprites.set(it.id, { sprite, baseY });
    }
  }

  private hotbarTex!: THREE.Texture;
  private spriteMaterial(index: number): THREE.SpriteMaterial {
    const tex = this.hotbarTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(0.25, 0.25); // atlas de itens 4 × 4 (128 × 128 px, células de 32 px; ADR 0053)
    tex.offset.set((index % 4) * 0.25, 1 - (((index / 4) | 0) + 1) / 4);
    return new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.4, fog: true });
  }

  /** Seções que ainda faltam (diagnóstico e testes de navegador). */
  get pendingSections(): number { return this.pending.size; }
  get meshedSections(): number { return this.sections.size; }

  private build(key: string): void {
    const [cx, sy, cz] = key.split(',').map(Number);
    const t0 = this.perf ? performance.now() : 0;
    const m = meshSection(this.volume, cx, sy, cz);
    const t1 = this.perf ? performance.now() : 0;
    const entry = this.sections.get(key) ?? { rev: 0 };
    for (const k of ['opaque', 'liquid'] as const) {
      const old = entry[k];
      if (old) { this.scene.remove(old); old.geometry.dispose(); entry[k] = undefined; }
      const data = m[k];
      if (!data) continue;
      const mesh = new THREE.Mesh(toGeometry(data), k === 'opaque' ? this.opaqueMat : this.liquidMat);
      mesh.frustumCulled = true;
      mesh.matrixAutoUpdate = false;
      this.scene.add(mesh);
      entry[k] = mesh;
    }
    if (this.perf) { this.perf.record('mesh', t1 - t0); this.perf.record('geom', performance.now() - t1); this.perf.count('sections'); this.built++; }
    entry.rev = this.volume.sectionRevision(cx, sy, cz);
    if (entry.opaque || entry.liquid) this.sections.set(key, entry); else this.sections.delete(key);
  }

  /** Um quadro: câmera, malhas pendentes (mais perto primeiro, com orçamento de tempo), contorno e desenho. */
  render(eye: { x: number; y: number; z: number }, yaw: number, pitch: number, target: { x: number; y: number; z: number; box?: Box } | null, time: number): void {
    this.camera.position.set(eye.x, eye.y, eye.z);
    this.camera.rotation.set(pitch, yaw, 0);
    this.sky.mesh.position.copy(this.camera.position);
    this.sky.setTime(time);
    this.fogToward(yaw);
    this.updateUnderwater(eye, time);
    this.sun.position.set(eye.x + this.sunDir[0] * 270, eye.y + this.sunDir[1] * 270, eye.z + this.sunDir[2] * 270);
    // edições aparecem no mesmo quadro (sem orçamento); só a geração inicial é repartida entre quadros
    this.built = 0;
    const tb = this.perf ? performance.now() : 0;
    // a seção editada aparece no mesmo quadro; as que só mudaram de luz entram na fila com orçamento (a luz da parede distante pode atrasar uns quadros)
    const urgent = this.volume.takeTouched();
    for (const k of urgent) { this.build(k); this.pending.delete(k); }
    for (const k of this.volume.takeLightTouched()) if (!urgent.includes(k)) this.pending.add(k);
    if (this.pending.size) {
      const px = eye.x / 16, pz = eye.z / 16, py = (eye.y + 64) / 16;
      const order = [...this.pending].map((k) => { const [cx, sy, cz] = k.split(',').map(Number); return { k, d: (cx + 0.5 - px) ** 2 + (cz + 0.5 - pz) ** 2 + (sy + 0.5 - py) ** 2 }; }).sort((a, b) => a.d - b.d);
      const t0 = performance.now();
      for (const { k } of order) {
        this.build(k);
        this.pending.delete(k);
        if (performance.now() - t0 > MESH_BUDGET_MS && this.frame > 1) break;
      }
    }
    this.syncLanterns();
    this.syncModels(this.built > 0);
    this.timeU.value = time;
    let n = 0;
    for (const e of this.itemSprites.values()) e.sprite.position.y = e.baseY + 0.06 * Math.sin(time * 2 + n++);
    this.liquidTex.offset.x = (Math.floor(time / 0.7) % 2) * 0.25; // dois quadros de ondulação
    this.outline.visible = !!target;
    if (target) {
      // célula inteira (bloco) ou a caixa do objeto (lanterna), 2 mm maior para não cintilar sobre as faces
      const b = target.box ?? [target.x, target.y, target.z, target.x + 1, target.y + 1, target.z + 1];
      this.outline.position.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
      this.outline.scale.set(b[3] - b[0] + 0.004, b[4] - b[1] + 0.004, b[5] - b[2] + 0.004);
    }
    if (this.perf && this.built) this.perf.record('buildFrame', performance.now() - tb); // malha + geometria de todo o quadro
    const tr = this.perf ? performance.now() : 0;
    this.renderer.render(this.scene, this.camera);
    if (this.perf) this.perf.record(this.built ? 'drawAfterBuild' : 'draw', performance.now() - tr); // JS do desenho; no quadro com malha nova inclui o envio à GPU
    this.frame++;
  }

  /**
   * Aplica a hora (fração do dia, 0–1): luz ambiente do shader, cores do céu, névoa, fundo e sol. **Não refaz nenhuma malha** (a luz do dia é um uniform).
   * Só recalcula quando a hora mudou o bastante para aparecer (~0,25 s de jogo).
   */
  setSky(frac: number): void {
    if (Math.abs(frac - this.lastSky) < 0.0005) return;
    this.lastSky = frac;
    const sky = skyAt(frac);
    this.curSky = sky;
    this.ambientBase.set(sky.ambient * sky.tint[0], sky.ambient * sky.tint[1], sky.ambient * sky.tint[2]); // luz do dia (quente de dia, fria de noite)
    this.sky.update(sky);
    this.lastFogYaw = 1e9; // a névoa se refaz no próximo quadro com a cor do céu daquele lado
    this.sun.visible = sky.sun.alpha > 0.01;
    (this.sun.material as THREE.SpriteMaterial).opacity = sky.sun.alpha;
    this.sunDir = sky.sun.dir;
    // os fragmentos de superfície (sprites) escurecem com a noite, sem sumir
    const k = Math.max(0.4, sky.ambient);
    for (const m of Object.values(this.itemMats)) m.color.setScalar(k);
    this.itemDim = k;
    this.applyUnderwater(); // por último: o mergulho compõe por cima do céu da hora (ambiente, cúpula, sol)
  }

  /** Saturno: 0 (escondido) a 1 (no pico da janela rara). Só um número no shader do céu. */
  setSaturn(v: number): void { this.sky.setSaturn(v); }

  /** A névoa e o fundo ganham a cor do céu **do lado para onde a câmera olha** (a costa distante some na cor daquele lado do céu). Só refaz quando o olhar gira o bastante. */
  private fogToward(yaw: number): void {
    if (Math.abs(yaw - this.lastFogYaw) < 0.01 || !this.curSky) return;
    this.lastFogYaw = yaw;
    const c = horizonAt(this.curSky, -Math.sin(yaw), -Math.cos(yaw));
    const col = this.sky.tint(c);
    this.skyFog.copy(col);
    this.applyUnderwater();
  }

  /**
   * Compõe o céu do dia com o mergulho num ponto só (ADR 0057): cor de fundo e da névoa, `near`/`far` da névoa, luz ambiente por profundidade e a visibilidade da cúpula e do sol.
   * Só mexe em cores e números (sem recriar objetos nem trocar de shader), então entrar e sair da água não remalha nada. Fora d'água (mix = 0) é exatamente o céu da hora.
   */
  private applyUnderwater(): void {
    const mix = this.under.mix, fog = this.scene.fog as THREE.Fog, bg = this.scene.background as THREE.Color;
    bg.copy(this.skyFog).lerp(this.waterFog, mix);
    fog.color.copy(bg);
    fog.near = RANGE * 0.7 + (UNDERWATER_FOG_NEAR - RANGE * 0.7) * mix;
    fog.far = RANGE * 0.97 + (underwaterFar(this.under.adapt) - RANGE * 0.97) * mix;
    const f = 1 + (underwaterAmbient(this.underDepth) - 1) * mix; // só a parcela do dia; o brilho de lanterna (`glow`) fica de fora
    this.ambient.value.copy(this.ambientBase).multiplyScalar(f);
    this.sky.mesh.visible = mix < 0.6; // a cúpula e o sol não passam pela névoa: somem ao mergulhar
    this.sun.visible = !!this.curSky && this.curSky.sun.alpha > 0.01 && mix < 0.6;
  }

  /** Estado de imersão do quadro: olhos dentro do líquido (célula do olho), mistura de 150 ms e adaptação de 2 s. */
  private updateUnderwater(eye: { x: number; y: number; z: number }, time: number): void {
    const dt = Math.min(0.1, Math.max(0, time - this.lastRenderT));
    this.lastRenderT = time;
    const inWater = eyesSubmerged(eye.y, this.volume.get(Math.floor(eye.x), Math.floor(eye.y), Math.floor(eye.z)), T.LAKE);
    const before = this.under, next = stepUnderwater(before, inWater, dt);
    const depth = eyeDepth(eye.y, inWater);
    const changed = next.mix !== before.mix || next.adapt !== before.adapt || (next.mix > 0 && Math.abs(depth - this.underDepth) > 0.02);
    this.under = next;
    this.underDepth = depth;
    if (changed) this.applyUnderwater();
  }

  private sunDir: [number, number, number] = [0, 1, 0];
  private itemDim = 1;

  /** Mostra as rachaduras (estágio 0–9) sobre a célula `cell`, ou as esconde (`null`): sai no mesmo quadro do cancelamento e não refaz malha. */
  setCrack(cell: { x: number; y: number; z: number } | null, stage = 0): void {
    if (!cell) { this.crack.visible = false; return; }
    this.crackTex.offset.x = Math.min(9, Math.max(0, stage)) * 0.1;
    this.crack.position.set(cell.x + 0.5, cell.y + 0.5, cell.z + 0.5);
    this.crack.visible = true;
  }

  /** Estado das rachaduras (diagnóstico e testes de navegador). */
  crackInfo(): { visible: boolean; stage: number; x: number; y: number; z: number } {
    return { visible: this.crack.visible, stage: Math.round(this.crackTex.offset.x / 0.1), x: this.crack.position.x - 0.5, y: this.crack.position.y - 0.5, z: this.crack.position.z - 0.5 };
  }

  /** Contadores da GPU para o painel de desempenho. */
  gpuStats(): { calls: number; triangles: number; geometries: number; textures: number; contextLost: boolean } {
    const i = this.renderer.info;
    return { calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, contextLost: this.renderer.getContext().isContextLost() };
  }

  /** Altura dos olhos a partir dos pés. */
  static eyeOf(b: { x: number; y: number; z: number }): { x: number; y: number; z: number } { return { x: b.x, y: b.y + EYE_HEIGHT, z: b.z }; }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    for (const e of this.sections.values()) { e.opaque?.geometry.dispose(); e.liquid?.geometry.dispose(); }
    this.renderer.dispose();
  }
}

/** Geometria de um lote da lanterna: sombreado por face como o terreno (`color`) e brilho próprio (`glow`): o núcleo âmbar emite; a estrutura só recebe o calor da própria luz. */
function lanternGeometry(b: LanternBatch, core: boolean): THREE.BufferGeometry {
  const n = b.pos.length / 3, col = new Float32Array(n * 3), glow = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const nx = b.nrm[i * 3], ny = b.nrm[i * 3 + 1], nz = b.nrm[i * 3 + 2];
    const shade = ny > 0.5 ? 1 : ny < -0.5 ? 0.5 : nx > 0.5 ? 0.86 : nx < -0.5 ? 0.66 : nz > 0.5 ? 0.78 : 0.7; // mesmos fatores do terreno (mesher FACES)
    if (core) { glow.set([1.7, 1.15, 0.5], i * 3); } else { col.set([shade, shade, shade], i * 3); glow.set([0.28, 0.2, 0.1], i * 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('glow', new THREE.BufferAttribute(glow, 3));
  g.setIndex(b.idx);
  return g;
}

/** Mesa de Trabalho: sombreado por face (mesmos fatores do terreno) e luz do dia no shader; o brilho de lanterna entra por instância (`iGlow`). UV do glTF (origem no canto superior esquerdo). */
type ModelKind = 'workbench' | 'marco' | 'painel';

/** Geometria de um modelo 3D de bloco (mesa, Marco, Painel): sombreado fixo por face na cor dos vértices, UV do glTF. */
function modelGeometry(m: ModelData): THREE.BufferGeometry {
  const n = m.pos.length / 3, col = new Float32Array(n * 3), glow = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const nx = m.nrm[i * 3], ny = m.nrm[i * 3 + 1], nz = m.nrm[i * 3 + 2];
    const shade = ny > 0.5 ? 1 : ny < -0.5 ? 0.5 : nx > 0.5 ? 0.86 : nx < -0.5 ? 0.66 : nz > 0.5 ? 0.78 : 0.7;
    col.set([shade, shade, shade], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(m.pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(m.uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('glow', new THREE.BufferAttribute(glow, 3));
  g.setIndex(m.idx);
  return g;
}

/** Junco de vidro: duas faixas verticais cruzadas de 1 × 1 (base em y = 0, topo em y = 1: o balanço do shader cresce com a altura). `variant` escolhe o terço do atlas. */
function reedGeometry(variant: number): THREE.BufferGeometry {
  const pos = [-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0, 0, 0, -0.5, 0, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5];
  const u0 = variant / REED_COLUMNS, u1 = (variant + 1) / REED_COLUMNS; // o atlas tem uma coluna vazia depois das silhuetas
  const uv = [u0, 0, u1, 0, u1, 1, u0, 1, u0, 0, u1, 0, u1, 1, u0, 1];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(8 * 3).fill(0.95), 3));
  g.setAttribute('glow', new THREE.Float32BufferAttribute(new Array(8 * 3).fill(0.05), 3)); // o junco não some na noite: só um leve resto de luz
  g.setIndex([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  return g;
}

function toGeometry(d: MeshData): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(d.uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(d.col, 3));
  g.setAttribute('glow', new THREE.BufferAttribute(d.glow, 3));
  g.setIndex(new THREE.BufferAttribute(d.idx, 1));
  g.computeBoundingSphere();
  return g;
}

/**
 * Luz do dia no shader (ADR 0041): `cor final = textura × (sombreado das faces × luz do dia + brilho de lanterna)`. O sombreado vem em `color`, o brilho em `glow`
 * (atributo de cada vértice) e a luz do dia é um uniform: mudar a hora é só mudar o número, sem refazer nenhuma malha. Névoa, mapa de tons e espaço de cor seguem o
 * material do Three.js.
 */
function patchDayLight(mat: THREE.MeshBasicMaterial, ambient: { value: THREE.Vector3 }, opts: { instGlow?: boolean; time?: { value: number } } = {}): void {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uAmbient = ambient;
    if (opts.time) sh.uniforms.uTime = opts.time;
    const sway = opts.time ? '\n#ifdef USE_INSTANCING\ntransformed.x += sin(uTime * 1.7 + instanceMatrix[3].x * 0.9 + instanceMatrix[3].z * 0.7) * 0.07 * position.y;\ntransformed.z += cos(uTime * 1.3 + instanceMatrix[3].z * 0.8) * 0.04 * position.y;\n#endif' : '';
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\nattribute vec3 glow;\n${opts.instGlow ? 'attribute vec3 iGlow;\n' : ''}${opts.time ? 'uniform float uTime;\n' : ''}varying vec3 vGlow;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvGlow = glow${opts.instGlow ? ' + iGlow' : ''};${sway}`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uAmbient;\nvarying vec3 vGlow;')
      .replace('#include <color_fragment>', 'diffuseColor.rgb *= vColor.rgb * uAmbient + vGlow;');
  };
  mat.customProgramCacheKey = () => `titan-daylight${opts.instGlow ? '-ig' : ''}${opts.time ? '-sway' : ''}`;
}
