# Estado atual

_Atualizado em 2026-11-01 — v0.10.0_

## Funcional
- **Vista superior inclinada (3/4)**: chão plano + objetos-cubo com face superior e frontal, árvores altas,
  ordenação por profundidade (linha) entre objetos e personagem.
- **Pilhas de até 2 cubos**; a personagem sobe 1 nível por vez (chão → 1 → 2) e desce livremente, com
  transição suave. Montanhas geradas têm 1 e 2 níveis e viram terreno escalável.
- **Cavar o chão**: célula vazia + quebrar → buraco intransponível; só um bloco novo o preenche, virando piso.
- **Botão de ação (em teste)** no celular: toque usa, segurar 2 s quebra o bloco à frente; alvo com contorno
  quando a personagem está parada; mostra o item selecionado ou a mão. Espaço faz o mesmo no desktop.
- **Ferramentas** (espada, enxada, picareta, pá, machado) na hotbar (1–5): selecionar equipa e a heroína anda
  com ela nas 4 direções. Ainda sem ação própria.
- **Cultivo de trigo**: semente plantada na terra cresce em 16 estágios (~1,5 min); colher (segurar 2 s) solta
  trigo + sementes que a personagem coleta. Inventário com contador na hotbar (começa com 5 sementes e 2 trigos).
- **Ovelhas comem trigo e se reproduzem**: apaixonadas (coração) → par → namoro animado → filhote, que cresce.
- **Primeiro NPC: ovelhas** — rebanho de até 4 perto do spawn, pastando e passeando (4 direções animadas),
  sem subir em cubos, com colisão entre entidades. Ainda sem interação do personagem.
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
- **Sempre na horizontal**: no celular, o 1º toque pede tela cheia e trava em paisagem (onde o navegador
  permite: Android/Chrome); em retrato, a camada "Gire o aparelho" bloqueia o jogo (cobre iOS/iframes).
  PWA instalável abre em tela cheia e paisagem. Controles compactos em paisagem de pouca altura.
- **Tela limpa**: só a hotbar na parte inferior (+ joystick em telas de toque). Sem painéis de informação/botões.
- Interação pelo mouse: clique curto coloca; segurar 2 s quebra (rachaduras + anel de progresso); alcance de 4,5
  células; hotbar 1–9; atalhos de depuração G (chunks) e T (tempo).
- Versão jogável publicada como Artifact (ver `OPERATIONS.md`).

## Limitações conhecidas
- iPhone/Safari no navegador não oferece tela cheia para páginas nem trava de orientação: lá vale a camada de
  rotação (ou instalar na tela inicial). Dentro do Artifact (iframe) a tela cheia pode ser recusada.
- O toque que ativa a tela cheia também conta como ação de colocar bloco.
- Edições, inventário, plantações e ovelhas não são persistidos; NPCs existem só perto do spawn.
- Sob a folha de trigo resta um filete claro da sombra original do desenho.
- Altura limitada a 2 níveis de cubo; não há queda com dano nem pulo.
- Transições entre tipos de chão são em degrau (sem blending).
- Água estática.

## Qualidade
- `npm test`: 40 testes (world + player) passando. `npm run build` limpo.
