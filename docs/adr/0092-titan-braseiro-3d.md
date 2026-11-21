# ADR 0092 — Titã: Braseiro de Rocha em 3D, apagado e aceso (v0.153.0)

**Status:** Aceita. Fecha a rodada "Itens do Abrigo" do Drive (escada, baú, cama, balde, braseiro 3D). Segue o padrão de modelo instanciado do Baú (ADR 0089) sobre o bloco com estado do Braseiro (ADRs 0065 e 0068).

## Decisão
1. **Mesmos ids, modelo novo:** `T.BRAZIER` (25, apagado) e `T.BRAZIER_LIT` (26, aceso) continuam os blocos de sempre; `modelOf` devolve `braseiro` e `braseiroAceso` (sem giro: a base é quadrada). A troca apagado ↔ aceso já era feita por `tickFurnaces` (`volume.set`), e o `updateLight` move a instância de um modelo para o outro. Nada muda em `session.furnaces`, `header.furnaces`, receita, painel nem estação (`stationMet`).
2. **Altura própria, como o baú:** o modelo tem 0,935 × 0,935 m e **0,774 m** de altura (`BRAZIER_HEIGHT`, `BRAZIER_SIZE`). `blockSpan` barra o corpo até essa altura, `isFull` o exclui (não esconde as faces vizinhas nem serve de parede para a Escada), e `isModelBlock` o tira da malha do terreno. A mira acerta a caixa do modelo (`modelBox`, ramo de `raycast` ao lado de baú e cama): o raio rente acima de 0,774 m passa por cima. Pergunte `isBrazier`/`modelOf`, nunca compare ids.
3. **Aceso:** o GLB soma 126 triângulos de brasas (três cores lisas) ao basalto. No jogo o aceso ganha **brilho fixo por instância** (`EMBER_GLOW` 0,55 no `iGlow`, o mesmo atributo da luz de lanterna), então as brasas e a cuba aparecem de dia e de noite. **Não emite luz no mapa** (a luz de lanterna segue só da lanterna): fica como pendência.
4. **Atlas e malha:** o GLB de jogo 1K (≈ 2,1 MB cada, textura de 1K) é convertido por `scripts/extract-titan-braseiro.py` (Blender) **sem decimar** (1.068 e 1.194 triângulos): `titan-braseiro.json` (161 KB), `titan-braseiro-aceso.json` (185 KB) e um atlas único de 256 × 320 px sem perdas (`titan-braseiro-atlas.webp`, 58 KB): 256 linhas de basalto e uma faixa com três amostras lisas para os UVs das brasas.
5. **Na mão:** o item deixa de ser "bloco cúbico" (não é mais cubo inteiro) e passa a sprite extrudado (`flat`, ADR 0087), como o baú e a cama. Os tiles `17-braseiro-de-rocha/*` do atlas de terreno ficam **sem uso** (a ordem do atlas não pode mudar); só uma regeneração futura do atlas os tira.

## Consequências
- Sem mudança de gerador nem do formato do save (o mesmo bloco, a mesma carga).
- Pendências: o braseiro aceso emitir luz de bloco; partículas de fagulha; ícone final do item; aceite no toque real (mira na caixa menor); balde e cama 3D na mão seguem como sprite.
- Testes: `braseiro3d.test.ts` (+3: regras do bloco, caixa da mira, mira no topo e troca de instância ao acender); `extrude.test.ts` ajustado (braseiro agora item plano). Conferido a 740 × 360: apagado e aceso lado a lado, o aceso com brasas brilhando de noite, a mira acompanhando o modelo e o botão "Usar".
