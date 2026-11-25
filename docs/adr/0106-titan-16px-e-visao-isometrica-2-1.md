# ADR 0106 — Titã: mundo renderizado a 16 px por face e vista isométrica 2:1 (v0.172.0)

**Status:** Aceita. Pedido do dono do produto (25/11/2026), para o **motor** `src/titan/` (vale para `?mundo=titan` e `?mundo=orvalis3d`); o mundo 2.5D do Orvalis não muda.

## Regras novas
1. **O mundo é renderizado a 16 px por face** (regra do Minecraft Java). A **arte-fonte pode ser maior** (a do Titã tem 32 px; a do Orvalis, até 2048 px) e é reduzida por média de área ao montar o atlas. Isto vale para o terreno e para a água; modelos 3D (mesa, baú, porta, escada, cama, braseiro, Marco, Painel, lanterna, Farejador) e itens seguem com a arte que têm (pendência registrada).
2. **Vista isométrica 2:1** alternável por um botão no canto superior direito do menu (**Visão: 1ª pessoa / isométrica**, tecla **V**; a escolha fica em `localStorage`; `?visao=iso|pessoa` para teste). Na isométrica os blocos têm **8 × 8 px de textura e 1 texel = 1 pixel de tela**.

## Decisões do dono do produto (perguntas respondidas)
- **Escala:** aresta = 8 px de tela. Implementação: câmera **ortográfica a 30° de elevação** (`ISO_PITCH`; é a elevação em que o topo do bloco é um losango **2:1** exato) com `ISO_PX_PER_BLOCK` = 16/√2 px por bloco: o topo mede **16 × 8 px**, cada aresta ~8 px de tela (8 texels), a aresta vertical ~9,8 px. O buffer tem **1 pixel por pixel CSS** (`setPixelRatio(1)`) e a tela o amplia sem suavização (`image-rendering: pixelated`): o bloco tem o mesmo tamanho em CSS px em qualquer densidade. A câmera se prende à grade de pixels (`snap`) para a textura não tremer ao andar.
- **Rotação:** 4 vistas de 90° (45°, 135°, 225°, 315°), com transição suave de ~0,2 s; botões ⟲ ⟳ ao lado do botão de vista e teclas Z/X. Só nesses ângulos o losango é 2:1 exato. O andar é relativo à câmera (W = para cima na tela).
- **Personagem:** boneco provisório (0,6 × 1,8 m: corpo, cabeça, nariz na frente; olha para onde anda).
- **Oclusão:** **silhueta atrás do terreno** (o mesmo boneco em azul translúcido, desenhado só onde o teste de profundidade falha: `GreaterDepth`, `renderOrder` alto). Sem corte por altura nesta fatia.

## Implementação
- **Atlas:** `tiles.json` ganhou `tile: 16`, `pad: 2` e `iso: { tile: 8, pad: 1 }` — a **mesma proporção** de borda, então os UVs do `mesher` (`tileUV`) valem para os dois atlas e a vista isométrica só troca a textura (`material.map`, dois objetos `THREE.Texture`: mudar o tamanho da imagem de uma textura imutável do WebGL2 não é seguro). `scripts/make-titan-atlas32.py` (o nome ficou: o "32" é a fonte) gera `titan-atlas-16px.webp` e `titan-atlas-8px.webp`; água em `titan-lago-16/8px.webp` e `orvalis-agua-16/8px.webp` (`make-titan-arte32.py`, `make-orvalis-voxel-arte.py`). Os `*-32px.webp` de terreno e água saíram; o atlas de **itens** segue 4 × 13 de 32 px.
- **`titan/iso.ts` (puro):** `isoCamera` (posição, direção, direita/cima, meia largura/altura, com `snap`), `isoRay` (raio paralelo ao olhar que passa pelo ponto da tela; começa a `ISO_RAY_LEAD` = 40 blocos do plano do jogador), giro em quartos (`isoYawOf`, `isoQuarterOf`, `stepIsoYaw`), `ISO_REACH` = 6. O renderer e o jogo usam **a mesma** câmera, para o clique cair no bloco que se vê.
- **`TitanRenderer`:** `setViewMode('fp'|'iso')`, `OrthographicCamera`, `setAvatar`, `screenOf` (projeção para a tela, para testes); na isométrica somem cúpula do céu, sol, névoa de distância, mergulho e a mão (o fundo é a cor do céu).
- **`titanGame.ts`:** botões e tecla; `iso` torna `fingerMode()` verdadeiro (a ação é no ponto do mouse ou do dedo, sem mira central); o cursor fica livre (sem *pointer lock*); `look()` não gira; `computeAim` usa `isoRay` e só aceita alvo a até `ISO_REACH` dos olhos (animais: `ATTACK_REACH`); `session.yaw` = giro da câmera isométrica a cada quadro (o andar e a orientação de blocos colocados seguem dele). Gancho de dev `window.__titan = { session, view }`.

## Consequências e pendências
- Verificado em navegador (Chromium): vista, rotação, andar, quebrar e colocar pelo mouse, silhueta atrás de árvore, volta para a primeira pessoa. **Não verificado em aparelho de toque.**
- Pendentes: modelos 3D e itens ainda com arte de resolução própria (mistura de densidades na isométrica); corte por altura/transparência do terreno; fundo além da região (hoje a cor do céu, sem mar até o horizonte); céu, sol e estrelas na isométrica; arrastar para girar; sombra do boneco e arte do personagem; salvar a vista de 90° no save; sala online (`TitanClient`) na isométrica não foi testada.
- O Orvalis 2.5D (`?seed=`) continua intocado.
