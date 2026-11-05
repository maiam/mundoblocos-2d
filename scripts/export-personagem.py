"""Valida e exporta um personagem modular no contrato v02 (assets-src/personagens/CONTRATO.md).

Exportador MÍNIMO do piloto: confere a entrega da arte e gera folhas WebP no tamanho do jogo + manifesto.
As regras de sobreposição ainda serão confirmadas pelo piloto antes de a ferramenta crescer.

Validação (erros impedem a exportação):
  - contrato.json e catalogo.json legíveis; encaixes, partes e ações conhecidos;
  - cada peça × ação × parte do catálogo existe, é RGBA e tem (384 × quadros) × (512 × 4);
  - nenhum pixel visível fora da caixa da ação; arquivo sem nenhum pixel visível é avisado;
  - contato: nos quadros indicados, o pixel mais baixo do corpo-base (+ cada peça de `pes`) dentro da caixa
    do pé fica a até ±tolerância da linha da âncora, medido no mestre;
  - arquivos em previas/<versão>/ com no máximo 1 MB; PNG perdido em entrega/ que o catálogo não cita.

Uso:
  python3 scripts/export-personagem.py                         # só valida (humano-chibi, v02)
  python3 scripts/export-personagem.py --out /tmp/chibi-export # valida e exporta WebP + manifesto.json
  python3 scripts/export-personagem.py --raiz <pasta do personagem> --versao v02
  python3 scripts/export-personagem.py --out src/assets --prefixo chibi-   # teste no jogo (?personagem=chibi)

Requer Pillow com WebP (sem numpy).
"""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image

RAIZ_PADRAO = Path(__file__).resolve().parent.parent / 'assets-src' / 'personagens' / 'humano-chibi'
ALFA_VISIVEL = 8          # alfa acima disto conta como desenho
LIMITE_PREVIA = 1024 * 1024
TILE = 32                 # src/config.ts


class Relatorio:
    def __init__(self):
        self.erros: list[str] = []
        self.avisos: list[str] = []

    def erro(self, msg):
        self.erros.append(msg)

    def aviso(self, msg):
        self.avisos.append(msg)


def ler_json(caminho: Path, rel: Relatorio):
    try:
        return json.loads(caminho.read_text(encoding='utf-8'))
    except FileNotFoundError:
        rel.erro(f'falta {caminho}')
    except json.JSONDecodeError as e:
        rel.erro(f'{caminho}: JSON inválido ({e})')
    return None


def alfa(img: Image.Image) -> Image.Image:
    return img.getchannel('A').point(lambda v: 255 if v > ALFA_VISIVEL else 0)


def caminho_parte(entrega: Path, peca: dict, acao: str, parte: str) -> Path:
    return entrega / peca['encaixe'] / peca['id'] / f'{acao}__{parte}.png'


