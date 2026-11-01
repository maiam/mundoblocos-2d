# Estado atual

_Atualizado em 2026-11-01 — v0.3.0_

## Funcional
- **Vista superior inclinada (3/4)**: chão plano + objetos-cubo com face superior e frontal, árvores altas,
  ordenação por profundidade (linha) entre objetos e personagem.
- **Pilhas de até 2 cubos**; a personagem sobe 1 nível por vez (chão → 1 → 2) e desce livremente, com
  transição suave. Montanhas geradas têm 1 e 2 níveis e viram terreno escalável.
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
- Altura limitada a 2 níveis de cubo; não há queda com dano nem pulo.
- Transições entre tipos de chão são em degrau (sem blending).
- Água estática.

## Qualidade
- `npm test`: 17 testes (world + player) passando. `npm run build` limpo.
