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

## Produto e regras de jogo
| Decisão | Onde |
|---|---|
| Sem backend neste repositório; persistência futura via core | PROJECT_CONTEXT |
| Chunks quadrados 16×16 nos dois eixos | domains/world |
| Santuário: 10 chunks em 5×2; só Deusa; só 18 blocos; sem ferramentas/cultivo/ovelhas | domains/worlds |
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
| Água: inquebrável; qualquer terra (Terra, Grama, Arada, Caminho), Pedra ou Tora substituem (areia não); só enche buracos vizinhos (0,6 s, cadeia, ordem fixa), nunca terra firme | domains/world |
| Grade 12 (9 itens · Personagem · Habilidades · Bolsa); Habilidades = Receitas 4×9 + Profissões 4×2 acima da grade; tocar cria 1; Tenda = ponto de renascer; atalhos B/I, K, C (reservado) | domains/farming |
| Bolsa: 18 espaços (2×9) no mesmo cartão da grade, mesmos espaços da mão (3 fileiras de 9 no total), só o título; tipo novo só entra com espaço livre; pilhas sem limite | domains/farming |
| Coleta: materiais coletados (bloco volta como item, árvore → 2–3 toras), grade de 8 compartilhada + bolsa no 9º, troca tocando item e espaço, morte perde só os materiais, começo com 1 porta, Santuário infinito | domains/farming |
| Combate: 5 ♥; mordidas ½/1/2 ♥; morte → renasce no início com os itens; espólios seda/presa/Coração da Rainha; todas as aranhas renascem (Rainha 300 s) longe da heroína; arte provisória até as pranchas | domains/dungeon |
| Perseguição por mapa de distâncias (BFS a cada 0,25 s) em `Entities`, não por monstro | domains/dungeon |
| Porta só entre batentes à esquerda e à direita: cubo de madeira (`organic: 'wood'`) ou de Pedra no nível 0, podendo misturar; quebrar um batente depois não derruba a porta | domains/world |
| Horizontal garantido pela camada de rotação; tela cheia/trava quando o navegador permite | domains/player |

## Arte
| Decisão | Onde |
|---|---|
| Ícones do trigo: monte de sementes e feixe com laço | domains/farming |
| Pá sem folha para a direita: espelho da esquerda | domains/render |
| Prancha 3/4 venceu a extração isométrica (comparação no jogo) | adr/0006 |
