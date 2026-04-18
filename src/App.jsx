// src/App.jsx — ReelKit v4 — Light mode, Frame capture fix, Mobile
import { useState, useRef, useEffect, useCallback } from "react";
import { auth, db, saveUser, addHistory, signInGoogle, signInFacebook, logOut } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

const G    = "linear-gradient(135deg,#7c3aed,#db2777)";
const YEAR = new Date().getFullYear();

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
  const [user,          setUser]         = useState(null);
  const [userHistory,   setUserHistory]  = useState([]);

  const [videoFile,     setVideoFile]    = useState(null);
  const [videoUrl,      setVideoUrl]     = useState(null);
  const [legalOk,       setLegalOk]      = useState(false);
  const [capturedFrame, setCapturedFrame]= useState(null); // static JPEG from video
  const [wBox,          setWBox]         = useState(null);
  const [drawing,       setDrawing]      = useState(false);
  const [startPos,      setStartPos]     = useState(null);
  const [progress,      setProgress]     = useState(0);
  const [showAd,        setShowAd]       = useState(false);
  const [adTimer,       setAdTimer]      = useState(60);
  const [pendingAction, setPendingAction]= useState(null);
  const [processedUrl,  setProcessedUrl] = useState(null);

  const [imgUrl,        setImgUrl]       = useState(null);
  const [imgOriginal,   setImgOriginal]  = useState(null);
  const [imgBox,        setImgBox]       = useState(null);
  const [imgDrawing,    setImgDrawing]   = useState(false);
  const [imgStart,      setImgStart]     = useState(null);
  const [imgProcessed,  setImgProcessed] = useState(null);

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
  const videoRef  = useRef();   // only on upload screen
  const canvasRef = useRef();   // on select screen
  const imgCvRef  = useRef();

  // ── Auth ──────────────────────────────────────────────────
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async (fu)=>{
      if(fu){
        setUser(fu);
        try {
          const { getDoc, doc } = await import("firebase/firestore");
          const snap = await getDoc(doc(db,"users",fu.uid));
          if(snap.exists() && snap.data().plan==="pro") setIsPaid(true);
        } catch(e){}
      } else { setUser(null); setIsPaid(false); }
    });
    return unsub;
  },[]);

  useEffect(()=>{
    if(showAd && adTimer>0){ const t=setTimeout(()=>setAdTimer(a=>a-1),1000); return()=>clearTimeout(t); }
  },[showAd,adTimer]);
  useEffect(()=>{
    if(showSeoAd && seoAdTimer>0){ const t=setTimeout(()=>setSeoAdTimer(a=>a-1),1000); return()=>clearTimeout(t); }
  },[showSeoAd,seoAdTimer]);

  // ── Draw captured frame on canvas when entering select ────
  useEffect(()=>{
    if(screen!=="select" || !capturedFrame) return;
    const cv = canvasRef.current;
    if(!cv) return;
    const img = new Image();
    img.onload = ()=>{
      cv.width  = img.naturalWidth;
      cv.height = img.naturalHeight;
      cv.getContext("2d").drawImage(img, 0, 0);
    };
    img.src = capturedFrame;
  },[screen, capturedFrame]);

  // ── Image canvas ──────────────────────────────────────────
  useEffect(()=>{
    if(screen!=="imgselect"||!imgUrl) return;
    const cv = imgCvRef.current; if(!cv) return;
    const img = new Image();
    img.onload=()=>{
      const maxW=Math.min(img.naturalWidth,1200), scale=maxW/img.naturalWidth;
      cv.width=img.naturalWidth*scale; cv.height=img.naturalHeight*scale;
      cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
    };
    img.src=imgUrl;
  },[screen,imgUrl]);

  // ── Canvas helpers ────────────────────────────────────────
  const getPos=(e,cv)=>{
    const r=cv.getBoundingClientRect();
    const sx=cv.width/r.width, sy=cv.height/r.height;
    const src=e.touches?e.touches[0]:e;
    return{x:(src.clientX-r.left)*sx, y:(src.clientY-r.top)*sy};
  };

  // Redraw captured frame + selection box
  const redrawCanvas = useCallback((box)=>{
    const cv = canvasRef.current;
    if(!cv || !capturedFrame) return;
    const img = new Image();
    img.onload=()=>{
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      if(!box) return;
      ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(0,0,cv.width,cv.height);
      ctx.clearRect(box.x,box.y,box.w,box.h);
      ctx.drawImage(img,box.x,box.y,box.w,box.h,box.x,box.y,box.w,box.h);
      ctx.strokeStyle="#7c3aed"; ctx.lineWidth=3; ctx.setLineDash([8,5]);
      ctx.strokeRect(box.x,box.y,box.w,box.h); ctx.setLineDash([]);
      ctx.fillStyle="#7c3aed";
      [[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]]
        .forEach(([a,b])=>{ctx.beginPath();ctx.arc(a,b,7,0,Math.PI*2);ctx.fill();});
    };
    img.src = capturedFrame;
  },[capturedFrame]);

  const drawImgBox = useCallback((box)=>{
    const cv=imgCvRef.current; if(!cv) return;
    const img=new Image();
    img.onload=()=>{
      const ctx=cv.getContext("2d");
      ctx.drawImage(img,0,0,cv.width,cv.height);
      if(!box) return;
      ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(0,0,cv.width,cv.height);
      ctx.clearRect(box.x,box.y,box.w,box.h);
      ctx.drawImage(img,box.x/cv.width*img.naturalWidth,box.y/cv.height*img.naturalHeight,
        box.w/cv.width*img.naturalWidth,box.h/cv.height*img.naturalHeight,box.x,box.y,box.w,box.h);
      ctx.strokeStyle="#f97316"; ctx.lineWidth=3; ctx.setLineDash([8,5]);
      ctx.strokeRect(box.x,box.y,box.w,box.h); ctx.setLineDash([]);
      ctx.fillStyle="#f97316";
      [[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]]
        .forEach(([a,b])=>{ctx.beginPath();ctx.arc(a,b,7,0,Math.PI*2);ctx.fill();});
    };
    img.src=imgUrl;
  },[imgUrl]);

  const vDown=e=>{ const p=getPos(e,canvasRef.current); setDrawing(true); setStartPos(p); setWBox(null); redrawCanvas(null); };
  const vMove=e=>{
    if(!drawing||!startPos) return;
    const p=getPos(e,canvasRef.current);
    const b={x:Math.min(startPos.x,p.x),y:Math.min(startPos.y,p.y),w:Math.abs(p.x-startPos.x),h:Math.abs(p.y-startPos.y)};
    setWBox(b); redrawCanvas(b);
  };
  const vUp=()=>setDrawing(false);

  const iDown=e=>{ const p=getPos(e,imgCvRef.current); setImgDrawing(true); setImgStart(p); setImgBox(null); drawImgBox(null); };
  const iMove=e=>{
    if(!imgDrawing||!imgStart) return;
    const p=getPos(e,imgCvRef.current);
    const b={x:Math.min(imgStart.x,p.x),y:Math.min(imgStart.y,p.y),w:Math.abs(p.x-imgStart.x),h:Math.abs(p.y-imgStart.y)};
    setImgBox(b); drawImgBox(b);
  };
  const iUp=()=>setImgDrawing(false);

  // ── Blur ──────────────────────────────────────────────────
  const applyBlur=(ctx,canvas,box)=>{
    if(!box||box.w<4||box.h<4) return;
    const{x,y,w,h}=box;
    const blurAmt=Math.max(16,Math.min(w,h)*0.4);
    const pad=24;
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

  // ── KEY FIX: Capture frame from upload screen video ───────
  // Called when user clicks "Select Watermark Area"
  // Video is VISIBLE on upload screen so readyState is reliable
  const handleSelectArea = () => {
    const v = videoRef.current;
    if(!v) return;

    const snap = document.createElement("canvas");
    snap.width  = v.videoWidth  || 640;
    snap.height = v.videoHeight || 360;
    const ctx   = snap.getContext("2d");

    if(v.readyState >= 2 && v.videoWidth > 0){
      ctx.drawImage(v, 0, 0, snap.width, snap.height);
    } else {
      // Fallback: gray with instruction text
      ctx.fillStyle = "#1a1a2a";
      ctx.fillRect(0, 0, snap.width, snap.height);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font      = "22px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Seek the video to the watermark frame first", snap.width/2, snap.height/2 - 15);
      ctx.font      = "16px sans-serif";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("Then go back and try again", snap.width/2, snap.height/2 + 20);
    }

    setCapturedFrame(snap.toDataURL("image/jpeg", 0.95));
    setWBox(null);
    setScreen("select");
  };

  // ── Process video ─────────────────────────────────────────
  const doProcess=()=>{
    if(!wBox||!capturedFrame) return;
    if(!isPaid){ setPendingAction("processVideo"); setAdTimer(60); setShowAd(true); return; }
    _processVideo();
  };

  const _processVideo=()=>{
    setScreen("processing"); setProgress(0);
    const img=new Image();
    img.onload=()=>{
      const out=document.createElement("canvas");
      out.width=img.naturalWidth; out.height=img.naturalHeight;
      const ctx=out.getContext("2d");
      ctx.drawImage(img,0,0);
      applyBlur(ctx,out,wBox);
      setProcessedUrl(out.toDataURL("image/jpeg", isPaid?0.95:0.65));
      if(user) addHistory(user.uid,{type:"video",action:"watermark_removed"});
      let p=0;
      const iv=setInterval(()=>{
        p+=Math.random()*20+8;
        if(p>=100){ clearInterval(iv); setProgress(100); setTimeout(()=>setScreen("export"),400); return; }
        setProgress(Math.min(p,100));
      },120);
    };
    img.src=capturedFrame;
  };

  // ── Process image ─────────────────────────────────────────
  const doImgProcess=()=>{
    if(!isPaid){ setPendingAction("processImage"); setAdTimer(60); setShowAd(true); return; }
    _processImage();
  };
  const _processImage=()=>{
    const cv=imgCvRef.current; if(!cv||!imgBox) return;
    const out=document.createElement("canvas"); out.width=cv.width; out.height=cv.height;
    const ctx=out.getContext("2d");
    const img=new Image();
    img.onload=()=>{
      ctx.drawImage(img,0,0,cv.width,cv.height);
      applyBlur(ctx,out,imgBox);
      setImgProcessed(out.toDataURL("image/png", isPaid?1.0:0.65));
      if(user) addHistory(user.uid,{type:"image",action:"watermark_removed"});
      setScreen("imgexport");
    };
    img.src=imgUrl;
  };

  const adDone=()=>{
    setShowAd(false);
    if(pendingAction==="processVideo"){ setPendingAction(null); _processVideo(); }
    else if(pendingAction==="processImage"){ setPendingAction(null); _processImage(); }
    else if(pendingAction==="download"){ setPendingAction(null); _dl(); }
  };

  const doDownload=()=>{
    if(!isPaid){ setPendingAction("download"); setAdTimer(60); setShowAd(true); }
    else _dl();
  };
  const _dl=()=>{
    if(!processedUrl) return;
    const a=document.createElement("a"); a.href=processedUrl; a.download="reelkit_processed.jpg"; a.click();
  };

  const genSEO=async(topic)=>{
    if(!isPaid){ setPendingSeo(topic); setSeoAdTimer(60); setShowSeoAd(true); return; }
    _genSEO(topic);
  };
  const _genSEO=async(topic)=>{
    setSeoLoading(true); setSeoData(null);
    try {
      const r=await fetch("/api/seo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,platform})});
      setSeoData(await r.json());
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

  // ── Shared styles ─────────────────────────────────────────
  const s = {
    page:  { minHeight:"100vh", background:"#f8f8fb", fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif", color:"#111" },
    nav:   { background:"#1a1a2a", height:56, display:"flex", alignItems:"center", padding:"0 20px", position:"sticky", top:0, zIndex:100, boxSizing:"border-box" },
    wrap:  { maxWidth:760, margin:"0 auto", padding:"24px 16px 100px", boxSizing:"border-box" },
    card:  { background:"#fff", borderRadius:16, border:"1px solid #e2e2e8", padding:20, marginBottom:16 },
    btn:   { width:"100%", padding:16, borderRadius:12, border:"none", cursor:"pointer", fontSize:16, fontWeight:700, color:"#fff", background:G, boxSizing:"border-box" },
    btnO:  { width:"100%", padding:14, borderRadius:12, border:"1.5px solid #e2e2e8", cursor:"pointer", fontSize:15, fontWeight:500, color:"#555", background:"#fff", marginTop:10, boxSizing:"border-box" },
    tag:   { fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:20 },
    ok:    { background:"#f0fdf4", border:"1px solid #a7f3d0", borderRadius:12, padding:"13px 16px", fontSize:15, color:"#059669", fontWeight:600, display:"flex", alignItems:"center", gap:8 },
    warn:  { background:"#fffbeb", border:"1px solid #fde68a", borderRadius:12, padding:"13px 16px", fontSize:14, color:"#92400e" },
    info:  { background:"#f0f9ff", border:"1px solid #bae6fd", borderRadius:12, padding:"12px 16px", fontSize:14, color:"#0369a1" },
  };

  const Nav=()=>(
    <div style={s.nav}>
      <div onClick={()=>setScreen("home")} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
        <div style={{width:32,height:32,borderRadius:9,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:16}}>✦</div>
        <span style={{color:"#fff",fontWeight:800,fontSize:17}}>ReelKit</span>
      </div>
      <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
        {isPaid&&<span style={{...s.tag,background:G,color:"#fff"}}>★ Pro</span>}
        {user
          ?<button onClick={()=>setShowProfile(true)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",cursor:"pointer",padding:"5px 12px",borderRadius:9,fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
            {user.photoURL?<img src={user.photoURL} alt="" style={{width:26,height:26,borderRadius:50,objectFit:"cover"}}/>
              :<div style={{width:26,height:26,borderRadius:50,background:G,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>{(user.displayName||"U")[0]}</div>}
            <span style={{maxWidth:72,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.displayName?.split(" ")[0]||"Me"}</span>
          </button>
          :<button onClick={()=>setShowLogin(true)} style={{background:"rgba(255,255,255,0.12)",border:"none",color:"#fff",cursor:"pointer",padding:"7px 16px",borderRadius:9,fontSize:14,fontWeight:600}}>Log In</button>
        }
      </div>
    </div>
  );

  const Modals=()=>(<>
    {showSeoAd&&<SeoAdModal timer={seoAdTimer} onShow={()=>{setShowSeoAd(false);_genSEO(pendingSeo);setPendingSeo(null);}} onUpgrade={()=>{setShowSeoAd(false);setShowSub(true);}}/>}
    {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
    {showLogin&&<LoginModal onClose={()=>setShowLogin(false)}/>}
    {showProfile&&<ProfileModal user={user} isPaid={isPaid}
      onShowHistory={async()=>{if(user){try{const q=query(collection(db,"users",user.uid,"history"),orderBy("createdAt","desc"),limit(20));const snaps=await getDocs(q);setUserHistory(snaps.docs.map(d=>({id:d.id,...d.data()})));setShowHistory(true);}catch(e){}}}}
      onClose={()=>setShowProfile(false)}
      onLogout={async()=>{await logOut();setUser(null);setIsPaid(false);setShowProfile(false);}}/>}
    {showHistory&&<HistoryModal history={userHistory} onClose={()=>setShowHistory(false)}/>}
    {showPrivacy&&<LegalModal title="Privacy Policy" onClose={()=>setShowPrivacy(false)}><PrivacyContent/></LegalModal>}
    {showTerms&&<LegalModal title="Terms of Use" onClose={()=>setShowTerms(false)}><TermsContent/></LegalModal>}
  </>);

  // ═══════════════════════════════ HOME ═══════════════════════
  if(screen==="home") return(
    <div style={s.page}>
      <Nav/>
      {/* Hero */}
      <div style={{background:"linear-gradient(150deg,#1a1a2a,#2d1b69)",padding:"40px 16px 48px",boxSizing:"border-box"}}>
        <div style={{maxWidth:600,margin:"0 auto",textAlign:"center"}}>
          <h1 style={{fontSize:"clamp(26px,5vw,38px)",fontWeight:900,color:"#fff",margin:"0 0 10px",lineHeight:1.15}}>
            Free Watermark Remover<br/>
            <span style={{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>for Indian Creators</span>
          </h1>
          <p style={{color:"rgba(255,255,255,0.6)",fontSize:15,margin:"0 0 28px"}}>Remove watermarks from videos & images. Generate AI SEO. 100% free.</p>

          {/* Tabs */}
          <div style={{display:"flex",background:"rgba(255,255,255,0.08)",borderRadius:14,padding:4,gap:3,marginBottom:28,maxWidth:400,margin:"0 auto 28px"}}>
            {[{id:"video",label:"🎬 Video"},{id:"image",label:"🖼️ Image"},{id:"seo",label:"🔍 AI SEO"}].map(t=>{
              const a=tab===t.id;
              return <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 6px",borderRadius:10,border:"none",cursor:"pointer",fontSize:13,fontWeight:a?700:500,background:a?"#fff":"transparent",color:a?"#111":"rgba(255,255,255,0.6)",transition:"all .15s"}}>{t.label}</button>;
            })}
          </div>

          {/* Upload card */}
          <div style={{background:"#fff",borderRadius:20,padding:"28px 20px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",maxWidth:480,margin:"0 auto",boxSizing:"border-box"}}>
            {tab==="video"&&(
              <div onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("video/")){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));setScreen("upload");}}}
                style={{cursor:"pointer",textAlign:"center"}}>
                <div style={{width:72,height:72,borderRadius:20,background:"#f0edff",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",fontSize:34}}>🎬</div>
                <button style={{padding:"14px 36px",borderRadius:12,border:"none",cursor:"pointer",fontSize:16,fontWeight:800,color:"#fff",background:G,marginBottom:12}}>Choose Video File</button>
                <p style={{color:"#888",fontSize:14,margin:"0 0 4px"}}>or drag & drop here</p>
                <p style={{color:"#bbb",fontSize:13,margin:0}}>MP4 · MOV · AVI · MKV</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));setScreen("upload");}e.target.value="";}}/>

            {tab==="image"&&(
              <div onClick={()=>imgRef.current?.click()} onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("image/")){const url=URL.createObjectURL(f);setImgUrl(url);setImgOriginal(url);setImgBox(null);setImgProcessed(null);setScreen("imgselect");}}}
                style={{cursor:"pointer",textAlign:"center"}}>
                <div style={{width:72,height:72,borderRadius:20,background:"#fff4ed",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px",fontSize:34}}>🖼️</div>
                <button style={{padding:"14px 36px",borderRadius:12,border:"none",cursor:"pointer",fontSize:16,fontWeight:800,color:"#fff",background:"linear-gradient(135deg,#f97316,#ec4899)",marginBottom:12}}>Choose Image File</button>
                <p style={{color:"#888",fontSize:14,margin:"0 0 10px"}}>or drag & drop here</p>
                <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
                  {["PNG","JPG","WebP","AVIF"].map(f=><span key={f} style={{fontSize:12,padding:"3px 10px",borderRadius:6,background:"#f5f5f7",color:"#888",border:"1px solid #e2e2e8",fontWeight:600}}>{f}</span>)}
                </div>
              </div>
            )}
            <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){const url=URL.createObjectURL(f);setImgUrl(url);setImgOriginal(url);setImgBox(null);setImgProcessed(null);setScreen("imgselect");}e.target.value="";}}/>

            {tab==="seo"&&(
              <div>
                <div style={{display:"flex",gap:8,marginBottom:12}}>
                  {["youtube","instagram"].map(p=>(
                    <button key={p} onClick={()=>{setPlatform(p);setSeoData(null);}} style={{flex:1,padding:"10px 6px",borderRadius:10,border:platform===p?"2px solid #7c3aed":"1px solid #e2e2e8",background:platform===p?"#f0edff":"#fafafa",color:platform===p?"#6d28d9":"#555",cursor:"pointer",fontWeight:platform===p?700:500,fontSize:14}}>
                      {p==="youtube"?"▶ YouTube":"◉ Instagram"}
                    </button>
                  ))}
                </div>
                <div style={{position:"relative"}}>
                  <textarea value={seoInput} onChange={e=>setSeoInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&seoInput.trim()){e.preventDefault();genSEO(seoInput.trim());}}}
                    placeholder='e.g. "Morning skincare routine"'
                    style={{width:"100%",minHeight:88,padding:"14px 14px 50px",borderRadius:12,border:"1.5px solid #e2e2e8",background:"#fafafa",color:"#111",fontSize:15,resize:"none",outline:"none",lineHeight:1.7,boxSizing:"border-box",fontFamily:"inherit"}}/>
                  <button onClick={()=>{if(seoInput.trim())genSEO(seoInput.trim());}} disabled={!seoInput.trim()||seoLoading}
                    style={{position:"absolute",bottom:10,right:10,padding:"8px 18px",borderRadius:9,border:"none",cursor:"pointer",fontSize:14,fontWeight:700,color:"#fff",background:seoInput.trim()?G:"#ccc"}}>
                    {seoLoading?"...":"Generate →"}
                  </button>
                </div>
                <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
                  {["Skincare","Travel vlog","Food recipe","Tech review"].map(eg=>(
                    <span key={eg} onClick={()=>{setSeoInput(eg);genSEO(eg);}} style={{fontSize:13,color:"#6d28d9",cursor:"pointer",padding:"4px 10px",borderRadius:8,background:"#f0edff",fontWeight:600}}>{eg}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Below hero */}
      <div style={{maxWidth:600,margin:"0 auto",padding:"24px 16px 80px",boxSizing:"border-box"}}>
        {/* SEO results */}
        {tab==="seo"&&seoData&&!seoLoading&&(
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
              <span style={{fontSize:14,color:"#888"}}>Results for:</span>
              <span style={{fontSize:14,fontWeight:700,padding:"3px 12px",borderRadius:20,background:"#f0edff",color:"#6d28d9"}}>"{seoInput}"</span>
              <button onClick={()=>setSeoData(null)} style={{fontSize:13,color:"#888",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Change</button>
            </div>
            {[
              {title:"📝 Titles",content:seoData.titles?.map((t,i)=>(
                <div key={i} style={{background:"#fafafa",padding:12,borderRadius:10,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,border:"1px solid #e2e2e8"}}>
                  <span style={{fontSize:14,flex:1,lineHeight:1.6,color:"#111",minWidth:0}}>{t}</span>
                  <button onClick={()=>cp(t,"t"+i)} style={{background:"#f0edff",border:"none",color:copied==="t"+i?"#059669":"#6d28d9",cursor:"pointer",padding:"6px 12px",borderRadius:7,fontSize:12,fontWeight:700,flexShrink:0}}>{copied==="t"+i?"✓":"Copy"}</button>
                </div>
              ))},
              {title:"🏷️ Tags",content:<>
                <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{seoData.tags?.map((t,i)=><span key={i} onClick={()=>cp(t,"tg"+i)} style={{background:"#f0edff",border:"1px solid #c4b5fd",padding:"5px 12px",borderRadius:40,fontSize:13,cursor:"pointer",color:copied==="tg"+i?"#059669":"#6d28d9"}}>{t}</span>)}</div>
                <button onClick={()=>cp(seoData.tags?.join(" "),"all")} style={{...s.btnO,marginTop:10}}>{copied==="all"?"✓ Copied All":"Copy All Tags"}</button>
              </>},
              {title:"📄 Description",content:<>
                <div style={{background:"#fafafa",padding:14,borderRadius:10,fontSize:14,lineHeight:1.9,color:"#555",border:"1px solid #e2e2e8"}}>{seoData.description}</div>
                <button onClick={()=>cp(seoData.description,"desc")} style={{...s.btnO}}>{copied==="desc"?"✓ Copied":"Copy Description"}</button>
              </>},
            ].map(sec=>(
              <div key={sec.title} style={{...s.card,marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:12,color:"#111"}}>{sec.title}</div>
                {sec.content}
              </div>
            ))}
            <button style={s.btn} onClick={()=>{setSeoData(null);genSEO(seoInput);}}>↺ Regenerate</button>
          </div>
        )}

        {/* Ad placeholder */}
        {!isPaid&&(
          <div style={{background:"#fff",border:"1.5px dashed #d1d5db",borderRadius:14,padding:18,textAlign:"center",marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#aaa",marginBottom:4}}>Advertisement</div>
            <div style={{fontSize:14,color:"#888"}}>Google Ad — Live after AdSense approval</div>
          </div>
        )}

        {/* How it works */}
        <div style={{marginTop:24,marginBottom:24}}>
          <p style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#aaa",textAlign:"center",marginBottom:16}}>How it works</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[{icon:"📁",t:"Upload",d:"Select file"},{icon:"✍️",t:"Select",d:"Draw on watermark"},{icon:"⬇️",t:"Download",d:"Get clean file"}].map(step=>(
              <div key={step.t} style={{...s.card,textAlign:"center",padding:"16px 10px",marginBottom:0}}>
                <div style={{fontSize:26,marginBottom:8}}>{step.icon}</div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{step.t}</div>
                <div style={{fontSize:12,color:"#888"}}>{step.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{paddingTop:20,borderTop:"1px solid #e2e2e8"}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:10}}>
            <span style={{fontSize:13,color:"#aaa"}}>© {YEAR} ReelKit.in · Made for Indian Creators</span>
            <div style={{display:"flex",gap:16}}>
              <span onClick={()=>setShowPrivacy(true)} style={{fontSize:13,color:"#888",cursor:"pointer"}}>Privacy</span>
              <span onClick={()=>setShowTerms(true)} style={{fontSize:13,color:"#888",cursor:"pointer"}}>Terms</span>
            </div>
          </div>
          {!isPaid&&(
            <div onClick={()=>setShowSub(true)} style={{background:"#f5f0ff",border:"1px solid #c4b5fd",borderRadius:14,padding:"16px 18px",cursor:"pointer",display:"flex",gap:14,alignItems:"center"}}>
              <div style={{width:40,height:40,borderRadius:12,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:18,flexShrink:0}}>★</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:800,fontSize:15,color:"#3b0764",marginBottom:3}}>Remove ads forever — ₹50/month</div>
                <div style={{fontSize:13,color:"#6d28d9"}}>HD quality · No ads · AI SEO · All sizes</div>
              </div>
              <div style={{color:"#7c3aed",fontSize:20,flexShrink:0}}>→</div>
            </div>
          )}
        </div>
      </div>
      <Modals/>
    </div>
  );

  // ═══════════════════════════════ UPLOAD ═════════════════════
  if(screen==="upload") return(
    <div style={s.page}><Nav/>
      <div style={s.wrap}>
        <div onClick={()=>setScreen("home")} style={{fontSize:15,color:"#888",cursor:"pointer",marginBottom:18,display:"inline-flex",alignItems:"center",gap:4}}>← Back</div>

        {/* 💡 TIP — shown ABOVE video */}
        <div style={{...s.info,marginBottom:12}}>
          💡 <strong>Tip:</strong> Seek the video to the exact frame where watermark is visible, then click the button below.
        </div>

        {/* Full width video — VISIBLE so readyState works */}
        <div style={{borderRadius:16,overflow:"hidden",background:"#000",marginBottom:12}}>
          <video ref={videoRef} src={videoUrl}
            style={{width:"100%",display:"block",maxHeight:"60vh",objectFit:"contain"}}
            controls playsInline/>
        </div>

        <div style={{...s.card,display:"flex",gap:12,alignItems:"center",marginBottom:12}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:14,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{videoFile?.name}</div>
            <div style={{color:"#888",fontSize:13,marginTop:2}}>{videoFile?(videoFile.size/1024/1024).toFixed(1)+" MB":""}</div>
          </div>
          <button onClick={()=>fileRef.current?.click()} style={{padding:"8px 14px",borderRadius:9,border:"1px solid #e2e2e8",background:"#fff",color:"#555",cursor:"pointer",fontSize:13,flexShrink:0}}>Change</button>
          <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));}e.target.value="";}}/>
        </div>

        <div style={{...s.warn,marginBottom:12}}>
          <div style={{fontWeight:700,marginBottom:8}}>⚠️ Legal Notice</div>
          <p style={{margin:"0 0 10px",lineHeight:1.7}}>ReelKit is only for videos <b>you own or have rights to.</b></p>
          <label style={{display:"flex",gap:10,alignItems:"center",cursor:"pointer"}}>
            <input type="checkbox" checked={legalOk} onChange={e=>setLegalOk(e.target.checked)} style={{accentColor:"#7c3aed",width:18,height:18,flexShrink:0}}/>
            <span style={{fontSize:14}}>I own this video and accept full legal responsibility.</span>
          </label>
        </div>

        <button onClick={handleSelectArea} disabled={!legalOk}
          style={{...s.btn,opacity:legalOk?1:0.35,cursor:legalOk?"pointer":"not-allowed"}}>
          Select Watermark Area →
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════ SELECT ═════════════════════
  if(screen==="select") return(
    <div style={s.page}><Nav/>
      <div style={s.wrap}>
        <div onClick={()=>setScreen("upload")} style={{fontSize:15,color:"#888",cursor:"pointer",marginBottom:16}}>← Back</div>
        <h2 style={{fontSize:22,fontWeight:800,marginBottom:4}}>Select Watermark</h2>
        <p style={{color:"#888",marginBottom:14,fontSize:14,marginTop:0}}>✍️ Draw a box over the watermark area to blur it</p>

        {/* Canvas — shows captured frame, NOT live video */}
        <div style={{position:"relative",borderRadius:14,overflow:"hidden",background:"#111",border:"2px solid #e2e2e8",touchAction:"none",cursor:"crosshair",marginBottom:12}}>
          <canvas ref={canvasRef} style={{width:"100%",display:"block",touchAction:"none"}}
            onMouseDown={vDown} onMouseMove={vMove} onMouseUp={vUp} onMouseLeave={vUp}
            onTouchStart={e=>{e.preventDefault();vDown(e);}}
            onTouchMove={e=>{e.preventDefault();vMove(e);}}
            onTouchEnd={e=>{e.preventDefault();vUp();}}/>
          {!wBox&&(
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none",textAlign:"center"}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",background:"rgba(0,0,0,0.6)",padding:"8px 16px",borderRadius:20,whiteSpace:"nowrap"}}>✍️ Click & drag to select watermark</div>
            </div>
          )}
        </div>

        {wBox&&<div style={{...s.ok,marginBottom:12}}>✓ Area selected — ready to blur!</div>}

        <button onClick={doProcess} disabled={!wBox}
          style={{...s.btn,opacity:wBox?1:0.35,cursor:wBox?"pointer":"not-allowed"}}>
          {isPaid?"Remove Watermark →":"Remove Watermark (1 min ad) →"}
        </button>
        <button onClick={()=>{setWBox(null);redrawCanvas(null);}}
          style={s.btnO}>Clear Selection</button>

        {!isPaid&&(
          <div style={{textAlign:"center",fontSize:13,color:"#888",marginTop:10}}>
            Free users watch 1 min ad · <span onClick={()=>setShowSub(true)} style={{color:"#6d28d9",cursor:"pointer",fontWeight:600}}>Upgrade to skip →</span>
          </div>
        )}
        {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
      </div>
    </div>
  );

  // ═══════════════════════════════ PROCESSING ═════════════════
  if(screen==="processing") return(
    <div style={{...s.page,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",padding:"40px 24px",maxWidth:360,width:"100%",boxSizing:"border-box"}}>
        <div style={{width:72,height:72,borderRadius:20,background:"#f0edff",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px",fontSize:34}}>✦</div>
        <div style={{fontSize:22,fontWeight:800,marginBottom:8}}>Applying Blur…</div>
        <p style={{color:"#888",fontSize:15,marginBottom:24}}>Removing watermark from your video</p>
        <div style={{background:"#e2e2e8",borderRadius:100,height:8,overflow:"hidden",marginBottom:10}}>
          <div style={{height:"100%",background:G,width:progress+"%",transition:"width .12s",borderRadius:100}}/>
        </div>
        <div style={{fontWeight:900,fontSize:36,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{Math.round(progress)}%</div>
      </div>
    </div>
  );

  // ═══════════════════════════════ EXPORT ═════════════════════
  if(screen==="export") return(
    <div style={s.page}><Nav/>
      <div style={s.wrap}>
        <div onClick={()=>setScreen("home")} style={{fontSize:15,color:"#888",cursor:"pointer",marginBottom:16}}>← Home</div>
        <div style={{...s.ok,marginBottom:20}}>✓ Watermark removed successfully!</div>

        {/* Before / After */}
        <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"#aaa",marginBottom:10}}>Before / After</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div style={{...s.card,padding:10,marginBottom:0}}>
            <div style={{fontSize:11,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Before</div>
            {capturedFrame&&<img src={capturedFrame} style={{width:"100%",borderRadius:8,display:"block"}} alt="before"/>}
          </div>
          <div style={{...s.card,border:"1px solid #a7f3d0",padding:10,marginBottom:0}}>
            <div style={{fontSize:11,color:"#059669",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>After ✓</div>
            {processedUrl&&<img src={processedUrl} style={{width:"100%",borderRadius:8,display:"block"}} alt="after"/>}
          </div>
        </div>

        {!isPaid&&<div style={{...s.warn,marginBottom:14}}>⚠️ Free: Compressed quality. <span onClick={()=>setShowSub(true)} style={{fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Upgrade for Full HD →</span></div>}

        <button style={s.btn} onClick={doDownload}>{isPaid?"↓ Download Full HD":"↓ Download (1 min ad)"}</button>
        <button style={s.btnO} onClick={()=>{setTab("seo");setScreen("home");}}>Generate AI SEO Tags →</button>
        <button style={s.btnO} onClick={()=>setShowSub(true)}>★ Upgrade ₹50/month — HD + No Ads</button>
        <button style={{...s.btnO,color:"#aaa"}} onClick={()=>{setWBox(null);setProcessedUrl(null);setCapturedFrame(null);setScreen("home");}}>← Process Another Video</button>

        {showAd&&<AdModal timer={adTimer} onDone={adDone} onUpgrade={()=>{setShowAd(false);setShowSub(true);}}/>}
        {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
      </div>
    </div>
  );

  // ═══════════════════════════════ IMG SELECT ═════════════════
  if(screen==="imgselect") return(
    <div style={s.page}><Nav/>
      <div style={s.wrap}>
        <div onClick={()=>setScreen("home")} style={{fontSize:15,color:"#888",cursor:"pointer",marginBottom:16}}>← Back</div>
        <h2 style={{fontSize:22,fontWeight:800,marginBottom:4}}>Select Watermark</h2>
        <p style={{color:"#888",marginBottom:14,fontSize:14,marginTop:0}}>✍️ Draw a box over the watermark to blur it</p>
        <div style={{position:"relative",borderRadius:14,overflow:"hidden",background:"#f5f5f7",border:"2px solid #e2e2e8",touchAction:"none",cursor:"crosshair",marginBottom:12}}>
          <canvas ref={imgCvRef} style={{width:"100%",display:"block",touchAction:"none"}}
            onMouseDown={iDown} onMouseMove={iMove} onMouseUp={iUp} onMouseLeave={iUp}
            onTouchStart={e=>{e.preventDefault();iDown(e);}}
            onTouchMove={e=>{e.preventDefault();iMove(e);}}
            onTouchEnd={e=>{e.preventDefault();iUp();}}/>
          {!imgBox&&(
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}>
              <div style={{fontSize:13,color:"rgba(0,0,0,0.5)",background:"rgba(255,255,255,0.9)",padding:"8px 16px",borderRadius:20,whiteSpace:"nowrap"}}>✍️ Click & drag to select</div>
            </div>
          )}
        </div>
        {imgBox&&<div style={{...s.ok,marginBottom:12}}>✓ Area selected!</div>}
        <button onClick={doImgProcess} disabled={!imgBox}
          style={{...s.btn,background:"linear-gradient(135deg,#f97316,#ec4899)",opacity:imgBox?1:0.35,cursor:imgBox?"pointer":"not-allowed"}}>
          {isPaid?"Remove Watermark →":"Remove Watermark (1 min ad) →"}
        </button>
        <button onClick={()=>{setImgBox(null);drawImgBox(null);}} style={s.btnO}>Clear Selection</button>
        {!isPaid&&<div style={{textAlign:"center",fontSize:13,color:"#888",marginTop:10}}>Free users watch 1 min ad · <span onClick={()=>setShowSub(true)} style={{color:"#6d28d9",cursor:"pointer",fontWeight:600}}>Upgrade →</span></div>}
        {showAd&&<AdModal timer={adTimer} onDone={adDone} onUpgrade={()=>{setShowAd(false);setShowSub(true);}}/>}
        {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
      </div>
    </div>
  );

  // ═══════════════════════════════ IMG EXPORT ═════════════════
  if(screen==="imgexport") return(
    <div style={s.page}><Nav/>
      <div style={s.wrap}>
        <div onClick={()=>setScreen("home")} style={{fontSize:15,color:"#888",cursor:"pointer",marginBottom:16}}>← Home</div>
        <div style={{...s.ok,marginBottom:18}}>✓ Watermark removed!</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div style={{...s.card,padding:10,marginBottom:0}}>
            <div style={{fontSize:11,color:"#888",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Before</div>
            <img src={imgOriginal||imgUrl} alt="before" style={{width:"100%",borderRadius:8,display:"block"}}/>
          </div>
          <div style={{...s.card,border:"1px solid #a7f3d0",padding:10,marginBottom:0}}>
            <div style={{fontSize:11,color:"#059669",fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>After ✓</div>
            {imgProcessed&&<img src={imgProcessed} alt="after" style={{width:"100%",borderRadius:8,display:"block"}}/>}
          </div>
        </div>
        {!isPaid&&<div style={{...s.warn,marginBottom:12}}>⚠️ Free: Compressed. <span onClick={()=>setShowSub(true)} style={{fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Upgrade →</span></div>}
        <button style={{...s.btn,background:"linear-gradient(135deg,#f97316,#ec4899)"}} onClick={()=>{const a=document.createElement("a");a.href=imgProcessed||imgUrl;a.download=isPaid?"reelkit.png":"reelkit_compressed.jpg";a.click();}}>
          {isPaid?"↓ Download PNG (Full Quality)":"↓ Download (Compressed)"}
        </button>
        <button style={s.btnO} onClick={()=>setShowSub(true)}>★ Upgrade ₹50/month — Full Quality</button>
        <button style={{...s.btnO,color:"#aaa"}} onClick={()=>{setImgBox(null);setImgProcessed(null);setImgUrl(null);setImgOriginal(null);setScreen("home");}}>← Process Another Image</button>
        {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
      </div>
    </div>
  );

  return null;
}

// ═══════════════════════════════════════════════════════════════
// MODALS
// ═══════════════════════════════════════════════════════════════

function AdModal({timer,onDone,onUpgrade}){
  const pct=Math.round(((60-timer)/60)*100);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:16}}>
      <div style={{background:"#fff",borderRadius:22,padding:26,width:"100%",maxWidth:380,textAlign:"center",boxSizing:"border-box"}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#aaa",marginBottom:12}}>Advertisement</div>
        <div style={{background:"#f5f5f7",borderRadius:12,padding:"44px 20px",marginBottom:16,border:"1px dashed #e2e2e8"}}>
          <div style={{fontWeight:600,fontSize:15,color:"#888"}}>Google Ad Space</div>
          <div style={{fontSize:13,color:"#bbb",marginTop:4}}>Live after AdSense approval</div>
        </div>
        <div style={{background:"#e2e2e8",borderRadius:100,height:6,marginBottom:8,overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(135deg,#7c3aed,#db2777)",width:pct+"%",transition:"width 1s linear",borderRadius:100}}/>
        </div>
        <div style={{fontSize:14,color:"#888",marginBottom:14}}>{timer>0?`Ad ends in ${timer}s…`:"Done!"}</div>
        <button style={{width:"100%",padding:14,borderRadius:11,border:"none",cursor:timer>0?"not-allowed":"pointer",fontSize:16,fontWeight:700,color:"#fff",background:timer>0?"#ccc":"linear-gradient(135deg,#7c3aed,#db2777)",boxSizing:"border-box"}} disabled={timer>0} onClick={onDone}>
          {timer>0?`Wait ${timer}s…`:"↓ Continue"}
        </button>
        <button style={{width:"100%",padding:"12px",borderRadius:11,border:"1.5px solid #7c3aed",cursor:"pointer",fontSize:14,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:10,boxSizing:"border-box"}} onClick={onUpgrade}>★ Go Pro — Skip All Ads</button>
      </div>
    </div>
  );
}

function SeoAdModal({timer,onShow,onUpgrade}){
  const pct=Math.round(((60-timer)/60)*100);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:16}}>
      <div style={{background:"#fff",borderRadius:22,padding:26,width:"100%",maxWidth:380,boxSizing:"border-box",textAlign:"center"}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#aaa",marginBottom:12}}>Advertisement</div>
        <div style={{background:"#f5f5f7",borderRadius:12,padding:"38px 20px",marginBottom:14,border:"1px dashed #e2e2e8"}}>
          <div style={{fontWeight:600,fontSize:14,color:"#888"}}>Google Ad Space</div>
        </div>
        <div style={{background:"#e2e2e8",borderRadius:100,height:6,marginBottom:8,overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(135deg,#7c3aed,#db2777)",width:pct+"%",transition:"width 1s linear",borderRadius:100}}/>
        </div>
        <div style={{fontSize:14,color:"#888",marginBottom:14}}>{timer>0?`Results in ${timer}s…`:"Ready!"}</div>
        <button style={{width:"100%",padding:14,borderRadius:11,border:"none",cursor:timer>0?"not-allowed":"pointer",fontSize:16,fontWeight:700,color:"#fff",background:timer>0?"#ccc":"linear-gradient(135deg,#7c3aed,#db2777)",boxSizing:"border-box"}} disabled={timer>0} onClick={onShow}>
          {timer>0?`Wait ${timer}s…`:"✓ Show SEO Results"}
        </button>
        <button style={{width:"100%",padding:"12px",borderRadius:11,border:"1.5px solid #7c3aed",cursor:"pointer",fontSize:14,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:10,boxSizing:"border-box"}} onClick={onUpgrade}>★ Skip — Upgrade to Pro</button>
      </div>
    </div>
  );
}

function SubModal({setIsPaid,user,onClose}){
  const G="linear-gradient(135deg,#6d28d9,#db2777)";
  const handleSub=async()=>{
    setIsPaid(true);
    if(user){try{const{doc,setDoc}=await import("firebase/firestore");const{db}=await import("./firebase");await setDoc(doc(db,"users",user.uid),{plan:"pro"},{merge:true});}catch(e){}}
    onClose();
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",zIndex:400}}>
      <div style={{width:"100%",maxWidth:600,margin:"0 auto",background:"#fff",borderRadius:"22px 22px 0 0",padding:"28px 20px 52px",boxSizing:"border-box"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:22}}>ReelKit Pro</div>
          <div style={{fontSize:36,fontWeight:900,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:4}}>₹50<span style={{fontSize:15,WebkitTextFillColor:"#666",fontWeight:400}}>/month</span></div>
          <div style={{fontSize:14,color:"#888",marginTop:3}}>or ₹399/year — save ₹201</div>
        </div>
        <div style={{background:"#f5f5f7",borderRadius:14,padding:14,marginBottom:18}}>
          {["Full HD exports — no compression","No ads — ever","All 7 trending sizes","AI SEO — unlimited","Order & usage history","PNG 4K image exports"].map(f=>(
            <div key={f} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #e2e2e8"}}>
              <span style={{color:"#7c3aed",fontWeight:700,fontSize:16}}>✓</span>
              <span style={{fontSize:15,fontWeight:500}}>{f}</span>
            </div>
          ))}
        </div>
        <button style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#fff",background:G,boxSizing:"border-box"}} onClick={handleSub}>Subscribe via Razorpay →</button>
        <button style={{width:"100%",padding:13,borderRadius:12,border:"1px solid #e2e2e8",cursor:"pointer",fontSize:15,color:"#666",background:"transparent",marginTop:10,boxSizing:"border-box"}} onClick={onClose}>Maybe Later</button>
      </div>
    </div>
  );
}

function LoginModal({onClose}){
  const[loading,setLoading]=useState(""); const[error,setError]=useState("");
  const handleGoogle=async()=>{
    setLoading("google");setError("");
    try{const fu=await signInGoogle();await saveUser(fu.uid,{name:fu.displayName,email:fu.email,photo:fu.photoURL,provider:"google",plan:"free",createdAt:new Date().toISOString()});onClose();}
    catch(e){setError("Google login failed. Please try again.");}
    setLoading("");
  };
  const handleFacebook=async()=>{
    setLoading("facebook");setError("");
    try{const fu=await signInFacebook();await saveUser(fu.uid,{name:fu.displayName,email:fu.email,photo:fu.photoURL,provider:"facebook",plan:"free",createdAt:new Date().toISOString()});onClose();}
    catch(e){setError("Facebook login failed.");}
    setLoading("");
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",zIndex:400}}>
      <div style={{width:"100%",maxWidth:600,margin:"0 auto",background:"#fff",borderRadius:"22px 22px 0 0",padding:"28px 20px 52px",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
          <div style={{fontWeight:800,fontSize:22,color:"#111"}}>Welcome to ReelKit</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:34,height:34,borderRadius:9,fontSize:17}}>✕</button>
        </div>
        <p style={{color:"#888",fontSize:15,marginBottom:22,marginTop:4}}>Sign in free — no password needed</p>
        {error&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"12px 14px",fontSize:14,color:"#dc2626",marginBottom:14,lineHeight:1.6}}>{error}</div>}
        <button onClick={handleGoogle} disabled={!!loading}
          style={{width:"100%",padding:"15px",borderRadius:13,border:"1.5px solid #e2e2e8",cursor:loading?"not-allowed":"pointer",fontSize:16,fontWeight:600,color:"#111",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:12,opacity:loading?0.7:1,boxSizing:"border-box"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" style={{flexShrink:0}}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading==="google"?"Connecting…":"Continue with Google"}
        </button>
        <button onClick={handleFacebook} disabled={!!loading}
          style={{width:"100%",padding:"15px",borderRadius:13,border:"none",cursor:loading?"not-allowed":"pointer",fontSize:16,fontWeight:600,color:"#fff",background:"#1877F2",display:"flex",alignItems:"center",justifyContent:"center",gap:12,opacity:loading?0.7:1,boxSizing:"border-box",marginBottom:18}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff" style={{flexShrink:0}}><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          {loading==="facebook"?"Connecting…":"Continue with Facebook"}
        </button>
        <p style={{textAlign:"center",fontSize:13,color:"#aaa",margin:0}}>By continuing you agree to our Terms & Privacy Policy</p>
      </div>
    </div>
  );
}

function ProfileModal({user,isPaid,onShowHistory,onClose,onLogout}){
  const G="linear-gradient(135deg,#7c3aed,#db2777)";
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",zIndex:400}}>
      <div style={{width:"100%",maxWidth:600,margin:"0 auto",background:"#fff",borderRadius:"22px 22px 0 0",padding:"28px 20px 52px",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:22}}>My Profile</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:34,height:34,borderRadius:9,fontSize:17}}>✕</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:22,padding:14,background:"#f5f5f7",borderRadius:14}}>
          {user?.photoURL?<img src={user.photoURL} alt="" style={{width:52,height:52,borderRadius:50,objectFit:"cover",flexShrink:0}}/>
            :<div style={{width:52,height:52,borderRadius:50,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:20,flexShrink:0}}>{(user?.displayName||"U")[0]}</div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:17,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.displayName||"User"}</div>
            <div style={{fontSize:13,color:"#666",marginTop:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
            <div style={{marginTop:6}}>
              {isPaid?<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:G,color:"#fff"}}>★ Pro</span>
                :<span style={{fontSize:11,fontWeight:600,padding:"3px 10px",borderRadius:20,background:"#f0f0f0",color:"#666",border:"1px solid #e2e2e8"}}>Free</span>}
            </div>
          </div>
        </div>
        <button onClick={onShowHistory} style={{width:"100%",padding:"12px 14px",borderRadius:11,border:"1px solid "+(isPaid?"#7c3aed":"#e2e2e8"),background:isPaid?"#f0edff":"#f5f5f7",color:isPaid?"#6d28d9":"#888",cursor:"pointer",fontSize:14,fontWeight:600,marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",boxSizing:"border-box"}}>
          <span>📊 Usage History</span><span style={{fontSize:12}}>{isPaid?"View →":"Pro only"}</span>
        </button>
        <button style={{width:"100%",padding:13,borderRadius:11,border:"1px solid #fecaca",cursor:"pointer",fontSize:15,color:"#dc2626",background:"transparent",fontWeight:600,boxSizing:"border-box"}} onClick={onLogout}>Log Out</button>
      </div>
    </div>
  );
}

function HistoryModal({history,onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",zIndex:500}}>
      <div style={{width:"100%",maxWidth:600,margin:"0 auto",background:"#fff",borderRadius:"22px 22px 0 0",display:"flex",flexDirection:"column",maxHeight:"75vh"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 20px 14px",borderBottom:"1px solid #e2e2e8",flexShrink:0}}>
          <div style={{fontWeight:800,fontSize:18}}>Usage History</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:32,height:32,borderRadius:8,fontSize:16}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:"12px 20px 32px",flex:1}}>
          {history.length===0?<div style={{textAlign:"center",padding:"28px 0",color:"#888"}}>No history yet</div>
            :history.map((h,i)=>(
              <div key={h.id||i} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f5f5f7"}}>
                <div style={{width:36,height:36,borderRadius:10,background:h.type==="video"?"#f0edff":h.type==="image"?"#fff4ed":"#f0fdf4",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                  {h.type==="video"?"🎥":h.type==="image"?"🖼️":"🔍"}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:14,textTransform:"capitalize"}}>{h.type} — {h.action||h.topic||"processed"}</div>
                  <div style={{fontSize:12,color:"#888",marginTop:2}}>{h.createdAt?.seconds?new Date(h.createdAt.seconds*1000).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"Recent"}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function LegalModal({title,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",zIndex:500}}>
      <div style={{width:"100%",maxWidth:600,margin:"0 auto",background:"#fff",borderRadius:"22px 22px 0 0",display:"flex",flexDirection:"column",maxHeight:"88vh"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"18px 20px 14px",borderBottom:"1px solid #e2e2e8",flexShrink:0}}>
          <div style={{fontWeight:800,fontSize:19}}>{title}</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:32,height:32,borderRadius:8,fontSize:16}}>✕</button>
        </div>
        <div style={{overflowY:"auto",padding:"16px 20px 28px",flex:1}}>{children}</div>
        <div style={{padding:"12px 20px 32px",borderTop:"1px solid #e2e2e8",flexShrink:0}}>
          <button onClick={onClose} style={{width:"100%",padding:14,borderRadius:11,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)",boxSizing:"border-box"}}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PrivacyContent(){return(<>
  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:14,marginBottom:14}}>
    <div style={{fontWeight:800,fontSize:14,color:"#dc2626",marginBottom:6}}>⚠️ DISCLAIMER</div>
    <p style={{fontSize:13,lineHeight:1.8,color:"#7f1d1d",margin:0}}>ReelKit accepts ZERO liability. <strong>Use only content you own.</strong></p>
  </div>
  {[{t:"1. Who We Are",b:"ReelKit (reelkit.in) is a free online tool for Indian content creators."},{t:"2. Data We Collect",b:"We use Google/Facebook OAuth for login. Your name and email are stored in Firebase. Videos and images are processed in your browser and NEVER stored on our servers."},{t:"3. Legal Responsibility",b:"You are SOLELY responsible for content you upload. ReelKit accepts ZERO liability."},{t:"4. Payments",b:"Pro payments via Razorpay. Cancel anytime."},{t:"5. Contact",b:"privacy@reelkit.in | Mumbai, India"}].map(x=>(<div key={x.t} style={{marginBottom:12}}><div style={{fontWeight:700,fontSize:14,marginBottom:5}}>{x.t}</div><p style={{color:"#555",fontSize:13,lineHeight:1.9,margin:0}}>{x.b}</p></div>))}
</>);}

function TermsContent(){return(<>
  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:14,marginBottom:14}}>
    <div style={{fontWeight:800,fontSize:14,color:"#dc2626",marginBottom:6}}>⚠️ LEGAL NOTICE</div>
    <p style={{fontSize:13,lineHeight:1.8,color:"#7f1d1d",margin:0}}>ReelKit accepts ZERO liability for any issues caused by user actions.</p>
  </div>
  {[{t:"1. Acceptance",b:"By using ReelKit, you agree to these Terms."},{t:"2. Your Responsibility",b:"YOU are solely responsible for all content you process."},{t:"3. Prohibited Uses",b:"Do NOT use ReelKit on content you don't own."},{t:"4. Pro Plans",b:"₹50/month or ₹399/year. Cancel anytime."},{t:"5. Contact",b:"legal@reelkit.in | Mumbai, India"}].map(x=>(<div key={x.t} style={{marginBottom:12}}><div style={{fontWeight:700,fontSize:14,marginBottom:5}}>{x.t}</div><p style={{color:"#555",fontSize:13,lineHeight:1.9,margin:0}}>{x.b}</p></div>))}
</>);}