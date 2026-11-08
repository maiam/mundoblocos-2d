# ADR 0025 — NPCs nomeados, caixa de conversa e a saída do chibi modular

- **Status:** aceita
- **Data:** 2026-11-08 (v0.92.0)
- **Substitui:** ADR 0017 (personagem modular), removida; o texto fica no histórico do git.

## Contexto
O dono do produto pediu uma **caixa de conversa** (moldura com retrato, nome e texto, em páginas) para toda fala de NPC,
mandou 15 NPCs novos de folha pronta e decidiu **excluir** os moradores antigos (menos o ferreiro, que passa a se chamar
Black), as expressões e **tudo do chibi modular**.

## Decisões
- **NPC = folha pronta + nome + falas** (`game/npcs.ts`, fonte única). Saem as camadas de roupa/rosto/franja e
  `extract-villagers.py`. O Black usa uma folha composta do ferreiro antigo (base preta + expressão + roupa de ferreiro).
- **Nomes dos 15 novos escolhidos pelo assistente** (o dono do produto autorizou); tabela em `docs/domains/npc.md`.
  As falas são provisórias, curtas e só citam regras que existem.
- **Caixa de conversa só de interface** (`game/dialogue.ts`, DOM por cima do canvas): sem protocolo de rede, sem estado salvo.
  O NPC fica parado e virado para a personagem enquanto a caixa estiver aberta. Texto em páginas medidas no DOM
  (`paginate`); ▼ quando há mais; fecha por distância, dano ou painel aberto.
- **Retrato = cabeça do quadro de frente** da própria folha (`make-portraits.py`): sem arte nova por NPC.
- **Carga sob demanda**: folhas, retratos e moldura ficam fora do orçamento de início (o início segue ~2,9 de 3 MB).
- **Chibi removido por inteiro**: `render/modular*.ts`, tela de montagem, `?personagem=chibi`, `export-personagem.py`, assets
  e contrato. A aparência virou só `body` (um dos 5 personagens prontos). **Protocolo 20** (sem `look`) e **salvamento v12**
  (o campo some; quem usava o chibi continua com o `body` salvo, a Heroína por padrão).

## Consequências
- Mundos salvos e salas antigas abrem normalmente; só o chibi se perde (vira o personagem pronto salvo).
- NPC novo = folha + retrato + uma entrada em `NPCS` + dois imports no pacote de arte + uma linha em `SPECS`.
- Falas com escolhas, lojas e missões ficam para depois (NEXT_STEPS).
