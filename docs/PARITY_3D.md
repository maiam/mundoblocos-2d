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

## Medições em aparelho real (painel `?fps=1`)
| Data | Aparelho | Modo | Resultado | Leitura |
|---|---|---|---|---|
| 13/11/2026 | PC Windows, Edge 157, janela 1912 × 948, DPR 1, servidor de desenvolvimento, 41 s | 3D (`?render=3d`) | média **51,7 fps**; 5% piores quadros ≈ **21 fps**; pior quadro **200 ms**; 252 chamadas, 5,0k triângulos, 72 texturas, 52 geometrias; JS 34 MB; contexto não perdeu | **Inconclusivo.** A cena é leve (a GPU de um PC não deveria limitar) e a média ficou abaixo de 60: o suspeito são engasgos de CPU (pintura do chão de chunks novos, envio de texturas, coleta de lixo) e a carga inicial, que esse relatório ainda misturava à média. A versão seguinte do painel separa o **regime estável** (depois de 8 s), conta a fração de quadros lentos e mostra o **tempo de JS do `draw`** — se o JS for pequeno e o quadro lento, é GPU/compositor; se o JS acompanhar, é CPU. |

| 13/11/2026 | O mesmo PC, painel com o regime estável, 159 s (6000 quadros guardados) | 3D | média **51 fps**, 5% piores 13 fps, "pior quadro" **15 400 ms**; só **0,4%** dos quadros > 33 ms e **0,1%** > 50 ms; **JS do `draw`: média 3,9 ms, p95 6,4, máx. 13,9**; 337 chamadas, 6,9k triângulos, 96 texturas, 65 geometrias; 33 MB; nas capturas o painel marcava **60 fps · 16,7 ms (pior 17)** | **No PC o 3D roda a 60 fps estáveis.** A média de 51 e o "pior quadro" de 15,4 s vinham de **uma pausa do navegador** (a aba ficou em segundo plano — o WhatsApp aparece aberto ao lado nas capturas): sem ela a média é ≈ 58,7 fps. O JS gasta 3,9 ms (cabe folgado nos 16,7 do PC; confirma a medição de 3 ms da VM). O painel passou a **excluir pausas** (> 1 s entre quadros) das médias e a contá-las à parte. Falta o 2D para comparar e os aparelhos. |

| 13/11/2026 | O mesmo PC, versão 0.93.45, 180 s (6000 quadros guardados), zero pausas | 3D | média **59,6 fps**; 5% piores **51,8 fps**; pior quadro **67 ms**; **0,3%** dos quadros > 33 ms, **0,1%** > 50 ms; **JS do `draw` 3,4 ms (p95 6,2; máx. 14,5)**; 289 chamadas, 2,8k triângulos, 109 texturas, 70 geometrias; 58 MB de JS | **Aprovado no PC:** praticamente 60 fps fixos, JS pequeno, sem engasgos relevantes. Os 58 MB são lixo ainda não coletado: o teste de vazamento (`npm run leak:3d`, ~140 chunks percorridos) mostra texturas estáveis em ~104, geometrias em 84 e JS em 15 MB depois do coletor — **sem vazamento**. |

**Achados do relatório visual (mesmo PC, 13/11/2026), corrigidos na v0.93.45:**
- **Copas com faixas/transparência:** *z-fighting* entre planos de árvores vizinhas na mesma linha (mesma profundidade; no 2D a ordem esquerda→direita resolvia). Agora cada coluna tem um desempate de profundidade (`spriteDepthBias`), e objetos ficam um pouco à frente das faces dos cubos.
- **Seleção "inexata":** (1) o 3D só mostrava um quadrado amarelo plano no chão, e só quando válido; passou a usar **os mesmos desenhos do 2D** (moldura do cursor, cantoneiras do alvo, rachaduras), em volta do que se vê (cubo = topo + frente; objeto = retângulo clicável). (2) As ferramentas de chão (pá, enxada, sementes) calculavam o alvo pelo mapeamento do chão do 2D; com K = 1 o topo de um cubo cobre o chão da célula ao norte e a ação ia para a célula errada. O 3D agora informa o chão **que se vê** (`pickGround`), ignorando árvores como o 2D.

