# Domínio: player (game)

- **Ferramentas**: `Player.equipped` = ferramenta do espaço selecionado na hotbar (ou null); muda o sprite
  (`heroine-<ferramenta>`). **Enxada** (folha de ação `heroine-hoe-attack`): toque curto toca a
  animação de arar e troca Terra/Terra com Grama → Terra Arada (`World.till`). Segurar 2 s **quebra só plantas e
  derivados** (`organic: 'plant'`: capim, flor, trigo, cacto), repetindo a animação; **não** quebra madeira,
  árvores nem blocos minerais, e **não acerta** entidades.
- **Espada**: toque/clique curto = **golpe** (`Player.startAttack`, 0,36 s, 4 quadros da folha de ataque). O acerto
  sai uma vez no meio do golpe (`consumeHit`) na direção em que ela olhava (fixa durante o golpe; pelo mouse ela
  vira para o cursor antes). Alvos: entidades num arco à frente (`Entities.strikeTargets`, alcance 1,45 célula,
  cosseno ≥ 0,3). **Animais atingidos somem** (sem animação de morte ainda); monstros futuros entram pelo mesmo
  `Entities.strike`. **A espada não quebra blocos, itens nem elementos** (`canBreakAt` = false; segurar não faz
  nada) e não tem alvo de célula; o alvo é marcado por anel vermelho na entidade à frente.
- **Machado**: toque curto = **golpe** (folha `heroine-axe-attack`), igual à espada: acerta entidades no arco
  (animais somem). Segurar 2 s **corta só o que é orgânico** (`BlockDef.organic` = `wood` ou `plant`: tora,
  piso de carvalho, carvalho, cerejeira, cacto, capim, flor, trigo); enquanto corta, a animação de golpe repete
  (e acerta entidades no arco). Pedra, terra, areia etc. não quebram. Foco/cursor só destacam o que dá para cortar.
- Restrição por ferramenta no registro (`world/items.ts`): `breaks` (`any` | `none` | `organic` | `plant`, via
  `toolCanBreak` em `Game.canBreakAt`), `swings` (tem animação de ação) e `strikes` (o golpe acerta entidades —
  espada e machado sim, enxada não). Pá e picareta ainda sem ação própria (quebram tudo).
- `Player` estende `Walker` (`game/walker.ts`, base compartilhada com NPCs) e é bloqueado por outras entidades.
- `Player`: posição em células no **centro dos pés**, velocidade 4,2 células/s, caixa de colisão dos pés
  0,54 × 0,30 célula, movimento separado por eixo (desliza em paredes).
- **Altura**: `z` = nível de apoio (0–2). Um passo é aceito se todas as células sob os pés têm `standHeight` não
  nulo e ≤ `z + STEP_HEIGHT` (1). Subir 1 por vez (chão → 1 → 2); descer é livre. `z` passa a ser a maior altura sob
  os pés. `visualZ` suaviza a transição (k = 14/s); o sprite e a câmera usam `visualZ × CUBE_FRONT`.
- Após quebrar/colocar, `settle()` reajusta `z` (ex.: bloco sob os pés foi quebrado).
- Direção do sprite pelo eixo dominante do vetor de entrada, com histerese para não tremular na diagonal.
- Entrada: joystick virtual + WASD/setas somados no mesmo vetor **em direções de tela**; como a câmera não
  rota, isso é também a direção no mapa.
- Tela (`game/screenMode.ts`): só em aparelhos de toque. 1º `pointerup` → `requestFullscreen` →
  `screen.orientation.lock('landscape')`; falhas ignoradas. Em retrato, a camada "Gire o aparelho" cobre o jogo
  e o `Game` zera entrada/quebra (`ScreenMode.blocked`). Desktop não é afetado.
- Câmera: alvo = pés − 0,4 × altura do personagem; suavização exponencial (k = 9/s). Por usar a posição
  lógica, o balanço dos quadros de caminhada não move a câmera.
- **Botão de ação** (`game/actionButton.ts`, lado direito, só toque; no desktop: barra de espaço): age no
  **alvo à frente** — a célula vizinha na direção em que a personagem olha (ou a ovelha logo à frente, com
  trigo). Toque curto = usar o selecionado (colocar/plantar/alimentar); segurar 2 s = quebrar (anel no botão +
  rachaduras no bloco). Personagem parada: cantoneiras pulsantes no alvo (douradas = há ação possível; rosadas
  = não); andando, nenhum alvo. O botão mostra o ícone do espaço selecionado ou uma mão (mão vazia).
- **Mão vazia**: tocar de novo no espaço selecionado (ou Esc) solta; começa com a mão vazia.
- No toque, tocar/segurar direto no mundo **não age** (só o botão); o mouse mantém clique/segurar no cursor.
- Regras por célula (`canUseAt`, `canBreakAt`, `canFeed`, `applyUse`) são as mesmas para cursor e botão.
- Interação pelo mouse: **clique curto (≤ 0,3 s, ≤ 10 px) coloca**; **segurar 2 s (`BREAK_HOLD_S`) sobre o mesmo alvo
  quebra** (o progresso reinicia se o alvo mudar ou ficar inválido; ao quebrar, continua no que está por baixo).
  Feedback no canvas: rachaduras progressivas + anel. Alcance 4,5 células; não é possível colocar bloco na célula ocupada pela personagem nem cavar o
  chão sob ela (regra de ocupação no `Game`; o domínio garante que buraco não é pisável).
