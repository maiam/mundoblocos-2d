# Contrato de entrega — Materiais V2 (ADR 0022)

Resumo operacional do pacote `docs/materiais-v2/` (02, 03, 04). Em dúvida, vale o pacote.

## Pasta de cada material

```
assets-src/materiais/<material>/      nome em pt-BR, minúsculas, sem acento (areia, terra, grama, pedra…)
  top.png            128×128, opaco, repetível nos 4 lados, sem perspectiva nem sombra de cubo
  front.png          128×128; só a janela (0,0,128,64) é usada — opaca; o resto pode ser transparente
                     (durante a comparação 16×18 o pipeline também lê (0,0,128,72): pinte até a linha 72)
  front_overlay.png  opcional; franja (grama, neve, musgo) nos 32 px de cima, alfa no resto; borda esq. = dir.
  PROVISORIO.txt     só em arte provisória; apague ao trocar pela oficial
```

- Luz geral do alto à esquerda, só microvolume; nada de sombra projetada forte.
- Sem símbolos cortados na borda da janela; frente repetível na horizontal (esquerda casa com direita).
- Topo e frente podem ser o mesmo desenho se a janela 128×64 fizer sentido como frente.

## Gerar

```bash
python3 scripts/import-material.py terra --top terra.png            # arte enviada → pasta (reduz para 128 como ladrilho)
python3 scripts/import-material.py grama --top grama.png --front assets-src/materiais/terra/top.png --overlay franja.png
python3 scripts/build-materials.py --preview   # valida, gera src/assets/materials-v2.{webp,json}; 3×3 em _preview/
```

O relatório mostra a altura da franja (⚠ acima de 32 px) e a emenda relativa de cada topo/frente (1,0 = invisível; ⚠ acima de 1,6) e recusa arquivos fora do
contrato (tamanho, transparência no topo ou na janela da frente, franja abaixo da linha 72).

## Compor blocos

Em `src/render/materialsV2.ts` (`V2_BLOCKS`): `{ top, front, overlay? }` por bloco. Ex.: grama = topo `grama` + frente
`terra` + franja `grama`. Ver no jogo: `?blocos=v2` (mundo) e `?escala=1` (cena de comparação).

## Máscaras de transição (Etapa 3, ainda não implementada)

`assets-src/materiais/_mascaras/`: ~13 formas 128×128 só no canal alfa (reta, canto interno, canto externo, ponta,
ilha, faixa…). O script gira/espelha as formas para cobrir as 47 combinações de 8 vizinhos — máscara é **forma**, não
textura, então girar é permitido (CONVENTIONS). A textura que aparece pela máscara nunca é girada.
