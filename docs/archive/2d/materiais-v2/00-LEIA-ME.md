# MundoBlocos 2D — Padrão de Materiais e Blocos V2.0

**Estado:** especificação de produto e arquitetura **aprovada para preparação e prova de conceito**; **não implementada no repositório**.  
**Data:** 07/11/2026  
**Escopo:** blocos regulares, texturas de materiais, transições e sua composição 2D.  
**Não incluído:** personagens, animais, mobília, portas, janelas, telhados e objetos com silhueta própria, salvo adaptação futura específica.

> **Importante:** este pacote é apenas documentação entregue fora do repositório. Nenhum arquivo de código, atlas, asset ou configuração do jogo foi alterado.

## Decisão central

**O artista cria texturas planas; o pipeline prepara os recursos; o motor determina geometria, iluminação, posicionamento e composição.** Não se exige mais que o artista entregue o cubo completo desenhado em perspectiva.

### Parâmetros do padrão

| Assunto | Padrão V2.0 |
|---|---|
| Textura original | **128×128 px**, PNG, sRGB |
| Grade do mundo | **32×32 px** por célula (em escala de mundo 1) |
| Chunk | **16×16 células** = 512×512 px de chão |
| Topo de cubo renderizado | **32×32 px** |
| Frente renderizada | **32×16 px** (alteração planejada; atual é 32×18) |
| Imagem lógica do cubo | **32×48 px** (sem excedentes decorativos) |
| Origem útil da frente | **128×64 px**, no canto superior esquerdo do PNG de 128×128 |
| Atlas interno previsto (resolução 2×) | Topo **64×64**; frente **64×32** |
| Vista | Híbrida frontal-superior 2D: topo quadrado + **uma** face frontal |
| Âncora | Base inferior da face frontal alinhada à base da célula |
| Transição vertical | Máscara/sobreposição alfa independente do substrato |
| Transição horizontal | Autotiling de **8 vizinhos**, biblioteca reutilizável de **47 máscaras válidas** |
| Materiais simultâneos | Prioridade determinística e configurável |
| Iluminação | Microtextura na arte; luz global e escurecimento da frente no motor |
| Continuidade | Texturas repetíveis (seamless) e bordas coerentes entre chunks |

**Observação essencial:** a frente 32×16 **não foi aplicada no código**. A alteração deve ser validada em cena antes de migrar todas as artes. O limite atual de empilhamento também não é alterado automaticamente por esta especificação.

## Documentos do pacote

1. [01-ADR-DECISAO-ARQUITETURAL.md](01-ADR-DECISAO-ARQUITETURAL.md) — justificativa, alternativas, decisão, consequências e escopo.
2. [02-CONTRATO-TEXTURAS.md](02-CONTRATO-TEXTURAS.md) — resolução, arquivos, área útil, repetição, transparência, acabamento e nomenclatura.
3. [03-CONTRATO-GEOMETRIA-E-RENDER.md](03-CONTRATO-GEOMETRIA-E-RENDER.md) — grade, medidas, ancoragem, desenho, empilhamento e luz.
4. [04-CONTRATO-TRANSICOES.md](04-CONTRATO-TRANSICOES.md) — transições horizontal e vertical, máscaras, prioridades e limites de relevo.
5. [05-PIPELINE-MIGRACAO-E-TESTES.md](05-PIPELINE-MIGRACAO-E-TESTES.md) — proposta de integração gradual, prova de conceito, testes e critérios de aceite.

## Exemplo mínimo: três texturas, vários blocos

Texturas-fonte:

- `areia/base.png`: areia plana repetível.
- `grama/topo.png`: cobertura verde repetível.
- `grama/franja-frontal.png`: **somente** folhas/grama com transparência (overlay vertical).

Composição:

| Bloco | Topo | Frente base | Overlay vertical |
|---|---|---|---|
| Areia | Areia | Areia | Nenhum |
| Areia coberta por grama | Grama | Areia | Franja de grama |
| Grama integral (se desejado) | Grama | Grama | Opcional |

A biblioteca de máscaras horizontais é **genérica**, não precisa ser redesenhada para cada par de materiais.

## O que NÃO fazer

- Não entregar um cubo em vista isométrica como textura de material.
- Não incorporar duas faces laterais nem transformar o topo em losango.
- Não incluir a sombra projetada do objeto no PNG base do material.
- Não distorcer ornamentos ou padrões regulares silenciosamente.
- Não pressupor que o jogo já utiliza o pipeline V2.0.
- Não alterar diretamente o repositório sem uma solicitação posterior explícita.

## Questões que ficam parametrizadas, não bloqueantes

Os números de **prioridade exata de cada material**, os conjuntos de **variantes artísticas**, o **filtro de reamostragem** e os detalhes visuais de cada máscara devem ser fechados/ajustados na prova de conceito. O **contrato de dimensões, âncoras e formato**, porém, já está definido.
