# Padrão Oficial de Materiais e Blocos V2 — pacote original

Pacote definido pelo dono do produto com a área de arte (07/11/2026), guardado aqui **sem edição**, como referência.
A decisão do repositório e o que já foi feito estão no [ADR 0022](../adr/0022-padrao-materiais-v2.md); o contrato de
entrega da arte está em `assets-src/materiais/CONTRATO.md`.

Correção de fato: o pacote (05, § 1) cita uma cena de escala `?escala=1` como já existente. Ela **não existia**; foi
criada na v0.81.0 (`src/render/scaleScene.ts`) para a comparação de frente 16 × 18.

| Arquivo | Conteúdo |
|---|---|
| `00-LEIA-ME.md` | visão geral e ordem de leitura |
| `01-ADR-DECISAO-ARQUITETURAL.md` | decisão: texturas planas 128×128, geometria do motor |
| `02-CONTRATO-TEXTURAS.md` | top, front (janela 128×64), front_overlay, máscaras |
| `03-CONTRATO-GEOMETRIA-E-RENDER.md` | 32×48, âncora, ordem de camadas, luz |
| `04-CONTRATO-TRANSICOES.md` | franja vertical; 8 vizinhos / 47 máscaras; prioridades |
| `05-PIPELINE-MIGRACAO-E-TESTES.md` | fases A–D, chunk de aceitação, critérios |
