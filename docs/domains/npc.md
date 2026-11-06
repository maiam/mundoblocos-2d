# Domínio: NPCs (game)

## Ovelha (`game/sheep.ts`) — primeiro NPC
- Folha `assets-src/sheep-sheet.png` → `src/assets/sheep.webp` (comando em `OPERATIONS.md`; a sombra do
  desenho é mais escura, por isso limiares próprios). Desenhada com ~1,25 célula de altura.
- `Walker` com velocidade 1,3 célula/s, caixa 0,6 × 0,34, **stepHeight 0**: não sobe em cubos, então blocos
  servem de cerca. Água, buracos e árvores bloqueiam (via `World.standHeight`).
- Comportamento: alterna **parada** (1,5–5 s) e **passeio** (1–3,5 s, direção aleatória, ritmo 60–100%,
  desacelera no fim). Se travar por 0,3 s, volta a parar. A mais de 7 células de casa, o próximo passeio
  aponta para casa.
- **Comer e reproduzir**: trigo → apaixonada por 25 s (coração flutuando). Duas apaixonadas a até 6 células
  formam par, andam uma até a outra (desviando de obstáculos simples) e, a 1,5 célula, **namoram** por 3,6 s
  (folha `sheep-love.webp`, 4 etapas com corações). Ao fim nasce um **filhote** entre elas; os pais ficam 45 s
  sem poder comer. Limite de 16 ovelhas.
- **Filhote** (`lamb.webp`, ~0,9 célula): mais rápido e menor; vira adulto em 120 s. Não come trigo.

- **Golpe de espada**: a ovelha (adulta ou filhote) atingida some do mundo; par/namoro da outra é desfeito
  (`Entities.removeAnimal`). Animação de morte fica para quando houver arte.

## Wanderer (`game/wanderer.ts`)
- Passeio comum (parar ↔ andar numa direção sorteada, desacelerar no fim, voltar a casa além da `leash`). Ovelha,
  cavalo e morador estendem `Wanderer` (que estende `Walker`) e só mudam o ritmo (`WanderPace`) e a caixa.

## Animais do campo: cavalo, vaca, galinha (`game/horse.ts` → `FarmAnimal`)
- Um tipo (`FarmKind`) com ritmo próprio (`FARM`): vaca lenta (0,9; leash 8), galinha miúda e ligeira (1,3;
  leash 6). `Entities.spawnAnimals(world, kind, x, y, n, salt)`: 2 vacas ~9 células a oeste do portão e 4 galinhas
  perto, posições pela seed. Folhas `assets-src/animals/{cow,chicken}.png` (`process-sprite.py --alpha --largest`,
  `--frame-h 112` e `96`), desenhadas com 1,35 e 0,85 célula. Só passeiam; leite e ovos: NEXT_STEPS.

### Cavalo
- Folha `assets-src/horse-sheet.png` → `horse.webp` (`process-sprite.py --alpha --largest --frame-h 112`), desenhado
  com 1,6 célula. Velocidade 1,8, não sobe em cubos, leash 10. Um cavalo (`Entities.spawnHorse`) no campo ao sul do
  portão, ~9 células a leste do rebanho, em grama, posição pela seed. O golpe o tira do mundo, como as ovelhas.
  Estado de execução (não salvo). Montaria: ideia em NEXT_STEPS.

## Moradores (`game/villager.ts`)
- **Personagem-base + roupa**: cada morador é uma folha de roupa branca (`villager-<cabelo>`: blond, brown, black,
  silver, red) e uma roupa (`outfit-<id>`: denim, varsity, farmer, vest, hoodie; ofício: smith) desenhada por cima no mesmo quadro (`Actor.outfit`,
  `render/character.ts`). `scripts/extract-villagers.py` processa todas as folhas com a mesma grade, recorte e escala
  e apaga a cabeça careca das folhas de roupa (acima do queixo vale a cabeça do personagem).
- **Expressões** (`EXPRESSIONS`, 16, ordem das folhas `assets-src/expressions/expressions-<front|left|right>-sheet.png`):
  rosto em camada sobre o personagem-base (`expr-<id>`), franja de cada cabelo redesenhada por cima
  (`villager-<cabelo>-bangs`) e efeitos fora do rosto (`expr-<id>-fx`: assustado, bravo, sonolento). Gerados por
  `extract-villagers.py` (calibração `CALIB` medida uma vez por sobreposição; deslocamento por quadro da caminhada por
  semelhança). Repouso sorteado pela seed (`villagerExpression`, só as tranquilas); ofício tem a sua (`ROLE_LOOK`);
  ao falar (`speak`) mostra uma de conversa por 3 s. Limitação: nos perfis de cabelo escuro sobram manchinhas de pele
  na franja (a folha careca vem de outro molde).
- **Ofícios têm visual único** (regra do dono do produto, `ROLE_LOOK`): personagem-base e roupa do ofício não se
  repetem em nenhum outro morador. **Ferreiro = cabelo preto (`black`) + roupa `smith`**. Os moradores comuns usam os
  personagens livres (`TOWNSFOLK_BASES`: blond, brown, silver, red — um de cada) e uma roupa sorteada pela seed entre as
  `CASUAL_OUTFITS` (`villagerOutfit`). **Roupa nova**: folha em `assets-src/villagers/outfit-<id>-sheet.png` → rodar o script → id em
  `CASUAL_OUTFITS` (ou só em `OUTFITS`, se for de ofício) → import em `render/art/principal.ts`. Folha sem
  transparência (fundo claro) é limpa pelo script (`remove_bg`).
- Pontos de casa fixos (praça inicial ×2, meio do caminho até o castelo, pátio do castelo; ferreiro dentro da Ferraria); andam só por células de
  rua/praça da cidade (`TownLayout.street`) acima do portão — nunca saem da muralha. Velocidade 1,4, leash 6.
- O golpe não os atinge (`strikeTargets` ignora moradores). **Falam ao toque** (`Villager.speak`; clique sobre o
  morador ou botão de ação com ele à frente): moradores revezam dicas; ofício tem fala própria e atende do outro lado
  do balcão (alcance 3,2). Estado de execução (não salvo).
- **Ferreiro** mora no interior da Ferraria (`InteriorLayout.keeper`, ADR 0014): anda só no chão do cômodo, nas
  linhas do ofício; sem interior (mundo sem cidade), volta para a frente da porta.

## Monstros
- Aranhas da dungeon: ver `domains/dungeon.md` (`game/monster.ts`).

## Gerência (`game/entities.ts`)
- Formação de pares, início/fim do namoro (ordem: concluir → parear → iniciar) e nascimento ficam aqui;
  `Sheep` guarda estado (apaixonada, espera, par, namoro, idade) e movimento.
- `actors` gera a lista para o render (o par namorando vira um único ator `sheep-love`).
- Rebanho inicial de até 4 ovelhas a 2–8 células de um ponto 8 células ao sul do portão da cidade (`World.outsideGate`), em grama andável, posições determinísticas pela seed.
- Colisão entre entidades: não se entra na caixa de outra; se já estavam sobrepostas, podem se afastar.
- Estado de execução, não persistido (some ao recarregar; renasce igual pela seed).
