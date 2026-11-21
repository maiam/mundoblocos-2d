# ADR 0093 — Titã: tampa do baú que abre e véu escuro ao dormir (v0.154.0)

**Status:** Aceita. Fecha as pendências visuais dos ADRs 0089 (a tampa não abria) e 0090 (dormir passava a noite sem transição).

## Decisão
1. **Tampa do baú como malha própria.** O GLB traz o corpo, a tampa e um vazio "Dobradiça" atrás do baú. `scripts/extract-titan-bau.py` agora gera **duas peças**: `titan-bau.json` (corpo, 124 triângulos) e `titan-bau-tampa.json` (tampa reduzida pelo Blender a 1.700 triângulos, com os vértices **relativos à dobradiça** e `pivot` = a dobradiça no espaço do baú). O atlas é o mesmo. A peça fechada continua com 0,95 × 0,7305 × 0,956 m (`CHEST_HEIGHT` não muda: mira, física e colisão são do corpo inteiro).
2. **Animação só no renderer:** `ModelKind` ganha `'bauTampa'` (fora de `ModelKindName`: a tampa usa as mesmas células de `'bau'`, `modelCells('bau')`). A matriz da instância é `posição · giro · dobradiça · Rx(−ângulo)`. `TitanRenderer.setOpenChest(célula | null)` diz qual baú está aberto; `animateLids(time)` (a cada `render`) aproxima o ângulo de `LID_OPEN_ANGLE` (1,9 rad ≈ 109°) a `LID_RATE` (5,5 rad/s, ~0,35 s) e só acompanha as tampas em movimento ou abertas (`lidAngles`); fechada, sai do mapa. Regras puras em `titan/lid.ts` (`stepLid`, `lidIdle`, passo limitado a 0,25 s).
3. **Quando abre:** o jogo passa `bagOpen && stationAt.kind === 'chest'` a cada quadro; fechar o painel (ou sair do alcance) fecha a tampa. Nenhum estado novo no save, na sessão nem no baú.
4. **Véu do sono:** `titan/sleep.ts` (puro) descreve a linha do tempo: escurece em 700 ms, a noite passa **no instante em que a tela está preta** (`SLEEP_APPLY_MS`, `useBed` só é chamado então, para o céu não pular à vista), segura 350 ms e clareia em 1,5 s; o controle volta em `SLEEP_CONTROL_MS` (1,65 s). Só à noite (`isNightTime`); de dia continua marcando só o ponto de retorno, sem véu. O véu é `.titan-sleep` (preto, `pointer-events: none`, acima da interface e abaixo do aviso) e, enquanto dura, `active` é falso (sem andar, mirar nem agir). A regra do sono (`useBed`, `WAKE_TICKS`, dias) não mudou.

## Consequências
- Sem mudança de gerador, de save nem de protocolo. O sombreamento por vértice da tampa fica o do modelo fechado (a luz do dia é um uniform: não escurece errado ao girar).
- Pendências: som da tampa e do sono; pose de deitar na câmera; a 360 px de altura o painel cobre o baú (a tampa só se vê em telas maiores); aceite no toque real.
- Testes: `lid.test.ts` (+3: passo e limites da tampa, abertura de ~109°, linha do tempo do véu). Conferido a 740 × 360: a tampa foi a 1,9 rad em ~0,85 s e voltou a 0 ao fechar o painel (sai do mapa); de noite o véu foi a 1, o relógio foi de 0,751 para 0,025 e o dia a 1 com a tela preta, depois o véu voltou a 0.
