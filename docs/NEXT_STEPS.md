# Plano e próximos passos

_Revisado em 2026-11-07 (v0.80.0 — Fases 0, 1, 2 e M concluídas até a Etapa 3 do multiplayer; Fase P: vida e dano
entregues, **XP/níveis ainda não**; Fases 3–6 em aberto)._ Fonte única do que falta fazer. Itens concluídos saem daqui e
vão para o `CHANGELOG`; o que existe hoje está em `CURRENT_STATE.md`.

## 1. Panorama — o que temos

| Sistema | Estado | Observação |
|---|---|---|
| Mundo procedural em chunks 16×16, vista 3/4, biomas, água, montanhas | ✅ sólido | determinístico por seed, ~0,08 ms/chunk |
| Construção: 12 materiais (5 pedras; 3 aposentadas), pilha de 3, buracos, porta, tenda, baú | ✅ | materiais **coletados** (grade 9 + bolsa) |
| Personagem: movimento, câmera, joystick, botão de ação, paisagem/tela cheia | ✅ | teste do botão no celular ainda em avaliação |
| Ferramentas (espada, enxada, picareta, pá, machado) com ação e restrições | ✅ | quebrar com ferramenta 1 s, mão 2 s |
| Cultivo (trigo, batata, tomate, cenoura) + inventário de itens contáveis | ✅ | 4 culturas; comer e cozinhar desde v0.56.0 |
| Ovelhas: pastar, comer, namorar, filhotes | ✅ | só no campo ao sul do portão; espada as faz sumir |
| Santuário Celestial (perfil de mundo, Deusa flutuando, 18 blocos) | ✅ | subdomínio real não hospedado |
| Cidade do Despertar (início fixo, muralha, ruas, construções) | ✅ estrutura | 4 moradores + ferreiro de visual único (6 roupas), falas curtas, interior da Ferraria (v0.42); sem loja nem missões |
| Cavalo, vacas e galinhas no campo | ✅ passeio, reprodução e filhotes (v0.60.0) | sem montaria; leite e ovo ao alimentar e animais que seguem quem alimenta (v0.74.0); no jogo sozinho os animais não são salvos |
| Hortaliças (batata, tomate, cenoura) | ✅ v0.53.0 | crus ou no caldeirão (v0.56.0) |
| Fome, comida e Cozinheiro | ✅ v0.56.0 | barra de fome; pão e macarrão no Caldeirão |
| Árvores que crescem (carvalho, macieira) e maçãs | ✅ v0.52.0 | crescimento local em cada aparelho (sala multiplayer pode divergir) |
| Dungeon "Covil das Aranhas": labirinto procedural, área protegida, chefe | ✅ | fora da cidade; aranhas só com arte de frente |
| Monstros: vida, golpe, mordida, busca de caminho, morte, espólios, renascimento | ✅ | arte final de morte e espólios |
| Vida da heroína, dano, morte e renascimento | ✅ | vida em pontos com barra, fórmula de dano e números na tela (Fase P.1) |
| Salvar progresso | ✅ | automático no navegador (ADR 0011); nuvem depende do backend do Orvalis (ADR 0015) |
| Menu | ✅ | continuar, novo mundo, recomeçar |
| Sons, música, vibração | ❌ | — |
| Multiplayer (Sala 1, até 10) | ✅ Etapas 1–3 | servidor autoritativo em `maiam/orvalis-servidor`: mundo, hora, crescimento, itens, baús, animais e aranhas da sala; falta medir carga real e moradores compartilhados |
| Personagens e tela de entrada | ✅ | Heroína, Herói, Hood, Gino e Mila (o chibi modular saiu na v0.92.0); sentar nos cinco prontos (v0.80.0) |
| Minimapa com névoa | ✅ v0.51.0 | mapa grande ainda não |
| XP, níveis e profissões com proficiência | ❌ | Fase P, etapas 2 e 3 |
| Qualidade | ✅ | 214 testes, typecheck limpo, bench, CI (Verificação) a cada PR; verificação no navegador a cada entrega |
| Peso dos artefatos | ✅ | imagens em arquivos separados (ADR 0013): **início ~2,0 MB** (orçamento < 3 MB, desde a v0.74.0), dungeon e folhas de personagem sob demanda; Santuário 0,7 MB |

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
3b. **Sala compartilhada** (o servidor passa a ser dono do que acontece no mundo, com o mesmo código do jogo):
   - ✅ **Etapa 1 — mesmo horário e mesmo crescimento** (v0.63.0, protocolo 7): `Room.time`/`Room.tick` (servidor 1×/s),
     `welcome.time`, `time` a cada 30 s, `grow` com as células que cresceram; o aparelho na sala não cresce sozinho.
   - ✅ **Etapa 2 — itens caídos e baús da sala** (v0.67.0, protocolo 10). Falta: dois mexendo no mesmo baú ao mesmo
     tempo — vale o último (sem trava).
   - ✅ **Etapa 3 — aranhas e animais da sala** (v0.70.0, protocolo 13, ADR 0021): o servidor roda as `Entities` da sala
     e manda os bichos perto de cada jogador ~10×/s; golpe, comida e mordida decididos pela sala; espólio de aranha é
     item da sala. Falta: medir CPU/banda na Hostinger com gente de verdade (em Node: ~70 ms por minuto de jogo);
     moradores seguem locais; descarregar chunks do servidor. ~~Salvar os animais da sala~~ ✅ v0.73.0 (monstros
     renascem pela seed; no jogo sozinho os animais ainda não são salvos). ~~Ferramenta e golpe visíveis para os outros~~ ✅ v0.72.0 (protocolo 15).
   - Fora da sala nada muda (tudo roda no aparelho).
   - ✅ **Salas fixas salvas** (v0.64.0, ADR 0020): Sala 1 (até 10), mundo e bolsas no servidor. Confirmado em 07/11 que
     `~/orvalis-dados` sobrevive a reinício e a deploy do servidor (`carregadaDoDisco` após o merge da v0.10.0);
     comprimir o `welcome` quando o mundo editado crescer; mais salas quando precisar (`ROOMS`).
