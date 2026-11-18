# Domínio: mundos (perfis)

**Fonte de verdade:** `src/world/profiles.ts` (`WORLD_PROFILES`). O motor é um só; o perfil decide o que existe.

| Campo | Mundo principal | Santuário (v0.93.134, ADR 0036) |
|---|---|---|
| `terrain` | procedural (`WorldGenerator`) | **plano em camadas** (`FlatGenerator` com `layers`): chão de grama + **Bloco de Pedra no nível 1** + **Grama no nível 2**; a Deusa e tudo o mais no **nível 3** |
| quebrar | pela ferramenta (1 s) ou mão (2 s) | **1 s para qualquer bloco** (`breakSeconds`) |
| objetos | no nível 0 da célula | **em cima da pilha de cubos** (`surfaceObjects`): árvore, cerca, casa… ficam no nível 3 e não contam como altura de piso |
| `bounds` | ilimitado | **64 chunks = 8×8** (`cx -2..5`, `cy -6..1`) → 128×128 células: o original (`cx -2..1`, `cy -2..1`), a Fazenda a leste (`cx 2..5` — v0.93.152) e o Vale Goblin ao norte do original (`cx -2..1`, `cy -6..-3` — v0.93.158/159, ADR 0038); o canto `cx 2..5`, `cy -6..-3` é VOID |
| `character` | heroína | **Deusa da Vida** |
| `blocks` | materiais, objetos, paredes… | **82 peças**: 38 do conjunto isométrico (`ISO_BLOCKS`, com as 12 árvores novas) + 42 do Mundo como blocos novos (`WORLD_BLOCKS_IN_SANCTUARY`; sem paredes) + 2 pincéis do Rio das Fadas (`RIO_BRUSHES`) —: 4 cubos (3 pisos + Bloco de Pedra) + 16 objetos do conjunto isométrico + 6 cercas/portões 3D; pilha de 5, cubos cheios |
| ferramentas / cultivo / ovelhas / cidade / missões | sim | **não** |
| câmera | 3/4 (oblíqua) | **isométrica fixa** (45° / 35,264°, sem seletor) |
| `sky` (fundo além das bordas) | escuro | degradê azul → lilás |
| como abre | padrão | **solo, sem servidor**: `?mundo=santuario` ou subdomínio; arte do pacote principal |

> O conteúdo celestial antigo (nuvem, 18 blocos, Deusa-laboratório, abaixo) é **histórico**: o código foi removido (v0.93.133–134) ou aguarda a limpeza final (`celestialArt.ts`, `art/santuario.ts`, ids 80–97 em `blocks.ts`). A Sala 2 online segue em `ROOM_RULES`/servidor, mas a página do Santuário não a oferece mais.

## Como o mundo é escolhido (`resolveWorldId`)
1. Build fixo `VITE_WORLD` (artefato próprio do Santuário).
2. Subdomínio: `santuario.<domínio>` (host com 3+ partes cujo primeiro rótulo está em `SUBDOMAINS`).
3. Parâmetro `?mundo=santuario` (testes e link direto pelo domínio principal).
4. Senão, mundo principal.

## Regras do mundo limitado (`World`)
- Fora dos limites: chão `VOID` ("Céu Aberto"), não pisável, não quebrável, não aceita bloco → a personagem para
  na borda. Objetos fora dos limites são `AIR`.
- `ensureChunks` recorta a área aos limites (nunca mais de 10 chunks carregados); `findSpawn` usa o centro.
- `placementLevel` só aceita ids de `profile.blocks` (vale também para o mundo principal).
- Quebrar o piso abre buraco; só um cubo preenche (vira piso).

## Conjunto isométrico (v0.93.140–141, ADR 0036)
Fonte: `assets-src/iso-set/prancha-iso.png` (36 peças, fundo transparente, projeção isométrica = a da câmera: topo 1,414 × 0,816 células). **Só 19 viraram blocos** (decisão do dono do produto, 17/11/2026: saem o Bloco de Grama, os pisos 5–10 de pedra/transição e os 10 caminhos). `python3 scripts/extract-iso-set.py` (reconhece as 36 peças, grava só as usadas) gera `src/assets/iso-ground.webp` (3 topos 128 px), `iso-cube.webp` (faces sul e leste do bloco de grama, usadas nas laterais), `iso-props.webp` (16 objetos), `icon-iso-<chave>.webp` e `render/isoSetManifest.ts`. Ids em `blocks.ts` (`ISO_*`) e listas `ISO_CUBES`/`ISO_PROPS`/`ISO_BLOCKS`.
- **Terreno em camadas** (v0.93.143): toda célula nasce com 2 cubos (índice 0 da pilha = Bloco de Pedra, 1 = Piso de Grama) sobre o chão; contando a partir do chão: nível 1 = pedra, nível 2 = grama, nível 3 = a superfície onde ficam a Deusa (`standHeight` = 2) e os objetos. Cavar tira a grama, depois a pedra, depois abre o chão. `World.stackHeight` conta só cubos e `placementLevel` põe objetos em cima (`surfaceFree`; a casa 12×12 exige a mesma altura nas 144 células); `ChunkSprites.surfaceLevels` e `IsoFences` desenham em qualquer nível; a câmera acompanha a altura da Deusa (`ThreeStage.focusY`). **Só o perfil do Santuário** liga isso.
- **Bloco de Pedra** (`ISO_STONE_BLOCK`, `scripts/extract-iso-stone.py`, prancha `assets-src/iso-set/blocos-pedra.png`): o cubo 1×1×1 da prancha (as outras peças são o mesmo bloco empilhado, não viram blocos).
- **Cubos** (`shape: 'cube'`, pilha de 5, colocáveis na face): topo = o piso da prancha; laterais = terra com franja de grama (grama), terra lisa (terra) ou pedra. O chão do mundo é o Piso de Grama (emendável).
- **Objetos** (`shape: 'rock'` sólido ou `'decoration'` andável: pedrinhas, capim, margaridas, lavanda, arbusto pequeno): só no chão livre, um sprite vertical girado 45°. **Tamanhos** (`ISO_SCALE`, pedido do dono do produto): carvalho 2× (ocupa só a célula do tronco), Barraca 3× e Casa de Feira 4×. **Objetos grandes** (`ISO_BIG`): Barraca 3 × 3 (`ISO_STALL` + 8 `ISO_STALL_PART`) e Casa 12 × 12 (`ISO_HOUSE` + 143 `ISO_HOUSE_PART`), canto inferior esquerdo = o id (`World.bigCells`/`bigAnchor`); qualquer parte quebra o objeto inteiro.
- **Cercas e portões 3D** (v0.93.142, `ISO_FENCES`): os blocos `FENCE*`/`FENCE_GATE*` do Mundo, mas desenhados por `render/three/isoFences.ts` com a geometria do modelo do Blockbench (`python3 scripts/extract-iso-fence.py` → `iso-fence-model.json`) e as texturas de madeira do dono do produto (`assets-src/iso-set/madeira-*.png` → `iso-wood.webp`, 24 u do modelo por imagem); 12 u do modelo = 1 célula; regras (bloqueio, abrir, emenda por vizinhos) são as do Mundo (`isFence`/`isGate`/`joinsFence`).
- O desenho se apoia na quina sul da base (o plano gira em volta do meio da borda de baixo).
- A prancha 3/4 antiga e os 18 blocos celestiais (ids 80–97) saíram do jogo.

