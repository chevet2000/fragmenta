'use strict';
/* ============ oleadas ============ */
const WAVE_NAME={form:'FORMACIÓN',drip:'GOTEO',snake:'CULEBRA',swarm:'ENJAMBRE',boss:'GUARDIÁN'};
function pickWaveType(L){
  const pool=['form','form','drip','drip','snake','snake','swarm'];
  let t=pool[irandR(0,pool.length-1)];
  if(t===lastWaveType)t=pool[irandR(0,pool.length-1)];
  return t;
}
function spawnFormation(L,f){
  f=f||1;
  const maxL=maxLvlOf(L),minL=minLvlOf(L);
  const n=Math.max(5,Math.round(clamp(10+L*1.5,10,30)*f));
  const cols=Math.min(7,Math.ceil(Math.sqrt(n*1.6)));
  const rows=Math.ceil(n/cols);
  const sp=Math.min(46,(W-30)/cols);
  const startX=W/2-(cols-1)*sp/2;
  const topY=clamp(H*.12,80,120);
  for(let i=0;i<n;i++){
    const row=Math.floor(i/cols),col=i%cols;
    const elvl=clamp(maxL-Math.floor(row*2.2)-irandR(0,1),minL,maxL);
    const e=spawnEnemy(typeForLevel(elvl),elvl,{after:'form',delay:i*.06});
    e.fx=clamp(startX+col*sp+(row%2?sp*.25:0),24,W-24);
    e.fy=topY+row*44;
    e.sx=e.fx<W/2?-40:W+40;e.sy=rand(-30,50);
    e.cx=W/2+rand(-80,80);e.cy=H*.30+rand(-40,40);
    e.x=e.sx;e.y=e.sy;
  }
  wave.total+=n;
}
function spawnSnake(L,f){
  f=f||1;
  const maxL=maxLvlOf(L),minL=minLvlOf(L);
  const nS=L>=18?3:L>=7?2:1;
  let links=Math.round(clamp(7+Math.floor(L/2),7,16)*f);
  links=Math.max(4,links);
  for(let s=0;s<nS;s++){
    const sn={s:0,spd:Math.min(.85,.5+L*.012),ph:rand(0,TAU)};
    wave.snakes.push(sn);
    const si=wave.snakes.length-1;
    for(let i=0;i<links;i++){
      const elvl=i===0?maxL:irandR(Math.max(minL,Math.ceil(maxL*.4)),maxL);
      const e=spawnEnemy(typeForLevel(elvl),elvl,{snake:si,snIdx:i});
      e.state='snake';e.inT=0;e.inDelay=.15+i*.11;
      e.sx=W/2+rand(-100,100);e.sy=-40;e.x=e.sx;e.y=e.sy;
    }
    wave.total+=links;
  }
}
function spawnDripOne(){
  const maxL=maxLvlOf(run.level),minL=minLvlOf(run.level);
  const elvl=irandR(Math.max(minL,Math.ceil(maxL*.45)),maxL);
  const e=spawnEnemy(typeForLevel(elvl),elvl,{after:'roam'});
  const side=wave.side;wave.side=-wave.side;
  if(R()<.6){e.sx=rand(30,W-30);e.sy=-40;e.cx=e.sx+rand(-90,90);}
  else{e.sx=side<0?-40:W+40;e.sy=rand(60,H*.35);e.cx=W/2+rand(-120,120);}
  e.cy=rand(40,H*.3);e.fx=rand(40,W-40);e.fy=rand(70,H*.5);
  e.x=e.sx;e.y=e.sy;
}
function spawnSwarmOne(){
  const maxL=maxLvlOf(run.level),minL=minLvlOf(run.level);
  const elvl=irandR(minL,Math.max(minL,Math.round(maxL*.55)));
  const r=R();const tk=r<.42?'dart':r<.74?'dash':'orb';
  const e=spawnEnemy(tk,elvl,{after:'drift'});
  e.sx=rand(26,W-26);e.sy=-30-rand(0,40);
  e.cx=e.sx+rand(-60,60);e.cy=H*.25;
  e.fx=rand(30,W-30);e.fy=rand(60,H*.4);
  e.x=e.sx;e.y=e.sy;e.dvy=rand(95,135)+Math.min(50,run.level*1.6);
}
function spawnExtra(L,i){
  const maxL=maxLvlOf(L),minL=minLvlOf(L);
  const elvl=irandR(Math.max(minL,Math.ceil(maxL*.5)),maxL);
  const e=spawnEnemy(typeForLevel(elvl),elvl,{after:'roam',delay:.6+i*.4});
  e.sx=R()<.5?-40:W+40;e.sy=rand(40,H*.3);
  e.cx=W/2+rand(-140,140);e.cy=rand(40,H*.3);
  e.fx=rand(40,W-40);e.fy=rand(70,H*.5);
  e.x=e.sx;e.y=e.sy;
}
/* ============ v4.13: FRENÉTICO REHECHO ============
   Los enemigos se POSENCIONAN en la banda superior y patrullan ahí.
   Solo ALGUNOS se lanzan en picado (tope simultáneo según nivel) y, al
   salir por abajo, vuelven a entrar POR ARRIBA hacia su puesto. Nada de
   cascada infinita. El tipo de figura escala con el nivel de frenesí. */
