# Catálogo do pacote "Texturas16px" (Drive `orvalis/Texturas16px`, 26/11/2026)

94 PNGs de **16 × 16 px** (pixel art de verdade, sem marca d'água), na ordem e com os nomes do Drive, em uma pasta por pacote. É a **fonte única** das próximas entregas: nada aqui entra no jogo sozinho — cada pacote vira blocos, itens e regras numa entrega própria (decisão do dono do produto: "tudo, em várias entregas seguidas, com PR e merge a cada uma"). Importado por `scripts`-fora (download pelo conector do Drive; cada arquivo foi conferido: 16 × 16 e o nome casa com a imagem).

| Pacote | Arquivos | Entrega | Estado |
|---|---|---|---|
| **P1-03** Folhas e orla | folhas de carvalho, bétula e cerejeira; toras de carvalho e cerejeira (topo, lateral); areia da praia | **E0 (v0.173.0)** | **no jogo** (tiles `orvalis/…`); a tora de bétula segue a de 2048 px do Drive anterior (este pacote não a traz) |
| **P1-04** Pedra de obra | pedra bruta, pedra lisa, tijolo de pedra; laje (topo, face); degrau (topo, frente, perfil); mureta (topo, face) | E0 / E2 | **pedra bruta = bloco Pedra do terreno (E0)**; o resto: E2 (blocos de construção, laje, degrau e mureta) |
| **P1-01** Madeira básica | tábuas de carvalho, cerejeira e bétula; haste de madeira; mesa de carpintaria (topo, frente, lateral) | **E1 (v0.174.0)** | **no jogo** (ADR 0107) |
| **P1-05** Solo de cultivo | terra arada úmida e seca (topo, lateral); caminho de terra (topo, lateral); terra infértil | E3 | fila |
| **P2-01** Cerâmica | bola de argila, tijolo, bloco de argila e de tijolos (textura e ícone), vaso de flor e decorado | E3 | fila |
| **P1-07** Ferramentas iniciais | picareta, machado, pá e enxada, de madeira e de pedra (ícones) | E4 | fila |
| **P1-06** Horta | trigo, cenoura, batata e tomate (fases 01–03 e ícone), semente de trigo | E5 | fila |
| **P1-02** Vedação de bétula | porta (frente, verso, borda), portão (fechado, aberto), cerca, degrau, laje | E6 | fila |
| **P1-08** Fechamento de junco | portão (ícone, fechado, aberto), alçapão (ícone, fechado, aberto), cerca (ícone, poste, travessa), trama | E6 | fila |
| **P1-09** Abrigo da margem | caixote raso, prateleira, cobertura de junco (topo, frente, trama, ícone) | E6 | fila |

Regras que valem para todas as entregas: bloco novo = tiles no fim de `titan/tiles.json` + `BLOCK_TILES` (ids 100+ para o Orvalis em voxel), item novo no atlas de itens (4 × N), ícone de **bloco** = cubo isométrico gerado por `make-orvalis-voxel-arte.py` (decisão do dono do produto), ícone de **item** que não é bloco = o PNG do pacote (sprite 16 × 16 extrudado, ADR 0097); itens com `titan_` no nome são do Titã.
