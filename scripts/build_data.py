#!/usr/bin/env python3
"""
Genera data/rubros.json y data/rubros.js a partir del PDF
"Definición de los rubros para licitaciones 2025-2030" (Intendencia de Canelones).

Uso:  python3 scripts/build_data.py [ruta_al_pdf]
Requiere: pdftotext (paquete poppler-utils).
"""
import json, re, subprocess, sys, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    ROOT, 'docs', 'Definicion_de_los_rubros_licitaciones_2025-2030.pdf')
PDF_REL = 'docs/Definicion_de_los_rubros_licitaciones_2025-2030.pdf'

txt = subprocess.run(['pdftotext', '-layout', PDF, '-'], capture_output=True, text=True,
                     check=True).stdout
lines = txt.split('\n')

page_of, p = [], 1
for l in lines:
    p += l.count('\f')
    page_of.append(p)

# ---------------------------------------------------------------- índice
idx, order = {}, []
rowpat = re.compile(r'^\s*([IVXLCDM]+|AL\s*-\s*\d)\s+(OT-\d{2}|\d{1,4}(?:\.?a)?)\s{2,}(.+?)\s{2,}'
                    r'(m3\.km|ton\.km|m3s|m3|m2|ton|c/u|unidad|global|km|Veh\.mes|m)\s*$')
for i, l in enumerate(lines[:150]):
    m = rowpat.match(l)
    if m:
        g, code, desc, unit = m.groups()
        code = code.replace('.a', 'a').strip()
        idx[code] = dict(codigo=code, grupo=g.replace(' ', ''), descripcion=desc.strip(), unidad=unit)
        order.append(code)

# Rubros OT-19..23: la descripción ocupa dos líneas en la tabla del índice
for c, d in {
    'OT-19': 'Suministro y colocación de cartel circular de 60 cm de diámetro, con Grado Ingeniería, incluyendo columna y elementos de sujeción.',
    'OT-20': 'Suministro y colocación de cartel de "PARE", de 25 cm de lado, con Grado Alta Intensidad, incluyendo columna y elementos de sujeción.',
    'OT-21': 'Suministro y colocación de un cartel de "CEDA EL PASO", de 90 cm de lado, con Grado Alta Intensidad, incluyendo columna y elementos de sujeción.',
    'OT-22': 'Suministro y colocación de cartel rectangular de Señales Informativas con Grado Ingeniería, incluyendo columna y elementos de sujeción.',
    'OT-23': 'Suministro y colocación de cartel cuadrado con fondo amarillo de 60 cm de lado, con Grado Ingeniería, incluyendo columna y elementos de sujeción.',
}.items():
    idx[c] = dict(codigo=c, grupo='AL-1', descripcion=d, unidad='c/u')
    if c not in order:
        order.append(c)
for c in ('OT-24', 'OT-25', 'OT-26', 'OT-27'):
    if c in idx:
        idx[c]['grupo'] = 'AL-2'

# ------------------------------------------------------- encabezados del cuerpo
body_start = next(i for i, l in enumerate(lines) if 'Definición de Rubros para licitaciones' in l and i > 100)
H = []
def add(i, codes, title, kind='rubro'):
    H.append((i, codes, title, kind))

