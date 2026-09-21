'use strict';
/* ============ v4.26: QR DE SALA ============
   El anfitrión pinta un QR con el CÓDIGO de la sala (solo esos 5
   caracteres, sin URL) y el compañero, si está cerca, puede escanearlo
   desde «ONLINE · UNIRSE» → ESCANEAR QR: la cámara lee el código, lo
   rellena y entra directo al lobby sin teclear nada.
   Generador: qrcode-generator (MIT) — bundled en js/vendor/qrcode.js.
   Escáner: BarcodeDetector (Chrome/Android) y, si el navegador no lo
   trae, decodificador jsQR (MIT) — bundled en js/vendor/jsQR.js.
   Sin cámara o sin soporte, el código manual sigue igual. */

/* ---- QR del anfitrión (se dibuja al crear la sala) ---- */
function drawLobbyQR(){
  const cv=$('#lobbyQr');if(!cv)return;
  const hint=$('#qrHint');
  if(!net.code||typeof qrcode!=='function'){
    cv.classList.add('hidden');if(hint)hint.classList.add('hidden');return;
  }
  try{
    const qr=qrcode(0,'M');qr.addData(net.code);qr.make();
    const n=qr.getModuleCount(),quiet=4;
    const cell=Math.max(3,Math.floor(150/(n+quiet*2)));
    const size=(n+quiet*2)*cell;
    cv.width=size;cv.height=size;
    const ctx=cv.getContext('2d');
    ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,size,size); /* zona de silencio */
    ctx.fillStyle='#07090D';
    for(let y=0;y<n;y++)for(let x=0;x<n;x++)
      if(qr.isDark(y,x))ctx.fillRect((x+quiet)*cell,(y+quiet)*cell,cell,cell);
    cv.classList.remove('hidden');
    if(hint)hint.classList.remove('hidden');
  }catch(e){
    cv.classList.add('hidden');if(hint)hint.classList.add('hidden');
  }
}

/* ---- escáner del cliente ---- */
let scanStream=null,scanRAF=0,scanDet=null,scanLastT=0,scanCv=null;
function scanStat(msg,cls){
  const el=$('#scanStat');
  if(el)el.innerHTML='<span class="'+(cls||'prof')+'">'+msg+'</span>';
}
async function openScanner(){
  const box=$('#scanBox');if(!box)return;
  audio();
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){
    scanStat('ESTE NAVEGADOR NO PUEDE USAR LA CÁMARA · INGRESA EL CÓDIGO','err');return;
  }
  /* detector nativo (Chrome/Android); si no existe, jsQR */
  if(scanDet===null){
    try{scanDet=('BarcodeDetector' in window)?new window.BarcodeDetector():false;}
    catch(e){scanDet=false;}
  }
  if(scanDet===false&&typeof jsQR!=='function'){
    scanStat('TU NAVEGADOR NO SOPORTA ESCANEAR · INGRESA EL CÓDIGO','err');return;
  }
  try{
    scanStream=await navigator.mediaDevices.getUserMedia(
      {audio:false,video:{facingMode:'environment',width:{ideal:720},height:{ideal:720}}});
  }catch(e){
    scanStream=null;
    scanStat('SIN ACCESO A LA CÁMARA · PERMÍTELA O INGRESA EL CÓDIGO','err');return;
  }
  const v=$('#scanVid');
  v.srcObject=scanStream;
  try{await v.play();}catch(e){}
  box.classList.remove('hidden');
  scanStat('APUNTA AL QR DE LA SALA');
  const tick=()=>{
    if(!scanStream)return;
    if(v.readyState>=2&&performance.now()-scanLastT>140){ /* ~7 lecturas/s */
      scanLastT=performance.now();
      if(scanDet){
        scanDet.detect(v).then(cs=>{
          if(scanStream&&cs&&cs.length)scanHit(cs[0].rawValue);
        }).catch(()=>{});
      }else if(typeof jsQR==='function'){
        const w=v.videoWidth,h=v.videoHeight;
        if(w&&h){
          scanCv=scanCv||document.createElement('canvas');
          scanCv.width=w;scanCv.height=h;
          const ctx=scanCv.getContext('2d');
          ctx.drawImage(v,0,0);
          try{
            const img=ctx.getImageData(0,0,w,h);
            const r=jsQR(img.data,w,h,{inversionAttempts:'dontInvert'});
            if(r&&r.data)scanHit(r.data);
          }catch(e){}
        }
      }
    }
    scanRAF=requestAnimationFrame(tick);
  };
  scanRAF=requestAnimationFrame(tick);
}
function scanHit(txt){
  if(!scanStream)return; /* la ventana ya se cerró: ignorar lecturas en vuelo */
  const m=String(txt||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
  if(!/^[A-Z0-9]{5}$/.test(m)){scanStat('QR NO VÁLIDO · APUNTA AL QR DE LA SALA','err');return;}
  closeScanner();
  $('#joinInput').value=m;
  joinRoom(m); /* entra directo al lobby */
}
function closeScanner(){
  if(scanRAF){cancelAnimationFrame(scanRAF);scanRAF=0;}
  if(scanStream){try{scanStream.getTracks().forEach(t=>t.stop());}catch(e){}}
  scanStream=null;
  const v=$('#scanVid');if(v)v.srcObject=null;
  const box=$('#scanBox');if(box)box.classList.add('hidden');
}
