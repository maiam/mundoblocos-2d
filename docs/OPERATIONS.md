# Operações

## Requisitos
Node 22+, npm. Para o pipeline de arte: Python 3 com Pillow (com WebP) e numpy. Sem variáveis de ambiente
(não há `env.example`). Fonte Nunito via Google Fonts, com fallback `system-ui`.

## Comandos
| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local em `http://localhost:5173` (`?seed=<número|texto>`); expõe `window.__game` |
| `npm test` | Testes Vitest (`src/**/*.test.ts`) |
| `npx tsc --noEmit` | Typecheck |
| `npm run bench` | Benchmarks de geração/leitura de chunks (`bench/`, `vitest bench`) |
| `npm audit` | Deve mostrar 0 vulnerabilidades (a Hostinger também verifica as dependências do repositório) |
| `npm run build` | Typecheck + `dist/` estático (`base: './'`, qualquer subcaminho/CDN; inclui PWA) |
| `npm run build:artifact` | `dist/` → `artifact/mundoblocos.html` (código embutido, sem esqueleto `<html>`) + imagens em `artifact/mundoblocos-assets/` + mapa `artifact/mundoblocos-files.json` (ADR 0013) |
| `npm run build:artifact:santuario` | build com `VITE_WORLD=santuario` → `artifact/santuario.html` + `-assets/` + `-files.json` |

## Artifacts (versões jogáveis, privadas — compartilhar pelo menu Share)
| Mundo | URL | Atualizar |
|---|---|---|
| Principal | https://claude.ai/artifact/FKYk57NzSCjDA4rQH2RgLn | `npm run build:artifact` → publicar `artifact/mundoblocos.html` com `files` = conteúdo de `artifact/mundoblocos-files.json` |
| Santuário Celestial | https://claude.ai/artifact/AMGLa2gvXUbqpvjCVWR4gb | `npm run build:artifact:santuario` → publicar `artifact/santuario.html` com `files` de `artifact/santuario-files.json` |
- Rode **o build de cada mundo antes de publicá-lo** (os dois usam `dist/`). No dev: `?mundo=santuario`.
- Site próprio: ver "Hospedagem própria" abaixo (`orvalis.pensamentos.online`); o jogo reconhece o Santuário pelo hostname (`santuario.`).

## Hospedagem própria — `orvalis.pensamentos.online` (Hostinger)
Endereço **provisório** até o domínio próprio do Orvalis (ADR 0015: sem maiamapps): subdomínio de `pensamentos.online`,
na Hostinger. Site estático: nenhum servidor aqui; o servidor do jogo será outro app num subdomínio próprio
`orvalis-servidor.pensamentos.online`, publicado do repositório `maiam/orvalis-servidor` (app web Node.js na Hostinger,
Node 22, entrada `server.js`, sem build; porta de `PORT`). WebSocket de entrada **validado** em 2026-11-04 (página de
teste em `/`, saúde em `/saude`, eco em `/ws`).
**Dados das salas** (servidor 0.9.0): `~/orvalis-dados/sala-<n>.json` (ou `DATA_DIR`). Conferir em `/saude` → `dados`
(pasta, última gravação, `carregadaDoDisco`). Apagar o arquivo (com o servidor parado) recomeça a sala do zero.
**Sala travada em "Conectando…"** (06/11): o app Node da Hostinger reiniciou sozinho (`/saude` com `segundosNoAr` ~0) e
voltou em seguida; o jogo agora desiste em 10 s e tenta de novo uma vez. Se ficar frequente: plano B (VPS, Fase M).
**Sala não abre?** `/saude` deve mostrar o `protocolo` igual ao `PROTOCOL_VERSION` do jogo. O servidor só aceita
conexões das origens da lista dele (`DEFAULT_ORIGINS`, espelhada em `ONLINE_HOSTS` no jogo): o Artifact e as prévias da
Hostinger jogam só sozinhos (o menu mostra o link do site). O app do jogo continua app Node.js (preset Vite) por causa do build
automático a cada merge.

**Multiplayer: mudou `src/net/` ou `src/world/`?** `npm run build:net` aqui → no servidor `npm run sync-net --
../mundoblocos-2d` → PR no servidor. Mudança incompatível de mensagem: suba `PROTOCOL_VERSION` e publique jogo e
servidor juntos (versões diferentes recebem "recarregue a página").

