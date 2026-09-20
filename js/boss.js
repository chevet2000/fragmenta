'use strict';
/* ============ GUARDIÁNES ============ */
const BOSS_DEFS={
 MONOLITO:{name:'MONOLITO',shape:'square',color:'#C8CFD8',
   mech:'3 láseres lentos + abanicos suaves',
   tip:'Quédate entre dos láseres y muévete siguiendo la rotación.',
   hpM:0.8,speed:.45,r:44,easy:true},
 AXIOMA:{name:'AXIOMA',shape:'diamond',color:'#64C7FF',
   mech:'2 clones con vida; disparan igual que el real',
   tip:'Los clones tienen contorno punteado: puedes matarlos o esquivarlos.',
   hpM:0.8,speed:.55,r:44,easy:true},
 OCTAHEDRO:{name:'OCTAHEDRO',shape:'diamond',color:'#FF7EB6',
   mech:'Espiral doble de balas (suave al inicio)',
   tip:'Colócate en el centro, entre los dos brazos de la hélice.',
   hpM:0.85,speed:.45,r:45,easy:true},
 VERTICE:{name:'VÉRTICE',shape:'tri',color:'#FFD166',
   mech:'Abre agujeros negros que arrastran tu nave y el oro',
   tip:'Suelta el oro lejos del agujero; muévete en diagonal contra la succión.',
   hpM:0.95,speed:.65,r:44},
 /* v4.16: EL HECHICERO — el guardián mago. Cura a su legión en área y la
    invoca sin parar: mata a los esbirros rápido o la pelea se hace eterna. */
 HECHICERO:{name:'HECHICERO',shape:'mage',color:'#B388FF',
   mech:'Pulsos arcanos que curan a su legión, legión invocada, resucita esbirros y lanza MALDICIONES',
   tip:'Mátalo pronto: al caer se disipan sus maldiciones (salvo las de varias oleadas). Caza a los resucitados.',
   hpM:1.0,speed:.5,r:46},
 CUATERNIO:{name:'CUATERNIO',shape:'square',color:'#7DFF9E',
   mech:'4-6 escudos hexagonales giran bloqueando tus balas',
   tip:'Rompe los escudos por un lado y dispara por el hueco.',
   hpM:1.1,speed:.5,r:46},
 LEMNISCATA:{name:'LEMNISCATA',shape:'circle',color:'#FF6B6B',
   mech:'Dibuja un 8 infinito; en fase 2 se teletransporta',
   tip:'Memoriza el patrón del ocho; en fase 2, escucha el warp.',
   hpM:0.9,speed:.7,r:42},
 TESIS:{name:'TÉSIS',shape:'hexa',color:'#FF9F43',
   mech:'Acumula 10 orbes en su aura y los suelta en abanico',
   tip:'Rómpelo rápido durante la carga: menos orbes, menos ráfaga.',
   hpM:1.0,speed:.55,r:45},
 SEÑOR:{name:'SEÑOR DE FORMAS',shape:'nonagon',color:'#F2EFE6',
   mech:'Mezcla todos los patrones: el reto definitivo',
   tip:'Guarda la NOVA y la reserva para la fase 2.',
   hpM:1.6,speed:.6,r:52},
};
/* v4.16: BOSS_ORDER con 9 entradas — HECHICERO en el hueco 5: debuta en la
   OL 25 y repite cada 40 oleadas (65, 105, 145…). El índice del jefe viaja en
   el snapshot (BOSS_ORDER.indexOf), así que la rotación previa solo se corre
   un hueco a partir de la OL 25. */
