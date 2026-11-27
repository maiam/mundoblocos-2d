# Operações

O Orvalis 2D/2.5D e o Santuário foram removidos na v0.183.0 (ADR 0115); as operações deles (sprites, paredes, dungeon, interiores…) estão em [`archive/2d/OPERATIONS.md`](archive/2d/OPERATIONS.md).

## Requisitos
Node 22+, npm. Para o pipeline de arte: Python 3 com Pillow (`pip3 install pillow`; WebP) e numpy. Sem variáveis de ambiente (não há `env.example`; `VITE_WORLD` fixa o mundo de um artefato). Fonte Nunito via Google Fonts, com fallback `system-ui`.

## Comandos
| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor local em `http://localhost:5173` (Orvalis 3D; `?mundo=titan` para o Titã; `?seed=`); expõe `window.__titan` |
| `npm test` | Testes Vitest (`src/**/*.test.ts`) |
| `npx tsc --noEmit` | Typecheck |
| `npm run build` | Typecheck + `dist/` estático (`base: './'`) |
| `npm run build:artifact` | Build do Orvalis 3D (`VITE_WORLD=orvalis3d`) → `artifact/mundoblocos.html` + imagens em `artifact/mundoblocos-assets/` + `mundoblocos-files.json` |
| `npm run build:net` | Pacote do servidor (`dist-net/orvalis-net.cjs`: sala do Titã); o servidor copia com `npm run sync-net` |
| `npm run texturas` | Regenera tiles, ícones, atlas e máscaras do voxel (`make-orvalis-*`, `make-titan-atlas32.py`, `make-titan-arte32.py`) |
| `python3 scripts/optimize-assets.py` | SEMPRE após gerar sprites/atlas (PNG → WebP q84) |

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
| Variáveis de ambiente | nenhuma — **não** defina `VITE_WORLD` (sem ela, o site escolhe pelo endereço: o padrão é o Orvalis 3D e o Titã só abre com `?mundo=titan`, ADR 0115) |

**No ar desde 2026-11-03** (conferido de fora: HTTPS, LiteSpeed; `index.html` com `no-cache`, `assets/` com cache de
1 ano, manifesto como `application/manifest+json`, `.htaccess` inacessível (403); jogo e celular sem erros).
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
5. Conferir: abrir no celular (deitado), jogar, recarregar (continua salvo), instalar na tela inicial.

**Atualizar**: `npm run pack:site` → no Gerenciador de Arquivos, apagar a pasta `assets/` e o `index.html` antigos →
enviar e extrair o zip novo. (Arquivos velhos em `assets/` não atrapalham, só ocupam espaço.)

**Testar antes de enviar**: `cd dist && python3 -m http.server` e abrir `http://localhost:8000` (e `?mundo=titan`).

