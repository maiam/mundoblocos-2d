# Contrato de arte — Paredes (Orvalis) — versão final (coluna de largura da célula)

Especificação para criar a arte das paredes. Acompanha o **`gabarito.png`**. Os dois são **gerados das mesmas medidas do código** por
`scripts/make-wall-guide.py` a partir de `CONTRATO.tpl.md` (não edite o `CONTRATO.md` à mão: edite o modelo e rode o script).
Decisões: ADR 0027 (paredes) e ADR 0028 (escala). **Referência visual: Core Keeper** (colunas com franjas claras e miolo escuro).

## 1. O que é uma parede
Uma parede é uma **laje de <<TZ>> px de profundidade** (eixo norte–sul, 0,35 célula) que **ocupa a célula inteira em largura** (128 px). A colisão é a célula inteira.
O jogador vê **a frente** (face sul, voltada para ele) e **a tampa** (o topo, visto de cima); as laterais não aparecem.
- **Fileira leste–oeste:** a frente aparece em todos os blocos; a tampa é uma faixa horizontal de <<TZ>> px de profundidade.
- **Coluna norte–sul:** a tampa é uma faixa **vertical de 128 px de largura**, de bloco em bloco; **só o último bloco ao sul mostra a frente**
  (de largura inteira); os outros mostram só a tampa.
- **Bloco isolado:** uma laje de 128 × <<TZ>> px com frente de largura inteira.

## 2. Medidas (1 célula = 128 px)
| Item | Valor |
|---|---|
| Célula | 128 × 128 px |
| Largura da laje (eixo x) | **128 px** (1,0 célula) — não há braços leste/oeste |
| Profundidade da laje (eixo z) | **<<TZ>> px** (0,35 célula), centrada: de y = <<Z0>> a y = <<Z1M1>> |
| Braço norte/sul (da laje à borda) | **<<ARMZ>> px** de cada lado (<<ARMZ>> + <<TZ>> + <<ARMZ>> = 128): a coluna contínua preenche os 128 × 128 |
| Altura da frente | **<<H>> px** (1,2 célula ≈ a altura do personagem) |
| Franja da coluna | **<<TRIM>> px** de cada lado (0,21) · miolo escuro de **<<CORE>> px** |
| Franja da tampa da fileira | **<<RIMN>> px** na borda norte (0,2 da profundidade) |

Resolução mestre = 128 px por célula; o jogo reduz conforme o zoom. Entregar **nessa escala exata**.

## 3. Peças por material (20 PNG RGBA, fundo transparente, recorte exato, sem margem)
`assets-src/paredes/<material>/`:

**Frente (4), todas 128 × <<H>>** — só aparece onde **não há parede ao sul**:
| Arquivo | Uso |
|---|---|
| `front_mid.png` | bloco do meio de uma fileira leste–oeste; **emenda com ele mesmo** nos dois lados |
| `front_end_left.png` | ponta ESQUERDA (acabamento/aresta à esquerda; emenda à direita) |
| `front_end_right.png` | ponta DIREITA (acabamento à direita; emenda à esquerda) |
| `front_post.png` | bloco isolado e **fim de coluna** norte–sul (acabamento nos dois lados; é a "frente iluminada com rebites" da referência) |

**Tampa (16), todas 128 × 128, vista de cima** — `cap_00.png` … `cap_15.png`, índice = **N·1 + L·2 + S·4 + O·8**
(N/L/S/O = há parede ao norte/leste/sul/oeste). Só os vizinhos **norte/sul** mudam a **forma**; os vizinhos leste/oeste mudam só o
**acabamento das bordas esquerda e direita** (borda sem vizinho = fechada, com aresta/franja; com vizinho = aberta, emenda com a peça ao lado):

| Forma (pelos vizinhos N/S) | Cobre (y) | Máscaras |
|---|---|---|
| nenhuma (poste/fileira) | y = <<Z0>>–<<Z1M1>> | `cap_00`, `02`, `08`, `10` |
| só norte (topo de coluna, acabamento no fim) | y = 0–<<Z1M1>> | `cap_01`, `03`, `09`, `11` |
| só sul (base de coluna) | y = <<Z0>>–127 | `cap_04`, `06`, `12`, `14` |
| norte e sul (coluna contínua) | y = 0–127 (tile inteiro) | `cap_05`, `07`, `13`, `15` |

O resto de cada tile é transparente. As 16 peças são variações de acabamento sobre 4 formas: dá para pintar as 4 formas e derivar as bordas.

## 4. Franjas, emendas e acabamento
- **Coluna (a forma tem braço N ou S):** estrutura **franja clara (<<TRIM>> px) | miolo escuro (<<CORE>> px) | franja clara (<<TRIM>> px)**, com **juntas de tábua a cada
  128 px** nas franjas (referência Core Keeper). Onde há **parede leste/oeste** ligada à coluna, a franja daquele lado é **interrompida na altura da
  fileira** (y = <<Z0>>–<<Z1M1>>) e a tampa continua pela fileira.
