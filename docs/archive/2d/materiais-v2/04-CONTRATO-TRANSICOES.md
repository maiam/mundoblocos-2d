# Contrato — Transições Verticais e Horizontais V2.0

**Estado:** padrão arquitetural aprovado; máscaras e composição ainda precisam de protótipo visual e validação.

## 1. Dois problemas distintos

**Vertical (dentro do mesmo cubo):** como a cobertura do topo desce sobre a face frontal (ex.: grama sobre areia).

**Horizontal (entre células):** como os materiais dos **topos de células vizinhas** se encontram (ex.: grama ao lado de areia numa praia).

Os dois sistemas são independentes. Não misturar uma máscara horizontal com uma parede vertical de penhasco.

## 2. Transição vertical — `front_overlay`

- Fonte: PNG **128×128** com alfa.
- Região útil de frente: **128×64 superiores**.
- Conteúdo de franja no máximo nos **32 px superiores** da região útil, com transparência abaixo.
- Borda inicial fixa: **y=0** corresponde ao encontro topo/frente.
- Posicionar a sobreposição **sobre a textura frontal base**, nunca substituí-la.
- Redução: 128×64 → 64×32 → 32×16. Logo, uma faixa original de 32 px vira **8 px de cobertura** no mundo.
- Borda esquerda da franja deve casar com sua borda direita para formar faixas horizontais contínuas.

Exemplo:

```text
[topo: grama]       -> 32×32
[frente: areia]     -> 32×16
[overlay: franja]   -> faixa transparente com grama junto à borda superior
```

A mesma franja pode ser aplicada sobre frentes de terra, pedra ou areia, desde que a combinação seja autorizada pelo cadastro do material.

## 3. Transição horizontal — 8 vizinhos

Cada topo identifica seus vizinhos em oito direções:

```text
  NW  N  NE
   W  C   E
  SW  S  SE
```

- `C` = célula atual.
- O motor calcula a presença de materiais que devem invadir visualmente o topo atual, respeitando **prioridade** e **mesmo nível**.
- As diagonais só valem quando os **dois vizinhos cardeais correspondentes** também são candidatos ao mesmo overlay. Isso elimina cantos diagonais soltos e resulta em **47 configurações válidas** no modelo clássico de oito vizinhos com cantos condicionais.
- A biblioteca de máscaras é **reutilizável**: material novo não precisa de 47 desenhos exclusivos.
- O motor aplica textura do material vizinho pela máscara alfa, combinando com o material da célula.
- Todos os testes consideram vizinhos em chunks adjacentes.

### A máscara faz o quê?

Uma máscara não carrega grama, areia nem pedra: ela controla o alfa de **onde a textura superior aparece**. A mesma máscara serve para grama sobre areia, neve sobre pedra ou musgo sobre terra.

### Sobreposições com mais de dois materiais

No encontro de três materiais, o resultado deve ser **determinístico**:

1. Começar pelo material-base do topo da célula.
2. Identificar candidatos vizinhos de **prioridade superior** que possam transitar para aquele topo.
3. Compor overlays em **ordem crescente de prioridade**; o de maior prioridade fica por cima onde houver disputa.
4. Empates: resolver por um identificador estável (não por ordem de carregamento de chunks).
5. Usar a mesma decisão em qualquer câmera, sessão ou regeneração do chunk.

**Nota:** os números de prioridade são dados do catálogo, não propriedades da cor. Prioridades de produção deverão ser estabelecidas após a prova de conceito; não fixar automaticamente que grama deve ganhar de areia em todas as situações.

## 4. Parametrização mínima por material

Exemplo **ilustrativo** (não implementado):

```json
{
  "id": "areia_com_grama",
  "top": "grama/top.png",
  "front": "areia/front.png",
  "frontOverlay": "grama/front_overlay.png",
  "tileSize": 32,
  "frontHeight": 16,
  "blendGroup": "solo",
  "transitionPriority": 40
}
```

**Atenção:** a prioridade das transições horizontais deve pertencer ao **material visível do topo**; a frente e o overlay vertical pertencem à definição do bloco. Evitar inferir prioridade pela categoria do bloco inteiro.

## 5. Condições para misturar

- Somente **topos em contato** com altura compatível.
- Água, lava, vazio, buraco, paredes e bordas de barranco podem exigir regras específicas, não aplicar automaticamente o mesmo overlay.
- Não misturar através de um degrau visível como se o terreno fosse plano.
- Uma célula em altura diferente deve ativar o sistema de **borda exposta/relevo**, e não atravessar a altura com uma máscara de topo.
- Máscaras não alteram colisão, altura, id do material nem interação.

## 6. Continuidade e estilo

- Texturas-base de topo precisam ser seamless em quatro lados.
- Máscaras precisam encaixar entre células e nas diagonais sem falhas nem serrilhados fortes.
- Recomenda-se borda orgânica ilustrada, sem usar ruído aleatório diferente a cada quadro.
- Se houver variantes de máscara, selecionar por **seed + coordenadas do mundo + id de material**, nunca com `Math.random` por frame.
- A mesma célula deve ser desenhada de forma idêntica após recarregar o mapa.

## 7. Cache e atualização

- Cache dos topos/máscaras por chunk sempre que possível.
- Mudou material de uma célula: invalidar a célula e a vizinhança **3×3**, incluindo entradas no chunk adjacente.
- Mudou altura: recalcular tanto transições horizontais quanto bordas expostas de relevo.
- Não deixar a lógica de blending depender da ordem em que os chunks carregaram.

## 8. Casos de teste indispensáveis

- [ ] Dois materiais se encontram em linha reta (vertical e horizontal).
- [ ] Quatro cantos internos e quatro cantos externos.
- [ ] Uma única célula diferente entre iguais.
- [ ] Linha estreita de caminho com uma célula de largura.
- [ ] Três materiais se encontram numa região 3×3.
- [ ] Bordas de chunks, em todas as direções.
- [ ] Blocos lado a lado com alturas diferentes — **sem fusão horizontal indevida**.
- [ ] Overlay frontal encontra topo sem lacuna visível.
- [ ] O mesmo cenário renderiza sem alterações após recarga.
