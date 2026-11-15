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
# golpe de espada do Hood (v0.93.66): prancha de 8 quadros × 8 direções (S, SE, L, NE, N, NO, O, SO); entram 4 direções (linhas 0,6,2,4 = frente, esquerda, direita, costas) e a folha de saída tem 8 colunas × 4 linhas:
#   $P assets-src/hood/hood-sword-attack8-sheet.png /tmp/x.png --alpha --largest --cols 8 --rows 8 --rows-map 0,6,2,4 --frame-h 144  (e corte as 4 primeiras linhas: o script gera 8 linhas, 4 vazias)
# golpe de espada da Mila (v0.93.68): mesma prancha 8×8 e o mesmo comando do Hood (sem `--largest`: o arco branco é um pedaço separado do corpo e some com ele), `assets-src/mila/mila-sword-attack8-sheet.png` → `src/assets/mila-sword-attack.png` (8 colunas × 4 linhas, cortando as 4 linhas vazias)
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
python3 scripts/slice-icons.py assets-src/lobos/wolf-loot-icons-sheet.png 2 1 icon wolf-fang,wolf-pelt   # presa e pelagem do lobo
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

**Janela da loja:** `python3 scripts/make-shop-frame.py` (`assets-src/ui/shop-frame.png` → `src/assets/ui-shop.png`: apaga os textos que mudam; depois `optimize-assets.py`). **Interiores** (`assets-src/interiors/<id>.png`, imagem inteira = cômodo): `python3 scripts/extract-interiors.py
[--grid <png>]` → `interior-<id>.png` a 64 px por célula (grade de `InteriorDef.map`) → `optimize-assets.py`. A prévia
`--grid` pinta de vermelho as células bloqueadas e de azul o capacho, para conferir o mapa sobre a arte.

**Atlas de paredes (W3):** `python3 scripts/build-wall-atlas.py tabuas` → `src/assets/walls-tabuas.webp` (lê `assets-src/paredes/<material>/`, 16 tampas + 4 frentes + 3 quadros de porta `door_*.png` (provisórios só se faltarem; Tábuas tem a arte final), só Tábuas); material novo = pasta com as 20 peças + entrada em `WALL_ART_MATERIALS` (`render/wallAtlas.ts`) e em `ArtPack.wallAtlases`.

**Frentes entregues** (limpeza do alfa + largura): `python3 scripts/retarget-wall-fronts.py --entrada <pasta> --saida <pasta> [--de 38,83 --para 32,80]` (composição do alfa parcial sobre a cor de junta; pontas e poste esticados para a medida final). Usado em `assets-src/paredes/tabuas/`.

**Tampas entregues em outra espessura:** `python3 scripts/retarget-wall-caps.py --entrada <pasta> --saida <pasta> [--de-x 45,83 --de-z 45,83 --para-x 48,80 --para-z 42,86]` reprojeta as 16 tampas esticando poste e braços (mantém topologia e emendas). Usado em `assets-src/paredes/tabuas/`.

**Arte das paredes** (W1, ADR 0027; ainda sem pipeline de build — vem na W3): contrato e gabarito em `assets-src/paredes/` (`CONTRATO.md`, `gabarito.png`; `python3 scripts/make-wall-guide.py [--tx 1.0] [--tz 0.35] [--franja 16]` regera o gabarito **e** o `CONTRATO.md` (a partir de `CONTRATO.tpl.md`; não edite o contrato à mão)). Entrega por material em `assets-src/paredes/<material>/`: `front_mid`, `front_end_left`, `front_end_right`, `front_post`, `cap_00`…`cap_15` (PNG RGBA, 128 px por célula).

**Ícone de item** (v0.93.7): `python3 scripts/make-item-icon.py assets-src/<item>.png src/assets/icon-<item>.webp [--size 64]` (recorta, centraliza e reduz; WebP sem perdas) → import e entrada em `itemIcons` de `render/art/principal.ts`.

