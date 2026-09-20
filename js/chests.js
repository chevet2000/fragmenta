'use strict';
/* ============ cofres ============ */
/* v4.15: billetera por SLOT — en co-op de 2–3, el oro/gemas de cada piloto
   viaja por SU conexión (conn.wg/conn.wm) en vez de una bolsa común. */
function walletGold(slot,v){
  if(net.mode==='host'&&slot>0){
    const c=net.conns.find(x=>x.slot===slot&&x.open);
    if(c){c.wg=(c.wg||0)+v;return;}
  }
  save.gold+=v;save.totGold=(save.totGold||0)+v;
}
function walletGems(slot,v){
  if(net.mode==='host'&&slot>0){
    const c=net.conns.find(x=>x.slot===slot&&x.open);
    if(c){c.wm=(c.wm||0)+v;return;}
  }
  save.gems+=v;save.totGems=(save.totGems||0)+v;
}
function grantGold(slot,v){
  walletGold(slot,v);
  run.goldRun+=v;
}
function grantGems(slot,v){
  walletGems(slot,v);
  run.gemsRun+=v;
}
function openChest(slot,kind){
  kind=kind||'boss';
  save.totChest=(save.totChest||0)+1;
  checkAch();persist();
  SFX.chest();
  /* v4.8: cofre blindado = UNA recompensa al azar, sin elección de 3 */
  if(kind==='arm'){
    chestSlot=slot;
    const rid=['gold','gems','temp'][irand(0,2)];
    chestReward(rid,'arm');
    return;
  }
  /* v4.15: el cofre de cualquier CLIENTE (slot 1 o 2) espera su elección */
  if(net.mode==='host'&&slot>0&&net.connected){
    chestSlot=slot;chestwaitT=0;
    state='chestwait';
    sendMsg({t:'ev',k:'chest',lv:run.level,kind});
    return;
  }
  chestSlot=slot;
  state='chestpick';
  buildChestUI(run.level,id=>chestReward(id,kind),kind);
  showScr('chest');
  if(net.mode==='host')sendMsg({t:'ev',k:'chestw'});
}
function buildChestUI(lv,onPick,kind){
  const arm=kind==='arm';
  const gv=arm?(140+lv*20):(120+lv*18), mv=arm?(5+Math.floor(lv/9)):(4+Math.floor(lv/10));
  const box=$('#chestOpts');box.innerHTML='';
  const opts=arm?[
    {id:'gold',b:'◆ ORO GRANDE',p:'+'+gv+' de oro directo a tu perfil.'},
    {id:'gems',b:'◇ GEMA CRISTALIZADA',p:'+'+mv+' gemas para el arsenal.'},
    {id:'temp',b:'✦ PODER SORPRESA',p:'Un poder temporal al azar (escudos, misiles, láser, curación…) durante 2 oleadas.'},
  ]:[
    {id:'gold',b:'◆ ORO GRANDE',p:'+'+gv+' de oro directo a tu perfil.'},
    {id:'gems',b:'◇ GEMA CRISTALIZADA',p:'+'+mv+' gemas para el arsenal.'},
    {id:'relic',b:'◈ RELIQUIA MISTERIOSA',p:'Una reliquia aleatoria que aún no tengas.'},
  ];
  opts.forEach(o=>{
    const el=document.createElement('button');
    el.className='cbtn';
    el.innerHTML=`<b>${o.b}</b><p>${o.p}</p>`;
    el.addEventListener('click',()=>onPick(o.id));
    box.appendChild(el);
  });
}
function chestReward(id,kind){
  const arm=kind==='arm';
  let msg='';
  if(id==='gold'){
    /* v4.9: recompensas de cofre reducidas (blindado paga algo mejor) */
    const v=arm?(90+run.level*12):(70+run.level*10);
    grantGold(chestSlot,v);msg='+'+v+' DE ORO';
  }else if(id==='gems'){
    const v=arm?(4+Math.floor(run.level/12)):(3+Math.floor(run.level/14));
    grantGems(chestSlot,v);msg='+'+v+' GEMAS';
  }else if(id==='temp'){
    msg=grantTempBuff(chestSlot);
  }else{
    const pool=RELICS.filter(r=>!run.relics.includes(r.id));
    if(pool.length){
      const r=pool[irand(0,pool.length-1)];
      run.relics.push(r.id);recompute();
      if(r.id==='hierro')healPlayerOnce(chestSlot||0,3); /* v4.8: curación única */
      msg='RELIQUIA: '+r.name;
    }else{
      const v=200;
      grantGold(chestSlot,v);msg='+'+v+' DE ORO (sin reliquias disponibles)';
    }
  }
  banner(arm?'COFRE BLINDADO':'COFRE ABIERTO',msg);
  persist();
  if(net.mode==='host'){
    sendMsg({t:'ev',k:'chestgot',m:msg});
    sendMsg({t:'ev',k:'resume'});
  }
  chestSlot=0;
  state='play';showScr(null);
}

