import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";

const C = {
  bg:"#F8F8F7", surf:"#FFFFFF", nav:"#F1F0EC",
  bord:"#E6E4E0", bord2:"#D2D0CA",
  t1:"#1C1A17", t2:"#4B4944", t3:"#9E9C94",
  teal:"#0C464B", green:"#1F8A5B", red:"#B4232C",
};

const METRICS = [
  { label:"Body Fat",  val:"14.2%",  delta:"-2.1%", good:true,  col:"#E8724A" },
  { label:"Lean Mass", val:"155 lb",  delta:"+1.8%", good:true,  col:"#4A90E2" },
  { label:"HRV",       val:"68 ms",  delta:"+12%",  good:true,  col:"#8B5CF6" },
  { label:"Sleep",     val:"7h 42m", delta:"+8%",   good:true,  col:"#A78BFA" },
  { label:"Steps",     val:"11,240", delta:"+5%",   good:true,  col:"#F59E0B" },
  { label:"Protein",   val:"178g",   delta:"+3%",   good:true,  col:"#34D399" },
];

const OPEN_USERS = [
  { name:"Brandon B.", handle:"brandon", bodyFat:"14.2%", hrv:"68ms", steps:"11.2k", streak:47 },
  { name:"Alex M.",    handle:"alexm",   bodyFat:"18.1%", hrv:"52ms", steps:"9.8k",  streak:31 },
  { name:"Sam K.",     handle:"samk",    bodyFat:"22.4%", hrv:"44ms", steps:"8.1k",  streak:12 },
];

const FEATURES = [
  { icon:"📱", title:"Syncs from Apple Health",    desc:"Connect once from the iOS app. Every workout, sleep session, and body scan automatically flows in." },
  { icon:"📊", title:"80+ health KPIs tracked",    desc:"Body composition, sleep quality, HRV, nutrition, training volume — organized the way your body is." },
  { icon:"🌍", title:"Open Health community",      desc:"Opt in to share your data publicly. See how your metrics compare to others on the same journey." },
  { icon:"🏆", title:"Leaderboards & rankings",    desc:"Who has the best HRV? Most consistent sleep? Top protein intake? Real data, real people." },
  { icon:"🧠", title:"AI health coach",            desc:"Daily morning, midday, and evening briefs powered by Claude. Personalized to your actual data." },
  { icon:"📈", title:"Full history & correlations",desc:"Click any metric to see the full histogram, compare to past periods, and spot what moves with what." },
];

