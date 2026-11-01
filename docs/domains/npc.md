# Domínio: NPCs (game)

## Ovelha (`game/sheep.ts`) — primeiro NPC
- Folha `assets-src/sheep-sheet.png` → `src/assets/sheep.png` (`process-sprite.py ... 96 23 128`; a sombra do
  desenho é mais escura, por isso limiares próprios). Desenhada com ~1,25 célula de altura.
- `Walker` com velocidade 1,3 célula/s, caixa 0,6 × 0,34, **stepHeight 0**: não sobe em cubos, então blocos
  servem de cerca. Água, buracos e árvores bloqueiam (via `World.standHeight`).
- Comportamento: alterna **parada** (1,5–5 s) e **passeio** (1–3,5 s, direção aleatória, ritmo 60–100%,
  desacelera no fim). Se travar por 0,3 s, volta a parar. A mais de 7 células de casa, o próximo passeio
  aponta para casa.
- **Sem interação com o personagem** por enquanto (apenas colisão física entre entidades).

## Gerência (`game/entities.ts`)
- Rebanho inicial de até 4 ovelhas a 2–8 células do spawn, em grama andável, posições determinísticas pela seed.
- Colisão entre entidades: não se entra na caixa de outra; se já estavam sobrepostas, podem se afastar.
- Estado de execução, não persistido (some ao recarregar; renasce igual pela seed).
