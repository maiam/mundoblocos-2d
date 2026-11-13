# Contrato de arte — Paredes (Orvalis)

Especificação para criar a arte das paredes. Acompanha o **`gabarito.png`**. Os dois são **gerados das mesmas medidas do código** por `scripts/make-wall-guide.py` a partir de
`CONTRATO.tpl.md` (não edite o `CONTRATO.md` à mão: edite o modelo e rode o script). Decisões: ADR 0027 (paredes) e ADR 0028 (escala).

## 1. O que é uma parede
Uma parede é uma **placa fina** no centro da célula (não um cubo): um **poste** central (<<TX>> px de largura × <<TZ>> px de profundidade)
e **braços** até a borda em cada lado que tem parede vizinha. A colisão é a célula inteira; só o desenho é fino. Por isso:
- **fileira leste–oeste:** a frente aparece em todos os blocos (frente larga, de célula inteira);
- **fileira norte–sul:** é uma faixa fina e **só o último bloco ao sul mostra a frente** (fina); os outros mostram só a tampa;
- **bloco sozinho:** um poste fino.
O jogador vê **a frente** (face voltada para o sul) e **a tampa** (o topo, visto de cima). As laterais não aparecem.

## 2. Medidas (1 célula = 128 px)
| Item | Valor |
|---|---|
| Célula | 128 × 128 px |
| Poste: largura (eixo x) | **<<TX>> px** (<<TXC>> célula) — largura das faixas norte–sul e do poste |
| Poste: profundidade (eixo z) | **<<TZ>> px** (<<TZC>> célula) — profundidade da tampa das fileiras leste–oeste |
| Braço leste/oeste (do poste à borda) | **<<ARMX>> px** de cada lado (<<ARMX>> + <<TX>> + <<ARMX>> = 128) |
| Braço norte/sul (do poste à borda) | **<<ARMZ>> px** de cada lado (<<ARMZ>> + <<TZ>> + <<ARMZ>> = 128) |
| Altura da frente | **<<H>> px** (1,2 célula ≈ a altura do personagem) |

Resolução mestre = 128 px por célula; o jogo reduz conforme o zoom. Entregar **nessa escala exata**.

## 3. Peças por material
Cada material de parede tem **20 imagens** (PNG RGBA, fundo transparente, **recortadas exatas, sem margem**), em
`assets-src/paredes/<material>/`:

**Frente (4)** — altura <<H>> px em todas:
| Arquivo | Tamanho | Uso |
|---|---|---|
| `front_mid.png` | 128 × <<H>> | bloco do meio de uma fileira leste–oeste; **emenda com ele mesmo** nos dois lados |
| `front_end_left.png` | <<ENDW>> × <<H>> | ponta ESQUERDA (começa no lado oeste do poste, com acabamento/aresta à esquerda; emenda à direita) |
| `front_end_right.png` | <<ENDW>> × <<H>> | ponta DIREITA (acabamento à direita; emenda à esquerda) |
| `front_post.png` | <<TX>> × <<H>> | poste isolado e fim de coluna; acabamento nos dois lados |

As frentes de "só o braço" (ex.: canto de cômodo) são **recortes** de `front_mid` (colunas 0–<<ARMXM1>> = braço oeste; <<C1>>–127 = braço leste):
não precisam de arte própria, mas `front_mid` **tem de poder ser cortado** nesses pontos sem emenda visível.

**Tampa (16)** — `cap_00.png` … `cap_15.png`, todas **128 × 128**, vista de cima. Índice = **N·1 + L·2 + S·4 + O·8**
(N/L/S/O = há parede ao norte/leste/sul/oeste). A forma é sempre o poste + os braços (ver o gabarito, seção 2). Só a forma é
pintada; o resto fica transparente. Exemplos: `cap_00` poste isolado; `cap_05` coluna norte–sul; `cap_10` fileira leste–oeste;
`cap_15` cruz.

## 4. Emendas e acabamento
- **Onde há braço, a tampa continua até a borda da célula e emenda com a da vizinha** (mesma pintura nas linhas/colunas de
  contato): braço leste ocupa x = <<C1>>–127 e braço oeste x = 0–<<ARMXM1>> (faixa y = <<Z0>>–<<Z1M1>>); braço norte y = 0–<<Z0M1>> e braço sul
  y = <<Z1>>–127 (faixa x = <<C0>>–<<C1M1>>). Esses trechos devem ser **idênticos em todas as peças** que tenham o mesmo braço.
