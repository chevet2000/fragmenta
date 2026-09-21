'use strict';
/* ============ botín ============ */
/* v4.18: JUICE — racha de tono (cada baja seguida en <1.1 s sube el tono) */
let kcN=0,kcLast=-9;
/* v4.10: ORO POR PARTES — el enemigo ya no guarda TODO su oro para el final:
   suelta trozos cada vez que le bajas un 20% de vida y el resto (la última
   mitad) al matarlo. El total que acaba dando es el mismo de siempre.
   El presupuesto se fija al aparecer (spawnEnemy) en e.goldTotal. */
/* v4.21: aviso con freno de Bóveda llena (máx 1 cada 20 s) */
let vaultWarnT=-99;
function vaultFullWarn(x,y){
  if(run.time-vaultWarnT<20)return;
  vaultWarnT=run.time;
  floater(x,y-40,'BÓVEDA LLENA ('+VCAP+'/'+VCAP+') · ÁBRELA EN EL MENÚ','#FFD166',13);
}
function dropLoot(e){
  /* v4.10: al morir suelta el RESTO de su oro (≈50% si soltó los 4 tramos) */
  const rem=Math.max(0,(e.goldTotal||0)-(e.goldDropped||0));
  if(rem>0&&pickups.length<250)
    pickups.push({t:'gold',x:e.x,y:e.y,vx:rand(-60,60),vy:rand(-150,-40),val:rem});
  /* v4.18: COFRE DE LA FORTUNA — 2% al matar (nunca de élites/campistas, ya
     pagan lo suyo). Rareza al azar: común 58% · raro 25% · épico 12% ·
     LEGENDARIO 5% (con reliquia). El cerebro se engancha a lo impredecible. */
  if(!e.elite&&!e.camp&&pickups.length<240&&Math.random()<.02){
    const r=Math.random(),rar=r<.58?'c':r<.83?'r':r<.95?'e':'l';
    pickups.push({t:'lchest',x:e.x,y:e.y,vx:rand(-40,40),vy:rand(-140,-50),rar});
    if(rar==='l')floater(e.x,e.y-30,'¿¡COFRE LEGENDARIO!?','#FFD166',14);
  }
  /* v4.21: COFRE SELLADO — se GUARDA en la Bóveda y se abre desde el menú
     con la cerradura de pulsos. Generoso en las oleadas 1–10. El campista
     no suelta (él ya tiene su minicofre) y la Bóveda tiene tope. */
  if(!e.camp&&pickups.length<240&&vaultCount()<VCAP){
    const sr=rollSealed(e.elite?'elite':'kill');
    if(sr){
      pickups.push({t:'vchest',x:e.x,y:e.y,vx:rand(-40,40),vy:rand(-140,-50),rar:sr});
      if(sr==='l')floater(e.x,e.y-30,'¿¡COFRE SELLADO LEGENDARIO!?','#FFD166',14);
    }
  }
  /* v4.9: gemas y corazones más raros */
  let gr=.02+run.level*.0012;
  if(players.some(pl=>pl.gemLuck))gr*=1.9;
  if(players.some(pl=>pl.gemExtra))gr+=.03;
  if(run.relics.includes('crudas'))gr+=.08;
  if(Math.random()<gr)pickups.push({t:'gem',x:e.x,y:e.y,vx:rand(-50,50),vy:rand(-130,-40)});
  if(Math.random()<.006*(players.some(pl=>pl.heartDrop)?1.8:1))
    pickups.push({t:'heart',x:e.x,y:e.y,vx:rand(-40,40),vy:rand(-120,-40)});
}
function killEnemy(e,bySlot){
  if(e.dead)return;
  e.dead=true;run.kills++;save.totKills++;
  bySlot=bySlot||0;
  const pl=players[bySlot]||players[0];
  burst(e.x,e.y,e.camp?'#FFD166':e.T.color,e.r>18?20:12,e.r>18?180:120);
  shake=Math.min(14,shake+(e.r>18?5:1.5));
  /* v4.18: JUICE — tono en escalera por racha + micro cámara lenta al matar */
  if(time-kcLast<1.1)kcN++;else kcN=1;kcLast=time;
  SFX.kill(1+Math.min(14,kcN-1)*.055);
  hitStopT=Math.max(hitStopT,(e.r>18||e.elite)?.09:.04);
  dropLoot(e);
  if(e.tk==='hive')hiveBurst(e);
  doSplit(e);
  /* v4.8: XP según el nivel máximo de la oleada (1-5 por baja) */
  /* v4.12: COMBOS — cada baja en menos de 3 s mantiene la racha.
     Hitos 10/25/50/100 pagan oro (y gemas a partir de ×50). */
  run.comboN=(run.comboN||0)+1;run.comboT=3;
  if(run.comboN>(save.bestCombo||0)){save.bestCombo=run.comboN;run.newComboRec=true;}
  /* v4.18: los combos PAGAN — hasta +50% de exp con racha de 50 */
  const cmbB=1+Math.min(.5,Math.max(0,run.comboN-4)*.012);
  gainExp(waveXp()*pl.expMul*cmbB);
  missionTick('kills',1);
  const CB={10:15,25:40,50:100,100:250};
  if(CB[run.comboN]){
    grantGold(bySlot,CB[run.comboN]);
    if(run.comboN>=50)grantGems(bySlot,run.comboN>=100?2:1);
    floater(pl.x,pl.y-48,'¡COMBO ×'+run.comboN+'! +'+CB[run.comboN]+' ORO','#FFD166',15);
    tone(880,1400,.15,'square',.05);vib(40);
    checkAch();
  }
  if(pl.frenzy){run.combo++;
    if(run.combo>=6&&frenzyT<=0){frenzyT=5;floater(pl.x,pl.y-34,'¡FRENESÍ!','#FFD166',14);}}
  if(pl.vamp&&players.some(q=>q.hp<q.maxHp&&q.hp>0)&&Math.random()<.12){
    const q=players.find(q=>q.hp>0&&q.hp<q.maxHp);
    q.hp++;floater(q.x,q.y-26,'+1','#7DFF9E',12);}
  if(run.relics.includes('deton')){
    for(const o of enemies)if(!o.dead&&o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<60)damageEnemy(o,Math.max(1,Math.round(pl.dmg)),false,bySlot);
  }
  if(e.elite){
    run.eliteKills++;missionTick('elite',1);
    save.totElite=(save.totElite||0)+1;
    const gMul=pl.goldMul*(pl.presa?1.5:1);
    const n=irand(6,9); /* v4.9: menos oro de élites */
    for(let i=0;i<n;i++)
      pickups.push({t:'gold',x:e.x,y:e.y,vx:rand(-160,160),vy:rand(-240,-60),
        val:Math.max(2,Math.round((1+run.level*.25)*gMul))});
    for(let i=0;i<1;i++)
      pickups.push({t:'gem',x:e.x,y:e.y,vx:rand(-120,120),vy:rand(-220,-60)});
    gainExp(Math.round(waveXp()*4*pl.expMul)); /* v4.9: élite x4 (antes x6) */
    floater(e.x,e.y-34,'¡ÉLITE CAÍDO!','#B388FF',14);
    shake=Math.min(16,shake+6);
  }
  if(e.camp){
    save.totCamp=(save.totCamp||0)+1;
    pickups.push({t:'minichest',x:e.x,y:e.y,vx:0,vy:-90});
    for(let i=0;i<4;i++) /* v4.9: menos oro de campistas */
      pickups.push({t:'gold',x:e.x,y:e.y,vx:rand(-120,120),vy:rand(-220,-60),
        val:Math.max(2,Math.round((.8+run.level*.22)*pl.goldMul))});
    gainExp(Math.round(waveXp()*4*pl.expMul));
    floater(e.x,e.y-40,'¡CAMPISTA CAÍDO!','#FFD166',13);
    shake=Math.min(16,shake+6);
    checkAch();
  }
  if(e.T.mage){
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
  checkAch();
}
function doSplit(e){
  if(e.elite||e.tk==='kami'||e.camp)return;
  if(e.elvl<5&&e.tk!=='hive')return;
  const cap=players.length>2?64:players.length===2?52:40;
  if(enemies.length>cap)return;
  const minL=minLvlOf(run.level);
  if(e.elvl<=minL&&e.tk!=='hive')return;
  const k=clamp(2+Math.floor(e.elvl/12),2,4)+(e.tk==='hive'?1:0);
  /* v4.9: los hijos heredan ~85% del nivel del padre (los niveles ya empiezan en ~100) */
  const base=Math.round(e.elvl*.85);
  for(let i=0;i<k;i++){
    const cl=clamp(base-irand(0,8),1,Math.max(1,e.elvl-1));
    /* v4.13: en FRENÉTICO los hijos vuelven ARRIBA a la banda de acecho y,
       en niveles bajos del frenesí, su figura es suave (sin centinelas ni
       kamikazes al segundo 10); en el resto del juego, igual que siempre */
    const c=spawnEnemy(frenzyMode&&run.level<=4?frenzyType():typeForLevel(cl),cl,
      {after:frenzyMode?'form':'roam',delay:i*.06});
    c.sx=e.x+rand(-8,8);c.sy=e.y+rand(-8,8);
    if(frenzyMode){
      c.fx=rand(40,W-40);c.fy=rand(H*.08,H*.32);
      c.cx=e.x+rand(-80,80);c.cy=clamp(e.y-rand(60,140),-30,H*.3);
    }else{
      c.fx=clamp(e.x+rand(-120,120),30,W-30);
      c.fy=clamp(e.y-rand(30,120),70,H*.5);
      c.cx=e.x+rand(-80,80);c.cy=e.y-rand(20,80);
    }
    c.x=c.sx;c.y=c.sy;
  }
  rings.push({x:e.x,y:e.y,r:6,R:70,t:0,life:.4,color:e.T.color});
  hostRing(e.x,e.y,70,e.T.color);
  floater(e.x,e.y-24,'¡SE DIVIDE!','#FF9F43',12);
}
function hiveBurst(e){
  const n=8,sp=110*players[0].slow;
  for(let i=0;i<n;i++){const a=TAU*i/n;
    ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,color:'#FF6B6B',dead:false});}
  rings.push({x:e.x,y:e.y,r:8,R:60,t:0,life:.35,color:'#FF6B6B'});
  hostRing(e.x,e.y,60,'#FF6B6B');
}
function damageEnemy(e,dmg,crit,bySlot){
  if(e.dead)return;
  bySlot=bySlot||0;
  const pl=players[bySlot]||players[0];
  if(e.armor)dmg=Math.max(1,dmg-e.armor);
  if(e.elite&&pl.presa)dmg*=1.6;
  if(e.frozen>0&&pl.iceTop)dmg*=1.5;
  let th=0;
  if(run.relics.includes('sangre'))th=.40;
  else if(players.some(q=>q.execute))th=.25;
  if(th>0&&e.hp<=e.maxhp*th)dmg*=3;
  e.hp-=dmg;e.flash=1;
  run.stDmg+=dmg;
  /* v4.10: los críticos se notan — número grande y sonido agudo */
  if(crit){
    floater(e.x+rand(-8,8),e.y-e.r-8,'¡'+Math.round(dmg)+'!','#FFD166',16);
    shake=Math.min(14,shake+1.1); /* v4.18: el crítico también se siente */
    critPing();
  }else floater(e.x+rand(-8,8),e.y-e.r-6,'-'+dmg,'#F2EFE6',11);
  /* v4.10: ORO POR PARTES — cada 20% de vida perdida suelta ~12,5% de su oro
     (4 tramos = 50%); al morir cae el resto. Solo si vale la pena partirlo. */
  if(e.goldTotal>=3){
    while(e.goldMark>0&&e.hp<=e.maxhp*e.goldMark){
      e.goldMark-=.2;
      const val=Math.min(Math.max(1,Math.round(e.goldTotal*.125)),e.goldTotal-e.goldDropped);
      if(val>0&&pickups.length<250){
        pickups.push({t:'gold',x:e.x,y:e.y,vx:rand(-80,80),vy:rand(-170,-60),val});
        e.goldDropped+=val;
      }
      if(e.goldDropped>=e.goldTotal)break;
    }
  }
  SFX.hit();
  if(e.hp<=0)killEnemy(e,bySlot);
}
function damageBoss(d,crit,bySlot){
  if(!boss)return;
  boss.hp-=d;boss.flash=1;
  run.stDmg+=d;
  if(crit){floater(boss.x+rand(-20,20),boss.y-boss.r-10,'¡'+Math.round(d)+'!','#FFD166',18);critPing();}
  else floater(boss.x+rand(-20,20),boss.y-boss.r-8,'-'+d,'#F2EFE6',12);
  SFX.hit();
  if(boss.hp<=0)killBoss();
}
function killBoss(){
  const b=boss;boss=null;
  if(b.kind==='HECHICERO')expireCurses(); /* v4.17: sus maldiciones "mientras él viva" se disipan */
  run.kills++;save.totKills++;
  if(!run.bossDmgTaken)run.stPerfect++;
  burst(b.x,b.y,b.D.color,34,240);burst(b.x,b.y,'#F2EFE6',20,160);
  rings.push({x:b.x,y:b.y,r:10,R:220,t:0,life:.6,color:b.D.color});
  hostRing(b.x,b.y,220,b.D.color);
  shake=20;vib(120);
  hitStopT=.16; /* v4.18: la muerte del Guardián se congela un instante */
  tone(500,60,.5,'sawtooth',.1);tone(300,40,.6,'square',.08,.1);
  const gMul=players[0].goldMul;
  const gn=5+run.level; /* v4.9: menos oro de jefes */
  for(let i=0;i<gn;i++)
    pickups.push({t:'gold',x:b.x,y:b.y,vx:rand(-160,160),vy:rand(-260,-60),
      val:Math.max(2,Math.round((.8+run.level*.28)*gMul))});
  const gm=1+Math.floor(run.level/10); /* v4.9: menos gemas de jefes */
  for(let i=0;i<gm;i++)
    pickups.push({t:'gem',x:b.x,y:b.y,vx:rand(-140,140),vy:rand(-240,-60)});
  pickups.push({t:'heart',x:b.x,y:b.y,vx:0,vy:-120});
  if(run.level%10===0){
    pickups.push({t:'chest',x:b.x,y:b.y,vx:rand(-20,20),vy:-80});
    floater(b.x,b.y-60,'¡COFRE! ATRÁPALO','#FFD166',15);
  }
  /* v4.21: el GUARDIÁN siempre suelta un COFRE SELLADO para la Bóveda
     (raro/épico/legendario según la oleada; si la Bóveda está llena, aviso) */
  if(vaultCount()>=VCAP){
    vaultFullWarn(b.x,b.y);
  }else{
    const brar=rollSealed('boss');
    if(brar){
      pickups.push({t:'vchest',x:b.x,y:b.y-14,vx:rand(-26,26),vy:-115,rar:brar});
      floater(b.x,b.y-44,'🔒 COFRE '+RAR_NAME[brar]+' · A LA BÓVEDA',RAR_COL[brar],14);
    }
  }
  gainExp(Math.round(waveXp()*8*players[0].expMul)); /* v4.9: jefe x8 (antes x12) */
  missionTick('boss',1); /* v4.12: misiones diarias de Guardianes */
  banner('GUARDIÁN DESTRUIDO',run.level%10===0?'Recoge el cofre y el botín':'Recoge las recompensas');
}

