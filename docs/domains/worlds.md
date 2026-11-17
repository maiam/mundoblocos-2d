# Domínio: mundos (perfis)

**Fonte de verdade:** `src/world/profiles.ts` (`WORLD_PROFILES`). O motor é um só; o perfil decide o que existe.

| Campo | Mundo principal | Santuário (v0.93.134, ADR 0036) |
|---|---|---|
| `terrain` | procedural (`WorldGenerator`) | **plano vazio de grama** (`FlatGenerator`) |
| `bounds` | ilimitado | **16 chunks = 4×4** (`cx -2..1`, `cy -2..1`) → 64×64 células |
| `character` | heroína | **Deusa da Vida** |
| `blocks` | materiais, objetos, paredes… | **36 peças do conjunto isométrico** (20 cubos + 16 objetos, `ISO_BLOCKS`); pilha de 5, cubos cheios |
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

## Conjunto isométrico (v0.93.140, ADR 0036)
Fonte: `assets-src/iso-set/prancha-iso.png` (36 peças, fundo transparente, projeção isométrica = a da câmera: topo 1,414 × 0,816 células). `python3 scripts/extract-iso-set.py` gera `src/assets/iso-ground.webp` (20 topos 128 px), `iso-cube.webp` (faces sul e leste do Bloco de Grama), `iso-props.webp` (16 objetos), `icon-iso-<chave>.webp` e `render/isoSetManifest.ts`. Ids em `blocks.ts` (`ISO_*`: 80–98, 166–169, 186–189, 206–208, 131, 1–5, 7 — os livres depois da limpeza do Celestial) e listas `ISO_CUBES`/`ISO_PROPS`/`ISO_BLOCKS`.
- **Cubos** (`shape: 'cube'`, colocáveis em pilha de 5 e na face): topo = o piso da prancha; laterais = terra com franja de grama (grama e caminhos), terra lisa (Piso de Terra) ou pedra (pisos de pedra). O chão do mundo é o Piso de Grama (emendável, `seamless` no script).
- **Objetos** (`shape: 'rock'` sólido ou `'decoration'` andável: pedrinhas, capim, margaridas, lavanda, arbusto pequeno): só no chão livre, um sprite vertical por célula girado 45°. **Casa de Feira 3×3**: `ISO_HOUSE` (canto inferior esquerdo) + 8 `ISO_HOUSE_PART` (`World.houseAnchor/houseCells`); qualquer parte quebra a casa inteira.
- O desenho se apoia na quina sul da base (o plano gira em volta do meio da borda de baixo).
- A prancha 3/4 antiga (`celestial-blocks-34.png`/`-iso.png`) e os 18 blocos celestiais (ids 80–97) saíram do jogo.

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
