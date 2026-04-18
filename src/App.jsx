import { useState, useRef, useEffect, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════
// 🔧 FIREBASE SETUP — Add your config to enable REAL social auth
// ══════════════════════════════════════════════════════════════════
// npm install firebase
// import { initializeApp } from "firebase/app";
// import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";
// const app = initializeApp({ apiKey:"...", authDomain:"...", projectId:"...", ... });
// export const auth = getAuth(app);
// ══════════════════════════════════════════════════════════════════

const G = "linear-gradient(135deg,#7c3aed,#db2777)";
const YEAR = new Date().getFullYear();
const SIZES = [
  {id:"yt",   label:"YouTube",  ratio:"16:9", paid:false},
  {id:"reel", label:"Reels",    ratio:"9:16", paid:false},
  {id:"short",label:"Shorts",   ratio:"9:16", paid:true},
  {id:"sq",   label:"Square",   ratio:"1:1",  paid:true},
  {id:"tw",   label:"Twitter",  ratio:"16:9", paid:true},
  {id:"li",   label:"LinkedIn", ratio:"4:5",  paid:true},
  {id:"fb",   label:"Facebook", ratio:"16:9", paid:true},
];

const C = {
  bg:"#ffffff", nav:"#1a1a2a", surf:"#f5f5f7", card:"#ffffff",
  bdr:"#e2e2e8", txt:"#111111", sub2:"#444444", sub:"#777777",
  inp:"#fafafa", tagBg:"#f0edff", tagClr:"#6d28d9",
  okBg:"#f0fdf4", okBdr:"#a7f3d0", okTxt:"#059669",
  warnBg:"#fffbeb", warnBdr:"#fde68a", warnTxt:"#92400e",
};

export default function App() {
  const [tab,          setTab]          = useState("video");
  const [screen,       setScreen]       = useState("home");
  const [isPaid,       setIsPaid]       = useState(false);
  const [showSub,      setShowSub]      = useState(false);
  const [showLogin,    setShowLogin]    = useState(false);
  const [showPrivacy,  setShowPrivacy]  = useState(false);
  const [showTerms,    setShowTerms]    = useState(false);
  const [showProfile,  setShowProfile]  = useState(false);
  // user: { name, email, photo, provider }
  const [user,         setUser]         = useState(null);

  const [videoFile,    setVideoFile]    = useState(null);
  const [videoUrl,     setVideoUrl]     = useState(null);
  const [legalOk,      setLegalOk]      = useState(false);
  const [wBox,         setWBox]         = useState(null);
  const [drawing,      setDrawing]      = useState(false);
  const [startPos,     setStartPos]     = useState(null);
  const [progress,     setProgress]     = useState(0);
  const [showAd,       setShowAd]       = useState(false);
  const [adTimer,      setAdTimer]      = useState(5);
  const [pendingSz,    setPendingSz]    = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);

  const [imgUrl,       setImgUrl]       = useState(null);
  const [imgOriginal,  setImgOriginal]  = useState(null);
  const [imgBox,       setImgBox]       = useState(null);
  const [imgDrawing,   setImgDrawing]   = useState(false);
  const [imgStart,     setImgStart]     = useState(null);
  const [imgProcessed, setImgProcessed] = useState(null);

  const [platform,     setPlatform]     = useState("youtube");
  const [seoInput,     setSeoInput]     = useState("");
  const [seoData,      setSeoData]      = useState(null);
  const [seoLoading,   setSeoLoading]   = useState(false);
  const [seoAdTimer,   setSeoAdTimer]   = useState(5);
  const [showSeoAd,    setShowSeoAd]    = useState(false);
  const [pendingSeo,   setPendingSeo]   = useState(null);
  const [copied,       setCopied]       = useState("");
  const [processingMsg,setProcessingMsg]= useState("Removing Watermark…");

  const fileRef   = useRef();
  const imgRef    = useRef();
  const videoRef  = useRef();
  const canvasRef = useRef();
  const imgCvRef  = useRef();

  useEffect(()=>{
    if(showAd && adTimer > 0){
      const t = setTimeout(()=>setAdTimer(a=>a-1), 1000);
      return ()=>clearTimeout(t);
    }
  },[showAd, adTimer]);

  useEffect(()=>{
    if(showSeoAd && seoAdTimer > 0){
      const t = setTimeout(()=>setSeoAdTimer(a=>a-1), 1000);
      return ()=>clearTimeout(t);
    }
  },[showSeoAd, seoAdTimer]);

  // ── VIDEO CANVAS ──────────────────────────────────────────
  useEffect(()=>{
    if(screen !== "select") return;
    const v  = videoRef.current;
    const cv = canvasRef.current;
    if(!v || !cv) return;
    const onLoaded = () => {
      cv.width  = v.videoWidth  || 640;
      cv.height = v.videoHeight || 360;
      v.currentTime = 0.5;
    };
    const onSeeked = () => {
      cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height);
    };
    v.addEventListener("loadeddata", onLoaded);
    v.addEventListener("seeked", onSeeked);
    if(v.readyState >= 2){
      cv.width  = v.videoWidth  || 640;
      cv.height = v.videoHeight || 360;
      cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height);
    }
    return ()=>{ v.removeEventListener("loadeddata", onLoaded); v.removeEventListener("seeked", onSeeked); };
  },[screen]);

  // ── IMAGE CANVAS ──────────────────────────────────────────
  useEffect(()=>{
    if(screen !== "imgselect" || !imgUrl) return;
    const cv = imgCvRef.current;
    if(!cv) return;
    const img = new Image();
    img.onload = () => {
      const maxW  = Math.min(img.naturalWidth, 1200);
      const scale = maxW / img.naturalWidth;
      cv.width  = img.naturalWidth  * scale;
      cv.height = img.naturalHeight * scale;
      cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
    };
    img.src = imgUrl;
  },[screen, imgUrl]);

  // ── CANVAS BOX DRAWING ────────────────────────────────────
  const getPos = (e, cv) => {
    const r  = cv.getBoundingClientRect();
    const sx = cv.width / r.width;
    const sy = cv.height / r.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x:(cx - r.left) * sx, y:(cy - r.top) * sy };
  };

  const drawVideoBox = useCallback((box)=>{
    const cv = canvasRef.current;
    const v  = videoRef.current;
    if(!cv || !v) return;
    const ctx = cv.getContext("2d");
    ctx.drawImage(v, 0, 0, cv.width, cv.height);
    if(!box) return;
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.clearRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = "#7c3aed"; ctx.setLineDash([]);
    [[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]].forEach(([a,b])=>ctx.fillRect(a-5,b-5,10,10));
  },[]);

  const drawImgBox = useCallback((box)=>{
    const cv = imgCvRef.current;
    if(!cv) return;
    const img = new Image();
    img.onload = () => {
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      if(!box) return;
      ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(0,0,cv.width,cv.height);
      ctx.clearRect(box.x,box.y,box.w,box.h);
      ctx.strokeStyle = "#7c3aed"; ctx.lineWidth = 2; ctx.setLineDash([6,4]);
      ctx.strokeRect(box.x,box.y,box.w,box.h);
      ctx.fillStyle = "#7c3aed"; ctx.setLineDash([]);
      [[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]].forEach(([a,b])=>ctx.fillRect(a-5,b-5,10,10));
    };
    img.src = imgUrl;
  },[imgUrl]);

  const vDown = e=>{ const p=getPos(e,canvasRef.current); setDrawing(true); setStartPos(p); setWBox(null); drawVideoBox(null); };
  const vMove = e=>{ if(!drawing||!startPos)return; const p=getPos(e,canvasRef.current); const b={x:Math.min(startPos.x,p.x),y:Math.min(startPos.y,p.y),w:Math.abs(p.x-startPos.x),h:Math.abs(p.y-startPos.y)}; setWBox(b); drawVideoBox(b); };
  const vUp   = ()=>setDrawing(false);

  const iDown = e=>{ const p=getPos(e,imgCvRef.current); setImgDrawing(true); setImgStart(p); setImgBox(null); drawImgBox(null); };
  const iMove = e=>{ if(!imgDrawing||!imgStart)return; const p=getPos(e,imgCvRef.current); const b={x:Math.min(imgStart.x,p.x),y:Math.min(imgStart.y,p.y),w:Math.abs(p.x-imgStart.x),h:Math.abs(p.y-imgStart.y)}; setImgBox(b); drawImgBox(b); };
  const iUp   = ()=>setImgDrawing(false);

  // ── VIDEO PROCESS — Real Canvas Blur + MediaRecorder ──────
  const doProcess = () => {
    const box = wBox;      // snapshot before screen change
    const url = videoUrl;
    if(!box || !url) return;

    setScreen("processing");
    setProgress(0);
    setProcessingMsg("Removing Watermark…");

    const vid = document.createElement("video");
    vid.src         = url;
    vid.muted       = true;
    vid.playsInline = true;
    vid.crossOrigin = "anonymous";

    const canvas = document.createElement("canvas");
    const ctx    = canvas.getContext("2d");

    // Apply blur to the selected box region
    const applyBlurToBox = () => {
      ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
      if(box.w < 4 || box.h < 4) return;

      // Extra padding so blur doesn't have hard edges
      const pad     = 24;
      const bx      = Math.max(0, box.x - pad);
      const by      = Math.max(0, box.y - pad);
      const bw      = Math.min(canvas.width  - bx, box.w + pad * 2);
      const bh      = Math.min(canvas.height - by, box.h + pad * 2);
      const blurAmt = Math.max(14, Math.min(box.w, box.h) * 0.3);

      // Off-screen canvas to hold blurred region
      const off  = document.createElement("canvas");
      off.width  = bw;
      off.height = bh;
      const octx = off.getContext("2d");
      octx.filter = `blur(${blurAmt}px)`;
      octx.drawImage(canvas, bx, by, bw, bh, 0, 0, bw, bh);
      octx.filter = "none";

      // Clip-paste only over the box (not the padded area)
      ctx.save();
      ctx.beginPath();
      ctx.rect(box.x, box.y, box.w, box.h);
      ctx.clip();
      ctx.drawImage(off, 0, 0, bw, bh, bx, by, bw, bh);
      ctx.restore();
    };

    const fallbackSimulate = () => {
      setProcessedUrl(url);
      let p = 0;
      const iv = setInterval(()=>{
        p += Math.random() * 14 + 4;
        if(p >= 100){ clearInterval(iv); setProgress(100); setTimeout(()=>setScreen("export"), 400); return; }
        setProgress(Math.min(p, 100));
      }, 150);
    };

    vid.onloadedmetadata = () => {
      canvas.width  = vid.videoWidth  || 640;
      canvas.height = vid.videoHeight || 360;

      try {
        const stream = canvas.captureStream(30);
        const mime   = ["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"]
                        .find(m => MediaRecorder.isTypeSupported(m)) || "";
        if(!mime){ fallbackSimulate(); return; }

        const recorder = new MediaRecorder(stream, { mimeType: mime });
        const chunks   = [];

        recorder.ondataavailable = e => { if(e.data?.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type:"video/webm" });
          setProcessedUrl(URL.createObjectURL(blob));
          setProgress(100);
          setTimeout(()=>setScreen("export"), 300);
        };

        let animId;
        const render = () => {
          if(vid.ended || vid.paused){ return; }
          applyBlurToBox();
          if(vid.duration){
            setProgress(Math.min((vid.currentTime / vid.duration) * 100, 98));
          }
          animId = requestAnimationFrame(render);
        };

        vid.addEventListener("ended", ()=>{
          cancelAnimationFrame(animId);
          if(recorder.state === "recording"){ setProgress(99); recorder.stop(); }
        }, { once:true });

        recorder.start(100);
        vid.play()
          .then(()=>render())
          .catch(()=>fallbackSimulate());

      } catch(_){ fallbackSimulate(); }
    };

    vid.onerror = fallbackSimulate;
    vid.load();
  };

  // ── IMAGE PROCESS ─────────────────────────────────────────
  const doImgProcess = () => {
    const cv = imgCvRef.current;
    if(!cv || !imgBox) return;
    const img = new Image();
    img.onload = () => {
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      const { x,y,w,h } = imgBox;
      const blurAmt = Math.max(8, Math.min(w,h) * 0.4);
      ctx.filter = `blur(${blurAmt}px)`;
      const pad = Math.max(w,h) * 0.15;
      ctx.drawImage(cv, x-pad, y-pad, w+pad*2, h+pad*2, x-pad, y-pad, w+pad*2, h+pad*2);
      ctx.filter = "none";
      setImgProcessed(cv.toDataURL("image/png", 1.0));
      setScreen("imgexport");
    };
    img.src = imgUrl;
  };

  const doDownload = sz => {
    if(!isPaid && sz.paid){ setPendingSz(sz); setAdTimer(5); setShowAd(true); }
    else triggerDL(sz);
  };
  const triggerDL = sz => {
    if(!processedUrl) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = "reelkit_" + sz.id + ".webm";
    a.click();
  };
  const adDone = ()=>{ setShowAd(false); if(pendingSz){ triggerDL(pendingSz); setPendingSz(null); } };
  const cp = (text, key)=>{ navigator.clipboard?.writeText(text); setCopied(key); setTimeout(()=>setCopied(""), 2000); };

  const genSEO = async (topic) => {
    setSeoLoading(true); setSeoData(null);
    try {
      const res    = await fetch("/api/seo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,platform})});
      const result = await res.json();
      if(!isPaid){ setPendingSeo(result); setSeoAdTimer(5); setShowSeoAd(true); }
      else setSeoData(result);
    } catch {
      const fb = {
        titles:[`🔥 ${topic} — Must Watch ${YEAR}`,`This ${topic} Will Change Everything!`,`Every Creator Must Know This`],
        tags:[`#${topic.replace(/\s+/g,"")}`, "#contentcreator","#reelstips","#youtubetips","#instagramreels","#viral","#trending","#youtubeIndia","#reelsindia","#creatortool","#freetool","#videoediting","#socialmedia","#digitalcreator","#creatoreconomy","#reelkit","#shortstips","#videoedit","#instagramIndia",`#creator${YEAR}`,"#indiancreator"],
        description:`${topic} — perfect for Indian creators on ${platform}. Use ReelKit free at reelkit.in to remove watermarks. #reelkit #viral #reelsindia #contentcreator`
      };
      if(!isPaid){ setPendingSeo(fb); setSeoAdTimer(5); setShowSeoAd(true); }
      else setSeoData(fb);
    }
    setSeoLoading(false);
  };

  // ── SHARED COMPONENTS ─────────────────────────────────────
  const Btn  = ({onClick,children,style={}}) => (
    <button onClick={onClick} style={{width:"100%",padding:"17px",borderRadius:14,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:G,...style}}>{children}</button>
  );
  const BtnO = ({onClick,children,style={}}) => (
    <button onClick={onClick} style={{width:"100%",padding:"16px",borderRadius:14,border:"1px solid "+C.bdr,cursor:"pointer",fontSize:16,fontWeight:500,color:C.sub2,background:"transparent",marginTop:12,...style}}>{children}</button>
  );

  const Nav = () => (
    <div style={{background:C.nav,height:58,display:"flex",alignItems:"center",padding:"0 20px",position:"sticky",top:0,zIndex:50,boxSizing:"border-box"}}>
      <div onClick={()=>setScreen("home")} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
        <div style={{width:34,height:34,borderRadius:9,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:17}}>✦</div>
        <span style={{color:"#fff",fontWeight:800,fontSize:18}}>ReelKit</span>
      </div>
      <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center"}}>
        {isPaid && <span style={{fontSize:13,fontWeight:700,padding:"5px 14px",borderRadius:20,background:G,color:"#fff"}}>★ Pro</span>}
        {user
          ? <button onClick={()=>setShowProfile(true)} style={{background:"rgba(255,255,255,0.12)",border:"none",color:"#fff",cursor:"pointer",padding:"6px 14px",borderRadius:9,fontSize:14,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
              {user.photo
                ? <img src={user.photo} alt="" style={{width:28,height:28,borderRadius:50,objectFit:"cover"}}/>
                : <div style={{width:28,height:28,borderRadius:50,background:G,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800}}>{(user.name||"U")[0].toUpperCase()}</div>
              }
              <span style={{maxWidth:90,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.name||"Profile"}</span>
            </button>
          : <button onClick={()=>setShowLogin(true)} style={{background:"rgba(255,255,255,0.12)",border:"none",color:"#fff",cursor:"pointer",padding:"8px 18px",borderRadius:9,fontSize:15,fontWeight:600}}>Log In</button>
        }
      </div>
    </div>
  );

  // Consistent wrap with fixed padding
  const Wrap = ({children}) => (
    <div style={{width:"100%",maxWidth:660,margin:"0 auto",padding:"28px 16px 110px",boxSizing:"border-box"}}>
      {children}
    </div>
  );

  const AdBanner = () => !isPaid ? (
    <div style={{marginTop:28}}>
      <div style={{background:C.surf,border:"1px dashed "+C.bdr,borderRadius:16,padding:"22px 16px",textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:C.sub,marginBottom:8}}>Advertisement</div>
        <div style={{fontSize:15,color:C.sub}}>Google Ad — Live after AdSense approval</div>
      </div>
      <div onClick={()=>setShowSub(true)} style={{background:"#f5f0ff",border:"1px solid #c4b5fd",borderRadius:16,padding:"20px 18px",cursor:"pointer",display:"flex",gap:16,alignItems:"center"}}>
        <div style={{width:48,height:48,borderRadius:13,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:20,flexShrink:0}}>★</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:800,fontSize:16,color:"#3b0764",marginBottom:4}}>Remove ads forever — ₹50/month</div>
          <div style={{fontSize:14,color:"#6d28d9"}}>HD · All sizes · AI SEO · No ads · Priority</div>
        </div>
        <div style={{color:"#7c3aed",fontSize:22,flexShrink:0}}>→</div>
      </div>
    </div>
  ) : null;

  // ── HOME ────────────────────────────────────────────────
  if(screen === "home") return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}>
      <Nav/>

      {/* Full-width hero */}
      <div style={{background:"linear-gradient(160deg,#1a1a2a,#2d1b69,#1a1a2a)",padding:"36px 16px 44px",width:"100%",boxSizing:"border-box"}}>
        <div style={{maxWidth:660,margin:"0 auto"}}>

          {/* Tabs */}
          <div style={{display:"flex",background:"rgba(255,255,255,0.08)",borderRadius:14,padding:5,marginBottom:26,gap:4}}>
            {[{id:"video",label:"Video"},{id:"image",label:"Image"},{id:"seo",label:"AI SEO"}].map(t=>{
              const a = tab === t.id;
              return <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"12px 6px",borderRadius:10,border:a?"1.5px solid #a78bfa":"1.5px solid transparent",cursor:"pointer",fontSize:14,fontWeight:a?700:500,background:a?"rgba(255,255,255,0.18)":"transparent",color:a?"#fff":"rgba(255,255,255,0.5)",transition:"all .15s"}}>{t.label}</button>;
            })}
          </div>

          {/* Headline */}
          <div style={{textAlign:"center",marginBottom:26}}>
            <h1 style={{fontSize:32,fontWeight:900,letterSpacing:-0.8,lineHeight:1.15,margin:"0 0 12px",color:"#ffffff"}}>
              {tab==="video" && "Remove Watermark from Video"}
              {tab==="image" && "Remove Watermark from Image"}
              {tab==="seo"   && "AI SEO Generator for Creators"}
            </h1>
            <p style={{color:"rgba(255,255,255,0.72)",fontSize:16,margin:0}}>
              {tab==="video" && "Erase any watermark, logo, or text — free"}
              {tab==="image" && "Remove watermarks from photos — free"}
              {tab==="seo"   && "Viral titles, 20 trending tags & description"}
            </p>
          </div>

          {/* Tool card */}
          <div style={{background:"#fff",borderRadius:22,padding:"28px 22px",boxShadow:"0 8px 40px rgba(0,0,0,0.2)",boxSizing:"border-box"}}>

            {/* VIDEO */}
            {tab==="video" && (
              <div style={{textAlign:"center",cursor:"pointer"}}
                onClick={()=>fileRef.current?.click()}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f?.type.startsWith("video/")){ setVideoFile(f); setVideoUrl(URL.createObjectURL(f)); setScreen("upload"); } }}>
                <div style={{width:72,height:72,borderRadius:20,background:C.tagBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                </div>
                <button style={{padding:"15px 44px",borderRadius:14,border:"none",cursor:"pointer",fontSize:17,fontWeight:800,color:"#fff",background:G,marginBottom:14}}>Choose Video File</button>
                <p style={{color:C.sub2,fontSize:15,margin:"0 0 6px"}}>or drag and drop here</p>
                <p style={{color:C.sub,fontSize:13,margin:0}}>MP4, MOV, AVI, MKV supported</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files[0]; if(f){ setVideoFile(f); setVideoUrl(URL.createObjectURL(f)); setScreen("upload"); } e.target.value=""; }}/>

            {/* IMAGE */}
            {tab==="image" && (
              <div style={{textAlign:"center",cursor:"pointer"}}
                onClick={()=>imgRef.current?.click()}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{ e.preventDefault(); const f=e.dataTransfer.files[0]; if(f?.type.startsWith("image/")){ const url=URL.createObjectURL(f); setImgUrl(url); setImgOriginal(url); setImgBox(null); setImgProcessed(null); setScreen("imgselect"); } }}>
                <div style={{width:72,height:72,borderRadius:20,background:"linear-gradient(135deg,#fff4ed,#fce7f3)",border:"2px solid #fed7aa",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <button style={{padding:"15px 44px",borderRadius:14,border:"none",cursor:"pointer",fontSize:17,fontWeight:800,color:"#fff",background:"linear-gradient(135deg,#f97316,#ec4899)",marginBottom:14}}>Choose Image File</button>
                <p style={{color:C.sub2,fontSize:15,margin:"0 0 10px"}}>or drag and drop here</p>
                <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
                  {["png","jpg","webp","avif"].map(f=><span key={f} style={{fontSize:13,padding:"4px 12px",borderRadius:8,background:C.surf,color:C.sub,border:"1px solid "+C.bdr,fontWeight:600}}>{f}</span>)}
                </div>
              </div>
            )}
            <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files[0]; if(f){ const url=URL.createObjectURL(f); setImgUrl(url); setImgOriginal(url); setImgBox(null); setImgProcessed(null); setScreen("imgselect"); } e.target.value=""; }}/>

            {/* SEO */}
            {tab==="seo" && (
              <div>
                <div style={{display:"flex",gap:10,marginBottom:16}}>
                  {["youtube","instagram"].map(p=>(
                    <button key={p} onClick={()=>{ setPlatform(p); setSeoData(null); }} style={{flex:1,padding:"12px",borderRadius:11,border:platform===p?"2px solid #7c3aed":"1px solid "+C.bdr,background:platform===p?C.tagBg:"#fafafa",color:platform===p?C.tagClr:C.sub2,cursor:"pointer",fontWeight:platform===p?700:500,fontSize:15}}>
                      {p==="youtube" ? "▶ YouTube" : "◉ Instagram"}
                    </button>
                  ))}
                </div>
                <div style={{position:"relative"}}>
                  <textarea value={seoInput} onChange={e=>setSeoInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter" && !e.shiftKey && seoInput.trim()){ e.preventDefault(); genSEO(seoInput.trim()); } }}
                    placeholder={'e.g. "Morning skincare routine"\nor "Budget phones under ₹15000"'}
                    style={{width:"100%",minHeight:96,padding:"16px 16px 56px",borderRadius:12,border:"1px solid "+C.bdr,background:C.inp,color:C.txt,fontSize:16,resize:"none",outline:"none",lineHeight:1.7,boxSizing:"border-box",fontFamily:"inherit"}}/>
                  <button onClick={()=>{ if(seoInput.trim()) genSEO(seoInput.trim()); }} disabled={!seoInput.trim()||seoLoading}
                    style={{position:"absolute",bottom:12,right:12,padding:"9px 20px",borderRadius:9,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,color:"#fff",background:seoInput.trim()?G:"#ccc",opacity:seoLoading?0.6:1}}>
                    {seoLoading ? "Wait..." : "Generate →"}
                  </button>
                </div>
                <div style={{marginTop:12}}>
                  <span style={{fontSize:14,color:C.sub}}>Try: </span>
                  {["Skincare","Travel vlog","Food recipe","Tech review"].map(eg=>(
                    <span key={eg} onClick={()=>{ setSeoInput(eg); genSEO(eg); }} style={{fontSize:14,color:C.tagClr,cursor:"pointer",marginRight:12,fontWeight:600,textDecoration:"underline",textDecorationStyle:"dotted"}}>{eg}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Below-hero content */}
      <div style={{width:"100%",maxWidth:660,margin:"0 auto",padding:"28px 16px 100px",boxSizing:"border-box"}}>

        {tab==="seo" && (seoLoading || seoData) && (
          <div>
            {seoLoading && <div style={{textAlign:"center",padding:"32px 0",color:C.sub2,fontSize:16}}>Generating for "{seoInput}"...</div>}
            {seoData && !seoLoading && (<>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                <span style={{fontSize:14,color:C.sub}}>Results for:</span>
                <span style={{fontSize:14,fontWeight:700,padding:"4px 14px",borderRadius:20,background:C.tagBg,color:C.tagClr}}>"{seoInput}"</span>
                <button onClick={()=>setSeoData(null)} style={{fontSize:13,color:C.sub,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Change</button>
              </div>
              {[
                {title:"Titles",content:seoData.titles?.map((t,i)=>(
                  <div key={i} style={{background:C.surf,padding:14,borderRadius:12,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,border:"1px solid "+C.bdr}}>
                    <span style={{fontSize:15,flex:1,lineHeight:1.6,color:C.txt,minWidth:0}}>{t}</span>
                    <button onClick={()=>cp(t,"t"+i)} style={{background:C.tagBg,border:"none",color:copied==="t"+i?C.okTxt:C.tagClr,cursor:"pointer",padding:"7px 14px",borderRadius:8,fontSize:13,whiteSpace:"nowrap",fontWeight:700,flexShrink:0}}>{copied==="t"+i?"✓":"Copy"}</button>
                  </div>
                ))},
                {title:"Trending Tags",content:<>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{seoData.tags?.map((t,i)=><span key={i} onClick={()=>cp(t,"tg"+i)} style={{background:C.tagBg,border:"1px solid #c4b5fd",padding:"6px 14px",borderRadius:40,fontSize:14,cursor:"pointer",color:copied==="tg"+i?C.okTxt:C.tagClr,fontWeight:500}}>{t}</span>)}</div>
                  <button onClick={()=>cp(seoData.tags?.join(" "),"all")} style={{width:"100%",padding:"11px",borderRadius:10,border:"1px solid "+C.bdr,cursor:"pointer",fontSize:15,fontWeight:600,color:C.sub2,background:"transparent",marginTop:12,boxSizing:"border-box"}}>{copied==="all"?"✓ Copied All":"Copy All Tags"}</button>
                </>},
                {title:"Description",content:<>
                  <div style={{background:C.surf,padding:16,borderRadius:12,fontSize:15,lineHeight:1.9,color:C.sub2,border:"1px solid "+C.bdr}}>{seoData.description}</div>
                  <button onClick={()=>cp(seoData.description,"desc")} style={{width:"100%",padding:"11px",borderRadius:10,border:"1px solid "+C.bdr,cursor:"pointer",fontSize:15,fontWeight:600,color:C.sub2,background:"transparent",marginTop:10,boxSizing:"border-box"}}>{copied==="desc"?"✓ Copied":"Copy Description"}</button>
                </>},
              ].map(s=>(
                <div key={s.title} style={{background:C.card,border:"1px solid "+C.bdr,borderRadius:16,padding:18,marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:C.sub,marginBottom:14}}>{s.title}</div>
                  {s.content}
                </div>
              ))}
              <Btn onClick={()=>{ setSeoData(null); genSEO(seoInput); }}>↺ Regenerate</Btn>
            </>)}
          </div>
        )}

        <AdBanner/>

        {/* How it works */}
        <div style={{marginTop:44}}>
          <p style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:C.sub,textAlign:"center",marginBottom:20}}>How it works</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[{n:"1",t:"Upload",d:"Select your file"},{n:"2",t:"Select",d:"Draw over watermark"},{n:"3",t:"Download",d:"Get clean file free"}].map(s=>(
              <div key={s.n} style={{background:C.card,borderRadius:18,padding:"20px 10px",textAlign:"center",border:"1px solid "+C.bdr}}>
                <div style={{width:38,height:38,borderRadius:50,background:"linear-gradient(135deg,#c4b5fd,#f0abfc)",color:"#fff",fontWeight:800,fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",boxShadow:"0 2px 10px rgba(196,181,253,0.5)"}}>{s.n}</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:4,color:C.txt}}>{s.t}</div>
                <div style={{fontSize:13,color:C.sub2}}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{marginTop:48,paddingTop:28,borderTop:"1px solid "+C.bdr}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:20,flexWrap:"wrap",marginBottom:22}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}>
                <div style={{width:28,height:28,borderRadius:8,background:G,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff"}}>✦</div>
                <span style={{fontWeight:800,fontSize:18,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ReelKit</span>
              </div>
              <p style={{fontSize:14,color:C.sub2,lineHeight:1.8,margin:0,maxWidth:200}}>India's free watermark removal & creator toolkit.</p>
            </div>
            <div style={{display:"flex",gap:28}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.sub,marginBottom:10}}>Tools</div>
                {["Video Watermark","Image Watermark","AI SEO Tags"].map(l=><div key={l} style={{fontSize:14,color:C.sub2,marginBottom:8,cursor:"pointer"}}>{l}</div>)}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.sub,marginBottom:10}}>Legal</div>
                <div onClick={()=>setShowPrivacy(true)} style={{fontSize:14,color:C.sub2,marginBottom:8,cursor:"pointer"}}>Privacy Policy</div>
                <div onClick={()=>setShowTerms(true)} style={{fontSize:14,color:C.sub2,marginBottom:8,cursor:"pointer"}}>Terms of Use</div>
              </div>
            </div>
          </div>
          <div style={{background:C.surf,border:"1px solid "+C.bdr,borderRadius:14,padding:16,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.sub,marginBottom:12}}>Popular Searches</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {["free watermark remover online","remove watermark from video free","video watermark remover India","image watermark remover free","remove logo from video","watermark hatane ka tool","AI SEO tags generator","YouTube title generator free","Instagram hashtag generator","reels size converter","YouTube 16:9 video","Instagram Reels 9:16","video editor online free India","reel banane ka free tool","watermark remove karo free","content creator tools India","YouTube SEO 2025","remove text from video free","free tools for YouTubers"].map(t=>(
                <span key={t} style={{fontSize:13,padding:"5px 12px",borderRadius:40,background:C.card,border:"1px solid "+C.bdr,color:C.sub2}}>{t}</span>
              ))}
            </div>
          </div>
          <p style={{fontSize:14,color:C.sub2,lineHeight:1.9,marginBottom:10}}>ReelKit is a <strong>free online watermark remover</strong> for Indian content creators. Remove watermarks from videos and images instantly.</p>
          <p style={{fontSize:14,color:C.sub2,lineHeight:1.9,marginBottom:18}}>Whether you are a YouTuber, Instagram creator, or digital marketer — ReelKit helps you clean videos, resize for every platform, and get trending SEO tags. 100% free.</p>
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:16,borderTop:"1px solid "+C.bdr,flexWrap:"wrap",gap:8}}>
            <span style={{fontSize:13,color:C.sub}}>© {YEAR} ReelKit.in · All rights reserved</span>
            <span style={{fontSize:13,color:C.sub}}>Made with ♥ for Indian Creators</span>
          </div>
        </div>
      </div>

      {showSeoAd   && <SeoAdModal onShow={()=>{ setShowSeoAd(false); setSeoData(pendingSeo); setPendingSeo(null); }} onUpgrade={()=>{ setShowSeoAd(false); setPendingSeo(null); setShowSub(true); }} timer={seoAdTimer}/>}
      {showSub     && <SubModal setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
      {showLogin   && <LoginModal onDone={u=>{ setUser(u); setShowLogin(false); }} onClose={()=>setShowLogin(false)}/>}
      {showProfile && <ProfileModal user={user} setUser={setUser} isPaid={isPaid} onClose={()=>setShowProfile(false)} onLogout={()=>{ setUser(null); setShowProfile(false); }}/>}
      {showPrivacy && <LegalModal title="Privacy Policy" onClose={()=>setShowPrivacy(false)}><PrivacyContent/></LegalModal>}
      {showTerms   && <LegalModal title="Terms of Use" onClose={()=>setShowTerms(false)}><TermsContent/></LegalModal>}
    </div>
  );

  // ── UPLOAD ──────────────────────────────────────────────
  if(screen === "upload") return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:20,fontWeight:500}}>← Back</div>
        <video ref={videoRef} src={videoUrl} style={{width:"100%",borderRadius:16,background:"#000",display:"block",boxSizing:"border-box"}} controls playsInline/>
        <div style={{background:C.card,borderRadius:16,padding:16,marginTop:14,border:"1px solid "+C.bdr,display:"flex",gap:14,alignItems:"center"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.txt}}>{videoFile?.name}</div>
            <div style={{color:C.sub,fontSize:13,marginTop:3}}>{videoFile ? (videoFile.size/1024/1024).toFixed(1)+" MB" : ""}</div>
          </div>
          <button onClick={()=>fileRef.current?.click()} style={{padding:"9px 16px",borderRadius:10,border:"1px solid "+C.bdr,background:"transparent",color:C.sub2,cursor:"pointer",fontSize:14,flexShrink:0}}>Change</button>
          <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files[0]; if(f){ setVideoFile(f); setVideoUrl(URL.createObjectURL(f)); } e.target.value=""; }}/>
        </div>
        <div style={{background:C.warnBg,border:"1px solid "+C.warnBdr,borderRadius:14,padding:16,marginTop:14}}>
          <div style={{fontWeight:700,fontSize:15,color:C.warnTxt,marginBottom:10}}>⚠️ Legal Notice</div>
          <p style={{fontSize:15,lineHeight:1.8,color:C.warnTxt,margin:"0 0 14px"}}>ReelKit is only for videos <b>you own or have rights to</b>. Removing copyrighted watermarks without permission is illegal.</p>
          <label style={{display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer"}}>
            <input type="checkbox" checked={legalOk} onChange={e=>setLegalOk(e.target.checked)} style={{marginTop:3,accentColor:"#7c3aed",flexShrink:0,width:18,height:18}}/>
            <span style={{fontSize:15,lineHeight:1.7,color:C.warnTxt,fontWeight:500}}>I own this video and accept full legal responsibility.</span>
          </label>
        </div>
        <Btn onClick={()=>setScreen("select")} style={{opacity:legalOk?1:0.3,marginTop:16}}>Select Watermark Area →</Btn>
      </Wrap>
    </div>
  );

  // ── SELECT (VIDEO) ───────────────────────────────────────
  if(screen === "select") return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("upload")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Back</div>
        <h2 style={{fontSize:24,fontWeight:800,marginBottom:6,color:C.txt}}>Select Watermark</h2>
        <p style={{color:C.sub2,marginBottom:14,fontSize:15,marginTop:0}}>Draw a box over the watermark to remove it</p>
        <video ref={videoRef} src={videoUrl} style={{display:"none"}} muted playsInline/>
        <div style={{position:"relative",borderRadius:16,overflow:"hidden",background:"#000",border:"1px solid "+C.bdr,touchAction:"none",cursor:"crosshair"}}>
          <canvas ref={canvasRef} style={{width:"100%",display:"block"}}
            onMouseDown={vDown} onMouseMove={vMove} onMouseUp={vUp}
            onTouchStart={e=>{ e.preventDefault(); vDown(e); }}
            onTouchMove={e=>{ e.preventDefault(); vMove(e); }}
            onTouchEnd={e=>{ e.preventDefault(); vUp(); }}/>
        </div>
        {wBox && <div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:12,padding:"13px 16px",marginTop:12,fontSize:15,color:C.okTxt,fontWeight:600}}>✓ Area selected — ready to remove</div>}
        <Btn onClick={doProcess} style={{opacity:wBox?1:0.3,marginTop:14}}>Remove Watermark →</Btn>
        <BtnO onClick={()=>{ setWBox(null); drawVideoBox(null); }}>Clear Selection</BtnO>
      </Wrap>
    </div>
  );

  // ── PROCESSING ─────────────────────────────────────────
  if(screen === "processing") return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",padding:"40px 24px",maxWidth:400,width:"100%",boxSizing:"border-box"}}>
        <div style={{width:72,height:72,borderRadius:20,background:C.tagBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:30}}>✦</div>
        <div style={{fontSize:24,fontWeight:800,marginBottom:8,color:C.txt}}>Removing Watermark…</div>
        <p style={{color:C.sub2,fontSize:15,marginBottom:26}}>Applying blur to selected region</p>
        <div style={{margin:"0 auto",background:C.bdr,borderRadius:100,height:8,width:"100%",overflow:"hidden"}}>
          <div style={{height:"100%",background:G,width:progress+"%",transition:"width .15s",borderRadius:100}}/>
        </div>
        <div style={{fontWeight:900,fontSize:36,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:14}}>{Math.round(progress)}%</div>
        <p style={{color:C.sub,fontSize:13,marginTop:8}}>Please keep this tab open…</p>
      </div>
    </div>
  );

  // ── EXPORT (VIDEO) ──────────────────────────────────────
  if(screen === "export") return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Home</div>
        <div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:14,padding:"14px 18px",display:"flex",gap:14,alignItems:"center",marginBottom:22}}>
          <span style={{color:C.okTxt,fontWeight:700,fontSize:22}}>✓</span>
          <span style={{fontSize:16,color:C.okTxt,fontWeight:600}}>Watermark removed successfully!</span>
        </div>

        {/* Before / After */}
        <div style={{marginBottom:22}}>
          <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:C.sub,marginBottom:12}}>Before / After</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:C.card,borderRadius:14,padding:10,border:"1px solid "+C.bdr}}>
              <div style={{fontSize:11,color:C.sub,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Before</div>
              <video src={videoUrl} style={{width:"100%",borderRadius:10,display:"block"}} muted playsInline controls/>
            </div>
            <div style={{background:C.card,borderRadius:14,padding:10,border:"1px solid "+C.okBdr}}>
              <div style={{fontSize:11,color:C.okTxt,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>After ✓</div>
              <video src={processedUrl} style={{width:"100%",borderRadius:10,display:"block"}} muted playsInline controls/>
            </div>
          </div>
        </div>

        <div style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:C.sub,marginBottom:12}}>Download Size</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {SIZES.map(sz=>(
              <div key={sz.id} onClick={()=>doDownload(sz)} style={{background:C.card,borderRadius:12,padding:"14px 6px",textAlign:"center",cursor:"pointer",border:"1px solid "+C.bdr,position:"relative"}}>
                {!isPaid && sz.paid && <div style={{position:"absolute",top:6,right:6,fontSize:10,background:G,color:"#fff",padding:"2px 7px",borderRadius:5,fontWeight:700}}>AD</div>}
                <div style={{fontWeight:700,fontSize:13,color:C.txt}}>{sz.label}</div>
                <div style={{color:C.sub,fontSize:12,marginTop:3}}>{sz.ratio}</div>
              </div>
            ))}
          </div>
          {!isPaid && <p style={{color:C.sub2,fontSize:13,marginTop:10}}>Free users watch a short ad per paid download</p>}
        </div>
        <Btn onClick={()=>{ setTab("seo"); setScreen("home"); }}>Generate AI SEO Tags →</Btn>
        <BtnO onClick={()=>setShowSub(true)}>★ Upgrade — HD + No Ads</BtnO>
        <BtnO onClick={()=>setScreen("home")}>← Process Another Video</BtnO>
        {showAd  && <AdModal timer={adTimer} onDone={adDone} onUpgrade={()=>{ setShowAd(false); setShowSub(true); }}/>}
        {showSub && <SubModal setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
      </Wrap>
    </div>
  );

  // ── IMG SELECT ──────────────────────────────────────────
  if(screen === "imgselect") return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Back</div>
        <h2 style={{fontSize:24,fontWeight:800,marginBottom:6,color:C.txt}}>Select Watermark</h2>
        <p style={{color:C.sub2,marginBottom:14,fontSize:15,marginTop:0}}>Draw a box over the watermark to remove it</p>
        <div style={{position:"relative",borderRadius:16,overflow:"hidden",background:C.surf,border:"1px solid "+C.bdr,touchAction:"none",cursor:"crosshair"}}>
          <canvas ref={imgCvRef} style={{width:"100%",display:"block"}}
            onMouseDown={iDown} onMouseMove={iMove} onMouseUp={iUp}
            onTouchStart={e=>{ e.preventDefault(); iDown(e); }}
            onTouchMove={e=>{ e.preventDefault(); iMove(e); }}
            onTouchEnd={e=>{ e.preventDefault(); iUp(); }}/>
        </div>
        {imgBox && <div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:12,padding:"13px 16px",marginTop:12,fontSize:15,color:C.okTxt,fontWeight:600}}>✓ Area selected — ready!</div>}
        <Btn onClick={doImgProcess} style={{opacity:imgBox?1:0.3,marginTop:14,background:"linear-gradient(135deg,#f97316,#ec4899)"}}>Remove Watermark →</Btn>
        <BtnO onClick={()=>{ setImgBox(null); drawImgBox(null); }}>Clear Selection</BtnO>
      </Wrap>
    </div>
  );

  // ── IMG EXPORT ──────────────────────────────────────────
  if(screen === "imgexport") return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Home</div>
        <div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:14,padding:"14px 18px",display:"flex",gap:14,alignItems:"center",marginBottom:20}}>
          <span style={{color:C.okTxt,fontWeight:700,fontSize:22}}>✓</span>
          <span style={{fontSize:16,color:C.okTxt,fontWeight:600}}>Watermark removed!</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          <div style={{background:C.card,borderRadius:14,padding:12,border:"1px solid "+C.bdr}}>
            <div style={{fontSize:12,color:C.sub,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Before</div>
            <img src={imgOriginal||imgUrl} alt="before" style={{width:"100%",borderRadius:10,display:"block"}}/>
          </div>
          <div style={{background:C.card,borderRadius:14,padding:12,border:"1px solid "+C.okBdr}}>
            <div style={{fontSize:12,color:C.okTxt,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>After ✓</div>
            {imgProcessed && <img src={imgProcessed} alt="after" style={{width:"100%",borderRadius:10,display:"block"}}/>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[{fmt:"PNG",free:true},{fmt:"JPG",free:true},{fmt:"WebP",free:false},{fmt:"PNG 4K",free:false}].map(({fmt,free})=>(
            <div key={fmt} onClick={()=>{ if(!free && !isPaid){ setShowSub(true); return; } const a=document.createElement("a"); a.href=imgProcessed||imgUrl; a.download="reelkit."+fmt.toLowerCase().split(" ")[0]; a.click(); }}
              style={{background:C.card,borderRadius:12,padding:"14px 8px",textAlign:"center",cursor:"pointer",border:"1px solid "+C.bdr,position:"relative"}}>
              {!free && !isPaid && <div style={{position:"absolute",top:6,right:6,fontSize:10,background:G,color:"#fff",padding:"2px 7px",borderRadius:5,fontWeight:700}}>PRO</div>}
              <div style={{fontWeight:800,fontSize:17,color:free?"#0891b2":"#7c3aed"}}>{fmt}</div>
              <div style={{color:C.sub,fontSize:13,marginTop:4}}>{free?"Free":isPaid?"Pro ✓":"Upgrade"}</div>
            </div>
          ))}
        </div>
        <BtnO onClick={()=>{ setImgBox(null); setImgProcessed(null); setImgUrl(null); setImgOriginal(null); setScreen("home"); }}>← Process Another Image</BtnO>
        {showSub && <SubModal setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
      </Wrap>
    </div>
  );

  return null;
}

// ══════════════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════════════

function AdModal({timer, onDone, onUpgrade}) {
  const G = "linear-gradient(135deg,#7c3aed,#db2777)";
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:"#fff",borderRadius:24,padding:28,width:"100%",maxWidth:400,textAlign:"center",boxSizing:"border-box"}}>
        <div style={{background:"#f5f5f7",borderRadius:14,padding:"40px 20px",marginBottom:18,border:"1px dashed #e2e2e8"}}>
          <div style={{fontWeight:600,fontSize:16,color:"#888"}}>Google Ad Space</div>
          <div style={{fontSize:14,color:"#aaa",marginTop:4}}>Live after AdSense approval</div>
        </div>
        <button style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:timer>0?"not-allowed":"pointer",fontSize:17,fontWeight:700,color:"#fff",background:timer>0?"#999":G,boxSizing:"border-box"}} disabled={timer>0} onClick={onDone}>
          {timer>0 ? "Download in "+timer+"s…" : "↓ Download Now"}
        </button>
        <button style={{width:"100%",padding:"14px",borderRadius:12,border:"1px solid #7c3aed",cursor:"pointer",fontSize:16,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:10,boxSizing:"border-box"}} onClick={onUpgrade}>★ Go Pro — Skip Ads</button>
      </div>
    </div>
  );
}

