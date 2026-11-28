# ADR 0150 — Vidro do Orvalis (auditoria #53, v0.230.0)

**Estado:** aceita (28/11/2026). Ciclo da ADR 0116 cumprido: o dono aprovou **só o Vidro transparente**, **sem soltar nada ao quebrar (como a Wiki)**, **receita Areia na Fornalha em 10 s** e **não trocar já os alçapões das janelas das casas**. **Ressalva de fonte:** a `minecraft.wiki` não abriu; números de espelhos, a confirmar.

## Wiki (espelhos)
Vidro: dureza 0,3, quebra no mesmo tempo com qualquer ferramenta e não solta nada (só com Toque Suave); não atenua a luz; feito fundindo Areia na fornalha (200 ticks); tingido = 8 vidros + corante; vidraça = 6 vidros → 16.

## Estado antes
Sem bloco translúcido: o mesher só tinha a malha opaca e a de líquido. Areia (item 12 do Orvalis = `Item.BEACH`) e Fornalha já existiam; sem corantes nem Toque Suave.

## Decisão
1. **Bloco 425 (`T.GLASS`, `T_MAX`) e item 178 (`Item.VIDRO`)**, só do Orvalis; pergunte `isGlass`, nunca ids soltos. Cubo sólido (`isFull`, colisão e mira normais), **`blocksLight` falso** (`!isGlass`): a luz do céu e a de bloco passam sem perder nível (`skyKind` 0).
2. **Malha translúcida à parte (`SectionMesh.glass`)** com o atlas de terreno: o renderer a desenha com `glassMat` (`transparent`, sem escrever profundidade; troca de atlas na isométrica junto com a opaca). Regras de face no mesher: a face do vidro aparece se o vizinho não é vidro nem cubo opaco (`blocksLight`); o cubo, laje ou esteira vizinhos **mostram a face através do vidro** (`isGlass(nb)`); entre dois vidros a face some.
3. **Quebra:** dureza 0,3 em `HARDNESS` (sem ferramenta certa, qualquer uma); **não solta nada** (`breakOrCollect`, como o minério de carvão sem picareta); timbre de rocha (sem som de vidro ainda).
4. **Receita:** `vidro` na estação `furnace` (1 Areia → 1 Vidro; `COOK_TIME_S` 10 s); só no Orvalis (`world: 'orvalis'`), não no Braseiro do Titã.
5. **Na mão:** o cubo da mão é opaco e desenharia o vidro preto; `heldBlockOf` exclui o vidro e ele vira **item plano** (sprite extrudado do ícone de 32 px).
6. **Arte:** `orvalis_vidro_transparente_32x32.png` (pacote do Drive, 32 px, alfa 154 no miolo e moldura) é o tile `orvalis/vidro` (no fim de `tiles.json`) e o ícone do item 178 (`arte32/itens.json`, atlas de itens ainda 4 × 45: o 179 é o próximo item e o 180 o último antes de ampliar). O pacote inteiro (fosco, 13 tingidos, 14 vidraças) está guardado em `assets-src/orvalis-voxel/vidro/`, sem uso.

## Consequências
Sem mudança no mapa (as casas seguem com alçapões nas janelas), no protocolo nem no save (id novo, `TITAN_SAVE_VERSION` igual). Pendentes: ordenação das faces translúcidas dentro de uma seção (vidro atrás de vidro pode piscar), som de vidro, cerca/mureta ligando-se ao vidro (hoje a cerca liga: `isFull`), fosco, tingidos (precisam de corante), vidraças (forma fina), vidro nas janelas das casas (Costa v103 se o dono quiser).
