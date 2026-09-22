'use strict';
/* ============ CONTROL TÁCTIL ============ */
const DRAG_GAIN=2.5;
const TOUCH_LEAD=70;
function clampShip(pl,x,y){
  return{x:clamp(x,16,W-16),y:clamp(y,16,H-16)};
}
const activeTouches={};
function slotFromPointer(clientX){
  /* v4.15: con 3 naves, la pantalla se divide en tercios */
  if(players.length>2)return clientX<W/3?0:clientX<2*W/3?1:2;
  if(players.length>1)return clientX<W/2?0:1;
  return localSlot;
}
cv.addEventListener('pointerdown',e=>{
  audio();
  if(state!=='play')return;
  /* v4.25: en ONLINE cada piloto mueve SOLO su nave (antes el anfitrión
     arrastraba la del rival al tocar la otra mitad de la pantalla — y era la
     ÚNICA forma de moverla, porque los mensajes del cliente nunca salían).
     En co-op LOCAL (un dispositivo) se mantiene la pantalla dividida. */
  const slot=net.mode?localSlot:slotFromPointer(e.clientX);
  const pl=players[slot];
  if(!pl||pl.hp<=0)return;
  activeTouches[e.pointerId]={slot,ax:e.clientX,ay:e.clientY,sx:pl.x,sy:pl.y,px:e.clientX,py:e.clientY,lastMs:performance.now()};
  const p=clampShip(pl,e.clientX,e.clientY-TOUCH_LEAD);
  pl.touch={active:true,tx:p.x,ty:p.y};
  /* v4.8: el cliente anuncia su posición al instante (la nave remota no espera al primer movimiento) */
  if(amClient())sendMsg({t:'inp',x:Math.round(pl.x),y:Math.round(pl.y),ne:pl.noElec?1:0});
});
window.addEventListener('pointermove',e=>{
  if(state!=='play')return;
  const t=activeTouches[e.pointerId];
  if(!t)return;
  const pl=players[t.slot];
  if(!pl||pl.hp<=0){delete activeTouches[e.pointerId];return;}
  const now=performance.now();
  const dx=e.clientX-t.px,dy=e.clientY-t.py;
  const dtm=now-t.lastMs;
  if(pl.dash&&pl.dashCd<=0&&dtm<70&&Math.hypot(dx,dy)>30){
    const d=Math.hypot(dx,dy);
    pl.x=clamp(pl.x+dx/d*Math.min(120,d*2.6),16,W-16);
    pl.y=clamp(pl.y+dy/d*Math.min(70,d*1.4),16,H-16);
    pl.invul=Math.max(pl.invul,.35);pl.dashCd=pl.dashFast?1.2:2.2;
    floater(pl.x,pl.y-26,'DASH','#64C7FF',11);
    tone(900,300,.1,'sine',.04);
    t.ax=e.clientX;t.ay=e.clientY;t.sx=pl.x;t.sy=pl.y;
  }
  const DG=DRAG_GAIN*curseMoveMul(); /* v4.17: TORPEZA — los mandos pesan */
  const target=clampShip(pl,t.sx+(e.clientX-t.ax)*DG,t.sy+(e.clientY-t.ay)*DG);
  pl.touch={active:true,tx:target.x,ty:target.y};
  t.px=e.clientX;t.py=e.clientY;t.lastMs=now;
  t.x=e.clientX;t.y=e.clientY;
  if(amClient()&&t.slot===localSlot){
    if(now-(window._lastSent||0)>60){window._lastSent=now;sendMsg({t:'inp',x:Math.round(pl.x),y:Math.round(pl.y),ne:pl.noElec?1:0});}
  }
});
function endTouch(e){
  const t=activeTouches[e.pointerId];
  if(t){
    const pl=players[t.slot];
    if(pl)pl.touch=null;
    delete activeTouches[e.pointerId];
  }
}
window.addEventListener('pointerup',endTouch);
window.addEventListener('pointercancel',endTouch);
document.addEventListener('touchmove',e=>{if(e.target===cv)e.preventDefault();},{passive:false});

