'use strict';
/* ============ logros ============ */
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
];
function checkAch(){
  let got=false;
  for(const a of ACHS){
    if(!save.ach[a.id]&&a.ck()){
      save.ach[a.id]=1;save.gems+=a.rw;got=true;
      banner('LOGRO CUMPLIDO',a.name+' · +'+a.rw+' gemas');
      SFX.relic();vib(50);
    }
  }
  if(got)persist();
}

