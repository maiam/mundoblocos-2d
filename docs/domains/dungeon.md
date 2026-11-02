# Domínio: dungeon e monstros

**Dungeon 01 — Covil das Aranhas**: labirinto procedural no mundo principal (perfil `dungeon: true`), perto do
spawn. Modelo de conexões, não uma planta fixa: tamanho, caminhos, câmaras e monstros mudam com a seed.

## Geração (`world/dungeon.ts`) — fonte de verdade, função pura da seed
A estrutura lógica completa é gerada antes de qualquer chunk; cada chunk só copia a sua parte.

1. **Área** — `dungeonSize(seed)`: 96–108 × 66–78 blocos (~9× a primeira versão, ~29 chunks em área).
   `planDungeon(base, spawn)`: tenta 8 direções × distâncias crescentes do spawn; aceita a primeira com ≤ 30% de
   água e terra firme diante da entrada. A entrada fica voltada para o spawn (`sideFacing`).
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
- `World`: calcula o spawn no terreno base, planeja a dungeon e troca o gerador pela sobreposição; `findSpawn`
  devolve o spawn calculado.

Testes (`dungeon.test.ts`, 5 seeds): tamanho ~9× e variável; uma única abertura no perímetro; todo o chão
alcançável pela entrada; terreno plano; becos, bifurcações e câmaras presentes; câmara da Rainha com exatamente uma
passagem e o chefe dentro; monstros em chão livre do interior; área protegida.

## Regras
- **Área protegida** (`World.isProtected`, perímetro incluído): nada quebra, nada é colocado, arado, amassado ou
  plantado. Só se luta lá dentro.
- **Monstros não saem**: `Monster.insideAt` limita a caixa dos pés a `interior` (a entrada fica no perímetro); o
  **chefe fica preso à câmara da Rainha** (`bounds = bossRoom`).

## Monstros (`game/monster.ts`)
- `Monster extends Walker`; atributos em `MONSTERS` (fonte única):

  | Tipo | Vida (golpes) | Mordida (½ corações) | Intervalo | Visão (passos ≈ ×1,6) | Renasce em |
  |---|---|---|---|---|---|
  | Aranha pequena | 2 | 1 (½ ♥) | 1,0 s | 6 | 40 s |
  | Aranha grande | 4 | 2 (1 ♥) | 1,2 s | 7 | 60 s |
  | Rainha (chefe) | 14 | 4 (2 ♥) | 1,6 s | 9 | 300 s |
- **Perseguição pelos corredores**: com a personagem dentro da dungeon, `Entities` recalcula a cada 0,25 s um mapa de
  distâncias (BFS pelo chão da área, a partir da célula dela); o monstro persegue se estiver a até ~visão×1,6 passos
  e anda para a célula vizinha mais próxima dela; encostado (`reach`), pára e **morde** (`tryBite`).
- **Mordida**: dano do tipo na heroína (`Player.hurt`), que fica invencível 0,9 s e recua.
- Golpe (espada/machado, `Entities.strike`): −1 de vida, pisca 0,35 s, recua; barra de vida quando ferido.
- **Derrotado**: sai do jogo, toca a morte (0,5 s, provisória: encolhe/desbota com faíscas), chama
  `Entities.onMonsterKilled` (o `Game` solta os espólios de `monsterDrops`) e agenda o **renascimento** no ponto de
  nascimento após o tempo do tipo — **todos renascem, inclusive a Rainha** — só com a heroína a > 10 células
  (senão tenta de novo a cada 5 s). Estado de execução: ao recarregar, renascem todos.

## Heroína em combate (`game/player.ts`)
- **5 corações** (`MAX_HP` = 10 meios). Regenera ½ coração a cada 3 s depois de 6 s sem dano.
- **Derrotada → renasce no início** com vida cheia e **mantém os itens** (2 s de invencibilidade).
- HUD: corações no canto superior esquerdo só quando importam (na dungeon ou ferida); contador de espólios coletados.
- Render: heroína pisca invencível; vinheta vermelha ao levar dano; **penumbra** dentro da dungeon; **farol** roxo na
  entrada e **seta** na borda da tela apontando para ela quando fora de vista.

## Arte
- `scripts/extract-dungeon.py` (comando em `OPERATIONS.md`); detalhes de render em `render.md`.
