# Estado atual

_Atualizado em 2026-11-07 — v0.76.0 · jogo: **Orvalis** (`orvalis.pensamentos.online`)_

## Herói redesenhado — v0.76.0
- 11 folhas novas em `assets-src/hero` (caminhada, caminhada com as 5 ferramentas, 5 golpes); `hero-<ferramenta>` deixa
  de apontar para a caminhada sem ferramenta. Fileiras: golpes e caminhada base já canônicas; espada, machado e enxada
  `0,3,1,2`; picareta e pá `0,1,3,2`; enxada (caminhada) e pá (golpe) com `--respace 40`. Altura pelo desenho (/298).

## Golpes do Hood — v0.75.0
- `hood-<ferramenta>-attack` com folhas próprias (`assets-src/hood/hood-*-attack-sheet.png`, já na ordem frente,
  esquerda, direita, costas; picareta com `--respace 40`). Altura pelo desenho (298–332 px contra 292 da caminhada).

## Animais seguem quem alimenta; leite, ovo, queijo e torta — v0.74.0
- `Breeder.feed(by)` guarda `leader`; apaixonado e sem par → `followLeader` (passo comum `steerTo`, o mesmo do namoro);
  fim do coração → `homeX/Y` = onde está. `ANIMAL_PRODUCE` (vaca = leite, galinha = ovo) em `world/items.ts`: solto no
  `ActionController` (sozinho) e no `Room.handle('feed')` (sala, item compartilhado).
- Itens `milk`, `egg`, `cheese`, `apple_pie` (ícones em `assets-src/items`); `FOOD`: leite 10, queijo 25, torta 60;
  receitas `cheese` (Caldeirão) e `apple-pie` (Forno de Pedra). Protocolo 16.
- **Orçamento do início: ~2004 kB** (era ~3062 kB e os ícones novos estouravam): `SpriteSheet.request` — folha de
  personagem/monstro só baixa quando o ator aparece; com ferramenta ainda baixando, usa a folha base do personagem.

## Animais da sala salvos — v0.73.0
- `RoomSnapshot` v3 ganhou `animals` (`Entities.saveAnimals`: espécie, posição, filhote, idade, casa); `restore`
  aceita v1–v3 e, com a lista, troca os animais da seed pelos guardados (`Entities.restoreAnimals`, item malformado
  ignorado, limite por espécie, célula sem chão → andável mais perto). Com gente na sala, `dirty` a cada passo (grava a
  cada 15 s). Monstros não são salvos. Jogo sozinho continua sem salvar animais.

## Ferramenta e golpe dos outros na sala — v0.72.0
- `PlayerState` ganhou `tool` (ferramenta na mão) e `swing` (golpes começados, `Player.swings`); `parseState` só aceita
  ferramenta conhecida. `RemotePlayers` toca o golpe localmente quando `swing` muda (mesma duração e quadros do
  jogador local) e o desenho sai de `heroActorKind` (função comum com `Entities.actors`). Protocolo 15.

## Personagem Hood — v0.71.0
- `HeroBody` = `heroine` | `hero` | `hood`; `HERO_NAMES` dá o nome dos botões da tela de personagem (gerados de
  `HERO_BODIES`). Atores `hood`, `hood-<ferramenta>`; `hood-<ferramenta>-attack` = caminhada com a ferramenta.
- Arte em `assets-src/hood` (6 folhas, ~0,6 MB em WebP, fora do orçamento de início como as do Herói). Pá espelhada
  para o lado direito (folha veio com os dois lados para a esquerda).
- `parseAppearance` aceita `hood` → protocolo 14 (servidor antigo trocaria por Heroína).

## Sala compartilhada, Etapa 3: bichos da sala — v0.70.0 (ADR 0021)
- `Room` tem `Entities(null)` com os jogadores como `avatars` (`Player` na posição do `state`); `spawnWildlife` (campo +
  covil, pela seed) e chunks carregados em volta (`loadAround`). `tick` ~10×/s: bichos em passos de 0,1 s, plantas a
  cada 1 s, `mobs` por jogador (raio 22, `MobState`). `strike` → `strikeFrom` (+ `hits`, `drops` do espólio); `feed` →
  `fed`; `onBite` → `bite` só ao mordido.
- Aparelho na sala: `Entities.remote` (sem simulação de animais/monstros), `CreatureMirror` (objetos espelhados,
  suavizados; mortes em `dying`, coraçõezinhos em `Entities.extra`); golpe → `net.strike`; comida →
  `ActionController.onFeed` → `net.feed`; mordida → `Entities.biteFrom`.
