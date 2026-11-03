# ADR 0012 — Cidade do Despertar: geração com semente fixa, sobreposta e com arte em código

**Status:** aceito (2026-11-03, v0.35.0)

## Contexto
A Cidade 1 é o ponto de partida de todo jogador e "nunca muda", mas a spec pede geração procedural (labirinto
urbano, setores, ruas que atravessam chunks). O artefato principal já está acima da meta de 3 MB, e não havia arte
de construções.

## Decisão
1. **Semente própria fixa** (`TOWN_SEED`): a cidade é procedural no código, mas sempre a mesma; a seed do mundo só
   muda o que fica fora dela. Posição fixa (portão ao norte da origem).
2. **Mapa lógico completo antes dos chunks**, sobreposto por `TownTerrain` (mesmo padrão da dungeon, ADR 0009);
   anel em volta força terra firme e a estrada do portão.
3. **Área inteira protegida** pelo `World` (`isProtected`), como a dungeon.
4. **Construções multicélula**: id no canto inferior esquerdo + `TOWN_PART` (padrão da tenda); forma `building`.
5. **Arte pintada em canvas** (`render/townArt.ts`), sem imagens: custo zero no artefato; pode ser trocada por
   pranchas depois sem mudar o domínio.

## Consequências
- O início muda para dentro da cidade em todas as seeds; a dungeon muda de lugar (planejada fora da cidade).
- Testes que constroem perto do início usam `World.outsideGate()` (fora da área protegida).
- Salvamentos antigos: células protegidas voltam do gerador ao carregar (sem subir `SAVE_VERSION`).
- Mudar `buildTown`/`TOWN_SEED` muda a cidade de todos os jogadores: rode `town.test.ts`.
