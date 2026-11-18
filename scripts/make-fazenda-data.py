#!/usr/bin/env python3
"""Converte o heightmap da Fazenda do Santuário (assets-src/santuario-fazenda) em dados compactos para o jogo.

Gera src/world/fazendaData.ts: uma string por linha (norte → sul), um caractere por célula (oeste → leste), em base 36 de `round(valor × 4)`
(0,25 de unidade por passo). Alturas: terreno seco (e o fundo do rio); água: superfície nas células molhadas, `.` nas secas.
Rode de novo se o pacote do heightmap mudar: python3 scripts/make-fazenda-data.py
"""
import csv, pathlib

root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'assets-src' / 'santuario-fazenda'
digits = '0123456789abcdefghijklmnopqrstuvwxyz'

def read(name):
    with open(src / name) as f:
        return [[float(v) for v in row] for row in csv.reader(f) if row]

heights, water = read('alturas_celulas_64x64.csv'), read('agua_superficie_64x64.csv')
assert len(heights) == 64 and len(water) == 64 and all(len(r) == 64 for r in heights + water)

def enc(v):
    return digits[round(v * 4)]

hrows = [''.join(enc(v) for v in row) for row in heights]
wrows = [''.join('.' if v != v else enc(v) for v in row) for row in water]
out = ['// GERADO por scripts/make-fazenda-data.py a partir de assets-src/santuario-fazenda (heightmap da Fazenda do Santuário). Não edite à mão.',
       '// Uma string por linha (norte → sul), um caractere por célula (oeste → leste): base 36 de round(valor × 4). Água: `.` = seco.',
       'export const FAZENDA_ALTURAS: readonly string[] = [']
out += [f"  '{r}'," for r in hrows]
out += ['];', 'export const FAZENDA_AGUA: readonly string[] = [']
out += [f"  '{r}'," for r in wrows]
out += ['];', '']
(root / 'src' / 'world' / 'fazendaData.ts').write_text('\n'.join(out))
print('ok', sum(c != '.' for r in wrows for c in r), 'células de água')