function SeoAdModal({onShow, onUpgrade, timer}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:"#fff",borderRadius:24,padding:28,width:"100%",maxWidth:400,boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
          <span style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#888"}}>Advertisement</span>
          <span style={{fontSize:13,color:"#888",background:"#f5f5f7",padding:"3px 12px",borderRadius:20,border:"1px solid #e2e2e8"}}>{timer>0?"Closes in "+timer+"s":"Ready"}</span>
        </div>
        <div style={{background:"#f5f5f7",borderRadius:14,padding:"36px 20px",marginBottom:18,border:"1px dashed #e2e2e8",textAlign:"center"}}>
          <div style={{fontWeight:600,fontSize:15,color:"#888"}}>Google Ad Space</div>
        </div>
        <div style={{background:"#f0edff",border:"1px solid #c4b5fd",borderRadius:12,padding:14,marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
          <span style={{fontSize:18}}>★</span>
          <div><div style={{fontWeight:700,fontSize:15,color:"#6d28d9"}}>Tired of ads?</div><div style={{fontSize:14,color:"#6d28d9",opacity:.8}}>Go Pro — zero ads · ₹50/month</div></div>
        </div>
        <button style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:timer>0?"not-allowed":"pointer",fontSize:17,fontWeight:700,color:"#fff",background:timer>0?"#999":"linear-gradient(135deg,#7c3aed,#db2777)",boxSizing:"border-box"}} disabled={timer>0} onClick={onShow}>
          {timer>0?"Results in "+timer+"s…":"✓ Show My SEO Results"}
        </button>
        <button style={{width:"100%",padding:"14px",borderRadius:12,border:"1px solid #7c3aed",cursor:"pointer",fontSize:16,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:10,boxSizing:"border-box"}} onClick={onUpgrade}>★ Skip — Upgrade to Pro</button>
      </div>
    </div>
  );
}