4. **Encontro nas cidades**: chat, grupos (visão de progressão).
Decidido (ADR 0016): co-op com código de convite (até 4), convidado só com nome, sem PvP, servidor autoritativo,
servidor reaproveita `world`+`net` como pacote compilado. Repositório do servidor: `maiam/orvalis-servidor`.

### Fase 3 — Recursos e progressão
0. **Ferramentas por material** (ADR 0018, `assets-src/ferramentas/CONTRATO.md`): 5 níveis enviados em 06/11
   (madeira, pedra, madeira + presa, madeira + Coração, presa + Coração) esperando a arte no contrato.
   a. _Arte_: refazer as pranchas de ícones no formato (fileira, em pé, mesma escala, alfa limpo); pose-base sem
      ferramenta da heroína (10 folhas); camadas de mão do nível madeira (piloto).
   b. _Dono do produto_: receitas, poder/velocidade por nível e se a pedra entra.
   c. _Motor_ (depois de a): `ToolId` → tipo + material (migração do salvamento), camada `ferramenta-tras/frente`
      no render, ícone por material, receitas.
1. ✅ **Materiais coletados** (v0.28.0): quebrar devolve o bloco, árvore → toras, colocar gasta; grade 8 + bolsa;
   morte perde tudo menos as ferramentas.
2. ✅ **Receitas** (v0.31.0): Construtor — Tábua, Porta, Tenda (ponto de renascer; pede Pano de Seda desde v0.54.0). Próximas: mais profissões e
   receitas (trigo → pão? Coração da Rainha → ?), painel do **Personagem** (vida, armaduras — ícone já na grade).
