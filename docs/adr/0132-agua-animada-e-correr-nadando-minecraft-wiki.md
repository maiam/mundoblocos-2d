# ADR 0132 — Água animada do Orvalis e correr nadando (auditoria #14, v0.201.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ([Water](https://minecraft.wiki/w/Water), [Swimming](https://minecraft.wiki/w/Swimming), [Damage](https://minecraft.wiki/w/Damage)) → estado atual (`titan/physics.ts`, `underwater.ts`, `useBucket`) → proposta → aprovada: correr nadando (sim), fluxo e fonte infinita adiados (sim), E1 primeiro.

## Wiki
Pular nada para cima; quem não nada afunda devagar; agachar afunda mais rápido; correr nadando mergulha na direção do olhar (fome > 6); a água de qualquer profundidade anula o dano de queda; afogamento em 15 s, 2 de dano por segundo. Velocidades exatas, fluxo, fonte infinita e itens na água não foram confirmados.

## Decisão
1. **Mantido** o que já batia: queda anulada, afogamento, pulo de saída (ADR 0099), itens afundando (ADR 0098).
2. **Correr nadando** (`MoveInput.pitch`, `SWIM_SPRINT_FACTOR` = 1 = velocidade de caminhada, adaptação: a Wiki não traz o valor confirmado): na água, com `sprint` (já exige `canSprint`, fome > 6) e olhar, o corpo segue a direção do olhar, para cima e para baixo; o horizontal encolhe com o cosseno do olhar. Sem `pitch` (isométrica) ou sem `sprint`, nada muda. Agachar a afundar fica pendente (não há agachar).
3. **Fluxo e fonte infinita: adiados** para um ADR próprio (muda o motor); a água corrente do pacote fica só importada.
4. **E1, água animada** (só visual): o atlas da água do Orvalis passa a ter **8 quadros** (`orvalis-agua-16px.webp` 64 × 128, `-8px` 32 × 64; uma linha de 4 células por quadro, topo/topo/lateral/lateral), gerados por `scripts/make-orvalis-agua.py` do pacote "Água, rios e mares" (Drive). O renderer lê os quadros pela proporção da imagem (`titan/liquidFrames.ts`: `liquidRowsOf`, `LIQUID_FRAME_S` 0,4 s, `liquidRowOffset`) e desloca o UV em V; o alfa vem da arte (opacidade do material 1); o Lago do Titã segue com 2 quadros por deslocamento em U.
5. **Artes importadas** para `assets-src/orvalis-voxel/`: `agua/` (fonte, corrente, margens) e `mar/` (pesca, navegação com 6 GLBs, recifes), **sem uso no jogo** além da água fonte. Itens, blocos, mobs e botes seguem em etapas, cada uma com seu ciclo da Wiki (E2 itens/pesca, E3 oceano e corais, E4 botes).

## Consequências
Sem mudança de save, de gerador nem de protocolo. Teste: `nadarCorrendo.test.ts`, `liquidFrames.test.ts`; conferido no navegador.
