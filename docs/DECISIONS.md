# Decisões

## Arquitetura (ADRs)
| # | Decisão | ADR |
|---|---|---|
| 0001 | Terreno como função pura da seed + chunks 16×16 com edições sobrepostas | [0001](adr/0001-geracao-pura-e-chunks.md) |
| 0002 | Texturas procedurais e cache offscreen por chunk (blocos substituídos pela 0006) | [0002](adr/0002-texturas-procedurais.md) |
| 0003 | Vista superior inclinada (3/4), camadas por célula, personagem como sprite | [0003](adr/0003-vista-superior-inclinada.md) |
| 0004 | Entidades andantes compartilham `Walker`; NPCs como estado de execução em `game/` | [0004](adr/0004-entidades-walker.md) |
| 0005 | Itens contáveis separados dos blocos infinitos; inventário em `game/` | [0005](adr/0005-itens-e-inventario.md) |
| 0006 | Blocos = 8 materiais da prancha; mesmo id como chão e cubo; prancha 3/4 como fonte | [0006](adr/0006-materiais-da-prancha.md) |
| 0007 | Assets em WebP gerados por script; PNG só como etapa intermediária | [0007](adr/0007-assets-webp.md) |
| 0008 | Perfis de mundo: um motor, vários mundos (Santuário Celestial) | [0008](adr/0008-perfis-de-mundo.md) |
| 0009 | Dungeon como sobreposição pura do terreno; monstros como `Walker` em `Entities` | [0009](adr/0009-dungeon-sobreposta.md) |
| 0010 | Pacotes de arte por mundo (build de cada artefato só com a arte do seu mundo) | [0010](adr/0010-pacotes-de-arte-por-mundo.md) |
| 0011 | Salvamento automático no navegador, por mundo e seed, formato versionado | [0011](adr/0011-salvamento-local.md) |
| 0012 | Cidade do Despertar: semente fixa, sobreposta ao terreno, área protegida, arte pintada em código | [0012](adr/0012-cidade-fixa.md) |
| 0013 | Imagens em arquivos separados ao lado da página; código embutido; orçamento de **início** < 3 MB; arte de regiões em segundo plano | [0013](adr/0013-imagens-em-arquivos-separados.md) |
| 0014 | Interiores = cômodos isolados do mesmo `World` (coordenadas fixas ao norte, protegidos), mapa lógico sobre a arte, porta pela rua, capacho para sair | [0014](adr/0014-interiores.md) |
| 0015 | Orvalis independente do maiamapps: backend próprio (repositório separado) em subdomínio de `pensamentos.online` até o domínio próprio; regras do mundo compartilhadas com o servidor, não copiadas | [0015](adr/0015-orvalis-independente.md) |
| 0016 | Multiplayer co-op com código de convite (até 4), convidados só com nome, sem PvP; servidor autoritativo com `Room`/protocolo compartilhados (`src/net`, `world/actions.ts`) | [0016](adr/0016-multiplayer-coop.md) |
| 0017 | ~~Personagem modular (chibi)~~ — **removido na v0.92.0** (ADR 0025); o texto da ADR fica no histórico do git | — |
| 0018 | Ferramentas por material: tipo × material; arte segue `assets-src/ferramentas/CONTRATO.md` (ficha, ícones padronizados, camada de mão sobre pose-base sem ferramenta) antes de entrar no motor | [0018](adr/0018-ferramentas-por-material.md) |
| 0019 | Covil isolado (canto fixo) com entrada de caverna a ≥ 10 chunks do castelo; mundo da Cidade 1 só de florestas; visão de andares/mundos ligados por portais | [0019](adr/0019-covil-isolado-e-andares.md) |
| 0020 | Salas fixas por número (Sala 1, até 10 jogadores), mundo e bolsas salvos no servidor; sem salas de convite | [0020](adr/0020-salas-fixas-salvas.md) |
| 0021 | Bichos da sala: o servidor roda as mesmas `Entities` (jogadores como avatares); o aparelho na sala só espelha (`CreatureMirror`); golpe/comida/mordida decididos pela sala; moradores locais | [0021](adr/0021-bichos-da-sala.md) |
| 0022 | Escala visual: geometria e contratos de arte preservados, sem unidade nova; **cena de escala** `?escala=1` (só dev) compara sprites no renderizador real; catálogo, validação e normalização de alturas ficam para depois | [0022](adr/0022-escala-visual-e-cena-de-escala.md) |
| Mercado (v0.93.57): as 3 lojas da cidade são um só cômodo "Mercado" com 3 entradas/saídas; mercador fixo **Bento** (`role: 'merchant'`, toque abre a loja); só consumíveis (`FOOD`) em **Moedas de Cobre** (`world/shop.ts`, preços provisórios); janela com a arte do dono do produto | domains/town, domains/npc |
| 0032 | **Implementada (F7, v0.93.59)** — grade fina do Mundo (`SUBDIV = 2`): células e objetos proporcionais ao personagem, mundo do mesmo tamanho, padrão Stardew; fases F0–F7, perguntas abertas | [0032](adr/0032-grade-fina-do-mundo.md) |
| 0031 | **Aceita** — plano de migração do Mundo principal para Three.js (fases M0–M7, W5 depois do M4, perguntas ao dono do produto) | [0031](adr/0031-migracao-do-mundo-para-three.md) |
| 0030 | Vertical no celular e no tablet como opção do jogador: sem trava de orientação nem aviso; câmera com largura mínima de 8 células em pé; HUD vertical com hotbar em linhas e controles por `--hotbar-h` | [0030](adr/0030-orientacao-vertical.md) |
| 0029 | Iluminação 2.5D: sobreposição de escuridão com poças de luz (Deusa e blocos que brilham), `?luz=`, regras puras em `render/lighting.ts` | [0029](adr/0029-iluminacao-2-5d.md) |
| 0028 | Escala do mundo: 1 célula = 1 m; vista oblíqua com K = 1 (cubo de frente quadrada); parede = 2 cubos; personagem ≈ 1,75 m; Mundo adota na migração do render | [0028](adr/0028-escala-do-mundo-1m.md) |
| 0027 | Paredes de nível único com altura fixa e autotile (frente + tampa), porta, para Santuário e Mundo; mármore V2/V3 aposentado | [0027](adr/0027-paredes-nivel-unico-autotile.md) |
| 0026 | Render 2.5D em WebGL (Three.js), referência Core Keeper: arte 2D como fonte, billboards, física sólida, iluminação primeiro, chão por chunk, 2D como reserva até a paridade | [0026](adr/0026-render-25d-webgl.md) |
| 0025 | Chibi modular, expressões e moradores antigos saem; 16 NPCs nomeados (Black + 15) com folha própria; caixa de conversa com retrato, nome e páginas | [0025](adr/0025-npcs-nomeados-e-caixa-de-conversa.md) |
| 0023 | Padrão de Materiais V2: a arte entrega texturas planas 128×128 por material; o motor monta topo/frente (frente **18**, decidida na v0.81.1; sem frente própria repete o topo; franja ≤ 32 px); **padrão do jogo desde 08/11** (`?blocos=legado` volta ao antigo); transições entre chãos por máscara de alfa que gira (só a Grama avança hoje); `?materiais=1` compara; mistura só no chão plano; máscaras = formas giráveis | [0023](adr/0023-padrao-materiais-v2.md) |

