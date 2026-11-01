# Changelog

## 0.6.0 — 2026-11-01
- Primeiro NPC: ovelha (sprite fornecido, 4 direções × 4 quadros) com IA de pastar/passear e retorno a casa.
- `Walker`: base comum de movimento/colisão/altura extraída do `Player` (sem duplicar regra para NPCs).
- `Entities`: personagem + NPCs, colisão entre entidades, ocupação de células para colocar/cavar, rebanho inicial.
- Renderer desenha todos os atores com ordenação por profundidade; `character.ts` generalizado para folhas de atores.
- `process-sprite.py` aceita altura do quadro e limiares de fundo/sombra.

## 0.5.0 — 2026-11-01
- Tela limpa: removidos painel de informações, botões (Chunks/Modo/Tempo/Novo mundo), dica de nome e texto de
  ajuda. Fica só a hotbar; o joystick aparece apenas em telas de toque.
- Quebrar passa a exigir segurar 2 s sobre o alvo (rachaduras + anel); colocar é toque/clique curto. Removido o
  modo Quebrar/Colocar (tecla F) e a diferença entre botões do mouse.
- Novo mundo agora só via `?seed=` (sem botão).

## 0.4.0 — 2026-11-01
- Chão quebrável: quebrar célula vazia cria `HOLE` (não pisável por personagem/animais, não quebrável).
- Buraco só aceita cubo novo, que vira piso nivelado (pisável e empilhável); quebrar o piso reabre o buraco.
- Bloqueado cavar sob a personagem. Água continua inquebrável.
- Render de buraco (parede interna 3/4) e de piso de cubo.

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
