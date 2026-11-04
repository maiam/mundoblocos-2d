# ADR 0014 — Interiores das construções como cômodos isolados do mapa

**Status:** aceito (2026-11-04, v0.42.0). Primeiro caso: a Ferraria.

## Contexto
O dono do produto desenhou o interior da Ferraria (uma imagem em pé, vista de cima) e pediu que a heroína "entre" na
loja e encontre o ferreiro lá dentro. As construções da cidade são sprites sobre células bloqueadas (`TOWN_PART`), sem
espaço por dentro. Trocar o `World` inteiro por outro mundo ao entrar exigiria refazer Game, Entities, ActionController
e Renderer (todos leem o mesmo `World`). Também era preciso manter a colisão (`World.standHeight`, ADR 0004), as regras
de proteção e o salvamento sem mudanças de formato.

## Decisão
1. **Cômodo = região isolada do mesmo `World`**, em coordenadas fixas muito ao norte (`INTERIOR_ORIGIN` = (0, −100000),
   um cômodo a cada 64 células), fora de qualquer alcance a pé. Sobreposição pura (`InteriorTerrain`, a mais externa,
   depois de cidade e dungeon), igual em toda seed, que só altera o retângulo do cômodo + um anel de 2 células.
2. **Mapa lógico em `world/interiors.ts`** (`InteriorDef.map`): linhas de `#` (parede/móvel), `.` (chão) e `E` (capacho),
   desenhadas sobre a arte (a grade divide a imagem em partes iguais). Chão = Pedra Lisa; bloqueado = `TOWN_PART`
   (sólido, inquebrável). Toda a área é protegida (`World.isProtected`): nada quebra nem é colocado.
3. **Porta**: andar para cima na célula da rua diante da porta da construção (`TownBuilding.door`) leva para logo acima
   do capacho; pisar no capacho volta para a rua, virada para baixo (`Game.updateInteriors`/`moveTo`, com escurecer
   rápido). Regras de onde fica cada coisa em `World.interiorAt`/`interiorEntrance`.
4. **Render**: com a personagem num cômodo, o `Renderer` desenha só fundo escuro + a arte do cômodo + atores lá dentro
   (sem chão do mundo, céu, nuvens, noite nem partículas). A arte vem do pacote do mundo (`ArtPack.interiors`, ADR 0010)
   e carrega em segundo plano (fora do orçamento de início, ADR 0013).
5. **Morador do ofício** (`InteriorDef.keeper`): fica no cômodo e só anda nas linhas indicadas (ex.: atrás do balcão).
   Quem tem ofício conversa do outro lado do balcão (alcance maior).
6. **Salvamento sem mudança**: o cômodo não guarda estado; salvo lá dentro, ao carregar a personagem volta para a rua
   diante da porta.

## Consequências
- Interior novo = imagem em `assets-src/interiors/<id>.png` + `InteriorDef` (mapa, construção, morador) +
  `scripts/extract-interiors.py` (`--grid` mostra o mapa sobre a arte) + import em `render/art/principal.ts`.
- A personagem desenha sempre por cima da arte do cômodo (não passa "atrás" de móveis): o mapa bloqueia os móveis
  inteiros para os pés nunca ficarem sobre eles.
- Coordenadas muito grandes são exatas em ponto flutuante; a chave de chunk aguenta (|cy| < 2^20 chunks).
- Rejeitado: trocar o `World` ao entrar (refatoração grande, duas fontes de estado); interior como camada só visual
  (colisão e protegido duplicados fora do `World`).
