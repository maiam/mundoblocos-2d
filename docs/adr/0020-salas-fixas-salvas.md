# ADR 0020 — Salas fixas e salvas no servidor (mundo compartilhado)

- **Status:** aceita (v0.64.0, protocolo 8; orvalis-servidor 0.9.0)
- **Data:** 2026-11-06
- **Pedido:** ao sair de uma sala os jogadores perdiam tudo (mundo e itens). O dono do produto pediu uma sala fixa
  onde se entra e sai quando quiser, com tudo o que se faz salvo no servidor e visto por todos; bolsa guardada no
  servidor; salas listadas por número (por enquanto só a Sala 1, até 10 jogadores ao mesmo tempo); sem salas de convite.

## Decisão

1. **Salas fixas** (`ROOMS` em `src/net/protocol.ts`): número, nome e seed fixa. O servidor abre todas ao ligar e
   nunca as fecha; o relógio e o crescimento andam com ou sem gente (ADR 0016, item 5). Entrada só com nome (sem
   senha: aberta a quem abrir o site), `MAX_PLAYERS` = 10, dois com o mesmo nome ao mesmo tempo são recusados.
2. **Mundo salvo como fotografia**: a sala guarda o `World` autoritativo; o `welcome` manda os chunks editados (mesmo
   formato do salvamento local, `src/net/b64.ts`) em vez da lista de ações, e o servidor grava `Room.snapshot()`
   (`RoomSnapshot`: chunks, hora, bolsas) num arquivo por sala (`sala-<n>.json`) a cada 15 s quando algo mudou e ao
   desligar; ao ligar, `Room.restore()` (só se sala e seed batem).
3. **Bolsa por nome** (`RoomBag`: itens, grade da mão, posição): o jogo manda a cada 5 s quando muda e ao sair
   (`{ t: 'bag' }`); volta no `welcome` com o mesmo nome (sem diferença de maiúsculas). Fora da sala, o jogo sozinho
   continua com a própria bolsa (as duas não se misturam).
4. **Pasta dos dados fora do código** (`DATA_DIR`, padrão `~/orvalis-dados`): o deploy da Hostinger troca a pasta do
   app a cada merge. `/saude` mostra a pasta, a última gravação e se cada sala veio do disco. Se a hospedagem não
   guardar arquivos fora do app, o plano é o MySQL da hospedagem (mesma `RoomSnapshot`).
5. Salas com código de convite **removidas** (protocolo, menu, servidor).

## Consequências

- Nome não é conta: quem digitar o mesmo nome pega a mesma bolsa. Contas vêm com o backend de contas (NEXT_STEPS).
- O `welcome` cresce com o mundo editado (~1,4 kB por chunk editado); comprimir/paginar quando passar de algumas
  centenas de chunks.
- Ainda locais em cada aparelho: baús (conteúdo), itens caídos, aranhas, animais e moradores — Etapas 2 e 3 da sala
  compartilhada (NEXT_STEPS, Fase M 3b), agora sobre a sala fixa.