## Medir o Titã em aparelho real (v0.95.1)
- **Vista isométrica (v0.172.0, ADR 0106):** botão **Visão** no menu, tecla **V**, ou `?visao=iso` / `?visao=pessoa` na URL (`&cena=texturas` mostra a vitrine em isométrica); ⟲ ⟳ ou Z / X giram a câmera; `window.__titan = { session, view }` e `view.screenOf(x, y, z)` (só no `npm run dev`) servem a testes de navegador. O atlas de terreno é gerado a 16 px e 8 px por `scripts/make-titan-atlas32.py` (`npm run texturas`).
- **Testar texturas (dev, v0.170.0):** `npm run dev` e abrir `?mundo=orvalis3d&cena=texturas` (ou `?mundo=titan&cena=texturas`). Vitrine plana com cada bloco em cubo, massa 3 × 3 × 3 e parede 3 × 3 (fila 1 = Orvalis, fila 2 = Titã; a legenda na tela lista a ordem e o tile de cada um) e uma piscina de água; hora fixa à tarde (`&hora=noite`); nada é gravado. Pré-requisito: `pip3 install pillow` (em Mac com Python "externally managed": `python3 -m venv .venv && . .venv/bin/activate && pip install pillow`). Ciclo: editar o PNG em `assets-src/orvalis-voxel/texturas32/orvalis/` (32 px ou maior, quadrado: 64, 512, 2048…; é reduzido a 32 px ao montar o atlas e o arquivo original não muda) (a fonte; blocos do Titã em `assets-src/titan/texturas32/`) ou a água em `assets-src/orvalis-voxel/agua/agua_32px.png`, rodar `npm run texturas` (refaz ícones, água e os dois atlas **sem sobrescrever os PNGs**; `python3 scripts/make-orvalis-voxel-arte.py --force` volta tudo ao que sai dos Materiais V2) e recarregar a página (o Vite deve recarregar sozinho; se não, F5). Só em desenvolvimento (`import.meta.env.DEV`).
- `?mundo=titan&fps=1`: o painel de desempenho de sempre (FPS, 5% piores, GPU, memória) **mais o tempo de cada etapa** do Titã em ms (média/p95): `luz` (recálculo do mapa de luz), `malha` (CPU de uma seção), `geo` (criar a geometria), `quadro+malha` (JS do desenho no quadro em que há malha nova, onde entra o envio à GPU). **Tocar no painel abre o relatório na tela** (v0.95.3; poucas linhas em fonte monoespaçada, cabem numa tela de celular em paisagem: FPS estável, 5% piores, quadros lentos, GPU, memória, tabela por etapa, aparelho e URL) para **tirar print**, com os botões **Atualizar**, **Copiar JSON** (sem permissão de área de transferência, o JSON aparece selecionado) e **Fechar**. Os primeiros 8 s de sessão não entram no "FPS estável": jogue uns 30 s antes de abrir. O relatório traz `extra.stages` (`light`, `mesh`, `geom`, `buildFrame` = malha + geometria de um quadro, `draw`, `drawAfterBuild`) com `n`, `avg`, `p95` e `max`, e `extra.counters` (`sections` = seções refeitas, `lanterns`).
- `?mundo=titan&cena=lanternas&n=12` (1–64): **cena de desenvolvimento** com `n` lanternas e uma parede de areia ao lado de cada uma, seed 42 (ou `&seed=`); **nada é gravado** (armazenamento em memória, o save real não é tocado) e o botão **"Editar sem parar"** (canto superior direito) coloca e retira um bloco ao lado das lanternas a cada 120 ms para estressar luz e malha. Já liga o painel; o dia (20 min) corre normalmente e `&hora=manha|tarde|noite` congela a visualização. Existe em qualquer build (para testar no celular pela prévia do PR). A partida normal só tem 1 cápsula, por isso a cena.
- Como ler: o gargalo é a etapa com p95 acima de ~4 ms por quadro ou `buildFrame` acima de ~16 ms nos quadros de edição. `draw` e `quadro+malha` são só o JS do desenho; o custo real da GPU aparece no FPS.

## Rachaduras do Titã (v0.97.0)
`python3 scripts/make-titan-cracks.py [--preview prancha.png]` gera `src/assets/titan-cracks-16px.webp` (10 estágios de 16 × 16 lado a lado, WebP **sem perdas**: não passa pelo `optimize-assets.py`, que comprimiria com perdas). A prévia mostra os estágios sobre areia, gelo e rocha escura. Trocar a arte = substituir o arquivo mantendo 160 × 16.

`python3 -I scripts/extract-titan-lantern.py` converte o pacote da Lanterna da Margem (`assets-src/titan/lanterna/Lanterna_da_Margem.glb`, ADR 0043) em `src/assets/titan-lantern.json` (dois lotes: estrutura e núcleo âmbar) e `titan-lantern-atlas.webp` (32 × 32, sem perdas, fora do `optimize-assets.py`). O script confere 312 triângulos, 0,375 × 0,625 × 0,375 m e pivô na base; arte nova = trocar o GLB e rodar de novo.