const BOSS_ORDER=['MONOLITO','AXIOMA','OCTAHEDRO','VERTICE','HECHICERO','CUATERNIO','LEMNISCATA','TESIS','SEÑOR'];
function bossForWave(L){
  if(L%50===0)return 'SEÑOR';
  const idx=(Math.floor(L/5)-1)%8;
  return BOSS_ORDER[clamp(idx,0,7)];
}
function spawnBoss(L){
  const key=bossForWave(L);
  const D=BOSS_DEFS[key];
  bossName=D.name+'-'+String(L).padStart(2,'0');
  const hp=Math.round(hpForLevel(maxLvlOf(L))*(4+L*1.2)*D.hpM); /* v4.9: factor compensado al nuevo nivel base ~100 */
  boss={x:W/2,y:-90,ty:Math.max(110,H*.16),hp,maxhp:hp,r:D.r,t:0,ph:1,rot:0,flash:0,
    kind:key,D,burn:null,
    /* v4.14: FASES 3–5 — base 3 fases; 4ª desde oleada 30; 5ª desde oleada 60
       (en frenético: nivel 12+ → 4, nivel 25+ → 5). SEÑOR siempre +1. */
    tier:frenzyMode?(run.level>=25?2:run.level>=12?1:0):(L>=60?2:L>=30?1:0),
    sprT:3,sprT2:0,sum2T:6,ring5T:2.6,
    fanT:2.8,aimT:3.4,sumT:5,ringT:3,
    laT:3.2,clT:4,swT:2.5,swA:0,swDir:0,swT2:0,gnT:3,gxA:0,gyA:0,gnLife:0,shT:4,
    /* v4.16: HECHICERO — timers de pulso arcano (hzT) y de invocación (hsumT)
       v4.17: curseT (maldiciones) · revT (resucitar) · eliteT/eliteDone (élite) */
    hzT:3,hsumT:4,curseT:6,revT:8,eliteT:14,eliteDone:0,memo:[],
    lemTp:0,gatherT:0,gather:null,gatherPhase:0,gatherPhaseT:0,
    clones:[],lasers:[],shields:[]};
  boss.maxPh=D.easy?1:(key==='SEÑOR'?Math.min(5,4+boss.tier):3+boss.tier); /* v4.14: base 3 · 4ª OL30+ · 5ª OL60+ (SEÑOR +1) */
  $('#bossName').textContent=bossName;
  banner('GUARDIÁN: '+D.name,D.mech+(D.easy?' · UNA FASE':' · '+boss.maxPh+' FASES'));
}
function fanAtk(b){
  const n=5+Math.min(6,Math.floor(run.level/3));
  const sp=Math.min(230,(120+run.level*2))*players[0].slow;
  const span=1.5;
  for(let i=0;i<n;i++){
    const a=Math.PI/2-span/2+span*i/(n-1);
    ebullets.push({x:b.x,y:b.y+20,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,color:b.D.color,dead:false});
  }
  tone(400,150,.12,'square',.04);
}
function updBoss(dt){
  if(!boss)return;
  const b=boss;
  const coop=players.length>1&&net.mode==='host';
  const easy=!!b.D.easy;
  b.t+=dt;b.rot+=dt*(0.9+0.22*(b.ph-1));b.flash=Math.max(0,b.flash-dt*5);
  if(b.burn){
    b.hp-=b.burn.dps*dt;
    if(Math.random()<dt*8)parts.push({x:b.x+rand(-b.r,b.r),y:b.y+rand(-b.r,b.r),vx:rand(-20,20),vy:rand(-60,-20),
      rot:0,vr:0,life:.4,t:0,color:'#FF9F43',kind:'tri',size:3});
    if(b.hp<=0){killBoss();return;}
    b.burn.t-=dt;if(b.burn.t<=0)b.burn=null;
  }
  const K=b.kind;
  const isSenor=(K==='SEÑOR');
  const pM=b.ph>2?Math.pow(.87,b.ph-2):1; /* v4.14: temporizadores más cortos por fase */
  if(K!=='LEMNISCATA'){
    b.y+=(b.ty-b.y)*Math.min(1,dt*2);
    b.x=W/2+Math.sin(b.t*(0.5+0.14*(b.ph-1))*b.D.speed*1.6)*(Math.max(60,W*.30-40));
  }
  if(!easy&&b.ph<b.maxPh){
    const cuts=[.55,.30,.12,.05]; /* v4.14: umbral de cada fase siguiente */
    if(b.hp<b.maxhp*cuts[b.ph-1]){
      b.ph++;
      if(b.ph>=5){save.totPhase5=(save.totPhase5||0)+1;checkAch();} /* v4.14 */
      const subs=['El guardián se enfurece','El núcleo se agrieta','Patrones rotos · ¡refuerzos!','DESESPERACIÓN TOTAL'];
      banner('FASE '+b.ph,subs[b.ph-2]||'');
      rings.push({x:b.x,y:b.y,r:10,R:160,t:0,life:.5,color:'#FF4757'});
      hostRing(b.x,b.y,160,'#FF4757');
      SFX.boss();vib(60);
    }
  }
  if(K==='MONOLITO'||isSenor){
    b.laT-=dt;
    const nL=isSenor?6:(easy?3:4);
    if(b.laT<=0){
      b.laT=((easy?(b.ph===2?3.0:3.6):(b.ph===2?2.2:3.0)))*pM;
      const a0=rand(0,TAU);
      const rotSp=easy?.35:(.5+(b.ph===2?.4:0));
      for(let i=0;i<nL;i++)b.lasers.push({a:a0+i*TAU/nL,rot:(Math.random()<.5?1:-1)*rotSp,t:0,life:2.2});
      SFX.laser();
    }
    for(const L of b.lasers){ L.a+=L.rot*dt; L.t+=dt; }
    b.lasers=b.lasers.filter(L=>L.t<L.life);
    for(const L of b.lasers){
      for(const pl of players){
        if(pl.hp<=0||pl.invul>0)continue;
        const pdx=pl.x-b.x,pdy=pl.y-b.y,d=Math.hypot(pdx,pdy);
        if(d<b.r+6)continue;
        const ad=Math.atan2(pdy,pdx);
        const dd=Math.abs(Math.atan2(Math.sin(ad-L.a),Math.cos(ad-L.a)));
        if(dd<(easy?0.065:0.09))hitPlayer(pl,1);
      }
    }
    b.fanT-=dt;
    if(b.fanT<=0){
      b.fanT=((easy?4.2:(b.ph===2?2.2:3.2)))*pM;
      const n=easy?4:(5+Math.min(6,Math.floor(run.level/3)));
      const sp=Math.min(230,(110+run.level*2))*players[0].slow;
      const span=1.5;
      for(let i=0;i<n;i++){
        const a=Math.PI/2-span/2+span*i/(n-1);
        ebullets.push({x:b.x,y:b.y+20,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,color:b.D.color,dead:false});
      }
      tone(400,150,.12,'square',.04);
    }
  }
  if(K==='AXIOMA'||isSenor){
    b.clT-=dt;
    if(b.clT<=0&&b.clones.length===0){
      b.clT=(b.ph===2?4.5:6)*pM;
      const nC=isSenor?3:2;
      for(let i=0;i<nC;i++){
        const ang=rand(0,TAU);
        b.clones.push({x:W/2+Math.cos(ang)*W*.3,y:b.ty+Math.sin(ang)*40,
          hp:Math.round(b.maxhp*.12),maxhp:Math.round(b.maxhp*.12),t:0,wob:rand(0,TAU),ph:rand(0,TAU)});
      }
      banner('CLONES','¡Encuentra al real!');
      SFX.warp();
    }
    for(const c of b.clones){
      c.t+=dt;
      c.x=lerp(c.x,b.x+Math.sin(c.ph+c.t*1.1)*90,Math.min(1,dt*2));
      c.y=lerp(c.y,b.ty+Math.cos(c.ph+c.t*.9)*40,Math.min(1,dt*2));
    }
    b.aimT-=dt;if(b.aimT<=0){
      b.aimT=(b.ph===2?2.4:3.4)*pM;
      const pl=nearestPlayer(b.x,b.y);
      const a=Math.atan2(pl.y-b.y,pl.x-b.x),sp=Math.min(250,(150+run.level*3))*players[0].slow;
      for(let i=-1;i<=1;i++)ebullets.push({x:b.x,y:b.y,vx:Math.cos(a+i*.14)*sp,vy:Math.sin(a+i*.14)*sp,r:5,color:'#64C7FF',dead:false});
    }
  }
  if(K==='OCTAHEDRO'||isSenor){
    b.swT-=dt;
    if(b.swT<=0){
      b.swT=(b.ph===2?2.2:3.0)*pM;
      b.swA=rand(0,TAU);
      b.swDir=(Math.random()<.5?1:-1)*((b.ph===2?.35:.25)*(easy?.7:1));
    }
    if(b.swDir){
      b.swA+=b.swDir*dt*4;
      b.swT2+=dt;
      if(b.swT2>(easy?.13:.09)){
        b.swT2=0;
        const sp=Math.min(200,(100+run.level*2))*players[0].slow;
        for(const off of [0,Math.PI]){
          ebullets.push({x:b.x,y:b.y,vx:Math.cos(b.swA+off)*sp,vy:Math.sin(b.swA+off)*sp,r:5,color:'#FF7EB6',dead:false});
        }
      }
    }
  }
  if(K==='VERTICE'||isSenor){
    b.gnT-=dt;
    if(b.gnT<=0){
      b.gnT=isSenor?6:8;
      b.gxA=rand(80,W-80);b.gyA=rand(90,H*.45);
      b.gnLife=0;
      rings.push({x:b.gxA,y:b.gyA,r:14,R:130,t:0,life:.6,color:'#FFD166'});
      hostRing(b.gxA,b.gyA,130,'#FFD166');
      floater(b.gxA,b.gyA-40,'AGUJERO NEGRO','#FFD166',13);
      SFX.warp();
    }
    if(b.gxA>0){
      b.gnLife+=dt;
      if(b.gnLife>3.5){b.gxA=0;b.gyA=0;}
    }
    if(b.gxA>0){
      for(const pl of players){
        if(pl.hp<=0||pl.invul>0)continue;
        const dx=b.gxA-pl.x,dy=b.gyA-pl.y,d=Math.hypot(dx,dy)||1;
        if(d<230){
          pl.x+=dx/d*90*dt*(1-d/230);
          pl.y+=dy/d*90*dt*(1-d/230);
        }
      }
      for(const p of pickups){
        const dx=b.gxA-p.x,dy=b.gyA-p.y,d=Math.hypot(dx,dy)||1;
        if(d<200){p.vx+=dx/d*200*dt;p.vy+=dy/d*200*dt;}
      }
    }
  }
  if(K==='CUATERNIO'||isSenor){
    b.shT-=dt;
    if(b.shT<=0&&b.shields.length===0){
      b.shT=b.ph===2?7:9;
      const nS=isSenor?6:4;
      for(let i=0;i<nS;i++)b.shields.push({a:i*TAU/nS,rot:.9,hp:3+Math.floor(run.level/4)});
      banner('ESCUDOS','¡Destruye la guardia!');
      tone(200,500,.3,'square',.05);
    }
    for(const s of b.shields){ s.a+=s.rot*dt; }
  }
  if(K==='LEMNISCATA'){
    const tt=b.t*.7;
    b.x=W/2+Math.sin(tt)*W*.33;
    b.y=b.ty+Math.sin(tt*2)*H*.12;
    if(b.ph===2){
      b.lemTp+=dt;
      if(b.lemTp>2.5*pM){
        b.lemTp=0;
        rings.push({x:b.x,y:b.y,r:b.r,R:80,t:0,life:.3,color:'#FF6B6B'});
        hostRing(b.x,b.y,80,'#FF6B6B');
        b.x=rand(80,W-80);b.y=rand(90,H*.4);
        rings.push({x:b.x,y:b.y,r:10,R:70,t:0,life:.3,color:'#FF6B6B'});
        SFX.warp();
      }
    }
    b.fanT-=dt;if(b.fanT<=0){b.fanT=(b.ph===2?1.6:2.2)*pM;fanAtk(b);}
    b.aimT-=dt;if(b.aimT<=0){
      b.aimT=(b.ph===2?2.0:2.8)*pM;
      const pl=nearestPlayer(b.x,b.y);
      const a=Math.atan2(pl.y-b.y,pl.x-b.x),sp=Math.min(250,(150+run.level*3))*players[0].slow;
      ebullets.push({x:b.x,y:b.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,color:'#FF6B6B',dead:false});
    }
  }
  if(K==='TESIS'||isSenor){
    b.gatherT+=dt;
    if(b.gatherT>4*pM&&!b.gather){
      b.gatherT=0;
      b.gather=[];
      const nG=isSenor?14:10;
      for(let i=0;i<nG;i++)b.gather.push({a:i*TAU/nG,d:b.r+18});
      b.gatherPhase=0;b.gatherPhaseT=0;
      tone(300,600,.4,'sine',.05);
    }
    if(b.gather){
      if(b.gatherPhase===0){b.gatherPhase=1;b.gatherPhaseT=0;}
      else if(b.gatherPhase===1){
        b.gatherPhaseT+=dt;
        if(b.gatherPhaseT>1.2){
          b.gatherPhase=2;b.gatherPhaseT=0;
          const n=b.gather.length;
          const pl=nearestPlayer(b.x,b.y);
          const a0=Math.atan2(pl.y-b.y,pl.x-b.x);
          for(let i=0;i<n;i++){
            const a=a0+(i-n/2)*.09;
            const sp=Math.min(260,(140+run.level*3))*players[0].slow;
            ebullets.push({x:b.x,y:b.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,color:'#FF9F43',dead:false});
          }
          tone(600,200,.3,'sawtooth',.05);
        }
      }else{
        b.gatherPhaseT+=dt;
        if(b.gatherPhaseT>.8)b.gather=null;
      }
    }
    b.ringT-=dt;if(b.ringT<=0){b.ringT=(b.ph===2?3.0:4.2)*pM;
      const n=10+Math.min(6,Math.floor(run.level/4)),sp=100*players[0].slow;
      for(let i=0;i<n;i++){const a=TAU*i/n+b.rot;
        ebullets.push({x:b.x,y:b.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,color:'#FF9F43',dead:false});}}
  }
  if(!(K==='MONOLITO'||K==='AXIOMA'||K==='OCTAHEDRO'||K==='VERTICE'||K==='CUATERNIO'||K==='LEMNISCATA'||K==='TESIS'||K==='HECHICERO'||isSenor)){
    b.fanT-=dt;if(b.fanT<=0){b.fanT=(b.ph===2?1.7:2.5)*pM;fanAtk(b);}
  }
  if(K==='HECHICERO'){
    /* ráfaga dirigida de runas */
    b.aimT-=dt;if(b.aimT<=0){
      b.aimT=(b.ph===2?2.6:3.2)*pM;
      const pl=nearestPlayer(b.x,b.y);
      const a=Math.atan2(pl.y-b.y,pl.x-b.x),sp=Math.min(240,(140+run.level*3))*players[0].slow;
      for(let i=-1;i<=1;i++)ebullets.push({x:b.x,y:b.y,vx:Math.cos(a+i*.15)*sp,vy:Math.sin(a+i*.15)*sp,r:5,color:'#B388FF',dead:false});
      tone(520,260,.1,'sine',.04);
    }
    /* anillo de runas lento */
    b.ringT-=dt;if(b.ringT<=0){
      b.ringT=(b.ph===2?3.4:4.4)*pM;
      const n=8+Math.min(6,Math.floor(run.level/5)),sp=95*players[0].slow;
      for(let i=0;i<n;i++){const a=TAU*i/n+b.rot;
        ebullets.push({x:b.x,y:b.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,color:'#B388FF',dead:false});}
      tone(300,180,.2,'sine',.045);
    }
    /* PULSO ARCANO DEL JEFE: cura hasta N aliados heridos (radio 210).
       N crece con la FASE y con el nivel de la partida — a más nivel, más
       aliados cura a la vez (petición del piloto). */
    b.hzT-=dt;
    if(b.hzT<=0){b.hzT=3.8*pM;mageBossHeal(b);}
    /* ESBIRROS: invoca 2 (fase 1) o 3 (fase 2+) mientras haya hueco */
    b.hsumT-=dt;
    if(b.hsumT<=0){
      b.hsumT=(b.ph>=3?4.5:5.5)*pM;
      if(enemies.length<26){
        const k=b.ph>=2?3:2,minL=minLvlOf(run.level),maxL=maxLvlOf(run.level);
        for(let i=0;i<k;i++){
          const elvl=clamp(irand(Math.round(maxL*.5),maxL),minL,maxL);
          let tk=typeForLevel(elvl);if(tk==='mago')tk='orb';
          const e=spawnEnemy(tk,elvl,{after:'roam',delay:i*.2});
          e.sx=b.x+rand(-40,40);e.sy=b.y+20;e.x=e.sx;e.y=e.sy;
          e.cx=b.x+rand(-90,90);e.cy=b.y+80;
          e.fx=clamp(b.x+rand(-140,140),30,W-30);e.fy=rand(90,H*.45);
        }
        floater(b.x,b.y-b.r-16,'¡ESBIRROS!','#B388FF',13);
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
  }
  if(isSenor){
    b.sumT-=dt;
    if(b.sumT<=0){
      b.sumT=6*pM;
      if(enemies.length<30){
        const k=irand(2,3),minL=minLvlOf(run.level),maxL=maxLvlOf(run.level);
        for(let i=0;i<k;i++){
          const elvl=clamp(irand(Math.round(maxL*.5),maxL),minL,maxL);
          const e=spawnEnemy(typeForLevel(elvl),elvl,{after:'roam',delay:i*.25});
          e.sx=b.x+rand(-30,30);e.sy=b.y+20;
          e.cx=b.x+rand(-60,60);e.cy=b.y+60;
          e.fx=clamp(b.x+rand(-80,80),30,W-30);e.fy=rand(90,H*.45);
          e.x=e.sx;e.y=e.sy;
        }
        floater(b.x,b.y-b.r-14,'¡LEGIÓN!','#F2EFE6',12);
      }
    }
  }
  /* ===== v4.14: ataques nuevos de las FASES 3–5 (todos los guardianes no fáciles) ===== */
  if(!easy){
    if(b.ph>=3){ /* FASE 3: espiral doble roja continua */
      b.sprT-=dt;
      if(b.sprT<=0){b.sprT=3.2;b.sprA=rand(0,TAU);b.sprDir=(Math.random()<.5?1:-1);}
      b.sprA+=b.sprDir*dt*2.4;
      b.sprT2-=dt;
      if(b.sprT2<=0){
        b.sprT2=.13;
        const sp=Math.min(215,(95+run.level*2))*players[0].slow;
        for(const off of [0,Math.PI])
          ebullets.push({x:b.x,y:b.y,vx:Math.cos(b.sprA+off)*sp,vy:Math.sin(b.sprA+off)*sp,r:5,color:'#FF4757',dead:false});
      }
    }
    if(b.ph>=4){ /* FASE 4: invoca refuerzos */
      b.sum2T-=dt;
      if(b.sum2T<=0){
        b.sum2T=7;
        if(enemies.length<36){
          const minL=minLvlOf(run.level),maxL=maxLvlOf(run.level);
          for(let i=0;i<2;i++){
            const elvl=clamp(irand(Math.round(maxL*.6),maxL),minL,maxL);
            const e=spawnEnemy(typeForLevel(elvl),elvl,{after:'roam',delay:i*.2});
            e.sx=b.x+rand(-40,40);e.sy=b.y+10;e.x=e.sx;e.y=e.sy;
            e.cx=b.x+rand(-80,80);e.cy=b.y+70;
            e.fx=clamp(b.x+rand(-120,120),30,W-30);e.fy=rand(90,H*.45);
          }
          floater(b.x,b.y-b.r-16,'¡REFUERZOS!','#FF4757',13);
          SFX.warp();
        }
      }
    }
    if(b.ph>=5){ /* FASE 5: anillos de desesperación */
      b.ring5T-=dt;
      if(b.ring5T<=0){
        b.ring5T=2.6;
        const n=12,sp=150*players[0].slow;
        for(let i=0;i<n;i++){const a=TAU*i/n+b.rot;
          ebullets.push({x:b.x,y:b.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,color:'#FF4757',dead:false});}
        tone(300,120,.25,'sawtooth',.05);
      }
    }
  }
  if(players.some(pl=>pl.vortex)){
    for(const e of enemies){
      if(e.dead||e.state==='kam')continue;
      for(const pl of players){
        if(pl.hp<=0)continue;
        const dx=pl.x-e.x,dy=(pl.y-60)-e.y,d=Math.hypot(dx,dy)||1;
        if(d<180){e.x+=dx/d*30*dt;e.y+=dy/d*30*dt;}
      }
    }
  }
}
function updEBullets(dt){
  /* v4.8: tope de balas enemigas simultáneas (anti-lag en oleadas extremas) */
  if(ebullets.length>320)ebullets.splice(0,ebullets.length-320);
  for(const b of ebullets){
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.x<-20||b.x>W+20||b.y<-30||b.y>H+30){b.dead=true;continue;}
    let consumed=false;
    for(const pl of players){
      if(pl.hp<=0)continue;
      if(pl.pointDef&&Math.hypot(b.x-pl.x,b.y-pl.y)<90){
        b.dead=true;burst(b.x,b.y,'#64C7FF',2,60);consumed=true;break;
      }
      if(pl.wind&&pl.wind.bul&&Math.hypot(b.x-pl.x,b.y-pl.y)<80){
        b.dead=true;burst(b.x,b.y,'#B0E8FF',3,70);consumed=true;break;
      }
    }
    if(consumed)continue;
    for(const pl of players){
      if(pl.hp<=0)continue;
      if(Math.hypot(b.x-pl.x,b.y-pl.y)<b.r+9){b.dead=true;hitPlayer(pl,1);break;}
    }
  }
  ebullets=ebullets.filter(b=>!b.dead);
}
function updBullets(dt){
  for(const b of bullets){
    if(b.missile){
      b.life-=dt;if(b.life<=0){b.dead=true;continue;}
      let t=null;
      if(boss)t=boss;
      else for(const e of enemies){if(e.dead)continue;if(!t||e.elvl>t.elvl)t=e;}
      if(t){
        const cur=Math.atan2(b.vy,b.vx),des=Math.atan2(t.y-b.y,t.x-b.x);
        let dd=des-cur;while(dd>Math.PI)dd-=TAU;while(dd<-Math.PI)dd+=TAU;
        const na=cur+clamp(dd,-4.2*dt,4.2*dt);
        b.vx=Math.cos(na)*340;b.vy=Math.sin(na)*340;
      }
    }
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(b.y<-30||b.x<-40||b.x>W+40||b.y>H+40){b.dead=true;continue;}
    for(const e of enemies){
      if(e.dead||b.dead)continue;
      const rr=e.r+b.r;
      if((b.x-e.x)**2+(b.y-e.y)**2<rr*rr){
        if(b.hits.includes(e.id))continue;
        b.hits.push(e.id);
        if(b.hits.length===1)run.stHits++;
        const willDie=b.hits.length>b.pierce;
        const shooter=players[b.slot]||players[0];
        if(willDie&&e.T.reflects&&e.refCD<=0){
          e.refCD=.3;
          const pl=nearestPlayer(e.x,e.y);
          const a=pl?Math.atan2(pl.y-e.y,pl.x-e.x):Math.PI/2;
          const sp=190*players[0].slow;
          ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:4.5,color:'#B0F2FF',dead:false});
          floater(e.x,e.y-e.r-8,'↺','#B0F2FF',13);
          tone(900,400,.08,'square',.03);
        }
        damageEnemy(e,b.dmg,b.crit,b.slot);
        if(b.hits.length===1&&shooter)elementProcs(e,shooter);
        if(willDie){
          if(b.heavy&&shooter.ojiva){
            rings.push({x:b.x,y:b.y,r:6,R:55,t:0,life:.3,color:'#FFD166'});
            hostRing(b.x,b.y,55,'#FFD166');
            for(const o of enemies)if(!o.dead&&o!==e&&Math.hypot(o.x-b.x,o.y-b.y)<55)damageEnemy(o,Math.max(1,Math.round(b.dmg*.5)),false,b.slot);
          }
          if(b.bounce>0){
            let t=null,bd=300;
            for(const o of enemies){if(o.dead||b.hits.includes(o.id))continue;
              const d=Math.hypot(o.x-b.x,o.y-b.y);if(d<bd){bd=d;t=o;}}
            if(t){b.bounce--;const sp=Math.hypot(b.vx,b.vy),a=Math.atan2(t.y-b.y,t.x-b.x);
              b.vx=Math.cos(a)*sp;b.vy=Math.sin(a)*sp;continue;}
          }
          b.dead=true;
        }
      }
    }
    if(!b.dead){
      for(const p of pickups){
        if(p.t!=='schest')continue;
        if(Math.hypot(b.x-p.x,b.y-p.y)<24+b.r){
          b.dead=true;
          p.shield-=b.dmg;
          burst(p.x+rand(-8,8),p.y+rand(-8,8),'#64C7FF',3,70);
          floater(p.x,p.y-30,'-'+b.dmg,'#64C7FF',10);
          tone(760,520,.05,'sine',.02);
          if(p.shield<=0){
            p.t='chest';
            rings.push({x:p.x,y:p.y,r:10,R:86,t:0,life:.5,color:'#64C7FF'});
            hostRing(p.x,p.y,86,'#64C7FF');
            floater(p.x,p.y-42,'¡ESCUDO ROTO!','#64C7FF',13);
            tone(200,900,.3,'sine',.06);
            vib(40);
          }
          break;
        }
      }
    }
    if(!b.dead&&boss&&!b.hits.includes('B')){
      let blocked=false;
      if(boss.shields&&boss.shields.length){
        for(const s of boss.shields){
          const sx=boss.x+Math.cos(s.a)*(boss.r+30),sy=boss.y+Math.sin(s.a)*(boss.r+30);
          if(Math.hypot(b.x-sx,b.y-sy)<24+b.r){
            s.hp-=1;b.dead=true;
            burst(sx,sy,'#7DFF9E',4,80);
            if(s.hp<=0){
              burst(sx,sy,'#7DFF9E',12,140);
              floater(sx,sy,'ESCUDO ROTO','#7DFF9E',11);
            }
            boss.shields=boss.shields.filter(q=>q.hp>0);
            blocked=true;break;
          }
        }
      }
      if(blocked)continue;
      const rr=boss.r+b.r;
      if((b.x-boss.x)**2+(b.y-boss.y)**2<rr*rr){
        b.hits.push('B');damageBoss(b.dmg,b.crit,b.slot);
        const shooter=players[b.slot]||players[0];
        /* v4.8: si este disparo mató al Guardián, boss ya es null — comprobar antes de quemar */
        if(boss&&shooter&&shooter.fire&&Math.random()<shooter.fire.ch){
          boss.burn={dps:shooter.fire.dps,t:shooter.fire.dur};
          floater(boss.x,boss.y-boss.r-10,'🔥','#FF9F43',12);
        }
        if(b.hits.length>b.pierce){
          if(b.bounce>0){
            let t=null,bd=300;
            for(const o of enemies){if(o.dead||b.hits.includes(o.id))continue;
              const d=Math.hypot(o.x-b.x,o.y-b.y);if(d<bd){bd=d;t=o;}}
            if(t){b.bounce--;const sp=Math.hypot(b.vx,b.vy),a=Math.atan2(t.y-b.y,t.x-b.x);
              b.vx=Math.cos(a)*sp;b.vy=Math.sin(a)*sp;}
            else b.dead=true;
          }else b.dead=true;
        }
      }
    }
    if(!b.dead&&boss&&boss.clones&&boss.clones.length){
      for(const c of boss.clones){
        if(c.hp<=0)continue;
        if(Math.hypot(b.x-c.x,b.y-c.y)<28+b.r){
          b.dead=true;c.hp-=b.dmg;
          floater(c.x,c.y-34,'-'+b.dmg,'#64C7FF',11);
          if(c.hp<=0){
            burst(c.x,c.y,'#64C7FF',16,150);
            rings.push({x:c.x,y:c.y,r:8,R:60,t:0,life:.35,color:'#64C7FF'});
            floater(c.x,c.y,'CLON DESTRUIDO','#64C7FF',12);
          }
          break;
        }
      }
    }
  }
  bullets=bullets.filter(b=>!b.dead);
  if(boss&&boss.clones)boss.clones=boss.clones.filter(c=>c.hp>0);
}
function passive(e,dt){
  if(e.y<30||e.y>H-90)return;
  if(e.T.shoots){e.shootT-=dt;
    if(e.shootT<=0){e.shootT=Math.max(1.6,rand(2.4,4.6)-run.level*.04);eShoot(e,run.level>=12?2:1);}}
  if(e.T.heals){e.healT-=dt;if(e.healT<=0){e.healT=3.6;healPulse(e);}}
  /* v4.16: el MAGO — pulso arcano + invocación de esbirros */
  if(e.T.mage){
    e.healT-=dt;if(e.healT<=0){e.healT=4.2;mageHeal(e);}
    e.sumT-=dt;if(e.sumT<=0){e.sumT=8;mageSummon(e);}
    /* v4.17: desde nv 128 el mago RESUCITA a un esbirro caído cerca de él */
    if(e.elvl>=128){e.revT+=dt;
      if(e.revT>=13){e.revT=-rand(0,4);mageRevive(e);}}
  }
}
function updEnemies(dt){
  formT+=dt;
  formY=Math.min(formY+dt*4,H*.18);
  const offX=Math.sin(formT*.7)*(18+Math.min(24,run.level*1.2));
  let divers=0;for(const e of enemies)if(e.state==='dive')divers++;
  const maxDivers=(1+Math.floor(run.level/3))*(players.length>1?1.5:1);
  for(const sn of wave.snakes)sn.s+=sn.spd*dt;
  /* viento: repele alrededor de cada nave con afinidad de viento */
  for(const pl of players){
    if(pl.hp<=0||!pl.wind)continue;
    for(const e of enemies){
      if(e.dead||e.frozen>0)continue;
      const dx=e.x-pl.x,dy=e.y-pl.y,d=Math.hypot(dx,dy)||1;
      if(d<pl.wind.rad&&d>1){
        const f=pl.wind.force*(1-d/pl.wind.rad);
        e.x+=dx/d*f*dt;e.y+=dy/d*f*dt;
        if(pl.wind.dmg)damageEnemy(e,pl.wind.dmg*dt,false,pl.slot);
      }
    }
  }
  for(const e of enemies){
    if(e.dead)continue;
    e.flash=Math.max(0,e.flash-dt*5);
    e.refCD=Math.max(0,e.refCD-dt);
    /* quemadura */
    if(e.burn){
      e.burn.t-=dt;
      e.hp-=e.burn.dps*dt;
      if(Math.random()<dt*10)parts.push({x:e.x+rand(-e.r,e.r),y:e.y+rand(-e.r,e.r),vx:rand(-15,15),vy:rand(-60,-20),
        rot:0,vr:0,life:.4,t:0,color:'#FF9F43',kind:'tri',size:2.5});
      if(e.hp<=0){
        if(e.burn.boom){
          rings.push({x:e.x,y:e.y,r:6,R:60,t:0,life:.3,color:'#FF9F43'});
          hostRing(e.x,e.y,60,'#FF9F43');
          for(const o of enemies)if(!o.dead&&o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<60)damageEnemy(o,Math.max(2,Math.round(e.burn.dps*1.5)),false,e.burn.slot);
        }
        killEnemy(e,e.burn.slot);
        continue;
      }
      if(e.burn.t<=0)e.burn=null;
    }
    /* congelado o aturdido: no se mueve ni dispara */
    if(e.frozen>0){
      e.frozen-=dt;
      continue;
    }
    if(e.shockT>0){
      e.shockT-=dt;
      continue;
    }
    let sk=1;
    if(players.some(pl=>pl.slowField&&pl.hp>0&&Math.hypot(e.x-pl.x,e.y-pl.y)<140))sk=.65;
    if(e.state==='kam'){
      const pl=nearestPlayer(e.x,e.y);
      e.kamT+=dt;e.kamV+=dt*260;
      const a=pl?Math.atan2(pl.y-e.y,pl.x-e.x):Math.PI/2;
      e.x+=Math.cos(a)*e.kamV*dt;
      e.y+=Math.sin(a)*e.kamV*dt;
      if(Math.random()<dt*20)parts.push({x:e.x,y:e.y,vx:rand(-20,20),vy:rand(-20,20),
        rot:0,vr:0,life:.3,t:0,color:'#FF4757',kind:'line',size:3});
      if(pl&&Math.hypot(pl.x-e.x,pl.y-e.y)<e.r+12){kamiExplode(e,true);continue;}
      if(e.kamT>4.5||e.x<-50||e.x>W+50||e.y>H+50||e.y<-80){kamiExplode(e,true);continue;}
      continue;
    }
    if(e.T.kami&&e.state!=='enter'){
      e.kamArm-=dt;
      if(e.kamArm<=0){e.state='kam';e.kamT=0;e.kamV=70;continue;}
    }
    if(e.state==='enter'){
      if(e.delay>0){e.delay-=dt;continue;}
      e.t+=dt*1.3;
      const k=easeOut(clamp(e.t,0,1));
      const ex=e.after==='form'?e.fx+offX:e.fx,ey=e.after==='form'?e.fy+formY:e.fy;
      const p=qbez(e.sx,e.sy,e.cx,e.cy,ex,ey,k);
      e.x=p.x;e.y=p.y;
      if(e.t>=1){
        if(e.after==='form')e.state='form';
        else if(e.after==='drift')e.state='drift';
        else{e.state='roam';pickRoamTarget(e);}
      }
    }else if(e.state==='form'){
      e.x=e.fx+offX+(e.tk==='dash'?Math.sin(formT*2.2+e.wob)*22:0);
      e.y=e.fy+formY+Math.sin(formT*1.3+e.wob)*4;
      e.diveT-=dt;
      if(e.diveT<=0&&divers<maxDivers&&!e.elite&&!e.T.kami&&!e.T.mage){startDive(e);divers++;}
      passive(e,dt);
    }else if(e.state==='roam'){
      e.rt-=dt;
      const spd=(34+run.level*1.2)*e.T.spd*sk;
      const dx=e.tx-e.x,dy=e.ty-e.y,d=Math.hypot(dx,dy)||1;
      if(d<12||e.rt<=0)pickRoamTarget(e);
      else{e.x+=dx/d*spd*dt;e.y+=dy/d*spd*dt;}
      if(e.camp)camperAI(e,dt);
      if(e.elite){
        e.sumT-=dt;
        if(e.sumT<=0&&enemies.length<30){
          e.sumT=5;
          const k=irand(2,3),minL=minLvlOf(run.level),maxL=maxLvlOf(run.level);
          for(let i=0;i<k;i++){
            const elvl=clamp(irand(minL,Math.round(maxL*.7)),minL,maxL);
            const c=spawnEnemy(typeForLevel(elvl),elvl,{after:'roam',delay:i*.2});
            c.sx=e.x+rand(-20,20);c.sy=e.y+rand(-10,10);
            c.cx=e.x+rand(-80,80);c.cy=e.y+rand(20,70);
            c.fx=clamp(e.x+rand(-100,100),30,W-30);c.fy=rand(80,H*.5);
            c.x=c.sx;c.y=c.sy;
          }
          floater(e.x,e.y-e.r-12,'¡REFUERZOS!','#B388FF',12);
          tone(300,120,.2,'square',.04);
        }
      }
      e.diveT-=dt;
      if(e.diveT<=0&&divers<maxDivers&&!e.elite&&!e.T.kami&&!e.camp&&!e.T.mage){startDive(e);divers++;}
      passive(e,dt);
    }else if(e.state==='dive'){
      e.ds+=dt*e.diveSpd*sk;
      const k=clamp(e.ds,0,1);
      const p=qbez(e.sx,e.sy,e.cx,e.cy,e.tx,e.ty,k);
      e.x=p.x+(e.tk==='dash'?Math.sin(k*14+e.wob)*26:0);
      e.y=p.y;
      if(e.T.shoots){e.shootT-=dt;if(e.shootT<=0){e.shootT=rand(1.4,2.6);eShoot(e,1);}}
      if(k>=1||e.y>H+60){
        e.state='enter';e.t=0;e.delay=0;e.ds=0;
        e.sx=rand(30,W-30);e.sy=-40;
        e.cx=e.sx+rand(-60,60);e.cy=H*.2;
        if(e.after!=='form'){e.fx=rand(40,W-40);e.fy=rand(70,H*.5);}
        e.diveT=rand(5,10);
      }
    }else if(e.state==='drift'){
      e.y+=e.dvy*dt*sk;
      e.x+=Math.sin(time*1.6+e.wob)*46*dt;
      if(e.x<14)e.x=14;if(e.x>W-14)e.x=W-14;
      if(e.y>H+34){e.y=-30;e.x=rand(26,W-26);}
      passive(e,dt);
    }else if(e.state==='snake'){
      const sn=wave.snakes[e.snake];
      if(!sn){e.state='roam';pickRoamTarget(e);}
      else if(e.inDelay>0){e.inDelay-=dt;e.x=e.sx;e.y=e.sy;}
      else{
        const s=sn.s-e.snIdx*.17;
        const p=snakePos(sn,s);
        if(e.inT<1){
          e.inT=Math.min(1,e.inT+dt/.8);
          const k=easeOut(e.inT);
          e.x=lerp(e.sx,p.x,k);e.y=lerp(e.sy,p.y,k);
        }else{e.x=p.x+Math.sin(time*2.2+e.wob)*3;e.y=p.y;}
        passive(e,dt);
      }
    }
  }
  for(const e of enemies){
    if(e.dead||!e.T.magnet||e.state==='enter')continue;
    for(const p of pickups){
      const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy)||1;
      if(d<160&&d>1){
        const f=(1-d/160)*520;
        p.vx+=dx/d*f*dt;p.vy+=dy/d*f*dt;
      }
    }
  }
  enemies=enemies.filter(e=>!e.dead);
}
function eShoot(e,n){
  n=n||1;
  const pl=nearestPlayer(e.x,e.y);
  const base=Math.atan2(pl.y-e.y,pl.x-e.x);
  const sp=Math.min(240,(110+run.level*3))*players[0].slow;
  for(let i=0;i<n;i++){
    const a=base+(i-(n-1)/2)*.22;
    ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,color:e.T.color,dead:false});
  }
  tone(500,240,.07,'square',.02);
}
function healPulse(e){
  rings.push({x:e.x,y:e.y,r:10,R:95,t:0,life:.5,color:'#7DFF9E'});
  hostRing(e.x,e.y,95,'#7DFF9E');
  const amt=Math.max(2,Math.round(e.maxhp*.08));
  for(const o of enemies){if(!o.dead&&o!==e&&o.hp<o.maxhp&&Math.hypot(o.x-e.x,o.y-e.y)<95){
    o.hp=Math.min(o.maxhp,o.hp+amt);floater(o.x,o.y-o.r-6,'+','#7DFF9E',11);}}
  if(e.hp<e.maxhp)e.hp=Math.min(e.maxhp,e.hp+amt);
}
/* v4.16: PULSO ARCANO DEL HECHICERO — cura hasta N aliados heridos en radio
   210. N = 2 en fase 1, +1 por fase y +1 más cada 25 niveles de partida
   (tope 6): cuanto más alto el nivel, más aliados cura a la vez. Cada curado
   recupera 4% de SU vida máxima. Si no hay heridos cerca, se cura él 1%. */
