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
| Colocar bloco (alcance 4,5 células) | clique / toque curto |
| Plantar semente de trigo (na terra) | semente selecionada + toque curto no chão |
| Dar trigo à ovelha | trigo selecionado + toque curto na ovelha |
| Colher trigo | segurar 2 s sobre a plantação (itens caem e são coletados ao chegar perto) |
| Quebrar bloco ou cavar o chão | segurar o clique / dedo por 2 s sobre o alvo |
| Escolher na hotbar | 1–9, 0 ou tocar (1–5 ferramentas: equipa; 6 semente; 7 trigo; depois blocos) |
| Depuração (sem botão na tela) | G: bordas dos chunks · T: avançar período do dia · `?seed=` na URL |

## Documentação

Comece por [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) e [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md).
Arquitetura em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); domínios em [`docs/domains/`](docs/domains/).
