#!/usr/bin/env python3
"""Converte o terreno do Vale Goblin (assets-src/santuario-vale-goblin/seed.json) em dados compactos para o jogo (ADR 0038).

Gera src/world/valeGoblinData.ts: alturas (uma string por linha, norte → sul, um caractere por célula oeste → leste, base 36 de `altura`), superfícies (`g` grama,
`t` trilha, `r` rocha), a caverna, a fogueira e os goblins, tudo em células locais do bloco 64 × 64 (coluna = x + 32, linha = z + 32).
Rode de novo se o pacote mudar: python3 scripts/make-vale-goblin-data.py
"""
import json, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'assets-src' / 'santuario-vale-goblin' / 'seed.json'
d = json.loads(src.read_text())
digits = '0123456789abcdefghijklmnopqrstuvwxyz'
H = [[0] * 64 for _ in range(64)]
S = [[''] * 64 for _ in range(64)]
for ch in d['chunks']:
    c0, r0 = (ch['x'] + 2) * 16, (ch['z'] + 2) * 16
    for r in range(16):
        for c in range(16):
            H[r0 + r][c0 + c] = ch['alturas'][r][c]
            S[r0 + r][c0 + c] = {'grama': 'g', 'trilha': 't', 'rocha': 'r'}[ch['superficies'][r][c]]
assert all(0 <= v <= 35 for row in H for v in row) and all(ch != '' for row in S for ch in row)
cave = d['caverna']
voids = cave['vaziosXZ_YMinInclusivo_YMaxExclusivo']
out = ['// GERADO por scripts/make-vale-goblin-data.py a partir de assets-src/santuario-vale-goblin (terreno do Vale Goblin). Não edite à mão.',
       '// Células locais do bloco 64 × 64: coluna = x + 32, linha = z + 32 (norte → sul, oeste → leste). Alturas em base 36; superfície g = grama, t = trilha, r = rocha.',
       'export const VALE_ALTURAS: readonly string[] = [']
out += [f"  '{''.join(digits[v] for v in row)}'," for row in H]
out += ['];', 'export const VALE_SUPERFICIES: readonly string[] = [']
out += [f"  '{''.join(row)}'," for row in S]
out += ['];',
        '/** Caverna da borda sul: vazios [x, z, yMin, yMax) em células (x = coluna − 32, z = linha − 32), boca externa e interna [x, y, z]. */',
        f"export const VALE_CAVERNA = {{ bocaExterna: {json.dumps(cave['bocaExterna'])}, bocaInterna: {json.dumps(cave['bocaInterna'])}, vazios: {json.dumps(voids)} }} as const;",
        f"/** Fogueira do acampamento [x, y, z] e os 7 goblins (o Santuário ainda não tem monstros: só dados). */",
        f"export const VALE_FOGUEIRA = {json.dumps(d['fogueira'])} as const;",
        f"export const VALE_GOBLINS: readonly (readonly [number, number, number])[] = {json.dumps(d['goblins'])};", '']
(root / 'src' / 'world' / 'valeGoblinData.ts').write_text('\n'.join(out))
print('ok', 'alturas', min(map(min, H)), '-', max(map(max, H)), 'vazios', len(voids), 'goblins', len(d['goblins']))
