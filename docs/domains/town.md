# Domínio: Cidade do Despertar (Cidade 1)

Ponto de partida de todo jogador e de **recomeço de quem morre sem tenda ativa** (com tenda, renasce nela). Cidade
medieval fortificada no mundo principal (perfil `town: true`), **igual em qualquer seed**. Spec de origem: "Cidade 1 —
A Cidade do Despertar · V1.0" (pedido do dono do produto, 2026-11-03).

## Fonte de verdade
- `world/town.ts` — `townLayout()` (mapa lógico completo, calculado uma vez) e `TownTerrain` (sobreposição no
  terreno). Gerada **proceduralmente com semente própria fixa** (`TOWN_SEED`), não com a seed do mundo (ADR 0012).
- `World` (`world/world.ts`): `town`, `isProtected` (área inteira, muralha incluída), `townBuildingAt`,
  `outsideGate`, `findSpawn` = `town.start`. Ids dos blocos da cidade em `world/blocks.ts` (120–142).
- Tamanhos das construções: `TOWN_SIZES` (`world/town.ts`), lido pelo gerador e pelo render.

## Território e posição
- **164 × 132 = 21.648 blocos** (v0.36; antes 108 × 78 — ampliada na proporção das construções novas), canto
  noroeste em (−82, −132): o portão (sul) fica logo ao norte da origem.
- **Anel de 8 células** em volta da muralha: água vira grama (terra firme sempre) e, nas 3 mais próximas, sem
  objetos. **Estrada de terra** de 14 células sai do portão para o sul (atravessa água se houver).
- A dungeon é planejada fora da cidade + anel + 4 e do **campo ao sul do portão** (estrada + rebanho,
  `TOWN_SOUTH_FIELD` = 28 células abaixo da muralha) (`planDungeon(..., avoid)`), com a entrada voltada para o início.

## Geração (ordem da spec)
1. **Território** fechado (retângulo fixo).
2. **Muralha**: 2 de espessura × 2 cubos de altura, **Tijolo de Pedra** com ~22% de **Tijolo de Pedra Rachado**.
   **Guaritas** (4×6) nos 4 cantos e ladeando o **único portão** (4 de largura, no meio do lado sul).
3. **Castelo** (26 × 17) no fundo (norte), oposto ao portão, com **pátio** (cercas vivas, flores,
   lampiões, bancos).
4. **Labirinto de ruas**: grade de nós (10 × 9, passo 15 × 13 — entre ruas cabem duas casas 5×5 —, centros deslocados ±2) ligados por trechos em Z
   (curvas). **Caminho principal** = menor caminho com pesos sorteados (sinuoso) portão → praça central → pátio,
   3 de largura; **ruas secundárias** (2 de largura) por árvore aleatória a partir dele (becos nas folhas) + ~16% de
   laços (atalhos internos); **10 becos extras** curtos terminando em caixotes/barris. Pavimento: todo o piso pavimentado
   (ruas, praças, pátio do castelo, calçadas das casas, vão do portão) é **Tijolo de Pedra** (`FLOOR` em `buildTown`;
   dono do produto, 07/11 — antes ruas de Pedra Irregular/Rachada, praças de Chão de Pedra e pátio de Pedra Polida).
   Gramados continuam de grama.
5. **Construções**: as obrigatórias são **reservadas antes das ruas** e ligadas à rede depois (busca em largura):
   Guilda dos Aventureiros (9×9, oeste da praça central), Hospedaria (9×5, leste), Ferreiro (8×5, sudoeste), Loja
   de Poções / Armazém / Loja de Ferramentas (5×5 cada, sudeste). **Casas 5×5** (térrea ou de 2 andares) preenchem os
   terrenos junto às ruas, com 1 célula de folga entre si e **porta voltada para a rua** (ou por um caminho curto de
   até 3 células pelo quintal).
6. **Decoração**: praças primeiro (fonte 5×5 no centro da praça central, poço 2×2 na praça inicial, barracas, bancos 2×1 e 3×1,
   placas, postes de luz) — nenhuma porta fica atrás de um enfeite; depois lampiões ao longo do caminho principal (≥ 7 células
   entre si), barris/caixotes nas oficinas, **cerca viva** na beira das ruas (~62%, as falhas são atalhos),
   carvalhos/cerejeiras, flores e capim nos jardins.

Os seis setores da spec: (1) portão e praça inicial (início, poço, placas, bancos); (2) bairro residencial (casas e
becos espalhados); (3) comércio e artesãos (ferreiro, lojas); (4) hospedaria e praça central (fonte, barracas);
(5) guilda; (6) praça alta e castelo.

