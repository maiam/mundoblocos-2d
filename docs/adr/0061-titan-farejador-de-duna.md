# ADR 0061 — Titã: Farejadores de Duna (v0.118.0)

**Status:** Aceita. Contexto: pacote de arte do dono do produto (Drive, pasta "Farejador de Duna": GLB low-poly de 3.538 triângulos, atlas, concept e high-poly de referência), história "O dono da enseada" e a regra do dono do produto: um modelo **pequeno** (½) e um **grande** (1,3×) que passeiam, investem ao avistar o personagem, **caem de costas como um tatu** ao bater e ficam **2 s estonteados** antes de nova investida; o pequeno dá menos dano que o grande. Completa a ADR 0060.

## Decisão
1. **Toca no gerador v5** (`TitanGenerator.den`, no centro da enseada de plantas de Noz de Duna). A v5 ainda não tinha sido publicada em `main`, então foi estendida sem criar a v6; partida v4 ou anterior não tem toca nem animais.
2. **Dois tamanhos do mesmo modelo** (`KINDS` em `titan/creature.ts`): **pequeno** escala 0,5, dano 2 (1 coração), vê a 8 m, mais ágil; **grande** escala 1,3, dano 4 (2 corações), vê a 11 m. A escala é **relativa ao modelo do pacote** (1,85 m do focinho à cauda, quase a altura do jogador de 1,8 m), não à altura do modelo (0,70 m). Cada toca tem um grande e um pequeno (`newPack`).
3. **Comportamento** (puro, sem DOM nem `Math.random()`): `wander` (passeia em pontos secos a ≤ 8 m da toca, farejando) → `charge` (avistou o viajante no mesmo nível, a ≤ raio de visão e a ≤ 20 m da toca: investida em linha reta, no máximo 1,7 s) → ao bater: `stunned` (cai de costas, parado `stunS` = 2 s, sem andar e sem reagir) → volta a `wander` e investe de novo se ainda vir o viajante. Investida que erra: `return` (volta à toca, pausa de 1,5 s antes de reagir). Nunca persegue além de 20 m da toca. Sem combate: o jogador não os mata nem afugenta.
4. **Física**: andam por `stepBody` (colisão do jogador), em fração da velocidade de caminhada. Estado só de execução (`TitanSession.creatures`), nasce na toca a cada abertura, **não vai no save**.
5. **Desenho** (`scripts/extract-titan-farejador.py`): o GLB vira 7 partes com pivô (tronco, cabeça, cauda e 4 patas) e atlas de 224 × 36 (os 216 × 36 do pacote + 4 colunas de cor sólida: olhos e narinas viram um texel). Sem rig: cada parte gira em torno do pivô (`farejadorPose`: passo em diagonais, cabeça farejando, galope na investida, **rolagem de costas** em torno do eixo do comprimento com patas e cabeça balançando no atordoamento). `TitanRenderer.setFarejadores`; modelo voltado para −X (`facingYaw`).
6. **Som**: `playScrape` (raspar de pata, sintetizado) no início da investida.

## Consequências
- Pendências: toca visual (pilha de cascas abertas), aceite em celular/iPad do ritmo e do dano, calibrar números, rig real, sombra no chão e luz de lanterna no modelo, e decidir se deve haver combate ou afugentar.
- Testes: `creature.test.ts` (+8).
