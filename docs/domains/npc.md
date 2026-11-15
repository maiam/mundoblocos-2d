# Domínio: NPCs (game)

## Ovelha (`game/sheep.ts`) — primeiro NPC
- Folha `assets-src/sheep-sheet.png` → `src/assets/sheep.webp` (comando em `OPERATIONS.md`; a sombra do
  desenho é mais escura, por isso limiares próprios). Desenhada com ~1,25 célula de altura.
- `Walker` com velocidade 1,3 célula/s, caixa 0,6 × 0,34, **stepHeight 0**: não sobe em cubos, então blocos
  servem de cerca. Água, buracos e árvores bloqueiam (via `World.standHeight`).
- Comportamento: alterna **parada** (1,5–5 s) e **passeio** (1–3,5 s, direção aleatória, ritmo 60–100%,
  desacelera no fim). Se travar por 0,3 s, volta a parar. A mais de 7 células de casa, o próximo passeio
  aponta para casa.
- **Segue quem deu a comida** (v0.74.0): enquanto está com o coração (e sem par), o animal segue quem o alimentou
  (`Breeder.leader`, para a 1,6 célula). Quando o coração acaba, a "casa" do passeio passa a ser onde ele ficou — dá
  para levar os animais até um cercado. Vaca solta leite e galinha solta ovo ao comer (`ANIMAL_PRODUCE`).
- **Comer e reproduzir**: trigo → apaixonada por 25 s (coração flutuando). Duas apaixonadas a até 6 células
  formam par, andam uma até a outra (desviando de obstáculos simples) e, a 1,5 célula, **namoram** (coraçõezinhos,
  como os outros animais). Ao fim nasce um **filhote** entre elas; os pais ficam 45 s
  sem poder comer. Limite de 16 ovelhas.
- **Filhote** (`lamb.webp`, ~0,9 célula): mais rápido e menor; vira adulto em 120 s. Não come trigo.

- **Golpe de espada**: a ovelha (adulta ou filhote) atingida some do mundo; par/namoro da outra é desfeito
  (`Entities.removeAnimal`). Animação de morte fica para quando houver arte.

> **Plano de inteligência (ADR 0034; nível 1 do Bento feito na v0.93.111 — `game/npcBrain/schedule.ts`, estados no `Villager`):** níveis 1–4 (rotina, reativo, memória, objetivos) sem LLM; piloto no Bento; mais moradores por recolor + sorteio. Ver `docs/adr/0034-inteligencia-dos-npcs.md`.

## Moradores sorteados (`game/residents.ts`, v0.93.113, ADR 0034)
- Além dos 16 nomeados: **8 na cidade e 5 na vila**, "primos" dos 13 moradores comuns. `makeResidents(seed, 'town'|'village', n, avoidNames)` (puro) devolve `ResidentDef` {base, name, profession, personality, look, lines}; mesma seed = mesmas pessoas; nomes únicos no mundo.
- **Cores:** `Look {hue, sat, val}` → `Actor.look` → `uRecolor` no shader do billboard (gira matiz e ajusta sat/brilho de tudo menos pele e neutros). Sem arte nova nem peso extra. O retrato da conversa é o da folha-base (a cor do cabelo no retrato é a original).
- **Execução:** `Entities.spawnResidents` (depois de `spawnVillagers`); `Villager(…, resident)` usa nome/falas do sorteado; `npc` = folha emprestada. Cidade: ruas; vila: dentro do muro, pontos nos caminhos. Só no aparelho (a sala não simula moradores). Sem rotina de dormir ainda (só o Bento).

## Reação mínima (v0.93.114, ADR 0034 nível 2)
- Morador parado, à vista e fora de conversa, a até `NOTICE_RANGE` da jogadora (`entities.ts`) vira-se para ela (`Villager.faceTo`). Cumprimento, fuga de perigo e Guarita: NEXT_STEPS.

## Wanderer (`game/wanderer.ts`)
- Passeio comum (parar ↔ andar numa direção sorteada, desacelerar no fim, voltar a casa além da `leash`). Ovelha,
  cavalo e morador estendem `Wanderer` (que estende `Walker`) e só mudam o ritmo (`WanderPace`) e a caixa.