## Produto e regras de jogo
| Decisão | Onde |
|---|---|
| Sem backend neste repositório; persistência, contas e multiplayer via **backend do Orvalis** (repositório separado) | PROJECT_CONTEXT, adr/0015 |
| Nome oficial: **Orvalis** (mundo de fantasia); site em `orvalis.pensamentos.online` (Hostinger; provisório até o domínio próprio); repositório, pacote e chaves de salvamento mantêm "mundoblocos" | PROJECT_CONTEXT, OPERATIONS |
| Fluxo de publicação: `main` = site no ar; um PR por entrega com título de versão; merge automático (método *merge*) no fim da entrega, depois da Verificação (GitHub Actions) passar | CONVENTIONS, OPERATIONS |
| Fórmula de dano única (`world/progression.ts`): ataque + arma − defesa, mínimo 1, ±10%, crítico 5% ×1,5; heroína nível 1 = 100 vida/5 ataque/2 defesa; espada 12, machado 7; regeneração 5%/1,5 s após 6 s | domains/dungeon |
| Progressão (Fase P): vida em barra com número; atributos sobem sozinhos ao subir de nível; morte perde 10% do XP do nível atual sem descer de nível; profissões iniciais Lenhador, Minerador, Agricultor e Construtor | NEXT_STEPS Fase P |
| Visão: mundo de progressão — cidades e dungeons por faixa de nível; Cidade 1 recebe novatos e os personagens migram para cidades de nível maior conforme evoluem | PROJECT_CONTEXT, NEXT_STEPS Fase 6 |
| Chunks quadrados 16×16 nos dois eixos | domains/world |
| Santuário: 10 chunks em 5×2; só Deusa; 18 blocos + paredes/porta de parede (v0.93.27); sem ferramentas/cultivo/ovelhas | domains/worlds |
| Subdomínio `santuario`; artefato próprio enquanto não há hospedagem | domains/worlds |
| Blocos celestiais: arte da prancha 3/4 (a isométrica não foi convertida) | domains/worlds |
| Chão de nuvem sem giro/espelho e com contraste suavizado (cobre o mapa todo) | domains/worlds |
| Deusa flutua (só visual): mesma física do `Walker`, animação contínua e balanço sem mover a câmera | domains/worlds |
| Pilha máx. 3 cubos (era 2); personagem sobe 1 nível por passo; descer é livre | domains/player |
| Porta: objeto `shape: 'door'` só no nível 0, estado aberto/fechado no id (`OAK_DOOR_OPEN` passável); animação só no render; toque abre/fecha com qualquer item | domains/world |
| Chão quebrado vira buraco; só bloco novo ocupa e vira piso nivelado | domains/world |
| Ovelha não sobe em cubos: blocos servem de cerca | domains/npc |
| Crescimento do trigo probabilístico (média 6 s/estágio) | domains/farming |
| Ferramenta equipada = espaço selecionado; cada ferramenta ganha ação quando definida (enxada: arar) | domains/player |
| Plantio só em Terra Arada; arar = enxada em Terra/Terra com Grama livre | domains/farming |
| Espada só ataca entidades (animais somem por enquanto); nunca quebra blocos, itens ou elementos | domains/player |
| Machado ataca entidades e quebra orgânico (madeira/árvore/planta); regra por ferramenta em `items.ts` | domains/player |
| Enxada ara (Terra/Terra com Grama → Terra Arada) e quebra só plantas (`organic: 'plant'`); não ataca | domains/player |
| Cacto é planta (não árvore): enxada e machado quebram | domains/player |
| Pá: toque amassa Terra/Grama/Arada → Caminho; quebra só `soft` + planta; planta quebrada pela pá não dropa; não ataca | domains/player |
| Picareta: quebra tudo menos madeira/árvore (`nonWood`); planta quebrada não dropa; não ataca | domains/player |
| Ação de chão das ferramentas vem do registro (`TOOLS.groundUse`), não de `if (tool === …)` no `Game` | domains/player |
| Regra de combate em `Entities` (estado de execução), não no `World` | domains/player |

