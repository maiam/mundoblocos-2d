# Estado atual

_Atualizado em 2026-11-06 — v0.57.1 · jogo: **Orvalis** (`orvalis.pensamentos.online`)_

## Bolsa à direita e ficha de receita — v0.57.0
- Bolsa de 12 (4 × 3) na coluna da direita do cartão (`.hotbar-side`, com as profissões). Receitas: tocar abre a ficha
  (ingredientes tem/precisa, estação, destino, Confirmar/Cancelar) e a bolsa aparece ao lado (`BagPanel.peek`).
  Excesso de bolsa de salvamentos antigos cai no chão ao abrir. Descrições dos itens: próxima parte.

## Fome, comida e Cozinheiro — v0.56.0
- `Player.hunger` (`HUNGER` e `FOOD` em `world/progression.ts`), ligada por `WorldProfile.hunger` (só mundo principal);
  barra na HUD (`Hud.setHunger`). Comer: `ActionController.eatInstead` (alimento na mão e alvo onde não dá para
  plantar). Profissão `cook` com receitas que pedem estação (`Recipe.station` = Caldeirão a até `STATION_REACH` 3
  células; `Game.nearStation`). `SAVE_VERSION` 9 (`player.hunger`).

## Covil isolado e mundo de florestas — v0.55.0
- Covil das Aranhas isolado em `DUNGEON_ORIGIN`, entrada = caverna (`World.cave`, `DUNGEON_CAVE`) a ≥ 160 células do
  castelo; entrar/sair em `Game.updateInteriors`; escuridão fora do labirinto; minimapa do labirinto. ADR 0019.
- `pickBiome` só Campos e Sakura (mundo da Cidade 1 sem deserto). `SAVE_VERSION` 8, `PROTOCOL_VERSION` 4.

## Pano de Seda e contrato de ferramentas — v0.54.0
- Receita `silk-cloth` (10 sedas → `silk_cloth`); `tent` pede 1 pano + 10 tábuas + 4 presas.
- Ferramentas novas (5 níveis) **ainda não estão no jogo**: análise e contrato em `assets-src/ferramentas/` (ADR 0018).
  A ferramenta na mão segue pintada nas folhas da heroína; o chibi não tem ferramenta.

## Hortaliças — v0.53.0
- Culturas em tabela (`CROPS`/`CROP_KINDS` em `world/blocks.ts`): trigo (60–75), batata (150–165), tomate (170–185),
  cenoura (190–205). Itens `potato/tomato/carrot` plantam o 1º estágio (`ItemDef.plants`); `World.tick` usa
  `CROP_STAGE_SECONDS` por cultura. Folhas `crop-<nome>.webp` (`scripts/extract-crops.py`, 8×2 → 4×4) desenhadas por
  `loadCropSprites`. Ícones `icon-item-{apple,potato,tomato,carrot}` (`scripts/extract-items.py`). Fonte das
  hortaliças: 2 de cada no início, capim (12%) e a própria colheita. Comer: Fase P.

## Árvores que crescem, macieiras, vaca, galinha e cadeira — v0.52.0
- Pranchas de crescimento 4×2 (`scripts/extract-trees.py` → `tree-oak/apple/cactus.webp`): carvalho e macieira com
  estágios (`OAK_SAPLING/YOUNG/GROWING` → `OAK_TREE`; `APPLE_SAPLING/YOUNG` → `APPLE_TREE`) e variantes da adulta;
  cacto com 8 variantes. `TREE_NEXT` (blocks) + `World.tick` (~120 s por estágio). Macieira carregada: tocar colhe
  (`World.pick` → `APPLE_TREE_BARE`, maçãs voltam em ~150 s). Mudas saem de árvores adultas (50%) e vão em terra/grama.
- Gerador: `Biome.altTree` mistura macieiras nos Campos (1/6). Itens novos: Muda de Carvalho, Muda de Macieira, Maçã.
- `FarmAnimal` (`game/horse.ts`): cavalo, 2 vacas e 4 galinhas no campo do portão. Cadeira de Madeira por receita.
- Ações de rede `plant` (com `block`) e `pick`: `PROTOCOL_VERSION` 2. O crescimento roda em cada aparelho (como o
  trigo): numa sala, os estágios podem divergir entre jogadores até alguém editar a célula.

