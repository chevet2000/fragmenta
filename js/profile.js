'use strict';
/* ============ perfiles ============ */
const KEY_LOCAL='fragmenta_v3', KEY_OLD='fragmenta_v2', KEY_NET='fragmenta_v3_net', VERSION='4.8';
function blankSave(){return{gold:0,gems:0,tree:{},best:{lvl:0,kills:0},bestShip:1,bestAll:0,totKills:0,runs:0,prest:0,diff:'solo',
  ach:{},totElite:0,totRescue:0,totChest:0,totCamp:0,bestHard:0,bossKills:{},weekly:null,weekBestAll:0,mus:true,
  pilot:null,ranking:[],mShots:0,mHits:0,mDmg:0,mTaken:0,mPerfect:0};}
function loadSave(key,migrate){
  try{
    const d=JSON.parse(localStorage.getItem(key));
    if(d)return Object.assign(blankSave(),d);
    if(migrate){
      const o=JSON.parse(localStorage.getItem(KEY_OLD));
      if(o){const s=blankSave();s.gold=o.gold||0;s.gems=o.gems||0;s.tree=o.tree||{};
        s.best=o.best||{lvl:0,kills:0};s.totKills=o.totKills||0;s.runs=o.runs||0;
        s.bestAll=(o.best&&o.best.lvl)||0;return s;}
    }
  }catch(e){}
  return blankSave();
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

/* ============ PILOTO Y RANKING ============ */
function getPilot(){
  if(!save.pilot){
    const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let c='';for(let i=0;i<4;i++)c+=A[irand(0,A.length-1)];
    save.pilot=c;persist();
  }
  return save.pilot;
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
  if(!seed||!/^J?[A-Z0-9]{4}$/.test(code)||!(wave>0&&wave<1000)||!(ship>0&&ship<100))return null;
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
function sanitizeRankEntry(e){
  if(!e||typeof e!=='object')return null;
  const seed=String(e.seed||''),code=String(e.code||'').toUpperCase(),h=String(e.h||'').toUpperCase();
  const wave=parseInt(e.wave,10),ship=parseInt(e.ship,10);
  if(!/^\d{4}W\d{1,2}$/.test(seed))return null;
  if(!/^[A-Z0-9]{4}$/.test(code))return null;
  if(!(wave>0&&wave<1000)||!(ship>0&&ship<100))return null;
  if(!/^[0-9A-F]{4}$/.test(h))return null;
  if(weekHash(seed,code,wave,ship)!==h)return null;
  return{seed,code,wave,ship,h,ok:true};
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
    else if(e.wave>ex.wave){ex.wave=e.wave;ex.ship=e.ship;ex.h=e.h;ex.ok=true;n++;}
  }
  if(save.ranking.length>60)save.ranking=save.ranking.slice(-60);
  if(n)persist();
  return n;
}

/* ============ EXPORTAR / IMPORTAR PERFIL ============ */
function exportProfile(){
  let bits='';
  for(const nd of TREE)bits+=has(nd.id)?'1':'0';
  let v=0n;
  for(const ch of bits)v=v*2n+(ch==='1'?1n:0n);
  const treeB=v.toString(36);
  return 'FRGT1|'+save.gold+'|'+save.gems+'|'+save.bestAll+'|'+save.bestShip+'|'+
    save.prest+'|'+save.totKills+'|'+(save.bestHard||0)+'|'+treeB;
}
function importProfile(str){
  const p=String(str||'').trim().split('|');
  if(p.length!==9||p[0]!=='FRGT1')return 'Formato no válido.';
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
  persist();
  return null;
}

