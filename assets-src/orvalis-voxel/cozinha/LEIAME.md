# Cozinha — pacote P2-06 (Drive `Banco de Assets/itens-de-minecraft/P2-06 — Cozinha`, 27/11/2026)

13 PNGs de **16 × 16 px** RGBA, com os nomes do Drive (o lote não trouxe zip nem `LEIA-ME`), mais `previa-cozinha.png` (folha de contato 8×, gerada aqui, só para olhar). **Só arte-fonte:** nada daqui entra no jogo ainda. Ampliar sempre por vizinho mais próximo.

| Grupo | Arquivos | Uso previsto |
|---|---|---|
| Comida (ícones) | `pao`, `ensopado_cogumelos`, `torta_abobora` | itens de comida do Orvalis (hoje só cenoura, batata e tomate; comida só por `foodOf`) |
| Utensílio (ícone) | `tigela` | ingrediente/recipiente do ensopado |
| Caldeirão | `icone`, `frente` (lateral), `vazio_topo`, `agua_topo` | bloco com estado (vazio/com água); depende das regras de água e de recipientes |
| Fornalha | `icone`, `topo`, `lateral`, `apagada_frente`, `acesa_frente` | **estação de fundição do Orvalis** (carvão vegetal, comida assada); o braseiro é do Titã (ADR 0114) |

## Estado
**Fila.** Entrar no jogo exige regra de mundo própria, pelo ciclo da ADR 0116: a **Fornalha** (auditoria #21, fundição/combustível/tempo, e a origem do carvão vegetal da Tocha, #33) e a **comida** (vida/fome, `foodOf`). Itens do Orvalis ficam na faixa 42+ (ADR 0114); bloco novo = tiles no fim de `titan/tiles.json` + `BLOCK_TILES`; ícone de item = atlas de itens (4 × N, hoje 4 × 21 com 82 dos 84 ids em uso).
