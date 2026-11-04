# Orvalis

> Nome oficial do jogo (antes "MundoBlocos 2D"; o repositório segue `mundoblocos-2d`). Endereço (provisório):
> `https://orvalis.pensamentos.online` — publicar com `npm run pack:site` (ver `docs/OPERATIONS.md`).

Mundo procedural em **vista superior inclinada (3/4)**, dividido em **chunks 16×16** no estilo Minecraft,
com blocos-cubo no estilo **ilustração digital moderna de fantasia (RPG/anime)**, uma heroína jogável com
ferramentas, cultivo de trigo, ovelhas que se reproduzem, a Cidade do Despertar (cidade fortificada de partida, igual
em toda seed) e uma dungeon de aranhas com chefe. Ciclo dia/noite, sombras de nuvens e partículas.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173  (aceita ?seed=<número|texto>)
npm test           # testes (Vitest)
npm run bench      # benchmarks de geração/leitura de chunks
npm run build      # typecheck + build estático em dist/
npm run pack:site       # site pronto para a Hostinger em orvalis-site.zip
npm run build:artifact  # página + imagens em artifact/ (Artifact com arquivos separados, ADR 0013)
```

## Mundos

| Mundo | Como abrir | Jogável |
|---|---|---|
| Orvalis (principal) | `orvalis.pensamentos.online` | [Artifact](https://claude.ai/artifact/FKYk57NzSCjDA4rQH2RgLn) |
| Santuário Celestial da Deusa da Vida | `?mundo=santuario` (ou subdomínio `santuario.orvalis.pensamentos.online`) | [Artifact](https://claude.ai/artifact/AMGLa2gvXUbqpvjCVWR4gb) |

## Celular

Jogado sempre na horizontal. O primeiro toque coloca em tela cheia e trava a orientação onde o navegador
permite; em retrato aparece "Gire o aparelho". Dá para instalar na tela inicial (abre em tela cheia, deitado).

## Controles

| Ação | Entrada |
|---|---|
| Andar | WASD / setas ou joystick na tela (direções da tela) |
| Zoom | roda do mouse, Q / E |
| Tablet | joystick para andar; tocar no mundo usa o item, segurar quebra (como o mouse); sem botão de ação |
| Botão de ação (celular) / Espaço (desktop) | toque: usa o selecionado no bloco à frente · segurar: quebra (2 s com a mão, 1 s com ferramenta) |
| Soltar o item (mão vazia) | tocar de novo no espaço selecionado ou Esc |
| Colocar bloco com o mouse (alcance 4,5 células) | clique curto (empilha até 3 cubos) |
| Abrir/fechar Porta de Carvalho | ação com a porta à frente, ou clique nela (qualquer item em mãos) |
| Colocar Porta de Carvalho | só entre dois blocos de madeira (Tora ou Tábua de Carvalho) ou de Pedra, à esquerda e à direita |
| Dungeon (Covil das Aranhas) | labirinto murado perto do início, entrada voltada para você; a Rainha espera no fundo; lá dentro nada quebra — só luta |
| Atacar (espada) | espada selecionada + ação/clique: golpe à frente (animais somem; aranhas perdem vida); não quebra nada |
| Menu ☰ (canto superior direito) | continuar, novo mundo, recomeçar este mundo; o progresso é salvo sozinho a cada 10 s; **Jogar com amigos** (criar sala ou entrar com o código de convite, até 4 jogadores) |
| Vida | barra com número (100 no início; aparece na dungeon ou ferida); números de dano na tela; regenera fora de combate; ao cair, renasce na tenda ou na cidade, perdendo tudo menos as ferramentas |
| Machado | toque: golpe (como a espada) · segurar 1 s: corta só madeira, árvore ou planta |
| Enxada | toque: ara Terra/Terra com Grama → Terra Arada · segurar 1 s: quebra só plantas (capim, flor, trigo, cacto) |
| Picareta | segurar 1 s: quebra qualquer bloco e plantas (sem drop), menos madeira/árvore; não ataca |
| Pá | toque: Terra/Grama/Arada → Caminho de Terra · segurar 1 s: cava só terra/areia e destrói plantas sem drop; não ataca |
| Plantar semente de trigo (só em Terra Arada) | semente selecionada + ação no chão à frente (ou clique) |
| Dar trigo à ovelha | trigo selecionado + ação com a ovelha à frente (ou clique nela) |
| Colher trigo | segurar a ação 2 s (itens caem e são coletados ao chegar perto) |
| Quebrar bloco ou cavar o chão | segurar o clique / dedo sobre o alvo: 2 s com a mão/item, 1 s com ferramenta |
| Escolher na grade | 1–9 ou tocar (começa com ferramentas 1–5, semente 6, trigo 7) |
| Habilidades (receitas) | K ou tocar no 11º ícone: Construtor — Tábua, Porta e Tenda; tocar na receita cria |
| Tenda | criada nas receitas; colocada no chão vira o seu ponto de renascer (aviso na tela; vale a última) |
| Baú de Carvalho | 8 tábuas nas receitas; tocar nele abre 27 espaços — toque num item e no destino para guardar/pegar |
| Bolsa (inventário) | B ou I, ou tocar no 12º ícone: 18 espaços acima da grade (27 com a mão); toque num item e num espaço da grade para trocar |
| Água | não quebra; qualquer terra (Terra, Grama, Arada, Caminho), Pedra, Tora ou Tábua a substituem; cavar ao lado da água faz o buraco encher sozinho |
| Materiais | quebrar solta o bloco para coletar (árvore dá toras); colocar gasta; ao cair, perde tudo menos as ferramentas |
| Depuração (sem botão na tela) | G: bordas dos chunks · T: avançar período do dia · `?seed=` na URL |

## Documentação

- Índice e ordem de leitura: [`docs/README.md`](docs/README.md) · mapas do sistema: [`docs/MAPS.md`](docs/MAPS.md)
- Instruções para agentes de IA: [`CLAUDE.md`](CLAUDE.md)
- Estado atual: [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) · próximos passos: [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md)
