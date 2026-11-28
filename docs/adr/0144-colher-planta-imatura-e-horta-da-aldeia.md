# ADR 0144 — Colher a planta imatura e a horta inicial da aldeia (auditoria #48, v0.215.0)

**Estado:** aceita (28/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ([Crops](https://minecraft.wiki/w/Crops), [Carrot](https://minecraft.wiki/w/Carrot), [Potato](https://minecraft.wiki/w/Potato), [Farmland](https://minecraft.wiki/w/Farmland), [Tutorial:Crop farming](https://minecraft.wiki/w/Tutorial:Crop_farming)) → estado atual → proposta → aprovada ("Pode seguir com a proposta").

## Wiki
Cenoura e batata são a própria semente (plantio direto na terra arada); trigo e beterraba usam sementes. Madura rende 2–5 (artigo principal; o tutorial diz 1–4) e a batata dá 2 % de batata venenosa, que não se planta. Quebrar a planta **imatura** rende só 1 item da própria semente. (A colheita da Wiki destrói a planta; o Orvalis a faz rebrotar, ADR 0113/0129.)

## Estado antes
O plantio direto de cenoura, batata e tomate já existia (ADR 0113, `GARDEN_SEED`) e o rendimento 2–5 também (ADR 0129). Faltava: a planta imatura **não se colhia** ("Ainda está crescendo"), e as cenouras e batatas só vinham da grama (provisório, `wildSeedAt`).

## Decisão
1. **Mantidos:** plantio direto de cenoura, batata e tomate; rendimento 2–5; rebrota da planta madura; batata venenosa fora (sem efeitos no jogo).
2. **Colher a planta imatura da horta** (trigo, cenoura, batata, tomate, beterraba; `collectCrop`): arranca a planta e devolve **1 item da própria semente** (`seedOf`: a cenoura, a batata, o tomate, 1 semente de trigo ou de beterraba); sem lugar na mochila, a planta fica. A **madura** segue rendendo o produto e voltando a broto. Caules (abóbora e melancia) e plantas do junco e da noz seguem como antes ("Ainda está crescendo"). Mesmo código na sala.
3. **Horta inicial na Aldeia da Costa** (`TerrainGen.startCrops`, opcional; `fresh()` as planta): **cenoura no talhão 1 e batata no talhão 2**, em xadrez (metade das células de terra arada), com idades sorteadas pela seed (umas maduras, outras crescendo); o talhão 3 fica livre. É a fonte de cenoura e batata da sala 102 (a partida individual não traz horta pronta). Vale só para a partida nova: a leitura de um save usa as plantas do save. `make-orvalis-costa.py` passou a exportar os talhões.
4. **A grama continua soltando cenoura e batata, por enquanto.** A proposta previa tirá-las da grama "dando outra fonte"; na partida individual **não existe** outra fonte (sem aldeias, baús nem zumbis), então tirá-las deixaria cenoura, batata e tomate **inobtíveis** nela. Fica pendente até haver uma fonte para a partida individual; ao decidir qual, tirar `cenoura`, `batata` e `tomate` de `wildSeedAt`.

## Consequências
A sala 102 exige o pacote novo no servidor (a colheita roda lá). Pendentes: fonte de cenoura e batata para a partida individual (e então tirar da grama); batata venenosa; destruir a planta madura ao colher (a Wiki) continua uma adaptação deliberada.
