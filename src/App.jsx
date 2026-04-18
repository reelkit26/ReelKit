// ─────────────────────────────────────────────────────────────
// src/App.jsx — ReelKit Final
// ─────────────────────────────────────────────────────────────
import { useState, useRef, useEffect, useCallback } from "react";
import {
  auth, db, saveUser, addHistory, signInGoogle, signInFacebook, logOut
} from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

const G    = "linear-gradient(135deg,#7c3aed,#db2777)";
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
  const [tab,           setTab]          = useState("video");
  const [screen,        setScreen]       = useState("home");
  const [isPaid,        setIsPaid]       = useState(false);
  const [showSub,       setShowSub]      = useState(false);
  const [showLogin,     setShowLogin]    = useState(false);
  const [showPrivacy,   setShowPrivacy]  = useState(false);
  const [showTerms,     setShowTerms]    = useState(false);
  const [showProfile,   setShowProfile]  = useState(false);
  const [showHistory,   setShowHistory]  = useState(false);
  const [user,          setUser]         = useState(null);  // Firebase user
  const [userHistory,   setUserHistory]  = useState([]);

  // Video states
  const [videoFile,     setVideoFile]    = useState(null);
  const [videoUrl,      setVideoUrl]     = useState(null);
  const [videoSnapshot, setVideoSnapshot]= useState(null); // ← KEY FIX: captured frame
  const [legalOk,       setLegalOk]      = useState(false);
  const [wBox,          setWBox]         = useState(null);
  const [drawing,       setDrawing]      = useState(false);
  const [startPos,      setStartPos]     = useState(null);
  const [progress,      setProgress]     = useState(0);
  const [showAd,        setShowAd]       = useState(false);
  const [adTimer,       setAdTimer]      = useState(60); // 60 seconds
  const [pendingAction, setPendingAction]= useState(null);
  const [processedUrl,  setProcessedUrl] = useState(null);

  // Image states
  const [imgUrl,        setImgUrl]       = useState(null);
  const [imgOriginal,   setImgOriginal]  = useState(null);
  const [imgBox,        setImgBox]       = useState(null);
  const [imgDrawing,    setImgDrawing]   = useState(false);
  const [imgStart,      setImgStart]     = useState(null);
  const [imgProcessed,  setImgProcessed] = useState(null);

  // SEO states
  const [platform,      setPlatform]     = useState("youtube");
  const [seoInput,      setSeoInput]     = useState("");
  const [seoData,       setSeoData]      = useState(null);
  const [seoLoading,    setSeoLoading]   = useState(false);
  const [seoAdTimer,    setSeoAdTimer]   = useState(60);
  const [showSeoAd,     setShowSeoAd]    = useState(false);
  const [pendingSeo,    setPendingSeo]   = useState(null);
  const [copied,        setCopied]       = useState("");

  const fileRef   = useRef();
  const imgRef    = useRef();
  const videoRef  = useRef();
  const canvasRef = useRef();
  const imgCvRef  = useRef();

  // ── Firebase Auth Listener ────────────────────────────────
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async (firebaseUser)=>{
      if(firebaseUser){
        setUser(firebaseUser);
        // Check if user is pro in Firestore
        try {
          const { getDoc, doc } = await import("firebase/firestore");
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          if(snap.exists() && snap.data().plan === "pro") setIsPaid(true);
        } catch(e){}
      } else {
        setUser(null);
        setIsPaid(false);
      }
    });
    return unsub;
  },[]);

  // ── Ad timers ─────────────────────────────────────────────
  useEffect(()=>{
    if(showAd && adTimer > 0){
      const t = setTimeout(()=>setAdTimer(a=>a-1),1000);
      return ()=>clearTimeout(t);
    }
  },[showAd,adTimer]);

  useEffect(()=>{
    if(showSeoAd && seoAdTimer > 0){
      const t = setTimeout(()=>setSeoAdTimer(a=>a-1),1000);
      return ()=>clearTimeout(t);
    }
  },[showSeoAd,seoAdTimer]);

  // ── SELECT screen: draw snapshot on canvas ────────────────
  useEffect(()=>{
    if(screen !== "select" || !videoSnapshot) return;
    const cv = canvasRef.current;
    if(!cv) return;
    const img = new Image();
    img.onload = ()=>{
      cv.width  = img.naturalWidth;
      cv.height = img.naturalHeight;
      cv.getContext("2d").drawImage(img,0,0);
    };
    img.src = videoSnapshot;
  },[screen, videoSnapshot]);

  // ── IMAGE CANVAS ──────────────────────────────────────────
  useEffect(()=>{
    if(screen !== "imgselect" || !imgUrl) return;
    const cv = imgCvRef.current;
    if(!cv) return;
    const img = new Image();
    img.onload = ()=>{
      const maxW  = Math.min(img.naturalWidth, 1200);
      const scale = maxW / img.naturalWidth;
      cv.width  = img.naturalWidth  * scale;
      cv.height = img.naturalHeight * scale;
      cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
    };
    img.src = imgUrl;
  },[screen, imgUrl]);

  // ── CANVAS HELPERS ────────────────────────────────────────
  const getPos = (e, cv) => {
    const r  = cv.getBoundingClientRect();
    const sx = cv.width / r.width;
    const sy = cv.height / r.height;
    const cx = e.touches ? e.touches[0].clientX : e.clientX;
    const cy = e.touches ? e.touches[0].clientY : e.clientY;
    return { x:(cx-r.left)*sx, y:(cy-r.top)*sy };
  };

  // Redraw snapshot + selection box on video canvas
  const drawVideoBox = useCallback((box)=>{
    const cv = canvasRef.current;
    if(!cv || !videoSnapshot) return;
    const img = new Image();
    img.onload = ()=>{
      const ctx = cv.getContext("2d");
      ctx.drawImage(img,0,0,cv.width,cv.height);
      if(!box) return;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(0,0,cv.width,cv.height);
      ctx.clearRect(box.x,box.y,box.w,box.h);
      ctx.drawImage(img,box.x,box.y,box.w,box.h,box.x,box.y,box.w,box.h);
      ctx.strokeStyle="#a78bfa"; ctx.lineWidth=3; ctx.setLineDash([8,5]);
      ctx.strokeRect(box.x,box.y,box.w,box.h); ctx.setLineDash([]);
      ctx.fillStyle="#7c3aed";
      [[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]]
        .forEach(([a,b])=>{ ctx.beginPath(); ctx.arc(a,b,6,0,Math.PI*2); ctx.fill(); });
    };
    img.src = videoSnapshot;
  },[videoSnapshot]);

  const drawImgBox = useCallback((box)=>{
    const cv = imgCvRef.current;
    if(!cv) return;
    const img = new Image();
    img.onload = ()=>{
      const ctx = cv.getContext("2d");
      ctx.drawImage(img,0,0,cv.width,cv.height);
      if(!box) return;
      ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(0,0,cv.width,cv.height);
      ctx.clearRect(box.x,box.y,box.w,box.h);
      ctx.drawImage(img,box.x/cv.width*img.naturalWidth,box.y/cv.height*img.naturalHeight,
        box.w/cv.width*img.naturalWidth,box.h/cv.height*img.naturalHeight,box.x,box.y,box.w,box.h);
      ctx.strokeStyle="#a78bfa"; ctx.lineWidth=3; ctx.setLineDash([8,5]);
      ctx.strokeRect(box.x,box.y,box.w,box.h); ctx.setLineDash([]);
      ctx.fillStyle="#7c3aed";
      [[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]]
        .forEach(([a,b])=>{ ctx.beginPath(); ctx.arc(a,b,6,0,Math.PI*2); ctx.fill(); });
    };
    img.src = imgUrl;
  },[imgUrl]);

  const vDown = e=>{ const p=getPos(e,canvasRef.current); setDrawing(true); setStartPos(p); setWBox(null); drawVideoBox(null); };
  const vMove = e=>{
    if(!drawing||!startPos) return;
    const p=getPos(e,canvasRef.current);
    const b={x:Math.min(startPos.x,p.x),y:Math.min(startPos.y,p.y),w:Math.abs(p.x-startPos.x),h:Math.abs(p.y-startPos.y)};
    setWBox(b); drawVideoBox(b);
  };
  const vUp = ()=>setDrawing(false);

  const iDown = e=>{ const p=getPos(e,imgCvRef.current); setImgDrawing(true); setImgStart(p); setImgBox(null); drawImgBox(null); };
  const iMove = e=>{
    if(!imgDrawing||!imgStart) return;
    const p=getPos(e,imgCvRef.current);
    const b={x:Math.min(imgStart.x,p.x),y:Math.min(imgStart.y,p.y),w:Math.abs(p.x-imgStart.x),h:Math.abs(p.y-imgStart.y)};
    setImgBox(b); drawImgBox(b);
  };
  const iUp = ()=>setImgDrawing(false);

  // ── BLUR HELPER ───────────────────────────────────────────
  const applyBlur = (ctx, canvas, box) => {
    if(!box||box.w<4||box.h<4) return;
    const {x,y,w,h}=box;
    const blurAmt=Math.max(14,Math.min(w,h)*0.35);
    const pad=20;
    const bx=Math.max(0,x-pad), by=Math.max(0,y-pad);
    const bw=Math.min(canvas.width-bx,w+pad*2), bh=Math.min(canvas.height-by,h+pad*2);
    const off=document.createElement("canvas"); off.width=bw; off.height=bh;
    const octx=off.getContext("2d");
    octx.filter=`blur(${blurAmt}px)`;
    octx.drawImage(canvas,bx,by,bw,bh,0,0,bw,bh);
    octx.filter="none";
    ctx.save(); ctx.beginPath(); ctx.rect(x,y,w,h); ctx.clip();
    ctx.drawImage(off,0,0,bw,bh,bx,by,bw,bh);
    ctx.restore();
  };

  // ── CAPTURE VIDEO FRAME (called from upload screen) ───────
  const captureAndGoToSelect = () => {
    const v = videoRef.current;
    if(!v) return;
    const snap = document.createElement("canvas");
    snap.width  = v.videoWidth  || 640;
    snap.height = v.videoHeight || 360;
    const ctx = snap.getContext("2d");
    if(v.readyState >= 2){
      ctx.drawImage(v,0,0,snap.width,snap.height);
    } else {
      // Video not ready — draw black with text
      ctx.fillStyle="#222";
      ctx.fillRect(0,0,snap.width,snap.height);
      ctx.fillStyle="#fff"; ctx.font="20px sans-serif"; ctx.textAlign="center";
      ctx.fillText("Video loaded — draw selection box",snap.width/2,snap.height/2);
    }
    setVideoSnapshot(snap.toDataURL("image/jpeg",0.95));
    setScreen("select");
  };

  // ── PROCESS VIDEO (with blur on snapshot) ─────────────────
  const doProcess = () => {
    if(!wBox||!videoSnapshot) return;
    // If free user, show 60-sec ad first
    if(!isPaid){
      setPendingAction("processVideo");
      setAdTimer(60);
      setShowAd(true);
      return;
    }
    _actuallyProcessVideo();
  };

  const _actuallyProcessVideo = () => {
    setScreen("processing"); setProgress(0);
    const img = new Image();
    img.onload = ()=>{
      const out = document.createElement("canvas");
      out.width=img.naturalWidth; out.height=img.naturalHeight;
      const ctx=out.getContext("2d");
      ctx.drawImage(img,0,0);
      applyBlur(ctx,out,wBox);
      // Free users get compressed (lower quality), Pro gets full
      const quality = isPaid ? 0.95 : 0.6;
      setProcessedUrl(out.toDataURL("image/jpeg",quality));
      // Save history
      if(user) addHistory(user.uid,{type:"video",action:"watermark_removed"});
      let p=0;
      const iv=setInterval(()=>{
        p+=Math.random()*18+8;
        if(p>=100){ clearInterval(iv); setProgress(100); setTimeout(()=>setScreen("export"),400); return; }
        setProgress(Math.min(p,100));
      },120);
    };
    img.src=videoSnapshot;
  };

  // ── PROCESS IMAGE ─────────────────────────────────────────
  const doImgProcess = () => {
    if(!isPaid){
      setPendingAction("processImage");
      setAdTimer(60);
      setShowAd(true);
      return;
    }
    _actuallyProcessImage();
  };

  const _actuallyProcessImage = () => {
    const cv=imgCvRef.current;
    if(!cv||!imgBox) return;
    const out=document.createElement("canvas"); out.width=cv.width; out.height=cv.height;
    const ctx=out.getContext("2d");
    const img=new Image();
    img.onload=()=>{
      ctx.drawImage(img,0,0,cv.width,cv.height);
      applyBlur(ctx,out,imgBox);
      const quality=isPaid?1.0:0.6;
      setImgProcessed(out.toDataURL("image/png",quality));
      if(user) addHistory(user.uid,{type:"image",action:"watermark_removed"});
      setScreen("imgexport");
    };
    img.src=imgUrl;
  };

  // ── AD DONE ───────────────────────────────────────────────
  const adDone = () => {
    setShowAd(false);
    if(pendingAction==="processVideo"){ setPendingAction(null); _actuallyProcessVideo(); }
    else if(pendingAction==="processImage"){ setPendingAction(null); _actuallyProcessImage(); }
    else if(pendingAction==="download"){ setPendingAction(null); _triggerDL(); }
  };

  // ── DOWNLOAD ──────────────────────────────────────────────
  const doDownload = () => {
    if(!isPaid){
      setPendingAction("download");
      setAdTimer(60);
      setShowAd(true);
    } else {
      _triggerDL();
    }
  };

  const _triggerDL = () => {
    if(!processedUrl) return;
    const a=document.createElement("a"); a.href=processedUrl; a.download="reelkit_processed.jpg"; a.click();
  };

  // ── SEO ───────────────────────────────────────────────────
  const genSEO = async (topic) => {
    if(!isPaid){ setPendingSeo(topic); setSeoAdTimer(60); setShowSeoAd(true); return; }
    _actuallyGenSEO(topic);
  };

  const _actuallyGenSEO = async (topic) => {
    setSeoLoading(true); setSeoData(null);
    try {
      const res=await fetch("/api/seo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,platform})});
      setSeoData(await res.json());
    } catch {
      setSeoData({
        titles:[`🔥 ${topic} — Must Watch ${YEAR}`,`This ${topic} Will Change Everything!`,`Every Creator Must Know This`],
        tags:[`#${topic.replace(/\s+/g,"")}`, "#contentcreator","#viral","#trending","#youtubeIndia","#reelsindia","#reelkit","#indiancreator"],
        description:`${topic} — Use ReelKit free at reelkit.in. #reelkit #viral #reelsindia`
      });
    }
    setSeoLoading(false);
    if(user) addHistory(user.uid,{type:"seo",topic});
  };

  const cp=(text,key)=>{ navigator.clipboard?.writeText(text); setCopied(key); setTimeout(()=>setCopied(""),2000); };

  // ── SHARED COMPONENTS ─────────────────────────────────────
  const Btn  = ({onClick,children,style={}})=>(
    <button onClick={onClick} style={{width:"100%",padding:"17px",borderRadius:14,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:G,...style}}>{children}</button>
  );
  const BtnO = ({onClick,children,style={}})=>(
    <button onClick={onClick} style={{width:"100%",padding:"16px",borderRadius:14,border:"1px solid "+C.bdr,cursor:"pointer",fontSize:16,fontWeight:500,color:C.sub2,background:"transparent",marginTop:12,...style}}>{children}</button>
  );

  const Nav = ()=>(
    <div style={{background:C.nav,height:58,display:"flex",alignItems:"center",padding:"0 20px",position:"sticky",top:0,zIndex:50,boxSizing:"border-box"}}>
      <div onClick={()=>setScreen("home")} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
        <div style={{width:34,height:34,borderRadius:9,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:17}}>✦</div>
        <span style={{color:"#fff",fontWeight:800,fontSize:18}}>ReelKit</span>
      </div>
      <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center"}}>
        {isPaid&&<span style={{fontSize:13,fontWeight:700,padding:"5px 14px",borderRadius:20,background:G,color:"#fff"}}>★ Pro</span>}
        {user
          ? <button onClick={()=>setShowProfile(true)} style={{background:"rgba(255,255,255,0.12)",border:"none",color:"#fff",cursor:"pointer",padding:"6px 14px",borderRadius:9,fontSize:14,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
              {user.photoURL
                ? <img src={user.photoURL} alt="" style={{width:28,height:28,borderRadius:50,objectFit:"cover"}}/>
                : <div style={{width:28,height:28,borderRadius:50,background:G,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800}}>{(user.displayName||"U")[0]}</div>
              }
              <span style={{maxWidth:80,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.displayName?.split(" ")[0]||"Profile"}</span>
            </button>
          : <button onClick={()=>setShowLogin(true)} style={{background:"rgba(255,255,255,0.12)",border:"none",color:"#fff",cursor:"pointer",padding:"8px 18px",borderRadius:9,fontSize:15,fontWeight:600}}>Log In</button>
        }
      </div>
    </div>
  );

  const Wrap = ({children})=>(
    <div style={{width:"100%",maxWidth:660,margin:"0 auto",padding:"28px 16px 110px",boxSizing:"border-box"}}>{children}</div>
  );

  const AdBanner = ()=>!isPaid?(
    <div style={{marginTop:28}}>
      <div style={{background:C.surf,border:"1px dashed "+C.bdr,borderRadius:16,padding:"22px 16px",textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:C.sub,marginBottom:8}}>Advertisement</div>
        <div style={{fontSize:15,color:C.sub}}>Google Ad — Live after AdSense approval</div>
      </div>
      <div onClick={()=>setShowSub(true)} style={{background:"#f5f0ff",border:"1px solid #c4b5fd",borderRadius:16,padding:"20px 18px",cursor:"pointer",display:"flex",gap:16,alignItems:"center"}}>
        <div style={{width:48,height:48,borderRadius:13,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:20,flexShrink:0}}>★</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:800,fontSize:16,color:"#3b0764",marginBottom:4}}>Remove ads — ₹50/month</div>
          <div style={{fontSize:14,color:"#6d28d9"}}>Full quality · All sizes · AI SEO · No ads</div>
        </div>
        <div style={{color:"#7c3aed",fontSize:22,flexShrink:0}}>→</div>
      </div>
    </div>
  ):null;

  // ══════════════════════════════════════════════════════════
  // SCREENS
  // ══════════════════════════════════════════════════════════

  // ── HOME ─────────────────────────────────────────────────
  if(screen==="home") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}>
      <Nav/>
      <div style={{background:"linear-gradient(160deg,#1a1a2a,#2d1b69,#1a1a2a)",padding:"36px 16px 44px",width:"100%",boxSizing:"border-box"}}>
        <div style={{maxWidth:660,margin:"0 auto"}}>
          <div style={{display:"flex",background:"rgba(255,255,255,0.08)",borderRadius:14,padding:5,marginBottom:26,gap:4}}>
            {[{id:"video",label:"Video"},{id:"image",label:"Image"},{id:"seo",label:"AI SEO"}].map(t=>{
              const a=tab===t.id;
              return <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"12px 6px",borderRadius:10,border:a?"1.5px solid #a78bfa":"1.5px solid transparent",cursor:"pointer",fontSize:14,fontWeight:a?700:500,background:a?"rgba(255,255,255,0.18)":"transparent",color:a?"#fff":"rgba(255,255,255,0.5)",transition:"all .15s"}}>{t.label}</button>;
            })}
          </div>
          <div style={{textAlign:"center",marginBottom:26}}>
            <h1 style={{fontSize:32,fontWeight:900,letterSpacing:-0.8,lineHeight:1.15,margin:"0 0 12px",color:"#ffffff"}}>
              {tab==="video"&&"Remove Watermark from Video"}
              {tab==="image"&&"Remove Watermark from Image"}
              {tab==="seo"&&"AI SEO Generator for Creators"}
            </h1>
            <p style={{color:"rgba(255,255,255,0.72)",fontSize:16,margin:0}}>
              {tab==="video"&&"Draw over the watermark — we blur it out, free"}
              {tab==="image"&&"Remove watermarks from photos — free"}
              {tab==="seo"&&"Viral titles, 20 trending tags & description"}
            </p>
          </div>
          <div style={{background:"#fff",borderRadius:22,padding:"28px 22px",boxShadow:"0 8px 40px rgba(0,0,0,0.2)",boxSizing:"border-box"}}>
            {tab==="video"&&(
              <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>fileRef.current?.click()}
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

            {tab==="image"&&(
              <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>imgRef.current?.click()}
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

            {tab==="seo"&&(
              <div>
                <div style={{display:"flex",gap:10,marginBottom:16}}>
                  {["youtube","instagram"].map(p=>(
                    <button key={p} onClick={()=>{ setPlatform(p); setSeoData(null); }} style={{flex:1,padding:"12px",borderRadius:11,border:platform===p?"2px solid #7c3aed":"1px solid "+C.bdr,background:platform===p?C.tagBg:"#fafafa",color:platform===p?C.tagClr:C.sub2,cursor:"pointer",fontWeight:platform===p?700:500,fontSize:15}}>
                      {p==="youtube"?"▶ YouTube":"◉ Instagram"}
                    </button>
                  ))}
                </div>
                <div style={{position:"relative"}}>
                  <textarea value={seoInput} onChange={e=>setSeoInput(e.target.value)}
                    onKeyDown={e=>{ if(e.key==="Enter"&&!e.shiftKey&&seoInput.trim()){ e.preventDefault(); genSEO(seoInput.trim()); }}}
                    placeholder={'e.g. "Morning skincare routine"'}
                    style={{width:"100%",minHeight:96,padding:"16px 16px 56px",borderRadius:12,border:"1px solid "+C.bdr,background:C.inp,color:C.txt,fontSize:16,resize:"none",outline:"none",lineHeight:1.7,boxSizing:"border-box",fontFamily:"inherit"}}/>
                  <button onClick={()=>{ if(seoInput.trim()) genSEO(seoInput.trim()); }} disabled={!seoInput.trim()||seoLoading}
                    style={{position:"absolute",bottom:12,right:12,padding:"9px 20px",borderRadius:9,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,color:"#fff",background:seoInput.trim()?G:"#ccc",opacity:seoLoading?0.6:1}}>
                    {seoLoading?"Wait...":"Generate →"}
                  </button>
                </div>
                <div style={{marginTop:10}}>
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

      <div style={{width:"100%",maxWidth:660,margin:"0 auto",padding:"28px 16px 100px",boxSizing:"border-box"}}>
        {tab==="seo"&&seoData&&!seoLoading&&(<>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
            <span style={{fontSize:14,color:C.sub}}>Results for:</span>
            <span style={{fontSize:14,fontWeight:700,padding:"4px 14px",borderRadius:20,background:C.tagBg,color:C.tagClr}}>"{seoInput}"</span>
            <button onClick={()=>setSeoData(null)} style={{fontSize:13,color:C.sub,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Change</button>
          </div>
          {[
            {title:"Titles",content:seoData.titles?.map((t,i)=>(
              <div key={i} style={{background:C.surf,padding:14,borderRadius:12,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,border:"1px solid "+C.bdr}}>
                <span style={{fontSize:15,flex:1,lineHeight:1.6,color:C.txt,minWidth:0}}>{t}</span>
                <button onClick={()=>cp(t,"t"+i)} style={{background:C.tagBg,border:"none",color:copied==="t"+i?C.okTxt:C.tagClr,cursor:"pointer",padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:700,flexShrink:0}}>{copied==="t"+i?"✓":"Copy"}</button>
              </div>
            ))},
            {title:"Tags",content:<>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{seoData.tags?.map((t,i)=><span key={i} onClick={()=>cp(t,"tg"+i)} style={{background:C.tagBg,border:"1px solid #c4b5fd",padding:"6px 14px",borderRadius:40,fontSize:14,cursor:"pointer",color:copied==="tg"+i?C.okTxt:C.tagClr}}>{t}</span>)}</div>
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
        <AdBanner/>
        <div style={{marginTop:44}}>
          <p style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:C.sub,textAlign:"center",marginBottom:20}}>How it works</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[{n:"1",t:"Upload",d:"Select your file"},{n:"2",t:"Draw",d:"Box over watermark"},{n:"3",t:"Download",d:"Blurred & clean"}].map(s=>(
              <div key={s.n} style={{background:C.card,borderRadius:18,padding:"20px 10px",textAlign:"center",border:"1px solid "+C.bdr}}>
                <div style={{width:38,height:38,borderRadius:50,background:"linear-gradient(135deg,#c4b5fd,#f0abfc)",color:"#fff",fontWeight:800,fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px"}}>{s.n}</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:4,color:C.txt}}>{s.t}</div>
                <div style={{fontSize:13,color:C.sub2}}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginTop:40,paddingTop:24,borderTop:"1px solid "+C.bdr,display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
          <span style={{fontSize:13,color:C.sub}}>© {YEAR} ReelKit.in</span>
          <div style={{display:"flex",gap:16}}>
            <span onClick={()=>setShowPrivacy(true)} style={{fontSize:13,color:C.sub,cursor:"pointer"}}>Privacy</span>
            <span onClick={()=>setShowTerms(true)} style={{fontSize:13,color:C.sub,cursor:"pointer"}}>Terms</span>
          </div>
        </div>
      </div>

      {showSeoAd&&<SeoAdModal timer={seoAdTimer} onShow={()=>{ setShowSeoAd(false); _actuallyGenSEO(pendingSeo); setPendingSeo(null); }} onUpgrade={()=>{ setShowSeoAd(false); setShowSub(true); }}/>}
      {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
      {showLogin&&<LoginModal onClose={()=>setShowLogin(false)}/>}
      {showProfile&&<ProfileModal user={user} isPaid={isPaid} history={userHistory} onShowHistory={async()=>{ if(user){ try{ const q=query(collection(db,"users",user.uid,"history"),orderBy("createdAt","desc"),limit(20)); const snaps=await getDocs(q); setUserHistory(snaps.docs.map(d=>({id:d.id,...d.data()}))); setShowHistory(true); }catch(e){} } }} onClose={()=>setShowProfile(false)} onLogout={async()=>{ await logOut(); setUser(null); setIsPaid(false); setShowProfile(false); }}/>}
      {showHistory&&<HistoryModal history={userHistory} onClose={()=>setShowHistory(false)}/>}
      {showPrivacy&&<LegalModal title="Privacy Policy" onClose={()=>setShowPrivacy(false)}><PrivacyContent/></LegalModal>}
      {showTerms&&<LegalModal title="Terms of Use" onClose={()=>setShowTerms(false)}><TermsContent/></LegalModal>}
    </div>
  );

  // ── UPLOAD ───────────────────────────────────────────────
  if(screen==="upload") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:20,fontWeight:500}}>← Back</div>
        {/* Video preview — user can seek to exact watermark frame */}
        <video ref={videoRef} src={videoUrl} style={{width:"100%",borderRadius:16,background:"#000",display:"block",boxSizing:"border-box"}} controls playsInline/>
        <div style={{background:"#f0f9ff",border:"1px solid #bae6fd",borderRadius:12,padding:"12px 16px",marginTop:12,fontSize:14,color:"#0369a1"}}>
          💡 <strong>Tip:</strong> Seek to the frame where watermark is visible, then click "Select Watermark Area"
        </div>
        <div style={{background:C.card,borderRadius:16,padding:16,marginTop:12,border:"1px solid "+C.bdr,display:"flex",gap:14,alignItems:"center"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.txt}}>{videoFile?.name}</div>
            <div style={{color:C.sub,fontSize:13,marginTop:3}}>{videoFile?(videoFile.size/1024/1024).toFixed(1)+" MB":""}</div>
          </div>
          <button onClick={()=>fileRef.current?.click()} style={{padding:"9px 16px",borderRadius:10,border:"1px solid "+C.bdr,background:"transparent",color:C.sub2,cursor:"pointer",fontSize:14,flexShrink:0}}>Change</button>
          <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{ const f=e.target.files[0]; if(f){ setVideoFile(f); setVideoUrl(URL.createObjectURL(f)); } e.target.value=""; }}/>
        </div>
        <div style={{background:C.warnBg,border:"1px solid "+C.warnBdr,borderRadius:14,padding:16,marginTop:14}}>
          <div style={{fontWeight:700,fontSize:15,color:C.warnTxt,marginBottom:10}}>⚠️ Legal Notice</div>
          <p style={{fontSize:15,lineHeight:1.8,color:C.warnTxt,margin:"0 0 14px"}}>ReelKit is only for videos <b>you own or have rights to</b>.</p>
          <label style={{display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer"}}>
            <input type="checkbox" checked={legalOk} onChange={e=>setLegalOk(e.target.checked)} style={{marginTop:3,accentColor:"#7c3aed",flexShrink:0,width:18,height:18}}/>
            <span style={{fontSize:15,lineHeight:1.7,color:C.warnTxt,fontWeight:500}}>I own this video and accept full legal responsibility.</span>
          </label>
        </div>
        {/* KEY FIX: captureAndGoToSelect captures current frame BEFORE switching screen */}
        <Btn onClick={captureAndGoToSelect} style={{opacity:legalOk?1:0.3,marginTop:16}}>Select Watermark Area →</Btn>
      </Wrap>
    </div>
  );

  // ── SELECT (VIDEO) ────────────────────────────────────────
  if(screen==="select") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("upload")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Back</div>
        <h2 style={{fontSize:24,fontWeight:800,marginBottom:6,color:C.txt}}>Select Watermark</h2>
        <p style={{color:C.sub2,marginBottom:14,fontSize:15,marginTop:0}}>✍️ Draw a box over the watermark area to blur it</p>
        <div style={{position:"relative",borderRadius:16,overflow:"hidden",background:"#111",border:"2px solid "+C.bdr,touchAction:"none",cursor:"crosshair"}}>
          <canvas ref={canvasRef} style={{width:"100%",display:"block",touchAction:"none"}}
            onMouseDown={vDown} onMouseMove={vMove} onMouseUp={vUp} onMouseLeave={vUp}
            onTouchStart={e=>{ e.preventDefault(); vDown(e); }}
            onTouchMove={e=>{ e.preventDefault(); vMove(e); }}
            onTouchEnd={e=>{ e.preventDefault(); vUp(); }}/>
          {!wBox&&(
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.7)",background:"rgba(0,0,0,0.5)",padding:"8px 16px",borderRadius:20,whiteSpace:"nowrap"}}>✍️ Click & drag to select watermark</div>
            </div>
          )}
        </div>
        {wBox&&<div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:12,padding:"13px 16px",marginTop:12,fontSize:15,color:C.okTxt,fontWeight:600}}>✓ Area selected — ready to blur!</div>}
        <Btn onClick={doProcess} style={{opacity:wBox?1:0.35,marginTop:14}}>
          {isPaid?"Remove Watermark →":"Remove Watermark (1 min ad) →"}
        </Btn>
        <BtnO onClick={()=>{ setWBox(null); if(canvasRef.current&&videoSnapshot){ const img=new Image(); img.onload=()=>canvasRef.current.getContext("2d").drawImage(img,0,0,canvasRef.current.width,canvasRef.current.height); img.src=videoSnapshot; } }}>Clear Selection</BtnO>
        {!isPaid&&<div style={{textAlign:"center",fontSize:13,color:C.sub,marginTop:10}}>Free users watch 1 min ad · <span onClick={()=>setShowSub(true)} style={{color:C.tagClr,cursor:"pointer",fontWeight:600}}>Upgrade to skip →</span></div>}
      </Wrap>
    </div>
  );

  // ── PROCESSING ────────────────────────────────────────────
  if(screen==="processing") return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",padding:"40px 24px",maxWidth:400,width:"100%",boxSizing:"border-box"}}>
        <div style={{width:72,height:72,borderRadius:20,background:C.tagBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:36}}>✦</div>
        <div style={{fontSize:24,fontWeight:800,marginBottom:8,color:C.txt}}>Applying Blur…</div>
        <p style={{color:C.sub2,fontSize:15,marginBottom:26}}>Removing watermark from your video</p>
        <div style={{background:C.bdr,borderRadius:100,height:8,overflow:"hidden"}}>
          <div style={{height:"100%",background:G,width:progress+"%",transition:"width .12s",borderRadius:100}}/>
        </div>
        <div style={{fontWeight:900,fontSize:38,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:14}}>{Math.round(progress)}%</div>
      </div>
    </div>
  );

  // ── EXPORT (VIDEO) ────────────────────────────────────────
  if(screen==="export") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Home</div>
        <div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:14,padding:"14px 18px",display:"flex",gap:14,alignItems:"center",marginBottom:22}}>
          <span style={{color:C.okTxt,fontWeight:700,fontSize:22}}>✓</span>
          <span style={{fontSize:16,color:C.okTxt,fontWeight:600}}>Watermark blurred successfully!</span>
        </div>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:C.sub,marginBottom:12}}>Before / After</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:C.card,borderRadius:14,padding:10,border:"1px solid "+C.bdr}}>
              <div style={{fontSize:11,color:C.sub,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Before</div>
              {videoSnapshot&&<img src={videoSnapshot} style={{width:"100%",borderRadius:10,display:"block"}} alt="before"/>}
            </div>
            <div style={{background:C.card,borderRadius:14,padding:10,border:"1px solid "+C.okBdr}}>
              <div style={{fontSize:11,color:C.okTxt,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>After ✓</div>
              {processedUrl&&<img src={processedUrl} style={{width:"100%",borderRadius:10,display:"block"}} alt="after"/>}
            </div>
          </div>
          {!isPaid&&<div style={{background:"#fff4ed",border:"1px solid #fed7aa",borderRadius:10,padding:"10px 14px",marginTop:10,fontSize:13,color:"#92400e"}}>⚠️ Free version: Compressed quality. <span onClick={()=>setShowSub(true)} style={{fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Upgrade for full HD →</span></div>}
        </div>
        <Btn onClick={doDownload}>{isPaid?"↓ Download Full HD":"↓ Download (1 min ad)"}</Btn>
        <BtnO onClick={()=>{ setTab("seo"); setScreen("home"); }}>Generate AI SEO Tags →</BtnO>
        <BtnO onClick={()=>setShowSub(true)}>★ Upgrade ₹50/month — HD + No Ads</BtnO>
        <BtnO onClick={()=>{ setWBox(null); setProcessedUrl(null); setVideoSnapshot(null); setScreen("home"); }}>← Process Another Video</BtnO>
        {showAd&&<AdModal timer={adTimer} onDone={adDone} onUpgrade={()=>{ setShowAd(false); setShowSub(true); }}/>}
        {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
      </Wrap>
    </div>
  );

  // ── IMG SELECT ────────────────────────────────────────────
  if(screen==="imgselect") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Back</div>
        <h2 style={{fontSize:24,fontWeight:800,marginBottom:6,color:C.txt}}>Select Watermark</h2>
        <p style={{color:C.sub2,marginBottom:14,fontSize:15,marginTop:0}}>✍️ Draw a box over the watermark to blur it</p>
        <div style={{position:"relative",borderRadius:16,overflow:"hidden",background:C.surf,border:"2px solid "+C.bdr,touchAction:"none",cursor:"crosshair"}}>
          <canvas ref={imgCvRef} style={{width:"100%",display:"block",touchAction:"none"}}
            onMouseDown={iDown} onMouseMove={iMove} onMouseUp={iUp} onMouseLeave={iUp}
            onTouchStart={e=>{ e.preventDefault(); iDown(e); }}
            onTouchMove={e=>{ e.preventDefault(); iMove(e); }}
            onTouchEnd={e=>{ e.preventDefault(); iUp(); }}/>
          {!imgBox&&(
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}>
              <div style={{fontSize:13,color:"rgba(0,0,0,0.5)",background:"rgba(255,255,255,0.85)",padding:"8px 16px",borderRadius:20,whiteSpace:"nowrap"}}>✍️ Click & drag to select watermark</div>
            </div>
          )}
        </div>
        {imgBox&&<div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:12,padding:"13px 16px",marginTop:12,fontSize:15,color:C.okTxt,fontWeight:600}}>✓ Area selected — ready!</div>}
        <Btn onClick={doImgProcess} style={{opacity:imgBox?1:0.35,marginTop:14,background:"linear-gradient(135deg,#f97316,#ec4899)"}}>
          {isPaid?"Remove Watermark →":"Remove Watermark (1 min ad) →"}
        </Btn>
        <BtnO onClick={()=>{ setImgBox(null); drawImgBox(null); }}>Clear Selection</BtnO>
        {!isPaid&&<div style={{textAlign:"center",fontSize:13,color:C.sub,marginTop:10}}>Free users watch 1 min ad · <span onClick={()=>setShowSub(true)} style={{color:C.tagClr,cursor:"pointer",fontWeight:600}}>Upgrade to skip →</span></div>}
      </Wrap>
    </div>
  );

  // ── IMG EXPORT ────────────────────────────────────────────
  if(screen==="imgexport") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Home</div>
        <div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:14,padding:"14px 18px",display:"flex",gap:14,alignItems:"center",marginBottom:20}}>
          <span style={{color:C.okTxt,fontWeight:700,fontSize:22}}>✓</span>
          <span style={{fontSize:16,color:C.okTxt,fontWeight:600}}>Watermark blurred!</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          <div style={{background:C.card,borderRadius:14,padding:12,border:"1px solid "+C.bdr}}>
            <div style={{fontSize:12,color:C.sub,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Before</div>
            <img src={imgOriginal||imgUrl} alt="before" style={{width:"100%",borderRadius:10,display:"block"}}/>
          </div>
          <div style={{background:C.card,borderRadius:14,padding:12,border:"1px solid "+C.okBdr}}>
            <div style={{fontSize:12,color:C.okTxt,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>After ✓</div>
            {imgProcessed&&<img src={imgProcessed} alt="after" style={{width:"100%",borderRadius:10,display:"block"}}/>}
          </div>
        </div>
        {!isPaid&&<div style={{background:"#fff4ed",border:"1px solid #fed7aa",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#92400e"}}>⚠️ Free: Compressed quality. <span onClick={()=>setShowSub(true)} style={{fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Upgrade for PNG/Full HD →</span></div>}
        <Btn onClick={()=>{ const a=document.createElement("a"); a.href=imgProcessed||imgUrl; a.download=isPaid?"reelkit.png":"reelkit_compressed.jpg"; a.click(); }}
          style={{background:"linear-gradient(135deg,#f97316,#ec4899)"}}>
          {isPaid?"↓ Download PNG (Full Quality)":"↓ Download (Compressed)"}
        </Btn>
        <BtnO onClick={()=>setShowSub(true)}>★ Upgrade ₹50/month — Full Quality</BtnO>
        <BtnO onClick={()=>{ setImgBox(null); setImgProcessed(null); setImgUrl(null); setImgOriginal(null); setScreen("home"); }}>← Process Another Image</BtnO>
        {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
      </Wrap>
    </div>
  );

  return null;
}

// ══════════════════════════════════════════════════════════
// MODALS
// ══════════════════════════════════════════════════════════

// ── 60-SECOND AD MODAL ────────────────────────────────────
function AdModal({timer, onDone, onUpgrade}) {
  const pct = Math.round(((60-timer)/60)*100);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:"#fff",borderRadius:24,padding:28,width:"100%",maxWidth:400,textAlign:"center",boxSizing:"border-box"}}>
        <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#888",marginBottom:14}}>Advertisement</div>
        <div style={{background:"#f5f5f7",borderRadius:14,padding:"50px 20px",marginBottom:18,border:"1px dashed #e2e2e8"}}>
          <div style={{fontWeight:600,fontSize:16,color:"#888"}}>Google Ad Space</div>
          <div style={{fontSize:14,color:"#aaa",marginTop:4}}>Live after AdSense approval</div>
        </div>
        {/* Progress bar */}
        <div style={{background:"#e2e2e8",borderRadius:100,height:6,marginBottom:10,overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(135deg,#7c3aed,#db2777)",width:pct+"%",transition:"width 1s linear",borderRadius:100}}/>
        </div>
        <div style={{fontSize:14,color:"#888",marginBottom:16}}>{timer>0?`Ad ends in ${timer}s…`:"Ad complete!"}</div>
        <button style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:timer>0?"not-allowed":"pointer",fontSize:17,fontWeight:700,color:"#fff",background:timer>0?"#bbb":"linear-gradient(135deg,#7c3aed,#db2777)",boxSizing:"border-box"}} disabled={timer>0} onClick={onDone}>
          {timer>0?`Wait ${timer}s…`:"↓ Continue to Download"}
        </button>
        <button style={{width:"100%",padding:"13px",borderRadius:12,border:"1px solid #7c3aed",cursor:"pointer",fontSize:15,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:10,boxSizing:"border-box"}} onClick={onUpgrade}>★ Go Pro ₹50/month — Skip All Ads</button>
      </div>
    </div>
  );
}

function SeoAdModal({timer, onShow, onUpgrade}) {
  const pct=Math.round(((60-timer)/60)*100);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
      <div style={{background:"#fff",borderRadius:24,padding:28,width:"100%",maxWidth:400,boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
          <span style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#888"}}>Advertisement</span>
        </div>
        <div style={{background:"#f5f5f7",borderRadius:14,padding:"40px 20px",marginBottom:16,border:"1px dashed #e2e2e8",textAlign:"center"}}>
          <div style={{fontWeight:600,fontSize:15,color:"#888"}}>Google Ad Space</div>
        </div>
        <div style={{background:"#e2e2e8",borderRadius:100,height:6,marginBottom:10,overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(135deg,#7c3aed,#db2777)",width:pct+"%",transition:"width 1s linear",borderRadius:100}}/>
        </div>
        <div style={{fontSize:14,color:"#888",marginBottom:14,textAlign:"center"}}>{timer>0?`Results in ${timer}s…`:"Ready!"}</div>
        <button style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:timer>0?"not-allowed":"pointer",fontSize:17,fontWeight:700,color:"#fff",background:timer>0?"#bbb":"linear-gradient(135deg,#7c3aed,#db2777)",boxSizing:"border-box"}} disabled={timer>0} onClick={onShow}>
          {timer>0?`Wait ${timer}s…`:"✓ Show My SEO Results"}
        </button>
        <button style={{width:"100%",padding:"13px",borderRadius:12,border:"1px solid #7c3aed",cursor:"pointer",fontSize:15,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:10,boxSizing:"border-box"}} onClick={onUpgrade}>★ Skip — Upgrade to Pro</button>
      </div>
    </div>
  );
}

// ── SUBSCRIPTION MODAL ────────────────────────────────────
function SubModal({setIsPaid, user, onClose}) {
  const G="linear-gradient(135deg,#6d28d9,#db2777)";
  const handleSubscribe = async () => {
    // TODO: Integrate Razorpay here
    // For now, just set paid = true and update Firestore
    setIsPaid(true);
    if(user){
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        await setDoc(doc(db,"users",user.uid),{plan:"pro"},{merge:true});
      } catch(e){}
    }
    onClose();
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:300}}>
      <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",padding:"30px 20px 52px",boxSizing:"border-box"}}>
        <div style={{textAlign:"center",marginBottom:22}}>
          <div style={{fontWeight:800,fontSize:24}}>ReelKit Pro</div>
          <div style={{fontSize:40,fontWeight:900,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:6}}>₹50<span style={{fontSize:17,WebkitTextFillColor:"#666",fontWeight:400}}>/month</span></div>
          <div style={{fontSize:15,color:"#888",marginTop:4}}>or ₹399/year — save ₹201</div>
        </div>
        <div style={{background:"#f5f5f7",borderRadius:14,padding:16,marginBottom:20}}>
          {["Full HD exports — no compression","No ads — ever","All 7 trending sizes","AI SEO titles, tags & description","Order & usage history","Priority processing","PNG 4K image exports"].map(f=>(
            <div key={f} style={{display:"flex",gap:14,alignItems:"center",padding:"11px 0",borderBottom:"1px solid #e2e2e8"}}>
              <span style={{color:"#7c3aed",fontWeight:700,fontSize:18}}>✓</span>
              <span style={{fontSize:16,fontWeight:500}}>{f}</span>
            </div>
          ))}
        </div>
        <button style={{width:"100%",padding:17,borderRadius:14,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:G,boxSizing:"border-box"}} onClick={handleSubscribe}>Subscribe via Razorpay →</button>
        <button style={{width:"100%",padding:15,borderRadius:14,border:"1px solid #e2e2e8",cursor:"pointer",fontSize:16,color:"#666",background:"transparent",marginTop:12,boxSizing:"border-box"}} onClick={onClose}>Maybe Later</button>
      </div>
    </div>
  );
}

// ── SOCIAL LOGIN MODAL ────────────────────────────────────
function LoginModal({onClose}) {
  const [loading, setLoading] = useState("");
  const [error,   setError]   = useState("");

  const handleGoogle = async () => {
    setLoading("google"); setError("");
    try {
      const fbUser = await signInGoogle();
      // Save to Firestore
      await saveUser(fbUser.uid, {
        name:      fbUser.displayName,
        email:     fbUser.email,
        photo:     fbUser.photoURL,
        provider:  "google",
        plan:      "free",
        createdAt: new Date().toISOString(),
      });
      onClose();
    } catch(e) {
      setError("Google login failed. Check Firebase config in firebase.js");
    }
    setLoading("");
  };

  const handleFacebook = async () => {
    setLoading("facebook"); setError("");
    try {
      const fbUser = await signInFacebook();
      await saveUser(fbUser.uid, {
        name:      fbUser.displayName,
        email:     fbUser.email,
        photo:     fbUser.photoURL,
        provider:  "facebook",
        plan:      "free",
        createdAt: new Date().toISOString(),
      });
      onClose();
    } catch(e) {
      setError("Facebook login failed. Add Facebook App ID in Firebase Console.");
    }
    setLoading("");
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:300}}>
      <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",padding:"30px 20px 52px",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontWeight:800,fontSize:22,color:"#111"}}>Welcome to ReelKit</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:36,height:36,borderRadius:10,fontSize:18}}>✕</button>
        </div>
        <p style={{color:"#777",fontSize:15,marginBottom:24,marginTop:4}}>Sign in free — no password needed</p>

        {error&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"12px 16px",fontSize:14,color:"#dc2626",marginBottom:16,lineHeight:1.6}}>{error}</div>}

        {/* Google */}
        <button onClick={handleGoogle} disabled={!!loading}
          style={{width:"100%",padding:"16px",borderRadius:14,border:"1.5px solid #e2e2e8",cursor:loading?"not-allowed":"pointer",fontSize:16,fontWeight:600,color:"#111",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:14,marginBottom:14,opacity:loading?0.7:1,boxSizing:"border-box"}}>
          <svg width="22" height="22" viewBox="0 0 24 24" style={{flexShrink:0}}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading==="google"?"Connecting…":"Continue with Google"}
        </button>

        {/* Facebook */}
        <button onClick={handleFacebook} disabled={!!loading}
          style={{width:"100%",padding:"16px",borderRadius:14,border:"none",cursor:loading?"not-allowed":"pointer",fontSize:16,fontWeight:600,color:"#fff",background:"#1877F2",display:"flex",alignItems:"center",justifyContent:"center",gap:14,opacity:loading?0.7:1,boxSizing:"border-box",marginBottom:20}}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff" style={{flexShrink:0}}>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          {loading==="facebook"?"Connecting…":"Continue with Facebook"}
        </button>
        <p style={{textAlign:"center",fontSize:13,color:"#aaa",margin:0}}>By continuing you agree to our Terms & Privacy Policy</p>
      </div>
    </div>
  );
}

