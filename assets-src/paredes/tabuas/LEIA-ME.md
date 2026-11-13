# Parede de Tábuas — tampas (cap_00 … cap_15)

- **`entregue-03/`** — as 16 tampas como foram entregues (13/11/2026): 128 × 128, RGBA, braços idênticos entre as peças e emendas exatas,
  mas com a espessura do contrato antigo (poste de 38 × 38 px, 0,3 / 0,3).
- **`cap_XX.png` (esta pasta)** — as mesmas tampas **reprojetadas para a medida final** da ADR 0027 (poste 32 × 44 px, braços 48 e 42;
  0,25 / 0,35) por `scripts/retarget-wall-caps.py`: cada faixa (braço | poste | braço, nos dois eixos) é esticada por partes, então a
  topologia e as emendas se mantêm. É uma **adaptação provisória**: se a arte for repintada na medida final, substitui estes arquivos.
- **Faltam (Tábuas):** as 4 frentes (`front_mid`, `front_end_left`, `front_end_right`, `front_post`) e a porta.
