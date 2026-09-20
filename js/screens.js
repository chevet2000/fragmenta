'use strict';
/* ============ pantallas ============ */
const scr={menu:$('#scrMenu'),rank:$('#scrRank'),guide:$('#scrGuide'),ach:$('#scrAch'),chest:$('#scrChest'),lobby:$('#scrLobby'),join:$('#scrJoin'),level:$('#scrLevel'),post:$('#scrPost'),shop:$('#scrShop'),pause:$('#scrPause'),over:$('#scrOver'),
  /* v4.12: hangar de naves, misiones diarias, perfil y bestiario */
  hangar:$('#scrHangar'),missions:$('#scrMissions'),stats:$('#scrStats'),best:$('#scrBest')};
function showScr(k){for(const s in scr)scr[s].classList.toggle('show',s===k);}
function closeEmoPanel(){ $('#emoPanel').classList.remove('open'); }
function setChoiceNote(txt){
  const box=$('#cards');
  let n=box.querySelector('.choicenote');
  if(!n){n=document.createElement('div');n.className='choicenote';box.appendChild(n);}
  n.textContent=txt;
}
function markChoiceDone(who){
  document.querySelectorAll('#cards .card').forEach(el=>{el.disabled=true;});
  setChoiceNote('✓ '+who+' · ESPERANDO AL OTRO JUGADOR…');
}
function setRelicNote(txt){
  const box=$('#relicCards');
  let n=box.querySelector('.choicenote');
  if(!n){n=document.createElement('div');n.className='choicenote';box.appendChild(n);}
  n.textContent=txt;
}
function markRelicDone(who){
  document.querySelectorAll('#relicCards .rbtn').forEach(el=>{el.disabled=true;});
  setRelicNote('✓ '+who+' · ESPERANDO AL OTRO JUGADOR…');
}
function refreshMenu(){
  $('#mBest').textContent=save.bestAll?`RÉCORD · OLEADA ${save.bestAll}`:'PRIMERA INCURSIÓN';
  $('#mGold').innerHTML=`${icoGold} ${save.gold}`;
  $('#mGems').innerHTML=`${icoGem} ${save.gems}`;
  $('#mPrest').textContent=save.prest>0?`ASCENSOS ×${save.prest}`:'';
  $('#btnArsenal').textContent=`ARSENAL · ÁRBOL (${ownedCount()}/${TREE.length})`;
  const na=ACHS.filter(a=>save.ach[a.id]).length;
  $('#btnAch').textContent=`LOGROS (${na}/${ACHS.length})`;
  const wb=(save.weekly&&save.weekly.seed===weekSeed())?save.weekly.best:0;
  $('#btnWeekly').textContent=`DESAFÍO SEMANAL · RÉCORD ${wb}`;
  /* v4.12: reto diario, misiones, hangar y nuevas pantallas */
  const db=(save.daily&&save.daily.seed===daySeed())?(save.daily.best||0):0;
  $('#btnDaily').textContent=`RETO DIARIO · RÉCORD ${db}`;
  ensureDailyM();
  $('#btnMissions').textContent=`MISIONES DEL DÍA (${dailyMDone()}/3)`;
  const sk=getSkin();
  $('#btnHangar').textContent=`HANGAR · NAVE (${sk.name})`;
  const nr=(save.ranking||[]).length;
  $('#btnRank').textContent=`RANKING SEMANAL (${nr})`;
  $('#diffName').textContent=DIFF_LABEL[save.diff]||'SOLO ×1';
  document.querySelectorAll('#diffRow button').forEach(b=>b.classList.toggle('on',b.dataset.d===save.diff));
  const asc=$('#btnAscend');
  asc.classList.toggle('hidden',save.bestAll<50);
  asc.textContent=ascConfirm?'¿SEGURO? TOCA DE NUEVO':`ASCENDER ×${save.prest+1} (+25% ORO)`;
}
function openRank(){
  const pilot=getPilot();
  const ws=weekSeed();
  $('#rankWeek').textContent=ws;
  $('#pilotCode').textContent=pilot;
  /* v4.11: editor de nombre cerrado por defecto */
  const pe=$('#pilotEdit'),be=$('#btnEditPilot');
  if(pe)pe.classList.add('hidden');
  if(be)be.classList.remove('hidden');
  const mine=(save.ranking||[]).find(r=>r.seed===ws&&r.code===pilot);
  $('#pilotRec').innerHTML=mine
    ?('RÉCORD DE ESTA SEMANA<br>OLEADA '+mine.wave+' · NAVE NV '+mine.ship)
    :'Aún sin registro esta semana.<br>Juega el DESAFÍO SEMANAL para generarlo.';
  renderRankList();
  showScr('rank');
}
function renderRankList(){
  const box=$('#rankList');box.innerHTML='';
  const list=sortedRanking();
  if(list.length===0){
    box.innerHTML='<div style="font-size:10px;letter-spacing:.2em;color:var(--dim);text-align:center;padding:10px 0">'+
      'SIN REGISTROS · los ranking se sincronizan solos<br>al conectaros en el lobby co-op</div>';
    return;
  }
  list.forEach((r,i)=>{
    const el=document.createElement('div');
    el.className='rentry'+(i===0?' p1':i===1?' p2':i===2?' p3':'')+(r.ok?'':' unv');
    const medal=i<3?['1','2','3'][i]:(i+1);
    el.innerHTML=`<div class="rk">${medal}</div>`+
      `<div class="rt"><b>${r.code}</b><small>${r.seed}${r.ok?'':' · sin verificar'}</small></div>`+
      `<div class="rw">${r.wave}<small>OLEADA</small></div>`+
      `<button class="rdel" data-c="${r.code}" data-s="${r.seed}">×</button>`;
    box.appendChild(el);
  });
  box.querySelectorAll('.rdel').forEach(b=>{
    b.addEventListener('click',()=>{
      save.ranking=(save.ranking||[]).filter(r=>!(r.code===b.dataset.c&&r.seed===b.dataset.s));
      persist();renderRankList();
    });
  });
  const ws=weekSeed();
  const pilot=getPilot();
  let card=sortedRanking().find(r=>r.seed===ws&&r.code===pilot);
  if(!card)card=sortedRanking().find(r=>r.seed===ws);
  drawRankCard($('#rankCard'),card||{seed:ws});
}
 /* v4.8: eliminado añadir/copiar registros por código — el ranking se
    sincroniza automáticamente al conectar dos jugadores en el lobby co-op */
 bindEl('#btnRank', 'click',openRank);
 bindEl('#btnRankBack', 'click',()=>{refreshMenu();showScr('menu');});
