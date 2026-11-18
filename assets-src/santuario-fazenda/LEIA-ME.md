# Fazenda do Santuário — heightmap v1

Reconstrução técnica interpretativa da referência ilustrada. Não é medição fotogramétrica nem conversão da luminosidade da imagem. Gerado numericamente com o script incluído; Terrain Studio não foi utilizado.

## Importação
- `heightmap_64x64_16bit.png`: 4.096 alturas nos centros das células; para terreno lógico por célula.
- `heightmap_vertices_65x65_16bit.png`: 4.225 amostras nas bordas/vértices para malha de 64 × 64 faces. Calculado pelo mesmo campo contínuo; não é uma borda duplicada do mapa de células.
- PNG grayscale de 16 bits, opaco e sem canal alfa: todos os pixels são dados. Preto = altura 0; branco = altura 8. Ler como dados lineares, não sRGB. Fórmula: Y = uint16 / 65535 × 8.
- 1 célula = 1 unidade horizontal proposta. X cresce para leste; Z cresce para sul; Y é altura. Linha superior = norte. Limites espaciais [-32,32]; células -32..31; chunks -2..1.
- Ao cortar chunks de 16 × 16 células não renormalizar alturas. Para a malha cada chunk usa 17 × 17 vértices e compartilha sua borda com o vizinho.
- A versão de células e a de vértices são convenções distintas; escolher conforme a implementação do motor.

## Água e relevo
Plantações e pátio no nível 2; floresta norte em patamares até nível 8. Rio escavado com saída ao sul, lago alargado no sudeste e queda ao norte. A distribuição é aproximada, pois a referência está em perspectiva.
`agua_mask_64x64.png`: branco = água; preto = seco. `agua_superficie_64x64.csv`: altura da superfície em cada célula molhada; NaN nas demais. O heightmap representa o fundo do rio, não sua superfície. A água requer malha própria, inclusive na queda. Ponte, casa, árvores, rochas, cercas e cultivos são objetos separados, não alturas do terreno.

## Arquivos auxiliares
`alturas_celulas_64x64.csv`: alturas em unidades, sem codificação de cor.
`heightmap_previa_768.png`: ampliação por vizinho mais próximo, 8 bits, apenas visualização — não importar como mapa principal.
`previa_tecnica.png`: relevo, água e limites de chunks para revisão.
`parametros.json`, `gerar_heightmap.py` e `validacao.json`: convenções, geração reproduzível e verificações. Não há seed aleatória; os pontos de controle determinam o terreno.

O script requer Python com NumPy, SciPy, Pillow e Matplotlib. Executar `python3 gerar_heightmap.py` para regenerar.
Não implementado no jogo. Rampas, colisões e limites de inclinação precisam ser testados com o controlador real do personagem; as checagens feitas aqui são de dados e áreas planas. Não há máscara de biomas/cultivos nem colisão neste pacote.
