# ADR 0139 — Família das madeiras do Orvalis: lajes e degraus (auditoria #46, W1, v0.210.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ([Planks](https://minecraft.wiki/w/Planks), [Fence Gate](https://minecraft.wiki/w/Fence_Gate), [Trapdoor](https://minecraft.wiki/w/Trapdoor)) → estado atual → proposta → aprovada ("Sim. Pode seguir": ordem W1 → W2 → W3, W4 adiado, estante/placa suspensa/placa com texto fora, receitas da Wiki).

## Wiki
Laje, degrau, cerca, portão, porta, alçapão, botão, placa de pressão, placa e bote só se fazem com tábuas **da mesma madeira**. Rendimentos (de um espelho de terceiros, **não confirmados** na página principal): laje 3 tábuas → 6; degrau 6 → 4; porta 6 → 3; cerca 4 tábuas + 2 hastes → 3; portão 2 tábuas + 4 hastes → 1; alçapão 6 → 2. Cerca e portão: dureza 2, resistência 3.

## Decisão (W1)
1. **Blocos 190–207:** laje de carvalho 190/191, cerejeira 192/193, bétula 194/195 (inferior par, superior ímpar; `isWoodSlab`, `woodOf`) e degraus 196–207 (madeira × 4 giros no id; `isWoodStair`, `woodStairId`). `T_MAX` = 207. **O mesher guardava as células em `Uint8Array`: passou a `Uint16Array`** (único limite de 255 ids no motor; volume, save e rede usam números).
2. **Itens 156–161** (lajes, degraus); atlas de itens **4 × 41** (164 células): item novo é o **162**. A laje devolve a mesma laje nas duas metades; os 4 giros devolvem o degrau.
3. **Laje por família:** `slabs.ts` ganhou a família da madeira; **duas lajes da mesma madeira viram a tábua dela**; com outra madeira, pedra, rocha ou junco não funde. Degrau: mesma forma/física do de pedra (`STAIR_BASE`), giro pelo olhar.
4. **Modelos do degrau:** três tipos (`degrauCarvalho`/`Cerejeira`/`Betula`, `WOOD_STAIR_KINDS`) numa tira única de 9 tiles (`titan-degrau-madeira.webp` + `.json`, `make-orvalis-madeira-familia.py`); topo = tábua da laje, espelho = lateral da laje (metade de baixo), perfil do pacote. Laje: 6 tiles `orvalis/laje-<madeira>-{topo,face}`.
5. **Regras:** receitas na Mesa de Carpintaria (`world: 'orvalis'`); quebra = dureza da tábua (2, machado); som de rocha como as tábuas (falta timbre de madeira, dívida já registrada).
6. **Fonte da arte:** `assets-src/orvalis-voxel/catalogo/P1-02-vedacao-de-madeira/` (Drive "P1-01 — Madeira básica", 18 PNGs por madeira; só laje e degrau entraram). Sem mudança de gerador, de save nem de protocolo.

## Consequências
Fila: **W2** cerca (máscara de conexão) e portão; **W3** porta de 2 células e alçapão; **W4** botão e placa de pressão adiados (sem redstone). Fora do escopo: estante entalhada (Silk Touch), placa suspensa (corrente), placa com texto; bote com baú espera o baú do Orvalis.
