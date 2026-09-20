'use strict';
/* ============ v4.17: LAS MALDICIONES DEL HECHICERO ============ */
/* El guardián mago lanza MALDICIONES AL AZAR; cada una afecta SOLO una cosa:
   · TORPEZA — los mandos de la nave responden al 65%
   · MISERIA — el oro que recoges vale la MITAD
   · LETARGO — la experiencia que ganas vale la MITAD
   · BLOQUEO — sella hasta 2 poderes temporales y no deja sorteos nuevos
   Duración: cada maldición es "mientras él viva" (se disipa al destruir al
   HECHICERO) o de VARIAS OLEADAS (2–3: aguanta su muerte y cuenta atrás). */
const CURSES={
  torpeza:{name:'TORPEZA', desc:'Los mandos responden al 65%'},
  miseria:{name:'MISERIA', desc:'El oro que recoges vale la MITAD'},
  letargo:{name:'LETARGO', desc:'La experiencia que ganas vale la MITAD'},
  bloqueo:{name:'BLOQUEO', desc:'Poderes temporales sellados y sin nuevos sorteos'},
};
const CURSE_ICON={torpeza:'◐',miseria:'◆',letargo:'▼',bloqueo:'✖'};
function curseActive(id){return !!(run.curses&&run.curses.some(c=>c.id===id));}
function curseMoveMul(){return curseActive('torpeza')?.65:1;}
function curseGoldMul(){return curseActive('miseria')?.5:1;}
function curseExpMul(){return curseActive('letargo')?.5:1;}
function tempBuffSealed(id){
  if(!run.curses)return false;
  for(const c of run.curses)if(c.id==='bloqueo'&&c.sealed&&c.sealed.includes(id))return true;
  return false;
}
function syncCurses(){
  /* formato {t:'ev',k:'curs'} — clientEvent es quien reparte los eventos k= */
  if(net.mode==='host')sendMsg({t:'ev',k:'curs',l:(run.curses||[]).map(c=>({id:c.id,alive:c.alive?1:0,waves:c.waves||0,sealed:c.sealed||[]}))});
}
/* el HECHICERO lanza una maldición al azar (solo anfitrión) */
function castCurse(b){
  if(!run.curses)run.curses=[];
  if(run.curses.length>=3)return;
  const act=run.curses.map(c=>c.id);
  const pool=Object.keys(CURSES).filter(id=>!act.includes(id));
  if(!pool.length)return;
  const id=pool[irand(0,pool.length-1)];
  const c=Math.random()<.45?{id,alive:0,waves:irand(2,3)}:{id,alive:1,waves:0};
  if(id==='bloqueo'){
    const act2=(run.tempBuffs||[]).map(t=>t.id);
    c.sealed=act2.sort(()=>Math.random()-.5).slice(0,2);
  }
  run.curses.push(c);
  save.totCurses=(save.totCurses||0)+1;
  const D=CURSES[id];
  banner('¡MALDICIÓN: '+D.name+'!',D.desc+' · '+(c.alive?'mientras el HECHICERO viva':'dura '+c.waves+' oleadas'));
  for(const pl of players)if(pl.hp>0)rings.push({x:pl.x,y:pl.y,r:12,R:120,t:0,life:.7,color:'#B388FF'});
  if(b)floater(b.x,b.y-b.r-18,'¡MALDICIÓN!','#B388FF',14);
  tone(280,130,.4,'sawtooth',.06);vib(60);
  recompute();syncCurses();checkAch();
}
/* al caer el HECHICERO: se quitan las de "mientras él viva";
   las de varias oleadas siguen su cuenta atrás */
function expireCurses(){
  if(!run.curses||!run.curses.length)return;
  const before=run.curses.length;
  run.curses=run.curses.filter(c=>!c.alive);
  if(run.curses.length<before){
    banner('MALDICIONES ROTAS',run.curses.length?'Se disipan… salvo las de varias oleadas':'El HECHICERO ha caído: se disipan todas');
    recompute();syncCurses();
  }
}
/* cada oleada: las maldiciones de varias oleadas cuentan atrás */
function curseTickWave(){
  if(!run.curses||!run.curses.length)return;
  for(const c of run.curses)if(!c.alive)c.waves--;
  const before=run.curses.length;
  run.curses=run.curses.filter(c=>c.alive||c.waves>0);
  if(run.curses.length<before){recompute();banner('MALDICIÓN EXPIRADA','Una maldición se ha desvanecido');}
  syncCurses();
}
/* cliente: recibe la lista de maldiciones del anfitrión */
function applyCurses(list){
  run.curses=(list||[]).filter(c=>c&&CURSES[c.id]).map(c=>({
    id:c.id,alive:!!c.alive,waves:clamp(parseInt(c.waves,10)||0,0,9),
    sealed:Array.isArray(c.sealed)?c.sealed.filter(x=>typeof x==='string').slice(0,4):[]}));
  recompute();
}
