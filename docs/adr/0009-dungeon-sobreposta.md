# ADR 0009 — Dungeon como sobreposição pura do terreno + monstros em `Entities`

**Status:** aceito (2026-11-02)

## Contexto
Primeira dungeon: área fechada com uma entrada, monstros que não saem dela e nada quebrável. O terreno não
editado precisa continuar sendo função pura da seed (ADR 0001), e mundos diferem só pelo perfil (ADR 0008).

## Decisão
- `world/dungeon.ts` gera a área (mapa + pontos dos monstros) como função pura de (seed, âncora, lado).
- A âncora vem do spawn calculado no terreno base; `DungeonTerrain` sobrepõe a área a qualquer `TerrainSource`.
  O perfil liga a dungeon (`dungeon: true`), sem `if` por mundo.
- A proteção é regra do `World` (`isProtected` em quebrar/colocar/arar/amassar/plantar), não do `Game`.
- Monstros são `Walker` (ADR 0004) em `game/monster.ts`, presos ao interior pela própria caixa dos pés;
  o golpe passa pelo mesmo `Entities.strike` dos animais, com vida por tipo.

## Consequências
- O mapa da área muda o terreno de todas as seeds dentro do retângulo; o spawn não muda.
- Outras dungeons = outra chamada de `buildDungeon` com outro tema/lista de monstros (generalizar quando houver
  a segunda). Dano à personagem, morte com animação e drops dependem de um sistema de vida (próximo passo).
- Mais ~390 kB de arte no artefato (montanhas, pedras, blocos, 3 aranhas), agravando a dívida de separar arte
  por mundo.
