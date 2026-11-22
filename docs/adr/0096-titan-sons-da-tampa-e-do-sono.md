# ADR 0096 — Titã: sons da tampa do baú e do sono (v0.157.0)

**Status:** Aceita. Fecha a pendência de som do ADR 0093 (a tampa e o véu do sono eram mudos).

## Decisão
1. **Quatro sons sintetizados** em `titan/gameAudio.ts` (Web Audio, sem arquivos; mesmo `tone`/`burst`/`safe` dos outros): `playChestOpen` (serra grave filtrada que sobe devagar, um rangido de trama de junco, e um estalo seco no fim), `playChestClose` (batida surda de rocha com um rastro curto), `playSleepDown` (duas notas graves e macias que afundam enquanto a tela escurece) e `playWake` (três notas suaves que sobem, como um amanhecer, e um sopro agudo baixinho).
2. **Quando tocam, por regras puras e testadas:** `lidSound(antes, agora)` (`titan/lid.ts`) devolve `'open'`/`'close'` só na **transição** do painel do baú (o jogo guarda `lidWasOpen` a cada quadro), então abrir, fechar pelo botão, sair do alcance ou trocar de estação soam uma vez cada; `sleepCue(msAntes, msAgora)` (`titan/sleep.ts`) dá `'down'` quando o véu começa a escurecer e `'wake'` quando começa a clarear (`SLEEP_WAKE_MS`), cada um uma única vez por sono. A tampa e o sono continuam só no renderer e na UI; nada no save.

## Consequências
- Sem mudança de regra, de save, de gerador nem de protocolo. O contexto de áudio só é liberado dentro de um gesto (`unlock()`, ADR 0054): o som do sono sai depois do toque no botão, então toca.
- Pendências: calibrar volumes e timbres no aparelho real (foram escritos por ouvido sintético, sem escuta); ressonar contínuo durante o véu ficou de fora de propósito (a noite passa em ~2 s).
- Testes: `lid.test.ts` (+2: transições da tampa e dicas do sono, duas por sono). Conferido a 740 × 360 que abrir o baú e dormir seguem sem erro de página; os sons em si não foram ouvidos nesta sessão.