## Animais do campo: cavalo, vaca, galinha (`game/horse.ts` → `FarmAnimal`)
- Um tipo (`FarmKind`) com ritmo próprio (`FARM`): vaca lenta (0,9; leash 8), galinha miúda e ligeira (1,3;
  leash 6). `Entities.spawnAnimals(world, kind, x, y, n, salt)`: 2 vacas ~9 células a oeste do portão e 4 galinhas
  perto, posições pela seed. Folhas `assets-src/animals/{cow,chicken}.png` (`process-sprite.py --alpha --largest`,
  `--frame-h 112` e `96`), desenhadas com 1,35 e 0,85 célula. Leite e ovos: NEXT_STEPS.
- **Reprodução (v0.60.0)**: mesmo ciclo da ovelha (`game/breeder.ts`), pelo alimento da espécie (`ITEMS[item].feeds`):
  vaca = trigo, galinha = semente de trigo, cavalo = cenoura. Só pareiam com a mesma espécie; limite `MAX_PER_SPECIES`
  (cavalo 6, vaca 10, galinha 12). Filhotes **potro**, **bezerro**, **pintinho** (`BABY_KIND`; folhas
  `assets-src/animals/{foal,calf,chick}.png`, desenhados com 1,1 / 0,95 / 0,6 célula) crescem em 3 dias de jogo
  (`FARM_GROW_UP_SECONDS`).
- **Namoro (v0.61.0, todas as espécies)**: parados de frente; os coraçõezinhos (`love-hearts`, 16 quadros) sobem entre
  os dois por `COURTSHIP_SECONDS` (2,6 s), maiores no cavalo e menores na galinha (`LOVE_SCALE`); o filhote nasce no fim.

### Cavalo
- Folha `assets-src/horse-sheet.png` → `horse.webp` (`process-sprite.py --alpha --largest --frame-h 112`), desenhado
  com 1,6 célula. Velocidade 1,8, não sobe em cubos, leash 10. (v0.93.91: ovelhas, vacas, galinhas e capivaras nascem na Vila Camponesa, `Entities.spawnVillageAnimals`.) Um cavalo (`Entities.spawnHorse`) no campo ao sul do
  portão, ~9 células a leste do rebanho, em grama, posição pela seed. O golpe o tira do mundo, como as ovelhas.
  Estado de execução (não salvo). Montaria: ideia em NEXT_STEPS.

## NPCs da cidade (`game/npcs.ts`, `game/villager.ts`) — quem é quem
Desde a v0.92.0 os moradores são **16 NPCs nomeados**, cada um com **folha própria** (`npc-<id>`, `assets-src/npcs/<id>.png`),
falas próprias e retrato na caixa de conversa. **Nomes e falas moram só em `game/npcs.ts`** (fonte única); a tabela abaixo
é a lista de nomes:

| Nome | Id (arquivo) | Quem é | Aparência |
|---|---|---|---|
| **Black** | `npc-black` | Ferreiro — mora na Ferraria (o antigo "Ferreiro") | cabelo preto, avental de couro |
| **Dante** | `npc-dante` | Arquivista da cidade | cabelo metade branco, metade preto; colete cinza |
| **Silvano** | `npc-silvano` | Herbalista | cabelo verde-claro; túnica bege e bolsa |
| **Morgan** | `npc-morgan` | Estudioso do castelo | cabelo roxo-escuro; casaco roxo |
| **Aurélio** | `npc-aurelio` | Cortesão sorridente | cabelo branco, olhos fechados; casaco azul-marinho |
| **Rubem** | `npc-rubem` | Aventureiro | cabelo vermelho; jaqueta marrom |
| **Rosendo** | `npc-rosendo` | Jardineiro e **florista** — mora na Floricultura (v0.93.110, papel `florist`; vende as 15 Flores Fofas) | cabelo rosa; colete verde |
| **Teodoro** | `npc-teodoro` | Pescador alegre | cabelo castanho-claro, olhos fechados; camisa azul |
| **Bento** | `npc-bento` | Padeiro e **mercador** (v0.93.57: mora no Mercado, atrás dos balcões; tocar nele abre a loja) | cabelo castanho-escuro; colete marrom |
| **Solano** | `npc-solano` | Construtor | cabelo loiro-alaranjado; camisa laranja |
| **Nilo** | `npc-nilo` | Tratador de cavalos | cabelo castanho bem escuro, olhos fechados; colete marrom |
| **Marlon** | `npc-marlon` | Marinheiro | cabelo azul-petróleo; colete marinho e lenço |
| **Lavínio** | `npc-lavinio` | Sonhador | cabelo lavanda; camisa lilás |
| **Caio** | `npc-caio` | Caçador | cabelo preto; túnica verde |
| **Noel** | `npc-noel` | Guarda da muralha | cabelo azul-marinho; colete vinho e gravata |
| **Leandro** | `npc-leandro` | Viajante | cabelo loiro; camisa azul |

