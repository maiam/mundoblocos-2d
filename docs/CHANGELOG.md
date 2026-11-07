# Changelog

## 0.81.0 — 2026-11-07
- **Padrão de Materiais V2 — preparação** (nada muda no jogo): o padrão definido com a área de arte entrou no
  repositório (ADR 0022, contrato de entrega em `assets-src/materiais/`) com o pipeline que monta os blocos a partir de
  texturas planas. Para comparar a altura da frente dos cubos (16 ou 18), abra o jogo com `?escala=1`; para ver areia,
  terra, grama e Pedra Bruta no novo formato no mundo, `?blocos=v2`. Já com a **arte oficial** enviada pelo dono do
  produto (terra, grama, transição da grama, areia e pedra bruta).

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
