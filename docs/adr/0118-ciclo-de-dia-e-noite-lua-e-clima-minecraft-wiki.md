# ADR 0118 — Ciclo de dia e noite (partida de manhã, cama, lua) e clima de chuva, pela Minecraft Wiki (auditorias #10 e #31)

**Status:** Aceita e implementada (v0.185.0). Propostas enviadas e aprovadas pelo dono do produto (27/11/2026): 1 manhã, 2 cama pela Wiki, 3 lua agora, 4 clima só no Orvalis seguindo a Wiki, 5 chuva hidrata a terra arada seguindo a Wiki.

## Wiki (páginas "Daylight cycle" e "Weather", edição Java)
Dia de 20 min (24 000 ticks), mundo novo começa no tick 0; cama em tempo limpo de 12 542 a 23 460 e na chuva de 12 010 a 23 992; lua com 8 fases em ciclo de 8 dias. Clima: marcadores de chuva e trovão com cronômetro; chuva ligada 12 000–24 000 ticks, desligada 12 000–180 000; começa limpo; dormir volta ao limpo sem zerar o cronômetro; a chuva reduz a luz do céu a 12, escurece e acinzenta o céu, esconde sol, lua e estrelas e hidrata a terra arada.

## Decisão
- **Partida nova e save sem hora começam no tick 0** (`START_FRAC`, manhã); `?hora=tarde` e a constante `AFTERNOON` seguem para teste. Saves com hora não mudam.
- **Cama** só por `canSleep(frac, chovendo)` (`titan/sky.ts`): limpo 12 542–23 460, chuva 12 010–23 992. `isNightTime` fica só como "é de noite", sem decidir a cama. Na sala vale o mesmo, com o clima da sala. Dormir limpa a chuva (`clearWeather`), sem mexer no cronômetro.
- **Lua** (visual): `Sky.moon` (oposta ao Sol, fase = `days % 8`: 0 cheia, 1 minguante gibosa, 2 quarto minguante, 3 minguante crescente, 4 nova, 5 crescente, 6 quarto crescente, 7 crescente gibosa), sprite com texturas de 32 px geradas em código (`render/titanMoon.ts`; nunca lê canvas). Sem efeito de jogo.
- **Clima só no Orvalis** (`hasWeather`; o Titã nunca chove e não grava clima): `titan/weather.ts` puro — `Weather { raining, timer }`, ligada 600–1 200 s, desligada 600–9 000 s (Wiki), começa limpo, `rng` injetado. Só chuva: **sem trovão e sem neve**.
- **Efeitos:** `skyAt(frac, paleta, chuva, dias)` escurece a luz até 12/15 (`RAIN_SKY_FACTOR`), tira a cor do céu e da névoa, esconde sol, lua e estrelas; a intensidade sobe e desce em 10 s (`smoothRain`, estado do jogo); faixas de chuva em primeira pessoa (`render/titanRain.ts`) e ruído filtrado (`gameAudio.setRain`). `cropLight` usa a luz com chuva. **A chuva hidrata a terra arada a céu aberto** (`skyOpenAbove` em `tickCrops`) e ela seca de novo quando para. `?chuva=1` força só a visão e o som (teste).
- **Estado:** `session.weather` (`isRaining`, `tickWeather`), `header.weather` opcional (`TITAN_SAVE_VERSION` não muda), na sala o servidor sorteia e manda `rain` na mensagem `time` — **`TITAN_PROTOCOL_VERSION` 3**: jogo e servidor sobem juntos (`npm run sync-net`).

## Consequências e dívidas
Sem trovão, raios, neve, nuvens nem apagar fogo. A chuva é desenhada também sob telhados (a oclusão fica em `NEXT_STEPS`). A hidratação da enxada recém-usada (`hoeResult`) ainda ignora a chuva; vale no próximo random tick de uma planta. O "desligada" da Wiki chega a 2,5 h, então a chuva é rara numa sessão curta; `?chuva=1` serve para ver.
