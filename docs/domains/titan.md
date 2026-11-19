# Domínio: Titã (mundo voxel solo, ADR 0039)

**Fonte de verdade:** `src/titan/` (`TitanVolume` = base + edições; `TitanGenerator` = base pura da seed). Briefing e especificações do dono do produto: pasta `mundoblocos-2d/titan` no Drive.

| Tema | Regra | Arquivo |
|---|---|---|
| Entrada | `?mundo=titan` (+ `&seed=42` de referência); sem `seed`: última partida salva ou sorteio na primeira visita | `main.ts`, `titan/session.ts` |
| Unidades | 1 bloco = 1 m; Y de −64 a 319 (24 seções de 16³); região de teste x/z em [−32, 32) (4 × 4 chunks) | `titan/voxel.ts` |
| Lago | última célula líquida Y = 63, superfície em 64; areia da chegada em Y = 64, pés em 65 | `titan/generator.ts` |
| Blocos | Areia ocre, Areia úmida, Rocha escura, Gelo fosco (colocáveis); Lago escuro (líquido), Rocha-mãe | `titan/voxel.ts` (`T`) |
| Edição | esquerdo **coloca** na face apontada, direito **remove**; líquido é deslocado e volta ao remover o sólido; rocha-mãe e fora da região não editam | `titan/volume.ts` |
| Física | caixa 0,6 × 1,8 × 0,6; pulo de 1 bloco (não 2); líquido freia e flutua | `titan/physics.ts` |
| Save | IndexedDB `orvalis-titan`: `games` (cabeçalho, jogador, `inventory` reservado) + `chunks` (deltas); uma transação; autosave 0,7 s após editar e 5 s de posição | `titan/save.ts`, `titan/session.ts` |
| Malha/visual | seção 16³, faces expostas, atlas `render/art/titan.ts` (WebP sem perdas), tarde fixa e névoa âmbar | `titan/mesher.ts`, `render/titanRenderer.ts` |

**Verificações da entrega:** `titan/*.test.ts` (endereçamento nas bordas, determinismo, 20 seeds com chegada seca/clareira/percurso até lago e formações, bacia × praia, divisa de chunks, física,
mira, save/retomada/posição segura/falha de gravação/versão desconhecida, malha). **Perf:** não medida em celular real.
