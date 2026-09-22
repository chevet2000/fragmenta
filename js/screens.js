'use strict';
/* ============ pantallas ============ */
const scr={menu:$('#scrMenu'),rank:$('#scrRank'),guide:$('#scrGuide'),ach:$('#scrAch'),chest:$('#scrChest'),lobby:$('#scrLobby'),join:$('#scrJoin'),level:$('#scrLevel'),post:$('#scrPost'),shop:$('#scrShop'),pause:$('#scrPause'),over:$('#scrOver'),mplay:$('#scrMplay'), /* v4.32: ventana MULTIJUGADOR */
  /* v4.12: hangar de naves, misiones diarias, perfil y bestiario */
  hangar:$('#scrHangar'),missions:$('#scrMissions'),stats:$('#scrStats'),best:$('#scrBest'),
  /* v4.15: ajustes (engranaje) */
  settings:$('#scrSettings'),
  /* v4.21: LA BÓVEDA — cofres sellados pendientes por abrir */
  vault:$('#scrVault'),
  /* v4.23: EL MERCADER PIRATA — tienda de mercado negro */
  merc:$('#scrMerc'),
  /* v4.28: DESPLIEGUE — elegir mejoras armadas antes de la oleada 1 */
  deploy:$('#scrDeploy')};
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
  $('#btnArsenal').textContent=`ARSENAL (${ownedCount()}/${TREE.length})`;
  const na=ACHS.filter(a=>save.ach[a.id]).length;
  $('#btnAch').innerHTML=`LOGROS (${na}/${ACHS.length})<span id="achBadge" class="hidden">0</span>`;
  refreshAchBadge();
  const wb=(save.weekly&&save.weekly.seed===weekSeed())?save.weekly.best:0;
  $('#btnWeekly').textContent=`DESAFÍO SEMANAL · RÉCORD ${wb}`;
  /* v4.12: reto diario, misiones, hangar y nuevas pantallas */
  const db=(save.daily&&save.daily.seed===daySeed())?(save.daily.best||0):0;
  $('#btnDaily').textContent=`RETO DIARIO · RÉCORD ${db}`;
  ensureDailyM();
  const es=effStreak(); /* v4.19: racha de misiones junto al contador */
  $('#btnMissions').textContent=`MISIONES (${dailyMDone()}/3)`+(es>0?` · ★DÍA ${es}`:'');
  const sk=getSkin();
  $('#btnHangar').textContent=`HANGAR (${sk.name})`;
  const nr=(save.ranking||[]).length;
  $('#btnRank').textContent=`RANKING · RÉCORDS (${nr})`;
  $('#diffName').textContent=DIFF_LABEL[save.diff]||'SOLO ×1';
  document.querySelectorAll('#diffRow button').forEach(b=>b.classList.toggle('on',b.dataset.d===save.diff));
  const asc=$('#btnAscend');
  asc.classList.toggle('hidden',save.bestAll<50);
  asc.textContent=ascConfirm?'¿SEGURO? TOCA DE NUEVO':`ASCENDER ×${save.prest+1} (+25% ORO)`;
  /* v4.21: botón de LA BÓVEDA con contador de pendientes y mejoras armadas */
  const vc=vaultCount();
  const na2=(save.armed||[]).length;
  const bb=$('#btnBoveda');
  if(bb)bb.innerHTML=`COFRES (${vc})`+(na2?` · ✦${na2}`:'')+(vc?' ◈':'');
  /* v4.23: el MERCADER PIRATA saluda (línea del día + oferta) */
  if(typeof refreshMerc==='function')refreshMerc();
  /* v4.15: tira de piloto con avatar (tu nave con el aspecto equipado) */
  $('#menuPilotName').textContent=getPilot();
  drawPilotAvatar($('#pilotCv'),34);
}
/* v4.15: AVATAR DEL PILOTO — tu nave con su aspecto equipado en miniatura */
function drawPilotAvatar(c,size){
  if(!c)return;
  const g=c.getContext('2d');
  g.clearRect(0,0,c.width,c.height);
  const sk=getSkin();
  const cc=sk.color==='prisma'?'hsl('+Math.floor((time*40)%360)+',85%,66%)':sk.color;
  const hc=sk.color==='prisma'?'#FFD166':(sk.color==='menta'?null:sk.color);
  g.save();g.translate(c.width/2,c.height/2+2);
  drawShipIcon(g,size/26,cc,hc);
  g.restore();
}
/* v4.15: pantalla de AJUSTES (engranaje) */
function openSettings(){
  $('#setName').textContent=getPilot();
  const pe=$('#pilotEdit2'),be=$('#btnEditPilot2');
  if(pe)pe.classList.add('hidden');
  if(be)be.classList.remove('hidden');
  drawPilotAvatar($('#setAva'),56);
  showScr('settings');
}
/* v4.15: FILTROS DEL RANKING por modo (se recuerdan entre sesiones) */
let rankFilter='all';
try{const rf=localStorage.getItem('frag_rf');if(rf&&['all','nm','dc','hc','mp','wk','fz','dy'].includes(rf))rankFilter=rf;}catch(e){}
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
  document.querySelectorAll('#rankTabs button').forEach(b=>b.classList.toggle('on',b.dataset.f===rankFilter));
  renderRankList();
  showScr('rank');
}
function renderRankList(){
  const box=$('#rankList');box.innerHTML='';
  /* v4.15: filtra por modo · los registros antiguos (sin modo) eran semanales */
  const list=sortedRanking().filter(r=>rankFilter==='all'||modeOfEntry(r)===rankFilter);
  if(list.length===0){
    const lbl=rankFilter==='all'?'':RANK_MODE_LABEL[rankFilter]+' · ';
    box.innerHTML='<div style="font-size:10px;letter-spacing:.2em;color:var(--dim);text-align:center;padding:10px 0">'+
      'SIN REGISTROS '+lbl+'· los ranking se sincronizan solos<br>al conectaros en el lobby co-op</div>';
    return;
  }
  list.forEach((r,i)=>{
    const el=document.createElement('div');
    el.className='rentry'+(i===0?' p1':i===1?' p2':i===2?' p3':'')+(r.ok?'':' unv');
    const medal=i<3?['1','2','3'][i]:(i+1);
    const mk=modeOfEntry(r);
    const isFz=mk==='fz';
    el.innerHTML=`<div class="rk">${medal}</div>`+
      `<div class="rt"><b>${r.code}</b><small><span class="mchip m-${mk}">${RANK_MODE_LABEL[mk]}</span>${r.seed}${r.ok?'':' · sin verificar'}</small></div>`+
      `<div class="rw">${isFz?(r.sub||r.wave):r.wave}<small>${isFz?'BAJAS':'OLEADA'}</small></div>`+
      `<button class="rdel" data-c="${r.code}" data-s="${r.seed}">×</button>`;
    box.appendChild(el);
  });
  box.querySelectorAll('.rdel').forEach(b=>{
    b.addEventListener('click',()=>{
      /* v4.27: el ranking vive en AMBOS perfiles — se borra de los dos
         (si no, la unión del otro perfil lo resucitaría) */
      const keep=r=>!(r.code===b.dataset.c&&r.seed===b.dataset.s);
      save.ranking=(save.ranking||[]).filter(keep);
      if(localSave!==save)localSave.ranking=(localSave.ranking||[]).filter(keep);
      if(netSave!==save)netSave.ranking=(netSave.ranking||[]).filter(keep);
      try{localStorage.setItem(KEY_LOCAL,JSON.stringify(localSave));}catch(e){}
      try{localStorage.setItem(KEY_NET,JSON.stringify(netSave));}catch(e){}
      renderRankList();refreshMenu();
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
 bindEl('#btnRankO', 'click',openRank); /* v4.32: RANKING dentro de la ventana MULTIJUGADOR */
 bindEl('#btnMplay', 'click',()=>{audio();showScr('mplay');});
 bindEl('#btnMplayBack', 'click',()=>{audio();refreshMenu();showScr('menu');});
 bindEl('#btnRankBack', 'click',()=>{refreshMenu();showScr('menu');});
/* v4.15: pestañas de filtro del ranking */
document.querySelectorAll('#rankTabs button').forEach(b=>{
  b.addEventListener('click',()=>{audio();
    rankFilter=b.dataset.f;
    try{localStorage.setItem('frag_rf',rankFilter);}catch(e){}
    document.querySelectorAll('#rankTabs button').forEach(x=>x.classList.toggle('on',x===b));
    renderRankList();
  });
});
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
  const pend=achPendingCount();
  if(pend>0){
    const head=document.createElement('div');
    head.className='choicenote';
    head.textContent='◆ TIENES '+pend+' LOGRO'+(pend>1?'S':'')+' POR RECLAMAR';
    box.appendChild(head);
  }
  ACHS.forEach(a=>{
    const done=!!save.ach[a.id];
    const pending=done&&!(save.achClaimed&&save.achClaimed[a.id]);
    const el=document.createElement('div');
    el.className='arow'+(done?' done':'')+(pending?' pend':'');
    const right=pending
      ?`<button class="claim" data-a="${a.id}">RECLAMAR +${a.rw}</button>`
      :`<div class="arw">${icoGem}${a.rw}</div>`;
    el.innerHTML=`<div class="amk">${done?(pending?'◆':'✓'):''}</div><div class="at"><b>${a.name}</b><small>${a.desc}</small></div>${right}`;
    box.appendChild(el);
  });
  box.querySelectorAll('.claim').forEach(b=>{
    b.addEventListener('click',()=>{audio();claimAch(b.dataset.a);openAch();refreshMenu();});
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
    const sub=eq?'EQUIPADA':(owned?(s.streak?'RECOMPENSA DE RACHA · CONSEGUIDA':'toca EQUIPAR'):(s.streak?'RACHA DE MISIONES · DÍA '+s.streak:s.cost+' de oro'));
    t.innerHTML=`<b style="color:${s.color==='prisma'?'#FFD166':s.color}">${s.name}</b>`+
      `<small>${sub}</small>`;
    el.appendChild(t);
    const b=document.createElement('button');
    b.className='skbtn'+(eq?' on':'');
    b.textContent=eq?'✓':(owned?'EQUIPAR':(s.streak?'★ DÍA '+s.streak:'COMPRAR'));
    b.addEventListener('click',()=>{
      audio();
      if(eq)return;
      if(!owned){
        /* v4.20: el ESTELAR no se compra — se gana con la racha (día 7) */
        if(s.streak){banner('ASPECTO EXCLUSIVO',s.name+' se gana manteniendo la RACHA · DÍA '+s.streak);SFX.hurt();return;}
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
  /* v4.19: cabecera de RACHA — día 1, 2, 3… completando las 3 cada día
     v4.20: RECOMPENSAS VISIBLES — los hitos de la racha se ven aquí */
  const st=effStreak(),bs=Math.max(save.streakBest||0,st);
  const nx=STREAK_MILES.find(m=>st<m.d);
  const miles=STREAK_MILES.map(m=>((st>=m.d)?'✓ ':'· ')+'DÍA '+m.d+': '+streakMileTxt(m)).join('  ·  ');
  const head=document.createElement('div');
  head.className='streakrow'+(st>0?' on':'');
  head.innerHTML=st>0
    ?`<b>★ RACHA DE MISIONES · DÍA ${st}</b>`+
     `<small>MEJOR RACHA · ${bs} ${bs===1?'DÍA':'DÍAS'} · COMPLETA LAS 3 CADA DÍA PARA NO PERDERLA<br>BONO DE HOY YA PAGADO · MAÑANA +${Math.min(7,st+1)} GEMA${Math.min(7,st+1)>1?'S':''} (TOPE +7)`+
     (nx?`<br>PRÓXIMA RECOMPENSA · DÍA ${nx.d} → <b style="color:#FFE9B0">${streakMileTxt(nx)}</b>`:'<br>¡TODAS LAS RECOMPENSAS DE RACHA CONSEGUIDAS!')+
     `</small><small style="margin-top:4px;display:block">${miles}</small>`
    :`<b>SIN RACHA ACTIVA</b>`+
     `<small>COMPLETA LAS 3 MISIONES DE HOY Y ENCIENDES EL DÍA 1 · CADA DÍA SEGUIDO PAGA +1 GEMA MÁS (TOPE +7)${bs>0?'<br>TU MEJOR RACHA · '+bs+' '+(bs===1?'DÍA':'DÍAS'):''}<br>RECOMPENSAS POR MANTENERLA · DÍA 3 → +15 GEMAS · DÍA 5 → +25 GEMAS · DÍA 7 → <b style="color:#FFE9B0">ASPECTO ESTELAR ★</b></small>`;
  box.appendChild(head);
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
    ['FANTASMA (MEJOR CARRERA)',save.ghost&&save.ghost.t?(fmtT(save.ghost.t)+' · '+save.ghost.k+' bajas'):'—'],
    ['DEVORADOS · AGUJERO NEGRO',save.totDevour||0],
    ['BIOMAS VISITADOS',Object.keys(save.biomesSeen||{}).length+' / '+BIOMES.length],
    ['MALDICIONES SUFRIDAS',save.totCurses||0],
    ['RESUCITADOS DESTRUIDOS',save.totRevKills||0],
    ['COFRES LEGENDARIOS',save.totLucky||0],
    ['OLEADAS DORADAS',save.totGolden||0],
    ['RACHA DE MISIONES',(effStreak()||0)+' DÍA(S) · MEJOR '+(save.streakBest||0)],
    ['METEORITOS REVENTADOS',save.totMeteor||0],
    /* v4.20: púrpura, cubos, naves amigas, portales y cambios de gemas */
    ['METEORITOS PÚRPURA',save.totMeteorP||0],
    /* v4.31: el pirata galáctico */
    ['PIRATAS HUNDIDOS',save.totPirate||0],
    ['PIRATAS ESCAPADOS',save.totPirEsc||0],
    ['CUBOS SORPRESA',save.totCube||0],
    ['NAVES AMIGAS',save.totAlly||0],
    ['PORTALES ABIERTOS',save.totPortal||0],
    ['CAMBIOS DE GEMAS',save.gemxBuys||0],
    /* v4.21: LA BÓVEDA */
    ['COFRES SELLADOS EN LA BÓVEDA',vaultCount()+' / '+VCAP],
    ['COFRES SELLADOS ABIERTOS',save.totVaultOpen||0],
    ['MEJORAS ARMADAS',(save.armed||[]).length],
    /* v4.23: escala viva, récords por modo y Mercader Pirata */
    ['ESCALA VIVA · VIDA ENEMIGA','×'+hpUpMul().toFixed(2)+' · XP ×'+xpUpMul().toFixed(2)],
    ['RÉCORD NORMAL',save.bestMode?(save.bestMode.normal||0):0],
    ['RÉCORD DIFÍCIL',save.bestMode?(save.bestMode.dificil||0):0],
    ['RÉCORD HARDCORE (Y FRENÉTICO)',save.bestMode?(save.bestMode.hardcore||0):0],
    ['COFRES DEL PIRATA COMPRADOS',save.totMerc||0],
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
  run.level=1;run.kills=0;run.eliteKills=0;run.time=0;run.buffs=players.map(()=>[]);run.goldRun=0;run.gemsRun=0;
  run.relics=[];run.shipLv=1;run.exp=0;run.combo=0;run.comboN=0;run.comboT=0;run.tempBuffs=[];rollMissions();
  run.stShots=0;run.stHits=0;run.stDmg=0;run.stTaken=0;run.stPerfect=0;run.bossDmgTaken=false;
  pendingShipLevels=0;frenzyT=0;expFrac=0;run.frenzyBossT=50;frenzyMode=false; /* v4.13: primer jefe a 50 s */
  run.frenzyEliteT=rand(20,35); /* v4.13: élites al azar */
  /* v4.14: fantasma desactivado por defecto (startFrenzy lo activa si hay traza) */
  run.ghostTrail=[];run.ghostAcc=0;run.ghostPassed=false;run.ghostRef=null;run.ghostLead=0;
  run.curses=[]; /* v4.17: sin maldiciones al empezar */
  run.newComboRec=false; /* v4.18: sin récord de combo todavía */
  run.armedShown=false; /* v4.21: aviso de mejoras armadas pendiente */
  /* v4.29: energía a cero — avisos sin disparar y suministros del despliegue */
  run.noFuelWarned=false;run.noElecWarned=false;run.supFuel=0;run.supGen=0;
  hitStopT=0;goldenWave=false;lastGolden=-9;kcN=0;kcLast=-9; /* v4.18: dopamina a cero */
  meteors=[];meteorT=rand(16,30);meteorWarned=false; /* v4.19: meteoritos a cero */
  /* v4.20: eventos nuevos a cero — cubos, portal, naves amigas y anomalía */
  cubeT=rand(8,13);portals=[];portalT=rand(40,75);portalWarned=false;
  allies=[];updAllies.warn=false;anomalyWave=false;run.portalNext=false;
  bots=[]; /* v4.9: sin aliados al empezar */
  vaultWarnT=-99; /* v4.21: freno del aviso de bóveda llena, a cero */
  enemies=[];bullets=[];ebullets=[];parts=[];pickups=[];floats=[];rings=[];beams=[];ultBeams=[];holes=[];wrecks=[];emosFx=[]; /* v4.14: holes */
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
    /* v4.29: tanque y reactor LLENOS al despegar; sin apagones heredados */
    pl.fuel=pl.fuelMax||100;pl.en=pl.enMax||100;pl.emergT=0;pl.noElec=false;
    pl.touch=null;
  }
}
/* ===== v4.28: DESPLIEGUE — ¿qué mejoras armadas llevas a la incursión? =====
   Lo que marcas se aplica ESTA incursión y muere con tu nave (run.armedTaken,
   sale de save.armed al confirmar). Lo que NO marcas se queda guardado en
   save.armed y sobrevive: así puedes ahorrar lo bueno para el intento
   hardcore. En co-op cada piloto elige lo suyo y la incursión espera a
   todos (con timeout de seguridad de 8 s por piloto mudo). */
let deployThen=null,deployCoop=false,deployT=0,depSel=new Set();
let supSel={fuel:false,gen:false}; /* v4.29: suministros del pirata (default APAGADO: son preciados) */
function deployGate(then,coop){
  deployThen=then;deployCoop=!!coop;deployT=0;run.armedTaken=null;
  const armed=(save.armed||[]).length>0;
  const sup=((save.supplies&&save.supplies.fuel)||0)>0||((save.supplies&&save.supplies.gen)||0)>0;
  if(coop&&net.mode==='client'){
    if(!armed&&!sup){run.armedTaken=[];sendMsg({t:'depOk'});deployLaunch();return;}
    state='deploy';openDeploy();return;
  }
  if(armed||sup){state='deploy';openDeploy();return;}
  run.armedTaken=[];
  if(coop&&net.mode==='host'){net.depOk[0]=true;state='deploy';showScr(null);checkDeployReady();return;}
  deployLaunch();
}
function deployLaunch(){
  const f=deployThen;deployThen=null;
  $('#depList').innerHTML='';
  if(f)f();
  crewSay('launch'); /* v4.30: la tripulación saluda al despegar */
}
function openDeploy(){
  const groups=[];
  for(const pid of (save.armed||[])){
    const pk=perkById(pid);if(!pk)continue;
    let g=groups.find(q=>q.id===pid);
    if(!g){g={id:pid,pk,n:0};groups.push(g);}
    g.n++;
  }
  depSel=new Set(groups.map(g=>g.id));
  const box=$('#depList');box.innerHTML='';
  for(const g of groups){
    const el=document.createElement('button');
    el.className='dep-item on';el.type='button';
    el.innerHTML='<span class="dt-mark">✓</span><span class="dt-info"><b>✦ '+g.pk.name+'</b><small>'+g.pk.desc+'</small></span>'+(g.n>1?'<span class="dt-n">×'+g.n+'</span>':'');
    el.addEventListener('click',()=>{
      audio();
      if(depSel.has(g.id)){depSel.delete(g.id);el.classList.remove('on');}
      else{depSel.add(g.id);el.classList.add('on');}
      SFX.buy();vib(20);
    });
    box.appendChild(el);
  }
  $('#depNote').textContent=deployCoop?'CADA PILOTO ELIGE LO SUYO · LA INCURSIÓN ESPERA A TODOS':'';
  /* v4.29: SUMINISTROS DEL PIRATA — se activan aquí y se consumen */
  const sup=save.supplies||{fuel:0,gen:0};
  supSel={fuel:false,gen:false};
  const supBox=$('#depSup');
  supBox.innerHTML='';
  const SUPL=[
    {id:'fuel',name:'⛽ RESERVA DE COMBUSTIBLE',desc:'Se activa sola al quedarte a 0: tanque al 60%.'},
    {id:'gen',name:'⚡ GENERADOR PORTÁTIL',desc:'Reactor +60% de regeneración eléctrica toda la incursión.'},
  ];
  let anySup=false;
  for(const s of SUPL){
    const stock=sup[s.id]||0;
    if(stock<=0)continue;
    anySup=true;
    const el=document.createElement('button');
    el.className='dep-item sup';el.type='button';
    el.innerHTML='<span class="dt-mark">✓</span><span class="dt-info"><b>'+s.name+'</b><small>'+s.desc+' · tienes '+stock+' en bodega</small></span><span class="dt-n">DESACTIVADO</span>';
    el.addEventListener('click',()=>{
      audio();
      supSel[s.id]=!supSel[s.id];
      el.classList.toggle('on',supSel[s.id]);
      el.querySelector('.dt-n').textContent=supSel[s.id]?'SE USA ESTA VEZ':'DESACTIVADO';
      SFX.buy();vib(20);
    });
    supBox.appendChild(el);
  }
  if(anySup)supBox.classList.remove('hidden');else supBox.classList.add('hidden');
  $('#btnDeployGo').disabled=false;$('#btnDeploySkip').disabled=false;
  showScr('deploy');
}
function confirmDeploy(skip){
  if(!deployThen)return;
  const taken=[],kept=[];
  for(const pid of (save.armed||[])){
    if(!skip&&depSel.has(pid))taken.push(pid);else kept.push(pid);
  }
  save.armed=kept;
  run.armedTaken=taken;
  /* v4.29: los suministros marcados se CONSUMEN de la bodega */
  run.supFuel=0;run.supGen=0;
  if(!skip){
    const sup=save.supplies||{fuel:0,gen:0};
    if(supSel.fuel&&(sup.fuel||0)>0){sup.fuel--;run.supFuel=1;}
    if(supSel.gen&&(sup.gen||0)>0){sup.gen--;run.supGen=1;}
    save.supplies=sup;
  }
  persist();recompute();primePlayers();
  SFX.buy();vib(40);
  if(deployCoop&&net.mode==='host'){
    net.depOk[0]=true;
    $('#btnDeployGo').disabled=true;$('#btnDeploySkip').disabled=true;
    $('#depNote').textContent='LISTO · ESPERANDO A LOS DEMÁS PILOTOS…';
    checkDeployReady();
    return;
  }
  if(deployCoop&&net.mode==='client'){
    sendMsg({t:'depOk'});
    deployLaunch();
    return;
  }
  deployLaunch();
}
function checkDeployReady(){ /* solo anfitrión: ¿confirmaron todos los conectados? */
  if(!deployThen||!deployCoop||net.mode!=='host')return;
  if(!net.depOk[0])return;
  for(const c of net.conns)if(c.open&&!net.depOk[c.slot])return;
  sendMsg({t:'ev',k:'depGo'}); /* informativo */
  deployLaunch();
}
function startRun(){
  audio();goFullscreen();
  useProfile('local');
  weeklyMode=false;R=Math.random;
  runDiff=save.diff;
  save.runs++;persist();
  players=[mkPlayer(0)];localSlot=0;
  remoteBase={};
  resetRunCommon();
  recompute();
  primePlayers();
  players[0].x=W/2;players[0].y=H-130;
  runActive=true;
  /* v4.28: DESPLIEGUE — antes de la oleada 1 eliges qué mejoras armadas llevas */
  deployGate(()=>{
    state='play';showScr(null);
    $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
    $('#netTag').classList.add('hidden');
    refreshHUD();musStart();nextWave();
  });
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
  remoteBase={};
  resetRunCommon();
  recompute();
  primePlayers();
  players[0].x=W/2;players[0].y=H-130;
  runActive=true;
  deployGate(()=>{ /* v4.28: despliegue también en semanal */
    state='play';showScr(null);
    $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
    $('#netTag').classList.add('hidden');
    refreshHUD();musStart();
    banner('DESAFÍO SEMANAL','Semilla '+ws+' · NORMAL ×2.2 · igual para todos');
    nextWave();
  });
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
  remoteBase={};
  resetRunCommon();
  recompute();
  primePlayers();
  players[0].x=W/2;players[0].y=H-130;
  runActive=true;
  deployGate(()=>{ /* v4.28: despliegue también en diario */
    state='play';showScr(null);
    $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
    $('#netTag').classList.add('hidden');
    refreshHUD();musStart();
    banner('RETO DIARIO','Semilla '+ds+' · NORMAL ×2.2 · igual para todos');
    nextWave();
  });
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
  remoteBase={};
  resetRunCommon();
  frenzyMode=true;
  if(!save.frenzy)save.frenzy={bestT:0,bestK:0};
  /* v4.14: FANTASMA — compites contra la traza de tu mejor carrera (≥20 s) */
  run.ghostRef=(save.ghost&&save.ghost.trail&&save.ghost.trail.length&&save.ghost.t>=20)?makeGhostRef(save.ghost.trail):null;
  recompute();
  primePlayers();
  players[0].x=W/2;players[0].y=H-130;
  runActive=true;
  deployGate(()=>{ /* v4.28: despliegue también en frenético */
    state='play';showScr(null);
    $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
    $('#netTag').classList.add('hidden');
    refreshHUD();musStart();
    banner('MODO FRENÉTICO','HARDCORE ×5 · oleada infinita · sobrevive');
    nextWave();
  });
}
function startCoop(){
  runDiff=net.lobbyDiff||'normal';
  save.runs++;persist();
  /* v4.15: CO-OP DE 3 — el anfitrión monta un slot por piloto conectado */
  const np=1+net.conns.filter(c=>c.open).length;
  players=[mkPlayer(0)];
  for(let i=1;i<np;i++)players.push(mkPlayer(i));
  localSlot=0;
  resetRunCommon();
  recompute();
  primePlayers();
  players[0].x=W*.42;players[0].y=H-130;
  players[1].x=W*.58;players[1].y=H-130;
  if(players[2]){players[2].x=W*.5;players[2].y=H-92;}
  runActive=true;
  sendMsg({t:'start',diff:runDiff,np,skin:skinColorOf()}); /* v4.25: +aspecto */
  rvToken++;rvCleanup(); /* v4.28: si esto nace de una REVANCHA, cerrar su votación */
  /* v4.28: DESPLIEGUE CO-OP — cada piloto elige lo suyo; la incursión
     (nextWave) NO arranca hasta que todos confirman o hay timeout */
  deployGate(()=>{
    state='play';showScr(null);
    $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
    $('#netTag').classList.remove('hidden');
    refreshHUD();
    musStart();
    banner('CO-OP · '+np+' JUGADORES','Dificultad: '+DIFF_LABEL[runDiff]);
    nextWave();
  },true);
}
function startRunClient(d){
  run.level=1;run.kills=0;run.goldRun=0;run.gemsRun=0;
  run.relics=[];run.shipLv=1;run.exp=0;run.combo=0;
  run.missions=[
    {txt:'Destruye 40 enemigos',n:40,p:0,rw:60},
    {txt:'Recoge 120 de oro',n:120,p:0,rw:40},
    {txt:'Caza 2 élites',n:2,p:0,rw:80},
  ];
  pendingShipLevels=0;frenzyT=0;
  /* v4.15: el cliente monta tantos slots como diga el anfitrión (2 o 3) */
  const np=clamp(d.np||2,2,3);
  players=[];
  for(let i=0;i<np;i++)players.push(mkPlayer(i));
  localSlot=clamp(net.mySlot||1,1,np-1);
  enemies=[];bullets=[];ebullets=[];parts=[];pickups=[];floats=[];rings=[];beams=[];ultBeams=[];holes=[];wrecks=[];emosFx=[]; /* v4.14: holes */
  closeEmoPanel();
  cEnemies.clear();cEB=[];cBL=[];cPK=[];cWrecks=[];boss=null;cPirate=null; /* v4.31: sin pirata */
  run.buffs=players.map(()=>[]);
  run.curses=[]; /* v4.17 */
  /* v4.29: avisos y suministros a cero también en el cliente */
  run.noFuelWarned=false;run.noElecWarned=false;run.supFuel=0;run.supGen=0;
  run.pirSeal=null; /* v4.31: sin maldición pirata heredada */
  run.armedTaken=null;
  recompute();
  for(const pl of players){pl.hp=pl.maxHp;pl.invul=1;}
  players[0].x=W*.42;players[0].y=H-130;
  if(players[1]){players[1].x=W*.58;players[1].y=H-130;}
  if(players[2]){players[2].x=W*.5;players[2].y=H-92;}
  runActive=true;
  rvToken++;rvCleanup(); /* v4.28: cierre la votación de revancha si seguía abierta */
  /* v4.28: DESPLIEGUE del cliente — sin mejoras guardadas confirma solo y
     espera en el campo vacío; con mejoras, elige antes de entrar */
  deployGate(()=>{
    state='play';showScr(null);
    $('#hud').classList.remove('hidden');$('#hudBot').classList.remove('hidden');
    $('#netTag').classList.remove('hidden');
    banner('CO-OP CONECTADO','Dificultad: '+DIFF_LABEL[runDiff]);
    musStart();
  },true);
}
function nextWave(){
  ebullets=[];bullets=[];beams=[];ultBeams=[];holes=[];
  const L=run.level;
  if(net.mode!=='client'){
    if(L>save.best.lvl)save.best.lvl=L;
    if(L>save.bestAll)save.bestAll=L;
    bumpModeRecord(L); /* v4.23: récord de oleada por MODO (gates del arsenal) */
    /* v4.8: el récord del desafío semanal se guarda EN CADA OLEADA —
       aunque el jugador se retire por lag, su ranking ya está a salvo */
    if(weeklyMode){
      const ws=weekSeed();
      if(!save.weekly||save.weekly.seed!==ws)save.weekly={seed:ws,best:0};
      if(run.level>(save.weekly.best||0)){
        save.weekly.best=run.level;
        save.weekBestAll=Math.max(save.weekBestAll||0,run.level);
        addModeRecord('wk',ws,run.level,run.shipLv);
      }
    }
    /* v4.15: en co-op también queda el récord del equipo en MULTI */
    if(net.mode==='host'&&players.length>1)
      addModeRecord('mp','MP',run.level,run.shipLv);
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
  /* v4.29: cada nueva oleada repone un 35% de tanque y reactor (alivio co-op) */
  for(const pl of players){
    pl.fuel=Math.min(pl.fuelMax||100,(pl.fuel||0)+(pl.fuelMax||100)*.35);
    pl.en=Math.min(pl.enMax||100,(pl.en||0)+(pl.enMax||100)*.35);
  }
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
  if(net.mode!=='client')curseTickWave(); /* v4.17: las de varias oleadas cuentan atrás */
  /* v4.31: la MALDICIÓN PIRATA dura SOLO esa oleada; si el pirata sigue
     vivo al despejar, huye con lo robado a toda vela */
  if(net.mode!=='client'){
    if(run.pirSeal){run.pirSeal=null;recompute();sendMsg({t:'ev',k:'pirSeal',a:null});}
    if(pirate)pirate.flee=true;
  }
  buildWave(L);
  /* v4.28: el aviso de MEJORAS ARMADAS lo sustituye la pantalla de DESPLIEGUE,
     que aparece antes de la primera oleada (deployGate en cada inicio) */
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
/* v4.32: genera las 3 cartas candidatas (misma lógica para la ventana y
   para la MEJORA AL AZAR). cnt(id) cuenta los stacks — en co-op el
   anfitrión pasa una cnt que exige stack libre en TODAS las naves. */
function genShipPicks(cnt){
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
  return picks;
}
/* v4.32: MEJORA AL AZAR (solo/local) — elige una carta al azar, la instala
   y sigue el juego sin abrir la ventana */
function autoApplyLocal(picks){
  const c=picks[irand(0,picks.length-1)];
  applyShipCard(0,c.id);SFX.buy();
  const pl=players[0];
  if(pl)floater(pl.x,pl.y-56,'AL AZAR: '+c.name,'#B388FF',14);
  crewSay('autoUp',{n:c.name});
  pendingShipLevels--;
  if(pendingShipLevels>0){showShipLevelLocal();return;}
  state='play';showScr(null);persist();
}
function showShipLevelLocal(){
  const picks=genShipPicks(id=>cardStacks(0,id));
  if(autoUpOn()){autoApplyLocal(picks);return;} /* v4.32: casilla MEJORA AL AZAR */
  state='levelup';SFX.lvl();
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
  if(!(net.mode==='host'&&players.length>1))return;
  /* v4.15: esperan las elecciones de TODOS los slots (2–3 pilotos) */
  if(!net.relicOk||!net.relicOk[0])return;
  for(let s=1;s<players.length;s++)if(!net.relicOk[s])return;
  for(let s=1;s<players.length;s++){
    const id=net.relicId[s]||RELICS[0].id;
    if(!run.relics.includes(id))run.relics.push(id);
  }
  net.relicOk={};net.relicId={};
  recompute();persist();
  setRelicNote('TODOS ELIGIERON · PULSA CONTINUAR');
  const pu=$('#pbUnlock');
  pu.classList.remove('warn');
  pu.textContent='TODOS LISTOS · PULSA CONTINUAR';
}
function showPostBoss(){
  const key=bossName?bossName.split('-')[0]:'';
  const bk=save.bossKills||{};
  if(BOSS_DEFS[key])bk[key]=(bk[key]||0)+1;
  else if(key==='SEÑOR DE FORMAS')bk['SEÑOR']=(bk['SEÑOR']||0)+1;
  save.bossKills=bk;
  checkAch();persist();
  state='postboss';relicChosen=false;
  const coop=net.mode==='host'&&players.length>1;
  if(coop){net.relicOk={};net.relicId={};}
  const st=(k,v)=>`<div><small>${k}</small><b>${v}</b></div>`;
  $('#pbStats').innerHTML=
    st('GUARDIÁN PURGADO',bossName)+st('OLEADA',run.level)+
    st('ORO DE LA INCURSIÓN',run.goldRun)+st('GEMAS',run.gemsRun);
  $('#pbMinLv').textContent=`▲ NIVEL MÍNIMO ENEMIGO: ${minLvlOf(run.level+1)}`;
  const pu=$('#pbUnlock');pu.classList.remove('warn');
  if(coop){
    pu.textContent='CADA PILOTO ELIGE UNA RELIQUIA (TODAS SE APLICAN)';
    curRelics=shuffle(RELICS.filter(r=>!run.relics.includes(r.id))).slice(0,3);
    sendMsg({t:'ev',k:'relics',ids:curRelics.map(r=>r.id)});
    showRelicCards(curRelics,r=>{net.relicOk[0]=true;net.relicId[0]=r.id;applyRelicChoice();});
    showScr('post');
    return;
  }
  /* v4.23: contador REAL de mejoras comprables YA (comprueba padres y gates
     de modo/nave con nodeState) — antes contaba nodos con la oleada abierta
     aunque su rama estuviera cerrada y engañaba (“faltaban 9”) */
  const n=TREE.filter(nd=>!has(nd.id)&&nodeState(nd).dispo).length;
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
  shake=18;vib(200,true);
  hitStopT=0;
  musStop();
  /* v4.18: captura del récord ANTES de actualizarlo — para el gancho "TAN CERCA" */
  const prevBest=save.best.lvl||0;
  save.mShots=(save.mShots||0)+run.stShots;
  save.mHits=(save.mHits||0)+run.stHits;
  save.mDmg=(save.mDmg||0)+Math.round(run.stDmg);
  save.mTaken=(save.mTaken||0)+run.stTaken;
  save.mPerfect=(save.mPerfect||0)+run.stPerfect;
  save.best.lvl=Math.max(save.best.lvl,run.level);
  save.best.kills=Math.max(save.best.kills,run.kills);
  save.bestAll=Math.max(save.bestAll,run.level);
  save.bestShip=Math.max(save.bestShip,run.shipLv);
  bumpModeRecord(run.level); /* v4.23: récord de oleada por MODO */
  if(runDiff==='hardcore')save.bestHard=Math.max(save.bestHard||0,run.level);
  let weeklyRec=false;
  lastWeeklyRec=null;
  let frenRec=false;
  let dailyRec=false; /* v4.12 */
  let ghostLine=''; /* v4.14 */
  if(frenzyMode){
    if(!save.frenzy)save.frenzy={bestT:0,bestK:0};
    if(Math.floor(run.time)>(save.frenzy.bestT||0)||run.kills>(save.frenzy.bestK||0))frenRec=true;
    save.frenzy.bestT=Math.max(save.frenzy.bestT||0,Math.floor(run.time));
    save.frenzy.bestK=Math.max(save.frenzy.bestK||0,run.kills);
    /* v4.14: resultado contra el FANTASMA (antes de guardar la nueva traza) */
    if(run.ghostRef&&save.ghost&&save.ghost.t>0){
      if(Math.floor(run.time)>=save.ghost.t)
        ghostLine='<span class="k1">⚡ ¡SUPERASTE A TU FANTASMA · '+fmtT(Math.floor(run.time))+' vs récord '+fmtT(save.ghost.t)+'</span><br>';
      else{
        const lead=run.kills-run.ghostRef(run.time);
        ghostLine='<span class="'+(lead>=0?'k1':'k2')+'">FANTASMA: '+(lead>=0?'+':'')+lead+' bajas a los '+fmtT(Math.floor(run.time))+' (tu récord: '+fmtT(save.ghost.t)+')</span><br>';
      }
    }
    if(!save.ghost||Math.floor(run.time)>(save.ghost.t||0))
      save.ghost={t:Math.floor(run.time),k:run.kills,trail:run.ghostTrail.slice(-360)};
  }
  if(weeklyMode){
    const ws=weekSeed();
    if(save.weekly&&save.weekly.seed===ws){
      if(run.level>(save.weekly.best||0)){save.weekly.best=run.level;weeklyRec=true;}
    }
    save.weekBestAll=Math.max(save.weekBestAll||0,run.level);
    addModeRecord('wk',ws,run.level,run.shipLv);
    lastWeeklyRec=(save.ranking||[]).find(r=>r.seed===ws&&r.code===getPilot())||null;
  }
  /* v4.12: récord del Reto Diario · v4.15: registro por modo en el ranking */
  if(dailyMode){
    const ds=daySeed();
    if(!save.daily||save.daily.seed!==ds)save.daily={seed:ds,best:0};
    if(run.level>(save.daily.best||0)){save.daily.best=run.level;dailyRec=true;}
    save.dailyBest=Math.max(save.dailyBest||0,run.level);
    addModeRecord('dy','DY',run.level,run.shipLv);
  }else if(frenzyMode){
    addModeRecord('fz','FZ',Math.max(1,run.level),run.shipLv,String(run.kills));
  }else if(weeklyMode){
    /* ya registrado arriba */
  }else if(net.mode==='host'&&players.length>1){
    addModeRecord('mp','MP',run.level,run.shipLv);
  }else if(runDiff==='dificil'){
    addModeRecord('dc','DC',run.level,run.shipLv);
  }else if(runDiff==='hardcore'){
    addModeRecord('hc','HC',run.level,run.shipLv);
  }else{
    addModeRecord('nm','NM',run.level,run.shipLv);
  }
  checkAch();
  persist();
  if(net.mode==='host'&&players.length>1){
    sendMsg({t:'ev',k:'over',level:run.level,ship:run.shipLv,yg:run.goldRun,hard:runDiff==='hardcore'});
    netRankSync(); /* v4.25: el ranking final (con el récord del anfitrión) viaja ya al cliente */
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
    `<div><small>JEFES SIN DAÑO</small><b>${run.stPerfect}</b></div>`+
    `<div><small>MEJOR COMBO</small><b>×${save.bestCombo||0}</b></div>`;
  /* v4.18: PANTALLA DE MUERTE-GANCHO — morir no es el final, es la invitación:
     récord de combo, récord personal superado o el "TAN CERCA" que pide revancha */
  const kick=$('#ovKick');
  const gap=prevBest-run.level;
  if(kick){
    if(run.level>prevBest&&prevBest>0)kick.textContent='¡RÉCORD NUEVO!';
    else if(gap>=1&&gap<=2)kick.textContent='¡ESTUVISTE TAN CERCA!';
    else kick.textContent='TRANSMISIÓN TERMINADA';
  }
  let hook='';
  if(run.newComboRec&&save.bestCombo>=10)
    hook+=`<span class="k1">★ ¡NUEVO RÉCORD DE COMBO ×${save.bestCombo}!</span><br>`;
  if(run.level>prevBest&&prevBest>0)
    hook+=`<span class="k1">★ RÉCORD PERSONAL SUPERADO · OLEADA ${run.level} (antes ${prevBest})</span><br>`;
  else if(gap>=1&&gap<=2)
    hook+=`<span class="k1">⚡ A ${gap} oleada${gap>1?'s':''} de tu récord (${prevBest}) · ¿LA REVANCHA?</span><br>`;
  $('#ovHook').innerHTML=hook;
  /* v4.28: las DESPLEGADAS murieron contigo (salieron de save.armed en el
     despliegue); las que guardaste SOBREVIVEN para la próxima incursión */
  const nTaken=(run.armedTaken||[]).length;
  const nKept=(save.armed||[]).length;
  const prof=saveProfile==='net'?'perfil ONLINE':'perfil LOCAL';
  $('#ovKeep').innerHTML=
    (ghostLine||'')+
    (frenRec?`<span class="k1">★ ¡NUEVO RÉCORD FRENÉTICO · ${fmtT(save.frenzy.bestT)} · ${save.frenzy.bestK} BAJAS!</span><br>`:'')+
    (dailyRec?`<span class="k1">★ ¡NUEVO RÉCORD DEL RETO DIARIO · OLEADA ${save.daily.best}!</span><br>`:'')+
    (weeklyRec?`<span class="k1">★ ¡NUEVO RÉCORD SEMANAL · OLEADA ${save.weekly.best}!</span><br>`:'')+
    `<span class="k1">SE CONSERVA · ${ownedCount()}/${TREE.length} permanentes · oro · gemas · logros (${prof})</span><br>`+
    (nTaken?`<span class="k2">✦ LAS ${nTaken} MEJORA${nTaken>1?'S':''} DESPLEGADA${nTaken>1?'S':''} SE HAN PERDIDO CON TU NAVE</span><br>`:'')+
    (nKept?`<span class="k1">✦ ${nKept} MEJORA${nKept>1?'S':''} GUARDADA${nKept>1?'S':''} EN LA BÓVEDA · elige en el DESPLIEGUE de tu próxima incursión</span><br>`:'')+
    `<span class="k2">SE PIERDE · ${(run.buffs[localSlot]||[]).length} carta(s) temporal(es) · reliquias · nivel de nave</span>`;
  /* v4.8: eliminado el botón de copiar registro semanal por código */
  $('#hud').classList.add('hidden');$('#hudBot').classList.add('hidden');
  $('#bossBar').classList.add('hidden');
  closeEmoPanel();
  showScr('over');
  /* v4.28: REVANCHA — en co-op la sala sigue viva: botón de votación */
  if(net.mode==='host'&&connsOpen()>0)hostRevanchaUI();
  else{const r=$('#btnRetry');if(r)r.classList.remove('hidden');rvHideUI();}
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