function mageBossHeal(b){
  const R2=210;
  const N=clamp(2+(b.ph-1)+Math.floor(run.level/25),2,6);
  const heridos=enemies.filter(e=>!e.dead&&e.hp<e.maxhp&&Math.hypot(e.x-b.x,e.y-b.y)<R2)
    .sort((a,c)=>(a.hp/a.maxhp)-(c.hp/c.maxhp));
  const targets=heridos.slice(0,N);
  rings.push({x:b.x,y:b.y,r:14,R:R2,t:0,life:.65,color:'#B388FF'});
  hostRing(b.x,b.y,R2,'#B388FF');
  tone(660,990,.3,'sine',.045);
  for(const e of targets){
    const amt=Math.max(2,Math.round(e.maxhp*.04));
    e.hp=Math.min(e.maxhp,e.hp+amt);
    floater(e.x,e.y-e.r-8,'+','#7DFF9E',13);
  }
  if(!targets.length&&b.hp<b.maxhp){
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
    c.hp=Math.max(1,Math.round(c.maxhp*.6)); /* 60% de su vida MÁXIMA (la max se conserva) */
    c.revived=true;n++;
    rings.push({x:c.sx,y:c.sy,r:6,R:66,t:0,life:.5,color:'#B388FF'});
  }
  if(n){floater(b.x,b.y-b.r-16,'¡RESUCITA!','#B388FF',13);tone(240,540,.3,'sine',.05);}
}
function updCollisions(){
  for(const e of enemies){
    if(e.dead)continue;
    for(const pl of players){
      if(pl.hp<=0)continue;
      if(Math.hypot(e.x-pl.x,e.y-pl.y)<e.r+10){
        if(e.T.kami)kamiExplode(e,true);
        else killEnemy(e,pl.slot);
        hitPlayer(pl,1);break;
      }
    }
  }
  if(boss)for(const pl of players){
    if(pl.hp<=0)continue;
    if(Math.hypot(boss.x-pl.x,boss.y-pl.y)<boss.r+10)hitPlayer(pl,2);
  }
}
function updPickups(dt){
  for(const p of pickups){
    p.vy=Math.min(p.t==='minichest'?50:p.t==='schest'?26:p.t==='chest'?40:70,p.vy+150*dt);p.vx*=.99;
    const pl=nearestPlayer(p.x,p.y);
    const dx=pl.x-p.x,dy=pl.y-p.y,d=Math.hypot(dx,dy)||1;
    const R2=70*pl.magnet;
    if(d<R2&&p.t!=='schest'){const f=(1-d/R2)*1100;p.vx+=dx/d*f*dt;p.vy+=dy/d*f*dt;}
    p.x+=p.vx*dt;p.y+=p.vy*dt;
    if(d<24&&p.t!=='schest'){
      p.dead=true;
      /* v4.15: el botín va a la billetera del piloto que lo recoge (slot>0 = cliente) */
      const remote=pl.slot>0&&net.mode==='host';
      if(p.t==='gold'){
        const gv=Math.max(1,Math.round(p.val*curseGoldMul())); /* v4.17: MISERIA */
        if(remote)walletGold(pl.slot,gv);else save.gold+=gv;
        run.goldRun+=gv;save.totGold=(save.totGold||0)+gv;
        missionTick('gold',gv);SFX.coin();
      }else if(p.t==='gem'){
        if(remote)walletGems(pl.slot,1);else save.gems++;
        run.gemsRun++;save.totGems=(save.totGems||0)+1;
        SFX.gem();floater(pl.x,pl.y-26,'+1 GEMA','#64C7FF',11);
      }else if(p.t==='chest'){
        openChest(pl.slot,p.kind);
      }else if(p.t==='lchest'){
        /* v4.18: cofre de la Fortuna — recompensa instantánea según rareza */
        openLucky(pl.slot,p.rar,remote);
      }else if(p.t==='minichest'){
        SFX.chest();
        if(R()<.6){
          const v=Math.max(1,Math.round((80+run.level*10)*players[0].goldMul*curseGoldMul())); /* v4.17: MISERIA */
          if(remote)walletGold(pl.slot,v);else save.gold+=v;
          run.goldRun+=v;save.totGold=(save.totGold||0)+v;
          banner('COFRE PEQUEÑO','+'+v+' DE ORO');
        }else{
          const v=2;
          if(remote)walletGems(pl.slot,v);else save.gems+=v;
          run.gemsRun+=v;save.totGems=(save.totGems||0)+v;
          banner('COFRE PEQUEÑO','+'+v+' GEMAS');
        }
        persist();
      }else{
        pl.hp=Math.min(pl.maxHp,pl.hp+1);SFX.gem();
        floater(pl.x,pl.y-26,'+1 VIDA','#FF6B6B',12);
      }
    }
    if(p.y>H+30)p.dead=true;
  }
  pickups=pickups.filter(p=>!p.dead);
}
function updFx(dt){
  for(const p of parts){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=140*dt;p.rot+=p.vr*dt;}
  parts=parts.filter(p=>p.t<p.life);
  for(const f of floats){f.t+=dt;f.y-=32*dt;}
  floats=floats.filter(f=>f.t<f.life);
  for(const r of rings)r.t+=dt;
  rings=rings.filter(r=>r.t<r.life);
  for(const bm of beams)bm.t+=dt;
  beams=beams.filter(bm=>bm.t<bm.life);
  /* v4.13: rayos del Aniquilador */
  for(const ub of ultBeams)ub.t+=dt;
  ultBeams=ultBeams.filter(b=>b.t<b.life);
  /* v4.14: agujeros negros — en cliente solo avanzan como efecto visual */
  if(amClient()){for(const h of holes)h.t+=dt;holes=holes.filter(h=>h.t<h.life);}
  for(const em of emosFx){em.t+=dt;em.y-=24*dt;}
  emosFx=emosFx.filter(em=>em.t<em.life);
  shake=Math.max(0,shake-dt*34);
  bannerT=Math.max(0,bannerT-dt);
  frenzyT=Math.max(0,frenzyT-dt);
  if(frenzyT<=0)run.combo=0;
  /* v4.12: el combo de bajas caduca tras 3 s sin matar */
  if(run.comboT>0){run.comboT-=dt;if(run.comboT<=0)run.comboN=0;}
  if(novaCdGlobal>0)novaCdGlobal=Math.max(0,novaCdGlobal-dt);
}
function checkClear(dt){
  if(waveState==='play'&&!boss&&enemies.length===0&&wave.pending<=0&&wave.pool.length===0){
    clearTimer+=dt;
    if(clearTimer>(wave.wasBoss?1.4:.7)){
      waveState='idle';
      if(wave.wasBoss)showPostBoss();
      else{
        const bonus=8+run.level*2;
        /* v4.15: en co-op de 2–3 el bono se reparte (anfitrión + clientes) */
        if(players.length>1){
          const np=players.length;
          save.gold+=Math.ceil(bonus/np);
          const per=Math.floor(bonus/np);
          for(const c of net.conns)if(c.open)c.wg=(c.wg||0)+per;
        }else save.gold+=bonus;
        run.goldRun+=bonus;
        banner('OLEADA DESPEJADA','+'+bonus+' de oro');
        run.level++;nextWave();persist();
      }
    }
  }else clearTimer=0;
}

