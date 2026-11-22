# ADR 0078 — Titã: Picareta de Rocha na mão (v0.137.0)

**Status:** Aceita; **o GLB da picareta foi substituído pelo sprite extrudado de 16 × 16 no ADR 0097 (v0.158.0)**. Arte do dono do produto (pasta "Picareta de Rocha" do Drive: GLB de 3,1 MB com rig, clipe "Minerar" e 3 texturas 1K; ZIP completo com Blender e mapas 4K). Segue o ADR 0071 (adaga): mesmo carregador, mesma cena de mão, orçamento de 2 MB.

## Decisão
1. **Asset leve** (`src/assets/titan-picareta-rocha.glb`, **325 KB**): `scripts/export-titan-picareta.py` (bpy + Pillow) lê o GLB original, extrai o BaseColor, o reduz para 1024 px em WebP e exporta **só a malha** (4.632 triângulos, 60 cm, cabeça de 43 cm, pivô no centro da empunhadura), sem osso `Grip` nem clipe `Minerar`: o golpe é procedural (ADR 0071/0076). Normal e ORM não entram (o jogo usa material sem luzes de cena).
2. **Item 20 (Picareta de Rocha)** passa a ter modelo na mão. `HELD_MODELS` (em `titanRenderer.ts`) mapeia item → arquivo, estilo de golpe e escala (adaga: 22, 1; picareta: 20, 0,8 — tem quase o dobro do comprimento). A picareta de cobre (23) e as adagas de cobre (24) ainda não têm modelo.
3. **Estilo de golpe por item** (`heldPose.ts`, `STYLES`): a adaga corta em diagonal (histórico); a **picareta desce por cima** (repouso com o cabo quase na vertical e a cabeça para cima e à frente; giro de 78° em X, pouco giro de lado, avança 0,22 m). `HandAnim.kind` muda com o item; todo o resto (0,3 s, repetição ao segurar para quebrar, afundamento, balanço) é comum.

## Consequências
- Quebrar bloco com a picareta na mão repete o golpe de picareta (o dano e a rachadura continuam no gesto; o ciclo é visual).
- Pendências: aceite em aparelho; modelos da picareta e da adaga de cobre; usar o clipe "Minerar" (24 quadros) só se o golpe procedural não agradar; picareta na mão aparece também no golpe contra o Farejador.
- Testes: `heldPose.test.ts` (+2: estilos e GLB leve). Conferido a 740 × 360: repouso e 4 fases do golpe.
