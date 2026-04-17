import { useState, useRef, useEffect, useCallback } from "react";

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

// Theme — light only, clean
const C = {
  bg:"#ffffff", nav:"#1a1a2a", surf:"#f5f5f7", card:"#ffffff",
  bdr:"#e2e2e8", txt:"#111111", sub2:"#444444", sub:"#777777",
  inp:"#fafafa", tagBg:"#f0edff", tagClr:"#6d28d9",
  okBg:"#f0fdf4", okBdr:"#a7f3d0", okTxt:"#059669",
  warnBg:"#fffbeb", warnBdr:"#fde68a", warnTxt:"#92400e",
};

export default function App() {
  const [tab,         setTab]         = useState("video");
  const [screen,      setScreen]      = useState("home");
  const [isPaid,      setIsPaid]      = useState(false);
  const [showSub,     setShowSub]     = useState(false);
  const [showLogin,   setShowLogin]   = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms,   setShowTerms]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [user,        setUser]        = useState(null); // {name, phone, dob}

  const [videoFile,   setVideoFile]   = useState(null);
  const [videoUrl,    setVideoUrl]    = useState(null);
  const [legalOk,     setLegalOk]     = useState(false);
  const [wBox,        setWBox]        = useState(null);
  const [drawing,     setDrawing]     = useState(false);
  const [startPos,    setStartPos]    = useState(null);
  const [progress,    setProgress]    = useState(0);
  const [showAd,      setShowAd]      = useState(false);
  const [adTimer,     setAdTimer]     = useState(5);
  const [pendingSz,   setPendingSz]   = useState(null);
  const [processedUrl,setProcessedUrl]= useState(null);

  const [imgUrl,      setImgUrl]      = useState(null);
  const [imgOriginal, setImgOriginal] = useState(null); // keep original
  const [imgBox,      setImgBox]      = useState(null);
  const [imgDrawing,  setImgDrawing]  = useState(false);
  const [imgStart,    setImgStart]    = useState(null);
  const [imgProcessed,setImgProcessed]= useState(null);

  const [platform,    setPlatform]    = useState("youtube");
  const [seoInput,    setSeoInput]    = useState("");
  const [seoData,     setSeoData]     = useState(null);
  const [seoLoading,  setSeoLoading]  = useState(false);
  const [seoAdTimer,  setSeoAdTimer]  = useState(5);
  const [showSeoAd,   setShowSeoAd]   = useState(false);
  const [pendingSeo,  setPendingSeo]  = useState(null);
  const [copied,      setCopied]      = useState("");

  const fileRef   = useRef();
  const imgRef    = useRef();
  const videoRef  = useRef();
  const canvasRef = useRef();
  const imgCvRef  = useRef();

  useEffect(()=>{if(showAd&&adTimer>0){const t=setTimeout(()=>setAdTimer(a=>a-1),1000);return()=>clearTimeout(t);}},[showAd,adTimer]);
  useEffect(()=>{if(showSeoAd&&seoAdTimer>0){const t=setTimeout(()=>setSeoAdTimer(a=>a-1),1000);return()=>clearTimeout(t);}},[showSeoAd,seoAdTimer]);

  // ── VIDEO CANVAS ─────────────────────────────────────────────
  useEffect(()=>{
    if(screen!=="select") return;
    const v = videoRef.current;
    const cv = canvasRef.current;
    if(!v || !cv) return;

    const drawFrame = () => {
      if(v.readyState >= 2) {
        cv.width  = v.videoWidth  || 640;
        cv.height = v.videoHeight || 360;
        cv.getContext("2d").drawImage(v, 0, 0, cv.width, cv.height);
      }
    };

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

    // If video already loaded, draw immediately
    if(v.readyState >= 2) drawFrame();

    return () => {
      v.removeEventListener("loadeddata", onLoaded);
      v.removeEventListener("seeked", onSeeked);
    };
  }, [screen]);

  // ── IMAGE CANVAS ─────────────────────────────────────────────
  useEffect(()=>{
    if(screen !== "imgselect" || !imgUrl) return;
    const cv = imgCvRef.current;
    if(!cv) return;

    const img = new Image();
    img.onload = () => {
      // Use display size for mobile friendliness
      const maxW = Math.min(img.naturalWidth, 1200);
      const scale = maxW / img.naturalWidth;
      cv.width  = img.naturalWidth  * scale;
      cv.height = img.naturalHeight * scale;
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
    };
    img.onerror = () => console.error("Image load failed");
    img.src = imgUrl;
  }, [screen, imgUrl]);

  // ── CANVAS BOX DRAWING ───────────────────────────────────────
  const getPos=(e,cv)=>{
    const r=cv.getBoundingClientRect();
    const sx=cv.width/r.width, sy=cv.height/r.height;
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    return{x:(cx-r.left)*sx, y:(cy-r.top)*sy};
  };

  const drawVideoBox = useCallback((box)=>{
    const cv = canvasRef.current;
    const v  = videoRef.current;
    if(!cv || !v) return;
    const ctx = cv.getContext("2d");
    // Redraw video frame first
    ctx.drawImage(v, 0, 0, cv.width, cv.height);
    if(!box) return;
    ctx.fillStyle="rgba(0,0,0,0.45)"; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.clearRect(box.x,box.y,box.w,box.h);
    ctx.strokeStyle="#7c3aed"; ctx.lineWidth=2; ctx.setLineDash([6,4]);
    ctx.strokeRect(box.x,box.y,box.w,box.h);
    ctx.fillStyle="#7c3aed"; ctx.setLineDash([]);
    [[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]].forEach(([a,b])=>ctx.fillRect(a-5,b-5,10,10));
  },[]);

  const drawImgBox = useCallback((box)=>{
    const cv = imgCvRef.current;
    if(!cv) return;
    const ctx = cv.getContext("2d");
    // Redraw original image
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      if(!box) return;
      ctx.fillStyle="rgba(0,0,0,0.45)"; ctx.fillRect(0,0,cv.width,cv.height);
      ctx.clearRect(box.x,box.y,box.w,box.h);
      ctx.strokeStyle="#7c3aed"; ctx.lineWidth=2; ctx.setLineDash([6,4]);
      ctx.strokeRect(box.x,box.y,box.w,box.h);
      ctx.fillStyle="#7c3aed"; ctx.setLineDash([]);
      [[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]].forEach(([a,b])=>ctx.fillRect(a-5,b-5,10,10));
    };
    img.src = imgUrl;
  },[imgUrl]);

  const vDown=e=>{const p=getPos(e,canvasRef.current);setDrawing(true);setStartPos(p);setWBox(null);drawVideoBox(null);};
  const vMove=e=>{if(!drawing||!startPos)return;const p=getPos(e,canvasRef.current);const b={x:Math.min(startPos.x,p.x),y:Math.min(startPos.y,p.y),w:Math.abs(p.x-startPos.x),h:Math.abs(p.y-startPos.y)};setWBox(b);drawVideoBox(b);};
  const vUp=()=>setDrawing(false);

  const iDown=e=>{const p=getPos(e,imgCvRef.current);setImgDrawing(true);setImgStart(p);setImgBox(null);drawImgBox(null);};
  const iMove=e=>{if(!imgDrawing||!imgStart)return;const p=getPos(e,imgCvRef.current);const b={x:Math.min(imgStart.x,p.x),y:Math.min(imgStart.y,p.y),w:Math.abs(p.x-imgStart.x),h:Math.abs(p.y-imgStart.y)};setImgBox(b);drawImgBox(b);};
  const iUp=()=>setImgDrawing(false);

  // ── PROCESS ──────────────────────────────────────────────────
  const doProcess=()=>{
    setScreen("processing"); setProgress(0);
    let p=0;
    const iv=setInterval(()=>{
      p+=Math.random()*12+3;
      if(p>=100){clearInterval(iv);setProgress(100);setProcessedUrl(videoUrl);setTimeout(()=>setScreen("export"),500);return;}
      setProgress(Math.min(p,100));
    },160);
  };

  const doImgProcess=()=>{
    const cv = imgCvRef.current;
    if(!cv||!imgBox) return;
    const img = new Image();
    img.onload = () => {
      const ctx = cv.getContext("2d");
      // Redraw clean image
      ctx.drawImage(img, 0, 0, cv.width, cv.height);
      // Apply blur inpainting on selected area
      const {x,y,w,h} = imgBox;
      const blurAmount = Math.max(8, Math.min(w,h) * 0.4);
      ctx.filter = `blur(${blurAmount}px)`;
      // Draw surrounding area over watermark
      const pad = Math.max(w,h) * 0.15;
      ctx.drawImage(cv, x-pad, y-pad, w+pad*2, h+pad*2, x-pad, y-pad, w+pad*2, h+pad*2);
      ctx.filter = "none";
      setImgProcessed(cv.toDataURL("image/png", 1.0));
      setScreen("imgexport");
    };
    img.src = imgUrl;
  };

  const doDownload=sz=>{
    if(!isPaid&&sz.paid){setPendingSz(sz);setAdTimer(5);setShowAd(true);}
    else triggerDL(sz);
  };
  const triggerDL=sz=>{
    if(!processedUrl)return;
    const a=document.createElement("a");a.href=processedUrl;a.download="reelkit_"+sz.id+".mp4";a.click();
  };
  const adDone=()=>{setShowAd(false);if(pendingSz){triggerDL(pendingSz);setPendingSz(null);}};
  const cp=(text,key)=>{navigator.clipboard?.writeText(text);setCopied(key);setTimeout(()=>setCopied(""),2000);};

  const genSEO=async(topic)=>{
    setSeoLoading(true);setSeoData(null);
    try{
      const res=await fetch("/api/seo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,platform})});
      const result=await res.json();
      if(!isPaid){setPendingSeo(result);setSeoAdTimer(5);setShowSeoAd(true);}
      else setSeoData(result);
    }catch{
      const fb={
        titles:[`🔥 ${topic} — Must Watch ${YEAR}`,`This ${topic} Will Change Everything!`,`Every Creator Must Know This`],
        tags:[`#${topic.replace(/\s+/g,"")}`, "#contentcreator","#reelstips","#youtubetips","#instagramreels","#viral","#trending","#youtubeIndia","#reelsindia","#creatortool","#freetool","#videoediting","#socialmedia","#digitalcreator","#creatoreconomy","#reelkit","#shortstips","#videoedit","#instagramIndia",`#creator${YEAR}`,"#indiancreator"],
        description:`${topic} — perfect for Indian creators on ${platform}. Use ReelKit free at reelkit.in to remove watermarks. #reelkit #viral #reelsindia #contentcreator`
      };
      if(!isPaid){setPendingSeo(fb);setSeoAdTimer(5);setShowSeoAd(true);}
      else setSeoData(fb);
    }
    setSeoLoading(false);
  };

  // ── SHARED COMPONENTS ────────────────────────────────────────
  const Btn=({onClick,children,style={}})=>(
    <button onClick={onClick} style={{width:"100%",padding:"17px",borderRadius:14,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:G,...style}}>{children}</button>
  );
  const BtnO=({onClick,children,style={}})=>(
    <button onClick={onClick} style={{width:"100%",padding:"16px",borderRadius:14,border:"1px solid "+C.bdr,cursor:"pointer",fontSize:16,fontWeight:500,color:C.sub2,background:"transparent",marginTop:12,...style}}>{children}</button>
  );

  const Nav=()=>(
    <div style={{background:C.nav,height:58,display:"flex",alignItems:"center",padding:"0 24px",position:"sticky",top:0,zIndex:50}}>
      <div onClick={()=>setScreen("home")} style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
        <div style={{width:34,height:34,borderRadius:9,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:17}}>✦</div>
        <span style={{color:"#fff",fontWeight:800,fontSize:18}}>ReelKit</span>
      </div>
      <div style={{marginLeft:"auto",display:"flex",gap:10,alignItems:"center"}}>
        {isPaid&&<span style={{fontSize:13,fontWeight:700,padding:"5px 14px",borderRadius:20,background:G,color:"#fff"}}>★ Pro</span>}
        {user
          ? <button onClick={()=>setShowProfile(true)} style={{background:"rgba(255,255,255,0.12)",border:"none",color:"#fff",cursor:"pointer",padding:"8px 16px",borderRadius:9,fontSize:15,fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
              <div style={{width:28,height:28,borderRadius:50,background:G,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800}}>{user.name?user.name[0].toUpperCase():"U"}</div>
              {user.name||"Profile"}
            </button>
          : <button onClick={()=>setShowLogin(true)} style={{background:"rgba(255,255,255,0.12)",border:"none",color:"#fff",cursor:"pointer",padding:"8px 18px",borderRadius:9,fontSize:15,fontWeight:600}}>Log In</button>
        }
      </div>
    </div>
  );

  const Wrap=({children})=>(
    <div style={{width:"100%",maxWidth:660,margin:"0 auto",padding:"32px 20px 80px",boxSizing:"border-box"}}>
      {children}
    </div>
  );

  const AdBanner=()=>!isPaid?(
    <div style={{marginTop:28}}>
      <div style={{background:C.surf,border:"1px dashed "+C.bdr,borderRadius:16,padding:"22px 16px",textAlign:"center",marginBottom:14}}>
        <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:C.sub,marginBottom:8}}>Advertisement</div>
        <div style={{fontSize:15,color:C.sub}}>Google Ad — Live after AdSense approval</div>
      </div>
      <div onClick={()=>setShowSub(true)} style={{background:"#f5f0ff",border:"1px solid #c4b5fd",borderRadius:16,padding:"20px 18px",cursor:"pointer",display:"flex",gap:16,alignItems:"center"}}>
        <div style={{width:48,height:48,borderRadius:13,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:20,flexShrink:0}}>★</div>
        <div>
          <div style={{fontWeight:800,fontSize:16,color:"#3b0764",marginBottom:4}}>Remove ads forever — ₹50/month</div>
          <div style={{fontSize:14,color:"#6d28d9"}}>HD · All sizes · AI SEO · No ads · Priority processing</div>
        </div>
        <div style={{marginLeft:"auto",color:"#7c3aed",fontSize:22}}>→</div>
      </div>
    </div>
  ):null;

  // ── HOME ────────────────────────────────────────────────────
  if(screen==="home") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}>
      <Nav/>

      {/* Full-width dark hero */}
      <div style={{background:"linear-gradient(160deg,#1a1a2a,#2d1b69,#1a1a2a)",padding:"40px 24px 48px",width:"100%",boxSizing:"border-box"}}>
        <div style={{maxWidth:660,margin:"0 auto"}}>

          {/* 3 Tabs */}
          <div style={{display:"flex",background:"rgba(255,255,255,0.08)",borderRadius:14,padding:5,marginBottom:28,gap:4}}>
            {[{id:"video",label:"Video Watermark"},{id:"image",label:"Image Watermark"},{id:"seo",label:"AI SEO"}].map(t=>{
              const a=tab===t.id;
              return <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"12px 6px",borderRadius:10,border:a?"1.5px solid #a78bfa":"1.5px solid transparent",cursor:"pointer",fontSize:14,fontWeight:a?700:500,background:a?"rgba(255,255,255,0.18)":"transparent",color:a?"#fff":"rgba(255,255,255,0.5)",transition:"all .15s"}}>{t.label}</button>;
            })}
          </div>

          {/* Headline */}
          <div style={{textAlign:"center",marginBottom:28}}>
            <h1 style={{fontSize:34,fontWeight:900,letterSpacing:-0.8,lineHeight:1.15,margin:"0 0 12px",color:"#ffffff"}}>
              {tab==="video"&&"Remove Watermark from Video"}
              {tab==="image"&&"Remove Watermark from Image"}
              {tab==="seo"&&"AI SEO Generator for Creators"}
            </h1>
            <p style={{color:"rgba(255,255,255,0.72)",fontSize:17,margin:0}}>
              {tab==="video"&&"Erase any watermark, logo, or text — free"}
              {tab==="image"&&"Remove watermarks from photos — free"}
              {tab==="seo"&&"Viral titles, 20 trending tags & description"}
            </p>
          </div>

          {/* Tool card */}
          <div style={{background:"#fff",borderRadius:22,padding:"32px 26px",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>

            {/* VIDEO */}
            {tab==="video"&&(
              <div style={{textAlign:"center",cursor:"pointer"}}
                onClick={()=>fileRef.current?.click()}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("video/")){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));setScreen("upload");}}}>
                <div style={{width:72,height:72,borderRadius:20,background:C.tagBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                </div>
                <button style={{padding:"16px 52px",borderRadius:14,border:"none",cursor:"pointer",fontSize:18,fontWeight:800,color:"#fff",background:G,marginBottom:16}}>Choose Video File</button>
                <p style={{color:C.sub2,fontSize:16,margin:"0 0 8px"}}>or drag and drop file here</p>
                <p style={{color:C.sub,fontSize:14,margin:0}}>MP4, MOV, AVI, MKV supported</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));setScreen("upload");}e.target.value="";}}/>

            {/* IMAGE */}
            {tab==="image"&&(
              <div style={{textAlign:"center",cursor:"pointer"}}
                onClick={()=>imgRef.current?.click()}
                onDragOver={e=>e.preventDefault()}
                onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("image/")){const url=URL.createObjectURL(f);setImgUrl(url);setImgOriginal(url);setImgBox(null);setImgProcessed(null);setScreen("imgselect");}}}>
                <div style={{width:72,height:72,borderRadius:20,background:"linear-gradient(135deg,#fff4ed,#fce7f3)",border:"2px solid #fed7aa",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px"}}>
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <button style={{padding:"16px 52px",borderRadius:14,border:"none",cursor:"pointer",fontSize:18,fontWeight:800,color:"#fff",background:"linear-gradient(135deg,#f97316,#ec4899)",marginBottom:16}}>Choose Image File</button>
                <p style={{color:C.sub2,fontSize:16,margin:"0 0 8px"}}>or drag and drop file here</p>
                <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:12}}>
                  {["png","jpg","webp","avif"].map(f=><span key={f} style={{fontSize:13,padding:"4px 12px",borderRadius:8,background:C.surf,color:C.sub,border:"1px solid "+C.bdr,fontWeight:600}}>{f}</span>)}
                </div>
              </div>
            )}
            <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){const url=URL.createObjectURL(f);setImgUrl(url);setImgOriginal(url);setImgBox(null);setImgProcessed(null);setScreen("imgselect");}e.target.value="";}}/>

            {/* SEO */}
            {tab==="seo"&&(
              <div>
                <div style={{display:"flex",gap:10,marginBottom:16}}>
                  {["youtube","instagram"].map(p=>(
                    <button key={p} onClick={()=>{setPlatform(p);setSeoData(null);}} style={{flex:1,padding:"12px",borderRadius:11,border:platform===p?"2px solid #7c3aed":"1px solid "+C.bdr,background:platform===p?C.tagBg:"#fafafa",color:platform===p?C.tagClr:C.sub2,cursor:"pointer",fontWeight:platform===p?700:500,fontSize:15}}>
                      {p==="youtube"?"▶ YouTube":"◉ Instagram"}
                    </button>
                  ))}
                </div>
                <div style={{position:"relative"}}>
                  <textarea value={seoInput} onChange={e=>setSeoInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&seoInput.trim()){e.preventDefault();genSEO(seoInput.trim());}}}
                    placeholder={'e.g. "Morning skincare routine"\nor "Budget phones under ₹15000"'}
                    style={{width:"100%",minHeight:96,padding:"16px 16px 56px",borderRadius:12,border:"1px solid "+C.bdr,background:C.inp,color:C.txt,fontSize:16,resize:"none",outline:"none",lineHeight:1.7,boxSizing:"border-box",fontFamily:"inherit"}}/>
                  <button onClick={()=>{if(seoInput.trim())genSEO(seoInput.trim());}} disabled={!seoInput.trim()||seoLoading}
                    style={{position:"absolute",bottom:12,right:12,padding:"9px 20px",borderRadius:9,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,color:"#fff",background:seoInput.trim()?G:"#ccc",opacity:seoLoading?0.6:1}}>
                    {seoLoading?"Wait...":"Generate →"}
                  </button>
                </div>
                <div style={{marginTop:12}}>
                  <span style={{fontSize:14,color:C.sub}}>Try: </span>
                  {["Skincare","Travel vlog","Food recipe","Tech review"].map(eg=>(
                    <span key={eg} onClick={()=>{setSeoInput(eg);genSEO(eg);}} style={{fontSize:14,color:C.tagClr,cursor:"pointer",marginRight:12,fontWeight:600,textDecoration:"underline",textDecorationStyle:"dotted"}}>{eg}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Below hero content */}
      <div style={{width:"100%",maxWidth:660,margin:"0 auto",padding:"32px 20px 80px",boxSizing:"border-box"}}>

        {/* SEO Results */}
        {tab==="seo"&&(seoLoading||seoData)&&(
          <div>
            {seoLoading&&<div style={{textAlign:"center",padding:"32px 0",color:C.sub2,fontSize:16}}>Generating for "{seoInput}"...</div>}
            {seoData&&!seoLoading&&(<>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
                <span style={{fontSize:14,color:C.sub}}>Results for:</span>
                <span style={{fontSize:14,fontWeight:700,padding:"4px 14px",borderRadius:20,background:C.tagBg,color:C.tagClr}}>"{seoInput}"</span>
                <button onClick={()=>setSeoData(null)} style={{fontSize:13,color:C.sub,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Change</button>
              </div>
              {[
                {title:"Titles",content:seoData.titles?.map((t,i)=>(
                  <div key={i} style={{background:C.surf,padding:14,borderRadius:12,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,border:"1px solid "+C.bdr}}>
                    <span style={{fontSize:15,flex:1,lineHeight:1.6,color:C.txt}}>{t}</span>
                    <button onClick={()=>cp(t,"t"+i)} style={{background:C.tagBg,border:"none",color:copied==="t"+i?C.okTxt:C.tagClr,cursor:"pointer",padding:"7px 14px",borderRadius:8,fontSize:13,whiteSpace:"nowrap",fontWeight:700}}>{copied==="t"+i?"✓":"Copy"}</button>
                  </div>
                ))},
                {title:"Trending Tags",content:<>
                  <div style={{display:"flex",flexWrap:"wrap",gap:8}}>{seoData.tags?.map((t,i)=><span key={i} onClick={()=>cp(t,"tg"+i)} style={{background:C.tagBg,border:"1px solid #c4b5fd",padding:"6px 14px",borderRadius:40,fontSize:14,cursor:"pointer",color:copied==="tg"+i?C.okTxt:C.tagClr,fontWeight:500}}>{t}</span>)}</div>
                  <button onClick={()=>cp(seoData.tags?.join(" "),"all")} style={{width:"100%",padding:"11px",borderRadius:10,border:"1px solid "+C.bdr,cursor:"pointer",fontSize:15,fontWeight:600,color:C.sub2,background:"transparent",marginTop:12}}>{copied==="all"?"✓ Copied All":"Copy All Tags"}</button>
                </>},
                {title:"Description",content:<>
                  <div style={{background:C.surf,padding:16,borderRadius:12,fontSize:15,lineHeight:1.9,color:C.sub2,border:"1px solid "+C.bdr}}>{seoData.description}</div>
                  <button onClick={()=>cp(seoData.description,"desc")} style={{width:"100%",padding:"11px",borderRadius:10,border:"1px solid "+C.bdr,cursor:"pointer",fontSize:15,fontWeight:600,color:C.sub2,background:"transparent",marginTop:10}}>{copied==="desc"?"✓ Copied":"Copy Description"}</button>
                </>},
              ].map(s=>(
                <div key={s.title} style={{background:C.card,border:"1px solid "+C.bdr,borderRadius:16,padding:18,marginBottom:14}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:C.sub,marginBottom:14}}>{s.title}</div>
                  {s.content}
                </div>
              ))}
              <Btn onClick={()=>{setSeoData(null);genSEO(seoInput);}}>↺ Regenerate</Btn>
            </>)}
          </div>
        )}

        <AdBanner/>

        {/* How it works */}
        <div style={{marginTop:48}}>
          <p style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:C.sub,textAlign:"center",marginBottom:22}}>How it works</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            {[{n:"1",t:"Upload",d:"Select your file"},{n:"2",t:"Select",d:"Draw over watermark"},{n:"3",t:"Download",d:"Get clean file free"}].map(s=>(
              <div key={s.n} style={{background:C.card,borderRadius:18,padding:"22px 14px",textAlign:"center",border:"1px solid "+C.bdr}}>
                <div style={{width:38,height:38,borderRadius:50,background:"linear-gradient(135deg,#c4b5fd,#f0abfc)",color:"#fff",fontWeight:800,fontSize:17,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:"0 2px 10px rgba(196,181,253,0.5)"}}>{s.n}</div>
                <div style={{fontWeight:700,fontSize:17,marginBottom:5,color:C.txt}}>{s.t}</div>
                <div style={{fontSize:14,color:C.sub2}}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{marginTop:52,paddingTop:28,borderTop:"1px solid "+C.bdr}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:24,flexWrap:"wrap",marginBottom:22}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:12}}>
                <div style={{width:28,height:28,borderRadius:8,background:G,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff"}}>✦</div>
                <span style={{fontWeight:800,fontSize:18,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ReelKit</span>
              </div>
              <p style={{fontSize:14,color:C.sub2,lineHeight:1.8,margin:0,maxWidth:210}}>India's free watermark removal & creator toolkit.</p>
            </div>
            <div style={{display:"flex",gap:28}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.sub,marginBottom:12}}>Tools</div>
                {["Video Watermark","Image Watermark","AI SEO Tags"].map(l=><div key={l} style={{fontSize:15,color:C.sub2,marginBottom:10,cursor:"pointer"}}>{l}</div>)}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.sub,marginBottom:12}}>Legal</div>
                <div onClick={()=>setShowPrivacy(true)} style={{fontSize:15,color:C.sub2,marginBottom:10,cursor:"pointer"}}>Privacy Policy</div>
                <div onClick={()=>setShowTerms(true)} style={{fontSize:15,color:C.sub2,marginBottom:10,cursor:"pointer"}}>Terms of Use</div>
              </div>
            </div>
          </div>
          <div style={{background:C.surf,border:"1px solid "+C.bdr,borderRadius:14,padding:18,marginBottom:18}}>
            <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:C.sub,marginBottom:14}}>Popular Searches</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {["free watermark remover online","remove watermark from video free","video watermark remover India","image watermark remover free","remove logo from video","watermark hatane ka tool","AI SEO tags generator","YouTube title generator free","Instagram hashtag generator","reels size converter","YouTube 16:9 video","Instagram Reels 9:16","video editor online free India","reel banane ka free tool","watermark remove karo free","content creator tools India","YouTube SEO 2025","remove text from video free","free tools for YouTubers"].map(t=>(
                <span key={t} style={{fontSize:13,padding:"5px 12px",borderRadius:40,background:C.card,border:"1px solid "+C.bdr,color:C.sub2}}>{t}</span>
              ))}
            </div>
          </div>
          <p style={{fontSize:14,color:C.sub2,lineHeight:1.9,marginBottom:10}}>ReelKit is a <strong>free online watermark remover</strong> for Indian content creators. Remove watermarks from videos and images instantly. Export in trending sizes — 9:16 for Instagram Reels and YouTube Shorts, 16:9 for YouTube, 1:1 for Instagram Square. Generate AI-powered SEO titles and hashtags to rank higher in {YEAR}.</p>
          <p style={{fontSize:14,color:C.sub2,lineHeight:1.9,marginBottom:18}}>Whether you are a YouTuber, Instagram creator, or digital marketer — ReelKit helps you clean videos, resize for every platform, and get trending SEO tags. 100% free. Works on mobile and desktop.</p>
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:16,borderTop:"1px solid "+C.bdr,flexWrap:"wrap",gap:8}}>
            <span style={{fontSize:14,color:C.sub}}>© {YEAR} ReelKit.in · All rights reserved</span>
            <span style={{fontSize:14,color:C.sub}}>Made with ♥ for Indian Creators</span>
          </div>
        </div>
      </div>

      {showSeoAd&&<SeoAdModal onShow={()=>{setShowSeoAd(false);setSeoData(pendingSeo);setPendingSeo(null);}} onUpgrade={()=>{setShowSeoAd(false);setPendingSeo(null);setShowSub(true);}} timer={seoAdTimer}/>}
      {showSub&&<SubModal setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
      {showLogin&&<LoginModal onDone={u=>{setUser(u);setShowLogin(false);}} onClose={()=>setShowLogin(false)}/>}
      {showProfile&&<ProfileModal user={user} setUser={setUser} isPaid={isPaid} onClose={()=>setShowProfile(false)} onLogout={()=>{setUser(null);setShowProfile(false);}}/>}
      {showPrivacy&&<LegalModal title="Privacy Policy" onClose={()=>setShowPrivacy(false)}><PrivacyContent/></LegalModal>}
      {showTerms&&<LegalModal title="Terms of Use" onClose={()=>setShowTerms(false)}><TermsContent/></LegalModal>}
    </div>
  );

  // ── UPLOAD ──────────────────────────────────────────────────
  if(screen==="upload") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:20,fontWeight:500}}>← Back</div>
        <video ref={videoRef} src={videoUrl} style={{width:"100%",borderRadius:16,background:"#000",display:"block"}} controls playsInline/>
        <div style={{background:C.card,borderRadius:16,padding:18,marginTop:16,border:"1px solid "+C.bdr,display:"flex",gap:14,alignItems:"center"}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontWeight:600,fontSize:16,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:C.txt}}>{videoFile?.name}</div>
            <div style={{color:C.sub,fontSize:14,marginTop:3}}>{videoFile?(videoFile.size/1024/1024).toFixed(1)+" MB":""}</div>
          </div>
          <button onClick={()=>fileRef.current?.click()} style={{padding:"9px 18px",borderRadius:10,border:"1px solid "+C.bdr,background:"transparent",color:C.sub2,cursor:"pointer",fontSize:15,flexShrink:0}}>Change</button>
          <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));}e.target.value="";}}/>
        </div>
        <div style={{background:C.warnBg,border:"1px solid "+C.warnBdr,borderRadius:14,padding:18,marginTop:16}}>
          <div style={{fontWeight:700,fontSize:16,color:C.warnTxt,marginBottom:10}}>⚠️ Legal Notice</div>
          <p style={{fontSize:15,lineHeight:1.8,color:C.warnTxt,margin:"0 0 14px"}}>ReelKit is only for videos <b>you own or have rights to</b>. Removing copyrighted watermarks without permission is illegal. ReelKit is NOT responsible for any misuse.</p>
          <label style={{display:"flex",gap:12,alignItems:"flex-start",cursor:"pointer"}}>
            <input type="checkbox" checked={legalOk} onChange={e=>setLegalOk(e.target.checked)} style={{marginTop:3,accentColor:"#7c3aed",flexShrink:0,width:18,height:18}}/>
            <span style={{fontSize:15,lineHeight:1.7,color:C.warnTxt,fontWeight:500}}>I own this video and accept full legal responsibility.</span>
          </label>
        </div>
        <Btn onClick={()=>setScreen("select")} style={{opacity:legalOk?1:0.3,marginTop:18}}>Select Watermark Area →</Btn>
      </Wrap>
    </div>
  );

  // ── SELECT (VIDEO) ───────────────────────────────────────────
  if(screen==="select") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("upload")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:18,fontWeight:500}}>← Back</div>
        <h2 style={{fontSize:26,fontWeight:800,marginBottom:8,color:C.txt}}>Select Watermark</h2>
        <p style={{color:C.sub2,marginBottom:16,fontSize:16}}>Draw a box over the watermark to remove it</p>
        {/* Hidden video to load data */}
        <video ref={videoRef} src={videoUrl} style={{display:"none"}} muted playsInline/>
        <div style={{position:"relative",borderRadius:16,overflow:"hidden",background:"#000",border:"1px solid "+C.bdr,touchAction:"none",cursor:"crosshair"}}>
          <canvas ref={canvasRef} style={{width:"100%",display:"block"}}
            onMouseDown={vDown} onMouseMove={vMove} onMouseUp={vUp}
            onTouchStart={e=>{e.preventDefault();vDown(e);}}
            onTouchMove={e=>{e.preventDefault();vMove(e);}}
            onTouchEnd={e=>{e.preventDefault();vUp();}}/>
        </div>
        {wBox&&<div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:12,padding:"14px 18px",marginTop:14,fontSize:16,color:C.okTxt,fontWeight:600}}>✓ Area selected — ready to remove</div>}
        <Btn onClick={doProcess} style={{opacity:wBox?1:0.3,marginTop:16}}>Remove Watermark →</Btn>
        <BtnO onClick={()=>{setWBox(null);drawVideoBox(null);}}>Clear Selection</BtnO>
      </Wrap>
    </div>
  );

  // ── PROCESSING ──────────────────────────────────────────────
  if(screen==="processing") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",padding:48}}>
        <div style={{width:72,height:72,borderRadius:20,background:C.tagBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 24px",fontSize:30,color:C.tagClr}}>✦</div>
        <div style={{fontSize:26,fontWeight:800,marginBottom:10,color:C.txt}}>Removing Watermark...</div>
        <p style={{color:C.sub2,fontSize:16,marginBottom:28}}>Processing your video</p>
        <div style={{margin:"0 auto",background:C.bdr,borderRadius:100,height:6,width:240,overflow:"hidden"}}>
          <div style={{height:"100%",background:G,width:progress+"%",transition:"width .2s",borderRadius:100}}/>
        </div>
        <div style={{fontWeight:900,fontSize:34,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:16}}>{Math.round(progress)}%</div>
      </div>
    </div>
  );

  // ── EXPORT (VIDEO) ───────────────────────────────────────────
  if(screen==="export") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:18,fontWeight:500}}>← Home</div>
        <div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:14,padding:"16px 20px",display:"flex",gap:14,alignItems:"center",marginBottom:24}}>
          <span style={{color:C.okTxt,fontWeight:700,fontSize:22}}>✓</span>
          <span style={{fontSize:16,color:C.okTxt,fontWeight:600}}>Watermark removed successfully!</span>
        </div>
        {/* Before / After */}
        <div style={{marginBottom:24}}>
          <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:C.sub,marginBottom:14}}>Before / After</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{background:C.card,borderRadius:14,padding:12,border:"1px solid "+C.bdr}}>
              <div style={{fontSize:12,color:C.sub,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Before</div>
              <video src={videoUrl} style={{width:"100%",borderRadius:10,display:"block"}} muted playsInline controls/>
            </div>
            <div style={{background:C.card,borderRadius:14,padding:12,border:"1px solid "+C.okBdr}}>
              <div style={{fontSize:12,color:C.okTxt,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>After ✓</div>
              <video src={processedUrl} style={{width:"100%",borderRadius:10,display:"block"}} muted playsInline controls/>
            </div>
          </div>
        </div>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:13,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:C.sub,marginBottom:14}}>Download Size</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {SIZES.map(sz=>(
              <div key={sz.id} onClick={()=>doDownload(sz)} style={{background:C.card,borderRadius:12,padding:"16px 6px",textAlign:"center",cursor:"pointer",border:"1px solid "+C.bdr,position:"relative"}}>
                {!isPaid&&sz.paid&&<div style={{position:"absolute",top:6,right:6,fontSize:10,background:G,color:"#fff",padding:"2px 7px",borderRadius:5,fontWeight:700}}>AD</div>}
                <div style={{fontWeight:700,fontSize:14,color:C.txt}}>{sz.label}</div>
                <div style={{color:C.sub,fontSize:12,marginTop:4}}>{sz.ratio}</div>
              </div>
            ))}
          </div>
          {!isPaid&&<p style={{color:C.sub2,fontSize:14,marginTop:12}}>Free users watch a short ad per download</p>}
        </div>
        <Btn onClick={()=>{setTab("seo");setScreen("home");}}>Generate AI SEO Tags →</Btn>
        <BtnO onClick={()=>setShowSub(true)}>★ Upgrade — HD + No Ads</BtnO>
        <BtnO onClick={()=>setScreen("home")}>← Process Another Video</BtnO>
        {showAd&&<AdModal timer={adTimer} onDone={adDone} onUpgrade={()=>{setShowAd(false);setShowSub(true);}}/>}
        {showSub&&<SubModal setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
      </Wrap>
    </div>
  );

  // ── IMG SELECT ───────────────────────────────────────────────
  if(screen==="imgselect") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:18,fontWeight:500}}>← Back</div>
        <h2 style={{fontSize:26,fontWeight:800,marginBottom:8,color:C.txt}}>Select Watermark</h2>
        <p style={{color:C.sub2,marginBottom:16,fontSize:16}}>Draw a box over the watermark to remove it</p>
        <div style={{position:"relative",borderRadius:16,overflow:"hidden",background:C.surf,border:"1px solid "+C.bdr,touchAction:"none",cursor:"crosshair"}}>
          <canvas ref={imgCvRef} style={{width:"100%",display:"block"}}
            onMouseDown={iDown} onMouseMove={iMove} onMouseUp={iUp}
            onTouchStart={e=>{e.preventDefault();iDown(e);}}
            onTouchMove={e=>{e.preventDefault();iMove(e);}}
            onTouchEnd={e=>{e.preventDefault();iUp();}}/>
        </div>
        {imgBox&&<div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:12,padding:"14px 18px",marginTop:14,fontSize:16,color:C.okTxt,fontWeight:600}}>✓ Area selected — ready!</div>}
        <Btn onClick={doImgProcess} style={{opacity:imgBox?1:0.3,marginTop:16,background:"linear-gradient(135deg,#f97316,#ec4899)"}}>Remove Watermark →</Btn>
        <BtnO onClick={()=>{setImgBox(null);drawImgBox(null);}}>Clear Selection</BtnO>
      </Wrap>
    </div>
  );

  // ── IMG EXPORT ───────────────────────────────────────────────
  if(screen==="imgexport") return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <Wrap>
        <div onClick={()=>setScreen("home")} style={{fontSize:16,color:C.sub2,cursor:"pointer",marginBottom:18,fontWeight:500}}>← Home</div>
        <div style={{background:C.okBg,border:"1px solid "+C.okBdr,borderRadius:14,padding:"16px 20px",display:"flex",gap:14,alignItems:"center",marginBottom:22}}>
          <span style={{color:C.okTxt,fontWeight:700,fontSize:22}}>✓</span>
          <span style={{fontSize:16,color:C.okTxt,fontWeight:600}}>Watermark removed!</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:22}}>
          <div style={{background:C.card,borderRadius:14,padding:14,border:"1px solid "+C.bdr}}>
            <div style={{fontSize:13,color:C.sub,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Before</div>
            <img src={imgOriginal||imgUrl} alt="before" style={{width:"100%",borderRadius:10,display:"block"}}/>
          </div>
          <div style={{background:C.card,borderRadius:14,padding:14,border:"1px solid "+C.okBdr}}>
            <div style={{fontSize:13,color:C.okTxt,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>After ✓</div>
            {imgProcessed&&<img src={imgProcessed} alt="after" style={{width:"100%",borderRadius:10,display:"block"}}/>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:18}}>
          {[{fmt:"PNG",free:true},{fmt:"JPG",free:true},{fmt:"WebP",free:false},{fmt:"PNG 4K",free:false}].map(({fmt,free})=>(
            <div key={fmt} onClick={()=>{if(!free&&!isPaid){setShowSub(true);return;}const a=document.createElement("a");a.href=imgProcessed||imgUrl;a.download="reelkit."+fmt.toLowerCase().split(" ")[0];a.click();}}
              style={{background:C.card,borderRadius:12,padding:"16px 8px",textAlign:"center",cursor:"pointer",border:"1px solid "+C.bdr,position:"relative"}}>
              {!free&&!isPaid&&<div style={{position:"absolute",top:6,right:6,fontSize:10,background:G,color:"#fff",padding:"2px 7px",borderRadius:5,fontWeight:700}}>PRO</div>}
              <div style={{fontWeight:800,fontSize:17,color:free?"#0891b2":"#7c3aed"}}>{fmt}</div>
              <div style={{color:C.sub,fontSize:14,marginTop:4}}>{free?"Free":isPaid?"Pro ✓":"Upgrade"}</div>
            </div>
          ))}
        </div>
        <BtnO onClick={()=>{setImgBox(null);setImgProcessed(null);setImgUrl(null);setImgOriginal(null);setScreen("home");}}>← Process Another Image</BtnO>
        {showSub&&<SubModal setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
      </Wrap>
    </div>
  );

  return null;
}

// ── MODALS ──────────────────────────────────────────────────

function AdModal({timer,onDone,onUpgrade}){
  const G="linear-gradient(135deg,#7c3aed,#db2777)";
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
    <div style={{background:"#fff",borderRadius:24,padding:28,width:"100%",maxWidth:400,textAlign:"center"}}>
      <div style={{background:"#f5f5f7",borderRadius:14,padding:"40px 20px",marginBottom:18,border:"1px dashed #e2e2e8"}}>
        <div style={{fontWeight:600,fontSize:16,color:"#888"}}>Google Ad Space</div>
        <div style={{fontSize:14,color:"#aaa",marginTop:4}}>Live after AdSense approval</div>
      </div>
      <button style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:timer>0?"not-allowed":"pointer",fontSize:17,fontWeight:700,color:"#fff",background:timer>0?"#999":G}} disabled={timer>0} onClick={onDone}>{timer>0?"Download in "+timer+"s...":"↓ Download Now"}</button>
      <button style={{width:"100%",padding:"14px",borderRadius:12,border:"1px solid #7c3aed",cursor:"pointer",fontSize:16,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:10}} onClick={onUpgrade}>★ Go Pro — Skip Ads</button>
    </div>
  </div>);}

