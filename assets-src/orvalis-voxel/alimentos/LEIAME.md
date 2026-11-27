# Alimentos — complemento (pacote do Drive `Alimentos Complemento`, 27/11/2026)

20 PNGs de **16 × 16 px** RGBA (15 ícones do progresso "Uma dieta equilibrada", 1 ícone de bolo e as 4 faces do bolo) mais a prancha de catálogo (`Orvalis_Alimentos_Complemento_Prancha.png`, 420 × 336, só para olhar) e o texto original (`LEIA-ME-pacote-original.txt`). Fonte de catálogo: Minecraft Wiki PT, "Alimento". **Só arte-fonte:** nada daqui entra no jogo ainda; cada comida exige regra própria pelo ciclo da ADR 0116 (Wiki → estado atual → proposta → aprovação). Ampliar sempre por vizinho mais próximo.

| Grupo | Arquivos (`orvalis_*_16x16.png`) | Liga a… |
|---|---|---|
| Horta | `beterraba_icone`, `cenoura_dourada_icone`, `batata_assada_icone`, `batata_venenosa_icone` | **`beterraba_icone` destrava a comida do porco da reprodução** (Wiki: cenoura, batata ou beterraba); hoje a horta só tem trigo, cenoura, batata e tomate, sem beterraba |
| Frutas | `maca_icone`, `maca_dourada_icone`, `maca_dourada_encantada_icone`, `fatia_de_melancia_icone`, `fruta_do_coro_icone` | sem fonte no mundo (árvore, pomar, End); regras próprias |
| Cozidos | `ensopado_beterraba_icone`, `ensopado_coelho_icone`, `ensopado_suspeito_icone`, `biscoito_icone`, `frasco_de_mel_icone`, `olho_de_aranha_icone` | Fornalha, tigela e caldeirão (`../cozinha/`); coelho, abelha e aranha ainda sem fauna |
| Bolo | `bolo_icone`, `bolo_topo`, `bolo_base`, `bolo_lateral`, `bolo_corte` | bloco de bolo (topo e base 16 × 16; lateral e corte = `x=0, y=8, largura=16, altura=8`); bloco com estado (fatias) |

Os cortes de carne (porco, bovina, carneiro, frango) já estão no jogo desde a v0.193.1 (`../mobs/LEIAME.md`).
