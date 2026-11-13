# ADR 0029 — Iluminação dinâmica e neblina escura (referência Core Keeper)

- **Status:** aceita; ligada por `?luz=` no Santuário (padrão: desligada) até o dono do produto decidir o clima padrão
- **Data:** 2026-11-13 (v0.93.19)
- **Relaciona:** ADR 0026 (Fase 3: "iluminação primeiro"), ADR 0028 (escala).

## Contexto
A cena de referência do Core Keeper tem luz dinâmica (poça de luz em volta do jogador e das lanternas) e neblina escura: o que está
longe da luz cai no preto. É o que mais diferencia o clima do nosso protótipo, claro e uniforme.

## Decisões
- **Sobreposição 2D, não luzes 3D:** depois da cena, o render desenha um retângulo de tela cheia com a escuridão ambiente e um
  "buraco" de luz por fonte (decaimento suave, leve tinta quente). Não mexe nas malhas nem na profundidade; custa um quadro cheio com
  um laço de até `MAX_LIGHTS` = 12 fontes e pode ser desligada sem efeito colateral. O HUD (DOM) fica por cima, sem escurecer.
- **Regras puras em `render/lighting.ts`:** que blocos emitem luz (`blockDef.glow`) e com que raio/cor/oscilação (`glowLightFor`),
  decaimento (`lightFalloff`), luz do jogador (`PLAYER_LIGHT`, raio 6,5), escolha das fontes por quadro (`pickLights`), oscilação do
  fogo determinística (`flickerFactor`, sem `Math.random`) e `?luz=` (`parseAmbient`). A camada Three está em `sanctuaryLighting.ts`.
- **`?luz=noite|penumbra|0..1`:** brilho ambiente (0 = escuridão total fora das luzes; 1 = desligada). Sem o parâmetro, nada muda.
- **Só na vista oblíqua** do Santuário por ora; o Mundo adota na migração do render (ADR 0026, Fase 4).
- **Fontes iniciais:** a Deusa e os blocos que brilham (Musgo Luminoso, Cristal da Vida, Bloco de Luz; no Mundo: fogueira, caldeirão
  e forno). Tochas e outras fontes entram como itens/blocos novos com `glow`.

## Consequências
- Atmosfera Core Keeper sem arte nova. A arte das paredes (e dos blocos) continua a mesma; a luz só escurece e tinge.
- Falta: ciclo dia/noite ligado ao `?luz=` (hoje o ambiente é fixo), sombras projetadas das paredes e árvores, luz que atravessa a
  porta e não o muro (oclusão das luzes pelas paredes), modo reduzido para aparelho fraco (tinta única sem laço) e medição de FPS em
  aparelho real.
