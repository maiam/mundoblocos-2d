# Changelog

## Orvalis v0.93.61 — lobos com poses completas e a capivara (14/11/2026)
- **Pedido do dono do produto:** atualizar o movimento dos três lobos e incluir a **capivara** como novo animal doméstico (21 folhas de lobo + 7 de capivara enviadas).
- **Lobos:** 7 folhas por cor (walk, idle, run, alert, attack, hurt, death) pelo mesmo mecanismo do goblin/lagarto (`hasPoses`/`PoseKind`; `ActorKind` ganhou `${PoseKind}-${PoseState}`). Corre ao perseguir, alerta ao ver o jogador, ataca ao morder, treme ao levar golpe. As folhas de 144 px viraram 160 px por quadro (~2,7 MB em WebP para as 21; baixam sob demanda, fora do orçamento de início — `build-artifact.mjs` agora também isenta `lizard` e `capybara`).
- **Capivara:** `FarmKind 'capybara'` (passeia perto do portão; idle quando parada). Sem reprodução (sem arte de filhote e sem alimento). Folhas de comer/dormir/dano/morte ficam guardadas.
- **Protocolo 23** (novo tipo de animal no espelho da sala): servidor e jogo sobem juntos.

## Orvalis v0.93.60 — mais acampamentos de goblin e o homem-lagarto (14/11/2026)
- **Pedido do dono do produto:** "1 acampamento a cada 4 chunks" e incluir o **homem-lagarto** (vive perto de rios, anda de 3 em 3; vida 100, ataque 15, 2 Moedas de Cobre; folhas enviadas). **Ajuste meu:** com o chunk de 256 px da grade 2, "a cada 4 chunks" colaria os acampamentos; ficou **1 por região de 4 × 4 chunks** (`PACK_REGION = 32 × SUBDIV` células) — uma constante só para ajustar. Aviso: muda o mapa de **todas as seeds** só nos acampamentos (antes 4, agora ~340–400 em ±10 regiões em volta da cidade).
- **Homem-lagarto** (`MonsterKind 'lizard'`): bandos de 3 na margem de rios (`WorldGenerator.riverAt`, novo; sem fogueira), ficha em `MONSTER_STATS`, espólio em `monsterDrops`, mesmas 7 folhas do goblin (`--rows-map 0,2,3,1`, a ordem enviada era frente/costas/esquerda/direita), `hasPoses(kind)` no lugar dos `=== 'goblin'` (estado visual, sala e espelho).
- **Streaming dos bandos** (`Entities.updatePacks`, a cada 0,5 s): só vivem os bandos com jogador a até 56 × `SUBDIV` células (somem além de 80 ×); sem isso ~2 800 goblins entrariam no `blocker` O(n). Efeito: bando derrotado volta completo depois de o jogador se afastar e voltar.
- **Protocolo 22** (novo tipo de monstro na sala): servidor e jogo sobem juntos (`build:net` + `sync-net`).
- Testes: acampamentos por região, bandos de rio, ficha/espólio/pose do lagarto, streaming (490 testes, grades 1 e 2).

## Orvalis v0.93.59 — grade fina, F7: a virada — o Mundo passa a `SUBDIV = 2` (13/11/2026)
- **Pedido do dono do produto:** "Pode começar a F7". `DEFAULT_SUBDIV = 2`: célula de metade do lado, mundo do mesmo tamanho em pixels. Santuário Celestial fica na grade 1 (`sanctuaryPage()`; outro mundo, ADR 0028).
- **Paredes e porta de parede no Mundo em qualquer grade** (perfil sempre com paredes): na grade fina a frente empilha `SUBDIV` peças e a porta sai ×`SUBDIV` (`sanctuaryWallArt.ts`).
- **Bugs reais achados com `ORVALIS_SUBDIV=2 npm test`:** visão de lobos/goblins escalada duas vezes; raio fixo `5` apagava todos os goblins; `villagerInFront` sem escala — corrigidos. Testes de rede, mundo e jogo passam a depender de `SUBDIV`; suíte verde em `SUBDIV` 1 e 2 (486 testes).
- **Medição (SwiftShader, `perf:cpu:3d`):** ~3,2–3,5 ms de JS por quadro no 3D (praça, noite, floresta, dungeon).
- **Servidor:** precisa subir junto (`build:net` + `sync-net`, PR no `orvalis-servidor`); `hello.sub` recusa quem fala outra grade. Implantação conjunta só com aval do dono do produto. Quem já tem save v15/v16 grade 1 migra sozinho (cópia `…:grade-1`).

## Orvalis v0.93.58 — grade fina, F6: salvamento v16, protocolo 21 e a sala na mesma grade (13/11/2026)
- **Pedido do dono do produto:** F6 junto com o servidor. Nada muda para quem joga hoje (a grade padrão segue 1: `DEFAULT_SUBDIV = 1`); a F7 troca para 2 no jogo e no servidor ao mesmo tempo.
- **Migração pura e compartilhada** (`world/subdiv.ts`, sem DOM — roda no navegador e no pacote do servidor): chunks (o chão repete nas 2 × 2 células; cubos, paredes, portas, cercas, plantações e ar repetem; árvores, flores, baú, fogueira etc. ficam só na célula do canto inferior esquerdo, a mesma regra de `upsampleTown`), névoa do minimapa, buracos, tenda, baús, jogador, ovelhas e monstros do covil. Só aumenta a grade (1 → 2); diminuir é erro.
- **Salvamento v16** (`game/save.ts`): campo `sub`; v15 migra como grade 1; `rescaleSave`; `SaveStore.load` guarda **uma cópia do arquivo antigo** (`…:grade-1`) antes de converter e **não abre nem sobrescreve** um arquivo de grade mais fina que a do jogo (aba/versão antiga).
- **Protocolo 21 e sala:** `hello` carrega `sub` e a sala recusa quem fala outra grade ou outra versão; `RoomSnapshot` v5 grava `sub` e `restore` converte arquivos antigos (`rescaleRoomSnapshot`: chunks, baús, bichos, buracos; bolsas intactas) e **recusa** (sem tocar) o arquivo de grade mais fina.
- **Servidor** (`orvalis-servidor`): pacote do jogo sincronizado — traz de uma vez tudo o que faltava desde a v0.93.7 (paredes e porta de parede no Mundo, Mercado, física sem degrau do jogador, etc.) — e o arquivo da sala ganha **cópia de segurança** (`sala-N.json.antes-<pacote>.bak`) antes da primeira regravação de cada pacote novo.
- 15 testes novos (`subdiv`, `save`, `fixedRoom`). **Limites conhecidos:** chunks já editados entram na grade nova com o contorno do terreno em degraus de 2 × 2 (os não editados são gerados lisos); árvores e flores dos chunks editados ficam onde estavam (os não editados têm novas posições); o arquivo salvo cresce ~4× (cota do navegador). **Deploy:** servidor e site juntos (versão de protocolo nova).

## Orvalis v0.93.57 — o Mercado: três lojas, um cômodo, um mercador e compras com Moedas de Cobre (13/11/2026)
- **Pedido do dono do produto (13/11):** as três lojas lado a lado passam a ter **um só nome, "Mercado"**, e **um só interior** (arte enviada): três entradas, três saídas que dão no mesmo lugar; um NPC fixo no mercado; comprar com as moedas dos goblins; só **consumíveis** à venda.
- **Interior de várias portas** (`world/interiors.ts`): `InteriorDef.buildings` + `InteriorLayout.doors` (capachos `E` agrupados da esquerda para a direita, cada um ligado à porta da sua loja: poções → armazém → ferramentas); `World.interiorDoorAt`, `exitDoorAt`. Cômodo `market` 24 × 13 (`assets-src/interiors/market.png` → `interior-market.webp`), balcões e caixotes bloqueados, mercador nos corredores atrás dos balcões. As três construções se chamam "Mercado" (`town.ts`). A tenda passou de posição na fila de cômodos (não é salva; ao carregar dentro de um cômodo volta para a rua).
- **Mercador: Bento** (padeiro), `role: 'merchant'` (`game/npcs.ts`): mora atrás dos balcões e **tocar nele abre a loja** em vez da conversa; sai da lista dos moradores das ruas (agora 14 + Black + Bento).
- **Loja** (`world/shop.ts`, regras puras): vitrine = toda comida (`FOOD`), preços provisórios em Moedas de Cobre — batata 1, tomate 1, cenoura 2, maçã 2, leite 2, pão 4, queijo 4, macarrão ao molho 6, torta de maçã 8; `buyOffer` é tudo-ou-nada (`ok`, `coins`, `full` com a bolsa cheia). **Janela** (`game/shopWindow.ts`, CSS `.shop`): a moldura é a arte enviada (`assets-src/ui/shop-frame.png`, sem os textos que mudam: `scripts/make-shop-frame.py`), com o retrato do mercador no círculo, título, fala, 10 espaços (ícone, nome, preço), páginas e saldo por cima; tocar num item compra 1; "Vender" responde "em breve". O jogo pausa com a janela aberta; Esc, X ou tocar fora fecham.
- **Verificado no navegador:** entrada pelas 3 portas no mesmo cômodo e saída de cada capacho na sua porta; janela fiel à arte; compra de pão (9 → 5 moedas, +1 pão), recusa da torta (faltam moedas), Esc fecha. Achado e corrigido no teste: a janela herdava `pointer-events: none` do HUD e os cliques passavam para o canvas.
- 12 testes novos (`shop.test.ts`, `interiors.test.ts`, `villager.test.ts` atualizado). **Fora do escopo / pendente:** aba Vender, mais categorias, preços de venda; janela em celular deitado (a arte é vertical: cabe, mas os textos ficam pequenos — avaliar uma versão em duas colunas); sala: o mercador e a loja são locais (nenhuma mensagem nova; a bolsa já sincroniza).

## Orvalis v0.93.56 — Paredes de Tábuas e Pedra e Porta de Parede no Mundo (W5 enxuta) (13/11/2026)
- **Decisões do dono do produto (13/11):** altura da parede na grade fina = **2,4 cubos** (recomendação aceita: a mesma de hoje, ≈ a altura do personagem); **paredes e porta com ícone entram no Mundo** (a porta de parede usa o ícone da Porta de Carvalho).
- **No Mundo (3D):** `ChunkWalls` (`render/three/chunkWalls.ts`) desenha as paredes autotile do Santuário — tampa e frente com a arte real, emenda entre chunks, porta que troca de quadro — por chunk, com texturas compartilhadas (`WallPieceCache` em `sanctuaryWallArt.ts`); `pick` e quebrar funcionam. Atlas de Tábuas e Pedra e ícones no pacote do Mundo (`art/principal.ts`, `textures.ts`).
- **Economia (`world/items.ts`, provisória, ajustável):** Parede de Tábuas = 2 Tábuas de Carvalho → 2; Parede de Pedra = 2 Pedras Brutas → 2; Porta de Parede (Tábuas) = 4 Tábuas → 1, no Construtor; quebrar devolve o item (a porta, aberta ou fechada, volta a porta). Perfil principal lista os três blocos (hotbar com 3 a mais).
- **Fora do escopo (próximas):** casas/cidade e interiores refeitos com paredes autotile; porta de Pedra; animação do quadro intermediário da porta no Mundo; **grade fina** (`?grade=2`): sem paredes por ora — na W5-grade a parede empilha `SUBDIV` frentes (altura 2,4 cubos) e a porta pede arte 1 × 2. **Sala:** o servidor precisa de `build:net` + `sync-net` + deploy para aceitar paredes (sem mudança de mensagem; `PROTOCOL_VERSION` 20 mantido). **2D de reserva (`?render=2d`/sem WebGL) não desenha paredes** (continuam sólidas): some no M7.
- 4 testes novos (`wallsMundo.test.ts`); 3 testes que registravam "o Mundo ainda não tem paredes" atualizados; recibos `plank-wall`/`stone-wall`/`plank-wall-door` (o prefixo `wall-` é guardado pelo teste das paredes antigas removidas).

## Orvalis v0.93.55 — grade fina, F5: comparação da altura da parede e corpo que passa por vão de 1 célula (13/11/2026)
- **Comparação da parede (pergunta 3 da ADR 0032):** `?mundo=santuario&paredes=teste&escala=grade` mostra, lado a lado e com o personagem nos mesmos pixels, o **Core Keeper de hoje** (parede ≈ 1,2) e três alturas na grade fina — **2,0**, **2,4** e **3,0 cubos** de 0,5 (`ScalePreset` `grade20/24/30`, `GRADE_COMPARE`; cada grupo traz cubo, parede, régua de 2 segmentos e o personagem de referência). Em dev, a cena de escala do Mundo (`?escala=`) passou a valer só no mundo principal (antes escondia o teste do Santuário).
- **Corpo do jogador na grade fina:** a meia-largura dobrada (0,54 → corpo de 1,08) não passava por um vão de **1 célula** (porta, portão, abertura numa fileira de blocos). `WalkerSpec.maxHalfW` + `scaleSpecBy` (pura): o jogador tem teto de 0,45 (corpo de 0,9); monstros e animais seguem dobrados. Padrão inalterado. 4 testes novos (`walker.test.ts`, incluindo a travessia de um vão real: 0,45 passa, 0,54 trava).
- **Paredes no Mundo continuam sendo a W5** (o perfil principal não tem paredes, receitas nem arte delas): a W5 será feita já na grade fina, com a altura escolhida nesta comparação.

## Orvalis v0.93.54 — grade fina, F4: interiores, tenda, covil, lobos e goblins (só dev, `?grade=2`) (13/11/2026)
- **ADR 0032, F4:** com `?grade=2` o mundo inteiro existe na grade fina com os mesmos pixels de hoje — agora também os cômodos, o covil e os bichos do mapa.
- **Interiores e tenda:** `scaleInteriorDef` (`world/interiors.ts`) amplia cada caractere do mapa do cômodo 2 × 2 (a arte cobre a área nova inteira); o capacho vira 2 × 2 (`interiorExitAt`; pisar em qualquer célula sai), a porta da rua vale `SUBDIV` células (`World.interiorEntrance`), o ferreiro e suas linhas acompanham; espaçamento e anel × `SUBDIV`.
- **Covil e caverna:** `upsampleDungeon` (`world/dungeon.ts`) amplia o labirinto (chão, paredes e montanhas repetem; adereços numa célula; posições dos monstros × `SUBDIV`), `DungeonLayout.scale` guarda a escala das listas de células (`dungeonEntry`, `isDungeonExit`); anel de montanhas, aterrissagem, base e frente da caverna e distâncias do `planCave` × `SUBDIV` (a boca vale `SUBDIV` células: `World.isCaveDoor`).
- **Lobos e goblins:** regiões, distâncias, raio de passeio e posições do bando/acampamento × `SUBDIV`; `planGoblinCamps` voltou na grade fina.
- **Conferido no navegador (seed 42):** a Ferraria (entrada pela porta, arte e ferreiro no lugar), a caverna levando ao covil (corredores, teias e ossos) e **as mesmas contagens do padrão** — 4 acampamentos, 26 bandos, 1 chefe, 10 aranhas grandes, 28 pequenas, 28 goblins, 26 lobos. 9 testes novos (`interiors`, `dungeon`). Padrão inalterado (`SUBDIV = 1`).
- **Falta (F5–F7):** paredes e portas de parede, save, protocolo e servidor, virada; sala (servidor) ainda não simula a grade fina.

## Orvalis v0.93.53 — grade fina, F3: a cidade (só dev, `?grade=2`) (13/11/2026)
- **ADR 0032, F3:** com `?grade=2` a Cidade do Despertar existe na grade fina, **com os mesmos pixels de hoje**: `upsampleTown` (`world/town.ts`) amplia o mapa lógico 2 × 2 — área, portão, construções (retângulo e porta), ruas, muralha de 2 cubos, `TOWN_PART` e sebes repetem nas 4 células; o id da construção fica na célula do canto inferior esquerdo; objetos soltos (árvores, flores, postes, barris, caixas, placas) numa célula só. `TOWN_MARGIN`/`TOWN_SOUTH_FIELD`/`TOWN_WALL`/estrada × `SUBDIV`. A arte dos prédios mantém os pixels (`objectScaleFor('building')`); as sebes ficam do tamanho da célula (`worldSpriteArt`).
- **Conferido no navegador (seed 42):** praça inicial, poço, bancos, torres, lampiões, casas, a Guilda e o castelo com os mesmos tamanhos do padrão, personagem igual; NPCs presentes. 5 testes novos (`town.test.ts`: dimensões, retângulos das construções, âncora única, muralha/portão, objetos soltos × repetidos). Padrão inalterado (`SUBDIV = 1` devolve o mesmo mapa).
- **Ainda fora da grade fina (F4):** interiores e tenda (por ora sem cômodos), dungeon, lobos e goblins. **Risco anotado:** construções grandes são montadas pelo chunk da âncora; com chunks de 16 células finas o castelo (52 células) pode sumir se a âncora sair da margem — verificar no uso.

## Orvalis v0.93.52 — grade fina, F2: objetos e elementos ao redor dos atores (só dev, `?grade=2`) (13/11/2026)
- **Aprovado pelo dono do produto (13/11):** o protótipo F1 "ficou ótimo" (proporção personagem × terra, cenoura, trigo e árvores).
- **Tabela de tamanhos em código:** `objectScaleFor(shape)` (`render/worldScale.ts`, testada): árvores e prédios mantêm os pixels de hoje (crescem `SUBDIV` em células, em volta do meio da base; tronco 1 × 1); decoração, cultivos, cercas, móveis, baú, tenda e pedregulho encolhem com a célula (conferido num catálogo de todos os objetos ao lado do personagem). `worldSpriteArt` usa a tabela.
- **Em células × `SUBDIV` (para manter os pixels):** números de dano (altura e subida), ícones e sombra dos itens caídos (tamanho, pulo e flutuação), anel da ovelha, raio de revelação do minimapa, e o rebanho/cavalo/vacas/galinhas iniciais (distâncias do sorteio).
- **Fica para as próximas fatias:** portas (1 × 2) e paredes (F5), cidade/prédios (F3), interiores e dungeon (F4), save/protocolo/servidor (F6). Padrão inalterado (442 testes), sem mudança de save, protocolo ou servidor.

## Orvalis v0.93.51 — grade fina, protótipo F1: `?grade=2` (só dev) (13/11/2026)
- **ADR 0032, F1:** com `?grade=2` (apenas em desenvolvimento; no site é ignorado) cada célula tem metade do lado e **o mundo mantém o tamanho de hoje em pixels**. `config.ts`: `SUBDIV` (1 ou 2; sem `window`, no servidor, é sempre 1).
- **O que muda com `SUBDIV = 2`:** gerador em `x / SUBDIV` (mesmas formas de continentes, rios e biomas, com mais resolução; densidades de árvores, pedras e flores ÷ `SUBDIV²`); câmera com 28 células (`WORLD_CELLS_TALL`) e atores com o fator proporcional (personagem, NPCs, animais e monstros mantêm os pixels); árvores ampliadas ×`SUBDIV` em volta do meio da base (`SpriteDraw.scale`, tronco 1 × 1); jogabilidade em células × `SUBDIV` — velocidade e caixa dos pés (`Walker`/`scaleSpec`), alcance de ação, golpe, visão e coleira de monstros, namoro, coleta, passeio dos animais; terra, cultivos, cercas e móveis encolhem junto com a célula.
- **Protótipo, não jogo:** sem cidade, dungeon, lobos e goblins, sem salvar, sem sala, só 3D; a cidade, os interiores, as paredes e o resto da jogabilidade em células (F3–F5) ainda não foram convertidos. **Padrão inalterado:** 441 testes (determinismo do gerador com `SUBDIV = 1` idêntico), mapa, save, protocolo e servidor intactos.
- **Medido (headless, software GL, seed 42):** custo de JS do `draw` médio 5,8 ms (14 células) → 6,8 ms (28), p95 23,8 → 26,2 ms; velocidade 4,2 → 8,4 células/s (mesmos pixels por segundo).

## Documentação — ADR 0032: grade fina do Mundo, padrão Stardew (13/11/2026, sem versão)
- **Decisão de direção do dono do produto (13/11):** testou `?celulas=28` — gostou do tamanho de células e objetos, **não** do mundo encolhido; quer o mundo no tamanho de hoje com células/objetos proporcionais ao personagem, "mesmo que dê mais trabalho", e o **padrão do Stardew Valley** (uma grade, personagem 1 × 2 tiles, planta/terra/cerca 1 tile, porta 1 × 2, tronco 1 × 1 com árvore alta).
- **ADR 0032 (proposta):** `SUBDIV = 2` (1 célula = 2 × 2), impacto por camada medido no código (gerador em `x / SUBDIV`, cidade/dungeon/interiores ampliados, jogabilidade × `SUBDIV`, `SAVE_VERSION` 16, `PROTOCOL_VERSION` 21 + servidor, ~4× células a desenhar), tabela de objetos, fases F0–F7 e seis perguntas abertas; substitui a escala em células da ADR 0028 para o Mundo. Nenhum código alterado.

## Orvalis v0.93.50 — experimento de escala do Mundo: `?celulas=N` (13/11/2026)
- **Pedido do dono do produto:** a célula/blocos ficaram grandes perto do personagem (cenoura, trigo e terra arada "gigantes"); o tamanho visual do personagem está bom. Proposta em estudo (passo 1 do plano): reduzir a célula em até 50% e reclassificar os objetos (encolhem com a célula / mantêm os pixels / passam a ocupar mais de uma célula).
- **Experimento (3D, só para comparar; sem mudar o padrão):** `?celulas=N` mostra N células na vertical (padrão 14; limites 10–32) e o fator dos atores (personagem, NPCs, animais, monstros) sobe na mesma proporção (`actorScaleFor`), então o personagem mantém os pixels e o resto do mapa encolhe. `render/worldScale.ts` (+ teste), `worldThreeRenderer.ts`, piso de zoom da câmera baixado de 0,5 para 0,25 (só para mais de 14 células). Nome `?celulas=` porque `?escala=` já abre a cena de comparação de dev e o teste de paredes do Santuário. Verificado em 1280×720: 14 e 28 células (personagem igual; árvores, lampiões e casas ficam menores que o personagem — como previsto).
- **Não muda:** padrão, mapa (células), protocolo, save, servidor, Canvas 2D de reserva (o parâmetro só vale no 3D). Tabela de objetos e ADR 0032 vêm depois da escolha do valor.

