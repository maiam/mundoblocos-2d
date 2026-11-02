# MundoBlocos 2D

Mundo procedural em **vista superior inclinada (3/4)**, dividido em **chunks 16×16** no estilo Minecraft,
com blocos-cubo no estilo **ilustração digital moderna de fantasia (RPG/anime)**, uma heroína jogável com
ferramentas, cultivo de trigo e ovelhas que se reproduzem. Ciclo dia/noite, sombras de nuvens e partículas.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173  (aceita ?seed=<número|texto>)
npm test           # testes (Vitest)
npm run bench      # benchmarks de geração/leitura de chunks
npm run build      # typecheck + build estático em dist/
npm run build:artifact  # HTML de arquivo único em artifact/ (para Artifact/offline)
```

## Mundos

| Mundo | Como abrir | Jogável |
|---|---|---|
| MundoBlocos (principal) | domínio principal | [Artifact](https://claude.ai/artifact/FKYk57NzSCjDA4rQH2RgLn) |
| Santuário Celestial da Deusa da Vida | subdomínio `santuario.` ou `?mundo=santuario` | [Artifact](https://claude.ai/artifact/AMGLa2gvXUbqpvjCVWR4gb) |

## Celular

Jogado sempre na horizontal. O primeiro toque coloca em tela cheia e trava a orientação onde o navegador
permite; em retrato aparece "Gire o aparelho". Dá para instalar na tela inicial (abre em tela cheia, deitado).

## Controles

| Ação | Entrada |
|---|---|
| Andar | WASD / setas ou joystick na tela (direções da tela) |
| Zoom | roda do mouse, Q / E |
| Botão de ação (celular) / Espaço (desktop) | toque: usa o selecionado no bloco à frente · segurar 2 s: quebra |
| Soltar o item (mão vazia) | tocar de novo no espaço selecionado ou Esc |
| Colocar bloco com o mouse (alcance 4,5 células) | clique curto |
| Atacar (espada) | espada selecionada + ação/clique: golpe à frente (animais somem); não quebra nada |
| Machado | toque: golpe (como a espada) · segurar 2 s: corta só madeira, árvore ou planta |
| Enxada | toque: ara Terra/Terra com Grama → Terra Arada · segurar 2 s: quebra só plantas (capim, flor, trigo, cacto) |
| Plantar semente de trigo (só em Terra Arada) | semente selecionada + ação no chão à frente (ou clique) |
| Dar trigo à ovelha | trigo selecionado + ação com a ovelha à frente (ou clique nela) |
| Colher trigo | segurar a ação 2 s (itens caem e são coletados ao chegar perto) |
| Quebrar bloco ou cavar o chão | segurar o clique / dedo por 2 s sobre o alvo |
| Escolher na hotbar | 1–9, 0 ou tocar (1–5 ferramentas: equipa; 6 semente; 7 trigo; depois os 8 blocos) |
| Depuração (sem botão na tela) | G: bordas dos chunks · T: avançar período do dia · `?seed=` na URL |

## Documentação

- Índice e ordem de leitura: [`docs/README.md`](docs/README.md) · mapas do sistema: [`docs/MAPS.md`](docs/MAPS.md)
- Instruções para agentes de IA: [`CLAUDE.md`](CLAUDE.md)
- Estado atual: [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) · próximos passos: [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md)
