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
      (e.frozen>0?1:0)+(e.burn?2:0)];
    return arr;
  });
  const bs=boss?[Math.round(boss.x),Math.round(boss.y),Math.max(0,Math.ceil(boss.hp)),boss.ph,
    BOSS_ORDER.indexOf(boss.kind)]:null;
  const bp=boss?clamp(boss.hp/boss.maxhp*100,0,100):0;
  const eb=ebullets.slice(0,90).map(b=>[Math.round(b.x),Math.round(b.y),b.r,colorIdx(b.color)]);
  const bl=bullets.slice(0,80).map(b=>{
    let kind=b.missile?4:b.dr?3:b.heavy?2:b.crit?1:0;
    return [Math.round(b.x),Math.round(b.y),Math.round(Math.atan2(b.vy,b.vx)*100),kind];
  });
  const sorted=[...pickups].sort((a,b)=>((b.t==='chest'||b.t==='minichest'||b.t==='schest')?1:0)-((a.t==='chest'||a.t==='minichest'||a.t==='schest')?1:0));
  const pk=sorted.slice(0,60).map(p=>
    p.t==='gold'?[0,Math.round(p.x),Math.round(p.y)]:
    p.t==='gem'?[1,Math.round(p.x),Math.round(p.y)]:
    p.t==='chest'?[3,Math.round(p.x),Math.round(p.y)]:
    p.t==='minichest'?[4,Math.round(p.x),Math.round(p.y)]:
    p.t==='schest'?[5,Math.round(p.x),Math.round(p.y),Math.max(0,Math.ceil(p.shield)),p.shieldMax]:
    [2,Math.round(p.x),Math.round(p.y)]);
  const wk=wrecks.map(w=>[w.slot,Math.round(w.x),Math.round(w.y),Math.round(w.prog*100)]);
  const cN=players[1]&&players[1].nova;
  const nc=novaCdGlobal>0?clamp(1-novaCdGlobal/((cN?cN.cd:18)*(cN?players[1].novaCdMul:1)),0,1):1;
  sendMsg({t:'snap',p,en,bs,bp,eb,bl,pk,wk,
    sv:run.shipLv,se:run.exp,wl:run.level,nc:nc});
  if(net.walletG>0||net.walletM>0){
    sendMsg({t:'ev',k:'wallet',g:net.walletG,m:net.walletM});
    net.walletG=0;net.walletM=0;
  }
}

