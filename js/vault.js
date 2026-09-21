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
        '<small>'+(r==='c'?'Se abre directo · 1 de cada 4 sale vacío':r==='r'?'1 cerradura':r==='e'?'2 cerraduras':'3 cerraduras · zona trampa')+'</small>'+
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
/* ---- CERRADURA DE PULSOS ----
   raro: 1 cerradura ancha y lenta · épico: 2 más estrechas y rápidas ·
   legendario: 3 estrechas, rápidas y con ZONA TRAMPA.
   v4.23: más justas — zonas más anchas, giro algo más lento y la
   cerradura aguanta 4 fallos antes de bajar de calidad (antes 3).
   v4.24: ANÁLISIS DEL «LE DOY BIEN Y FALLA» — tres culpables corregidos:
   1) cada pointerdown contaba: los dobles registros del táctil (y los
      toques de rebote) se comían resistencia de la cerradura → ahora hay
      un freno de 220 ms entre toques registrados;
   2) la LATENCIA TÁCTIL: el toque llega cuando el marcador ya cruzó lo que
      veías → gracia de +7° en el borde de salida de la zona;
   3) zonas algo más anchas y giro algo más lento (r 88/130 · e 66/160 ·
      l 50/205 con trampa 36) y el marcador ya no nace DENTRO de la trampa. */
const VG_C=2*Math.PI*46; /* circunferencia del anillo (r=46 en el SVG) */
function vgSpec(rar){
  if(rar==='r')return{locks:1,spd:130,zw:88,decoy:0};
  if(rar==='e')return{locks:2,spd:160,zw:66,decoy:0};
  return{locks:3,spd:205,zw:50,decoy:36};
}
/* orig = la rareza del cofre REAL guardado en la bóveda (no cambia al
   degradarse); rar = la calidad ACTUAL de la cerradura y del premio */
function startLockGame(rar,orig){
  const s=vgSpec(rar);
  vg={rar,orig:orig||rar,fails:0,lock:0,locks:s.locks,spd:s.spd,zw:s.zw,decoyW:s.decoy,
      zs:rand(0,360),ds:-999,ang:rand(0,360),raf:0,last:0,dead:false};
  vgNextLock();
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
  vg.zs=rand(0,360);
  if(vg.decoyW>0)vg.ds=(vg.zs+vg.zw+50+rand(0,130))%360; /* trampa separada de la zona */
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
    vgNextLock();vgDraw();
    $('#vgMsg').textContent='¡CLIC! SIGUIENTE CERRADURA…';
  }else{
    SFX.lockFail();vib(70);
    vg.fails++;vgHearts();
    if(vg.fails>=4){ /* v4.23: degradación a los 4 fallos (antes 3) */
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
      return;
    }
    $('#vgMsg').className='bad';
    $('#vgMsg').textContent='FALLO · te quedan '+(4-vg.fails)+' antes de bajar de calidad';
  }
}
function resolveVault(tier,orig){
  vgStop();vg=null;
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
  $('#btnVgCancel').textContent='DEJARLO PARA LUEGO';
  renderVault();
});
$('#vaultGame').addEventListener('pointerdown',vgTap,{passive:false});