simple = re.compile(r'^(?:Rubro\s+)?(OT-\d{2}|\d{1,4}\s?a?)(?:\.?\s*a)?\s*(?:\.-|\.|–|-)\s*(.+)$')
for i in range(body_start, len(lines)):
    s = lines[i].replace('\f', '').strip()
    if not s:
        continue
    m = re.match(r'^RUBROS\s+((?:OT-\d{2}[,\s]*(?:y\s*)?)+)\s*[-.]*\s*(.*)$', s)
    if m:
        add(i, re.findall(r'OT-\d{2}', m.group(1)), s); continue
    m = re.match(r'^(?:Rubro\s+)?(7|89|103|281)\s?\.?a\.?-?\s*(.+)$', s)
    if m and '(' in s:
        add(i, [m.group(1) + 'a'], s); continue
    m = simple.match(s)
    if m and re.search(r'\((?:[^()]*)\)\.?\s*$', s):
        code = m.group(1).replace(' ', '')
        if code == '132' and 'veredas' in s:
            code = '132a'
        if code in idx:
            add(i, [code], s); continue
    m = re.match(r'^(OT-\d{2})\s*[-–.]*\s*(.+)$', s)
    if m and i > body_start + 5 and re.search(r'\)\s*$', s) and m.group(1) in idx:
        add(i, [m.group(1)], s); continue
    if re.match(r'^OT-03\.-\s*(.+)$', s):
        add(i, ['OT-03'], s); continue
    if s.startswith('Especificaciones Técnicas para la ejecución de Mezcla Asfáltica'):
        add(i, [], 'Especificaciones Técnicas para la ejecución de Mezcla Asfáltica en Caliente', 'general')
    if s.startswith('Especificaciones Técnicas para la ejecución de hormigones'):
        add(i, [], 'Especificaciones Técnicas para la ejecución de hormigones', 'general')
    if s.startswith('Recaudos Gráficos a consultar'):
        add(i, [], 'Recaudos gráficos a consultar (láminas de detalle)', 'general')

H = sorted({h[0]: h for h in H}.values(), key=lambda x: x[0])

FOOT = re.compile(r'^\s*(Dirección General de Obras - Oficina Técnica de Canelones\s+\d+|Febrero 2025)\s*$')

def paragraphs(a, b):
    """Párrafos (texto, página) entre líneas a..b, sin pies de página."""
    paras, cur, cur_page = [], [], None
    def flush():
        nonlocal cur, cur_page
        if cur:
            t = re.sub(r'\s+', ' ', ' '.join(cur)).strip()
            if t:
                paras.append((t, cur_page))
        cur, cur_page = [], None
    for k in range(a, b):
        l = lines[k].replace('\f', '')
        if FOOT.match(l):
            continue
        if not l.strip():
            flush(); continue
        if cur_page is None:
            cur_page = page_of[k]
        cur.append(l.strip())
    flush()
    # unir párrafos partidos por un salto de página (el anterior no cierra y el siguiente empieza en minúscula)
    merged = []
    for t, pg in paras:
        if merged and not re.search(r'[.:;!?)”"]$', merged[-1][0]) and re.match(r'^[a-záéíóúñ(]', t) and len(merged[-1][0]) > 60:
            merged[-1] = (merged[-1][0] + ' ' + t, merged[-1][1])
        else:
            merged.append((t, pg))
    return merged

def is_subtitle(t):
    return len(t) <= 90 and not t.endswith(('.', ';', ',')) and len(t.split()) <= 12

def chunk(paras, maxlen=750):
    """Agrupa párrafos en fragmentos buscables conservando página y subtítulo."""
    out, sub, buf, bpage = [], '', '', None
    def flush():
        nonlocal buf, bpage
        if buf.strip():
            out.append(dict(subtitulo=sub, pagina=bpage, texto=buf.strip()))
        buf, bpage = '', None
    for t, pg in paras:
        if is_subtitle(t) and len(paras) > 1 and not re.search(r'\d+\s*(%|cm|mm|kg)', t) and not t.startswith('-'):
            flush(); sub = t; continue
        if buf and len(buf) + len(t) > maxlen:
            flush()
        if bpage is None:
            bpage = pg
        buf = (buf + ' ' + t) if buf else t
        if len(buf) > maxlen * 1.4:
            flush()
    flush()
    return out

PAGO = re.compile(r'(se pagar[aá]|se cotizar[aá]|se medir[aá]|se liquidar[aá]|se abonar[aá]|pago del rubro|el precio (?:por|de))', re.I)

