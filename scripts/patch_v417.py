# -*- coding: utf-8 -*-
"""v4.17 — LAS MALDICIONES DEL HECHICERO
- 4 maldiciones al azar (cada una afecta SOLO una cosa): TORPEZA (mandos 65%),
  MISERIA (mitad de oro), LETARGO (mitad de exp), BLOQUEO (poderes temporales
  sellados y sin sorteos nuevos).
- Duraciones: "mientras él viva" (se disipan al matarlo) o VARIAS OLEADAS
  (2-3, aguantan su muerte y cuentan atrás por oleada).
- El HECHICERO RESUCITA hasta 2 esbirros caídos hace poco (60% de vida) e
  INVOCA UN ÉLITE desde la fase 2 (máx 2 por combate, solo si no hay otro).
- Los MAGOS de nivel 128+ también resucitan 1 esbirro cercano.
- 2 logros nuevos (MALDITO, EXORCISTA), bestiario/guía actualizados,
  curseBar en el HUD, sync co-op ('curs' + bit revived en snapshot),
  2 filas nuevas en PERFIL. Versión 4.16 -> 4.17 (27 tags ?v=)."""
import io, os, json, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def P(*a): return os.path.join(ROOT, *a)
def rd(f):
    with io.open(P(f), 'r', encoding='utf-8') as fh: return fh.read()
def wr(f, s):
    with io.open(P(f), 'w', encoding='utf-8', newline='\n') as fh: fh.write(s)

fails = []
def rep(f, old, new, cnt=1):
    s = rd(f)
    n = s.count(old)
    if n != cnt:
        fails.append('%s: se esperaba %d, hay %d de %r' % (f, cnt, n, old[:70])); return
    wr(f, s.replace(old, new))

# ---------- 1. NUEVO js/curses.js ----------
CURSES_JS = r''''use strict';
/* ============ v4.17: LAS MALDICIONES DEL HECHICERO ============ */
/* El guardián mago lanza MALDICIONES AL AZAR; cada una afecta SOLO una cosa:
   · TORPEZA — los mandos de la nave responden al 65%
   · MISERIA — el oro que recoges vale la MITAD
   · LETARGO — la experiencia que ganas vale la MITAD
   · BLOQUEO — sella hasta 2 poderes temporales y no deja sorteos nuevos
   Duración: cada maldición es "mientras él viva" (se disipa al destruir al
   HECHICERO) o de VARIAS OLEADAS (2–3: aguanta su muerte y cuenta atrás). */
const CURSES={
  torpeza:{name:'TORPEZA', desc:'Los mandos responden al 65%'},
  miseria:{name:'MISERIA', desc:'El oro que recoges vale la MITAD'},
  letargo:{name:'LETARGO', desc:'La experiencia que ganas vale la MITAD'},
  bloqueo:{name:'BLOQUEO', desc:'Poderes temporales sellados y sin nuevos sorteos'},
};
const CURSE_ICON={torpeza:'◐',miseria:'◆',letargo:'▼',bloqueo:'✖'};
function curseActive(id){return !!(run.curses&&run.curses.some(c=>c.id===id));}
function curseMoveMul(){return curseActive('torpeza')?.65:1;}
function curseGoldMul(){return curseActive('miseria')?.5:1;}
function curseExpMul(){return curseActive('letargo')?.5:1;}
function tempBuffSealed(id){
  if(!run.curses)return false;
  for(const c of run.curses)if(c.id==='bloqueo'&&c.sealed&&c.sealed.includes(id))return true;
  return false;
}
function syncCurses(){
  if(net.mode==='host')sendMsg({t:'curs',l:(run.curses||[]).map(c=>({id:c.id,alive:c.alive?1:0,waves:c.waves||0,sealed:c.sealed||[]}))});
}
/* el HECHICERO lanza una maldición al azar (solo anfitrión) */
function castCurse(b){
  if(!run.curses)run.curses=[];
  if(run.curses.length>=3)return;
  const act=run.curses.map(c=>c.id);
  const pool=Object.keys(CURSES).filter(id=>!act.includes(id));
  if(!pool.length)return;
  const id=pool[irand(0,pool.length-1)];
  const c=Math.random()<.45?{id,alive:0,waves:irand(2,3)}:{id,alive:1,waves:0};
  if(id==='bloqueo'){
    const act2=(run.tempBuffs||[]).map(t=>t.id);
    c.sealed=act2.sort(()=>Math.random()-.5).slice(0,2);
  }
  run.curses.push(c);
  save.totCurses=(save.totCurses||0)+1;
  const D=CURSES[id];
  banner('¡MALDICIÓN: '+D.name+'!',D.desc+' · '+(c.alive?'mientras el HECHICERO viva':'dura '+c.waves+' oleadas'));
  for(const pl of players)if(pl.hp>0)rings.push({x:pl.x,y:pl.y,r:12,R:120,t:0,life:.7,color:'#B388FF'});
  if(b)floater(b.x,b.y-b.r-18,'¡MALDICIÓN!','#B388FF',14);
  tone(280,130,.4,'sawtooth',.06);vib(60);
  recompute();syncCurses();checkAch();
}
/* al caer el HECHICERO: se quitan las de "mientras él viva";
   las de varias oleadas siguen su cuenta atrás */
function expireCurses(){
  if(!run.curses||!run.curses.length)return;
  const before=run.curses.length;
  run.curses=run.curses.filter(c=>!c.alive);
  if(run.curses.length<before){
    banner('MALDICIONES ROTAS',run.curses.length?'Se disipan… salvo las de varias oleadas':'El HECHICERO ha caído: se disipan todas');
    recompute();syncCurses();
  }
}
/* cada oleada: las maldiciones de varias oleadas cuentan atrás */
function curseTickWave(){
  if(!run.curses||!run.curses.length)return;
  for(const c of run.curses)if(!c.alive)c.waves--;
  const before=run.curses.length;
  run.curses=run.curses.filter(c=>c.alive||c.waves>0);
  if(run.curses.length<before){recompute();banner('MALDICIÓN EXPIRADA','Una maldición se ha desvanecido');}
  syncCurses();
}
/* cliente: recibe la lista de maldiciones del anfitrión */
function applyCurses(list){
  run.curses=(list||[]).filter(c=>c&&CURSES[c.id]).map(c=>({
    id:c.id,alive:!!c.alive,waves:clamp(parseInt(c.waves,10)||0,0,9),
    sealed:Array.isArray(c.sealed)?c.sealed.filter(x=>typeof x==='string').slice(0,4):[]}));
  recompute();
}
'''
wr('js/curses.js', CURSES_JS)

