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
| **Franja (espessura ÚNICA)** | **<<F>> px** (0,125 célula) em **tudo**: colunas, fileira e moldura da frente |
| Coluna | franja <<F>> | miolo escuro **<<CORE>> px** | franja <<F>> |
| Fileira (tampa, <<TZ>> px de profundidade) | franja <<F>> na borda norte + miolo escuro de **<<ROWCORE>> px** |

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

## 3b. Porta de parede (3 peças extras por material, 128 × <<H>>) — gabarito: `gabarito-porta.png`
Porta de **parede** (em fileira leste–oeste, com parede comum dos dois lados): uma célula, vista de frente, no mesmo lugar da frente (base em y = <<Z1>>).
No jogo a tampa da porta é a `cap_10` (fileira); só a **frente** muda. Referência Core Keeper: aberta, **meia folha encostada em cada lado** do vão.
| Arquivo | Estado | Vão (transparente) |
|---|---|---|
| `door_closed.png` | fechada | **nenhum** — duas folhas com emenda no centro (x = 64) |
| `door_half.png` | quadro intermediário (~140 ms ao abrir/fechar) | **32 px**, centralizado (x = 48–79) |
| `door_open.png` | aberta (passável) | **64 px**, centralizado (x = 32–95), com as folhas dobradas/encostadas nos lados |
- **Batente e verga:** molduras de <<JAMB>> px (mesma franja do resto), nas laterais e no topo; a franja **faz parte do batente**, não do vão.
- **Vão:** começa logo abaixo da verga (y = <<JAMB>>) e desce até a base (y = <<H>>), sem soleira; é **100% transparente** (o chão aparece). Fora do vão, **100% opaco**.
- **Folhas:** madeira do material, no mesmo estilo de `front_mid`; na aberta ocupam ~<<JAMB>> px por lado, junto ao batente. Sem textura girada/espelhada por célula (desenhe cada quadro).
- Os 3 quadros devem **emendar** com `front_mid` nas laterais (mesmas linhas de moldura nas bordas esquerda/direita).
- Hoje só Tábuas (porta de Pedra fica para depois). Enquanto os quadros não chegam, o pipeline gera um **provisório** a partir de `front_mid`.

## 4. Franjas, emendas e acabamento
- **Uma só espessura de franja: <<F>> px**, em todas as peças e nas molduras das frentes (dá ideia de continuidade).
- **Coluna (a forma tem vizinho N ou S):** **franja clara <<F>> px | miolo escuro <<CORE>> px | franja clara <<F>> px**, com **juntas de tábua a cada 128 px** nas franjas
  (referência Core Keeper).
- **Fileira (faixa horizontal):** **franja clara de <<F>> px na borda norte** (y = <<Z0>>–<<Z0RIM>>) e miolo escuro abaixo (<<ROWCORE>> px, y = <<Z0RIM1>>–<<Z1M1>>).
- **Fechamento do topo:** onde NÃO há vizinho norte, a franja da borda norte cruza a largura inteira (fecha o topo da coluna ou da laje).
- **Junção coluna × fileira (importante):** onde uma coluna toca uma fileira (vizinho N ou S **e** L ou O), a franja da coluna do lado da fileira **faz a curva**
  (y = <<Z0>>–<<Z1M1>>): vira a franja da fileira (borda norte), com a MESMA espessura, e continua. **Nenhuma linha atravessa o miolo da coluna.**
  Sem vizinho norte (canto de cima) o fechamento do topo fica; a aresta inferior da fileira também não cruza o miolo.
- **Emendas:** bordas abertas coincidem pixel a pixel com a peça vizinha (esquerda/direita: linhas y = <<Z0>>–<<Z1M1>> das faixas; norte/sul: colunas x = 0–127). Mesmo
  desenho em todas as peças que tenham o mesmo lado aberto.
- **Contorno** fino na cor escura do próprio material (como os blocos do jogo), sem preto puro. **Textura nunca gira nem espelha por célula.**
- **Frente:** moldura de **<<F>> px** no topo, nas laterais e na base, e **montante entre painéis** a cada 128 px, também com a franja de <<F>> px (como na referência).

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
A arte de Tábuas de 13/11/2026 (`assets-src/paredes/tabuas/`) usa franjas de espessuras diferentes (~25 px nas colunas, ~5 px na fileira, ~6–8 px nas frentes).
Com a franja única de <<F>> px, **as 20 peças de cada material precisam ser refeitas** (16 tampas + 4 frentes). As antigas servem de **referência de estilo**
(madeira, moldura, montantes). Dá para pintar **as 4 formas de tampa** (faixa, topo de coluna, base de coluna, coluna contínua) e derivar as outras 12 variando só o acabamento das bordas.

## 9. Conferência (antes de entregar)
- [ ] 20 arquivos por material, nomes exatos, PNG RGBA, 128 px/célula.
- [ ] Frentes: 128 × <<H>>, **100% opacas**; `front_mid` repetido 3× forma uma fileira contínua.
- [ ] Tampas: 128 × 128; cada uma cobre a faixa de y da sua forma (tabela da seção 3).
- [ ] **Todas as franjas com <<F>> px** (tampas e molduras das frentes).
- [ ] Coluna contínua (`cap_05`) empilhada 3× forma uma coluna sem emenda; `cap_10` repetido forma uma fileira sem emenda.
- [ ] Junção: `cap_07`/`cap_13`/`cap_15`/`cap_03`/`cap_09`/`cap_11` — a franja da coluna faz a curva e segue como franja da fileira; **nenhuma linha cruza o miolo**.
- [ ] Coluna ligada a uma fileira (`cap_07`, `cap_13`…) emenda com `cap_10` ao lado, sem degrau.
- [ ] Porta (Tábuas): `door_closed/half/open.png` 128 × <<H>>; vão de 0/32/64 px centralizado, sem soleira; fora do vão 100% opaco; batente e verga de <<JAMB>> px; emendam com `front_mid`.
- [ ] Sem sombra projetada, sem brilho, sem texto, sem marca d'água.

## 10. Brief curto (para colar)
> Arte de paredes para um jogo 2D de fantasia (vista 3/4, estilo ilustração digital RPG/anime, referência Core Keeper). A parede é uma
> laje que ocupa a célula inteira em largura (128 px), com <<TZ>> px de profundidade e <<H>> px de altura. Por material (tábuas de carvalho e pedra
> primeiro): 4 frentes de 128 × <<H>> (meio, ponta esquerda, ponta direita e poste/fim de coluna; opacas) e 16 tampas vistas de cima, 128 × 128,
> indexadas pelos vizinhos N/L/S/O (só N/S mudam a forma: faixa horizontal, topo de coluna, base de coluna e coluna contínua). Franja clara de <<F>> px,
> igual em tudo (colunas, fileira ao norte e molduras das frentes); coluna = franja | miolo | franja com juntas de tábua; onde a coluna toca a fileira, a franja faz a curva. PNG transparente, recorte exato,
> sem sombra projetada nem iluminação. Ver gabarito.png.
