'use strict';
/* ============ recompute ============ */
function recompute(){
  const mk=slot=>{
    const b=blankStats();
    const applyTree=(slot===0)||(net.mode!=='client');
    if(applyTree){
      for(const nd of TREE)if(has(nd.id))nd.fx(b);
      b.goldMul*=1+.25*save.prest;
    }
    if(slot>0&&net.mode==='host'&&remoteBase&&remoteBase[slot]){
      const rb=remoteBase[slot];
      for(const k2 in b){ if(rb[k2]!==undefined&&k2!=='heal'&&k2!=='nova')b[k2]=rb[k2]; }
      if(rb.nova)b.nova=rb.nova;
    }
    for(const id of (run.buffs[slot]||[])){const c=CARDS.find(c=>c.id===id);if(c)c.f(b);}
    for(const tb of (run.tempBuffs||[])){
      if(tempBuffSealed(tb.id))continue; /* v4.17: BLOQUEO sella el poder */
      const tc=TEMP_POOL.find(t=>t.id===tb.id);if(tc)tc.f(b);}
    const RR=id=>run.relics.includes(id);
    if(RR('nucleo')){b.dmg+=2;b.maxHp-=1;}
    if(RR('hierro')){b.maxHp+=3;}
    if(RR('magnet'))b.magnet*=2;
    if(RR('tiempo'))b.slow*=.85;
    if(RR('alquimia'))b.goldMul*=1.3;
    if(RR('mente'))b.expMul*=1.3;
    if(RR('crudas'))b.gemLuck=true;
    /* v4.21: MEJORAS ARMADAS de la Bóveda — cada perfil aplica las suyas
       (en co-op el statblock del cliente ya las lleva incorporadas).
       v4.28: desde el DESPLIEGUE solo se aplican las que el piloto marcó
       (run.armedTaken); las que guardó siguen en save.armed sin aplicarse. */
    for(const pid of (run.armedTaken!=null?run.armedTaken:(save.armed||[]))){const pk=perkById(pid);if(pk)pk.fx(b);}
    return b;
  };
  players.forEach((pl,i)=>{
    const b=mk(i);
    const oldMax=pl.maxHp;
    pl.dmg=b.dmg;pl.fireRate=b.rate;pl.bullets=b.bul;pl.files=b.files;pl.speed=b.spd;pl.pierce=b.pierce;
    pl.crit=b.crit;pl.magnet=b.magnet;pl.maxHp=Math.max(1,b.maxHp);pl.regenRate=b.regenRate;
    pl.nova=b.nova;pl.slow=b.slow;pl.goldMul=b.goldMul;pl.expMul=b.expMul;pl.goldRate=b.goldRate;
    pl.aura=b.aura;pl.emergency=b.emergency;pl.field=b.field;pl.bounce=b.bounce;pl.overdrive=b.over;
    pl.drones=b.drones;pl.orbs=b.orbs;pl.shield=b.shield;pl.shieldFast=b.shieldFast;
    pl.vamp=b.vamp;pl.frenzy=b.frenzy;pl.execute=b.execute;pl.presa=b.presa;pl.reflect=b.reflect;
    pl.venge=b.venge;pl.secondWind=b.secondWind;pl.dash=b.dash;pl.stone=b.stone;pl.homing=b.homing;
    pl.prism=b.prism;pl.priFast=b.priFast;pl.msl=b.msl;pl.neb=b.neb;pl.pointDef=b.pointDef;
    pl.slowField=b.slowField;pl.novaRadial=b.novaRadial;pl.novaCdMul=b.novaCdMul;pl.novaMul=b.novaMul;
    pl.ojiva=b.ojiva;pl.gemLuck=b.gemLuck;pl.heartDrop=b.heartDrop;pl.vortex=b.vortex;
    /* v4.29: ENERGÍA — tanque, reactor y multiplicadores de consumo */
    const oldFuelMax=pl.fuelMax||b.fuelMax;
    pl.fuelMax=b.fuelMax;pl.enMax=b.enMax;
    pl.enRegen=b.enRegen*b.enRegenMul;
    pl.enUseMul=b.enUseMul;pl.fuelUseMul=b.fuelUseMul;pl.energyDropMul=b.energyDropMul;
    if(pl.fuel==null)pl.fuel=pl.fuelMax;
    else if(pl.fuelMax>oldFuelMax)pl.fuel+=pl.fuelMax-oldFuelMax; /* el tanque nuevo llega lleno */
    pl.fuel=Math.min(pl.fuel,pl.fuelMax);
    if(pl.en==null)pl.en=pl.enMax;else pl.en=Math.min(pl.en,pl.enMax);
    /* v4.9: ALIADO · bot de combate desbloqueable en el árbol */
    pl.bot=b.bot||0;pl.botDmg=b.botDmg||1;pl.botRate=b.botRate||1;
    pl.botMsl=!!b.botMsl;pl.botTwin=b.botTwin||0;pl.botPrc=b.botPrc||0;
    pl.elec=b.elec;pl.ice=b.ice;pl.iceTop=b.iceTop;pl.wind=b.wind;pl.fire=b.fire;
    pl.linkHeal=b.linkHeal||0;pl.linkRate=b.linkRate||5;pl.linkT=pl.linkT||0;
    pl.overEvery=b.overEvery;pl.desperate=b.desperate;pl.dashFast=b.dashFast;
    pl.droneFast=b.droneFast;pl.homeFast=b.homeFast;pl.gemExtra=b.gemExtra;
    pl.phoenixCharges=b.phx;
    /* v4.13: ARMA DEFINITIVA · Cañón Aniquilador */
    pl.ult=b.ult;pl.ultAim=b.ultAim;pl.ultBurn=b.ultBurn;pl.ultShock=b.ultShock;
    pl.ultCdMax=b.ultCd||14;pl.ultDmgMul=b.ultDmg||10;
    if(pl.ultT==null)pl.ultT=0;
    /* v4.14: 2ª DEFINITIVA · Agujero Negro */
    pl.bh=b.bh;pl.bhCdMax=b.bhCd||20;pl.bhRad=b.bhRad||130;pl.bhDur=b.bhDur||4;
    pl.bhPull=b.bhPull||1;pl.bhDmgMul=b.bhDmgMul||1;pl.bhBoom=!!b.bhBoom;pl.bhGold=!!b.bhGold;pl.bhHeal=!!b.bhHeal;
    if(pl.bhT==null)pl.bhT=0;
    if(b.heal)pl.hp=Math.min(pl.maxHp,pl.hp+b.heal);
    if(pl.maxHp>oldMax)pl.hp=Math.min(pl.maxHp,pl.hp+(pl.maxHp-oldMax));
    pl.hp=Math.min(pl.hp,pl.maxHp);
  });
  /* v4.28: ESTABILIDAD — los globals de cámara salen del árbol del PERFIL
     LOCAL (el temblor es cosa de cada pantalla, no viaja por la red). */
  {
    const q=blankStats();
    for(const nd of TREE)if(has(nd.id))nd.fx(q);
    quakeMul=q.quakeMul;quakeDecay=q.quakeDecay;noQuake=q.noQuake;
    noSelfQuake=q.noSelfQuake;noCritShake=q.noCritShake;noHurtShake=q.noHurtShake;
  }
}

