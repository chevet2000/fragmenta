'use strict';
/* ============ RED (PeerJS) ============ */
/* v4.15: CO-OP DE 2–3 JUGADORES — el anfitrión acepta hasta DOS conexiones
   (estrella): cada cliente entra con su SLOT (1 y 2), recibe el mismo
   snapshot y su oro/gemas viajan por su propia conexión (wallet por conn).
   Las elecciones de cartas/reliquias esperan a TODOS los slots. */
let pingTimer=null;
/* v4.27: reintento del ranking — si a los 5 s de abrirse la conexión no
   llegó el 'rank' del otro lado (se pierde por la red, llega tarde, lo que
   sea), cada lado PIDE el del rival ('rankq') en vez de quedarse mudo:
   antes el anfitrión liberaba el inicio a los 12 s aunque los datos
   nunca hubieran viajado, y la sala quedaba «sincronizada» en falso. */
let RANKQ_MS=5000;
const net={mode:null,peer:null,conn:null,conns:[],code:'',connected:false,ping:0,
  walletG:0,walletM:0,retries:0,hostChosen:false,clientChosen:false,hostCard:null,clientCard:null,
  hostRelic:false,clientRelic:false,hostRelicId:null,clientRelicId:null,remoteStats:{},lobbyDiff:'normal',
  remotePilot:null,remotePilots:[],mySlot:1,remoteSkin:{},rankGot:false,
  chosen:{},cards:{},relicOk:{},relicId:{}}; /* v4.15: elecciones por slot + lista de pilotos · v4.26: rankGot (cliente) */
const amClient=()=>net.mode==='client';
const connsOpen=()=>net.conns.filter(c=>c.open).length;
/* v4.25: BUG HISTÓRICO (desde v4.15) — en modo CLIENTE net.conns está vacía,
   así que TODO lo que el cliente enviaba por aquí ('inp' de posición, cartas,
   cofres, emoticonos, nova, ranking…) NUNCA SALÍA del dispositivo. Por eso la
   nave del P2 en la pantalla del anfitrión solo se movía cuando el anfitrión
   la arrastraba él. Ahora el cliente envía por SU conexión (net.conn). */
function sendMsg(o){
  if(net.mode==='client'){ if(net.conn&&net.conn.open){try{net.conn.send(o);}catch(e){}} return; }
  for(const c of net.conns){if(!c.open)continue;try{c.c.send(o);}catch(e){}}
}
/* v4.25: color del aspecto equipado — viaja por la conexión para que AMBAS
   pantallas pinten a cada piloto con SU color (antes el rival salía con el
color del slot y las parejas de colores no coincidían entre dispositivos). */
function skinColorOf(){const s=getSkin();return s?s.color:null;}
/* v4.25: el ranking se REENVÍA cuando cambia (antes solo viajaba al conectar:
   los récords MULTI hechos durante la partida nunca llegaban al otro jugador). */
