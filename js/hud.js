'use strict';
/* ============ HUD ============ */
function refreshHUD(){
  $('#hudGold').textContent=save.gold;
  $('#hudGems').textContent=save.gems;
  const fmtHp=v=>Number.isInteger(v)?String(v):v.toFixed(1);
  $('#hpTxt').textContent=players.map(p=>(players.length>1?'P'+(p.slot+1)+' ':'')+fmtHp(p.hp)+'/'+p.maxHp).join(' · ');
  const myP=players[localSlot]||players[0];
  const tbn=(run.tempBuffs&&run.tempBuffs.length)?' · ✦'+run.tempBuffs.length:'';
  $('#dmgTxt').textContent='DAÑO '+myP.dmg+(weeklyMode?' · SEM':'')+tbn;
  const tn=wave.types&&wave.types.length>1?'MIXTA':'';
  $('#hudLevel').textContent=boss
    ?`OLEADA ${run.level} · GUARDIÁN`
    :(frenzyMode
      ?`FRENÉTICO · ${fmtT(run.time)} · OLEADA ${run.level} · nv ${minLvlOf(run.level)}–${maxLvlOf(run.level)}`
      :`OLEADA ${run.level}${tn?' · '+tn:''} · nv ${minLvlOf(run.level)}–${maxLvlOf(run.level)}`);
  $('#shipTxt').textContent='NV '+run.shipLv;
  $('#expFill').style.width=clamp(run.exp/shipNeed(run.shipLv)*100,0,100)+'%';
  /* v4.8: barra de iconos de poderes temporales activos (❖ + oleadas restantes) */
  const bb=$('#buffBar');
  const tbs=run.tempBuffs||[];
  if(tbs.length){
    bb.classList.remove('hidden');
    bb.innerHTML=tbs.map(tb=>{
      const tp=TEMP_POOL.find(t=>t.id===tb.id);
      return '<span class="bicon">'+(TB_ICON[tb.id]||'✦')+'<i>'+tb.waves+'</i></span>';
    }).join('');
    bb.title=tbs.map(t=>{const p=TEMP_POOL.find(x=>x.id===t.id);return p?p.name:'';}).join(' · ');
  }else{bb.classList.add('hidden');bb.innerHTML='';}
  const alive=amClient()?cEnemies.size+(boss?1:0):enemies.length+(boss?1:0);
  const pend=amClient()?0:wave.pending+wave.pool.length;
  const killed=Math.max(0,wave.total-pend-alive);
  $('#waveFill').style.width=(wave.total?clamp(killed/wave.total,0,1)*100:0)+'%';
  $('#bossBar').classList.toggle('hidden',!boss);
  if(boss){
    const pct=amClient()?cBossPct:clamp(boss.hp/boss.maxhp*100,0,100);
    $('#bossFill').style.width=pct+'%';
  }
  const nb=$('#btnNova');
  const myNova=amClient()?players[localSlot].nova:P.nova;
  if(myNova&&state==='play'){
    nb.classList.remove('hidden');
    let k;
    if(amClient())k=clamp(cNovaCd,0,1);
    else k=clamp(1-novaCdGlobal/(myNova.cd*P.novaCdMul),0,1);
    $('#novaArc').style.strokeDashoffset=163.4*(1-k);
    nb.classList.toggle('ready',k>=1);
  }else nb.classList.add('hidden');
  $('#btnEmo').classList.toggle('hidden',!(players.length===2&&net.mode&&net.connected&&state==='play'));
  const nt=$('#netTag');
  if(net.mode&&runActive){
    nt.classList.remove('hidden');
    if(net.mode==='client'){
      nt.textContent='ONLINE · '+net.ping+' MS';
      nt.classList.toggle('bad',!net.connected);
    }else{
      nt.textContent=net.connected?('ANFITRIÓN · SALA '+net.code):'ANFITRIÓN · SIN JUGADOR 2';
      nt.classList.toggle('bad',!net.connected);
    }
  }else nt.classList.add('hidden');
}