**Publicação pelo GitHub (forma principal)**: a Hostinger compila o repositório a cada push na branch escolhida.
Configuração no hPanel (conferida com build limpo `npm ci && npm run build` em Node 22):

| Campo | Valor |
|---|---|
| Configuração predefinida | Vite |
| Branch | `main` (publicar = mesclar o PR da entrega em `main` após a Verificação passar — `CONVENTIONS`) |
| Versão do Node | 22.x |
| Diretório raiz | `./` |
| Comando de construção | `npm run build` (typecheck + build) |
| Gerenciador de pacotes | npm (usa o `package-lock.json`) |
| Diretório de saída | `dist` |
| Variáveis de ambiente | nenhuma — **não** defina `VITE_WORLD` (sem ela, o site traz os dois mundos e escolhe pelo endereço) |

**No ar desde 2026-11-03** (conferido de fora: HTTPS, LiteSpeed; `index.html` com `no-cache`, `assets/` com cache de
1 ano, manifesto como `application/manifest+json`, `.htaccess` inacessível (403); jogo, celular e Santuário sem erros).
A Hostinger também lista vulnerabilidades das dependências do repositório: mantenha `npm audit` em 0.

**Pacote manual (alternativa)**: `npm run pack:site` → `npm run build` (sem `VITE_WORLD`: os dois mundos, escolhidos pelo endereço) e
`orvalis-site.zip` na raiz do repositório (não versionado) com o **conteúdo** de `dist/`: `index.html`,
`manifest.webmanifest`, ícones, `.htaccess` (tipos MIME e cache: página `no-cache`, arquivos com hash 1 ano) e `assets/`.

**Primeira vez (hPanel)**:
1. **Sites** → `pensamentos.online` → **Painel** → menu **Domínios** → **Subdomínios**: criar `orvalis`. Deixe a
   pasta padrão (`public_html/orvalis`, ou `domains/pensamentos.online/public_html/orvalis` conforme o plano).
   Se o DNS de `pensamentos.online` **não** usa os nameservers da Hostinger, crie também um registro **A** `orvalis`
   apontando para o IP do servidor (hPanel → Painel → "Detalhes do plano"/IP).
2. **Arquivos** → **Gerenciador de Arquivos** → abrir a pasta do subdomínio → apagar o `default.php`/`index.php` de
   boas-vindas, se existir → **Enviar** `orvalis-site.zip` → clicar com o botão direito → **Extrair** aqui (os arquivos
   devem ficar direto na pasta, com `index.html` na raiz dela) → apagar o `.zip`.
3. **Segurança** → **SSL**: conferir/instalar o certificado grátis para `orvalis.pensamentos.online` (pode levar
   alguns minutos até horas) e ativar **Forçar HTTPS**. HTTPS é necessário para instalar como app.
4. Santuário (opcional): criar o subdomínio `santuario.orvalis` apontando para a **mesma** pasta (o jogo abre o
   Santuário pelo primeiro nome do endereço). Sem ele, `https://orvalis.pensamentos.online/?mundo=santuario` funciona.
5. Conferir: abrir no celular (deitado), jogar, recarregar (continua salvo), instalar na tela inicial.

**Atualizar**: `npm run pack:site` → no Gerenciador de Arquivos, apagar a pasta `assets/` e o `index.html` antigos →
enviar e extrair o zip novo. (Arquivos velhos em `assets/` não atrapalham, só ocupam espaço.)

**Testar antes de enviar**: `cd dist && python3 -m http.server` e abrir `http://localhost:8000` (e `?mundo=santuario`).

## Pipeline de arte
### Personagem modular (contrato v02, ADR 0017)

Regras: `assets-src/personagens/CONTRATO.md`. A arte publica em `humano-chibi/entrega/v02/` e atualiza
`humano-chibi/catalogo.json`; `_trabalho/` e `_arquivo/` (Krita, ORA, v01) ficam só no computador (fora do git —
manter cópia em nuvem).

```bash
python3 scripts/export-personagem.py                          # valida a entrega (erro = sai com código 1)
python3 scripts/export-personagem.py --out /tmp/chibi-export  # valida e exporta WebP + manifesto.json
```

