'use strict';
/* ============ árbol: nodos, 12 ramas + fusiones ============ */
const BR={off:'OFENSIVA',def:'DEFENSA',sup:'SOPORTE',tac:'TÁCTICA',rap:'RAPIDEZ',ric:'RIQUEZA',sab:'SABIDURÍA',ele:'ELEMENTOS',ima:'IMÁN',for:'PROSPERIDAD',sor:'AZAR',enl:'ENLACE',bot:'ALIADO',mrg:'FUSIÓN'};
const BX={off:55,def:150,sup:245,tac:340,rap:435,ric:530,sab:625,ele:720,ima:815,for:910,sor:1005,enl:1100,bot:1195};
const TREE=[
 {id:'o1',b:'off',i:0,cost:{gold:300},wave:1,tag:'CAL',name:'CALIBRE',desc:'Daño +1.',fx:b=>b.dmg+=1},
 {id:'o2',b:'off',i:1,cost:{gold:700},wave:3,tag:'CAD',name:'CADENCIA',desc:'Disparas un 20% más rápido.',fx:b=>b.rate*=1.2},
 {id:'o3',b:'off',i:2,cost:{gems:6},wave:5,tag:'DUP',name:'CAÑÓN DOBLE',desc:'+1 proyectil por disparo.',fx:b=>b.bul+=1},
 {id:'o4',b:'off',i:3,cost:{gold:1400},wave:8,tag:'PES',name:'MUNICIÓN PESADA',desc:'Daño +2.',fx:b=>b.dmg+=2},
 {id:'o5',b:'off',i:4,cost:{gems:10},wave:11,tag:'PER',name:'PERFORACIÓN',desc:'Las balas atraviesan +1 enemigo.',fx:b=>b.pierce+=1},
 {id:'o6',b:'off',i:5,cost:{gold:2400},wave:15,tag:'CRI',name:'OJO CRÍTICO',desc:'+12% de crítico (x2.5 de daño).',fx:b=>b.crit+=.12},
 {id:'o7',b:'off',i:6,cost:{gems:16},wave:19,tag:'TOR',name:'TORRENTE',desc:'+1 proyectil y +10% de cadencia.',fx:b=>{b.bul++;b.rate*=1.10}},
 {id:'o8',b:'off',i:7,cost:{gems:22},wave:24,tag:'ANQ',name:'ANIQUILADOR',desc:'Daño +4 y +10% de crítico.',fx:b=>{b.dmg+=4;b.crit+=.10}},
 {id:'oa1',b:'off',s:'A',i:0,cost:{gold:900},wave:12,ship:6,tag:'VAM',name:'VAMPIRISMO',desc:'12% de recuperar 1 vida al destruir un enemigo.',fx:b=>b.vamp=true},
 {id:'oa2',b:'off',s:'A',i:1,cost:{gems:12},wave:16,ship:8,tag:'FRE',name:'FRENESÍ',desc:'6 bajas seguidas sin daño: +50% de cadencia durante 5 s.',fx:b=>b.frenzy=true},
 {id:'oa3',b:'off',s:'A',i:2,cost:{gold:2800},wave:22,ship:12,tag:'EJE',name:'EJECUTOR',desc:'x3 de daño a enemigos bajo el 25% de vida.',fx:b=>b.execute=true},
 {id:'oa4',b:'off',s:'A',i:3,cost:{gems:20},wave:28,ship:14,tag:'PRE',name:'PRESA',desc:'+60% de daño a élites y +50% de su oro.',fx:b=>b.presa=true},
 {id:'ob1',b:'off',s:'B',i:0,cost:{gold:1000},wave:14,ship:8,tag:'FL2',name:'FILA DOBLE',desc:'Dos filas paralelas de balas.',fx:b=>b.files=Math.max(b.files,2)},
 {id:'ob2',b:'off',s:'B',i:1,cost:{gems:14},wave:20,tag:'TER',name:'PUNTA TÉRMICA',desc:'Daño +2.',fx:b=>b.dmg+=2},
 {id:'ob3',b:'off',s:'B',i:2,cost:{gems:24},wave:26,ship:12,tag:'FL3',name:'TRIPLE FILA',desc:'Tres filas paralelas de balas.',fx:b=>b.files=Math.max(b.files,3)},
 {id:'ob4',b:'off',s:'B',i:3,cost:{gems:30},wave:32,ship:16,tag:'OJI',name:'OJIVA',desc:'Los proyectiles pesados explotan en área.',fx:b=>b.ojiva=true},
 {id:'oc1',b:'off',s:'C',i:0,cost:{gold:2000,gems:8},wave:18,ship:11,tag:'PUN',name:'PUNTERÍA',desc:'+8% de crítico.',fx:b=>b.crit+=.08},
 {id:'oc2',b:'off',s:'C',i:1,cost:{gems:26},wave:30,ship:15,tag:'DCA',name:'DOBLE CARGA',desc:'Cada 4.º disparo es pesado (en vez de cada 6.º).',fx:b=>b.overEvery=4},
 {id:'d1',b:'def',i:0,cost:{gold:300},wave:1,tag:'FUS',name:'FUSIBLE',desc:'+2 de vida máxima.',fx:b=>b.maxHp+=2},
 {id:'d2',b:'def',i:1,cost:{gold:700},wave:3,tag:'NAN',name:'NANOBOTS',desc:'Regeneración continua: +1.7 PS/s (1 vida = 100 PS · vida completa cada ~60 s).',fx:b=>b.regenRate+=1/60},
 {id:'d3',b:'def',i:2,cost:{gems:6},wave:5,tag:'RES',name:'RESERVA',desc:'Sobrevives a 1 golpe fatal por oleada, con 1 de vida.',fx:b=>b.emergency=true},
 {id:'d4',b:'def',i:3,cost:{gold:1400},wave:8,tag:'PLA',name:'PLACAS',desc:'+4 de vida máxima.',fx:b=>b.maxHp+=4},
 {id:'d5',b:'def',i:4,cost:{gems:10},wave:11,tag:'ESC',name:'ESCUDO DE CARGA',desc:'Bloquea 1 golpe; recarga cada 25 s.',fx:b=>b.shield=true},
 {id:'d6',b:'def',i:5,cost:{gold:2400},wave:15,tag:'RE2',name:'REGEN PLUS',desc:'Regeneración x3: +5 PS/s (vida completa cada 20 s).',fx:b=>b.regenRate+=2/60},
 {id:'d7',b:'def',i:6,cost:{gems:16},wave:19,tag:'BLI',name:'BLINDAJE TOTAL',desc:'+6 de vida máxima.',fx:b=>b.maxHp+=6},
 {id:'d8',b:'def',i:7,cost:{gems:22},wave:24,tag:'FEN',name:'FÉNIX',desc:'Una vez por partida, renaces con media vida.',fx:b=>b.phx=Math.max(b.phx,1)},
 {id:'da1',b:'def',s:'A',i:0,cost:{gold:900},wave:12,tag:'COR',name:'CORAZONEROS',desc:'Más del doble de corazones sueltos.',fx:b=>b.heartDrop=true},
 {id:'da2',b:'def',s:'A',i:1,cost:{gems:12},wave:16,ship:8,tag:'REF',name:'REFLEJO',desc:'Tus bloqueos contraatacan al enemigo más cercano.',fx:b=>b.reflect=true},
 {id:'da3',b:'def',s:'A',i:2,cost:{gold:2800},wave:22,ship:12,tag:'FN2',name:'FÉNIX DOBLE',desc:'Fénix se activa dos veces por partida.',fx:b=>b.phx=2},
 {id:'da4',b:'def',s:'A',i:3,cost:{gems:20},wave:28,ship:14,tag:'VEN',name:'VENGANZA',desc:'Tras recibir daño: +30% de cadencia 4 s.',fx:b=>b.venge=true},
 {id:'db1',b:'def',s:'B',i:0,cost:{gold:1000},wave:14,ship:8,tag:'AIR',name:'SEGUNDO AIRE',desc:'Vida completa al comenzar cada oleada de Guardián.',fx:b=>b.secondWind=true},
 {id:'db2',b:'def',s:'B',i:1,cost:{gems:14},wave:18,ship:10,tag:'DAS',name:'DASH TÁCTICO',desc:'Desliza con un tirón rápido para esquivar (0.35 s de invulnerabilidad).',fx:b=>b.dash=true},
 {id:'db3',b:'def',s:'B',i:2,cost:{gems:24},wave:26,ship:12,tag:'PIO',name:'PIEL DE PIEDRA',desc:'Todo daño recibido se reduce en 1 (mín. 1).',fx:b=>b.stone=true},
 {id:'db4',b:'def',s:'B',i:3,cost:{gems:30},wave:32,ship:16,tag:'FLE',name:'FORTALEZA',desc:'Tu escudo recarga en 15 s en vez de 25.',fx:b=>b.shieldFast=true},
 {id:'dc1',b:'def',s:'C',i:0,cost:{gold:2000,gems:8},wave:18,ship:11,tag:'INS',name:'INSTINTO',desc:'Con 1 de vida o menos: +50% de cadencia.',fx:b=>b.desperate=true},
 {id:'dc2',b:'def',s:'C',i:1,cost:{gems:26},wave:30,ship:15,tag:'PLU',name:'PESO PLUMA',desc:'Tu Dash recarga en 1.2 s en vez de 2.2.',fx:b=>b.dashFast=true},
 {id:'u1',b:'sup',i:0,cost:{gold:300},wave:1,tag:'IMA',name:'IMÁN',desc:'Radio de recogida +80%.',fx:b=>b.magnet=1.8},
 {id:'u2',b:'sup',i:1,cost:{gems:5},wave:2,tag:'NOV',name:'NOVA',desc:'Tu botón de emergencia: onda de 15 de daño que limpia balas. Recarga 18 s.',fx:b=>b.nova=b.nova||{d:15,cd:18}},
 {id:'u3',b:'sup',i:2,cost:{gems:8},wave:6,tag:'NAM',name:'NOVA AMP',desc:'Nova: 35 de daño y recarga 13 s.',fx:b=>b.nova={d:35,cd:13}},
 {id:'u4',b:'sup',i:3,cost:{gold:1400},wave:8,tag:'REL',name:'RELATIVIDAD',desc:'Balas enemigas un 30% más lentas.',fx:b=>b.slow*=.7},
 {id:'u4b',b:'sup',i:3,cost:{gold:1400},wave:8,tag:'VOR',name:'VÓRTICE',desc:'Los enemigos a menos de 180 px son atraídos hacia arriba.',fx:b=>b.vortex=true},
 {id:'u5',b:'sup',i:4,cost:{gold:2200},wave:11,tag:'FOR',name:'FORTUNA',desc:'+25% de oro.',fx:b=>b.goldMul*=1.25},
 {id:'u6',b:'sup',i:5,cost:{gems:12},wave:15,tag:'AUR',name:'CAMPO CORTANTE',desc:'Desmenuza enemigos cercanos a tu nave.',fx:b=>b.aura=true},
 {id:'u7',b:'sup',i:6,cost:{gems:18},wave:19,tag:'NRA',name:'NOVA RADIAL',desc:'La Nova dispara además 12 balas radiales.',fx:b=>b.novaRadial=true},
 {id:'u8',b:'sup',i:7,cost:{gems:22},wave:24,tag:'INT',name:'INTERÉS',desc:'+1 de oro por segundo.',fx:b=>b.goldRate=Math.max(b.goldRate,1)},
 {id:'ua1',b:'sup',s:'A',i:0,cost:{gold:900},wave:10,ship:5,tag:'SAB',name:'SABIDURÍA',desc:'+20% de experiencia.',fx:b=>b.expMul*=1.2},
 {id:'ua2',b:'sup',s:'A',i:1,cost:{gems:12},wave:16,ship:10,tag:'MEN',name:'MENTE',desc:'+30% de experiencia (acumulable).',fx:b=>b.expMul*=1.3},
 {id:'ua3',b:'sup',s:'A',i:2,cost:{gold:2800},wave:22,ship:12,tag:'GEO',name:'GEÓLOGO',desc:'Casi el doble de gemas.',fx:b=>b.gemLuck=true},
 {id:'ua4',b:'sup',s:'A',i:3,cost:{gems:20},wave:28,ship:14,tag:'ALQ',name:'ALQUIMIA',desc:'+25% de oro adicional.',fx:b=>b.goldMul*=1.25},
 {id:'ub1',b:'sup',s:'B',i:0,cost:{gold:1000},wave:14,ship:8,tag:'IN2',name:'INTERÉS PLUS',desc:'+3 de oro por segundo.',fx:b=>b.goldRate=Math.max(b.goldRate,3)},
 {id:'ub2',b:'sup',s:'B',i:1,cost:{gems:14},wave:20,ship:10,tag:'NCG',name:'NOVA CARGA',desc:'La Nova recarga un 30% más rápido.',fx:b=>b.novaCdMul*=.7},
 {id:'ub3',b:'sup',s:'B',i:2,cost:{gems:24},wave:26,ship:12,tag:'NSU',name:'NOVA SUPREMA',desc:'Daño de la Nova x2.',fx:b=>b.novaMul=2},
 {id:'ub4',b:'sup',s:'B',i:3,cost:{gems:30},wave:32,ship:16,tag:'BAN',name:'BANCO',desc:'+6 de oro por segundo.',fx:b=>b.goldRate=Math.max(b.goldRate,6)},
 {id:'uc1',b:'sup',s:'C',i:0,cost:{gold:2000,gems:8},wave:18,ship:11,tag:'TRI',name:'TRIBUTO',desc:'+20% de oro adicional.',fx:b=>b.goldMul*=1.2},
 {id:'uc2',b:'sup',s:'C',i:1,cost:{gems:26},wave:30,ship:15,tag:'VOC',name:'VETA OCULTA',desc:'+4% de probabilidad de gema en cada enemigo.',fx:b=>b.gemExtra=true},
 {id:'t1',b:'tac',i:0,cost:{gold:400},wave:2,tag:'DRO',name:'DRON',desc:'Un dron orbital dispara al enemigo más cercano.',fx:b=>b.drones++},
 {id:'t2',b:'tac',i:1,cost:{gems:6},wave:6,tag:'ESQ',name:'ESCUADRÓN',desc:'+1 dron orbital.',fx:b=>b.drones++},
 {id:'t3',b:'tac',i:2,cost:{gold:1500},wave:8,tag:'REB',name:'REBOTICA',desc:'Las balas rebotan 1 vez.',fx:b=>b.bounce++},
 {id:'t4',b:'tac',i:3,cost:{gems:10},wave:11,tag:'SOB',name:'SOBRECARGA',desc:'Cada 6.º disparo es pesado (x3 de daño).',fx:b=>b.over=true},
 {id:'t5',b:'tac',i:4,cost:{gems:14},wave:15,tag:'MIS',name:'MISILES',desc:'Misil teledirigido (x3) cada 2.5 s.',fx:b=>b.homing=true},
 {id:'t6',b:'tac',i:5,cost:{gold:2600},wave:19,tag:'NEB',name:'NEBULOSA',desc:'Al recibir daño estalla una onda de choque.',fx:b=>b.neb=true},
 {id:'t7',b:'tac',i:6,cost:{gems:18},wave:22,tag:'PRI',name:'RAYO PRISMA',desc:'Cada 5 s un rayo golpea al enemigo más cercano (x2).',fx:b=>b.prism=true},
 {id:'t8',b:'tac',i:7,cost:{gems:22},wave:24,tag:'ARM',name:'ARMADA',desc:'+2 drones orbitales.',fx:b=>b.drones+=2},
 {id:'ta1',b:'tac',s:'A',i:0,cost:{gold:900},wave:10,ship:5,tag:'ORB',name:'ORBITALES',desc:'2 orbes giran alrededor de tu nave dañando por contacto.',fx:b=>b.orbs+=2},
 {id:'ta2',b:'tac',s:'A',i:1,cost:{gems:12},wave:16,ship:10,tag:'OR2',name:'ORBITALES PLUS',desc:'+2 orbes (4 en total).',fx:b=>b.orbs+=2},
 {id:'ta3',b:'tac',s:'A',i:2,cost:{gold:2800},wave:22,ship:12,tag:'CON',name:'CONTRAMEDIDAS',desc:'Destruye balas enemigas cerca de tu nave.',fx:b=>b.pointDef=true},
 {id:'ta4',b:'tac',s:'A',i:3,cost:{gems:20},wave:28,ship:14,tag:'GRA',name:'GRAVEDAD',desc:'Enemigos a menos de 140 px: 35% más lentos.',fx:b=>b.slowField=true},
 {id:'tb1',b:'tac',s:'B',i:0,cost:{gold:1000},wave:14,ship:8,tag:'RAS',name:'RASTREADORES',desc:'Misiles teledirigidos mejorados.',fx:b=>b.homing=true},
 {id:'tb2',b:'tac',s:'B',i:1,cost:{gems:14},wave:20,ship:10,tag:'PR2',name:'PRISMA PLUS',desc:'El rayo dispara cada 3 s en vez de 5.',fx:b=>b.priFast=true},
 {id:'tb3',b:'tac',s:'B',i:2,cost:{gems:24},wave:26,ship:12,tag:'MI2',name:'MISILES DOBLES',desc:'Dos misiles por ciclo.',fx:b=>b.msl=2},
 {id:'tb4',b:'tac',s:'B',i:3,cost:{gems:30},wave:32,ship:16,tag:'ENJ',name:'ENJAMBRE DE HIERRO',desc:'+3 drones orbitales.',fx:b=>b.drones+=3},
 {id:'tc1',b:'tac',s:'C',i:0,cost:{gold:2000,gems:8},wave:18,ship:11,tag:'NDR',name:'NÚCLEO DRON',desc:'Tus drones disparan el doble de rápido.',fx:b=>b.droneFast=true},
 {id:'tc2',b:'tac',s:'C',i:1,cost:{gems:26},wave:30,ship:15,tag:'OHA',name:'OJO DE HALCÓN',desc:'Tus misiles salen cada 1.8 s en vez de 2.5.',fx:b=>b.homeFast=true},
 {id:'r1',b:'rap',i:0,cost:{gold:400,gems:2},wave:1,tag:'GAT',name:'GATILLO SENSIBLE',desc:'Cadencia de disparo +8%.',fx:b=>b.rate*=1.08},
 {id:'r2',b:'rap',i:1,cost:{gold:900,gems:4},wave:5,tag:'MEC',name:'MECANISMO FINO',desc:'Cadencia +10%.',fx:b=>b.rate*=1.10},
 {id:'r3',b:'rap',i:2,cost:{gold:1600,gems:6},wave:9,tag:'PRC',name:'DOBLE PERCUSIÓN',desc:'Cadencia +12%.',fx:b=>b.rate*=1.12},
 {id:'r4',b:'rap',i:3,cost:{gold:2600,gems:8},wave:14,ship:8,tag:'RAF',name:'SISTEMA RÁFAGA',desc:'Cadencia +15%.',fx:b=>b.rate*=1.15},
 {id:'r5',b:'rap',i:4,cost:{gems:12},wave:19,ship:10,tag:'MOT',name:'MOTOR LINEAL',desc:'Cadencia +18%.',fx:b=>b.rate*=1.18},
 {id:'r6',b:'rap',i:5,cost:{gold:4000,gems:14},wave:25,ship:13,tag:'HIP',name:'HIPERCADENCIA',desc:'Cadencia +22%.',fx:b=>b.rate*=1.22},
 {id:'r7',b:'rap',i:6,cost:{gems:20},wave:32,ship:16,tag:'LUM',name:'VELOCIDAD LUMINAL',desc:'Cadencia +30%.',fx:b=>b.rate*=1.30},
 {id:'rc1',b:'rap',s:'C',i:0,cost:{gold:2000,gems:8},wave:18,ship:11,tag:'TEM',name:'TEMPESTAD',desc:'Cadencia +15%.',fx:b=>b.rate*=1.15},
 {id:'rc2',b:'rap',s:'C',i:1,cost:{gems:26},wave:30,ship:15,tag:'ULR',name:'ULTRARRÁPIDO',desc:'Cadencia +15% adicional.',fx:b=>b.rate*=1.15},
 {id:'w1',b:'ric',i:0,cost:{gold:350,gems:2},wave:1,tag:'BOL',name:'BOLSILLOS',desc:'Oro obtenido +10%.',fx:b=>b.goldMul*=1.10},
 {id:'w2',b:'ric',i:1,cost:{gold:800,gems:3},wave:4,tag:'REC',name:'RECOGEDOR',desc:'Oro +12%.',fx:b=>b.goldMul*=1.12},
 {id:'w3',b:'ric',i:2,cost:{gold:1500,gems:5},wave:8,tag:'FIL',name:'FILÓN',desc:'Oro +15%.',fx:b=>b.goldMul*=1.15},
 {id:'w4',b:'ric',i:3,cost:{gold:2400,gems:7},wave:13,ship:7,tag:'TAL',name:'TALADRO',desc:'Oro +18%.',fx:b=>b.goldMul*=1.18},
 {id:'w5',b:'ric',i:4,cost:{gems:11},wave:18,ship:9,tag:'MIN',name:'MINA PROFUNDA',desc:'Oro +20%.',fx:b=>b.goldMul*=1.20},
 {id:'w6',b:'ric',i:5,cost:{gold:4500,gems:12},wave:24,ship:12,tag:'VET',name:'VETA MADRE',desc:'Oro +25%.',fx:b=>b.goldMul*=1.25},
 {id:'w7',b:'ric',i:6,cost:{gems:18},wave:30,ship:15,tag:'ORO',name:'EL DORADO',desc:'Oro +35%.',fx:b=>b.goldMul*=1.35},
 {id:'wc1',b:'ric',s:'C',i:0,cost:{gold:2000,gems:8},wave:18,ship:11,tag:'FIE',name:'FIEBRE DEL ORO',desc:'Oro +20%.',fx:b=>b.goldMul*=1.20},
 {id:'wc2',b:'ric',s:'C',i:1,cost:{gems:26},wave:30,ship:15,tag:'AUF',name:'ALQUIMIA FINA',desc:'Oro +20% adicional.',fx:b=>b.goldMul*=1.20},
 {id:'s1',b:'sab',i:0,cost:{gold:350,gems:2},wave:2,tag:'APR',name:'APRENDIZ',desc:'Experiencia +10%.',fx:b=>b.expMul*=1.10},
 {id:'s2',b:'sab',i:1,cost:{gold:800,gems:3},wave:5,tag:'EST',name:'ESTUDIANTE',desc:'Experiencia +12%.',fx:b=>b.expMul*=1.12},
 {id:'s3',b:'sab',i:2,cost:{gold:1500,gems:5},wave:9,tag:'ERU',name:'ERUDITO',desc:'Experiencia +15%.',fx:b=>b.expMul*=1.15},
 {id:'s4',b:'sab',i:3,cost:{gold:2400,gems:7},wave:14,ship:8,tag:'SBO',name:'SABIO',desc:'Experiencia +18%.',fx:b=>b.expMul*=1.18},
 {id:'s5',b:'sab',i:4,cost:{gems:11},wave:19,ship:10,tag:'ORA',name:'ORÁCULO',desc:'Experiencia +20%.',fx:b=>b.expMul*=1.20},
 {id:'s6',b:'sab',i:5,cost:{gold:4500,gems:12},wave:25,ship:13,tag:'MAE',name:'MAESTRÍA',desc:'Experiencia +25%.',fx:b=>b.expMul*=1.25},
 {id:'s7',b:'sab',i:6,cost:{gems:18},wave:32,ship:16,tag:'OMN',name:'OMNISCIENCIA',desc:'Experiencia +35%.',fx:b=>b.expMul*=1.35},
 {id:'sc1',b:'sab',s:'C',i:0,cost:{gold:2000,gems:8},wave:18,ship:11,tag:'ANC',name:'ANCESTRAL',desc:'Experiencia +20%.',fx:b=>b.expMul*=1.20},
 {id:'sc2',b:'sab',s:'C',i:1,cost:{gems:26},wave:30,ship:15,tag:'ILU',name:'ILUMINADO',desc:'Experiencia +20% adicional.',fx:b=>b.expMul*=1.20},
 /* ---- RAMA ELEMENTOS (⚡❄🌬🔥) ---- */
 {id:'e1',b:'ele',i:0,cost:{gold:800,gems:3},wave:4,tag:'ARC',name:'ARCO ELÉCTRICO',desc:'⚡ 10% al impactar: electrocuta a 2 enemigos cercanos (6 de daño).',fx:b=>b.elec={ch:.10,n:2,dmg:6}},
 {id:'e2',b:'ele',i:1,req:'e1',cost:{gold:1800,gems:6},wave:8,tag:'TOR',name:'TORMENTA',desc:'⚡ 15%: electrocuta a 3 enemigos (12 de daño).',fx:b=>b.elec={ch:.15,n:3,dmg:12}},
 {id:'e3',b:'ele',i:2,req:'e2',cost:{gems:20},wave:13,ship:10,tag:'JUP',name:'JÚPITER',desc:'⚡ TOPE · 25%: electrocuta a 4 enemigos (20 de daño) y los aturde 1 s.',fx:b=>b.elec={ch:.25,n:4,dmg:20,stun:true}},
 {id:'e4',b:'ele',i:3,cost:{gold:800,gems:3},wave:5,tag:'ESC',name:'ESCARCHA',desc:'❄ 12% al impactar: congela a 2 enemigos 1.5 s (no se mueven ni disparan).',fx:b=>b.ice={ch:.12,n:2,dur:1.5}},
 {id:'e5',b:'ele',i:4,req:'e4',cost:{gold:1800,gems:6},wave:9,tag:'GLA',name:'GLACIAR',desc:'❄ 18%: congela a 3 enemigos 2.5 s.',fx:b=>b.ice={ch:.18,n:3,dur:2.5}},
 {id:'e6',b:'ele',i:5,req:'e5',cost:{gems:20},wave:14,ship:10,tag:'CER',name:'CERO ABSOLUTO',desc:'❄ TOPE · 28%: congela a 4 enemigos 3.5 s y los congelados reciben +50% de daño.',fx:b=>{b.ice={ch:.28,n:4,dur:3.5};b.iceTop=true}},
 {id:'e7',b:'ele',i:6,cost:{gold:800,gems:3},wave:4,tag:'RAF',name:'RÁFAGA',desc:'🌬 Aura: repele a los enemigos a menos de 100 px de tu nave.',fx:b=>b.wind={rad:100,force:120,dmg:0,bul:false}},
 {id:'e8',b:'ele',i:7,req:'e7',cost:{gold:1800,gems:6},wave:9,tag:'CIC',name:'CICLÓN',desc:'🌬 Radio 140, empuje fuerte y desvía las balas enemigas cercanas.',fx:b=>b.wind={rad:140,force:190,dmg:0,bul:true}},
 {id:'e9',b:'ele',i:8,req:'e8',cost:{gems:20},wave:13,ship:10,tag:'TOR',name:'TORNADO',desc:'🌬 TOPE · Radio 180: los repelidos reciben daño y las balas cercanas estallan.',fx:b=>b.wind={rad:180,force:260,dmg:8,bul:true}},
 {id:'e10',b:'ele',i:9,cost:{gold:800,gems:3},wave:6,tag:'ASQ',name:'ASCUA',desc:'🔥 12% al impactar: incendia (4 de daño/s durante 3 s).',fx:b=>b.fire={ch:.12,dps:4,dur:3,spread:0,boom:false}},
 {id:'e11',b:'ele',i:10,req:'e10',cost:{gold:1800,gems:6},wave:10,tag:'LLA',name:'LLAMA',desc:'🔥 18%: 7 de daño/s durante 4 s y se propaga a 1 enemigo cercano.',fx:b=>b.fire={ch:.18,dps:7,dur:4,spread:1,boom:false}},
 {id:'e12',b:'ele',i:11,req:'e11',cost:{gems:20},wave:15,ship:11,tag:'INF',name:'INFERNO',desc:'🔥 TOPE · 28%: 12 de daño/s durante 5 s, propaga a 2 y los quemados explotan al morir.',fx:b=>b.fire={ch:.28,dps:12,dur:5,spread:2,boom:true}},
 /* ---- RAMA IMÁN (10 mejoras · radio de recogida) ---- */
 {id:'im1',b:'ima',i:0,req:null,cost:{gold:250},wave:1,tag:'IMA',name:'IMÁN BÁSICO',desc:'Radio de recogida +60%.',fx:b=>b.magnet+=.6},
 {id:'im2',b:'ima',i:1,req:'im1',cost:{gold:700},wave:4,tag:'IMA2',name:'IMÁN DOBLE',desc:'Radio de recogida +60% más.',fx:b=>b.magnet+=.6},
 {id:'im3',b:'ima',i:2,req:'im2',cost:{gems:5},wave:7,tag:'CMP',name:'CAMPO MAGNÉTICO',desc:'Radio +80%.',fx:b=>b.magnet+=.8},
 {id:'im4',b:'ima',i:3,req:'im3',cost:{gold:1300},wave:10,tag:'CMP2',name:'BOBINAS DE FLUJO',desc:'Radio +80% más.',fx:b=>b.magnet+=.8},
 {id:'im5',b:'ima',i:4,req:'im4',cost:{gems:8},wave:13,tag:'ATR',name:'ATRAYENTE',desc:'Radio +100%. El oro vuela hacia ti.',fx:b=>b.magnet+=1},
 {id:'im6',b:'ima',i:5,req:'im5',cost:{gold:2200,gems:4},wave:16,ship:7,tag:'ATR2',name:'ATRAYENTE PLUS',desc:'Radio +100% más.',fx:b=>b.magnet+=1},
 {id:'im7',b:'ima',i:6,req:'im6',cost:{gems:10},wave:19,ship:9,tag:'MGR',name:'NÚCLEO MAGNETAR',desc:'Radio +120%.',fx:b=>b.magnet+=1.2},
 {id:'im8',b:'ima',i:7,req:'im7',cost:{gold:3000,gems:6},wave:22,ship:11,tag:'MGR2',name:'MAGNETAR PLUS',desc:'Radio +120% más.',fx:b=>b.magnet+=1.2},
 {id:'im9',b:'ima',i:8,req:'im8',cost:{gems:14},wave:26,ship:12,tag:'SNG',name:'SINGULARIDAD',desc:'Radio +140%. Nada escapa.',fx:b=>b.magnet+=1.4},
 {id:'im10',b:'ima',i:9,req:'im9',cost:{gold:3600,gems:8},wave:30,ship:14,tag:'HOR',name:'HORADADOR ESTELAR',desc:'TOPE · Radio +160%: recoges el botín de media pantalla.',fx:b=>b.magnet+=1.6},
 /* ---- RAMA PROSPERIDAD (experiencia + oro a la vez) ---- */
 {id:'fp1',b:'for',i:0,req:null,cost:{gold:300,gems:2},wave:2,tag:'PRM',name:'PROMESA',desc:'+10% de oro y +10% de experiencia.',fx:b=>{b.goldMul*=1.10;b.expMul*=1.10}},
 {id:'fp2',b:'for',i:1,req:'fp1',cost:{gold:700,gems:3},wave:5,tag:'INV',name:'INVERSIÓN',desc:'+12% de oro y +12% de experiencia.',fx:b=>{b.goldMul*=1.12;b.expMul*=1.12}},
 {id:'fp3',b:'for',i:2,req:'fp2',cost:{gold:1200,gems:5},wave:8,tag:'DIV',name:'DIVIDENDO',desc:'+14% de oro y +14% de experiencia.',fx:b=>{b.goldMul*=1.14;b.expMul*=1.14}},
 {id:'fp4',b:'for',i:3,req:'fp3',cost:{gold:1800,gems:7},wave:12,ship:7,tag:'ACR',name:'ACUMULACIÓN',desc:'+16% de oro y +16% de experiencia.',fx:b=>{b.goldMul*=1.16;b.expMul*=1.16}},
 {id:'fp5',b:'for',i:4,req:'fp4',cost:{gems:10},wave:16,ship:9,tag:'CMP',name:'COMPOUNDING',desc:'+18% de oro y +18% de experiencia.',fx:b=>{b.goldMul*=1.18;b.expMul*=1.18}},
 {id:'fp6',b:'for',i:5,req:'fp5',cost:{gold:3000,gems:10},wave:20,ship:11,tag:'EMP',name:'IMPERIO',desc:'+20% de oro y +20% de experiencia.',fx:b=>{b.goldMul*=1.20;b.expMul*=1.20}},
 {id:'fp7',b:'for',i:6,req:'fp6',cost:{gems:14},wave:25,ship:13,tag:'DIN',name:'DINASTÍA',desc:'+22% de oro y +22% de experiencia.',fx:b=>{b.goldMul*=1.22;b.expMul*=1.22}},
 {id:'fp8',b:'for',i:7,req:'fp7',cost:{gold:4200,gems:12},wave:30,ship:15,tag:'EPO',name:'EPOPEYA DEL ORO',desc:'TOPE · +25% de oro y +25% de experiencia.',fx:b=>{b.goldMul*=1.25;b.expMul*=1.25}},
 /* ---- RAMA AZAR (poderes temporales por sorteo) ---- */
 {id:'sz0',b:'sor',i:0,req:null,cost:{gold:800,gems:12},wave:6,tag:'ENG',name:'ENIGMA',desc:'Desbloquea el PROTOCOLO AZAR: 35% de activar un poder temporal al azar al iniciar cada oleada (dura 2 oleadas).',fx:b=>b.azar=true},
 {id:'sz1',b:'sor',i:1,req:'sz0',cost:{gold:500},wave:8,tag:'AZ1',name:'PROTOCOLO I',desc:'Probabilidad del sorteo +5% (35% → 40%).',fx:b=>b.azar=true},
 {id:'sz2',b:'sor',i:2,req:'sz1',cost:{gems:4},wave:10,tag:'AZ2',name:'PROTOCOLO II',desc:'Probabilidad +5% (→ 45%).',fx:b=>b.azar=true},
 {id:'sz3',b:'sor',i:3,req:'sz2',cost:{gold:900,gems:2},wave:12,ship:8,tag:'AZ3',name:'PROTOCOLO III',desc:'Probabilidad +5% (→ 50%).',fx:b=>b.azar=true},
 {id:'sz4',b:'sor',i:4,req:'sz3',cost:{gems:6},wave:15,tag:'AZ4',name:'PROTOCOLO IV',desc:'Probabilidad +5% (→ 55%).',fx:b=>b.azar=true},
 {id:'sz5',b:'sor',i:5,req:'sz4',cost:{gold:1400,gems:3},wave:18,ship:10,tag:'AZ5',name:'PROTOCOLO V',desc:'Probabilidad +5% (→ 60%).',fx:b=>b.azar=true},
 {id:'sz6',b:'sor',i:6,req:'sz5',cost:{gems:8},wave:21,tag:'AZ6',name:'PROTOCOLO VI',desc:'Probabilidad +5% (→ 65%).',fx:b=>b.azar=true},
 {id:'sz7',b:'sor',i:7,req:'sz6',cost:{gold:1600,gems:4},wave:24,ship:12,tag:'AZ7',name:'PROTOCOLO VII',desc:'Probabilidad +5% (→ 70%).',fx:b=>b.azar=true},
 {id:'sz8',b:'sor',i:8,req:'sz7',cost:{gems:10},wave:27,ship:13,tag:'AZ8',name:'PROTOCOLO VIII',desc:'Probabilidad +5% (→ 75%).',fx:b=>b.azar=true},
 {id:'sz9',b:'sor',i:9,req:'sz8',cost:{gold:2400,gems:5},wave:30,ship:14,tag:'AZ9',name:'GOBIERNO DEL AZAR',desc:'TOPE · Probabilidad +5% (→ 80%).',fx:b=>b.azar=true},
 /* ---- RAMA ENLACE (curación al compañero · en solo te cura a ti) ---- */
 {id:'en1',b:'enl',i:0,req:null,cost:{gold:900,gems:5},wave:6,tag:'ENL',name:'ENLACE VITAL',desc:'Cura 1 PV al compañero cada 5 s (en solo: te cura a ti).',fx:b=>b.linkHeal=1},
 {id:'en2',b:'enl',i:1,req:'en1',cost:{gold:1400,gems:4},wave:10,tag:'ENL2',name:'ENLACE ESTABLE',desc:'Cura 2 PV cada 5 s.',fx:b=>b.linkHeal=2},
 {id:'en3',b:'enl',i:2,req:'en2',cost:{gems:8},wave:14,ship:8,tag:'ENL3',name:'ENLACE TENSAO',desc:'Cura 3 PV cada 5 s.',fx:b=>b.linkHeal=3},
 {id:'en4',b:'enl',i:3,req:'en3',cost:{gold:2200,gems:6},wave:18,ship:10,tag:'ENL4',name:'ENLACE RÁPIDO',desc:'Cura 4 PV cada 4.5 s.',fx:b=>{b.linkHeal=4;b.linkRate=4.5}},
 {id:'en5',b:'enl',i:4,req:'en4',cost:{gems:12},wave:23,ship:12,tag:'ENL5',name:'VÍNCULO PROFUNDO',desc:'Cura 6 PV cada 4 s.',fx:b=>{b.linkHeal=6;b.linkRate=4}},
 {id:'en6',b:'enl',i:5,req:'en5',cost:{gems:16},wave:28,ship:14,tag:'ALM',name:'ALMA GEMELA',desc:'TOPE · Cura 8 PV cada 3.5 s.',fx:b=>{b.linkHeal=8;b.linkRate=3.5}},
 /* ---- NODOS DE FUSIÓN (final compartido: llega por cualquiera de las dos ramas) ---- */
 {id:'m1',b:'mrg',i:0,x:250,y:1210,cost:{gems:20},wave:24,ship:14,tag:'TIT',name:'OJO DEL TITÁN',desc:'Fusión OFENSIVA·RAPIDEZ (crítico + daño + cadencia): daño +1, crítico +10%, cadencia +12%.',any:['o8','r7'],fx:b=>{b.dmg+=1;b.crit+=.10;b.rate*=1.12}},
 {id:'m3',b:'mrg',i:1,x:250,y:1330,cost:{gems:20},wave:24,ship:14,tag:'SIN',name:'SINGULARIDAD DE HIERRO',desc:'Fusión DEFENSA·TÁCTICA: +4 de vida máxima y +1 dron orbital.',any:['d8','t8'],fx:b=>{b.maxHp+=4;b.drones++}},
 {id:'m2',b:'mrg',i:2,x:582,y:1210,cost:{gold:2400,gems:10},wave:28,ship:15,tag:'ECO',name:'ECONOMÍA DE GUERRA',desc:'Fusión RIQUEZA·SABIDURÍA: +20% de oro y +20% de experiencia.',any:['w7','s7'],fx:b=>{b.goldMul*=1.2;b.expMul*=1.2}},
 {id:'m4',b:'mrg',i:3,x:535,y:1330,cost:{gems:22},wave:30,ship:15,tag:'GRA',name:'CAMPO UNIFICADO',desc:'Fusión SOPORTE·IMÁN: imán +120% y balas enemigas 10% más lentas.',any:['u8','im10'],fx:b=>{b.magnet+=1.2;b.slow*=.9}},
 {id:'m5',b:'mrg',i:4,x:962,y:1210,cost:{gold:3000,gems:12},wave:32,ship:16,tag:'COM',name:'COMODÍN ETERNO',desc:'Fusión PROSPERIDAD·AZAR: +6% de azar permanente, +15% de oro y experiencia.',any:['fp8','sz9'],fx:b=>{b.azarBonus=(b.azarBonus||0)+.06;b.goldMul*=1.15;b.expMul*=1.15}},
 /* ===== v4.9: rama ALIADO — bot de combate; mejoras CARAS con gemas ===== */
 {id:'b0',b:'bot',i:0,cost:{gold:1200},wave:6,tag:'ALI',name:'ALIADO · CB',desc:'Desbloquea tu bot de combate: una nave autónoma que vuela contigo y dispara al enemigo más cercano (110% de tu daño).',fx:b=>b.bot=1},
 {id:'b1',b:'bot',i:1,cost:{gems:25},wave:10,req:'b0',tag:'BCA',name:'CAÑÓN DEL ALIADO',desc:'El bot dispara con el DOBLE de daño.',fx:b=>b.botDmg*=2},
 {id:'b2',b:'bot',i:2,cost:{gems:40},wave:14,req:'b1',tag:'BSO',name:'SOBRECARGA',desc:'El bot dispara un 60% más rápido.',fx:b=>b.botRate*=1.6},
 {id:'b3',b:'bot',i:3,cost:{gems:55},wave:18,req:'b2',tag:'BMI',name:'MISILES DEL ALIADO',desc:'Cada 4.5 s el bot lanza un misil rastreador (daño x3).',fx:b=>b.botMsl=true},
 {id:'b4',b:'bot',i:4,cost:{gems:75},wave:22,req:'b3',tag:'BGE',name:'NÚCLEO GEMELO',desc:'+1 bot de combate adicional.',fx:b=>b.botTwin++},
 {id:'b5',b:'bot',i:5,cost:{gems:100},wave:26,req:'b4',tag:'BDE',name:'DEVASTADOR',desc:'El bot hace x2.5 de daño y sus balas perforan +2 enemigos.',fx:b=>{b.botDmg*=2.5;b.botPrc+=2}},
];
TREE.forEach(nd=>{
  if(nd.b==='mrg')return;
  if(nd.b==='ele'){nd.x=BX.ele;nd.y=92+nd.i*88;}
  else{nd.x=nd.s?BX[nd.b]+(nd.s==='A'?-30:30):BX[nd.b];
       nd.y=nd.s?830+nd.i*95:92+nd.i*92;}
});
const byBranch={};
for(const nd of TREE)(byBranch[nd.b]=byBranch[nd.b]||[]).push(nd);
for(const b in byBranch){
  if(b==='mrg')continue;
  const arr=byBranch[b].filter(n=>!n.s).sort((a,c)=>a.i-c.i);
  if(b!=='ele'){
    for(let i=0;i<arr.length-1;i++)arr[i].next=arr[i+1].id;
    const last=arr[arr.length-1];
    const sA=byBranch[b].filter(n=>n.s==='A').sort((a,c)=>a.i-c.i);
    const sB=byBranch[b].filter(n=>n.s==='B').sort((a,c)=>a.i-c.i);
    const sC=byBranch[b].filter(n=>n.s==='C').sort((a,c)=>a.i-c.i);
    last.subA=sA[0]?sA[0].id:null; last.subB=sB[0]?sB[0].id:null; last.subC=sC[0]?sC[0].id:null;
    for(let i=0;i<sA.length-1;i++)sA[i].next=sA[i+1].id;
    for(let i=0;i<sB.length-1;i++)sB[i].next=sB[i+1].id;
    for(let i=0;i<sC.length-1;i++)sC[i].next=sC[i+1].id;
  }
}
const icoGold='<svg viewBox="0 0 12 12"><circle cx="6" cy="6" r="4.6" fill="none" stroke="#FFD166" stroke-width="1.6"/><circle cx="6" cy="6" r="1.8" fill="#FFD166"/></svg>';
const icoGem='<svg viewBox="0 0 12 12"><path d="M6 1 L11 6 L6 11 L1 6 Z" fill="none" stroke="#64C7FF" stroke-width="1.6"/><path d="M6 3.4 L8.6 6 L6 8.6 L3.4 6 Z" fill="#64C7FF"/></svg>';
const costHTML=c=>{
  const parts=[];
  if(c.gold)parts.push(`<span class="cs">${icoGold}<b>${c.gold}</b></span>`);
  if(c.gems)parts.push(`<span class="cs">${icoGem}<b>${c.gems}</b></span>`);
  return parts.join('');
};
const canPay=c=>(!c.gold||save.gold>=c.gold)&&(!c.gems||save.gems>=c.gems);
function pay(c){ if(c.gold)save.gold-=c.gold; if(c.gems)save.gems-=c.gems; persist(); }
const ownedCount=()=>TREE.filter(n=>has(n.id)).length;

