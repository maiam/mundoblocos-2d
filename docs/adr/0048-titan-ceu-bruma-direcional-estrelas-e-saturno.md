# ADR 0048 — Titã: céu com bruma direcional, noite mais escura e fria, estrelas discretas e Saturno raro

**Status:** aceito (dono do produto, 19/11/2026: céu mais rico em bruma, mais escuro à noite, com Saturno aparecendo raramente). Estende a ADR 0041 (ciclo de céu).

## Decisão
1. **Cúpula em shader** (`render/titanSkyDome.ts`): a esfera que acompanha a câmera deixa de usar cores nos vértices e vira um `ShaderMaterial`; tudo é função da direção do olhar e de uniforms, então mudar a hora **não refaz nenhuma malha** (mesma regra da ADR 0041). Cores entram em sRGB e saem pelos mesmos trechos de mapa de tons e espaço de cor do Three.js.
2. **Bruma direcional** (`sky.ts`: `glowDir`, `glow`, `glowK`, `cool`, `coolK`, `haze`): a claridade tem lado. Ao nascer ela vem do **leste** (pêssego), de dia acompanha o Sol (halo largo e suave, mais forte rente ao horizonte; o núcleo continua o ponto quadrado pequeno), no pôr do sol o **oeste** guarda a última claridade (cobre) enquanto o resto escurece, e na noite o cobre cai a ~4% até voltar a leste antes do amanhecer. O lado oposto ao Sol ganha um ocre mais frio (`cool`). Duas faixas finas de bruma baixa derivam devagar.
3. **Névoa na cor do céu daquele lado** (`horizonAt`, pura): a cor da névoa e do fundo é recalculada a cada giro do olhar (só números) com a mesma conta do shader na altura 0, de modo que a costa distante some na cor do céu para onde se olha, principalmente no poente.
4. **Noite mais escura e fria:** `ambient` 0,3 → 0,22 e um `tint` de luz ambiente (vetor: quente de dia, `[0,84; 0,95; 1,22]` de noite): o uniform `uAmbient` dos materiais do terreno passa de `float` para `vec3`. A costa fica legível em tons frios e a lanterna domina perto do jogador; o horizonte da noite é carvão com resto de cobre.
5. **Estrelas discretas** (`stars` 0–1: aparecem depois do pôr do sol e somem antes do amanhecer): poucos pontos fracos perto do zênite, sumindo em direção ao horizonte, com cintilação lenta (a quantidade é decisão de arte: ~0,75% das células).
6. **Saturno raro** (`saturnVisibility(day, frac, seed)`, pura e determinística): em ~12% dos dias, **uma janela curta** (~10 s de jogo) em plena luz do dia, num horário que varia de dia para dia; sempre no **mesmo ponto do céu** (nordeste, ~35° de altura, `SATURN_DIR`), como a face fixa de Titã. Aparece como um **trecho tênue dos anéis** e um disco quase apagado, somado à bruma (nunca um disco nítido), e é **encoberto abaixo de certa altura**. O contador `session.days` (+1 quando o relógio vira) vai no save (`header.days?`, ausente = 0; sem mudar `TITAN_SAVE_VERSION`) só para escolher esses dias. Outras luas ficam de fora do céu cotidiano.
7. **Testes visuais:** `?hora=` ganha `crepusculo` (tick 12 900); `?saturno=1` força o Saturno à vista (não grava).

## Consequências
- O Sol continua o sprite quadrado (só aparece alto); o halo é do shader.
- `TitanRenderer.setSaturn`/`setSky` e o shader cuidam do céu; `patchDayLight` e a luz ambiente passam a usar `Vector3`.
- Fora desta entrega: sons, nuvens (Y = 192), outras luas por altitude ou instrumento.
