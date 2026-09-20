'use strict';
/* ============ bucle ============ */
let last=performance.now(),hudAcc=0,persAcc=0,snapAcc=0;
function loop(now){
  requestAnimationFrame(loop);
  let dt=(now-last)/1000;last=now;
  dt=Math.min(dt,.05);
  time+=dt;
  updBiome(dt); /* v4.14: biomas visuales */
  if(state==='play'&&!amClient()){
    run.time+=dt;
    for(const pl of players)updPlayer(pl,dt);
    updBots(dt); /* v4.9: aliado bot de combate */
    updBullets(dt);
    updWaveSpawns(dt);
    updEnemies(dt);
    updBoss(dt);
    updHoles(dt); /* v4.14: agujeros negros */
    updEBullets(dt);
    updCollisions();
    if(players.length>1)updWrecks(dt);
    updPickups(dt);
    updFx(dt);
    checkClear(dt);
    enemies=enemies.filter(e=>!e.dead);
    if(pendingShipLevels>0){
      if(net.mode==='host'&&players.length>1&&net.connected)beginShipChoiceHost();
      else showShipLevelLocal();
    }
    if(net.mode==='host'){
      snapAcc+=dt;
      if(snapAcc>.08){snapAcc=0;sendSnap();}
    }
  }else if(state==='play'&&amClient()){
    for(const pl of players){
      if(pl.slot===localSlot&&pl.touch&&pl.touch.active&&pl.hp>0){
        const k=1-Math.exp(-42*dt);
        pl.x=lerp(pl.x,pl.touch.tx,k);
        pl.y=lerp(pl.y,pl.touch.ty,k);
      }
    }
    updFx(dt);
  }else if(runActive&&state!=='pause'){
    updFx(dt);
  }
  if(state==='shipwait'&&net.mode==='host'){
    if(!net.connected){
      shipwaitT+=dt;
      /* v4.15: si faltan pilotos, se les asigna la mejora por defecto */
      if(shipwaitT>6){
        for(let s=1;s<players.length;s++)if(!net.chosen[s]){net.chosen[s]=true;net.cards[s]='dmg1';}
        checkShipChoice();
      }
    }else shipwaitT=0;
  }
  if(state==='chestwait'){
    chestwaitT+=dt;
    if(!net.connected||chestwaitT>10){
      chestSlot=chestSlot||1;
      chestReward('gold');
    }
  }
  if(state==='postboss'&&net.mode==='host'&&players.length>1&&!net.connected){
    /* v4.15: sin conexión, las elecciones faltantes se resuelven solas */
    let missing=false;
    for(let s=0;s<players.length;s++)if(!net.relicOk[s]){net.relicOk[s]=true;net.relicId[s]=RELICS[0].id;missing=true;}
    if(missing)applyRelicChoice();
  }
  hudAcc+=dt;
  if(hudAcc>.1){hudAcc=0;if(runActive)refreshHUD();}
  persAcc+=dt;
  if(persAcc>8){persAcc=0;
    if(runActive){
      /* v4.9: el récord frenético se guarda progresivamente (salir no lo pierde) */
      if(frenzyMode){
        if(!save.frenzy)save.frenzy={bestT:0,bestK:0};
        save.frenzy.bestT=Math.max(save.frenzy.bestT||0,Math.floor(run.time));
        save.frenzy.bestK=Math.max(save.frenzy.bestK||0,run.kills);
      }
      persist();
    }
  }
  if(runActive)renderGame(dt);else renderMenuBG(dt);
}
requestAnimationFrame(loop);
