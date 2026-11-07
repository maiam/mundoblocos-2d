# ADR — Materiais planos e geometria gerada pelo motor (V2.0)

- **Estado:** decisão aprovada; implementação pendente.
- **Data:** 07/11/2026.
- **Contexto:** MundoBlocos 2D (repositório `maiam/mundoblocos-2d`).
- **Tipo:** arquitetura de arte + renderização 2D.

## Contexto e problema

O pipeline histórico usa uma prancha ilustrada como fonte de cubos, extraindo topo e frente e montando um atlas. Conforme a geometria varia, solicitar novos cubos desenhados torna a produção de materiais redundante e favorece erros de perspectiva e de base de apoio.

Foi acordado preservar a direção do jogo: **projeção frontal-superior híbrida 2D**, sem isometria e sem segunda face lateral. Queremos materiais pintados à mão, reaproveitáveis e combináveis.

O estado técnico anteriormente verificado é:

- `src/config.ts`: `TILE = 32`, `CUBE_FRONT = 18`, `CHUNK_SIZE = 16`, `MAX_STACK = 3`, `STEP_HEIGHT = 1`.
- `src/render/textures.ts`: `TEX_RES = 2`; a rotina `composeCube()` já desenha separadamente topo e frente, aplica sombreamento/contorno e retorna um sprite com `oy = -F`.
- Atlas histórico: topo 64×64, frente 64×36; o material da frente é previamente preparado na altura do atlas.

Esses pontos descrevem o **estado existente**, não o novo estado já implementado.

## Decisão

1. **As fontes de arte dos materiais serão texturas planas de 128×128 px**; não serão cubos prontos em perspectiva.
2. **O motor define a geometria** do bloco: topo 32×32, frente 32×16, sprite total 32×48, com o apoio na base inferior da face.
3. **O pipeline extrai e reamostra** a região apropriada de cada fonte, gerando topo e frente independentes.
4. **Para a frente**, uma janela de origem de **128×64 px** dentro do arquivo 128×128 evita achatar detalhes. O gabarito padrão ocupa a metade superior da imagem.
5. **Transição vertical** é overlay transparente separado, aplicado à face de base; **transição horizontal** é autotiling por oito vizinhos com máscaras alfa reutilizáveis.
6. **Prioridades** de materiais, **ordem de camadas**, **sombras**, **âncoras** e **seams** são regras explícitas e verificáveis.
7. **Compatibilidade gradual**: o pipeline antigo pode coexistir durante a migração; não converter todos os materiais antes de validar o protótipo.

## Por que 128×128?

Permite pintura de textura suave e detalhada. O arquivo-fonte permanece independente do tamanho de renderização. Não torna os pixels finais automaticamente mais detalhados, mas aumenta a liberdade de pintura, redução e ajustes futuros.

## Por que frente de 16 em vez de 18?

A proporção 32:16 é 2:1, mais simples de padronizar. No atlas 2×, o resultado previsto é 64×32; ao usar a faixa 128×64, o redimensionamento é uniforme. **Não é exigência de desempenho nem regra universal de perspectiva.** É uma escolha artística que exige teste em cena.

## Alternativas consideradas

| Alternativa | Motivo para não adotar como padrão |
|---|---|
| Continuar desenhando cubos inteiros | Retrabalho, dificuldade em preservar rigor geométrico |
| Texturas-fonte 16×16 | Ótima para pixel art, mas limita o estilo ilustrado escolhido |
| Comprimir frente 128×128 para 32×16 | Distorção vertical de pedras, círculos, tijolos e detalhes |
| Geometria isométrica/3D ortográfica | Contraria a identidade geométrica estabelecida |
| Transições todas pintadas como sprites completos | Combinações crescem rapidamente e dificultam manutenção |
| Apenas quatro vizinhos para autotiling | Não trata bem cantos e encontros orgânicos |

## Consequências

**Ganhos:** biblioteca reutilizável de materiais; variação de geometria sem redesenhar materiais; menos falhas de perspectiva; escala de produção; transições automatizadas; possibilidade de reaproveitar a mesma textura no topo, no chão e em frentes quando apropriado.

**Custos:** criar/validar pipeline de fontes; compor atlas; gerenciar máscaras e prioridade; testar iluminação, ancoragem, ordem de desenho e arte antiga; possível migração de sprites com elementos pintados que dependam de determinada altura.

## Fora do escopo

- Alterar geometria de personagens, portas, telhados, árvores ou construções inteiras.
- Criar sistema ilimitado de elevação, rampas físicas ou nova mecânica de navegação.
- Aumentar `MAX_STACK` ou alterar `STEP_HEIGHT` por causa da mudança visual.
- Substituir automaticamente todos os recursos existentes.

## Critério de aceite

A decisão é operacionalmente validada somente quando uma prova de conceito com areia, grama e terra passar nos testes geométricos, de textura, transição, iluminação e compatibilidade descritos em `05-PIPELINE-MIGRACAO-E-TESTES.md`.

## Reversibilidade

A adoção deve ser protegida por um caminho de compatibilidade (atlas legado/novo pipeline selecionável por material ou configuração de desenvolvimento). Assim será possível restaurar `CUBE_FRONT = 18` ou voltar temporariamente ao atlas anterior caso haja regressão.
