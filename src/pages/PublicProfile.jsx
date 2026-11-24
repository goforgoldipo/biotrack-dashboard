import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const C = {
  bg:"#F8F8F7", surf:"#FFFFFF", nav:"#F1F0EC",
  bord:"#E6E4E0", bord2:"#D2D0CA",
  t1:"#1C1A17", t2:"#4B4944", t3:"#9E9C94",
  teal:"#0C464B", green:"#1F8A5B", red:"#B4232C",
};

const API = import.meta.env.VITE_API_URL || "https://biotrack-api-production.up.railway.app";

function fmt(val, unit) {
  if (val == null) return "—";
  if (unit === "%") return `${Number(val).toFixed(1)}%`;
  if (typeof val === "number" && val >= 1000) return val.toLocaleString();
  return `${typeof val === "number" ? val.toFixed(1) : val}${unit ? " "+unit : ""}`;
}

function summarySparkline(vals, col, h=28, w=100) {
  if (!vals || vals.length < 2) return null;
  const mn = Math.min(...vals), mx = Math.max(...vals);
  const rng = mx - mn || 1;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - 2 - ((v - mn) / rng) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const area = `M0,${h} L` + vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - 2 - ((v - mn) / rng) * (h - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" L") + ` L${w},${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{display:"block",overflow:"visible"}}>
      <defs>
        <linearGradient id={`sg_${col.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.14"/>
          <stop offset="100%" stopColor={col} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg_${col.replace("#","")})`}/>
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

export default function PublicProfile() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`${API}/community/${username}`)
      .then(r => { if (r.status === 404) { setNotFound(true); setLoading(false); return null; } return r.ok ? r.json() : null; })
      .then(d => { if (d) setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [username]);

  if (loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg}}>
      <div style={{width:"32px",height:"32px",border:`3px solid ${C.bord}`,borderTopColor:C.teal,borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (notFound || !data) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,fontFamily:"'Inter',system-ui,sans-serif",textAlign:"center",padding:"20px"}}>
      <div style={{fontSize:"48px",marginBottom:"16px"}}>🔒</div>
      <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"24px",color:C.t1,marginBottom:"8px"}}>Profile not found</div>
      <p style={{fontSize:"14px",color:C.t3,marginBottom:"24px"}}>@{username} hasn't made their profile public yet, or doesn't exist.</p>
      <button onClick={()=>navigate("/health")} style={{background:C.teal,color:"#F8F8F7",border:"none",borderRadius:"8px",padding:"10px 24px",fontSize:"13.5px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Browse Open Health</button>
    </div>
  );

  const { user, latest, history = [], groups = [] } = data;
  const snap = latest || {};

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif",WebkitFontSmoothing:"antialiased",color:C.t1}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Jomolhari&display=swap');*{box-sizing:border-box}`}</style>

      {/* Nav */}
      <div style={{background:C.surf,borderBottom:`1px solid ${C.bord}`,padding:"0 5vw"}}>
        <div style={{maxWidth:"1120px",margin:"0 auto",display:"flex",alignItems:"center",height:"60px",gap:"16px"}}>
          <a href="/" style={{display:"flex",alignItems:"center",gap:"8px",textDecoration:"none"}}>
            <div style={{width:"26px",height:"26px",borderRadius:"7px",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"13px",color:"#F8F8F7"}}>B</div>
            <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"14px",color:C.t1}}>BodyData</span>
          </a>
          <span style={{color:C.t3,fontSize:"13px"}}>/</span>
          <a href="/health" style={{fontSize:"13px",color:C.t3,fontWeight:500,textDecoration:"none"}}>Open Health</a>
          <span style={{color:C.t3,fontSize:"13px"}}>/</span>
          <span style={{fontSize:"13px",color:C.t2,fontWeight:500}}>@{username}</span>
          <div style={{flex:1}}/>
          <button onClick={()=>navigate("/sign-up")} style={{background:C.teal,color:"#F8F8F7",border:"none",borderRadius:"8px",padding:"7px 16px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Track yours free</button>
        </div>
      </div>

      <div style={{maxWidth:"1120px",margin:"0 auto",padding:"40px 5vw"}}>
        {/* Profile header */}
        <div style={{display:"flex",alignItems:"center",gap:"18px",marginBottom:"36px",flexWrap:"wrap"}}>
          <div style={{width:"64px",height:"64px",borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",color:"#F8F8F7",fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"26px",flexShrink:0}}>
            {(user?.display_name||username||"?")[0].toUpperCase()}
          </div>
          <div>
            <h1 style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"24px",color:C.t1,marginBottom:"4px"}}>{user?.display_name||username}</h1>
            <div style={{fontSize:"13.5px",color:C.t3}}>
              @{username}
              {snap.syncDate && ` · Last synced ${snap.syncDate}`}
              {history.length > 0 && ` · ${history.length} days of data`}
            </div>
          </div>
          <div style={{marginLeft:"auto",padding:"8px 16px",background:C.nav,borderRadius:"10px",border:`1px solid ${C.bord}`,fontSize:"12px",color:C.t3,fontWeight:500}}>
            🌍 Public profile
          </div>
        </div>

        {/* KPI groups */}
        {groups.length > 0 ? groups.map(g => (
          <div key={g.id} style={{marginBottom:"32px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"}}>
              <div style={{width:"3px",height:"16px",background:g.col||C.teal,borderRadius:"2px",flexShrink:0}}/>
              <span style={{fontFamily:"'Archivo',sans-serif",fontSize:"10.5px",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:C.t3}}>{g.name}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:"12px"}}>
              {g.metrics.map(m => {
                const val = snap[m.key];
                const spark = history.map(d => d[m.key]).filter(v => typeof v === "number").slice(0,30).reverse();
                return (
                  <div key={m.key} style={{background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"14px",padding:"14px 15px 12px",display:"flex",flexDirection:"column"}}>
                    <div style={{fontFamily:"'Archivo',sans-serif",fontSize:"10px",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:C.t3,marginBottom:"8px"}}>{m.label}</div>
                    <div style={{fontSize:"28px",fontFamily:"'Jomolhari','Georgia',serif",color:C.t1,lineHeight:1,marginBottom:"4px"}}>{fmt(val,m.unit)}</div>
                    <div style={{fontSize:"11.5px",color:C.t3,marginBottom:"8px"}}>{g.src}</div>
                    {spark.length > 2 && <div style={{marginTop:"auto"}}>{summarySparkline(spark,m.col||g.col||C.teal,28,110)}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )) : (
          /* Fallback: show latest snapshot raw */
          <div style={{background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"16px",padding:"24px",textAlign:"center",color:C.t3}}>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:600,fontSize:"16px",color:C.t2,marginBottom:"8px"}}>Data loading…</div>
            <p style={{fontSize:"13px",lineHeight:1.6}}>@{username}'s health data will appear here once they sync from Apple Health.</p>
          </div>
        )}

        {/* CTA at bottom */}
        <div style={{marginTop:"48px",background:C.teal,borderRadius:"20px",padding:"40px",textAlign:"center"}}>
          <h2 style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"24px",color:"#F8F8F7",marginBottom:"10px"}}>Track your own health data</h2>
          <p style={{fontSize:"14px",color:"rgba(248,248,247,.75)",marginBottom:"24px",lineHeight:1.6}}>Free forever · Apple Health sync · 80+ metrics</p>
          <button onClick={()=>navigate("/sign-up")} style={{background:"#F8F8F7",color:C.teal,border:"none",borderRadius:"10px",padding:"12px 32px",fontSize:"14px",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Get started free →</button>
        </div>
      </div>
    </div>
  );
}
