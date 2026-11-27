# ADR 0124 — Fauna de fazenda do Orvalis: porco, vaca, ovelha e galinha (auditoria #35, v0.193.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki → estado atual → proposta → o dono aprovou os 4 pontos (escopo só de comportamento, geração e espólio; espólio da Wiki; gerador v3; arte só em texturas, com a regra de caixa da Wiki registrada).

## Contexto
O Orvalis em voxel não tinha fauna: o motor de animais (`titan/creature.ts`, `combat.ts`) é só do **Farejador de Duna** do Titã (hostil, preso à toca, com espólio fixo, ADR 0061/0069). O dono pediu galinha, ovelha, vaca e porco e entregou a arte no Drive (`Mobs64px`, pacote com um atlas UV de 64 × 64 por animal e o mapa `mobs64px-uv.json` com caixas, pivôs e UV).

## Wiki (Pig, Cow, Sheep, Chicken, Hitbox, Mob spawning)
Vida: porco 10, vaca 10, ovelha 8, galinha 4. Caixa de acerto (Java): porco 0,9 × 0,9; vaca 0,9 × 1,4; ovelha 0,9 × 1,3; galinha 0,4 × 0,7 (largura × altura; filhote = metade; Bedrock difere). Geração: grupos de 4, em grama, pesos da Planície ovelha 12, galinha 10, porco 10, vaca 8; a geração de chunk sorteia grupos com probabilidade 0,1. Espólio: porco 1–3 carne crua; vaca 0–2 couro e 1–3 carne bovina; ovelha 1 lã (sem tosquia) e carneiro; galinha 0–2 penas e frango cru. Comida: carne de porco/bife 3 → 8 (assada), carneiro 2 → 6, frango 2 → 6.

## Decisão
1. **Motor próprio e puro de animais passivos** — `titan/fauna.ts` (espécies, geração `faunaSpecs`, passeio, fuga, caixa e mira, espólio, pose). O Farejador **não muda**. `session.fauna` guarda os animais (só de execução, **fora do save**).
2. **Regra de caixa da Wiki para mobs (registro permanente):** *a caixa de acerto e de mira de um mob é a da Wiki (Java), em largura × altura, centrada nos pés; o desenho (caixas do pacote de arte) é livre e pode diferir dela.* O golpe e a mira leem só `faunaBox`; nunca a malha. Alturas dos olhos da Wiki, para uso futuro: vaca 1,3; ovelha 1,235; porco 0,765; galinha 0,644. Filhotes (reprodução, fora do escopo): metade da caixa.
3. **Geração (`ORVALIS_GENERATOR_VERSION` 3):** por chunk de 16 × 16, enquanto o sorteio ficar abaixo de `GROUP_CHANCE`, um grupo de 4 (até 3 por chunk) da espécie sorteada pelos pesos, cada membro a ±4 do ponto do grupo, em **grama acima da água (Y ≥ 64) com 2 blocos de ar em cima**. A v3 só liga a fauna: o terreno é o da v2 (teste). **Probabilidade de grupo:** a v3 usou 0,4 (adaptação, 66 animais na seed 42); **a v4 (v0.194.1, decisão do dono) usa 0,1, a da Wiki** (`groupChanceFor`): ~12 a ~31 animais por seed. A v3 mantém o 0,4. v ≤ 2 e o Titã não têm fauna (`hasFauna`).
4. **Comportamento:** passeia em volta de casa (raio 6, pausas), foge por 5 s no sentido oposto ao do golpe (pânico 1,25×; galinha 1,4×) e fixa a nova casa onde parou. Anda na física do jogador (`stepBody`; colisão de 0,6 × 1,8 m, **dívida:** não é a caixa da Wiki). Velocidades em m/s são provisórias (a Wiki só dá o atributo).
5. **Golpe e espólio:** `combat.attackFauna` usa a mesma arma, dano e desgaste do Farejador (toque curto, 3 m, pausa 0,6 s); abatido, solta o espólio da Wiki no chão (`faunaLoot`, sorteio por `hash2`) e **não volta** na sessão (reabrir traz a seed de novo; o abate não vai ao save — dívida).
6. **Itens 89–99 (faixa do Orvalis, ADR 0114):** 89 Couro, 90 Lã, 91 Pena, 92/93 Carne de Porco crua/assada (costeleta), 94 Carne Bovina crua e 95 Bife, 96/97 Carneiro cru/assado, 98/99 Frango cru/assado (**todos os ícones do Drive**, v0.193.1). Comida por `foodOf` com os valores da Wiki; a Fornalha assa cada uma (receitas `assar-*`, estação `furnace`, uma por vez). **Atlas de itens 4 × 25** (100 células): item novo é o 100.
7. **Arte:** só as texturas (atlas UV de 64 × 64 por animal, `src/assets/orvalis-fazenda-*.webp`, importados em `render/art/titan.ts`) e os modelos em caixas articuladas de `fazenda-modelos.json` (frente −Z, 16 unidades por bloco), montados por `render/fazenda.ts` (geometria e textura compartilhadas; juntas animadas pela `FaunaPose`). Filtro vizinho mais próximo. Sem GLB, sem rig.

## Fora do escopo (pendências registradas)
Reprodução, filhotes e crescimento; leite (balde); tosquia e lã que recresce; ovos; galinha com queda lenta; intoxicação do frango cru; geração contínua e despawn; morte por fogo (carne assada); luz do céu nos animais; abate persistente no save; caixa de colisão da Wiki na física; sons dos animais; sala multiplayer (salas são só do Titã, ADR 0104).

## Consequências
- Mudou o gerador do Orvalis (v3): partidas novas têm fauna; saves antigos continuam na v2, sem animais.
- `TITAN_PROTOCOL_VERSION` e o pacote da sala **não mudam** (fauna só no aparelho); o servidor não precisa de `sync-net` por esta entrega.
- Testes: `titan/orvalis/fauna.test.ts` (27: números da Wiki, geração pura e em grama, caixa, fuga, espólio, abate, itens, comida, receitas).
