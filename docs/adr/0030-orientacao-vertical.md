# ADR 0030 — Vertical no celular e no tablet (opção do jogador)

- **Status:** aceita (v0.93.24). **Substitui** a regra "jogo horizontal" de `CONVENTIONS.md` e a camada "Gire o aparelho".
- **Data:** 2026-11-13
- **Relaciona:** ADR 0028 (escala), ADR 0026 (render).

## Contexto
O jogo travava a orientação em paisagem (`screen.orientation.lock('landscape')` onde dava) e, em retrato, cobria a tela com "Gire o aparelho".
Com 14 células na altura (escala Core Keeper) e ~360 px de altura do celular deitado, cada célula tinha ~28 px e o personagem ~33 px: pequeno.
Em pé o aparelho tem ~800 px de altura: o mesmo critério dá células ~55% maiores.

## Decisões
- **A orientação é escolha do jogador**: o jogo funciona nas duas e não trava nem avisa. Vale para celular e tablet.
- **`ScreenMode`**: continua pedindo tela cheia no primeiro toque, mas **sem travar a orientação**; sem camada de rotação (some `blocked`). Passa a expor
  `isPortrait` e a escrever `data-orientation` (`portrait`/`landscape`) e `data-device` (`phone`/`tablet`/`desktop`) em `<html>`.
- **Câmera**: em pé (altura > largura) a largura mínima é `PORTRAIT_MIN_CELLS_WIDE` = 8 células (o limite passa a ser a largura); deitado, 7 como antes.
  Em pé no celular: ~8 × 17 células no Santuário, ~48 px por célula (antes ~28 px deitado).
- **HUD vertical (CSS)**, para `orientation: portrait` e largura ≤ 900 px: a hotbar quebra em linhas (`width: max-content` + `flex-wrap`; cabem todos os
  espaços sem rolar de lado), joystick e botão de ação se posicionam **acima da hotbar** pela altura real que o HUD publica na variável CSS `--hotbar-h`
  (`ResizeObserver` em `hud.ts`), assim como a caixa de conversa; minimapa menor. No tablet em pé, espaços e controles maiores. A horizontal não muda.

## Consequências
- Quem joga em pé vê menos mundo na largura (~8 células contra ~28–30 deitado) e mais na altura; a exploração e a construção ganham legibilidade.
- Painéis largos (bolsa, baú, receitas, profissões) ainda não têm versão em coluna: abrem como antes e podem ficar apertados em pé (pendência).
- O combate lateral fica menos confortável em pé; por isso é opção, não padrão.
