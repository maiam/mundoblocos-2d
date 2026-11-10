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


## Novo: teste artístico da Nuvem Sólida V1.1

Fonte: segunda prancha aprovada pelo usuário. Um kit de preparação técnica foi gerado **fora do GitHub** a partir do JPEG (não é possível preservar o alfa original de JPEG). O kit inclui:
- `atlas-4x2-rgba.png` (512×256, células de 128×128, 8 elementos);
- arquivos PNG de topo/lateral e overlays isolados;
- folhas de repetição 5×5 e prévia da reconstrução de alfa;
- fonte do processamento e observações de QA.

Fluxo no Santuário experimental:

1. Abrir `?mundo=santuario&render=three` na branch experimental.
2. Extrair o arquivo ZIP **Orvalis_Nuvem_Solida_V1.1_Kit_Tecnico.zip**.
3. Clicar em **Carregar nuvem V1.1** e escolher `atlas-4x2-rgba.png`.
4. O protótipo substitui o material de Nuvem Sólida em tempo de execução (topo e laterais), monta uma plataforma elevada 5×5 e mostra um detalhe de empilhamento.
5. O botão **Plataforma 5×5** refaz a demonstração sem persistir.
6. Alternar câmera superior/isométrica, zoom e verificar emendas, bordas, cantos e estética.

**Não houve substituição do pacote de artes definitivo no repositório.** O teste recebe o atlas via seletor local do navegador; nenhum upload é enviado a servidor. Reiniciar a página volta às artes anteriores. Esse procedimento permite comparar com segurança sem inflar o pacote de arte que carrega no início.

**Limites conhecidos:** o tratamento de Fourier zerou a diferença entre pixels das extremidades das texturas 1 e 2, mas não elimina motivos visuais repetidos a cada célula. A transparência dos elementos 3–8 é reconstruída a partir de fundo branco JPEG (alfa aproximado). O encaixe/ângulo das peças é preliminar. Publicação final requer imagens PNG transparentes de origem ou refinamento manual do alfa e transições.


## Nuvem Sólida V1.2 — superfície orgânica (sem reiniciar em cada célula)

O teste visual V1.1 mostrou um mosaico: o topo de 128 px era aplicado em cada cubo separadamente.
Mesmo com bordas matematicamente iguais, formas idênticas se repetiam a cada bloco.

A V1.2 mantém o **mesmo PNG já carregado** pelo botão **Carregar nuvem V1.1**,
mas constrói um segundo material visual para comparação:

- **Orgânica V1.2:** sintetiza um padrão macro periódico de 768×768 a partir da pintura original,
  com quatro deslocamentos de fase misturados suavemente e saltos determinísticos.
- **UVs do mundo:** em vez de reiniciar a textura por bloco, a malha de nuvens recebe
  UVs proporcionais à posição global X/Z, cobrindo **16×16 células por período**.
- **Faces expostas:** gera apenas as superfícies superiores visíveis e as laterais em contato
  com espaço vazio, sem desenhar faces internas entre blocos ocupados.
- **Bordas de teste:** as peças da prancha só aparecem nos lados expostos da plataforma 5×5.
- **Comparação imediata:** o botão **Nuvem: orgânica V1.2** alterna para **Nuvem: repetição V1.1**
  e vice-versa, sem recarregar a página. Sempre compare as mesmas câmera e escala.
- **Não altera** outras texturas celestiais, regras do mundo, salvamento, personagem ou PR principal.

### Passos para validar

