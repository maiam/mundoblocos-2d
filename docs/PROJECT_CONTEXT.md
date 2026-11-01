# Contexto do projeto

## O que é
MundoBlocos 2D é um mundo sandbox 2D (vista lateral) gerado proceduralmente por seed, dividido em
chunks 16×16 como no Minecraft, com estética de **ilustração digital de fantasia estilo RPG/anime**.

## Objetivos
- Mundo "infinito" na horizontal, limitado verticalmente (céu → rocha-mãe), carregado sob demanda por chunks.
- Identidade visual própria e coerente, 100% procedural (sem assets externos).
- Base sólida para evoluir para jogo (personagem, inventário, salvamento).

## Posição no ecossistema
- Repositório **apenas frontend** (site estático, Vite + TypeScript, sem framework).
- Não há backend próprio e **não deve ser criado** aqui. Se/quando houver persistência de mundos,
  contas ou multiplayer, isso pertence ao core (`core.maiamapps.com.br`) — ver `docs/NEXT_STEPS.md`.
- A fonte de verdade do estado do mundo em tempo de execução é a classe `World` (`src/world/world.ts`);
  o terreno não editado é uma função pura da seed (`WorldGenerator`).

## Público
Jogadores casuais no navegador (desktop e mobile).
