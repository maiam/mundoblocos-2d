# ADR 0054 — Titã: som sintetizado na hora (rocha, areia, gelo, ações e passos)

**Status:** aceito (proposta do dono do produto, 19/11/2026: "sintetizar o som em tempo real usando a Web Audio API", com o código-base de `rockAudio.ts`). Primeiro som do Titã.

## Decisão (v0.109.0, só rocha; generalizada na extensão abaixo)
1. **Síntese, sem arquivos de áudio** (`src/titan/rockAudio.ts`, `RockSoundSynthesizer`): golpe seco (`playRockHit(progresso)`: triângulo de ~130–175 Hz caindo a 42 Hz em 55 ms + estalo de ruído em banda ~1,8 kHz) e quebra (`playRockBreak()`: serra de 145 Hz a 34 Hz em 110 ms, três rajadas de estilhaços defasadas em 0, 25 e 55 ms e o corpo grave de ruído passa-baixa em 260 Hz). Variação aleatória de tom e do ponto de partida do ruído a cada som. Ruído branco de 1 s gerado uma vez; **ganho mestre de 0,6** para vários golpes seguidos sem estourar.
2. **Quando soa** (`titanGame.ts`): a cada **250 ms** (`HIT_INTERVAL_MS`) enquanto a rocha racha, com o progresso 0–1 subindo o tom; e **ao concluir a quebra**. Só a família da rocha (`isRockSound`: rocha escura, veio de rocha, laje, Mesa de Trabalho). **Areia, gelo, brasa, lanterna e lascas ficam em silêncio** por enquanto.
3. **Liberação no iOS/Safari:** o som só é liberado dentro de um gesto; `unlock()` cria e retoma o `AudioContext` no primeiro `pointerdown`/`keydown` da janela (o golpe só viria 200 ms depois, já fora do gesto). Sem Web Audio ou com erro, vira silêncio e nada lança.
4. Código só de navegador (`AudioContext`), fora de `src/world/`; `Math.random()` aqui é som, não regra de jogo, então não afeta o determinismo do mapa.

## Consequências
- Sem botão de mudo ainda (próximo passo). Sons de areia, gelo, colocar, passos e a lanterna ficam para as próximas rodadas, no mesmo sintetizador.

## Extensão (v0.110.0): sintetizador unificado
Proposta do dono do produto (`gameAudio.ts`) no lugar do sintetizador só da rocha (`rockAudio.ts` removido):
1. **`titan/gameAudio.ts`** (`GameSoundSynthesizer`, mesma base: sem arquivos, ruído de 1 s reaproveitado, ganho mestre 0,6, `unlock()` no primeiro gesto, silêncio sem Web Audio) cobre **rocha, areia e gelo** (golpe seco `playHit`/quebra `playBreak`), **colocar bloco por material** (`playBlockPlace`), **lanterna** (`playLanternPlace`/`playLanternPickup`), **coleta de item/lasca** (`playItemPickup`) e **passos** (`playFootstep`). `muted` silencia tudo.
2. **Regras puras** em `titan/sounds.ts` (testáveis): `surfaceOf(bloco)` — rocha: escura, veio, laje, rocha-mãe e mesa; areia: ocre e úmida; gelo: fosco, veio e brasa de âmbar; ar, líquido e lanterna em silêncio — e `FootstepClock` (um passo a cada **2,4 blocos** percorridos **no chão e fora do líquido**; parado ou no ar não soa).
3. **Ligação** (`titanGame.ts`): golpe seco a cada 250 ms durante as rachaduras; quebra ao concluir; colocar (som pelo item posto, lanterna à parte); recolher lanterna e lasca (gesto) e coleta por proximidade (`playItemPickup`); passo com o timbre do bloco sob os pés (`vol.get` em `floor(y − 0,01)`).
4. **Botão "Som: ligado/desligado"** no menu (canto superior direito), lembrado neste aparelho (`localStorage`, que pode falhar sem afetar o jogo); religar toca um "pop" de confirmação.

