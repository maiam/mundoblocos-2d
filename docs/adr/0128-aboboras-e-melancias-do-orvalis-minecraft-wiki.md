# ADR 0128 — Abóbora e melancia do Orvalis (auditoria #39, v0.197.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ("Tutorial:Pumpkin and melon farming", "Melon", "Pumpkin", "Drops", "Shears") → estado atual → proposta → o dono aprovou os 4 pontos ("Sim pra todas": escopo, semente silvestre rara, rendimento e fabricações, caule conectado girado em 90°).

## Wiki
O caule cresce em **8 estágios**; maduro, tenta gerar o fruto (bloco) num dos **4 blocos vizinhos**, que precisa estar livre e sobre terra (≈ 272 s por fruto, luz ≥ 9). Com o fruto, o caule vira **conectado** e aponta para ele; sem o fruto, volta a tentar. Melancia solta **3–7 fatias**; o caule quebrado solta 0–3 sementes; abóbora é bloco de construção (esculpida exige tesoura). Fatia de melancia: 2 de fome, 1,2 de saciedade; 1 fatia → 1 semente; 1 abóbora → 4 sementes (fabricação).

## Decisão
1. **Culturas da horta** `abobora` e `melancia` (`GARDEN_SPECIES`), plantadas com a semente na terra arada, **8 idades** (`STEM_MAX_AGE` 7), crescimento pelos random ticks já existentes (`growChance`, luz mínima, terra úmida).
2. **Fruto como bloco (`stemFruitTick`):** caule maduro e sem fruto, com luz ≥ 9 e na chance de crescimento da terra, escolhe 1 das 4 direções; se a célula está livre (ar, sem planta nem item) sobre **grama, terra, terra infértil ou terra arada** (`fruitGround`), o fruto nasce ali (`FRUIT_BLOCK`) e o caule guarda a direção (`Crop.dir`). Sem o fruto (quebrado), `dir` some e o caule volta a tentar.
3. **Blocos 152 (Melancia) e 153 (Abóbora)**: cubos opacos, topo e base iguais, lateral própria (arte do pacote Cultivos), dureza 1 e machado (`HARDNESS`, `blockToolOf`).
4. **Itens 102 Semente de Abóbora, 103 Semente de Melancia, 104 Fatia de Melancia, 105 Bloco de Abóbora** (ícones do Drive; o do bloco é o topo da abóbora); **atlas de itens 4 × 27** (108 células). A **melancia solta 3–7 fatias** (hash da célula) e nunca o bloco; a abóbora volta como Bloco de Abóbora; a fatia não se coloca. Comida da fatia: 2 / 1,2.
5. **Colheita:** o caule **não se colhe** (`collectCrop` recusa: "O fruto vem logo / está ao lado"). Quebrar a terra sob o caule solta **0–3 sementes** (Wiki), por hash.
6. **Fabricação (estação pessoal):** Bloco de Abóbora → 4 Sementes de Abóbora; Fatia de Melancia → 1 Semente de Melancia.
7. **Semente silvestre rara (adaptação):** quebrar capim solta a semente de abóbora ou de melancia em 1 de 24 cada (como a beterraba), porque o Orvalis não tem os baús de vila da Wiki.
8. **Save:** `header.crops` ganha `d` (direção, 0 a 3) no caule maduro conectado — campo opcional, sem versão nova; leitura com validação.
9. **Visual:** atlas da horta de **544 × 16** (34 quadros: + 8 idades de cada caule + o conectado de cada); o conectado é uma **placa dupla face** no plano da direção do fruto (`attachedStemGeometry`; para −x/−z a placa se inverte e para ±z gira 90°), **exceção aprovada** à regra de não girar textura por célula (sprite de planta, como diz o pacote); 8 malhas extras (`GARDEN_MESHES` 42).

## Fora do escopo
Abóbora esculpida e golens, torta de abóbora, bloco de melancia por fabricação, bloco de melancia como item, as 8 idades da horta antiga (trigo, cenoura, batata), sementes da galinha além da de trigo, farinha de osso.

## Consequências
Sem mudança de gerador nem de protocolo (o servidor não precisa de `sync-net`); sem `TITAN_SAVE_VERSION` nova. Testes: `titan/orvalis/abobora.test.ts` (14) e ajustes nos limites de item e de semente silvestre.
