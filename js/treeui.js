'use strict';
/* ============ árbol UI ============ */
/* v4.23: GATES POR MODO — los nodos con md exigen el récord de oleada
   en ESE modo (save.bestMode); sin md vale el récord global. */
const MD_NAME={solo:'SOLO',normal:'NORMAL',dificil:'DIFÍCIL',hardcore:'HARDCORE',coop:'CO-OP'};
const MD_SHORT={solo:'SOLO',normal:'NOR',dificil:'DIF',hardcore:'HDC',coop:'COOP'};
function bestWaveFor(nd){
  if(!nd.md)return save.best.lvl||0;
  if(!save.bestMode)save.bestMode={solo:0,normal:0,dificil:0,hardcore:0,coop:0};
  return save.bestMode[nd.md]||0;
}
function waveOkText(nd){
  if(!nd.wave||nd.wave<=1)return '';
  if(nd.md)return 'oleada '+nd.wave+' en '+MD_NAME[nd.md]+' (récord '+bestWaveFor(nd)+')';
  return 'oleada '+nd.wave+' (récord '+(save.best.lvl||0)+')';
}
function reqListOk(nd){
  if(nd.req){const ok=Array.isArray(nd.req)?nd.req.every(has):has(nd.req);if(!ok)return false;}
  if(nd.any&&!nd.any.some(has))return false;
  return true;
}
function reqText(nd){
  const parts=[];
  if(nd.req){const ids=Array.isArray(nd.req)?nd.req:[nd.req];
    parts.push(ids.map(id=>{const n=TREE.find(q=>q.id===id);return n?n.name:id;}).join(' + '));}
  if(nd.any)parts.push(nd.any.map(id=>{const n=TREE.find(q=>q.id===id);return n?n.name:id;}).join(' o '));
  return parts.join(' · ');
}
function nodeState(nd){
  const own=has(nd.id);
  const prevOk=reqListOk(nd);
  const waveOk=!nd.wave||nd.wave<=1||bestWaveFor(nd)>=nd.wave;
  const shipOk=save.bestShip>=(nd.ship||1);
  return{own,prevOk,waveOk,shipOk,dispo:!own&&prevOk&&waveOk&&shipOk};
}
function renderTree(){
  const svg=$('#treeSvg');let s='';
  for(const b in BR)if(BX[b]!=null)s+=`<text class="blbl" x="${BX[b]}" y="54">${BR[b]}</text>`;
  for(const nd of TREE){
    if(!nd.any)continue;
    for(const pid of nd.any){
      const pa=TREE.find(n=>n.id===pid);if(!pa)continue;
      s+=`<line x1="${pa.x}" y1="${pa.y+22}" x2="${nd.x}" y2="${nd.y-22}" class="lk mrglk ${has(nd.id)?'on':''}"/>`;
    }
  }
  for(const b in byBranch){
    for(const nd of byBranch[b]){
      if(!nd.next)continue;
      const nx=byBranch[b].find(n=>n.id===nd.next);
      s+=`<line x1="${nd.x}" y1="${nd.y+22}" x2="${nx.x}" y2="${nx.y-22}" class="lk ${has(nd.next)?'on':''}"/>`;
    }
    if(b==='ele')continue;
    const mains=byBranch[b].filter(n=>!n.s).sort((a,c)=>a.i-c.i);
    const last=mains[mains.length-1];
    for(const sk of['subA','subB','subC']){
      if(last[sk]){
        const nx=byBranch[b].find(n=>n.id===last[sk]);
        s+=`<line x1="${last.x}" y1="${last.y+22}" x2="${nx.x}" y2="${nx.y-22}" class="lk ${has(last[sk])?'on':''}"/>`;
      }
    }
  }
  for(const nd of TREE){
    const st=nodeState(nd);
    const cls=st.own?'own':(st.dispo?'dispo':'lock');
    s+=`<g class="nd ${cls}" data-id="${nd.id}">`;
    s+=`<circle cx="${nd.x}" cy="${nd.y}" r="19"/>`;
    s+=`<text x="${nd.x}" y="${nd.y+4}" font-size="9">${nd.tag}</text>`;
    if(!st.own&&(!st.waveOk||!st.shipOk))
      s+=`<text class="reqtxt" x="${nd.x}" y="${nd.y+31}">OL ${nd.wave}${nd.md?' '+MD_SHORT[nd.md]:''}${nd.ship?' · NV '+nd.ship:''}</text>`;
    s+=`</g>`;
  }
  svg.innerHTML=s;
  svg.querySelectorAll('.nd').forEach(el=>el.addEventListener('click',()=>selectNode(el.dataset.id)));
}
function selectNode(id){
  selNode=id?TREE.find(n=>n.id===id):null;
  document.querySelectorAll('#treeSvg .nd').forEach(el=>el.classList.toggle('sel',el.dataset.id===id));
  const nm=$('#ndName'),mt=$('#ndMeta'),ds=$('#ndDesc'),cs=$('#ndCost'),bb=$('#btnBuy');
  bb.textContent='DESBLOQUEAR';
  if(!selNode){
    nm.textContent='ÁRBOL DE HABILIDADES';
    mt.textContent=`${TREE.length} MEJORAS · ${Object.keys(BX).length} RAMAS · ${ownedCount()} ADQUIRIDAS`;
    ds.textContent='Toca un nodo y pulsa DESBLOQUEAR. Los nodos medios y altos piden llegar a una OLEADA en un MODO concreto (NOR=normal · DIF=difícil · HDC=hardcore): para completar el arsenal hay que jugarlos todos. Los nodos de FUSIÓN (línea punteada) se alcanzan por cualquiera de sus dos ramas. Pellizca o usa +/− para hacer zoom. Perfil LOCAL y ONLINE independientes.';
    cs.innerHTML='';bb.disabled=true;return;
  }
  nm.textContent=selNode.name;
  mt.textContent=BR[selNode.b]+(selNode.s?' · SUB-RAMA '+selNode.s:'')+' · OLEADA '+selNode.wave+(selNode.md?' EN '+MD_NAME[selNode.md]:'')+(selNode.ship?' · NAVE NV '+selNode.ship:'');
  ds.textContent=selNode.desc;
  const st=nodeState(selNode);
  if(st.own){cs.innerHTML='<span class="cs">ADQUIRIDO</span>';bb.disabled=true;}
  else if(!st.prevOk){
    cs.innerHTML=`<span class="cs">Requiere: ${reqText(selNode)}</span>`;bb.disabled=true;
  }else if(!st.waveOk||!st.shipOk){
    const partsF=[];
    if(!st.waveOk)partsF.push(waveOkText(selNode));
    if(!st.shipOk)partsF.push(`nave nv ${selNode.ship} (récord ${save.bestShip})`);
    cs.innerHTML=`<span class="cs nok">Falta: ${partsF.join(' · ')}</span>`;
    bb.disabled=true;
  }else{
    cs.innerHTML=`<span class="cs ${canPay(selNode.cost)?'':'nok'}">${costHTML(selNode.cost)}</span>`;
    bb.disabled=!canPay(selNode.cost);
  }
}
function buyNode(){
  if(!selNode)return;
  const st=nodeState(selNode);
  if(st.own||!st.dispo||!canPay(selNode.cost))return;
  pay(selNode.cost);save.tree[selNode.id]=1;SFX.buy();vib(30);
  checkAch();
  recompute();persist();
  if(net.mode==='client')sendMsg({t:'stats',b:computeStatblock()});
  renderTree();selectNode(selNode.id);updateShopRes();
}
/* ============ v4.24: COMPRA MASIVA ============
   Un botón que desbloquea EN CADENA todas las mejoras disponibles
   (padres + oleada/modo + nave) siempre que el bolsillo aguante:
   oro Y gemas. Va comprando siempre el nodo MÁS BARATO primero para
   estirar el dinero y dejar el máximo de nodos propios. */
