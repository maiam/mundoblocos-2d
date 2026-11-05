# Guarda-roupa fantasia 01 — revisão 3

Onze peças no catálogo, treze folhas RGBA de caminhada (3072 × 2048). Oito quadros por direção, 8 fps,
linhas frente, esquerda, direita, costas. Mantidos o quadro 384 × 512, a âncora (192, 471) e o contrato v02.
Todas as peças continuam em **revisão**, sem aprovação artística nem integração ao jogo.

## Novas roupas

| Encaixe | Peças adicionadas |
|---|---|
| `tronco` | `colete-verde`, `tunica-azul`, `blusa-lilas` |
| `pernas` | `calca-ardosia`, `shorts-vinho`, `bermuda-verde` |

Somadas à blusa ocre e ao shorts marinho: quatro opções sobrepostas por encaixe = **16 combinações**.
Incluindo a opção de usar a roupa bege integrada à base em cada encaixe: **25 combinações de roupa**.
Cabelo e sapatos são opções independentes; não são contados como roupas novas.

## Conferir

Abrir `../../previas/v02/revisao.html` por um servidor local. Blusa e pernas têm seletores independentes,
com sorteio, pausa e avanço quadro a quadro. A prévia começa com colete verde/calça ardósia; sapatos desligados.
`combinacoes-fantasia-01.jpg` compara as 16 combinações na mesma pose frontal; `caminhada-fantasia-01.gif`
mostra os três conjuntos novos nas quatro direções. A comparação anterior dos sapatos foi preservada.

A base permanece a **blusa sem mangas e o shorts bege**, com braços/pernas descobertos. As sete folhas anteriores,
incluindo cabeça, cabelo e sapatos, são preservadas byte a byte. Nenhuma roupa reposiciona o corpo ou os pés.
As novas roupas foram desenhadas com `image_gen` sobre as oito poses de cada direção, extraídas como camadas
independentes e montadas sem deslocamento por quadro. Máscaras preservam braços e mãos; os pés continuam vindo da base original, com as barras desenhadas acima deles.

Fontes, prompts, montagem, verificações e atlas ORA editável com treze camadas:
`../../_trabalho/v02/expansao-01/` (somente local, fora do git). O ORA é uma folha em camadas para Krita;
não contém uma linha do tempo animada. Histórico anterior preservado em `_trabalho/v02/r02/` e `_arquivo/v01/`.

## Validar e exportar

Na raiz, com Python/Pillow e WebP:

```sh
/usr/bin/python3 scripts/export-personagem.py
/usr/bin/python3 scripts/export-personagem.py --out assets-src/personagens/humano-chibi/_trabalho/v02/exportado
```

O exportador confere dimensões, caixa compartilhada, transparência, contatos e prévias ≤ 1 MB.
A montagem local também confere as 25 escolhas × 32 poses (800 montagens) e os hashes das sete folhas existentes.
Essas verificações não aprovam movimento, volume, detalhes entre vistas nem encaixe no cenário.

Pendentes: revisão visual dos encaixes (gola, cava, cintura e bainhas), detalhes do colete entre frente/costas,
movimento dos sapatos, base definitiva, repousos, expressões e ferramentas. O motor ainda não lê estas peças;
nenhuma importação no ArtPack ou substituição da heroína.