1. Atualizar a branch \`feat/santuario-three-experimental\` no computador.
2. Executar \`npm ci\`, \`npm run dev\`.
3. Abrir \`http://localhost:5173/?mundo=santuario&render=three\`.
4. Clicar em **Carregar nuvem V1.1** e selecionar o **mesmo** \`atlas-4x2-rgba.png\` de 512×256.
5. A nova versão **Orgânica V1.2** é ativada automaticamente.
6. Alternar **Nuvem: orgânica V1.2 / Nuvem: repetição V1.1** observando o terreno em escala
   original, sobretudo a região atrás da Deusa e a plataforma 5×5.
7. Alternar entre câmera superior e isométrica para verificar laterais e contorno das plataformas.

### Limitações ainda existentes

O campo macro ainda é periódico a cada 16 células (em vez de 1 célula). Como a única
fonte é uma pintura de 128×128, alguns motivos e variações de contraste ainda podem ser reconhecíveis.
Também **não está implementado** o autotiling entre os 18 tipos de material: V1.2 trata
exclusivamente a Nuvem Sólida e seus próprios blocos vizinhos. As artes transparentes extraídas
do JPEG ainda precisam de refinamento de alfa. Efeitos de pós-processamento, iluminação,
sombreamento e acabamento de plataforma ficarão para outras etapas.


## Nuvem Sólida 512 — textura única seamless aprovada (novo teste)

O usuário aprovou uma imagem **512×512** de nuvens brancas suaves como textura-base, já testada em repetição 4×4. A comparação de pixels extremos (esquerda/direita e cima/baixo) da imagem original retornou **0**, sem discrepância de RGB nos limites.

A nova opção evita o sintetizador macro V1.2, que gerava retângulos grandes: **nenhuma alteração ou combinação de pixels** é aplicada ao arquivo 512 carregado. A imagem é amostrada com **UVs contínuos de mundo**, e cada padrão cobre **4×4 células**. A mesma textura reveste os topos e as faces verticais expostas da Nuvem Sólida; nenhum mosaico por bloco e nenhuma borda decorativa herdada do atlas V1.1 é aplicada a esse modo.

**Como testar:**

1. Atualizar a branch `feat/santuario-three-experimental` e iniciar `npm run dev`.
2. Abrir `http://localhost:5173/?mundo=santuario&render=three`.
3. Clicar em **Carregar nuvem 512** e selecionar **orvalis_nuvem_topo_512_seamless_v2(1).png** (512×512).
4. O modo **Nuvem 512: ativa** passa a usar a nova pintura no terreno inteiro. Para comparar com o material anterior, clicar no mesmo botão, sem recarregar.
5. Clicar em **Plataforma 5×5** e alternar a câmera superior/isométrica para avaliar topo, faces, sombras e escala.

**Nota:** a imagem é carregada localmente a partir do computador do usuário e **não** está incorporada ao repositório como asset binário. O estado não é persistido; após atualizar a página, carregue novamente a textura 512. Somente a integração do renderizador e seu teste entram no PR. As demais 17 texturas e os salvamentos ficam intactos.

**Próximo passo:** após aprovação visual, preparar a imagem como asset de distribuição do Santuário. Variações (grama/nuvem florida etc.) poderão alterar o topo preservando a mesma base no cubo.


## Correção da oclusão da Deusa — bloco alto (10/11)

**Sintoma:** com até três blocos empilhados, a face do último bloco podia
cobrir parte do rosto e das asas da Deusa mesmo quando ela deveria estar visível
na leitura do protótipo. A ordem anterior (`renderOrder=1` com teste de
profundidade ligado) não garantia a visibilidade: o teste do *depth buffer*
descartava pixels do sprite.

**Correção experimental:** a Deusa é desenhada em uma camada visual superior,
com `renderOrder=10`, `depthTest=false` e `depthWrite=false`. Isso **não altera**
colisão, posição, alturas, raycasting ou a textura original do personagem.
Foi incluído teste automatizado para as configurações do sprite.

**Limitação:** o personagem ficará visível mesmo quando estiver realmente
atrás de uma parede alta. Isso é aceitável **apenas no laboratório atual**
para evitar desaparecimento involuntário. Antes de implementar interiores
e andares, precisamos substituir por oclusão contextual (transparência de
paredes/telhados e/ou máscara de personagem), com testes em ambos os ângulos
de câmera.

