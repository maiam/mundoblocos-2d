# ADR 0008 — Perfis de mundo (Santuário Celestial)

**Status:** aceito (2026-11-02)

## Contexto
Novo mundo "Santuário Celestial da Deusa da Vida": acessado por subdomínio, limitado a 10 chunks, chão todo de
nuvem, só a Deusa como personagem e só 18 blocos próprios. Duplicar o jogo criaria dois motores divergentes.

## Decisão
- `world/profiles.ts` define `WorldProfile` (terreno, limites, personagem, blocos, sistemas ativos, céu).
- `World` recebe o perfil: escolhe o `TerrainSource` (`WorldGenerator` ou `FlatGenerator`), aplica limites
  (`VOID` fora deles, carregamento recortado) e restringe `placementLevel` aos blocos do perfil.
- `Game`/`Entities`/`Renderer` leem o perfil (hotbar, inventário, rebanho, personagem, céu). Sem `if` por mundo
  espalhado: tudo vem de campos do perfil.
- Seleção: `VITE_WORLD` (build fixo) → subdomínio → `?mundo=` → principal. Um artefato por mundo.

## Consequências
- Novo mundo = novo perfil (+ blocos/arte/personagem), sem mexer no motor.
- Um único bundle leva a arte dos dois mundos (~2 MB por artefato); separar por mundo exigiria abandonar o
  arquivo único ou fazer build por mundo com tree-shaking de assets (futuro, se crescer).
- Subdomínio real depende de hospedagem do build estático (fora do Artifact).
