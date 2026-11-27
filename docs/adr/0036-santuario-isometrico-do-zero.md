# ADR 0036 — Santuário isométrico refeito do zero

> **Removida (ADR 0115, etapa 2, v0.182.0):** o Santuário saiu do produto por decisão do dono do produto. Este registro fica só como histórico.

**Status:** aceito (dono do produto, 17/11/2026). **Substitui parcialmente** os ADR 0026 (renderer próprio do Santuário), 0027 (paredes autotile do Santuário) e 0028 (escala do Santuário).

## Contexto
O Mundo principal continua em vista 3/4. O dono do produto quer **testar a vista isométrica** e não gostou do resultado com a arte e o mapa do Mundo (a câmera "Isométrica" da Sala 2 é só uma câmera sobre conteúdo feito em 3/4). O Santuário Celestial antigo (nuvem plana, 18 blocos celestiais, renderer e laboratório de câmera próprios) é legado experimental.

## Decisão
1. O Mundo principal **não muda**.
2. O Santuário é **limpo e recomeçado**: perfil novo, **solo/local** (sem servidor por ora), **terreno plano vazio**, câmera **isométrica** (45° / 35,264°) sobre o `worldThreeRenderer` — um só renderer 3D.
3. A Sala 2 online só volta depois do visual aprovado (exige terreno da sala, `PROTOCOL_VERSION`, snapshot e deploy do servidor primeiro).
4. Passo 1 (v0.93.133): remover o renderer, o artefato, o `?celestial=1` e os pacotes de arte do laboratório. Passos seguintes em `NEXT_STEPS`.

## Estado (v0.93.134)
Perfil novo e câmera isométrica fixa entregues; abre solo por `?mundo=santuario`. Terreno plano de grama, 4×4 chunks, 8 materiais do Mundo, cubos cheios (`cubeLevels = 1`, pilha de 5), arte do pacote principal. Gerador `SanctuarySeedGenerator` removido.

## Conjunto isométrico (v0.93.140)
A prancha isométrica do dono do produto (36 peças) é o conjunto de blocos do Santuário, no lugar dos 8 materiais do Mundo: 20 cubos (topo da peça "desentortado" + faces próprias) e 16 objetos de sprite (plano vertical girado 45° para a câmera; Casa 3×3 com partes). Arte e render isolados do Mundo (`render/art/santuario.ts`, `render/isoSet.ts`); ids reaproveitados da faixa celestial removida. Pisos como cubos cheios é uma simplificação a rever (NEXT_STEPS).

### Ajuste (v0.93.141)
Só 19 das 36 peças viraram blocos (3 pisos e 16 objetos) e três objetos cresceram (carvalho 2×, casa 4×, barraca 3×); os objetos grandes ocupam várias células (`ISO_BIG`).

### Cercas e portões 3D (v0.93.142)
Os sprites do Mundo são renders 3/4 do modelo e não servem à câmera isométrica; o Santuário desenha a **geometria do modelo** (malhas Three.js, `render/three/isoFences.ts`) com as tábuas V2. Reaproveita os blocos e as regras do Mundo; não cria ids.

### Terreno em camadas (v0.93.143)
O Santuário nasce com 2 camadas de cubo sobre o chão (Bloco de Pedra, depois Grama): a Deusa e os objetos ficam em cima (nível 3) e cavar mostra as camadas; quebrar leva 1 s. Tudo atrás de campos do `WorldProfile` (`breakSeconds`, `surfaceObjects`, `terrain.layers`), sem mudar o Mundo.

## Consequências
Menos código paralelo (um renderer). O perfil `santuario` atual e `celestialArt.ts` ainda existem até o perfil novo entrar. Perde-se o artefato publicado do Santuário Celestial (fica como histórico).
