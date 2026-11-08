# Domínio: dungeon e monstros

**Dungeon 01 — Covil das Aranhas**: labirinto procedural no mundo principal (perfil `dungeon: true`). Modelo de
conexões, não uma planta fixa: tamanho, caminhos, câmaras e monstros mudam com a seed. **Desde a v0.55.0 (ADR 0019) é
um lugar isolado**: no mundo só existe a **entrada — a caverna**, a ≥ 10 chunks do castelo.

## Entrada e saída (v0.55.0, ADR 0019)
- `isolatedDungeon(seed)`: o labirinto em `DUNGEON_ORIGIN` (−100000, −100000), entrada sempre ao sul, cercado por
  `DUNGEON_RIM` = 6 células de montanha (3 de chão diante do vão). `dungeonGuard` = área + anel (protegida).
- `planCave(base, castle, avoid)`: caverna (`DUNGEON_CAVE` no canto inferior esquerdo de uma base 5 × 3 de
  `TOWN_PART`), direção e distância pela seed, ≥ `CAVE_MIN_CASTLE_DIST` (160) do centro do castelo, fora da
  cidade/estrada/campo do rebanho, base e frente sem água; a frente da boca (5 × 3) fica limpa.
- `Game.updateInteriors`: andar para cima em `cave.outside` → `dungeonEntry` (logo dentro do vão, virada para cima,
  aviso "Covil das Aranhas"); pisar no anel externo do vão (`isDungeonExit`) → volta para `cave.outside`.
- Render: dentro do covil, tudo fora da área fica escuro (`dungeonArea`); o farol roxo e o marcador do minimapa ficam
  na boca da caverna. No minimapa, dentro do covil, só o labirinto (sem cidade nem tenda), com a névoa normal.
- Salvamento v8: aranhas do covil antigo descartadas (voltam completas).

## Geração (`world/dungeon.ts`) — fonte de verdade, função pura da seed
A estrutura lógica completa é gerada antes de qualquer chunk; cada chunk só copia a sua parte.

1. **Área** — `dungeonSize(seed)`: 96–108 × 66–78 blocos (~9× a primeira versão, ~29 chunks em área).
   Posição: ver "Entrada e saída" acima (até a v0.54.0, `planDungeon` punha o labirinto no mapa, perto do spawn).
2. **Labirinto** — `buildMaze(seed, w, h, side)` define **só chão e paredes**:
   - Grade lógica de nós (passo de 6 blocos; centros deslocados ±1 para não haver simetria). A coluna/linha 0 de
     cada célula de nó é sempre parede, então só arestas abertas atravessam entre nós.
   - **Árvore geradora "growing tree"** (75% o mais recente → caminhos longos e sinuosos; 25% aleatório →
     bifurcações); as folhas são **becos sem saída** naturais.
   - **Circuitos**: ~9% das paredes entre nós viram passagem (corredores que se reconectam).
   - **Câmaras**: retângulos de 2×2 ou 3×2 nós, com bordas irregulares (saliências de 1 bloco onde nenhum
     corredor chega). Quantidade ~ nós/30 (mín. 3).
   - **Corredores** de 2 ou 3 blocos de largura, em L entre centros deslocados (curvas).
   - **Câmara da Rainha**: bloco de 3×3 nós (~17×17 blocos) na borda oposta à entrada, fora da árvore; ligada por
     **uma única passagem** (2 blocos) ao nó vizinho **mais fundo** (maior distância da entrada no grafo final).
   - **Entrada**: corredor de 3 blocos atravessando o perímetro (2 anéis), o único vão.
   - **Validação**: chão que não se alcança a partir da entrada vira parede (ex.: canto fechado por saliências).
3. **Conteúdo** — `decorateDungeon(seed, maze, x0, y0)`, respeitando a geometria:
   - Parede = `DUNGEON_WALL` (cubo de pedra escura, 2 de altura no desenho); anel externo = `DUNGEON_MOUNTAIN`.
   - Chão: terra (84%), musgo, teias, ossos.
   - Obstáculos (pedras, ovos, cogumelos, espinhos, raízes) só no miolo das câmaras (2 blocos da borda), isolados
     → nunca fecham o caminho; arena do chefe livre (raio 5).
   - Monstros: 1 chefe no centro da câmara da Rainha; aranhas grandes = chão livre/320, pequenas = chão livre/110,
     a ≥ 14 passos da entrada, fora da câmara da Rainha, espaçadas (≥ 4).
- `DungeonTerrain`: `TerrainSource` que sobrepõe o mapa ao terreno base (`generateChunk` copia a parte do chunk).
- `World`: calcula o spawn no terreno base, monta o covil isolado e a caverna (`cave`) e troca o gerador pela
  sobreposição; `findSpawn` devolve o spawn calculado. `isCaveDoor`, `inDungeon`, `isDungeonExit`, `dungeonEntry`.

Testes (`dungeon.test.ts`, 5 seeds): tamanho ~9× e variável; uma única abertura no perímetro; todo o chão
alcançável pela entrada; terreno plano; becos, bifurcações e câmaras presentes; câmara da Rainha com exatamente uma
passagem e o chefe dentro; monstros em chão livre do interior; área protegida.

## Regras
- **Área protegida** (`World.isProtected`, perímetro incluído): nada quebra, nada é colocado, arado, amassado ou
  plantado. Só se luta lá dentro.
