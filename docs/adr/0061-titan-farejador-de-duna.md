# ADR 0061 — Titã: Farejador de Duna (v0.118.0)

**Status:** Aceita. Contexto: pacote de arte do dono do produto (Drive, pasta "Farejador de Duna": GLB low-poly de 3.538 triângulos, atlas, concept e high-poly de referência) e a história "O dono da enseada". Completa a ADR 0060.

## Decisão
1. **Toca no gerador v5** (`TitanGenerator.den`, no centro da enseada de plantas de Noz de Duna). A v5 ainda não tinha sido publicada em `main`, então foi estendida sem criar a v6; partida v4 ou anterior não tem toca nem animal.
2. **Comportamento** (`titan/creature.ts`, puro, sem DOM nem `Math.random()`): `sniff` (fareja e passeia a ≤ 3 m da toca) → `warn` (o viajante a ≤ 9 m: raspa a pata, sem atacar) → `charge` (só se o viajante chega a < 5 m: investida curta de no máximo 1,4 s) → `return` (volta à toca). Uma batida por investida (2 pontos = 1 coração), pausa de 4 s antes de reagir de novo; nunca persegue além de 13 m da toca; recuar além de 11 m acalma o aviso; viajante em outro nível (> 4 m de altura) não o incomoda. Caminho de contorno = o aviso dá tempo de recuar. Não há combate nem como matá-lo.
3. **Física**: o animal anda por `stepBody` (mesma colisão do jogador), em fração da velocidade de caminhada. Estado só de execução (`TitanSession.creature`), nasce na toca a cada abertura, **não vai no save**.
4. **Desenho** (`scripts/extract-titan-farejador.py`): o GLB vira 7 partes com pivô (tronco, cabeça, cauda e 4 patas) e atlas de 224 × 36 (os 216 × 36 do pacote + 4 colunas de cor sólida: olhos e narinas viram um texel). Sem rig: cada parte gira em torno do pivô (`farejadorPose`: passo em diagonais, cabeça farejando, dianteira direita raspando, galope na investida, cauda balançando). `TitanRenderer.setFarejador`; modelo voltado para −X (`facingYaw`).
5. **Som**: `playScrape` (raspar de pata, sintetizado) a cada 0,52 s no aviso e na investida.

## Consequências
- Pendências: toca visual (pilha de cascas abertas), colocar o animal em chunks fora da região, aceite em celular/iPad do ritmo (aviso, investida, dano), calibrar números, rig real (hoje a pose é por partes), sombra no chão e luz de lanterna no modelo.
- Testes: `creature.test.ts` (+8).