/* ============ efectos ============ */
function banner(t,s){
  bannerTxt=t;bannerSub=s||'';bannerT=BANNER_LIFE;
  crewBannerMsg(t); /* v4.30: los banners grandes sacan palabras a la tripulación */
  if(net.mode==='host')sendMsg({t:'bn',a:t,b:s||''});
}
function floater(x,y,txt,color,size){
  if(floats.length>44)return;
  floats.push({x,y,txt,color:color||'#F2EFE6',size:size||12,t:0,life:.65});
  if(net.mode==='host')sendMsg({t:'fxf',id:fxId++,x:Math.round(x),y:Math.round(y),txt:String(txt).substr(0,8),c:color||'#F2EFE6',s:size||12});
}
function hostRing(x,y,R2,c){ if(net.mode==='host')sendMsg({t:'fxr',x:Math.round(x),y:Math.round(y),R:Math.round(R2),c}); }
function hostBeam(x1,y1,x2,y2){ if(net.mode==='host')sendMsg({t:'fxb',x1:Math.round(x1),y1:Math.round(y1),x2:Math.round(x2),y2:Math.round(y2)}); }
function hostUltBeam(x1,y1,x2,y2){ if(net.mode==='host')sendMsg({t:'fxu',x1:Math.round(x1),y1:Math.round(y1),x2:Math.round(x2),y2:Math.round(y2)}); } /* v4.13 */
function hostHole(x,y,rad,life){ if(net.mode==='host')sendMsg({t:'fxh',x:Math.round(x),y:Math.round(y),rad:Math.round(rad),life}); } /* v4.14 */
function burst(x,y,color,n,sp){
  for(let i=0;i<n;i++){const a=rand(0,TAU),v=rand(sp*.3,sp);
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,rot:rand(0,TAU),vr:rand(-8,8),
      life:rand(.35,.7),t:0,color,kind:Math.random()<.7?'tri':'line',size:rand(2,5)});}
  if(parts.length>260)parts.splice(0,parts.length-260);
}
function redFlash(){const f=$('#flash');f.classList.add('on');setTimeout(()=>f.classList.remove('on'),70);}