/* ---- LISTENERS ---- */
 bindEl('#btnNova', 'pointerdown',e=>{e.preventDefault();audio();fireNovaLocal();});
 bindEl('#btnEmo', 'click',()=>{audio();$('#emoPanel').classList.toggle('open');});
 bindEl('#btnEmoClose', 'click',closeEmoPanel);
 $('#faceRow').querySelectorAll('button').forEach(b=>{
  b.addEventListener('click',()=>{audio();sendEmo(b.dataset.e);closeEmoPanel();});
});
 $('#callRow').querySelectorAll('button').forEach(b=>{
  b.addEventListener('click',()=>{audio();sendCall(b.dataset.k);closeEmoPanel();});
});
 bindEl('#btnPause', 'click',()=>{if(state==='play')pauseGame();});
 bindEl('#btnPlay', 'click',()=>{destroyNet();startRun();});
 bindEl('#btnWeekly', 'click',()=>{destroyNet();startWeekly();});
 bindEl('#btnDaily', 'click',()=>{destroyNet();startDaily();}); /* v4.12: reto diario */
 bindEl('#btnFrenzy', 'click',()=>{destroyNet();startFrenzy();}); /* v4.9: modo frenético */
 /* v4.12: pantallas nuevas del menú */
 bindEl('#btnHangar', 'click',openHangar);
 bindEl('#btnHangarBack', 'click',()=>{refreshMenu();showScr('menu');});
 bindEl('#btnMissions', 'click',openMissions);
 bindEl('#btnMissionsBack', 'click',()=>{refreshMenu();showScr('menu');});
 bindEl('#btnStats', 'click',openStats);
 bindEl('#btnStatsBack', 'click',()=>{refreshMenu();showScr('menu');});
 bindEl('#btnBest', 'click',openBestiary);
 bindEl('#btnBestBack', 'click',()=>{refreshMenu();showScr('menu');});
 bindEl('#btnGemX', 'click',()=>{ /* v4.9: mercado de gemas · v4.20: precio en escalera */
  const pr=gemXPrice();
  if(save.gold<pr){banner('ORO INSUFICIENTE','El cambio Nº '+((save.gemxBuys||0)+1)+' cuesta '+pr+' de oro');return;}
  save.gold-=pr;save.gems+=GEMX_GEMS;
  save.gemxBuys=(save.gemxBuys||0)+1;
  persist();SFX.buy();vib(25);
  banner('CAMBIO Nº '+save.gemxBuys+' HECHO','+'+GEMX_GEMS+' gemas · el próximo costará '+gemXPrice()+' de oro');
  updateShopRes();
 });
 bindEl('#btnRetry', 'click',()=>{
  if(net.mode){netEndLocal(null);return;}
  if(dailyMode)startDaily(); /* v4.12 */
  else if(weeklyMode)startWeekly();
  else startRun();
});
 /* v4.28: DESPLIEGUE — confirmar o guardar todo para luego */
 bindEl('#btnDeployGo', 'click',()=>{ if(state==='deploy')confirmDeploy(false); });
 bindEl('#btnDeploySkip', 'click',()=>{ if(state==='deploy')confirmDeploy(true); });
 /* v4.28: REVANCHA — votar (el anfitrión cuenta los votos en hostRevanchaUI) */
 bindEl('#btnRevancha', 'click',()=>{
  audio();SFX.buy();vib(40);
  const btn=$('#btnRevancha');
  if(net.mode==='client'){
    if(net.rvMe)return;
    net.rvMe=true;
    sendMsg({t:'rvY'});
    if(btn){btn.disabled=true;btn.textContent='VOTASTE ✓ · ESPERANDO…';}
    return;
  }
  if(net.mode==='host')net.rvMe=true; /* el temporizador de hostRevanchaUI lo cuenta */
 });
 bindEl('#btnResume', 'click',()=>{state='play';showScr(null);});
 bindEl('#btnQuit', 'click',()=>{
  if(net.mode==='host'&&net.connected)sendMsg({t:'ev',k:'end'});
  if(net.mode==='client')sendMsg({t:'bye'});
  persist();goMenu();
});
 bindEl('#btnMenu', 'click',()=>{persist();goMenu();});
 bindEl('#btnArsenal', 'click',()=>openShop('menu'));
 bindEl('#btnPShop', 'click',()=>openShop('pause'));
 bindEl('#btnOShop', 'click',()=>openShop('over'));
 bindEl('#btnPbShop', 'click',()=>openShop('post'));
 bindEl('#btnCloseShop', 'click',()=>{ showScr(shopReturn); });
 bindEl('#btnBuy', 'click',buyNode);
 /* v4.24: COMPRA MASIVA — desbloquea en cadena todo lo disponible y pagadero */
 bindEl('#btnBuyAll', 'click',()=>{audio();buyAll();});
 bindEl('#btnGuide', 'click',openGuide);
 bindEl('#btnGuideBack', 'click',()=>{refreshMenu();showScr('menu');});
 bindEl('#btnAch', 'click',openAch);
 bindEl('#btnAchBack', 'click',()=>{refreshMenu();showScr('menu');});
