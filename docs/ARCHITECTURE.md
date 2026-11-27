# Arquitetura

Site estático (Vite 7 + TypeScript, sem framework; Three.js; testes com Vitest 5; Node ≥ 22.12). **Só o motor voxel** (`src/titan/`, ADR 0039/0105/0115): o Orvalis 3D (padrão) e o Titã (`?mundo=titan`). A arquitetura do Orvalis 2D/2.5D e do Santuário, removidos na v0.183.0, está em [`archive/2d/ARCHITECTURE.md`](archive/2d/ARCHITECTURE.md). Decisões em [DECISIONS.md](DECISIONS.md); mapa de "onde mexer" em [MAPS.md](MAPS.md).

## Estrutura
```
src/
  main.ts                 entrada: escolhe o mundo (titan/worldId.ts) e abre titan/titanGame.ts
  titan/                  o motor voxel: volume, gerador (contrato TerrainGen), malha, física, sessão, salvamento, ações, receitas, UI
    orvalis/              gerador e regras do Orvalis 3D (ADR 0105)
    worldId.ts            resolveWorldId: Orvalis 3D padrão; Titã só por ?mundo=titan (ADR 0115)
  render/                 titanRenderer.ts (Three.js), titanSkyDome, farejadorRig, heldPose, muretaModel; art/titan.ts (único lugar que importa arte)
  net/titan/              sala cooperativa do Titã: protocolo, TitanRoom, cliente, loopback, socket; index.ts = pacote do servidor
  net/socket.ts           endereço do servidor, hosts permitidos, contagem das salas
  world/noise.ts, random.ts  utilitários puros de seed (únicos restos de `src/world`)
  dev/perfHud.ts          painel de desempenho (?fps=1)
  assets/                 arte do voxel (WebP, JSON de modelos)
```

## Titã (ADR 0039–0049, v0.104.0)
`src/titan/` é um **segundo motor, isolado**: volume voxel por `(x, y, z)` (`voxel.ts`, `generator.ts`, `volume.ts`, `mesher.ts`, `physics.ts`, `save.ts`, `session.ts`, `sections.ts`, `inventory.ts`, `items.ts`, `actions.ts`, `light.ts`, `sky.ts`, `gesture.ts`, `breaking.ts`; sem DOM, determinístico) + `titanGame.ts` (entrada e laço) +
A **lanterna** é um modelo 3D do renderer (ADR 0043: `InstancedMesh` ×2, fora da malha do terreno); a mira dela usa a caixa do objeto (`titan/lantern.ts`, puro, sem DOM).
O **gerador v3** (ADR 0044) põe veios naturais (ids de bloco 8 e 9) nas formações e garante fontes alcançáveis a pé; as lascas soltas por veios são estado de sessão (`TitanSession.drops`) gravado no cabeçalho do save, junto do inventário.
As **receitas** são um catálogo puro (`titan/recipes.ts`, ADR 0045) que os cartões, a validação, o consumo, a prévia (`previewCells`) e a grade 3 × 3 compartilham; a Mesa de Trabalho é um modelo 3D instanciado (`T.WORKBENCH`) e o gerador v4 acrescenta o depósito de brasa (`T.EMBER`) e os juncos de vidro (decoração fora do volume).
A **Laje de Rocha** (ADR 0046) introduz altura por bloco (`blockHeight`/`isFull`): colisão, pouso, degrau de 0,5 m, mira por caixa e culling da malha leem dela.
A **bolsa** (ADR 0047) é hotbar de 9 + 27 + grade 3 × 3 única (ADR 0050; a 2 × 2 saiu) e o livro de receitas lê o mesmo catálogo (`recipes.ts`, com `group`); o inventário gravado é `v: 2` e migra o formato antigo por seção.
O **céu** (ADR 0048) é um shader na cúpula (`render/titanSkyDome.ts`) alimentado por `titan/sky.ts` (puro): bruma direcional, estrelas e Saturno raro são uniforms, sem remalhar; a névoa segue a cor do céu do lado para onde se olha.
A **bancada 3 × 3** (ADR 0049) é uma grade do inventário separada da pessoal, validada pelo mesmo catálogo (`matchBench`) e retirada de forma atômica; os painéis usam um ladrilho de basalto pela variável CSS `--basalt`.
`render/titanRenderer.ts` (Three.js) + `render/art/titan.ts` (atlas do terreno e da hotbar). Só `main.ts` (`?mundo=titan`) e `world/profiles.ts` (registro do perfil) tocam o resto do jogo; nada de `World`, `Game`, `SUBDIV` ou `SaveStore`.

## Orvalis em voxel (ADR 0105, v0.169.0)
Segundo mundo do **mesmo motor** `src/titan/`. `titan/terrain.ts` define `TerrainGen` (o que o motor lê do gerador) e `VoxelWorld`; `TitanGenerator` (Margem Silenciosa) e `titan/orvalis/generator.ts` (`OrvalisGenerator`, ilha de florestas) o implementam. `TitanVolume`, `session.ts` (`openSession(…, create)`) e as validações só conhecem `TerrainGen`; o mundo vem do `gen.world`, gravado em `header.world` (bancos `orvalis-titan` e `orvalis-voxel`). `startTitan(canvas, search, storage, world)` escolhe gerador, banco, arte da água (`render/art/titan.ts`) e paleta do céu (`skyAt(frac, paleta)`); `main.ts` abre `?mundo=orvalis3d` pelo perfil `orvalis3d`. Blocos 90–99 em `voxel.ts` (tiles `orvalis/…` no fim de `tiles.json`), itens 42–51 em `items.ts` (`ORVALIS_ITEM_BLOCKS`).

## Titã a 16 px e vista isométrica (ADR 0106, v0.172.0)
O atlas de terreno é de **16 px por face** (`titan-atlas-16px.webp`) com a variante de **8 px** da isométrica (`titan-atlas-8px.webp`, mesmas proporções de borda, os mesmos UVs de `mesher.tileUV`); a arte-fonte é reduzida por `scripts/make-titan-atlas32.py`. `titan/iso.ts` (puro) define a câmera ortográfica a 30° (`isoCamera`, `isoRay`, giro em quartos) usada **igualmente** pelo `TitanRenderer` (`setViewMode`, `OrthographicCamera`, `setAvatar`, `screenOf`) e pelo `titanGame.ts` (`computeAim`), para o clique cair no bloco visto. Na isométrica o buffer é de 1 px por px CSS (`image-rendering: pixelated`), o atlas e a água trocam para as de 8 px, e somem cúpula, sol, névoa, mergulho e mão.

## Regras de dependência
- `titan/` só importa `world/noise.ts` e `world/random.ts` (utilitários puros) e `dev/`/`net/socket.ts`; `src/net/titan/` e as regras que a sala usa não importam DOM nem arte (o pacote `build:net` vai ao servidor `orvalis-servidor`).
- Mundo-específico dentro do motor só pelo contrato `TerrainGen` e pela faixa de itens/blocos de cada mundo (ADR 0114): nada de `if (mundo === …)` no motor.
- Arte (`?inline`/URL) só em `render/art/titan.ts`; o resto lê o que foi carregado.
- Sem backend aqui: salvamento local no navegador (IndexedDB); salas e nuvem pelo `orvalis-servidor` (repositório separado, ADR 0015).