- Moradores seguem locais. Monstros não vão para o disco (animais desde a v0.73.0). Protocolo 13; servidor 0.14.0 (`TICK_MS` = 100).
- Conferido no navegador com servidor local e dois jogadores: ovelhas nas mesmas posições, comida, mordida, golpe com
  morte, números e espólio para os dois.

## Paredes de materiais — v0.69.0
- 16 paredes: `WALL_MATERIALS` (8 pedras + Terra, Grama, Arada, Batida, Areia, Pedra Bruta de novo — "Pedra com Musgo" —,
  Tronco, Tábuas), ids 210 … 225. A definição herda `organic`/`soft` do material (machado/pá/picareta como o bloco).
- A tira `walls.webp` (16 colunas, as de material achatadas para a altura das de pedra) carrega em segundo plano
  (`loadWallArt` → `addWallTextures`); os ícones ficam no início. Início ~3056 kB (igual ao da v0.68.0). Protocolo 12.
- Prancha de materiais sem transparência: `extract-walls.py` recorta pelo contorno escuro de cada bloco.

## Paredes de pedra — v0.68.0
- `WALL_0` (210) … 217, forma `wall` (sólida, não é cubo: `standHeight` null, nada empilha), na ordem de `WALL_STONES`;
  `isWall`; receitas `wall-<i>` (3 blocos da pedra). Render: `wallTextures` (tira `walls.webp`, 1 célula de largura,
  base no pé) e `Renderer.drawWall` (sem o contorno do lado que encosta em outra parede). Protocolo 11.
- **Orçamento do início: ~3057 kB de 3072 kB** (tira das paredes em 96 px para caber). Próxima arte do início deve ir
  para segundo plano (ex.: folhas da heroína com ferramenta ao equipar, paredes/cercas sob demanda).

## Sala compartilhada, Etapa 2: itens no chão e baús — v0.67.0
- `Room` cria os itens ao aplicar `break` (conteúdo do baú + `breakDrops`) e `pick` (`pickDrops`) e manda `drops`
  (um por unidade, com id); `take` → `taken` para todos (primeiro pedido vence, até 3 células); itens somem em
  `DROP_LIFETIME` 300 s. `chest` (espaços inteiros, `parseChestSlots`) → a sala guarda e repassa; `welcome` traz
  `drops` e `chests`; `RoomSnapshot` v2 com baús (v1 ainda carrega).
- Jogo na sala: `ActionContext.sharedLoot` (não cria itens ao quebrar/colher), `Drops.addShared`/`claim`/
  `resolveClaim` (só entra na bolsa o que a sala confirmar), `refreshChestUi` manda o baú quando muda.

## Aparência de cada jogador na sala — v0.66.0
- `Appearance` (`body` heroine/hero + `look` do chibi) no `hello` e em `PlayerInfo` (`parseAppearance`: o que vier
  estranho vira Heroína); `RemotePlayers(manifest)` desenha cada um com o seu personagem (`cleanLook`). Protocolo 9.

## Herói e escolha de personagem no "Novo mundo" — v0.65.0
- `HeroBody` (`heroine` | `hero`) em `Entities.body` decide as folhas do personagem pronto (`${body}-${ferramenta}` /
  `-attack`); `SaveData.body` (v10); `GameOptions.body`; `TitleScreen` com Herói e `creatorOnly`/`onBack` (menu →
  `chooseCharacterForNewWorld` em `main.ts`); prévia por `body`. Folhas `hero*.webp` (`assets-src/hero/`), fora do
  orçamento de início. Na sala, o próprio personagem segue o escolhido (v0.65.1: `body` passado ao `Game` da sala em
  `main.ts`); desde a v0.66.0 os outros também o veem com o personagem escolhido.

## Salas fixas salvas no servidor — v0.64.0 (ADR 0020)
- `ROOMS` (Sala 1, seed 20261106), `MAX_PLAYERS` 10, `hello` com número da sala; `welcome` com `chunks` (mundo da sala),
  `time` e `bag`; mensagem `bag` (itens, grade, posição). `Room`: sem lista de ações nem convite; `snapshot`/`restore`;
  nomes repetidos recusados. Servidor 0.9.0: salas abertas ao ligar, `sala-<n>.json` em `DATA_DIR`, `GET /salas`.
- Jogo: menu com as salas e quantos estão (`fetchRoomCounts`), bolsa/posição da sala no `Game` (envio a cada 5 s e ao
  sair, `sendBag`). `src/net/b64.ts` compartilhado com o salvamento local.

