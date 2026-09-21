'use strict';
/* ============ dificultad ============ */
const DIFFS={solo:1,normal:2.2,dificil:3,hardcore:5};
const DIFF_LABEL={solo:'SOLO ×1',normal:'NORMAL ×2.2',dificil:'DIFÍCIL ×3',hardcore:'HARDCORE ×5'};
let runDiff='solo';
const multHP=()=>DIFFS[runDiff]||1;

/* ============ v4.23: ESCALA VIVA ============
   El juego se adapta a tu PODER REAL: cuantas más mejoras tengas
   desbloqueadas en el ARSENAL, más vida (y más experiencia) tienen
   los enemigos. La normal de un piloto con el árbol completo NO se
   parece en nada a la de uno recién llegado: misma oleada, otro mundo.
   · VIDA: hasta ×3.2 con el arsenal completo (jefes, élites, campistas
     y los escudos de cofres/cubos escalan con ella, son parte del reto).
   · EXPERIENCIA: hasta ×2.2 — cada baja pide más esfuerzo pero paga
     más XP, así que subir de nivel sigue siendo posible.
   La proporción P va de 0 (nada comprado) a 1 (167/167). */
function upgPower(){return clamp(Object.keys(save.tree||{}).length/(TREE.length||1),0,1);}
function hpUpMul(){return 1+upgPower()*2.2;}
function xpUpMul(){return 1+upgPower()*1.2;}

/* ============ v4.23: RÉCORD DE OLEADA POR MODO ============
   Los gates del ARSENAL ahora exigen llegar a una oleada en un MODO
   concreto: el récord global ya no basta. weekly/daily cuentan como
   NORMAL · frenético como HARDCORE · co-op como CO-OP. */
function runModeKey(){
  if(net.mode==='host'&&players.length>1)return 'coop';
  if(frenzyMode)return 'hardcore';
  if(weeklyMode||dailyMode)return 'normal';
  return runDiff;
}
function bumpModeRecord(L){
  if(!save.bestMode)save.bestMode={solo:0,normal:0,dificil:0,hardcore:0,coop:0};
  const k=runModeKey();
  if(L>(save.bestMode[k]||0))save.bestMode[k]=L;
  /* v4.24: el RANKING local se firma OLEADA A OLEADA (y nivel a nivel en el
     frenético). Antes solo se registraba al MORIR: si cerrabas el juego a
     mitad de partida, la carrera no aparecía en ningún modo. addRankingEntry
     deduplica por semilla+piloto y conserva la mejor, así que llamarlo aquí
     es barato y a prueba de cierres accidentales. */
  if(net.mode==='client')return; /* el cliente co-op firma con el evento 'over' */
  if(frenzyMode)addModeRecord('fz','FZ',Math.max(1,L),run.shipLv,String(run.kills));
  else if(weeklyMode)addModeRecord('wk',weekSeed(),L,run.shipLv);
  else if(dailyMode)addModeRecord('dy','DY',L,run.shipLv);
  else if(net.mode==='host'&&players.length>1)addModeRecord('mp','MP',L,run.shipLv);
  else if(runDiff==='dificil')addModeRecord('dc','DC',L,run.shipLv);
  else if(runDiff==='hardcore')addModeRecord('hc','HC',L,run.shipLv);
  else addModeRecord('nm','NM',L,run.shipLv);
}
/* v4.15: color de cada slot en co-op de 2–3 (P1 menta · P2 rosa · P3 cielo) */
const SLOT_COL=['#7FD1B9','#FF7EB6','#64C7FF'];

/* v4.9: mercado de gemas — cambia oro por gemas en el ARSENAL.
   Así el oro conserva uso incluso con todas las mejoras al máximo:
   financia las mejoras del ALIADO (que se pagan con gemas).
   v4.20: EL CAMBIO SE ENCARCECE — la primera compra vale 1500, la segunda
   1750, la tercera 2000… (+250 cada vez). El contador es por perfil y
   nunca se reinicia: cambiar mucho oro de golpe se paga cada vez peor. */
const GEMX_BASE=1500, GEMX_STEP=250, GEMX_GEMS=10;
function gemXPrice(){return GEMX_BASE+GEMX_STEP*(save.gemxBuys||0);}

/* ============ v4.12: HANGAR — aspectos de nave ============ */
/* Solo cosmético: cambia el color del casco y del núcleo de TU nave.
   'prisma' cicla todos los colores con el tiempo. El primero es el de serie. */
