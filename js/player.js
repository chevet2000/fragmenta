'use strict';
/* ============ jugador ============ */
function shockNova(pl,rad,dmg,color,slot){
  rings.push({x:pl.x,y:pl.y,r:12,R:rad,t:0,life:.45,color});
  hostRing(pl.x,pl.y,rad,color);
  for(const e of enemies){if(!e.dead&&Math.hypot(e.x-pl.x,e.y-pl.y)<rad)damageEnemy(e,dmg,false,slot);}
  if(boss&&Math.hypot(boss.x-pl.x,boss.y-pl.y)<rad+30)damageBoss(dmg,false,slot);
  for(const eb of ebullets){if(Math.hypot(eb.x-pl.x,eb.y-pl.y)<rad+30)eb.dead=true;}
  ebullets=ebullets.filter(b=>!b.dead);
}
function reflectBlast(pl,slot){
  let best=null,bd=260;
  for(const e of enemies){if(e.dead)continue;const d=Math.hypot(e.x-pl.x,e.y-pl.y);if(d<bd){bd=d;best=e;}}
  if(best){damageEnemy(best,Math.max(2,Math.round(pl.dmg*2)),false,slot);
    beams.push({x1:pl.x,y1:pl.y,x2:best.x,y2:best.y,t:0,life:.15});
    hostBeam(pl.x,pl.y,best.x,best.y);
    floater(best.x,best.y-20,'REFLEJADO','#64C7FF',11);}
}
function hitPlayer(pl,d){
  if(pl.invul>0||state!=='play'||pl.hp<=0)return;
  const slot=pl.slot;
  if(boss)run.bossDmgTaken=true;
  if(pl.field&&pl.shieldLvl){
    pl.shieldLvl=false;pl.invul=1;
    rings.push({x:pl.x,y:pl.y,r:14,R:60,t:0,life:.4,color:'#64C7FF'});
    hostRing(pl.x,pl.y,60,'#64C7FF');
    floater(pl.x,pl.y-24,'BLOQUEADO','#64C7FF',12);
    if(pl.reflect||run.relics.includes('mirror'))reflectBlast(pl,slot);
    tone(500,900,.12,'sine',.06);return;
  }
  if(pl.shield&&pl.shieldUp){
    pl.shieldUp=false;pl.shieldCd=pl.shieldFast?15:25;pl.invul=.8;
    rings.push({x:pl.x,y:pl.y,r:14,R:64,t:0,life:.4,color:'#64C7FF'});
    hostRing(pl.x,pl.y,64,'#64C7FF');
    floater(pl.x,pl.y-24,'ESCUDO','#64C7FF',12);
    if(pl.reflect||run.relics.includes('mirror'))reflectBlast(pl,slot);
    tone(500,900,.12,'sine',.06);return;
  }
  if(pl.emergency&&!pl.emerUsed&&pl.hp-d<=0){
    pl.emerUsed=true;pl.hp=1;pl.invul=2;
    rings.push({x:pl.x,y:pl.y,r:14,R:80,t:0,life:.5,color:'#7DFF9E'});
    floater(pl.x,pl.y-24,'RESERVA','#7DFF9E',12);
    tone(200,800,.25,'sine',.07);return;
  }
  if(pl.phoenixCharges>0&&pl.hp-d<=0){
    pl.phoenixCharges--;pl.hp=Math.ceil(pl.maxHp/2);pl.invul=2.5;
    shockNova(pl,220,pl.dmg,'#FFD166',slot);
    banner('FÉNIX','El núcleo renace');
    tone(200,900,.4,'sine',.08);return;
  }
  if(pl.stone)d=Math.max(1,d-1);
  pl.hp-=d;pl.invul=1.1;run.combo=0;
  run.comboN=0; /* v4.12: recibir daño corta el combo de bajas */
  run.stTaken+=d;
  if(pl.venge)pl.vengeT=4;
  SFX.hurt();vib(70,true);if(!noHurtShake)shake=Math.min(16,shake+8);redFlash(); /* v4.28: CABINA GIMBAL apaga el temblor del daño (la vibración se queda) */
  if(pl.neb)shockNova(pl,150,pl.dmg+4,'#FF7EB6',slot);
  if(pl.hp<=0){
    pl.hp=0;burst(pl.x,pl.y,'#F2EFE6',20,180);
    if(players.every(p=>p.hp<=0)){
      wrecks=[];
      gameOver();
    }else{
      wrecks.push({slot:pl.slot,x:pl.x,y:pl.y,prog:0});
      floater(pl.x,pl.y-20,'NAVE CAÍDA · RESCÁTALA','#FF6B6B',12);
    }
  }
}
function shoot(pl){
  pl.shots++;
  run.stShots++;
  if(bullets.length>380)return; /* v4.8: tope de balas propias (anti-lag) */
  const heavy=pl.overdrive&&pl.shots%(pl.overEvery||6)===0;
  for(let f=0;f<pl.files;f++){
    const ox=(f-(pl.files-1)/2)*13;
    for(let i=0;i<pl.bullets;i++){
      const a=-Math.PI/2+(i-(pl.bullets-1)/2)*.11;
      const crit=Math.random()<pl.crit;
      /* v4.10: cada disparo varía ±50% (base 10 => 5–15 por bala),
         los críticos (x2.5) y los disparos pesados (x3) se calculan encima */
      let dmg=Math.max(1,Math.round(pl.dmg*(.5+Math.random())));
      dmg*=crit?2.5:1;
      if(heavy)dmg*=3;
      bullets.push({x:pl.x+ox,y:pl.y-16,vx:Math.cos(a)*540,vy:Math.sin(a)*540,
        dmg,r:heavy?7:4,crit,pierce:pl.pierce,hits:[],bounce:pl.bounce,heavy,slot:pl.slot,dead:false});
    }
  }
  SFX.shoot();
}
let novaCdGlobal=0;
function fireNovaSlot(slot){
  const pl=players[slot];
  if(!pl||!pl.nova||novaCdGlobal>0||state!=='play'||pl.hp<=0)return;
  novaCdGlobal=pl.nova.cd*pl.novaCdMul;
  for(const q of players){
    if(q.hp<=0)continue;
    const nd=q.nova?q.nova.d:15;
    const nm=q.nova?q.novaMul:1;
    shockNova(q,300,Math.round(nd*nm),'#FFD166',q.slot);
    if(q.novaRadial)for(let i=0;i<12;i++){const a=TAU*i/12;
      bullets.push({x:q.x,y:q.y,vx:Math.cos(a)*420,vy:Math.sin(a)*420,
        dmg:q.dmg,r:4,crit:false,pierce:0,hits:[],bounce:0,slot:q.slot,dead:false});}
  }
  selfQuake(6,14);SFX.nova();vib(40); /* v4.28: detonación propia → CONTRAPESADO */
}
function fireNovaLocal(){
  if(amClient()){ sendMsg({t:'nova'}); return; }
  fireNovaSlot(localSlot);
}

