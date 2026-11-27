# ADR 0134 — Linha e receita da Vara de Pesca (auditoria #14 E2, v0.203.0)

**Estado:** aceita (27/11/2026). Ciclo da ADR 0116 cumprido: Minecraft Wiki ([String](https://minecraft.wiki/w/String)) → estado atual → proposta → aprovada nos 3 pontos (item 114 e receita da vara; fabricar a Linha da Lã; manter "3 Hastes + 2 Linhas").

## Wiki
O fio (String) vem de aranhas, aranhas de osso, striders, escambo de piglins, baús de estruturas, lixo da pesca (Bedrock) e aldeões pescadores (Java); serve para arco, besta, vara de pesca, tear, vela, fardo, andaime, rédea e lã (4 fios = 1 lã). A vara é haste + fio; o "3 hastes + 2 fios" é de memória.

## Decisão
1. **Item 114, Linha** (arte `orvalis_linha_16x16.png` do pacote de espólio do Drive, pasta Materiais); o atlas de itens (4 × 29) comporta até o 116, e o 113 segue só como textura da boia (`isItem` exclui 86 e 113).
2. **Fonte da Linha: fabricada da Lã** (`linha-la`: 1 Lã → 4 Linhas, o inverso da receita da Wiki), porque o Orvalis não tem aranhas, striders, piglins, estruturas nem aldeões; **adaptação**, sem espólio novo na ovelha. Quando houver aranhas, a fonte da Wiki entra.
3. **Vara de Pesca** (`vara-pesca`, Mesa de Carpintaria): 3 Hastes + 2 Linhas (valor de memória, mantido a pedido).
4. As outras artes do espólio (osso, coelho, tinta, nautilo, escamas, arreios, armaduras) seguem **sem uso** (dependem de animais e sistemas que o Orvalis não tem).

## Consequências
Sem mudança de save, de gerador nem de protocolo. Fecha a pendência "receita da vara" da ADR 0133. Teste: `orvalis/pesca.test.ts`.
