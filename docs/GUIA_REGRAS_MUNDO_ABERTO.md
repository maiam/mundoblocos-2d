# Guia de referência para jogos de mundo aberto

> **Nota (v0.183.0):** o Orvalis 2D/2.5D e o Santuário foram removidos (ADR 0115); as referências a `World`, `ActionController`, NPCs e à sala 2.5D descrevem o código antigo, hoje em `archive/2d/`.

**Orvalis e Titã · 26/11/2026 · escrito sobre a v0.172.0 e conferido com a v0.180.0**

Use este guia para desenhar uma mecânica, localizar suas dependências e definir como ela será testada. **Referência** descreve padrões observados no Minecraft Java. **Hoje** descreve este repositório. **Proposta** indica um caminho para discussão. Os valores locais servem para entender o ponto de partida e devem ser conferidos no código antes de mudar uma regra.

A pesquisa usa o Minecraft Java 26.3 como recorte. A wiki em português mistura edições e versões em algumas páginas. Foram consultadas as páginas indexadas, complementadas pela wiki em inglês e pelas notas oficiais. Valores de spawn, física e distâncias do Minecraft variam conforme a edição, o ambiente e a versão.

## 1. Qual mundo estamos desenhando?

| Mundo | Modelo atual | O que preservar ao propor uma regra |
|---|---|---|
| Orvalis 2.5D | Grade X/Y, altura de pilha separada, terreno por seed, Cidade do Despertar fixa e interiores em áreas reservadas. | `World` decide onde pisar, colocar e quebrar. Use `SUBDIV` ao converter medidas de jogabilidade para células e `cubeLevels` para converter níveis em altura visual. |
| Santuário | Perfil do motor 2.5D, região finita, cenário e construção próprios, câmera isométrica fixa. | Defina exceções em `WorldProfile`. Confira a disponibilidade de peças e a proteção ou liberdade de edição no perfil. |
| Titã | Volume voxel X/Y/Z, 1 m por bloco, gerador próprio. Região atual de 128 × 128 no gerador recente, com eixo Y de −64 a 319. A região dos saves antigos pode ser menor. | `TitanVolume` sobre `TerrainGen`. Versão do gerador do Titã: 13. Preservar as versões que os saves usam. |
| Orvalis voxel | Mesmo motor do Titã, gerador próprio, ilha de 128 × 128 com Campos, Bosque de Sakura e mar. | `OrvalisGenerator` v1, banco separado e perfil próprio. Madeira, pedra de obra, solo, ferramentas e horta já estão integradas (E1 a E5, ADR 0107 a 0113). Cidade, cavernas, minérios e fauna do Orvalis ainda aguardam integração neste modo. |

Fontes do projeto: [mapas do sistema](MAPS.md), [mundo 2.5D](archive/2d/world.md), [perfis](domains/worlds.md), [Titã e Orvalis voxel](domains/titan.md). Os dois motores têm unidades diferentes: escreva sempre **blocos**, **células**, **níveis**, **metros** ou **pixels** junto da medida.

## 2. Seed, geração de terreno e exploração