function netRankSync(){
  if(net.mode!=='host'||!net.connected)return;
  sendMsg({t:'rank',list:(save.ranking||[]).slice(-60),name:getPilot()});
}
function peerReady(){ return typeof Peer!=='undefined'; }
function mkPeerId(code){ return 'frg43-'+code; }
function destroyNet(){
  if(pingTimer){clearInterval(pingTimer);pingTimer=null;}
  try{if(net.peer)net.peer.destroy();}catch(e){}
  net.mode=null;net.peer=null;net.conn=null;net.conns=[];net.connected=false;net.code='';
  net.walletG=0;net.walletM=0;net.retries=0;net.ping=0;
  net.hostChosen=false;net.clientChosen=false;net.hostCard=null;net.clientCard=null;
  net.hostRelic=false;net.clientRelic=false;net.hostRelicId=null;net.clientRelicId=null;
  net.remoteStats={};net.lobbyDiff='normal';net.rankSent=false;net.remotePilot=null;net.rankGot=false;
  net.remotePilots=[];net.mySlot=1;
  net.depOk={};net.rvMe=false;net.rvSlots={}; /* v4.28: despliegue + revancha */
  net.chosen={};net.cards={};net.relicOk={};net.relicId={};
  net.remoteSkin={};
}
function computeStatblock(){
  const b=blankStats();
  for(const nd of TREE)if(has(nd.id))nd.fx(b);
  b.goldMul*=1+.25*save.prest;
  return b;
}
function blankStats(){
  /* v4.10: la nave pega de verdad desde el inicio — dmg base 10 con
     variación aleatoria ±50% en cada disparo (5–15) y 8% de crítico (x2.5). */
  return{dmg:10,rate:3,bul:1,files:1,spd:1,pierce:0,crit:.08,magnet:1,maxHp:4,regenRate:0,nova:null,
    slow:1,goldMul:1,expMul:1,goldRate:0,aura:false,emergency:false,field:false,bounce:0,over:false,linkHeal:0,linkRate:5,azar:false,azarBonus:0,
    drones:0,orbs:0,shield:false,shieldFast:false,phx:0,vamp:false,frenzy:false,execute:false,
    presa:false,reflect:false,venge:false,secondWind:false,dash:false,stone:false,homing:false,prism:false,
    priFast:false,msl:1,neb:false,pointDef:false,slowField:false,novaRadial:false,novaCdMul:1,novaMul:1,
    ojiva:false,gemLuck:false,heartDrop:false,vortex:false,
    elec:null,ice:null,iceTop:false,wind:null,fire:null,
    overEvery:6,desperate:false,dashFast:false,droneFast:false,homeFast:false,gemExtra:false,
    /* v4.9: ALIADO · bot de combate */
    bot:0,botDmg:1,botRate:1,botMsl:false,botTwin:0,botPrc:0,
    /* v4.13: DEFINITIVA · Cañón Aniquilador */
    ult:false,ultCd:14,ultDmg:10,ultAim:false,ultBurn:false,ultShock:false,
    /* v4.14: 2ª DEFINITIVA · Agujero Negro */
    bh:false,bhCd:20,bhRad:130,bhDur:4,bhPull:1,bhDmgMul:1,bhBoom:false,bhGold:false,bhHeal:false,
    /* v4.28: ESTABILIDAD — control de temblor de cámara (no viaja: cada
       pantalla calcula los suyos en recompute con su árbol local) */
    quakeMul:1,quakeDecay:1,noQuake:false,noSelfQuake:false,noCritShake:false,noHurtShake:false};
}
/* v4.15: lobby del anfitrión con lista de pilotos conectados (1–2 pueden entrar) */
/* v4.26: estado REAL de sincronía en el lobby — el ranking de cada piloto
   viaja por su conexión al entrar; el botón COMENZAR queda bloqueado
   (disabled) hasta que TODOS los conectados han intercambiado su ranking
   con el anfitrión. Antes el stat decía «Ranking sincronizado» siempre y
   el botón se liberaba con solo abrir la conexión. */
