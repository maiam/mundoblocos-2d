# ADR 0123 — Luz do céu, pela Minecraft Wiki (auditoria #32), em três fases

**Status:** Fase 1 implementada (v0.190.0). Regra aprovada pelo dono do produto em 27/11/2026: luz do céu **nos dois mundos** (um motor só, sem `if (mundo)`), depois da Tocha (ADR 0121) e com a Fornalha/Carvão antes (ADR 0120/0122). Fases 2 e 3 em andamento.

## Wiki (página "Light")
Luz do céu 0–15: coluna aberta vale 15; desce **sem perder nível** por blocos transparentes e perde 1 a mais em blocos que filtram (folhas, água); bloco opaco barra; para os lados e para cima perde 1 por célula (inundação), então entra por janelas e portas e esmaece (14, 13…). **Não cai à noite**: o que escurece é o "nível interno" por hora e clima (15 ao meio-dia, 12 na chuva, 4 à meia-noite). A claridade final é o maior entre o céu (escurecido pela hora) e a luz de bloco; no escuro total, ~5 %.

## Fases
1. **Motor puro e API do volume (v0.190.0 — esta):** `titan/skylight.ts` (`SkyLight`: `compute` inteiro, `update` local por edição, `at`) e `TitanVolume.skyLight(x, y, z)` (lazy; atualiza por edição quando a classe da célula — opaco, filtro, transparente — muda). **Sem efeito visível**: nada o chama ainda além dos testes, então não custa nada em jogo.
2. **Desenho:** o mesher guarda o nível do céu da célula vizinha de cada face num atributo `sky` (0–1); o shader passa a usar `max(céu × luz do dia, luz de bloco)` com piso de ~5 % (`patchDayLight`); `update` avisa as células cujo nível mudou para remalhar só as seções afetadas; instâncias (baú, tocha, porta…) leem o céu da própria célula.
3. **Ajuste e desempenho:** a hora e a chuva já vêm de `skyAt` (a luz do dia é o uniform `uAmbient`: 1 → 0,22 à noite, 0,8 na chuva); conferir mergulho (`underwater.ts`) para não escurecer duas vezes pela água; `npm run bench`; captura de tela de caverna, poço e cômodo nos dois mundos.

## Decisão da fase 1
- Classes por célula (`SkyKind`): **opaco** = `blocksLight` (cubo inteiro que não é folha, ADR 0119); **filtro** = folhas e `T.LAKE`; **transparente** = o resto (ar, tocha, laje, baú, porta…).
- O mundo gerado **não tem cavernas** (abaixo da primeira célula opaca tudo é sólido, salvo o que o jogador escavou): a conta inicial varre só o céu das colunas (de `topo + 24` para baixo, até o primeiro opaco) e as células editadas elevam o `scanTop`; o resto entra por inundação. Acima do `scanTop` vale 15 sem guardar; fora da região, 15 (o mar em volta).
- Grade `Uint8Array` do tamanho da região (6,3 MB na 128 × 128). `update` recalcula ±16 em x e z, da primeira célula opaca abaixo menos 16 até o topo, e re-propaga a luz de fora da caixa; o teste compara 200 edições aleatórias com a conta inteira.

## Consequências e dívidas
Medido (Orvalis, seed 42): primeira conta ~540 ms (inclui aquecer a coluna do gerador) e ~17 ms por edição — alto para marteladas seguidas; a fase 2/3 otimiza (pular edições sem efeito, varrer só o necessário) e faz a primeira conta progressiva. O céu não conhece a `LAKE` rasa como filtro parcial nem a laje/degrau direcional da Wiki (passam em todas as direções). Sem mudança de gerador, de save nem de protocolo.