function buyAll(){
  let n=0,gold=0,gems=0,guard=0;
  while(guard++<400){
    let best=null;
    for(const nd of TREE){
      if(has(nd.id))continue;
      const st=nodeState(nd);
      if(!st.dispo||!canPay(nd.cost))continue;
      const g=nd.cost.gold||0,j=(nd.cost.gems||0)*300; /* 1 gema ≈ 300 oro de valor */
      const bg=best?(best.cost.gold||0)+((best.cost.gems||0)*300):1e18;
      if(g+j<bg)best=nd;
    }
    if(!best)break;
    pay(best.cost);gold+=best.cost.gold||0;gems+=best.cost.gems||0;
    save.tree[best.id]=1;n++;
  }
  selectNode(null);
  if(n){
    SFX.buy();vib(40);
    checkAch();recompute();persist();
    if(net.mode==='client')sendMsg({t:'stats',b:computeStatblock()});
    $('#ndName').textContent='⇉ COMPRA MASIVA COMPLETADA';
    $('#ndMeta').textContent=n+' mejoras desbloqueadas de una sola vez';
    $('#ndDesc').textContent='Gasto total: '+gold+' de oro y '+gems+' gemas. El arsenal queda al día con tu bolsillo: lo que no se pudo pagar seguirá disponible aquí en cuanto tengas fondos.';
  }else{
    const abiertos=TREE.filter(nd=>!has(nd.id)&&nodeState(nd).dispo).length;
    $('#ndName').textContent='NADA COMPRABLE AHORA';
    $('#ndMeta').textContent=abiertos?(abiertos+' nodos disponibles · sin fondos suficientes'):'sin nodos disponibles todavía';
    $('#ndDesc').textContent=abiertos
      ?'Hay '+abiertos+' mejora(s) desbloqueada(s) pero no alcanzan el oro o las gemas para la más barata. Gana en partida, usa el CAMBIO de oro→gemas o visita al Mercader Pirata.'
      :'Los nodos que faltan siguen cerrados por oleada/modo o nivel de nave: primero hay que ganarse el acceso jugando esos modos.';
  }
  renderTree();updateShopRes();
}
function updateShopRes(){
  $('#shopGold').textContent=save.gold;$('#shopGems').textContent=save.gems;
  /* v4.24: el botón de COMPRA MASIVA se enciende solo si hay algo
     disponible Y pagadero (evita toques en balde) */
  const ba=$('#btnBuyAll');
  if(ba)ba.disabled=!TREE.some(nd=>!has(nd.id)&&nodeState(nd).dispo&&canPay(nd.cost));
  /* v4.9: mercado de gemas — el oro sigue sirviendo al final del juego
     v4.20: ESCALERA — la primera compra 1500, luego 1750, 2000… (+250) */
  const gx=$('#btnGemX');
  if(gx){const pr=gemXPrice();
    const lab=`CAMBIO · ${pr} ORO → ${GEMX_GEMS} GEMAS`+((save.gemxBuys||0)>0?` (Nº ${save.gemxBuys+1})`:'');
    gx.disabled=save.gold<pr;
    gx.textContent=save.gold>=pr?lab:lab+' · ORO INSUFICIENTE';
    gx.title=(save.gemxBuys||0)>0?'La próxima compra costará '+(pr+GEMX_STEP)+' de oro':'';}
  const prof=saveProfile==='local'?'PERFIL LOCAL':'PERFIL ONLINE';
  $('#shopHint').innerHTML=`<span class="prof">${prof}</span> · ${ownedCount()}/${TREE.length} · ${Object.keys(BX).length} RAMAS · v${VERSION}`;
}
function openShop(from){
  shopReturn=from;
  renderTree();updateShopRes();selectNode(null);
  $('#profBox').classList.add('hidden');$('#profMsg').textContent='';
  showScr('shop');
}