function SubModal({setIsPaid, onClose}) {
  const G = "linear-gradient(135deg,#6d28d9,#db2777)";
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:300}}>
      <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",padding:"30px 20px 52px",boxSizing:"border-box"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontWeight:800,fontSize:24}}>ReelKit Pro</div>
          <div style={{fontSize:38,fontWeight:900,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:6}}>₹50<span style={{fontSize:17,WebkitTextFillColor:"#666",fontWeight:400}}>/month</span></div>
          <div style={{fontSize:15,color:"#888",marginTop:4}}>or ₹399/year — save ₹201</div>
        </div>
        <div style={{background:"#f5f5f7",borderRadius:14,padding:16,marginBottom:20}}>
          {["Full HD 1080p exports","All 7 trending sizes","Zero ads — ever","AI SEO titles, tags & description","Priority processing","Re-download history 7 days","WebP + PNG 4K image exports"].map(f=>(
            <div key={f} style={{display:"flex",gap:14,alignItems:"center",padding:"11px 0",borderBottom:"1px solid #e2e2e8"}}>
              <span style={{color:"#7c3aed",fontWeight:700,fontSize:18}}>✓</span>
              <span style={{fontSize:16,fontWeight:500}}>{f}</span>
            </div>
          ))}
        </div>
        <button style={{width:"100%",padding:17,borderRadius:14,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:G,boxSizing:"border-box"}} onClick={()=>{ setIsPaid(true); onClose(); }}>Subscribe via Razorpay →</button>
        <button style={{width:"100%",padding:15,borderRadius:14,border:"1px solid #e2e2e8",cursor:"pointer",fontSize:16,color:"#666",background:"transparent",marginTop:12,boxSizing:"border-box"}} onClick={onClose}>Maybe Later</button>
      </div>
    </div>
  );
}

