# Changelog

## 0.3.0 — 2026-11-01
- Cubos empilháveis (máx. 2 por célula, `MAX_STACK`); quebrar remove o de cima.
- Personagem sobe 1 nível por vez (`STEP_HEIGHT`) e desce livremente; altura suavizada no sprite e na câmera;
  HUD mostra o nível.
- Montanhas geradas com 1–2 níveis (minério no cubo exposto).
- Correção: `AIR` herdava `shape: 'cube'` da fábrica de objetos.

## 0.2.0 — 2026-11-01
- **Vista superior inclinada (3/4)** substitui a vista lateral (ADR 0003): mundo com camadas chão/objeto,
  gerador 2D (elevação, rios, montanhas com minérios, florestas), cubos com face superior + frontal.
- **Personagem jogável** a partir da folha de sprites fornecida (`scripts/process-sprite.py` remove o fundo e
  uniformiza quadros), colisão, 4 direções e animação de caminhada.
- **Câmera** segue a posição lógica com suavização (sem balanço), zoom automático com personagem grande.
- **Joystick virtual** alinhado às direções da tela.
- Alcance de interação; spawn em bioma acolhedor; clima deslocado por seed.
- Removidos: céu/parallax lateral (`background.ts`), rocha-mãe, cavernas. Novos: `daycycle.ts`,
  `character.ts`, `player.ts`, `joystick.ts`, sombras de nuvens.

## 0.1.1 — 2026-11-01
- `npm run build:artifact`: build em arquivo único publicado como Artifact para teste no navegador.
- Canvas usa `100%` em vez de `100vw/100vh` (respeita a área segura do host).

## 0.1.0 — 2026-11-01
- Projeto criado (Vite + TypeScript, sem framework).
- Domínio `world`: PRNG/ruído com seed, registro de blocos, biomas, gerador puro, chunks 16×16, `World`
  com regras de quebrar/colocar e ciclo de vida de chunks. Testes Vitest.
- Domínio `render`: texturas procedurais estilo RPG/anime, cache offscreen por chunk, fundo parallax com
  ciclo dia/noite, brilhos, partículas por bioma.
- `game`: câmera, input (teclado/mouse/toque), HUD e hotbar.
- Documentação viva inicial (`docs/`) e ADRs 0001–0002.