**Lobos** (v0.93.61; `assets-src/wolf-<brown|gray|white>/<estado>.png`, 4×4 transparentes): `python3 scripts/process-sprite.py <src> src/assets/wolf-<cor>-<estado>.png --alpha --largest --frame-h 160` (`alert` sem `--largest`; confira a ordem das linhas: a folha marrom de idle/run/alert/attack/hurt/death usa `--rows-map 0,2,1,3`) → `optimize-assets.py`. **Capivara** (`assets-src/capybara/`, `--frame-h 128`): só `walk` e `idle` entram (`src/assets/capybara*.webp`).

**Homem-lagarto** (v0.93.60; `assets-src/lizard/<estado>.png`, 4×4 transparente, linhas frente/costas/esquerda/direita → `--rows-map 0,2,3,1`): mesmo comando do goblin (`--alpha --largest --frame-h 160`, `alert` sem `--largest`) com `src/assets/lizard-<estado>.png` → `optimize-assets.py` → imports em `render/art/principal.ts`.

**Goblin** (v0.93.6; `assets-src/goblin/<estado>.png`, 4×4 transparente, ordem frente/esquerda/direita/costas, sem `--rows-map`): `python3 scripts/process-sprite.py assets-src/goblin/<estado>.png src/assets/goblin-<estado>.png --alpha --largest --frame-h 160` (no `alert` omita `--largest`, senão os "!" somem) → `optimize-assets.py` → imports `.webp` em `render/art/principal.ts`. Estados: idle, walk, run, alert, attack, hurt, death.

**NPCs da cidade** (v0.92.0; `assets-src/npcs/<id>.png`, 4×4 transparente): `python3 scripts/process-sprite.py assets-src/npcs/<id>.png src/assets/npc-<id>.png --alpha --largest --frame-h 144 --rows-map 0,3,1,2` (as folhas chegam com as linhas frente, costas, direita, esquerda) → `optimize-assets.py`. Retratos da caixa de conversa: `python3 scripts/make-portraits.py [id ...]` → `portrait-<id>.png` (192×192, cabeça do quadro de frente) → `optimize-assets.py`. O Black (`black.png`) é a composição da folha antiga do ferreiro. Moldura: `assets-src/dialogo-moldura.png` (enviada pelo dono do produto; o nome e o rosto de exemplo foram apagados e o recorte vai a 1280 px de largura em `src/assets/dialogo-moldura.webp`).

**Hortaliças** (pranchas 8×2 transparentes em `assets-src/crops/<nome>.png`): `python3 scripts/extract-crops.py` →
`crop-<nome>.png` (4×4 quadros de 128 px, mesmo formato do trigo) → `optimize-assets.py`. Cultura nova: uma linha em
`CROPS` (blocks), o item que planta (items) e a folha no pacote (`art/principal.ts` → `crops`).

**Ferramentas por material**: a arte segue `assets-src/ferramentas/CONTRATO.md` (ficha em `catalogo.json`, prancha
de ícones padronizada, camada de mão sobre pose-base). O motor só importa o que passou pela checagem da seção 5.

**Pedregulhos** (prancha de pedras soltas em fileiras irregulares, `assets-src/rocks-sheet.png`):
`python3 scripts/extract-rocks.py` → `rocks.png` (tira de quadros de 96 px, mesma escala, base no pé) →
`optimize-assets.py`. Separa os desenhos por pedaços conectados e ordena por fileira (sem grade).

**Cerca e portão** (referências em `assets-src/cerca/`: `moldura.png` = cercado quadrado 3/4, `portao.png` =
fechado, aberto e poste solto): `python3 scripts/extract-fence-v3.py` (v0.93.95; fonte em `assets-src/cerca-v3/kit.png`; o `extract-fence.py` é a versão antiga) → `fence.webp` (3 peças de 128 × 144 px com âncora
comum no centro da célula), `fence-gate.webp` (5 poses 136 × 94, 0°–90°, folha encolhida no script; a animação usa 10 quadros ida e volta) e os ícones →
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

