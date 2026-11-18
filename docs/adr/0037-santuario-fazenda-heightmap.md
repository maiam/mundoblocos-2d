# ADR 0037 — Santuário: paisagem única e Fazenda a partir de heightmap

**Status:** aceito (dono do produto, 18/11/2026). Estende o ADR 0036 (Santuário isométrico solo).

## Contexto
O Santuário é solo e a seed 1835638650 tem paisagem fixa (v0.93.148). O dono do produto decidiu que **essa paisagem é a única**: todo mundo novo é a réplica dela (a seed só distingue os salvamentos locais) e o mundo cresce com mais 16 chunks feitos a partir de um **heightmap** (pacote "Fazenda do Santuário", gerado por script, 64 × 64 células, alturas de 0 a 8, máscara e superfície da água, regiões planas para pátio e plantações).

## Decisão
1. **Seed única:** `landscapeFor(seed)` ignora a seed e usa `LANDSCAPE_SEED` (1835638650). O terreno é função pura dela; o salvamento guarda só o que o jogador mexeu.
2. **Mundo 8 × 4 chunks** (`cx −2..5`, `cy −2..1`, 128 × 64 células): o bloco original (`cx −2..1`, inalterado, mesma geração) e a **Fazenda** a leste (`cx 2..5`). A Deusa continua nascendo na origem (`findSpawn` do Santuário devolve `[0, 0]`).
3. **Pilha de 8 níveis** (`SANCTUARY_MAX_STACK`, antes 5). Salvamentos antigos (5 camadas) continuam abrindo: `restoreChunk` mantém as camadas existentes e deixa as novas vazias.
4. **Conversão do heightmap** (`world/sanctuaryFazenda.ts`, dados em `world/fazendaData.ts` gerados por `scripts/make-fazenda-data.py` a partir de `assets-src/santuario-fazenda`): 1 unidade = 1 cubo; a planície (2,0) é a pilha de 2 do Santuário; patamares 4, 6 e 8 → 4, 6 e **7** (o nível 8 não deixaria espaço para objetos em cima da pilha); vizinhos secos diferem no máximo 1 nível (o jogador sobe 1 por vez); margem nunca abaixo da água.
5. **Água:** o rio é escavado 1 cubo abaixo da margem com o pincel **Lago** do Rio das Fadas no topo da pilha (as 376 células da máscara); a superfície inclinada e a queda ao norte viram **degraus de água** (superfície plana por célula; não há cascata animada). Margens baixas de areia; ponte de tábuas rente à margem na linha do pátio.
6. **Objetos** (o pacote só traz terreno): pátio de terra batida, duas casas de madeira, cinco áreas cercadas (milho e trigo → trigo, abóboras → tomate, horta → cenoura e batata, talhão preparado só com Terra Arada), lampiões, árvores nos patamares, arbustos e flores. Milho e abóbora não existem no jogo: usam as culturas do Mundo.

## Consequências
- O pacote original fica em `assets-src/santuario-fazenda` (heightmap, CSVs, script); mudar o terreno = regerar `fazendaData.ts`.
- Pendências: queda d'água/cascata de verdade e curvas do canal (o rio usa só o pincel Lago); conferir desempenho do mundo maior (mais faces) em aparelho real; objetos e áreas podem ser trocados pelo dono do produto.
