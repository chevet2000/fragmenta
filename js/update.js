'use strict';
/* ============ actualizador de versión ============
   Comprueba version.json (sin caché) contra la versión en ejecución.
   Si hay una versión nueva, muestra el botón ACTUALIZAR que recarga
   la página saltándose la caché (borra CacheStorage y añade ?rv=). */
function updHardReload(){
  const go=()=>{
    try{
      const u=new URL(location.href);
      u.searchParams.set('rv',Date.now());
      location.replace(u);
    }catch(e){location.reload();}
  };
  try{
    if(window.caches&&caches.keys){
      caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))).catch(()=>{}).then(go)).catch(go);
      return;
    }
  }catch(e){}
  go();
}
async function checkUpdate(manual){
  const b=$('#btnCheckUpd'),bu=$('#btnUpdate');
  try{
    const r=await fetch('version.json?nc='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error('http '+r.status);
    const j=await r.json();
    const rv=String(j.v||'').trim();
    if(rv&&rv!==String(VERSION)){
      if(bu){
        bu.classList.remove('hidden');
        bu.textContent='⟳ NUEVA VERSIÓN v'+rv+' · TOCA PARA ACTUALIZAR';
        bu.classList.add('pulse'); /* v4.19: late para que no se pase por alto */
      }
      if(b)b.textContent='HAY VERSIÓN NUEVA v'+rv;
      if(manual)banner('ACTUALIZACIÓN DISPONIBLE','Toca el botón para instalar v'+rv);
      return true;
    }
    if(b)b.textContent='✓ ESTÁS EN LA ÚLTIMA v'+VERSION;
    return false;
  }catch(e){
    if(b)b.textContent='NO SE PUDO COMPROBAR (¿SIN CONEXIÓN?)';
    return false;
  }
}
/* v4.8.1: autodiagnóstico de archivos desfasados.
   Si el HTML servido por la caché no coincide con el JS en ejecución
   (falta data-v o botones de esta versión), se recarga una sola vez
   saltándose la caché. Si tras recargar sigue roto, avisa sin buclear. */
function integrityCheck(){
  try{
    const need=['btnWipe','buffBar','curseBar','btnCheckUpd','comboGlow','ovHook','allyTag']; /* v4.20: +allyTag */
    const dv=document.documentElement.getAttribute('data-v');
    const ok=need.every(id=>!!document.getElementById(id))&&dv===String(VERSION);
    if(ok)return true;
    let tried=false;
    try{tried=!!sessionStorage.getItem('frag_ic');}catch(e){}
    const hadRv=/[?&]rv=/.test(location.search);
    if(!tried&&!hadRv){
      try{sessionStorage.setItem('frag_ic','1');}catch(e){}
      updHardReload();
      return false;
    }
    const eb=document.getElementById('errbox');
    if(eb){eb.classList.remove('hidden');
      eb.textContent='ARCHIVOS DESACTUALIZADOS: borra los datos del navegador o vuelve a subir el repo completo';}
    return false;
  }catch(e){return true;}
}
bindEl('#btnCheckUpd', 'click',()=>{audio();checkUpdate(true);});
bindEl('#btnUpdate', 'click',()=>{updHardReload();});
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&state==='menu')checkUpdate(false);
});
if(integrityCheck())checkUpdate(false);
