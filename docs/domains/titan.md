# Domínio: Titã (mundo voxel solo, ADR 0039)

**Fonte de verdade:** `src/titan/` (`TitanVolume` = base + edições; `TitanGenerator` = base pura da seed). Briefing e especificações do dono do produto: pasta `mundoblocos-2d/titan` no Drive.

| Tema | Regra | Arquivo |
|---|---|---|
| Entrada | `?mundo=titan` (+ `&seed=42` de referência); sem `seed`: última partida salva ou sorteio na primeira visita | `main.ts`, `titan/session.ts` |
| Unidades | 1 bloco = 1 m; Y de −64 a 319 (24 seções de 16³); região de teste x/z em [−32, 32) (4 × 4 chunks) | `titan/voxel.ts` |
| Lago | última célula líquida Y = 63, superfície em 64; areia da chegada em Y = 64, pés em 65 | `titan/generator.ts` |
| Blocos | Areia ocre, Areia úmida, Rocha escura, Gelo fosco (colocáveis); Lago escuro (líquido), Rocha-mãe; **Lanterna** (id 7, objeto não sólido que emite luz) | `titan/voxel.ts` (`T`) |
| Relógio e céu | dia de **20 min = 24 000 ticks** no ritmo do Minecraft (dia 10 min, pôr do sol 1 min 30 s, noite 7 min, nascer do sol 1 min 30 s; `DAY_SECONDS` = 1 200), hora = fração do dia em `session.time`, avança com o jogo ativo e para na tela de início e com a aba oculta; partidas novas e saves sem hora começam à tarde (tick 9 000 = 0,375); no save (`header.time`, ~10 s); manhã pêssego → tarde cobre/âmbar → noite carvão-violeta com cobre no horizonte; sol em ponto quando alto; névoa segue o horizonte; luz do dia = uniform do shader (mudar a hora refaz 0 seções) | `titan/sky.ts`, `render/titanRenderer.ts` (`setSky`, `patchDayLight`), `titan/titanGame.ts` |
| Hora de teste | `?hora=manha\|tarde\|crepusculo\|noite` (ticks 720, 9 000, 12 900 e 18 000) congela só a visualização; `?saturno=1` força o Saturno raro à vista; a hora do jogo segue correndo e é a gravada; sem o parâmetro volta a do save | `titan/sky.ts` (`parseHora`) |
| Itens | 13 ids = índice no atlas da hotbar (64 × 64) + 1: 1–4 blocos, 5–6 fragmentos, **7 cápsula (legada, id reservado)**, 8 lanterna, 9 Mesa de Trabalho, 10 Lente de Gelo, 11 Brasa de âmbar, 12 Junco de vidro, 13 Laje de rocha; pilhas de 64 (blocos, fragmentos, lente, brasa) e 1 (cápsula, lanterna, mesa) | `titan/items.ts` |
| Inventário | hotbar **9** + bolsa **27** (3 × 9; E ou ☰) + grade 3 × 3 única (ADR 0050); começa **vazio** (v4); sem descarte; "Mochila cheia" preserva lasca e bloco | `titan/inventory.ts`, `titan/actions.ts` |
| Fragmentos | 3 lascas de rocha e 3 de gelo sobre as formações (ids `rock:0`…), recolhidas à mão (segurar 0,35 s), 1 lasca = 1 fragmento; ids recolhidos vão no save | `titan/generator.ts` (`surfaceItems`), `titan/session.ts` |
| Lanterna | **2 fragmentos de rocha + lente de gelo + brasa de âmbar, na Mesa de Trabalho** (ADR 0045); colocada no chão/parede, luz 15 −1 por célula, bloqueada por sólidos; recuperável; estado = posição (edição de chunk) | `titan/light.ts`, `titan/volume.ts`, `titan/mesher.ts` |
| Edição | **clique/toque curto (< 200 ms) coloca** na face apontada, **segurar quebra** com rachaduras (areia 0,6 s, gelo 1,2 s, rocha 1,6 s; lanterna e lasca 0,35 s com anel), arrastar gira a câmera; só uma ação por pressão (soltar e pressionar de novo); o clique direito e os botões Colocar/Quebrar não existem mais; líquido é deslocado e volta ao remover o sólido; rocha-mãe e fora da região não editam | `titan/volume.ts`, `titan/gesture.ts` (gesto), `titan/breaking.ts` (tempos e estágios), `render/titanRenderer.ts` (`setCrack`) |
| Física | caixa 0,6 × 1,8 × 0,6; pulo de 1 bloco (não 2); líquido freia e flutua | `titan/physics.ts` |
| Save | IndexedDB `orvalis-titan` (`TITAN_SAVE_VERSION` 2): `games` (cabeçalho, jogador, **`inventory` = mochila + grade + fragmentos recolhidos**) + `chunks` (deltas, inclusive lanternas); uma transação; autosave 0,7 s após editar e 5 s de posição; **revisão por chunk e do inventário**: só a revisão confirmada fica limpa, o que muda durante a gravação continua pendente | `titan/save.ts`, `titan/session.ts` |
| Malha/visual | seção 16³, faces expostas, atlas `render/art/titan.ts` (WebP sem perdas), sombreado fixo por face (`col`) e brilho de lanterna (`glow`); a luz do dia é um uniform do shader | `titan/mesher.ts`, `titan/sections.ts` (fila inicial: relevo + seções editadas), `render/titanRenderer.ts` |