// ── PROFILE MODAL ─────────────────────────────────────────
function ProfileModal({user, isPaid, onShowHistory, onClose, onLogout}) {
  const G="linear-gradient(135deg,#7c3aed,#db2777)";
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:300}}>
      <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",padding:"30px 20px 52px",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}>
          <div style={{fontWeight:800,fontSize:22}}>My Profile</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:36,height:36,borderRadius:10,fontSize:18}}>✕</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:24,padding:"16px",background:"#f5f5f7",borderRadius:16}}>
          {user?.photoURL
            ? <img src={user.photoURL} alt="" style={{width:56,height:56,borderRadius:50,objectFit:"cover",flexShrink:0}}/>
            : <div style={{width:56,height:56,borderRadius:50,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:22,flexShrink:0}}>{(user?.displayName||"U")[0]}</div>
          }
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:18,color:"#111",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.displayName||"User"}</div>
            <div style={{fontSize:14,color:"#666",marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
            <div style={{marginTop:6,display:"flex",gap:8,flexWrap:"wrap"}}>
              {isPaid
                ? <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,background:G,color:"#fff"}}>★ Pro Member</span>
                : <span style={{fontSize:12,fontWeight:600,padding:"3px 10px",borderRadius:20,background:"#f5f5f7",color:"#666",border:"1px solid #e2e2e8"}}>Free Plan</span>
              }
              <span style={{fontSize:12,padding:"3px 10px",borderRadius:20,background:user?.providerData?.[0]?.providerId==="google.com"?"#e8f0fe":"#e7f3ff",color:user?.providerData?.[0]?.providerId==="google.com"?"#1a73e8":"#1877F2",fontWeight:600}}>
                {user?.providerData?.[0]?.providerId==="google.com"?"G Google":"f Facebook"}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onShowHistory} style={{width:"100%",padding:"14px 16px",borderRadius:12,border:"1px solid "+( isPaid?"#7c3aed":"#e2e2e8"),background:isPaid?"#f0edff":"#f5f5f7",color:isPaid?"#6d28d9":"#888",cursor:"pointer",fontSize:15,fontWeight:600,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",boxSizing:"border-box"}}>
          <span>📊 My Usage History</span>
          <span style={{fontSize:13}}>{isPaid?"View →":"Pro only"}</span>
        </button>
        <button style={{width:"100%",padding:15,borderRadius:12,border:"1px solid #fecaca",cursor:"pointer",fontSize:16,color:"#dc2626",background:"transparent",fontWeight:600,boxSizing:"border-box"}} onClick={onLogout}>Log Out</button>
      </div>
    </div>
  );
}

