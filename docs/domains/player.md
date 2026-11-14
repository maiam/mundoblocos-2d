# Domínio: player (game)

- **Tela de entrada e aparência** (v0.50.0, `game/title.ts`): no mundo principal, sem `?seed=`/`?personagem=`, o jogo
  abre no título "Orvalis" com o mundo em vitrine atrás (`GameOptions.showcase`: sem HUD, sem entrada, sem salvar,
  câmera passeando pela praça). **Novo jogo** → montar o personagem: um dos **7 personagens prontos** (Heroína, Herói, Hood, Gino, Mila, Grewn), prévia andando nas 4 direções
  (`render/characterPreview.ts`) e **Nome** (o mesmo `mundoblocos:nome` do multiplayer). **Começar** cria
  um mundo com seed aleatória e o personagem escolhido. **Continuar** (só com jogo salvo) abre o último mundo.
- **Sentar e levantar** (v0.79.0 Gino; v0.80.0 Heroína, Herói e Hood — `SIT_BODIES`/`canSit`): tocar numa cadeira ou num banco da
  cidade ao alcance senta (`Player.sitOn`: anda até o assento, vira de frente e senta no lugar, com os pés na célula da frente e o corpo sobre ele — `SEAT_FEET`, v0.79.2 — folha
  `gino-sit` em sequência: 0–3 sentando, parado no quadro 3, 3→0 levantando; v0.79.1). Mexer o controle ou tocar de
  novo levanta (`standUp`) e ele anda de volta para onde estava; levar dano levanta na hora. Na sala, os outros veem (`PlayerState.sit` = quadro; protocolo 18).
- **Grewn** (v0.93.80, teste do estilo chibi de cabeça grande): sétimo personagem pronto (repouso como base, 5 caminhadas com ferramenta, 5 golpes e sentar; `assets-src/grewn`); entra em `APPEARANCE_BODIES` (protocolo 25), `HERO_NAMES`, `SIT_BODIES`, `SPECS` e `art/principal.ts`.
- **Mila** (v0.91.0): sexto personagem pronto (caminhada, 5 caminhadas com ferramenta, 5 golpes e sentar; `assets-src/mila`); entra só em `APPEARANCE_BODIES` (protocolo 19), `HERO_NAMES`, `SIT_BODIES`, `SPECS` e `art/principal.ts` — nada mais.
- **Gino** (v0.77.0): quinto personagem pronto (caminhada, caminhada com as 5 ferramentas, 5 golpes). A lista de
  personagens prontos é uma só: `APPEARANCE_BODIES` (`net/protocol.ts`) = `HERO_BODIES`; nomes em `HERO_NAMES`.
- **Na sala** (v0.72.0): os outros veem a ferramenta na mão e o golpe (`PlayerState.tool`/`swing` → `RemotePlayers`, o
  mesmo desenho de `heroActorKind`).
- **Hood** (v0.71.0): quarto personagem da tela (`HeroBody` ganha `hood`; botões gerados de `HERO_BODIES`/`HERO_NAMES`);
  caminhada sem ferramenta e com as 5 ferramentas; golpes próprios das 5 desde a v0.75.0 (`hood-<ferramenta>-attack`).
  Na sala, aparece como Hood para os outros (protocolo 14).
- **Herói** (v0.65.0; redesenhado com caminhada por ferramenta na v0.76.0): terceiro personagem da tela (`HeroBody` = `heroine` | `hero` em `Entities.body`, salvo em
  `SaveData.body`); atores `hero`, `hero-<ferramenta>`, `hero-<ferramenta>-attack`. **Novo mundo** no menu do jogo abre
  a mesma escolha de personagem (`TitleScreen` com `creatorOnly`; "Voltar" volta ao mundo de antes).
  O personagem fica em `Entities.body` → `SaveData.body`; vai junto para "Novo mundo", "Recomeçar" e a sala do multiplayer.

- **Grade**: 9 itens + Personagem + Habilidades + Bolsa (ver `domains/farming.md`); tocar num item seleciona (de novo =
  mão vazia). Ao cair, renasce ao lado da última tenda (ou na praça inicial da Cidade do Despertar).