function frenzyType(){
  const lv=run.level,r=R();
  if(lv<=2)return r<.45?'orb':r<.75?'dart':'block';
  if(lv<=4)return r<.25?'orb':r<.5?'dart':r<.72?'block':r<.88?'sentry':'medic';
  if(lv<=7)return r<.2?'dart':r<.4?'block':r<.58?'sentry':r<.72?'reflect':r<.84?'medic':'hive';
  return typeForLevel(12); /* nivel alto: mezcla completa (ya con kamikazes) */
}
function spawnFrenzyOne(){
  const maxL=maxLvlOf(run.level),minL=minLvlOf(run.level);
  const elvl=irandR(Math.max(minL,Math.ceil(maxL*.55)),maxL);
  const e=spawnEnemy(frenzyType(),elvl,{after:'form',delay:rand(0,.35)});
  e.fx=rand(40,W-40);
  e.fy=rand(H*.08,H*.32); /* banda superior: al entrar se asientan arriba */
  e.sx=R()<.5?-40:W+40;e.sy=rand(-40,60);
  e.cx=W/2+rand(-120,120);e.cy=rand(-30,H*.18);
  e.x=e.sx;e.y=e.sy;
  e.diveT=rand(5.5,9.5); /* los primeros ataques tardan: respiro al empezar */
}
function makeElite(L,delay){
  const maxL=maxLvlOf(L);
  const elvl=maxL+irandR(2,5);
  let tk=typeForLevel(elvl);
  /* v4.16: sin MAGOS élite — ya invocan por ser élite y sería doble invocación */
  if(tk==='mago')tk='sentry';
  const e=spawnEnemy(tk,elvl,{after:'roam',delay,elite:true});
  e.sx=rand(60,W-60);e.sy=-60;
  e.cx=e.sx+rand(-80,80);e.cy=H*.25;
  e.fx=rand(60,W-60);e.fy=rand(90,H*.4);
  e.x=e.sx;e.y=e.sy;
  floater(e.sx,90,'¡ÉLITE!','#B388FF',14);
}
function buildWave(L){
  wave={type:'',types:[],pending:0,total:0,wasBoss:false,snakes:[],spawnT:1,side:1,pool:[]};
  const coop=players.length>1&&net.mode==='host';
  /* v4.9: MODO FRENÉTICO — una sola oleada infinita con nivel creciente
     (run.level sube con el tiempo en updWaveSpawns) y jefes periódicos */
  if(frenzyMode){
    wave.type='frenzy';
    wave.pending=30;wave.pool=Array(30).fill('fz');
    banner('FRENÉTICO','Oleada infinita · acechan desde arriba · sobrevive');
    return;
  }
  if(L%5===0){
    wave.type='boss';wave.wasBoss=true;wave.total=1;
    run.bossDmgTaken=false;
    spawnBoss(L);SFX.boss();
    return;
  }
  let comps;
  if(L<=4)comps=[L===1?'form':L===2?'drip':L===3?'snake':'swarm'];
  else if(R()<.34){
    const all=shuffle(['form','drip','snake','swarm']);
    comps=all.slice(0,L>=12&&R()<.45?3:2);
  }else comps=[pickWaveType(L)];
  wave.type=comps.length>1?'mix':comps[0];
  wave.types=comps;lastWaveType=comps[0];
  const f=1/Math.sqrt(comps.length);
  const pools=[];
  for(const t of comps){
    if(t==='form')spawnFormation(L,f);
    else if(t==='snake')spawnSnake(L,f);
    else if(t==='drip'){
      /* v4.8: tope de goteo por oleada (antes 11+L sin límite → 460 enemigos en la 450) */
      const n=Math.max(5,Math.round(Math.min(70,11+L)*f));
      const a=[];for(let i=0;i<n;i++)a.push('drip');
      wave.pending+=n;wave.total+=n;pools.push(a);
    }else{
      /* v4.8: tope de enjambre por oleada */
      const n=Math.max(6,Math.round(Math.min(95,16+L*.9)*f));
      const a=[];for(let i=0;i<n;i++)a.push('swarm');
      wave.pending+=n;wave.total+=n;pools.push(a);
    }
  }
  if(pools.length)wave.pool=interleave(pools);
  if(L<=8){
    const ex=irandR(2,4);
    for(let i=0;i<ex;i++)spawnExtra(L,i);
    wave.total+=ex;
  }
  const eliteChance=Math.min(.65,.18+L*.025)+(coop?.12:0);
  let nE=(L>=14&&R()<.4)?2:1;
  if(coop&&L>=10)nE=Math.max(nE,2);
  if(L>=3&&R()<eliteChance){
    for(let i=0;i<nE;i++){makeElite(L,1.2+i*2);wave.total++;}
  }
  if(L>=7&&L%7===0&&L%5!==0){
    const c=spawnCamper(L);
    c.sx=rand(60,W-60);c.sy=-60;
    c.cx=c.sx+rand(-80,80);c.cy=H*.25;
    c.fx=rand(60,W-60);c.fy=rand(90,H*.4);
    c.x=c.sx;c.y=c.sy;
    wave.total++;
    floater(c.sx,120,'¡CAMPISTA: '+c.CD.name+'!','#FFD166',14);
    banner('CAMPISTA',c.CD.name+' · '+c.CD.tip);
  }
  const names=comps.map(t=>WAVE_NAME[t]).join(' + ');
  banner('OLEADA '+L+(comps.length>1?' · MIXTA':''),names+' · nv '+minLvlOf(L)+'–'+maxLvlOf(L)+' · '+DIFF_LABEL[runDiff]);
  /* ---- cofre blindado cada 2 oleadas ---- */
  if(L>=2&&L%2===0&&L%5!==0&&!pickups.some(p=>p.t==='schest')){
    /* escudo = 2x la vida del enemigo de nivel más alto de la oleada (nunca menor que la fórmula antigua) */
    const sh=Math.max(18+L*3,Math.round(hpForLevel(maxLvlOf(L))*2));
    const cx=clamp(W/2+rand(-W*.3,W*.3),50,W-50);
    pickups.push({t:'schest',x:cx,y:-46,vx:0,vy:0,shield:sh,shieldMax:sh,kind:'arm'});
    floater(cx,110,'COFRE BLINDADO','#64C7FF',13);
    if(run.level<=4)banner('COFRE BLINDADO','Destruye su escudo a disparos y atrápalo');
  }
}
function updWaveSpawns(dt){
  /* v4.9: rama del MODO FRENÉTICO — aparición continua, nivel creciente cada
     25 s, élites AL AZAR y un jefe cada 60 s; tope dinámico de vivos.
     v4.13: los enemigos se asientan ARRIBA y solo algunos bajan (spawnFrenzyOne). */
  if(frenzyMode){
    const nl=1+Math.floor(run.time/25);
    if(nl>run.level){
      run.level=nl;
      save.best.lvl=Math.max(save.best.lvl,nl);save.bestAll=Math.max(save.bestAll,nl);
      if(runDiff==='hardcore')save.bestHard=Math.max(save.bestHard||0,nl);
      floater(P.x,P.y-40,'NIVEL '+nl+' · MÁS FUERTES','#FF9F43',14);
      if(R()<.42){makeElite(nl,1.5);wave.total++;} /* v4.13: élite al azar, no siempre */
    }
    /* v4.13: élites sueltos al azar cada 20–35 s (máx. 2 a la vez) */
    if(run.frenzyEliteT==null)run.frenzyEliteT=rand(20,35);
    run.frenzyEliteT-=dt;
    if(run.frenzyEliteT<=0){
      run.frenzyEliteT=rand(20,35);
      const nEl=enemies.reduce((n,e)=>n+(e.elite&&!e.dead?1:0),0);
      if(nEl<2&&R()<.65){makeElite(run.level,1);wave.total++;}
    }
    /* v4.14: FANTASMA — traza de la carrera (muestra cada 4 s) y adelantamiento */
    run.ghostAcc=(run.ghostAcc||0)+dt;
    if(run.ghostAcc>=4){
      run.ghostAcc-=4;
      if(run.ghostTrail.length<400)run.ghostTrail.push({t:Math.round(run.time),k:run.kills});
    }
    if(run.ghostRef&&!run.ghostPassed&&run.kills>run.ghostRef(run.time)){
      run.ghostPassed=true;save.ghostBeat=true;
      banner('¡ADELANTASTE A TU FANTASMA!','Vas por delante de tu récord de '+fmtT(save.ghost?save.ghost.t:0));
      SFX.relic();checkAch();
    }
    /* v4.13: primer jefe a los 50 s y luego cada 60 s (antes 30/45 — asfixiante) */
    if(run.frenzyBossT==null)run.frenzyBossT=50;
    run.frenzyBossT-=dt;
    if(run.frenzyBossT<=0&&!boss){
      run.frenzyBossT=60;
      spawnBoss(run.level);SFX.boss();
      banner('¡JEFE!','Guardián frenético nv '+maxLvlOf(run.level));
    }
    /* v4.13: tope DINÁMICO de vivos (antes 110 — inundaba la pantalla) */
    const cap=Math.min(64,22+run.level*3);
    if(enemies.length>=cap){wave.spawnT=Math.max(wave.spawnT,.4);return;}
    wave.spawnT-=dt;
    if(wave.spawnT<=0){
      if(wave.pool.length<8)wave.pool=wave.pool.concat(Array(20).fill('fz'));
      wave.pool.shift();wave.pending--;
      spawnFrenzyOne();
      wave.spawnT=Math.max(.55,1.5-run.time*.004)*rand(.8,1.2);
    }
    return;
  }
  if(wave.pool.length===0)return;
  /* v4.8: nunca más de 110 enemigos vivos a la vez — el resto espera en cola
     (mata el lag del desafío semanal en oleadas altas) */
  if(enemies.length>=110){wave.spawnT=Math.max(wave.spawnT,.4);return;}
  wave.spawnT-=dt;
  if(wave.spawnT<=0){
    const t=wave.pool.shift();wave.pending--;
    if(t==='drip'){spawnDripOne();wave.spawnT=Math.max(.65,1.6-run.level*.05)*rand(.8,1.2);}
    else{spawnSwarmOne();wave.spawnT=Math.max(.85,1.7-run.level*.04)*rand(.8,1.2);}
  }
}