/* ============ v4.19: METEORITOS DORADOS ============
   Cada 20–36 s un meteorito DORADO cruza la pantalla. Revéntalo a
   disparos antes de que escape y suelta una lluvia de oro (+ gema y
   corazón a veces). Es un premio que se ESCAPA si no reaccionas:
   ventanas de recompensa impredecibles durante la partida.
   v4.20: RAREZAS — el 18% de los meteoritos es PÚRPURA (ANÓMALO):
   más duro (7 impactos), estela violeta y suelta una RELIQUIA
   garantizada además del oro y 2–3 gemas. */
function spawnMeteor(){
  const pur=run.level>=2&&Math.random()<.18; /* v4.20: meteorito PÚRPURA raro */
  const m={x:0,y:0,vx:0,vy:0,r:pur?17:15,hp:pur?7:4,maxhp:pur?7:4,rot:rand(0,TAU),vr:rand(-2.2,2.2),t:0,dead:false,pur,
    verts:Array.from({length:7},()=>rand(.74,1))};
  const style=Math.random();
  if(style<.55){ /* cruza en diagonal desde un lateral superior */
    const side=Math.random()<.5;
    m.x=side?-30:W+30;m.y=rand(30,Math.max(80,H*.3));
    m.vx=(side?1:-1)*rand(105,165);m.vy=rand(55,105);
  }else{ /* cae en diagonal desde arriba */
    m.x=rand(W*.15,W*.85);m.y=-30;
    m.vx=rand(-85,85);m.vy=rand(115,175);
  }
  meteors.push(m);
  if(pur){tone(900,120,.7,'sawtooth',.035);tone(240,700,.5,'sine',.03,.15);}
  else SFX.meteor();
  if(!meteorWarned){meteorWarned=true;
    banner('★ METEORITO DORADO','¡Revéntalo a tiempo y llévate su oro!');}
  else if(pur)banner('◈ METEORITO ANÓMALO','Violeta y más duro · esconde una RELIQUIA');
}
function updMeteors(dt){
  if(state!=='play')return;
  meteorT-=dt;
  if(meteorT<=0&&meteors.length<2){spawnMeteor();meteorT=rand(20,36);}
  for(const m of meteors){
    m.t+=dt;m.x+=m.vx*dt;m.y+=m.vy*dt;m.rot+=m.vr*dt;
    /* estela dorada (o violeta en el ANÓMALO) */
    if(Math.random()<.8&&parts.length<250)
      parts.push({x:m.x+rand(-4,4),y:m.y+rand(-4,4),vx:-m.vx*.12+rand(-24,24),vy:-m.vy*.12+rand(-24,24),
        rot:rand(0,TAU),vr:rand(-7,7),life:rand(.22,.48),t:0,
        color:m.pur?(Math.random()<.55?'#B388FF':'#8A5AFF'):(Math.random()<.55?'#FFD166':'#FF9F43'),
        kind:Math.random()<.6?'tri':'line',size:rand(1.6,3.4)});
    /* colisión con balas del jugador */
    for(const b of bullets){
      if(b.dead)continue;
      const rr=m.r+b.r;
      if((b.x-m.x)**2+(b.y-m.y)**2<rr*rr){
        b.dead=true;m.hp--;
        tone(560+irand(0,240),250,.07,'square',.045);
        burst(b.x,b.y,'#FFE9B0',5,110);
        if(m.hp<=0){popMeteor(m);break;}
      }
    }
    if(m.t>26||m.y>H+70||m.x<-90||m.x>W+90)m.dead=true; /* se escapa… */
  }
  meteors=meteors.filter(m=>!m.dead);
}
function popMeteor(m){
  m.dead=true;
  save.totMeteor=(save.totMeteor||0)+1;
  const gMul=players[0]?players[0].goldMul:1;
  if(m.pur){ /* v4.20: PÚRPURA — oro extra, 2–3 gemas, corazón y RELIQUIA garantizada */
    save.totMeteorP=(save.totMeteorP||0)+1;
    const n=irand(8,12);
    for(let i=0;i<n;i++)
      pickups.push({t:'gold',x:m.x,y:m.y,vx:rand(-150,150),vy:rand(-240,-60),
        val:Math.max(3,Math.round((5+run.level*.9)*gMul))});
    const ng=irand(2,3);
    for(let i=0;i<ng;i++)
      pickups.push({t:'gem',x:m.x,y:m.y,vx:rand(-100,100),vy:rand(-210,-60)});
    if(Math.random()<.35)pickups.push({t:'heart',x:m.x,y:m.y,vx:rand(-60,60),vy:rand(-160,-60)});
    const pool=RELICS.filter(r=>!run.relics.includes(r.id));
    let relicMsg='reliquia sin hueco · +300 ORO';
    if(pool.length){
      const r=pool[irand(0,pool.length-1)];
      run.relics.push(r.id);recompute();
      if(r.id==='hierro')healPlayerOnce(0,3);
      relicMsg='RELIQUIA: '+r.name;
      pickups.push({t:'gem',x:m.x,y:m.y,vx:rand(-70,70),vy:rand(-190,-70)});
    }else{
      const v=300;save.gold+=v;save.totGold=(save.totGold||0)+v;run.goldRun+=v;
    }
    burst(m.x,m.y,'#B388FF',30,260);burst(m.x,m.y,'#8A5AFF',16,180);
    rings.push({x:m.x,y:m.y,r:8,R:140,t:0,life:.55,color:'#B388FF'});
    hostRing(m.x,m.y,140,'#B388FF');
    floater(m.x,m.y-26,'¡METEORITO PÚRPURA!','#B388FF',15);
    SFX.legend();tone(140,50,.4,'sawtooth',.09);
    shake=Math.min(16,shake+6);hitStopT=Math.max(hitStopT,.06);vib(80);
    banner('◈ ¡ANOMALÍA CAPTURADA!','Oro · gemas · '+relicMsg);
    checkAch();persist();
    return;
  }
  const n=irand(6,9);
  for(let i=0;i<n;i++)
    pickups.push({t:'gold',x:m.x,y:m.y,vx:rand(-140,140),vy:rand(-230,-60),
      val:Math.max(2,Math.round((3+run.level*.75)*gMul))});
  if(Math.random()<.4)pickups.push({t:'gem',x:m.x,y:m.y,vx:rand(-90,90),vy:rand(-200,-60)});
  if(Math.random()<.18)pickups.push({t:'heart',x:m.x,y:m.y,vx:rand(-60,60),vy:rand(-160,-60)});
  burst(m.x,m.y,'#FFD166',26,240);burst(m.x,m.y,'#FF9F43',14,170);
  rings.push({x:m.x,y:m.y,r:8,R:120,t:0,life:.5,color:'#FFD166'});
  hostRing(m.x,m.y,120,'#FFD166');
  floater(m.x,m.y-26,'¡METEORITO!','#FFD166',15);
  SFX.chest();tone(170,55,.32,'sawtooth',.09);
  shake=Math.min(16,shake+4);hitStopT=Math.max(hitStopT,.05);vib(60);
  banner('★ ¡METEORITO REVENTADO!','Lluvia de oro · recógela antes de que caiga');
  checkAch();persist();
}