`python3 -I scripts/make-orvalis-agua.py` (ADR 0132: 8 quadros de `agua/fonte/` → `orvalis-agua-16px.webp` e `-8px.webp`; depois `optimize-assets.py`); `python3 scripts/make-orvalis-mureta.py` (ADR 0110: tira topo | face da Mureta de Pedra a partir de `texturas32/mureta-pedra/`; o modelo sai de `render/muretaModel.ts`; roda no `npm run texturas`) e `python3 scripts/make-orvalis-degrau.py` (ADR 0109: tira de 3 tiles + modelo do Degrau de Pedra a partir de `texturas32/degrau-pedra/`; roda no `npm run texturas`) e `python3 scripts/make-orvalis-voxel-arte.py` (ADR 0105: só cria o que falta, a partir dos Materiais V2 de `assets-src/materiais/` gera os 15 tiles `orvalis/…` de 32 px em `assets-src/orvalis-voxel/texturas32/`, os 10 ícones de bloco em `assets-src/orvalis-voxel/icones32/` e `src/assets/orvalis-agua-32px.webp`; folhas procedurais provisórias). **Depois, nesta ordem:** `make-titan-atlas32.py` (atlas de terreno com os tiles do Orvalis no fim) e `make-titan-arte32.py` (atlas de itens 4 × 13 com os itens 42–51). Abrir: `?mundo=orvalis3d&seed=42` (`&hora=manha|tarde|crepusculo|noite` como no Titã).
`python3 -I scripts/make-titan-veins.py [--preview prancha.png]` acrescenta (ou regrava) os tiles 8 e 9 (veio de rocha e de gelo) no atlas `src/assets/titan-atlas-16px.webp` (80 × 60, WebP **sem perdas**, fora do `optimize-assets.py`), partindo dos tiles 4 e 5; repetível. Os tiles 0–7 não são tocados.

