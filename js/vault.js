'use strict';
/* ============ v4.21: LA BÓVEDA ============
   Los COFRES SELLADOS que caen en partida se guardan aquí (save.vault)
   y se abren desde el MENÚ. Abrir uno cuesta resolver sus CERRADURAS:
   v4.26: el puzzle de PULSOS (reflejos + latencia táctil) se JUBILA.
   Las cerraduras son ahora de memoria y lectura, sin precisión:
   · ECO DE RUNAS — 6 runas iluminan una secuencia; repítela en orden.
   · ELIGE LA LLAVE — 5 llaves, 1 correcta, 3 intentos.
   Cada 4 fallos la calidad BAJA un nivel (l→e→r→c); el común se abre
   directo. Recompensa: MEJORAS ARMADAS al azar que se aplican al
   empezar la siguiente partida y duran HASTA QUE MUERAS. */
let vg=null; /* estado del minijuego */

function vaultArmedHTML(){
  const list=(save.armed||[]).map(perkById).filter(Boolean);
  if(!list.length)return '';
  const cnt={};list.forEach(p=>cnt[p.name]=(cnt[p.name]||0)+1);
  return '<div class="varmed"><b>✦ MEJORAS ARMADAS ('+list.length+')</b>'+
    '<small>En el DESPLIEGUE eliges cuáles llevar · las desplegadas mueren contigo, las guardadas sobreviven</small>'+
    '<div>'+Object.keys(cnt).map(k=>'<span>'+(cnt[k]>1?k+' ×'+cnt[k]:k)+'</span>').join('')+'</div></div>';
}
function openVault(){
  vgStop();vg=null; /* cualquier minijuego pendiente queda abandonado */
  $('#vaultGame').classList.add('hidden');
  $('#vaultMain').classList.remove('hidden');
  $('#vgEcho').classList.add('hidden');
  $('#vgKeys').classList.add('hidden');
  $('#btnVgCancel').textContent='DEJARLO PARA LUEGO';
  renderVault();
  showScr('vault');
}
function renderVault(){
  const v=save.vault||{c:0,r:0,e:0,l:0};
  $('#vaultSub').innerHTML=
    RARS.slice().reverse().map(r=>'<span class="vchip" style="border-color:'+RAR_COL[r]+';color:'+RAR_COL[r]+'">'+RAR_NAME[r]+' · '+(v[r]||0)+'</span>').join('')+
    '<small>'+vaultCount()+'/'+VCAP+' GUARDADOS · CON LA BÓVEDA LLENA NO CAEN MÁS</small>';
  $('#vaultArmed').innerHTML=vaultArmedHTML();
  const box=$('#vaultList');box.innerHTML='';
  let any=false;
  for(const r of RARS.slice().reverse()){ /* legendarios primero */
    for(let i=0;i<(v[r]||0);i++){
      any=true;
      const el=document.createElement('button');
      el.className='vchest';
      el.style.borderColor=RAR_COL[r];
      el.innerHTML='<b style="color:'+RAR_COL[r]+'">🔒 COFRE '+RAR_NAME[r]+'</b>'+
        '<small>'+(r==='c'?'Se abre directo · 1 de cada 4 sale vacío':r==='r'?'1 cerradura de ECO':r==='e'?'ECO + LLAVES · 2 cerraduras':'ECO doble + LLAVES · 3 cerraduras')+'</small>'+
        '<em>ABRIR</em>';
      el.addEventListener('click',()=>{audio();tryOpen(r);});
      box.appendChild(el);
    }
  }
  if(!any)box.innerHTML='<div class="vnone">BÓVEDA VACÍA<br><small>Los cofres sellados caen en partida (Guardianes, élites y bajas) y se guardan aquí para abrirlos con calma.</small></div>';
}
function tryOpen(rar){
  if(vg)return;
  if(rar==='c'){resolveVault('c','c');return;} /* el común no tiene cerradura */
  startLockGame(rar,rar);
}
/* ---- CERRADURA DE ECO + CERRADURA DE LLAVES ----
   raro: 1 ECO de 3 runas · épico: ECO de 4 + LLAVES · legendario:
   ECO de 4 + LLAVES + ECO de 5.
   v4.26: ADIÓS A LA CERRADURA DE PULSOS — diagnóstico del piloto:
   «no me funciona el primer puzzle, crea otro que no sea ese». El anillo
   con zona y franja roja dependía de reflejos y latencia táctil (los
   parches v4.23–v4.25 lo mejoraron pero seguía siendo traicionero en
   móvil). Su reemplazo es el ECO DE RUNAS: pura MEMORIA, cero precisión:
   1) las 6 runas iluminan una secuencia (cada una con su tono);
   2) la repites tocándolas en orden, a TU ritmo (no hay tiempo límite);
   3) si fallas, consumes 1 punto de resistencia (contador compartido de
      4) y la MISMA secuencia se vuelve a reproducir para que aprendas.
   La cerradura de LLAVES (v4.25) se conserva tal cual. */
