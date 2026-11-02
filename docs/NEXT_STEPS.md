# Plano e próximos passos

_Revisado em 2026-11-02 (v0.27.0 — Fases 0, 1 e 2 concluídas)._ Fonte única do que falta fazer. Itens concluídos saem daqui e vão para o
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
| Monstros: vida, golpe, mordida, busca de caminho, morte, espólios, renascimento | ✅ | arte final de morte e espólios |
| Vida da heroína, dano, morte e renascimento | ✅ | 5 corações; arte dos corações provisória |
| Salvar progresso | ✅ | automático no navegador (ADR 0011); nuvem depende do core |
| Menu | ✅ | continuar, novo mundo, recomeçar |
| Sons, música, vibração | ❌ | — |
| Qualidade | ✅ | 81 testes, typecheck limpo, bench, verificação no navegador a cada entrega |
| Peso dos artefatos | 🟡 | principal 2,87 MB (meta < 3 MB, alerta do build em ~3 MB), Santuário 0,69 MB |

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
1. **Decidir: materiais infinitos ou coletados.** Se coletados: blocos quebrados vão para o inventário, árvore solta
   Tora de Carvalho, colocar consome.
2. **Receitas** (tora → piso, trigo → pão, seda/presa/Coração da Rainha → ?), interface de criação simples.
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
| O que animais dropam (lã? carne?) | Fase 1 (pendência) |
| Porta cai sem batente? Fecha sozinha? | Fase 4 |
| Ações próprias da Deusa | Santuário |

## 4. Dependências externas
- **Core** (`core.maiamapps.com.br`): contas, mundos na nuvem, multiplayer (futuro).
- **Hospedagem** do build estático para o subdomínio `santuario.`.
- **Arte**: (opcional) corações da HUD, aranhas por direção e heroína levando dano, árvores/água 3/4, nuvem contínua.

## 5. Riscos e dívidas técnicas
- **Peso do artefato principal: 2,87 MB, sem folga** (meta < 3 MB; o alerta do build foi alinhado à meta). A próxima
  folha grande estoura. Alavancas, da menos à mais invasiva: (1) folhas da heroína com ferramenta (10 folhas, ~1 MB)
  virarem a heroína base + sprite da ferramenta sobreposto (decisão de arte); (2) servir os assets como arquivos
  separados fora do Artifact (hospedagem própria); (3) baixar a qualidade das folhas grandes.
- `ActionController` (465 linhas) vai crescer com vida/dano: separar combate (golpe, dano) em módulo próprio na Fase 1.
- Canvases do chão em 2× (`TEX_RES`) custam ~4 MB por chunk em cache; reduzir em celulares fracos se preciso.
- Monstros sempre atualizados (~39 no labirinto): ok hoje; com várias dungeons, atualizar só os próximos.
- Pipeline de brilho (`glowColor`) sem uso desde a remoção dos blocos mágicos (mantido para tochas/vaga-lumes).
- iPhone/Safari: sem tela cheia/trava de orientação no navegador (limitação da plataforma).
