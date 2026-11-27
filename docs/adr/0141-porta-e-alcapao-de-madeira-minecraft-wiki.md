# ADR 0141 — Porta e Alçapão de madeira do Orvalis (auditoria #46, W3, v0.212.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido na ADR 0139 (aprovação "Sim. Pode seguir": W1 → W2 → W3, receitas da Wiki, botão e placa de pressão adiados). Fontes: [Door](https://minecraft.wiki/w/Door), [Trapdoor](https://minecraft.wiki/w/Trapdoor), [Planks](https://minecraft.wiki/w/Planks).

## Wiki
Porta de madeira: 2 blocos de altura, 3 px de espessura, dobradiça no lado escolhido, porta dupla acompanha a vizinha; alçapão: placa de 3 px na metade de baixo ou de cima do bloco, ou de pé rente à borda quando aberto; ambos abrem com o toque (sem redstone aqui). Rendimentos: porta 6 tábuas → 3; alçapão 6 → 2 (espelho de terceiros, **não confirmados**; dureza 3 **de memória, não conferida** na página principal).

## Decisão (W3)
1. **A porta de madeira usa o sistema da Porta de Junco (ADR 0102), não uma cópia:** os mesmos 5 bits de estado (giro, aberta, dobradiça, metade) em **três famílias novas de 32 ids** (carvalho, cerejeira e bétula = 280–375; `doorBits`, `doorFamily`, `doorId(…, family)`); `placeDoor`/`breakDoor`/`useDoor`, a dobradiça automática, a porta dupla e a animação da folha servem às quatro famílias. Quebrar devolve a porta **da própria madeira**.
2. **Alçapão = ids 376–423** (`TRAPDOOR + madeira × 16 + giro + 4 aberto + 8 metade de cima`), 1 célula, caixa de 3/16 (embaixo, em cima ou de pé rente à borda −Z no giro 0, `trapdoorBoxes`); a metade vem da face clicada (face de baixo de um bloco ou metade de cima de uma lateral = cima); abre e fecha por `useDoor`, recusando se o corpo está na caixa nova. `T_MAX` = 423.
3. **Itens 168–173** (portas e alçapões das 3 madeiras), ícones do pacote (sprite 16 × 16 extrudado); atlas de itens **4 × 44** (176): item novo é o **174**. Receitas na Mesa de Carpintaria. Dureza 3 e machado; som de rocha (dívida: timbre de madeira).
4. **Modelos e arte:** `make-orvalis-porta-madeira.py` gera a tira 192 × 16 (por madeira: frente | verso | borda | alçapão) e `titan-porta-madeira.json` (3 portas e 9 alçapões). **A arte da porta do pacote é a porta inteira desenhada em 16 × 16** (a Wiki usa 16 × 32): a folha de 1 × 2 m a usa **esticada em y**, cortada pela caixa útil (as margens transparentes). A arte tem pixels transparentes dentro da folha (uma "janelinha"): o material usa `alphaTest` e eles aparecem **vazados** no jogo — fiel à arte; se não for a intenção, é ajuste da arte, não do código.
5. Renderer: `isDoorKind` (a de junco + `WOOD_DOOR_KINDS`), um único material de madeira (`DoubleSide`, `alphaTest`) para portas e alçapões, `doorIndex` com o tipo de cada folha. Sem mudança de gerador, save ou protocolo (a sala usa `useCell` → `isOpenable`).

## Consequências
Fecha as famílias W1–W3 do que a Wiki chama de madeira "de construção". Ficam: botão e placa de pressão (adiados: sem redstone); estante, placa suspensa e placa com texto (fora do escopo); o alçapão não serve de escada e não anima (muda de estado na hora); porta de madeira sem janela configurável.