/* v4.15: engranaje de AJUSTES + novedades colapsables + avatar */
 bindEl('#btnSettings', 'click',openSettings);
 bindEl('#btnSettingsBack', 'click',()=>{refreshMenu();showScr('menu');});
 bindEl('#menuPilot', 'click',openSettings);
 bindEl('#btnSetHangar', 'click',openHangar);
 bindEl('#btnTag', 'click',()=>{
  audio();
  const body=$('#tagBody');
  const open=!body.classList.contains('hidden');
  body.classList.toggle('hidden',open);
  $('#btnTag').textContent=open?'▸ NOVEDADES DE LA v'+VERSION:'▾ OCULTAR NOVEDADES';
  try{localStorage.setItem('frag_tagopen',open?'0':'1');}catch(e){}
});
 bindEl('#btnEditPilot2','click',()=>{audio();
  const pe=$('#pilotEdit2'),be=$('#btnEditPilot2'),i=$('#pilotInput2');
  if(pe)pe.classList.remove('hidden');
  if(be)be.classList.add('hidden');
  if(i){i.value=getPilot();setTimeout(()=>i.focus(),60);}
});
 bindEl('#btnPilotCancel2','click',()=>{audio();
  $('#pilotEdit2').classList.add('hidden');$('#btnEditPilot2').classList.remove('hidden');
});
function savePilotFromSettings(){
  audio();
  const i=$('#pilotInput2');
  const err=setPilot(i?i.value:'');
  if(err){banner('NOMBRE NO VÁLIDO',err);SFX.hurt();return;}
  $('#pilotEdit2').classList.add('hidden');
  $('#btnEditPilot2').classList.remove('hidden');
  openSettings();refreshMenu();
  banner('NOMBRE GUARDADO',getPilot()+' · viaja en el ranking y en co-op');
}
 bindEl('#btnPilotSave2','click',savePilotFromSettings);
 bindEl('#pilotInput2','keydown',e=>{if(e.key==='Enter'){e.preventDefault();savePilotFromSettings();}});
 bindEl('#btnSMus', 'click',()=>{save.mus=!save.mus;persist();updSoundBtns();if(!save.mus)musStop();else if(!runActive&&actx)musStart();});
