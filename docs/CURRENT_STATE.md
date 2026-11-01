# Estado atual

_Atualizado em 2026-11-01 — v0.2.0_

## Funcional
- **Vista superior inclinada (3/4)**: chão plano + objetos-cubo com face superior e frontal, árvores altas,
  ordenação por profundidade (linha) entre objetos e personagem.
- **Heroína jogável** (sprite 4 direções × 4 quadros), ~2,2 células de altura; colisão com objetos sólidos e água.
- **Câmera** sem rotação, zoom automático (~10 células na vertical, ajustável), acompanhamento suave da
  posição lógica — sem balanço de caminhada.
- **Joystick virtual** alinhado às direções da tela (+ WASD/setas).
- Mundo por seed (`?seed=`) em chunks 16×16 nos dois eixos, carregados/descarregados sob demanda.
- Geração: elevação → água/praia/montanhas (pedra, carvão, ouro, cristal de mana), rios, 5 biomas
  (Tundra com lagos congelados, Campos, Sakura, Floresta Encantada, Dunas), manchas de floresta, arbustos,
  pedregulhos, enfeites. Spawn em bioma acolhedor; o clima é deslocado por seed.
- Render: chão com variações, barrancas e espuma nas margens, grade sutil, sombras projetadas, brilho de
  água, sombras de nuvens, ciclo dia/noite (8 min), halos mágicos, partículas por bioma.
- Interação: quebrar/colocar com alcance de 4,5 células, hotbar 1–9, overlay de chunks (G), tempo (T).
- Versão jogável publicada como Artifact (ver `OPERATIONS.md`).

## Limitações conhecidas
- Edições não são persistidas.
- Sem altura de terreno (montanhas são paredes de blocos; não há subir/descer).
- Transições entre tipos de chão são em degrau (sem blending).
- Água estática.

## Qualidade
- `npm test`: 13 testes (world + player) passando. `npm run build` limpo.
