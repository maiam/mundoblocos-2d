# ADR 0066 — Titã: abrigos, Placa e Revestimento de Carapaça (gerador v8, v0.123.0)

**Status:** Aceita (etapa 3 de 4 do pacote "O que a duna guarda"; números e arte provisórios autorizados). Continua a ADR 0063. A v7 já estava em `main`, então as regras novas abrem a **v8**.

## Decisão
1. **Abrigos** (`GENERATOR_VERSION` 8, `placeShelters`): 2 vãos estreitos entre **dois pilares de rocha escura** (a ±2 blocos do centro ao longo de X, montes de raio 1,6 e 3 de altura entrando em `computeColumn`), em terra seca alcançável a pé (16–55 blocos da chegada, ≥ 10 da costa, relevo plano), afastados ≥ 14 dos afloramentos de cobre e ≥ 20 entre si. A toca do Farejador e as plantas ficam ≥ 24 e ≥ 6 dos abrigos: o abrigo fica **fora do território do animal**.
2. **Placa de Carapaça** (item 25): uma por abrigo, no chão do vão, id `plate:x,y,z` (`gen.plates`), recolhida à mão como a haste seca (item do chão pelo atlas), não volta. A etapa 4 fará o Farejador abatido soltar uma também.
3. **Revestimento de Carapaça** (item 26, bloco 27 `T.CARAPACE`): cubo sólido de rocha (tempo de quebra, som e quebra de rocha), tile 15 do atlas de terreno (`make-titan-braseiro.py`); receita na Mesa, grupo Construção: **1 Placa + 1 Rocha Escura → 2 Revestimentos**. Hoje é um cubo inteiro (não meia altura).
4. Ícones provisórios das ilustrações; o **tile 15 provisório lê mais como tijolo que como escamas** (pendência de arte).

## Consequências
- Etapa 4: vida do Farejador, carne crua/assada (braseiro) e combate com adaga; a placa também vem do animal.
- Pendências: tile final do revestimento (escamas sobrepostas), modelo 3D ou meia altura, sprite próprio da placa no chão (hoje o ícone).
- Testes: `abrigo.test.ts` (+3) e expectativas de versão/itens/receitas atualizadas.
