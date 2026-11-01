# Próximos passos

- **Avaliar o teste do botão de ação**: tempo de 2 s ainda adequado? Mão vazia + toque poderia colher trigo maduro
  ou fazer carinho na ovelha; alvo "à frente" poderia considerar a diagonal do joystick.

- **Ações das ferramentas** (próximo): enxada prepara a terra (plantio só em terra arada?), picareta/pá/machado
  aceleram a quebra do material certo (e o restante fica mais lento), espada para combate futuro. Sprites de
  ação (golpe) ainda não existem.
- Hotbar com 16 espaços está no limite do celular deitado: considerar inventário/painel de ferramentas.

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