/* ============ updates de jugador ============ */
function updPlayer(pl,dt){
  pl.invul=Math.max(0,pl.invul-dt);
  pl.vengeT=Math.max(0,pl.vengeT-dt);
  pl.dashCd=Math.max(0,pl.dashCd-dt);
  if(pl.touch&&pl.touch.active){
    const k=1-Math.exp(-42*dt);
    pl.x=lerp(pl.x,pl.touch.tx,k);
    pl.y=lerp(pl.y,pl.touch.ty,k);
  }
  const desperate=pl.desperate&&pl.hp<=1?1.5:1;
  pl.fireAcc+=dt*pl.fireRate*(frenzyT>0?1.5:1)*(pl.vengeT>0?1.3:1)*desperate;
  while(pl.fireAcc>=1){pl.fireAcc-=1;shoot(pl);}
  if(pl.regenRate>0&&pl.hp>0&&pl.hp<pl.maxHp){
    const prev=pl.hp;
    pl.hp=Math.min(pl.maxHp,pl.hp+pl.regenRate*dt);
    if(Math.floor(pl.hp)>Math.floor(prev))floater(pl.x,pl.y-24,'+1','#7DFF9E',12);
  }
  if(pl.aura){
    for(const e of enemies){if(!e.dead&&Math.hypot(e.x-pl.x,e.y-pl.y)<75){
      e.hp-=16*dt;e.flash=Math.max(e.flash,.3);if(e.hp<=0)killEnemy(e,pl.slot);}}
    if(boss&&Math.hypot(boss.x-pl.x,boss.y-pl.y)<boss.r+75)boss.hp-=16*dt;
  }
  if(pl.linkHeal>0){
    pl.linkT+=dt;
    const iv=pl.linkRate||5;
    if(pl.linkT>=iv){
      pl.linkT=0;
      let tgt=null;
      if(players.length>1)tgt=players.find(q=>q.slot!==pl.slot&&q.hp>0&&q.hp<q.maxHp)||null;
      else if(pl.hp>0&&pl.hp<pl.maxHp)tgt=pl;
      if(tgt){
        tgt.hp=Math.min(tgt.maxHp,tgt.hp+pl.linkHeal);
        floater(tgt.x,tgt.y-30,'+'+pl.linkHeal+' ENLACE','#7FD1B9',11);
        rings.push({x:tgt.x,y:tgt.y,r:8,R:52,t:0,life:.45,color:'#7FD1B9'});
        hostRing(tgt.x,tgt.y,52,'#7FD1B9');
        tone(700,980,.12,'sine',.035);
      }
    }
  }
  updAbilities(pl,dt);
  updUltimate(pl,dt); /* v4.13: arma definitiva */
  updBlackHole(pl,dt); /* v4.14: 2ª definitiva */
}
function nearestEnemy(x,y,excl,range){
  range=range||300;
  let best=null,bd=range;
  for(const e of enemies){if(e.dead||excl.includes(e.id))continue;
    const d=Math.hypot(e.x-x,e.y-y);if(d<bd){bd=d;best=e;}}
  return best;
}
function updAbilities(pl,dt){
  const key=''+pl.slot;
  if(pl.shield&&!pl.shieldUp&&pl.hp>0){
    pl.shieldCd-=dt;
    if(pl.shieldCd<=0){pl.shieldUp=true;tone(520,880,.15,'sine',.05);
      floater(pl.x,pl.y-26,'ESCUDO','#64C7FF',11);}
  }
  if(pl.goldRate>0){
    pl.intAcc+=dt*pl.goldRate;
    while(pl.intAcc>=1){
      pl.intAcc-=1;
      /* v4.15: en co-op el oro del cliente viaja por su conexión */
      if(pl.slot>0&&net.mode==='host'){
        const c=net.conns.find(x=>x.slot===pl.slot&&x.open);
        if(c)c.wg=(c.wg||0)+1;else{save.gold+=1;save.totGold=(save.totGold||0)+1;}
      }else{save.gold+=1;save.totGold=(save.totGold||0)+1;} /* v4.12: estadística */
      run.goldRun+=1;
      missionTick('gold',1);
    }
  }
  if(pl.homing){
    pl.homeCd-=dt;
    if(pl.homeCd<=0&&(enemies.length||boss)){
      pl.homeCd=pl.homeFast?1.8:2.5;
      for(let i=0;i<pl.msl;i++)
        bullets.push({x:pl.x+rand(-10,10),y:pl.y-12,vx:rand(-40,40),vy:-220,
          dmg:Math.max(3,Math.round(pl.dmg*3)),r:5,crit:false,pierce:0,hits:[],bounce:0,
          missile:true,slot:pl.slot,life:4,dead:false});
      tone(700,240,.18,'sawtooth',.03);
    }
  }
  if(pl.prism){
    pl.priCd-=dt;
    if(pl.priCd<=0){
      let t=nearestEnemy(pl.x,pl.y,[],430);
      if(!t&&boss&&Math.hypot(boss.x-pl.x,boss.y-pl.y)<460)t=boss;
      if(t){
        pl.priCd=pl.priFast?3:5;
        beams.push({x1:pl.x,y1:pl.y-10,x2:t.x,y2:t.y,t:0,life:.18});
        hostBeam(pl.x,pl.y-10,t.x,t.y);
        if(t===boss)damageBoss(pl.dmg*2,false,pl.slot);else damageEnemy(t,pl.dmg*2,false,pl.slot);
        tone(1200,300,.12,'sawtooth',.04);
      }
    }
  }
  if(pl.drones>0){
    if(!dronePos[key])dronePos[key]=[];
    if(!droneCd[key])droneCd[key]=[];
    for(let i=0;i<pl.drones;i++){
      if(!dronePos[key][i])dronePos[key][i]={x:pl.x,y:pl.y};
      if(droneCd[key][i]==null)droneCd[key][i]=rand(0,1);
      const a=time*2+i*TAU/pl.drones;
      dronePos[key][i].x=pl.x+Math.cos(a)*44;
      dronePos[key][i].y=pl.y+Math.sin(a)*44-6;
      droneCd[key][i]-=dt;
      if(droneCd[key][i]<=0){
        droneCd[key][i]=pl.droneFast?.6:1.15;
        const t=nearestEnemy(dronePos[key][i].x,dronePos[key][i].y,[],430);
        const ang=t?Math.atan2(t.y-dronePos[key][i].y,t.x-dronePos[key][i].x):-Math.PI/2;
        bullets.push({x:dronePos[key][i].x,y:dronePos[key][i].y,vx:Math.cos(ang)*460,vy:Math.sin(ang)*460,
          dmg:Math.max(1,Math.round(pl.dmg*.5)),r:3,crit:false,pierce:0,hits:[],bounce:0,dr:true,slot:pl.slot,dead:false});
      }
    }
    dronePos[key].length=pl.drones;droneCd[key].length=pl.drones;
  }
  if(pl.orbs>0){
    pl.orbT+=dt*2.4;
    pl.orbTick-=dt;
    if(pl.orbTick<=0){
      pl.orbTick=.35;
      for(let i=0;i<pl.orbs;i++){
        const a=pl.orbT+i*TAU/pl.orbs;
        const ox=pl.x+Math.cos(a)*34,oy=pl.y+Math.sin(a)*34;
        for(const e of enemies)if(!e.dead&&Math.hypot(e.x-ox,e.y-oy)<e.r+7)damageEnemy(e,Math.max(1,Math.round(pl.dmg*.5)),false,pl.slot);
        if(boss&&Math.hypot(boss.x-ox,boss.y-oy)<boss.r+7)damageBoss(Math.max(1,Math.round(pl.dmg*.5)),false,pl.slot);
      }
    }
  }
}

