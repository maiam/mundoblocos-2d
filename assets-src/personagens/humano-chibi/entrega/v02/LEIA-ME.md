# Piloto artístico v02 — revisão 2

Estado: **revisão**, 05/11/2026. Cinco peças, sete folhas RGBA de 3072 × 2048 px. Caminhada de oito quadros
por direção, a 8 fps, ciclo de um segundo. Linhas: frente, esquerda, direita, costas. Quadro mestre 384 × 512,
âncora (192, 471), caixa compartilhada [62, 48, 322, 488].

## Alterações solicitadas

A base voltou à **blusa sem mangas e ao shorts anteriores, agora em bege**, com braços e pernas descobertos.
A malha de corpo inteiro foi rejeitada. O corpo continua provisório, com roupa integrada; isso não equivale
à base definitiva sem roupa. A exceção atual está no contrato e no catálogo.

A ferramenta integrada `image_gen` produziu a recoloração e os sapatos baixos sobre as poses completas.
A montagem incorpora a recoloração somente nos pixels das roupas originais: a silhueta, os braços, as pernas,
os pés descalços e todos os pixels fora dessa máscara permanecem iguais à referência v01. Os 32 quadros foram
conferidos para igualdade de alfa do corpo e igualdade RGBA na região inferior y ≥ 385.

Os sapatos são menores, fechados e sem tiras. São extraídos na posição em que foram desenhados, sem separar,
recentrar ou realinhar cada pé para o chão a cada quadro. O recorte segue a silhueta original com margem de
um pixel: limita o excesso da sola sem deslocar o pé nem mudar sua altura ao levantar. O movimento com
sapatos continua em revisão visual; o teste numérico não substitui a avaliação da caminhada.

## Peças

| Peça | Partes |
|---|---|
| `corpo/base` | `corpo`, `cabeca` |
| `cabelo/curto-castanho` | `cabelo-tras`, `cabelo-frente` |
| `tronco/blusa-ocre` | `tronco` |
| `pernas/shorts-marinho` | `pernas` |
| `pes/sapatos-couro` | `pes` |

Cabeças, cabelo e roupas sobrepostas preservados do piloto anterior. As opções blusa ocre e shorts marinho
continuam disponíveis sobre a base bege; não são a roupa bege integrada à base. Todas as peças estão em `revisao`.

## Conferir

`../../previas/v02/revisao.html` começa na base bege, com cabelo, sem sapatos nem roupa sobreposta. Permite
alternar as peças e avançar quadro a quadro quando pausada. `comparacao-sapatos.gif` reproduz as versões sem
sapatos (acima) e com sapatos (abaixo), com o mesmo índice e o mesmo tempo. Cada ciclo tem oito passos e um segundo.

Histórico da primeira revisão: `../../_trabalho/v02/revisao-01/`. Fontes, prompts integrais, registro de montagem
com as verificações e ORA de sete camadas da revisão atual: `../../_trabalho/v02/r02/`. O ORA é um atlas estático
editável no Krita, não uma linha do tempo animada. Esses diretórios ficam fora do git.

Na raiz do repositório, usar Python com Pillow e WebP:

```sh
/usr/bin/python3 scripts/export-personagem.py
/usr/bin/python3 scripts/export-personagem.py --out assets-src/personagens/humano-chibi/_trabalho/v02/exportado
```

Quadro exportado: 104 × 176 px, âncora (52, 169.2); usar `escalaMundo` do manifesto, sem esticar o quadro a uma
altura fixa. Resultados em `../../previas/v02/validacao.json`.

Nada integrado ao jogo: sem importação no ArtPack ou substituição da heroína. Repouso, ferramentas, expressões
novas, base definitiva e revisão da marcha no cenário continuam pendentes.