3. ✅ **Painel de inventário** (bolsa no 9º espaço).
4. Tosar ovelha → lã; mais culturas; regar/adubar.
5. **Fonte das pedras sem receita** (Lisa e Polida; Irregular, Rachada e Tijolo Rachado foram aposentadas em 08/11): receitas futuras ou **construções prontas**
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
4. **Comida, cura e equilíbrio** — ✅ v0.56.0: **barra de fome**, alimentos crus (maçã, cenoura, batata, tomate) e pratos do **Cozinheiro** no Caldeirão (pão, macarrão ao molho), pesos em `FOOD`. Falta: carne, forno/fogueira cozinhando, comida que cure direto, arte própria do ícone do Cozinheiro. Original: cozinhar (pão de trigo, carne) para curar — **Fogueira, Caldeirão de Pedra e Forno de Pedra já existem** (v0.49.0, só se colocam): cozinhar neles; Covil das Aranhas ajustado para a faixa
   1–5; **morte perde 10% do XP do nível atual, sem nunca descer de nível** (continua perdendo tudo menos as ferramentas).

### Receitas mais claras (plano de 2026-11-06, em partes)
1. ✅ v0.57.0 — bolsa 4×3 à direita e ficha de receita com Confirmar/Cancelar mostrando a bolsa ao lado.
2. **Descrições** dos itens e blocos (`description` em `world/items.ts`/`blocks.ts`) na ficha e na bolsa.
3. Depois: criar várias (×5), "onde conseguir" cada ingrediente, filtro "posso fazer", item voando até o espaço.

### Fase 4 — Mundo vivo e conteúdo
- **Mapa** — minimapa com névoa ✅ v0.51.0. Próximo: tocar no minimapa abre o **mapa grande** (tela cheia, zoom,
  arrastar), nomes de regiões (biomas, cidade, dungeon) e marcadores do jogador; moldura de pergaminho se a arte
  enviar. Na sala multiplayer, a névoa é só de quem anda (não salva no aparelho) — juntar a dos amigos é opcional.
0. **Cidade do Despertar — vida** (V1 em v0.35.0, `domains/town.md`; **16 NPCs nomeados e caixa de conversa na v0.92.0**, `domains/npc.md`):
   ~~fala ao tocar~~ ✅ (caixa de conversa com retrato, nome e páginas), ~~mais moradores~~ ✅ (Black + 15). Falta: **falas de verdade**
   (as 2 de cada NPC são provisórias; o dono do produto revisa nomes e textos em `game/npcs.ts`), **escolhas e missões** na conversa,
   **expressões/retratos por humor** (hoje um retrato fixo por NPC), NPCs que voltam às casas e dormem à noite, guardas na
   muralha/castelo, **interiores das outras construções** (hospedaria, guilda, lojas, casas: imagem + mapa, ADR 0014),
   **loja do ferreiro** (comprar/melhorar ferramentas — depende de moedas/profissões); **arte dos caixotes e placas** (ainda
   pintados em código); lampiões acendendo ao anoitecer e movimento diminuindo.
1. Ovelhas e cavalos (e novos animais) em outros chunks, por bioma, com limite. Cavalo: montaria (andar mais rápido).
   ~~Leite e ovo~~ ✅ v0.74.0. Salvar os animais no jogo **sozinho** (`game/save.ts`, sobe `SAVE_VERSION`): na sala já são
   salvos pelo servidor (v0.73.0); no jogo sozinho o rebanho criado ainda some ao recarregar.
   Árvores: muda de cerejeira e de cacto se a arte vier. ~~Maçã comível~~ ✅ v0.56.0, ~~crescimento sincronizado na
   sala~~ ✅ v0.63.0, ~~cadeira/sentar~~ ✅ v0.79.0.
2. **Mais dungeons**: generalizar `buildDungeon/decorateDungeon` por tema (arte + monstros + chefe), várias pelo mapa.
3. Porta: orientação lateral (quadro de lado), cair sem batente?, fechar sozinha?; atalho de teclado além do 9.
4. Sons e música opcionais, vibração no celular ao quebrar/acertar.
5. Botão de ação: mão vazia + toque colhe trigo maduro / faz carinho na ovelha; alvo pela diagonal do joystick.