## Interface e controles
| Decisão | Onde |
|---|---|
| Câmera sem rotação; joystick e teclado em direções de tela | domains/player |
| HUD mínimo: só a hotbar (joystick e botão de ação só em toque) | domains/player |
| Celular: botão de ação sobre o alvo à frente; toque no mundo não age | domains/player |
| Quebrar = segurar 2 s com a mão/item, 1 s com ferramenta (`breakSeconds`); colocar = toque/clique curto | domains/player |
| Dungeon: área protegida (nada quebra/coloca), uma entrada voltada para o spawn, monstros presos ao interior, sem dano à personagem por enquanto | domains/dungeon |
| Covil das Aranhas = labirinto procedural (spec do usuário): área → labirinto (só chão/paredes) → conteúdo; Rainha no nó mais fundo com uma passagem; chefe preso à câmara | domains/dungeon |
| Parede do labirinto = cubo escuro com 2 de altura no desenho (legibilidade); montanhas só no anel externo | domains/render |
| Aranhas: arte de frente única; espelhada ao andar para a direita | domains/render |
| Água: inquebrável; qualquer terra (Terra, Grama, Arada, Caminho), Pedra, Tora ou Tábua substituem (areia não); só enche buracos vizinhos (0,6 s, cadeia, ordem fixa), nunca terra firme | domains/world |
| Baú: 8 tábuas, 27 espaços, abre com Bolsa acima da mão, troca tocando item e destino (pilha inteira), quebrar solta o conteúdo; Tenda: aviso a cada colocação, vale a última, derrubar a última volta ao início | domains/farming |
| Grade 12 (9 itens · Personagem · Habilidades · Bolsa); Habilidades = Receitas 4×9 + Profissões 4×2 acima da grade; tocar cria 1; Tenda = ponto de renascer; atalhos B/I, K, C (reservado) | domains/farming |
| ~~Bolsa: 18 espaços (2×9) acima da mão~~ → v0.57.0: 12 espaços (4×3) à direita, acima dos 3 botões; tipo novo só entra com espaço livre; pilhas sem limite | domains/farming |
| Tablet (toque, lado menor ≥ 600 px): toque na tela = clique do computador **e** botão de ação (voltou em v0.47.2); celular só com o botão | domains/player |
| Morte: perde tudo menos as ferramentas (substitui "perde só os materiais"); Tenda é madeira (machado quebra) e a picareta também a quebra por exceção (`alsoBreaks`) | domains/farming |
| Coleta: materiais coletados (bloco volta como item, árvore → 2–3 toras), grade de 8 compartilhada + bolsa no 9º, troca tocando item e espaço, morte perde só os materiais, começo com 1 porta, Santuário infinito | domains/farming |
| Combate (v0.26; vida e dano refeitos na v0.39, ver Progressão): 5 ♥; mordidas ½/1/2 ♥; morte → renasce no início com os itens; espólios seda/presa/Coração da Rainha; todas as aranhas renascem (Rainha 300 s) longe da heroína; arte provisória até as pranchas | domains/dungeon |
| Perseguição por mapa de distâncias (BFS a cada 0,25 s) em `Entities`, não por monstro | domains/dungeon |
| Porta só entre batentes à esquerda e à direita: cubo de madeira (`organic: 'wood'`) ou de qualquer pedra (`stone: true`, as 8 variações) no nível 0, podendo misturar; quebrar um batente depois não derruba a porta | domains/world |
| Cidade do Despertar: 108 × 78, igual em toda seed, início e renascer sem tenda; nada quebra/coloca dentro; ruas de Pedra Irregular + Rachada, muralha de Tijolo + Tijolo Rachado; arte das construções criada livremente (pintada em código); sem NPCs/interiores na V1 | domains/town, adr/0012 |
| Cidade v0.36: 164 × 132 (ampliada na proporção das construções); casas ≥ 5×5; tamanhos do dono do produto (castelo 26×17, guilda 9×9, ferreiro 8×5, lojas 5×5, guarita 4×6, bancos 2×1/3×1, poste 1 célula); térreas bloqueiam 4 de 5 fileiras (quintal andável); castelo com fosso escolhido (cobre os 26×17) | domains/town |
| Dungeon nunca ocupa a estrada do portão nem o campo do rebanho; diante da entrada, sempre terra firme e livre | domains/dungeon, domains/town |
| Arte de construção da cidade: uma imagem por tamanho de área (nunca esticar/repetir partes para outra proporção); tamanho sem imagem não usa aquela variação | domains/town |
| Pedras: a pedra do mundo vira Pedra Bruta (mesmo id, salvamentos intactos); o jogo fica com **cinco pedras** (Bruta, Tijolo, Chão, Lisa, Polida; dono do produto, 08/11) — Irregular, Rachada e Tijolo Rachado foram **aposentadas** (sem receita, fora da cidade e do V2; ids reservados para mundos salvos, `RETIRED_STONES`); receitas 1:1 só para Tijolo e Chão; Lisa e Polida ficam para receitas/construções futuras | domains/world, domains/farming |
| Horizontal garantido pela camada de rotação; tela cheia/trava quando o navegador permite | domains/player |