/* ============ v4.20: CUBOS SORPRESA ============
   Desde que ENTRAS (oleada 1) y cada cierto tiempo cruza un cubo con
   escudo. Se le QUITA EL ESCUDO a disparos y al romperlo sortea UNO de
   dos premios: PURGA — destruye 2, 3, 4 o 5 enemigos al azar (con todo
   su botín) — o una NAVE AMIGA que te escolta 60 s disparando con el
   DOBLE de tu daño. Si se te escapa, se va con su sorpresa. */
function spawnCube(){
  if(pickups.some(p=>p.t==='cube'))return;
  const sh=Math.max(22,Math.round(hpForLevel(maxLvlOf(run.level))*.9));
  const cx=clamp(W/2+rand(-W*.32,W*.32),50,W-50);
  pickups.push({t:'cube',x:cx,y:-40,vx:rand(-12,12),vy:rand(8,16),shield:sh,shieldMax:sh});
  floater(cx,110,'CUBO SORPRESA','#FF7EB6',13);
  tone(340,720,.25,'square',.05);tone(720,480,.2,'square',.035,.14);
  if(!save.seenCube){save.seenCube=1;
    banner('CUBO SORPRESA','Rompe su escudo a disparos: purga de enemigos o nave amiga');}
}
/* romper el escudo del cubo = resolver su sorpresa */
function resolveCube(p){
  save.totCube=(save.totCube||0)+1;
  rings.push({x:p.x,y:p.y,r:10,R:130,t:0,life:.55,color:'#FF7EB6'});
  hostRing(p.x,p.y,130,'#FF7EB6');
  burst(p.x,p.y,'#FF7EB6',22,200);burst(p.x,p.y,'#FFE9B0',12,140);
  SFX.cube();shake=Math.min(16,shake+5);hitStopT=Math.max(hitStopT,.06);vib(60);
  if(Math.random()<.45){ /* 45%: NAVE AMIGA · 60 s con el doble de tu daño */
    const pl=players[0]||P;
    allies.push({x:pl?pl.x:W/2,y:pl?pl.y-60:H*.7,cd:.5,life:60,ph:rand(0,TAU)});
    updAllies.warn=false; /* rearma el aviso de retirada */
    save.totAlly=(save.totAlly||0)+1;
    floater(p.x,p.y-40,'¡NAVE AMIGA! 60 s','#FFE9B0',15);
    banner('NAVE AMIGA DESPLEGADA','Te escolta 60 s · dispara con el DOBLE de tu daño');
    SFX.ally();
  }else{ /* 55%: PURGA — 2 a 5 enemigos al azar explotan con su botín */
    const r=Math.random();
    const n=r<.35?2:r<.65?3:r<.86?4:5;
    const vivos=shuffle(enemies.filter(e=>!e.dead)).slice(0,n);
    for(const e of vivos){
      floater(e.x,e.y-e.r-8,'¡PURGADO!','#FF7EB6',13);
      burst(e.x,e.y,'#FF7EB6',14,150);
      rings.push({x:e.x,y:e.y,r:6,R:64,t:0,life:.4,color:'#FF7EB6'});
      e.hp=0;killEnemy(e,0);
    }
    floater(p.x,p.y-40,'¡PURGA ×'+vivos.length+'!','#FF7EB6',15);
    banner('CUBO SORPRESA · PURGA',vivos.length+' enemigo'+(vivos.length>1?'s':'')+' destruidos al azar · +su botín');
  }
  checkAch();persist();
}