/* v4.11: editor del nombre de piloto — el nombre se usa en el ranking,
   viaja en el co-op (lobby) y en la copia de perfil (FRGT2). Al cambiar,
   tus récords guardados se renombran y re-firman al nuevo nombre. */
function closePilotEdit(){
  const pe=$('#pilotEdit'),be=$('#btnEditPilot');
  if(pe)pe.classList.add('hidden');
  if(be)be.classList.remove('hidden');
}
bindEl('#btnEditPilot','click',()=>{audio();
  const pe=$('#pilotEdit'),be=$('#btnEditPilot'),i=$('#pilotInput');
  if(pe)pe.classList.remove('hidden');
  if(be)be.classList.add('hidden');
  if(i){i.value=getPilot();setTimeout(()=>i.focus(),60);}
});
bindEl('#btnPilotCancel','click',()=>{audio();closePilotEdit();});
function savePilotFromInput(){
  audio();
  const i=$('#pilotInput'),m=$('#rankMsg');
  const err=setPilot(i?i.value:'');
  if(err){if(m){m.textContent=err;m.classList.add('err');}return;}
  if(m){m.textContent='';m.classList.remove('err');}
  closePilotEdit();openRank();
}
bindEl('#btnPilotSave','click',savePilotFromInput);
bindEl('#pilotInput','keydown',e=>{if(e.key==='Enter'){e.preventDefault();savePilotFromInput();}});
function openGuide(){
  const box=$('#guideList');box.innerHTML='';
  for(const key of BOSS_ORDER){
    const D=BOSS_DEFS[key];
    const el=document.createElement('div');
    el.className='grow';
    const c=document.createElement('canvas');
    c.width=c.height=72;
    const g=c.getContext('2d');
    g.save();g.translate(36,36);
    g.strokeStyle=D.color;g.lineWidth=2;
    g.fillStyle='rgba(255,255,255,.05)';
    shapePath(g,D.shape,26);
    g.fill();g.stroke();
    g.strokeStyle='rgba(255,255,255,.25)';g.lineWidth=1;
    for(let i=0;i<9;i++){const a=i*TAU/9;g.beginPath();g.arc(0,0,33,a,a+.4);g.stroke();}
    g.restore();
    el.appendChild(c);
    const t=document.createElement('div');
    t.className='at';
    t.innerHTML=`<b style="color:${D.color}">${D.name}</b><span class="gm">${D.mech}</span><span class="gt">◈ ${D.tip}</span>`;
    el.appendChild(t);
    box.appendChild(el);
  }
  showScr('guide');
}
function openAch(){
  const box=$('#achList');box.innerHTML='';
  ACHS.forEach(a=>{
    const done=!!save.ach[a.id];
    const el=document.createElement('div');
    el.className='arow'+(done?' done':'');
    el.innerHTML=`<div class="amk">${done?'✓':''}</div><div class="at"><b>${a.name}</b><small>${a.desc}</small></div><div class="arw">${icoGem}${a.rw}</div>`;
    box.appendChild(el);
  });
  showScr('ach');
}
/* ============ v4.12: HANGAR · aspectos de nave ============ */
function openHangar(){
  const box=$('#hangarList');box.innerHTML='';
  if(!save.skins)save.skins={owned:['menta'],eq:null};
  if(!(save.skins.owned||[]).includes('menta'))save.skins.owned.unshift('menta');
  const eqId=save.skins.eq||'menta';
  for(const s of SKINS){
    const owned=(save.skins.owned||[]).includes(s.id);
    const eq=eqId===s.id;
    const el=document.createElement('div');
    el.className='skrow'+(eq?' eq':'');
    const c=document.createElement('canvas');c.width=c.height=56;
    const g=c.getContext('2d');
    g.save();g.translate(28,28);
    drawShipIcon(g,1.7,s.color==='prisma'?'#FFD166':s.color,s.color==='prisma'?'#FFD166':s.color);
    g.restore();
    el.appendChild(c);
    const t=document.createElement('div');t.className='at';
    t.innerHTML=`<b style="color:${s.color==='prisma'?'#FFD166':s.color}">${s.name}</b>`+
      `<small>${eq?'EQUIPADA':(owned?'toca EQUIPAR':s.cost+' de oro')}</small>`;
    el.appendChild(t);
    const b=document.createElement('button');
    b.className='skbtn'+(eq?' on':'');
    b.textContent=eq?'✓':(owned?'EQUIPAR':'COMPRAR');
    b.addEventListener('click',()=>{
      audio();
      if(eq)return;
      if(!owned){
        if(save.gold<s.cost){banner('ORO INSUFICIENTE',s.name+' cuesta '+s.cost+' de oro');SFX.hurt();return;}
        save.gold-=s.cost;
        save.skins.owned.push(s.id);
        banner('ASPECTO CONSEGUIDO',s.name+' ya es tuyo');
        checkAch();
      }
      save.skins.eq=s.id;persist();
      SFX.buy();vib(30);
      openHangar();refreshMenu();
    });
    el.appendChild(b);
    box.appendChild(el);
  }
  showScr('hangar');
}
/* ============ v4.12: MISIONES DIARIAS ============ */
function openMissions(){
  ensureDailyM();
  const box=$('#missList');box.innerHTML='';
  for(const m of save.dailyM.l){
    const el=document.createElement('div');
    el.className='arow'+(m.done?' done':'');
    const pct=clamp(m.p/m.n*100,0,100);
    el.innerHTML=`<div class="amk">${m.done?'✓':'·'}</div>`+
      `<div class="at"><b>${m.txt}</b><small>HOY · ${m.p}/${m.n} · el progreso se comparte entre partidas</small>`+
      `<div class="mbar"><i style="width:${pct}%"></i></div></div>`+
      `<div class="arw">${icoGold}${m.rw}${m.gem?'<br>'+icoGem+m.gem:''}</div>`;
    box.appendChild(el);
  }
  showScr('missions');
}
/* ============ v4.12: PERFIL DE PILOTO · estadísticas totales ============ */
function openStats(){
  const acc=(save.mShots||0)>0?Math.round((save.mHits||0)/save.mShots*100):0;
  const rows=[
    ['PILOTO',getPilot()],
    ['PARTIDAS JUGADAS',save.runs||0],
    ['MEJOR OLEADA',save.bestAll||0],
    ['OLEADA EN HARDCORE',save.bestHard||0],
    ['NAVE MÁXIMA','NV '+save.bestShip],
    ['BAJAS TOTALES',save.totKills||0],
    ['ÉLITES CAZADOS',save.totElite||0],
    ['CAMPESINOS',save.totCamp||0],
    ['COFRES ABIERTOS',save.totChest||0],
    ['COMBO MÁXIMO','×'+(save.bestCombo||0)],
    ['PRECISIÓN (TOTAL)',acc+'% · '+(save.mShots||0)+' disparos'],
    ['DAÑO INFLIGIDO',Math.round(save.mDmg||0)],
    ['DAÑO RECIBIDO',Math.round(save.mTaken||0)],
    ['JEFES SIN DAÑO',save.mPerfect||0],
    ['ORO RECOGIDO',save.totGold||0],
    ['GEMAS CONSEGUIDAS',save.totGems||0],
    ['RÉCORD SEMANAL','OLEADA '+(save.weekBestAll||0)],
    ['RETO DIARIO',(save.daily&&save.daily.seed===daySeed()&&save.daily.best>0)?('HOY · OLEADA '+save.daily.best):((save.dailyBest||0)?('MEJOR · OLEADA '+save.dailyBest):'—')],
    ['FRENÉTICO',save.frenzy&&(save.frenzy.bestT||save.frenzy.bestK)?('MEJOR '+fmtT(save.frenzy.bestT)+' · '+save.frenzy.bestK+' BAJAS'):'—'],
    ['ASCENSOS',save.prest||0],
  ];
  const box=$('#statsList');box.innerHTML='';
  for(const [k,v] of rows){
    const el=document.createElement('div');el.className='strow';
    el.innerHTML=`<small>${k}</small><b>${v}</b>`;
    box.appendChild(el);
  }
  showScr('stats');
}
/* ============ v4.12: BESTIARIO ============ */
function openBestiary(){
  const box=$('#bestList');box.innerHTML='';
  const items=TKLIST.map(tk=>({tk,name:BESTIARY[tk].name,desc:BESTIARY[tk].desc,T:TYPES[tk]}));
  items.push({tk:'elite',name:'ÉLITE',desc:'Cualquier figura puede aparecer como ÉLITE: morada, enorme, con 3.2× de vida. Suelta lluvia de oro, gemas y mucha experiencia.',T:{color:'#B388FF',shape:'diamond'}});
  items.push({tk:'camp',name:'CAMPESINO',desc:'Figura neutral que huye del combate. Si la cazas antes de que escape deja un mini cofre con oro o gemas. Hay 3 clases: CENTINELA, HERALDO y TITÁN.',T:{color:'#FFD166',shape:'square'}});
  for(const it of items){
    const seen=!!(save.seen&&save.seen[it.tk]);
    const el=document.createElement('div');
    el.className='arow'+(seen?'':' unk');
    const c=document.createElement('canvas');c.width=c.height=52;
    const g=c.getContext('2d');
    g.save();g.translate(26,26);
    g.strokeStyle=seen?it.T.color:'#3A4450';g.lineWidth=2;
    g.fillStyle='rgba(255,255,255,.05)';
    shapePath(g,it.T.shape,15);
    if(seen)g.fill();
    g.stroke();
    if(!seen){
      g.strokeStyle='#5C6572';g.font='700 15px "Chakra Petch",monospace';
      g.textAlign='center';g.textBaseline='middle';g.fillText('?',0,1);
    }
    g.restore();
    el.appendChild(c);
    const t=document.createElement('div');t.className='at';
    t.innerHTML=seen?`<b style="color:${it.T.color}">${it.name}</b><small>${it.desc}</small>`
      :`<b>???</b><small>Sin registrar · enfréntate a ella en combate</small>`;
    el.appendChild(t);
    box.appendChild(el);
  }
  showScr('best');
}
function goMenu(){
  state='menu';runActive=false;
  destroyNet();
  wrecks=[];emosFx=[];closeEmoPanel();
  weeklyMode=false;dailyMode=false;R=Math.random;
  musStop();
  if(actx)musStart(); /* v4.8: música del menú */
  useProfile('local');
  refreshMenu();showScr('menu');
  $('#hud').classList.add('hidden');$('#hudBot').classList.add('hidden');$('#bossBar').classList.add('hidden');
}
function resetRunCommon(){
  P=players[0];
  run.level=1;run.kills=0;run.eliteKills=0;run.time=0;run.buffs=[[],[]];run.goldRun=0;run.gemsRun=0;
  run.relics=[];run.shipLv=1;run.exp=0;run.combo=0;run.comboN=0;run.comboT=0;run.tempBuffs=[];rollMissions();
  run.stShots=0;run.stHits=0;run.stDmg=0;run.stTaken=0;run.stPerfect=0;run.bossDmgTaken=false;
  pendingShipLevels=0;frenzyT=0;expFrac=0;run.frenzyBossT=30;frenzyMode=false;
  bots=[]; /* v4.9: sin aliados al empezar */
  enemies=[];bullets=[];ebullets=[];parts=[];pickups=[];floats=[];rings=[];beams=[];wrecks=[];emosFx=[];
  closeEmoPanel();
  dronePos={'0':[],'1':[]};droneCd={'0':[],'1':[]};boss=null;lastWaveType='';
  cEnemies.clear();cEB=[];cBL=[];cPK=[];cWrecks=[];
  shake=0;bannerT=0;novaCdGlobal=0;
  freeNovaGiven=false;
}
function primePlayers(){
  for(const pl of players){
    pl.hp=pl.maxHp;pl.invul=1;pl.shots=0;pl.fireAcc=0;pl.emerUsed=false;
    pl.shieldLvl=true;pl.regAcc=0;pl.shieldUp=false;pl.shieldCd=0;
    pl.homeCd=1;pl.priCd=3;pl.intAcc=0;pl.orbT=0;pl.dashCd=0;pl.vengeT=0;
    pl.touch=null;
  }
}
function startRun(){
  audio();goFullscreen();
  useProfile('local');
  weeklyMode=false;R=Math.random;
  runDiff=save.diff;
  save.runs++;persist();
  players=[mkPlayer(0)];localSlot=0;
  remoteBase=null;
  resetRunCommon();
  recompute();
  primePlayers();
  players[0].x=W/2;players[0].y=H-130;
  runActive=true;state='play';
  showScr(null);
  $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
  $('#netTag').classList.add('hidden');
  refreshHUD();
  musStart();
  nextWave();
}
function startWeekly(){
  audio();goFullscreen();
  useProfile('local');
  weeklyMode=true;
  const ws=weekSeed();
  if(!save.weekly||save.weekly.seed!==ws){save.weekly={seed:ws,best:0};}
  persist();
  R=mulberry32(hashStr('FRG-'+ws));
  runDiff='normal';
  save.runs++;persist();
  players=[mkPlayer(0)];localSlot=0;
  remoteBase=null;
  resetRunCommon();
  recompute();
  primePlayers();
  players[0].x=W/2;players[0].y=H-130;
  runActive=true;state='play';
  showScr(null);
  $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
  $('#netTag').classList.add('hidden');
  refreshHUD();
  musStart();
  banner('DESAFÍO SEMANAL','Semilla '+ws+' · NORMAL ×2.2 · igual para todos');
  nextWave();
}
/* v4.12: RETO DIARIO — como el semanal pero con semilla de UN DÍA:
   todos los jugadores del mundo juegan exactamente lo mismo cada día. */