### Fase 5 — Visual e polimento
**Escala visual (ADR 0022):** ✅ cena de escala `?escala=1` (v. CHANGELOG, 07/11). Próximo, **depois de olhar a cena** (a normalização das alturas não é automática): (a) catálogo gerado das escalas existentes; (b) validação no `process-sprite.py` — exige tolerâncias numéricas nos contratos; (c) calcular as razões de altura (`297/288`…) pela altura do corpo em vez de digitar; (d) entrar o chibi modular na fila; (e) reavaliar o cavalo (1,6 vs 2,2) antes de montaria.
0. **Personagens prontos** (o chibi modular e a ADR 0017 foram removidos na v0.92.0, ADR 0025).
   e. Tela de entrada: depois, "Jogar com amigos" direto do título e "Entrar" (cadastro, backend do Orvalis).
   f. ~~**Herói** — folhas de andar segurando as ferramentas~~ ✅ v0.76.0 (todas as 11 folhas refeitas).
   h. **Sentar** (v0.79.0; os cinco personagens prontos): sentar de lado/de
      costas só se vier arte por direção.
   g. **Hood (v0.71.0)** — ~~folhas de golpe~~ entregues (v0.75.0). Falta: caminhada com pá virada para a direita
      (hoje espelhada); confirmar que a 6ª folha de caminhada (cabeça de machadinha) é a enxada.
1. Arte 3/4 para árvores, cacto e água no estilo da prancha; topo dos cubos menos achatado.
   - **Cerca (v0.59.0)**: pedir à arte o **portão de lado** (fechado e aberto) para cercas verticais — hoje usa o de
     frente — e, se quiserem refinar, peças separadas (poste, travessa horizontal e vertical de 1 célula). Animais
     ainda não "moram" no cercado (não há dono/curral): só ficam presos por colisão.
2. ~~Transições suaves entre chãos (autotile)~~ → Fase V, etapa 3. Água animada, pontes.
3. Alturas: meio bloco/escadas; indicar borda de queda.
4. Geração em Web Worker só se o custo por chunk voltar a crescer.

### Fase V — Padrão de Materiais V2 (ADR 0023; pacote em `docs/materiais-v2/`)
Recomendação aprovada pelo dono do produto em 2026-11-07: por etapas, jogo intacto até a decisão.
0. ✅ **Docs** (v0.81.0): ADR 0023, `assets-src/materiais/CONTRATO.md`, exceção das máscaras em CONVENTIONS, pacote
   original guardado. A cena `?escala=1` citada no pacote é a da ADR 0022 (sprites no renderizador real); a comparação
   de frentes ficou numa cena própria, `?materiais=1`.
1. ✅ **Pipeline e geometria** (v0.81.0): `scripts/build-materials.py` → `materials-v2.{webp,json}`;
   `render/materialsV2.ts` (`V2_BLOCKS`: areia, terra, grama sobre terra com franja, Pedra Bruta); `?blocos=v2`
   (mundo) e `?materiais=1` (só dev, `dev/materialsScene.ts`: pilhas, chão, heroína no chão e sobre cubo, grade e linha
   de apoio).
2. ✅ **Arte oficial** (v0.81.0–0.81.1): terra, grama, franja da grama (reduzida aos 32 px do padrão), areia e Pedra
   Bruta, estas três com frente própria desde a v0.81.2 (a grama usa a frente da terra); sem frente, a frente repete o topo. Conferir na cena a densidade de terra e grama (vieram
   em 1254 px; no jogo cada célula mostra o quadro inteiro, detalhes pequenos somem).
3. ✅ **Transições horizontais** (v0.85.0; só a Grama avança, sobre Terra, Caminho e Areia — mais pares dependem de regra do dono do produto e de máscara). Plano original: só no chão plano e na mesma altura: 8 vizinhos, diagonais só com os 2 cardeais, 47 casos
   a partir de ~13 formas em `assets-src/materiais/_mascaras/` giradas pelo script; prioridade por material do topo
   (dado do catálogo, desempate estável); composição no cache do chunk do `ChunkRenderer`, invalidando 3×3 (inclusive
   chunk vizinho). Testes do pacote (04, § 8). Substitui o item "Transições suaves entre chãos" da Fase 5.
