'use strict';
/* ============ audio ============ */
let actx=null,masterGain=null,muted=false;
function audio(){
  if(!actx){
    const AC=window.AudioContext||window.webkitAudioContext; if(!AC)return;
    actx=new AC(); masterGain=actx.createGain(); masterGain.gain.value=.5; masterGain.connect(actx.destination);
  }
  if(actx.state==='suspended')actx.resume();
  /* v4.8: la música del menú arranca sola al primer toque (sin partida activa) */
  if(!MUS.playing&&!runActive)musStart();
}
function tone(f0,f1,dur,type,vol,delay){
  if(!actx||muted)return;
  const t=actx.currentTime+(delay||0);
  const o=actx.createOscillator(),g=actx.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t);
  o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(masterGain);o.start(t);o.stop(t+dur+.02);
}
let lastHitS=0,lastCoinS=0,lastCritS=0;
const SFX={
  shoot(){tone(680,300,.06,'triangle',.012)},
  hit(){const n=performance.now();if(n-lastHitS<50)return;lastHitS=n;tone(300,190,.045,'square',.03)},
  kill(){tone(320,55,.18,'sawtooth',.05)},
  coin(){const n=performance.now();if(n-lastCoinS<70)return;lastCoinS=n;tone(1100,1650,.08,'sine',.045)},
  gem(){tone(900,1800,.1,'sine',.05);tone(1350,2400,.1,'sine',.035,.06)},
  hurt(){tone(210,55,.25,'sawtooth',.09)},
  lvl(){[440,554,659,880].forEach((f,i)=>tone(f,f,.12,'square',.045,i*.09))},
  nova(){tone(90,900,.35,'sawtooth',.08)},
  buy(){tone(600,950,.1,'square',.06);tone(950,1250,.1,'square',.05,.09)},
  boss(){tone(130,70,.6,'sawtooth',.1);tone(90,50,.7,'square',.07,.1)},
  relic(){[523,659,784,1047].forEach((f,i)=>tone(f,f,.16,'sine',.05,i*.08))},
  rescue(){tone(300,700,.2,'sine',.06);tone(500,1100,.25,'sine',.05,.12)},
  emo(){tone(880,1500,.14,'sine',.06)},
  call(){tone(660,440,.18,'square',.06)},
  chest(){tone(400,800,.2,'square',.06);tone(800,1600,.25,'square',.05,.15)},
  laser(){tone(1400,200,.4,'sawtooth',.05)},
  warp(){tone(200,1200,.3,'sine',.05)},
  zap(){tone(1500,300,.1,'sawtooth',.045)},
  /* v4.13: disparo del CAÑÓN ANIQUILADOR (arma definitiva) */
  ult(){tone(1800,120,.5,'sawtooth',.09);tone(70,45,.55,'square',.08);tone(2400,300,.3,'sine',.05,.05)},
  freeze(){tone(1200,500,.15,'sine',.04)},
  whoosh(){tone(300,700,.2,'sine',.04)},
  ignite(){tone(200,90,.25,'sawtooth',.05)},
};
/* v4.10: campanita aguda de CRÍTICO (con tope anti-spam de 70 ms) */
function critPing(){
  const n=performance.now();if(n-lastCritS<70)return;lastCritS=n;
  tone(1500,760,.09,'square',.05);tone(2200,1100,.07,'sine',.03,.02);
}