Teste no jogo: `python3 scripts/export-personagem.py --out src/assets --prefixo chibi-` (regrava as folhas
`chibi-*.webp` + `chibi-manifesto.json`; não rodar `optimize-assets.py` nelas, já saem em WebP) e abrir
`http://localhost:5173/?seed=42&personagem=chibi&tronco=colete-verde&pernas=calca-ardosia&pes=sapatos-couro`.

Precisa de Pillow com WebP (sem numpy). Valida tamanho das folhas, pixels fora da caixa da ação, partes/encaixes
desconhecidos, contato dos pés e prévias ≤ 1 MB. Peça nova ou revisada só vai ao jogo depois de passar no validador e ser reexportada para `src/assets/`.

Sempre: gerar PNG em `src/assets/` → `python3 scripts/optimize-assets.py` (converte para WebP q84/alfa q85 e apaga os
PNG; `--recompress` regrava no nível atual os WebP de sprite ≥ 60 kB). Depois, **importar o asset no pacote do mundo**
(`src/render/art/principal.ts` ou `santuario.ts`, ADR 0010) — é o único lugar que importa imagens (como URL, ADR 0013).

**Artefatos**: `npm run build:artifact` (fixa `VITE_WORLD=principal`) e `npm run build:artifact:santuario`; cada um
só leva a arte do seu mundo, em arquivos ao lado da página (ADR 0013). Gere o build de um mundo imediatamente antes de publicá-lo (mesmo `dist/`).