## Minimapa — v0.51.0
- Minimapa redondo (`render/minimap.ts`, cores em `render/mapColors.ts` lidas do `World`) no canto superior direito,
  raio de 36 blocos, norte para cima. Névoa por célula em `game/exploration.ts` (bits por chunk), revelada num raio
  de 14 ao mudar de célula e salva em `SaveData.explored` (`SAVE_VERSION` 7). Marcadores de cidade, dungeon
  descoberta, tenda e amigos. `WorldProfile.minimap` liga só no mundo principal. Mapa grande ainda não.

## Tela de entrada e montagem do personagem — v0.50.0
- O mundo principal abre no título **Orvalis** (`game/title.ts`) com o mundo em vitrine atrás (`GameOptions.showcase`):
  **Novo jogo** → montar o personagem (**Chibi** com cabelo/roupa/pernas/pés ou **Heroína**, prévia animada,
  Sortear, Nome) → mundo novo com seed aleatória; **Continuar** só aparece com jogo salvo. `?seed=`, `?personagem=` e
  o Santuário pulam a tela.
- Aparência em `Entities.look` → `SaveData.look` (`SAVE_VERSION` 6; antigos = heroína), limpa contra o manifesto ao
  abrir (`cleanLook`) e levada para Novo mundo, Recomeçar e salas. Chibi desenhado a ×0,94 (`MODULAR_FIT`) para ter a
  altura da heroína. **Ainda não**: aparência no multiplayer (os outros veem a heroína), ferramentas/ações no chibi,
  cadastro.

## Personagem modular (humano chibi) — 2026-11-05

- **Guarda-roupa v02, revisão 4** (`assets-src/personagens/CONTRATO.md`, ADR 0017): onze peças e treze folhas
  de caminhada (oito quadros × quatro direções). Adicionados colete verde, túnica azul, blusa lilás, calça ardósia,
  shorts vinho e bermuda verde. Quatro blusas × quatro peças de pernas = 16 combinações sobrepostas;
  25 incluindo as opções bege da base. Todas em `revisao`.
- **Revisão 4 (06/11):** corrigido o balanço dos braços na caminhada para a direita. Movimento contínuo nos oito
  quadros; recortes das quatro blusas e quatro peças de pernas ajustados para as mãos. Outras vistas, cabeça,
  cabelo e sapatos preservados. Comparação antes/depois em `previas/v02/direita-antes-depois.gif`.
- `export-personagem.py` valida as treze folhas e reexporta WebP + manifesto para `src/assets/` com prefixo `chibi-`.
  Fontes, histórico, máscaras e ORA da correção ficam em `_trabalho/v02/correcao-direita/`, fora do git.
  As 25 escolhas × 32 poses passam pela montagem de conferência; movimento e roupas continuam em revisão artística.
- v01 arquivado em `_arquivo/v01/` (só local, fora do git): caminhada 8×4 e repouso frontal 6×4, roupa verde embutida.
  Medido no mundo: cabe na altura da heroína (2,2 células, ~1,1 de largura); convertido pelo exportador, caminhada de
  5 partes ≈ 300 kB.
- **Teste no cenário (v0.48.0)**: `?personagem=chibi&tronco=…&pernas=…&pes=…&cabelo=…` troca a heroína do jogador
  solo pelo chibi (`render/modular.ts` + `modularCharacter.ts`, folhas `src/assets/chibi-*` do exportador). Só a
  caminhada; parado = quadro 0; ferramentas e golpes não aparecem no chibi. Sem o parâmetro, nada muda; as folhas
  ficam fora do orçamento de início (só carregam com o chibi). Desde a v0.50.0 a aparência é escolhida na tela de entrada e salva; multiplayer ainda não.

