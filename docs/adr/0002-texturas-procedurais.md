# ADR 0002 — Texturas procedurais em canvas com cache por chunk

**Status:** aceito (2026-11-01)

## Contexto
Estética de ilustração anime/RPG sem depender de assets externos (licença, peso, pipeline de arte).

## Decisão
- Cada textura é pintada uma vez em canvas 32×32 com primitivas (gradientes, arcos, bezier), PRNG fixo por id.
- Cada chunk é pré-renderizado num canvas offscreen e reutilizado até sua `version` mudar.

## Consequências
- Bundle pequeno (~43 kB JS), identidade visual consistente e ajustável por código.
- ~1 MB de memória por chunk em cache; descarregamento e pool de canvases limitam o total.
- Substituir por sprites desenhados à mão no futuro só exige trocar `textures.ts`.