function startDaily(){
  audio();goFullscreen();
  useProfile('local');
  weeklyMode=false;dailyMode=true;
  const ds=daySeed();
  if(!save.daily||save.daily.seed!==ds)save.daily={seed:ds,best:0};
  persist();
  R=mulberry32(hashStr('FRGD-'+ds));
  runDiff='normal';
  save.runs++;persist();
  players=[mkPlayer(0)];localSlot=0;
  remoteBase=null;
  resetRunCommon();
  recompute();
  primePlayers();
  players[0].x=W/2;players[0].y=H-130;
  runActive=true;state='play';
  showScr(null);
  $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
  $('#netTag').classList.add('hidden');
  refreshHUD();
  musStart();
  banner('RETO DIARIO','Semilla '+ds+' · NORMAL ×2.2 · igual para todos');
  nextWave();
}
/* v4.9: MODO FRENÉTICO — oleada única infinita, nivel creciente y jefes
   periódicos; dificultad HARDCORE fija y récord local progresivo */
function startFrenzy(){
  audio();goFullscreen();
  useProfile('local');
  weeklyMode=false;R=Math.random;
  runDiff='hardcore';
  save.runs++;persist();
  players=[mkPlayer(0)];localSlot=0;
  remoteBase=null;
  resetRunCommon();
  frenzyMode=true;
  if(!save.frenzy)save.frenzy={bestT:0,bestK:0};
  recompute();
  primePlayers();
  players[0].x=W/2;players[0].y=H-130;
  runActive=true;state='play';
  showScr(null);
  $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
  $('#netTag').classList.add('hidden');
  refreshHUD();
  musStart();
  banner('MODO FRENÉTICO','HARDCORE ×5 · oleada infinita · sobrevive');
  nextWave();
}
function startCoop(){
  runDiff=net.lobbyDiff||'normal';
  save.runs++;persist();
  players=[mkPlayer(0),mkPlayer(1)];localSlot=0;
  resetRunCommon();
  recompute();
  primePlayers();
  players[0].x=W*.42;players[0].y=H-130;
  players[1].x=W*.58;players[1].y=H-130;
  runActive=true;state='play';
  showScr(null);
  $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
  $('#netTag').classList.remove('hidden');
  refreshHUD();
  sendMsg({t:'start',diff:runDiff});
  musStart();
  nextWave();
}
function startRunClient(){
  run.level=1;run.kills=0;run.goldRun=0;run.gemsRun=0;
  run.relics=[];run.shipLv=1;run.exp=0;run.buffs=[[],[]];run.combo=0;
  run.missions=[
    {txt:'Destruye 40 enemigos',n:40,p:0,rw:60},
    {txt:'Recoge 120 de oro',n:120,p:0,rw:40},
    {txt:'Caza 2 élites',n:2,p:0,rw:80},
  ];
  pendingShipLevels=0;frenzyT=0;
  players=[mkPlayer(0),mkPlayer(1)];localSlot=1;
  enemies=[];bullets=[];ebullets=[];parts=[];pickups=[];floats=[];rings=[];beams=[];wrecks=[];emosFx=[];
  closeEmoPanel();
  cEnemies.clear();cEB=[];cBL=[];cPK=[];cWrecks=[];boss=null;
  recompute();
  for(const pl of players){pl.hp=pl.maxHp;pl.invul=1;}
  players[1].x=W*.58;players[1].y=H-130;
  players[0].x=W*.42;players[0].y=H-130;
  runActive=true;state='play';
  showScr(null);
  $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
  $('#netTag').classList.remove('hidden');
  banner('CO-OP CONECTADO','Dificultad: '+DIFF_LABEL[runDiff]);
  musStart();
}
function nextWave(){
  ebullets=[];bullets=[];beams=[];
  const L=run.level;
  if(net.mode!=='client'){
    if(L>save.best.lvl)save.best.lvl=L;
    if(L>save.bestAll)save.bestAll=L;
    /* v4.8: el récord del desafío semanal se guarda EN CADA OLEADA —
       aunque el jugador se retire por lag, su ranking ya está a salvo */
    if(weeklyMode){
      const ws=weekSeed();
      if(!save.weekly||save.weekly.seed!==ws)save.weekly={seed:ws,best:0};
      if(run.level>(save.weekly.best||0)){
        save.weekly.best=run.level;
        save.weekBestAll=Math.max(save.weekBestAll||0,run.level);
        const pilot=getPilot();
        addRankingEntry({seed:ws,code:pilot,wave:run.level,ship:run.shipLv,
          h:weekHash(ws,pilot,run.level,run.shipLv),ok:true});
      }
    }
    /* v4.12: el récord del Reto Diario también se guarda OLEADA A OLEADA
       (salir por lag no lo pierde) */
    if(dailyMode){
      const ds=daySeed();
      if(!save.daily||save.daily.seed!==ds)save.daily={seed:ds,best:0};
      if(run.level>(save.daily.best||0)){
        save.daily.best=run.level;
        save.dailyBest=Math.max(save.dailyBest||0,run.level);
      }
    }
    checkAch();
    persist();
  }
  for(const pl of players)if(pl.hp<=0){pl.hp=Math.ceil(pl.maxHp/2);floater(pl.x,pl.y-30,'REDESPLIEGUE','#7FD1B9',13);}
  wrecks=[];
  for(const pl of players){pl.shieldLvl=true;pl.emerUsed=false;}
  if(P.secondWind&&L%5===0)for(const pl of players){pl.hp=pl.maxHp;floater(pl.x,pl.y-30,'SEGUNDO AIRE','#7FD1B9',13);}
  if(L>=3&&!freeNovaGiven){
    freeNovaGiven=true;
    for(const pl of players){
      if(!pl.nova){
        pl.nova={d:15,cd:18};
        floater(pl.x,pl.y-40,'NOVA DE EMERGENCIA','#FFD166',14);
      }
    }
    banner('NOVA DE EMERGENCIA','Prepárate: el primer Guardián llega en la oleada 5');
  }
  formY=0;formT=0;
  if(net.mode!=='client')updTempBuffs();
  buildWave(L);
  waveState='play';clearTimer=0;
}
function showShipCards(picks,onPick,waitNote){
  $('#lvKick').textContent='EXPERIENCIA OBTENIDA';
  $('#lvNum').textContent=run.shipLv;
  const box=$('#cards');box.innerHTML='';
  picks.forEach(c=>{
    const el=document.createElement('button');
    el.className='card t'+c.tier;
    el.innerHTML=`<div class="c-side"></div><div class="c-main"><div class="c-top"><span class="tag">${['COMÚN','RARO','ÉPICO'][c.tier]}</span><b>${c.name}</b></div><p>${c.desc}</p></div>`;
    el.addEventListener('click',()=>onPick(c.id));
    box.appendChild(el);
  });
  if(waitNote){
    const note=document.createElement('div');
    note.className='choicenote';
    note.textContent=waitNote;
    box.appendChild(note);
  }
  showScr('level');
}
function showShipLevelLocal(){
  state='levelup';SFX.lvl();
  const cnt=id=>cardStacks(0,id);
  const picks=[],used=new Set();
  for(let i=0;i<3;i++){
    const r=Math.random();
    let tier=r<.12&&run.level>=4?2:r<.40?1:0;
    for(let t=tier;t>=0;t--){
      const cands=CARDS.filter(c=>c.tier===t&&!used.has(c.id)&&cnt(c.id)<MAX_STACKS);
      if(cands.length){const c=cands[irand(0,cands.length-1)];used.add(c.id);picks.push(c);break;}
    }
  }
  while(picks.length<3){
    const c=CARDS.find(c=>cnt(c.id)<MAX_STACKS&&!picks.includes(c))||CARDS[0];
    picks.push(c);
  }
  showShipCards(picks,id=>{
    applyShipCard(0,id);SFX.buy(); /* v4.8: tope 10 por carta + curación instantánea */
    pendingShipLevels--;
    if(pendingShipLevels>0)showShipLevelLocal();
    else{state='play';showScr(null);persist();}
  },null);
}
function showRelicCards(list,onPick){
  const box=$('#relicCards');box.innerHTML='';
  list.forEach((r,i)=>{
    const el=document.createElement('button');
    el.className='rbtn';
    el.innerHTML=`<b>◈ ${r.name}</b><p>${r.desc}</p>`;
    el.addEventListener('click',()=>{
      if(relicChosen)return;
      relicChosen=true;SFX.relic();vib(40);
      box.querySelectorAll('.rbtn').forEach((b2,j)=>{if(j!==i)b2.classList.add('got');});
      onPick(r);
    });
    box.appendChild(el);
  });
}
function applyRelicChoice(){
  if(state!=='postboss')return;
  if(!(net.mode==='host'&&players.length===2))return;
  if(net.hostRelic&&net.clientRelic){
    if(!run.relics.includes(net.hostRelicId))run.relics.push(net.hostRelicId);
    if(!run.relics.includes(net.clientRelicId))run.relics.push(net.clientRelicId);
    net.hostRelic=false;net.clientRelic=false;
    recompute();persist();
    setRelicNote('AMBOS ELIGIERON · PULSA CONTINUAR');
    const pu=$('#pbUnlock');
    pu.classList.remove('warn');
    pu.textContent='AMBOS LISTOS · PULSA CONTINUAR';
  }
}
function showPostBoss(){
  const key=bossName?bossName.split('-')[0]:'';
  const bk=save.bossKills||{};
  if(BOSS_DEFS[key])bk[key]=(bk[key]||0)+1;
  else if(key==='SEÑOR DE FORMAS')bk['SEÑOR']=(bk['SEÑOR']||0)+1;
  save.bossKills=bk;
  checkAch();persist();
  state='postboss';relicChosen=false;
  const coop=net.mode==='host'&&players.length===2;
  if(coop){net.hostRelic=false;net.clientRelic=false;}
  const st=(k,v)=>`<div><small>${k}</small><b>${v}</b></div>`;
  $('#pbStats').innerHTML=
    st('GUARDIÁN PURGADO',bossName)+st('OLEADA',run.level)+
    st('ORO DE LA INCURSIÓN',run.goldRun)+st('GEMAS',run.gemsRun);
  $('#pbMinLv').textContent=`▲ NIVEL MÍNIMO ENEMIGO: ${minLvlOf(run.level+1)}`;
  const pu=$('#pbUnlock');pu.classList.remove('warn');
  if(coop){
    pu.textContent='CADA JUGADOR ELIGE UNA RELIQUIA (AMBAS SE APLICAN)';
    curRelics=shuffle(RELICS.filter(r=>!run.relics.includes(r.id))).slice(0,3);
    sendMsg({t:'ev',k:'relics',ids:curRelics.map(r=>r.id)});
    showRelicCards(curRelics,r=>{net.hostRelic=true;net.hostRelicId=r.id;applyRelicChoice();});
    showScr('post');
    return;
  }
  const n=TREE.filter(nd=>!has(nd.id)&&(nd.wave<=1||save.best.lvl>=nd.wave)&&save.bestShip>=(nd.ship||1)).length;
  pu.textContent=n>0?`► ${n} MEJORA${n>1?'S':''} DESBLOQUEABLE${n>1?'S':''} EN EL ARSENAL`:'';
  curRelics=shuffle(RELICS.filter(r=>!run.relics.includes(r.id))).slice(0,3);
  showRelicCards(curRelics,r=>{
    run.relics.push(r.id);recompute();persist();
    if(r.id==='hierro')healPlayerOnce(0,3); /* v4.8: curación única al obtenerla */
    banner('RELIQUIA',r.name);
  });
  showScr('post');
}
function gameOver(){
  state='over';
  shake=18;vib(200);
  musStop();
  save.mShots=(save.mShots||0)+run.stShots;
  save.mHits=(save.mHits||0)+run.stHits;
  save.mDmg=(save.mDmg||0)+Math.round(run.stDmg);
  save.mTaken=(save.mTaken||0)+run.stTaken;
  save.mPerfect=(save.mPerfect||0)+run.stPerfect;
  save.best.lvl=Math.max(save.best.lvl,run.level);
  save.best.kills=Math.max(save.best.kills,run.kills);
  save.bestAll=Math.max(save.bestAll,run.level);
  save.bestShip=Math.max(save.bestShip,run.shipLv);
  if(runDiff==='hardcore')save.bestHard=Math.max(save.bestHard||0,run.level);
  let weeklyRec=false;
  lastWeeklyRec=null;
  let frenRec=false;
  let dailyRec=false; /* v4.12 */
  if(frenzyMode){
    if(!save.frenzy)save.frenzy={bestT:0,bestK:0};
    if(Math.floor(run.time)>(save.frenzy.bestT||0)||run.kills>(save.frenzy.bestK||0))frenRec=true;
    save.frenzy.bestT=Math.max(save.frenzy.bestT||0,Math.floor(run.time));
    save.frenzy.bestK=Math.max(save.frenzy.bestK||0,run.kills);
  }
  if(weeklyMode){
    const ws=weekSeed();
    if(save.weekly&&save.weekly.seed===ws){
      if(run.level>(save.weekly.best||0)){save.weekly.best=run.level;weeklyRec=true;}
    }
    save.weekBestAll=Math.max(save.weekBestAll||0,run.level);
    const pilot=getPilot();
    lastWeeklyRec={seed:ws,code:pilot,wave:run.level,ship:run.shipLv,
      h:weekHash(ws,pilot,run.level,run.shipLv),ok:true};
    addRankingEntry(lastWeeklyRec);
  }
  /* v4.12: récord del Reto Diario */
  if(dailyMode){
    const ds=daySeed();
    if(!save.daily||save.daily.seed!==ds)save.daily={seed:ds,best:0};
    if(run.level>(save.daily.best||0)){save.daily.best=run.level;dailyRec=true;}
    save.dailyBest=Math.max(save.dailyBest||0,run.level);
  }
  checkAch();
  persist();
  if(net.mode==='host'&&players.length===2){
    sendMsg({t:'ev',k:'over',level:run.level,ship:run.shipLv,yg:run.goldRun,hard:runDiff==='hardcore'});
  }
  const st=(k,v)=>`<div><small>${k}</small><b>${v}</b></div>`;
  $('#ovStats').innerHTML=
    st('OLEADA ALCANZADA',run.level)+st('NAVE NIVEL',run.shipLv)+
    st('DESTRUIDOS',run.kills)+st('TIEMPO',fmtT(run.time))+
    st('ORO CONSEGUIDO',run.goldRun)+st('GEMAS',run.gemsRun);
  const acc=run.stShots>0?Math.round(run.stHits/run.stShots*100):0;
  $('#ovMast').innerHTML=
    `<div><small>PRECISIÓN</small><b>${acc}%</b></div>`+
    `<div><small>DAÑO TOTAL</small><b>${Math.round(run.stDmg)}</b></div>`+
    `<div><small>JEFES SIN DAÑO</small><b>${run.stPerfect}</b></div>`;
  const prof=saveProfile==='net'?'perfil ONLINE':'perfil LOCAL';
  $('#ovKeep').innerHTML=
    (frenRec?`<span class="k1">★ ¡NUEVO RÉCORD FRENÉTICO · ${fmtT(save.frenzy.bestT)} · ${save.frenzy.bestK} BAJAS!</span><br>`:'')+
    (dailyRec?`<span class="k1">★ ¡NUEVO RÉCORD DEL RETO DIARIO · OLEADA ${save.daily.best}!</span><br>`:'')+
    (weeklyRec?`<span class="k1">★ ¡NUEVO RÉCORD SEMANAL · OLEADA ${save.weekly.best}!</span><br>`:'')+
    `<span class="k1">SE CONSERVA · ${ownedCount()}/${TREE.length} permanentes · oro · gemas · logros (${prof})</span><br>`+
    `<span class="k2">SE PIERDE · ${(run.buffs[localSlot]||[]).length} carta(s) temporal(es) · reliquias · nivel de nave</span>`;
  /* v4.8: eliminado el botón de copiar registro semanal por código */
  $('#hud').classList.add('hidden');$('#hudBot').classList.add('hidden');
  $('#bossBar').classList.add('hidden');
  closeEmoPanel();
  showScr('over');
}
function pauseGame(){
  if(state!=='play')return;
  state='pause';persist();
  closeEmoPanel();
  const st=(k,v)=>`<div><small>${k}</small><b>${v}</b></div>`;
  const acc=run.stShots>0?Math.round(run.stHits/run.stShots*100):0;
  $('#psStats').innerHTML=
    st('DAÑO',P.dmg)+st('CADENCIA',P.fireRate.toFixed(1)+'/s')+
    st('PROYECTILES',P.bullets+(P.files>1?` ×${P.files} filas`:''))+
    st('CRÍTICO',Math.round(P.crit*100)+'%')+
    st('NAVE',run.shipLv+' · '+run.exp+'/'+shipNeed(run.shipLv)+' XP')+
    st('VIDA',players.map(p=>p.hp+'/'+p.maxHp).join(' · '))+
    st('PERMANENTES',ownedCount()+'/'+TREE.length)+st('DIFICULTAD',DIFF_LABEL[runDiff]);
  $('#psMiss').innerHTML='<small>MISIONES DE LA INCURSIÓN</small>'+
    run.missions.map(m=>`<div class="${m.done?'ok':''}">${m.done?'✓':'·'} ${m.txt} — ${m.p}/${m.n}</div>`).join('')+
    `<div style="margin-top:5px">· PRECISIÓN — ${acc}% · DAÑO ${Math.round(run.stDmg)}</div>`;
  showScr('pause');
}