/* ============ EXPERIENCIA ============ */
/* v4.9: XP por OLEADA actual y ganancia global reducida x0.6.
   v4.23: CURVA POR MODO — en SOLO/NORMAL/DIFÍCIL sigue igual (100, 150,
   200…), pero en HARDCORE y FRENÉTICO subir la nave es un logro MAYOR:
   el primer nivel pide 5.000 XP y cada nivel siguiente DOBLA el precio
   (5.000 → 10.000 → 20.000 → 40.000…). Se acabó la nave de nivel 500:
   allí cada carta de nave se gana con sudor, y el nivel de nave para los
   gates del arsenal se consigue jugando los modos tranquilos.
   Además la XP por baja escala con la ESCALA VIVA (xpUpMul). */
const HC_XP_BASE=5000;
function shipNeed(lv){
  if(runDiff==='hardcore')return Math.round(HC_XP_BASE*Math.pow(2,lv-1));
  return 100+(lv-1)*50;
}
const XP_MUL=.6;
let expFrac=0;
const waveXp=()=>clamp(1+Math.floor(run.level/9),1,5)*xpUpMul(); /* v4.23: escala viva */
function gainExp(n){
  expFrac+=n*XP_MUL*curseExpMul(); /* v4.17: LETARGO reduce la exp a la mitad */
  const whole=Math.floor(expFrac);
  if(whole>0)expFrac-=whole;
  run.exp+=whole;
  let need=shipNeed(run.shipLv);
  while(run.exp>=need){
    run.exp-=need;run.shipLv++;
    crewSay('shipUp',{n:run.shipLv}); /* v4.30 */
    save.bestShip=Math.max(save.bestShip,run.shipLv);
    /* v4.8: máximo 5 niveles en espera — el excedente se convierte en oro
       (evita cadenas infinitas de elección de cartas en oleadas altas) */
    if(pendingShipLevels<5){
      pendingShipLevels++;
      floater(P.x,P.y-40,'NIVEL DE NAVE '+run.shipLv,'#7FD1B9',15);
    }else{
      grantGold(0,150);
      floater(P.x,P.y-30,'+150 ORO · NIVEL '+run.shipLv,'#FFD166',12);
    }
    need=shipNeed(run.shipLv);
  }
}

/* ============ misiones ============ */
function rollMissions(){
  if(weeklyMode){
    run.missions=[
      {txt:'Destruye 60 enemigos',n:60,p:0,rw:80,gem:1},
      {txt:'Recoge 160 de oro',n:160,p:0,rw:60,gem:1},
      {txt:'Caza 3 élites',n:3,p:0,rw:100,gem:2},
    ];
  }else{
    run.missions=[
      {txt:'Destruye 40 enemigos',n:40,p:0,rw:60,gem:0},
      {txt:'Recoge 120 de oro',n:120,p:0,rw:40,gem:1},
      {txt:'Caza 2 élites',n:2,p:0,rw:80,gem:1},
    ];
  }
  sendMiss();
}
/* ============ v4.12: MISIONES DIARIAS ============ */
/* 3 misiones por día (sorteo determinista por fecha, iguales para todos).
   El progreso se comparte entre partidas del mismo día y caduca a medianoche. */
function ensureDailyM(){
  const ds=daySeed();
  if(!save.dailyM||save.dailyM.d!==ds){
    const rng=mulberry32(hashStr('FRGDM-'+ds));
    const pool=[...DAILY_POOL];
    const l=[];
    for(let i=0;i<3&&pool.length;i++){
      const j=Math.floor(rng()*pool.length);
      const m=pool.splice(j,1)[0];
      l.push({k:m.k,txt:m.txt,n:m.n,p:0,rw:m.rw,gem:m.gem,done:false});
    }
    save.dailyM={d:ds,l};
    persist();
  }
  return save.dailyM.l;
}
function dailyMDone(){
  if(!save.dailyM||save.dailyM.d!==daySeed())return 0;
  return save.dailyM.l.filter(m=>m.done).length;
}
function dailyMissionTick(kind,amt){
  if(!save.dailyM||save.dailyM.d!==daySeed())return;
  for(const m of save.dailyM.l){
    if(m.done||m.k!==kind)continue;
    m.p=Math.min(m.n,m.p+amt);
    if(m.p>=m.n){
      m.done=true;
      save.gold+=m.rw;save.totGold=(save.totGold||0)+m.rw;
      if(m.gem){save.gems+=m.gem;save.totGems=(save.totGems||0)+m.gem;}
      banner('MISIÓN DIARIA CUMPLIDA','+'+m.rw+' de oro'+(m.gem?' · +'+m.gem+' gema':''));
      SFX.relic();vib(50);
      checkAch();persist();
      dailyStreakCheck(); /* v4.19: ¿eran las 3? sube la racha del día */
    }
  }
}
function sendMiss(){ if(net.mode==='host')sendMsg({t:'ev',k:'miss',l:run.missions.map(m=>({txt:m.txt,p:m.p,n:m.n,done:!!m.done}))}); }
/* ============ v4.19: RACHA DE MISIONES DIARIAS (día 1, 2, 3…) ============
   Completa las 3 misiones del MISMO DÍA y la racha sube: día 1, día 2…
   Si un día se falla, la racha vuelve a empezar. Cada día de racha paga
   un bono de gemas (+1 por día, tope +7) — motivo para volver mañana.
   La evaluación es perezosa: se comprueba al completar la 3ª misión,
   así no hace falta ningún temporizador de medianoche. */