/* v4.8: BORRAR PARTIDA — reinicia el perfil local (doble toque de confirmación) */
let wipeArm=false,wipeT=null;
 bindEl('#btnWipe', 'click',()=>{
  const b=$('#btnWipe');
  if(!wipeArm){
    wipeArm=true;b.textContent='¿BORRAR TODO? TOCA DE NUEVO';b.classList.add('danger');
    clearTimeout(wipeT);wipeT=setTimeout(()=>{wipeArm=false;b.textContent='BORRAR PARTIDA';b.classList.remove('danger');},2600);
    return;
  }
  wipeArm=false;clearTimeout(wipeT);
  b.textContent='BORRAR PARTIDA';b.classList.remove('danger');
  const pilot=save.pilot,mus=save.mus,diff=save.diff;
  save.tree={};save.gold=0;save.gems=0;save.best={lvl:0,kills:0};save.bestShip=1;save.bestAll=0;
  save.prest=0;save.totKills=0;save.runs=0;save.totElite=0;save.totRescue=0;
  save.totChest=0;save.totCamp=0;save.bestHard=0;save.bossKills={};save.weekly=null;save.weekBestAll=0;
  save.ranking=[];save.ach={};save.achClaimed={};save.mShots=0;save.mHits=0;save.mDmg=0;save.mTaken=0;save.mPerfect=0;
  /* v4.12: también se reinician diario, misiones, hangar, combos, stats y bestiario */
  save.daily={seed:null,best:0};save.dailyBest=0;save.dailyM=null;
  save.skins={owned:['menta'],eq:null};save.bestCombo=0;save.totGold=0;save.totGems=0;save.seen={};
  /* v4.14–4.17: contadores y trazas nuevas también se reinician */
  save.totDevour=0;save.biomesSeen={};save.ghost=null;save.ghostBeat=false;save.totPhase5=0;save.totMage=0;
  save.totCurses=0;save.totRevKills=0;
  /* v4.19: racha de misiones y meteoritos */
  save.streak=0;save.streakBest=0;save.streakLast='';save.totMeteor=0;
  /* v4.20: escalera de gemas, hitos de racha, cubos, naves amigas, púrpura y portales */
  save.gemxBuys=0;save.streakClaimed={};save.totCube=0;save.totAlly=0;save.totMeteorP=0;save.totPortal=0;save.seenCube=0;
  /* v4.21: LA BÓVEDA — cofres sellados, mejoras armadas y contadores */
  save.vault={c:0,r:0,e:0,l:0};save.armed=[];save.totVault=0;save.totVaultOpen=0;save.totVaultL=0;
  /* v4.23: récords por modo y Mercader Pirata */
  save.bestMode={solo:0,normal:0,dificil:0,hardcore:0,coop:0};save.merc={d:'',buys:{}};save.totMerc=0;
  save.pilot=pilot;save.mus=mus;save.diff=diff; /* se conservan identidad, sonido y dificultad */
  persist();
  try{localStorage.setItem(KEY_LOCAL,JSON.stringify(save));}catch(e){}
  recompute();refreshMenu();
  SFX.hurt();vib(80,true);
  banner('PARTIDA BORRADA','Progreso local reiniciado por completo');
});
 bindEl('#btnInstall', 'click',async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();
  try{await deferredPrompt.userChoice;}catch(e){}
  deferredPrompt=null;
  $('#btnInstall').classList.add('hidden');
});
 bindEl('#btnPbGo', 'click',()=>{
  if(state!=='postboss')return;
  if(net.mode==='client')return;
  if(net.mode==='host'&&players.length===2){
    if(!(net.hostRelic&&net.clientRelic)){
      const pu=$('#pbUnlock');
      pu.classList.add('warn');
      pu.textContent=net.hostRelic?'FALTA LA ELECCIÓN DEL JUGADOR 2…':'ELIGE TU RELIQUIA PRIMERO';
      return;
    }
    showScr(null);
    state='play';
    run.level++;nextWave();
    sendMsg({t:'ev',k:'resume'});
    return;
  }
  showScr(null);
  state='play';
  run.level++;nextWave();
});
 bindEl('#btnSound', 'click',()=>{muted=!muted;updSoundBtns();});
 bindEl('#btnPSound', 'click',()=>{muted=!muted;updSoundBtns();});
 bindEl('#btnPMus', 'click',()=>{save.mus=!save.mus;persist();updSoundBtns();});
 bindEl('#btnFS', 'click',()=>{goFullscreen();});
 bindEl('#btnAscend', 'click',()=>{
  if(!ascConfirm){ascConfirm=true;refreshMenu();setTimeout(()=>{ascConfirm=false;refreshMenu();},2500);return;}
  ascConfirm=false;
  save.prest++;save.tree={};save.gold=0;save.gems=0;save.best.lvl=0;save.bestShip=1;
  /* v4.21: el ascenso también vacía la Bóveda (empiezas de cero) */
  save.vault={c:0,r:0,e:0,l:0};save.armed=[];
  /* v4.23: el ascenso limpia las compras del día del pirata (los récords
     por modo se conservan, como bestAll) */
  save.merc={d:'',buys:{}};
  persist();SFX.relic();vib(60);
  refreshMenu();
});
document.querySelectorAll('#diffRow button').forEach(b=>{
  b.addEventListener('click',()=>{save.diff=b.dataset.d;persist();refreshMenu();});
});
 bindEl('#btnHost', 'click',()=>{
  audio();goFullscreen();
  net.lobbyDiff='normal';
  $('#lobbyDiffRow').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.d==='normal'));
  hostLobby();
});
 $('#lobbyDiffRow').querySelectorAll('button').forEach(b=>{
  b.addEventListener('click',()=>{
    net.lobbyDiff=b.dataset.d;
    $('#lobbyDiffRow').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
  });
});
 bindEl('#btnCopy', 'click',()=>{
  const c=net.code;
  if(navigator.clipboard)navigator.clipboard.writeText(c).catch(()=>{});
  $('#lobbyStat').innerHTML='Código copiado: <b style="color:var(--amber)">'+c+'</b><br>Envíaselo a tu compañero.';
});
 bindEl('#btnLobbyArsenal', 'click',()=>openShop('lobby'));
 bindEl('#btnLobbyCancel', 'click',()=>{destroyNet();goMenu();});
 bindEl('#btnStartCoop', 'click',()=>{
  if(!net.connected)return;
  /* v4.26: doble comprobación de sincronía — sin el ranking de todos los
     pilotos la partida no arranca (el botón ya viene disabled desde lobbyStatus) */
  if(!canStartCoop()){banner('SINCRONIZANDO…','El ranking de los pilotos aún viaja · espera un momento');return;}
  startCoop();
});
 bindEl('#btnJoin', 'click',()=>{
  audio();
  $('#joinInput').value='';
  $('#joinStat').innerHTML='Pide el código de 5 letras a tu compañero.<br><span class="prof">USARÁS TU PERFIL ONLINE (separado del local)</span>';
  showScr('join');state='joinmenu';
});
 bindEl('#joinInput', 'input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');});
 bindEl('#btnJoinGo', 'click',()=>{
  const c=$('#joinInput').value.trim();
  if(c.length!==5){$('#joinStat').innerHTML='<span class="err">El código tiene 5 caracteres.</span>';return;}
  joinRoom(c);
});
 bindEl('#btnJoinCancel', 'click',()=>{destroyNet();goMenu();});
 /* v4.26: escáner de QR de sala — la cámara lee el código del anfitrión */
 bindEl('#btnScan', 'click',()=>{openScanner();});
 bindEl('#btnScanClose', 'click',()=>{closeScanner();});
 bindEl('#btnNwSolo', 'click',()=>{
  if(net.mode==='host'&&runActive){
    sendMsg({t:'ev',k:'end'});
    destroyNet();
    players=[players[0]];
    P=players[0];
    wrecks=wrecks.filter(w=>w.slot===0);
    recompute();
    $('#netWait').classList.add('hidden');
    $('#netTag').classList.add('hidden');
    $('#btnNwSolo').classList.add('hidden');
    state='play';
  }
});
 bindEl('#btnNwCancel', 'click',()=>{
  if(net.mode==='host'&&net.connected)sendMsg({t:'ev',k:'end'});
  netEndLocal(null);
});
 bindEl('#btnExp', 'click',()=>{
  const code=exportProfile();
  $('#profBox').classList.remove('hidden');
  $('#profIO').value=code;
  $('#profIO').readOnly=true;
  $('#profMsg').className='ok';
  $('#profMsg').textContent='Copia este código y pégalo en el otro dispositivo (IMPORTAR).';
  copyText(code,null);
});
 bindEl('#btnImp', 'click',()=>{
  $('#profBox').classList.remove('hidden');
  $('#profIO').value='';
  $('#profIO').readOnly=false;
  $('#profMsg').className='';
  $('#profMsg').textContent='Pega aquí el código del otro perfil y pulsa EJECUTAR.';
  $('#profBox').dataset.mode='imp';
});
 bindEl('#btnProfGo', 'click',()=>{
  const m=$('#profMsg');
  if($('#profBox').dataset.mode!=='imp'){
    m.className='err';m.textContent='Pulsa primero IMPORTAR PERFIL para pegar un código.';
    return;
  }
  const err=importProfile($('#profIO').value);
  if(err){m.className='err';m.textContent=err;return;}
  m.className='ok';
  m.textContent='✓ PERFIL IMPORTADO · '+ownedCount()+'/'+TREE.length+' mejoras · '+save.gold+' oro';
  recompute();
  renderTree();updateShopRes();selectNode(null);
  if(net.mode==='client')sendMsg({t:'stats',b:computeStatblock()});
  refreshMenu();
  SFX.buy();vib(40);
});
function updSoundBtns(){
  $('#btnSound').textContent='SONIDO: '+(muted?'NO':'SÍ');
  $('#btnPSound').textContent='SONIDO: '+(muted?'NO':'SÍ');
  $('#btnPMus').textContent='MÚSICA: '+(save.mus?'SÍ':'NO');
  const sm=$('#btnSMus');if(sm)sm.textContent='MÚSICA: '+(save.mus?'SÍ':'NO');
}
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){
    persist();
    for(const pl of players)pl.touch=null;
    for(const k in activeTouches)delete activeTouches[k];
    if(state==='play'&&net.mode!=='client')pauseGame();
  }
});
document.addEventListener('pointerdown',audio,{once:true});
if(document.fonts&&document.fonts.load)document.fonts.load('700 20px "Chakra Petch"');
window.addEventListener('beforeunload',()=>{
  if(net.mode==='host'&&net.connected)sendMsg({t:'ev',k:'end'});
  persist();
});
buildManifest();
refreshMenu();updSoundBtns();
/* v4.15: estado recordado de las novedades colapsables del menú */
try{if(localStorage.getItem('frag_tagopen')==='1'){
  $('#tagBody').classList.remove('hidden');
  $('#btnTag').textContent='▾ OCULTAR NOVEDADES';
}}catch(e){}

