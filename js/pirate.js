'use strict';
/* ============ v4.31: ☠ EL PIRATA GALÁCTICO ============
   Enemigo raid que CRUZA el mapa robándolo todo. Desde la oleada 3 hay un
   50% de que aparezca en cada oleada (nunca en jefa ni en frenético).
   · Entra por un lateral y avanza LENTO (~38 s en cruzar) como un meteorito.
   · 6 AROS DE DEFENSA giratorios: cada bala golpea primero el aro exterior;
     al romper los 6 queda el NÚCLEO expuesto.
   · CAMPO MAGNÉTICO: aspira oro/gemas/corazones/bidones/cofres que estén
     cerca y cada 5,5 s lanza un PULSO DE VACÍO que arrastra el mapa entero.
     Todo lo robado viaja en su bodega (se ve bajo el casco).
   · ESCOLTA: aparece con 10 naves piratas que se quedan atacando la oleada.
   · MALDICIÓN PIRATA: al poco de entrar desactiva 1 sistema al azar de la
     nave (drones, escudos, orbitales, nova, definitivas, bot, misiles) hasta
     que el pirata caiga o acabe la oleada.
   · ATAQUES en su recorrido: MISIL TELEDIRIGIDO (esquivable; la NOVA y la
     defensa de punto lo destruyen) y LÁSER CORSARIO con línea de aviso.
   · Si lo MATAS: suelta TODO lo robado +40% extra. Si ESCAPA: adiós botín.
   Arquitectura preparada para más enemigos de este estilo (PIRATE_DEFS).
   En co-op lo simula el ANFITRIÓN: el cliente recibe su estado por el
   snapshot (d.pi) y los eventos clave viajan como 'ev'. */