## Mundos
- **Mundo principal** (detalhado abaixo) e **Santuário Celestial da Deusa da Vida**: 10 chunks (5×2) de Nuvem
  Sólida, só a Deusa, só os 18 blocos celestiais para construir, sem ferramentas/cultivo/ovelhas. Escolhido por
  subdomínio `santuario.`, `?mundo=santuario` ou artefato próprio. Blocos celestiais com a arte final
  (prancha 3/4). A Deusa **flutua** (7 quadros por direção, balanço suave) em vez de caminhar. Ver `domains/worlds.md`.

## Mundo principal
- Gerado por seed (`?seed=`), em chunks 16×16 nos dois eixos, carregados sob demanda e descarregados quando
  longe (chunks editados ficam em memória).
- Vista superior inclinada (3/4): chão + cubos com topo e frente; árvores altas; ordenação por profundidade.
- **15 materiais** (pranchas 3/4 fornecidas): Terra, Terra com Grama, Terra Arada, Caminho de Terra, Areia, Pedra Bruta,
  Tora de Carvalho, Tábua de Carvalho e as variações de pedra (Irregular, Tijolo, Chão, Lisa, Polida, Rachada, Tijolo
  Rachado). A Terra com Grama tem 3 artes, sorteadas por célula. São os únicos blocos de construção; a Pedra Bruta é a pedra natural do mundo. Irregular, Tijolo e Chão de
  Pedra saem de receita (1 Pedra Bruta → 1); as outras 4 ainda não têm fonte no jogo (só pelo código/salvamento).
- Biomas (desde a v0.55.0, mundo só de florestas): Campos (carvalhos e macieiras), Bosque de Sakura (cerejeiras); as Dunas (cactos) não aparecem mais. Água, rios, praias, montanhas de
  pedra com 1–2 níveis, trilhas de caminho de terra, pedregulhos, capim e flores.
- **Cidade do Despertar** (`domains/town.md`): cidade fixa (igual em toda seed) de 164 × 132 blocos ao norte da
  origem — muralha com guaritas e portão único ao sul, castelo ao norte, labirinto de ruas, praças, Guilda,
  Hospedaria, Ferreiro, 3 lojas e ~90 casas (sem interiores ainda). **4 moradores** (loiro, castanho, prateado, ruivo) passeiam pelas ruas e praças, cada um com uma roupa sorteada pela seed entre 5 (roupas em camadas sobre o personagem de roupa branca), e o **ferreiro** (cabelo preto + roupa de ferreiro, visual único) atende dentro da Ferraria. **Interior da Ferraria** (ADR 0014): andar para cima diante da porta entra; o capacho sai. Tocar num morador mostra a fala dele. **16 expressões** em camada: cada morador tem uma de repouso e reage ao conversar. Arte fornecida: casas 5×5 em 3 cores
  (térreas e de 2 andares), lojas 5×5, ferreiro 8×5, guilda 9×9, castelo 26×17, guaritas 4×6, bancos, postes de luz
  (acendem à noite), arbustos, **hospedaria 9×5**, fonte, poço, barracas de frutas e barris; caixotes e placas ainda pintados em código. **Início e renascer sem
  tenda** na praça inicial. Área protegida: nada quebra nem é colocado; tocar numa construção mostra o nome.
- **Dungeon — Covil das Aranhas**: labirinto procedural (~100 × 72 blocos, muda com a seed) perto da cidade (nunca
  sobre ela, a estrada do portão ou o campo do rebanho), com uma única entrada voltada para o início, câmaras, becos e circuitos; câmara da Rainha no ponto mais fundo, com uma só
  passagem. Nada quebra nem é colocado lá dentro. Aranhas pequenas e grandes em quantidade proporcional ao
  labirinto (~38) + Aranha Gigante (chefe, 180 de vida); perseguem pelos corredores, **mordem** e nunca saem; derrotadas
  soltam seda/presas (Rainha: Coração da Rainha) e renascem com o tempo. Farol + seta indicam a entrada.