- **Monstros não saem**: `Monster.insideAt` limita a caixa dos pés a `interior` (a entrada fica no perímetro); o
  **chefe fica preso à câmara da Rainha** (`bounds = bossRoom`).

## Monstros (`game/monster.ts`)
- `Monster extends Walker`. **Comportamento** em `MONSTERS` (`game/monster.ts`: movimento, visão, intervalo da mordida,
  renascimento, morte); **ficha de combate** em `MONSTER_STATS` (`world/progression.ts`, fonte única de números):

  | Tipo | Vida | Ataque | Defesa | Intervalo | Visão (passos ≈ ×1,6) | Renasce em |
  |---|---|---|---|---|---|---|
  | Aranha pequena | 20 | 8 | 0 | 1,0 s | 6 | 40 s |
  | Aranha grande | 45 | 14 | 2 | 1,2 s | 7 | 60 s |
  | Rainha (chefe) | 180 | 36 | 6 | 1,6 s | 9 | 300 s |
- **Perseguição pelos corredores**: com a personagem dentro da dungeon, `Entities` recalcula a cada 0,25 s um mapa de
  distâncias (BFS pelo chão da área, a partir da célula dela); o monstro persegue se estiver a até ~visão×1,6 passos
  e anda para a célula vizinha mais próxima dela; encostado (`reach`), pára e **morde** (`tryBite`).
- **Dano (fórmula única, `rollDamage`)**: ataque − defesa do alvo (mínimo 1), ±10% de variação, 5% de crítico (×1,5).
- **Mordida**: ataque da aranha − defesa da heroína (`Player.hurt`), que fica invencível 0,9 s e recua.
- Golpe (espada/machado, `Entities.strike`): ataque da heroína + poder da arma (espada 12, machado 7) − defesa da aranha;
  pisca 0,35 s, recua; barra de vida quando ferido. Com a espada: pequena ~2 golpes, grande ~3, Rainha ~16.
- Cada dano que entra avisa o `Game` (`Entities.onDamage`) e aparece como **número subindo** (render
  `DamageNumbers`): branco no inimigo, vermelho na heroína, amarelo e maior no crítico.
- **Derrotado**: sai do jogo, toca a morte (folha própria: 0,7 / 0,9 / 1,6 s por tipo, `MONSTERS.deathSeconds`), chama
  `Entities.onMonsterKilled` (o `Game` solta os espólios de `monsterDrops`) e agenda o **renascimento** no ponto de
  nascimento após o tempo do tipo — **todos renascem, inclusive a Rainha** — só com a heroína a > 10 células
  (senão tenta de novo a cada 5 s). Estado de execução: ao recarregar, renascem todos.

## Heroína em combate (`game/player.ts`)
- **Vida em pontos** (`Player.stats`, de `playerStats` em `world/progression.ts`): nível 1 = 100 de vida, ataque 5,
  defesa 2. Regenera 5% da vida máxima a cada 1,5 s depois de 6 s sem dano (`REGEN`).
- **Derrotada → renasce** (última tenda ou praça inicial da cidade) com vida cheia, perdendo tudo menos as
  ferramentas (2 s de invencibilidade).
- HUD: **barra de vida com número** ("85 / 100"; laranja abaixo de 30%) no canto superior esquerdo só quando importa
  (na dungeon ou ferida); contador de espólios coletados.
- Render: heroína pisca invencível; vinheta vermelha ao levar dano; **penumbra** dentro da dungeon; **farol** roxo na
  entrada e **seta** na borda da tela apontando para ela quando fora de vista.

## Lobos do mapa (v0.91.0; `world/wolves.ts`, `game/monster.ts`)
- **Bandos**: `wolfPacks(world)` (função pura da seed, sem chunks carregados): regiões de 40 células ao redor da cidade
  (7 × 7), 50% com toca; cada toca é de **uma cor** (`WOLF_KINDS`: marrom, cinza, branco) e tem **1 a 3 lobos**. Nada nasce a
  menos de 28 células da cidade/campo do rebanho, em água, árvore, pedra ou área protegida. Mundo sem cidade: nenhum.
- **Regra do dono do produto**: o lobo só ataca a personagem a **até 3 células** (`WOLF_SIGHT`, em linha reta); mais longe a
  ignora e só passeia perto da toca (`leash` 5; limite de `WOLF_ROAM` = 12 células). É mais lento (3,0) que ela (4,2). Entre
  si, cada um decide pela própria distância: o bando, junto, tende a atacar junto.
- `MONSTERS[...].open` marca o monstro do mapa aberto (persegue sem o mapa de corredores da dungeon). Ficha em `MONSTER_STATS`:
  marrom 35/11/1, cinza 45/13/2, branco 55/15/3 (vida/ataque/defesa); renascem em 120 s; sem espólio (`monsterDrops` vazio).
- `Entities.spawnWolves` (dentro de `spawnWildlife`); monstro a > 48 células de todo jogador não é simulado (`ACTIVE_RADIUS`);
  `save.ts` só guarda as aranhas (lobos voltam todos pela seed). Na sala, a sala os simula e o aparelho espelha (`mobs`).
- Arte: `assets-src/lobos/lobo-<cor>-sheet.png` → `wolf-<cor>.webp` (folha 4 × 4 canônica, `process-sprite.py`); sem folha de
  morte (usa a morte provisória: encolhe e desbota).

## Arte
- `scripts/extract-dungeon.py` (comando em `OPERATIONS.md`); detalhes de render em `render.md`.
