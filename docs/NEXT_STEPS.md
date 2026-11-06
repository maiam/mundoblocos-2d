# Plano e próximos passos

_Revisado em 2026-11-03 (v0.36.1 — Fases 0, 1 e 2 concluídas; Fase 3 em andamento)._ Fonte única do que falta fazer. Itens concluídos saem daqui e vão para o
`CHANGELOG`; o que existe hoje está detalhado em `CURRENT_STATE.md`.

## 1. Panorama — o que temos

| Sistema | Estado | Observação |
|---|---|---|
| Mundo procedural em chunks 16×16, vista 3/4, biomas, água, montanhas | ✅ sólido | determinístico por seed, ~0,08 ms/chunk |
| Construção: 15 materiais (8 pedras), pilha de 3, buracos, porta, tenda, baú | ✅ | materiais **coletados** (grade 9 + bolsa) |
| Personagem: movimento, câmera, joystick, botão de ação, paisagem/tela cheia | ✅ | teste do botão no celular ainda em avaliação |
| Ferramentas (espada, enxada, picareta, pá, machado) com ação e restrições | ✅ | quebrar com ferramenta 1 s, mão 2 s |
| Cultivo de trigo + inventário de itens contáveis | ✅ básico | só uma cultura, sem receitas |
| Ovelhas: pastar, comer, namorar, filhotes | ✅ | só no campo ao sul do portão; espada as faz sumir |
| Santuário Celestial (perfil de mundo, Deusa flutuando, 18 blocos) | ✅ | subdomínio real não hospedado |
| Cidade do Despertar (início fixo, muralha, ruas, construções) | ✅ estrutura | 4 moradores + ferreiro de visual único (6 roupas), falas curtas, interior da Ferraria (v0.42); sem loja nem missões |
| Cavalo no campo | ✅ passeio | sem montaria nem interação |
| Dungeon "Covil das Aranhas": labirinto procedural, área protegida, chefe | ✅ | fora da cidade; aranhas só com arte de frente |
| Monstros: vida, golpe, mordida, busca de caminho, morte, espólios, renascimento | ✅ | arte final de morte e espólios |
| Vida da heroína, dano, morte e renascimento | ✅ | vida em pontos com barra, fórmula de dano e números na tela (Fase P.1) |
| Salvar progresso | ✅ | automático no navegador (ADR 0011); nuvem depende do backend do Orvalis (ADR 0015) |
| Menu | ✅ | continuar, novo mundo, recomeçar |
| Sons, música, vibração | ❌ | — |
| Qualidade | ✅ | 117 testes, typecheck limpo, bench, verificação no navegador a cada entrega |
| Peso dos artefatos | ✅ | imagens em arquivos separados (ADR 0013): **início ~2,5 MB** (orçamento < 3 MB), dungeon em segundo plano; Santuário 0,7 MB |

## 2. Plano por fases

Cada fase fecha um ciclo jogável. A ordem respeita dependências; dentro da fase, a ordem é a sugerida.

### Fase 0 — Saúde do projeto ✅ (v0.25.0)
Arte separada por mundo (ADR 0010; 2,63 MB / 0,68 MB), `ActionController` extraído do `Game`, Santuário
republicado, PR da branch de trabalho para `main` aberto. Detalhes no `CHANGELOG`.

### Fase 1 — Combate jogável ✅ (v0.26.0)
Vida da heroína (5 ♥, renasce no início com os itens), mordida das aranhas, busca de caminho no labirinto, morte com
espólios (seda, presa, Coração da Rainha), renascimento de todas (Rainha em 5 min), farol + seta da entrada,
penumbra. Pendências que ficaram desta fase:
- **Arte**: ícones dos espólios e mortes das aranhas ✅ (v0.26.1). Faltam (opcionais): heroína levando dano e aranhas nas 4 direções.
- **Minimapa** do labirinto explorado.
- **Animais**: animação de morte e drops (lã/carne? — decisão pendente).

