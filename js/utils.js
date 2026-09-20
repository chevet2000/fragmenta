'use strict';
'use strict';
window.addEventListener('error',function(ev){
  var b=document.getElementById('errbox');
  if(b){ b.classList.remove('hidden'); b.textContent='ERROR: '+(ev.message||'desconocido'); }
});

/* ============ utilidades ============ */
const $=s=>document.querySelector(s);
/* v4.8.1: enlace seguro de eventos. Si el elemento no existe (HTML/JS desfasados
   mezclados por la caché del navegador), se ignora en vez de lanzar
   "Cannot read properties of null (reading 'addEventListener')". */
const bindEl=(sel,ev,fn,opt)=>{try{const el=document.querySelector(sel);if(el)el.addEventListener(ev,fn,opt);}catch(e){}};
const clamp=(v,a,b)=>v<a?a:(v>b?b:v);
const rand=(a,b)=>a+Math.random()*(b-a);
const irand=(a,b)=>Math.floor(a+Math.random()*(b-a+1));
const lerp=(a,b,k)=>a+(b-a)*k;
const TAU=Math.PI*2;
const easeOut=t=>1-Math.pow(1-t,3);
function qbez(x0,y0,x1,y1,x2,y2,t){const u=1-t;return{x:u*u*x0+2*u*t*x1+t*t*x2,y:u*u*y0+2*u*t*y1+t*t*y2};}
function vib(ms){ if(navigator.vibrate){ try{navigator.vibrate(ms)}catch(e){} } }
const fmtT=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=irand(0,i);[a[i],a[j]]=[a[j],a[i]];}return a;}
function interleave(arrs){const out=[];let go=true,i=0;
  while(go){go=false;for(const a of arrs){if(i<a.length){out.push(a[i]);go=true;}}i++;}return out;}
function makeCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let c='';for(let i=0;i<5;i++)c+=A[irand(0,A.length-1)];return c;}
function goFullscreen(){
  try{
    const el=document.documentElement;
    const fn=el.requestFullscreen||el.webkitRequestFullscreen||el.msRequestFullscreen;
    if(fn){const p=fn.call(el);if(p&&p.catch)p.catch(()=>{});}
  }catch(e){}
}
function copyText(t,msg){
  if(navigator.clipboard){navigator.clipboard.writeText(t).then(
    ()=>{if(msg)banner('COPIADO',msg);},()=>{if(msg)banner('COPIA MANUAL','Selecciona y copia el texto');}
  ).catch(()=>{});}
  else if(msg)banner('COPIA MANUAL','Selecciona y copia el texto');
}

/* ============ RNG determinista ============ */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=1779033703;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),3432918353);h=h<<13|h>>>19;}return h>>>0;}
let R=Math.random;
let weeklyMode=false;
function weekSeed(){const d=new Date();const start=new Date(d.getFullYear(),0,1);
  const w=Math.floor((d-start)/604800000)+1;return d.getFullYear()+'W'+w;}
const rrand=(a,b)=>a+R()*(b-a);
const irandR=(a,b)=>Math.floor(a+R()*(b-a+1));

/* ============ lienzo ============ */
const cv=$('#game'), ctx=cv.getContext('2d');
let W=0,H=0,DPR=1;
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  W=window.innerWidth; H=window.innerHeight;
  cv.width=W*DPR; cv.height=H*DPR;
  cv.style.width=W+'px'; cv.style.height=H+'px';
  ctx.setTransform(DPR,0,0,DPR,0,0);
}
window.addEventListener('resize',resize); resize();

/* ============ PWA ============ */
function makeIconDataURL(size){
  const c=document.createElement('canvas');c.width=c.height=size;
  const g=c.getContext('2d');
  g.fillStyle='#07090D';g.fillRect(0,0,size,size);
  const s=size/64;
  g.save();g.translate(size/2,size/2);
  g.strokeStyle='#FFD166';g.lineWidth=3*s;g.fillStyle='rgba(255,209,102,.14)';
  g.beginPath();
  g.moveTo(0,-21*s);g.lineTo(6*s,-5*s);g.lineTo(19*s,10*s);g.lineTo(7*s,7*s);g.lineTo(5*s,16*s);
  g.lineTo(-5*s,16*s);g.lineTo(-7*s,7*s);g.lineTo(-19*s,10*s);g.lineTo(-6*s,-5*s);g.closePath();
  g.fill();g.stroke();
  g.fillStyle='#7FD1B9';
  g.beginPath();g.moveTo(0,-9*s);g.lineTo(4.4*s,-2*s);g.lineTo(0,5*s);g.lineTo(-4.4*s,-2*s);g.closePath();g.fill();
  g.strokeStyle='#7FD1B9';g.lineWidth=1.6*s;
  g.beginPath();g.moveTo(-24*s,22*s);g.lineTo(24*s,22*s);g.stroke();
  g.restore();
  return c.toDataURL('image/png');
}
function buildManifest(){
  try{
    const m={name:'FRAGMENTA',short_name:'FRAGMENTA',
      description:'Purga geométrica infinita — roguelite de naves y figuras',
      start_url:location.href.split('#')[0],
      display:'standalone',orientation:'portrait',
      background_color:'#07090D',theme_color:'#07090D',
      icons:[
        {src:makeIconDataURL(192),sizes:'192x192',type:'image/png',purpose:'any'},
        {src:makeIconDataURL(512),sizes:'512x512',type:'image/png',purpose:'any maskable'}
      ]};
    let l=document.getElementById('manifestDyn');
    if(!l){l=document.createElement('link');l.id='manifestDyn';l.rel='manifest';document.head.appendChild(l);}
    l.href='data:application/manifest+json,'+encodeURIComponent(JSON.stringify(m));
    let ai=document.getElementById('appleIconDyn');
    if(!ai){ai=document.createElement('link');ai.id='appleIconDyn';ai.rel='apple-touch-icon';document.head.appendChild(ai);}
    ai.href=makeIconDataURL(180);
  }catch(e){}
}
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();deferredPrompt=e;
  const b=$('#btnInstall');if(b)b.classList.remove('hidden');
});
window.addEventListener('appinstalled',()=>{
  deferredPrompt=null;
  const b=$('#btnInstall');if(b)b.classList.add('hidden');
});

