import * as THREE from 'three';
import { FOV_DEG, SPRINT_FOV_DEG } from '../titan/aim';
import { DIP_SINGLE, EquipAnim, HandAnim, type HandKind } from './heldPose';
import { extrudeMask, itemMask } from '../titan/extrude';
import { heldBlockTiles, heldCategory } from '../titan/heldKinds';
import { titanFarejadorRigUrl, titanFarejadorModel, titanNozFrutosModel, titanNozPlantaModel, titanLanternModel, titanMarcoModel, titanEscadaModel, titanBauModel, titanBauTampaModel, titanCamaModel, titanBraseiroModel, titanBraseiroAcesoModel, titanDegrauModel, titanCadeiraModel, titanPainelModel, titanWorkbenchModel, type LanternBatch, type ModelData } from './art/titan';
import type { Box } from '../titan/lantern';
import { meshSection, tileUV, type MeshData } from '../titan/mesher';
import { EYE_HEIGHT } from '../titan/physics';
import { initialSections } from '../titan/sections';
import { isoCamera, ISO_DISTANCE, ISO_PITCH } from '../titan/iso';
import { horizonAt, skyAt, type Sky, type SkyPalette } from '../titan/sky';
import { SkyDome } from './titanSkyDome';
import type { TitanPerf } from '../titan/perf';
import type { TitanVolume } from '../titan/volume';
import { REED_COLUMNS, REED_VARIANTS, reedVariant } from '../titan/reeds';
import { CROP_FRAMES } from '../titan/crops';
import { nutTurn } from '../titan/nuts';
import { loadFarejadorRig, type RigInstance, type RigTemplate } from './farejadorRig';
import { eyeDepth, eyesSubmerged, stepUnderwater, underwaterAmbient, underwaterFar, UNDERWATER_FOG_NEAR, type UnderwaterState } from '../titan/underwater';
import { DOOR_THICK, type ModelKindName, T } from '../titan/voxel';
import { doorAngle, doorMoving, doorPivot, DOOR_CLOSED_CENTER, stepDoor } from '../titan/doorPose';
import { lidIdle, stepLid } from '../titan/lid';

/**
 * Renderer do Titã (ADR 0039): Three.js, câmera em primeira pessoa, uma `BufferGeometry` por seção de 16³ para o terreno opaco e outra para o
 * líquido, atlas compartilhado de pixels nítidos, sombreado fixo por face nos vértices, **luz do dia como uniform do shader** (ADR 0041: mudar a hora não
 * refaz malha e a luz da lanterna, no atributo `glow`, não depende dela), céu em degradê com sol e névoa que seguem a hora. Só **lê** o volume.
 * Malhas feitas no quadro (limite por quadro, mais perto primeiro); workers ficam para a otimização posterior (NEXT_STEPS).
 */
/** Alcance de render (blocos): a região de teste é pequena; a névoa começa em 70% e fecha antes da borda carregada. */
const RANGE = 64;
/** Textura de pixel art: sem filtro nem mipmaps. */
function pixelTexture(img: HTMLImageElement): THREE.Texture {
  const t = new THREE.Texture(img);
  t.colorSpace = THREE.SRGBColorSpace; t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}
