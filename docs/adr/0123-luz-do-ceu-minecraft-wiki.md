# ADR 0123 — Luz do céu, pela Minecraft Wiki (auditoria #32), em três fases

**Status:** Fases 1 (v0.190.0) e 2 (v0.191.0) implementadas. Regra aprovada pelo dono do produto em 27/11/2026: luz do céu **nos dois mundos** (um motor só, sem `if (mundo)`), depois da Tocha (ADR 0121) e com a Fornalha/Carvão antes (ADR 0120/0122). Fase 3 em andamento.

## Wiki (página "Light")
Luz do céu 0–15: coluna aberta vale 15; desce **sem perder nível** por blocos transparentes e perde 1 a mais em blocos que filtram (folhas, água); bloco opaco barra; para os lados e para cima perde 1 por célula (inundação), então entra por janelas e portas e esmaece (14, 13…). **Não cai à noite**: o que escurece é o "nível interno" por hora e clima (15 ao meio-dia, 12 na chuva, 4 à meia-noite). A claridade final é o maior entre o céu (escurecido pela hora) e a luz de bloco; no escuro total, ~5 %.

## Fases
1. **Motor puro e API do volume (v0.190.0 — esta):** `titan/skylight.ts` (`SkyLight`: `compute` inteiro, `update` local por edição, `at`) e `TitanVolume.skyLight(x, y, z)` (lazy; atualiza por edição quando a classe da célula — opaco, filtro, transparente — muda). **Sem efeito visível**: nada o chama ainda além dos testes, então não custa nada em jogo.
2. **Desenho (v0.191.0 — feita):** o mesher guarda o nível do céu da célula vizinha de cada face num atributo `sky` (0–1); o shader passa a usar `max(céu × luz do dia, luz de bloco)` com piso de ~5 % (`patchDayLight`); `update` avisa as células cujo nível mudou para remalhar só as seções afetadas; instâncias (baú, tocha, porta…) leem o céu da própria célula.
3. **Ajuste e desempenho:** a hora e a chuva já vêm de `skyAt` (a luz do dia é o uniform `uAmbient`: 1 → 0,22 à noite, 0,8 na chuva); conferir mergulho (`underwater.ts`) para não escurecer duas vezes pela água; `npm run bench`; captura de tela de caverna, poço e cômodo nos dois mundos.

## Decisão da fase 1
- Classes por célula (`SkyKind`): **opaco** = `blocksLight` (cubo inteiro que não é folha, ADR 0119); **filtro** = folhas e `T.LAKE`; **transparente** = o resto (ar, tocha, laje, baú, porta…).
- O mundo gerado **não tem cavernas** (abaixo da primeira célula opaca tudo é sólido, salvo o que o jogador escavou): a conta inicial varre só o céu das colunas (de `topo + 24` para baixo, até o primeiro opaco) e as células editadas elevam o `scanTop`; o resto entra por inundação. Acima do `scanTop` vale 15 sem guardar; fora da região, 15 (o mar em volta).
- Grade `Uint8Array` do tamanho da região (6,3 MB na 128 × 128). `update` recalcula ±16 em x e z, da primeira célula opaca abaixo menos 16 até o topo, e re-propaga a luz de fora da caixa; o teste compara 200 edições aleatórias com a conta inteira.

## Decisão da fase 2 (v0.191.0)
- **Malha:** `MeshData.sky` (um número 0–1 por vértice = `skyLight` da célula que a face enxerga ÷ 15), atributo `sky` na geometria do terreno e do líquido (`toGeometry`); `Builder.face(…, sky)`.
- **Shader** (`patchDayLight`, opções `sky` e `instSky`): `cor = textura × (sombreado × max(luz do dia × céu^1,4, 5 %) + luz de bloco)`. A luz do dia segue sendo o uniform `uAmbient` (hora, chuva e mergulho — não mudou); o céu só diz **onde** ela chega. Piso de 5 % = o escuro total da Wiki; a luz de bloco (`vGlow`) soma por cima, então a lanterna, o braseiro, a fornalha e a tocha iluminam o escuro.
- **Remalha:** `SkyLight.update(x, y, z, onChange)` avisa as células cujo nível mudou e o volume marca só as seções delas (`markLightCell`, a mesma via da luz de bloco) — uma edição que fecha ou abre luz refaz poucas seções.
- **Instâncias** (mesa, baú, cama, braseiro, degrau, porta, tocha, mureta, cadeira…): atributo `iSky` por instância = o maior céu entre a célula e as 6 vizinhas; relido quando o céu muda (`modelVersion`).
- **Otimização do motor:** o resultado da varredura vertical fica guardado (`base`); `update` refaz só a coluna editada, copia o resto, e a inundação só olha o bloco quando o vizinho ainda pode subir de nível. Medido no Orvalis (seed 42): **primeira conta ~220 ms** (era ~540) e **~3 ms por edição** (~0,5 ms numa coluna sem bloco acima; era ~17 ms).

## Consequências e dívidas
A primeira conta (~220 ms) acontece de uma vez na primeira malha; a fase 3 avalia fazê-la progressiva. **Não usam o céu ainda** (ficam sob a luz do dia mesmo numa caverna): plantas (cultivo, junco, noz), itens soltos, animais, a mão e o jogador. O céu não conhece a `LAKE` rasa como filtro parcial nem a laje/degrau direcional da Wiki (passam em todas as direções). Sem mudança de gerador, de save nem de protocolo.
