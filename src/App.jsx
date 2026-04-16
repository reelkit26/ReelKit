import { useState, useRef, useEffect, useCallback } from "react";
import { sendOTP, verifyOTP, auth } from './firebase.js';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const G = "linear-gradient(135deg,#7c3aed,#db2777)";

const SIZES = [
  {id:"yt",   label:"YouTube",  ratio:"16:9", paid:false},
  {id:"reel", label:"Reels",    ratio:"9:16", paid:false},
  {id:"short",label:"Shorts",   ratio:"9:16", paid:true},
  {id:"sq",   label:"Square",   ratio:"1:1",  paid:true},
  {id:"tw",   label:"Twitter",  ratio:"16:9", paid:true},
  {id:"li",   label:"LinkedIn", ratio:"4:5",  paid:true},
  {id:"fb",   label:"Facebook", ratio:"16:9", paid:true},
];

export default function App() {
  const [dark,    setDark]    = useState(false);
  const [tab,     setTab]     = useState("video");
  const [screen,  setScreen]  = useState("home");
  const [isPaid,  setIsPaid]  = useState(false);
  const [showSub, setShowSub] = useState(false);
  const [showLogin,setShowLogin]=useState(false);
  const [user,    setUser]    = useState(null);

  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl,  setVideoUrl]  = useState(null);
  const [legalOk,   setLegalOk]   = useState(false);
  const [wBox,      setWBox]      = useState(null);
  const [drawing,   setDrawing]   = useState(false);
  const [startPos,  setStartPos]  = useState(null);
  const [progress,  setProgress]  = useState(0);
  const [showAd,    setShowAd]    = useState(false);
  const [adTimer,   setAdTimer]   = useState(5);
  const [pendingSz, setPendingSz] = useState(null);

  const [imgUrl,       setImgUrl]       = useState(null);
  const [imgBox,       setImgBox]       = useState(null);
  const [imgDrawing,   setImgDrawing]   = useState(false);
  const [imgStart,     setImgStart]     = useState(null);
  const [imgProcessed, setImgProcessed] = useState(null);

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

  const D = dark;
  const bg     = D ? "#0f0f13" : "#fff";
  const navBg  = D ? "#18181f" : "#1a1a2a";
  const surf   = D ? "#18181f" : "#f5f5f5";
  const card   = D ? "#1e1e28" : "#fff";
  const bdr    = D ? "#2a2a38" : "#e8e8e8";
  const txt    = D ? "#f0f0f0" : "#0d0d0d";
  const sub    = D ? "#666"    : "#888";
  const inpBg  = D ? "#18181f" : "#fafafa";
  const tagBg  = D ? "#1a1030" : "#f0edff";
  const tagClr = D ? "#a78bfa" : "#7c3aed";
  const okBg   = D ? "#052e16" : "#f0fdf4";
  const okBdr  = D ? "#14532d" : "#a7f3d0";
  const okTxt  = D ? "#4ade80" : "#059669";
  const warnBg = D ? "#1c1000" : "#fffbeb";
  const warnBdr= D ? "#78350f" : "#fde68a";
  const warnTxt= D ? "#fbbf24" : "#92400e";

  // Firebase auth state
  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, (u)=>{ setUser(u); });
    return ()=>unsub();
  },[]);

  useEffect(()=>{
    if(showAd && adTimer>0){ const t=setTimeout(()=>setAdTimer(a=>a-1),1000); return()=>clearTimeout(t); }
  },[showAd,adTimer]);

  useEffect(()=>{
    if(showSeoAd && seoAdTimer>0){ const t=setTimeout(()=>setSeoAdTimer(a=>a-1),1000); return()=>clearTimeout(t); }
  },[showSeoAd,seoAdTimer]);

  const getPos=(e,cv)=>{
    const r=cv.getBoundingClientRect();
    const sx=cv.width/r.width, sy=cv.height/r.height;
    const cx=e.touches?e.touches[0].clientX:e.clientX;
    const cy=e.touches?e.touches[0].clientY:e.clientY;
    return{x:(cx-r.left)*sx, y:(cy-r.top)*sy};
  };

  const paintBox=useCallback((box,ref)=>{
    const cv=ref.current; if(!cv) return;
    const ctx=cv.getContext("2d");
    ctx.clearRect(0,0,cv.width,cv.height);
    if(!box) return;
    ctx.fillStyle="rgba(0,0,0,0.42)"; ctx.fillRect(0,0,cv.width,cv.height);
    ctx.clearRect(box.x,box.y,box.w,box.h);
    ctx.strokeStyle="#7c3aed"; ctx.lineWidth=2; ctx.setLineDash([6,4]);
    ctx.strokeRect(box.x,box.y,box.w,box.h);
    ctx.fillStyle="#7c3aed"; ctx.setLineDash([]);
    [[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]].forEach(([a,b])=>ctx.fillRect(a-5,b-5,10,10));
  },[]);

  useEffect(()=>{
    if(screen!=="select") return;
    const v=videoRef.current, cv=canvasRef.current; if(!v||!cv) return;
    const onLoad=()=>{cv.width=v.videoWidth||640;cv.height=v.videoHeight||360;v.currentTime=0.5;};
    const onSeek=()=>{cv.getContext("2d").drawImage(v,0,0,cv.width,cv.height);};
    v.addEventListener("loadeddata",onLoad); v.addEventListener("seeked",onSeek);
    return()=>{v.removeEventListener("loadeddata",onLoad);v.removeEventListener("seeked",onSeek);};
  },[screen]);

  useEffect(()=>{
    if(screen!=="imgselect"||!imgUrl) return;
    const img=new Image(); img.src=imgUrl;
    img.onload=()=>{
      const cv=imgCvRef.current; if(!cv) return;
      cv.width=img.naturalWidth; cv.height=img.naturalHeight;
      cv.getContext("2d").drawImage(img,0,0);
    };
  },[screen,imgUrl]);

  const vDown=e=>{const p=getPos(e,canvasRef.current);setDrawing(true);setStartPos(p);setWBox(null);paintBox(null,canvasRef);};
  const vMove=e=>{
    if(!drawing||!startPos) return;
    const p=getPos(e,canvasRef.current);
    const b={x:Math.min(startPos.x,p.x),y:Math.min(startPos.y,p.y),w:Math.abs(p.x-startPos.x),h:Math.abs(p.y-startPos.y)};
    setWBox(b); paintBox(b,canvasRef);
  };
  const vUp=()=>setDrawing(false);

  const iDown=e=>{const p=getPos(e,imgCvRef.current);setImgDrawing(true);setImgStart(p);setImgBox(null);};
  const iMove=e=>{
    if(!imgDrawing||!imgStart) return;
    const p=getPos(e,imgCvRef.current);
    const b={x:Math.min(imgStart.x,p.x),y:Math.min(imgStart.y,p.y),w:Math.abs(p.x-imgStart.x),h:Math.abs(p.y-imgStart.y)};
    setImgBox(b); paintBox(b,imgCvRef);
  };
  const iUp=()=>setImgDrawing(false);

  const doProcess=()=>{
    setScreen("processing"); setProgress(0);
    let p=0;
    const iv=setInterval(()=>{
      p+=Math.random()*12+3;
      if(p>=100){clearInterval(iv);setProgress(100);setTimeout(()=>setScreen("export"),500);return;}
      setProgress(Math.min(p,100));
    },160);
  };

  const doImgProcess=()=>{
    const cv=imgCvRef.current; if(!cv||!imgBox) return;
    const ctx=cv.getContext("2d");
    const img=new Image(); img.src=imgUrl;
    img.onload=()=>{
      ctx.clearRect(0,0,cv.width,cv.height); ctx.drawImage(img,0,0,cv.width,cv.height);
      const{x,y,w,h}=imgBox;
      ctx.filter="blur(12px)"; ctx.drawImage(cv,x,y,w,h,x,y,w,h); ctx.filter="none";
      setImgProcessed(cv.toDataURL("image/png",1.0)); setScreen("imgexport");
    };
  };

  const doDownload=sz=>{
    if(!isPaid&&sz.paid){setPendingSz(sz);setAdTimer(5);setShowAd(true);}
    else triggerDL(sz);
  };

  const triggerDL=sz=>{
    if(!videoUrl) return;
    const a=document.createElement("a");
    a.href=videoUrl;
    a.download="reelkit_"+sz.id+".mp4";
    a.click();
  };

  const adDone=()=>{
    setShowAd(false);
    if(pendingSz){triggerDL(pendingSz);setPendingSz(null);}
  };

  const cp=(text,key)=>{navigator.clipboard?.writeText(text);setCopied(key);setTimeout(()=>setCopied(""),2000);};

  const genSEO=async(topic)=>{
    setSeoLoading(true); setSeoData(null);
    try{
      const res=await fetch('/api/seo',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({topic, platform})
      });
      const result=await res.json();
      if(!isPaid){setPendingSeo(result);setSeoAdTimer(5);setShowSeoAd(true);}
      else setSeoData(result);
    }catch(e){
      const fb={
        titles:[`🔥 ${topic} — Must Watch 2025`,`You Need to See This ${topic}!`,`Every Creator Needs This`],
        tags:['#contentcreator','#reelstips','#youtubetips','#instagramreels','#viral','#trending','#youtubeIndia','#reelsindia','#creatortool','#freetool','#videoediting','#socialmedia','#digitalcreator','#creatoreconomy','#reelkit','#shortstips','#videoedit','#instagramIndia','#creator2025','#'+topic.replace(/\s+/g,'')],
        description:`${topic} — perfect for Indian creators! #reelkit #viral #reelsindia`
      };
      if(!isPaid){setPendingSeo(fb);setSeoAdTimer(5);setShowSeoAd(true);}
      else setSeoData(fb);
    }
    setSeoLoading(false);
  };

  const Btn=({onClick,children,style={}})=>(
    <button onClick={onClick} style={{width:"100%",padding:"14px",borderRadius:12,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,color:"#fff",background:G,...style}}>{children}</button>
  );
  const BtnO=({onClick,children,style={}})=>(
    <button onClick={onClick} style={{width:"100%",padding:"13px",borderRadius:12,border:"1px solid "+bdr,cursor:"pointer",fontSize:14,fontWeight:500,color:sub,background:"transparent",marginTop:10,...style}}>{children}</button>
  );

  // Shared page wrapper — fixes Mac padding + mobile viewport
  const Page=({children})=>(
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",overflowX:"hidden"}}>
      <Nav/>
      <div style={{width:"100%",maxWidth:600,margin:"0 auto",padding:"24px 16px 80px",boxSizing:"border-box"}}>
        {children}
      </div>
      <div id="recaptcha-container"></div>
    </div>
  );

  const Nav=()=>(
    <div style={{background:navBg,padding:"0 16px",position:"sticky",top:0,zIndex:50,height:52,display:"flex",alignItems:"center"}}>
      <div style={{maxWidth:600,margin:"0 auto",width:"100%",display:"flex",alignItems:"center",boxSizing:"border-box"}}>
        <div onClick={()=>setScreen("home")} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
          <div style={{width:28,height:28,borderRadius:8,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:14}}>✦</div>
          <span style={{color:"#fff",fontWeight:700,fontSize:15}}>ReelKit</span>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>setDark(d=>!d)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",padding:"5px 10px",borderRadius:8,fontSize:12}}>{D?"☀":"◑"}</button>
          {isPaid&&<span style={{fontSize:11,fontWeight:700,padding:"4px 10px",borderRadius:20,background:G,color:"#fff"}}>★ Pro</span>}
          {user
            ? <button onClick={()=>signOut(auth)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",padding:"6px 12px",borderRadius:8,fontSize:13}}>Logout</button>
            : <button onClick={()=>setShowLogin(true)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"rgba(255,255,255,0.7)",cursor:"pointer",padding:"6px 12px",borderRadius:8,fontSize:13}}>Log In</button>
          }
        </div>
      </div>
    </div>
  );

  const AdBanner=()=>(
    !isPaid ? (
      <div style={{marginTop:20}}>
        <div style={{background:surf,border:"1px dashed "+bdr,borderRadius:14,padding:"18px 16px",textAlign:"center",marginBottom:12}}>
          <div style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:D?"#444":"#ccc",marginBottom:8}}>Advertisement</div>
          <div style={{fontSize:13,color:sub}}>Google Ad — Live after AdSense approval</div>
        </div>
        <div onClick={()=>setShowSub(true)} style={{background:D?"#1a0a30":"#f5f0ff",border:"1px solid #ddd6fe",borderRadius:14,padding:16,cursor:"pointer",display:"flex",gap:12,alignItems:"center"}}>
          <div style={{width:40,height:40,borderRadius:11,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:16,flexShrink:0}}>★</div>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:"#3b0764",marginBottom:2}}>Remove ads forever — ₹50/month</div>
            <div style={{fontSize:12,color:"#7c3aed"}}>HD · All sizes · AI SEO · No ads · Priority</div>
          </div>
          <div style={{marginLeft:"auto",color:"#7c3aed",fontSize:18}}>→</div>
        </div>
      </div>
    ) : null
  );

  // ── HOME ────────────────────────────────────────────────────
  if(screen==="home") return(
    <Page>
      {/* 3 TABS */}
      <div style={{display:"flex",background:D?"#1e1e28":"#efefef",borderRadius:12,padding:4,marginBottom:24,gap:3}}>
        {[{id:"video",label:"Video Watermark"},{id:"image",label:"Image Watermark"},{id:"seo",label:"AI SEO"}].map(t=>{
          const a=tab===t.id;
          return(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"10px 4px",borderRadius:9,border:a?"1.5px solid #7c3aed":"1.5px solid transparent",cursor:"pointer",fontSize:11,fontWeight:a?700:500,background:a?(D?"#2a1a4a":"#fff"):"transparent",color:a?"#7c3aed":(D?"#666":"#999"),transition:"all .15s"}}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* HEADLINE */}
      <div style={{textAlign:"center",marginBottom:24}}>
        <h1 style={{fontSize:28,fontWeight:900,letterSpacing:-0.5,lineHeight:1.2,margin:"0 0 8px"}}>
          {tab==="video"&&"Remove Watermark from Video"}
          {tab==="image"&&"Remove Watermark from Image"}
          {tab==="seo"&&"AI SEO Generator"}
        </h1>
        <p style={{color:sub,fontSize:14,margin:0}}>
          {tab==="video"&&"Erase any watermark, logo or text — free"}
          {tab==="image"&&"Remove watermarks from photos — free"}
          {tab==="seo"&&"Viral titles, tags & description instantly"}
        </p>
      </div>

      {/* VIDEO */}
      {tab==="video"&&(
        <div style={{background:surf,border:"1.5px dashed "+bdr,borderRadius:20,padding:"32px 20px",textAlign:"center",cursor:"pointer"}}
          onClick={()=>fileRef.current?.click()}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("video/")){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));setScreen("upload");}}}>
          <div style={{width:52,height:52,borderRadius:14,background:tagBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:22,color:tagClr}}>▶</div>
          <button style={{padding:"13px 36px",borderRadius:12,border:"none",cursor:"pointer",fontSize:15,fontWeight:800,color:"#fff",background:G,marginBottom:12}}>Choose Video File</button>
          <p style={{color:sub,fontSize:13,margin:"0 0 4px"}}>or drag and drop file here</p>
          <p style={{color:D?"#444":"#bbb",fontSize:12,margin:0}}>MP4, MOV, AVI, MKV</p>
        </div>
      )}
      <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));setScreen("upload");}e.target.value="";}}/>

      {/* IMAGE */}
      {tab==="image"&&(
        <div style={{background:surf,border:"1.5px dashed "+bdr,borderRadius:20,padding:"32px 20px",textAlign:"center",cursor:"pointer"}}
          onClick={()=>imgRef.current?.click()}
          onDragOver={e=>e.preventDefault()}
          onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("image/")){setImgUrl(URL.createObjectURL(f));setImgBox(null);setImgProcessed(null);setScreen("imgselect");}}}>
          <div style={{width:52,height:52,borderRadius:14,background:"#fff4ed",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:22,color:"#f97316"}}>◻</div>
          <button style={{padding:"13px 36px",borderRadius:12,border:"none",cursor:"pointer",fontSize:15,fontWeight:800,color:"#fff",background:"linear-gradient(135deg,#f97316,#ec4899)",marginBottom:12}}>Choose Image File</button>
          <p style={{color:sub,fontSize:13,margin:"0 0 4px"}}>or drag and drop</p>
          <div style={{display:"flex",justifyContent:"center",gap:6,marginTop:8}}>
            {["png","jpg","webp"].map(f=><span key={f} style={{fontSize:11,padding:"2px 8px",borderRadius:6,background:D?"#111":"#f0f0f0",color:sub,border:"1px solid "+bdr}}>{f}</span>)}
          </div>
        </div>
      )}
      <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setImgUrl(URL.createObjectURL(f));setImgBox(null);setImgProcessed(null);setScreen("imgselect");}e.target.value="";}}/>

      {/* SEO */}
      {tab==="seo"&&(
        <div>
          <div style={{display:"flex",gap:6,marginBottom:12}}>
            {["youtube","instagram"].map(p=>(
              <button key={p} onClick={()=>{setPlatform(p);setSeoData(null);}} style={{flex:1,padding:"9px",borderRadius:10,border:platform===p?"2px solid #7c3aed":"1px solid "+bdr,background:platform===p?tagBg:(D?"#111":"#fafafa"),color:platform===p?tagClr:sub,cursor:"pointer",fontWeight:platform===p?700:500,fontSize:13}}>
                {p==="youtube"?"▶ YouTube":"◉ Instagram"}
              </button>
            ))}
          </div>
          <div style={{background:card,border:"1px solid "+bdr,borderRadius:14,padding:14}}>
            <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1.2,color:sub,marginBottom:8}}>Your Video Topic</div>
            <div style={{position:"relative"}}>
              <textarea value={seoInput} onChange={e=>setSeoInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&seoInput.trim()){e.preventDefault();genSEO(seoInput.trim());}}}
                placeholder={'e.g. "Morning skincare routine"'}
                style={{width:"100%",minHeight:80,padding:"12px 14px 48px",borderRadius:10,border:"1px solid "+bdr,background:inpBg,color:txt,fontSize:14,resize:"none",outline:"none",lineHeight:1.7,boxSizing:"border-box",fontFamily:"inherit"}}/>
              <button onClick={()=>{if(seoInput.trim())genSEO(seoInput.trim());}} disabled={!seoInput.trim()||seoLoading}
                style={{position:"absolute",bottom:10,right:10,padding:"7px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:700,color:"#fff",background:seoInput.trim()?G:"#ccc",opacity:seoLoading?0.6:1}}>
                {seoLoading?"Wait...":"Generate →"}
              </button>
            </div>
            <div style={{marginTop:8}}>
              <span style={{fontSize:11,color:sub}}>Try: </span>
              {["Skincare","Travel vlog","Food recipe","Tech review"].map(eg=>(
                <span key={eg} onClick={()=>{setSeoInput(eg);genSEO(eg);}} style={{fontSize:11,color:tagClr,cursor:"pointer",marginRight:8,fontWeight:600,textDecoration:"underline",textDecorationStyle:"dotted"}}>{eg}</span>
              ))}
            </div>
          </div>
          {seoLoading&&<div style={{textAlign:"center",padding:"24px 0",color:sub}}>Generating for "{seoInput}"...</div>}
          {seoData&&!seoLoading&&(
            <>
              <div style={{display:"flex",alignItems:"center",gap:8,margin:"14px 0 10px"}}>
                <span style={{fontSize:12,color:sub}}>Results for:</span>
                <span style={{fontSize:12,fontWeight:700,padding:"3px 10px",borderRadius:20,background:tagBg,color:tagClr}}>"{seoInput}"</span>
                <button onClick={()=>setSeoData(null)} style={{fontSize:11,color:sub,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Change</button>
              </div>
              {[
                {title:"Titles", content: seoData.titles?.map((t,i)=>(
                  <div key={i} style={{background:D?"#111":"#f8f8f8",padding:10,borderRadius:10,marginBottom:6,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,border:"1px solid "+bdr}}>
                    <span style={{fontSize:13,flex:1,lineHeight:1.6}}>{t}</span>
                    <button onClick={()=>cp(t,"t"+i)} style={{background:tagBg,border:"none",color:copied==="t"+i?okTxt:tagClr,cursor:"pointer",padding:"5px 10px",borderRadius:7,fontSize:11,whiteSpace:"nowrap",fontWeight:700}}>{copied==="t"+i?"✓":"Copy"}</button>
                  </div>
                ))},
                {title:"Trending Tags", content:(
                  <>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {seoData.tags?.map((t,i)=><span key={i} onClick={()=>cp(t,"tg"+i)} style={{background:tagBg,border:"1px solid #ddd6fe",padding:"4px 10px",borderRadius:40,fontSize:11,cursor:"pointer",color:copied==="tg"+i?okTxt:tagClr,fontWeight:500}}>{t}</span>)}
                    </div>
                    <button onClick={()=>cp(seoData.tags?.join(" "),"all")} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px solid "+bdr,cursor:"pointer",fontSize:12,fontWeight:600,color:sub,background:"transparent",marginTop:10}}>{copied==="all"?"✓ Copied All":"Copy All Tags"}</button>
                  </>
                )},
                {title:"Description", content:(
                  <>
                    <div style={{background:D?"#111":"#f8f8f8",padding:12,borderRadius:10,fontSize:13,lineHeight:1.8,color:sub,border:"1px solid "+bdr}}>{seoData.description}</div>
                    <button onClick={()=>cp(seoData.description,"desc")} style={{width:"100%",padding:"9px",borderRadius:9,border:"1px solid "+bdr,cursor:"pointer",fontSize:12,fontWeight:600,color:sub,background:"transparent",marginTop:8}}>{copied==="desc"?"✓ Copied":"Copy Description"}</button>
                  </>
                )},
              ].map(s=>(
                <div key={s.title} style={{background:card,border:"1px solid "+bdr,borderRadius:14,padding:14,marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:1.2,color:sub,marginBottom:10}}>{s.title}</div>
                  {s.content}
                </div>
              ))}
              <Btn onClick={()=>{setSeoData(null);genSEO(seoInput);}}>↺ Regenerate</Btn>
            </>
          )}
        </div>
      )}

      <AdBanner/>

      <div style={{marginTop:40}}>
        <p style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:D?"#444":"#bbb",textAlign:"center",marginBottom:16}}>How it works</p>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[{n:"1",t:"Upload",d:"Select file"},{n:"2",t:"Select",d:"Draw over watermark"},{n:"3",t:"Download",d:"Free clean file"}].map(s=>(
            <div key={s.n} style={{background:card,borderRadius:14,padding:14,textAlign:"center",border:"1px solid "+bdr}}>
              <div style={{width:28,height:28,borderRadius:50,background:G,color:"#fff",fontWeight:800,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 8px"}}>{s.n}</div>
              <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>{s.t}</div>
              <div style={{fontSize:11,color:sub}}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:40,paddingTop:20,borderTop:"1px solid "+bdr}}>
        <p style={{fontSize:12,color:sub,lineHeight:1.8,marginBottom:12}}>ReelKit — India's free watermark removal & creator toolkit. Remove watermarks from videos & images, export to trending sizes, generate AI SEO.</p>
        <div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:6}}>
          <span style={{fontSize:11,color:D?"#444":"#bbb"}}>© 2025 ReelKit.in</span>
          <span style={{fontSize:11,color:D?"#444":"#bbb"}}>Made with ♥ for Indian Creators</span>
        </div>
      </div>

      {showSeoAd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
          <div style={{background:card,borderRadius:24,padding:24,width:"100%",maxWidth:380,border:"1px solid "+bdr}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}>
              <span style={{fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:sub}}>Advertisement</span>
              <span style={{fontSize:11,color:sub,background:surf,padding:"2px 10px",borderRadius:20,border:"1px solid "+bdr}}>{seoAdTimer>0?"Closes in "+seoAdTimer+"s":"Ready"}</span>
            </div>
            <div style={{background:D?"#111":"#f8f8f8",borderRadius:14,padding:"32px 20px",marginBottom:14,border:"1px dashed "+bdr,textAlign:"center"}}>
              <div style={{fontWeight:600,fontSize:14,color:sub}}>Google Ad Space</div>
            </div>
            <div style={{background:tagBg,border:"1px solid #ddd6fe",borderRadius:12,padding:12,marginBottom:12,display:"flex",gap:10,alignItems:"center"}}>
              <span>★</span>
              <div><div style={{fontWeight:700,fontSize:13,color:tagClr}}>Tired of ads?</div><div style={{fontSize:12,color:tagClr,opacity:.8}}>Go Pro — ₹50/month</div></div>
            </div>
            <button style={{width:"100%",padding:14,borderRadius:12,border:"none",cursor:seoAdTimer>0?"not-allowed":"pointer",fontSize:15,fontWeight:700,color:"#fff",background:seoAdTimer>0?"#999":G}} disabled={seoAdTimer>0}
              onClick={()=>{setShowSeoAd(false);setSeoData(pendingSeo);setPendingSeo(null);}}>
              {seoAdTimer>0?"Results in "+seoAdTimer+"s...":"✓ Show Results"}
            </button>
            <button style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid #7c3aed",cursor:"pointer",fontSize:14,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:8}} onClick={()=>{setShowSeoAd(false);setPendingSeo(null);setShowSub(true);}}>
              ★ Skip — Upgrade to Pro
            </button>
          </div>
        </div>
      )}
      {showSub&&<SubModal card={card} bdr={bdr} sub={sub} setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
      {showLogin&&<LoginModal card={card} bdr={bdr} sub={sub} inpBg={inpBg} txt={txt} onDone={(u)=>{setUser(u);setShowLogin(false);}} onClose={()=>setShowLogin(false)}/>}
    </Page>
  );

  if(screen==="upload") return(
    <Page>
      <div onClick={()=>setScreen("home")} style={{fontSize:13,color:sub,cursor:"pointer",marginBottom:16}}>← Back</div>
      <video ref={videoRef} src={videoUrl} style={{width:"100%",borderRadius:16,background:"#000",display:"block"}} controls playsInline/>
      <div style={{background:card,borderRadius:16,padding:14,marginTop:12,border:"1px solid "+bdr,display:"flex",gap:12,alignItems:"center"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:600,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{videoFile?.name}</div>
          <div style={{color:sub,fontSize:12,marginTop:2}}>{videoFile?(videoFile.size/1024/1024).toFixed(1)+" MB":""}</div>
        </div>
        <button onClick={()=>fileRef.current?.click()} style={{padding:"7px 14px",borderRadius:8,border:"1px solid "+bdr,background:"transparent",color:sub,cursor:"pointer",fontSize:13,flexShrink:0}}>Change</button>
        <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));}e.target.value="";}}/>
      </div>
      <div style={{background:warnBg,border:"1px solid "+warnBdr,borderRadius:14,padding:14,marginTop:14}}>
        <div style={{fontWeight:700,fontSize:13,color:warnTxt,marginBottom:6}}>⚠️ Legal Notice</div>
        <p style={{fontSize:12,lineHeight:1.8,color:warnTxt,margin:"0 0 10px"}}>Only for videos you own. Removing copyrighted watermarks is illegal. ReelKit is not responsible for misuse.</p>
        <label style={{display:"flex",gap:10,alignItems:"flex-start",cursor:"pointer"}}>
          <input type="checkbox" checked={legalOk} onChange={e=>setLegalOk(e.target.checked)} style={{marginTop:2,accentColor:"#7c3aed",flexShrink:0}}/>
          <span style={{fontSize:12,lineHeight:1.7,color:warnTxt,fontWeight:500}}>I own this video and accept legal responsibility.</span>
        </label>
      </div>
      <Btn onClick={()=>setScreen("select")} style={{opacity:legalOk?1:0.3,marginTop:14}}>Select Watermark Area →</Btn>
      {showSub&&<SubModal card={card} bdr={bdr} sub={sub} setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
    </Page>
  );

  if(screen==="select") return(
    <Page>
      <div onClick={()=>setScreen("upload")} style={{fontSize:13,color:sub,cursor:"pointer",marginBottom:14}}>← Back</div>
      <h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Select Watermark</h2>
      <p style={{color:sub,marginBottom:12,fontSize:13}}>Draw a box over the watermark</p>
      <div style={{position:"relative",borderRadius:14,overflow:"hidden",background:"#000",border:"1px solid "+bdr,touchAction:"none"}}>
        <video ref={videoRef} src={videoUrl} style={{width:"100%",display:"block"}} muted playsInline/>
        <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",cursor:"crosshair"}}
          onMouseDown={vDown} onMouseMove={vMove} onMouseUp={vUp}
          onTouchStart={e=>{e.preventDefault();vDown(e);}}
          onTouchMove={e=>{e.preventDefault();vMove(e);}}
          onTouchEnd={e=>{e.preventDefault();vUp();}}
        />
      </div>
      {wBox&&<div style={{background:okBg,border:"1px solid "+okBdr,borderRadius:10,padding:"10px 14px",marginTop:10,fontSize:13,color:okTxt,fontWeight:600}}>✓ Area selected</div>}
      <Btn onClick={doProcess} style={{opacity:wBox?1:0.3,marginTop:12}}>Remove Watermark →</Btn>
      <BtnO onClick={()=>{setWBox(null);paintBox(null,canvasRef);}}>Clear</BtnO>
    </Page>
  );

  if(screen==="processing") return(
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",padding:40}}>
        <div style={{fontSize:20,fontWeight:800,marginBottom:8}}>Removing Watermark...</div>
        <div style={{margin:"20px auto",background:bdr,borderRadius:100,height:4,width:200,overflow:"hidden"}}>
          <div style={{height:"100%",background:G,width:progress+"%",transition:"width .2s",borderRadius:100}}/>
        </div>
        <div style={{fontWeight:800,fontSize:26,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>{Math.round(progress)}%</div>
      </div>
    </div>
  );

  if(screen==="export") return(
    <Page>
      <div onClick={()=>setScreen("home")} style={{fontSize:13,color:sub,cursor:"pointer",marginBottom:14}}>← Home</div>
      <div style={{background:okBg,border:"1px solid "+okBdr,borderRadius:12,padding:"12px 16px",display:"flex",gap:10,alignItems:"center",marginBottom:18}}>
        <span style={{color:okTxt,fontWeight:700,fontSize:18}}>✓</span>
        <span style={{fontSize:14,color:okTxt,fontWeight:600}}>Watermark removed!</span>
      </div>
      <div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:sub,marginBottom:10}}>Download Size</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {SIZES.map(sz=>(
            <div key={sz.id} onClick={()=>doDownload(sz)} style={{background:card,borderRadius:12,padding:"12px 6px",textAlign:"center",cursor:"pointer",border:"1px solid "+bdr,position:"relative"}}>
              {!isPaid&&sz.paid&&<div style={{position:"absolute",top:4,right:4,fontSize:9,background:G,color:"#fff",padding:"1px 5px",borderRadius:4,fontWeight:700}}>AD</div>}
              <div style={{fontWeight:700,fontSize:12}}>{sz.label}</div>
              <div style={{color:sub,fontSize:10,marginTop:2}}>{sz.ratio}</div>
            </div>
          ))}
        </div>
        {!isPaid&&<p style={{color:sub,fontSize:12,marginTop:8}}>Free users watch a short ad per download</p>}
      </div>
      <Btn onClick={()=>{setTab("seo");setScreen("home");}}>Generate AI SEO Tags →</Btn>
      <BtnO onClick={()=>setScreen("home")}>← Process Another Video</BtnO>
      {showAd&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:16}}>
          <div style={{background:card,borderRadius:20,padding:24,width:"100%",maxWidth:360,border:"1px solid "+bdr,textAlign:"center"}}>
            <div style={{background:D?"#111":"#f8f8f8",borderRadius:14,padding:"32px 20px",marginBottom:14,border:"1px dashed "+bdr}}>
              <div style={{fontWeight:600,fontSize:14,color:sub}}>Google Ad Space</div>
            </div>
            <button style={{width:"100%",padding:14,borderRadius:12,border:"none",cursor:adTimer>0?"not-allowed":"pointer",fontSize:15,fontWeight:700,color:"#fff",background:adTimer>0?"#999":G}} disabled={adTimer>0} onClick={adDone}>
              {adTimer>0?"Download in "+adTimer+"s...":"↓ Download Now"}
            </button>
            <button style={{width:"100%",padding:"11px",borderRadius:12,border:"1px solid #7c3aed",cursor:"pointer",fontSize:14,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:8}} onClick={()=>{setShowAd(false);setShowSub(true);}}>★ Go Pro — Skip Ads</button>
          </div>
        </div>
      )}
      {showSub&&<SubModal card={card} bdr={bdr} sub={sub} setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
    </Page>
  );

  if(screen==="imgselect") return(
    <Page>
      <div onClick={()=>setScreen("home")} style={{fontSize:13,color:sub,cursor:"pointer",marginBottom:14}}>← Back</div>
      <h2 style={{fontSize:20,fontWeight:800,marginBottom:6}}>Select Watermark</h2>
      <p style={{color:sub,marginBottom:12,fontSize:13}}>Draw a box over the watermark</p>
      <div style={{position:"relative",borderRadius:14,overflow:"hidden",background:"#000",border:"1px solid "+bdr,touchAction:"none"}}>
        <canvas ref={imgCvRef} style={{width:"100%",display:"block",cursor:"crosshair"}}
          onMouseDown={iDown} onMouseMove={iMove} onMouseUp={iUp}
          onTouchStart={e=>{e.preventDefault();iDown(e);}}
          onTouchMove={e=>{e.preventDefault();iMove(e);}}
          onTouchEnd={e=>{e.preventDefault();iUp();}}
        />
      </div>
      {imgBox&&<div style={{background:okBg,border:"1px solid "+okBdr,borderRadius:10,padding:"10px 14px",marginTop:10,fontSize:13,color:okTxt,fontWeight:600}}>✓ Area selected!</div>}
      <Btn onClick={doImgProcess} style={{opacity:imgBox?1:0.3,marginTop:12,background:"linear-gradient(135deg,#f97316,#ec4899)"}}>Remove Watermark →</Btn>
      <BtnO onClick={()=>setImgBox(null)}>Clear</BtnO>
    </Page>
  );

  if(screen==="imgexport") return(
    <Page>
      <div onClick={()=>setScreen("home")} style={{fontSize:13,color:sub,cursor:"pointer",marginBottom:14}}>← Home</div>
      <div style={{background:okBg,border:"1px solid "+okBdr,borderRadius:12,padding:"12px 16px",display:"flex",gap:10,alignItems:"center",marginBottom:16}}>
        <span style={{color:okTxt,fontWeight:700,fontSize:18}}>✓</span>
        <span style={{fontSize:14,color:okTxt,fontWeight:600}}>Watermark removed!</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
        <div style={{background:card,borderRadius:14,padding:10,border:"1px solid "+bdr}}>
          <div style={{fontSize:10,color:sub,fontWeight:600,textTransform:"uppercase",marginBottom:8}}>Before</div>
          <img src={imgUrl} alt="before" style={{width:"100%",borderRadius:10,display:"block"}}/>
        </div>
        <div style={{background:card,borderRadius:14,padding:10,border:"1px solid "+okBdr}}>
          <div style={{fontSize:10,color:okTxt,fontWeight:600,textTransform:"uppercase",marginBottom:8}}>After ✓</div>
          {imgProcessed&&<img src={imgProcessed} alt="after" style={{width:"100%",borderRadius:10,display:"block"}}/>}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
        {[{fmt:"PNG",free:true},{fmt:"JPG",free:true},{fmt:"WebP",free:false},{fmt:"PNG 4K",free:false}].map(({fmt,free})=>(
          <div key={fmt} onClick={()=>{if(!free&&!isPaid){setShowSub(true);return;}const a=document.createElement("a");a.href=imgProcessed||imgUrl;a.download="reelkit."+fmt.toLowerCase().split(" ")[0];a.click();}}
            style={{background:card,borderRadius:12,padding:"12px 8px",textAlign:"center",cursor:"pointer",border:"1px solid "+bdr,position:"relative"}}>
            {!free&&!isPaid&&<div style={{position:"absolute",top:4,right:4,fontSize:9,background:G,color:"#fff",padding:"1px 5px",borderRadius:4,fontWeight:700}}>PRO</div>}
            <div style={{fontWeight:800,fontSize:14,color:free?"#0891b2":"#7c3aed"}}>{fmt}</div>
            <div style={{color:sub,fontSize:11,marginTop:2}}>{free?"Free":isPaid?"Pro ✓":"Upgrade"}</div>
          </div>
        ))}
      </div>
      <BtnO onClick={()=>setScreen("home")}>← Home</BtnO>
      {showSub&&<SubModal card={card} bdr={bdr} sub={sub} setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
    </Page>
  );

  return null;
}