const SKINS=[
 {id:'menta',  name:'MENTA',    color:'#7FD1B9', cost:0},
 {id:'coral',  name:'CORAL',    color:'#FF6B6B', cost:400},
 {id:'cielo',  name:'CIELO',    color:'#64C7FF', cost:400},
 {id:'ambar',  name:'ÁMBAR',    color:'#FFD166', cost:600},
 {id:'rosa',   name:'ROSA',     color:'#FF7EB6', cost:800},
 {id:'lima',   name:'LIMA',     color:'#7DFF9E', cost:800},
 {id:'lila',   name:'LILA',     color:'#B388FF', cost:1000},
 {id:'hielo',  name:'HIELO',    color:'#B0F2FF', cost:1000},
 {id:'marfil', name:'MARFIL',   color:'#F2EFE6', cost:1500},
 /* v4.13: 3 aspectos nuevos */
 {id:'esmeralda',name:'ESMERALDA',color:'#50E3A4',cost:1200},
 {id:'vulcano',  name:'VULCANO',  color:'#FF9F43',cost:1200},
 {id:'obsidiana',name:'OBSIDIANA',color:'#9AA6B5',cost:2000},
 {id:'prisma', name:'PRISMA ∞', color:'prisma',  cost:2500},
 /* v4.20: aspecto EXCLUSIVO de la racha — no se compra: se gana
   manteniendo la racha de misiones diarias hasta el DÍA 7. */
 {id:'estelar',name:'ESTELAR ★', color:'#FFE9B0',cost:0,streak:7},
];

/* ============ v4.20: RECOMPENSAS VISIBLES DE LA RACHA ============
   Hitos de la racha de misiones diarias: al completar las 3 misiones
   el día N de la racha se paga la recompensa del hito (una sola vez
   por racha). El DÍA 7 regala el aspecto exclusivo ESTELAR. */
const STREAK_MILES=[
 {d:3, gems:15},
 {d:5, gems:25},
 {d:7, skin:'estelar'},
 {d:14,gems:40},
 {d:21,gems:60},
 {d:30,gems:100},
];
function streakMileTxt(m){return m.skin?('ASPECTO '+SKINS.find(s=>s.id===m.skin).name):('+'+m.gems+' GEMAS');}

/* ============ v4.12: MISIONES DIARIAS ============ */
/* Cada día se sortean 3 (determinista por fecha, iguales para todos).
   El progreso se comparte entre partidas y caduca a medianoche. */
const DAILY_POOL=[
 {k:'kills',txt:'Elimina 150 enemigos', n:150,rw:100,gem:1},
 {k:'gold', txt:'Recoge 400 de oro',    n:400,rw:120,gem:1},
 {k:'elite',txt:'Caza 4 élites',        n:4,  rw:130,gem:2},
 {k:'boss', txt:'Derrota 2 Guardianes', n:2,  rw:160,gem:2},
 {k:'kills',txt:'Elimina 250 enemigos', n:250,rw:160,gem:2},
 {k:'gold', txt:'Recoge 700 de oro',    n:700,rw:180,gem:2},
 {k:'elite',txt:'Caza 8 élites',        n:8,  rw:220,gem:3},
 {k:'boss', txt:'Derrota 3 Guardianes', n:3,  rw:240,gem:3},
];

/* ============ v4.12: BESTIARIO ============ */
/* Datos de cada figura: se revelan al enfrentarte a ellas (save.seen). */
const BESTIARY={
 orb:   {name:'ORBE',      desc:'La figura básica: vida y velocidad justas. Aparece desde la primera oleada y en enjambres.'},
 dart:  {name:'DARDO',     desc:'Frágil (×0.7 de vida) pero rapidísimo (×1.5). Se lanza en picado: elimínalo antes de que te atraviese.'},
 block: {name:'BLOQUE',    desc:'Blindaje 1+nivel/10 (resta a cada impacto) y ×1.35 de vida. Ideal para perforación y críticos.'},
 dash:  {name:'ROMBO',     desc:'Velocidad ×1.7 y poca vida. Se cuela por los huecos de la formación: no lo dejes acercarse.'},
 sentry:{name:'CENTINELA', desc:'Dispara proyectiles enemigos desde su posición. Es la prioridad número uno de cada oleada.'},
 medic: {name:'MÉDICO',    desc:'Cada 3.6 s cura a las figuras cercanas con un pulso verde. Mátalo primero o la oleada se eterniza.'},
 hive:  {name:'COLMENA',   desc:'Grande (×1.18) y dura (×1.5). Al morir estalla en 8 proyectiles radiales y se divide con más frecuencia.'},
 reflect:{name:'REFLEJO',  desc:'Al recibir el golpe que lo destruiría devuelve un disparo hacia ti. Usa misiles, drones o el prisma.'},
 magnet:{name:'IMÁN',      desc:'Atrae el oro del suelo hacia sí mismo (radio 160) y suelta el doble de botín. Cázalo rápido o te vaciará la pantalla.'},
 kami:  {name:'KAMIKAZE',  desc:'Se lanza contra ti y explota dañando todo en radio 70. Media vida, máxima agresividad.'},
 /* v4.16: el MAGO — sanador arcano que escala con su nivel */
 mago:  {name:'MAGO',      desc:'No baja nunca: flota junto a su banda y lanza PULSOS ARCANOS que curan a los aliados heridos. Cuanto MÁS NIVEL tiene, MÁS aliados cura a la vez (1 → hasta 6), desde el nivel 128 INVOCA esbirros y también RESUCITA a los caídos a su alrededor. Prioridad objetivo: mátalo primero.'},
};

