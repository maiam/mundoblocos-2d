# ADR 0138 — Orvalis em sala, entrega A: sala básica (v0.207.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ([Simulation distance](https://minecraft.wiki/w/Simulation_distance), [server.properties](https://minecraft.wiki/w/Server.properties), [Game rule](https://minecraft.wiki/w/Game_rule), [Bed](https://minecraft.wiki/w/Light_Blue_Bed)) → estado atual (ADR 0104) → proposta → aprovada nos 7 pontos: três entregas (A sala básica, B fauna, C pesca e botes), sala 102 "Orvalis 1" com seed 20261127 e 10 jogadores, dormir como a Wiki (todos precisam dormir; já era assim), fauna simulada no servidor ao redor dos jogadores, o piloto manda a posição do bote e o servidor valida, a boia só do dono, e autorização para mesclar os PRs do servidor.

## Wiki
Para pular a noite, por padrão todos os jogadores precisam dormir (`players_sleeping_percentage` 100); só se atualiza o que está dentro da distância de simulação dos jogadores; mobs nascem a 24 blocos ou mais; 20 jogadores por padrão.

## Decisão (entrega A)
1. **Salas por mundo:** `TITAN_ROOMS` ganha `world` (`'titan' | 'orvalis'`) e `titanRoomsOf(world)`; nasce a **sala 102 "Orvalis 1"** (seed 20261127, `world: 'orvalis'`, 10 jogadores como a do Titã). A sala 101 segue igual. `?sala=<id>` só vale se a sala é do mundo em que se joga.
2. **`TitanRoom(id, nome, seed, rand, kind)`:** o 5.º argumento escolhe o gerador (`OrvalisGenerator` ou `TitanGenerator`); `restore` usa a fábrica do mundo do arquivo e **recusa o snapshot de outro mundo**; o cliente abre o `welcome` com o gerador de `header.world`.
3. **O que já vale na sala do Orvalis, sem código novo:** blocos, itens soltos, horta e cultivo, fornalha, clima e relógio, cama e sono (todos precisam dormir, a Wiki), morte, flora marinha e recifes (vêm do gerador); **a morte do bloco de coral vivo sem água** passou a rodar no relógio da sala (`stepCoral`).
4. **Ainda fora da sala** (entregas B e C): fauna de fazenda (a sala nasce sem fauna e o cliente a zera: `world.fauna = []`), pesca e botes — a ação `place` com vara ou bote é recusada ("Ainda não disponível nas salas") e nada é gasto.
5. **Cliente:** o botão de salas aparece também no Orvalis ("Jogar na sala: Orvalis 1", "Sair da sala (n/10)").
6. **Protocolo:** sem mudança de mensagem nesta entrega (`TITAN_PROTOCOL_VERSION` 3); sobe na entrega B. **Servidor:** `src/app.js` passa `def.world` à sala; o pacote é sincronizado (`build:net` + `sync-net`).

## Consequências
Pendentes (entregas B e C): fauna no servidor (mensagem `fauna`, golpe e comida por ação, persistência), pesca (boia por jogador no servidor), botes (lista compartilhada, o piloto manda a posição e o servidor valida), e o protocolo 4. Fora do escopo: chat, PvP, jogadores em botes, anti-trapaça da bolsa e da fabricação, salas privadas. Testes: `net/titan/salaOrvalis.test.ts`; conferido no navegador (`?sala=102&loopback=1`: mundo do Orvalis, seed da sala e botão "Sair da sala").

## Entrega B (v0.208.0): fauna de fazenda na sala
1. **Protocolo 4** (`TITAN_PROTOCOL_VERSION`; jogo e servidor sobem juntos): mensagem do servidor `fauna` (`WireFauna`: id, espécie, posição, giro, fase, filhote, vida, amor, se anda, segundos do último golpe e relógio da animação) e ações `strikeFauna` e `feedFauna` (só o `id`; a comida é a da mão do jogador na sala).
2. **O servidor simula** (`TitanRoom.tick`): cada animal anda a até `TITAN_FAUNA_SIM_RADIUS` 48 m de algum jogador (os em pânico sempre), com `stepFauna` e `tickBreeding` do jogo; **sem jogador, a fauna não anda**. A população vem da seed (`fresh`) e vai ao snapshot (`header.fauna`); a posição vai ao disco de minuto em minuto (`TITAN_FAUNA_SAVE_EVERY`).
3. **A cada jogador**, a cada 0,2 s (`TITAN_FAUNA_EVERY`), os 40 mais próximos a até 64 m; o `welcome` **não** leva a fauna (`header.fauna` é retirado) e o aparelho começa vazio e espelha o fluxo (`TitanClient.mirrorFauna`, por id; o relógio da animação segue sozinho entre as mensagens; `faunaMoving` guarda quem anda).
4. **Golpe e comida pelo servidor** (`strikeFauna`/`feedFauna` da sala): alcance (`TITAN_STRIKE_REACH`), pausa de 0,6 s por jogador, as mesmas regras de `attackFauna`/`feedFaunaFromSlot`; o espólio cai no chão da sala (mensagem `drops`) e o filhote que nasce vira animal da sala. Aparelho e servidor gastam a exaustão do golpe cada um no seu lado de vida.
5. **Arquivo da entrega A:** o snapshot ganha a marca `fauna: 1`; sem ela (sala 102 gravada na entrega A, com fauna vazia), a fauna volta à da seed.
Testes: `net/titan/salaFauna.test.ts` (protocolo, simulação, mensagem, golpe, comida, snapshot, cliente); conferido no navegador (`?sala=102&loopback=1`: 11 animais espelhados, ovelha e galinha, sem erros). **Pendente na entrega C:** pesca e botes; o que ainda falta de fauna: a fauna a mais de 48 m não anda (como no aparelho), leite e tosquia (#38).