**Gerador:** `GENERATOR_VERSION` 2 (formações só em terreno plano); a v1 segue disponível e idêntica para saves antigos. **Teste de luz:** `?hora=noite` congela a visualização na noite (só para ver a lanterna).

**Verificações da entrega:** `titan/*.test.ts` (endereçamento nas bordas, determinismo, 20 seeds com chegada seca/clareira/percurso até lago e formações, bacia × praia, divisa de chunks, física,
mira, save/retomada/posição segura/falha de gravação/versão desconhecida, malha). **Perf:** não medida em celular real.

## Medição e roteiro de aceite da entrega 2 (v0.95.1)
**Como medir:** ver `OPERATIONS.md` § "Medir o Titã em aparelho real" (`?fps=1`, `?cena=lanternas`). Código: `titan/perf.ts` (`TitanPerf`), `titan/scene.ts` (cena e "editar sem parar"), `dev/perfHud.ts` (painel).

**Primeira medição (Chromium emulando celular em paisagem, GL por software, `cena=lanternas` com "editar sem parar"; não substitui o aparelho real):**

| Lanternas | CPU | `buildFrame` médio (malha de um quadro de edição) | `luz` médio | seções refeitas por edição | `draw` |
|---|---|---|---|---|---|
| 1 | 1× | 28 ms | 1,5 ms | ~28 | 0,25 ms |
| 1 | 4× mais lenta | 113 ms | 6,3 ms | ~28 | ~1,5 ms |
| 4 | 1× | 40 ms | 3,4 ms | ~37 | – |
| 12 | 1× | 45 ms | 5,4 ms | ~37 | 0,25 ms |
| 12 | 4× mais lenta | 204 ms | 27 ms | ~37 | 1,5 ms |

**Leitura (antes da v0.95.2):** o desenho e o envio à GPU são baratos (`draw` < 2 ms; `geo` < 1 ms). O custo está em **refazer malhas**: cada edição perto de uma lanterna invalida a caixa de ±15 blocos em volta dela (`TitanVolume.touchBox`), que atravessa ~27 a 37 seções (3 × 3 chunks × 3–4 camadas) a ~1 ms cada, **mesmo que a luz mude em poucas células**. A luz (BFS com `Map`) é a segunda parcela e cresce com o número de lanternas. Mover isso para worker tiraria o trabalho da thread principal, mas **não reduziria o trabalho**; o primeiro ganho é invalidar só as seções cuja luz (ou bloco) realmente mudou, comparando o mapa de luz antes e depois.

**Depois da luz incremental (v0.95.2, mesma cena e mesmo método):**

| Lanternas | CPU | `buildFrame` médio | `luz` médio | seções refeitas por edição | FPS estável (5% piores) |
|---|---|---|---|---|---|
| 1 | 1× | 3,4 ms (era 28) | 0,5 ms (era 1,5) | ~4 (era ~28) | 60 (60; era 53 e 29) |
| 1 | 4× mais lenta | 9,4 ms (era 113) | 2,0 ms (era 6,3) | ~4 | 53 (30; era 12 e 6) |
| 12 | 1× | 3,3 ms (era 45) | 0,3 ms (era 5,4) | ~3 | 60 (60; era 45 e 20) |
| 12 | 4× mais lenta | 12,3 ms (era 204) | 1,4 ms (era 27) | ~3 | 52 (28; era 5 e 4) |

(`buildFrame.max` de 150–600 ms é a geração inicial da região, nos primeiros quadros; o regime estável é o da tabela.) Nada disso substitui o aparelho real: confirmar com `?fps=1` no celular.