**Teste manual:** com a câmera superior, criar pilhas de 1, 2 e 3 blocos,
aproximar a Deusa de cada uma, verificar rosto/asa/cabeça inteiros e repetir
na câmera isométrica. Confirmar que a colisão com os blocos segue funcionando.


## Laboratório de Construção 3D V1.0 (pilhas, plataformas e oclusão)

**Objetivo:** testar geometria, alturas, leitura de faces e sprite 2D sem mudar
a versão publicada, texturas originais ou formato de salvamento.

### Cena e interface

Abra `?mundo=santuario&render=three`. Na barra superior:

1. **Carregar nuvem 512:** selecionar a Nuvem Sólida `512×512` seamless aprovada.
   Seu PNG continua carregado apenas no navegador, sem envio ao servidor.
2. **Criar laboratório 3D:** prepara uma cena fixa no lado esquerdo do Santuário,
   dentro dos limites 80×32, com **136 células de teste e 172 cubos**:
   - pilhas isoladas de 1, 2 e 3 blocos;
   - parede de 2 blocos de altura, com passagem central;
   - plataforma 5×5 com 2 blocos de altura;
   - plataforma 10×10 com 1 bloco de altura.
3. **Ver laboratório / Seguir Deusa:** alterna câmera entre a região de teste
   e a personagem; ao abrir o laboratório, a câmera enquadra a construção.
4. **Testar oclusão (Deusa):** leva a personagem a um ponto atrás da parede
   e centraliza a câmera nela, sem alterar a lógica do mundo.
5. **Arestas: ocultas / visíveis:** sobrepõe contornos **somente de depuração**
   nos blocos elevados do laboratório. Não faz parte do visual definitivo.
6. **Câmera: superior / isométrica:** comparar com o mesmo conjunto de blocos.
7. **Recriar laboratório:** restaura os objetos e descarta alterações pontuais
   feitas nessa área durante o teste, sem modificar o chão ou os arquivos de save.

### Novos recursos

- **Sombras sutis nas faces:** a pintura 512×512 permanece inalterada, mas as
  laterais recebem um multiplicador de cor suave (`0xe2dfed`). O topo não
  recebe esse escurecimento.
- **Faces internas ocultas:** o sistema de superfície de nuvem existente elimina
  faces entre células ocupadas. O laboratório permite verificar esse resultado
  após empilhar e retirar blocos.
- **Oclusão contextual da personagem:** o sprite normal mantém `depthTest`
  ligado; uma segunda representação com `GreaterDepth`, mais transparente,
  evidencia **somente as partes escondidas** da Deusa. Não há mais um sprite
  100% à frente de todo o cenário. As duas representações usam a mesma animação
  original, posição e escala.
- **Arestas sob demanda:** um único objeto `LineSegments` é criado para
  conferir a geometria das pilhas. Não afeta a seleção por raycast.

### Critérios de aprovação visual

- Diferenciar claramente alturas de 1, 2 e 3 blocos nas duas câmeras.
- Manter a Nuvem Sólida sem mudanças na arte original.
- Não criar quadrados escuros, costuras falsas ou faces internas aparentes.
- Mostrar a Deusa inteira onde estiver desobstruída, e apenas uma silhueta
  translúcida quando uma parede realmente a esconder.
- Testar construção/remoção após gerar o laboratório.
- Comparar a legibilidade das plataformas 5×5 e 10×10 no desktop e celular.

### Cuidados

A alteração é **somente experimental**, não habilita navegação real entre andares.
A representação translúcida facilita localização atrás de paredes; para
interiores, escadas e telhados o comportamento de câmera/oclusão ainda exigirá
ajustes contextuais. O laboratório ocupa uma área temporária e não persiste
em qualquer salvamento.


## Laboratório V1.1 — contraste, obstáculo translúcido e HUD responsivo

