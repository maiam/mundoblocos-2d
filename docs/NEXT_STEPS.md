# Próximos passos

1. **Persistência de edições** — curto prazo em `localStorage` (seed + chunks modificados). Contas/mundos
   salvos exigem endpoint no core (`core.maiamapps.com.br`) — **ajuste recomendado para o core**.
2. Inventário real (coletar o que quebra, gastar o que coloca).
3. Transições suaves entre tipos de chão (autotile por vizinhança).
4. Alturas: blocos de meia altura/escadas, e mostrar a borda de queda (sombra ao descer de 2 níveis).
5. Sprite sheet: reduzir peso do PNG (quantização) e adicionar animação de ação (quebrar/colocar).
6. Animais (usar `World.standHeight` para movimento — buracos/água já bloqueados).
7. Água animada e pontes (colocar tábuas sobre água).
8. Geração em Web Worker se o custo por chunk crescer.
