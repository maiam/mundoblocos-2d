# MundoBlocos 2D

Mundo procedural em **vista superior inclinada (3/4)**, dividido em **chunks 16×16** no estilo Minecraft,
com grade de blocos-cubo pintados no estilo **ilustração digital moderna de fantasia (RPG/anime)** e uma
heroína jogável. Ciclo dia/noite, sombras de nuvens, brilhos mágicos e partículas por bioma.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173  (aceita ?seed=<número|texto>)
npm test           # testes do domínio world (Vitest)
npm run build      # typecheck + build estático em dist/
npm run build:artifact  # HTML de arquivo único em artifact/ (para Artifact/offline)
```

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
| Plantar semente de trigo (na terra) | semente selecionada + ação no chão à frente (ou clique) |
| Dar trigo à ovelha | trigo selecionado + ação com a ovelha à frente (ou clique nela) |
| Colher trigo | segurar a ação 2 s (itens caem e são coletados ao chegar perto) |
| Quebrar bloco ou cavar o chão | segurar o clique / dedo por 2 s sobre o alvo |
| Escolher na hotbar | 1–9, 0 ou tocar (1–5 ferramentas: equipa; 6 semente; 7 trigo; depois os 8 blocos) |
| Depuração (sem botão na tela) | G: bordas dos chunks · T: avançar período do dia · `?seed=` na URL |

## Documentação

Comece por [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) e [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md).
Arquitetura em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); domínios em [`docs/domains/`](docs/domains/).
