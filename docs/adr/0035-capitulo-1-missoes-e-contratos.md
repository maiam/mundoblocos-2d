# ADR 0035 — Capítulo 1 "O Despertar": missões narrativas e contratos da guilda

- **Status:** aprovado (15/11/2026, texto do dono do produto); **motor + missões 01–03 feitos (v0.93.121)**.
- **Contexto:** a Cidade do Despertar não pode ser só o ponto de partida: precisa virar um lugar a que a jogadora queira voltar. O dono do produto propôs uma história em que ela começa como aventureira desconhecida e, por missões, ganha dinheiro, reconhecimento e responsabilidades — usando só o que já existe (guilda, castelo, ferreiro, hospedaria, mercador, madeira, pedra, construção, lobos, aranhas, lagartos, goblins), sem monstro, estrutura ou bioma novo.

## Decisão
- **Duas camadas:** (1) **10 missões narrativas** em corrente linear, cumpridas **uma única vez**, dadas pelo **Mestre da Guilda** (Aldric); (2) **contratos repetíveis** da guilda (caçar lobos, juntar madeira, minerar pedra, entregar itens), para dar motivo de voltar depois do capítulo. A camada 2 ainda não existe.
- **Fases da jogadora:** missões 01–03 *Iniciante* ("um desconhecido"), 04–07 *Colaborador* ("alguém útil à cidade"), 08–10 *Reconhecido*. Regra: cada retorno à cidade traz algo novo (3 missões → novos contratos; 6 → trabalhos mais difíceis; 10 → nova linha de missões). A jogadora acumula objetivos e volta quando quiser.
- **Fim do capítulo:** o Mestre diz que as criaturas "talvez não estejam atacando, talvez estejam fugindo de alguma coisa" — gancho para o Capítulo 2 e a Deusa da Vida.
- **Motor** (`game/npcBrain/missions.ts`, puro): missão = **metas em paralelo** (`have` = unidades no inventário, entregues no fim; `event` = contagem de falar/abater/construir **depois de aceitar**); `turnIn` = quem recebe (Mestre ou outro NPC). Estado `MissionLog` no **salvamento do jogador** (v20), nunca na sala. Moeda: **Moeda de Cobre** (o texto original diz "bronze"). Valores de recompensa **provisórios** (a equilibrar com preços e venda de itens de monstros).
- **Sinais:** `!` no Mestre quando há missão a oferecer; `?` azulado em quem recebe a ativa; `?` dourado quando pronta. Diário curto no canto da tela (`Hud.setMission`).
- **Multiplayer:** a missão é do aparelho; a sala só avisa quem abateu cada monstro (`killed`, protocolo 27).

## As 10 missões (texto do dono do produto, resumido)
01 Um nome na guilda (registrar-se, conhecer Black e Bento; 8) · 02 O pedido do ferreiro (6 toras de carvalho + 8 pedras brutas ao Black; 12) · 03 Lobos na estrada (3 lobos; 15) · 04 O valor de uma aventura (entregar 5 itens de monstros + valor dos itens; 10) · 05 A floresta das teias (4 aranhas pequenas + 1 grande; 22) · 06 Protegendo nossas terras (6 cercas + 1 porteira; 25) · 07 Terra para o futuro (12 blocos de terra arada num terreno indicado; 18) · 08 Movimento nas margens (3 lagartos + 1 homem-lagarto; 30) · 09 A fogueira dos goblins (achar a fogueira, 2 goblins, informar; 35) · 10 A ameaça à Cidade do Despertar (os 5 goblins restantes; 60 + reconhecimento + próximo capítulo).

## Consequências e pendências
- Entregas em fatias: motor + 01–03 (feito); 04–07 (feito v0.93.129: valor fixo por item, sem aba Vender; terreno `World.farmPlot` + contorno); 08–10 (feito v0.93.131: lagarto = homem-lagarto, 4; evento `near` do acampamento); contratos repetíveis com o quadro de contratos da Guilda como interface; aba "Vender" nas lojas (opcional); fogueira dos goblins (missão 09). O jogo só tem o tipo `lizard` (homem-lagarto): a missão 08 precisará decidir a contagem.
