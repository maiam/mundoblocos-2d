"""Prancha ortográfica PROVISÓRIA do Grunho Casca-Rachada (ADR 0147), desenhada em código com a paleta e as proporções dos sprites aprovados no Drive.

Entrada : assets-src/orvalis-voxel/mobs/grunho-uv.json (tamanhos das peças; `make-orvalis-grunho-ficha.py`)
Saída   : assets-src/orvalis-voxel/mobs/pranchas/grunho_ortografica.png (fundo transparente, 2 pixels de arte por unidade do modelo, 1 pixel de imagem por pixel de arte; só as
          planificações em cruz de cada peça, no formato que `make-orvalis-fazenda-prancha.py grunho` lê)
Cores   : amostradas dos sprites de repouso (pele verde-oliva, colete ferrugem, cabelo marrom-escuro, calça e botas marrons, clava laranja). **Arte provisória feita por script:**
          quando o dono enviar a prancha ortográfica de verdade (mesmos tamanhos de cruz), ela entra no lugar deste arquivo sem mudar o código.
Uso: python3 -I scripts/make-orvalis-grunho-prancha-provisoria.py (Pillow). Depois: make-orvalis-fazenda-prancha.py grunho e make-orvalis-fazenda.py.
"""
import json
import random

from PIL import Image

MOBS = 'assets-src/orvalis-voxel/mobs/'
K = 2  # pixels de arte por unidade

PELE, PELE_ESC, PELE_CLA = (140, 138, 53), (110, 98, 40), (168, 154, 69)
COLETE, COLETE_ESC, COLETE_CLA = (159, 75, 38), (126, 57, 30), (184, 92, 46)
CABELO, CABELO_ESC, CABELO_CLA = (78, 52, 43), (46, 31, 24), (104, 72, 56)
CALCA, CALCA_ESC = (113, 70, 47), (86, 52, 36)
BOTA, BOTA_ESC, BOTA_CLA = (75, 49, 34), (60, 38, 25), (110, 76, 52)
CINTO, FIVELA = (95, 66, 47), (176, 160, 120)
CLAVA, CLAVA_ESC, CLAVA_CLA, VEIO = (200, 120, 49), (136, 78, 37), (224, 154, 74), (230, 178, 70)
ORELHA_INT = (168, 113, 79)
OLHO, PUPILA, DENTE, BOCA = (236, 230, 200), (24, 16, 12), (232, 226, 196), (52, 30, 22)


class Tela:
    def __init__(self, w, h):
        self.im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
        self.px = self.im.load()

    def rect(self, x, y, w, h, c):
        for j in range(y, y + h):
            for i in range(x, x + w):
                if 0 <= i < self.im.size[0] and 0 <= j < self.im.size[1]:
                    self.px[i, j] = (*c, 255)

    def dot(self, x, y, c):
        self.rect(x, y, 1, 1, c)


def ruido(t, x, y, w, h, base, claro, escuro, seed, pc=0.12, pe=0.12):
    rng = random.Random(seed)
    t.rect(x, y, w, h, base)
    for j in range(h):
        for i in range(w):
            r = rng.random()
            if r < pc:
                t.dot(x + i, y + j, claro)
            elif r < pc + pe:
                t.dot(x + i, y + j, escuro)


# cada função desenha uma face (largura × altura em pixels) em t, no canto (x, y)
def cabeca_frente(t, x, y, w, h):
    ruido(t, x, y, w, h, PELE, PELE_CLA, PELE_ESC, 1)
    t.rect(x, y, w, 4, CABELO)  # cabelo na testa, com franja irregular
    for i in range(0, w, 3):
        t.rect(x + i, y + 4, 2, 1, CABELO)
    t.rect(x + 1, y + 4, 1, 1, CABELO_ESC); t.rect(x + w - 3, y + 4, 1, 1, CABELO_ESC)
    t.rect(x + 3, y + 5, 5, 1, CABELO_ESC); t.rect(x + 10, y + 5, 5, 1, CABELO_ESC)  # sobrancelhas pesadas
    t.rect(x + 3, y + 6, 1, 1, CABELO_ESC); t.rect(x + 14, y + 6, 1, 1, CABELO_ESC)
    for ex in (4, 11):  # olhos
        t.rect(x + ex, y + 7, 3, 2, OLHO); t.rect(x + ex + 1, y + 7, 1, 2, PUPILA)
    t.rect(x + 5, y + 12, 8, 1, BOCA); t.rect(x + 11, y + 11, 1, 1, BOCA)  # sorriso torto
    t.rect(x + 11, y + 12, 1, 2, DENTE)  # a presa
    t.dot(x + 3, y + 10, PELE_CLA); t.dot(x + 4, y + 11, PELE_CLA); t.dot(x + 5, y + 12, PELE_CLA)  # cicatriz
    t.rect(x, y + 13, w, 3, PELE_ESC); t.rect(x + 4, y + 13, 10, 1, PELE)