function MiniCard({ m }) {
  return (
    <div style={{background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"14px",padding:"14px 15px 12px",minWidth:0,display:"flex",flexDirection:"column"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:"8px",gap:"6px"}}>
        <span style={{fontFamily:"'Archivo',sans-serif",fontSize:"10px",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:C.t3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.label}</span>
        <span style={{fontSize:"11px",fontWeight:600,padding:"2px 7px",borderRadius:"6px",whiteSpace:"nowrap",flexShrink:0,
          background:m.good?"rgba(31,138,91,0.09)":"rgba(180,35,44,0.09)",
          color:m.good?C.green:C.red}}>{m.delta}</span>
      </div>
      <span style={{fontSize:"28px",fontFamily:"'Jomolhari','Georgia',serif",color:C.t1,lineHeight:1,marginBottom:"4px"}}>{m.val}</span>
      <div style={{height:"28px",marginTop:"auto",background:`linear-gradient(90deg,${m.col}22,${m.col}44)`,borderRadius:"4px",overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",inset:0,background:`repeating-linear-gradient(90deg,transparent,transparent 8%,${m.col}33 8%,${m.col}33 9%)`}}/>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (isSignedIn) navigate("/dashboard", { replace: true });
  }, [isSignedIn]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <div style={{background:C.bg,color:C.t1,fontFamily:"'Inter',system-ui,sans-serif",minHeight:"100vh",WebkitFontSmoothing:"antialiased"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Jomolhari&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        a{color:inherit;text-decoration:none}
      `}</style>

      {/* Nav */}
      <nav style={{position:"sticky",top:0,zIndex:100,background:scrolled?C.surf:C.bg,borderBottom:`1px solid ${scrolled?C.bord:"transparent"}`,transition:"all 0.2s",padding:"0 5vw"}}>
        <div style={{maxWidth:"1120px",margin:"0 auto",display:"flex",alignItems:"center",height:"60px",gap:"16px"}}>
          <div style={{display:"flex",alignItems:"center",gap:"9px",flex:1}}>
            <div style={{width:"28px",height:"28px",borderRadius:"8px",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"14px",color:"#F8F8F7",flexShrink:0}}>B</div>
            <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"15px",color:C.t1}}>BodyData</span>
          </div>
          <a href="/health" style={{fontSize:"13.5px",color:C.t2,fontWeight:500}}>Open Health</a>
          <div style={{width:"1px",height:"16px",background:C.bord}}/>
          <button onClick={()=>navigate("/sign-in")} style={{background:"transparent",border:"none",cursor:"pointer",fontSize:"13.5px",color:C.t2,fontWeight:500,fontFamily:"inherit"}}>Sign in</button>
          <button onClick={()=>navigate("/sign-up")} style={{background:C.teal,color:"#F8F8F7",border:"none",borderRadius:"8px",padding:"8px 18px",fontSize:"13.5px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Get started free</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{maxWidth:"1120px",margin:"0 auto",padding:"80px 5vw 60px",textAlign:"center"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:"7px",background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"20px",padding:"5px 14px",marginBottom:"28px",fontSize:"12px",color:C.t3,fontWeight:500}}>
          <div style={{width:"6px",height:"6px",borderRadius:"50%",background:C.green}}/>
          Open Health data · real people · real results
        </div>
        <h1 style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"clamp(36px,6vw,68px)",lineHeight:1.1,color:C.t1,marginBottom:"22px",letterSpacing:"-0.02em"}}>
          Your body's data,<br/>
          <span style={{color:C.teal}}>beautifully transparent</span>
        </h1>
        <p style={{fontSize:"clamp(16px,2.2vw,20px)",color:C.t2,maxWidth:"560px",margin:"0 auto 36px",lineHeight:1.65,fontWeight:400}}>
          Connect Apple Health, track 80+ KPIs, and optionally share your health journey with an open community — like Baremetrics, but for your body.
        </p>
        <div style={{display:"flex",gap:"12px",justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>navigate("/sign-up")} style={{background:C.teal,color:"#F8F8F7",border:"none",borderRadius:"10px",padding:"14px 32px",fontSize:"15px",fontWeight:600,cursor:"pointer",fontFamily:"inherit",boxShadow:`0 4px 16px ${C.teal}44`}}>
            Start tracking free →
          </button>
          <button onClick={()=>navigate("/health")} style={{background:C.surf,color:C.t1,border:`1px solid ${C.bord}`,borderRadius:"10px",padding:"14px 32px",fontSize:"15px",fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
            Browse Open Health
          </button>
        </div>
        <p style={{fontSize:"12px",color:C.t3,marginTop:"14px"}}>Free forever · No credit card · iOS app included</p>
      </section>

      {/* Dashboard preview — KPI cards */}
      <section style={{maxWidth:"1120px",margin:"0 auto",padding:"0 5vw 80px"}}>
        <div style={{background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"20px",padding:"28px",boxShadow:"0 8px 48px rgba(28,26,23,.06)"}}>
          <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"20px"}}>
            <div style={{width:"10px",height:"10px",borderRadius:"50%",background:"#FC5C57"}}/>
            <div style={{width:"10px",height:"10px",borderRadius:"50%",background:"#FEBC2E"}}/>
            <div style={{width:"10px",height:"10px",borderRadius:"50%",background:"#28C840"}}/>
            <span style={{fontFamily:"'Archivo',sans-serif",fontSize:"12px",color:C.t3,marginLeft:"6px"}}>biotrack.app/dashboard</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:"12px"}}>
            {METRICS.map(m=><MiniCard key={m.label} m={m}/>)}
          </div>
        </div>
      </section>

      {/* Open Health preview */}
      <section style={{background:C.nav,borderTop:`1px solid ${C.bord}`,borderBottom:`1px solid ${C.bord}`,padding:"72px 5vw"}}>
        <div style={{maxWidth:"1120px",margin:"0 auto"}}>
          <div style={{textAlign:"center",marginBottom:"48px"}}>
            <div style={{fontFamily:"'Archivo',sans-serif",fontSize:"10.5px",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:C.t3,marginBottom:"10px"}}>Open Health</div>
            <h2 style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"clamp(28px,4vw,42px)",color:C.t1,marginBottom:"14px",letterSpacing:"-0.02em"}}>Real data from real people</h2>
            <p style={{fontSize:"16px",color:C.t2,maxWidth:"480px",margin:"0 auto",lineHeight:1.6}}>Opt in to share your health metrics publicly. Inspire others. Hold yourself accountable.</p>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"16px",marginBottom:"28px"}}>
            {OPEN_USERS.map(u=>(
              <a href={`/health/${u.handle}`} key={u.handle} style={{
                background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"16px",
                padding:"20px 22px",cursor:"pointer",display:"block",
                transition:"box-shadow .15s,border-color .15s",
              }}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 20px rgba(28,26,23,.06)";e.currentTarget.style.borderColor=C.bord2;}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.bord;}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
                  <div style={{width:"38px",height:"38px",borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",color:"#F8F8F7",fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"15px",flexShrink:0}}>
                    {u.name[0]}
                  </div>
                  <div>
                    <div style={{fontWeight:600,fontSize:"14px",color:C.t1}}>{u.name}</div>
                    <div style={{fontSize:"12px",color:C.t3}}>@{u.handle} · {u.streak} day streak 🔥</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px"}}>
                  {[["Body Fat",u.bodyFat],["HRV",u.hrv],["Steps",u.steps]].map(([label,val])=>(
                    <div key={label} style={{textAlign:"center",padding:"10px 8px",background:C.nav,borderRadius:"10px"}}>
                      <div style={{fontSize:"9.5px",fontFamily:"'Archivo',sans-serif",fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:C.t3,marginBottom:"4px"}}>{label}</div>
                      <div style={{fontSize:"16px",fontFamily:"'Jomolhari','Georgia',serif",color:C.t1}}>{val}</div>
                    </div>
                  ))}
                </div>
              </a>
            ))}
          </div>
          <div style={{textAlign:"center"}}>
            <button onClick={()=>navigate("/health")} style={{background:C.surf,color:C.t1,border:`1px solid ${C.bord}`,borderRadius:"10px",padding:"12px 28px",fontSize:"13.5px",fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
              See all Open Health profiles →
            </button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{maxWidth:"1120px",margin:"0 auto",padding:"72px 5vw"}}>
        <div style={{textAlign:"center",marginBottom:"48px"}}>
          <h2 style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"clamp(28px,4vw,42px)",color:C.t1,letterSpacing:"-0.02em"}}>Everything your health data deserves</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"24px"}}>
          {FEATURES.map(f=>(
            <div key={f.title} style={{padding:"24px",background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"16px"}}>
              <div style={{fontSize:"28px",marginBottom:"12px"}}>{f.icon}</div>
              <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"16px",color:C.t1,marginBottom:"8px"}}>{f.title}</div>
              <div style={{fontSize:"14px",color:C.t2,lineHeight:1.65}}>{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{background:C.teal,padding:"72px 5vw",textAlign:"center"}}>
        <div style={{maxWidth:"560px",margin:"0 auto"}}>
          <h2 style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"clamp(28px,4vw,40px)",color:"#F8F8F7",marginBottom:"16px",letterSpacing:"-0.02em"}}>Start tracking your health today</h2>
          <p style={{fontSize:"16px",color:"rgba(248,248,247,.75)",marginBottom:"32px",lineHeight:1.6}}>Free forever. Connect Apple Health in under 2 minutes.</p>
          <button onClick={()=>navigate("/sign-up")} style={{background:"#F8F8F7",color:C.teal,border:"none",borderRadius:"10px",padding:"16px 40px",fontSize:"16px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
            Create your free account →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{borderTop:`1px solid ${C.bord}`,padding:"28px 5vw",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
          <div style={{width:"22px",height:"22px",borderRadius:"6px",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"11px",color:"#F8F8F7"}}>B</div>
          <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:600,fontSize:"13px",color:C.t2}}>BodyData</span>
        </div>
        <div style={{display:"flex",gap:"20px"}}>
          {[["Open Health","/health"],["Sign in","/sign-in"],["Get started","/sign-up"]].map(([l,h])=>(
            <a key={l} href={h} style={{fontSize:"12.5px",color:C.t3,fontWeight:500}}>{l}</a>
          ))}
        </div>
        <div style={{fontSize:"12px",color:C.t3}}>© 2026 BodyData</div>
      </footer>
    </div>
  );
}
