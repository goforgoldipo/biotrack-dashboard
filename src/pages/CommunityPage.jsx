import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const C = {
  bg:"#F8F8F7", surf:"#FFFFFF", nav:"#F1F0EC",
  bord:"#E6E4E0", bord2:"#D2D0CA",
  t1:"#1C1A17", t2:"#4B4944", t3:"#9E9C94",
  teal:"#0C464B", green:"#1F8A5B", red:"#B4232C",
};

const API = import.meta.env.VITE_API_URL || "https://biotrack-api-production.up.railway.app";

// Metric options for leaderboard
const LEADERBOARD_METRICS = [
  { key:"hrv",        label:"HRV",          unit:"ms",  lowerBetter:false },
  { key:"steps",      label:"Steps",        unit:"",    lowerBetter:false },
  { key:"sleepDur",   label:"Sleep",        unit:"h",   lowerBetter:false },
  { key:"bodyFat",    label:"Body Fat",     unit:"%",   lowerBetter:true  },
  { key:"readiness",  label:"Readiness",    unit:"",    lowerBetter:false },
  { key:"protein",    label:"Protein",      unit:"g",   lowerBetter:false },
  { key:"weight",     label:"Weight",       unit:"lb",  lowerBetter:true  },
  { key:"leanMass",   label:"Lean Mass",    unit:"lb",  lowerBetter:false },
  { key:"workoutVol", label:"Training Vol", unit:"",    lowerBetter:false },
  { key:"deepSleep",  label:"Deep Sleep",   unit:"min", lowerBetter:false },
];

function fmt(val, unit) {
  if (val == null) return "—";
  if (unit === "h") return `${(val/60).toFixed(1)}h`;
  if (unit === "%") return `${val.toFixed(1)}%`;
  if (typeof val === "number" && val >= 1000) return val.toLocaleString();
  return `${typeof val === "number" ? val.toFixed(1) : val}${unit ? " "+unit : ""}`;
}