4. ✅ **Frente: 18** (dono do produto, v0.81.1): diferença imperceptível na cena, sem ganho que pague a mudança de
   `CUBE_FRONT`. A cena `?materiais=1` ficou legado × V2.
4b. ✅ **Massa contínua** (v0.82.0): sem riscos entre cubos V2 vizinhos nem entre níveis, de qualquer material; frente
   seamless usada inteira e fatiada por nível; franja só no nível mais alto (ADR 0023). Falta: conferir com a arte se o
   "vinco" claro entre topo e frente de cada cubo deve ficar.
4d. ✅ **Cinco pedras no V2** (v0.83.0): Tijolo, Chão, Lisa e Polida entram (a Bruta já estava); as outras três pedras foram aposentadas.
4e. ✅ **Madeira de carvalho no V2** (v0.84.0): Tora (topo e frente) e Tábuas (só o topo, em teste: se a frente repetida não agradar, pedir a frente). Todos os 15 materiais de construção agora têm V2; falta o passo 5 (ligar `?blocos=v2` como padrão e aposentar o atlas antigo).
4f. ✅ **Paredes removidas** (v0.84.0): saíram do jogo (ids 210–225 viram vazio em dados antigos).
4c. ✅ **Caminho de Terra e Terra Arada** (v0.82.1–0.82.2): topos oficiais, frente sempre de terra e franja própria; o chão V2 deixou de levar a grade sutil por célula.
5. ✅ **V2 é o padrão** (v0.85.0, `?blocos=legado` volta ao antigo). Falta: aposentar o atlas legado (ADR 0006) — depende
   do que fazer com as três pedras aposentadas ainda presentes em mundos salvos (coluna do atlas antigo) — e os blocos
   celestiais (outro mundo). Saves não mudam (ids iguais).

5b. ✅ **Chão que se refaz** (v0.86.0, pedido do dono do produto): buraco sem bloco por um dia inteiro ganha o chão de um
   vizinho (ver `domains/world.md`). Servidor: sincronizar o pacote (retrato v4 e `World`).
5c. ✅ **Transições por par e água** (v0.87.0): topo da Água e os 8 pares enviados (ver CURRENT_STATE). Falta: pares com
   Terra Arada, Caminho×Areia/Terra e Grama×Caminho invertido, se o dono do produto quiser; espuma nas pontas de poças de 1
   célula e nos cantos côncavos ainda é simples (ver CURRENT_STATE).

5d. ✅ **Árvores adultas, cerejeira e chunk do muro** (v0.88.0, ADR 0024). Macieira nova com a colhida na v0.90.0. Falta: **frente das tábuas** (hoje repete o topo), formas novas de árvore se o dono do produto quiser, **orçamento de início no limite (~2,9 de 3 MB: a próxima arte de árvore pede carga sob demanda)**, tamanho das árvores (3,4 células de
   largura; ajustar `TREE_CELLS` se pesar na tela) e **versões de outras madeiras** para porta, baú, cadeira e cerca (decisão do dono do produto: por ora só carvalho). Bétula entrou na v0.89.0 (ADR 0024). Servidor: sincronizar o pacote (regra do muro, mudas e ids novos).

5e. ✅ **Mila e lobos** (v0.91.0). Falta: **uso do espólio do lobo em receitas** (Pelagem e Presa de Lobo já caem por sorteio, sem receita), folha de **morte** própria
   (hoje encolhe e desbota, com faíscas roxas), uivo/aviso antes do ataque, tocas visíveis no mapa e no minimapa, e decidir se
   o bando deve atacar junto (hoje cada lobo decide pela própria distância de 3 células). **Orçamento de início (~2,9 de 3 MB)
   no limite**: árvores e blocos novos já pedem carga sob demanda. Servidor: sincronizar o pacote (protocolo 19).

