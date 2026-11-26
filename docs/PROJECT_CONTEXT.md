# Contexto do projeto

## Nome
**Orvalis** (decisão do dono do produto, 2026-11-03; antes "MundoBlocos 2D"). É o nome do **mundo de fantasia**
onde o jogo acontece — de *orvalho*: o mundo que desperta a cada manhã, como os novatos na Cidade do Despertar. As
cidades e regiões futuras ganham nomes próprios dentro de Orvalis. Endereço provisório: `orvalis.pensamentos.online`
(Hostinger) até o **domínio próprio** do Orvalis. O Orvalis é **independente do maiamapps** (ADR 0015).
O repositório, o pacote npm e as chaves de salvamento (`mundoblocos:save:…`) mantêm o nome antigo de propósito:
trocá-las apagaria os salvamentos dos jogadores.

## O que é
Orvalis é um mundo sandbox em **vista superior inclinada (3/4)**, gerado proceduralmente por seed,
dividido em chunks 16×16 como no Minecraft, com estética de **ilustração digital de fantasia estilo RPG/anime**
e uma personagem jogável (heroína chibi). Tem também o **Santuário Celestial da Deusa da Vida**, um mundo
pequeno de construção sobre nuvens com personagem e blocos próprios (perfis de mundo, ADR 0008).

## Objetivos
- Mundo "infinito" em ambos os eixos do mapa, carregado sob demanda por chunks.
- Identidade visual própria e coerente: personagem, animais, plantas e blocos desenhados (assets do projeto);
  água, árvores e efeitos procedurais no mesmo estilo.
- Controle confortável no celular (joystick alinhado à tela) e no desktop (teclado).
- Base sólida para evoluir o jogo (ferramentas com ação, salvamento, mais animais e receitas).

## Visão de longo prazo — mundo de progressão (dono do produto, 2026-11-03)
O mundo vai crescer em **cidades e dungeons que acompanham a evolução dos personagens**:
- A **Cidade do Despertar** (Cidade 1) recebe os **novatos**: é onde todo personagem nasce e aprende o básico, com
  dungeons de nível inicial por perto (o Covil das Aranhas é a primeira).
- À medida que os personagens **sobem de nível**, eles passam a se concentrar em **outras cidades**, mais distantes e
  mais desafiadoras, cada uma com suas dungeons, monstros, lojas e missões da sua faixa de nível.
- Resultado: um **mundo maior**, organizado em regiões por faixa de nível, em que a jornada do personagem é também
  uma viagem de cidade em cidade.
- **Andares (2026-11-06, ADR 0019)**: cada cidade fica num **mundo próprio**, com bioma próprio, ligado aos outros
  por **portais** (inspiração: os andares de Sword Art Online). O mundo da Cidade do Despertar é só de **florestas**,
  rios, mares e praias — abundante em recursos, por ser o primeiro; os próximos serão áridos, pantanosos etc.

O que isso pede (ainda não existe; ver `NEXT_STEPS`, Fase 6): sistema de **níveis/experiência** do personagem,
**faixas de nível** por região (cidades, dungeons e monstros), um **mapa de regiões** (onde fica cada cidade,
igual em toda seed como a Cidade 1, ADR 0012), **viagem** entre cidades e conteúdo que libera com o nível. Com
jogadores online, a concentração por cidade vira também ponto de encontro (multiplayer = backend do Orvalis).

## Decisão de 26/11/2026 (ADR 0115): Orvalis 3D é o mundo padrão; o 2D e o Santuário saem
O **Orvalis 3D** (voxel, primeira pessoa) é o mundo padrão; o **Titã** só abre com `?mundo=titan`; o **Orvalis 2D/2.5D, o Santuário e a isométrica 2.5D serão removidos** em etapas (o texto sobre o 2.5D abaixo é histórico até lá). Itens dos dois mundos voxel não se compartilham (ADR 0114).

## Direção: mundo principal também em voxel (dono do produto, 24/11/2026, ADR 0105)
O mundo principal ganha um caminho em **primeira pessoa com blocos voxel ao estilo Minecraft**, sobre o motor do Titã (`?mundo=orvalis3d`). O mundo 2.5D descrito acima continua sendo o que está no ar até o voxel ter paridade (cidade, animais, NPCs, cultivo, missões); a aposentadoria do 2D será decidida por ADR.

## Posição no ecossistema
- Repositório **apenas frontend** (site estático, Vite + TypeScript, sem framework).
- Não há backend **neste** repositório e não deve ser criado aqui. Multiplayer, contas e mundos na nuvem pertencem ao
  **backend do Orvalis**, em repositório separado e subdomínio próprio (ADR 0015). **Sem acesso ao maiamapps.**
- A fonte de verdade do estado do mundo em tempo de execução é a classe `World` (`src/world/world.ts`);
  o terreno não editado é uma função pura da seed (`WorldGenerator`). Ver ADR 0003 (vista superior).

## Público
Jogadores casuais no navegador (desktop e mobile).