/** Linhas do atlas de itens (4 colunas × 11 linhas de 32 px = 44 ids; 41 em uso, ADR 0102). */
const ITEM_ROWS = 14;
/** Salto de um item recém-solto e voo até o jogador ao ser recolhido, em segundos (ADR 0082). */
const ITEM_HOP_S = 0.4, ITEM_FLY_S = 0.14;
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
  /** Plantas de junco cultivadas (ADR 0083): uma malha instanciada por fase (coluna do atlas de cultivo). */
  private cropMeshes: THREE.InstancedMesh[] = [];
  private cropGeos: THREE.BufferGeometry[] = [];
  private cropMat!: THREE.MeshBasicMaterial;
  private reedGeos: THREE.BufferGeometry[] = [];
  private reedMat!: THREE.MeshBasicMaterial;
  /** Planta da Noz de Duna (todas as plantas) e as nozes (só as maduras): duas malhas instanciadas do mesmo atlas. */
  private nutPlantMesh!: THREE.InstancedMesh;
  private nutFruitMesh!: THREE.InstancedMesh;
  /** Farejadores de Duna: um grupo de partes (tronco, cabeça, cauda, 4 patas) por animal, cada parte girando em torno do pivô; criados sob demanda (geometria e material compartilhados). */
  private farejadores: Array<{ group: THREE.Group; parts: Record<string, THREE.Mesh>; rig?: RigInstance }> = [];
  /** Rig do Farejador (ADR 0064): carrega em segundo plano na primeira vez que há animais; até lá valem as 7 partes. */
  private rigTemplate: RigTemplate | null = null;
  private rigLoading = false;
  /** Mão em primeira pessoa (ADR 0071): cena e câmera próprias, desenhadas por cima do mundo (a profundidade é limpa, a mão não entra em paredes). */
  private readonly handScene = new THREE.Scene();
  private readonly handCamera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.02, 10);
  private readonly held = new Map<number, THREE.Group | 'loading' | 'failed'>();
  private heldItem: number | null = null;
  /** Item na mão (ADR 0087): `heldKey` = id do item (0 = mão vazia); `shownKey` = o que está visível (durante a troca ainda o antigo); a troca afunda o velho e sobe o novo. */
  private heldKey = 0;
  private shownKey = 0;
  private heldInit = false;
  private readonly heldKinds = new Map<number, HandKind>();
  private readonly equip = new EquipAnim();
  private heldFlatMat: THREE.MeshBasicMaterial | null = null;
  private readonly handAnim = new HandAnim();
  private sprintFov = 0; // 0 = FOV normal; 1 = corrida (ADR 0076)
  private sprintOn = false;
  private lastFovMs = 0;
  /** Campo de visão atual da câmera do mundo (a corrida o abre `SPRINT_FOV_DEG` graus). */
  get fov(): number { return FOV_DEG + this.sprintFov * SPRINT_FOV_DEG; }
  /** Liga ou desliga o efeito de corrida (abre o FOV suavemente). */
  setSprint(on: boolean): void { this.sprintOn = on; }
  private handMove = { speed: 0, grounded: true, acting: false };
  private lastRenderMs = 0;
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
  private readonly itemSprites = new Map<string, { sprite: THREE.Sprite; baseY: number; ox: number; oz: number; born: number; cx: number; cz: number }>();
  /** Itens recolhidos que ainda voam até o jogador (~0,14 s) antes de sumir (ADR 0082). */
  private readonly flying: Array<{ sprite: THREE.Sprite; t0: number; x: number; y: number; z: number }> = [];
  private itemsLoaded = false; // a primeira lista (partida retomada) não "salta"; as seguintes sim
  private clock = 0;
  // ---- Vista isométrica 2:1 (ADR 0106) ----
  private mode: 'fp' | 'iso' = 'fp';
  private readonly isoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, ISO_DISTANCE * 2 + 400);
  /** Texturas de cada vista: 16 px na primeira pessoa, 8 px na isométrica (o `material.map` troca; são objetos separados porque o tamanho da imagem muda). */
  private atlasTex!: THREE.Texture;
  private atlasTexIso: THREE.Texture | null = null;
  private liquidTexIso: THREE.Texture | null = null;
  private bufW = 1; private bufH = 1;
  /** Boneco provisório do jogador (só na isométrica) e a silhueta que aparece por trás do terreno. */
  private avatar: THREE.Group | null = null;
  private readonly itemMats: Record<number, THREE.SpriteMaterial> = {};

  constructor(private readonly canvas: HTMLCanvasElement, private readonly volume: TitanVolume, atlas: HTMLImageElement, hotbarAtlas: HTMLImageElement, cracksAtlas: HTMLImageElement, lanternAtlas: HTMLImageElement, extra: { workbenchAtlas: HTMLImageElement; escadaAtlas: HTMLImageElement; bauAtlas: HTMLImageElement; camaAtlas: HTMLImageElement; braseiroAtlas: HTMLImageElement; juncoTile: HTMLImageElement; porta: HTMLImageElement; reed: HTMLImageElement; cultivo: HTMLImageElement; lake: HTMLImageElement; margemAtlas: HTMLImageElement; nozAtlas: HTMLImageElement; farejadorAtlas: HTMLImageElement; /** Texturas de 8 px da vista isométrica (atlas de terreno e água; ADR 0106). */ iso?: { atlas: HTMLImageElement; lake: HTMLImageElement } }, private readonly perf: TitanPerf | null = null) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.scene.background = new THREE.Color(0xd2a066);
    this.scene.fog = new THREE.Fog(0xd2a066, RANGE * 0.7, RANGE * 0.97);
    this.camera = new THREE.PerspectiveCamera(FOV_DEG, 1, 0.05, 400);
    this.camera.rotation.order = 'YXZ';

    const tex = new THREE.Texture(atlas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    this.atlasTex = tex;
    if (extra.iso) { this.atlasTexIso = pixelTexture(extra.iso.atlas); this.liquidTexIso = pixelTexture(extra.iso.lake); }
    this.opaqueMat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, fog: true });
    patchDayLight(this.opaqueMat, this.ambient);
    // o líquido tem atlas próprio de 16 px (Lago Escuro V2, ADR 0057, reduzido na ADR 0106: topo 1, topo 2, lateral, lateral) e alterna o quadro deslocando o UV em 1 célula (0,25); a face de cima aparece também por baixo
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
    // Escada de Junco (ADR 0088): cor-base de 256 px própria; a trama de junco pede os dois lados (DoubleSide)
    const etex = new THREE.Texture(extra.escadaAtlas);
    etex.colorSpace = THREE.SRGBColorSpace;
    etex.magFilter = THREE.NearestFilter;
    etex.minFilter = THREE.NearestFilter;
    etex.generateMipmaps = false;
    etex.flipY = false;
    etex.needsUpdate = true;
    const emat = new THREE.MeshBasicMaterial({ map: etex, vertexColors: true, fog: true, side: THREE.DoubleSide });
    patchDayLight(emat, this.ambient, { instGlow: true });
    // Baú de Rocha e Junco (ADR 0089): cor-base de 256 px própria
    const btex = new THREE.Texture(extra.bauAtlas);
    btex.colorSpace = THREE.SRGBColorSpace;
    btex.magFilter = THREE.NearestFilter;
    btex.minFilter = THREE.NearestFilter;
    btex.generateMipmaps = false;
    btex.flipY = false;
    btex.needsUpdate = true;
    const bmat = new THREE.MeshBasicMaterial({ map: btex, vertexColors: true, fog: true });
    patchDayLight(bmat, this.ambient, { instGlow: true });
    // Cama de Junco (ADR 0090): cor-base de 256 px própria; o modelo cobre as duas células
    const ctex2 = new THREE.Texture(extra.camaAtlas);
    ctex2.colorSpace = THREE.SRGBColorSpace;
    ctex2.magFilter = THREE.NearestFilter;
    ctex2.minFilter = THREE.NearestFilter;
    ctex2.generateMipmaps = false;
    ctex2.flipY = false;
    ctex2.needsUpdate = true;
    const camat = new THREE.MeshBasicMaterial({ map: ctex2, vertexColors: true, fog: true });
    patchDayLight(camat, this.ambient, { instGlow: true });
    // Braseiro de Rocha (ADR 0092): apagado e aceso dividem o atlas de 256 × 320 px; o aceso ganha brilho fixo (ver `syncModels`)
    const brtex = new THREE.Texture(extra.braseiroAtlas);
    brtex.colorSpace = THREE.SRGBColorSpace;
    brtex.magFilter = THREE.NearestFilter;
    brtex.minFilter = THREE.NearestFilter;
    brtex.generateMipmaps = false;
    brtex.flipY = false;
    brtex.needsUpdate = true;
    const brmat = new THREE.MeshBasicMaterial({ map: brtex, vertexColors: true, fog: true });
    patchDayLight(brmat, this.ambient, { instGlow: true });
    // Degrau e Cadeira de Junco (ADR 0101): a trama de 64 px repete por face (UV em metros)
    const jtex = new THREE.Texture(extra.juncoTile);
    jtex.colorSpace = THREE.SRGBColorSpace;
    jtex.magFilter = THREE.NearestFilter;
    jtex.minFilter = THREE.NearestFilter;
    jtex.wrapS = jtex.wrapT = THREE.RepeatWrapping;
    jtex.generateMipmaps = false;
    jtex.flipY = false;
    jtex.needsUpdate = true;
    const jmat = new THREE.MeshBasicMaterial({ map: jtex, vertexColors: true, fog: true });
    patchDayLight(jmat, this.ambient, { instGlow: true });
    // Porta de Junco (ADR 0102): a folha de 64 × 128 px, de frente; dois lados visíveis e a matriz espelha para a dobradiça à direita (por isso DoubleSide)
    const ptex = new THREE.Texture(extra.porta);
    ptex.colorSpace = THREE.SRGBColorSpace;
    ptex.magFilter = THREE.NearestFilter;
    ptex.minFilter = THREE.NearestFilter;
    ptex.generateMipmaps = false;
    ptex.flipY = false;
    ptex.needsUpdate = true;
    const pmat = new THREE.MeshBasicMaterial({ map: ptex, vertexColors: true, fog: true, side: THREE.DoubleSide });
    patchDayLight(pmat, this.ambient, { instGlow: true });
    const batches: Array<[ModelKind, ModelData, THREE.Material]> = [['porta', doorModelData(), pmat], ['workbench', titanWorkbenchModel, wmat], ['marco', titanMarcoModel, mmat], ['painel', titanPainelModel, mmat], ['escada', titanEscadaModel, emat], ['bau', titanBauModel, bmat], ['bauTampa', titanBauTampaModel, bmat], ['cama', titanCamaModel, camat], ['braseiro', titanBraseiroModel, brmat], ['braseiroAceso', titanBraseiroAcesoModel, brmat], ['degrau', titanDegrauModel, jmat], ['cadeira', titanCadeiraModel, jmat]];
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

    // junco cultivado (ADR 0083): as mesmas faixas cruzadas do junco, com o atlas de cultivo (muda, crescendo, adulto, ressecado)
    const ctex = new THREE.Texture(extra.cultivo);
    ctex.colorSpace = THREE.SRGBColorSpace;
    ctex.magFilter = THREE.NearestFilter;
    ctex.minFilter = THREE.NearestFilter;
    ctex.generateMipmaps = false;
    ctex.needsUpdate = true;
    const cmat = new THREE.MeshBasicMaterial({ map: ctex, vertexColors: true, fog: true, alphaTest: 0.5, side: THREE.DoubleSide });
    patchDayLight(cmat, this.ambient, { time: this.timeU });
    this.cropMat = cmat;
    for (let f = 0; f < CROP_FRAMES; f++) {
      const geo = reedGeometry(f, CROP_FRAMES);
      const mesh = new THREE.InstancedMesh(geo, cmat, 16);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      this.cropGeos.push(geo);
      this.cropMeshes.push(mesh);
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
    for (const kind of ['workbench', 'marco', 'painel', 'escada', 'bau', 'cama', 'braseiro', 'braseiroAceso', 'degrau', 'cadeira', 'porta'] as const) {
      const cells = this.volume.modelCells(kind);
      for (const target of kind === 'bau' ? (['bau', 'bauTampa'] as const) : [kind]) { // a tampa do baú é outra malha nas mesmas células (ADR 0093)
        let mesh = this.modelMeshes[target];
        if (cells.length > mesh.instanceMatrix.count) {
          const n = new THREE.InstancedMesh(mesh.geometry, mesh.material, Math.max(cells.length, mesh.instanceMatrix.count * 2));
          n.frustumCulled = false;
          this.scene.remove(mesh);
          this.scene.add(n);
          mesh = this.modelMeshes[target] = n;
        }
        const glow = new Float32Array(mesh.instanceMatrix.count * 3);
        if (target === 'bauTampa') this.lidIndex.clear();
        if (target === 'porta') this.doorIndex.clear();
        cells.forEach(([x, y, z, turn], i) => {
          if (target === 'bauTampa') { this.lidIndex.set(lidKey(x, y, z), { i, x, y, z, turn }); this.setLidMatrix(mesh, i, x, y, z, turn, this.lidAngles.get(lidKey(x, y, z)) ?? 0); }
          else if (target === 'porta') { // o `turn` leva giro (0–3), abertura (bit 2) e dobradiça à direita (bit 3); a folha parte da abertura que já tinha (ADR 0102)
            const key = lidKey(x, y, z), open = (turn & 4) !== 0, d = { i, x, y, z, turn: turn & 3, hingeRight: (turn & 8) !== 0, open };
            this.doorIndex.set(key, d);
            if (!this.doorAmt.has(key)) this.doorAmt.set(key, open ? 1 : 0);
            this.setDoorMatrix(mesh, d, this.doorAmt.get(key)!);
          }
          else { mat.makeRotationY(turn * Math.PI / 2).setPosition(x + 0.5, y, z + 0.5); mesh.setMatrixAt(i, mat); }
          let lv = 0;
          for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) lv = Math.max(lv, this.volume.light(x + dx, y + dy, z + dz));
          const w = Math.max(lv > 0 ? Math.pow(lv / 15, 1.3) * 0.7 : 0, kind === 'braseiroAceso' ? EMBER_GLOW : 0); // o braseiro aceso brilha sozinho, de dia e de noite
          glow.set([w, w * 0.72, w * 0.38], i * 3);
        });
        mesh.geometry.setAttribute('iGlow', new THREE.InstancedBufferAttribute(glow, 3));
        mesh.count = cells.length;
        mesh.instanceMatrix.needsUpdate = true;
        if (target === 'porta') for (const k of [...this.doorAmt.keys()]) if (!this.doorIndex.has(k)) this.doorAmt.delete(k); // porta que saiu: a próxima nasce no estado dela
      }
    }
  }

  // ---- Porta de Junco (ADR 0102) ----
  private readonly doorAmt = new Map<string, number>();
  private readonly doorIndex = new Map<string, { i: number; x: number; y: number; z: number; turn: number; hingeRight: boolean; open: boolean }>();
  private doorTime = 0;
  /** Matriz da folha: posição da célula, giro, eixo da dobradiça e abertura (`doorPose`); com a dobradiça à direita o modelo (dobradiça à esquerda) é espelhado em x. */
  private setDoorMatrix(mesh: THREE.InstancedMesh, d: { i: number; x: number; y: number; z: number; turn: number; hingeRight: boolean }, amount: number): void {
    const [px, pz] = doorPivot(d.hingeRight), [cx, cz] = DOOR_CLOSED_CENTER, t = new THREE.Matrix4();
    const m = new THREE.Matrix4().makeTranslation(d.x + 0.5, d.y, d.z + 0.5);
    m.multiply(t.makeRotationY(d.turn * Math.PI / 2)).multiply(t.makeTranslation(px, 0, pz)).multiply(t.makeRotationY(doorAngle(d.hingeRight, amount))).multiply(t.makeTranslation(cx - px, 0, cz - pz));
    if (d.hingeRight) m.multiply(t.makeScale(-1, 1, 1));
    mesh.setMatrixAt(d.i, m);
  }
  private animateDoors(time: number): void {
    const dt = this.doorTime ? Math.min(0.1, time - this.doorTime) : 0;
    this.doorTime = time;
    let moved = false;
    const mesh = this.modelMeshes.porta;
    for (const [key, d] of this.doorIndex) {
      const amt = this.doorAmt.get(key) ?? 0;
      if (!doorMoving(amt, d.open)) continue;
      const next = stepDoor(amt, d.open, dt);
      this.doorAmt.set(key, next);
      this.setDoorMatrix(mesh, d, next);
      moved = true;
    }
    if (moved) mesh.instanceMatrix.needsUpdate = true;
  }
  /** Abertura visual da porta da célula (0 fechada, 1 aberta; testes de navegador). */
  doorAmount(x: number, y: number, z: number): number { return this.doorAmt.get(lidKey(x, y, z)) ?? 0; }
  /** Portas desenhadas (diagnóstico e testes de navegador). */
  get portaCount(): number { return this.modelMeshes.porta.count; }

  // ---- Tampa do baú (ADR 0093) ----
  private readonly lidAngles = new Map<string, number>();
  private readonly lidIndex = new Map<string, { i: number; x: number; y: number; z: number; turn: number }>();
  private openChest: string | null = null;
  private lidTime = 0;
  /** Matriz da tampa: a posição do baú, o giro, a dobradiça e a abertura (a frente sobe; a dobradiça fica atrás, em −z). */
  private setLidMatrix(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, turn: number, angle: number): void {
    const [px, py, pz] = titanBauTampaModel.pivot, t = new THREE.Matrix4();
    const m = new THREE.Matrix4().makeTranslation(x + 0.5, y, z + 0.5);
    m.multiply(t.makeRotationY(turn * Math.PI / 2)).multiply(t.makeTranslation(px, py, pz)).multiply(t.makeRotationX(-angle));
    mesh.setMatrixAt(i, m);
  }
  /** O baú cujo painel está aberto (a tampa abre) ou `null`; o que estava aberto fecha sozinho. */
  setOpenChest(cell: { x: number; y: number; z: number } | null): void {
    this.openChest = cell ? lidKey(cell.x, cell.y, cell.z) : null;
    if (this.openChest && !this.lidAngles.has(this.openChest)) this.lidAngles.set(this.openChest, 0);
  }
  /** Quantos baús estão com a tampa em movimento ou aberta (diagnóstico e testes de navegador). */
  get lidsActive(): number { return this.lidAngles.size; }
  lidAngle(x: number, y: number, z: number): number { return this.lidAngles.get(lidKey(x, y, z)) ?? 0; }
  private animateLids(time: number): void {
    const dt = this.lidTime ? time - this.lidTime : 0;
    this.lidTime = time;
    if (!this.lidAngles.size) return;
    const mesh = this.modelMeshes.bauTampa;
    for (const [key, angle] of [...this.lidAngles]) {
      const open = key === this.openChest, next = stepLid(angle, open, dt), cell = this.lidIndex.get(key);
      if (cell) this.setLidMatrix(mesh, cell.i, cell.x, cell.y, cell.z, cell.turn, next);
      if (!open && lidIdle(next, false)) this.lidAngles.delete(key); else this.lidAngles.set(key, next);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  /** Mesas desenhadas (diagnóstico e testes de navegador). */
  get workbenchCount(): number { return this.modelMeshes.workbench.count; }
  /** Marcos e Painéis desenhados (diagnóstico e testes de navegador). */
  get marcoCount(): number { return this.modelMeshes.marco.count; }
  get painelCount(): number { return this.modelMeshes.painel.count; }
  /** Escadas desenhadas (diagnóstico e testes de navegador). */
  get escadaCount(): number { return this.modelMeshes.escada.count; }
  /** Baús desenhados (diagnóstico e testes de navegador). */
  get bauCount(): number { return this.modelMeshes.bau.count; }
  /** Camas desenhadas (diagnóstico e testes de navegador). */
  get camaCount(): number { return this.modelMeshes.cama.count; }
  /** Braseiros desenhados, apagados e acesos (diagnóstico e testes de navegador). */
  get braseiroCount(): number { return this.modelMeshes.braseiro.count; }
  get braseiroAcesoCount(): number { return this.modelMeshes.braseiroAceso.count; }

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

  /** Plantas de junco cultivadas de pé (ADR 0083): `frame` = coluna do atlas de cultivo. Giro fixo pela posição; a lista vazia esconde todas. */
  setCrops(list: ReadonlyArray<{ x: number; y: number; z: number; frame: number }>): void {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    for (let f = 0; f < CROP_FRAMES; f++) {
      const g = list.filter((c) => c.frame === f);
      let mesh = this.cropMeshes[f];
      if (g.length > mesh.instanceMatrix.count) {
        this.scene.remove(mesh);
        mesh = new THREE.InstancedMesh(this.cropGeos[f], this.cropMat, Math.max(g.length, mesh.instanceMatrix.count * 2));
        mesh.frustumCulled = false;
        this.scene.add(mesh);
        this.cropMeshes[f] = mesh;
      }
      g.forEach((c, i) => {
        const h = Math.sin(c.x * 12.9898 + c.z * 78.233) * 43758.5453, r = h - Math.floor(h);
        q.setFromAxisAngle(up, r * Math.PI);
        m.compose(p.set(c.x + 0.5, c.y, c.z + 0.5), q, sc);
        mesh.setMatrixAt(i, m);
      });
      mesh.count = g.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Plantas de Noz de Duna de pé: a planta sempre, os frutos só nas maduras. Giro fixo pela posição. */
  setNuts(list: ReadonlyArray<{ x: number; y: number; z: number; ripe: boolean; s?: number }>): void {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
    const fill = (mesh: THREE.InstancedMesh, items: ReadonlyArray<{ x: number; y: number; z: number; s?: number }>): THREE.InstancedMesh => {
      if (items.length > mesh.instanceMatrix.count) {
        const n = new THREE.InstancedMesh(mesh.geometry, mesh.material, Math.max(items.length, mesh.instanceMatrix.count * 2));
        n.frustumCulled = false;
        this.scene.remove(mesh);
        this.scene.add(n);
        mesh = n;
      }
      items.forEach((n, i) => { q.setFromAxisAngle(up, nutTurn(n.x, n.z) * Math.PI * 2); m.compose(p.set(n.x + 0.5, n.y, n.z + 0.5), q, sc.setScalar(n.s ?? 1)); mesh.setMatrixAt(i, m); }); // `s` = tamanho do broto da noz plantada (ADR 0083)
      mesh.count = items.length;
      mesh.instanceMatrix.needsUpdate = true;
      return mesh;
    };
    this.nutPlantMesh = fill(this.nutPlantMesh, list);
    this.nutFruitMesh = fill(this.nutFruitMesh, list.filter((n) => n.ripe));
  }
  /** Farejadores de Duna: pés, giro (`rotation.y`), escala, rolagem de costas e pose das partes de cada animal; a lista vazia esconde todos. */
  // ---- Jogadores da sala (ADR 0104): boneco simples (corpo e cabeça) e o nome em cima ----
  private readonly remotes = new Map<number, { g: THREE.Group; label: string }>();
  /** Desenha os outros jogadores da sala; quem saiu da lista some. Posição é a dos pés; `yaw` do olhar. */
  setRemotePlayers(list: ReadonlyArray<{ id: number; name: string; x: number; y: number; z: number; yaw: number }>): void {
    const seen = new Set<number>();
    for (const p of list) {
      seen.add(p.id);
      let r = this.remotes.get(p.id);
      if (!r || r.label !== p.name) {
        if (r) { this.scene.remove(r.g); }
        const g = new THREE.Group(), hue = (p.id * 0.17) % 1;
        const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 0.55, 0.55), fog: true });
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.28), mat); body.position.y = 0.75;
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), new THREE.MeshBasicMaterial({ color: 0xe8c9a0, fog: true })); head.position.y = 1.42;
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0x222222 })); nose.position.set(0, 1.42, -0.19); // a frente do olhar (−Z com yaw 0)
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 48;
        const c = cv.getContext('2d')!; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 6; c.strokeStyle = '#000b'; c.fillStyle = '#fff';
        c.strokeText(p.name, 128, 24); c.fillText(p.name, 128, 24);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
        const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); label.scale.set(1.6, 0.3, 1); label.position.y = 1.95;
        g.add(body, head, nose, label);
        this.scene.add(g);
        r = { g, label: p.name };
        this.remotes.set(p.id, r);
      }
      r.g.position.set(p.x, p.y, p.z);
      r.g.rotation.y = p.yaw;
    }
    for (const [id, r] of [...this.remotes]) if (!seen.has(id)) { this.scene.remove(r.g); this.remotes.delete(id); }
  }

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
    if (list.length && !this.rigTemplate && !this.rigLoading) this.loadRig();
    this.farejadores.forEach((e, i) => {
      const s = list[i];
      if (this.rigTemplate && !e.rig) { e.rig = this.rigTemplate.make(); this.scene.add(e.rig.group); } // o molde chegou: este animal passa ao rig
      const active = e.rig ? e.rig.group : e.group;
      e.group.visible = !!s && !e.rig;
      if (e.rig) e.rig.group.visible = !!s;
      if (!s) return;
      active.scale.setScalar(s.scale);
      active.position.set(s.x, s.y + (s.pose.bob + 0.72 * Math.sin(s.pose.roll / 2)) * s.scale, s.z); // de costas o dorso fica no chão: sobe o centro para não afundar
      active.rotation.order = 'YXZ';
      active.rotation.set(s.pose.roll, s.yaw, 0);
      if (e.rig) { e.rig.apply(s.pose); return; }
      e.parts.cabeca.rotation.set(0, s.pose.headYaw, s.pose.headPitch);
      e.parts.cauda.rotation.set(0, s.pose.tailYaw, 0);
      (['pata_dd', 'pata_de', 'pata_td', 'pata_te'] as const).forEach((k, j) => e.parts[k].rotation.set(0, 0, s.pose.legs[j]));
    });
  }
  /** Carrega o GLB com rig uma vez (falha = continua nas 7 partes, sem tentar de novo). */
  private loadRig(): void {
    this.rigLoading = true;
    loadFarejadorRig(titanFarejadorRigUrl, (map) => {
      const m = new THREE.MeshBasicMaterial({ map, vertexColors: true, fog: true, side: THREE.DoubleSide });
      patchDayLight(m, this.ambient);
      return m;
    }).then((t) => { this.rigTemplate = t; }, (e) => { console.warn('Titã: rig do Farejador não carregou; ficam as 7 partes', e); });
  }
  /**
   * Item na mão (id do item ou null = mão vazia; ADR 0087): cada categoria tem a sua malha, feita uma vez e guardada: **modelo** (GLB: Adaga e Picareta de Rocha, ADRs 0071 e 0078), **bloco**
   * (cubo com as texturas do terreno), **item plano** e **ferramenta** (sprite extrudado a partir da máscara de `itemMasks.json`) e **mão vazia** (o braço). Trocar de item afunda o antigo e sobe o novo.
   */
  setHeld(item: number | null): void {
    if (this.heldInit && item === this.heldItem) return;
    const first = !this.heldInit, prev = this.heldKey;
    this.heldInit = true;
    this.heldItem = item;
    this.heldKey = item ?? 0;
    this.ensureHeld(item);
    if (first) this.shownKey = this.heldKey;
    else { if (!this.equip.active) this.shownKey = prev; this.equip.start(); }
  }
  private ensureHeld(item: number | null): void {
    const key = item ?? 0, cat = heldCategory(item, false); // arma, ferramenta e item são sprite extrudado (ADR 0097); `model` fica reservado às exceções em 3D (tridente, besta)
    this.heldKinds.set(key, cat === 'hand' ? 'hand' : cat === 'block' ? 'block' : cat === 'tool' ? 'tool' : 'flat');
    if (this.held.has(key)) return;
    const g = cat === 'hand' ? this.buildArm() : cat === 'block' ? this.buildBlock(item!) : this.buildFlat(item!, cat === 'tool');
    if (!g) { this.held.set(key, 'failed'); return; }
    g.visible = false;
    this.handScene.add(g);
    this.held.set(key, g);
  }
  /** Braço direito da mão vazia (4 × 12 × 4 px da skin: 0,25 × 0,75 × 0,25), com a base na origem para girar a partir do ombro. */
  private buildArm(): THREE.Group {
    const geo = new THREE.BoxGeometry(0.25, 0.75, 0.25);
    geo.translate(0, 0.375, 0);
    shadeHeld(geo, (nx, ny, nz) => Math.max(0.55, Math.min(1, 0.75 + 0.2 * ny + 0.1 * nx + 0.1 * nz)));
    const m = new THREE.MeshBasicMaterial({ color: 0xc4966c, vertexColors: true });
    patchDayLight(m, this.ambient);
    const mesh = new THREE.Mesh(geo, m);
    mesh.frustumCulled = false;
    const g = new THREE.Group();
    g.add(mesh);
    return g;
  }
  /** Bloco cúbico na mão: cubo de 0,4 com as texturas do terreno (topo, lateral e base) e o sombreado fixo por face; gira 45° na pose para mostrar duas laterais e o topo. */
  private buildBlock(item: number): THREE.Group | null {
    const tiles = heldBlockTiles(item);
    if (!tiles) return null;
    const geo = new THREE.BoxGeometry(1, 1, 1), uv = geo.getAttribute('uv') as THREE.BufferAttribute;
    [tiles[1], tiles[1], tiles[0], tiles[2], tiles[1], tiles[1]].forEach((tile, f) => { // ordem do BoxGeometry: +x, −x, +y, −y, +z, −z
      const [u0, v0, u1, v1] = tileUV(tile);
      uv.setXY(f * 4, u0, v1); uv.setXY(f * 4 + 1, u1, v1); uv.setXY(f * 4 + 2, u0, v0); uv.setXY(f * 4 + 3, u1, v0);
    });
    shadeHeld(geo, (nx, ny, nz) => (ny > 0.5 ? 1 : ny < -0.5 ? 0.55 : nx > 0.5 ? 0.86 : nx < -0.5 ? 0.66 : nz > 0.5 ? 0.78 : 0.7));
    const mesh = new THREE.Mesh(geo, this.opaqueMat);
    mesh.frustumCulled = false;
    const g = new THREE.Group();
    g.add(mesh);
    g.scale.setScalar(0.22);
    return g;
  }
  /**
   * Item plano ou ferramenta: o sprite do item vira malha 3D (frente, verso e bordas de 1/16, `extrudeMask`) com a textura do atlas de itens. A ferramenta tem o pivô no cabo (canto de baixo à
   * esquerda do sprite), como o `handheld` do Minecraft; o item plano gira pelo centro.
   */
  private buildFlat(item: number, handle: boolean): THREE.Group | null {
    const m = itemMask(item);
    if (!m) return null;
    const ex = extrudeMask(m.mask, m.w, m.h, 1 / 16), idx = item - 1, col = idx % 4, row = (idx / 4) | 0;
    const uv = ex.uv.map((v, i) => (i % 2 === 0 ? (col + v) / 4 : 1 - (row + (1 - v)) / ITEM_ROWS)); // sprite → célula do atlas de itens
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(ex.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(ex.nrm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(ex.idx);
    shadeHeld(geo, (nx, ny, nz) => (Math.abs(nz) > 0.5 ? 0.95 : 0.62 + 0.25 * Math.max(0, ny) + 0.1 * nx));
    this.heldFlatMat ??= (() => { const mat = new THREE.MeshBasicMaterial({ map: this.hotbarTex, vertexColors: true, side: THREE.DoubleSide }); patchDayLight(mat, this.ambient); return mat; })();
    const mesh = new THREE.Mesh(geo, this.heldFlatMat);
    mesh.frustumCulled = false;
    if (handle) mesh.position.set(0.5, 0.5, 0); // o cabo (canto de baixo à esquerda do sprite) fica na origem: é o pivô do golpe
    const g = new THREE.Group();
    g.add(mesh);
    g.scale.setScalar(handle ? 0.34 : 0.28);
    return g;
  }
  /** Começa um golpe da mão (animação de `SWING_S`, com o afundamento do golpe isolado). */
  swingHand(): void { this.handAnim.trigger(DIP_SINGLE); }
  /** Estado do jogador para a mão: velocidade horizontal e chão (balanço ao andar) e `acting` (segurando para quebrar: o golpe se repete). */
  setHandMotion(speed: number, grounded: boolean, acting: boolean): void { this.handMove = { speed, grounded, acting }; }
  /** A mão tem modelo carregado e visível? (diagnóstico e testes de navegador.) */
  get heldVisible(): boolean { const g = this.held.get(this.shownKey); return !!g && typeof g !== 'string' && g.visible; }
  /** O Farejador usa o rig? (diagnóstico e testes de navegador.) */
  get farejadorRigAtivo(): boolean { return this.farejadores.some((e) => !!e.rig); }
  /** Plantas e nozes desenhadas (diagnóstico e testes de navegador). */
  get nutPlantCount(): number { return this.nutPlantMesh.count; }
  get nutFruitCount(): number { return this.nutFruitMesh.count; }

  /** Lanternas desenhadas (diagnóstico e testes de navegador). */
  get lanternCount(): number { return this.lanternStructure.count; }

  readonly resize = (): void => {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.bufW = w; this.bufH = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.handCamera.aspect = w / h;
    this.handCamera.updateProjectionMatrix();
  };

  // ---- Vista isométrica 2:1 (ADR 0106) ----
  get viewMode(): 'fp' | 'iso' { return this.mode; }
  private isoHalf = [0, 0];
  /** Troca a vista: na isométrica o buffer tem 1 pixel por pixel CSS e a tela o amplia **sem suavização** (blocos de 8 × 8 px de textura), o atlas e a água passam a ser os de 8 px e somem céu, sol, névoa e mão. */
  setViewMode(mode: 'fp' | 'iso'): void {
    if (mode === this.mode) return;
    this.mode = mode;
    const iso = mode === 'iso';
    this.renderer.setPixelRatio(iso ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    this.canvas.style.imageRendering = iso ? 'pixelated' : '';
    this.opaqueMat.map = iso && this.atlasTexIso ? this.atlasTexIso : this.atlasTex;
    this.liquidMat.map = iso && this.liquidTexIso ? this.liquidTexIso : this.liquidTex;
    if (iso) { this.under = { mix: 0, adapt: 0 }; this.underDepth = 0; }
    if (iso && !this.avatar) this.avatar = this.buildAvatar();
    if (this.avatar) this.avatar.visible = iso;
    this.resize();
    this.applyUnderwater();
    this.lastFogYaw = 1e9; this.lastSky = -1; // refaz o fundo e a luz do céu no próximo quadro
  }

  private placeIsoCamera(eye: { x: number; y: number; z: number }, yaw: number): void {
    const cam = isoCamera([eye.x, eye.y - EYE_HEIGHT + 0.9, eye.z], yaw, this.bufW, this.bufH), c = this.isoCam;
    if (this.isoHalf[0] !== cam.halfW || this.isoHalf[1] !== cam.halfH) {
      this.isoHalf = [cam.halfW, cam.halfH];
      c.left = -cam.halfW; c.right = cam.halfW; c.top = cam.halfH; c.bottom = -cam.halfH; c.updateProjectionMatrix();
    }
    c.position.set(cam.pos[0], cam.pos[1], cam.pos[2]);
    c.rotation.order = 'YXZ';
    c.rotation.set(-ISO_PITCH, yaw, 0);
  }

  /** Boneco provisório (0,6 × 1,8 m: corpo, cabeça e nariz na frente) e, por trás do terreno, a mesma figura em silhueta azul translúcida (só onde o teste de profundidade falha). */
  private buildAvatar(): THREE.Group {
    const g = new THREE.Group();
    const parts: Array<[THREE.BoxGeometry, number, [number, number, number]]> = [
      [new THREE.BoxGeometry(0.5, 0.9, 0.3), 0xd9623b, [0, 0.75, 0]], [new THREE.BoxGeometry(0.4, 0.4, 0.4), 0xe8c9a0, [0, 1.5, 0]], [new THREE.BoxGeometry(0.1, 0.1, 0.1), 0x222222, [0, 1.5, -0.25]], [new THREE.BoxGeometry(0.46, 0.3, 0.3), 0x3b4a8c, [0, 0.15, 0]],
    ];
    for (const [geo, color, [x, y, z]] of parts) {
      const solid = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, fog: false }));
      solid.position.set(x, y, z);
      const ghost = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: 0.6, depthFunc: THREE.GreaterDepth, depthWrite: false, fog: false }));
      ghost.position.set(x, y, z); ghost.renderOrder = 10;
      g.add(solid, ghost);
    }
    g.visible = false;
    this.scene.add(g);
    return g;
  }

  /** Onde o ponto do mundo `(x, y, z)` cai na tela, em px CSS do canvas (câmera da vista atual); `null` se estiver atrás da câmera. Para testes de navegador e diagnóstico. */
  screenOf(x: number, y: number, z: number): { x: number; y: number } | null {
    const cam = this.mode === 'iso' ? this.isoCam : this.camera;
    cam.updateMatrixWorld();
    const v = new THREE.Vector3(x, y, z).project(cam);
    if (v.z < -1 || v.z > 1) return null;
    return { x: ((v.x + 1) / 2) * this.bufW, y: ((1 - v.y) / 2) * this.bufH };
  }

  /** Posição dos pés e a direção em que o boneco olha (mesma convenção do `yaw`: 0 = −Z). Só aparece na isométrica. */
  setAvatar(x: number, y: number, z: number, yaw: number): void {
    if (!this.avatar) return;
    this.avatar.position.set(x, y, z);
    this.avatar.rotation.y = yaw;
  }

  /** Fragmentos de superfície ainda no mundo (sprites do atlas da hotbar: rocha = índice 4, gelo = 5). Chamar de novo depois de uma coleta. */
  setItems(items: Array<{ id: string; item: number; x: number; y: number; z: number }>): void {
    const keep = new Set(items.map((i) => i.id));
    for (const [id, e] of this.itemSprites) if (!keep.has(id)) { this.flying.push({ sprite: e.sprite, t0: this.clock, x: e.sprite.position.x, y: e.sprite.position.y, z: e.sprite.position.z }); this.itemSprites.delete(id); }
    const fresh = this.itemsLoaded;
    this.itemsLoaded = true;
    for (const it of items) {
      const old = this.itemSprites.get(it.id);
      if (old) { // já existe: acompanha a queda (altura real) e o deslocamento de célula (ADR 0098)
        old.baseY = it.y + 0.32;
        if (old.cx !== it.x || old.cz !== it.z) { old.cx = it.x; old.cz = it.z; old.sprite.position.x = it.x + 0.5 + old.ox; old.sprite.position.z = it.z + 0.5 + old.oz; }
        continue;
      }
      const mat = this.itemMats[it.item] ??= this.spriteMaterial(it.item - 1);
      mat.color.setScalar(this.itemDim);
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(0.6, 0.6, 1);
      const baseY = it.y + 0.32;
      let h = 2166136261; for (let i = 0; i < it.id.length; i++) h = Math.imul(h ^ it.id.charCodeAt(i), 16777619);
      const ox = (((h >>> 0) % 1000) / 1000 - 0.5) * 0.36, oz = (((h >>> 10) % 1000) / 1000 - 0.5) * 0.36; // itens na mesma célula não se sobrepõem
      sprite.position.set(it.x + 0.5 + ox, baseY, it.z + 0.5 + oz);
      this.scene.add(sprite);
      this.itemSprites.set(it.id, { sprite, baseY, ox, oz, born: fresh ? this.clock : -1e9, cx: it.x, cz: it.z });
    }
  }

  private hotbarTex!: THREE.Texture;
  private spriteMaterial(index: number): THREE.SpriteMaterial {
    const tex = this.hotbarTex.clone();
    tex.needsUpdate = true;
    tex.repeat.set(0.25, 1 / ITEM_ROWS); // atlas de itens 4 × 13 (128 × 416 px, células de 32 px; ADR 0053, 0063, 0089)
    tex.offset.set((index % 4) * 0.25, 1 - (((index / 4) | 0) + 1) / ITEM_ROWS);
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
    const fovGoal = this.sprintOn ? 1 : 0;
    if (this.sprintFov !== fovGoal) { // abre e fecha o campo de visão em ~0,15 s
      const now = performance.now(), dt = this.lastFovMs ? Math.min(0.1, (now - this.lastFovMs) / 1000) : 0.016;
      this.sprintFov += Math.sign(fovGoal - this.sprintFov) * Math.min(Math.abs(fovGoal - this.sprintFov), dt * 7);
      this.camera.fov = this.fov; this.camera.updateProjectionMatrix();
    }
    this.lastFovMs = performance.now();
    const iso = this.mode === 'iso';
    if (iso) this.placeIsoCamera(eye, yaw);
    else {
      this.camera.position.set(eye.x, eye.y, eye.z);
      this.camera.rotation.set(pitch, yaw, 0);
    }
    this.sky.mesh.position.copy(iso ? this.isoCam.position : this.camera.position);
    this.sky.setTime(time);
    this.fogToward(yaw);
    if (!iso) this.updateUnderwater(eye, time); // na isométrica a câmera não está na água: sem mergulho
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
    this.animateLids(time);
    this.animateDoors(time);
    this.timeU.value = time;
    let n = 0;
    this.clock = time;
    for (const e of this.itemSprites.values()) {
      const u = Math.min(1, (time - e.born) / ITEM_HOP_S); // salto de saída ao nascer (ADR 0082)
      e.sprite.position.y = e.baseY + 0.06 * Math.sin(time * 2 + n++) + (u < 1 ? 0.42 * Math.sin(Math.PI * u) + 0.18 * (1 - u) : 0);
    }
    for (let i = this.flying.length - 1; i >= 0; i--) { // voo curto até a cintura do jogador e some
      const f = this.flying[i], t = Math.min(1, (time - f.t0) / ITEM_FLY_S);
      f.sprite.position.set(f.x + (eye.x - f.x) * t, f.y + (eye.y - 0.6 - f.y) * t, f.z + (eye.z - f.z) * t);
      f.sprite.scale.setScalar(0.6 * (1 - 0.7 * t));
      if (t >= 1) { this.scene.remove(f.sprite); this.flying.splice(i, 1); }
    }
    this.liquidTex.offset.x = (Math.floor(time / 0.7) % 2) * 0.25; // dois quadros de ondulação
    if (this.liquidTexIso) this.liquidTexIso.offset.x = this.liquidTex.offset.x;
    this.outline.visible = !!target;
    if (target) {
      // célula inteira (bloco) ou a caixa do objeto (lanterna), 2 mm maior para não cintilar sobre as faces
      const b = target.box ?? [target.x, target.y, target.z, target.x + 1, target.y + 1, target.z + 1];
      this.outline.position.set((b[0] + b[3]) / 2, (b[1] + b[4]) / 2, (b[2] + b[5]) / 2);
      this.outline.scale.set(b[3] - b[0] + 0.004, b[4] - b[1] + 0.004, b[5] - b[2] + 0.004);
    }
    if (this.perf && this.built) this.perf.record('buildFrame', performance.now() - tb); // malha + geometria de todo o quadro
    const tr = this.perf ? performance.now() : 0;
    this.renderer.render(this.scene, iso ? this.isoCam : this.camera);
    const now = performance.now(), dt = this.lastRenderMs ? Math.min(0.1, (now - this.lastRenderMs) / 1000) : 0;
    this.lastRenderMs = now;
    const eq = this.equip.update(dt); // troca de item: afunda o velho e sobe o novo (ADR 0087)
    if (eq.swapped) this.shownKey = this.heldKey;
    const hand = this.held.get(this.shownKey);
    for (const g of this.held.values()) if (typeof g !== 'string') g.visible = g === hand;
    if (hand && typeof hand !== 'string' && !iso) { // na isométrica não há mão (o boneco é o jogador)
      this.handAnim.kind = this.heldKinds.get(this.shownKey) ?? 'dagger';
      const hp = this.handAnim.update(dt, this.handMove.speed, this.handMove.grounded, this.handMove.acting);
      hand.position.set(hp.x, hp.y + eq.offset, hp.z); hand.rotation.set(hp.rx, hp.ry, hp.rz);
      this.renderer.autoClear = false; this.renderer.clearDepth(); this.renderer.render(this.handScene, this.handCamera); this.renderer.autoClear = true;
    }
    if (this.perf) this.perf.record(this.built ? 'drawAfterBuild' : 'draw', performance.now() - tr); // JS do desenho; no quadro com malha nova inclui o envio à GPU
    this.frame++;
  }

  /**
   * Aplica a hora (fração do dia, 0–1): luz ambiente do shader, cores do céu, névoa, fundo e sol. **Não refaz nenhuma malha** (a luz do dia é um uniform).
   * Só recalcula quando a hora mudou o bastante para aparecer (~0,25 s de jogo).
   */
  /** Paleta do céu do mundo (ADR 0105): o Orvalis tem céu azul. Troca-se antes do primeiro `setSky`. */
  private palette: SkyPalette = 'titan';
  setPalette(p: SkyPalette): void { this.palette = p; this.lastSky = -1; }
  setSky(frac: number): void {
    if (Math.abs(frac - this.lastSky) < 0.0005) return;
    this.lastSky = frac;
    const sky = skyAt(frac, this.palette);
    this.curSky = sky;
    this.ambientBase.set(sky.ambient * sky.tint[0], sky.ambient * sky.tint[1], sky.ambient * sky.tint[2]); // luz do dia (quente de dia, fria de noite)
    this.sky.update(sky);
    this.lastFogYaw = 1e9; // a névoa se refaz no próximo quadro com a cor do céu daquele lado
    this.sun.visible = sky.sun.alpha > 0.01 && this.mode === 'fp';
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
    const fp = this.mode === 'fp';
    if (!fp) { fog.near = 1e5; fog.far = 2e5; } // isométrica: sem névoa de distância (o fundo é a cor do céu)
    this.sky.mesh.visible = fp && mix < 0.6; // a cúpula e o sol não passam pela névoa: somem ao mergulhar (e não existem na isométrica)
    this.sun.visible = fp && !!this.curSky && this.curSky.sun.alpha > 0.01 && mix < 0.6;
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
type ModelKind = ModelKindName | 'bauTampa';

/** Caixa da folha da Porta de Junco (ADR 0102): 1 × 2 × 3/16 m, base em y = 0, centrada em x e z; a folha de frente nas duas faces (a argola nos dois lados) e uma tira da moldura nos cantos. */
function doorModelData(): ModelData {
  const h = 0.5, d = DOOR_THICK / 2, H = 2, pos: number[] = [], nrm: number[] = [], uv: number[] = [], idx: number[] = [];
  const quad = (p: number[][], n: number[], t: number[][]): void => { const b = pos.length / 3; p.forEach((v, i) => { pos.push(...v); nrm.push(...n); uv.push(...t[i]); }); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  quad([[-h, 0, d], [h, 0, d], [h, H, d], [-h, H, d]], [0, 0, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]); // frente (u = x + 0,5 nas duas faces: a dobradiça fica do mesmo lado)
  quad([[h, 0, -d], [-h, 0, -d], [-h, H, -d], [h, H, -d]], [0, 0, -1], [[1, 1], [0, 1], [0, 0], [1, 0]]); // verso
  quad([[-h, 0, -d], [-h, 0, d], [-h, H, d], [-h, H, -d]], [-1, 0, 0], [[0.02, 1], [0.06, 1], [0.06, 0], [0.02, 0]]); // lados: a tira da moldura
  quad([[h, 0, d], [h, 0, -d], [h, H, -d], [h, H, d]], [1, 0, 0], [[0.94, 1], [0.98, 1], [0.98, 0], [0.94, 0]]);
  quad([[-h, H, d], [h, H, d], [h, H, -d], [-h, H, -d]], [0, 1, 0], [[0.2, 0.01], [0.8, 0.01], [0.8, 0.03], [0.2, 0.03]]);
  quad([[-h, 0, -d], [h, 0, -d], [h, 0, d], [-h, 0, d]], [0, -1, 0], [[0.2, 0.97], [0.8, 0.97], [0.8, 0.99], [0.2, 0.99]]);
  return { size: [1, H, DOOR_THICK], pos, nrm, uv, idx };
}
const lidKey = (x: number, y: number, z: number): string => `${x},${y},${z}`;
/** Brilho fixo do Braseiro aceso (ADR 0092), na mesma escala do brilho de lanterna por instância (`iGlow`). */
const EMBER_GLOW = 0.55;

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
function reedGeometry(variant: number, columns: number = REED_COLUMNS): THREE.BufferGeometry {
  const pos = [-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0, 0, 0, -0.5, 0, 0, 0.5, 0, 1, 0.5, 0, 1, -0.5];
  const u0 = variant / columns, u1 = (variant + 1) / columns; // o atlas tem uma coluna vazia depois das silhuetas
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
/** Dá à malha o sombreado fixo por vértice (`color`, a partir da normal) e o brilho zero (`glow`) que o `patchDayLight` espera (a luz do dia é um uniform; ADR 0041). */
function shadeHeld(geo: THREE.BufferGeometry, shade: (nx: number, ny: number, nz: number) => number): void {
  const nrm = geo.getAttribute('normal'), n = nrm.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = shade(nrm.getX(i), nrm.getY(i), nrm.getZ(i)); col.set([v, v, v], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
}

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