## Arte
| Decisão | Onde |
|---|---|
| Ícones do trigo: monte de sementes e feixe com laço | domains/farming |
| Pá sem folha para a direita: espelho da esquerda | domains/render |
| Prancha 3/4 venceu a extração isométrica (comparação no jogo) | adr/0006 |
| Texturas de blocos/chão sempre na direção desenhada (nada gira nem espelha por célula); variedade só por variações enviadas | CONVENTIONS, domains/render |
| Terra com Grama: arte nova com 3 variações sorteadas por célula (chão e cubo); colunas extras 15–16 do atlas | domains/render, OPERATIONS |
| Ferraria: ferreiro mora dentro (atrás do balcão), só fala por enquanto; entrar andando para cima diante da porta | adr/0014, domains/town |
| Tela de entrada dentro do jogo (não página separada): mundo em vitrine atrás, Novo jogo → montar personagem; Continuar só com jogo salvo; `?seed=`/`?personagem=` e Santuário pulam a tela | domains/player, ARCHITECTURE |
| Minimapa redondo, norte para cima, névoa por célula (raio 14) salva com o mundo; cor do mapa é aparência (`render/mapColors.ts`), não propriedade do bloco; só no mundo principal (`WorldProfile.minimap`) | domains/render, domains/save |
| ~~Árvores crescem de verdade (2026-11-06)~~ — **substituída** em 2026-11-08 (ADR 0024): árvores só adultas e variadas, sem mudas nem estágios; macieira colhida ainda volta a dar frutas | domains/farming |
| Árvores adultas variadas, madeira de cerejeira e chunk do muro protegido (dono do produto, 2026-11-08) | [0024](adr/0024-arvores-adultas-cerejeira-chunk-do-muro.md) |
| Macieiras misturadas nos Campos (1/6 das árvores), sem mudar cerejeiras nem a cidade | domains/farming, domains/world |
| Cavalo, vaca e galinha = um só `FarmAnimal` com ritmo por tipo (não uma classe por bicho) | domains/npc |
| Hortaliças plantam pelo próprio legume (sem semente separada); culturas numa tabela única (`CROPS`) com o trigo; fonte inicial: 2 de cada + capim (12%) | domains/farming |
| Tenda pede 1 Pano de Seda (receita nova: 10 sedas → 1 pano) em vez de 10 sedas soltas | domains/farming |
| Níveis de ferramenta enviados em 06/11 entram só depois da camada de mão (contrato de ferramentas); a prancha de pedra não estava no pedido e espera confirmação | ADR 0018 |
| Cidade 1 = mundo das florestas (sem deserto); próximos mundos (árido, pantanoso…) por portais, cada um com sua cidade | ADR 0019 |
| Fome em barra 0–100 (~12 min); alimentos com pesos (`FOOD`); crus: maçã, cenoura, batata, tomate; pratos só no Caldeirão (Cozinheiro); fome vazia não mata (para em 1 de vida) | domains/player, domains/farming |
| Receita pode exigir estação por perto (`Recipe.station`), sem novo painel: o Caldeirão é a cozinha | domains/farming |
| Receitas: tocar abre uma ficha com Confirmar/Cancelar (nada é criado num toque) e a bolsa aparece ao lado; excesso de bolsa de salvamento antigo cai no chão | domains/farming |
| Salas fixas por número (Sala 1, até 10), abertas a quem tiver o site, mundo e bolsas salvos no servidor; sem salas de convite | ADR 0020 |
| Sala compartilhada em etapas: o servidor é dono da hora e do crescimento (protocolo 7); itens e entidades depois, sempre com o código do jogo rodando na sala (nunca um jogador "anfitrião") | ADR 0016 |
| Tenda tem interior (um cômodo para todas as tendas, volta para a frente da tenda por onde se entrou); conexão da sala desiste em 10 s com uma nova tentativa automática | ADR 0014, ADR 0016 |
| "Jogar com amigos" só aparece onde o servidor aceita a origem; no Artifact e nas prévias, aviso com link do site (lista espelhada do servidor, sem detectar falha por tentativa) | ADR 0016 |
| ~~Bloco × parede~~ **(revisada em 08/11: as paredes saíram do jogo — sem receita, arte nem código; ids 210–225 viram vazio em dados antigos, `isRemovedBlock`)**. Era: bloco = cubo que empilha e se sobe; parede = peça alta (3 de altura, arte da coluna alta) que só bloqueia; 3 blocos → 1 parede; paredes vizinhas formam muro contínuo. v0.69.0: paredes de 8 materiais (terra, grama, arada, batida, areia, pedra com musgo, tronco, tábuas), todas com a altura das de pedra; parede desmonta com a ferramenta do material; tira das paredes em segundo plano | domains/world |
| Sentar: tocar no assento (cadeira, banco da cidade) senta de frente; andar/tocar levanta e volta ao lugar; só personagens com folha de sentar (Gino). Porta: batente = bloco de madeira/pedra (as paredes saíram em 08/11) | domains/player, domains/world |
| Piso da Cidade do Despertar: um só, Tijolo de Pedra, em todo o pavimento (ruas, praças, pátio, calçadas); gramados ficam | domains/town |
| Animal alimentado segue quem deu enquanto apaixonado e, depois, passa a morar onde ficou; vaca/galinha soltam leite/ovo ao comer (produto em `ANIMAL_PRODUCE`); torta assa no Forno de Pedra | domains/npc, domains/farming |
| Namoro igual para todos os animais: casal parado de frente + coraçõezinhos entre eles (sem folha de namoro por espécie) | domains/npc |
| Reprodução é uma base comum (`Breeder`) para ovelha e animais do campo; o alimento de cada espécie fica em `ITEMS.feeds`; filhote do campo cresce em 3 dias de jogo (tempo real da sessão; no jogo sozinho os animais não são salvos; na sala, sim — v0.73.0) | domains/npc |
| Cerca emenda por vizinhos só no render (o mundo guarda um id por célula; sem ids por forma): metades das peças + poste grande; portão de frente também em cerca vertical até chegar a arte de lado | domains/world, domains/render |
| Pedregulhos soltos (arte da prancha) substituem os cubos de pedra avulsos do gerador; minerados dão 1–3 Pedras Brutas (o item é sempre o bloco de pedra, colocado como cubo) | domains/world, domains/farming |
| **Blocos de 1/4 de célula (14/11/2026):** no Mundo principal todo bloco de construção tem altura 1/4 e empilha até 4; paredes e Santuário fora; 1–3 andável, 4 bloqueia; migração preserva a altura (1 cubo → 4, 2 → 2+2) | ADR 0033 |
