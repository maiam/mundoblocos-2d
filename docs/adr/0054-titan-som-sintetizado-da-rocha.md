# ADR 0054 — Titã: som da rocha sintetizado na hora

**Status:** aceito (proposta do dono do produto, 19/11/2026: "sintetizar o som em tempo real usando a Web Audio API", com o código-base de `rockAudio.ts`). Primeiro som do Titã.

## Decisão
1. **Síntese, sem arquivos de áudio** (`src/titan/rockAudio.ts`, `RockSoundSynthesizer`): golpe seco (`playRockHit(progresso)`: triângulo de ~130–175 Hz caindo a 42 Hz em 55 ms + estalo de ruído em banda ~1,8 kHz) e quebra (`playRockBreak()`: serra de 145 Hz a 34 Hz em 110 ms, três rajadas de estilhaços defasadas em 0, 25 e 55 ms e o corpo grave de ruído passa-baixa em 260 Hz). Variação aleatória de tom e do ponto de partida do ruído a cada som. Ruído branco de 1 s gerado uma vez; **ganho mestre de 0,6** para vários golpes seguidos sem estourar.
2. **Quando soa** (`titanGame.ts`): a cada **250 ms** (`HIT_INTERVAL_MS`) enquanto a rocha racha, com o progresso 0–1 subindo o tom; e **ao concluir a quebra**. Só a família da rocha (`isRockSound`: rocha escura, veio de rocha, laje, Mesa de Trabalho). **Areia, gelo, brasa, lanterna e lascas ficam em silêncio** por enquanto.
3. **Liberação no iOS/Safari:** o som só é liberado dentro de um gesto; `unlock()` cria e retoma o `AudioContext` no primeiro `pointerdown`/`keydown` da janela (o golpe só viria 200 ms depois, já fora do gesto). Sem Web Audio ou com erro, vira silêncio e nada lança.
4. Código só de navegador (`AudioContext`), fora de `src/world/`; `Math.random()` aqui é som, não regra de jogo, então não afeta o determinismo do mapa.

## Consequências
- Sem botão de mudo ainda (próximo passo). Sons de areia, gelo, colocar, passos e a lanterna ficam para as próximas rodadas, no mesmo sintetizador.
