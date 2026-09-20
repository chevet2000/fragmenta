'use strict';
/* ============ CONTROL TÁCTIL ============ */
const DRAG_GAIN=2.5;
const TOUCH_LEAD=70;
function clampShip(pl,x,y){
  return{x:clamp(x,16,W-16),y:clamp(y,16,H-16)};
}
const activeTouches={};
function slotFromPointer(clientX){
  if(players.length>1)return clientX<W/2?0:1;
  return localSlot;
}
cv.addEventListener('pointerdown',e=>{
  audio();
  if(state!=='play')return;
  const slot=amClient()?localSlot:slotFromPointer(e.clientX);
  const pl=players[slot];
  if(!pl||pl.hp<=0)return;
  activeTouches[e.pointerId]={slot,ax:e.clientX,ay:e.clientY,sx:pl.x,sy:pl.y,px:e.clientX,py:e.clientY,lastMs:performance.now()};
  const p=clampShip(pl,e.clientX,e.clientY-TOUCH_LEAD);
  pl.touch={active:true,tx:p.x,ty:p.y};
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
  const target=clampShip(pl,t.sx+(e.clientX-t.ax)*DRAG_GAIN,t.sy+(e.clientY-t.ay)*DRAG_GAIN);
  pl.touch={active:true,tx:target.x,ty:target.y};
  t.px=e.clientX;t.py=e.clientY;t.lastMs=now;
  t.x=e.clientX;t.y=e.clientY;
  if(amClient()&&t.slot===localSlot){
    if(now-(window._lastSent||0)>60){window._lastSent=now;sendMsg({t:'inp',x:Math.round(pl.x),y:Math.round(pl.y)});}
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
 $('#btnNova').addEventListener('pointerdown',e=>{e.preventDefault();audio();fireNovaLocal();});
 $('#btnEmo').addEventListener('click',()=>{audio();$('#emoPanel').classList.toggle('open');});
 $('#btnEmoClose').addEventListener('click',closeEmoPanel);
 $('#faceRow').querySelectorAll('button').forEach(b=>{
  b.addEventListener('click',()=>{audio();sendEmo(b.dataset.e);closeEmoPanel();});
});
 $('#callRow').querySelectorAll('button').forEach(b=>{
  b.addEventListener('click',()=>{audio();sendCall(b.dataset.k);closeEmoPanel();});
});
 $('#btnPause').addEventListener('click',()=>{if(state==='play')pauseGame();});
 $('#btnPlay').addEventListener('click',()=>{destroyNet();startRun();});
 $('#btnWeekly').addEventListener('click',()=>{destroyNet();startWeekly();});
 $('#btnRetry').addEventListener('click',()=>{
  if(net.mode){netEndLocal(null);return;}
  if(weeklyMode)startWeekly();else startRun();
});
 $('#btnResume').addEventListener('click',()=>{state='play';showScr(null);});
 $('#btnQuit').addEventListener('click',()=>{
  if(net.mode==='host'&&net.connected)sendMsg({t:'ev',k:'end'});
  if(net.mode==='client')sendMsg({t:'bye'});
  persist();goMenu();
});
 $('#btnMenu').addEventListener('click',()=>{persist();goMenu();});
 $('#btnArsenal').addEventListener('click',()=>openShop('menu'));
 $('#btnPShop').addEventListener('click',()=>openShop('pause'));
 $('#btnOShop').addEventListener('click',()=>openShop('over'));
 $('#btnPbShop').addEventListener('click',()=>openShop('post'));
 $('#btnCloseShop').addEventListener('click',()=>{ showScr(shopReturn); });
 $('#btnBuy').addEventListener('click',buyNode);
 $('#btnGuide').addEventListener('click',openGuide);
 $('#btnGuideBack').addEventListener('click',()=>{refreshMenu();showScr('menu');});
 $('#btnAch').addEventListener('click',openAch);
 $('#btnAchBack').addEventListener('click',()=>{refreshMenu();showScr('menu');});
 $('#btnInstall').addEventListener('click',async()=>{
  if(!deferredPrompt)return;
  deferredPrompt.prompt();
  try{await deferredPrompt.userChoice;}catch(e){}
  deferredPrompt=null;
  $('#btnInstall').classList.add('hidden');
});
 $('#btnPbGo').addEventListener('click',()=>{
  if(net.mode==='host'&&players.length===2){
    if(!(net.hostRelic&&net.clientRelic)){
      const pu=$('#pbUnlock');
      pu.classList.add('warn');
      pu.textContent=net.hostRelic?'FALTA LA ELECCIÓN DEL JUGADOR 2…':'ELIGE TU RELIQUIA PRIMERO';
      return;
    }
    showScr(null);
    run.level++;nextWave();
    sendMsg({t:'ev',k:'resume'});
    return;
  }
  showScr(null);
  run.level++;nextWave();
});
 $('#btnSound').addEventListener('click',()=>{muted=!muted;updSoundBtns();});
 $('#btnPSound').addEventListener('click',()=>{muted=!muted;updSoundBtns();});
 $('#btnPMus').addEventListener('click',()=>{save.mus=!save.mus;persist();updSoundBtns();});
 $('#btnFS').addEventListener('click',()=>{goFullscreen();});
 $('#btnAscend').addEventListener('click',()=>{
  if(!ascConfirm){ascConfirm=true;refreshMenu();setTimeout(()=>{ascConfirm=false;refreshMenu();},2500);return;}
  ascConfirm=false;
  save.prest++;save.tree={};save.gold=0;save.gems=0;save.best.lvl=0;save.bestShip=1;
  persist();SFX.relic();vib(60);
  refreshMenu();
});
document.querySelectorAll('#diffRow button').forEach(b=>{
  b.addEventListener('click',()=>{save.diff=b.dataset.d;persist();refreshMenu();});
});
 $('#btnHost').addEventListener('click',()=>{
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
 $('#btnCopy').addEventListener('click',()=>{
  const c=net.code;
  if(navigator.clipboard)navigator.clipboard.writeText(c).catch(()=>{});
  $('#lobbyStat').innerHTML='Código copiado: <b style="color:var(--amber)">'+c+'</b><br>Envíaselo a tu compañero.';
});
 $('#btnLobbyArsenal').addEventListener('click',()=>openShop('lobby'));
 $('#btnLobbyCancel').addEventListener('click',()=>{destroyNet();goMenu();});
 $('#btnStartCoop').addEventListener('click',()=>{if(net.connected)startCoop();});
 $('#btnJoin').addEventListener('click',()=>{
  audio();
  $('#joinInput').value='';
  $('#joinStat').innerHTML='Pide el código de 5 letras a tu compañero.<br><span class="prof">USARÁS TU PERFIL ONLINE (separado del local)</span>';
  showScr('join');state='joinmenu';
});
 $('#joinInput').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');});
 $('#btnJoinGo').addEventListener('click',()=>{
  const c=$('#joinInput').value.trim();
  if(c.length!==5){$('#joinStat').innerHTML='<span class="err">El código tiene 5 caracteres.</span>';return;}
  joinRoom(c);
});
 $('#btnJoinCancel').addEventListener('click',()=>{destroyNet();goMenu();});
 $('#btnNwSolo').addEventListener('click',()=>{
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
 $('#btnNwCancel').addEventListener('click',()=>{
  if(net.mode==='host'&&net.connected)sendMsg({t:'ev',k:'end'});
  netEndLocal(null);
});
 $('#btnExp').addEventListener('click',()=>{
  const code=exportProfile();
  $('#profBox').classList.remove('hidden');
  $('#profIO').value=code;
  $('#profIO').readOnly=true;
  $('#profMsg').className='ok';
  $('#profMsg').textContent='Copia este código y pégalo en el otro dispositivo (IMPORTAR).';
  copyText(code,null);
});
 $('#btnImp').addEventListener('click',()=>{
  $('#profBox').classList.remove('hidden');
  $('#profIO').value='';
  $('#profIO').readOnly=false;
  $('#profMsg').className='';
  $('#profMsg').textContent='Pega aquí el código del otro perfil y pulsa EJECUTAR.';
  $('#profBox').dataset.mode='imp';
});
 $('#btnProfGo').addEventListener('click',()=>{
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

