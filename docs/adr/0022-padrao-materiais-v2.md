# ADR 0022 — Padrão de Materiais V2: texturas planas, geometria do motor

- **Status:** aceita; **em validação** (Etapas 0 e 1 na v0.81.0; o jogo continua no atlas legado)
- **Data:** 2026-11-07
- **Pedido:** o dono do produto e a área de arte definiram o "Padrão Oficial de Materiais e Blocos V2" (pacote em
  [`docs/materiais-v2/`](../materiais-v2/README.md)). O dono aprovou a recomendação de implementar por etapas, comparando
  frente 16 × 18 numa cena antes de decidir.
- **Substitui em parte:** ADR 0006 (materiais tirados da prancha de cubos 3/4) — vale para os materiais ainda não
  migrados.

## Decisão

1. **A arte entrega material, não cubo.** Cada material é uma pasta `assets-src/materiais/<material>/` com PNGs
   128×128: `top.png` (repetível nos 4 lados), `front.png` (janela útil 128×64 no alto) e, opcional,
   `front_overlay.png` (franja com alfa nos 32 px de cima da janela). Contrato: `assets-src/materiais/CONTRATO.md`.
2. **O motor monta a geometria.** `composeCube(drawTop, drawFront, outline, front)` recebe a altura da frente; topo
   32×32, frente `front` px, âncora na base da frente (`oy = -front`). Ordem interna: frente → franja → sombra da
   frente → topo → aresta/contorno (contrato de geometria § 5). Chão plano desenha só o topo.
3. **Pipeline único:** `scripts/build-materials.py` valida (tamanho, opacidade, franja, emenda relativa) e gera
   `src/assets/materials-v2.webp` + `materials-v2.json` (linhas `top`, `f16`, `f18`, `o16`, `o18`). A linha de 18
   (janela 128×72) existe **só para comparar**; se a decisão for 16, ela sai do pipeline.
4. **Composição por bloco em `render/materialsV2.ts` (`V2_BLOCKS`)**: topo, frente e franja podem vir de materiais
   diferentes (grama = topo de grama + frente de terra + franja de grama). É aparência: regras do bloco seguem em
   `world/blocks.ts`.
5. **Validação atrás de chave**: `?blocos=v2` troca chão e cubo dos blocos-piloto (areia, terra, grama, Pedra Bruta) no mundo, com a
   frente atual (18); `?escala=1` abre a cena de comparação (legado 18 · V2 18 · V2 16). Sem chave o atlas V2 nem baixa.
6. **Transições horizontais (Etapa 3) só na camada de chão plano**, entre topos da mesma altura; nunca sobre o topo de
   cubos empilhados (onde há degrau vale borda/relevo, não máscara). As máscaras das 47 combinações saem de **~13
   formas desenhadas**, giradas/espelhadas pelo script: **máscara é forma, não textura** (exceção registrada em
   CONVENTIONS à regra "texturas sempre na direção desenhada").

## Por que assim

- O pacote pede compatibilidade gradual e reversível (01, "Reversibilidade"; 05, Fase D): a chave mantém o jogo
  intacto e deixa comparar no próprio motor.
- Frente 16 × 18 é escolha artística (01, "Por que 16?"): decidir olhando a cena, não a prancha. Mudar `CUBE_FRONT`
  afeta câmera, empilhamento, portas, paredes e celestiais (usos listados em NEXT_STEPS, Fase V).
- Misturar só no chão plano evita a máscara atravessar degraus (04, § 5) e mantém o custo no cache do chunk.

## Consequências

- `composeCube` ganhou o parâmetro `front` (padrão `CUBE_FRONT`): nada muda para quem não passa.
- A arte oficial de terra, grama (com franja), areia e Pedra Bruta chegou na mesma versão (`scripts/import-material.py`);
  `make-provisional-materials.py` fica para testar materiais futuros antes da arte.
- O atlas V2 sai **sem perdas** e reduzido como ladrilho (o WebP com perdas e a redução do quadro solto criavam fio nas
  emendas). É pequeno (~42 kB) e fora do orçamento de início enquanto a chave estiver desligada.
- Pendências: transições (Etapa 3), decisão 16/18 (Etapa 4), migração por lotes e retirada do atlas legado (Etapa 5).
