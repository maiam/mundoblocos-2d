# Estado atual

_Atualizado em 2026-11-07 — v0.85.0 · jogo: **Orvalis** (`orvalis.pensamentos.online`)_

Este documento descreve **só o que existe hoje**. O histórico por entrega está no [`CHANGELOG`](CHANGELOG.md); o diário
técnico antigo (até a v0.80.0, com nomes de funções e versões de protocolo/salvamento) está em
[`archive/estado-por-versao.md`](archive/estado-por-versao.md). A cada entrega: ajuste a seção afetada aqui (não acrescente
uma seção por versão) e registre a mudança no `CHANGELOG`.

## Versões e números de referência
| Item | Valor | Fonte |
|---|---|---|
| Versão do jogo | 0.92.0 | `package.json` |
| `PROTOCOL_VERSION` (multiplayer) | 20 | `src/net/protocol.ts` |
| `SAVE_VERSION` (salvamento local) | 12 | `src/game/save.ts` |
| Testes | 253 em 46 arquivos (Vitest), todos passando | `npm test` |
| Orçamento de início (ADR 0013) | ~2,9 MB de 3 MB (inalterado na v0.91.0: Mila e lobos carregam sob demanda) — **no limite** | build do artifact |
| Dependências | Vite 7, Vitest 5, TypeScript 5.9; Node ≥ 22.12 | `package.json` |

## Mundos
- **Orvalis (principal)**: gerado por seed (`?seed=`), chunks 16×16 nos dois eixos, vista 3/4. Mundo da Cidade 1: só
  **florestas** (Campos e Bosque de Sakura, com carvalho, bétula, cerejeira e macieira misturados), rios, mares, praias, montanhas, pedregulhos
  (ADR 0019). Abre numa **tela de entrada** (Novo jogo → montar personagem; Continuar se houver salvamento).
- **Santuário Celestial da Deusa da Vida** (`?mundo=santuario`): 10 chunks de nuvem, só a Deusa, só os 18 blocos
  celestiais; sem ferramentas, cultivo ou animais. Subdomínio real ainda não hospedado (`domains/worlds.md`).
- **Cidade do Despertar** (`domains/town.md`): 164 × 132 blocos ao norte da origem, igual em toda seed, área protegida,
  piso único de Tijolo de Pedra, muralha, castelo, guilda, hospedaria, ferreiro, lojas e ~90 casas. Início e renascer
  sem tenda = praça inicial. 16 NPCs nomeados (ferreiro **Black** + 15 moradores, `domains/npc.md`) que falam numa **caixa de conversa** (retrato, nome, texto em páginas).
  **Interiores** só da Ferraria e da Tenda (`world/interiors.ts`, ADR 0014); as demais construções só mostram o nome.
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
  fome, **minimapa** redondo com névoa explorada (salva), menu ☰.
- Controles completos: [`README.md`](../README.md) da raiz e `domains/player.md`.

## Sistemas de jogo
- **Ferramentas** (espada, enxada, picareta, pá, machado): regras em `TOOLS` (`world/items.ts`) — o que quebram,
  toque no chão e drops. Detalhe em `domains/player.md` e `domains/farming.md`.
