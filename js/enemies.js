'use strict';
/* ============ enemigos ============ */
function spawnEnemy(tk,elvl,o){
  o=o||{};
  const T=TYPES[tk];
  /* v4.33: en la ZONA GRAVITATORIA-DEFENSA los enemigos nacen con +35% de vida */
  const hp=Math.max(1,Math.round(hpForLevel(elvl)*T.mult*zoneEnemyHpMul()));
  const e={id:eid++,tk,T,elvl,hp,maxhp:hp,x:0,y:0,
    r:clamp(10+Math.sqrt(elvl)*3.0,12,30)*(tk==='hive'?1.18:1)*(tk==='kami'?0.8:1),
    state:'enter',after:o.after||'form',t:0,delay:o.delay||0,flash:0,wob:rand(0,TAU),
    diveT:rand(4.5,8),shootT:rand(2,5),healT:rand(2.5,4.5),rt:0,ds:0,sumT:0,
    diveSpd:rand(.55,.75)+Math.min(.5,run.level*.02),
    armor:tk==='block'?1+Math.floor(elvl/10):0,
    elite:!!o.elite,snake:(o.snake!=null)?o.snake:null,snIdx:o.snIdx||0,
    inT:0,inDelay:0,dvy:0,sx:0,sy:0,cx:0,cy:0,fx:0,fy:0,tx:0,ty:0,dead:false,
    refCD:0,kamArm:tk==='kami'?rand(1.2,2.6):0,kamT:0,kamV:0,
    camp:o.camp||null,CD:null,campT:2.2,beam:null,
    frozen:0,burn:null,shockT:0,
    /* v4.10: ORO POR PARTES — presupuesto total fijado al aparecer */
    goldTotal:0,goldDropped:0,goldMark:.8,
    /* v4.17: resucitación — revT (temporizador del mago) y revived (marca) */
    revT:0,revived:false};
  /* v4.16: el MAGO tarda un poco en dar su primera invocación (respiro inicial) */
  if(tk==='mago')e.sumT=rand(4,7);
  if(e.elite){e.hp=e.maxhp=Math.round(hp*3.2);e.r=Math.min(38,e.r*1.38);e.sumT=4;crewSay('elite');} /* v4.30 */
  /* v4.10: presupuesto de oro = el mismo total que daba antes al morir,
     pero ahora se reparte: 4 tramos del 12,5% durante la pelea + resto al morir */
  const gPieces=(1+(elvl>=106?1:0)+(elvl>=114?1:0))+(T.magnet?1:0);
  e.goldTotal=Math.max(1,Math.round((.25+run.level*.15)*(players[0]?players[0].goldMul:1)))*gPieces;
  /* v4.18: en la OLEADA DORADA todo el mundo suelta +60% de oro */
  if(goldenWave)e.goldTotal=Math.round(e.goldTotal*1.6);
  /* v4.20: en la DIMENSIÓN ANÓMALA (traída por el PORTAL MISTERIOSO) el botín se DOBLA */
  if(anomalyWave)e.goldTotal=Math.round(e.goldTotal*2);
  /* v4.12: BESTIARIO — la figura queda registrada al aparecer (bandera, sin persistir aquí) */
  if(!save.seen)save.seen={};
  save.seen[tk]=1;
  if(e.elite)save.seen.elite=1;
  enemies.push(e);return e;
}
function pickRoamTarget(e){e.tx=rand(40,W-40);e.ty=rand(70,H*.52);e.rt=rand(1.6,3);}
function nearestPlayer(x,y){
  let best=null,bd=1e9;
  for(const pl of players){if(pl.hp<=0)continue;const d=Math.hypot(pl.x-x,pl.y-y);if(d<bd){bd=d;best=pl;}}
  return best||players[0];
}
function startDive(e){
  const pl=nearestPlayer(e.x,e.y);
  e.state='dive';e.ds=0;e.sx=e.x;e.sy=e.y;
  e.tx=clamp(pl.x+rand(-70,70),30,W-30);e.ty=H+80;
  e.cx=e.x+(pl.x-e.x)*.15+rand(-40,40);e.cy=e.y+(H-e.y)*.45;
  e.diveT=rand(6,11);
}
function snakePos(sn,s){
  return{x:W/2+Math.sin(s*.85+sn.ph)*(W*.30),
         y:H*.30+Math.sin(s*1.55+sn.ph*.7)*(H*.20)+Math.cos(s*.5)*H*.05};
}
function kamiExplode(e,damaging){
  burst(e.x,e.y,'#FF4757',16,170);
  rings.push({x:e.x,y:e.y,r:6,R:70,t:0,life:.35,color:'#FF4757'});
  hostRing(e.x,e.y,70,'#FF4757');
  addQuake(4,14); /* v4.28: kamikaze pasa por ESTABILIDAD */
  tone(500,80,.25,'sawtooth',.07);
  if(damaging){
    for(const pl of players){
      if(pl.hp>0&&Math.hypot(pl.x-e.x,pl.y-e.y)<70)hitPlayer(pl,1);
    }
  }
  killEnemy(e,0);
}

