'use strict';
/* ============ perfiles ============ */
const KEY_LOCAL='fragmenta_v3', KEY_OLD='fragmenta_v2', KEY_NET='fragmenta_v3_net', VERSION='4.16';
function blankSave(){return{gold:0,gems:0,tree:{},best:{lvl:0,kills:0},bestShip:1,bestAll:0,totKills:0,runs:0,prest:0,diff:'solo',
  ach:{},achClaimed:{},totElite:0,totRescue:0,totChest:0,totCamp:0,bestHard:0,bossKills:{},weekly:null,weekBestAll:0,mus:true,frenzy:{bestT:0,bestK:0},
  pilot:null,ranking:[],mShots:0,mHits:0,mDmg:0,mTaken:0,mPerfect:0,
  /* v4.12: reto diario, misiones diarias, hangar, combos, estadísticas y bestiario */
  daily:{seed:null,best:0},dailyBest:0,dailyM:null,skins:{owned:['menta'],eq:null},
  bestCombo:0,totGold:0,totGems:0,seen:{},
  /* v4.14: fantasma del ranking, devorados por el agujero negro y biomas visitados */
  ghost:null,totDevour:0,biomesSeen:{},ghostBeat:false};}
function loadSave(key,migrate){
  try{
    const d=JSON.parse(localStorage.getItem(key));
    if(d){const s=Object.assign(blankSave(),d);migrateAch(s);return s;}
    if(migrate){
      const o=JSON.parse(localStorage.getItem(KEY_OLD));
      if(o){const s=blankSave();s.gold=o.gold||0;s.gems=o.gems||0;s.tree=o.tree||{};
        s.best=o.best||{lvl:0,kills:0};s.totKills=o.totKills||0;s.runs=o.runs||0;
        s.bestAll=(o.best&&o.best.lvl)||0;return s;}
    }
  }catch(e){}
  return blankSave();
}
/* v4.15: LOGROS POR RECLAMAR — los logros que ya estaban concedidos en
   versiones anteriores se marcan como reclamados (su gema ya se pagó);
   solo los NUEVOS quedan pendientes de reclamar. */
function migrateAch(s){
  if(!s.achClaimed||typeof s.achClaimed!=='object')s.achClaimed={};
  for(const k in s.ach)if(!s.achClaimed[k])s.achClaimed[k]=1;
}
let localSave=loadSave(KEY_LOCAL,true);
let netSave=loadSave(KEY_NET,false);
let save=localSave;
let saveProfile='local';
function useProfile(p){
  if(saveProfile===p)return;
  saveProfile=p;
  save=(p==='local')?localSave:netSave;
}
function persist(){
  try{localStorage.setItem(saveProfile==='local'?KEY_LOCAL:KEY_NET,JSON.stringify(save));}catch(e){}
}
const has=id=>!!save.tree[id];

/* ============ v4.12: HANGAR — aspecto equipado ============ */
function getSkin(){
  const eq=(save.skins&&save.skins.eq)||'menta';
  return SKINS.find(s=>s.id===eq)||SKINS[0];
}

/* ============ PILOTO Y RANKING ============ */
function getPilot(){
  if(!save.pilot){
    const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c='';for(let i=0;i<4;i++)c+=A[irand(0,A.length-1)];
    save.pilot=c;persist();
  }
  return save.pilot;
}
/* v4.11: NOMBRE DE PILOTO personalizado — el usuario elige su nombre y ese
   nombre aparece en el ranking (local y sincronizado) y en el lobby co-op.
   Charset seguro (sin < > & . | para no romper códigos ni HTML), 2–12. */
