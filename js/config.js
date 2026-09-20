'use strict';
/* ============ dificultad ============ */
const DIFFS={solo:1,normal:2.2,dificil:3,hardcore:5};
const DIFF_LABEL={solo:'SOLO ×1',normal:'NORMAL ×2.2',dificil:'DIFÍCIL ×3',hardcore:'HARDCORE ×5'};
let runDiff='solo';
const multHP=()=>DIFFS[runDiff]||1;
/* v4.15: color de cada slot en co-op de 2–3 (P1 menta · P2 rosa · P3 cielo) */
const SLOT_COL=['#7FD1B9','#FF7EB6','#64C7FF'];

/* v4.9: mercado de gemas — cambia oro por gemas en el ARSENAL.
   Así el oro conserva uso incluso con todas las mejoras al máximo:
   financia las mejoras del ALIADO (que se pagan con gemas). */
const GEMX_COST=1500, GEMX_GEMS=10;

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
];

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
};

/* ============ niveles de enemigo ============ */
/* v4.9: DIFICULTAD BRUTAL — desde la PRIMERA oleada los enemigos son de
   nivel ~100 (nv 96–100) y la vida sigue creciendo x1.055 por nivel.
   hp(nv100)≈275 PS · hp(nv150)≈5.300 · hp(nv200)≈100.000: incluso con el
   árbol al máximo en HARDCORE cuesta mucho purgar cada oleada. */
function hpForLevel(l){return Math.max(1,Math.round((0.011*l+0.17)*Math.pow(1.055,l)*multHP()));}
function maxLvlOf(L){return 99+L;}
function minLvlOf(L){return 96+Math.max(0,Math.floor((L-1)/5))*2;}
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
};
const TKLIST=['orb','dart','block','dash','sentry','medic','hive','reflect','magnet','kami'];
const ECOLORS=['#FF6B6B','#F2EFE6','#7FD1B9','#FFD166','#FF7EB6','#64C7FF','#7DFF9E','#C8CFD8'];
function colorIdx(c){return Math.max(0,ECOLORS.indexOf(c));}
function typeForLevel(l){
  const r=R();
  if(l>=12)return r<.32?'hive':r<.52?'block':r<.68?'sentry':r<.78?'reflect':r<.87?'kami':r<.94?'magnet':'medic';
  if(l>=10)return r<.28?'hive':r<.46?'block':r<.62?'sentry':r<.72?'reflect':r<.82?'kami':r<.92?'magnet':'dash';
  if(l>=8) return r<.26?'hive':r<.46?'block':r<.64?'sentry':r<.76?'reflect':r<.88?'medic':'dash';
  if(l>=6) return r<.26?'block':r<.46?'sentry':r<.62?'reflect':r<.80?'dash':r<.92?'medic':'orb';
  if(l>=5) return r<.28?'block':r<.5?'sentry':r<.72?'dash':r<.86?'medic':'orb';
  if(l>=3) return r<.3?'dart':r<.55?'block':r<.8?'dash':'orb';
  return r<.6?'orb':'dart';
}

