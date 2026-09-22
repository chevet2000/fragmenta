'use strict';
/* ============ v4.30: LA TRIPULACIÓN ============
   La nave HABLA: la tripulación suelta avisos estilo radio durante la
   partida — el médico avisa de los impactos, el ingeniero de la energía,
   el timonel del combustible, el navegante del radar y el artillero y el
   radista rematan. Todo es LOCAL (cada pantalla ve a SU tripulación: no
   viaja por la red). Se apaga desde ⚙ AJUSTES o la PAUSA con el botón
   TRIPULACIÓN: SÍ/NO (save.crewOn). Anti-spam: cada aviso tiene su
   enfriamiento (cd, en segundos) y máximo 2 globos en pantalla. */
const CREW_ROSTER={
  tim:{n:'TIMONEL',c:'#7FD1B9',i:'⎈'},
  ing:{n:'INGENIERO',c:'#FFD166',i:'⚙'},
  art:{n:'ARTILLERO',c:'#FF7EB6',i:'✸'},
  nav:{n:'NAVEGANTE',c:'#64C7FF',i:'✦'},
  rad:{n:'RADISTA',c:'#B388FF',i:'⌁'},
  med:{n:'MÉDICO',c:'#FF6B6B',i:'✚'}
};
const CREW_LINES={
  launch:{sp:'rad',prio:1,cd:2,tx:['Sistemas en línea. Buena caza, capitán.','Todos en sus puestos, capitán.','Cañones y escudos listos, capitán.']},
  wave:{sp:'nav',prio:1,cd:5,tx:['Oleada {n} en el radar, capitán.','Oleada {n} entrante: mantengan formaciones.','Rumbo a la oleada {n}, capitán.','Contactos múltiples: oleada {n}.']},
  atk:{sp:'med',prio:2,cd:11,tx:['¡Capitán, nos están atacando!','¡Impacto en el casco, capitán!','¡Nos están dando, capitán!']},
  lowhp:{sp:'med',prio:3,cd:24,tx:['¡El casco no aguanta otro golpe, capitán!','¡Vida crítica, capitán! Esquive o recoja corazones.']},
  shield:{sp:'ing',prio:1,cd:12,tx:['El escudo aguantó el impacto, capitán.','Impacto absorbido: escudo operativo.']},
  reserva:{sp:'med',prio:2,cd:10,tx:['La RESERVA ha salvado la nave, capitán.']},
  fuelLow:{sp:'tim',prio:2,cd:30,tx:['Capitán, el tanque va por el 25%.','Combustible bajo, capitán. Vigile el gasto.']},
  fuelOut:{sp:'tim',prio:3,cd:8,tx:['¡Se acabó el combustible, capitán!','¡Sin combustible! Busque bidones verdes.']},
  reservaF:{sp:'ing',prio:2,cd:6,tx:['Reserva del pirata gastada: tanque al 60%.']},
  enLow:{sp:'ing',prio:2,cd:30,tx:['El reactor cae por debajo del 20%, capitán.','Reactor débil, capitán: cada disparo cuenta.']},
  blackout:{sp:'ing',prio:3,cd:8,tx:['¡Apagón! Armas a la mitad y drones fuera de línea.','¡Perdemos electricidad, capitán! Los drones han caído.']},
  enBack:{sp:'ing',prio:1,cd:8,tx:['Electricidad restablecida, capitán.','Reactor en verde: cañones operativos.']},
  fuelUp:{sp:'ing',prio:1,cd:9,tx:['Combustible a bordo, buen hallazgo.','Bidón recolectado. Gracias, caporales.']},
  elecUp:{sp:'ing',prio:1,cd:9,tx:['Celda de energía asegurada.','Carga eléctrica a bordo, capitán.']},
  chest:{sp:'rad',prio:1,cd:6,tx:['¡Cofre a bordo, caporales!','Cofre asegurado: ábranlo con cuidado.']},
  elite:{sp:'nav',prio:2,cd:18,tx:['¡Señal élite en el sector, capitán!','¡Capitán, un élite entra en escena!']},
  boss:{sp:'rad',prio:3,cd:6,tx:['¡Capitán… el Guardián está aquí!','¡Detección imposible… es el Guardián!']},
  few:{sp:'art',prio:1,cd:10,tx:['¡Ya casi limpiamos el sector, caporales!','Últimos hostiles, capitán. No aflojen.']},
  golden:{sp:'art',prio:2,cd:6,tx:['¡Oleada dorada! Botín +60%, caporales.']},
  anomaly:{sp:'nav',prio:2,cd:6,tx:['Dimensión anómala: botín doble, capitán.']},
  meteor:{sp:'nav',prio:1,cd:9,tx:['¡Meteorito dorado en el radar, caporales!']},
  meteorP:{sp:'nav',prio:2,cd:9,tx:['¡Meteorito PÚRPURA, capitán! Esconde una reliquia.']},
  portal:{sp:'nav',prio:2,cd:9,tx:['¡Portal misterioso detectado, capitán!']},
  cube:{sp:'rad',prio:2,cd:9,tx:['¡Cubo sorpresa en el sector, caporales!']},
  ally:{sp:'rad',prio:1,cd:5,tx:['Nave amiga en formación, capitán.']},
  down:{sp:'med',prio:3,cd:6,tx:['¡La nave del compañero ha caído! Rescátenlo, capitán.']},
  resc:{sp:'med',prio:2,cd:6,tx:['¡Compañero rescatado! Bien hecho, caporales.']},
  shipUp:{sp:'art',prio:2,cd:4,tx:['Nave evolucionada: nivel {n}, capitán.','La nave sube a nivel {n}. ¡Menudo arsenal!']},
  /* v4.32: MEJORA AL AZAR — el ingeniero instala lo que salga */
  autoUp:{sp:'ing',prio:1,cd:4,tx:['Instalando {n} a ciegas… listo, capitán.','{n} conectada al azar. La máquina eligió, no yo.']},
  /* v4.31: EL PIRATA GALÁCTICO — la tripulación entra en pánico */
  pirIn:{sp:'rad',prio:3,cd:4,tx:['¡Escondan sus pertenencias, llegaron los piratas!','¡Piratas en el radar, capitán! Protejan la carga.','¡Contacto hostil… es el PIRATA GALÁCTICO!']},
  pirSteal:{sp:'med',prio:2,cd:10,tx:['¡Nos están robando el botín, capitán!','¡Ahí va nuestro oro, directo a sus bodegas!','¡El pirata aspira la carga, capitán!']},
  pirCurse:{sp:'ing',prio:3,cd:5,tx:['¡Maldición pirata! Un sistema fuera de línea, capitán.','¡Sabotaje! Los piratas inutilizaron un sistema.']},
  pirDie:{sp:'art',prio:3,cd:4,tx:['¡Pirata hundido! ¡El botín es nuestro, caporales!','¡Buen tiro, capitán! Recuperamos todo… y más.']},
  pirEsc:{sp:'nav',prio:2,cd:4,tx:['El pirata escapó con el botín, capitán…','Se fue con nuestra carga. El próximo no escapa.']},
  pirMsl:{sp:'nav',prio:2,cd:4,tx:['¡Misil teledirigido, capitán! ¡Esquive!','¡Misil corsario entrante, maniobre, capitán!']},
  pirLas:{sp:'nav',prio:2,cd:4,tx:['¡Cargan el láser corsario! Fuera de la línea, capitán.','¡Láser al horno, capitán! Aparte.']},
  pirCore:{sp:'art',prio:2,cd:5,tx:['¡Aros destruidos! ¡Al núcleo, caporales!','¡Núcleo expuesto, capitán! Fuego a discreción.']}
};
let crewCd={},crewHpLast=null,crewShipLast=null,crewSnapWrecks=0;
function crewEnabled(){return save.crewOn!==false;}
function crewSay(key,vars){
  if(!crewEnabled()||state!=='play')return;
  const def=CREW_LINES[key];if(!def)return;
  const nowS=Date.now()/1000;
  if(crewCd[key]&&nowS<crewCd[key])return;
  crewCd[key]=nowS+def.cd;
  const ro=CREW_ROSTER[def.sp]||CREW_ROSTER.rad;
  let txt=def.tx[irand(0,def.tx.length-1)];
  if(vars)for(const k in vars)txt=txt.split('{'+k+'}').join(String(vars[k]));
  crewPush(ro,txt,def.prio);
}
/* los banners grandes también sacan palabra a la tripulación:
   GUARDIÁN…, ¡OLEADA DORADA!, ◈ DIMENSIÓN ANÓMALA y OLEADA N · …
   Se llama desde banner() (anfitrión/solitario) y desde el handler
   'bn' de la red (clientes co-op): cada pantalla habla una vez. */
