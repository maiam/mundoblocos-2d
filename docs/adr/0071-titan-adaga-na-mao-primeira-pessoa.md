# ADR 0071 — Titã: Adaga de Rocha na mão, em primeira pessoa (v0.128.0)

**Status:** Aceita. Arte do dono do produto (pacote "Adaga de Rocha" do Drive: GLB com 3 peças, mapas 4K, cenas Blender) com **orçamento de 2 MB** para o arquivo. Primeiro item 3D na mão do Titã; antes o item aparecia só como ícone de 32 px.

## Decisão
1. **Asset leve** (`src/assets/titan-adaga-rocha.glb`, **338 KB**): o GLB original tem 11,5 MB (acima do que o conector do Drive baixa e do orçamento). `scripts/export-titan-adaga.py` (bpy + Pillow) abre `Adaga_de_Rocha_Rig.blend`, mantém as 3 peças (lâmina de basalto, cabo de junco, amarração de fibra; **6.272 triângulos**) sob o pivô `CTRL_Adaga` com `Socket_Palma` (palma da mão; ponta +Y), troca o material por um só BaseColor reduzido de 4096 para **1024 px em WebP** (`EXT_texture_webp`) e descarta normal/ORM (o jogo não usa luzes de cena). Fontes ficam no Drive.
2. **`render/heldItem.ts`**: `loadHeldModel` carrega o GLB (GLTFLoader), usa o material do renderer (`MeshBasicMaterial` + `patchDayLight`, a luz do dia do Titã) e dá sombreado fixo por face (`color`) e `glow` zero, como no rig do Farejador.
2b. **`render/heldPose.ts` (puro)**: `REST`, `swingCurve` e `handPose(swingT, time)` em espaço de câmera; golpe de `SWING_S = 0,34 s` (recua, corta, volta) e balanço de milímetros parado.
3. **No `TitanRenderer`**: cena e câmera próprias da mão (`handScene`/`handCamera`), desenhadas depois do mundo com a profundidade limpa (a mão não entra em paredes); `setHeld(item)` carrega o modelo na primeira vez que a adaga (id 22) é escolhida, em segundo plano (falha = sem mão, só aviso no console); `swingHand()` dispara o golpe; o `titanGame` chama `setHeld` a cada quadro com o item selecionado e `swingHand` em `strike` (golpe no Farejador).
4. Só a Adaga de Rocha tem modelo; outros itens seguem sem mão (a tabela de modelos é o `if (item !== 22)` de `setHeld`: um segundo modelo exige trocá-lo por um mapa item → URL).

## Consequências
- Custo: +338 KB carregados só quando a adaga é escolhida; um desenho extra e uma limpeza de profundidade por quadro com modelo na mão.
- Pendências: escala e posição ajustadas só no desktop a 740 × 360 (validar em aparelho); golpe também ao quebrar bloco com a adaga; modelo da adaga de cobre e das picaretas; normal/ORM não usados; adaga no chão (item solto) continua sprite.
- Testes: `heldPose.test.ts` (+3: curva, pose e estrutura/tamanho do GLB).