## Sala compartilhada, Etapa 1: hora e crescimento — v0.63.0
- `Room.time` (começa em `ROOM_START_TIME` 0,31) e `Room.tick(dt)` (servidor 1×/s): avança a hora, roda o crescimento
  do `World` (`tick(dt, rand, grow, onGrow)`) e manda `grow` (células) e `time` (a cada `TIME_SYNC_SECONDS` 30 s).
  `welcome` traz `time` e `grown` (células cujo último estado veio do crescimento; ação na célula apaga a entrada).
- Jogo na sala: `world.tick(..., grow = false)`, relógio = `net.time` (+ `onTime`); `World.applyGrowth` aplica o que
  a sala decidiu. `LoopbackServer.tick` para testes. Protocolo 7; servidor 0.8.0 (`setInterval` do relógio).
- Ainda de cada jogador: itens caídos, aranhas, animais, moradores (Etapas 2 e 3 em NEXT_STEPS, Fase M 3b).

## Interior da tenda e tempo limite da sala — v0.62.0
- `TENT_INTERIOR` (`world/interiors.ts`, 7 × 7, `tentLayout()`): um cômodo para todas as tendas, no fim da fila de
  cômodos, em mundos cujo perfil tem `TENT`. `World.tentRoom` e `World.tentDoorAt` (célula logo abaixo da fileira de
  baixo da tenda). `InteriorLayout.outside` agora pode ser null: o `Game` guarda `tentReturn` e `roomExit` volta para
  a frente da tenda (salvo lá dentro: diante da última tenda ou o ponto de renascer). Arte `interior-tent.webp`.
- `main.ts` (`goOnline`): `CONNECT_TIMEOUT_MS` = 10 s, uma nova tentativa automática, depois aviso.

## "Jogar com amigos" só onde conecta — v0.61.1
- `onlineAvailable(hostname)` (`net/socket.ts`, lista `ONLINE_HOSTS` = origens aceitas pelo servidor) → `online.available`
  no menu; fora dela (Artifact, prévias), aviso com link para `GAME_SITE`. Diagnóstico de 06/11: servidor e site ok.

## Coraçõezinhos do namoro — v0.61.0
- Ator `love-hearts` (16 quadros, `scripts/extract-love.py`) entre o casal enquanto namora (`Entities.actors`, a
  partir de `courting`), com `Actor.scale` por espécie (`LOVE_SCALE`); `COURTSHIP_SECONDS` = 2,6. Removidos a folha
  `sheep-love` e o caso especial da ovelha. Carrega depois do início.

## Filhotes e reprodução dos animais do campo — v0.60.0
- `game/breeder.ts` (`Breeder`): ciclo comum de comer → apaixonar → par da mesma espécie → namoro → filhote → crescer,
  usado por `Sheep` e `FarmAnimal` (antes só na ovelha). `Entities` pareia por espécie (`MAX_PER_SPECIES`) e faz o
  filhote nascer (`spawnBaby`); casal do campo namora parado com coração (sem folha de namoro).
- Alimento por espécie em `ITEMS[item].feeds` (`AnimalKind`): ovelha/vaca = trigo, galinha = semente, cavalo = cenoura.
  `ActionController.feedInstead`: animal que come o item sob o cursor/à frente vem antes de plantar/comer.
- Filhote do campo cresce em `FARM_GROW_UP_SECONDS` = 3 × `DAY_LENGTH_S` (agora em `config.ts`). Atores `foal`,
  `calf`, `chick` (carregam depois do início, fora do orçamento). Sem mudança de protocolo nem de salvamento.

## Cerca de tábuas e portão — v0.59.0
- Blocos `FENCE` (48), `FENCE_GATE` (49) e `FENCE_GATE_OPEN` (76), forma `fence`, madeira; nada empilha em cima.
  Portão abre/fecha pela mesma ação da porta (`toggled`/`isOpenable` em `blocks.ts`; `World.toggleDoor` serve aos dois).
- Emenda é só aparência (`render/fence.ts`): cada célula lê os 4 vizinhos (`joinsFence`) e desenha metades das peças
  (horizontal/vertical) + poste grande; trecho reto usa a peça inteira. Portão é desenhado depois da linha (postes
  por cima das travessas). Arte: `scripts/extract-fence.py` (moldura + portão de referência). `PROTOCOL_VERSION` 6.
- Orçamento do início: ~3005 kB de 3072 kB (folga de ~67 kB: a próxima arte grande deve carregar em segundo plano).

## Pedregulhos — v0.58.0
- `Block.ROCK_BOULDER` (forma `rock`, sólido, não colocável): o gerador põe nos pontos de pedregulho (0,6% das células
  livres, antes `STONE` cubo). Arte `rocks.webp` (`scripts/extract-rocks.py`, 40 quadros, sorteio por célula em
  `render/textures.ts`). `blockDrops` → 1–3 `STONE`. `PROTOCOL_VERSION` 5.

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