- **Fileira (faixa horizontal):** miolo escuro com uma **franja clara de <<RIMN>> px na borda norte** (y = <<Z0>>–<<Z0RIM>>). Nas pontas sem vizinho, acabamento fechado.
- **Emendas:** bordas abertas coincidem pixel a pixel com a peça vizinha (esquerda/direita: linhas y = <<Z0>>–<<Z1M1>> das faixas; norte/sul: colunas x = 0–127). Mesmo
  desenho em todas as peças que tenham o mesmo lado aberto.
- **Contorno** fino na cor escura do próprio material (como os blocos do jogo), sem preto puro. **Textura nunca gira nem espelha por célula.**
- **Frente:** moldura/aresta no topo e embaixo e **montante (poste) entre painéis** a cada 128 px (como na referência).

## 5. Luz e estilo
- **Ilustração digital de fantasia (RPG/anime)**, vista 3/4, cores quentes e limpas; **referência: Core Keeper**.
- **Frente iluminada** (cor cheia). **Tampa mais escura** (cerca de 40–55% da luminosidade da frente): miolo escuro e franjas claras.
- **Não pintar:** sombra projetada no chão, sombra de contato no pé, luz/brilho do ambiente, neblina. O jogo faz isso em código (luz dinâmica).
- **Frente 100% opaca** (sem alfa parcial, inclusive na última coluna/linha e nas juntas das tábuas): o chão não pode aparecer através da parede.

## 6. Materiais e ordem de entrega
1. **`tabuas`** — Parede de Tábuas (madeira de carvalho). 2. **`pedra`** — Parede de Pedra. 3. Depois: os demais, no mesmo padrão.
**Variações (opcional):** `front_mid_b.png` e `front_mid_c.png` (128 × <<H>>) com as mesmas colunas de borda de `front_mid`.

## 7. Montagem (onde cada peça cai)
Origem = canto superior-esquerdo da célula no chão (ver gabarito, seção 3):
- **Tampa:** a peça 128 × 128 é desenhada **<<H>> px acima** da célula (y − <<H>>).
- **Frente:** base em **y = <<Z1>>** (face sul da laje) e topo em **y = <<Z1>> − <<H>> = <<YTOP>>**, encostada embaixo da tampa; invade a célula de cima.
- A face sul fica <<INSIDE>> px para dentro da célula: o chão aparece à frente da parede.

## 8. O que já existe de Tábuas (referência) e o que refazer
Entregue em 13/11/2026 para uma geometria mais fina (ver `assets-src/paredes/tabuas/LEIA-ME.md`). Com a coluna de largura da célula:
- **Ainda vale:** `front_mid` (128 × <<H>>) e `cap_10` (fileira leste–oeste, y = <<Z0>>–<<Z1M1>>).
- **Refazer:** as outras 15 tampas (formas novas, de 128 px de largura, com franjas) e `front_end_left`, `front_end_right`, `front_post` (agora 128 × <<H>>).
  As peças antigas servem de **referência de estilo** (madeira, moldura, montantes).

## 9. Conferência (antes de entregar)
- [ ] 20 arquivos por material, nomes exatos, PNG RGBA, 128 px/célula.
- [ ] Frentes: 128 × <<H>>, **100% opacas**; `front_mid` repetido 3× forma uma fileira contínua.
- [ ] Tampas: 128 × 128; cada uma cobre a faixa de y da sua forma (tabela da seção 3).
- [ ] Coluna contínua (`cap_05`) empilhada 3× forma uma coluna sem emenda; `cap_10` repetido forma uma fileira sem emenda.
- [ ] Coluna ligada a uma fileira (`cap_07`, `cap_13`…) emenda com `cap_10` ao lado, sem degrau.
- [ ] Sem sombra projetada, sem brilho, sem texto, sem marca d'água.

## 10. Brief curto (para colar)
> Arte de paredes para um jogo 2D de fantasia (vista 3/4, estilo ilustração digital RPG/anime, referência Core Keeper). A parede é uma
> laje que ocupa a célula inteira em largura (128 px), com <<TZ>> px de profundidade e <<H>> px de altura. Por material (tábuas de carvalho e pedra
> primeiro): 4 frentes de 128 × <<H>> (meio, ponta esquerda, ponta direita e poste/fim de coluna; opacas) e 16 tampas vistas de cima, 128 × 128,
> indexadas pelos vizinhos N/L/S/O (só N/S mudam a forma: faixa horizontal, topo de coluna, base de coluna e coluna contínua). Coluna = franja
> clara | miolo escuro | franja clara com juntas de tábua; fileira = miolo escuro com franja fina ao norte. PNG transparente, recorte exato,
> sem sombra projetada nem iluminação. Ver gabarito.png.
