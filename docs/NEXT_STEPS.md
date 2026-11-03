# Plano e próximos passos

_Revisado em 2026-11-03 (v0.36.1 — Fases 0, 1 e 2 concluídas; Fase 3 em andamento)._ Fonte única do que falta fazer. Itens concluídos saem daqui e vão para o
`CHANGELOG`; o que existe hoje está detalhado em `CURRENT_STATE.md`.

## 1. Panorama — o que temos

| Sistema | Estado | Observação |
|---|---|---|
| Mundo procedural em chunks 16×16, vista 3/4, biomas, água, montanhas | ✅ sólido | determinístico por seed, ~0,08 ms/chunk |
| Construção: 15 materiais (8 pedras), pilha de 3, buracos, porta, tenda, baú | ✅ | materiais **coletados** (grade 9 + bolsa) |
| Personagem: movimento, câmera, joystick, botão de ação, paisagem/tela cheia | ✅ | teste do botão no celular ainda em avaliação |
| Ferramentas (espada, enxada, picareta, pá, machado) com ação e restrições | ✅ | quebrar com ferramenta 1 s, mão 2 s |
| Cultivo de trigo + inventário de itens contáveis | ✅ básico | só uma cultura, sem receitas |
| Ovelhas: pastar, comer, namorar, filhotes | ✅ | só no campo ao sul do portão; espada as faz sumir |
| Santuário Celestial (perfil de mundo, Deusa flutuando, 18 blocos) | ✅ | subdomínio real não hospedado |
| Cidade do Despertar (início fixo, muralha, ruas, construções) | ✅ estrutura | sem NPCs, interiores nem missões |
| Dungeon "Covil das Aranhas": labirinto procedural, área protegida, chefe | ✅ | fora da cidade; aranhas só com arte de frente |
| Monstros: vida, golpe, mordida, busca de caminho, morte, espólios, renascimento | ✅ | arte final de morte e espólios |
| Vida da heroína, dano, morte e renascimento | ✅ | 5 corações; arte dos corações provisória |
| Salvar progresso | ✅ | automático no navegador (ADR 0011); nuvem depende do core |
| Menu | ✅ | continuar, novo mundo, recomeçar |
| Sons, música, vibração | ❌ | — |
| Qualidade | ✅ | 117 testes, typecheck limpo, bench, verificação no navegador a cada entrega |
| Peso dos artefatos | ✅ | imagens em arquivos separados (ADR 0013): **início ~2,5 MB** (orçamento < 3 MB), dungeon em segundo plano; Santuário 0,7 MB |

## 2. Plano por fases

Cada fase fecha um ciclo jogável. A ordem respeita dependências; dentro da fase, a ordem é a sugerida.

### Fase 0 — Saúde do projeto ✅ (v0.25.0)
Arte separada por mundo (ADR 0010; 2,63 MB / 0,68 MB), `ActionController` extraído do `Game`, Santuário
republicado, PR da branch de trabalho para `main` aberto. Detalhes no `CHANGELOG`.

### Fase 1 — Combate jogável ✅ (v0.26.0)
Vida da heroína (5 ♥, renasce no início com os itens), mordida das aranhas, busca de caminho no labirinto, morte com
espólios (seda, presa, Coração da Rainha), renascimento de todas (Rainha em 5 min), farol + seta da entrada,
penumbra. Pendências que ficaram desta fase:
- **Arte**: ícones dos espólios e mortes das aranhas ✅ (v0.26.1). Faltam (opcionais): corações da HUD em arte
  própria (hoje vetoriais), heroína levando dano e aranhas nas 4 direções.
- **Minimapa** do labirinto explorado.
- **Animais**: animação de morte e drops (lã/carne? — decisão pendente).

### Fase 2 — Persistência ✅ (v0.27.0)
Salvamento automático no navegador (ADR 0011, `domains/save.md`) e menu ☰ (continuar, novo mundo, recomeçar).
Pendências: **contas e mundos na nuvem** exigem endpoint no core (`core.maiamapps.com.br`) — **ajuste recomendado
para o core**, nada de backend aqui; exportar/importar o salvamento como arquivo (troca de aparelho sem nuvem);
migrar para IndexedDB se os mundos editados passarem de ~5 MB.

### Fase 3 — Recursos e progressão
1. ✅ **Materiais coletados** (v0.28.0): quebrar devolve o bloco, árvore → toras, colocar gasta; grade 8 + bolsa;
   morte perde tudo menos as ferramentas.
2. ✅ **Receitas** (v0.31.0): Construtor — Tábua, Porta, Tenda (ponto de renascer). Próximas: mais profissões e
   receitas (trigo → pão? Coração da Rainha → ?), painel do **Personagem** (vida, armaduras — ícone já na grade).
3. ✅ **Painel de inventário** (bolsa no 9º espaço).
4. Tosar ovelha → lã; mais culturas; regar/adubar.
5. **Fonte das pedras sem receita** (Lisa, Polida, Rachada, Tijolo Rachado): receitas futuras ou **construções prontas**
   (ruínas/estruturas geradas pela seed — mudam o mapa; rodar os testes de determinismo). Decidir também se as
   variações substituem água (hoje só a Pedra Bruta; batente de porta já aceita todas).

### Fase 4 — Mundo vivo e conteúdo
0. **Cidade do Despertar — vida** (V1 entregue em v0.35.0, `domains/town.md`): NPCs que apresentam o mundo na praça
   inicial, moradores que circulam e voltam às casas, guardas na muralha/castelo, ferreiro de dia, hospedaria à
   noite (precisa de **folhas 4×4 de personagens** — dependência de arte); **arte da hospedaria, fonte, poço e barracas** (ainda pintados em código); interiores (guilda com quadro de missões,
   lojas com compra/venda, hospedaria como ponto de retorno opcional); lampiões acendendo ao anoitecer e
   movimento diminuindo. Opcional: trocar a arte pintada em código por pranchas.
