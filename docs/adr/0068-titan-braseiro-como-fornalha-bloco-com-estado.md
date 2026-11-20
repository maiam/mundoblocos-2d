# ADR 0068 — Titã: Braseiro como fornalha (bloco com estado) (v0.125.0)

**Status:** Aceita. Contexto: regras de interação do dono do produto, no modelo do Minecraft (Mesa de Trabalho **sem memória**; Fornalha, Baú e Bigorna como **blocos com estado**, com inventário salvo na coordenada). Substitui a parte "acender com a brasa, 8 cargas" da ADR 0065; o resto (blocos 25/26, receita, tiles) continua.

## Decisão
1. **Dois grupos**: a **Mesa de Trabalho** continua sem memória (a grade 3 × 3 volta à mochila ao fechar a tela, como já fazia); o **Braseiro de Rocha** passa a bloco com estado: `session.furnaces` (`x,y,z` → `FurnaceState`), gravado em `header.furnaces` (opcional, sem subir `TITAN_SAVE_VERSION`; ao abrir só vale quem ainda é um braseiro; entrada/combustível que não servem caem fora).
2. **Fornalha** (`titan/furnace.ts`, puro): 3 espaços (**entrada**, **combustível**, **saída**) e duas barras. **Cozimento 10 s** por preparação (`COOK_TIME_S`); **combustível**: a Brasa de Âmbar queima **80 s** (`FUEL_TIME_S`, = 8 preparações). Regras: o fogo só acende se há o que cozinhar e **consome 1 combustível na hora** (tirar a entrada depois não apaga); o fogo continua até o fim; o cozimento só avança com fogo, entrada válida (receitas de `station: 'brazier'` com **um ingrediente**: Lingote de Cobre = 2 fragmentos; a carne assada da etapa 4 entra assim) e espaço na saída; sem fogo o progresso **regride 2×**.
3. **Tempo**: `tickFurnaces` corre no laço **enquanto o jogo está ativo, com a tela aberta ou fechada**; o tempo com o jogo parado ou a aba fechada não conta (decisão do dono do produto, como o rebrote da noz). O bloco acompanha o fogo (`T.BRAZIER` ↔ `T.BRAZIER_LIT`); estado discreto (acendeu, apagou, saiu item) sobe `metaRev` e grava; os temporizadores gravam junto das gravações periódicas.
4. **Interação** (`furnaceAt`, `furnaceMoveIn`, `furnaceTakeOut`, tudo ou nada): Usar/F (ou o botão Usar) abre o painel do braseiro; **tocar numa pilha da mochila e depois em Entrada/Combustível** leva a pilha (só o que serve; espaço vazio recebe tudo, o mesmo item soma, outro item não troca); tocar num espaço sem pilha escolhida (ou na Saída) tira para a mochila (mochila cheia: nada muda). **Quebrar o braseiro cospe os três espaços no chão** (`f:x,y,z:n`) e devolve o bloco. **O gesto não muda** (decisão do dono do produto): tocar com um bloco na mão continua colocando encostado no braseiro e na Mesa; a tela abre só pelo Usar/F. Alcance de uso 5 blocos (+1,5 para manter aberta), como já era.
5. Os cartões de receita do braseiro saíram do livro (ficam no painel dele: entrada → saída); a Brasa de Âmbar **não** acende mais o braseiro por toque (não é mais colocável: vai no combustível).

## Atualização (v0.130.0): layout
O painel foi redesenhado a pedido do dono do produto (referência da Fornalha do Minecraft), sem mudar nenhuma regra: Entrada em cima, chama no meio, Combustível embaixo à esquerda; seta de progresso e Resultado grande (ícone 2×) à direita; espaços de 56 px; coluna direita de 232 px com o braseiro aberto.

## Consequências
- Base pronta para outros blocos com estado (Baú de Rocha, 27 espaços; Bigorna) reaproveitando `session.<mapa>` + `header.<campo>` + "cuspir ao quebrar"; sem sincronização multijogador (o Titã é solo).
- Pendências: luz do braseiro aceso e partículas de brasa; mostrar o progresso no próprio bloco; modelo 3D; XP não existe; aceite em aparelho do painel a 360 px de altura.
- Testes: `furnace.test.ts` (+7) e `braseiro.test.ts` reduzido (ids, tiles, receitas e estação).
