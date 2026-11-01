# Domínio: render

Apenas apresentação; lê `World`, nunca escreve.

## Direção de arte — "ilustração digital de fantasia, RPG/anime"
- Cada bloco é um **cubo**: gradiente vertical, face superior clara (4px), lateral direita/base em sombra,
  filete de luz interno, cantos levemente arredondados, contorno na própria cor escurecida.
- Sombras puxam para índigo (`#1b1640`), luzes para creme (`#fffaf0`).
- Brilhos em estrela de 4 pontas (neve, ouro, cristais, flores). Blocos `glow` ganham halo aditivo pulsante.
- Paleta: grama `#6fd35a`, terra `#a86b42`, pedra `#8a90a6`, sakura `#ffa9cf`, musgo encantado `#45d6c4`,
  folhas mágicas `#6a6cf0`, cristal `#b26cff`.

## Pipeline
- `ChunkRenderer` pinta cada chunk num canvas 512×(512+pad) e só repinta quando `chunk.version` muda
  (máx. 3 por frame). Passos: parede de fundo (caverna) → tile → sombra de contato → bordas expostas →
  escurecimento por profundidade → tufos de grama (transbordam para a célula de cima; daí o `CHUNK_PAD_TOP`).
- Grama coberta por bloco opaco é desenhada como terra.
- Ordem do frame: fundo → chunks (cima→baixo) → brilhos → tinta dia/noite (+ brilhos de novo) → partículas →
  bordas de chunk → destaque do cursor.