## Deusa isométrica (Santuário solo, v0.93.135)
Personagem `goddess-iso` (perfil `santuario`): folhas `goddess-iso-walk`, `goddess-iso-idle` e `goddess-iso-sit` (`assets-src/goddess-iso/`, 4×4; ordem da prancha original: baixo-direita, baixo-esquerda, cima-direita, cima-esquerda = direita, frente, costas, esquerda do jogo; `--rows-map 1,3,0,2`). Anda no chão; parada usa o idle. A Deusa flutuante abaixo continua na Sala 2 online. Também há folhas de caminhada e de golpe das 5 ferramentas (`goddess-iso-<ferramenta>[-attack]`, v0.93.137); o perfil ainda não dá ferramentas à Deusa (`tools: false`).

## Deusa da Vida (flutuante, Sala 2)
- **Flutua em vez de caminhar.** Folha `assets-src/goddess-float-sheet.png` (7 quadros × 4 direções, fundo branco,
  legendas à esquerda, linhas frente/direita/trás/esquerda) → `process-sprite.py --cols 7 --rows 4
  --region 130,0,1470,1000 --rows-map 0,3,1,2 --frame-h 160 --sat 16 --min 228` → `src/assets/goddess-float.webp`.
- Animação (`SheetSpec.float` em `render/character.ts`): quadros sempre rodando em vai-e-volta (7 q/s parada,
  10 q/s em movimento); paira 0,32 célula acima do chão com balanço de 3 px (senoide contínua, não zera ao
  parar); sombra no chão encolhe quando ela sobe. A câmera segue a posição lógica, então não balança.
- Altura desenhada 2,3 células (+0,32 de flutuação). A física continua a mesma (`Walker`): colide e sobe
  degraus como a heroína — flutuar é só visual por enquanto.
- A folha de caminhada antiga (`goddess-sheet.png`) e a prancha lateral ficam só como referência
  (a caminhada travava: 4 quadros com poses muito diferentes). A folha de flutuação não tem auréola.
- Ainda sem ferramentas nem ações próprias.

## Publicação
- O artefato próprio (`build:artifact:santuario`) e o `?celestial=1` foram **removidos** (v0.93.133, ADR 0036). O Santuário será refeito do zero em vista isométrica (NEXT_STEPS); este perfil (nuvem, 18 blocos celestiais) é o conteúdo a ser substituído.
- Subdomínio real (`santuario.<domínio>`) exige hospedar o build estático (`dist/`) no domínio — pendente.

- **Paisagem por seed** (v0.93.148, `world/sanctuaryLandscape.ts`): **paisagem única** (v0.93.152, ADR 0037): `landscapeFor` ignora a seed e usa `LANDSCAPE_SEED` (1835638650); `World` troca o `FlatGenerator` por ela quando `terrain.landscape` está ligado e usa `generateLevels` para os níveis 2..7. A **Fazenda** (`sanctuaryFazenda.ts`, heightmap) ocupa `cx 2..5`. Água = pincéis do rio rentes ao chão (a arte das peças já traz a margem); passarelas erguem 1 cubo.
- **Caldeirão 3D** (v0.93.157, `render/three/isoCauldrons.ts`): o `Block.CAULDRON` no Santuário é desenhado como malha (`scripts/extract-iso-cauldron.py` → `iso-cauldron.json`) com a textura da Pedra Rachada do Mundo; o sprite do Mundo não é usado na vista isométrica.
- **Vale Goblin** (v0.93.158, ADR 0038, `world/sanctuaryValeGoblin.ts` + `valeGoblinData.ts`): vale fechado por montanhas (pilha até 8), caverna-túnel na borda sul, acampamento com fogueira; os 7 goblins do pacote são só dados (`VALE_GOBLINS`).