**Luz incremental** (`titan/light.ts`, ADR 0040 revisão): a luz é mantida entre as edições (`LightEngine`, 4 bits por célula em `LightStore`, 2 KB por seção) com **fila de remoção + fila de adição** (tirar uma lanterna perto de outra devolve a luz da outra), e **só as seções cuja luz realmente mudou** refazem a malha (mais as vizinhas quando a célula está na borda). A seção editada continua sendo refeita no mesmo quadro (`takeTouched`); as que só mudaram de luz vão para a fila com orçamento de tempo (`takeLightTouched` → `pending` do renderer). Teste de equivalência: depois de 400 edições aleatórias (blocos e lanternas) o mapa incremental é idêntico ao calculado do zero.

**Roteiro de aceite em celular real (paisagem), seed 42:**
1. Abrir `?mundo=titan&seed=42&fps=1`. Andar, mirar, editar blocos: anotar FPS e quadros lentos.
2. Coletar as lascas de rocha e gelo (segurar 0,35 s sobre cada uma), abrir a mochila por toque, **Receita da lanterna**, pegar a lanterna, movê-la para a hotbar.
3. Colocar a lanterna (toque curto) e **editar blocos perto dela** (colocar com toque curto, quebrar segurando): observar engasgos e ler `luz`/`malha`/`quadro+malha` no painel.
4. Esperar "salvo ✓", recarregar `?mundo=titan` sem `?seed=` e conferir inventário, lanterna e fragmentos já recolhidos; recuperar a lanterna.
5. Deixar o dia correr (20 min; o pôr do sol vem 2 min 30 s depois de começar) e comparar a luz da lanterna na tarde e na noite; `&hora=manha|tarde|noite` congela a visualização.
6. Repetir 3 com `?mundo=titan&cena=lanternas&n=12&fps=1` + "Editar sem parar" (pior caso). Andar uns 30 s e **tocar no painel pequeno do canto superior esquerdo**: o relatório abre na tela para **tirar print** (Atualizar, Copiar JSON, Fechar).

## Medições registradas
- **Emulador** (Chromium emulando celular em paisagem, CPU 4× mais lenta, cena de 12 lanternas com edição contínua): refazer malhas por edição **204 ms → 12,3 ms** com a luz incremental (v0.95.2); com o ciclo de céu rodando (v0.96.0) **12,9 ms**, 54 FPS estáveis.
- **iPhone real** (Safari, 932×320, seed 42, 19/11/2026): partida normal, 151 s: **60 FPS** estáveis, 5% piores 47,2, pior quadro 36 ms, 0,4% de quadros acima de 33 ms, 0% acima de 50 ms, malha de uma seção 0,7 ms. **Cena de 12 lanternas com "Editar sem parar", 62 s: 59,9 FPS**, 5% piores 37,7, **malha do quadro 3,0 ms** (validação em aparelho real da luz incremental), luz 0,13 ms, ~3 seções por quadro com malha. O Safari arredonda os tempos para 1 ms (p95 e máx ficam em 1) e não expõe a memória do JS.
- **Pico de 135 ms** (pior quadro da cena no iPhone, coerente com `buildFrame` máx 132 ms): 0% dos quadros acima de 50 ms, ou seja, um ou poucos quadros. **Causa em aberto** (geração inicial, toque no painel ou outro): registrar se aparecer de novo ao jogar.
- **Worker de malha: em espera.** Android de gama média ainda não testado.

## Gesto, rachaduras e verificação (v0.97.0, ADR 0042)
Máquina de estados em `titan/gesture.ts` (testes em `gesture.test.ts`: fronteira de 199/200 ms, quadro atrasado, arrasto, troca de alvo e de face, pressão mantida, falha por mochila cheia, segundo ponteiro, cancelamento externo). **Verificado em navegador** (Chromium emulando celular em paisagem com toque via CDP; mouse com ponteiro capturado e eventos sintéticos): toque curto de 80 ms coloca uma unidade; arrasto de 48 px gira a câmera sem agir; segurar areia mostra estágio 0 aos 200 ms, estágio 5 aos ~370 ms e conclui aos 600 ms com **uma** ação (areia +1); manter a pressão 1,5 s depois não quebra o bloco de baixo; soltar aos 380 ms cancela sem rachadura; **thread presa 320 ms entre o toque e a soltura não coloca**, e com 120 ms coloca; lanterna recolhida com o anel e sem rachaduras em 0,35 s; mochila cheia deixa a lanterna acesa com "Mochila cheia"; abrir a mochila no meio da quebra cancela; botão direito não quebra; um segundo dedo no botão Pular não afeta o gesto do primeiro.

