# ADR 0019 — Covil isolado com entrada de caverna; mundo da Cidade 1 só de florestas; andares por portais

- **Status:** aceita (covil e biomas implementados na v0.55.0; andares/portais = visão para as próximas fases)
- **Data:** 2026-11-06
- **Pedido:** o dono do produto enviou a arte da entrada do Covil das Aranhas e pediu que, como na Ferraria, o jogador
  entre pela boca da caverna e saia pela saída do labirinto, sem que um lado veja o outro; a caverna a pelo menos
  10 chunks do castelo, em direção aleatória; o mundo em volta da Cidade 1 sem deserto (só florestas, rios/mares e
  areia nas praias); e propôs cidades em mundos diferentes ligados por portais, como os andares de Sword Art Online.

## Decisão

1. **Covil isolado** (como os interiores, ADR 0014): o labirinto (`isolatedDungeon`) fica no canto fixo
   `DUNGEON_ORIGIN` = (−100000, −100000), sempre com a entrada ao sul, cercado por um anel de montanhas
   (`DUNGEON_RIM`); o render escurece tudo fora da área quando a personagem está lá dentro.
2. **Entrada no mundo** = a caverna (`DUNGEON_CAVE`, base 5 × 3 sólida e protegida, arte `dungeon-cave.webp`),
   posta por `planCave`: direção e distância pela seed, ≥ `CAVE_MIN_CASTLE_DIST` (160 células = 10 chunks) do centro
   do castelo, fora da cidade/estrada/campo do rebanho e em terra firme. Andar para cima diante da boca → chegada logo
   para dentro do vão; pisar no anel externo do vão → volta para diante da boca.
3. **Mundo da Cidade 1 só de florestas**: `pickBiome` devolve só Campos (carvalhos e macieiras) e Bosque de Sakura;
   rios, mares e areia de praia seguem do gerador. As Dunas e o cacto continuam no código e na arte, sem uso, para um
   mundo árido futuro.
4. **Andares por portais (visão)**: cada cidade é um **mundo** (um `WorldProfile`) com bioma próprio — o Despertar é
   o mundo das florestas, abundante em recursos; os próximos (árido, pantanoso, gelado…) ficam em outros perfis e se
   ligam por **portais** (estrutura na cidade ou num marco do mapa que leva ao mundo seguinte). O motor já tem a base:
   vários mundos num motor só (`WorldProfile`, ADR 0008), salvamento por mundo e seed (ADR 0011), e o Santuário como
   primeiro mundo à parte.

## Consequências

- O mapa de todas as seeds muda: a área murada do covil antigo volta a ser terreno; desertos viram floresta.
- Salvamento `SAVE_VERSION` 8: as aranhas voltam completas (posições do covil antigo descartadas).
- Multiplayer: `PROTOCOL_VERSION` 4 (o mapa da sala mudou); servidor atualizado junto.
- Portais pedem decisões antes do motor: o que destrava o próximo andar (chefe? nível?), se o inventário viaja
  inteiro, renascer por andar, uma seed por andar ou a mesma, e multiplayer entre andares. Registrado em `NEXT_STEPS`.
