# Experimento: Santuário Celestial com Three.js

> **Status:** protótipo isolado, não adotado no motor principal.

## Objetivo

Comparar o Santuário 2D já existente com uma versão de **geometria 3D e arte 2D de fantasia cartoon**, sem modificar o motor principal de Orvalis.

## Abrir

- Santuário atual: `?mundo=santuario`
- Santuário Three.js: `?mundo=santuario&render=three`
- Opcional: acrescentar `&seed=42` nas duas URLs para usar a mesma seed.

O modo experimental só funciona no perfil `santuario`. O pacote Three.js é importado dinamicamente e não é carregado no jogo principal.

## O que a primeira versão implementa

- Mesmos limites do Santuário original: 5×2 chunks, **80×32 células**.
- Mesmos 18 blocos celestiais e seus **topos, faces frontais e pisos oficiais**, recortados de `celestialFaces`.
- Mundo lógico reaproveitado (`World`), sem alterar regras de colocação e quebra.
- Cubos tridimensionais por instanciamento (um grupo por material/camada).
- Deusa da Vida como **sprite 2D original de flutuação 7×4**, com sombra suave.
- Câmera ortográfica com duas vistas: superior e isométrica experimental.
- Movimentação por teclado (WASD/setas) ou joystick na tela; zoom na roda do mouse.
- Construir ou remover blocos por clique/toque; barra de materiais na parte inferior.

## Limitações intencionais

- **Não salva** alterações; atualizar a página reinicia o protótipo. Isso evita corromper o salvamento atual.
- Empilhamento segue `MAX_STACK = 3` do mundo existente; altura 3D ilimitada e andares reais são fases futuras.
- Sem modo multiplayer, inventário completo, efeitos finais ou colisão 3D de objetos não previstos pelo mundo atual.
- Sombreamento, composição e coordenadas de textura são testes visuais, não substituem a direção de arte atual.
- Se WebGL falhar, a tela exibe um link para voltar ao Santuário 2D.
- O renderizador Three.js utiliza o mesmo `canvas`, mas em outra execução; não tente ativar os dois contextos ao mesmo tempo.
- `src/three/three.d.ts` é uma declaração temporária do módulo Three.js; tipagem detalhada ficará para a estabilização.

## Validação antes de expandir

1. `npm ci && npm run typecheck && npm test && npm run build`.
2. Abrir o 2D original e garantir que permaneça idêntico.
3. Abrir `?mundo=santuario&render=three` em desktop e celular (Safari iOS e Chrome Android).
4. Verificar alinhamento/escala das 18 texturas e da folha da Deusa.
5. Testar movimentação e seleção com as duas câmeras.
6. Testar colocar e quebrar blocos (0–3), zoom, orientação horizontal e ausência de regressões.
7. Medir FPS, memória e carga de GPU; otimizar meshes por chunk se necessário.

## Próxima fase (após validação)

Estender o armazenamento vertical e o sistema de colisão para pavimentos reais, acrescentar escadas, transparência de telhado e renderização 3D de terreno com camadas, mantendo o visual ilustrado.
