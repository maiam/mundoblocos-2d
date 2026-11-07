# ADR 0022 — Escala visual e cena de escala (validação de sprites)

- **Status:** aceita (2026-11-07). Compromisso desta ADR: **Fase 1** (cena de escala), entregue junto. Fases 2–4 são
  evoluções futuras, a decidir depois de olhar a cena.
- **Pedido:** a equipe de produto propôs uma SPEC de escala visual e sprites; depois de revisão com o time técnico ela foi
  reduzida a esta decisão (sem unidade nova, sem contrato novo, sem ocupação genérica de várias células).

## Contexto

O mundo é uma grade de células de 32 × 32 px lógicos em chunks de 16 × 16. Personagens, animais, árvores, móveis e
construções têm desenho maior que a célula e já têm regras de escala, âncora e processamento espalhadas entre o código
(`SPECS` em `render/character.ts`, `TOWN_SIZES` em `world/town.ts`, `extract-town.py`) e os contratos de arte. Faltava
uma forma de **ver juntas**, no motor real, artes produzidas separadas, para pegar desproporção antes de integrar.

## Decisão

1. **Geometria preservada.** `TILE` 32, `CHUNK_SIZE` 16, `CUBE_FRONT` 18, `MAX_STACK` 3, `TEX_RES` 2 não mudam. A unidade
   de referência é a célula (múltiplos de `TILE`); **não se cria unidade nova** (nada de "UVR").
2. **Ocupação lógica ≠ desenho.** Posição, ocupação e colisão seguem `World`, `BlockDef`, `TownTerrain` e as entidades;
   imagem maior não aumenta a área lógica. Objetos de várias células são só os da cidade (`TOWN_SIZES`: id principal +
   células `TOWN_PART`; bancos 2×1 e 3×1 usam isso). **Esta ADR não cria ocupação multicélula genérica** para árvores,
   móveis ou itens construíveis.
3. **Escalas existentes são a referência.** Heroína = `TILE × 2,2` (`CHARACTER_H`); personagens, animais e monstros
   continuam nas tabelas atuais; nada é alterado automaticamente. Regra artística para filhotes: **≈ 0,7× o adulto**
   (hoje 0,69–0,72: potro, bezerro, cordeiro, pintinho), conferida em teste. O cavalo (1,6) fica como está, mas deve ser
   reavaliado visualmente **antes de montaria**, pois é mais baixo que o personagem (2,2).
4. **Sem terceiro contrato.** Continuam fontes de verdade `assets-src/personagens/CONTRATO.md`,
   `assets-src/ferramentas/CONTRATO.md`, `contrato.json` do chibi, manifestos e as tabelas TypeScript. Mudança de regra
   de arte vai ao contrato correspondente.
5. **Pipeline de arte preservado.** Texturas sempre na direção desenhada (nada gira nem espelha por célula); ordem
   canônica frente, esquerda, direita, costas — folhas que chegam em outra ordem são normalizadas com `--rows-map`;
   âncoras e alinhamento entre quadros preservados; fundo transparente; arte só por `render/art/<mundo>.ts`;
   scripts existentes de processamento e otimização.
6. **Profundidade preservada.** Ordenação pelo `y` da base/âncora (`Renderer.draw`); objeto alto passa da célula sem
   mudar de posição lógica. Dividir árvores ou construções em camadas (copa na frente/atrás) **não** faz parte desta
   decisão; só se o renderizador atual provar limitação.
7. **Orçamento de imagem.** Produzir acima da resolução final é bom, mas a exportação respeita o orçamento de início
   (< 3 MB, ADR 0013), com o resto sob demanda. Limites por categoria só com base em medição dos arquivos existentes;
   sem teto universal arbitrário.

## Fase 1 — cena de escala (entregue)

`http://localhost:5173/?escala=1` (**só em desenvolvimento**).

- **Renderizador real.** A cena não posiciona nem desenha por conta própria: ator = `Actor` comum desenhado pelo
  `Renderer`; objeto = bloco colocado no `World` (lotes da cidade com `TOWN_PART`, só as fileiras de frente
  bloqueadas, como `buildTown`). Só as marcações de depuração são desenhadas por cima.
- **Conteúdo** (`src/dev/scaleLayout.ts`, dados puros testados): Heroína, Herói, Hood, Gino; cavalo, potro, vaca, bezerro,
  ovelha, cordeiro, galinha, pintinho; aranhas pequena, grande e Rainha; baú, bancos 2×1 e 3×1, cubo, carvalho,
  macieira e uma casa 5×5 — sobre a grade de 32 px, com uma régua da altura do personagem (2,2 células).
  O chibi modular ainda não entrou na fila.
- **Marcações** (teclas): `G` grade · `A` âncoras (pés/base) e altura desenhada · `B` células bloqueadas (a colisão vem do
  mapa, `World.isWalkable`, não da imagem) e caixa de colisão do jogador · `L` nomes e alturas · `+`/`−` zoom · setas
  movem · `0` reenquadra. Células bloqueadas e lote são coisas diferentes: o quintal da casa é do lote mas andável.
- **Reproduzível.** Seed, câmera enquadrada pelo tamanho da tela, hora do dia (`0,5`, sem tinta), relógio de animação
  (parado) e `Math.random` (gerador fixo) são fixos; `window.__scaleScene.ready()` indica quando o chão terminou de
  desenhar. A captura de referência está em `docs/assets/escala-referencia.jpg` (viewport 1280 × 720).
- **Fora do build.** `main.ts` carrega a cena por `import()` dentro de `import.meta.env.DEV`; o build de produção não a
  contém (conferido: nenhuma string da cena em `dist/`).
- **Teste** (`src/dev/scaleLayout.test.ts`): tudo o que a cena pede existe no jogo, nada se sobrepõe e a regra do
  filhote (0,65–0,75× o adulto) vale.

## Evoluções futuras (sujeitas à avaliação depois da Fase 1)

- **Catálogo de escalas gerado do código**: importar as tabelas TypeScript (`SPECS`, `TOWN_SIZES`, `BlockDef`,
  manifestos); valores que vivem só em scripts Python (`PX_PER_CELL` de `extract-town.py` e `extract-interiors.py`)
  entram como "documentados à mão, com a origem" — sem extrator universal frágil e sem segundo cadastro editável.
  Campo indisponível aparece como "não documentado".
- **Validação automática no pipeline**: ampliar os relatórios dos scripts (tamanho final, altura do desenho, âncora,
  contato dos pés, peso). Só depois de as **tolerâncias estarem numéricas nos contratos** (hoje o contrato de
  personagens define escala fixa e contato dos pés, mas é preciso conferir os números).
- **Normalizar as razões de altura** (`297/288`, `313/288`… digitadas à mão em `character.ts`): calcular no
  processamento pela altura do **corpo** (não da caixa de recorte, que inclui ferramenta e efeito de ataque), mantendo o
  sistema atual até o resultado ser visualmente equivalente. O chibi segue sua escala fixa. **Não é a próxima prioridade
  automática:** primeiro ver o que a cena revela.
- Chibi modular e mais elementos na fila; capturas por script quando houver Playwright no projeto.

## Consequências

- Comparação visual reproduzível, sem prancha manual; desproporções aparecem antes de a arte entrar.
- Custo: uma cena de desenvolvimento a manter (pequena, usa as APIs reais).
- Não corrige sprites antigos; ajuste de arte existente continua caso a caso, com comparação visual.