def cabeca_costas(t, x, y, w, h):
    ruido(t, x, y, w, h, CABELO, CABELO_CLA, CABELO_ESC, 2, 0.15, 0.18)
    t.rect(x, y + h - 3, w, 3, PELE_ESC); t.rect(x + 3, y + h - 3, w - 6, 1, CABELO_ESC)


def cabeca_lado(t, x, y, w, h, frente_direita):
    ruido(t, x, y, w, h, PELE, PELE_CLA, PELE_ESC, 3)
    tras = (0, 7) if frente_direita else (w - 7, 7)  # o cabelo cobre o lado de trás
    t.rect(x, y, w, 4, CABELO)
    t.rect(x + tras[0], y + 4, tras[1], 8, CABELO)
    ruido(t, x + tras[0], y + 4, tras[1], 8, CABELO, CABELO_CLA, CABELO_ESC, 4, 0.15, 0.18)
    fx = x + w - 4 if frente_direita else x + 1
    t.rect(fx, y + 5, 3, 1, CABELO_ESC)  # a sobrancelha
    t.rect(fx, y + 7, 2, 2, OLHO); t.dot(fx + (1 if frente_direita else 0), y + 7, PUPILA)
    t.rect(x, y + 13, w, 3, PELE_ESC)


def cabeca_topo(t, x, y, w, h):
    ruido(t, x, y, w, h, CABELO, CABELO_CLA, CABELO_ESC, 5, 0.18, 0.16)


def cabeca_base(t, x, y, w, h):
    ruido(t, x, y, w, h, PELE_ESC, PELE, PELE_ESC, 6)


def corpo_frente(t, x, y, w, h):
    t.rect(x, y, w, h, COLETE)
    t.rect(x + 5, y, w - 10, 12, PELE)  # peito à mostra entre as abas do colete
    ruido(t, x + 5, y, w - 10, 12, PELE, PELE_CLA, PELE_ESC, 7, 0.1, 0.1)
    t.rect(x + 7, y + 8, 2, 1, PELE_ESC)  # umbigo
    for i in (0, 1, 2, 3): t.dot(x + i, y + 11, COLETE_ESC)  # barra irregular
    for i in range(w - 4, w): t.dot(x + i, y + 10 + (i % 2), COLETE_ESC)
    t.rect(x, y + 12, w, 2, CINTO); t.rect(x + 7, y + 12, 2, 2, FIVELA)
    t.rect(x, y + 14, w, 2, CALCA)
    t.rect(x + 1, y + 2, 3, 1, COLETE_CLA); t.rect(x + w - 4, y + 2, 3, 1, COLETE_CLA)


def corpo_costas(t, x, y, w, h):
    ruido(t, x, y, w, 12, COLETE, COLETE_CLA, COLETE_ESC, 8, 0.1, 0.12)
    for j in range(2, 11, 2): t.rect(x + 7, y + j, 2, 1, (214, 190, 140))  # a costura
    t.rect(x + 7, y, 2, 12, COLETE_ESC)
    for j in range(2, 11, 2): t.rect(x + 6, y + j, 4, 1, (200, 170, 120))
    t.rect(x, y + 12, w, 2, CINTO)
    ruido(t, x, y + 14, w, 2, CALCA, CALCA_ESC, CALCA_ESC, 9)
    t.rect(x + 9, y + 14, 4, 2, (130, 90, 60))  # o remendo


