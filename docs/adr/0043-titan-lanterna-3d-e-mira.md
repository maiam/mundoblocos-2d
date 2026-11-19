# ADR 0043 — Titã: lanterna em modelo 3D (instâncias) e mira pela caixa do objeto

**Status:** aceito (dono do produto, 19/11/2026, "Prompt para o programador — interação, fragmentos e lanterna 3D de Titã", etapa 2 de 3; pacote de arte "Lanterna da Margem" no Drive). Estende as ADRs 0039–0042.

## Decisão
1. **Fonte de arte:** o pacote `assets-src/titan/lanterna/` (`Lanterna_da_Margem.glb`, `.bbmodel`, `Atlas_Lanterna.png` 32 × 32) é a origem; `scripts/extract-titan-lantern.py` converte para `src/assets/titan-lantern.json` (geometria) e `titan-lantern-atlas.webp` (WebP **sem perdas**; não passa pelo `optimize-assets.py`). O GLB tem 26 cuboides / 312 triângulos, 0,375 × 0,625 × 0,375 m, pivô no centro da base; o script falha se algum desses números mudar.
2. **Dois lotes de geometria:** `structure` (Pedra, Cobre, Grade: 300 triângulos) e `core` (Âmbar, 12 triângulos, o único emissivo). Cada lote é um `InstancedMesh`: **2 chamadas de desenho para qualquer número de lanternas** (cresce dobrando a capacidade), com a matriz = translação para `(x + ½, y, z + ½)`. Atlas com `flipY = false` (UV do glTF), `NearestFilter`.
3. **Mesmo shader do terreno** (`patchDayLight`, ADR 0041): `diffuse *= color × uAmbient + glow`. Estrutura: `color` = sombreado por face (mesmos fatores do mesher) e `glow` quente fraco (recebe o calor da própria luz); núcleo: `color = 0` e `glow = (1,7; 1,15; 0,5)`, ou seja **emite igual de dia e de noite** e a hora **não refaz malha nem instância** (conferido: mudar a hora é só o uniform).
4. **A lanterna sai da malha do terreno:** `meshSection` não gera mais a caixa-proxy; o renderer só refaz as instâncias quando `TitanVolume.lanternVersion` muda (lanterna posta/retirada/carregada do save). O save, o gerador e o protocolo **não mudam**: a lanterna continua sendo o id `T.LANTERN` na célula; um save com lanterna instalada antes desta versão abre com o modelo novo.
5. **Mira pela caixa do objeto** (`titan/lantern.ts`, puro): o raio por células, ao entrar numa célula com lanterna, testa **raio × caixa** (`lanternBox`, com folga `pad`); se erra, **continua** e acerta o que estiver atrás (a célula inteira não bloqueia mais a mira). Folga: mouse 4 cm, toque 14 cm por lado (dedo). O acerto devolve a **face de entrada na caixa** (a colocação usa a célula adjacente a ela) e `box`, e o **contorno** passa a ter o tamanho da caixa do objeto (+ 2 mm) em vez da célula.
6. **Fora desta etapa:** rachaduras seguem só em blocos (lanterna e lasca usam o anel de recolhimento, ADR 0042); gerador v3 e drops são a etapa 3.

## Consequências
- Custo medido (mesma cena, `?cena=lanternas&n=12&fps=1`, Chromium/SwiftShader, mesmo ambiente): triângulos 12 938 → 16 538 (+12 × 312 − 12 × 12), chamadas 26 → 27, JS do desenho p95 1,2 → 1,2 ms, seções refeitas 164 → 164. Aparelho real: pendente.
- `physics.raycast` ganhou o parâmetro `pad` e `Hit.box`; `TitanRenderer` ganhou o atlas da lanterna no construtor e `lanternCount`.
