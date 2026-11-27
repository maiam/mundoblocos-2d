# Auditoria das regras de mundo (ADR 0116)

**Regra (dono do produto, 27/11/2026):** antes de implementar ou mudar uma regra de mundo, consultar a **Minecraft Wiki** (https://minecraft.wiki), apresentar o **Orvalis e o Titã atuais**, formular a **proposta** (manter, adaptar ou retirar, e por quê) e **aguardar a aprovação**. Vale também para as regras **já implementadas**: o que não passou por esse ciclo está **pendente de auditoria**, mesmo funcionando.

Ciclo de cada regra: **1.** Minecraft Wiki (funcionamento, fontes, parâmetros) → **2.** estado atual no código (comportamento e valores) → **3.** proposta (manter / adaptar / retirar) → **4.** aprovação → só então a alteração.

Estados: **pendente** (nunca auditada) · **proposta enviada** (aguardando resposta) · **aprovada** (decidida; a alteração, se houver, ainda não feita) · **implementada** (código e docs alinhados). A ordem das auditorias é a que o dono do produto escolher; uma regra por vez.

| # | Área | Regra | Onde está no código | Estado |
|---|---|---|---|---|
| 1 | Geração | Seed e fontes de aleatoriedade por finalidade (`PURPOSE`, `derive`) | `titan/orvalis/generator.ts`, `titan/generator.ts`, `world/random.ts` | pendente |
| 2 | Geração | Relevo, mar e rios (nível do mar Y = 64, baías, rios cavados) | `titan/orvalis/generator.ts`, `titan/generator.ts` | pendente |
| 3 | Geração | Biomas e superfície/subsolo (Campos, Bosque de Sakura, praia, pedra em encostas) | `titan/orvalis/generator.ts`, `titan/biomes.ts` | pendente |
| 4 | Geração | Árvores e vegetação (grade de sorteio, copas) | `titan/orvalis/generator.ts` | pendente |
| 5 | Geração | Chegada e renascimento (clareira, `arrival`) | `titan/orvalis/generator.ts`, `titan/session.ts` | pendente |
| 6 | Geração | Veios e minérios do Titã (`ORE_RULES`) e fontes garantidas | `titan/ores.ts`, `titan/generator.ts` | pendente |
| 7 | Geração | Região finita (128 × 128, parede invisível) e versão do gerador | `titan/generator.ts` (`regionFor`), `titan/terrain.ts` | pendente |
| 8 | Chunks e custo | Chunks 16 × 16, seções 16³, distância de desenho (`RANGE` 64) e de simulação (56 m) | `titan/volume.ts`, `titan/sections.ts`, `render/titanRenderer.ts` | pendente |
| 9 | Luz | Luz de bloco (lanterna 15, braseiro 13), propagação e bloqueio | `titan/light.ts`, `titan/voxel.ts` | implementada (ADR 0119, v0.186.0) |
| 10 | Tempo | Ciclo de dia e noite (20 min), céu e relógio de jogo | `titan/sky.ts` | implementada (ADR 0118, v0.185.0) |
| 11 | Tempo | Random ticks e passo de simulação (cultivo, braseiro, respawn) | `titan/crops.ts`, `titan/session.ts` | pendente |
| 12 | Física | Gravidade, pulo, corrida, velocidade e dano de queda | `titan/physics.ts`, `titan/vitals.ts` | pendente |
| 13 | Física | Colisão por caixa, degrau automático (0,6 m), salto automático, escada | `titan/physics.ts`, `titan/voxel.ts` | pendente |
| 14 | Física | Água: flutuar, sair da água, mergulho, balde (sem fluxo) | `titan/physics.ts`, `titan/underwater.ts`, `titan/actions.ts` | pendente |
| 15 | Blocos e ações | Colocar bloco: alcance, apoio, colisão com o jogador, orientação | `titan/actions.ts`, `titan/aim.ts`, `titan/slabs.ts` | pendente |
| 16 | Blocos e ações | Quebra progressiva: tempo por bloco, ferramenta certa, mão nua | `titan/breaking.ts`, `titan/gesture.ts` | implementada (ADR 0117, v0.184.0) |
| 17 | Blocos e ações | Durabilidade das ferramentas e custo por ação | `titan/wear.ts`, `titan/items.ts` | pendente |
| 18 | Blocos e ações | Drops de bloco e coleta (itens soltos: gravidade, tempo de coleta, validade) | `titan/drops.ts`, `titan/actions.ts` (`spillBlock`) | pendente |
| 19 | Blocos e ações | Formas especiais: laje, degrau, mureta, porta, cama, baú, escada, esteira | `titan/voxel.ts`, `titan/slabs.ts`, `titan/actions.ts` | pendente |
| 20 | Fabricação | Receitas, bancada 3 × 3 e estações | `titan/recipes.ts`, `titan/inventory.ts` | pendente |
| 21 | Fabricação | Braseiro (Titã) e **Fornalha do Orvalis**: fundição, combustível e tempo; carvão vegetal | `titan/furnace.ts` | implementada (ADR 0120, v0.187.0) |
| 22 | Cultivo | Junco, Noz de Duna e horta: crescimento, fertilidade, umidade, colheita | `titan/crops.ts`, `titan/soil.ts`, `titan/nuts.ts` | pendente |
| 23 | Sobrevivência | Vida, fome, saturação, ar, regeneração e inanição | `titan/vitals.ts` | implementada (ADR 0130, v0.199.0) |
| 24 | Sobrevivência | Morte, itens da morte, renascer, cama e sono | `titan/actions.ts` (`dieAndRespawn`, `useBed`), `titan/sleep.ts` | pendente |
| 25 | Combate e fauna | Dano, alcance, intervalo, espólio e volta dos animais (Farejador) | `titan/combat.ts`, `titan/creature.ts` | pendente |
| 26 | Combate e fauna | Onde nascem os animais e quantos (`creatureSpecs`) | `titan/generator.ts`, `titan/biomes.ts` | pendente |
| 27 | Itens | Pilhas (64), hotbar 9 + bolsa 27, mover e dividir | `titan/inventory.ts`, `titan/items.ts` | pendente |
| 28 | Interface de jogo | Gesto (toque curto coloca, segurar quebra), mira, alcance, vista isométrica | `titan/gesture.ts`, `titan/aim.ts`, `titan/iso.ts` | pendente |
| 29 | Multiplayer | Salas cooperativas: autoridade do servidor, limites, ação confirmada (`applied`) | `net/titan/` | pendente |
| 30 | Salvamento | Persistência do mundo editado, do inventário e do estado (chunks, `header`) | `titan/save.ts`, `titan/session.ts` | pendente |
| 31 | Tempo | Clima: chuva e tempestade (hoje inexistente) | — `titan/weather.ts`, `titan/sky.ts`, `net/titan/room.ts` | implementada (ADR 0118, v0.185.0) |
| 32 | Luz | Luz do céu (sky light) e escuridão em cavernas e interiores (hoje inexistente: a luz do dia é um uniform global) | `titan/skylight.ts`, `titan/mesher.ts`, `titan/volume.ts` | implementada em 3 fases (ADR 0123, v0.192.0; dívidas: itens soltos, animais, mão) |
| 33 | Luz | Tocha do Orvalis (fonte de luz 14: receita, colocação em topo e laterais, quebra instantânea) | `titan/voxel.ts`, `titan/actions.ts`, `render/tochaModel.ts` | implementada (ADR 0121, v0.188.0) |
| 34 | Mineração | Carvão mineral: minério de carvão (geração, dureza, queda), Carvão e Bloco de Carvão (combustível, Tocha) | `titan/ores.ts`, `titan/orvalis/generator.ts`, `titan/furnace.ts` | implementada (ADR 0122, v0.189.0) |
| 35 | Fauna | Fauna de fazenda do Orvalis (porco, vaca, ovelha, galinha): vida, caixa de acerto, geração em grupos, fuga e espólio | `titan/fauna.ts`, `titan/combat.ts`, `titan/orvalis/generator.ts` | implementada (ADR 0124, v0.193.0) |
| 36 | Fauna | Reprodução da fauna de fazenda: comida, modo de amor, filhote, crescimento e descanso | `titan/fauna.ts`, `titan/faunaFeed.ts`, `titan/titanGame.ts` | implementada (ADR 0125, v0.194.0) |
| 37 | Cultivo | Beterraba do Orvalis: 4 idades, descarte de 1/3 do crescimento, colheita (1 + 1–4 sementes), semente silvestre e comida do porco | `titan/crops.ts`, `titan/actions.ts`, `titan/items.ts`, `titan/fauna.ts` | implementada (ADR 0127, v0.196.0) |
| 38 | Fauna | Leite (balde na vaca) e tosquia (tesoura na ovelha, lã que volta pastando) | `titan/fauna.ts` (futuro) | **em aberto** — proposta enviada em 27/11/2026; o dono adiou: aguarda arte e itens (tesoura, balde, ferro) |
| 39 | Cultivo | Abóbora e melancia do Orvalis: caule de 8 idades, fruto como bloco vizinho, caule conectado, 3–7 fatias, sementes | `titan/crops.ts`, `titan/session.ts`, `titan/actions.ts`, `render/titanRenderer.ts` | implementada (ADR 0128, v0.197.0) |
| 40 | Cultivo | Horta com 8 idades: trigo, cenoura e batata (idades, tempo, colheita da Wiki, migração do save) | `titan/crops.ts`, `titan/actions.ts`, `titan/session.ts`, `scripts/make-orvalis-horta.py` | implementada (ADR 0129, v0.198.0) |

## Registro das auditorias
_(cada auditoria entra aqui com a data, a decisão e a ADR ou item do CHANGELOG que a implementou.)_

- **#16 Quebra progressiva** — 27/11/2026: Wiki (fórmula dureza × 1,5 s ÷ velocidade) → proposta aprovada → implementada na v0.184.0 ([ADR 0117](adr/0117-quebra-por-dureza-do-bloco-minecraft-wiki.md)). Pendente: afinar as durezas provisórias dos blocos próprios do Titã e a velocidade do cobre.
- **#10 Ciclo de dia e noite e #31 Clima** — 27/11/2026: Wiki ("Daylight cycle", "Weather") → proposta aprovada → implementadas na v0.185.0 ([ADR 0118](adr/0118-ciclo-de-dia-e-noite-lua-e-clima-minecraft-wiki.md)). Pendente: trovão/raios e neve (fora do combinado), oclusão da chuva sob telhado, hidratação da enxada com chuva.
- **#9 Luz de bloco** — 27/11/2026: Wiki ("Light") → proposta aprovada ("manter a regra da wiki") → implementada na v0.186.0 ([ADR 0119](adr/0119-luz-de-bloco-so-o-cubo-opaco-bloqueia-minecraft-wiki.md)). Pendente: opacidade direcional de laje e degrau; **#32 Luz do céu** segue em "proposta enviada" (depende de uma fonte de luz no Orvalis).
- **#21 Fornalha do Orvalis e Carvão Vegetal** — 27/11/2026: Wiki ("Furnace", "Smelting", "Charcoal") → proposta aprovada nos 4 pontos → implementada na v0.187.0 ([ADR 0120](adr/0120-fornalha-e-carvao-vegetal-do-orvalis-minecraft-wiki.md)). Pendente: **Braseiro do Titã** (mantido, auditoria própria), batata assada e vidro (faltam item e arte), (ícone definitivo já entregue na v0.187.1). Libera a **Tocha (#33)** com a receita da Wiki (carvão vegetal + haste → 4).
- **#33 Tocha do Orvalis** — 27/11/2026: Wiki ("Torch") → proposta aprovada (parede junto, Tocha primeiro, receita da Wiki) → implementada na v0.188.0 ([ADR 0121](adr/0121-tocha-do-orvalis-minecraft-wiki.md)). Pendente: Tocha das Almas/de cobre/de redstone (sem regra); água destruir a tocha (não há fluxo). **#32 Luz do céu** é a próxima, nos dois mundos.
- **#34 Carvão mineral** — 27/11/2026: Wiki ("Coal Ore", "Coal", "Block of Coal") → proposta aprovada → implementada na v0.189.0 ([ADR 0122](adr/0122-carvao-mineral-do-orvalis-minecraft-wiki.md)). Pendente: ardósia abissal e minério em ardósia (sem camada), queda por ferramenta em geral (#18), minério de ferro e cobre (pacote P2-09). **#32 Luz do céu** é a próxima.
- **#32 Luz do céu** — 27/11/2026: Wiki ("Light") → proposta aprovada nos dois mundos → **fase 1** (motor puro e `skyLight` do volume) na v0.190.0 ([ADR 0123](adr/0123-luz-do-ceu-minecraft-wiki.md)). Faltam a fase 2 (mesher e shader) e a 3 (ajuste, chuva e noite, desempenho).
- **#32 Luz do céu, fase 2** — v0.191.0: mesher (`sky`), shader (`luz do dia × céu`, piso 5 %), remalha das seções afetadas e instâncias; cavernas e interiores escuros nos dois mundos. Falta a **fase 3**: plantas, itens soltos, animais e mão sob o céu; primeira conta progressiva; conferir o mergulho; `npm run bench`.
- **#32 Luz do céu, fase 3** — v0.192.0: plantas com céu, mergulho sem dupla escuridão. **#32 concluída** pelo combinado; pendentes: itens soltos, animais e mão sob o céu, primeira conta (~220 ms) progressiva.
- **#35 Fauna de fazenda** — 27/11/2026: Wiki ("Pig", "Cow", "Sheep", "Chicken", "Hitbox", "Mob spawning") → proposta aprovada nos 4 pontos (escopo só de comportamento, geração e espólio; espólio da Wiki; gerador v3; arte só em texturas) → implementada na v0.193.0 ([ADR 0124](adr/0124-fauna-de-fazenda-do-orvalis-minecraft-wiki.md)). **Regra permanente: a caixa de acerto de um mob é a da Wiki; o desenho é livre.** Pendentes: reprodução, leite, tosquia, ovos, geração contínua, abate no save, luz do céu nos animais, caixa de colisão da Wiki na física.
- **#36 Reprodução da fauna de fazenda** — 27/11/2026: Wiki ("Breeding", "Baby", "Pig") → proposta aprovada nos 4 pontos (gesto de alimentar, comida do porco sem beterraba por ora, teto de 200 e filhote a ½ sem XP, persistência mantida como dívida) → implementada na v0.194.0 ([ADR 0125](adr/0125-reproducao-da-fauna-de-fazenda-minecraft-wiki.md)). Pendentes: persistência no save, beterraba e demais sementes, cor da ovelha, ovos.
- **#37 Beterraba** — 27/11/2026: Wiki ("Beetroot", "Beetroot Seeds", "Tutorial:Crop farming") → proposta aprovada nos 3 pontos (beterraba primeiro, semente silvestre rara, rendimento da Wiki) → implementada na v0.196.0 ([ADR 0127](adr/0127-beterraba-do-orvalis-minecraft-wiki.md)). Pendentes: abóbora e melancia, as 8 idades da horta, outras sementes da galinha.
- **#38 Leite e tosquia — EM ABERTO (adiada pelo dono em 27/11/2026).** Wiki ("Cow", "Shears", "Wool") e estado atual apresentados; proposta: Tesoura (102), Balde (103) e Balde de Leite (104), ordenha sem limite em vaca adulta, tosquia de 1–3 lã em ovelha adulta com lã que volta pastando (capim vira terra), tosquiada salva em `header.fauna`. **Bloqueios:** o Orvalis não tem ferro (receitas da Wiki: tesoura 2 lingotes, balde 3) nem o Balde de Cobre (é do Titã, ADR 0114); não há tesoura no Drive (há balde vazio, de água e de leite) nem arte da ovelha sem lã. Perguntas sem resposta: receitas provisórias ou ferro primeiro, beber o leite, visual da ovelha tosquiada, ícone da tesoura. Retomar quando houver arte e itens; sem aprovação nada é alterado.
- **#39 Abóbora e melancia** — 27/11/2026: Wiki ("Tutorial:Pumpkin and melon farming", "Melon", "Pumpkin", "Drops") → proposta aprovada nos 4 pontos → implementada na v0.197.0 ([ADR 0128](adr/0128-aboboras-e-melancias-do-orvalis-minecraft-wiki.md)). Pendentes: abóbora esculpida (tesoura), golens, torta de abóbora, as 8 idades da horta antiga.
- **#40 As 8 idades da horta** — 27/11/2026: Wiki ("Tutorial:Crop farming", "Carrot", "Potato") → proposta aprovada nos 4 pontos → implementada na v0.198.0 ([ADR 0129](adr/0129-oito-idades-da-horta-minecraft-wiki.md)). Pendentes: batata venenosa (sem efeitos), farinha de osso.
- **#23 Vida, fome, saturação, ar, regeneração e inanição** — 27/11/2026: Wiki ("Hunger", "Healing", "Sprinting", "Health", "Damage") → proposta aprovada nos 5 pontos (exaustão da Wiki, corrida com fome > 6, comer instantâneo, inanição não letal, nos dois mundos) → implementada na v0.199.0 ([ADR 0130](adr/0130-vida-e-fome-minecraft-wiki.md)). Pendentes: comer em 1,6 s (adaptação mantida), regeneração rápida pela fórmula exata da Wiki, dano por levar golpe com invulnerabilidade de 0,5 s (combate, #25).
