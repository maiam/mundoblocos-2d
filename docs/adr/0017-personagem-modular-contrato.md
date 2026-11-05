# ADR 0017 — Personagem modular: contrato de arte v02, exportador e fontes fora do git

**Status:** aceito (2026-11-05), para o piloto. Revisar depois do primeiro teste no cenário.

## Contexto
A área de arte entregou o humano chibi v01 (~577 MB): caminhada 8×4 com linhas frente, costas, esquerda, direita;
repouso só frontal 6×4; quadro 384 × 512; corpo com roupa verde embutida; fontes Krita/ORA de até 50 MB. O motor
(`render/character.ts`) espera folhas 4×4 na ordem frente, esquerda, direita, costas, esticadas para uma altura fixa.
Medido contra a heroína: o desenho cabe no mundo (na mesma altura, ~1,1 célula de largura; reduzido a 40 %, ~490 kB
para 10 folhas), mas cada formato diferente viraria caso especial no motor. Ainda há pouca arte feita.

## Decisão (arte + motor, 2026-11-05)
1. **A arte se adapta a um contrato** (`assets-src/personagens/CONTRATO.md` + `entrega/v02/contrato.json`); o
   **exportador** faz o trabalho mecânico (recorte, redução, WebP, manifesto); o **motor muda uma vez**, depois do piloto.
2. Quadro mestre 384 × 512; âncora (192, 471) = raiz no mundo, não a borda do desenho; pés tocam a linha só nos
   quadros de contato. **Escala fixa do mestre** (corpo-base 360 px = 2,2 células), independente do recorte.
3. Uma linha por direção (frente, esquerda, direita, costas), desenhadas de verdade; quadros, fps uniforme, ciclo,
   caixa e contato **por ação**, no manifesto.
4. **Uma caixa de recorte por ação**, comum a direções, quadros e peças; o validador recusa o que sai dela; aumentá-la
   é decisão explícita (muda imagem e âncora, não a escala).
5. Três nomes: **encaixe** (onde), **peça** (item do catálogo), **parte** (camada de desenho). A ordem é das partes:
   padrão + exceção por direção inteira; peça que cruza o corpo é dividida em parte de trás e da frente.
6. Contato dos pés: a arte indica quadro, pé e caixa do pé; o validador mede ±2 px no mestre; marcha e deslizamento
   são revisão visual.
7. Pastas: `entrega/v02` e `previas/v02` (≤ 1 MB por arquivo) versionadas; `_trabalho/` e `_arquivo/` (Krita, ORA,
   estudos, v01) **fora do git** pelo `.gitignore`, com cópia em nuvem pela arte.
8. **Exportador mínimo** (`scripts/export-personagem.py`): só valida e exporta o piloto; cresce depois que o piloto
   confirmar as regras de sobreposição. Nada entra em `src/assets/` antes da aprovação.

## Consequências
- **v0.48.0**: implementado para teste (`render/modular.ts`, `modularCharacter.ts`, `?personagem=chibi`).
- O motor ganhará um tipo de personagem modular que desenha cada quadro no tamanho dele × `escalaMundo` (sem esticar
  para altura fixa, evitando as razões 297/288 das folhas de ação atuais), com camadas pela ordem do manifesto.
- Aparência no salvamento (`SAVE_VERSION`) e no multiplayer (`PROTOCOL_VERSION`) só quando a integração exigir.
- Ferramentas/golpes do chibi ficam para depois da biblioteca básica; até lá a heroína atual continua.