- **Blocos**: 12 materiais de construção obtidos pelo jogador (pilha de até 2 cubos; 5 pedras: Bruta, Tijolo, Chão,
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
  crescimento, dos itens no chão e baús, dos animais e das aranhas; mundo, bolsas e animais da sala ficam salvos no
  servidor. Moradores seguem locais. A opção só aparece onde o servidor aceita a origem (no Artifact aparece um aviso
  com o link do site).

## Hospedagem e publicação
- **No ar** em `https://orvalis.pensamentos.online` (Hostinger, publica a cada merge em `main`); também publicado como
  Artifacts (versão de teste). Verificação (GitHub Actions) em todo PR: `tsc`, testes, build, pacote do multiplayer
  e `npm audit`. Ver `OPERATIONS.md` e `CONVENTIONS.md`.

## Limitações conhecidas
- Salvamento só neste navegador/aparelho (nuvem/contas dependem do backend do Orvalis, ADR 0015).
- NPCs só dizem falas fixas (2 cada; sem escolhas, loja ou missões); só Ferraria e Tenda têm interior.
- **Lobos** (v0.91.0, `world/wolves.ts`, `domains/dungeon.md`): bandos de 1 a 3 da mesma cor (marrom, cinza, branco) pelo mapa ao redor da cidade; só atacam a personagem a até 3 células; soltam Pelagem e Presa de Lobo (sem uso em receitas ainda).
- Espólios das aranhas e vários itens ainda sem uso em receitas; as 2 pedras sem fonte (Lisa e Polida) só existem por
  código/salvamento.
- Sem sons, música nem vibração; sem XP/níveis; sem lojas nem missões; sem viagem entre mundos (portais, ADR 0019).
- iPhone/Safari não permite tela cheia nem trava de orientação (vale a camada "Gire o aparelho" ou instalar na tela
  inicial); dentro do Artifact a tela cheia pode ser recusada.
- Topo dos cubos esticado ~1,6× na vertical (arte desenhada achatada); texturas com uma só arte repetem o padrão.
  O Padrão de Materiais V2 (abaixo) é o caminho para trocar isso; ainda não está ligado para o jogador.
- Sem pulo nem queda com dano; água parada (sem correnteza nem nado).
- Santuário: chão de nuvem mostra leve repetição diagonal.

## Santuário oficial Three.js e autotile (11/11/2026)
- **Santuário** (`?mundo=santuario`) utiliza por padrão malhas 3D reais com WebGL/Three.js, câmera superior ortográfica levemente inclinada e Deusa animada com sprite 2D em billboard. Reaproveita o `Game`, `World`, `Player`, hotbar, salvamento e ações oficiais, com **dois níveis** e autotile horizontal herdado da base. Os 18 blocos existentes usam seus materiais oficiais. `?render=2d` preserva o renderizador anterior e WebGL indisponível aciona fallback para Canvas 2D.
- **Mundo principal** continua integralmente em Canvas 2D, sem carregar Three.js. O Santuário Three separado do PR #86 continua experimental, sem promoção de suas câmeras extra, editor de cinco níveis ou porta especial.

- Paredes construídas com tijolo de pedra, pedra lisa/polida, tábuas de carvalho/cerejeira/bétula e os mármores/pedras celestiais (82–85) afinam **somente** entre vizinhos horizontais do mesmo material (ou porta oficial existente) e sem vizinhos norte/sul, usando **exclusivamente o nível inferior (0) para decidir a forma**. O nível superior (1) herda a geometria da base — parede fina ou pilar — sem consultar seus próprios vizinhos; preserva sempre a textura/material do bloco superior. Porta na base funciona como pilar; materiais não construtivos nunca afinam. Face frontal permanece alinhada; topo desenhado com metade da profundidade. Isolados, extremidades, massas 2×2 e 3×3 permanecem maciços.
- Todos os blocos empilháveis: **máximo de dois níveis (0 e 1)**. Salvos de versões anteriores com terceiro nível descartam esse nível na leitura; a altura do jogador é limitada a 2. Sem alterações de câmera/terreno/natureza ou itens de porta.
- **Arte oficial dos seis blocos 80–85**: seis texturas quadradas 512×512 versionadas em `src/assets/santuario-*-512.jpg` usadas em topos, frentes, chão e ícones; os outros 12 blocos celestiais usam o atlas original. Só o pacote do Santuário importa essas artes.

## Padrão de Materiais V2 (o padrão do jogo desde 08/11, ADR 0023)
- **É o que o jogador vê.** A arte entrega material plano 128×128 em `assets-src/materiais/<material>/` (contrato na
  pasta; pacote original em `docs/materiais-v2/`) e o motor monta o cubo. `?blocos=legado` (só para comparar) volta ao
  atlas antigo, que também segue valendo para as três pedras aposentadas ainda presentes em mundos salvos.
- Frente dos cubos **18** (decidido: o pacote propunha 16); a frente é uma textura seamless nas 4 bordas usada inteira
  (uma fatia de 18 px por nível da pilha); **sem frente própria, a frente repete o topo**; franja até 32 px, só no
  nível mais alto.
- **Massa contínua** (v0.82.0): cubos V2 vizinhos e níveis empilhados, de qualquer material, não têm riscos entre si; o
  contorno só aparece na silhueta do conjunto (`cubeEdges`, `cubeSpriteV2`, `drawCubeParts`). Só blocos V2; o bloco
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
- Para ver: `?materiais=1` (só em desenvolvimento) põe legado e V2 lado a lado; `?escala=1`, a cena de escala.
- Falta: transições da Terra Arada e de outros pares (Caminho×Areia etc.), se a arte quiser; atlas antigo sai quando
  não houver mais pedras aposentadas em uso (`NEXT_STEPS`, Fase V).

## Qualidade e desempenho
- `npx tsc --noEmit` limpo; 253 testes passando; `npm audit` sem vulnerabilidades moderadas ou piores (CI).
- Geração de chunk ~0,08 ms; render ~0,4 ms/quadro (Chromium headless). Números atuais: `npm run bench`.
- **Cena de escala** (`?escala=1`, só em desenvolvimento, ADR 0022): comparação visual de sprites no renderizador real; ver `OPERATIONS.md`.
- Artefatos só com a arte do próprio mundo (ADR 0010), imagens em arquivos separados (ADR 0013); arte de dungeon e
  folhas de personagem/monstro carregam em segundo plano ou sob demanda.