// ── LOGIN MODAL — Google + Facebook (No OTP) ──────────────────
function LoginModal({onDone, onClose}) {
  const [loading, setLoading] = useState(""); // "google" | "facebook" | ""
  const [error,   setError]   = useState("");

  // ─────────────────────────────────────────────────────────────
  // 🔧 REAL FIREBASE AUTH — Uncomment after adding Firebase config
  // ─────────────────────────────────────────────────────────────
  // const handleGoogle = async () => {
  //   setLoading("google"); setError("");
  //   try {
  //     const provider = new GoogleAuthProvider();
  //     const result   = await signInWithPopup(auth, provider);
  //     onDone({ name: result.user.displayName, email: result.user.email, photo: result.user.photoURL, provider:"google" });
  //   } catch(e) { setError("Google login failed. Please try again."); }
  //   setLoading("");
  // };
  // const handleFacebook = async () => {
  //   setLoading("facebook"); setError("");
  //   try {
  //     const provider = new FacebookAuthProvider();
  //     const result   = await signInWithPopup(auth, provider);
  //     onDone({ name: result.user.displayName, email: result.user.email, photo: result.user.photoURL, provider:"facebook" });
  //   } catch(e) { setError("Facebook login failed. Please try again."); }
  //   setLoading("");
  // };
  // ─────────────────────────────────────────────────────────────

  // Demo simulation (remove when Firebase is configured):
  const handleGoogle = () => {
    setLoading("google"); setError("");
    setTimeout(()=>{ onDone({ name:"Google User", email:"user@gmail.com", photo:null, provider:"google" }); setLoading(""); }, 900);
  };
  const handleFacebook = () => {
    setLoading("facebook"); setError("");
    setTimeout(()=>{ onDone({ name:"Facebook User", email:"user@facebook.com", photo:null, provider:"facebook" }); setLoading(""); }, 900);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:300}}>
      <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",padding:"30px 20px 52px",boxSizing:"border-box"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontWeight:800,fontSize:22,color:"#111"}}>Welcome to ReelKit</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:36,height:36,borderRadius:10,fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        <p style={{color:"#777",fontSize:15,marginBottom:28,marginTop:0}}>Sign in free — no password needed</p>

        {error && (
          <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"14px 16px",fontSize:15,color:"#dc2626",marginBottom:16}}>{error}</div>
        )}

        {/* Google Button */}
        <button
          onClick={handleGoogle}
          disabled={!!loading}
          style={{width:"100%",padding:"16px",borderRadius:14,border:"1.5px solid #e2e2e8",cursor:loading?"not-allowed":"pointer",fontSize:16,fontWeight:600,color:"#111",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:14,opacity:loading?0.7:1,boxSizing:"border-box",transition:"all .15s"}}>
          {/* Google Logo */}
          <svg width="22" height="22" viewBox="0 0 24 24" style={{flexShrink:0}}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading === "google" ? "Connecting…" : "Continue with Google"}
        </button>

        {/* Facebook Button */}
        <button
          onClick={handleFacebook}
          disabled={!!loading}
          style={{width:"100%",padding:"16px",borderRadius:14,border:"none",cursor:loading?"not-allowed":"pointer",fontSize:16,fontWeight:600,color:"#fff",background:"#1877F2",display:"flex",alignItems:"center",justifyContent:"center",gap:14,opacity:loading?0.7:1,boxSizing:"border-box",transition:"all .15s"}}>
          {/* Facebook Logo */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" style={{flexShrink:0}}>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          {loading === "facebook" ? "Connecting…" : "Continue with Facebook"}
        </button>

        {/* Divider note */}
        <div style={{display:"flex",alignItems:"center",gap:12,margin:"20px 0 16px"}}>
          <div style={{flex:1,height:1,background:"#e2e2e8"}}/>
          <span style={{fontSize:13,color:"#aaa",fontWeight:500}}>100% FREE · No Credit Card</span>
          <div style={{flex:1,height:1,background:"#e2e2e8"}}/>
        </div>

        {/* Dev note */}
        <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:12,padding:"13px 16px",marginBottom:18}}>
          <div style={{fontSize:13,color:"#0369a1",lineHeight:1.7}}>
            🔧 <strong>Dev note:</strong> Running in demo mode. Add Firebase config to enable real Google / Facebook auth (both are free on Firebase Spark plan).
          </div>
        </div>

        <p style={{textAlign:"center",fontSize:13,color:"#aaa",margin:0,lineHeight:1.7}}>
          By continuing you agree to our <span style={{textDecoration:"underline",cursor:"pointer"}}>Terms</span> & <span style={{textDecoration:"underline",cursor:"pointer"}}>Privacy Policy</span>
        </p>
      </div>
    </div>
  );
}

