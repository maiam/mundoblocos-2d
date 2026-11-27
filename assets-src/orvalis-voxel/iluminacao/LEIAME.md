# Iluminação — pacote P2-11 (Drive `Banco de Assets/itens-de-minecraft/P2-11 — Iluminação`, 27/11/2026)

262 PNGs de **16 × 16 px** RGBA (pixel art, sem marca d'água) em cinco pastas, mais `previa-iluminacao.png` (a prévia do Drive) e o `LEIA-ME-original.txt` do lote. **Só arte-fonte:** nada daqui entra no jogo ainda; os sprites não implementam iluminação (o `LEIA-ME` do lote diz o mesmo). Ampliar sempre por vizinho mais próximo.

| Pasta | Arquivos | Conteúdo |
|---|---|---|
| `tochas-e-lampioes` | 30 | tocha (vertical e de parede), das almas, de cobre, de redstone (acesa e apagada); lampião apoiado e suspenso (comum, das almas, 4 oxidações de cobre e as enceradas) |
| `velas` | 170 | vela natural e 16 cores, de 1 a 4 velas, acesa e apagada, mais as camadas "sobre bolo" |
| `blocos-e-luminarias` | 29 | lâmpada de cobre (4 oxidações, acesa e apagada, com e sem sinal), lâmpada de redstone, pedra luminosa, lanterna do mar, luz de sapo (3), sinalizador, duto, haste do End, abóbora iluminada (3 faces) |
| `fontes-naturais` | 25 | coguluz, magma, obsidiana chorona, lava, fogo e fogo das almas (2 quadros), líquen brilhante, bagas e trepadeira, vagalumes, ametista (4), pepino do mar (4 × seco/submerso) |
| `fogueiras` | 8 | fogueira comum e das almas (apagada, brasas, chama, ícone) |

## Estado
**Tocha: no jogo desde a v0.188.0** (ADR 0121: `tocha_vertical` e `tocha_parede` em `assets-src/titan/arte16/`, células 85 e 86 do atlas de itens). **O restante, em fila.** A primeira entrega natural é a **Tocha do Orvalis** (`tocha_vertical`, `tocha_parede`), que depende de uma regra de mundo própria (nível de luz 14 pela Wiki, receita e colocação), logo passa pelo ciclo da ADR 0116 — e de decidir a luz do céu (`docs/AUDITORIA_REGRAS.md`, #32). Itens do Orvalis ficam na faixa 42+ (ADR 0114). Como as demais entregas: tiles no fim de `titan/tiles.json` + `BLOCK_TILES`, item no atlas de itens, nunca índice solto.
