'use strict';
/* ============ reliquias / cartas ============ */
const RELICS=[
 {id:'deton',name:'DETONACIÓN',desc:'Los enemigos explotan al morir y dañan a los cercanos.'},
 {id:'mirror',name:'ESPEJO',desc:'Tus bloqueos contraatacan al enemigo más cercano.'},
 {id:'magnet',name:'IMÁN SUPREMO',desc:'Radio de recogida x2.'},
 {id:'nucleo',name:'NÚCLEO INESTABLE',desc:'+2 de daño, −1 de vida máxima.'},
 {id:'hierro',name:'CORAZÓN DE HIERRO',desc:'+3 de vida máxima y cura 3 al obtenerla.'},
 {id:'tiempo',name:'TIEMPO ROTO',desc:'Balas enemigas un 15% más lentas.'},
 {id:'sangre',name:'SED DE SANGRE',desc:'Ejecutas (x3 daño) bajo el 40% de vida enemiga.'},
 {id:'alquimia',name:'ALQUIMIA',desc:'+30% de oro.'},
 {id:'mente',name:'MENTE ANALÍTICA',desc:'+30% de experiencia.'},
 {id:'crudas',name:'GEMAS CRUDAS',desc:'+8% de probabilidad de gema extra.'},
];
/* v4.8: 'heal' y la curación de 'plate' son INSTANTÁNEAS (se aplican una vez al
   elegirla, ver applyShipCard). Su fx ya no cura en cada recompute — antes se
   acumulaba curación infinita con cada recalculación de mejoras. */
const CARDS=[
 {id:'dmg1',name:'MUNICIÓN',desc:'+1 de daño durante esta partida.',tier:0,f:b=>b.dmg+=1},
 {id:'rate',name:'GATILLO RÁPIDO',desc:'+18% de cadencia de disparo.',tier:0,f:b=>b.rate*=1.18},
 {id:'spd',name:'MOTOR LIGERO',desc:'+15% de velocidad de la nave.',tier:0,f:b=>b.spd*=1.15},
 {id:'heal',name:'REPARACIÓN',desc:'Restaura 3 de vida al instante.',tier:0,f:b=>{}},
 {id:'plate',name:'PLACA FRONTAL',desc:'+2 de vida máxima y cura 2.',tier:0,f:b=>b.maxHp+=2},
 {id:'xp20',name:'MENTE AGUDA',desc:'+20% de experiencia.',tier:0,f:b=>b.expMul*=1.2},
 {id:'twin',name:'CAÑÓN DOBLE',desc:'+1 proyectil por disparo.',tier:1,f:b=>b.bul+=1},
 {id:'pierce',name:'PUNTA PERFORANTE',desc:'Las balas atraviesan +1 enemigo.',tier:1,f:b=>b.pierce+=1},
 {id:'crit',name:'OJO CRÍTICO',desc:'+12% de probabilidad crítica.',tier:1,f:b=>b.crit+=.12},
 {id:'drone',name:'DRON AUXILIAR',desc:'+1 dron orbital.',tier:1,f:b=>b.drones+=1},
 {id:'shield',name:'ESCUDO DE CARGA',desc:'Escudo que bloquea 1 golpe (recarga 25 s).',tier:1,f:b=>b.shield=true},
 {id:'field',name:'CAMPO DEFENSIVO',desc:'Bloquea 1 golpe al inicio de cada oleada.',tier:1,f:b=>b.field=true},
 {id:'heavy',name:'NÚCLEO PESADO',desc:'+3 de daño.',tier:2,f:b=>b.dmg+=3},
 {id:'storm',name:'TORRENTA',desc:'+1 proyectil y +10% de cadencia.',tier:2,f:b=>{b.bul++;b.rate*=1.10}},
 {id:'bounce',name:'REBOTICA',desc:'Las balas rebotan 1 vez.',tier:2,f:b=>b.bounce++},
 {id:'over',name:'SOBRECARGA',desc:'Cada 6.º disparo es pesado (x3 de daño).',tier:2,f:b=>b.over=true},
 {id:'homing',name:'RASTREADORES',desc:'Misil teledirigido cada 2.5 s.',tier:2,f:b=>b.homing=true},
 {id:'file2',name:'DOBLE COLUMNA',desc:'+1 fila de balas durante esta partida.',tier:2,f:b=>b.files=Math.max(b.files,2)},
];
/* v4.8: cada carta se puede elegir como máximo 10 veces por partida */
const MAX_STACKS=10;
const cardStacks=(slot,id)=>(run.buffs[slot]||[]).filter(x=>x===id).length;
function healPlayerOnce(slot,v){
  const pl=players[slot];if(!pl||pl.hp<=0)return;
  pl.hp=Math.min(pl.maxHp,pl.hp+v);
}
/* aplica una carta de nave a un slot con tope de 10 y curaciones instantáneas */
function applyShipCard(slot,id){
  const c=CARDS.find(c=>c.id===id);if(!c)return;
  if(cardStacks(slot,id)>=MAX_STACKS){
    grantGold(slot,150);
    if(players[slot])floater(players[slot].x,players[slot].y-30,'+150 ORO (MEJORA AL TOPE)','#FFD166',11);
    return;
  }
  run.buffs[slot].push(id);
  recompute();
  if(id==='heal')healPlayerOnce(slot,3);
  if(id==='plate')healPlayerOnce(slot,2);
}

