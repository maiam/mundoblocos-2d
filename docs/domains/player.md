# Domínio: player (game)

- `Player`: posição em células no **centro dos pés**, velocidade 4,2 células/s, caixa de colisão dos pés
  0,54 × 0,30 célula, movimento separado por eixo (desliza em paredes).
- **Altura**: `z` = nível de apoio (0–2). Um passo é aceito se todas as células sob os pés têm `standHeight` não
  nulo e ≤ `z + STEP_HEIGHT` (1). Subir 1 por vez (chão → 1 → 2); descer é livre. `z` passa a ser a maior altura sob
  os pés. `visualZ` suaviza a transição (k = 14/s); o sprite e a câmera usam `visualZ × CUBE_FRONT`.
- Após quebrar/colocar, `settle()` reajusta `z` (ex.: bloco sob os pés foi quebrado).
- Direção do sprite pelo eixo dominante do vetor de entrada, com histerese para não tremular na diagonal.
- Entrada: joystick virtual + WASD/setas somados no mesmo vetor **em direções de tela**; como a câmera não
  rota, isso é também a direção no mapa.
- Câmera: alvo = pés − 0,4 × altura do personagem; suavização exponencial (k = 9/s). Por usar a posição
  lógica, o balanço dos quadros de caminhada não move a câmera.
- Interação: **toque/clique curto (≤ 0,3 s, ≤ 10 px) coloca**; **segurar 2 s (`BREAK_HOLD_S`) sobre o mesmo alvo
  quebra** (o progresso reinicia se o alvo mudar ou ficar inválido; ao quebrar, continua no que está por baixo).
  Feedback no canvas: rachaduras progressivas + anel. Alcance 4,5 células; não é possível colocar bloco na célula ocupada pela personagem nem cavar o
  chão sob ela (regra de ocupação no `Game`; o domínio garante que buraco não é pisável).
