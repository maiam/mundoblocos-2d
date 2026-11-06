# ADR 0016 — Multiplayer: co-op com convite, convidados, servidor autoritativo

**Status:** aceito (2026-11-04). Complementa a ADR 0015 (servidor próprio do Orvalis).

## Contexto
O dono do produto quer um modo multiplayer. O terreno é função pura da seed (ADR 0001) e as regras de colocar/quebrar/
plantar já vivem no `World`, sem DOM — então só as **edições** precisam trafegar e o servidor pode validar com o mesmo
código. O servidor roda num app Node.js da Hostinger (`orvalis-servidor.pensamentos.online`, WebSocket validado).

## Decisões do dono do produto (2026-11-04)
1. **Co-op pequeno com código de convite**: até `MAX_PLAYERS` = 4 por sala; quem cria recebe um código de 6
   caracteres (sem 0/O/1/I/L); os outros entram digitando o código. Cada sala tem um mundo (a seed da sala).
2. **Entrada só com nome, como convidado**: 2–16 letras/números (`sanitizeName`); sem conta nem senha.
3. **Sem combate entre jogadores**: golpes não atingem outros jogadores.

## Decisão técnica
1. **Servidor autoritativo**: o jogo manda a ação (`action`), o servidor aplica pelas regras do `World`
   (`world/actions.ts`, `applyAction`) e devolve `applied` para todos. Recusou (ex.: cidade protegida) → `rejected` só
   para quem mandou. **Revisto na Etapa 3**: quem age aplica na hora no próprio mundo (mesmas regras — o
   `ActionController` não muda, só avisa `onAction`) e ignora o próprio `applied`; esperar a rede deixava a quebra e a
   colocação com atraso visível. Recusa só acontece em corrida (dois na mesma célula) e hoje só gera um aviso.
   A posição de cada um (`state`) é do próprio jogo, repassada aos outros (sem validação de movimento por enquanto).
2. **Código compartilhado, não copiado**: `src/world/actions.ts` (ações como dados + `applyAction`), `src/net/protocol.ts`
   (mensagens, códigos, nomes, leitura segura de texto da rede) e `src/net/room.ts` (`Room`: sala pura, sem rede nem
   relógio) são usados pelo jogo e pelo servidor. O servidor só embrulha `Room` num WebSocket. **Pacote**: `npm run
   build:net` (esbuild) gera `dist-net/orvalis-net.cjs` — um arquivo CommonJS sem dependências, com versão e commit
   no cabeçalho; o servidor guarda uma cópia em `vendor/` (`npm run sync-net`), sem instalar o repositório do jogo
   (que tem arte pesada). A Verificação do jogo garante que o pacote compila.
3. **Teste sem servidor**: `src/net/loopback.ts` (`LoopbackServer`) roda salas dentro do próprio jogo, passando as
   mensagens por JSON como na rede; `src/net/session.ts` (`NetSession`) é o lado do jogo (aplica `applied`, guarda os
   outros jogadores). Testes em `src/net/net.test.ts`.
4. **Versão do protocolo** (`PROTOCOL_VERSION`): mudança incompatível sobe a versão; o servidor recusa versões
   diferentes com mensagem clara ("recarregue a página").
5. **Sala dona do tempo** (v0.63.0, protocolo 7): `Room` continua sem relógio próprio — o servidor chama
   `room.tick(dt)` 1×/s com o tempo real. A sala guarda a hora do dia e faz plantas/árvores crescerem; os jogos na sala
   não crescem sozinhos, só aplicam o `grow`. Itens caídos e entidades seguem o mesmo princípio nas próximas etapas
   (`NEXT_STEPS`, Fase M 3b): o código do jogo roda na sala, nunca num jogador "anfitrião".

## Consequências
- Etapa 2 (servidor): pacote `world`+`net`, WebSocket → `Room`, salas em memória; edições da sala guardadas por chunk.
- Etapa 3 (jogo): tela de entrar/criar sala, ligar `NetSession` ao `Game` (ações do `ActionController` viram
  `act`, outros jogadores desenhados com nome), monstros e itens caídos passam a ser do servidor.
- Inventário e alcance ainda são conferidos só no jogo; o servidor garante as regras do mapa. Inventário no servidor
  vem com contas/nuvem.
- O Artifact de teste segue só para um jogador (não deve abrir conexões externas).
- **Atualização (v0.64.0, ADR 0020)**: o convite por código foi substituído por salas fixas salvas no servidor.
