# ADR 0041 — Titã: ciclo simples de céu (4 × 4 chunks), luz do dia como uniform

**Status:** aceito (dono do produto, 19/11/2026). Estende as ADRs 0039/0040. Decidido depois da medição em aparelho real (iPhone: 59,9 FPS estáveis, 0,4% de quadros acima de 33 ms) que deixou o worker de malha **em espera**.

## Decisão
1. **Relógio** (`titan/sky.ts`, puro): dia completo de **8 minutos** (`DAY_SECONDS = 480`, como no Mundo principal), guardado como fração 0–1 em `session.time`. Partidas novas e saves **sem hora** começam à **tarde** (`AFTERNOON = 0.55`, o visual das entregas anteriores); hora inválida também cai na tarde. A hora **avança com o jogo ativo** (depois de "Começar", com a mochila aberta ou não) e **fica parada** na tela de início e com a aba oculta (os quadros param; um quadro por vez avança no máximo 0,05 s).
2. **Save:** `TitanHeader.time?` (campo opcional, sem subir `TITAN_SAVE_VERSION`: saves antigos abrem à tarde, e uma versão antiga do jogo simplesmente ignora o campo). Grava junto da posição, a cada ~0,02 de dia (~10 s) de avanço, e em todo `flush`.
3. **Céu** (`skyAt`): três momentos da direção de arte, interpolados com suavização e continuidade na meia-noite — manhã (horizonte pêssego, céu ocre; luz 0,85), tarde (cobre no alto, âmbar no horizonte, névoa âmbar; luz 1) e noite (carvão-violeta com resto de cobre no horizonte; luz 0,3). O **sol** é um ponto quadrado que só aparece quando está alto (opacidade de 0 a 1 entre 0,55 e 0,75 de elevação), nasce a leste, passa alto à tarde e se põe a oeste. A **névoa e o fundo** acompanham a cor do horizonte.
3. **Luz do dia no shader, sem remalhar:** antes a luz ambiente ficava gravada na cor dos vértices (mudar a hora refaria todas as malhas). Agora `col` guarda só o sombreado das faces e um atributo novo `glow` guarda o brilho de lanterna e a emissão da lanterna; o material (`MeshBasicMaterial` com `onBeforeCompile`) calcula `textura × (col × uAmbient + glow)`. A hora é um uniform; **mudar a hora refaz zero seções** (testado: 164 → 164 seções ao percorrer o dia) e a luz local da lanterna não depende do dia.
4. **Teste:** `?hora=manha|tarde|noite` congela **só a visualização**; a hora do jogo continua correndo e é a que vai no save (a forçada nunca é gravada); sem o parâmetro volta a hora do save. Substitui o `?hora=noite` antigo, que só baixava a luz ambiente.

## Consequências
- O sombreado direcional das faces continua fixo (sol baixo de +X/−Z): o sol que se move é só o ponto no céu; sombra projetada, luz de céu aberto vs. sombra e nuvens (Y ≈ 192) ficam para depois.
- Os sprites de fragmento escurecem com a noite (mínimo 0,4); a luz de lanterna não os alcança ainda.
- Custo: o atributo `glow` soma 3 floats por vértice (+~33% de memória de malha); a atualização do céu a cada ~0,25 s de jogo mexe em ~325 vértices.
- **Desempenho (cena de 12 lanternas com edição contínua, ciclo rodando, emulador a CPU 4× mais lenta):** 12,9 ms por quadro com malha (era 12,3 ms), 54 FPS estáveis: o ciclo não custa remalhagem.
