# Domínio: Vila Camponesa (v0.93.89: no jogo, primeira versão)

Área fixa no **Mundo principal**, ao sul da Cidade do Despertar, igual em toda seed, **protegida** como a cidade (nada quebra nem se coloca) e com o **chão em blocos do jogo + objetos em sprites** (decisões do dono do produto, 14/11/2026). A arte foi pintada por ele; o jogo desenha no código o que o mapa mostra, seguindo o padrão da cidade (`world/town.ts`: layout fixo + `TerrainSource` que o sobrepõe + proteção no `World`).

## Fonte de verdade
`world/village.ts` (`villageLayout()`, `VILLAGE_SIZES`, `VillageTerrain`) → `World.village`/`inGuardedArea` (proteção). Arte: `assets-src/vila-camponesa/` → `scripts/extract-village.py` → `src/assets/village-*.webp` → `render/townArt.ts` (`IMAGE_ART`) + `render/art/principal.ts`. Só existe com `SUBDIV = 2` (a vila foi desenhada nessa grade). A sala (servidor) roda o mesmo `World`: `build:net` + `sync-net`. Posição: canto NO em (−24, 72), logo depois do campo do rebanho da cidade (`TOWN_SOUTH_FIELD` + 16); portão no meio do lado sul; trilha de terra por fora do muro até a estrada da cidade.

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

## Decisões do dono do produto (14/11/2026)
1. **Portão: abre e fecha** (feito): toque em qualquer bloco dele troca os 8 juntos (`V_GATE`/`V_GATE_CLOSED` nos postes, `V_GATE_GAP`/`V_GATE_GAP_CLOSED` no vão); fechado bloqueia, aberto deixa passar; não fecha com alguém dentro; troca seca entre as duas artes e volta aberto ao recarregar.
2. **Variantes em rodízio** (feito): 3 casas de palha, 2 de telhas, 3 carvalhos, 2 árvores e 2 bancos, sorteados pela posição.
3. **Posição** ao sul da cidade, logo depois do campo do rebanho (28 células antigas ao sul do portão) + 16 células (feito).

## Limitações conhecidas da arte
- Os itens não são recortes do mapa: o ladrilho do chão (grama, terra) não vem pronto e o chão do mapa tem manchas e sombras pintadas que o jogo não reproduz.
- A medição automática com o mapa só foi confiável para casas, celeiro, árvores grandes, poço, banco e carroça (correspondência ≥ 0,6); o resto foi estimado.
- Os cantos do norte da paliçada foram retocados pelo artista (sem o reflexo que tinham); a paliçada reta tem três larguras e a do norte, no mapa, é contínua.

## Arte a pedir ao artista (se a primeira versão não ficar boa)
1. **Muro leste e oeste (peças laterais):** hoje uso uma estaca recortada do braço dos cantos do norte. Pedir um segmento **vertical** de paliçada, de 6 e de 7 estacas, com a face voltada para o espectador (as estacas vistas de frente, empilhadas) e a mesma altura de estaca da reta.
2. **Estacas em escala única:** a reta tem 6, 7 e 9 estacas em larguras diferentes; pedir um **único módulo** de 1 estaca (ou de 2) com largura exata de 1 célula, para emendar sem costura.
3. **Chão da vila:** ladrilhos repetíveis de **grama com manchas** e de **terra da estrada** (com bordas de transição para a grama), no estilo do mapa, para o chão não ficar tão liso quanto o do jogo.
4. **Portão:** os quadros intermediários de **abrir e fechar** (4 quadros) para o portão interativo, e a versão **sem a coluna**, se for só a folha.
5. **Casas:** porta e janelas em versões separadas (acesas à noite) e **o interior** de uma casa (cômodo) no padrão dos interiores existentes.
6. **Galinha:** a folha 4 × 4 de caminhada (como a galinha atual do jogo) no estilo da vila, para o galinheiro ter bichos vivos.
7. **Sombras:** as sombras projetadas ficaram fora das peças (regra do prompt); o jogo desenha as próprias.