/* ============ CAMPISTAS ============ */
const CAMP_DEFS={
 CENTINELA:{name:'CENTINELA',color:'#FFD166',tip:'abanicos giratorios'},
 HERALDO:{name:'HERALDO',color:'#FF7EB6',tip:'invoca refuerzos'},
 TITAN:{name:'TITÁN',color:'#B0F2FF',tip:'láser de barrido'},
};
function spawnCamper(L){
  const keys=Object.keys(CAMP_DEFS);
  const key=keys[Math.floor(R()*keys.length)];
  const D=CAMP_DEFS[key];
  const hp=Math.round(hpForLevel(maxLvlOf(L))*5.5);
  /* v4.16: el campista no puede salir MAGO (un neutral que cura sería raro) */
  let tk=typeForLevel(maxLvlOf(L));if(tk==='mago')tk='orb';
  const e=spawnEnemy(tk,maxLvlOf(L),{after:'roam',delay:1,camp:key});
  e.hp=e.maxhp=hp;
  e.r=30;
  e.CD=D;
  e.campT=2.2;
  e.beam=null;
  if(!save.seen)save.seen={};
  save.seen.camp=1; /* v4.12: bestiario */
  return e;
}
function camperAI(e,dt){
  const pl=nearestPlayer(e.x,e.y);
  e.campT-=dt;
  if(e.campT<=0){
    if(e.camp==='CENTINELA'){
      e.campT=2.6;
      const a0=rand(0,TAU);
      const sp=eSpd(Math.min(210,(110+run.level*2))*players[0].slow); /* v4.33: zonas */
      for(let i=0;i<7;i++){
        const a=a0+i*TAU/7;
        ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,color:e.CD.color,dead:false});
      }
      tone(400,180,.15,'square',.04);
    }else if(e.camp==='HERALDO'){
      e.campT=5;
      if(enemies.length<26){
        const minL=minLvlOf(run.level),maxL=maxLvlOf(run.level);
        for(let i=0;i<2;i++){
          const elvl=clamp(irand(minL,maxL),minL,maxL);
          const c=spawnEnemy(typeForLevel(elvl),elvl,{after:'roam',delay:i*.2});
          c.sx=e.x+rand(-20,20);c.sy=e.y+rand(-10,10);
          c.cx=e.x+rand(-70,70);c.cy=e.y+rand(20,60);
          c.fx=clamp(e.x+rand(-90,90),30,W-30);c.fy=rand(80,H*.5);
          c.x=c.sx;c.y=c.sy;
        }
        floater(e.x,e.y-e.r-12,'¡REFUERZOS!','#FF7EB6',11);
      }
      if(pl){
        const a=Math.atan2(pl.y-e.y,pl.x-e.x);
        const sp=eSpd(Math.min(220,(120+run.level*2))*players[0].slow); /* v4.33: zonas */
        for(let i=-1;i<=1;i++)
          ebullets.push({x:e.x,y:e.y,vx:Math.cos(a+i*.16)*sp,vy:Math.sin(a+i*.16)*sp,r:5,color:'#FF7EB6',dead:false});
      }
      tone(300,120,.2,'square',.04);
    }else if(e.camp==='TITAN'){
      e.campT=4.5;
      const a0=pl?Math.atan2(pl.y-e.y,pl.x-e.x):Math.PI/2;
      e.beam={a:a0,rot:(Math.random()<.5?1:-1)*.9,t:0,life:1.6};
      SFX.laser();
    }
  }
  if(e.beam){
    const B=e.beam;
    B.t+=dt;B.a+=B.rot*dt;
    if(B.t>B.life)e.beam=null;
    else{
      for(const q of players){
        if(q.hp<=0||q.invul>0)continue;
        const pdx=q.x-e.x,pdy=q.y-e.y,d=Math.hypot(pdx,pdy);
        if(d<e.r+6)continue;
        const ad=Math.atan2(pdy,pdx);
        const dd=Math.abs(Math.atan2(Math.sin(ad-B.a),Math.cos(ad-B.a)));
        if(dd<0.07)hitPlayer(q,1);
      }
    }
  }
}

/* ============ v4.16: EL MAGO ============ */
/* PULSO ARCANO: cura hasta mageHealTargets(e.elvl) aliados heridos del radio.
   Elige SIEMPRE los más graves (menos % de vida) y cura 5% de la vida máxima
   de CADA curado — a más nivel de enemigo, más vida devuelve. Si sobran
   plazas se cura a sí mismo. Nunca dispara: su peligro son los demás. */