def corpo_lado(t, x, y, w, h):
    ruido(t, x, y, w, 12, COLETE, COLETE_CLA, COLETE_ESC, 10, 0.1, 0.12)
    t.rect(x, y + 12, w, 2, CINTO); t.rect(x, y + 14, w, 2, CALCA)


def corpo_topo(t, x, y, w, h):
    ruido(t, x, y, w, h, COLETE, COLETE_CLA, COLETE_ESC, 11, 0.1, 0.12)
    t.rect(x + 5, y + h - 3, w - 10, 3, PELE)  # a base do pescoço


def corpo_base(t, x, y, w, h):
    ruido(t, x, y, w, h, CALCA, CALCA_ESC, CALCA_ESC, 12)


def perna_lado(t, x, y, w, h, remendo=False):
    ruido(t, x, y, w, 5, CALCA, CALCA_ESC, CALCA_ESC, 13)
    t.rect(x, y + 5, w, 1, BOTA_CLA)  # a borda da cano
    ruido(t, x, y + 6, w, 5, BOTA, BOTA_CLA, BOTA_ESC, 14, 0.1, 0.12)
    t.rect(x, y + 11, w, 1, BOTA_ESC)
    if remendo: t.rect(x + 1, y + 2, 3, 2, (130, 90, 60))


def perna_topo(t, x, y, w, h):
    ruido(t, x, y, w, h, CALCA, CALCA_ESC, CALCA_ESC, 15)


def perna_base(t, x, y, w, h):
    ruido(t, x, y, w, h, BOTA_ESC, BOTA, BOTA_ESC, 16)


def braco_lado(t, x, y, w, h, cicatriz=False):
    ruido(t, x, y, w, h, PELE, PELE_CLA, PELE_ESC, 17)
    t.rect(x, y, w, 3, COLETE); t.rect(x, y + 3, w, 1, COLETE_ESC)  # a cava do colete
    t.rect(x, y + 13, w, 3, PELE_CLA)  # a mão
    for i in (1, 3): t.rect(x + i, y + 14, 1, 2, PELE_ESC)
    if cicatriz:
        for i in range(4): t.dot(x + 1 + i % w, y + 6 + i, PELE_CLA)


def braco_topo(t, x, y, w, h):
    ruido(t, x, y, w, h, COLETE, COLETE_CLA, COLETE_ESC, 18)


def braco_base(t, x, y, w, h):
    ruido(t, x, y, w, h, PELE_CLA, PELE, PELE_ESC, 19)


def orelha_larga(t, x, y, w, h, interna):
    ruido(t, x, y, w, h, PELE, PELE_CLA, PELE_ESC, 20, 0.05, 0.1)
    if interna: t.rect(x + 1, y + 1, w - 3, h - 2, ORELHA_INT)
    t.rect(x, y, w, 1, PELE_ESC)


def orelha_fina(t, x, y, w, h):
    ruido(t, x, y, w, h, PELE_ESC, PELE, PELE_ESC, 21)


