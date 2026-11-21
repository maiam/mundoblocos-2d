# ADR 0077 — Titã: tela cheia no toque (margem das bordas e volta imediata) (v0.136.0)

**Status:** Aceita. Relato do dono do produto: no tablet na horizontal, o toque pressionado às vezes tira o navegador da tela cheia e, ao soltar, ela volta (`ScreenMode` pede a tela cheia a cada `pointerup`). Não deu para reproduzir fora de um aparelho real; a causa mais provável é um **gesto de borda do sistema** (voltar pela borda esquerda ou direita, barras do alto e de baixo): os controles estavam a 14 px das bordas, dentro dessas faixas, e a área de ação ia até a borda.

## Decisão
1. **Margem de 36 px** (`--edge`, só no toque, `body.titan-touch-on`) entre as bordas e tudo que se segura: as setas, o botão de pular, a área de ação (`.titan-look`) e o menu do alto (que também desce para 26 px). As setas ficaram em 150 × 100 px (botões de 50) e sobem 12 px para não cobrir a hotbar.
2. **Segurar não abre menu do navegador**: `contextmenu` cancelado em toda a área de toque, e `-webkit-touch-callout`/`user-select` desligados nela.
3. **Volta imediata** (`ScreenMode`, só toque): ao sair da tela cheia **com um dedo na tela (ou levantado há menos de 0,8 s)**, o jogo pede a tela cheia de volta na hora (`fullscreenchange` → `shouldReenter`, pura e testada), enquanto o toque ainda vale como gesto do usuário. Não volta se a saída foi nossa (campo de texto em foco), se a aba ficou escondida ou se não havia toque (quem sai de propósito, pelo gesto de voltar do sistema, não é puxado de volta). O pedido a cada `pointerup` continua.

## Consequências
- O incômodo deve sumir (controles fora das faixas do sistema) e, se o sistema ainda tirar a tela cheia, ela volta em um quadro em vez de só ao soltar. Nenhum dos dois foi verificado em tablet real.
- Pendências: aceite no tablet do relato; se persistir, anotar onde está o dedo, qual navegador (Chrome, Samsung Internet ou Safari) e o modelo; o iPad (Safari) tem regras próprias de tela cheia.
- Testes: asserts novos de `shouldReenter` em `player.test.ts`. Conferido a 740 × 360 com emulação de toque: margens de 36 px e nada sobreposto à hotbar.