# ---------- 2. state.js: run.curses ----------
rep('js/state.js',
"""  ghostTrail:[],ghostAcc:0,ghostPassed:false,ghostRef:null};""",
"""  ghostTrail:[],ghostAcc:0,ghostPassed:false,ghostRef:null,
  /* v4.17: LAS MALDICIONES del HECHICERO — cada una afecta solo una cosa */
  curses:[]};""")

# ---------- 3. enemies.js: campos + mageRevive ----------
rep('js/enemies.js',
"""    goldTotal:0,goldDropped:0,goldMark:.8};""",
"""    goldTotal:0,goldDropped:0,goldMark:.8,
    /* v4.17: resucitación — revT (temporizador del mago) y revived (marca) */
    revT:0,revived:false};""")
rep('js/enemies.js',
"""  rings.push({x:e.x,y:e.y,r:6,R:64,t:0,life:.4,color:'#B388FF'});
  hostRing(e.x,e.y,64,'#B388FF');
  floater(e.x,e.y-e.r-12,'¡INVOCA!','#B388FF',12);
  SFX.warp();
}""",
"""  rings.push({x:e.x,y:e.y,r:6,R:64,t:0,life:.4,color:'#B388FF'});
  hostRing(e.x,e.y,64,'#B388FF');
  floater(e.x,e.y-e.r-12,'¡INVOCA!','#B388FF',12);
  SFX.warp();
}
/* v4.17: RESUCITAR — el mago de nivel alto (nv 128+) trae de vuelta al último
   esbirro caído cerca de él, con el 55% de su vida. Nunca resucita magos,
   élites ni campistas (anti-cascada, igual que la invocación). */
function mageRevive(e){
  if(!e.memo)e.memo=[];
  const now=time;
  e.memo=e.memo.filter(m=>now-m.t<18);
  if(!e.memo.length||enemies.length>=24)return;
  const m=e.memo.pop();
  const elvl=clamp(m.elvl,minLvlOf(run.level),maxLvlOf(run.level));
  const c=spawnEnemy(m.tk,elvl,{after:'roam',delay:.2});
  c.sx=e.x+rand(-18,18);c.sy=e.y+rand(6,16);c.x=c.sx;c.y=c.sy;
  c.cx=e.x+rand(-80,80);c.cy=e.y+rand(20,70);
  c.fx=clamp(e.x+rand(-120,120),30,W-30);c.fy=rand(80,H*.5);
  c.hp=c.maxhp=Math.max(1,Math.round(c.maxhp*.55));
  c.revived=true;
  rings.push({x:c.sx,y:c.sy,r:6,R:60,t:0,life:.5,color:'#B388FF'});
  hostRing(c.sx,c.sy,60,'#B388FF');
  floater(c.sx,c.sy-c.r-10,'¡RESUCITA!','#B388FF',12);
  tone(240,540,.3,'sine',.05);
}""")