const NAME_RE=/[^A-Z0-9ÁÉÍÓÚÜÑ _-]/g;
function normalizeName(s){
  let n=String(s||'').toUpperCase().replace(/\s+/g,' ').replace(NAME_RE,'').trim();
  if(n.length<2||n.length>12)return null;
  return n;
}
function setPilot(raw){
  const n=normalizeName(raw);
  if(!n)return 'Nombre no válido: 2–12 (letras, números, espacio, _ -)';
  const old=getPilot();
  if(n===old)return null;
  save.pilot=n;
  /* los récords propios de TODAS las semanas viajan al nombre nuevo
     (re-firmando su hash local, que es legítimo: son tus propios datos) */
  for(const r of (save.ranking||[])){
    if(r.code===old){r.code=n;r.h=weekHash(r.seed,n,r.wave,r.ship);r.ok=true;}
  }
  persist();
  return null;
}
function weekHash(seed,code,wave,ship){
  const h=hashStr('FRG8|'+seed+'|'+code+'|'+wave+'|'+ship);
  return h.toString(16).toUpperCase().padStart(8,'0').slice(0,4);
}
function makeRecordString(seed,code,wave,ship){
  return 'FRG9.'+seed+'.'+code+'.'+wave+'.'+ship+'.'+weekHash(seed,code,wave,ship);
}
function parseRecordString(s){
  const p=String(s||'').trim().split('.');
  if(p.length!==6||p[0]!=='FRG9')return null;
  const seed=p[1],code=p[2].toUpperCase();
  const wave=parseInt(p[3],10),ship=parseInt(p[4],10);
  /* v4.11: acepta nombres personalizados (el punto no está permitido en el nombre) */
  if(!seed||!/^J?[A-Z0-9ÁÉÍÓÚÜÑ _-]{2,12}$/.test(code)||!(wave>0&&wave<1000)||!(ship>0&&ship<100))return null;
  return{seed,code,wave,ship,h:p[5].toUpperCase(),
    ok:weekHash(seed,code,wave,ship)===p[5].toUpperCase()};
}
function addRankingEntry(entry){
  if(!save.ranking)save.ranking=[];
  const ex=save.ranking.find(r=>r.seed===entry.seed&&r.code===entry.code);
  if(ex){
    if(entry.wave>ex.wave){ex.wave=entry.wave;ex.ship=entry.ship;ex.h=entry.h;ex.ok=entry.ok;}
  }else save.ranking.push(entry);
  if(save.ranking.length>60)save.ranking=save.ranking.slice(-60);
  persist();
}
function sortedRanking(){
  return [...(save.ranking||[])].sort((a,b)=>
    b.wave-a.wave||b.ship-a.ship||a.code.localeCompare(b.code));
}
/* v4.14: FANTASMA del ranking — devuelve una función ref(t) con las bajas
   que llevaba tu MEJOR carrera frenética en el segundo t (traza cada 4 s). */
function makeGhostRef(trail){
  return t=>{let k=0;for(const s of trail){if(s.t<=t)k=s.k;else break;}return k;};
}
/* ============ v4.15: MODOS DEL RANKING ============
   Cada registro lleva su modo: nm normal · dc difícil · hc hardcore ·
   mp multijugador · wk semanal · fz frenético · dy diario.
   Los modos fijos usan semilla permanente (NM/DC/HC/MP/FZ/DY) y se
   deduplican por piloto conservando la mejor oleada. */
