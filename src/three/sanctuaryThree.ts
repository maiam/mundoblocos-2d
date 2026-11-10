import * as THREE from 'three';
import { loadCloudKit, type CloudKit } from './cloudKit';
import { loadCloudTop512, type CloudTop512 } from './cloudTop512';
import { makeDepthTestedCharacter } from './foregroundSprite';
import { goddessIsoAnimationFrame, goddessIsoDirectionByInput, loadGoddessIsoFromFiles, loadGoddessIsoFromPublicAssets, setGoddessIsoFrame, type GoddessIsoDirection, type GoddessIsoSpriteSet } from './goddessIsoSprites';
import { createCutawayState, makeCutawayMaterial, updateCutawayProjection } from './occlusionCutaway';
import { constructionLabPlan, resetAndBuildLab, labWireframePositions } from './constructionLab';
import { buildSanctuaryV2Scene } from './sanctuaryV2Scene';
import { SANCTUARY_V2_NAMES, sanctuaryTextureId, loadSanctuaryV2Materials, type SanctuaryV2Materials } from './sanctuaryV2Materials';
import { SANCTUARY_V2_SECTORS } from './sanctuaryV2Plan';
import { makeV2Heightfield, V2_VISIT_POINTS, type V2Heightfield } from './sanctuaryV2Collision';
import { HOUSE5, houseFloorName, makeHouseNavigation, type HouseNavigation } from './modularHouse5Plan';
import { makeModularHouse5 } from './modularHouse5Scene';
import { buildCloudSurface, exposedCloudEdge } from './cloudSurface';
import { MAX_STACK } from '../config';
import { Player } from '../game/player';
import { art } from '../render/art';
import { celestialFaces } from '../render/celestialArt';
import { Block, CELESTIAL_BLOCKS, type BlockId } from '../world/blocks';
import { WORLD_PROFILES } from '../world/profiles';
import { World } from '../world/world';

/**
 * Isolated Three.js proof of concept; never mounts the normal Game/Canvas2D.
 * It uses the original World, Player, block IDs and the official celestial artwork.
 * Edits are intentionally ephemeral: no writes to the existing 2D save format.
 */
