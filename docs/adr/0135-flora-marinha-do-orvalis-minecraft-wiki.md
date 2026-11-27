# ADR 0135 — Flora marinha do Orvalis: erva marinha, alga e alga seca (auditoria #14 E3a, v0.204.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ([Ocean](https://minecraft.wiki/w/Ocean), [Ocean biomes](https://minecraft.wiki/w/Ocean_biomes), [Seagrass](https://minecraft.wiki/w/Seagrass), [Kelp](https://minecraft.wiki/w/Kelp)) → estado atual → proposta → aprovada nos 5 pontos (divisão E3a/E3b, plantas contam como água, mar morno-ameno, coral sem Toque de Seda, começar pela E3a). Os corais ficam para a E3b.

## Wiki
Fundo de areia no oceano morno-ameno, com erva marinha e alga; a erva marinha só se planta em bloco opaco com 2 de água em cima; a alga só na água, cresce com 14 % por tique aleatório, solta a si mesma e, assada, vira alga seca (1 de fome; combustível de 20 itens). A altura máxima da alga e a densidade exata não foram confirmadas.

## Decisão
1. **Blocos 154–159:** Erva Marinha (154), Erva Marinha Alta em duas células (155 base, 156 topo), Alga (157 corpo, 158 ponta) e Bloco de Alga Seca (159, cubo comum, dureza 0,5, tile `alga-seca`).
2. **As plantas contam como água** (`isWaterPlant`/`isLiquidCell`, `voxel.ts`): não são sólidas, mas a física (`b.inLiquid`, `waterLedge`), o mergulho (`eyesSubmerged`), os itens soltos (`drops.ts`), a luz do céu (classe "filtro") e `TitanVolume.remove` (a água ocupa o lugar da planta removida) as tratam como líquido. Elas nunca ocupam a célula da superfície (Y = 63), então a malha do lago não muda.
3. **Modelos instanciados** (`render/floraModel.ts`): dois planos cruzados com a textura do atlas de itens (células 115 e 119–122; as quatro últimas **não são itens**), `alphaTest` e dois lados. Os blocos da base do gerador entram no registro de modelos quando a seção é malhada (`TitanVolume.registerModelCell`, chamado por `meshSection`), porque os modelos editados entram por `set`.
4. **Gerador v5** (`ORVALIS_GENERATOR_VERSION` 5, `floraBlock`/`FLORA`): sobre o fundo de areia com 2+ blocos de água acima do piso, erva marinha em 20 % das colunas (alta em 40 % delas com 3+ de água) e alga em 5 % com 5+ de água (altura 3 a 12, no máximo a profundidade − 2). **Adaptação:** o mar do Orvalis é tratado como mar morno-ameno; as densidades são nossas. Seeds novas mudam o fundo do mar; saves da v4 ficam como estão.
5. **Itens 115–118:** Erva Marinha, Alga (plantam-se dentro da água, sobre piso firme e com água acima, `placeWaterPlant`), Alga Seca (comida 1/0,6, combustível de 200 s) e Bloco de Alga Seca (combustível de 2000 s; o limite de queima do save passa de 800 a 2000 s). **Atlas de itens 4 × 31.** Receitas: alga assa em alga seca (fornalha), 9 alga seca = 1 bloco e o inverso.
6. **Quebrar** (`releaseWaterPlants`): a planta solta o próprio item (adaptação: a Wiki exige tesoura para a erva marinha, que o Orvalis não tem); sem o piso ou sem a alga de baixo, as plantas empilhadas caem; quebrar a metade de cima da erva alta leva as duas.

## Consequências
Sem mudança de save nem de protocolo (a sala é só do Titã); a geração v5 só vale para partidas novas. Pendentes: **crescimento da alga por tique (14 %)** e a erva marinha por farinha de osso, tesoura, alga seca como combustível nos testes de fornalha, e a **E3b (corais)**. Testes: `orvalis/floraMarinha.test.ts`; conferido no navegador (erva marinha alta e baixa desenhadas sob a água).