const RANK_SEEDS={NM:'nm',DC:'dc',HC:'hc',MP:'mp',FZ:'fz',DY:'dy'};
const RANK_MODE_LABEL={nm:'NORMAL',dc:'DIFÍCIL',hc:'HARDCORE',mp:'MULTI',wk:'SEMANAL',fz:'FRENÉTICO',dy:'DIARIO'};
function modeOfEntry(r){
  if(r&&RANK_MODE_LABEL[r.m])return r.m;
  return RANK_SEEDS[r.seed]||'wk';
}
function addModeRecord(m,seed,wave,ship,sub){
  const pilot=getPilot();
  addRankingEntry({seed,code:pilot,wave,ship,sub,m,h:weekHash(seed,pilot,wave,ship),ok:true});
}
function sanitizeRankEntry(e){
  if(!e||typeof e!=='object')return null;
  const seed=String(e.seed||''),code=String(e.code||'').toUpperCase(),h=String(e.h||'').toUpperCase();
  const wave=parseInt(e.wave,10),ship=parseInt(e.ship,10);
  /* v4.15: semilla semanal (YYYYWn) o semilla permanente de modo (NM/DC/…) */
  if(!/^\d{4}W\d{1,2}$/.test(seed)&&!RANK_SEEDS[seed])return null;
  /* v4.11: admite códigos de 4 letras Y nombres personalizados (2–12 seguro) */
  if(!/^[A-Z0-9ÁÉÍÓÚÜÑ _-]{2,12}$/.test(code))return null;
  if(!(wave>0&&wave<1000)||!(ship>0&&ship<100))return null;
  if(!/^[0-9A-F]{4}$/.test(h))return null;
  if(weekHash(seed,code,wave,ship)!==h)return null;
  const m=modeOfEntry(e);
  /* sub: dato extra corto y saneado (p. ej. bajas del frenético) */
  const sub=e.sub?String(e.sub).replace(/[^A-Z0-9]/gi,'').slice(0,8):undefined;
  return{seed,code,wave,ship,h,ok:true,m,sub};
}
function mergeRanking(list){
  if(!Array.isArray(list))return 0;
  if(!save.ranking)save.ranking=[];
  const had={};for(const r of save.ranking)had[r.seed+'|'+r.code]=r;
  let n=0;
  for(const raw of list){
    const e=sanitizeRankEntry(raw);if(!e)continue;
    const key=e.seed+'|'+e.code,ex=had[key];
    if(!ex){save.ranking.push(e);had[key]=e;n++;}
    else if(e.wave>ex.wave){ex.wave=e.wave;ex.ship=e.ship;ex.h=e.h;ex.ok=true;ex.m=e.m;if(e.sub)ex.sub=e.sub;n++;}
  }
  if(save.ranking.length>60)save.ranking=save.ranking.slice(-60);
  if(n)persist();
  return n;
}

/* ============ EXPORTAR / IMPORTAR PERFIL ============ */
/* v4.11: FRGT2 añade el nombre de piloto (FRGT1 antiguo sigue funcionando) */
function exportProfile(){
  let bits='';
  for(const nd of TREE)bits+=has(nd.id)?'1':'0';
  let v=0n;
  for(const ch of bits)v=v*2n+(ch==='1'?1n:0n);
  const treeB=v.toString(36);
  return 'FRGT2|'+save.gold+'|'+save.gems+'|'+save.bestAll+'|'+save.bestShip+'|'+
    save.prest+'|'+save.totKills+'|'+(save.bestHard||0)+'|'+treeB+'|'+getPilot();
}
function importProfile(str){
  const p=String(str||'').trim().split('|');
  const is2=p[0]==='FRGT2';
  if(p.length!==(is2?10:9)||(p[0]!=='FRGT1'&&p[0]!=='FRGT2'))return 'Formato no válido.';
  const gold=parseInt(p[1],10),gems=parseInt(p[2],10),bestAll=parseInt(p[3],10),
    bestShip=parseInt(p[4],10),prest=parseInt(p[5],10),totKills=parseInt(p[6],10),
    bestHard=parseInt(p[7],10);
  if([gold,gems,bestAll,bestShip,prest,totKills,bestHard].some(n=>isNaN(n)||n<0))
    return 'Datos corruptos.';
  const treeB=p[8];
  if(!/^[0-9a-z]+$/i.test(treeB))return 'Árbol corrupto.';
  let v=0n;
  for(const ch of treeB.toLowerCase()){
    const d='0123456789abcdefghijklmnopqrstuvwxyz'.indexOf(ch);
    if(d<0)return 'Árbol corrupto.';
    v=v*36n+BigInt(d);
  }
  let bits=v.toString(2);
  if(bits.length>TREE.length)return 'Árbol corrupto.';
  bits=bits.padStart(TREE.length,'0');
  save.gold=gold;save.gems=gems;save.bestAll=bestAll;save.bestShip=bestShip;
  save.prest=prest;save.totKills=totKills;save.bestHard=bestHard;
  save.tree={};
  TREE.forEach((nd,i)=>{if(bits[bits.length-1-i]==='1')save.tree[nd.id]=1;});
  if(is2){const n=normalizeName(p[9]);if(n)save.pilot=n;}
  persist();
  return null;
}

