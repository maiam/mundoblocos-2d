# Estado atual

_Atualizado em 2026-11-14 — v0.93.94 · jogo: **Orvalis** (`orvalis.pensamentos.online`)_

Este documento descreve **só o que existe hoje**. O histórico por entrega está no [`CHANGELOG`](CHANGELOG.md); o diário
técnico antigo (até a v0.80.0, com nomes de funções e versões de protocolo/salvamento) está em
[`archive/estado-por-versao.md`](archive/estado-por-versao.md). A cada entrega: ajuste a seção afetada aqui (não acrescente
uma seção por versão) e registre a mudança no `CHANGELOG`.

## Versões e números de referência
| Item | Valor | Fonte |
|---|---|---|
| Versão do jogo | 0.93.94 | `package.json` |
| `PROTOCOL_VERSION` (multiplayer) | 26 | `src/net/protocol.ts` |
| `SAVE_VERSION` (salvamento local) | 15 | `src/game/save.ts` |
| Testes | Vitest e verificação automática no GitHub Actions | `npm test` |
| Orçamento de início (ADR 0013) | ~2,9 MB de 3 MB (inalterado na v0.91.0: Mila e lobos carregam sob demanda) — **no limite** | build do artifact |
| Dependências | Vite 7, Vitest 5, TypeScript 5.9; Node ≥ 22.12 | `package.json` |

## Mundos
- **Grade do Mundo (v0.93.59, ADR 0032):** `SUBDIV = 2` por padrão no Mundo principal (célula de 16 px, chunk de 16 células cobre 256 px); Santuário em grade 1. Servidor precisa subir junto (NEXT_STEPS).
- **Orvalis (principal)**: gerado por seed (`?seed=`), chunks 16×16 nos dois eixos, vista 3/4. Mundo da Cidade 1: só
  **florestas** (Campos e Bosque de Sakura, com carvalho, bétula, cerejeira e macieira misturados), rios, mares, praias, montanhas, pedregulhos
  (ADR 0019). Abre numa **tela de entrada** (Novo jogo → montar personagem; Continuar se houver salvamento).
- **Santuário Celestial da Deusa da Vida** (`?mundo=santuario`): 10 chunks de nuvem, só a Deusa, os 18 blocos
  celestiais + 2 paredes autotile + porta de parede (ADR 0027); sem ferramentas, cultivo ou animais. Subdomínio real ainda não hospedado (`domains/worlds.md`).
- **Teste de câmera e profundidade no Santuário (v0.93.65):** o botão **◉ Câmera**, no alto à direita, abre o joystick experimental para girar a câmera ortográfica 360° e mudar a inclinação (15°–85°) e o zoom (0,6–2,2×). Resetar volta a 67°, Salvar guarda as preferências localmente e fechar restaura a projeção oblíqua original. Há controles experimentais de **altura de bloco 25%–125%** e **tamanho de célula 50%–125%** (apenas geometria visual) e pilhas de **5 blocos** no Santuário, mantendo 2 no Mundo. A Grama Celestial recebeu atlas 512×512 com topo, base e quatro lados independentes; **não muda o mapa/salvamento nem o Mundo principal**. O personagem de sprite gira para acompanhar a câmera orbital.
- **Vila Camponesa** (`domains/village.md`, v0.93.89): área fixa de 48 × 48 células ao sul da cidade, protegida, na grade fina; muro de **Cerca de Estacas altas** em volta (1 × 1,5 célula por bloco) com portão menor que abre e fecha (vão de 3; volta aberto ao recarregar), 6 casas, celeiro, galinheiro, trigo, horta e enfeites; trilha de terra até a cidade; caverna e acampamentos ficam fora. Servidor com `build:net`. **Ovelhas, vacas, galinhas e capivaras nascem na vila** (`Entities.spawnVillageAnimals`, v0.93.91); o cavalo segue no campo diante do portão da cidade.
- **Água viva** (v0.93.92): **vitórias-régias** (comuns e gigantes, 4 variantes cada) sorteadas pela seed na água rasa de rios e lagos (`WorldGenerator.waterPlantAt`; objetos `WATER_LILY`/`VICTORIA`, enfeite que não bloqueia) e **peixes de ambiente** (4 espécies, só no 3D e no aparelho, nadam em cardumes, giram para a direção de nado e fogem do jogador; `?agua=0` desliga). Encher a água sob uma planta (Terra/Pedra/Tora) a remove.
- **Cidade do Despertar** (`domains/town.md`): 164 × 132 blocos ao norte da origem, igual em toda seed, área protegida,
  piso único de Tijolo de Pedra, muralha, castelo, guilda, hospedaria, ferreiro, lojas e ~90 casas. Início e renascer
  sem tenda = praça inicial. 16 NPCs nomeados (ferreiro **Black** + 15 moradores, `domains/npc.md`) + **8 moradores sorteados na cidade e 5 na vila** (primos recoloridos no shader, com nome/profissão/falas por seed) que falam numa **caixa de conversa** (retrato, nome, texto em páginas).
  **Interiores** da Ferraria, do Mercado, da Floricultura, da **Guilda** (com o Mestre Aldric, v0.93.120) e da Tenda (`world/interiors.ts`, ADR 0014); as demais construções só mostram o nome.
