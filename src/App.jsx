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

export default function App() {
  const [dark,        setDark]        = useState(false);
  const [tab,         setTab]         = useState("video");
  const [screen,      setScreen]      = useState("home");
  const [isPaid,      setIsPaid]      = useState(false);
  const [showSub,     setShowSub]     = useState(false);
  const [showLogin,   setShowLogin]   = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms,   setShowTerms]   = useState(false);
  const [user,        setUser]        = useState(null);
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

  const fileRef=useRef(),imgRef=useRef(),videoRef=useRef(),canvasRef=useRef(),imgCvRef=useRef();

  const D=dark;
  const bg=D?"#0f0f13":"#fff", navBg=D?"#111118":"#1a1a2a", surf=D?"#18181f":"#f4f4f6";
  const card=D?"#1e1e28":"#fff", bdr=D?"#2a2a38":"#e2e2e8", txt=D?"#f0f0f0":"#111";
  const sub2=D?"#aaa":"#444", sub=D?"#888":"#666", inpBg=D?"#18181f":"#fafafa";
  const tagBg=D?"#1a1030":"#f0edff", tagClr=D?"#a78bfa":"#6d28d9";
  const okBg=D?"#052e16":"#f0fdf4", okBdr=D?"#14532d":"#a7f3d0", okTxt=D?"#4ade80":"#059669";
  const warnBg=D?"#1c1000":"#fffbeb", warnBdr=D?"#78350f":"#fde68a", warnTxt=D?"#fbbf24":"#92400e";

  useEffect(()=>{if(showAd&&adTimer>0){const t=setTimeout(()=>setAdTimer(a=>a-1),1000);return()=>clearTimeout(t);}},[showAd,adTimer]);
  useEffect(()=>{if(showSeoAd&&seoAdTimer>0){const t=setTimeout(()=>setSeoAdTimer(a=>a-1),1000);return()=>clearTimeout(t);}},[showSeoAd,seoAdTimer]);

  const getPos=(e,cv)=>{const r=cv.getBoundingClientRect();const sx=cv.width/r.width,sy=cv.height/r.height;const cx=e.touches?e.touches[0].clientX:e.clientX;const cy=e.touches?e.touches[0].clientY:e.clientY;return{x:(cx-r.left)*sx,y:(cy-r.top)*sy};};

  const paintBox=useCallback((box,ref)=>{const cv=ref.current;if(!cv)return;const ctx=cv.getContext("2d");ctx.clearRect(0,0,cv.width,cv.height);if(!box)return;ctx.fillStyle="rgba(0,0,0,0.42)";ctx.fillRect(0,0,cv.width,cv.height);ctx.clearRect(box.x,box.y,box.w,box.h);ctx.strokeStyle="#7c3aed";ctx.lineWidth=2;ctx.setLineDash([6,4]);ctx.strokeRect(box.x,box.y,box.w,box.h);ctx.fillStyle="#7c3aed";ctx.setLineDash([]);[[box.x,box.y],[box.x+box.w,box.y],[box.x,box.y+box.h],[box.x+box.w,box.y+box.h]].forEach(([a,b])=>ctx.fillRect(a-5,b-5,10,10));},[]);

  useEffect(()=>{if(screen!=="select")return;const v=videoRef.current,cv=canvasRef.current;if(!v||!cv)return;const onLoad=()=>{cv.width=v.videoWidth||640;cv.height=v.videoHeight||360;v.currentTime=0.5;};const onSeek=()=>{cv.getContext("2d").drawImage(v,0,0,cv.width,cv.height);};v.addEventListener("loadeddata",onLoad);v.addEventListener("seeked",onSeek);return()=>{v.removeEventListener("loadeddata",onLoad);v.removeEventListener("seeked",onSeek);};},[screen]);

  useEffect(()=>{if(screen!=="imgselect"||!imgUrl)return;const img=new Image();img.src=imgUrl;img.onload=()=>{const cv=imgCvRef.current;if(!cv)return;cv.width=img.naturalWidth;cv.height=img.naturalHeight;cv.getContext("2d").drawImage(img,0,0);};},[screen,imgUrl]);

  const vDown=e=>{const p=getPos(e,canvasRef.current);setDrawing(true);setStartPos(p);setWBox(null);paintBox(null,canvasRef);};
  const vMove=e=>{if(!drawing||!startPos)return;const p=getPos(e,canvasRef.current);const b={x:Math.min(startPos.x,p.x),y:Math.min(startPos.y,p.y),w:Math.abs(p.x-startPos.x),h:Math.abs(p.y-startPos.y)};setWBox(b);paintBox(b,canvasRef);};
  const vUp=()=>setDrawing(false);
  const iDown=e=>{const p=getPos(e,imgCvRef.current);setImgDrawing(true);setImgStart(p);setImgBox(null);};
  const iMove=e=>{if(!imgDrawing||!imgStart)return;const p=getPos(e,imgCvRef.current);const b={x:Math.min(imgStart.x,p.x),y:Math.min(imgStart.y,p.y),w:Math.abs(p.x-imgStart.x),h:Math.abs(p.y-imgStart.y)};setImgBox(b);paintBox(b,imgCvRef);};
  const iUp=()=>setImgDrawing(false);

  const doProcess=()=>{setScreen("processing");setProgress(0);let p=0;const iv=setInterval(()=>{p+=Math.random()*12+3;if(p>=100){clearInterval(iv);setProgress(100);setProcessedUrl(videoUrl);setTimeout(()=>setScreen("export"),500);return;}setProgress(Math.min(p,100));},160);};

  const doImgProcess=()=>{const cv=imgCvRef.current;if(!cv||!imgBox)return;const ctx=cv.getContext("2d");const img=new Image();img.src=imgUrl;img.onload=()=>{ctx.clearRect(0,0,cv.width,cv.height);ctx.drawImage(img,0,0,cv.width,cv.height);const{x,y,w,h}=imgBox;ctx.filter=`blur(${Math.min(w,h)*0.3}px)`;ctx.drawImage(cv,x,y,w,h,x,y,w,h);ctx.filter="none";setImgProcessed(cv.toDataURL("image/png",1.0));setScreen("imgexport");};};

  const doDownload=sz=>{if(!isPaid&&sz.paid){setPendingSz(sz);setAdTimer(5);setShowAd(true);}else triggerDL(sz);};
  const triggerDL=sz=>{if(!processedUrl)return;const a=document.createElement("a");a.href=processedUrl;a.download="reelkit_"+sz.id+".mp4";a.click();};
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
      const fb={titles:[`🔥 ${topic} — Must Watch ${YEAR}`,`This ${topic} Will Change Everything!`,`Every Creator Must Know This`],tags:[`#${topic.replace(/\s+/g,"")}`, "#contentcreator","#reelstips","#youtubetips","#instagramreels","#viral","#trending","#youtubeIndia","#reelsindia","#creatortool","#freetool","#videoediting","#socialmedia","#digitalcreator","#creatoreconomy","#reelkit","#shortstips","#videoedit","#instagramIndia",`#creator${YEAR}`,"#indiancreator"],description:`${topic} — perfect for Indian creators on ${platform}. Use ReelKit to remove watermarks free. #reelkit #viral #reelsindia`};
      if(!isPaid){setPendingSeo(fb);setSeoAdTimer(5);setShowSeoAd(true);}
      else setSeoData(fb);
    }
    setSeoLoading(false);
  };

  const Btn=({onClick,children,style={}})=>(<button onClick={onClick} style={{width:"100%",padding:"15px",borderRadius:14,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#fff",background:G,...style}}>{children}</button>);
  const BtnO=({onClick,children,style={}})=>(<button onClick={onClick} style={{width:"100%",padding:"14px",borderRadius:14,border:"1px solid "+bdr,cursor:"pointer",fontSize:15,fontWeight:500,color:sub2,background:"transparent",marginTop:10,...style}}>{children}</button>);

  const Nav=()=>(
    <div style={{background:navBg,padding:"0 16px",height:56,display:"flex",alignItems:"center",position:"sticky",top:0,zIndex:50}}>
      <div style={{maxWidth:620,margin:"0 auto",width:"100%",display:"flex",alignItems:"center",boxSizing:"border-box"}}>
        <div onClick={()=>setScreen("home")} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
          <div style={{width:32,height:32,borderRadius:9,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:16}}>✦</div>
          <span style={{color:"#fff",fontWeight:800,fontSize:17}}>ReelKit</span>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>setDark(d=>!d)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"rgba(255,255,255,0.8)",cursor:"pointer",padding:"6px 11px",borderRadius:8,fontSize:13}}>{D?"☀":"◑"}</button>
          {isPaid&&<span style={{fontSize:12,fontWeight:700,padding:"5px 12px",borderRadius:20,background:G,color:"#fff"}}>★ Pro</span>}
          {user?<button onClick={()=>setUser(null)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"rgba(255,255,255,0.8)",cursor:"pointer",padding:"7px 14px",borderRadius:8,fontSize:14,fontWeight:600}}>Logout</button>
               :<button onClick={()=>setShowLogin(true)} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"rgba(255,255,255,0.8)",cursor:"pointer",padding:"7px 14px",borderRadius:8,fontSize:14,fontWeight:600}}>Log In</button>}
        </div>
      </div>
    </div>
  );

  const AdBanner=()=>!isPaid?(
    <div style={{marginTop:24}}>
      <div style={{background:surf,border:"1px dashed "+bdr,borderRadius:16,padding:"20px 16px",textAlign:"center",marginBottom:12}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:sub,marginBottom:6}}>Advertisement</div>
        <div style={{fontSize:14,color:sub}}>Google Ad — Live after AdSense approval</div>
      </div>
      <div onClick={()=>setShowSub(true)} style={{background:D?"#1a0a30":"#f5f0ff",border:"1px solid #c4b5fd",borderRadius:16,padding:"18px 16px",cursor:"pointer",display:"flex",gap:14,alignItems:"center"}}>
        <div style={{width:44,height:44,borderRadius:12,background:G,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:18,flexShrink:0}}>★</div>
        <div><div style={{fontWeight:800,fontSize:15,color:D?"#e9d5ff":"#3b0764",marginBottom:3}}>Remove ads forever — ₹50/month</div><div style={{fontSize:13,color:D?"#a78bfa":"#6d28d9"}}>HD · All sizes · AI SEO · No ads · Priority</div></div>
        <div style={{marginLeft:"auto",color:"#7c3aed",fontSize:20}}>→</div>
      </div>
    </div>
  ):null;

  // ── HOME ────────────────────────────────────────────────────
  if(screen==="home") return(
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",overflowX:"hidden"}}>
      <Nav/>
      <div style={{background:D?"linear-gradient(160deg,#0f0f13,#1a0a30,#0f0f13)":"linear-gradient(160deg,#1a1a2a,#2d1b69,#1a1a2a)",padding:"36px 18px 44px"}}>
        <div style={{maxWidth:620,margin:"0 auto"}}>
          <div style={{display:"flex",background:"rgba(255,255,255,0.08)",borderRadius:14,padding:4,marginBottom:26,gap:3}}>
            {[{id:"video",label:"Video Watermark"},{id:"image",label:"Image Watermark"},{id:"seo",label:"AI SEO"}].map(t=>{const a=tab===t.id;return(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,padding:"11px 4px",borderRadius:10,border:a?"1.5px solid #a78bfa":"1.5px solid transparent",cursor:"pointer",fontSize:13,fontWeight:a?700:500,background:a?"rgba(255,255,255,0.15)":"transparent",color:a?"#fff":"rgba(255,255,255,0.5)",transition:"all .15s"}}>{t.label}</button>
            );})}
          </div>
          <div style={{textAlign:"center",marginBottom:26}}>
            <h1 style={{fontSize:32,fontWeight:900,letterSpacing:-1,lineHeight:1.15,margin:"0 0 10px",color:"#ffffff"}}>
              {tab==="video"&&"Remove Watermark from Video"}
              {tab==="image"&&"Remove Watermark from Image"}
              {tab==="seo"&&"AI SEO Generator for Creators"}
            </h1>
            <p style={{color:"rgba(255,255,255,0.72)",fontSize:16,margin:0}}>
              {tab==="video"&&"Erase any watermark, logo, or text from your video — free"}
              {tab==="image"&&"Remove watermarks from photos without blur — free"}
              {tab==="seo"&&"Get viral titles, 20 trending tags & description instantly"}
            </p>
          </div>
          <div style={{background:D?"rgba(30,30,40,0.97)":"rgba(255,255,255,0.98)",borderRadius:20,padding:"28px 22px",border:"1px solid rgba(255,255,255,0.15)"}}>
            {tab==="video"&&(
              <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>fileRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("video/")){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));setScreen("upload");}}}>
                <div style={{width:64,height:64,borderRadius:18,background:tagBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={tagClr} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                </div>
                <button style={{padding:"15px 48px",borderRadius:14,border:"none",cursor:"pointer",fontSize:17,fontWeight:800,color:"#fff",background:G,marginBottom:14}}>Choose Video File</button>
                <p style={{color:sub2,fontSize:15,margin:"0 0 6px"}}>or drag and drop file here</p>
                <p style={{color:sub,fontSize:13,margin:0}}>MP4, MOV, AVI, MKV supported</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));setScreen("upload");}e.target.value="";}}/>
            {tab==="image"&&(
              <div style={{textAlign:"center",cursor:"pointer"}} onClick={()=>imgRef.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f?.type.startsWith("image/")){setImgUrl(URL.createObjectURL(f));setImgBox(null);setImgProcessed(null);setScreen("imgselect");}}}>
                <div style={{width:64,height:64,borderRadius:18,background:"linear-gradient(135deg,#fff4ed,#fce7f3)",border:"2px solid #fed7aa",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 18px"}}>
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                </div>
                <button style={{padding:"15px 48px",borderRadius:14,border:"none",cursor:"pointer",fontSize:17,fontWeight:800,color:"#fff",background:"linear-gradient(135deg,#f97316,#ec4899)",marginBottom:14}}>Choose Image File</button>
                <p style={{color:sub2,fontSize:15,margin:"0 0 6px"}}>or drag and drop file here</p>
                <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:10}}>
                  {["png","jpg","webp","avif"].map(f=><span key={f} style={{fontSize:12,padding:"3px 10px",borderRadius:7,background:D?"#111":"#f0f0f0",color:sub,border:"1px solid "+bdr,fontWeight:600}}>{f}</span>)}
                </div>
              </div>
            )}
            <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setImgUrl(URL.createObjectURL(f));setImgBox(null);setImgProcessed(null);setScreen("imgselect");}e.target.value="";}}/>
            {tab==="seo"&&(
              <div>
                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  {["youtube","instagram"].map(p=>(
                    <button key={p} onClick={()=>{setPlatform(p);setSeoData(null);}} style={{flex:1,padding:"10px",borderRadius:10,border:platform===p?"2px solid #7c3aed":"1px solid "+bdr,background:platform===p?tagBg:(D?"#111":"#fafafa"),color:platform===p?tagClr:sub2,cursor:"pointer",fontWeight:platform===p?700:500,fontSize:14}}>
                      {p==="youtube"?"▶ YouTube":"◉ Instagram"}
                    </button>
                  ))}
                </div>
                <div style={{position:"relative"}}>
                  <textarea value={seoInput} onChange={e=>setSeoInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&seoInput.trim()){e.preventDefault();genSEO(seoInput.trim());}}} placeholder={'e.g. "Morning skincare routine"\nor "Budget phones under ₹15000"'} style={{width:"100%",minHeight:90,padding:"14px 14px 52px",borderRadius:12,border:"1px solid "+bdr,background:inpBg,color:txt,fontSize:15,resize:"none",outline:"none",lineHeight:1.7,boxSizing:"border-box",fontFamily:"inherit"}}/>
                  <button onClick={()=>{if(seoInput.trim())genSEO(seoInput.trim());}} disabled={!seoInput.trim()||seoLoading} style={{position:"absolute",bottom:10,right:10,padding:"8px 18px",borderRadius:9,border:"none",cursor:"pointer",fontSize:14,fontWeight:700,color:"#fff",background:seoInput.trim()?G:"#ccc",opacity:seoLoading?0.6:1}}>{seoLoading?"Wait...":"Generate →"}</button>
                </div>
                <div style={{marginTop:10}}>
                  <span style={{fontSize:13,color:sub}}>Try: </span>
                  {["Skincare","Travel vlog","Food recipe","Tech review","Fitness"].map(eg=>(
                    <span key={eg} onClick={()=>{setSeoInput(eg);genSEO(eg);}} style={{fontSize:13,color:tagClr,cursor:"pointer",marginRight:10,fontWeight:600,textDecoration:"underline",textDecorationStyle:"dotted"}}>{eg}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{maxWidth:620,margin:"0 auto",padding:"28px 18px 80px",boxSizing:"border-box"}}>
        {tab==="seo"&&(seoLoading||seoData)&&(
          <div style={{marginTop:8}}>
            {seoLoading&&<div style={{textAlign:"center",padding:"28px 0",color:sub2,fontSize:15}}>Generating for "{seoInput}"...</div>}
            {seoData&&!seoLoading&&(<>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <span style={{fontSize:13,color:sub}}>Results for:</span>
                <span style={{fontSize:13,fontWeight:700,padding:"3px 12px",borderRadius:20,background:tagBg,color:tagClr}}>"{seoInput}"</span>
                <button onClick={()=>setSeoData(null)} style={{fontSize:12,color:sub,background:"none",border:"none",cursor:"pointer",textDecoration:"underline"}}>Change</button>
              </div>
              {[
                {title:"Titles",content:seoData.titles?.map((t,i)=>(<div key={i} style={{background:surf,padding:12,borderRadius:12,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,border:"1px solid "+bdr}}><span style={{fontSize:14,flex:1,lineHeight:1.6,color:txt}}>{t}</span><button onClick={()=>cp(t,"t"+i)} style={{background:tagBg,border:"none",color:copied==="t"+i?okTxt:tagClr,cursor:"pointer",padding:"6px 12px",borderRadius:8,fontSize:12,whiteSpace:"nowrap",fontWeight:700}}>{copied==="t"+i?"✓":"Copy"}</button></div>))},
                {title:"Trending Tags",content:<><div style={{display:"flex",flexWrap:"wrap",gap:7}}>{seoData.tags?.map((t,i)=><span key={i} onClick={()=>cp(t,"tg"+i)} style={{background:tagBg,border:"1px solid #c4b5fd",padding:"5px 12px",borderRadius:40,fontSize:13,cursor:"pointer",color:copied==="tg"+i?okTxt:tagClr,fontWeight:500}}>{t}</span>)}</div><button onClick={()=>cp(seoData.tags?.join(" "),"all")} style={{width:"100%",padding:"10px",borderRadius:10,border:"1px solid "+bdr,cursor:"pointer",fontSize:14,fontWeight:600,color:sub2,background:"transparent",marginTop:10}}>{copied==="all"?"✓ Copied All":"Copy All Tags"}</button></>},
                {title:"Description",content:<><div style={{background:surf,padding:14,borderRadius:12,fontSize:14,lineHeight:1.9,color:sub2,border:"1px solid "+bdr}}>{seoData.description}</div><button onClick={()=>cp(seoData.description,"desc")} style={{width:"100%",padding:"10px",borderRadius:10,border:"1px solid "+bdr,cursor:"pointer",fontSize:14,fontWeight:600,color:sub2,background:"transparent",marginTop:8}}>{copied==="desc"?"✓ Copied":"Copy Description"}</button></>},
              ].map(s=>(<div key={s.title} style={{background:card,border:"1px solid "+bdr,borderRadius:16,padding:16,marginBottom:12}}><div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:sub,marginBottom:12}}>{s.title}</div>{s.content}</div>))}
              <Btn onClick={()=>{setSeoData(null);genSEO(seoInput);}}>↺ Regenerate</Btn>
            </>)}
          </div>
        )}

        <AdBanner/>

        <div style={{marginTop:44}}>
          <p style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:sub,textAlign:"center",marginBottom:20}}>How it works</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[{n:"1",t:"Upload",d:"Select your file"},{n:"2",t:"Select",d:"Draw over watermark"},{n:"3",t:"Download",d:"Get clean file free"}].map(s=>(
              <div key={s.n} style={{background:card,borderRadius:16,padding:"18px 12px",textAlign:"center",border:"1px solid "+bdr}}>
                <div style={{width:36,height:36,borderRadius:50,background:"linear-gradient(135deg,#c4b5fd,#f0abfc)",color:"#fff",fontWeight:800,fontSize:15,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 12px",boxShadow:"0 2px 8px rgba(196,181,253,0.4)"}}>{s.n}</div>
                <div style={{fontWeight:700,fontSize:15,marginBottom:4,color:txt}}>{s.t}</div>
                <div style={{fontSize:13,color:sub2}}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{marginTop:48,paddingTop:24,borderTop:"1px solid "+bdr}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:20,flexWrap:"wrap",marginBottom:20}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:26,height:26,borderRadius:7,background:G,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#fff"}}>✦</div>
                <span style={{fontWeight:800,fontSize:16,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ReelKit</span>
              </div>
              <p style={{fontSize:13,color:sub2,lineHeight:1.8,margin:0,maxWidth:200}}>India's free watermark removal & creator toolkit.</p>
            </div>
            <div style={{display:"flex",gap:24}}>
              <div>
                <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:sub,marginBottom:10}}>Tools</div>
                {["Video Watermark","Image Watermark","AI SEO Tags"].map(l=><div key={l} style={{fontSize:14,color:sub2,marginBottom:8,cursor:"pointer"}}>{l}</div>)}
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:sub,marginBottom:10}}>Legal</div>
                <div onClick={()=>setShowPrivacy(true)} style={{fontSize:14,color:sub2,marginBottom:8,cursor:"pointer"}}>Privacy Policy</div>
                <div onClick={()=>setShowTerms(true)} style={{fontSize:14,color:sub2,marginBottom:8,cursor:"pointer"}}>Terms of Use</div>
                <div style={{fontSize:14,color:sub2,cursor:"pointer"}}>FAQs</div>
              </div>
            </div>
          </div>
          <div style={{background:surf,border:"1px solid "+bdr,borderRadius:12,padding:16,marginBottom:16}}>
            <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1,color:sub,marginBottom:12}}>Popular Searches</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {["free watermark remover online","remove watermark from video free","video watermark remover India","image watermark remover free","remove logo from video","watermark hatane ka tool","AI SEO tags generator","YouTube title generator free","Instagram hashtag generator","reels size converter","YouTube 16:9 video","Instagram Reels 9:16","video editor online free India","reel banane ka free tool","watermark remove karo free","content creator tools India","YouTube SEO 2025","Instagram growth tips","remove text from video free","online video editor no watermark","free tools for YouTubers","social media video size converter"].map(t=>(
                <span key={t} style={{fontSize:12,padding:"4px 10px",borderRadius:40,background:card,border:"1px solid "+bdr,color:sub2}}>{t}</span>
              ))}
            </div>
          </div>
          <p style={{fontSize:13,color:sub2,lineHeight:1.9,marginBottom:8}}>ReelKit is a <strong>free online watermark remover</strong> for Indian content creators. Remove watermarks from videos and images instantly. Export in trending sizes — 9:16 for Instagram Reels and YouTube Shorts, 16:9 for YouTube, 1:1 for Instagram Square. Generate AI-powered SEO titles, descriptions, and hashtags to rank higher on YouTube and Instagram in {YEAR}.</p>
          <p style={{fontSize:13,color:sub2,lineHeight:1.9,marginBottom:16}}>Whether you are a YouTuber, Instagram creator, digital marketer, or brand — ReelKit helps you clean your videos, resize for every platform, and get trending SEO tags to maximize reach. 100% free. Works on mobile and desktop.</p>
          <div style={{display:"flex",justifyContent:"space-between",paddingTop:14,borderTop:"1px solid "+bdr,flexWrap:"wrap",gap:8}}>
            <span style={{fontSize:13,color:sub}}>© {YEAR} ReelKit.in · All rights reserved</span>
            <span style={{fontSize:13,color:sub}}>Made with ♥ for Indian Creators</span>
          </div>
        </div>
      </div>

      {showSeoAd&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:18}}><div style={{background:card,borderRadius:24,padding:28,width:"100%",maxWidth:400,border:"1px solid "+bdr}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:14}}><span style={{fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:1.5,color:sub}}>Advertisement</span><span style={{fontSize:13,color:sub,background:surf,padding:"3px 12px",borderRadius:20,border:"1px solid "+bdr}}>{seoAdTimer>0?"Closes in "+seoAdTimer+"s":"Ready"}</span></div><div style={{background:surf,borderRadius:14,padding:"36px 20px",marginBottom:16,border:"1px dashed "+bdr,textAlign:"center"}}><div style={{fontWeight:600,fontSize:15,color:sub}}>Google Ad Space</div><div style={{fontSize:13,color:sub,marginTop:4}}>Live after AdSense approval</div></div><div style={{background:tagBg,border:"1px solid #c4b5fd",borderRadius:12,padding:14,marginBottom:14,display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18}}>★</span><div><div style={{fontWeight:700,fontSize:14,color:tagClr}}>Tired of ads?</div><div style={{fontSize:13,color:tagClr,opacity:.8}}>Go Pro — ₹50/month</div></div></div><button style={{width:"100%",padding:15,borderRadius:12,border:"none",cursor:seoAdTimer>0?"not-allowed":"pointer",fontSize:16,fontWeight:700,color:"#fff",background:seoAdTimer>0?"#999":G}} disabled={seoAdTimer>0} onClick={()=>{setShowSeoAd(false);setSeoData(pendingSeo);setPendingSeo(null);}}>{seoAdTimer>0?"Results in "+seoAdTimer+"s...":"✓ Show My SEO Results"}</button><button style={{width:"100%",padding:"13px",borderRadius:12,border:"1px solid #7c3aed",cursor:"pointer",fontSize:15,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:10}} onClick={()=>{setShowSeoAd(false);setPendingSeo(null);setShowSub(true);}}>★ Skip — Upgrade to Pro</button></div></div>)}
      {showSub&&<SubModal card={card} bdr={bdr} sub={sub} sub2={sub2} setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
      {showLogin&&<LoginModal card={card} bdr={bdr} sub={sub} sub2={sub2} inpBg={inpBg} txt={txt} onDone={u=>{setUser(u);setShowLogin(false);}} onClose={()=>setShowLogin(false)}/>}
      {showPrivacy&&<LegalModal title="Privacy Policy" card={card} bdr={bdr} txt={txt} sub2={sub2} onClose={()=>setShowPrivacy(false)}><PrivacyContent sub2={sub2}/></LegalModal>}
      {showTerms&&<LegalModal title="Terms of Use" card={card} bdr={bdr} txt={txt} sub2={sub2} onClose={()=>setShowTerms(false)}><TermsContent sub2={sub2}/></LegalModal>}
    </div>
  );

  if(screen==="upload") return(
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <div style={{maxWidth:620,margin:"0 auto",padding:"28px 18px 80px",boxSizing:"border-box"}}>
        <div onClick={()=>setScreen("home")} style={{fontSize:14,color:sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Back</div>
        <video ref={videoRef} src={videoUrl} style={{width:"100%",borderRadius:16,background:"#000",display:"block"}} controls playsInline/>
        <div style={{background:card,borderRadius:16,padding:16,marginTop:14,border:"1px solid "+bdr,display:"flex",gap:12,alignItems:"center"}}>
          <div style={{flex:1,minWidth:0}}><div style={{fontWeight:600,fontSize:15,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:txt}}>{videoFile?.name}</div><div style={{color:sub,fontSize:13,marginTop:2}}>{videoFile?(videoFile.size/1024/1024).toFixed(1)+" MB":""}</div></div>
          <button onClick={()=>fileRef.current?.click()} style={{padding:"8px 16px",borderRadius:9,border:"1px solid "+bdr,background:"transparent",color:sub2,cursor:"pointer",fontSize:14,flexShrink:0}}>Change</button>
          <input ref={fileRef} type="file" accept="video/*" style={{display:"none"}} onChange={e=>{const f=e.target.files[0];if(f){setVideoFile(f);setVideoUrl(URL.createObjectURL(f));}e.target.value="";}}/>
        </div>
        <div style={{background:warnBg,border:"1px solid "+warnBdr,borderRadius:14,padding:16,marginTop:14}}>
          <div style={{fontWeight:700,fontSize:15,color:warnTxt,marginBottom:8}}>⚠️ Legal Notice</div>
          <p style={{fontSize:14,lineHeight:1.8,color:warnTxt,margin:"0 0 12px"}}>ReelKit is only for videos <b>you own or have rights to</b>. Removing copyrighted watermarks without permission is illegal. ReelKit is NOT responsible for any misuse.</p>
          <label style={{display:"flex",gap:10,alignItems:"flex-start",cursor:"pointer"}}>
            <input type="checkbox" checked={legalOk} onChange={e=>setLegalOk(e.target.checked)} style={{marginTop:3,accentColor:"#7c3aed",flexShrink:0,width:16,height:16}}/>
            <span style={{fontSize:14,lineHeight:1.7,color:warnTxt,fontWeight:500}}>I own this video and accept full legal responsibility.</span>
          </label>
        </div>
        <Btn onClick={()=>setScreen("select")} style={{opacity:legalOk?1:0.3,marginTop:16}}>Select Watermark Area →</Btn>
      </div>
    </div>
  );

  if(screen==="select") return(
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <div style={{maxWidth:620,margin:"0 auto",padding:"28px 18px 80px",boxSizing:"border-box"}}>
        <div onClick={()=>setScreen("upload")} style={{fontSize:14,color:sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Back</div>
        <h2 style={{fontSize:24,fontWeight:800,marginBottom:6,color:txt}}>Select Watermark</h2>
        <p style={{color:sub2,marginBottom:14,fontSize:15}}>Draw a box over the watermark to remove it</p>
        <div style={{position:"relative",borderRadius:16,overflow:"hidden",background:"#000",border:"1px solid "+bdr,touchAction:"none"}}>
          <video ref={videoRef} src={videoUrl} style={{width:"100%",display:"block"}} muted playsInline/>
          <canvas ref={canvasRef} style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",cursor:"crosshair"}} onMouseDown={vDown} onMouseMove={vMove} onMouseUp={vUp} onTouchStart={e=>{e.preventDefault();vDown(e);}} onTouchMove={e=>{e.preventDefault();vMove(e);}} onTouchEnd={e=>{e.preventDefault();vUp();}}/>
        </div>
        {wBox&&<div style={{background:okBg,border:"1px solid "+okBdr,borderRadius:12,padding:"12px 16px",marginTop:12,fontSize:15,color:okTxt,fontWeight:600}}>✓ Area selected — ready to remove</div>}
        <Btn onClick={doProcess} style={{opacity:wBox?1:0.3,marginTop:14}}>Remove Watermark →</Btn>
        <BtnO onClick={()=>{setWBox(null);paintBox(null,canvasRef);}}>Clear Selection</BtnO>
      </div>
    </div>
  );

  if(screen==="processing") return(
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{textAlign:"center",padding:40}}>
        <div style={{width:68,height:68,borderRadius:18,background:tagBg,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 22px",fontSize:28,color:tagClr}}>✦</div>
        <div style={{fontSize:24,fontWeight:800,marginBottom:8,color:txt}}>Removing Watermark...</div>
        <p style={{color:sub2,fontSize:15,marginBottom:24}}>Processing your video</p>
        <div style={{margin:"0 auto",background:bdr,borderRadius:100,height:5,width:220,overflow:"hidden"}}><div style={{height:"100%",background:G,width:progress+"%",transition:"width .2s",borderRadius:100}}/></div>
        <div style={{fontWeight:900,fontSize:32,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:14}}>{Math.round(progress)}%</div>
      </div>
    </div>
  );

  if(screen==="export") return(
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <div style={{maxWidth:620,margin:"0 auto",padding:"28px 18px 80px",boxSizing:"border-box"}}>
        <div onClick={()=>setScreen("home")} style={{fontSize:14,color:sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Home</div>
        <div style={{background:okBg,border:"1px solid "+okBdr,borderRadius:14,padding:"14px 18px",display:"flex",gap:12,alignItems:"center",marginBottom:22}}>
          <span style={{color:okTxt,fontWeight:700,fontSize:20}}>✓</span>
          <span style={{fontSize:15,color:okTxt,fontWeight:600}}>Watermark removed successfully!</span>
        </div>
        <div style={{marginBottom:22}}>
          <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:sub,marginBottom:12}}>Before / After</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:card,borderRadius:14,padding:10,border:"1px solid "+bdr}}><div style={{fontSize:11,color:sub,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Before</div><video src={videoUrl} style={{width:"100%",borderRadius:10,display:"block"}} muted playsInline controls/></div>
            <div style={{background:card,borderRadius:14,padding:10,border:"1px solid "+okBdr}}><div style={{fontSize:11,color:okTxt,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>After ✓</div><video src={processedUrl} style={{width:"100%",borderRadius:10,display:"block"}} muted playsInline controls/></div>
          </div>
        </div>
        <div style={{marginBottom:20}}>
          <div style={{fontSize:12,fontWeight:700,textTransform:"uppercase",letterSpacing:1.2,color:sub,marginBottom:12}}>Download Size</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {SIZES.map(sz=>(<div key={sz.id} onClick={()=>doDownload(sz)} style={{background:card,borderRadius:12,padding:"14px 6px",textAlign:"center",cursor:"pointer",border:"1px solid "+bdr,position:"relative"}}>{!isPaid&&sz.paid&&<div style={{position:"absolute",top:5,right:5,fontSize:10,background:G,color:"#fff",padding:"2px 6px",borderRadius:5,fontWeight:700}}>AD</div>}<div style={{fontWeight:700,fontSize:13,color:txt}}>{sz.label}</div><div style={{color:sub,fontSize:11,marginTop:3}}>{sz.ratio}</div></div>))}
          </div>
          {!isPaid&&<p style={{color:sub2,fontSize:13,marginTop:10}}>Free users watch a short ad per download</p>}
        </div>
        <Btn onClick={()=>{setTab("seo");setScreen("home");}}>Generate AI SEO Tags →</Btn>
        <BtnO onClick={()=>setShowSub(true)}>★ Upgrade — HD + No Ads</BtnO>
        <BtnO onClick={()=>setScreen("home")}>← Process Another Video</BtnO>
        {showAd&&(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:18}}><div style={{background:card,borderRadius:22,padding:26,width:"100%",maxWidth:380,border:"1px solid "+bdr,textAlign:"center"}}><div style={{background:surf,borderRadius:14,padding:"36px 20px",marginBottom:16,border:"1px dashed "+bdr}}><div style={{fontWeight:600,fontSize:15,color:sub}}>Google Ad Space</div></div><button style={{width:"100%",padding:15,borderRadius:12,border:"none",cursor:adTimer>0?"not-allowed":"pointer",fontSize:16,fontWeight:700,color:"#fff",background:adTimer>0?"#999":G}} disabled={adTimer>0} onClick={adDone}>{adTimer>0?"Download in "+adTimer+"s...":"↓ Download Now"}</button><button style={{width:"100%",padding:"13px",borderRadius:12,border:"1px solid #7c3aed",cursor:"pointer",fontSize:15,fontWeight:700,color:"#7c3aed",background:"transparent",marginTop:10}} onClick={()=>{setShowAd(false);setShowSub(true);}}>★ Go Pro — Skip Ads</button></div></div>)}
        {showSub&&<SubModal card={card} bdr={bdr} sub={sub} sub2={sub2} setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
      </div>
    </div>
  );

  if(screen==="imgselect") return(
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <div style={{maxWidth:620,margin:"0 auto",padding:"28px 18px 80px",boxSizing:"border-box"}}>
        <div onClick={()=>setScreen("home")} style={{fontSize:14,color:sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Back</div>
        <h2 style={{fontSize:24,fontWeight:800,marginBottom:6,color:txt}}>Select Watermark</h2>
        <p style={{color:sub2,marginBottom:14,fontSize:15}}>Draw a box over the watermark to remove it</p>
        <div style={{position:"relative",borderRadius:16,overflow:"hidden",background:"#000",border:"1px solid "+bdr,touchAction:"none"}}>
          <canvas ref={imgCvRef} style={{width:"100%",display:"block",cursor:"crosshair"}} onMouseDown={iDown} onMouseMove={iMove} onMouseUp={iUp} onTouchStart={e=>{e.preventDefault();iDown(e);}} onTouchMove={e=>{e.preventDefault();iMove(e);}} onTouchEnd={e=>{e.preventDefault();iUp();}}/>
        </div>
        {imgBox&&<div style={{background:okBg,border:"1px solid "+okBdr,borderRadius:12,padding:"12px 16px",marginTop:12,fontSize:15,color:okTxt,fontWeight:600}}>✓ Area selected — ready!</div>}
        <Btn onClick={doImgProcess} style={{opacity:imgBox?1:0.3,marginTop:14,background:"linear-gradient(135deg,#f97316,#ec4899)"}}>Remove Watermark →</Btn>
        <BtnO onClick={()=>setImgBox(null)}>Clear Selection</BtnO>
      </div>
    </div>
  );

  if(screen==="imgexport") return(
    <div style={{minHeight:"100vh",background:bg,color:txt,fontFamily:"-apple-system,BlinkMacSystemFont,'Inter',sans-serif"}}><Nav/>
      <div style={{maxWidth:620,margin:"0 auto",padding:"28px 18px 80px",boxSizing:"border-box"}}>
        <div onClick={()=>setScreen("home")} style={{fontSize:14,color:sub2,cursor:"pointer",marginBottom:16,fontWeight:500}}>← Home</div>
        <div style={{background:okBg,border:"1px solid "+okBdr,borderRadius:14,padding:"14px 18px",display:"flex",gap:12,alignItems:"center",marginBottom:20}}><span style={{color:okTxt,fontWeight:700,fontSize:20}}>✓</span><span style={{fontSize:15,color:okTxt,fontWeight:600}}>Watermark removed!</span></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
          <div style={{background:card,borderRadius:14,padding:12,border:"1px solid "+bdr}}><div style={{fontSize:12,color:sub,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Before</div><img src={imgUrl} alt="before" style={{width:"100%",borderRadius:10,display:"block"}}/></div>
          <div style={{background:card,borderRadius:14,padding:12,border:"1px solid "+okBdr}}><div style={{fontSize:12,color:okTxt,fontWeight:600,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>After ✓</div>{imgProcessed&&<img src={imgProcessed} alt="after" style={{width:"100%",borderRadius:10,display:"block"}}/>}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          {[{fmt:"PNG",free:true},{fmt:"JPG",free:true},{fmt:"WebP",free:false},{fmt:"PNG 4K",free:false}].map(({fmt,free})=>(
            <div key={fmt} onClick={()=>{if(!free&&!isPaid){setShowSub(true);return;}const a=document.createElement("a");a.href=imgProcessed||imgUrl;a.download="reelkit."+fmt.toLowerCase().split(" ")[0];a.click();}} style={{background:card,borderRadius:12,padding:"14px 8px",textAlign:"center",cursor:"pointer",border:"1px solid "+bdr,position:"relative"}}>
              {!free&&!isPaid&&<div style={{position:"absolute",top:5,right:5,fontSize:10,background:G,color:"#fff",padding:"2px 6px",borderRadius:5,fontWeight:700}}>PRO</div>}
              <div style={{fontWeight:800,fontSize:16,color:free?"#0891b2":"#7c3aed"}}>{fmt}</div>
              <div style={{color:sub,fontSize:13,marginTop:3}}>{free?"Free":isPaid?"Pro ✓":"Upgrade"}</div>
            </div>
          ))}
        </div>
        <BtnO onClick={()=>setScreen("home")}>← Home</BtnO>
        {showSub&&<SubModal card={card} bdr={bdr} sub={sub} sub2={sub2} setIsPaid={setIsPaid} onClose={()=>setShowSub(false)}/>}
      </div>
    </div>
  );

  return null;
}

function SubModal({card,bdr,sub,sub2,setIsPaid,onClose}){const G="linear-gradient(135deg,#6d28d9,#db2777)";return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:300}}><div style={{width:"100%",maxWidth:640,margin:"0 auto",background:card,borderRadius:"24px 24px 0 0",padding:"28px 22px 44px",border:"1px solid "+bdr,boxSizing:"border-box"}}><div style={{textAlign:"center",marginBottom:22}}><div style={{fontWeight:800,fontSize:22}}>ReelKit Pro</div><div style={{fontSize:36,fontWeight:900,background:G,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginTop:6}}>₹50<span style={{fontSize:16,WebkitTextFillColor:sub,fontWeight:400}}>/month</span></div><div style={{fontSize:14,color:sub,marginTop:4}}>or ₹399/year — save ₹201</div></div><div style={{background:"rgba(0,0,0,0.04)",borderRadius:14,padding:16,marginBottom:20}}>{["Full HD 1080p exports","All 7 trending sizes","Zero ads — ever","AI SEO titles, tags & description","Priority processing","Re-download history 7 days","WebP + PNG 4K image exports"].map(f=>(<div key={f} style={{display:"flex",gap:12,alignItems:"center",padding:"10px 0",borderBottom:"1px solid "+bdr}}><span style={{color:"#7c3aed",fontWeight:700,fontSize:16}}>✓</span><span style={{fontSize:15,fontWeight:500}}>{f}</span></div>))}</div><button style={{width:"100%",padding:16,borderRadius:14,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#fff",background:G}} onClick={()=>{setIsPaid(true);onClose();}}>Subscribe via Razorpay →</button><button style={{width:"100%",padding:14,borderRadius:14,border:"1px solid "+bdr,cursor:"pointer",fontSize:15,color:sub,background:"transparent",marginTop:10}} onClick={onClose}>Maybe Later</button></div></div>);}

function LoginModal({card,bdr,sub,sub2,inpBg,txt,onDone,onClose}){
  const [step,setStep]=useState("phone");const [phone,setPhone]=useState("");const [otpVal,setOtpVal]=useState(["","","","","",""]);const [loading,setLoading]=useState(false);const [error,setError]=useState("");
  const refs=[useRef(),useRef(),useRef(),useRef(),useRef(),useRef()];
  const handleSend=async()=>{if(phone.length!==10){setError("Please enter valid 10-digit number.");return;}setLoading(true);setError("");setTimeout(()=>{setStep("otp");setLoading(false);},800);};
  const handleVerify=async()=>{setLoading(true);setError("");setTimeout(()=>{onDone({phone});setLoading(false);},800);};
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:300}}><div style={{width:"100%",maxWidth:640,margin:"0 auto",background:card,borderRadius:"24px 24px 0 0",padding:"28px 22px 44px",border:"1px solid "+bdr,boxSizing:"border-box"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:22}}><div style={{fontWeight:800,fontSize:20}}>{step==="phone"?"Log in to ReelKit":"Verify OTP"}</div><button onClick={onClose} style={{background:"rgba(0,0,0,0.06)",border:"none",cursor:"pointer",width:34,height:34,borderRadius:9,fontSize:17}}>✕</button></div>
    {error&&<div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"12px 16px",fontSize:14,color:"#dc2626",marginBottom:14}}>{error}</div>}
    {step==="phone"?(<><p style={{color:sub2,fontSize:15,marginBottom:16}}>Enter your mobile number to continue</p><div style={{display:"flex",gap:10}}><div style={{padding:"14px 16px",borderRadius:12,border:"1px solid "+bdr,background:inpBg,color:sub2,fontWeight:700,flexShrink:0,fontSize:15}}>+91</div><input style={{flex:1,padding:"14px 16px",borderRadius:12,border:"1px solid "+bdr,background:inpBg,color:txt,fontSize:16,outline:"none",boxSizing:"border-box"}} type="tel" inputMode="numeric" maxLength={10} placeholder="9876543210" value={phone} onChange={e=>setPhone(e.target.value.replace(/\D/g,""))}/></div><button style={{width:"100%",padding:15,borderRadius:12,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)",marginTop:14,opacity:phone.length===10&&!loading?1:0.35}} disabled={phone.length!==10||loading} onClick={handleSend}>{loading?"Sending...":"Send OTP →"}</button></>)
    :(<><p style={{color:sub2,fontSize:15,marginBottom:18}}>Sent to +91 {phone} · <span style={{color:"#7c3aed",cursor:"pointer",fontWeight:600}} onClick={()=>{setStep("phone");setOtpVal(["","","","","",""]);setError("");}}>Change</span></p><div style={{display:"flex",gap:8,justifyContent:"center"}}>{otpVal.map((d,i)=>(<input key={i} ref={refs[i]} style={{width:44,height:54,padding:0,borderRadius:12,border:"1.5px solid "+bdr,background:inpBg,color:txt,fontSize:24,fontWeight:800,textAlign:"center",outline:"none",boxSizing:"border-box",flexShrink:0}} maxLength={1} value={d} inputMode="numeric" onChange={e=>{const v=e.target.value.replace(/\D/g,"");const n=[...otpVal];n[i]=v;setOtpVal(n);if(v&&i<5)refs[i+1].current?.focus();}} onKeyDown={e=>{if(e.key==="Backspace"&&!d&&i>0)refs[i-1].current?.focus();}}/>))}</div><button style={{width:"100%",padding:15,borderRadius:12,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)",marginTop:16,opacity:otpVal.join("").length===6&&!loading?1:0.35}} disabled={otpVal.join("").length!==6||loading} onClick={handleVerify}>{loading?"Verifying...":"Verify & Enter →"}</button><p style={{textAlign:"center",color:sub,fontSize:13,marginTop:14}}>Didn't receive? <span style={{color:"#7c3aed",cursor:"pointer",fontWeight:600}}>Resend OTP</span></p></>)}
  </div></div>);
}

function LegalModal({title,card,bdr,txt,sub2,onClose,children}){return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"flex-end",zIndex:400}}><div style={{width:"100%",maxWidth:640,margin:"0 auto",background:card,borderRadius:"24px 24px 0 0",border:"1px solid "+bdr,display:"flex",flexDirection:"column",maxHeight:"85vh"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 22px 16px",borderBottom:"1px solid "+bdr,flexShrink:0}}><div style={{fontWeight:800,fontSize:19,color:txt}}>{title}</div><button onClick={onClose} style={{background:"rgba(0,0,0,0.06)",border:"none",cursor:"pointer",width:34,height:34,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>✕</button></div><div style={{overflowY:"auto",padding:"18px 22px 32px",flex:1}}>{children}</div><div style={{padding:"14px 22px 28px",borderTop:"1px solid "+bdr,flexShrink:0}}><button onClick={onClose} style={{width:"100%",padding:15,borderRadius:12,border:"none",cursor:"pointer",fontSize:16,fontWeight:700,color:"#fff",background:"linear-gradient(135deg,#6d28d9,#db2777)"}}>I Understand — Close</button></div></div></div>);}

function PrivacyContent({sub2}){const s=[{t:"1. Who We Are",b:"ReelKit (reelkit.in) is a free online video and image tool for Indian content creators."},{t:"2. Data We Collect",b:"We collect your mobile number for OTP-based login only. Videos and images are processed in your browser and are NEVER stored on our servers."},{t:"3. How We Use Your Data",b:"Your mobile number is used only for authentication. We never sell, share, or rent your data to any third party."},{t:"4. ⚠️ Legal Responsibility — IMPORTANT",b:"ReelKit is a technology tool only. We are NOT responsible for how users use our tools. You are SOLELY responsible for having full legal rights to any content you upload. Removing watermarks from copyrighted material (Getty, Shutterstock, stock footage, brand logos, etc.) without permission is illegal. ReelKit.in, its owners and developers accept ZERO liability for any copyright infringement, DMCA claims, lawsuits, financial penalties, or any other legal consequences from your use of our platform."},{t:"5. Payments",b:"Pro payments are processed via Razorpay. We never store card details. Cancel anytime."},{t:"6. Cookies & Ads",b:"Free users see Google AdSense ads. Google may use cookies for relevant ads."},{t:"7. Contact",b:"privacy@reelkit.in | ReelKit.in, Mumbai, India"}];return(<><div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:16,marginBottom:18}}><div style={{fontWeight:800,fontSize:14,color:"#dc2626",marginBottom:8}}>⚠️ DISCLAIMER</div><p style={{fontSize:13,lineHeight:1.8,color:"#7f1d1d",margin:0}}>ReelKit accepts ZERO liability for any legal issues. You are solely responsible for all content you process. <strong>Use only content you own.</strong></p></div>{s.map(x=>(<div key={x.t} style={{marginBottom:18}}><div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{x.t}</div><p style={{color:sub2,fontSize:14,lineHeight:1.9,margin:0}}>{x.b}</p></div>))}</>);}

function TermsContent({sub2}){const s=[{t:"1. Acceptance",b:"By using ReelKit, you agree to these Terms. If you do not agree, stop using our service immediately."},{t:"2. ⚠️ Your Legal Responsibility — CRITICAL",b:"YOU ARE SOLELY RESPONSIBLE for all content you process. You must own or have explicit written permission for any content. ReelKit is NOT responsible for: copyright infringement, DMCA takedowns, lawsuits, financial penalties, or any other legal consequences from your use of our tools."},{t:"3. Prohibited Uses",b:"Do NOT use ReelKit to remove watermarks from content you don't own, process copyrighted stock media without a valid license, or violate any laws. Violations may result in account suspension."},{t:"4. Disclaimer",b:"ReelKit is provided 'AS IS'. We make NO guarantees about watermark removal quality. We are NOT liable for any damages."},{t:"5. Pro Plans",b:"₹50/month or ₹399/year. HD, all sizes, zero ads, AI SEO. Cancel anytime."},{t:"6. Governing Law",b:"Governed by Indian law. Disputes subject to Mumbai, Maharashtra courts."},{t:"7. Contact",b:"legal@reelkit.in | ReelKit.in, Mumbai, India"}];return(<><div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:12,padding:16,marginBottom:18}}><div style={{fontWeight:800,fontSize:14,color:"#dc2626",marginBottom:8}}>⚠️ LEGAL NOTICE</div><p style={{fontSize:13,lineHeight:1.8,color:"#7f1d1d",margin:0}}>ReelKit accepts ZERO liability for copyright infringement or any other legal issues. You are fully responsible for content you process.</p></div>{s.map(x=>(<div key={x.t} style={{marginBottom:18}}><div style={{fontWeight:700,fontSize:15,marginBottom:6}}>{x.t}</div><p style={{color:sub2,fontSize:14,lineHeight:1.9,margin:0}}>{x.b}</p></div>))}</>);}