/* ============ niveles de enemigo ============ */
/* v4.9: DIFICULTAD BRUTAL — desde la PRIMERA oleada los enemigos son de
   nivel ~100 (nv 96–100) y la vida sigue creciendo x1.055 por nivel.
   hp(nv100)≈275 PS · hp(nv150)≈5.300 · hp(nv200)≈100.000: incluso con el
   árbol al máximo en HARDCORE cuesta mucho purgar cada oleada.
   v4.20: REBALANCEO DE LAS PRIMERAS ETAPAS (para poder probar y progresar):
   · NORMAL / SOLO / RETO DIARIO / SEMANAL (y co-op NORMAL): enemigos nv 40–50
     desde la oleada 1 (antes 96–100).
   · DIFÍCIL: nv 70–90 desde la oleada 1.
   · HARDCORE (y el FRENÉTICO, que es hardcore): se queda como estaba (96–100).
   El crecimiento por oleada se mantiene igual en todos los modos, así que
   el juego largo no cambia: la normal alcanza los niveles antiguos hacia la
   oleada 50. */
/* v4.23: ESCALA VIVA — hpUpMul() multiplica según mejoras desbloqueadas */
function hpForLevel(l){return Math.max(1,Math.round((0.011*l+0.17)*Math.pow(1.055,l)*multHP()*hpUpMul()));}
function lvlBase(){return runDiff==='dificil'?{mn:70,mx:89}:runDiff==='hardcore'?{mn:96,mx:99}:{mn:40,mx:49};}
function maxLvlOf(L){return lvlBase().mx+L;}
function minLvlOf(L){return lvlBase().mn+Math.max(0,Math.floor((L-1)/5))*2;}
const TYPES={
  orb:    {shape:'circle', color:'#7FD1B9',mult:1.0, spd:1.0},
  dart:   {shape:'tri',    color:'#FFD166',mult:0.7, spd:1.5},
  block:  {shape:'square', color:'#C8CFD8',mult:1.35,spd:0.7},
  dash:   {shape:'diamond',color:'#64C7FF',mult:0.8, spd:1.7},
  sentry: {shape:'star',   color:'#FF7EB6',mult:0.95,spd:0.9,shoots:true},
  medic:  {shape:'cross',  color:'#7DFF9E',mult:1.0, spd:0.8,heals:true},
  hive:   {shape:'hexa',   color:'#FF6B6B',mult:1.5, spd:0.7,explodes:true},
  reflect:{shape:'penta',  color:'#B0F2FF',mult:1.1, spd:0.75,reflects:true},
  magnet: {shape:'circle', color:'#C9A0FF',mult:1.0, spd:0.8,magnet:true},
  kami:   {shape:'tri',    color:'#FF4757',mult:0.55,spd:1.0,kami:true},
  /* v4.16: MAGO — sanador arcano. No pica nunca (mage:true), cura a N aliados
     (N = mageHealTargets según su nivel) e invoca esbirros. Túnica lila. */
  mago:   {shape:'mage',   color:'#B388FF',mult:0.95,spd:0.75,mage:true},
};
/* v4.16: 'mago' va AL FINAL del TKLIST — el índice viaja en el snapshot co-op
   (TKLIST.indexOf) y añadir al final mantiene compatibles los índices viejos */
const TKLIST=['orb','dart','block','dash','sentry','medic','hive','reflect','magnet','kami','mago'];
const ECOLORS=['#FF6B6B','#F2EFE6','#7FD1B9','#FFD166','#FF7EB6','#64C7FF','#7DFF9E','#C8CFD8'];
function colorIdx(c){return Math.max(0,ECOLORS.indexOf(c));}

