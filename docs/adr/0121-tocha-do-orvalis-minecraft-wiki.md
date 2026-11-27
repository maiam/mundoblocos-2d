# ADR 0121 — Tocha do Orvalis, pela Minecraft Wiki (auditoria #33)

**Status:** Aceita e implementada (v0.188.0). Proposta enviada ao dono do produto; aprovada em 27/11/2026: Tocha **de parede junto**, **Tocha primeiro** (a luz do céu, #32, vem depois, nos dois mundos) e **receita da Wiki** (depois da Fornalha e do Carvão Vegetal, ADR 0120).

## Wiki (página "Torch", edição Java)
Bloco não sólido, sem colisão, luz 14; dureza 0 (quebra na hora, com qualquer coisa, e solta a si mesma); receita: carvão ou carvão vegetal + graveto → 4; coloca-se no topo ou na lateral da maioria dos blocos sólidos (face inteira firme; não sobre folhas); solta-se quando o apoio some; chuva não apaga.

## Decisão
- **Blocos 145–149** (`T.TORCH` em pé; `T.TORCH_WALL`…`_270` de parede, o giro no id = a direção da chama, `ladderFacing`): `isTorch`/`isWallTorch`/`wallTorchTurn`/`wallTorchId` (nunca ids soltos). Não sólidos (`isSolid` falso, sem colisão), alvo da mira (`isTarget`), **não bloqueiam luz**, `TORCH_LIGHT` = **14** em `lightLevelOf`, dureza 0 (`breakTotalMs` = só os 200 ms do gesto), som de areia. Item **85 "Tocha"** (pilha de 64; devolve a mesma Tocha qualquer que seja o bloco).
- **Colocação** (`placeFromSlot`): pela face de cima, precisa de topo firme (`torchTopSupport`: sólido, não folha, topo cheio); por uma lateral, de **cubo inteiro** que não seja folha (`torchSideSupport`); pela face de baixo, não. **Cascata** (`releaseTorches`, ao quebrar um bloco): a tocha em pé de cima e as de parede presas a ele caem como item solto; a que está presa a outro bloco fica. (A água destruir a tocha, da Wiki, não existe: o lago não flui.)
- **Receita `tocha`:** 1 Carvão Vegetal + 1 Haste → **4 Tochas**, na fabricação pessoal (a grade 2 × 2 da Wiki), só no Orvalis.
- **Aparência** (`render/tochaModel.ts`, sem arquivo de modelo): o sprite de 16 × 16 do pacote P2-11 vira malha extrudada (regra visual de itens, ADR 0097) com a textura do **atlas de itens**: em pé = dois planos cruzados a 90° (0,7 × o sprite); de parede = um plano só, a parte baixa colada na parede e a ponta inclinada para fora. A textura da tocha de parede ocupa a **célula 86 do atlas, que não é item** (`isItem(86)` falso). Duas novas espécies de instância (`ModelKindName` 'tocha' e 'tochaParede'); brilho próprio `TORCH_GLOW`. Caixa de mira `TORCH_BOX` (`models.ts`).
- **Atlas de itens 4 × 22** (88 células, 86 em uso; ampliado em `make-titan-arte32.py`, `ITEM_ROWS` e o CSS); `itens.json` ganha 85 e 86.
- **Mantido fora:** Tocha das Almas, de cobre e de redstone (a arte existe no pacote P2-11, sem regra de mundo); chuva não apaga (Wiki).

## Consequências
Pacote da sala muda (blocos, item, receita, regras de apoio): o servidor precisa do `sync-net` desta versão; protocolo e save não mudam. Testes: `orvalis/tocha.test.ts` (8); limites de item nos testes antigos passam de 83/85 para 86. Conferido no navegador (tochas em pé e de parede à noite, ícone na bolsa).
