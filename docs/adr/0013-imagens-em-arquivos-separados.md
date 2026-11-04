# ADR 0013 — Imagens em arquivos separados e orçamento de início

**Status:** aceito (2026-11-03, v0.37.0). Substitui a parte "`?inline` / HTML de arquivo único" da ADR 0010 (os
pacotes de arte por mundo continuam).

## Contexto
O Artifact era um único HTML com todas as imagens embutidas em base64 (+33%). Com a arte da cidade chegou a
3,95 MB, acima da meta de 3 MB — e a meta de **total** fixo não se sustenta: cada cidade, NPC ou dungeon nova soma ao
mesmo arquivo, tudo precisa baixar antes do jogo abrir e qualquer mudança faz baixar tudo de novo. O limite real da
plataforma é 16 MB por página, e o Artifact aceita arquivos separados ao lado da página. Decisão do dono do produto:
opção 1 (arquivos separados + carregar sob demanda).

## Decisão
1. **Imagens viram arquivos**: os pacotes de arte (`render/art/<mundo>.ts`) importam as imagens como URL (sem
   `?inline`). O Vite gera `new URL("nome-hash.webp", import.meta.url)`; o código (JS + CSS, ~200 kB) segue
   **embutido** no HTML, então `import.meta.url` é o endereço da página e as imagens são publicadas **ao lado dela**
   com o mesmo nome (`scripts/build-artifact.mjs` copia para `artifact/<nome>-assets/` e grava o mapa
   `artifact/<nome>-files.json` para o parâmetro `files` da publicação). Imagens < 4 kB continuam embutidas (Vite).
2. **Código embutido de propósito**: `<script type="module" src>` de outro arquivo exigiria CORS se a página rodar
   isolada; `<img>` não exige. Pelo mesmo motivo, **nenhum canvas é lido** (`toDataURL`/`getImageData`): um canvas
   com imagem de outra origem fica "contaminado" e a leitura falha. O ícone da porta, que vinha de um canvas, virou
   arquivo (`icon-block-oak-door`).
3. **Orçamento de início**: o que o jogo **espera para começar** (página + imagens aguardadas) fica < 3 MB; o
   **total** pode crescer. O build mostra os dois números e avisa se o início passar de 3 MB.
4. **Sob demanda**: arte que não é usada no começo carrega **em segundo plano** depois do início. Primeiro caso: a
   dungeon (`blockArt.loadDungeonArt` → `textures.addDungeonTextures` → `ChunkRenderer.invalidateAll`). Folhas de
   personagem/monstro já baixavam sem bloquear (`Image` criada, não aguardada).

## Consequências
- Hoje: página 205 kB + 75 arquivos (2,8 MB); início ~2,5 MB, depois ~0,5 MB (dungeon e aranhas).
- O navegador guarda as imagens em cache: republicar só faz baixar o que mudou (nomes com hash).
- Publicar = página + `files` do manifesto (até 255 arquivos por publicação; 15 MB por arquivo).
- Hospedagem própria (CDN, domínio próprio do Orvalis) usa o mesmo `dist/` sem mudança de código.
- Próximos candidatos a segundo plano: folhas da heroína com ferramenta (~1 MB) e arte de regiões futuras.
