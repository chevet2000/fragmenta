#!/usr/bin/env python3
# v4.13: sube los 26 tags de cache-busting (?v=4.12 -> ?v=4.13) y version.json,
# con aserciones. title/data-v/VERSION/tagline ya editados a mano.
import re, pathlib, json

root = pathlib.Path(__file__).resolve().parent.parent
idx = root / 'index.html'
html = idx.read_text(encoding='utf-8')

n = html.count('?v=4.12')
assert n == 26, f'esperaba 26 tags ?v=4.12, hay {n}'
html = html.replace('?v=4.12', '?v=4.13')

assert 'data-v="4.13"' in html, 'falta data-v 4.13'
assert '<title>FRAGMENTA v4.13' in html, 'falta title 4.13'
idx.write_text(html, encoding='utf-8')

vj = root / 'version.json'
old = vj.read_text(encoding='utf-8').strip()
assert json.loads(old)['v'] == '4.12', f'version.json inesperado: {old}'
vj.write_text(json.dumps({'v': '4.13'}, separators=(',', ':')) + '\n', encoding='utf-8')

# profile.js VERSION ya editado; verificar
prof = (root / 'js' / 'profile.js').read_text(encoding='utf-8')
assert "VERSION='4.13'" in prof, 'falta VERSION 4.13'

# verificar que no quede rastro de 4.12 en tags
assert '?v=4.12' not in html
print('OK: 26 tags -> ?v=4.13 | version.json 4.13 | data-v/title/VERSION ok')
