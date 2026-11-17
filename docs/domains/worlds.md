# Domínio: mundos (perfis)

**Fonte de verdade:** `src/world/profiles.ts` (`WORLD_PROFILES`). O motor é um só; o perfil decide o que existe.

| Campo | Mundo principal | Santuário (v0.93.134, ADR 0036) |
|---|---|---|
| `terrain` | procedural (`WorldGenerator`) | **plano vazio de grama** (`FlatGenerator`) |
| `bounds` | ilimitado | **16 chunks = 4×4** (`cx -2..1`, `cy -2..1`) → 64×64 células |
| `character` | heroína | **Deusa da Vida** |
| `blocks` | materiais, objetos, paredes… | **8 materiais**: Terra, Grama, Terra Arada, Areia, Pedra, Pedra Lisa, Tora, Tábuas de Carvalho (pilha de 5, cubos cheios) |
| ferramentas / cultivo / ovelhas / cidade / missões | sim | **não** |
| câmera | 3/4 (oblíqua) | **isométrica fixa** (45° / 35,264°, sem seletor) |
| `sky` (fundo além das bordas) | escuro | degradê azul → lilás |
| como abre | padrão | **solo, sem servidor**: `?mundo=santuario` ou subdomínio; arte do pacote principal |

> O conteúdo celestial antigo (nuvem, 18 blocos, Deusa-laboratório, abaixo) é **histórico**: o código foi removido (v0.93.133–134) ou aguarda a limpeza final (`celestialArt.ts`, `art/santuario.ts`, ids 80–97 em `blocks.ts`). A Sala 2 online segue em `ROOM_RULES`/servidor, mas a página do Santuário não a oferece mais.

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
- **Arte:** prancha 3/4 fornecida (`assets-src/celestial-blocks-34.png`, fundo transparente, 6×3) →
  `python3 scripts/extract-blocks.py --celestial` → `src/assets/celestial-atlas.webp` (topo, frente, chão contínuo)
  + `icon-celestial-*.webp` (cubo inteiro). Topo ≈ 46 % da altura do cubo (medido).
- Chão: blocos com desenho central/moldura (mármore ornamentado, pedra dourada, terra cultivada, água cristalina,
  cristal, bloco de luz, madeira) não giram; nuvens não giram nem espelham (formariam "V") e têm o chão com
  contraste reduzido (`soften`), porque cobrem o mapa inteiro. Demais giram/espelham por célula.
- A prancha isométrica (`celestial-blocks-iso.png`) fica só como referência.

## Deusa da Vida
- **Flutua em vez de caminhar.** Folha `assets-src/goddess-float-sheet.png` (7 quadros × 4 direções, fundo branco,
  legendas à esquerda, linhas frente/direita/trás/esquerda) → `process-sprite.py --cols 7 --rows 4
  --region 130,0,1470,1000 --rows-map 0,3,1,2 --frame-h 160 --sat 16 --min 228` → `src/assets/goddess-float.webp`.
- Animação (`SheetSpec.float` em `render/character.ts`): quadros sempre rodando em vai-e-volta (7 q/s parada,
  10 q/s em movimento); paira 0,32 célula acima do chão com balanço de 3 px (senoide contínua, não zera ao
  parar); sombra no chão encolhe quando ela sobe. A câmera segue a posição lógica, então não balança.
- Altura desenhada 2,3 células (+0,32 de flutuação). A física continua a mesma (`Walker`): colide e sobe
  degraus como a heroína — flutuar é só visual por enquanto.
- A folha de caminhada antiga (`goddess-sheet.png`) e a prancha lateral ficam só como referência
  (a caminhada travava: 4 quadros com poses muito diferentes). A folha de flutuação não tem auréola.
- Ainda sem ferramentas nem ações próprias.

## Publicação
- O artefato próprio (`build:artifact:santuario`) e o `?celestial=1` foram **removidos** (v0.93.133, ADR 0036). O Santuário será refeito do zero em vista isométrica (NEXT_STEPS); este perfil (nuvem, 18 blocos celestiais) é o conteúdo a ser substituído.
- Subdomínio real (`santuario.<domínio>`) exige hospedar o build estático (`dist/`) no domínio — pendente.
