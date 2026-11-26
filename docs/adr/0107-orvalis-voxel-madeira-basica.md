# ADR 0107 — Orvalis em voxel: madeira básica (tábuas, haste e Mesa de Carpintaria) — v0.174.0, entrega E1

**Status:** Aceita. Segunda entrega do pacote Texturas16px (fila no `NEXT_STEPS`; decisão do dono do produto: tudo, uma entrega por vez, com PR e merge a cada uma).

## Decisão
- **Regras do Minecraft:** 1 tora → **4 tábuas**; 2 tábuas → **4 hastes**; 4 tábuas → **1 Mesa de Carpintaria**. O catálogo de receitas não tem "qualquer tábua", então há **uma receita por madeira** (carvalho, cerejeira, bétula): 9 receitas, todas de estação `personal` (valem na mochila). Tag de ingrediente ("qualquer tábua") fica como evolução registrada.
- **Blocos 100–106** (`T`): `PLANKS_OAK/CHERRY/BIRCH` (100–102) e `CARPENTRY` (103–106: **4 ids, o giro no id**; a frente fica voltada para quem a coloca, como o baú — `carpentryTurnFacing`). `T_MAX` = 106. Tiles novos no fim de `tiles.json` (`orvalis/tabua-*`, `mesa-topo`, `mesa-frente`, `mesa-lateral`; atlas de 16 px e de 8 px). **Face própria:** a frente da mesa tem arte própria por `tileForFace(id, face, normal)` (a malha usa no caminho geral; a base é de tábuas).
- **Itens 52–56:** tábuas ×3, `HASTE` (item sem bloco, sprite 16 × 16 extrudado, ADR 0097: `arte16/itens.json`), `MESA_CARPINTARIA`. Atlas de itens **4 × 14** (56 ids). Ícones de bloco = cubo isométrico gerado (a mesa com a frente na lateral esquerda).
- **A Mesa de Carpintaria é bancada** como a Mesa de Trabalho: `isCraftingTable(id)` (= `isWorkbench || isCarpentry`) decide estação em `titanGame.ts` (`benchAimed`, alcance, fechar fora de alcance). Só a do Titã é modelo 3D. As duas coexistem; as receitas de estação `workbench` valem em qualquer uma.
- **Receitas por mundo:** `Recipe.world?: 'orvalis'` (ausente = Titã). O livro de receitas mostra só as do mundo aberto (`gen.world`): o Orvalis não vê a Mesa de Trabalho de rocha escura nem a lanterna; o Titã não vê as de madeira. Descoberta: madeira na mochila revela as pessoais (`'mesa'`); a Mesa de Carpintaria na mochila revela as de bancada (`'bancada'`). Avisos de descoberta próprios do Orvalis.
- Quebra: tábuas e mesa cedem em 1 s (como a tora); som provisório de rocha (falta o de madeira).

## Consequências
- Sem mudança de gerador, de save (ids novos passam em `T_MAX`) nem de protocolo. Testes: `orvalis/madeira.test.ts` (receitas por madeira, grade 3 × 3, itens ↔ blocos, giro e face da frente, bancada, descoberta, receitas por mundo, tempos); 3 testes antigos com contagens fixas (tiles, receitas, `isItem`) ajustados.
- Pendências: tag "qualquer tábua"; som de madeira; a mensagem "Precisa da Mesa de Trabalho" ainda vale para a Mesa de Carpintaria; sala online (receitas por mundo na `TitanRoom`); o machado e as demais ferramentas (E4) exigirão esta mesa.