/* ============ v4.16: EL MAGO ============ */
/* Cuántos aliados puede curar un mago de nivel elvl con un pulso.
   Los niveles de enemigo empiezan en ~96 (v4.9), así que la escala es:
   nv 96–101 → 1 · nv 102–113 → 2 · nv 114–125 → 3 · nv 126–137 → 4
   nv 138–149 → 5 · nv 150+ → 6 (tope). Más nivel = más aliados curados. */
function mageHealTargets(elvl){return clamp(1+Math.floor((elvl-90)/12),1,6);}
function typeForLevel(l){
  const r=R();
  /* v4.16: el MAGO entra en las mezclas altas (~6-7% de las figuras) */
  if(l>=12)return r<.28?'hive':r<.46?'block':r<.60?'sentry':r<.70?'reflect':r<.78?'kami':r<.86?'magnet':r<.93?'medic':'mago';
  if(l>=10)return r<.26?'hive':r<.42?'block':r<.56?'sentry':r<.66?'reflect':r<.76?'kami':r<.86?'magnet':r<.94?'dash':'mago';
  if(l>=8) return r<.26?'hive':r<.46?'block':r<.64?'sentry':r<.76?'reflect':r<.88?'medic':'dash';
  if(l>=6) return r<.26?'block':r<.46?'sentry':r<.62?'reflect':r<.80?'dash':r<.92?'medic':'orb';
  if(l>=5) return r<.28?'block':r<.5?'sentry':r<.72?'dash':r<.86?'medic':'orb';
  if(l>=3) return r<.3?'dart':r<.55?'block':r<.8?'dash':'orb';
  return r<.6?'orb':'dart';
}

/* ============ v4.21: LA BÓVEDA ============
   Cofres SELLADOS que caen en partida y se abren desde el MENÚ con la
   CERRADURA DE PULSOS. Cada 3 fallos la calidad baja un nivel (l→e→r→c);
   el común se abre directo y puede salir vacío. Recompensa: MEJORAS
   ARMADAS al azar que se aplican en la siguiente partida y duran
   HASTA QUE MUERAS. Tope de la bóveda: 15 cofres guardados. */
const VCAP=15;
const RARS=['c','r','e','l'];
const RAR_COL={c:'#F2EFE6',r:'#64C7FF',e:'#B388FF',l:'#FFD166'};
const RAR_NAME={c:'COMÚN',r:'RARO',e:'ÉPICO',l:'LEGENDARIO'};
function vaultCount(){const v=save.vault||{};return (v.c||0)+(v.r||0)+(v.e||0)+(v.l||0);}
function addVault(rar){
  if(!save.vault)save.vault={c:0,r:0,e:0,l:0};
  save.vault[rar]=(save.vault[rar]||0)+1;
  save.totVault=(save.totVault||0)+1;
}
/* Rareza que suelta cada fuente. Las OLEADAS 1–10 son MÁS GENEROSAS
   (petición del piloto): más probabilidad y mejores rarezas.
   A partir de la 10 mandan las tablas estándar. */
/* v4.23: BÓVEDA MÁS GENEROSA — el piloto la ganó a pulso:
   · élite: 52% en oleadas 1–10 (antes 40%) · 36% después (antes 25%)
   · baja normal: 3.2% / 1.4% (antes 2.2% / 0.8%)
   · rarezas mejores: más épicas y legendarias en todas las fuentes
   · el Guardián sigue soltando SIEMPRE el suyo */
function rollSealed(kind){
  const early=run.level<=10,r=Math.random();
  if(kind==='boss'){
    if(early)return r<.38?'r':r<.74?'e':'l';
    return r<.55?'r':r<.87?'e':'l';
  }
  if(kind==='elite'){
    if(!(early?r<.52:r<.36))return null; /* élite: 52% / 36% de soltar */
    const r2=Math.random();
    if(early)return r2<.50?'r':r2<.86?'e':'l';
    return r2<.60?'r':r2<.91?'e':'l';
  }
  /* baja normal: 3.2% en las 10 primeras oleadas · 1.4% después */
  if(!(early?r<.032:r<.014))return null;
  const r2=Math.random();
  if(early)return r2<.36?'c':r2<.70?'r':r2<.91?'e':'l';
  return r2<.52?'c':r2<.80?'r':r2<.94?'e':'l';
}

/* ============ v4.23: EL MERCADER PIRATA GALÁCTICO ============
   NPC del menú (no un botón más): cofres del MERCADO NEGRO que se
   pagan con ORO Y GEMAS y van a la Bóveda para abrirse con la
   cerradura de pulsos. Siempre contienen botín: el riesgo del mercado
   negro es el precio… y la cerradura (cada 4 fallos baja la calidad).
   · OFERTA DEL DÍA: un cofre distinto cada día paga −40% (igual para
     todos, determinista por fecha).
   · PRECIO DINÁMICO: cada compra del MISMO cofre en el día +10%.
     Al día siguiente vuelve a su precio base. */
