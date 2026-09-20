# -*- coding: utf-8 -*-
"""patch_v417_fix.py — los 4 reemplazos que fallaron en la primera pasada
(indentación real: 3 espacios en BOSS_DEFS, 1 espacio en BESTIARY;
applySnap está en net.js, no en netsync.js)."""
import io, os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def P(*a): return os.path.join(ROOT, *a)
def rd(f):
    with io.open(P(f), 'r', encoding='utf-8') as fh: return fh.read()
def wr(f, s):
    with io.open(P(f), 'w', encoding='utf-8', newline='\n') as fh: fh.write(s)
fails = []
def rep(f, old, new, cnt=1):
    s = rd(f); n = s.count(old)
    if n != cnt:
        fails.append('%s: se esperaba %d, hay %d de %r' % (f, cnt, n, old[:70])); return
    wr(f, s.replace(old, new))

rep('js/boss.js',
"""   mech:'Pulsos arcanos que curan a su legión + esbirros invocados',
   tip:'Quema a los esbirros y golpéalo entre pulso y pulso; cada fase cura a más aliados a la vez.',""",
"""   mech:'Pulsos arcanos que curan a su legión, legión invocada, resucita esbirros y lanza MALDICIONES',
   tip:'Mátalo pronto: al caer se disipan sus maldiciones (salvo las de varias oleadas). Caza a los resucitados.',""")

rep('js/net.js',
"""      if(ed[11]){e.frozen=(ed[11]&1)?1:0;e.burn=(ed[11]&2)?{dps:0,t:1}:null;}""",
"""      if(ed[11]){e.frozen=(ed[11]&1)?1:0;e.burn=(ed[11]&2)?{dps:0,t:1}:null;e.revived=!!(ed[11]&4);}
      else e.revived=false; /* v4.17 */""")

rep('js/net.js',
"""      if(ed[11]!==undefined){e.frozen=(ed[11]&1)?1:0;if(ed[11]&2&&!e.burn)e.burn={dps:0,t:1};}""",
"""      if(ed[11]!==undefined){e.frozen=(ed[11]&1)?1:0;if(ed[11]&2&&!e.burn)e.burn={dps:0,t:1};e.revived=!!(ed[11]&4);}""")

rep('js/config.js',
""" mago:  {name:'MAGO',      desc:'No baja nunca: flota junto a su banda y lanza PULSOS ARCANOS que curan a los aliados heridos. Cuanto MÁS NIVEL tiene, MÁS aliados cura a la vez (1 → hasta 6) y desde nivel alto INVOCA esbirros. Prioridad objetivo: mátalo primero.'},""",
""" mago:  {name:'MAGO',      desc:'No baja nunca: flota junto a su banda y lanza PULSOS ARCANOS que curan a los aliados heridos. Cuanto MÁS NIVEL tiene, MÁS aliados cura a la vez (1 → hasta 6), desde el nivel 128 INVOCA esbirros y también RESUCITA a los caídos a su alrededor. Prioridad objetivo: mátalo primero.'},""")

if fails:
    print('FALLOS (%d):' % len(fails))
    for f in fails: print(' -', f)
    sys.exit(1)
print('patch_v417_fix OK')
