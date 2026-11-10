import * as THREE from 'three';
import { loadCloudKit, type CloudKit } from './cloudKit';
import { loadCloudTop512, type CloudTop512 } from './cloudTop512';
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
        world, { x0, x1, y0, y1 }, cloudTop512Material, cloudTop512Material, 4,
      ));
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
  const goddess = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteMap, transparent: true, alphaTest: 0.04, depthWrite: false }));
  goddess.scale.set(2.3, 2.3, 1);
  goddess.renderOrder = 1;
  scene.add(goddess);
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
  const keys = new Set<string>();
  const joystick = { x: 0, y: 0 };
  const hud = document.createElement('div');
  hud.setAttribute('data-sanctuary-three', '');
  hud.style.cssText = 'position:fixed;inset:0;z-index:3;pointer-events:none;color:#fff7eb;font-family:Nunito,system-ui,sans-serif;user-select:none;';
  const style = document.createElement('style');
  style.textContent = [
    '[data-sanctuary-three] button{pointer-events:auto;cursor:pointer;background:rgba(31,25,76,.86);color:#fff6e8;border:1px solid rgba(255,225,157,.65);border-radius:12px;padding:8px 11px;font-weight:800;}',
    '[data-sanctuary-three] button.active{border-color:#fff8b8;background:rgba(120,83,167,.9);box-shadow:0 0 10px rgba(255,239,180,.35);}',
    '[data-sanctuary-three] .three-tools{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);max-width:min(88vw,650px);display:flex;gap:5px;overflow-x:auto;padding:5px;pointer-events:auto;background:rgba(24,19,59,.65);border-radius:15px;}',
    '[data-sanctuary-three] .three-tools button{flex:0 0 48px;width:48px;height:48px;padding:4px;}',
    '[data-sanctuary-three] .three-tools img{height:36px;width:36px;object-fit:contain;}',
    '[data-sanctuary-three] .three-pad{position:absolute;bottom:84px;left:22px;width:100px;height:100px;border-radius:50%;border:2px solid rgba(255,225,157,.55);background:rgba(31,25,76,.35);pointer-events:auto;touch-action:none;}',
    '[data-sanctuary-three] .three-knob{position:absolute;left:32px;top:32px;width:32px;height:32px;border-radius:50%;background:rgba(255,224,160,.85);pointer-events:none;}',
    '@media (hover:hover) and (pointer:fine){[data-sanctuary-three] .three-pad{opacity:.32;}}',
  ].join('');
  document.head.append(style);
  const top = document.createElement('div');
  top.style.cssText = 'position:absolute;top:12px;left:12px;display:flex;flex-wrap:wrap;gap:7px;align-items:center;max-width:calc(100% - 24px);';
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
  const kitFile = document.createElement('input');
  kitFile.type = 'file';
  kitFile.accept = '.png,.webp,image/png,image/webp';
  kitFile.hidden = true;
  top.append(kitFile);
  top.append(button('Carregar nuvem V1.1', () => kitFile.click()));
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
  top.append(button('Voltar ao 2D', () => { const u = new URL(location.href); u.searchParams.delete('render'); location.href = u.toString(); }));
  hud.append(top);
  const tip = document.createElement('div');
  tip.textContent = 'WASD / setas: mover · clique/toque: bloco · roda: zoom · C: câmera · B: construir/remover';
  tip.style.cssText = 'position:absolute;top:58px;left:12px;background:rgba(31,25,76,.55);padding:5px 9px;border-radius:8px;font-size:11px;max-width:90vw;';
  hud.append(tip);
  const cloudStatus = document.createElement('div');
  cloudStatus.style.cssText = 'position:absolute;top:84px;left:12px;max-width:min(88vw,640px);padding:6px 9px;border-radius:8px;background:rgba(31,25,76,.6);font-size:11px;';
  cloudStatus.textContent = 'Novo teste: carregue a textura Nuvem 512×512. Não altera o salvamento.';
  hud.append(cloudStatus);
  top512File.addEventListener('change', async () => {
    const file = top512File.files?.[0];
    if (!file) return;
    try {
      const incoming = await loadCloudTop512(file, renderer.capabilities.getMaxAnisotropy());
      const previous = cloudTop512;
      const previousMaterial = cloudTop512Material;
      cloudTop512 = incoming;
      cloudTop512Material = new THREE.MeshBasicMaterial({ map: incoming.texture, color: 0xffffff });
      useCloudTop512 = true;
      // Never dispose a texture while its old material is still in the scene.
      buildCloudTest();
      previousMaterial?.dispose();
      previous?.dispose();
      compareTop512.hidden = false;
      compareTop512.textContent = 'Nuvem 512: ativa';
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
    const picked = pick(e.clientX, e.clientY);
    if (!picked) return;
    const { x, y } = picked;
    // Experimental mode reuses official placement/removal rules; never touches the normal saved world.
    const changed = removing ? world.breakBlock(x, y) !== null : world.placeBlock(x, y, selectedBlock);
    if (changed) { rebuild(); decorateCloudTest(); }
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
    if (iso) {
      const ux = (sx + sy) * Math.SQRT1_2;
      const uy = (sy - sx) * Math.SQRT1_2;
      player.move(dt, ux, uy, world);
    } else player.move(dt, sx, sy, world);
    // billboard row order is down, left, right, up
    const row = player.facing === 'down' ? 0 : player.facing === 'left' ? 1 : player.facing === 'right' ? 2 : 3;
    const fps = player.moving ? 10 : 7;
    const step = Math.floor(elapsed * fps) % 12;
    const col = step < 7 ? step : 12 - step;
    spriteMap.offset.set(col / 7, 1 - (row + 1) / 4);
    goddess.position.set(player.x, player.visualZ + 0.32 + 1.15 + Math.sin(elapsed * 3.7) * 0.08, player.y);
    shadow.position.set(player.x, player.visualZ + 0.012, player.y);
    const offset = iso ? [13, 20, 13] : [0, 23, 11];
    const target = new THREE.Vector3(player.x, 0, player.y);
    camera.position.set(target.x + offset[0], target.y + offset[1], target.z + offset[2]);
    camera.lookAt(target);
    const aspect = Math.max(1, canvas.clientWidth) / Math.max(1, canvas.clientHeight);
    if (Math.abs(camera.top - zoom) > 0.001 || Math.abs(camera.right - zoom * aspect) > 0.001) {
      camera.left = -zoom * aspect; camera.right = zoom * aspect;
      camera.top = zoom; camera.bottom = -zoom; camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(animate);
  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    hud.remove(); style.remove();
    clearCloudOverlays();
    floorGeometry.dispose(); blockGeometry.dispose();
    for (const id of [...materials.keys()]) disposeMaterial(id);
    cloudOrganicMaterials?.top.dispose();
    cloudOrganicMaterials?.side.dispose();
    cloudTop512Material?.dispose();
    cloudTop512?.dispose();
    cloudKit?.dispose();
    spriteMap.dispose(); renderer.dispose();
  }, { once: true });
}