`python3 -I scripts/make-titan-porta.py` (ADR 0102: a partir de `assets-src/titan/junco/Porta-De-Junco_448x600.png` gera `src/assets/titan-porta.webp` e o ícone de 32 px; depois `make-titan-arte32.py` e `make-titan-item-masks.py`; o atlas de itens tem 4 × 11) e `python3 -I scripts/make-titan-junco.py` (ADR 0100: a partir de `assets-src/titan/junco/*_512.png` gera as texturas `21-bloco-de-junco` e `22-laje-de-junco`, o tile de 64 px dos modelos e os ícones de 32 px; depois `make-titan-atlas32.py`, `make-titan-arte32.py` e `make-titan-item-masks.py`) e `python3 -I scripts/make-titan-junco-modelos.py` (ADR 0101: `titan-degrau.json` e `titan-cadeira.json`, caixas com UV em metros). `python3 -I scripts/make-titan-sprites16.py` (ADR 0097: reduz as ilustrações de `assets-src/titan/sprites16/` ao 16 × 16 em `assets-src/titan/arte16/` e atualiza `itens.json`; depois `make-titan-arte32.py` e `make-titan-item-masks.py`; arma, ferramenta e item novos entram aqui). Obsoletos e removidos: `export-titan-adaga.py`, `export-titan-picareta.py`, `extract-titan-balde.py`, `make-titan-balde-icone.py`. (Texto antigo, só histórico:) `python3 -I scripts/extract-titan-balde.py` (precisa de `pip install bpy`; converte os dois GLB de jogo do Balde de Cobre, ADR 0095, nas malhas `titan-balde.json` e `titan-balde-cheio.json` com pivô no topo e no atlas de 256 × 320 px). `python3 -I scripts/extract-titan-bau.py` agora gera corpo (`titan-bau.json`) e tampa com a dobradiça (`titan-bau-tampa.json`), ADR 0093. `python3 -I scripts/extract-titan-braseiro.py` (precisa de `pip install bpy`; converte os dois GLB de jogo do Braseiro de Rocha, ADR 0092, em `titan-braseiro.json`, `titan-braseiro-aceso.json` e o atlas de 256 × 320 px; sem decimar). `python3 -I scripts/make-titan-balde-icone.py` (reduz a arte 2D do Balde de Cobre, vazio e cheio, a ícones de 32 px; ADR 0091; depois `make-titan-arte32.py` e `make-titan-item-masks.py`). `python3 -I scripts/extract-titan-cama.py` (precisa de `pip install bpy`; reduz o GLB de jogo da Cama de Junco, ADR 0090, a `titan-cama.json` — pé na origem e cabeceira em +z — e ao atlas de 256 px; o ícone sai de `make-titan-modelo-icone.py cama`). `python3 -I scripts/extract-titan-bau.py` (precisa de `pip install bpy`; reduz o GLB de jogo do Baú de Rocha e Junco, ADR 0089, a `titan-bau.json` e ao atlas de 256 px; o ícone sai de `make-titan-modelo-icone.py bau`). `python3 -I scripts/extract-titan-escada.py` (precisa de `pip install bpy`; reduz o GLB de jogo da Escada de Junco, ADR 0088, a `titan-escada.json` e ao atlas de 256 px) e `python3 -I scripts/make-titan-modelo-icone.py` (ícone provisório; depois `make-titan-arte32.py` e `make-titan-item-masks.py`). `python3 -I scripts/make-titan-item-masks.py` (máscaras de pixels dos ícones, `titan/itemMasks.json`, ADR 0087: rode **depois** de `make-titan-arte32.py` sempre que um ícone mudar). `python3 -I scripts/make-titan-esteira-icone.py` (ícone provisório da Esteira de Junco, item 31, ADR 0085; depois `make-titan-arte32.py` e, para os tiles novos, `make-titan-atlas32.py`). `python3 -I scripts/make-titan-noz-torrada.py` (ícone provisório da Noz Torrada, item 30, ADR 0084; depois `make-titan-arte32.py`). `python3 -I scripts/make-titan-cultivo32.py` (atlas de cultivo do junco de 128 × 32, ADR 0083, a partir de `assets-src/titan/cultivo/junco/`). `python3 -I scripts/make-titan-ambar.py` (arte provisória do Âmbar, ADR 0073: amplia o atlas de terreno de 80 × 80 para 80 × 100 e grava os tiles 16 e 17 e o ícone do bloco; rode depois de `make-titan-braseiro.py` e antes de `make-titan-arte32.py`, que monta o atlas de itens com o id 29). `python3 -I scripts/make-titan-atlas32.py` monta o atlas de terreno `src/assets/titan-atlas-32px.webp` (288 × 216, 41 tiles de 32 px com 2 px de borda) a partir de `assets-src/titan/texturas32/02-Texturas-PNG/` e da ordem em `src/titan/tiles.json` (ADR 0079); os scripts `make-titan-veins/veio-cobre/braseiro/ambar.py` editavam o atlas de 16 px legado e ficam só como histórico. `python3 scripts/export-titan-picareta.py --glb Picareta_de_Rocha.glb` (requer `pip install bpy` e Pillow; gera `src/assets/titan-picareta-rocha.glb`, 325 KB, só a malha e o BaseColor 1024 px em WebP; ADR 0078). `python3 scripts/export-titan-adaga.py --blend Adaga_de_Rocha_Rig.blend --base Adaga_BaseColor_4K.png` (requer `pip install bpy` e Pillow; fontes no Drive, não vão ao repositório) gera `src/assets/titan-adaga-rocha.glb` (338 KB: 3 peças, 6.272 triângulos, BaseColor 1024 px em WebP; limite de 2 MB, ADR 0071). `python3 -I scripts/extract-titan-margem.py` converte os GLB low-poly do Marco de Margem e do Painel de Junco (`assets-src/titan/margem/`) em `titan-marco.json`, `titan-painel.json` e `titan-margem-atlas.webp` (ADR 0058). `python3 -I scripts/make-titan-arte32.py` gera o atlas de itens de 128 × 128 (arte de 32 px de `assets-src/titan/arte32/` para todos os itens; só a cápsula legada vem da base de 16 px ampliada 2×) e o atlas do junco de 128 × 32 (ADR 0053; rode depois de `make-titan-fabricacao.py`). `python3 -I scripts/make-titan-fabricacao.py` gera, a partir de `assets-src/titan/fabricacao/` (pacote de arte da mesa e atlas 80 × 40), os sprites de item (atlas da hotbar 64 × 64: 8 = mesa, 9 = lente, 10 = brasa, 11 = junco, 12 = laje; a ilustração da laje está em `assets-src/titan/fabricacao/Laje_de_Rocha.png`), o tile 10 do terreno (depósito de brasa) e `src/assets/titan-reed-16px.webp` (junco), todos WebP **sem perdas**; repetível. `python3 -I scripts/extract-titan-workbench.py` converte o GLB da Mesa de Trabalho em `src/assets/titan-workbench.json` + `titan-workbench-atlas.webp` (confere 96 triângulos, 1 × 1 × 1 e pivô na base).
`python3 -I scripts/extract-titan-noz.py` converte o GLB da planta da Noz de Duna (`assets-src/titan/noz/`, 3.008 triângulos) em `titan-noz-planta.json` (sem frutos), `titan-noz-frutos.json` e `titan-noz-atlas.webp`; `python3 -I scripts/make-titan-noz-icone.py` desenha o ícone provisório de 32 px (depois `make-titan-arte32.py`, que o põe na célula 16 do atlas de itens). ADR 0060.
`python3 -I scripts/extract-titan-farejador.py` converte o GLB do Farejador de Duna (`assets-src/titan/farejador/`, 3.538 triângulos) em `titan-farejador.json` (7 partes com pivô) e `titan-farejador-atlas.webp` (224 × 36: atlas do pacote + 4 colunas de cor sólida). ADR 0061.
`python3 -I scripts/extract-titan-farejador-rig.py` funde as 81 malhas skinadas do `Farejador_de_Duna_Rig.glb` (`assets-src/titan/farejador/`) numa só e reduz a Base Color para 1024² JPEG, gerando `src/assets/titan-farejador-rig.glb` (1,2 MB). ADR 0064.
`python3 -I scripts/make-titan-icones-conceito.py` gera os ícones provisórios de 32 px dos itens do pacote "O que a duna guarda" (de `assets-src/titan/conceito/` para `assets-src/titan/arte32/`), `python3 -I scripts/make-titan-veio-cobre.py` grava o tile 11 do atlas de terreno (veio de cobre) e `make-titan-arte32.py` monta o atlas de itens de 128 × 256 (4 × 8). ADR 0063.
`python3 -I scripts/make-titan-braseiro.py` estende o atlas de terreno para 80 × 80 e grava os tiles 12–14 (braseiro: lateral, topo apagado, topo aceso). ADR 0065.

`python3 -I scripts/make-titan-basalt.py [--preview prancha.png]` gera o ladrilho de basalto da interface (`src/assets/titan-basalt-32px.webp`, 32 × 32 sem emenda, WebP **sem perdas**, determinístico). Ele entra nos painéis pela variável CSS `--basalt`.

## Testes no navegador
Playwright e Chromium já estão no ambiente (`require('playwright')`). Com `npm run dev` em segundo plano,
use `window.__game` (ex.: `__game.select(9)`, `__game.startAction()`, `__game.player`). Não encadeie
`pkill` com outros comandos (ver `CLAUDE.md`).

`python3 -I scripts/make-orvalis-fazenda.py` (Pillow) converte as 4 texturas dos animais de fazenda (`assets-src/orvalis-voxel/mobs/*_uv_64x64.png`) em `src/assets/orvalis-fazenda-*.webp`, extrai `fazenda-uv.json` para `src/render/art/fazenda-modelos.json` (os ícones do espólio vêm do Drive e ficam em `assets-src/titan/arte16/`, listados em `itens.json`); depois rode `make-titan-arte32.py` (atlas de itens 4 × 25) e `make-titan-item-masks.py` (ADR 0124).
