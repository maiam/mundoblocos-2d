# Próximos passos

Ordenado por prioridade. Itens concluídos saem daqui e vão para o CHANGELOG.

## Agora
0. **Santuário:** receber a prancha 3/4 dos 18 blocos e trocar a arte provisória (gerar atlas como em
   `extract-blocks.py`); hospedar o build em `santuario.<domínio>` para o subdomínio real; definir se a Deusa
   terá ações/ferramentas próprias.
1. **Avaliar o botão de ação no celular** (teste em andamento): 2 s ainda confortável? Mão vazia + toque
   poderia colher trigo maduro ou fazer carinho na ovelha; alvo poderia considerar a diagonal do joystick.
2. **Ações das ferramentas** sobre os materiais:
   - Enxada: grama/terra → Terra Arada (decidir se plantio passa a exigir terra arada).
   - Pá: grama/terra → Caminho de Terra; cava mais rápido.
   - Picareta: quebra pedra mais rápido; Machado: corta árvore → Tora de Carvalho.
   - Espada: reservada para combate. Falta arte de golpe (sprites de ação).
3. **Salvar o progresso no navegador** (`localStorage`): seed + chunks modificados + inventário + plantações +
   ovelhas. Contas e mundos na nuvem exigem endpoint no core (`core.maiamapps.com.br`) — **ajuste
   recomendado para o core**, não criar backend aqui.

## Em seguida
4. Inventário/painel: a hotbar (15 espaços) está no limite do celular deitado.
5. Ovelhas em outros chunks (spawn por bioma com limite) e tosar → lã.
6. Arte em 3/4 para árvores, cacto e água no estilo da prancha; topo dos cubos menos achatado.
7. Feedback sem HUD: vibração ao quebrar no celular, sons opcionais, menu recolhível (novo mundo, ciclo do dia).

## Depois
8. Receitas (tora → piso, trigo → pão), mais culturas, regar/adubar.
9. Transições suaves entre tipos de chão (autotile), água animada, pontes.
10. Alturas: meio bloco/escadas; indicar borda de queda.
11. Geração em Web Worker se o custo por chunk voltar a crescer (hoje ~0,07 ms).

## Riscos e dívidas técnicas
- `game/game.ts` (~490 linhas) concentra entrada, alvo e regras de ação: separar `ActionController` quando as
  ferramentas ganharem ação.
- Canvases do chão em 2× (`TEX_RES`) custam ~4 MB por chunk em cache; reduzir em celulares fracos se preciso.
- Pipeline de render de brilho (`glowColor`) está sem uso desde a remoção dos blocos mágicos (mantido para
  futuros efeitos, ex.: vaga-lumes/tochas).