## Orvalis v0.93.49 — ícones de arte das paredes na hotbar (13/11/2026)
- **Arte enviada pelo dono do produto:** ícones da **Parede de Tábuas** (tora e painéis) e da **Parede de Pedra**. Originais em `assets-src/icons-paredes/`; recorte pela silhueta (alfa > 10, ignora o véu quase invisível das bordas), quadrado 128 px, WebP q84 em `src/assets/icon-wall-*.webp`, registrados em `celestialIcons` do pacote do Santuário (`render/art/santuario.ts`) — `iconFor` já os devolvia antes do provisório. Teste novo em `santuario.test.ts`.
- **Porta de parede:** sem ícone enviado, segue com `wallPlaceholderIcon`. O Mundo principal ainda não lista paredes (W5). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.48 — corrige a entrada no jogo que ficava no 2D/travava (13/11/2026)
- **Relato do dono do produto:** ao entrar no jogo ele "travava com a tela do 2d" e só voltava a funcionar (em 3D) depois de reiniciar. **Causa:** a vitrine da tela de título (`showcase`) roda um `Game` em Canvas 2D no `#world`; um canvas que recebeu contexto 2D **não aceita WebGL**, então o `Game` 3D criado por "Novo jogo"/"Continuar" falhava (`THREE.WebGLRenderer: Error creating WebGL context`) e a tela ficava parada. Reproduzido no headless antes do conserto.
- **Correção (`main.ts`):** cada `Game` (vitrine, solo, sala, sair da sala) ganha um `<canvas id="world">` novo (`freshCanvas()`, mesmo id/classe/estilo) depois de o anterior ser destruído. Verificado: título → Novo jogo → Começar entra em WebGL. Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.47 — a virada: o Mundo passa a usar o 3D por padrão (13/11/2026)
- **Decisão do dono do produto (13/11):** virada já, com 2D de reserva e física sem degrau como padrão no 3D. PC (~60 fps, JS 3,4 ms, sem vazamento), celular e tablet ("rodando ok"), faixas das copas e seleção corrigidas.
- **O que muda para quem joga:** o Mundo principal usa o renderer 2.5D em WebGL (solo e online). `?render=2d` e aparelhos sem WebGL (ou falha ao carregar o módulo) usam o Canvas 2D de antes. Com o 3D o jogador **não sobe em cubos sozinho** (`?fisica=degrau` volta à regra antiga); lobos e goblins seguem com degrau.
- **Código:** `render/rendererChoice.ts` (puro, testado) decide o renderer e a física; `main.ts` carrega o `WorldThreeRenderer` sob demanda e o passa ao `Game` solo e online; `?fps=1` agora vale em qualquer build; o build de piloto (`VITE_PILOT_3D`, `build:piloto3d`, `preview:piloto3d`) deixa de existir. Scripts `parity:3d` e `perf:cpu:3d` passam a usar `?render=2d` para o 2D. 437 testes (3 novos).
- **Servidor e protocolo: nada muda** (a sala não simula o movimento do jogador). **Dívida:** o início do Artifact de arquivo único passou de 2,94 MB para 3,49 MB (Three.js embutido), acima do orçamento de 3 MB; o site, que carrega o 3D sob demanda, não é afetado. Riscos não verificados: Safari/iOS, iframe do Artifact e sala multiplayer em 3D — conferir após o deploy (NEXT_STEPS).

## Documentação — confirmação do dono do produto e plano da virada (13/11/2026, sem versão)
- **Confirmado no PC:** as faixas nas copas sumiram e o enquadramento da seleção melhorou (v0.93.45). **Celular e tablet: "rodando ok"** (sem relatório numérico). Registrado em `docs/PARITY_3D.md`.
- **Plano do M6 (virada) detalhado na ADR 0031:** 3D padrão com `?render=2d` de reserva, física sem degrau padrão no 3D (só o jogador), **servidor e protocolo sem mudança** (a sala não simula o movimento do jogador; lobos e goblins seguem com degrau), online com o mesmo renderer, peso do build (Three.js no Mundo), Artifact e reversão. Nenhum código alterado; a virada aguarda a decisão do dono do produto.

## Orvalis v0.93.46 — relatório do PC aprovado e teste de vazamento do 3D (13/11/2026)
- **Relatório do dono do produto (PC Windows, Edge, 1912 × 948, v0.93.45, 180 s, zero pausas):** média **59,6 fps**, 5% piores **51,8 fps**, pior quadro 67 ms, **0,3%** dos quadros > 33 ms, JS do `draw` **3,4 ms** (p95 6,2) — o 3D roda a ~60 fps fixos no PC. Registrado em `docs/PARITY_3D.md`.
- **`npm run leak:3d`** (`scripts/leak-3d.cjs`): percorre ~140 chunks novos com `?render=3d`, coletando o lixo a cada passo, e falha se texturas, geometrias ou memória do JS crescerem depois do aquecimento. Resultado: texturas estáveis em ~104, geometrias em 84, JS em 15 MB — **sem vazamento** (os 58 MB do relatório eram lixo ainda não coletado).
- Só ferramenta e docs; sem mudança de jogo, protocolo, save ou servidor.

## Orvalis v0.93.45 — árvores sem faixas, seleção igual à do 2D e medidor que ignora pausas (13/11/2026)
- **Achados do teste no PC (dono do produto):** (1) copas de árvores com faixas e transparência — *z-fighting* entre planos de objetos vizinhos na mesma linha (mesma profundidade); (2) seleção de blocos "inexata". Corrigidos no render 3D do Mundo (só dev/piloto):
  - **Profundidade:** `spriteDepthBias` — cada coluna avança uma fração de célula (0,0015, ciclo de 64) para o lado do espectador, reproduzindo a ordem esquerda→direita do 2D; objetos e portas ganham 0,01 de folga sobre as faces dos cubos (mesmo plano). Tudo < 0,14 (pés do personagem).
  - **Seleção:** moldura do cursor, cantoneiras do alvo e rachaduras extraídas do `Renderer` 2D para `render/selectionFx.ts` (o 2D passou a usá-las, igual) e usadas na camada 2D do 3D, em volta do que se vê (`worldSelection.ts`: cubo = topo + frente, 1 × (1 + K) células; objeto = retângulo clicável; chão = ladrilho). Antes o 3D mostrava um quadrado plano amarelo, só quando válido.
  - **Alvo das ferramentas de chão:** `GameRenderer.pickGround` (opcional; só o 3D implementa) devolve o cubo/chão **visto** sob o cursor, ignorando árvores como o 2D; `ActionController.groundCell` o usa. Com K = 1 o topo de um cubo cobre o chão da célula ao norte e a pá/enxada/semente agiam na célula errada.
- **Medidor `?fps=1`:** pausas do navegador (> 1 s entre quadros, p.ex. aba em segundo plano) saem das médias e viram `pauses` no relatório; o relatório de 159 s do dono do produto (média 51 fps, "pior quadro" 15,4 s) era uma pausa — sem ela ≈ 58,7 fps, JS do `draw` 3,9 ms, 0,4% dos quadros > 33 ms. Registrado em `docs/PARITY_3D.md`.
- 434 testes (9 novos). Build de produção inalterado; o 2D segue igual (moldura e cantoneiras idênticas). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.44 — painel `?fps=1`: regime estável e tempo de JS do draw (13/11/2026)
- **Primeiro relatório em aparelho real** (PC Windows, Edge, 1912 × 948): média 51,7 fps, 5% piores ≈ 21 fps, pior quadro 200 ms, 252 chamadas / 5,0k triângulos — **inconclusivo** (cena leve; suspeita de engasgos de CPU e da carga inicial misturada à média). Registrado em `docs/PARITY_3D.md`.
- **Painel melhor:** o relatório passa a trazer o **regime estável** (depois de 8 s de carga: FPS médio, 5% piores, pior quadro, % de quadros > 33 ms e > 50 ms) e o **tempo de JS do `renderer.draw`** (`jsDrawMs`: média, p95, máx.), medido pelo `Game` num anel de 1200 quadros (`Game.drawTimes`); a linha do painel mostra `JS x ms`. Assim se vê se o gargalo é CPU (o JS acompanha o quadro lento) ou GPU/compositor (JS pequeno, quadro lento). Conferido no navegador. 2 testes novos (425). Só dev/piloto; sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.43 — medição do custo de JS por quadro, 2D × 3D (13/11/2026)
- **`npm run perf:cpu:3d`** (`scripts/perf-cpu-3d.cjs`): mede, em 4 cenários (praça, noite, floresta densa, labirinto), o tempo que `renderer.draw` gasta na thread do JS — a parte do custo que não depende da GPU. Primeira medição (VM sem GPU, dev): **2D ≈ 1,1 ms; 3D ≈ 2,7–3,4 ms por quadro** (p95 ≤ 5 ms, máx. 9,6 ms), em `docs/PARITY_3D.md`. Cabe no orçamento de 30 FPS (33 ms), sem grande folga em celular fraco; a GPU só se mede em aparelho real (`?fps=1`).
- Só ferramenta e docs; sem mudança de jogo, protocolo, save ou servidor.