- **Ferramentas**: `Player.equipped` = ferramenta do espaço selecionado na hotbar (ou null); muda o sprite
  (`heroine-<ferramenta>`). **Enxada** (folha de ação `heroine-hoe-attack`): toque curto toca a
  animação de arar e troca Terra/Terra com Grama → Terra Arada (`World.till`). Segurar 1 s **quebra só plantas e
  derivados** (`organic: 'plant'`: capim, flor, trigo, cacto), repetindo a animação; **não** quebra madeira,
  árvores nem blocos minerais, e **não acerta** entidades.
- **Espada**: toque/clique curto = **golpe** (`Player.startAttack`, 0,36 s, 4 quadros da folha de ataque). O acerto
  sai uma vez no meio do golpe (`consumeHit`) na direção em que ela olhava (fixa durante o golpe; pelo mouse ela
  vira para o cursor antes). Alvos: entidades num arco à frente (`Entities.strikeTargets`, alcance 1,45 célula,
  cosseno ≥ 0,3). **Animais atingidos somem** (sem animação de morte ainda); monstros futuros entram pelo mesmo
  `Entities.strike`. **A espada não quebra blocos, itens nem elementos** (`canBreakAt` = false; segurar não faz
  nada) e não tem alvo de célula; o alvo é marcado por anel vermelho na entidade à frente.
- **Golpe em monstros** (espada/machado): dano pela fórmula (ataque + poder da arma − defesa, ±10%, crítico) na aranha no arco (alcance contado da borda do corpo);
  anel vermelho marca o alvo. Ver `domains/dungeon.md`.
- **Fome** (v0.56.0): `Player.hunger` 0–100 (`HUNGER` em `world/progression.ts`), só com `WorldProfile.hunger`. Esvazia
  ~0,14/s (~12 min); abaixo de `regenMin` (30) não regenera; vazia tira 2 de vida a cada 4 s, parando em 1; `respawn`
  enche. `eat(pontos)` recusa com a barra cheia. Comer pelo botão/clique com alimento na mão (`ActionController.eatInstead`):
  se o alimento também planta e o alvo é terra arada livre, planta; senão, come. Pesos: `FOOD` (maçã 15, cenoura 12,
  batata 10, tomate 8, pão 35, macarrão ao molho 70). Barra na HUD sempre visível, abaixo da vida.
- **Vida**: pontos (`Player.hp` / `Player.maxHp`, atributos em `Player.stats` — `world/progression.ts`), `hurt`
  (invencível 0,9 s + recuo), regeneração fora de combate e `respawn` (o `Game` a faz renascer na tenda ou na cidade). Detalhes em `domains/dungeon.md`.
- **Machado**: toque curto = **golpe** (folha `heroine-axe-attack`), igual à espada: acerta entidades no arco
  (animais somem). Segurar 1 s **corta só o que é orgânico** (`BlockDef.organic` = `wood` ou `plant`: tora,
  piso de carvalho, carvalho, cerejeira, cacto, capim, flor, trigo); enquanto corta, a animação de golpe repete
  (e acerta entidades no arco). Pedra, terra, areia etc. não quebram. Foco/cursor só destacam o que dá para cortar.
- **Pá** (folha `heroine-shovel-attack`): toque curto toca a animação de cavar e troca Terra/Terra com Grama/Terra
  Arada livre → Caminho de Terra (`World.flatten`). Segurar 1 s cava **só blocos macios** (`BlockDef.soft`: terra,
  grama, arada, caminho, areia) e **plantas, destruídas sem drop** (`toolDrops`); não quebra pedra, madeira,
  árvores; **não acerta** entidades.
- **Picareta** (folha `heroine-pickaxe-attack`): toque curto toca a animação de minerar (sem efeito no mundo).
  Segurar 1 s quebra **qualquer bloco** (pedra, terra, areia… cubo ou chão) e plantas — **sem drop** —, menos
  madeira e árvores (`breaks: 'nonWood'`); **não acerta** entidades.