### Fase 6 — Mundo de progressão (visão do dono do produto, `PROJECT_CONTEXT`)
Cidades e dungeons que acompanham a evolução dos personagens: Cidade 1 para novatos; cidades de nível mais alto mais
longe, onde os personagens passam a se concentrar. Passos sugeridos (ordem de dependência):
1. **Níveis e experiência** do personagem (o que dá XP: monstros, receitas, missões?) e o que o nível muda
   (vida, dano, acesso a regiões/receitas). Painel do Personagem mostra nível e XP.
2. **Faixa de nível** em dungeons e monstros (`MONSTERS` por faixa; dungeon generalizada por tema e nível — Fase 4.2).
3. **Andares por portais** (ADR 0019, substitui o "mapa de regiões" num mapa só): cada cidade num mundo próprio
   (`WorldProfile` com bioma, cidade e dungeons da faixa), ligados por portais. Decidir antes: o que destrava o
   próximo andar (chefe, nível?), se o inventário viaja inteiro, onde renasce em cada andar, seed por andar e salas
   multiplayer entre andares. Mundo 2 sugerido: árido (Dunas e cacto já existem no código e na arte).
4. **Cidade 2** (primeira cidade de nível intermediário) reutilizando o gerador da cidade com outra planta/tema.
5. **Viagem** entre andares pelos portais (o portal da Cidade 1 é o primeiro marco) e
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
| Variações de pedra: fonte de Lisa e Polida; substituem água? | Fase 3 |
| Painel do Personagem: além de nível/atributos/XP (Fase P), armaduras? | Fase P/4 |
| Limite de pilha (bolsa tem 12 espaços desde v0.57.0; pilhas sem limite) | Fase 3 |
| Porta cai sem batente? Fecha sozinha? | Fase 4 |
| Ações próprias da Deusa | Santuário |

## 4. Dependências externas
- **Backend do Orvalis** (repositório separado, subdomínio de `pensamentos.online`; ADR 0015 — sem maiamapps):
  multiplayer, contas, mundos na nuvem. Primeiro passo: validar WebSocket na Hostinger (Fase M).
- **Servidor (`orvalis-servidor`)**: a v0.83.0 mudou a muralha da cidade (só Tijolo de Pedra) e tirou receitas; o servidor só
  acompanha na próxima sincronização do pacote (`npm run build:net` aqui + `npm run sync-net` lá). Sem pressa: não muda
  o protocolo nem o que o jogador vê (a cidade é gerada no aparelho; os blocos aposentados seguem definidos nos dois lados).
- **Hospedagem** ✅ no ar em `https://orvalis.pensamentos.online` (Hostinger, provisório; publica a cada merge em
  `main` — ver `OPERATIONS`). Depois, domínio próprio do Orvalis (não maiamapps).
- **Arte**: mais NPCs (folha 4×4 pronta + retrato, `docs/domains/npc.md`); outros ofícios (guarda, mercador, estalajadeiro); guardas, ferreiro, mercadores; (opcional) aranhas por direção e heroína levando dano, árvores/água 3/4, nuvem contínua.

## 5. Riscos e dívidas técnicas
- **Orçamento de início (ADR 0013)**: ~2,0 MB de 3 MB desde a v0.74.0 (folhas de personagem só baixam quando o ator
  aparece; antes ~3,06 MB, sem folga). Próximos a ir para segundo plano quando crescer: arte de cidades/dungeons novas
  (carregar ao se aproximar).
  Hospedagem própria (CDN/domínio) usa o mesmo `dist/`.
- `ActionController` (465 linhas) vai crescer com vida/dano: separar combate (golpe, dano) em módulo próprio na Fase 1.
- Canvases do chão em 2× (`TEX_RES`) custam ~4 MB por chunk em cache; reduzir em celulares fracos se preciso.
- Monstros sempre atualizados (~39 no labirinto): ok hoje; com várias dungeons, atualizar só os próximos.
- Pipeline de brilho (`glowColor`) sem uso desde a remoção dos blocos mágicos (mantido para tochas/vaga-lumes).
- iPhone/Safari: sem tela cheia/trava de orientação no navegador (limitação da plataforma).