## Orvalis v0.93.42 — painel `?fps=1`: plano B quando não há área de transferência (13/11/2026)
- **Correção:** em HTTP na rede local (o caso de testar no celular) o navegador não libera `navigator.clipboard`; o toque no painel não fazia nada. Agora mostra o relatório (JSON) numa caixa de texto já selecionada para copiar à mão ou tirar um print (toque na caixa fecha); com permissão, copia e confirma por 3 s. A linha de medição não apaga mais as mensagens em meio segundo.
- Conferido no navegador nas duas vias (com e sem `clipboard`). OPERATIONS: como obter o relatório e quando anoitece (8 min por dia). Só dev/piloto; sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.41 — M5.2: física sem degrau no piloto do Mundo, atrás de `?fisica=solida` (13/11/2026)
- **Decisão do dono do produto (13/11):** seguir a recomendação — flag no piloto, padrão inalterado, servidor só na virada. **`?fisica=solida`** (dev e build de piloto, só com `?render=3d`, offline) liga `stepHeight = 0` no jogador do Mundo (`configureSanctuaryThreeCollision` ganhou o 4º parâmetro `solidWorld`; `Game` recebe `solidPhysics`). Sem a flag, no 2D ou online (a sala): a regra antiga (degrau de 1 nível). Só o jogador muda: lobos e goblins mantêm o degrau deles (decisão pendente).
- **Servidor:** nada muda agora. A sala usa o mesmo `World`/`Walker`; a regra sem degrau só vai a ela na virada (`build:net` + `sync-net` + `PROTOCOL_VERSION`), registrado em `PARITY_3D.md` e NEXT_STEPS.
- Conferido no navegador (seed 42): com a flag o jogador para diante do cubo (stepHeight 0, x = 2,67); em 3D sem a flag e no 2D passa por cima (stepHeight 1). 2 testes novos (421 → 423). **Build de produção inalterado** (a flag só existe em dev/piloto). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.40 — M5.1: checklist de paridade 2D × 3D e medição em aparelho real (13/11/2026)
- **`npm run parity:3d`** (`scripts/parity-3d.cjs`): abre o jogo em 2D e em `?render=3d` nos mesmos 10 cenários (praça, portão, floresta, água, item caído, noite, interior, covil, labirinto, construção) e gera `parity-out/index.html` com as capturas lado a lado; sai com erro se houver erro de console. Resultado e pendências em **`docs/PARITY_3D.md`** (todos os 10 cenários ✅ no headless).
- **Piloto em aparelho real:** `npm run build:piloto3d` (`VITE_PILOT_3D=1`, `dist-piloto/`) e `npm run preview:piloto3d` (na rede). O build de produção segue **sem** o 3D (conferido). `?fps=1` (`dev/perfHud.ts`, testado): painel com FPS, tempo de quadro e o pior, chamadas/triângulos/texturas/geometrias da GPU e memória; **toque copia o relatório (JSON)**. Funciona também no 2D, para comparar. `Game.rendererStats` exposto.
- **Medição honesta:** `ThreeStage` agora acumula os contadores de **todas as passadas** do quadro (cena + luz); antes `stats()` mostrava só a última (a camada de luz) — corrigido também para o Santuário.
- **Achado da paridade (corrigido):** na floresta densa o jogador sumia atrás das copas (z-buffer correto, mas sem pista de onde ele está) → **eco translúcido** do jogador por cima de tudo (`ActorBillboards` `echo`), como no Santuário.
- Só dev/piloto; física inalterada. 421 testes (8 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.39 — M4.2: dungeon do Mundo em 2.5D; M4 concluído (13/11/2026)
- **Parede do labirinto em 2 níveis:** `ChunkSprites` aceita `stack` (de `textures.stackDraw`) — instâncias uma unidade de altura acima da outra (`SpriteCell.lift`; o `pick` desconta a altura do exemplar).
- **Farol, seta da entrada e escuro fora do labirinto** extraídos do `Renderer` 2D para `render/dungeonFx.ts` e **compartilhados** com a camada 2D do 3D (o 2D segue igual). A penumbra do covil é a luz dinâmica (ambiente 0,3 + luz do jogador). `entrance` e `dungeonArea` → `honored`: todos os campos de `RenderOptions` estão atendidos no Mundo 3D (exceto a depuração `showChunkBorders`).
- Conferido no navegador (seed 42): entrada do covil com o farol roxo e pétalas, e o interior do labirinto (paredes empilhadas, escuro fora da área, penumbra) em 3D × 2D, sem erros. **M4 concluído** em `?render=3d` (só dev). Falta o **M5 — piloto**. Física inalterada. 416 testes (3 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.38 — M4.1: interiores do Mundo em 2.5D, atrás de `?render=3d` (13/11/2026)
- **`InteriorRoom`:** ao entrar numa construção (`opts.interior`), o conteúdo do mundo aberto (agora numa `worldLayer`) é escondido e a arte pronta do cômodo é estendida sobre o chão da área — na vista oblíqua K = 1 aparece igual ao 2D —, com o fundo escuro; atores e itens em pé por cima (só os de dentro), sem céu, nuvens, luz da noite nem partículas. Ao sair, o mundo volta e o fundo do céu é restaurado. O cômodo segue isolado ao norte (ADR 0014; decisão de manter o cômodo isolado até o W5). `interior` → `honored`.
- Conferido no navegador (seed 42): ferraria em 2D × 3D — arte, ferreiro e personagem corretos, camada do mundo escondida lá dentro e de volta na rua, sem erros. Ainda sem a dungeon (covil, farol e seta da entrada: M4.2) e o piloto (M5). Só dev; física inalterada. 413 testes (4 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.37 — M3.4: porta animada e partículas do Mundo em 2.5D; M3 concluído (13/11/2026)
- **`doorAnim.ts` (puro, testado):** a animação da porta (8 quadros, 0,32 s, sem animar na primeira vez vista) extraída do `Renderer` 2D e **compartilhada** com o 3D; o 2D passou a usá-la sem mudar o comportamento (conferido: fechada, abrindo e aberta iguais). **`DoorSprites`:** portas fora do `ChunkSprites`, um plano por porta visível com o quadro do momento, lista por chunk guardada por `chunk.version`, aberta não escreve profundidade, `pick` pelo retângulo clicável.
- **Partículas do bioma** (pétalas, poeira, pólen, vaga-lumes à noite) na camada 2D, na ordem do 2D. `player` → `honored`.
- Conferido no navegador (seed 42): porta fechada → folha girando → aberta em 3D, 55 partículas ativas, sem erros. **M3 concluído** em `?render=3d` (só dev): atores, itens, dano, luz/dia-noite, porta animada e partículas. Faltam interiores e dungeon (M4) e o piloto (M5). Física inalterada. 409 testes (7 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.36 — M3.3: luz e ciclo dia/noite do Mundo em 2.5D (13/11/2026)
- **Decisão do dono do produto (13/11):** a luz do Mundo liga **só à noite e na dungeon**; de dia o jogo fica claro como hoje (a camada nem é desenhada). Registrada na ADR 0031.
- **`worldLight.ts` (puro, testado):** brilho ambiente pelo mesmo `skyAt` do 2D (1 de dia → 0,24 à meia-noite; penumbra de 0,3 na dungeon), cor da escuridão e coleta das luzes visíveis — a do jogador + fogueira, caldeirão, forno e lampiões da cidade (raio/cor das tabelas existentes), mais próximas primeiro, com a oscilação do fogo. `SanctuaryLighting.setAmbient` (brilho e cor variáveis) reaproveita o shader do Santuário (teto de 12 luzes). `time` e `inDungeon` → `honored`.
- Conferido no navegador (seed 42): meio-dia sem camada (179 chamadas de desenho), entardecer escurecendo, meia-noite com poça de luz no jogador e brilho nos lampiões da praça, sem erros. Ainda sem tinta laranja do pôr do sol, brilho aditivo de dia, sombras projetadas e oclusão da luz (parte da evolução da ADR 0029); animação da porta e partículas (M3.4). Só dev; física inalterada. 402 testes (6 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.35 — M3.2: camada 2D (dano, vinheta, fade) do Mundo em 2.5D (13/11/2026)
- **`Overlay2D`:** canvas 2D irmão do canvas do jogo, logo depois dele no DOM (abaixo do HUD), `pointer-events: none`, redimensionado só quando a tela/densidade mudam. Desenha **números de dano** (`addDamage` agora funciona; crítico amarelo e maior, dano no jogador vermelho), **vinheta de dano** (`hurtFlash`) e **fade de porta** (`fade`) com o mesmo código do 2D. `WORLD_THREE_OPTIONS`: `dt`, `hurtFlash` e `fade` → `honored`.
- Conferido no navegador (seed 42): números 99! / 12 / 37 acima do jogador, overlay sem pegar toques (o elemento sob o ponto continua sendo o canvas do jogo), sem erros. Ainda sem luz e dia/noite (M3.3), animação da porta e partículas (M3.4), interiores e dungeon (M4). Só dev; física inalterada. 396 testes (4 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.34 — M3.1: atores, itens caídos e anel da ovelha do Mundo em 2.5D (13/11/2026)
- **`ActorBillboards`:** jogador, NPCs, animais, goblins e monstros como planos verticais com a folha 2D (a `SpriteSheet` segue desenhando o quadro, o piscar de dano, a morte e a barra de vida), sombra no chão, nome de outros jogadores e coração de namoro; só os atores visíveis (teto 48, o jogador sempre), em pools por tamanho de canvas. `SpriteSheet.frameAspect` exposto. **`DropSprites`** (itens caídos com pulo e flutuação do 2D) e **`HoverRing`** (anel sob a ovelha). `WORLD_THREE_OPTIONS`: `actors`, `drops` e `hoverSheep` agora `honored`.
- Conferido no navegador (seed 42, 2D × 3D): NPCs da praça nas mesmas posições, itens caídos com ícone, sem erros; 121 atores no mundo, 3 desenhados na tela. Escala **provisória** (mesmo fator para todas as espécies). Ainda sem números de dano/flash (M3.2), luz e dia/noite (M3.3), animação da porta e partículas (M3.4), interiores e dungeon (M4). Só dev; física inalterada. 392 testes (7 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.33 — M2.4: efeitos de chão do Mundo em 2.5D; M2 concluído (13/11/2026)
- **`GroundFx`:** brilhos que piscam na água, **buraco enchendo de água** (folha de fluxo por UV) e **sombras de nuvens** à deriva, com a mesma matemática do 2D (`groundFxMath.ts`, testada): pools de tamanho fixo (96 brilhos, 16 fluxos, 16 nuvens), planos colados ao chão sem escrever profundidade. Conferido no navegador (seed 42): brilhos, 5 nuvens e 1 fluxo ao quebrar uma margem, sem erros.
- **M2 (Mundo estático) concluído** em `?render=3d` (só dev): chão por chunk, cubos, objetos altos (inclusive a cidade), água e nuvens. Faltam atores, itens, luz e dia/noite, efeitos (M3), interiores e dungeon (M4) e o piloto (M5). 385 testes (8 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.32 — M2.3: objetos altos do Mundo em 2.5D, atrás de `?render=3d` (13/11/2026)
- **`ChunkSprites`:** cada sprite 2D de objeto vira um plano vertical (base na face sul da célula, tamanho em células da arte, altura ÷ K), instanciado por chunk e sprite, reconstruído por `chunk.version` com orçamento. Sólidos escrevem profundidade (`alphaTest`); os de passar por cima (grama, flor, cultura, porta aberta) não, para nunca cobrir o personagem. **`worldSpriteArt`** repete as escolhas do `drawObject` 2D (variação por célula, porta por estado, cerca emendada por composição de canvas). `pick` pelo retângulo clicável do sprite (sem ler pixels). Arte que chega depois (cultura, dungeon) refaz os planos.
- **A cidade já aparece** (torres do portão, bancos, poço, arbustos, flores) com a mesma arte do 2D; árvores, pedras e mato também. Conferido no navegador (seed 42, 2D × 3D; praça e floresta), sem erros. Ainda sem animação de porta, luz/brilhos, água animada (M2.4), atores além do jogador e itens (M3), interiores e dungeon (M4). Só dev; física inalterada. 377 testes (3 novos do `ChunkSprites`). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.31 — M2.2: cubos do Mundo em 2.5D, atrás de `?render=3d` (13/11/2026)
- **`ChunkBlocks`:** cubos por chunk visível em malhas instanciadas por (bloco, forma `solid`/`thin`), reconstruídas só quando `chunk.version` muda (máx. 2 por quadro; a versão antiga fica na tela), liberadas fora da área; `pick` acerta os cubos e devolve a célula. **`worldBlockFaces`:** topo = textura de chão do material; frente **provisória** (topo escurecido, ou a frente V2 própria esticada a uma célula quando existe — terra sob a grama, casca da tora).
- Conferido no navegador (seed 42, 2D × 3D): fileira fina de tábuas, pilar de pedra de 2 níveis, terra/pedra, grama, tora e areia com as mesmas formas do 2D; pick no pilar certo; sem erros. A água ainda é estática (M2.4); árvores/objetos altos (M2.3), cidade, atores, luz e efeitos seguem fora. Só dev; física inalterada. 374 testes (3 novos do `ChunkBlocks`). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.30 — M2.1: chão do Mundo em 2.5D, atrás de `?render=3d` (13/11/2026)
- **`WorldThreeRenderer`** (só dev; o build de produção não o contém) e **`ChunkFloor`**: um plano por chunk visível com a textura do `ChunkRenderer` (Material V2, transições, barrancas e sombras como no 2D), orçamento de 2 chunks pintados por quadro, reenvio à GPU só quando a `version` muda e liberação dos chunks fora da área. O jogador (`actors[0]`) aparece em plano vertical com a escala do mundo (`CHARACTER_SCALE_FACTOR`, K = 1) e sombra; realces e `pick` no chão. `SpriteSheet.shadowRadii` exposto. `WORLD_THREE_OPTIONS` (mapa de paridade) no contrato.
- Conferido no navegador (seed 42, 2D × 3D no mesmo ponto): chão e jogador corretos, 16 chunks vivos, pick certo, sem erros. **Ainda sem** cubos/terreno alto, objetos, cidade, outros atores, luz e efeitos (fatias M2.2–M2.4 e M3/M4). Física inalterada. 371 testes (4 novos do `ChunkFloor`). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.29 — M1: núcleo 2.5D genérico em `render/three/` (13/11/2026)
- **Decisões do dono do produto (13/11):** aceitas as recomendações da ADR 0031 — Mundo em K = 1 desde o M2, degrau automático sai atrás de flag no piloto, prédios da cidade como planos na paridade, interiores isolados mantidos até o W5; arte de frente dos blocos e árvores provisória; clima (luz) padrão decidido no M3. ADR 0031 passa a **aceita**.
- **M1:** `ThreeStage`, `SelectionMarkers` e `BlockMaterials` extraídos do `SanctuaryThreeRenderer` (548 → ~395 linhas), que passa a compô-los. **Sem mudança visual nem de comportamento**: capturas antes × depois (padrão, `?luz=`, `?vista=inclinada`, `?paredes=teste`) idênticas fora da animação (o código antigo tem o mesmo ruído de 3 mil pixels no teste), mesmas estatísticas de GPU, pick e porta iguais. 2 testes novos do `SelectionMarkers` (367).
- **M0 (pendente do dono do produto):** FPS/memória em celular, iPad e Safari — o headless (swiftshader) não representa GPU real. Linha de base de referência (cena de teste do Santuário, swiftshader): 62 chamadas, 30 956 triângulos, 17 texturas. Sem mudança de protocolo, save ou servidor.

## Documentação — plano de migração do Mundo para Three.js e W5 pendente (13/11/2026, sem versão)
- **ADR 0031 (proposta):** fases M0–M7, decisões propostas (núcleo genérico `render/three/`, malhas por chunk com orçamento, chão = textura do `ChunkRenderer`, atores em billboards, física sem degrau atrás de flag, servidor só nos marcos que tocam `world/`/`net/`), riscos e 6 perguntas ao dono do produto. **W5** (paredes no Mundo) registrado como pendente, depois do M4. Nenhum código alterado.

## Orvalis v0.93.28 — W4: mármore V2/V3 removido (13/11/2026)
- **Decisão (dono do produto):** o Mármore Celestial (82) vira **cubo comum**; paredes novas são só as autotile (ADR 0027).
- **Removido:** par de níveis em um clique, base V3 de duas células (célula norte virtual), ordem de colocação, formas adaptativas e cantos em L do 82, borda ornamental, superfícies V3 e altura visual V3 da câmera (`sanctuaryMarbleAdaptive`, `sanctuaryV3Surfaces`, `World.marbleV3*`/`marblePlacement*`, textura de topo ornamentado). O 82 empilha e quebra um nível por vez e segue o autotile horizontal genérico (`thin`) como os outros celestiais. `SanctuaryBlockShape` agora é só `solid | thin`.
- **Salvamento v15:** v12–v14 migram descartando `marblePlacements`/`marbleV3Bases`; o 82 já colocado continua; a célula norte virtual das bases V3 deixa de existir.
- Testes: 6 arquivos de teste do mármore removidos, teste de migração reescrito (365 passando). Conferido no navegador (fileira, pilar empilhado, sem erros). Sem mudança de protocolo (o servidor só joga o Mundo principal).

## Orvalis v0.93.27 — Paredes e porta de parede alcançáveis no Santuário (13/11/2026)
- **Perfil do Santuário** (`world/profiles.ts`): `blocks` = 18 celestiais + `WALL_BLOCKS` (Tábuas, Pedra) + `WALL_DOOR_BLOCKS`. Aparecem no fim da hotbar (21 itens; ela já rola na horizontal); colocar/quebrar/abrir seguem as regras do `World` (porta só entre duas paredes comuns). A flag de teste `?paredes=autotile` foi removida (`?paredes=teste` continua).
- **Ícones:** continuam o SVG provisório de cor lisa (a porta ganhou o vão); ícones de arte ficam como pendência (precisam sair do atlas sem ler canvas).
- **Servidor:** nada a sincronizar agora — só o Mundo principal joga online (`online` em `main.ts`) e ele não lista paredes. Sincronizar (`build:net` + `sync-net`) quando as paredes forem ao Mundo (W5) ou o Santuário for online.
- Testes: perfil do Santuário × Mundo, colocar parede/porta pelo perfil (403 passando). Invariante do `CLAUDE.md` ("Vários mundos") e DECISIONS/worlds atualizados. Sem mudança de protocolo ou save.

## Orvalis v0.93.26 — Arte final de Tábuas (nova versão) com a porta (13/11/2026)
- **Recebidas e conferidas as 23 peças de Tábuas** (16 tampas, 4 frentes, `door_closed/half/open`): tamanhos e faixas de y corretos, **nenhum alfa parcial**, frentes 100% opacas, vãos de 32 e 64 px centralizados a partir de y = 16, bordas da porta idênticas às de `front_mid`, **emendas exatas** (0) entre frentes, tampas e coluna × fileira.
- Arquivadas em `assets-src/paredes/tabuas/` (a versão anterior de 16 px vai para `versao-anterior-16px/`); atlas regerado (`walls-tabuas.webp`, 512 × 820, ~44 kB). Os quadros provisórios da porta deixam de ser usados para Tábuas.
- Verificado no navegador: porta fechada, intermediária, aberta e com a Deusa atravessando. Sem mudança de código, protocolo ou save.

## Orvalis v0.93.25 — Porta de parede com 3 quadros (13/11/2026)
- **Domínio:** `Block.WALL_DOOR_PLANKS` (242) / `_OPEN` (243), `shape: 'wall-door'`, par em `TOGGLES` (estado no id, ação de rede `kind:'door'`, salvamento sem mudança de formato). Fechada é sólida; aberta passável. **Colocação** (`World.canPlaceWallDoor`): só em fileira leste–oeste, com **parede comum** (não porta) dos dois lados e nada ao norte/sul. Conta como parede para o autotile (`isWallLike`): tampa `cap_10`, frente = quadro da porta. Quebrar devolve a fechada. `wallDoor.test.ts` (7 testes).
- **Render:** atlas 512 × 820 com 3 quadros extras (`door_closed`, `door_half`, `door_open`, 128 × 154) em `wallAtlas.ts`; ao abrir/fechar, o quadro intermediário aparece por 140 ms (`DOOR_HALF_MS`). Cubo preto corrigido (`sanctuaryThreeLayout` exclui `wall-door`). `?paredes=autotile` libera a porta na hotbar (teste).
- **Arte:** contrato (seção 3b) e `gabarito-porta.png` (vão 0/32/64 px, batente e verga de 16 px, folhas encostadas nos lados quando aberta, como no Core Keeper). Enquanto a arte não chega, `build-wall-atlas.py` gera quadros **provisórios** a partir de `front_mid`; a Pedra fica sem porta.
- Sem mudança de protocolo ou save. Servidor ainda precisa sincronizar (`build:net` + `sync-net`) quando paredes/porta forem alcançáveis.

## Orvalis v0.93.24 — Vertical no celular e no tablet, como opção (13/11/2026)
- **Fase 1 (desbloqueio):** o `ScreenMode` não trava mais a orientação em paisagem e some a camada "Gire o aparelho" (`blocked` removido; `Game` não pausa em retrato). Expõe `isPortrait` e `data-orientation`/`data-device` em `<html>`. A câmera, em pé, usa largura mínima de 8 células (`PORTRAIT_MIN_CELLS_WIDE`): célula ~48 px no celular em pé contra ~28 px deitado.
- **Fase 2 (layout vertical):** a hotbar quebra em linhas e cabe tudo sem rolar (`width: max-content` + `flex-wrap`); `hud.ts` publica `--hotbar-h` (`ResizeObserver`) e o CSS posiciona joystick, botão de ação e caixa de conversa acima dela; minimapa menor; tablet em pé com espaços e controles maiores. A horizontal não muda.
- **ADR 0030** substitui a regra "jogo horizontal" (CONVENTIONS atualizado). Testes de câmera em pé (5, total 393). Conferido no navegador em celular em pé (390 × 844), celular deitado, tablet em pé (820 × 1180) e Mundo em pé.
- **Pendente:** versões em coluna dos painéis largos (bolsa, baú, receitas, profissões) e teste em aparelho real. Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.23 — Parede de Pedra com arte no Santuário (13/11/2026)
- **Arte recebida e conferida** (16 tampas + 4 frentes, `assets-src/paredes/pedra/`): tamanhos e faixa de y de cada forma corretos, nenhum alfa parcial, **emendas exatas** (0 de 128), franja de 16 px e junções resolvidas, igual a Tábuas.
- **Pipeline:** `build-wall-atlas.py pedra` → `src/assets/walls-pedra.webp` (8 kB); `WALL_ART_MATERIALS` e `ArtPack.wallAtlases` ganham `WALL_STONE`. A Pedra deixa de usar cor lisa (o protótipo só resta para materiais futuros sem arte). Teste do registro atualizado (388).
- Verificado no navegador: sala de pedra com porta, T e poste, ao lado de uma coluna de tábuas. Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.22 — W3: paredes de Tábuas com a arte real no Santuário (13/11/2026)
- **Pipeline de arte:** `scripts/build-wall-atlas.py <material>` monta o atlas (16 tampas 4 × 4 + 4 frentes; 512 × 666, WebP sem perdas, ~9 kB) em `src/assets/walls-<material>.webp`; registrado no pacote de arte do Santuário (`ArtPack.wallAtlases`, `art/santuario.ts`) — ADR 0010.
- **Regras puras testadas** (`render/wallAtlas.ts`, 6 testes): layout do atlas, máscara da tampa e escolha da frente (`wallArtPiece`: frente só onde não há parede ao sul; poste isolado/fim de coluna = `front_post`).
- **Render** (`render/sanctuaryWallArt.ts`): por parede, um plano horizontal (tampa) à altura `WORLD_SCALE.wall` e, quando há frente, um plano vertical com a base na face sul da laje; instanciado por peça (20 malhas por material), `alphaTest` na transparência. Tampa e frente se encontram na tela como no gabarito. O `pick` acerta frente, tampa e vão.
- **Materiais sem arte** (Pedra) continuam em cor lisa (`sanctuaryWallPrototype.ts`, que passa a pular os materiais com atlas). `?paredes=autotile` segue liberando as paredes na hotbar (teste). Sem mudança de protocolo, save ou servidor.
- **Verificado no navegador:** sala com porta, coluna solta, bloco isolado e T; a Deusa atrás da parede (só a cabeça por cima), na frente (cobre a frente) e ao lado.

## Documentação — arte final de Tábuas com franja única de 16 px (13/11/2026, sem versão)
- **Entrega do dono do produto no contrato novo:** 16 tampas (128 × 128) + 4 frentes (128 × 154, com pregos nos cantos e moldura de 16 px). Conferência: tamanho e faixa de y de cada forma corretos; **nenhum alfa parcial**; **emendas exatas** (0 de 128); franja de 16 px uniforme (tampas e molduras); a franja da coluna faz a curva e segue como franja da fileira nas junções (`cap_03`, `07`, `09`, `15`…), sem linha cruzando o miolo. Sala montada (cantos, coluna solta, T e cruz de teste): coerente.
- Arquivada em `assets-src/paredes/tabuas/`; a versão anterior vai para `versao-franja-variada/` (histórico). `scripts/fix-wall-cap-junctions.py` fica só para a versão antiga (a arte nova já traz a junção resolvida).
- **Tábuas completa, exceto a porta.** Nenhum código de jogo alterado.

## Documentação — franja única de 16 px no contrato de arte das paredes (13/11/2026, sem versão)
- **Decisão do dono do produto:** todas as franjas da composição com a **mesma espessura, 16 px (0,125 célula)**, para dar continuidade. Medido na arte atual de Tábuas: ~25 px nas colunas, ~5 px na fileira, ~6–8 px nas molduras das frentes (não coincidiam).
- **Contrato e gabarito regerados** (`make-wall-guide.py --franja 16`): coluna = franja 16 | miolo 96 | franja 16; fileira = franja 16 na borda norte + miolo de 28; moldura da frente de 16 px; **na junção coluna × fileira a franja faz a curva** e segue como franja da fileira (sem linha cruzando o miolo). O gabarito passa a desenhar as franjas em cada uma das 16 tampas.
- **As 20 peças de cada material precisam ser refeitas** (Tábuas e Pedra); a arte atual de Tábuas vira referência de estilo. Nenhum código de jogo alterado.

## Documentação — junções coluna × fileira da Parede de Tábuas corrigidas (13/11/2026, sem versão)
- **Defeito apontado pelo dono do produto:** onde uma coluna chega a uma fileira, a linha clara do topo da fileira (e as marcas escuras da faixa) atravessava o miolo da coluna em vez de sumir.
- **Correção** (`scripts/fix-wall-cap-junctions.py`): nas tampas com coluna tocando fileira (`cap_03`, `06`, `07`, `09`, `11`, `12`, `13`, `14`, `15`) o miolo da coluna é copiado de `cap_05` nas linhas da faixa da fileira (com vizinho norte) ou só na aresta inferior que cruzava o miolo (canto de cima, que mantém o fechamento do topo). Originais em `assets-src/paredes/tabuas/antes-juncoes/`. Emendas L/O e N/S seguem exatas (0 de 128). Pedir à arte, nas próximas peças (Pedra), a junção já resolvida: o miolo da coluna não é cortado pela linha da fileira.
- Nenhum código de jogo alterado.

## Documentação — arte final da Parede de Tábuas recebida (13/11/2026, sem versão)
- **Entrega do dono do produto no contrato da laje:** 16 tampas (128 × 128) + 4 frentes (128 × 154). Conferência: tamanho e modo corretos; cada tampa cobre exatamente a faixa de y da sua forma (4 formas); **nenhum alfa parcial** (frentes opacas); **emendas exatas** (0 diferenças nas 64 + 64 combinações L/O e N/S; `cap_10` e `cap_05` repetidos sem costura). Sala montada com a arte (cantos, coluna solta, bloco isolado): coerente.
- Arquivada em `assets-src/paredes/tabuas/`; a primeira entrega fica em `entregue-03/` (referência) e a adaptação provisória em `adaptada-032x044/` (aposentada).
- **Tábuas completa, exceto a porta.** Nenhum código de jogo alterado.

## Orvalis v0.93.21 — Decisão final: coluna da largura da célula (x = 1,0 · z = 0,35) (13/11/2026)
- **Decisão do dono do produto:** `DEFAULT_WALL_THICKNESS` = `{ x: 1, z: 0.35 }`. Com `x = 1` só os vizinhos norte/sul mudam a forma da tampa (**4 formas** para as 16 máscaras); leste/oeste só mudam o acabamento das bordas. Testes novos (padrão, 4 formas, coluna contínua, frentes).
- **Contrato e gabarito regerados** (`CONTRATO.tpl.md` reescrito): laje 128 × 44 px, braços N/S 42, frente 128 × 154 (4 peças opacas), 16 tampas 128 × 128 sobre 4 formas, franja da coluna 27 | miolo 74 | 27, franja da fileira 9 px ao norte. Das peças de Tábuas valem `front_mid` e `cap_10`; as outras 18 serão refeitas (as antigas ficam como referência de estilo).
- Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.20 — Colunas largas com franjas (`espessura` até 1,0) e correção da leitura do Core Keeper (13/11/2026)
- **Correção:** a medida da coluna estava errada. Com a escala certa da cena (tile ≈ 90 px), a coluna do Core Keeper tem **≈ 0,9–1,0 tile** de largura: `franja clara (~0,21) | miolo escuro (~0,5) | franja clara (~0,21)`, com juntas a cada tile e, no fim ao sul, uma frente iluminada com a largura da coluna. A "faixa fina de 0,2" que eu medi era só uma das franjas. A tampa leste–oeste continua ≈ 0,3 de profundidade, com uma franja clara na borda norte.
- **`world/walls.ts`:** `clampWallThickness` aceita até **1,0** (coluna = célula inteira); `wallFootprintParts` devolve cada parte com o tipo (`post`/`n`/`s`/`w`/`e`) e omite os braços leste/oeste de comprimento zero; `wallFrontRanges` não gera faixas de comprimento zero. O padrão **não mudou** (0,25 / 0,35) até a decisão. 24 testes de paredes.
- **Protótipo:** a tampa agora tem franjas (coluna: franja | miolo | franja com junta; fileira: franja na borda norte). `?mundo=santuario&paredes=autotile&espessura=0.9,0.35` ou `=1,0.35` para comparar.
- Sem mudança de jogo, protocolo ou save.

## Documentação — frentes da Parede de Tábuas recebidas (13/11/2026, sem versão)
- **Entrega do dono do produto:** `front_mid` (128 × 154), `front_end_left`/`front_end_right` (83 × 154) e `front_post` (38 × 154): painéis de tábuas com moldura e montantes.
- **Conferência:** alturas iguais e arte consistente, mas (1) as medidas são as do contrato antigo (pontas 83 e poste 38; final 80 e 32); (2) a última coluna e a última linha de cada peça e as juntas entre tábuas estão **semitransparentes** (alfa ~27–30%), o que deixa o chão aparecer pela parede e desenha linhas claras nas emendas.
- **Ajuste:** `scripts/retarget-wall-fronts.py` compõe o alfa parcial sobre uma cor de junta (opaco) e reprojeta as larguras para a medida final. Original em `assets-src/paredes/tabuas/entregue-03/`, ajustadas em `assets-src/paredes/tabuas/` (provisórias). Com as 16 tampas, **a parede de Tábuas está completa, exceto a porta**; montada em sala de teste, as emendas ficam contínuas.
- Nenhum código de jogo alterado.

## Documentação — tampas da Parede de Tábuas recebidas (13/11/2026, sem versão)
- **Entrega do dono do produto:** as 16 tampas (`cap_00`…`cap_15`) de Tábuas, 128 × 128 RGBA. Conferidas: formas e índices corretos, alfa binário, braços **idênticos** entre as peças que os têm e emendas exatas (diferença 0). Vieram com a espessura do contrato antigo (poste 38 × 38).
- **Adaptação:** `scripts/retarget-wall-caps.py` reprojeta as 16 peças para a medida final (poste 32 × 44, braços 48 e 42) esticando cada faixa por partes; topologia e emendas preservadas (checadas). Original em `assets-src/paredes/tabuas/entregue-03/`, adaptadas em `assets-src/paredes/tabuas/` (provisórias; `LEIA-ME.md`).
- Faltam as 4 frentes e a porta. Nenhum código de jogo alterado.

## Orvalis v0.93.19 — Iluminação dinâmica e neblina escura (`?luz=`) (13/11/2026)
- **ADR 0029:** camada de iluminação 2.5D como a da referência do Core Keeper: escuridão ambiente com poças de luz (Deusa + blocos que brilham: Musgo Luminoso, Cristal da Vida, Bloco de Luz; no Mundo: fogueira, caldeirão, forno), decaimento suave, tinta quente e oscilação do fogo.
- **Regras puras** em `render/lighting.ts` (+ 6 testes): `parseAmbient`, `lightFalloff`, `glowLightFor`, `pickLights` (teto `MAX_LIGHTS` = 12), `flickerFactor` determinístico. **Shader** em `render/sanctuaryLighting.ts` (sobreposição de tela cheia, sem tocar nas malhas).
- **Liga por `?mundo=santuario&luz=noite|penumbra|0..1`** (só vista oblíqua); sem o parâmetro nada muda. HUD sem escurecer. Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.18 — Espessura das paredes fechada em 0,25 / 0,35; contrato gerado (13/11/2026)
- **Decisão do dono do produto:** `DEFAULT_WALL_THICKNESS` = `{ x: 0.25, z: 0.35 }` (faixas e poste de 0,25; tampa de 0,35). A foto do protótipo no iPad confirmou a leitura.
- **Gabarito e contrato regerados** com a medida: poste 32 × 44 px, braços 48 (L/O) e 42 (N/S), frentes 128/80/80/32 × 154, face sul a 42 px da borda da célula. O `CONTRATO.md` agora é **gerado** por `scripts/make-wall-guide.py` a partir de `CONTRATO.tpl.md` (números sempre iguais aos do gabarito e do código); `--tx/--tz` mudam a espessura.
- Testes ajustados ao novo padrão (27 de paredes). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.17 — Espessura das paredes ajustável por eixo (`?espessura=x,z`) (13/11/2026)
- **`WallThickness { x, z }`** em `world/walls.ts`: `x` = largura das faixas norte–sul e do poste; `z` = profundidade da tampa das fileiras leste–oeste (e a posição da face sul na célula). `wallFootprint` e `wallFrontRanges` recebem a espessura (padrão `DEFAULT_WALL_THICKNESS` = 0,3 / 0,3, o valor aprovado). `parseWallThickness` lê `0.25,0.35` (ou só `0.3`) e limita a 0,1–0,9. Testes novos (27 de paredes).
- **Protótipo:** `?mundo=santuario&paredes=autotile&espessura=0.25,0.35` aplica a espessura nas paredes de cor lisa. Só teste; sem mudança de jogo, protocolo ou save.
- **`scripts/make-wall-guide.py --tx --tz`** regera o gabarito com a espessura escolhida (padrão 0,3 / 0,3).

## Documentação — especificação da arte das paredes (12/11/2026, sem versão)
- **`assets-src/paredes/CONTRATO.md`** e **`gabarito.png`** (gerado por `scripts/make-wall-guide.py` a partir das medidas do código): 1 célula = 128 px, placa de 38 px, braço de 45 px, frente de 154 px (1,2 célula); 4 frentes (`front_mid` 128, `front_end_left`/`right` 83, `front_post` 38 × 154) e 16 tampas (128 × 128, índice N·1 + L·2 + S·4 + O·8) por material; regras de emenda, luz, posição de montagem, conferência e brief curto. Materiais: tábuas e pedra primeiro. Nenhum código de jogo alterado.

## Orvalis v0.93.16 — Paredes: placa fina e protótipo de autotile (`?paredes=autotile`) (12/11/2026)
- **Observação do dono do produto confirmada nas medidas do Core Keeper:** fileiras norte–sul são faixas finas (~0,2–0,3 célula) e só o último bloco ao sul mostra a frente; fileiras leste–oeste têm frente de célula inteira. Modelo: **placa fina** de `WALL_THICKNESS` = 0,3 (poste central + braços até a borda), com a colisão ainda na célula inteira.
- **`world/walls.ts`:** `wallFootprint` (pegada), `wallFrontRanges` (faixas de frente expostas), `wallThin`; `wallFront` ganha `end` e passa a devolver `null` só nas continuações de fileira norte–sul. Atualiza os testes (21 de paredes).
- **Protótipo de render com cores lisas** (`render/sanctuaryWallPrototype.ts`): cada parede vira poste + braços de altura `WORLD_SCALE.wall`; o autotile aparece sozinho (frente só no primeiro bloco, faixas finas, porta como vão). `pick` acerta a frente, a tampa e o vão da célula. Ligado por `?mundo=santuario&paredes=autotile`, que libera as paredes de tábuas e de pedra na hotbar do Santuário (só teste, só no render 3D; o `?render=2d` não desenha paredes).
- Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.15 — Paredes W2: bloco `wall` no domínio e autotile testado (12/11/2026)
- **Blocos novos** (`Block.WALL_PLANKS` 240, `Block.WALL_STONE` 241; forma `wall`): sólidos, de **nível único**, quebráveis (machado na madeira, picareta na pedra). `isWall`, `WALL_BLOCKS`. Sem receita, sem perfil e sem arte ainda: **inalcançáveis pelo jogador** até a W1 (arte) e a W3 (render).
- **Regras no `World`** (sem código novo de colocação: a regra existente já serve): coloca no nível 0, bloqueia a passagem (`standHeight` nulo, nunca degrau), não empilha nem vai sobre cubo. `World.isWallAt` e `World.wallPieceAt(x, y)`.
- **Autotile puro** em `world/walls.ts`: frente (`single`/`left`/`mid`/`right`, escondida com parede ao sul), tampa de 16 peças (máscara N/E/S/W) e cantos internos (NE/SE/SW/NW). Qualquer material conecta com qualquer outro.
- Testes: `walls.test.ts` (autotile) e `wallBlock.test.ts` (regras, quebra, recálculo da vizinha, salvar/restaurar). Sem mudança de protocolo ou save (ids novos, formato igual); o pacote do servidor só precisa sincronizar quando as paredes ficarem alcançáveis (W3).

## Orvalis v0.93.14 — Escala do Core Keeper na vista do Santuário (12/11/2026)
- **ADR 0028 aceita (reescrita):** vale a relação medida no Core Keeper, não "1 m": cubo de frente 1,0 (K = 1), parede ≈ 1,2, personagem ≈ 1,2. `render/worldScale.ts` guarda as constantes.
- **Vista real do Santuário:** `OBLIQUE_K` passa de 18/32 para **1** (frente do cubo quadrada, que usa a imagem quadrada do topo escurecida); a Deusa usa 1,2 (fator `CHARACTER_SCALE_FACTOR` sobre a escala antiga); a face do mármore V3 vira 2 níveis. A câmera ganha `setCellsTall` e o renderer pede **14 células na vertical** (`GameRenderer.preferredCellsTall`; piso de zoom desce a 0,5 nesse caso); o Mundo 2D continua com 10.
- **ADR 0027 ajustada:** parede ≈ 1,2 célula (não "2 cubos"); paredes do sul/laterais finas a validar. Os 2 níveis de cubo ficam por ora.
- O teste `?paredes=teste` continua; o grupo ATUAL usa o K antigo para comparar. `?vista=inclinada` (reserva) não muda. Sem mudança de protocolo ou save.

## Orvalis v0.93.13 — Teste da escala: comparativo com a medida do Core Keeper (12/11/2026)
- **Medida de uma cena do Core Keeper** (captura enviada pelo dono do produto): personagem ≈ 1,2 tile, frente da parede ≈ 1,2 (≈ a altura do personagem), vaca ≈ 1,2, cerca ≈ 0,65, árvore 3,5–4; paredes do sul e laterais finas; tampa escura; luz dinâmica. Registrada na ADR 0028, agora **em revisão**.
- **Teste de escala com três grupos** (`?mundo=santuario&paredes=teste`): ATUAL, PROPOSTA (1,75 / parede de 2 cubos) e CORE KEEPER (personagem 1,2 / parede 1,2), cada um com cubo, parede, régua vertical e personagem de referência. A Deusa usa a escala de `?escala=atual|proposta|core` (padrão `core`).
- Só visual e descartável; sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.12 — Teste da escala do mundo: 1 célula = 1 m (12/11/2026)
- **ADR 0028 (direção aprovada):** 1 célula = 1 m; vista oblíqua com K = 1,0 (cubo de frente quadrada); parede = 2 cubos = 2 m; personagem ≈ 1,75 m (≈ 0,8 × a escala antiga). A ADR 0027 passa a usar a altura de 2 cubos.
- **Teste reformulado** (`?mundo=santuario&paredes=teste`): escala ATUAL e NOVA lado a lado (cubo, parede de 2 cubos, régua vertical de 1 m por segmento, régua de 1 m no chão e personagem de referência parada); a Deusa que se mexe usa a escala nova. Substitui o teste de três alturas da v0.93.11. Só visual, descartável; o jogo e o `OBLIQUE_K` da vista continuam como estavam.
- Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.11 — Paredes: ADR 0027 e teste de proporção (12/11/2026)
- **ADR 0027 (aprovada):** parede = bloco de nível único, sólido, altura visual fixa, com autotile (frente solta/ponta/meio/ponta + tampa de 16 peças) e porta; vale para Santuário e Mundo; o mármore V2/V3 será aposentado.
- **Teste de proporção:** `?mundo=santuario&paredes=teste` mostra três paredes lisas com a frente de 0,75, 1,0 e 1,25 célula (régua de 1 célula no chão e a altura escrita) para escolher a altura olhando. `render/sanctuaryWallProportionTest.ts`; sem lógica de jogo e descartável.
- Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.10 — Vista oblíqua é o padrão do Santuário (12/11/2026)
- **Decisão do dono do produto:** aprovada a vista oblíqua (v0.93.9). `main.ts` passa a usá-la por padrão; `?vista=inclinada` volta à câmera inclinada a 67° (reserva, sem as correções de cor e de personagem).
- **Mármore (V2/V3)** segue como teste provisório: legível na oblíqua, mas não será refinado; as paredes serão redesenhadas (próxima etapa, ver NEXT_STEPS).
- Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.9 — Experimento: vista oblíqua do Santuário (`?vista=obliqua`) (12/11/2026)
- **Teste da recomendação da ADR 0026:** `SanctuaryThreeRenderer` ganha a vista `oblique` (opção do construtor; `main.ts` lê `?vista=obliqua`). A câmera olha reto para baixo (chão em quadrados perfeitos) e a altura vira deslocamento fixo na tela de `OBLIQUE_K = CUBE_FRONT / TILE` (18/32) por nível, a proporção da arte 3/4. O padrão continua a câmera inclinada a 67°.
- **Matemática pura e testada** em `render/sanctuaryObliqueView.ts` (+ testes): matriz de projeção montada à mão (x, y com cisalhamento, profundidade que põe o sul e o alto na frente), raio do cursor para a seleção (sobe 1 de altura a cada K de célula para o sul).
- **Efeitos na vista oblíqua:** a Deusa deixa de ser achatada (plano com altura 3,0/K, ocupa 3,0 células em tela como no 2D); cores fiéis à arte (material sem luz; a frente do bloco recebe um escurecimento frio fixo); o `pick` usa o raio oblíquo (topo, frente e chão conferidos).
- **Fora do experimento:** compensações do mármore V3 (calibradas para 67°) não se aplicam; sem contorno nos blocos nem partículas ainda. Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.8 — Goblins: folha de ataque nova (12/11/2026)
- **Folha de ataque refeita** a partir da imagem enviada (`assets-src/goblin/attack.png`; `process-sprite.py --alpha --largest --frame-h 160` → `optimize-assets.py`, WebP). Agora as sete folhas do goblin seguem o mesmo padrão e todas usam `GOBLIN_H` (acaba o "pulo" de ~4 px ao atacar).
- Só a ponta do cajado em um quadro (esquerda, 3º) encosta na borda do quadro (7 px de altura na folha de 160): invisível em jogo.
- Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.7 — Goblins soltam 2 moedas de cobre (12/11/2026)
- **Item novo:** Moeda de Cobre (`Item.COPPER_COIN`, `loot: true`, ícone `icon-copper-coin.webp` a partir da arte enviada pelo dono do produto, `assets-src/moeda-cobre.png`). Sem uso ainda (futuras lojas e trocas).
- **Espólio do goblin:** `monsterDrops('goblin')` devolve sempre 2 moedas (`GOBLIN_COIN_DROP`, fixo, sem sorteio), no jogo e na sala (os dois usam `monsterDrops`). Substitui o `[]` provisório.
- **Ferramenta:** `scripts/make-item-icon.py` (recorta pela borda do desenho, quadrado transparente, 64 px, WebP sem perdas).
- **Servidor:** a sala precisa do pacote novo para soltar as moedas (item novo; protocolo continua 20 e save 14).
- Testes: `goblinLoot.test.ts`.

## Orvalis v0.93.6 — Goblins: folhas novas em alta resolução e em WebP (12/11/2026)
- **Arte refeita** a partir das seis folhas enviadas pelo dono do produto (`assets-src/goblin/{idle,walk,run,alert,hurt,death}.png`, 4×4 transparente, ordem frente/esquerda/direita/costas): `process-sprite.py --alpha --frame-h 160` (`--largest` em tudo menos no alerta, para manter os "!") → `optimize-assets.py`.
- **WebP:** as 7 folhas (as seis novas + a de ataque, ainda a antiga) saíram de ~5,4 MB em PNG para ~0,83 MB; imports em `render/art/principal.ts` agora `.webp`.
- **Tamanho em tela preservado:** o desenho novo ocupa ~95% do quadro (o antigo ~89%, com pés acima da base); as folhas novas usam `GOBLIN_H = TILE * 1.6` (0,94 × 1,7) e os pés na base do quadro. A folha de ataque continua em `TILE * 1.7` até ser refeita.
- **Orçamento:** `build-artifact.mjs` passa a contar `goblin-*` como "depois do início" (carregam sob demanda, como lobos e NPCs): início do Mundo ≈ 2,9 MB (era 8,2 MB com os PNGs).
- Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.5 — Fase 1 do render WebGL: perda de contexto, tipagem e linha de base (12/11/2026)
- **Perda de contexto WebGL:** o `SanctuaryThreeRenderer` trata `webglcontextlost` (com `preventDefault`) e `webglcontextrestored` (refaz malhas e texturas de canvas); testado no navegador com `WEBGL_lose_context`. Listeners removidos no `dispose`.
- **Tipagem:** `@types/three@0.187.0` (dev) no lugar da declaração de protótipo `src/three/three.d.ts`; o renderer deixa de usar `any`.
- **Contrato:** `GameRenderer.stats?()` (chamadas, triângulos, geometrias, texturas, contexto perdido) e `SANCTUARY_THREE_OPTIONS`, mapa de paridade que obriga classificar todo campo novo de `RenderOptions`.
- **Linha de base (Playwright, GL por software, só relativa):** Santuário 3D = 14 chamadas, ~30,8 mil triângulos, 4 geometrias, 3 texturas, `draw()` ≈ 1 ms de JS, heap ≈ 13 MB; o baixo FPS do headless vem do GL por software, não do JS. FPS real exige aparelho. Artefato do Santuário: HTML 0,8 MB, início ≈ 2,3 MB.
- Sem mudança de jogo, protocolo ou save.

## Documentação — ADR 0026: render 2.5D em WebGL (12/11/2026, sem versão)
- Decisão do dono do produto: referência Core Keeper; arte 2D como fonte, geometria só nas paredes, atores em billboards, física sólida, iluminação primeiro, chão por chunk, Canvas 2D como reserva até a paridade. Plano em 6 fases em `NEXT_STEPS.md`. Nenhum código alterado.

## Orvalis v0.93.4 — Aviso do 3º nível descartado e pacote de rede sincronizado (12/11/2026)
- **Descarte deixa de ser silencioso:** `World.restoreChunk` passa a devolver quantos blocos do 3º nível (aposentado com `MAX_STACK = 2`) foram descartados. `applySave` repassa o total (`droppedBlocks`) e o `Game` mostra um aviso ao abrir um mundo salvo antigo. Salvamento e regras de nível não mudam (`SAVE_VERSION` 14).
- **Sala do servidor:** `Room.restore` guarda o total em `droppedOnRestore` e marca a sala como suja quando algo foi descartado, para a próxima gravação já gravar a sala limpa; o servidor registra o número no log.
- **Servidor:** pacote de rede regenerado (`build:net` + `sync-net`) com goblins (PR #96), `MobState.v` e o limite de 2 níveis. `PROTOCOL_VERSION` continua 20 (campo novo opcional, compatível).
- Testes: `restoreDropped.test.ts` (conta/descarta o 3º nível; save sem 3º nível não descarta).

## Orvalis v0.93.3 — Santuário: face ancorada pela base inferior (12/11/2026)
- **Bug visual reportado por foto e vídeo:** a v0.93.2 alinhava a borda superior das paredes ao topo lógico, mas a face tinha apenas ~85% da altura projetada de uma célula. A parte inferior terminava antes da borda inferior da célula clicada e paredes adjacentes pareciam desencontradas.
- **Correção do desenho, sem mexer na física:** com câmera ortográfica a 67°, a altura *visual* do plano frontal passa a ser `tan(67°)` (aproximadamente 2,356 unidades Three.js) para preencher exatamente uma linha de 32×32 em projeção. Topos e meio-topos usam a mesma altura visual, e o deslocamento de profundidade passa a ser `alturaVisual/tan(67°) = 1 célula`. A base inferior coincide com a borda sul da célula clicada; a face termina em sua borda norte, encostando no meio-topo adjacente.
- **Seleção e salvamento preservados:** realces seguem a altura visual, mas as duas células de ocupação, a colisão de dois níveis, o save v14, os outros materiais e o Mundo principal permanecem como antes. Testes conferem limites projetados da face e encaixe no meio-topo, além dos cenários existentes de colunas/horizontais/casa. Verificação visual no navegador ainda necessária.


## Orvalis v0.93.2 — Santuário: ancoragem visual na célula clicada (12/11/2026)
- **Face e topo na posição correta:** a câmera a 67° projetava a face vertical de dois níveis e o meio-topo sobre células superiores às de construção, embora a ocupação lógica estivesse correta. O render Three.js agora compensa a elevação da superfície em Z: deslocamento visual = altura máxima (2) / tan(67°). A face aparece na célula-base e o meio-topo na célula imediatamente ao norte, sem alterar o World, os blocos persistidos nem a câmera.
- **Seleção e demolição:** os realces de hover e quebra usam a mesma transformação para permanecer sobre a geometria visível; colunas, paredes horizontais, cantos e construções salvas continuam com a classificação V3 existente. Testes de projeção certificam que face e meio-topo não migram mais uma célula para cima. Necessária inspeção final no navegador real.


## Orvalis v0.93.1 — Santuário: corrigir topo duplicado na V3 (12/11/2026)
- **Superfícies em vez de cubos redundantes:** a malha V3 diferencia `v3_face`, `v3_top` e `v3_top_half`. Uma única face de altura física 2 é desenhada na borda sul da sequência, os topos completos aparecem só nas células intermediárias e um meio-topo fecha a extremidade norte; a segunda camada não repete a malha. Horizontal simples apresenta apenas face e meio-topo, sem topo completo indevido.
- **Material e câmera:** os planos reutilizam o material já aprovado (frente +Z, cobertura +Y) e as máscaras de ornamentação ocultam emendas de topos adjacentes. Nenhuma alteração na ocupação física/lógica, colisão, construção, demolição, salvamento v14 ou Mundo principal. Malhas e regras cobertas por novos testes; conferência visual no jogo permanece recomendada.


## Orvalis v0.93.0 — Santuário: construção de paredes V3 (12/11/2026)
- **Ocupação:** novas bases de Mármore Celestial 82 ocupam duas células em planta (a escolhida e a imediatamente ao norte) e os dois níveis de altura por célula. Bases verticais separadas por duas linhas criam face inferior, topo inteiro interno e meio-topo terminal; paredes horizontais e quadrados ficam conectados.
- **Regras:** a segunda célula é derivada da base única no World; a colisão, a colocação, a seleção de blocos e a quebra respeitam a ocupação compartilhada. O renderizador Three.js usa as geometrias existentes, incluindo as bordas ornamentadas recalculadas.
- **Save v14:** persistência das âncoras V3; saves v13 e anteriores conservam painéis V2 sem conversão geométrica. Outros materiais e Mundo principal não são alterados intencionalmente. Encontros L/T e linhas opostas ainda exigem conferência visual.

## Orvalis v0.92.1 — Santuário: paredes adaptativas V2 (12/11/2026)
- **Construção vertical do Mármore Celestial 82:** ao acrescentar uma parede ao NORTE (acima na tela), a parede antiga completa sua profundidade e a nova nasce como pilar inteiro. Ao acrescentar uma parede ao SUL (abaixo), somente a nova vira pilar e a parede original mantém a metade frontal. A extensão descendo preserva o início de linhas horizontais, inclusive entre colunas opostas, sem preencher um bloco pré-existente indevidamente.
- **Persistência:** o Santuário grava a ordem de colocação de cada painel no salvamento v13; migração dos saves antigos v12 preserva as estruturas anteriores com a regra legada (ordem 0). Remover uma parede limpa seu histórico. A altura continua em dois níveis e a geometria superior herda a base; demais materiais e o Mundo principal não mudam.
- **Validação:** testes de construção nas duas direções, fileiras opostas, sequência descendente, remoção e ida-e-volta do salvamento; revisão visual em navegador/Safari ainda recomendada antes de considerar a solução definitiva.

## Orvalis — Goblins em acampamentos de sete (PR #96)
- **Mundo principal:** quatro acampamentos determinísticos por seed, cada um com sete goblins circulando uma fogueira real `Block.CAMPFIRE`. Localização fora de cidade/dungeon/caverna e solo seguro; vegetação dos sete pontos é limpa pelo mesmo gerador procedural de terreno. A fogueira pode ser quebrada e restaurações reconciliam acampamentos removidos.
- **Combate:** Goblin comum com 60 pontos de vida, ataque-base 15, aggro apenas a até três células como os lobos; defesa 2, perseguição territorial, dano, recuo e respawn no motor existente. Dano nominal usa fórmula de combate e não é um valor líquido invariável. Sem itens de saque inventados (drop vazio por enquanto).
- **Arte:** sete pranchas fornecidas (caminhada, idle, ataque, dano, morte, alerta e corrida), convertidas em folhas 4×4 com transparência e registradas só no pacote do Mundo principal. Frames por direção e estado sincronizados no multiplayer; testes para geração, combate, animações e salvamento. Santuário intocado.


## Santuário — linha horizontal contínua com canto em L (PR #95)
- Corrigida a situação em que uma coluna norte–sul sobe em uma extremidade de uma linha horizontal e outra desce na extremidade oposta. O autotile do Mármore Celestial 82 mantém a faixa superior de toda a parede alinhada na metade de trás (`wall_back`) e substitui a ponta que liga à coluna de baixo por um **canto em L** fino, à esquerda ou direita, de acordo com o arranjo. A língua de conexão tem 25% da largura do tile e ocupa a metade dianteira; não cria pilar cheio nem desnível na borda superior.
- A geometria do canto é real em Three.js (UVs do topo contínuos ao longo das duas partes); o topo ornamental é recortado nas bordas expostas. Só se aplica ao caso de **duas extremidades opostas**, sem coluna interna, preservando retângulos, paredes comuns, câmera 67°, personagens, física, salvamentos e Mundo principal.


## Mármore Celestial — construção automática 2 níveis e paredes com 3 âncoras (PR #94)
- No Santuário, ID 82 cria/retira os dois blocos da pilha por ação. Bloco isolado começa como parede de meia profundidade na frente da célula; adjacência norte–sul converte os blocos em pilares inteiros. Conexão horizontal com colunas alinha paredes ao fundo, meio ou frente da lateral do pilar, mantendo o mesmo perfil nos dois níveis. Conexões mudam automaticamente com colocação/remoção.
- Moldura de topo ganha máscara de dez segmentos (norte/sul e quatro quartos por lateral), adequada ao encontro de parede central com pilar. Mantidas textura vertical, câmera 67°, colisões, Mundo principal e outros materiais.


## Santuário — ajuste de câmera para 67° (PR #93)
- Câmera superior ortográfica do Santuário Three.js revisada de 80° para 67° acima do chão, sem rotação isométrica, aproximando a visibilidade das faces frontais à referência de Core Keeper. Preservados o mármore celestial com topo e bordas adaptativas, o plano vertical da Deusa, colisões, UI, altura de 2 blocos e todas as mecânicas. Mundo principal Canvas 2D inalterado.


## Santuário — câmera superior 80° e bordas adaptativas do Mármore Celestial (PR #92)
- **Teste isolado ao Santuário Three.js:** câmera ortográfica aproximada de 80° acima do chão, mantendo uma única face frontal (sem yaw isométrico), e Deusa desenhada em plano vertical com sombra no chão. Apenas o Mármore Celestial 82 recebe nova arte de topo com moldura dourada e gemas azuis enviada pelo usuário; todas as faces verticais continuam usando a textura anterior.
- **Topos emendados:** máscaras procedurais de bordas expostas evitam ornamentos duplicados entre cubos, inclusive meia borda de pilar ao lado de parede fina. O contorno determina parede traseira ou frontal em salas ocas; camada superior herda geometria. Outros 17 materiais, Mundo principal, regras físicas, saves e controles inalterados. Testes de classificação, geometria, câmera e composição de textura adicionados.


## Correção de oclusão da Deusa no Santuário Three.js — 11/11/2026 (PR #91)
- O sprite flutuante da Deusa agora usa o rodapé real da textura 256×320 como âncora física; a animação original mantém a elevação dos pés. A sombra deixa o billboard vertical e passa a ser um elemento horizontal independente exatamente no chão/nível de apoio lógico, com os mesmos raios e a mesma leve variação de escala.
- O desenho não avança mais 0,15 célula na direção da câmera. O sprite principal continua respeitando a profundidade real dos blocos (`depthTest=true`); uma silhueta etérea de baixa opacidade dá legibilidade quando uma parede realmente o oculta. Colisões, salvamento e Mundo principal inalterados.


## Correção de colisão Santuário WebGL — 11/11/2026 (PR #90)
- No Santuário oficial Three.js, a Deusa não sobe automaticamente cubos inteiros ao pressionar a direção: blocos de 1 ou 2 níveis, paredes e pilares voltam a barrar sua caixa de colisão, via `player.spec.stepHeight = 0` apenas no perfil WebGL. Era o `STEP_HEIGHT=1` legado da vista 2D que fazia atravessar visualmente a parede ao subir sem comando de salto.
- Mundo principal e `?render=2d` continuam com a física anterior; sem alteração em colisões por subcélula, salvamentos, chunks, câmeras ou renderizadores. Testes de regressão da colisão e do fallback adicionados.


## Santuário Three.js oficial — 2026-11-11 (PR #89)
- **Apenas o Santuário** passa a usar Three.js por padrão: malhas instanciadas 3D dos blocos/chão com texturas oficiais (18 IDs), paredes finas 50% alinhadas pela frente, dois níveis e forma superior herdada da base. Câmera ortográfica superior com profundidade real e seleção por raycast; Deusa continua 2D animada em billboard.
- `Game`, ações, controles, hotbar e salvamentos continuam comuns; nenhum módulo do editor de cinco níveis ou primeira pessoa foi incorporado ao jogo oficial. `?render=2d` conserva o antigo motor visual; falta verificar o resultado visual em desktop e mobile. Mundo principal permanece Canvas 2D e não carrega Three.js.


## Ajuste de autotile vertical — 2026-11-11
- **Consistência de dois níveis:** a geometria da parede/pilar é resolvida uma única vez com os vizinhos do bloco inferior; o segundo nível herda a forma e mantém sua própria textura, sem examinar adjacências superiores. Portas existentes continuam funcionando como pilares; blocos não construtivos não afinam. Nenhuma outra regra de mundo, câmera, colisão ou altura foi modificada.


## Próxima versão (PR #87, ainda não publicada) — 2026-11-11
- **Render top-down oficial:** autotile horizontal de paredes de construção a partir dos blocos atuais. Só blocos intermediários de linhas horizontais isoladas afinam (topo reduzido pela metade para trás); face frontal continua alinhada aos pilares. Massas preenchidas, terrenos e nuvens seguem maciços. Portas existentes contam como pilares sem alterar sua interação.
- **Máximo de construção:** dois níveis no mundo e Santuário, inclusive na restauração de saves antigos (terceiro nível deixa de ser carregado e altura do personagem é limitada a 2).
- **Arte do Santuário 80–85:** seis superfícies aprovadas pelo usuário incorporadas e normalizadas para imagens JPEG 512×512. As faces de cada cubo, o chão e os ícones usam sua textura individual; os outros doze blocos celestiais continuam usando o atlas antigo. Pacote limitado ao Santuário, sem adicionar esses materiais ao mundo principal.
- Fora do escopo: Three.js experimental, novas câmeras, novas portas, mudanças em terreno, inventário e NPCs.


## 0.92.0 — 2026-11-08
- **Caixa de conversa**: quando um NPC fala, aparece a moldura no centro da tela com o **rosto** no círculo, o **nome** na
  plaquinha e o **texto** na caixa; texto que não cabe vira páginas e a setinha ▼ avisa que tem mais (tocar na caixa, no
  botão de ação, Espaço ou Enter avança; na última página, fecha). O NPC fica parado e virado para a personagem.
- **16 NPCs nomeados** no lugar dos moradores antigos: o ferreiro agora se chama **Black** e há 15 novos — **Dante, Silvano,
  Morgan, Aurélio, Rubem, Rosendo, Teodoro, Bento, Solano, Nilo, Marlon, Lavínio, Caio, Noel e Leandro** (nomes escolhidos
  pelo assistente; tabela em `docs/domains/npc.md`, edite em `game/npcs.ts`). Cada um com folha própria, retrato e 2 falas.
- **Saíram**: os 4 moradores comuns antigos, as roupas em camada, as **expressões** e o **chibi modular** (peças, tela de
  montagem, `?personagem=chibi`, exportador e ADR 0017). A tela de entrada escolhe só entre os 5 personagens prontos
  (Heroína, Herói, Hood, Gino, Mila). `?personagem=mila` (ou outro id) segue como atalho.
- ⚠ **Protocolo 20** (sem o campo `look` da aparência) e **salvamento v12** (o campo `look` some; quem tinha o chibi fica com
  o personagem pronto salvo). Servidor precisa do pacote novo.

## 0.91.0 — 2026-11-08
- **Mila**: sexto personagem pronto (tela de entrada, ao lado de Heroína, Herói, Hood e Gino): caminhada, caminhada com as
  5 ferramentas, 5 golpes e sentar. Na sala os outros a veem como Mila (`APPEARANCE_BODIES`; **protocolo 19**).
- **Lobos** (3 cores: marrom, cinza e branco): monstros do mapa aberto, em **bandos de 1 a 3 lobos da mesma cor** que passeiam
  juntos perto da toca, espalhados ao redor da cidade (~26 bandos por mapa; nenhum na cidade, na estrada do portão nem no
  campo do rebanho). **Só atacam a personagem a até 3 células** (em linha reta); mais longe ela é ignorada. São mais lentos
  que ela (3,0 × 4,2), então dá para fugir. Vida, ataque e defesa: marrom 35/11/1, cinza 45/13/2, branco 55/15/3. A
  espada e o machado os acertam como acertam as aranhas; renascem em 2 min. **Espólios**: **Pelagem de Lobo** (55%) e
  **Presa de Lobo** (40%), por sorteios separados — às vezes nada, às vezes um só, às vezes os dois (ícones novos; ainda sem
  uso em receitas).
- Monstros longe de todo jogador (> 48 células) ficam parados (não são simulados); o salvamento só guarda as aranhas do
  covil (os lobos voltam todos, pela seed, ao carregar).

## 0.90.1 — 2026-11-08
- **Porta com qualquer madeira ou pedra** (dono do produto): a regra já valia por `organic: 'wood'` / `stone`, então toras e
  tábuas de carvalho, cerejeira e bétula e todas as pedras servem de batente, em qualquer combinação; agora há teste que
  cobre todos os pares (e confirma que terra, areia, grama, caminho e terra arada não servem). Nenhum comportamento mudou.

## 0.90.0 — 2026-11-08
- **Macieira nova**: 3 formas, com maçãs e **colhida** (florida, sem maçãs) com arte própria, na mesma forma e escala —
  a colhida de cada árvore é a mesma forma da carregada. Troca as antigas (2 formas; a colhida usava a arte da carregada).
- **Florestas misturadas** (dono do produto): o mapa da Cidade 1 deixa de ser "só carvalho nos Campos e só cerejeira no Bosque"
  e mistura carvalho, bétula, cerejeira e macieira nos dois biomas (a principal de cada um domina; as demais ~1/6 cada) e
  nas árvores da cidade (cerejeira, bétula e carvalho; sem macieira, porque a cidade é protegida e não dá para colher).
  ⚠ Muda o mapa de todas as seeds só na **espécie** de algumas árvores (nenhuma muda de lugar); macieira e bétula dos
  Campos continuam onde estavam.

## 0.89.0 — 2026-11-08
- **Bétula**: árvore nova (3 formas), misturada aos carvalhos e às macieiras dos Campos (~1 em 6 árvores; as macieiras
  continuam onde estavam — ⚠ troca alguns carvalhos de lugar por bétulas em toda seed). Derrubada dá 2–3 **Toras de
  Bétula**; 1 tora vira 2 **Tábuas de Bétula** (receita do construtor). Tora com topo (anéis) e frente (casca branca);
  tábuas só com o topo. Colocáveis como os demais materiais de madeira (batente de porta, substituem a água).
- **Tábuas de Cerejeira contínuas**: o topo novo emenda nas quatro bordas (antes marcava ⚠ de costura).
- Baú, porta, cadeira e cerca seguem só de carvalho (decisão do dono do produto; outras madeiras ficam para depois).

## 0.88.0 — 2026-11-08
- **Não se constrói no chunk do muro** (dono do produto): todo chunk que tem um pedaço da muralha da cidade é protegido por
  inteiro (nada quebra, coloca, ara nem planta), mesmo na parte que fica fora dos limites da cidade. O que já estava
  construído ali continua; só não se constrói mais. O ponto "fora do portão" passou a ser o primeiro trecho da estrada fora
  desse chunk.
- **Árvores novas e sem crescimento**: carvalho (3 formas), macieira (2) e cerejeira (3) com a arte nova, sempre adultas; a
  forma de cada árvore é sorteada pela posição. **Saíram** as mudas (itens e plantio) e os estágios jovens: mudas e jovens
  de mundos e salas salvos viram a árvore adulta, e as mudas somem de bolsas, grades e baús. A macieira colhida ainda
  volta a dar maçãs (com a mesma arte, enquanto não vem a "macieira colhida").
- **Madeira de cerejeira**: Tora de Cerejeira (topo e frente) e Tábuas de Cerejeira (só o topo), colocáveis como os
  materiais de carvalho (batente de porta, substituem a água). A Cerejeira derrubada dá 2–3 Toras de Cerejeira; 1 tora vira
  2 tábuas (receita do construtor).
- Novos scripts: `scripts/process-trees.py` (tira de variantes a partir das ilustrações) e
  `scripts/make-material-icons.py` (ícone de bloco a partir de topo e frente).

## 0.87.0 — 2026-11-08
- **Água nova e margens pintadas**: o topo da água do V2 (`agua`) é o ladrilho do mar e dos rios, e as margens ganham a
  transição da pintura de cada par: Água sobre Areia, Terra, Caminho e Grama, com espuma e água rasa. A barranca e o fio
  de espuma antigos saem onde a margem nova vale.
- **Transições por par de chão**: Grama sobre Terra, Caminho e Areia, e Areia sobre Terra, cada uma com a forma
  derivada da pintura enviada (antes era uma forma só). A forma gira e monta cantos; a textura nunca gira.
- Novo script `scripts/import-transition.py` (forma + faixa pintada a partir da pintura do par); `build-materials.py`
  gera o atlas de formas com máscara, halo e espuma por peça. Terra Arada e os demais chãos seguem sem transição.

## 0.86.0 — 2026-11-08
- **O chão quebrado se refaz**: um buraco (chão quebrado sem bloco) que fica um dia inteiro do jogo (`DAY_LENGTH_S`, 8 min)
  ganha de volta um chão igual ao de um vizinho (os de lado primeiro, depois as diagonais; nunca água), escolhido pela
  seed e pela posição, sempre o mesmo. Tapar o buraco antes zera a contagem; buraco que enche de água segue enchendo.
- Na sala, quem decide é a sala: o chão novo viaja na mensagem `grow` (mesma forma do crescimento; sem subir o
  protocolo, aparelho antigo ignora). As idades dos buracos entram no salvamento (v11) e no retrato da sala (v4), então
  o dia continua de onde parou.

## 0.85.0 — 2026-11-08
- **O novo padrão de materiais é o do jogo**: os blocos e o chão com as texturas planas novas (areia, terra, grama, as cinco
  pedras, caminho, terra arada, tora e tábuas) passam a ser o que todo mundo vê; antes só aparecia com uma chave de teste.
  Cubos vizinhos e pilhas viram massa contínua, sem riscos, e o chão não tem mais a linha fraca em cada quadrado.
- **Transições entre chãos**: a grama avança com borda irregular sobre a terra, o caminho e a areia (a máscara enviada pela
  arte, girada para cada direção, mais pontas nos cantos). Só no chão plano; água, buracos, pedra e o piso da cidade ficam
  como estavam.
- Pedras aposentadas ainda presentes em mundos antigos continuam com a arte antiga.

## 0.84.0 — 2026-11-08
- **As paredes saíram do jogo** (decisão do dono do produto): sem as 16 paredes, sem as receitas e sem a arte delas (a
  tira de paredes que carregava em segundo plano e os ícones). Mundos e salas já salvos que tenham paredes ficam com o
  espaço vazio, e paredes na bolsa, na grade ou nos baús somem — nada quebra. A porta agora vai entre blocos de madeira
  ou de pedra.
- **Materiais V2 — madeira de carvalho** (só com `?blocos=v2`): Tora de Carvalho com topo (anéis) e frente (casca)
  próprios, e Tábuas de Carvalho só com o topo (a frente repete o topo; em teste). A cena `?materiais=1` mostra pilhas
  de tora e tábuas.

## 0.83.0 — 2026-11-08
- **Cinco pedras** (decisão do dono do produto): o jogo fica com Pedra Bruta, Tijolo de Pedra, Chão de Pedra, Pedra Lisa e
  Pedra Polida. **Pedra Irregular, Pedra Rachada e Tijolo de Pedra Rachado saíram**: sem receita (nem a parede de cada
  uma) e a muralha da cidade agora é só de Tijolo de Pedra, sem as peças rachadas. Mundos e salas já salvos que tenham
  esses blocos continuam funcionando (eles seguem existindo, só não dá mais para fazê-los).
- **Materiais V2 — texturas das quatro pedras** (só com `?blocos=v2`): Tijolo de Pedra, Chão de Pedra, Pedra Lisa e
  Pedra Polida entram no padrão novo, junto com a Pedra Bruta. A cena `?materiais=1` mostra as cinco.

## 0.82.2 — 2026-11-08
- **Materiais V2 — frente de terra e franjas do Caminho e da Terra Arada** (só com `?blocos=v2`): Caminho de Terra e
  Terra Arada passam a ter a frente de terra (como a grama) e a franja de transição enviada pela arte caindo sobre ela.
  O importador limpa a cor das bordas (a da terra arada veio com halo vermelho de recorte) e reduz as franjas com alfa
  correto.

## 0.82.1 — 2026-11-08
- **Materiais V2 — Caminho de Terra e Terra Arada** (só com `?blocos=v2`): topos oficiais enviados pela arte (a frente
  repete o topo). O chão dos materiais V2 também deixou de ter a linha fraca em cada célula: ela vinha da "grade sutil
  de blocos" desenhada sobre todo chão; no V2 o chão é uma superfície só (o chão antigo continua com a grade).

## 0.82.0 — 2026-11-08
- **Materiais V2 — massa contínua** (só com `?blocos=v2`; nada muda no jogo normal): cubos vizinhos e níveis empilhados
  não mostram mais riscos entre si, nem na horizontal nem na vertical, nem entre materiais diferentes (pedra sobre
  terra, areia ao lado de terra). O contorno fica só na borda do conjunto; a frente da pilha é uma parede contínua e a
  franja da grama aparece só no nível mais alto. Blocos antigos ao lado mantêm o contorno. A cena `?materiais=1` mostra
  um platô de materiais misturados, um degrau e pilhas. Pendente: arte V2 do Caminho (linha em cada célula do chão).

## 0.81.2 — 2026-11-07
- **Materiais V2 — frentes próprias** (nada muda no jogo): terra, Pedra Bruta e areia ganharam a frente enviada pela arte
  (antes repetiam o topo). A frente da grama usa a frente da terra, então muda junto. Visíveis em `?blocos=v2` e
  `?materiais=1`.

## 0.81.1 — 2026-11-07
- **Materiais V2 — decisões do dono do produto** (nada muda no jogo): a frente dos cubos **fica em 18** (a comparação
  com 16 não mostrou diferença que valha a mudança); a franja da grama foi **reduzida aos 32 px** do padrão (veio com
  60 e cobria quase toda a frente); material **sem frente própria repete o topo**. A cena `?materiais=1` agora compara
  o atlas antigo com o V2.

## 0.81.0 — 2026-11-07
- **Padrão de Materiais V2 — preparação** (nada muda no jogo): o padrão definido com a área de arte entrou no
  repositório (ADR 0023, contrato de entrega em `assets-src/materiais/`) com o pipeline que monta os blocos a partir de
  texturas planas. Para comparar a altura da frente dos cubos (16 ou 18), abra o servidor de desenvolvimento com
  `?materiais=1`; para ver areia,
  terra, grama e Pedra Bruta no novo formato no mundo, `?blocos=v2`. Já com a **arte oficial** enviada pelo dono do
  produto (terra, grama, transição da grama, areia e pedra bruta).

## Sem versão do jogo — 2026-11-07 (documentação e organização)
- **Docs**: `CURRENT_STATE` reescrito como retrato do estado atual (211 testes, Sala 1 até 10, quatro personagens, sentar, minimapa, fome); o diário técnico por versão foi para `docs/archive/estado-por-versao.md`.
- **Docs**: novo `domains/multiplayer.md`; índice com os 21 ADRs e mapa de pastas; `NEXT_STEPS` com cabeçalho e panorama atualizados; `ARCHITECTURE` com os scripts que faltavam; `README` da raiz com o personagem modular integrado e os controles novos.
- **Repositório**: capturas de tela da raiz foram para `docs/assets/`; `scripts/__pycache__` saiu do git e `__pycache__/` entrou no `.gitignore`.

## Sem versão do jogo — 2026-11-07 (ferramenta de desenvolvimento)
- **Cena de escala** (ADR 0022): `?escala=1` no servidor de desenvolvimento mostra personagens, animais, monstros, baú, bancos, árvores e uma casa 5×5 sobre a grade com o renderizador real, com grade, âncoras, células bloqueadas e alturas. Reproduzível; não entra no build de produção. Teste novo confere a regra "filhote ≈ 0,7× o adulto". Nada muda para o jogador.

## 0.80.1 — 2026-11-07
- **Novo ícone oficial do Orvalis**: o selo redondo (castelo, cachoeira, vila e ponte sob o nome dourado) passa a ser o ícone do jogo instalado na tela inicial e o favicon do navegador. Android ganhou um ícone adaptável (`maskable`) próprio e o iPhone um `apple-touch-icon` de fundo escuro. Antes era a Heroína sobre fundo roxo.

## 0.80.0 — 2026-11-07
- **Todos sentam**: Heroína, Herói e Hood ganharam a folha de sentar e levantar (antes só o Gino). Cada um sentado tem o
  mesmo tamanho de quando está em pé; o Gino sentado estava um pouco maior e foi acertado.

## 0.79.2 — 2026-11-07
- **Sentado no lugar certo**: os pés do Gino ficam na célula da frente do assento e o corpo sobre ele (antes os pés
  ficavam na célula do banco/cadeira e ele parecia sentado um bloco acima).

## 0.79.1 — 2026-11-07
- **Sentar mais natural** (retorno do dono do produto): o Gino anda até o assento, vira de frente e senta abaixando o
  corpo no lugar (antes ele aparecia de uma vez em cima do banco, parecendo subir um bloco). Sentado, fica parado (antes
  repetia um leve balanço). Para levantar, ergue-se no lugar e anda de volta.

## 0.79.0 — 2026-11-07
- **Sentar e levantar** (por enquanto com o Gino): toque numa cadeira ou num banco da cidade para sentar; ande ou
  toque de novo para levantar. Na sala, os outros veem você sentado.
- **Porta entre paredes**: a porta de madeira agora também vai entre paredes de madeira ou de pedra (e misturando com
  blocos), não só entre blocos.
- Multiplayer: `PROTOCOL_VERSION` 18 (servidor 0.20.0 junto).

## 0.78.0 — 2026-11-07
- **Cidade com piso de Tijolo de Pedra**: ruas, praças, pátio do castelo e calçadas das casas passam a ter o mesmo piso
  (antes eram quatro pedras diferentes). Os gramados continuam verdes.

## 0.77.0 — 2026-11-07
- **Novo personagem: Gino** (folhas do dono do produto), na tela de personagem ao lado de Heroína, Herói e Hood: anda
  sem ferramenta e segurando cada uma das 5 ferramentas, com os 5 golpes. Na sala, os outros veem o Gino.
- Correção do registro da 0.76.0: das folhas do Herói, mudaram as 5 caminhadas com ferramenta e os golpes de machado e
  pá (caminhada base e golpes de espada, enxada e picareta vieram iguais às que já estavam no jogo).
- Multiplayer: `PROTOCOL_VERSION` 17 (servidor 0.19.0 junto).

## 0.76.0 — 2026-11-07
- **Herói redesenhado** (folhas novas do dono do produto): caminhada sem ferramenta, **andar segurando cada uma das
  5 ferramentas** (antes ele andava de mãos vazias com espada, machado, enxada e pá) e os 5 golpes refeitos.

## 0.75.0 — 2026-11-07
- **Golpes do Hood**: folhas novas de bater com a espada e o machado, arar com a enxada, minerar com a picareta e cavar
  com a pá (antes o golpe dele mostrava a caminhada com a ferramenta). Na sala, os outros também veem.

## 0.74.0 — 2026-11-07
- **Animal alimentado segue você**: enquanto está com o coração na cabeça, o animal vai atrás de quem deu a comida.
  Quando o coração acaba, ele fica onde você o levou (dá para levar os animais até um cercado).
- **Leite e ovo**: a vaca solta leite e a galinha solta ovo ao comer. O leite também se bebe.
- **Receitas novas do Cozinheiro**: Queijo (1 leite, no Caldeirão) e Torta de Maçã (2 trigos, 1 leite, 2 maçãs e
  1 ovo, no Forno de Pedra).
- **Jogo abre mais rápido**: as folhas da personagem com cada ferramenta (e de outros personagens) só baixam quando
  aparecem pela primeira vez; o que o jogo espera para começar caiu de ~3,1 MB para ~2,0 MB.
- Na sala vale o mesmo para todos (o animal segue quem deu; leite e ovo caem no chão da sala). Multiplayer:
  `PROTOCOL_VERSION` 16 (servidor 0.18.0 junto).

## 0.73.0 — 2026-11-07
- **Animais da sala ficam salvos**: ovelhas, vacas, galinhas e cavalos da Sala 1 (filhotes e crias incluídos) voltam
  onde estavam depois que o servidor reinicia ou é atualizado. Antes, voltavam só os animais do começo. As aranhas
  continuam renascendo como sempre.
- Servidor 0.17.0 junto (protocolo continua 15: só o arquivo da sala mudou, `RoomSnapshot` v3).

## 0.72.0 — 2026-11-07
- **Na sala, os outros aparecem com a ferramenta na mão e golpeando**: antes o boneco dos outros jogadores andava
  sempre de mãos vazias. Agora mostra a espada, o machado, a enxada, a pá ou a picareta que a pessoa segura e toca a
  mesma animação de golpe (bater, arar, cavar, minerar).
- Multiplayer: `PROTOCOL_VERSION` 15 (servidor 0.16.0 junto).

## 0.71.0 — 2026-11-07
- **Novo personagem: Hood** (folhas enviadas pelo dono do produto). Escolha na tela de personagem (início e "Novo
  mundo"), ao lado de Heroína e Herói. Anda segurando cada ferramenta (espada, machado, enxada, picareta e pá).
  Ainda sem animação própria de golpe: no golpe ele mostra a ferramenta na mão (falta a arte dos golpes).
- Na sala, os outros jogadores veem o Hood. Multiplayer: `PROTOCOL_VERSION` 14 (servidor 0.15.0 junto).

## 0.70.0 — 2026-11-07
- **Sala compartilhada, Etapa 3: aranhas e animais da sala.** Na Sala 1 todos veem as mesmas ovelhas, vacas, galinhas,
  cavalo e aranhas, nos mesmos lugares: quem roda os bichos agora é o servidor.
  - Dar comida, namoro e filhotes valem para todos (o trigo só sai da bolsa quando o animal come de verdade).
  - Golpe: quem bate vê o dano, e os outros também; aranha derrotada some para todos e o espólio cai no chão da sala
    (quem chega primeiro pega).
  - Mordida: a aranha morde quem está encostado nela, e só essa pessoa perde vida.
  - Moradores da cidade continuam de cada um (são enfeite).
- Multiplayer: `PROTOCOL_VERSION` 13 (servidor 0.14.0 junto, agora com relógio de 10×/s).
- Correção: a imagem das paredes de pedra estava publicada numa pasta errada do Artifact (paredes sem desenho na
  v0.68.0); republicada no lugar certo.

## 0.69.0 — 2026-11-07
- **Paredes de outros materiais** (nova prancha do dono do produto): Terra, Grama, Terra Arada, Terra Batida, Areia,
  Pedra com Musgo, Tronco e Tábuas — agora são 16 paredes. Mesma regra das de pedra: **3 blocos do material → 1
  parede**, 3 de altura, muro contínuo (dá para misturar materiais no mesmo muro). A parede de Pedra com Musgo também
  usa Pedra Bruta (duas receitas: escolha a aparência).
- Cada parede se desmonta com a ferramenta do material: madeira com o **machado**, terra e areia com a **pá** (ou
  picareta), pedra com a **picareta**.
- A imagem das paredes passou a carregar em segundo plano (a bolsa já mostra os ícones desde o início): o jogo abre tão
  rápido quanto antes.
- Multiplayer: `PROTOCOL_VERSION` 12 (blocos novos; servidor 0.13.0 junto).

## 0.68.0 — 2026-11-07
- **Paredes de pedra** (prancha enviada pelo dono do produto), para separar bloco de parede: o **bloco** continua o
  cubo que se empilha e onde se sobe; a **parede** é uma peça alta (3 de altura) onde não se sobe nem se empilha nada.
  Uma para cada pedra — Bruta, Irregular, Tijolo, Lajotas, Lisa, Polida, Rachada e Tijolo Rachado —, cada uma com seu
  ícone. Paredes lado a lado viram um **muro contínuo**. Receita do Construtor: **3 blocos da pedra → 1 parede**.
  A picareta desmonta (volta a parede para a bolsa).
- Multiplayer: `PROTOCOL_VERSION` 11 (blocos novos; servidor 0.12.0 junto).

## 0.67.0 — 2026-11-07
- **Itens no chão compartilhados na sala** (Etapa 2): ao quebrar um bloco ou colher maçãs na sala, os itens caem para
  todos; quem chega primeiro pega e o item some para os outros.
- **Baús compartilhados**: o que se guarda num baú da sala aparece para todos, fica salvo no servidor junto com o
  mundo e cai no chão (para todos) se o baú for quebrado.
- Multiplayer: `PROTOCOL_VERSION` 10 (servidor 0.11.0 junto). Espólios de aranha seguem de cada um até a Etapa 3.

## 0.66.0 — 2026-11-07
- **Na sala, cada um aparece com o personagem que escolheu**: Heroína, Herói ou o Chibi com as peças montadas — antes
  os outros jogadores sempre viam a Heroína. Peça que este jogo não conhece vira a padrão.
- Multiplayer: `PROTOCOL_VERSION` 9 (servidor 0.10.0 junto).

## 0.65.1 — 2026-11-07
- **Correção**: ao entrar na Sala 1, o jogo trocava o Herói pela Heroína (só a aparência do Chibi passava para o mundo
  da sala). Agora o personagem escolhido segue para a sala. Os outros jogadores ainda veem todos como Heroína
  (aparência na rede: próximo passo).

## 0.65.0 — 2026-11-07
- **Novo mundo abre a escolha de personagem** (pedido do dono do produto): no menu do jogo, "Novo mundo" mostra a mesma
  tela do início — Chibi, Heroína ou **Herói**, nome — e só então cria o mundo; "Voltar" volta ao mundo de antes.
- **Herói**, personagem pronto (folhas enviadas): anda nas 4 direções e golpeia com as 5 ferramentas (enxada, machado,
  espada, pá e picareta); anda com a picareta. Ainda sem folha (usa a caminhada sem ferramenta): andar segurando as
  outras ferramentas.
- Salvamento `SAVE_VERSION` 10: o mundo guarda o personagem escolhido (quem já jogava continua com a Heroína).

## 0.64.0 — 2026-11-06
- **Sala fixa e salva** (pedido do dono do produto): "Jogar com amigos" agora lista as salas por número — por enquanto
  a **Sala 1**, para até **10 jogadores** ao mesmo tempo, mostrando quantos estão nela. Entra e sai quando quiser:
  tudo o que se faz na sala fica **salvo no servidor** e quem entrar depois vê o mesmo mundo.
- **A bolsa da sala fica guardada** pelo nome: ao voltar, os itens e o lugar onde você estava continuam lá. Fora da
  sala, o mundo sozinho segue com a própria bolsa.
- Saem as salas com código de convite. Multiplayer: `PROTOCOL_VERSION` 8 (servidor 0.9.0 junto).

## 0.63.0 — 2026-11-06
- **Jogar com amigos — mesmo horário e mesmo crescimento** (Etapa 1 da sala compartilhada): a sala tem a própria hora
  do dia; quem entra passa a ver a mesma hora que os outros (dia e noite iguais) e o relógio é acertado a cada 30 s.
  Plantas, árvores e maçãs crescem pelo servidor: todos veem o mesmo estágio, inclusive quem entra depois.
- Multiplayer: `PROTOCOL_VERSION` 7 (servidor 0.8.0 junto, com o relógio das salas). Itens caídos e aranhas/animais
  compartilhados vêm nas Etapas 2 e 3.

## 0.62.0 — 2026-11-06
- **Interior da tenda** (arte enviada pelo dono do produto): andar para cima diante da frente de qualquer tenda entra
  num cômodo iluminado com lampião e colchão, como na Ferraria; pisar no capacho volta para diante da tenda.
- **"Jogar com amigos" não trava mais em "Conectando…"**: sem resposta do servidor em 10 s (ou conexão que cai antes da
  sala), o jogo tenta mais uma vez sozinho e, se de novo nada, avisa "O servidor não respondeu. Tente de novo em
  instantes." (o servidor da Hostinger às vezes reinicia e a conexão fica pendurada).

## 0.61.1 — 2026-11-06
- **"Jogar com amigos" fora do site**: no Artifact do claude.ai e nas prévias da Hostinger o servidor recusa a
  conexão (só aceita o site oficial), e o menu mostrava os botões que falhavam com "Não foi possível conectar". Agora
  esses endereços mostram o aviso "Aqui só dá para jogar sozinho" com o link 🌐 do site. No site oficial nada muda
  (criação de sala testada de ponta a ponta: servidor no protocolo 6, sala criada).

## 0.61.0 — 2026-11-06
- **Namoro com coraçõezinhos** (folha enviada pelo dono do produto), igual para ovelha, vaca, galinha e cavalo: o
  animal que come fica com um coração; dois apaixonados se procuram, param de frente e sobem coraçõezinhos entre eles
  (~2,6 s) até o filhote aparecer. Os corações acompanham o tamanho do animal.
- Sai a animação de namoro própria da ovelha (o casal agora aparece de verdade, como os outros animais).

## 0.60.0 — 2026-11-06
- **Filhotes** (folhas enviadas pelo dono do produto): **potro**, **bezerro** e **pintinho**.
- **Reprodução dos animais do campo**, como a das ovelhas: com o alimento na mão, toque no animal — **vaca come
  trigo**, **galinha come semente de trigo**, **cavalo come cenoura**. Dois da mesma espécie apaixonados se encontram,
  namoram e nasce um filhote. Fora de um animal, semente e cenoura continuam plantando (e a cenoura, sendo comida).
- **Filhotes crescem em 3 dias de jogo** (24 min) e viram adultos. Limite por espécie: 6 cavalos, 10 vacas,
  12 galinhas (ovelhas seguem 16).
- Como as ovelhas, os animais ainda não são salvos: ao recarregar, voltam os iniciais da semente.

## 0.59.0 — 2026-11-06
- **Cerca de Madeira** (referência enviada pelo dono do produto): colocada célula por célula, **emenda sozinha** com as
  cercas vizinhas — retas, cantos, "T", cruzamentos, pontas e poste solto — e se refaz ao colocar ou tirar uma
  vizinha. Bloqueia a passagem (cercados para vacas, galinhas e ovelhas). Receita do Construtor: **2 Tábuas → 4 cercas**.
- **Portão de Madeira**: tocar abre e fecha (como a porta); aberto deixa passar. Emenda com a cerca dos lados.
  Receita: **4 Tábuas → 1 portão**. Por enquanto o desenho é de frente (fica certo em cerca horizontal); o portão
  de lado espera arte.
- O machado desmonta cerca e portão (voltam para a bolsa). Multiplayer: `PROTOCOL_VERSION` 6 (blocos novos; servidor
  atualizado junto).

## 0.58.0 — 2026-11-06
- **Pedregulhos** (prancha de pedras enviada, 40 artes): pedras soltas espalhadas pelo mundo, uma arte sorteada por
  lugar — no lugar dos antigos cubos de pedra avulsos (muda o mapa de todas as sementes só nesses pontos).
  Mineradas (picareta, ou na mão) soltam **1–3 Pedras Brutas**, que vão para a mão/bolsa como o bloco de pedra e
  são colocadas como cubo.
- Multiplayer: `PROTOCOL_VERSION` 5 (o mapa da sala mudou; servidor atualizado junto).

## 0.57.1 — 2026-11-06
- **Ficha de receita sem depender de leitura** (pedido do dono do produto, para crianças que ainda não leem): botões
  com ícone e cor — **✓ Criar** (verde) e **✕ Voltar** (vermelho); a estação vira o ícone do Caldeirão com ✓/✗ e o
  destino vira o ícone da mão ou da bolsa com →. Os nomes ficam no toque longo/leitor de tela.

## 0.57.0 — 2026-11-06
- **Bolsa nova** (pedido do dono do produto): 12 espaços em 4 fileiras de 3, à **direita**, logo acima dos botões
  personagem/habilidades/bolsa — a esquerda fica livre. Com a mão, 21 itens (antes 9 + 18). Quem tinha mais de 12
  tipos na bolsa encontra o excesso no chão, aos pés da personagem (nada se perde).
- **Ficha de receita**: tocar numa receita não cria mais na hora — abre a ficha (ícone, ingredientes "tem / precisa",
  estação ✓/✗ e "Vai para: mão/bolsa") com **Confirmar** e **Cancelar**, e a bolsa aparece ao lado para ver o item
  entrar. Ao confirmar: "+N Item na mão/na bolsa".

## 0.56.0 — 2026-11-06
- **Barra de fome** (pedido do dono do produto): abaixo da vida, esvazia em ~12 min. Com fome abaixo de 30% a vida não
  se recupera sozinha; vazia, a fome tira vida aos poucos (sem derrubar). Renascer volta satisfeito.
- **Comer**: com o alimento na mão, o botão de ação (ou clique) come. Crus: maçã (+15), cenoura (+12), batata (+10),
  tomate (+8) — batata, tomate e cenoura ainda plantam quando o alvo é terra arada livre. Pratos: **Pão** (+35) e
  **Macarrão ao Molho** (+70), com os ícones enviados.
- **Profissão Cozinheiro** (toque nela em Habilidades): Pão (2 trigos) e Macarrão ao Molho (4 trigos + 2 tomates),
  feitos **só perto de um Caldeirão de Pedra** colocado no mundo. As profissões agora trocam a lista de receitas.
- Salvamento v9 (a fome é salva; quem já jogava começa satisfeito). Sem mudança no multiplayer.

## 0.55.1 — 2026-11-06
- **Correção: tocar muito rápido ampliava a tela e ela travava** (iPhone/iPad). O Safari ignora `user-scalable=no` e
  amplia a página com toque duplo; o jogo agora bloqueia o toque duplo, a pinça e o duplo clique (`ScreenMode`),
  usa `touch-action: manipulation` na página e nos botões, e o botão de ação e o canvas soltam o toque se o navegador
  tomar o gesto (`lostpointercapture`), em vez de ficarem presos.

## 0.55.0 — 2026-11-06
- **Covil das Aranhas com entrada de caverna** (pedido do dono do produto, arte enviada; ADR 0019): no mundo fica só
  a caverna, a pelo menos 10 chunks do castelo em direção sorteada pela seed. Andar para dentro da boca leva ao
  labirinto; pisar na saída devolve à frente da caverna. De dentro não se vê o mundo (escuridão em volta) e do mundo
  não se vê o labirinto. O minimapa mostra o labirinto com a névoa lá dentro.
- **Mundo da Cidade do Despertar só de florestas**: sem deserto — campos (carvalhos e macieiras), bosques de sakura,
  rios, mares e areia nas praias. Dunas e cacto ficam guardados para um mundo árido futuro.
- ⚠️ Muda o mapa de todas as sementes (covil antigo vira terreno, desertos viram floresta). Salvamento v8: as aranhas
  voltam completas. Multiplayer: `PROTOCOL_VERSION` 4 (servidor atualizado junto).
- Visão registrada: cidades em mundos diferentes ligados por portais ("andares").

## 0.54.0 — 2026-11-06
- **Pano de Seda** (Construtor, 10 Sedas de Aranha), com ícone próprio. A **Tenda** passa a pedir **1 Pano de Seda**
  + 10 Tábuas + 4 Presas (antes: 10 sedas soltas).
- **Ferramentas por material — contrato de arte** (ADR 0018, `assets-src/ferramentas/CONTRATO.md` + `catalogo.json`):
  as 5 pranchas recebidas (madeira, pedra, madeira + presa, madeira + Coração, presa + Coração) ficam guardadas como
  referência; entram no jogo quando houver camada de mão (hoje a ferramenta é pintada na folha da heroína).

## 0.53.0 — 2026-11-06
- **Batata, tomate e cenoura** (pedido do dono do produto): plantados pelo próprio legume em Terra Arada, crescem por
  16 estágios com a prancha enviada (~2–2,5 min) e, maduros, dão 2–3 legumes (um serve para replantar). Verdes,
  devolvem o legume. Jogo novo começa com 2 de cada na bolsa; arrancar capim às vezes revela uma hortaliça.
- **Ícones novos** de maçã, batata, tomate e cenoura na bolsa (arte enviada).
- Motor: o trigo virou uma das culturas da tabela `CROPS` (blocks) — cultura nova = uma linha + folha de crescimento.
- Multiplayer: `PROTOCOL_VERSION` 3 (plantar hortaliça precisa da regra nova no servidor; servidor atualizado junto).

## 0.52.0 — 2026-11-06
- **Cadeira de Madeira** (Construtor, 4 Tábuas): móvel de 1 célula com a arte enviada; volta à bolsa ao quebrar
  (machado desmonta).
- **Vaca e galinha**: 2 vacas e 4 galinhas passeiam no campo do lado de fora do portão, perto do rebanho e do cavalo
  (folhas 4×4 enviadas). Cavalo, vaca e galinha são o mesmo animal do campo (`FarmAnimal`), com ritmo próprio.
- **Árvores com a prancha de crescimento**: carvalhos adultos sorteiam 5 artes (grande, bolotas, flores, outono,
  musgo) e os cactos, 8. **Macieiras** misturadas nos Campos (~1 em 6 árvores) — muda o mapa de todas as sementes
  (só troca carvalhos por macieiras; caminhos e espaços livres iguais).
- **Mudas que crescem**: derrubar uma árvore adulta pode dar uma Muda de Carvalho ou de Macieira (50%). Plantada em
  terra ou grama, passa por muda → jovem → (crescendo) → adulta, ~2 min por estágio.
- **Maçãs**: tocar numa macieira carregada colhe 2–3 Maçãs (caem ao pé); ela fica florida e as frutas voltam em
  ~2,5 min. Comer vem com a comida (Fase P).
- Multiplayer: plantar muda e colher maçãs viajam pela sala — `PROTOCOL_VERSION` 2 (servidor atualizado junto).

## 0.51.0 — 2026-11-06
- **Minimapa com névoa de exploração** (pedido do dono do produto): mapa redondo no canto superior direito, abaixo
  do ☰, com o norte para cima e a seta do jogador girando. Começa escuro e vai se revelando num raio de 14 blocos
  à medida que se anda; o que foi descoberto fica salvo com o mundo (`SAVE_VERSION` 7; antigos começam cobertos).
- Marcadores: Cidade do Despertar (estrela), entrada da dungeon (depois de descoberta), tenda e amigos na sala.
  Cidade e tenda ficam presas na borda quando longe. Dentro da Ferraria o mapa mostra só o nome do lugar.
- Só no mundo principal (o Santuário cabe na tela). Cada chunk vira uma imagem pequena refeita só quando o mapa ou
  a névoa dele mudam.

## 0.50.1 — 2026-11-06
- Corrigido o balanço dos braços na caminhada do chibi para a direita: oito fases contínuas, com retorno ao quadro inicial.
- Ajustados os recortes das quatro blusas e quatro peças de pernas para a nova posição das mãos. Demais direções,
  cabeças, cabelos, sapatos e região inferior dos pés preservados; folhas WebP do jogo e prévias reexportadas.
- Comparação sincronizada antes/depois em `previas/v02/direita-antes-depois.gif`; histórico e ORA editável locais.

## 0.50.0 — 2026-11-06
- **Tela de entrada** (pedido do dono do produto): o jogo abre no título **Orvalis** com a Cidade do Despertar viva
  atrás, **Novo jogo** e **Continuar** (só com jogo salvo no aparelho). Espaço reservado para "Jogar com amigos" e
  "Entrar" (cadastro, backend do Orvalis).
- **Monte seu personagem** depois de "Novo jogo": **Chibi** (cabelo, roupa, pernas, pés ou descalço) ou **Heroína**,
  prévia andando e virando nas 4 direções, **Sortear** e **Nome**. "Começar" cria um mundo novo com essa aparência.
- Aparência salva no aparelho (`SAVE_VERSION` 6): continua em "Novo mundo", "Recomeçar" e nas salas. Salvamentos
  antigos continuam com a heroína. O chibi foi igualado à altura da heroína (×0,94).
- `?seed=`, `?personagem=` e o Santuário entram direto no mundo, como antes.

## 0.49.0 — 2026-11-06
- **Três receitas novas do Construtor** (pedido do dono do produto): **Fogueira** (3 Toras de Carvalho), **Caldeirão
  de Pedra** (3 Pedras Brutas + 1 Fogueira) e **Forno de Pedra** (6 Pedras Brutas), com a arte enviada. Colocam-se fora
  da cidade (1 célula, bloqueiam), brilham à noite e voltam à bolsa ao quebrar (machado desmonta a fogueira, picareta
  os de pedra). Cozinhar ainda não: vem com a comida (Fase P, entrega 4).

## 0.48.0 — 2026-11-05
- **Personagem modular no motor** (ADR 0017): `?personagem=chibi` troca a heroína pelo humano chibi, montado pelas
  partes do guarda-roupa v02 na ordem do manifesto (`&tronco=colete-verde&pernas=calca-ardosia&pes=sapatos-couro`,
  `&cabelo=…`). O quadro é desenhado no tamanho dele × escala do mestre, com a âncora no chão — sem esticar.
  Só caminhada (parado = quadro 0), sem ferramentas no chibi; só no jogo solo. Sem o parâmetro, nada muda.
- `export-personagem.py --out src/assets --prefixo chibi-` gera as 13 folhas (555 kB), carregadas só quando o chibi
  aparece (fora do orçamento de início).

## Sem versão — guarda-roupa chibi fantasia 01 — 2026-11-05
- Seis roupas novas em camadas: colete verde, túnica azul, blusa lilás, calça ardósia, shorts vinho e bermuda verde.
  Catálogo com onze peças/treze folhas; caminhada de oito quadros nas quatro direções.
- Dezesseis combinações sobrepostas (25 com a roupa bege da base), prancha comparativa, conjuntos em movimento,
  seletores independentes e sorteio na prévia. Corpo, rosto, cabelo e sapatos anteriores preservados.
- Fontes e ORA em camadas somente na área local. Todas as peças em revisão; jogo e versão jogável inalterados.

## Sem versão — revisão 2 da base chibi e dos sapatos — 2026-11-05
- A pedido do dono do projeto, substituída a malha de corpo inteiro por blusa sem mangas e shorts anteriores
  recoloridos em bege. Silhueta e pixels dos pés descalços da referência preservados nos 32 quadros.
- Sapatos menores e simples desenhados sobre as poses completas; removido o reposicionamento automático de
  componentes por quadro. Recorte limitado à silhueta original com margem de um pixel, sem mudar a fase dos pés.
- Prévia começa na base bege sem sapatos; comparação sincronizada sem/com sapatos e avanço de quadro quando
  pausada. Histórico da primeira revisão preservado localmente. Aprovação visual dos sapatos continua pendente.

## Sem versão — piloto artístico modular v02 — 2026-11-05
- Cinco peças em revisão: corpo/cabeça, cabelo curto trás/frente, blusa ocre, shorts marinho e sapatos de couro.
  Sete folhas de caminhada 8×4 no contrato, linhas frente/esquerda/direita/costas; oito contatos com pé/região.
- Malha bege opaca totalmente coberta autorizada provisoriamente para o corpo-base; objetivo definitivo de
  base sem roupa integrada continua pendente. Exceção registrada no contrato e no catálogo.
- Prévias pequenas, montagem local interativa e fonte ORA de sete camadas no trabalho local. Nenhuma mudança
  no renderizador, na heroína, no salvamento ou no multiplayer; não altera a versão jogável.

## Sem versão — personagem modular: contrato v02 — 2026-11-05
- **Contrato de arte v02** para personagens modulares (`assets-src/personagens/CONTRATO.md`, ADR 0017), fechado com a
  área de arte: quadro 384 × 512, âncora (192, 471) como raiz, escala fixa do mestre, linhas frente/esquerda/direita/
  costas, caixa de recorte por ação, encaixe × peça × parte com ordem por parte, contato dos pés indicado pela arte.
- **Exportador mínimo** `scripts/export-personagem.py`: valida a entrega (tamanhos, caixa, partes, contato, prévias
  ≤ 1 MB) e exporta WebP + `manifesto.json`. Testado com o v01 convertido: caminhada de 5 partes ≈ 300 kB.
- Pastas: `entrega/v02` e `previas/v02` no git; `_trabalho/` e `_arquivo/v01` (Krita/ORA, ~577 MB) só locais pelo
  `.gitignore`. O humano chibi v01 foi arquivado como referência. Não altera a versão jogável.

## 0.47.2 — 2026-11-04
- **Tablet: botão de ação de volta** (pedido do dono do produto). O toque na tela continua agindo como o clique.
- **Digitar no menu do tablet/celular**: ao tocar no campo do nome (ou do código), o jogo pedia tela cheia; o teclado
  na tela tira o navegador da tela cheia, e o toque seguinte pedia de novo — o teclado não chegava a abrir e a tela
  alternava entre tela cheia e navegador. Agora tocar num campo de texto (ou com um campo em foco) não pede tela cheia.

## 0.47.1 — 2026-11-04
- **Menu no celular deitado**: com "Jogar com amigos" o painel passou da altura da tela e o botão "Entrar com código"
  ficava inalcançável (o painel não rolava com o dedo). Agora, em telas baixas, o menu e "Jogar com amigos" ficam
  **lado a lado** e cabem inteiros (~340 px de altura); se ainda faltar espaço (ex.: teclado aberto), o painel rola com
  o dedo e usa a altura visível de verdade (`dvh`).

## 0.47.0 — 2026-11-04
- **Jogar com amigos** (Fase M, etapa 3; servidor `orvalis-servidor.pensamentos.online`): no menu ☰, escreva seu nome
  e **crie uma sala** (aparece um código de 6 letras para passar aos amigos) ou **entre com o código** de alguém. Até 4
  jogadores no mesmo mundo: cada um vê os outros andando, com o nome em cima, e o que alguém quebra, coloca, ara,
  planta ou abre aparece para todos. "Sair da sala" volta ao seu mundo de sempre (salvo). O nome fica lembrado no
  aparelho. Na sala nada é salvo no aparelho; monstros, animais e moradores ainda são de cada um.
- Teclas digitadas nos campos do menu não movem mais a heroína.

## 0.46.0 — 2026-11-04
- **Pacote do multiplayer para o servidor** (Fase M, etapa 2): `npm run build:net` gera `dist-net/orvalis-net.cjs`
  (sala, protocolo e regras do mundo num arquivo para Node, sem dependências; versão e commit no cabeçalho). A
  Verificação compila o pacote em todo PR. O servidor (`maiam/orvalis-servidor` 0.2.0) passa a abrir salas co-op de
  verdade com ele: criar sala, entrar pelo código, ações confirmadas para todos, limites de mensagens e de origem.
  O jogo ainda não mostra o multiplayer (Etapa 3).

## 0.45.0 — 2026-11-04
- **Base do multiplayer** (Fase M, etapa 1; ADR 0016 com as decisões do dono do produto: co-op com código de convite
  até 4 jogadores, convidado só com nome, sem combate entre jogadores). Ações do jogador como dados aplicadas pelas
  regras do `World` (`world/actions.ts`), protocolo de mensagens (`net/protocol.ts`), sala autoritativa pura
  (`net/room.ts`) que o servidor vai usar, sessão do jogo (`net/session.ts`) e um servidor de teste dentro do próprio
  jogo (`net/loopback.ts`). Testado com vários jogadores: edições iguais para todos, quem chega depois recebe o que já
  foi feito, cidade protegida recusada, sala cheia, nome e versão inválidos. Ainda não aparece no jogo (Etapa 3).

## Sem versão (docs) — 2026-11-04
- **Servidor do Orvalis no ar (Etapa 0 do multiplayer)**: repositório `maiam/orvalis-servidor`, publicado em
  `orvalis-servidor.pensamentos.online` (app web Node.js da Hostinger). O teste de WebSocket conectou: a hospedagem
  aceita conexões em tempo real.
- **Orvalis independente do maiamapps** (ADR 0015, decisão do dono do produto): o jogo não usa nem acessa o
  maiamapps; terá domínio próprio e, até lá, `pensamentos.online`. Multiplayer, contas e nuvem pertencem a um
  **backend próprio do Orvalis**, em repositório separado e subdomínio próprio. Plano do multiplayer registrado
  (NEXT_STEPS, Fase M). Nenhuma mudança no jogo.

## 0.44.0 — 2026-11-04
- **16 expressões nos moradores** (pranchas do dono do produto: personagem careca com 16 rostos de frente, de lado e do
  outro lado): sereno, alegre, sorriso, risada, surpreso, piscadela, contente, animado, triste, assustado, bravo,
  convencido, gargalhada, neutro, tímido e sonolento. O script isola cada rosto e o encaixa em todos os personagens
  (5 cabelos), em todos os quadros da caminhada, redesenhando a franja de cada cabelo por cima. Os efeitos fora do rosto
  (zzz, veia de raiva, tracinhos de susto) viram uma camada própria.
- Cada morador tem uma **expressão de repouso** sorteada pela seed (o ferreiro fica sempre sorridente) e **reage ao
  conversar** (risada, animado, piscadela ou gargalhada) por 3 s.
- Camadas do morador: personagem → rosto → franja → efeitos → roupa. Tudo carrega em segundo plano (início ~2,6 MB).

## 0.43.1 — 2026-11-04
- **Fonte maior** (arte nova do dono do produto): a fonte da praça central passa de 3×3 para **5×5**, centralizada na
  praça; bancos e barracas em volta continuam nos mesmos lugares. Muda a praça central (igual em toda seed); salvamentos
  antigos se ajustam sozinhos (a área da cidade volta do gerador).

## 0.43.0 — 2026-11-04
- **Fonte, poço, barraca de frutas e barril com arte nova** (pranchas do dono do produto), no lugar da pintura em
  código. Os tamanhos dos lotes não mudaram: fonte 3×3, poço 2×2, barraca 2×1 e barril 1×1. Só os caixotes e as placas
  continuam pintados.
- **Personagem ruivo** (`villager-red`): a cidade volta a ter 4 moradores comuns (loiro, castanho, prateado e ruivo)
  e mais o ferreiro.

## 0.42.1 — 2026-11-04
- **Ferreiro com visual fixo e único** (regra do dono do produto): sempre o personagem de **cabelo preto** com a
  **roupa de ferreiro**. Nenhum outro morador usa esse personagem nem essa roupa. A cidade fica com 3 moradores
  comuns (loiro, castanho e prateado), cada um com roupa casual sorteada pela seed, e o ferreiro na Ferraria.

## 0.42.0 — 2026-11-04
- **Interior da Ferraria** (arte do dono do produto): andar para cima diante da porta da Ferraria leva para dentro
  (escurece rápido e mostra "Ferraria"); pisar no capacho volta para a rua. Lá dentro: forja, bigorna, armeiro,
  estantes e balcão; paredes e móveis bloqueiam, o chão e o tapete são andáveis. Cômodo isolado do mapa e protegido
  (ADR 0014).
- **O ferreiro mora na Ferraria**, atrás do balcão; tocar nele (ou o botão de ação diante do balcão) mostra a fala dele.
  **Moradores também falam** quando tocados (dicas sobre a cidade).
- Mensagens longas no alto da tela quebram linha no celular e ficam mais tempo.
- Salvo dentro de um interior, o jogo volta na rua, diante da porta. Formato do salvamento inalterado.

## 0.41.0 — 2026-11-04
- **4 roupas novas** (prancha do dono do produto): jardineira de lavrador, colete social, moletom verde e a
  **roupa de ferreiro**. As 3 primeiras entram no sorteio dos moradores (agora 5 roupas casuais).
- **Ferreiro**: 5º morador, sempre com a roupa de ferreiro, diante da porta da Ferraria (cabelo sorteado pela seed).
  Roupas de ofício (`smith`) ficam fora do sorteio e vestem só quem tem o ofício.
- `extract-villagers.py` remove o fundo claro de folhas que não vêm transparentes (a do colete veio com fundo cinza).

## 0.40.1 — 2026-11-04
- **Hospedaria com arte nova** (9×5, 2 andares, prancha do dono do produto): substitui a pintura em código. A prancha
  já vem transparente; o recorte usa o alfa dela. `extract-town.py --only <nomes>` recorta só os objetos pedidos.
  Removido o desenho de casa em código que só a hospedaria ainda usava.

## 0.40.0 — 2026-11-04
- **Moradores na cidade**: 4 moradores (cabelo loiro, castanho, preto e prateado) passeiam pelas ruas e praças da
  Cidade do Despertar (praça inicial, caminho da praça central e pátio do castelo) e nunca saem delas; o golpe não os
  atinge. **Roupas em camadas**: o dono do produto passa a desenhar personagens de roupa branca + folhas de caminhada só
  de roupa; cada morador veste uma roupa sorteada pela seed (jaqueta jeans ou jaqueta de time, por enquanto), desenhada
  por cima no mesmo quadro (`scripts/extract-villagers.py` alinha tudo na mesma grade e escala).
- **Cavalo** no campo ao sul do portão, perto do rebanho: passeia e, como as ovelhas, não sobe em cubos.
- Passeio dos animais/moradores extraído para `game/wanderer.ts` (ovelha, cavalo e morador usam o mesmo).
- Folhas de moradores, roupas e cavalo não atrasam o início (cada um aparece quando a folha chega); o build conta-as
  fora do orçamento de início (~2,5 MB).

## 0.39.1 — 2026-11-03
- **Texturas sempre na direção desenhada** (pedido do dono do produto): o chão deixava alguns materiais girados ou
  espelhados ao acaso por célula para disfarçar a repetição; agora todo bloco aparece exatamente como a arte foi
  criada. A variedade passa a vir só das variações enviadas (ex.: 3 gramas), cada uma na direção original.

## 0.39.0 — 2026-11-03
- **Vida e dano com números (Fase P, entrega 1).** Heroína com **100 de vida** numa **barra com número** (no lugar dos
  corações), ataque 5 e defesa 2. Dano = ataque + poder da arma − defesa (mínimo 1), **±10%** de variação e **5% de
  crítico** (×1,5). Espada (12) bate mais que machado (7). Regeneração: 5% da vida a cada 1,5 s após 6 s sem dano.
- **Números de dano subindo na tela**: branco no inimigo, vermelho na heroína, amarelo e maior no crítico.
- **Aranhas com ficha** (vida/ataque/defesa): pequena 20/8/0, grande 45/14/2, Rainha 180/36/6 — com a espada, ~2, ~3 e
  ~16 golpes.
- Regras numéricas num só lugar: `world/progression.ts` (puro, testado). Salvamento **v5**: vida antiga convertida na
  mesma proporção (heroína e aranhas). 4 testes novos (121).

## 0.38.0 — 2026-11-03
- **Terra com Grama com arte nova** (prancha fornecida, `scripts/extract-grass.py`): 3 variações sorteadas por célula,
  no chão e nos cubos (o chão fica menos repetido).
- **Plano de progressão registrado** (`NEXT_STEPS`, Fase P): vida e dano com números, nível e XP, profissões com
  proficiência (Lenhador, Minerador, Agricultor, Construtor), comida e cura. Decisões do dono do produto em `DECISIONS`.

## 0.37.3 — 2026-11-03
- **Regra de publicação** registrada (`CONVENTIONS`): um PR para `main` por entrega, mesclado automaticamente (método
  *merge*) depois que a **Verificação** passa.
- **Verificação no GitHub Actions** (`.github/workflows/ci.yml`): `npm ci`, tipos, testes, build e `npm audit` em todo PR
  para `main`.
- **Dependências sem vulnerabilidades** (alerta da Hostinger: 6, sendo 2 críticas em `tinypool`): Vite 6.4 → **7.3**
  (esbuild 0.28) e Vitest 3.2 → **5.1**. Eram só ferramentas de teste/build — o site publicado não as contém —, mas
  `npm audit` agora mostra 0. Node mínimo: **22.12** (`engines`; a Hostinger usa 22.x).
- Benchmark migrado para a API do Vitest 5 (`bench` do contexto do teste, `benchmark.include`); números iguais aos de
  antes (~0,08 ms por chunk).

## 0.37.2 — 2026-11-03
- Publicação pela integração GitHub da Hostinger (branch `main`, Vite, Node 22, `npm run build`, saída `dist`, sem
  variáveis de ambiente) documentada em `OPERATIONS`.
- **Site próprio em `orvalis.pensamentos.online`** (Hostinger, provisório no lugar de `maiamapps.com.br`):
  `npm run pack:site` gera `orvalis-site.zip` (build com os dois mundos + `.htaccess` com tipos MIME e cache) e o passo
  a passo do hPanel está em `OPERATIONS`.

## 0.37.1 — 2026-11-03
- **Nome oficial: Orvalis** (título da página, menu, app instalável e Artifact). Repositório, pacote e chaves de
  salvamento mantêm "mundoblocos" para não apagar os jogos salvos.
- Passo a passo de hospedagem em `orvalis.maiamapps.com.br` (Hostinger) em `OPERATIONS`.

## 0.37.0 — 2026-11-03
- **Imagens em arquivos separados (ADR 0013, decisão do dono do produto).** O Artifact deixa de ser um HTML único com
  tudo em base64: a página leva só o código (205 kB) e as 75 imagens são publicadas ao lado dela (cache do navegador
  entre versões). Novo orçamento: o que o jogo **espera para começar** < 3 MB (hoje ~2,5 MB); o total pode crescer.
- **Arte da dungeon em segundo plano**: carrega depois do início e entra nas texturas quando chega.
- Ícone da Porta de Carvalho virou arquivo (`icon-block-oak-door`; não se lê mais nenhum canvas).
- **Correção**: poço, fonte, bancos e barracas estavam sobre quadrados de grama no meio das praças (v0.36).

## 0.36.1 — 2026-11-03
- **Correção: dungeon em cima da estrada do portão.** Em ~70% das seeds (43 de 60 testadas) a dungeon ficava logo ao
  sul do portão, cobrindo o fim da estrada e o campo onde o rebanho nasce. Agora ela evita também esse campo
  (`TOWN_SOUTH_FIELD`, 28 células abaixo da muralha). Teste novo com 40 seeds (117).
- **Correção: entrada da dungeon bloqueada** em algumas seeds (árvore/água diante dela): as células diante da entrada
  ficam sempre livres e em terra firme (`DungeonTerrain`).
- **Correção: luz do poste no pé dele** — à noite o brilho agora sai da lanterna (`glowAt` nas texturas).
- **Correção: tocar no telhado** de uma construção alta pegava a planta atrás dela; vale o desenho inteiro da
  construção e a da frente vence.
- Documentação revisada (estado, plano, regras de morte/renascer, receitas, dungeon).

## 0.36.0 — 2026-11-03
- **Cidade maior e construções com arte fornecida.** Novos tamanhos (definidos pelo dono do produto): casas 5×5
  (térrea ou de 2 andares, telhado vermelho/azul/marrom), lojas 5×5, ferreiro 8×5, guilda 9×9, castelo 26×17 (com
  fosso e ponte), guaritas 4×6, bancos 2×1 e 3×1, postes de luz (pedra, madeira, madeira e pedra). A cidade passa de
  108 × 78 para **164 × 132** para caber tudo na proporção (90 casas). Térreas bloqueiam 4 das 5 fileiras: a de trás é
  quintal andável.
- `scripts/extract-town.py` refeito: tabela de objetos (recorte, encaixe por largura, remoção do fundo da guarita,
  limpeza de legendas) → `town-<nome>.webp` em escala única (48 px/célula). Hospedaria, fonte, poço e barracas seguem
  pintados em código.
- **Muda a cidade de todos** (e a posição da dungeon, planejada fora dela). Artefato: 3,95 MB.

## 0.35.4 — 2026-11-03
- **Correção: casa vermelha deformada.** Com uma só imagem para todos os tamanhos, o telhado era remontado
  (fileiras repetidas + ajuste vertical) para cobrir a profundidade — parecia esticado/duplicado. Agora há **uma
  imagem por tamanho** (3×2, 4×3, 5×3, desenhadas pelo dono do produto), desenhada sem alteração: só reduzida para a
  parede medir a largura da casa. A casa 4×2 (sem imagem) não usa vermelho (azul/alaranjado pintados).

## 0.35.3 — 2026-11-03
- **Nova arte da casa de telhado vermelho** (telhado com 6 fileiras e parede de dois andares: madeira sobre pedra).
- **Arbustos da cidade com arte fornecida** (`assets-src/town-bushes.png`): a cerca viva usa 3 arbustos (redondo,
  alto e largo com flores), sorteados por posição (fixos como a cidade); mesma escala, base no pé da célula.

## 0.35.2 — 2026-11-03
- **Casa de telhado vermelho com a arte fornecida** (`assets-src/town-house-red.png` → `scripts/extract-town.py`):
  todas as casas vermelhas da cidade usam a imagem, em qualquer tamanho (parede na largura da casa; telhado remontado
  em fileiras de telhas até cobrir a profundidade). As outras cores seguem pintadas em código.

## 0.35.1 — 2026-11-03
- **Correção: "Novo mundo" (e "Recomeçar") não faziam nada no Artifact.** A confirmação usava `window.confirm`, que o
  iframe do Artifact bloqueia (devolve "não" sem mostrar a janela). Agora a confirmação é no próprio menu: o botão
  fica vermelho ("Toque de novo para criar") e o segundo toque, em até 5 s, executa. Ao abrir o mundo novo aparece
  "Novo mundo criado · semente N" — todo mundo começa na mesma cidade, então sem aviso parecia que nada mudou.

## 0.35.0 — 2026-11-03
- **Cidade do Despertar** (Cidade 1, `world/town.ts`, ADR 0012, `domains/town.md`): cidade medieval fortificada de
  108 × 78 blocos, **igual em qualquer seed** (procedural com semente própria fixa), onde todo jogador começa e para
  onde volta ao morrer sem tenda. Muralha de Tijolo de Pedra (inteiro/rachado) com torres e um só portão ao sul,
  castelo com pátio ao norte, labirinto de ruas de Pedra Irregular/Rachada (caminho principal sinuoso, ruas
  secundárias, laços, becos), praças inicial/central/do castelo, Guilda, Hospedaria, Ferreiro, 3 lojas, ~60 casas,
  fonte, poço, barracas, lampiões (brilham à noite), cercas vivas e jardins.
- **Nada quebra nem é colocado dentro da cidade** (área protegida). Tocar numa construção/placa mostra o nome.
- Arte das construções pintada em código (`render/townArt.ts`): nenhum byte a mais no artefato.
- **Muda o mapa de todas as seeds**: início dentro da cidade, dungeon replanejada fora dela, ovelhas do lado de
  fora do portão. Salvamentos antigos carregam (células da cidade voltam do gerador). 8 testes novos (116).

## 0.34.1 — 2026-11-03
- **Porta entre qualquer madeira ou pedra**: as 8 pedras servem de batente (antes só a Pedra Bruta). Propriedade nova
  `stone` em `BlockDef` (fonte única do que é pedra); teste da porta cobre as 7 variações.

## 0.34.0 — 2026-11-03
- **8 variações de pedra** (prancha 3/4 fornecida, `scripts/extract-stones.py`): a pedra do mundo passa a ser a
  **Pedra Bruta** (mesmo id 25; montanhas, pedregulhos, batente de porta e água seguem iguais) e entram 7 blocos novos:
  Pedra Irregular, Tijolo de Pedra, Chão de Pedra, Pedra Lisa, Pedra Polida, Pedra Rachada e Tijolo de Pedra Rachado
  (ids 34–39 e 42). Todos são materiais: colocam, quebram com picareta/pá/mão e voltam como item.
- **Receitas do Construtor 1:1**: Pedra Bruta → Pedra Irregular, Tijolo de Pedra ou Chão de Pedra. As outras 4 ficam
  para receitas futuras ou construções prontas. 1 teste novo (108).

## 0.33.2 — 2026-11-03
- **Picareta também quebra a tenda**: exceção por ferramenta no registro (`ToolDef.alsoBreaks`); a picareta segue sem
  quebrar as outras madeiras (tora, tábua, porta, baú, árvores).

## 0.33.1 — 2026-11-02
- **Machado quebra a tenda** (a tenda passa a ser de madeira; com isso a picareta, que não quebra madeira, deixa de
  quebrá-la; a mão continua).
- **Morte: perde tudo menos as ferramentas** (materiais, sementes, trigo e espólios se perdem). 1 teste novo (107).

## 0.33.0 — 2026-11-02
- **Baú de Carvalho** (arte fornecida; receita do Construtor: 8 tábuas): 27 espaços. Tocar nele abre o Baú (3×9) e a
  Bolsa acima da mão; troca tocando no item e depois no destino (pilha inteira, mão ↔ bolsa ↔ baú). Quebrar o baú
  devolve o baú e derruba o conteúdo no chão. Conteúdo salvo (salvamento v4).
- **Tenda — aviso e regra do renascer**: cada tenda colocada mostra "Ponto de renascimento alterado" e vale sempre a
  última; derrubar a última volta o renascer ao início ("…voltou ao início"), mesmo com tendas antigas de pé.
- Mensagem curta na tela (`Hud.toast`). 4 testes novos (106).

## 0.32.1 — 2026-11-02
- **Correção: tenda prendia a heroína.** Ao colocar, só a célula alvo era conferida, mas a tenda ocupa 2×2 e uma parte
  podia cair sobre a heroína (ex.: olhando para a esquerda). Agora as 4 células precisam estar sem ninguém, e o jogo
  escolhe a posição 2×2 que cobre a célula à frente e se estende para longe dela. Ao carregar um salvamento com a
  heroína presa, ela vai para a célula livre mais perto. 2 testes novos (103).

## 0.32.0 — 2026-11-02
- **Tablet**: detectado como tela de toque com lado menor ≥ 600 px (`ScreenMode.isTablet`). Mantém o joystick, tira o
  botão de ação e o toque no mundo age como o clique do computador (tocar usa, segurar quebra). Celular não muda.
  1 teste novo (101).

## 0.31.2 — 2026-11-02
- **Tábua de Carvalho também substitui a água** (vira o chão da célula, como terra, pedra e tora).

## 0.31.1 — 2026-11-02
- **Tenda ocupa 2×2 blocos**: a célula escolhida é o canto inferior esquerdo; precisa das 4 livres em chão firme;
  as outras 3 bloqueiam (`TENT_PART`, sem arte); quebrar qualquer parte derruba a tenda inteira e devolve 1. Sprite
  com ~2 células de largura; renascer em volta da tenda.

## 0.31.0 — 2026-11-02 (Fase 3 — receitas)
- **Grade de 12**: 9 itens (1–9) · separador duplo · **Personagem** (ícone, ação em breve) · **Habilidades** (K) ·
  **Bolsa** (B/I). A bolsa passa a guardar **27 itens** (9 na mão + 18).
- **Habilidades**: acima da grade, **Receitas** (4×9, alinhadas aos 9 itens) e, à direita, **Profissões** (4×2).
  Profissão **Construtor** com 3 receitas — Tábua de Carvalho (1 tora → 2), Porta de Carvalho (4 tábuas → 1), **Tenda**
  (10 sedas + 10 tábuas + 4 presas). Tocar cria 1; sem ingredientes, a receita fica apagada.
- **Tenda**: colocada no chão, vira o **ponto de renascer** (ao lado da última tenda; quebrada, volta o início).
- **Nova arte da Tábua de Carvalho** (prancha fornecida; o bloco "Piso de Carvalho" passa a se chamar Tábua de
  Carvalho) e ícones de Personagem, Habilidades, Construtor e Tenda. `scripts/extract-ui.py`. Salvamento v3 (grade de 9
  + tenda; migra a v2). 3 testes novos (100).

## 0.30.0 — 2026-11-02
- **Novo visual da bolsa**: abre dentro do mesmo cartão da grade — 2 fileiras de 9 espaços acima da mão, do mesmo
  tamanho e largura dos 9 da grade (3 fileiras de 9 no total). Só o título "Bolsa" (sem textos de ajuda nem ✕).
- **Bolsa com 18 espaços**: o que não está na mão ocupa um espaço; item de tipo novo só é coletado se houver espaço
  vazio na mão ou na bolsa (senão fica no chão); pilhas que ela já tem sempre somam. Guardar um item da mão na bolsa
  exige lugar. `BAG_SLOTS`, `canCarry`, `bagStacks`, `bagHasRoom`. 1 teste novo (98).

## 0.29.1 — 2026-11-02
- **Porta também entre blocos de Pedra**: batentes podem ser de madeira (Tora/Piso de Carvalho) ou Pedra, inclusive
  misturados.
- **Qualquer tipo de terra substitui a água**: Terra, Terra com Grama, Terra Arada e Caminho de Terra (além de Pedra e
  Tora). Areia continua sem substituir.

## 0.29.0 — 2026-11-02
- **Água como bloco do mundo** (arte fornecida): o chão de água usa o topo do bloco de água (ladrilho contínuo).
  Continua **inquebrável**, mas **Terra, Pedra ou Tora a substituem** (viram o chão da célula; gastam o material).
- **Água enche buracos vizinhos**: buraco ao lado de água enche sozinho em 0,6 s, com a animação de enchimento
  (4 direções, conforme o lado de onde a água vem), e passa a encher os buracos vizinhos em cadeia. Terra firme não é
  inundada; buraco tapado antes de encher desiste. Ao carregar um salvamento, buracos vizinhos de água voltam a encher.
- `World.scheduleFlow/tickWater/waterFlows/settleWater`, `REPLACES_WATER`, `FLOW_SECONDS`; `scripts/extract-water.py`.
  4 testes novos (97).

## 0.28.0 — 2026-11-02 (Fase 3 — coleta de materiais)
- **Materiais coletados** no mundo principal: quebrar solta o próprio bloco (cubo ou chão), árvores soltam 2–3 Toras
  de Carvalho, porta volta porta; colocar gasta 1. Santuário continua infinito (perfil `collectBlocks`).
- **Grade de 8 espaços + bolsa no 9º** (ícone fornecido): ferramentas, itens e materiais dividem os 8 espaços; o que é
  coletado soma na grade (se já estiver nela ou houver espaço livre) ou vai para a bolsa. **Bolsa**: tudo que a
  heroína carrega; toque num item e num espaço para trocar; pausa o jogo. Teclas 1–8, 9/I/B (bolsa), Esc.
- **Ao cair, perde todos os materiais** (ferramentas, sementes, trigo e espólios ficam).
- Começo: ferramentas, 5 sementes, 2 trigos e 1 Porta de Carvalho (na bolsa). Contador de espólios saiu da HUD
  (estão na bolsa). Salvamento v2 (grade + materiais; migra a v1). 5 testes novos (93).

## 0.27.0 — 2026-11-02 (Fase 2 do plano — salvamento automático)
- **Salvamento automático no navegador** (ADR 0011): chunks editados, plantações, heroína (posição, vida), item
  selecionado, inventário (com espólios), ovelhas, aranhas vivas e renascimentos pendentes, hora do dia. A cada
  10 s, ao esconder a aba, ao sair e ao abrir o menu. Um salvamento por mundo e seed; abrir sem `?seed=` continua o
  último. Navegador sem armazenamento → o jogo segue e o menu avisa.
- **Menu** (☰): continuar, novo mundo, recomeçar este mundo; mostra a semente e o último salvamento; pausa o jogo.
- `game/save.ts`, `game/menu.ts`, `World.modifiedChunks/restoreChunk`. 2 testes novos (88).

## 0.26.1 — 2026-11-02
- **Arte final de combate** (pranchas fornecidas): ícones de Seda, Presa e Coração da Rainha; **folhas de morte** das
  três aranhas (8, 8 e 16 quadros: reação → colapso → fumaça), na mesma escala da caminhada. Substituem a arte
  provisória (a morte procedural fica só como reserva). Duração da morte por tipo (0,7 / 0,9 / 1,6 s); a sombra some
  junto. `extract-dungeon.py` ganhou `icons()` e `death()` (quadros pelos vãos entre colunas, franja colorida removida).

## 0.26.0 — 2026-11-02 (Fase 1 do plano — combate jogável)
- **Vida da heroína**: 5 corações, invencibilidade curta e recuo ao levar dano, regeneração fora de combate;
  derrotada, **renasce no início mantendo os itens**. Corações na HUD só quando importam.
- **Aranhas mordem** (½, 1 e 2 corações) e **perseguem pelos corredores** (mapa de distâncias por BFS na dungeon).
- **Morte dos monstros** com animação provisória e **espólios**: Seda, Presa e Coração da Rainha (contador na HUD).
- **Renascimento**: todas as aranhas voltam com o tempo (40 s / 60 s / Rainha 300 s), longe da heroína.
- **Entrada**: farol roxo na frente e seta na borda da tela; penumbra dentro do labirinto; vinheta de dano.
- Arte provisória (ícones SVG, corações vetoriais, morte procedural) até as pranchas finais. 5 testes novos (86).

## 0.25.0 — 2026-11-02 (Fase 0 do plano)
- **Arte separada por mundo** (ADR 0010): pacotes `render/art/principal.ts` e `santuario.ts`; o build de cada
  artefato só leva a arte do seu mundo. Sprites em WebP q84/alfa q85. **Mundo principal 3,84 → 2,63 MB; Santuário
  3,29 → 0,68 MB**; o build não avisa mais de tamanho.
- **`ActionController`** (`game/actionController.ts`): regras de ação por célula, toque/clique/segurar, porta,
  quebra e alvos para o render saíram do `Game` (611 → 290 linhas), sem mudar comportamento (regressão completa no
  navegador: arar, plantar, amassar, colocar, quebrar com mão e ferramenta, porta, alimentar, golpe, Santuário).
- Santuário republicado com o motor atual.

## Docs — 2026-11-02
- `NEXT_STEPS.md` reorganizado em **plano por fases** (panorama, fases 0–5, decisões pendentes, dependências
  externas, riscos); itens já feitos removidos (monstros, quebra mais rápida com ferramenta). Números atualizados
  em `CURRENT_STATE`/`ARCHITECTURE` (artefato 3,84 MB, render ~0,4 ms).

## 0.24.0 — 2026-11-02
- **Covil das Aranhas vira um labirinto procedural** (~9× maior: 96–108 × 66–78 blocos, tamanho pela seed):
  caminhos sinuosos (árvore "growing tree"), bifurcações, circuitos, becos sem saída, câmaras com bordas
  irregulares, corredores de 2–3 blocos com curvas, **uma única entrada** e a **câmara da Rainha** (~17×17) no
  ponto mais fundo, com **uma única passagem**. Validação de navegação na própria geração.
- Geração em etapas separadas: área (`dungeonSize/planDungeon`) → labirinto (`buildMaze`: só chão e paredes) →
  conteúdo (`decorateDungeon`: blocos, obstáculos nas câmaras, monstros proporcionais ao chão, ~39 na seed 42).
- Paredes = cubo de pedra escura da prancha (`DUNGEON_WALL`, 2 de altura no desenho, `textures.stackDraw`);
  montanhas só no anel externo. Chefe preso à câmara da Rainha.
- Testes da dungeon reescritos para as regras da spec (6 casos, 5 seeds). 81 testes.

## 0.23.0 — 2026-11-02
- **Primeira dungeon — Covil das Aranhas** (mundo principal, a ~26–60 células do spawn): área 34 × 24 murada por
  montanhas com **uma única entrada** voltada para o spawn; chão de caverna (terra, musgo, teias, ossos); pedras,
  ninhos de ovos, cogumelos, espinhos e raízes como obstáculos que nunca bloqueiam o caminho.
- **Área protegida**: nada quebra, nada é colocado, arado, amassado ou plantado lá dentro — só combate.
- **Monstros**: 10 aranhas pequenas, 5 grandes e **1 Aranha Gigante (chefe, 14 golpes)**. Passeiam, perseguem a
  personagem dentro da dungeon e **nunca saem dela**. Espada/machado tiram vida (pisca, recua, barra de vida);
  sem vida, somem. Ainda não causam dano.
- Arte das 6 pranchas fornecidas via `scripts/extract-dungeon.py` (3 modos de recorte de fundo); sprites de cenário
  com variantes por célula; folhas de monstro em ciclo único (8 quadros) espelhadas para a direita.
- `world/dungeon.ts` (`buildDungeon/planDungeon/DungeonTerrain`), `World.isProtected/dungeon`, `game/monster.ts`,
  perfil `dungeon`, ADR 0009. 8 testes novos (79 no total).

## 0.22.0 — 2026-11-02
- **Porta só entre batentes de madeira**: as células da esquerda e da direita precisam de um cubo de madeira no
  nível 0 (Tora ou Piso de Carvalho; `World.hasDoorFrame`, por `BlockDef` cubo + `organic: 'wood'`).
- **Quebrar com ferramenta leva 1 s** (mão/item continua 2 s): `breakSeconds(tool)` em `world/items.ts` substitui
  `BREAK_HOLD_S` do `Game`. 2 testes novos (71 no total).

## 0.21.0 — 2026-11-02
- **Pilha de até 3 cubos** (`MAX_STACK` = 3): `Chunk.levels` (um array por nível), `World.getLevel/topBlock/
  stackHeight/placementLevel` genéricos; render, sombra e `pick()` iteram os níveis. A personagem sobe até o nível 3
  (1 por passo).
- **Porta de Carvalho** (prancha fornecida, 8 quadros): bloco de madeira na hotbar (16º espaço), altura de 3 frentes
  de cubo. Vai só no chão; nada empilha sobre ela. Toque (botão de ação/Espaço ou clique, com qualquer item) abre e
  fecha com animação; fechada bloqueia, aberta deixa passar; não fecha com alguém dentro. Estado no id
  (`OAK_DOOR`/`OAK_DOOR_OPEN`); machado/mão quebram, picareta não (madeira).
- Hotbar menor em celulares deitados ≤ 700 px para caber os 16 espaços. 3 testes novos (69 no total).

## 0.20.0 — 2026-11-02
- **Picareta**: toque toca a animação de minerar (folha fornecida); segurar 2 s quebra **qualquer bloco** (pedra,
  terra, areia, cubos e chão) e plantas — **destruídas sem drop** —, mas **não** madeira nem árvores; não ataca.
- Registro: `breaks: 'nonWood'`; toque curto de qualquer ferramenta com `swings` toca a animação (não só as de chão).
- `process-sprite.py --respace PAD`: corta cada coluna no vão vazio perto da divisa de linha (quadros que
  transbordam a grade para cima e para baixo). 3 testes novos (66 no total).

## 0.19.0 — 2026-11-02
- **Pá**: toque (animação de cavar, folha fornecida) em Terra, Terra com Grama ou Terra Arada livre → **Caminho de
  Terra** (`World.canFlatten/flatten`). Segurar 2 s cava **só blocos macios** (terra, grama, arada, caminho, areia —
  cubo ou chão, que vira buraco) e **plantas, destruídas sem drop**; não quebra pedra, madeira, árvore; não ataca.
- Registro de ferramentas: `breaks: 'soft'`, `destroysPlants`, `groundUse: 'till' | 'flatten'` (o `Game` não testa
  mais `=== 'hoe'`); `toolDrops(tool, id)` aplica a regra de drop. `BlockDef.soft` nos 5 materiais macios.
- Atores de ação derivados de `TOOLS[t].swings`. 5 testes novos (63 no total).

## 0.18.0 — 2026-11-02
- **Enxada quebra plantas e derivados** (capim, flor, trigo — colheita —, cacto) segurando 2 s, com a animação de
  arar repetindo; continua sem quebrar madeira/árvore/blocos e sem atacar.
- `BlockDef.choppable` substituído por `organic: 'wood' | 'plant' | null`; regras `breaks: 'organic'` (machado) e
  `'plant'` (enxada). Animação durante a quebra vale para qualquer ferramenta com ação que quebre algo.

## 0.17.0 — 2026-11-02
- **Enxada**: animação de arar (folha fornecida) a cada toque; só troca Terra/Terra com Grama → Terra Arada.
- **Restrição**: enxada não quebra blocos, itens nem elementos (`breaks: 'none'`) e não acerta entidades.
- Registro de ferramentas ganha `swings` (tem animação de ação) separado de `strikes` (acerta entidades).
- 2 testes novos.

## 0.16.0 — 2026-11-02
- **Machado**: toque = golpe com a folha fornecida (animais somem, como a espada); segurar 2 s corta só o que é de
  madeira, árvore ou planta, repetindo a animação de golpe enquanto corta.
- Restrição de quebra por ferramenta no registro (`TOOLS.breaks`, `toolCanBreak`) + `BlockDef.choppable` +
  `World.breakTargetId`. Golpe genérico por ferramenta (`Player.attackTool`, `ActorKind heroine-<tool>-attack`).
- 4 testes novos.

## 0.15.0 — 2026-11-02
- **Ataque com espada**: toque/clique (ou botão de ação/Espaço) com a espada = golpe com a folha de ataque
  fornecida; acerto no meio do golpe, num arco à frente. Animais atingidos somem (sem animação de morte ainda).
- **Restrição**: a espada não quebra blocos, itens nem elementos (segurar com a espada não faz nada).
- Anel vermelho marca a entidade que seria atingida. `Entities.strike/strikeTargets` preparado para monstros.
- `process-sprite.py --largest` (mantém o maior pedaço por quadro).
- 5 testes novos (duração/quadros/acerto único, direção fixa, arco, par desfeito, sprite de golpe).

## 0.14.0 — 2026-11-02
- Mundo principal: **enxada ativa** — toque/clique (ou botão de ação) em Terra/Terra com Grama → Terra Arada
  (`World.canTill/till`; enfeites em cima são removidos).
- **Semente de trigo só em Terra Arada** (antes: grama, terra ou arada).
- Novos sprites de crescimento do trigo (16 estágios, sem monte de terra), processados por
  `scripts/process-crop.py` com base do caule ancorada e escala comum.
- Testes de cultivo atualizados (arar antes de plantar; não ara areia/pedra/piso/buraco).

## 0.13.2 — 2026-11-02
- Deusa da Vida passa a **flutuar** em vez de caminhar (a caminhada travava): folha de flutuação 7×4 fornecida,
  quadros em vai-e-volta contínuo, pairando acima da sombra com balanço suave; câmera sem balanço.
- `SheetSpec.float` no render de atores (reutilizável para outros personagens voadores).
- Folha de caminhada da Deusa removida do jogo (mantida em `assets-src/` como referência).

## 0.13.1 — 2026-11-02
- Santuário: arte provisória dos 18 blocos celestiais substituída pela prancha 3/4 fornecida
  (`extract-blocks.py --celestial` → `celestial-atlas.webp` + ícones refeitos do cubo inteiro).
- Chão: blocos com desenho central não giram; nuvens sem giro/espelho e com contraste suavizado.
- `blockArt.ts` carrega os dois atlas; `celestialArt.ts` deixa de ter pintura procedural.

## 0.13.0 — 2026-11-02
- **Santuário Celestial da Deusa da Vida**: novo mundo com 10 chunks (5×2), chão todo de Nuvem Sólida, Deusa da Vida
  como única personagem e 18 blocos celestiais como únicos blocos de construção. Sem ferramentas, cultivo ou ovelhas.
- Perfis de mundo (`world/profiles.ts`, ADR 0008): terreno, limites, personagem, blocos e sistemas por mundo;
  seleção por `VITE_WORLD` → subdomínio `santuario.` → `?mundo=santuario`.
- `World` com limites (`VOID` fora, carregamento recortado, spawn central) e blocos permitidos por perfil.
- `FlatGenerator` + interface `TerrainSource`; bioma `celestial`; partículas douradas (`sparkle`); céu em degradê e
  orla de nuvem nas bordas do mundo.
- Arte: Deusa (folha transparente; `process-sprite.py --alpha --grid-offset-y`), 18 ícones da prancha
  (`scripts/slice-icons.py`), faces provisórias procedurais (`render/celestialArt.ts`), `composeCube` reutilizável.
- Artefato próprio do Santuário (`npm run build:artifact:santuario`); `build-artifact.mjs` aceita nome e título.
- 7 testes novos (perfis, limites, blocos permitidos, buraco, spawn, personagem, hotbar).

## 0.12.0 — 2026-11-02
**Desempenho**
- Gerador: uma avaliação de ruído por célula (`cellAt`) → gerar chunk 3,5× mais rápido (0,26 → 0,07 ms).
- `World`: chunks com chave numérica + cache do último chunk → leituras 1,4× mais rápidas.
- Assets em WebP (`scripts/optimize-assets.py`, ADR 0007): 3,4 → 1,1 MB; artefato 4,7 → 1,5 MB.
- `npm run bench` com benchmarks de geração e leitura.

**Correções**
- Zoom pelo teclado (Q/E) dependia da taxa de quadros; agora usa `dt`.
- Árvores podiam nascer sobre as trilhas de caminho de terra.
- `make-icons.py` lia o PNG antigo da heroína.
- Aviso de tamanho do bundle no build ajustado ao arquivo único (limite 1,8 MB, documentado).

**Documentação**
- `CLAUDE.md` (instruções para IA, armadilhas conhecidas) + `AGENTS.md`; `docs/README.md` (índice);
  `docs/MAPS.md` (módulos, frame, regras, ciclos, assets, "onde mexer para…").
- CURRENT_STATE, NEXT_STEPS, ARCHITECTURE (seção Desempenho), OPERATIONS, CONVENTIONS e DECISIONS
  reorganizados; conteúdo obsoleto removido dos domínios.

**Verificação**: sessão automatizada (3 seeds, desktop/celular, 120 ações aleatórias cada) sem erros.

## 0.11.1 — 2026-11-02
- Arte dos blocos trocada pela prancha 3/4 fornecida (`blocks-sheet-34.png`) após comparação no jogo com a extração
  da prancha isométrica: frente sem distorção, terra arada/pedra/piso mais legíveis, grama mais calma no chão.
- `extract-blocks.py`: modo 3/4 (padrão) por recorte direto; `--iso` mantém a prancha antiga; `--out` para testes.
- Ícones da hotbar refeitos a partir da prancha 3/4.

## 0.11.0 — 2026-11-01
- Blocos substituídos pelos 8 da prancha fornecida: Terra, Terra com Grama, Terra Arada, Caminho de Terra, Areia,
  Pedra, Tora de Carvalho, Piso de Carvalho. Removidos tijolos, tábuas antigas, arbustos, minérios, cristal,
  arenito, neve, gelo, musgo encantado, cogumelo e árvores encantada/pinheiro (com tundra e floresta encantada).
- Materiais com id único para chão e cubo; mundo gerado só com eles (+ água, árvores, cacto, enfeites, trigo).
- `scripts/extract-blocks.py`: prancha isométrica → atlas 3/4 (topo, frente, chão contínuo) + ícones.
- Trilhas naturais de caminho de terra; plantio também em terra arada.

## 0.10.0 — 2026-11-01
- Botão de ação (toque) com aro vazado: toque curto usa o selecionado no alvo à frente; segurar 2 s quebra.
  Ícone = espaço selecionado ou mão; anel de progresso no próprio botão. Espaço faz o mesmo no desktop.
- Alvo à frente da personagem parada com cantoneiras pulsantes; nenhum alvo ao andar.
- Mão vazia: tocar no espaço selecionado (ou Esc) solta; o jogo começa com a mão vazia.
- No toque, tocar direto no mundo não age mais (só o botão). Mouse inalterado.
- Regras de ação unificadas por célula (`canUseAt/canBreakAt/applyUse`) para cursor e botão.
- `setPointerCapture` defensivo no botão e no joystick.

## 0.9.0 — 2026-11-01
- Ferramentas como itens selecionáveis (`TOOLS`): espada, enxada, picareta, pá, machado, com ícones fornecidos.
- Equipar ao selecionar: heroína usa a folha da ferramenta ao andar (5 folhas fornecidas, normalizadas).
- Hotbar: ferramentas 1–5, semente 6, trigo 7, blocos depois. Joystick acima da hotbar em paisagem baixa.
- `process-sprite.py --rows-map` (reordenar/espelhar linhas) e altura do desenho no relatório.

## 0.8.0 — 2026-11-01
- Itens contáveis (`world/items.ts`): Semente de Trigo e Trigo; inventário, hotbar com contador, itens caídos com coleta.
- Trigo plantável na terra, 16 estágios de crescimento por tempo (`World.tick`), colheita com drops.
- Ovelhas comem trigo, formam par, namoram (animação fornecida) e têm filhote (sprite fornecido) que cresce.
- Desvio lateral das ovelhas ao contornar obstáculos a caminho do par.
- `process-sprite.py` com argumentos nomeados (`--cols/--rows/--region/--sat/--min/--frame-h`).
- `window.__game` exposto apenas em desenvolvimento para testes no navegador.

## 0.7.0 — 2026-11-01
- Jogo garantidamente horizontal em toque: tela cheia + `screen.orientation.lock('landscape')` no 1º gesto
  (repetido se o jogador sair), camada "Gire o aparelho" em retrato que pausa a entrada.
- PWA: `manifest.webmanifest` (fullscreen, landscape), ícones, metas iOS/Android, `viewport-fit=cover`.
- Layout compacto para paisagem com até 500 px de altura (hotbar e joystick menores).
- Correção: camada com `display: grid` ignorava `hidden` e capturava toques.

## 0.6.0 — 2026-11-01
- Primeiro NPC: ovelha (sprite fornecido, 4 direções × 4 quadros) com IA de pastar/passear e retorno a casa.
- `Walker`: base comum de movimento/colisão/altura extraída do `Player` (sem duplicar regra para NPCs).
- `Entities`: personagem + NPCs, colisão entre entidades, ocupação de células para colocar/cavar, rebanho inicial.
- Renderer desenha todos os atores com ordenação por profundidade; `character.ts` generalizado para folhas de atores.
- `process-sprite.py` aceita altura do quadro e limiares de fundo/sombra.

## 0.5.0 — 2026-11-01
- Tela limpa: removidos painel de informações, botões (Chunks/Modo/Tempo/Novo mundo), dica de nome e texto de
  ajuda. Fica só a hotbar; o joystick aparece apenas em telas de toque.
- Quebrar passa a exigir segurar 2 s sobre o alvo (rachaduras + anel); colocar é toque/clique curto. Removido o
  modo Quebrar/Colocar (tecla F) e a diferença entre botões do mouse.
- Novo mundo agora só via `?seed=` (sem botão).

## 0.4.0 — 2026-11-01
- Chão quebrável: quebrar célula vazia cria `HOLE` (não pisável por personagem/animais, não quebrável).
- Buraco só aceita cubo novo, que vira piso nivelado (pisável e empilhável); quebrar o piso reabre o buraco.
- Bloqueado cavar sob a personagem. Água continua inquebrável.
- Render de buraco (parede interna 3/4) e de piso de cubo.

## 0.3.0 — 2026-11-01
- Cubos empilháveis (máx. 2 por célula, `MAX_STACK`); quebrar remove o de cima.
- Personagem sobe 1 nível por vez (`STEP_HEIGHT`) e desce livremente; altura suavizada no sprite e na câmera;
  HUD mostra o nível.
- Montanhas geradas com 1–2 níveis (minério no cubo exposto).
- Correção: `AIR` herdava `shape: 'cube'` da fábrica de objetos.

## 0.2.0 — 2026-11-01
- **Vista superior inclinada (3/4)** substitui a vista lateral (ADR 0003): mundo com camadas chão/objeto,
  gerador 2D (elevação, rios, montanhas com minérios, florestas), cubos com face superior + frontal.
- **Personagem jogável** a partir da folha de sprites fornecida (`scripts/process-sprite.py` remove o fundo e
  uniformiza quadros), colisão, 4 direções e animação de caminhada.
- **Câmera** segue a posição lógica com suavização (sem balanço), zoom automático com personagem grande.
- **Joystick virtual** alinhado às direções da tela.
- Alcance de interação; spawn em bioma acolhedor; clima deslocado por seed.
- Removidos: céu/parallax lateral (`background.ts`), rocha-mãe, cavernas. Novos: `daycycle.ts`,
  `character.ts`, `player.ts`, `joystick.ts`, sombras de nuvens.

## 0.1.1 — 2026-11-01
- `npm run build:artifact`: build em arquivo único publicado como Artifact para teste no navegador.
- Canvas usa `100%` em vez de `100vw/100vh` (respeita a área segura do host).

## 0.1.0 — 2026-11-01
- Projeto criado (Vite + TypeScript, sem framework).
- Domínio `world`: PRNG/ruído com seed, registro de blocos, biomas, gerador puro, chunks 16×16, `World`
  com regras de quebrar/colocar e ciclo de vida de chunks. Testes Vitest.
- Domínio `render`: texturas procedurais estilo RPG/anime, cache offscreen por chunk, fundo parallax com
  ciclo dia/noite, brilhos, partículas por bioma.
- `game`: câmera, input (teclado/mouse/toque), HUD e hotbar.
- Documentação viva inicial (`docs/`) e ADRs 0001–0002.
