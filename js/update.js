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
$('#btnCheckUpd').addEventListener('click',()=>{audio();checkUpdate(true);});
$('#btnUpdate').addEventListener('click',()=>{updHardReload();});
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&state==='menu')checkUpdate(false);
});
checkUpdate(false);
