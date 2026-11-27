# ADR 0117 — Quebra por dureza do bloco, na fórmula da Minecraft Wiki (auditoria #16)

**Status:** Aceita e implementada (v0.184.0). Proposta enviada ao dono do produto e aprovada ("Aceito sua recomendação", 27/11/2026), pelo ciclo da ADR 0116. Substitui os tempos fixos por classe (ADR 0042, 0063, 0065, 0107, 0112 no que dizem de `BREAK_MS`/`PICK_FACTOR`).

## Wiki (páginas "Breaking" e "Hardness", edição Java)
Tempo = dureza × 1,5 s ÷ velocidade da ferramenta certa; bloco que exige ferramenta (rocha) sem ela = dureza × 5 s; ferramenta errada não acelera; arredonda para cima em ticks (50 ms). Velocidades: mão 1, madeira 2, pedra 4, ferro 6.

## Decisão
- `titan/breaking.ts` guarda a **dureza por bloco** (`hardnessOf`) e calcula `breakTotalMs = HOLD_MS (200 ms do gesto) + ceil50(dureza × 1500 ÷ TOOL_SPEED)`, ou `× 5000` quando o bloco exige picareta e a mão está errada. `TOOL_SPEED`: madeira 2, pedra 4, **cobre 5 (provisório, entre a pedra e o ferro)**.
- Durezas da Wiki: terra/areia 0,5; grama/argila/terra arada 0,6; caminho 0,65; pedra e tijolo de pedra 1,5; pedra lisa, tijolo, laje, degrau, mureta 2; tábuas e toras 2; bancada (Mesa de Trabalho/Carpintaria) e baú 2,5; fornalha (braseiro) 3,5; folhas e cama 0,2; veio de cobre 3 (só picareta).
- **Provisório, sem equivalente na Wiki** (mantém o tempo de mão antigo): rocha escura/veios/carapaça/bloco de âmbar do Titã = dureza da pedra; gelo, veio de gelo e depósito de brasa, junco (bloco, laje, degrau, cadeira), porta de junco, Marco e Painel.
- **Ferramenta certa** (`blockToolOf`): bancada e baú passam de picareta para **machado**; cama sai da classe de rocha (nenhuma ferramenta). Coleta de lanterna e lasca solta fica em 350 ms (`COLLECT_MS`).
- Mantidos: `HOLD_MS` 200 ms, ferramenta errada não acelera, durabilidade 59/131/190 (ADR 0067).
- **Efeito sensível:** rocha na mão nua leva 7,5 s (antes 1,6 s); picareta de pedra, 0,6 s. O jogador precisa da picareta cedo, como no Minecraft. Sem piso mais brando (a pergunta ficou aberta; a recomendação, que foi aceita, era a da Wiki).

## Consequências
Removidos `BREAK_MS` e `PICK_FACTOR`. Testes de gesto passam a usar tempos fixos próprios (testam o gesto, não a regra). Não muda `GENERATOR_VERSION` nem o save. Afinar as durezas provisórias entra nas auditorias dos blocos próprios.
