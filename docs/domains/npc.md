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

## Monstros
- Aranhas da dungeon: ver `domains/dungeon.md` (`game/monster.ts`).

## Gerência (`game/entities.ts`)
- Formação de pares, início/fim do namoro (ordem: concluir → parear → iniciar) e nascimento ficam aqui;
  `Sheep` guarda estado (apaixonada, espera, par, namoro, idade) e movimento.
- `actors` gera a lista para o render (o par namorando vira um único ator `sheep-love`).
- Rebanho inicial de até 4 ovelhas a 2–8 células do spawn, em grama andável, posições determinísticas pela seed.
- Colisão entre entidades: não se entra na caixa de outra; se já estavam sobrepostas, podem se afastar.
- Estado de execução, não persistido (some ao recarregar; renasce igual pela seed).