# ---------- 4. boss.js ----------
rep('js/boss.js',
"""    /* v4.16: HECHICERO — timers de pulso arcano (hzT) y de invocación (hsumT) */
    hzT:3,hsumT:4,""",
"""    /* v4.16: HECHICERO — timers de pulso arcano (hzT) y de invocación (hsumT)
       v4.17: curseT (maldiciones) · revT (resucitar) · eliteT/eliteDone (élite) */
    hzT:3,hsumT:4,curseT:6,revT:8,eliteT:14,eliteDone:0,memo:[],""")
rep('js/boss.js',
"""        floater(b.x,b.y-b.r-16,'¡ESBIRROS!','#B388FF',13);
        SFX.warp();
      }
    }
  }""",
"""        floater(b.x,b.y-b.r-16,'¡ESBIRROS!','#B388FF',13);
        SFX.warp();
      }
    }
    /* v4.17: MALDICIONES — lanza una al azar; cada una afecta SOLO una cosa */
    b.curseT-=dt;
    if(b.curseT<=0){b.curseT=(b.ph>=3?9:12)*pM;castCurse(b);}
    /* v4.17: RESUCITA hasta 2 esbirros caídos hace menos de 18 s (60% de vida) */
    b.revT-=dt;
    if(b.revT<=0){b.revT=9*pM;bossRevive(b);}
    /* v4.17: INVOCAR UN ÉLITE — desde la fase 2, máx 2 por combate y solo
       cuando no quede otro élite vivo en pantalla */
    b.eliteT-=dt;
    if(b.eliteT<=0){
      if(b.ph>=2&&b.eliteDone<2&&!enemies.some(q=>q.elite&&!q.dead)&&enemies.length<28){
        b.eliteDone++;b.eliteT=22*pM;
        const el=makeElite(run.level,.4);
        if(el){
          el.sx=b.x+rand(-30,30);el.sy=b.y+10;el.x=el.sx;el.y=el.sy;
          el.cx=b.x+rand(-90,90);el.cy=b.y+60;
          el.fx=clamp(b.x+rand(-150,150),30,W-30);el.fy=rand(90,H*.45);
        }
        floater(b.x,b.y-b.r-16,'¡INVOCA UN ÉLITE!','#B388FF',13);
        SFX.warp();vib(40);
      }else b.eliteT=5;
    }
  }""")
rep('js/boss.js',
"""  if(e.T.mage){
    e.healT-=dt;if(e.healT<=0){e.healT=4.2;mageHeal(e);}
    e.sumT-=dt;if(e.sumT<=0){e.sumT=8;mageSummon(e);}
  }""",
"""  if(e.T.mage){
    e.healT-=dt;if(e.healT<=0){e.healT=4.2;mageHeal(e);}
    e.sumT-=dt;if(e.sumT<=0){e.sumT=8;mageSummon(e);}
    /* v4.17: desde nv 128 el mago RESUCITA a un esbirro caído cerca de él */
    if(e.elvl>=128){e.revT+=dt;
      if(e.revT>=13){e.revT=-rand(0,4);mageRevive(e);}}
  }""")