function crewBannerMsg(t){
  if(!t||typeof t!=='string')return;
  /* v4.31: los banners del PIRATA GALÁCTICO sacan palabra a la tripulación */
  if(t.indexOf('¡LLEGARON LOS PIRATAS')>=0)crewSay('pirIn');
  else if(t.indexOf('¡PIRATA HUNDIDO')>=0)crewSay('pirDie');
  else if(t.indexOf('PIRATA ESCAPÓ')>=0)crewSay('pirEsc');
  else if(t.indexOf('MALDICIÓN PIRATA')>=0)crewSay('pirCurse');
  else if(t.indexOf('NÚCLEO DEL PIRATA')>=0)crewSay('pirCore');
  if(t.indexOf('GUARDIÁN')===0)crewSay('boss');
  else if(t.indexOf('OLEADA DORADA')>=0)crewSay('golden');
  else if(t.indexOf('DIMENSIÓN ANÓMALA')>=0)crewSay('anomaly');
  else if(t.indexOf('OLEADA ')===0){
    const n=parseInt(t.slice(7),10);
    if(!isNaN(n))crewSay('wave',{n:n});
  }
}
function crewPush(ro,txt,prio){
  const box=$('#crewBox');if(!box)return;
  box.classList.remove('hidden');
  const el=document.createElement('div');
  el.className='crew-msg';
  el.style.borderLeftColor=ro.c;
  const b=document.createElement('b');b.style.color=ro.c;b.textContent=ro.i+' '+ro.n;
  const s=document.createElement('span');s.textContent=txt;
  el.appendChild(b);el.appendChild(s);
  box.appendChild(el);
  while(box.children.length>2)box.removeChild(box.firstChild);
  if(prio>=2)SFX.crew();else tone(880,1180,.05,'square',.012);
  setTimeout(()=>{
    el.classList.add('out');
    setTimeout(()=>{
      if(el.parentNode)el.parentNode.removeChild(el);
      if(!box.children.length)box.classList.add('hidden');
    },240);
  },3100);
}
function crewToggle(){
  save.crewOn=crewEnabled()?false:true;
  persist();
  crewLbls();
}
function crewLbls(){
  const lab='TRIPULACIÓN: '+(crewEnabled()?'SÍ':'NO');
  const b1=$('#btnPCrew'),b2=$('#btnCrew');
  if(b1)b1.textContent=lab;
  if(b2)b2.textContent=lab;
}
bindEl('#btnPCrew','click',()=>{audio();crewToggle();});
bindEl('#btnCrew','click',()=>{audio();crewToggle();});
crewLbls();
