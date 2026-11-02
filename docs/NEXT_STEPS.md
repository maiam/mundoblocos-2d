# Plano e próximos passos

_Revisado em 2026-11-02 (v0.25.0 — Fase 0 concluída)._ Fonte única do que falta fazer. Itens concluídos saem daqui e vão para o
`CHANGELOG`; o que existe hoje está detalhado em `CURRENT_STATE.md`.

## 1. Panorama — o que temos

| Sistema | Estado | Observação |
|---|---|---|
| Mundo procedural em chunks 16×16, vista 3/4, biomas, água, montanhas | ✅ sólido | determinístico por seed, ~0,08 ms/chunk |
| Construção: 8 materiais, pilha de 3, buracos, porta de carvalho | ✅ | materiais **infinitos** (sem coleta) |
| Personagem: movimento, câmera, joystick, botão de ação, paisagem/tela cheia | ✅ | teste do botão no celular ainda em avaliação |
| Ferramentas (espada, enxada, picareta, pá, machado) com ação e restrições | ✅ | quebrar com ferramenta 1 s, mão 2 s |
| Cultivo de trigo + inventário de itens contáveis | ✅ básico | só uma cultura, sem receitas |
| Ovelhas: pastar, comer, namorar, filhotes | ✅ | só perto do spawn; espada as faz sumir |
| Santuário Celestial (perfil de mundo, Deusa flutuando, 18 blocos) | ✅ | subdomínio real não hospedado |
| Dungeon "Covil das Aranhas": labirinto procedural, área protegida, chefe | ✅ estrutura | **combate incompleto** (aranhas não causam dano) |
| Monstros: vida, golpe, recuo, barra de vida | 🟡 | sem dano, sem busca de caminho, sem morte/drops |
| Vida da personagem, dano, morte | ❌ | bloqueia o loop da dungeon |
| Salvar progresso | ❌ | nada persiste ao recarregar |
| Sons, música, vibração, menu | ❌ | — |
| Qualidade | ✅ | 81 testes, typecheck limpo, bench, verificação no navegador a cada entrega |
| Peso dos artefatos | ✅ | principal 2,63 MB, Santuário 0,68 MB (arte por mundo) |

## 2. Plano por fases

Cada fase fecha um ciclo jogável. A ordem respeita dependências; dentro da fase, a ordem é a sugerida.

### Fase 0 — Saúde do projeto ✅ (v0.25.0)
Arte separada por mundo (ADR 0010; 2,63 MB / 0,68 MB), `ActionController` extraído do `Game`, Santuário
republicado, PR da branch de trabalho para `main` aberto. Detalhes no `CHANGELOG`.

### Fase 1 — Combate jogável (fecha o loop da dungeon)
1. **Vida da personagem** + HUD mínimo (corações, discreto, respeitando a tela limpa) e **morte → renascer no
   spawn** (regra de perda a decidir).
2. **Dano dos monstros** por contato/mordida, com recuo e invencibilidade curta; valores por tipo em `MONSTERS`.
3. **Busca de caminho** (BFS no mapa lógico da dungeon) para as aranhas perseguirem pelos corredores.
4. **Morte de monstro com animação + drops** (seda, presas) → itens em `world/items.ts`; **recompensa do chefe**.
5. **Respawn** das aranhas com o tempo (o chefe só depois de um intervalo longo ou nunca — decidir).
6. **Marcador da entrada** (trilha/placa) e, depois, **minimapa** do labirinto explorado; luz mais escura e
   partículas próprias dentro da área.
7. Animais: animação de morte e drops (lã/carne?) usando o mesmo caminho da morte de monstro.
- Depende de **arte**: animação de morte/dano das aranhas; (opcional) aranhas nas 4 direções; ícones dos drops.

### Fase 2 — Persistência
1. **Salvar no navegador** (IndexedDB ou `localStorage`): seed, chunks modificados, inventário, plantações,
   ovelhas, estado da dungeon (monstros mortos, chefe derrotado). Versão do formato para migrações.
2. Menu recolhível: continuar, **novo mundo** (nova seed), apagar progresso.
- **Dependência externa:** contas e mundos na nuvem exigem endpoint no core (`core.maiamapps.com.br`) — **ajuste
  recomendado para o core**; nada de backend neste repositório.

### Fase 3 — Recursos e progressão
1. **Decidir: materiais infinitos ou coletados.** Se coletados: blocos quebrados vão para o inventário, árvore solta
   Tora de Carvalho, colocar consome.
2. **Receitas** (tora → piso, trigo → pão, seda → ?), interface de criação simples.
3. **Painel de inventário**: a hotbar (16 espaços) está no limite do celular deitado.
4. Tosar ovelha → lã; mais culturas; regar/adubar.

### Fase 4 — Mundo vivo e conteúdo
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

### Santuário Celestial (trilha paralela)
- Hospedar o build em `santuario.<domínio>` (**dependência externa**: hospedagem).
- Definir ações da Deusa e se flutuar tem efeito de jogo (passar sobre buracos, subir 2 níveis).
- (Arte) variação de nuvem feita para chão contínuo (elimina a repetição diagonal).

## 3. Decisões pendentes (do dono do produto)
| Decisão | Afeta |
|---|---|
| Materiais infinitos ou coletados? | Fase 3 inteira |
| O que acontece ao morrer (perde itens? volta ao spawn?) | Fase 1 |
| O que cada monstro/animal dropa; recompensa do chefe | Fase 1 |
| Chefe renasce? Aranhas renascem em quanto tempo? | Fase 1 |
| Porta cai sem batente? Fecha sozinha? | Fase 4 |
| Ações próprias da Deusa | Santuário |

## 4. Dependências externas
- **Core** (`core.maiamapps.com.br`): contas, mundos na nuvem, multiplayer (futuro).
- **Hospedagem** do build estático para o subdomínio `santuario.`.
- **Arte**: morte/dano das aranhas, drops, (opcional) aranhas por direção, árvores/água 3/4, nuvem contínua.

## 5. Riscos e dívidas técnicas
- Peso dos artefatos: resolvido por mundo (ADR 0010); o mundo principal (2,63 MB) volta a se aproximar do alerta
  (2,8 MB) com ~2 folhas novas — próxima alavanca: carregar arte da dungeon só ao se aproximar dela.
- `ActionController` (465 linhas) vai crescer com vida/dano: separar combate (golpe, dano) em módulo próprio na Fase 1.
- Canvases do chão em 2× (`TEX_RES`) custam ~4 MB por chunk em cache; reduzir em celulares fracos se preciso.
- Monstros sempre atualizados (~39 no labirinto): ok hoje; com várias dungeons, atualizar só os próximos.
- Pipeline de brilho (`glowColor`) sem uso desde a remoção dos blocos mágicos (mantido para tochas/vaga-lumes).
- iPhone/Safari: sem tela cheia/trava de orientação no navegador (limitação da plataforma).
