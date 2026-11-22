# ADR 0103 — Titã: auto-step de 0,6 m com encaixe no topo e câmera suave (v0.162.0)

**Status:** Aceita. Pedido: regra de auto-step para escadas e degraus no modelo do Minecraft. Substitui o degrau fixo de 0,5 m do ADR 0056 (que só subia exatamente 0,5 m) por um teste geométrico com altura variável.

## Decisão
1. **Regra (`physics.ts`, `autoStepUp`, chamada em `moveAxis`):** só com o corpo **no chão** (`onGround`) e o eixo horizontal **barrado**. Três passos: (1) há **teto livre** para subir `STEP_HEIGHT = 0,6` m aqui e a caixa elevada cabe na posição nova; (2) **snap down**: `landingY` acha o topo real do apoio entre a altura atual e a elevada (laje 0,5, patamar do degrau, assento da cadeira…); (3) aceita só se sobe mais de 0,01 m, no máximo 0,6 m, e o corpo cabe no topo achado. Cubo inteiro (1 m) continua barrado (cai no salto automático do ADR 0055); no ar não dispara; teto baixo impede o passo.
2. **Câmera suave:** `Body.stepSmooth` (≤ 0) recebe `−subida` e decai por `exp(−22·dt)` (~0,08 s) em `stepBody`; **só o render** lê (`titanGame.ts`: olho da câmera = `y + EYE_HEIGHT + stepSmooth`). A mira, o alcance e a física seguem a altura real. Estado só de execução, fora do save.
3. A implementação do pedido (resolvedor AABB completo, `PlayerBody`, `queryColliders`) **não** foi copiada: o motor já resolve colisão por eixo com `collides`/`landingY` e caixas (ADR 0101); a regra entrou nesse resolvedor, sem segundo resolvedor paralelo.

## Consequências
- Sem mudança de gerador nem de save. Comportamento antigo preservado nos casos de laje e degrau; muda o que antes não subia (alturas entre 0,5 e 0,6 não existem hoje; futuras formas baixas passam a subir sozinhas).
- Pendências: calibrar `STEP_HEIGHT`/taxa de suavização em aparelho real; degrau em canto.
- Testes: `autostep.test.ts` (+5).
