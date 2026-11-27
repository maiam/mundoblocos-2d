# Decisões

> **Nota (v0.183.0):** as ADRs sobre o Orvalis 2D/2.5D e o Santuário (0001–0038, 0100 não: é do Titã) descrevem código **removido** (ADR 0115); ficam como histórico. Vale o que não contradiz a 0115.

## Arquitetura (ADRs)
| # | Decisão | ADR |
|---|---|---|
| 0001 | Terreno como função pura da seed + chunks 16×16 com edições sobrepostas | [0001](adr/0001-geracao-pura-e-chunks.md) |
| 0002 | Texturas procedurais e cache offscreen por chunk (blocos substituídos pela 0006) | [0002](adr/0002-texturas-procedurais.md) |
| 0003 | Vista superior inclinada (3/4), camadas por célula, personagem como sprite | [0003](adr/0003-vista-superior-inclinada.md) |
| 0004 | Entidades andantes compartilham `Walker`; NPCs como estado de execução em `game/` | [0004](adr/0004-entidades-walker.md) |
| 0005 | Itens contáveis separados dos blocos infinitos; inventário em `game/` | [0005](adr/0005-itens-e-inventario.md) |
| 0006 | Blocos = 8 materiais da prancha; mesmo id como chão e cubo; prancha 3/4 como fonte | [0006](adr/0006-materiais-da-prancha.md) |
| 0007 | Assets em WebP gerados por script; PNG só como etapa intermediária | [0007](adr/0007-assets-webp.md) |
| 0008 | Perfis de mundo: um motor, vários mundos (Santuário Celestial) | [0008](adr/0008-perfis-de-mundo.md) |
| 0009 | Dungeon como sobreposição pura do terreno; monstros como `Walker` em `Entities` | [0009](adr/0009-dungeon-sobreposta.md) |
| 0010 | Pacotes de arte por mundo (build de cada artefato só com a arte do seu mundo) | [0010](adr/0010-pacotes-de-arte-por-mundo.md) |
| 0011 | Salvamento automático no navegador, por mundo e seed, formato versionado | [0011](adr/0011-salvamento-local.md) |
| 0012 | Cidade do Despertar: semente fixa, sobreposta ao terreno, área protegida, arte pintada em código | [0012](adr/0012-cidade-fixa.md) |
| 0013 | Imagens em arquivos separados ao lado da página; código embutido; orçamento de **início** < 3 MB; arte de regiões em segundo plano | [0013](adr/0013-imagens-em-arquivos-separados.md) |
| 0014 | Interiores = cômodos isolados do mesmo `World` (coordenadas fixas ao norte, protegidos), mapa lógico sobre a arte, porta pela rua, capacho para sair | [0014](adr/0014-interiores.md) |
| 0015 | Orvalis independente do maiamapps: backend próprio (repositório separado) em subdomínio de `pensamentos.online` até o domínio próprio; regras do mundo compartilhadas com o servidor, não copiadas | [0015](adr/0015-orvalis-independente.md) |
| 0016 | Multiplayer co-op com código de convite (até 4), convidados só com nome, sem PvP; servidor autoritativo com `Room`/protocolo compartilhados (`src/net`, `world/actions.ts`) | [0016](adr/0016-multiplayer-coop.md) |
| 0017 | ~~Personagem modular (chibi)~~ — **removido na v0.92.0** (ADR 0025); o texto da ADR fica no histórico do git | — |
| 0018 | Ferramentas por material: tipo × material; arte segue `assets-src/ferramentas/CONTRATO.md` (ficha, ícones padronizados, camada de mão sobre pose-base sem ferramenta) antes de entrar no motor | [0018](adr/0018-ferramentas-por-material.md) |
| 0019 | Covil isolado (canto fixo) com entrada de caverna a ≥ 10 chunks do castelo; mundo da Cidade 1 só de florestas; visão de andares/mundos ligados por portais | [0019](adr/0019-covil-isolado-e-andares.md) |
| 0020 | Salas fixas por número (Sala 1, até 10 jogadores), mundo e bolsas salvos no servidor; sem salas de convite | [0020](adr/0020-salas-fixas-salvas.md) |
| 0021 | Bichos da sala: o servidor roda as mesmas `Entities` (jogadores como avatares); o aparelho na sala só espelha (`CreatureMirror`); golpe/comida/mordida decididos pela sala; moradores locais | [0021](adr/0021-bichos-da-sala.md) |
| 0022 | Escala visual: geometria e contratos de arte preservados, sem unidade nova; **cena de escala** `?escala=1` (só dev) compara sprites no renderizador real; catálogo, validação e normalização de alturas ficam para depois | [0022](adr/0022-escala-visual-e-cena-de-escala.md) |
| Mercado (v0.93.57): as 3 lojas da cidade são um só cômodo "Mercado" com 3 entradas/saídas; mercador fixo **Bento** (`role: 'merchant'`, toque abre a loja); só consumíveis (`FOOD`) em **Moedas de Cobre** (`world/shop.ts`, preços provisórios); janela com a arte do dono do produto | domains/town, domains/npc |
| 0039 | **Aceita** — Titã: mundo voxel volumétrico solo em `src/titan/`, fora do motor de chão e pilhas; gerador versionado, deltas por chunk, save em IndexedDB, entrada `?mundo=titan` | [0039](adr/0039-titan-voxel-solo.md) |
| 0040 | **Aceita** — Titã entrega 2: inventário (hotbar 7 + mochila 24 + grade 2 × 2), fragmentos de superfície com ids determinísticos, lanterna com luz 0–15, gerador v2 (v1 preservado), save v2 na mesma transação | [0040](adr/0040-titan-inventario-e-lanterna.md) |
| 0041 | **Aceita** — Titã: ciclo simples de céu (dia de 20 min no ritmo do Minecraft, hora no save), luz do dia como uniform do shader (`glow` separado, zero remalhagens), `?hora=` só visual | [0041](adr/0041-titan-ciclo-de-ceu.md) |
| 0042 | **Aceita** — Titã: gesto primário (toque curto < 200 ms coloca, segurar quebra, arrastar gira), tempos por material, 10 estágios de rachadura em sobreposição reutilizável | [0042](adr/0042-titan-gesto-e-rachaduras.md) |
| 0049 | **Aceita** — Titã: grade 3 × 3 interativa da Mesa de Trabalho (quantidades exatas, retirada atômica, devolução ao fechar) e painéis de basalto com acabamento cobre fosco | domains/titan, [ADR 0049](adr/0049-titan-bancada-3x3-e-paineis-de-basalto.md) |
| 0048 | **Aceita** — Titã: céu em shader com bruma direcional, noite mais escura e fria, estrelas discretas e Saturno raro (janela curta em ~12% dos dias) | domains/titan, [ADR 0048](adr/0048-titan-ceu-bruma-direcional-estrelas-e-saturno.md) |
| 0047 | **Aceita** — Titã: hotbar de 9 + bolsa 3 × 9, livro de receitas numa tela só (categorias, grade, detalhe Tenho/Preciso) e migração do inventário por seção (save v5) | domains/titan, [ADR 0047](adr/0047-titan-bolsa-hotbar-9-e-livro-de-receitas.md) |
| 0046 | **Aceita** — Titã: Laje de Rocha (bloco de meia altura): receita 3 rochas → 6 lajes na mesa, física com degrau de 0,5, mira por caixa, laterais de 16 × 8 px | domains/titan, [ADR 0046](adr/0046-titan-laje-de-rocha-meia-altura.md) |
| 0058 | **Aceita** — Titã: Marco de Margem e Painel de Junco (modelos 3D low-poly, receitas na Mesa, giro/eixo no id do bloco, painel sólido de 0,944 m que deixa a luz passar) | [adr/0058](adr/0058-titan-marco-de-margem-e-painel-de-junco.md) |
| 0059 | **Aceita** — Titã: vida, ar e fome (`titan/vitals.ts`, fome pronta (ligada na ADR 0060), morte solta pilhas e renasce na chegada, HUD em atlas de 32 px) |
| 0060 | **Aceita** — Titã: Noz de Duna (gerador v5 com 6 plantas, colheita de 4 e rebrote de 5 min, comer por toque/Q), fome ligada sem inanição letal |
| 0061 | **Aceita** — Titã: Farejadores de Duna (pequeno ½ e grande 1,3×; passeiam, investem ao avistar, caem de costas e ficam 2 s atordoados ao bater; dano 2 e 4; toca no gerador v5) |
| 0062 | **Aceita** — Titã: região de 8 × 8 chunks por versão do gerador (v6 = 128 × 128, relevo gradual) e lote de 200 seeds nos testes de levantamento |
| 0063 | **Aceita** — Titã: cobre de Duna (gerador v7: afloramentos e hastes secas), Veio de Cobre só quebra com picareta, itens 17–20 e ferramentas por `TOOLS` |
| 0064 | **Aceita** — Titã: Farejador de Duna com rig e textura 2K (GLB leve de uma malha skinada, carga em segundo plano, pose por rotação de ossos no espaço do modelo) |
| 0065 | **Aceita** — Titã: Braseiro de Rocha (apagado/aceso, 8 preparações por Brasa de Âmbar, estação `brazier`), Lingote de Cobre, Picareta de Cobre e adagas; `stationMet` como regra única |
| 0066 | **Aceita** — Titã: abrigos no gerador v8 (2 vãos entre pilares de rocha com Placa de Carapaça no chão, fora do território do Farejador) e Revestimento de Carapaça (bloco 27, 1 placa + 1 rocha → 2) |
| 0067 | **Aceita** — Titã: durabilidade das ferramentas (contador `wear` no espaço, 131 rocha e 190 cobre, picareta −1/−2 e adaga −2/−1, barra verde→vermelho, quebra com estilhaço, vai no save e na pilha da morte) |
| 0101 | **Aceita** — Titã: Degrau e Cadeira de Junco (sólidos de várias caixas: `blockBoxes`, colisão e mira por caixa, modelos instanciados de caixas com a trama repetida) |
| 0102 | **Aceita** — Titã: Porta de Junco (bloco de duas células com o estado no id — giro, aberta, dobradiça, metade; ids 58–89; dobradiça automática e porta dupla; abrir por toque/F/Usar com giro de 90° em torno da dobradiça; colisão por caixa que muda com o estado; item plano extrudado; atlas de itens 4 × 11). | [0102](adr/0102-titan-porta-de-junco.md) |
| 0103 | **Aceita** — Titã: auto-step de 0,6 m (só no chão e com o eixo barrado; teto livre, snap down no topo real do apoio; câmera suave por `Body.stepSmooth`). | [0103](adr/0103-titan-auto-step.md) |
| 0104 | **Aceita** — Titã: salas do servidor, cooperativas de sobrevivência (fatia A: protocolo paralelo, `TitanRoom` autoritativa com visão por jogador sobre o mundo compartilhado, `onSet` repassa edições, snapshot/restore, loopback; cliente e sobrevivência compartilhada nas próximas fatias). | [0104](adr/0104-titan-salas-multiplayer.md) |
| 0105 | **Aceita** — Orvalis em voxel (fatia 1): o mundo principal também em primeira pessoa com blocos de 1 m, **sobre o motor do Titã** (contrato `TerrainGen`, `OrvalisGenerator` v1 com ilha de florestas, rios, mar e árvores; blocos 90–99, itens 42–51, banco e céu próprios; `?mundo=orvalis3d`). O 2.5D segue no ar até haver paridade; saves 2D não migram | [0105](adr/0105-orvalis-voxel-sobre-o-motor-do-tita.md) |
| 0106 | **Aceita** — Titã: mundo renderizado a **16 px por face** (arte-fonte maior, reduzida; atlas 16 px, variante de 8 px) e **vista isométrica 2:1** alternável (botão no menu, tecla V): câmera ortográfica a 30°, topo 16 × 8 px, buffer de 1 px CSS sem suavização, 4 vistas de 90°, boneco provisório com silhueta atrás do terreno | [0106](adr/0106-titan-16px-e-visao-isometrica-2-1.md) |
| 0107 | **Aceita** — Orvalis em voxel, madeira básica (E1 do pacote Texturas16px): tábuas ×3, haste e Mesa de Carpintaria (blocos 100–106, itens 52–56, regras do Minecraft, 9 receitas por madeira, `isCraftingTable`, receitas por mundo `Recipe.world`) | [0107](adr/0107-orvalis-voxel-madeira-basica.md) |
| 0108 | **Aceita** — Orvalis em voxel, pedra de obra (E2a do pacote Texturas16px): Pedra Lisa, Tijolo de Pedra e Laje de Pedra (blocos 107–110, itens 57–59; a laje entra na família das lajes e duas viram a Pedra Lisa; 3 receitas na mesa); degrau e mureta ficam em E2b/E2c | [0108](adr/0108-orvalis-voxel-pedra-de-obra.md) |
| 0130 | **Aceita** — Vida e fome pelos valores da Minecraft Wiki (auditoria #23, aprovada, nos dois mundos): exaustão por ação (andar 0, correr 0,1 por metro, pular 0,05, correndo 0,2, quebrar 0,005, atacar 0,1, levar dano 0,1), corrida só com fome > 6, comer instantâneo e inanição não letal mantidos | [0130](adr/0130-vida-e-fome-minecraft-wiki.md) |
| 0129 | **Aceita** — As 8 idades da horta pela Minecraft Wiki (auditoria #40, aprovada): trigo, cenoura e batata com 8 idades (o tomate segue com 3), colheita da Wiki (trigo 1 + 1–4 sementes; cenoura e batata 2–5), atlas da horta de 49 colunas por `GARDEN_LAYOUT`, migração do save (`TITAN_SAVE_VERSION` 7: idades 0 → 0, 1 → 3, 2 → 7) | [0129](adr/0129-oito-idades-da-horta-minecraft-wiki.md) |
| 0128 | **Aceita** — Abóbora e melancia do Orvalis pela Minecraft Wiki (auditoria #39, aprovada): caule de 8 idades que gera o fruto (blocos 152 Melancia e 153 Abóbora) numa célula vizinha e vira caule conectado, melancia solta 3–7 fatias, itens 102–105 (atlas de itens 4 × 27), sementes silvestres raras e fabricações; caule conectado girado em 90° | [0128](adr/0128-aboboras-e-melancias-do-orvalis-minecraft-wiki.md) |
| 0127 | **Aceita** — Beterraba do Orvalis pela Minecraft Wiki (auditoria #37, aprovada): quinta cultura da horta com 4 idades e descarte de 1/3 do crescimento, colheita de 1 beterraba e 1–4 sementes, itens 100–101 (atlas de itens 4 × 26), semente silvestre rara no capim e comida do porco | [0127](adr/0127-beterraba-do-orvalis-minecraft-wiki.md) |
| 0126 | **Aceita** — Fauna de fazenda no save: `header.fauna` opcional (id, espécie, posição, vida, filhote/crescimento, descanso), `TITAN_SAVE_VERSION` 6; presente = população da partida no lugar da seed, ausente = seed; leitura com validação e teto de 200; o amor não persiste | [0126](adr/0126-fauna-de-fazenda-no-save.md) |
| 0125 | **Aceita** — Reprodução da fauna de fazenda do Orvalis pela Minecraft Wiki (auditoria #36, aprovada): comida da espécie na mão alimenta (senão golpeia), amor 30 s, filhote a ½ da caixa e da vida sem espólio que cresce em 20 min, descanso de 5 min, teto de 200, sem XP; persistência no save fica como dívida | [0125](adr/0125-reproducao-da-fauna-de-fazenda-minecraft-wiki.md) |
| 0124 | **Aceita** — Fauna de fazenda do Orvalis pela Minecraft Wiki (auditoria #35, aprovada): porco, vaca, ovelha e galinha como animais passivos em `titan/fauna.ts` (vida, caixa de acerto da Wiki, grupos de 4 em grama, fuga, espólio), gerador do Orvalis v3, itens 89–99 (couro, lã, pena e carnes cruas e assadas na Fornalha), atlas de itens 4 × 25, texturas e caixas do pacote Mobs64px; regra permanente: **a caixa de acerto de um mob é a da Wiki, o desenho é livre** | [0124](adr/0124-fauna-de-fazenda-do-orvalis-minecraft-wiki.md) |
| 0123 | **Fases 1, 2 e 3 (parcial) aceitas** — Luz do céu pela Minecraft Wiki (auditoria #32, aprovada nos dois mundos), em 3 fases: motor puro `titan/skylight.ts` + `TitanVolume.skyLight` (v0.190.0); mesher e shader com atributo `sky`, piso de 5 %, remalha só das seções afetadas e instâncias (v0.191.0); plantas com céu e mergulho sem dupla escuridão (v0.192.0); itens soltos, animais e mão ficam como dívida. [`adr/0123`](adr/0123-luz-do-ceu-minecraft-wiki.md) |
| 0122 | **Aceita** — Carvão mineral do Orvalis pela Minecraft Wiki (auditoria #34, aprovada): minério (150, dureza 3, solta Carvão só com picareta), Carvão (87) e Bloco de Carvão (88, 151, queima 800 s), receitas, gerador do Orvalis v2 com veios (20 por chunk, 4–30 blocos, Y −60–90, pico 40, 50 % expostos descartados); sem item de minério e sem ardósia. [`adr/0122`](adr/0122-carvao-mineral-do-orvalis-minecraft-wiki.md) |
| 0121 | **Aceita** — Tocha do Orvalis pela Minecraft Wiki (auditoria #33, aprovada): blocos 145–149 (em pé e de parede com o giro no id), item 85, luz 14, dureza 0, não sólida, solta-se sem apoio, receita Carvão Vegetal + haste → 4; sprite extrudado cruzado (em pé) ou plano (parede); atlas de itens 4 × 22. [`adr/0121`](adr/0121-tocha-do-orvalis-minecraft-wiki.md) |
| 0120 | **Aceita** — Fornalha e Carvão Vegetal do Orvalis pela Minecraft Wiki (auditoria #21, aprovada): motor do braseiro com regras por bloco (fornalha = queima contínua; braseiro do Titã mantido), 8 ids de bloco (137–144), itens 83 e 84, 8 Pedras na bancada, tora → carvão vegetal, `pedra-lisa` e `tijolo` passam à fornalha, luz 13 acesa; ícone do carvão provisório. [`adr/0120`](adr/0120-fornalha-e-carvao-vegetal-do-orvalis-minecraft-wiki.md) |
| 0119 | **Aceita** — Luz de bloco pela Minecraft Wiki (auditoria #9, aprovada): só o cubo opaco bloqueia (`blocksLight = isFull && !isLeaves`); folhas, baú, cama, porta, laje, degrau, mureta, braseiro e Painel deixam passar; lanterna 15 e braseiro 13 mantidos; luz do céu fora. [`adr/0119`](adr/0119-luz-de-bloco-so-o-cubo-opaco-bloqueia-minecraft-wiki.md) |
| 0118 | **Aceita** — Ciclo de dia e noite e clima pela Minecraft Wiki (auditorias #10 e #31, aprovadas): partida de manhã, cama 12 542–23 460 (chuva 12 010–23 992), lua com 8 fases, chuva só no Orvalis (Wiki: 10–20 min ligada, 10 min–2,5 h desligada), luz 12/15, hidrata a terra arada; protocolo 3. [`adr/0118`](adr/0118-ciclo-de-dia-e-noite-lua-e-clima-minecraft-wiki.md) |
| 0117 | **Aceita** — Quebra por dureza do bloco na fórmula da Minecraft Wiki (auditoria #16, aprovada): tempo = dureza × 1,5 s ÷ velocidade (madeira 2, pedra 4, cobre 5), rocha sem picareta × 5 s; durezas por bloco em `titan/breaking.ts`; `BREAK_MS`/`PICK_FACTOR` removidos; bancada e baú passam a machado. [`adr/0117`](adr/0117-quebra-por-dureza-do-bloco-minecraft-wiki.md) |
| 0116 | **Aceita** — Regra de processo (dono do produto): toda regra de mundo, inclusive as já implementadas, passa por Minecraft Wiki → estado atual no código → proposta (manter/adaptar/retirar) → **aprovação** antes de ser alterada; o que não passou fica pendente de auditoria (`AUDITORIA_REGRAS.md`). |
| 0115 | **Aceita** — Orvalis 3D é o mundo padrão e o Titã só abre por `?mundo=titan`; Orvalis 2D/2.5D, Santuário e a isométrica 2.5D **removidos** (etapas 1 a 3, v0.181.0–v0.183.0); o botão Visão do voxel fica; documentação do 2.5D em `docs/archive/2d/`. |
| 0114 | **Aceita** — Itens do Titã e do Orvalis em voxel não são compartilhados (regra do dono do produto): catálogo em duas faixas (1–41 Titã, 42+ Orvalis; blocos do Orvalis a partir do 90), receitas e bancadas só do próprio mundo, imposto por `titan/itensPorMundo.test.ts`; compartilhar exige nova decisão. |
| 0113 | **Aceita** — Orvalis em voxel, horta (E5 do pacote Texturas16px): trigo, cenoura, batata e tomate (itens 78–82) na terra arada com 3 fases, sobre o cultivo do ADR 0083 (`GARDEN_SPECIES`, `soilKindFor`); a terra arada seca/umedece pela água; semente silvestre provisória da grama; atlas da horta de 12 quadros e de itens 4 × 21. |
| 0112 | **Aceita** — Orvalis em voxel, ferramentas de madeira e de pedra (E4 do pacote Texturas16px): itens 70–77 em `TOOLS` (tipos axe/shovel/hoe, nível wood), ferramenta certa por bloco (`toolAdvantage`), enxada ara e pá abre caminho (`soil.ts`), durabilidade 59/131; corrige a picareta de cobre (40 %); atlas de itens 4 × 20. |
| 0111 | **Aceita** — Orvalis em voxel, solo de cultivo e cerâmica (E3 do pacote Texturas16px): blocos 131–136 (cubos inteiros) e itens 62–69, receitas provisórias até a enxada (E4), a água do cultivo (E5) e a argila no terreno; atlas de terreno 82 tiles e de itens 4 × 18. |
| 0110 | **Aceita** — Orvalis em voxel, Mureta de Pedra (E2c do pacote Texturas16px): blocos 115–130 com a máscara de conexão no id mantida por `TitanVolume.set` (as vizinhas se refazem e a sala repassa), item 61, 0,75 m, modelo por máscara gerado em código; atlas de itens 4 × 16. |
| 0109 | **Aceita** — Orvalis em voxel, Degrau de Pedra (E2b do pacote Texturas16px): blocos 111–114 com giro no id, item 60, mesma forma e física do degrau de junco (ADR 0101) com modelo próprio e tira de 3 tiles de 16 px do pacote; receita provisória. |
| 0100 | **Aceita** — Titã: Bloco de Junco e Laje de Junco (laje por família, a fusão de lajes de junco vira o bloco; 5 tiles novos; itens 37–40 fecham o atlas de 40 ids) |
| 0099 | **Aceita** — Titã: pular encostado num bloco até 1 nível acima tira o jogador da água; quebrar sólido ao lado de água do mesmo nível enche o espaço de água |
| 0098 | **Aceita** — Titã: gravidade dos itens soltos (queda acelerada, afunda devagar na água) e deslocamento do item para uma célula vizinha quando um bloco é colocado na célula dele |
| 0097 | **Aceita** — Titã: regra visual de armas, ferramentas e itens = sprite 2D extrudado de 16 × 16 (1/16 de espessura, bordas só onde toca o transparente); substitui os GLB/malhas 3D na mão de adaga, picareta e balde; exceção: tridente e besta |
| 0096 | **Aceita** — Titã: sons da tampa do baú (abrir e fechar) e do sono (escurecer e acordar), sintetizados e disparados por transições puras (`lidSound`, `sleepCue`) |
| 0095 | **Aceita** — Titã: balde 3D na mão (malha embutida de JSON + atlas, `HELD_MESHES`, estilo `bucket`) e som de água sintetizado ao recolher e despejar |
| 0094 | **Aceita** — Titã: luz de bloco do Braseiro aceso (emissores com nível: lanterna 15, braseiro aceso 13; `lightLevelOf`; ordem emissor-sai → sólido → emissor-entra) |
| 0093 | **Aceita** — Titã: tampa do baú animada (malha própria girada na dobradiça, só no renderer) e véu escuro ao dormir (a noite passa com a tela preta) |
| 0092 | **Aceita** — Titã: Braseiro de Rocha em 3D (mesmos ids 25/26, modelos `braseiro` e `braseiroAceso` instanciados; altura 0,774 m própria, como o baú; o aceso brilha por instância; sem luz de bloco ainda) |
| 0091 | **Aceita** — Titã: Balde de Cobre (itens 35 vazio e 36 cheio; 3 lingotes na Mesa; a mira aceita o líquido com balde na mão; recolhe só a superfície do lago e despeja em cavidade livre em Y ≤ 63; sem simulação de fluxo) |
| 0090 | **Aceita** — Titã: Cama de Junco (duas células: pé 39–42 e cabeceira 43–46, item 34; usar marca o ponto de retorno e, à noite, dorme até o amanhecer; renasce ao lado da cama; `header.spawn` opcional) |
| 0089 | **Aceita** — Titã: Baú de Rocha e Junco (blocos 35–38/item 33, 18 espaços em `session.chests`/`header.chests`, guardar/retirar tudo ou nada, cospe ao quebrar; atlas de itens ampliado a 4 × 10) |
| 0088 | **Aceita** — Titã: Escada de Junco (blocos 31–34/item 32, presa à lateral de um cubo inteiro, não sólida, sobe empurrando para a parede ou pulando, escorrega ao soltar; modelo 3D reduzido a 1.398 triângulos) |
| 0087 | **Aceita** — Titã: item na mão por categoria (mão vazia, bloco, plano, ferramenta, modelo), sprites extrudados por máscara pré-calculada (sem ler canvas) e animação de troca |
| 0086 | **Aceita** — Titã: gerador v13 (hastes secas avulsas: só as 2 mais próximas da chegada; a Noz mais próxima da chegada sem Farejador) |
| 0085 | **Aceita** — Titã: Esteira de Junco = placa de pressão do Minecraft sem pressão (bloco 30/item 31, 1/16 m, sem colisão, alvo da mira, exige piso firme, 3 Hastes Secas na Mesa) |
| 0084 | **Aceita** — Titã: Noz plantada na areia ocre (mesmo motor do junco, 3 fases, 4 nozes por colheita, sem Farejador) e Noz Torrada (item 30, Braseiro, fome 7) |
| 0083 | **Aceita** — Titã: cultivo do Junco de Vidro por random ticks (muda = junco de vidro, 3 fases na areia úmida, ressecado na ocre; colheita de 2 mudas ou 2 hastes secas; `header.crops` opcional); esteira = placa de pressão sem pressão (a fazer) |
| 0082 | **Aceita** — Titã: o bloco quebrado cai no chão (atraso de 0,45 s, raio 1,45 m, some em 5 min, salto e voo na coleta); a lanterna segue direto para a mochila |
| 0081 | **Aceita** — Titã: joystick analógico de volta no toque (substitui as setas da ADR 0075; corrida = empurrar todo à frente) |
| 0080 | **Aceita** — Titã: segurar no animal golpeia em sequência (`ATTACKING`) e o alvo-animal é o mesmo animal, não a mesma célula |
| 0079 | **Aceita** — Titã: atlas de terreno de 32 px com textura por face (topo, lateral, base) em todos os blocos; `tiles.json` como fonte única da ordem; lago e modelos 3D fora |
| 0078 | **Aceita** — Titã: Picareta de Rocha na mão (GLB de 325 KB sem rig; golpe por cima por item em `STYLES`; `HELD_MODELS`) |
| 0077 | **Aceita** — Titã: tela cheia no toque (controles a 36 px das bordas, sem menu de segurar, volta imediata se cair com o dedo na tela) |
| 0076 | **Aceita** — Titã: modo de mira no toque (dedo ou central, opção lembrada) e corrida (segurar ▲ 0,2 s: +30 % de velocidade, FOV +6°, mais fome) |
| 0075 | **Aceita** — Titã: controles de toque no estilo do Minecraft (setas no lugar do joystick, ação no ponto tocado com anel de progresso, sem mira central no toque) |
| 0074 | **Aceita** — Titã: Margem como bioma (`biomes.ts`), Noz de Duna só em areia seca em 1 % da areia elegível, um Farejador pequeno por planta e um grande a cada 5 (gerador v12; volta por id; só os 8 mais próximos desenhados) |
| 0073 | **Aceita** — Titã: Brasa de Âmbar como combustível comum (gerador v11; 4 depósitos com juncos, Veio de Âmbar 3–8 blocos com picareta, veio garantido perto da chegada, Bloco de Âmbar Compactado 9×; braseiro: 1 brasa = 4 preparações e carga só gasta ao cozinhar) |
| 0072 | **Aceita** — Titã: fragmentos à vista (gerador v10; veios de rocha em 12 %/6 % da rocha escura alta/baixa e de gelo em 6 % das manchas; fora de formações, abrigos e cobre) |
| 0071 | **Aceita** — Titã: Adaga de Rocha na mão em primeira pessoa (GLB de 338 KB, cena de mão própria sobre o mundo, golpe animado no ataque ao Farejador) |
| 0070 | **Aceita** — Titã: veios subterrâneos (gerador v9; altura triangular, caminhada aleatória, descarte por exposição ao ar, só rocha profunda; independente da ordem de leitura) |
| 0069 | **Aceita** — Titã: vida do Farejador, golpe por toque curto (punho 1, adaga 4/6), espólio de carne e placa, volta na toca em 600 s de jogo ativo, carne assada no braseiro |
| 0068 | **Aceita** — Titã: Braseiro como fornalha (bloco com estado: entrada, combustível e saída; 10 s por preparação; Brasa de Âmbar 80 s; corre com a tela fechada só com o jogo ativo; quebrar cospe o conteúdo); Mesa segue sem memória |
| 0057 | **Aceita** — Titã: Lago Escuro V2 (atlas próprio de 32 px) e visual submerso por uniforms/cores, sem remalhar | [adr/0057](adr/0057-titan-lago-escuro-v2-e-visual-submerso.md) |
| 0056 | **Aceita** — Titã: Laje de Rocha inferior, superior e dupla (ids no bloco, colocação por face e altura, física pela faixa da célula) | [adr/0056](adr/0056-titan-lajes-superior-e-dupla.md) |
| 0055 | **Aceita** — Titã: salto automático em degrau de 1 bloco e quebra contínua ao arrastar a mira segurando (altera em parte a ADR 0042) | [adr/0055](adr/0055-titan-salto-automatico-e-quebra-continua.md) |
| 0054 | **Aceita** — Titã: som da rocha sintetizado na hora com a Web Audio API (sem arquivos), golpe seco e quebra em camadas | [adr/0054](adr/0054-titan-som-sintetizado-da-rocha.md) |
| 0053 | **Aceita** — Titã: arte de 32 × 32 nos fragmentos, na lanterna e no junco; atlas de itens 128 × 128 e interface em escala inteira | [adr/0053](adr/0053-titan-arte-32px-itens-e-junco.md) |
| 0052 | **Aceita** — Titã: Mesa de Trabalho com quatro orientações no id do bloco, frente voltada para o jogador | [adr/0052](adr/0052-titan-mesa-voltada-para-o-jogador.md) |
| 0051 | **Aceita** — Titã: Junco de Vidro com três silhuetas (atlas 48 × 16, uma malha instanciada por silhueta, escolha por coordenada) | [adr/0051](adr/0051-titan-junco-tres-silhuetas.md) |
| 0050 | **Aceita** — Titã: grade 3 × 3 única (a 2 × 2 saiu), prévia de receitas com itens distribuídos por unidade, Mesa exigida só na retirada | [adr/0050](adr/0050-titan-grade-3x3-unica-e-previa-distribuida.md) |
| 0045 | **Aceita** — Titã: catálogo único de receitas (cartões, validação, consumo e grade 2 × 2) com fabricação atômica; Mesa de Trabalho 3D instanciada com ação Usar; gerador v4 (depósito de brasa e junco de vidro); cápsula vira brasa na migração (save v4) | domains/titan, [ADR 0045](adr/0045-titan-receitas-mesa-brasa-e-junco.md) |
| 0044 | **Aceita** — Titã: gerador v3 (veios como blocos próprios, 3 por formação, fontes alcançáveis por BFS com afloramento de reserva) e lascas soltas persistidas no cabeçalho (coleta por proximidade) | domains/titan, [ADR 0044](adr/0044-titan-veios-drops-e-gerador-v3.md) |
| 0043 | **Aceita** — Titã: lanterna em modelo 3D (2 `InstancedMesh`, núcleo emissivo no shader do terreno) e mira pela caixa do objeto com folga de toque; sai da malha do terreno | domains/titan, [ADR 0043](adr/0043-titan-lanterna-3d-e-mira.md) |
| 0032 | **Implementada (F7, v0.93.59)** — grade fina do Mundo (`SUBDIV = 2`): células e objetos proporcionais ao personagem, mundo do mesmo tamanho, padrão Stardew; fases F0–F7, perguntas abertas | [0032](adr/0032-grade-fina-do-mundo.md) |
| 0031 | **Aceita** — plano de migração do Mundo principal para Three.js (fases M0–M7, W5 depois do M4, perguntas ao dono do produto) | [0031](adr/0031-migracao-do-mundo-para-three.md) |
| 0030 | Vertical no celular e no tablet como opção do jogador: sem trava de orientação nem aviso; câmera com largura mínima de 8 células em pé; HUD vertical com hotbar em linhas e controles por `--hotbar-h` | [0030](adr/0030-orientacao-vertical.md) |
| 0029 | Iluminação 2.5D: sobreposição de escuridão com poças de luz (Deusa e blocos que brilham), `?luz=`, regras puras em `render/lighting.ts` | [0029](adr/0029-iluminacao-2-5d.md) |
| 0028 | Escala do mundo: 1 célula = 1 m; vista oblíqua com K = 1 (cubo de frente quadrada); parede = 2 cubos; personagem ≈ 1,75 m; Mundo adota na migração do render | [0028](adr/0028-escala-do-mundo-1m.md) |
| 0027 | Paredes de nível único com altura fixa e autotile (frente + tampa), porta, para Santuário e Mundo; mármore V2/V3 aposentado | [0027](adr/0027-paredes-nivel-unico-autotile.md) |
| 0026 | Render 2.5D em WebGL (Three.js), referência Core Keeper: arte 2D como fonte, billboards, física sólida, iluminação primeiro, chão por chunk, 2D como reserva até a paridade (**removido na v0.93.105**, M7) | [0026](adr/0026-render-25d-webgl.md) |
| 0025 | Chibi modular, expressões e moradores antigos saem; 16 NPCs nomeados (Black + 15) com folha própria; caixa de conversa com retrato, nome e páginas | [0025](adr/0025-npcs-nomeados-e-caixa-de-conversa.md) |
| 0023 | Padrão de Materiais V2: a arte entrega texturas planas 128×128 por material; o motor monta topo/frente (frente **18**, decidida na v0.81.1; sem frente própria repete o topo; franja ≤ 32 px); **padrão do jogo desde 08/11** (`?blocos=legado` volta ao antigo); transições entre chãos por máscara de alfa que gira (só a Grama avança hoje); `?materiais=1` compara; mistura só no chão plano; máscaras = formas giráveis | [0023](adr/0023-padrao-materiais-v2.md) |

## Produto e regras de jogo
| Decisão | Onde |
|---|---|
| Sem backend neste repositório; persistência, contas e multiplayer via **backend do Orvalis** (repositório separado) | PROJECT_CONTEXT, adr/0015 |
| Nome oficial: **Orvalis** (mundo de fantasia); site em `orvalis.pensamentos.online` (Hostinger; provisório até o domínio próprio); repositório, pacote e chaves de salvamento mantêm "mundoblocos" | PROJECT_CONTEXT, OPERATIONS |
| Fluxo de publicação: `main` = site no ar; um PR por entrega com título de versão; merge automático (método *merge*) no fim da entrega, depois da Verificação (GitHub Actions) passar | CONVENTIONS, OPERATIONS |
| Fórmula de dano única (`world/progression.ts`): ataque + arma − defesa, mínimo 1, ±10%, crítico 5% ×1,5; heroína nível 1 = 100 vida/5 ataque/2 defesa; espada 12, machado 7; regeneração 5%/1,5 s após 6 s | domains/dungeon |
| Progressão (Fase P): vida em barra com número; atributos sobem sozinhos ao subir de nível; morte perde 10% do XP do nível atual sem descer de nível; profissões iniciais Lenhador, Minerador, Agricultor e Construtor | NEXT_STEPS Fase P |
| Visão: mundo de progressão — cidades e dungeons por faixa de nível; Cidade 1 recebe novatos e os personagens migram para cidades de nível maior conforme evoluem | PROJECT_CONTEXT, NEXT_STEPS Fase 6 |
| Chunks quadrados 16×16 nos dois eixos | domains/world |
| Santuário: 10 chunks em 5×2; só Deusa; 18 blocos + paredes/porta de parede (v0.93.27); sem ferramentas/cultivo/ovelhas | domains/worlds |
| Subdomínio `santuario`; artefato próprio enquanto não há hospedagem | domains/worlds |
| Blocos celestiais: arte da prancha 3/4 (a isométrica não foi convertida) | domains/worlds |
| Chão de nuvem sem giro/espelho e com contraste suavizado (cobre o mapa todo) | domains/worlds |
| Deusa flutua (só visual): mesma física do `Walker`, animação contínua e balanço sem mover a câmera | domains/worlds |
| Pilha máx. 3 cubos (era 2); personagem sobe 1 nível por passo; descer é livre | domains/player |
| Porta: objeto `shape: 'door'` só no nível 0, estado aberto/fechado no id (`OAK_DOOR_OPEN` passável); animação só no render; toque abre/fecha com qualquer item | domains/world |
| Chão quebrado vira buraco; só bloco novo ocupa e vira piso nivelado | domains/world |
| Ovelha não sobe em cubos: blocos servem de cerca | domains/npc |
| Crescimento do trigo probabilístico (média 6 s/estágio) | domains/farming |
| Ferramenta equipada = espaço selecionado; cada ferramenta ganha ação quando definida (enxada: arar) | domains/player |
| Plantio só em Terra Arada; arar = enxada em Terra/Terra com Grama livre | domains/farming |
| Espada só ataca entidades (animais somem por enquanto); nunca quebra blocos, itens ou elementos | domains/player |
| Machado ataca entidades e quebra orgânico (madeira/árvore/planta); regra por ferramenta em `items.ts` | domains/player |
| Enxada ara (Terra/Terra com Grama → Terra Arada) e quebra só plantas (`organic: 'plant'`); não ataca | domains/player |
| Cacto é planta (não árvore): enxada e machado quebram | domains/player |
| Pá: toque amassa Terra/Grama/Arada → Caminho; quebra só `soft` + planta; planta quebrada pela pá não dropa; não ataca | domains/player |
| Picareta: quebra tudo menos madeira/árvore (`nonWood`); planta quebrada não dropa; não ataca | domains/player |
| Ação de chão das ferramentas vem do registro (`TOOLS.groundUse`), não de `if (tool === …)` no `Game` | domains/player |
| Regra de combate em `Entities` (estado de execução), não no `World` | domains/player |

## Interface e controles
| Decisão | Onde |
|---|---|
| Câmera sem rotação; joystick e teclado em direções de tela | domains/player |
| HUD mínimo: só a hotbar (joystick e botão de ação só em toque) | domains/player |
| Celular: botão de ação sobre o alvo à frente; toque no mundo não age | domains/player |
| Quebrar = segurar 2 s com a mão/item, 1 s com ferramenta (`breakSeconds`); colocar = toque/clique curto | domains/player |
| Dungeon: área protegida (nada quebra/coloca), uma entrada voltada para o spawn, monstros presos ao interior, sem dano à personagem por enquanto | domains/dungeon |
| Covil das Aranhas = labirinto procedural (spec do usuário): área → labirinto (só chão/paredes) → conteúdo; Rainha no nó mais fundo com uma passagem; chefe preso à câmara | domains/dungeon |
| Parede do labirinto = cubo escuro com 2 de altura no desenho (legibilidade); montanhas só no anel externo | domains/render |
| Aranhas: arte de frente única; espelhada ao andar para a direita | domains/render |
| Água: inquebrável; qualquer terra (Terra, Grama, Arada, Caminho), Pedra, Tora ou Tábua substituem (areia não); só enche buracos vizinhos (0,6 s, cadeia, ordem fixa), nunca terra firme | domains/world |
| Baú: 8 tábuas, 27 espaços, abre com Bolsa acima da mão, troca tocando item e destino (pilha inteira), quebrar solta o conteúdo; Tenda: aviso a cada colocação, vale a última, derrubar a última volta ao início | domains/farming |
| Grade 12 (9 itens · Personagem · Habilidades · Bolsa); Habilidades = Receitas 4×9 + Profissões 4×2 acima da grade; tocar cria 1; Tenda = ponto de renascer; atalhos B/I, K, C (reservado) | domains/farming |
| ~~Bolsa: 18 espaços (2×9) acima da mão~~ → v0.57.0: 12 espaços (4×3) à direita, acima dos 3 botões; tipo novo só entra com espaço livre; pilhas sem limite | domains/farming |
| Tablet (toque, lado menor ≥ 600 px): toque na tela = clique do computador **e** botão de ação (voltou em v0.47.2); celular só com o botão | domains/player |
| Morte: perde tudo menos as ferramentas (substitui "perde só os materiais"); Tenda é madeira (machado quebra) e a picareta também a quebra por exceção (`alsoBreaks`) | domains/farming |
| Coleta: materiais coletados (bloco volta como item, árvore → 2–3 toras), grade de 8 compartilhada + bolsa no 9º, troca tocando item e espaço, morte perde só os materiais, começo com 1 porta, Santuário infinito | domains/farming |
| Combate (v0.26; vida e dano refeitos na v0.39, ver Progressão): 5 ♥; mordidas ½/1/2 ♥; morte → renasce no início com os itens; espólios seda/presa/Coração da Rainha; todas as aranhas renascem (Rainha 300 s) longe da heroína; arte provisória até as pranchas | domains/dungeon |
| Perseguição por mapa de distâncias (BFS a cada 0,25 s) em `Entities`, não por monstro | domains/dungeon |
| Porta só entre batentes à esquerda e à direita: cubo de madeira (`organic: 'wood'`) ou de qualquer pedra (`stone: true`, as 8 variações) no nível 0, podendo misturar; quebrar um batente depois não derruba a porta | domains/world |
| Cidade do Despertar: 108 × 78, igual em toda seed, início e renascer sem tenda; nada quebra/coloca dentro; ruas de Pedra Irregular + Rachada, muralha de Tijolo + Tijolo Rachado; arte das construções criada livremente (pintada em código); sem NPCs/interiores na V1 | domains/town, adr/0012 |
| Cidade v0.36: 164 × 132 (ampliada na proporção das construções); casas ≥ 5×5; tamanhos do dono do produto (castelo 26×17, guilda 9×9, ferreiro 8×5, lojas 5×5, guarita 4×6, bancos 2×1/3×1, poste 1 célula); térreas bloqueiam 4 de 5 fileiras (quintal andável); castelo com fosso escolhido (cobre os 26×17) | domains/town |
| Dungeon nunca ocupa a estrada do portão nem o campo do rebanho; diante da entrada, sempre terra firme e livre | domains/dungeon, domains/town |
| Arte de construção da cidade: uma imagem por tamanho de área (nunca esticar/repetir partes para outra proporção); tamanho sem imagem não usa aquela variação | domains/town |
| Pedras: a pedra do mundo vira Pedra Bruta (mesmo id, salvamentos intactos); o jogo fica com **cinco pedras** (Bruta, Tijolo, Chão, Lisa, Polida; dono do produto, 08/11) — Irregular, Rachada e Tijolo Rachado foram **aposentadas** (sem receita, fora da cidade e do V2; ids reservados para mundos salvos, `RETIRED_STONES`); receitas 1:1 só para Tijolo e Chão; Lisa e Polida ficam para receitas/construções futuras | domains/world, domains/farming |
| Horizontal garantido pela camada de rotação; tela cheia/trava quando o navegador permite | domains/player |

## Arte
| Decisão | Onde |
|---|---|
| Ícones do trigo: monte de sementes e feixe com laço | domains/farming |
| Pá sem folha para a direita: espelho da esquerda | domains/render |
| Prancha 3/4 venceu a extração isométrica (comparação no jogo) | adr/0006 |
| Texturas de blocos/chão sempre na direção desenhada (nada gira nem espelha por célula); variedade só por variações enviadas | CONVENTIONS, domains/render |
| Terra com Grama: arte nova com 3 variações sorteadas por célula (chão e cubo); colunas extras 15–16 do atlas | domains/render, OPERATIONS |
| Ferraria: ferreiro mora dentro (atrás do balcão), só fala por enquanto; entrar andando para cima diante da porta | adr/0014, domains/town |
| Tela de entrada dentro do jogo (não página separada): mundo em vitrine atrás, Novo jogo → montar personagem; Continuar só com jogo salvo; `?seed=`/`?personagem=` e Santuário pulam a tela | domains/player, ARCHITECTURE |
| Minimapa redondo, norte para cima, névoa por célula (raio 14) salva com o mundo; cor do mapa é aparência (`render/mapColors.ts`), não propriedade do bloco; só no mundo principal (`WorldProfile.minimap`) | domains/render, domains/save |
| ~~Árvores crescem de verdade (2026-11-06)~~ — **substituída** em 2026-11-08 (ADR 0024): árvores só adultas e variadas, sem mudas nem estágios; macieira colhida ainda volta a dar frutas | domains/farming |
| Árvores adultas variadas, madeira de cerejeira e chunk do muro protegido (dono do produto, 2026-11-08) | [0024](adr/0024-arvores-adultas-cerejeira-chunk-do-muro.md) |
| Macieiras misturadas nos Campos (1/6 das árvores), sem mudar cerejeiras nem a cidade | domains/farming, domains/world |
| Cavalo, vaca e galinha = um só `FarmAnimal` com ritmo por tipo (não uma classe por bicho) | domains/npc |
| Hortaliças plantam pelo próprio legume (sem semente separada); culturas numa tabela única (`CROPS`) com o trigo; fonte inicial: 2 de cada + capim (12%) | domains/farming |
| Tenda pede 1 Pano de Seda (receita nova: 10 sedas → 1 pano) em vez de 10 sedas soltas | domains/farming |
| Níveis de ferramenta enviados em 06/11 entram só depois da camada de mão (contrato de ferramentas); a prancha de pedra não estava no pedido e espera confirmação | ADR 0018 |
| Cidade 1 = mundo das florestas (sem deserto); próximos mundos (árido, pantanoso…) por portais, cada um com sua cidade | ADR 0019 |
| Fome em barra 0–100 (~12 min); alimentos com pesos (`FOOD`); crus: maçã, cenoura, batata, tomate; pratos só no Caldeirão (Cozinheiro); fome vazia não mata (para em 1 de vida) | domains/player, domains/farming |
| Receita pode exigir estação por perto (`Recipe.station`), sem novo painel: o Caldeirão é a cozinha | domains/farming |
| Receitas: tocar abre uma ficha com Confirmar/Cancelar (nada é criado num toque) e a bolsa aparece ao lado; excesso de bolsa de salvamento antigo cai no chão | domains/farming |
| Salas fixas por número (Sala 1, até 10), abertas a quem tiver o site, mundo e bolsas salvos no servidor; sem salas de convite | ADR 0020 |
| Sala compartilhada em etapas: o servidor é dono da hora e do crescimento (protocolo 7); itens e entidades depois, sempre com o código do jogo rodando na sala (nunca um jogador "anfitrião") | ADR 0016 |
| Tenda tem interior (um cômodo para todas as tendas, volta para a frente da tenda por onde se entrou); conexão da sala desiste em 10 s com uma nova tentativa automática | ADR 0014, ADR 0016 |
| "Jogar com amigos" só aparece onde o servidor aceita a origem; no Artifact e nas prévias, aviso com link do site (lista espelhada do servidor, sem detectar falha por tentativa) | ADR 0016 |
| ~~Bloco × parede~~ **(revisada em 08/11: as paredes saíram do jogo — sem receita, arte nem código; ids 210–225 viram vazio em dados antigos, `isRemovedBlock`)**. Era: bloco = cubo que empilha e se sobe; parede = peça alta (3 de altura, arte da coluna alta) que só bloqueia; 3 blocos → 1 parede; paredes vizinhas formam muro contínuo. v0.69.0: paredes de 8 materiais (terra, grama, arada, batida, areia, pedra com musgo, tronco, tábuas), todas com a altura das de pedra; parede desmonta com a ferramenta do material; tira das paredes em segundo plano | domains/world |
| Sentar: tocar no assento (cadeira, banco da cidade) senta de frente; andar/tocar levanta e volta ao lugar; só personagens com folha de sentar (Gino). Porta: batente = bloco de madeira/pedra (as paredes saíram em 08/11) | domains/player, domains/world |
| Piso da Cidade do Despertar: um só, Tijolo de Pedra, em todo o pavimento (ruas, praças, pátio, calçadas); gramados ficam | domains/town |
| Animal alimentado segue quem deu enquanto apaixonado e, depois, passa a morar onde ficou; vaca/galinha soltam leite/ovo ao comer (produto em `ANIMAL_PRODUCE`); torta assa no Forno de Pedra | domains/npc, domains/farming |
| Namoro igual para todos os animais: casal parado de frente + coraçõezinhos entre eles (sem folha de namoro por espécie) | domains/npc |
| Reprodução é uma base comum (`Breeder`) para ovelha e animais do campo; o alimento de cada espécie fica em `ITEMS.feeds`; filhote do campo cresce em 3 dias de jogo (tempo real da sessão; no jogo sozinho os animais não são salvos; na sala, sim — v0.73.0) | domains/npc |
| Cerca emenda por vizinhos só no render (o mundo guarda um id por célula; sem ids por forma): metades das peças + poste grande; portão de frente também em cerca vertical até chegar a arte de lado | domains/world, domains/render |
| Pedregulhos soltos (arte da prancha) substituem os cubos de pedra avulsos do gerador; minerados dão 1–3 Pedras Brutas (o item é sempre o bloco de pedra, colocado como cubo) | domains/world, domains/farming |
| **Blocos de 1/4 de célula (14/11/2026):** no Mundo principal todo bloco de construção tem altura 1/4 e empilha até 4; paredes e Santuário fora; 1–3 andável, 4 bloqueia; migração preserva a altura (1 cubo → 4, 2 → 2+2) | ADR 0033 |
| **Capítulo 1 "O Despertar" (15/11/2026, ADR 0035):** 10 missões narrativas em corrente (uma vez cada, dadas pelo Mestre da Guilda) + contratos repetíveis da guilda; motor puro `npcBrain/missions`, estado no save do jogador (v20), sala só avisa quem abateu (protocolo 27); moeda = Cobre | domains/npc, ADR 0035 |
| **Santuário refeito do zero (17/11/2026):** remove o Santuário Celestial antigo (renderer, artefato, `?celestial=1`); novo Santuário **solo**, plano e vazio, em vista **isométrica**; Sala 2 online só depois | ADR 0036 |
| **Conjunto isométrico do Santuário (17/11/2026):** a prancha isométrica alimenta a hotbar (19 blocos: 3 pisos + 16 objetos; casa 4× = 12×12, barraca 3×, árvore 2×), conjunto novo no lugar dos 8 materiais; legado celestial removido; pacote de arte e render próprios | ADR 0036 |
| **Inteligência dos NPCs (15/11/2026, ADR 0034):** plano em 4 níveis sem LLM (rotina → reativo → memória → objetivos), Utility AI + módulo puro `npcBrain`, memória no save do jogador, piloto no mercador Bento, "dormir" = entrar pela porta e sumir, mais moradores por recolor no shader + sorteio por seed | domains/npc, ADR 0034 |
| **Itens soltos e coleta pela Wiki (27/11/2026, auditoria #18):** atraso 0,5 s, alcance 1,425, todo item solto some em 5 min (exceto pilha da morte), fusão na mesma célula | ADR 0131 |
| **Água animada e correr nadando (27/11/2026, auditoria #14):** 8 quadros no lago do Orvalis, corrida nadando na direção do olhar, fluxo adiado, artes marinhas importadas | ADR 0132 |
| **Pesca do Orvalis (27/11/2026, auditoria #14 E2):** vara, boia, espera 5–30 s, janela 1–2 s, peixes da Wiki, comida, receita da vara aguarda o fio | ADR 0133 |
| **Linha e receita da vara (27/11/2026, auditoria #14 E2):** item 114 fabricado da Lã (1 → 4), vara de 3 Hastes + 2 Linhas | ADR 0134 |
| **Flora marinha do Orvalis (27/11/2026, auditoria #14 E3a):** erva marinha, alga e alga seca; plantas contam como água; gerador v5; modelos instanciados; corais na E3b | ADR 0135 |
| **Corais do Orvalis (27/11/2026, auditoria #14 E3b):** 5 famílias × coral, gorgônia e bloco × vivo e morto; recifes em manchas rasas (gerador v6); bloco vivo sem água morre; sem Toque de Seda | ADR 0136 |
| **Botes do Orvalis (27/11/2026, auditoria #14 E4a):** 3 madeiras, só em água a 8 m/s, embarcar, remar, desembarcar, recolher, no save; com baú na E4b | ADR 0137 |