const MERC_TIERS=[
 {id:'r',rar:'r',gold:2500, gems:5, name:'COFRE DE CONTRABANDO',sub:'Cerradura simple · 1 mejora armada'},
 {id:'e',rar:'e',gold:6000, gems:12,name:'COFRE DEL CAPITÁN',   sub:'2 cerraduras · 2 mejoras armadas'},
 {id:'l',rar:'l',gold:12000,gems:30,name:'COFRE DEL KRAKEN',    sub:'3 cerraduras · 3 mejoras · zona trampa'},
];
const MERC_STEP=1.10;
function mercDealId(){return MERC_TIERS[Math.abs(hashStr('FRGMERC-'+daySeed()))%MERC_TIERS.length].id;}
function mercPrice(t){
  const buys=(save.merc&&save.merc.d===daySeed()&&save.merc.buys)?(save.merc.buys[t.id]||0):0;
  let gold=Math.round(t.gold*Math.pow(MERC_STEP,buys));
  let gems=t.gems?Math.round(t.gems*Math.pow(MERC_STEP,buys)):0;
  const deal=mercDealId()===t.id;
  if(deal){gold=Math.round(gold*.6);if(gems)gems=Math.round(gems*.6);}
  return{gold,gems,deal};
}
function mercBuyCount(id){
  return(save.merc&&save.merc.d===daySeed()&&save.merc.buys)?(save.merc.buys[id]||0):0;
}
/* ---- MEJORAS ARMADAS: grupo de recompensas temporales ----
   Se aplican en recompute() y se borran al MORIR (gameOver). */
const PERKS=[
 {id:'pdk',name:'MUNICIÓN PESADA', desc:'+2 de daño',                    fx:b=>b.dmg+=2},
 {id:'pvd',name:'BLINDAJE DE PRISA',desc:'+2 de vida máxima',            fx:b=>b.maxHp+=2},
 {id:'prt',name:'GATILLO ÁGIL',    desc:'+8% de cadencia',               fx:b=>b.rate*=1.08},
 {id:'pcr',name:'MIRA FINA',       desc:'+5% de crítico',                fx:b=>b.crit+=.05},
 {id:'psp',name:'PROPULSORES',     desc:'+10% de velocidad de nave',     fx:b=>b.spd*=1.10},
 {id:'prg',name:'NANORREPARACIÓN', desc:'+1 PS/s de regeneración',       fx:b=>b.regenRate+=1/100},
 {id:'pim',name:'IMÁN EXTRA',      desc:'+50% de radio de recogida',     fx:b=>b.magnet+=.5},
 {id:'pgo',name:'FORTUNA',         desc:'+20% de oro',                   fx:b=>b.goldMul*=1.2},
 {id:'pex',name:'SABIDURÍA',       desc:'+20% de experiencia',           fx:b=>b.expMul*=1.2},
 {id:'pdr',name:'DRON TEMPORAL',   desc:'+1 dron orbital',               fx:b=>b.drones+=1},
 {id:'pcl',name:'CHASIS LIGERO',   desc:'Balas enemigas 10% más lentas', fx:b=>b.slow*=.9},
 {id:'pco',name:'CORAZONEROS',     desc:'Más del doble de corazones',    fx:b=>b.heartDrop=true},
];
/* Solo los cofres LEGENDARIOS pueden sacar una versión GRANDE */
const PERKS_BIG=[
 {id:'gdk',name:'SOBRECARGA TOTAL',  desc:'+4 de daño',         fx:b=>b.dmg+=4},
 {id:'gvd',name:'FORTALEZA',         desc:'+4 de vida máxima',  fx:b=>b.maxHp+=4},
 {id:'grt',name:'CADENCIA EXTREMA',  desc:'+12% de cadencia',   fx:b=>b.rate*=1.12},
];
const PERKS_ALL=PERKS.concat(PERKS_BIG);
function perkById(id){return PERKS_ALL.find(p=>p.id===id);}
/* Reparte n mejoras al azar (el legendario puede sacar una GRANDE) */
function rollPerks(n,rar){
  const out=[];
  for(let i=0;i<n;i++){
    const pool=(rar==='l'&&Math.random()<.35)?PERKS_BIG:PERKS;
    out.push(pool[irand(0,pool.length-1)].id);
  }
  return out;
}

