# Contexto do projeto

## O que é
MundoBlocos 2D é um mundo sandbox em **vista superior inclinada (3/4)**, gerado proceduralmente por seed,
dividido em chunks 16×16 como no Minecraft, com estética de **ilustração digital de fantasia estilo RPG/anime**
e uma personagem jogável (heroína chibi). Tem também o **Santuário Celestial da Deusa da Vida**, um mundo
pequeno de construção sobre nuvens com personagem e blocos próprios (perfis de mundo, ADR 0008).

## Objetivos
- Mundo "infinito" em ambos os eixos do mapa, carregado sob demanda por chunks.
- Identidade visual própria e coerente: personagem, animais, plantas e blocos desenhados (assets do projeto);
  água, árvores e efeitos procedurais no mesmo estilo.
- Controle confortável no celular (joystick alinhado à tela) e no desktop (teclado).
- Base sólida para evoluir o jogo (ferramentas com ação, salvamento, mais animais e receitas).

## Posição no ecossistema
- Repositório **apenas frontend** (site estático, Vite + TypeScript, sem framework).
- Não há backend próprio e **não deve ser criado** aqui. Se/quando houver persistência de mundos,
  contas ou multiplayer, isso pertence ao core (`core.maiamapps.com.br`) — ver `docs/NEXT_STEPS.md`.
- A fonte de verdade do estado do mundo em tempo de execução é a classe `World` (`src/world/world.ts`);
  o terreno não editado é uma função pura da seed (`WorldGenerator`). Ver ADR 0003 (vista superior).

## Público
Jogadores casuais no navegador (desktop e mobile).