function UserCard({ user, rank }) {
  const navigate = useNavigate();
  const snap = user.latest || {};
  const keyStats = [
    ["Body Fat", fmt(snap.bodyFat,"%")],
    ["HRV",      fmt(snap.hrv,"ms")],
    ["Steps",    snap.steps ? snap.steps.toLocaleString() : "—"],
  ];
  return (
    <div
      onClick={()=>navigate(`/health/${user.username}`)}
      style={{background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"16px",padding:"20px 22px",cursor:"pointer",transition:"box-shadow .15s,border-color .15s",display:"flex",flexDirection:"column",gap:"14px"}}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 6px 20px rgba(28,26,23,.06)";e.currentTarget.style.borderColor=C.bord2;}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=C.bord;}}
    >
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        {rank && <span style={{fontFamily:"'Jomolhari','Georgia',serif",fontSize:"18px",color:rank<=3?C.teal:C.t3,minWidth:"24px"}}>{rank<=3?["🥇","🥈","🥉"][rank-1]:`#${rank}`}</span>}
        <div style={{width:"38px",height:"38px",borderRadius:"50%",background:user.avatar_url?"transparent":C.teal,backgroundImage:user.avatar_url?`url(${user.avatar_url})`:"none",backgroundSize:"cover",display:"flex",alignItems:"center",justifyContent:"center",color:"#F8F8F7",fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"15px",flexShrink:0}}>
          {!user.avatar_url && (user.display_name||user.username||"?")[0].toUpperCase()}
        </div>
        <div style={{minWidth:0,flex:1}}>
          <div style={{fontWeight:600,fontSize:"14px",color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.display_name||user.username}</div>
          <div style={{fontSize:"12px",color:C.t3}}>@{user.username}{snap.syncDate ? ` · ${snap.syncDate}` : ""}</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px"}}>
        {keyStats.map(([label,val])=>(
          <div key={label} style={{textAlign:"center",padding:"10px 6px",background:C.nav,borderRadius:"10px"}}>
            <div style={{fontSize:"9.5px",fontFamily:"'Archivo',sans-serif",fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:C.t3,marginBottom:"4px"}}>{label}</div>
            <div style={{fontSize:"15px",fontFamily:"'Jomolhari','Georgia',serif",color:C.t1}}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaderRow({ rank, user, metric }) {
  const navigate = useNavigate();
  const val = user.latest?.[metric.key];
  const isGood = val != null;
  const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
  return (
    <div
      onClick={()=>navigate(`/health/${user.username}`)}
      style={{display:"flex",alignItems:"center",gap:"14px",padding:"12px 18px",borderBottom:`1px solid ${C.bord}`,cursor:"pointer",transition:"background .1s"}}
      onMouseEnter={e=>e.currentTarget.style.background=C.nav}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}
    >
      <span style={{width:"28px",textAlign:"center",fontFamily:"'Jomolhari','Georgia',serif",fontSize:"16px",flexShrink:0,color:rank<=3?C.teal:C.t3}}>
        {medal || `#${rank}`}
      </span>
      <div style={{width:"32px",height:"32px",borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",color:"#F8F8F7",fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"13px",flexShrink:0}}>
        {(user.display_name||user.username||"?")[0].toUpperCase()}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:"13.5px",fontWeight:600,color:C.t1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.display_name||user.username}</div>
        <div style={{fontSize:"11.5px",color:C.t3}}>@{user.username}</div>
      </div>
      <div style={{fontFamily:"'Jomolhari','Georgia',serif",fontSize:"20px",color:isGood?C.t1:C.t3,flexShrink:0}}>
        {isGood ? fmt(val, metric.unit) : "—"}
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const navigate = useNavigate();
  const [view, setView] = useState("directory"); // "directory" | "leaderboard"
  const [lbMetric, setLbMetric] = useState(LEADERBOARD_METRICS[0]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    const ep = view === "leaderboard"
      ? `${API}/community/leaderboard?metric=${lbMetric.key}&range=30d`
      : `${API}/community`;
    fetch(ep)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.users) setUsers(d.users); setLoading(false); })
      .catch(() => setLoading(false));
  }, [view, lbMetric]);

  const filtered = search
    ? users.filter(u => (u.display_name||u.username||"").toLowerCase().includes(search.toLowerCase()))
    : users;

  return (
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:"'Inter',system-ui,sans-serif",WebkitFontSmoothing:"antialiased",color:C.t1}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Jomolhari&display=swap');*{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{background:C.surf,borderBottom:`1px solid ${C.bord}`,padding:"0 5vw"}}>
        <div style={{maxWidth:"1120px",margin:"0 auto",display:"flex",alignItems:"center",height:"60px",gap:"16px"}}>
          <a href="/" style={{display:"flex",alignItems:"center",gap:"8px",textDecoration:"none"}}>
            <div style={{width:"26px",height:"26px",borderRadius:"7px",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"13px",color:"#F8F8F7"}}>B</div>
            <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"14px",color:C.t1}}>BodyData</span>
          </a>
          <div style={{flex:1}}/>
          <button onClick={()=>navigate("/sign-in")} style={{background:"transparent",border:`1px solid ${C.bord}`,borderRadius:"8px",padding:"7px 16px",fontSize:"13px",fontWeight:500,cursor:"pointer",fontFamily:"inherit",color:C.t2}}>Sign in</button>
          <button onClick={()=>navigate("/sign-up")} style={{background:C.teal,color:"#F8F8F7",border:"none",borderRadius:"8px",padding:"7px 16px",fontSize:"13px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Get started</button>
        </div>
      </div>

      <div style={{maxWidth:"1120px",margin:"0 auto",padding:"40px 5vw"}}>
        {/* Title */}
        <div style={{marginBottom:"32px"}}>
          <div style={{fontFamily:"'Archivo',sans-serif",fontSize:"10.5px",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:C.t3,marginBottom:"8px"}}>Open Health</div>
          <h1 style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"32px",color:C.t1,marginBottom:"8px",letterSpacing:"-0.02em"}}>Real health data, openly shared</h1>
          <p style={{fontSize:"15px",color:C.t2,lineHeight:1.6}}>
            {users.length > 0 ? `${users.length} people sharing their health journey publicly.` : "People sharing their health journey publicly."}
            {" "}<a href="/sign-up" style={{color:C.teal,fontWeight:600}}>Join them →</a>
          </p>
        </div>

        {/* Controls */}
        <div style={{display:"flex",gap:"12px",alignItems:"center",marginBottom:"24px",flexWrap:"wrap"}}>
          {/* View toggle */}
          <div style={{display:"flex",background:C.nav,borderRadius:"10px",padding:"3px",border:`1px solid ${C.bord}`,flexShrink:0}}>
            {[["directory","Directory"],["leaderboard","Leaderboards"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setView(id)} style={{
                padding:"6px 16px",borderRadius:"8px",fontSize:"13px",fontWeight:view===id?600:500,
                background:view===id?C.surf:"transparent",border:"none",cursor:"pointer",
                color:view===id?C.t1:C.t2,
                boxShadow:view===id?"0 1px 3px rgba(28,26,23,.08)":"none",
                fontFamily:"inherit",transition:"all .1s",
              }}>{lbl}</button>
            ))}
          </div>

          {view==="leaderboard"&&(
            <select
              value={lbMetric.key}
              onChange={e=>setLbMetric(LEADERBOARD_METRICS.find(m=>m.key===e.target.value))}
              style={{height:"36px",padding:"0 12px",borderRadius:"8px",border:`1px solid ${C.bord}`,background:C.surf,fontSize:"13px",color:C.t1,cursor:"pointer",fontFamily:"inherit",outline:"none"}}
            >
              {LEADERBOARD_METRICS.map(m=><option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          )}

          <div style={{flex:1,minWidth:"180px"}}>
            <input
              type="text" placeholder="Search members…" value={search}
              onChange={e=>setSearch(e.target.value)}
              style={{width:"100%",height:"36px",padding:"0 14px",borderRadius:"8px",border:`1px solid ${C.bord}`,background:C.surf,fontSize:"13px",color:C.t1,outline:"none",fontFamily:"inherit"}}
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{textAlign:"center",padding:"60px",color:C.t3}}>
            <div style={{width:"32px",height:"32px",border:`3px solid ${C.bord}`,borderTopColor:C.teal,borderRadius:"50%",animation:"spin 0.7s linear infinite",margin:"0 auto 16px"}}/>
            Loading…
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{textAlign:"center",padding:"80px",color:C.t3}}>
            <div style={{fontSize:"40px",marginBottom:"16px"}}>🌱</div>
            <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:600,fontSize:"18px",color:C.t2,marginBottom:"8px"}}>No public profiles yet</div>
            <p style={{fontSize:"14px",marginBottom:"24px",lineHeight:1.6}}>Be the first to share your health data publicly.</p>
            <button onClick={()=>navigate("/sign-up")} style={{background:C.teal,color:"#F8F8F7",border:"none",borderRadius:"8px",padding:"10px 24px",fontSize:"13.5px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Create your profile</button>
          </div>
        ) : view === "directory" ? (
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:"16px"}}>
            {filtered.map(u=><UserCard key={u.username} user={u}/>)}
          </div>
        ) : (
          <div style={{background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"16px",overflow:"hidden"}}>
            {/* Leaderboard header */}
            <div style={{padding:"16px 18px",borderBottom:`1px solid ${C.bord}`,background:C.nav,display:"flex",alignItems:"center",gap:"10px"}}>
              <div style={{width:"3px",height:"16px",background:C.teal,borderRadius:"2px"}}/>
              <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:600,fontSize:"13px",color:C.t1}}>
                Top {lbMetric.label} — 30 days
              </span>
              <span style={{fontSize:"12px",color:C.t3,marginLeft:"auto"}}>
                {lbMetric.lowerBetter ? "lower is better" : "higher is better"}
              </span>
            </div>
            {filtered.map((u,i)=>(
              <LeaderRow key={u.username} rank={i+1} user={u} metric={lbMetric}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
