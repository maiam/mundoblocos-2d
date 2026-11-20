# ADR 0060 — Titã: Noz de Duna, comida e fome ligada (v0.117.0)

**Status:** Aceita. Contexto: pacote de arte e história do dono do produto (Drive: `01_Historia.md`, "O dono da enseada", planta low-poly/high-poly, atlas de 32 px). Continua a ADR 0059 (vida, ar e fome).

## Decisão
1. **Gerador v5** (`GENERATOR_VERSION` 5; partidas antigas seguem na versão delas): `nutPlants` = 6 plantas por seed, em colunas de areia, **seca ou úmida** (topo 64–66; medido em 21 seeds: ~86 % em seca e ~14 % em úmida) alcançáveis a pé, fora da clareira, das formações, da brasa e dos juncos: até 2 "seguras" a 7–16 blocos da chegada e uma **enseada** de até 4 a 26+ blocos. Terreno, brasa e juncos idênticos à v4. A toca e o animal (Farejador de Duna) entraram na ADR 0061.
2. **Item 16, Noz de Duna** (`items.ts`; `FOOD`/`foodOf`: +4 de fome, +2,4 de saturação, provisório). Ícone de 32 px **provisório** desenhado por `scripts/make-titan-noz-icone.py` (o pacote não trouxe o ícone); troque o PNG em `assets-src/titan/arte32/` e rode `make-titan-arte32.py`.
3. **Colheita** (`actions.ts` `collectNut`, id `nut:x,y,z`, mesmo fluxo do junco): 1 colheita = 4 nozes (tudo ou nada; mochila cheia não colhe). A planta continua no mundo **sem frutos** e rebrota em `NUT_REGROW_S` = 300 s de jogo ativo (`session.regrow`, `tickRegrow`; gravado em `header.regrow`, campo opcional, sem subir `TITAN_SAVE_VERSION`). Colhida, deixa de ser alvo da mira; construir na célula a remove do desenho.
4. **Comer** (`eatFromSlot`): tocar de novo no espaço escolhido, tecla **Q**, ou toque no mundo com a comida na mão. Fome cheia não gasta a noz ("Sem fome agora"). Som sintetizado (`playEat`).
5. **Fome ligada** (`HUNGER_ENABLED = true`): regra do Minecraft (ADR 0059). Exaustão provisória em `EXHAUSTION`: 0,1 por bloco andado, 0,2 por pulo, 0,05 por bloco quebrado. **A inanição não mata**: para em 1 ponto de vida (`STARVATION_FLOOR`, como a dificuldade normal). A barra de fome do HUD aparece.
6. **Desenho**: `scripts/extract-titan-noz.py` converte o GLB (3.008 triângulos) em `titan-noz-planta.json` (2.160, sempre) e `titan-noz-frutos.json` (848, só nas maduras) + atlas `titan-noz-atlas.webp` (144 × 36); duas `InstancedMesh` (`TitanRenderer.setNuts`), giro fixo pela posição (`nutTurn`), sem colisão.

## Consequências
- Pendências: calibrar fome por noz, rebrote e exaustão em jogo; ícone final; luz de lanterna sobre a planta (hoje só luz do dia); partida antiga não ganha plantas (só novas partidas na v5).
- Testes: `noz.test.ts` (+7), `vitals.test.ts`; as expectativas de versão atual foram para 5.
