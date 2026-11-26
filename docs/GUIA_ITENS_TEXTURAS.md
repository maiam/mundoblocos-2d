# Guia de itens e texturas — Orvalis e Titã

Consulta em 26/11/2026. Referência de escopo: Minecraft Java Edition 26.3. As prioridades são sugestões de produção. O catálogo abaixo reúne peças que fazem sentido para os mundos do projeto e indica a arte necessária para cada uma.

## O que aproveitar da referência

O inventário do Criativo ajuda a conferir se cada tema tem variedade suficiente. A página de itens ajuda a distinguir ingredientes, equipamentos e peças que saem da mochila para virar blocos ou entidades. Para planejar arte, vale agrupar as variantes por material, cor e estado. Uma porta aberta e fechada, por exemplo, é uma peça com dois estados no mundo. Uma laje precisa da textura certa na altura certa, além do ícone.

A atualização Java 26.3 reforça duas ideias úteis para o projeto: famílias de blocos mais completas (como lajes e degraus de um mesmo material) e kits com um propósito (como um acampamento com cama de palha, assento e mapa). As propostas abaixo usam os materiais, a identidade e os sistemas do Orvalis e do Titã. Entradas técnicas, ovos de geração e variantes cosméticas em massa ficam fora da fila de produção.

Fontes: [Item, Minecraft Wiki em português](https://pt.minecraft.wiki/w/Item#Lista_de_itens), [Inventário do Criativo, Minecraft Wiki em português](https://pt.minecraft.wiki/w/Invent%C3%A1rio_do_Criativo), [Bloco, Minecraft Wiki em português](https://pt.minecraft.wiki/w/Bloco) e [notas oficiais da Java Edition 26.3](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-3). A consulta à wiki usou as páginas indexadas. Para uma consulta por variante ou por edição, abra o inventário completo na fonte.

## Ponto de partida no repositório

| Mundo | O que já existe e pode orientar a produção |
|---|---|
| Orvalis 2.5D | Tábuas de carvalho, bétula e cerejeira, paredes, portas, cercas, portões, cadeira, baú, fogueira, caldeirão e forno. Trigo, batata, cenoura, tomate e alimentos de cozinha. Ferramentas como espada, enxada, picareta, pá e machado. Ver [itens e receitas](../src/world/items.ts), [blocos](../src/world/blocks.ts) e [cultivo](domains/farming.md). |
| Santuário | Conjunto de construção com árvores, plantas, cercas e portões, além de objetos de feira e jardim. As peças já desenhadas podem orientar novas coleções e variantes. Ver [perfis de mundo](domains/worlds.md). |
| Orvalis em voxel | Grama, terra, pedra, areia de praia, toras e folhas de carvalho, bétula e cerejeira. Algumas fontes ainda são provisórias. Terra arada, terra infértil e caminho já têm PNG de referência em `extras/` e aguardam blocos. Ver [fontes das texturas](../assets-src/orvalis-voxel/README.md). |
| Titã | Rocha, gelo, areia, Âmbar e Cobre de Duna. Junco de Vidro, bloco, laje, degrau, cadeira, esteira, painel, escada e porta. Mesa de Trabalho, baú, cama, lanterna, braseiro, balde, picaretas, adagas, Noz de Duna e carnes. Ver [itens](../src/titan/items.ts), [blocos](../src/titan/voxel.ts) e [receitas](../src/titan/recipes.ts). |

## Fila de produção

**P1** completa uma família ou um ciclo já planejado. **P2** amplia um sistema existente. **P3** depende de explorar um sistema novo. Cada linha é um lote candidato, com exemplos de peças e o mínimo de arte para começar.

### P1 · Construção, cultivo e sobrevivência

| Lote | Mundo | Peças candidatas | Arte a produzir ou adaptar |
|---|---|---|---|
| P1-01 Madeira básica | Orvalis voxel | Tábua de bétula, carvalho e cerejeira, haste de madeira, mesa de carpintaria | Reaproveitar as fontes V2 das tábuas. Ícone da haste. Topo de trabalho, laterais e ícone da mesa. Começar pela bétula, cuja tora já tem arte escolhida. |
| P1-02 Vedação de madeira | Orvalis voxel | Laje, degrau, cerca, portão e porta de bétula | Derivar laje e degrau da tábua. Modelos e ícones para cerca, portão e porta. Prever encaixe das travessas e dobradiças para aberto e fechado. |
| P1-03 Folhas e orla | Orvalis voxel | Folhas de bétula, carvalho e cerejeira, areia de praia, toras de carvalho e cerejeira | Copas com silhuetas distintas, areia repetível e toras com anéis no topo e casca lateral. Substituir as versões provisórias por família. |
| P1-04 Pedra de obra | Orvalis voxel | Pedra bruta, pedra lisa, tijolo de pedra, laje, degrau e mureta | Criar a partir da pedra local. Testar juntas repetíveis e cortes da laje e do degrau com a mesma escala de textura. |
| P1-05 Solo de cultivo | Orvalis voxel | Terra arada seca e úmida, terra infértil, caminho | Adaptar as três fontes em `extras/`. Topo por estado e lateral compatível com a terra do jogo. Conferir o nível visual do sulco e do caminho. |
| P1-06 Horta | Orvalis voxel | Semente de trigo, trigo, cenoura, batata, tomate | Ícone para cada pilha, variações de crescimento e silhuetas distintas na colheita. Aproveitar a identidade das plantas do Orvalis 2.5D. |
| P1-07 Ferramentas iniciais | Orvalis voxel | Machado, picareta, pá e enxada de madeira e pedra | Sprites planos transparentes com pivô no cabo. Começar com machado e picareta para completar o ciclo de madeira e pedra. |
| P1-08 Fechamento de junco | Titã | Cerca, portão e alçapão de Junco de Vidro | Usar a trama do painel e da porta existentes. Criar travessas, pivôs, estados aberto/fechado e silhuetas próprias para os ícones. |
| P1-09 Abrigo da margem | Titã | Caixote raso, prateleira, cobertura leve de junco | Reusar madeira ou fibra apenas quando a fonte for coerente com o kit. Usar o baú, a cama e a lanterna já existentes para validar o conjunto no mundo. |

### P2 · Ofícios, móveis e exploração

| Lote | Mundo | Peças candidatas | Arte a produzir ou adaptar |
|---|---|---|---|
| P2-01 Cerâmica | Orvalis voxel | Argila, tijolo cru, tijolo queimado, bloco, telha, vaso | Ícones por etapa. Textura repetível de tijolos. Modelos ou formas próprias para telha e vaso. |
| P2-02 Construção colorida | Orvalis | Vidro, painel de vidro, tecido, tapete e reboco pigmentado | Transparência e bordas para o vidro. Trama base e pequena paleta para tecido e reboco. Derivar cores da mesma base quando preservarem a leitura. |
| P2-03 Bancadas de ofício | Orvalis voxel | Bancada de corte de pedra, bigorna, tear, bancada de tintura | Um conjunto por função com área de trabalho legível, ícone e modelo ou faces distintas. |
| P2-04 Armazenamento e sinalização | Orvalis voxel | Baú de madeira, barril, placa, moldura, estante | Tampa do baú em movimento, placa de parede e de chão, madeira reaproveitada. O conteúdo exibido pode variar com a mesma moldura. |
| P2-05 Kit de acampamento | Orvalis voxel | Fogueira, banco, catre de palha, almofada e tenda | Brasa e chama separadas da fogueira. Modelos de baixo perfil para assentos e cama. Tenda com interior legível. |
| P2-06 Cozinha | Orvalis voxel | Forno, caldeirão, tigela, farinha, pão, sopa de cogumelos, torta de maçã | Forno apagado e aceso. Recipiente vazio e cheio com o mesmo contorno. Ícones para ingredientes e pratos. |
| P2-07 Plantas silvestres | Orvalis | Cogumelos de tronco, bagas, flores, musgo e muda de macieira | Modelos de vegetação ou recortes com alfa real, silhuetas por espécie e ícones para itens colhidos. |
| P2-08 Criação de animais | Orvalis voxel | Ovo, leite, lã, couro, ração e comedouro | Ícones originais dos produtos e modelo do comedouro. Depende dos animais e suas interações no voxel. |
| P2-09 Mineração e metalurgia | Orvalis voxel | Veio, fragmento bruto, lingote e bloco compacto de cobre e ferro | Textura de veio sobre a rocha local. Ícones com silhuetas diferentes para bruto e refinado. Primeiro validar um metal de ponta a ponta. |
| P2-10 Âmbar e cobre | Titã | Grade de cobre, rebite, placa de liga, luminária de âmbar | Metal coerente com o Cobre de Duna; emissivo separado para a luminária acesa. Usar lingote, brasa e braseiro existentes como referência interna. |
| P2-11 Tecido e fibra | Orvalis / Titã | Fio de seda, corda de junco, rolo de tecido, bolsa e bandeira | Cada mundo usa seu material local. Sprites planos para ingredientes e bolsa, arte de frente e verso para bandeira. |
| P2-12 Pesca | Orvalis / Titã | Vara, anzol, isca, peixe cru, peixe assado e cesto de pesca | Sprite da vara e isca, boia visível no mundo, silhuetas dos peixes e modelo do cesto. Depende de interação de pesca. |
| P2-13 Defesa de viagem | Orvalis / Titã | Arco, flecha, escudo e proteção de couro ou carapaça | Estados do arco em repouso e tensionado, silhueta própria do escudo, ícones de proteção e arte equipada conforme o mundo. |
| P2-14 Orientação | Orvalis / Titã | Mapa de trilha, bússola, luneta e marco de rota | Ícone para cada ferramenta e arte da interface que mostra direção ou região. O Titã já tem o Marco de Margem como referência visual. |
| P2-15 Líquidos e recipientes | Orvalis voxel / Titã | Balde vazio, balde com água, jarro e frasco | Usar estados reconhecíveis pelo conteúdo e manter o contorno do recipiente. No Titã, balde vazio e cheio já existem. |

### P3 · Sistemas para explorar depois

| Lote | Mundo | Peças candidatas | Arte e dependência |
|---|---|---|---|
| P3-01 Transporte | Orvalis / Titã | Balsa de junco, barco de madeira, carrinho de carga, trilho e sela | Modelos com escala de personagem, posição de embarque e carga, ícones. Depende de navegação e montaria. |
| P3-02 Alquimia | Orvalis | Frasco vazio, essência de flor, poção de cura, antídoto e mesa de preparo | Mesma família de frascos, silhueta ou selo para distinguir efeitos além da cor. Depende de efeitos e receitas. |
| P3-03 Mecanismos | Orvalis / Titã | Alavanca, placa de pressão, sino, relé e portão automático | Estados legíveis em repouso e ativo. Depende de protótipo de sinais e conexões. |
| P3-04 Arqueologia e coleção | Orvalis | Pincel, caco de cerâmica, vaso montado, chave antiga, relicário | Ícones e detalhes de superfície para compor conjuntos. Depende de sítios de descoberta e recompensas. |
| P3-05 Regiões distantes | Orvalis / Titã | Rocha vulcânica, cristal de caverna, material de coral e planta luminosa | Famílias de cor e textura por bioma, com emissão separada quando aplicável. Depende de região, geração e propósito de cada material. |
| P3-06 Tesouros de aventura | Orvalis | Medalhão de guilda, troféu de criatura, moeda de prata, moeda de ouro | Ícones de leitura rápida, com borda e símbolo próprios por denominação ou origem. Conferir a moeda de cobre existente. |

## Entrega de arte por tipo

| Tipo | Arquivos ou estados | Conferência |
|---|---|---|
| Bloco do Orvalis 2.5D | Prancha frontal-superior híbrida com topo quadrado e face frontal. Separar topo, frente e franja quando o contrato pedir. | Testar o encaixe, empilhamento e continuidade do material no jogo. [Materiais V2](materiais-v2/README.md) |
| Bloco voxel | PNG fonte por face distinta. Tora pede corte e casca. Grama pede topo, transição lateral e base quando diferente. O terreno usa 16 px por face e 8 px na vista isométrica. | Testar repetição em 4 × 4 e em pilha. Conferir em primeira pessoa e na isométrica, inclusive bordas de peças cortadas. [ADR 0106](adr/0106-titan-16px-e-visao-isometrica-2-1.md) |
| Item plano voxel | Sprite de 16 × 16 com alfa, sem marca d’água. O atlas da interface recebe arte de 16 ampliada para 32. Ferramenta diagonal com cabo embaixo à esquerda. | Conferir na hotbar, no inventário e na mão. A extrusão usa o contorno dos pixels opacos. [ADR 0097](adr/0097-titan-regra-visual-sprite-2d-extrudado.md) |
| Peça colocável com modelo | Modelo, textura, ícone próprio ou derivado e estados que o jogador reconhece, como tampa aberta ou braseiro aceso. | Conferir pivô, rotação, escala, colisão aproximada e leitura com peças vizinhas. |
| Vegetação ou líquido | Alfa real para recortes e transparência quando o material exigir. Variações de crescimento ou de superfície conforme o sistema. | Conferir contra fundos claros e escuros, no mundo e na resolução final. |

Para validar um lote voxel, registrar a fonte editável e usar [o pipeline existente](OPERATIONS.md#pipeline-de-arte). No Orvalis voxel, `npm run texturas` regenera os atlas e os ícones derivados. A vitrine `?mundo=orvalis3d&cena=texturas` em desenvolvimento cobre blocos de terreno. Conferir peças móveis e itens na mão pela partida normal.

Ao selecionar uma peça, anotar **mundo, nome, função, obtenção, representação, variantes e estados, arte de origem, arquivos a criar, dependências e forma de validar**. Marcar o estágio como **ideia**, **fonte existente**, **arte pronta**, **integrado** ou **validado**. Usar uma entrada por peça selecionada e tratar as variações de direção como estados da mesma peça quando compartilham o item de inventário.
