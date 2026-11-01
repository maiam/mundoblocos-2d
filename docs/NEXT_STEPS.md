# Próximos passos

0. Feedback discreto sem HUD: vibração (`navigator.vibrate`) ao quebrar no celular e som opcional; menu
   recolhível para "novo mundo"/ciclo do dia, se fizer falta.

1. **Persistência de edições** — curto prazo em `localStorage` (seed + chunks modificados). Contas/mundos
   salvos exigem endpoint no core (`core.maiamapps.com.br`) — **ajuste recomendado para o core**.
2. Inventário real (coletar o que quebra, gastar o que coloca).
3. Transições suaves entre tipos de chão (autotile por vizinhança).
4. Alturas: blocos de meia altura/escadas, e mostrar a borda de queda (sombra ao descer de 2 níveis).
5. Sprite sheet: reduzir peso do PNG (quantização) e adicionar animação de ação (quebrar/colocar).
6. NPCs: tosar a ovelha (lã), spawn por chunk/bioma; persistir inventário, plantações e rebanho com as edições.
   Cultivo: regar/adubar, mais culturas, trigo como receita (pão).
7. Água animada e pontes (colocar tábuas sobre água).
8. Geração em Web Worker se o custo por chunk crescer.
