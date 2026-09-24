# -*- coding: utf-8 -*-
"""Bump v4.34 — CÓDIGO DE FUEGO (legibilidad de combate). Idempotente por paso."""
import io, re

ROOT = '/home/z/my-project/fragmenta/'
NEW, OLD = '4.34', '4.33'

def rd(p):
    with io.open(ROOT + p, encoding='utf-8') as f:
        return f.read()

def wr(p, s):
    with io.open(ROOT + p, 'w', encoding='utf-8') as f:
        f.write(s)

TAGLINE = (u'La <b>v4.34</b> ordena el campo de batalla — <b>CÓDIGO DE FUEGO</b>: ① <b>TODO disparo enemigo es una ESTRELLA ARDIENTE roja/naranja</b> (antes heredaba el color del enemigo: ámbar se confundía con el oro, verde con el bidón, menta con tu nave) — puntiagudo + caliente = duele. ② <b>BALAS DEL JUGADOR en familia fría</b>: blancas, y las de crítico cian eléctrico, dron menta y pesada hielo — el ámbar ya es SOLO del oro. ③ <b>VIDAS = CORAZÓN de verdad</b> (antes un diamante rojo igual que la gema y los disparos), con brillo y halo. ④ <b>ORO = moneda de verdad</b>: disco lleno con borde oscuro y muesca. ⑤ Gema con faceta y halo frío; el láser del jefe siempre caliente. Sin cambios de juego: es puro legibilidad.')

VER_LINE = (u'FRAGMENTA v%s · CÓDIGO DE FUEGO: BALAS ENEMIGAS = ESTRELLAS ARDIENTES ROJAS · '
            u'BALAS DEL JUGADOR EN FAMILIA FRÍA (CRÍTICO CIAN · DRON MENTA · PESADA HIELO) · '
            u'VIDAS = CORAZÓN REAL · ORO = MONEDA REAL CON BORDE Y MUESCA · GEMA CON FACETA · '
            u'LÁSER DEL JEFE SIEMPRE CALIENTE · ' % NEW)

# 1) profile.js
s = rd('js/profile.js')
if "VERSION='%s'" % OLD in s:
    s = s.replace("VERSION='%s'" % OLD, "VERSION='%s'" % NEW)
    wr('js/profile.js', s)
    print('profile.js: VERSION -> %s' % NEW)
else:
    print('profile.js: ya en %s (omito)' % ("4.34" if "VERSION='%s'" % NEW in s else '?'))

# 2) version.json
if rd('version.json') != '{"v": "%s"}' % NEW:
    wr('version.json', '{"v": "%s"}' % NEW)
    print('version.json -> %s' % NEW)

# 3) index.html
s = rd('index.html')
# 3a) .ver: ANTEPONER la entrada v4.34 (antes del reemplazo global del título)
if ('FRAGMENTA v%s · ' % OLD) in s:
    s = s.replace('FRAGMENTA v%s · ' % OLD, VER_LINE, 1)
    print('.ver: entrada v%s antepuesta' % NEW)
elif ('FRAGMENTA v%s · CÓDIGO DE FUEGO' % NEW) in s:
    print('.ver: ya antepuesta (omito)')
else:
    raise AssertionError('.ver: ni vieja ni nueva — revisar')
# 3b) data-v
if ('data-v="%s"' % OLD) in s:
    s = s.replace('data-v="%s"' % OLD, 'data-v="%s"' % NEW)
    print('data-v -> %s' % NEW)
# 3c) título (global: title de la pestaña)
if ('FRAGMENTA v%s' % OLD) in s:
    s = s.replace('FRAGMENTA v%s' % OLD, 'FRAGMENTA v%s' % NEW)
    print('title -> v%s' % NEW)
# 3d) btnTag
if (u'▸ NOVEDADES DE LA v%s' % OLD) in s:
    s = s.replace(u'▸ NOVEDADES DE LA v%s' % OLD, u'▸ NOVEDADES DE LA v%s' % NEW)
    print('btnTag -> v%s' % NEW)
# 3e) tagBody
pat = re.compile(r'(<p class="tagline hidden" id="tagBody">).*?(</p>)', re.S)
if 'id="tagBody"' in s and ('<b>v%s</b> ordena el campo' % NEW) not in s:
    assert pat.search(s), 'tagBody no encontrado'
    s = pat.sub(lambda m: m.group(1) + TAGLINE + m.group(2), s, count=1)
    print('tagBody -> v%s' % NEW)
# 3f) tags de recursos
n = s.count('?v=%s' % OLD)
if n:
    s = s.replace('?v=%s' % OLD, '?v=%s' % NEW)
wr('index.html', s)
print('tags: %d -> ?v=%s' % (n, NEW))
print('OK')
