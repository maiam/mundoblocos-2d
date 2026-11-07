# Contrato — Geometria, Âncoras e Renderização de Cubos V2.0

**Estado:** geometria-alvo aprovada; requer implementação/testes.  
**Escopo:** cubos regulares. Não substitui regras próprias de paredes especiais, telhados, personagens ou objetos de cena.

## 1. Eixos e grade

- Mundo 2D em plano ortogonal de células de **32×32 px** no zoom 1.
- `x` cresce para a direita, `y` cresce para baixo na tela.
- Chunk = **16×16 células**; área horizontal de referência = **512×512 px**.
- Cada cubo ocupa **uma célula de planta** independentemente da altura visual.
- Topo quadrado com proporção **1:1**; **uma face frontal** abaixo dele; nenhuma lateral estrutural visível.
- Sem projeção isométrica; não renderizar topo em losango.

## 2. Dimensões por cubo

| Medida | Alvo V2 |
|---|---:|
| Largura do topo | 32 px |
| Profundidade do topo na tela | 32 px |
| Largura frontal | 32 px |
| Altura frontal | 16 px |
| Altura total do sprite lógico | 48 px |
| Atlas de topo (resolução 2×) | 64×64 px |
| Atlas frontal (resolução 2×) | 64×32 px |

**Não confundir** altura de 16 px da face na tela com dimensão física 3D ou com a área horizontal da célula. É uma convenção da nossa projeção 2D.

## 3. Âncora e posicionamento

A base inferior da face frontal é o **ponto de apoio** do cubo na tela. Para reproduzir o comportamento atual de `composeCube()` com `F=16`, a posição de desenho relativa à célula é `ox = 0`, `oy = -16`.

Para uma célula com canto superior esquerdo `(cellX, cellY)` em pixels de mundo:

```text
spriteX = cellX
spriteY = cellY - 16

TOPO:   x = [cellX, cellX+32) ; y = [cellY-16, cellY+16)
FRENTE: x = [cellX, cellX+32) ; y = [cellY+16, cellY+32)
BASE:   y = cellY+32
```

Exemplo: o topo pode desenhar **16 px acima** da célula de planta. Isso é intencional e exige ordenação e seleção de objetos adequadas; a base visual inferior continua alinhada à borda inferior da célula.

A âncora **não deve mudar** por cor/material. Variações de vegetação podem ultrapassar o contorno gráfico apenas se o contrato específico declarar a margem decorativa, sem alterar colisão/ocupação.

## 4. Diagrama conceitual

```text
  +------------------------+  <-- topo (32 px na tela)
  |                        |
  |         TOPO           |
  |       32 × 32          |
  |                        |
  +------------------------+  <-- encontro do topo com a frente
  |       FRENTE           |  16 px
  +------------------------+  <-- BASE DE APOIO (âncora)
           largura 32 px
```

## 5. Camadas e composição de um cubo

Ordem recomendada de composição **interna**:

1. Desenhar a textura base frontal.
2. Aplicar o overlay vertical frontal, se houver.
3. Aplicar a atenuação/sombreamento da face frontal.
4. Desenhar o topo e suas transições horizontais de mesma altura.
5. Desenhar a aresta de separação, filetes de luz e contorno do material.

A ordenação de **objetos no mundo** (jogadores atrás/à frente, pilhas, paredes) é outra etapa. Ela deve respeitar a âncora e a profundidade real do desenho; não pode ser inferida somente da cor ou do tamanho total do PNG.

## 6. Terreno, cubos e níveis

- **Chão plano contínuo:** desenhar principalmente o topo; não desenhar uma frente de 16 px em todas as células planas.
- **Cubo isolado / empilhado:** desenhar topo e frente, respeitando a base.
- **Desnível de terreno:** a borda exposta pode exigir parede/frente própria do relevo, distinta de uma célula plana.
- **Alturas discretas:** cada incremento de cubo empilhado corresponde à altura visual de frente `F=16 px` no esquema existente.
- **Colisão, navegação e escalada:** continuam governadas pelas regras do mundo, não por contagem de pixels do sprite.
- **Montanhas com muitos níveis:** exigem sistema de altitude/meshes de relevo e não são automaticamente resolvidas por esta mudança.

No estado anterior, o projeto registrava `MAX_STACK = 3` e `STEP_HEIGHT = 1`. O novo contrato **não modifica por si só** esses limites.

## 7. Iluminação

- Direção visual global de luz: **alto à esquerda**.
- Topo com leitura mais clara; frente levemente mais escura, com saturação controlada.
- Pequena sombra de contato na separação topo/frente, bordas e encaixes.
- Textura-fonte não deve conter sombra projetada forte que conflite com os ciclos de luz do jogo.
- Regras de luz do jogo prevalecem sobre a cor da textura.

## 8. Restrições e testes geométricos

- Um único cubo renderizado precisa medir exatamente **32×48 px** de geometria lógica no zoom 1, sem contar efeitos externos.
- O topo deve ocupar **32×32 px** e a frente **32×16 px**.
- O contato com o solo deve coincidir com `cellY+32`, sem flutuação.
- A largura frontal deve coincidir com a largura do topo (32 px).
- Blocos vizinhos não devem gerar segunda face, losango ou recuo isométrico.
- Verificar pixels e sobreposições com zoom 1, 2 e diferentes escalas de dispositivo.
- Validar seleção/click/hitbox e ordenação de sprites na cena real.

## 9. Compatibilidade

A fonte de verdade da geometria deverá ser a configuração do motor (e não a arte). A migração de `CUBE_FRONT = 18` para `16` precisa ocorrer com a adaptação do atlas e dos testes; não mudar isoladamente a constante sem revisar renderização e ativos.
