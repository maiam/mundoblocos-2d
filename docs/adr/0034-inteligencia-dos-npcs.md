# ADR 0034 — Inteligência dos NPCs (plano em 4 níveis, sem LLM)

- **Status:** **plano aprovado** (15/11/2026); nada implementado ainda. Piloto: o mercador **Bento**.
- **Relaciona:** `docs/domains/npc.md`, ADR 0011 (save), 0016/0021 (sala), 0012/0014 (cidade e interiores), `docs/NEXT_STEPS.md`.

## Contexto
Hoje os 16 moradores só **passeiam** (`Villager`: parar ↔ andar, volta para casa) e os de ofício (Black, Bento, Rosendo) ficam fixos nos cômodos. O dono
do produto quer NPCs que pareçam vivos — rotina, reação, memória, objetivos — **sem LLM, sem internet e sem custo por jogador**, e **mais moradores** na
cidade e na vila, aproveitando as pranchas existentes com aleatoriedade. Fatos do código que moldam o plano:
- Os moradores rodam **só em cada aparelho** (a sala do servidor não os simula): memória e rotina podem viver no **salvamento do jogador**, sem protocolo.
- Já existe a hora do dia (`time`, `DAY_LENGTH_S`), sincronizada pela sala. A cidade é **zona segura** (sem monstros); as casas não têm interior.
- 16 folhas de arte únicas (~90 KB cada, baixadas quando o ator aparece); o jogo **nunca lê canvas** (recolor só por shader ou em script de build).

## Decisão — os 4 níveis
Um módulo **puro, sem DOM** (`src/game/npcBrain/`: percepção, memória, utilidade, agenda); o `Villager` só **executa** (andar, trabalhar, conversar).
Decisões a cada 1–2 s, **desencontradas** entre os NPCs e só para os que estão perto do jogador; escolhas por **hash da seed** (sem `Math.random`: testável).
Técnica: **Utility AI** como cérebro (pontua as ações e escolhe a melhor, com histerese contra troca excessiva) e **máquinas de estado pequenas** por ação;
árvore de comportamento só se os guardas pedirem.

| Nível | Entrega | Guarda | Dependências |
|---|---|---|---|
| **1 — Rotina** | Agenda por hora: acorda, trabalha, passa na praça, **dorme**. Lojas **fecham à noite** (a janela diz "fechado"). | nada (só a hora) | Dormir = **andar até a porta da casa, escurecer e sair do mapa**; de manhã sai dela (decisão do dono do produto). |
| **2 — Reativo** | Cumprimenta e olha para o jogador; foge de perigo perto da vila/campo (lobo); a Guarita avisa. | nada | A cidade não tem monstros: as reações são à vila, ao campo e aos bichos. |
| **3 — Memória** | Lembra visitas, compras, última vez, relação (0–100); falas **escritas** escolhidas por condição (sem gerar texto). | **salvamento do jogador** (nova `SAVE_VERSION`) | Mais frases por NPC; o servidor/sala **não** guarda memória. |
| **4 — Objetivos e boatos** | Necessidades (descanso, trabalho, social), prioridades e um **quadro de acontecimentos** (matou um chefe → os outros comentam); missões da Guilda. | save + eventos do mundo | Só depois dos níveis 1–3 prontos e medidos. |

## Piloto: Bento (mercador)
Rotina (abre, atende, fecha, vai para casa, dorme), loja fechada à noite, memória de compras e do número de visitas, frases por relação, reação a perigo.
Escolhido porque já tem cômodo, loja (`ShopWindow`) e retrato. Depois o mesmo modelo vira **reutilizável** para os outros moradores.

## Mais moradores (decisão: recolor por código + sorteio)
- **Recolor no shader** do billboard (2–3 paletas por folha existente; sem arte nova e **sem peso extra** de arquivos).
- **Nome, profissão e personalidade sorteados por seed** a partir de listas; falas por profissão (nível 3 as combina com a memória).
- Limite assumido: dá "primos" dos 16 rostos, não rostos novos (para isso, arte nova — fora do escopo desta decisão).
- A vila ganha os seus (camponeses, pastor); a cidade, mais gente nas ruas. Moradores genéricos não têm retrato próprio (usam o da folha-base).

## Consequências e riscos
- Desempenho: orçamento de decisões por quadro e **NPC distante não é simulado** (volta ao ponto da agenda ao aproximar).
- Mundos já salvos: o novo bloco de memória nasce vazio (migração aditiva do save).
- Sala/servidor: nenhum protocolo novo; se um dia os NPCs forem compartilhados entre jogadores, isso vira ADR à parte.
- Ordem sugerida: (1) `npcBrain` puro + agenda + Bento (nível 1); (2) loja fechada/dormir pela porta; (3) memória e falas (nível 3); (4) recolor + moradores
  sorteados; (5) reações (nível 2); (6) objetivos e boatos (nível 4).
