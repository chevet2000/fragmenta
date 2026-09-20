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
  run.stTaken+=d;
  if(pl.venge)pl.vengeT=4;
  SFX.hurt();vib(70);shake=Math.min(16,shake+8);redFlash();
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
  const heavy=pl.overdrive&&pl.shots%(pl.overEvery||6)===0;
  for(let f=0;f<pl.files;f++){
    const ox=(f-(pl.files-1)/2)*13;
    for(let i=0;i<pl.bullets;i++){
      const a=-Math.PI/2+(i-(pl.bullets-1)/2)*.11;
      const crit=Math.random()<pl.crit;
      let dmg=pl.dmg*(crit?2.5:1);
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
  shake=Math.min(14,shake+6);SFX.nova();vib(40);
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
  if(pl.regenRate>0){
    pl.regAcc+=dt*pl.regenRate;
    if(pl.regAcc>=1&&pl.hp<pl.maxHp&&pl.hp>0){pl.regAcc-=1;pl.hp++;floater(pl.x,pl.y-24,'+1','#7DFF9E',12);}
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
      if(pl.slot===1&&net.mode==='host')net.walletG+=1;
      else{save.gold+=1;run.goldRun+=1;}
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
          vib(60);
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

