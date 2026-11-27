# ADR 0126 — Fauna de fazenda no save (v0.195.0)

**Estado:** aceita (27/11/2026). Aprovada pelo dono ("Sim") sobre a recomendação de persistir o instantâneo da fauna. Substitui a dívida registrada nas ADRs 0124 e 0125 (animais, filhotes e abates fora do save). Persistência de estado, não regra de mundo nova: a Wiki não se aplica.

## Problema
Os animais eram só de execução: reabrir o mundo trazia de volta os abatidos (infinitos) e fazia sumir filhotes, vida e descanso, então criar animais nunca durava de uma sessão para a outra.

## Decisão
1. **`header.fauna` (opcional):** lista de `{ id, k, x, y, z, hp, b?, g?, r? }` — id, espécie, posição, vida, filhote (`b: 1`) com os segundos que faltam para crescer (`g`) e o descanso (`r`). O **modo de amor (30 s) não vai** (curto demais para valer a pena).
2. **Presente (mesmo vazio) = a população da partida, no lugar da seed**; **ausente** (saves antigos) = a população da seed (`faunaSpecs`). Assim o abate persiste e saves antigos continuam abrindo.
3. **`TITAN_SAVE_VERSION` 6.** Só o Orvalis a partir da v3 grava o campo (`hasFauna`); o Titã e a v ≤ 2 não.
4. **Leitura cuidadosa** (`faunaFromData`): descarta o que não é animal válido (espécie, id, números finitos, dentro da região), limita vida, crescimento e descanso, ignora ids repetidos e corta em `MAX_FAUNA` (200). Quem fica dentro de um bloco construído sobe para o primeiro ar.
5. **Quando grava:** o instantâneo acompanha todo salvamento do cabeçalho (posição do jogador, a cada ~5 s); abate, nascimento e alimentar marcam o estado como pendente (`metaRev`). A posição exata dos animais vale até o último salvamento.
6. Sem mudança de gerador nem de protocolo (a fauna é só do aparelho).

## Consequências
Testes: `titan/orvalis/faunaSave.test.ts` (7: ida e volta, abate persistente, população vazia, save antigo, dados inválidos e teto, arredondamento). Fica como dívida: animais fora do raio de simulação (48 m) não crescem nem se mexem enquanto o jogador está longe; amor não persiste.