A câmera isométrica confirmou que a geometria de pilhas e plataformas estava correta,
mas o volume parecia lavado e a antiga silhueta transparente da Deusa criava o
efeito visual de "fantasma". O usuário aprovou seguir com estas correções.

### Alterações

- **Topo original:** utiliza os pixels da Nuvem Sólida 512×512 aprovada, sem
  editar a imagem.
- **Duas intensidades laterais:** multiplicadores de cor diferenciados
  (N/S: `0xc7cae1`; L/O: `0x9eafcf`). A mesma imagem é usada nas três
  orientações. A mudança afeta somente a apresentação no Three.js.
- **Oclusão invertida:** a Deusa é desenhada com opacidade 100% e teste de
  profundidade normal. Um shader no material da **nuvem 512** identifica,
  no espaço da câmera, os fragmentos realmente à frente do centro da personagem.
  Dentro de uma região suave proporcional ao tamanho do sprite, os obstáculos
  são recortados da passagem opaca e redesenhados parcialmente transparentes,
  antes da Deusa. Isso preserva suas cores sem colocar o sprite sempre à frente.
- **Interface:** barra de ações primárias, botão **Mais opções** para controles
  experimentais/legados, ajuda retrátil e texto de status abaixo da barra.
  Não há mais posições absolutas independentes que sobrepõem os rótulos
  quando os botões ocupam mais de uma linha.
- **Diagnósticos:** botão **Arestas** permanece no menu de opções; seleção e
  construção ainda usam a geometria real (não o shader visual).

### Reproduzir o teste

1. `git fetch origin` e `git pull --ff-only` na branch experimental.
2. Executar `npm run dev` e abrir
   `?mundo=santuario&render=three`.
3. Em **Mais opções**, carregar a textura pela ação **Carregar nuvem 512**.
4. Clicar **Criar laboratório 3D** e alternar superior/isométrica.
5. Selecionar **Testar oclusão (Deusa)**, aproximar da parede de dois níveis.
6. Conferir que somente a parede entre a câmera e a personagem fica esmaecida.
7. Em **Mais opções**, ligar **Arestas** para verificar o alinhamento; desligar
   para avaliar o acabamento final.

### Limitações da V1.1

- O recorte está ativado somente no material **Nuvem 512**. Os outros blocos
  ainda não usam a mesma máscara.
- A máscara usa a profundidade no centro do sprite como aproximação;
  paredes muito altas, sprites maiores e sobreposições complexas podem exigir
  um recorte mais preciso por pixel ou transparente por objeto.
- A solução é visual e experimental; ainda não substitui a regra futura para
  telhados ou ambientes internos de vários andares.
- Mesmo com os testes de código aprovados, a suavidade do efeito depende de
  validação manual no navegador, inclusive em dispositivos móveis.


## Laboratório V2 — seis materiais, arquitetura, montanhas e ilhas (10/11/2026)

Este recurso está disponível apenas em `?mundo=santuario&render=three`, na branch experimental do PR #86.

### Como testar

1. Atualizar a branch local e executar `npm run dev`.
2. Baixar e descompactar o pacote `Orvalis_Santuario_V2_Materiais_80-85.zip` fornecido na conversa.
3. Clicar **Laboratório V2** na barra superior.
4. Abrir **Mais opções → Carregar materiais 80–85** e selecionar **os seis PNGs ao mesmo tempo** (80, 81, 82, 83, 84 e 85).
5. Em **Mais opções**, escolher **Visão geral** ou **Setor A/B/C/D**.
6. Alternar câmera superior/isométrica, zoom e orientação da Deusa para analisar os materiais.
7. **Recriar setores V2** reconstrói a prévia sem alterar o World.

### Setores

