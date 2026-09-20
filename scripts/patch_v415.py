#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""patch_v415.py — sincroniza la versión 4.15 en los 5 sitios del juego.
Con aserciones: falla si algo no queda como debe."""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
V_OLD, V_NEW = '4.14', '4.15'
fails = []

def check(cond, msg):
    if not cond:
        fails.append(msg)

# ---------- index.html ----------
ih = ROOT / 'index.html'
s = ih.read_text(encoding='utf-8')
n_data = len(re.findall(r'data-v="4\.15"', s))
n_tags = len(re.findall(r'\?v=4\.15', s))
s = s.replace(f'data-v="{V_OLD}"', f'data-v="{V_NEW}"')
s = s.replace(f'?v={V_OLD}', f'?v={V_NEW}')
s = s.replace(f'FRAGMENTA v{V_OLD} —', f'FRAGMENTA v{V_NEW} —')
s = s.replace(f'FRAGMENTA v{V_OLD} ·', f'FRAGMENTA v{V_NEW} ·')
ih.write_text(s, encoding='utf-8')
s2 = ih.read_text(encoding='utf-8')
check(n_data == 1 or 'data-v="4.15"' in s2, 'index.html data-v=4.15')
check(len(re.findall(r'\?v=4\.15', s2)) == 26, f'index.html 26 tags ?v=4.15 (hay {len(re.findall(re.escape("?v=4.15"), s2))})')
check(f'?v={V_OLD}' not in s2, 'index.html sin tags viejos')
check(f'data-v="{V_OLD}"' not in s2, 'index.html sin data-v viejo')
check(f'FRAGMENTA v{V_OLD}' not in s2, 'index.html sin título/pie viejo')
check(f'v{V_NEW} — purga' in s2, 'index.html title')
check('scrSettings' in s2, 'index.html pantalla AJUSTES')
check('rankTabs' in s2, 'index.html filtros ranking')
check('achBadge' in s2, 'index.html badge logros')
check('btnTag' in s2, 'index.html novedades colapsables')

# ---------- version.json ----------
vj = ROOT / 'version.json'
vj.write_text('{"v":"4.15"}', encoding='utf-8')
check('"4.15"' in vj.read_text(), 'version.json 4.15')

# ---------- profile.js ----------
pj = ROOT / 'js' / 'profile.js'
s = pj.read_text(encoding='utf-8')
s = s.replace("VERSION='4.14'", "VERSION='4.15'")
check("VERSION='4.15'" in s, 'profile.js VERSION 4.15')
pj.write_text(s, encoding='utf-8')

# ---------- otros (solo referencias técnicas viejas; el texto de novedades puede citar v4.14) ----------
old_ref = ih.read_text(encoding='utf-8')
check('data-v="4.14"' not in old_ref, 'index.html sin data-v 4.14')
check('?v=4.14' not in old_ref, 'index.html sin ?v=4.14')

if fails:
    print('FALLOS:')
    for f in fails: print(' -', f)
    sys.exit(1)
print('OK: versión 4.15 sincronizada (index.html, version.json, profile.js)')
