# ADR 0114 — Itens do Titã e do Orvalis em voxel não são compartilhados

**Status:** Aceita, por decisão do dono do produto (26/11/2026): *"por enquanto, itens do mundo Titã e do mundo Orvalis são diferentes e só servem para o próprio mundo, não são compartilhados"*. Registra e fixa o que as entregas E0 a E5 já faziam por convenção.

## Decisão
1. **Cada mundo tem o seu conjunto de itens.** Nada que existe num mundo (item, bloco, receita, semente, ferramenta, bancada) serve no outro, mesmo quando o nome é parecido (haste, picareta, mesa, pedra).
2. **Um catálogo, duas faixas** (`titan/items.ts`): **ids 1 a 41 = Titã**; **ids 42 em diante = Orvalis em voxel** (`Item.GRASS` = 42 é o primeiro). Blocos: os do Orvalis começam no id **90** (`T.GRASS`), os do Titã ficam abaixo. Item novo entra na faixa do mundo dele; nunca reutilize um id de um mundo no outro.
3. **Receitas por mundo** (`Recipe.world`, ADR 0107): sem `world` = Titã; `'orvalis'` = Orvalis. **Toda receita usa só itens (ingredientes e resultado) da faixa do próprio mundo.** O livro mostra só as do mundo aberto.
4. **Bancadas:** a Mesa de Carpintaria é a bancada do Orvalis; a Mesa de Trabalho e o Braseiro, do Titã. Isso responde à dúvida "coexistem?" do `NEXT_STEPS`: não há mistura.
5. **Saves e inventários já são separados** (banco `orvalis-titan` × `orvalis-voxel`, `header.world`): a mochila de um mundo nunca vai para o outro.
6. **Parecido não é igual:** o `Tier` de ferramenta (`wood`/`rock`/`copper`) é só um nível de velocidade compartilhado pelo código (ADR 0112); os itens (Picareta de Rocha do Titã × Picareta de Pedra do Orvalis) seguem distintos, cada um com a sua receita, arte e durabilidade.

## Como se impõe
- `titan/itensPorMundo.test.ts`: o catálogo parte na faixa 42; **toda receita** só mistura itens do próprio mundo; **o bloco que um item coloca** é da faixa do mundo do item (≥ 90 no Orvalis, < 90 no Titã); as **sementes** da horta são do Orvalis e as do junco e da Noz, do Titã.
- Garantia de **catálogo, não de execução**: o código não bloqueia, por exemplo, uma Mesa de Trabalho do Titã colocada à força no Orvalis (por *cheat* ou save adulterado); simplesmente não há como obtê-la lá. Se isso passar a importar (sala, trocas, criativo), a trava de execução entra numa decisão própria.

## Consequências
- **Compartilhar item entre mundos exige nova decisão** (ADR superando este): migração de ids, conversão, loja ou criativo comum. Antes disso, nenhuma entrega deve fazer um mundo consumir ou produzir item do outro.
- Duplicação de conteúdo parecido (haste, picareta, mesa) é esperada e aceita enquanto durar a regra.
- Sem mudança de código de jogo, save, gerador nem protocolo; só o teste novo.