**Sprites** — `P="python3 scripts/process-sprite.py"`:
```bash
$P assets-src/heroine-sheet.png        src/assets/heroine.png     --frame-h 144
for t in sword hoe pickaxe axe; do
  $P assets-src/heroine-$t-sheet.png   src/assets/heroine-$t.png  --frame-h 144 --rows-map 0,3,1,2
done
$P assets-src/heroine-shovel-sheet.png src/assets/heroine-shovel.png --frame-h 144 --rows-map 0,1,1m,2
$P assets-src/sheep-sheet.png          src/assets/sheep.png       --frame-h 96 --sat 23 --min 128
$P assets-src/lamb-sheet.png           src/assets/lamb.png        --frame-h 80 --sat 36 --min 128
$P assets-src/heroine-sword-attack-sheet.png src/assets/heroine-sword-attack.png --alpha --largest --frame-h 144
$P assets-src/heroine-axe-attack-sheet.png   src/assets/heroine-axe-attack.png   --alpha --largest --frame-h 144
$P assets-src/heroine-hoe-attack-sheet.png   src/assets/heroine-hoe-attack.png   --alpha --largest --frame-h 144
$P assets-src/heroine-shovel-attack-sheet.png src/assets/heroine-shovel-attack.png --alpha --largest --frame-h 144
# Herói (assets-src/hero, refeito em 07/11): golpes e caminhada base já na ordem canônica; caminhadas com ferramenta não
$P assets-src/hero/hero-sheet.png src/assets/hero.png --alpha --largest --frame-h 144
for t in axe hoe sword pickaxe; do $P assets-src/hero/hero-$t-attack-sheet.png src/assets/hero-$t-attack.png --alpha --largest --frame-h 144; done
$P assets-src/hero/hero-shovel-attack-sheet.png src/assets/hero-shovel-attack.png --alpha --largest --respace 40 --frame-h 144
for t in sword axe; do $P assets-src/hero/hero-$t-sheet.png src/assets/hero-$t.png --alpha --largest --frame-h 144 --rows-map 0,3,1,2; done
$P assets-src/hero/hero-hoe-sheet.png src/assets/hero-hoe.png --alpha --largest --respace 40 --frame-h 144 --rows-map 0,3,1,2
for t in pickaxe shovel; do $P assets-src/hero/hero-$t-sheet.png src/assets/hero-$t.png --alpha --largest --frame-h 144 --rows-map 0,1,3,2; done
# Hood (assets-src/hood): caminhadas transparentes com fileiras F, D, C, E; a da pá vem com os dois lados para a esquerda
$P assets-src/hood/hood-sheet.png src/assets/hood.png --alpha --largest --frame-h 144 --rows-map 0,3,1,2
for t in sword axe hoe pickaxe; do $P assets-src/hood/hood-$t-sheet.png src/assets/hood-$t.png --alpha --largest --frame-h 144 --rows-map 0,3,1,2; done
$P assets-src/hood/hood-shovel-sheet.png src/assets/hood-shovel.png --alpha --largest --frame-h 144 --rows-map 0,3,3m,2
# Gino (assets-src/gino): caminhadas com fileiras F, D, C, E; golpes já canônicos (picareta e pá passam da célula)
$P assets-src/gino/gino-sheet.png src/assets/gino.png --alpha --largest --frame-h 144 --rows-map 0,3,1,2
for t in sword axe hoe pickaxe shovel; do $P assets-src/gino/gino-$t-sheet.png src/assets/gino-$t.png --alpha --largest --frame-h 144 --rows-map 0,3,1,2; done
for t in sword axe hoe; do $P assets-src/gino/gino-$t-attack-sheet.png src/assets/gino-$t-attack.png --alpha --largest --frame-h 144; done
$P assets-src/gino/gino-sit-sheet.png src/assets/gino-sit.png --alpha --largest --frame-h 144   # sentar: sequência de frente
$P assets-src/hero/hero-sit-sheet.png src/assets/hero-sit.png --alpha --largest --frame-h 144
$P assets-src/hood/hood-sit-sheet.png src/assets/hood-sit.png --alpha --largest --frame-h 144
$P assets-src/heroine-sit-sheet.png src/assets/heroine-sit.png --alpha --largest --respace 40 --frame-h 144   # botas passam da grade
for t in pickaxe shovel; do $P assets-src/gino/gino-$t-attack-sheet.png src/assets/gino-$t-attack.png --alpha --largest --respace 40 --frame-h 144; done
# golpes do Hood: já na ordem canônica; a picareta erguida passa da célula
for t in sword axe hoe shovel; do $P assets-src/hood/hood-$t-attack-sheet.png src/assets/hood-$t-attack.png --alpha --largest --frame-h 144; done
$P assets-src/hood/hood-pickaxe-attack-sheet.png src/assets/hood-pickaxe-attack.png --alpha --largest --respace 40 --frame-h 144
# Mila (assets-src/mila): caminhadas com fileiras F, D, C, E; golpes já canônicos (picareta e pá passam da célula)
$P assets-src/mila/mila-sheet.png src/assets/mila.png --alpha --largest --frame-h 144 --rows-map 0,3,1,2
for t in sword axe hoe pickaxe shovel; do $P assets-src/mila/mila-$t-sheet.png src/assets/mila-$t.png --alpha --largest --frame-h 144 --rows-map 0,3,1,2; done
for t in sword axe hoe; do $P assets-src/mila/mila-$t-attack-sheet.png src/assets/mila-$t-attack.png --alpha --largest --frame-h 144; done
for t in pickaxe shovel; do $P assets-src/mila/mila-$t-attack-sheet.png src/assets/mila-$t-attack.png --alpha --largest --respace 40 --frame-h 144; done
$P assets-src/mila/mila-sit-sheet.png src/assets/mila-sit.png --alpha --largest --frame-h 144
# lobos (assets-src/lobos): folha 4×4 já na ordem canônica (frente, esquerda, direita, costas)
for c in marrom cinza branco; do $P assets-src/lobos/lobo-$c-sheet.png src/assets/wolf-$c.png --alpha --largest --frame-h 144; done
# porta de carvalho (4×2, 0–3 abrindo, 4–7 fechando); geometria em textures.ts (DOOR_*)
$P assets-src/oak-door-sheet.png src/assets/oak-door.png --alpha --largest --cols 4 --rows 2 --frame-h 120
# picareta: quadros transbordam a grade (picareta erguida sobe, pés descem) → --respace
$P assets-src/heroine-pickaxe-attack-sheet.png src/assets/heroine-pickaxe-attack.png --alpha --largest --respace 40 --frame-h 144
$P assets-src/goddess-float-sheet.png  src/assets/goddess-float.png --cols 7 --rows 4 --region 130,0,1470,1000 --rows-map 0,3,1,2 --frame-h 160 --sat 16 --min 228
```
`--largest`: mantém só o maior pedaço por quadro (fragmentos de quadros vizinhos); `--alpha`: folha já transparente (usa o alfa); `--grid-offset-y`: sobe a grade quando o desenho invade a linha de cima
(foi o caso da folha de caminhada da Deusa, hoje só referência: `--alpha --frame-h 160 --grid-offset-y 22`).

