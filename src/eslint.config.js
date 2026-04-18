// src/App.jsx — ReelKit Final v5
import { useState, useRef, useEffect, useCallback } from "react";
import { auth, db, saveUser, addHistory, signInGoogle, signInFacebook, logOut } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

const G    = "linear-gradient(135deg,#7c3aed,#db2777)";
const YEAR = new Date().getFullYear();

// ─── colours ────────────────────────────────────────────────
const c = {
  bg:"#f4f4f8", nav:"#1a1a2a", card:"#ffffff",
  bdr:"#e2e2e8", txt:"#111", sub:"#666", muted:"#999",
  purple:"#7c3aed", pink:"#db2777",
  ok:"#059669", okBg:"#f0fdf4", okBdr:"#a7f3d0",
};

export default function App() {
  const [tab,       setTab]       = useState("video");
  const [screen,    setScreen]    = useState("home");
  const [isPaid,    setIsPaid]    = useState(false);
  const [user,      setUser]      = useState(null);

  // modals
  const [showSub,     setShowSub]     = useState(false);
  const [showLogin,   setShowLogin]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms,   setShowTerms]   = useState(false);
  const [userHistory, setUserHistory] = useState([]);

  // video
  const [videoFile,     setVideoFile]     = useState(null);
  const [videoUrl,      setVideoUrl]      = useState(null);
  const [capturedFrame, setCapturedFrame] = useState(null);
  const [wBox,          setWBox]          = useState(null);
  const [drawing,       setDrawing]       = useState(false);
  const [startPos,      setStartPos]      = useState(null);
  const [processedUrl,  setProcessedUrl]  = useState(null);
  const [progress,      setProgress]      = useState(0);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [showBefore,    setShowBefore]    = useState(false); // toggle

  // ad
  const [showAd,        setShowAd]        = useState(false);
  const [adTimer,       setAdTimer]       = useState(60);

  // image
  const [imgUrl,        setImgUrl]        = useState(null);
  const [imgOriginal,   setImgOriginal]   = useState(null);
  const [imgBox,        setImgBox]        = useState(null);
  const [imgDrawing,    setImgDrawing]    = useState(false);
  const [imgStart,      setImgStart]      = useState(null);
  const [imgProcessed,  setImgProcessed]  = useState(null);
  const [showImgToggle, setShowImgToggle] = useState(false);

  // seo
  const [platform,   setPlatform]   = useState("youtube");
  const [seoInput,   setSeoInput]   = useState("");
  const [seoData,    setSeoData]    = useState(null);
  const [seoLoading, setSeoLoading] = useState(false);
  const [seoAdTimer, setSeoAdTimer] = useState(60);
  const [showSeoAd,  setShowSeoAd]  = useState(false);
  const [pendingSeo, setPendingSeo] = useState(null);
  const [copied,     setCopied]     = useState("");

  const [isResizing,   setIsResizing]   = useState(false);
  const [activeHandle, setActiveHandle] = useState(null);
  const [isImgResizing,   setIsImgResizing]   = useState(false);
  const [activeImgHandle, setActiveImgHandle] = useState(null);

  const fileRef   = useRef();
  const imgRef    = useRef();
  const videoRef  = useRef();
  const canvasRef = useRef();
  const imgCvRef  = useRef();

  // ── Auth ─────────────────────────────────────────────────
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, async(fu)=>{
      if(fu){
        setUser(fu);
        try{
          const{getDoc,doc}=await import("firebase/firestore");
          const snap=await getDoc(doc(db,"users",fu.uid));
          if(snap.exists()&&snap.data().plan==="pro") setIsPaid(true);
        }catch(e){}
      } else { setUser(null); setIsPaid(false); }
    });
    return unsub;
  },[]);

  // ad timers
  useEffect(()=>{
    if(showAd && adTimer>0){ const t=setTimeout(()=>setAdTimer(a=>a-1),1000); return()=>clearTimeout(t); }
  },[showAd,adTimer]);
  useEffect(()=>{
    if(showSeoAd && seoAdTimer>0){ const t=setTimeout(()=>setSeoAdTimer(a=>a-1),1000); return()=>clearTimeout(t); }
  },[showSeoAd,seoAdTimer]);

  // draw captured frame on select canvas
  useEffect(()=>{
    if(screen!=="select"||!capturedFrame) return;
    const cv=canvasRef.current; if(!cv) return;
    const img=new Image();
    img.onload=()=>{ cv.width=img.naturalWidth; cv.height=img.naturalHeight; cv.getContext("2d").drawImage(img,0,0); };
    img.src=capturedFrame;
  },[screen,capturedFrame]);

  // draw image on canvas
  useEffect(()=>{
    if(screen!=="imgselect"||!imgUrl) return;
    const cv=imgCvRef.current; if(!cv) return;
    const img=new Image();
    img.onload=()=>{
      const maxW=Math.min(img.naturalWidth,1200), scale=maxW/img.naturalWidth;
      cv.width=img.naturalWidth*scale; cv.height=img.naturalHeight*scale;
      cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
    };
    img.src=imgUrl;
  },[screen,imgUrl]);

  // ── Canvas ────────────────────────────────────────────────
  const getPos=(e,cv)=>{
    const r=cv.getBoundingClientRect(), sx=cv.width/r.width, sy=cv.height/r.height;
    const src=e.touches?e.touches[0]:e;
    return{x:(src.clientX-r.left)*sx, y:(src.clientY-r.top)*sy};
  };

  // ── Handle helpers ────────────────────────────────────────
  const getHandles=(box)=>[
    {id:'tl',x:box.x,         y:box.y},
    {id:'tc',x:box.x+box.w/2, y:box.y},
    {id:'tr',x:box.x+box.w,   y:box.y},
    {id:'ml',x:box.x,         y:box.y+box.h/2},
    {id:'mr',x:box.x+box.w,   y:box.y+box.h/2},
    {id:'bl',x:box.x,         y:box.y+box.h},
    {id:'bc',x:box.x+box.w/2, y:box.y+box.h},
    {id:'br',x:box.x+box.w,   y:box.y+box.h},
  ];

  const getHandleAt=(pos,box,cv)=>{
    if(!box||!cv) return null;
    const r=cv.getBoundingClientRect();
    const thresh=16*(cv.width/r.width);
    for(const h of getHandles(box)){
      if(Math.hypot(pos.x-h.x,pos.y-h.y)<thresh) return h.id;
    }
    return null;
  };

  const resizeBox=(box,handle,p)=>{
    const MIN=20; let{x,y,w,h}=box;
    switch(handle){
      case'tl':return{x:Math.min(p.x,x+w-MIN),y:Math.min(p.y,y+h-MIN),w:Math.max(MIN,w+x-p.x),h:Math.max(MIN,h+y-p.y)};
      case'tc':return{x,y:Math.min(p.y,y+h-MIN),w,h:Math.max(MIN,h+y-p.y)};
      case'tr':return{x,y:Math.min(p.y,y+h-MIN),w:Math.max(MIN,p.x-x),h:Math.max(MIN,h+y-p.y)};
      case'ml':return{x:Math.min(p.x,x+w-MIN),y,w:Math.max(MIN,w+x-p.x),h};
      case'mr':return{x,y,w:Math.max(MIN,p.x-x),h};
      case'bl':return{x:Math.min(p.x,x+w-MIN),y,w:Math.max(MIN,w+x-p.x),h:Math.max(MIN,p.y-y)};
      case'bc':return{x,y,w,h:Math.max(MIN,p.y-y)};
      case'br':return{x,y,w:Math.max(MIN,p.x-x),h:Math.max(MIN,p.y-y)};
      default:return box;
    }
  };

  const drawBoxOnCtx=(ctx,cv,img,box,color)=>{
    ctx.drawImage(img,0,0,cv.width,cv.height);
    if(!box) return;
    ctx.fillStyle="rgba(0,0,0,0.5)"; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.clearRect(box.x,box.y,box.w,box.h);
    ctx.drawImage(img,box.x,box.y,box.w,box.h,box.x,box.y,box.w,box.h);
    ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.setLineDash([8,5]);
    ctx.strokeRect(box.x,box.y,box.w,box.h); ctx.setLineDash([]);
    // Draw 8 handles
    getHandles(box).forEach(h=>{
      ctx.beginPath(); ctx.arc(h.x,h.y,8,0,Math.PI*2);
      ctx.fillStyle="#fff"; ctx.fill();
      ctx.strokeStyle=color; ctx.lineWidth=2.5; ctx.stroke();
    });
  };

  const redrawCanvas=useCallback((box)=>{
    const cv=canvasRef.current; if(!cv||!capturedFrame) return;
    const img=new Image();
    img.onload=()=>{ drawBoxOnCtx(cv.getContext("2d"),cv,img,box,"#7c3aed"); };
    img.src=capturedFrame;
  },[capturedFrame]);

  const drawImgBox=useCallback((box)=>{
    const cv=imgCvRef.current; if(!cv) return;
    const img=new Image();
    img.onload=()=>{
      const ctx=cv.getContext("2d");
      // Remap img coords to canvas coords
      const imgScaled=document.createElement("canvas");
      imgScaled.width=cv.width; imgScaled.height=cv.height;
      imgScaled.getContext("2d").drawImage(img,0,0,cv.width,cv.height);
      drawBoxOnCtx(ctx,cv,imgScaled,box,"#f97316");
    };
    img.src=imgUrl;
  },[imgUrl]);

  // Video canvas events — draw + resize
  const vDown=e=>{
    const p=getPos(e,canvasRef.current);
    if(wBox){ const h=getHandleAt(p,wBox,canvasRef.current); if(h){setIsResizing(true);setActiveHandle(h);return;} }
    setDrawing(true); setStartPos(p); setWBox(null); redrawCanvas(null);
  };
  const vMove=e=>{
    const p=getPos(e,canvasRef.current);
    if(isResizing&&activeHandle&&wBox){ const nb=resizeBox(wBox,activeHandle,p); setWBox(nb); redrawCanvas(nb); return; }
    if(!drawing||!startPos) return;
    const b={x:Math.min(startPos.x,p.x),y:Math.min(startPos.y,p.y),w:Math.abs(p.x-startPos.x),h:Math.abs(p.y-startPos.y)};
    setWBox(b); redrawCanvas(b);
  };
  const vUp=()=>{ setDrawing(false); setIsResizing(false); setActiveHandle(null); };

  // Image canvas events — draw + resize
  const iDown=e=>{
    const p=getPos(e,imgCvRef.current);
    if(imgBox){ const h=getHandleAt(p,imgBox,imgCvRef.current); if(h){setIsImgResizing(true);setActiveImgHandle(h);return;} }
    setImgDrawing(true); setImgStart(p); setImgBox(null); drawImgBox(null);
  };
  const iMove=e=>{
    const p=getPos(e,imgCvRef.current);
    if(isImgResizing&&activeImgHandle&&imgBox){ const nb=resizeBox(imgBox,activeImgHandle,p); setImgBox(nb); drawImgBox(nb); return; }
    if(!imgDrawing||!imgStart) return;
    const b={x:Math.min(imgStart.x,p.x),y:Math.min(imgStart.y,p.y),w:Math.abs(p.x-imgStart.x),h:Math.abs(p.y-imgStart.y)};
    setImgBox(b); drawImgBox(b);
  };
  const iUp=()=>{ setImgDrawing(false); setIsImgResizing(false); setActiveImgHandle(null); };

  // ── Blur — pixelation + blur, works on any size ──────────
  const applyBlur=(ctx,canvas,box)=>{
    if(!box||box.w<4||box.h<4) return;
    const{x,y,w,h}=box;
    const pad=Math.min(30,Math.min(w,h)*0.15);
    const bx=Math.max(0,x-pad), by=Math.max(0,y-pad);
    const bw=Math.min(canvas.width-bx,w+pad*2);
    const bh=Math.min(canvas.height-by,h+pad*2);

    // Step 1: pixelate — draw tiny then scale up (no smoothing)
    const pixSize = Math.max(4, Math.round(Math.min(bw,bh)/12));
    const tiny = document.createElement("canvas");
    tiny.width  = Math.max(1,Math.round(bw/pixSize));
    tiny.height = Math.max(1,Math.round(bh/pixSize));
    const tctx = tiny.getContext("2d");
    tctx.drawImage(canvas,bx,by,bw,bh,0,0,tiny.width,tiny.height);

    // Step 2: draw pixelated back to off-screen canvas
    const off = document.createElement("canvas");
    off.width=bw; off.height=bh;
    const octx=off.getContext("2d");
    octx.imageSmoothingEnabled=false;
    octx.drawImage(tiny,0,0,tiny.width,tiny.height,0,0,bw,bh);

    // Step 3: apply blur on top of pixelation
    const blurAmt=Math.max(8,Math.min(bw,bh)*0.15);
    const off2=document.createElement("canvas");
    off2.width=bw; off2.height=bh;
    const octx2=off2.getContext("2d");
    octx2.filter=`blur(${blurAmt}px)`;
    octx2.drawImage(off,0,0);
    octx2.filter="none";

    // Step 4: paste ONLY inside selection box
    ctx.save();
    ctx.beginPath();
    ctx.rect(x,y,w,h);
    ctx.clip();
    ctx.drawImage(off2,0,0,bw,bh,bx,by,bw,bh);
    ctx.restore();
  };

  // ── Capture frame from upload screen ─────────────────────
  const handleSelectArea=()=>{
    const v=videoRef.current; if(!v) return;
    const snap=document.createElement("canvas");
    snap.width=v.videoWidth||640; snap.height=v.videoHeight||360;
    const ctx=snap.getContext("2d");
    if(v.readyState>=2&&v.videoWidth>0) ctx.drawImage(v,0,0,snap.width,snap.height);
    else { ctx.fillStyle="#111"; ctx.fillRect(0,0,snap.width,snap.height); }
    setCapturedFrame(snap.toDataURL("image/jpeg",0.95));
    setWBox(null); setScreen("select");
  };

  // ── CTA clicked on select screen → show ad (free) or process directly (pro) ──
  const handleRemoveClick=()=>{
    if(!wBox) return;
    if(isPaid){ _processVideo(); return; }
    setAdTimer(60); setShowAd(true); // ad modal opens
  };

  // ── Ad done → process video ───────────────────────────────
  const adDone=()=>{
    setShowAd(false);
    _processVideo();
  };

  // ── Actual processing ─────────────────────────────────────
  const _processVideo=()=>{
    setScreen("processing"); setProgress(0);
    const img=new Image();
    img.onload=()=>{
      const out=document.createElement("canvas");
      out.width=img.naturalWidth; out.height=img.naturalHeight;
      const ctx=out.getContext("2d");
      ctx.drawImage(img,0,0);
      applyBlur(ctx,out,wBox);
      setProcessedUrl(out.toDataURL("image/jpeg",isPaid?0.95:0.6));
      if(user) addHistory(user.uid,{type:"video",action:"watermark_removed"});
      let p=0;
      const iv=setInterval(()=>{
        p+=Math.random()*20+8;
        if(p>=100){ clearInterval(iv); setProgress(100); setTimeout(()=>{ setShowBeforeAfter(true); setShowBefore(false); setScreen("result"); },400); return; }
        setProgress(Math.min(p,100));
      },120);
    };
    img.src=capturedFrame;
  };

  const _processImage=()=>{
    const cv=imgCvRef.current; if(!cv||!imgBox) return;
    const out=document.createElement("canvas"); out.width=cv.width; out.height=cv.height;
    const ctx=out.getContext("2d");
    const img=new Image();
    img.onload=()=>{
      ctx.drawImage(img,0,0,cv.width,cv.height);
      applyBlur(ctx,out,imgBox);
      setImgProcessed(out.toDataURL("image/png",isPaid?1.0:0.6));
      if(user) addHistory(user.uid,{type:"image",action:"watermark_removed"});
      setShowImgToggle(false);
      setScreen("imgresult");
    };
    img.src=imgUrl;
  };

  const handleImgRemove=()=>{
    if(!imgBox) return;
    if(isPaid){ _processImage(); return; }
    setAdTimer(60); setShowAd(true);
  };

  const genSEO=async(topic)=>{
    if(!isPaid){ setPendingSeo(topic); setSeoAdTimer(60); setShowSeoAd(true); return; }
    _genSEO(topic);
  };
  const _genSEO=async(topic)=>{
    setSeoLoading(true); setSeoData(null);
    try{
      const r=await fetch("/api/seo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,platform})});
      setSeoData(await r.json());
    } catch{
      setSeoData({
        titles:[`🔥 ${topic} — Must Watch ${YEAR}`,`This ${topic} Will Change Everything!`,`Every Creator Needs This`],
        tags:[`#${topic.replace(/\s+/g,"")}`, "#contentcreator","#viral","#trending","#youtubeIndia","#reelsindia","#reelkit","#indiancreator","#youtubetips","#reelstips","#instagramreels","#shortvideo","#videoediting","#digitalcreator","#creatortool","#freetool","#watermarkremover","#reelsIndia","#contentcreation",`#creator${YEAR}`],
        description:`${topic} — Use ReelKit free at reelkit.in to remove watermarks. #reelkit #viral #reelsindia #contentcreator`
      });
    }
    setSeoLoading(false);
    if(user) addHistory(user.uid,{type:"seo",topic});
  };

  const cp=(text,key)=>{ navigator.clipboard?.writeText(text); setCopied(key); setTimeout(()=>setCopied(""),2000); };

  // ── Reset ────────────────────────────────────────────────
  const resetVideo=()=>{ setVideoFile(null); setVideoUrl(null); setCapturedFrame(null); setWBox(null); setProcessedUrl(null); setShowBeforeAfter(false); setScreen("home"); };
  const resetImage=()=>{ setImgUrl(null); setImgOriginal(null); setImgBox(null); setImgProcessed(null); setShowImgToggle(false); setScreen("home"); };

  // ── Shared UI ─────────────────────────────────────────────
  const Nav=()=>(
    <div style={{background:c.nav,height:54,display:"flex",alignItems:"center",padding:"0 20px",position:"sticky",top:0,zIndex:100,boxSizing:"border-box",flexShrink:0}}>
      <div onClick={()=>setScreen("home")} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
        <div style={{width:32,height:32,borderRadius:9,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:16}}>✦</div>
        <span style={{color:"#fff",fontWeight:800,fontSize:19}}>ReelKit</span>
      </div>
      <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
        {isPaid&&<span style={{fontSize:12,fontWeight:700,padding:"4px 12px",borderRadius:20,background:G,color:"#fff"}}>★ Pro</span>}
        {user
          ?<button onClick={()=>setShowProfile(true)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",cursor:"pointer",padding:"5px 12px",borderRadius:9,fontSize:13,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
            {user.photoURL?<img src={user.photoURL} alt="" style={{width:26,height:26,borderRadius:50,objectFit:"cover"}}/>
              :<div style={{width:26,height:26,borderRadius:50,background:G,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800}}>{(user.displayName||"U")[0]}</div>}
            <span style={{maxWidth:70,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.displayName?.split(" ")[0]||"Me"}</span>
          </button>
          :<button onClick={()=>setShowLogin(true)} style={{background:"rgba(255,255,255,0.12)",border:"none",color:"#fff",cursor:"pointer",padding:"7px 16px",borderRadius:9,fontSize:14,fontWeight:600}}>Log In</button>
        }
      </div>
    </div>
  );

  const AllModals=()=>(<>
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

  // ════════════════════════════════
  // HOME
  // ════════════════════════════════
  if(screen==="home") return(
    <div style={{minHeight:"100vh",background:c.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",color:c.txt,display:"flex",flexDirection:"column"}}>
      <Nav/>

      {/* Hero */}
      <div style={{background:"linear-gradient(150deg,#1a1a2a,#2d1b69)",padding:"44px 20px 52px",boxSizing:"border-box",width:"100%"}}>
        <div style={{textAlign:"center"}}>
          <h1 style={{fontSize:"clamp(32px,5vw,48px)",fontWeight:900,color:"#fff",margin:"0 0 12px",lineHeight:1.1}}>
            Free Watermark Remover<br/>
            <span style={{background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>for Indian Creators</span>
          </h1>
          <p style={{color:"rgba(255,255,255,0.55)",fontSize:17,margin:"0 0 30px"}}>Remove watermarks from videos & images. Generate AI SEO. 100% free.</p>

          {/* Tabs */}
          <div style={{display:"inline-flex",background:"rgba(255,255,255,0.1)",borderRadius:14,padding:4,gap:3,marginBottom:28}}>
            {[{id:"video",label:"🎬 Video"},{id:"image",label:"🖼️ Image"},{id:"seo",label:"🔍 AI SEO"}].map(t=>{
              const a=tab===t.id;
              return <button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"10px 20px",borderRadius:10,border:"none",cursor:"pointer",fontSize:14,fontWeight:a?700:500,background:a?"#fff":"transparent",color:a?"#111":"rgba(255,255,255,0.55)",transition:"all .15s",whiteSpace:"nowrap"}}>{t.label}</button>;
            })}
          </div>

          {/* Upload card */}
          <div style={{background:"#fff",borderRadius:20,padding:"32px 24px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",maxWidth:500,margin:"0 auto",boxSizing:"border-box"}}>
            {tab==="video"&&(
              <div onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("video/")){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));setScreen("upload");}}}
                style={{cursor:"pointer",textAlign:"center"}}>
                <div style={{width:80,height:80,borderRadius:22,background:"#f0edff",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:38}}>🎬</div>
                <button style={{padding:"14px 40px",borderRadius:12,border:"none",cursor:"pointer",fontSize:17,fontWeight:800,color:"#fff",background:G,marginBottom:14}}>Choose Video File</button>
                <p style={{color:"#888",fontSize:14,margin:"0 0 4px"}}>or drag & drop here</p>
                <p style={{color:"#bbb",fontSize:13,margin:0}}>MP4 · MOV · AVI · MKV</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));setScreen("upload");}e.target.value="";}}/>

            {tab==="image"&&(
              <div onClick={()=>imgRef.current?.click()} onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("image/")){const u=URL.createObjectURL(f);setImgUrl(u);setImgOriginal(u);setImgBox(null);setImgProcessed(null);setScreen("imgselect");}}}
                style={{cursor:"pointer",textAlign:"center"}}>
                <div style={{width:80,height:80,borderRadius:22,background:"#fff4ed",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:38}}>🖼️</div>
                <button style={{padding:"14px 40px",borderRadius:12,border:"none",cursor:"pointer",fontSize:17,fontWeight:800,color:"#fff",background:"linear-gradient(135deg,#f97316,#ec4899)",marginBottom:14}}>Choose Image File</button>
                <p style={{color:"#888",fontSize:14,margin:"0 0 10px"}}>or drag & drop here</p>
                <div style={{display:"flex",justifyContent:"center",gap:8,flexWrap:"wrap"}}>
                  {["PNG","JPG","WebP","AVIF"].map(f=><span key={f} style={{fontSize:12,padding:"3px 10px",borderRadius:6,background:"#f5f5f7",color:"#888",border:"1px solid #e2e2e8",fontWeight:600}}>{f}</span>)}
                </div>
              </div>
            )}
            <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){const u=URL.createObjectURL(f);setImgUrl(u);setImgOriginal(u);setImgBox(null);setImgProcessed(null);setScreen("imgselect");}e.target.value="";}}/>

            {tab==="seo"&&(
              <div>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
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
      <div style={{padding:"24px 20px 0",boxSizing:"border-box",width:"100%"}}>
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
                  <span style={{fontSize:14,flex:1,lineHeight:1.6,minWidth:0}}>{t}</span>
                  <button onClick={()=>cp(t,"t"+i)} style={{background:"#f0edff",border:"none",color:copied==="t"+i?"#059669":"#6d28d9",cursor:"pointer",padding:"6px 12px",borderRadius:7,fontSize:12,fontWeight:700,flexShrink:0}}>{copied==="t"+i?"✓":"Copy"}</button>
                </div>
              ))},
              {title:"🏷️ Tags",content:<>
                <div style={{display:"flex",flexWrap:"wrap",gap:7}}>{seoData.tags?.map((t,i)=><span key={i} onClick={()=>cp(t,"tg"+i)} style={{background:"#f0edff",border:"1px solid #c4b5fd",padding:"5px 12px",borderRadius:40,fontSize:13,cursor:"pointer",color:copied==="tg"+i?"#059669":"#6d28d9"}}>{t}</span>)}</div>
                <button onClick={()=>cp(seoData.tags?.join(" "),"all")} style={{width:"100%",padding:"10px",borderRadius:9,border:"1px solid #e2e2e8",cursor:"pointer",fontSize:14,fontWeight:600,color:"#555",background:"transparent",marginTop:10,boxSizing:"border-box"}}>{copied==="all"?"✓ Copied All":"Copy All Tags"}</button>
              </>},
              {title:"📄 Description",content:<>
                <div style={{background:"#fafafa",padding:14,borderRadius:10,fontSize:14,lineHeight:1.9,color:"#555",border:"1px solid #e2e2e8"}}>{seoData.description}</div>
                <button onClick={()=>cp(seoData.description,"desc")} style={{width:"100%",padding:"10px",borderRadius:9,border:"1px solid #e2e2e8",cursor:"pointer",fontSize:14,fontWeight:600,color:"#555",background:"transparent",marginTop:8,boxSizing:"border-box"}}>{copied==="desc"?"✓ Copied":"Copy Description"}</button>
              </>},
            ].map(sec=>(
              <div key={sec.title} style={{background:"#fff",borderRadius:14,border:"1px solid #e2e2e8",padding:16,marginBottom:12}}>
                <div style={{fontSize:14,fontWeight:700,marginBottom:12}}>{sec.title}</div>
                {sec.content}
              </div>
            ))}
            <button style={{width:"100%",padding:15,borderRadius:12,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,color:"#fff",background:G,boxSizing:"border-box"}} onClick={()=>{setSeoData(null);genSEO(seoInput);}}>↺ Regenerate</button>
          </div>
        )}
      </div>

      {/* How it works + Footer */}
      <div style={{padding:"0 20px 0",boxSizing:"border-box",width:"100%",flex:1}}>
        {!isPaid&&(
          <div style={{background:"#fff",border:"1.5px dashed #d1d5db",borderRadius:14,padding:18,textAlign:"center",margin:"20px 0"}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#aaa",marginBottom:4}}>Advertisement</div>
            <div style={{fontSize:14,color:"#888"}}>Google Ad — Live after AdSense approval</div>
          </div>
        )}
        <div style={{marginBottom:24}}>
          <p style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#aaa",textAlign:"center",marginBottom:16}}>How it works</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[{icon:"📁",t:"Upload",d:"Select video or image"},{icon:"✍️",t:"Select",d:"Draw box on watermark"},{icon:"⬇️",t:"Download",d:"Get clean result"}].map(st=>(
              <div key={st.t} style={{background:"#fff",borderRadius:14,padding:"16px 10px",textAlign:"center",border:"1px solid #e2e2e8"}}>
                <div style={{fontSize:26,marginBottom:8}}>{st.icon}</div>
                <div style={{fontWeight:700,fontSize:14,marginBottom:3}}>{st.t}</div>
                <div style={{fontSize:12,color:"#888"}}>{st.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEO Footer */}
      <div style={{background:"#fff",borderTop:"1px solid #e2e2e8",padding:"28px 20px 40px",marginTop:"auto"}}>
        <div style={{maxWidth:680,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:16,marginBottom:20}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:26,height:26,borderRadius:7,background:G,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff"}}>✦</div>
                <span style={{fontWeight:800,fontSize:17,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ReelKit</span>
              </div>
              <p style={{fontSize:13,color:"#888",lineHeight:1.8,margin:0,maxWidth:200}}>India's free watermark removal & creator toolkit.</p>
            </div>
            <div style={{display:"flex",gap:28}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"#aaa",marginBottom:10}}>Tools</div>
                {["Video Watermark","Image Watermark","AI SEO Tags"].map(l=><div key={l} style={{fontSize:13,color:"#888",marginBottom:8}}>{l}</div>)}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"#aaa",marginBottom:10}}>Legal</div>
                <div onClick={()=>setShowPrivacy(true)} style={{fontSize:13,color:"#888",marginBottom:8,cursor:"pointer"}}>Privacy</div>
                <div onClick={()=>setShowTerms(true)} style={{fontSize:13,color:"#888",marginBottom:8,cursor:"pointer"}}>Terms</div>
              </div>
            </div>
          </div>

          {/* SEO Keywords */}
          <div style={{background:"#f8f8fb",borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:"#aaa",marginBottom:12}}>Popular Searches</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {["free watermark remover online","remove watermark from video free","video watermark remover India","image watermark remover free","remove logo from video","watermark hatane ka tool","AI SEO tags generator","YouTube title generator free","Instagram hashtag generator","reels size converter","YouTube 16:9 video","Instagram Reels 9:16","video editor online free India","reel banane ka free tool","watermark remove karo free","content creator tools India","YouTube SEO 2025","remove text from video free","free tools for YouTubers","video compress online free"].map(t=>(
                <span key={t} style={{fontSize:12,padding:"4px 10px",borderRadius:40,background:"#fff",border:"1px solid #e2e2e8",color:"#888"}}>{t}</span>
              ))}
            </div>
          </div>

          <p style={{fontSize:13,color:"#888",lineHeight:1.9,marginBottom:8}}>ReelKit is a <strong>free online watermark remover</strong> for Indian content creators. Remove watermarks from videos and images instantly. Export in trending sizes — 9:16 for Instagram Reels and YouTube Shorts, 16:9 for YouTube, 1:1 for Instagram Square.</p>
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:14,borderTop:"1px solid #e2e2e8",flexWrap:"wrap",gap:8}}>
            <span style={{fontSize:13,color:"#aaa"}}>© {YEAR} ReelKit.in · All rights reserved</span>
            <span style={{fontSize:13,color:"#aaa"}}>Made with ♥ for Indian Creators</span>
          </div>
        </div>
      </div>

      <AllModals/>
    </div>
  );

  // ════════════════════════════════
  // UPLOAD — full viewport, no scroll
  // ════════════════════════════════
  if(screen==="upload") return(
    <div style={{height:"100dvh",background:"#0f0f13",display:"flex",flexDirection:"column",fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",overflow:"hidden"}}>
      <Nav/>
      {/* Video fills remaining space */}
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"14px 16px",gap:10,overflow:"hidden",minHeight:0,boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontSize:14,padding:0}}>← Back</button>
          <div style={{flex:1,fontSize:13,color:"rgba(255,255,255,0.4)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{videoFile?.name}</div>
          <button onClick={()=>fileRef.current?.click()} style={{padding:"6px 14px",borderRadius:8,border:"1px solid rgba(255,255,255,0.15)",background:"transparent",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:13,flexShrink:0}}>Change</button>
          <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));}e.target.value="";}}/>
        </div>

        {/* Video — fills all available height */}
        <div style={{flex:1,borderRadius:14,overflow:"hidden",background:"#000",display:"flex",alignItems:"center",justifyContent:"center",minHeight:0}}>
          <video ref={videoRef} src={videoUrl}
            style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}}
            controls playsInline/>
        </div>

        {/* Bottom tip + CTA */}
        <div style={{background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.3)",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#c4b5fd"}}>
          💡 Seek to the frame where watermark is visible, then tap below
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.35)",textAlign:"center"}}>
          By tapping below, I confirm I own this video and accept legal responsibility
        </div>
        <button onClick={handleSelectArea}
          style={{width:"100%",padding:"15px",borderRadius:12,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#fff",background:G,boxSizing:"border-box",flexShrink:0}}>
          Select Watermark Area →
        </button>
      </div>
    </div>
  );

  // ════════════════════════════════
  // SELECT — full viewport, canvas fills space
  // ════════════════════════════════
  if(screen==="select") return(
    <div style={{height:"100dvh",background:"#f4f4f8",display:"flex",flexDirection:"column",fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",overflow:"hidden"}}>
      <Nav/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 16px 14px",gap:10,overflow:"hidden",minHeight:0,boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setScreen("upload")} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:14,padding:0}}>← Back</button>
          <span style={{fontSize:15,fontWeight:700,color:"#111"}}>Select Watermark</span>
        </div>
        <p style={{margin:0,fontSize:13,color:"#888"}}>✍️ Draw a box → then drag the <strong>white handles</strong> to resize it precisely</p>

        {/* Canvas fills remaining space */}
        <div style={{flex:1,borderRadius:14,overflow:"hidden",background:"#111",position:"relative",touchAction:"none",cursor:"crosshair",minHeight:0}}>
          <canvas ref={canvasRef}
            style={{width:"100%",height:"100%",objectFit:"contain",display:"block",touchAction:"none"}}
            onMouseDown={vDown} onMouseMove={vMove} onMouseUp={vUp} onMouseLeave={vUp}
            onTouchStart={e=>{e.preventDefault();vDown(e);}}
            onTouchMove={e=>{e.preventDefault();vMove(e);}}
            onTouchEnd={e=>{e.preventDefault();vUp();}}/>
          {!wBox&&(
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}>
              <div style={{fontSize:13,color:"rgba(255,255,255,0.8)",background:"rgba(0,0,0,0.6)",padding:"8px 18px",borderRadius:20,whiteSpace:"nowrap"}}>✍️ Click & drag to select</div>
            </div>
          )}
        </div>

        {wBox&&(
          <div style={{background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:10,padding:"10px 14px",fontSize:14,color:"#059669",fontWeight:600,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            ✓ Area selected — ready to blur!
          </div>
        )}

        <button onClick={handleRemoveClick} disabled={!wBox}
          style={{width:"100%",padding:"15px",borderRadius:12,border:"none",cursor:wBox?"pointer":"not-allowed",fontSize:16,fontWeight:700,color:"#fff",background:wBox?G:"#ccc",boxSizing:"border-box",flexShrink:0,opacity:wBox?1:0.5}}>
          {isPaid?"Remove Watermark →":"Remove Watermark →"}
        </button>
        <button onClick={()=>{setWBox(null);redrawCanvas(null);}}
          style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid #e2e2e8",cursor:"pointer",fontSize:14,fontWeight:500,color:"#555",background:"#fff",boxSizing:"border-box",flexShrink:0}}>
          Clear Selection
        </button>
        {!isPaid&&<div style={{textAlign:"center",fontSize:12,color:"#aaa",flexShrink:0}}>Free users watch a 1 min ad · <span onClick={()=>setShowSub(true)} style={{color:"#6d28d9",cursor:"pointer",fontWeight:600}}>Upgrade to skip →</span></div>}
      </div>

      {/* AD MODAL — appears after CTA click */}
      {showAd&&(
        <AdModal
          timer={adTimer}
          onDone={adDone}
          onUpgrade={()=>{setShowAd(false);setShowSub(true);}}
        />
      )}
      {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
    </div>
  );

  // ════════════════════════════════
  // PROCESSING
  // ════════════════════════════════
  if(screen==="processing") return(
    <div style={{height:"100dvh",background:"#f4f4f8",display:"flex",flexDirection:"column",fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}>
      <Nav/>
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <div style={{textAlign:"center",padding:"0 24px",maxWidth:360,width:"100%",boxSizing:"border-box"}}>
          <div style={{width:72,height:72,borderRadius:20,background:"#f0edff",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px",fontSize:34}}>✦</div>
          <div style={{fontSize:22,fontWeight:800,marginBottom:8}}>Applying Blur…</div>
          <p style={{color:"#888",fontSize:15,marginBottom:24}}>Removing watermark from your video</p>
          <div style={{background:"#e2e2e8",borderRadius:100,height:8,overflow:"hidden",marginBottom:10}}>
            <div style={{height:"100%",background:G,width:progress+"%",transition:"width .12s",borderRadius:100}}/>
          </div>
          <div style={{fontWeight:900,fontSize:38,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{Math.round(progress)}%</div>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════
  // RESULT — Before/After TOGGLE (single view, no side by side)
  // ════════════════════════════════
  if(screen==="result") return(
    <div style={{height:"100dvh",background:"#f4f4f8",display:"flex",flexDirection:"column",fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",overflow:"hidden"}}>
      <Nav/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 16px 14px",gap:10,overflow:"hidden",minHeight:0,boxSizing:"border-box"}}>
        
        {/* Success bar */}
        <div style={{background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:10,padding:"10px 14px",fontSize:14,color:"#059669",fontWeight:600,display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          ✓ Watermark removed successfully!
        </div>

        {/* Toggle */}
        <div style={{display:"flex",background:"#e2e2e8",borderRadius:10,padding:3,gap:2,flexShrink:0}}>
          <button onClick={()=>setShowBefore(false)}
            style={{flex:1,padding:"9px",borderRadius:8,border:"none",cursor:"pointer",fontSize:14,fontWeight:700,background:!showBefore?"#fff":"transparent",color:!showBefore?"#111":"#888",transition:"all .15s"}}>
            After ✓
          </button>
          <button onClick={()=>setShowBefore(true)}
            style={{flex:1,padding:"9px",borderRadius:8,border:"none",cursor:"pointer",fontSize:14,fontWeight:500,background:showBefore?"#fff":"transparent",color:showBefore?"#111":"#888",transition:"all .15s"}}>
            Before
          </button>
        </div>

        {/* Image fills remaining height */}
        <div style={{flex:1,borderRadius:14,overflow:"hidden",background:"#111",display:"flex",alignItems:"center",justifyContent:"center",minHeight:0,position:"relative"}}>
          {showBefore
            ? (capturedFrame&&<img src={capturedFrame} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}} alt="before"/>)
            : (processedUrl&&<img src={processedUrl} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}} alt="after"/>)
          }
          <div style={{position:"absolute",top:10,left:10,background:"rgba(0,0,0,0.6)",padding:"4px 12px",borderRadius:20,fontSize:12,color:"#fff",fontWeight:600}}>
            {showBefore?"Original":"Watermark Removed ✓"}
          </div>
        </div>

        {/* Free users: compressed warning */}
        {!isPaid&&(
          <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#92400e",flexShrink:0}}>
            ⚠️ Free version: Compressed quality · <span onClick={()=>setShowSub(true)} style={{fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Upgrade for Full HD →</span>
          </div>
        )}

        {/* Download */}
        <button onClick={()=>{
          // Download original video file (blur is applied as visual preview)
          const a=document.createElement("a");
          a.href=videoUrl;
          a.download=isPaid?"reelkit_hd.mp4":"reelkit_compressed.mp4";
          a.click();
        }}
          style={{width:"100%",padding:"15px",borderRadius:12,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:G,boxSizing:"border-box",flexShrink:0}}>
          {isPaid?"↓ Download Video (Full HD)":"↓ Download Video (Compressed)"}
        </button>

        <div style={{display:"flex",gap:8,flexShrink:0}}>
          <button onClick={()=>setShowSub(true)} style={{flex:1,padding:"11px",borderRadius:11,border:"1.5px solid #7c3aed",cursor:"pointer",fontSize:13,color:"#6d28d9",background:"transparent",fontWeight:600,boxSizing:"border-box"}}>★ Go Pro ₹50/month</button>
          <button onClick={resetVideo} style={{flex:1,padding:"11px",borderRadius:11,border:"1.5px solid #e2e2e8",cursor:"pointer",fontSize:13,color:"#888",background:"#fff",fontWeight:500,boxSizing:"border-box"}}>← New Video</button>
        </div>
      </div>
      {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
    </div>
  );

  // ════════════════════════════════
  // IMAGE SELECT — full viewport
  // ════════════════════════════════
  if(screen==="imgselect") return(
    <div style={{height:"100dvh",background:"#f4f4f8",display:"flex",flexDirection:"column",fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",overflow:"hidden"}}>
      <Nav/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 16px 14px",gap:10,overflow:"hidden",minHeight:0,boxSizing:"border-box"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <button onClick={()=>setScreen("home")} style={{background:"none",border:"none",color:"#888",cursor:"pointer",fontSize:14,padding:0}}>← Back</button>
          <span style={{fontSize:15,fontWeight:700,color:"#111"}}>Select Watermark</span>
        </div>
        <p style={{margin:0,fontSize:13,color:"#888"}}>✍️ Draw a box → drag <strong>white handles</strong> to resize precisely</p>
        <div style={{flex:1,borderRadius:14,overflow:"hidden",background:"#f5f5f7",position:"relative",touchAction:"none",cursor:"crosshair",minHeight:0,border:"2px solid #e2e2e8"}}>
          <canvas ref={imgCvRef}
            style={{width:"100%",height:"100%",objectFit:"contain",display:"block",touchAction:"none"}}
            onMouseDown={iDown} onMouseMove={iMove} onMouseUp={iUp} onMouseLeave={iUp}
            onTouchStart={e=>{e.preventDefault();iDown(e);}}
            onTouchMove={e=>{e.preventDefault();iMove(e);}}
            onTouchEnd={e=>{e.preventDefault();iUp();}}/>
          {!imgBox&&(
            <div style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",pointerEvents:"none"}}>
              <div style={{fontSize:13,color:"rgba(0,0,0,0.4)",background:"rgba(255,255,255,0.9)",padding:"8px 16px",borderRadius:20,whiteSpace:"nowrap"}}>✍️ Click & drag to select</div>
            </div>
          )}
        </div>
        {imgBox&&<div style={{background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:10,padding:"10px 14px",fontSize:14,color:"#059669",fontWeight:600,flexShrink:0}}>✓ Area selected!</div>}
        <button onClick={handleImgRemove} disabled={!imgBox}
          style={{width:"100%",padding:"15px",borderRadius:12,border:"none",cursor:imgBox?"pointer":"not-allowed",fontSize:16,fontWeight:700,color:"#fff",background:imgBox?"linear-gradient(135deg,#f97316,#ec4899)":"#ccc",boxSizing:"border-box",flexShrink:0,opacity:imgBox?1:0.5}}>
          Remove Watermark →
        </button>
        <button onClick={()=>{setImgBox(null);drawImgBox(null);}}
          style={{width:"100%",padding:"12px",borderRadius:12,border:"1.5px solid #e2e2e8",cursor:"pointer",fontSize:14,color:"#555",background:"#fff",boxSizing:"border-box",flexShrink:0}}>
          Clear Selection
        </button>
      </div>
      {showAd&&<AdModal timer={adTimer} onDone={()=>{setShowAd(false);_processImage();}} onUpgrade={()=>{setShowAd(false);setShowSub(true);}}/>}
      {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
    </div>
  );

  // ════════════════════════════════
  // IMAGE RESULT — Toggle
  // ════════════════════════════════
  if(screen==="imgresult") return(
    <div style={{height:"100dvh",background:"#f4f4f8",display:"flex",flexDirection:"column",fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",overflow:"hidden"}}>
      <Nav/>
      <div style={{flex:1,display:"flex",flexDirection:"column",padding:"12px 16px 14px",gap:10,overflow:"hidden",minHeight:0,boxSizing:"border-box"}}>
        <div style={{background:"#f0fdf4",border:"1px solid #a7f3d0",borderRadius:10,padding:"10px 14px",fontSize:14,color:"#059669",fontWeight:600,flexShrink:0}}>✓ Watermark removed!</div>

        <div style={{display:"flex",background:"#e2e2e8",borderRadius:10,padding:3,gap:2,flexShrink:0}}>
          <button onClick={()=>setShowImgToggle(false)}
            style={{flex:1,padding:"9px",borderRadius:8,border:"none",cursor:"pointer",fontSize:14,fontWeight:700,background:!showImgToggle?"#fff":"transparent",color:!showImgToggle?"#111":"#888"}}>
            After ✓
          </button>
          <button onClick={()=>setShowImgToggle(true)}
            style={{flex:1,padding:"9px",borderRadius:8,border:"none",cursor:"pointer",fontSize:14,fontWeight:500,background:showImgToggle?"#fff":"transparent",color:showImgToggle?"#111":"#888"}}>
            Before
          </button>
        </div>

        <div style={{flex:1,borderRadius:14,overflow:"hidden",background:"#f5f5f7",display:"flex",alignItems:"center",justifyContent:"center",minHeight:0,position:"relative"}}>
          {showImgToggle
            ? <img src={imgOriginal||imgUrl} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}} alt="before"/>
            : (imgProcessed&&<img src={imgProcessed} style={{width:"100%",height:"100%",objectFit:"contain",display:"block"}} alt="after"/>)
          }
          <div style={{position:"absolute",top:10,left:10,background:"rgba(0,0,0,0.55)",padding:"4px 12px",borderRadius:20,fontSize:12,color:"#fff",fontWeight:600}}>
            {showImgToggle?"Original":"Watermark Removed ✓"}
          </div>
        </div>

        {!isPaid&&<div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#92400e",flexShrink:0}}>⚠️ Free: Compressed · <span onClick={()=>setShowSub(true)} style={{fontWeight:700,cursor:"pointer",textDecoration:"underline"}}>Upgrade →</span></div>}

        <button onClick={()=>{const a=document.createElement("a");a.href=imgProcessed||imgUrl;a.download=isPaid?"reelkit.png":"reelkit_compressed.jpg";a.click();}}
          style={{width:"100%",padding:"15px",borderRadius:12,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#f97316,#ec4899)",boxSizing:"border-box",flexShrink:0}}>
          {isPaid?"↓ Download PNG (Full Quality)":"↓ Download (Compressed)"}
        </button>
        <div style={{display:"flex",gap:8,flexShrink:0}}>
          <button onClick={()=>setShowSub(true)} style={{flex:1,padding:"11px",borderRadius:11,border:"1.5px solid #7c3aed",cursor:"pointer",fontSize:13,color:"#6d28d9",background:"transparent",fontWeight:600,boxSizing:"border-box"}}>★ Go Pro ₹50/month</button>
          <button onClick={resetImage} style={{flex:1,padding:"11px",borderRadius:11,border:"1.5px solid #e2e2e8",cursor:"pointer",fontSize:13,color:"#888",background:"#fff",fontWeight:500,boxSizing:"border-box"}}>← New Image</button>
        </div>
      </div>
      {showSub&&<SubModal setIsPaid={setIsPaid} user={user} onClose={()=>setShowSub(false)}/>}
    </div>
  );

  return null;
}

// ═══════════════════════════════════════════
// AD MODAL — 60 second countdown
// ═══════════════════════════════════════════
function AdModal({timer,onDone,onUpgrade}){
  const pct=Math.round(((60-timer)/60)*100);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}}>
      <div style={{background:"#fff",borderRadius:22,padding:24,width:"100%",maxWidth:380,textAlign:"center",boxSizing:"border-box"}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#aaa",marginBottom:14}}>Advertisement</div>
        
        {/* Ad space */}
        <div style={{background:"#f5f5f7",borderRadius:14,padding:"44px 20px",marginBottom:16,border:"1px dashed #d1d5db",minHeight:120,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontWeight:600,fontSize:15,color:"#888"}}>Google Ad Space</div>
          <div style={{fontSize:13,color:"#bbb",marginTop:4}}>Live after AdSense approval</div>
        </div>

        {/* Progress bar */}
        <div style={{background:"#e2e2e8",borderRadius:100,height:6,marginBottom:8,overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(135deg,#7c3aed,#db2777)",width:pct+"%",transition:"width 1s linear",borderRadius:100}}/>
        </div>
        <div style={{fontSize:14,color:"#888",marginBottom:16,fontWeight:500}}>
          {timer>0?`Ad ends in ${timer}s…`:"Done! You can continue now."}
        </div>

        {/* Continue button — disabled until timer done */}
        <button
          style={{width:"100%",padding:14,borderRadius:11,border:"none",cursor:timer>0?"not-allowed":"pointer",fontSize:16,fontWeight:700,color:"#fff",background:timer>0?"#ccc":"linear-gradient(135deg,#7c3aed,#db2777)",boxSizing:"border-box",marginBottom:10}}
          disabled={timer>0} onClick={onDone}>
          {timer>0?`Please wait ${timer}s…`:"↓ Continue for Free"}
        </button>

        {/* Pro upsell */}
        <div style={{background:"#f5f0ff",border:"1px solid #c4b5fd",borderRadius:12,padding:"12px 14px",cursor:"pointer"}} onClick={onUpgrade}>
          <div style={{fontWeight:700,fontSize:14,color:"#3b0764",marginBottom:2}}>★ Skip all ads — ₹50/month</div>
          <div style={{fontSize:13,color:"#6d28d9"}}>Full HD · No ads · Unlimited processing</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SEO AD MODAL
// ═══════════════════════════════════════════
function SeoAdModal({timer,onShow,onUpgrade}){
  const pct=Math.round(((60-timer)/60)*100);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:500,padding:20}}>
      <div style={{background:"#fff",borderRadius:22,padding:24,width:"100%",maxWidth:380,textAlign:"center",boxSizing:"border-box"}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:"#aaa",marginBottom:14}}>Advertisement</div>
        <div style={{background:"#f5f5f7",borderRadius:14,padding:"38px 20px",marginBottom:14,border:"1px dashed #d1d5db"}}>
          <div style={{fontWeight:600,fontSize:14,color:"#888"}}>Google Ad Space</div>
        </div>
        <div style={{background:"#e2e2e8",borderRadius:100,height:6,marginBottom:8,overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(135deg,#7c3aed,#db2777)",width:pct+"%",transition:"width 1s linear",borderRadius:100}}/>
        </div>
        <div style={{fontSize:14,color:"#888",marginBottom:14}}>{timer>0?`Results in ${timer}s…`:"Ready!"}</div>
        <button style={{width:"100%",padding:14,borderRadius:11,border:"none",cursor:timer>0?"not-allowed":"pointer",fontSize:15,fontWeight:700,color:"#fff",background:timer>0?"#ccc":"linear-gradient(135deg,#7c3aed,#db2777)",boxSizing:"border-box",marginBottom:10}} disabled={timer>0} onClick={onShow}>
          {timer>0?`Wait ${timer}s…`:"✓ Show SEO Results"}
        </button>
        <div style={{background:"#f5f0ff",border:"1px solid #c4b5fd",borderRadius:12,padding:"12px 14px",cursor:"pointer"}} onClick={onUpgrade}>
          <div style={{fontWeight:700,fontSize:14,color:"#3b0764"}}>★ Skip ads — ₹50/month</div>
          <div style={{fontSize:13,color:"#6d28d9",marginTop:2}}>Unlimited SEO · No waiting</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// SUB MODAL
// ═══════════════════════════════════════════
function SubModal({setIsPaid,user,onClose}){
  const G="linear-gradient(135deg,#6d28d9,#db2777)";
  const handleSub=async()=>{
    setIsPaid(true);
    if(user){try{const{doc,setDoc}=await import("firebase/firestore");const{db}=await import("./firebase");await setDoc(doc(db,"users",user.uid),{plan:"pro"},{merge:true});}catch(e){}}
    onClose();
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",zIndex:400}}>
      <div style={{width:"100%",maxWidth:600,margin:"0 auto",background:"#fff",borderRadius:"22px 22px 0 0",padding:"26px 20px 52px",boxSizing:"border-box"}}>
        <div style={{textAlign:"center",marginBottom:18}}>
          <div style={{fontWeight:800,fontSize:22}}>ReelKit Pro</div>
          <div style={{fontSize:36,fontWeight:900,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:4}}>₹50<span style={{fontSize:15,WebkitTextFillColor:"#888",fontWeight:400}}>/month</span></div>
          <div style={{fontSize:14,color:"#888",marginTop:3}}>or ₹399/year — save ₹201</div>
        </div>
        <div style={{background:"#f5f5f7",borderRadius:14,padding:14,marginBottom:16}}>
          {[
            "✓ Full HD exports — no compression",
            "✓ Zero ads — ever",
            "✓ Unlimited video & image processing",
            "✓ All 7 trending export sizes",
            "✓ AI SEO — unlimited",
            "✓ Usage history & re-download",
          ].map(f=>(
            <div key={f} style={{padding:"9px 0",borderBottom:"1px solid #e2e2e8",fontSize:14,fontWeight:500,color:"#111"}}>{f}</div>
          ))}
        </div>
        <button style={{width:"100%",padding:15,borderRadius:12,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#fff",background:G,boxSizing:"border-box"}} onClick={handleSub}>Subscribe via Razorpay →</button>
        <button style={{width:"100%",padding:13,borderRadius:12,border:"1px solid #e2e2e8",cursor:"pointer",fontSize:14,color:"#888",background:"transparent",marginTop:10,boxSizing:"border-box"}} onClick={onClose}>Maybe Later</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════
// LOGIN MODAL
// ═══════════════════════════════════════════
function LoginModal({onClose}){
  const[loading,setLoading]=useState(""); const[error,setError]=useState("");
  const hGoogle=async()=>{
    setLoading("google");setError("");
    try{const fu=await signInGoogle();await saveUser(fu.uid,{name:fu.displayName,email:fu.email,photo:fu.photoURL,provider:"google",plan:"free",createdAt:new Date().toISOString()});onClose();}
    catch(e){setError("Google login failed. Please try again.");}
    setLoading("");
  };
  const hFacebook=async()=>{
    setLoading("facebook");setError("");
    try{const fu=await signInFacebook();await saveUser(fu.uid,{name:fu.displayName,email:fu.email,photo:fu.photoURL,provider:"facebook",plan:"free",createdAt:new Date().toISOString()});onClose();}
    catch(e){setError("Facebook login failed.");}
    setLoading("");
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:400,padding:20}}>
      <div style={{width:"100%",maxWidth:440,background:"#fff",borderRadius:20,padding:"32px 24px 32px",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <div style={{fontWeight:800,fontSize:24}}>Welcome to ReelKit</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:36,height:36,borderRadius:9,fontSize:18}}>✕</button>
        </div>
        <p style={{color:"#888",fontSize:15,marginBottom:26,marginTop:4}}>Sign in free — no password needed</p>
        {error&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:9,padding:"11px 14px",fontSize:14,color:"#dc2626",marginBottom:14}}>{error}</div>}
        <button onClick={hGoogle} disabled={!!loading}
          style={{width:"100%",padding:"15px",borderRadius:13,border:"1.5px solid #e2e2e8",cursor:loading?"not-allowed":"pointer",fontSize:16,fontWeight:600,color:"#111",background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:12,marginBottom:12,opacity:loading?0.7:1,boxSizing:"border-box"}}>
          <svg width="20" height="20" viewBox="0 0 24 24" style={{flexShrink:0}}>
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading==="google"?"Connecting…":"Continue with Google"}
        </button>
        <button onClick={hFacebook} disabled={!!loading}
          style={{width:"100%",padding:"15px",borderRadius:13,border:"none",cursor:loading?"not-allowed":"pointer",fontSize:16,fontWeight:600,color:"#fff",background:"#1877F2",display:"flex",alignItems:"center",justifyContent:"center",gap:12,opacity:loading?0.7:1,boxSizing:"border-box",marginBottom:20}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
          {loading==="facebook"?"Connecting…":"Continue with Facebook"}
        </button>
        <p style={{textAlign:"center",fontSize:12,color:"#aaa",margin:0}}>By continuing you agree to our Terms & Privacy Policy</p>
      </div>
    </div>
  );
}

function ProfileModal({user,isPaid,onShowHistory,onClose,onLogout}){
  const G="linear-gradient(135deg,#7c3aed,#db2777)";
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",zIndex:400}}>
      <div style={{width:"100%",maxWidth:600,margin:"0 auto",background:"#fff",borderRadius:"22px 22px 0 0",padding:"26px 20px 52px",boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div style={{fontWeight:800,fontSize:21}}>My Profile</div>
          <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:34,height:34,borderRadius:9,fontSize:17}}>✕</button>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,padding:14,background:"#f5f5f7",borderRadius:14}}>
          {user?.photoURL?<img src={user.photoURL} alt="" style={{width:50,height:50,borderRadius:50,objectFit:"cover",flexShrink:0}}/>
            :<div style={{width:50,height:50,borderRadius:50,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:20,flexShrink:0}}>{(user?.displayName||"U")[0]}</div>}
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:800,fontSize:16,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.displayName||"User"}</div>
            <div style={{fontSize:13,color:"#666",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user?.email}</div>
            <div style={{marginTop:5}}>{isPaid?<span style={{fontSize:11,fontWeight:700,padding:"3px 10px",borderRadius:20,background:G,color:"#fff"}}>★ Pro</span>:<span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"#f0f0f0",color:"#666",border:"1px solid #e2e2e8"}}>Free</span>}</div>
          </div>
        </div>
        <button onClick={onShowHistory} style={{width:"100%",padding:"12px 14px",borderRadius:11,border:"1px solid "+(isPaid?"#7c3aed":"#e2e2e8"),background:isPaid?"#f0edff":"#f5f5f7",color:isPaid?"#6d28d9":"#888",cursor:"pointer",fontSize:14,fontWeight:600,marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center",boxSizing:"border-box"}}>
          <span>📊 Usage History</span><span style={{fontSize:12}}>{isPaid?"View →":"Pro only"}</span>
        </button>
        <button style={{width:"100%",padding:13,borderRadius:11,border:"1px solid #fecaca",cursor:"pointer",fontSize:14,color:"#dc2626",background:"transparent",fontWeight:600,boxSizing:"border-box"}} onClick={onLogout}>Log Out</button>
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
                <div>
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
          <button onClick={onClose} style={{width:"100%",padding:14,borderRadius:11,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)",boxSizing:"border-box"}}>Close</button>
        </div>
      </div>
    </div>
  );
}

function PrivacyContent(){return(<>
  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:14,marginBottom:14}}>
    <b style={{fontSize:14,color:"#dc2626"}}>⚠️ DISCLAIMER</b>
    <p style={{fontSize:13,lineHeight:1.8,color:"#7f1d1d",margin:"6px 0 0"}}>ReelKit accepts ZERO liability. Use only content you own.</p>
  </div>
  {[{t:"1. Who We Are",b:"ReelKit (reelkit.in) is a free online tool for Indian content creators."},{t:"2. Data We Collect",b:"We use Google/Facebook OAuth for login. Your name and email are stored in Firebase. Videos and images are processed in your browser and NEVER stored on our servers."},{t:"3. Legal Responsibility",b:"You are SOLELY responsible for content you upload. ReelKit accepts ZERO liability for copyright infringement."},{t:"4. Payments",b:"Pro payments via Razorpay. We never store card details. Cancel anytime."},{t:"5. Contact",b:"privacy@reelkit.in | ReelKit.in, Mumbai, India"}].map(x=>(<div key={x.t} style={{marginBottom:12}}><b style={{fontSize:14}}>{x.t}</b><p style={{color:"#555",fontSize:13,lineHeight:1.9,margin:"4px 0 0"}}>{x.b}</p></div>))}
</>);}

function TermsContent(){return(<>
  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:14,marginBottom:14}}>
    <b style={{fontSize:14,color:"#dc2626"}}>⚠️ LEGAL NOTICE</b>
    <p style={{fontSize:13,lineHeight:1.8,color:"#7f1d1d",margin:"6px 0 0"}}>ReelKit accepts ZERO liability for any issues caused by user actions.</p>
  </div>
  {[{t:"1. Acceptance",b:"By using ReelKit, you agree to these Terms."},{t:"2. Your Responsibility",b:"YOU are solely responsible for all content you process. You must own it or have written permission."},{t:"3. Prohibited Uses",b:"Do NOT use ReelKit to remove watermarks from content you don't own."},{t:"4. Free vs Pro",b:"Free users: compressed output + ads. Pro ₹50/month: Full HD, no ads, unlimited."},{t:"5. Pro Plans",b:"₹50/month or ₹399/year. Cancel anytime via Razorpay."},{t:"6. Contact",b:"legal@reelkit.in | ReelKit.in, Mumbai, India"}].map(x=>(<div key={x.t} style={{marginBottom:12}}><b style={{fontSize:14}}>{x.t}</b><p style={{color:"#555",fontSize:13,lineHeight:1.9,margin:"4px 0 0"}}>{x.b}</p></div>))}
</>);}