def nariz_face(t, x, y, w, h, base=False):
    ruido(t, x, y, w, h, PELE_CLA, PELE, PELE_ESC, 22, 0.08, 0.1)
    if base: t.dot(x + 1, y + h // 2, PELE_ESC); t.dot(x + w - 2, y + h // 2, PELE_ESC)  # as narinas


def cabo_face(t, x, y, w, h):
    ruido(t, x, y, w, h, CLAVA_ESC, CLAVA, CLAVA_ESC, 23, 0.12, 0.15)
    for j in range(2, h, 5): t.rect(x, y + j, w, 1, (96, 54, 26))


def cabo_ponta(t, x, y, w, h):
    ruido(t, x, y, w, h, CLAVA_ESC, CLAVA, CLAVA_ESC, 24)


def clava_face(t, x, y, w, h, veio=True):
    ruido(t, x, y, w, h, CLAVA, CLAVA_CLA, CLAVA_ESC, 25, 0.12, 0.14)
    if veio:
        for j in range(h): t.dot(x + (j * 3 // 2 + 1) % w, y + j, VEIO)  # o veio dourado
    for (i, j) in ((1, 2), (w - 3, h - 4)): t.rect(x + i, y + j, 2, 2, CLAVA_ESC)  # nós


def main():
    ficha = json.load(open(MOBS + 'grunho-uv.json'))['mobs']['grunho']['parts']
    tam = {p['id']: p['sizePx'] for p in ficha}
    ordem = ['cabeca', 'corpo', 'braco_e', 'braco_d', 'perna_e', 'perna_d', 'clava_cabeca', 'clava_cabo', 'nariz', 'orelha_e', 'orelha_d']
    # layout da prancha: uma peça ao lado da outra, com 4 px de folga
    pos, x, y, alt = {}, 4, 4, 0
    for pid in ordem:
        w, h, d = tam[pid]
        cw, ch = (2 * d + 2 * w) * K, (2 * d + h) * K
        if x + cw > 220:
            x, y, alt = 4, y + alt + 6, 0
        pos[pid] = (x, y); x += cw + 6; alt = max(alt, ch)
    tela = Tela(240, y + alt + 8)

    def faces(pid):
        w, h, d = (v * K for v in tam[pid]); ox, oy = pos[pid]
        return {'topo': (ox + d, oy, w, d), 'esq': (ox, oy + d, d, h), 'frente': (ox + d, oy + d, w, h), 'dir': (ox + d + w, oy + d, d, h), 'costas': (ox + 2 * d + w, oy + d, w, h), 'base': (ox + d, oy + d + h, w, d)}

    f = faces('cabeca')
    cabeca_topo(tela, *f['topo']); cabeca_lado(tela, *f['esq'], True); cabeca_frente(tela, *f['frente']); cabeca_lado(tela, *f['dir'], False); cabeca_costas(tela, *f['costas']); cabeca_base(tela, *f['base'])
    f = faces('corpo')
    corpo_topo(tela, *f['topo']); corpo_lado(tela, *f['esq']); corpo_frente(tela, *f['frente']); corpo_lado(tela, *f['dir']); corpo_costas(tela, *f['costas']); corpo_base(tela, *f['base'])
    for pid, rem in (('perna_e', False), ('perna_d', True)):
        f = faces(pid)
        perna_topo(tela, *f['topo']); perna_lado(tela, *f['esq'], rem); perna_lado(tela, *f['frente'], False); perna_lado(tela, *f['dir'], False); perna_lado(tela, *f['costas'], False); perna_base(tela, *f['base'])
    for pid, cic in (('braco_e', True), ('braco_d', False)):
        f = faces(pid)
        braco_topo(tela, *f['topo']); braco_lado(tela, *f['esq'], cic); braco_lado(tela, *f['frente']); braco_lado(tela, *f['dir']); braco_lado(tela, *f['costas']); braco_base(tela, *f['base'])
    for pid in ('orelha_e', 'orelha_d'):
        f = faces(pid)
        orelha_fina(tela, *f['topo']); orelha_fina(tela, *f['esq']); orelha_larga(tela, *f['frente'], True); orelha_fina(tela, *f['dir']); orelha_larga(tela, *f['costas'], False); orelha_fina(tela, *f['base'])
    f = faces('nariz')
    nariz_face(tela, *f['topo']); nariz_face(tela, *f['esq']); nariz_face(tela, *f['frente']); nariz_face(tela, *f['dir']); nariz_face(tela, *f['costas']); nariz_face(tela, *f['base'], True)
    f = faces('clava_cabo')
    cabo_ponta(tela, *f['topo']); [cabo_face(tela, *f[k]) for k in ('esq', 'frente', 'dir', 'costas')]; cabo_ponta(tela, *f['base'])
    f = faces('clava_cabeca')
    clava_face(tela, *f['topo'], veio=False); [clava_face(tela, *f[k]) for k in ('esq', 'frente', 'dir', 'costas')]; clava_face(tela, *f['base'], veio=False)
    tela.im.save(MOBS + 'pranchas/grunho_ortografica.png')
    print('ok', tela.im.size)


if __name__ == '__main__':
    main()
