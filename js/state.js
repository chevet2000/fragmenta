'use strict';
/* ============ estado global ============ */
let state='menu',runActive=false,shopReturn='menu',lastWaveType='';
const run={level:1,kills:0,eliteKills:0,time:0,goldRun:0,gemsRun:0,buffs:[[],[]],relics:[],
  shipLv:1,exp:0,missions:[],combo:0,tempBuffs:[],
  /* v4.12: COMBOS — racha de bajas (comboN) y su cuenta atrás (comboT) */
  comboN:0,comboT:0,
  stShots:0,stHits:0,stDmg:0,stTaken:0,stPerfect:0,bossDmgTaken:false,
  /* v4.14: FANTASMA del ranking — trazas de la mejor partida frenética */
  ghostTrail:[],ghostAcc:0,ghostPassed:false,ghostRef:null,
  /* v4.17: LAS MALDICIONES del HECHICERO — cada una afecta solo una cosa */
  curses:[],
  /* v4.18: ¿se batió el récord de combo en esta incursión? */
  newComboRec:false,
  /* v4.28: DESPLIEGUE — las mejoras armadas que el piloto marcó para ESTA
     incursión (salieron de save.armed al confirmar el despliegue; mueren
     con la nave). Las NO marcadas se quedan en save.armed y sobreviven. */
  armedTaken:null};
/* v4.18: DOPAMINA — hit-stop (micro cámara lenta al matar) y OLEADA DORADA */
let hitStopT=0;
let goldenWave=false,lastGolden=-9;
/* v4.20: DIMENSIÓN ANÓMALA — la oleada siguiente al abrir el PORTAL MISTERIOSO */
let anomalyWave=false;
let pendingShipLevels=0,frenzyT=0,shipwaitT=0,chestwaitT=0,chestSlot=0;
let dailyMode=false; /* v4.12: reto diario */
let enemies=[],bullets=[],ebullets=[],parts=[],pickups=[],floats=[],rings=[],beams=[],ultBeams=[]; /* v4.13: ultBeams = rayos del Aniquilador */
let holes=[]; /* v4.14: agujeros negros de la 2ª definitiva */
let meteors=[],meteorT=rand(16,30),meteorWarned=false; /* v4.19: meteoritos dorados que cruzan la pantalla */
/* v4.20: CUBOS SORPRESA (shield → purga de enemigos o nave amiga),
   PORTAL MISTERIOSO (evento raro) y NAVES AMIGAS temporales */
let cubeT=rand(8,13);
let portals=[],portalT=rand(40,75),portalWarned=false;
let allies=[];
let wrecks=[];
let emosFx=[];
let bots=[]; /* v4.9: aliados bot de combate */
let frenzyMode=false; /* v4.9: modo frenético */
let dronePos={'0':[],'1':[]},droneCd={'0':[],'1':[]};
let boss=null,bossName='';
let formY=0,formT=0,time=0,shake=0,eid=1,fxId=1;
/* v4.28: ESTABILIDAD — todo temblor AMBIENTAL (bajas, explosiones, meteoritos,
   eventos y detonaciones propias) pasa por addQuake/selfQuake, así la rama
   ESTABILIDAD del arsenal lo apaga de forma centralizada. El daño recibido,
   tu muerte y el Guardián sacuden por fuera: feedback sagrado de v4.22. */
let quakeMul=1,quakeDecay=1,noQuake=false,noSelfQuake=false,noCritShake=false,noHurtShake=false;
function addQuake(v,cap){ if(!noQuake)shake=Math.min(cap||14,shake+v*quakeMul); }
function selfQuake(v,cap){ if(!noSelfQuake)shake=Math.min(cap||14,shake+v*quakeMul); }
let waveState='idle',clearTimer=0;
let wave={type:'form',types:[],pending:0,total:0,wasBoss:false,snakes:[],spawnT:0,side:1,pool:[]};
let bannerT=0,bannerTxt='',bannerSub='';const BANNER_LIFE=1.9;
let curPicks=[],selNode=null,curRelics=[],relicChosen=false,ascConfirm=false;
let lastWeeklyRec=null;
let freeNovaGiven=false;

