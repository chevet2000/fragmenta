'use strict';
/* ============ v4.33: ZONAS DE GUERRA + PALANCA DE DIFICULTAD DE JEFES ============
   Cada oleada (desde la 2, nunca en oleada jefa) puede nacer DENTRO de una
   zona hostil que aprieta al jugador mientras dure la oleada:
   · ZONA GRAVITATORIA — efecto AL AZAR: daño (sus balas golpean el doble),
     velocidad (+25% balas y enemigos) o defensa (+35% vida enemiga).
   · ZONA DE METEOROS — lluvia de rocas INDESTRUCTIBLES cada pocos segundos.
   · ZONA SOLAR — el calor evapora el botín: -70% de drops (el oro resiste).
   · ZONA IÓNICA — interferencia: el reactor recarga 45% más lento.
   · ZONA DISTORSIONADA — el espacio se rompe: balas enemigas +25% rápidas.
   La zona la decide el ANFITRIÓN (o el solitario) y viaja al cliente por el
   evento 'ev zone' + el campo zn del snapshot (para quien entre tarde). */
const ZONE_ORDER=['grav','met','sol','ion','dist'];
const ZONES={
  grav:{name:'◎ ZONA GRAVITATORIA',color:'#B388FF',icon:'◎',
    vars:{dmg:'GRAVEDAD HOSTIL · SUS BALAS GOLPEAN EL DOBLE',
          spd:'ANOMALÍA GRAVE · ENEMIGOS Y BALAS +25% DE VELOCIDAD',
          def:'BLINDAJE GRAVE · ENEMIGOS CON +35% DE VIDA'}},
  met:{name:'☄ ZONA DE METEOROS',color:'#FF9F43',icon:'☄',
    desc:'LLUVIA DE ROCAS · NO SE PUEDEN DESTRUIR · ESQUIVA'},
  sol:{name:'☀ ZONA SOLAR',color:'#FFD166',icon:'☀',
    desc:'CALOR ABRASADOR · BOTÍN -70% MIENTRAS DURE (EL ORO RESISTE)'},
  ion:{name:'⚡ ZONA IÓNICA',color:'#64C7FF',icon:'⚡',
    desc:'INTERFERENCIA · EL REACTOR RECARGA 45% MÁS LENTO'},
  dist:{name:'≋ ZONA DISTORSIONADA',color:'#FF7EB6',icon:'≋',
    desc:'ESPACIO ROTO · BALAS ENEMIGAS +25% DE VELOCIDAD'}
};
/* ---- consultores de zona (baratos, se llaman por frame) ---- */
function zoneSpdMul(){const z=run.zone;return z&&(z.k==='dist'||(z.k==='grav'&&z.v==='spd'))?1.25:1;}
function zoneEnemyHpMul(){const z=run.zone;return z&&z.k==='grav'&&z.v==='def'?1.35:1;}
function zoneGravDmg(){const z=run.zone;return !!(z&&z.k==='grav'&&z.v==='dmg');}
function zoneDropMul(){return run.zone&&run.zone.k==='sol'?.3:1;}
function zoneIonMul(){return run.zone&&run.zone.k==='ion'?.55:1;}
function eSpd(v){return v*zoneSpdMul();}
/* ---- palanca de JEFES (petición del piloto: muy fáciles en solo/normal/difícil) ----
   HARDCORE/FRENÉTICO ya son brutales: no se tocan. En SOLO/NORMAL/DIFÍCIL:
   vida ×1.55, sus balas pegan 2 y el embestir su casco cuesta 3. */
function bossDiffMul(){return runDiff==='hardcore'?1:1.55;}
function bossBulDmg(){return runDiff==='hardcore'?1:2;}
function bossContactDmg(){return runDiff==='hardcore'?2:3;}
/* ---- sorteo de zona ---- */
function startZone(){
  const r=Math.random();
  const k=r<.30?'grav':r<.52?'met':r<.70?'sol':r<.85?'ion':'dist';
  const z={k};
  if(k==='grav')z.v=['dmg','spd','def'][irand(0,2)];
  run.zone=z;meteorZoneT=null;
  const d=ZONES[k];
  banner(d.name,k==='grav'?d.vars[z.v]:d.desc);
  crewSay('zone'+k.charAt(0).toUpperCase()+k.slice(1));
  SFX.warp();vib(40);
  if(net.mode==='host')sendMsg({t:'ev',k:'zone',z:{k:z.k,v:z.v||''}});
}
function clearZone(){run.zone=null;meteorZoneT=null;}
function zoneLabel(){
  const z=run.zone;if(!z)return '';
  const d=ZONES[z.k];if(!d)return '';
  if(z.k==='grav'&&z.v){const base=d.vars[z.v].split(' ·')[0];return d.name+' · '+base;}
  return d.name+' · '+d.desc.split(' ·')[0];
}
