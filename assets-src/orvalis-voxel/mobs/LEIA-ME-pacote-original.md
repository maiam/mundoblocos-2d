# Mobs animais • atlas UV de 64 × 64 px

O lote contém um PNG RGBA por entrada da seção **Lista de animais** da Minecraft Wiki. Cada PNG é um atlas único e original. Os retângulos pintados são faces de caixas articuladas. As áreas livres do PNG têm transparência alfa.

## Anatomia e variantes

A ficha de cada mob no mapa JSON contém a página de referência e a característica anatômica que guiou a montagem. As medidas, poses de repouso, paletas e coordenadas UV são do projeto. Use o mapa deste pacote para montar a geometria correspondente. O lote traz uma aparência-base por mob. O baiacu aparece inflado e o cubo de enxofre está no estado base.

## Uso no Three.js

1. Carregue o PNG da ficha com TextureLoader. Use NearestFilter na ampliação e redução e desative mipmaps para manter o pixel nítido.
2. Crie um BoxGeometry por parte, dividindo as medidas e posições por 16 para obter unidades de bloco. O eixo Y aponta para cima e a frente é −Z.
3. Leia os retângulos UV como x, y, largura e altura em pixels, medidos a partir do canto superior esquerdo do PNG. Cada face tem densidade de um texel por pixel de geometria. Partes simétricas podem reutilizar as mesmas faces.
4. Posicione o grupo de articulação pelo pivô relativo ao pai. Dentro do grupo, aplique à malha o deslocamento até o centro da caixa. A função montarMob mostra essa montagem. As juntas podem ser animadas individualmente.
5. Em montagens que usam planos para asas ou barbatanas, este pacote usa caixas finas. O exemplo monta as peças em repouso. As animações ficam a cargo do motor.

Fonte da lista  
<https://pt.minecraft.wiki/w/Animal>