// ── HISTORY MODAL ─────────────────────────────────────────
function HistoryModal({history, onClose}) {
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:400}}>
      <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",display:"flex",flexDirection:"column",maxHeight:"80vh"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 20px 16px",borderBottom:"1px solid #e2e2e8",flexShrink:0}}>
          <div style={{fontWeight:800,fontSize:20}}>Usage History</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:36,height:36,borderRadius:10,fontSize:18}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:"16px 20px 32px",flex:1}}>
          {history.length===0
            ? <div style={{textAlign:"center",padding:"32px 0",color:"#888"}}>No history yet</div>
            : history.map((h,i)=>(
              <div key={h.id||i} style={{display:"flex",gap:14,alignItems:"center",padding:"12px 0",borderBottom:"1px solid #f5f5f7"}}>
                <div style={{width:40,height:40,borderRadius:12,background:h.type==="video"?"#f0edff":h.type==="image"?"#fff4ed":"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>
                  {h.type==="video"?"🎥":h.type==="image"?"🖼️":"🔍"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:15,color:"#111",textTransform:"capitalize"}}>
                    {h.type} — {h.action||h.topic||"processed"}
                  </div>
                  <div style={{fontSize:13,color:"#888",marginTop:2}}>
                    {h.createdAt?.seconds ? new Date(h.createdAt.seconds*1000).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Recent"}
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

function LegalModal({title,onClose,children}) {
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:400}}>
      <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",display:"flex",flexDirection:"column",maxHeight:"88vh"}}>
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

function PrivacyContent(){return(<>
  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:16,marginBottom:18}}>
    <div style={{fontWeight:800,fontSize:15,color:"#dc2626",marginBottom:8}}>⚠️ DISCLAIMER</div>
    <p style={{fontSize:14,lineHeight:1.8,color:"#7f1d1d",margin:0}}>ReelKit accepts ZERO liability. <strong>Use only content you own.</strong></p>
  </div>
  {[
    {t:"1. Who We Are",b:"ReelKit (reelkit.in) is a free online tool for Indian content creators."},
    {t:"2. Data We Collect",b:"We use Google/Facebook OAuth for login. Your name and email are stored securely in Firebase. Videos and images are processed in your browser and NEVER stored on our servers."},
    {t:"3. Legal Responsibility",b:"You are SOLELY responsible for having full rights to content you upload. ReelKit accepts ZERO liability."},
    {t:"4. Payments",b:"Pro payments via Razorpay. We never store card details. Cancel anytime."},
    {t:"5. Contact",b:"privacy@reelkit.in | ReelKit.in, Mumbai, India"},
  ].map(x=>(<div key={x.t} style={{marginBottom:16}}><div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{x.t}</div><p style={{color:"#444",fontSize:14,lineHeight:1.9,margin:0}}>{x.b}</p></div>))}
</>);}

function TermsContent(){return(<>
  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:16,marginBottom:18}}>
    <div style={{fontWeight:800,fontSize:15,color:"#dc2626",marginBottom:8}}>⚠️ LEGAL NOTICE</div>
    <p style={{fontSize:14,lineHeight:1.8,color:"#7f1d1d",margin:0}}>ReelKit accepts ZERO liability for any issues caused by user actions.</p>
  </div>
  {[
    {t:"1. Acceptance",b:"By using ReelKit, you agree to these Terms."},
    {t:"2. Your Responsibility",b:"YOU are solely responsible for all content you process. You must own it."},
    {t:"3. Prohibited Uses",b:"Do NOT use ReelKit on content you don't own."},
    {t:"4. Disclaimer",b:"ReelKit is 'AS IS'. No warranty on watermark removal quality."},
    {t:"5. Pro Plans",b:"₹50/month or ₹399/year. Cancel anytime."},
    {t:"6. Contact",b:"legal@reelkit.in | ReelKit.in, Mumbai, India"},
  ].map(x=>(<div key={x.t} style={{marginBottom:16}}><div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{x.t}</div><p style={{color:"#444",fontSize:14,lineHeight:1.9,margin:0}}>{x.b}</p></div>))}
</>);}