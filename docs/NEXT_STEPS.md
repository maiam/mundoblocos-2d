# Próximos passos

Ordenado por prioridade. Itens concluídos saem daqui e vão para o CHANGELOG.

## Agora
0. **Santuário:** hospedar o build em `santuario.<domínio>` para o subdomínio real; definir se a Deusa terá
   ações/ferramentas próprias e se flutuar deve ter efeito de jogo (ex.: passar sobre buracos/subir 2 níveis); (arte) uma variação de nuvem feita para chão contínuo eliminaria a repetição.
1. **Avaliar o botão de ação no celular** (teste em andamento): 2 s ainda confortável? Mão vazia + toque
   poderia colher trigo maduro ou fazer carinho na ovelha; alvo poderia considerar a diagonal do joystick.
2. **Ações das ferramentas** (todas as 5 já agem); refinamentos:
   - Pá/picareta: quebrar mais rápido que a mão (pá em macios, picareta em pedra)? Blocos quebrados soltarem o bloco?
   - Machado: falta árvore soltar Tora de Carvalho e talvez cortar mais rápido que a mão.
   - Espada: feito o golpe; faltam animação de morte dos animais, drops (lã/carne?), vida e monstros.
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
- **Peso dos artefatos — URGENTE** (~3,1 MB cada após as folhas da pá e da picareta; o build avisa acima de 2,8 MB): cada folha
  nova soma ~150 kB e os dois mundos levam a arte um do outro. Separar assets por mundo (build por `VITE_WORLD` só
  com a arte do perfil) antes da próxima folha de sprite.
- `game/game.ts` (~490 linhas) concentra entrada, alvo e regras de ação: separar `ActionController` quando as
  ferramentas ganharem ação.
- Canvases do chão em 2× (`TEX_RES`) custam ~4 MB por chunk em cache; reduzir em celulares fracos se preciso.
- Pipeline de render de brilho (`glowColor`) está sem uso desde a remoção dos blocos mágicos (mantido para
  futuros efeitos, ex.: vaga-lumes/tochas).
