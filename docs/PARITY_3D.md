# Paridade 2D × 3D do Mundo — checklist do piloto (ADR 0031, M5)

Documento vivo. Resultado da comparação entre o Mundo em Canvas 2D (padrão) e em 2.5D (`?render=3d`, só dev ou build de piloto).
Atualize a tabela quando um cenário mudar de estado.

## Como rodar
- **Automático (headless):** `npm run dev` em segundo plano e `npm run parity:3d` → `parity-out/index.html` com as capturas lado a lado
  de 10 cenários (seed 42; `ONLY=floresta,noite npm run parity:3d` roda só alguns). Sai com código 1 se algum cenário tiver erro de console.
- **Aparelho real:** ver *Medir em aparelho real* em [OPERATIONS](OPERATIONS.md) (`npm run build:piloto3d` + `?render=3d&fps=1`).
  O headless usa GPU por **software** (SwiftShader): FPS dele não vale nada; só o que se vê e as contagens da GPU valem.

## Cenários (headless, seed 42, 844 × 390)
| Cenário | 2D × 3D | Observação |
|---|---|---|
| Praça da cidade (NPCs, bancos, poço) | ✅ | Mesma arte e posições; 3D mostra mais mundo (14 × 10 células). |
| Portão e torres | ✅ | Torres e muralha como planos; lampiões ok. |
| Floresta | ✅ | Copas por z-buffer; **o jogador some atrás da copa** → ganhou eco translúcido (corrigido no M5.1). |
| Água, margem e areia | ✅ | Brilhos, nuvens e fluxo; a água em si é textura estática (como no 2D). |
| Item caído | ✅ | Ícone com sombra, pulo e flutuação. |
| Meia-noite | ✅ | Luz do jogador e lampiões, vaga-lumes. Falta a tinta laranja do pôr do sol e o brilho de dia dos lampiões. |
| Interior (ferraria) | ✅ | Cômodo isolado, mundo escondido. |
| Entrada do covil | ✅ | Farol roxo e caverna. |
| Dentro do labirinto | ✅ | Paredes em 2 níveis, escuro fora, penumbra pela luz do jogador (mais escura que a vinheta do 2D no centro). |
| Construção (parede fina, pilar, porta) | ✅ | Formas iguais; frente dos cubos **provisória**. |

## Diferenças conhecidas e aceitas (decisões do dono do produto, ADR 0031)
- Escala K = 1: cubo e parede mais altos na tela, personagem menor (1,2 em vez de 2,2 células), 14 células visíveis em vez de 10.
- Frente dos cubos provisória (topo escurecido) até a arte nova; criaturas com o mesmo fator do personagem até decidir o tamanho por espécie.
- Física **inalterada** no piloto (degrau automático ligado): com cubos de 1 célula a personagem "sobe" paredes — a regra sem degrau é a próxima etapa do M5.

## Ainda NÃO verificado (depende de aparelho real ou de decisão)
- [ ] **Desempenho** em celular médio, iPad e Safari (meta: 30 FPS) — painel `?fps=1`; relatório copiado e colado na conversa.
- [ ] **Toque** (botão de ação no celular, toque no tablet), **vertical** (ADR 0030), zoom/pinça bloqueados.
- [ ] **WebGL no iframe do Artifact** e **perda de contexto** no Mundo (testado só no Santuário).
- [ ] **Sala multiplayer** em 3D (atores remotos, nomes, itens da sala).
- [ ] **Safari iOS**: shader de luz, texturas de chão por chunk (memória), canvas 2D irmão.
- [ ] **Física sem degrau** atrás de flag + teste de sala (servidor usa o mesmo `World`/`Walker`).