### Fase 2 — Persistência ✅ (v0.27.0)
Salvamento automático no navegador (ADR 0011, `domains/save.md`) e menu ☰ (continuar, novo mundo, recomeçar).
Pendências: **contas e mundos na nuvem** exigem o **backend do Orvalis** (ADR 0015) — nada de backend aqui; exportar/importar o salvamento como arquivo (troca de aparelho sem nuvem);
migrar para IndexedDB se os mundos editados passarem de ~5 MB.

### Fase M — Multiplayer (ADR 0015 e 0016)
Arquitetura (ADR 0015): servidor próprio do Orvalis, autoritativo, em repositório separado, usando as regras de
`src/world/` (o terreno é função da seed: só as edições trafegam). Jogo e servidor em apps/subdomínios separados.
0. ~~Validar hospedagem~~ ✅ 2026-11-04: eco WebSocket do `maiam/orvalis-servidor` em
   `orvalis-servidor.pensamentos.online` (app web Node.js na Hostinger) conecta. Falta medir limites (conexões
   simultâneas, tempo de conexão parada) quando houver jogadores; VPS é o plano B.
1. ✅ **Base no jogo** (v0.45.0): ações como dados (`world/actions.ts`), protocolo (`net/protocol.ts`), sala pura
   (`net/room.ts`), sessão do jogo (`net/session.ts`) e servidor de teste local (`net/loopback.ts`), com testes.
   Falta (vai com a Etapa 3): ligar ao `Game` e a tela de entrar/criar sala.
2. ✅ **Servidor** (v0.46.0 / orvalis-servidor 0.2.0): `npm run build:net` gera `dist-net/orvalis-net.cjs` (sala +
   protocolo + regras do mundo); o servidor guarda uma cópia em `vendor/` (`npm run sync-net`) e liga WebSocket →
   `Room`. Limites de mensagens, origens permitidas, salas só na memória (acabam vazias). Falta: guardar as edições
   das salas (por chunk) para sobreviver a reinícios.
3. ✅ **Co-op no jogo** (v0.47.0): menu ☰ "Jogar com amigos" (nome + criar sala / entrar com código; na sala: código,
   quantos estão e sair), outros jogadores com nome em cima (posição ~10×/s, suavizada), mapa sincronizado (quebrar,
   colocar, arar, amassar, plantar, porta). Falta: **monstros, animais, moradores e itens caídos ainda são de cada
   jogador** (cada um vê os seus); guardar as salas; recuperar o mapa se uma ação for recusada (corrida rara).
4. **Encontro nas cidades**: chat, grupos (visão de progressão).
Decidido (ADR 0016): co-op com código de convite (até 4), convidado só com nome, sem PvP, servidor autoritativo,
servidor reaproveita `world`+`net` como pacote compilado. Repositório do servidor: `maiam/orvalis-servidor`.

### Fase 3 — Recursos e progressão
1. ✅ **Materiais coletados** (v0.28.0): quebrar devolve o bloco, árvore → toras, colocar gasta; grade 8 + bolsa;
   morte perde tudo menos as ferramentas.
2. ✅ **Receitas** (v0.31.0): Construtor — Tábua, Porta, Tenda (ponto de renascer). Próximas: mais profissões e
   receitas (trigo → pão? Coração da Rainha → ?), painel do **Personagem** (vida, armaduras — ícone já na grade).
3. ✅ **Painel de inventário** (bolsa no 9º espaço).
4. Tosar ovelha → lã; mais culturas; regar/adubar.
5. **Fonte das pedras sem receita** (Lisa, Polida, Rachada, Tijolo Rachado): receitas futuras ou **construções prontas**
   (ruínas/estruturas geradas pela seed — mudam o mapa; rodar os testes de determinismo). Decidir também se as
   variações substituem água (hoje só a Pedra Bruta; batente de porta já aceita todas).

