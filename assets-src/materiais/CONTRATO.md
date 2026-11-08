# Contrato de entrega — Materiais V2 (ADR 0023)

Resumo operacional do pacote `docs/materiais-v2/` (02, 03, 04). Em dúvida, vale o pacote.

## Pasta de cada material

```
assets-src/materiais/<material>/      nome em pt-BR, minúsculas, sem acento (areia, terra, grama, pedra…)
  top.png            128×128, opaco, repetível nos 4 lados, sem perspectiva nem sombra de cubo
  front.png          opcional; 128×128, opaco, repetível nos 4 lados (como o topo): o motor fatia a textura inteira,
                     uma fatia por nível da pilha. SEM front.png a frente repete o topo (regra do dono do produto)
  front_overlay.png  opcional; franja (grama, neve, musgo, terra arada, caminho) nos 32 px de cima (no máximo), alfa no
                     resto; borda esq. = dir. Franja maior é recusada pelo pipeline (o importador corta com --fit-fringe).
                     Cor das bordas sem halo: o importador limpa o que sobrar de recorte
```

Diferenças para o pacote original (decisões de 2026-11-07, ADR 0023): **frente de 18 px** no mundo (não 16) e **frente
seamless nas 4 bordas, usada inteira** (não a janela 128×64 do alto): cada nível de uma pilha lê as próximas 72 linhas
(18 px no mundo), voltando ao começo no fim, e a parede fica contínua na vertical. A franja segue o pacote (janela
128×72, até 32 px, só no nível mais alto da pilha).

```
  PROVISORIO.txt     só em arte provisória; apague ao trocar pela oficial
```

- Luz geral do alto à esquerda, só microvolume; nada de sombra projetada forte.
- Sem símbolos cortados na borda; a frente repete nos quatro lados (esquerda casa com direita, **de cima com a de baixo**).
- Detalhes que parecem camadas horizontais (estratos) aparecem em todo nível da pilha; o desenho é fatiado de cima para baixo.
- Sem frente própria a frente é o topo: mande `front.png` só quando o material precisar de outra cara de lado.

## Gerar

```bash
python3 scripts/import-material.py terra --top terra.png            # arte enviada → pasta (reduz para 128 como ladrilho)
python3 scripts/import-material.py grama --top grama.png --overlay franja.png [--fit-fringe]   # franja > 32 px: guarda os 32 de baixo
# Caminho de Terra e Terra Arada: sem front.png; a frente deles é a de `terra` (regra em V2_BLOCKS)
python3 scripts/build-materials.py --preview   # valida, gera src/assets/materials-v2.{webp,json}; 3×3 em _preview/
```

O relatório mostra a altura da franja (recusa acima de 32 px) e a emenda relativa de cada topo/frente (1,0 = invisível; ⚠ acima de 1,6) e recusa arquivos fora do
contrato (tamanho, transparência no topo ou na frente, franja acima de 32 px). Confere a emenda da frente nos dois eixos.

## Compor blocos

Em `src/render/materialsV2.ts` (`V2_BLOCKS`): `{ top, front, overlay? }` por bloco. Ex.: grama = topo `grama` + frente
`terra` + franja `grama` (a frente de terra é o topo da terra). Ver no jogo: o V2 já é o padrão (`?blocos=legado` volta ao antigo), `?materiais=1`
(legado × V2, só no dev) e `?escala=1` (cena de escala).

## Transições por par (v0.87.0)

O dono do produto envia a **pintura do par** (um quadro quadrado, um chão de cada lado, divisa irregular no meio) e
`python3 scripts/import-transition.py <forma> pintura.png --invader left|right [--overlay 40]` deriva a forma (alfa, com
o material que avança sólido à esquerda; classificação de cor + divisa por linha) e, com `--overlay`, a **faixa pintada**
(espuma, água rasa, halo) em volta da divisa. O `build-materials.py` gira a forma e a faixa (a textura nunca gira),
monta os cantos e grava por peça máscara, halo (fora da forma) e espuma (dentro). Nome da forma = `<avança>-<recebe>`
(ex.: `agua-areia`); a regra do par fica em `render/transitions.ts`. Pintura do par = fonte da forma; não vira textura.

## Máscaras de transição (v0.85.0 — formato antigo, ainda aceito por `import-mask.py`)

Uma máscara é uma **forma** (só o canal alfa); a textura que aparece por ela é o topo do material que avança e nunca gira.
- **Arquivo:** PNG quadrado com alfa, a parte sólida à **esquerda** e a borda irregular à **direita** (o material vem do
  oeste). Importar: `python3 scripts/import-mask.py <nome> arquivo.png` → `assets-src/materiais/_mascaras/<nome>.png`
  (256×256, só alfa). A cor do arquivo é descartada.
- **O script gira** a forma para N, E, S, O e **monta os 4 cantos** (ponta para vizinho só na diagonal) e grava
  `src/assets/transitions-v2.webp` (`build-materials.py`). Para um canto diferente, mande uma forma de canto à parte.
- **Bordas que se encontram:** a irregularidade deve repetir de cima para baixo (a borda de uma célula continua na de baixo).
- **Quem avança sobre quem** é regra do catálogo (`render/transitions.ts`, `TRANSITION_RULES`), não da arte.
