'use strict';
/* ============ logros ============ */
/* v4.15: LOGROS POR RECLAMAR — alcanzar un logro ya no paga al instante:
   suena el AVISO, se suma al CONTADOR del menú (#achBadge) y el jugador
   viene a LOGROS a RECLAMAR sus gemas. */
const ACHS=[
 {id:'k100', name:'CAZADOR NOVATO',   desc:'Elimina 100 enemigos en total',        rw:2, ck:()=>save.totKills>=100},
 {id:'k1000',name:'EXTERMINADOR',     desc:'Elimina 1000 enemigos en total',       rw:6, ck:()=>save.totKills>=1000},
 {id:'w10',  name:'SUPERVIVIENTE',    desc:'Alcanza la oleada 10',                 rw:2, ck:()=>save.bestAll>=10},
 {id:'w25',  name:'VETERANO',         desc:'Alcanza la oleada 25',                 rw:4, ck:()=>save.bestAll>=25},
 {id:'w50',  name:'LEYENDA',          desc:'Alcanza la oleada 50',                 rw:10,ck:()=>save.bestAll>=50},
 {id:'n10',  name:'NAVE PROTAGONISTA',desc:'Sube tu nave a nivel 10',              rw:2, ck:()=>save.bestShip>=10},
 {id:'n20',  name:'NAVE DE GUERRA',   desc:'Sube tu nave a nivel 20',              rw:6, ck:()=>save.bestShip>=20},
 {id:'e10',  name:'CAZADOR DE ÉLITES',desc:'Destruye 10 élites en total',          rw:3, ck:()=>save.totElite>=10},
 {id:'e50',  name:'PESADILLA DE ÉLITES',desc:'Destruye 50 élites en total',        rw:8, ck:()=>save.totElite>=50},
 {id:'res5', name:'ÁNGEL GUARDIÁN',   desc:'Rescata 5 naves caídas',               rw:3, ck:()=>save.totRescue>=5},
 {id:'buy20',name:'INGENIERO',        desc:'Desbloquea 20 nodos del arsenal',      rw:4, ck:()=>ownedCount()>=20},
 {id:'ch5',  name:'APERTURISTA',      desc:'Abre 5 cofres del Guardián',           rw:3, ck:()=>save.totChest>=5},
 {id:'hc15', name:'SIN MIEDO',        desc:'Oleada 15 en dificultad HARDCORE',     rw:10,ck:()=>save.bestHard>=15},
 {id:'mon',  name:'ROMPEMONOLITOS',   desc:'Derrota 5 MONOLITO',                   rw:3, ck:()=>(save.bossKills.MONOLITO||0)>=5},
 {id:'axi',  name:'PARADOJA RESUELTA',desc:'Derrota 5 AXIOMA',                     rw:3, ck:()=>(save.bossKills.AXIOMA||0)>=5},
 {id:'oct',  name:'OCHO CARAS',       desc:'Derrota 5 OCTAHEDRO',                  rw:3, ck:()=>(save.bossKills.OCTAHEDRO||0)>=5},
 {id:'ver',  name:'PUNTO FUGA',       desc:'Derrota 5 VÉRTICE',                    rw:3, ck:()=>(save.bossKills.VERTICE||0)>=5},
 {id:'cua',  name:'ORDEN 4',          desc:'Derrota 5 CUATERNIO',                  rw:3, ck:()=>(save.bossKills.CUATERNIO||0)>=5},
 {id:'lem',  name:'FUNDA EL NUDO',    desc:'Derrota 5 LEMNISCATA',                 rw:3, ck:()=>(save.bossKills.LEMNISCATA||0)>=5},
 {id:'tes',  name:'CONTRATEÍSIS',     desc:'Derrota 5 TÉSIS',                      rw:3, ck:()=>(save.bossKills.TESIS||0)>=5},
 {id:'sen',  name:'MAYESTAD',         desc:'Derrota al SEÑOR DE FORMAS',           rw:15,ck:()=>(save.bossKills.SEÑOR||0)>=1},
 {id:'wk10', name:'CAMPEÓN SEMANAL',  desc:'Oleada 10 en un Desafío Semanal',      rw:5, ck:()=>(save.weekBestAll||0)>=10},
 {id:'cmp5', name:'DESALOJADOR',      desc:'Derrota 5 Campistas',                  rw:3, ck:()=>(save.totCamp||0)>=5},
 {id:'elec', name:'TORMENTA ELÉCTRICA',desc:'Desbloquea el tope de ELECTRICIDAD',  rw:4, ck:()=>has('e3')},
 {id:'ice',  name:'ERA GLACIAL',      desc:'Desbloquea el tope de HIELO',          rw:4, ck:()=>has('e6')},
 {id:'wind', name:'SEÑOR DEL VIENTO', desc:'Desbloquea el tope de VIENTO',         rw:4, ck:()=>has('e9')},
 {id:'fire', name:'PIROMANÍACO',      desc:'Desbloquea el tope de FUEGO',          rw:4, ck:()=>has('e12')},
 /* v4.12: combos, hangar y reto diario */
 {id:'cb25', name:'EN CADENA',        desc:'Consigue un combo de 25 bajas',        rw:4, ck:()=>(save.bestCombo||0)>=25},
 {id:'cb50', name:'IMPARABLE',        desc:'Consigue un combo de 50 bajas',        rw:8, ck:()=>(save.bestCombo||0)>=50},
 {id:'skin1',name:'ESTILO PROPIO',    desc:'Compra un aspecto de nave en el HANGAR',rw:3, ck:()=>save.skins&&(save.skins.owned||[]).length>=2},
 {id:'dly10',name:'RUTA DIARIA',      desc:'Alcanza la oleada 10 en el Reto Diario',rw:5, ck:()=>(save.dailyBest||0)>=10},
 /* v4.14: agujero negro, fantasma y biomas */
 {id:'dfb', name:'DOBLE DEFINITIVA',  desc:'Desbloquea el AGUJERO NEGRO (2ª arma definitiva)',rw:6, ck:()=>has('df5')},
 {id:'dv60',name:'DEVORADOR DE MUNDOS',desc:'Devora 60 enemigos con el AGUJERO NEGRO',rw:5, ck:()=>(save.totDevour||0)>=60},
 {id:'ghb', name:'MÁS RÁPIDO QUE TU PASADO',desc:'Adelanta a tu FANTASMA en el modo frenético',rw:4, ck:()=>!!save.ghostBeat},
 {id:'bio5',name:'VIAJERO DE SECTORES',desc:'Visita los 5 biomas',rw:5, ck:()=>Object.keys(save.biomesSeen||{}).length>=5},
 {id:'bp5', name:'DOMADOR DE GUARDIANES',desc:'Lleva a un Guardián a la FASE 5',rw:8, ck:()=>(save.totPhase5||0)>=1},
 /* v4.16: el mago y su guardián */
 {id:'mg15',name:'ANTIMAGIA',          desc:'Elimina 15 MAGOS',                     rw:4, ck:()=>(save.totMage||0)>=15},
 {id:'hec', name:'ROMPEHECHIZOS',      desc:'Derrota 5 HECHICERO',                  rw:4, ck:()=>(save.bossKills.HECHICERO||0)>=5},
];
/* v4.15: logros alcanzados que aún no han sido reclamados */
function achPendingCount(){
  if(!save.ach)return 0;
  return ACHS.reduce((n,a)=>n+((save.ach[a.id]&&!(save.achClaimed&&save.achClaimed[a.id]))?1:0),0);
}
function refreshAchBadge(){
  const b=$('#achBadge');if(!b)return;
  const n=achPendingCount();
  b.textContent=n;
  b.classList.toggle('hidden',n<=0);
}
function checkAch(){
  let got=false;
  for(const a of ACHS){
    if(!save.ach[a.id]&&a.ck()){
      save.ach[a.id]=1;got=true;
      banner('LOGRO CONSEGUIDO',a.name+' · +'+a.rw+' gemas por reclamar');
      SFX.relic();vib(50);
    }
  }
  if(got){persist();refreshAchBadge();}
}
/* v4.15: reclamar la recompensa de un logro pendiente */
function claimAch(id){
  const a=ACHS.find(x=>x.id===id);if(!a)return;
  if(!save.ach[id]||(save.achClaimed&&save.achClaimed[id]))return;
  if(!save.achClaimed)save.achClaimed={};
  save.achClaimed[id]=1;
  save.gems+=a.rw;save.totGems=(save.totGems||0)+a.rw;
  persist();
  banner('LOGRO RECLAMADO',a.name+' · +'+a.rw+' gemas');
  SFX.relic();vib(40);
  refreshAchBadge();
}