1. Ovelhas (e novos animais) em outros chunks, por bioma, com limite.
2. **Mais dungeons**: generalizar `buildDungeon/decorateDungeon` por tema (arte + monstros + chefe), várias pelo mapa.
3. Porta: orientação lateral (quadro de lado), cair sem batente?, fechar sozinha?; atalho de teclado além do 9.
4. Sons e música opcionais, vibração no celular ao quebrar/acertar.
5. Botão de ação: mão vazia + toque colhe trigo maduro / faz carinho na ovelha; alvo pela diagonal do joystick.

### Fase 5 — Visual e polimento
1. Arte 3/4 para árvores, cacto e água no estilo da prancha; topo dos cubos menos achatado.
2. Transições suaves entre chãos (autotile), água animada, pontes.
3. Alturas: meio bloco/escadas; indicar borda de queda.
4. Geração em Web Worker só se o custo por chunk voltar a crescer.

### Fase 6 — Mundo de progressão (visão do dono do produto, `PROJECT_CONTEXT`)
Cidades e dungeons que acompanham a evolução dos personagens: Cidade 1 para novatos; cidades de nível mais alto mais
longe, onde os personagens passam a se concentrar. Passos sugeridos (ordem de dependência):
1. **Níveis e experiência** do personagem (o que dá XP: monstros, receitas, missões?) e o que o nível muda
   (vida, dano, acesso a regiões/receitas). Painel do Personagem mostra nível e XP.
2. **Faixa de nível** em dungeons e monstros (`MONSTERS` por faixa; dungeon generalizada por tema e nível — Fase 4.2).
3. **Mapa de regiões**: posições fixas das cidades (iguais em toda seed, como a Cidade 1) e das dungeons de cada
   faixa, distância crescente a partir da Cidade 1; terreno entre elas segue procedural.
4. **Cidade 2** (primeira cidade de nível intermediário) reutilizando o gerador da cidade com outra planta/tema.
5. **Viagem** entre cidades (estradas, marcos no mapa, talvez portais/carruagens desbloqueados por nível) e
   **renascer** na cidade da faixa do personagem (hoje: tenda ou Cidade 1).
6. Arte por região carregada **sob demanda** ao se aproximar (ADR 0013) — o mundo maior não pesa no início.

### Santuário Celestial (trilha paralela)
- Subdomínio `santuario.orvalis.pensamentos.online` na mesma pasta do jogo (opcional; passos em `OPERATIONS`).
- Definir ações da Deusa e se flutuar tem efeito de jogo (passar sobre buracos, subir 2 níveis).
- (Arte) variação de nuvem feita para chão contínuo (elimina a repetição diagonal).

## 3. Decisões pendentes (do dono do produto)
| Decisão | Afeta |
|---|---|
| Níveis: como se ganha XP, o que o nível muda, quantas faixas/cidades | Fase 6 |
| Mapa de regiões: onde ficam as próximas cidades, como se viaja entre elas, onde renasce | Fase 6 |
| O que animais dropam (lã? carne?) | Fase 1 (pendência) |
| Próximas profissões/receitas; uso do Coração da Rainha | Fase 3 |
| Cidade: NPCs (quem, falas), interiores, o que as lojas vendem, hospedaria como ponto de retorno | Fase 4 |
| Variações de pedra: fonte de Lisa/Polida/Rachada/Tijolo Rachado; substituem água? | Fase 3 |
| Painel do Personagem: o que mostrar (vida, armaduras, …) | Fase 3/4 |
| Limite de pilha (bolsa já tem 18 espaços; pilhas sem limite) | Fase 3 |
| Porta cai sem batente? Fecha sozinha? | Fase 4 |
| Ações próprias da Deusa | Santuário |

## 4. Dependências externas
- **Core** (`core.maiamapps.com.br`): contas, mundos na nuvem, multiplayer (futuro).
- **Hospedagem**: `orvalis.pensamentos.online` na Hostinger (provisório; passos em `OPERATIONS`, feito pelo dono do
  produto no hPanel com o `orvalis-site.zip`). Voltar a `maiamapps.com.br` quando possível.
- **Arte**: folhas 4×4 de NPCs da cidade (moradores, guardas, ferreiro, mercadores); (opcional) corações da HUD, aranhas por direção e heroína levando dano, árvores/água 3/4, nuvem contínua.

## 5. Riscos e dívidas técnicas
- **Orçamento de início (ADR 0013)**: hoje ~2,5 MB de 3 MB. Próximos a ir para segundo plano quando crescer: folhas da
  heroína com ferramenta (~1 MB, carregar ao equipar) e arte de cidades/dungeons novas (carregar ao se aproximar).
  Hospedagem própria (CDN/domínio) usa o mesmo `dist/`.
- `ActionController` (465 linhas) vai crescer com vida/dano: separar combate (golpe, dano) em módulo próprio na Fase 1.
- Canvases do chão em 2× (`TEX_RES`) custam ~4 MB por chunk em cache; reduzir em celulares fracos se preciso.
- Monstros sempre atualizados (~39 no labirinto): ok hoje; com várias dungeons, atualizar só os próximos.
- Pipeline de brilho (`glowColor`) sem uso desde a remoção dos blocos mágicos (mantido para tochas/vaga-lumes).
- iPhone/Safari: sem tela cheia/trava de orientação no navegador (limitação da plataforma).