Os nomes de Dante a Leandro foram escolhidos pelo assistente (o dono do produto mandou só as folhas): **troque à vontade**
em `game/npcs.ts` (`name`) — nada mais depende do nome. As falas também são provisórias (2 por NPC, em roda, sobre as
regras que existem hoje).

- **Black** é o antigo ferreiro (renomeado; folha = composição do morador-base preto + expressão + roupa de ferreiro antigos,
  `assets-src/npcs/black.png`). Mora dentro da Ferraria, atrás do balcão (`InteriorLayout.keeper`); atende de até 4,4 células.
- Os outros 15 passeiam só por ruas e praças dentro da muralha (`TownLayout.street`), perto de um ponto de casa:
  praça inicial ×2, meio do caminho até o castelo, pátio do castelo e os demais em células de rua sorteadas pela
  posição a pelo menos 16 células umas das outras (`homesFor`). A cidade é igual em toda seed, então os lugares também.
- **Conversa** (`Villager.conversation()` → `DialogueBox`): tocar no NPC (clique, ou botão de ação/Espaço com ele à frente, a
  até 1,8 célula) abre a **caixa de conversa** (`game/dialogue.ts`, abaixo). Ele para e se vira para a personagem
  até a conversa fechar (`release()`). Cada toque conta a próxima fala, em roda.
- **NPC novo**: folha 4×4 em `assets-src/npcs/<id>.png` → `process-sprite.py` e `make-portraits.py` (OPERATIONS) → entrada em
  `NPCS` (`game/npcs.ts`) → import em `render/art/principal.ts` (`npc-<id>` e `portrait-<id>`) e `SPECS` (`render/character.ts`).
- Não há mais expressões, roupas em camada nem personagens-base (removidos na v0.92.0, junto com `extract-villagers.py`).

## Caixa de conversa (`game/dialogue.ts`, v0.92.0)
- Moldura da arte do dono do produto (`assets-src/dialogo-moldura.png`, recortada e sem o nome/rosto de exemplo →
  `dialogo-moldura.webp`): **retrato** no círculo (cabeça recortada do quadro de frente do NPC, `make-portraits.py` →
  `portrait-<id>`), **nome** na plaquinha e **texto** dentro da caixa. Aparece no centro da tela, embaixo e acima da grade
  (a câmera sobe um pouco para o NPC ficar à vista); largura pela tela (≤ 620 px) e respeita a safe-area.
- **Páginas**: o texto é dividido pelo que cabe (`paginate`, mede o DOM); a **setinha ▼** (animada) aparece quando há mais.
  Avançar: tocar na caixa, clicar no mundo, botão de ação, Espaço ou Enter; na última página, fecha. Esc fecha.
- Fecha sozinha se a personagem se afasta (> 3,2 células; 4,4 no ferreiro), leva dano ou abre um painel (menu, bolsa, habilidades).
- A moldura e os retratos só baixam na primeira conversa (fora do orçamento de início). Só interface local: não passa pela
  sala nem mexe em protocolo de mensagens de conversa.

## Monstros
- Aranhas da dungeon: ver `domains/dungeon.md` (`game/monster.ts`).

## Gerência (`game/entities.ts`)
- Formação de pares (por espécie), início/fim do namoro (ordem: concluir → parear → iniciar) e nascimento ficam aqui;
  `Breeder` (base de `Sheep` e `FarmAnimal`) guarda estado (apaixonada, espera, par, namoro, idade) e movimento.
- `actors` gera a lista para o render (o casal namorando aparece de frente e ganha o ator `love-hearts` entre os dois).
- Rebanho inicial de até 4 ovelhas a 2–8 células de um ponto 8 células ao sul do portão da cidade (`World.outsideGate`), em grama andável, posições determinísticas pela seed.
- Colisão entre entidades: não se entra na caixa de outra; se já estavam sobrepostas, podem se afastar.
- Estado de execução, não persistido (some ao recarregar; renasce igual pela seed).
- **Na sala do multiplayer** (ADR 0021): os animais e os monstros são da sala (o servidor roda estas mesmas `Entities`,
  com os jogadores como `avatars`); o aparelho fica em `remote` e o `CreatureMirror` espelha o que a sala manda.
  Dar comida passa pela sala (`ActionController.onFeed` → `feed`/`fed`). Moradores continuam locais. Os animais da sala
  ficam salvos no servidor (`saveAnimals`/`restoreAnimals`, v0.73.0).