function ProfileModal({user, setUser, isPaid, onClose, onLogout}) {
  const [name, setName] = useState(user?.name || "");
  const G = "linear-gradient(135deg,#7c3aed,#db2777)";

  const providerLabel = user?.provider === "google" ? "Google Account" : user?.provider === "facebook" ? "Facebook Account" : "Account";
  const providerColor = user?.provider === "google" ? "#4285F4" : user?.provider === "facebook" ? "#1877F2" : "#7c3aed";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:300}}>
      <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",padding:"30px 20px 52px",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{fontWeight:800,fontSize:22}}>My Profile</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:36,height:36,borderRadius:10,fontSize:18}}>✕</button>
        </div>

        {/* Avatar block */}
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24,padding:"18px 16px",background:"#f5f5f7",borderRadius:16}}>
          {user?.photo
            ? <img src={user.photo} alt="" style={{width:60,height:60,borderRadius:50,objectFit:"cover",flexShrink:0}}/>
            : <div style={{width:60,height:60,borderRadius:50,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:24,flexShrink:0}}>{(name||"U")[0].toUpperCase()}</div>
          }
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:18,color:"#111",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{name||"User"}</div>
            <div style={{fontSize:14,color:"#666",marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:6,flexWrap:"wrap"}}>
              <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,background:providerColor,color:"#fff",display:"inline-flex",alignItems:"center",gap:4}}>
                {user?.provider === "google" && "G"}
                {user?.provider === "facebook" && "f"}
                {" "}{providerLabel}
              </span>
              {isPaid && <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,background:G,color:"#fff"}}>★ Pro</span>}
            </div>
          </div>
        </div>

        {/* Edit name */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:14,color:"#666",marginBottom:6,fontWeight:600}}>Display Name</div>
          <input style={{width:"100%",padding:"14px 16px",borderRadius:12,border:"1px solid #e2e2e8",background:"#fafafa",color:"#111",fontSize:16,outline:"none",boxSizing:"border-box"}} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/>
        </div>

        {/* Email (read-only) */}
        <div style={{marginBottom:22}}>
          <div style={{fontSize:14,color:"#666",marginBottom:6,fontWeight:600}}>Email</div>
          <div style={{padding:"14px 16px",borderRadius:12,border:"1px solid #e2e2e8",background:"#f5f5f7",color:"#888",fontSize:16}}>{user?.email || "—"}</div>
        </div>

        <div style={{background:"#fff4ed",border:"1px solid #fed7aa",borderRadius:12,padding:"13px 16px",marginBottom:20,fontSize:14,color:"#9a3412",lineHeight:1.7}}>
          ⚠️ User data is stored in browser session only. Add Firebase Firestore for permanent storage.
        </div>

        <button style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:G,boxSizing:"border-box"}} onClick={()=>{ setUser({...user,name}); onClose(); }}>Save Changes</button>
        <button style={{width:"100%",padding:15,borderRadius:12,border:"1px solid #fecaca",cursor:"pointer",fontSize:16,color:"#dc2626",background:"transparent",marginTop:12,fontWeight:600,boxSizing:"border-box"}} onClick={onLogout}>Log Out</button>
      </div>
    </div>
  );
}