function vgSpec(rar){
  if(rar==='r')return{locks:1,keyAt:0,echoLens:[3]};
  if(rar==='e')return{locks:2,keyAt:2,echoLens:[4]};
  return{locks:3,keyAt:2,echoLens:[4,5]};
}
/* orig = la rareza del cofre REAL guardado en la bóveda (no cambia al
   degradarse); rar = la calidad ACTUAL de la cerradura y del premio */
function startLockGame(rar,orig){
  const s=vgSpec(rar);
  vg={rar,orig:orig||rar,fails:0,lock:0,locks:s.locks,keyAt:s.keyAt,
      echoLens:s.echoLens,echoIdx:0,echo:null,key:null,dead:false,timers:[]};
  $('#vgKeys').classList.add('hidden');
  $('#vgEcho').classList.add('hidden');
  vgBuildRunes();
  $('#vaultMain').classList.add('hidden');
  $('#vaultGame').classList.remove('hidden');
  $('#btnVgCancel').textContent='DEJARLO PARA LUEGO';
  $('#vgTitle').innerHTML='🔒 COFRE '+RAR_NAME[rar]+' · CERRADURA <span id="vgLock">1/'+s.locks+'</span>';
  $('#vgHearts').innerHTML='';
  $('#vgMsg').className='';
  $('#vgMsg').textContent='';
  vgHearts();
  vgNextLock();
}
/* los 6 botones de runa se construyen UNA vez por minijuego (colores y
   formas fijas; cada runa suena distinto para memorizar con el oído) */
