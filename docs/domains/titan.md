# Domínio: Titã (mundo voxel solo, ADR 0039)

**Fonte de verdade:** `src/titan/` (`TitanVolume` = base + edições; `TitanGenerator` = base pura da seed). Briefing e especificações do dono do produto: pasta `mundoblocos-2d/titan` no Drive.

| Tema | Regra | Arquivo |
|---|---|---|
| Entrada | `?mundo=titan` (+ `&seed=42` de referência); sem `seed`: última partida salva ou sorteio na primeira visita | `main.ts`, `titan/session.ts` |
| Unidades | 1 bloco = 1 m; Y de −64 a 319 (24 seções de 16³); região de teste x/z em [−32, 32) (4 × 4 chunks) | `titan/voxel.ts` |
| Lago | última célula líquida Y = 63, superfície em 64; areia da chegada em Y = 64, pés em 65 | `titan/generator.ts` |
| Blocos | Areia ocre, Areia úmida, Rocha escura, Gelo fosco (colocáveis); Lago escuro (líquido), Rocha-mãe; **Lanterna** (id 7, objeto não sólido que emite luz) | `titan/voxel.ts` (`T`) |
| Itens | 8 ids = índice no atlas da hotbar + 1; pilhas de 64 (blocos, fragmentos) e 1 (cápsula, lanterna) | `titan/items.ts` |
| Inventário | hotbar 7 + mochila 24 (E) + grade 2 × 2 + saída; começa só com a cápsula; sem descarte; "Mochila cheia" preserva lasca e bloco | `titan/inventory.ts`, `titan/actions.ts` |
| Fragmentos | 3 lascas de rocha e 3 de gelo sobre as formações (ids `rock:0`…), recolhidas à mão (clique direito/Quebrar), 1 lasca = 1 fragmento; ids recolhidos vão no save | `titan/generator.ts` (`surfaceItems`), `titan/session.ts` |
| Lanterna | cápsula + fragmento de rocha + de gelo (qualquer posição); colocada no chão/parede, luz 15 −1 por célula, bloqueada por sólidos; recuperável; estado = posição (edição de chunk) | `titan/light.ts`, `titan/volume.ts`, `titan/mesher.ts` |
| Edição | esquerdo **coloca** na face apontada, direito **remove**; líquido é deslocado e volta ao remover o sólido; rocha-mãe e fora da região não editam | `titan/volume.ts` |
| Física | caixa 0,6 × 1,8 × 0,6; pulo de 1 bloco (não 2); líquido freia e flutua | `titan/physics.ts` |
| Save | IndexedDB `orvalis-titan` (`TITAN_SAVE_VERSION` 2): `games` (cabeçalho, jogador, **`inventory` = mochila + grade + fragmentos recolhidos**) + `chunks` (deltas, inclusive lanternas); uma transação; autosave 0,7 s após editar e 5 s de posição; **revisão por chunk e do inventário**: só a revisão confirmada fica limpa, o que muda durante a gravação continua pendente | `titan/save.ts`, `titan/session.ts` |
| Malha/visual | seção 16³, faces expostas, atlas `render/art/titan.ts` (WebP sem perdas), tarde fixa e névoa âmbar | `titan/mesher.ts`, `titan/sections.ts` (fila inicial: relevo + seções editadas), `render/titanRenderer.ts` |

**Gerador:** `GENERATOR_VERSION` 2 (formações só em terreno plano); a v1 segue disponível e idêntica para saves antigos. **Teste de luz:** `?hora=noite` baixa a luz ambiente (só para ver a lanterna).

**Verificações da entrega:** `titan/*.test.ts` (endereçamento nas bordas, determinismo, 20 seeds com chegada seca/clareira/percurso até lago e formações, bacia × praia, divisa de chunks, física,
mira, save/retomada/posição segura/falha de gravação/versão desconhecida, malha). **Perf:** não medida em celular real.
