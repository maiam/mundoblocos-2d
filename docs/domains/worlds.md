# Domínio: mundos (perfis)

**Fonte de verdade:** `src/world/profiles.ts` (`WORLD_PROFILES`). O motor é um só; o perfil decide o que existe.

| Campo | Mundo principal | Santuário Celestial |
|---|---|---|
| `terrain` | procedural (`WorldGenerator`) | plano de **Nuvem Sólida** (`FlatGenerator`) |
| `bounds` | ilimitado | **10 chunks = 5×2** (`cx -3..1`, `cy -1..0`) → 80×32 blocos, x −48..31, y −16..15 |
| `character` | heroína | **Deusa da Vida** |
| `blocks` | 8 materiais da prancha | **18 blocos celestiais** (únicos colocáveis) |
| ferramentas / cultivo / ovelhas | sim / sim / sim | **não / não / não** |
| `sky` (fundo além das bordas) | escuro | degradê azul → lilás |

## Como o mundo é escolhido (`resolveWorldId`)
1. Build fixo `VITE_WORLD` (artefato próprio do Santuário).
2. Subdomínio: `santuario.<domínio>` (host com 3+ partes cujo primeiro rótulo está em `SUBDOMAINS`).
3. Parâmetro `?mundo=santuario` (testes e link direto pelo domínio principal).
4. Senão, mundo principal.

## Regras do mundo limitado (`World`)
- Fora dos limites: chão `VOID` ("Céu Aberto"), não pisável, não quebrável, não aceita bloco → a personagem para
  na borda. Objetos fora dos limites são `AIR`.
- `ensureChunks` recorta a área aos limites (nunca mais de 10 chunks carregados); `findSpawn` usa o centro.
- `placementLevel` só aceita ids de `profile.blocks` (vale também para o mundo principal).
- Quebrar a nuvem abre buraco; só bloco celestial preenche (vira piso).

## Blocos celestiais (`world/blocks.ts`, ids 80–97)
Nuvem Sólida, Nuvem Etérea, Mármore Celestial, Mármore Ornamentado, Pedra Celestial, Pedra Dourada, Grama Celestial,
Grama Florida, Musgo Luminoso*, Terra Sagrada, Terra Floral, Terra Cultivada, Água Sagrada, Água Cristalina,
Cristal da Vida*, Bloco de Luz*, Madeira Celestial, Folhagem Dourada. (*brilham à noite.)
- Todos são cubos sólidos de construção (as águas são blocos decorativos, não líquido).
- **Arte:** ícones = prancha fornecida (`celestial-blocks-iso.png`); faces no mundo = **provisórias**
  (`render/celestialArt.ts`) até chegar a prancha em 3/4 (decisão do usuário: não converter a isométrica).

## Deusa da Vida
- Folha `assets-src/goddess-sheet.png` (4×4, já transparente, ordem canônica) → `process-sprite.py --alpha
  --grid-offset-y 22` (as auréolas invadem a linha de cima) → `src/assets/goddess.webp`.
- Desenhada com 2,7 células (auréola + asas); a sombra vem na própria arte (`footPad`).
- `goddess-walk-side-board.png` (caminhada lateral em 8 quadros) guardada como referência; não usada.
- Ainda sem ferramentas nem ações próprias.

## Publicação
- Artefato próprio: `npm run build:artifact:santuario` → `artifact/santuario.html` →
  https://claude.ai/artifact/AMGLa2gvXUbqpvjCVWR4gb
- Subdomínio real (`santuario.<domínio>`) exige hospedar o build estático (`dist/`) no domínio — pendente.
