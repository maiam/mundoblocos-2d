# Changelog

## Orvalis v0.156.0 — Titã: balde 3D na mão e som de água (22/11/2026)
- **ADR 0095.** O Balde de Cobre aparece na mão como **modelo 3D** do pacote de arte (vazio e cheio, com o líquido escuro à vista), no lugar do sprite extrudado. Malhas de 1.400 e 1.424 triângulos (Blender, `extract-titan-balde.py`) embutidas no jogo, com estilo de mão próprio.
- **Som de água** sintetizado ao recolher (gole que sobe) e ao despejar (fio de água e glub), em vez do som de colocar bloco.
- Sem mudança de regra, de save nem de gerador. Testes: +2 (1.166 no total). Conferido a 740 × 360 e no jogo.

## Orvalis v0.155.0 — Titã: luz do Braseiro aceso (21/11/2026)
- **ADR 0094.** O Braseiro aceso passa a **iluminar o entorno** (luz de bloco 13, perde 1 por célula; a lanterna segue 15). Emissores agora têm nível (`lightLevelOf`); acender, apagar, quebrar e carregar o save acendem e apagam a luz pelo mesmo motor incremental da lanterna.
- Como o braseiro aceso é sólido e emissor, o motor trata a ordem emissor-sai → sólido → emissor-entra. Sem mudança de save nem de gerador. Testes: +4 (1.164 no total). Conferido a 740 × 360 de noite.

## Orvalis v0.154.0 — Titã: tampa do baú e véu do sono (21/11/2026)
- **ADR 0093.** O Baú de Rocha e Junco passa a ter a **tampa animada**: ela é uma malha própria (1.700 triângulos) e gira em torno da dobradiça atrás do baú, abrindo (~109° em ~0,35 s) com o painel do baú e fechando ao fechar o painel. Só desenho: sem mudança de save.
- **Dormir na cama** ganha um **véu escuro**: a tela escurece, a noite passa com ela preta e o véu clareia devagar; o controle volta antes do fim. De dia a cama continua só marcando o ponto de retorno.
- `extract-titan-bau.py` agora separa corpo e tampa. Testes: +3 (1.160 no total). Conferido a 740 × 360 e no jogo.

## Orvalis v0.153.0 — Titã: Braseiro de Rocha em 3D (21/11/2026)
- **Fecha a rodada "Itens do Abrigo". ADR 0092.** O Braseiro de Rocha ganha modelo 3D do pacote de arte, apagado e aceso (mesmos blocos 25 e 26; a troca ao acender já existia). 0,935 × 0,935 m na base e 0,774 m de altura: barra o corpo nessa altura, a mira acerta a caixa do modelo e deixa de ser cubo inteiro.
- O aceso mostra as brasas e brilha por conta própria, de dia e de noite (sem emitir luz no mapa ainda). Na mão o item vira sprite extrudado.
- Modelos reduzidos por `extract-titan-braseiro.py` (1.068 e 1.194 triângulos, atlas único de 256 × 320 px). Testes: +3 (1.157 no total). Conferido a 740 × 360 e no jogo.

## Orvalis v0.152.0 — Titã: Balde de Cobre (21/11/2026)
- **Quarta entrega da rodada "Itens do Abrigo". ADR 0091.** Receita na Mesa: 3 Lingotes de Cobre de Duna → Balde de Cobre (itens 35 vazio e 36 cheio, pilha de 1).
- Com o balde na mão a mira acerta o líquido. **Vazio**, o toque recolhe a célula de cima da coluna do lago (vira ar; o balde enche); **cheio**, o toque despeja o líquido numa célula livre em Y ≤ 63 (cavidade escavada) e o balde volta vazio. Sem fluxo de líquido; sólido colocado sobre o líquido o desloca como antes.
- Ícones de 32 px da arte 2D do pacote (provisórios); balde na mão como sprite extrudado. Testes: +6 (1.154 no total). Conferido a 740 × 360 e no jogo.
- A fundição do pacote (1 lingote por 2 fragmentos) já era a receita atual. Resta o Braseiro 3D da rodada.

## Orvalis v0.151.0 — Titã: Cama de Junco (21/11/2026)
- **Terceira entrega da rodada "Itens do Abrigo". ADR 0090.** Receita na Mesa: 3 Rochas Escuras + 2 Esteiras. Cama de **duas células** (pé 39–42 e cabeceira 43–46, item 34) colocada no sentido do olhar, sobre piso firme; quebrar qualquer metade tira as duas e devolve uma.
- **Usar** marca o **ponto de retorno** (`session.spawn`, `header.spawn` opcional, sem subir a versão do save) e, **à noite**, dorme até o amanhecer (o relógio vai para logo depois do nascer do sol; passar da meia-noite soma um dia). Ao morrer o jogador renasce **ao lado da cama**; sem a cama volta à chegada.
- Modelo 3D reduzido de 8.828 a 2.200 triângulos pelo Blender (`extract-titan-cama.py`), atlas de 256 px. Ícone provisório. Testes: +12 (1.148 no total). Conferido a 740 × 360 e no jogo (dormir de noite).
- Balde de Cobre e Braseiro 3D da mesma rodada ficam para as próximas.

## Orvalis v0.150.0 — Titã: Baú de Rocha e Junco (21/11/2026)
- **Segunda entrega da rodada "Itens do Abrigo". ADR 0089.** Receita na Mesa: 4 Rochas Escuras + 1 Esteira. Bloco com 4 giros (35–38, item 33), sólido até 0,73 m, frente para o jogador. **18 espaços** guardados no bloco (`session.chests`, `header.chests` opcional, sem subir a versão do save); usar (botão, F ou toque) abre o painel do baú ao lado da bolsa: toque numa pilha e num espaço do baú guarda, toque no espaço tira (tudo ou nada). Quebrar o baú cospe o conteúdo.
- Modelo 3D do pacote reduzido de 8.124 a 1.800 triângulos pelo Blender (`extract-titan-bau.py`), atlas de 256 px. **Atlas de itens ampliado a 4 × 10 (40 ids).** `make-titan-escada-icone.py` virou `make-titan-modelo-icone.py` (escada e baú). Ícone provisório. Testes: +14 (1.136 no total). Conferido a 740 × 360.
- Cama, balde de cobre e Braseiro 3D da mesma rodada ficam para as próximas.

## Orvalis v0.149.0 — Titã: Escada de Junco (21/11/2026)
- **Primeira entrega da rodada "Itens do Abrigo". ADR 0088.** Receita na Mesa: 4 Hastes Secas → 3 escadas. Cada escada se prende à lateral de um cubo inteiro (a frente aponta para fora; 4 giros no id, blocos 31–34, item 32), não é sólida e **se sobe**: empurrar para a parede ou pular sobe a 2,3 m/s, soltar escorrega a 1,2 m/s, sem dano de queda. Quebrar o apoio derruba as escadas como itens.
- Modelo 3D do pacote de arte reduzido a 1.398 triângulos pelo Blender (`extract-titan-escada.py`), atlas de 256 px; mira na placa fina. Ícone provisório gerado por script. Testes: +13 (1.125 no total). Conferido a 740 × 360.
- Baú, cama, balde de cobre e Braseiro 3D da mesma rodada ficam para as próximas entregas.

## Orvalis v0.148.0 — Titã: item na mão por categoria e troca animada (21/11/2026)
- **Especificação de exibição na mão do Minecraft. ADR 0087.** Mão vazia (braço), blocos cúbicos (cubo com as texturas do terreno, 45°), itens planos e ferramentas de cobre (sprite extrudado 1/16, pivô no cabo) agora aparecem; a Adaga e a Picareta de Rocha seguem com os GLB. Trocar de item afunda o antigo (0,12 s) e sobe o novo (0,15 s).
- A extrusão usa `itemMasks.json` (script `make-titan-item-masks.py`), nunca lê canvas. `heldKinds.ts`, `extrude.ts` e `EquipAnim` são puros e testados. Testes: +12 (1.113 no total). Conferido a 740 × 360.

## Orvalis v0.147.0 — Titã: gerador v13 (21/11/2026)
- **Etapa 4 da rodada "cultivo e oficina da Margem". ADR 0086.** `GENERATOR_VERSION` 13 (partidas v1–v12 não mudam): as hastes secas avulsas caem de até 8 para as **2 mais próximas da chegada** (uma Picareta de Rocha; o resto vem do Junco Ressecado) e a **Noz de Duna mais próxima da chegada fica sem Farejador**.
- Terreno, juncos, plantas, toca, âmbar, cobre e abrigos idênticos à v12. Testes: `v13.test.ts` (+4, 1.102 no total); `cobre`, `generator` e `regiao` ajustados. Conferido no jogo (seed 42): v13, 2 hastes, 22 plantas, a mais próxima sem guarda.

## Orvalis v0.146.0 — Titã: Esteira de Junco (21/11/2026)
- **Etapa 3 da rodada "cultivo e oficina da Margem". ADR 0085.** Peça fina de piso (1/16 m), no modelo das placas de pressão do Minecraft **sem** as regras de pressão: sem colisão (anda-se por cima), alvo da mira só pela faixa fina, exige piso firme embaixo (quebrar o piso derruba a esteira), não bloqueia luz. Receita na Mesa: 3 Hastes Secas → 1.
- Bloco 30 / item 31; malha do terreno com `half = 3` (topo = trama, laterais = borda); 2 tiles novos no atlas de 32 px (43). Ícone provisório gerado por script. `T_MAX` 30, `isItem` até 31.
- Testes: `esteira.test.ts` (+8, 1.098 no total). Conferido a 740 × 360: piso 3 × 3 e ícone na hotbar.

## Orvalis v0.145.0 — Titã: Noz plantada e Noz Torrada (21/11/2026)
- **Etapa 2 da rodada "cultivo e oficina da Margem". ADR 0084.** A Noz de Duna se planta no topo da Areia Ocre (toque com a noz na mão; em outro alvo continua comendo) e cresce em 3 fases pelo mesmo motor de random ticks do junco; a adulta rende 4 nozes sem ser arrancada e recua. Não cria Farejador. Só cresce na ocre.
- **Noz Torrada** (item 30): Braseiro, 1 Noz → 1 (10 s), fome 7 e saturação 5,6. Ícone provisório gerado por script (`make-titan-noz-torrada.py`); atlas de itens regravado.
- `Crop.species`; `header.crops` aceita `{ s: 'noz', a }` (sem subir a versão do save); `setNuts` com tamanho do broto. Testes: 1.090 no total. Conferido a 740 × 360.

## Orvalis v0.144.0 — Titã: cultivo do Junco de Vidro (21/11/2026)
- **Etapa 1 da rodada "cultivo e oficina da Margem". ADR 0083.** Plantar a muda (o próprio Junco de Vidro) no topo da areia: **úmida** → junco de vidro em 3 fases; **ocre** → junco ressecado. Adulto colhido rende 2 mudas (úmido, volta a "crescendo") ou 2 Hastes Secas (ressecado, volta a muda); a planta nunca é arrancada. Quebrar a areia derruba a planta e devolve a muda no chão.
- Crescimento por **random ticks** (média de 30 s por planta, só perto do viajante) com a fórmula do Minecraft (pontos da areia e vizinhas, metade se aglomerada, luz ≥ 9: céu aberto de dia ou lanterna). `titan/crops.ts` (puro) + `session.tickCrops`; `header.crops` opcional (sem subir a versão do save).
- Atlas `titan-cultivo-32px.webp` (`scripts/make-titan-cultivo32.py`) e `TitanRenderer.setCrops`. Testes: +17 (1.086 no total). Conferido a 740 × 360: as quatro fases e a mira na planta adulta.
- Decidido para a etapa 3: a Esteira de Junco segue a placa de pressão do Minecraft sem pressão (1/16 m, sem colisão, precisa de apoio).

## Orvalis v0.143.0 — Titã: Laje de Rocha revisada e arte de cultivo importada (21/11/2026)
- **Só arte, a pedido do dono do produto** (rodada "cultivo e oficina da Margem" do Drive). A **Laje de Rocha Escura** (topo 32 × 32, lateral 32 × 16, base) é a versão seamless revisada; `topo.png`/`lateral.png` trocados, `base.png` guardado (o atlas não usa base de laje), atlas regravado. Nota de revisão na ADR 0079.
- Importados como **assets-fonte, sem uso no jogo**: `assets-src/titan/cultivo/junco/` (muda plantada, crescendo, adulto com duas mudas, ressecado; 32 × 32) e `assets-src/titan/cultivo/esteira/` (trama seamless e borda; 32 × 32).
- **Regras propostas, ainda não implementadas** (registradas em `NEXT_STEPS`): Muda de Junco em 3 fases na Areia Úmida (2 mudas por colheita, planta-mãe preservada), Junco Ressecado na Areia Ocre (corta = Junco Seco), Esteira de Junco (Mesa, 3 Junco Seco), Noz Torrada (Braseiro, 1 Noz) e plantio da Noz. Tempos, rendimentos e fome em aberto. Sem mudança de código, gerador ou save.

## Orvalis v0.142.0 — Titã: texturas seamless revisadas de quatro materiais (21/11/2026)
- **Arte revisada do dono do produto (Drive):** Areia Ocre (lisa), Areia Úmida (escura, manchas sutis), Rocha Escura (basalto rugoso) e Rocha com Veio (derivada do basalto, veio termina dentro da face). As bordas opostas de cada face coincidem nos dois eixos. Sem decisão nova: **ADR 0079** ganhou a nota de revisão.
- `assets-src/titan/texturas32/` atualizado (12 PNGs + `LEIA-ME.txt`); `make-titan-atlas32.py` regravou `titan-atlas-32px.webp` (288 × 216, 44 KB). Os outros 15 materiais são idênticos ao pacote anterior. Sem mudança de código, gerador ou save. Conferido a 740 × 360 (areia sem emenda visível).
- Drive também ganhou as quatro **Cenas da abertura** (ilustrações, ~2 MB cada, só referência de arte, fora do jogo) e atualizou `01_Historia`; o `README` do Drive segue em v0.133.0.

## Orvalis v0.141.0 — Titã: o bloco quebrado cai no chão (21/11/2026)
- **Pedido do dono do produto (modelo do Minecraft).** **ADR 0082.** Todo bloco comum quebrado vira item solto na célula (`b:x,y,z:n`) e é recolhido por proximidade (raio 1,45 m, atraso de 0,45 s, some em 5 min); quebrar não falha mais por mochila cheia. A lanterna segue direto para a mochila.
- Desenho: o item salta ao nascer, não se sobrepõe a outros na célula e voa 0,14 s até o jogador ao ser recolhido. Sem mudança de formato de save nem de gerador.
- Testes: `dropsBloco.test.ts` (+8, 1.069 no total); oito arquivos ajustados com `dropTestUtil.ts`. Conferido no navegador: o drop é recolhido ao chegar perto.

## Orvalis v0.140.0 — Titã: joystick analógico de volta no toque (21/11/2026)
- **Pedido do dono do produto:** não gostou das setas; voltou o joystick antigo. **ADR 0081.** `.titan-stick` (120 px, miolo arrastável, `input.stickX/Y` analógico) no lugar de `.titan-dpad`, respeitando a margem `--edge`. Corrida: joystick empurrado até o fim para a frente (`stickY ≤ −0,85`) por 0,2 s. Ação no ponto do dedo, modo de mira, anel e margens (ADR 0075–0077) não mudam.

## Orvalis v0.139.0 — Titã: segurar no animal golpeia em sequência (21/11/2026)
- **Relato do dono do produto:** a adaga repetia o golpe contra blocos, mas não dava dano no Farejador. **ADR 0080.** Causas: segurar cancelava o gesto sem golpear (só o toque curto golpeava) e o animal, ao andar, mudava a célula do alvo e cancelava o toque.
- O gesto compara o **mesmo animal** (não a célula); novo estado `ATTACKING`: segurar golpeia em sequência (pausa de 0,6 s do `strike`), troca de animal segue no novo, sair da mira ou arrastar encerra.
- Testes `gesture.test.ts` (+3; 1.061 no total, 1 ignorado). Conferido a 740 × 360 com emulação de toque: cinco golpes em 2,7 s (100 → 80).

## Orvalis v0.138.0 — Titã: atlas de terreno de 32 px por face (21/11/2026)
- **Pranchas individuais de texturas do dono do produto (32 px); substituem também os blocos existentes.** **ADR 0079.** Atlas novo (288 × 216, 42 KB) com topo, lateral e base próprios em todos os blocos do terreno (areia, rocha, gelo, veios, cobre, depósito, laje, carapaça, braseiro, veio e bloco de âmbar).
- `src/titan/tiles.json` (ordem dos 41 tiles) é a fonte única do script `make-titan-atlas32.py` e do TypeScript; `tileFor` devolve o tile por face e `tileIndex(nome)` busca pelo nome.
- Lago e modelos 3D (mesa, lanterna, Marco, Painel) ficam como estavam. Testes de UV e de `tileFor` atualizados (1.058 no total). Conferido a 740 × 360.

## Orvalis v0.137.0 — Titã: Picareta de Rocha na mão (21/11/2026)
- **Pacote 3D "Picareta de Rocha" do dono do produto.** **ADR 0078.** GLB de 3,1 MB (com rig e clipe) → **325 KB** só com a malha (4.632 triângulos) e o BaseColor 1024 px em WebP, por `scripts/export-titan-picareta.py`; carregado só quando a picareta é escolhida.
- A picareta aparece na mão com **golpe próprio, por cima** (`STYLES` em `heldPose.ts`; a adaga segue cortando em diagonal) e se repete ao segurar para quebrar. `HELD_MODELS` mapeia item → modelo, estilo e escala.
- Testes `heldPose.test.ts` (+2; 1.057 no total, 1 ignorado). Conferido a 740 × 360 em 5 fases do golpe.

## Orvalis v0.136.0 — Titã: tela cheia no toque (bordas livres e volta imediata) (21/11/2026)
- **Relato do dono do produto (tablet na horizontal):** segurar o toque às vezes tira o navegador da tela cheia (e ao soltar ela volta). **ADR 0077.**
- Controles e área de ação a **36 px das bordas** (faixas dos gestos do sistema), menu do alto mais para dentro, segurar sem menu do navegador, e, se a tela cheia cair com o dedo na tela, o jogo a pede **na hora** de volta (não volta se foi gesto de voltar sem toque, campo de texto ou aba escondida).
- Setas menores (50 px). Asserts novos de `shouldReenter` em `player.test.ts` (1.055 testes, 1 ignorado). Não reproduzido em aparelho real: aceite no tablet pendente.

## Orvalis v0.135.0 — Titã: modo de mira no toque e corrida (21/11/2026)
- **Referência do Minecraft de toque do dono do produto.** **ADR 0076.** Botão **"Mira: no dedo / central"** no menu (só toque; lembrado no aparelho): no dedo = ação no ponto tocado (ADR 0075); central = cruzeta + no centro e arrastar só gira (o "Usar" volta).
- **Corrida:** segurar ▲ por 0,2 s (andando) dá +30 % de velocidade, FOV +6° e 0,2 de cansaço por bloco (antes 0,1).
- O raycast já era o 3D DDA (Amanatides–Woo) e o multitoque já era isolado por ponteiro; joystick flutuante não foi feito (setas, por escolha do dono do produto). Testes `corrida.test.ts` (+3; 1.055 no total, 1 ignorado).

## Orvalis v0.134.0 — Titã: toque no estilo do Minecraft (setas e ação no ponto tocado) (21/11/2026)
- **Referência do Minecraft de toque do dono do produto.** **ADR 0075.** Joystick → **setas** ▲ ▼ ◀ ▶ (multitoque, diagonal) e botão de pular quadrado ⤒.
- **A ação acontece onde o dedo toca:** toque curto coloca/golpeia, segurar quebra, arrastar gira; o alvo é o que está sob o dedo (`rayThrough`, `computeAim`), com **anel azul** no ponto que enche com o progresso; some a mira central no toque e tocar na Mesa/Braseiro abre a estação. PC sem mudança.
- Testes `aim.test.ts` (+2; 1.052 no total, 1 ignorado). Conferido a 740 × 360 com emulação de toque.

## Orvalis v0.133.0 — Titã: Margem como bioma, noz em 1 % da areia seca e Farejadores por planta (gerador v12) (20/11/2026)
- **Pedido do dono do produto.** **ADR 0074.** `titan/biomes.ts` (Margem Silenciosa); a **Noz de Duna só em areia seca**, em **1 %** da areia seca elegível (~22 plantas na seed 42, antes 6), com espaçamento ≥ 4, as 2 perto da chegada e a enseada da toca mantidas.
- **Um Farejador pequeno por planta**, junto dela, e **um grande a cada 5 plantas** (seed 42: 22 pequenos e 4 grandes). A volta depois do abate agora é **por animal** (`respawn` por id; partidas antigas seguem com o par da toca). Só os 56 m em volta simulam e só os 8 mais próximos são desenhados.
- Documentação: ADR 0060 corrigido (a v5–v11 aceitava areia seca ou úmida). Testes `bioma.test.ts` (+4; 1.050 no total, 1 ignorado). Conferido a 740 × 360: 22 plantas, 26 animais, 8 desenhados, pequeno junto da planta com o rótulo de vida.

## Orvalis v0.132.1 — Documentação: onde nasce a Noz de Duna (20/11/2026)
- ADR 0060 e comentários do gerador diziam "areia seca", mas `nutsFor` aceita areia seca **ou úmida** (topo 64–66). Medido em 21 seeds: ~86 % das plantas em seca e ~14 % em úmida. Só texto; o gerador não mudou.

## Orvalis v0.132.0 — Titã: golpe procedural da adaga, repetido ao agir (20/11/2026)
- **Referência do Minecraft do dono do produto** (`ItemInHandRenderer`): o golpe é 100 % procedural, sem keyframes, por um contador normalizado `p` (0 → 1 em **0,3 s**, 6 ticks) e três curvas de seno (`sin1`, `sin2` = ease-out, `sinSq` = giro do pulso). **ADR 0071 (atualização).**
- `render/heldPose.ts` reescrito (puro): `swingCurves`, `handPose(p, bob, dip)` (a mão cruza para a esquerda, avança, sobe e a lâmina desce 48°; recua e volta), `bobOffset` (balanço ao andar, respiração parada) e a classe `HandAnim` (golpe isolado com afundamento de 0,45 que recupera, golpe **repetido sem pausa enquanto se segura para quebrar**, afundamento menor no ciclo).
- `TitanRenderer.setHandMotion(velocidade, no chão, agindo)` alimenta a mão a cada quadro; o golpe no Farejador continua disparando um golpe isolado. A mão segue em cena própria desenhada por cima do mundo (nunca atravessa paredes).
- Amplitudes ajustadas ao nosso modelo (pivô na palma): a descida da lâmina ficou em 48° (78° tirava a adaga da tela a 360 px de altura). Testes +2 (1.046 no total). Conferido a 740 × 360 em 5 fases do golpe.

## Orvalis v0.131.1 — Titã: mira nos Farejadores pequenos (20/11/2026)
- **Relato do dono do produto:** os pequenos "não dropam nem somem quando mortos". O abate em si funciona (3 golpes de adaga: o animal some, solta carne e placa e volta em 600 s; conferido no navegador), mas a mira tinha dois defeitos que impediam de chegar a ele: o pequeno nasce **na mesma célula do grande** e ficava dentro da esfera dele (o grande sempre vencia a mira), e o pequeno colado nos pés só se acertava olhando quase na vertical.
- `creatureAim` agora escolhe, entre as esferas acertadas, a que está **mais perto do eixo da mira** (proporcional ao tamanho) e, sem acerto, faz uma **ajuda de mira** rente aos pés (≤ 1,4 m, dentro de 60° do olhar, escondida por bloco mais perto). Observação: o espólio que cai perto do jogador é recolhido na hora (a mensagem "abatido: …" confirma).
- Teste +1 em `combat.test.ts` (1.044 no total).

## Orvalis v0.131.0 — Titã: Brasa de Âmbar como combustível comum (gerador v11) (20/11/2026)
- **Proposta do dono do produto.** **ADR 0073.** Decisão: sem cavernas ainda (ficam como pendência); veios enterrados no lugar.
- **Gerador v11:** 4 depósitos de brasa acessíveis a pé nos 4 × 4 chunks iniciais, cada um com juncos de vidro; **Veio de Âmbar** (bloco 28) enterrado em veios de 3 a 8 blocos, só com picareta (rende 1–2 brasas), com brilho discreto; um veio garantido a 6–20 blocos da chegada. Partidas antigas seguem na versão delas.
- **Bloco de Âmbar Compactado** (item e bloco 29): 9 brasas na Mesa → 1 bloco, e o inverso; colocável, combustível de 36 preparações.
- **Braseiro:** 1 brasa = 4 preparações; a carga só é gasta ao cozinhar e o saldo fica guardado; painel mostra "Carga: n preparações". Arte provisória (tiles 16 e 17, atlas 80 × 100; ícone do bloco).
- Testes `ambar.test.ts` (+5; 1.043 no total) e `furnace.test.ts` atualizado. Conferido a 740 × 360: veio garantido com brilho no fundo de um poço, bloco como combustível no painel (hotbar com o ícone).

## Orvalis v0.130.0 — Titã: painel do braseiro maior e mais claro (20/11/2026)
- **Referência da Fornalha do Minecraft do dono do produto.** Layout do ADR 0068 reorganizado (sem mudar regras): **Entrada** em cima, **chama** no meio e **Combustível** embaixo à esquerda; **seta** de progresso e **Resultado** grande à direita (ícone em escala 2×); espaços de 56 px (antes 32).
- Chama (esvazia com o fogo) e seta (enche com o cozimento) desenhadas em CSS (`clip-path`), no lugar das duas barras. Com o braseiro aberto, a coluna da direita passa de 172 para 232 px e a bolsa quebra em menos colunas (`.titan-bagtop.furn`). Removida uma duplicata do CSS antigo do braseiro.
- Conferido a 740 × 360: tudo cabe sem rolagem. Sem teste novo (só apresentação); tsc, vitest e build passam.

## Orvalis v0.129.0 — Titã: fragmentos à vista na rocha escura (gerador v10) (20/11/2026)
- **Pedido do dono do produto: fragmentos em abundância nas rochas escuras das camadas altas.** **ADR 0072.**
- `GENERATOR_VERSION` 10: veios de rocha em 12 % da rocha escura de Y ≥ 72 e 6 % abaixo, e de gelo em 6 % das manchas de gelo; ao todo mais de 60 de rocha e 30 de gelo à vista por seed (eram 3 e 3). Relevo e tudo o mais idênticos à v9; fora das formações, abrigos e montes de cobre.
- Testes `fragmentos.test.ts` (+3; 1.038 no total). Conferido a 740 × 360: faixa de rocha escura com vários veios na camada alta.

## Orvalis v0.128.0 — Titã: Adaga de Rocha na mão (primeira pessoa) (20/11/2026)
- **Pacote 3D "Adaga de Rocha" do dono do produto, limite de 2 MB.** **ADR 0071.**
- GLB reduzido de 11,5 MB para **338 KB** (3 peças, 6.272 triângulos, BaseColor 1024 px em WebP) por `scripts/export-titan-adaga.py`; carregado só quando a adaga é escolhida.
- Com a adaga selecionada, o modelo aparece na mão (cena própria desenhada por cima do mundo) e **balança no golpe no Farejador** (0,34 s).
- Testes `heldPose.test.ts` (+3; 1.035 no total, 1 ignorado). Conferido a 740 × 360: lâmina violeta, cabo ocre e amarração, parada e em pleno golpe.

## Orvalis v0.127.0 — Titã: veios subterrâneos (gerador v9) (20/11/2026)
- **Referência do Minecraft 1.18 do dono do produto.** **ADR 0070.**
- `GENERATOR_VERSION` 9: **cobre, rocha e gelo enterrados** com altura triangular (pico: cobre Y 8, gelo Y −24; rocha uniforme), veios por caminhada aleatória, descarte por exposição ao ar e só substituindo a rocha profunda. Os gelos soltos do subsolo saem na v9 (v1–v8 ficam como eram); a superfície é idêntica à v8. Seeds novas abrem na v9; partidas salvas continuam na versão delas.
- `titan/ores.ts` (puro) + `ORE_RULES` no gerador; resultado independente da ordem de leitura (3 × 3 chunks, prioridade fixa).
- Testes `ores.test.ts` (+6; 1.033 no total). Conferido a 740 × 360: poço até um veio de cobre enterrado, com a textura do veio no fundo.

## Orvalis v0.126.1 — Titã: revisão de docs e espólio sem colisão (20/11/2026)
- NEXT_STEPS deixava a etapa 4 como pendente (já entregue em 0.126.0): corrigido. Ids do espólio (`m:<tipo>:<n>:<k>`) agora têm sufixo livre: dois abates no mesmo instante não perdem itens. Teste +1 (1.026).
- Revisão: sem outras inconsistências entre docs e código (ids de itens/blocos, atlas, ADRs, MAPS, CLAUDE.md).

## Orvalis v0.126.0 — Titã: combate com o Farejador e carne (20/11/2026)
- **Etapa 4 de 4 do pacote "O que a duna guarda"** (números e ícones provisórios). **ADR 0069.**
- Farejadores têm **vida** (pequeno 10, grande 30) e reagem ao golpe (tranco no modelo, investem por 8 s mesmo sem avistar). Mira por raio × esfera a até 3 m; rótulo "Farejador grande · 26/30"; só o **toque curto** golpeia (pausa de 0,6 s); dano por arma: punho 1, picareta 2/3, adaga 4/6, com o desgaste do ADR 0067.
- Abatido solta **Carne Crua** (1 ou 2) e **Placa**; a **Carne Assada** sai do braseiro (10 s, fome 8). O animal volta na toca após 600 s de jogo ativo (`header.respawn` opcional; sem subir versões).
- Testes `combat.test.ts` (+6; 1.025 no total). Conferido a 740 × 360: rótulo com a vida, golpe por toque (30 → 26, adaga 130/131); abate, espólio e respawn só nos testes.

## Orvalis v0.125.0 — Titã: Braseiro como fornalha, bloco com estado (20/11/2026)
- **Regras de interação do dono do produto** (Mesa sem memória; Fornalha/Baú como blocos com estado). **ADR 0068.**
- O **Braseiro de Rocha** guarda **entrada, combustível e saída** na coordenada do bloco (`session.furnaces`, `header.furnaces` opcional); **cozimento de 10 s**, **Brasa de Âmbar queima 80 s** (8 preparações), o fogo acende consumindo 1 combustível na hora, sem fogo o progresso regride; corre **com a tela aberta ou fechada, só com o jogo ativo**; o bloco acende e apaga sozinho. **Quebrar cospe o conteúdo** no chão.
- Painel do braseiro (Usar/F): tocar numa pilha da mochila e depois em Entrada/Combustível; tocar no espaço tira. O gesto de colocar encostado continua como era. A Brasa não acende mais por toque; os cartões do lingote saíram do livro (ficam no painel).
- Testes `furnace.test.ts` (+7; 1.019 no total). Conferido a 740 × 360: painel com os três espaços e as barras, "Aceso: 76 s de fogo", e o fogo e o cozimento seguindo com a tela fechada.

## Orvalis v0.124.0 — Titã: durabilidade das ferramentas (20/11/2026)
- **Regra do dono do produto** (modelo do Minecraft). **ADR 0067.**
- `Stack.wear` guarda o desgaste no próprio espaço do inventário; máximos **131** (rocha) e **190** (cobre) em `titan/wear.ts`. Quebrar bloco gasta a ferramenta na mão: **picareta −1, adaga −2** (uso impróprio); o golpe (etapa 4) será adaga −1 e picareta −2; recolher lanterna, Marco e Painel não gasta. Ao chegar no máximo o item **quebra**, some, avisa e toca o estilhaço.
- Barra de durabilidade na hotbar e na bolsa (verde → vermelho, escondida enquanto intacta) e `restante/máximo` no rótulo; o desgaste vai no save (`[item, count, wear]`, sem subir versão) e acompanha a pilha solta ao morrer.
- Fora do escopo: Inquebrável, Remendo, Bigorna e reparo; armadura e escudo.
- Testes `desgaste.test.ts` (+5; 1.015 no total). Conferido a 740 × 360: barras verde, amarela e vermelha, ferramentas intactas sem barra, rótulo "Picareta de Cobre · 95/190".

## Orvalis v0.123.0 — Titã: abrigos, Placa e Revestimento de Carapaça (20/11/2026)
- **Etapa 3 de 4 do pacote "O que a duna guarda"** (arte e números provisórios). **ADR 0066.**
- **Gerador v8:** 2 abrigos (vão entre dois pilares de rocha escura) por seed, fora do território do Farejador, cada um com uma **Placa de Carapaça** no chão (item 25, recolhida à mão).
- **Revestimento de Carapaça** (item 26, bloco 27, tile 15): 1 Placa + 1 Rocha Escura → 2 na Mesa; cubo sólido de rocha.
- Testes `abrigo.test.ts` (+3; 1.010 no total). Conferido a 740 × 360: abrigo com a placa ao fundo, fileira de revestimento colocada, ícones na hotbar. O tile do revestimento lê como tijolo (provisório).

## Orvalis v0.122.0 — Titã: Braseiro de Rocha, Lingote de Cobre e ferramentas de cobre (20/11/2026)
- **Etapa 2 de 4 do pacote "O que a duna guarda"** (números provisórios autorizados). **ADR 0065.**
- **Braseiro de Rocha** (blocos 25 apagado e 26 aceso; item 21; receita 4 Rochas Escuras na Mesa): a Brasa de Âmbar o acende com 8 preparações (`session.braziers`, `header.braziers` opcional); só o aceso é estação (Usar/F), mostra só as receitas dele e apaga ao zerar as cargas.
- **Lingote de Cobre** (2 Fragmentos, braseiro aceso), **Picareta de Cobre** (3 Lingotes + 2 Hastes; rocha em 40 % do tempo), **Adaga de Rocha** e **Adaga de Cobre** (sem efeito até o combate). Itens 21–24; `stationMet` como regra única de estação.
- Atlas de terreno 80 × 80 (tiles 12–14 do braseiro, `make-titan-braseiro.py`); ícones provisórios das ilustrações.
- Testes `braseiro.test.ts` (+4; 1.007 no total). Conferido a 740 × 360: braseiro aceso com a cuba brilhando, "Usar [F]", tela só com a receita do braseiro, fabricar o lingote gasta 2 fragmentos e 1 carga.

## Orvalis v0.121.0 — Titã: Farejador de Duna com rig e textura 2K (20/11/2026)
- **Arte do dono do produto** (Drive: retopologia, UV, baking, texturas 2K e rig). **ADR 0064.**
- GLB leve (`extract-titan-farejador-rig.py`): 81 malhas → 1 malha skinada de 23.768 triângulos, 18 ossos, Base Color 1024² JPEG (1,2 MB), mesma caixa do modelo antigo. Carrega em segundo plano; até chegar (ou se falhar) valem as 7 partes. `assetsInclude` de `.glb` no Vite.
- `render/farejadorRig.ts`: ossos girados no espaço do modelo pela `farejadorPose` (passo com joelho e pé, cabeça e pescoço, cauda em três segmentos, galope, atordoado de costas); sem clipes (o pacote não traz animações no GLB).
- Testes `farejadorRig.test.ts` (+2; 1.003 no total). Conferido a 740 × 360: os dois tamanhos com a textura nova, de costas atordoado, e pés/cabeça/cauda movendo no sentido certo.

## Orvalis v0.120.0 — Titã: cobre de Duna, Haste Seca e Picareta de Rocha (20/11/2026)
- **Etapa 1 de 4 do pacote "O que a duna guarda"** (Drive; números provisórios autorizados). **ADR 0063.**
- **Gerador v7:** 2 afloramentos de rocha com 3 veios de cobre cada (≥ 28 blocos da toca do Farejador) e até 8 hastes secas de junco no chão; região e relevo da v6.
- **Veio de Cobre** (bloco 24, tile 11): só quebra com **picareta** (sem ela, "só pó nos dedos"); solta 2 Fragmentos de Cobre no chão. Itens 17–20 (Fragmento e Lingote de Cobre, Haste Seca, Picareta de Rocha); receita na Mesa (3 fragmentos de rocha + 2 hastes secas), grupo **Ferramentas**; com picareta a rocha cede a 60 % do tempo.
- Atlas de itens 128 × 256 (4 × 8); ícones e tile **provisórios** gerados das ilustrações (`make-titan-icones-conceito.py`, `make-titan-veio-cobre.py`).
- Testes `cobre.test.ts` (+8; 1.001 no total). Conferido a 740 × 360: afloramento, hotbar com os novos ícones, sem picareta o veio não quebra, com ela solta 2 fragmentos.

## Orvalis v0.119.0 — Titã: região de 8 × 8 chunks (gerador v6) e lote de 200 seeds (20/11/2026)
- **Pedido do dono do produto:** ampliar a região para 8 × 8 chunks e reduzir o levantamento de 1.000 para 200 seeds. **ADR 0062.**
- **Gerador v6:** região de 128 × 128 blocos (a v1–v5 continua em 64 × 64: região por versão em `voxel.ts`/`TitanGenerator.region`); relevo longe do lago gradual e limitado (sem o degrau de 5 blocos), Y ≈ 53–84, andável até a borda; chegada, formações, veios, brasa, juncos, plantas e toca como na v5, sorteados na região maior.
- Volume, luz (`LightEngine`), seções iniciais, drops do save e buscas do gerador leem a região do gerador; a abertura continua em ≈ 1,5 s.
- Testes: `regiao.test.ts` (+5); lote de levantamento em 200 seeds (v6) e as 9 seeds de reserva viraram regressão da v5; testes de luz, lajes e Marco/Painel fixam a v5. Conferido a 740 × 360 na borda leste e no sul (x = 58, z = 50).

## Orvalis v0.118.0 — Titã: Farejadores de Duna (20/11/2026)
- **Arte e regras do dono do produto** (Drive: GLB low-poly de 3.538 triângulos, atlas, história "O dono da enseada"; um pequeno ½ e um grande 1,3×). **ADR 0061.**
- **Toca** no centro da enseada (`TitanGenerator.den`, na v5 ainda não publicada) com um Farejador **grande** (escala 1,3, dano 4) e um **pequeno** (½, dano 2). Passeiam em volta da toca; ao avistar o viajante (8 m o pequeno, 11 m o grande) **investem**; ao bater **caem de costas como um tatu e ficam 2 s parados, estonteados**, antes de nova investida. Investida que erra: pausa e volta à toca. Nunca perseguem além de 20 m da toca.
- Desenho em 7 partes com pivô (`extract-titan-farejador.py`, atlas 224 × 36), pose por partes (passo, cabeça, cauda, galope, rolagem de costas) e `playScrape`. Sem rig, sem combate, fora do save.
- Testes `creature.test.ts` (+8; 990 no total). Conferido a 740 × 360: os dois tamanhos investindo, vida 20 → 18 → 14 (2 + 4) e o grande de costas, parado.

## Orvalis v0.117.0 — Titã: Noz de Duna, comida e fome ligada (20/11/2026)
- **Arte e história do dono do produto** (Drive: planta low-poly, atlas de 32 px, "O dono da enseada"). **ADR 0060.**
- **Gerador v5:** 6 plantas por seed (2 perto da chegada, enseada de até 4 afastada); terreno, brasa e juncos como na v4 (`GENERATOR_VERSION` 5).
- **Noz de Duna** (item 16): colher rende 4 nozes, a planta fica sem frutos e rebrota em 5 min de jogo (`header.regrow`, sem bump); comer por toque no espaço, Q ou toque no mundo (+4 fome). Ícone provisório (`make-titan-noz-icone.py`).
- **Fome ligada:** exaustão por andar, pular e quebrar (`EXHAUSTION`), inanição para em 1 ponto (não mata), barra de fome no HUD.
- Planta 3D (3.008 tris) em duas malhas instanciadas (`extract-titan-noz.py`, `setNuts`). Testes `noz.test.ts` (+7; 982 no total). Conferido a 740 × 360: planta, colheita, comer e barra de fome.

## Orvalis v0.116.0 — Titã: vida, ar e fome (20/11/2026)
- **Regras e HUD do dono do produto** (Drive, pranchas Ar/Vida/Fome + modelo `updatePlayerVitals`). **ADR 0059.**
- `titan/vitals.ts`: vida 0–20, ar 15 s (afogamento 2 pts/s, recarga em 2 s), dano de queda `⌈h − 3⌉`, regra completa de fome (exaustão/saturação/inanição) pronta mas **desligada** (`HUNGER_ENABLED`); regeneração provisória de 1 ponto/1,5 s.
- Morte: itens caem em pilhas no ponto e o jogador renasce na chegada (`dieAndRespawn`); `Drop.count`; `TitanHeader.vitals` opcional (sem bump de versão).
- HUD (corações, bolhas, tremor/véu de dano, som de dano) com atlas `titan-hud-32px.webp`.
- Testes (`vitals.test.ts`, +8; 975 no total). Conferido a 740 × 360: corações, bolhas, mensagem de morte e pilha deixada no ponto.

## Orvalis v0.115.0 — Titã: Marco de Margem e Painel de Junco (20/11/2026)
- **Arte e regras do dono do produto** (Drive, doc 08; GLBs low-poly de 148 e 832 triângulos e ícones de 32 px). **ADR 0058.**
- **Receitas na Mesa:** 1 fragmento de rocha + 1 junco → 1 Marco; 2 juncos + 1 rocha escura → 2 Painéis. Itens 14 e 15; blocos 18–21 (Marco, giro) e 22–23 (Painel, eixo X ou Z); sem mudar o save.
- **Marco:** atravessável, frente voltada para o jogador, caixa de mira própria. **Painel:** sólido até 0,944 m na célula inteira (o salto automático o vence), deixa a luz passar, corre de través ao olhar, módulos de 1 m em linha. Recolhimento curto como a lanterna.
- Infra: `TitanVolume.modelCells(kind)`/`modelVersion` (mesa, Marco e Painel), `models.ts` (caixas), `blocksLight`, `isCollectBlock`, `T_MAX`; `TitanRenderer` com uma `InstancedMesh` por modelo (luz do dia por uniform, `iGlow` por instância); `scripts/extract-titan-margem.py`.
- Testes (`margem.test.ts`, +7; catálogo de receitas atualizado). Conferido a 740 × 360: 4 giros do Marco, painéis em linha e de través, caixa de mira justa; build ok.

## Orvalis v0.114.0 — Titã: Lago Escuro V2 e visual submerso (20/11/2026)
- **Arte e regras do dono do produto** (Drive, doc 08 e seções de aparência submersa dos docs 03 e 04). **ADR 0057.**
- **Texturas V2 de 32 px** no líquido (atlas próprio de 128 × 32, topo em dois quadros, lateral exposta; a lateral sem a faixa clara nas faces com líquido em cima); a face de cima também aparece por baixo.
- **Visual submerso** (`underwater.ts`, `TitanRenderer.applyUnderwater`): olhos dentro do líquido → névoa carvão-violeta de 8 a 14 blocos (adaptação de 2 s), luz ambiente por profundidade `max(0,18, exp(−0,18 d))`, céu e sol somem, véu de tela em ~150 ms. Sem remalhar (26 seções antes e depois).
- Testes (`underwater.test.ts`, +4): olhos × célula, curvas, entrada/saída/adaptação, UV da malha. Conferido a 740 × 360 de tarde e à noite, no raso e a 9 blocos. Fora desta entrega: ar, dano, rota de saída, Marco e Painel.

## Orvalis v0.113.0 — Titã: conjunto completo de ícones de 32 px (20/11/2026)
- **Arte do dono do produto** (Drive): blocos (areia ocre e úmida, rocha escura, gelo fosco), laje e mesa em vista 3/4, mais lente de gelo, brasa de âmbar e item de junco de vidro, todos em 32 × 32 px. **ADR 0053 (extensão).**
- `make-titan-arte32.py` passa a montar o atlas de itens 128 × 128 com sprites de 32 px para todos os itens, exceto a cápsula legada (id 7, base de 16 px ampliada 2×). Sem mudar código de interface, ids nem saves. Conferido a 740 × 360, 1024 × 768 e 1280 × 720 (hotbar, bolsa e receitas), sem erros.

## Orvalis v0.112.0 — Titã: lajes superior e dupla (20/11/2026)
- **Regras de laje do Minecraft** (dono do produto). **ADR 0056.**
- Ids `SLAB_TOP` (16, metade de cima) e `SLAB_DOUBLE` (17, cubo; devolve 2 lajes); sem mudar o save. Colocação por face e altura clicadas (`slabs.ts`, `Hit.hy`): superior no teto ou na metade alta da lateral, inferior no resto, **fusão em laje dupla** pelo topo da inferior ou pela base da superior (gasta 1; recusa se invadir o corpo).
- Física pela faixa da célula (`blockSpan`/`bodySpan`/`ceilingY`): a superior bloqueia só a metade de cima (corredor de 1,5 m: o corpo de 1,8 m não passa), pouso e salto automático nela, cabeça bate no meio da célula; mira e malha pela metade ocupada. Quebra: laje 1 s, dupla 1,6 s.
- Testes (`slabs.test.ts`, +11; `slab.test.ts` ajustado ao novo `canPlaceAt` por faixa). Conferido no navegador (740 × 360): mira alta (hy 0,62) → superior; média/baixa (hy 0,21 e 0) → inferior.

## Orvalis v0.111.0 — Titã: salto automático e quebra contínua ao arrastar (20/11/2026)
- **Pedido do dono do produto.** **ADR 0055** (altera em parte a ADR 0042).
- **Salto automático** (`physics.ts`): andando no chão contra um degrau de 1 bloco com espaço em cima, o corpo pula sozinho e sobe se continua andando (entrada ≥ 0,35 contra o bloco; não pula no ar/água, parede de 2 blocos, teto baixo nem repete). Pular pelo botão e o degrau da laje seguem iguais.
- **Quebra contínua** (`gesture.ts`): segurando, ao apontar outro bloco a quebra recomeça nele (tempo cheio, do zero); depois de quebrar, arrastar além de 10 px recomeça no próximo; sem arrastar não há quebra em série. Toque curto continua colocando.
- Testes: `autojump.test.ts` (6) e `gesture.test.ts` (+4, 1 reescrito: trocar de bloco agora segue no novo); `slab.test.ts` ajustado (o cubo de 1 m é subido pelo salto automático). Conferido no navegador (740 × 360, sem erros): sobe o degrau de 1 bloco andando; trocar de bloco durante a quebra e arrastar depois de quebrar seguem no próximo.

## Orvalis v0.110.0 — Titã: sintetizador de som unificado (rocha, areia, gelo, ações e passos) (20/11/2026)
- **Proposta do dono do produto** (`gameAudio.ts`), no lugar do sintetizador só da rocha. **ADR 0054 (extensão).**
- Quebra e golpe seco para rocha, areia e gelo; colocar bloco por material; lanterna (colocar e recolher); coleta de item/lasca (gesto e proximidade); **passos** por superfície a cada 2,4 blocos no chão. `titan/sounds.ts` (puro): `surfaceOf`, `FootstepClock`. Botão **Som: ligado/desligado** no menu, lembrado no aparelho.
- Testes (+8: `sounds.test.ts`, `gameAudio.test.ts`; `rockAudio.test.ts` removido). Conferido no navegador (740 × 360, sem erros): quebra de rocha/areia/gelo, colocar, lanterna, passos e o botão.

## Orvalis v0.109.0 — Titã: som da rocha sintetizado na hora (19/11/2026)
- **Proposta do dono do produto:** o primeiro som do Titã, sem arquivos de áudio. **ADR 0054.**
- `titan/rockAudio.ts` (Web Audio): golpe seco a cada 250 ms enquanto a rocha racha (o tom sobe com o progresso) e quebra em camadas ao concluir (pancada grave, três rajadas de estilhaços defasadas e corpo grave), com variação aleatória; ganho mestre de 0,6. `isRockSound` (`breaking.ts`): rocha escura, veio, laje e mesa; areia, gelo e brasa em silêncio por ora. O contexto é liberado no primeiro toque ou tecla (iOS/Safari); sem Web Audio vira silêncio.
- Testes (`rockAudio.test.ts`, +4, com `AudioContext` de mentira): família da rocha, camadas por som, retomada do contexto suspenso, silêncio sem suporte. Conferido no navegador: 3 golpes em 0,9 s e a quebra ao concluir, sem erros.

## Orvalis v0.108.0 — Titã: arte de 32 × 32 nos fragmentos, na lanterna e no junco (19/11/2026)
- **Arte do dono do produto** (Drive): fragmento de rocha, fragmento de gelo, Lanterna da Margem (ícone redesenhado a partir do high-poly) e Junco de Vidro, em 32 px. **ADR 0053.**
- Atlas de itens **128 × 128** (células de 32 px; os demais itens = arte antiga ampliada 2×) por `scripts/make-titan-arte32.py`; interface em **escala inteira** (64 px no desktop e no tablet, 32 px no celular), `pixelated`; junco com atlas de 128 × 32 (`REED_COLUMNS`). Ids e saves inalterados. Lascas no chão e ícones usam o mesmo atlas.
- Conferido a 740 × 360, 1024 × 768 e 1280 × 720 (hotbar, bolsa e junco em campo), sem estouro de layout.

## Orvalis v0.107.0 — Titã: a Mesa de Trabalho fica voltada para o jogador (19/11/2026)
- **Pedido do dono do produto:** a mesa saía sempre virada para o mesmo lado. Agora a frente (o nicho) fica voltada para quem a coloca (olhando ao norte, a frente fica ao sul). **ADR 0052.**
- Quatro ids de bloco (`T.WORKBENCH`, `_90`, `_180`, `_270`; giro no id, sem estado extra nem `TITAN_SAVE_VERSION`); `isWorkbench`/`workbenchTurn`/`workbenchId`/`workbenchTurnFacing` em `voxel.ts`; `workbenchCells()` devolve `[x, y, z, giro]`; o renderer gira cada instância. Mesas antigas (id 10) abrem como estavam.
- Testes (`fabricacao.test.ts`): giro pelas quatro direções, persistência ao reabrir, quebra devolve o item. Conferido a 740 × 360 pela colocação real (clique) nas quatro direções.

## Orvalis v0.106.0 — Titã: Junco de Vidro com três silhuetas (19/11/2026)
- **Arte do dono do produto** (Drive): atlas de 48 × 16 px com broto baixo, haste bifurcada e tufo aberto. **ADR 0051.**
- `titan/reeds.ts` (`reedVariant`, pura): silhueta determinística pela célula; `TitanRenderer` usa 3 `InstancedMesh` (uma por silhueta, mesmo material e plano cruzado, só o UV muda). Mira, coleta, queda e save inalterados.
- Testes (`reeds.test.ts`): determinismo e proporção das três silhuetas na região de 64 × 64. Conferido de tarde e à noite a 740 × 360 (seed 42: 16 + 12 + 12 plantas).

## Orvalis v0.105.0 — Titã: grade 3 × 3 única e prévia com itens distribuídos (19/11/2026)
- **Pedido do dono do produto:** a grade é sempre 3 × 3 (a única). Decisões na **ADR 0050**.
- **Prévia de receitas:** uma célula por unidade pedida e o número em cada uma é o que o jogador tem repartido (`previewCells`: tem 12 → 3,3,3,3; tem 9 → 3,2,2,2; tem 3 de 4 → 1,1,1,0).
- **Grade 2 × 2 removida:** a montagem manual é a 3 × 3 no grupo **Bolsa**, sem exigir a Mesa; receita da Mesa montada fora dela fica bloqueada ("Precisa da Mesa de Trabalho", `takeBenchResult(at)` → `station`). Grupo "Montar 3 × 3" e botão "Receitas" saem. Posições 36–39 só leem saves antigos (`returnCraft`).
- Testes (`recipes/inventory/bench.test.ts`): prévia distribuída, Mesa montada sem estação, estação exigida, bolsa cheia. Conferido a 740 × 360.

## Orvalis v0.104.1 — Tablet: sem o aviso "digitando em tela cheia" ao usar a busca (19/11/2026)
- `ScreenMode`: ao focar um campo de texto dentro da tela cheia, sai dela (`exitFullscreen`); o `onGesture` já não a pede de novo com campo em foco, então não há laço com o teclado. O próximo toque fora do campo volta à tela cheia. Causa: busca de receitas do Titã (v0.102.0) no Safari do iPad. Teclado físico (WASD) em tela cheia pode ainda avisar — a registrar se ocorrer.

## Orvalis v0.104.0 — Titã: bancada 3 × 3 interativa e painéis de basalto (19/11/2026)
- **Pedido do dono do produto:** grade 3 × 3 interativa na Mesa de Trabalho e arte própria em basalto nos painéis. Decisões na **ADR 0049**.
- **Bancada 3 × 3:** com a mesa ativa (Usar/F) aparece o grupo **Montar 3 × 3**: nove espaços interativos (uma unidade por toque) e a saída com ícone, quantidade e nome; **Receitas** volta ao livro. Separada da grade pessoal 2 × 2. Quantidades **exatas** em qualquer disposição (`matchBench`, mesmo catálogo): lente, lanterna e **3 rochas → 6 lajes numa única retirada**; extra, errado ou faltando deixa a saída vazia.
- **Retirada atômica e revalidada** a cada toque (mesa, alcance, ingredientes e espaço); bolsa cheia ou mesa perdida preservam tudo. **Fechar devolve** a grade à hotbar/bolsa; o que não couber fica na grade e no save, com aviso. Saves anteriores abrem com a grade vazia (inventário gravado `v: 3`, sem mudar `TITAN_SAVE_VERSION`).
- **Basalto:** ladrilho 32 × 32 sem emenda (`scripts/make-titan-basalt.py`, carvão e violeta escuro, relevo discreto) na moldura e nos fundos dos painéis e da hotbar, com acabamento cobre fosco; âmbar só para seleção, foco e saída pronta; espaços lisos e calmos.
- Testes (`bench.test.ts`, +10): catálogo exato, uma unidade por toque, as três receitas e as lajes ×6, errado/extra/faltando, toque repetido, bolsa cheia, separação da grade pessoal, devolver ao fechar (parcial, sem perder nada), save v3 e saves anteriores, sessão (pendente sobrevive ao reabrir). Verificado no Chromium em celular emulado (740 × 360): as três receitas, ingrediente errado, toque repetido, bolsa cheia e mesa removida; capturas do livro e da bancada com saída válida. **Aparelho real pendente.**

## Orvalis v0.103.0 — Titã: céu com bruma direcional, noite mais escura e fria, estrelas e Saturno raro (19/11/2026)
- **Pedido do dono do produto:** céu mais rico em bruma e mais escuro à noite, com Saturno aparecendo raramente (um trecho dos anéis por alguns instantes, sempre no mesmo ponto do céu). Decisões na **ADR 0048**.
- **Cúpula em shader** (`render/titanSkyDome.ts`): mudar a hora continua sendo só uniforms (zero remalhagem). **Bruma direcional:** o nascer acende o leste, de dia o halo largo e suave acompanha o Sol (o núcleo segue o ponto quadrado), o poente guarda a última claridade ao pôr do sol, e o lado oposto ganha um ocre mais frio; duas faixas finas de bruma baixa derivam devagar.
- **Névoa na cor do céu daquele lado** (`horizonAt`): a costa distante some na cor do céu para onde se olha.
- **Noite:** ambiente 0,3 → 0,22 com luz **fria** (`tint`, `uAmbient` vira `vec3`); o cobre só é forte perto do crepúsculo; poucas estrelas fracas perto do zênite.
- **Saturno raro:** ~12% dos dias, uma janela de ~10 s em plena luz do dia, no mesmo ponto do céu (nordeste, ~35°); um trecho tênue dos anéis e um disco quase apagado, encobertos abaixo de certa altura. `session.days` vai no save (`header.days?`). `?hora=crepusculo` e `?saturno=1` para o teste visual.
- Testes (`sky.test.ts`, +7): lado da claridade, leste × oeste (manhã e crepúsculo), cobre do poente, noite escura e legível, estrelas, raridade e duração de Saturno, seed e hora do pico, dias no save; suavidade sem saltos inclui os novos campos. Verificado no Chromium (mesma câmera sobre o lago, leste e oeste em manhã, tarde, crepúsculo e noite, mais a imagem rara com Saturno). **Aparelho real pendente (leitura da bruma e das estrelas no celular).**

## Orvalis v0.102.0 — Titã: bolsa com livro de receitas numa tela só (hotbar de 9, ☰, bolsa 3 × 9) (19/11/2026)
- **Pedido do dono do produto:** manter o fluxo de fabricação da referência (9 espaços na hotbar, ☰ para a bolsa, categorias à esquerda, receitas no centro, ingredientes à direita) com arte da Margem Silenciosa. Decisões na **ADR 0047**.
- **Interface (fluxo da referência do dono do produto):** hotbar de **9** com o **☰** fora dos espaços (teclado 1–9, E); **grupos à esquerda** (Todas, Construção, Utilidades, Materiais e a **Bolsa** por último); **receitas no centro** (grade de ícones, busca e **Só fabricáveis**; bloqueadas selecionáveis, com selo); **à direita a grade de fabricação** com os ingredientes e **tenho / preciso** (2 × 2 na bolsa, 3 × 3 na mesa) e o **item final com nome**: **tocar nele fabrica**. O grupo Bolsa mostra os 27 espaços (3 × 9) e a grade 2 × 2 de verdade. As abas Itens/Receitas e os cartões saíram. Mesa: **Usar** abre a mesma tela com a estação ativa; fora do alcance ou mesa removida bloqueia a fabricação de bancada na hora.
- **Migração por seção (save v5):** os 7 espaços antigos da hotbar vão para 1–7 (8–9 vazios), os 24 da bolsa para o novo início da grade, 3 espaços novos vazios; seleção e grade 2 × 2 preservadas; inventário gravado como `v: 2`. A cápsula → brasa só vale para saves < v4.
- **Celular em paisagem:** com a bolsa aberta o toque do mundo some (sem girar câmera nem colocar/quebrar); a lista rola no painel central; o botão "Mochila" do toque saiu (o ☰ o substitui); o painel cabe em 360 px de altura. A busca é o único texto selecionável e os atalhos param enquanto se digita.
- Sem mudança de gerador, receitas ou regras de fabricação (`recipes.ts` ganhou só `group`).
- Testes: migração do inventário com a bolsa cheia de itens distintos em cada seção (formato e save), seleção preservada, reabrir estável; constantes do inventário nos testes antigos. Verificado no Chromium (celular emulado em paisagem: ☰, categorias, busca, Só fabricáveis, mesa → lanterna, laje ×6, Manual 2 × 2, sem erros; desktop: 1–9, E, digitar na busca sem atalhos, Esc). **Aparelho real pendente.**

## Orvalis v0.101.0 — Titã: Laje de Rocha, bloco de meia altura (segunda entrega de "Uma luz para voltar") (19/11/2026)
- **Pedido do dono do produto:** o teste da mesa em celular real passou; seguir para a segunda entrega. Decisões na **ADR 0046**.
- **Laje de Rocha:** bloco `T.SLAB` (12) e item 13; receita **3 blocos de rocha escura → 6 lajes na Mesa de Trabalho** (mesmo catálogo/fabricação atômica). Quebra em 1,0 s e devolve 1 laje; só de fundo; persiste como edição de chunk.
- **Física:** colisão por altura (`blockHeight`/`bodyHeight`), pouso no topo da laje, **degrau automático de 0,5 m** (sobe a laje andando; cubo inteiro a partir do piso continua barrando), cabeça livre por baixo; `canPlaceAt` por altura.
- **Mira e malha:** a mira acerta só a metade de baixo da célula (raio por cima segue para o que está atrás, contorno de meia altura); laterais de 16 × 8 px, topo em y + 0,5, culling por `isFull` (laje não esconde os vizinhos).
- Atlas de itens 64 × 64 com o ícone da laje (`scripts/make-titan-fabricacao.py`). Sem mudança de gerador, formato de save ou protocolo.
- Testes (+14): `slab.test.ts` (altura/oclusão, colisão, degrau, queda, degraus laje→cubo, cabeça, mira, colocar, malha, fabricar/colocar/quebrar/persistir, mochila cheia), receita e tempo de quebra. Verificado no Chromium (laje de tarde e de noite, andar de verdade contra a laje sobe o degrau, cartão "Laje de Rocha ×6" na mesa). **Aparelho real pendente.**

## Orvalis v0.100.1 — Titã: o junco de vidro agora se recolhe e cai como item (19/11/2026)
- **Relato do dono do produto:** ao mirar no junco de vidro o jogo quebrava o bloco de areia úmida embaixo dele e o junco sumia sem render nada.
- **Junco recolhível:** passou a ser alvo da mira (`ItemLookup`, como as lascas legadas; id `reed:x,y,z`) e se recolhe segurando 0,35 s (anel de recolhimento), rendendo 1 **Junco de vidro** (item 12, pilha de 64, ícone no índice 11 do atlas de itens). O bloco de baixo **não** é quebrado. Mochila cheia deixa a planta no lugar. A planta recolhida não renasce (o id fica em `collected`, já gravado no save).
- **Sem o apoio:** quebrar o bloco onde o junco está solta o junco como item no chão (drop persistente, coleta por proximidade) em vez de sumir.
- Item sem receita por ora (o prompt diz que o junco orienta a exploração e não é consumido pelas receitas); fica como material para a evolução. Sem mudança de gerador nem de formato de save (`drops` aceita o item 12).
- Testes (`fabricacao.test.ts`): mira acerta o junco e não o bloco, coleta, não renasce ao reabrir, mochila cheia, queda sem apoio persistente, partida legada. Verificado no Chromium (seed 42: alvo `reed:2,65,-20`, 1 junco na hotbar, areia úmida intacta).

## Orvalis v0.100.0 — Titã: "Uma luz para voltar" (livro de receitas, Mesa de Trabalho, brasa de âmbar e junco de vidro) (19/11/2026)
- **Pedido do dono do produto (primeira entrega do prompt "Uma luz para voltar"):** o jogador chega de mãos vazias, recolhe rocha, descobre a receita da mesa e fabrica a própria lanterna com materiais locais. Decisões na **ADR 0045**.
- **Receitas** (`titan/recipes.ts`): mesa (4 rochas, mochila), lente de gelo (1 fragmento de gelo, mesa) e lanterna (2 fragmentos de rocha + lente + brasa, mesa). Cartões com ícone, nome e quantidade, **possui/precisa**, estação e **Fabricar** (mochila: aba Receitas; mesa: painel da estação). Fabricação **atômica** (`Inventory.tryCraft`): capacidade calculada depois dos débitos, falha não muda nada e mostra o motivo; a grade 2 × 2 usa o mesmo catálogo. Descoberta derivada do estado (primeira rocha; save antigo com rocha ou mesa já reconhece).
- **Mesa de Trabalho 3D** (GLB do pacote, 96 triângulos, `InstancedMesh`): fabricável, colocável, persistente; mirar oferece **Usar** (botão no toque, F no teclado); sair do alcance ou perder a mesa fecha o painel; quebrar devolve a mesa se couber.
- **Gerador v4:** depósito de **brasa de âmbar** na areia úmida (brilho próprio, legível de dia), alcançável a pé, rende uma vez só (drop como a lasca do veio); **junco de vidro** em volta (balanço leve, sem colisão). Veios e reserva da v3 cobrem 4 rochas, 2 fragmentos de rocha e 1 de gelo. 1.000 seeds validadas. v1–v3 intactas.
- **Migração (save v4):** a cápsula remanescente (mochila ou grade) vira 1 brasa uma única vez; partida de gerador antigo sem brasa ganha o depósito por adição localizada (respeita edições, construções e o que já foi consumido); lanternas instaladas, terreno, posição, luz e drops pendentes preservados. Partida nova começa de mãos vazias; o id 7 (cápsula) fica reservado.
- Arte: `scripts/make-titan-fabricacao.py` (atlas de itens 64 × 48 com mesa, lente e brasa; tile 10 do terreno; junco) e `scripts/extract-titan-workbench.py` (GLB → JSON + atlas 60 × 40), tudo WebP sem perdas.
- Testes (+30): `recipes.test.ts` (catálogo, estação, falta de material, mochila cheia nos dois casos, ordem do débito, grade), `fabricacao.test.ts` (v4 em 1.000 seeds via `veins.test.ts`, mesa, brasa, descoberta, migração: cápsula na mochila e na grade, sem cápsula, brasa consumida, construção no candidato, lanterna já instalada; fluxo completo na seed 42), `inventory.test.ts` e `delivery2.test.ts` ajustados ao inventário vazio. Verificado no Chromium emulando celular em paisagem (toque no Usar, cartões, Fabricar) e no desktop (F, afastar-se, mesa removida), de tarde e de noite. **Aparelho real pendente.**

## Orvalis v0.99.0 — Titã: gerador v3 (veios naturais), lascas soltas e seleção de texto bloqueada (19/11/2026)
- **Pedido do dono do produto (etapa 3 de 3 do prompt "Interação, fragmentos e lanterna 3D"):** fragmentos como drops de veios naturais, fontes garantidas e persistência consistente. Decisões na **ADR 0044**.
- **Veios:** blocos `VEIN_ROCK`/`VEIN_FROST` (ids 8 e 9, linha 3 do atlas, `scripts/make-titan-veins.py`): rocha com marca mineral cobre e gelo com nervuras azuladas. Quebrar devolve o bloco inteiro e solta uma lasca; a fonte se consome (o veio some) e recolocar rocha/gelo põe o bloco comum, que não solta nada.
- **Gerador v3:** sem lascas pré-posicionadas; 3 veios de rocha e 3 de gelo nas formações, **alcançáveis a pé** (BFS por degraus de 1 bloco) e, se a busca natural falhar, **afloramento de reserva**. Em 1.000 seeds: 9 usam a reserva, todas com as duas fontes alcançáveis. v1 e v2 inalteradas.
- **Lascas soltas (drops):** sem colisão, coleta por proximidade (1,25 m), mochila cheia deixa no lugar com aviso; persistem em `header.drops` (`TITAN_SAVE_VERSION` 3), na mesma transação do inventário e das edições, sem duplicar ao reabrir (id `v:x,y,z`).
- **Correção:** pressionar e segurar no celular não vira mais seleção de texto (`user-select: none`, `-webkit-touch-callout: none`, `selectstart` cancelado).
- Testes: `titan/veins.test.ts` (12 + fluxo completo, mochila cheia, reabrir, falha de gravação, lote de 1.000 seeds e seeds de reserva), `generator.test.ts` parametrizado em v2/v3, `delivery2` fixado em v2 (legado), `mesher.test.ts` (atlas 4 × 3). Verificado no navegador (seed 42, v3): veio visível, quebra com rachaduras, lasca no chão, coleta por proximidade.

## Orvalis v0.98.0 — Titã: lanterna em modelo 3D e mira pela caixa do objeto (19/11/2026)
- **Pedido do dono do produto (etapa 2 de 3 do prompt "Interação, fragmentos e lanterna 3D"):** trocar a caixa-proxy âmbar pelo modelo 3D da Lanterna da Margem (pacote do Drive) e fazer a mira respeitar o objeto. Decisões na **ADR 0043**.
- **Modelo:** `assets-src/titan/lanterna/` (GLB, bbmodel, atlas 32 × 32) → `scripts/extract-titan-lantern.py` → `src/assets/titan-lantern.json` + `titan-lantern-atlas.webp` (sem perdas), exportados por `render/art/titan.ts`. 312 triângulos em dois lotes (estrutura 300, núcleo âmbar 12) desenhados por `InstancedMesh`: 2 chamadas para qualquer quantidade; mesmo shader do terreno, núcleo emissivo (igual de dia e de noite, hora não refaz nada).
- **Mesher:** a lanterna deixou de entrar na malha do terreno; o renderer refaz as instâncias só quando `TitanVolume.lanternVersion` muda. Save, gerador e protocolo inalterados (save com lanterna antiga abre com o modelo novo).
- **Mira (`titan/lantern.ts`):** raio × caixa 0,375 × 0,625 × 0,375 m com folga (mouse 4 cm, toque 14 cm); fora da caixa o raio passa e acerta o que há atrás; contorno com o tamanho do objeto; face de colocação pela entrada na caixa.
- Testes: `titan/lantern.test.ts` (caixa, `rayBox`, passagem do raio, folga de toque); `delivery2`/`sky` ajustados (a malha do terreno não tem mais as faces da lanterna). Verificado no navegador (`&hora=tarde` e `&hora=noite`) e na cena de 12 lanternas (+3 600 triângulos, +1 chamada, JS do desenho igual).

## Orvalis v0.97.0 — Titã: toque curto coloca, segurar quebra, com rachaduras progressivas (19/11/2026)
- **Pedido do dono do produto (etapa 1 de 3 do prompt "Interação, fragmentos e lanterna 3D"):** substituir a quebra instantânea por um gesto único. Decisões na **ADR 0042**; as etapas 2 (lanterna 3D e mira, aguardando o pacote de arte) e 3 (gerador v3 e drops) vêm em PRs próprios.
- **Gesto primário** (`titan/gesture.ts`, máquina de estados pura): `ARMED` → soltar antes de 200 ms, sem arrasto e com o mesmo alvo e face **coloca**; `CAMERA_DRAG` (> 10 px) entrega à câmera; `BREAKING` depois de 200 ms no mesmo bloco; `COMPLETED` com **uma ação por pressão** (soltar e pressionar de novo). O tempo é conferido também no `pointerup`/`mouseup` (carimbo do evento): uma pressão de 200 ms ou mais nunca vira colocação por quadro atrasado. Cancelam: ponteiro cancelado, perda de foco/captura, aba oculta, mochila aberta, troca de alvo, saída do alcance. Um segundo dedo em outro controle não interfere.
- **Tempos** (`titan/breaking.ts`): areia 0,6 s, gelo 1,2 s, rocha 1,6 s, lanterna e lasca 0,35 s (rocha-mãe e líquido não quebram). Progresso `(t − 200) / (total − 200)`.
- **Rachaduras:** 10 estágios de arte própria (`scripts/make-titan-cracks.py`, `src/assets/titan-cracks-16px.webp`) numa sobreposição reutilizável (`TitanRenderer.setCrack`, `polygonOffset`) que aparece aos 200 ms e sai no mesmo quadro de cancelamento/conclusão, **sem refazer malha de chunk**. Lanterna e lasca: anel discreto de recolhimento em volta da mira, sem rachaduras.
- **Controles:** botão primário do mouse e a **metade direita do toque** (zona morta de 10 px) fazem o mesmo gesto; **os botões Colocar/Quebrar e o clique direito deixam de existir**; joystick, Pular, Mochila e hotbar não mudam. Texto de ajuda atualizado.
- Testes (`titan/gesture.test.ts`, 23): tempos e estágios, fronteira 199/200 ms, quadro atrasado, arrasto, troca de alvo e de face, pressão mantida, falha por mochila cheia, segundo ponteiro, cancelamento externo, lanterna. Verificado no navegador (toque via CDP e mouse): ver `domains/titan.md`. Sem mudança de save, gerador ou protocolo.

## Orvalis v0.96.0 — Titã: ciclo simples de céu (dia de 20 minutos, ritmo do Minecraft) (19/11/2026)
- **Pedido do dono do produto:** depois da validação em aparelho real da luz (iPhone: 59,9 FPS estáveis, 0,4% de quadros acima de 33 ms), seguir com o ciclo simples de céu em 4 × 4 chunks e deixar o worker de malha em espera. Decisões na **ADR 0041**.
- **Relógio e save** (`titan/sky.ts`, `session.time`, `TitanHeader.time?`): dia de **20 minutos = 24 000 ticks a 20 ticks por segundo**, com as proporções do Minecraft (referência do dono do produto): dia 10 min, pôr do sol 1 min 30 s, noite 7 min, nascer do sol 1 min 30 s (substitui o dia de 8 minutos aprovado antes); partidas novas e saves antigos sem hora começam à **tarde** (tick 9 000, a 2 min 30 s do pôr do sol); a hora avança com o jogo ativo e para na tela de início e com a aba oculta; vai no save (campo opcional, sem subir a versão do save).
- **Céu:** manhã pêssego → tarde cobre e âmbar → noite carvão-violeta com cobre no horizonte, interpolados com suavidade (inclusive na meia-noite); **sol** em ponto quando alto; **névoa e fundo** seguem o horizonte; sprites de fragmento escurecem à noite.
- **Luz do dia como uniform, zero remalhagens:** a luz ambiente deixou de ficar gravada nos vértices. `col` = sombreado das faces; novo atributo `glow` = brilho de lanterna e emissão; o shader calcula `textura × (col × uAmbient + glow)` (`titanRenderer.patchDayLight`). Mudar a hora não refaz seção nenhuma (164 → 164 ao percorrer o dia) e a luz da lanterna não depende dela.
- **Teste:** `?hora=manha|tarde|noite` congela só a visualização (substitui o `?hora=noite`, que só baixava a luz ambiente); a hora do jogo segue correndo e é a gravada; sem o parâmetro volta a hora do save.
- **Medições registradas** em `domains/titan.md`: emulador 204 → 12,3 ms e, com o ciclo rodando, 12,9 ms; iPhone real 59,9 FPS e malha do quadro 3,0 ms na cena de 12 lanternas; pico de 135 ms com causa em aberto.
- Testes (`titan/sky.test.ts`): dia de 20 min, proporções e fronteiras das fases em ticks, tarde = visual anterior com platô, pôr do sol gradual e noite estável, manhã/noite, transições sem salto (0,25 s de passo), sol só quando alto, `?hora=`, hora no save, save antigo e hora inválida → tarde, malha sem luz ambiente e `glow` da lanterna. Verificado no navegador (celular emulado): relógio parado no início e avançando ao jogar, hora gravada e restaurada, hora forçada não gravada, save sem hora → tarde, cena de 12 lanternas com o ciclo rodando sem perda de desempenho.

## Orvalis v0.95.3 — Titã: relatório de desempenho legível na tela do celular (19/11/2026)
- **Pedido do dono do produto:** só dá para testar no celular, então o relatório precisa aparecer na tela para tirar print (antes o toque no painel só copiava o JSON para a área de transferência).
- **Painel `?fps=1` (`dev/perfHud.ts`):** tocar nele abre o relatório na tela (`formatReport`, puro): FPS estável e 5% piores, quadros acima de 33/50 ms, GPU, memória, JS do desenho e, no Titã, a tabela por etapa (luz, malha, geometria, malha do quadro, desenho) com média/p95/máx/n, mais o aparelho e a URL; cabe em ~320 px de altura. Botões **Atualizar**, **Copiar JSON** (se a área de transferência não liberar, o JSON aparece selecionado) e **Fechar**. Vale também para o Mundo principal (`?fps=1`).
- Testes (`titan/perf.test.ts`): números principais primeiro, tabela do Titã, sem linhas vazias, no máximo 18 linhas de até 100 colunas, aviso antes dos 8 s estáveis. Sem mudança de gameplay, save, gerador ou protocolo.

## Orvalis v0.95.2 — Titã: luz incremental (edição perto de lanterna sem engasgo) (19/11/2026)
- **Motivo:** a medição da v0.95.1 mostrou que cada edição perto de uma lanterna refazia 28–37 seções (caixa cega de ±15 blocos) e recalculava o mapa de luz inteiro: ~28 ms com 1 lanterna e ~204 ms com 12 a CPU 4× mais lenta.
- **Motor de luz incremental (`titan/light.ts`):** `LightStore` (4 bits por célula, 2 KB por seção) e `LightEngine` com **fila de remoção e fila de adição** (tirar uma lanterna perto de outra devolve a luz da outra; editar perto de 12 lanternas custa quase o mesmo que perto de 1). O primeiro uso faz o cálculo completo; depois só se propaga o que muda. `computeLight` (completo) fica como referência dos testes.
- **Invalidação cirúrgica (`TitanVolume`):** só as seções das células cuja luz realmente mudou refazem a malha (mais as vizinhas quando a célula está na borda). A seção editada continua no mesmo quadro (`takeTouched`); as que só mudaram de luz saem em `takeLightTouched` e o renderer as refaz com orçamento de tempo por quadro.
- **Resultado (mesma cena, `?cena=lanternas`, Chromium emulando celular):** refazer malhas por edição 28 → 3 ms (1 lanterna) e 204 → 12 ms (12 lanternas, CPU 4× mais lenta); seções refeitas por edição ~28–37 → ~3–4; FPS estável a CPU 4× mais lenta 5–12 → 52–53. Falta confirmar no aparelho real.
- Testes (`titan/light.test.ts`): armazenamento de 4 bits nas bordas, **equivalência com o cálculo completo após 400 edições aleatórias**, luz de outra lanterna devolvida, poucas seções por edição, nenhuma seção de luz fora do alcance, borda de seção, separação entre seção editada e só-luz. Sem mudança de save, gerador, gameplay nem protocolo; ADR 0040 ganhou a revisão.

## Orvalis v0.95.1 — Titã: medição por etapa e cena de lanternas para o aceite em aparelho (19/11/2026)
- **Pedido do dono do produto:** fechar o aceite da entrega 2 em celular real com uma medição de desempenho no mesmo teste, e medir **antes** de mover trabalho para workers.
- **Painel `?fps=1` no Titã:** o painel existente (`dev/perfHud.ts`, ganhou o gancho opcional `PerfExtra`) agora mostra e copia, além de FPS/GPU/memória, o tempo de cada etapa: `luz`, `malha`, `geometria`, desenho com e sem malha nova (`titan/perf.ts`, instrumentação em `titanRenderer.ts` e em `TitanVolume.onLightMs`).
- **Cena `?cena=lanternas&n=12`** (`titan/scene.ts`): `n` lanternas com uma parede ao lado, seed 42, **sem gravar** (armazenamento em memória) e botão "Editar sem parar" que estressa luz e malha. Necessária porque a partida normal só tem uma cápsula e a receita a consome.
- **Primeira medição** (Chromium emulando celular, `domains/titan.md`): o desenho e a GPU são baratos; o custo é refazer ~28–37 seções por edição perto de uma lanterna (~28 ms com 1 lanterna; ~113 ms a CPU 4× mais lenta) e o BFS de luz (1,5–27 ms). Recomendação registrada: invalidar só o que mudou e medir de novo antes de qualquer worker.
- Docs: `OPERATIONS.md` (como medir), `domains/titan.md` (roteiro de aceite e tabela), `NEXT_STEPS.md` (decisões confirmadas, ordem do trabalho, pendências do site e das seeds). Sem mudança de gameplay, save, gerador ou protocolo. Testes: `titan/perf.test.ts` (estatísticas, cena determinística, "editar sem parar" reversível, luz recalcula só quando muda).

## Orvalis v0.95.0 — Titã, entrega 2: inventário, fragmentos à mão e lanterna (19/11/2026)
- **Pedido do dono do produto (briefing §4):** hotbar, mochila e fragmentos recolhíveis à mão; receita opcional da lanterna; lanterna que ilumina, pode ser recuperada e mantém o estado no save. Decisões na **ADR 0040**.
- **Inventário (`titan/inventory.ts`, `items.ts`, `actions.ts`):** hotbar de 7 + mochila de 24 (tecla E ou botão "Mochila") + grade 2 × 2; blocos e fragmentos até 64, cápsula e lanterna até 1; ícones do atlas da hotbar (`src/assets/titan-hotbar-sprites-16px.webp`, WebP sem perdas). Começa só com a cápsula; quebrar bloco devolve o bloco (se couber); colocar gasta 1; sem descarte.
- **Fragmentos de superfície:** 3 lascas de rocha e 3 de gelo sobre as formações, ids determinísticos, sprites no mundo, mira que as alcança, recolhidas à mão; mochila cheia deixa a lasca no lugar; ids recolhidos no save.
- **Lanterna:** receita cápsula + fragmento de rocha + fragmento de gelo (botão da receita ou à mão); objeto colocável, luz 15 (−1 por célula, bloqueada por sólidos) no brilho dos vértices, recuperável; estado = posição (edição de chunk). `?hora=noite` (teste) baixa a luz ambiente.
- **Gerador v2** (`GENERATOR_VERSION` 2): formações só em terreno plano (a v1 deixava lascas inalcançáveis na seed 5). A v1 continua disponível e idêntica: partidas antigas não mudam.
- **Save v2** (`TITAN_SAVE_VERSION` 2): `games.inventory` com mochila, grade e fragmentos recolhidos, na mesma transação dos chunks (e das lanternas); revisão do inventário confirmada separada da dos chunks. Save da v1 abre com a cápsula.
- Testes (`titan/inventory.test.ts`, `delivery2.test.ts`, `generator.test.ts`): empilhar, mochila cheia (tudo ou nada), receita em qualquer disposição, coleta/ids/reabertura, lasca e bloco com mochila cheia, luz (15, −1, parede, malha refeita), lanterna salva/reaberta/recuperada, save da v1, edição de inventário durante a gravação, v1 preservada. `tsc`, suíte e build verdes. Verificado em navegador (celular emulado em paisagem, IndexedDB real): coletar → receita → lanterna → colocar → salvar → reabrir → recuperar.

## Orvalis v0.94.1 — Titã: persistência durante o save e construções altas ao reabrir (19/11/2026)
- **Correção 1 — edição durante a gravação não se perde:** o chunk era marcado limpo quando a transação terminava, mesmo que tivesse sido editado de novo no meio dela (o segundo bloco sumia ao reabrir). `TitanVolume` agora guarda uma **revisão por chunk**; `dirtyChunks()` devolve a revisão do instante da cópia e `markClean` só limpa a revisão confirmada. A edição posterior continua pendente, a interface mostra "alterações pendentes…" (em vez de "salvo ✓") e a próxima gravação automática a grava; o movimento do jogador durante a gravação também continua pendente.
- **Correção 2 — construção alta aparece ao reabrir:** a fila inicial de malhas era calculada só pela altura do relevo natural, então um bloco restaurado acima dele (ex.: Y = 150) ficava invisível com colisão ativa. A fila virou `titan/sections.ts` (`initialSections`: relevo + `TitanVolume.editedSections()`, com as seções vizinhas das bordas).
- Testes (`titan/session.test.ts`): gravação atrasada com segundo bloco no mesmo chunk (reabre só com o confirmado; depois da próxima gravação, os dois), `markClean` por revisão, e construção em Y = 150 salva/reaberta com fila, malha e colisão. Sem mudança em `TITAN_SAVE_VERSION`, `GENERATOR_VERSION`, `SAVE_VERSION` ou `PROTOCOL_VERSION`; formato do banco igual.

## Orvalis v0.94.0 — Titã: costa voxel jogável e persistente (19/11/2026)
- **Pedido do dono do produto (briefing "Titã"):** primeira entrega do mundo `?mundo=titan` — costa voxel em primeira pessoa, editável e salva. Decisão registrada na **ADR 0039**.
- **Entrada:** perfil `titan` registrado em `world/profiles.ts`; `main.ts` abre `src/titan/titanGame.ts` em vez do `Game` (sem `World`, sem `SUBDIV`, sem sala). Principal e Santuário abrem como antes (conferido no navegador).
- **Volume e gerador (`src/titan/`):** células por `(x, y, z)`, Y −64..319, seções de 16³; gerador versionado (`GENERATOR_VERSION` 1) com heightmap e lago da seed, chegada seca com clareira 6 × 6, duas formações (rocha e gelo) reservadas para a coleta; região 4 × 4 chunks.
- **Edição e física:** coloca (esquerdo) e remove (direito) pela face apontada; o líquido da bacia é deslocado e volta; rocha-mãe e fora da região intocáveis; pulo de 1 bloco; mira por células.
- **Save:** IndexedDB `orvalis-titan`, cabeçalho + jogador + chunks sujos na mesma transação, retomada sem `?seed=`, posição segura se obstruída, falha de gravação preserva o último estado.
- **Visual:** atlas de 16 px do dono do produto (`src/assets/titan-atlas-16px.webp`, WebP sem perdas), malha por seção, luz de tarde fixa, névoa âmbar, céu em degradê, hotbar de 4 blocos; toque básico (joystick, olhar, botões) ainda não validado em aparelho real.
- Testes: `src/titan/*.test.ts` (38). `tsc`, 753+ testes verdes. `package.json` 0.94.0. Sem mudança em `SAVE_VERSION`, `PROTOCOL_VERSION` ou no gerador do Mundo.

## Orvalis v0.93.169 — Santuário: 4 acampamentos com 28 goblins e roupas de várias cores (18/11/2026)
- **Pedido do dono do produto:** mudar a cor da roupa de alguns goblins e incluir 3 fogueiras com 7 goblins cada uma no vale (mais goblins no cenário).
- **Mundo (`world/sanctuaryValeGoblin.ts`):** 3 acampamentos extras (`VALE_EXTRA_FIRES`) em clareiras planas do piso do vale (nível 2, sem trilha nem rocha; escolhidas varrendo `valeHeights`), cada um com fogueira, clareira de terra batida, caixa e barris e os mesmos 7 pontos de nascimento do acampamento original (`VALE_CAMP_OFFSETS`). `valeGoblinCamps()` devolve os 4 acampamentos; `valeGoblinHomes()` agora lista os 28 pontos. O acampamento original e o resto do vale não mudaram.
- **Atores (`game/valeGoblins.ts`):** `ValeGoblins` cria 28 goblins, 7 por fogueira; cada acampamento vive por conta própria (`crew` = os 7 dele: conversa, duelo, sentar e mexer na fogueira só entre eles, olhando a fogueira do próprio grupo). Só andam os de chunks carregados, como antes.
- **Roupas (`render/three/isoGoblins.ts`):** o extrator marca a parte do modelo (`part: head | body | clothes`); o traje ganha 1 de 5 paletas (`GOBLIN_STYLES`, giro de matiz no shader com uniforme por material; o verde da pele e os tons claros da camisa ficam como estão). Cerca de metade dos goblins mantém a cor original; cada acampamento mistura ao menos 4 paletas (`STYLE_OF`). `GoblinView.style`.
- Testes: 4 acampamentos (fogueira, 7 pontos pisáveis no nível 2, clareira plana, distância entre eles), alcance a pé de cada fogueira a partir do nascimento, 28 goblins com grupos certos, mistura de paletas. `tsc`, 715 testes e build verdes; conferido no navegador (os 4 acampamentos, goblins de roupas azul, magenta, verde, roxa). Sem mudança de save/protocolo; `package.json` 0.93.169.
- **Atenção:** são 28 goblins de 17 mil triângulos (só os de chunks carregados são desenhados); falta medir o desempenho em celular real.

## Orvalis v0.93.168 — Santuário: goblin musculoso e textura mais escura (18/11/2026)
- **Pedido do dono do produto:** mais músculos no goblin e textura um pouco mais escura (`Goblin_Orvalis_Musculoso.glb`: mesma estrutura do modelo anterior — 4 grupos, 10 756 vértices, 17 268 triângulos, mesmo esqueleto de 26 ossos —, com pele em verde-musgo escuro e atlas `Goblin_Verde_Escuro_BaseColor_2K`).
- Troca direta: `scripts/extract-iso-goblin.py` lê o GLB novo (substitui o `Corpo_Refinado` em `assets-src/iso-set/goblin/`; `Previa_musculoso.png` fica de referência) e regera `iso-goblin.json` (947 KB), `iso-goblin.webp` e `iso-goblin-hair.webp`. Nenhum código mudou.
- `tsc`, 713 testes verdes; conferido no navegador (parado e duelo). Sem mudança de save/protocolo; `package.json` 0.93.168. O `Corpo_Goblin_Musculoso_T_Pose.glb` (base nua em T) e o `.blend` não entram no jogo.

## Orvalis v0.93.167 — Santuário: goblin com o corpo 3D refinado (18/11/2026)
- **Pedido do dono do produto:** atualizar o NPC goblin com o 3D refinado (`Goblin_Orvalis_Corpo_Refinado.glb`: corpo esculpido, cabeça com cabelo próprio e traje; 10 756 vértices e 17 268 triângulos, contra 3 455 e 3 000 do modelo anterior).
- **Mesmo esqueleto** (26 ossos, posições e hierarquia idênticas — conferido osso a osso): a caminhada, as poses sociais, a adaga e o duelo continuam valendo sem mudança de código de pose.
- **Malha em 4 grupos/materiais** (`scripts/extract-iso-goblin.py` agora junta as 4 primitivas do GLB): crânio e traje com o atlas `base_rgb` (1024), **cabelo** com a pintura própria (512, `iso-goblin-hair.webp`) e **pele em cor de vértice**. `IsoGoblins` cria a `SkinnedMesh` com um material por grupo (mesmo sombreado fixo por normal); `IsoGoblinArt` ganhou `hair`, `art/types.ts`/`santuario.ts`/`blockArt.ts` carregam a textura nova. `iso-goblin.json` passou de 263 KB para ~950 KB.
- Teste da malha atualizado (grupos cobrem índices e vértices sem buraco; só a pele tem cor de vértice). `tsc`, 713 testes e build verdes; conferido no navegador (parado, golpe e duelo). Sem mudança de save/protocolo; `package.json` 0.93.167. O `Corpo_Goblin_Orvalis_T_Pose.glb` (base nua em T) e os `.blend` não entram no jogo.

## Orvalis v0.93.166 — Santuário: adaga nas mãos dos goblins e ataques com efeito (18/11/2026)
- **Pedido do dono do produto:** colocar a adaga do goblin (`Adaga_Goblin_Orvalis.glb`) na mão direita dos goblins e incluir movimentos de ataque com algum efeito.
- **Adaga:** `scripts/extract-iso-dagger.py` → `src/assets/iso-dagger.json` (1560 vértices, 4 materiais em cor de vértice, origem no cabo, lâmina em +y). `IsoGoblins` a prende ao osso `hand.R` (a lâmina segue o antebraço, fio para a frente) e a adaga acompanha a mão em qualquer pose; sombreado fixo próprio (o `MeshBasicMaterial` só calcula normal com pele/envmap, então a normal vem do atributo). Arte pelo mesmo caminho do goblin (`art/santuario.ts` → `blockArt.ts`).
- **Pose (`goblinPose.ts`):** `fight` (postura de luta: agachado de leve, adaga à frente, braço esquerdo em guarda), `swing` (golpe 0…1: arma para cima e para trás, golpeia à frente e abaixo com torção do tronco e passo; `SWING_WINDUP/HIT/END`) e `parry` (defesa: ergue a adaga).
- **Comportamento (`valeGoblins.ts`):** dois comportamentos novos — **treino** (golpes no ar, sozinho, de frente para a fogueira) e **duelo de treino** (dois vizinhos se encontram a 1,3 célula, se alternam golpeando e aparando; ninguém se fere: o golpe vira defesa). `GoblinView` ganhou `fight/swing/parry/spark`. Sem dano nem combate de verdade.
- **Efeitos (`isoGoblins.ts`):** rastro do golpe (faixa em arco branco-azulada que varre da posição armada até a frente e some) e **faíscas** no choque das adagas (bolinhas douradas com gravidade, só no duelo).
- Testes: pose do golpe (armar acima/atrás, varrer à frente/abaixo, volta à postura), postura e defesa, malha da adaga; no comportamento, treino e duelo ocorrem em 3 min, duelo sempre em par, um golpeia por vez, faíscas só no duelo. `tsc` e 713 testes verdes; conferido no navegador (postura, armar, golpe, choque). Sem mudança de save/protocolo; `package.json` 0.93.166.

## Orvalis v0.93.165 — Santuário: goblins com movimento fluido e vida social (18/11/2026)
- **Pedido do dono do produto:** movimento mais fluido na caminhada e socialização entre os goblins (sentar e abaixar, mexer na fogueira, correr) e melhorar a posição parado (braços abertos da pose A do modelo).
- **Pose (`render/three/goblinPose.ts`):** `pose(bones, GoblinPoseParams, time)` com `walk`, `run`, `sit`, `stoke`, `talk` e `look`. Braços agora pendem junto do corpo também parado (a pose A tem os braços ~33° abaixo da horizontal: descem ~0,9 rad, ombros caem um pouco); respiração, balanço de peso e olhar. Caminhada mais fluida: joelho dobra com curva suave (sem corte), balanço do corpo corrigido (sobe com as pernas juntas), pé acompanha o chão, balanço lateral do quadril. **Corrida:** passada e braços maiores, cotovelos a 90°, tronco inclinado. **Sentado:** joelhos para cima, pés planos, mãos nos joelhos. **Agachado:** coxa na horizontal, braço direito cutuca a fogueira. **Conversa:** falando gesticula com os braços e a cabeça; ouvindo acena.
- **Comportamento (`game/valeGoblins.ts`):** máquina de estados por goblin (parado, caminhar/correr até um ponto com ação ao chegar, sentar, agachar, esperar visitante, conversar), sempre dentro de 4 células do nascimento e no mesmo nível; só um goblin mexe na fogueira por vez; a conversa é combinada entre dois vizinhos livres (o visitante vem, o outro espera e se vira; alternam falas por temporizador; abortam se um trava); aceleração/freada suaves, giro suave e **separação** entre goblins. Tudo determinístico pela semente. `GoblinView` ganhou `run/sit/stoke/talk/look`.
- Testes novos (poses: braços pendendo, sentar/agachar com pés no chão, cutucar, corrida, gesto, olhar; comportamento: todos os estados ocorrem em 3 min, conversas sempre em par, sem sobreposição, determinismo). `tsc` e 710 testes verdes; poses conferidas no navegador (frente e perfil). Sem mudança de save/protocolo; `package.json` 0.93.165.

## Orvalis v0.93.164 — Santuário: goblin com pintura vibrante (18/11/2026)
- **Pedido do dono do produto:** atualizar o pacote de texturas do goblin para a **pintura vibrante** (`Goblin_Orvalis_Pintura_Vibrante.glb`: mesma malha de 3455 vértices e mesmo rig de 26 ossos; só muda a cor base 2K — verde mais vivo, calça roxa; ORM e normal não são usados, a cena não tem luzes).
- `scripts/extract-iso-goblin.py` lê o GLB novo (`assets-src/iso-set/goblin/`, substitui o `Refinado`; `Prancha_pintura_vibrante.png` fica como referência) e regera `iso-goblin.json`/`iso-goblin.webp` (165 KB). Nenhum código mudou.
- `tsc` e testes verdes; conferido no navegador. Sem mudança de save/protocolo; `package.json` 0.93.164.

## Orvalis v0.93.163 — Santuário: goblin refinado (18/11/2026)
- **Pedido do dono do produto:** trocar o goblin pelo **modelo refinado** (`Goblin_Orvalis_Refinado.glb`; o pacote traz também o `.blend` da escultura de acabamento, não usado no jogo).
- Mesmo rig (26 ossos) e mesma malha de jogo (3455 vértices, 3000 triângulos): troca direta — `scripts/extract-iso-goblin.py` agora lê `assets-src/iso-set/goblin/Goblin_Orvalis_Refinado.glb` (substitui o `Goblin_Orvalis_Palmas.glb`) e regera `iso-goblin.json`/`iso-goblin.webp`; o `Comparativo_refinado.png` fica ao lado como referência. Nenhum código de render/caminhada mudou.
- `tsc` e 701 testes verdes; conferido no navegador (goblins do Vale com o visual novo). Sem mudança de save/protocolo; `package.json` 0.93.163.

## Orvalis v0.93.162 — Santuário: goblin com palmas e juntas melhoradas (18/11/2026)
- **Pedido do dono do produto:** trocar o goblin pela versão com **palmas das mãos e juntas melhoradas** (`Goblin_Orvalis_Palmas.glb`: mesma malha de 3455 vértices e 3000 triângulos, agora com **26 ossos**: entraram as orelhas, `ear_base`/`ear_tip` L e R; palmas voltadas para as coxas na pose A).
- `scripts/extract-iso-goblin.py` lê o GLB novo (`assets-src/iso-set/goblin/Goblin_Orvalis_Palmas.glb`, no lugar do anterior) e regera `iso-goblin.json` (263 KB) e `iso-goblin.webp`; o script passou a achar os nós do esqueleto e da malha pelo nome (os índices mudaram).
- `goblinPose.ts`: as **orelhas balançam** de leve a cada passo (osso da ponta atrasa em relação à base); o resto da caminhada não mudou (os deltas são no espaço do modelo, então valem com a pose nova das mãos).
- Testes: 26 ossos (com orelhas) e `ibm` de 26 matrizes; `tsc` e 701 testes verdes; conferido no navegador (goblins andando, braços junto ao corpo). Sem mudança de save/protocolo; `package.json` 0.93.162.

## Orvalis v0.93.161 — Santuário: os goblins do Vale andam (rig + caminhada) (18/11/2026)
- **Pedido do dono do produto:** com o rig do goblin enviado (`Goblin_Orvalis_Rig.glb`: malha única de 3455 vértices, 22 ossos), incluir o movimento de caminhada.
- **Rig no jogo:** `scripts/extract-iso-goblin.py` agora lê o GLB com rig → `src/assets/iso-goblin.json` (posições, normais, UV, ossos e pesos por vértice, ossos de repouso e inversas de bind; 262 KB) + `iso-goblin.webp` (cor base 1024). A animação de teste do GLB não é usada: a caminhada é **procedural** (`render/three/goblinPose.ts`, `GoblinPoser`): rotações no espaço do modelo por osso (coxas, joelhos, pés, braços que descem da pose A e balançam ao contrário, cotovelos, torção do quadril e do tronco, subida do corpo a cada passo, respiração parado), com mistura suave parado ↔ andando.
- **Render:** `render/three/isoGoblins.ts` monta uma `THREE.SkinnedMesh` por goblin (esqueleto próprio; geometria, textura e material compartilhados); o sombreado fixo por normal agora é injetado no `MeshBasicMaterial` (espaço da câmera), então acompanha a pele e o giro. `RenderOptions.goblins` (`GoblinView`: posição, altura dos pés, giro, mistura e fase de caminhada) alimenta o renderer; o 2D/Santuário antigo o ignora.
- **Lógica:** `game/valeGoblins.ts`: `ValeGoblin extends Walker` (colisão por `World.standHeight`, não sobe degraus) — parado olhando para a fogueira; de vez em quando escolhe um ponto a até 4 células do nascimento e anda até lá (virando-se), parando se bater em algo; fase de caminhada pela distância (1 ciclo = 1,2 célula). Determinístico (sorteio pela semente). Só andam os de chunks carregados. `Game` os cria só no Santuário.
- **Saem os blocos:** `Block.ISO_GOBLIN` (v0.93.160) foi removido (id 98 livre de novo); os pontos de nascimento vêm de `valeGoblinHomes()` (`sanctuaryValeGoblin.ts`, `VALE_ORIGIN`).
- Testes novos: pose (pés alternados, braços ao contrário, quaternions unitários, pés no chão, passo ~0,8 da altura), malha e pesos do rig, goblins (nascem em volta da fogueira, andam até 4 células, determinismo, só em chunk carregado). `tsc` e 701 testes verdes; conferido no navegador (goblins andando, braços junto ao corpo). Sem mudança de save/protocolo; `package.json` 0.93.161.
- Limites: sem combate nem interação; não desviam da Deusa (passam por ela); só andar e ficar parado (sem animação de ataque, correr ou virar); a mesma pose para todos (sem variação de passo).

## Orvalis v0.93.160 — Santuário: os goblins 3D no Vale Goblin (18/11/2026)
- **Pedido do dono do produto:** adicionar o goblin no Vale usando o modelo 3D criado (Blender, pose A, 50 peças, 3000 triângulos; GLB leve + GLB PBR 2K).
- `scripts/extract-iso-goblin.py`: `assets-src/iso-set/goblin/Goblin_Orvalis_Pose_A.glb` (+ `Goblin_BaseColor_2K.png` extraída do GLB PBR) → `src/assets/iso-goblin.json` (3455 vértices fundidos por UV, altura 1, 194 KB) e `iso-goblin.webp` (cor base 1024 × 1024, 128 KB). Normal e rugosidade do pacote não são usadas (a cena não tem luzes).
- **Bloco novo** `Block.ISO_GOBLIN` (id 98, objeto sólido, não colocável: só nasce no mapa) nas 7 posições do pacote (`VALE_GOBLINS`) em volta da fogueira. `render/three/isoGoblins.ts` (`IsoGoblins`, como as cercas e o caldeirão 3D): uma malha por goblin, **olhando para a fogueira mais próxima** (8 direções; o sombreado fixo por normal é calculado por direção), textura = o atlas do modelo; altura `GOBLIN_HEIGHT` = 1,5 célula (~0,7 da Deusa, medido na tela).
- Estático: sem animação, combate nem movimento (o Santuário é solo, sem monstros). Seleção/quebra pela célula (qualquer bloco quebra em 1 s).
- Testes novos (`isoGoblins.test.ts`; goblins no vale em `sanctuaryValeGoblin.test.ts`); `tsc` e 695 testes verdes; conferido no navegador (goblins em volta da fogueira, olhando para ela). Sem mudança de save/protocolo; `package.json` 0.93.160.

## Orvalis v0.93.159 — Santuário: o Vale Goblin passa para o norte do original (18/11/2026)
- **Pedido do dono do produto:** mudar os chunks de lugar para a entrada da caverna coincidir. O vale saiu do leste da Fazenda e ficou ao **norte do bloco original** (`cx −2..1`, `cy −6..−3`): a plataforma da caverna (borda sul do vale, x 8..11) encosta na borda norte do original (y = −32), com um degrau de 1 cubo (piso 3 → planície 2). Os x do pacote são os do mundo.
- Limites 8 × 8 chunks (`cx −2..5`, `cy −6..1`, 64 chunks); o canto sem bloco (ao norte da Fazenda, `cx 2..5`, `cy −6..−3`) tem chão **VOID** (`SanctuaryLandscape.cellAt` devolve VOID fora dos blocos; `generateChunk` põe o chão por célula). Faixa x 6..13 junto à borda norte do original sem árvores, arbustos nem flores.
- Testes: do ponto de nascimento (0, 0) dá para ir a pé até a fogueira do vale pela caverna (passos de 1 nível); canto VOID não pisável nem constrói; contagens de limites (64 chunks) atualizadas. Conferido no navegador (plataforma encostando na planície). `tsc` e 693 testes verdes; sem mudança de save/protocolo; `package.json` 0.93.159. ADR 0038 revisado.
- Limite: o canto VOID aparece como fundo escuro com grade (não o céu degradê das bordas comuns).

## Orvalis v0.93.158 — Santuário: Vale Goblin (18/11/2026)
- **Pedido do dono do produto:** criar mais um espaço no mundo Santuário, o **Vale Goblin**, a partir do terreno enviado (`seed.json`, 64 × 64 células, alturas 2–32, caverna na borda sul, fogueira e 7 goblins). Decisões no **ADR 0038**.
- **Mundo 12 × 4 chunks** (`cx −2..9`): o vale ocupa `cx 6..9`, a leste da Fazenda (`profiles.ts`, `sanctuaryLandscape.ts`). A Deusa continua nascendo na origem.
- `scripts/make-vale-goblin-data.py` → `world/valeGoblinData.ts`; `world/sanctuaryValeGoblin.ts` (função pura): chão do vale = planície de 2 cubos; terraços de grama 3–14 → 2–6 (alisados, degrau de 1); rocha 15–32 → 7/8; trilha = Caminho de Terra; **túnel da caverna** (piso 3, dois níveis livres, teto de rocha) ligando a trilha do vale à plataforma externa com lampiões; fogueira, 2 barracas, caixa e barris; árvores (carvalho + as 12 do conjunto), arbustos e pedras.
- Pacote guardado em `assets-src/santuario-vale-goblin` (dados, prévias, LEIA-ME); o `terreno.glb` (malha 3,9 MB) não foi guardado.
- Testes novos (`sanctuaryValeGoblin.test.ts`): dados, conversão e degraus, determinismo e pilha ≤ 8, fogueira e goblins em chão livre, e **caminho a pé da fogueira até a plataforma externa pela caverna**; contagens de limites (48 chunks, `x ≤ 159`) atualizadas. `tsc` e 693 testes verdes; conferido no navegador (acampamento, terraços, plataforma da caverna). Sem mudança de save, protocolo ou servidor; `package.json` 0.93.158.
- Limites: goblins só como dados (sem monstros no Santuário); sem passagem pronta Fazenda → vale (a caverna abre na borda sul do mundo; dá para cavar); a compressão do relevo perde a altura real das montanhas; posição das barracas aproximada.

## Orvalis v0.93.157 — Santuário: Caldeirão de Pedra 3D (18/11/2026)
- **Pedido do dono do produto:** incluir no Santuário o caldeirão novo (GLB do Blender, 2757 quadriláteros, 3 pés e 2 alças) no lugar do que já havia, com a textura da **Pedra Rachada**.
- `scripts/extract-iso-cauldron.py`: `assets-src/iso-set/caldeirao/Caldeirao_Orvalis_3k.glb` → `src/assets/iso-cauldron.json` (2755 vértices fundidos, 5514 triângulos, 132 KB; em células, base em 0, 1,05 de largura com as alças). A textura pintada do GLB não é usada.
- `render/three/isoCauldrons.ts` (`IsoCauldrons`, como `IsoFences`): uma malha por caldeirão, no nível da pilha em que está; textura = a da Pedra Rachada do Mundo (`textures.groundTop`), UV por projeção em caixa (sem costura), sombreado fixo por normal (a cena não tem luzes). O sprite do Mundo some no Santuário (`worldSpriteArt`); seleção/quebra seguem pela célula (`cellOf`). Regras (estação de cozinha, luz do fogo, blocos) não mudaram: continua o `Block.CAULDRON`.
- **Tamanho (pedido do dono do produto, 18/11/2026):** primeiro 6× (2× e mais 3×), grande demais; depois metade da altura do personagem (pequeno); ficou em **3/4 da altura do personagem**: a Deusa (do halo aos pés) mede 371 px na tela e o caldeirão 143 px a 1×, então `CAULDRON_SCALE = 1,95` (278 px, ~2 células de largura). A textura repete a cada 0,4 da malha (~0,8 célula).
- Ícone novo (`icon-iso-cauldron.webp`, renderizado da própria malha) só no Santuário; o Mundo segue com o sprite.
- `tsc` e testes verdes (novo: `isoCauldrons.test.ts`); conferido no navegador. Sem mudança de save/protocolo; `package.json` 0.93.157. O caldeirão 3D mostra o cubo de seleção (como as cercas 3D), não o contorno do objeto da v0.93.154.

## Orvalis v0.93.156 — Santuário: 4 espécies de árvores × 3 tamanhos no mapa e na hotbar (18/11/2026)
- **Pedido do dono do produto:** incluir as árvores das 4 pranchas (bétula, cerejeira, macieira e carvalho, cada uma pequena, média e grande) no mapa e na hotbar do Santuário.
- **Arte** (`scripts/extract-iso-trees.py`, pranchas em `assets-src/trees/iso-*.png`): fundo e **base de grama/terra/pedras somem** ("só a árvore", como no carvalho anterior): abaixo da linha da base só fica o tronco (cor do tronco, faixa do tronco com leve alargamento para as raízes); cada espécie mantém a proporção da prancha e a grande mede como o carvalho já existente. Saídas: `iso-trees.webp` (atlas), `isoTreesManifest.ts`, 12 ícones `icon-iso-<espécie>-<s|m|l>.webp`.
- **12 blocos novos** `ISO_BETULA_S/M/L`, `ISO_CEREJEIRA_*`, `ISO_MACIEIRA_*`, `ISO_CARVALHO_*` (ids 86–97, `ISO_TREE_SET`), objetos sólidos desenhados 2× como o carvalho antigo (`ISO_SCALE`), logo depois do Carvalho na hotbar (82 peças + 5 sementes = 87 espaços). `isoSetTextures` lê o atlas novo (`images.trees`, carregado em `blockArt`).
- **Mapa:** a mata da Fazenda sorteia, por posição, entre o carvalho de sempre e as 12 árvores novas. O bloco original do Santuário não mudou.
- Conferido no navegador (macieira grande na mata; ícones na hotbar). `tsc` e 685 testes verdes (contagens de peças atualizadas). Sem mudança de save, protocolo ou servidor.
- Limites: as árvores novas são estáticas (a macieira não dá/colhe maçãs); extração por cor/posição pode deixar pequenas sobras de base — ajustes em `SPECIES` do script.
## Orvalis v0.93.155 — seleção do objeto: só o contorno (18/11/2026)
- **Correção (feedback do dono do produto, no iPhone):** o destaque da v0.93.154 pintava o sprite inteiro de amarelo (a cópia "atrás" saía por cima nesse aparelho). Agora é **só o contorno da silhueta**: um plano um pouco maior que o desenho cujo shader pinta apenas os pixels transparentes que têm pixel opaco por perto (`ChunkSprites.setHighlight`), sem véu e sem depender da ordem de desenho. Espessura constante em células (`HL_RADIUS`), cor amarela (válido) ou vermelha (inválido), pulsando de leve.
- Conferido no navegador (arbusto: contorno fino, desenho intacto). `tsc` e testes verdes. Sem mudança de save, protocolo ou servidor.

## Orvalis v0.93.154 — Santuário: a seleção destaca o próprio objeto (18/11/2026)
- **Pedido do dono do produto:** quando o cursor está na célula de um objeto que não é bloco (flor, barril, pedra, árvore, arbusto…), em vez do cubo de seleção, destacar **o próprio objeto**.
- `ChunkSprites.setHighlight(alvo)`: desenha a **silhueta do próprio sprite** — um halo (cópia maior, desenhada antes dos sprites, só aparece em volta) e um véu pulsante por cima — em amarelo (alvo válido) ou vermelho (inválido). `WorldThreeRenderer` chama antes do cursor 3D e passa `objectHighlighted` ao `IsoCursor`, que então não mostra o cubo. Células sem objeto continuam com o cubo.
- Só na câmera isométrica do Santuário. Cercas/portões 3D e portas (que não são sprites) ainda mostram o cubo.
- Conferido no navegador (arbustos com contorno e véu; célula sem objeto com cubo). `tsc` e testes verdes. Sem mudança de save, protocolo ou servidor.

## Orvalis v0.93.153 — Santuário: o telhado some quando você entra na casa (18/11/2026)
- **Pedido do dono do produto:** numa casa totalmente fechada, ao entrar o telhado some (ou fica transparente) para ver o interior.
- **Regra do corte** (`render/three/cutaway.ts`, função pura): se há um cubo a **2 níveis ou mais acima do piso** onde a jogadora pisa (telhado sobre a cabeça), a construção inteira — as células ligadas que têm telhado, paredes incluídas — **esconde tudo acima do 1º nível de parede** (piso + 1 fileira de parede ficam, porta incluída). Ao sair (ou ao subir no telhado), tudo volta.
- `ChunkBlocks.setCutaway(região)` esconde as instâncias por escala 0 (o `pick`/seleção as ignora) e reaplica quando um chunk é refeito; `WorldThreeRenderer.updateCutaway` recalcula ao mudar de célula ou a cada 0,25 s. **Só no Santuário** (cubos cheios, `surfaceObjects`); o Mundo normal não muda.
- Conferido no navegador (fora: casa fechada; dentro: telhado e paredes altas somem; ao sair volta). Teste novo (`cutaway.test.ts`); `tsc` e testes verdes. Sem mudança de save, protocolo ou servidor.
- Limites: o corte é instantâneo (sem fade); objetos de sprite em cima do telhado (árvores, lampiões) e cercas/portões 3D não são escondidos; cobre qualquer coisa com cubo a 2+ níveis sobre a cabeça (ex.: arco ou ponte alta).

## Orvalis v0.93.152 — Santuário: paisagem única e Fazenda do heightmap (18/11/2026)
- **Decisão do dono do produto (ADR 0037):** a paisagem da seed 1835638650 passa a ser **única** (toda seed do Santuário abre igual; a seed só distingue os salvamentos locais) e o mundo ganha **mais 16 chunks a leste** (8 × 4 = 32 chunks, 128 × 64 células) feitos de um **heightmap**.
- **Fazenda** (`world/sanctuaryFazenda.ts` + `world/fazendaData.ts`, gerado por `scripts/make-fazenda-data.py` de `assets-src/santuario-fazenda`): terreno em até 7 cubos (planície no nível 2, patamares 4/6/7), rio escavado com o pincel Lago (376 células, degraus de água na queda), margens de areia, ponte, pátio, duas casas, cinco áreas cercadas com Terra Arada e culturas maduras (trigo, tomate, cenoura, batata; talhão só preparado), árvores, arbustos e flores.
- **Pilha de 8 níveis** no Santuário (`SANCTUARY_MAX_STACK` 5 → 8); salvamentos antigos continuam abrindo (camadas novas vazias). A Deusa continua nascendo na origem.
- Testes: seed única, 376 células de água, vizinhos secos ≤ 1 nível, plantações, determinismo, salvamento antigo de 5 camadas; testes de mecânica passaram a usar o Santuário liso (`landscape: false`). Conferido no navegador (patamares, rio, queda, ponte, campos). `tsc` e 683 testes verdes. Sem mudança de save (21), protocolo ou servidor.
- Limites: sem cascata/curvas do canal (rio só com o pincel Lago); desempenho do mundo maior a conferir em aparelho real.

## Orvalis v0.93.151 — Santuário: sementes e vegetais do Mundo na hotbar (18/11/2026)
- **Pedido do dono do produto:** incluir na hotbar do Santuário as sementes e vegetais do mundo principal: trigo, cenoura, batata e tomate. Nova flag `WorldProfile.crops` (Santuário `true`): a grade fixa ganha, depois das 70 peças, **semente de trigo, trigo, cenoura, batata e tomate** (75 espaços), em **quantidade infinita** (sem contador; sem coleta não gasta).
- **Plantio no Santuário:** como o terreno é em camadas, planta-se **sobre um cubo de Terra Arada** no topo da pilha (`World.canPlant/plant` com `surfaceObjects`); a planta fica no nível da superfície e **cresce** com o tempo (`tickGrowth` lê `surfaceObject`/`surfaceLevel`). Grama/pedra não aceitam semente.
- Ícones e folhas de crescimento vêm do pacote do Mundo (`art/santuario.ts`: `itemIcons`, `wheatCrop`, `crops`). `stackView` não mostra contador de item sem coleta.
- Conferido no navegador (ícones, Terra Arada + cenoura plantada e crescendo). Testes novos; `tsc` e 679 testes verdes. Sem mudança de save, protocolo ou servidor.
- **Pendência:** colher (quebrar a planta madura) no Santuário só remove a planta (sem coleta); o crescimento na sala multiplayer não se aplica (Santuário é solo).

## Orvalis v0.93.150 — Santuário: toque na tela coloca/quebra blocos no celular (18/11/2026)
- **Pedido do dono do produto:** liberar no celular, para o Santuário, o toque na tela para colocar ou quebrar blocos. Antes o canvas ignorava `pointerType === 'touch'` no celular (ação só pelo botão); agora `Game.touchActs` (perfil `santuario`) deixa o toque agir como o clique (toque curto = colocar; segurar = quebrar). O botão de ação continua. O Mundo normal no celular não muda.
- Conferido no navegador (celular emulado com toque): o toque altera o mundo como o clique do mouse. Sem mudança de save, protocolo ou servidor.
## Orvalis v0.93.149 — hotbar do Santuário em uma única linha com rolagem horizontal (18/11/2026)
- **Pedido do dono do produto:** limitar a hotbar do Santuário (70 peças) a **uma linha**, rolando na horizontal. Antes ela quebrava em linhas e, com mais de 40 peças, rolava na vertical (até 1/3 da tela).
- `style.css`: `.hotbar-row.hand.many` agora é `nowrap` com `overflow-x: auto` (paisagem e retrato); `.huge` só mantém as peças menores. `Hud.update` traz a peça escolhida para a vista (`scrollIntoView`). O Mundo normal (≤ 20 espaços) não muda.
- Conferido no navegador (paisagem 900×420 e retrato 420×800: 70 peças em uma linha, rolagem horizontal, sem erros). Sem mudança de save, protocolo ou servidor.

## Orvalis v0.93.148 — Santuário: paisagem fixa da seed 1835638650 (17/11/2026)
- **Pedido do dono do produto:** construir um mundo na seed 1835638650 só com blocos do Mundo (terra, grama, água, areia, pedra, madeira, árvore, arbustos, flores), usando os níveis para dar forma. Decisões dele: água/árvore/arbustos são os que o Santuário já tem (Rio: Lago e Canal, Carvalho e Arbustos do conjunto isométrico) e a paisagem vale **só nessa seed** (as outras seguem planas e vazias).
- `world/sanctuaryLandscape.ts` (`SanctuaryLandscape`, função pura da seed; `LANDSCAPE_SEEDS`): planície (altura 2: pedra + grama), duas colinas (altura 3: pedra + terra + grama, afloramento de pedra), lago com praia de areia, rio de uma nascente ao norte até a margem do lago, ponte e cais de tábuas (erguidos 1 cubo sobre a água, estacas de tora), casa de madeira (piso, paredes de toras e tábuas, porta de carvalho entre batentes, telhado na 5ª camada), jardim cercado com flores, florestas de Carvalho, arbustos e manchas de flores. Clareira de 6 células onde a Deusa nasce. Todo degrau entre vizinhos é de 1 cubo.
- Motor: `TerrainSource.generateLevels` (opcional, níveis 2..4 da pilha), `WorldProfile.terrain.landscape` (Santuário `true`) e `World` usa `landscapeFor(seed)` antes do terreno plano. Chunks já editados e salvos nessa seed mantêm o que foi salvo.
- **Rio reto de propósito:** as peças de canal só têm retas, curvas norte–leste/oeste, Ts e pontas; as curvas sul–leste/oeste faltam (NEXT_STEPS), então o rio é uma coluna reta que desce para o lago (peça "Foz para lago").
- `tsc` e testes verdes (novos: `sanctuaryLandscape.test.ts`); conferido no navegador (lago, rio, ponte, cais, casa, colinas, floresta). Sem mudança de save/protocolo; `package.json` 0.93.148.

## Orvalis v0.93.147 — Santuário: Rio das Fadas com autotile (17/11/2026)
- **Pedido do dono do produto:** incluir o pacote "Rio das Fadas" (`.bbmodel` + atlas + teste de encaixe) no Santuário, como blocos únicos e transições automáticas. Decisões dele: o cubo fica **inteiro** (a laje de água de 7/16 se apoia numa base de terra) e a entrada é **autotile**.
- **Dois pincéis na barra** (70 peças no total): `Rio: Canal` e `Rio: Lago` (`world/rio.ts`; ids 253 e 166, os únicos do rio no mapa e no salvamento — ids de bloco são escassos: 210–225 e 250–252 são faixas aposentadas).
- **26 peças** com código de bordas N L S O (D seco, C canal, F lago). A peça que desenha cada célula é escolhida **na hora de desenhar** (`rioPieceAt`, lê os 4 vizinhos do mesmo nível; hook `ChunkBlocksOptions.variant`, ids virtuais ≥ 1000 só no render). Canal isolado = Poça de fadas, lago isolado = Lago das ninfeias; água lisa varia por hash da posição (calma/ondulada/espuma/rochedos); sem peça exata usa a de menor custo (leste/sul pesam mais: são as laterais visíveis).
- `World.setLevel` avisa o chunk vizinho (`Chunk.touch`) quando uma célula do rio muda na borda; a água do rio nunca preenche buraco do chão.
- **Arte:** `scripts/extract-iso-rio.py` (`assets-src/iso-set/rio-atlas.png`, `rio-teste-de-encaixe.json`) → `src/assets/iso-rio.webp` (topos 128 px + laterais seco/canal/lago já com a base de terra) e dois ícones.
- **Fora desta entrega:** Prado (seco liso), Corredeira e Cascata (relevo 3D) e as peças que faltam no conjunto (lista em NEXT_STEPS).
- `tsc` e testes verdes; conferido no navegador (canal em L, lago 3×3, em cima e no nível da grama). Sem mudança de save/protocolo; `package.json` 0.93.147.
- **CI:** `npm audit` passa a olhar só dependências de produção (`--omit=dev`) por causa do advisory do `picomatch` em vite/vitest (ver NEXT_STEPS).

## Orvalis v0.93.146 — Santuário: Piso de Terra corrigido + todos os blocos do Mundo (17/11/2026)
- **Piso de Terra deformado:** a lateral esticava um pedaço da lateral do bloco de grama; agora é o próprio piso de terra escurecido (`render/isoSet.ts`). Só esse bloco mudou.
- **Blocos do Mundo no Santuário, como blocos NOVOS** (`WORLD_BLOCKS_IN_SANCTUARY`, 42 peças: materiais, porta de carvalho, tenda, baú, fogueira, caldeirão, forno, cadeira, estaca de cerca e flores); nenhum id do conjunto isométrico foi sobrescrito (perfil = 26 + 42 = 68). Arte do pacote do Mundo reaproveitada em `render/art/santuario.ts`.
- **Objetos em qualquer nível** (`World.surfaceObject/surfaceLevel`): porta (exige dois batentes no mesmo nível; abre/fecha), baú, assento, estação, tenda (cai inteira, terreno fica) e luz de fogo seguem o nível; sprites e portas giram π/4 na vista isométrica.
- **Hotbar** com mais de 40 peças usa slots menores e rolagem (`.hotbar-row.hand.huge`).
- **Fora desta entrega:** paredes (`WALL_*`) e porta de parede (autotile lê só o nível 0); altura da animação do fogo não conferida (ver NEXT_STEPS).
- `tsc` e testes verdes; sem mudança de save/protocolo; `package.json` 0.93.146.

## Orvalis v0.93.145 — Santuário: texturas de madeira nas cercas e portões (17/11/2026)
- **Pedido do dono do produto:** colocar as texturas dele (3 imagens de tábuas: carvalho laranja, bétula clara, cerejeira vermelha com flores) nas cercas e portões 3D do Santuário.
- `assets-src/iso-set/madeira-{carvalho,betula,cerejeira}.png` → `scripts/extract-iso-fence.py` → `src/assets/iso-wood.webp` (3 quadrados de 256 px, 35 KB; antes eram as tábuas 64 px do Padrão V2). `render/three/isoFences.ts`: uma textura por madeira (filtro suave, no lugar do pixel-art), projetada **24 u do modelo por imagem** (tábua de ~6 u: a do tamanho da estaca; a estaca usa a veia na vertical), com o sombreado por direção da face. Carvalho = `FENCE`/`FENCE_GATE`, Bétula = `_BIRCH`, Cerejeira = `_CHERRY`. Só o Santuário; as cercas do Mundo não mudam.
- `tsc` e testes verdes; conferido no navegador (as 3 madeiras, cerca e portão aberto). Sem mudança de save/protocolo; `package.json` 0.93.145 (a 0.93.144, das laterais, foi revertida).

## Orvalis v0.93.143 — Santuário: Bloco de Pedra, quebra em 1 s e terreno em camadas (17/11/2026)
- **Pedido do dono do produto (regras só do Santuário):** (1) novo **Bloco de Pedra** (o cubo 1×1×1 da prancha de blocos de pedra: `scripts/extract-iso-stone.py` → `iso-stone.webp` com topo/sul/leste e ícone); (2) **quebrar bloco em 1 s**; (3) terreno em camadas — **nível 1 = Bloco de Pedra, nível 2 = Grama, e a Deusa e todo o resto no nível 3**.
- **Perfil** (`WorldProfile`): `breakSeconds` (Santuário 1; Mundo `null` = pela ferramenta/mão como antes), `surfaceObjects` (Santuário `true`) e `terrain.layers` (Santuário `[ISO_STONE_BLOCK, ISO_G_GRASS]`); `FlatGenerator` põe as camadas em toda célula (níveis 0 e 1 da pilha, que contam como 1 e 2 a partir do chão). `ActionContext.breakSeconds` troca o tempo no `advanceHold`.
- **Mundo (`World`)**: com `surfaceObjects`, `stackHeight` conta só cubos; `standHeight` = 2 sobre o terreno (a Deusa nasce em cima) e `null` sob objeto sólido; `placementLevel` põe objetos **em cima** da pilha (`surfaceFree`; casa 12×12 e barraca 3×3 exigem a mesma altura em todas as células); cubo não empilha sobre objeto; `bigAnchor`/quebrar valem em qualquer nível; `findSpawn` = centro. Cavar tira grama, pedra e por fim abre o chão.
- **Render**: `ChunkSprites.surfaceLevels` (sprites em qualquer nível, `lift`), `IsoFences` (cerca/portão em qualquer nível), câmera isométrica acompanha a altura (`ThreeStage.focusY`).
- **Salvamento v22:** o terreno do Santuário mudou, então o v21 do Santuário não abre (recomeça); o do Mundo principal só sobe a versão.
- Testes: terreno em camadas, cavar, objetos e casa em cima, migração v21 → v22; os de mecânica usam o perfil sem camadas. `tsc`, 661 testes e build verdes; conferido no navegador (Deusa em cima, casa/cerca/árvore sobre a grama, cova mostrando as camadas). `package.json` 0.93.143.

## Orvalis v0.93.142 — Santuário: cercas e portões em 3D (17/11/2026)
- **Pedido do dono do produto:** incluir na visão isométrica as cercas e portões que fizemos em 3D. Os sprites 3/4 do Mundo (renders do modelo na câmera oblíqua) não valem na câmera isométrica, então o Santuário desenha **a própria geometria** do modelo do Blockbench.
- **Render** (`render/three/isoFences.ts`): `IsoFences` monta, por célula, a estaca + meia travessa para cada vizinho que emenda (cerca ou portão), no mesmo molde do `scripts/fence-model/render.html` (estaca de 4 × 17 u, travessas em 2 alturas, 12 u = 1 célula, tábuas V2 por madeira, sombreado por direção da face, travessas a 0,68). **Portão:** estacas e dobradiças fixas + folha em pivô na dobradiça, que gira 90° para o norte em ~0,35 s ao abrir/fechar (o estado persiste por célula); de lado (rotação −90°) quando as cercas vizinhas estão ao norte/sul (`gateIsSide`). Varre os chunks por `chunk.version` (dele e dos vizinhos); malhas com `userData.cell` entram no raio de seleção (`WorldThreeRenderer.pick`), então o clique abre/fecha o portão e quebra a cerca como no Mundo.
- **Blocos:** as 3 cercas e os 3 portões já existentes (`ISO_FENCES`) entram na hotbar do Santuário (agora **25 blocos**); regras (sólida, portão aberto passável, emenda) são as do `World`/`blocks.ts`, sem id novo. Ícones: os do Mundo.
- **Arte:** `scripts/extract-iso-fence.py` grava `iso-fence-model.json` (221 KB, só no pacote do Santuário; vai no JS do chunk dele) e `iso-wood.webp` (17 KB); `ArtPack.isoFence`.
- Testes ajustados (`fence.test.ts`: as cercas agora estão no Santuário; 25 peças); `tsc`, 658 testes e `npm run build` verdes; conferido no navegador (curral com portões fechados e abertos, 3 madeiras, seleção por clique). Sem mudança de save, protocolo nem servidor; `package.json` 0.93.142.

## Orvalis v0.93.141 — Santuário: conjunto enxuto (19 peças) e objetos maiores (17/11/2026)
- **Pedido do dono do produto:** árvore **2×**, casa **4×**, barraca azul e branca **3×**; excluir os blocos 1 e 5–20 da hotbar (numeração da hotbar de 36: Bloco de Grama; Piso de Pedra Lisa; os 5 pisos grama/pedra; os 10 caminhos e a mancha). Ficam **3 pisos** (grama, terra, pedra) e **16 objetos** = **19 blocos**.
- **Tamanhos** (`ISO_SCALE` em `blocks.ts`, lido por `render/isoSet.ts`): interpretados como fator **linear** do desenho. O que ocupa chão cresce junto: **Casa 12 × 12** células (`ISO_HOUSE` + 143 `ISO_HOUSE_PART`) e **Barraca 3 × 3** (`ISO_STALL` + 8 `ISO_STALL_PART`, id novo); a árvore 2× segue ocupando só a célula do tronco. `ISO_BIG` generaliza o que era a casa 3×3: `World.bigCells`/`bigAnchor` (substituem `houseCells`/`houseAnchor`), colocar, quebrar e âncoras valem para qualquer objeto grande.
- **Arte/script:** `extract-iso-set.py` grava só os 3 topos e os 19 ícones; as laterais da pedra vêm do próprio piso de pedra (escurecido); as da grama continuam as do bloco de grama da prancha (arte, não bloco). Ícones e blocos dispensados saíram do código.
- Testes reescritos (casa 12×12, barraca, árvore, 19 peças); `tsc`, 658 testes e `npm run build` verdes; conferido no navegador (casa 4× e barraca 3× ao lado da Deusa; hotbar numa linha). Sem mudança de save, protocolo nem servidor; `package.json` 0.93.141.

## Orvalis v0.93.140 — Santuário: conjunto isométrico completo (36 peças) e fim do legado celestial (17/11/2026)
- **Pedido do dono do produto:** a prancha isométrica (36 peças) entra **toda** como blocos da Deusa, inclusive árvore, casa etc., como **conjunto novo** (substitui os 8 materiais do Mundo no Santuário).
- **Blocos** (`world/blocks.ts`, `ISO_*`): 20 **cubos** (Bloco de Grama + 19 pisos: grama, terra, pedra lisa/irregular, 5 transições grama-pedra, 10 caminhos de terra e a mancha) e 16 **objetos** (carvalho, arbustos G/M/P, rochedo, pedrinhas, capim, margaridas, lavanda, lampião, barraca, jardineira, canteiro de pedra, barril, caixote e a **Casa de Feira 3×3**: `ISO_HOUSE` + 8 `ISO_HOUSE_PART`, `World.houseAnchor`/`houseCells`; qualquer parte quebra a casa). `WorldProfile.santuario.blocks = ISO_BLOCKS`; chão do mundo = Piso de Grama.
- **Arte** (`scripts/extract-iso-set.py`): pisos "desentortados" do losango para quadrados (u = leste, v = sul; o de grama emendável), 2 faces do bloco de grama, atlas de objetos e 36 ícones; `render/isoSet.ts` monta topos, faces (`BlockFaces.cube`, +X/+Z próprias) e sprites; objetos viram planos verticais **girados 45°** (`SpriteDraw.yaw`/`yawPivotOrigin`, de volta ao `ChunkSprites`; 127,3 px da prancha = 1 célula, 103,9 px = 1 célula de altura) apoiados na quina sul da base. Pacote próprio `render/art/santuario.ts` (o Santuário deixa de carregar a arte do Mundo); `ArtPack.isoSet`.
- **Câmera:** 10 células visíveis no Santuário (`ISO_CELLS_TALL`), com os atores na escala do Mundo. **Hotbar:** com mais de 20 peças quebra em linhas (`.hotbar-row.many`) em vez de rolar de lado.
- **Limpeza final do legado celestial:** removidos os ids 80–97/98, `CELESTIAL_BLOCKS`, `celestialArt.ts`, o pacote `art/santuario.ts` antigo, `waterPureAsset.ts`, o atlas e os 18 ícones celestiais, as 6 texturas 512 e `sanctuaryThreeLayout.test.ts`; `lighting`/`adaptiveWalls`/`textures`/`blockArt`/`biomes` limpos. Salvamentos antigos do Santuário (ids 80+) passam a mostrar peças novas nesses ids: o Santuário recomeça do zero (decisão do dono do produto).
- Testes: casa 3×3, objetos e andar sobre enfeites (`faceplacement.test.ts`), hotbar de 36, colisão com os pisos; `tsc`, 657 testes e `npm run build` verdes; conferido no navegador (as 36 peças, casa, caminhos, hotbar em 2 linhas). Sem mudança de save (21), protocolo (29) nem servidor; `package.json` 0.93.140.

## Orvalis v0.93.139 — Santuário isométrico: colocar blocos nas faces, com nível flutuante (17/11/2026)
- **Pedido do dono do produto:** além do topo, poder apontar para a **face** de um cubo e colocar o novo ali, **sem exigir cubo no nível de baixo**.
- **Regra (domínio, `World`):** `placementLevelAt`/`canPlaceAt`/`placeBlockAt(x, y, id, nível)` — só cubos do perfil, dentro dos limites, nível livre e sem objeto não-cubo (árvore, porta, enfeite) no chão da célula; o nível 0 segue `placementLevel`. O nível pode **flutuar** (níveis de baixo vazios). `stackHeight` continua contando a pilha contígua do chão: empilhar em cima preenche o vão, quebrar tira o bloco mais alto primeiro; andar sob um bloco flutuante é possível (sem colisão vertical).
- **Render:** `GameRenderer.pickFace` (opcional; `WorldThreeRenderer`) devolve cubo, nível e normal do ponto apontado (blocos de 1/4 incluídos). **Ação:** `ActionController.useTarget` converte em alvo: face lateral → célula vizinha no **mesmo nível**; topo → mesma célula, **nível acima**; `CellTarget.level` leva o nível até `applyUse`. O cursor-fantasma (`IsoCursor`) usa esse nível.
- **Escopo:** só com `WorldProfile.view = 'isometric'` **e jogando sozinho** (`ActionContext.facePlacement`): o protocolo da sala não leva o nível (Sala 2 e Mundo não mudam; subir `PROTOCOL_VERSION` quando for para a sala). O botão de ação/Espaço (célula à frente) segue empilhando no topo.
- Testes novos (`faceplacement.test.ts`); `tsc`, 662 testes e `npm run build` verdes; conferido no navegador (fantasma na face a meio da pilha; clique coloca o cubo flutuante no vizinho, nível 1).

## Orvalis v0.93.138 — Santuário isométrico: movimento em tela e cursor 3D (17/11/2026)
- **Movimento:** na vista isométrica as setas/WASD e o joystick andavam pelos eixos do mundo, que na tela são diagonais (a tecla "direita" ia para baixo-direita). Novo `WorldProfile.view` (`oblique` | `isometric`; Santuário = isométrica) e `game/isoInput.ts`: a entrada de tela é girada 45° — cima vai para o fundo da tela, direita para a direita (conferido: direita = +x/−y, cima = −x/−y). O sprite continua com as 4 diagonais pelo eixo dominante (com histerese).
- **Cursor:** a moldura/cantoneiras 2D (`selectionFx`) são retângulos de tela da vista oblíqua e, na projeção isométrica, ficavam longe da célula real. Novo `render/three/isoCursor.ts`: **bloco-fantasma 3D translúcido com arestas e a base da célula sombreada, no lugar exato onde o próximo bloco entra** (nível acima do topo da pilha; pilha cheia marca o topo; vermelho = fora de alcance/inválido; a quebra pinta o bloco de cima). Os retângulos 2D ficam só na vista oblíqua (Mundo e câmeras não isométricas). O raio de seleção já estava certo (conferido: o fantasma aparece sob o ponteiro, no chão e no topo de pilhas).
- Testes novos (`isoInput.test.ts`); `tsc`, 658 testes verdes; conferido no navegador. Sem mudança de save, protocolo nem servidor.

## Orvalis v0.93.137 — Deusa isométrica: as 10 folhas de ferramenta (17/11/2026)
- **Arte revisada completa (13 pranchas, 1280×1280):** importadas as 10 de ferramenta — caminhada com espada, machado, enxada, picareta e pá, e o golpe/uso de cada uma (`goddess-iso-<ferramenta>[-attack].webp`, ~0,9 MB no total, baixam só quando a ferramenta é usada). Medido antes de importar: sem alfa-resíduo, corpo de 290–293 px, sola da bota ≤ 8 px entre quadros nas caminhadas e ≤ 5 nas de uso (as oscilações maiores da base total são a ponta da ferramenta abaixo da bota). Comandos em `OPERATIONS` (`--largest`, exceto o golpe de espada, que tem peças soltas legítimas; `--rows-map 1,3,0,2`).
- **Código:** `ActorKind` ganha `goddess-iso-${ferramenta}` e `goddess-iso-${ferramenta}-attack`; `goddessIsoKind` (entities) escolhe a folha (golpe → ferramenta na mão → caminhada/idle); `SPECS` com altura pelo desenho de cada folha; enquanto a folha da ferramenta baixa, o ator usa a caminhada sem ferramenta (sem sumir). Teste novo `goddessIsoKind.test.ts`.
- **Sem uso no jogo ainda:** o perfil do Santuário segue com `tools: false` (decisão de design pendente); equipar por `window.__game.player.equipped` no dev mostra as 5 caminhadas (conferido no navegador).
- Sem mudança de save, protocolo nem servidor. `tsc`, 655 testes e `npm run build` verdes.

## Orvalis v0.93.136 — Deusa isométrica: folhas revisadas 01–03 (17/11/2026)
- **Arte revisada do dono do produto (1280×1280, grade de 320 px):** caminhada, idle e sentar **reimportados** no lugar das versões de prévia (v0.93.135). Medido: sem alfa-resíduo, sola da bota na mesma linha (oscilação ≤ 1 px em todas as fileiras; antes até 19 px), corpo de 291–292 px nas duas primeiras (±0,5%). Mesmos comandos de `OPERATIONS` (`--rows-map 1,3,0,2`).
- **Guardadas em `assets-src/goddess-iso/` e ainda sem uso:** caminhada e ataque de espada revisados (04: oscilação de 12 px na 1ª fileira, é a ponta da espada abaixo da bota; 05: limpa, corpo 290). As outras 8 revisadas (06–13) **não chegaram como arquivo** (só vistas na conversa): pedido reenviar como PNG.
- Sem mudança de save, protocolo nem servidor. `tsc` e 652 testes verdes; conferido no navegador (4 direções).

## Orvalis v0.93.135 — Deusa isométrica no Santuário (caminhada, idle e sentar) (17/11/2026)
- **Arte do dono do produto:** 13 pranchas da Deusa em vista isométrica (4 diagonais × 4 quadros: baixo-direita, baixo-esquerda, cima-direita, cima-esquerda). **Importadas só as 3 que o Santuário usa hoje:** caminhada, idle e sentar (`assets-src/goddess-iso/` → `src/assets/goddess-iso-{walk,idle,sit}.webp`, 373 KB no total, `process-sprite.py --alpha --largest --frame-h 144 --rows-map 1,3,0,2`). As 10 de ferramenta (espada, machado, enxada, picareta, pá: caminhada e golpe) **não foram importadas**: o Santuário não tem ferramentas e as folhas precisam de revisão (ver NEXT_STEPS).
- **Mapa de direções:** com a câmera a 45° o mundo "direita" aparece como baixo-direita, "baixo" como baixo-esquerda, "cima" como cima-direita e "esquerda" como cima-esquerda; `--rows-map 1,3,0,2` põe as 4 na ordem canônica (frente, esquerda, direita, costas) e o jogo não muda.
- **Código:** `CharacterId` ganha `goddess-iso` (perfil `santuario`; a Sala 2 online segue com a `goddess` flutuante); `ActorKind` ganha `goddess-iso` (andando), `goddess-iso-idle` (parada, 4 quadros em laço) e `goddess-iso-sit` (registrada, ainda sem assento); folhas no pacote principal (`render/art/principal.ts`), `SPECS` em `render/character.ts`, `footMargins.ts` regenerado.
- **Correção da câmera isométrica:** os planos dos atores ficavam de frente para o eixo z e, a 45°, saíam **achatados (×0,71 na largura)**. `ActorBillboards.setYaw` gira os planos para a câmera (π/4 só no modo isométrico); as outras vistas não mudam. Vale também para a câmera "Isométrica" da Sala 2.
- Sem mudança de save (21), protocolo (29) nem servidor. `tsc`, 652 testes e `npm run build` verdes; **conferido no navegador** (4 direções andando e parada, proporção correta).

## Orvalis v0.93.134 — Santuário isométrico solo, terreno plano vazio (17/11/2026)
- **Pedido do dono do produto (2º passo, ADR 0036):** solo, plano e vazio, em vista isométrica; o Mundo principal não muda.
- **Perfil `santuario` refeito** (`world/profiles.ts`): terreno plano de grama (`FlatGenerator`), 4×4 chunks, Deusa, hotbar de 8 materiais do Mundo (Terra, Grama, Terra Arada, Areia, Pedra, Pedra Lisa, Tora, Tábuas; a Água Pura saiu: sem arte no pacote principal). `SanctuarySeedGenerator` (+ teste) removido de `world.ts` e do repositório.
- **Entrada solo** (`main.ts`): `?mundo=santuario` abre o mundo sozinho (sem servidor, portão, nome de Deusa nem seletor de sala; `online` desligado). Arte do pacote principal. `renderer`: `WorldThreeRenderer(canvas, world, sanctuaryRoom, isometric)` e `SanctuaryCameraModes(…, fixed)` travam a câmera isométrica (45° / 35,264°) sem seletor.
- Testes reescritos (`santuario.test.ts`, `sanctuaryFiveLevels.test.ts`, `sanctuaryMaterials.test.ts`, `save.test.ts`); `tsc`, 652 testes e `npm run build` verdes; **conferido no navegador** (captura com blocos empilhados: chão plano, Deusa, hotbar com ícones).
- Sem mudança de save (21), protocolo (29) nem servidor. Santuário agora segue a grade 2 do Mundo.

## Orvalis v0.93.133 — limpeza do Santuário Celestial antigo (17/11/2026)
- **Pedido do dono do produto:** o mundo normal continua como está; o Santuário será refeito do zero, **solo**, terreno plano vazio, em vista isométrica. Este é o 1º passo: a limpeza (ADR 0036).
- **Removido:** `render/sanctuaryThreeRenderer.ts`, `sanctuaryWallPrototype.ts`, `sanctuaryWallProportionTest.ts`, `sanctuaryEightFacesAsset.ts`, `celestialGrassNetAsset.ts`, `sanctuaryGrassPanelsAsset.ts`, `sanctuaryGoddessVisual.ts` (+ testes), a classe `SanctuaryCameraJoystick` (ficam as constantes de câmera), o `?celestial=1`, o build fixo `VITE_WORLD=santuario` (vite, `art/index.ts`, `config.ts`), o script `build:artifact:santuario` e o ramo do Santuário Celestial em `main.ts`.
- **Mantido (o renderer do Mundo usa):** `sanctuaryThreeLayout`, `sanctuaryLighting`, `sanctuaryCameraModes`, `sanctuaryCameraRig`, `sanctuaryObliqueView`, `sanctuaryWallArt`, `celestialArt` e o perfil `santuario` (a substituir no próximo passo).
- **CI:** a Verificação (`.github/workflows/ci.yml`) deixa de rodar `build:artifact:santuario` (script removido); `package.json` sobe para 0.93.139.
- Efeito: o perfil Santuário passa a usar sempre a grade 2 (antes o Celestial usava a 1). Sem mudança de save, protocolo (29) nem servidor. `tsc`, 656 testes e `npm run build` verdes; **não conferido no navegador** (sem mudança visual no Mundo).

## Orvalis v0.93.132 — carvalho isométrico removido (17/11/2026)
- **Pedido do dono do produto:** não gostou da versão do carvalho em perspectiva isométrica; **removida do jogo** (reverte a v0.93.127): arte `tree-oak-iso.webp`, prancha de origem, `scripts/extract-oak-iso.py`, `SpriteDraw.yaw`/`yawPivotOrigin` e o teste, a troca de sprites ao mudar de câmera (`onChange`) e a doc em `domains/render.md`. A câmera Isométrica do Santuário volta a usar o carvalho de sempre.
- Sem mudança de save, protocolo ou servidor.

## Orvalis v0.93.131 — Capítulo 1: missões 08–10, fim do capítulo (17/11/2026)
- **Decisão do dono do produto:** o `lizard` do jogo **é** o homem-lagarto e a quantidade da missão 08 vale toda para ele: **4** (os "3 lagartos + 1 homem-lagarto" do texto original viraram 4 homens-lagarto).
- **08 Movimento nas margens** (4 homens-lagarto; 30) · **09 A fogueira dos goblins** (achar o acampamento + 2 goblins; 35) · **10 A ameaça à Cidade do Despertar** (os 5 goblins restantes; 60; texto de reconhecimento e gancho do mistério maior). Depois da 10 a conversa do Mestre volta ao normal.
- **Evento novo** `{ type: 'near', spot: 'goblin-camp' }`: `Game.updateQuests` o emite (a cada 0,5 s, só com a 09 ativa) quando a jogadora chega a 8 células de uma fogueira de `world.goblinCamps`.
- Simplificação conhecida: os goblins das missões 09/10 contam pela espécie (qualquer goblin), não por acampamento (cada um tem 7).
- Sem mudança de save (21), protocolo (29) nem servidor. Testes novos; `tsc` e testes verdes.

## Orvalis v0.93.130 — Sala 2 (Santuário) sem missões, carteira e painel do personagem (17/11/2026)
- **Decisão do dono do produto:** o Santuário é área de criação; não herda a progressão do mundo normal. Novo `WorldProfile.progression` (principal `true`; Santuário e o perfil criativo da Sala 2 `false`).
- Com `progression: false` o `Game` não conta/oferece missões (eventos, diário, sinais `!`/`?`, conversa com o Mestre), esconde o botão e a tecla **C** do painel do personagem, e ignora a carteira (a bolsa da sala não carrega nem guarda Moedas de Cobre: `coins` = 0).
- **Correção — Deusa invisível na Sala 2 (só a sombra):** a Sala 2 usa o pacote de arte do mundo normal, que não trazia a folha da Deusa (`actors.goddess` só existia no pacote do Santuário antigo). `art/principal.ts` agora importa `goddess-float.webp` (baixa só quando a Deusa aparece). Conferido no navegador com servidor local: a Deusa aparece e a carteira fica em 0 (bolsas antigas traziam moedas).
- Sem mudança de save (21) nem de protocolo (29). Empilhado sobre o #246 (missões 04–07).

## Orvalis v0.93.129 — Capítulo 1: missões 04–07 (17/11/2026)
- **Missões** (`npcBrain/missions.ts`, texto do dono do produto; valores provisórios): **04 O valor de uma aventura** (5 espólios — seda, presas, pelagem, coração da rainha; 10 + valor de cada item), **05 A floresta das teias** (4 aranhas pequenas + 1 grande; 22), **06 Protegendo nossas terras** (6 cercas + 1 porteira de qualquer madeira, eventos `place`; 25), **07 Terra para o futuro** (12 blocos de terra arada no terreno marcado; 18). A corrente agora vai até a 07.
- **Motor:** meta `probe` (lida do mundo, não por evento; `goalsOf/isReady/marksOf/complete` ganham `probe`), `Mission.bonusPerItem` + `bonusFor` (bônus por unidade entregue) e `complete` devolve o que tirou (`taken`).
- **Decisão (missão 04):** a Guilda **paga valor fixo por item** (`SELL_PRICE` em `world/shop.ts`: seda 1, presa 2, pelagem 3, coração da rainha 25); **sem aba Vender** nas lojas por ora.
- **Terreno da 07:** `world/farmPlot.ts` (`planFarmPlot`, 6×4, determinístico pela seed, perto do portão, grama/terra livre, fora de áreas protegidas e do canteiro do Silvano; `World.farmPlot`, `tilledIn`). `RenderOptions.zones` desenha o **contorno dourado** no chão enquanto a 07 está ativa.
- Sem mudança de save (`SAVE_VERSION` 21) nem de protocolo (29): a zona é derivada da seed. Testes novos (`missions.test.ts`, `farmPlot.test.ts`); `tsc` e 662 testes verdes.

## Orvalis v0.93.128 — landing page (pintura a óleo) com Jogar e barra de Entrar/Cadastrar (17/11/2026)
- **Pedido do dono do produto:** uma landing page do jogo (itens, elementos, personagens) em visual **pintado a mão, tinta a óleo**, que explica o jogo e tem o botão **Jogar**; só então muda para a escolha de personagem. Barra superior com **login e cadastro** já pronta, para o jogador entrar logado no futuro.
- **Landing** (`src/landing/landing.ts` + `landing.css`): topo (Orvalis, links, Entrar/Cadastrar), **alto** com o castelo num céu de aurora e o botão **Jogar**, "O que é o Orvalis" (4 cartões), **A Cidade do Despertar** (castelo, Guilda, Ferraria, Hospedaria, Floricultura, Guarita + carvalho, cerejeira, bétula e macieira), **Personagens** (os 6 heróis animados + 8 moradores com retrato), **Itens e elementos** (ferramentas, colheita e espólios, fogueira/caldeirão/forno/cadeira e as 15 Flores Fofas) e chamada final. **Só reaproveita a arte do próprio jogo** (`art()`, `getTownImages()`, `CharacterPreview`): nada de imagem nova.
- **Visual a óleo:** papel/tela com grão (turbulência SVG sobre toda a página), pinceladas por filtro SVG (`#orv-oil`: deformação + grão; `#orv-brush`: título e sublinhados), molduras de tinta dourada com relevo, tipografia de livro antigo (IM Fell English SC + Cormorant Garamond, carregadas só na landing). Responsivo (celular: some o menu de seções).
- **Fluxo** (`main.ts`): mundo normal sem `?seed`/`?personagem` abre a landing; **Jogar** → escolha de personagem (sem mundo salvo, direto ao criador, com **Voltar** para a landing; com mundo salvo, a tela de sempre: Novo jogo / Continuar). Links com `?seed=`, `?personagem=` e o Santuário seguem entrando direto.
- **Contas — só a casca** (`src/auth/session.ts`): barra com **Entrar / Cadastrar** abre um modal (e-mail/senha; nome no cadastro) que hoje responde "as contas chegam em breve" e oferece **Jogar como visitante**. `auth` (`user/signIn/signUp/signOut/onChange`) é o ponto onde o login se encaixa; quando houver sessão, a barra mostra "Olá, nome" e "Sair". Dependência do backend registrada em `NEXT_STEPS`.
- Teste novo (`auth/session.test.ts`); `tsc`, testes e `npm run build` verdes; conferido no navegador (alto, cidade, personagens, itens, modal e Jogar → criador de personagem, sem erros).

## Orvalis v0.93.127 — carvalhos isométricos na câmera Isométrica do Santuário (17/11/2026)
- **Arte do dono do produto:** prancha com 3 carvalhos em perspectiva isométrica (pequeno, médio, grande). Decisões dele: **só para a câmera Isométrica do Santuário** (o mundo normal e as outras câmeras seguem com a arte atual) e **sem o bloquinho de grama** (só a árvore).
- **Arte** (`scripts/extract-oak-iso.py`, `assets-src/trees/oak-iso.png` → `tree-oak-iso.webp`, 90 KB): o brilho verde vira transparência (curva no alfa + maior componente), o bloquinho de grama/terra, as folhas rasteiras, as flores e a pedrinha somem (abaixo da base só fica o tronco marrom ligado ao de cima) e as 3 árvores viram uma **tira de 3 quadros de mesma largura** (como `tree-oak`), base do tronco no pé do quadro.
- **Render:** `BlockTextures.isoOak`; `worldSpriteArt(…, isometric)` troca o `OAK_TREE` por um dos 3 tamanhos (sorteado pela célula) enquanto a câmera é a Isométrica, e **gira o plano 45° em volta do meio da base** (`SpriteDraw.yaw`, `yawPivotOrigin`) para encarar a câmera (azimute 45°). `SanctuaryCameraModes.onChange` → `WorldThreeRenderer` refaz os sprites ao trocar de câmera. Só valem os carvalhos adultos (`OAK_TREE`); muda/jovem seguem iguais.
- Teste novo (`render/three/yawPivot.test.ts`); `tsc`, 655 testes e `npm run build` verdes. **Não conferido no navegador** (a câmera Isométrica só existe na Sala 2 online): ver tamanho, posição do tronco na célula e se encaram bem a câmera.

## Orvalis v0.93.126 — corrige "Versão do jogo diferente da do servidor" na URL do Santuário (16/11/2026)
- **Bug (dono do produto, celular):** abrir a URL do Santuário mostrava "Versão do jogo diferente da do servidor: recarregue a página". **Causa:** `config.ts` (`sanctuaryPage`) mantinha **qualquer** página do Santuário na **grade 1** (regra do Celestial antigo), e o `hello` leva a grade (`sub`): 1 ≠ 2 do servidor (`/saude` mostrava protocolo 29, o mesmo do jogo — o servidor estava certo).
- **Correção:** só o **Santuário Celestial antigo** usa a grade 1 (build fixo `VITE_WORLD=santuario` ou `?celestial=1`); a URL do Santuário (subdomínio ou `?mundo=santuario`) abre a Sala 2 no mundo normal, **grade 2**, igual à do servidor.
- Sem mudança de protocolo, save ou servidor. `tsc` e testes verdes. **Não conferido no navegador/celular** (precisa do site publicado).

## Orvalis v0.93.125 — a URL do Santuário abre direto na Sala 2, na mesma versão do jogo do mundo normal (16/11/2026)
- **Problema (dono do produto):** a URL do Santuário abria uma versão antiga de teste (o Santuário Celestial, mundo plano de nuvens), diferente do mundo normal; só a Sala 2 online usava o mundo novo.
- **Decisão (dono do produto):** abrir **direto na Sala 2 online**, sem modo solo. `main.ts` (`sanctuaryEntry`): a página do Santuário carrega o **mesmo pacote de arte e o mesmo renderer do mundo normal** (`loadArtPack('principal')`, `WorldThreeRenderer`) e entra na sala (`enterSanctuary`) com o nome lembrado ou um nome de Deusa sorteado (`DeusaNNNN`, guardado no aparelho). Joga como a Deusa, em modo criativo, com as três câmeras, no mundo procedural com a Cidade — as mesmas telas, painel e hotbar do jogo atual.
- **Porta do Santuário** (`#sanctuary-gate`): "Entrando no Santuário…"; se o servidor não responde, a conexão cai ou a entrada é recusada, mostra a mensagem e **"Tentar de novo"**; sair da sala volta a ela (não há solo). Fora do site oficial (Artifact, prévias) avisa que o Santuário só abre pelo site.
- **Santuário Celestial antigo:** só com `?celestial=1` (desenvolvimento). Os salvamentos antigos dele ficam intactos.
- Sem mudança de protocolo, salvamento ou servidor. `tsc` e testes verdes. **Não conferido no navegador** (precisa do servidor e da URL do Santuário no ar): abrir a URL, entrar como Deusa, cair a conexão e "Tentar de novo".

## Orvalis v0.93.124 — o Santuário só pela URL do Santuário, com a Deusa; fora do menu do mundo normal (16/11/2026)
- **Correção de rumo (dono do produto):** a Sala 2 é uma **área de criação acessada só pela URL do Santuário, pela personagem Deusa**; não aparece no menu do mundo normal.
- **Menu por página** (`roomsForWorld`, `Menu.online.rooms`): o mundo normal lista só as salas de sobrevivência (Sala 1); o Santuário lista só a sua (Sala 2). `goOnline` recusa sala que a página não oferece ("Esta sala não é acessível a partir daqui").
- **A Deusa é o personagem do Santuário:** `Appearance.goddess` (`net/protocol.ts`), `RoomRules.goddessOnly` (Santuário `true`, Sala 1 `false`); o **servidor** impõe: no Santuário todo mundo entra como Deusa (mesmo que o cliente peça outro corpo) e na Sala 1 a flag some (a Deusa vira a heroína padrão). O aparelho joga como Deusa (`character: 'goddess'`) e os outros jogadores veem o desenho da Deusa (`RemotePlayers`).
- O resto da SPEC não muda (mundo procedural completo + cidade, criativo, 3 câmeras, persistência própria). Sem mudança de `PROTOCOL_VERSION` (continua 29; campo opcional). **Servidor:** `build:net` + `sync-net` e publicar antes do jogo.
- Testes novos (`net/sanctuaryRoom.test.ts`: salas por página e aparência imposta pela sala); `tsc` e 653 testes verdes. Não conferido no navegador (jogar como Deusa na Sala 2 e o menu das duas páginas).

## Orvalis v0.93.123 — Santuário multiplayer: regras de sala centralizadas e testes de sala (PR #239, em rascunho) (16/11/2026)
- **SPEC do dono do produto** (`docs/SPEC_SANTUARIO_MULTIPLAYER.md`): a Sala 2 "Santuário" usa o mesmo mundo procedural e a Cidade do Despertar com seed própria (20261115), em modo criativo, sem tocar na Sala 1.
- **`ROOM_RULES`/`roomRules`** (`net/protocol.ts`): `mode`, `infiniteBlocks`, `collectBlockDrops`, `allowCameraModes`, `protectTown`, `maxBuildLevels` num lugar só, lido pelo cliente (`main.ts`) e pelo servidor (`Room.rules`); sai o `this.id !== 2` do `Room`. Sala desconhecida = regras da Sala 1.
- **Protocolo 29** (lista de salas com `kind`; servidor antigo recusa o cliente novo com "recarregue a página").
- **Testes de sala** (`net/sanctuaryRoom.test.ts`): regras por sala; mesmo gerador e cidade; snapshot de outra sala/seed não restaura; quebrar solta material só na Sala 1; cidade protegida nas duas; dois jogadores constroem e removem em conjunto e o estado volta do snapshot (reinício), sem vazar para a Sala 1. `net.test.ts` agora espera as duas salas.
- **Build:** `tsc`, 650+ testes, `npm run build` e `build:net` verdes; servidor local (`orvalis-servidor` + vendor desta versão) listou as duas salas.
- **Validado pelo dono do produto (16/11/2026)** no aparelho: câmeras (Atual, Isométrica, Primeira pessoa), construção criativa, dois jogadores, persistência e Sala 1 sem regressão. Servidor publicado antes (orvalis-servidor #59).

## Orvalis v0.93.122 — painel do personagem e carteira de moedas que não se perde ao morrer (16/11/2026)
- **Pedido do dono do produto:** o painel do personagem que faltava no botão da hotbar (avatar no canto, personagem de corpo inteiro no centro) e as moedas passarem a viver no painel, sem se perder na morte.
- **Painel** (`game/characterWindow.ts`, arte `assets-src/ui/character-frame.png` → `scripts/make-character-frame.py` → `ui-character.webp`): o branco de fora vira transparente e o do avatar e da caixa central viram buraco (o jogo desenha **atrás** da moldura); os valores baked ("---", "–/–") e o preenchimento da barra de XP são apagados. Mostra título (nome do personagem), **avatar** (rosto e ombros) e **personagem inteiro** (`CharacterPreview` ganhou `still`/`bust`), nível, barra de XP, **ataque** (ataque + arma na mão), **HP** e as **três moedas** (cobre, prata, ouro). Abre pelo **botão Personagem** da hotbar e pela tecla **C**; Esc/X/fora fecham; o jogo pausa enquanto aberto.
- **Pendências do painel:** os 6 espaços de roupa (chapéu, blusa, calça, luvas, anel, sapato) são só arte (não há itens de equipamento); **não existe sistema de XP/nível** (mostra nível 1 e a barra vazia com "—").
- **Carteira** (`game/wallet.ts`): a Moeda de Cobre deixa de ser pilha da bolsa — `Inventory.count/add/take` da moeda leem/gravam a `Wallet` (loja, espólios e missões seguem iguais), `entries()` não a inclui e **`dropOnDeath` não a toca: o dinheiro não se perde mais ao morrer**. 100 de cobre = 1 de prata, 100 de prata = 1 de ouro (`splitCoins`). **Salvamento v21** (`coins`; v20 migra as moedas da bolsa); **sala:** `RoomBag.coins` (protocolo **28**) guarda a carteira no servidor.
- Testes novos (`wallet.test.ts`; migração em `quests.test.ts`); `tsc` e 645 testes verdes; conferido no navegador (painel com 1 de ouro, 23 de prata e 45 de cobre; a morte não leva a carteira).
- **Servidor:** `build:net` + `sync-net` e publicar **antes** do jogo (protocolo 28).

## Orvalis v0.93.121 — Capítulo 1 "O Despertar": motor de missões e as missões 01–03 (15/11/2026)
- **Pedido do dono do produto (ADR 0035):** a Cidade do Despertar vira um lugar a que se volta: história em que a jogadora começa desconhecida e, por missões, ganha dinheiro e reconhecimento; **10 missões narrativas** + **contratos repetíveis** (duas camadas).
- **Motor** (`game/npcBrain/missions.ts`, puro): corrente linear de missões (uma vez cada), metas em paralelo (`have` = inventário, `event` = falar/abater/construir depois de aceitar), entrega ao Mestre da Guilda ou a outro NPC, recompensa em Moedas de Cobre; `sanitizeMissions`. **Salvamento v20** (`SaveData.missions`; v19 migra vazio).
- **Missões** (texto do dono do produto): **01 Um nome na guilda** (registrar-se, conhecer Black e Bento; 8), **02 O pedido do ferreiro** (6 toras de carvalho + 8 pedras brutas **entregues ao Black**; 12), **03 Lobos na estrada** (3 lobos de qualquer cor; 15). O **Mestre Aldric** oferece a próxima (**Aceitar / Agora não**), cobra o andamento e paga; falar com Black/Bento conta na 01.
- **Sinais e diário:** `!` no Mestre quando há missão, `?` azulado em quem recebe a ativa, `?` dourado quando pronta (`Entities.marks` por chave de NPC); **diário** no canto da tela (`Hud.setMission`, `.mission-tracker`) com as metas e o andamento. Falar com NPC nomeado emite o evento "falar".
- **Multiplayer (protocolo 27):** sala → quem abateu: `{t:'killed', k}`; `Room` guarda quem está golpeando (`striker`); `NetSession.onKilled` → `Game.missionEvent`. Construir (`place`) também conta (usado nas próximas missões).
- Testes novos (`npcBrain/missions.test.ts`, `killed` em `net/villagers.test.ts`); `tsc` e 640 testes verdes; conferido no navegador (oferta com botões, diário, Black e Bento, 8 moedas e a próxima missão oferecida).
- **Servidor:** `build:net` + `sync-net` e publicar **antes** do jogo (protocolo 27).
- **Próximo:** missões 04–07, 08–10 e os contratos repetíveis (ver ADR 0035).

## Orvalis v0.93.120 — a Guilda dos Aventureiros por dentro e o Mestre da Guilda (15/11/2026)
- **Pedido do dono do produto:** incluir a imagem de dentro da Guilda (base do Capítulo 1 — "O Despertar": missões e contratos saem da guilda).
- **Cômodo** (`world/interiors.ts`, `GUILD_INTERIOR`, 24 × 18): estantes, mapa e armas no fundo, balcão no meio, quadro de contratos à esquerda, lareira à direita, quatro mesas, tapete central e entrada larga (6 colunas de capacho) entre os pilares. Arte `assets-src/interiors/guild.png` → `interior-guild.webp` (`scripts/extract-interiors.py` + `optimize-assets.py`), registrada em `render/art/principal.ts`. **Vai no fim de `INTERIOR_DEFS`:** os outros cômodos não mudam; o da **tenda anda uma posição** (quem salvou dentro de uma tenda reabre na rua).
- **Mestre da Guilda** (`game/residents.ts`, `GUILD_MASTER`): **Mestre Aldric**, "primo" do guarda Noel (folha e retrato emprestados, cores trocadas no shader), fixo atrás do balcão, em toda seed. `NpcRole` ganha `guild`; `ResidentDef.role`; entra no `residentRoster` (id `guild`: o aparelho na sala o reconhece). Por enquanto só conversa; **as missões do Capítulo 1 saem dele** (próximas entregas).
- Testes novos (`world/guild.test.ts`) e ajustados (`villager`, `residents`, `florist`); `tsc` e 629 testes verdes; conferido no navegador (interior e balcão).
- **Servidor:** `build:net` + `sync-net` (cômodo novo e morador novo na sala).

## Orvalis v0.93.119 — a missão do Silvano pede UMA flor específica, e a seed garante o canteiro (15/11/2026)
- **Pedido do dono do produto:** a missão deve especificar a flor e aceitar só ela (senão fica fácil demais); basta garantir que a seed tenha essa quantidade por perto.
- **Canteiro garantido** (`world/flowerPatch.ts`, `World.flowerPatch`): a espécie sai da seed (`patchSpecies`, 1 das 15) e o gerador põe **10 flores dela** numa clareira de grama livre de 6 × 6 células, **o mais perto possível do portão** (faixas de 20 células a partir de 20, até 140; testado em 8 seeds), fora da cidade, da vila e da trilha, da caverna, da dungeon e dos acampamentos de goblins. `FlowerPatchTerrain` entra na geração do chunk (como o acampamento de goblins: edições do jogador valem por cima). **Muda o mapa de todas as seeds do Mundo da Cidade** (uma clareira nova de flores no campo).
- **Missão** (`npcBrain/quests.ts`, `healingHerbsFor(world)`): pede **6 da espécie do canteiro** e só ela vale (outras não contam; `haveOf`/`takeOf`); a conversa diz o **nome da flor**, **para que lado do portão** (`compass`, 8 pontos) e **a quantos passos**; o acompanhante só comenta ao ver **aquela** flor. Se o mundo já foi mexido e o canteiro tem menos de 6 flores, a missão **não é oferecida** (aceita nunca é retirada). A flor do campo que o mundo sorteia continua soltando a espécie vista (v0.93.118), então outras do mesmo tipo podem aparecer pelo mapa.
- **Servidor:** `build:net` + `sync-net` (a sala gera o mesmo canteiro). Mundos já salvos: chunks que o jogador já editou não ganham a clareira (a missão só é oferecida se houver 6 flores).
- Testes novos (`world/flowerPatch.test.ts`, `npcBrain/quests.test.ts`); `tsc` e 632 testes verdes; conferido no navegador (texto da conversa e a clareira).

## Orvalis v0.93.118 — as flores do campo são as 15 Flores Fofas: quebra, bolsa, hotbar e recolocar (15/11/2026)
- **Bug (dono do produto):** a flor colhida no campo aparecia como um **quadrado em branco** na hotbar. Causa: na v0.93.116 a `Block.FLOWER` genérica virou coletável, mas só as 15 Flores Fofas têm ícone.
- **Correção:** a flor do campo agora solta **a espécie que se vê ali** — `wildFlowerIndex(seed, x, y)` (`world/blocks.ts`) é a mesma conta do desenho (`worldSpriteArt`) e do drop (`breakDrops(…, at)`); quem quebra uma flor leva exatamente aquela, com o ícone e o nome dela, e recolocada ela volta igual (todas as 15 aparecem pelo mapa). `Block.FLOWER` deixa de ser coletável. O local de quebra passa ao `breakDrops` no aparelho (`ActionController`) e na sala (`Room`).
- **Missão Ervas de cura** passa a aceitar **qualquer** das 15 espécies (6 no total, somando as pilhas; `haveOf`/`takeOf`); a Flor genérica da v0.93.116 ainda vale para quem já a carregava.
- Sem mudança de save/protocolo; **servidor:** `build:net` + `sync-net` (a sala solta o item). Testes novos; `tsc` e 627 testes verdes; conferido no navegador (6 flores quebradas dão 4 espécies, ícones na hotbar).

## Orvalis v0.93.117 — a sala (servidor) simula os moradores: protocolo 26 (15/11/2026)
- **Pedido do dono do produto:** o servidor passa a simular os moradores (antes cada aparelho tinha os seus, em lugares diferentes). Decisão no ADR 0034.
- **Sala** (`net/room.ts`): carrega a cidade, os cômodos e a vila ao nascer (uma vez; ~560 chunks, ~0,5 s) e roda `spawnVillagers` + `spawnResidents` — 16 nomeados + 8 sorteados na cidade + 5 na vila, a **rotina do Bento com a hora da sala** (dorme de madrugada e some da lista) e o passeio. O morador parado se vira para o **avatar mais perto**. Só os que estão a até 22 células de cada jogador vão em `mobs`.
- **Protocolo 26:** `MobState` ganha `u` (id do sorteado), `a` (desbotar) e `g` (jogador que ele acompanha); cliente → sala `talk {id,on}` e `escort {id,on}`; sala → cliente `escort {id,ok}`. Conversa **segura o morador parado para todos** (solta ao terminar, ao sair do jogador ou após 120 s); **acompanhar é um jogador por vez** (outro recebe `ok:false` e "ele já está ajudando outra pessoa"; o dono o leva embora, e quando sai ele volta ao posto andando).
- **Aparelho** (`game/creatureMirror.ts`): o espelho cria `Villager`s (nomeados e sorteados — nome, cores e falas saem da seed pelo id, `residentRoster`) em `Entities.villagers`; `Entities.update` não os simula em modo `remote`. Na sala o jogo **não** cria moradores locais. `Villager.talkHook` avisa a sala ao conversar; loja fechada do Bento agora usa a hora do mundo (igual sozinho e na sala).
- **Missão na sala** (`Game`): aceitar pede o acompanhante à sala (negado = a missão volta a ser oferecida); se ele volta ao posto (reentrou na sala), o aparelho pede de novo quando o vê (a cada 5 s; negado, tenta a cada 30 s).
- **Servidor:** `build:net` + `sync-net` e deploy **antes** do jogo (`PROTOCOL_VERSION` 26; sem mudar `ROOM_SNAPSHOT_VERSION`: moradores não são salvos, nascem pela seed).
- Testes novos (`net/villagers.test.ts`, `game/creatureMirror.test.ts`); `tsc` e 625 testes verdes. **Não testado:** sala real com várias pessoas (Hostinger) e a banda com muita gente.

## Orvalis v0.93.116 — primeira missão: Silvano pede flores e acompanha a jogadora (nível 4 da IA dos NPCs) (15/11/2026)
- **Pedido do dono do produto:** um NPC explica uma missão (encontrar flores por um motivo), acompanha a jogadora se ela aceitar e mostra um **sinal sobre a cabeça**. Escolhas dele: **Silvano** (herbalista), motivo **ervas de cura**, **recompensa em moedas**, acompanhante que **segue e comenta**.
- **Missão** (`game/npcBrain/quests.ts`, puro): "Ervas de cura" — 6 **Flores silvestres** (a flor que nasce no capim) para o remédio de uma criança da cidade; recompensa 12 Moedas de Cobre. Fases `available → active → ready → done`; o estado salvo é só `active`/`done` (a fase `ready` sai da contagem no inventário). A ajuda conta como favor na memória do NPC (relação sobe).
- **Sinal** (`Actor.mark`, `three/actorBillboards.ts`): **!** dourado oferece; **?** azulado = em andamento; **?** dourado = pronta para entregar; saltita de leve sobre a cabeça. `Game.updateQuests` recalcula todo quadro.
- **Conversa com escolhas** (`dialogue.ts`, `Conversation.prompt/choices`, CSS `.dlg-choice`): explicação em páginas + pergunta final com **Aceitar / Agora não**; só uma escolha fecha. É o primeiro uso de botões na caixa de conversa.
- **Acompanhante** (`Villager.setCompanion/escort`): anda atrás da jogadora a ~2 células (de frente para ela), **corre** para alcançá-la, **reaparece ao lado** se fica longe demais (> 18 células) e **volta ao posto andando** ao terminar; para quando está conversando. Ao **carregar o jogo no meio da missão** ele vem para perto. Comenta ao ver flor por perto (toast, a cada ~30 s).
- **Flor silvestre coletável** (`world/items.ts`): `Block.FLOWER` passa a devolver o próprio item ao quebrar em mundo com coleta (antes não dava nada). Os outros mundos não mudam.
- **Salvamento v19** (aditivo): `SaveData.quests`; v18 migra sem missões. Só no aparelho (a sala não simula moradores): sem protocolo novo.
- Testes novos (`npcBrain/quests.test.ts`) e ajustados (`collect`, `save`); `tsc` e 618 testes verdes; conferido no navegador (sinal, conversa com botões, seguir, entrega e moedas).

## Orvalis v0.93.115 — memória dos NPCs no salvamento (nível 3 da IA dos NPCs) (15/11/2026)
- **ADR 0034, nível 3:** `game/npcBrain/memory.ts` (puro): por morador, `talks` (conversas/visitas à loja) e `bought` (compras); **relação 0–100** (conversa = 6, compra = 4) e faixas **estranho → conhecido → amigo → íntimo**. Chave = id do nomeado ou do sorteado (`rt3`, `rv1`…).
- **Falas por condição** (escritas, nada gerado): quem já conhece a jogadora a recebe com uma frase de reencontro **na primeira fala da sessão**; **Bento e Rosendo** cumprimentam na janela da loja conforme a faixa (`shopGreeting`); toda conversa e visita à loja conta, e cada compra soma ao morador.
- **Salvamento v18 (aditivo):** `SaveData.npcMemory`; `migrate` v17 → v18 começa vazio; `applySave` valida (`sanitizeBook`). Memória vive em `Entities.memory`; **a sala/servidor não guarda** (sem protocolo novo).
- Testes novos (`npcBrain/memory.test.ts`; `save.test.ts` para v18); `tsc` e 614 testes verdes; smoke no navegador (conversa conta no livro).

## Orvalis v0.93.114 — moradores percebem a jogadora (nível 2 da IA dos NPCs, primeira reação) (15/11/2026)
- **ADR 0034, nível 2 (reativo), passo mínimo:** `Entities.update` vira para a jogadora todo morador **parado** (não andando, não conversando, à vista) a até `NOTICE_RANGE` (3 células antigas × `SUBDIV`). Vale para os 16 nomeados e os sorteados; sem estado novo, sem save, sem protocolo; só no aparelho.
- **Fica para depois (nível 2):** cumprimentar com balãozinho, fugir de lobo/perigo perto da vila e da cidade, aviso da Guarita.
- Teste novo (`npcBrain/schedule.test.ts`); `tsc` e testes verdes.

## Orvalis v0.93.113 — moradores sorteados: recolor no shader + nome, profissão e falas por seed (cidade e vila) (15/11/2026)
- **ADR 0034 (decisão do dono do produto):** mais gente sem arte nova nem peso extra. `game/residents.ts` (puro, sem DOM/`Math.random`) sorteia pela seed **8 moradores na cidade e 5 na vila** (`RESIDENTS_TOWN`/`RESIDENTS_VILLAGE`): cada um é um **"primo"** de um morador comum (13 folhas emprestadas, sem os de ofício), com **nome** (48 nomes, nenhum repete NPC nomeado nem outro sorteado), **profissão** (cidade: guarda, escriba, alfaiate…; vila: agricultor, pastor, lenhador, tecelão, ordenhador, cuidador de galinhas), **personalidade** (alegre, tímido, curioso, ranzinza, sonhador) e **2 falas** (profissão + jeito de ser). Mesma seed = mesmas pessoas.
- **Recolor** (`render/three/actorBillboards.ts`, `uRecolor`): no shader do billboard, gira o **matiz** e ajusta saturação/brilho de tudo o que é colorido **menos a pele** (matiz laranja claro) e os neutros — cabelo e roupa mudam, o rosto não. `Look {hue, sat, val}` vai em `Actor.look`; os 16 nomeados não são alterados. Conferido em lineup (13 folhas × 4 cores).
- **Execução:** `Entities.spawnResidents` (depois de `spawnVillagers`; `homesFor` ganhou `taken`/`spacing`; `placeVillager` extraído) e `Villager` aceita `resident` (nome/falas/`look`; `npc` = folha e retrato emprestados). Na cidade andam pelas ruas; na vila, dentro do muro, a partir de pontos nos caminhos de terra. Só no aparelho: a sala **não** simula moradores (sem protocolo/save novos; `build:net` segue passando).
- Testes novos (`residents.test.ts`); `tsc` e 608 testes verdes; conferido no navegador (cidade e vila).

## Orvalis v0.93.112 — prédios da cidade centrados na porta e na rua (15/11/2026)
- **Bug (apontado pelo dono do produto na Floricultura):** a rua não chegava à porta e a entrada ficava à direita da porta desenhada. Causa: `townArt.imageSprite` calculava o centro do desenho com a largura do lote em **células antigas**, mas o 3D amplia os prédios por `objectScaleFor` (= `SUBDIV`) e o lote real tem `w × SUBDIV` células finas — o desenho ficava ~2 células antigas à esquerda do lote (valia para todos os prédios da cidade, não só a Floricultura).
- **Correção:** `lotW = w * objectScaleFor(shape)` (a vila, em células finas, não muda). Rua, porta e entrada (`door`) já estavam certas; só o desenho andou. Sem mudança de gerador, mapa, save ou protocolo. `tsc` e 603 testes verdes; conferido no navegador (Floricultura e Hospedaria).

## Orvalis v0.93.111 — rotina do Bento: abre, fecha, vai dormir pela porta dos fundos (nível 1 da IA dos NPCs) (15/11/2026)
- **Piloto do ADR 0034:** agenda pura em `game/npcBrain/schedule.ts` (`BENTO_SCHEDULE`: acorda 6h, abre 7h, fecha 19h30, dorme 21h; `phaseAt`, `shopOpen`, `closedLine`), sem DOM nem `Math.random`.
- **`Villager`** ganha estados `post → goHome → leaving → asleep → arriving → post`: ao anoitecer o Bento anda até o ponto dos fundos do Mercado (travado 2 s, chega de uma vez), **desbota (fade 1,2 s) e some** (oculto: sem colisão, sem conversa, fora de `actors`); de manhã reaparece lá e volta ao posto. Mundo aberto de madrugada já o encontra dormindo. Sem relógio (`Entities.time = -1`, como na sala do servidor) não há rotina.
- **Loja:** fora do horário (`opening`/`closing`) tocar nele abre só o diálogo ("ainda estou arrumando…" / "já fechei por hoje…") em vez da janela.
- **Render:** `Actor.fade?` aplicado à opacidade do desenho e da sombra no `ActorBillboards`. `Game` atualiza `entities.time` todo quadro.
- Sem protocolo/servidor/save novos (moradores só rodam no aparelho). Testes novos (`npcBrain/schedule.test.ts`); `tsc` e 603 testes verdes; conferido no navegador (de dia aberto, à noite sai de cena).

## Orvalis — plano de inteligência dos NPCs (só documentação, 15/11/2026)
- **ADR 0034** (`docs/adr/0034-inteligencia-dos-npcs.md`): os 4 níveis (rotina, reativo, memória, objetivos), técnica (Utility AI + módulo puro `npcBrain`), piloto no Bento, "dormir" pela porta da casa e mais moradores por recolor no shader + sorteio por seed — decisões do dono do produto. **Nada de código ainda;** `DECISIONS`, `NEXT_STEPS` e `domains/npc.md` apontam para ele.

## Orvalis v0.93.110 — Floricultura na cidade, com a florista Rosendo e as 15 Flores Fofas à venda (15/11/2026)
- **Pedido do dono do produto:** incluir a floricultura (imagens de fora e de dentro), numa área do mapa da cidade ("pode retirar casas marrons se precisar"), com **um NPC fixo** que vende as **15 flores do jogo**, que passam a ser **ícones da hotbar** e podem ser **colocadas no mapa** pelo jogador — **sem efeito real, só visual**.
- **Construção** (`world/town.ts`, `world/blocks.ts`): `Block.FLORIST` (130), lote 9 × 5 (como a Hospedaria), reservada **antes das ruas** com as outras obrigatórias, a oeste da Praça Central logo abaixo da Guilda (`place(FLORIST, W/2 − 28, MID + 6)`). As ruas e as casas se reorganizam em volta (a cidade é gerada com semente fixa, então segue igual em toda seed; **nenhuma casa marrom precisou sair à mão**: as casas são sorteadas depois e se encaixam no espaço que sobra). Arte `assets-src/town/florist.png` → `town-florist.webp` (`scripts/extract-town.py`, 9 células de fundação, 9,4 × 4,9 células de desenho).
- **Interior** (`world/interiors.ts`, `FLORIST_INTERIOR`, 24 × 13): prateleiras ao fundo, balcão no meio, dois canteiros à frente e a entrada de 2 células; arte `assets-src/interiors/florist.png` → `interior-florist.webp` (`scripts/extract-interiors.py`). **Vai no fim de `INTERIOR_DEFS`**: os cômodos da Ferraria e do Mercado não mudam de lugar; o da **tenda passa a ficar uma posição adiante** (fixa em toda seed; quem salvou dentro de uma tenda reabre na rua, como já acontecia).
- **Florista** (`game/npcs.ts`, `FLORIST_KEEPER`, `Entities.spawnVillagers`): **Rosendo (o Jardineiro)** passa a morar atrás do balcão da Floricultura (papel `florist`, como o Bento no Mercado) em vez de passear pelas ruas — ele já tinha cabelo rosa, colete verde e fala de flores, e não precisou de arte nova. Os moradores das ruas passam de 14 para 13. Tocar nele abre a loja.
- **Loja** (`world/shop.ts`, `game/shopWindow.ts`): `ShopOffer.item` agora é uma pilha (`StackId`), então a vitrine pode vender **blocos**; `FLORIST_STOCK` = as 15 flores na ordem da lista, **2 Moedas de Cobre cada** (preço provisório). A janela da loja ganhou título, fala e categoria por loja (`ShopStyle`: "Mercado/Consumíveis" e "Floricultura/Flores") e usa `name`/`icon` por pilha.
- **As 15 Flores Fofas** (`Block.FLOWER_*`: ids 10–19, 146–149 e 249; `FLOWER_BLOCKS`, `isFancyFlower`): blocos de enfeite (`decoration`, sem colisão), colocáveis e quebráveis com a mão (voltam como o próprio item; `COLLECTABLE`), na hotbar do Mundo principal (58 blocos; fora do Santuário), balançam ao vento como o capim. Sprite = o quadro da própria flor em `flowers.webp`; ícone = `icon-flower-NN.webp` (64 × 64, gerados por `scripts/extract-flowers.py`). **Sem efeito nenhum além do visual.** A Flor sorteada do mundo (`Block.FLOWER`) continua à parte.
- **Servidor:** blocos novos e cidade nova → `build:net` + `sync-net` e publicar o servidor **antes** do jogo (sem mudar `PROTOCOL_VERSION` nem `ROOM_SNAPSHOT_VERSION`; as células protegidas da cidade voltam do gerador ao abrir mundos e salas já salvos).
- Testes novos (`world/florist.test.ts`) e ajustados (`villager.test.ts`, `santuario.test.ts`); `tsc` e testes verdes (grades 1 e 2); conferido no navegador (fachada, interior com a Rosendo, janela da loja com as 15 flores, compra, flores colocadas no campo).

## Orvalis v0.93.109 — fumaça de verdade subindo pelas chaminés da vila (3D) (15/11/2026)
- **Pedido do dono do produto:** as casas com fumaça desenhada na chaminé ganharem fumaça animada quando o jogador olha para elas. Escolhas dele: **só a vila** nesta rodada (as 5 casas que já tinham fumaça desenhada) e **limpar os puffs da arte por script**.
- **Arte** (`scripts/extract-village.py`, `SMOKE_RIM`/`erase_smoke`): os puffs desenhados acima da chaminé das 5 casas (3 de palha e 2 de telha) são apagados (retângulo acima do topo de pedra, à direita de x = 90); a imagem não é recortada de novo, então as coordenadas medidas continuam valendo. A brasa na boca da chaminé fica.
- **Fumaça** (`three/chimneySmoke.ts`): `THREE.Points` (1 desenho, pool de 56 puffs): puffs macios que nascem na boca da chaminé a cada ~0,45 s (ritmo e fase por chaminé), sobem devagar, crescem, derivam com o vento (que varia no tempo e pega mais quanto mais alto) e somem em ~3 s; **só as chaminés dentro da tela** soltam puffs; à noite ficam mais discretos e azulados. Sem `Math.random` (hash). `?sensacao=0` e os cômodos ficam sem.
- **Posição** (`townArt.CHIMNEY_MOUTH`/`chimneyMouths`, `chimneyWorldPos`): a boca de cada variante (px da imagem) vira posição 3D com a mesma geometria do `ChunkSprites` (base na face sul da célula, ampliação `objectScaleFor`); `WorldThreeRenderer.villageChimneys` as calcula uma vez a partir de `World.village.props`.
- Só cliente e só 3D; sem mapa, save ou protocolo (servidor não muda). Testes novos (`chimneySmoke.test.ts`); `tsc` e testes verdes (grades 1 e 2); conferido no navegador (puffs subindo e derivando).

## Orvalis v0.93.108 — migração dos animais da vila nas salas do servidor (15/11/2026)
- **Pedido do dono do produto:** "migração dos mundos apenas sala do servidor; os mundos salvos não precisam migrar" — as salas já gravadas passam a ter 3 de cada animal na vila (a regra da v0.93.106), e os mundos salvos no aparelho ficam como estão.
- **Regra** (`Entities.reconcileVillageAnimals`): ao abrir uma sala gravada com `RoomSnapshot` **< 7**, dentro da vila fica no máximo 3 de cada espécie (adultos primeiro; sobram os filhotes e os extras saem), o **cavalo antigo do campo** diante do portão sai (os cavalos moram na vila) e o que falta nasce nas faixas (`VILLAGE_PENS`, `spawnVillageAnimals(world, have)`). Bichos fora da vila não são tocados. A sala marca `dirty` e a próxima gravação já sai como v7; abrir a v7 não mexe em nada.
- **Versão:** `ROOM_SNAPSHOT_VERSION` 6 → **7** (o servidor lê v1–v7; um arquivo v7 não abre em servidor antigo). `PROTOCOL_VERSION` não muda. Servidor: `build:net` + `sync-net`.
- Teste novo (sala gravada v6 com ovelhas 4, vacas 2, galinhas 4, capivaras 3 e 1 cavalo no campo → 3 de cada, todos os cavalos dentro da vila, regrava em v7 e não mexe de novo); `tsc` e testes verdes (grades 1 e 2).

## Orvalis v0.93.107 — sobras do Canvas 2D e aviso melhor para aparelhos sem WebGL (15/11/2026)
- **Pedido do dono do produto:** "segue com as sobras e um aviso melhor pro WebGL" (o muro e o portão da vila ficam como estão: são estacas; sons ficam para o futuro).
- **Sobras removidas:** a cena de desenvolvimento `?materiais=1` (`dev/materialsScene.ts`) e o que só ela usava do motor 2D — `textures.qaMaterial`, `cubeSpriteV2`, `drawCubeParts`, `shapePath`, e em `materialsV2.ts` `cubeEdges`, `CubeView`, `CubeEdges`, `edgesKey`, `v2LevelFaces`, `materialsV2Ready` (com os testes de `cubeEdges`). O painel `?fps=1` perdeu o rótulo "2D": `perfLine(snap, gpu, heap, js)` mostra sempre "3D" e o relatório não tem mais o campo `renderer`. Revisado: o resto do `textures.ts` (`objects`, `variants`, `stackDraw`, `doorFrames`, `gateFrames`, transições…) é usado pelo 3D e pelo `ChunkRenderer` e fica.
- **Aviso melhor** (`game/unsupported.ts`): uma camada com título, o motivo provável, **dicas por navegador** (Chrome/Edge, Firefox, iOS, outro; atualizar driver; abrir no navegador do aparelho se estiver dentro de um app) e dois botões — **Tentar de novo** (recarrega) e **Copiar detalhes** (causa + navegador + endereço). Duas causas: `no-webgl` (aparelho sem WebGL ou desligado) e `load-failed` (o módulo do renderer não carregou: conexão; avisa que o progresso está salvo). Sem `alert`/`confirm` (o iframe do Artifact os bloqueia). Textos puros e testados (`unsupportedInfo`, `unsupportedDetails`).
- Só cliente; sem mapa, save ou protocolo (servidor não muda). `tsc` e testes verdes; conferido no navegador (sem WebGL e com o módulo bloqueado).

## Orvalis v0.93.106 — 3 de cada animal na vila: cavalos, galinhas, capivaras, ovelhas e vacas (15/11/2026)
- **Pedido do dono do produto:** "cavalos, galinhas, capivaras, ovelhas e vacas, 3 de cada nascendo na vila. No mundo e no servidor".
- **Regra** (`game/entities.ts`): `VILLAGE_ANIMALS_EACH = 3` e uma faixa nova de gramado para os **cavalos** no sudeste da vila (30–44 × 40–42, junto ao muro); antes eram ovelhas 4, vacas 2, galinhas 4, capivaras 3 e 1 cavalo no campo diante do portão da cidade (que deixa de nascer quando há vila). Sem vila (grade 1), nada muda.
- **No servidor:** a sala roda as mesmas `Entities.spawnWildlife`, então vale o vendor novo (`build:net` + `sync-net`; sem mudar `PROTOCOL_VERSION`). **Mundos e salas já salvos mantêm os animais que tinham** (o salvamento guarda os bichos); a regra vale para mundos e salas novos.
- Teste da vila atualizado (3 de cada, dentro da vila, em grama, nenhum cavalo extra); `tsc` e testes verdes (grades 1 e 2); conferido no navegador (3 de cada; cavalo no gramado do sudeste).

## Orvalis v0.93.105 — o modelo 3D vira o único: o Canvas 2D é removido (M7) (15/11/2026)
- **Decisão do dono do produto:** "vamos assumir o modelo 3D como padrão já que funcionou muito bem. E podemos excluir o 2D do projeto" — a limpeza M7 da ADR 0031.
- **Removido:** `render/renderer.ts` (o Canvas 2D do Mundo e do Santuário, ~680 linhas), `?render=2d` e `chooseWorldRenderer`, a cena de escala (`?escala=1`, `dev/scaleScene.ts`, `scaleLayout.ts` + teste), `scripts/parity-3d.cjs` e `docs/PARITY_3D.md` (comparação 2D × 3D), `drawThinHorizontalWall` (parede fina do 2D), `TOWN_REACH`, e as fissuras radiais do overlay (`drawBreakingCracks` virou `drawBreakingRing`: só o anel de progresso; as rachaduras são os decalques do bloco).
- **Movido:** `RenderOptions` passou do `renderer.ts` para `render/rendererContract.ts`, e `GameRenderer` agora é uma interface explícita (draw, pick, addDamage, iconFor) em vez de `Pick<Renderer, …>`.
- **Comportamento:** `Game` exige `rendererFactory` (a vitrine do título também usa o 3D); `main.ts` carrega o renderer do mundo por `import()` e, **sem WebGL ou se o módulo falhar, mostra um aviso na tela** em vez de cair no 2D (`showUnsupported`). `useSolidPhysics(search)`: física sem degrau sempre, `?fisica=degrau` desfaz. O `ChunkRenderer` fica (pinta o chão de cada chunk).
- Só cliente; sem mapa, save ou protocolo (servidor não muda). `tsc` e testes verdes (grades 1 e 2); conferido no navegador (título com a vitrine em 3D; jogo; `?render=2d` abre o 3D) e `build`/`build:artifact` (o início do Artifact segue ~4,8 MB, como antes: o orçamento de 3 MB já estava estourado).
- **Aparelhos sem WebGL** deixam de abrir o jogo (antes caíam no Canvas 2D). O 3D já era o padrão e rodou bem em celular e tablet do dono do produto.

## Orvalis v0.93.104 — portão de lado (cercas norte-sul) (15/11/2026)
- **Pedido do dono do produto:** o portão 3D só entrava de frente, sem se adaptar; pediu a versão lateral.
- **Arte** (`scripts/extract-fence-model.py`, `render.html` com `yaw=90`): o mesmo modelo do portão girado 90° — as estacas ficam uma atrás da outra (norte e sul) e a folha, presa à dobradiça do norte, **abre para leste**. 3 tiras (Carvalho, Bétula, Cerejeira) `fence-gate-side*.webp`, 5 poses de 224 × 400, base das estacas em (112, 300).
- **Escolha** (`render/fence.ts`, `gateIsSide`): de lado quando a cerca vizinha está ao **norte e/ou ao sul** e não há leste/oeste; senão (leste-oeste, solto, cruzamento) de frente. Vale no 3D (`framesAt` do `DoorSprites`) e no 2D de reserva; mesma animação de 10 quadros. A orientação acompanha as vizinhas ao construir/quebrar.
- Só aparência: sem mapa, save ou protocolo (servidor não muda). Teste novo de `gateIsSide`; `tsc` e testes verdes; conferido no navegador (3 portões, fechados e abertos, em cerca norte-sul).

## Orvalis v0.93.103 — efeitos de picareta, pá, enxada e espada para cima e para baixo (3D) (15/11/2026)
- **Pedido do dono do produto:** "segue picareta, enxada, pá e espada para cima e para baixo" — 5 pranchas novas (`assets-src/efeitos/`: `picareta-pedra`, `pa-terra`, `enxada-arar`, `espada-cima`, `espada-baixo`; os nomes foram **deduzidos do desenho**, já que os arquivos vieram sem nome: confirmar).
- **Arte** (`scripts/extract-fx.py`): +5 tiras de 12 quadros 128 × 128 (`fx-slash-up/-down`, `fx-rock`, `fx-soil`, `fx-till`). A prancha da pá veio com uma **névoa translúcida na prancha toda** (alfa ~77–107): o alfa abaixo de 110 é cortado e o resto reescalado (`HAZE`), e o RGB solto dos pixels transparentes é refeito como nas outras.
- **Render** (`worldThreeRenderer.stepBreak`, `three/spriteFx.ts` com 8 `FxKind`): no instante do golpe — espada para **cima** e para **baixo** com os cortes próprios (os lados seguem com o corte espelhado); **picareta**: clarão e pedrinhas no topo do bloco que se quebra; **pá**: terra jogada no bloco/chão que se cava (o buraco final segue com o efeito de cavar); **enxada**: terra revirada na célula-alvo (foco/hover válido).
- Só cliente e só 3D (`?sensacao=0` e cômodos ficam sem); sem mapa, save, protocolo ou `RenderOptions` novo (servidor não muda). `tsc` e testes verdes (grades 1 e 2); conferido no navegador por código (cada ferramenta toca o efeito certo) e por captura.

## Orvalis v0.93.102 — efeitos de golpe em quadros: espada, machadada e buraco; lascas no instante da pancada (3D) (15/11/2026)
- **Pedido do dono do produto:** 3 pranchas de efeito (buraco, corte de árvore, ataque de espada); sobre a estrela do corte de árvore: "pode reduzir ou pular a vontade"; sobre a espada: "espelha".
- **Arte** (`scripts/extract-fx.py`, fontes em `assets-src/efeitos/`): pranchas 4 × 4 de 1254 px (quadros de 313,5 px, recortados com arredondamento) → tiras de quadros 128 × 128 (`fx-dig` 12 quadros, `fx-tree` 10, `fx-slash` 12). O RGB dos pixels quase transparentes (fios vermelhos/amarelos) é refeito a partir da vizinhança opaca (sem halo na filtragem). O corte de árvore **pula os 4 primeiros quadros** (a estrela grande) e é tocado menor (2 células); os 4 últimos quadros do buraco (buraco parado) ficam de fora.
- **Render** (`three/spriteFx.ts`): pool de 12 planos voltados para a câmera, por cima do mundo (sem teste de profundidade), que tocam os quadros (dig 16 fps, tree 22, slash 26). Espada: no **instante do golpe** (`Player.impacts`, novo contador incrementado em `consumeHit`), à frente do personagem, **espelhada** para esquerda e para cima; machado: no pé da árvore atingida; buraco: quando o chão atingido vira `HOLE` (cobre a troca de textura).
- **Lascas no impacto** (era o próximo pendente da quebra): com ferramenta de golpe na mão, as lascas saem no instante da pancada (`hit`) em vez de a cada 0,2 s; sem ferramenta (mão), segue o ritmo fixo.
- Só cliente e só 3D (`?sensacao=0` e cômodos ficam sem); sem mapa, save, protocolo ou `RenderOptions` novo (servidor não muda).

## Orvalis v0.93.101 — lascas também ao cortar árvore e ao quebrar plantas (3D) (15/11/2026)
- **Seguindo a ordem combinada** dos pendentes da animação de quebrar: lascas em outros alvos além dos blocos.
- **Cores** (`breakFx.chipColor`): árvore solta **casca** (marrom), flor **pétalas** (rosa), capim, plantas e culturas **folhas** (verde); portas, portões e cercas já soltavam lascas de madeira. As árvores continuam com o tremor e as folhas de antes (v0.93.83), agora com casca no pé.
- **Render** (`worldThreeRenderer.stepBreak`): o filtro que excluía árvores saiu; o estouro final vale para plantas e árvores (a árvore estoura ao sair do mapa, junto do tombo). As rachaduras em pixel-art ficam só nos cubos e no chão (não aparecem sob uma flor ou árvore).
- Só cliente e só 3D (`?sensacao=0` desliga); sem mapa, save ou protocolo (servidor não muda). `tsc` e testes verdes (grades 1 e 2); conferido no navegador (flor, capim, árvore, porta).

## Orvalis v0.93.100 — rachaduras em pixel-art na quebra, sem as listras (3D) (15/11/2026)
- **Pedido do dono do produto:** não gostou das "ranhuras em listras" da animação de quebrar. Testou o **desgaste em pixels** (covinhas e mordidas; descartado: "não gostei") e depois a **opção 1, rachaduras em pixel-art**, que ficou.
- **Causa das listras:** havia DUAS camadas de linhas no 3D — as fissuras vetoriais da v0.93.98 e, por cima, as fissuras radiais antigas do overlay (`drawBreakingCracks`, linhas saindo do centro + véu escuro).
- **Rachaduras em pixel-art** (`three/breakCracks.ts`, `TOP_CRACK`/`FRONT_CRACK`): bitmaps desenhados à mão de 16 × 16 (topo) e 16 × 4 (frente) na grade de pixels do bloco, `NearestFilter`; cada pixel traz o estágio (1–4) em que aparece, então a rachadura cresce a partir do centro (linha principal → ramos NE/SO → ramos curtos) em vez de trocar; traço escuro de 1 px com fio claro na diagonal de baixo; variante espelhada por célula. Sem semente aleatória.
- **Overlay:** `drawBreakingCracks(…, ringOnly)`: com a "sensação" ligada o 3D desenha só o **anel de progresso** (sem fissuras radiais nem véu); o 2D de reserva e `?sensacao=0` mantêm o desenho antigo.
- Só cliente e só 3D; sem mapa, save ou protocolo (servidor não muda). `tsc` e testes verdes.

## Orvalis v0.93.99 — portões de Bétula e de Cerejeira (blocos novos) (15/11/2026)
- **Pedido do dono do produto:** as cercas de Bétula e de Cerejeira apareciam, mas **os portões dessas madeiras não existiam** (havia só o de Carvalho, que tomava a madeira da cerca vizinha). Agora são **blocos próprios**.
- **Blocos** (`world/blocks.ts`): `FENCE_GATE_BIRCH` (77) / `_BIRCH_OPEN` (78) e `FENCE_GATE_CHERRY` (79) / `_CHERRY_OPEN` (99), no lugar de ids livres (os 210–225 são os blocos removidos, 250–252 as lajes aposentadas). Helpers `gateClosed`, `gateFence`, `isGateOpen`; `isGate`, `TOGGLES` (abre/fecha com um toque) e `isOpen` cobrem os três portões. Hotbar principal 41 → 43 (só os fechados); fora do Santuário.
- **Receitas** do Construtor: 4 Tábuas da madeira → 1 portão (`birch-gate`, `cherry-gate`); quebrar (aberto ou fechado) devolve o portão fechado da mesma madeira.
- **Render:** a madeira da porteira vem do **próprio bloco** (`gateFence(id)`), não mais da cerca vizinha (`gateWood` removido); mesma animação de 10 quadros. Ícones novos `icon-block-fence-gate-betula/-cerejeira.webp` (gerados por `scripts/extract-fence-model.py`).
- Mundos/salas já salvos seguem válidos (o portão de Carvalho não mudou). Blocos novos → o servidor precisa de `build:net` + `sync-net`. 599 testes (grade 2) e 590 (grade 1) e `tsc` verdes; conferido no navegador (3 portões, abrindo e fechando).

## Orvalis v0.93.98 — rachaduras em estágios na quebra e menos lascas (3D) (15/11/2026)
- **Pedido do dono do produto:** as lascas estavam em demasia → **reduzidas** (a cada 0,2 s em vez de 0,11; 1 a 2 por vez em vez de 2 a 4; estouro final de 10 lascas em vez de 16 e 2 nuvens de poeira em vez de 3). E seguir a recomendação: **rachaduras pintadas em estágios** (opção 3 da animação de quebrar).
- **Rachaduras** (`three/breakCracks.ts`, `breakFx.crackStage`): decalques por cima do topo e da frente (a faixa de 1/4) do bloco que se quebra, em 4 estágios que crescem com o progresso (a partir de 8 %); cada estágio acrescenta fissuras às do anterior (mesma semente, 2 variantes por célula), com traço escuro e fio claro. Tremem junto com o bloco. Texturas desenhadas por código (nunca se lê canvas). No chão (sem face frontal) racha só o topo; árvores e alvos sem lasca (flor, capim) não racham. `?sensacao=0` e os cômodos ficam sem. O 2D de reserva mantém as rachaduras de antes.
- Só cliente e só 3D; sem mapa, save ou protocolo (servidor não muda).

## Orvalis v0.93.97 — flores fofas no mundo (15 variantes) (15/11/2026)
- **Pedido do dono do produto:** incluir as "Flores fofas v01" (15 estudos; a 13 Dançarina de Coral chegou depois dos demais) como enfeite do mundo. Escolhas dele: substitui a Flor atual (sem colisão, não colocável), sorteada por célula em rodízio nos mesmos lugares onde já nasciam flores (biomas, cidade), **tamanho pequeno** (~0,6 célula).
- **Arte** (`scripts/extract-flowers.py`, fontes em `assets-src/flores/`): uma só escala para todas (a mais alta, o Lírio de Lua, = 80 px de arte; 128 px = 1 célula, como a cerca) → `src/assets/flowers.webp`, 15 quadros 96 × 96, base do caule em (48, 92). **Contorno reforçado** (pedido do dono do produto): a silhueta dilatada ~1 px de arte (linha fina; começou em 2 px e o dono do produto pediu mais fina) numa cor verde-acinzentada escura (`OUTLINE`/`OUTLINE_PX` no script) por trás de cada flor, porque o traço original some na redução. Flor nova = PNG `NN-nome.png` na pasta + rodar o script (o jogo lê a quantidade pela largura da tira).
- **Render** (`blockArt.getFlowerArt`, `textures.ts`): os quadros viram `variants` de `Block.FLOWER` (mesmo sorteio por célula de rochas/árvores, `worldSpriteArt` e `drawObject`); a Flor procedural fica de reserva fora do mundo principal. O balanço ao vento (`wind.ts`, `grass`) continua valendo. Só aparência: sem mudança de mapa, save ou protocolo; o servidor não muda.
- **Cerca:** a faixa escura diante da base não era a sombra nova, e sim a **sombra antiga cozida no chão** (`chunkRenderer`, ramo `shape === 'fence'`: elipse ao pé da célula, que com a estaca ancorada no centro caía à frente da base) — removida (vale para cerca e porteira, 2D e 3D). Também tirada a sombra de contato do braço sul; sobra só a sombra atrás e à direita das estacas e dos braços norte/leste/oeste (`drawFenceShadow`).
- 597 testes (grade 2) e 588 (grade 1) e `tsc` verdes; conferido no navegador (3D).

## Orvalis v0.93.96 — cercas de estacas de Carvalho, Bétula e Cerejeira (modelo 3D do Blockbench) (15/11/2026)
- **Pedido do dono do produto:** usar o modelo 3D da cerca de bétula (`assets-src/cerca-betula/*.bbmodel`) como arte da cerca: **substitui a Cerca de Madeira (Carvalho)** e entra como **blocos novos em Bétula e em Cerejeira**.
- **Arte** (`scripts/extract-fence-model.py` + `scripts/fence-model/render.{html,cjs}`): o modelo é renderizado com Three.js (Chromium do Playwright) na câmera do jogo (oblíqua K = 1, norte para cima) e revestido com as tábuas do `materials-v2` de cada madeira (veio vertical nas estacas, horizontal nas travessas; sombreado fixo por face; as **travessas são 32 % mais escuras que as estacas** (`RAIL_TONE` em `render.html`) para se distinguirem delas). 3 tiras de 5 quadros 128 × 232 (`fence.webp`, `fence-betula.webp`, `fence-cerejeira.webp`): horizontal, vertical, estaca, **braço norte** e **braço sul** (só as travessas; antes o corte norte/sul era por linha de pixels, que não serve com 2 alturas de travessa). Ícones novos. A estaca fica com ~22 px de altura no jogo (a de antes era ~10).
- **Blocos** (`world/blocks.ts`): `FENCE_BIRCH` (245) e `FENCE_CHERRY` (248), `isFence()`; `joinsFence` emenda as três cercas entre si e com a porteira. Receitas do Construtor: 2 Tábuas da madeira → 4 cercas (`birch-fence`, `cherry-fence`). Hotbar principal 39 → 41; fora do Santuário.
- **Sombra de contato** (`drawFenceShadow` em `render/fence.ts`): a cerca parecia flutuar; ganhou uma mancha suave atrás e à direita de cada estaca e braço (nunca à frente da base: a faixa escura diante da cerca a descolava do chão), desenhada por código (no 2D direto no canvas; no 3D como `SpriteDraw.shadow`, um sprite translúcido, não clicável, `bias` -0,004 atrás do sprite — não pode ir cozida na arte porque os sprites sólidos usam `alphaTest` e o pouco alfa viraria pontos pretos). A porteira ainda não tem sombra.
- **Render:** `fencePieces` vira um mapa por bloco; `drawFence` (2D) e `worldSpriteArt` (3D) desenham braço norte → braços laterais → estaca → braço sul (na frente). Cache do 3D por (bloco, vizinhos).
- **Porteira 3D** (`portao-betula-v01.bbmodel`): renderizada do modelo (estacas e dobradiças fixas; a **folha gira para o norte** em torno da dobradiça, 0°–90° em 5 poses → 10 quadros). Uma tira por madeira (`fence-gate.webp`, `-betula`, `-cerejeira`, 224 × 300 por pose, base das estacas em (112, 278)); **a porteira usa a madeira da cerca vizinha** (`gateWood`: oeste, leste, norte, sul; sem cerca, Carvalho) — continua um único bloco `FENCE_GATE`/`FENCE_GATE_OPEN`. Dobradiças e fecho escuros, tábuas da folha um pouco mais escuras que as estacas. O kit v3 (`extract-fence-gate.py`, `assets-src/cerca-v3`) foi removido. Modelo da cerca atualizado para a versão de estacas mais finas (v03).
- Sem mudança de mapa/save/protocolo de regras, mas há **blocos novos**: o servidor precisa de `build:net` + `sync-net` para aceitar as cercas novas (sem subir `PROTOCOL_VERSION`, como nos blocos anteriores). `tsc` e testes verdes (grades 1 e 2); conferido no navegador (3D e 2D).

## Orvalis v0.93.95 — cerca nova (kit v3) e porteira animada (15/11/2026)
- **Pedido do dono do produto:** trocar a cerca do mundo pela arte nova (trecho norte-sul e canto L, kit v02 com porteira de 5 ângulos).
- **Cerca** (`render/fence.ts`, `scripts/extract-fence-v3.py`, `assets-src/cerca-v3/kit.png`): kit v3 do dono do produto (as tentativas v1/v2, de arte isométrica, foram descartadas), já com fundo transparente e sem sombra (a 1ª versão, com fundo, era recortada por saturação e deixava sombra entre os trilhos), no mesmo autotile de 3 peças (horizontal, vertical, poste), quadro 128×144 (`FENCE_FRAME`: 1 célula entre postes; corte norte/sul em `cutY`; a coluna de trilhos é centrada no poste). T, cruz e cantos do kit não são usados: o autotile os compõe.
- **Porteira animada** (`GATE_FRAME`, `Textures.gateFrames`): a arte traz só a porteira fechada; o script gera 5 poses (0°–90°) encolhendo a folha pelo cosseno do ângulo, presa à dobradiça, e viram 10 quadros (abre 0..4, fecha 5..9). `doorFrame`/`DoorAnimator` ganham `steps` (porta = 4, porteira = 5); no 3D uma 2ª `DoorSprites` cuida das porteiras (clique incluso); no 2D de reserva a linha usa o mesmo animador; `worldSpriteArt` pula a porteira quando há quadros. A porteira agora fica na linha de base da cerca. Ícones novos.
- Só aparência: sem mapa, save ou protocolo (servidor não muda). O portão e o muro de estacas da vila ficam como estão. `tsc` e testes verdes.

## Orvalis v0.93.94 — a quebra de blocos ganha tremor, lascas, estouro e itens que quicam (3D) (14/11/2026)
- **Pedido do dono do produto:** melhorar a animação de quebrar; ele aprovou a combinação 1 + 2 + 4 + 5 (lascas, tremor, estouro e itens que quicam).
- **Lascas a cada golpe** (`three/breakChips.ts`, `breakFx.ts`): enquanto se segura a quebra, saem a cada 0,11 s de 2 a 4 lascas quadradas **da cor do material** (`blockColor`, a do minimapa; madeira, pedra e terra sem cor própria ganham um tom; flor e capim não soltam), que pulam, caem com gravidade e quicam uma vez. Pool de 96, sem `Math.random`.
- **Tremor do bloco** (`ChunkBlocks.setShake`, `breakShake`): o bloco mais alto da célula balança (até ~0,035 célula, oscilação rápida com fases diferentes por eixo), mais forte perto de quebrar; a instância volta à matriz original ao soltar. A árvore mantém o tremor próprio.
- **Estouro final** (`WorldThreeRenderer.stepBreak`): quando o bloco some (ou perde um nível) até 0,5 s depois de soltar, saem 16 lascas mais fortes e 3 nuvens de poeira da cor do material.
- **Itens que quicam** (`three/itemSprites.ts`: `dropLift`, `dropToss`): dois quiques (14 px em 0,5 s e 5 px em 0,3 s) em vez de um, e o item **desliza** do bloco até onde cai (deslocamento horizontal que decai em 0,5 s).
- Só cliente e só 3D; `?sensacao=0` e os cômodos ficam sem; o 2D de reserva mantém as rachaduras de antes. Sem protocolo (o servidor não muda). 595 testes e `tsc` verdes (grades 1 e 2). Conferido no navegador (lascas, rachaduras, estouro e item). O tremor do bloco só foi conferido por teste (a oscilação não aparece em quadro parado).
## Orvalis v0.93.93 — os peixes ficam sob a água (3D) (14/11/2026)
- **Pedido do dono do produto:** os peixes pareciam flutuar sobre a água; deixar mais transparentes ou com algum efeito.
- **Efeito** (`three/waterFish.ts`): o peixe agora é **translúcido** (opacidade máxima 0,74, com fade de entrada e saída), **tingido de azul-água** (multiplica a cor da imagem por `0xd6eaf5`) e **ondula** — a amostra da textura balança de leve (refração) com o tempo. Testei duas tentativas antes: com o peixe **sob** a superfície animada e mais tingido ele perdeu a cor e quase sumiu; ficou como está, **acima** da superfície animada (`renderOrder` −0,5) mas translúcido.
- Só cliente e só 3D. Sem mudança de mapa, save ou protocolo (o servidor não precisa de deploy). 590 testes e `tsc` verdes.
## Orvalis v0.93.92 — vitórias-régias e peixes na água (14/11/2026)
- **Pedido do dono do produto:** colocar no jogo os animais e itens da água (12 itens: 4 peixes, 4 vitórias-régias comuns e 4 gigantes; `assets-src/agua-itens`). Decisões dele: plantas **sorteadas em rios e lagos**, peixes **girados em código** e **só ambiente, no aparelho**.
- **Vitórias-régias** (`Block.WATER_LILY` 246 e `Block.VICTORIA` 247, `world/generator.ts: waterPlantAt`): função pura da seed, só na **água rasa** (rios e a beira dos lagos/mar; o mar fundo não), a âncora no canto inferior esquerdo e **toda a área (2 × 2 a comum, 4 × 3 a gigante) tem de ser água**. Enfeite que não bloqueia nem se quebra. Variante pela posição (folha, flor rosa, flor branca, botão; folha A/B, com flor, par). **Muda o mapa de todas as seeds** (só as plantas, não o terreno), então precisa do servidor. A cidade e a vila apagam a planta onde a água vira grama (anel de terra firme). Encher a água (Terra, Pedra ou Tora sobre ela) **remove a planta que cobria a célula** (`World.clearWaterPlantsCovering`). Os efeitos da água (brilho, espuma, ondas, peixes) tratam a célula com planta como água (`openWaterAt`); a superfície animada agora desenha **abaixo** das plantas (`renderOrder` −1).
- **Peixes** (`render/fishSim.ts` pura + `render/three/waterFish.ts`): pool de 18 planos deitados sobre a água; cardumes de 1 a 3 que nascem em água aberta perto da câmera (carpa laranja, azul-prateado, listrado oliva e dourado, com pesos), nadam devagar, **viram antes da margem**, **fogem do jogador** a menos de 3,2 células e somem com fade. A imagem (uma direção, nordeste) **gira em código** para a direção de nado. Sem `Math.random` (hashes) e sem protocolo: cada aparelho vê os seus. `?agua=0` desliga junto com a água animada; nada em cômodos; só o 3D (no 2D de reserva ficam as plantas, sem peixes).
- **Arte** (`scripts/extract-village.py` → `src/assets/water-*.webp`, 12 imagens, 110 KB): plantas a 48 px por célula (largura de 2,2 a 5,2 células); peixes em quadros quadrados de 160 px (lado = diagonal do desenho, para o giro não cortar).
- Testes: plantas (só sobre água, área de água, seed, raridade, não bloqueiam, enchimento remove), simulação (nunca sai da água, foge, fade, nascimento), pool `WaterFish` (590 testes e `tsc` verdes, grades 1 e 2). Conferido no navegador. Servidor: `build:net` + `sync-net`.
## Orvalis v0.93.91 — os animais domésticos nascem na vila (14/11/2026)
- **Pedido do dono do produto:** vaca, ovelha, galinha e capivara "agora nascem na vila".
- **Como** (`game/entities.ts`: `spawnVillageAnimals`, `VILLAGE_PENS`): com a vila no mundo (grade fina), as **4 ovelhas, 2 vacas, 4 galinhas e 3 capivaras** nascem **dentro dela**, cada espécie numa faixa de grama da planta: galinhas no quintal do galinheiro (nordeste), vacas no gramado do oeste, ovelhas no do leste e capivaras ao norte das casas; posição pela seed, só em grama andável e livre. O **cavalo** continua no campo diante do portão da cidade. Sem a vila (grade 1), tudo segue como antes, no campo.
- **Servidor:** a sala roda o mesmo código (`build:net` + `sync-net`). Mundos e salas **já salvos** guardam os animais onde estavam (só um mundo novo ou sem animais salvos usa o novo ponto de nascimento).
- Os animais ficam presos pela correia (leash) e pelo muro, mas **saem pelo portão se ele estiver aberto**. Testes: contagem por espécie, dentro da vila e em grama, determinismo, galinhas no nordeste, cavalo fora, e a sala (`creatures.test`) com a vila. Conferido no navegador.
## Orvalis v0.93.90 — Cerca de Estacas (item de receita) e muro da vila feito com ela (14/11/2026)
- **Pedido do dono do produto:** a cerca da vila não ficou boa e a "parede de estacas" (arte de 20 peças) foi descartada; vira uma **cerca**, com **uma unidade recortada** da paliçada para testar: cerca baixa no jogo (16 × 16 px, **4 estacas por bloco**, receita) e, na vila, uma versão mais alta. (Pediu 16 × 32 px; depois: "pode ser mais baixa para não deformar" → **16 × 24 px**.)
- **Unidade:** de vale a vale da paliçada reta `1-2-05` há um **período de 2 estacas (alta + baixa) que emenda consigo mesmo**; um bloco = 2 períodos = 4 estacas em 1 célula. A versão alta estica só o **corpo entre as cordas** (a madeira é vertical: esticar não a deforma); pontas e cordas ficam intactas (`scripts/extract-village.py`, imagens de 96 px por célula).
- **Item:** `Block.FENCE_STAKE` (244, "Cerca de Estacas"): sólida, de madeira (o machado quebra e devolve o item), colocável como a cerca, na hotbar; **receita `stake-fence`: 1 Tora de Carvalho → 4 blocos** (custo provisório). Sem autotile: cada célula mostra as 4 estacas.
- **Vila:** o muro todo (4 lados e cantos) passa a ser `Block.V_STAKE` (1 × 1,5 célula, só o gerador a põe); as peças `V_PAL_*` e as laterais improvisadas saíram. **O portão encolheu** para acompanhar o muro mais baixo: postes em x 22 e 26 e **vão de 3 células**; `World.gateCells` agora mede 5 blocos.
- 578 testes e `tsc` verdes (grades 1 e 2); conferido no navegador (cerca colocada, quebrada, muro e portão). Servidor: `build:net` + `sync-net`.
## Orvalis v0.93.89 — Vila Camponesa no Mundo principal (14/11/2026)
- **Pedido do dono do produto:** a vila rural de camponeses (arte dele, 48 × 48 células de 16 px = a grade do jogo) entra no Mundo principal como **área fixa ao sul da cidade, protegida, com chão em blocos do jogo e objetos em sprites** (decisões dele: posição perto, protegida, blocos + sprites).
- **Layout** (`world/village.ts`, `VillageTerrain`): vila igual em toda seed, de (−24, 72) a (23, 119) (depois do campo do rebanho da cidade), desenhada no código a partir do mapa: muro de estacas fechando os quatro lados com cantos NO/NE/SO/SE, portão duplo no sul (vão de 6 células) que **abre e fecha** com um toque, estrada de terra até a praça do poço, **6 casas** (3 de palha, 3 de telhas), **celeiro**, **galinheiro**, **canteiro de trigo** e **horta** (enfeites fixos), árvores grandes e pequenas, bancos, barris, toras, feno, carroça, sacos, rochas, arbustos e capim com flores (sorteio fixo). Uma **trilha de terra** liga o fim da estrada da cidade ao portão da vila, por fora do muro. Anel de 8 células em volta com terra firme (água vira grama).
- **Mundo** (`World`): `village` (null na grade 1, onde a vila não existe), área protegida (`inGuardedArea`: nada quebra nem se coloca), caverna e acampamentos de goblins/lagartos ficam fora da vila e da trilha (folga de 12–16 células). O ponto de início segue na cidade.
- **Arte** (`scripts/extract-village.py` → `src/assets/village-*.webp`, 36 imagens, 444 KB; `render/townArt.ts`, `render/art/principal.ts`): itens recortados pelo alfa e reduzidos a 24 px por célula; a variação (3 casas de palha, 2 de telhas, 3 carvalhos, 2 árvores, 2 bancos) sai da posição. As laterais do muro (leste e oeste) **não vieram na arte**: uso uma estaca recortada do braço vertical dos cantos do norte, repetida a cada fileira (`palisade-w/e`).
- **Blocos novos** (`Block.V_*`, ids 112–119, 143–149, 206–209, 226–229, 234–237, todos `building`; `V_FLOWERS` não bloqueia). **Servidor:** `build:net` + `sync-net` (a sala roda o mesmo `World`); sem mudança de protocolo nem de save (as células da vila voltam do gerador, como as da cidade).
- Conferido no navegador (mosaico das sete vistas) e 576 testes (grades 1 e 2; 6 só rodam na grade 2). **Portão** (decisão do dono do produto: "abre e fecha"): `V_GATE`/`V_GATE_CLOSED` (postes) e `V_GATE_GAP`/`V_GATE_GAP_CLOSED` (os 6 blocos do vão); o toque em qualquer bloco troca os 8 juntos (`World.toggleDoor`/`gateCells`), fechado bloqueia o vão, e o jogador não fecha com alguém dentro (`actionController`). A troca é entre as duas artes (sem quadros intermediários) e **volta aberto** ao recarregar (a área é protegida e vem do gerador). **Limites desta primeira versão:** as peças da arte são uma aproximação do mapa (não recortes) e a posição fina dos enfeites foi lida a olho; ver `docs/domains/village.md`.
## Orvalis v0.93.88 — ondas na água (3D) (14/11/2026)
- **Terceiro passo da água animada:** anéis que se abrem e somem **onde algo toca a água**: (1) cada **passada de quem anda na margem** abre uma onda na água vizinha mais próxima (até 1,5 célula); (2) **folhas e pétalas que caem** das árvores e pousam na água (`TreeLeaves.onLand`) abrem uma onda fraca.
- **Como** (`three/waterRipples.ts`): pool de 20 planos deitados com o anel desenhado no shader (sem textura; dois anéis, um dentro do outro, que crescem e esmaecem, mais azulados à noite), sem escrever profundidade; sorteio por hash. O passo usa o mesmo ritmo da poeira (`DUST_STRIDE`). O jogador não anda dentro d'água, então as ondas dele são só na margem.
- Só 3D e só cliente; `?agua=0` desliga junto com a superfície e a espuma; nada em cômodos. Testes: abre, cresce, some, limite do pool, força, `onLand`. Conferido no navegador (andando ao longo da margem).
## Orvalis v0.93.87 — espuma na beira da água (3D) (14/11/2026)
- **Segundo passo da água animada:** uma **frente de espuma** vai e volta na margem (vaivém por posição, com ruído para não ficar reta, mais um rastro rendilhado perto da margem), mais clara à noite menos brilho. Dentro de `three/waterSurface.ts` (mesmo plano por chunk; `?agua=0` desliga tudo).
- **Margem visível:** a arte V2 pinta uma faixa de água (~0,65 de célula) na terra vizinha. A máscara (`waterFx.ts: buildWaterMask`, parâmetro `paintedShore`) passa a incluir a célula de grama, areia, caminho ou terra colada na água, para a camada e a espuma começarem na franja que se vê e não na margem do mapa. A espuma mede a distância pela própria máscara (sem ler pixels).
- Só 3D, só cliente. Testes: máscara com e sem a terra de margem. Conferido no navegador na margem (franja de grama, galinhas passando).
## Orvalis v0.93.86 — a água ganha superfície animada (3D) (14/11/2026)
- **Pedido do dono do produto:** animação da água (ordem combinada: superfície ondulando e brilho à noite; depois espuma na beira e ondas/peixes).
- **Superfície** (`render/three/waterSurface.ts`, `render/waterFx.ts`): um plano por chunk **com água**, colado ao chão (sem escrever profundidade), com duas cópias do ladrilho V2 `agua` deslizando em direções e escalas diferentes (manchas claras e escuras em movimento, com leve distorção) e fios de luz que correm. A água **continua nos pixels do chão do chunk** (que não são lidos): a camada só aparece onde a **máscara** diz que há água aberta (`World`: chão líquido sem objeto), com 1 célula de vizinhança (a margem esmaece e nada cobre a terra, também na emenda dos chunks). À **noite** fica mais escura e azulada.
- **Desligar:** `?agua=0` (chave própria; o `?sensacao=0` não a desliga). Só 3D e só cliente. Limite de 4 máscaras refeitas por quadro; chunks sem água ficam invisíveis; os que saem da área liberam a GPU. O ladrilho vem de `v2WaterTop` num canvas próprio.
- Testes: máscara (vizinhança e contagem), chave `?agua=0`, planos por chunk (visíveis só com água, liberação, versão). Conferido no navegador, com e sem a camada, no mar aberto e na margem.
## Orvalis v0.93.85 — a macieira troca de forma com transição suave (3D) (14/11/2026)
- **Quarto passo das árvores animadas:** quando a árvore **muda de forma** na mesma célula (a macieira volta a dar maçãs depois de 150 s, ou perde as maçãs ao colher), o desenho antigo **some aos poucos** (0,7 s) sobre o novo em vez de trocar de uma vez.
- **Como** (`three/chunkSprites.ts`): ao refazer um chunk, a árvore da lista anterior que continua na célula mas com outra arte (`ChunkSprites.startMorph`) ganha uma cópia translúcida do desenho antigo, um fio à frente do novo (`MORPH_SECONDS`); ela usa o mesmo material de copa (`makeTreeMaterial(…, true)`), então balança junto com a árvore. Descartada no fim; sem efeito com `?sensacao=0`; só 3D e só cliente.
- Testes: troca suave (opacidade cai, descarta; não tomba; reconstrução sem mudança não dispara). Conferido no navegador (macieira sem maçãs → com maçãs em transição).
## Orvalis v0.93.84 — a árvore derrubada tomba (3D) (14/11/2026)
- **Terceiro passo das árvores animadas:** ao cortar a árvore ela **tomba** (gira em volta do pé, acelerando, ~0,8 s) e some nos últimos 0,3 s, com sete folhas soltas, em vez de desaparecer de uma vez. Cai **para longe do jogador**; sem jogador conhecido, para a direita.
- **Como** (`three/chunkSprites.ts`): ao refazer um chunk, a árvore que estava na lista anterior e não está mais na célula (`ChunkSprites.startFall`) vira uma cópia temporária do desenho (grupo com o pé como pivô, material com opacidade). `tick(dt)` avança e descarta (`FALL_SECONDS` = 1,1 s). Funciona para quem corta, em qualquer jogador da sala, e não dispara na primeira montagem, na troca de forma da macieira nem com `?sensacao=0` (sem lista de árvores).
- Só o 3D; só cliente. Testes: tombo (gira, some, descarta), direção oposta ao jogador e sem efeito ligado. Conferido no navegador.
## Orvalis v0.93.83 — a árvore treme ao ser cortada (3D) (14/11/2026)
- **Segundo passo das árvores animadas** (ordem combinada com o dono do produto): ao cortar uma árvore (`RenderOptions.breaking` sobre uma célula de forma `tree`), a copa **treme** e solta folhas no ritmo do golpe. A intensidade cresce com o progresso da quebra (0,4 → 1).
- **Como** (`three/chunkSprites.ts`): o material `tree` ganha duas uniformes (origem do plano da instância e intensidade); só a instância cujo plano está na origem treme (deslocamento rápido da amostra da textura, no tronco preso). `ChunkSprites.setShake(alvo, intensidade, dt)` acha a árvore pela célula, devolve-a (para `TreeLeaves.emit`) e, ao soltar, a intensidade some em ~0,25 s. Uma árvore por vez. Nada de geometria nova nem leitura de pixels.
- Desliga com `?sensacao=0`; nada em cômodos; só o 3D; só cliente. Testes: `setShake` (acha, decai, volta a tremer). A árvore ainda some de uma vez ao cair (próximo passo: tombar).
## Orvalis v0.93.82 — árvores ao vento e folhas caindo (3D) (14/11/2026)
- **Pedido do dono do produto:** animações do three.js nas árvores; ordem combinada: vento nas copas e folhas/pétalas caindo (depois: tremor ao bater, queda ao cortar, rebrota suave e sombras).
- **Vento nas copas** (`render/three/chunkSprites.ts`, material `tree`; `render/wind.ts`: `windKind`): árvores (forma `tree`) ganham um material próprio, sólido (`alphaTest`, escreve profundidade, o personagem some atrás), em que o tronco fica preso e a folhagem ondula com rajadas lentas que atravessam o mapa (fase pela posição) e um tremor fino das folhas. Só desloca a amostra da textura dentro do plano (sem geometria nova). Capim e flores seguem no material `sway`; a árvore **não** se curva ao jogador.
- **Folhas e pétalas** (`render/three/treeLeaves.ts`): pool de 48 pontos; a cada 0,18 s uma árvore visível tenta soltar uma folha (cerejeira sempre, carvalho/bétula/macieira às vezes; cores por espécie em `leafStyleFor`), que deriva com o vento girando e some ao chegar ao chão. As árvores candidatas (`ChunkSprites.treesNear`) vêm da área da tela e são refeitas a cada 0,5 s. Sem `Math.random`.
- **Desligar:** `?sensacao=0` (como o resto do "feel"); nada em cômodos. Só o 3D (o 2D de reserva fica sem). Só cliente (sem save nem protocolo).
- Testes: `windKind`, pool de folhas (dentro da copa, cai, some, limite, determinismo) e material da árvore (556 testes, grades 1 e 2). Conferido no navegador.
## Orvalis v0.93.81 — Grewn: mesma escala em todas as ações (14/11/2026)
- **Defeito:** o Grewn aparecia em tamanhos diferentes conforme a ação. As 12 folhas foram geradas preenchendo a célula de 384 px, então a escala do personagem varia entre elas (cabeça de 250 a 296 px) e a altura pelo desenho (v0.93.80) não corrigia isso.
- **Correção** (`render/character.ts`): a altura do quadro de cada folha é `270 / largura da cabeça` medida na prancha original (média das fileiras de frente e de costas), para a cabeça ter o mesmo tamanho em toda ação. Conferido no navegador (caminhadas com as 5 ferramentas).
- **Caminhada sem ferramenta** (`hood-v02-01-caminhada`, enviada depois): vira a folha-base `grewn` (`--rows-map 0,3,1,2`, cabeça 262 px) e anda de verdade (`walkFps: 7`); a de repouso (`grewn-idle-sheet.png`) fica guardada em `assets-src/grewn` sem uso. Só cliente.
## Orvalis v0.93.80 — Grewn, personagem de teste do novo estilo chibi (14/11/2026)
- **Pedido do dono do produto:** novo personagem **Grewn** (cabeça maior, corpo menor) para testar um estilo chibi novo. Entra como **sétimo personagem pronto**, escolhido na tela de entrada (ou `?personagem=grewn`).
- **Arte** (`assets-src/grewn`, 12 folhas 4 × 4 de 1536 px; `src/assets/grewn*.webp`): repouso, sentar, 5 caminhadas com ferramenta e 5 golpes. Fileiras vêm em frente, direita, costas, esquerda (`--rows-map 0,3,1,2` em todas); `--alpha --largest` tirou o ruído vermelho das bordas. **Não veio a caminhada sem ferramenta:** a folha-base é a de repouso (`walkFps: 0`, sem pernas andando); o golpe de espada usa os 4 quadros padrão.
- **Código** (mesmos pontos da Mila): `APPEARANCE_BODIES` (**protocolo 25**), `HERO_NAMES`, `SIT_BODIES`, `SPECS` (altura de cada folha pelo desenho, base 380 px), `art/principal.ts`, margens dos pés (`foot-margins.py`), balanço (`actorBillboards`), cena de escala e regra do artefato. Servidor: `build:net` + `sync-net` (PR no `orvalis-servidor`).
- Fica para depois: caminhada sem ferramenta, golpe de espada em 8 quadros e conferir a escala (Grewn usa a mesma altura-base dos outros). O arquivo `hood-v02-13-uso-pa` veio duas vezes (1254 e 1536 px): usei o de 1536.
## Orvalis v0.93.79 — Grama com topo e face enviados (14/11/2026)
- **Pedido do dono do produto:** a grama da v0.93.77 saiu ("não gostei dessa grama"); voltam o **topo** (relva verde repetível) e a **face** (terra avermelhada em estratos, com raízes) enviados. Originais em `assets-src/blocos-net/grama-topo.png` e `grama-face.png`.
- **Materiais V2:** `grama` ganha `top.png` e `front.png` próprios (emendas 0,89 e 0,70: a arte já era repetível, sem mistura); `V2_BLOCKS[GRASS] = { top: 'grama', front: 'grama' }` — **sem franja** (a arte não traz). O chão de grama e as transições usam o novo topo. Ícone `icon-block-grass` refeito. Terra, Terra Arada, Pedra Bruta e Pedra Lisa ficam como na v0.93.77.
- Só arte e uma linha de composição; testes e `tsc` verdes; conferido no navegador (3D).
## Orvalis v0.93.78 — o Mundo 3D mostra a frente própria dos materiais (14/11/2026)
- **Defeito:** o 3D oblíquo usava o topo também nas laterais (`BlockMaterials`: `view === 'oblique' ? top : front`), e `worldBlockFaces` só usava a frente V2 quando o nome do material da frente diferia do topo (Pedra Bruta, Pedra Lisa e as toras têm `front.png` próprio, mas o mesmo nome). Resultado: topo e face iguais.
- **Correção:** a lateral usa `faces.front` e todo bloco V2 monta a frente a partir do material (sem `front.png`, é o próprio topo). Grama mostra terra com franja, Terra Arada e Terra mostram a terra lateral, pedras e toras mostram a face própria. Testes e `tsc` verdes; conferido no navegador.
- Pendente (NEXT_STEPS): pilha parcial de Grama (1–3 blocos) mostra a faixa de terra sem franja, porque a textura é fatiada por nível absoluto e a franja só aparece no 4º nível.
## Orvalis v0.93.77 — arte nova de Grama, Terra, Terra Arada, Pedra Bruta e Pedra Lisa (14/11/2026)
- **Pedido do dono do produto:** novos blocos (planificações de cubo: topo, 4 laterais, base) para Terra com Grama, Terra, Terra Arada, Pedra Bruta e Pedra Lisa. Originais guardados em `assets-src/blocos-net/`.
- **Materiais V2** (`assets-src/materiais/`): topo de `grama`, `terra`, `arada`, `pedra`, `pedra-lisa`; frente própria de `terra` (a base da Grama e da Arada), `pedra` e `pedra-lisa` (esta ganhou frente); franja da `grama` tirada das folhas da lateral (máscara por matiz, comprimida em 32 linhas). Os ladrilhos foram **emendados** (mistura com o deslocamento de meio ladrilho) porque a arte não era repetível: emenda 0,9–1,7 (Arada 1,9, só aviso). A franja da Terra Arada continua a antiga (a lateral nova não tem franja).
- **Ícones** (`icon-block-{grass,dirt,tilled,stone,stone-smooth}`) refeitos a partir da arte nova (topo + frente escurecida). Fora do escopo: tijolo, chão de pedra, pedra polida e demais materiais.
- Só arte (sem mudança de regra, save ou protocolo). Testes e `tsc` verdes (grades 1 e 2); conferido no navegador (3D e 2D de reserva).
## Orvalis v0.93.76 — blocos de 1/4 de célula: regra oficial do Mundo (14/11/2026)
- **Pedido do dono do produto:** a versão 16×4/16×16 das lajes vira **regra de todo bloco do Mundo, empilhando até 4; só blocos, não paredes** (ADR 0033). Decisões dele: migrar **preservando a altura**, andar **1 a 3 sobe, 4 bloqueia**, **só o Mundo principal** (Santuário igual).
- **Regra** (`config.ts`: `CUBE_LEVELS = MAX_STACK = 4`; `World.cubeLevels/stepLevels`): bloco = 1/4 de célula; `z`/`standHeight` em níveis, `visualZ` em células. Quebrar tira 1 bloco por golpe.
- **Migração** (`world/quarters.ts`): 1 cubo antigo → 4 blocos; 2 cubos → 2 + 2. Gerador, chunks não carregados, `restoreChunk` e saves. `SAVE_VERSION` 17, `ROOM_SNAPSHOT_VERSION` 6, `PROTOCOL_VERSION` 24 (jogo e servidor juntos; `build:net` + `sync-net`).
- **Render:** `ChunkBlocks` junta blocos iguais da coluna numa caixa (`stackGeometry`, textura contínua); seleção e 2D de reserva acompanham (2D arredonda parciais para cima).
- **Removido:** piloto das lajes (`world/slabs.ts`, `?tabua=laje`, ids 250–252 viram vazio, `Chunk.growLevels`, `Walker.lift`) e `?fisica=solida` sem efeito no Mundo.
- Efeitos: muralha e montanhas de 2 níveis ficam com 1 célula; 4 golpes por célula cheia; monstros não sobem a pilha de 4. Testes e `tsc` verdes (grades 1 e 2); conferido no navegador (pilhas de 1 a 4, misturadas, bloqueio na 4, 2D de reserva).
## Orvalis v0.93.75 — lajes: topo 16 × 16 de volta e pilha de até 4 (14/11/2026)
- **Pedido do dono do produto:** "volta pra topo com 16×16 e inclui possibilidade de empilhar até 4, apenas nessa versão, ainda pra teste" (o topo 12 × 16 da v0.93.74 foi desfeito; `SLAB_DEPTH = 1`, o recorte do fundo continua no desenho caso o teste volte).
- **Pilha** (`SLAB_STACK_MAX = 4`, `World.slabCount/slabBase/slabLift`): dá para empilhar até **4 lajes na mesma célula, misturando laje1, laje2 e laje3**; cada uma assenta na **soma das alturas das de baixo** (ex.: 0,25 + 0,5 + 0,375 + 0,25 = 1,375 célula) e o corpo sobe a soma de todas (só visual; a célula segue andável). A 5ª não entra; **cubo comum em cima de laje e laje em cima de cubo não**; quebrar tira a de cima, uma por vez.
- **Só no piloto** `?tabua=laje` (offline): ligado, ele **eleva o limite de níveis do Mundo de 2 para 4** (`World.setSlabBlocks`, `Chunk.growLevels` para chunks já gerados); desligado, tudo volta a 2. Quem salvar um mundo com pilhas de 3–4 lajes e abrir **sem** o parâmetro perde os níveis acima de 2 (o aviso de "blocos excedentes removidos" já existe) — é um teste.
- **Desenho** (`three/chunkBlocks.ts`): cada nível de laje vira uma caixa na altura certa (`slabBase`); a moldura de seleção trata a pilha como objeto baixo. Só cliente (inerte sem o piloto; a sala nunca o liga).
- Testes: pilha mista até 4, 5ª recusada, cubo/laje, altura acumulada, quebrar, piloto ligado depois de chunks gerados, transformação com base (554 testes, grades 1 e 2). Conferido no navegador: pilhas de 1 a 4 lajes, 5ª recusada, corpo a 1,375 sobre a de 4.

## Orvalis v0.93.74 — lajes com topo 12 × 16 (14/11/2026)
- **Pedido do dono do produto:** "muda as receitas para terem 12×16 de topo todas" (laje1, laje2 e laje3). Decisão dele: **12 px de profundidade (norte–sul) por 16 de largura, encostada na frente** (borda sul da célula); sobram 4 px livres atrás.
- **Pegada** (`SLAB_DEPTH = 12/16` em `world/slabs.ts`): a caixa da laje vai de `y + 0,25` a `y + 1`; as alturas seguem 4, 6 e 8 px. Tudo é **recorte da imagem, sem esticar**: o topo e as faces laterais mantêm a ponta da frente (sul) da textura da Tábua e o lado de trás perde 4 px (`slabGeometry(altura)`).
- Lajes lado a lado em fileira continuam emendadas na largura; em fileira norte–sul ficam com 4 px de vão entre elas. A lógica não muda: a célula inteira segue andável e o corpo sobe a altura da laje também sobre os 4 px livres (só visual).
- Só cliente (inerte sem o piloto `?tabua=laje`; a sala nunca o liga). Testes: pegada, encaixe na borda sul e recorte do topo e das faces (553 testes, grades 1 e 2). Conferido no navegador.

## Orvalis v0.93.73 — três lajes de Carvalho (laje1, laje2, laje3) no piloto (14/11/2026)
- **Pedido do dono do produto:** "ficou melhor do que eu imaginava" — criar **3 versões da tábua com receitas `laje1` (4 × 16, topo 16 × 16), `laje2` (6 × 16) e `laje3` (8 × 16)**, só offline com `?tabua=laje`, para testar.
- **Blocos novos** (`Block.OAK_SLAB_1/2/3` = 250–252, `SLAB_BLOCKS`; `world/slabs.ts` → `SLABS`): face de **4, 6 e 8 px** numa célula de 16 px (1/4, 3/8 e 1/2 de célula), topo 16 × 16 com a textura da Tábua de Carvalho (frente = recorte da faixa de cima, sem esticar). A **Tábua de Carvalho voltou a ser cubo comum** (no piloto anterior ela mesma virava laje).
- **Receitas** (`laje1`, `laje2`, `laje3`, profissão Construtor, `Recipe.pilot = 'laje'`): **1 Tábua de Carvalho → 4, 3 e 2 lajes** (números provisórios, ajustáveis olhando o ritmo do jogo). As receitas **só aparecem com `?tabua=laje`**, e os blocos só se colocam nele (`World.placementLevel`); ícones próprios (a Tábua baixa em 3 espessuras).
- **Regras:** cada laje é andável (nível do chão) e **sobe o corpo a própria altura** só no visual; lajes **não empilham** e nada se põe em cima delas; colocam-se sobre chão livre e coletam-se de volta ao quebrar. Sem o parâmetro os ids existem mas valem cubo cheio (ninguém os fabrica nem os coloca), então nada muda para quem não testa.
- Só cliente + `World`/`Items` (inertes sem o piloto; a sala não liga lajes). Testes: três alturas, receitas, andar/subir, não empilhar, geometria/UV (552 testes, grades 1 e 2). Conferido no navegador: fabricar as três, colocar e andar por cima (corpo a 0,25 / 0,375 / 0,5).

## Orvalis v0.93.72 — piloto da laje de Carvalho: topo 16 × 16, face 16 × 4 (14/11/2026)
- **Pedido do dono do produto:** testar a Tábua de Carvalho com **face 16 × 4 e topo 16 × 16** (a célula do Mundo tem 16 × 16 px na grade 2; o cubo atual é topo 16 × 16 + face 16 × 16 na vista K = 1). Decisões dele: **piloto reversível** e laje **andável com o corpo subindo 4 px**.
- **Como ligar:** `?tabua=laje` — só no Mundo principal, no 3D e **offline** (a sala não conhece lajes). Sem o parâmetro tudo segue como era; o dado guardado (saves, sala) continua o cubo comum, então tirar o parâmetro desfaz o piloto.
- **Regras** (`world/slabs.ts`, `World.setSlabBlocks/isSlabAt/slabLift`): a laje é um bloco de Tábua **sozinho** no nível 0 (um segundo cubo em cima desfaz a laje e vira pilha de 2); para a lógica ela fica no **nível do chão** (`standHeight` 0: andável, inclusive para bichos); `Walker.lift` sobe o corpo `SLAB_HEIGHT` (1/4 de célula = 4 px) **só no visual** (`visualZ`), com a mesma suavização; `z` lógico não muda.
- **Desenho** (`three/chunkBlocks.ts`): forma `slab` — caixa 1 × 1/4 × 1; as faces laterais **recortam o quarto de cima** da imagem (16 × 4, sem esticar); o topo segue inteiro. A moldura de seleção trata a laje como objeto baixo.
- Só cliente + `World`/`Walker` (inertes sem o piloto). Testes: parâmetro, regras da laje, subida do corpo e retorno, geometria/UV e posição (551 testes, grades 1 e 2). Conferido no navegador (personagem em cima da laje; cubo comum sem o parâmetro).

## Orvalis v0.93.71 — sem sombreado de sol no corpo dos atores (14/11/2026)
- **Decisão do dono do produto:** "a sombra sai" (resposta sobre o sombreado por pixel do corpo, depois de `?sombreado=0` ter melhorado muito a vista).
- O **relevo do corpo pelo sol/lua** (normais falsas, brilho de contorno) passa a vir **desligado**; `?sombreado=1` o liga. A **luz quente da fogueira nos atores** continua (usa o mesmo shader, mas não depende do sol), e `?sombreado=0` segue desligando tudo. A sombra no chão é o círculo suave sob os pés (v0.93.70).
- Só cliente (render). Teste: o relevo vem desligado e só liga com `?sombreado=1`. Conferido no navegador.

## Orvalis v0.93.70 — atores no chão: sem flutuar e sem sombra inclinada (14/11/2026)
- **Relato do dono do produto (com capturas do celular):** a sombra e o jeito de andar davam a impressão de plano inclinado (`?sombreado=0` melhorou muito) e os animais e a personagem pareciam acima do solo, "principalmente de lado".
- **Causa do "acima do solo" (medida):** as folhas têm uma **folga vazia embaixo dos pés que varia por direção** e o desenho era colado pela base do quadro. Vaca de lado: 9–14% da altura do quadro; capivara 11–19%; cavalo, galinha e ovelha 7–12%; o Hood só 0–3%. Somavam-se ~1 px de margem do canvas e 0,03 célula de elevação do plano.
- **Correção:** `scripts/foot-margins.py` mede a folga (a menor entre os quadros de cada linha de direção) e grava `render/footMargins.ts` (115 folhas); `SpriteSheet` desce o desenho por essa folga (`footDrop`, no 2D e no 3D) e a sola passa a coincidir com o ponto de apoio e com a sombra. O plano do ator fica a 0,012 célula do chão (era 0,03) e o canvas deixa de ter margem sob os pés (`GROUND_LIFT`). Rode o script depois de gerar sprites novos.
- **Impressão de chão inclinado:** a **sombra projetada pelo sol** (v0.93.66; comprida e girada) passa a ser opcional (`?sombra=sol`); o padrão é o círculo suave sob os pés. A **inclinação lateral** do corpo ao andar (v0.93.69) foi removida (`LEAN_RAD = 0`) e o balanço vertical caiu de 0,03 para 0,012 célula. O sombreado por pixel e a luz da fogueira nos atores continuam (`?sombreado=0` ainda os desliga).
- Só cliente (render): sem mudança no pacote do servidor (diferença zero). Testes: tabela de folgas, `footDrop`, elevação, sombra opcional (546 testes, grades 1 e 2). Conferido no navegador antes/depois com animais de lado.

## Orvalis v0.93.69 — fluidez dos personagens: movimento, desempenho, terreno vivo e rede (14/11/2026)
- **Pedido do dono do produto:** "nessa rodada melhoramos o que existe" — implementar o plano de jogabilidade em ordem (fases 1, 3, 4 e 6; a **fase 2, 8 direções para andar, espera arte** e a **fase 5, esquiva/corrida, ficou fora** por decisão dele). O movimento segue **responsivo** (estilo Stardew). Tudo da fase 1 se desliga com `?sensacao=0` para comparar.
- **Fase 1 — sensação de movimento:** inércia curta do jogador (`game/feel.ts`: arranca em ~55 ms e para em ~40 ms, sem corte seco; só no `Player`, não no `Walker`, então animais e monstros do servidor não mudam); **passo pela distância** (o ciclo de caminhada acompanha a velocidade real: o pé não desliza nem corre contra a parede); **câmera que se adianta** ~18 px na direção do movimento; **balanço do corpo** ao andar (sobe a cada passada e inclina de leve) no 3D; **poeira de passos** com a cor do chão (`render/footDust.ts` + `three/footDust.ts`); **mira assistida do golpe** pelo botão/teclado (`game/aimAssist.ts`: vira para o monstro mais perto à frente; o mouse não usa).
- **Fase 3 — desempenho dos atores:** cada ator só é repintado e só reenvia a textura quando o desenho muda (assinatura `SpriteSheet.visualKey`): ~70% menos pinturas/envios medidos com bando e animais na tela. O atlas instanciado completo ficou como próximo passo.
- **Fase 4 — terreno vivo:** **capim e flores balançam** ao vento e **se curvam quando o jogador passa** (material `sway`, `render/wind.ts`); **pegadas** na areia, terra, caminho e terra arada, alternando os pés, que somem em ~7 s (`three/footPrints.ts`). Marolas na água e folhas ao vento ficam para depois.
- **Fase 6 — rede:** os outros jogadores são desenhados com **interpolação entre as amostras** recebidas (atraso de 0,15 s, extrapolação curta se a rede atrasar, teletransporte em saltos grandes) no lugar da suavização exponencial que andava em degraus de 10 Hz; o passo deles também anda pela distância.
- **Servidor:** `player.ts` ganhou campos e `actionController`/`feel` entram no pacote; o **protocolo não muda**, mas jogo e servidor sobem juntos.
- Testes: inércia, passo, mira, poeira, pegadas, vento, cache de repintura, interpolação (539 testes, grades 1 e 2). Conferido no navegador (arranque/parada, câmera, pegadas, sem erros de shader).

## Orvalis v0.93.68 — golpe de espada da Mila em 8 quadros (14/11/2026)
- **Pedido do dono do produto:** prancha de ataque com espada da Mila (a mesma de 8 direções × 8 quadros do Hood).
- Entram as 4 direções do jogo (frente, esquerda, direita, costas) com os 8 quadros (as diagonais ficam guardadas em `assets-src/mila/mila-sword-attack8-sheet.png`). O corpo tem o mesmo tamanho da folha antiga (136 px de 144), então a altura em tela não muda. Processada **sem** `--largest`, porque o arco branco do golpe é um pedaço separado do corpo.
- `game/attackTiming.ts`: `SWORD8_BODIES = ['hood', 'mila']` usam o tempo de 0,48 s com acerto em 56% (a Mila com a espada passa dos 0,36 s antigos); a sala anima a Mila dos outros jogadores com o mesmo tempo. O `HOOD_SWORD_TIMING` segue como alias.
- Teste de tempo estendido à Mila. Conferido no navegador nas 4 direções. **Servidor:** `attackTiming.ts` entra no pacote da sala (`build:net` + `sync-net`); protocolo inalterado.

## Orvalis v0.93.67 — fogueira viva: chama animada, luz e brasas (14/11/2026)
- **Pedido do dono do produto:** "luz da fogueira e animação no fogo" (o Three.js dá conta, sem arte nova).
- **Chama que balança** (`three/chunkSprites.ts`, material `animated`): o próprio desenho da fogueira é amostrado com a coordenada horizontal ondulando mais quanto mais alto o ponto, a altura da chama pulsa e os pixels cor de fogo piscam em brilho. Sem recorte nem arte nova; o 2D de reserva segue estático.
- **Efeitos** (`three/fireFx.ts`, pools de `MAX_FIRES = 8`): brilho quente no chão (mistura normal, para não virar verde-limão sobre a grama; fraco de dia, forte à noite), halo aditivo em volta da chama e **brasas** que sobem e se apagam (animadas no vertex shader).
- **Luz nos atores** (`render/fireLight.ts` + shader de `actorBillboards.ts`): quem está perto da fogueira recebe luz quente do lado dela, de dia e de noite, com a mesma oscilação do fogo.
- **Correção junto:** os raios de luz do Mundo (fogueira, lanternas, luz do jogador) eram em células da grade 1 e, na grade 2, cobriam metade da área; agora valem `× SUBDIV`.
- **Parâmetro:** o sombreado dos atores (v0.93.66) passa a se desligar com `?sombreado=0` (o `?luz=` já é a escuridão do Santuário).
- Só cliente (render): **sem mudança no servidor nem no protocolo**. Testes: achar fogueiras, queda e direção da luz, oscilação (526 testes, grades 1 e 2). Conferido no navegador de dia, ao entardecer e à noite.

## Orvalis v0.93.66 — golpe de espada do Hood em 8 quadros e luz do sol nos atores (14/11/2026)
- **Pedido do dono do produto:** incorporar a nova prancha de batalha com espada do Hood e fazer o three.js trabalhar luminosidade e profundidade no personagem.
- **Prancha do Hood** (`assets-src/hood/hood-sword-attack8-sheet.png`, 8 quadros × 8 direções): entram as 4 direções do jogo (frente, esquerda, direita, costas; as diagonais ficam guardadas para quando houver 8 direções) com os 8 quadros — preparo, subida, golpe com o arco branco (5º quadro) e recuperação. `Actor.phase` (0..1) escolhe a coluna de folhas de ação com mais de 4 quadros; as de 4 seguem por `frame`. Tempo próprio (`game/attackTiming.ts`): 0,48 s com o acerto em 56% (no meio do arco); os outros personagens seguem 0,36 s. A sala anima os outros jogadores com o mesmo tempo (`RemotePlayers`).
- **Luz dos atores no 3D** (`render/actorLight.ts`, `render/three/actorBillboards.ts`): o sol (leste de manhã → oeste à tarde, alaranjado no nascer/pôr, lua azulada à noite) acende cada ator com **normais falsas** tiradas do arredondado da silhueta e do brilho do desenho (sem ler o canvas: tudo no shader), mais um brilho de contorno do lado do sol e um leve escurecimento junto dos pés — relativo a uma normal de frente, então o dia continua claro. A **sombra no chão** cai para o lado oposto ao sol e é mais comprida com o sol baixo. Fraco no covil e em cômodos; corações do namoro e morte ficam de fora. `?sombreado=0` desliga (para comparar). O 2D de reserva não muda.
- **Servidor:** `player.ts`/`entities.ts` mudaram (tempo do golpe, `Actor.phase`) → `build:net` + `sync-net`; protocolo não muda.
- Testes: luz pela hora do dia, sombra, `?sombreado=0`, tempo do golpe do Hood e do `Player`. Conferido no navegador nas 4 direções e em 4 horas do dia, no 3D e no 2D.

## Orvalis v0.93.65 — Cinco níveis de construção e escala visual no Santuário (14/11/2026)
- **Pedido do dono do produto:** permitir blocos em degraus até cinco níveis e controles para reduzir separadamente a altura dos blocos e o tamanho das células, como experimento de câmera/profundidade.
- **Construção:** o Santuário passa a guardar e restaurar até **5 blocos em pilha**; o Mundo principal e o servidor continuam com **2**. Colisão segue sólida no WebGL, sem subir automaticamente os degraus.
- **Laboratório da câmera:** o painel **◉ Câmera** recebe sliders **Altura do bloco** (25%–125%) e **Tamanho da célula** (50%–125%). A escala altera as geometrias 3D e o foco/mira mas não a grade lógica, a física, os dados salvos ou o Mundo principal. Zoom segue independente, e Resetar restaura os valores originais.
- **Testes:** cubos até o 5º, não cria 6º, persistência do 5º nível e regressão do limite original no Mundo. Revisão visual das proporções em mobile/desktop pendente.

## Orvalis v0.93.64 — Grama Celestial de seis faces e laboratório de câmera (14/11/2026)
- **Pedido do dono do produto:** testar inclinação e profundidade no Santuário com o cubo Grama Celestial, desenhado dos seis lados, e joystick de câmera.
- **Grama Celestial:** nova textura 512×512 em cruz, com topo e quatro laterais pintadas e base de terra, aplicada por face no `BoxGeometry` do Three.js. A arte fica embutida em WebP no pacote do Santuário; outros blocos continuam com os materiais anteriores.
- **Câmera orbital experimental:** botão **◉ Câmera**; joystick para azimute 360° e inclinação 15°–85°, zoom (0,6–2,2×), Resetar (67°) e Salvar (no dispositivo). Fechar retorna à projeção oblíqua; não muda colisão, construção, salvamento nem a câmera do Mundo principal. A Deusa de sprite acompanha o giro.
- **Validação:** CI (TypeScript, Vitest e builds dos dois mundos). A comparação visual no aparelho e a escolha do ângulo definitivo ficam para o dono do produto.

## Orvalis v0.93.63 — combate mais fluido (14/11/2026)
- **Pedido do dono do produto:** "pode seguir com os três primeiros" (retorno do golpe, previsibilidade dos monstros, cancelar/encadear).
- **Retorno do golpe:** acertar um inimigo dá **hit-stop** (a simulação quase para por 0,055 s; 0,1 s no crítico), **tremida de câmera** (1,6 px; 3,2 no crítico; 2,2 ao levar dano) e **recuo proporcional** ao dano (`takeHit(..., knock)`: 0,8 a 2 × o recuo antigo; crítico +0,5). O hit-stop e a tremida são só do aparelho (na sala, vêm das mensagens `hits`).
- **Monstros armam o ataque:** goblin, homem-lagarto e lobos tocam a pose de ataque e o dano sai depois (`windup` 0,4 s goblin/lagarto, 0,3 s lobos), só se a personagem ainda estiver ao alcance — **dá para esquivar**; um golpe recebido durante o armar **cancela** o ataque; o monstro fica parado enquanto arma. Aranhas seguem mordendo na hora.
- **Cancelar e encadear:** depois do acerto, a partir de 70% da animação já dá para começar outro golpe; um pedido até 0,18 s antes disso entra numa fila curta e sai sozinho (pedido mais cedo é ignorado: apertar sem parar não empilha golpes).
- **Servidor:** mexe em `game/monster.ts` e `entities.ts` (tempo dos monstros) → `build:net` + `sync-net`; **protocolo não muda** (mesmas mensagens), mas o dano dos monstros na sala passa a sair com atraso: servidor e jogo sobem juntos.
- Testes: armar/esquivar/interromper, recuo, aranha instantânea, golpes encadeados e na fila (500 testes, grades 1 e 2). Conferido no navegador (windup ≈ 0,42 s de jogo; hit-stop/tremida/recuo no golpe).

## Orvalis v0.93.62 — mapa grande em tela cheia (14/11/2026)
- **Pedido do dono do produto:** "aumentar o mapa de consulta para a tela toda pro jogador saber por onde já andou" (o círculo do canto superior direito era pequeno).
- **Mapa grande** (`render/worldMap.ts`): abre ao **tocar/clicar no minimapa** ou na tecla **M**; mostra tudo o que já foi explorado (a mesma névoa salva, `Exploration`), com **arrastar** para mover, **roda / botões ＋ － / pinça** para aproximar, **◎** centraliza em mim e **▣** enquadra tudo; marcadores de cidade, covil (só depois de visto), tenda e amigos, e a seta do jogador. Fecha com ✕ ou Esc. **O jogo fica pausado** enquanto está aberto. No covil mostra só o labirinto; no mundo, tudo menos o covil; não abre dentro de cômodos.
- **Sem segunda fonte de verdade:** o mapa lê `World` + `Exploration` como o minimapa; o cache de imagens de chunk virou `render/mapChunks.ts` (compartilhado) e os marcadores `render/mapMarkers.ts`.
- **Correção junto:** o raio do minimapa estava fixo em 36 células e, na grade 2, mostrava metade do trecho de antes; agora é `36 × SUBDIV`.
- Testes: `chunkCoords`, `exploredBounds`, `fitScale`. **Limites conhecidos:** a névoa só cobre onde o jogador já andou (nada retroativo); mapa só no Mundo principal (o Santuário não tem minimapa); sem legenda dos marcadores.

## Orvalis v0.93.61 — lobos com poses completas e a capivara (14/11/2026)
- **Pedido do dono do produto:** atualizar o movimento dos três lobos e incluir a **capivara** como novo animal doméstico (21 folhas de lobo + 7 de capivara enviadas).
- **Lobos:** 7 folhas por cor (walk, idle, run, alert, attack, hurt, death) pelo mesmo mecanismo do goblin/lagarto (`hasPoses`/`PoseKind`; `ActorKind` ganhou `${PoseKind}-${PoseState}`). Corre ao perseguir, alerta ao ver o jogador, ataca ao morder, treme ao levar golpe. As folhas de 144 px viraram 160 px por quadro (~2,7 MB em WebP para as 21; baixam sob demanda, fora do orçamento de início — `build-artifact.mjs` agora também isenta `lizard` e `capybara`).
- **Capivara:** `FarmKind 'capybara'` (passeia perto do portão; idle quando parada). Sem reprodução (sem arte de filhote e sem alimento). Folhas de comer/dormir/dano/morte ficam guardadas.
- **Protocolo 23** (novo tipo de animal no espelho da sala): servidor e jogo sobem juntos.

## Orvalis v0.93.60 — mais acampamentos de goblin e o homem-lagarto (14/11/2026)
- **Pedido do dono do produto:** "1 acampamento a cada 4 chunks" e incluir o **homem-lagarto** (vive perto de rios, anda de 3 em 3; vida 100, ataque 15, 2 Moedas de Cobre; folhas enviadas). **Ajuste meu:** com o chunk de 256 px da grade 2, "a cada 4 chunks" colaria os acampamentos; ficou **1 por região de 4 × 4 chunks** (`PACK_REGION = 32 × SUBDIV` células) — uma constante só para ajustar. Aviso: muda o mapa de **todas as seeds** só nos acampamentos (antes 4, agora ~340–400 em ±10 regiões em volta da cidade).
- **Homem-lagarto** (`MonsterKind 'lizard'`): bandos de 3 na margem de rios (`WorldGenerator.riverAt`, novo; sem fogueira), ficha em `MONSTER_STATS`, espólio em `monsterDrops`, mesmas 7 folhas do goblin (`--rows-map 0,2,3,1`, a ordem enviada era frente/costas/esquerda/direita), `hasPoses(kind)` no lugar dos `=== 'goblin'` (estado visual, sala e espelho).
- **Streaming dos bandos** (`Entities.updatePacks`, a cada 0,5 s): só vivem os bandos com jogador a até 56 × `SUBDIV` células (somem além de 80 ×); sem isso ~2 800 goblins entrariam no `blocker` O(n). Efeito: bando derrotado volta completo depois de o jogador se afastar e voltar.
- **Protocolo 22** (novo tipo de monstro na sala): servidor e jogo sobem juntos (`build:net` + `sync-net`).
- Testes: acampamentos por região, bandos de rio, ficha/espólio/pose do lagarto, streaming (490 testes, grades 1 e 2).

## Orvalis v0.93.59 — grade fina, F7: a virada — o Mundo passa a `SUBDIV = 2` (13/11/2026)
- **Pedido do dono do produto:** "Pode começar a F7". `DEFAULT_SUBDIV = 2`: célula de metade do lado, mundo do mesmo tamanho em pixels. Santuário Celestial fica na grade 1 (`sanctuaryPage()`; outro mundo, ADR 0028).
- **Paredes e porta de parede no Mundo em qualquer grade** (perfil sempre com paredes): na grade fina a frente empilha `SUBDIV` peças e a porta sai ×`SUBDIV` (`sanctuaryWallArt.ts`).
- **Bugs reais achados com `ORVALIS_SUBDIV=2 npm test`:** visão de lobos/goblins escalada duas vezes; raio fixo `5` apagava todos os goblins; `villagerInFront` sem escala — corrigidos. Testes de rede, mundo e jogo passam a depender de `SUBDIV`; suíte verde em `SUBDIV` 1 e 2 (486 testes).
- **Medição (SwiftShader, `perf:cpu:3d`):** ~3,2–3,5 ms de JS por quadro no 3D (praça, noite, floresta, dungeon).
- **Servidor:** precisa subir junto (`build:net` + `sync-net`, PR no `orvalis-servidor`); `hello.sub` recusa quem fala outra grade. Implantação conjunta só com aval do dono do produto. Quem já tem save v15/v16 grade 1 migra sozinho (cópia `…:grade-1`).

## Orvalis v0.93.58 — grade fina, F6: salvamento v16, protocolo 21 e a sala na mesma grade (13/11/2026)
- **Pedido do dono do produto:** F6 junto com o servidor. Nada muda para quem joga hoje (a grade padrão segue 1: `DEFAULT_SUBDIV = 1`); a F7 troca para 2 no jogo e no servidor ao mesmo tempo.
- **Migração pura e compartilhada** (`world/subdiv.ts`, sem DOM — roda no navegador e no pacote do servidor): chunks (o chão repete nas 2 × 2 células; cubos, paredes, portas, cercas, plantações e ar repetem; árvores, flores, baú, fogueira etc. ficam só na célula do canto inferior esquerdo, a mesma regra de `upsampleTown`), névoa do minimapa, buracos, tenda, baús, jogador, ovelhas e monstros do covil. Só aumenta a grade (1 → 2); diminuir é erro.
- **Salvamento v16** (`game/save.ts`): campo `sub`; v15 migra como grade 1; `rescaleSave`; `SaveStore.load` guarda **uma cópia do arquivo antigo** (`…:grade-1`) antes de converter e **não abre nem sobrescreve** um arquivo de grade mais fina que a do jogo (aba/versão antiga).
- **Protocolo 21 e sala:** `hello` carrega `sub` e a sala recusa quem fala outra grade ou outra versão; `RoomSnapshot` v5 grava `sub` e `restore` converte arquivos antigos (`rescaleRoomSnapshot`: chunks, baús, bichos, buracos; bolsas intactas) e **recusa** (sem tocar) o arquivo de grade mais fina.
- **Servidor** (`orvalis-servidor`): pacote do jogo sincronizado — traz de uma vez tudo o que faltava desde a v0.93.7 (paredes e porta de parede no Mundo, Mercado, física sem degrau do jogador, etc.) — e o arquivo da sala ganha **cópia de segurança** (`sala-N.json.antes-<pacote>.bak`) antes da primeira regravação de cada pacote novo.
- 15 testes novos (`subdiv`, `save`, `fixedRoom`). **Limites conhecidos:** chunks já editados entram na grade nova com o contorno do terreno em degraus de 2 × 2 (os não editados são gerados lisos); árvores e flores dos chunks editados ficam onde estavam (os não editados têm novas posições); o arquivo salvo cresce ~4× (cota do navegador). **Deploy:** servidor e site juntos (versão de protocolo nova).

## Orvalis v0.93.57 — o Mercado: três lojas, um cômodo, um mercador e compras com Moedas de Cobre (13/11/2026)
- **Pedido do dono do produto (13/11):** as três lojas lado a lado passam a ter **um só nome, "Mercado"**, e **um só interior** (arte enviada): três entradas, três saídas que dão no mesmo lugar; um NPC fixo no mercado; comprar com as moedas dos goblins; só **consumíveis** à venda.
- **Interior de várias portas** (`world/interiors.ts`): `InteriorDef.buildings` + `InteriorLayout.doors` (capachos `E` agrupados da esquerda para a direita, cada um ligado à porta da sua loja: poções → armazém → ferramentas); `World.interiorDoorAt`, `exitDoorAt`. Cômodo `market` 24 × 13 (`assets-src/interiors/market.png` → `interior-market.webp`), balcões e caixotes bloqueados, mercador nos corredores atrás dos balcões. As três construções se chamam "Mercado" (`town.ts`). A tenda passou de posição na fila de cômodos (não é salva; ao carregar dentro de um cômodo volta para a rua).
- **Mercador: Bento** (padeiro), `role: 'merchant'` (`game/npcs.ts`): mora atrás dos balcões e **tocar nele abre a loja** em vez da conversa; sai da lista dos moradores das ruas (agora 14 + Black + Bento).
- **Loja** (`world/shop.ts`, regras puras): vitrine = toda comida (`FOOD`), preços provisórios em Moedas de Cobre — batata 1, tomate 1, cenoura 2, maçã 2, leite 2, pão 4, queijo 4, macarrão ao molho 6, torta de maçã 8; `buyOffer` é tudo-ou-nada (`ok`, `coins`, `full` com a bolsa cheia). **Janela** (`game/shopWindow.ts`, CSS `.shop`): a moldura é a arte enviada (`assets-src/ui/shop-frame.png`, sem os textos que mudam: `scripts/make-shop-frame.py`), com o retrato do mercador no círculo, título, fala, 10 espaços (ícone, nome, preço), páginas e saldo por cima; tocar num item compra 1; "Vender" responde "em breve". O jogo pausa com a janela aberta; Esc, X ou tocar fora fecham.
- **Verificado no navegador:** entrada pelas 3 portas no mesmo cômodo e saída de cada capacho na sua porta; janela fiel à arte; compra de pão (9 → 5 moedas, +1 pão), recusa da torta (faltam moedas), Esc fecha. Achado e corrigido no teste: a janela herdava `pointer-events: none` do HUD e os cliques passavam para o canvas.
- 12 testes novos (`shop.test.ts`, `interiors.test.ts`, `villager.test.ts` atualizado). **Fora do escopo / pendente:** aba Vender, mais categorias, preços de venda; janela em celular deitado (a arte é vertical: cabe, mas os textos ficam pequenos — avaliar uma versão em duas colunas); sala: o mercador e a loja são locais (nenhuma mensagem nova; a bolsa já sincroniza).

## Orvalis v0.93.56 — Paredes de Tábuas e Pedra e Porta de Parede no Mundo (W5 enxuta) (13/11/2026)
- **Decisões do dono do produto (13/11):** altura da parede na grade fina = **2,4 cubos** (recomendação aceita: a mesma de hoje, ≈ a altura do personagem); **paredes e porta com ícone entram no Mundo** (a porta de parede usa o ícone da Porta de Carvalho).
- **No Mundo (3D):** `ChunkWalls` (`render/three/chunkWalls.ts`) desenha as paredes autotile do Santuário — tampa e frente com a arte real, emenda entre chunks, porta que troca de quadro — por chunk, com texturas compartilhadas (`WallPieceCache` em `sanctuaryWallArt.ts`); `pick` e quebrar funcionam. Atlas de Tábuas e Pedra e ícones no pacote do Mundo (`art/principal.ts`, `textures.ts`).
- **Economia (`world/items.ts`, provisória, ajustável):** Parede de Tábuas = 2 Tábuas de Carvalho → 2; Parede de Pedra = 2 Pedras Brutas → 2; Porta de Parede (Tábuas) = 4 Tábuas → 1, no Construtor; quebrar devolve o item (a porta, aberta ou fechada, volta a porta). Perfil principal lista os três blocos (hotbar com 3 a mais).
- **Fora do escopo (próximas):** casas/cidade e interiores refeitos com paredes autotile; porta de Pedra; animação do quadro intermediário da porta no Mundo; **grade fina** (`?grade=2`): sem paredes por ora — na W5-grade a parede empilha `SUBDIV` frentes (altura 2,4 cubos) e a porta pede arte 1 × 2. **Sala:** o servidor precisa de `build:net` + `sync-net` + deploy para aceitar paredes (sem mudança de mensagem; `PROTOCOL_VERSION` 20 mantido). **2D de reserva (`?render=2d`/sem WebGL) não desenha paredes** (continuam sólidas): some no M7.
- 4 testes novos (`wallsMundo.test.ts`); 3 testes que registravam "o Mundo ainda não tem paredes" atualizados; recibos `plank-wall`/`stone-wall`/`plank-wall-door` (o prefixo `wall-` é guardado pelo teste das paredes antigas removidas).

## Orvalis v0.93.55 — grade fina, F5: comparação da altura da parede e corpo que passa por vão de 1 célula (13/11/2026)
- **Comparação da parede (pergunta 3 da ADR 0032):** `?mundo=santuario&paredes=teste&escala=grade` mostra, lado a lado e com o personagem nos mesmos pixels, o **Core Keeper de hoje** (parede ≈ 1,2) e três alturas na grade fina — **2,0**, **2,4** e **3,0 cubos** de 0,5 (`ScalePreset` `grade20/24/30`, `GRADE_COMPARE`; cada grupo traz cubo, parede, régua de 2 segmentos e o personagem de referência). Em dev, a cena de escala do Mundo (`?escala=`) passou a valer só no mundo principal (antes escondia o teste do Santuário).
- **Corpo do jogador na grade fina:** a meia-largura dobrada (0,54 → corpo de 1,08) não passava por um vão de **1 célula** (porta, portão, abertura numa fileira de blocos). `WalkerSpec.maxHalfW` + `scaleSpecBy` (pura): o jogador tem teto de 0,45 (corpo de 0,9); monstros e animais seguem dobrados. Padrão inalterado. 4 testes novos (`walker.test.ts`, incluindo a travessia de um vão real: 0,45 passa, 0,54 trava).
- **Paredes no Mundo continuam sendo a W5** (o perfil principal não tem paredes, receitas nem arte delas): a W5 será feita já na grade fina, com a altura escolhida nesta comparação.

## Orvalis v0.93.54 — grade fina, F4: interiores, tenda, covil, lobos e goblins (só dev, `?grade=2`) (13/11/2026)
- **ADR 0032, F4:** com `?grade=2` o mundo inteiro existe na grade fina com os mesmos pixels de hoje — agora também os cômodos, o covil e os bichos do mapa.
- **Interiores e tenda:** `scaleInteriorDef` (`world/interiors.ts`) amplia cada caractere do mapa do cômodo 2 × 2 (a arte cobre a área nova inteira); o capacho vira 2 × 2 (`interiorExitAt`; pisar em qualquer célula sai), a porta da rua vale `SUBDIV` células (`World.interiorEntrance`), o ferreiro e suas linhas acompanham; espaçamento e anel × `SUBDIV`.
- **Covil e caverna:** `upsampleDungeon` (`world/dungeon.ts`) amplia o labirinto (chão, paredes e montanhas repetem; adereços numa célula; posições dos monstros × `SUBDIV`), `DungeonLayout.scale` guarda a escala das listas de células (`dungeonEntry`, `isDungeonExit`); anel de montanhas, aterrissagem, base e frente da caverna e distâncias do `planCave` × `SUBDIV` (a boca vale `SUBDIV` células: `World.isCaveDoor`).
- **Lobos e goblins:** regiões, distâncias, raio de passeio e posições do bando/acampamento × `SUBDIV`; `planGoblinCamps` voltou na grade fina.
- **Conferido no navegador (seed 42):** a Ferraria (entrada pela porta, arte e ferreiro no lugar), a caverna levando ao covil (corredores, teias e ossos) e **as mesmas contagens do padrão** — 4 acampamentos, 26 bandos, 1 chefe, 10 aranhas grandes, 28 pequenas, 28 goblins, 26 lobos. 9 testes novos (`interiors`, `dungeon`). Padrão inalterado (`SUBDIV = 1`).
- **Falta (F5–F7):** paredes e portas de parede, save, protocolo e servidor, virada; sala (servidor) ainda não simula a grade fina.

## Orvalis v0.93.53 — grade fina, F3: a cidade (só dev, `?grade=2`) (13/11/2026)
- **ADR 0032, F3:** com `?grade=2` a Cidade do Despertar existe na grade fina, **com os mesmos pixels de hoje**: `upsampleTown` (`world/town.ts`) amplia o mapa lógico 2 × 2 — área, portão, construções (retângulo e porta), ruas, muralha de 2 cubos, `TOWN_PART` e sebes repetem nas 4 células; o id da construção fica na célula do canto inferior esquerdo; objetos soltos (árvores, flores, postes, barris, caixas, placas) numa célula só. `TOWN_MARGIN`/`TOWN_SOUTH_FIELD`/`TOWN_WALL`/estrada × `SUBDIV`. A arte dos prédios mantém os pixels (`objectScaleFor('building')`); as sebes ficam do tamanho da célula (`worldSpriteArt`).
- **Conferido no navegador (seed 42):** praça inicial, poço, bancos, torres, lampiões, casas, a Guilda e o castelo com os mesmos tamanhos do padrão, personagem igual; NPCs presentes. 5 testes novos (`town.test.ts`: dimensões, retângulos das construções, âncora única, muralha/portão, objetos soltos × repetidos). Padrão inalterado (`SUBDIV = 1` devolve o mesmo mapa).
- **Ainda fora da grade fina (F4):** interiores e tenda (por ora sem cômodos), dungeon, lobos e goblins. **Risco anotado:** construções grandes são montadas pelo chunk da âncora; com chunks de 16 células finas o castelo (52 células) pode sumir se a âncora sair da margem — verificar no uso.

## Orvalis v0.93.52 — grade fina, F2: objetos e elementos ao redor dos atores (só dev, `?grade=2`) (13/11/2026)
- **Aprovado pelo dono do produto (13/11):** o protótipo F1 "ficou ótimo" (proporção personagem × terra, cenoura, trigo e árvores).
- **Tabela de tamanhos em código:** `objectScaleFor(shape)` (`render/worldScale.ts`, testada): árvores e prédios mantêm os pixels de hoje (crescem `SUBDIV` em células, em volta do meio da base; tronco 1 × 1); decoração, cultivos, cercas, móveis, baú, tenda e pedregulho encolhem com a célula (conferido num catálogo de todos os objetos ao lado do personagem). `worldSpriteArt` usa a tabela.
- **Em células × `SUBDIV` (para manter os pixels):** números de dano (altura e subida), ícones e sombra dos itens caídos (tamanho, pulo e flutuação), anel da ovelha, raio de revelação do minimapa, e o rebanho/cavalo/vacas/galinhas iniciais (distâncias do sorteio).
- **Fica para as próximas fatias:** portas (1 × 2) e paredes (F5), cidade/prédios (F3), interiores e dungeon (F4), save/protocolo/servidor (F6). Padrão inalterado (442 testes), sem mudança de save, protocolo ou servidor.

## Orvalis v0.93.51 — grade fina, protótipo F1: `?grade=2` (só dev) (13/11/2026)
- **ADR 0032, F1:** com `?grade=2` (apenas em desenvolvimento; no site é ignorado) cada célula tem metade do lado e **o mundo mantém o tamanho de hoje em pixels**. `config.ts`: `SUBDIV` (1 ou 2; sem `window`, no servidor, é sempre 1).
- **O que muda com `SUBDIV = 2`:** gerador em `x / SUBDIV` (mesmas formas de continentes, rios e biomas, com mais resolução; densidades de árvores, pedras e flores ÷ `SUBDIV²`); câmera com 28 células (`WORLD_CELLS_TALL`) e atores com o fator proporcional (personagem, NPCs, animais e monstros mantêm os pixels); árvores ampliadas ×`SUBDIV` em volta do meio da base (`SpriteDraw.scale`, tronco 1 × 1); jogabilidade em células × `SUBDIV` — velocidade e caixa dos pés (`Walker`/`scaleSpec`), alcance de ação, golpe, visão e coleira de monstros, namoro, coleta, passeio dos animais; terra, cultivos, cercas e móveis encolhem junto com a célula.
- **Protótipo, não jogo:** sem cidade, dungeon, lobos e goblins, sem salvar, sem sala, só 3D; a cidade, os interiores, as paredes e o resto da jogabilidade em células (F3–F5) ainda não foram convertidos. **Padrão inalterado:** 441 testes (determinismo do gerador com `SUBDIV = 1` idêntico), mapa, save, protocolo e servidor intactos.
- **Medido (headless, software GL, seed 42):** custo de JS do `draw` médio 5,8 ms (14 células) → 6,8 ms (28), p95 23,8 → 26,2 ms; velocidade 4,2 → 8,4 células/s (mesmos pixels por segundo).

## Documentação — ADR 0032: grade fina do Mundo, padrão Stardew (13/11/2026, sem versão)
- **Decisão de direção do dono do produto (13/11):** testou `?celulas=28` — gostou do tamanho de células e objetos, **não** do mundo encolhido; quer o mundo no tamanho de hoje com células/objetos proporcionais ao personagem, "mesmo que dê mais trabalho", e o **padrão do Stardew Valley** (uma grade, personagem 1 × 2 tiles, planta/terra/cerca 1 tile, porta 1 × 2, tronco 1 × 1 com árvore alta).
- **ADR 0032 (proposta):** `SUBDIV = 2` (1 célula = 2 × 2), impacto por camada medido no código (gerador em `x / SUBDIV`, cidade/dungeon/interiores ampliados, jogabilidade × `SUBDIV`, `SAVE_VERSION` 16, `PROTOCOL_VERSION` 21 + servidor, ~4× células a desenhar), tabela de objetos, fases F0–F7 e seis perguntas abertas; substitui a escala em células da ADR 0028 para o Mundo. Nenhum código alterado.

## Orvalis v0.93.50 — experimento de escala do Mundo: `?celulas=N` (13/11/2026)
- **Pedido do dono do produto:** a célula/blocos ficaram grandes perto do personagem (cenoura, trigo e terra arada "gigantes"); o tamanho visual do personagem está bom. Proposta em estudo (passo 1 do plano): reduzir a célula em até 50% e reclassificar os objetos (encolhem com a célula / mantêm os pixels / passam a ocupar mais de uma célula).
- **Experimento (3D, só para comparar; sem mudar o padrão):** `?celulas=N` mostra N células na vertical (padrão 14; limites 10–32) e o fator dos atores (personagem, NPCs, animais, monstros) sobe na mesma proporção (`actorScaleFor`), então o personagem mantém os pixels e o resto do mapa encolhe. `render/worldScale.ts` (+ teste), `worldThreeRenderer.ts`, piso de zoom da câmera baixado de 0,5 para 0,25 (só para mais de 14 células). Nome `?celulas=` porque `?escala=` já abre a cena de comparação de dev e o teste de paredes do Santuário. Verificado em 1280×720: 14 e 28 células (personagem igual; árvores, lampiões e casas ficam menores que o personagem — como previsto).
- **Não muda:** padrão, mapa (células), protocolo, save, servidor, Canvas 2D de reserva (o parâmetro só vale no 3D). Tabela de objetos e ADR 0032 vêm depois da escolha do valor.

## Orvalis v0.93.49 — ícones de arte das paredes na hotbar (13/11/2026)
- **Arte enviada pelo dono do produto:** ícones da **Parede de Tábuas** (tora e painéis) e da **Parede de Pedra**. Originais em `assets-src/icons-paredes/`; recorte pela silhueta (alfa > 10, ignora o véu quase invisível das bordas), quadrado 128 px, WebP q84 em `src/assets/icon-wall-*.webp`, registrados em `celestialIcons` do pacote do Santuário (`render/art/santuario.ts`) — `iconFor` já os devolvia antes do provisório. Teste novo em `santuario.test.ts`.
- **Porta de parede:** sem ícone enviado, segue com `wallPlaceholderIcon`. O Mundo principal ainda não lista paredes (W5). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.48 — corrige a entrada no jogo que ficava no 2D/travava (13/11/2026)
- **Relato do dono do produto:** ao entrar no jogo ele "travava com a tela do 2d" e só voltava a funcionar (em 3D) depois de reiniciar. **Causa:** a vitrine da tela de título (`showcase`) roda um `Game` em Canvas 2D no `#world`; um canvas que recebeu contexto 2D **não aceita WebGL**, então o `Game` 3D criado por "Novo jogo"/"Continuar" falhava (`THREE.WebGLRenderer: Error creating WebGL context`) e a tela ficava parada. Reproduzido no headless antes do conserto.
- **Correção (`main.ts`):** cada `Game` (vitrine, solo, sala, sair da sala) ganha um `<canvas id="world">` novo (`freshCanvas()`, mesmo id/classe/estilo) depois de o anterior ser destruído. Verificado: título → Novo jogo → Começar entra em WebGL. Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.47 — a virada: o Mundo passa a usar o 3D por padrão (13/11/2026)
- **Decisão do dono do produto (13/11):** virada já, com 2D de reserva e física sem degrau como padrão no 3D. PC (~60 fps, JS 3,4 ms, sem vazamento), celular e tablet ("rodando ok"), faixas das copas e seleção corrigidas.
- **O que muda para quem joga:** o Mundo principal usa o renderer 2.5D em WebGL (solo e online). `?render=2d` e aparelhos sem WebGL (ou falha ao carregar o módulo) usam o Canvas 2D de antes. Com o 3D o jogador **não sobe em cubos sozinho** (`?fisica=degrau` volta à regra antiga); lobos e goblins seguem com degrau.
- **Código:** `render/rendererChoice.ts` (puro, testado) decide o renderer e a física; `main.ts` carrega o `WorldThreeRenderer` sob demanda e o passa ao `Game` solo e online; `?fps=1` agora vale em qualquer build; o build de piloto (`VITE_PILOT_3D`, `build:piloto3d`, `preview:piloto3d`) deixa de existir. Scripts `parity:3d` e `perf:cpu:3d` passam a usar `?render=2d` para o 2D. 437 testes (3 novos).
- **Servidor e protocolo: nada muda** (a sala não simula o movimento do jogador). **Dívida:** o início do Artifact de arquivo único passou de 2,94 MB para 3,49 MB (Three.js embutido), acima do orçamento de 3 MB; o site, que carrega o 3D sob demanda, não é afetado. Riscos não verificados: Safari/iOS, iframe do Artifact e sala multiplayer em 3D — conferir após o deploy (NEXT_STEPS).

## Documentação — confirmação do dono do produto e plano da virada (13/11/2026, sem versão)
- **Confirmado no PC:** as faixas nas copas sumiram e o enquadramento da seleção melhorou (v0.93.45). **Celular e tablet: "rodando ok"** (sem relatório numérico). Registrado em `docs/PARITY_3D.md`.
- **Plano do M6 (virada) detalhado na ADR 0031:** 3D padrão com `?render=2d` de reserva, física sem degrau padrão no 3D (só o jogador), **servidor e protocolo sem mudança** (a sala não simula o movimento do jogador; lobos e goblins seguem com degrau), online com o mesmo renderer, peso do build (Three.js no Mundo), Artifact e reversão. Nenhum código alterado; a virada aguarda a decisão do dono do produto.

## Orvalis v0.93.46 — relatório do PC aprovado e teste de vazamento do 3D (13/11/2026)
- **Relatório do dono do produto (PC Windows, Edge, 1912 × 948, v0.93.45, 180 s, zero pausas):** média **59,6 fps**, 5% piores **51,8 fps**, pior quadro 67 ms, **0,3%** dos quadros > 33 ms, JS do `draw` **3,4 ms** (p95 6,2) — o 3D roda a ~60 fps fixos no PC. Registrado em `docs/PARITY_3D.md`.
- **`npm run leak:3d`** (`scripts/leak-3d.cjs`): percorre ~140 chunks novos com `?render=3d`, coletando o lixo a cada passo, e falha se texturas, geometrias ou memória do JS crescerem depois do aquecimento. Resultado: texturas estáveis em ~104, geometrias em 84, JS em 15 MB — **sem vazamento** (os 58 MB do relatório eram lixo ainda não coletado).
- Só ferramenta e docs; sem mudança de jogo, protocolo, save ou servidor.

## Orvalis v0.93.45 — árvores sem faixas, seleção igual à do 2D e medidor que ignora pausas (13/11/2026)
- **Achados do teste no PC (dono do produto):** (1) copas de árvores com faixas e transparência — *z-fighting* entre planos de objetos vizinhos na mesma linha (mesma profundidade); (2) seleção de blocos "inexata". Corrigidos no render 3D do Mundo (só dev/piloto):
  - **Profundidade:** `spriteDepthBias` — cada coluna avança uma fração de célula (0,0015, ciclo de 64) para o lado do espectador, reproduzindo a ordem esquerda→direita do 2D; objetos e portas ganham 0,01 de folga sobre as faces dos cubos (mesmo plano). Tudo < 0,14 (pés do personagem).
  - **Seleção:** moldura do cursor, cantoneiras do alvo e rachaduras extraídas do `Renderer` 2D para `render/selectionFx.ts` (o 2D passou a usá-las, igual) e usadas na camada 2D do 3D, em volta do que se vê (`worldSelection.ts`: cubo = topo + frente, 1 × (1 + K) células; objeto = retângulo clicável; chão = ladrilho). Antes o 3D mostrava um quadrado plano amarelo, só quando válido.
  - **Alvo das ferramentas de chão:** `GameRenderer.pickGround` (opcional; só o 3D implementa) devolve o cubo/chão **visto** sob o cursor, ignorando árvores como o 2D; `ActionController.groundCell` o usa. Com K = 1 o topo de um cubo cobre o chão da célula ao norte e a pá/enxada/semente agiam na célula errada.
- **Medidor `?fps=1`:** pausas do navegador (> 1 s entre quadros, p.ex. aba em segundo plano) saem das médias e viram `pauses` no relatório; o relatório de 159 s do dono do produto (média 51 fps, "pior quadro" 15,4 s) era uma pausa — sem ela ≈ 58,7 fps, JS do `draw` 3,9 ms, 0,4% dos quadros > 33 ms. Registrado em `docs/PARITY_3D.md`.
- 434 testes (9 novos). Build de produção inalterado; o 2D segue igual (moldura e cantoneiras idênticas). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.44 — painel `?fps=1`: regime estável e tempo de JS do draw (13/11/2026)
- **Primeiro relatório em aparelho real** (PC Windows, Edge, 1912 × 948): média 51,7 fps, 5% piores ≈ 21 fps, pior quadro 200 ms, 252 chamadas / 5,0k triângulos — **inconclusivo** (cena leve; suspeita de engasgos de CPU e da carga inicial misturada à média). Registrado em `docs/PARITY_3D.md`.
- **Painel melhor:** o relatório passa a trazer o **regime estável** (depois de 8 s de carga: FPS médio, 5% piores, pior quadro, % de quadros > 33 ms e > 50 ms) e o **tempo de JS do `renderer.draw`** (`jsDrawMs`: média, p95, máx.), medido pelo `Game` num anel de 1200 quadros (`Game.drawTimes`); a linha do painel mostra `JS x ms`. Assim se vê se o gargalo é CPU (o JS acompanha o quadro lento) ou GPU/compositor (JS pequeno, quadro lento). Conferido no navegador. 2 testes novos (425). Só dev/piloto; sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.43 — medição do custo de JS por quadro, 2D × 3D (13/11/2026)
- **`npm run perf:cpu:3d`** (`scripts/perf-cpu-3d.cjs`): mede, em 4 cenários (praça, noite, floresta densa, labirinto), o tempo que `renderer.draw` gasta na thread do JS — a parte do custo que não depende da GPU. Primeira medição (VM sem GPU, dev): **2D ≈ 1,1 ms; 3D ≈ 2,7–3,4 ms por quadro** (p95 ≤ 5 ms, máx. 9,6 ms), em `docs/PARITY_3D.md`. Cabe no orçamento de 30 FPS (33 ms), sem grande folga em celular fraco; a GPU só se mede em aparelho real (`?fps=1`).
- Só ferramenta e docs; sem mudança de jogo, protocolo, save ou servidor.

## Orvalis v0.93.42 — painel `?fps=1`: plano B quando não há área de transferência (13/11/2026)
- **Correção:** em HTTP na rede local (o caso de testar no celular) o navegador não libera `navigator.clipboard`; o toque no painel não fazia nada. Agora mostra o relatório (JSON) numa caixa de texto já selecionada para copiar à mão ou tirar um print (toque na caixa fecha); com permissão, copia e confirma por 3 s. A linha de medição não apaga mais as mensagens em meio segundo.
- Conferido no navegador nas duas vias (com e sem `clipboard`). OPERATIONS: como obter o relatório e quando anoitece (8 min por dia). Só dev/piloto; sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.41 — M5.2: física sem degrau no piloto do Mundo, atrás de `?fisica=solida` (13/11/2026)
- **Decisão do dono do produto (13/11):** seguir a recomendação — flag no piloto, padrão inalterado, servidor só na virada. **`?fisica=solida`** (dev e build de piloto, só com `?render=3d`, offline) liga `stepHeight = 0` no jogador do Mundo (`configureSanctuaryThreeCollision` ganhou o 4º parâmetro `solidWorld`; `Game` recebe `solidPhysics`). Sem a flag, no 2D ou online (a sala): a regra antiga (degrau de 1 nível). Só o jogador muda: lobos e goblins mantêm o degrau deles (decisão pendente).
- **Servidor:** nada muda agora. A sala usa o mesmo `World`/`Walker`; a regra sem degrau só vai a ela na virada (`build:net` + `sync-net` + `PROTOCOL_VERSION`), registrado em `PARITY_3D.md` e NEXT_STEPS.
- Conferido no navegador (seed 42): com a flag o jogador para diante do cubo (stepHeight 0, x = 2,67); em 3D sem a flag e no 2D passa por cima (stepHeight 1). 2 testes novos (421 → 423). **Build de produção inalterado** (a flag só existe em dev/piloto). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.40 — M5.1: checklist de paridade 2D × 3D e medição em aparelho real (13/11/2026)
- **`npm run parity:3d`** (`scripts/parity-3d.cjs`): abre o jogo em 2D e em `?render=3d` nos mesmos 10 cenários (praça, portão, floresta, água, item caído, noite, interior, covil, labirinto, construção) e gera `parity-out/index.html` com as capturas lado a lado; sai com erro se houver erro de console. Resultado e pendências em **`docs/PARITY_3D.md`** (todos os 10 cenários ✅ no headless).
- **Piloto em aparelho real:** `npm run build:piloto3d` (`VITE_PILOT_3D=1`, `dist-piloto/`) e `npm run preview:piloto3d` (na rede). O build de produção segue **sem** o 3D (conferido). `?fps=1` (`dev/perfHud.ts`, testado): painel com FPS, tempo de quadro e o pior, chamadas/triângulos/texturas/geometrias da GPU e memória; **toque copia o relatório (JSON)**. Funciona também no 2D, para comparar. `Game.rendererStats` exposto.
- **Medição honesta:** `ThreeStage` agora acumula os contadores de **todas as passadas** do quadro (cena + luz); antes `stats()` mostrava só a última (a camada de luz) — corrigido também para o Santuário.
- **Achado da paridade (corrigido):** na floresta densa o jogador sumia atrás das copas (z-buffer correto, mas sem pista de onde ele está) → **eco translúcido** do jogador por cima de tudo (`ActorBillboards` `echo`), como no Santuário.
- Só dev/piloto; física inalterada. 421 testes (8 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.39 — M4.2: dungeon do Mundo em 2.5D; M4 concluído (13/11/2026)
- **Parede do labirinto em 2 níveis:** `ChunkSprites` aceita `stack` (de `textures.stackDraw`) — instâncias uma unidade de altura acima da outra (`SpriteCell.lift`; o `pick` desconta a altura do exemplar).
- **Farol, seta da entrada e escuro fora do labirinto** extraídos do `Renderer` 2D para `render/dungeonFx.ts` e **compartilhados** com a camada 2D do 3D (o 2D segue igual). A penumbra do covil é a luz dinâmica (ambiente 0,3 + luz do jogador). `entrance` e `dungeonArea` → `honored`: todos os campos de `RenderOptions` estão atendidos no Mundo 3D (exceto a depuração `showChunkBorders`).
- Conferido no navegador (seed 42): entrada do covil com o farol roxo e pétalas, e o interior do labirinto (paredes empilhadas, escuro fora da área, penumbra) em 3D × 2D, sem erros. **M4 concluído** em `?render=3d` (só dev). Falta o **M5 — piloto**. Física inalterada. 416 testes (3 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.38 — M4.1: interiores do Mundo em 2.5D, atrás de `?render=3d` (13/11/2026)
- **`InteriorRoom`:** ao entrar numa construção (`opts.interior`), o conteúdo do mundo aberto (agora numa `worldLayer`) é escondido e a arte pronta do cômodo é estendida sobre o chão da área — na vista oblíqua K = 1 aparece igual ao 2D —, com o fundo escuro; atores e itens em pé por cima (só os de dentro), sem céu, nuvens, luz da noite nem partículas. Ao sair, o mundo volta e o fundo do céu é restaurado. O cômodo segue isolado ao norte (ADR 0014; decisão de manter o cômodo isolado até o W5). `interior` → `honored`.
- Conferido no navegador (seed 42): ferraria em 2D × 3D — arte, ferreiro e personagem corretos, camada do mundo escondida lá dentro e de volta na rua, sem erros. Ainda sem a dungeon (covil, farol e seta da entrada: M4.2) e o piloto (M5). Só dev; física inalterada. 413 testes (4 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.37 — M3.4: porta animada e partículas do Mundo em 2.5D; M3 concluído (13/11/2026)
- **`doorAnim.ts` (puro, testado):** a animação da porta (8 quadros, 0,32 s, sem animar na primeira vez vista) extraída do `Renderer` 2D e **compartilhada** com o 3D; o 2D passou a usá-la sem mudar o comportamento (conferido: fechada, abrindo e aberta iguais). **`DoorSprites`:** portas fora do `ChunkSprites`, um plano por porta visível com o quadro do momento, lista por chunk guardada por `chunk.version`, aberta não escreve profundidade, `pick` pelo retângulo clicável.
- **Partículas do bioma** (pétalas, poeira, pólen, vaga-lumes à noite) na camada 2D, na ordem do 2D. `player` → `honored`.
- Conferido no navegador (seed 42): porta fechada → folha girando → aberta em 3D, 55 partículas ativas, sem erros. **M3 concluído** em `?render=3d` (só dev): atores, itens, dano, luz/dia-noite, porta animada e partículas. Faltam interiores e dungeon (M4) e o piloto (M5). Física inalterada. 409 testes (7 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.36 — M3.3: luz e ciclo dia/noite do Mundo em 2.5D (13/11/2026)
- **Decisão do dono do produto (13/11):** a luz do Mundo liga **só à noite e na dungeon**; de dia o jogo fica claro como hoje (a camada nem é desenhada). Registrada na ADR 0031.
- **`worldLight.ts` (puro, testado):** brilho ambiente pelo mesmo `skyAt` do 2D (1 de dia → 0,24 à meia-noite; penumbra de 0,3 na dungeon), cor da escuridão e coleta das luzes visíveis — a do jogador + fogueira, caldeirão, forno e lampiões da cidade (raio/cor das tabelas existentes), mais próximas primeiro, com a oscilação do fogo. `SanctuaryLighting.setAmbient` (brilho e cor variáveis) reaproveita o shader do Santuário (teto de 12 luzes). `time` e `inDungeon` → `honored`.
- Conferido no navegador (seed 42): meio-dia sem camada (179 chamadas de desenho), entardecer escurecendo, meia-noite com poça de luz no jogador e brilho nos lampiões da praça, sem erros. Ainda sem tinta laranja do pôr do sol, brilho aditivo de dia, sombras projetadas e oclusão da luz (parte da evolução da ADR 0029); animação da porta e partículas (M3.4). Só dev; física inalterada. 402 testes (6 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.35 — M3.2: camada 2D (dano, vinheta, fade) do Mundo em 2.5D (13/11/2026)
- **`Overlay2D`:** canvas 2D irmão do canvas do jogo, logo depois dele no DOM (abaixo do HUD), `pointer-events: none`, redimensionado só quando a tela/densidade mudam. Desenha **números de dano** (`addDamage` agora funciona; crítico amarelo e maior, dano no jogador vermelho), **vinheta de dano** (`hurtFlash`) e **fade de porta** (`fade`) com o mesmo código do 2D. `WORLD_THREE_OPTIONS`: `dt`, `hurtFlash` e `fade` → `honored`.
- Conferido no navegador (seed 42): números 99! / 12 / 37 acima do jogador, overlay sem pegar toques (o elemento sob o ponto continua sendo o canvas do jogo), sem erros. Ainda sem luz e dia/noite (M3.3), animação da porta e partículas (M3.4), interiores e dungeon (M4). Só dev; física inalterada. 396 testes (4 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.34 — M3.1: atores, itens caídos e anel da ovelha do Mundo em 2.5D (13/11/2026)
- **`ActorBillboards`:** jogador, NPCs, animais, goblins e monstros como planos verticais com a folha 2D (a `SpriteSheet` segue desenhando o quadro, o piscar de dano, a morte e a barra de vida), sombra no chão, nome de outros jogadores e coração de namoro; só os atores visíveis (teto 48, o jogador sempre), em pools por tamanho de canvas. `SpriteSheet.frameAspect` exposto. **`DropSprites`** (itens caídos com pulo e flutuação do 2D) e **`HoverRing`** (anel sob a ovelha). `WORLD_THREE_OPTIONS`: `actors`, `drops` e `hoverSheep` agora `honored`.
- Conferido no navegador (seed 42, 2D × 3D): NPCs da praça nas mesmas posições, itens caídos com ícone, sem erros; 121 atores no mundo, 3 desenhados na tela. Escala **provisória** (mesmo fator para todas as espécies). Ainda sem números de dano/flash (M3.2), luz e dia/noite (M3.3), animação da porta e partículas (M3.4), interiores e dungeon (M4). Só dev; física inalterada. 392 testes (7 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.33 — M2.4: efeitos de chão do Mundo em 2.5D; M2 concluído (13/11/2026)
- **`GroundFx`:** brilhos que piscam na água, **buraco enchendo de água** (folha de fluxo por UV) e **sombras de nuvens** à deriva, com a mesma matemática do 2D (`groundFxMath.ts`, testada): pools de tamanho fixo (96 brilhos, 16 fluxos, 16 nuvens), planos colados ao chão sem escrever profundidade. Conferido no navegador (seed 42): brilhos, 5 nuvens e 1 fluxo ao quebrar uma margem, sem erros.
- **M2 (Mundo estático) concluído** em `?render=3d` (só dev): chão por chunk, cubos, objetos altos (inclusive a cidade), água e nuvens. Faltam atores, itens, luz e dia/noite, efeitos (M3), interiores e dungeon (M4) e o piloto (M5). 385 testes (8 novos). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.32 — M2.3: objetos altos do Mundo em 2.5D, atrás de `?render=3d` (13/11/2026)
- **`ChunkSprites`:** cada sprite 2D de objeto vira um plano vertical (base na face sul da célula, tamanho em células da arte, altura ÷ K), instanciado por chunk e sprite, reconstruído por `chunk.version` com orçamento. Sólidos escrevem profundidade (`alphaTest`); os de passar por cima (grama, flor, cultura, porta aberta) não, para nunca cobrir o personagem. **`worldSpriteArt`** repete as escolhas do `drawObject` 2D (variação por célula, porta por estado, cerca emendada por composição de canvas). `pick` pelo retângulo clicável do sprite (sem ler pixels). Arte que chega depois (cultura, dungeon) refaz os planos.
- **A cidade já aparece** (torres do portão, bancos, poço, arbustos, flores) com a mesma arte do 2D; árvores, pedras e mato também. Conferido no navegador (seed 42, 2D × 3D; praça e floresta), sem erros. Ainda sem animação de porta, luz/brilhos, água animada (M2.4), atores além do jogador e itens (M3), interiores e dungeon (M4). Só dev; física inalterada. 377 testes (3 novos do `ChunkSprites`). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.31 — M2.2: cubos do Mundo em 2.5D, atrás de `?render=3d` (13/11/2026)
- **`ChunkBlocks`:** cubos por chunk visível em malhas instanciadas por (bloco, forma `solid`/`thin`), reconstruídas só quando `chunk.version` muda (máx. 2 por quadro; a versão antiga fica na tela), liberadas fora da área; `pick` acerta os cubos e devolve a célula. **`worldBlockFaces`:** topo = textura de chão do material; frente **provisória** (topo escurecido, ou a frente V2 própria esticada a uma célula quando existe — terra sob a grama, casca da tora).
- Conferido no navegador (seed 42, 2D × 3D): fileira fina de tábuas, pilar de pedra de 2 níveis, terra/pedra, grama, tora e areia com as mesmas formas do 2D; pick no pilar certo; sem erros. A água ainda é estática (M2.4); árvores/objetos altos (M2.3), cidade, atores, luz e efeitos seguem fora. Só dev; física inalterada. 374 testes (3 novos do `ChunkBlocks`). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.30 — M2.1: chão do Mundo em 2.5D, atrás de `?render=3d` (13/11/2026)
- **`WorldThreeRenderer`** (só dev; o build de produção não o contém) e **`ChunkFloor`**: um plano por chunk visível com a textura do `ChunkRenderer` (Material V2, transições, barrancas e sombras como no 2D), orçamento de 2 chunks pintados por quadro, reenvio à GPU só quando a `version` muda e liberação dos chunks fora da área. O jogador (`actors[0]`) aparece em plano vertical com a escala do mundo (`CHARACTER_SCALE_FACTOR`, K = 1) e sombra; realces e `pick` no chão. `SpriteSheet.shadowRadii` exposto. `WORLD_THREE_OPTIONS` (mapa de paridade) no contrato.
- Conferido no navegador (seed 42, 2D × 3D no mesmo ponto): chão e jogador corretos, 16 chunks vivos, pick certo, sem erros. **Ainda sem** cubos/terreno alto, objetos, cidade, outros atores, luz e efeitos (fatias M2.2–M2.4 e M3/M4). Física inalterada. 371 testes (4 novos do `ChunkFloor`). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.29 — M1: núcleo 2.5D genérico em `render/three/` (13/11/2026)
- **Decisões do dono do produto (13/11):** aceitas as recomendações da ADR 0031 — Mundo em K = 1 desde o M2, degrau automático sai atrás de flag no piloto, prédios da cidade como planos na paridade, interiores isolados mantidos até o W5; arte de frente dos blocos e árvores provisória; clima (luz) padrão decidido no M3. ADR 0031 passa a **aceita**.
- **M1:** `ThreeStage`, `SelectionMarkers` e `BlockMaterials` extraídos do `SanctuaryThreeRenderer` (548 → ~395 linhas), que passa a compô-los. **Sem mudança visual nem de comportamento**: capturas antes × depois (padrão, `?luz=`, `?vista=inclinada`, `?paredes=teste`) idênticas fora da animação (o código antigo tem o mesmo ruído de 3 mil pixels no teste), mesmas estatísticas de GPU, pick e porta iguais. 2 testes novos do `SelectionMarkers` (367).
- **M0 (pendente do dono do produto):** FPS/memória em celular, iPad e Safari — o headless (swiftshader) não representa GPU real. Linha de base de referência (cena de teste do Santuário, swiftshader): 62 chamadas, 30 956 triângulos, 17 texturas. Sem mudança de protocolo, save ou servidor.

## Documentação — plano de migração do Mundo para Three.js e W5 pendente (13/11/2026, sem versão)
- **ADR 0031 (proposta):** fases M0–M7, decisões propostas (núcleo genérico `render/three/`, malhas por chunk com orçamento, chão = textura do `ChunkRenderer`, atores em billboards, física sem degrau atrás de flag, servidor só nos marcos que tocam `world/`/`net/`), riscos e 6 perguntas ao dono do produto. **W5** (paredes no Mundo) registrado como pendente, depois do M4. Nenhum código alterado.

## Orvalis v0.93.28 — W4: mármore V2/V3 removido (13/11/2026)
- **Decisão (dono do produto):** o Mármore Celestial (82) vira **cubo comum**; paredes novas são só as autotile (ADR 0027).
- **Removido:** par de níveis em um clique, base V3 de duas células (célula norte virtual), ordem de colocação, formas adaptativas e cantos em L do 82, borda ornamental, superfícies V3 e altura visual V3 da câmera (`sanctuaryMarbleAdaptive`, `sanctuaryV3Surfaces`, `World.marbleV3*`/`marblePlacement*`, textura de topo ornamentado). O 82 empilha e quebra um nível por vez e segue o autotile horizontal genérico (`thin`) como os outros celestiais. `SanctuaryBlockShape` agora é só `solid | thin`.
- **Salvamento v15:** v12–v14 migram descartando `marblePlacements`/`marbleV3Bases`; o 82 já colocado continua; a célula norte virtual das bases V3 deixa de existir.
- Testes: 6 arquivos de teste do mármore removidos, teste de migração reescrito (365 passando). Conferido no navegador (fileira, pilar empilhado, sem erros). Sem mudança de protocolo (o servidor só joga o Mundo principal).

## Orvalis v0.93.27 — Paredes e porta de parede alcançáveis no Santuário (13/11/2026)
- **Perfil do Santuário** (`world/profiles.ts`): `blocks` = 18 celestiais + `WALL_BLOCKS` (Tábuas, Pedra) + `WALL_DOOR_BLOCKS`. Aparecem no fim da hotbar (21 itens; ela já rola na horizontal); colocar/quebrar/abrir seguem as regras do `World` (porta só entre duas paredes comuns). A flag de teste `?paredes=autotile` foi removida (`?paredes=teste` continua).
- **Ícones:** continuam o SVG provisório de cor lisa (a porta ganhou o vão); ícones de arte ficam como pendência (precisam sair do atlas sem ler canvas).
- **Servidor:** nada a sincronizar agora — só o Mundo principal joga online (`online` em `main.ts`) e ele não lista paredes. Sincronizar (`build:net` + `sync-net`) quando as paredes forem ao Mundo (W5) ou o Santuário for online.
- Testes: perfil do Santuário × Mundo, colocar parede/porta pelo perfil (403 passando). Invariante do `CLAUDE.md` ("Vários mundos") e DECISIONS/worlds atualizados. Sem mudança de protocolo ou save.

## Orvalis v0.93.26 — Arte final de Tábuas (nova versão) com a porta (13/11/2026)
- **Recebidas e conferidas as 23 peças de Tábuas** (16 tampas, 4 frentes, `door_closed/half/open`): tamanhos e faixas de y corretos, **nenhum alfa parcial**, frentes 100% opacas, vãos de 32 e 64 px centralizados a partir de y = 16, bordas da porta idênticas às de `front_mid`, **emendas exatas** (0) entre frentes, tampas e coluna × fileira.
- Arquivadas em `assets-src/paredes/tabuas/` (a versão anterior de 16 px vai para `versao-anterior-16px/`); atlas regerado (`walls-tabuas.webp`, 512 × 820, ~44 kB). Os quadros provisórios da porta deixam de ser usados para Tábuas.
- Verificado no navegador: porta fechada, intermediária, aberta e com a Deusa atravessando. Sem mudança de código, protocolo ou save.

## Orvalis v0.93.25 — Porta de parede com 3 quadros (13/11/2026)
- **Domínio:** `Block.WALL_DOOR_PLANKS` (242) / `_OPEN` (243), `shape: 'wall-door'`, par em `TOGGLES` (estado no id, ação de rede `kind:'door'`, salvamento sem mudança de formato). Fechada é sólida; aberta passável. **Colocação** (`World.canPlaceWallDoor`): só em fileira leste–oeste, com **parede comum** (não porta) dos dois lados e nada ao norte/sul. Conta como parede para o autotile (`isWallLike`): tampa `cap_10`, frente = quadro da porta. Quebrar devolve a fechada. `wallDoor.test.ts` (7 testes).
- **Render:** atlas 512 × 820 com 3 quadros extras (`door_closed`, `door_half`, `door_open`, 128 × 154) em `wallAtlas.ts`; ao abrir/fechar, o quadro intermediário aparece por 140 ms (`DOOR_HALF_MS`). Cubo preto corrigido (`sanctuaryThreeLayout` exclui `wall-door`). `?paredes=autotile` libera a porta na hotbar (teste).
- **Arte:** contrato (seção 3b) e `gabarito-porta.png` (vão 0/32/64 px, batente e verga de 16 px, folhas encostadas nos lados quando aberta, como no Core Keeper). Enquanto a arte não chega, `build-wall-atlas.py` gera quadros **provisórios** a partir de `front_mid`; a Pedra fica sem porta.
- Sem mudança de protocolo ou save. Servidor ainda precisa sincronizar (`build:net` + `sync-net`) quando paredes/porta forem alcançáveis.

## Orvalis v0.93.24 — Vertical no celular e no tablet, como opção (13/11/2026)
- **Fase 1 (desbloqueio):** o `ScreenMode` não trava mais a orientação em paisagem e some a camada "Gire o aparelho" (`blocked` removido; `Game` não pausa em retrato). Expõe `isPortrait` e `data-orientation`/`data-device` em `<html>`. A câmera, em pé, usa largura mínima de 8 células (`PORTRAIT_MIN_CELLS_WIDE`): célula ~48 px no celular em pé contra ~28 px deitado.
- **Fase 2 (layout vertical):** a hotbar quebra em linhas e cabe tudo sem rolar (`width: max-content` + `flex-wrap`); `hud.ts` publica `--hotbar-h` (`ResizeObserver`) e o CSS posiciona joystick, botão de ação e caixa de conversa acima dela; minimapa menor; tablet em pé com espaços e controles maiores. A horizontal não muda.
- **ADR 0030** substitui a regra "jogo horizontal" (CONVENTIONS atualizado). Testes de câmera em pé (5, total 393). Conferido no navegador em celular em pé (390 × 844), celular deitado, tablet em pé (820 × 1180) e Mundo em pé.
- **Pendente:** versões em coluna dos painéis largos (bolsa, baú, receitas, profissões) e teste em aparelho real. Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.23 — Parede de Pedra com arte no Santuário (13/11/2026)
- **Arte recebida e conferida** (16 tampas + 4 frentes, `assets-src/paredes/pedra/`): tamanhos e faixa de y de cada forma corretos, nenhum alfa parcial, **emendas exatas** (0 de 128), franja de 16 px e junções resolvidas, igual a Tábuas.
- **Pipeline:** `build-wall-atlas.py pedra` → `src/assets/walls-pedra.webp` (8 kB); `WALL_ART_MATERIALS` e `ArtPack.wallAtlases` ganham `WALL_STONE`. A Pedra deixa de usar cor lisa (o protótipo só resta para materiais futuros sem arte). Teste do registro atualizado (388).
- Verificado no navegador: sala de pedra com porta, T e poste, ao lado de uma coluna de tábuas. Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.22 — W3: paredes de Tábuas com a arte real no Santuário (13/11/2026)
- **Pipeline de arte:** `scripts/build-wall-atlas.py <material>` monta o atlas (16 tampas 4 × 4 + 4 frentes; 512 × 666, WebP sem perdas, ~9 kB) em `src/assets/walls-<material>.webp`; registrado no pacote de arte do Santuário (`ArtPack.wallAtlases`, `art/santuario.ts`) — ADR 0010.
- **Regras puras testadas** (`render/wallAtlas.ts`, 6 testes): layout do atlas, máscara da tampa e escolha da frente (`wallArtPiece`: frente só onde não há parede ao sul; poste isolado/fim de coluna = `front_post`).
- **Render** (`render/sanctuaryWallArt.ts`): por parede, um plano horizontal (tampa) à altura `WORLD_SCALE.wall` e, quando há frente, um plano vertical com a base na face sul da laje; instanciado por peça (20 malhas por material), `alphaTest` na transparência. Tampa e frente se encontram na tela como no gabarito. O `pick` acerta frente, tampa e vão.
- **Materiais sem arte** (Pedra) continuam em cor lisa (`sanctuaryWallPrototype.ts`, que passa a pular os materiais com atlas). `?paredes=autotile` segue liberando as paredes na hotbar (teste). Sem mudança de protocolo, save ou servidor.
- **Verificado no navegador:** sala com porta, coluna solta, bloco isolado e T; a Deusa atrás da parede (só a cabeça por cima), na frente (cobre a frente) e ao lado.

## Documentação — arte final de Tábuas com franja única de 16 px (13/11/2026, sem versão)
- **Entrega do dono do produto no contrato novo:** 16 tampas (128 × 128) + 4 frentes (128 × 154, com pregos nos cantos e moldura de 16 px). Conferência: tamanho e faixa de y de cada forma corretos; **nenhum alfa parcial**; **emendas exatas** (0 de 128); franja de 16 px uniforme (tampas e molduras); a franja da coluna faz a curva e segue como franja da fileira nas junções (`cap_03`, `07`, `09`, `15`…), sem linha cruzando o miolo. Sala montada (cantos, coluna solta, T e cruz de teste): coerente.
- Arquivada em `assets-src/paredes/tabuas/`; a versão anterior vai para `versao-franja-variada/` (histórico). `scripts/fix-wall-cap-junctions.py` fica só para a versão antiga (a arte nova já traz a junção resolvida).
- **Tábuas completa, exceto a porta.** Nenhum código de jogo alterado.

## Documentação — franja única de 16 px no contrato de arte das paredes (13/11/2026, sem versão)
- **Decisão do dono do produto:** todas as franjas da composição com a **mesma espessura, 16 px (0,125 célula)**, para dar continuidade. Medido na arte atual de Tábuas: ~25 px nas colunas, ~5 px na fileira, ~6–8 px nas molduras das frentes (não coincidiam).
- **Contrato e gabarito regerados** (`make-wall-guide.py --franja 16`): coluna = franja 16 | miolo 96 | franja 16; fileira = franja 16 na borda norte + miolo de 28; moldura da frente de 16 px; **na junção coluna × fileira a franja faz a curva** e segue como franja da fileira (sem linha cruzando o miolo). O gabarito passa a desenhar as franjas em cada uma das 16 tampas.
- **As 20 peças de cada material precisam ser refeitas** (Tábuas e Pedra); a arte atual de Tábuas vira referência de estilo. Nenhum código de jogo alterado.

## Documentação — junções coluna × fileira da Parede de Tábuas corrigidas (13/11/2026, sem versão)
- **Defeito apontado pelo dono do produto:** onde uma coluna chega a uma fileira, a linha clara do topo da fileira (e as marcas escuras da faixa) atravessava o miolo da coluna em vez de sumir.
- **Correção** (`scripts/fix-wall-cap-junctions.py`): nas tampas com coluna tocando fileira (`cap_03`, `06`, `07`, `09`, `11`, `12`, `13`, `14`, `15`) o miolo da coluna é copiado de `cap_05` nas linhas da faixa da fileira (com vizinho norte) ou só na aresta inferior que cruzava o miolo (canto de cima, que mantém o fechamento do topo). Originais em `assets-src/paredes/tabuas/antes-juncoes/`. Emendas L/O e N/S seguem exatas (0 de 128). Pedir à arte, nas próximas peças (Pedra), a junção já resolvida: o miolo da coluna não é cortado pela linha da fileira.
- Nenhum código de jogo alterado.

## Documentação — arte final da Parede de Tábuas recebida (13/11/2026, sem versão)
- **Entrega do dono do produto no contrato da laje:** 16 tampas (128 × 128) + 4 frentes (128 × 154). Conferência: tamanho e modo corretos; cada tampa cobre exatamente a faixa de y da sua forma (4 formas); **nenhum alfa parcial** (frentes opacas); **emendas exatas** (0 diferenças nas 64 + 64 combinações L/O e N/S; `cap_10` e `cap_05` repetidos sem costura). Sala montada com a arte (cantos, coluna solta, bloco isolado): coerente.
- Arquivada em `assets-src/paredes/tabuas/`; a primeira entrega fica em `entregue-03/` (referência) e a adaptação provisória em `adaptada-032x044/` (aposentada).
- **Tábuas completa, exceto a porta.** Nenhum código de jogo alterado.

## Orvalis v0.93.21 — Decisão final: coluna da largura da célula (x = 1,0 · z = 0,35) (13/11/2026)
- **Decisão do dono do produto:** `DEFAULT_WALL_THICKNESS` = `{ x: 1, z: 0.35 }`. Com `x = 1` só os vizinhos norte/sul mudam a forma da tampa (**4 formas** para as 16 máscaras); leste/oeste só mudam o acabamento das bordas. Testes novos (padrão, 4 formas, coluna contínua, frentes).
- **Contrato e gabarito regerados** (`CONTRATO.tpl.md` reescrito): laje 128 × 44 px, braços N/S 42, frente 128 × 154 (4 peças opacas), 16 tampas 128 × 128 sobre 4 formas, franja da coluna 27 | miolo 74 | 27, franja da fileira 9 px ao norte. Das peças de Tábuas valem `front_mid` e `cap_10`; as outras 18 serão refeitas (as antigas ficam como referência de estilo).
- Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.20 — Colunas largas com franjas (`espessura` até 1,0) e correção da leitura do Core Keeper (13/11/2026)
- **Correção:** a medida da coluna estava errada. Com a escala certa da cena (tile ≈ 90 px), a coluna do Core Keeper tem **≈ 0,9–1,0 tile** de largura: `franja clara (~0,21) | miolo escuro (~0,5) | franja clara (~0,21)`, com juntas a cada tile e, no fim ao sul, uma frente iluminada com a largura da coluna. A "faixa fina de 0,2" que eu medi era só uma das franjas. A tampa leste–oeste continua ≈ 0,3 de profundidade, com uma franja clara na borda norte.
- **`world/walls.ts`:** `clampWallThickness` aceita até **1,0** (coluna = célula inteira); `wallFootprintParts` devolve cada parte com o tipo (`post`/`n`/`s`/`w`/`e`) e omite os braços leste/oeste de comprimento zero; `wallFrontRanges` não gera faixas de comprimento zero. O padrão **não mudou** (0,25 / 0,35) até a decisão. 24 testes de paredes.
- **Protótipo:** a tampa agora tem franjas (coluna: franja | miolo | franja com junta; fileira: franja na borda norte). `?mundo=santuario&paredes=autotile&espessura=0.9,0.35` ou `=1,0.35` para comparar.
- Sem mudança de jogo, protocolo ou save.

## Documentação — frentes da Parede de Tábuas recebidas (13/11/2026, sem versão)
- **Entrega do dono do produto:** `front_mid` (128 × 154), `front_end_left`/`front_end_right` (83 × 154) e `front_post` (38 × 154): painéis de tábuas com moldura e montantes.
- **Conferência:** alturas iguais e arte consistente, mas (1) as medidas são as do contrato antigo (pontas 83 e poste 38; final 80 e 32); (2) a última coluna e a última linha de cada peça e as juntas entre tábuas estão **semitransparentes** (alfa ~27–30%), o que deixa o chão aparecer pela parede e desenha linhas claras nas emendas.
- **Ajuste:** `scripts/retarget-wall-fronts.py` compõe o alfa parcial sobre uma cor de junta (opaco) e reprojeta as larguras para a medida final. Original em `assets-src/paredes/tabuas/entregue-03/`, ajustadas em `assets-src/paredes/tabuas/` (provisórias). Com as 16 tampas, **a parede de Tábuas está completa, exceto a porta**; montada em sala de teste, as emendas ficam contínuas.
- Nenhum código de jogo alterado.

## Documentação — tampas da Parede de Tábuas recebidas (13/11/2026, sem versão)
- **Entrega do dono do produto:** as 16 tampas (`cap_00`…`cap_15`) de Tábuas, 128 × 128 RGBA. Conferidas: formas e índices corretos, alfa binário, braços **idênticos** entre as peças que os têm e emendas exatas (diferença 0). Vieram com a espessura do contrato antigo (poste 38 × 38).
- **Adaptação:** `scripts/retarget-wall-caps.py` reprojeta as 16 peças para a medida final (poste 32 × 44, braços 48 e 42) esticando cada faixa por partes; topologia e emendas preservadas (checadas). Original em `assets-src/paredes/tabuas/entregue-03/`, adaptadas em `assets-src/paredes/tabuas/` (provisórias; `LEIA-ME.md`).
- Faltam as 4 frentes e a porta. Nenhum código de jogo alterado.

## Orvalis v0.93.19 — Iluminação dinâmica e neblina escura (`?luz=`) (13/11/2026)
- **ADR 0029:** camada de iluminação 2.5D como a da referência do Core Keeper: escuridão ambiente com poças de luz (Deusa + blocos que brilham: Musgo Luminoso, Cristal da Vida, Bloco de Luz; no Mundo: fogueira, caldeirão, forno), decaimento suave, tinta quente e oscilação do fogo.
- **Regras puras** em `render/lighting.ts` (+ 6 testes): `parseAmbient`, `lightFalloff`, `glowLightFor`, `pickLights` (teto `MAX_LIGHTS` = 12), `flickerFactor` determinístico. **Shader** em `render/sanctuaryLighting.ts` (sobreposição de tela cheia, sem tocar nas malhas).
- **Liga por `?mundo=santuario&luz=noite|penumbra|0..1`** (só vista oblíqua); sem o parâmetro nada muda. HUD sem escurecer. Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.18 — Espessura das paredes fechada em 0,25 / 0,35; contrato gerado (13/11/2026)
- **Decisão do dono do produto:** `DEFAULT_WALL_THICKNESS` = `{ x: 0.25, z: 0.35 }` (faixas e poste de 0,25; tampa de 0,35). A foto do protótipo no iPad confirmou a leitura.
- **Gabarito e contrato regerados** com a medida: poste 32 × 44 px, braços 48 (L/O) e 42 (N/S), frentes 128/80/80/32 × 154, face sul a 42 px da borda da célula. O `CONTRATO.md` agora é **gerado** por `scripts/make-wall-guide.py` a partir de `CONTRATO.tpl.md` (números sempre iguais aos do gabarito e do código); `--tx/--tz` mudam a espessura.
- Testes ajustados ao novo padrão (27 de paredes). Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.17 — Espessura das paredes ajustável por eixo (`?espessura=x,z`) (13/11/2026)
- **`WallThickness { x, z }`** em `world/walls.ts`: `x` = largura das faixas norte–sul e do poste; `z` = profundidade da tampa das fileiras leste–oeste (e a posição da face sul na célula). `wallFootprint` e `wallFrontRanges` recebem a espessura (padrão `DEFAULT_WALL_THICKNESS` = 0,3 / 0,3, o valor aprovado). `parseWallThickness` lê `0.25,0.35` (ou só `0.3`) e limita a 0,1–0,9. Testes novos (27 de paredes).
- **Protótipo:** `?mundo=santuario&paredes=autotile&espessura=0.25,0.35` aplica a espessura nas paredes de cor lisa. Só teste; sem mudança de jogo, protocolo ou save.
- **`scripts/make-wall-guide.py --tx --tz`** regera o gabarito com a espessura escolhida (padrão 0,3 / 0,3).

## Documentação — especificação da arte das paredes (12/11/2026, sem versão)
- **`assets-src/paredes/CONTRATO.md`** e **`gabarito.png`** (gerado por `scripts/make-wall-guide.py` a partir das medidas do código): 1 célula = 128 px, placa de 38 px, braço de 45 px, frente de 154 px (1,2 célula); 4 frentes (`front_mid` 128, `front_end_left`/`right` 83, `front_post` 38 × 154) e 16 tampas (128 × 128, índice N·1 + L·2 + S·4 + O·8) por material; regras de emenda, luz, posição de montagem, conferência e brief curto. Materiais: tábuas e pedra primeiro. Nenhum código de jogo alterado.

## Orvalis v0.93.16 — Paredes: placa fina e protótipo de autotile (`?paredes=autotile`) (12/11/2026)
- **Observação do dono do produto confirmada nas medidas do Core Keeper:** fileiras norte–sul são faixas finas (~0,2–0,3 célula) e só o último bloco ao sul mostra a frente; fileiras leste–oeste têm frente de célula inteira. Modelo: **placa fina** de `WALL_THICKNESS` = 0,3 (poste central + braços até a borda), com a colisão ainda na célula inteira.
- **`world/walls.ts`:** `wallFootprint` (pegada), `wallFrontRanges` (faixas de frente expostas), `wallThin`; `wallFront` ganha `end` e passa a devolver `null` só nas continuações de fileira norte–sul. Atualiza os testes (21 de paredes).
- **Protótipo de render com cores lisas** (`render/sanctuaryWallPrototype.ts`): cada parede vira poste + braços de altura `WORLD_SCALE.wall`; o autotile aparece sozinho (frente só no primeiro bloco, faixas finas, porta como vão). `pick` acerta a frente, a tampa e o vão da célula. Ligado por `?mundo=santuario&paredes=autotile`, que libera as paredes de tábuas e de pedra na hotbar do Santuário (só teste, só no render 3D; o `?render=2d` não desenha paredes).
- Sem mudança de protocolo, save ou servidor.

## Orvalis v0.93.15 — Paredes W2: bloco `wall` no domínio e autotile testado (12/11/2026)
- **Blocos novos** (`Block.WALL_PLANKS` 240, `Block.WALL_STONE` 241; forma `wall`): sólidos, de **nível único**, quebráveis (machado na madeira, picareta na pedra). `isWall`, `WALL_BLOCKS`. Sem receita, sem perfil e sem arte ainda: **inalcançáveis pelo jogador** até a W1 (arte) e a W3 (render).
- **Regras no `World`** (sem código novo de colocação: a regra existente já serve): coloca no nível 0, bloqueia a passagem (`standHeight` nulo, nunca degrau), não empilha nem vai sobre cubo. `World.isWallAt` e `World.wallPieceAt(x, y)`.
- **Autotile puro** em `world/walls.ts`: frente (`single`/`left`/`mid`/`right`, escondida com parede ao sul), tampa de 16 peças (máscara N/E/S/W) e cantos internos (NE/SE/SW/NW). Qualquer material conecta com qualquer outro.
- Testes: `walls.test.ts` (autotile) e `wallBlock.test.ts` (regras, quebra, recálculo da vizinha, salvar/restaurar). Sem mudança de protocolo ou save (ids novos, formato igual); o pacote do servidor só precisa sincronizar quando as paredes ficarem alcançáveis (W3).

## Orvalis v0.93.14 — Escala do Core Keeper na vista do Santuário (12/11/2026)
- **ADR 0028 aceita (reescrita):** vale a relação medida no Core Keeper, não "1 m": cubo de frente 1,0 (K = 1), parede ≈ 1,2, personagem ≈ 1,2. `render/worldScale.ts` guarda as constantes.
- **Vista real do Santuário:** `OBLIQUE_K` passa de 18/32 para **1** (frente do cubo quadrada, que usa a imagem quadrada do topo escurecida); a Deusa usa 1,2 (fator `CHARACTER_SCALE_FACTOR` sobre a escala antiga); a face do mármore V3 vira 2 níveis. A câmera ganha `setCellsTall` e o renderer pede **14 células na vertical** (`GameRenderer.preferredCellsTall`; piso de zoom desce a 0,5 nesse caso); o Mundo 2D continua com 10.
- **ADR 0027 ajustada:** parede ≈ 1,2 célula (não "2 cubos"); paredes do sul/laterais finas a validar. Os 2 níveis de cubo ficam por ora.
- O teste `?paredes=teste` continua; o grupo ATUAL usa o K antigo para comparar. `?vista=inclinada` (reserva) não muda. Sem mudança de protocolo ou save.

## Orvalis v0.93.13 — Teste da escala: comparativo com a medida do Core Keeper (12/11/2026)
- **Medida de uma cena do Core Keeper** (captura enviada pelo dono do produto): personagem ≈ 1,2 tile, frente da parede ≈ 1,2 (≈ a altura do personagem), vaca ≈ 1,2, cerca ≈ 0,65, árvore 3,5–4; paredes do sul e laterais finas; tampa escura; luz dinâmica. Registrada na ADR 0028, agora **em revisão**.
- **Teste de escala com três grupos** (`?mundo=santuario&paredes=teste`): ATUAL, PROPOSTA (1,75 / parede de 2 cubos) e CORE KEEPER (personagem 1,2 / parede 1,2), cada um com cubo, parede, régua vertical e personagem de referência. A Deusa usa a escala de `?escala=atual|proposta|core` (padrão `core`).
- Só visual e descartável; sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.12 — Teste da escala do mundo: 1 célula = 1 m (12/11/2026)
- **ADR 0028 (direção aprovada):** 1 célula = 1 m; vista oblíqua com K = 1,0 (cubo de frente quadrada); parede = 2 cubos = 2 m; personagem ≈ 1,75 m (≈ 0,8 × a escala antiga). A ADR 0027 passa a usar a altura de 2 cubos.
- **Teste reformulado** (`?mundo=santuario&paredes=teste`): escala ATUAL e NOVA lado a lado (cubo, parede de 2 cubos, régua vertical de 1 m por segmento, régua de 1 m no chão e personagem de referência parada); a Deusa que se mexe usa a escala nova. Substitui o teste de três alturas da v0.93.11. Só visual, descartável; o jogo e o `OBLIQUE_K` da vista continuam como estavam.
- Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.11 — Paredes: ADR 0027 e teste de proporção (12/11/2026)
- **ADR 0027 (aprovada):** parede = bloco de nível único, sólido, altura visual fixa, com autotile (frente solta/ponta/meio/ponta + tampa de 16 peças) e porta; vale para Santuário e Mundo; o mármore V2/V3 será aposentado.
- **Teste de proporção:** `?mundo=santuario&paredes=teste` mostra três paredes lisas com a frente de 0,75, 1,0 e 1,25 célula (régua de 1 célula no chão e a altura escrita) para escolher a altura olhando. `render/sanctuaryWallProportionTest.ts`; sem lógica de jogo e descartável.
- Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.10 — Vista oblíqua é o padrão do Santuário (12/11/2026)
- **Decisão do dono do produto:** aprovada a vista oblíqua (v0.93.9). `main.ts` passa a usá-la por padrão; `?vista=inclinada` volta à câmera inclinada a 67° (reserva, sem as correções de cor e de personagem).
- **Mármore (V2/V3)** segue como teste provisório: legível na oblíqua, mas não será refinado; as paredes serão redesenhadas (próxima etapa, ver NEXT_STEPS).
- Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.9 — Experimento: vista oblíqua do Santuário (`?vista=obliqua`) (12/11/2026)
- **Teste da recomendação da ADR 0026:** `SanctuaryThreeRenderer` ganha a vista `oblique` (opção do construtor; `main.ts` lê `?vista=obliqua`). A câmera olha reto para baixo (chão em quadrados perfeitos) e a altura vira deslocamento fixo na tela de `OBLIQUE_K = CUBE_FRONT / TILE` (18/32) por nível, a proporção da arte 3/4. O padrão continua a câmera inclinada a 67°.
- **Matemática pura e testada** em `render/sanctuaryObliqueView.ts` (+ testes): matriz de projeção montada à mão (x, y com cisalhamento, profundidade que põe o sul e o alto na frente), raio do cursor para a seleção (sobe 1 de altura a cada K de célula para o sul).
- **Efeitos na vista oblíqua:** a Deusa deixa de ser achatada (plano com altura 3,0/K, ocupa 3,0 células em tela como no 2D); cores fiéis à arte (material sem luz; a frente do bloco recebe um escurecimento frio fixo); o `pick` usa o raio oblíquo (topo, frente e chão conferidos).
- **Fora do experimento:** compensações do mármore V3 (calibradas para 67°) não se aplicam; sem contorno nos blocos nem partículas ainda. Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.8 — Goblins: folha de ataque nova (12/11/2026)
- **Folha de ataque refeita** a partir da imagem enviada (`assets-src/goblin/attack.png`; `process-sprite.py --alpha --largest --frame-h 160` → `optimize-assets.py`, WebP). Agora as sete folhas do goblin seguem o mesmo padrão e todas usam `GOBLIN_H` (acaba o "pulo" de ~4 px ao atacar).
- Só a ponta do cajado em um quadro (esquerda, 3º) encosta na borda do quadro (7 px de altura na folha de 160): invisível em jogo.
- Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.7 — Goblins soltam 2 moedas de cobre (12/11/2026)
- **Item novo:** Moeda de Cobre (`Item.COPPER_COIN`, `loot: true`, ícone `icon-copper-coin.webp` a partir da arte enviada pelo dono do produto, `assets-src/moeda-cobre.png`). Sem uso ainda (futuras lojas e trocas).
- **Espólio do goblin:** `monsterDrops('goblin')` devolve sempre 2 moedas (`GOBLIN_COIN_DROP`, fixo, sem sorteio), no jogo e na sala (os dois usam `monsterDrops`). Substitui o `[]` provisório.
- **Ferramenta:** `scripts/make-item-icon.py` (recorta pela borda do desenho, quadrado transparente, 64 px, WebP sem perdas).
- **Servidor:** a sala precisa do pacote novo para soltar as moedas (item novo; protocolo continua 20 e save 14).
- Testes: `goblinLoot.test.ts`.

## Orvalis v0.93.6 — Goblins: folhas novas em alta resolução e em WebP (12/11/2026)
- **Arte refeita** a partir das seis folhas enviadas pelo dono do produto (`assets-src/goblin/{idle,walk,run,alert,hurt,death}.png`, 4×4 transparente, ordem frente/esquerda/direita/costas): `process-sprite.py --alpha --frame-h 160` (`--largest` em tudo menos no alerta, para manter os "!") → `optimize-assets.py`.
- **WebP:** as 7 folhas (as seis novas + a de ataque, ainda a antiga) saíram de ~5,4 MB em PNG para ~0,83 MB; imports em `render/art/principal.ts` agora `.webp`.
- **Tamanho em tela preservado:** o desenho novo ocupa ~95% do quadro (o antigo ~89%, com pés acima da base); as folhas novas usam `GOBLIN_H = TILE * 1.6` (0,94 × 1,7) e os pés na base do quadro. A folha de ataque continua em `TILE * 1.7` até ser refeita.
- **Orçamento:** `build-artifact.mjs` passa a contar `goblin-*` como "depois do início" (carregam sob demanda, como lobos e NPCs): início do Mundo ≈ 2,9 MB (era 8,2 MB com os PNGs).
- Sem mudança de jogo, protocolo ou save.

## Orvalis v0.93.5 — Fase 1 do render WebGL: perda de contexto, tipagem e linha de base (12/11/2026)
- **Perda de contexto WebGL:** o `SanctuaryThreeRenderer` trata `webglcontextlost` (com `preventDefault`) e `webglcontextrestored` (refaz malhas e texturas de canvas); testado no navegador com `WEBGL_lose_context`. Listeners removidos no `dispose`.
- **Tipagem:** `@types/three@0.187.0` (dev) no lugar da declaração de protótipo `src/three/three.d.ts`; o renderer deixa de usar `any`.
- **Contrato:** `GameRenderer.stats?()` (chamadas, triângulos, geometrias, texturas, contexto perdido) e `SANCTUARY_THREE_OPTIONS`, mapa de paridade que obriga classificar todo campo novo de `RenderOptions`.
- **Linha de base (Playwright, GL por software, só relativa):** Santuário 3D = 14 chamadas, ~30,8 mil triângulos, 4 geometrias, 3 texturas, `draw()` ≈ 1 ms de JS, heap ≈ 13 MB; o baixo FPS do headless vem do GL por software, não do JS. FPS real exige aparelho. Artefato do Santuário: HTML 0,8 MB, início ≈ 2,3 MB.
- Sem mudança de jogo, protocolo ou save.

## Documentação — ADR 0026: render 2.5D em WebGL (12/11/2026, sem versão)
- Decisão do dono do produto: referência Core Keeper; arte 2D como fonte, geometria só nas paredes, atores em billboards, física sólida, iluminação primeiro, chão por chunk, Canvas 2D como reserva até a paridade. Plano em 6 fases em `NEXT_STEPS.md`. Nenhum código alterado.

## Orvalis v0.93.4 — Aviso do 3º nível descartado e pacote de rede sincronizado (12/11/2026)
- **Descarte deixa de ser silencioso:** `World.restoreChunk` passa a devolver quantos blocos do 3º nível (aposentado com `MAX_STACK = 2`) foram descartados. `applySave` repassa o total (`droppedBlocks`) e o `Game` mostra um aviso ao abrir um mundo salvo antigo. Salvamento e regras de nível não mudam (`SAVE_VERSION` 14).
- **Sala do servidor:** `Room.restore` guarda o total em `droppedOnRestore` e marca a sala como suja quando algo foi descartado, para a próxima gravação já gravar a sala limpa; o servidor registra o número no log.
- **Servidor:** pacote de rede regenerado (`build:net` + `sync-net`) com goblins (PR #96), `MobState.v` e o limite de 2 níveis. `PROTOCOL_VERSION` continua 20 (campo novo opcional, compatível).
- Testes: `restoreDropped.test.ts` (conta/descarta o 3º nível; save sem 3º nível não descarta).

## Orvalis v0.93.3 — Santuário: face ancorada pela base inferior (12/11/2026)
- **Bug visual reportado por foto e vídeo:** a v0.93.2 alinhava a borda superior das paredes ao topo lógico, mas a face tinha apenas ~85% da altura projetada de uma célula. A parte inferior terminava antes da borda inferior da célula clicada e paredes adjacentes pareciam desencontradas.
- **Correção do desenho, sem mexer na física:** com câmera ortográfica a 67°, a altura *visual* do plano frontal passa a ser `tan(67°)` (aproximadamente 2,356 unidades Three.js) para preencher exatamente uma linha de 32×32 em projeção. Topos e meio-topos usam a mesma altura visual, e o deslocamento de profundidade passa a ser `alturaVisual/tan(67°) = 1 célula`. A base inferior coincide com a borda sul da célula clicada; a face termina em sua borda norte, encostando no meio-topo adjacente.
- **Seleção e salvamento preservados:** realces seguem a altura visual, mas as duas células de ocupação, a colisão de dois níveis, o save v14, os outros materiais e o Mundo principal permanecem como antes. Testes conferem limites projetados da face e encaixe no meio-topo, além dos cenários existentes de colunas/horizontais/casa. Verificação visual no navegador ainda necessária.


## Orvalis v0.93.2 — Santuário: ancoragem visual na célula clicada (12/11/2026)
- **Face e topo na posição correta:** a câmera a 67° projetava a face vertical de dois níveis e o meio-topo sobre células superiores às de construção, embora a ocupação lógica estivesse correta. O render Three.js agora compensa a elevação da superfície em Z: deslocamento visual = altura máxima (2) / tan(67°). A face aparece na célula-base e o meio-topo na célula imediatamente ao norte, sem alterar o World, os blocos persistidos nem a câmera.
- **Seleção e demolição:** os realces de hover e quebra usam a mesma transformação para permanecer sobre a geometria visível; colunas, paredes horizontais, cantos e construções salvas continuam com a classificação V3 existente. Testes de projeção certificam que face e meio-topo não migram mais uma célula para cima. Necessária inspeção final no navegador real.


## Orvalis v0.93.1 — Santuário: corrigir topo duplicado na V3 (12/11/2026)
- **Superfícies em vez de cubos redundantes:** a malha V3 diferencia `v3_face`, `v3_top` e `v3_top_half`. Uma única face de altura física 2 é desenhada na borda sul da sequência, os topos completos aparecem só nas células intermediárias e um meio-topo fecha a extremidade norte; a segunda camada não repete a malha. Horizontal simples apresenta apenas face e meio-topo, sem topo completo indevido.
- **Material e câmera:** os planos reutilizam o material já aprovado (frente +Z, cobertura +Y) e as máscaras de ornamentação ocultam emendas de topos adjacentes. Nenhuma alteração na ocupação física/lógica, colisão, construção, demolição, salvamento v14 ou Mundo principal. Malhas e regras cobertas por novos testes; conferência visual no jogo permanece recomendada.


## Orvalis v0.93.0 — Santuário: construção de paredes V3 (12/11/2026)
- **Ocupação:** novas bases de Mármore Celestial 82 ocupam duas células em planta (a escolhida e a imediatamente ao norte) e os dois níveis de altura por célula. Bases verticais separadas por duas linhas criam face inferior, topo inteiro interno e meio-topo terminal; paredes horizontais e quadrados ficam conectados.
- **Regras:** a segunda célula é derivada da base única no World; a colisão, a colocação, a seleção de blocos e a quebra respeitam a ocupação compartilhada. O renderizador Three.js usa as geometrias existentes, incluindo as bordas ornamentadas recalculadas.
- **Save v14:** persistência das âncoras V3; saves v13 e anteriores conservam painéis V2 sem conversão geométrica. Outros materiais e Mundo principal não são alterados intencionalmente. Encontros L/T e linhas opostas ainda exigem conferência visual.

## Orvalis v0.92.1 — Santuário: paredes adaptativas V2 (12/11/2026)
- **Construção vertical do Mármore Celestial 82:** ao acrescentar uma parede ao NORTE (acima na tela), a parede antiga completa sua profundidade e a nova nasce como pilar inteiro. Ao acrescentar uma parede ao SUL (abaixo), somente a nova vira pilar e a parede original mantém a metade frontal. A extensão descendo preserva o início de linhas horizontais, inclusive entre colunas opostas, sem preencher um bloco pré-existente indevidamente.
- **Persistência:** o Santuário grava a ordem de colocação de cada painel no salvamento v13; migração dos saves antigos v12 preserva as estruturas anteriores com a regra legada (ordem 0). Remover uma parede limpa seu histórico. A altura continua em dois níveis e a geometria superior herda a base; demais materiais e o Mundo principal não mudam.
- **Validação:** testes de construção nas duas direções, fileiras opostas, sequência descendente, remoção e ida-e-volta do salvamento; revisão visual em navegador/Safari ainda recomendada antes de considerar a solução definitiva.

## Orvalis — Goblins em acampamentos de sete (PR #96)
- **Mundo principal:** quatro acampamentos determinísticos por seed, cada um com sete goblins circulando uma fogueira real `Block.CAMPFIRE`. Localização fora de cidade/dungeon/caverna e solo seguro; vegetação dos sete pontos é limpa pelo mesmo gerador procedural de terreno. A fogueira pode ser quebrada e restaurações reconciliam acampamentos removidos.
- **Combate:** Goblin comum com 60 pontos de vida, ataque-base 15, aggro apenas a até três células como os lobos; defesa 2, perseguição territorial, dano, recuo e respawn no motor existente. Dano nominal usa fórmula de combate e não é um valor líquido invariável. Sem itens de saque inventados (drop vazio por enquanto).
- **Arte:** sete pranchas fornecidas (caminhada, idle, ataque, dano, morte, alerta e corrida), convertidas em folhas 4×4 com transparência e registradas só no pacote do Mundo principal. Frames por direção e estado sincronizados no multiplayer; testes para geração, combate, animações e salvamento. Santuário intocado.


## Santuário — linha horizontal contínua com canto em L (PR #95)
- Corrigida a situação em que uma coluna norte–sul sobe em uma extremidade de uma linha horizontal e outra desce na extremidade oposta. O autotile do Mármore Celestial 82 mantém a faixa superior de toda a parede alinhada na metade de trás (`wall_back`) e substitui a ponta que liga à coluna de baixo por um **canto em L** fino, à esquerda ou direita, de acordo com o arranjo. A língua de conexão tem 25% da largura do tile e ocupa a metade dianteira; não cria pilar cheio nem desnível na borda superior.
- A geometria do canto é real em Three.js (UVs do topo contínuos ao longo das duas partes); o topo ornamental é recortado nas bordas expostas. Só se aplica ao caso de **duas extremidades opostas**, sem coluna interna, preservando retângulos, paredes comuns, câmera 67°, personagens, física, salvamentos e Mundo principal.


## Mármore Celestial — construção automática 2 níveis e paredes com 3 âncoras (PR #94)
- No Santuário, ID 82 cria/retira os dois blocos da pilha por ação. Bloco isolado começa como parede de meia profundidade na frente da célula; adjacência norte–sul converte os blocos em pilares inteiros. Conexão horizontal com colunas alinha paredes ao fundo, meio ou frente da lateral do pilar, mantendo o mesmo perfil nos dois níveis. Conexões mudam automaticamente com colocação/remoção.
- Moldura de topo ganha máscara de dez segmentos (norte/sul e quatro quartos por lateral), adequada ao encontro de parede central com pilar. Mantidas textura vertical, câmera 67°, colisões, Mundo principal e outros materiais.


## Santuário — ajuste de câmera para 67° (PR #93)
- Câmera superior ortográfica do Santuário Three.js revisada de 80° para 67° acima do chão, sem rotação isométrica, aproximando a visibilidade das faces frontais à referência de Core Keeper. Preservados o mármore celestial com topo e bordas adaptativas, o plano vertical da Deusa, colisões, UI, altura de 2 blocos e todas as mecânicas. Mundo principal Canvas 2D inalterado.


## Santuário — câmera superior 80° e bordas adaptativas do Mármore Celestial (PR #92)
- **Teste isolado ao Santuário Three.js:** câmera ortográfica aproximada de 80° acima do chão, mantendo uma única face frontal (sem yaw isométrico), e Deusa desenhada em plano vertical com sombra no chão. Apenas o Mármore Celestial 82 recebe nova arte de topo com moldura dourada e gemas azuis enviada pelo usuário; todas as faces verticais continuam usando a textura anterior.
- **Topos emendados:** máscaras procedurais de bordas expostas evitam ornamentos duplicados entre cubos, inclusive meia borda de pilar ao lado de parede fina. O contorno determina parede traseira ou frontal em salas ocas; camada superior herda geometria. Outros 17 materiais, Mundo principal, regras físicas, saves e controles inalterados. Testes de classificação, geometria, câmera e composição de textura adicionados.


## Correção de oclusão da Deusa no Santuário Three.js — 11/11/2026 (PR #91)
- O sprite flutuante da Deusa agora usa o rodapé real da textura 256×320 como âncora física; a animação original mantém a elevação dos pés. A sombra deixa o billboard vertical e passa a ser um elemento horizontal independente exatamente no chão/nível de apoio lógico, com os mesmos raios e a mesma leve variação de escala.
- O desenho não avança mais 0,15 célula na direção da câmera. O sprite principal continua respeitando a profundidade real dos blocos (`depthTest=true`); uma silhueta etérea de baixa opacidade dá legibilidade quando uma parede realmente o oculta. Colisões, salvamento e Mundo principal inalterados.


## Correção de colisão Santuário WebGL — 11/11/2026 (PR #90)
- No Santuário oficial Three.js, a Deusa não sobe automaticamente cubos inteiros ao pressionar a direção: blocos de 1 ou 2 níveis, paredes e pilares voltam a barrar sua caixa de colisão, via `player.spec.stepHeight = 0` apenas no perfil WebGL. Era o `STEP_HEIGHT=1` legado da vista 2D que fazia atravessar visualmente a parede ao subir sem comando de salto.
- Mundo principal e `?render=2d` continuam com a física anterior; sem alteração em colisões por subcélula, salvamentos, chunks, câmeras ou renderizadores. Testes de regressão da colisão e do fallback adicionados.


## Santuário Three.js oficial — 2026-11-11 (PR #89)
- **Apenas o Santuário** passa a usar Three.js por padrão: malhas instanciadas 3D dos blocos/chão com texturas oficiais (18 IDs), paredes finas 50% alinhadas pela frente, dois níveis e forma superior herdada da base. Câmera ortográfica superior com profundidade real e seleção por raycast; Deusa continua 2D animada em billboard.
- `Game`, ações, controles, hotbar e salvamentos continuam comuns; nenhum módulo do editor de cinco níveis ou primeira pessoa foi incorporado ao jogo oficial. `?render=2d` conserva o antigo motor visual; falta verificar o resultado visual em desktop e mobile. Mundo principal permanece Canvas 2D e não carrega Three.js.


## Ajuste de autotile vertical — 2026-11-11
- **Consistência de dois níveis:** a geometria da parede/pilar é resolvida uma única vez com os vizinhos do bloco inferior; o segundo nível herda a forma e mantém sua própria textura, sem examinar adjacências superiores. Portas existentes continuam funcionando como pilares; blocos não construtivos não afinam. Nenhuma outra regra de mundo, câmera, colisão ou altura foi modificada.


## Próxima versão (PR #87, ainda não publicada) — 2026-11-11
- **Render top-down oficial:** autotile horizontal de paredes de construção a partir dos blocos atuais. Só blocos intermediários de linhas horizontais isoladas afinam (topo reduzido pela metade para trás); face frontal continua alinhada aos pilares. Massas preenchidas, terrenos e nuvens seguem maciços. Portas existentes contam como pilares sem alterar sua interação.
- **Máximo de construção:** dois níveis no mundo e Santuário, inclusive na restauração de saves antigos (terceiro nível deixa de ser carregado e altura do personagem é limitada a 2).
- **Arte do Santuário 80–85:** seis superfícies aprovadas pelo usuário incorporadas e normalizadas para imagens JPEG 512×512. As faces de cada cubo, o chão e os ícones usam sua textura individual; os outros doze blocos celestiais continuam usando o atlas antigo. Pacote limitado ao Santuário, sem adicionar esses materiais ao mundo principal.
- Fora do escopo: Three.js experimental, novas câmeras, novas portas, mudanças em terreno, inventário e NPCs.


## 0.92.0 — 2026-11-08
- **Caixa de conversa**: quando um NPC fala, aparece a moldura no centro da tela com o **rosto** no círculo, o **nome** na
  plaquinha e o **texto** na caixa; texto que não cabe vira páginas e a setinha ▼ avisa que tem mais (tocar na caixa, no
  botão de ação, Espaço ou Enter avança; na última página, fecha). O NPC fica parado e virado para a personagem.
- **16 NPCs nomeados** no lugar dos moradores antigos: o ferreiro agora se chama **Black** e há 15 novos — **Dante, Silvano,
  Morgan, Aurélio, Rubem, Rosendo, Teodoro, Bento, Solano, Nilo, Marlon, Lavínio, Caio, Noel e Leandro** (nomes escolhidos
  pelo assistente; tabela em `docs/domains/npc.md`, edite em `game/npcs.ts`). Cada um com folha própria, retrato e 2 falas.
- **Saíram**: os 4 moradores comuns antigos, as roupas em camada, as **expressões** e o **chibi modular** (peças, tela de
  montagem, `?personagem=chibi`, exportador e ADR 0017). A tela de entrada escolhe só entre os 5 personagens prontos
  (Heroína, Herói, Hood, Gino, Mila). `?personagem=mila` (ou outro id) segue como atalho.
- ⚠ **Protocolo 20** (sem o campo `look` da aparência) e **salvamento v12** (o campo `look` some; quem tinha o chibi fica com
  o personagem pronto salvo). Servidor precisa do pacote novo.

## 0.91.0 — 2026-11-08
- **Mila**: sexto personagem pronto (tela de entrada, ao lado de Heroína, Herói, Hood e Gino): caminhada, caminhada com as
  5 ferramentas, 5 golpes e sentar. Na sala os outros a veem como Mila (`APPEARANCE_BODIES`; **protocolo 19**).
- **Lobos** (3 cores: marrom, cinza e branco): monstros do mapa aberto, em **bandos de 1 a 3 lobos da mesma cor** que passeiam
  juntos perto da toca, espalhados ao redor da cidade (~26 bandos por mapa; nenhum na cidade, na estrada do portão nem no
  campo do rebanho). **Só atacam a personagem a até 3 células** (em linha reta); mais longe ela é ignorada. São mais lentos
  que ela (3,0 × 4,2), então dá para fugir. Vida, ataque e defesa: marrom 35/11/1, cinza 45/13/2, branco 55/15/3. A
  espada e o machado os acertam como acertam as aranhas; renascem em 2 min. **Espólios**: **Pelagem de Lobo** (55%) e
  **Presa de Lobo** (40%), por sorteios separados — às vezes nada, às vezes um só, às vezes os dois (ícones novos; ainda sem
  uso em receitas).
- Monstros longe de todo jogador (> 48 células) ficam parados (não são simulados); o salvamento só guarda as aranhas do
  covil (os lobos voltam todos, pela seed, ao carregar).

## 0.90.1 — 2026-11-08
- **Porta com qualquer madeira ou pedra** (dono do produto): a regra já valia por `organic: 'wood'` / `stone`, então toras e
  tábuas de carvalho, cerejeira e bétula e todas as pedras servem de batente, em qualquer combinação; agora há teste que
  cobre todos os pares (e confirma que terra, areia, grama, caminho e terra arada não servem). Nenhum comportamento mudou.

## 0.90.0 — 2026-11-08
- **Macieira nova**: 3 formas, com maçãs e **colhida** (florida, sem maçãs) com arte própria, na mesma forma e escala —
  a colhida de cada árvore é a mesma forma da carregada. Troca as antigas (2 formas; a colhida usava a arte da carregada).
- **Florestas misturadas** (dono do produto): o mapa da Cidade 1 deixa de ser "só carvalho nos Campos e só cerejeira no Bosque"
  e mistura carvalho, bétula, cerejeira e macieira nos dois biomas (a principal de cada um domina; as demais ~1/6 cada) e
  nas árvores da cidade (cerejeira, bétula e carvalho; sem macieira, porque a cidade é protegida e não dá para colher).
  ⚠ Muda o mapa de todas as seeds só na **espécie** de algumas árvores (nenhuma muda de lugar); macieira e bétula dos
  Campos continuam onde estavam.

## 0.89.0 — 2026-11-08
- **Bétula**: árvore nova (3 formas), misturada aos carvalhos e às macieiras dos Campos (~1 em 6 árvores; as macieiras
  continuam onde estavam — ⚠ troca alguns carvalhos de lugar por bétulas em toda seed). Derrubada dá 2–3 **Toras de
  Bétula**; 1 tora vira 2 **Tábuas de Bétula** (receita do construtor). Tora com topo (anéis) e frente (casca branca);
  tábuas só com o topo. Colocáveis como os demais materiais de madeira (batente de porta, substituem a água).
- **Tábuas de Cerejeira contínuas**: o topo novo emenda nas quatro bordas (antes marcava ⚠ de costura).
- Baú, porta, cadeira e cerca seguem só de carvalho (decisão do dono do produto; outras madeiras ficam para depois).

## 0.88.0 — 2026-11-08
- **Não se constrói no chunk do muro** (dono do produto): todo chunk que tem um pedaço da muralha da cidade é protegido por
  inteiro (nada quebra, coloca, ara nem planta), mesmo na parte que fica fora dos limites da cidade. O que já estava
  construído ali continua; só não se constrói mais. O ponto "fora do portão" passou a ser o primeiro trecho da estrada fora
  desse chunk.
- **Árvores novas e sem crescimento**: carvalho (3 formas), macieira (2) e cerejeira (3) com a arte nova, sempre adultas; a
  forma de cada árvore é sorteada pela posição. **Saíram** as mudas (itens e plantio) e os estágios jovens: mudas e jovens
  de mundos e salas salvos viram a árvore adulta, e as mudas somem de bolsas, grades e baús. A macieira colhida ainda
  volta a dar maçãs (com a mesma arte, enquanto não vem a "macieira colhida").
- **Madeira de cerejeira**: Tora de Cerejeira (topo e frente) e Tábuas de Cerejeira (só o topo), colocáveis como os
  materiais de carvalho (batente de porta, substituem a água). A Cerejeira derrubada dá 2–3 Toras de Cerejeira; 1 tora vira
  2 tábuas (receita do construtor).
- Novos scripts: `scripts/process-trees.py` (tira de variantes a partir das ilustrações) e
  `scripts/make-material-icons.py` (ícone de bloco a partir de topo e frente).

## 0.87.0 — 2026-11-08
- **Água nova e margens pintadas**: o topo da água do V2 (`agua`) é o ladrilho do mar e dos rios, e as margens ganham a
  transição da pintura de cada par: Água sobre Areia, Terra, Caminho e Grama, com espuma e água rasa. A barranca e o fio
  de espuma antigos saem onde a margem nova vale.
- **Transições por par de chão**: Grama sobre Terra, Caminho e Areia, e Areia sobre Terra, cada uma com a forma
  derivada da pintura enviada (antes era uma forma só). A forma gira e monta cantos; a textura nunca gira.
- Novo script `scripts/import-transition.py` (forma + faixa pintada a partir da pintura do par); `build-materials.py`
  gera o atlas de formas com máscara, halo e espuma por peça. Terra Arada e os demais chãos seguem sem transição.

## 0.86.0 — 2026-11-08
- **O chão quebrado se refaz**: um buraco (chão quebrado sem bloco) que fica um dia inteiro do jogo (`DAY_LENGTH_S`, 8 min)
  ganha de volta um chão igual ao de um vizinho (os de lado primeiro, depois as diagonais; nunca água), escolhido pela
  seed e pela posição, sempre o mesmo. Tapar o buraco antes zera a contagem; buraco que enche de água segue enchendo.
- Na sala, quem decide é a sala: o chão novo viaja na mensagem `grow` (mesma forma do crescimento; sem subir o
  protocolo, aparelho antigo ignora). As idades dos buracos entram no salvamento (v11) e no retrato da sala (v4), então
  o dia continua de onde parou.

## 0.85.0 — 2026-11-08
- **O novo padrão de materiais é o do jogo**: os blocos e o chão com as texturas planas novas (areia, terra, grama, as cinco
  pedras, caminho, terra arada, tora e tábuas) passam a ser o que todo mundo vê; antes só aparecia com uma chave de teste.
  Cubos vizinhos e pilhas viram massa contínua, sem riscos, e o chão não tem mais a linha fraca em cada quadrado.
- **Transições entre chãos**: a grama avança com borda irregular sobre a terra, o caminho e a areia (a máscara enviada pela
  arte, girada para cada direção, mais pontas nos cantos). Só no chão plano; água, buracos, pedra e o piso da cidade ficam
  como estavam.
- Pedras aposentadas ainda presentes em mundos antigos continuam com a arte antiga.

## 0.84.0 — 2026-11-08
- **As paredes saíram do jogo** (decisão do dono do produto): sem as 16 paredes, sem as receitas e sem a arte delas (a
  tira de paredes que carregava em segundo plano e os ícones). Mundos e salas já salvos que tenham paredes ficam com o
  espaço vazio, e paredes na bolsa, na grade ou nos baús somem — nada quebra. A porta agora vai entre blocos de madeira
  ou de pedra.
- **Materiais V2 — madeira de carvalho** (só com `?blocos=v2`): Tora de Carvalho com topo (anéis) e frente (casca)
  próprios, e Tábuas de Carvalho só com o topo (a frente repete o topo; em teste). A cena `?materiais=1` mostra pilhas
  de tora e tábuas.

## 0.83.0 — 2026-11-08
- **Cinco pedras** (decisão do dono do produto): o jogo fica com Pedra Bruta, Tijolo de Pedra, Chão de Pedra, Pedra Lisa e
  Pedra Polida. **Pedra Irregular, Pedra Rachada e Tijolo de Pedra Rachado saíram**: sem receita (nem a parede de cada
  uma) e a muralha da cidade agora é só de Tijolo de Pedra, sem as peças rachadas. Mundos e salas já salvos que tenham
  esses blocos continuam funcionando (eles seguem existindo, só não dá mais para fazê-los).
- **Materiais V2 — texturas das quatro pedras** (só com `?blocos=v2`): Tijolo de Pedra, Chão de Pedra, Pedra Lisa e
  Pedra Polida entram no padrão novo, junto com a Pedra Bruta. A cena `?materiais=1` mostra as cinco.

## 0.82.2 — 2026-11-08
- **Materiais V2 — frente de terra e franjas do Caminho e da Terra Arada** (só com `?blocos=v2`): Caminho de Terra e
  Terra Arada passam a ter a frente de terra (como a grama) e a franja de transição enviada pela arte caindo sobre ela.
  O importador limpa a cor das bordas (a da terra arada veio com halo vermelho de recorte) e reduz as franjas com alfa
  correto.

## 0.82.1 — 2026-11-08
- **Materiais V2 — Caminho de Terra e Terra Arada** (só com `?blocos=v2`): topos oficiais enviados pela arte (a frente
  repete o topo). O chão dos materiais V2 também deixou de ter a linha fraca em cada célula: ela vinha da "grade sutil
  de blocos" desenhada sobre todo chão; no V2 o chão é uma superfície só (o chão antigo continua com a grade).

## 0.82.0 — 2026-11-08
- **Materiais V2 — massa contínua** (só com `?blocos=v2`; nada muda no jogo normal): cubos vizinhos e níveis empilhados
  não mostram mais riscos entre si, nem na horizontal nem na vertical, nem entre materiais diferentes (pedra sobre
  terra, areia ao lado de terra). O contorno fica só na borda do conjunto; a frente da pilha é uma parede contínua e a
  franja da grama aparece só no nível mais alto. Blocos antigos ao lado mantêm o contorno. A cena `?materiais=1` mostra
  um platô de materiais misturados, um degrau e pilhas. Pendente: arte V2 do Caminho (linha em cada célula do chão).

## 0.81.2 — 2026-11-07
- **Materiais V2 — frentes próprias** (nada muda no jogo): terra, Pedra Bruta e areia ganharam a frente enviada pela arte
  (antes repetiam o topo). A frente da grama usa a frente da terra, então muda junto. Visíveis em `?blocos=v2` e
  `?materiais=1`.

## 0.81.1 — 2026-11-07
- **Materiais V2 — decisões do dono do produto** (nada muda no jogo): a frente dos cubos **fica em 18** (a comparação
  com 16 não mostrou diferença que valha a mudança); a franja da grama foi **reduzida aos 32 px** do padrão (veio com
  60 e cobria quase toda a frente); material **sem frente própria repete o topo**. A cena `?materiais=1` agora compara
  o atlas antigo com o V2.

## 0.81.0 — 2026-11-07
- **Padrão de Materiais V2 — preparação** (nada muda no jogo): o padrão definido com a área de arte entrou no
  repositório (ADR 0023, contrato de entrega em `assets-src/materiais/`) com o pipeline que monta os blocos a partir de
  texturas planas. Para comparar a altura da frente dos cubos (16 ou 18), abra o servidor de desenvolvimento com
  `?materiais=1`; para ver areia,
  terra, grama e Pedra Bruta no novo formato no mundo, `?blocos=v2`. Já com a **arte oficial** enviada pelo dono do
  produto (terra, grama, transição da grama, areia e pedra bruta).

## Sem versão do jogo — 2026-11-07 (documentação e organização)
- **Docs**: `CURRENT_STATE` reescrito como retrato do estado atual (211 testes, Sala 1 até 10, quatro personagens, sentar, minimapa, fome); o diário técnico por versão foi para `docs/archive/estado-por-versao.md`.
- **Docs**: novo `domains/multiplayer.md`; índice com os 21 ADRs e mapa de pastas; `NEXT_STEPS` com cabeçalho e panorama atualizados; `ARCHITECTURE` com os scripts que faltavam; `README` da raiz com o personagem modular integrado e os controles novos.
- **Repositório**: capturas de tela da raiz foram para `docs/assets/`; `scripts/__pycache__` saiu do git e `__pycache__/` entrou no `.gitignore`.

## Sem versão do jogo — 2026-11-07 (ferramenta de desenvolvimento)
- **Cena de escala** (ADR 0022): `?escala=1` no servidor de desenvolvimento mostra personagens, animais, monstros, baú, bancos, árvores e uma casa 5×5 sobre a grade com o renderizador real, com grade, âncoras, células bloqueadas e alturas. Reproduzível; não entra no build de produção. Teste novo confere a regra "filhote ≈ 0,7× o adulto". Nada muda para o jogador.

## 0.80.1 — 2026-11-07
- **Novo ícone oficial do Orvalis**: o selo redondo (castelo, cachoeira, vila e ponte sob o nome dourado) passa a ser o ícone do jogo instalado na tela inicial e o favicon do navegador. Android ganhou um ícone adaptável (`maskable`) próprio e o iPhone um `apple-touch-icon` de fundo escuro. Antes era a Heroína sobre fundo roxo.

## 0.80.0 — 2026-11-07
- **Todos sentam**: Heroína, Herói e Hood ganharam a folha de sentar e levantar (antes só o Gino). Cada um sentado tem o
  mesmo tamanho de quando está em pé; o Gino sentado estava um pouco maior e foi acertado.

## 0.79.2 — 2026-11-07
- **Sentado no lugar certo**: os pés do Gino ficam na célula da frente do assento e o corpo sobre ele (antes os pés
  ficavam na célula do banco/cadeira e ele parecia sentado um bloco acima).

## 0.79.1 — 2026-11-07
- **Sentar mais natural** (retorno do dono do produto): o Gino anda até o assento, vira de frente e senta abaixando o
  corpo no lugar (antes ele aparecia de uma vez em cima do banco, parecendo subir um bloco). Sentado, fica parado (antes
  repetia um leve balanço). Para levantar, ergue-se no lugar e anda de volta.

## 0.79.0 — 2026-11-07
- **Sentar e levantar** (por enquanto com o Gino): toque numa cadeira ou num banco da cidade para sentar; ande ou
  toque de novo para levantar. Na sala, os outros veem você sentado.
- **Porta entre paredes**: a porta de madeira agora também vai entre paredes de madeira ou de pedra (e misturando com
  blocos), não só entre blocos.
- Multiplayer: `PROTOCOL_VERSION` 18 (servidor 0.20.0 junto).

## 0.78.0 — 2026-11-07
- **Cidade com piso de Tijolo de Pedra**: ruas, praças, pátio do castelo e calçadas das casas passam a ter o mesmo piso
  (antes eram quatro pedras diferentes). Os gramados continuam verdes.

## 0.77.0 — 2026-11-07
- **Novo personagem: Gino** (folhas do dono do produto), na tela de personagem ao lado de Heroína, Herói e Hood: anda
  sem ferramenta e segurando cada uma das 5 ferramentas, com os 5 golpes. Na sala, os outros veem o Gino.
- Correção do registro da 0.76.0: das folhas do Herói, mudaram as 5 caminhadas com ferramenta e os golpes de machado e
  pá (caminhada base e golpes de espada, enxada e picareta vieram iguais às que já estavam no jogo).
- Multiplayer: `PROTOCOL_VERSION` 17 (servidor 0.19.0 junto).

## 0.76.0 — 2026-11-07
- **Herói redesenhado** (folhas novas do dono do produto): caminhada sem ferramenta, **andar segurando cada uma das
  5 ferramentas** (antes ele andava de mãos vazias com espada, machado, enxada e pá) e os 5 golpes refeitos.

## 0.75.0 — 2026-11-07
- **Golpes do Hood**: folhas novas de bater com a espada e o machado, arar com a enxada, minerar com a picareta e cavar
  com a pá (antes o golpe dele mostrava a caminhada com a ferramenta). Na sala, os outros também veem.

## 0.74.0 — 2026-11-07
- **Animal alimentado segue você**: enquanto está com o coração na cabeça, o animal vai atrás de quem deu a comida.
  Quando o coração acaba, ele fica onde você o levou (dá para levar os animais até um cercado).
- **Leite e ovo**: a vaca solta leite e a galinha solta ovo ao comer. O leite também se bebe.
- **Receitas novas do Cozinheiro**: Queijo (1 leite, no Caldeirão) e Torta de Maçã (2 trigos, 1 leite, 2 maçãs e
  1 ovo, no Forno de Pedra).
- **Jogo abre mais rápido**: as folhas da personagem com cada ferramenta (e de outros personagens) só baixam quando
  aparecem pela primeira vez; o que o jogo espera para começar caiu de ~3,1 MB para ~2,0 MB.
- Na sala vale o mesmo para todos (o animal segue quem deu; leite e ovo caem no chão da sala). Multiplayer:
  `PROTOCOL_VERSION` 16 (servidor 0.18.0 junto).

## 0.73.0 — 2026-11-07
- **Animais da sala ficam salvos**: ovelhas, vacas, galinhas e cavalos da Sala 1 (filhotes e crias incluídos) voltam
  onde estavam depois que o servidor reinicia ou é atualizado. Antes, voltavam só os animais do começo. As aranhas
  continuam renascendo como sempre.
- Servidor 0.17.0 junto (protocolo continua 15: só o arquivo da sala mudou, `RoomSnapshot` v3).

## 0.72.0 — 2026-11-07
- **Na sala, os outros aparecem com a ferramenta na mão e golpeando**: antes o boneco dos outros jogadores andava
  sempre de mãos vazias. Agora mostra a espada, o machado, a enxada, a pá ou a picareta que a pessoa segura e toca a
  mesma animação de golpe (bater, arar, cavar, minerar).
- Multiplayer: `PROTOCOL_VERSION` 15 (servidor 0.16.0 junto).

## 0.71.0 — 2026-11-07
- **Novo personagem: Hood** (folhas enviadas pelo dono do produto). Escolha na tela de personagem (início e "Novo
  mundo"), ao lado de Heroína e Herói. Anda segurando cada ferramenta (espada, machado, enxada, picareta e pá).
  Ainda sem animação própria de golpe: no golpe ele mostra a ferramenta na mão (falta a arte dos golpes).
- Na sala, os outros jogadores veem o Hood. Multiplayer: `PROTOCOL_VERSION` 14 (servidor 0.15.0 junto).

## 0.70.0 — 2026-11-07
- **Sala compartilhada, Etapa 3: aranhas e animais da sala.** Na Sala 1 todos veem as mesmas ovelhas, vacas, galinhas,
  cavalo e aranhas, nos mesmos lugares: quem roda os bichos agora é o servidor.
  - Dar comida, namoro e filhotes valem para todos (o trigo só sai da bolsa quando o animal come de verdade).
  - Golpe: quem bate vê o dano, e os outros também; aranha derrotada some para todos e o espólio cai no chão da sala
    (quem chega primeiro pega).
  - Mordida: a aranha morde quem está encostado nela, e só essa pessoa perde vida.
  - Moradores da cidade continuam de cada um (são enfeite).
- Multiplayer: `PROTOCOL_VERSION` 13 (servidor 0.14.0 junto, agora com relógio de 10×/s).
- Correção: a imagem das paredes de pedra estava publicada numa pasta errada do Artifact (paredes sem desenho na
  v0.68.0); republicada no lugar certo.

## 0.69.0 — 2026-11-07
- **Paredes de outros materiais** (nova prancha do dono do produto): Terra, Grama, Terra Arada, Terra Batida, Areia,
  Pedra com Musgo, Tronco e Tábuas — agora são 16 paredes. Mesma regra das de pedra: **3 blocos do material → 1
  parede**, 3 de altura, muro contínuo (dá para misturar materiais no mesmo muro). A parede de Pedra com Musgo também
  usa Pedra Bruta (duas receitas: escolha a aparência).
- Cada parede se desmonta com a ferramenta do material: madeira com o **machado**, terra e areia com a **pá** (ou
  picareta), pedra com a **picareta**.
- A imagem das paredes passou a carregar em segundo plano (a bolsa já mostra os ícones desde o início): o jogo abre tão
  rápido quanto antes.
- Multiplayer: `PROTOCOL_VERSION` 12 (blocos novos; servidor 0.13.0 junto).

## 0.68.0 — 2026-11-07
- **Paredes de pedra** (prancha enviada pelo dono do produto), para separar bloco de parede: o **bloco** continua o
  cubo que se empilha e onde se sobe; a **parede** é uma peça alta (3 de altura) onde não se sobe nem se empilha nada.
  Uma para cada pedra — Bruta, Irregular, Tijolo, Lajotas, Lisa, Polida, Rachada e Tijolo Rachado —, cada uma com seu
  ícone. Paredes lado a lado viram um **muro contínuo**. Receita do Construtor: **3 blocos da pedra → 1 parede**.
  A picareta desmonta (volta a parede para a bolsa).
- Multiplayer: `PROTOCOL_VERSION` 11 (blocos novos; servidor 0.12.0 junto).

## 0.67.0 — 2026-11-07
- **Itens no chão compartilhados na sala** (Etapa 2): ao quebrar um bloco ou colher maçãs na sala, os itens caem para
  todos; quem chega primeiro pega e o item some para os outros.
- **Baús compartilhados**: o que se guarda num baú da sala aparece para todos, fica salvo no servidor junto com o
  mundo e cai no chão (para todos) se o baú for quebrado.
- Multiplayer: `PROTOCOL_VERSION` 10 (servidor 0.11.0 junto). Espólios de aranha seguem de cada um até a Etapa 3.

## 0.66.0 — 2026-11-07
- **Na sala, cada um aparece com o personagem que escolheu**: Heroína, Herói ou o Chibi com as peças montadas — antes
  os outros jogadores sempre viam a Heroína. Peça que este jogo não conhece vira a padrão.
- Multiplayer: `PROTOCOL_VERSION` 9 (servidor 0.10.0 junto).

## 0.65.1 — 2026-11-07
- **Correção**: ao entrar na Sala 1, o jogo trocava o Herói pela Heroína (só a aparência do Chibi passava para o mundo
  da sala). Agora o personagem escolhido segue para a sala. Os outros jogadores ainda veem todos como Heroína
  (aparência na rede: próximo passo).

## 0.65.0 — 2026-11-07
- **Novo mundo abre a escolha de personagem** (pedido do dono do produto): no menu do jogo, "Novo mundo" mostra a mesma
  tela do início — Chibi, Heroína ou **Herói**, nome — e só então cria o mundo; "Voltar" volta ao mundo de antes.
- **Herói**, personagem pronto (folhas enviadas): anda nas 4 direções e golpeia com as 5 ferramentas (enxada, machado,
  espada, pá e picareta); anda com a picareta. Ainda sem folha (usa a caminhada sem ferramenta): andar segurando as
  outras ferramentas.
- Salvamento `SAVE_VERSION` 10: o mundo guarda o personagem escolhido (quem já jogava continua com a Heroína).

## 0.64.0 — 2026-11-06
- **Sala fixa e salva** (pedido do dono do produto): "Jogar com amigos" agora lista as salas por número — por enquanto
  a **Sala 1**, para até **10 jogadores** ao mesmo tempo, mostrando quantos estão nela. Entra e sai quando quiser:
  tudo o que se faz na sala fica **salvo no servidor** e quem entrar depois vê o mesmo mundo.
- **A bolsa da sala fica guardada** pelo nome: ao voltar, os itens e o lugar onde você estava continuam lá. Fora da
  sala, o mundo sozinho segue com a própria bolsa.
- Saem as salas com código de convite. Multiplayer: `PROTOCOL_VERSION` 8 (servidor 0.9.0 junto).

## 0.63.0 — 2026-11-06
- **Jogar com amigos — mesmo horário e mesmo crescimento** (Etapa 1 da sala compartilhada): a sala tem a própria hora
  do dia; quem entra passa a ver a mesma hora que os outros (dia e noite iguais) e o relógio é acertado a cada 30 s.
  Plantas, árvores e maçãs crescem pelo servidor: todos veem o mesmo estágio, inclusive quem entra depois.
- Multiplayer: `PROTOCOL_VERSION` 7 (servidor 0.8.0 junto, com o relógio das salas). Itens caídos e aranhas/animais
  compartilhados vêm nas Etapas 2 e 3.

## 0.62.0 — 2026-11-06
- **Interior da tenda** (arte enviada pelo dono do produto): andar para cima diante da frente de qualquer tenda entra
  num cômodo iluminado com lampião e colchão, como na Ferraria; pisar no capacho volta para diante da tenda.
- **"Jogar com amigos" não trava mais em "Conectando…"**: sem resposta do servidor em 10 s (ou conexão que cai antes da
  sala), o jogo tenta mais uma vez sozinho e, se de novo nada, avisa "O servidor não respondeu. Tente de novo em
  instantes." (o servidor da Hostinger às vezes reinicia e a conexão fica pendurada).

## 0.61.1 — 2026-11-06
- **"Jogar com amigos" fora do site**: no Artifact do claude.ai e nas prévias da Hostinger o servidor recusa a
  conexão (só aceita o site oficial), e o menu mostrava os botões que falhavam com "Não foi possível conectar". Agora
  esses endereços mostram o aviso "Aqui só dá para jogar sozinho" com o link 🌐 do site. No site oficial nada muda
  (criação de sala testada de ponta a ponta: servidor no protocolo 6, sala criada).

## 0.61.0 — 2026-11-06
- **Namoro com coraçõezinhos** (folha enviada pelo dono do produto), igual para ovelha, vaca, galinha e cavalo: o
  animal que come fica com um coração; dois apaixonados se procuram, param de frente e sobem coraçõezinhos entre eles
  (~2,6 s) até o filhote aparecer. Os corações acompanham o tamanho do animal.
- Sai a animação de namoro própria da ovelha (o casal agora aparece de verdade, como os outros animais).

## 0.60.0 — 2026-11-06
- **Filhotes** (folhas enviadas pelo dono do produto): **potro**, **bezerro** e **pintinho**.
- **Reprodução dos animais do campo**, como a das ovelhas: com o alimento na mão, toque no animal — **vaca come
  trigo**, **galinha come semente de trigo**, **cavalo come cenoura**. Dois da mesma espécie apaixonados se encontram,
  namoram e nasce um filhote. Fora de um animal, semente e cenoura continuam plantando (e a cenoura, sendo comida).
- **Filhotes crescem em 3 dias de jogo** (24 min) e viram adultos. Limite por espécie: 6 cavalos, 10 vacas,
  12 galinhas (ovelhas seguem 16).
- Como as ovelhas, os animais ainda não são salvos: ao recarregar, voltam os iniciais da semente.

## 0.59.0 — 2026-11-06
- **Cerca de Madeira** (referência enviada pelo dono do produto): colocada célula por célula, **emenda sozinha** com as
  cercas vizinhas — retas, cantos, "T", cruzamentos, pontas e poste solto — e se refaz ao colocar ou tirar uma
  vizinha. Bloqueia a passagem (cercados para vacas, galinhas e ovelhas). Receita do Construtor: **2 Tábuas → 4 cercas**.
- **Portão de Madeira**: tocar abre e fecha (como a porta); aberto deixa passar. Emenda com a cerca dos lados.
  Receita: **4 Tábuas → 1 portão**. Por enquanto o desenho é de frente (fica certo em cerca horizontal); o portão
  de lado espera arte.
- O machado desmonta cerca e portão (voltam para a bolsa). Multiplayer: `PROTOCOL_VERSION` 6 (blocos novos; servidor
  atualizado junto).

## 0.58.0 — 2026-11-06
- **Pedregulhos** (prancha de pedras enviada, 40 artes): pedras soltas espalhadas pelo mundo, uma arte sorteada por
  lugar — no lugar dos antigos cubos de pedra avulsos (muda o mapa de todas as sementes só nesses pontos).
  Mineradas (picareta, ou na mão) soltam **1–3 Pedras Brutas**, que vão para a mão/bolsa como o bloco de pedra e
  são colocadas como cubo.
- Multiplayer: `PROTOCOL_VERSION` 5 (o mapa da sala mudou; servidor atualizado junto).

## 0.57.1 — 2026-11-06
- **Ficha de receita sem depender de leitura** (pedido do dono do produto, para crianças que ainda não leem): botões
  com ícone e cor — **✓ Criar** (verde) e **✕ Voltar** (vermelho); a estação vira o ícone do Caldeirão com ✓/✗ e o
  destino vira o ícone da mão ou da bolsa com →. Os nomes ficam no toque longo/leitor de tela.

## 0.57.0 — 2026-11-06
- **Bolsa nova** (pedido do dono do produto): 12 espaços em 4 fileiras de 3, à **direita**, logo acima dos botões
  personagem/habilidades/bolsa — a esquerda fica livre. Com a mão, 21 itens (antes 9 + 18). Quem tinha mais de 12
  tipos na bolsa encontra o excesso no chão, aos pés da personagem (nada se perde).
- **Ficha de receita**: tocar numa receita não cria mais na hora — abre a ficha (ícone, ingredientes "tem / precisa",
  estação ✓/✗ e "Vai para: mão/bolsa") com **Confirmar** e **Cancelar**, e a bolsa aparece ao lado para ver o item
  entrar. Ao confirmar: "+N Item na mão/na bolsa".

## 0.56.0 — 2026-11-06
- **Barra de fome** (pedido do dono do produto): abaixo da vida, esvazia em ~12 min. Com fome abaixo de 30% a vida não
  se recupera sozinha; vazia, a fome tira vida aos poucos (sem derrubar). Renascer volta satisfeito.
- **Comer**: com o alimento na mão, o botão de ação (ou clique) come. Crus: maçã (+15), cenoura (+12), batata (+10),
  tomate (+8) — batata, tomate e cenoura ainda plantam quando o alvo é terra arada livre. Pratos: **Pão** (+35) e
  **Macarrão ao Molho** (+70), com os ícones enviados.
- **Profissão Cozinheiro** (toque nela em Habilidades): Pão (2 trigos) e Macarrão ao Molho (4 trigos + 2 tomates),
  feitos **só perto de um Caldeirão de Pedra** colocado no mundo. As profissões agora trocam a lista de receitas.
- Salvamento v9 (a fome é salva; quem já jogava começa satisfeito). Sem mudança no multiplayer.

## 0.55.1 — 2026-11-06
- **Correção: tocar muito rápido ampliava a tela e ela travava** (iPhone/iPad). O Safari ignora `user-scalable=no` e
  amplia a página com toque duplo; o jogo agora bloqueia o toque duplo, a pinça e o duplo clique (`ScreenMode`),
  usa `touch-action: manipulation` na página e nos botões, e o botão de ação e o canvas soltam o toque se o navegador
  tomar o gesto (`lostpointercapture`), em vez de ficarem presos.

## 0.55.0 — 2026-11-06
- **Covil das Aranhas com entrada de caverna** (pedido do dono do produto, arte enviada; ADR 0019): no mundo fica só
  a caverna, a pelo menos 10 chunks do castelo em direção sorteada pela seed. Andar para dentro da boca leva ao
  labirinto; pisar na saída devolve à frente da caverna. De dentro não se vê o mundo (escuridão em volta) e do mundo
  não se vê o labirinto. O minimapa mostra o labirinto com a névoa lá dentro.
- **Mundo da Cidade do Despertar só de florestas**: sem deserto — campos (carvalhos e macieiras), bosques de sakura,
  rios, mares e areia nas praias. Dunas e cacto ficam guardados para um mundo árido futuro.
- ⚠️ Muda o mapa de todas as sementes (covil antigo vira terreno, desertos viram floresta). Salvamento v8: as aranhas
  voltam completas. Multiplayer: `PROTOCOL_VERSION` 4 (servidor atualizado junto).
- Visão registrada: cidades em mundos diferentes ligados por portais ("andares").

## 0.54.0 — 2026-11-06
- **Pano de Seda** (Construtor, 10 Sedas de Aranha), com ícone próprio. A **Tenda** passa a pedir **1 Pano de Seda**
  + 10 Tábuas + 4 Presas (antes: 10 sedas soltas).
- **Ferramentas por material — contrato de arte** (ADR 0018, `assets-src/ferramentas/CONTRATO.md` + `catalogo.json`):
  as 5 pranchas recebidas (madeira, pedra, madeira + presa, madeira + Coração, presa + Coração) ficam guardadas como
  referência; entram no jogo quando houver camada de mão (hoje a ferramenta é pintada na folha da heroína).

## 0.53.0 — 2026-11-06
- **Batata, tomate e cenoura** (pedido do dono do produto): plantados pelo próprio legume em Terra Arada, crescem por
  16 estágios com a prancha enviada (~2–2,5 min) e, maduros, dão 2–3 legumes (um serve para replantar). Verdes,
  devolvem o legume. Jogo novo começa com 2 de cada na bolsa; arrancar capim às vezes revela uma hortaliça.
- **Ícones novos** de maçã, batata, tomate e cenoura na bolsa (arte enviada).
- Motor: o trigo virou uma das culturas da tabela `CROPS` (blocks) — cultura nova = uma linha + folha de crescimento.
- Multiplayer: `PROTOCOL_VERSION` 3 (plantar hortaliça precisa da regra nova no servidor; servidor atualizado junto).

## 0.52.0 — 2026-11-06
- **Cadeira de Madeira** (Construtor, 4 Tábuas): móvel de 1 célula com a arte enviada; volta à bolsa ao quebrar
  (machado desmonta).
- **Vaca e galinha**: 2 vacas e 4 galinhas passeiam no campo do lado de fora do portão, perto do rebanho e do cavalo
  (folhas 4×4 enviadas). Cavalo, vaca e galinha são o mesmo animal do campo (`FarmAnimal`), com ritmo próprio.
- **Árvores com a prancha de crescimento**: carvalhos adultos sorteiam 5 artes (grande, bolotas, flores, outono,
  musgo) e os cactos, 8. **Macieiras** misturadas nos Campos (~1 em 6 árvores) — muda o mapa de todas as sementes
  (só troca carvalhos por macieiras; caminhos e espaços livres iguais).
- **Mudas que crescem**: derrubar uma árvore adulta pode dar uma Muda de Carvalho ou de Macieira (50%). Plantada em
  terra ou grama, passa por muda → jovem → (crescendo) → adulta, ~2 min por estágio.
- **Maçãs**: tocar numa macieira carregada colhe 2–3 Maçãs (caem ao pé); ela fica florida e as frutas voltam em
  ~2,5 min. Comer vem com a comida (Fase P).
- Multiplayer: plantar muda e colher maçãs viajam pela sala — `PROTOCOL_VERSION` 2 (servidor atualizado junto).

## 0.51.0 — 2026-11-06
- **Minimapa com névoa de exploração** (pedido do dono do produto): mapa redondo no canto superior direito, abaixo
  do ☰, com o norte para cima e a seta do jogador girando. Começa escuro e vai se revelando num raio de 14 blocos
  à medida que se anda; o que foi descoberto fica salvo com o mundo (`SAVE_VERSION` 7; antigos começam cobertos).
- Marcadores: Cidade do Despertar (estrela), entrada da dungeon (depois de descoberta), tenda e amigos na sala.
  Cidade e tenda ficam presas na borda quando longe. Dentro da Ferraria o mapa mostra só o nome do lugar.
- Só no mundo principal (o Santuário cabe na tela). Cada chunk vira uma imagem pequena refeita só quando o mapa ou
  a névoa dele mudam.

## 0.50.1 — 2026-11-06
- Corrigido o balanço dos braços na caminhada do chibi para a direita: oito fases contínuas, com retorno ao quadro inicial.
- Ajustados os recortes das quatro blusas e quatro peças de pernas para a nova posição das mãos. Demais direções,
  cabeças, cabelos, sapatos e região inferior dos pés preservados; folhas WebP do jogo e prévias reexportadas.
- Comparação sincronizada antes/depois em `previas/v02/direita-antes-depois.gif`; histórico e ORA editável locais.

## 0.50.0 — 2026-11-06
- **Tela de entrada** (pedido do dono do produto): o jogo abre no título **Orvalis** com a Cidade do Despertar viva
  atrás, **Novo jogo** e **Continuar** (só com jogo salvo no aparelho). Espaço reservado para "Jogar com amigos" e
  "Entrar" (cadastro, backend do Orvalis).
- **Monte seu personagem** depois de "Novo jogo": **Chibi** (cabelo, roupa, pernas, pés ou descalço) ou **Heroína**,
  prévia andando e virando nas 4 direções, **Sortear** e **Nome**. "Começar" cria um mundo novo com essa aparência.
- Aparência salva no aparelho (`SAVE_VERSION` 6): continua em "Novo mundo", "Recomeçar" e nas salas. Salvamentos
  antigos continuam com a heroína. O chibi foi igualado à altura da heroína (×0,94).
- `?seed=`, `?personagem=` e o Santuário entram direto no mundo, como antes.

## 0.49.0 — 2026-11-06
- **Três receitas novas do Construtor** (pedido do dono do produto): **Fogueira** (3 Toras de Carvalho), **Caldeirão
  de Pedra** (3 Pedras Brutas + 1 Fogueira) e **Forno de Pedra** (6 Pedras Brutas), com a arte enviada. Colocam-se fora
  da cidade (1 célula, bloqueiam), brilham à noite e voltam à bolsa ao quebrar (machado desmonta a fogueira, picareta
  os de pedra). Cozinhar ainda não: vem com a comida (Fase P, entrega 4).

## 0.48.0 — 2026-11-05
- **Personagem modular no motor** (ADR 0017): `?personagem=chibi` troca a heroína pelo humano chibi, montado pelas
  partes do guarda-roupa v02 na ordem do manifesto (`&tronco=colete-verde&pernas=calca-ardosia&pes=sapatos-couro`,
  `&cabelo=…`). O quadro é desenhado no tamanho dele × escala do mestre, com a âncora no chão — sem esticar.
  Só caminhada (parado = quadro 0), sem ferramentas no chibi; só no jogo solo. Sem o parâmetro, nada muda.
- `export-personagem.py --out src/assets --prefixo chibi-` gera as 13 folhas (555 kB), carregadas só quando o chibi
  aparece (fora do orçamento de início).

## Sem versão — guarda-roupa chibi fantasia 01 — 2026-11-05
- Seis roupas novas em camadas: colete verde, túnica azul, blusa lilás, calça ardósia, shorts vinho e bermuda verde.
  Catálogo com onze peças/treze folhas; caminhada de oito quadros nas quatro direções.
- Dezesseis combinações sobrepostas (25 com a roupa bege da base), prancha comparativa, conjuntos em movimento,
  seletores independentes e sorteio na prévia. Corpo, rosto, cabelo e sapatos anteriores preservados.
- Fontes e ORA em camadas somente na área local. Todas as peças em revisão; jogo e versão jogável inalterados.

## Sem versão — revisão 2 da base chibi e dos sapatos — 2026-11-05
- A pedido do dono do projeto, substituída a malha de corpo inteiro por blusa sem mangas e shorts anteriores
  recoloridos em bege. Silhueta e pixels dos pés descalços da referência preservados nos 32 quadros.
- Sapatos menores e simples desenhados sobre as poses completas; removido o reposicionamento automático de
  componentes por quadro. Recorte limitado à silhueta original com margem de um pixel, sem mudar a fase dos pés.
- Prévia começa na base bege sem sapatos; comparação sincronizada sem/com sapatos e avanço de quadro quando
  pausada. Histórico da primeira revisão preservado localmente. Aprovação visual dos sapatos continua pendente.

## Sem versão — piloto artístico modular v02 — 2026-11-05
- Cinco peças em revisão: corpo/cabeça, cabelo curto trás/frente, blusa ocre, shorts marinho e sapatos de couro.
  Sete folhas de caminhada 8×4 no contrato, linhas frente/esquerda/direita/costas; oito contatos com pé/região.
- Malha bege opaca totalmente coberta autorizada provisoriamente para o corpo-base; objetivo definitivo de
  base sem roupa integrada continua pendente. Exceção registrada no contrato e no catálogo.
- Prévias pequenas, montagem local interativa e fonte ORA de sete camadas no trabalho local. Nenhuma mudança
  no renderizador, na heroína, no salvamento ou no multiplayer; não altera a versão jogável.

## Sem versão — personagem modular: contrato v02 — 2026-11-05
- **Contrato de arte v02** para personagens modulares (`assets-src/personagens/CONTRATO.md`, ADR 0017), fechado com a
  área de arte: quadro 384 × 512, âncora (192, 471) como raiz, escala fixa do mestre, linhas frente/esquerda/direita/
  costas, caixa de recorte por ação, encaixe × peça × parte com ordem por parte, contato dos pés indicado pela arte.
- **Exportador mínimo** `scripts/export-personagem.py`: valida a entrega (tamanhos, caixa, partes, contato, prévias
  ≤ 1 MB) e exporta WebP + `manifesto.json`. Testado com o v01 convertido: caminhada de 5 partes ≈ 300 kB.
- Pastas: `entrega/v02` e `previas/v02` no git; `_trabalho/` e `_arquivo/v01` (Krita/ORA, ~577 MB) só locais pelo
  `.gitignore`. O humano chibi v01 foi arquivado como referência. Não altera a versão jogável.

## 0.47.2 — 2026-11-04
- **Tablet: botão de ação de volta** (pedido do dono do produto). O toque na tela continua agindo como o clique.
- **Digitar no menu do tablet/celular**: ao tocar no campo do nome (ou do código), o jogo pedia tela cheia; o teclado
  na tela tira o navegador da tela cheia, e o toque seguinte pedia de novo — o teclado não chegava a abrir e a tela
  alternava entre tela cheia e navegador. Agora tocar num campo de texto (ou com um campo em foco) não pede tela cheia.

## 0.47.1 — 2026-11-04
- **Menu no celular deitado**: com "Jogar com amigos" o painel passou da altura da tela e o botão "Entrar com código"
  ficava inalcançável (o painel não rolava com o dedo). Agora, em telas baixas, o menu e "Jogar com amigos" ficam
  **lado a lado** e cabem inteiros (~340 px de altura); se ainda faltar espaço (ex.: teclado aberto), o painel rola com
  o dedo e usa a altura visível de verdade (`dvh`).

## 0.47.0 — 2026-11-04
- **Jogar com amigos** (Fase M, etapa 3; servidor `orvalis-servidor.pensamentos.online`): no menu ☰, escreva seu nome
  e **crie uma sala** (aparece um código de 6 letras para passar aos amigos) ou **entre com o código** de alguém. Até 4
  jogadores no mesmo mundo: cada um vê os outros andando, com o nome em cima, e o que alguém quebra, coloca, ara,
  planta ou abre aparece para todos. "Sair da sala" volta ao seu mundo de sempre (salvo). O nome fica lembrado no
  aparelho. Na sala nada é salvo no aparelho; monstros, animais e moradores ainda são de cada um.
- Teclas digitadas nos campos do menu não movem mais a heroína.

## 0.46.0 — 2026-11-04
- **Pacote do multiplayer para o servidor** (Fase M, etapa 2): `npm run build:net` gera `dist-net/orvalis-net.cjs`
  (sala, protocolo e regras do mundo num arquivo para Node, sem dependências; versão e commit no cabeçalho). A
  Verificação compila o pacote em todo PR. O servidor (`maiam/orvalis-servidor` 0.2.0) passa a abrir salas co-op de
  verdade com ele: criar sala, entrar pelo código, ações confirmadas para todos, limites de mensagens e de origem.
  O jogo ainda não mostra o multiplayer (Etapa 3).

## 0.45.0 — 2026-11-04
- **Base do multiplayer** (Fase M, etapa 1; ADR 0016 com as decisões do dono do produto: co-op com código de convite
  até 4 jogadores, convidado só com nome, sem combate entre jogadores). Ações do jogador como dados aplicadas pelas
  regras do `World` (`world/actions.ts`), protocolo de mensagens (`net/protocol.ts`), sala autoritativa pura
  (`net/room.ts`) que o servidor vai usar, sessão do jogo (`net/session.ts`) e um servidor de teste dentro do próprio
  jogo (`net/loopback.ts`). Testado com vários jogadores: edições iguais para todos, quem chega depois recebe o que já
  foi feito, cidade protegida recusada, sala cheia, nome e versão inválidos. Ainda não aparece no jogo (Etapa 3).

## Sem versão (docs) — 2026-11-04
- **Servidor do Orvalis no ar (Etapa 0 do multiplayer)**: repositório `maiam/orvalis-servidor`, publicado em
  `orvalis-servidor.pensamentos.online` (app web Node.js da Hostinger). O teste de WebSocket conectou: a hospedagem
  aceita conexões em tempo real.
- **Orvalis independente do maiamapps** (ADR 0015, decisão do dono do produto): o jogo não usa nem acessa o
  maiamapps; terá domínio próprio e, até lá, `pensamentos.online`. Multiplayer, contas e nuvem pertencem a um
  **backend próprio do Orvalis**, em repositório separado e subdomínio próprio. Plano do multiplayer registrado
  (NEXT_STEPS, Fase M). Nenhuma mudança no jogo.

## 0.44.0 — 2026-11-04
- **16 expressões nos moradores** (pranchas do dono do produto: personagem careca com 16 rostos de frente, de lado e do
  outro lado): sereno, alegre, sorriso, risada, surpreso, piscadela, contente, animado, triste, assustado, bravo,
  convencido, gargalhada, neutro, tímido e sonolento. O script isola cada rosto e o encaixa em todos os personagens
  (5 cabelos), em todos os quadros da caminhada, redesenhando a franja de cada cabelo por cima. Os efeitos fora do rosto
  (zzz, veia de raiva, tracinhos de susto) viram uma camada própria.
- Cada morador tem uma **expressão de repouso** sorteada pela seed (o ferreiro fica sempre sorridente) e **reage ao
  conversar** (risada, animado, piscadela ou gargalhada) por 3 s.
- Camadas do morador: personagem → rosto → franja → efeitos → roupa. Tudo carrega em segundo plano (início ~2,6 MB).

## 0.43.1 — 2026-11-04
- **Fonte maior** (arte nova do dono do produto): a fonte da praça central passa de 3×3 para **5×5**, centralizada na
  praça; bancos e barracas em volta continuam nos mesmos lugares. Muda a praça central (igual em toda seed); salvamentos
  antigos se ajustam sozinhos (a área da cidade volta do gerador).

## 0.43.0 — 2026-11-04
- **Fonte, poço, barraca de frutas e barril com arte nova** (pranchas do dono do produto), no lugar da pintura em
  código. Os tamanhos dos lotes não mudaram: fonte 3×3, poço 2×2, barraca 2×1 e barril 1×1. Só os caixotes e as placas
  continuam pintados.
- **Personagem ruivo** (`villager-red`): a cidade volta a ter 4 moradores comuns (loiro, castanho, prateado e ruivo)
  e mais o ferreiro.

## 0.42.1 — 2026-11-04
- **Ferreiro com visual fixo e único** (regra do dono do produto): sempre o personagem de **cabelo preto** com a
  **roupa de ferreiro**. Nenhum outro morador usa esse personagem nem essa roupa. A cidade fica com 3 moradores
  comuns (loiro, castanho e prateado), cada um com roupa casual sorteada pela seed, e o ferreiro na Ferraria.

## 0.42.0 — 2026-11-04
- **Interior da Ferraria** (arte do dono do produto): andar para cima diante da porta da Ferraria leva para dentro
  (escurece rápido e mostra "Ferraria"); pisar no capacho volta para a rua. Lá dentro: forja, bigorna, armeiro,
  estantes e balcão; paredes e móveis bloqueiam, o chão e o tapete são andáveis. Cômodo isolado do mapa e protegido
  (ADR 0014).
- **O ferreiro mora na Ferraria**, atrás do balcão; tocar nele (ou o botão de ação diante do balcão) mostra a fala dele.
  **Moradores também falam** quando tocados (dicas sobre a cidade).
- Mensagens longas no alto da tela quebram linha no celular e ficam mais tempo.
- Salvo dentro de um interior, o jogo volta na rua, diante da porta. Formato do salvamento inalterado.

## 0.41.0 — 2026-11-04
- **4 roupas novas** (prancha do dono do produto): jardineira de lavrador, colete social, moletom verde e a
  **roupa de ferreiro**. As 3 primeiras entram no sorteio dos moradores (agora 5 roupas casuais).
- **Ferreiro**: 5º morador, sempre com a roupa de ferreiro, diante da porta da Ferraria (cabelo sorteado pela seed).
  Roupas de ofício (`smith`) ficam fora do sorteio e vestem só quem tem o ofício.
- `extract-villagers.py` remove o fundo claro de folhas que não vêm transparentes (a do colete veio com fundo cinza).

## 0.40.1 — 2026-11-04
- **Hospedaria com arte nova** (9×5, 2 andares, prancha do dono do produto): substitui a pintura em código. A prancha
  já vem transparente; o recorte usa o alfa dela. `extract-town.py --only <nomes>` recorta só os objetos pedidos.
  Removido o desenho de casa em código que só a hospedaria ainda usava.

## 0.40.0 — 2026-11-04
- **Moradores na cidade**: 4 moradores (cabelo loiro, castanho, preto e prateado) passeiam pelas ruas e praças da
  Cidade do Despertar (praça inicial, caminho da praça central e pátio do castelo) e nunca saem delas; o golpe não os
  atinge. **Roupas em camadas**: o dono do produto passa a desenhar personagens de roupa branca + folhas de caminhada só
  de roupa; cada morador veste uma roupa sorteada pela seed (jaqueta jeans ou jaqueta de time, por enquanto), desenhada
  por cima no mesmo quadro (`scripts/extract-villagers.py` alinha tudo na mesma grade e escala).
- **Cavalo** no campo ao sul do portão, perto do rebanho: passeia e, como as ovelhas, não sobe em cubos.
- Passeio dos animais/moradores extraído para `game/wanderer.ts` (ovelha, cavalo e morador usam o mesmo).
- Folhas de moradores, roupas e cavalo não atrasam o início (cada um aparece quando a folha chega); o build conta-as
  fora do orçamento de início (~2,5 MB).

## 0.39.1 — 2026-11-03
- **Texturas sempre na direção desenhada** (pedido do dono do produto): o chão deixava alguns materiais girados ou
  espelhados ao acaso por célula para disfarçar a repetição; agora todo bloco aparece exatamente como a arte foi
  criada. A variedade passa a vir só das variações enviadas (ex.: 3 gramas), cada uma na direção original.

## 0.39.0 — 2026-11-03
- **Vida e dano com números (Fase P, entrega 1).** Heroína com **100 de vida** numa **barra com número** (no lugar dos
  corações), ataque 5 e defesa 2. Dano = ataque + poder da arma − defesa (mínimo 1), **±10%** de variação e **5% de
  crítico** (×1,5). Espada (12) bate mais que machado (7). Regeneração: 5% da vida a cada 1,5 s após 6 s sem dano.
- **Números de dano subindo na tela**: branco no inimigo, vermelho na heroína, amarelo e maior no crítico.
- **Aranhas com ficha** (vida/ataque/defesa): pequena 20/8/0, grande 45/14/2, Rainha 180/36/6 — com a espada, ~2, ~3 e
  ~16 golpes.
- Regras numéricas num só lugar: `world/progression.ts` (puro, testado). Salvamento **v5**: vida antiga convertida na
  mesma proporção (heroína e aranhas). 4 testes novos (121).

## 0.38.0 — 2026-11-03
- **Terra com Grama com arte nova** (prancha fornecida, `scripts/extract-grass.py`): 3 variações sorteadas por célula,
  no chão e nos cubos (o chão fica menos repetido).
- **Plano de progressão registrado** (`NEXT_STEPS`, Fase P): vida e dano com números, nível e XP, profissões com
  proficiência (Lenhador, Minerador, Agricultor, Construtor), comida e cura. Decisões do dono do produto em `DECISIONS`.

## 0.37.3 — 2026-11-03
- **Regra de publicação** registrada (`CONVENTIONS`): um PR para `main` por entrega, mesclado automaticamente (método
  *merge*) depois que a **Verificação** passa.
- **Verificação no GitHub Actions** (`.github/workflows/ci.yml`): `npm ci`, tipos, testes, build e `npm audit` em todo PR
  para `main`.
- **Dependências sem vulnerabilidades** (alerta da Hostinger: 6, sendo 2 críticas em `tinypool`): Vite 6.4 → **7.3**
  (esbuild 0.28) e Vitest 3.2 → **5.1**. Eram só ferramentas de teste/build — o site publicado não as contém —, mas
  `npm audit` agora mostra 0. Node mínimo: **22.12** (`engines`; a Hostinger usa 22.x).
- Benchmark migrado para a API do Vitest 5 (`bench` do contexto do teste, `benchmark.include`); números iguais aos de
  antes (~0,08 ms por chunk).

## 0.37.2 — 2026-11-03
- Publicação pela integração GitHub da Hostinger (branch `main`, Vite, Node 22, `npm run build`, saída `dist`, sem
  variáveis de ambiente) documentada em `OPERATIONS`.
- **Site próprio em `orvalis.pensamentos.online`** (Hostinger, provisório no lugar de `maiamapps.com.br`):
  `npm run pack:site` gera `orvalis-site.zip` (build com os dois mundos + `.htaccess` com tipos MIME e cache) e o passo
  a passo do hPanel está em `OPERATIONS`.

## 0.37.1 — 2026-11-03
- **Nome oficial: Orvalis** (título da página, menu, app instalável e Artifact). Repositório, pacote e chaves de
  salvamento mantêm "mundoblocos" para não apagar os jogos salvos.
- Passo a passo de hospedagem em `orvalis.maiamapps.com.br` (Hostinger) em `OPERATIONS`.

## 0.37.0 — 2026-11-03
- **Imagens em arquivos separados (ADR 0013, decisão do dono do produto).** O Artifact deixa de ser um HTML único com
  tudo em base64: a página leva só o código (205 kB) e as 75 imagens são publicadas ao lado dela (cache do navegador
  entre versões). Novo orçamento: o que o jogo **espera para começar** < 3 MB (hoje ~2,5 MB); o total pode crescer.
- **Arte da dungeon em segundo plano**: carrega depois do início e entra nas texturas quando chega.
- Ícone da Porta de Carvalho virou arquivo (`icon-block-oak-door`; não se lê mais nenhum canvas).
- **Correção**: poço, fonte, bancos e barracas estavam sobre quadrados de grama no meio das praças (v0.36).

## 0.36.1 — 2026-11-03
- **Correção: dungeon em cima da estrada do portão.** Em ~70% das seeds (43 de 60 testadas) a dungeon ficava logo ao
  sul do portão, cobrindo o fim da estrada e o campo onde o rebanho nasce. Agora ela evita também esse campo
  (`TOWN_SOUTH_FIELD`, 28 células abaixo da muralha). Teste novo com 40 seeds (117).
- **Correção: entrada da dungeon bloqueada** em algumas seeds (árvore/água diante dela): as células diante da entrada
  ficam sempre livres e em terra firme (`DungeonTerrain`).
- **Correção: luz do poste no pé dele** — à noite o brilho agora sai da lanterna (`glowAt` nas texturas).
- **Correção: tocar no telhado** de uma construção alta pegava a planta atrás dela; vale o desenho inteiro da
  construção e a da frente vence.
- Documentação revisada (estado, plano, regras de morte/renascer, receitas, dungeon).

## 0.36.0 — 2026-11-03
- **Cidade maior e construções com arte fornecida.** Novos tamanhos (definidos pelo dono do produto): casas 5×5
  (térrea ou de 2 andares, telhado vermelho/azul/marrom), lojas 5×5, ferreiro 8×5, guilda 9×9, castelo 26×17 (com
  fosso e ponte), guaritas 4×6, bancos 2×1 e 3×1, postes de luz (pedra, madeira, madeira e pedra). A cidade passa de
  108 × 78 para **164 × 132** para caber tudo na proporção (90 casas). Térreas bloqueiam 4 das 5 fileiras: a de trás é
  quintal andável.
- `scripts/extract-town.py` refeito: tabela de objetos (recorte, encaixe por largura, remoção do fundo da guarita,
  limpeza de legendas) → `town-<nome>.webp` em escala única (48 px/célula). Hospedaria, fonte, poço e barracas seguem
  pintados em código.
- **Muda a cidade de todos** (e a posição da dungeon, planejada fora dela). Artefato: 3,95 MB.

## 0.35.4 — 2026-11-03
- **Correção: casa vermelha deformada.** Com uma só imagem para todos os tamanhos, o telhado era remontado
  (fileiras repetidas + ajuste vertical) para cobrir a profundidade — parecia esticado/duplicado. Agora há **uma
  imagem por tamanho** (3×2, 4×3, 5×3, desenhadas pelo dono do produto), desenhada sem alteração: só reduzida para a
  parede medir a largura da casa. A casa 4×2 (sem imagem) não usa vermelho (azul/alaranjado pintados).

## 0.35.3 — 2026-11-03
- **Nova arte da casa de telhado vermelho** (telhado com 6 fileiras e parede de dois andares: madeira sobre pedra).
- **Arbustos da cidade com arte fornecida** (`assets-src/town-bushes.png`): a cerca viva usa 3 arbustos (redondo,
  alto e largo com flores), sorteados por posição (fixos como a cidade); mesma escala, base no pé da célula.

## 0.35.2 — 2026-11-03
- **Casa de telhado vermelho com a arte fornecida** (`assets-src/town-house-red.png` → `scripts/extract-town.py`):
  todas as casas vermelhas da cidade usam a imagem, em qualquer tamanho (parede na largura da casa; telhado remontado
  em fileiras de telhas até cobrir a profundidade). As outras cores seguem pintadas em código.

## 0.35.1 — 2026-11-03
- **Correção: "Novo mundo" (e "Recomeçar") não faziam nada no Artifact.** A confirmação usava `window.confirm`, que o
  iframe do Artifact bloqueia (devolve "não" sem mostrar a janela). Agora a confirmação é no próprio menu: o botão
  fica vermelho ("Toque de novo para criar") e o segundo toque, em até 5 s, executa. Ao abrir o mundo novo aparece
  "Novo mundo criado · semente N" — todo mundo começa na mesma cidade, então sem aviso parecia que nada mudou.

## 0.35.0 — 2026-11-03
- **Cidade do Despertar** (Cidade 1, `world/town.ts`, ADR 0012, `domains/town.md`): cidade medieval fortificada de
  108 × 78 blocos, **igual em qualquer seed** (procedural com semente própria fixa), onde todo jogador começa e para
  onde volta ao morrer sem tenda. Muralha de Tijolo de Pedra (inteiro/rachado) com torres e um só portão ao sul,
  castelo com pátio ao norte, labirinto de ruas de Pedra Irregular/Rachada (caminho principal sinuoso, ruas
  secundárias, laços, becos), praças inicial/central/do castelo, Guilda, Hospedaria, Ferreiro, 3 lojas, ~60 casas,
  fonte, poço, barracas, lampiões (brilham à noite), cercas vivas e jardins.
- **Nada quebra nem é colocado dentro da cidade** (área protegida). Tocar numa construção/placa mostra o nome.
- Arte das construções pintada em código (`render/townArt.ts`): nenhum byte a mais no artefato.
- **Muda o mapa de todas as seeds**: início dentro da cidade, dungeon replanejada fora dela, ovelhas do lado de
  fora do portão. Salvamentos antigos carregam (células da cidade voltam do gerador). 8 testes novos (116).

## 0.34.1 — 2026-11-03
- **Porta entre qualquer madeira ou pedra**: as 8 pedras servem de batente (antes só a Pedra Bruta). Propriedade nova
  `stone` em `BlockDef` (fonte única do que é pedra); teste da porta cobre as 7 variações.

## 0.34.0 — 2026-11-03
- **8 variações de pedra** (prancha 3/4 fornecida, `scripts/extract-stones.py`): a pedra do mundo passa a ser a
  **Pedra Bruta** (mesmo id 25; montanhas, pedregulhos, batente de porta e água seguem iguais) e entram 7 blocos novos:
  Pedra Irregular, Tijolo de Pedra, Chão de Pedra, Pedra Lisa, Pedra Polida, Pedra Rachada e Tijolo de Pedra Rachado
  (ids 34–39 e 42). Todos são materiais: colocam, quebram com picareta/pá/mão e voltam como item.
- **Receitas do Construtor 1:1**: Pedra Bruta → Pedra Irregular, Tijolo de Pedra ou Chão de Pedra. As outras 4 ficam
  para receitas futuras ou construções prontas. 1 teste novo (108).

## 0.33.2 — 2026-11-03
- **Picareta também quebra a tenda**: exceção por ferramenta no registro (`ToolDef.alsoBreaks`); a picareta segue sem
  quebrar as outras madeiras (tora, tábua, porta, baú, árvores).

## 0.33.1 — 2026-11-02
- **Machado quebra a tenda** (a tenda passa a ser de madeira; com isso a picareta, que não quebra madeira, deixa de
  quebrá-la; a mão continua).
- **Morte: perde tudo menos as ferramentas** (materiais, sementes, trigo e espólios se perdem). 1 teste novo (107).

## 0.33.0 — 2026-11-02
- **Baú de Carvalho** (arte fornecida; receita do Construtor: 8 tábuas): 27 espaços. Tocar nele abre o Baú (3×9) e a
  Bolsa acima da mão; troca tocando no item e depois no destino (pilha inteira, mão ↔ bolsa ↔ baú). Quebrar o baú
  devolve o baú e derruba o conteúdo no chão. Conteúdo salvo (salvamento v4).
- **Tenda — aviso e regra do renascer**: cada tenda colocada mostra "Ponto de renascimento alterado" e vale sempre a
  última; derrubar a última volta o renascer ao início ("…voltou ao início"), mesmo com tendas antigas de pé.
- Mensagem curta na tela (`Hud.toast`). 4 testes novos (106).

## 0.32.1 — 2026-11-02
- **Correção: tenda prendia a heroína.** Ao colocar, só a célula alvo era conferida, mas a tenda ocupa 2×2 e uma parte
  podia cair sobre a heroína (ex.: olhando para a esquerda). Agora as 4 células precisam estar sem ninguém, e o jogo
  escolhe a posição 2×2 que cobre a célula à frente e se estende para longe dela. Ao carregar um salvamento com a
  heroína presa, ela vai para a célula livre mais perto. 2 testes novos (103).

## 0.32.0 — 2026-11-02
- **Tablet**: detectado como tela de toque com lado menor ≥ 600 px (`ScreenMode.isTablet`). Mantém o joystick, tira o
  botão de ação e o toque no mundo age como o clique do computador (tocar usa, segurar quebra). Celular não muda.
  1 teste novo (101).

## 0.31.2 — 2026-11-02
- **Tábua de Carvalho também substitui a água** (vira o chão da célula, como terra, pedra e tora).

## 0.31.1 — 2026-11-02
- **Tenda ocupa 2×2 blocos**: a célula escolhida é o canto inferior esquerdo; precisa das 4 livres em chão firme;
  as outras 3 bloqueiam (`TENT_PART`, sem arte); quebrar qualquer parte derruba a tenda inteira e devolve 1. Sprite
  com ~2 células de largura; renascer em volta da tenda.

## 0.31.0 — 2026-11-02 (Fase 3 — receitas)
- **Grade de 12**: 9 itens (1–9) · separador duplo · **Personagem** (ícone, ação em breve) · **Habilidades** (K) ·
  **Bolsa** (B/I). A bolsa passa a guardar **27 itens** (9 na mão + 18).
- **Habilidades**: acima da grade, **Receitas** (4×9, alinhadas aos 9 itens) e, à direita, **Profissões** (4×2).
  Profissão **Construtor** com 3 receitas — Tábua de Carvalho (1 tora → 2), Porta de Carvalho (4 tábuas → 1), **Tenda**
  (10 sedas + 10 tábuas + 4 presas). Tocar cria 1; sem ingredientes, a receita fica apagada.
- **Tenda**: colocada no chão, vira o **ponto de renascer** (ao lado da última tenda; quebrada, volta o início).
- **Nova arte da Tábua de Carvalho** (prancha fornecida; o bloco "Piso de Carvalho" passa a se chamar Tábua de
  Carvalho) e ícones de Personagem, Habilidades, Construtor e Tenda. `scripts/extract-ui.py`. Salvamento v3 (grade de 9
  + tenda; migra a v2). 3 testes novos (100).

## 0.30.0 — 2026-11-02
- **Novo visual da bolsa**: abre dentro do mesmo cartão da grade — 2 fileiras de 9 espaços acima da mão, do mesmo
  tamanho e largura dos 9 da grade (3 fileiras de 9 no total). Só o título "Bolsa" (sem textos de ajuda nem ✕).
- **Bolsa com 18 espaços**: o que não está na mão ocupa um espaço; item de tipo novo só é coletado se houver espaço
  vazio na mão ou na bolsa (senão fica no chão); pilhas que ela já tem sempre somam. Guardar um item da mão na bolsa
  exige lugar. `BAG_SLOTS`, `canCarry`, `bagStacks`, `bagHasRoom`. 1 teste novo (98).

## 0.29.1 — 2026-11-02
- **Porta também entre blocos de Pedra**: batentes podem ser de madeira (Tora/Piso de Carvalho) ou Pedra, inclusive
  misturados.
- **Qualquer tipo de terra substitui a água**: Terra, Terra com Grama, Terra Arada e Caminho de Terra (além de Pedra e
  Tora). Areia continua sem substituir.

## 0.29.0 — 2026-11-02
- **Água como bloco do mundo** (arte fornecida): o chão de água usa o topo do bloco de água (ladrilho contínuo).
  Continua **inquebrável**, mas **Terra, Pedra ou Tora a substituem** (viram o chão da célula; gastam o material).
- **Água enche buracos vizinhos**: buraco ao lado de água enche sozinho em 0,6 s, com a animação de enchimento
  (4 direções, conforme o lado de onde a água vem), e passa a encher os buracos vizinhos em cadeia. Terra firme não é
  inundada; buraco tapado antes de encher desiste. Ao carregar um salvamento, buracos vizinhos de água voltam a encher.
- `World.scheduleFlow/tickWater/waterFlows/settleWater`, `REPLACES_WATER`, `FLOW_SECONDS`; `scripts/extract-water.py`.
  4 testes novos (97).

## 0.28.0 — 2026-11-02 (Fase 3 — coleta de materiais)
- **Materiais coletados** no mundo principal: quebrar solta o próprio bloco (cubo ou chão), árvores soltam 2–3 Toras
  de Carvalho, porta volta porta; colocar gasta 1. Santuário continua infinito (perfil `collectBlocks`).
- **Grade de 8 espaços + bolsa no 9º** (ícone fornecido): ferramentas, itens e materiais dividem os 8 espaços; o que é
  coletado soma na grade (se já estiver nela ou houver espaço livre) ou vai para a bolsa. **Bolsa**: tudo que a
  heroína carrega; toque num item e num espaço para trocar; pausa o jogo. Teclas 1–8, 9/I/B (bolsa), Esc.
- **Ao cair, perde todos os materiais** (ferramentas, sementes, trigo e espólios ficam).
- Começo: ferramentas, 5 sementes, 2 trigos e 1 Porta de Carvalho (na bolsa). Contador de espólios saiu da HUD
  (estão na bolsa). Salvamento v2 (grade + materiais; migra a v1). 5 testes novos (93).

## 0.27.0 — 2026-11-02 (Fase 2 do plano — salvamento automático)
- **Salvamento automático no navegador** (ADR 0011): chunks editados, plantações, heroína (posição, vida), item
  selecionado, inventário (com espólios), ovelhas, aranhas vivas e renascimentos pendentes, hora do dia. A cada
  10 s, ao esconder a aba, ao sair e ao abrir o menu. Um salvamento por mundo e seed; abrir sem `?seed=` continua o
  último. Navegador sem armazenamento → o jogo segue e o menu avisa.
- **Menu** (☰): continuar, novo mundo, recomeçar este mundo; mostra a semente e o último salvamento; pausa o jogo.
- `game/save.ts`, `game/menu.ts`, `World.modifiedChunks/restoreChunk`. 2 testes novos (88).

## 0.26.1 — 2026-11-02
- **Arte final de combate** (pranchas fornecidas): ícones de Seda, Presa e Coração da Rainha; **folhas de morte** das
  três aranhas (8, 8 e 16 quadros: reação → colapso → fumaça), na mesma escala da caminhada. Substituem a arte
  provisória (a morte procedural fica só como reserva). Duração da morte por tipo (0,7 / 0,9 / 1,6 s); a sombra some
  junto. `extract-dungeon.py` ganhou `icons()` e `death()` (quadros pelos vãos entre colunas, franja colorida removida).

## 0.26.0 — 2026-11-02 (Fase 1 do plano — combate jogável)
- **Vida da heroína**: 5 corações, invencibilidade curta e recuo ao levar dano, regeneração fora de combate;
  derrotada, **renasce no início mantendo os itens**. Corações na HUD só quando importam.
- **Aranhas mordem** (½, 1 e 2 corações) e **perseguem pelos corredores** (mapa de distâncias por BFS na dungeon).
- **Morte dos monstros** com animação provisória e **espólios**: Seda, Presa e Coração da Rainha (contador na HUD).
- **Renascimento**: todas as aranhas voltam com o tempo (40 s / 60 s / Rainha 300 s), longe da heroína.
- **Entrada**: farol roxo na frente e seta na borda da tela; penumbra dentro do labirinto; vinheta de dano.
- Arte provisória (ícones SVG, corações vetoriais, morte procedural) até as pranchas finais. 5 testes novos (86).

## 0.25.0 — 2026-11-02 (Fase 0 do plano)
- **Arte separada por mundo** (ADR 0010): pacotes `render/art/principal.ts` e `santuario.ts`; o build de cada
  artefato só leva a arte do seu mundo. Sprites em WebP q84/alfa q85. **Mundo principal 3,84 → 2,63 MB; Santuário
  3,29 → 0,68 MB**; o build não avisa mais de tamanho.
- **`ActionController`** (`game/actionController.ts`): regras de ação por célula, toque/clique/segurar, porta,
  quebra e alvos para o render saíram do `Game` (611 → 290 linhas), sem mudar comportamento (regressão completa no
  navegador: arar, plantar, amassar, colocar, quebrar com mão e ferramenta, porta, alimentar, golpe, Santuário).
- Santuário republicado com o motor atual.

## Docs — 2026-11-02
- `NEXT_STEPS.md` reorganizado em **plano por fases** (panorama, fases 0–5, decisões pendentes, dependências
  externas, riscos); itens já feitos removidos (monstros, quebra mais rápida com ferramenta). Números atualizados
  em `CURRENT_STATE`/`ARCHITECTURE` (artefato 3,84 MB, render ~0,4 ms).

## 0.24.0 — 2026-11-02
- **Covil das Aranhas vira um labirinto procedural** (~9× maior: 96–108 × 66–78 blocos, tamanho pela seed):
  caminhos sinuosos (árvore "growing tree"), bifurcações, circuitos, becos sem saída, câmaras com bordas
  irregulares, corredores de 2–3 blocos com curvas, **uma única entrada** e a **câmara da Rainha** (~17×17) no
  ponto mais fundo, com **uma única passagem**. Validação de navegação na própria geração.
- Geração em etapas separadas: área (`dungeonSize/planDungeon`) → labirinto (`buildMaze`: só chão e paredes) →
  conteúdo (`decorateDungeon`: blocos, obstáculos nas câmaras, monstros proporcionais ao chão, ~39 na seed 42).
- Paredes = cubo de pedra escura da prancha (`DUNGEON_WALL`, 2 de altura no desenho, `textures.stackDraw`);
  montanhas só no anel externo. Chefe preso à câmara da Rainha.
- Testes da dungeon reescritos para as regras da spec (6 casos, 5 seeds). 81 testes.

## 0.23.0 — 2026-11-02
- **Primeira dungeon — Covil das Aranhas** (mundo principal, a ~26–60 células do spawn): área 34 × 24 murada por
  montanhas com **uma única entrada** voltada para o spawn; chão de caverna (terra, musgo, teias, ossos); pedras,
  ninhos de ovos, cogumelos, espinhos e raízes como obstáculos que nunca bloqueiam o caminho.
- **Área protegida**: nada quebra, nada é colocado, arado, amassado ou plantado lá dentro — só combate.
- **Monstros**: 10 aranhas pequenas, 5 grandes e **1 Aranha Gigante (chefe, 14 golpes)**. Passeiam, perseguem a
  personagem dentro da dungeon e **nunca saem dela**. Espada/machado tiram vida (pisca, recua, barra de vida);
  sem vida, somem. Ainda não causam dano.
- Arte das 6 pranchas fornecidas via `scripts/extract-dungeon.py` (3 modos de recorte de fundo); sprites de cenário
  com variantes por célula; folhas de monstro em ciclo único (8 quadros) espelhadas para a direita.
- `world/dungeon.ts` (`buildDungeon/planDungeon/DungeonTerrain`), `World.isProtected/dungeon`, `game/monster.ts`,
  perfil `dungeon`, ADR 0009. 8 testes novos (79 no total).

## 0.22.0 — 2026-11-02
- **Porta só entre batentes de madeira**: as células da esquerda e da direita precisam de um cubo de madeira no
  nível 0 (Tora ou Piso de Carvalho; `World.hasDoorFrame`, por `BlockDef` cubo + `organic: 'wood'`).
- **Quebrar com ferramenta leva 1 s** (mão/item continua 2 s): `breakSeconds(tool)` em `world/items.ts` substitui
  `BREAK_HOLD_S` do `Game`. 2 testes novos (71 no total).

## 0.21.0 — 2026-11-02
- **Pilha de até 3 cubos** (`MAX_STACK` = 3): `Chunk.levels` (um array por nível), `World.getLevel/topBlock/
  stackHeight/placementLevel` genéricos; render, sombra e `pick()` iteram os níveis. A personagem sobe até o nível 3
  (1 por passo).
- **Porta de Carvalho** (prancha fornecida, 8 quadros): bloco de madeira na hotbar (16º espaço), altura de 3 frentes
  de cubo. Vai só no chão; nada empilha sobre ela. Toque (botão de ação/Espaço ou clique, com qualquer item) abre e
  fecha com animação; fechada bloqueia, aberta deixa passar; não fecha com alguém dentro. Estado no id
  (`OAK_DOOR`/`OAK_DOOR_OPEN`); machado/mão quebram, picareta não (madeira).
- Hotbar menor em celulares deitados ≤ 700 px para caber os 16 espaços. 3 testes novos (69 no total).

## 0.20.0 — 2026-11-02
- **Picareta**: toque toca a animação de minerar (folha fornecida); segurar 2 s quebra **qualquer bloco** (pedra,
  terra, areia, cubos e chão) e plantas — **destruídas sem drop** —, mas **não** madeira nem árvores; não ataca.
- Registro: `breaks: 'nonWood'`; toque curto de qualquer ferramenta com `swings` toca a animação (não só as de chão).
- `process-sprite.py --respace PAD`: corta cada coluna no vão vazio perto da divisa de linha (quadros que
  transbordam a grade para cima e para baixo). 3 testes novos (66 no total).

## 0.19.0 — 2026-11-02
- **Pá**: toque (animação de cavar, folha fornecida) em Terra, Terra com Grama ou Terra Arada livre → **Caminho de
  Terra** (`World.canFlatten/flatten`). Segurar 2 s cava **só blocos macios** (terra, grama, arada, caminho, areia —
  cubo ou chão, que vira buraco) e **plantas, destruídas sem drop**; não quebra pedra, madeira, árvore; não ataca.
- Registro de ferramentas: `breaks: 'soft'`, `destroysPlants`, `groundUse: 'till' | 'flatten'` (o `Game` não testa
  mais `=== 'hoe'`); `toolDrops(tool, id)` aplica a regra de drop. `BlockDef.soft` nos 5 materiais macios.
- Atores de ação derivados de `TOOLS[t].swings`. 5 testes novos (63 no total).

## 0.18.0 — 2026-11-02
- **Enxada quebra plantas e derivados** (capim, flor, trigo — colheita —, cacto) segurando 2 s, com a animação de
  arar repetindo; continua sem quebrar madeira/árvore/blocos e sem atacar.
- `BlockDef.choppable` substituído por `organic: 'wood' | 'plant' | null`; regras `breaks: 'organic'` (machado) e
  `'plant'` (enxada). Animação durante a quebra vale para qualquer ferramenta com ação que quebre algo.

## 0.17.0 — 2026-11-02
- **Enxada**: animação de arar (folha fornecida) a cada toque; só troca Terra/Terra com Grama → Terra Arada.
- **Restrição**: enxada não quebra blocos, itens nem elementos (`breaks: 'none'`) e não acerta entidades.
- Registro de ferramentas ganha `swings` (tem animação de ação) separado de `strikes` (acerta entidades).
- 2 testes novos.

## 0.16.0 — 2026-11-02
- **Machado**: toque = golpe com a folha fornecida (animais somem, como a espada); segurar 2 s corta só o que é de
  madeira, árvore ou planta, repetindo a animação de golpe enquanto corta.
- Restrição de quebra por ferramenta no registro (`TOOLS.breaks`, `toolCanBreak`) + `BlockDef.choppable` +
  `World.breakTargetId`. Golpe genérico por ferramenta (`Player.attackTool`, `ActorKind heroine-<tool>-attack`).
- 4 testes novos.

## 0.15.0 — 2026-11-02
- **Ataque com espada**: toque/clique (ou botão de ação/Espaço) com a espada = golpe com a folha de ataque
  fornecida; acerto no meio do golpe, num arco à frente. Animais atingidos somem (sem animação de morte ainda).
- **Restrição**: a espada não quebra blocos, itens nem elementos (segurar com a espada não faz nada).
- Anel vermelho marca a entidade que seria atingida. `Entities.strike/strikeTargets` preparado para monstros.
- `process-sprite.py --largest` (mantém o maior pedaço por quadro).
- 5 testes novos (duração/quadros/acerto único, direção fixa, arco, par desfeito, sprite de golpe).

## 0.14.0 — 2026-11-02
- Mundo principal: **enxada ativa** — toque/clique (ou botão de ação) em Terra/Terra com Grama → Terra Arada
  (`World.canTill/till`; enfeites em cima são removidos).
- **Semente de trigo só em Terra Arada** (antes: grama, terra ou arada).
- Novos sprites de crescimento do trigo (16 estágios, sem monte de terra), processados por
  `scripts/process-crop.py` com base do caule ancorada e escala comum.
- Testes de cultivo atualizados (arar antes de plantar; não ara areia/pedra/piso/buraco).

## 0.13.2 — 2026-11-02
- Deusa da Vida passa a **flutuar** em vez de caminhar (a caminhada travava): folha de flutuação 7×4 fornecida,
  quadros em vai-e-volta contínuo, pairando acima da sombra com balanço suave; câmera sem balanço.
- `SheetSpec.float` no render de atores (reutilizável para outros personagens voadores).
- Folha de caminhada da Deusa removida do jogo (mantida em `assets-src/` como referência).

## 0.13.1 — 2026-11-02
- Santuário: arte provisória dos 18 blocos celestiais substituída pela prancha 3/4 fornecida
  (`extract-blocks.py --celestial` → `celestial-atlas.webp` + ícones refeitos do cubo inteiro).
- Chão: blocos com desenho central não giram; nuvens sem giro/espelho e com contraste suavizado.
- `blockArt.ts` carrega os dois atlas; `celestialArt.ts` deixa de ter pintura procedural.

## 0.13.0 — 2026-11-02
- **Santuário Celestial da Deusa da Vida**: novo mundo com 10 chunks (5×2), chão todo de Nuvem Sólida, Deusa da Vida
  como única personagem e 18 blocos celestiais como únicos blocos de construção. Sem ferramentas, cultivo ou ovelhas.
- Perfis de mundo (`world/profiles.ts`, ADR 0008): terreno, limites, personagem, blocos e sistemas por mundo;
  seleção por `VITE_WORLD` → subdomínio `santuario.` → `?mundo=santuario`.
- `World` com limites (`VOID` fora, carregamento recortado, spawn central) e blocos permitidos por perfil.
- `FlatGenerator` + interface `TerrainSource`; bioma `celestial`; partículas douradas (`sparkle`); céu em degradê e
  orla de nuvem nas bordas do mundo.
- Arte: Deusa (folha transparente; `process-sprite.py --alpha --grid-offset-y`), 18 ícones da prancha
  (`scripts/slice-icons.py`), faces provisórias procedurais (`render/celestialArt.ts`), `composeCube` reutilizável.
- Artefato próprio do Santuário (`npm run build:artifact:santuario`); `build-artifact.mjs` aceita nome e título.
- 7 testes novos (perfis, limites, blocos permitidos, buraco, spawn, personagem, hotbar).

## 0.12.0 — 2026-11-02
**Desempenho**
- Gerador: uma avaliação de ruído por célula (`cellAt`) → gerar chunk 3,5× mais rápido (0,26 → 0,07 ms).
- `World`: chunks com chave numérica + cache do último chunk → leituras 1,4× mais rápidas.
- Assets em WebP (`scripts/optimize-assets.py`, ADR 0007): 3,4 → 1,1 MB; artefato 4,7 → 1,5 MB.
- `npm run bench` com benchmarks de geração e leitura.

**Correções**
- Zoom pelo teclado (Q/E) dependia da taxa de quadros; agora usa `dt`.
- Árvores podiam nascer sobre as trilhas de caminho de terra.
- `make-icons.py` lia o PNG antigo da heroína.
- Aviso de tamanho do bundle no build ajustado ao arquivo único (limite 1,8 MB, documentado).

**Documentação**
- `CLAUDE.md` (instruções para IA, armadilhas conhecidas) + `AGENTS.md`; `docs/README.md` (índice);
  `docs/MAPS.md` (módulos, frame, regras, ciclos, assets, "onde mexer para…").
- CURRENT_STATE, NEXT_STEPS, ARCHITECTURE (seção Desempenho), OPERATIONS, CONVENTIONS e DECISIONS
  reorganizados; conteúdo obsoleto removido dos domínios.

**Verificação**: sessão automatizada (3 seeds, desktop/celular, 120 ações aleatórias cada) sem erros.

## 0.11.1 — 2026-11-02
- Arte dos blocos trocada pela prancha 3/4 fornecida (`blocks-sheet-34.png`) após comparação no jogo com a extração
  da prancha isométrica: frente sem distorção, terra arada/pedra/piso mais legíveis, grama mais calma no chão.
- `extract-blocks.py`: modo 3/4 (padrão) por recorte direto; `--iso` mantém a prancha antiga; `--out` para testes.
- Ícones da hotbar refeitos a partir da prancha 3/4.

## 0.11.0 — 2026-11-01
- Blocos substituídos pelos 8 da prancha fornecida: Terra, Terra com Grama, Terra Arada, Caminho de Terra, Areia,
  Pedra, Tora de Carvalho, Piso de Carvalho. Removidos tijolos, tábuas antigas, arbustos, minérios, cristal,
  arenito, neve, gelo, musgo encantado, cogumelo e árvores encantada/pinheiro (com tundra e floresta encantada).
- Materiais com id único para chão e cubo; mundo gerado só com eles (+ água, árvores, cacto, enfeites, trigo).
- `scripts/extract-blocks.py`: prancha isométrica → atlas 3/4 (topo, frente, chão contínuo) + ícones.
- Trilhas naturais de caminho de terra; plantio também em terra arada.

## 0.10.0 — 2026-11-01
- Botão de ação (toque) com aro vazado: toque curto usa o selecionado no alvo à frente; segurar 2 s quebra.
  Ícone = espaço selecionado ou mão; anel de progresso no próprio botão. Espaço faz o mesmo no desktop.
- Alvo à frente da personagem parada com cantoneiras pulsantes; nenhum alvo ao andar.
- Mão vazia: tocar no espaço selecionado (ou Esc) solta; o jogo começa com a mão vazia.
- No toque, tocar direto no mundo não age mais (só o botão). Mouse inalterado.
- Regras de ação unificadas por célula (`canUseAt/canBreakAt/applyUse`) para cursor e botão.
- `setPointerCapture` defensivo no botão e no joystick.

## 0.9.0 — 2026-11-01
- Ferramentas como itens selecionáveis (`TOOLS`): espada, enxada, picareta, pá, machado, com ícones fornecidos.
- Equipar ao selecionar: heroína usa a folha da ferramenta ao andar (5 folhas fornecidas, normalizadas).
- Hotbar: ferramentas 1–5, semente 6, trigo 7, blocos depois. Joystick acima da hotbar em paisagem baixa.
- `process-sprite.py --rows-map` (reordenar/espelhar linhas) e altura do desenho no relatório.

## 0.8.0 — 2026-11-01
- Itens contáveis (`world/items.ts`): Semente de Trigo e Trigo; inventário, hotbar com contador, itens caídos com coleta.
- Trigo plantável na terra, 16 estágios de crescimento por tempo (`World.tick`), colheita com drops.
- Ovelhas comem trigo, formam par, namoram (animação fornecida) e têm filhote (sprite fornecido) que cresce.
- Desvio lateral das ovelhas ao contornar obstáculos a caminho do par.
- `process-sprite.py` com argumentos nomeados (`--cols/--rows/--region/--sat/--min/--frame-h`).
- `window.__game` exposto apenas em desenvolvimento para testes no navegador.

## 0.7.0 — 2026-11-01
- Jogo garantidamente horizontal em toque: tela cheia + `screen.orientation.lock('landscape')` no 1º gesto
  (repetido se o jogador sair), camada "Gire o aparelho" em retrato que pausa a entrada.
- PWA: `manifest.webmanifest` (fullscreen, landscape), ícones, metas iOS/Android, `viewport-fit=cover`.
- Layout compacto para paisagem com até 500 px de altura (hotbar e joystick menores).
- Correção: camada com `display: grid` ignorava `hidden` e capturava toques.

## 0.6.0 — 2026-11-01
- Primeiro NPC: ovelha (sprite fornecido, 4 direções × 4 quadros) com IA de pastar/passear e retorno a casa.
- `Walker`: base comum de movimento/colisão/altura extraída do `Player` (sem duplicar regra para NPCs).
- `Entities`: personagem + NPCs, colisão entre entidades, ocupação de células para colocar/cavar, rebanho inicial.
- Renderer desenha todos os atores com ordenação por profundidade; `character.ts` generalizado para folhas de atores.
- `process-sprite.py` aceita altura do quadro e limiares de fundo/sombra.

## 0.5.0 — 2026-11-01
- Tela limpa: removidos painel de informações, botões (Chunks/Modo/Tempo/Novo mundo), dica de nome e texto de
  ajuda. Fica só a hotbar; o joystick aparece apenas em telas de toque.
- Quebrar passa a exigir segurar 2 s sobre o alvo (rachaduras + anel); colocar é toque/clique curto. Removido o
  modo Quebrar/Colocar (tecla F) e a diferença entre botões do mouse.
- Novo mundo agora só via `?seed=` (sem botão).

## 0.4.0 — 2026-11-01
- Chão quebrável: quebrar célula vazia cria `HOLE` (não pisável por personagem/animais, não quebrável).
- Buraco só aceita cubo novo, que vira piso nivelado (pisável e empilhável); quebrar o piso reabre o buraco.
- Bloqueado cavar sob a personagem. Água continua inquebrável.
- Render de buraco (parede interna 3/4) e de piso de cubo.

## 0.3.0 — 2026-11-01
- Cubos empilháveis (máx. 2 por célula, `MAX_STACK`); quebrar remove o de cima.
- Personagem sobe 1 nível por vez (`STEP_HEIGHT`) e desce livremente; altura suavizada no sprite e na câmera;
  HUD mostra o nível.
- Montanhas geradas com 1–2 níveis (minério no cubo exposto).
- Correção: `AIR` herdava `shape: 'cube'` da fábrica de objetos.

## 0.2.0 — 2026-11-01
- **Vista superior inclinada (3/4)** substitui a vista lateral (ADR 0003): mundo com camadas chão/objeto,
  gerador 2D (elevação, rios, montanhas com minérios, florestas), cubos com face superior + frontal.
- **Personagem jogável** a partir da folha de sprites fornecida (`scripts/process-sprite.py` remove o fundo e
  uniformiza quadros), colisão, 4 direções e animação de caminhada.
- **Câmera** segue a posição lógica com suavização (sem balanço), zoom automático com personagem grande.
- **Joystick virtual** alinhado às direções da tela.
- Alcance de interação; spawn em bioma acolhedor; clima deslocado por seed.
- Removidos: céu/parallax lateral (`background.ts`), rocha-mãe, cavernas. Novos: `daycycle.ts`,
  `character.ts`, `player.ts`, `joystick.ts`, sombras de nuvens.

## 0.1.1 — 2026-11-01
- `npm run build:artifact`: build em arquivo único publicado como Artifact para teste no navegador.
- Canvas usa `100%` em vez de `100vw/100vh` (respeita a área segura do host).

## 0.1.0 — 2026-11-01
- Projeto criado (Vite + TypeScript, sem framework).
- Domínio `world`: PRNG/ruído com seed, registro de blocos, biomas, gerador puro, chunks 16×16, `World`
  com regras de quebrar/colocar e ciclo de vida de chunks. Testes Vitest.
- Domínio `render`: texturas procedurais estilo RPG/anime, cache offscreen por chunk, fundo parallax com
  ciclo dia/noite, brilhos, partículas por bioma.
- `game`: câmera, input (teclado/mouse/toque), HUD e hotbar.
- Documentação viva inicial (`docs/`) e ADRs 0001–0002.
