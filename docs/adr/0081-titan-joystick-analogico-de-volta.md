# ADR 0081 — Titã: joystick analógico de volta no toque (v0.140.0)

**Status:** Aceita. Revisa o item 1 da ADR 0075.

Pedido do dono do produto: "Não gostei das setas como joystick. Pode voltar o joystick antigo".

- `.titan-stick` (120 px, miolo `i` de 48 px, captura de ponteiro, `lostpointercapture` encerra) substitui `.titan-dpad`; alimenta `input.stickX/Y` (analógico, normalizado ao círculo), posicionado com `--edge` (ADR 0077).
- Corrida (ADR 0076): `stickY ≤ −0,85` mantido por `SPRINT_HOLD_MS` (0,2 s), com a mesma regra de `moved`/velocidade; o FOV de corrida não muda.
- Mantido da ADR 0075: ação no ponto do dedo, anel de progresso, botão de pular quadrado, sem mira central no toque; do 0076, o modo de mira.
- Sem mudança de formato, protocolo ou gerador.