## Lanterna 3D e mira (v0.98.0, ADR 0043)
- **Modelo:** pacote em `assets-src/titan/lanterna/` → `scripts/extract-titan-lantern.py` → `src/assets/titan-lantern.json` + `titan-lantern-atlas.webp` (sem perdas) → `render/art/titan.ts` (`titanLanternModel`, `titanLanternAtlasUrl`). 26 cuboides, 312 triângulos, 0,375 × 0,625 × 0,375 m, pivô no centro da base. Dois `InstancedMesh` (estrutura 300 tri, núcleo âmbar 12 tri): 2 chamadas para N lanternas; instâncias refeitas só quando `TitanVolume.lanternVersion` muda.
- **Luz:** mesmo shader do terreno; núcleo com `color = 0` e `glow` fixo (emite de dia e de noite), estrutura com sombreado por face. A lanterna **não está mais na malha do terreno** (`mesher.ts` a ignora).
- **Mira** (`titan/lantern.ts`, puro): raio × caixa do objeto; folga mouse 4 cm / toque 14 cm; fora da caixa o raio passa; contorno com o tamanho da caixa (`Hit.box`). Testes: `lantern.test.ts`.
- **Medição (emulador, cena 12 lanternas, antes → depois):** triângulos 12 938 → 16 538, chamadas 26 → 27, JS do desenho p95 1,2 → 1,2 ms. **Aparelho real: pendente.**

## Veios, drops e gerador v3 (v0.99.0, ADR 0044)
- **Veios:** `T.VEIN_ROCK` (8) e `T.VEIN_FROST` (9), tiles 8 e 9 do atlas 4 × 3 (`scripts/make-titan-veins.py`). Gerador v3: 3 veios por formação (centro + 2 vizinhos), sem lascas pré-posicionadas; v1/v2 inalteradas. Alcance a pé por BFS (`walkableFromArrival`) e afloramento de reserva (`outcropSpot`, `outcropFallback`): 9 em 1.000 seeds.
- **Quebra:** devolve o bloco inteiro e solta uma lasca (`actions.breakOrCollect` → `Drop` id `v:x,y,z`); mochila cheia = nada muda. Recolocar rocha/gelo põe o bloco comum, sem lasca.
- **Drops:** `TitanSession.drops`/`dropsRev`; `collectNearby` (1,25 m, uma a uma, "Mochila cheia" uma vez por aproximação); `visibleItems` = lascas legadas + drops (desenho); `TitanHeader.drops` (save v3) na mesma transação do inventário e dos chunks.
- **Seleção de texto:** `body.titan` com `user-select: none`, `-webkit-touch-callout: none` e `selectstart` cancelado (o jogo não tem campos de texto).
- Testes: `veins.test.ts`.

## Fabricação, Mesa de Trabalho, brasa e junco (v0.100.0, ADR 0045)
- **Catálogo** `titan/recipes.ts` (puro): mesa (4 rochas, mochila 2 × 2), lente (1 fragmento de gelo, mesa), lanterna (2 fragmentos de rocha + lente + brasa, mesa). `craft` valida estação, ingredientes e capacidade **depois do débito** e aplica tudo numa operação (`Inventory.tryCraft`); motivos `station | missing | full`. A grade 2 × 2 usa `matchGrid` (só receitas pessoais). A grade 3 × 3 da mesa não existe ainda (cartões diretos).
- **Mesa de Trabalho:** bloco `T.WORKBENCH` (10), modelo 3D em `InstancedMesh` (`render/titanRenderer.ts`, `syncWorkbenches`), `TitanVolume.workbenchCells()`. **Usar** (botão no toque, F no teclado) a ≤ 5 m; painel fecha se a mesa some ou sai do alcance. Receitas descobertas por estado (`discoverRecipes`; `header.recipes`).
- **Brasa e junco (gerador v4):** `T.EMBER` (11) no topo de uma coluna de areia úmida alcançável (`planEmber`); rende só a brasa (drop 11, `v:x,y,z`), não se recria. Juncos (`reedsFor`, `standingReeds`) são decoração fora do volume, instanciada e com balanço no shader. 1.000 seeds: sempre há depósito e juncos.
- **Migração (save v4):** cápsula → 1 brasa uma única vez (mochila e grade); partida de gerador antigo sem brasa ganha `grants.ember` (adição localizada em coluna intacta). Detalhes na ADR 0045 e testes em `fabricacao.test.ts`.
- **Medição:** só emulador e desktop; aparelho real pendente (cartões e área de toque do Usar em paisagem, brilho da brasa de dia, lanterna à noite).
- **Junco recolhível (v0.100.1):** alvo da mira como as lascas (`session.items.at` devolve `reed:x,y,z`), `collectItem` rende o item 12 sem quebrar o bloco de baixo; quebrar o apoio solta o item 12 como drop (`releaseReed`); o id vai em `collected` (não renasce).