/* ============ MÚSICA ============ */
const MUS={playing:false,step:0,nextT:0,int:null,bpm:112,noise:null};
function musInit(){
  if(!actx||MUS.noise)return;
  const len=Math.floor(actx.sampleRate*.5);
  const buf=actx.createBuffer(1,len,actx.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=Math.random()*2-1;
  MUS.noise=buf;
}
function musNote(f,dur,type,vol,when){
  if(!actx||muted)return;
  const o=actx.createOscillator(),g=actx.createGain();
  o.type=type;o.frequency.value=f;
  g.gain.setValueAtTime(.0001,when);
  g.gain.linearRampToValueAtTime(vol,when+.02);
  g.gain.exponentialRampToValueAtTime(.0001,when+dur);
  o.connect(g);g.connect(masterGain);
  o.start(when);o.stop(when+dur+.05);
}
function musHat(when,vol){
  if(!actx||muted||!MUS.noise)return;
  const s=actx.createBufferSource();s.buffer=MUS.noise;
  const f=actx.createBiquadFilter();f.type='highpass';f.frequency.value=6500;
  const g=actx.createGain();
  g.gain.setValueAtTime(vol,when);
  g.gain.exponentialRampToValueAtTime(.0001,when+.05);
  s.connect(f);f.connect(g);g.connect(masterGain);
  s.start(when);s.stop(when+.06);
}
const CHORDS=[[110,220,261.6,329.6],[87.31,174.6,220,261.6],[65.41,130.8,164.8,196],[98,196,246.9,293.7]];
function musSched(){
  if(!MUS.playing||!actx||muted||!save.mus)return;
  const spb=60/MUS.bpm/4;
  while(MUS.nextT<actx.currentTime+.35){
    const st=MUS.step,bar=Math.floor(st/16)%4,ch=CHORDS[bar];
    const inGame=(runActive&&state==='play');
    if(inGame){
      const bossOn=!!boss;
      if(st%4===0)musNote(ch[0],spb*3.2,'sawtooth',.045,MUS.nextT);
      if(bossOn&&st%4===2)musNote(ch[0]/2,spb*1.8,'square',.05,MUS.nextT);
      const arp=[ch[1],ch[2],ch[3],ch[2]*2];
      const inten=bossOn?.9:(run.level>=8?.6:.35);
      if(st%2===1&&Math.random()<inten)musNote(arp[irand(0,3)],spb*1.4,'square',.026,MUS.nextT);
      if(st%2===0)musHat(MUS.nextT,bossOn?.05:.028);
      if(bossOn&&st%8===4)musNote(ch[3]*2,spb*2,'triangle',.04,MUS.nextT);
    }else if(!runActive){
      /* v4.8: MÚSICA DEL MENÚ — Ambiente tranquilo y espacial a 84 bpm
         v4.10: volumen subido x2.5 a petición del piloto
         v4.13: OTRO SALTO de volumen (x2) y más cuerpo: bajo reforzado,
         pedal constante, arpegio SIEMPRE (ya no al azar), destello y un
         pulso de hi-hat muy suave para que la melodía se sostenga. */
      if(st%16===0){musNote(ch[0]/2,spb*15,'sine',.15,MUS.nextT);
        musNote(ch[0],spb*15,'triangle',.055,MUS.nextT);}
      if(st%16===8)musNote(ch[1],spb*9,'triangle',.085,MUS.nextT);
      if(st%4===2)musNote(ch[2]*(st%16===10?2:1),spb*2.6,'sine',.055,MUS.nextT);
      if(st%8===6&&Math.random()<.7)musNote(ch[3]*2,spb*3,'triangle',.04,MUS.nextT);
      if(st%4===0)musHat(MUS.nextT,.012);
    }
    MUS.step++;
    MUS.nextT+=spb;
  }
  /* v4.8: tempo según contexto — partida acelera, menú respira lento */
  MUS.bpm=(runActive&&state==='play')?112+Math.min(36,run.level*1.2)+(boss?18:0):84;
}
function musStart(){
  if(!actx||MUS.playing)return;
  musInit();
  MUS.playing=true;MUS.step=0;MUS.nextT=actx.currentTime+.1;
  if(MUS.int)clearInterval(MUS.int);
  MUS.int=setInterval(musSched,80);
}
function musStop(){
  MUS.playing=false;
  if(MUS.int){clearInterval(MUS.int);MUS.int=null;}
}

