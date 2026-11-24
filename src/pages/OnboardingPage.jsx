import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

const C = {
  bg:"#F8F8F7", surf:"#FFFFFF", nav:"#F1F0EC",
  bord:"#E6E4E0", bord2:"#D2D0CA",
  t1:"#1C1A17", t2:"#4B4944", t3:"#9E9C94",
  teal:"#0C464B", green:"#1F8A5B",
};

const API = import.meta.env.VITE_API_URL || "https://biotrack-api-production.up.railway.app";

const STEPS = [
  { id:"welcome",  title:"Welcome to BodyData" },
  { id:"profile",  title:"Set up your profile" },
  { id:"connect",  title:"Connect Apple Health" },
  { id:"sharing",  title:"Open Health sharing" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState(user?.firstName ? `${user.firstName} ${user.lastName||""}`.trim() : "");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const progress = ((step + 1) / STEPS.length) * 100;

  async function finish() {
    setSaving(true);
    try {
      const token = await user?.getToken?.();
      await fetch(`${API}/users/upsert`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "Authorization": `Bearer ${token}` } : {}) },
        body: JSON.stringify({ username: username.toLowerCase().trim(), display_name: displayName.trim(), is_public: isPublic }),
      });
    } catch {}
    navigate("/dashboard");
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'Inter',system-ui,sans-serif",WebkitFontSmoothing:"antialiased"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Jomolhari&display=swap');*{box-sizing:border-box}`}</style>

      <div style={{width:"100%",maxWidth:"480px"}}>
        {/* Logo */}
        <div style={{display:"flex",alignItems:"center",gap:"9px",justifyContent:"center",marginBottom:"32px"}}>
          <div style={{width:"32px",height:"32px",borderRadius:"9px",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"16px",color:"#F8F8F7"}}>B</div>
          <span style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"16px",color:C.t1}}>BodyData</span>
        </div>

        {/* Progress bar */}
        <div style={{background:C.bord,borderRadius:"4px",height:"4px",marginBottom:"32px",overflow:"hidden"}}>
          <div style={{height:"100%",background:C.teal,borderRadius:"4px",width:`${progress}%`,transition:"width .4s ease"}}/>
        </div>

        {/* Step label */}
        <div style={{fontFamily:"'Archivo',sans-serif",fontSize:"10.5px",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:C.t3,marginBottom:"8px",textAlign:"center"}}>
          Step {step+1} of {STEPS.length}
        </div>

        {/* Card */}
        <div style={{background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"20px",padding:"40px 36px",boxShadow:"0 4px 24px rgba(28,26,23,.06)"}}>

          {step === 0 && (
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:"52px",marginBottom:"16px"}}>👋</div>
              <h2 style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"24px",color:C.t1,marginBottom:"12px"}}>Welcome, {user?.firstName||"friend"}!</h2>
              <p style={{fontSize:"14px",color:C.t2,lineHeight:1.65,marginBottom:"28px"}}>
                You're minutes away from seeing all your health KPIs in one place. We'll walk you through connecting Apple Health and setting up your profile.
              </p>
              <div style={{display:"flex",flexDirection:"column",gap:"10px",textAlign:"left",marginBottom:"28px"}}>
                {["Connect Apple Health (iOS app)","Track 80+ health metrics in real time","Optionally share your data with the community"].map(t=>(
                  <div key={t} style={{display:"flex",alignItems:"center",gap:"10px",padding:"12px 14px",background:C.nav,borderRadius:"10px",fontSize:"13.5px",color:C.t2}}>
                    <span style={{color:C.green,fontWeight:700,flexShrink:0}}>✓</span>{t}
                  </div>
                ))}
              </div>
              <button onClick={()=>setStep(1)} style={{width:"100%",background:C.teal,color:"#F8F8F7",border:"none",borderRadius:"10px",padding:"14px",fontSize:"15px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                Let's go →
              </button>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"22px",color:C.t1,marginBottom:"6px"}}>Set up your profile</h2>
              <p style={{fontSize:"13.5px",color:C.t3,marginBottom:"24px"}}>Choose a username for your public profile URL.</p>
              <div style={{marginBottom:"16px"}}>
                <label style={{fontSize:"12px",fontWeight:600,color:C.t2,display:"block",marginBottom:"6px"}}>Display Name</label>
                <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="Your name"
                  style={{width:"100%",padding:"10px 14px",borderRadius:"8px",border:`1px solid ${C.bord}`,background:C.bg,fontSize:"14px",color:C.t1,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{marginBottom:"24px"}}>
                <label style={{fontSize:"12px",fontWeight:600,color:C.t2,display:"block",marginBottom:"6px"}}>Username</label>
                <div style={{display:"flex",alignItems:"center",border:`1px solid ${C.bord}`,borderRadius:"8px",background:C.bg,overflow:"hidden"}}>
                  <span style={{padding:"10px 12px",color:C.t3,fontSize:"14px",borderRight:`1px solid ${C.bord}`,background:C.nav,flexShrink:0}}>biotrack.app/health/</span>
                  <input value={username} onChange={e=>setUsername(e.target.value.replace(/[^a-z0-9_-]/gi,"").toLowerCase())}
                    placeholder="yourname"
                    style={{flex:1,padding:"10px 12px",border:"none",background:"transparent",fontSize:"14px",color:C.t1,outline:"none",fontFamily:"inherit"}}/>
                </div>
              </div>
              <div style={{display:"flex",gap:"10px"}}>
                <button onClick={()=>setStep(0)} style={{flex:1,background:C.nav,color:C.t2,border:`1px solid ${C.bord}`,borderRadius:"10px",padding:"13px",fontSize:"14px",fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Back</button>
                <button onClick={()=>setStep(2)} disabled={!username.trim()} style={{flex:2,background:username.trim()?C.teal:"#B8B6AF",color:"#F8F8F7",border:"none",borderRadius:"10px",padding:"13px",fontSize:"14px",fontWeight:600,cursor:username.trim()?"pointer":"default",fontFamily:"inherit"}}>Continue →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"22px",color:C.t1,marginBottom:"6px"}}>Connect Apple Health</h2>
              <p style={{fontSize:"13.5px",color:C.t3,marginBottom:"24px"}}>Download the BodyData iOS app to start syncing your data.</p>
              <div style={{background:C.nav,border:`1px solid ${C.bord}`,borderRadius:"14px",padding:"22px",marginBottom:"20px",textAlign:"center"}}>
                <div style={{fontSize:"48px",marginBottom:"12px"}}>📱</div>
                <div style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"16px",color:C.t1,marginBottom:"8px"}}>BodyData Health iOS App</div>
                <p style={{fontSize:"13px",color:C.t2,lineHeight:1.6,marginBottom:"16px"}}>Download from the App Store, sign in with your account, and tap <strong>Sync Now</strong> to push your Apple Health data.</p>
                <div style={{display:"inline-flex",alignItems:"center",gap:"8px",background:"#000",color:"#fff",borderRadius:"10px",padding:"10px 20px",fontSize:"13px",fontWeight:500}}>
                  🍎 Download on the App Store
                </div>
              </div>
              <div style={{background:"rgba(12,70,75,.06)",border:`1px solid rgba(12,70,75,.15)`,borderRadius:"10px",padding:"12px 14px",fontSize:"12.5px",color:C.teal,marginBottom:"20px"}}>
                <strong>Already have the app?</strong> Just sign in with the same account and your data will sync automatically.
              </div>
              <div style={{display:"flex",gap:"10px"}}>
                <button onClick={()=>setStep(1)} style={{flex:1,background:C.nav,color:C.t2,border:`1px solid ${C.bord}`,borderRadius:"10px",padding:"13px",fontSize:"14px",fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Back</button>
                <button onClick={()=>setStep(3)} style={{flex:2,background:C.teal,color:"#F8F8F7",border:"none",borderRadius:"10px",padding:"13px",fontSize:"14px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Continue →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 style={{fontFamily:"'Archivo',sans-serif",fontWeight:700,fontSize:"22px",color:C.t1,marginBottom:"6px"}}>Open Health sharing</h2>
              <p style={{fontSize:"13.5px",color:C.t3,marginBottom:"24px"}}>Would you like to share your health data publicly?</p>
              <div style={{display:"flex",flexDirection:"column",gap:"12px",marginBottom:"24px"}}>
                {[
                  { val:true,  icon:"🌍", title:"Public profile", desc:`Share at biotrack.app/health/${username||"you"} · Appear in community directory and leaderboards` },
                  { val:false, icon:"🔒", title:"Private (just me)", desc:"Only you can see your data · You can change this anytime in settings" },
                ].map(opt=>(
                  <div key={String(opt.val)}
                    onClick={()=>setIsPublic(opt.val)}
                    style={{
                      border:`2px solid ${isPublic===opt.val?C.teal:C.bord}`,
                      borderRadius:"12px",padding:"16px 18px",cursor:"pointer",
                      background:isPublic===opt.val?"rgba(12,70,75,.04)":C.surf,
                      transition:"all .15s",
                    }}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:"12px"}}>
                      <span style={{fontSize:"22px",flexShrink:0}}>{opt.icon}</span>
                      <div>
                        <div style={{fontWeight:600,fontSize:"14px",color:C.t1,marginBottom:"4px"}}>{opt.title}</div>
                        <div style={{fontSize:"12.5px",color:C.t3,lineHeight:1.5}}>{opt.desc}</div>
                      </div>
                      {isPublic===opt.val&&<div style={{marginLeft:"auto",width:"18px",height:"18px",borderRadius:"50%",background:C.teal,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><span style={{color:"#fff",fontSize:"11px",fontWeight:700}}>✓</span></div>}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:"10px"}}>
                <button onClick={()=>setStep(2)} style={{flex:1,background:C.nav,color:C.t2,border:`1px solid ${C.bord}`,borderRadius:"10px",padding:"13px",fontSize:"14px",fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>Back</button>
                <button onClick={finish} disabled={saving} style={{flex:2,background:C.teal,color:"#F8F8F7",border:"none",borderRadius:"10px",padding:"13px",fontSize:"14px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                  {saving ? "Setting up…" : "Go to dashboard →"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p style={{textAlign:"center",fontSize:"12px",color:C.t3,marginTop:"20px"}}>
          You can change all these settings later in your profile.
        </p>
      </div>
    </div>
  );
}
