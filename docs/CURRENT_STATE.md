# Estado atual

_Atualizado em 2026-11-02 — v0.27.0_

## Mundos
- **Mundo principal** (detalhado abaixo) e **Santuário Celestial da Deusa da Vida**: 10 chunks (5×2) de Nuvem
  Sólida, só a Deusa, só os 18 blocos celestiais para construir, sem ferramentas/cultivo/ovelhas. Escolhido por
  subdomínio `santuario.`, `?mundo=santuario` ou artefato próprio. Blocos celestiais com a arte final
  (prancha 3/4). A Deusa **flutua** (7 quadros por direção, balanço suave) em vez de caminhar. Ver `domains/worlds.md`.

## Mundo principal
- Gerado por seed (`?seed=`), em chunks 16×16 nos dois eixos, carregados sob demanda e descarregados quando
  longe (chunks editados ficam em memória).
- Vista superior inclinada (3/4): chão + cubos com topo e frente; árvores altas; ordenação por profundidade.
- **8 materiais** (prancha 3/4 fornecida): Terra, Terra com Grama, Terra Arada, Caminho de Terra, Areia, Pedra,
  Tora de Carvalho, Piso de Carvalho. São os únicos blocos de construção e também o chão natural.
- Biomas: Campos (carvalhos), Bosque de Sakura (cerejeiras), Dunas (cactos). Água, rios, praias, montanhas de
  pedra com 1–2 níveis, trilhas de caminho de terra, pedregulhos, capim e flores.
- **Dungeon — Covil das Aranhas**: labirinto procedural (~100 × 72 blocos, muda com a seed) perto do spawn, com
  uma única entrada voltada para ele, câmaras, becos e circuitos; câmara da Rainha no ponto mais fundo, com uma só
  passagem. Nada quebra nem é colocado lá dentro. Aranhas pequenas e grandes em quantidade proporcional ao
  labirinto (~38) + Aranha Gigante (chefe, 14 golpes); perseguem pelos corredores, **mordem** e nunca saem; derrotadas
  soltam seda/presas (Rainha: Coração da Rainha) e renascem com o tempo. Farol + seta indicam a entrada.
- **Vida da heroína**: 5 corações, regeneração fora de combate; derrotada, renasce no início com os itens.
  Ver `domains/dungeon.md`.
- Pilhas de até **3 cubos**; quebrar a célula vazia cava o chão (buraco que só um bloco novo preenche, virando piso).

## Personagem e controles
- Heroína com sprite em 4 direções, ~2,2 células; sobe 1 nível por vez e desce livre; colide com água, buracos,
  árvores e outras entidades.
- Câmera sem rotação, zoom automático, acompanhamento suave sem o balanço da caminhada.
- Celular: joystick (esquerda) + **botão de ação** (direita): toque usa o item selecionado no alvo à frente,
  segurar quebra (2 s com a mão/item, **1 s com ferramenta**). Alvo com cantoneiras quando parada. Mão vazia ao tocar de novo no item.
- Desktop: WASD/setas, Espaço = botão de ação, mouse (clique coloca, segurar quebra: 2 s mão, 1 s ferramenta), Q/E/roda = zoom.
- Sempre na horizontal: tela cheia + trava em paisagem quando o navegador permite; "Gire o aparelho" em retrato.
- Tela limpa: só a hotbar (ferramentas 1–5, semente 6, trigo 7, materiais 8–15, porta 16).

## Sistemas
- **Ferramentas** (espada, enxada, picareta, pá, machado): equipam e mudam o sprite. A **enxada** ara (animação própria) Terra/Terra
  com Grama → Terra Arada e, segurando, quebra só plantas (não madeira/árvore); não ataca; a **espada** golpeia (animação própria) e faz sumir animais à frente — não quebra
  blocos, itens nem elementos; o **machado** também golpeia e, segurando, corta só madeira/árvore/planta; a **pá**
  (animação de cavar) amassa Terra/Grama/Arada → Caminho de Terra e, segurando, cava só blocos macios (terra, areia…)
  e destrói plantas **sem drop**; não ataca; a **picareta** (animação de minerar), segurando, quebra qualquer
  bloco e plantas (sem drop), menos madeira/árvore; não ataca.
- **Porta de Carvalho**: colocada no chão **entre dois blocos de madeira** (Tora/Piso de Carvalho à esquerda e à
  direita), 3 blocos de altura; toque abre/fecha com animação (qualquer item em
  mãos); fechada bloqueia, aberta deixa passar; não fecha com alguém dentro. Uma só orientação (de frente).
- **Cultivo**: semente **só na Terra Arada**; cresce em 16 estágios (~1,5 min, arte nova sem monte de terra);
  colheita solta trigo + sementes.
- **Inventário** de itens contáveis (começa com 5 sementes e 2 trigos); materiais são infinitos.
- **Ovelhas**: rebanho perto do spawn; pastam, comem trigo, namoram e têm filhotes que crescem (máx. 16).
- Ciclo dia/noite (8 min), sombras de nuvens, partículas por bioma.

## Salvamento
- **Automático no navegador** (a cada 10 s, ao esconder/sair): mapa editado, plantações, heroína, inventário,
  ovelhas, aranhas e hora do dia; um salvamento por mundo e seed. Menu ☰: continuar, novo mundo, recomeçar.
  Ver `domains/save.md`.

## Limitações conhecidas
- Salvamento só neste navegador/aparelho (nuvem depende do core); itens caídos no chão não são salvos.
- Animais atingidos pela espada só somem (sem animação de morte nem drops). Corações da HUD ainda vetoriais
  (provisórios); aranhas só com arte de frente. Espólios ainda sem uso (receitas).
- Ovelhas só nascem perto do spawn; não há animais em outros chunks.
- Santuário: subdomínio real ainda não hospedado (só artefato e `?mundo=`); chão de nuvem mostra leve repetição diagonal.
- Topo dos cubos esticado ~1,6× na vertical (arte desenhada achatada); materiais orientados repetem no chão.
- iPhone/Safari no navegador não permite tela cheia nem trava de orientação (vale a camada de rotação ou a
  instalação na tela inicial); dentro do Artifact a tela cheia pode ser recusada.
- Sem pulo, queda com dano, água animada ou transições suaves entre tipos de chão.

## Qualidade e desempenho
- 88 testes (Vitest) passando; typecheck limpo; build com 1 aviso intencional de tamanho do bundle.
- Sessão automatizada longa (3 seeds, desktop e celular, 120 ações aleatórias cada) sem erros.
- Geração de chunk ~0,08 ms; render ~0,4 ms/quadro (média, Chromium headless, inclusive dentro do labirinto).
- Artefatos com **só a arte do próprio mundo** (ADR 0010): principal **2,87 MB** (meta < 3 MB, sem folga),
  Santuário **0,69 MB**. Alerta do build alinhado à meta (~3 MB de HTML).
- Publicados como Artifacts (mundo principal e Santuário): ver `OPERATIONS.md`.
