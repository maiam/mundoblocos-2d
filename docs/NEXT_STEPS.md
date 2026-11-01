# Próximos passos

1. **Persistência de edições** — curto prazo: serializar chunks `modified` por seed em `localStorage`
   (conveniência local). Longo prazo/ecossistema: salvar mundos por conta exige endpoint no core
   (`core.maiamapps.com.br`) — **ajuste recomendado para o core**, não implementar backend aqui.
2. Personagem jogável com física AABB contra blocos sólidos (câmera seguindo).
3. Iluminação por propagação (flood-fill de luz por chunk) substituindo a aproximação por profundidade;
   tochas como bloco emissor.
4. Água com fluxo simples (autômato celular por tick, só em chunks carregados).
5. Geração em Web Worker se o custo por chunk crescer.
6. Inventário real (contagem de blocos quebrados/colocados).