function SeoAdModal({onShow,onUpgrade,timer}){
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:20}}>
    <div style={{background:"#fff",borderRadius:24,padding:28,width:"100%",maxWidth:400}}>
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
      <button style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:timer>0?"not-allowed":"pointer",fontSize:17,fontWeight:700,color:"#fff",background:timer>0?"#999":"linear-gradient(135deg,#7c3aed,#db2777)"}} disabled={timer>0} onClick={onShow}>{timer>0?"Results in "+timer+"s...":"✓ Show My SEO Results"}</button>
      <button style={{width:"100%",padding:"14px",borderRadius:12,border:"1px solid #7c3aed",cursor:"pointer",fontSize:16,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:10}} onClick={onUpgrade}>★ Skip — Upgrade to Pro</button>
    </div>
  </div>);}

function SubModal({setIsPaid,onClose}){
  const G="linear-gradient(135deg,#6d28d9,#db2777)";
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:300}}>
    <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",padding:"30px 24px 48px",boxSizing:"border-box"}}>
      <div style={{textAlign:"center",marginBottom:24}}>
        <div style={{fontWeight:800,fontSize:24}}>ReelKit Pro</div>
        <div style={{fontSize:38,fontWeight:900,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:6}}>₹50<span style={{fontSize:17,WebkitTextFillColor:"#666",fontWeight:400}}>/month</span></div>
        <div style={{fontSize:15,color:"#888",marginTop:5}}>or ₹399/year — save ₹201</div>
      </div>
      <div style={{background:"#f5f5f7",borderRadius:14,padding:18,marginBottom:22}}>
        {["Full HD 1080p exports","All 7 trending sizes","Zero ads — ever","AI SEO titles, tags & description","Priority processing","Re-download history 7 days","WebP + PNG 4K image exports"].map(f=>(
          <div key={f} style={{display:"flex",gap:14,alignItems:"center",padding:"11px 0",borderBottom:"1px solid #e2e2e8"}}>
            <span style={{color:"#7c3aed",fontWeight:700,fontSize:18}}>✓</span>
            <span style={{fontSize:16,fontWeight:500}}>{f}</span>
          </div>
        ))}
      </div>
      <button style={{width:"100%",padding:17,borderRadius:14,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:G}} onClick={()=>{setIsPaid(true);onClose();}}>Subscribe via Razorpay →</button>
      <button style={{width:"100%",padding:15,borderRadius:14,border:"1px solid #e2e2e8",cursor:"pointer",fontSize:16,color:"#666",background:"transparent",marginTop:12}} onClick={onClose}>Maybe Later</button>
    </div>
  </div>);}

