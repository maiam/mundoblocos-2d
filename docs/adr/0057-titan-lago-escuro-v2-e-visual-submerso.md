# ADR 0057 — Titã: Lago Escuro V2 (texturas de 32 px) e visual submerso

**Status:** aceito (dono do produto, 20/11/2026: doc 08 "Lago Escuro e construção da margem" e as seções "Aparência submersa" dos docs 03 e 04; pacote `Tita_Lago_Escuro_Arte_V2_32px.zip`). Primeira parte da proposta do lago; **sem** medidor de ar, dano nem receitas (ver Consequências).

## Decisão
1. **Textura do líquido** (`src/assets/titan-lago-32px.webp`, 128 × 32, gerado por `make-titan-arte32.py`): células 0 = topo quadro 1, 1 = topo quadro 2, 2 = lateral exposta, 3 = a mesma lateral. O líquido deixa de usar o atlas de terreno de 16 px e ganha textura própria (`Nearest`, sem mipmaps). A ondulação continua deslocando o UV em 1 célula (0,25) a cada 0,7 s: o topo alterna entre as células 0 e 1 e a lateral fica igual nas duas. Malha (`mesher.ts`): topo e base usam a célula 0; as laterais expostas ao ar usam a célula 2 inteira na face que encontra a superfície e **75 % de baixo** (sem a faixa clara) nas faces de baixo quando há líquido em cima (`LAKE_*_UV`). A face de cima do líquido é visível também **por baixo** (`DoubleSide`).
2. **Imersão pelos olhos** (`titan/underwater.ts`, pura): submerso = olho abaixo da superfície (Y = 64) **e** numa célula `T.LAKE` (passagem seca abaixo de 64 mantém o ar). `Body.inLiquid` (pés) segue só para a física. Estado: mistura 0–1 que entra e sai em ~150 ms e adaptação 0–1 que cresce em 2 s dentro d'água e zera ao emergir.
3. **Composição única** (`TitanRenderer.applyUnderwater`), depois do céu da hora: cor de fundo e da névoa mistura o céu com carvão-violeta (`#2B2742`); névoa linear com `near` 1 e `far` de 8 a 14 blocos pela adaptação; a luz **ambiente** do dia é multiplicada por `max(0,18, exp(−0,18 · profundidade))` (o brilho de lanterna, `glow`, fica de fora); cúpula do céu e sol somem ao mergulhar. Só cores e números: **nenhuma remalhagem** ao entrar e sair (conferido: 26 seções antes e depois).
4. **Véu da tela** (`.titan-veil`, DOM, primeiro filho da interface, `pointer-events: none`): gradiente carvão-violeta cuja opacidade é a mistura da imersão (`view.submersion`).

## Consequências
- **Ainda não feito** (propostas do doc 08): medidor de ar e perda de vida (o Titã não tem sistema de vida: decisão do dono), rota de saída garantida no gerador (mexer no terreno do lago sobe `GENERATOR_VERSION`), Marco de Margem e Painel de Junco com as receitas, afundar gradual e colisão do líquido.
- Valores (névoa, curva da luz, cor do véu) são propostas de teste do doc; os números estão em `underwater.ts` e no CSS.