/* ============ zoom del arsenal ============ */
const TREE_W=1420, TREE_H=1420; /* v4.13: +90 px por la rama DEFINITIVA */
let treeZoom=1;
function applyZoom(){
  const svg=$('#treeSvg');if(!svg)return;
  svg.style.width=Math.round(TREE_W*treeZoom)+'px';
  svg.style.height=Math.round(TREE_H*treeZoom)+'px';
  const pct=$('#zPct');if(pct)pct.textContent=Math.round(treeZoom*100)+'%';
}
function setZoom(z){treeZoom=clamp(Math.round(z*20)/20,.3,2.4);applyZoom();}
function fitZoom(){setZoom(clamp((window.innerWidth-24)/TREE_W,.3,1));
  const svg=$('#treeSvg');if(svg&&svg.parentElement)svg.parentElement.scrollLeft=0;}
bindEl('#zIn', 'click',()=>setZoom(treeZoom+.15));
bindEl('#zOut', 'click',()=>setZoom(treeZoom-.15));
bindEl('#zFit', 'click',fitZoom);
(function(){
  const tw=$('.tree-wrap');if(!tw)return;
  const zp=new Map();let pinch=null;
  tw.addEventListener('pointerdown',e=>{zp.set(e.pointerId,{x:e.clientX,y:e.clientY});});
  tw.addEventListener('pointermove',e=>{
    if(!zp.has(e.pointerId))return;
    zp.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(zp.size===2){
      const pts=[...zp.values()];
      const d=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      if(pinch&&pinch.d>0&&d>0)setZoom(pinch.z*d/pinch.d);
      pinch={d,z:treeZoom};
      e.preventDefault();
    }
  },{passive:false});
  const endP=e=>{zp.delete(e.pointerId);if(zp.size<2)pinch=null;};
  tw.addEventListener('pointerup',endP);tw.addEventListener('pointercancel',endP);
})();
window.addEventListener('resize',()=>{if($('#scrShop').classList.contains('show'))fitZoom();});
fitZoom();