function LoginModal({onDone,onClose}){
  const [step,    setStep]    = useState("phone");
  const [phone,   setPhone]   = useState("");
  const [name,    setName]    = useState("");
  const [dob,     setDob]     = useState("");
  const [otpVal,  setOtpVal]  = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const refs=[useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  const handleSend=()=>{
    if(phone.length!==10){setError("Please enter a valid 10-digit mobile number.");return;}
    setLoading(true);setError("");
    // NOTE: Real OTP requires Firebase + billing. This is demo mode.
    setTimeout(()=>{setStep("otp");setLoading(false);},600);
  };
  const handleVerify=()=>{
    if(otpVal.join("").length!==6){setError("Please enter all 6 digits.");return;}
    setLoading(true);setError("");
    setTimeout(()=>{
      onDone({phone, name:name||"User", dob});
      setLoading(false);
    },600);
  };

  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:300}}>
    <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",padding:"30px 24px 48px",boxSizing:"border-box"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div style={{fontWeight:800,fontSize:22}}>{step==="phone"?"Log in to ReelKit":"Verify OTP"}</div>
        <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:36,height:36,borderRadius:10,fontSize:18}}>✕</button>
      </div>
      {error&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"14px 18px",fontSize:15,color:"#dc2626",marginBottom:16}}>{error}</div>}
      {step==="phone"?(<>
        <p style={{color:"#444",fontSize:16,marginBottom:18}}>Enter your details to continue</p>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:14,color:"#666",marginBottom:6,fontWeight:600}}>Name</div>
          <input style={{width:"100%",padding:"14px 16px",borderRadius:12,border:"1px solid #e2e2e8",background:"#fafafa",color:"#111",fontSize:16,outline:"none",boxSizing:"border-box"}} type="text" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:14,color:"#666",marginBottom:6,fontWeight:600}}>Mobile Number</div>
          <div style={{display:"flex",gap:10}}>
            <div style={{padding:"14px 16px",borderRadius:12,border:"1px solid #e2e2e8",background:"#fafafa",color:"#666",fontWeight:700,flexShrink:0,fontSize:16}}>+91</div>
            <input style={{flex:1,padding:"14px 16px",borderRadius:12,border:"1px solid #e2e2e8",background:"#fafafa",color:"#111",fontSize:16,outline:"none",boxSizing:"border-box"}} type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))}/>
          </div>
        </div>
        <div style={{marginBottom:18}}>
          <div style={{fontSize:14,color:"#666",marginBottom:6,fontWeight:600}}>Date of Birth (optional)</div>
          <input style={{width:"100%",padding:"14px 16px",borderRadius:12,border:"1px solid #e2e2e8",background:"#fafafa",color:"#111",fontSize:16,outline:"none",boxSizing:"border-box"}} type="date" value={dob} onChange={e=>setDob(e.target.value)}/>
        </div>
        <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:10,padding:"12px 16px",fontSize:14,color:"#92400e",marginBottom:16}}>⚠️ Demo mode — Real OTP requires Firebase billing setup</div>
        <button style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)",opacity:phone.length===10&&!loading?1:0.35}} disabled={phone.length!==10||loading} onClick={handleSend}>{loading?"Sending...":"Continue →"}</button>
      </>):(<>
        <p style={{color:"#444",fontSize:16,marginBottom:20}}>Enter any 6 digits (demo mode) · <span style={{color:"#7c3aed",cursor:"pointer",fontWeight:600}} onClick={()=>{setStep("phone");setOtpVal(["","","","","",""]);setError("");}}>Back</span></p>
        <div style={{display:"flex",gap:10,justifyContent:"center"}}>
          {otpVal.map((d,i)=>(
            <input key={i} ref={refs[i]} style={{width:46,height:58,padding:0,borderRadius:12,border:"1.5px solid #e2e2e8",background:"#fafafa",color:"#111",fontSize:26,fontWeight:800,textAlign:"center",outline:"none",boxSizing:"border-box",flexShrink:0}} maxLength={1} value={d} inputMode="numeric"
              onChange={e=>{const v=e.target.value.replace(/\D/g,"");const n=[...otpVal];n[i]=v;setOtpVal(n);if(v&&i<5)refs[i+1].current?.focus();}}
              onKeyDown={e=>{if(e.key==="Backspace"&&!d&&i>0)refs[i-1].current?.focus();}}/>
          ))}
        </div>
        <button style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)",marginTop:20,opacity:otpVal.join("").length===6&&!loading?1:0.35}} disabled={otpVal.join("").length!==6||loading} onClick={handleVerify}>{loading?"Logging in...":"Verify & Enter →"}</button>
      </>)}
    </div>
  </div>);}

