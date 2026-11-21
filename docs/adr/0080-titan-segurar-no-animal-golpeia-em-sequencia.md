# ADR 0080 — Titã: segurar no animal golpeia em sequência e o animal em movimento não cancela o gesto (v0.139.0)

**Status:** Aceita. Relato do dono do produto: com a adaga, segurar apontando para um bloco repete o golpe, mas **no Farejador a adaga não dá dano**. Causas (ADR 0042 + 0069): o animal não "quebra" (`breakTotalMs('creature') = null`), então segurar além de 200 ms **cancelava** o gesto sem golpear (só o toque curto golpeava); e, como o gesto comparava a **célula** do alvo, um animal que anda (a célula muda a cada passo) cancelava o toque curto antes de soltar.

## Decisão
1. **O mesmo animal, não a mesma célula** (`gesture.ts`, `sameCell`/`sameFace`): para alvos `kind: 'creature'` a identidade é o índice do animal (`item`), não `(x, y, z)`. O toque curto passa a valer com o bicho andando.
2. **Estado `ATTACKING`**: segurar no animal por 200 ms golpeia na hora e **continua golpeando em sequência** enquanto o dedo/botão estiver sobre ele; o gancho `place` (o `strike` do `titanGame`) aplica a pausa de 0,6 s entre golpes, então o gesto só chama a cada quadro. Trocar de animal segue no novo; sair da mira ou arrastar mais de 10 px (câmera) encerra; soltar não dá golpe extra.
3. **Balanço da mão**: cada golpe dispara o seu balanço (`swingHand`, 0,3 s) no ritmo da pausa; o ciclo repetido por segurar (`acting`) continua só para quebrar bloco.

## Consequências
- No toque (dedo ou mira central) e no mouse, segurar sobre o Farejador bate de 0,6 em 0,6 s (adaga de rocha: 4 de dano). Conferido a 740 × 360 com emulação de toque: 100 → 80 de vida em 2,7 s, cinco golpes.
- Pendências: aceite em aparelho; som e efeito de acerto no animal.
- Testes: `gesture.test.ts` (+3: animal em movimento, repetição, troca/saída/arrasto).
