# ADR 0021 — Bichos da sala: o servidor roda animais e monstros (Etapa 3)

- **Status:** aceita (v0.70.0, protocolo 13; orvalis-servidor 0.14.0)
- **Data:** 2026-11-07
- **Pedido:** na sala compartilhada as aranhas e os animais eram de cada aparelho (cada um via os seus). O dono do
  produto pediu a Etapa 3 do plano da sala compartilhada (NEXT_STEPS, Fase M 3b).

## Decisão

1. **Uma simulação, dois lugares.** As `Entities` do jogo passam a rodar também na sala do servidor (`Room`), com as
   mesmas regras (passeio, namoro e filhotes, perseguição, mordida, golpe, morte, renascimento). Diferença por
   configuração, não por cópia de código:
   - `player` opcional (null na sala); os jogadores entram como **avatares** (`Entities.avatars`, `Player` na posição
     que cada um manda pelo `state`): os monstros perseguem o mais perto (mapa de distâncias com várias origens),
     mordem quem está encostado (`onBite`) e os golpes saem do avatar (`strikeFrom`);
   - `remote` no aparelho dentro da sala: animais e monstros não são simulados; o `CreatureMirror` mantém nas listas
     das `Entities` os mesmos objetos (`Sheep`, `FarmAnimal`, `Monster`) seguindo a sala, suavizados. Colisão, toque,
     alvo do golpe e anel de comida seguem o código de sempre.
2. **Protocolo 13**: a sala manda a cada jogador `mobs` (~10×/s, só os bichos a até 22 células dele, formato curto
   `MobState`); o jogador manda `strike` (direção + força = ataque + arma) e `feed` (id + item). A sala responde
   `hits` (números de dano, para todos), `drops` (espólio de aranha vira item da sala), `bite` (só ao mordido: o dano
   sai da defesa dele, no aparelho) e `fed` (só a quem deu: o item sai da bolsa).
3. **Relógio do servidor a 10×/s** (`TICK_MS`); as plantas continuam crescendo de segundo em segundo; a simulação anda
   em passos de no máximo 0,1 s. Sem ninguém na sala, os bichos ficam parados.
4. **Moradores continuam locais** (enfeite da cidade, sem efeito no jogo): cada aparelho tem os seus.
5. Monstros **não vão para o disco** (renascem pela seed). Os animais vão desde a v0.73.0 (`RoomSnapshot` v3).

## Consequências

- Custo medido em Node: ~70 ms de CPU por minuto de jogo com 56 bichos; ~0,6 kB por mensagem `mobs` perto do campo
  (~6 kB/s por jogador).
- A força do golpe e a bolsa vêm do aparelho (sem contas não há como conferir); o resto (quem foi atingido, dano em
  monstro, morte, espólio, quando a aranha morde, se o animal come) é decidido pela sala.
- O mundo do servidor carrega os chunks em volta de cada jogador, do campo dos animais e do covil, e não descarrega
  (memória cresce com a área visitada; descarregar quando pesar).
- Com atraso de rede, o golpe acerta onde a sala vê o bicho (até ~0,1–0,2 s atrás do desenho).