const VG_RUNES=[
  {c:'#7FD1B9',svg:'<path d="M12 3.5 L20.5 19.5 H3.5 Z"/>'},
  {c:'#64C7FF',svg:'<rect x="4.5" y="4.5" width="15" height="15"/>'},
  {c:'#FFD166',svg:'<circle cx="12" cy="12" r="8.2"/>'},
  {c:'#B388FF',svg:'<path d="M12 2.5 L21.5 12 L12 21.5 L2.5 12 Z"/>'},
  {c:'#FF6B6B',svg:'<path d="M5 5 L19 19 M19 5 L5 19"/>'},
  {c:'#F2EFE6',svg:'<path d="M12 2.5 L14.4 9.6 L21.5 12 L14.4 14.4 L12 21.5 L9.6 14.4 L2.5 12 L9.6 9.6 Z"/>'},
];
function vgBuildRunes(){
  const box=$('#vgEcho');
  box.innerHTML='';
  VG_RUNES.forEach((r,i)=>{
    const b=document.createElement('button');
    b.className='vgruna';b.type='button';
    b.style.setProperty('--rc',r.c);
    b.innerHTML='<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="'+r.c+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">'+r.svg+'</svg><i>RUNA '+(i+1)+'</i>';
    b.addEventListener('click',()=>vgEchoTap(i));
    box.appendChild(b);
  });
}
function vgTimer(fn,ms){
  const id=setTimeout(fn,ms);
  if(vg)vg.timers.push(id);
  return id;
}
function vgNextLock(){
  if(!vg)return;
  if(vgKeyLock())vgStartKeys();
  else vgStartEcho();
}
function vgHearts(){
  const h=$('#vgHearts');if(!h||!vg)return;
  const left=4-vg.fails; /* la cerradura aguanta 4 fallos */
  h.innerHTML='<small>RESISTENCIA DE LA CERRADURA</small><b>'+'◆'.repeat(left)+'◇'.repeat(vg.fails)+'</b>';
}
function vgStop(){
  if(!vg)return;
  for(const t of vg.timers)clearTimeout(t);
  if(!vg.dead){vg.dead=true;}
}
/* ---- v4.26: CERRADURA DE ECO — memoriza y repite la secuencia ---- */
const ECHO_LIGHT=380,ECHO_GAP=160,ECHO_START=560;
function vgStartEcho(){
  if(!vg)return;
  const len=vg.echoLens[Math.min(vg.echoIdx,vg.echoLens.length-1)];
  vg.echoIdx++;
  const seq=[];
  for(let i=0;i<len;i++)seq.push(irand(0,VG_RUNES.length-1));
  vg.echo={seq,pos:0,playing:true};
  $('#vgKeys').classList.add('hidden');
  $('#vgEcho').classList.remove('hidden');
  vgEchoReset();
  $('#vgMsg').className='';
  $('#vgMsg').textContent='OBSERVA LA SECUENCIA…';
  vgEchoPlay();
}
function vgEchoReset(){
  $('#vgEcho').querySelectorAll('.vgruna').forEach(b=>b.classList.remove('lit','bad','dim'));
}
function vgEchoLight(i,cls,ms){
  const btn=$('#vgEcho').children[i];
  if(!btn)return;
  btn.classList.add(cls||'lit');
  vgTimer(()=>btn.classList.remove(cls||'lit'),ms);
}
function vgEchoPlay(){
  if(!vg||!vg.echo)return;
  const seq=vg.echo.seq;
  vg.echo.playing=true;
  vgEchoReset();
  let t=ECHO_START;
  seq.forEach((r,i)=>{
    vgTimer(()=>{if(vg&&vg.echo){SFX.echo(r);vgEchoLight(r,'lit',ECHO_LIGHT);}},t);
    t+=ECHO_LIGHT+ECHO_GAP;
  });
  vgTimer(()=>{
    if(!vg||!vg.echo)return;
    vg.echo.playing=false;
    $('#vgMsg').className='';
    $('#vgMsg').textContent='TU TURNO · REPITE EL ECO ('+seq.length+' RUNAS)';
  },t+80);
}
function vgEchoTap(i){
  if(!vg||vg.dead||!vg.echo)return;
  if(vg.echo.playing)return;
  if(vg.key)return; /* en el puzzle de llaves los toques van a sus botones */
  audio();
  const e=vg.echo,btn=$('#vgEcho').children[i];
  if(btn)btn.classList.add('lit');
  vgTimer(()=>{if(btn)btn.classList.remove('lit');},150);
  SFX.echo(i);
  if(i===e.seq[e.pos]){
    e.pos++;
    if(e.pos>=e.seq.length){
      /* secuencia completa: cerradura abierta */
      vg.echo=null;
      SFX.lockHit();vib(20);
      vg.lock++;
      const lk=$('#vgLock');
      if(vg.lock>=vg.locks){
        /* v4.24: se consume el cofre ORIGINAL (no la calidad degradada) */
        const o=vg.orig;vgStop();resolveVault(vg.rar,o);return;
      }
      if(lk)lk.textContent=(vg.lock+1)+'/'+vg.locks;
      $('#vgMsg').className='';
      $('#vgMsg').textContent='¡ECO CORRECTO! SIGUIENTE CERRADURA…';
      vgTimer(vgNextLock,650);
    }
  }else{
    /* fallo: 1 punto de resistencia y la MISMA secuencia vuelve a sonar.
       v4.26: se bloquea el tablero hasta la repetición — un doble toque
       nervioso no puede comerse 2 puntos de resistencia */
    SFX.lockFail();vib(70);
    vg.echo.playing=true;
    if(btn)btn.classList.add('bad');
    vgTimer(()=>{if(btn)btn.classList.remove('bad');},420);
    const ended=vgFail('ECO INCORRECTO… OBSERVA OTRA VEZ');
    if(!ended)vgTimer(vgEchoReplay,720);
  }
}
function vgEchoReplay(){
  if(!vg||!vg.echo)return;
  vg.echo.pos=0;
  vgEchoPlay();
}
/* ---- v4.25: CERRADURA DE LLAVES — 5 llaves, una abre, 3 intentos ---- */
const VG_KEY_SVG='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><g fill="none" stroke="#FFD166" stroke-width="2" stroke-linecap="round"><circle cx="7.5" cy="7.5" r="4.2"/><path d="M10.8 10.8 L19.5 19.5 M15.8 15.8l2.8-2.8 M13 13l2.2-2.2"/></g></svg>';
function vgKeyLock(){return !!vg&&vg.keyAt>0&&vg.lock+1===vg.keyAt;}
function vgStartKeys(){
  if(!vg)return;
  vg.echo=null;
  vg.key={ok:irand(0,4),tries:3,dead:[]};
  $('#vgEcho').classList.add('hidden');
  const box=$('#vgKeys');
  box.classList.remove('hidden');box.innerHTML='';
  for(let i=0;i<5;i++){
    const b=document.createElement('button');
    b.className='vgkey';b.type='button';
    b.innerHTML=VG_KEY_SVG+'<i>LLAVE '+(i+1)+'</i>';
    b.addEventListener('click',()=>vgKeyPick(i));
    box.appendChild(b);
  }
  $('#vgMsg').className='';
  $('#vgMsg').textContent='ELIGE LA LLAVE CORRECTA · '+vg.key.tries+' INTENTOS';
}
function vgKeyPick(i){
  if(!vg||vg.dead||!vg.key)return;
  audio();
  if(vg.key.dead.indexOf(i)>=0)return;
  const btn=$('#vgKeys').children[i];
  if(i===vg.key.ok){
    SFX.lockHit();vib(20);
    if(btn)btn.classList.add('ok');
    vg.key=null;
    vg.lock++;
    const lk=$('#vgLock');
    if(vg.lock>=vg.locks){
      setTimeout(()=>{$('#vgKeys').classList.add('hidden');},240);
      const o=vg.orig;vgStop();resolveVault(vg.rar,o);return;
    }
    if(lk)lk.textContent=(vg.lock+1)+'/'+vg.locks;
    $('#vgMsg').className='';
    $('#vgMsg').textContent='¡LLAVE CORRECTA! SIGUIENTE CERRADURA…';
    vgTimer(()=>{$('#vgKeys').classList.add('hidden');vgNextLock();},340);
  }else{
    SFX.lockFail();vib(70);
    if(btn)btn.classList.add('dead');
    vg.key.dead.push(i);vg.key.tries--;
    if(vg.key.tries<=0){
      /* los 3 intentos gastados: 1 punto de resistencia y cerradura nueva */
      const ended=vgFail('NINGUNA LLAVE ABRIÓ… SE HACE UNA CERRADURA NUEVA');
      if(!ended)vgStartKeys();
    }else{
      $('#vgMsg').className='bad';
      $('#vgMsg').textContent='LLAVE EQUIVOCADA · te quedan '+vg.key.tries+' intento'+(vg.key.tries===1?'':'s');
    }
  }
}
/* degradación compartida entre cerraduras de eco y de llaves.
   Devuelve true si el cofre se degradó (el minijuego terminó). */
