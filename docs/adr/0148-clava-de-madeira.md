# ADR 0148 — Clava de Madeira do Orvalis (auditoria #52, v0.225.0; o item do Grunho, fabricável)

**Estado:** aceita (28/11/2026). Ciclo da ADR 0116 cumprido (o dono escolheu dano 5 e durabilidade 59, receita 3 tábuas + 2 hastes, e 25% de chance de o Grunho soltá-la). **Ressalva de fonte:** a `minecraft.wiki` não abriu; o Minecraft não tem clava. Referências de espelhos, a confirmar: espada de madeira (dano 4, durabilidade 59, 2 tábuas + 1 graveto), machado de madeira (arma pesada e lenta; de memória 3 tábuas + 2 gravetos; números não achados na busca) e a maça (só com Núcleo Pesado e Vara de Brisa: não serve de molde).

## Estado antes
Armas do Orvalis: espada de madeira (4) e de pedra (5, ADR 0145), punho 1; item de lâmina gasta 1 por golpe e 2 por bloco; sem recarga de ataque. O Grunho (ADR 0147) abatido não soltava nada.

## Decisão
1. **Item 177, Clava de Madeira**, só do Orvalis; novo `ToolKind` `'club'` (pergunte `isClub`, nunca ids soltos), pilha de 1.
2. **Dano 5** (`WEAPON_DAMAGE`; pesada: acima da espada de madeira, igual à de pedra), **durabilidade 59** (`MAX_DURABILITY`), desgaste como a espada (golpe −1, bloco −2, instantâneo 0).
3. **Receita** na Mesa de Carpintaria: **3 tábuas de carvalho + 2 hastes** (a lista de ingredientes; sem a disposição em coluna da Wiki).
4. **Espólio do Grunho (revoga "não solta nada" da ADR 0147):** **25 %** de chance (`GRUNHO.dropChance`) de soltar 1 Clava de Madeira nova ao ser abatido; o sorteio é determinístico (`grunhoDrops`: seed, goblin e instante do abate) e a clava cai no chão da sala ou do aparelho (`restDrop`, id `m:<goblin>:<n>`).
5. **Arte:** a ilustração do dono (1254 × 1254) vira o ícone de 32 px por `make-orvalis-espadas.py` (agora também a clava) em `arte32/itens.json`; na mão, o sprite extrudado de sempre.
6. **Atlas de itens 4 × 45 (180 células)**: o 177 passou de 176; `ITEM_ROWS`, o CSS e `make-titan-arte32.py` foram ampliados. **Sobram os ids 178 a 180**; acima disso, amplia de novo.

## Fora desta entrega
A clava na mão do modelo 3D do Grunho já existe (é parte do modelo); recarga de ataque, golpe crítico, a Wiki oficial (confirmar dano e receita) e uma clava de pedra.
