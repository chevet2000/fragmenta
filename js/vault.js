'use strict';
/* ============ v4.21: LA BÓVEDA ============
   Los COFRES SELLADOS que caen en partida se guardan aquí (save.vault)
   y se abren desde el MENÚ. Abrir uno cuesta un minijuego: la CERRADURA
   DE PULSOS — un marcador gira y debes tocar cuando cruza la zona de su
   rareza. Cada 3 fallos la calidad BAJA un nivel (l→e→r→c); el común se
   abre directo. Recompensa: MEJORAS ARMADAS al azar que se aplican al
   empezar la siguiente partida y duran HASTA QUE MUERAS. */
let vg=null; /* estado del minijuego */

function vaultArmedHTML(){
  const list=(save.armed||[]).map(perkById).filter(Boolean);
  if(!list.length)return '';
  const cnt={};list.forEach(p=>cnt[p.name]=(cnt[p.name]||0)+1);
  return '<div class="varmed"><b>✦ MEJORAS ARMADAS ('+list.length+')</b>'+
    '<small>Se aplican al empezar tu PRÓXIMA partida · duran HASTA QUE MUERAS</small>'+
    '<div>'+Object.keys(cnt).map(k=>'<span>'+(cnt[k]>1?k+' ×'+cnt[k]:k)+'</span>').join('')+'</div></div>';
}
function openVault(){
  vgStop();
  $('#vaultGame').classList.add('hidden');
  $('#vaultMain').classList.remove('hidden');
  $('#vgSvg').classList.remove('hidden');
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
        '<small>'+(r==='c'?'Se abre directo · 1 de cada 4 sale vacío':r==='r'?'1 cerradura de pulsos':r==='e'?'2 cerraduras · la última de LLAVES':'3 cerraduras · trampa + LLAVES')+'</small>'+
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
/* ---- CERRADURA DE PULSOS + CERRADURA DE LLAVES ----
   raro: 1 cerradura ancha y lenta · épico: 2 más estrechas y rápidas (la 2.ª
   de LLAVES) · legendario: 2 de pulsos con ZONA TRAMPA + 1 de LLAVES.
   v4.23: más justas — zonas más anchas, giro algo más lento y la
   cerradura aguanta 4 fallos antes de bajar de calidad (antes 3).
   v4.24: freno anti doble-toque de 220 ms + gracia de +7° por latencia.
   v4.25: EL LEGENDARIO YA ES GANABLE — diagnóstico del «solo abrí 1»:
   1) la zona nacía en CUALQUIER sitio (a veces pegada al marcador: había
      cerraduras imposibles de reaccionar) → ahora SIEMPRE nace al menos
      110° por delante del marcador (mínimo ~0,6 s para reaccionar);
   2) la trampa podía caer justo tras la zona y cazaba el toque tardío →
      ahora queda como mínimo 80° después del borde de la zona;
   3) giro 205→180 y zona 50→56: la ventana buena dura 0,35 s (antes 0,28).
   La FRANJA ROJA (trampa) SOLO existe en el legendario — validado: raro y
   épico nunca la tuvieron (decoy 0); se conserva como identidad del
   legendario pero ya no es una celada.
   v4.25: puzzle ELIGE LA LLAVE — 5 llaves, 1 correcta, 3 intentos; fallar
   los 3 consume 1 punto de resistencia (el mismo contador de 4) y se
   rehace la cerradura con llaves nuevas. */
const VG_C=2*Math.PI*46; /* circunferencia del anillo (r=46 en el SVG) */
function vgSpec(rar){
  if(rar==='r')return{locks:1,spd:130,zw:88,decoy:0,keyAt:0};
  if(rar==='e')return{locks:2,spd:160,zw:66,decoy:0,keyAt:2};
  return{locks:3,spd:180,zw:56,decoy:32,keyAt:3};
}
/* orig = la rareza del cofre REAL guardado en la bóveda (no cambia al
   degradarse); rar = la calidad ACTUAL de la cerradura y del premio */
function startLockGame(rar,orig){
  const s=vgSpec(rar);
  vg={rar,orig:orig||rar,fails:0,lock:0,locks:s.locks,spd:s.spd,zw:s.zw,decoyW:s.decoy,
      keyAt:s.keyAt||0,key:null,
      zs:rand(0,360),ds:-999,ang:rand(0,360),raf:0,last:0,dead:false};
  $('#vgKeys').classList.add('hidden');$('#vgSvg').classList.remove('hidden');
  if(vgKeyLock())vgStartKeys();else vgNextLock();
  /* v4.24: el marcador no puede NACER dentro de la zona trampa */
  if(vg.decoyW>0&&(((vg.ang-vg.ds)%360+360)%360)<=vg.decoyW)
    vg.ang=(vg.ds+vg.decoyW+15+rand(0,120))%360;
  $('#vaultMain').classList.add('hidden');
  $('#vaultGame').classList.remove('hidden');
  $('#vgSvg').classList.remove('hidden');
  $('#btnVgCancel').textContent='DEJARLO PARA LUEGO';
  $('#vgTitle').innerHTML='🔒 COFRE '+RAR_NAME[rar]+' · CERRADURA <span id="vgLock">1/'+s.locks+'</span>';
  $('#vgHearts').innerHTML='';
  $('#vgMsg').className='';
  $('#vgMsg').textContent='TOCA CUANDO EL MARCADOR CRUCE LA ZONA DE SU COLOR';
  vgDraw();vgHearts();
  vg.last=performance.now();
  const step=t=>{
    if(!vg||vg.dead)return;
    const dt=Math.min(.05,(t-vg.last)/1000);vg.last=t;
    vg.ang=(vg.ang+vg.spd*dt)%360;
    vgDraw();
    vg.raf=requestAnimationFrame(step);
  };
  vg.raf=requestAnimationFrame(step);
}
function vgNextLock(){
  if(!vg)return;
  /* v4.25: la zona SIEMPRE nace al menos 110° por delante del marcador —
     antes podía nacer pegada a él y había cerraduras imposibles */
  vg.zs=(vg.ang+110+rand(0,180))%360;
  if(vg.decoyW>0)vg.ds=(vg.zs+vg.zw+80+rand(0,110))%360; /* trampa lejos del borde de la zona */
}
function vgDraw(){
  const zone=$('#vgZone'),decoy=$('#vgDecoy'),mark=$('#vgMark');
  if(!zone||!vg)return;
  zone.setAttribute('stroke-dasharray',(vg.zw/360*VG_C).toFixed(2)+' '+VG_C.toFixed(2));
  zone.setAttribute('transform','rotate('+(vg.zs+90)+' 60 60)');
  zone.setAttribute('stroke',RAR_COL[vg.rar]);
  if(vg.decoyW>0){
    decoy.classList.remove('hidden');
    decoy.setAttribute('stroke-dasharray',(vg.decoyW/360*VG_C).toFixed(2)+' '+VG_C.toFixed(2));
    decoy.setAttribute('transform','rotate('+(vg.ds+90)+' 60 60)');
  }else decoy.classList.add('hidden');
  mark.setAttribute('transform','rotate('+vg.ang+' 60 60)');
}
function vgHearts(){
  const h=$('#vgHearts');if(!h||!vg)return;
  const left=4-vg.fails; /* v4.23: la cerradura aguanta 4 fallos */
  h.innerHTML='<small>RESISTENCIA DE LA CERRADURA</small><b>'+'◆'.repeat(left)+'◇'.repeat(vg.fails)+'</b>';
}
function vgStop(){
  if(vg&&!vg.dead){vg.dead=true;try{cancelAnimationFrame(vg.raf);}catch(e){}}
}
function vgTap(ev){
  if(!vg||vg.dead)return;
  if(vg.key)return; /* v4.25: en el puzzle de llaves los toques van a los botones, no aquí */
  ev.preventDefault();
  /* v4.24: FRENO DE TOQUE — un mismo toque físico genera a veces dos
     pointerdown (fantasma del táctil) y los toques nerviosos se cuentan
     como intentos; solo se registra uno cada 220 ms */
  const now=performance.now();
  if(vg.lastTapT&&now-vg.lastTapT<220)return;
  vg.lastTapT=now;
  audio();
  const rel=((vg.ang-vg.zs)%360+360)%360;
  const reld=vg.decoyW>0?(((vg.ang-vg.ds)%360+360)%360):999;
  /* v4.24: gracia +7° en el borde de SALIDA — la latencia táctil registra
     el toque con el marcador ya pasado (en legendario son ~11° por pulso) */
  if(rel<=vg.zw+7&&!(vg.decoyW>0&&reld<=vg.decoyW)){
    SFX.lockHit();vib(20);
    vg.lock++;
    const lk=$('#vgLock');
    /* v4.24: BUG DE CONTABILIDAD — al ganar se pasa vg.orig: antes se
       consumía de la bóveda el cofre de la calidad DEGRADADA (p. ej. un
       épico) y el legendario original se quedaba en la bóveda para siempre */
    if(vg.lock>=vg.locks){const o=vg.orig;vgStop();resolveVault(vg.rar,o);return;}
    if(lk)lk.textContent=(vg.lock+1)+'/'+vg.locks;
    if(vgKeyLock())vgStartKeys(); /* v4.25: toca el puzzle de llaves */
    else{vgNextLock();vgDraw();}
    $('#vgMsg').className='';
    $('#vgMsg').textContent=vgKeyLock()?'AHORA TOCA: ELIGE LA LLAVE CORRECTA':'¡CLIC! SIGUIENTE CERRADURA…';
  }else{
    SFX.lockFail();vib(70);
    vgFail(); /* v4.25: degradación compartida */
  }
}
/* v4.25: degradación compartida entre cerraduras de pulsos y de llaves.
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
/* ---- v4.25: CERRADURA DE LLAVES — 5 llaves, una abre, 3 intentos ---- */
const VG_KEY_SVG='<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><g fill="none" stroke="#FFD166" stroke-width="2" stroke-linecap="round"><circle cx="7.5" cy="7.5" r="4.2"/><path d="M10.8 10.8 L19.5 19.5 M15.8 15.8l2.8-2.8 M13 13l2.2-2.2"/></g></svg>';
function vgKeyLock(){return !!vg&&vg.keyAt>0&&vg.lock+1===vg.keyAt;}
function vgStartKeys(){
  vg.key={ok:irand(0,4),tries:3,dead:[]};
  $('#vgSvg').classList.add('hidden');
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
    setTimeout(()=>{$('#vgKeys').classList.add('hidden');$('#vgSvg').classList.remove('hidden');},240);
    vgNextLock();vgDraw();
    $('#vgMsg').className='';
    $('#vgMsg').textContent='¡LLAVE CORRECTA! SIGUIENTE CERRADURA…';
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
function resolveVault(tier,orig){
  vgStop();vg=null;
  $('#vgKeys').classList.add('hidden');
  orig=orig||tier;
  /* se consume el cofre ORIGINAL (el que guardaste); la calidad del premio
     es la del tier final tras la degradación */
  save.vault[orig]=Math.max(0,(save.vault[orig]||0)-1);
  save.totVaultOpen=(save.totVaultOpen||0)+1;
  if(tier==='l')save.totVaultL=(save.totVaultL||0)+1;
  const n=tier==='l'?3:tier==='e'?2:tier==='r'?1:(Math.random()<.75?1:0); /* v4.23: común 75% con botín (antes 60%) */
  const ids=n?rollPerks(n,tier):[];
  for(const id of ids)save.armed.push(id);
  persist();checkAch();
  $('#vgSvg').classList.add('hidden');
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
      '<div class="vnote">ARMADAS · se aplican al empezar tu próxima partida y duran HASTA QUE MUERAS</div>';
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
  $('#vgSvg').classList.remove('hidden');
  $('#vgKeys').classList.add('hidden');
  $('#btnVgCancel').textContent='DEJARLO PARA LUEGO';
  renderVault();
});
$('#vaultGame').addEventListener('pointerdown',vgTap,{passive:false});