def validar(raiz: Path, versao: str):
    rel = Relatorio()
    entrega = raiz / 'entrega' / versao
    contrato = ler_json(entrega / 'contrato.json', rel)
    catalogo = ler_json(raiz / 'catalogo.json', rel)
    if not contrato or not catalogo:
        return rel, contrato, catalogo, {}

    qw, qh = contrato['quadro']
    ax, ay = contrato['ancora']
    direcoes = contrato['direcoes']
    ordem = contrato['ordem']
    acoes = contrato['acoes']
    for d, lista in contrato.get('ordemPorDirecao', {}).items():
        if d not in direcoes:
            rel.erro(f'ordemPorDirecao: direção desconhecida "{d}"')
        for p in lista:
            if p not in ordem:
                rel.erro(f'ordemPorDirecao[{d}]: parte "{p}" não está em "ordem"')
    if catalogo.get('versao') != versao:
        rel.erro(f'catalogo.json é da versão {catalogo.get("versao")}, esperado {versao}')

    for nome, a in acoes.items():
        x0, y0, x1, y1 = a['caixa']
        if not (0 <= x0 < ax < x1 <= qw and 0 <= y0 < ay < y1 <= qh):
            rel.erro(f'ação {nome}: caixa {a["caixa"]} precisa conter a âncora e caber no quadro {qw}×{qh}')

    imagens: dict[tuple, Image.Image] = {}
    citados: set[Path] = set()
    ids = set()
    for peca in catalogo.get('pecas', []):
        chave = f'{peca.get("encaixe")}/{peca.get("id")}'
        if chave in ids:
            rel.erro(f'peça repetida no catálogo: {chave}')
        ids.add(chave)
        if peca.get('encaixe') not in contrato['encaixes']:
            rel.erro(f'{chave}: encaixe desconhecido')
            continue
        if peca.get('status') not in ('rascunho', 'revisao', 'aprovada'):
            rel.erro(f'{chave}: status deve ser rascunho, revisao ou aprovada')
        for parte in peca.get('partes', []):
            if parte not in ordem:
                rel.erro(f'{chave}: parte "{parte}" não está em contrato.ordem (adicione-a lá primeiro)')
        for acao in peca.get('acoes', []):
            if acao not in acoes:
                rel.erro(f'{chave}: ação desconhecida "{acao}"')
                continue
            a = acoes[acao]
            esperado = (qw * a['quadros'], qh * len(direcoes))
            for parte in peca.get('partes', []):
                arq = caminho_parte(entrega, peca, acao, parte)
                citados.add(arq.resolve())
                if not arq.exists():
                    rel.erro(f'falta {arq.relative_to(raiz)}')
                    continue
                img = Image.open(arq)
                if img.mode != 'RGBA':
                    rel.erro(f'{arq.relative_to(raiz)}: modo {img.mode}, precisa ser RGBA transparente')
                    continue
                if img.size != esperado:
                    rel.erro(f'{arq.relative_to(raiz)}: {img.size[0]}×{img.size[1]}, esperado {esperado[0]}×{esperado[1]} '
                             f'({a["quadros"]} quadros × {len(direcoes)} direções)')
                    continue
                imagens[(chave, acao, parte)] = img
                checar_caixa(img, a, qw, qh, direcoes, arq.relative_to(raiz), rel)

    for arq in sorted(entrega.rglob('*.png')):
        if arq.resolve() not in citados:
            rel.aviso(f'{arq.relative_to(raiz)} não é citado no catálogo (ignorado)')

    checar_contato(contrato, catalogo, imagens, rel)

    previas = raiz / 'previas' / versao
    if previas.exists():
        for arq in sorted(previas.rglob('*')):
            if arq.is_file() and arq.stat().st_size > LIMITE_PREVIA:
                rel.erro(f'{arq.relative_to(raiz)}: {arq.stat().st_size / 1024:.0f} kB (limite 1024 kB por prévia)')
    return rel, contrato, catalogo, imagens


def checar_caixa(img, a, qw, qh, direcoes, nome, rel):
    x0, y0, x1, y1 = a['caixa']
    vazio = True
    for li, d in enumerate(direcoes):
        for q in range(a['quadros']):
            bb = alfa(img.crop((q * qw, li * qh, (q + 1) * qw, (li + 1) * qh))).getbbox()
            if not bb:
                continue
            vazio = False
            if bb[0] < x0 or bb[1] < y0 or bb[2] > x1 or bb[3] > y1:
                rel.erro(f'{nome}: {d} quadro {q} desenho em {list(bb)} sai da caixa da ação {a["caixa"]}')
    if vazio:
        rel.aviso(f'{nome}: nenhum pixel visível')


def checar_contato(contrato, catalogo, imagens, rel):
    qw, qh = contrato['quadro']
    ay = contrato['ancora'][1]
    tol = contrato.get('toleranciaContatoPx', 2)
    direcoes = contrato['direcoes']
    pes = [f'pes/{p["id"]}' for p in catalogo.get('pecas', []) if p['encaixe'] == 'pes']
    for acao, a in contrato['acoes'].items():
        corpo = imagens.get(('corpo/base', acao, 'corpo'))
        if corpo is None:
            continue
        if a.get('ciclo') and not a.get('contato'):
            rel.aviso(f'ação {acao}: sem quadros de contato indicados (contato dos pés não conferido)')
        for c in a.get('contato', []):
            d, q, pe, (x0, y0, x1, y1) = c['direcao'], c['quadro'], c['pe'], c['caixa']
            if d not in direcoes or not 0 <= q < a['quadros'] or pe not in ('E', 'D'):
                rel.erro(f'ação {acao}: contato inválido {c}')
                continue
            li = direcoes.index(d)
            ox, oy = q * qw, li * qh
            variantes = [('corpo/base', corpo)]
            variantes += [(k, imagens[(k, acao, 'pes')]) for k in pes if (k, acao, 'pes') in imagens]
            for nome, extra in variantes:
                regiao = alfa(corpo.crop((ox + x0, oy + y0, ox + x1, oy + y1)))
                if extra is not corpo:
                    regiao.paste(255, mask=alfa(extra.crop((ox + x0, oy + y0, ox + x1, oy + y1))))
                bb = regiao.getbbox()
                if not bb:
                    rel.erro(f'ação {acao}: {d} quadro {q} pé {pe}: nada desenhado na caixa {c["caixa"]} ({nome})')
                    continue
                base = y0 + bb[3]
                if abs(base - ay) > tol:
                    rel.erro(f'ação {acao}: {d} quadro {q} pé {pe} toca y={base}, âncora {ay} '
                             f'(±{tol} px no mestre) — {nome}')


