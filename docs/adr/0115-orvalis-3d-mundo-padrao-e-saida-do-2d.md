# ADR 0115 — Orvalis 3D é o mundo padrão; Titã só por `?mundo=titan`; Orvalis 2D, Santuário e isométrica 2.5D saem

**Status:** Aceita, por decisão do dono do produto (26/11/2026): *"Orvalis 2D, Santuário e visão isométrica podem sair. Orvalis 3D é o mundo padrão e Titã é acessível apenas por `?mundo=titan`."* Esta ADR registra a decisão e a **etapa 1** (v0.181.0); as etapas 2 e 3 são a remoção.

## Decisão
1. **Mundo padrão = Orvalis 3D** (`?mundo=orvalis3d`, o voxel em primeira pessoa). A raiz do site, sem parâmetro e sem subdomínio, abre o Orvalis 3D (`resolveWorldId`).
2. **Titã só por `?mundo=titan`** (ou build fixo `VITE_WORLD`): nunca por subdomínio nem como padrão.
3. **Saem do produto:** o **Orvalis 2D / 2.5D** (`World`, `Game`, render 2.5D, cidade, NPCs, dungeon…), o **Santuário** (mundo solo e Fazenda, Vale Goblin, Rio das Fadas, conjunto isométrico) e a **câmera isométrica fixa do 2.5D/Santuário**. **Fica** o botão **Visão** (primeira pessoa ↔ isométrica 2:1, `titan/iso.ts`, ADR 0106) do voxel — decisão explícita do dono do produto.
4. A **landing** (`src/landing`) sai junto; os **saves do 2D** (IndexedDB do navegador) não são apagados, mas nada mais os abre.

## Plano em etapas (um PR por etapa, merge se a Verificação passar)
- **Etapa 1 (v0.181.0, feita):** esta ADR; o padrão passa a ser `orvalis3d`; `?mundo=titan` único caminho do Titã; `build:artifact` passa a `VITE_WORLD=orvalis3d`. O 2.5D e o Santuário seguem no código, alcançáveis só por `?mundo=principal|santuario` (e subdomínio `santuario.`), para serem removidos nas etapas seguintes.
- **Etapa 2 (v0.182.0, feita):** removido o **Santuário** (perfil, `sanctuary*`, Fazenda, Vale Goblin, Rio, peças isométricas, arte, testes, docs).
- **Etapa 3 (v0.183.0, feita no jogo; o `orvalis-servidor` em PR própria):** removido o **2.5D** (`src/world`, `src/game`, `src/render` do 2.5D, `src/landing`, partes de `src/net` do 2.5D) e **ajustar o `orvalis-servidor` junto** (o pacote `vendor/orvalis-net.cjs` hoje traz a sala 2.5D; fica só a sala do Titã), com `PROTOCOL_VERSION` e docs; inclui limpar os invariantes do `CLAUDE.md`, ADRs obsoletas (marcar como substituídas) e o orçamento do Artifact.

## Consequências
- Sem mudança de gerador, de save do voxel nem de protocolo na etapa 1. Quem abria o site pela raiz passa a cair no Orvalis 3D.
- O `build:artifact` agora gera o Artifact do Orvalis 3D; **o "início" do Artifact está em ~13 MB** (orçamento 3 MB) porque o pacote ainda traz o 2.5D; deve cair na etapa 3 (anotado no `NEXT_STEPS`).
- Pendência de aceite herdada: WebGL no iframe do Artifact nunca foi testado (o Orvalis 3D exige WebGL).
- Testes: `world/santuario.test.ts` (resolução de mundo: padrão `orvalis3d`, Titã só pelo parâmetro).

## Etapa 3 — o que foi feito (v0.183.0)
- Removidos: `src/world` (menos `noise.ts` e `random.ts`), `src/game`, `src/render` do 2.5D (`render/three`, textures, blockArt…), `src/landing`, `src/auth`, `src/style.css`, `src/net` do 2.5D (`Room`, protocolo, sessão, loopback) e os testes deles; arte `src/assets` sem uso (de ~28 MB para ~4 MB), `assets-src` do 2.5D (de ~610 MB para ~67 MB), scripts de arte do 2.5D, `bench/`, `perf-cpu-3d`, `leak-3d`.
- Novos/ajustados: `titan/worldId.ts` (escolha do mundo, antes `world/profiles.ts`), `main.ts` mínimo, `net/titan/index.ts` (entrada do pacote do servidor; `build:net` agora empacota só a `TitanRoom`), `net/socket.ts` enxuto, `RendererStats` no `perfHud`.
- Documentação do 2.5D movida para `docs/archive/2d/` (estado, arquitetura, mapas, operações, convenções, plano antigo, domínios, Materiais V2); os documentos vivos foram reescritos só para o voxel.
- **Servidor:** o `orvalis-servidor` precisa remover as salas 1 e 2 (2.5D) e usar o pacote novo (`sync-net`); como o protocolo do Titã não mudou, o jogo novo funciona com o servidor antigo e vice-versa.
- Efeitos: saves do 2D no navegador ficam órfãos; o "início" do Artifact caiu para ~4,5 MB (meta 3 MB, a reduzir).