function vgFail(custom){
  vg.fails++;vgHearts();
  if(vg.fails>=4){ /* degradación a los 4 fallos */
    const order=['l','e','r','c'];
    const nr=order[Math.min(order.length-1,order.indexOf(vg.rar)+1)];
    const orig=vg.orig;
    vgStop();
    if(nr==='c'){
      $('#vgMsg').className='bad';
      $('#vgMsg').textContent='LA CERRADURA CEDIÓ DEL TODO… CALIDAD FINAL: COMÚN';
      setTimeout(()=>{resolveVault('c',orig);},700);
    }else{
      $('#vgMsg').className='bad';
      $('#vgMsg').textContent='DEMASIADOS FALLOS · EL COFRE BAJA A '+RAR_NAME[nr];
      setTimeout(()=>startLockGame(nr,orig),950);
    }
    return true;
  }
  $('#vgMsg').className='bad';
  $('#vgMsg').textContent=custom||('FALLO · te quedan '+(4-vg.fails)+' antes de bajar de calidad');
  return false;
}
function resolveVault(tier,orig){
  vgStop();vg=null;
  $('#vgKeys').classList.add('hidden');
  $('#vgEcho').classList.add('hidden');
  orig=orig||tier;
  /* se consume el cofre ORIGINAL (el que guardaste); la calidad del premio
     es la del tier final tras la degradación */
  save.vault[orig]=Math.max(0,(save.vault[orig]||0)-1);
  save.totVaultOpen=(save.totVaultOpen||0)+1;
  if(tier==='l')save.totVaultL=(save.totVaultL||0)+1;
  const n=tier==='l'?3:tier==='e'?2:tier==='r'?1:(Math.random()<.75?1:0); /* común 75% con botín */
  const ids=n?rollPerks(n,tier):[];
  for(const id of ids)save.armed.push(id);
  persist();checkAch();
  $('#vgHearts').innerHTML='';
  $('#vgTitle').innerHTML=
    tier==='l'?'<span style="color:#FFD166">★ COFRE LEGENDARIO ABIERTO</span>':
    tier==='e'?'<span style="color:#B388FF">◆ COFRE ÉPICO ABIERTO</span>':
    tier==='r'?'<span style="color:#64C7FF">● COFRE RARO ABIERTO</span>':'COFRE COMÚN ABIERTO';
  const got=ids.map(perkById).filter(Boolean);
  const msg=$('#vgMsg');msg.className='';
  if(!got.length){
    SFX.vaultEmpty();
    msg.innerHTML='ESTABA VACÍO…<br><small>Así son los cofres comunes: a veces solo guardan polvo estelar</small>';
  }else{
    SFX.vaultOpen();vib(50);
    msg.innerHTML=got.map(p=>'<b style="color:#7FD1B9">✦ '+p.name+'</b> — '+p.desc).join('<br>')+
      '<div class="vnote">ARMADAS · en el DESPLIEGUE eliges si llevarlas a la incursión; si las GUARDAS, sobreviven aunque caigas</div>';
  }
  $('#btnVgCancel').textContent='VOLVER A LA BÓVEDA';
  refreshMenu();
}
/* ---- enlaces de la interfaz ---- */
bindEl('#btnBoveda','click',()=>{audio();openVault();});
bindEl('#btnVaultBack','click',()=>{vgStop();vg=null;refreshMenu();showScr('menu');});
bindEl('#btnVgCancel','click',()=>{
  vgStop();vg=null;
  $('#vaultGame').classList.add('hidden');
  $('#vaultMain').classList.remove('hidden');
  $('#vgEcho').classList.add('hidden');
  $('#vgKeys').classList.add('hidden');
  $('#btnVgCancel').textContent='DEJARLO PARA LUEGO';
  renderVault();
});
