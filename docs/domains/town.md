# Domínio: Cidade do Despertar (Cidade 1)

Ponto de partida de todo jogador e de **recomeço de quem morre sem tenda ativa** (com tenda, renasce nela). Cidade
medieval fortificada no mundo principal (perfil `town: true`), **igual em qualquer seed**. Spec de origem: "Cidade 1 —
A Cidade do Despertar · V1.0" (pedido do dono do produto, 2026-11-03).

## Fonte de verdade
- `world/town.ts` — `townLayout()` (mapa lógico completo, calculado uma vez) e `TownTerrain` (sobreposição no
  terreno). Gerada **proceduralmente com semente própria fixa** (`TOWN_SEED`), não com a seed do mundo (ADR 0012).
- `World` (`world/world.ts`): `town`, `isProtected` (área inteira, muralha incluída), `townBuildingAt`,
  `outsideGate`, `findSpawn` = `town.start`. Ids dos blocos da cidade em `world/blocks.ts` (120–141).
- Tamanhos das construções: `TOWN_SIZES` (`world/town.ts`), lido pelo gerador e pelo render.

## Território e posição
- **108 × 78 = 8.424 blocos**, canto noroeste em (−54, −78): o portão (sul) fica logo ao norte da origem.
- **Anel de 8 células** em volta da muralha: água vira grama (terra firme sempre) e, nas 3 mais próximas, sem
  objetos. **Estrada de terra** de 14 células sai do portão para o sul (atravessa água se houver).
- A dungeon é planejada fora da cidade + anel + 4 (`planDungeon(..., avoid)`), com a entrada voltada para o início.

## Geração (ordem da spec)
1. **Território** fechado (retângulo fixo).
2. **Muralha**: 2 de espessura × 2 cubos de altura, **Tijolo de Pedra** com ~22% de **Tijolo de Pedra Rachado**.
   Torres de vigia nos 4 cantos e ladeando o **único portão** (4 de largura, no meio do lado sul).
3. **Castelo** (26 × 9) no fundo (norte), oposto ao portão, com **pátio** de Pedra Polida (cercas vivas, flores,
   lampiões, bancos).
4. **Labirinto de ruas**: grade de nós (10 × 8, passo 10 × 9, centros deslocados ±2) ligados por trechos em Z
   (curvas). **Caminho principal** = menor caminho com pesos sorteados (sinuoso) portão → praça central → pátio,
   3 de largura; **ruas secundárias** (2 de largura) por árvore aleatória a partir dele (becos nas folhas) + ~16% de
   laços (atalhos internos); **10 becos extras** curtos terminando em caixotes/barris. Pavimento: **Pedra Irregular**
   (~70%) e **Pedra Rachada** (~30%). Praças de **Chão de Pedra**.
5. **Construções**: as obrigatórias são **reservadas antes das ruas** e ligadas à rede depois (busca em largura):
   Guilda dos Aventureiros (9×5, oeste da praça central), Hospedaria (9×5, leste), Ferreiro (8×4, sudoeste), Loja
   de Poções / Armazém / Loja de Ferramentas (4×3 cada, sudeste). **Casas** (3×2, 4×2, 4×3, 5×3) preenchem os
   terrenos junto às ruas, com 1 célula de folga entre si e **porta voltada para a rua** (ou por um caminho curto de
   até 3 células pelo quintal).
6. **Decoração**: praças primeiro (fonte 3×3 na praça central, poço 2×2 na praça inicial, barracas, bancos, placas,
   lampiões) — nenhuma porta fica atrás de um enfeite; depois lampiões ao longo do caminho principal (≥ 7 células
   entre si), barris/caixotes nas oficinas, **cerca viva** na beira das ruas (~62%, as falhas são atalhos),
   carvalhos/cerejeiras, flores e capim nos jardins.

Os seis setores da spec: (1) portão e praça inicial (início, poço, placas, bancos); (2) bairro residencial (casas e
becos espalhados); (3) comércio e artesãos (ferreiro, lojas); (4) hospedaria e praça central (fonte, barracas);
(5) guilda; (6) praça alta e castelo.

## Regras
- **Nada quebra nem é colocado** na área (muralha incluída) — regra do dono do produto. Não se ara nem planta.
- Construções: id no **canto inferior esquerdo**; as outras células são `TOWN_PART` (sólidas, sem arte).
  **Tocar** numa construção ou placa mostra o nome/texto (`Hud.toast`); interiores ainda não existem.
- **Zona segura**: monstros não existem fora da dungeon. Ovelhas nascem no campo, do lado de fora do portão.
- Salvamentos: ao carregar, as células protegidas de chunks salvos voltam do gerador (`World.restoreChunk`), e baús
  salvos onde não há mais baú são descartados — salvamentos antigos não "furam" a cidade. Formato inalterado (v4).

## Arte (`render/townArt.ts`)
**Casa de telhado vermelho: imagem fornecida** (`town-house-red`, no pacote de arte do mundo principal, ADR 0010),
ajustada a cada tamanho — parede com escala uniforme na largura da casa e telhado remontado em fileiras (topo +
fileira do meio repetida + beiral; faixas em `HOUSE_RED`). O restante é pintado em canvas (ilustração RPG/anime: contorno quente, luz de cima-esquerda, janelas acesas): **não pesa no
artefato**. Casas com 6 variações (telhado vermelho/azul/alaranjado, oitão ou duas águas, enxaimel ou pedra,
chaminé), castelo com torres de telhado cônico azul e estandartes, torres redondas com ameias, guilda (escudo com
espadas), hospedaria (placa de cama), ferreiro (forja acesa, bigorna, fumaça), lojas com toldos, fonte, poço,
barraca, lampião (brilha à noite), banco, barril, caixotes, placa e cerca viva. Variação por posição com sal fixo
(independe da seed). Render varre colunas à esquerda/linhas abaixo da tela só para esses sprites (`TOWN_REACH`).

## Pendências (ver NEXT_STEPS)
NPCs (moradores, guardas, ferreiro de dia, hospedaria à noite, mercadores), interiores, quadro de missões da guilda,
hospedaria como ponto de retorno opcional, lampiões acendendo ao anoitecer com a movimentação diminuindo; arte final
por pranchas se o dono quiser substituir a pintura em código.
