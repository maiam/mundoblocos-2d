# ADR 0130 — Vida e fome pelos valores da Minecraft Wiki (auditoria #23, v0.199.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ("Hunger", "Healing", "Sprinting", "Health", "Damage") → estado atual (`titan/vitals.ts`, ADR 0059/0060) → proposta → o dono aprovou os 5 pontos ("Sim. Para todos").

## Wiki
Fome e saturação de 0 a 20 (saturação nunca acima da fome); a exaustão (0 a 4) vira −1 de saturação, depois de fome. Exaustão por ação: correr 0,1 por metro; pular 0,05 (correndo 0,2); de memória: andar 0, quebrar bloco 0,005, atacar 0,1, levar dano 0,1. Regeneração com fome ≥ 18: 1 ponto a cada 4 s, 6 de exaustão por ponto. A corrida acaba com fome ≤ 6. Inanição: 1 ponto a cada 4 s (na Normal para em meio coração; na Difícil mata).

## Antes
Já eram iguais à Wiki: vida 20, fome e saturação, regeneração (≥ 18, 4 s, custo 6), saturação inicial 5, queda ⌈h − 3⌉ com a água anulando, afogamento (15 s, 2 por segundo) e renascer com tudo cheio. Diferiam: exaustão (andar 0,1 por bloco, correr 0,2, pular 0,2, quebrar 0,05, nada por atacar nem por levar dano — ~5 a 10× mais fome que a Wiki) e a corrida não dependia da fome.

## Decisão
1. **Exaustão da Wiki** (`EXHAUSTION`): andar 0, correr 0,1 por metro, pular 0,05, pular correndo 0,2 (`sprintJump`), quebrar bloco 0,005, atacar 0,1 (golpe no Farejador e na fauna) e levar dano 0,1 (`hurt`: queda e golpes dos Farejadores; inanição e afogamento seguem por `damage`, sem exaustão).
2. **Corrida só com fome > 6** (`canSprint`, `SPRINT_MIN_HUNGER`).
3. **Comer instantâneo (adaptação mantida):** a Wiki leva 1,6 s; o toque já serve para colocar e golpear.
4. **Inanição não letal mantida:** para em 1 ponto de vida (`STARVATION_FLOOR`), como na Normal.
5. **Regeneração rápida mantida** como está (fome cheia e saturação > 0: 1 ponto a cada 0,5 s, 6 de exaustão cada).
6. **Os dois mundos:** o Orvalis e o Titã (motor compartilhado).

## Consequências
A fome passa a descer bem mais devagar (andar é grátis; ~200 m correndo gastam a saturação inicial). Sem mudança de save (`header.vitals` igual), de gerador nem de protocolo; a sala só importa tipos e funções de leitura de `vitals.ts` (nada de exaustão), então o servidor não precisa de `sync-net` por esta entrega. Testes: `titan/vitaisWiki.test.ts` (5) e ajuste em `noz.test.ts`.
