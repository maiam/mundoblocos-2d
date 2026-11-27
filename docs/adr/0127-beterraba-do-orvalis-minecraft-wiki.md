# ADR 0127 — Beterraba do Orvalis (auditoria #37, v0.196.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ("Beetroot", "Beetroot Seeds", "Tutorial:Crop farming") → estado atual → proposta → o dono aprovou os 3 pontos (beterraba primeiro e abóbora/melancia depois; semente silvestre rara; rendimento da Wiki).

## Wiki
Beterraba: **4 idades**; em cada sorteio de crescimento **1/3 não avança**; madura rende **1 beterraba e 1–4 sementes** (colhida cedo, só 1 semente); luz ≥ 9. A Wiki não a dá como semente comum: vem de baús de vila e outras estruturas. Comida: 1 de fome, 1,2 de saciedade; é comida do porco na reprodução.

## Decisão
1. **Cultura da horta (`GARDEN_SPECIES`):** `beterraba`, planta-se com a **Semente de Beterraba** na terra arada, 4 idades (0 a 3, `BEET_MAX_AGE`), crescimento por random ticks com a fórmula já existente (`growChance`) e o **descarte de 1/3** (`BEET_SKIP`) — só a beterraba.
2. **Colheita:** só madura (verde → "Ainda está crescendo", como a horta). Rende **1 beterraba e 1–4 sementes** (`harvestOf(…).extra`, sorteio por `hash2`); sem lugar na mochila, as sementes caem no chão (`seed:…`). **Adaptação:** a planta volta a broto (convenção da horta do Orvalis, ADR 0113), não é arrancada como na Wiki.
3. **Itens 100 (Beterraba) e 101 (Semente de Beterraba)**, ícones do Drive (`assets-src/orvalis-voxel/{alimentos,cultivos}/`); comida por `foodOf` (1; 1,2); **atlas de itens 4 × 26** (104 células, ids até 101).
4. **Semente silvestre rara (adaptação):** quebrar capim solta Semente de Beterraba em 1 de 24 (como o tomate), porque o Orvalis não tem os baús de vila da Wiki (`wildSeedAt`).
5. **Porco:** a beterraba entra em `BREED_FOOD` (ADR 0125): cenoura, batata ou beterraba, como na Wiki.
6. **Atlas da horta** (`orvalis-horta-16px.webp`): 256 × 16, 16 quadros; os 4 da beterraba (idades 0 a 3) ficam **depois** dos 12 das outras espécies (`gardenFrame`), sem reorganizar o que existe. `GARDEN_FRAMES` 16.

## Fora do escopo
Abóbora e melancia (caule de 8 estágios e fruto como bloco: entrega própria), cacau, verruga do Nether, flor-tocha e planta-jarro (sem fonte no Orvalis), as 8 idades do trigo/cenoura/batata (auditoria própria da horta), sementes da galinha além da de trigo, farinha de osso.

## Consequências
Sem mudança de gerador, de save (a espécie nova entra no campo `crops` existente) nem de protocolo. Testes: `titan/orvalis/beterraba.test.ts` (8) e ajustes nos limites de item e de sementes silvestres.