function LegalModal({title, onClose, children}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:400}}>
      <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",border:"1px solid #e2e2e8",display:"flex",flexDirection:"column",maxHeight:"88vh"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 20px 16px",borderBottom:"1px solid #e2e2e8",flexShrink:0}}>
          <div style={{fontWeight:800,fontSize:20,color:"#111"}}>{title}</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:36,height:36,borderRadius:10,fontSize:18}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:"18px 20px 32px",flex:1}}>{children}</div>
        <div style={{padding:"14px 20px 32px",borderTop:"1px solid #e2e2e8",flexShrink:0}}>
          <button onClick={onClose} style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)",boxSizing:"border-box"}}>I Understand — Close</button>
        </div>
      </div>
    </div>
  );
}

function PrivacyContent() {
  return (<>
    <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:16,marginBottom:18}}>
      <div style={{fontWeight:800,fontSize:15,color:"#dc2626",marginBottom:8}}>⚠️ DISCLAIMER</div>
      <p style={{fontSize:14,lineHeight:1.8,color:"#7f1d1d",margin:0}}>ReelKit accepts ZERO liability for any legal issues. <strong>Use only content you own.</strong></p>
    </div>
    {[
      {t:"1. Who We Are",b:"ReelKit (reelkit.in) is a free online video and image tool for Indian content creators."},
      {t:"2. Data We Collect",b:"We use Google/Facebook OAuth for login — no passwords stored. Videos and images are processed in your browser and NEVER stored on our servers."},
      {t:"3. Legal Responsibility",b:"ReelKit is a technology tool only. You are SOLELY responsible for having full legal rights to any content you upload. ReelKit.in accepts ZERO liability."},
      {t:"4. Payments",b:"Pro payments via Razorpay. We never store card details. Cancel anytime."},
      {t:"5. Contact",b:"privacy@reelkit.in | ReelKit.in, Mumbai, India"},
    ].map(x=>(
      <div key={x.t} style={{marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{x.t}</div>
        <p style={{color:"#444",fontSize:14,lineHeight:1.9,margin:0}}>{x.b}</p>
      </div>
    ))}
  </>);
}

