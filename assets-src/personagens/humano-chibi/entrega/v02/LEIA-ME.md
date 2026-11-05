# Piloto artístico v02 — caminhada

Estado: **revisão**, 05/11/2026. Cinco peças, sete folhas RGBA de 3072 × 2048 px. Cada folha tem oito
quadros por direção, na ordem **frente, esquerda, direita, costas**. Caminhada a 8 fps, ciclo de um segundo.
Quadro mestre de 384 × 512 px, âncora (192, 471), caixa compartilhada [62, 48, 322, 488].

| Peça | Partes fornecidas |
|---|---|
| `corpo/base` | `corpo`, `cabeca` |
| `cabelo/curto-castanho` | `cabelo-tras`, `cabelo-frente` |
| `tronco/blusa-ocre` | `tronco` |
| `pernas/shorts-marinho` | `pernas` |
| `pes/sapatos-couro` | `pes` |

## Exceção autorizada

O corpo usa **malha bege opaca, totalmente coberta**, provisoriamente, conforme autorização do dono do projeto.
Ela aparece nos braços e nas pernas quando blusa/shorts são usados por cima; não representa pele descoberta.
Não há a regata/shorts verdes do v01. A base definitiva sem roupa integrada permanece pendente. Esta exceção
está em `CONTRATO.md`, `contrato.json` e no catálogo; não equivale a aprovação geral de outros cortes de roupa.

## Origem e montagem

A ferramenta integrada `image_gen` produziu a malha, os sapatos e o recorte de fundo, usando a caminhada
estabilizada do v01 como referência. Cabeças canônicas, cabelo curto, blusa e shorts vieram do v01. Foram
reordenadas as direções, separadas as partes do cabelo e registrados os recortes no quadro comum. O cabelo
foi dividido por profundidade da câmera; `cabelo-frente` não significa franja anatômica na vista de costas.
Não foram espelhadas direções. Não houve pintura manual de novas peças no Krita.

Os corpos gerados foram registrados verticalmente entre pescoço e apoio de referência de cada pose; os
sapatos foram registrados aos pés, com ajuste independente quando os dois pés estão visíveis. Quatro poses de perfil receberam correção própria do desenho dos sapatos. Oito contatos
propostos estão no contrato, com pé e região. A identificação anatômica dos apoios, o deslizamento, braços,
contornos, encaixe das roupas sobre a malha e costura do ciclo continuam sujeitos à revisão visual no cenário.

Fontes, prompts integrais, recortes intermediários, registro e fonte editável ORA de sete camadas estão em
`../../_trabalho/v02/` (fora do git). O ORA é um atlas estático editável no Krita, não uma linha do tempo animada.
A tentativa de salvar uma cópia `.kra` ficou pendente porque o aplicativo não respondeu à abertura nesta sessão.

## Conferir e exportar

Na raiz do repositório:

```sh
/usr/bin/python3 scripts/export-personagem.py
/usr/bin/python3 scripts/export-personagem.py --out assets-src/personagens/humano-chibi/_trabalho/v02/exportado
```

O Python usado precisa de Pillow com WebP. O exportador preserva a escala: cada quadro exportado tem
104 × 176 px; a âncora fica em (52, 169.2). O tamanho no mundo vem de `escalaMundo` do manifesto, não da altura
da imagem. A exportação foi conferida sem erros e sem avisos; os WebP ficam na área local de trabalho.

Prévia e revisão: `../../previas/v02/`. Repouso, expressões, ferramentas e integração no jogo não fazem parte
desta entrega. Nada destas folhas está importado no `ArtPack`; não substituem a heroína atual.
