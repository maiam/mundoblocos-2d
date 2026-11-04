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

## Produto e regras de jogo
| Decisão | Onde |
|---|---|
| Sem backend neste repositório; persistência futura via core | PROJECT_CONTEXT |
| Nome oficial: **Orvalis** (mundo de fantasia); site em `orvalis.pensamentos.online` (Hostinger; provisório — `maiamapps.com.br` indisponível por enquanto); repositório, pacote e chaves de salvamento mantêm "mundoblocos" | PROJECT_CONTEXT, OPERATIONS |
| Fluxo de publicação: `main` = site no ar; um PR por entrega com título de versão; merge automático (método *merge*) no fim da entrega, depois da Verificação (GitHub Actions) passar | CONVENTIONS, OPERATIONS |
| Fórmula de dano única (`world/progression.ts`): ataque + arma − defesa, mínimo 1, ±10%, crítico 5% ×1,5; heroína nível 1 = 100 vida/5 ataque/2 defesa; espada 12, machado 7; regeneração 5%/1,5 s após 6 s | domains/dungeon |
| Progressão (Fase P): vida em barra com número; atributos sobem sozinhos ao subir de nível; morte perde 10% do XP do nível atual sem descer de nível; profissões iniciais Lenhador, Minerador, Agricultor e Construtor | NEXT_STEPS Fase P |
| Visão: mundo de progressão — cidades e dungeons por faixa de nível; Cidade 1 recebe novatos e os personagens migram para cidades de nível maior conforme evoluem | PROJECT_CONTEXT, NEXT_STEPS Fase 6 |
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
| Água: inquebrável; qualquer terra (Terra, Grama, Arada, Caminho), Pedra, Tora ou Tábua substituem (areia não); só enche buracos vizinhos (0,6 s, cadeia, ordem fixa), nunca terra firme | domains/world |
| Baú: 8 tábuas, 27 espaços, abre com Bolsa acima da mão, troca tocando item e destino (pilha inteira), quebrar solta o conteúdo; Tenda: aviso a cada colocação, vale a última, derrubar a última volta ao início | domains/farming |
| Grade 12 (9 itens · Personagem · Habilidades · Bolsa); Habilidades = Receitas 4×9 + Profissões 4×2 acima da grade; tocar cria 1; Tenda = ponto de renascer; atalhos B/I, K, C (reservado) | domains/farming |
| Bolsa: 18 espaços (2×9) no mesmo cartão da grade, mesmos espaços da mão (3 fileiras de 9 no total), só o título; tipo novo só entra com espaço livre; pilhas sem limite | domains/farming |
| Tablet (toque, lado menor ≥ 600 px): toque na tela = clique do computador, sem botão de ação; celular segue com o botão | domains/player |
| Morte: perde tudo menos as ferramentas (substitui "perde só os materiais"); Tenda é madeira (machado quebra) e a picareta também a quebra por exceção (`alsoBreaks`) | domains/farming |
| Coleta: materiais coletados (bloco volta como item, árvore → 2–3 toras), grade de 8 compartilhada + bolsa no 9º, troca tocando item e espaço, morte perde só os materiais, começo com 1 porta, Santuário infinito | domains/farming |
| Combate (v0.26; vida e dano refeitos na v0.39, ver Progressão): 5 ♥; mordidas ½/1/2 ♥; morte → renasce no início com os itens; espólios seda/presa/Coração da Rainha; todas as aranhas renascem (Rainha 300 s) longe da heroína; arte provisória até as pranchas | domains/dungeon |
| Perseguição por mapa de distâncias (BFS a cada 0,25 s) em `Entities`, não por monstro | domains/dungeon |
| Porta só entre batentes à esquerda e à direita: cubo de madeira (`organic: 'wood'`) ou de qualquer pedra (`stone: true`, as 8 variações) no nível 0, podendo misturar; quebrar um batente depois não derruba a porta | domains/world |
| Cidade do Despertar: 108 × 78, igual em toda seed, início e renascer sem tenda; nada quebra/coloca dentro; ruas de Pedra Irregular + Rachada, muralha de Tijolo + Tijolo Rachado; arte das construções criada livremente (pintada em código); sem NPCs/interiores na V1 | domains/town, adr/0012 |
| Cidade v0.36: 164 × 132 (ampliada na proporção das construções); casas ≥ 5×5; tamanhos do dono do produto (castelo 26×17, guilda 9×9, ferreiro 8×5, lojas 5×5, guarita 4×6, bancos 2×1/3×1, poste 1 célula); térreas bloqueiam 4 de 5 fileiras (quintal andável); castelo com fosso escolhido (cobre os 26×17) | domains/town |
| Dungeon nunca ocupa a estrada do portão nem o campo do rebanho; diante da entrada, sempre terra firme e livre | domains/dungeon, domains/town |
| Arte de construção da cidade: uma imagem por tamanho de área (nunca esticar/repetir partes para outra proporção); tamanho sem imagem não usa aquela variação | domains/town |
| Pedras: a pedra do mundo vira Pedra Bruta (mesmo id, salvamentos intactos); 7 variações são materiais novos; receitas 1:1 só para Irregular, Tijolo e Chão; Lisa, Polida, Rachada e Tijolo Rachado ficam para receitas/construções futuras | domains/world, domains/farming |
| Horizontal garantido pela camada de rotação; tela cheia/trava quando o navegador permite | domains/player |

## Arte
| Decisão | Onde |
|---|---|
| Ícones do trigo: monte de sementes e feixe com laço | domains/farming |
| Pá sem folha para a direita: espelho da esquerda | domains/render |
| Prancha 3/4 venceu a extração isométrica (comparação no jogo) | adr/0006 |
| Texturas de blocos/chão sempre na direção desenhada (nada gira nem espelha por célula); variedade só por variações enviadas | CONVENTIONS, domains/render |
| Terra com Grama: arte nova com 3 variações sorteadas por célula (chão e cubo); colunas extras 15–16 do atlas | domains/render, OPERATIONS |
| Moradores = personagem de roupa branca + roupa em camada (sorteada pela seed), mesma grade e escala; cavalo só passeia por enquanto | domains/npc, CONVENTIONS |
| Roupas de ofício (ferreiro) fora do sorteio: vestem só o morador daquele ofício | domains/npc |
| Ferraria: ferreiro mora dentro (atrás do balcão), só fala por enquanto; entrar andando para cima diante da porta | adr/0014, domains/town |
| Ofícios com visual único: personagem e roupa do ofício não se repetem (ferreiro = cabelo preto + roupa de ferreiro) | domains/npc, CONVENTIONS |
| Expressões em camada (rosto, franja por cabelo, efeitos) extraídas das folhas careca; repouso pela seed, reação ao conversar | domains/npc, OPERATIONS |