rep('js/boss.js',
"""  if(!targets.length&&b.hp<b.maxhp){
    b.hp=Math.min(b.maxhp,b.hp+Math.round(b.maxhp*.01));
    floater(b.x,b.y-b.r-12,'+','#7DFF9E',13);
  }
}""",
"""  if(!targets.length&&b.hp<b.maxhp){
    b.hp=Math.min(b.maxhp,b.hp+Math.round(b.maxhp*.01));
    floater(b.x,b.y-b.r-12,'+','#7DFF9E',13);
  }
}
/* v4.17: el HECHICERO resucita hasta 2 esbirros de los caídos hace menos de
   18 s (al 60% de vida, con bruma lila). Nunca trae de vuelta magos,
   élites ni campistas: su legión sigue siendo de esbirros. */
function bossRevive(b){
  const now=time;
  b.memo=(b.memo||[]).filter(m=>now-m.t<18);
  if(!b.memo.length)return;
  const k=Math.min(2,b.memo.length,Math.max(0,26-enemies.length));
  let n=0;
  for(let i=0;i<k;i++){
    const m=b.memo.pop();
    const elvl=clamp(m.elvl,minLvlOf(run.level),maxLvlOf(run.level));
    const c=spawnEnemy(m.tk,elvl,{after:'roam',delay:i*.2});
    c.sx=b.x+rand(-30,30);c.sy=b.y+30;c.x=c.sx;c.y=c.sy;
    c.cx=b.x+rand(-90,90);c.cy=b.y+80;
    c.fx=clamp(b.x+rand(-160,160),30,W-30);c.fy=rand(90,H*.45);
    c.hp=c.maxhp=Math.max(1,Math.round(c.maxhp*.6));
    c.revived=true;n++;
    rings.push({x:c.sx,y:c.sy,r:6,R:66,t:0,life:.5,color:'#B388FF'});
  }
  if(n){floater(b.x,b.y-b.r-16,'¡RESUCITA!','#B388FF',13);tone(240,540,.3,'sine',.05);}
}""")
rep('js/boss.js',
"""  mech:'Pulsos arcanos que curan a su legión + esbirros invocados',
  tip:'Quema a los esbirros y golpéalo entre pulso y pulso; cada fase cura a más aliados a la vez.',""",
"""  mech:'Pulsos arcanos que curan a su legión, legión invocada, resucita esbirros y lanza MALDICIONES',
  tip:'Mátalo pronto: al caer se disipan sus maldiciones (salvo las de varias oleadas). Caza a los resucitados.',""")
rep('js/boss.js',
"""      if(p.t==='gold'){
        if(remote)walletGold(pl.slot,p.val);else save.gold+=p.val;
        run.goldRun+=p.val;save.totGold=(save.totGold||0)+p.val;
        missionTick('gold',p.val);SFX.coin();""",
"""      if(p.t==='gold'){
        const gv=Math.max(1,Math.round(p.val*curseGoldMul())); /* v4.17: MISERIA */
        if(remote)walletGold(pl.slot,gv);else save.gold+=gv;
        run.goldRun+=gv;save.totGold=(save.totGold||0)+gv;
        missionTick('gold',gv);SFX.coin();""")
rep('js/boss.js',
"""          const v=Math.round((80+run.level*10)*players[0].goldMul);""",
"""          const v=Math.max(1,Math.round((80+run.level*10)*players[0].goldMul*curseGoldMul())); /* v4.17: MISERIA */""")

# ---------- 5. waves.js: makeElite devuelve el élite ----------
rep('js/waves.js',
"""  e.x=e.sx;e.y=e.sy;
  floater(e.sx,90,'¡ÉLITE!','#B388FF',14);
}""",
"""  e.x=e.sx;e.y=e.sy;
  floater(e.sx,90,'¡ÉLITE!','#B388FF',14);
  return e; /* v4.17: el HECHICERO lo reposiciona al invocarlo */
}""")

