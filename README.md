# MundoBlocos 2D

Mundo 2D procedural, dividido em **chunks 16×16** no estilo Minecraft, com grade de blocos-cubo
pintados no estilo **ilustração digital moderna de fantasia (RPG/anime)**: cel-shading, contornos
coloridos, brilhos em estrela, céu com ciclo dia/noite, ilhas flutuantes e partículas por bioma.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173  (aceita ?seed=<número|texto>)
npm test           # testes do domínio world (Vitest)
npm run build      # typecheck + build estático em dist/
```

## Controles

| Ação | Entrada |
|---|---|
| Mover câmera | WASD / setas (Shift acelera) ou arrastar |
| Zoom | roda do mouse, Q / E |
| Quebrar / colocar | clique esquerdo / clique direito (F alterna o modo do clique esquerdo — útil no toque) |
| Escolher bloco | 1–9 ou clicar na hotbar |
| Bordas dos chunks | G |
| Avançar período do dia | T |

## Documentação

Comece por [`docs/PROJECT_CONTEXT.md`](docs/PROJECT_CONTEXT.md) e [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md).
Arquitetura em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); domínios em [`docs/domains/`](docs/domains/).