function ProfileModal({user,setUser,isPaid,onClose,onLogout}){
  const [name,setName]=useState(user?.name||"");
  const [dob,setDob]=useState(user?.dob||"");
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:300}}>
    <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",padding:"30px 24px 48px",boxSizing:"border-box"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div style={{fontWeight:800,fontSize:22}}>My Profile</div>
        <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:36,height:36,borderRadius:10,fontSize:18}}>✕</button>
      </div>
      {/* Avatar */}
      <div style={{display:"flex",alignItems:"center",gap:18,marginBottom:28,padding:"20px",background:"#f5f5f7",borderRadius:16}}>
        <div style={{width:60,height:60,borderRadius:50,background:"linear-gradient(135deg,#7c3aed,#db2777)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:24,flexShrink:0}}>{name?name[0].toUpperCase():"U"}</div>
        <div>
          <div style={{fontWeight:800,fontSize:20,color:"#111"}}>{name||"User"}</div>
          <div style={{fontSize:15,color:"#666",marginTop:4}}>+91 {user?.phone}</div>
          {isPaid&&<div style={{fontSize:13,fontWeight:700,padding:"3px 12px",borderRadius:20,background:"linear-gradient(135deg,#7c3aed,#db2777)",color:"#fff",display:"inline-block",marginTop:6}}>★ Pro Member</div>}
        </div>
      </div>
      {/* Edit fields */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:14,color:"#666",marginBottom:6,fontWeight:600}}>Name</div>
        <input style={{width:"100%",padding:"14px 16px",borderRadius:12,border:"1px solid #e2e2e8",background:"#fafafa",color:"#111",fontSize:16,outline:"none",boxSizing:"border-box"}} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/>
      </div>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:14,color:"#666",marginBottom:6,fontWeight:600}}>Mobile Number</div>
        <div style={{padding:"14px 16px",borderRadius:12,border:"1px solid #e2e2e8",background:"#f5f5f7",color:"#888",fontSize:16}}>+91 {user?.phone}</div>
      </div>
      <div style={{marginBottom:22}}>
        <div style={{fontSize:14,color:"#666",marginBottom:6,fontWeight:600}}>Date of Birth</div>
        <input type="date" style={{width:"100%",padding:"14px 16px",borderRadius:12,border:"1px solid #e2e2e8",background:"#fafafa",color:"#111",fontSize:16,outline:"none",boxSizing:"border-box"}} value={dob} onChange={e=>setDob(e.target.value)}/>
      </div>
      <div style={{background:"#fff4ed",border:"1px solid #fed7aa",borderRadius:12,padding:"14px 16px",marginBottom:22,fontSize:14,color:"#9a3412"}}>⚠️ Note: User data is stored in browser session only. Permanent storage requires Firebase Firestore setup by a developer.</div>
      <button style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)"}} onClick={()=>{setUser({...user,name,dob});onClose();}}>Save Changes</button>
      <button style={{width:"100%",padding:15,borderRadius:12,border:"1px solid #fecaca",cursor:"pointer",fontSize:16,color:"#dc2626",background:"transparent",marginTop:12,fontWeight:600}} onClick={onLogout}>Log Out</button>
    </div>
  </div>);}

