# Plano de Implementação, Migração e Validação — Blocos V2.0

**Estado:** roteiro de execução para uso futuro; **nada deste documento foi executado no repositório**.  
**Objetivo:** validar o novo contrato com o menor risco possível para materiais, mundos salvos e renderização.

## 1. Situação de partida (referência da leitura anterior)

No código previamente consultado:

- `src/config.ts`: `TILE = 32`, `CUBE_FRONT = 18`, `CHUNK_SIZE = 16`, `MAX_STACK = 3`, `STEP_HEIGHT = 1`.
- `src/render/textures.ts`: `TEX_RES = 2`, `composeCube()` combina topo e frente e posiciona `oy = -F`.
- `src/render/blockArt.ts`: atlas convencional com topo 64×64, frente 64×36 e chão contínuo.
- Há um extrator de atlas de blocos (`scripts/extract-blocks.py`) e uma **cena de escala** de desenvolvimento (`?escala=1`).

**Não presumir** que as funções e os formatos permaneçam iguais quando a implementação for iniciada. Conferir o estado do repositório na ocasião.

## 2. Arquitetura desejada

```text
FONTES DE ARTE (PNG 128×128)
  - material A / top
  - material A / front (área útil 128×64)
  - overlay vertical com alfa
  - material B / top ...
                 |
                 v
PREPARAÇÃO / PIPELINE
  - valida dimensões e seamless
  - extrai região útil
  - reamostra topo 128×128 -> 64×64
  - reamostra frente 128×64 -> 64×32
  - empacota atlas + metadados
                 |
                 v
MOTOR / RENDER
  - topo 32×32, frente 32×16
  - âncora na borda inferior da face
  - transição horizontal (8 vizinhos / 47 máscaras)
  - transição vertical / luz / contorno
  - cache, sorting e atualização por chunk
```

## 3. Sequência recomendada de implantação

### Fase A — Teste mínimo de geometrias

1. Criar um recurso de teste com **topo 128×128** e **frente 128×128**, esta última pintada na metade superior.
2. Preparar atlas V2 (topo 64×64, frente 64×32).
3. Renderizar um bloco V2 com geometria **32×48** e comparar com bloco legado **32×50**.
4. Validar base de apoio, contorno, clique, câmera, zoom e ordenação com personagem.
5. Executar a cena `?escala=1` (ou equivalente no código futuro).

### Fase B — Biblioteca piloto

Criar **três materiais visuais mínimos**, de 128×128:

- areia (topo + frente);
- terra (topo + frente);
- grama (topo e franja frontal transparente).

Gerar pelo menos estes três blocos:

1. areia pura;
2. terra pura;
3. areia com topo de grama e franja de grama na face.

**Importante:** a biblioteca pode conter mais de três *arquivos* PNG porque cada material pode exigir `top`, `front` e overlay. O teste se refere aos três materiais/conceitos, não à contagem literal de arquivos.

### Fase C — Transições

1. Implementar as regras de oito vizinhos e máscara alfa reutilizável.
2. Testar as 47 configurações válidas, inclusive rotações e reflexões somente onde previstas pela biblioteca.
3. Definir prioridades para o conjunto piloto e encontros de três materiais.
4. Conferir vizinhos em chunks distintos e alturas diferentes.
5. Testar invalidação de cache e reprodução por seed.

### Fase D — Compatibilidade e migração

1. Manter caminho antigo e novo selecionáveis em ambiente de desenvolvimento durante a prova.
2. Converter materiais por lotes; não substituir todos os atlas de uma só vez.
3. Revisar sprites relacionados a `CUBE_FRONT` (portas, paredes, empilhamento, sombras, colisão visual, efeitos e hitbox).
4. Comparar saves e mapas já existentes; IDs/materiais devem permanecer reconhecidos.
5. Somente depois de aprovado, consolidar o novo pipeline e retirar conversões legadas que tenham perdido utilidade.

## 4. Cena de aceitação: um chunk 16×16

Criar um cenário controlado com **256 células de 32×32 px**:

- área de areia contínua;
- área de terra;
- área de grama;
- praia de areia/grama com bordas e cantos;
- encontro de três materiais;
- alguns cubos isolados, empilhados e com overlay frontal;
- dois blocos com altura diferente, sem blending indevido;
- personagem caminhando por trás e pela frente de objetos;
- pelo menos uma borda compartilhada com chunk vizinho.