/* ============ v4.13: ARMA DEFINITIVA · CAÑÓN ANIQUILADOR ============
   Se desbloquea en la rama DEFINITIVA del árbol (mejoras con gemas).
   Cada X s dispara un rayo gigante que atraviesa a todos los enemigos de
   la línea. Mejorable: MIRILLA (busca al más duro), CARGA RÁPIDA (CD),
   NÚCLEO DENSO (daño + quemadura) y SOBRECARGA (onda + limpia balas). */
function updUltimate(pl,dt){
  if(!pl.ult||pl.hp<=0)return;
  pl.ultT-=dt;
  if(pl.ultT>0)return;
  let t=null;
  if(pl.ultAim){ /* busca al enemigo con MÁS vida (jefes primero) */
    let bd=-1;
    for(const e of enemies){if(!e.dead&&e.hp>bd){bd=e.hp;t=e;}}
    if(boss&&(boss.hp>bd||!t))t=boss;
  }else{
    t=nearestEnemy(pl.x,pl.y,[],640);
    if(!t&&boss&&Math.hypot(boss.x-pl.x,boss.y-pl.y)<660)t=boss;
  }
  if(!t){pl.ultT=.6;return;} /* sin objetivos: reintenta enseguida */
  fireUltimate(pl,t);
  pl.ultT=pl.ultCdMax;
}
function fireUltimate(pl,t){
  const a=Math.atan2(t.y-pl.y,t.x-pl.x);
  const ex=pl.x+Math.cos(a)*1700,ey=pl.y+Math.sin(a)*1700;
  const dmg=Math.max(5,Math.round(pl.dmg*pl.ultDmgMul));
  for(const e of enemies){
    if(e.dead)continue;
    if(distToSeg(e.x,e.y,pl.x,pl.y,ex,ey)<36+e.r){
      damageEnemy(e,dmg,true,pl.slot);
      if(pl.ultBurn)applyBurn(e,{dps:12,dur:4,spread:0,boom:false},pl.slot);
    }
  }
  if(boss&&distToSeg(boss.x,boss.y,pl.x,pl.y,ex,ey)<36+boss.r){
    damageBoss(dmg,true,pl.slot);
    if(pl.ultBurn)boss.burn={dps:12,t:4,spread:0,boom:false,slot:pl.slot};
  }
  ultBeams.push({x1:pl.x,y1:pl.y-8,x2:ex,y2:ey,t:0,life:.55});
  hostUltBeam(pl.x,pl.y-8,ex,ey);
  if(pl.ultShock){
    shockNova(pl,150,Math.max(5,Math.round(pl.dmg*4)),'#B388FF',pl.slot);
    for(const eb of ebullets)eb.dead=true;
    ebullets=ebullets.filter(b=>!b.dead);
  }
  selfQuake(10,16);
  SFX.ult();vib(60);
  floater(pl.x,pl.y-42,'¡ANIQ!','#B388FF',14);
}