- **Vida e dano com números** (Fase P, entrega 1): heroína com 100 de vida (barra com número), ataque e defesa;
  dano = ataque + arma − defesa, ±10% e 5% de crítico; números de dano subindo na tela; regeneração fora de combate; derrotada, perde tudo menos as ferramentas e renasce
  na última tenda ou, sem tenda, na praça inicial da cidade.
  Ver `domains/dungeon.md`.
- **Água**: inquebrável; qualquer terra (Terra, Grama, Arada, Caminho), Pedra Bruta, Tora ou Tábua a substituem; buraco vizinho de água enche sozinho (animação) e enche os
  vizinhos em cadeia. Ver `domains/world.md`.
- Pilhas de até **3 cubos**; quebrar a célula vazia cava o chão (buraco que só um bloco novo preenche, virando piso).

## Personagem e controles
- Heroína com sprite em 4 direções, ~2,2 células; sobe 1 nível por vez e desce livre; colide com água, buracos,
  árvores e outras entidades.
- Câmera sem rotação, zoom automático, acompanhamento suave sem o balanço da caminhada.
- Celular: joystick (esquerda) + **botão de ação** (direita): toque usa o item selecionado no alvo à frente,
  segurar quebra (2 s com a mão/item, **1 s com ferramenta**). Alvo com cantoneiras quando parada. Mão vazia ao tocar de novo no item.
- **Tablet** (toque com lado menor ≥ 600 px): joystick + **botão de ação** + toque na tela também age como o clique
  (tocar usa, segurar quebra).
- Desktop: WASD/setas, Espaço = botão de ação, mouse (clique coloca, segurar quebra: 2 s mão, 1 s ferramenta), Q/E/roda = zoom.
- Sempre na horizontal: tela cheia + trava em paisagem quando o navegador permite; "Gire o aparelho" em retrato.
- Tela limpa: grade de **12** — 9 itens · Personagem (sem ação ainda) · Habilidades · Bolsa (começa com ferramentas
  1–5, semente 6, trigo 7); barra de vida
  só quando importa; menu ☰.

## Sistemas
- **Ferramentas** (espada, enxada, picareta, pá, machado): equipam e mudam o sprite. A **enxada** ara (animação própria) Terra/Terra
  com Grama → Terra Arada e, segurando, quebra só plantas (não madeira/árvore); não ataca; a **espada** golpeia (animação própria) e faz sumir animais à frente — não quebra
  blocos, itens nem elementos; o **machado** também golpeia e, segurando, corta só madeira/árvore/planta; a **pá**
  (animação de cavar) amassa Terra/Grama/Arada → Caminho de Terra e, segurando, cava só blocos macios (terra, areia…)
  e destrói plantas **sem drop**; não ataca; a **picareta** (animação de minerar), segurando, quebra qualquer
  bloco e plantas (sem drop), menos madeira/árvore; não ataca.
- **Porta de Carvalho**: colocada no chão **entre dois batentes de madeira ou pedra** (qualquer madeira ou qualquer uma das 8 pedras à esquerda e à
  direita), 3 blocos de altura; toque abre/fecha com animação (qualquer item em
  mãos); fechada bloqueia, aberta deixa passar; não fecha com alguém dentro. Uma só orientação (de frente).
- **Habilidades** (Construtor): receitas de Tábua (1 tora → 2), Porta (4 tábuas), Tenda (10 sedas + 10 tábuas + 4
  presas), **Fogueira** (3 toras), **Caldeirão de Pedra** (3 pedras + 1 fogueira), **Forno de Pedra** (6 pedras; os três
  só se colocam por enquanto, cozinhar vem com a comida), Baú e Pedra Irregular / Tijolo de Pedra / Chão de Pedra (1 Pedra Bruta → 1) — tocar cria. **Baú de Carvalho** (8 tábuas; 27 espaços). **Tenda** (2×2) = ponto de
  renascer, com aviso na tela; derrubar a última volta ao início. Bolsa com 27 itens (9 na mão + 18).
- **Cultivo**: semente **só na Terra Arada**; cresce em 16 estágios (~1,5 min, arte nova sem monte de terra);
  colheita solta trigo + sementes.
