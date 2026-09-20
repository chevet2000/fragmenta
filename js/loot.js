'use strict';
/* ============ botín ============ */
function dropLoot(e){
  const gMul=players[0].goldMul;
  const g=(1+(e.elvl>=106?1:0)+(e.elvl>=114?1:0))+(e.T.magnet?1:0);
  const pkCap=pickups.length<250; /* v4.8: tope de botín para evitar lag extremo */
  if(pkCap)for(let i=0;i<g;i++)
    pickups.push({t:'gold',x:e.x,y:e.y,vx:rand(-60,60),vy:rand(-150,-40),
      /* v4.9: oro según la OLEADA (el nivel del enemigo ya empieza en ~100) y reducido */
      val:Math.max(1,Math.round((.25+run.level*.15)*gMul))});
  /* v4.9: gemas y corazones más raros */
  let gr=.02+run.level*.0012;
  if(players.some(pl=>pl.gemLuck))gr*=1.9;
  if(players.some(pl=>pl.gemExtra))gr+=.03;
  if(run.relics.includes('crudas'))gr+=.08;
  if(Math.random()<gr)pickups.push({t:'gem',x:e.x,y:e.y,vx:rand(-50,50),vy:rand(-130,-40)});
  if(Math.random()<.006*(players.some(pl=>pl.heartDrop)?1.8:1))
    pickups.push({t:'heart',x:e.x,y:e.y,vx:rand(-40,40),vy:rand(-120,-40)});
}
function killEnemy(e,bySlot){
  if(e.dead)return;
  e.dead=true;run.kills++;save.totKills++;
  bySlot=bySlot||0;
  const pl=players[bySlot]||players[0];
  burst(e.x,e.y,e.camp?'#FFD166':e.T.color,e.r>18?20:12,e.r>18?180:120);
  shake=Math.min(14,shake+(e.r>18?5:1.5));
  SFX.kill();
  dropLoot(e);
  if(e.tk==='hive')hiveBurst(e);
  doSplit(e);
  /* v4.8: XP según el nivel máximo de la oleada (1-5 por baja) */
  gainExp(Math.round(waveXp()*pl.expMul));
  missionTick('kills',1);
  if(pl.frenzy){run.combo++;
    if(run.combo>=6&&frenzyT<=0){frenzyT=5;floater(pl.x,pl.y-34,'¡FRENESÍ!','#FFD166',14);}}
  if(pl.vamp&&players.some(q=>q.hp<q.maxHp&&q.hp>0)&&Math.random()<.12){
    const q=players.find(q=>q.hp>0&&q.hp<q.maxHp);
    q.hp++;floater(q.x,q.y-26,'+1','#7DFF9E',12);}
  if(run.relics.includes('deton')){
    for(const o of enemies)if(!o.dead&&o!==e&&Math.hypot(o.x-e.x,o.y-e.y)<60)damageEnemy(o,Math.max(1,Math.round(pl.dmg)),false,bySlot);
  }
  if(e.elite){
    run.eliteKills++;missionTick('elite',1);
    save.totElite=(save.totElite||0)+1;
    const gMul=pl.goldMul*(pl.presa?1.5:1);
    const n=irand(6,9); /* v4.9: menos oro de élites */
    for(let i=0;i<n;i++)
      pickups.push({t:'gold',x:e.x,y:e.y,vx:rand(-160,160),vy:rand(-240,-60),
        val:Math.max(2,Math.round((1+run.level*.25)*gMul))});
    for(let i=0;i<1;i++)
      pickups.push({t:'gem',x:e.x,y:e.y,vx:rand(-120,120),vy:rand(-220,-60)});
    gainExp(Math.round(waveXp()*4*pl.expMul)); /* v4.9: élite x4 (antes x6) */
    floater(e.x,e.y-34,'¡ÉLITE CAÍDO!','#B388FF',14);
    shake=Math.min(16,shake+6);
  }
  if(e.camp){
    save.totCamp=(save.totCamp||0)+1;
    pickups.push({t:'minichest',x:e.x,y:e.y,vx:0,vy:-90});
    for(let i=0;i<4;i++) /* v4.9: menos oro de campistas */
      pickups.push({t:'gold',x:e.x,y:e.y,vx:rand(-120,120),vy:rand(-220,-60),
        val:Math.max(2,Math.round((.8+run.level*.22)*pl.goldMul))});
    gainExp(Math.round(waveXp()*4*pl.expMul));
    floater(e.x,e.y-40,'¡CAMPISTA CAÍDO!','#FFD166',13);
    shake=Math.min(16,shake+6);
    checkAch();
  }
  checkAch();
}
function doSplit(e){
  if(e.elite||e.tk==='kami'||e.camp)return;
  if(e.elvl<5&&e.tk!=='hive')return;
  const cap=players.length===2?52:40;
  if(enemies.length>cap)return;
  const minL=minLvlOf(run.level);
  if(e.elvl<=minL&&e.tk!=='hive')return;
  const k=clamp(2+Math.floor(e.elvl/12),2,4)+(e.tk==='hive'?1:0);
  /* v4.9: los hijos heredan ~85% del nivel del padre (los niveles ya empiezan en ~100) */
  const base=Math.round(e.elvl*.85);
  for(let i=0;i<k;i++){
    const cl=clamp(base-irand(0,8),1,Math.max(1,e.elvl-1));
    const c=spawnEnemy(typeForLevel(cl),cl,{after:'roam',delay:i*.06});
    c.sx=e.x+rand(-8,8);c.sy=e.y+rand(-8,8);
    c.fx=clamp(e.x+rand(-120,120),30,W-30);
    c.fy=clamp(e.y-rand(30,120),70,H*.5);
    c.cx=e.x+rand(-80,80);c.cy=e.y-rand(20,80);
    c.x=c.sx;c.y=c.sy;
  }
  rings.push({x:e.x,y:e.y,r:6,R:70,t:0,life:.4,color:e.T.color});
  hostRing(e.x,e.y,70,e.T.color);
  floater(e.x,e.y-24,'¡SE DIVIDE!','#FF9F43',12);
}
function hiveBurst(e){
  const n=8,sp=110*players[0].slow;
  for(let i=0;i<n;i++){const a=TAU*i/n;
    ebullets.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,color:'#FF6B6B',dead:false});}
  rings.push({x:e.x,y:e.y,r:8,R:60,t:0,life:.35,color:'#FF6B6B'});
  hostRing(e.x,e.y,60,'#FF6B6B');
}
function damageEnemy(e,dmg,crit,bySlot){
  if(e.dead)return;
  bySlot=bySlot||0;
  const pl=players[bySlot]||players[0];
  if(e.armor)dmg=Math.max(1,dmg-e.armor);
  if(e.elite&&pl.presa)dmg*=1.6;
  if(e.frozen>0&&pl.iceTop)dmg*=1.5;
  let th=0;
  if(run.relics.includes('sangre'))th=.40;
  else if(players.some(q=>q.execute))th=.25;
  if(th>0&&e.hp<=e.maxhp*th)dmg*=3;
  e.hp-=dmg;e.flash=1;
  run.stDmg+=dmg;
  floater(e.x+rand(-8,8),e.y-e.r-6,'-'+dmg,crit?'#FFD166':'#F2EFE6',crit?14:11);
  SFX.hit();
  if(e.hp<=0)killEnemy(e,bySlot);
}
function damageBoss(d,crit,bySlot){
  if(!boss)return;
  boss.hp-=d;boss.flash=1;
  run.stDmg+=d;
  floater(boss.x+rand(-20,20),boss.y-boss.r-8,'-'+d,crit?'#FFD166':'#F2EFE6',crit?15:12);
  SFX.hit();
  if(boss.hp<=0)killBoss();
}
function killBoss(){
  const b=boss;boss=null;
  run.kills++;save.totKills++;
  if(!run.bossDmgTaken)run.stPerfect++;
  burst(b.x,b.y,b.D.color,34,240);burst(b.x,b.y,'#F2EFE6',20,160);
  rings.push({x:b.x,y:b.y,r:10,R:220,t:0,life:.6,color:b.D.color});
  hostRing(b.x,b.y,220,b.D.color);
  shake=20;vib(120);
  tone(500,60,.5,'sawtooth',.1);tone(300,40,.6,'square',.08,.1);
  const gMul=players[0].goldMul;
  const gn=5+run.level; /* v4.9: menos oro de jefes */
  for(let i=0;i<gn;i++)
    pickups.push({t:'gold',x:b.x,y:b.y,vx:rand(-160,160),vy:rand(-260,-60),
      val:Math.max(2,Math.round((.8+run.level*.28)*gMul))});
  const gm=1+Math.floor(run.level/10); /* v4.9: menos gemas de jefes */
  for(let i=0;i<gm;i++)
    pickups.push({t:'gem',x:b.x,y:b.y,vx:rand(-140,140),vy:rand(-240,-60)});
  pickups.push({t:'heart',x:b.x,y:b.y,vx:0,vy:-120});
  if(run.level%10===0){
    pickups.push({t:'chest',x:b.x,y:b.y,vx:rand(-20,20),vy:-80});
    floater(b.x,b.y-60,'¡COFRE! ATRÁPALO','#FFD166',15);
  }
  gainExp(Math.round(waveXp()*8*players[0].expMul)); /* v4.9: jefe x8 (antes x12) */
  banner('GUARDIÁN DESTRUIDO',run.level%10===0?'Recoge el cofre y el botín':'Recoge las recompensas');
}