## Regras
- **Nada quebra nem é colocado** na área (muralha incluída) — regra do dono do produto. Não se ara nem planta.
- Construções: id no **canto inferior esquerdo**; as outras células são `TOWN_PART` (sólidas, sem arte).
  **Lote × área bloqueada** (`TOWN_SIZES`: largura, profundidade do lote, fileiras bloqueadas a partir da frente):
  castelo 26×17, guilda 9×9, hospedaria 9×5, ferreiro 8×5, lojas 5×5, casas 5×5, guarita 4×6, bancos 2×1/3×1. Casa e
  loja **térreas** bloqueiam 4 das 5 fileiras: o desenho é mais baixo que o lote, então a fileira de trás vira
  **quintal andável** (sem faixa "invisível" bloqueada atrás do telhado).
  **Tocar** numa construção ou placa mostra o nome/texto (`Hud.toast`); interiores ainda não existem.
- **Zona segura**: monstros não existem fora da dungeon. Ovelhas e o cavalo nascem no campo, do lado de fora do portão.
- **Moradores** (`domains/npc.md`): 4 passeiam só por ruas e praças (`street`), com roupas sorteadas pela seed; o
  ferreiro atende dentro da Ferraria.

## Interiores (`world/interiors.ts`, ADR 0014)
- Cômodo isolado do mapa em coordenadas fixas ao norte (`INTERIOR_ORIGIN`), sobreposição `InteriorTerrain`, protegido.
  Mapa lógico (`InteriorDef.map`: `#` bloqueado, `.` chão, `E` capacho) desenhado sobre a arte (grade em partes iguais).
- **Ferraria** 9 × 18 (`assets-src/interiors/smithy.png`): forja, bigorna, armeiro, estantes, caixotes e balcão; o
  ferreiro (`keeper`) anda só nas linhas 9–11 (tapete, atrás do balcão).
- Entrar: andar para cima na célula diante da porta (`TownBuilding.door`); sair: pisar no capacho (volta à rua). Salvo
  lá dentro → carrega na rua. Interior novo: imagem + `InteriorDef` + `scripts/extract-interiors.py` + import da arte.
- **Tenda** 7 × 7 (`assets-src/interiors/tent.png`, v0.62.0): lampião e colchão; um cômodo (`tentLayout`) para todas as
  tendas do jogador, em qualquer mundo cujo perfil tenha `TENT` (com ou sem cidade). Entra-se andando para cima diante da
  fileira de baixo de uma tenda (`World.tentDoorAt`); o capacho volta para diante dela (`Game.tentReturn`).
- Salvamentos: ao carregar, as células protegidas de chunks salvos voltam do gerador (`World.restoreChunk`), e baús
  salvos onde não há mais baú são descartados — salvamentos antigos não "furam" a cidade. Formato inalterado (v4).

## Arte (`render/townArt.ts`)
**Imagens fornecidas pelo dono do produto** (`assets-src/town/*.png` → `scripts/extract-town.py` → `town-<nome>.webp`,
só no pacote do mundo principal, ADR 0010): casas 5×5 térreas e de 2 andares em telhado **vermelho, azul e marrom**
(cor sorteada por posição, fixa), lojas térrea/2 andares, ferreiro, guilda, **castelo com fosso e ponte** (o desenho
cobre os 26×17), guarita, bancos 2×1 e 3×1, **3 postes de luz** (pedra, madeira, madeira e pedra; brilham à noite) e
3 arbustos da cerca viva. Todas na mesma escala (`TOWN_PX_PER_CELL` = 48 px por célula), centradas na largura da
construção e com a base no pé da célula — **nunca esticadas nem remontadas** (uma imagem por tamanho; remontar já
deformou a casa). Da prancha do castelo "Senhor Feudal" (também 26×17) não foi usada: é uma fachada que cobre só ~11
das 17 fileiras. **Hospedaria** 9×5 de 2 andares (prancha já transparente: recorte pelo alfa, sem remoção de fundo). **Fonte** 5×5 (v0.43.1), **poço** 2×2 (desenho ~4 células de altura com o telhado), **barraca de frutas** 2×1 e **barril** 1×1 também
vêm de pranchas. Ainda **pintados em código**: caixotes e placas.
Render varre colunas à esquerda/linhas abaixo da tela só para esses sprites (`TOWN_REACH`).

## Pendências (ver NEXT_STEPS)
Falas dos moradores, NPCs (guardas, ferreiro de dia, hospedaria à noite, mercadores), interiores, quadro de missões da guilda,
hospedaria como ponto de retorno opcional, lampiões acendendo ao anoitecer com a movimentação diminuindo; arte final
por pranchas se o dono quiser substituir a pintura em código.
