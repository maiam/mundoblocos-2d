# Domínio: Vila Camponesa (fase de arte — sem código no jogo ainda)

Área fixa no **Mundo principal**, ao sul da Cidade do Despertar, igual em toda seed, **protegida** como a cidade (nada quebra nem se coloca) e com o **chão em blocos do jogo + objetos em sprites** (decisões do dono do produto, 14/11/2026). A arte foi pintada por ele; o jogo desenha no código o que o mapa mostra, seguindo o padrão da cidade (`world/town.ts`: layout fixo + `TerrainSource` que o sobrepõe + proteção no `World`).

## Fonte de verdade (futura)
`world/village.ts` (layout) → `VillageTerrain` (sobreposição) → `World.inGuardedArea` (proteção). Arte: `assets-src/vila-camponesa/` → `render/art/principal.ts` + um mapa de arte como o `render/townArt.ts`. A sala (servidor) roda o mesmo `World`: mexe em `build:net` + `sync-net`.

## Material recebido (`assets-src/vila-camponesa/`)
- `mapa/`: `mapa-768.png` (48 × 48 células de 16 px = **a mesma grade do jogo**, `SUBDIV = 2`), `mapa-original-1254.png` e os 9 chunks 16 × 16 células (recompõem o mapa de 768 px sem diferença).
- `itens/`: **57 itens** com alfa real e o resíduo de cor das bordas limpo (o desenho opaco não foi alterado), nomeados `<chunk>-<nº>-<nome>.png`. Os originais das pranchas (identificada/transparente) ficam com o artista.
- `catalogo-bruto.json` (nome, tamanho em px, caixa útil) e `catalogo-medido-768.json` (correspondência automática com o mapa; **só confiável nos itens grandes**, ver abaixo).
- Os itens foram **redesenhados a partir do mapa, não recortados**: a escala varia de um para outro (cada um preenche a própria célula de 512 px), e o mapa é o árbitro das proporções.

## Leitura do mapa (48 × 48 células, origem no canto superior esquerdo; ±1 célula, medida a olho no mapa de 1254 px)
- **Muro de estacas** fechando os quatro lados (x 1–46, y 1–43, cantos arredondados) e **portão duplo** no centro do sul (x ≈ 20–29, y ≈ 42–43); fora do muro, ao sul, a estrada segue e há arbustos e pedras.
- **Estrada de terra** do portão até a praça do poço (centro, ≈ x 21–26, y 22–28), com ramais para as casas.
- **Seis casas**: palha em (9–17, 11–18), (32–40, 21–28), (10–19, 30–38); telhas em (31–38, 12–19), (6–15, 20–28), (29–37, 30–38).
- **Celeiro** (18–31, 3–11) com feno e carroça; **galinheiro cercado** (34–44, 3–11); **trigo** (3–9, 10–18); **horta** (39–45, 16–23).
- **Árvores** grandes em (2–11, 2–10), (23–31, 14–21), (2–10, 28–37), (38–46, 31–40) e pequenas em (3–8, 18–23), (40–46, 24–28); bancos, barris, toras, sacos, pedras e arbustos pelos cantos.

## Tamanhos propostos em células do jogo (sprite incl. telhado e fumaça; "bloqueia" = lote sólido na base)
| Objeto | Sprite (células) | Bloqueia | Notas |
|---|---|---|---|
| Casa de palha / de telhas | 9 × 10 | 8 × 5 na frente | medida: 8,5 × 9,5; 3 variantes de palha e 2 de telhas; porta voltada para a rua (sul) |
| Celeiro | 13 × 9 | 13 × 6 | com anexo aberto à direita |
| Poço | 5 × 6 | 4 × 4 | o anel de pedras (4 × 3) é chão decorativo, atrás do poço |
| Galinheiro (+ cerca de curral) | 5 × 5 | 4 × 3 | galinha e bebedouro são enfeites fixos (a galinha viva do jogo é outra) |
| Canteiro de trigo / horta cercada | 7 × 7 | cerca bloqueia, miolo não | enfeites fixos, não o sistema de cultivo |
| Carvalho grande / pequeno | 7–9 × 7–8 / 4–5 × 5 | tronco 1 × 1 | variantes de escala por posição |
| Banco | 2 × 1 | sim | |
| Barril, caixote, balde | 1,5 × 2 | sim | |
| Toras, feno, sacos, rochas, carroça | 2–4 × 2–3 | sim | |
| Poste com lampião | 2 × 4 | tronco 1 × 1 | luz à noite (reaproveitar o sistema dos postes da cidade) |
| Paliçada | segmentos de 6, 7 e 9 estacas ≈ 6, 7 e 9 células (passo de 1 célula) | sim | 6 + 6 + … fecha qualquer comprimento; cantos NO/NE/SO/SE vieram à parte |
| Portão (aberto e fechado) | 8 × 5 | fechado bloqueia | a cidade tem vão de 8 células |
| Arbustos, flores, capim, pedras de caminho | 1–3 × 1–2 | não | enfeites |

## Decisões abertas (do dono do produto)
1. **Portão**: interativo (alterna aberto/fechado, como as portas) ou sempre aberto? O fechado existe como arte, mas não há quadros intermediários.
2. **Variantes**: usar todas as variantes de casa e de árvore em rodízio (mais variedade) ou uma só de cada (mais coerência)?
3. **Posição exata** ao sul da cidade e **o que fica ao redor** (estrada, rebanho, dungeon): a cidade reserva o "campo do rebanho" (28 células ao sul do portão); a vila entra depois dele.

## Limitações conhecidas da arte
- Os itens não são recortes do mapa: o ladrilho do chão (grama, terra) não vem pronto e o chão do mapa tem manchas e sombras pintadas que o jogo não reproduz.
- A medição automática com o mapa só foi confiável para casas, celeiro, árvores grandes, poço, banco e carroça (correspondência ≥ 0,6); o resto foi estimado.
- Os cantos do norte da paliçada foram retocados pelo artista (sem o reflexo que tinham); a paliçada reta tem três larguras e a do norte, no mapa, é contínua.
