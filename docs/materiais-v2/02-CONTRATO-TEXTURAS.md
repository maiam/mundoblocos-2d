# Contrato de Arte — Texturas de Materiais V2.0

**Estado:** aprovado como especificação para novos materiais; integração pendente.  
**Abrangência:** terrenos e materiais de cubos regulares. Objetos especiais usam contratos próprios.

## 1. Princípio

**Uma textura descreve o material, não a forma do cubo.** O artista entrega superfícies planas. O pipeline gera as imagens utilizáveis pelo renderizador, e a geometria final não deve aparecer desenhada no arquivo-fonte.

## 2. Formato da fonte

| Item | Regra |
|---|---|
| Dimensão do arquivo | **128×128 px** exatos |
| Formato | PNG, canal alfa quando necessário, cor sRGB |
| Orientação | Textura vista perpendicularmente à superfície (plana) |
| Qualidade | Ilustração digital 2D de fantasia/anime, pintada à mão, detalhe harmonizado |
| Bordas de texturas repetíveis | Seamless nos 4 lados, com continuidade de cor e traços |
| Perspectiva | Proibida na textura-base: sem losango, lateral, sombra de cubo ou fuga |
| Iluminação | Apenas microvolume da pintura; evitar luz direcional forte e sombras projetadas |
| Fundo | Material-base cobre todo o quadrado; overlays usam transparência fora da área pintada |
| Rotação e espelhamento automático | Desativados, exceto quando um recurso explicitamente declarar compatibilidade |

## 3. Tipos de arquivo

### A. Textura de topo (`top`)

- Fonte: **128×128** inteiros.
- Destino no atlas V2: **64×64**.
- Destino no mundo: **32×32**.
- Deve repetir sem emendas com outras células iguais.
- A mesma origem poderá alimentar o chão contínuo do material.

### B. Textura de frente (`front`)

- Arquivo: **128×128**, por convenção de biblioteca.
- **Região útil obrigatória:** retângulo `(x=0, y=0, largura=128, altura=64)`.
- O conteúdo visual necessário à frente inteira deve estar nessa região de **proporção 2:1**.
- Destino no atlas V2: **64×32**.
- Destino no mundo: **32×16**.
- A metade inferior da fonte pode permanecer transparente; o pipeline **não a utiliza para a frente**.
- Assim, as proporções internas são mantidas: 128×64 → 64×32 → 32×16 (escala uniforme em ambas as direções).
- Para paredes contínuas, as bordas esquerda/direita da **região útil** devem se conectar visualmente.

### C. Overlay de transição vertical (`front_overlay`)

- Arquivo: 128×128, com transparência alfa.
- Usa a **mesma região útil de frente 128×64**.
- Convenção de franja proposta e aprovada neste pacote: os **primeiros 32 px** dessa região podem conter a grama/neve/musgo; os 32 px restantes da região ficam transparentes.
- Com a redução proporcional, uma franja de 32 px na origem ocupa **8 px no mundo** (não 4 px). Se futuramente desejarmos 4 px, a faixa de origem deverá ser reduzida a 16 px.
- A primeira linha da imagem corresponde à **aresta superior** da face frontal.
- Todo o restante do arquivo deve ser transparente, sem fundo do substrato.
- Bordas esquerda e direita do overlay devem conectar-se em sequência.

### D. Máscaras de transição horizontal (`edge_mask`)

- Fonte: 128×128; canal **alfa**, sem informações de cor do material.
- Aplicação apenas sobre o **topo** de 32×32 de materiais compatíveis e na mesma altura.
- Não é criada uma máscara nova por par de materiais: a biblioteca é reutilizável.
- A definição dos 47 casos está em `04-CONTRATO-TRANSICOES.md`.

## 4. Exemplos de composição

```text
Bloco A — areia pura
  topo:   areia/top.png
  frente: areia/front.png
  overlay: nenhum

Bloco B — areia coberta de grama
  topo:   grama/top.png
  frente: areia/front.png
  overlay: grama/front_overlay.png

Bloco C — bloco de terra
  topo:   terra/top.png
  frente: terra/front.png
  overlay: nenhum
```

**Nota:** esses exemplos de nomes são uma convenção sugerida para produção, não caminhos que já existam no repositório.

## 5. Nomenclatura sugerida

```text
materials/
  areia/
    top.png
    front.png
  terra/
    top.png
    front.png
  grama/
    top.png
    front.png              # opcional: frente integralmente verde
    front_overlay.png      # folhagem transparente na borda superior
transitions/
  horizontal/
    masks/                 # máscaras reutilizáveis
```

Caso uma mesma imagem sirva a topo e frente, o cadastro de material pode referenciar o mesmo recurso, **desde que a região útil 128×64 da frente seja artisticamente válida**.

## 6. Qualidade e controle de exportação

- Arquivo medindo exatamente **128×128**; sem redimensionamento inesperado na exportação.
- Para `top`, testar repetição 3×3; para `front`, repetir a faixa útil 3 vezes na horizontal.
- Evitar símbolos, flores, parafusos ou círculos que sejam cortados na metade ao usar a região útil.
- Verificar ausência de halo nas bordas alfa em exportações e ao reduzir.
- Salvar a fonte original editável separadamente do PNG entregue.
- Testar as imagens **dentro da cena**, não apenas isoladas.

## 7. Renderização e filtro

O contrato dimensional é obrigatório; a escolha entre redução por área/bicúbica/linear deve ser avaliada em uma prova de conceito. Para a estética ilustrada, a preferência inicial é **redução suavizada de qualidade**, não ampliação pixelada automática. O filtro selecionado deverá ser consistente entre materiais e atlas.

## 8. Checklist de entrega

- [ ] PNG 128×128 e formato de cor correto.
- [ ] Textura plana, sem perspectiva ou sombra de cubo.
- [ ] Topo seamless em quatro lados.
- [ ] Frente com área útil nos 128×64 superiores.
- [ ] Frente sem distorção de formas significativas.
- [ ] Overlay, se houver, com transparência e banda superior correta.
- [ ] Repetição e continuidade aprovadas.
- [ ] Preview em 32×32/32×16 e no renderizador do jogo aprovado.
