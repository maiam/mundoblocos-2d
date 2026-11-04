# Domínio: salvamento (persistência local)

Decisão: ADR 0011. Código: `game/save.ts` (formato e armazenamento), `World.modifiedChunks/restoreChunk`,
`Inventory.entries/replaceAll`, `game/menu.ts` (menu), `main.ts` (qual seed abrir).

## O que é salvo (`SaveData`, versão `SAVE_VERSION` = 5)
| Parte | Origem | Observação |
|---|---|---|
| Seed, mundo, hora do dia | `World`, `Game` | — |
| Chunks editados | `World.modifiedChunks()` | chão + 3 níveis em base64; plantações reconstruídas |
| Heroína | `Player` | posição, nível, vida, direção |
| Item selecionado, inventário | `Game`, `Inventory` | por `StackId`: itens, espólios, materiais, ferramentas |
| Grade (9 itens) | `Hotbar.layout()` | null no Santuário (grade fixa) |
| Tenda (ponto de renascer) | `World.tent` | — |
| Baús | `World.chests` | 27 espaços cada |
| Ovelhas | `Entities.npcs` | posição, casa, filhote, idade, paixão, espera (namoro em curso não) |
| Cidade | (nada) | fixa; ao carregar, células protegidas de chunks salvos voltam do gerador e baús inexistentes são descartados |
| Dungeon | `Entities.monsters/respawns` | vivos com vida; renascimentos com o tempo restante |
| Não salvo | — | itens caídos no chão, animações, mapa de distâncias |

## Quando salva
A cada 10 s de jogo, ao esconder a aba, ao sair da página, ao abrir o menu e ao trocar/recomeçar mundo.

## Seeds e chaves
- `mundoblocos:save:<mundo>:<seed>` (um por seed) e `mundoblocos:last:<mundo>`.
- `main.ts`: `?seed=` na URL → essa seed (continua se houver salvamento dela); sem parâmetro → última jogada;
  nenhuma → seed aleatória.

## Menu (☰, canto superior direito)
Continuar · Novo mundo (o atual continua salvo) · Recomeçar este mundo (apaga só o salvamento desta seed).
Novo mundo e Recomeçar pedem **confirmação no próprio botão** (tocar de novo em até 5 s) — nunca `window.confirm`,
que o iframe do Artifact bloqueia sem mostrar nada. Depois, um aviso na tela confirma ("Novo mundo criado ·
semente N" / "Mundo recomeçado do zero"): como todo mundo começa na Cidade do Despertar, sem o aviso parecia que nada mudou.
Mostra a semente e o estado do salvamento. Com o menu aberto o jogo pausa.

## Ao carregar
- Heroína presa dentro de um objeto (`Walker.isStuck`, ex.: salvamento feito com a tenda sobre ela) vai para a célula
  livre mais perto.

## Migrações
- v1 → v2 (coleta): ganha as ferramentas e 1 porta no inventário e a grade inicial.
- v2 → v3 (receitas): grade da mão com 9 espaços (9º vazio) e `tent: null`.
- v3 → v4 (baú): `chests: []`.
- v4 → v5 (vida com números, Fase P): vida da heroína de meios corações (máx. 10) para pontos (×10 da vida máxima) e
  vida das aranhas de golpes para pontos, na mesma proporção (`MONSTER_STATS`).

## Regras para quem mexer
- Estado novo que deva persistir → campo em `SaveData` + `captureSave/applySave` + teste de ida e volta.
- Mudou a estrutura → subir `SAVE_VERSION` e tratar em `migrate` (ou aceitar que salvamentos antigos recomecem).

## Multiplayer (ADR 0016)
- Numa sala ("Jogar com amigos") **nada é salvo no aparelho**: o mundo é o da sala (seed dela), e o salvamento do
  mundo solo fica intacto — "Sair da sala" volta a ele. As edições da sala vivem no servidor só enquanto alguém está
  nela (guardar salas é pendência da Fase M). O nome de convidado fica em `localStorage` (`mundoblocos:nome`).
