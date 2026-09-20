'use strict';
/* ============ poderes temporales (PROTOCOLO AZAR) ============ */
const TEMP_POOL=[
 {id:'tshield',name:'ESCUDO FANTASMA',desc:'Escudo que bloquea 1 golpe y recarga rápido',f:b=>{b.shield=true;b.shieldFast=true;}},
 {id:'tmissile',name:'LLUVIA DE MISILES',desc:'Misiles teledirigidos dobles y rápidos',f:b=>{b.homing=true;b.msl=Math.max(b.msl,2);b.homeFast=true;}},
 {id:'tlaser',name:'TORRETAS LÁSER',desc:'Rayo prismático cada 3 s al enemigo más cercano',f:b=>{b.prism=true;b.priFast=true;}},
 {id:'theal',name:'PROTOCOLO MÉDICO',desc:'Cura 3 PV al instante y regenera durante el efecto',f:b=>{b.heal+=3;b.regenRate+=.3;}},
 {id:'torb',name:'ORBITALES FANTASMA',desc:'2 orbes de contacto giran alrededor de la nave',f:b=>{b.orbs+=2;}},
 {id:'taura',name:'CAMPO CORTANTE',desc:'Desmenuza a los enemigos pegados a tu nave',f:b=>{b.aura=true;}},
 {id:'trate',name:'SOBRECARGA',desc:'+40% de cadencia de disparo',f:b=>{b.rate*=1.4;}},
 {id:'tgold',name:'FIESTA DEL ORO',desc:'+4 de oro por segundo y +20% de oro',f:b=>{b.goldRate+=4;b.goldMul*=1.2;}},
];
function azarChance(){
  if(!has('sz0'))return 0;
  let n=0;for(let i=1;i<=9;i++)if(has('sz'+i))n++;
  return Math.min(.86,.35+n*.05+(has('m5')?.06:0));
}
function syncTempMsg(){
  if(net.mode==='host')sendMsg({t:'ev',k:'temp',l:run.tempBuffs.map(t=>({id:t.id,waves:t.waves}))});
}
function grantTempBuff(slot){
  if(!run.tempBuffs)run.tempBuffs=[];
  const act=run.tempBuffs.map(t=>t.id);
  const pool=TEMP_POOL.filter(t=>!act.includes(t.id));
  if(!pool.length){
    if(slot!=null)grantGold(slot,150);
    return '+150 DE ORO (todos los poderes activos)';
  }
  const c=pool[irand(0,pool.length-1)];
  run.tempBuffs.push({id:c.id,waves:2});
  recompute();syncTempMsg();
  return 'PODER: '+c.name+' (2 OLEADAS)';
}
function updTempBuffs(){
  if(!run.tempBuffs)run.tempBuffs=[];
  for(const tb of run.tempBuffs)tb.waves--;
  const had=run.tempBuffs.length;
  run.tempBuffs=run.tempBuffs.filter(tb=>tb.waves>0);
  if(run.tempBuffs.length<had){recompute();banner('PODER TEMPORAL','Un poder ha expirado');}
  const ch=azarChance();
  if(ch>0&&Math.random()<ch){
    const act=run.tempBuffs.map(t=>t.id);
    const pool=TEMP_POOL.filter(t=>!act.includes(t.id));
    if(pool.length){
      const c=pool[irand(0,pool.length-1)];
      run.tempBuffs.push({id:c.id,waves:2});
      recompute();
      banner('AZAR · '+c.name,c.desc+' · dura 2 oleadas ('+Math.round(ch*100)+'%)');
    }
  }
  syncTempMsg();
}

