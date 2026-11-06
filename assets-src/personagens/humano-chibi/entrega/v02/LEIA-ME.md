# Guarda-roupa fantasia 01 — revisão 4

Onze peças no catálogo, treze folhas RGBA de caminhada (3072 × 2048). Oito quadros por direção, 8 fps,
linhas frente, esquerda, direita, costas. Mantidos o quadro 384 × 512, a âncora (192, 471) e o contrato v02.
Todas as peças continuam em **revisão**, com aprovação artística pendente; as folhas já são usadas pela montagem do personagem no jogo.

## Novas roupas

| Encaixe | Peças adicionadas |
|---|---|
| `tronco` | `colete-verde`, `tunica-azul`, `blusa-lilas` |
| `pernas` | `calca-ardosia`, `shorts-vinho`, `bermuda-verde` |

Somadas à blusa ocre e ao shorts marinho: quatro opções sobrepostas por encaixe = **16 combinações**.
Incluindo a opção de usar a roupa bege integrada à base em cada encaixe: **25 combinações de roupa**.
Cabelo e sapatos são opções independentes; não são contados como roupas novas.

## Correção da direita — 06/11/2026

A sequência antiga voltava à pose de braço avançado antes de terminar o balanço. A revisão 4 usa oito fases
contínuas (trás → passagem baixa → frente → retorno), com braço distante em fase oposta e recortes das roupas
compatíveis. `../../previas/v02/direita-antes-depois.gif` mostra a comparação sincronizada na base e com roupa.
As folhas usadas pelo motor em `src/assets/chibi-*` também são reexportadas.

## Conferir

Abrir `../../previas/v02/revisao.html` por um servidor local. Blusa e pernas têm seletores independentes,
com sorteio, pausa e avanço quadro a quadro. A prévia começa com colete verde/calça ardósia; sapatos desligados.
`combinacoes-fantasia-01.jpg` compara as 16 combinações na mesma pose frontal; `caminhada-fantasia-01.gif`
mostra os três conjuntos novos nas quatro direções. A comparação sincronizada dos sapatos também foi atualizada.

A base permanece a **blusa sem mangas e o shorts bege**, com braços/pernas descobertos. Na revisão 4, só a linha da direita do corpo e das oito roupas muda. Cabeças, cabelos, sapatos e as outras
três direções permanecem idênticos; a região inferior y ≥ 400 mantém os pixels anteriores. Nenhuma roupa reposiciona os pés.
As novas roupas foram desenhadas com `image_gen` sobre as oito poses de cada direção, extraídas como camadas
independentes e montadas sem deslocamento por quadro. Os braços da direita foram redesenhados com uma sequência contínua e os recortes das roupas ajustados à mão próxima da câmera.

Fontes, prompts, montagem, verificações e atlas ORA editável com treze camadas:
`../../_trabalho/v02/expansao-01/` (expansão) e `../../_trabalho/v02/correcao-direita/` (correção atual), somente locais, fora do git. O ORA é uma folha em camadas para Krita;
não contém uma linha do tempo animada. Histórico anterior preservado em `_trabalho/v02/r02/` e `_arquivo/v01/`.

## Validar e exportar

Na raiz, com Python/Pillow e WebP:

```sh
/usr/bin/python3 scripts/export-personagem.py
/usr/bin/python3 scripts/export-personagem.py --out src/assets --prefixo chibi-
```

O exportador confere dimensões, caixa compartilhada, transparência, contatos e prévias ≤ 1 MB.
A montagem local também confere as 25 escolhas × 32 poses (800 montagens) e a igualdade dos pixels das outras direções.
Essas verificações não aprovam movimento, volume, detalhes entre vistas nem encaixe no cenário.

Pendentes: revisão visual dos encaixes (gola, cava, cintura e bainhas), detalhes do colete entre frente/costas,
movimento dos sapatos, base definitiva, repousos, expressões e ferramentas. O motor já usa estas peças na montagem do personagem (v0.50.0); esta correção de arte entra na v0.50.1.
