# ADR 0116 — Regra de processo: toda regra de mundo passa pela Minecraft Wiki e pela sua aprovação antes de mudar

**Status:** Aceita, por decisão do dono do produto (27/11/2026): *"consultar a Minecraft Wiki, formular a proposta e aguardar a resposta antes de implementar regras de mundo"*.

## Regra
**Antes de implementar ou alterar uma regra de mundo** (geração, chunks, luz, tempo, física, blocos, quebra, ferramentas, itens, fabricação, cultivo, sobrevivência, combate, fauna, interface de jogo, multiplayer), a IA:
1. **consulta a Minecraft Wiki** (https://minecraft.wiki; a edição Java é a referência) e registra *funcionamento, fontes e parâmetros*;
2. descreve o **Orvalis e o Titã atuais**: comportamento e valores no código (com os arquivos);
3. **formula a proposta**: o que **manter**, **adaptar** ou **retirar**, e por quê;
4. **pergunta e espera a aprovação** do dono do produto. **Sem resposta, não altera.**

## Abrangência
Vale para **toda** regra, **inclusive as já implementadas**: o que ainda **não passou** por esse ciclo fica **pendente de auditoria**, mesmo funcionando no jogo (`docs/AUDITORIA_REGRAS.md` guarda a lista e o estado de cada uma). A auditoria acontece **uma regra por vez**, na ordem que o dono do produto escolher; nenhuma regra é alterada por conveniência durante outra tarefa.

## Fora do escopo
Arte, texto e interface sem efeito em regra (cor, ícone, layout) e correções de defeito que restauram o comportamento já aprovado seguem o fluxo normal. Em caso de dúvida se algo é "regra de mundo", pergunte.

## Como registrar
- Cada auditoria vira uma entrada na tabela de `docs/AUDITORIA_REGRAS.md` (estado: **pendente** → **proposta enviada** → **aprovada/ajustada** → **implementada**), com a data e, se houver mudança, a ADR ou o item do `CHANGELOG`.
- Fontes da Wiki citadas por página; valores do Minecraft variam por edição e versão, então a proposta diz qual foi consultada.
