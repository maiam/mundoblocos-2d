# Vale Goblin do Santuário — terreno v1 (seed 641107)

Pacote do dono do produto: `seed.json` (schema `orvalis-terreno-v1`) com 64 × 64 células (alturas 2–32, superfície `grama`/`trilha`/`rocha`), a caverna da borda sul
(`vaziosXZ_YMinInclusivo_YMaxExclusivo`), a fogueira (`[0, 3, -2]`) e 7 goblins. Eixos: X leste, Z sul; células −32..31. Prévias: `previa_isometrica.png`,
`boca_da_caverna.png`, `heightmap_64x64_16bit.png` (altura = round(pixel × 32 / 65535)). O `terreno.glb` do pacote (malha 3,9 MB) não foi guardado: o jogo usa só os dados.

No jogo (ADR 0038): `python3 scripts/make-vale-goblin-data.py` → `src/world/valeGoblinData.ts`; conversão para cubos em `src/world/sanctuaryValeGoblin.ts`.