### Fase P — Progressão do personagem (prioridade atual: diversão) — decisões do dono do produto em 2026-11-03
Objetivo: dar sensação de crescimento. Regras puras em `world/progression.ts` (curva de XP, fórmula de dano,
atributos por nível, benefícios das profissões; testável, sem DOM/aleatório solto); estado no `Player`; combate segue
em `Entities` usando a fórmula; salvamento v5 com migração (quem já joga começa no nível 1, sem perder nada).
1. ✅ (v0.39.0) **Vida e dano com números** — vida em pontos (~100 no início) numa **barra com o número** (no lugar dos corações);
   atributos Vida máx., Ataque e Defesa; dano = ataque da arma + bônus − defesa, ±10% e 5% de crítico (×1,5);
   espada mais forte que machado; números de dano subindo na tela; aranhas com ficha (vida/ataque/defesa) rebalanceadas.
2. **Nível e XP** — XP por monstros (mais para os fortes) e um pouco por receitas; curva crescente, teto 20 nesta
   etapa; **atributos sobem sozinhos** ao subir (pontos para distribuir, talvez depois); vida cheia e aviso
   "Subiu de nível!"; barra de XP; painel do **Personagem** (nível, atributos, XP); nível visível sobre os monstros.
3. **Profissões com proficiência** (nível próprio por uso): **Lenhador** (cortar madeira: quebra mais rápido, tora
   extra), **Minerador** (pedra: quebra mais rápido, pedra extra, libera Pedra Lisa/Polida), **Agricultor** (arar,
   plantar, colher: colheita maior, trigo mais rápido), **Construtor** (receitas: libera receitas novas). Nível de cada
   uma no painel Habilidades.
4. **Comida, cura e equilíbrio** — cozinhar (pão de trigo, carne) para curar — **Fogueira, Caldeirão de Pedra e Forno de Pedra já existem** (v0.49.0, só se colocam): cozinhar neles; Covil das Aranhas ajustado para a faixa
   1–5; **morte perde 10% do XP do nível atual, sem nunca descer de nível** (continua perdendo tudo menos as ferramentas).

### Fase 4 — Mundo vivo e conteúdo
- **Mapa** — minimapa com névoa ✅ v0.51.0. Próximo: tocar no minimapa abre o **mapa grande** (tela cheia, zoom,
  arrastar), nomes de regiões (biomas, cidade, dungeon) e marcadores do jogador; moldura de pergaminho se a arte
  enviar. Na sala multiplayer, a névoa é só de quem anda (não salva no aparelho) — juntar a dos amigos é opcional.
0. **Cidade do Despertar — vida** (V1 entregue em v0.35.0, `domains/town.md`; 4 moradores passeando desde v0.40.0):
   ~~fala ao tocar~~ ✅ v0.42 (falas fixas), expressões ✅ v0.44 (usar mais: sonolento à noite, assustado perto de
   monstros, bravo se golpeado; folhas de cabelo separadas eliminariam as manchinhas dos perfis), **interiores das outras construções** (hospedaria, guilda, lojas, casas:
   imagem + mapa, ADR 0014), **loja do ferreiro** (comprar/melhorar ferramentas — depende de moedas/profissões),
   NPCs que apresentam o mundo na praça inicial, moradores que voltam às casas,
   mais moradores/roupas conforme chegarem folhas (roupa = folha de caminhada só de roupa, mesma grade —
   `extract-villagers.py`), guardas na muralha/castelo, ferreiro de dia, hospedaria à
   noite (precisa de **folhas 4×4 de personagens** — dependência de arte); **arte dos caixotes e placas** (ainda pintados em código; hospedaria ✅ v0.40.1, fonte/poço/barraca/barril ✅ v0.43); interiores (guilda com quadro de missões,
   lojas com compra/venda, hospedaria como ponto de retorno opcional); lampiões acendendo ao anoitecer e
   movimento diminuindo. Opcional: trocar a arte pintada em código por pranchas.