**Cavalo**: `$P assets-src/horse-sheet.png src/assets/horse.png --alpha --largest --frame-h 112`

**Vaca e galinha**: `$P assets-src/animals/cow.png src/assets/cow.png --alpha --largest --frame-h 112` e
`$P assets-src/animals/chicken.png src/assets/chicken.png --alpha --largest --frame-h 96` (o ruído vermelho do fundo
da galinha some com `--largest`).

**Coraçõezinhos do namoro** (prancha 4×4 transparente, `assets-src/love-hearts-sheet.png`):
`python3 scripts/extract-love.py` → `love-hearts.png` (16 quadros numa fileira, mesma janela para todos; clareia o rosa
onde o desenho desbota) → `optimize-assets.py`.

**Filhotes** (potro, bezerro, pintinho): `$P assets-src/animals/foal.png src/assets/foal.png --alpha --largest
--frame-h 112`, `calf.png … --frame-h 104` e `chick.png … --frame-h 88` (o ruído vermelho/amarelo do fundo do bezerro
tem alfa ~1 e some no recorte).

**Árvores adultas** (v0.88.0, sem crescimento): `python3 scripts/process-trees.py <especie> img1.png img2.png … [--cut ALFA]` — uma ilustração por forma (PNG com alfa; `--cut` limpa halos de fundo semitransparentes) → guarda as fontes em `assets-src/arvores/<especie>/` e monta `src/assets/tree-<especie>.webp` (tira de quadros iguais; mesma escala para todas as formas). Os quadros por espécie estão em `TREE_FRAMES` (`render/textures.ts`): mude lá ao mudar a quantidade. Ícone de bloco de material novo: `python3 scripts/make-material-icons.py <material> <icone>`.

**Prancha do cacto** (grade 4×2 transparente em `assets-src/trees/<nome>.png`; as outras árvores usavam esta prancha até a v0.87.0):
`python3 scripts/extract-trees.py` → `tree-<nome>.png` (quadros de 192 px, mesma escala dentro da prancha, base no pé)
+ ícones das mudas e da maçã → `optimize-assets.py`. A grade da prancha não precisa ser exata: o script separa os 8
desenhos por pedaços conectados (copas que cruzam a divisa vêm inteiras) e descarta o ruído do fundo.

**Interiores** (`assets-src/interiors/<id>.png`, imagem inteira = cômodo): `python3 scripts/extract-interiors.py
[--grid <png>]` → `interior-<id>.png` a 64 px por célula (grade de `InteriorDef.map`) → `optimize-assets.py`. A prévia
`--grid` pinta de vermelho as células bloqueadas e de azul o capacho, para conferir o mapa sobre a arte.

**Moradores e roupas** (`assets-src/villagers/villager-*-sheet.png` e `outfit-*-sheet.png`, 4×4 transparentes):
`python3 scripts/extract-villagers.py [--preview <png>]` → `villager-*.png` + `outfit-*.png` na mesma grade/escala
(a roupa perde a cabeça careca) → `optimize-assets.py`. A prévia mostra cada morador com cada roupa.
O mesmo script gera as **expressões** (`assets-src/expressions/`, 16 rostos × frente/esquerda/direita) → `expr-<id>`,
`expr-<id>-fx` e `villager-<cabelo>-bangs`; `--expr-preview <png>` mostra as 16 expressões em cada personagem. Folha de
expressão nova com outro molde: medir de novo `CALIB` (escala e deslocamento da expressão 0 até o morador loiro).

**Hortaliças** (pranchas 8×2 transparentes em `assets-src/crops/<nome>.png`): `python3 scripts/extract-crops.py` →
`crop-<nome>.png` (4×4 quadros de 128 px, mesmo formato do trigo) → `optimize-assets.py`. Cultura nova: uma linha em
`CROPS` (blocks), o item que planta (items) e a folha no pacote (`art/principal.ts` → `crops`).

**Ferramentas por material**: a arte segue `assets-src/ferramentas/CONTRATO.md` (ficha em `catalogo.json`, prancha
de ícones padronizada, camada de mão sobre pose-base). O motor só importa o que passou pela checagem da seção 5.

**Pedregulhos** (prancha de pedras soltas em fileiras irregulares, `assets-src/rocks-sheet.png`):
`python3 scripts/extract-rocks.py` → `rocks.png` (tira de quadros de 96 px, mesma escala, base no pé) →
`optimize-assets.py`. Separa os desenhos por pedaços conectados e ordena por fileira (sem grade).