function mageHeal(e){
  const R2=150;
  const N=mageHealTargets(e.elvl);
  const heridos=enemies.filter(o=>!o.dead&&o!==e&&o.hp<o.maxhp&&Math.hypot(o.x-e.x,o.y-e.y)<R2)
    .sort((a,c)=>(a.hp/a.maxhp)-(c.hp/c.maxhp));
  const targets=heridos.slice(0,N);
  rings.push({x:e.x,y:e.y,r:8,R:R2,t:0,life:.55,color:'#B388FF'});
  hostRing(e.x,e.y,R2,'#B388FF');
  tone(720,1080,.22,'sine',.03);
  for(const o of targets){
    const amt=Math.max(2,Math.round(o.maxhp*.05));
    o.hp=Math.min(o.maxhp,o.hp+amt);
    floater(o.x,o.y-o.r-8,'+','#7DFF9E',13);
  }
  if(targets.length<N&&e.hp<e.maxhp){
    e.hp=Math.min(e.maxhp,e.hp+Math.max(2,Math.round(e.maxhp*.05)));
    floater(e.x,e.y-e.r-8,'+','#7DFF9E',12);
  }
}
/* INVOCACIÓN: trae esbirros (nunca otro mago — evita cascadas infinitas).
   A nivel alto (nv 128+, ~oleada 30) invoca 2 a la vez. Tope de vivos. */
function mageSummon(e){
  if(enemies.length>=22)return;
  const k=e.elvl>=128?2:1;
  const maxL=maxLvlOf(run.level),minL=minLvlOf(run.level);
  for(let i=0;i<k;i++){
    const elvl=clamp(irand(Math.round(maxL*.55),Math.round(maxL*.8)),minL,maxL);
    let tk=typeForLevel(elvl);if(tk==='mago')tk='orb';
    const c=spawnEnemy(tk,elvl,{after:'roam',delay:i*.25});
    c.sx=e.x+rand(-16,16);c.sy=e.y+rand(-8,8);c.x=c.sx;c.y=c.sy;
    c.cx=e.x+rand(-80,80);c.cy=e.y+rand(20,70);
    c.fx=clamp(e.x+rand(-110,110),30,W-30);c.fy=rand(80,H*.5);
  }
  rings.push({x:e.x,y:e.y,r:6,R:64,t:0,life:.4,color:'#B388FF'});
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
  c.hp=Math.max(1,Math.round(c.maxhp*.55)); /* 55% de su vida MÁXIMA */
  c.revived=true;
  rings.push({x:c.sx,y:c.sy,r:6,R:60,t:0,life:.5,color:'#B388FF'});
  hostRing(c.sx,c.sy,60,'#B388FF');
  floater(c.sx,c.sy-c.r-10,'¡RESUCITA!','#B388FF',12);
  tone(240,540,.3,'sine',.05);
}

/* ============ ELEMENTOS ============ */
function applyBurn(e,f,slot){
  const burn={dps:f.dps,t:f.dur,spread:f.spread,boom:f.boom,slot:slot||0};
  if(e===boss){ boss.burn=burn; return; }
  if(e.burn)return;
  e.burn=burn;
  if(f.spread>0){
    let n=f.spread;
    for(const o of enemies){
      if(o.dead||o===e||n<=0)continue;
      if(Math.hypot(o.x-e.x,o.y-e.y)<100){
        o.burn={dps:Math.max(2,Math.round(f.dps*.6)),t:f.dur*.8,spread:0,boom:f.boom,slot:burn.slot};
        floater(o.x,o.y-o.r-6,'🔥','#FF9F43',10);
        n--;
      }
    }
  }
}
function elementProcs(e,pl){
  if(e.dead||!pl)return;
  if(pl.fire&&Math.random()<pl.fire.ch){
    applyBurn(e,pl.fire,pl.slot);
    floater(e.x,e.y-e.r-8,'🔥','#FF9F43',11);
    SFX.ignite();
  }
  if(pl.ice&&Math.random()<pl.ice.ch){
    let n=pl.ice.n;
    e.frozen=Math.max(e.frozen,pl.ice.dur);
    floater(e.x,e.y-e.r-8,'❄','#B0E8FF',11);
    SFX.freeze();
    for(const o of enemies){
      if(o.dead||o===e||n<=0)continue;
      if(Math.hypot(o.x-e.x,o.y-e.y)<110){
        o.frozen=Math.max(o.frozen,pl.ice.dur);
        floater(o.x,o.y-o.r-8,'❄','#B0E8FF',10);
        n--;
      }
    }
  }
  if(pl.elec&&Math.random()<pl.elec.ch){
    let n=pl.elec.n;
    const dmg=pl.elec.dmg;
    e.shockT=Math.max(e.shockT,pl.elec.stun?1:.4);
    floater(e.x,e.y-e.r-14,'⚡','#FFE666',12);
    SFX.zap();
    for(const o of enemies){
      if(o.dead||o===e||n<=0)continue;
      if(Math.hypot(o.x-e.x,o.y-e.y)<110){
        o.shockT=Math.max(o.shockT,pl.elec.stun?1:.3);
        damageEnemy(o,dmg,false,pl.slot);
        floater(o.x,o.y-o.r-8,'⚡','#FFE666',10);
        n--;
      }
    }
    damageEnemy(e,Math.round(dmg*.6),false,pl.slot);
    if(boss&&Math.hypot(boss.x-e.x,boss.y-e.y)<140)damageBoss(Math.round(dmg*.6),false,pl.slot);
  }
}