**Próxima rodada (PC):** (1) 3D, ~1 min **parado numa praça** depois da carga e outro ~1 min **andando** (cruzar chunks); (2) o mesmo no 2D (`?fps=1` sem `render=3d`). Compare `steady.avgFps`, `steady.pctOver33`, `steady.pctOver50` e `jsDrawMs`. Depois repita nos aparelhos.

## Custo de JS por quadro (`npm run perf:cpu:3d`) — o que NÃO depende da GPU
Medido em 13/11/2026 numa VM sem GPU (Xeon, 4 vCPUs), servidor de desenvolvimento (JS sem minificar), 844 × 390, seed 42, 7 s por cenário.
Mede só o tempo de `renderer.draw` na thread do JS (a CPU que o celular gasta para montar o quadro), **não** o desenho na GPU.

| Cenário | 2D média | 3D média | 3D p95 | 3D máx | 3D: chamadas · triângulos · texturas |
|---|---|---|---|---|---|
| Praça | 1,06 ms | 2,74 ms | 4,0 ms | 9,6 ms | 182 · 4,5k · 54 |
| Meia-noite | 1,13 ms | 3,13 ms | 4,5 ms | 5,7 ms | 186 · 4,5k · 54 |
| Floresta densa | 1,12 ms | 3,35 ms | 4,2 ms | 6,9 ms | 272 · 2,7k · 74 |
| Labirinto | 1,36 ms | 3,27 ms | 5,0 ms | 7,3 ms | 277 · 5,3k · 114 |

Leitura: o 3D gasta **~3× o JS do 2D** (~3 ms contra ~1 ms), com picos até ~10 ms. O orçamento de 30 FPS é 33 ms por quadro; num celular
médio a CPU costuma ser várias vezes mais lenta que este Xeon, então o JS do 3D deve ficar na casa de 10–25 ms em dev e menos no build —
**cabe, mas sem folga grande**. O que decide é a GPU, só medida em aparelho real. Se faltar fôlego, os custos de JS a atacar primeiro: pintura
por quadro do canvas de cada ator (`ActorBillboards`) e o envio das texturas, o laço de brilhos da água e a coleta de luzes à noite.

## Diferenças conhecidas e aceitas (decisões do dono do produto, ADR 0031)
- Escala K = 1: cubo e parede mais altos na tela, personagem menor (1,2 em vez de 2,2 células), 14 células visíveis em vez de 10.
- Frente dos cubos provisória (topo escurecido) até a arte nova; criaturas com o mesmo fator do personagem até decidir o tamanho por espécie.
- Física: por padrão **inalterada** (degrau automático ligado: com cubos de 1 célula a personagem "sobe" paredes). `?fisica=solida` (dev e piloto, só com `?render=3d`, offline) desliga o degrau do jogador (v0.93.41); lobos e goblins mantêm o degrau deles (decisão pendente).

## Ainda NÃO verificado (depende de aparelho real ou de decisão)
- [x] **Desempenho no PC** (Windows, Edge, 1912 × 948): 3D a ~60 fps, JS 3,4 ms, sem vazamento. [ ] **Falta em celular médio, iPad e Safari** (meta: 30 FPS) — painel `?fps=1`; relatório copiado e colado na conversa.
- [ ] **Toque** (botão de ação no celular, toque no tablet), **vertical** (ADR 0030), zoom/pinça bloqueados.
- [ ] **WebGL no iframe do Artifact** e **perda de contexto** no Mundo (testado só no Santuário).
- [ ] **Sala multiplayer** em 3D (atores remotos, nomes, itens da sala).
- [ ] **Safari iOS**: shader de luz, texturas de chão por chunk (memória), canvas 2D irmão.
- [x] **Física sem degrau** atrás de `?fisica=solida` (jogador, offline; testes + navegador). [ ] **Falta** a sala: o servidor usa o mesmo `World`/`Walker` e só muda na virada (`build:net` + `sync-net` + `PROTOCOL_VERSION`); [ ] decidir lobos/goblins (hoje `stepHeight` 1).
