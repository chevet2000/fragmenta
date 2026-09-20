'use strict';
/* ============ RED (PeerJS) ============ */
let pingTimer=null;
const net={mode:null,peer:null,conn:null,code:'',connected:false,ping:0,
  walletG:0,walletM:0,retries:0,hostChosen:false,clientChosen:false,hostCard:null,clientCard:null,
  hostRelic:false,clientRelic:false,hostRelicId:null,clientRelicId:null,remoteStats:{},lobbyDiff:'normal'};
const amClient=()=>net.mode==='client';
function sendMsg(o){ if(net.conn&&net.connected){ try{net.conn.send(o);}catch(e){} } }
function peerReady(){ return typeof Peer!=='undefined'; }
function mkPeerId(code){ return 'frg43-'+code; }
function destroyNet(){
  if(pingTimer){clearInterval(pingTimer);pingTimer=null;}
  try{if(net.conn)net.conn.close();}catch(e){}
  try{if(net.peer)net.peer.destroy();}catch(e){}
  net.mode=null;net.peer=null;net.conn=null;net.connected=false;net.code='';
  net.walletG=0;net.walletM=0;net.retries=0;net.ping=0;
  net.hostChosen=false;net.clientChosen=false;net.hostCard=null;net.clientCard=null;
  net.hostRelic=false;net.clientRelic=false;net.hostRelicId=null;net.clientRelicId=null;
  net.remoteStats={};net.lobbyDiff='normal';net.rankSent=false;
}
function computeStatblock(){
  const b=blankStats();
  for(const nd of TREE)if(has(nd.id))nd.fx(b);
  b.goldMul*=1+.25*save.prest;
  return b;
}
function blankStats(){
  return{dmg:2,rate:3,bul:1,files:1,spd:1,pierce:0,crit:.05,magnet:1,maxHp:4,regenRate:0,nova:null,
    slow:1,goldMul:1,expMul:1,goldRate:0,aura:false,emergency:false,field:false,bounce:0,over:false,linkHeal:0,linkRate:5,azar:false,azarBonus:0,
    drones:0,orbs:0,shield:false,shieldFast:false,phx:0,vamp:false,frenzy:false,execute:false,
    presa:false,reflect:false,venge:false,secondWind:false,dash:false,stone:false,homing:false,prism:false,
    priFast:false,msl:1,neb:false,pointDef:false,slowField:false,novaRadial:false,novaCdMul:1,novaMul:1,
    ojiva:false,gemLuck:false,heartDrop:false,vortex:false,
    elec:null,ice:null,iceTop:false,wind:null,fire:null,
    overEvery:6,desperate:false,dashFast:false,droneFast:false,homeFast:false,gemExtra:false,
    /* v4.9: ALIADO · bot de combate */
    bot:0,botDmg:1,botRate:1,botMsl:false,botTwin:0,botPrc:0};
}
function hostLobby(){
  if(!peerReady()){
    showScr('lobby');
    $('#lobbyStat').innerHTML='<span class="err">No se pudo cargar el módulo de red. Recarga la página (requiere internet).</span>';
    return;
  }
  useProfile('net');
  destroyNet();
  weeklyMode=false;R=Math.random;
  net.mode='host';net.code=makeCode();
  const peer=new Peer(mkPeerId(net.code));
  net.peer=peer;
  $('#lobbyCode').textContent=net.code;
  $('#lobbyStat').innerHTML='<span class="prof">PERFIL ONLINE · '+ownedCount()+'/'+TREE.length+' mejoras · '+save.gold+' oro</span><br>Conectando al servicio de salas…';
  $('#btnStartCoop').classList.add('hidden');
  showScr('lobby');state='lobby';
  peer.on('open',()=>{
    $('#lobbyStat').innerHTML='<span class="prof">PERFIL ONLINE · '+ownedCount()+'/'+TREE.length+' mejoras · '+save.gold+' oro</span><br>Sala activa. Esperando a tu compañero…';
  });
  peer.on('connection',conn=>{
    if(net.conn&&net.connected){ try{conn.close();}catch(e){} return; }
    const md=conn.metadata||{};
    if(md.v!==VERSION){
      try{conn.on('open',()=>{conn.send({t:'ver'});setTimeout(()=>conn.close(),400);});}catch(e){}
      return;
    }
    net.conn=conn;
    conn.on('open',()=>{
      net.connected=true;net.retries=0;net.rankSent=true;
      conn.send({t:'welcome',diff:net.lobbyDiff||'normal'});
      conn.send({t:'rank',list:(save.ranking||[]).slice(-60)}); /* v4.8: el anfitrión también envía el suyo al conectar */
      $('#lobbyStat').innerHTML='<span class="ok">¡JUGADOR 2 CONECTADO!</span><br><span class="prof">Ranking sincronizado entre los dos</span>';
      $('#btnStartCoop').classList.remove('hidden');
      SFX.gem();vib(40);
    });
    conn.on('data',d=>hostOnData(d));
    conn.on('close',()=>hostLostClient());
    conn.on('error',()=>hostLostClient());
  });
  peer.on('error',e=>{
    if(e.type==='unavailable-id'){ destroyNet(); hostLobby(); return; }
    $('#lobbyStat').innerHTML='<span class="err">Error de red: '+e.type+'</span>';
  });
}
function hostLostClient(){
  if(net.mode!=='host')return;
  net.connected=false;
  if(!runActive){
    $('#lobbyStat').innerHTML='El jugador se desconectó.<br>Esperando reconexión…';
    $('#btnStartCoop').classList.add('hidden');
    return;
  }
  state='netwait';
  $('#netWait').classList.remove('hidden');
  $('#nwKick').textContent='JUGADOR 2 DESCONECTADO';
  $('#nwTitle').textContent='PARTIDA EN PAUSA';
  $('#nwStat').innerHTML='La sala sigue abierta.<br>Código para reconectar: <b style="color:var(--amber)">'+net.code+'</b>';
  $('#btnNwSolo').classList.remove('hidden');
  $('#btnNwCancel').textContent='TERMINAR PARTIDA';
}
function hostOnData(d){
  if(!d||typeof d!=='object')return;
  if(d.t==='ping'){ sendMsg({t:'pong',ts:d.ts}); return; }
  if(d.t==='stats'){ net.remoteStats=d.b; remoteBase=d.b; if(runActive)recompute(); return; }
  if(d.t==='rank'){
    const n=mergeRanking(d.list);
    if(n)banner('RANKING','+'+n+' récords nuevos del rival');
    if(!net.rankSent){net.rankSent=true;sendMsg({t:'rank',list:(save.ranking||[]).slice(-60)});}
    return;
  }
  if(d.t==='inp'&&players[1]&&players[1].hp>0){
    players[1].x=clamp(d.x,16,W-16); players[1].y=clamp(d.y,16,H-16); return;
  }
  if(d.t==='nova'){ fireNovaSlot(1); return; }
  if(d.t==='emo'){ addEmoFx(1,'emo',d.e); return; }
  if(d.t==='call'){
    addEmoFx(1,'call',d.k);
    const pl=players[1];
    if(pl)rings.push({x:pl.x,y:pl.y,r:14,R:100,t:0,life:.6,color:CALLS[d.k]?CALLS[d.k].color:'#F2EFE6'});
    return;
  }
  if(d.t==='pickC'&&state==='shipwait'){
    net.clientChosen=true; net.clientCard=d.id;
    if(!net.hostChosen)setChoiceNote('JUGADOR 2 YA ELIGIÓ · ELIGE TÚ');
    checkShipChoice(); return;
  }
  if(d.t==='pickR'&&state==='postboss'){
    net.clientRelic=true; net.clientRelicId=d.id;
    if(!net.hostRelic)setRelicNote('JUGADOR 2 YA ELIGIÓ · ELIGE TÚ');
    applyRelicChoice(); return;
  }
  if(d.t==='chestPick'&&state==='chestwait'){
    chestSlot=1; chestReward(d.id,d.kind); return;
  }
  if(d.t==='bye'){ if(runActive)runActive=false; destroyNet(); goMenu(); }
}
function checkShipChoice(){
  if(state!=='shipwait')return;
  if(!(net.hostChosen&&net.clientChosen))return;
  applyShipCard(0,net.hostCard);   /* v4.8: tope 10 + curación instantánea por slot */
  applyShipCard(1,net.clientCard);
  net.hostChosen=false;net.clientChosen=false;net.hostCard=null;net.clientCard=null;
  pendingShipLevels--; recompute(); persist();
  if(pendingShipLevels>0)beginShipChoiceHost();
  else{ state='play'; showScr(null); sendMsg({t:'ev',k:'resume'}); }
}
function beginShipChoiceHost(){
  if(!net.connected){ showShipLevelLocal(); return; }
  state='shipwait';shipwaitT=0;
  net.hostChosen=false;net.clientChosen=false;
  const cnt0=id=>cardStacks(0,id),cnt1=id=>cardStacks(1,id);
  const picks=[],used=new Set();
  for(let i=0;i<3;i++){
    const r=Math.random();
    let tier=r<.12&&run.level>=4?2:r<.40?1:0;
    for(let t2=tier;t2>=0;t2--){
      const cands=CARDS.filter(c=>c.tier===t2&&!used.has(c.id)&&cnt0(c.id)<MAX_STACKS&&cnt1(c.id)<MAX_STACKS);
      if(cands.length){const c=cands[irand(0,cands.length-1)];used.add(c.id);picks.push(c);break;}
    }
  }
  while(picks.length<3){
    const c=CARDS.find(c=>cnt0(c.id)<MAX_STACKS&&cnt1(c.id)<MAX_STACKS&&!picks.includes(c))||CARDS[0];
    picks.push(c);
  }
  sendMsg({t:'ev',k:'ship',lv:run.shipLv,ids:picks.map(c=>c.id)});
  showShipCards(picks,c=>{
    net.hostChosen=true; net.hostCard=c.id; SFX.buy();
    markChoiceDone('JUGADOR 1');
    checkShipChoice();
  },null);
}
function joinRoom(code){
  if(!peerReady()){
    $('#joinStat').innerHTML='<span class="err">No se pudo cargar el módulo de red. Recarga la página (requiere internet).</span>';
    return;
  }
  useProfile('net');
  destroyNet();
  weeklyMode=false;R=Math.random;
  net.mode='client';net.code=code;net.retries=0;
  $('#joinStat').innerHTML='<span class="prof">PERFIL ONLINE · '+ownedCount()+'/'+TREE.length+' mejoras · '+save.gold+' oro</span><br>Conectando…';
  connectAsClient(false);
}
function connectAsClient(rejoin){
  const peer=new Peer();
  net.peer=peer;
  let opened=false;
  peer.on('open',()=>{
    const conn=peer.connect(mkPeerId(net.code),{reliable:true,metadata:{v:VERSION}});
    net.conn=conn;
    conn.on('open',()=>{
      opened=true;net.connected=true;net.retries=0;
      conn.send({t:'stats',b:computeStatblock()});
      conn.send({t:'rank',list:(save.ranking||[]).slice(-60)});
      startPing();
      $('#joinStat').innerHTML='<span class="ok">¡CONECTADO!</span><br>Esperando al anfitrión…';
      if(rejoin){ $('#netWait').classList.add('hidden'); if(runActive)state='play'; }
      else state='clientwait';
    });
    conn.on('data',d=>clientOnData(d));
    conn.on('close',()=>clientLost());
    conn.on('error',()=>clientLost());
  });
  peer.on('error',e=>{
    if(e.type==='peer-unavailable'){
      if(rejoin||runActive)clientRetry();
      else $('#joinStat').innerHTML='<span class="err">Sala no encontrada. Revisa el código.</span>';
    }else{
      if(rejoin||runActive)clientRetry();
      else $('#joinStat').innerHTML='<span class="err">Error: '+e.type+'</span>';
    }
  });
  setTimeout(()=>{
    if(!opened&&!net.connected&&!rejoin&&!runActive&&net.mode==='client')
      $('#joinStat').innerHTML='<span class="err">Tiempo agotado. Intenta de nuevo.</span>';
  },12000);
}
function clientRetry(){
  net.retries++;
  if(net.retries>40){ netEndLocal('No se pudo reconectar.'); return; }
  state='netwait';
  $('#netWait').classList.remove('hidden');
  $('#nwKick').textContent='CONEXIÓN PERDIDA';
  $('#nwTitle').textContent='RECONECTANDO ('+net.retries+')';
  $('#nwStat').innerHTML='Buscando al anfitrión…<br>Sala: <b style="color:var(--amber)">'+net.code+'</b>';
  $('#btnNwSolo').classList.add('hidden');
  $('#btnNwCancel').textContent='SALIR';
  setTimeout(()=>{
    if(net.mode==='client'&&!net.connected){
      try{if(net.peer)net.peer.destroy();}catch(e){}
      connectAsClient(true);
    }
  },2000);
}
function clientLost(){
  if(net.mode!=='client')return;
  net.connected=false;
  if(runActive)clientRetry();
}
function netEndLocal(msg){
  destroyNet();
  runActive=false;state='menu';
  weeklyMode=false;R=Math.random;
  musStop();
  useProfile('local');
  $('#netWait').classList.add('hidden');
  $('#hud').classList.add('hidden');$('#hudBot').classList.add('hidden');$('#bossBar').classList.add('hidden');
  refreshMenu();showScr('menu');
  if(msg)banner('DESCONECTADO',msg);
}
function startPing(){
  if(pingTimer)clearInterval(pingTimer);
  pingTimer=setInterval(()=>{ if(net.connected)sendMsg({t:'ping',ts:performance.now()}); },2000);
}
function clientOnData(d){
  if(!d||typeof d!=='object')return;
  if(d.t==='pong'){ net.ping=Math.round(performance.now()-d.ts); return; }
  if(d.t==='ver'){ netEndLocal('El anfitrión tiene otra versión. Actualizad ambos a la misma.'); return; }
  if(d.t==='welcome'){ runDiff=d.diff||'normal'; return; }
  if(d.t==='rank'){ const n=mergeRanking(d.list); if(n)banner('RANKING','+'+n+' récords nuevos del anfitrión'); return; }
  if(d.t==='start'){ runDiff=d.diff||runDiff; startRunClient(); return; }
  if(d.t==='snap'){ applySnap(d); return; }
  if(d.t==='bn'){ bannerTxt=d.a;bannerSub=d.b||'';bannerT=BANNER_LIFE; return; }
  if(d.t==='fxr'){ rings.push({x:d.x,y:d.y,r:10,R:d.R,t:0,life:.45,color:d.c}); return; }
  if(d.t==='fxb'){ beams.push({x1:d.x1,y1:d.y1,x2:d.x2,y2:d.y2,t:0,life:.18}); return; }
  if(d.t==='fxf'){ floats.push({x:d.x,y:d.y,txt:d.txt,color:d.c,size:d.s,t:0,life:.65}); return; }
  if(d.t==='emo'){ addEmoFx(0,'emo',d.e); return; }
  if(d.t==='call'){
    addEmoFx(0,'call',d.k);
    const pl=players[0];
    if(pl)rings.push({x:pl.x,y:pl.y,r:14,R:100,t:0,life:.6,color:CALLS[d.k]?CALLS[d.k].color:'#F2EFE6'});
    return;
  }
  if(d.t==='ev')clientEvent(d);
}
function clientEvent(d){
  const k=d.k;
  if(k==='resume'){ showScr(null);state='play';persist();return; }
  if(k==='wallet'){ save.gold+=d.g;save.gems+=d.m;persist();return; }
  if(k==='miss'){ if(d.l)run.missions=d.l; return; }
  if(k==='ship'){
    save.bestShip=Math.max(save.bestShip,d.lv);run.shipLv=d.lv;persist();
    const picks=d.ids.map(id=>CARDS.find(c=>c.id===id)).filter(Boolean);
    state='levelup';SFX.lvl();
    showShipCards(picks,c=>{
      sendMsg({t:'pickC',id:c.id}); SFX.buy();
      markChoiceDone('TÚ');
    },null);
    return;
  }
  if(k==='relics'){
    state='postboss';
    showRelicCards(d.ids.map(id=>RELICS.find(r=>r.id===id)).filter(Boolean),r=>{
      sendMsg({t:'pickR',id:r.id});
      markRelicDone('TÚ');
    });
    showScr('post'); return;
  }
  if(k==='chest'){
    state='chestpick';SFX.chest();
    const ckind=d.kind||'boss';
    buildChestUI(d.lv,id=>{
      sendMsg({t:'chestPick',id,kind:ckind});
      showScr(null);state='play';
    },ckind);
    showScr('chest');
    return;
  }
  if(k==='temp'){ run.tempBuffs=d.l||[]; return; }
  if(k==='chestw'){ banner('COFRE','El anfitrión está abriendo…'); return; }
  if(k==='chestgot'){ banner('COFRE ABIERTO',d.m); return; }
  if(k==='over'){
    save.best.lvl=Math.max(save.best.lvl,d.level);
    save.bestAll=Math.max(save.bestAll,d.level);
    save.bestShip=Math.max(save.bestShip,d.ship);
    if(d.hard)save.bestHard=Math.max(save.bestHard||0,d.level);
    persist();
    runActive=false;state='over';
    musStop();
    $('#netWait').classList.add('hidden');
    const st=(kk,v)=>`<div><small>${kk}</small><b>${v}</b></div>`;
    $('#ovStats').innerHTML=st('OLEADA',d.level)+st('NAVE NIVEL',d.ship)+st('ORO DE LA INCURSIÓN',d.yg);
    $('#ovKeep').innerHTML='<span class="k1">SE CONSERVA · árbol · oro · gemas · récords · logros (perfil online)</span><br><span class="k2">SE PIERDE · cartas y reliquias de la incursión</span>';
    $('#hud').classList.add('hidden');$('#hudBot').classList.add('hidden');$('#bossBar').classList.add('hidden');
    showScr('over'); return;
  }
  if(k==='end'){ netEndLocal('El anfitrión cerró la sala.'); return; }
}
let cEnemies=new Map(),cEB=[],cBL=[],cPK=[],cWrecks=[],cNovaCd=1,cBossPct=0;
function applySnap(d){
  d.p.forEach((pd,i)=>{
    const pl=players[i];if(!pl)return;
    pl.hp=pd[2];pl.dmg=pd[3];pl.invul=pd[4]/10;pl.orbs=pd[5];pl.shieldUp=!!pd[6];pl.maxHp=pd[7];
    if(i!==localSlot){ pl.x=lerp(pl.x,pd[0],.45); pl.y=lerp(pl.y,pd[1],.45); }
  });
  run.shipLv=d.sv; run.exp=d.se; run.level=d.wl;
  const seen=new Set();
  for(const ed of d.en){
    const id=ed[0];seen.add(id);
    let e=cEnemies.get(id);
    if(!e){
      const tk=TKLIST[ed[1]||0]||'orb';
      e={id,tk,T:TYPES[tk]||TYPES.orb,elvl:ed[2],hp:ed[3],
        x:ed[4],y:ed[5],r:ed[6]/10,elite:!!ed[7],flash:0,
        snake:ed[8]==null?null:ed[8],snIdx:ed[9]||0,wob:(id*2.39996)%TAU,
        frozen:0,burn:null,shockT:0,camp:null,CD:null};
      if(ed[10])e.camp=e.CD=CAMP_DEFS[Object.keys(CAMP_DEFS)[ed[10]-1]]||null;
      if(ed[11]){e.frozen=(ed[11]&1)?1:0;e.burn=(ed[11]&2)?{dps:0,t:1}:null;}
      cEnemies.set(id,e);
    }else{
      e.tx=ed[4];e.ty=ed[5];e.hp=ed[3];e.elvl=ed[2];e.r=ed[6]/10;e.elite=!!ed[7];
      e.snake=ed[8]==null?null:ed[8];e.snIdx=ed[9]||0;
      if(ed[10])e.camp=e.CD=CAMP_DEFS[Object.keys(CAMP_DEFS)[ed[10]-1]]||null;
      if(ed[11]!==undefined){e.frozen=(ed[11]&1)?1:0;if(ed[11]&2&&!e.burn)e.burn={dps:0,t:1};}
    }
  }
  for(const [id,e] of cEnemies){
    if(!seen.has(id)){ if(e.hp<=0)burst(e.x,e.y,e.T.color,12,130); cEnemies.delete(id); }
    else if(e.tx!=null){ e.x=lerp(e.x,e.tx,.45); e.y=lerp(e.y,e.ty,.45); }
  }
  if(d.bs){
    if(!boss)boss={t:0,rot:0,flash:0,r:44};
    boss.x=d.bs[0];boss.y=d.bs[1];boss.hp=d.bs[2];boss.ph=d.bs[3];
    boss.kind=BOSS_ORDER[d.bs[4]]||'MONOLITO';
    boss.D=BOSS_DEFS[boss.kind]||BOSS_DEFS.MONOLITO;
  }else boss=null;
  cBossPct=d.bp||0;
  cEB=d.eb.map(b=>({x:b[0],y:b[1],r:b[2],color:ECOLORS[b[3]]||'#F2EFE6'}));
  cBL=d.bl.map(b=>({x:b[0],y:b[1],ang:b[2]/100,kind:b[3]}));
  cPK=d.pk.map(p=>({t:['gold','gem','heart','chest','minichest','schest'][p[0]]||'gold',x:p[1],y:p[2],shield:p[3]||0,shieldMax:p[4]||0}));
  cWrecks=(d.wk||[]).map(w=>({slot:w[0],x:w[1],y:w[2],prog:w[3]/100}));
  cNovaCd=d.nc;
}