- **Materiais coletados** (mundo principal): quebrar solta o bloco (árvore → toras), colocar gasta. Pilhas sem
  limite; **bolsa** de 12 espaços (4 × 3 à direita, desde v0.57.0; com a mão, 21), troca para a grade; tipo novo só entra se houver lugar. Ao cair, perde tudo menos as ferramentas. Santuário segue infinito.
- **Ovelhas**: rebanho no campo, do lado de fora do portão da cidade; pastam, comem trigo, namoram e têm filhotes que crescem (máx. 16).
- **Cavalo, vacas e galinhas**: no mesmo campo; só passeiam (sem montaria, leite nem ovos ainda).
- Ciclo dia/noite (8 min), sombras de nuvens, partículas por bioma.

## Salvamento
- **Automático no navegador** (a cada 10 s, ao esconder/sair): mapa editado, plantações, heroína, inventário,
  ovelhas, aranhas e hora do dia; um salvamento por mundo e seed. Menu ☰: continuar, novo mundo, recomeçar (confirmação tocando de novo no botão; aviso com a semente nova).
- **Jogar com amigos** (ADR 0016): no menu ☰, criar sala ou entrar com código de convite (até 4, convidados só com
  nome). Os outros aparecem com o nome em cima e as edições do mapa valem para todos; na sala nada é salvo no aparelho.
  Monstros, animais, moradores e itens caídos ainda são de cada jogador.
  Ver `domains/save.md`.

## Limitações conhecidas
- Salvamento só neste navegador/aparelho (nuvem depende do backend do Orvalis, ADR 0015); itens caídos no chão não são salvos.
- Animais atingidos pela espada só somem (sem animação de morte nem drops). Corações da HUD ainda vetoriais
  (provisórios); aranhas só com arte de frente. Espólios ainda sem uso (receitas).
- Ovelhas e o cavalo só nascem no campo ao sul do portão; não há animais em outros chunks. Moradores, cavalo e
  ovelhas não são salvos (renascem iguais pela seed).
- Moradores só dizem uma fala (sem diálogo, loja nem missões); só a Ferraria tem interior; tocar nas outras construções mostra o nome.
- Santuário: subdomínio real ainda não hospedado (só artefato e `?mundo=`); chão de nuvem mostra leve repetição diagonal.
- Topo dos cubos esticado ~1,6× na vertical (arte desenhada achatada). Texturas do chão sempre na direção desenhada:
  materiais com uma só arte repetem o mesmo padrão (variedade vem de variações enviadas).
- iPhone/Safari no navegador não permite tela cheia nem trava de orientação (vale a camada de rotação ou a
  instalação na tela inicial); dentro do Artifact a tela cheia pode ser recusada.
- Sem pulo, queda com dano ou transições suaves entre tipos de chão. Água parada (sem correnteza nem nado); só enche
  buracos, não se espalha sobre terra firme.

## Qualidade e desempenho
- 135 testes (Vitest) passando (05/11/2026); typecheck limpo; build com 1 aviso intencional de tamanho do bundle.
- Sessão automatizada (v0.36.1: 3 seeds, desktop e celular, 160 ações aleatórias cada, entrando na cidade e na
  dungeon) sem erros.
- Geração de chunk ~0,08 ms; render ~0,4 ms/quadro (média, Chromium headless, inclusive dentro do labirinto).
- Artefatos com **só a arte do próprio mundo** (ADR 0010) e **imagens em arquivos separados** (ADR 0013): principal =
  página de 205 kB + 75 imagens (2,8 MB); o jogo espera ~2,5 MB para começar (orçamento < 3 MB) e a arte da dungeon
  chega em segundo plano. Santuário ~0,7 MB.
- **No ar em `https://orvalis.pensamentos.online`** (Hostinger, publicação pelo GitHub a cada merge em `main`); também
  publicados como Artifacts (versão de teste). Ver `OPERATIONS.md`.
- Dependências: Vite 7.3, Vitest 5.1, `npm audit` sem vulnerabilidades.
