# Cultivos — complemento (pacote do Drive `Cultivos — Minecraft Wiki`, 27/11/2026)

57 PNGs de **16 × 16 px** RGBA (plantas de frente em folhas planas; frutos com textura quadrada opaca por face), mais a prancha de catálogo (`Orvalis_Cultivos_Complemento_Prancha.png`, 864 × 360, só para olhar) e o texto original (`LEIA-ME-pacote-original.txt`, com o mapeamento idade → arquivo). **Só arte-fonte:** nada entra no jogo ainda; cada cultura exige regra própria pelo ciclo da ADR 0116 (Wiki → estado atual → proposta → aprovação). Ampliar sempre por vizinho mais próximo.

| Cultura | Arquivos (`orvalis_*_16x16.png`) | Observação |
|---|---|---|
| Trigo | `trigo_idade_01/02/03/04/06` | completa as **8 idades** da Wiki; as idades 0, 5 e 7 usam as fases 01, 02 e 03 que já estão na horta do jogo |
| Cenoura e batata | `cenoura_aparencia_03`, `batata_aparencia_03` | idades 4–6; as 0–3 e a 7 usam as fases já existentes |
| Beterraba | `beterraba_idade_00..03`, `semente_beterraba_icone` | **cultura nova** (4 idades); a raiz é `../alimentos/orvalis_beterraba_icone_16x16.png`; liga à comida do porco na reprodução |
| Abóbora e melancia | `semente_*_icone`, `caule_*_idade_00..07`, `caule_*_ligado`, `abobora_topo/lateral`, `melancia_topo/lateral` | caule de 8 alturas, caule conectado (espelhar/girar conforme o fruto) e faces do fruto (bloco) |
| Bagas doces | `arbusto_bagas_doces_fase_04` | fase 4 (carga cheia); as 3 primeiras ficam em "Plantas silvestres" |
| Cacau | `sementes_cacau_icone`, `cacau_vagem_idade_00..02` | vagem na lateral de uma tora de selva (sem selva no Orvalis) |
| Verruga do Nether | `verruga_nether_icone`, `verruga_nether_aparencia_01..03` | idades 0, 1, 2, 3 = aparências 01, 02, 02, 03; **sem Nether** |
| Flor-tocha | `semente_flor_tocha_icone`, `flor_tocha_idade_00/01`, `flor_tocha_madura` | sem fonte no mundo |
| Planta-jarro | `vesicula_planta_jarro_icone`, `planta_jarro_idade_00..04` (+ `_03/_04_base` e `_topo`) | as 2 últimas fases em dois blocos sobrepostos; sem fonte no mundo |

## O que isto toca nas regras do jogo (para decidir, não aplicado)
A horta atual (ADR 0113) tem **3 fases** por cultura; a Wiki tem 8 idades para trigo, cenoura e batata e 4 para beterraba. Usar estes sprites muda a regra de crescimento (e o atlas `orvalis-horta-16px.webp`): é uma auditoria própria.