**Cerca e portão** (referências em `assets-src/cerca/`: `moldura.png` = cercado quadrado 3/4, `portao.png` =
fechado, aberto e poste solto): `python3 scripts/extract-fence.py` → `fence.png` (3 peças de 128 × 192 px com âncora
comum no centro da célula), `fence-gate.png` (2 quadros, postes nas bordas da célula) e os ícones →
`optimize-assets.py`. Mudou a âncora ou o quadro no script → atualize `FENCE_FRAME`/`GATE_FRAME` em `render/fence.ts`.

**Marcos do mundo** (entrada do covil, `assets-src/dungeon-cave.png`): `python3 scripts/extract-landmarks.py` →
`dungeon-cave.png` (320 px de largura) → `optimize-assets.py`. Carrega com a arte do covil, em segundo plano.

**Ícones soltos de itens** (`assets-src/items/<nome>.png`, desenho transparente): `python3 scripts/extract-items.py`
→ `icon-item-<nome>.png` 64×64. A segmentação das pranchas (árvores e hortaliças) fica em `scripts/sprite_segments.py`.

**Crescimento do trigo** (estágios de tamanhos diferentes, ancorados pela base):
`python3 scripts/process-crop.py assets-src/wheat-growth-sheet-v2.png src/assets/wheat-crop.png 128`

**Blocos do Santuário** (prancha 3/4 transparente 6×3): `python3 scripts/extract-blocks.py --celestial` →
`celestial-atlas.png` + `icon-celestial-*.png` (ordem = `CELESTIAL_BLOCKS`). `slice-icons.py` recorta ícones de
qualquer prancha em grade, se precisar.

**Ícones** (`--cols 1 --rows 1 --frame-h 64`):
- Trigo (`wheat-icons-sheet.png`, `--sat 50 --min 190`): semente `45,210,310,402` · trigo `645,555,905,835`.
- Ferramentas (`tool-icons-sheet.png`, `--sat 34 --min 175`): espada `75,105,455,490` · enxada `535,105,915,490` ·
  picareta `995,105,1375,490` · pá `285,590,680,985` · machado `770,590,1165,985`.

**Dungeon** (montanhas, pedras, blocos, 3 aranhas; fontes `assets-src/dungeon-*-sheet.png` e `spider-*-sheet.png`):
`python3 scripts/extract-dungeon.py` e depois `optimize-assets.py` (gera também `dungeon-walls`, os cubos de parede). Caixas de cada prancha e modo de recorte
(alpha/light/dark) estão no fim do script; a aranha gigante usa a prancha de 2172 px (o retrato à esquerda é ignorado). Também gera os ícones dos espólios
(`spider-loot-icons-sheet.png` → `icon-silk/fang/queen-heart`) e as mortes (`spider-*-death-sheet.png` →
`spider-*-death.png`; o script imprime a `ratio` que vai em `SheetSpec.death`).

**Água** (`assets-src/water-block.png`, `water-flow-sheet.png`): `python3 scripts/extract-water.py` →
`water-top` (chão) e `water-flow` (4 direções × 4 quadros, recortes do destino no fim do script) → `optimize-assets.py`.

**Fogueira, caldeirão e forno** (`assets-src/campfire.png`, `cauldron.png`, `oven.png`, transparentes):
`python3 scripts/extract-craftables.py` → `icon-block-<nome>` (64×64) + `<nome>` (sprite 128 px de largura; a largura em
células fica em `CRAFT_PROPS`, `render/textures.ts`) → `optimize-assets.py`.

**Interface, tenda e Tábua** (`assets-src/ui-*.png`, `tent.jpg`, `oak-planks-cube.png`): `python3 scripts/extract-ui.py`
→ `icon-ui-character/skills/builder`, `icon-block-tent` + `tent`, e substitui a coluna da Tábua no `blocks-atlas`
(rode **depois** de `extract-blocks.py`, que regeneraria a coluna antiga) → `optimize-assets.py`.

