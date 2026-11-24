# ADR 0105 — Orvalis em voxel: o mundo principal em primeira pessoa sobre o motor do Titã (v0.169.0, fatia 1)

**Status:** Aceita (fatia 1 de várias). Pedido do dono do produto: transformar também o mundo principal em um mundo em **primeira pessoa com blocos voxel ao estilo Minecraft**, usando as regras já construídas no Titã.

## Decisões do dono do produto (24/11/2026)
1. **Estratégia:** novo modo sobre o motor do Titã. O mundo 2.5D atual (`World`/`Game`, cidade, dungeon, sala) **segue no ar** até haver paridade e só então é aposentado, por ADR.
2. **Primeira entrega:** só os **biomas de floresta e água** (Campos, Bosque de Sakura, rios, mar, praia, montanhas, árvores). Cidade, animais/NPCs/monstros e cultivo/progressão ficam para as próximas fatias.
3. **Arte:** reaproveitar a arte atual (Materiais V2) reduzida ao atlas de 32 px por face; o que falta (folhas) sai provisório.
4. **Legado:** convivem. O voxel é um mundo novo: saves 2D não migram, a Sala 1 e o servidor ficam como estão, Santuário e Titã intactos.

## Decisão técnica
- **Um motor, dois mundos.** O Orvalis em voxel usa `src/titan/` inteiro (volume, física, gesto, quebra, inventário, save, malha, luz, ciclo de céu, vida/fome). O que difere entra por **pontos de extensão**, sem `if (mundo === …)` espalhado:
  - `titan/terrain.ts` — contrato **`TerrainGen`** (o que o motor lê do gerador) e `VoxelWorld = 'titan' | 'orvalis'`. `TitanGenerator` e `OrvalisGenerator` o implementam; os campos de conteúdo do Titã (lascas, juncos, nozes, toca, brasa) existem em todo gerador e ficam **vazios** no Orvalis. `TitanVolume`, `session.ts` e as validações usam `TerrainGen`.
  - `titan/orvalis/generator.ts` — **`OrvalisGenerator`** (`ORVALIS_GENERATOR_VERSION` 1): função pura de seed + versão + coordenadas; região 128 × 128 (a do gerador v6 do Titã) **cercada de mar** (a parede invisível do motor fica dentro d'água); Campos e Sakura, colinas, montanhas de pedra (topo ≥ 86 ou encosta ≥ 4), rios cavados até 3 blocos abaixo do nível do mar, praia (topo ≤ 65), árvores por grade de sorteio (carvalho, bétula, cerejeira; tronco de tora e copa de folhas; densidade por bioma e por manchas de mata). Chegada = clareira de grama 6 × 6 plana, longe das árvores, com o olhar para a água mais próxima. Mudou qualquer regra → suba a versão.
  - **Líquido = `T.LAKE`** (o do motor), superfície em Y = 64: balde, pulo de saída da água, enchente e mergulho valem sem mudança; só a arte (`orvalis-agua-32px.webp`) e a paleta mudam por mundo.
  - **Blocos 90–99** em `T` (`T_MAX` = 99): Terra com Grama, Terra, Pedra, Areia da Praia, Tora e Folhas de Carvalho, de Cerejeira e de Bétula. **Itens 42–51** (o item é o próprio bloco, `ORVALIS_ITEM_BLOCKS`); atlas de itens **4 × 13 (52 ids)**; **15 tiles novos** no fim de `tiles.json` (`orvalis/…`, atlas de 8 linhas).
  - **Save:** `header.world` passa a `'titan' | 'orvalis'` e o Orvalis grava num **banco próprio** (`orvalis-voxel`; o do Titã continua `orvalis-titan`), para que as seeds dos dois mundos nunca se misturem. `TITAN_SAVE_VERSION` não muda (campo já existente, valor novo).
  - **Céu:** `skyAt(frac, palette)` — paleta `orvalis` (azul de dia; manhã e poente quentes; noite igual). Sem Saturno.
  - **Entrada:** `?mundo=orvalis3d` (perfil `orvalis3d` em `world/profiles.ts`, só registro de URL como o do Titã) → `main.ts` abre `startTitan(…, 'orvalis')`. Sem salas por enquanto (botão oculto; `?sala=` ignorado).
- **Regras mantidas do Titã:** gesto (toque curto coloca, segurar quebra), tempos por material, bloco quebrado cai no chão e se recolhe por proximidade, vida/fome/ar, ciclo de 20 min, durabilidade, lanterna e Mesa de Trabalho (receitas do Titã ainda valem; o Orvalis ainda não tem receitas de madeira).

## Fatia 1 entregue
Terreno voxel jogável em primeira pessoa com os 10 blocos, quebrar/recolher/colocar, save e retomada, céu azul, água do Orvalis, ícones e tiles feitos dos Materiais V2 (`scripts/make-orvalis-voxel-arte.py`; folhas **provisórias**, procedurais). Testes: `titan/orvalis/generator.test.ts` (determinismo, chegada, mar/praia/mata, três espécies) e `mundo.test.ts` (sessão, quebrar → recolher → colocar, itens ↔ blocos, tempos, save com `world: orvalis`, céu). Os 8 testes antigos que tinham limites escritos à mão (id máximo, atlas, `BREAK_MS`) foram atualizados.

## Fora da fatia 1 (próximas, ver `NEXT_STEPS`)
Cidade do Despertar em voxel; animais, NPCs, monstros e dungeon; cultivo (trigo, batata, tomate, cenoura), comida e progressão/missões; receitas de madeira (tábuas, ferramentas, mesa) e picareta/machado por material; sons de madeira/grama/folha; folhas com arte e com transparência; cavernas e minérios; mergulho com cor azul (hoje carvão-violeta do Titã); salas multiplayer (servidor + `TitanRoom` por gerador); aposentar o 2D por ADR.

## Consequências e riscos
- O `TitanGenerator` não mudou de comportamento (só ganhou `world`); `GENERATOR_VERSION` e o mapa de todas as seeds do Titã seguem iguais. O atlas de terreno foi regravado: os 48 primeiros tiles saíram **idênticos** (conferido pixel a pixel); o atlas de itens só ganhou as células 42–51.
- A sala do Titã (`TitanRoom`) ainda constrói `TitanGenerator`; salas do Orvalis exigirão escolher o gerador pela sala e `TITAN_PROTOCOL_VERSION` (e servidor primeiro).
- Dívida: a legenda do mergulho, os sons e as receitas ainda são do Titã; a tora soa como rocha e terra/areia/folha como areia.