function daySeedOffset(off){
  const d=new Date();d.setDate(d.getDate()-(off||0));
  return 'D'+d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
/* racha vigente: solo cuenta si el último día completado fue hoy o ayer */
function effStreak(){
  const s=save.streakLast;
  if(s===daySeed()||s===daySeedOffset(1))return save.streak||0;
  return 0;
}
function dailyStreakCheck(){
  if(dailyMDone()<3)return;               /* aún no están las 3 de hoy */
  if(save.streakLast===daySeed())return;  /* hoy ya contó */
  if(save.streakLast===daySeedOffset(1))save.streak=(save.streak||0)+1;
  else{save.streak=1;save.streakClaimed={};} /* v4.20: racha nueva → hitos cobrables otra vez */
  save.streakLast=daySeed();
  save.streakBest=Math.max(save.streakBest||0,save.streak);
  const bonus=Math.min(7,save.streak);
  save.gems+=bonus;save.totGems=(save.totGems||0)+bonus;
  banner('★ RACHA DE MISIONES · DÍA '+save.streak,
    '+'+bonus+' gema'+(bonus>1?'s':'')+' de bono · vuelve mañana para seguirla');
  SFX.relic();vib(70);
  /* v4.20: RECOMPENSAS VISIBLES POR HITOS — día 3 paga gemas, día 7 regala
     el aspecto exclusivo ESTELAR, y así hasta el día 30. Cada hito se cobra
     UNA vez por racha (si la racha se rompe, se pueden volver a ganar). */
  if(!save.streakClaimed)save.streakClaimed={};
  for(const m of STREAK_MILES){
    if(save.streak<m.d||save.streakClaimed[m.d])continue;
    save.streakClaimed[m.d]=1;
    if(m.skin){
      const sk=SKINS.find(s=>s.id===m.skin);
      if(sk&&!save.skins.owned.includes(m.skin)){
        save.skins.owned.push(m.skin);
        banner('★ RECOMPENSA DE RACHA · DÍA '+m.d,'¡ASPECTO EXCLUSIVO '+sk.name+' desbloqueado en el HANGAR!');
      }else{
        save.gems+=25;save.totGems=(save.totGems||0)+25;
        banner('★ RECOMPENSA DE RACHA · DÍA '+m.d,'+25 gemas (ya tenías el aspecto)');
      }
    }else{
      save.gems+=m.gems;save.totGems=(save.totGems||0)+m.gems;
      banner('★ RECOMPENSA DE RACHA · DÍA '+m.d,'+'+m.gems+' GEMAS por mantener la racha');
    }
    SFX.legend();vib(90);
  }
  checkAch();persist();
}
function missionTick(kind,amt){
  dailyMissionTick(kind,amt); /* v4.12: las diarias comparten los mismos contadores */
  for(const m of run.missions){
    if(m.done)continue;
    const hit=(kind==='kills'&&m.txt.startsWith('Destruye'))||(kind==='gold'&&m.txt.startsWith('Recoge'))||(kind==='elite'&&m.txt.startsWith('Caza'));
    if(!hit)continue;
    m.p=Math.min(m.n,m.p+amt);
    if(m.p>=m.n){
      m.done=true;
      /* v4.15: en co-op (2–3) el premio se reparte: parte del anfitrión
         y parte igual para cada cliente (via wallet de su conexión) */
      if(net.mode==='host'&&players.length>1){
        const np=players.length;
        const host=Math.ceil(m.rw/np),per=Math.floor(m.rw/np);
        save.gold+=host;
        for(const c of net.conns)if(c.open)c.wg=(c.wg||0)+per;
        if(m.gem){save.gems+=m.gem;
          for(const c of net.conns)if(c.open)c.wm=(c.wm||0)+m.gem;}
      }else{
        save.gold+=m.rw;
        if(m.gem)save.gems+=m.gem;
      }
      banner('MISIÓN CUMPLIDA','+'+m.rw+' de oro'+(m.gem?' · +'+m.gem+' gema':''));
      sendMiss();
    }
  }
}