/* ============ v4.14: 2ª DEFINITIVA · AGUJERO NEGRO ============
   Cada X s abre un agujero negro sobre el enemigo más duro: atrae a los
   enemigos, los DEVORA al tocar el núcleo, desintegra sus balas y hace
   daño continuo. Mejorable: radio, duración, succión, colapso final,
   oro por devorado, curación y recarga. Los jefes y élites no son
   devorados (solo daño), y su atracción es reducida. */
function updBlackHole(pl,dt){
  if(!pl.bh||pl.hp<=0)return;
  pl.bhT-=dt;
  if(pl.bhT>0)return;
  let t=null,bd=-1;
  for(const e of enemies){if(!e.dead&&e.hp>bd){bd=e.hp;t=e;}}
  if(boss&&boss.hp>bd)t=boss;
  if(!t){pl.bhT=1;return;} /* sin objetivos: reintenta enseguida */
  spawnHole(pl,clamp(t.x,60,W-60),clamp(t.y,80,H*.62));
  pl.bhT=pl.bhCdMax;
}
function spawnHole(pl,x,y){
  holes.push({x,y,t:0,life:pl.bhDur,rad:pl.bhRad,core:30,
    dps:Math.max(4,Math.round(pl.dmg*.8*pl.bhDmgMul)),
    pull:pl.bhPull,boom:pl.bhBoom,gold:pl.bhGold,heal:pl.bhHeal,
    slot:pl.slot,spin:rand(0,TAU),devoured:0,dead:false});
  hostHole(x,y,pl.bhRad,pl.bhDur);
  floater(x,y-44,'AGUJERO NEGRO','#B388FF',15);
  rings.push({x,y,r:8,R:pl.bhRad,t:0,life:.5,color:'#B388FF'});
  SFX.warp();tone(150,45,.6,'sine',.07);vib(50);
}
function updHoles(dt){
  if(!holes.length)return;
  for(const h of holes){
    h.t+=dt;
    const live=h.t<h.life;
    if(live&&h.pull>0){
      for(const e of enemies){
        if(e.dead||e.state==='enter'||e.state==='snake'||e.frozen>0)continue;
        const dx=h.x-e.x,dy=h.y-e.y,d=Math.hypot(dx,dy)||1;
        if(d>h.rad)continue;
        const f=(e.elite?110:220)*h.pull*(1.25-d/h.rad);
        e.x+=dx/d*f*dt;e.y+=dy/d*f*dt;
        if(e.state==='form'){e.fx=clamp(e.fx+dx/d*f*dt,24,W-24);e.fy=clamp(e.fy+dy/d*f*dt,H*.06,H*.42);}
        e.flash=Math.max(e.flash,.15);
      }
      for(const eb of ebullets){
        const dx=h.x-eb.x,dy=h.y-eb.y,d=Math.hypot(dx,dy)||1;
        if(d>h.rad)continue;
        if(d<26){eb.dead=true;burst(eb.x,eb.y,'#B388FF',2,50);continue;}
        eb.x+=dx/d*230*h.pull*dt;eb.y+=dy/d*230*h.pull*dt;
      }
      for(const e of enemies){
        if(e.dead)continue;
        const d=Math.hypot(e.x-h.x,e.y-h.y);
        if(d>h.rad)continue;
        if(d<h.core&&e.state!=='enter'&&!e.elite){ /* DEVORADO */
          e.hp=0;h.devoured++;
          save.totDevour=(save.totDevour||0)+1;checkAch(); /* v4.14 */
          if(h.gold){grantGold(h.slot,2);floater(h.x,h.y-30,'+2','#FFD166',10);}
          if(h.heal){const q=players[h.slot]||players[0];
            if(q&&q.hp>0&&q.hp<q.maxHp){q.hp=Math.min(q.maxHp,q.hp+1);floater(q.x,q.y-26,'+1','#7DFF9E',11);}}
          killEnemy(e,h.slot);
          continue;
        }
        e.hp-=h.dps*dt;e.flash=Math.max(e.flash,.2);
        if(e.hp<=0)killEnemy(e,h.slot);
      }
      if(boss&&Math.hypot(boss.x-h.x,boss.y-h.y)<h.rad+boss.r){
        boss.hp-=h.dps*dt;boss.flash=Math.max(boss.flash,.25);
        if(boss.hp<=0)killBoss();
      }
    }
    if(h.t>=h.life){
      if(h.boom){ /* COLAPSO FINAL */
        const dmg=Math.round(h.dps*8);
        rings.push({x:h.x,y:h.y,r:10,R:h.rad+60,t:0,life:.55,color:'#B388FF'});
        hostRing(h.x,h.y,h.rad+60,'#B388FF');
        for(const e of enemies){if(!e.dead&&Math.hypot(e.x-h.x,e.y-h.y)<h.rad+20)damageEnemy(e,dmg,false,h.slot);}
        if(boss&&Math.hypot(boss.x-h.x,boss.y-h.y)<h.rad+boss.r+20)damageBoss(dmg,false,h.slot);
        selfQuake(10,18);SFX.nova();vib(60);
        floater(h.x,h.y-52,'¡COLAPSO!','#B388FF',16);
      }
      h.dead=true;
    }
  }
  holes=holes.filter(h=>!h.dead);
}