/* ============ v4.20: EL PORTAL MISTERIOSO ============
   El que quedó reservado: cada 45–80 s (nunca con Guardián ni en
   frenético) cruza un portal violáceo. Revéntalo a disparos (6 impactos)
   y se ABRE: suelta gemas al instante y ABRE LA DIMENSIÓN ANÓMALA — la
   oleada siguiente nace distorsionada: botín DOBLE en todos sus enemigos
   y una RELIQUIA garantizada al despejarla. */
function spawnPortal(){
  const side=Math.random()<.5?-1:1;
  portals.push({x:side<0?-36:W+36,y:rand(H*.22,H*.5),vx:side*rand(52,86),vy:0,
    r:26,hp:6,maxhp:6,rot:rand(0,TAU),t:0,dead:false});
  tone(120,900,.6,'sine',.05);tone(900,240,.45,'sine',.04,.25);
  if(!portalWarned){portalWarned=true;
    banner('◈ ALGO SE ACERCA','Un portal desconocido cruza el sector…');
  }else banner('◈ PORTAL MISTERIOSO','Revéntalo y abre la DIMENSIÓN ANÓMALA');
}
function openPortal(p){
  p.dead=true;
  save.totPortal=(save.totPortal||0)+1;
  run.portalNext=true; /* la SIGUIENTE oleada (no jefa) será anómala */
  const gMul=players[0]?players[0].goldMul:1;
  const n=irand(6,10);
  for(let i=0;i<n;i++)
    pickups.push({t:'gold',x:p.x,y:p.y,vx:rand(-130,130),vy:rand(-220,-60),
      val:Math.max(2,Math.round((3+run.level*.6)*gMul))});
  const ng=irand(2,3);
  for(let i=0;i<ng;i++)
    pickups.push({t:'gem',x:p.x,y:p.y,vx:rand(-90,90),vy:rand(-200,-60)});
  burst(p.x,p.y,'#B388FF',30,240);burst(p.x,p.y,'#64C7FF',18,170);
  rings.push({x:p.x,y:p.y,r:10,R:170,t:0,life:.65,color:'#B388FF'});
  rings.push({x:p.x,y:p.y,r:10,R:110,t:0,life:.45,color:'#64C7FF'});
  hostRing(p.x,p.y,170,'#B388FF');
  floater(p.x,p.y-30,'¡PORTAL ABIERTO!','#B388FF',15);
  SFX.portal();SFX.legend();
  shake=Math.min(18,shake+8);hitStopT=Math.max(hitStopT,.09);vib(90);
  banner('◈ PORTAL MISTERIOSO ABIERTO','La OLEADA ANÓMALA llega: botín ×2 · reliquia garantizada');
  checkAch();persist();
}
function updPortals(dt){
  if(state!=='play')return;
  /* el portal no aparece en frenético (oleada única) ni con un Guardián vivo */
  if(!frenzyMode&&!boss){
    portalT-=dt;
    if(portalT<=0&&portals.length<1&&!run.portalNext){spawnPortal();portalT=rand(45,80);}
  }
  for(const p of portals){
    p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.rot+=dt*2.4;
    /* vórtice: chupa levemente a los enemigos cercanos (misterio visual) */
    for(const e of enemies){
      if(e.dead||e.state==='enter')continue;
      const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy);
      if(d<130&&d>1){e.x+=dx/d*26*dt;e.y+=dy/d*26*dt;}
    }
    for(const b of bullets){
      if(b.dead)continue;
      const rr=p.r+b.r;
      if((b.x-p.x)**2+(b.y-p.y)**2<rr*rr){
        b.dead=true;p.hp--;
        tone(420+irand(0,300),180,.09,'sine',.045);
        burst(b.x,b.y,'#D6BCFF',5,110);
        if(p.hp<=0){openPortal(p);break;}
      }
    }
    if(p.t>34||p.x<-110||p.x>W+110)p.dead=true;
  }
  portals=portals.filter(p=>!p.dead);
}
/* v4.20: temporizador de los CUBOS SORPRESA (junto al de meteoritos) */
function updEvents(dt){
  if(state!=='play')return;
  cubeT-=dt;
  if(cubeT<=0){
    if(!boss&&!pickups.some(p=>p.t==='cube')){spawnCube();cubeT=rand(16,26);}
    else cubeT=rand(4,7); /* ocupado: reintenta enseguida */
  }
  updPortals(dt);
}

