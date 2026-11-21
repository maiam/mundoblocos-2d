# ADR 0086 — Titã: gerador v13, hastes secas só do cultivo e a primeira Noz sem guarda (v0.147.0)

**Status:** Aceita. Etapa 4 (última) da rodada "cultivo e oficina da Margem" (ADR 0083–0085). Mudar o gerador = nova `GENERATOR_VERSION`; partidas v1–v12 continuam como estavam.

## Decisão
1. **`GENERATOR_VERSION` 13.** Só mudam as **hastes secas avulsas** e a **lista de animais**; terreno, chegada, juncos, plantas de noz, toca, âmbar, cobre e abrigos são idênticos à v12 (testado em 8 seeds).
2. **Hastes secas:** de até 8 caem para as **2 mais próximas da chegada** (`dryReedsFor`: o mesmo cálculo da v12, ordenado por distância à chegada, desempate por x e z, `slice(0, 2)`). Duas hastes são o custo de uma Picareta de Rocha (3 fragmentos + 2 hastes), então a primeira ferramenta não espera o cultivo; as demais vêm do Junco Ressecado (ADR 0083). Os ids (`dry:x,y,z`) e a coleta não mudam.
3. **Primeira Noz sem guarda:** em `creatureSpecs` a planta de noz **mais próxima da chegada** (desempate pelo índice) não recebe Farejador pequeno nem grande; as outras plantas mantêm o pequeno (ids `p<i>` iguais aos da v12) e os grandes seguem a regra de distância. A primeira refeição é segura sem decisão de arte.
4. **Compatibilidade:** `generatorFor` aceita até 13; saves antigos abrem com a versão em que foram criados (v12 mantém 8 hastes e a planta guardada).

## Consequências
- Partidas novas começam com menos hastes no chão e uma Noz livre perto da chegada; o cultivo de junco passa a ser a fonte de Haste Seca.
- Pendências: calibrar o cultivo em jogo; ícones finais da Noz Torrada e da Esteira.
- Testes: `v13.test.ts` (+4: a v12 segue igual, 2 hastes mais próximas, planta livre sem guarda, planta livre sem grande); `cobre`, `generator` e `regiao` fixam a versão onde dependiam do desenho. Conferido no jogo (seed 42, v13): 2 hastes, 22 plantas, a mais próxima (10 m) sem Farejador.