/* ============ v4.20: NAVE AMIGA (escolta temporal del CUBO SORPRESA) ============
   Vuela junto a tu nave 60 s y dispara al enemigo más cercano con el
   DOBLE de tu daño actual (se recalcula en cada disparo: si mejoras la
   nave, la escolta mejora contigo). No interfiere con el bot del árbol
   ALIADO: usa su propia lista `allies`. */
function updAllies(dt){
  const P0=players[0]||P;
  if(!allies.length||!P0)return;
  for(const a of allies){
    a.life-=dt;
    a.ph+=dt;
    const ang=time*1.1+a.ph;
    const tx=P0.x+Math.cos(ang)*64,ty=P0.y+Math.sin(ang)*52-14;
    a.x=lerp(a.x,tx,1-Math.exp(-5.5*dt));
    a.y=lerp(a.y,ty,1-Math.exp(-5.5*dt));
    a.cd-=dt;
    if(a.cd<=0){
      const t=nearestEnemy(a.x,a.y,[],560);
      if(t){
        a.cd=.8;
        const ang2=Math.atan2(t.y-a.y,t.x-a.x);
        /* v4.20: cada disparo de la escolta pega el DOBLE del daño del jugador */
        bullets.push({x:a.x,y:a.y,vx:Math.cos(ang2)*520,vy:Math.sin(ang2)*520,
          dmg:Math.max(2,Math.round(P0.dmg*2)),r:4,crit:false,pierce:0,hits:[],bounce:0,
          ally:true,slot:0,life:3,dead:false});
        tone(1150,780,.05,'triangle',.02);
      }else a.cd=.3;
    }
  }
  const had=allies.length;
  allies=allies.filter(a=>a.life>0);
  /* aviso de retirada cuando se acaba la escolta (se rearma al invocar otra) */
  if(had>0&&!allies.length&&state==='play'&&!updAllies.warn){
    updAllies.warn=true;
    floater(P0.x,P0.y-56,'LA NAVE AMIGA SE RETIRA','#FFE9B0',12);
  }
}