# ---------- 6. loot.js: memoria de cadáveres + resucitados + killBoss ----------
rep('js/loot.js',
"""  if(e.T.mage){
    /* v4.16: cazador de magos — contador para el logro ANTIMAGIA */
    save.totMage=(save.totMage||0)+1;
    floater(e.x,e.y-36,'¡MAGO CAÍDO!','#B388FF',13);
  }
  checkAch();""",
"""  if(e.T.mage){
    /* v4.16: cazador de magos — contador para el logro ANTIMAGIA */
    save.totMage=(save.totMage||0)+1;
    floater(e.x,e.y-36,'¡MAGO CAÍDO!','#B388FF',13);
  }
  /* v4.17: esbirros resucitados cuentan para EXORCISTA; el cadáver reciente
     alimenta la memoria de resucitación del HECHICERO y de los magos altos */
  if(e.revived){
    save.totRevKills=(save.totRevKills||0)+1;
    floater(e.x,e.y-30,'RESUCITADO DESTRUIDO','#D6BCFF',11);
  }
  if(!e.elite&&!e.camp&&!e.T.mage){
    if(boss&&boss.kind==='HECHICERO'){
      (boss.memo=boss.memo||[]).push({tk:e.tk,elvl:e.elvl,t:time});
      if(boss.memo.length>10)boss.memo.shift();
    }
    for(const mg of enemies)if(!mg.dead&&mg!==e&&mg.T.mage&&mg.elvl>=128&&Math.hypot(mg.x-e.x,mg.y-e.y)<300){
      (mg.memo=mg.memo||[]).push({tk:e.tk,elvl:e.elvl,t:time});
      if(mg.memo.length>6)mg.memo.shift();
    }
  }
  checkAch();""")
rep('js/loot.js',
"""function killBoss(){
  const b=boss;boss=null;
  run.kills++;save.totKills++;""",
"""function killBoss(){
  const b=boss;boss=null;
  if(b.kind==='HECHICERO')expireCurses(); /* v4.17: sus maldiciones "mientras él viva" se disipan */
  run.kills++;save.totKills++;""")

# ---------- 7. core.js: exp + sellado ----------
rep('js/core.js',
"""function gainExp(n){
  expFrac+=n*XP_MUL;""",
"""function gainExp(n){
  expFrac+=n*XP_MUL*curseExpMul(); /* v4.17: LETARGO reduce la exp a la mitad */""")
rep('js/core.js',
"""    for(const tb of (run.tempBuffs||[])){const tc=TEMP_POOL.find(t=>t.id===tb.id);if(tc)tc.f(b);}""",
"""    for(const tb of (run.tempBuffs||[])){
      if(tempBuffSealed(tb.id))continue; /* v4.17: BLOQUEO sella el poder */
      const tc=TEMP_POOL.find(t=>t.id===tb.id);if(tc)tc.f(b);}""")

# ---------- 8. azar.js: bloqueo ----------
rep('js/azar.js',
"""  const ch=azarChance();""",
"""  const ch=curseActive('bloqueo')?0:azarChance(); /* v4.17: BLOQUEO no deja sorteos nuevos */""")
rep('js/azar.js',
"""function grantTempBuff(slot){
  if(!run.tempBuffs)run.tempBuffs=[];""",
"""function grantTempBuff(slot){
  /* v4.17: BLOQUEO — el poder del cofre se cambia por oro */
  if(curseActive('bloqueo')){
    if(slot!=null)grantGold(slot,120);
    return '+120 DE ORO (poderes bloqueados por la MALDICIÓN)';
  }
  if(!run.tempBuffs)run.tempBuffs=[];""")

# ---------- 9. chests.js: MISERIA en grantGold ----------
rep('js/chests.js',
"""function grantGold(slot,v){
  walletGold(slot,v);
  run.goldRun+=v;
}""",
"""function grantGold(slot,v){
  const gv=Math.max(1,Math.round(v*curseGoldMul())); /* v4.17: MISERIA reduce el oro */
  walletGold(slot,gv);
  run.goldRun+=gv;
}""")

# ---------- 10. input.js: TORPEZA + wipe ----------
rep('js/input.js',
"""  const target=clampShip(pl,t.sx+(e.clientX-t.ax)*DRAG_GAIN,t.sy+(e.clientY-t.ay)*DRAG_GAIN);""",
"""  const DG=DRAG_GAIN*curseMoveMul(); /* v4.17: TORPEZA — los mandos pesan */
  const target=clampShip(pl,t.sx+(e.clientX-t.ax)*DG,t.sy+(e.clientY-t.ay)*DG);""")
rep('js/input.js',
"""  save.skins={owned:['menta'],eq:null};save.bestCombo=0;save.totGold=0;save.totGems=0;save.seen={};""",
"""  save.skins={owned:['menta'],eq:null};save.bestCombo=0;save.totGold=0;save.totGems=0;save.seen={};
  /* v4.14–4.17: contadores y trazas nuevas también se reinician */
  save.totDevour=0;save.biomesSeen={};save.ghost=null;save.ghostBeat=false;save.totPhase5=0;save.totMage=0;
  save.totCurses=0;save.totRevKills=0;""")

