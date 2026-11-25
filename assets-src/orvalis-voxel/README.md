# Orvalis em voxel — fontes de textura

- `texturas32/orvalis/<tile>.png`: **fonte editável** de cada tile do atlas (`npm run texturas`; qualquer tamanho quadrado, reduzido a 32 px por média de área). Ver `docs/OPERATIONS.md`.
- **Escolhidas pelo dono do produto (Drive `orvalis/Texturas32px`, 25/11/2026):** `grama-topo` (grama), `grama-lateral` (terra com grama no topo), `terra`, `pedra-topo` e `pedra-lateral` (a mesma pedra), `tora-betula-topo` e `tora-betula-lateral`. Originais de 2048 px (a grama, 1024 px) com a marca d'água do gerador no canto inferior direito **removida** (trecho de cima copiado por cima) e guardados a **256 px** (média 8×: o resultado a 32 px é idêntico ao dos 2048); os originais seguem no Drive.
- **Ainda dos Materiais V2 / provisórias:** areia da praia, toras e folhas de carvalho e de cerejeira, folhas de bétula (procedurais).
- `extras/`: `terra-arada`, `terra-infertil` e `terra-caminho` (também do Drive, mesmo tratamento): **sem bloco ainda** no Orvalis em voxel (cultivo e trilha são fatias futuras; ver `docs/NEXT_STEPS.md`).
- `agua/agua_32px.png`, `icones32/`: derivados (água editável; ícones refeitos pelo script a partir dos tiles).