- **Covil das Aranhas** (`domains/dungeon.md`): labirinto procedural isolado (canto fixo), entrada em caverna a ≥ 10
  chunks do castelo, área protegida, ~38 aranhas + Aranha Gigante (chefe); farol e seta indicam a entrada.

## Personagem e controles
- **Cinco personagens prontos**: Heroína, Herói, Hood, Gino e Mila (`APPEARANCE_BODIES`), cada um com caminhada, as 5
  ferramentas e os 5 golpes; escolhidos na tela de entrada e salvos por mundo (o chibi modular saiu na v0.92.0).
- **Sentar**: tocar numa cadeira ou banco senta de frente (anda até o assento, desce, fica parado); andar levanta.
  Os cinco personagens prontos sentam.
- Celular: joystick + botão de ação (toque usa, segurar quebra: 2 s com a mão, 1 s com ferramenta). Tablet: também age
  pelo toque no mundo. Desktop: WASD/setas, Espaço, mouse, Q/E/roda = zoom. Sempre na horizontal (`ScreenMode`).
- HUD: grade de 12 (9 itens · Personagem · Habilidades · Bolsa), bolsa de 12 espaços à direita, barras de vida e de
  fome, **minimapa** redondo com névoa explorada (salva), **mapa grande em tela cheia** (toque no minimapa ou tecla M; v0.93.62: arrasta, zoom por roda/botões/pinça, enquadra tudo; pausa o jogo; `render/worldMap.ts`), menu ☰.
- Controles completos: [`README.md`](../README.md) da raiz e `domains/player.md`.

## Sistemas de jogo
- **Ferramentas** (espada, enxada, picareta, pá, machado): regras em `TOOLS` (`world/items.ts`) — o que quebram,
  toque no chão e drops. Detalhe em `domains/player.md` e `domains/farming.md`.
- **Blocos**: 12 materiais de construção obtidos pelo jogador (**blocos de 1/4 de célula, pilha de até 4**, ADR 0033; 5 pedras: Bruta, Tijolo, Chão,
  Lisa e Polida — as outras 3 foram aposentadas e só existem em mundos salvos). **Não há paredes como itens separados** (saíram em 08/11; em
  mundos e bolsas antigos viram vazio). Porta entre dois batentes (bloco de madeira — toras e tábuas de qualquer árvore — ou de pedra), cerca e portão que emendam pelos vizinhos, baú de 27 espaços, tenda
  (ponto de renascer, com interior). Água inquebrável que enche buracos vizinhos; buraco sem bloco por um dia inteiro ganha o chão de um vizinho.
- **Cultivo e árvores**: trigo, batata, tomate e cenoura (só em Terra Arada); árvores só adultas e de formas variadas
  (carvalho, macieira, bétula, cerejeira; sem mudas nem crescimento desde a v0.88.0) e maçãs colhíveis (a macieira colhida, com arte própria, volta a dar).
- **Chunk do muro**: todo chunk com pedaço da muralha da cidade é protegido por inteiro (v0.88.0; `World.isProtected`).
- **Animais**: ovelha, cavalo, vaca e galinha no campo ao sul do portão; comem, namoram (corações), têm filhotes que
  crescem e **seguem quem os alimentou**; vaca dá leite e galinha ovo ao comer. Sem montaria; golpe de espada os faz
  sumir (sem animação de morte).
