# ADR 0059 — Titã: vida, ar e fome (v0.116.0)

**Status:** Aceita (a fome foi ligada na ADR 0060). Contexto: regras e pranchas de HUD (Ar/Vida/Fome) do dono do produto, no modelo do Minecraft.

## Decisão
- **Fonte de verdade:** `src/titan/vitals.ts` (puro, sem DOM): `PlayerVitals`, `updatePlayerVitals(v, dt, cabeçaSubmersa, fomeLigada)`, `fallDamage`, `damage`, `revive`, `vitalsToData/FromData`. Vida 0–20 (10 corações), ar 15 s, fome 0–20.
- **Ar:** olhos em líquido (`eyesSubmerged`) gastam 1 s de fôlego por segundo; sem ar, 2 pontos (1 coração) por segundo; fora d'água enche em 2 s.
- **Queda:** até 3 blocos não machuca; depois `⌈altura − 3⌉` pontos. Medida pelo topo da queda até o pouso (`airTop/wasAir` em `titanGame.ts`).
- **Fome desligada** (`HUNGER_ENABLED = false`): o Titã ainda não tem comida. Fome/saturação ficam em 20/5, sem exaustão, e a vida regenera 1 ponto a cada `REGEN_NO_FOOD_S` = 1,5 s (provisório). A regra completa do Minecraft (regeneração rápida/normal, exaustão → saturação → fome, inanição) já está implementada e testada; ligar a flag é só o que falta quando houver alimento. A barra de fome fica oculta.
- **Morte:** `dieAndRespawn` (`actions.ts`) solta todas as pilhas no ponto da morte (`d:x,y,z:n`, `Drop.count` 1–64) e o jogador renasce cheio na chegada (`gen.arrival`). As pilhas voltam por proximidade (`collectNearby`) e persistem.
- **Persistência:** `TitanHeader.vitals` opcional (sem `TITAN_SAVE_VERSION`: ausência = cheio; nunca abre morto, vida mínima 1). `Drop.item` aceita qualquer item e `count` opcional.
- **HUD:** atlas `titan-hud-32px.webp` (96×96) via `render/art/titan.ts`; corações, bolhas (só submerso/enchendo), tremor de dano e véu vermelho (`.titan-hurt`); `playHurt()` em `gameAudio.ts`.

## Consequências
Sem backend e sem mudança de gerador. Pendências: comida/consumíveis (ligar a fome), ajuste de ritmo da regeneração, aceite em iPad/celular.