- **Onde NÃO há braço**, a borda é externa: leve aresta clara (2–3 px) e/ou contorno.
- **Contorno:** fino, na cor escura do próprio material (como os blocos do jogo), sem preto puro.
- **Textura nunca gira nem espelha por célula:** desenhe na direção final. Variedade = variações enviadas (ver 6).
- A frente tem um **ritmo por célula**: moldura/aresta no topo e embaixo e um **montante (poste) entre painéis** a cada 128 px
  (como na referência), de modo que `front_mid` repetido forme painéis alinhados.

## 5. Luz e estilo
- Estilo do jogo: **ilustração digital de fantasia (RPG/anime)**, vista 3/4, cores quentes e limpas; **referência: Core Keeper**
  (paredes de madeira com painéis emoldurados e tampa escura).
- **Frente iluminada** (cor cheia do material). **Tampa mais escura** (cerca de 40–55% da luminosidade da frente), quase sem textura,
  com uma aresta clara fina na borda externa.
- **Não pintar:** sombra projetada no chão, sombra de contato no pé, luz/brilho do ambiente, neblina. O jogo faz isso em código
  (luz dinâmica); pintar duplicaria.

## 6. Materiais e ordem de entrega
1. **`tabuas`** — Parede de Tábuas (madeira de carvalho: tábuas verticais, moldura e montantes).
2. **`pedra`** — Parede de Pedra (blocos de pedra/tijolo, juntas visíveis).
3. Depois: os demais (celestial, cerejeira, bétula etc.), no mesmo padrão.
**Variações (opcional, recomendado):** `front_mid_b.png` e `front_mid_c.png` (128 × <<H>>), com **as mesmas colunas de borda** (x = 0 e
x = 127) de `front_mid`, para trocar de uma para outra sem emenda e quebrar a repetição.

## 7. Montagem (onde cada peça cai)
Origem = canto superior-esquerdo da célula no chão (ver gabarito, seção 3):
- **Tampa:** a peça 128 × 128 é desenhada **<<H>> px acima** da célula (y − <<H>>).
- **Frente:** base em **y = <<Z1>>** (face sul do poste) e topo em **y = <<Z1>> − <<H>> = <<YTOP>>**, encostada embaixo da tampa; invade a célula de cima.
- A face sul fica <<INSIDE>> px para dentro da célula: o chão aparece à frente da parede.

## 8. Conferência (antes de entregar)
- [ ] 20 arquivos por material, nomes exatos, PNG RGBA, 128 px/célula.
- [ ] Tamanhos exatos (frente <<H>> de altura; larguras 128/<<ENDW>>/<<ENDW>>/<<TX>>; tampas 128 × 128).
- [ ] `front_mid` repetido 3× forma uma fileira contínua; cortado em 0–<<ARMXM1>> / <<C1>>–127 não mostra emenda.
- [ ] Tampas com o mesmo braço têm o trecho do braço idêntico (monte uma cruz `cap_15` ao lado de `cap_10`: sem degrau).
- [ ] Sem sombra projetada, sem brilho, sem texto, sem marca d'água.

## 9. Depois (fora deste contrato)
- **Porta** (aberta e fechada, encaixada na fileira leste–oeste): contrato à parte.
- Estados de dano (rachaduras) e variações de tampa.
- Se a **espessura** mudar (hoje <<TXC>> × <<TZC>>, fechada pelo dono do produto em 13/11/2026), as peças que dependem dela são
  `front_end_*`, `front_post` e todas as `cap_*`; `front_mid` só muda se o poste mudar de posição.

## 10. Brief curto (para colar)
> Arte de paredes para um jogo 2D de fantasia (vista 3/4, estilo ilustração digital RPG/anime, referência Core Keeper). A parede é
> uma placa fina (poste de <<TX>> × <<TZ>> px numa célula de 128 px), de <<H>> px de altura. Entregar, por material (começando por tábuas de
> carvalho e pedra), 4 frentes (128, <<ENDW>>, <<ENDW>> e <<TX>> px de largura × <<H>> de altura; a do meio emenda com ela mesma) e 16 tampas vistas
> de cima (128 × 128, indexadas pelos vizinhos N/L/S/O, em forma de poste + braços). Tampa escura, frente iluminada com
> moldura e montantes. PNG transparente, recorte exato, sem sombra projetada nem iluminação. Ver gabarito.png.