function lobbyStatus(){
  const open=net.conns.filter(c=>c.open);
  const n=open.length;
  let rows='';
  for(const c of open){
    const nm=c.gotName||net.remotePilot||('PILOTO '+(c.slot||1));
    rows+='<span class="prof">● '+nm+' · '+(c.rankGot?'<span class="ok">RANKING ✓</span>':'<span style="color:var(--amber)">SINCRONIZANDO…</span>')+'</span><br>';
  }
  const allSync=n>0&&open.every(c=>c.rankGot);
  const bt=$('#btnStartCoop');
  bt.classList.toggle('hidden',n<1);
  bt.disabled=!allSync;
  if(n>=1)bt.textContent=allSync?'COMENZAR · '+(n+1)+' JUGADORES':'SINCRONIZANDO RANKING…';
  $('#lobbyStat').innerHTML='<span class="ok">PILOTOS CONECTADOS: '+n+'/2</span><br>'+rows+
    (allSync?'<span class="ok">DATOS SINCRONIZADOS ✓ · LISTO PARA INICIAR</span>'
            :'<span class="prof">El ranking se sincroniza al conectar · COMENZAR se libera al terminar</span>');
}
/* v4.26: el inicio exige sincronía completa (doble comprobación del click) */
function canStartCoop(){
  const open=net.conns.filter(c=>c.open);
  return open.length>=1&&open.every(c=>c.rankGot);
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
  drawLobbyQR(); /* v4.26: QR del código de sala para que el compañero lo escanee */
  $('#lobbyStat').innerHTML='<span class="prof">PERFIL ONLINE · '+ownedCount()+'/'+TREE.length+' mejoras · '+save.gold+' oro</span><br>Conectando al servicio de salas…';
  $('#btnStartCoop').classList.add('hidden');
  showScr('lobby');state='lobby';
  peer.on('open',()=>{
    $('#lobbyStat').innerHTML='<span class="prof">PERFIL ONLINE · '+ownedCount()+'/'+TREE.length+' mejoras · '+save.gold+' oro</span><br>Sala activa · pueden entrar hasta 2 pilotos…';
  });
  peer.on('connection',conn=>{
    if(connsOpen()>=2){ try{conn.on('open',()=>{conn.send({t:'ev',k:'end'});setTimeout(()=>conn.close(),300);});}catch(e){} return; }
    const md=conn.metadata||{};
    if(md.v!==VERSION){
      try{conn.on('open',()=>{conn.send({t:'ver'});setTimeout(()=>conn.close(),400);});}catch(e){}
      return;
    }
    /* v4.15: slot libre (1 o 2) para el recién llegado */
    const used=net.conns.map(x=>x.slot);
    const slot=used.includes(1)?2:1;
    const wrap={c:conn,slot,open:false,wg:0,wm:0,rankSeen:false,rankGot:false,gotName:null};
    net.conns.push(wrap);
    if(!net.conn)net.conn=conn;
    conn.on('open',()=>{
      wrap.open=true;net.connected=true;net.retries=0;
      conn.send({t:'welcome',diff:net.lobbyDiff||'normal',name:getPilot(),slot,np:1+connsOpen(),skin:skinColorOf()});
      conn.send({t:'rank',list:(save.ranking||[]).slice(-60),name:getPilot()}); /* v4.8: el anfitrión también envía el suyo al conectar · v4.11: + nombre */
      lobbyStatus();
      SFX.gem();vib(40);
      /* v4.26: cinturón de seguridad — si en 12 s no llegó el ranking del
         cliente (mismo VERSION exigido, así que debería llegar), se libera
         el inicio igualmente para no dejar la sala eternamente bloqueada */
      setTimeout(()=>{
        if(net.mode!=='host'||!net.conns.includes(wrap)||!wrap.open)return;
        if(!wrap.rankGot){wrap.rankGot=true;lobbyStatus();}
      },12000);
      /* v4.27: a los 5 s sin ranking del cliente se le PIDE (rankq);
         normalmente sobra — el cliente lo envía al abrir la conexión */
      setTimeout(()=>{
        if(net.mode!=='host'||!net.conns.includes(wrap)||!wrap.open)return;
        if(!wrap.rankGot){try{wrap.c.send({t:'rankq'});}catch(e){}}
      },RANKQ_MS);
    });
    conn.on('data',d=>hostOnData(d,wrap));
    conn.on('close',()=>hostLostClient(wrap));
    conn.on('error',()=>hostLostClient(wrap));
  });
  peer.on('error',e=>{
    if(e.type==='unavailable-id'){ destroyNet(); hostLobby(); return; }
    $('#lobbyStat').innerHTML='<span class="err">Error de red: '+e.type+'</span>';
  });
}
function hostLostClient(wrap){
  if(net.mode!=='host')return;
  /* v4.15: se retira la conexión caída; su slot queda libre para reconectar */
  net.conns=net.conns.filter(x=>x!==wrap);
  if(wrap.c){try{wrap.c.close();}catch(e){}}
  net.connected=connsOpen()>0;
  if(!net.conn)net.conn=net.conns.length?net.conns[0].c:null;
  if(!runActive){
    /* v4.28: si estabamos votando revancha y se fue el último cliente, se cancela */
    if(state==='over'&&connsOpen()===0){rvToken++;rvCleanup();}
    lobbyStatus();
    return;
  }
  /* en partida: si queda otro piloto, la partida sigue; si no, pausa de siempre */
  if(net.connected){
    dropSlotShip(wrap.slot);
    banner('PILOTO SALIDO','La partida continúa con '+(1+connsOpen()));
    return;
  }
  state='netwait';
  $('#netWait').classList.remove('hidden');
  $('#nwKick').textContent='PILOTO DESCONECTADO';
  $('#nwTitle').textContent='PARTIDA EN PAUSA';
  $('#nwStat').innerHTML='La sala sigue abierta.<br>Código para reconectar: <b style="color:var(--amber)">'+net.code+'</b>';
  $('#btnNwSolo').classList.remove('hidden');
  $('#btnNwCancel').textContent='TERMINAR PARTIDA';
}
/* v4.15: la nave del piloto que se va cae como pecio (rescatable) */
function dropSlotShip(slot){
  const pl=players[slot];
  if(!pl||pl.hp<=0)return;
  pl.hp=0;burst(pl.x,pl.y,'#F2EFE6',16,160);
  if(!players.every(p=>p.hp<=0)){
    wrecks.push({slot,x:pl.x,y:pl.y,prog:0});
    floater(pl.x,pl.y-20,'NAVE SIN PILOTO','#FF6B6B',12);
  }
}
function hostOnData(d,wrap){
  if(!d||typeof d!=='object')return;
  const slot=wrap.slot;
  if(d.t==='ping'){ try{wrap.c.send({t:'pong',ts:d.ts});}catch(e){} return; }
  if(d.t==='rankq'){ try{wrap.c.send({t:'rank',list:(save.ranking||[]).slice(-60),name:getPilot()});}catch(e){} return; } /* v4.27: el cliente pide nuestro ranking */
  if(d.t==='stats'){ net.remoteStats=d.b; remoteBase[slot]=d.b; if(d.sk)net.remoteSkin[slot]=d.sk; if(runActive)recompute(); return; }
  if(d.t==='rank'){
    /* v4.11: el mensaje de ranking trae el nombre del rival para el lobby */
    const nm=normalizeName(d.name);
    if(nm){net.remotePilot=nm;if(!net.remotePilots.includes(nm))net.remotePilots.push(nm);wrap.gotName=nm;}
    /* v4.26: marca de sincronía por conexión — sin ella, COMENZAR sigue cerrado */
    wrap.rankGot=true;
    const n=mergeRanking(d.list);
    if(n)banner('RANKING','+'+n+' récords nuevos de tus pilotos');
    if(!wrap.rankSeen){wrap.rankSeen=true;try{wrap.c.send({t:'rank',list:(save.ranking||[]).slice(-60),name:getPilot()});}catch(e){}}
    if(state==='lobby'&&!runActive)lobbyStatus();
    return;
  }
  if(d.t==='inp'&&players[slot]&&players[slot].hp>0){
    players[slot].x=clamp(d.x,16,W-16); players[slot].y=clamp(d.y,16,H-16); return;
  }
  if(d.t==='nova'){ fireNovaSlot(slot); return; }
  if(d.t==='emo'){
    addEmoFx(slot,'emo',d.e);
    for(const c of net.conns)if(c!==wrap&&c.open)try{c.c.send({t:'emo',e:d.e,s:slot});}catch(e2){}
    return;
  }
  if(d.t==='call'){
    addEmoFx(slot,'call',d.k);
    const pl=players[slot];
    if(pl)rings.push({x:pl.x,y:pl.y,r:14,R:100,t:0,life:.6,color:CALLS[d.k]?CALLS[d.k].color:'#F2EFE6'});
    for(const c of net.conns)if(c!==wrap&&c.open)try{c.c.send({t:'call',k:d.k,s:slot});}catch(e2){}
    return;
  }
  if(d.t==='pickC'&&state==='shipwait'){
    /* v4.15: la elección viaja con el slot de cada piloto */
    net.chosen[slot]=true; net.cards[slot]=d.id;
    if(!net.chosen[0])setChoiceNote('UN PILOTO YA ELIGIÓ · ELIGE TÚ');
    checkShipChoice(); return;
  }
  if(d.t==='pickR'&&state==='postboss'){
    net.relicOk[slot]=true; net.relicId[slot]=d.id;
    if(!net.relicOk[0])setRelicNote('UN PILOTO YA ELIGIÓ · ELIGE TÚ');
    applyRelicChoice(); return;
  }
  if(d.t==='chestPick'&&state==='chestwait'){
    chestSlot=slot; chestReward(d.id,d.kind); return;
  }
  /* v4.28: confirmación de DESPLIEGUE del cliente */
  if(d.t==='depOk'){ net.depOk[slot]=true; checkDeployReady(); return; }
  /* v4.28: voto de REVANCHA del cliente */
  if(d.t==='rvY'){ net.rvSlots[slot]=true; return; }
  if(d.t==='bye'){ if(runActive)runActive=false; destroyNet(); goMenu(); }
}
function checkShipChoice(){
  if(state!=='shipwait')return;
  if(!net.chosen[0])return;
  for(let s=1;s<players.length;s++)if(!net.chosen[s])return;
  applyShipCard(0,net.cards[0]||'dmg1');
  for(let s=1;s<players.length;s++)applyShipCard(s,net.cards[s]||'dmg1');
  net.chosen={};net.cards={};
  pendingShipLevels--; recompute(); persist();
  if(pendingShipLevels>0)beginShipChoiceHost();
  else{ state='play'; showScr(null); sendMsg({t:'ev',k:'resume'}); }
}
function beginShipChoiceHost(){
  if(!net.connected){ showShipLevelLocal(); return; }
  state='shipwait';shipwaitT=0;
  net.chosen={};net.cards={};
  const cnt=(slot,id)=>cardStacks(slot,id);
  const picks=[],used=new Set();
  for(let i=0;i<3;i++){
    const r=Math.random();
    let tier=r<.12&&run.level>=4?2:r<.40?1:0;
    for(let t2=tier;t2>=0;t2--){
      const cands=CARDS.filter(c=>c.tier===t2&&!used.has(c.id)&&
        players.every(pl=>cnt(pl.slot,c.id)<MAX_STACKS));
      if(cands.length){const c=cands[irand(0,cands.length-1)];used.add(c.id);picks.push(c);break;}
    }
  }
  while(picks.length<3){
    const c=CARDS.find(c=>players.every(pl=>cnt(pl.slot,c.id)<MAX_STACKS)&&!picks.includes(c))||CARDS[0];
    picks.push(c);
  }
  sendMsg({t:'ev',k:'ship',lv:run.shipLv,ids:picks.map(c=>c.id)});
  showShipCards(picks,c=>{
    net.chosen[0]=true; net.cards[0]=c.id; SFX.buy();
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
      conn.send({t:'rank',list:(save.ranking||[]).slice(-60),name:getPilot()}); /* v4.11: + nombre */
      /* v4.27: si en 5 s no llegó el ranking del anfitrión, se le pide */
      setTimeout(()=>{
        if(net.mode==='client'&&net.connected&&net.conn===conn&&!net.rankGot)
          try{conn.send({t:'rankq'});}catch(e){}
      },RANKQ_MS);
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
/* v4.26: estado combinado de conexión + sincronía en la espera del cliente
   (welcome y rank actualizan el mismo panel, en el orden que lleguen) */
function clientWaitStat(){
  if(state!=='clientwait'||!net.connected)return;
  const nm=net.remotePilot?'Anfitrión: <b style="color:var(--sky)">'+net.remotePilot+'</b>':'Esperando al anfitrión…';
  const sync=net.rankGot?'<span class="ok">DATOS SINCRONIZADOS ✓</span>':'<span class="prof">Sincronizando ranking…</span>';
  $('#joinStat').innerHTML='<span class="ok">¡CONECTADO!</span><br>'+nm+' — esperando el inicio…<br>'+sync;
}
function clientOnData(d){
  if(!d||typeof d!=='object')return;
  if(d.t==='pong'){ net.ping=Math.round(performance.now()-d.ts); return; }
  if(d.t==='ver'){ netEndLocal('El anfitrión tiene otra versión. Actualizad ambos a la misma.'); return; }
  if(d.t==='welcome'){
    runDiff=d.diff||'normal';
    /* v4.15: el anfitrión asigna tu slot (1 o 2) y el total de pilotos */
    net.mySlot=clamp(d.slot||1,1,2);
    if(d.skin)net.remoteSkin[0]=d.skin; /* v4.25: aspecto del anfitrión */
    const nm=normalizeName(d.name);
    if(nm)net.remotePilot=nm;
    clientWaitStat();
    return;
  }
  if(d.t==='rank'){ const n=mergeRanking(d.list); if(n)banner('RANKING','+'+n+' récords nuevos del anfitrión'); net.rankGot=true; clientWaitStat(); return; }
  if(d.t==='rankq'){ sendMsg({t:'rank',list:(save.ranking||[]).slice(-60),name:getPilot()}); return; } /* v4.27: el anfitrión pide el nuestro */
  if(d.t==='start'){ runDiff=d.diff||runDiff; if(d.skin)net.remoteSkin[0]=d.skin; startRunClient(d); return; }
  if(d.t==='snap'){ applySnap(d); return; }
  if(d.t==='bn'){ bannerTxt=d.a;bannerSub=d.b||'';bannerT=BANNER_LIFE; return; }
  if(d.t==='fxr'){ rings.push({x:d.x,y:d.y,r:10,R:d.R,t:0,life:.45,color:d.c}); return; }
  if(d.t==='fxb'){ beams.push({x1:d.x1,y1:d.y1,x2:d.x2,y2:d.y2,t:0,life:.18}); return; }
  if(d.t==='fxu'){ ultBeams.push({x1:d.x1,y1:d.y1,x2:d.x2,y2:d.y2,t:0,life:.55}); return; } /* v4.13: rayo del Aniquilador */
  if(d.t==='fxh'){ holes.push({x:d.x,y:d.y,t:0,life:d.life,rad:d.rad,dps:0,pull:0,slot:0,visual:true,spin:Math.random()*TAU}); return; } /* v4.14: agujero negro (visual) */
  if(d.t==='fxf'){ floats.push({x:d.x,y:d.y,txt:d.txt,color:d.c,size:d.s,t:0,life:.65}); return; }
  if(d.t==='emo'){ addEmoFx(d.s!=null?d.s:0,'emo',d.e); return; }
  if(d.t==='call'){
    const rs=d.s!=null?d.s:0;
    addEmoFx(rs,'call',d.k);
    const pl=players[rs];
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
  if(k==='curs'){ applyCurses(d.l); return; } /* v4.17: maldiciones del HECHICERO */
  if(k==='chestw'){ banner('COFRE','El anfitrión está abriendo…'); return; }
  if(k==='chestgot'){ banner('COFRE ABIERTO',d.m); return; }
  if(k==='depGo'){ /* v4.28: el anfitrión lanzó la incursión — informativo, el cliente ya está en play */ return; }
  if(k==='rvGo'){ clientRevanchaGo(); return; } /* v4.28: todos votaron revancha */
  if(k==='over'){
    save.best.lvl=Math.max(save.best.lvl,d.level);
    save.bestAll=Math.max(save.bestAll,d.level);
    save.bestShip=Math.max(save.bestShip,d.ship);
    if(d.hard)save.bestHard=Math.max(save.bestHard||0,d.level);
    /* v4.23: el cliente también registra su récord CO-OP (gates del arsenal) */
    if(!save.bestMode)save.bestMode={solo:0,normal:0,dificil:0,hardcore:0,coop:0};
    save.bestMode.coop=Math.max(save.bestMode.coop||0,d.level);
    /* v4.15: el cliente también deja su récord en MULTI */
    addModeRecord('mp','MP',d.level,d.ship);
    /* v4.25: y EMPUJA su ranking actualizado al anfitrión (antes solo viajaba
       al conectar: el rival no veía tus récords MULTI de esta sesión) */
    sendMsg({t:'rank',list:(save.ranking||[]).slice(-60),name:getPilot()});
    /* v4.28: las DESPLEGADAS murieron con la incursión; las GUARDADAS sobreviven */
    const nTaken=(run.armedTaken||[]).length;
    const nKept=(save.armed||[]).length;
    persist();
    runActive=false;state='over';
    musStop();
    $('#netWait').classList.add('hidden');
    const st=(kk,v)=>`<div><small>${kk}</small><b>${v}</b></div>`;
    $('#ovStats').innerHTML=st('OLEADA',d.level)+st('NAVE NIVEL',d.ship)+st('ORO DE LA INCURSIÓN',d.yg);
    $('#ovKeep').innerHTML='<span class="k1">SE CONSERVA · árbol · oro · gemas · récords · logros (perfil online)</span><br>'+
      (nTaken?`<span class="k2">✦ LAS ${nTaken} MEJORA${nTaken>1?'S':''} DESPLEGADA${nTaken>1?'S':''} SE HAN PERDIDO CON LA INCURSIÓN</span><br>`:'')+
      (nKept?`<span class="k1">✦ ${nKept} MEJORA${nKept>1?'S':''} GUARDADA${nKept>1?'S':''} · elige en el DESPLIEGUE</span><br>`:'')+
      '<span class="k2">SE PIERDE · cartas y reliquias de la incursión</span>';
    $('#hud').classList.add('hidden');$('#hudBot').classList.add('hidden');$('#bossBar').classList.add('hidden');
    showScr('over');
    clientRevanchaUI(); /* v4.28: la sala sigue viva — ¿revancha? */
    return;
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
      if(ed[11]){e.frozen=(ed[11]&1)?1:0;e.burn=(ed[11]&2)?{dps:0,t:1}:null;e.revived=!!(ed[11]&4);}
      else e.revived=false; /* v4.17 */
      cEnemies.set(id,e);
    }else{
      e.tx=ed[4];e.ty=ed[5];e.hp=ed[3];e.elvl=ed[2];e.r=ed[6]/10;e.elite=!!ed[7];
      e.snake=ed[8]==null?null:ed[8];e.snIdx=ed[9]||0;
      if(ed[10])e.camp=e.CD=CAMP_DEFS[Object.keys(CAMP_DEFS)[ed[10]-1]]||null;
      if(ed[11]!==undefined){e.frozen=(ed[11]&1)?1:0;if(ed[11]&2&&!e.burn)e.burn={dps:0,t:1};e.revived=!!(ed[11]&4);}
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
  cPK=d.pk.map(p=>({t:['gold','gem','heart','chest','minichest','schest','cube','vchest'][p[0]]||'gold',x:p[1],y:p[2],
    shield:(p[0]===5||p[0]===6)?(p[3]||0):0,shieldMax:(p[0]===5||p[0]===6)?(p[4]||0):0,
    rar:p[0]===7?(RARS[p[3]]||'c'):undefined}));
  cWrecks=(d.wk||[]).map(w=>({slot:w[0],x:w[1],y:w[2],prog:w[3]/100}));
  cNovaCd=d.nc;
}


/* ===== v4.28: REVANCHA EN CO-OP =====
   Al morir TODOS, la sala NO se cierra: la pantalla final ofrece
   ¡REVANCHA! con 30 s de votación. Si el 100% del equipo vota, cuenta
   atrás y la incursión se rearma NUEVA (oleada 1) en la MISMA sala,
   sin reconectar — lo más frágil del co-op. Lo ganado en la incursión
   que terminó ya quedó guardado (récords, oro, ranking). Si no hay
   unanimidad o expira el tiempo, el final de siempre. */
let rvTimer=null,rvLeft=0,rvToken=0;
function rvHideUI(){
  const b=$('#btnRevancha');if(b)b.classList.add('hidden');
  const s=$('#rvStat');if(s){s.classList.add('hidden');s.textContent='';}
  const r=$('#btnRetry');if(r)r.classList.remove('hidden');
}
function rvCleanup(){
  if(rvTimer){clearInterval(rvTimer);rvTimer=null;}
  rvHideUI();
}
/* anfitrión: pantalla de votación tras el 'over' co-op */
function hostRevanchaUI(){
  net.rvMe=false;net.rvSlots={};
  $('#btnRetry').classList.add('hidden'); /* en co-op no hay "reintentar" en solitario */
  const btn=$('#btnRevancha');btn.classList.remove('hidden');btn.disabled=false;
  btn.textContent='⚔ ¡REVANCHA!';
  const st=$('#rvStat');st.classList.remove('hidden');
  st.textContent='VOTAD TODOS: 0/'+players.length+' · si falta uno, no hay revancha · 30 s';
  rvLeft=30;const tok=++rvToken;
  if(rvTimer)clearInterval(rvTimer);
  rvTimer=setInterval(()=>{
    if(tok!==rvToken){clearInterval(rvTimer);rvTimer=null;return;}
    rvLeft--;
    if(rvLeft<=0){
      clearInterval(rvTimer);rvTimer=null;
      st.textContent='LA REVANCHA EXPIRÓ · podéis salir por MENÚ';
      btn.classList.add('hidden');
      return;
    }
    const votes=(net.rvMe?1:0)+Object.keys(net.rvSlots).length;
    if(votes>=players.length){clearInterval(rvTimer);rvTimer=null;launchRevancha(tok);return;}
    st.textContent=(net.rvMe?'TU VOTO ESTÁ DENTRO · ':'')+'VOTAD TODOS: '+votes+'/'+players.length+' · '+rvLeft+' s';
    if(net.rvMe){btn.disabled=true;btn.textContent='VOTASTE ✓ · ESPERANDO…';}
  },1000);
}
/* anfitrión: unanimidad → cuenta atrás y incursión nueva en la misma sala */
function launchRevancha(tok){
  const st=$('#rvStat');
  sendMsg({t:'ev',k:'rvGo'});
  SFX.relic();vib(60,true);
  let n=3;
  st.textContent='¡TODOS VOTARON! · INCURSIÓN NUEVA EN 3…';
  const iv=setInterval(()=>{
    if(tok!==rvToken){clearInterval(iv);return;}
    n--;
    if(n>0){st.textContent='¡TODOS VOTARON! · INCURSIÓN NUEVA EN '+n+'…';return;}
    clearInterval(iv);rvCleanup();
    startCoop(); /* rearma la incursión: players nuevos, oleada 1, MISMA sala */
  },900);
}
/* cliente: pantalla de votación al recibir 'over' */
function clientRevanchaUI(){
  net.rvMe=false;
  $('#btnRetry').classList.add('hidden');
  const btn=$('#btnRevancha');btn.classList.remove('hidden');btn.disabled=false;
  btn.textContent='⚔ ¡REVANCHA!';
  const st=$('#rvStat');st.classList.remove('hidden');
  st.textContent='Si votáis TODOS, arranca una incursión nueva sin salir de la sala · 30 s';
  rvLeft=30;const tok=++rvToken;
  if(rvTimer)clearInterval(rvTimer);
  rvTimer=setInterval(()=>{
    if(tok!==rvToken){clearInterval(rvTimer);rvTimer=null;return;}
    rvLeft--;
    if(rvLeft<=0){
      clearInterval(rvTimer);rvTimer=null;
      st.textContent='LA REVANCHA EXPIRÓ · podéis salir por MENÚ';
      btn.classList.add('hidden');
      return;
    }
    if(!net.rvMe)st.textContent='Si votáis TODOS, arranca una incursión nueva sin salir de la sala · '+rvLeft+' s';
  },1000);
}
/* cliente: el anfitrión confirmó unanimidad → cuenta atrás visual;
   el 'start' que llega después rearma la incursión (startRunClient) */
function clientRevanchaGo(){
  rvToken++; /* cancela el temporizador de votación */
  if(rvTimer){clearInterval(rvTimer);rvTimer=null;}
  net.rvMe=false;net.rvSlots={};
  const st=$('#rvStat');
  let n=3;
  if(st){st.classList.remove('hidden');st.textContent='¡TODOS VOTARON! · INCURSIÓN NUEVA EN 3…';}
  SFX.relic();vib(60,true);
  const iv=setInterval(()=>{
    n--;
    if(n>0){if(st)st.textContent='¡TODOS VOTARON! · INCURSIÓN NUEVA EN '+n+'…';return;}
    clearInterval(iv);rvHideUI();
  },900);
}
