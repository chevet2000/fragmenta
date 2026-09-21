'use strict';
/* ============ v4.23: EL MERCADER PIRATA GALÁCTICO ============
   No es un botón más del grid: es un NPC en el menú. Un barco pirata
   con la lengua afilada de un mercader que susurra ofertas del mercado
   negro. Sus cofres se pagan con ORO Y GEMAS y van directos a LA
   BÓVEDA: se abren con la misma CERRADURA DE PULSOS y sueltan
   MEJORAS ARMADAS (duran hasta que mueres).
   · Siempre contienen botín — el riesgo es el precio y la cerradura.
   · OFERTA DEL DÍA: un cofre distinto cada día con −40%.
   · PRECIO DINÁMICO: cada compra del mismo cofre HOY encarece +10%
     el siguiente. Mañana vuelve al precio base. */
const MERC_LINES=[
 'Psst, piloto… cofres sin aduana. Nadie pregunta de dónde vienen.',
 'Lo de la Bóveda es oficial. Lo mío es… flexible.',
 'Pago en oro y gemas. La suerte va incluida en el precio.',
 'Si la cerradura cede, no es robo: es el mercado negro cobrándote experiencia.',
 'Hoy traje mercancía buena. No mires tanto y decide.',
 'El Kraken guardaba esto. Él ya no lo necesita.',
 'Compras muchas veces el mismo cofre y el precio sube. Reglas del gremio.',
 'Cada día escondo una oferta distinta. El azar y yo somos socios.',
 'Las MEJORAS ARMADAS de mis cofres duran hasta que caigas. Como todo aquí.',
];
function drawMercIcon(c){
  if(!c)return;
  const g=c.getContext('2d');
  const w=c.width,h=c.height;
  g.clearRect(0,0,w,h);
  g.save();g.translate(w/2,h/2);
  /* aura del mercado negro */
  const ag=g.createRadialGradient(0,0,4,0,0,26);
  ag.addColorStop(0,'rgba(255,209,102,.16)');ag.addColorStop(1,'rgba(179,136,255,0)');
  g.fillStyle=ag;g.fillRect(-28,-28,56,56);
  /* agua */
  g.strokeStyle='rgba(100,199,255,.4)';g.lineWidth=1.4;
  for(let r2=0;r2<2;r2++){
    g.beginPath();
    for(let x=-22;x<=22;x+=4){
      const y=15+r2*4+Math.sin((x+r2*7)*.55)*1.6;
      if(x===-22)g.moveTo(x,y);else g.lineTo(x,y);
    }
    g.stroke();
  }
  /* casco */
  g.beginPath();
  g.moveTo(-21,7);g.lineTo(21,7);g.lineTo(13,14);g.lineTo(-13,14);g.closePath();
  g.fillStyle='#4A3B5C';g.fill();g.strokeStyle='#FFD166';g.lineWidth=1.4;g.stroke();
  /* franja del casco */
  g.fillStyle='#FFD166';g.fillRect(-21,7,42,2);
  /* mástil */
  g.fillStyle='#C8CFD8';g.fillRect(-1.2,-15,2.4,22);
  /* vela */
  g.beginPath();
  g.moveTo(-1,-13);g.quadraticCurveTo(15,-11,13,3);g.lineTo(-1,3);g.closePath();
  g.fillStyle='rgba(242,239,230,.92)';g.fill();
  g.strokeStyle='rgba(242,239,230,.55)';g.lineWidth=1;g.stroke();
  /* calavera en la vela */
  g.fillStyle='#07090D';g.beginPath();g.arc(5.4,-5,2.6,0,TAU);g.fill();
  g.fillStyle='#F2EFE6';g.fillRect(4.3,-6,.9,1.1);g.fillRect(6,-6,.9,1.1);
  g.strokeStyle='#07090D';g.lineWidth=1;
  g.beginPath();g.moveTo(3,-1.6);g.lineTo(8,-1.6);g.moveTo(5.4,-2.6);g.lineTo(5.4,-.6);g.stroke();
  /* banderín pirata */
  g.beginPath();g.moveTo(-1,-15);g.lineTo(-9,-12.4);g.lineTo(-1,-10.5);g.closePath();
  g.fillStyle='#FF6B6B';g.fill();
  g.restore();
}
const MERC_DEAL_TXT=t=>'OFERTA DEL DÍA −40%';
function refreshMerc(){
  const el=$('#mercLine');if(!el)return;
  const line=MERC_LINES[Math.abs(hashStr('FRGML-'+daySeed()))%MERC_LINES.length];
  const deal=MERC_TIERS.find(t=>t.id===mercDealId());
  const buys=deal?mercBuyCount(deal.id):0;
  const pr=deal?mercPrice(deal):null;
  el.innerHTML='“'+line+'”'+(deal&&pr?
    ' <span style="color:#FFD166">HOY: '+deal.name+' por '+pr.gold+' ORO'+(pr.gems?' + '+pr.gems+' GEMAS':'')+
    (buys?' · ya ×'+buys:'')+'</span>':'');
}
function openMerc(){
  const full=vaultCount()>=VCAP;
  $('#mercRes').innerHTML=
    '<span>'+icoGold+' '+save.gold+'</span><span>'+icoGem+' '+save.gems+'</span>'+
    '<small>'+vaultCount()+'/'+VCAP+' EN LA BÓVEDA · EL BOTÍN SE ABRE CON LA CERRADURA DE PULSOS</small>';
  const box=$('#mercList');box.innerHTML='';
  for(const t of MERC_TIERS){
    const pr=mercPrice(t);
    const buys=mercBuyCount(t.id);
    const payOk=save.gold>=pr.gold&&save.gems>=pr.gems;
    const can=!full&&payOk;
    const el=document.createElement('button');
    el.className='mtier'+(can?'':' no');
    el.style.borderColor=RAR_COL[t.rar];
    el.disabled=!can;
    el.innerHTML=
      '<div class="mt-skull" style="color:'+RAR_COL[t.rar]+'">'+(t.rar==='l'?'★':t.rar==='e'?'◆':'●')+'</div>'+
      '<div class="mt-info"><b style="color:'+RAR_COL[t.rar]+'">☠ '+t.name+(pr.deal?' · '+MERC_DEAL_TXT(t):'')+'</b>'+
      '<small>'+t.sub+'</small>'+
      '<small>'+(buys?('COMPRADO ×'+buys+' HOY · la próxima +10%'):(pr.deal?'Precio rebajado · hoy −40%':'Precio base · sube +10% por compra de hoy'))+'</small></div>'+
      '<div class="mt-pay">'+icoGold+' '+pr.gold+(pr.gems?'<br>'+icoGem+' '+pr.gems:'')+
      '<em>'+(full?'BÓVEDA LLENA':can?'COMPRAR':(save.gold<pr.gold?'FALTA ORO':'FALTAN GEMAS'))+'</em></div>';
    el.addEventListener('click',()=>buyMerc(t));
    box.appendChild(el);
  }
  showScr('merc');
}
function buyMerc(t){
  const full=vaultCount()>=VCAP;
  if(full){banner('BÓVEDA LLENA','Abre o vacía cofres antes de comprar');SFX.hurt();return;}
  const pr=mercPrice(t);
  if(save.gold<pr.gold||save.gems<pr.gems){SFX.hurt();vib(60);openMerc();return;}
  save.gold-=pr.gold;
  save.gems-=pr.gems;
  addVault(t.rar);
  save.totMerc=(save.totMerc||0)+1;
  if(!save.merc||save.merc.d!==daySeed()||typeof save.merc.buys!=='object')save.merc={d:daySeed(),buys:{}};
  save.merc.buys[t.id]=(save.merc.buys[t.id]||0)+1;
  checkAch();persist();
  SFX.buy();vib(40);
  banner('MERCADER PIRATA',t.name+' en la BÓVEDA · ábrelo con la cerradura de pulsos');
  openMerc();refreshMenu();
}
/* ---- enlaces de la interfaz ---- */
bindEl('#npcMerc','click',()=>{audio();openMerc();});
bindEl('#btnMercBack','click',()=>{audio();refreshMenu();showScr('menu');});
bindEl('#btnMercBoveda','click',()=>{audio();openVault();});
drawMercIcon($('#mercCv'));
