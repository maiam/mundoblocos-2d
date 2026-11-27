# ADR 0129 — As 8 idades da horta: trigo, cenoura e batata (auditoria #40, v0.198.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ("Tutorial:Crop farming", "Carrot", "Potato") → estado atual → proposta → o dono aprovou os 4 pontos ("Sim. Pode seguir com sua recomendação").

## Wiki
Trigo, cenoura e batata têm **8 idades** (0 a 7); cenoura e batata mostram 4 aparências. Crescimento por sorteios com bônus de terra úmida (a fórmula que o Orvalis já usa). Madura: trigo rende **1 trigo e 1–4 sementes**; cenoura e batata, **2–5** (a batata tem 2 % de batata venenosa).

## Antes
Trigo, cenoura, batata e tomate tinham 3 fases (idade 0 a 2), maduras na 2, rendiam 2 unidades e a planta voltava a broto; amadureciam em ~3 min.

## Decisão
1. **Trigo, cenoura e batata passam a 8 idades** (`EIGHT_AGE_SPECIES`, maduras na 7, `maxAgeOf`). O **tomate segue com 3 fases** (é do Orvalis, fora da Wiki) e a beterraba, com 4 (ADR 0127). Amadurecem ~3,5× mais devagar (~10 min em terra bem úmida).
2. **Rendimento da Wiki** (`harvestOf`): trigo = 1 trigo + 1–4 sementes de trigo; cenoura e batata = 2–5 (`countMax`, sorteio por `hash2`); tomate = 2. **Batata venenosa fica fora** (sem efeitos no Orvalis). Convenção do Orvalis mantida: a planta volta a **broto** ao colher e planta verde não se colhe.
3. **Atlas da horta de 784 × 16 (49 colunas)**: `GARDEN_LAYOUT` dá a primeira coluna e as idades de cada espécie (trigo, cenoura, batata × 8; tomate × 3; beterraba × 4; caule de abóbora e de melancia × 8; os dois caules conectados). `gardenFrame` lê o layout; `GARDEN_FRAMES` 49, `GARDEN_MESHES` 57, `STEM_ATTACHED_COL` 47.
4. **Arte pelas regras do pacote Cultivos** (`ages8` em `make-orvalis-horta.py`): trigo = sprites novos 1, 2, 3, 4 e 6 e as fases antigas 1, 2 e 3 nas idades 0, 5 e 7; cenoura e batata = fase 1 (idades 0–1), fase 2 (2–3), aparência 03 (4–6) e fase 3 (7).
5. **Migração do save: `TITAN_SAVE_VERSION` 7.** Em saves até a v6, as plantas gravadas de trigo, cenoura e batata trocam a idade antiga: **0 → 0, 1 → 3, 2 → 7** (a madura continua madura); tomate, beterraba e caules não mudam (`validCrops(…, saveVersion)`); saves já na v7 não mudam.

## Consequências
Sem mudança de gerador nem de protocolo (o servidor não precisa de `sync-net`). Testes: `titan/orvalis/oitoIdades.test.ts` (8) e ajustes nos testes da horta, da beterraba e da abóbora.
