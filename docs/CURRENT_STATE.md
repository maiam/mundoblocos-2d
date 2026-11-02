# Estado atual

_Atualizado em 2026-11-02 — v0.13.2_

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
- Pilhas de até 2 cubos; quebrar a célula vazia cava o chão (buraco que só um bloco novo preenche, virando piso).

## Personagem e controles
- Heroína com sprite em 4 direções, ~2,2 células; sobe 1 nível por vez e desce livre; colide com água, buracos,
  árvores e outras entidades.
- Câmera sem rotação, zoom automático, acompanhamento suave sem o balanço da caminhada.
- Celular: joystick (esquerda) + **botão de ação** (direita): toque usa o item selecionado no alvo à frente,
  segurar 2 s quebra. Alvo com cantoneiras quando parada. Mão vazia ao tocar de novo no item.
- Desktop: WASD/setas, Espaço = botão de ação, mouse (clique coloca, segurar 2 s quebra), Q/E/roda = zoom.
- Sempre na horizontal: tela cheia + trava em paisagem quando o navegador permite; "Gire o aparelho" em retrato.
- Tela limpa: só a hotbar (ferramentas 1–5, semente 6, trigo 7, materiais 8–15).

## Sistemas
- **Ferramentas** (espada, enxada, picareta, pá, machado): equipam e mudam o sprite; ainda sem ação.
- **Cultivo**: semente na grama/terra/arada cresce em 16 estágios (~1,5 min); colheita solta trigo + sementes.
- **Inventário** de itens contáveis (começa com 5 sementes e 2 trigos); materiais são infinitos.
- **Ovelhas**: rebanho perto do spawn; pastam, comem trigo, namoram e têm filhotes que crescem (máx. 16).
- Ciclo dia/noite (8 min), sombras de nuvens, partículas por bioma.

## Limitações conhecidas
- Nada é salvo (edições, inventário, plantações, ovelhas).
- Ovelhas só nascem perto do spawn; não há animais em outros chunks.
- Santuário: subdomínio real ainda não hospedado (só artefato e `?mundo=`); chão de nuvem mostra leve repetição diagonal.
- Topo dos cubos esticado ~1,6× na vertical (arte desenhada achatada); materiais orientados repetem no chão.
- Sob a folha de trigo resta um filete claro da sombra original do desenho.
- iPhone/Safari no navegador não permite tela cheia nem trava de orientação (vale a camada de rotação ou a
  instalação na tela inicial); dentro do Artifact a tela cheia pode ser recusada.
- Sem pulo, queda com dano, água animada ou transições suaves entre tipos de chão.

## Qualidade e desempenho
- 47 testes (Vitest) passando; typecheck e build sem avisos.
- Sessão automatizada longa (3 seeds, desktop e celular, 120 ações aleatórias cada) sem erros.
- Geração de chunk ~0,07 ms; render ~0,5 ms/quadro (média, Chromium headless); artefatos ~2 MB cada (um bundle com a arte dos dois mundos).
- Publicados como Artifacts (mundo principal e Santuário): ver `OPERATIONS.md`.