- **Fome e comida**: barra de fome (só no mundo principal), alimentos crus e pratos feitos no Caldeirão (Cozinheiro),
  Forno de Pedra (queijo, torta). Receitas abrem uma ficha com Confirmar/Cancelar; algumas exigem estação por perto.
- **Combate e vida**: 100 de vida, ataque/defesa fixos do nível 1, dano = ataque + arma − defesa (±10%, 5% de
  crítico), números de dano, regeneração fora de combate; ao cair, perde tudo menos as ferramentas e renasce na
  última tenda ou na praça. **Ainda não há XP nem níveis** (`NEXT_STEPS`, Fase P).
- **Ciclo dia/noite** (8 min), sombras de nuvens, partículas por bioma.

## Salvamento e multiplayer
- **Local** (`domains/save.md`, ADR 0011): automático a cada 10 s e ao sair — mapa editado, plantações, personagem,
  aparência, inventário, fome, névoa do minimapa, ovelhas/aranhas e hora; um salvamento por mundo e seed. Itens caídos
  no chão e moradores não são salvos; no jogo sozinho os animais do campo também não.
- **Jogar com amigos** (`domains/multiplayer.md`, ADRs 0015/0016/0020/0021): menu ☰ → **Sala 1**, até 10 jogadores,
  aberta a quem tiver o site. O **servidor** (repositório `maiam/orvalis-servidor`) é dono do mundo, da hora, do
  crescimento, dos itens no chão e baús, dos animais, das aranhas e **dos moradores** (rotina, passeio e acompanhante de missão; v0.93.117); mundo, bolsas e animais da sala ficam salvos no
  servidor (moradores nascem pela seed). Conversa, loja, memória e missões seguem no aparelho de cada um. A opção só aparece onde o servidor aceita a origem (no Artifact aparece um aviso
  com o link do site).

## Hospedagem e publicação
- **No ar** em `https://orvalis.pensamentos.online` (Hostinger, publica a cada merge em `main`); também publicado como
  Artifacts (versão de teste). Verificação (GitHub Actions) em todo PR: `tsc`, testes, build, pacote do multiplayer
  e `npm audit`. Ver `OPERATIONS.md` e `CONVENTIONS.md`.

## Limitações conhecidas
- Salvamento só neste navegador/aparelho (nuvem/contas dependem do backend do Orvalis, ADR 0015).
- NPCs só dizem falas fixas (2 cada; sem escolhas, loja ou missões); só Ferraria e Tenda têm interior.
- **Lobos** (v0.91.0, `world/wolves.ts`, `domains/dungeon.md`): bandos de 1 a 3 da mesma cor (marrom, cinza, branco) pelo mapa ao redor da cidade; só atacam a personagem a até 3 células; soltam Pelagem e Presa de Lobo (sem uso em receitas ainda).
- **Goblins** (PR #96, `world/goblins.ts`; soltam **2 Moedas de Cobre** ao morrer): **um acampamento por região de 64 × 64 células (1 024 px; "1 a cada 16 chunks", v0.93.60)**, planejado uma vez pela seed em ±10 regiões em volta da cidade (~340–400 acampamentos), fora do anel da cidade e a ≥ 24 células um do outro, com sete goblins em torno da **fogueira já existente** (`Block.CAMPFIRE`; constante `PACK_REGION` ajusta a densidade). 60 de vida, ataque-base 15, persegue só a até três células (× `SUBDIV`). Sete folhas 4×4, passeio limitado, respawn e estados sincronizados na sala.
- **Lobos (v0.93.61):** as três cores (marrom, cinza, branco) agora têm **sete folhas 4×4 cada** (walk, idle, run, alert, attack, hurt, death; `assets-src/wolf-<cor>/`, `src/assets/wolf-<cor>-<estado>.webp`) e usam o mesmo mecanismo de pose do goblin e do lagarto (`hasPoses`/`PoseKind` em `game/monster.ts`; estado visual sincronizado pela sala no campo `v`). Substituem as folhas únicas antigas (`wolf-marrom/cinza/branco.webp`). Atenção: a folha marrom de alerta/ataque/dano/idle veio com as linhas na ordem frente/direita/esquerda/costas (`--rows-map 0,2,1,3`); a de caminhada já vinha na ordem do jogo.
- **Capivara** (v0.93.61, `FarmKind 'capybara'`, `game/horse.ts`): animal doméstico que só **passeia** (velocidade 0,8, coleira 7) — 3 perto do portão (ao lado oeste do campo das vacas); desenhada com a folha de caminhada e, parada, com a de idle (`capybara-idle`). **Sem filhote nem alimento por enquanto** (sem arte de filhote; não há item que ela coma). As folhas de comer, dormir, dano e morte estão em `assets-src/capybara/` e **ainda não entram no jogo**.
- **Homem-lagarto** (v0.93.60, `lizard`; vida **100**, ataque **15**, defesa 2, **2 Moedas de Cobre**): bandos de **três** na margem de rios (`WorldGenerator.riverAt`; ~110–155 bandos por seed, um por região), sem fogueira; mesmas sete folhas do goblin (`assets-src/lizard`, `--rows-map 0,2,3,1`), mesma visão/coleira/ritmo. **Streaming dos bandos** (goblins e lagartos, `Entities.updatePacks`): só vivem os bandos com jogador a até 56 × `SUBDIV` células e saem ao se afastar além de 80 × `SUBDIV` (renascimentos pendentes somem junto; o bando volta completo ao se aproximar). `spawnWildlife(world, true)` (jogo e sala) deixa isso por conta do streaming; sem o argumento (testes) todos nascem de uma vez. Protocolo 22 (novo tipo de monstro).
- Espólios das aranhas e vários itens ainda sem uso em receitas; as 2 pedras sem fonte (Lisa e Polida) só existem por
  código/salvamento.
- Sem sons, música nem vibração; sem XP/níveis; **loja só no Mercado (v0.93.57, consumíveis em Moedas de Cobre; sem venda)**; sem missões; sem viagem entre mundos (portais, ADR 0019).
- iPhone/Safari não permite tela cheia; o jogo não trava a orientação (ADR 0030): funciona em pé e deitado, por escolha do jogador. Dá para instalar na tela inicial.
  inicial); dentro do Artifact a tela cheia pode ser recusada.