# ---------- 11. screens.js ----------
rep('js/screens.js',
"""  run.ghostTrail=[];run.ghostAcc=0;run.ghostPassed=false;run.ghostRef=null;run.ghostLead=0;""",
"""  run.ghostTrail=[];run.ghostAcc=0;run.ghostPassed=false;run.ghostRef=null;run.ghostLead=0;
  run.curses=[]; /* v4.17: sin maldiciones al empezar */""")
rep('js/screens.js',
"""  run.buffs=players.map(()=>[]);
  recompute();""",
"""  run.buffs=players.map(()=>[]);
  run.curses=[]; /* v4.17 */
  recompute();""")
rep('js/screens.js',
"""  if(net.mode!=='client')updTempBuffs();
  buildWave(L);""",
"""  if(net.mode!=='client')updTempBuffs();
  if(net.mode!=='client')curseTickWave(); /* v4.17: las de varias oleadas cuentan atrás */
  buildWave(L);""")
rep('js/screens.js',
"""    ['DEVORADOS · AGUJERO NEGRO',save.totDevour||0],
    ['BIOMAS VISITADOS',Object.keys(save.biomesSeen||{}).length+' / '+BIOMES.length],""",
"""    ['DEVORADOS · AGUJERO NEGRO',save.totDevour||0],
    ['BIOMAS VISITADOS',Object.keys(save.biomesSeen||{}).length+' / '+BIOMES.length],
    ['MALDICIONES SUFRIDAS',save.totCurses||0],
    ['RESUCITADOS DESTRUIDOS',save.totRevKills||0],""")

# ---------- 12. net.js: 'curs' ----------
rep('js/net.js',
"""  if(k==='temp'){ run.tempBuffs=d.l||[]; return; }""",
"""  if(k==='temp'){ run.tempBuffs=d.l||[]; return; }
  if(k==='curs'){ applyCurses(d.l); return; } /* v4.17: maldiciones del HECHICERO */""")

# ---------- 13. hud.js: curseBar + sellado ----------
rep('js/hud.js',
"""    bb.innerHTML=tbs.map(tb=>{
      const tp=TEMP_POOL.find(t=>t.id===tb.id);
      return '<span class="bicon">'+(TB_ICON[tb.id]||'✦')+'<i>'+tb.waves+'</i></span>';
    }).join('');""",
"""    bb.innerHTML=tbs.map(tb=>{
      const sea=tempBuffSealed(tb.id); /* v4.17: BLOQUEO sella el poder */
      return '<span class="bicon'+(sea?' sealed':'')+'">'+(TB_ICON[tb.id]||'✦')+'<i>'+(sea?'✖':tb.waves)+'</i></span>';
    }).join('');""")
rep('js/hud.js',
"""  }else{bb.classList.add('hidden');bb.innerHTML='';}
  /* v4.12: contador de COMBO de bajas (se desvanece en su último segundo) */""",
"""  }else{bb.classList.add('hidden');bb.innerHTML='';}
  /* v4.17: maldiciones activas del HECHICERO (◈ = mientras él viva · Nol = oleadas) */
  const cb=$('#curseBar');
  if(cb){
    const csl=(run.curses&&runActive)?run.curses:[];
    if(csl.length){
      cb.classList.remove('hidden');
      cb.innerHTML=csl.map(c=>'<span class="bicon curse">'+(CURSE_ICON[c.id]||'✖')+'<i>'+(c.alive?'◈':c.waves+'ol')+'</i></span>').join('');
      cb.title='MALDICIONES: '+csl.map(c=>CURSES[c.id].name).join(' · ');
    }else{cb.classList.add('hidden');cb.innerHTML='';}
  }
  /* v4.12: contador de COMBO de bajas (se desvanece en su último segundo) */""")

# ---------- 14. netsync.js: bit revived ----------
rep('js/netsync.js',
"""      (e.frozen>0?1:0)+(e.burn?2:0)];""",
"""      (e.frozen>0?1:0)+(e.burn?2:0)+(e.revived?4:0)];""")
rep('js/netsync.js',
"""      if(ed[11]){e.frozen=(ed[11]&1)?1:0;e.burn=(ed[11]&2)?{dps:0,t:1}:null;}""",
"""      if(ed[11]){e.frozen=(ed[11]&1)?1:0;e.burn=(ed[11]&2)?{dps:0,t:1}:null;e.revived=!!(ed[11]&4);}
      else e.revived=false;""")
