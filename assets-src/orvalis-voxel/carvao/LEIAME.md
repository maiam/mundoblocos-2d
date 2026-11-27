# Família do carvão — pacote P2-09 (Drive `Banco de Assets/itens-de-minecraft/P2-09 — Mineração e metalurgia`, 27/11/2026)

8 PNGs de **16 × 16 px** RGBA, com os nomes do Drive. Ampliar sempre por vizinho mais próximo.

| Arquivo | O que é | Estado |
|---|---|---|
| `orvalis_carvao_vegetal_icone_16x16.png` | Carvão Vegetal (item 84) | **no jogo** desde a v0.187.1 (cópia em `assets-src/titan/arte16/`, lida por `itens.json`) |
| `orvalis_carvao_mineral_icone_16x16.png` | Carvão (mineral) | fila |
| `orvalis_minerio_carvao_icone_16x16.png`, `…_textura_16x16.png` | minério de carvão na pedra | fila |
| `orvalis_minerio_carvao_ardosiabissal_icone_16x16.png`, `…_textura_16x16.png` | minério de carvão na ardósia abissal | fila |
| `orvalis_bloco_carvao_icone_16x16.png`, `…_textura_16x16.png` | bloco de carvão | fila |

## Estado
**No jogo (v0.189.0, ADR 0122):** carvão vegetal (item 84), carvão mineral (item 87, ícone em `arte16/`), textura do minério (tile `orvalis/minerio-carvao`) e do bloco de carvão (tile e ícone, item 88). Só o minério em ardósia abissal (ícone e textura) e o ícone do minério/bloco pré-renderizados seguem em fila. O **carvão mineral**, o **minério** (geração de veios, regra de mundo própria — ver `titan/ores.ts`) e o **bloco de carvão** (combustível de 800 s na Wiki) exigem regra de mundo pelo ciclo da ADR 0116; itens do Orvalis ficam na faixa 42+ (ADR 0114) e o atlas de itens 4 × 21 está cheio (o próximo item o amplia).