- **A (x=2–37, y=2–13):** galeria dos seis materiais, com cubo, coluna de 3, coluna de 5 e amostra 2×2.
- **B (x=42–77, y=2–13):** praça 9×9, altar escalonado, corredor e muralhas com aberturas.
- **C (x=2–37, y=18–29):** colina de até 3, montanha irregular até 5 e platô com diferentes coberturas.
- **D (x=42–77, y=18–29):** jardim, caminho, mini altar e ilha flutuante de demonstração.

Todos os materiais são aplicados como texturas 512×512 com coordenadas UV de mundo, repetindo a cada 4 células, e faces verticalmente sombreadas por orientação. **Nenhum PNG foi embutido no repositório**: o navegador carrega os arquivos por seleção local, sem fazer upload a um servidor.

### Segurança e limites

- A cena V2 é uma prévia geométrica em Three.js separada de `World`, sem escrita de chunks/save ou alteração de MAX_STACK.
- As colunas 4–5 e a ilha suspensa **não têm colisão, navegação, seleção construtiva nem persistência**; são objetos de avaliação visual.
- O laboratório V1 continua acessível pelo botão **Criar laboratório 3D**; ao trocar para V2 suas construções temporárias são apagadas somente dos níveis de objeto, mantendo o chão.
- Construir/remover permanece desabilitado na prévia V2. Para construir de verdade até 3 blocos, retornar ao laboratório V1.
- As cinco texturas originalmente em JPEG foram redimensionadas e tiveram as bordas preparadas tecnicamente (faixa simétrica de 48 px). O erro RGB nas bordas é 0, mas é obrigatório avaliar repetição **visual** e efeitos artísticos antes de aprovar os materiais como assets de produção.
- A nuvem ID 80 usa a referência seamless já aprovada, sem alteração no desenho.
- A integração definitiva dos PNGs no jogo público e os pavimentos reais ainda são etapas futuras.

## Laboratório V2.1 — colisões verticais, câmera e correção das texturas (10/11/2026)

### Colisões e elevação da câmera
A V2 agora usa `sanctuaryV2Collision.ts`, um mapa de alturas temporário
derivado das mesmas células desenhadas no Three.js. Reutiliza a movimentação
`Player/Walker` para impedir avanço por paredes altas e permitir degraus de
até 1 bloco. Ao selecionar **Mais opções → Explorar setor (Deusa)**, a câmera
passa a acompanhar suavemente a altura visual do personagem.

Para reproduzir uma subida controlada, selecionar **Testar subida 1→4 (platô)**:
o setor C possui degraus garantidos nas posições locais (29..32, 24).
O visor apresenta o nível lógico e a altura visual.

As montanhas de 4–5 níveis agora são superfícies caminháveis apenas dentro
desta prévia temporária. A ilha suspensa continua sem navegação no topo.
A implementação não modifica o `World`, `MAX_STACK`, chunks ou save.

### Problema detectado nas texturas PNG 81–85
Capturas mostraram manchas parecidas com pintura arrastada nos pisos e
laterais. A causa foi confirmada diretamente nos arquivos preparados:
a correção anterior de seamless estendia pixels nas faixas de borda e
gerava riscos verticais e horizontais. Não era uma falha da geometria UV.

**Kit V2.1 corrigido:** `Orvalis_Santuario_V2_1_Materiais_80-85_sem_estiramento.zip`
(distribuído na conversa, não commitado). Os cinco materiais 81–85 foram
recriados das artes originais sem esticar pixels, com ajuste simétrico em
faixa de 20 px e bordas opostas idênticas. A Nuvem Sólida 80 não foi alterada.
O ZIP contém PNGs 512×512 e testes 4×4 para comparação.

Para validar: em **Mais opções → Carregar materiais 80–85**, selecionar os
seis PNGs **do kit V2.1**, substituindo os antigos no navegador. Verificar
principalmente os ornamentos e as pedras dos setores B, C e D em zoom alto.

A igualdade matemática dos pixels de borda não implica alinhamento artístico
perfeito. A substituição depende de validação visual no navegador.


## Validação visual e funcional aprovada pelo usuário — 10/11/2026