1. Ovelhas e cavalos (e novos animais) em outros chunks, por bioma, com limite. Cavalo: montaria (andar mais rápido).
2. **Mais dungeons**: generalizar `buildDungeon/decorateDungeon` por tema (arte + monstros + chefe), várias pelo mapa.
3. Porta: orientação lateral (quadro de lado), cair sem batente?, fechar sozinha?; atalho de teclado além do 9.
4. Sons e música opcionais, vibração no celular ao quebrar/acertar.
5. Botão de ação: mão vazia + toque colhe trigo maduro / faz carinho na ovelha; alvo pela diagonal do joystick.

### Fase 5 — Visual e polimento
0. **Personagem modular (humano chibi v02)** — ADR 0017, `assets-src/personagens/CONTRATO.md`.
   a. _Arte_: revisão 4 corrige a sequência dos braços à direita e o encaixe das mãos nas roupas. Conferir
      `previas/v02/direita-antes-depois.gif` e a montagem no cenário. Guarda-roupa fantasia 01 em revisão (onze peças, treze folhas, 16 combinações sobrepostas;
      25 incluindo a base). Conferir seletores e sorteio em `humano-chibi/previas/v02/revisao.html`, os 32 quadros,
      cintura/cavas/bainhas e coerência de detalhes frente/costas do colete. Preservada a base bege da revisão 2.
      Aprovação do movimento dos sapatos continua pendente. Caminhada direita conferida no navegador/cenário na v0.50.1;
      aguardar revisão artística do dono antes de nova expansão.
   b. ~~_Motor_: personagem modular lendo o manifesto~~ — feito na v0.48.0 (`?personagem=chibi`). Falta: conferir
      no cenário com a área de arte (perspectiva, encaixe), repouso quando houver, ferramentas no chibi e sala
      multiplayer. ~~Seletor de aparência na interface~~ e ~~escala igual à heroína~~ — feitos na v0.50.0 (tela de entrada).
   c. Ajustar contrato (caixas, escala, ordem) → repousos e transições → ampliar biblioteca → ferramentas por último.
   d. ~~Aparência no salvamento~~ (v0.50.0, `SAVE_VERSION` 6). **Próximo (Etapa 2 da tela de entrada)**: aparência
      no multiplayer — `look` no estado do jogador (`PROTOCOL_VERSION` 2, validar contra o manifesto no `Room`),
      `RemotePlayers` desenhando o chibi dos outros; atualizar `orvalis-servidor` junto (`sync-net`).
   e. Tela de entrada: depois, "Jogar com amigos" direto do título e "Entrar" (cadastro, backend do Orvalis).
1. Arte 3/4 para árvores, cacto e água no estilo da prancha; topo dos cubos menos achatado.
2. Transições suaves entre chãos (autotile), água animada, pontes.
3. Alturas: meio bloco/escadas; indicar borda de queda.
4. Geração em Web Worker só se o custo por chunk voltar a crescer.

### Fase 6 — Mundo de progressão (visão do dono do produto, `PROJECT_CONTEXT`)
Cidades e dungeons que acompanham a evolução dos personagens: Cidade 1 para novatos; cidades de nível mais alto mais
longe, onde os personagens passam a se concentrar. Passos sugeridos (ordem de dependência):
1. **Níveis e experiência** do personagem (o que dá XP: monstros, receitas, missões?) e o que o nível muda
   (vida, dano, acesso a regiões/receitas). Painel do Personagem mostra nível e XP.
2. **Faixa de nível** em dungeons e monstros (`MONSTERS` por faixa; dungeon generalizada por tema e nível — Fase 4.2).
3. **Mapa de regiões**: posições fixas das cidades (iguais em toda seed, como a Cidade 1) e das dungeons de cada
   faixa, distância crescente a partir da Cidade 1; terreno entre elas segue procedural.
