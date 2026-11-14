"""Margem vazia embaixo dos pés de cada quadro das folhas de atores (v0.93.70).

As folhas têm folga diferente por direção e por quadro (a vaca de lado tem 10–18 px de 112 abaixo das patas; o Hood, 1–4 de 144),
e o desenho é colado pela base do quadro — quem tem folga maior parece flutuar. Este script mede, por folha e por linha de direção,
a MENOR folga entre os quadros (o quadro em que o pé está no chão) e grava `src/render/footMargins.ts` (fração da altura do quadro).
O jogo só lê a tabela; nunca lê pixels em tempo de execução.

Uso: python3 scripts/foot-margins.py   (rode de novo depois de gerar sprites novos)
"""
import re
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
art = (root / 'src/render/art/principal.ts').read_text()
character = (root / 'src/render/character.ts').read_text()

# identificador → arquivo (import x from '../../assets/arquivo.webp')
files = dict(re.findall(r"^import (\w+) from '\.\./\.\./assets/([\w-]+)\.webp';", art, re.M))
# bloco `actors: { ... },` → chave → identificador
block = art[art.index('  actors: {'):]
block = block[:block.index('\n  },')]
kinds = {}
for line in block.splitlines()[1:]:
    m = re.match(r"\s*(?:'([\w-]+)'|(\w+))(?::\s*(\w+))?,", line)
    if not m:
        continue
    kind = m.group(1) or m.group(2)
    ident = m.group(3) or m.group(2)
    if ident in files:
        kinds[kind] = files[ident]

# colunas × linhas de cada folha: lidas do SPECS (cols: N, rows: M) pela chave
def grid(kind):
    pat = re.compile(r"^\s*(?:'%s'|%s):\s*\{[^}]*?cols:\s*(\d+),\s*rows:\s*(\d+)" % (re.escape(kind), re.escape(kind)), re.M | re.S)
    m = pat.search(character)
    return (int(m.group(1)), int(m.group(2))) if m else None

out = {}
for kind, name in sorted(kinds.items()):
    g = grid(kind)
    if not g:
        continue
    cols, rows = g
    im = Image.open(root / f'src/assets/{name}.webp').convert('RGBA')
    a = np.asarray(im)[..., 3]
    fw, fh = im.width // cols, im.height // rows
    per_row = []
    for r in range(rows):
        best = None
        for c in range(cols):
            sub = a[r * fh:(r + 1) * fh, c * fw:(c + 1) * fw]
            ys = np.where(sub.max(axis=1) > 40)[0]
            if not len(ys):
                continue
            margin = (fh - 1 - int(ys.max())) / fh
            best = margin if best is None else min(best, margin)
        per_row.append(round(best or 0.0, 4))
    if any(per_row):
        out[kind] = per_row

lines = ["// Gerado por scripts/foot-margins.py — NÃO EDITE (rode o script depois de gerar sprites novos).",
         "// Folga vazia embaixo dos pés, em fração da altura do quadro, por linha de direção (a menor entre os quadros da linha).",
         "export const FOOT_MARGINS: Readonly<Record<string, readonly number[]>> = {"]
for kind, rows in out.items():
    lines.append(f"  '{kind}': [{', '.join(str(v) for v in rows)}],")
lines.append("};")
(root / 'src/render/footMargins.ts').write_text("\n".join(lines) + "\n")
print(f"{len(out)} folhas com folga; maiores:", sorted(((max(v), k) for k, v in out.items()), reverse=True)[:6])
