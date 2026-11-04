# ADR 0011 — Salvamento automático no navegador (por mundo e seed)

**Status:** aceito (2026-11-02)

## Contexto
Nada persistia ao recarregar. Não pode haver backend neste repositório (contas e nuvem pertencem ao core
`core.maiamapps.com.br` — superado pela ADR 0015: backend próprio do Orvalis). O terreno não editado já é função pura da seed (ADR 0001).

## Decisão
- `game/save.ts` (camada `game/`, pois usa `localStorage`): `captureSave` / `applySave` puras + `SaveStore`.
- Salva só o que a seed não reconstrói: chunks `modified` (chão + níveis, base64), heroína (posição, vida,
  direção), item selecionado, inventário (inclui espólios), ovelhas, monstros vivos e renascimentos da dungeon,
  hora do dia. Plantações se reconstroem a partir dos chunks (`World.restoreChunk`).
- Formato versionado (`SAVE_VERSION`, `migrate`): versão desconhecida → começa do zero, sem quebrar.
- Chave por mundo e seed (`mundoblocos:save:<mundo>:<seed>`) + ponteiro `mundoblocos:last:<mundo>`: abrir sem
  `?seed=` continua o último; trocar de seed não apaga o outro progresso.
- Automático: a cada 10 s, ao esconder a aba (`visibilitychange`), ao sair (`pagehide`), ao abrir o menu e ao trocar de
  mundo. Armazenamento bloqueado (aba anônima/host) → o jogo segue sem salvar e o menu avisa.

## Consequências
- Estado novo que precise persistir deve entrar em `SaveData` (e subir `SAVE_VERSION` com migração se mudar o formato).
- Limite do `localStorage` (~5 MB por origem) comporta milhares de chunks editados; se crescer, migrar para IndexedDB.
- Itens caídos no chão e o estado de namoro das ovelhas não são salvos (transitórios).
- Sincronizar entre aparelhos exige endpoint no backend do Orvalis (ADR 0015; antes "core").