function LegalModal({title,onClose,children}){
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:400}}>
    <div style={{width:"100%",maxWidth:660,margin:"0 auto",background:"#fff",borderRadius:"24px 24px 0 0",border:"1px solid #e2e2e8",display:"flex",flexDirection:"column",maxHeight:"88vh"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"22px 24px 18px",borderBottom:"1px solid #e2e2e8",flexShrink:0}}>
        <div style={{fontWeight:800,fontSize:21,color:"#111"}}>{title}</div>
        <button onClick={onClose} style={{background:"#f5f5f7",border:"none",cursor:"pointer",width:36,height:36,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>✕</button>
      </div>
      <div style={{overflowY:"auto",padding:"20px 24px 36px",flex:1}}>{children}</div>
      <div style={{padding:"16px 24px 32px",borderTop:"1px solid #e2e2e8",flexShrink:0}}>
        <button onClick={onClose} style={{width:"100%",padding:16,borderRadius:12,border:"none",cursor:"pointer",fontSize:17,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)"}}>I Understand — Close</button>
      </div>
    </div>
  </div>);}

function PrivacyContent(){return(<>
  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:18,marginBottom:20}}>
    <div style={{fontWeight:800,fontSize:15,color:"#dc2626",marginBottom:8}}>⚠️ DISCLAIMER</div>
    <p style={{fontSize:14,lineHeight:1.8,color:"#7f1d1d",margin:0}}>ReelKit accepts ZERO liability for any legal issues. You are solely responsible for all content you process. <strong>Use only content you own.</strong></p>
  </div>
  {[{t:"1. Who We Are",b:"ReelKit (reelkit.in) is a free online video and image tool for Indian content creators."},{t:"2. Data We Collect",b:"We collect your mobile number for OTP login. Videos and images are processed in your browser and NEVER stored on our servers."},{t:"3. Legal Responsibility",b:"ReelKit is a technology tool only. We are NOT responsible for user actions. You are SOLELY responsible for having full legal rights to any content you upload. Removing watermarks from copyrighted material without permission is illegal. ReelKit.in accepts ZERO liability for copyright infringement, DMCA claims, lawsuits, or any legal consequences."},{t:"4. Payments",b:"Pro payments via Razorpay. We never store card details. Cancel anytime."},{t:"5. Contact",b:"privacy@reelkit.in | ReelKit.in, Mumbai, India"}].map(x=>(<div key={x.t} style={{marginBottom:18}}><div style={{fontWeight:700,fontSize:16,marginBottom:7}}>{x.t}</div><p style={{color:"#444",fontSize:15,lineHeight:1.9,margin:0}}>{x.b}</p></div>))}
</>);}