4. **Cidade 2** (primeira cidade de nível intermediário) reutilizando o gerador da cidade com outra planta/tema.
5. **Viagem** entre cidades (estradas, marcos no mapa, talvez portais/carruagens desbloqueados por nível) e
   **renascer** na cidade da faixa do personagem (hoje: tenda ou Cidade 1).
6. Arte por região carregada **sob demanda** ao se aproximar (ADR 0013) — o mundo maior não pesa no início.

### Santuário Celestial (trilha paralela)
- Subdomínio `santuario.orvalis.pensamentos.online` na mesma pasta do jogo (opcional; passos em `OPERATIONS`).
- Definir ações da Deusa e se flutuar tem efeito de jogo (passar sobre buracos, subir 2 níveis).
- (Arte) variação de nuvem feita para chão contínuo (elimina a repetição diagonal).

## 3. Decisões pendentes (do dono do produto)
| Decisão | Afeta |
|---|---|
| Níveis: faixas por cidade (a Fase P define XP, curva e teto 20 da Cidade 1) | Fase 6 |
| Mapa de regiões: onde ficam as próximas cidades, como se viaja entre elas, onde renasce | Fase 6 |
| O que animais dropam (lã? carne?) | Fase 1 (pendência) |
| Próximas profissões/receitas; uso do Coração da Rainha | Fase 3 |
| Cidade: NPCs (quem, falas), interiores, o que as lojas vendem, hospedaria como ponto de retorno | Fase 4 |
| Variações de pedra: fonte de Lisa/Polida/Rachada/Tijolo Rachado; substituem água? | Fase 3 |
| Painel do Personagem: além de nível/atributos/XP (Fase P), armaduras? | Fase P/4 |
| Limite de pilha (bolsa já tem 18 espaços; pilhas sem limite) | Fase 3 |
| Porta cai sem batente? Fecha sozinha? | Fase 4 |
| Ações próprias da Deusa | Santuário |

## 4. Dependências externas
- **Backend do Orvalis** (repositório separado, subdomínio de `pensamentos.online`; ADR 0015 — sem maiamapps):
  multiplayer, contas, mundos na nuvem. Primeiro passo: validar WebSocket na Hostinger (Fase M).
- **Hospedagem** ✅ no ar em `https://orvalis.pensamentos.online` (Hostinger, provisório; publica a cada merge em
  `main` — ver `OPERATIONS`). Depois, domínio próprio do Orvalis (não maiamapps).
- **Arte**: mais personagens de roupa branca e folhas de roupas (moradores ✅ 4 + 6 roupas, uma de ferreiro); roupas de outros ofícios (guarda, mercador, estalajadeiro); guardas, ferreiro, mercadores; (opcional) aranhas por direção e heroína levando dano, árvores/água 3/4, nuvem contínua.

## 5. Riscos e dívidas técnicas
- **Orçamento de início (ADR 0013)**: hoje ~2,5 MB de 3 MB. Próximos a ir para segundo plano quando crescer: folhas da
  heroína com ferramenta (~1 MB, carregar ao equipar) e arte de cidades/dungeons novas (carregar ao se aproximar).
  Hospedagem própria (CDN/domínio) usa o mesmo `dist/`.
- `ActionController` (465 linhas) vai crescer com vida/dano: separar combate (golpe, dano) em módulo próprio na Fase 1.
- Canvases do chão em 2× (`TEX_RES`) custam ~4 MB por chunk em cache; reduzir em celulares fracos se preciso.
- Monstros sempre atualizados (~39 no labirinto): ok hoje; com várias dungeons, atualizar só os próximos.
- Pipeline de brilho (`glowColor`) sem uso desde a remoção dos blocos mágicos (mantido para tochas/vaga-lumes).
- iPhone/Safari: sem tela cheia/trava de orientação no navegador (limitação da plataforma).
