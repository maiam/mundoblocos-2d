# ADR 0067 — Titã: durabilidade das ferramentas (v0.124.0)

**Status:** Aceita. Contexto: regra do dono do produto no modelo do Minecraft (contador inteiro de desgaste no próprio item, quebra e estilhaço ao chegar no máximo, custos por uso correto e impróprio, barra de cor na hotbar). Resolve a pendência "decidir durabilidade" das ADR 0063 e 0065.

## Decisão
1. **Contador no item** (`Stack.wear`, pontos usados de 0 a `maxDurability`; ausente = intacta): só ferramentas (pilha de 1) o têm. `Inventory.damage(slot, pontos)` soma ao contador; ao chegar no máximo o item **quebra** (o espaço esvazia). Fonte de verdade dos números: `titan/wear.ts` (`MAX_DURABILITY`, `wearCost`, `durabilityRatio`, `durabilityHue`; puro, sem sorteio).
2. **Durabilidade máxima** (provisória): rocha = **131** (a pedra do Minecraft; Picareta e Adaga de Rocha), cobre = **190** (entre a pedra e o ferro; Picareta e Adaga de Cobre).
3. **Custo por ação** (como no Minecraft): picareta quebrando bloco −1; **adaga quebrando bloco −2** (uso impróprio); adaga golpeando inimigo −1; **picareta golpeando inimigo −2**; recolhimento instantâneo (lanterna, Marco, Painel; "dureza 0") não gasta. `breakOrCollect` desgasta a ferramenta do espaço escolhido em todo bloco quebrado (`wearHeldTool`); o combate da etapa 4 chama `wearHeldTool(s, { type: 'attack' })`.
4. **Quebra**: o item some, a mensagem diz "<ferramenta> quebrou" (`ActionResult.broken`) e toca `playToolBreak` (estalo e estilhaços sintetizados).
5. **Persistência**: `header.inventory` grava `[item, count, wear]` (3º valor só quando há desgaste; `Inventory.fromData` descarta desgaste inválido, fora do limite ou em item sem durabilidade, sem subir `TITAN_SAVE_VERSION`); a pilha solta ao morrer (`Drop.wear`) e a recolhida levam o desgaste junto; trocar de espaço mantém o desgaste.
6. **Interface**: barra sob o ícone na hotbar e na bolsa (`.titan-dur`), **escondida enquanto a ferramenta está intacta**, matiz de verde (120°) a vermelho (0°) pela razão restante; o rótulo do item na mão e o `aria-label` mostram `restante/máximo`.

## Fora do escopo (não existem no Titã)
Encantamentos (Inquebrável, Remendo), Bigorna e reparo juntando duas ferramentas iguais na grade; armadura e escudo. Sem `Math.random()` aqui: sem Inquebrável a regra é determinística.

## Consequências
- Pendências: calibrar 131/190; decidir se haverá reparo (juntar duas ferramentas iguais: soma o restante + 5 % do máximo); ferramenta nova entra em `MAX_DURABILITY` e em `TOOLS`.
- Testes: `desgaste.test.ts` (+5).
