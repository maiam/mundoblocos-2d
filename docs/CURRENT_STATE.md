# Estado atual

_Atualizado em 2026-11-01 — v0.1.0_

## Funcional
- Mundo procedural por seed (`?seed=`), chunks 16×16 gerados sob demanda e descarregados quando distantes
  (chunks editados permanecem em memória).
- Terreno com colinas/montanhas, lagos no nível do mar (gelo na tundra), cavernas (túneis + salões),
  minérios (carvão, ouro, cristal de mana) por profundidade, rocha-mãe irregular.
- 5 biomas: Tundra Gélida, Campos Verdejantes, Bosque de Sakura, Floresta Encantada, Dunas Douradas,
  com árvores (copa redonda, pinheiro, cacto) e enfeites (capim, flor, cogumelo luminoso) contínuos entre chunks.
- Render estilo RPG/anime: 25 blocos com texturas procedurais, bevel de cubo, tufos de grama, sombra de contato,
  parede de fundo em cavernas, escurecimento por profundidade, brilho pulsante de blocos mágicos.
- Fundo parallax: ciclo dia/noite (8 min), sol/lua, estrelas, nuvens cel-shaded, montanhas, ilhas flutuantes.
- Partículas por bioma (pétalas, vagalumes, neve, poeira, pólen).
- Interação: quebrar/colocar blocos, hotbar 1–9, zoom, pan por teclado/arrasto, overlay de chunks (G).
- HUD com bioma, coordenadas de bloco/chunk, chunks carregados, período, seed, FPS.

- Versão jogável publicada como Artifact (ver `OPERATIONS.md`).

## Limitações conhecidas
- Edições não são persistidas (perdem-se ao recarregar).
- Sem personagem/física; câmera livre.
- Água é estática (sem fluxo).
- Iluminação é aproximação por profundidade em relação ao terreno **gerado** (escavar não "ilumina").

## Qualidade
- `npm test`: 10 testes do domínio world passando. `npm run build` limpo.
