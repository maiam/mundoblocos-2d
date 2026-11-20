# ADR 0069 — Titã: vida do Farejador, combate corpo a corpo e carne (v0.126.0)

**Status:** Aceita. Etapa 4 de 4 do pacote "O que a duna guarda" (números e arte **provisórios**, autorizados pelo dono do produto). Estende ADR 0061/0064 (Farejador), 0067 (durabilidade) e 0068 (braseiro).

## Decisão
1. **Vida do Farejador** (`titan/creature.ts`): `KINDS[kind].hp` (pequeno 10, grande 30) e `name`. `hurtFarejador(f, dano)` tira vida, dispara o tranco (`hurt`, inclina a cabeça no modelo) e **provoca**: `aggro = 8 s` faz o animal investir mesmo fora do raio de visão (dentro de `chaseRadius`). Vida/aggro são só de execução; o animal vivo volta cheio ao reabrir.
2. **Mira e golpe**: `creatureAim` (raio × esfera `hitSphere`) até `ATTACK_REACH = 3 m`, escondido por bloco à frente (`blockDist`); o animal mirado vira alvo `kind: 'creature'` do `InteractionGesture` (`toTarget`), com rótulo "Farejador grande · 26/30", e **só o toque curto age** (`breakTotalMs('creature') = null`: segurar não quebra nem bate em série). Pausa de `0,6 s` entre golpes (`strike` no `titanGame`).
3. **Dano** (`titan/combat.ts`, fonte de verdade): punho 1, picareta de rocha 2 / cobre 3, adaga de rocha 4 / cobre 6. O desgaste do golpe passa por `wearHeldTool({type:'attack'})` (ADR 0067: adaga −1, picareta −2); a arma que quebra no golpe ainda causa o dano.
4. **Abate**: o animal sai de `session.creatures`; solta no chão **carne crua** e **Placa de Carapaça** (`restDrop`, ids `m:<tipo>:<n>:<0|1>`): pequeno 1 + 1, grande 2 + 1. O tipo abatido **volta na toca após 600 s de jogo ativo** (`session.respawn`, `header.respawn` opcional no save, sem subir versão; `tickRespawn`); fechar e abrir não devolve o animal de graça.
5. **Comida**: itens 27 Carne Crua (fome 2, sat. 1,2) e 28 Carne Assada (8 / 12,8), pelo `FOOD`/`foodOf` de sempre; receita `carne-assada` (1 crua → 1 assada) com estação `brazier`, 10 s no braseiro (ADR 0068). Atlas de ícones 128 × 256 (ícones provisórios do conceito).
6. Sem ADR novo de multiplayer: o Titã é solo; `GENERATOR_VERSION` e `TITAN_SAVE_VERSION` não mudam.

## Atualização (v0.131.1): mira
`creatureAim` desempata pelo animal mais perto do eixo da mira (proporcional ao raio, para o pequeno não ficar escondido na esfera do grande, que nasce na mesma célula) e tem uma ajuda de mira rente aos pés (≤ 1,4 m, dentro de 60° do olhar, escondida por bloco mais perto).

## Consequências
- Primeiro dano ao viajante já existia (investida); agora há resposta. O animal não tem cadáver nem animação de morte (some e solta os itens).
- Pendências: balanço dos números; animação/efeito de morte e de golpe recebido no modelo com rig; som próprio do Farejador; aceite em aparelho do toque curto (mira a 360 px).
- Testes: `combat.test.ts` (+6).
