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

## Cavalo (`game/horse.ts`)
- Folha `assets-src/horse-sheet.png` → `horse.webp` (`process-sprite.py --alpha --largest --frame-h 112`), desenhado
  com 1,6 célula. Velocidade 1,8, não sobe em cubos, leash 10. Um cavalo (`Entities.spawnHorse`) no campo ao sul do
  portão, ~9 células a leste do rebanho, em grama, posição pela seed. O golpe o tira do mundo, como as ovelhas.
  Estado de execução (não salvo). Montaria: ideia em NEXT_STEPS.

## Moradores (`game/villager.ts`)
- **Personagem-base + roupa**: cada morador é uma folha de roupa branca (`villager-<cabelo>`: blond, brown, black,
  silver) e uma roupa (`outfit-<id>`: denim, varsity) desenhada por cima no mesmo quadro (`Actor.outfit`,
  `render/character.ts`). `scripts/extract-villagers.py` processa todas as folhas com a mesma grade, recorte e escala
  e apaga a cabeça careca das folhas de roupa (acima do queixo vale a cabeça do personagem).
- Roupa sorteada pela seed (`villagerOutfit`); um morador por personagem-base. **Roupa nova**: folha em
  `assets-src/villagers/outfit-<id>-sheet.png` → rodar o script → id em `OUTFITS` → import em `render/art/principal.ts`.
- Pontos de casa fixos (praça inicial ×2, meio do caminho até o castelo, pátio do castelo); andam só por células de
  rua/praça da cidade (`TownLayout.street`) acima do portão — nunca saem da muralha. Velocidade 1,4, leash 6.
- O golpe não os atinge (`strikeTargets` ignora moradores). Sem falas ainda. Estado de execução (não salvo).

## Monstros
- Aranhas da dungeon: ver `domains/dungeon.md` (`game/monster.ts`).

## Gerência (`game/entities.ts`)
- Formação de pares, início/fim do namoro (ordem: concluir → parear → iniciar) e nascimento ficam aqui;
  `Sheep` guarda estado (apaixonada, espera, par, namoro, idade) e movimento.
- `actors` gera a lista para o render (o par namorando vira um único ator `sheep-love`).
- Rebanho inicial de até 4 ovelhas a 2–8 células de um ponto 8 células ao sul do portão da cidade (`World.outsideGate`), em grama andável, posições determinísticas pela seed.
- Colisão entre entidades: não se entra na caixa de outra; se já estavam sobrepostas, podem se afastar.
- Estado de execução, não persistido (some ao recarregar; renasce igual pela seed).