## Laje de Rocha (v0.101.0, ADR 0046)
- `T.SLAB` (12) / item 13: meia altura (`blockHeight` 0,5), só de fundo; receita `laje` (3 rochas → 6 lajes, mesa). Quebra 1,0 s.
- **Física:** colisão por altura, pouso no topo (`landingY`), degrau automático de 0,5 m no chão (`STEP`); cubo inteiro a partir do piso barra; passa por baixo de lajes a ≥ 1,8 m. **Mira:** raio × caixa de meia altura (raio por cima segue). **Malha:** topo a y + 0,5, lateral 16 × 8 px do tile da rocha escura, `isFull` no culling.
- Testes: `slab.test.ts`. Medição: emulador/desktop; **aparelho real pendente**.

## Bolsa e livro de receitas (v0.102.0, ADR 0047)
- **Inventário:** 9 + 27 + grade 2 × 2 (36–39) + saída (40); `Inventory.fromData` migra `v: 1` (7 + 24) por seção; `TITAN_SAVE_VERSION` 5. Seleção até 8 (`HOTBAR - 1`).
- **Tela única** (`titanGame.ts`): grupos (a Bolsa por último) | grade de receitas (busca, Só fabricáveis) | grade de fabricação com ingredientes (tenho / preciso; 2 × 2 na bolsa, 3 × 3 na mesa) e o item final, que se toca para fabricar; no grupo Bolsa: os 27 espaços e a grade 2 × 2 de verdade. A mesa (Usar/F) abre a mesma tela com a estação ativa. `Recipe.group` define o grupo. Com a tela aberta o toque do mundo some (`titan-bag-open`).
- Testes: `inventory.test.ts` (migração por seção) e `fabricacao.test.ts` (save v4 → v5). Medição: emulador/desktop; **aparelho real pendente** (360 px de altura, rolagem da lista, teclado virtual na busca).

## Céu: bruma direcional, estrelas e Saturno (v0.103.0, ADR 0048)
- `titan/sky.ts` (puro) devolve, além das cores, a claridade direcional (`glowDir`/`glow`/`glowK`), o lado frio (`cool`/`coolK`), `haze`, `stars` e `tint` da luz ambiente; `horizonAt` dá a cor da bruma baixa por direção (a névoa e o fundo a seguem a cada giro); `saturnVisibility(day, frac, seed)` decide o Saturno raro (~12% dos dias, janela de ~10 s de dia).
- `render/titanSkyDome.ts`: shader da cúpula (degradê, halo, bruma, estrelas, Saturno); `TitanRenderer.setSky/setSaturn`. `session.days` no save (`header.days?`). Testes: `sky.test.ts`. Teste visual: mesma câmera, `?hora=manha|tarde|crepusculo|noite` olhando leste e oeste; `?saturno=1`.

## Bancada 3 × 3 e painéis de basalto (v0.104.0, ADR 0049)
- **Grade da mesa** (`inventory.ts`): `BENCH_START` 41–49, saída `BENCH_OUT` 50, separada da pessoal; `matchBench` (quantidades exatas, qualquer disposição), `takeBenchResult` (atômica), `returnBench` (devolve ao fechar; o que não couber fica na grade e no save). Inventário gravado `v: 3` com `bench`.
- **Interface** (`titanGame.ts`): grade 3 × 3 no grupo Bolsa (ADR 0050, sem exigir a Mesa; receita da Mesa sem a Mesa bloqueia a saída), `takeBench` revalida mesa e alcance a cada toque; prévia 3 × 3 com `previewCells`. Basalto por `--basalt` (`render/art/titan.ts` → `titanBasaltUrl`).
- Testes: `bench.test.ts`. Medição: emulador (740 × 360); **aparelho real pendente**.