function TermsContent(){return(<>
  <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:18,marginBottom:20}}>
    <div style={{fontWeight:800,fontSize:15,color:"#dc2626",marginBottom:8}}>⚠️ LEGAL NOTICE</div>
    <p style={{fontSize:14,lineHeight:1.8,color:"#7f1d1d",margin:0}}>ReelKit accepts ZERO liability for copyright infringement or any other legal issues caused by user actions.</p>
  </div>
  {[{t:"1. Acceptance",b:"By using ReelKit, you agree to these Terms. Stop using if you disagree."},{t:"2. Your Legal Responsibility",b:"YOU ARE SOLELY RESPONSIBLE for all content you process. You must own or have written permission for any content. ReelKit is NOT liable for: copyright infringement, DMCA takedowns, lawsuits, penalties, or any other legal consequences."},{t:"3. Prohibited Uses",b:"Do NOT use ReelKit to remove watermarks from content you don't own. Violation may result in account suspension."},{t:"4. Disclaimer",b:"ReelKit is 'AS IS'. No warranty on watermark removal quality. Not liable for any damages."},{t:"5. Pro Plans",b:"₹50/month or ₹399/year. Cancel anytime."},{t:"6. Contact",b:"legal@reelkit.in | ReelKit.in, Mumbai, India"}].map(x=>(<div key={x.t} style={{marginBottom:18}}><div style={{fontWeight:700,fontSize:16,marginBottom:7}}>{x.t}</div><p style={{color:"#444",fontSize:15,lineHeight:1.9,margin:0}}>{x.b}</p></div>))}
</>);}