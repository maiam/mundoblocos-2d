# ADR 0018 — Ferramentas por material: ficha de dados, ícone e camada de mão

- **Status:** aceita (contrato de arte); implementação no motor pendente
- **Data:** 2026-11-06
- **Contexto do pedido:** o dono do produto enviou pranchas de ícones de 5 níveis de ferramenta (madeira, pedra,
  madeira + presa, madeira + Coração da Rainha, presa + Coração da Rainha) e pediu para avaliar se entram no
  movimento atual; se não, criar um documento de estrutura de dados para a arte seguir.

## Contexto

Hoje a ferramenta na mão é pintada dentro das folhas da heroína (`heroine-<ferramenta>.webp`,
`heroine-<ferramenta>-attack.webp`). O jogo conhece 5 tipos (`TOOLS` em `world/items.ts`) e um só nível. Um nível
novo pelo caminho atual custaria 10 folhas da heroína inteira por nível, e o chibi modular (ADR 0017) não tem
ferramenta. As pranchas recebidas também não têm formato comum (ordem, orientação, escala, fundo).

## Decisão

1. Ferramenta = **tipo × material**. O tipo define o que ela faz (regras em `TOOLS`, inalteradas); o material define
   aparência, receita e números (poder, velocidade, durabilidade — decididos pelo dono do produto, em `items.ts` /
   `progression.ts`).
2. Toda ferramenta nova segue `assets-src/ferramentas/CONTRATO.md` antes de entrar no motor: ficha no
   `catalogo.json`, prancha de ícones padronizada e **camada de mão** (`ferramenta-tras`/`ferramenta-frente`)
   alinhada a uma **pose-base sem ferramenta** do personagem.
3. Enquanto não houver camada de mão, um nível só pode entrar como ícone/receita, com a arte na mão do tipo atual,
   e isso fica explícito no CHANGELOG.

## Consequências

- Cada nível novo passa a custar só ícones + camadas (sem redesenhar personagem), e serve à heroína e ao chibi.
- Exige uma entrega única de poses-base sem ferramenta (10 folhas da heroína ou as ações do chibi).
- O motor precisará: identificar a ferramenta por tipo e material (`ToolId` vira tipo + material, com migração do
  salvamento), desenhar a camada por cima da pose e mostrar o ícone do material. Registrado em `NEXT_STEPS`.
