# Convenções

- TypeScript estrito, ES modules, sem framework. Identificadores em inglês; UI, comentários e docs em pt-BR.
- Coordenadas: `x` → direita, `y` → **baixo na tela** (= sul no mapa). Unidade = célula; px de mundo = célula × `TILE`.
  A câmera nunca rota: direção de tela = direção do mapa (joystick e teclado usam o mesmo vetor).
- Conversão célula↔chunk **sempre** via `world/coords.ts`.
- Toda aleatoriedade do mundo deriva da seed. Nunca `Math.random()` em `world/` (só em efeitos efêmeros).
- Cada célula tem chão (`layer: 'ground'`) e até 2 níveis de objeto (`layer: 'object'`, `AIR` = vazio); o nível 1
  só aceita cubo sobre cubo. Altura de pé/colisão sempre via `World.standHeight` (inclui buracos).
- A camada de chão pode conter um id de cubo (piso feito num buraco); ler "é pisável" via `isGroundStandable`.
  Formas de objeto: `cube`, `tree`, `decoration` (não sólido).
- Propriedades em `world/blocks.ts`; aparência em `render/textures.ts` pelo mesmo id. Novo bloco = os dois lugares.
- Sprites de objeto: posicionados por `ox/oy` relativos ao canto da célula; a base do sprite coincide com a
  base da célula (necessário para a ordenação por linha). Cubos: face superior `TILE`, face frontal `CUBE_FRONT`.
- Toda entidade que anda estende `Walker` (nada de colisão própria); NPCs ficam em `game/` e entram em
  `Entities`. Ocupação de célula (colocar/cavar) consulta `Entities.occupies`, não só a personagem.
- Folhas de sprite novas: 4×4 (frente, esquerda, direita, costas), processadas por `scripts/process-sprite.py`;
  ajustar `sat_max/min_claro` quando a sombra do desenho for mais escura/saturada.
- Personagem: posição = centro dos pés. Quadros da folha compartilham a mesma ancoragem (pés na base);
  a câmera segue a posição lógica, nunca o sprite.
- Estilo: sombras puxam para índigo, luz de cima-esquerda, contornos coloridos, brilhos em estrela.
- Mutação de objeto só via `World.setObject/placeBlock/breakBlock`.
- Testes em `src/**/*.test.ts` (Vitest, Node).