**Variações de pedra** (`assets-src/stone-variants-34.png`, 4×2 transparente): `python3 scripts/extract-stones.py`
→ ícones `icon-block-stone*` e colunas 5 (Pedra Bruta) e 8–14 do `blocks-atlas` (rode **depois** de
`extract-blocks.py` e `extract-ui.py`) → `optimize-assets.py`. Ordem total: blocks → ui → stones → optimize.

**Cidade — arte em imagem** (pranchas em `assets-src/town/*.png`, transparentes ou com fundo liso): `python3
scripts/extract-town.py [--only nome1,nome2] [--preview arquivo.png]` → `src/assets/town-<nome>.png` → `optimize-assets.py`. Cada objeto é
uma linha de `OBJECTS` (prancha, recorte em px, encaixe `('base', células, linha)` ou `('full', células)`, área,
remover fundo). Escala única de 48 px/célula, centro da área no centro da imagem; legendas/setas somem (só ficam as
partes grandes). A prévia desenha a área de cada objeto sob ele para conferir. Novo nome → registrar em
`render/art/principal.ts` (`town`) e em `IMAGE_ART` de `render/townArt.ts`. Uma imagem **por tamanho** de construção.

**Terra com Grama** (`assets-src/grass-variants-34.png`, 3 cubos lado a lado): `python3 scripts/extract-grass.py` →
coluna 1 (variação 1) e colunas extras 15–16 do `blocks-atlas` + `icon-block-grass` (rode **depois** de
`extract-blocks.py`, `extract-ui.py` e `extract-stones.py`) → `optimize-assets.py`. Ordem total: blocks → ui → stones →
grass → optimize. Colunas extras de um material: `MATERIAL_VARIANT_COLS` em `render/textures.ts`.

**Materiais V2** (ADR 0023, em validação): PNGs 128×128 em `assets-src/materiais/<material>/` (contrato na pasta) →
`python3 scripts/build-materials.py --preview` → `src/assets/materials-v2.{webp,json}` (já sai em WebP; sem
`optimize-assets.py`). O V2 é o padrão do jogo; `?blocos=legado` volta ao atlas antigo e `?materiais=1` abre a cena de comparação (só no `npm run dev`). A cena `?escala=1` já mostra a arte V2
(ADR 0022, renderizador real). Arte provisória:
`scripts/make-provisional-materials.py` (tira do atlas antigo; cria `PROVISORIO.txt`). Arte oficial:
`python3 scripts/import-material.py <material> --top arq.png [--front arq.png] [--overlay arq.png [--fit-fringe]]`
(reduz qualquer quadrado para 128 como ladrilho; sem `--front` a frente repete o topo; `--fit-fringe` guarda os 32 px de
baixo de uma franja alta; apaga o `PROVISORIO.txt`).

**Blocos**: `python3 scripts/extract-blocks.py` (prancha 3/4 `assets-src/blocks-sheet-34.png` → atlas + ícones).
`--iso` usa a prancha isométrica antiga; `--out X.png` gera só o atlas (para comparar sem trocar os ícones).

**PWA**: `python3 scripts/make-icons.py` (Pillow) gera, a partir do ícone oficial `assets-src/icone-orvalis.webp` (selo redondo, cantos transparentes), `public/icon-192.png`, `icon-512.png` (purpose "any"; o 192 também é o favicon), `icon-maskable-512.png` (selo a 80% sobre fundo `#120f2c`) e `apple-touch-icon.png` (180×180, fundo opaco). Trocar o ícone = substituir o `.webp` e rodar o script.

**Cena de escala** (ADR 0022, só em desenvolvimento): `npm run dev` e abrir `http://localhost:5173/?escala=1` — personagens, animais, monstros, baú, bancos, árvores e uma casa 5×5 sobre a grade, desenhados pelo renderizador real. Teclas: `G` grade · `A` âncoras e alturas · `B` células bloqueadas · `L` nomes · `+`/`−` zoom · setas · `0` reenquadra. Use ao integrar arte nova (compare com o que já existe; a fila é `src/dev/scaleLayout.ts`). Captura de referência: `docs/assets/escala-referencia.jpg` (viewport 1280 × 720). Não entra no build de produção.

## Testes no navegador
Playwright e Chromium já estão no ambiente (`require('playwright')`). Com `npm run dev` em segundo plano,
use `window.__game` (ex.: `__game.select(9)`, `__game.startAction()`, `__game.player`). Não encadeie
`pkill` com outros comandos (ver `CLAUDE.md`).
