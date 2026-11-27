# Orvalis

> Nome oficial do jogo (antes "MundoBlocos 2D"; o repositório segue `mundoblocos-2d`). Endereço (provisório):
> `https://orvalis.pensamentos.online` — publicar com `npm run pack:site` (ver `docs/OPERATIONS.md`).

Jogo de sobrevivência e construção em **blocos de 1 m, em primeira pessoa** (estilo Minecraft), no navegador. Dois mundos no mesmo motor voxel:
o **Orvalis 3D** (padrão: ilha de campos, bosques de sakura, rios e mar) e o **Titã** (costa de dunas e lago escuro, só por `?mundo=titan`).
Quebre blocos, fabrique ferramentas na Mesa, cultive, construa, durma e jogue com amigos nas salas cooperativas do Titã.
O Orvalis 2D/2.5D e o Santuário foram removidos na v0.183.0 (ADR 0115). Estado detalhado em [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md).

## Rodar

```bash
npm install
npm run dev             # http://localhost:5173  (Orvalis 3D; ?mundo=titan para o Titã; ?seed=<número|texto>)
npm test                # testes (Vitest)
npm run build           # typecheck + build estático em dist/
npm run pack:site       # site pronto para a Hostinger em orvalis-site.zip
npm run build:artifact  # página + imagens em artifact/ (Artifact com arquivos separados, ADR 0013)
npm run build:net       # pacote da sala do Titã para o servidor (orvalis-servidor)
```

## Mundos

| Mundo | Como abrir |
|---|---|
| Orvalis 3D (padrão) | `orvalis.pensamentos.online` (ou `?mundo=orvalis3d`) |
| Titã | `orvalis.pensamentos.online/?mundo=titan` |

Os itens de cada mundo são **diferentes e só servem nele** (ADR 0114).

## Controles

| Ação | Entrada |
|---|---|
| Andar, pular, correr | WASD, Espaço, Shift; no toque, joystick na tela |
| Olhar | mouse (clique para capturar) ou arrastar no toque |
| Colocar bloco | clique curto (toque curto) |
| Quebrar | segurar o clique (o tempo depende do bloco e da ferramenta certa) |
| Escolher o item | 1–9 ou roda do mouse |
| Bolsa, receitas e Mesa | E ou ☰ |
| Vista isométrica 2:1 | botão **Visão** (tecla V); girar a câmera com ⟲ ⟳ (Z/X) |
| Painel de desempenho | `?fps=1` |

## Documentação

- Índice e ordem de leitura: [`docs/README.md`](docs/README.md) · mapa de "onde mexer": [`docs/MAPS.md`](docs/MAPS.md)
- Instruções para agentes de IA: [`CLAUDE.md`](CLAUDE.md)
- Estado atual: [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) · próximos passos: [`docs/NEXT_STEPS.md`](docs/NEXT_STEPS.md)
- O 2.5D e o Santuário (históricos): [`docs/archive/2d/`](docs/archive/2d/)