**Planificações de cubo** (v0.93.77, `assets-src/blocos-net/*.png`: topo no meio de cima, 4 laterais, base): recorta-se o topo e uma lateral (margem ~24 px contra o contorno), torna-se o ladrilho repetível (mistura com o deslocamento de meio ladrilho) e importa-se com `import-material.py` (`--top`, `--front`; a franja da grama sai da máscara de não-terra da lateral, 32 linhas); depois `build-materials.py --preview` e os ícones `icon-block-*` (topo + frente escurecida, 64×64).

**Blocos**: `python3 scripts/extract-blocks.py` (prancha 3/4 `assets-src/blocks-sheet-34.png` → atlas + ícones).
`--iso` usa a prancha isométrica antiga; `--out X.png` gera só o atlas (para comparar sem trocar os ícones).

**PWA**: `python3 scripts/make-icons.py` (Pillow) gera, a partir do ícone oficial `assets-src/icone-orvalis.webp` (selo redondo, cantos transparentes), `public/icon-192.png`, `icon-512.png` (purpose "any"; o 192 também é o favicon), `icon-maskable-512.png` (selo a 80% sobre fundo `#120f2c`) e `apple-touch-icon.png` (180×180, fundo opaco). Trocar o ícone = substituir o `.webp` e rodar o script.

**Cena de escala** (ADR 0022, só em desenvolvimento): `npm run dev` e abrir `http://localhost:5173/?escala=1` — personagens, animais, monstros, baú, bancos, árvores e uma casa 5×5 sobre a grade, desenhados pelo renderizador real. Teclas: `G` grade · `A` âncoras e alturas · `B` células bloqueadas · `L` nomes · `+`/`−` zoom · setas · `0` reenquadra. Use ao integrar arte nova (compare com o que já existe; a fila é `src/dev/scaleLayout.ts`). Captura de referência: `docs/assets/escala-referencia.jpg` (viewport 1280 × 720). Não entra no build de produção.

## Medir o 3D em aparelho real (ADR 0031) — o 3D é o padrão do Mundo desde a v0.93.47
1. **Mesma rede (rápido):** `npm run dev -- --host` e abrir `http://<IP-do-computador>:5173/?fps=1` no aparelho (o 3D já é o padrão; `?render=2d` mede o 2D para comparar); ou use o site/Artifact publicado com `?fps=1`.
2. `?fps=1` mostra um painel (FPS, tempo de quadro e o pior, chamadas/triângulos/texturas/geometrias da GPU, memória do JS); **toque nele para copiar o
   relatório** (JSON) e cole na conversa. O relatório traz a sessão inteira **e o regime estável** (depois de 8 s de carga), a fração de quadros acima de 33 ms
   (< 30 FPS) e de 50 ms (engasgo), as **pausas do navegador** (aba em segundo plano, fora das médias) e o **tempo de JS do `draw`** (`jsDrawMs`, para separar
   CPU de GPU). Faça duas coletas: ~1 min parado e ~1 min andando, pela cidade, pela floresta e à noite. Em HTTP na rede local o navegador não libera a
   área de transferência: o painel abre então uma caixa de texto com o JSON já selecionado (copie à mão ou tire um print; toque na caixa para fechar). O dia
   dura 8 min (`DAY_LENGTH_S` = 480) e o jogo começa de manhã (0,31): anoitece em ~3,5 min e é meia-noite em ~5,5 min; no teclado, **T** avança um quarto de dia.
3. **Sem GPU** (CI, VM): `npm run perf:cpu:3d` (custo de JS por quadro 2D × 3D), `npm run parity:3d` (capturas lado a lado em `parity-out/`, ver [PARITY_3D](PARITY_3D.md)) e
   `npm run leak:3d` (vazamento ao atravessar o mapa). Os três usam `?render=2d`/padrão e o Playwright do ambiente.
4. **Física:** com o 3D o jogador não sobe em cubos sozinho; `&fisica=degrau` devolve a regra antiga para comparar.

## Testes no navegador
Playwright e Chromium já estão no ambiente (`require('playwright')`). Com `npm run dev` em segundo plano,
use `window.__game` (ex.: `__game.select(9)`, `__game.startAction()`, `__game.player`). Não encadeie
`pkill` com outros comandos (ver `CLAUDE.md`).