def exportar(contrato, catalogo, imagens, out: Path, prefixo: str = ''):
    out.mkdir(parents=True, exist_ok=True)
    qw, qh = contrato['quadro']
    ax, ay = contrato['ancora']
    esc = contrato['escalaExportacao']
    ref = contrato['referenciaEscala']
    mundo_por_mestre = ref['alturaMundoCelulas'] * TILE / ref['alturaCorpoMestrePx']
    direcoes = contrato['direcoes']
    manifesto = {
        'versao': contrato['versao'],
        'direcoes': direcoes,
        'ordem': contrato['ordem'],
        'ordemPorDirecao': contrato.get('ordemPorDirecao', {}),
        'acoes': {},
        'pecas': [],
    }
    for nome, a in contrato['acoes'].items():
        x0, y0, x1, y1 = a['caixa']
        fw, fh = round((x1 - x0) * esc), round((y1 - y0) * esc)
        manifesto['acoes'][nome] = {
            'quadros': a['quadros'], 'fps': a['fps'], 'ciclo': a['ciclo'],
            'quadro': [fw, fh],
            # Âncora em px da folha exportada (já deslocada pelo recorte).
            'ancora': [round((ax - x0) * fw / (x1 - x0), 3), round((ay - y0) * fh / (y1 - y0), 3)],
            # px de mundo por px da folha exportada: o motor desenha quadro × esta escala × zoom.
            'escalaMundo': round(mundo_por_mestre * (x1 - x0) / fw, 6),
        }
    total = 0
    for peca in catalogo['pecas']:
        chave = f'{peca["encaixe"]}/{peca["id"]}'
        item = {'encaixe': peca['encaixe'], 'id': peca['id'], 'status': peca['status'], 'folhas': {}}
        for acao in peca.get('acoes', []):
            a = contrato['acoes'][acao]
            x0, y0, x1, y1 = a['caixa']
            fw, fh = manifesto['acoes'][acao]['quadro']
            for parte in peca['partes']:
                img = imagens[(chave, acao, parte)]
                folha = Image.new('RGBA', (fw * a['quadros'], fh * len(direcoes)))
                for li in range(len(direcoes)):
                    for q in range(a['quadros']):
                        ox, oy = q * qw, li * qh
                        recorte = img.crop((ox + x0, oy + y0, ox + x1, oy + y1)).convert('RGBa')
                        folha.paste(recorte.resize((fw, fh), Image.LANCZOS).convert('RGBA'), (q * fw, li * fh))
                nome = f'{prefixo}{peca["encaixe"]}-{peca["id"]}-{acao}-{parte}.webp'
                folha.save(out / nome, 'WEBP', quality=84, alpha_quality=85, method=6)
                total += (out / nome).stat().st_size
                item['folhas'].setdefault(acao, {})[parte] = nome
        manifesto['pecas'].append(item)
    (out / f'{prefixo}manifesto.json').write_text(json.dumps(manifesto, ensure_ascii=False, indent=2), encoding='utf-8')
    return total


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--raiz', type=Path, default=RAIZ_PADRAO, help='pasta do personagem (com catalogo.json)')
    ap.add_argument('--versao', default='v02')
    ap.add_argument('--out', type=Path, help='pasta de saída (WebP + manifesto.json); sem ela, só valida')
    ap.add_argument('--prefixo', default='', help='prefixo dos arquivos (ex.: chibi- para src/assets/)')
    args = ap.parse_args()

    rel, contrato, catalogo, imagens = validar(args.raiz, args.versao)
    for m in rel.avisos:
        print(f'aviso: {m}')
    for m in rel.erros:
        print(f'ERRO: {m}')
    pecas = len(catalogo.get('pecas', [])) if catalogo else 0
    if rel.erros:
        print(f'{len(rel.erros)} erro(s), {len(rel.avisos)} aviso(s) — nada exportado')
        sys.exit(1)
    print(f'ok: {pecas} peça(s), {len(imagens)} folha(s), {len(rel.avisos)} aviso(s)')
    if args.out:
        total = exportar(contrato, catalogo, imagens, args.out, args.prefixo)
        print(f'exportado em {args.out}: {total / 1024:.0f} kB de WebP + manifesto.json')


if __name__ == '__main__':
    main()