function mkPlayer(slot){return{
  /* v4.10: daño base 10 (dispara 5–15 con variación) y 8% de crítico */
  slot,x:0,y:0,hp:4,maxHp:4,dmg:10,fireRate:3,bullets:1,files:1,speed:1,pierce:0,crit:.08,magnet:1,
  regenRate:0,nova:null,slow:1,goldMul:1,expMul:1,goldRate:0,aura:false,emergency:false,field:false,
  bounce:0,overdrive:false,drones:0,orbs:0,shield:false,shieldFast:false,phoenixCharges:0,
  vamp:false,frenzy:false,execute:false,presa:false,reflect:false,venge:false,secondWind:false,
  dash:false,stone:false,homing:false,prism:false,priFast:false,msl:1,neb:false,pointDef:false,
  slowField:false,novaRadial:false,novaCdMul:1,novaMul:1,ojiva:false,gemLuck:false,heartDrop:false,vortex:false,
  elec:null,ice:null,iceTop:false,wind:null,fire:null,linkHeal:0,linkRate:5,linkT:0,
  overEvery:6,desperate:false,dashFast:false,droneFast:false,homeFast:false,gemExtra:false,
  bot:0,botDmg:1,botRate:1,botMsl:false,botTwin:0,botPrc:0,
  /* v4.13: ARMA DEFINITIVA · Cañón Aniquilador */
  ult:false,ultAim:false,ultBurn:false,ultShock:false,ultCdMax:14,ultDmgMul:10,ultT:0,
  /* v4.14: 2ª DEFINITIVA · Agujero Negro */
  bh:false,bhCdMax:20,bhRad:130,bhDur:4,bhPull:1,bhDmgMul:1,bhBoom:false,bhGold:false,bhHeal:false,bhT:0,
  invul:0,fireAcc:0,shots:0,shieldLvl:true,emerUsed:false,regAcc:0,
  shieldUp:false,shieldCd:0,homeCd:1,priCd:3,intAcc:0,orbT:0,orbTick:0,dashCd:0,vengeT:0,
  touch:null
};}
let players=[mkPlayer(0)];
let P=players[0]; // se re-vincula en cada inicio de partida (ver bindP)
let remoteBase={}; /* v4.15: statblock de cada cliente por slot (remoteBase[1], remoteBase[2]) */
let localSlot=0;

/* ============ señales y emoticones ============ */
const CALLS={
  warn:{txt:'¡CUIDADO!',color:'#FF6B6B'},
  elite:{txt:'¡ÉLITE!',color:'#B388FF'},
  join:{txt:'¡JUNTOS!',color:'#7FD1B9'},
  help:{txt:'¡AYUDA!',color:'#FFD166'},
};
function addEmoFx(slot,kind,val){
  const pl=players[slot];if(!pl)return;
  emosFx.push({x:pl.x,y:pl.y-46,kind,val,
    txt:kind==='emo'?val:(CALLS[val]?CALLS[val].txt:String(val)),
    color:kind==='emo'?'#F2EFE6':(CALLS[val]?CALLS[val].color:'#F2EFE6'),
    t:0,life:kind==='emo'?2.4:2.0});
  if(emosFx.length>12)emosFx.shift();
  if(kind==='emo')SFX.emo();else SFX.call();
  vib(30);
}
function sendEmo(e){ addEmoFx(localSlot,'emo',e); sendMsg({t:'emo',e}); }
function sendCall(k){
  addEmoFx(localSlot,'call',k);
  const pl=players[localSlot];
  if(pl)rings.push({x:pl.x,y:pl.y,r:14,R:100,t:0,life:.6,color:CALLS[k]?CALLS[k].color:'#F2EFE6'});
  sendMsg({t:'call',k});
}