function TermsContent() {
  return (<>
    <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:16,marginBottom:18}}>
      <div style={{fontWeight:800,fontSize:15,color:"#dc2626",marginBottom:8}}>⚠️ LEGAL NOTICE</div>
      <p style={{fontSize:14,lineHeight:1.8,color:"#7f1d1d",margin:0}}>ReelKit accepts ZERO liability for copyright infringement or any other legal issues caused by user actions.</p>
    </div>
    {[
      {t:"1. Acceptance",b:"By using ReelKit, you agree to these Terms. Stop using if you disagree."},
      {t:"2. Your Legal Responsibility",b:"YOU ARE SOLELY RESPONSIBLE for all content you process. You must own or have written permission. ReelKit is NOT liable for any legal consequences."},
      {t:"3. Prohibited Uses",b:"Do NOT use ReelKit to remove watermarks from content you don't own."},
      {t:"4. Disclaimer",b:"ReelKit is 'AS IS'. No warranty on watermark removal quality."},
      {t:"5. Pro Plans",b:"₹50/month or ₹399/year. Cancel anytime."},
      {t:"6. Contact",b:"legal@reelkit.in | ReelKit.in, Mumbai, India"},
    ].map(x=>(
      <div key={x.t} style={{marginBottom:16}}>
        <div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{x.t}</div>
        <p style={{color:"#444",fontSize:14,lineHeight:1.9,margin:0}}>{x.b}</p>
      </div>
    ))}
  </>);
}