'use strict';
/* ============ dificultad ============ */
const DIFFS={solo:1,normal:2.2,dificil:3,hardcore:5};
const DIFF_LABEL={solo:'SOLO ×1',normal:'NORMAL ×2.2',dificil:'DIFÍCIL ×3',hardcore:'HARDCORE ×5'};
let runDiff='solo';
const multHP=()=>DIFFS[runDiff]||1;

/* ============ niveles de enemigo ============ */
function hpForLevel(l){return Math.max(1,Math.round((1.25*l+2.2)*Math.pow(1.042,l)*multHP()));}
function maxLvlOf(L){return 4+L;}
function minLvlOf(L){return 1+Math.max(0,Math.floor((L-1)/5))*2;}
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