- Restrição por ferramenta no registro (`world/items.ts`): `breaks` (`any` | `none` | `organic` | `plant` | `soft` | `nonWood`; exceções em `alsoBreaks`, ex.: picareta → tenda;
  via `toolCanBreak` em `Game.canBreakAt`), `destroysPlants` (sem drop, via `toolDrops`), `groundUse` (`till` |
  `flatten`: o que o toque faz no chão), `swings` (tem animação de ação; define o ator `heroine-<t>-attack`) e
  `strikes` (o golpe acerta entidades — espada e machado sim, enxada, pá e picareta não).
- **Porta**: tocar numa porta (botão de ação na célula à frente, ou clique nela) abre/fecha com qualquer item em
  mãos — prioridade sobre o uso do item; não fecha se alguém estiver na célula. Destaque/foco marcam a porta.
- `Player` estende `Walker` (`game/walker.ts`, base compartilhada com NPCs) e é bloqueado por outras entidades.
- `Player`: posição em células no **centro dos pés**, velocidade 4,2 células/s, caixa de colisão dos pés
  0,54 × 0,30 célula, movimento separado por eixo (desliza em paredes).
- **Altura**: `z` = nível de apoio (0–3). Um passo é aceito se todas as células sob os pés têm `standHeight` não
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
  trigo). Toque curto = usar o selecionado (colocar/plantar/alimentar); segurar = quebrar (2 s mão/item, 1 s ferramenta; anel no botão +
  rachaduras no bloco). Personagem parada: cantoneiras pulsantes no alvo (douradas = há ação possível; rosadas
  = não); andando, nenhum alvo. O botão mostra o ícone do espaço selecionado ou uma mão (mão vazia).
- **Mão vazia**: tocar de novo no espaço selecionado (ou Esc) solta; começa com a mão vazia.
- No toque, tocar/segurar direto no mundo **não age** (só o botão); o mouse mantém clique/segurar no cursor.
- Regras por célula (`canUseAt`, `canBreakAt`, `canFeed`, `applyUse`) ficam no `ActionController`
  (`game/actionController.ts`) e são as mesmas para cursor e botão; o `Game` só repassa a entrada.
- **Tablet** (`ScreenMode.isTablet`: toque e lado menor da tela ≥ 600 px): o canvas aceita toque como clique (tocar =
  usar, segurar = quebrar, mesmas regras do mouse); o **botão de ação e o joystick ficam** (o botão voltou em v0.47.2 a
  pedido do dono do produto). Tocar num campo de texto (ex.: nome no menu) não pede tela cheia (`ScreenMode`).
- Interação pelo mouse: **clique curto (≤ 0,3 s, ≤ 10 px) coloca**; **segurar sobre o mesmo alvo (`breakSeconds`: 2 s mão/item, 1 s ferramenta)
  quebra** (o progresso reinicia se o alvo mudar ou ficar inválido; ao quebrar, continua no que está por baixo).
  Feedback no canvas: rachaduras progressivas + anel. Alcance 4,5 células; não é possível colocar bloco na célula ocupada pela personagem nem cavar o
  chão sob ela (regra de ocupação no `Game`; o domínio garante que buraco não é pisável).

## Combate: fluidez (v0.93.63)
- Golpe do jogador (`game/player.ts`): `ATTACK_CHAIN_AT` (70%) permite começar outro golpe depois do acerto; fila curta de `ATTACK_BUFFER_S` (0,18 s). Retorno (`game/game.ts`): `HITSTOP_*` e `SHAKE_*`; recuo do monstro escala com o dano (`Entities.strikeFrom` → `Monster.takeHit(..., knock)`).
- Monstros (`game/monster.ts`): `windup` (goblin/lagarto 0,4 s, lobos 0,3 s): arma o ataque, dá para esquivar, golpe recebido cancela; aranhas mordem na hora.

## Sensação de movimento (v0.93.69)
- `game/feel.ts` (constantes e `?sensacao=0`): `Player.smooth` liga a inércia curta (`vx`/`vy`) e o passo por distância; `Game` liga e adianta a câmera (`look`); `render/three/actorBillboards.ts` balança o corpo; `worldThreeRenderer.stepDust` solta poeira e pegadas por passada; `game/aimAssist.ts` vira o golpe do botão para o monstro à frente.
