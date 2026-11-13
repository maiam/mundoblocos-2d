# Parede de Tábuas — tampas (cap_00 … cap_15) e frentes (front_*)

- **`entregue-03/`** — as 16 tampas como foram entregues (13/11/2026): 128 × 128, RGBA, braços idênticos entre as peças e emendas exatas,
  mas com a espessura do contrato antigo (poste de 38 × 38 px, 0,3 / 0,3).
- **`cap_XX.png` (esta pasta)** — as mesmas tampas **reprojetadas para a medida final** da ADR 0027 (poste 32 × 44 px, braços 48 e 42;
  0,25 / 0,35) por `scripts/retarget-wall-caps.py`: cada faixa (braço | poste | braço, nos dois eixos) é esticada por partes, então a
  topologia e as emendas se mantêm. É uma **adaptação provisória**: se a arte for repintada na medida final, substitui estes arquivos.
- **Frentes** (`front_mid`, `front_end_left`, `front_end_right`, `front_post`): entregues em 13/11/2026 (`entregue-03/`: 128/83/83/38 × 154) e ajustadas por
  `scripts/retarget-wall-fronts.py`: (1) **limpeza do alfa** — a última coluna/linha de cada peça e as juntas entre tábuas vieram semitransparentes (alfa ~27–30%),
  o que deixava o chão aparecer pela parede e desenhava linhas claras nas emendas; foram compostas sobre uma cor de junta (madeira escura) e viraram opacas;
  (2) **largura** — pontas 83 → 80 px e poste 38 → 32 px (medida final); `front_mid` fica em 128 × 154. Provisório até repintura na medida final.
- **Falta (Tábuas):** a porta (aberta e fechada). **Pedra:** tudo.