def clean_title(title, codes):
    t = re.sub(r'^RUBROS?\s+', '', title, flags=re.I)
    t = re.sub(r'^(?:OT-\d{2}[,\s]*(?:y\s*)?)+[-.–\s]*', '', t)
    t = re.sub(r'^\d{1,4}\s?\.?\s?a?\.?\s*(?:\.-|\.|–|-)\s*', '', t)
    t = re.sub(r'\s*\([^()]*\)\.?\s*$', '', t)
    return t.strip(' .-–')

rubros, generales, seen = [], [], set()
for k, (i, codes, title, kind) in enumerate(H):
    j = H[k + 1][0] if k + 1 < len(H) else len(lines)
    paras = paragraphs(i + 1, j)
    chunks = chunk(paras)
    full = '\n\n'.join(t for t, _ in paras)
    pg0, pg1 = page_of[i], page_of[max(i, j - 1)]
    if kind == 'general':
        generales.append(dict(titulo=title, pagina=pg0, pagina_fin=pg1, texto=full, fragmentos=chunks))
        continue
    pago = [t for t, _ in paras if PAGO.search(t)]
    for c in codes:
        d = idx.get(c, {})
        nombre = d.get('descripcion') if len(codes) > 1 else clean_title(title, codes)
        nombre = nombre or d.get('descripcion', '')
        rubros.append(dict(
            codigo=c, grupo=d.get('grupo', ''), nombre=nombre, descripcion_indice=d.get('descripcion', ''),
            unidad=d.get('unidad', ''), pagina=pg0, pagina_fin=pg1,
            agrupado_con=[x for x in codes if x != c],
            medicion_pago=pago, texto=full, fragmentos=chunks))
        seen.add(c)

sin_cuerpo = [c for c in order if c not in seen]
data = dict(
    meta=dict(
        titulo='Definición de los rubros para licitaciones 2025-2030',
        organismo='Intendencia de Canelones — Dirección General de Obras, Oficina Técnica de Canelones',
        fecha='Febrero 2025', paginas=page_of[-1] - 1, pdf=PDF_REL,
        total_rubros=len(order), rubros_con_texto=len(rubros), sin_cuerpo=sin_cuerpo),
    indice=[idx[c] for c in order], rubros=rubros, generales=generales)

os.makedirs(os.path.join(ROOT, 'data'), exist_ok=True)
js = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
open(os.path.join(ROOT, 'data', 'rubros.json'), 'w', encoding='utf-8').write(json.dumps(data, ensure_ascii=False, indent=1))
open(os.path.join(ROOT, 'data', 'rubros.js'), 'w', encoding='utf-8').write('window.RUBROS_DATA=' + js + ';\n')
print(f'OK: {len(order)} rubros en el índice, {len(rubros)} con texto, {len(generales)} secciones generales; sin cuerpo: {sin_cuerpo}')
print('fragmentos:', sum(len(r["fragmentos"]) for r in rubros) + sum(len(g["fragmentos"]) for g in generales))

# ------------------------------------------------- versión de un solo archivo
# buscador-standalone.html: todo incrustado (CSS + JS + datos). Útil para abrirlo
# desde un visor, un correo o un pendrive sin depender de otras carpetas.
def build_standalone():
    rd = lambda *p: open(os.path.join(ROOT, *p), encoding='utf-8').read()
    html = rd('index.html')
    css, app, dat = rd('assets', 'styles.css'), rd('assets', 'app.js'), rd('data', 'rubros.js')
    html = html.replace('<link rel="stylesheet" href="assets/styles.css">', '<style>\n' + css + '\n</style>')
    html = html.replace('<script src="data/rubros.js"></script>', '<script>\n' + dat.replace('</script', '<\\/script') + '</script>')
    html = html.replace('<script src="assets/app.js"></script>', '<script>\n' + app.replace('</script', '<\\/script') + '\n</script>')
    open(os.path.join(ROOT, 'buscador-standalone.html'), 'w', encoding='utf-8').write(html)
    print('OK: buscador-standalone.html (%d KB)' % (len(html) // 1024))

build_standalone()
