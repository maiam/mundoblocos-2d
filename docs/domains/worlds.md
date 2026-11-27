# Domínio: mundos (perfis)

**Fonte de verdade:** `src/world/profiles.ts` (`WORLD_PROFILES`). O motor é um só; o perfil decide o que existe.

> **Santuário removido (ADR 0115, v0.182.0, decisão do dono do produto):** o perfil `santuario`, o Rio das Fadas, a Fazenda, o Vale Goblin, o conjunto isométrico e a câmera isométrica fixa do 2.5D saíram do código. O **Mundo principal 2.5D** (`principal`) também vai sair na etapa 3 e hoje só abre por `?mundo=principal`.

| Campo | Mundo principal 2.5D (em saída) |
|---|---|
| `terrain` | procedural (`WorldGenerator`) |
| quebrar | pela ferramenta (1 s) ou mão (2 s) |
| objetos | no nível 0 da célula |
| `bounds` | ilimitado |
| `character` | heroína |
| ferramentas / cultivo / ovelhas / cidade / missões | sim |
| câmera | 3/4 (oblíqua) |

> **Orvalis em voxel** (v0.169.0, ADR 0105) é o **mundo padrão** (ADR 0115): registrado em `WORLD_PROFILES.orvalis3d` só para a URL; roda no motor do Titã, ver [titan.md](titan.md).
> **Titã** (v0.94.0, ADR 0039) é registrado em `WORLD_PROFILES.titan` só para a URL (**`?mundo=titan`**, nunca por subdomínio); é um motor voxel à parte, ver [titan.md](titan.md).

## Como o mundo é escolhido (`resolveWorldId`)
1. Build fixo `VITE_WORLD` (artefato próprio): `orvalis3d` no `build:artifact`.
2. Subdomínio: nenhum por ora (`SUBDOMAINS` vazio; o do Santuário saiu).
3. Parâmetro `?mundo=` (`orvalis3d`, `titan`, `principal` até a etapa 3).
4. Senão, **Orvalis 3D** (o padrão, ADR 0115).

## Regras do mundo limitado (`World`)
- Fora dos limites: chão `VOID` ("Céu Aberto"), não pisável, não quebrável, não aceita bloco → a personagem para
  na borda. Objetos fora dos limites são `AIR`.
- `ensureChunks` recorta a área aos limites (nunca mais de 10 chunks carregados); `findSpawn` usa o centro.
- `placementLevel` só aceita ids de `profile.blocks` (vale também para o mundo principal).
- Quebrar o piso abre buraco; só um cubo preenche (vira piso).

## Publicação
- O artefato (`build:artifact`) é o do Orvalis 3D (`VITE_WORLD=orvalis3d`). Sem subdomínios de mundo.