O usuário testou a V2.1 no navegador e confirmou:
- **Texturas V2.1:** faixas/manchas de pintura arrastada eliminadas.
- **Subida de níveis:** funcionando corretamente.
- **Colisão dos pés:** funcionando corretamente.
- **Câmera vertical:** acompanha corretamente a elevação.

Esses quatro itens passam do estado "pendente de teste visual" para **aprovado no laboratório experimental**. O feedback não constitui aprovação de toda a experiência V2 nem autoriza mesclar o PR: permanecem pendentes navegabilidade da ilha suspensa, escadas/andares reais, integração dos PNGs 80–85 como assets versionados e salvamento de múltiplas alturas.

**Próxima fase proposta:** consolidar o kit V2.1 no fluxo de assets, testar descidas/bordas/obstáculos e projetar uma casa modular de dois pavimentos com escadas, piso superior e oclusão adequada. Manter V2 e o mundo principal isolados até validação.


## Casa Celestial 5×5, dois pavimentos — etapa experimental (10/11/2026)

Primeiro protótipo modular de interior tridimensional, isolado do jogo
principal e dos salvamentos, no **Setor D** do Laboratório V2.

### Construção
- Área **5×5 células**, localização local `x=70..74`, `y=25..29`.
- Entrada pela face sul: `(72,29)`.
- Piso térreo navegável no nível `0`.
- Escada de quatro posições: `(71,28)=1`, `(71,27)=2`,
  `(71,26)=3`, `(72,26)=4`.
- Segundo pavimento navegável no nível `4` (independente do nível 0 no
  mesmo X/Y, sem substituir as regras do resto do mundo).
- Paredes laterais, janela aberta no pavimento superior, cobertura superior
  demonstrativa e moldura de porta; materiais 82/83/84/85 (seis texturas V2.1
  são carregadas localmente no browser, sem upload).
- Ao entrar, paredes voltadas à câmera e telhado ocultam-se de forma
  contextual; a Deusa mantém a arte 2D original.

### Como testar
1. Atualizar `feat/santuario-three-experimental` e rodar `npm run dev`.
2. Abrir `?mundo=santuario&render=three`.
3. Ativar `Laboratório V2` e carregar o kit PNG V2.1 em **Mais opções**.
4. Em **Mais opções**, clicar em **Testar casa 5×5 (2 andares)**.
5. Entrar pela porta ao sul; chegar ao pé da escada passando pela área
   `(72,28)`, virar à esquerda para `(71,28)` e subir para o norte
   por `(71,27)` e `(71,26)`. O degrau final fica em `(72,26)`.
6. Caminhar no segundo pavimento e descer pelo mesmo trajeto.
7. Conferir o HUD de altura, a câmera, a colisão com paredes e a
   alternância entre paredes/telhados visíveis e ocultos.
8. Usar **Mostrar/ocultar casa 5×5** para comparar o laboratório antes/depois.

### Restrições

O modelo é uma **prévia funcional experimental**. A navegação entre
pavimentos usa leitura de altura dependente do nível atual da Deusa, sem
alterar `World`, `MAX_STACK`, chunks ou formato de salvamento.
Quando a casa está desativada, o laboratório mantém a física V2 anterior.
A geometria usa a mesma biblioteca de texturas PNG 512×512, sem produzir
ou distribuir modelos 3D fotorrealistas.

**Ainda a validar visualmente:** recorte de paredes e telhado, leitura das
janelas, percepção do segundo pavimento, transição do quarto degrau,
descida, câmera e desempenho móvel. Não mesclar o PR antes desta inspeção.


## Deusa da Vida — pranchas isométricas 4×4 (10/11/2026)

Foram recebidas **três folhas** 1254×1254 JPEG em grade 4×4,
preservando o desenho celestial (auréola, flores, asas, vestido branco/dourado):
- **Idle:** quatro direções, quatro quadros por linha, pequenas variações de repouso.
- **Caminhada:** quatro direções, quatro quadros por linha, ciclo de passos.
- **Sentar/levantar:** quatro direções, quatro quadros por linha.