export function startSanctuaryThree(canvas: HTMLCanvasElement, seed: number): void {
  const bounds = WORLD_PROFILES.santuario.bounds!;
  const x0 = bounds.cx0 * 16, x1 = (bounds.cx1 + 1) * 16 - 1;
  const y0 = bounds.cy0 * 16, y1 = (bounds.cy1 + 1) * 16 - 1;
  const world = new World(seed, WORLD_PROFILES.santuario);
  for (let cy = bounds.cy0; cy <= bounds.cy1; cy++) {
    for (let cx = bounds.cx0; cx <= bounds.cx1; cx++) world.loadChunk(cx, cy);
  }
  const [spawnX, spawnY] = world.findSpawn();
  const player = new Player(spawnX + 0.5, spawnY + 0.5);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-9, 9, 5, -5, 0.1, 300);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  canvas.style.background = 'linear-gradient(180deg, #91b9f8 0%, #dfc9ff 65%, #ffe4df 100%)';
  scene.add(new THREE.HemisphereLight(0xfff7ee, 0x9b8fb7, 2.25));
  const sun = new THREE.DirectionalLight(0xfff2cf, 1.25);
  sun.position.set(-9, 22, 13);
  scene.add(sun);

  let cloudKit: CloudKit | null = null;
  let cloudTop512: CloudTop512 | null = null;
  let cloudTop512Material: any | null = null;
  let cloudTop512SideMaterial: any | null = null;
  let cloudTop512SideAlternate: any | null = null;
  const cloudCutaway = createCutawayState();
  const cloudFadeMaterials: any[] = [];
  const cloudFadeMeshes: any[] = [];
  // A new 512px art source is mapped once per 4×4 cells, without synthesis.
  let useCloudTop512 = false;
  let organicCloud = true;
  let cloudOrganicMaterials: { top: any; side: any } | null = null;
  const materials = new Map<number, { ground: unknown; block: unknown }>();
  function texture(source: HTMLCanvasElement): any {
    const t = new THREE.CanvasTexture(source);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return t;
  }
  function materialFor(id: number, ground: boolean): any {
    let m = materials.get(id);
    if (!m) {
      const f = celestialFaces(id);
      const replacement = id === Block.CLOUD_SOLID ? cloudKit : null;
      const top = new THREE.MeshLambertMaterial({ map: replacement?.top ?? texture(f.top), color: 0xffffff });
      const front = new THREE.MeshLambertMaterial({ map: replacement?.side ?? texture(f.front), color: 0xffffff });
      const floor = new THREE.MeshLambertMaterial({ map: replacement?.top ?? texture(f.ground), color: 0xffffff });
      m = { ground: [front, front, floor, front, front, front], block: [front, front, top, front, front, front] };
      materials.set(id, m);
    }
    return ground ? m.ground : m.block;
  }
  const floorGeometry = new THREE.BoxGeometry(1, 0.24, 1);
  const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
  const blocks: any[] = [];
  const floor: any[] = [];
  const cloudMeshes: any[] = [];
  const dummy = new THREE.Object3D();
  type Cell = { x: number; y: number; level: number };
  function rebuild(): void {
    for (const mesh of cloudFadeMeshes) scene.remove(mesh);
    cloudFadeMeshes.length = 0;
    for (const mesh of [...blocks, ...floor, ...cloudMeshes]) {
      scene.remove(mesh);
      if (mesh.userData.cloudSurface) mesh.geometry.dispose();
      else mesh.dispose?.();
    }
    blocks.length = 0;
    floor.length = 0;
    cloudMeshes.length = 0;
    const groups = new Map<string, Cell[]>();
    const add = (id: number, ground: boolean, x: number, y: number, level: number) => {
      if (id === Block.CLOUD_SOLID && ((cloudKit && organicCloud && !useCloudTop512) || (cloudTop512 && useCloudTop512))) return;
      const key = (ground ? 'g' : 'b') + id;
      const list = groups.get(key) ?? [];
      list.push({ x, y, level });
      groups.set(key, list);
    };
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const ground = world.getGround(x, y);
      if (ground !== Block.HOLE && ground !== Block.VOID) add(ground, true, x, y, -1);
      for (let level = 0; level < MAX_STACK; level++) {
        const id = world.getLevel(x, y, level);
        if (id !== Block.AIR) add(id, false, x, y, level);
      }
    }
    for (const [key, cells] of groups) {
      const isGround = key[0] === 'g';
      const id = Number(key.slice(1));
      const mesh = new THREE.InstancedMesh(isGround ? floorGeometry : blockGeometry, materialFor(id, isGround), cells.length);
      mesh.userData.cells = cells;
      mesh.frustumCulled = false;
      cells.forEach((cell, i) => {
        dummy.position.set(cell.x + 0.5, isGround ? -0.12 : cell.level + 0.5, cell.y + 0.5);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      scene.add(mesh);
      (isGround ? floor : blocks).push(mesh);
    }
    if (cloudTop512 && useCloudTop512 && cloudTop512Material) {
      // One 512px illustration, continuous across 4×4 tiles and all visible faces.
      cloudMeshes.push(...buildCloudSurface(
        world, { x0, x1, y0, y1 }, cloudTop512Material, cloudTop512SideMaterial ?? cloudTop512Material, 4,
        cloudTop512SideAlternate ?? cloudTop512SideMaterial,
      ));
      // Meshes use the same immutable UV geometry and 512px art for both passes.
      // The second pass paints only the obstruction in front of the goddess.
      cloudMeshes.forEach((mesh) => {
        const fadeMaterial = mesh.material === cloudTop512SideAlternate ? cloudFadeMaterials[2]
          : mesh.material === cloudTop512SideMaterial ? cloudFadeMaterials[1] : cloudFadeMaterials[0];
        const fade = new THREE.Mesh(mesh.geometry, fadeMaterial);
        fade.renderOrder = 1;
        fade.frustumCulled = false;
        cloudFadeMeshes.push(fade);
        scene.add(fade);
      });
    } else if (cloudKit && organicCloud && cloudOrganicMaterials) {
      cloudMeshes.push(...buildCloudSurface(
        world, { x0, x1, y0, y1 }, cloudOrganicMaterials.top, cloudOrganicMaterials.side,
      ));
    }
    for (const mesh of cloudMeshes) scene.add(mesh);
  }
  rebuild();

  function disposeMaterial(id: number): void {
    const entry = materials.get(id);
    if (!entry) return;
    const unique = new Set<any>([...(entry.ground as any[]), ...(entry.block as any[])]);
    for (const material of unique) {
      // The uploaded kit owns its textures; disposing them happens separately.
      const map = material.map;
      if (map && map !== cloudKit?.top && map !== cloudKit?.side) map.dispose();
      material.dispose();
    }
    materials.delete(id);
  }

  // Cloud 5×5 test uses the official World placement, but never affects saved games.
  const demonstration = new THREE.Group();
  scene.add(demonstration);
  const demoX = Math.min(x1 - 5, Math.max(x0 + 1, Math.floor(spawnX) + 4));
  const demoY = Math.min(y1 - 5, Math.max(y0 + 1, Math.floor(spawnY) - 2));
  let demoBuilt = false;
  function clearCloudOverlays(): void {
    for (const obj of [...demonstration.children]) {
      demonstration.remove(obj);
      // SpriteGeometry can be shared by Three.js; dispose only private plane geometries.
      if (obj.geometry && !obj.isSprite) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
  }
  function decorateCloudTest(): void {
    clearCloudOverlays();
    if (useCloudTop512 || !cloudKit || !demoBuilt || !organicCloud) return;
    const overlay = (tex: any, x: number, y: number, z: number, rotation = 0, w = 1.1, h = 1.05) => {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, side: THREE.DoubleSide, alphaTest: 0.025 }),
      );
      mesh.position.set(x, y, z);
      mesh.rotation.y = rotation;
      mesh.renderOrder = 2;
      demonstration.add(mesh);
    };
    for (let y = demoY; y < demoY + 5; y++) for (let x = demoX; x < demoX + 5; x++) {
      // Only silhouette edges. Internal cloud-to-cloud boundaries stay invisible.
      if (exposedCloudEdge(world, x, y, 0, 1))
        overlay(cloudKit.frontEdge, x + 0.5, 0.72, y + 1.035);
      if (exposedCloudEdge(world, x, y, 1, 0))
        overlay(cloudKit.sideEdge, x + 1.035, 0.72, y + 0.5, Math.PI / 2);
      if (exposedCloudEdge(world, x, y, 0, -1))
        overlay(cloudKit.frontEdge, x + 0.5, 0.72, y - 0.035, Math.PI);
      if (exposedCloudEdge(world, x, y, -1, 0))
        overlay(cloudKit.sideEdge, x - 0.035, 0.72, y + 0.5, -Math.PI / 2);
    }
    if (exposedCloudEdge(world, demoX + 4, demoY + 4, 1, 0)
      && exposedCloudEdge(world, demoX + 4, demoY + 4, 0, 1))
      overlay(cloudKit.cornerOut, demoX + 4.85, 0.68, demoY + 4.85, Math.PI / 4, 1.35, 1.2);
    // Billboard decoration is intentionally separate from block geometry.
    const cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudKit.ornament, transparent: true, depthWrite: false }));
    cloud.position.set(demoX + 2.5, 1.9, demoY + 2.5);
    cloud.scale.set(1.25, 1.25, 1);
    cloud.renderOrder = 2;
    demonstration.add(cloud);
  }
  function buildCloudTest(): void {
    if (!demoBuilt) {
      for (let y = demoY; y < demoY + 5; y++) for (let x = demoX; x < demoX + 5; x++)
        world.placeBlock(x, y, Block.CLOUD_SOLID);
      // Vertical stack just outside the 5×5 platform demonstrates side tiling.
      for (let i = 0; i < 3; i++) world.placeBlock(demoX + 6, demoY + 4, Block.CLOUD_SOLID);
      demoBuilt = true;
    }
    rebuild();
    decorateCloudTest();
  }

  // Keep the original 7-by-4 hand-painted goddess animation (no 3D character model).
  const spriteMap = new THREE.TextureLoader().load(art().actors.goddess!);
  spriteMap.colorSpace = THREE.SRGBColorSpace;
  spriteMap.magFilter = THREE.LinearFilter;
  spriteMap.repeat.set(1 / 7, 1 / 4);
  const goddess = makeDepthTestedCharacter(spriteMap);
  goddess.scale.set(2.3, 2.3, 1);
  scene.add(goddess);
  let goddessIsoSheets: GoddessIsoSpriteSet | null = null;
  let goddessIsoDirection: GoddessIsoDirection = 'down';
  let goddessIsoMode = false;
  let goddessSitPhase: 'standing' | 'sitting-down' | 'seated' | 'standing-up' = 'standing';
  let goddessSitElapsed = 0;
  let goddessWalkElapsed = 0;
  let goddessIsoDisposed = false;
  // Safe fallback: if the 3 PNGs are not yet copied into the app, keep the original sprite.
  void loadGoddessIsoFromPublicAssets().then(loaded => {
    if (goddessIsoDisposed) { loaded?.dispose(); return; }
    if (loaded) {
      goddessIsoSheets?.dispose();
      goddessIsoSheets = loaded;
      goddessIsoMode = true;
      goddessIsoButton.textContent = 'Deusa isométrica: ligada';
      cloudStatus.textContent = 'Três pranchas isométricas carregadas automaticamente: idle, caminhada e sentar.';
    }
  });
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.37, 24),
    new THREE.MeshBasicMaterial({ color: 0x514779, transparent: true, opacity: 0.16, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  const selector = new THREE.Mesh(
    new THREE.BoxGeometry(1.035, 0.025, 1.035),
    new THREE.MeshBasicMaterial({ color: 0xffedab, transparent: true, opacity: 0.42, depthWrite: false }),
  );
  selector.visible = false;
  scene.add(selector);
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let selectedCell: Cell | null = null;
  let selectedBlock: BlockId = CELESTIAL_BLOCKS[2];
  let removing = false;
  let iso = false;
  let zoom = 10;
  // Laboratory stays within the bounded 80×32 sanctuary; far from the spawn.
  const labCells = constructionLabPlan(x0 + 4, y0 + 4);
  const labCenterX = x0 + 4 + 14;
  const labCenterY = y0 + 4 + 5.5;
  let laboratoryV2: ReturnType<typeof buildSanctuaryV2Scene> | null = null;
  let laboratoryV2Materials: SanctuaryV2Materials | null = null;
  let laboratoryV2Active = false;
  let laboratoryV2Sector: 'all' | 'A' | 'B' | 'C' | 'D' = 'all';
  let laboratoryV2Physics: V2Heightfield | null = null;
  let houseNavigation: HouseNavigation | null = null;
  let houseScene: ReturnType<typeof makeModularHouse5> | null = null;
  let houseEnabled = false;
  let cameraY = 0;
  function v2SetPlayerAt(localX: number, localY: number): void {
    const x = x0 + localX, y = y0 + localY;
    const h = laboratoryV2Physics?.supportHeight(x, y);
    if (h === null || h === undefined) return;
    player.respawn(x, y);
    player.z = h;
    player.visualZ = h;
    cameraY = h;
  }
  function rebuildLaboratoryV2(): void {
    if (houseScene) { scene.remove(houseScene.group); houseScene.dispose(); houseScene = null; }
    if (laboratoryV2) {
      scene.remove(laboratoryV2.group);
      laboratoryV2.dispose();
    }
    laboratoryV2 = buildSanctuaryV2Scene(
      x0, y0, laboratoryV2Materials, renderer.capabilities.getMaxAnisotropy(),
    );
    laboratoryV2Physics = makeV2Heightfield(laboratoryV2.cells, x0, y0);
    houseNavigation = makeHouseNavigation(laboratoryV2Physics, x0, y0, () => player.z);
    laboratoryV2.group.visible = laboratoryV2Active;
    scene.add(laboratoryV2.group);
    houseScene = makeModularHouse5(
      x0, y0, laboratoryV2Materials, renderer.capabilities.getMaxAnisotropy(),
    );
    houseScene.group.visible = laboratoryV2Active && houseEnabled;
    scene.add(houseScene.group);
  }
  let laboratoryBuilt = false;
  let laboratoryCamera = false;
  let wireVisible = false;
  let wireframe: any | null = null;
  const wireMaterial = new THREE.LineBasicMaterial({
    color: 0xffdf8d, transparent: true, opacity: 0.72, depthTest: false, depthWrite: false,
  });
  function refreshWireframe(): void {
    if (wireframe) {
      scene.remove(wireframe);
      wireframe.geometry.dispose();
      wireframe = null;
    }
    if (!wireVisible || !laboratoryBuilt) return;
    const positions = labWireframePositions(world, labCells);
    if (!positions.length) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    wireframe = new THREE.LineSegments(geometry, wireMaterial);
    wireframe.renderOrder = 8;
    wireframe.frustumCulled = false;
    scene.add(wireframe);
  }
  function rebuildAfterEdit(): void {
    rebuild();
    decorateCloudTest();
    refreshWireframe();
  }
  const keys = new Set<string>();
  const joystick = { x: 0, y: 0 };
  const hud = document.createElement('div');
  hud.setAttribute('data-sanctuary-three', '');
  hud.style.cssText = 'position:fixed;inset:0;z-index:3;pointer-events:none;color:#fff7eb;font-family:Nunito,system-ui,sans-serif;user-select:none;';
  const style = document.createElement('style');
  style.textContent = [
    '[data-sanctuary-three] button{pointer-events:auto;cursor:pointer;background:rgba(31,25,76,.86);color:#fff6e8;border:1px solid rgba(255,225,157,.65);border-radius:12px;padding:8px 11px;font-weight:800;font-size:12px;white-space:nowrap;}',
    '[data-sanctuary-three] .three-toolbar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;pointer-events:none;max-width:100%;}',
    '[data-sanctuary-three] .three-more[open] .three-menu{display:grid;}',
    '[data-sanctuary-three] .three-menu{position:absolute;right:0;top:calc(100% + 6px);display:none;grid-template-columns:1fr;gap:6px;padding:10px;width:min(310px,83vw);max-height:48vh;overflow-y:auto;background:rgba(31,25,76,.97);border:1px solid rgba(255,230,181,.5);border-radius:12px;box-shadow:0 10px 28px rgba(15,10,48,.3);z-index:20;pointer-events:auto;}',
    '[data-sanctuary-three] .three-menu button{width:100%;text-align:left;}',
    '[data-sanctuary-three] button.active{border-color:#fff8b8;background:rgba(120,83,167,.9);box-shadow:0 0 10px rgba(255,239,180,.35);}',
    '[data-sanctuary-three] .three-tools{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);max-width:min(88vw,650px);display:flex;gap:5px;overflow-x:auto;padding:5px;pointer-events:auto;background:rgba(24,19,59,.65);border-radius:15px;}',
    '[data-sanctuary-three] .three-tools button{flex:0 0 48px;width:48px;height:48px;padding:4px;}',
    '[data-sanctuary-three] .three-tools img{height:36px;width:36px;object-fit:contain;}',
    '[data-sanctuary-three] .three-pad{position:absolute;bottom:84px;left:22px;width:100px;height:100px;border-radius:50%;border:2px solid rgba(255,225,157,.55);background:rgba(31,25,76,.35);pointer-events:auto;touch-action:none;}',
    '[data-sanctuary-three] .three-knob{position:absolute;left:32px;top:32px;width:32px;height:32px;border-radius:50%;background:rgba(255,224,160,.85);pointer-events:none;}',
    '@media (hover:hover) and (pointer:fine){[data-sanctuary-three] .three-pad{opacity:.32;}}',
  ].join('');
  document.head.append(style);
  const header = document.createElement('div');
  header.style.cssText = 'position:absolute;top:10px;left:10px;right:10px;display:flex;flex-direction:column;gap:5px;align-items:flex-start;pointer-events:none;z-index:4;';
  const top = document.createElement('div');
  top.className = 'three-toolbar';
  header.append(top);
  const name = document.createElement('span');
  name.textContent = 'Santuário Celestial · Three.js (experimental)';
  name.style.cssText = 'padding:8px 11px;border-radius:12px;background:rgba(31,25,76,.73);font-size:12px;font-weight:800;';
  top.append(name);
  function button(label: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }
  const cameraButton = button('Câmera: superior', () => { iso = !iso; cameraButton.textContent = iso ? 'Câmera: isométrica' : 'Câmera: superior'; });
  top.append(cameraButton);
  const laboratoryButton = button('Criar laboratório 3D', () => {
    laboratoryV2Active = false;
    houseEnabled = false;
    if (houseScene) houseScene.group.visible = false;
    player.z = player.visualZ = world.standHeight(player.cellX, player.cellY) ?? 0;
    if (laboratoryV2) laboratoryV2.group.visible = false;
    labV2Button.textContent = 'Laboratório V2';
    const result = resetAndBuildLab(world, labCells, Block.CLOUD_SOLID);
    laboratoryBuilt = true;
    laboratoryCamera = true;
    zoom = 12;
    laboratoryButton.textContent = 'Recriar laboratório';
    focusButton.hidden = false;
    focusButton.textContent = 'Seguir Deusa';
    goddessLabButton.hidden = false;
    wireButton.hidden = false;
    rebuildAfterEdit();
    cloudStatus.textContent = 'Laboratório: ' + result.cells + ' células, ' + result.placed
      + '/' + result.blocks + ' blocos. '
      + (result.failed ? result.failed + ' posições não colocadas.' : 'Pilhas, parede e plataformas prontas.');
  });
  top.append(laboratoryButton);
  const labV2Button = button('Laboratório V2', () => {
    laboratoryV2Active = !laboratoryV2Active;
    if (laboratoryV2Active && laboratoryBuilt) {
      // Clear only the old V1 demo object stack; never remove ground or persist.
      for (const cell of labCells) {
        while (world.topBlock(cell.x, cell.y)) {
          if (world.breakBlock(cell.x, cell.y) === null) break;
        }
      }
      laboratoryBuilt = false;
      rebuildAfterEdit();
    }
    if (!laboratoryV2) rebuildLaboratoryV2();
    if (laboratoryV2) laboratoryV2.group.visible = laboratoryV2Active;
    if (houseScene) houseScene.group.visible = laboratoryV2Active && houseEnabled;
    // Do not leave the character inside an old demo object when switching scenes.
    if (laboratoryV2Active) v2SetPlayerAt(...V2_VISIT_POINTS.C);
    else {
      player.respawn(spawnX + 0.5, spawnY + 0.5);
      cameraY = 0;
    }
    laboratoryCamera = laboratoryV2Active;
    laboratoryV2Sector = 'all';
    if (typeof v2SectorSelect !== 'undefined') v2SectorSelect.value = 'all';
    zoom = laboratoryV2Active ? 39 : 10;
    labV2Button.textContent = laboratoryV2Active ? 'Fechar laboratório V2' : 'Laboratório V2';
    laboratoryButton.hidden = laboratoryV2Active;
    goddessLabButton.hidden = laboratoryV2Active;
    focusButton.hidden = !laboratoryV2Active && !laboratoryBuilt;
    focusButton.textContent = laboratoryV2Active ? 'Seguir Deusa' : 'Ver laboratório';
    v2Info.hidden = !laboratoryV2Active;
    v2HeightInfo.hidden = !laboratoryV2Active;
    lastV2HeightDisplay = '';
    cloudStatus.textContent = laboratoryV2Active
      ? 'Laboratório V2: colisão 3D, alturas até 5 e casa modular 5×5 (opcional). '
        + 'Ilha suspensa ainda sem acesso; o laboratório não altera salvamentos. '
        + (laboratoryV2Materials ? 'Seis texturas PNG carregadas.' : 'Carregue os 6 PNGs em Mais opções.')
      : 'Santuário Three.js experimental. Nenhum teste é salvo.';
  });
  top.append(labV2Button);
  const focusButton = button('Seguir Deusa', () => {
    laboratoryCamera = !laboratoryCamera;
    focusButton.textContent = laboratoryCamera ? 'Seguir Deusa' : 'Ver laboratório';
    zoom = laboratoryV2Active
      ? (laboratoryCamera ? (laboratoryV2Sector === 'all' ? 39 : 17) : 9)
      : (laboratoryCamera ? 12 : 10);
  });
  focusButton.hidden = true;
  top.append(focusButton);
  const goddessLabButton = button('Testar oclusão (Deusa)', () => {
    if (!laboratoryBuilt || laboratoryV2Active) return;
    // Behind the laboratory wall from the superior camera: not inside a block.
    player.respawn(x0 + 4 + 3.5, y0 + 4 + 4.45);
    laboratoryCamera = false;
    zoom = 8;
    focusButton.textContent = 'Ver laboratório';
    cloudStatus.textContent = 'Deusa próxima à parede de 2 blocos. '
      + 'Observe sprite normal e silhueta translúcida apenas quando houver oclusão.';
  });
  goddessLabButton.hidden = true;
  top.append(goddessLabButton);
  const wireButton = button('Arestas: ocultas', () => {
    wireVisible = !wireVisible;
    wireButton.textContent = wireVisible ? 'Arestas: visíveis' : 'Arestas: ocultas';
    refreshWireframe();
  });
  wireButton.hidden = true;
  top.append(wireButton);
  const kitFile = document.createElement('input');
  kitFile.type = 'file';
  kitFile.accept = '.png,.webp,image/png,image/webp';
  kitFile.hidden = true;
  top.append(kitFile);
  const legacyKitButton = button('Carregar nuvem V1.1', () => kitFile.click());
  top.append(legacyKitButton);
  const top512File = document.createElement('input');
  top512File.type = 'file';
  top512File.accept = '.png,.webp,image/png,image/webp';
  top512File.hidden = true;
  top.append(top512File);
  const loadTop512Button = button('Carregar nuvem 512', () => top512File.click());
  top.append(loadTop512Button);
  const compareTop512 = button('Nuvem 512: ativa', () => {
    if (!cloudTop512) return;
    useCloudTop512 = !useCloudTop512;
    compareTop512.textContent = useCloudTop512 ? 'Nuvem 512: ativa' : 'Nuvem 512: desativada';
    rebuild();
    decorateCloudTest();
  });
  compareTop512.hidden = true;
  top.append(compareTop512);
  const cloudModeButton = button('Nuvem: orgânica V1.2', () => {
    // Comparing the older atlas explicitly disables the optional 512px skin.
    useCloudTop512 = false;
    organicCloud = !organicCloud;
    compareTop512.textContent = 'Nuvem 512: desativada';
    cloudModeButton.textContent = organicCloud ? 'Nuvem: orgânica V1.2' : 'Nuvem: repetição V1.1';
    rebuild();
    decorateCloudTest();
  });
  cloudModeButton.hidden = true;
  top.append(cloudModeButton);
  const demoButton = button('Plataforma 5×5', () => buildCloudTest());
  top.append(demoButton);
  const editButton = button('Modo: construir', () => { removing = !removing; editButton.textContent = removing ? 'Modo: remover' : 'Modo: construir'; editButton.classList.toggle('active', removing); });
  top.append(editButton);
  const backButton = button('Voltar ao 2D', () => { const u = new URL(location.href); u.searchParams.delete('render'); location.href = u.toString(); });
  top.append(backButton);
  hud.append(header);
  const tip = document.createElement('div');
  tip.textContent = 'WASD / setas: mover · clique/toque: bloco · roda: zoom · C: câmera · B: construir/remover';
  tip.style.cssText = 'background:rgba(31,25,76,.76);padding:6px 9px;border-radius:8px;font-size:11px;max-width:min(90vw,680px);line-height:1.45;';
  tip.hidden = true;
  header.append(tip);
  const cloudStatus = document.createElement('div');
  cloudStatus.style.cssText = 'max-width:min(92vw,780px);padding:6px 9px;border-radius:8px;background:rgba(31,25,76,.76);font-size:11px;line-height:1.45;';
  cloudStatus.textContent = 'Novo teste: carregue a textura Nuvem 512×512. Não altera o salvamento.';
  header.append(cloudStatus);
  const v2Info = document.createElement('div');
  v2Info.style.cssText = 'max-width:min(92vw,500px);padding:5px 9px;border-radius:8px;background:rgba(31,25,76,.73);font-size:11px;line-height:1.4;';
  v2Info.textContent = 'Aponte para uma construção V2 para inspecionar o material.';
  v2Info.hidden = true;
  header.append(v2Info);
  const v2HeightInfo = document.createElement('div');
  v2HeightInfo.style.cssText = 'background:rgba(31,25,76,.79);padding:5px 9px;border-radius:8px;font-size:11px;font-weight:800;';
  v2HeightInfo.hidden = true;
  header.append(v2HeightInfo);
  let lastV2HeightDisplay = '';
  const v2FilesInput = document.createElement('input');
  v2FilesInput.type = 'file';
  v2FilesInput.multiple = true;
  v2FilesInput.accept = '.png,image/png';
  v2FilesInput.hidden = true;
  const v2LoadButton = button('Carregar materiais 80–85', () => v2FilesInput.click());
  const v2SectorSelect = document.createElement('select');
  v2SectorSelect.setAttribute('aria-label', 'Setor do Laboratório V2');
  v2SectorSelect.style.cssText = 'pointer-events:auto;padding:8px 10px;border-radius:11px;background:#29204c;color:#fff5e8;max-width:100%;font:700 12px Nunito,system-ui,sans-serif;';
  for (const [value, label] of [
    ['all', 'Visão geral V2'],
    ['A', SANCTUARY_V2_SECTORS.A.label],
    ['B', SANCTUARY_V2_SECTORS.B.label],
    ['C', SANCTUARY_V2_SECTORS.C.label],
    ['D', SANCTUARY_V2_SECTORS.D.label],
  ]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    v2SectorSelect.append(option);
  }
  v2SectorSelect.addEventListener('change', () => {
    const requested = v2SectorSelect.value as typeof laboratoryV2Sector;
    if (!laboratoryV2Active) labV2Button.click();
    laboratoryV2Sector = requested;
    v2SectorSelect.value = requested;
    laboratoryCamera = true;
    zoom = requested === 'all' ? 39 : 17;
    focusButton.textContent = 'Seguir Deusa';
  });
  const v2ExploreButton = button('Explorar setor (Deusa)', () => {
    if (!laboratoryV2Active) labV2Button.click();
    const sector = laboratoryV2Sector === 'all' ? 'C' : laboratoryV2Sector;
    v2SetPlayerAt(...V2_VISIT_POINTS[sector]);
    laboratoryCamera = false;
    zoom = 9;
    focusButton.textContent = 'Ver laboratório';
    cloudStatus.textContent = 'Explorando setor ' + sector
      + ': caminhe pelas plataformas e pelo relevo. Subida máxima: 1 bloco por passo. '
      + 'Câmera acompanha a altura; ilha suspensa permanece sem acesso.';
  });
  const v2RampButton = button('Testar subida 1→4 (platô)', () => {
    if (!laboratoryV2Active) labV2Button.click();
    laboratoryV2Sector = 'C';
    v2SectorSelect.value = 'C';
    v2SetPlayerAt(28.5, 24.5);
    laboratoryCamera = false;
    focusButton.textContent = 'Ver laboratório';
    zoom = 8;
    cloudStatus.textContent = 'Subida experimental no setor C: degraus x=29→32, altura 1→4. '
      + 'Aproxime-se do platô e avance ao longo dos degraus. A câmera segue a elevação.';
  });

  const v2HouseButton = button('Testar casa 5×5 (2 andares)', () => {
    if (!laboratoryV2Active) labV2Button.click();
    houseEnabled = true;
    if (!houseScene) rebuildLaboratoryV2();
    if (houseScene) houseScene.group.visible = true;
    laboratoryV2Sector = 'D';
    v2SectorSelect.value = 'D';
    v2SetPlayerAt(...HOUSE5.visit);
    laboratoryCamera = false;
    focusButton.textContent = 'Ver laboratório';
    zoom = 9;
    cloudStatus.textContent = 'Casa celestial 5×5: entre pela porta ao sul, vire à esquerda para a escada, '
      + 'suba os quatro degraus e explore o segundo andar. '
      + 'Paredes/telhado se ocultam dentro da casa; não há salvamento.';
  });
  const v2HouseHideButton = button('Mostrar/ocultar casa 5×5', () => {
    if (!laboratoryV2Active) return;
    houseEnabled = !houseEnabled;
    if (houseScene) houseScene.group.visible = houseEnabled;
    cloudStatus.textContent = houseEnabled ? 'Casa 5×5 visível, dois pavimentos.' : 'Casa 5×5 oculta (não altera o mundo).';
    if (!houseEnabled && player.z > 0) v2SetPlayerAt(...V2_VISIT_POINTS.D);
  });

  // The 4×4 RGBA sheets are separate from terrain; never edit the existing sprite atlas.
  const goddessIsoUpload = document.createElement('input');
  goddessIsoUpload.type = 'file';
  goddessIsoUpload.multiple = true;
  goddessIsoUpload.accept = '.png,image/png';
  goddessIsoUpload.hidden = true;
  const goddessIsoUploadButton = button('Carregar pranchas da Deusa (3 PNGs)', () => goddessIsoUpload.click());
  const goddessIsoButton = button('Deusa isométrica: desligada', () => {
    if (!goddessIsoSheets) {
      cloudStatus.textContent = 'Para usar a Deusa isométrica, carregue as 3 pranchas PNG em Mais opções.';
      return;
    }
    goddessIsoMode = !goddessIsoMode;
    goddessIsoButton.textContent = goddessIsoMode ? 'Deusa isométrica: ligada' : 'Deusa isométrica: desligada';
    goddessSitPhase = 'standing';
    goddessSitElapsed = 0;
    goddess.material.map = goddessIsoMode ? goddessIsoSheets.idle : spriteMap;
    goddess.material.needsUpdate = true;
  });
  const goddessSitButton = button('Sentar / levantar', () => {
    if (!goddessIsoMode || !goddessIsoSheets) {
      cloudStatus.textContent = 'Carregue e ative a Deusa isométrica para testar sentar e levantar.';
      return;
    }
    if (goddessSitPhase === 'standing') {
      goddessSitPhase = 'sitting-down';
      goddessSitElapsed = 0;
    } else if (goddessSitPhase === 'seated') {
      goddessSitPhase = 'standing-up';
      goddessSitElapsed = 0;
    }
  });
  goddessIsoUpload.addEventListener('change', async () => {
    try {
      const loaded = await loadGoddessIsoFromFiles([...(goddessIsoUpload.files ?? [])]);
      if (goddessIsoDisposed) { loaded.dispose(); return; }
      const previous = goddessIsoSheets;
      goddessIsoSheets = loaded;
      goddessIsoMode = true;
      goddessIsoButton.textContent = 'Deusa isométrica: ligada';
      goddessSitPhase = 'standing';
      goddess.material.map = loaded.idle;
      goddess.material.needsUpdate = true;
      previous?.dispose();
      cloudStatus.textContent = 'Deusa isométrica: 3 folhas 4×4 carregadas com transparência. '
        + 'Caminhe nas 4 direções ou use Sentar / levantar.';
    } catch(err) {
      cloudStatus.textContent = 'Erro nas pranchas da Deusa: ' + (err instanceof Error ? err.message : String(err));
    } finally {
      goddessIsoUpload.value = '';
    }
  });

  /** Apply 80 as the real visual ground of the experimental sanctuary. */
  function applyCloudTop512(incoming: CloudTop512, buildDemo: boolean): void {
        const previous = cloudTop512;
        const previousMaterial = cloudTop512Material;
        const previousSideMaterial = cloudTop512SideMaterial;
        const previousAlternate = cloudTop512SideAlternate;
        const previousFades = cloudFadeMaterials.splice(0);
        cloudTop512 = incoming;
        cloudTop512Material = makeCutawayMaterial(incoming.texture, 0xffffff, cloudCutaway);
        // Top remains original; two axes use stronger but still pastel face shading.
        cloudTop512SideMaterial = makeCutawayMaterial(incoming.texture, 0xc7cae1, cloudCutaway);
        cloudTop512SideAlternate = makeCutawayMaterial(incoming.texture, 0x9eafcf, cloudCutaway);
        cloudFadeMaterials.push(
          makeCutawayMaterial(incoming.texture, 0xffffff, cloudCutaway, true),
          makeCutawayMaterial(incoming.texture, 0xc7cae1, cloudCutaway, true),
          makeCutawayMaterial(incoming.texture, 0x9eafcf, cloudCutaway, true),
        );
        useCloudTop512 = true;
        // Never dispose a texture while its old material is still in the scene.
        if (buildDemo) buildCloudTest();
      else { rebuild(); decorateCloudTest(); }
        previousMaterial?.dispose();
        previousSideMaterial?.dispose();
        previousAlternate?.dispose();
        previousFades.forEach((material) => material.dispose());
        previous?.dispose();
        compareTop512.hidden = false;
        compareTop512.textContent = 'Nuvem 512: ativa';
  
  }
  v2FilesInput.addEventListener('change', async () => {
    try {
      const selectedFiles = [...(v2FilesInput.files ?? [])];
      const incoming = await loadSanctuaryV2Materials(
        selectedFiles, renderer.capabilities.getMaxAnisotropy(),
      );
      // The background cloud field uses the same official art as the V2 meshes.
      // Keep a separate texture owner to avoid double disposal when reloading.
      let cloudCopy: CloudTop512;
      try {
        const file80 = selectedFiles.find(f => sanctuaryTextureId(f.name) === 80);
        cloudCopy = await loadCloudTop512(file80!, renderer.capabilities.getMaxAnisotropy());
      } catch (error) {
        incoming.dispose();
        throw error;
      }
      const old = laboratoryV2Materials;
      laboratoryV2Materials = incoming;
      rebuildLaboratoryV2();
      old?.dispose();
      applyCloudTop512(cloudCopy, false);
      if (!laboratoryV2Active) labV2Button.click();
      cloudStatus.textContent = 'Os seis materiais 80–85 foram carregados. Nuvem 80 aplicada também ao chão do Santuário. '
        + 'Todos seamless RGB = 0/0. Selecione um setor A–D para comparar as artes.';
    } catch (err) {
      cloudStatus.textContent = 'Erro nos seis materiais: ' + (err instanceof Error ? err.message : String(err));
    } finally { v2FilesInput.value = ''; }
  });
  const recreateV2 = button('Recriar setores V2', () => {
    rebuildLaboratoryV2();
    cloudStatus.textContent = 'Laboratório V2 reconstruído: quatro setores, sem mudar o mundo nem os salvamentos.';
  });
  top512File.addEventListener('change', async () => {
    const file = top512File.files?.[0];
    if (!file) return;
    try {
      const incoming = await loadCloudTop512(file, renderer.capabilities.getMaxAnisotropy());
      applyCloudTop512(incoming, true);
      cloudStatus.textContent = 'Nuvem 512 aplicada diretamente em topo e faces (4×4 células). '
        + 'Seamless: esquerda/direita ' + incoming.seamMax.horizontal
        + ', cima/baixo ' + incoming.seamMax.vertical
        + '. Use Nuvem 512: ativa para comparar.';
    } catch (err) {
      cloudStatus.textContent = 'Erro na textura 512: ' + (err instanceof Error ? err.message : String(err));
    }
    top512File.value = '';
  });
  kitFile.addEventListener('change', async () => {
    const file = kitFile.files?.[0];
    if (!file) return;
    try {
      const incoming = await loadCloudKit(file, renderer.capabilities.getMaxAnisotropy());
      const previous = cloudKit;
      disposeMaterial(Block.CLOUD_SOLID);
      const oldOrganicMaterials = cloudOrganicMaterials;
      cloudKit = incoming;
      useCloudTop512 = false;
      compareTop512.textContent = 'Nuvem 512: desativada';
      cloudOrganicMaterials = {
        top: new THREE.MeshBasicMaterial({ map: incoming.macroTop, color: 0xffffff }),
        side: new THREE.MeshBasicMaterial({ map: incoming.macroSide, color: 0xffffff }),
      };
      buildCloudTest();
      oldOrganicMaterials?.top.dispose();
      oldOrganicMaterials?.side.dispose();
      previous?.dispose();
      cloudModeButton.hidden = false;
      cloudStatus.textContent = 'Nuvem aplicada · modo orgânico V1.2 com UV contínuo (alternável). '
        + 'Diferença dos pixels nas bordas da fonte: topo '
        + incoming.seamMax.top + ', lateral ' + incoming.seamMax.side
        + '. Compare os dois modos na mesma plataforma 5×5.';
    } catch (err) {
      cloudStatus.textContent = 'Erro no atlas: ' + (err instanceof Error ? err.message : String(err));
    }
    kitFile.value = '';
  });
  const tools = document.createElement('div');
  tools.className = 'three-tools';
  for (const id of CELESTIAL_BLOCKS) {
    const b = button('', () => { selectedBlock = id; for (const el of tools.querySelectorAll('button')) el.classList.remove('active'); b.classList.add('active'); });
    b.title = 'Bloco celestial ' + id;
    b.setAttribute('aria-label', b.title);
    const img = document.createElement('img');
    img.src = art().celestialIcons[id] ?? '';
    img.alt = b.title;
    b.append(img);
    if (id === selectedBlock) b.classList.add('active');
    tools.append(b);
  }
  hud.append(tools);
  // Keep primary actions visible; optional or legacy controls live in a compact menu.
  const more = document.createElement('details');
  more.className = 'three-more';
  more.style.cssText = 'position:relative;pointer-events:auto;';
  const moreSummary = document.createElement('summary');
  moreSummary.textContent = 'Mais opções';
  moreSummary.style.cssText = 'cursor:pointer;list-style:none;background:rgba(31,25,76,.88);color:#fff6e8;border:1px solid rgba(255,225,157,.65);border-radius:12px;padding:8px 11px;font-weight:800;font-size:12px;';
  const menu = document.createElement('div');
  menu.className = 'three-menu';
  for (const item of [goddessIsoUploadButton, goddessIsoButton, goddessSitButton, goddessIsoUpload, v2LoadButton, v2SectorSelect, v2ExploreButton, v2RampButton, v2HouseButton, v2HouseHideButton, recreateV2, v2FilesInput, wireButton,
    loadTop512Button, compareTop512, legacyKitButton,
    cloudModeButton, demoButton, backButton, top512File, kitFile]) menu.append(item);
  more.append(moreSummary, menu);
  top.append(more);
  top.append(button('Ajuda', () => { tip.hidden = !tip.hidden; }));
  const pad = document.createElement('div');
  pad.className = 'three-pad';
  const knob = document.createElement('div');
  knob.className = 'three-knob';
  pad.append(knob);
  hud.append(pad);
  let padPointer: number | null = null;
  const resetPad = () => { padPointer = null; joystick.x = 0; joystick.y = 0; knob.style.transform = ''; };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); padPointer = e.pointerId; pad.setPointerCapture(e.pointerId); });
  pad.addEventListener('pointermove', (e) => {
    if (padPointer !== e.pointerId) return;
    const r = pad.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / 34;
    let dy = (e.clientY - (r.top + r.height / 2)) / 34;
    const len = Math.max(1, Math.hypot(dx, dy)); dx /= len; dy /= len;
    joystick.x = dx; joystick.y = dy;
    knob.style.transform = 'translate(' + dx * 30 + 'px,' + dy * 30 + 'px)';
  });
  pad.addEventListener('pointerup', resetPad);
  pad.addEventListener('pointercancel', resetPad);
  document.body.append(hud);
  const onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    keys.add(k);
    if (!e.repeat && k === 'c') cameraButton.click();
    if (!e.repeat && k === 'b') editButton.click();
  };
  const onKeyUp = (e: KeyboardEvent) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  let down: { x: number; y: number } | null = null;
  const pick = (x: number, y: number): Cell | null => {
    const rect = canvas.getBoundingClientRect();
    mouse.set(((x - rect.left) / rect.width) * 2 - 1, -((y - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(mouse, camera);
    for (const hit of raycaster.intersectObjects([...blocks, ...floor, ...cloudMeshes])) {
      if (hit.object.userData.cloudSurface) {
        // The geometry is expressed in WORLD coordinates, not per-tile UVs.
        const nx = hit.face?.normal.x ?? 0, nz = hit.face?.normal.z ?? 0;
        const cx = Math.floor(hit.point.x - nx * 0.005);
        const cy = Math.floor(hit.point.z - nz * 0.005);
        if (world.inBounds(cx, cy)) return { x: cx, y: cy, level: Math.max(-1, world.stackHeight(cx, cy) - 1) };
      }
      if (hit.instanceId !== undefined) return hit.object.userData.cells[hit.instanceId] as Cell;
    }
    return null;
  };
  canvas.addEventListener('pointermove', (e) => {
    if (laboratoryV2Active && laboratoryV2) {
      const rect = canvas.getBoundingClientRect();
      mouse.set(((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(mouse, camera);
      const hit = raycaster.intersectObject(laboratoryV2.group, true)[0];
      if (hit) {
        const n = hit.face?.normal;
        const x = Math.floor(hit.point.x - (n?.x ?? 0) * 0.005) - x0;
        const y = Math.floor(hit.point.z - (n?.z ?? 0) * 0.005) - y0;
        const cell = laboratoryV2.cells.find(c => c.x === x && c.y === y);
        v2Info.textContent = cell
          ? 'Setor ' + cell.section + ' · (' + cell.x + ', ' + cell.y + ') · '
            + SANCTUARY_V2_NAMES[cell.side] + ' (' + cell.side + ') · topo '
            + SANCTUARY_V2_NAMES[cell.top] + ' (' + cell.top + ') · altura '
            + cell.height + (cell.floating ? ' · ilha visual, sem colisão' : '')
          : 'Prévia V2 — mover sobre um bloco para identificar o material.';
      } else v2Info.textContent = 'Laboratório V2 — selecione um bloco para inspecionar.';
      selector.visible = false;
      return;
    }
    selectedCell = pick(e.clientX, e.clientY);
    selector.visible = !!selectedCell;
    if (selectedCell) {
      const { x, y } = selectedCell;
      selector.position.set(x + 0.5, world.stackHeight(x, y) + 0.03, y + 0.5);
    }
  });
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 13) { down = null; return; }
    down = null;
    if (laboratoryV2Active) {
      cloudStatus.textContent = 'Prévia V2: construções, relevos 4/5 e ilha NÃO são editáveis. '
        + 'Use o laboratório original para construir/remover até 3 níveis.';
      return;
    }
    const picked = pick(e.clientX, e.clientY);
    if (!picked) return;
    const { x, y } = picked;
    // Experimental mode reuses official placement/removal rules; never touches the normal saved world.
    const changed = removing ? world.breakBlock(x, y) !== null : world.placeBlock(x, y, selectedBlock);
    if (changed) rebuildAfterEdit();
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(5, Math.min(20, zoom * (e.deltaY > 0 ? 1.12 : 0.89))); }, { passive: false });

  const resize = () => {
    const w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.left = -zoom * aspect; camera.right = zoom * aspect;
    camera.top = zoom; camera.bottom = -zoom;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();
  let last = performance.now();
  let elapsed = 0;
  let raf = 0;
  const animate = (now: number) => {
    raf = requestAnimationFrame(animate);
    const dt = Math.min((now - last) / 1000, 0.06);
    last = now;
    elapsed += dt;
    let sx = joystick.x + Number(keys.has('arrowright') || keys.has('d')) - Number(keys.has('arrowleft') || keys.has('a'));
    let sy = joystick.y + Number(keys.has('arrowdown') || keys.has('s')) - Number(keys.has('arrowup') || keys.has('w'));
    const len = Math.hypot(sx, sy);
    if (len > 1) { sx /= len; sy /= len; }
    if (goddessIsoMode && goddessSitPhase !== 'standing') {
      // Sitting is stationary. A second click triggers a gentle stand-up sequence.
      sx = sy = 0;
      goddessSitElapsed += dt;
      if (goddessSitElapsed >= 0.5) {
        if (goddessSitPhase === 'sitting-down') goddessSitPhase = 'seated';
        else if (goddessSitPhase === 'standing-up') goddessSitPhase = 'standing';
        goddessSitElapsed = 0;
      }
    }
    const movementWorld = laboratoryV2Active && laboratoryV2Physics
      ? houseEnabled && houseNavigation ? houseNavigation.walkerWorld : laboratoryV2Physics.walkerWorld
      : world;
    if (iso) {
      const ux = (sx + sy) * Math.SQRT1_2;
      const uy = (sy - sx) * Math.SQRT1_2;
      player.move(dt, ux, uy, movementWorld);
    } else player.move(dt, sx, sy, movementWorld);
    if (goddessIsoMode && goddessIsoSheets) {
      goddessIsoDirection = goddessIsoDirectionByInput(
        sx, sy, goddessIsoDirection,
      );
      const sitting = goddessSitPhase !== 'standing';
      const action = sitting ? 'sit' : player.moving ? 'walk' : 'idle';
      if (player.moving && !sitting) goddessWalkElapsed += dt;
      else if (!player.moving) goddessWalkElapsed = 0;
      const sitFrame = goddessSitPhase === 'seated' ? 2
        : goddessSitPhase === 'sitting-down' ? Math.min(3, Math.floor((goddessSitElapsed / 0.5) * 4))
          : goddessSitPhase === 'standing-up' ? Math.max(0, 3 - Math.floor((goddessSitElapsed / 0.5) * 4)) : 0;
      const active = goddessIsoSheets[action];
      setGoddessIsoFrame(
        active, goddessIsoDirection,
        goddessIsoAnimationFrame(action, elapsed, goddessWalkElapsed, sitFrame),
      );
      if (goddess.material.map !== active) {
        goddess.material.map = active;
        goddess.material.needsUpdate = true;
      }
    } else {
      // Original 7×4 sprite is the 2D fallback and remains unchanged.
      const row = player.facing === 'down' ? 0 : player.facing === 'left' ? 1 : player.facing === 'right' ? 2 : 3;
      const fps = player.moving ? 10 : 7;
      const step = Math.floor(elapsed * fps) % 12;
      const col = step < 7 ? step : 12 - step;
      spriteMap.offset.set(col / 7, 1 - (row + 1) / 4);
      if (goddess.material.map !== spriteMap) {
        goddess.material.map = spriteMap;
        goddess.material.needsUpdate = true;
      }
    }
    goddess.position.set(player.x, player.visualZ + 0.32 + 1.15 + Math.sin(elapsed * 3.7) * 0.08, player.y);
    shadow.position.set(player.x, player.visualZ + 0.012, player.y);
    if (houseScene && houseEnabled && laboratoryV2Active) {
      houseScene.updateView(player.x, player.y, player.z, camera.position);
    }
    if (laboratoryV2Active) {
      const insideHouse = houseEnabled && Math.floor(player.x - x0) >= HOUSE5.x
        && Math.floor(player.x - x0) <= HOUSE5.x + 4
        && Math.floor(player.y - y0) >= HOUSE5.y
        && Math.floor(player.y - y0) <= HOUSE5.y + 4;
      const display = 'Deusa · nível ' + player.z + ' · altura visual ' + player.visualZ.toFixed(2)
        + (insideHouse ? ' · Casa: ' + houseFloorName(player.z, player.x - x0, player.y - y0)
          : ' · subida máxima 1 bloco');
      if (display !== lastV2HeightDisplay) {
        v2HeightInfo.textContent = display;
        lastV2HeightDisplay = display;
      }
    }
    const offset = iso ? [13, 20, 13] : [0, 23, 11];
    const v2Target = laboratoryV2Sector === 'all'
      ? { x: 40, y: 16 }
      : SANCTUARY_V2_SECTORS[laboratoryV2Sector];
    const focusHeight = laboratoryV2Active && !laboratoryCamera ? player.visualZ : 0;
    cameraY += (focusHeight - cameraY) * (1 - Math.exp(-7 * dt));
    const target = laboratoryV2Active && laboratoryCamera
      ? new THREE.Vector3(x0 + v2Target.x, 0, y0 + v2Target.y)
      : laboratoryCamera
        ? new THREE.Vector3(labCenterX, 0, labCenterY)
        : new THREE.Vector3(player.x, laboratoryV2Active ? cameraY : 0, player.y);
    camera.position.set(target.x + offset[0], target.y + offset[1], target.z + offset[2]);
    camera.lookAt(target);
    const aspect = Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight);
    if (Math.abs(camera.top - zoom) > 0.001 || Math.abs(camera.right - zoom * aspect) > 0.001) {
      camera.left = -zoom * aspect; camera.right = zoom * aspect;
      camera.top = zoom; camera.bottom = -zoom; camera.updateProjectionMatrix();
    }
    updateCutawayProjection(
      cloudCutaway, camera, goddess.position, canvas.clientWidth, canvas.clientHeight,
      renderer.getPixelRatio(), zoom, Boolean(cloudTop512 && useCloudTop512),
    );
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(animate);
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    hud.remove(); style.remove();
    if (wireframe) { scene.remove(wireframe); wireframe.geometry.dispose(); }
    if (houseScene) { scene.remove(houseScene.group); houseScene.dispose(); }
    if (laboratoryV2) { scene.remove(laboratoryV2.group); laboratoryV2.dispose(); }
    laboratoryV2Materials?.dispose();
    wireMaterial.dispose();
    goddess.material.dispose();
    shadow.geometry.dispose(); shadow.material.dispose();
    selector.geometry.dispose(); selector.material.dispose();
    clearCloudOverlays();
    floorGeometry.dispose(); blockGeometry.dispose();
    for (const id of [...materials.keys()]) disposeMaterial(id);
    cloudOrganicMaterials?.top.dispose();
    cloudOrganicMaterials?.side.dispose();
    cloudTop512Material?.dispose();
    cloudTop512SideMaterial?.dispose();
    cloudTop512SideAlternate?.dispose();
    cloudFadeMaterials.forEach((m) => m.dispose());
    cloudTop512?.dispose();
    cloudKit?.dispose();
    goddessIsoDisposed = true;
    goddessIsoSheets?.dispose();
    spriteMap.dispose(); renderer.dispose();
  }, { once: true });
}