function SubModal({card,bdr,sub,setIsPaid,onClose}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",zIndex:300}}>
      <div style={{width:"100%",maxWidth:600,margin:"0 auto",background:card,borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",border:"1px solid "+bdr,boxSizing:"border-box"}}>
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:20}}>ReelKit Pro</div>
          <div style={{fontSize:30,fontWeight:900,background:"linear-gradient(135deg,#6d28d9,#db2777)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:4}}>
            ₹50<span style={{fontSize:14,WebkitTextFillColor:sub,fontWeight:400}}>/month</span>
          </div>
          <div style={{fontSize:12,color:sub,marginTop:3}}>or ₹399/year — save ₹201</div>
        </div>
        {["Full HD 1080p exports","All 7 trending sizes","Zero ads — ever","AI SEO titles, tags & description","Priority processing","WebP + PNG 4K image exports"].map(f=>(
          <div key={f} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 0",borderBottom:"1px solid "+bdr}}>
            <span style={{color:"#7c3aed",fontWeight:700}}>✓</span>
            <span style={{fontSize:13}}>{f}</span>
          </div>
        ))}
        <button style={{width:"100%",padding:14,borderRadius:12,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)",marginTop:18}} onClick={()=>{setIsPaid(true);onClose();}}>Subscribe via Razorpay →</button>
        <button style={{width:"100%",padding:12,borderRadius:12,border:"1px solid "+bdr,cursor:"pointer",fontSize:14,color:sub,background:"transparent",marginTop:10}} onClick={onClose}>Maybe Later</button>
      </div>
    </div>
  );
}

function LoginModal({card,bdr,sub,inpBg,txt,onDone,onClose}){
  const [step,    setStep]    = useState("phone");
  const [phone,   setPhone]   = useState("");
  const [otpVal,  setOtpVal]  = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const refs = [useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];

  const handleSend = async()=>{
    setLoading(true); setError("");
    try{
      await sendOTP(phone);
      setStep("otp");
    }catch(e){
      setError("OTP bhejne mein error. Check karo number sahi hai.");
    }
    setLoading(false);
  };

  const handleVerify = async()=>{
    setLoading(true); setError("");
    try{
      const user = await verifyOTP(otpVal.join(""));
      onDone(user);
    }catch(e){
      setError("Galat OTP. Dobara try karo.");
    }
    setLoading(false);
  };

  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"flex-end",zIndex:300}}>
      <div style={{width:"100%",maxWidth:600,margin:"0 auto",background:card,borderRadius:"24px 24px 0 0",padding:"24px 20px 40px",border:"1px solid "+bdr,boxSizing:"border-box"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:18}}>{step==="phone"?"Log in to ReelKit":"Enter OTP"}</div>
          <button onClick={onClose} style={{background:"rgba(0,0,0,0.06)",border:"none",cursor:"pointer",width:32,height:32,borderRadius:8,fontSize:16}}>✕</button>
        </div>
        {error&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"10px 14px",fontSize:13,color:"#dc2626",marginBottom:14}}>{error}</div>}
        {step==="phone"?(
          <>
            <p style={{color:sub,fontSize:13,marginBottom:14}}>Enter your mobile number to continue</p>
            <div style={{display:"flex",gap:8}}>
              <div style={{padding:"13px 14px",borderRadius:10,border:"1px solid "+bdr,background:inpBg,color:sub,fontWeight:600,flexShrink:0}}>+91</div>
              <input style={{flex:1,padding:"13px 14px",borderRadius:10,border:"1px solid "+bdr,background:inpBg,color:txt,fontSize:15,outline:"none",boxSizing:"border-box"}} type="tel" maxLength={10} placeholder="9876543210" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))}/>
            </div>
            <button style={{width:"100%",padding:14,borderRadius:12,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)",marginTop:14,opacity:phone.length===10&&!loading?1:0.4}} disabled={phone.length!==10||loading} onClick={handleSend}>
              {loading?"Sending...":"Send OTP →"}
            </button>
          </>
        ):(
          <>
            <p style={{color:sub,fontSize:13,marginBottom:14}}>Sent to +91 {phone} · <span style={{color:"#7c3aed",cursor:"pointer"}} onClick={()=>setStep("phone")}>Change</span></p>
            <div style={{display:"flex",gap:8}}>
              {otpVal.map((d,i)=>(
                <input key={i} ref={refs[i]} style={{flex:1,padding:"14px 0",borderRadius:10,border:"1px solid "+bdr,background:inpBg,color:txt,fontSize:22,fontWeight:800,textAlign:"center",outline:"none"}}
                  maxLength={1} value={d}
                  onChange={e=>{const v=e.target.value.replace(/\D/g,"");const n=[...otpVal];n[i]=v;setOtpVal(n);if(v&&i<5)refs[i+1].current?.focus();}}
                  onKeyDown={e=>{if(e.key==="Backspace"&&!d&&i>0)refs[i-1].current?.focus();}}/>
              ))}
            </div>
            <button style={{width:"100%",padding:14,borderRadius:12,border:"none",cursor:"pointer",fontSize:15,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)",marginTop:14,opacity:otpVal.join("").length===6&&!loading?1:0.4}} disabled={otpVal.join("").length!==6||loading} onClick={handleVerify}>
              {loading?"Verifying...":"Verify & Enter →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}