O JPEG original tinha fundo branco. As folhas foram recortadas em 16 células
independentes, convertidas para **PNG RGBA transparente 1280×1280** (célula
320×320), com remoção do branco conectado às bordas e suavização de bordas.
As cores e a identidade da Deusa foram preservadas. É recomendada inspeção
artística das bordas delicadas de asas, cabelo e roupa após o recorte.

Pacote entregue na conversa: `Orvalis_Deusa_Isometrica_3_Pranchas.zip`.
Contém `deusa_iso_idle_4x4.png`, `deusa_iso_walk_4x4.png`,
`deusa_iso_sit_4x4.png`, manifesto e README.

### Como ativar no Three.js experimental

1. Atualizar a branch `feat/santuario-three-experimental`.
2. Abrir `?mundo=santuario&render=three`.
3. Abrir **Mais opções → Carregar pranchas da Deusa (3 PNGs)** e selecionar
   os três PNGs do ZIP juntos.
4. O jogo alterna idle/caminhada conforme o movimento e mantém a direção
   anterior quando parado; botão **Sentar / levantar** reproduz a terceira folha.
5. **Deusa isométrica: ligada/desligada** alterna com o sprite 7×4 anterior,
   sem alterar a movimentação, colisões, câmera ou o mundo 2D.

Opcionalmente, copiar os três PNGs para
`public/assets/characters/deusa-iso/` com os nomes do ZIP. Nesse caso
o Santuário Three.js os carrega automaticamente ao iniciar. Se faltarem
arquivos, o sprite anterior continua disponível como fallback.

A integração só altera **renderização experimental**. O jogo principal
continua usando as animações anteriores e nenhum arquivo de salvamento é modificado.

### Próxima etapa de arquitetura

A casa técnica 5×5 permanece como prova de conceito; a dimensão proposta para
uma residência modular real de Orvalis é **16×12 células**. A ampliação da
planta e o suporte a pisos editáveis serão desenvolvidos separadamente, para
não confundir o novo sprite isométrico com o sistema de construção do mundo.


## Construção modular 16×12 — protótipo V1 (10/11/2026)

Depois da validação da escala do personagem, o pequeno teste técnico 5×5
passa a ser apenas uma opção de compatibilidade. O novo protótipo de
**casa de dois pavimentos, 16×12 células**, aplica a escala própria de
Orvalis: os blocos são menores em relação aos personagens.

### Planta e arquitetura
- Área local do Santuário: `x=54..69`, `y=18..29`, no setor D.
- Duas entradas contíguas no sul, nas posições `(61,29)` e `(62,29)`.
- Térreo `z=0`, segundo pavimento `z=4`, cômodos separados com passagens.
- Escada **2 células de largura × 4 de comprimento**, começando em
  `(65–66,26)` com nível 1, subindo ao norte para 2, 3 e 4 em
  `(65–66,23)`. A laje superior **não cobre o vão da escada**.
- Módulos de parede e laje independentes, guardados por chaves
  `x:y:pavimento` e tipo, permitindo colocar/remover em qualquer cômodo.
- Portas e janelas são aberturas representadas geometricamente; telhado
  celestial inclinado em duas águas, removido visualmente quando a Deusa
  entra. Uma parede voltada à câmera é recortada enquanto o personagem está
  dentro do edifício, preservando as outras paredes.
- Material visual: mármores 82/83, pedra 84 e detalhes 85, sem modelos 3D
  fotorrealistas. O bloco celeste 80 continua sendo o terreno externo.

### Controles do laboratório
1. Atualizar `feat/santuario-three-experimental` e iniciar `npm run dev`.
2. Abrir `http://localhost:5173/?mundo=santuario&render=three`.
3. Ativar **Laboratório V2**, selecionar os seis PNGs V2.1 em
   **Mais opções → Carregar materiais 80–85**.