- Topo dos cubos esticado ~1,6× na vertical (arte desenhada achatada); texturas com uma só arte repetem o padrão.
  O Padrão de Materiais V2 (abaixo) é o caminho para trocar isso; ainda não está ligado para o jogador.
- Sem pulo nem queda com dano; água parada (sem correnteza nem nado).
- Santuário: chão de nuvem mostra leve repetição diagonal.

## Santuário oficial Three.js e autotile (11/11/2026)
- **Santuário** (`?mundo=santuario`) utiliza por padrão malhas 3D reais com WebGL/Three.js, câmera superior ortográfica levemente inclinada e Deusa animada com sprite 2D em billboard. Reaproveita o `Game`, `World`, `Player`, hotbar, salvamento e ações oficiais, com **dois níveis** e autotile horizontal herdado da base. Os 18 blocos existentes usam seus materiais oficiais. `?render=2d` preserva o renderizador anterior e WebGL indisponível aciona fallback para Canvas 2D.
- **Câmera do Santuário (PRs #92–#93):** ortográfica a ~67° acima do chão (vista oblíqua K = 1 é o padrão desde a v0.93.10). **O mármore V2/V3 (formas adaptativas, base de duas células, ordem de colocação) foi removido na v0.93.47 (W4):** o Mármore Celestial (82) é um cubo comum; paredes novas são as autotile (ADR 0027).
- **Mundo principal (desde a v0.93.47, ADR 0031 M6 — a virada):** usa o renderer **2.5D em WebGL** (`render/worldThreeRenderer.ts`, núcleo `render/three/`) por padrão — chão por chunk, cubos, objetos e cidade como planos, atores e itens em billboards, água/nuvens, luz só à noite e na dungeon, interiores, dungeon, porta animada, partículas, camada 2D (dano, seleção, farol). **O Canvas 2D foi removido (v0.93.105, M7):** `?render=2d` não faz nada; aparelho sem WebGL (ou falha ao carregar o módulo) vê um aviso na tela. Com o 3D o jogador **não sobe em cubos sozinho** (`?fisica=degrau` volta à regra antiga); lobos e goblins mantêm o degrau. Online e solo usam o mesmo renderer. **`?grade=2`** (v0.93.51–55, só dev — protótipo F1–F5, com cidade, interiores, covil, lobos e goblins ampliados da grade fina, ADR 0032: células de metade do lado, mundo do mesmo tamanho; sem save, sala e paredes novas) e **`?celulas=N`** (v0.93.50, experimento de escala, só 3D) muda as células visíveis na vertical (padrão 14) mantendo os pixels dos atores. **Cada `Game` recebe um `<canvas>` novo** (`freshCanvas()` em `main.ts`, v0.93.48): canvas com contexto 2D (vitrine do título) não aceita WebGL. O 3D vale em celular e tablet ("rodando ok", dono do produto) e a ~60 fps no PC (JS do `draw` ≈ 3,4 ms); **ainda não verificados:** Safari, o iframe do Artifact e a sala multiplayer em 3D. O Santuário Three separado do PR #86 continua experimental, sem promoção de suas câmeras extra, editor de cinco níveis ou porta especial

- **Porta de parede (v0.93.25):** bloco `WALL_DOOR_PLANKS` entre duas paredes comuns, 3 quadros no atlas (arte final de Tábuas desde a v0.93.47); **alcançável no Santuário** pela hotbar (v0.93.47; ícones de arte de Tábuas e Pedra desde a v0.93.49, a porta segue com o ícone provisório `wallPlaceholderIcon`); **no Mundo (v0.93.56, W5 enxuta):** perfil principal, receitas no Construtor, ícones e render 3D (`ChunkWalls`); falta refazer cidade/interiores com paredes, porta de Pedra e a versão da grade fina.
- Paredes construídas com tijolo de pedra, pedra lisa/polida, tábuas de carvalho/cerejeira/bétula e os mármores/pedras celestiais (82–85) afinam **somente** entre vizinhos horizontais do mesmo material (ou porta oficial existente) e sem vizinhos norte/sul, usando **exclusivamente o nível inferior (0) para decidir a forma**. O nível superior (1) herda a geometria da base — parede fina ou pilar — sem consultar seus próprios vizinhos; preserva sempre a textura/material do bloco superior. Porta na base funciona como pilar; materiais não construtivos nunca afinam. Face frontal permanece alinhada; topo desenhado com metade da profundidade. Isolados, extremidades, massas 2×2 e 3×3 permanecem maciços.
- **Blocos de 1/4 (ADR 0033, v0.93.76, só o Mundo principal):** todo bloco de construção tem 1/4 de célula e empilha até 4 (uma célula); paredes e objetos não mudam; o Santuário segue com cubos cheios e pilha de 5. `World.stepLevels`: o corpo sobe 1 a 3 blocos, a pilha de 4 bloqueia. Salvamentos (v17), sala (v6) e o gerador convertem cubos antigos (1 → 4 blocos; 2 → 2+2). 2D de reserva aproxima (parciais viram cubo cheio).
- **Arte oficial dos seis blocos 80–85**: seis texturas quadradas 512×512 versionadas em `src/assets/santuario-*-512.jpg` usadas em topos, frentes, chão e ícones; os outros 12 blocos celestiais usam o atlas original. Só o pacote do Santuário importa essas artes.

## Padrão de Materiais V2 (o padrão do jogo desde 08/11, ADR 0023)
- **É o que o jogador vê.** A arte entrega material plano 128×128 em `assets-src/materiais/<material>/` (contrato na
  pasta; pacote original em `docs/materiais-v2/`) e o motor monta o cubo. `?blocos=legado` (só para comparar) volta ao
  atlas antigo, que também segue valendo para as três pedras aposentadas ainda presentes em mundos salvos.
- Frente dos cubos **18** (decidido: o pacote propunha 16); a frente é uma textura seamless nas 4 bordas usada inteira
  (uma fatia de 18 px por nível da pilha); **sem frente própria, a frente repete o topo**; franja até 32 px, só no
  nível mais alto.
- **Massa contínua** (v0.82.0): cubos V2 vizinhos e níveis empilhados, de qualquer material, não têm riscos entre si; o
  contorno só aparecia na silhueta do conjunto no Canvas 2D (`cubeEdges`, `cubeSpriteV2`, `drawCubeParts`, **removidos na v0.93.107** com a cena `?materiais=1`; no 3D o cubo é uma caixa com texturas). Só blocos V2; o bloco
  antigo ao lado mantém o contorno.
- **Chão V2 sem grade**: o chão dos materiais V2 não leva a "grade sutil de blocos" que o `chunkRenderer` desenha
  sobre o chão antigo (era ela, mais a arte, que riscava cada célula); o chão antigo continua com a grade.
- Materiais com **arte oficial**: terra, areia e as cinco pedras (Bruta, Tijolo, Chão, Lisa e Polida: topo e frente próprios
  ou o topo), Tora de Carvalho (topo de anéis e frente de casca), Tábuas de Carvalho (só o topo, em teste), Tora e Tábuas de Cerejeira e de Bétula (tora com topo e frente; tábuas só o topo)
  e Caminho de Terra, Terra Arada e grama — estes três com **frente sempre de terra** e a franja do próprio topo
  (reduzida aos 32 px; só no nível mais alto da pilha). Pipeline: `scripts/import-material.py` →
  `scripts/build-materials.py` → `materials-v2.webp` (~110 kB, sem perdas) + manifesto (`top`, `front`, `overlay`).
- **Transições entre chãos** (v0.87.0): uma forma por par (`assets-src/materiais/_mascaras/<forma>.png`, derivada da
  pintura por `scripts/import-transition.py`; `transitions-v2.webp`: por peça máscara + halo + espuma, 4 bordas girando a
  forma + 4 cantos). Grama sobre Terra/Caminho/Areia, Areia sobre Terra e Água sobre Areia/Terra/Caminho/Grama (a água com
  faixa pintada: espuma e água rasa). Só chão plano e mesma altura; a textura nunca gira. Regras por par em
  `render/transitions.ts` (`TRANSITION_RULES` com `shape`), desenhadas no `chunkRenderer` (halo, corpo, espuma). A água
  do V2 (`agua`) é o ladrilho do mar/rios; barranca e fio de espuma antigos ficam só onde a margem não é V2.
- A cena `?materiais=1` (legado × V2) foi removida na v0.93.107.
- Falta: transições da Terra Arada e de outros pares (Caminho×Areia etc.), se a arte quiser; atlas antigo sai quando
  não houver mais pedras aposentadas em uso (`NEXT_STEPS`, Fase V).

## Qualidade e desempenho
- `npx tsc --noEmit` limpo; 253 testes passando; `npm audit` sem vulnerabilidades moderadas ou piores (CI).
- Geração de chunk ~0,08 ms; render ~0,4 ms/quadro (Chromium headless). Números atuais: `npm run bench`.
- Artefatos só com a arte do próprio mundo (ADR 0010), imagens em arquivos separados (ADR 0013); arte de dungeon e
  folhas de personagem/monstro carregam em segundo plano ou sob demanda.
- **Cercas e porteira do jogador (v0.93.95–96):** cerca de estacas do modelo 3D (`assets-src/cerca-betula/`, `scripts/extract-fence-model.py`) em **3 madeiras** — `FENCE` (Carvalho), `FENCE_BIRCH`, `FENCE_CHERRY` (`isFence`; se emendam entre si e com a porteira); tira de 5 quadros 128×232 (horizontal, vertical, estaca, braço N, braço S). Porteira também do modelo 3D (folha gira para o norte): 5 poses → 10 quadros (`gateFrames` por madeira, `DoorAnimator(5)`, 2ª `DoorSprites` no 3D); um bloco por madeira (`FENCE_GATE`, `_BIRCH`, `_CHERRY`, cada um aberto/fechado), com a arte da própria madeira (`gateFence`). Portão/muro da vila ainda usam a arte anterior.
- **Flores fofas (v0.93.97):** a Flor (`Block.FLOWER`, enfeite sem colisão) tem 15 variantes de arte (`assets-src/flores/`, `scripts/extract-flowers.py`, `flowers.webp`) sorteadas por célula.
- **Floricultura (v0.93.110):** construção da cidade (a oeste da Praça Central) com cômodo próprio e a florista Rosendo fixa; vende as 15 Flores Fofas (2 Moedas de Cobre), blocos de enfeite colocáveis (`FLOWER_BLOCKS`), sem efeito além do visual. A janela da loja serve Mercado e Floricultura (`ShopStyle`).
- **Animais da vila (v0.93.106):** 3 de cada espécie (ovelha, vaca, galinha, capivara, cavalo) nascem na Vila Camponesa, no mundo e na sala; salas do servidor gravadas antes são ajustadas ao abrir (v0.93.108, `RoomSnapshot` 7); os mundos salvos no aparelho mantêm os que tinham.