rep('js/netsync.js',
"""      if(ed[11]!==undefined){e.frozen=(ed[11]&1)?1:0;if(ed[11]&2&&!e.burn)e.burn={dps:0,t:1};}""",
"""      if(ed[11]!==undefined){e.frozen=(ed[11]&1)?1:0;if(ed[11]&2&&!e.burn)e.burn={dps:0,t:1};e.revived=!!(ed[11]&4);}""")

# ---------- 15. render.js: marca de resucitado ----------
rep('js/render.js',
"""    g.restore();g.globalAlpha=1;
  }
  if(e.frozen>0){""",
"""    g.restore();g.globalAlpha=1;
  }
  /* v4.17: marca de esbirro RESUCITADO — bruma lila que lo distingue */
  if(e.revived){
    g.save();g.translate(e.x,e.y);
    g.globalAlpha=.28+Math.sin(time*3+e.wob)*.1;
    g.strokeStyle='#D6BCFF';g.lineWidth=1.5;g.setLineDash([4,6]);
    g.beginPath();g.arc(0,0,e.r+5,0,TAU);g.stroke();
    g.setLineDash([]);g.restore();g.globalAlpha=1;
  }
  if(e.frozen>0){""")

# ---------- 16. achievements.js: +2 ----------
rep('js/achievements.js',
"""{id:'hec', name:'ROMPEHECHIZOS',      desc:'Derrota 5 HECHICERO',                  rw:4, ck:()=>(save.bossKills.HECHICERO||0)>=5},
];""",
"""{id:'hec', name:'ROMPEHECHIZOS',      desc:'Derrota 5 HECHICERO',                  rw:4, ck:()=>(save.bossKills.HECHICERO||0)>=5},
/* v4.17: las maldiciones y los resucitados */
{id:'mld', name:'MALDITO',            desc:'Sufre 15 maldiciones del HECHICERO',   rw:4, ck:()=>(save.totCurses||0)>=15},
{id:'exo', name:'EXORCISTA',          desc:'Destruye 10 esbirros RESUCITADOS',     rw:4, ck:()=>(save.totRevKills||0)>=10},
];""")

# ---------- 17. profile.js: VERSION + save ----------
rep('js/profile.js',
"""const KEY_LOCAL='fragmenta_v3', KEY_OLD='fragmenta_v2', KEY_NET='fragmenta_v3_net', VERSION='4.16';""",
"""const KEY_LOCAL='fragmenta_v3', KEY_OLD='fragmenta_v2', KEY_NET='fragmenta_v3_net', VERSION='4.17';""")
rep('js/profile.js',
"""  ghost:null,totDevour:0,biomesSeen:{},ghostBeat:false};}""",
"""  ghost:null,totDevour:0,biomesSeen:{},ghostBeat:false,
  /* v4.17: maldiciones sufridas y resucitados destruidos */
  totCurses:0,totRevKills:0};}""")

# ---------- 18. config.js: bestiario del mago ----------
rep('js/config.js',
"""  mago:  {name:'MAGO',      desc:'No baja nunca: flota junto a su banda y lanza PULSOS ARCANOS que curan a los aliados heridos. Cuanto MÁS NIVEL tiene, MÁS aliados cura a la vez (1 → hasta 6) y desde nivel alto INVOCA esbirros. Prioridad objetivo: mátalo primero.'},""",
"""  mago:  {name:'MAGO',      desc:'No baja nunca: flota junto a su banda y lanza PULSOS ARCANOS que curan a los aliados heridos. Cuanto MÁS NIVEL tiene, MÁS aliados cura a la vez (1 → hasta 6), desde el nivel 128 INVOCA esbirros y también RESUCITA a los caídos a su alrededor. Prioridad objetivo: mátalo primero.'},""")

# ---------- 19. update.js: curseBar en el autodiagnóstico ----------
rep('js/update.js',
"""    const need=['btnWipe','buffBar','btnCheckUpd'];""",
"""    const need=['btnWipe','buffBar','curseBar','btnCheckUpd'];""")

