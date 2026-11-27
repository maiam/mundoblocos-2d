# ADR 0125 — Reprodução da fauna de fazenda do Orvalis (auditoria #36, v0.194.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ("Breeding", "Baby", "Pig", "Tutorial:Animal farming") → estado atual → proposta → o dono aprovou os 4 pontos (gesto, comida do porco, teto e filhote a ½ sem XP, persistência).

## Wiki
Alimentar um adulto o põe em **modo de amor**; sai se não cruzar em **30 s**. Os pais descansam **5 min**. O filhote cresce em **20 min**; alimentar corta **10 % do que falta** (Java). Comida: vaca e ovelha trigo; porco cenoura, batata ou beterraba; galinha sementes (gera o pintinho direto; ovos à parte). XP de 1–7 aos pais. Filhote: metade da caixa.

## Decisão
1. **Comida:** vaca e ovelha `Trigo`; porco `Cenoura` e `Batata`; galinha `Semente de Trigo` (`BREED_FOOD`). **Sem beterraba** e sem as outras sementes: ainda não são cultura do Orvalis (a arte está em `assets-src/orvalis-voxel/{alimentos,cultivos}/`).
2. **Gesto (adaptação):** o toque curto num animal com a **comida da espécie na mão alimenta**; com qualquer outra coisa, golpeia como antes. Só gasta 1 unidade se a comida tem efeito (adulto em amor ou descansando não aceita e não gasta).
3. **Amor e cruzamento:** 30 s. Dois adultos da mesma espécie em amor, a até 8 m (e no mesmo nível ±2), andam um até o outro; ao se encostarem (1,2 m) nasce um filhote entre eles, o amor acaba e os dois descansam 300 s (`tickBreeding`).
4. **Filhote:** **metade da caixa de acerto e da vida** (arredondada para cima), modelo do adulto a ½ de escala (o pacote só traz o adulto), segue o adulto da espécie mais perto (≤ 12 m) quando está a mais de 2,5 m, **não solta espólio**, cresce em **1200 s** (alimentar corta 10 % do que falta) e vira adulto com a vida cheia.
5. **Retirado:** XP (o Orvalis não tem). **Adaptação:** teto de **200 animais vivos** (`MAX_FAUNA`; a Wiki não tem); com o teto, ninguém nasce.
6. **Persistência: mantida como dívida** ("Ok" à proposta): filhotes, amor, descanso e crescimento **não vão ao save**; reabrir o mundo traz só a população da seed (v3). Persistir pede `TITAN_SAVE_VERSION` nova e campo opcional no cabeçalho.
7. O crescimento e o amor só correm para quem está a até 48 m do viajante (a simulação da fauna, ADR 0124).

## Fora do escopo
Cor do filhote da ovelha (sem tingimento), ovos e pintinho por ovo, galinha com queda lenta, beterraba como alimento do porco (depende da cultura), persistência no save, geração contínua, sons.

## Consequências
Sem mudança de gerador, de save nem de protocolo (o servidor não precisa de `sync-net`). Testes: `titan/orvalis/reproducao.test.ts` (12).