let pirate=null,cPirate=null,pirateSpawnT=-1;
/* variantes futuras del mismo arquetipo (data-driven) */
const PIRATE_DEFS={
  GALACTICO:{name:'EL PIRATA GALÁCTICO',r:30,crossT:38,
    ringM:pl=>1.1+pl*.22,coreM:pl=>2.6+pl*.55},
};
/* sistemas que la MALDICIÓN PIRATA puede apagar (solo si los tienes) */
const SEAL_OPTS=[
  {id:'drones',nm:'DRONES',       has:pl=>pl.drones>0},
  {id:'shield',nm:'ESCUDOS',      has:pl=>!!pl.shield},
  {id:'orbs',  nm:'ORBITALES',    has:pl=>pl.orbs>0},
  {id:'nova',  nm:'NOVA',         has:pl=>!!pl.nova},
  {id:'ult',   nm:'ANIQUILADOR',  has:pl=>!!pl.ult},
  {id:'bh',    nm:'AGUJERO NEGRO',has:pl=>!!pl.bh},
  {id:'bot',   nm:'ALIADO BOT',   has:pl=>pl.bot>0},
  {id:'msl',   nm:'MISILES',      has:pl=>pl.msl>1},
];
function pirSealName(id){const o=SEAL_OPTS.find(x=>x.id===id);return o?o.nm:'UN SISTEMA';}
function pirPct(p){
  let cur=0,max=0;
  for(const r of p.rings){cur+=Math.max(0,r.hp);max+=r.hpMax;}
  cur+=Math.max(0,p.hp);max+=p.hpMax;
  return clamp(cur/max*100,0,100);
}
/* ---------- aparición ---------- */
function spawnPirate(defKey){
  if(pirate||state!=='play')return;
  const D=PIRATE_DEFS[defKey||'GALACTICO'];
  const L=run.level;
  const ringHp=Math.max(30,Math.round(hpForLevel(maxLvlOf(L))*D.ringM(L)));
  const coreHp=Math.max(90,Math.round(hpForLevel(maxLvlOf(L))*D.coreM(L)));
  const dir=Math.random()<.5?1:-1;
  const y0=rand(H*.16,H*.44);
  pirate={kind:'GALACTICO',D,name:D.name,
    x:dir>0?-140:W+140,y:y0,y0,dir,spd:(W+300)/D.crossT,
    t:0,rot:0,flash:0,r:D.r,
    rings:Array.from({length:6},()=>({hp:ringHp,hpMax:ringHp})),
    hp:coreHp,hpMax:coreHp,lootG:0,lootM:0,lootIt:[],stealN:0,
    vacT:2.6,shT:4.5,mslT:rand(6,9),lasT:rand(12,17),las:null,
    curseT:3,flee:false};
  banner('☠ ¡LLEGARON LOS PIRATAS!','Escondan sus pertenencias · roba el botín del sector');
  SFX.pirate();vib(90,true);
  save.seenPir=1;
  /* ESCOLTA: 10 naves piratas que se quedan en la oleada */
  const maxL=maxLvlOf(L),minL=minLvlOf(L);
  for(let i=0;i<10;i++){
    if(enemies.length>=30)break;
    const elvl=clamp(irandR(Math.max(minL,Math.round(maxL*.6)),maxL),minL,maxL);
    let tk=typeForLevel(elvl);if(tk==='mago')tk='dart';
    const e=spawnEnemy(tk,elvl,{after:'roam',delay:.4+i*.5});
    e.sx=pirate.x+rand(-40,40);e.sy=clamp(pirate.y+rand(-30,70),-20,H*.5);
    e.cx=pirate.x+dir*rand(40,170);e.cy=pirate.y+rand(-40,90);
    e.fx=clamp(pirate.x+dir*rand(60,250),30,W-30);e.fy=rand(80,H*.55);
    e.x=e.sx;e.y=e.sy;
    e.escort=true;
  }
}
/* ---------- robo ---------- */
function pirateSteal(q){
  if(q.dead)return;
  q.dead=true;
  if(q.t==='gold')pirate.lootG+=Math.max(1,q.val||1);
  else if(q.t==='gem')pirate.lootM++;
  else pirate.lootIt.push({t:q.t,rar:q.rar});
  pirate.stealN++;
  burst(q.x,q.y,'#B388FF',6,90);
  floater(q.x,q.y-14,'¡ROBADO!','#B388FF',10);
  crewSay('pirSteal');
  tone(500,900,.12,'square',.03);
}
/* ---------- maldición pirata ---------- */
function castPirCurse(forceId){
  if(!pirate||run.pirSeal)return;
  const pool=SEAL_OPTS.filter(o=>players.some(pl=>pl.hp>0&&o.has(pl)));
  if(!pool.length)return;
  const o=forceId?(pool.find(x=>x.id===forceId)||pool[0]):pool[irand(0,pool.length-1)];
  run.pirSeal=o.id;recompute();
  banner('☠ ¡MALDICIÓN PIRATA!','Ha desactivado: '+o.nm+' · hasta que caiga el pirata o acabe la oleada');
  for(const pl of players)if(pl.hp>0)rings.push({x:pl.x,y:pl.y,r:10,R:110,t:0,life:.6,color:'#B388FF'});
  floater(pirate.x,pirate.y-pirate.r-16,'¡MALDICIÓN!','#B388FF',14);
  tone(280,120,.4,'sawtooth',.06);vib(60);
  sendMsg({t:'ev',k:'pirSeal',a:o.id});
}
/* ---------- ataques ---------- */
function pirateMissile(){
  const p=pirate,pl=nearestPlayer(p.x,p.y);
  const a=pl?Math.atan2(pl.y-p.y,pl.x-p.x):Math.PI/2;
  ebullets.push({x:p.x,y:p.y,vx:Math.cos(a)*90,vy:Math.sin(a)*90,r:6,
    color:'#FF7EB6',dead:false,pir:1,life:7.5});
  crewSay('pirMsl');
  tone(900,300,.3,'sawtooth',.05);
  floater(p.x,p.y-p.r-14,'¡MISIL!','#FF7EB6',12);
}
function updPirateLaser(p,dt){
  if(!p.las){
    p.lasT-=dt;
    if(p.lasT<=0){
      p.lasT=rand(17,24);
      const pl=nearestPlayer(p.x,p.y);
      p.las={ph:1,a:pl?Math.atan2(pl.y-p.y,pl.x-p.x):Math.PI/2,t:0};
      crewSay('pirLas');
      tone(200,620,.5,'sine',.04);
    }
    return;
  }
  const L=p.las;L.t+=dt;
  if(L.ph===1){
    const pl=nearestPlayer(p.x,p.y);
    if(pl){
      const des=Math.atan2(pl.y-p.y,pl.x-p.x);
      let dd=des-L.a;while(dd>Math.PI)dd-=TAU;while(dd<-Math.PI)dd+=TAU;
      L.a+=clamp(dd,-1.5*dt,1.5*dt);
    }
    if(L.t>1.15){L.ph=2;L.t=0;SFX.laser();selfQuake(3,12);}
  }else{
    const x2=p.x+Math.cos(L.a)*920,y2=p.y+Math.sin(L.a)*920;
    for(const q of players){
      if(q.hp<=0||q.invul>0)continue;
      if(distToSeg(q.x,q.y,p.x,p.y,x2,y2)<15)hitPlayer(q,1);
    }
    if(L.t>.5)p.las=null;
  }
}
/* ---------- daño ---------- */
function damagePirateRing(dmg,crit,slot){
  const rg=pirate.rings.find(r=>r.hp>0);
  if(!rg){damagePirateCore(dmg,crit,slot);return;}
  rg.hp-=dmg;pirate.flash=1;run.stDmg+=dmg;
  floater(pirate.x+rand(-14,14),pirate.y-pirate.r-10,'-'+Math.round(dmg),'#FF9F43',12);
  if(crit)critPing();
  SFX.hit();
  if(rg.hp<=0){
    const left=pirate.rings.filter(r=>r.hp>0).length;
    rings.push({x:pirate.x,y:pirate.y,r:pirate.r+40,R:150,t:0,life:.4,color:'#FF9F43'});
    hostRing(pirate.x,pirate.y,150,'#FF9F43');
    burst(pirate.x,pirate.y,'#FF9F43',16,180);
    tone(300,90,.25,'sawtooth',.06);vib(50);
    floater(pirate.x,pirate.y-pirate.r-22,'¡ARO DESTRUIDO! ('+(6-left)+'/6)','#FF9F43',13);
    if(left===0){
      floater(pirate.x,pirate.y-pirate.r-36,'¡NÚCLEO EXPUESTO!','#FF4757',15);
      crewSay('pirCore');
      banner('☠ ¡NÚCLEO DEL PIRATA EXPUESTO!','Dispara al casco · recupera todo el botín robado');
    }
  }
}
function damagePirateCore(d,crit,slot){
  if(!pirate)return;
  pirate.hp-=d;pirate.flash=1;run.stDmg+=d;
  if(crit){floater(pirate.x+rand(-16,16),pirate.y-pirate.r-8,'¡'+Math.round(d)+'!','#FFD166',15);critPing();}
  else floater(pirate.x+rand(-14,14),pirate.y-pirate.r-6,'-'+Math.round(d),'#F2EFE6',11);
  SFX.hit();
  if(pirate.hp<=0)killPirate();
}
function killPirate(){
  const p=pirate;pirate=null;
  save.totPirate=(save.totPirate||0)+1;
  burst(p.x,p.y,'#FFD166',34,260);burst(p.x,p.y,'#FF9F43',20,190);burst(p.x,p.y,'#B388FF',14,150);
  rings.push({x:p.x,y:p.y,r:12,R:230,t:0,life:.6,color:'#FFD166'});
  hostRing(p.x,p.y,230,'#FFD166');
  addQuake(8,18);hitStopT=Math.max(hitStopT,.1);vib(110,true);
  tone(500,60,.5,'sawtooth',.1);tone(300,40,.6,'square',.08,.1);
  /* TODO lo robado +40% extra */
  const total=Math.round(p.lootG*1.4);
  const n=clamp(Math.round(total/35),8,24);
  const val=Math.max(2,Math.round(total/n));
  for(let i=0;i<n;i++)
    pickups.push({t:'gold',x:p.x,y:p.y,vx:rand(-190,190),vy:rand(-280,-60),val});
  const gems=(p.lootM||0)+Math.ceil((p.lootM||0)*.4);
  for(let i=0;i<gems;i++)
    pickups.push({t:'gem',x:p.x,y:p.y,vx:rand(-140,140),vy:rand(-250,-60)});
  for(const it of p.lootIt)
    pickups.push({t:it.t,x:p.x,y:p.y,vx:rand(-90,90),vy:rand(-200,-60),rar:it.rar});
  pickups.push({t:'heart',x:p.x,y:p.y,vx:0,vy:-130});
  gainExp(Math.round(waveXp()*7*players[0].expMul));
  banner('☠ ¡PIRATA HUNDIDO!','Botín recuperado +40% · '+total+' oro · '+gems+' gemas');
  crewSay('pirDie');SFX.legend();checkAch();persist();
  if(run.pirSeal){
    run.pirSeal=null;recompute();
    sendMsg({t:'ev',k:'pirSeal',a:null});
    banner('MALDICIÓN PIRATA ROTA','Los sistemas vuelven a la vida');
  }
}
function pirateEscape(){
  const p=pirate;pirate=null;
  save.totPirEsc=(save.totPirEsc||0)+1;
  banner('EL PIRATA ESCAPÓ','Se lleva '+(p.lootG||0)+' oro y '+(p.lootM||0)+' gemas…');
  crewSay('pirEsc');tone(300,80,.5,'sawtooth',.05);
}
/* ---------- bucle (solo anfitrión / solitario) ---------- */
function updPirate(dt){
  if(!pirate){
    if(pirateSpawnT>0){pirateSpawnT-=dt;if(pirateSpawnT<=0)spawnPirate();}
    return;
  }
  const p=pirate;
  p.t+=dt;p.flash=Math.max(0,p.flash-dt*5);p.rot+=dt*1.4;
  /* avance lento de meteorito (o huida rápida si la oleada acabó) */
  p.x+=p.dir*(p.flee?470:p.spd)*dt;
  p.y=p.y0+Math.sin(p.t*.7)*26;
  if(p.x<-170||p.x>W+170){pirateEscape();return;}
  /* imán de robo continuo */
  for(const q of pickups){
    if(q.dead||q.t==='schest'||q.t==='cube'||q.t==='vchest')continue;
    const dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy)||1;
    if(d<300){const f=(1-d/300)*640;q.vx+=dx/d*f*dt;q.vy+=dy/d*f*dt;}
  }
  /* pulso de vacío: arrastra el botín de TODO el mapa hacia él */
  p.vacT-=dt;
  if(p.vacT<=0){
    p.vacT=5.5;
    for(const q of pickups){
      if(q.dead||q.t==='schest'||q.t==='cube'||q.t==='vchest')continue;
      const dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy)||1;
      if(d<560){const f=(1-d/560)*430;q.vx+=dx/d*f;q.vy+=dy/d*f;}
    }
    rings.push({x:p.x,y:p.y,r:12,R:300,t:0,life:.5,color:'#B388FF'});
    hostRing(p.x,p.y,300,'#B388FF');
    SFX.warp();
  }
  /* recogida por contacto → a la bodega */
  for(const q of pickups){
    if(q.dead||q.t==='schest'||q.t==='cube'||q.t==='vchest')continue;
    if(Math.hypot(q.x-p.x,q.y-p.y)<p.r+14)pirateSteal(q);
  }
  /* disparos suaves de defensa */
  p.shT-=dt;
  if(p.shT<=0){
    p.shT=5.2;
    const pl=nearestPlayer(p.x,p.y);
    if(pl){
      const a=Math.atan2(pl.y-p.y,pl.x-p.x),sp=185*players[0].slow;
      for(let i=-1;i<=1;i++)
        ebullets.push({x:p.x,y:p.y,vx:Math.cos(a+i*.13)*sp,vy:Math.sin(a+i*.13)*sp,r:5,color:'#FFD166',dead:false});
      tone(420,180,.1,'square',.03);
    }
  }
  p.mslT-=dt;
  if(p.mslT<=0){p.mslT=rand(11,16);pirateMissile();}
  updPirateLaser(p,dt);
  /* una sola maldición por aparición, a los ~3 s de entrar */
  p.curseT-=dt;
  if(p.curseT<=0){p.curseT=1e9;castPirCurse();}
}