/* ============ rescate ============ */
function updWrecks(dt){
  for(const w of wrecks){
    const pl=players[w.slot];
    if(pl&&pl.hp>0){w.remove=true;continue;}
    let resc=null;
    for(const q of players){
      if(q.hp>0&&q.slot!==w.slot&&Math.hypot(q.x-w.x,q.y-w.y)<38){resc=q;break;}
    }
    if(resc){
      if(resc.hp>=2){
        w.prog=Math.min(1,w.prog+dt/1.2);
        if(w.prog>=1){
          resc.hp-=1;
          pl.hp=Math.min(pl.maxHp,2);pl.invul=2.2;pl.x=w.x;pl.y=w.y;
          floater(w.x,w.y-24,'¡RESCATADO!','#7FD1B9',14);
          floater(resc.x,resc.y-30,'-1 VIDA','#FF6B6B',11);
          hostRing(w.x,w.y,90,'#7FD1B9');
          SFX.rescue();
          vib(60,true);
          save.totRescue=(save.totRescue||0)+1;
          checkAch();
          w.remove=true;
        }
      }else if(Math.random()<dt*2.5){
        floater(w.x,w.y-32,'NECESITAS 2+ DE VIDA','#FF6B6B',10);
      }
    }else{
      w.prog=Math.max(0,w.prog-dt);
    }
  }
  wrecks=wrecks.filter(w=>!w.remove);
}