**Não usar esse chunk para disfarçar erros geométricos:** mostrar uma grade de depuração ativável, âncoras e dimensões reais.

## 5. Critérios objetivos de aceite

### Geometria e escala

- [ ] Topos com 32×32 px exatos no zoom 1.
- [ ] Frentes com 32×16 px exatos no zoom 1.
- [ ] Sprite lógico 32×48 px, sem faces laterais ou losangos.
- [ ] Base inferior da frente coincide com a borda inferior da célula.
- [ ] Nenhuma mudança involuntária na pegada, colisão, velocidade, navegação ou alcance.

### Materiais e imagem

- [ ] Todos os PNG-fonte medem 128×128 px.
- [ ] Região útil da frente 128×64 extraída sem deformação geométrica.
- [ ] Atlas V2 gera 64×64 para topo e 64×32 para frente.
- [ ] Sem linhas de costura em patch 3×3 do mesmo material.
- [ ] Sem halos de alfa, borrões desiguais ou arte de cubo pintada na fonte.
- [ ] Frente, topo e overlay mantêm estilo consistente no zoom real do jogo.

### Transições e performance

- [ ] 47 máscaras válidas de 8 vizinhos verificadas (cantos condicionais).
- [ ] Bordas/cantos horizontalmente contínuos, inclusive entre chunks.
- [ ] Franja vertical aplicada no topo da frente, sem fundo do substrato.
- [ ] Ordem determinística em encontros de três materiais.
- [ ] Mudança de uma célula invalida só as áreas necessárias, incluindo vizinhos.
- [ ] Sem trabalho de composição excessivo a cada quadro quando o terreno está parado.

### Regressão

- [ ] Cenários antigos continuam carregando.
- [ ] Sistema antigo pode ser reativado em dev até aprovação.
- [ ] Portas, paredes, itens, sombras e personagens não ganham desalinhamento.
- [ ] Renderização consistente após salvar/recarregar.
- [ ] Testes automatizados existentes continuam passando.

## 6. Testes automatizados sugeridos

```text
validateSourceImage(file):
  dimensions == 128×128
  PNG && correct alpha profile
  top seamless validation (visual and pixel metrics)
  front crop == (0,0,128,64)

validateGeometry(block):
  output top == 32×32
  output front == 32×16
  output full sprite == 32×48
  bottomAnchor == cellBottom

validateTransitions(neighborhood):
  diagonals require corresponding cardinal neighbors
  resulting mask belongs to the 47 valid masks
  deterministic with same seed + coordinates
  no horizontal blend across height mismatch
```

## 7. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Mudança de 18 para 16 desalinha sprites históricos | Feature flag/caminho legado e comparação na cena de escala |
| Compressão da arte causa deformação | Recortar área útil 128×64 em vez de reduzir 128×128 para 32×16 |
| Linha entre tiles de mesma textura | Exigir seamless e validar amostras 3×3 |
| Cantos de 3 materiais ficam errados | Prioridade total estável e casos de teste 3×3 |
| Blocos de diferentes alturas se misturam | Bloquear blending de topo e usar borda exposta/relevo |
| Custos de composição no frame | Pré-processar atlas e cachear as combinações por chunk |
| Efeito de iluminação fica duplicado | Separar microtextura artística de luz global do motor |

## 8. Entregáveis futuros (quando for autorizado mexer no repositório)

1. Carregador/manifesto de materiais V2.
2. Extrator com seleção de região útil e geração de atlas 64×64/64×32.
3. Renderização e testes com `CUBE_FRONT = 16`.
4. Biblioteca de máscaras horizontais e compositor de overlays.
5. Cena de QA de chunk 16×16 e testes de regressão/benchmark.
6. Documentação de integração no próprio repositório, somente mediante autorização.

## 9. Conclusão

O acordo está suficiente para iniciar uma prova de conceito consistente. **Aprovação do documento não significa que a implementação ocorreu.** A próxima decisão será aceitar ou corrigir o resultado visual real da cena piloto antes de migrar o restante do jogo.
