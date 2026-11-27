# ADR 0119 — Luz de bloco: só o cubo opaco bloqueia (auditoria #9, pela Minecraft Wiki)

**Status:** Aceita e implementada (v0.186.0). Proposta enviada ao dono do produto e aprovada em 27/11/2026 ("Prefiro manter a regra da wiki pra luz").

## Wiki (página "Light", edição Java)
Luz de bloco 0–15, −1 por bloco (distância pelos três eixos somados, por inundação); emissores: tocha 14, lanterna 15, fornalha acesa 13. Só bloco **opaco** bloqueia; folhas, água e gelo, baú, cama e porta deixam passar a luz de bloco (folhas, água e gelo só atenuam a luz do céu); laje e degrau têm opacidade direcional; a laje dupla bloqueia tudo.

## Decisão
- `blocksLight` (`titan/voxel.ts`) passa de "qualquer sólido menos o Painel" para **`isFull(id) && !isLeaves(id)`**: só o cubo opaco bloqueia. Folhas, baú, cama, porta, laje, degrau, mureta, cadeira, braseiro e Painel deixam a luz passar; a laje dupla (que é cubo) e a Pedra Lisa bloqueiam. A direcionalidade de laje e degrau da Wiki fica de fora (dívida): aqui passam em todas as direções.
- **Mantidos:** lanterna 15, braseiro aceso 13 (`lightLevelOf`), −1 por célula nas 6 vizinhas, o `LightEngine` incremental e os testes de equivalência com o cálculo completo.
- **Luz do céu (#32) fica de fora:** continua a luz do dia como uniform global do shader (cavernas e interiores iguais ao campo de dia). Depende de o Orvalis ter fonte de luz própria (Tocha, regra à parte) — o dono não decidiu abrir esse ciclo.

## Consequências
Uma lanterna passa a iluminar através das árvores e ao lado de baús, camas e portas; as seções vizinhas são refeitas ao editar esses blocos (o motor incremental já trata a mudança de bloco opaco). Sem mudança de gerador nem de save. Testes: `light.test.ts` (ids que bloqueiam e passagem da luz) e ajustes em `bau`, `braseiro3d` e `cama`.

## Arte de iluminação importada (sem uso no jogo)
Pacote P2-11 do Drive (262 PNGs de 16 × 16: tochas, lampiões, velas, lâmpadas, fontes naturais, fogueiras) em `assets-src/orvalis-voxel/iluminacao/`, registrado no catálogo como fila; a primeira entrega natural é a Tocha do Orvalis, que depende de regra de mundo própria.