# ---------- 20. index.html ----------
rep('index.html',
"""<html lang="es" data-v="4.16">""",
"""<html lang="es" data-v="4.17">""")
rep('index.html',
"""<title>FRAGMENTA v4.16 — purga geométrica infinita</title>""",
"""<title>FRAGMENTA v4.17 — purga geométrica infinita</title>""")
rep('index.html',
"""    <div class="buffbar hidden" id="buffBar"></div>""",
"""    <div class="buffbar hidden" id="buffBar"></div>
    <div class="buffbar curserow hidden" id="curseBar"></div>""")
rep('index.html',
"""  <button id="btnTag" class="tagbtn">▸ NOVEDADES DE LA v4.16</button>""",
"""  <button id="btnTag" class="tagbtn">▸ NOVEDADES DE LA v4.17</button>""")
rep('index.html',
"""  <p class="tagline hidden" id="tagBody">La <b>v4.16</b> trae la MAGIA: el <b>MAGO</b>, figura nueva lila que no pica nunca — lanza <b>PULSOS ARCANOS</b> que curan a sus aliados heridos (cuanto MÁS NIVEL tiene, MÁS aliados cura a la vez: de 1 hasta 6) e <b>INVOCA ESBIRROS</b> desde la oleada 10. Y en la <b>OLEADA 25</b> debuta el <b>HECHICERO</b>, el nuevo Guardián mago: cura en área a toda su legión, la invoca sin parar y en cada fase cura a más a la vez. 2 logros nuevos: ANTIMAGIA y ROMPEHECHIZOS. Lo de la v4.15 sigue: menú compacto, ajustes ⚙, ranking por modos, logros por reclamar y co-op de 3.</p>""",
"""  <p class="tagline hidden" id="tagBody">La <b>v4.17</b> desata LAS MALDICIONES: el <b>HECHICERO</b> (OL 25, 65, 105…) lanza al azar hasta 3 a la vez y cada una afecta SOLO una cosa — <b>TORPEZA</b> (mandos al 65%), <b>MISERIA</b> (mitad de oro), <b>LETARGO</b> (mitad de exp) y <b>BLOQUEO</b> (poderes temporales sellados). Al caer él se disipan… <b>salvo las de varias oleadas</b>, que siguen su cuenta atrás. Además <b>RESUCITA</b> esbirros caídos (al 60% de vida) e <b>INVOCA UN ÉLITE</b> desde la fase 2 (máx 2 por combate), y los MAGOS de nivel 128+ también resucitan esbirros. 2 logros nuevos: MALDITO y EXORCISTA.</p>""")
rep('index.html',
"""  <div class="ver">FRAGMENTA v4.16 · EL MAGO · GUARDIÁN HECHICERO ·""",
"""  <div class="ver">FRAGMENTA v4.17 · MALDICIONES DEL HECHICERO · RESUCITA ESBIRROS · INVOCA UN ÉLITE · EL MAGO · GUARDIÁN HECHICERO ·""")
rep('index.html',
"""<script src="js/azar.js?v=4.16"></script>""",
"""<script src="js/azar.js?v=4.16"></script>
<script src="js/curses.js?v=4.16"></script>""")

# ---------- 21. css/styles.css ----------
s = rd('css/styles.css')
if '.bicon.curse' not in s:
    wr('css/styles.css', s.rstrip('\n') + """

/* ===== v4.17: maldiciones del HECHICERO ===== */
.buffbar .bicon.curse{border-color:#B388FF;color:#D6BCFF;background:rgba(179,136,255,.16);text-shadow:0 0 6px rgba(179,136,255,.55)}
.buffbar .bicon.sealed{opacity:.38;filter:saturate(.25)}
""")

# ---------- 22. bump global 4.16 -> 4.17 en index.html ----------
s = rd('index.html')
n = s.count('?v=4.16')
if n != 27:  # css + 26 js (25 + curses.js)
    fails.append('index.html: se esperaban 27 tags ?v=4.16, hay %d' % n)
else:
    wr('index.html', s.replace('?v=4.16', '?v=4.17'))

# ---------- 23. version.json ----------
wr('version.json', json.dumps({"v": "4.17"}) + '\n')

# ---------- resultado ----------
if fails:
    print('FALLOS (%d):' % len(fails))
    for f in fails: print(' -', f)
    sys.exit(1)
print('patch_v417 OK — todas las sustituciones aplicadas')
