'use strict';
/* ============ dibujo ============ */
const dust=Array.from({length:42},()=>({x:Math.random(),y:Math.random(),s:rand(.6,1.8),v:rand(12,34)}));
const menuShapes=Array.from({length:7},()=>({x:Math.random(),y:Math.random(),r:rand(24,70),
  rot:rand(0,TAU),vr:rand(-.3,.3),vy:rand(4,12),shape:['tri','hexa','penta','diamond','square'][irand(0,4)]}));
/* ============ v4.14: BIOMAS VISUALES — el sector cambia cada 10 oleadas ============
   (en frenético, cada 4 niveles de frenesí ≈ 100 s). Solo estético:
   fondo, rejilla, estrellas, nebulosas y motas flotantes propias. */
const BIOMES=[
 {name:'NEBULOSA',bg:[7,9,13],grid:[130,150,180],dust:[140,160,190],blob:'rgba(28,44,84,',mote:'127,178,255',desc:''},
 {name:'SECTOR ÍGNEO',bg:[14,7,5],grid:[190,120,80],dust:[235,150,90],blob:'rgba(96,32,10,',mote:'255,159,67',rise:1,desc:'Ceniza y magma'},
 {name:'CINTURÓN HELADO',bg:[6,11,16],grid:[120,170,205],dust:[195,225,245],blob:'rgba(20,60,90,',mote:'176,232,255',fall:1,desc:'Hielo a la deriva'},
 {name:'VACÍO PROFUNDO',bg:[8,6,14],grid:[145,120,185],dust:[175,150,215],blob:'rgba(52,24,94,',mote:'179,136,255',desc:'La oscuridad observa'},
 {name:'ENJAMBRE TÓXICO',bg:[6,12,7],grid:[115,175,125],dust:[150,215,165],blob:'rgba(16,62,26,',mote:'125,255,158',drift:1,desc:'Esporas en el aire'},
];
let curBiome=0,biomePrev=0,biomeK=1;
const biomeMotes=Array.from({length:26},()=>({x:Math.random(),y:Math.random(),s:rand(1,2.6),v:rand(.02,.08),ph:rand(0,TAU)}));
function biomeTarget(){
  if(!runActive)return 0;
  const lv=run.level||1;
  return frenzyMode?(Math.floor(lv/4)%BIOMES.length):Math.floor((lv-1)/10)%BIOMES.length;
}
function mixCol(a,b,k){return[Math.round(a[0]+(b[0]-a[0])*k),Math.round(a[1]+(b[1]-a[1])*k),Math.round(a[2]+(b[2]-a[2])*k)];}
function updBiome(dt){
  const tgt=biomeTarget();
  if(tgt!==curBiome&&biomeK>=1){
    biomePrev=curBiome;curBiome=tgt;biomeK=0;
    if(state==='play'&&!amClient()){
      banner('BIOMA: '+BIOMES[curBiome].name,BIOMES[curBiome].desc||'El sector cambia');
      tone(220,440,.4,'sine',.05);
    }
  }
  if(biomeK<1)biomeK=Math.min(1,biomeK+dt/2.4);
  if(state==='play'&&!amClient()){
    save.biomesSeen=save.biomesSeen||{};save.biomesSeen[curBiome]=1;
  }
}
function drawBiomeBg(dt){
  const k=easeOut(biomeK),A=BIOMES[biomePrev],B=BIOMES[curBiome];
  const bg=mixCol(A.bg,B.bg,k);
  ctx.fillStyle='rgb('+bg[0]+','+bg[1]+','+bg[2]+')';ctx.fillRect(0,0,W,H);
  /* nebulosas de fondo (las del bioma anterior se apagan mientras entran las nuevas) */
  const blobs=(Bm,fade)=>{
    for(let i=0;i<3;i++){
      const bx=(.22+.3*i)*W+Math.sin(time*.05+i*2.1)*W*.06;
      const by=H*(.3+.18*((i*1.7+1)%2))+Math.cos(time*.04+i)*H*.05;
      const rad=W*.28;
      const gr=ctx.createRadialGradient(bx,by,0,bx,by,rad);
      gr.addColorStop(0,Bm.blob+(0.18*fade)+')');
      gr.addColorStop(1,Bm.blob+'0)');
      ctx.fillStyle=gr;
      ctx.fillRect(bx-rad,by-rad,rad*2,rad*2);
    }
  };
  blobs(A,1-k);blobs(B,k);
  /* motas del bioma (ascienden / caen / derivan según el sector) */
  ctx.fillStyle='rgba('+B.mote+',.4)';
  for(const m of biomeMotes){
    if(B.rise){m.y-=m.v*dt*2.2;if(m.y<-.02){m.y=1.02;m.x=Math.random();}}
    else if(B.fall){m.y+=m.v*dt*1.8;if(m.y>1.02){m.y=-.02;m.x=Math.random();}}
    else if(B.drift){m.x+=m.v*dt*1.6;m.y+=Math.sin(time*.7+m.ph)*.02*dt;if(m.x>1.02){m.x=-.02;m.y=Math.random();}}
    else{m.y+=m.v*dt*.8;if(m.y>1.02){m.y=-.02;m.x=Math.random();}}
    ctx.fillRect(m.x*W,m.y*H,m.s,m.s);
  }
  const gm=mixCol(A.grid,B.grid,k).join(','),dm=mixCol(A.dust,B.dust,k).join(',');
  drawGridDust(dt,gm,dm);
}
/* ============ v4.14: AGUJERO NEGRO — remolino violeta con horizonte ============ */
function drawHoles(){
  for(const h of holes){
    const k=h.t/h.life;
    const fade=k>.8?Math.max(0,(1-k)/.2):1;
    const g=ctx;
    g.save();g.translate(h.x,h.y);
    /* límite del radio de succión */
    g.globalAlpha=.3*fade+Math.sin(time*5)*.06;
    g.strokeStyle='#B388FF';g.lineWidth=1.5;g.setLineDash([8,10]);
    g.beginPath();g.arc(0,0,h.rad,0,TAU);g.stroke();g.setLineDash([]);
    /* disco de acreción: 3 arcos girando */
    g.globalAlpha=.8*fade;
    for(let i=0;i<3;i++){
      const a=time*(2.6+i*.9)*(i%2?-1:1)+h.spin+i*2.1;
      g.strokeStyle=i===1?'#8A6CFF':'#B388FF';g.lineWidth=2.5-i*.5;
      g.beginPath();g.arc(0,0,34+i*13,a,a+2.1);g.stroke();
    }
    /* chorros de succión */
    g.globalAlpha=.3*fade;g.strokeStyle='#B388FF';g.lineWidth=1;
    for(let i=0;i<6;i++){const a=h.spin+time*3+i*TAU/6;
      g.beginPath();g.moveTo(Math.cos(a)*h.rad,Math.sin(a)*h.rad);
      g.lineTo(Math.cos(a+.5)*46,Math.sin(a+.5)*46);g.stroke();}
    /* horizonte de sucesos */
    g.globalAlpha=fade;
    g.fillStyle='#050308';
    g.beginPath();g.arc(0,0,26,0,TAU);g.fill();
    g.strokeStyle='#B388FF';g.lineWidth=2;
    g.beginPath();g.arc(0,0,26,0,TAU);g.stroke();
    g.strokeStyle='rgba(255,255,255,.5)';g.lineWidth=1;
    g.beginPath();g.arc(0,0,22,time*4,time*4+4.4);g.stroke();
    g.restore();
  }
  ctx.globalAlpha=1;
}
/* ============ v4.14: FANTASMA del ranking — tu mejor carrera frenética ============ */
function drawGhost(){
  const ref=run.ghostRef;if(!ref||amClient())return;
  const lead=run.kills-ref(run.time);
  run.ghostLead=lead;
  const y=clamp(H*.42-lead*4,H*.14,H*.86);
  const g=ctx,c=lead>=0?'#7DFF9E':'#FF6B6B';
  g.save();g.globalAlpha=.5;g.translate(W-40,y);
  g.strokeStyle=c;g.lineWidth=1.5;g.setLineDash([5,6]);
  g.beginPath();g.moveTo(0,-13);g.lineTo(9,11);g.lineTo(0,5);g.lineTo(-9,11);g.closePath();g.stroke();
  g.setLineDash([]);
  g.globalAlpha=.85;
  g.font='700 9px "Chakra Petch",monospace';g.textAlign='center';
  g.fillStyle=c;
  g.fillText('FANTASMA',0,24);
  g.fillText((lead>=0?'+':'')+lead,0,34);
  g.restore();
}
function drawGridDust(dt,gridCol,dustCol){
  ctx.strokeStyle='rgba('+(gridCol||'130,150,180')+',.05)';ctx.lineWidth=1;ctx.beginPath();
  for(let x=22;x<W;x+=44){ctx.moveTo(x,0);ctx.lineTo(x,H);}
  for(let y=22;y<H;y+=44){ctx.moveTo(0,y);ctx.lineTo(W,y);}
  ctx.stroke();
  ctx.fillStyle='rgba('+(dustCol||'140,160,190')+',.16)';
  for(const d of dust){
    d.y+=d.v*dt/H;if(d.y>1.02){d.y=-.02;d.x=Math.random();}
    ctx.fillRect(d.x*W,d.y*H,d.s,d.s);
  }
}
function shapePath(g,shape,r){
  g.beginPath();
  const poly=n=>{for(let i=0;i<n;i++){const a=-Math.PI/2+i*TAU/n;
    i?g.lineTo(Math.cos(a)*r,Math.sin(a)*r):g.moveTo(Math.cos(a)*r,Math.sin(a)*r);}g.closePath();};
  switch(shape){
    case 'circle':g.arc(0,0,r,0,TAU);break;
    case 'tri':poly(3);break;
    case 'square':g.rect(-r*.8,-r*.8,r*1.6,r*1.6);break;
    case 'penta':poly(5);break;
    case 'hexa':poly(6);break;
    case 'diamond':g.moveTo(0,-r);g.lineTo(r*.75,0);g.lineTo(0,r);g.lineTo(-r*.75,0);g.closePath();break;
    case 'star':for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;
      i?g.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):g.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}g.closePath();break;
    case 'cross':{const w=r*.38;
      const pts=[[-w,-r],[w,-r],[w,-w],[r,-w],[r,w],[w,w],[w,r],[-w,r],[-w,w],[-r,w],[-r,-w],[-w,-w]];
      pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();break;}
    case 'nonagon':poly(9);break;
    /* v4.16: túnica encapuchada del MAGO — capucha puntiaguda y manto ancho */
    case 'mage':{
      g.moveTo(0,-r);
      g.bezierCurveTo(r*.5,-r*.9,r*.62,-r*.4,r*.4,-r*.15);
      g.lineTo(r*.95,r*.95);
      g.lineTo(-r*.95,r*.95);
      g.lineTo(-r*.4,-r*.15);
      g.bezierCurveTo(-r*.62,-r*.4,-r*.5,-r*.9,0,-r);
      g.closePath();break;}
  }
}
function drawSnakeLinks(list){
  const groups={};
  for(const e of list){if(e.snake==null)continue;(groups[e.snake]=groups[e.snake]||[]).push(e);}
  ctx.lineWidth=3;
  for(const k in groups){
    const arr=groups[k].sort((a,b)=>a.snIdx-b.snIdx);
    for(let i=0;i<arr.length-1;i++){
      ctx.globalAlpha=.5;ctx.strokeStyle=arr[i].T.color;
      ctx.beginPath();ctx.moveTo(arr[i].x,arr[i].y);ctx.lineTo(arr[i+1].x,arr[i+1].y);ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
}
function drawEnemy(e){
  const g=ctx;
  if(e.elite){
    g.save();g.translate(e.x,e.y);g.rotate(time*1.4);
    g.globalAlpha=.5+Math.sin(time*5)*.2;g.strokeStyle='#B388FF';g.lineWidth=2;
    g.setLineDash([7,9]);g.beginPath();g.arc(0,0,e.r+9,0,TAU);g.stroke();
    g.setLineDash([]);g.restore();g.globalAlpha=1;
  }
  if(e.camp){
    g.save();g.translate(e.x,e.y);g.rotate(-time*.8);
    g.globalAlpha=.6+Math.sin(time*4)*.15;
    g.strokeStyle=e.CD.color;g.lineWidth=2;
    g.beginPath();g.arc(0,0,e.r+8,0,TAU);g.stroke();
    g.lineWidth=1;g.beginPath();g.arc(0,0,e.r+14,0,TAU);g.stroke();
    g.restore();g.globalAlpha=1;
    if(e.beam){
      const B=e.beam;
      const fade=1-B.t/B.life;
      g.save();
      g.globalAlpha=fade*.85;
      g.strokeStyle=e.CD.color;g.lineWidth=6;
      g.beginPath();g.moveTo(e.x,e.y);g.lineTo(e.x+Math.cos(B.a)*900,e.y+Math.sin(B.a)*900);g.stroke();
      g.globalAlpha=fade;
      g.strokeStyle='#FFFFFF';g.lineWidth=1.5;
      g.beginPath();g.moveTo(e.x,e.y);g.lineTo(e.x+Math.cos(B.a)*900,e.y+Math.sin(B.a)*900);g.stroke();
      g.restore();
    }
    g.font='700 9px "Chakra Petch",monospace';g.textAlign='center';
    g.fillStyle=e.CD.color;
    g.fillText(e.CD.name,e.x,e.y-e.r-18);
  }
  if(e.T.magnet){
    g.save();g.translate(e.x,e.y);
    g.globalAlpha=.16+Math.sin(time*3+e.wob)*.07;
    g.strokeStyle='#C9A0FF';g.lineWidth=1.5;g.setLineDash([3,7]);
    g.beginPath();g.arc(0,0,e.r+16,0,TAU);g.stroke();
    g.setLineDash([]);g.restore();g.globalAlpha=1;
  }
  /* v4.16: aura arcano del MAGO — anillo mágico con 2 runas orbitando */
  if(e.T.mage){
    g.save();g.translate(e.x,e.y);
    g.globalAlpha=.3+Math.sin(time*2.6+e.wob)*.14;
    g.strokeStyle='#B388FF';g.lineWidth=1.5;
    g.beginPath();g.arc(0,0,e.r+9,0,TAU);g.stroke();
    for(let i=0;i<2;i++){
      const a=time*1.7+e.wob+i*Math.PI;
      g.globalAlpha=.8;
      g.fillStyle='#B388FF';
      g.beginPath();g.arc(Math.cos(a)*(e.r+9),Math.sin(a)*(e.r+9)*.6,2.3,0,TAU);g.fill();
    }
    g.restore();g.globalAlpha=1;
  }
  /* v4.17: marca de esbirro RESUCITADO — bruma lila que lo distingue */
  if(e.revived){
    g.save();g.translate(e.x,e.y);
    g.globalAlpha=.28+Math.sin(time*3+e.wob)*.1;
    g.strokeStyle='#D6BCFF';g.lineWidth=1.5;g.setLineDash([4,6]);
    g.beginPath();g.arc(0,0,e.r+5,0,TAU);g.stroke();
    g.setLineDash([]);g.restore();g.globalAlpha=1;
  }
  if(e.frozen>0){
    g.save();g.translate(e.x,e.y);
    g.globalAlpha=.25;g.strokeStyle='#B0E8FF';g.lineWidth=2;
    g.fillStyle='rgba(176,232,255,.12)';
    shapePath(g,'circle',e.r+4);
    g.fill();g.stroke();
    g.globalAlpha=.9;g.lineWidth=1.5;
    for(let i=0;i<3;i++){
      const a=i*Math.PI/3+time*.5;
      g.beginPath();
      g.moveTo(-Math.cos(a)*(e.r*.5),-Math.sin(a)*(e.r*.5));
      g.lineTo(Math.cos(a)*(e.r*.5),Math.sin(a)*(e.r*.5));
      g.stroke();
    }
    g.restore();g.globalAlpha=1;
  }
  if(e.shockT>0){
    g.save();g.translate(e.x,e.y);
    g.globalAlpha=.7;g.strokeStyle='#FFE666';g.lineWidth=1.5;
    g.beginPath();
    let ang=rand(0,TAU);
    g.moveTo(0,0);
    for(let i=0;i<3;i++){
      ang+=rand(-.8,.8);
      g.lineTo(Math.cos(ang)*(e.r*.6),Math.sin(ang)*(e.r*.6));
    }
    g.stroke();
    g.restore();
  }
  g.save();g.translate(e.x,e.y);
  const rot=e.tk==='dash'?time*3+e.wob:(e.T.kami?time*6+e.wob:Math.sin(time*2+e.wob)*.2);
  g.rotate(rot);
  const pr=e.tk==='hive'?e.r+Math.sin(time*5+e.wob)*2:e.r;
  g.lineWidth=2;
  g.strokeStyle=e.flash>.5?'#FFFFFF':(e.camp?e.CD.color:e.T.color);
  shapePath(g,e.camp?'hexa':e.T.shape,pr);
  g.globalAlpha=.13;g.fillStyle=e.camp?e.CD.color:e.T.color;g.fill();
  g.globalAlpha=1;g.stroke();
  if(e.T.reflects){
    g.globalAlpha=.5;g.lineWidth=1;
    shapePath(g,'penta',pr*.5);g.stroke();g.globalAlpha=1;
  }
  if(e.T.kami){
    const chg=e.state==='kam'?Math.min(1,e.kamT/1.2):0;
    g.globalAlpha=.4+chg*.5+Math.sin(time*(6+chg*14)+e.wob)*.15;
    g.strokeStyle='#FF4757';g.lineWidth=2;
    g.beginPath();g.arc(0,0,e.r+4+chg*5,0,TAU);g.stroke();
    g.globalAlpha=1;
  }
  if(e.elvl>=10&&!e.T.reflects){
    g.globalAlpha=.45;g.lineWidth=1;
    shapePath(g,e.camp?'hexa':e.T.shape,pr*.6);g.stroke();g.globalAlpha=1;
  }
  g.restore();
  const digits=(''+Math.max(0,Math.ceil(e.hp))).length;
  const fs=Math.max(10,e.r*(digits>=4?.55:digits>=3?.7:.9));
  g.save();g.translate(e.x,e.y);
  g.font=`700 ${fs*(1+e.flash*.3)}px "Chakra Petch",monospace`;
  g.textAlign='center';g.textBaseline='middle';
  g.lineWidth=3;g.strokeStyle='rgba(7,9,13,.9)';
  g.strokeText(Math.max(0,Math.ceil(e.hp)),0,1);
  g.fillStyle=e.elite?'#D9C2FF':(e.flash>.4?'#FFD166':'#F2EFE6');
  g.fillText(Math.max(0,Math.ceil(e.hp)),0,1);
  g.restore();
}
function drawWreck(w){
  const g=ctx;
  g.save();g.translate(w.x,w.y);
  g.rotate(Math.PI/4);
  g.globalAlpha=.55+Math.sin(time*6)*.15;
  g.strokeStyle='#8B93A1';g.lineWidth=2;
  g.beginPath();
  g.moveTo(0,-17);g.lineTo(5,-4);g.lineTo(15,9);g.lineTo(6,6);g.lineTo(4,13);
  g.lineTo(-4,13);g.lineTo(-6,6);g.lineTo(-15,9);g.lineTo(-5,-4);g.closePath();
  g.stroke();
  g.rotate(-Math.PI/4);
  g.globalAlpha=1;
  if(w.prog>0){
    g.strokeStyle='#7FD1B9';g.lineWidth=3;
    g.beginPath();g.arc(0,0,22,-Math.PI/2,-Math.PI/2+TAU*w.prog);g.stroke();
  }
  g.strokeStyle='rgba(127,209,185,.4)';g.lineWidth=1.5;g.setLineDash([4,6]);
  g.beginPath();g.arc(0,0,30,0,TAU);g.stroke();
  g.setLineDash([]);
  g.restore();
  ctx.font='700 8px "Chakra Petch",monospace';ctx.textAlign='center';
  ctx.fillStyle='#7FD1B9';
  ctx.fillText('ACÉRCATE PARA RESCATAR (-1 VIDA)',w.x,w.y+44);
}
function drawBossCommon(){
  const b=boss;if(!b)return;
  const g=ctx,col=b.ph>=2?'#FF4757':(b.D?b.D.color:'#FF6B6B');
  g.save();g.translate(b.x,b.y);
  if(b.gxA>0){
    g.save();
    g.globalAlpha=.5+Math.sin(time*8)*.2;
    g.strokeStyle='#FFD166';g.lineWidth=2;
    for(let i=0;i<3;i++){
      g.beginPath();g.arc(b.gxA-b.x,b.gyA-b.y,20+i*14+Math.sin(time*4+i)*5,0,TAU);g.stroke();
    }
    g.globalAlpha=.3;
    g.fillStyle='#FFD166';
    g.beginPath();g.arc(b.gxA-b.x,b.gyA-b.y,12,0,TAU);g.fill();
    g.restore();
  }
  if(b.lasers&&b.lasers.length){
    for(const L of b.lasers){
      const fade=L.t<.3?L.t/.3:(L.life-L.t<.4?(L.life-L.t)/.4:1);
      g.save();
      g.globalAlpha=fade*.85;
      g.strokeStyle=col;g.lineWidth=8;
      g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(L.a)*900,Math.sin(L.a)*900);g.stroke();
      g.globalAlpha=fade;
      g.strokeStyle='#FFFFFF';g.lineWidth=2;
      g.beginPath();g.moveTo(0,0);g.lineTo(Math.cos(L.a)*900,Math.sin(L.a)*900);g.stroke();
      g.restore();
    }
  }
  if(b.shields&&b.shields.length){
    for(const s of b.shields){
      const sx=Math.cos(s.a)*(b.r+30),sy=Math.sin(s.a)*(b.r+30);
      g.save();g.translate(sx,sy);
      g.strokeStyle='#7DFF9E';g.lineWidth=2;
      g.fillStyle='rgba(125,255,158,.15)';
      shapePath(g,'hexa',20);
      g.fill();g.stroke();
      g.fillStyle='#0B0E13';g.font='700 10px "Chakra Petch",monospace';
      g.textAlign='center';g.textBaseline='middle';
      g.fillText(s.hp,0,1);
      g.restore();
    }
  }
  if(b.gather){
    g.save();
    g.globalAlpha=.6;
    g.strokeStyle='#FF9F43';g.lineWidth=2;
    for(const gt of b.gather){
      const dx=Math.cos(gt.a)*gt.d,dy=Math.sin(gt.a)*gt.d;
      g.beginPath();g.arc(dx,dy,4,0,TAU);g.stroke();
    }
    g.restore();
  }
  if(b.clones&&b.clones.length){
    for(const c of b.clones){
      g.save();g.translate(c.x-b.x,c.y-b.y);g.rotate(time*1.2+c.wob);
      g.globalAlpha=.75;
      g.strokeStyle='#64C7FF';g.lineWidth=2;
      g.setLineDash([6,6]);
      shapePath(g,'diamond',40);
      g.stroke();
      g.setLineDash([]);
      g.fillStyle='#0B0E13';g.font='700 13px "Chakra Petch",monospace';
      g.textAlign='center';g.textBaseline='middle';
      g.fillText(c.hp,0,1);
      g.restore();
    }
  }
  g.save();g.rotate(-(b.rot||0)*.7);
  g.strokeStyle=col;g.lineWidth=3;g.globalAlpha=.7;
  for(let i=0;i<9;i++){const a=i*TAU/9;g.beginPath();g.arc(0,0,b.r+13,a,a+.42);g.stroke();}
  g.restore();
  g.save();g.rotate((b.rot||0)*.5);
  g.lineWidth=2.5;g.strokeStyle=b.flash>.4?'#FFF':col;
  shapePath(g,b.D?b.D.shape:'nonagon',b.r);
  g.fillStyle=b.ph>=2?'rgba(255,71,87,.14)':'rgba(255,107,107,.12)';g.fill();g.stroke();
  g.restore();
  /* v4.14: marcas visuales de las fases 3–5 */
  if(!b.D||!b.D.easy){
    if(b.ph>=3){
      g.save();g.rotate((b.rot||0)*1.3);
      g.strokeStyle='#FF4757';g.lineWidth=1.5;g.globalAlpha=.6;
      for(let i=0;i<12;i++){const a=i*TAU/12;g.beginPath();g.arc(0,0,b.r+22,a,a+.3);g.stroke();}
      g.restore();
    }
    if(b.ph>=4){
      g.save();
      g.globalAlpha=.10+Math.sin(time*6)*.05;
      g.fillStyle='#FF4757';
      g.beginPath();g.arc(0,0,b.r+30,0,TAU);g.fill();
      g.restore();
    }
    if(b.ph>=5){
      g.save();g.strokeStyle='#FF4757';g.lineWidth=1.6;g.globalAlpha=.85;
      for(let i=0;i<5;i++){const a=i*TAU/5+1.1;
        g.beginPath();
        g.moveTo(Math.cos(a)*b.r*.2,Math.sin(a)*b.r*.2);
        g.lineTo(Math.cos(a+.22)*b.r*.55,Math.sin(a+.22)*b.r*.55);
        g.lineTo(Math.cos(a-.1)*b.r*.95,Math.sin(a-.1)*b.r*.95);
        g.stroke();}
      g.restore();
    }
    g.save();
    g.font='700 10px "Chakra Petch",monospace';g.textAlign='center';
    g.globalAlpha=.75;g.fillStyle='#FF4757';
    g.fillText('FASE '+b.ph+(b.maxPh>2?'/'+b.maxPh:''),0,b.r+42);
    g.restore();
    g.globalAlpha=1;
  }
  const nr=b.r*.42+Math.sin(time*5)*1.5;
  g.fillStyle='#0B0E13';g.beginPath();g.arc(0,0,nr+3,0,TAU);g.fill();
  g.strokeStyle='#F2EFE6';g.lineWidth=1.5;g.beginPath();g.arc(0,0,nr,0,TAU);g.stroke();
  g.font='700 17px "Chakra Petch",monospace';
  g.textAlign='center';g.textBaseline='middle';g.fillStyle='#F2EFE6';
  g.fillText(Math.max(0,Math.ceil(b.hp)),0,1);
  g.restore();
}
function drawShip(pl,isLocal){
  const g=ctx;
  if(pl.hp<=0)return;
  /* v4.12: HANGAR — TU nave lleva el aspecto equipado del hangar.
     En co-op cada dispositivo pinta el suyo; el rival conserva su color.
     'prisma' cicla todos los colores con el tiempo. */
  const mine=pl.slot===localSlot;
  let sk=mine?getSkin():null;
  /* v4.25: en ONLINE el rival luce SU aspecto equipado (viaja por la conexión
     en welcome/start/stats) — ambas pantallas pintan la misma pareja de colores */
  if(!mine&&net.mode&&net.remoteSkin&&net.remoteSkin[pl.slot]){
    const rc=net.remoteSkin[pl.slot];
    const mc=getSkin()?getSkin().color:null;
    if(rc&&rc!==mc)sk={color:rc};
  }
  /* v4.25: FIX — antes comparaba sk.color!=='menta' (color es un HEX): con el
     aspecto MENTA por defecto cada dispositivo pintaba SU nave menta y en el
     P2 ambas naves quedaban IGUAL. Ahora se compara el id (y el hex de menta
     para el aspecto remoto, que viaja como color). */
  const skOn=sk&&(sk.id?sk.id!=='menta':sk.color!=='#7FD1B9');
  const skc=skOn?(sk.color==='prisma'?'hsl('+Math.floor((time*40)%360)+',85%,66%)':sk.color):null;
  const skHex=skOn&&sk.color!=='prisma'?sk.color:null;
  /* v4.15: color por slot — P1 menta, P2 rosa, P3 cielo */
  const core=skc||SLOT_COL[pl.slot]||'#7FD1B9';
  const blink=pl.invul>0&&Math.floor(time*18)%2===0;
  if(pl.orbs>0){
    const ot=(pl.orbT||time*2.4);
    for(let i=0;i<pl.orbs;i++){
      const a=ot+i*TAU/pl.orbs;
      const ox=pl.x+Math.cos(a)*34,oy=pl.y+Math.sin(a)*34;
      g.save();g.translate(ox,oy);
      g.strokeStyle=core;g.lineWidth=1.5;
      g.beginPath();g.arc(0,0,5,0,TAU);g.stroke();
      g.fillStyle=core;g.globalAlpha=.35;g.fill();g.globalAlpha=1;
      g.restore();
    }
  }
  g.save();g.translate(pl.x,pl.y);
  g.globalAlpha=blink?.35:1;
  g.strokeStyle='#FFD166';g.lineWidth=2;g.beginPath();
  const fl=8+Math.random()*7;
  g.moveTo(-3,13);g.lineTo(0,13+fl);g.lineTo(3,13);g.stroke();
  if(pl.aura){
    g.globalAlpha=blink?.14:.4;g.setLineDash([6,8]);g.strokeStyle='#FF6B6B';
    g.beginPath();g.arc(0,0,72,time*1.2,time*1.2+TAU);g.stroke();
    g.setLineDash([]);g.globalAlpha=blink?.35:1;
  }
  if(pl.pointDef){
    g.globalAlpha=.16;g.setLineDash([4,10]);g.strokeStyle='#64C7FF';
    g.beginPath();g.arc(0,0,90,0,TAU);g.stroke();
    g.setLineDash([]);g.globalAlpha=blink?.35:1;
  }
  if(pl.slowField){
    g.globalAlpha=.12;g.strokeStyle='#FF7EB6';
    g.beginPath();g.arc(0,0,140,0,TAU);g.stroke();g.globalAlpha=blink?.35:1;
  }
  if(pl.wind){
    g.globalAlpha=.10+Math.sin(time*3)*.04;g.strokeStyle='#B0E8FF';g.lineWidth=2;
    g.setLineDash([2,10]);
    g.beginPath();g.arc(0,0,pl.wind.rad,time*.8,time*.8+TAU);g.stroke();
    g.setLineDash([]);g.globalAlpha=blink?.35:1;
  }
  g.strokeStyle=skc||'#F2EFE6';
  g.fillStyle=skHex?hexA(skHex,.16):(skc?'rgba(255,255,255,.10)':'rgba(242,239,230,.12)');
  g.lineWidth=2;
  g.beginPath();
  g.moveTo(0,-17);g.lineTo(5,-4);g.lineTo(15,9);g.lineTo(6,6);g.lineTo(4,13);
  g.lineTo(-4,13);g.lineTo(-6,6);g.lineTo(-15,9);g.lineTo(-5,-4);g.closePath();
  g.fill();g.stroke();
  g.fillStyle=core;
  g.beginPath();g.moveTo(0,-7);g.lineTo(3.4,-2);g.lineTo(0,3);g.lineTo(-3.4,-2);g.closePath();g.fill();
  /* ===== v4.13: EVOLUCIÓN VISUAL — la nave luce cada arma que compras =====
     Pistolas gemelas, cañón central, filas extra, punta perforadora,
     lanzamisiles, cañón prisma, mira crítica, antena imán, núcleo en
     llamas, bobinas del Aniquilador y refuerzos por nivel de nave. */
  const hvm='#B9C4D0'; /* metal de los cañones */
  const tier=Math.min(3,Math.floor(((run.shipLv||1)-1)/4)); /* 0–3 por nivel de nave */
  if(tier>=1){ /* refuerzos de ala */
    g.strokeStyle=hvm;g.lineWidth=1.3;
    g.beginPath();g.moveTo(-14,8);g.lineTo(-6,-2);g.moveTo(14,8);g.lineTo(6,-2);g.stroke();
  }
  if(tier>=2){ /* paneles exteriores */
    g.beginPath();g.moveTo(-15,9);g.lineTo(-11,1);g.moveTo(15,9);g.lineTo(11,1);g.stroke();
  }
  if(tier>=3){ /* quilla dorsal */
    g.fillStyle=hvm;g.fillRect(-1.2,-13,2.4,8);
  }
  if(pl.bullets>=2){ /* pistolas gemelas en las alas */
    g.fillStyle=hvm;g.fillRect(-14,-11,3,8);g.fillRect(11,-11,3,8);
    g.fillStyle='#FFD166';g.fillRect(-14,-12,3,2);g.fillRect(11,-12,3,2);
  }
  if(pl.bullets>=3){ /* tercer cañón central */
    g.fillStyle=hvm;g.fillRect(-1.5,-17,3,6);
  }
  if(pl.files>=2){ /* pods de fila paralela */
    g.fillStyle=hvm;g.fillRect(-10,-5,3,9);g.fillRect(7,-5,3,9);
  }
  if(pl.files>=3){ /* aletas de la tercera fila */
    g.fillStyle=hvm;g.fillRect(-6,-15,12,2.5);
  }
  if(pl.pierce>0){ /* punta perforadora dorada */
    g.strokeStyle='#FFD166';g.lineWidth=1.6;
    g.beginPath();g.moveTo(0,-17);g.lineTo(0,-25);g.stroke();
  }
  if(pl.homing){ /* lanzamisiles laterales */
    g.fillStyle=hvm;g.fillRect(-18,-2,4,7);g.fillRect(14,-2,4,7);
    g.fillStyle='#FF7EB6';g.fillRect(-17,-3,2,2);g.fillRect(15,-3,2,2);
  }
  if(pl.prism){ /* cañón prisma montado en el morro */
    g.strokeStyle='#B0F2FF';g.lineWidth=1.5;
    g.beginPath();g.arc(0,-12,4+Math.sin(time*6)*.8,0,TAU);g.stroke();
    g.fillStyle='#B0F2FF';g.fillRect(-1,-21,2,7);
  }
  if(pl.overdrive){ /* núcleo sobrecargado en llamas */
    g.strokeStyle='rgba(255,107,107,.85)';g.lineWidth=1.5;
    g.beginPath();g.arc(0,-2,6+Math.sin(time*9)*1.2,0,TAU);g.stroke();
  }
  if(pl.crit>=.2){ /* mira dorada de crítico */
    g.strokeStyle='#FFD166';g.lineWidth=1.2;
    g.beginPath();g.arc(0,-2,9,-.5,1.2);g.stroke();
    g.beginPath();g.arc(0,-2,9,Math.PI-.5,Math.PI+1.2);g.stroke();
  }
  if(pl.magnet>=1.8){ /* antena del imán */
    g.strokeStyle='#C9A0FF';g.lineWidth=1.4;
    g.beginPath();g.moveTo(0,-13);g.lineTo(0,-20);g.stroke();
    g.beginPath();g.arc(0,-21,2.5,0,TAU);g.stroke();
  }
  if(pl.ult){ /* bobinas del Aniquilador en la cola (giran sobre sí mismas) */
    g.strokeStyle='rgba(179,136,255,.9)';g.lineWidth=1.4;
    g.save();g.translate(-6,10);g.rotate(time*2.5);g.strokeRect(-2.5,-2.5,5,5);g.restore();
    g.save();g.translate(6,10);g.rotate(-time*2.5);g.strokeRect(-2.5,-2.5,5,5);g.restore();
  }
  if(pl.bh){ /* v4.14: orbe de singularidad en el morro (2ª definitiva) */
    g.fillStyle='#050308';g.beginPath();g.arc(0,-14,4,0,TAU);g.fill();
    g.strokeStyle='rgba(179,136,255,'+(.6+Math.sin(time*5)*.3)+')';g.lineWidth=1.2;
    g.beginPath();g.arc(0,-14,6+Math.sin(time*3)*1.2,0,TAU);g.stroke();
  }
  if(pl.regenRate>0){ /* halo verde de regeneración */
    g.globalAlpha=.35+Math.sin(time*4)*.15;g.strokeStyle='#7DFF9E';g.lineWidth=1.2;
    g.beginPath();g.arc(0,-2,8,0,TAU);g.stroke();
    g.globalAlpha=blink?.35:1;
  }
  if(pl.bounce>0){ /* aletas de rebote */
    g.strokeStyle=hvm;g.lineWidth=1.5;
    g.beginPath();g.moveTo(-15,9);g.lineTo(-20,13);g.moveTo(15,9);g.lineTo(20,13);g.stroke();
  }
  if(pl.field&&pl.shieldLvl){g.strokeStyle='rgba(100,199,255,.6)';g.beginPath();g.arc(0,0,20,0,TAU);g.stroke();}
  if(pl.shield&&pl.shieldUp){
    g.strokeStyle='rgba(100,199,255,.85)';g.lineWidth=2;
    g.beginPath();g.arc(0,0,24+Math.sin(time*4)*2,0,TAU);g.stroke();
  }
  if(frenzyT>0&&pl.slot===0){
    g.globalAlpha=.5;g.strokeStyle='#FFD166';g.lineWidth=1;
    g.beginPath();g.arc(0,0,28+Math.sin(time*12)*3,0,TAU);g.stroke();g.globalAlpha=blink?.35:1;
  }
  /* v4.8: etiqueta P1 / P2 / P3 sobre cada nave en co-op (v4.15: hasta 3) */
  if(players.length>=2){
    g.font='700 10px "Chakra Petch",monospace';g.textAlign='center';g.textBaseline='alphabetic';
    g.fillStyle=core;g.fillText('P'+(pl.slot+1),0,-30);
  }
  g.restore();
  if(!isLocal)return;
  const key=''+pl.slot;
  /* v4.9: bots aliados (naves doradas autónomas) */
  for(let i=0;i<bots.length;i++){
    const bt=bots[i];
    g.save();g.translate(bt.x,bt.y);
    g.strokeStyle='#FFD166';g.lineWidth=1.6;
    g.beginPath();g.moveTo(0,-9);g.lineTo(7,7);g.lineTo(-7,7);g.closePath();g.stroke();
    g.fillStyle='rgba(255,209,102,.3)';g.fill();
    g.fillStyle='#B388FF';g.fillRect(-1.5,-1.5,3,3);
    g.restore();
  }
  for(let i=0;i<(pl.drones||0)&&i<dronePos[key].length;i++){
    const d=dronePos[key][i];if(!d)continue;
    g.save();g.translate(d.x,d.y);g.rotate(time*3+i);
    g.strokeStyle='#FFD166';g.lineWidth=1.5;
    g.beginPath();g.moveTo(0,-6);g.lineTo(5,4);g.lineTo(-5,4);g.closePath();g.stroke();
    g.fillStyle='rgba(255,209,102,.25)';g.fill();
    g.restore();
  }
}
/* mini-mapa de amenazas */
function drawRadar(){
  const pts=[];
  if(amClient()){
    for(const [,e] of cEnemies){
      if(e.elite)pts.push({x:e.x,y:e.y,c:'#B388FF',s:2.5});
      if(e.camp)pts.push({x:e.x,y:e.y,c:'#FFD166',s:3.5});
    }
  }else{
    for(const e of enemies){
      if(e.dead)continue;
      if(e.elite)pts.push({x:e.x,y:e.y,c:'#B388FF',s:2.5});
      if(e.camp)pts.push({x:e.x,y:e.y,c:'#FFD166',s:3.5});
    }
  }
  if(boss)pts.push({x:boss.x,y:boss.y,c:'#FF4757',s:4.5});
  if(pts.length===0)return;
  const r=30,cx=W-44,cy=112;
  ctx.save();
  ctx.globalAlpha=.85;
  ctx.fillStyle='rgba(12,16,22,.72)';
  ctx.beginPath();ctx.arc(cx,cy,r+5,0,TAU);ctx.fill();
  ctx.strokeStyle='#232B36';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(cx,cy,r+5,0,TAU);ctx.stroke();
  ctx.strokeStyle='rgba(139,147,161,.25)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();
  for(const p of pts){
    const px=cx+clamp((p.x/W-.5)*2,-1,1)*r*.82;
    const py=cy+clamp((p.y/H-.5)*2,-1,1)*r*.82;
    ctx.fillStyle=p.c;
    ctx.beginPath();ctx.arc(px,py,p.s,0,TAU);ctx.fill();
  }
  for(const pl of players){
    if(pl.hp<=0)continue;
    const px=cx+clamp((pl.x/W-.5)*2,-1,1)*r*.82;
    const py=cy+clamp((pl.y/H-.5)*2,-1,1)*r*.82;
    /* v4.15: puntos del radar con el color de cada slot (P3 incluido) */
    ctx.fillStyle=SLOT_COL[pl.slot]||'#7FD1B9';
    ctx.beginPath();ctx.arc(px,py,2,0,TAU);ctx.fill();
  }
  ctx.restore();
}
function renderGame(dt){
  drawBiomeBg(dt); /* v4.14: fondo por bioma */
  /* v4.18: tinte dorado de la OLEADA DORADA */
  if(goldenWave&&state==='play'){
    ctx.fillStyle='rgba(255,209,102,.045)';ctx.fillRect(0,0,W,H);
  }
  /* v4.20: tinte violáceo de la DIMENSIÓN ANÓMALA */
  if(anomalyWave&&state==='play'){
    ctx.fillStyle='rgba(138,90,255,.055)';ctx.fillRect(0,0,W,H);
  }
  drawHoles(); /* v4.14: agujeros negros bajo el resto */
  ctx.save();
  if(shake>.2)ctx.translate(rand(-shake,shake)*.5,rand(-shake,shake)*.5);
  for(const r of rings){
    const k=r.t/r.life;
    ctx.globalAlpha=1-k;ctx.strokeStyle=r.color;ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(r.x,r.y,r.r+(r.R-r.r)*easeOut(k),0,TAU);ctx.stroke();
  }
  ctx.globalAlpha=1;
  const pkList=amClient()?cPK:pickups;
  for(const p of pkList){
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.sin(time*4+p.x)*.4);
    if(p.t==='gold'){ctx.strokeStyle='#FFD166';ctx.lineWidth=1.8;
      ctx.beginPath();ctx.arc(0,0,5.5,0,TAU);ctx.stroke();
      ctx.fillStyle='#FFD166';ctx.beginPath();ctx.arc(0,0,2,0,TAU);ctx.fill();}
    else if(p.t==='gem'){ctx.strokeStyle='#64C7FF';ctx.lineWidth=1.8;
      ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(5,0);ctx.lineTo(0,6);ctx.lineTo(-5,0);ctx.closePath();ctx.stroke();}
    else if(p.t==='fuel'){ /* v4.29: BIDÓN DE COMBUSTIBLE — lata verde brillante */
      ctx.strokeStyle='#7DFF9E';ctx.lineWidth=1.8;
      ctx.strokeRect(-4.5,-6,9,12);
      ctx.beginPath();ctx.moveTo(-2.5,-6);ctx.lineTo(-2.5,-8.5);ctx.lineTo(2.5,-8.5);ctx.lineTo(2.5,-6);ctx.stroke();
      ctx.fillStyle='#7DFF9E';ctx.fillRect(-2.5,-2,5,4);
      ctx.globalAlpha=.25+Math.sin(time*5+p.x)*.12;
      ctx.strokeStyle='#7DFF9E';ctx.beginPath();ctx.arc(0,0,13,0,TAU);ctx.stroke();
      ctx.globalAlpha=1;}
    else if(p.t==='elec'){ /* v4.29: CELDA ELÉCTRICA — batería azul con chispa */
      ctx.strokeStyle='#64C7FF';ctx.lineWidth=1.8;
      ctx.strokeRect(-4,-6,8,12);
      ctx.beginPath();ctx.moveTo(-2,-6);ctx.lineTo(-2,-8);ctx.lineTo(2,-8);ctx.lineTo(2,-6);ctx.stroke();
      ctx.beginPath();ctx.moveTo(0,-3.5);ctx.lineTo(-1.8,0);ctx.lineTo(0,0);ctx.lineTo(-1.2,3.5);
      ctx.moveTo(0,3.5);ctx.lineTo(1.8,0);ctx.lineTo(0,0);ctx.lineTo(1.2,-3.5);
      ctx.lineWidth=1.3;ctx.stroke();
      ctx.globalAlpha=.25+Math.sin(time*7+p.y)*.15;
      ctx.strokeStyle='#64C7FF';ctx.beginPath();ctx.arc(0,0,13,0,TAU);ctx.stroke();
      ctx.globalAlpha=1;}
    else if(p.t==='chest'){
      ctx.rotate(0);
      ctx.strokeStyle='#FFD166';ctx.lineWidth=2;
      ctx.strokeRect(-9,-7,18,14);
      ctx.beginPath();ctx.moveTo(-9,-2);ctx.lineTo(9,-2);ctx.stroke();
      ctx.font='700 11px "Chakra Petch",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='#FFD166';ctx.fillText('?',0,6);
      ctx.globalAlpha=.3+Math.sin(time*6)*.15;
      ctx.strokeStyle='#FFD166';
      ctx.beginPath();ctx.arc(0,0,16,0,TAU);ctx.stroke();
      ctx.globalAlpha=1;
    }
    else if(p.t==='minichest'){
      ctx.rotate(0);
      ctx.strokeStyle='#7FD1B9';ctx.lineWidth=2;
      ctx.strokeRect(-6,-5,12,10);
      ctx.beginPath();ctx.moveTo(-6,-1.5);ctx.lineTo(6,-1.5);ctx.stroke();
      ctx.globalAlpha=.3+Math.sin(time*6)*.15;
      ctx.strokeStyle='#7FD1B9';
      ctx.beginPath();ctx.arc(0,0,11,0,TAU);ctx.stroke();
      ctx.globalAlpha=1;
    }
    else if(p.t==='schest'){
      ctx.rotate(0);
      ctx.strokeStyle='#FFD166';ctx.lineWidth=2;
      ctx.strokeRect(-10,-8,20,16);
      ctx.beginPath();ctx.moveTo(-10,-2.5);ctx.lineTo(10,-2.5);ctx.stroke();
      ctx.font='700 12px "Chakra Petch",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='#FFD166';ctx.fillText('?',0,5);
      const frac=clamp((p.shield||0)/(p.shieldMax||1),0,1);
      ctx.globalAlpha=.4+Math.sin(time*7)*.2;
      ctx.strokeStyle='#64C7FF';ctx.lineWidth=2.5;
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=TAU*i/6+time*.8;
        const hx=Math.cos(a)*24,hy=Math.sin(a)*24;
        i?ctx.lineTo(hx,hy):ctx.moveTo(hx,hy);}
      ctx.closePath();ctx.stroke();
      ctx.globalAlpha=.85;ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(0,0,30,-Math.PI/2,-Math.PI/2+TAU*frac);ctx.stroke();
      ctx.globalAlpha=1;
    }
    else if(p.t==='cube'){ /* v4.20: CUBO SORPRESA — cubo rosa giratorio + escudo */
      const rot=time*1.2;
      ctx.strokeStyle='#FF7EB6';ctx.lineWidth=2;
      ctx.save();ctx.rotate(rot);ctx.strokeRect(-8,-8,16,16);ctx.restore();
      ctx.save();ctx.rotate(-rot*.7+.6);ctx.globalAlpha=.65;ctx.strokeRect(-8,-8,16,16);ctx.restore();
      ctx.font='700 10px "Chakra Petch",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle='#FF7EB6';ctx.fillText('?',0,1);
      const frac=clamp((p.shield||0)/(p.shieldMax||1),0,1);
      ctx.globalAlpha=.4+Math.sin(time*7)*.18;
      ctx.strokeStyle='#B388FF';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(0,0,20,0,TAU);ctx.stroke();
      ctx.globalAlpha=.85;ctx.lineWidth=2.5;
      ctx.beginPath();ctx.arc(0,0,25,-Math.PI/2,-Math.PI/2+TAU*frac);ctx.stroke();
      ctx.globalAlpha=1;
    }
    else if(p.t==='lchest'){ /* v4.18: cofre de la Fortuna — brillo según rareza */
      const col=p.rar==='c'?'#F2EFE6':p.rar==='r'?'#64C7FF':p.rar==='e'?'#B388FF':'#FFD166';
      const leg=p.rar==='l';
      ctx.strokeStyle=col;ctx.lineWidth=2;
      ctx.strokeRect(-7,-5,14,10);
      ctx.beginPath();ctx.moveTo(-7,-1);ctx.lineTo(7,-1);ctx.stroke();
      ctx.font='700 9px "Chakra Petch",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle=col;ctx.fillText(leg?'★':'?',0,5);
      ctx.globalAlpha=(leg?.45:.3)+Math.sin(time*(leg?9:5))*.2;
      ctx.strokeStyle=col;ctx.lineWidth=leg?2.5:1.5;
      ctx.beginPath();ctx.arc(0,0,leg?20:14,0,TAU);ctx.stroke();
      if(leg){
        ctx.globalAlpha=.25+Math.sin(time*11)*.15;
        ctx.beginPath();ctx.arc(0,0,27,0,TAU);ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
    else if(p.t==='vchest'){ /* v4.21: COFRE SELLADO — candado + aura de rareza */
      const col=p.rar==='c'?'#F2EFE6':p.rar==='r'?'#64C7FF':p.rar==='e'?'#B388FF':'#FFD166';
      const leg=p.rar==='l';
      ctx.strokeStyle=col;ctx.lineWidth=2;
      ctx.strokeRect(-8,-6,16,12);
      ctx.beginPath();ctx.moveTo(-8,-1.5);ctx.lineTo(8,-1.5);ctx.stroke();
      /* el candado: arcito + cuerpo sobre la tapa */
      ctx.beginPath();ctx.arc(0,-6,3,Math.PI,0);ctx.stroke();
      ctx.font='700 8px "Chakra Petch",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillStyle=col;ctx.fillText('🔒',0,3.5);
      ctx.globalAlpha=(leg?.5:.32)+Math.sin(time*(leg?9:5))*.2;
      ctx.strokeStyle=col;ctx.lineWidth=leg?2.5:1.5;
      ctx.beginPath();ctx.arc(0,0,leg?21:15,0,TAU);ctx.stroke();
      if(leg){
        ctx.globalAlpha=.25+Math.sin(time*11)*.15;
        ctx.beginPath();ctx.arc(0,0,28,0,TAU);ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
    else{ctx.fillStyle='#FF6B6B';
      ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(5,0);ctx.lineTo(0,6);ctx.lineTo(-5,0);ctx.closePath();ctx.fill();}
    ctx.restore();
  }
  /* v4.19: METEORITOS DORADOS — roca incandescente con halo y grietas
     v4.20: el ANÓMALO (púrpura) usa su propia paleta */
  for(const m of meteors){
    const mCol=m.pur?'#B388FF':'#FFD166',mDark=m.pur?'#3A2454':'#8A5A22',
      mSpark=m.pur?'#D6BCFF':'#FFE9B0',mHalo=m.pur?'#8A5AFF':'#FFD166';
    ctx.save();ctx.translate(m.x,m.y);
    ctx.globalAlpha=.22+Math.sin(time*9)*.08;
    ctx.fillStyle=mHalo;
    ctx.beginPath();ctx.arc(0,0,m.r+8,0,TAU);ctx.fill();
    ctx.globalAlpha=1;ctx.rotate(m.rot);
    ctx.fillStyle=mDark;ctx.strokeStyle=mCol;ctx.lineWidth=2.2;
    ctx.beginPath();
    for(let i=0;i<7;i++){const a=TAU*i/7,rr=m.r*m.verts[i];
      i?ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):ctx.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}
    ctx.closePath();ctx.fill();ctx.stroke();
    if(m.hp<m.maxhp){ /* grietas según el daño recibido */
      ctx.strokeStyle=mSpark;ctx.lineWidth=1.4;ctx.globalAlpha=.85;
      const cr=m.maxhp-m.hp;
      for(let i=0;i<cr;i++){const a=TAU*(i+.5)/cr;
        ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*m.r*.82,Math.sin(a)*m.r*.82);ctx.stroke();}
      ctx.globalAlpha=1;
    }
    ctx.restore();
  }
  /* v4.20: PORTAL MISTERIOSO — vórtice violáceo de anillos giratorios */
  for(const p of portals){
    ctx.save();ctx.translate(p.x,p.y);
    ctx.globalAlpha=.18+Math.sin(time*5)*.07;
    ctx.fillStyle='#8A5AFF';
    ctx.beginPath();ctx.arc(0,0,p.r+12,0,TAU);ctx.fill();
    ctx.globalAlpha=1;
    ctx.fillStyle='#0B0E13';
    ctx.beginPath();ctx.arc(0,0,p.r*.4,0,TAU);ctx.fill();
    for(let i=0;i<3;i++){
      ctx.save();ctx.rotate(time*(1.1+i*.5)*(i%2?-1:1)+i*2.1);
      ctx.strokeStyle=i===1?'#64C7FF':'#B388FF';
      ctx.lineWidth=2.4-i*.4;
      ctx.globalAlpha=.9-i*.2;
      ctx.beginPath();ctx.ellipse(0,0,p.r*(1-i*.24),p.r*.44,0,0,TAU);ctx.stroke();
      ctx.restore();
    }
    if(p.hp<p.maxhp){ /* pulso de grietas al recibir impactos */
      ctx.globalAlpha=.5+Math.sin(time*12)*.25;
      ctx.strokeStyle='#D6BCFF';ctx.lineWidth=1.6;
      const cr=p.maxhp-p.hp;
      for(let i=0;i<cr;i++){const a=TAU*(i+.5)/cr+time*.7;
        ctx.beginPath();ctx.moveTo(Math.cos(a)*p.r*.35,Math.sin(a)*p.r*.35);
        ctx.lineTo(Math.cos(a)*p.r*.95,Math.sin(a)*p.r*.95);ctx.stroke();}
    }
    ctx.globalAlpha=1;
    ctx.restore();
  }
  if(amClient()){
    drawSnakeLinks([...cEnemies.values()]);
    for(const [,e] of cEnemies)drawEnemy(e);
  }else{
    drawSnakeLinks(enemies);
    for(const e of enemies)drawEnemy(e);
  }
  if(boss)drawBossCommon();
  const wrList=amClient()?cWrecks:wrecks;
  for(const w of wrList)drawWreck(w);
  const ebList=amClient()?cEB:ebullets;
  for(const b of ebList){
    ctx.fillStyle=b.color;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();
    ctx.fillStyle='#0B0E13';ctx.beginPath();ctx.arc(b.x,b.y,2,0,TAU);ctx.fill();
  }
  const blList=amClient()?cBL:bullets;
  for(const b of blList){
    if(amClient()){
      ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.ang);
      if(b.kind===4){ctx.fillStyle='#FF7EB6';ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-5,4);ctx.lineTo(-5,-4);ctx.closePath();ctx.fill();}
      else if(b.kind===3){ctx.fillStyle='#FFD166';ctx.fillRect(-1.2,-5,2.4,10);}
      else if(b.kind===2){ctx.fillStyle='#FFD166';ctx.fillRect(-2.5,-9,5,18);}
      else{ctx.fillStyle=b.kind===1?'#FFD166':'#F2EFE6';ctx.fillRect(-1.5,-7,3,14);}
      ctx.restore();
    }else{
      if(b.missile){
        const a=Math.atan2(b.vy,b.vx);
        ctx.save();ctx.translate(b.x,b.y);ctx.rotate(a);
        ctx.fillStyle='#FF7EB6';
        ctx.beginPath();ctx.moveTo(7,0);ctx.lineTo(-5,4);ctx.lineTo(-5,-4);ctx.closePath();ctx.fill();
        ctx.restore();
      }else if(b.dr){ctx.fillStyle='#FFD166';ctx.fillRect(b.x-1.2,b.y-5,2.4,10);}
      else if(b.ally){ /* v4.20: balas de la NAVE AMIGA — doradas */ ctx.fillStyle='#FFE9B0';ctx.fillRect(b.x-1.6,b.y-7,3.2,14);}
      else if(b.bot){ /* v4.9: balas del aliado bot */ ctx.fillStyle='#B388FF';ctx.fillRect(b.x-1.5,b.y-6,3,12);}
      else if(b.heavy){ctx.fillStyle='#FFD166';ctx.fillRect(b.x-2.5,b.y-9,5,18);}
      else{ctx.fillStyle=b.crit?'#FFD166':'#F2EFE6';ctx.fillRect(b.x-1.5,b.y-7,3,14);}
    }
  }
  for(const bm of beams){
    const a=1-bm.t/bm.life;
    ctx.globalAlpha=a;ctx.strokeStyle='#FFFFFF';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(bm.x1,bm.y1);ctx.lineTo(bm.x2,bm.y2);ctx.stroke();
    ctx.globalAlpha=a*.5;ctx.strokeStyle='#FFD166';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(bm.x1,bm.y1);ctx.lineTo(bm.x2,bm.y2);ctx.stroke();
  }
  /* v4.13: rayo del CAÑÓN ANIQUILADOR — haz grueso violeta con núcleo blanco */
  for(const ub of ultBeams){
    const k=ub.t/ub.life,a=1-k,w=(1-k*.55)*26;
    ctx.save();
    ctx.globalAlpha=a*.22;ctx.strokeStyle='#B388FF';ctx.lineWidth=w*2.4;
    ctx.beginPath();ctx.moveTo(ub.x1,ub.y1);ctx.lineTo(ub.x2,ub.y2);ctx.stroke();
    ctx.globalAlpha=a*.6;ctx.strokeStyle='#B388FF';ctx.lineWidth=w;
    ctx.beginPath();ctx.moveTo(ub.x1,ub.y1);ctx.lineTo(ub.x2,ub.y2);ctx.stroke();
    ctx.globalAlpha=a;ctx.strokeStyle='#FFFFFF';ctx.lineWidth=Math.max(2,w*.26);
    ctx.beginPath();ctx.moveTo(ub.x1,ub.y1);ctx.lineTo(ub.x2,ub.y2);ctx.stroke();
    ctx.globalAlpha=a*.8;ctx.fillStyle='#FFFFFF';
    ctx.beginPath();ctx.arc(ub.x1,ub.y1,10*(1-k*.5),0,TAU);ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha=1;
  for(const pl of players){
    if(amClient()&&pl.slot===localSlot){ pl.orbT=(pl.orbT||0)+dt*2.4; drawShip(pl,true); }
    else drawShip(pl,!amClient());
  }
  drawGhost(); /* v4.14: fantasma del ranking (frenético) */
  /* v4.20: NAVES AMIGAS — escolta dorada orbitando a la nave del anfitrión */
  if(!amClient()){
    for(const a of allies){
      ctx.save();ctx.translate(a.x,a.y);
      ctx.globalAlpha=.45+Math.sin(time*5+a.ph)*.15;
      ctx.strokeStyle='#FFE9B0';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.arc(0,0,16,time*3+a.ph,time*3+a.ph+TAU*.55);ctx.stroke();
      ctx.globalAlpha=1;
      ctx.rotate(Math.sin(time*6+a.ph)*.12);
      drawShipIcon(ctx,.85,'#FFE9B0','#FFD166');
      ctx.restore();
    }
  }
  for(const p of parts){
    const a=1-p.t/p.life;
    ctx.globalAlpha=a;ctx.strokeStyle=p.color;ctx.lineWidth=1.5;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
    if(p.kind==='tri'){ctx.beginPath();ctx.moveTo(0,-p.size);ctx.lineTo(p.size,p.size);ctx.lineTo(-p.size,p.size);ctx.closePath();ctx.stroke();}
    else{ctx.beginPath();ctx.moveTo(-p.size,0);ctx.lineTo(p.size,0);ctx.stroke();}
    ctx.restore();
  }
  ctx.globalAlpha=1;
  for(const f of floats){
    ctx.globalAlpha=1-f.t/f.life;
    ctx.font=`700 ${f.size}px "Chakra Petch",monospace`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=f.color;ctx.fillText(f.txt,f.x,f.y);
  }
  ctx.globalAlpha=1;
  for(const em of emosFx){
    const a=1-em.t/em.life;
    ctx.globalAlpha=a;
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(em.kind==='emo'){
      ctx.font='34px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
      ctx.fillText(em.txt,em.x,em.y);
    }else{
      ctx.font='700 17px "Chakra Petch",monospace';
      ctx.lineWidth=4;ctx.strokeStyle='rgba(7,9,13,.9)';
      ctx.strokeText(em.txt,em.x,em.y);
      ctx.fillStyle=em.color;ctx.fillText(em.txt,em.x,em.y);
    }
  }
  ctx.globalAlpha=1;
  if(bannerT>0){
    const k=bannerT/BANNER_LIFE;
    const a=k>.82?(1-k)/.18:k<.25?k/.25:1;
    ctx.globalAlpha=a;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font='700 28px "Chakra Petch",monospace';ctx.fillStyle='#F2EFE6';
    ctx.fillText(bannerTxt,W/2,H*.32);
    if(bannerSub){ctx.font='500 11.5px "Chakra Petch",monospace';ctx.fillStyle='#8B93A1';
      ctx.fillText(bannerSub,W/2,H*.32+26);}
    ctx.globalAlpha=1;
  }
  ctx.restore();
  drawRadar();
}
function renderMenuBG(dt){
  ctx.fillStyle='#07090D';ctx.fillRect(0,0,W,H);
  drawGridDust(dt);
  for(const s of menuShapes){
    s.rot+=s.vr*dt;s.y+=s.vy*dt/H;if(s.y>1.15){s.y=-.15;s.x=Math.random();}
    ctx.save();ctx.translate(s.x*W,s.y*H);ctx.rotate(s.rot);
    ctx.globalAlpha=.09;ctx.strokeStyle='#F2EFE6';ctx.lineWidth=1.5;
    shapePath(ctx,s.shape,s.r);ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha=1;
  drawHero();
}
function drawShipIcon(g,scale,core,hull){
  g.save();g.scale(scale,scale);
  g.strokeStyle='#FFD166';g.lineWidth=1.6;g.beginPath();
  const fl=6+Math.random()*5;
  g.moveTo(-2,9);g.lineTo(0,9+fl);g.lineTo(2,9);g.stroke();
  /* v4.12: casco opcional con color de aspecto (vista previa del hangar) */
  g.strokeStyle=hull||'#F2EFE6';
  g.fillStyle=hull?hexA(hull,.16):'rgba(242,239,230,.12)';
  g.lineWidth=1.6;
  g.beginPath();
  g.moveTo(0,-13);g.lineTo(4,-3);g.lineTo(11,7);g.lineTo(5,4.5);g.lineTo(3,10);
  g.lineTo(-3,10);g.lineTo(-5,4.5);g.lineTo(-11,7);g.lineTo(-4,-3);g.closePath();
  g.fill();g.stroke();
  g.fillStyle=core||'#7FD1B9';
  g.beginPath();g.moveTo(0,-5);g.lineTo(2.6,-1.4);g.lineTo(0,2.2);g.lineTo(-2.6,-1.4);g.closePath();g.fill();
  g.restore();
}
function drawHero(){
  const c=$('#heroCv');
  if(!c||c.classList.contains('hidden'))return;
  const g=c.getContext('2d');
  const w=c.width,h=c.height,cx=w/2,cy=h*.44;
  g.clearRect(0,0,w,h);
  g.save();
  g.strokeStyle='rgba(255,209,102,.14)';g.lineWidth=1;
  g.beginPath();g.ellipse(cx,cy,w*.38,h*.20,0,0,TAU);g.stroke();
  g.strokeStyle='rgba(127,209,185,.12)';
  g.beginPath();g.ellipse(cx,cy,w*.42,h*.24,0,0,TAU);g.stroke();
  g.restore();
  for(let i=0;i<8;i++){
    const a=time*.22+i*TAU/8;
    const x=cx+Math.cos(a)*w*.38,y=cy+Math.sin(a)*h*.20;
    const D=BOSS_DEFS[BOSS_ORDER[i]];
    g.save();
    g.translate(x,y);g.rotate(a+time*.4);
    g.shadowColor=D.color;g.shadowBlur=10;
    g.globalAlpha=.6+Math.sin(time*3+i)*.15;
    g.strokeStyle=D.color;g.lineWidth=2;
    g.fillStyle='rgba(255,255,255,.04)';
    shapePath(g,D.shape,12);
    g.fill();g.stroke();
    g.restore();
  }
  for(let i=0;i<5;i++){
    const a=-time*.5+i*TAU/5;
    const x=cx+Math.cos(a)*w*.34,y=cy+Math.sin(a)*h*.18;
    g.save();g.translate(x,y);
    g.globalAlpha=.5;g.fillStyle='#FFD166';
    g.fillRect(-1,-1,2,2);
    g.restore();
  }
  g.textAlign='center';g.textBaseline='middle';
  const pulse=1+Math.sin(time*2)*.012;
  g.save();g.translate(cx,cy);g.scale(pulse,pulse);
  g.shadowColor='#FFD166';g.shadowBlur=16;
  g.font='700 58px "Chakra Petch",monospace';
  g.lineWidth=5;g.strokeStyle='rgba(255,209,102,.35)';
  g.strokeText('FRAGMENTA',0,0);
  g.fillStyle='#F2EFE6';
  g.fillText('FRAGMENTA',0,0);
  g.shadowBlur=0;
  g.font='500 12px "Chakra Petch",monospace';
  g.fillStyle='#8B93A1';
  g.fillText('· PURGA GEOMÉTRICA INFINITA ·',0,44);
  g.restore();
  g.save();g.translate(cx,cy+92);
  /* v4.12: la nave del héroe del menú luce tu aspecto equipado */
  {
    const sk=getSkin();
    const cc=sk.color==='prisma'?'hsl('+Math.floor((time*40)%360)+',85%,66%)':sk.color;
    const hc=sk.color==='prisma'?'#FFD166':(sk.color==='menta'?null:sk.color);
    drawShipIcon(g,1.4,cc,hc);
  }
  g.restore();
}
try{
  const im=new Image();
  im.onload=()=>{
    const hi=$('#heroImg');
    if(hi){hi.src='logo.png';hi.classList.remove('hidden');
      const hc=$('#heroCv');if(hc)hc.classList.add('hidden');}
  };
  im.src='logo.png';
}catch(e){}

/* ============ TARJETA DE RANKING ============ */
function drawRankCard(canvas,entry){
  const g=canvas.getContext('2d');
  const w=canvas.width,h=canvas.height;
  g.clearRect(0,0,w,h);
  g.fillStyle='#07090D';g.fillRect(0,0,w,h);
  g.strokeStyle='#232B36';g.strokeRect(.5,.5,w-1,h-1);
  const cx=w/2,cy=h*.36;
  for(let i=0;i<8;i++){
    const a=i*TAU/8+time*.3;
    const x=cx+Math.cos(a)*w*.38,y=cy+Math.sin(a)*h*.2;
    const D=BOSS_DEFS[BOSS_ORDER[i]];
    g.save();g.translate(x,y);g.rotate(a);
    g.globalAlpha=.7;g.strokeStyle=D.color;g.lineWidth=1.5;
    shapePath(g,D.shape,7);
    g.stroke();g.restore();
  }
  g.globalAlpha=1;
  g.textAlign='center';g.textBaseline='middle';
  g.font='700 30px "Chakra Petch",monospace';
  g.fillStyle='#F2EFE6';
  g.fillText('FRAGMENTA',cx,cy);
  g.font='500 9px "Chakra Petch",monospace';
  g.fillStyle='#8B93A1';
  g.fillText('DESAFÍO SEMANAL · SEM '+entry.seed,cx,cy+24);
  if(entry.code){
    g.font='700 26px "Chakra Petch",monospace';
    g.fillStyle='#64C7FF';
    g.fillText(entry.code,cx,h*.62);
    g.font='700 15px "Chakra Petch",monospace';
    g.fillStyle='#FFD166';
    g.fillText('OLEADA '+entry.wave,cx,h*.78);
    g.font='500 10px "Chakra Petch",monospace';
    g.fillStyle='#8B93A1';
    g.fillText('NAVE NV '+entry.ship+(entry.ok?' · ✓ VERIFICADO':' · ≈ SIN VERIFICAR'),cx,h*.88);
  }else{
    g.font='500 11px "Chakra Petch",monospace';
    g.fillStyle='#5C6572';
    g.fillText('JUEGA EL DESAFÍO SEMANAL',cx,h*.7);
  }
}