A referência Java prepara terreno em etapas para combinar biomas, relevo, estruturas, vegetação, luz e criaturas. Podemos usar essa divisão para testar cada camada. A ordem abaixo é um roteiro para o projeto, com ajustes onde as camadas dependem umas das outras. [Semente](https://pt.minecraft.wiki/w/Semente_%28gera%C3%A7%C3%A3o_de_n%C3%ADvel%29) · [Geração de mundo](https://minecraft.wiki/w/World_generation) · [Java 26.3](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-3)

| Camada | Regra a definir | Aplicação no projeto |
|---|---|---|
| Identidade | Fixar mundo, seed e versão do gerador. Derivar números por coordenada e por finalidade de geração. | **Hoje:** o voxel guarda a versão do gerador no save. **Proposta:** separar fontes de aleatoriedade para relevo, minério, árvore e estrutura, para que ajustar uma densidade não mude todas as demais. |
| Relevo | Definir altitude do mar, planícies, picos, declives, largura dos vales e transições. | **Hoje:** mar voxel com superfície em Y = 64. Orvalis voxel combina colinas, montanhas, baías e rios. **Proposta:** conferir uma seção lateral e um mapa de altura para cada seed de teste. |
| Bioma | Atribuir perfil de superfície, vegetação, recursos, fauna, paleta e condições locais. Suavizar as fronteiras quando fizer sentido. | **Hoje:** Titã tem regras da Margem em `biomes.ts`. Orvalis voxel separa Campos e Sakura. **Proposta:** equilibrar cada bioma por disponibilidade e função, além da aparência. |
| Superfície e subsolo | Escolher material do topo por altura e encosta, espessura das camadas e material profundo. | **Hoje:** o Orvalis voxel usa areia perto do mar, pedra em encostas e pontos altos e terra com grama nos demais pontos. |
| Cavernas e água subterrânea | Definir entradas, conexões, altura, visibilidade, galerias inundadas, saída e recursos. | **Proposta:** validar primeiro um conjunto acessível de galerias com uma entrada segura. Distinguir geração de cavidade de simulação de fluido. A caverna não deve cortar fundações reservadas sem regra explícita. |
| Veios | Definir profundidade, rocha hospedeira, densidade, tamanho de veio, recurso extraído e ferramenta exigida. | **Hoje:** o Titã tem regras de veios em `ores.ts` e no gerador. **Proposta:** para Orvalis voxel, provar o ciclo de um metal antes de abrir várias faixas de minério. |
| Árvores e decoração | Reservar posição da raiz e área de crescimento. A copa pode cruzar a borda de um chunk. | **Hoje:** o voxel de Orvalis calcula toras e copas pelo gerador. **Proposta:** consultar candidatos dos chunks vizinhos quando a peça atravessar a fronteira. |
| Estruturas fixas ou procedurais | Definir área ocupada, piso de entrada, sobreposição com outras estruturas, interior, proteção e saque. | **Hoje:** a Cidade do Despertar tem seed própria no 2.5D, e os interiores e a dungeon são protegidos pelo `World`. **Proposta:** reservar a fundação antes de gerar árvores, rios e cavernas da cidade voxel. |
| Chegada e renascimento | Procurar solo válido e espaço para o corpo. Definir distância de água perigosa, altura de queda, criaturas e acesso a recursos. | **Hoje:** Orvalis voxel procura uma clareira. O 2.5D usa a cidade sem tenda; o Titã tem retorno pela cama. **Proposta:** validar a posição de chegada em um conjunto fixo de seeds e tratar uma cama removida com ponto de retorno alternativo. |

**Contrato para novos geradores.** A mesma consulta deve devolver o mesmo terreno com a mesma seed, versão e coordenada, mesmo que o jogador atravesse os chunks em outra ordem. Aplique as alterações do jogador sobre o terreno base, inclusive o ar que representa um bloco retirado. Teste costuras de árvore, água, caverna e estrutura nos dois sentidos. Se um algoritmo novo alterar o terreno antigo, use uma versão nova e defina como o mundo salvo continua abrindo. [Contrato TerrainGen](../src/titan/terrain.ts) · [Volume voxel](../src/titan/volume.ts) · [Gerador Titã](../src/titan/generator.ts) · [Gerador Orvalis voxel](../src/titan/orvalis/generator.ts)

## 3. Chunks, distâncias e custo por quadro

Chunk é a unidade para organizar o terreno. Uma seção voxel é a parte vertical que pode ser desenhada e atualizada por vez. No motor voxel, os chunks têm base **16 × 16** e as seções **16 × 16 × 16**. A coordenada do chunk deve usar divisão com arredondamento para baixo, inclusive a oeste e ao norte da origem. Um bloco em X = −1 pertence ao chunk −1, na posição local 15. [Formato de chunk](https://pt.minecraft.wiki/w/Formato_de_chunk) · [Distâncias na Java 26.3](https://www.minecraft.net/en-us/article/minecraft-java-edition-26-3)

| Área | Para que serve | Regra prática |
|---|---|---|
| Geração e carregamento | Preparar terreno, ler alterações e disponibilizar vizinhos. | Carregar primeiro o chão, a colisão e a chegada. Antecipar a direção de deslocamento com um limite de trabalho por quadro. |
| Simulação | Atualizar entidades, cultivo, fluido e estações. | Cada sistema define raio e cadência. Titã solo tem raio de 56 m para criaturas e cultivo. As salas têm regras próprias em `TitanRoom`. |
| Renderização | Selecionar o que a câmera desenha. | No voxel, `RANGE` é 64 e o jogo solo limita a apresentação de criaturas aos 8 mais próximos elegíveis. Ajustar a distância de renderização não deve alterar loot, cultivo ou IA. |
| Persistência | Guardar o que sobreviverá ao descarregamento e ao fechamento. | Gravar chunks alterados, dados de entidades persistentes e o cabeçalho do mundo. Definir como retomar contadores e tarefas pendentes quando voltar. |

**Malha e memória.** Remover faces ocultas, agrupar faces compatíveis quando o material permitir e separar opacos, folhas, fluidos e modelos. Ao editar uma borda, invalidar as seções vizinhas que leem essa face. Priorizar trabalho perto do jogador e liberar recursos de GPU quando forem substituídos ou descartados. Medir tempo de geração, tempo de malha, fila pendente, JS por quadro, GPU e memória em um trajeto de ida e volta. [Seções](../src/titan/sections.ts) · [Malha](../src/titan/mesher.ts) · [Render do Titã](../src/render/titanRenderer.ts)

## 4. Céu, luz, névoa, clima e água

| Sistema | Referência e regra sugerida | Estado do projeto |
|---|---|---|
| Horizonte | Suavizar o fim do terreno visível alinhando a névoa à cor do horizonte. Separar névoa de distância, névoa de clima e efeito de imersão. | **Hoje:** voxel em 1ª pessoa usa névoa ligada à cor de fundo e ajustada no mergulho. Isométrica sem névoa de distância. |
| Hora e clima | Separar relógio do mundo de aparência e consequências do clima. Parâmetros de cor, claridade e visibilidade podem variar por região e hora. | **Hoje:** ciclo voxel de 20 min. **Proposta:** começar com dois estados climáticos, transição gradual e condições explícitas para seus efeitos. |
| Luz | Manter luz ambiente e de fontes locais separadas. Definir o que transmite luz e o que bloqueia. | **Hoje:** lanterna e braseiro aceso iluminam blocos no Titã, e a hora varia no shader. **Proposta:** para spawn por escuridão, usar um valor de jogo consultável e consistente no servidor. |
| Água | Separar volume, superfície visível, colisão, corrente, consumo de ar e atenuação visual. | **Hoje:** no voxel, pés em líquido mudam locomoção, olhos imersos mudam visual e respiração. O Titã tem balde, saída da água e enchente ao abrir passagem. |
| Quedas de material | Definir quais blocos exigem apoio, o que ocorre com o material móvel e como pousa ou vira item. | **Proposta:** um bloco granular de teste com limite por atualização e destino previsível. Usar entidade em queda quando a animação e a colisão exigirem. |

Fontes: [Névoa](https://minecraft.wiki/w/Void_fog), [Opções](https://minecraft.wiki/w/Options), [Bloco em queda](https://pt.minecraft.wiki/w/Bloco_em_queda), [Céu voxel](../src/titan/sky.ts), [Imersão](../src/titan/underwater.ts), [Regras de bloco voxel](../src/titan/voxel.ts).

## 5. Tempo e mudanças no mundo

| Tipo de atualização | Use para | Cuidado |
|---|---|---|
| Passo da simulação | Movimento, ataque, dano, controle de tempo e física que exige ordem. | Definir unidade e cadência. Limitar passos acumulados depois de travamento da aba. A velocidade do monitor não deve alterar resultados. |
| Evento de vizinhança | Perda de suporte, mudança de luz, quebra adjacente à água, porta e cercas. | Deduplicar a fila e impor orçamento. Uma reação em cadeia precisa de limite e de estado consistente durante o processamento. |
| Evento agendado | Forno, regeneração, porta temporizada e retorno de criaturas. | Decidir se o tempo anda fora da área ativa ou em partida fechada. Persistir prazo ou progresso quando isso tiver efeito sobre o jogo. |
| Amostragem periódica | Crescimento e mudanças naturais que podem acontecer aos poucos. | Determinar a área ativa, frequência e distribuição. O Titã já usa amostragem no cultivo. |
| Quadro visual | Câmera, interpolações, partículas e sons. | Partículas e quadros de animação podem ajudar a comunicar o estado. O resultado da ação vem da simulação. |

A referência Java usa nominalmente 20 tiques de jogo por segundo e distingue atualizações agendadas de amostragem aleatória. O projeto usa cadências próprias. [Tique](https://pt.minecraft.wiki/w/Tick) · [Formato de chunk](https://pt.minecraft.wiki/w/Formato_de_chunk) · [Cultivo do Titã](../src/titan/crops.ts)

## 6. Criaturas, NPCs e encontros

| Origem | Regra proposta | Estado do projeto |
|---|---|---|
| Fauna vinculada ao terreno | Gerar candidatos por seed, habitat e superfície. Reservar espaço para andar e aplicar limite local por espécie. | Titã: Farejador de Duna associado à Noz de Duna, com especificações de criatura e raio de simulação. Orvalis 2.5D: animais do campo, comportamento e reprodução no seu motor. |
| Hostil periódico | Tentar em região ativa, fora da zona imediata do jogador. Validar espaço, apoio, bioma, dificuldade, iluminação e teto regional. | Orvalis 2.5D tem monstros, acampamentos e dungeons. Uma regra genérica de monstros por escuridão no Orvalis voxel é proposta. |
| Encontro fixo | Vincular a uma estrutura, missão, arena ou ao relógio do mundo. Declarar condição de ativação e fronteira do encontro. | Goblins de acampamento e monstros de dungeon no 2.5D oferecem precedentes. Os monstros da dungeon ficam no interior. |
| NPC persistente | Dar identidade, casa, local de trabalho, horário, oferta, memória mínima e comportamento quando não encontra caminho. | Orvalis 2.5D já tem moradores, rotinas, diálogos, memória e missões. A adaptação ao voxel depende da cidade e de navegação própria. |
| Invocação e reprodução | Validar custo, espaço, limite, cooldown e identidade do novo ator. A ação deve ter confirmação única. | Existem regras de reprodução no 2.5D. Invocações e criadouros voxel pedem regras por espécie. |

**Ciclo de vida.** Atribuir ID estável. Distinguir criatura simulada, criatura fora de atividade, criatura descartável removida e criatura morta aguardando retorno. NPCs de missão, animais vinculados e chefes podem precisar sobreviver ao descarregamento. Para retorno, conferir tempo, espaço, distância do jogador e se o encontro ainda faz sentido. Definir o que acontece com NPC ou mob atravessando o limite da área ativa.

**Comportamento.** Uma máquina de estados pode começar com repouso, patrulha, alerta, perseguição, ação, fuga e retorno. NPCs precisam também de destinos e tarefas por horário. Use percepção por alcance e linha de visão, navegação com tentativas limitadas e alternativa para caminho bloqueado. Agende busca de caminho por necessidade. A dificuldade pode ajustar frequência de encontros, agressividade, dano ou recompensas, com parâmetros configurados por mundo.

Fontes: [Geração](https://pt.minecraft.wiki/w/Spawn), [Criatura](https://pt.minecraft.wiki/w/Criatura), [Aldeão](https://pt.minecraft.wiki/w/Alde%C3%A3o), [Comércio](https://pt.minecraft.wiki/w/Com%C3%A9rcio), [NPCs do Orvalis](archive/2d/npc.md), [Criatura voxel](../src/titan/creature.ts).

## 7. Blocos, ferramentas, ações e fabricação

| Regra | Como especificar |
|---|---|
| Identidade e estado | Separar ID de bloco, ID de item e entidade. Definir forma de colisão, opacidade, suporte, orientação, dureza, ferramenta e loot. Porta, cama, baú e luzes podem precisar de estado ou ocupar mais de uma célula. |
| Colocar e remover | Resolver mira e face, alcance, apoio, colisão com jogadores, restrição da região, disponibilidade na pilha e resultado. Itens soltos deslocados e peças com várias células pedem validação conjunta antes da mudança. |
| Quebra progressiva | A regra de tempo vem de material e ferramenta. Mudou alvo, perdeu alcance ou soltou o gesto: definir se reinicia. O overlay comunica progresso, e o dano de ferramenta acompanha a ação concluída. |
| Coleta e loot | Especificar origem, condição, quantidade, destino e se a origem volta. Separar item entregue diretamente, entidade coletável e conteúdo de recipiente. |
| Ferramenta e equipamento | Declarar ações, eficiência, durabilidade, requisitos e quebra. Manter o mesmo vocabulário na mão, na hotbar e no inventário. |
| Receitas e estações | Validar ingredientes, quantidade, espaço de saída, estação e eventuais requisitos antes do débito. Consumir ingrediente e produzir resultado juntos. Para processamento, separar combustível e progresso. |
| Cultivo e produção | Definir substrato, água ou luz exigida, fases, colheita, replantio e produção por tempo. Separar regra de crescimento de arte por fase. |
| Mecânica de sinais | Se houver circuitos, definir emissão, direção, propagação, atraso, prioridade de vizinhos e limite de reação em cadeia. Começar com um interruptor, um receptor e uma porta. |

**Hoje:** `World` e `ActionController` governam o 2.5D. No voxel, `actions.ts`, `voxel.ts`, `breaking.ts`, `items.ts` e `recipes.ts` concentram essas regras. A mesa do Titã usa grade 3 × 3 e o braseiro tem processamento por estado. A coleção de junco oferece exemplos de laje, degrau, porta e peças que usam modelo e colisão própria. [Bloco](https://pt.minecraft.wiki/w/Bloco) · [Componentes de item](https://pt.minecraft.wiki/w/Componentes_de_item) · [Ações voxel](../src/titan/actions.ts) · [Receitas voxel](../src/titan/recipes.ts)

## 8. Gravidade, arremesso, queda e colisão

Três objetos podem seguir uma trajetória e ter consequências diferentes. O tipo da entidade determina o que acontece no impacto, na água, quando a região descarrega e depois de salvar.

| Objeto | Comportamento | Hoje no voxel ou proposta |
|---|---|---|
| Corpo do jogador | Aceleração, velocidade limite, pulo, degrau, colisão, água e dano na chegada ao chão. | **Hoje:** gravidade do corpo de 28 m/s². O movimento tem pulo, passagem por degraus e tratamento de líquido em `physics.ts`. |
| Pilha largada ou saque | Pode receber impulso, cair, repousar e ser recolhida. A pilha que não couber permanece no chão. Definir atraso, fusão de pilhas, expiração e exceções. | **Hoje:** drop voxel cai em −Y a 22 m/s² até 38 m/s. Na água, 4 m/s² até 2,2 m/s. O loot criado por `spillBlock` espera 0,45 s; raio horizontal de coleta é 1,45 m, com teste vertical. O drop de bloco expira após 300 s de jogo ativo, com idade reiniciada ao reabrir. A queda atual é vertical. |
| Projétil | Tem autor, origem, direção, velocidade, gravidade, arrasto, regras de acerto e destino após impacto. Pode ser coletável ou se consumir. | **Proposta:** lançar um seixo de treino no voxel. Usar teste de colisão ao longo do segmento percorrido no passo; aplicar um impacto e só então tratar ricochete, flechas recuperáveis e dano. |
| Bloco em queda | Remover estado da grade, simular uma entidade enquanto cai e devolver à grade em posição válida ou virar item. | **Proposta:** uma família granular com teste de apoio, passagem de borda do chunk e fallback se a célula de pouso estiver ocupada. |

No arremesso, a mira define a direção. A validação de munição e do ponto de lançamento acontece antes de consumir a pilha. Testar parede fina, alvo móvel, baixa taxa de quadros, lançamento na água, inventário cheio e dois jogadores recolhendo o mesmo item. Em sala, o autor e o efeito pertencem à simulação autoritativa.

Fontes: [Projétil](https://pt.minecraft.wiki/w/Proj%C3%A9teis), [Item no chão](https://pt.minecraft.wiki/w/Item_%28entidade%29), [Física voxel](../src/titan/physics.ts), [Drops voxel](../src/titan/drops.ts), [ADR 0098](adr/0098-titan-gravidade-e-deslocamento-dos-itens-soltos.md).

## 9. Hotbar, controles, combate e sobrevivência

| Tema | Regra de produto e referência local |
|---|---|
| Hotbar e mochila | A barra rápida Java tem 9 espaços. O voxel do projeto tem 9 espaços rápidos e 27 na bolsa. Slot ativo, pilha, quantidade e durabilidade precisam estar visíveis. Definir empilhamento por item, mover ou dividir pilhas, prioridade de coleta e retorno de insumos ao fechar a grade. |
| Ações em PC e toque | Modelar intenção de usar, quebrar, colocar, interagir, trocar slot, largar item e atacar. Preservar os controles do perfil e tratar toque cancelado, abertura de menu, captura perdida e troca de câmera. |
| Câmera e mira | Primeira pessoa e isométrica do voxel resolvem a mira pelo modo. Na isométrica o alcance está em `ISO_REACH` e a ação segue o cursor ou dedo. A câmera muda o raio e a apresentação; a validação de ação segue na regra de jogo. |
| Combate | Definir alcance, intervalo, direção, colisão, visibilidade, reação, dano e loot. O Titã tem combate corpo a corpo por `combat.ts`; o 2.5D tem `Entities` e regras próprias de progressão. |
| Sobrevivência | Coordenar vida, fome, ar, queda, dano e recuperação com mensagens que permitam entender a causa. O voxel já tem regras em `vitals.ts`, e o Titã usa alimentos e cama. |
| Morte e retorno | Definir o que cai, o que preserva, como marcar o local e quando apagar os itens. Procurar retorno seguro se cama ou ponto persistido deixarem de ser válidos. |
| Progressão e economia | Recursos e ferramentas desbloqueiam possibilidades. Missões e comércio podem ensinar o ciclo. Definir fonte e destino de moeda, oferta, reposição e validação de compra. |
| Navegação e objetivos | Sinalizar abrigo, cidade, rota, região perigosa e pontos de interesse antes de exigir que o jogador procure num menu. Usar luz, silhueta, mapa e marcos junto de mensagens. |

Fontes: [Item](https://pt.minecraft.wiki/w/Item), [Guia para iniciantes](https://pt.minecraft.wiki/w/Tutorial%3AGuia_para_iniciantes_no_Minecraft), [Inventário voxel](../src/titan/inventory.ts), [Gestos](../src/titan/gesture.ts), [Mira](../src/titan/aim.ts), [Sobrevivência voxel](../src/titan/vitals.ts).

## 10. Salvamento, multiplayer e desempenho

| Contrato | Critério para aceitar |
|---|---|
| Save | Testar novo jogo, salvar/reabrir, salvar durante queda ou processamento, atualizar um save antigo e reabrir após edição na divisa de chunk. Persistir fatos e separar dados de apresentação reconstruíveis. |
| Identificadores | IDs persistidos precisam manter significado. Quando houver mudança incompatível, versionar gerador, save, snapshot de sala ou protocolo, conforme o dado alterado. |
| Autoridade | O servidor resolve as mudanças compartilhadas nas salas. Validar alcance, inventário e alvo antes de confirmar e tratar repetição de mensagem, reconexão e concorrência. O backend permanece no repositório próprio. |
| Sala e mundo | Conjunto de chunks e entidades ativos deve considerar todos os jogadores. Afastamento, saída da sala e perda de conexão merecem um teste específico. A sala Titã é distinta da sala 2.5D e o Orvalis voxel tem hoje foco solo. |
| Performance | Medir jogo novo, caminhada longa, retorno ao ponto inicial, construção com luz e muitos atores. Acompanhar FPS, quadros lentos, fila de malha, contagem de entidades, tempo de simulação e memória. Testar em PC, celular e tablet. |
| Feedback | Condições como ocupação, ausência de espaço, bloqueio de área ou estação exigida devem ter mensagem ou indicação visual compreensível. Efeitos e sons reagem ao resultado confirmado. |

Fontes: [Salvamento 2.5D](archive/2d/save.md), [Salvamento voxel](../src/titan/save.ts), [Multiplayer](archive/2d/multiplayer.md), [Sala do Titã](../src/net/titan/room.ts), [Operações e desempenho](OPERATIONS.md).

## 11. Ficha para uma regra nova

Preencha antes de abrir a implementação. A ficha serve tanto para um bloco quanto para uma mecânica de geração, NPC ou física.

| Campo | Informação esperada |
|---|---|
| Objetivo | O que o jogador consegue fazer ou perceber e como sabe que funcionou. |
| Escopo | Mundos, modo solo ou sala, controle de mouse e toque, câmeras e unidade de medida. |
| Condições | Evento inicial, requisitos de alvo, posição, faixa, apoio, luz, ferramenta ou inventário. |
| Resultado | Mutação principal, loot, custo, efeito sonoro e visual, cancelamento e mensagens. |
| Tempo e área | Frequência, duração, raio ativo, filas, limite de entidades e comportamento em chunk inativo. |
| Dados e autoridade | Fonte de verdade, versão, persistência, legado, duplicação e conflito entre jogadores. |
| Prova | Pelo menos um caso normal, um caso de fronteira e um caso de retomada ou concorrência quando aplicável. |

Exemplo: **seixo arremessável no Titã**. Só tira uma unidade da pilha se o lançamento for validado. A esfera começa na direção da mira e sua trajetória curva com a gravidade definida para ela, acerta uma única vez e expira após um prazo. Antes de introduzir dano, validar o acerto de superfícies finas e o comportamento na borda entre chunks. Definir explicitamente o que ocorre ao atravessar água, descarregar a região ou fechar o jogo.

## 12. Ordem sugerida para evoluir o mundo

1. **Base mensurável.** Registrar coordenadas, camadas do gerador, distância de renderização e de simulação em um painel de desenvolvimento. Medir costuras, travessia e memória com seeds fixas.
2. **Ciclo de sobrevivência.** Validar coleta, hotbar, fabricação, construção, luz, noite, retorno e save como sequência completa. No Orvalis voxel, madeira, pedra, ferramentas e horta já fecham o essencial do ciclo (E1 a E5). Falta validar luz, noite, retorno e save em conjunto e completar a vedação (E6).
3. **Mundo habitado.** Levar primeiro uma faixa de fauna e cultivo ao Orvalis voxel. Fazer uma vila ou trecho da Cidade do Despertar com um morador, um horário, uma troca e uma missão curta antes de escalar a população.
4. **Exploração e física.** Ensaiar uma rota por caverna com minério e iluminação. Experimentar arremesso e blocos em queda separadamente para medir colisão, persistência e efeito de rede.
5. **Escala e identidade.** Expandir regiões, clima e distâncias somente após medir o impacto em aparelhos reais. Ajustar ritmo, materiais e riscos para os perfis do Orvalis e do Titã.

## 13. Roteiro de validação para uma entrega de jogo

| Cenário | Evidência esperada |
|---|---|
| Mesma seed, dois caminhos até a mesma borda | Mesma posição de árvores, veios e estruturas. As alterações do jogador continuam presentes. |
| Jogador cruza a borda de chunk durante uma edição | Colisão, luz e malha de ambos os lados convergem para o mesmo estado. |
| Anoitecer, mergulhar e trocar de câmera | Cor, névoa e visibilidade seguem o modo. A mudança de visual não altera a simulação. |
| Animal cruza a área ativa e volta | Identidade e estado seguem a política da espécie. Sem nova criatura ou prêmio por engano. |
| NPC volta para casa com passagem bloqueada | Usa rota alternativa ou espera e retenta. A tarefa e o diálogo continuam acessíveis. |
| Bloco cai ou projétil cruza a divisa | O impacto ocorre uma vez. A remoção, o bloco de destino e o saque ficam consistentes. |
| Mochila cheia durante coleta ou fabricação | Sem perda de ingredientes ou duplicação. O jogador vê o motivo da recusa. |
| Dois jogadores disputam o mesmo alvo | A sala decide uma única alteração e sincroniza os dois inventários e o mundo. |
| Sessão interrompida em meio a cultivo ou forno | Retomada segue a política de tempo descrita na ficha. O formato antigo ainda carrega. |
| Ida e volta em aparelho móvel | Registrar tempos de quadro, malhas em fila e memória no início, no ponto distante e após retornar. |
