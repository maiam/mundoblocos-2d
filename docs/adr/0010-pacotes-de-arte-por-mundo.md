# ADR 0010 — Pacotes de arte por mundo

**Status:** aceito (2026-11-02). A parte `?inline`/arquivo único foi substituída pela ADR 0013 (imagens em arquivos
separados); os pacotes por mundo continuam valendo.

## Contexto
Cada artefato (HTML de arquivo único) levava a arte dos dois mundos: o principal chegou a 3,84 MB e o Santuário a
3,29 MB, acima do alerta do build (2,8 MB). Cada folha nova somava 100–150 kB nos dois. A ADR 0008 já previa
"build por mundo com tree-shaking de assets" se crescesse.

## Decisão
- Os imports `?inline` ficam **só** em `src/render/art/<mundo>.ts`, cada um exportando um `ArtPack` (atores,
  atlas, ícones, porta, dungeon, trigo, ícones de itens/ferramentas). Campos ausentes = o mundo não tem aquilo.
- `loadArtPack(mundo)` importa o pacote dinamicamente. Com `VITE_WORLD` fixo no build (artefatos), a condição é
  constante e o Rollup elimina o pacote do outro mundo; `inlineDynamicImports` mantém um JS único.
  Sem `VITE_WORLD` (dev, build genérico), os dois pacotes existem e o mundo escolhido em tempo de execução decide.
- Os consumidores (`blockArt`, `textures`, `celestialArt`, `character`, `itemArt`, `game`) leem o pacote carregado
  e só montam o que veio (ex.: Santuário sem materiais, porta, dungeon, trigo).
- Sprites passam a WebP q84 com alfa q85 (`optimize-assets.py`, diferença média ~2/255); `--recompress` regrava
  os WebP grandes existentes.

## Consequências
- Mundo principal 2,63 MB, Santuário 0,68 MB (antes 3,84 / 3,29 MB). Arte de um mundo não pesa no outro.
- Arte nova: importar no pacote do mundo que a usa (nunca direto num módulo de render).
- `build:artifact` fixa `VITE_WORLD=principal`; `build:artifact:santuario` fixa `santuario`.
