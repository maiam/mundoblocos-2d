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

## Controles

| Ação | Entrada |
|---|---|
| Andar | WASD / setas ou joystick na tela (direções da tela) |
| Zoom | roda do mouse, Q / E |
| Quebrar / colocar (alcance 4,5 células) | clique/toque / clique direito (F alterna o modo do clique/toque) |
| Escolher bloco | 1–9 ou clicar na hotbar |
| Bordas dos chunks | G |
| Avançar período do dia | T |

## Documentação

Comece por [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) e [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md).
Arquitetura em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); domínios em [`docs/domains/`](docs/domains/).
