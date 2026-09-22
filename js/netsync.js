'use strict';
/* ============ snapshot ============ */
function sendSnap(){
  if(net.mode!=='host'||!net.connected)return;
  const p=players.map(pl=>[
    Math.round(pl.x),Math.round(pl.y),pl.hp,pl.dmg,
    Math.round(pl.invul*10),pl.orbs,pl.shieldUp?1:0,pl.maxHp
  ]);
  const en=enemies.slice(0,60).map(e=>{
    const arr=[e.id,TKLIST.indexOf(e.tk),e.elvl,Math.max(0,Math.ceil(e.hp)),
      Math.round(e.x),Math.round(e.y),Math.round(e.r*10),
      e.elite?1:0, e.snake==null?null:e.snake, e.snIdx,
      e.camp?Object.keys(CAMP_DEFS).indexOf(e.camp)+1:0,
      (e.frozen>0?1:0)+(e.burn?2:0)+(e.revived?4:0)];
    return arr;
  });
  const bs=boss?[Math.round(boss.x),Math.round(boss.y),Math.max(0,Math.ceil(boss.hp)),boss.ph,
    BOSS_ORDER.indexOf(boss.kind)]:null;
  const bp=boss?clamp(boss.hp/boss.maxhp*100,0,100):0;
  const eb=ebullets.slice(0,90).map(b=>{
    const a=[Math.round(b.x),Math.round(b.y),b.r,colorIdx(b.color)];
    if(b.pir)a.push(1); /* v4.31: misil del pirata (el cliente lo pinta como cohete) */
    return a;
  });
  const bl=bullets.slice(0,80).map(b=>{
    let kind=b.missile?4:b.dr?3:b.heavy?2:b.crit?1:0;
    return [Math.round(b.x),Math.round(b.y),Math.round(Math.atan2(b.vy,b.vx)*100),kind];
  });
  const sorted=[...pickups].sort((a,b)=>((b.t==='chest'||b.t==='minichest'||b.t==='schest'||b.t==='cube'||b.t==='vchest')?1:0)-((a.t==='chest'||a.t==='minichest'||a.t==='schest'||a.t==='cube'||a.t==='vchest')?1:0));
  const pk=sorted.slice(0,60).map(p=>
    p.t==='gold'?[0,Math.round(p.x),Math.round(p.y)]:
    p.t==='gem'?[1,Math.round(p.x),Math.round(p.y)]:
    p.t==='chest'?[3,Math.round(p.x),Math.round(p.y)]:
    p.t==='minichest'?[4,Math.round(p.x),Math.round(p.y)]:
    p.t==='schest'?[5,Math.round(p.x),Math.round(p.y),Math.max(0,Math.ceil(p.shield)),p.shieldMax]:
    /* v4.20: el CUBO SORPRESA viaja como tipo 6 (con su escudo) */
    p.t==='cube'?[6,Math.round(p.x),Math.round(p.y),Math.max(0,Math.ceil(p.shield)),p.shieldMax]:
    /* v4.21: el COFRE SELLADO viaja como tipo 7 (con su rareza c/r/e/l → 0-3) */
    p.t==='vchest'?[7,Math.round(p.x),Math.round(p.y),RARS.indexOf(p.rar)]:
    /* v4.29: el BIDÓN y la CELDA viajan como tipos 8 y 9 */
    p.t==='fuel'?[8,Math.round(p.x),Math.round(p.y)]:
    p.t==='elec'?[9,Math.round(p.x),Math.round(p.y)]:
    [2,Math.round(p.x),Math.round(p.y)]);
  const wk=wrecks.map(w=>[w.slot,Math.round(w.x),Math.round(w.y),Math.round(w.prog*100)]);
  /* v4.31: EL PIRATA GALÁCTICO — posición, aros restantes, vida total, botín,
     láser (ángulo ×100 + fase) y rumbo; nulo cuando no está en escena */
  const pi=pirate?[Math.round(pirate.x),Math.round(pirate.y),
    pirate.rings.filter(r=>r.hp>0).length,Math.round(pirPct(pirate)),
    Math.min(99999,pirate.lootG),pirate.lootM,
    pirate.las?Math.round(pirate.las.a*100):-1,pirate.las?pirate.las.ph:0,
    pirate.dir]:null;
  const cN=players[1]&&players[1].nova;
  const nc=novaCdGlobal>0?clamp(1-novaCdGlobal/((cN?cN.cd:18)*(cN?players[1].novaCdMul:1)),0,1):1;
  /* v4.33: la ZONA DE GUERRA viaja en el snapshot para quien entre tarde */
  const zn=run.zone?{k:run.zone.k,v:run.zone.v||''}:null;
  sendMsg({t:'snap',p,en,bs,bp,eb,bl,pk,wk,pi,zn,
    sv:run.shipLv,se:run.exp,wl:run.level,nc:nc});
  /* v4.15: la billetera de CADA cliente viaja por SU conexión (oro/gemas propios) */
  for(const c of net.conns){
    if(c.open&&(c.wg>0||c.wm>0)){
      try{c.c.send({t:'ev',k:'wallet',g:c.wg,m:c.wm});}catch(e){}
      c.wg=0;c.wm=0;
    }
  }
}