/* ============ v4.9: ALIADO · BOT DE COMBATE ============
   Se desbloquea en el árbol (rama ALIADO) y vuela junto a la nave
   disparando al enemigo más cercano. Mejoras con GEMAS (caras). */
function updBots(dt){
  const P0=players[0];
  const want=(P0&&P0.bot>0&&!amClient())?(P0.bot+(P0.botTwin||0)):0;
  if(bots.length>want)bots.length=want;
  if(!want)return;
  while(bots.length<want)bots.push({x:P0.x,y:P0.y,cd:rand(.3,.9),msl:rand(2,4)});
  bots.forEach((bt,i)=>{
    const a=time*1.5+i*TAU/bots.length;
    const tx=P0.x+Math.cos(a)*86,ty=P0.y+Math.sin(a)*86-10;
    bt.x=lerp(bt.x,tx,1-Math.exp(-6*dt));
    bt.y=lerp(bt.y,ty,1-Math.exp(-6*dt));
    bt.cd-=dt*P0.botRate;
    if(bt.cd<=0){
      const t=nearestEnemy(bt.x,bt.y,[],520);
      if(t){
        bt.cd=.85;
        const ang=Math.atan2(t.y-bt.y,t.x-bt.x);
        bullets.push({x:bt.x,y:bt.y,vx:Math.cos(ang)*500,vy:Math.sin(ang)*500,
          dmg:Math.max(1,Math.round(P0.dmg*1.1*P0.botDmg)),r:3.5,crit:false,
          pierce:P0.pierce+P0.botPrc,hits:[],bounce:0,bot:true,slot:0,life:3,dead:false});
        tone(900,620,.05,'square',.015);
      }
    }
    if(P0.botMsl){
      bt.msl-=dt;
      if(bt.msl<=0){
        const t=nearestEnemy(bt.x,bt.y,[],650);
        if(t){
          bt.msl=4.5;
          const ang=Math.atan2(t.y-bt.y,t.x-bt.x);
          bullets.push({x:bt.x,y:bt.y,vx:Math.cos(ang)*220,vy:Math.sin(ang)*220,
            dmg:Math.max(2,Math.round(P0.dmg*3.3*P0.botDmg)),r:5,crit:false,pierce:0,hits:[],
            bounce:0,missile:true,bot:true,slot:0,life:5,dead:false});
        }
      }
    }
  });
}