4. Clicar em **Mais opções → Casa modular 16×12 (2 pavimentos)**.
5. Entrar pelas duas portas ao sul. Seguir para a direita da casa até
   a escadaria em `(65–66,26)`, subir ao norte (y decrescente).
6. Ao alcançar o nível 4, caminhar pelo segundo pavimento e descer
   pelos mesmos degraus. A câmera segue a altura.
7. Para editar: **Editar casa: ligado**. Escolher
   **Peça: parede/piso**, **Editar pavimento: térreo/2º andar** e
   clicar numa célula da casa. Um clique alterna presença/ausência
   da peça escolhida. Não editar a célula da Deusa. A escadaria
   é protegida para preservar a rota dos testes.
8. **Recriar casa 16×12** restaura as peças iniciais. **Fechar casa
   modular 16×12** desativa a prévia e restaura o setor D anterior.

### Limites importantes
- **Sem persistência:** todas as peças são mantidas apenas na instância
  atual do navegador. NÃO alteram `World`, `Chunk`, `MAX_STACK`,
  mecanismo de salvamento, nem o mundo aberto em produção.
- O segundo pavimento tem leitura de altura separada do térreo
  na mesma coordenada XY; a integração com chunks 3D editáveis
  e inventário de materiais continua como evolução futura.
- Em vez de tornar a casa 16×12 um edifício pronto do jogo, esta fase
  valida o padrão de **construção por blocos individuais** a partir
  do qual casas livres e pré-fabricadas poderão compartilhar peças.
- Os materiais PNG V2.1 precisam ser selecionados manualmente no
  navegador, a menos que posteriormente sejam adicionados à pasta
  de assets no repositório.
- Verificar visualmente escala, alinhamento do telhado, aberturas,
  oclusão, colisões, fps e câmera nas duas perspectivas antes do merge.


## Deusa da Vida — sprites isométricos 4×4 (10/11/2026)

Três folhas produzidas pelo usuário, convertidas tecnicamente de JPG com
fundo branco para PNG RGBA recortado, sem redesenhar a personagem.

| Animação | Arquivo de 1280×1280 |
|---|---|
| Parada / idle | `deusa_iso_idle_4x4.png` |
| Caminhada | `deusa_iso_walk_4x4.png` |
| Sentar / levantar | `deusa_iso_sit_4x4.png` |

Cada prancha tem quatro linhas de direção (frente, esquerda, direita e
costas), quatro quadros por linha; cada quadro ocupa 320×320 px. O carregador
funciona no Santuário **Three.js experimental** e o sprite original 7×4
continua disponível como alternativa. O mundo 2D não foi alterado.

**Carregamento automático:** descompactar
`Orvalis_Deusa_Isometrica_Instalacao_No_Repositorio.zip` na raiz do
repositório. Os PNGs ficam em
`public/assets/characters/deusa-iso/`; no próximo `npm run dev`,
o carregador detecta os arquivos e ativa a nova arte.

**Carregamento sem instalar arquivos:** em
`?mundo=santuario&render=three`, entrar em **Mais opções →
Carregar pranchas da Deusa (3 PNGs)** e selecionar as três imagens.
Os botões **Deusa isométrica: ligada/desligada** e **Sentar / levantar**
permitem comparar animações. Apenas o teste experimental é afetado.

Os PNGs preparados estão entregues como ZIP na conversa e **não foram
commitados como binários no repositório**: permanecem disponíveis via
download e carregamento local. Antes de integrar na versão principal,
validar alinhamento dos pés, margens transparentes, sombra, escala e
a direção dos quatro movimentos no navegador.

A construção modular de 16×12 células também foi implementada
experimentalmente na branch, com peças e andares editáveis; aguarda sua
própria validação visual e funcional. Não substituir o sistema de
salvamento 2D nesta etapa.
