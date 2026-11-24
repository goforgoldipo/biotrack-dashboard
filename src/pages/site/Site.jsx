import { PrivacyText, TermsText } from "./legalText.jsx";
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

// ─── BodyData public site ─────────────────────────────────────────────────────
// Light, airy SaaS layout: sticky header, bold tight headlines, soft-gray bands,
// product UI shown as live widgets (no stock photos), one vivid accent.
const T = {
  ink: "#2B2E4A", body: "#4A4F6E", muted: "#7A80A6", line: "#E7E8F1",
  soft: "#F8F9FC", accent: "#5468FF", accent2: "#3F52E6", accentSoft: "#EEF0FF",
  green: "#1F9D6B", red: "#D64545", amber: "#C98A12",
};
const APP_URL = "/dashboard";

const css = `
.bd{font-family:Inter,-apple-system,system-ui,"Segoe UI",Roboto,sans-serif;color:${T.body};background:#fff;-webkit-font-smoothing:antialiased}
.bd *{box-sizing:border-box}
.bd a{color:inherit;text-decoration:none}
.bd .wrap{max-width:1160px;margin:0 auto;padding:0 24px}
.bd h1,.bd h2,.bd h3{color:${T.ink};margin:0;font-weight:800}
.bd h1{font-size:56px;line-height:1.12;letter-spacing:-0.055em}
.bd h2{font-size:40px;line-height:1.15;letter-spacing:-0.03em}
.bd h3{font-size:22px;line-height:1.3;letter-spacing:-0.02em;font-weight:700}
.bd p{margin:0;line-height:1.65}
.bd .lede{font-size:19px;color:${T.body}}
.bd .eyebrow{font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${T.accent}}
.bd .btn{display:inline-flex;align-items:center;gap:8px;height:48px;padding:0 20px;border-radius:9px;font-size:16px;font-weight:600;cursor:pointer;border:1px solid transparent;transition:background .15s,box-shadow .15s,transform .15s;white-space:nowrap}
.bd .btn-p{background:${T.accent};color:#fff;box-shadow:0 1px 8px rgba(84,104,255,.28)}
.bd .btn-p:hover{background:${T.accent2};transform:translateY(-1px)}
.bd .btn-s{background:#fff;color:${T.ink};border-color:${T.line}}
.bd .btn-s:hover{border-color:#cfd2e4}
.bd .btn-sm{height:38px;padding:0 14px;font-size:14px}
.bd header.top{position:sticky;top:0;z-index:50;background:rgba(255,255,255,.92);backdrop-filter:saturate(1.4) blur(10px);border-bottom:1px solid transparent;transition:border-color .2s}
.bd header.top.scrolled{border-bottom-color:${T.line}}
.bd .nav{display:flex;align-items:center;gap:28px;height:68px}
.bd .nav .links{display:flex;gap:26px;font-size:15px;font-weight:500;color:${T.body};flex:1}
.bd .nav .links a:hover,.bd .foot a:hover{color:${T.accent}}
.bd .logo{display:flex;align-items:center;gap:9px;font-weight:800;font-size:20px;color:${T.ink};letter-spacing:-.03em}
.bd .card{background:#fff;border:1px solid ${T.line};border-radius:14px;box-shadow:0 2px 14px rgba(43,46,74,.06)}
.bd .band{background:${T.soft}}
.bd .grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.bd .split{display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center}
.bd .split>*,.bd .grid3>*,.bd .mockgrid>*{min-width:0}
.bd .mockgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.bd .cats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
.bd .cats>*{min-width:0}
.bd .cat{padding:22px;display:flex;flex-direction:column;gap:10px;transition:box-shadow .15s,transform .15s}
.bd .cat:hover{box-shadow:0 10px 28px rgba(43,46,74,.10);transform:translateY(-2px)}
.bd .cat .ic{width:38px;height:38px;border-radius:10px;background:${T.accentSoft};color:${T.accent};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700}
.bd .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:6px}
.bd .chips span{border:1px solid ${T.line};border-radius:999px;padding:4px 10px;font-size:12.5px;font-weight:600;color:${T.ink};white-space:nowrap}
.bd .pill{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:${T.accent};background:${T.accentSoft};border-radius:999px;padding:5px 12px}
.bd .strip{display:flex;flex-wrap:wrap;justify-content:center;gap:14px 34px;font-weight:700;font-size:17px;color:#A2A7C4;letter-spacing:-.01em}
.bd .chk{display:flex;gap:10px;align-items:flex-start;line-height:1.5}
.bd .chk:before{content:"";flex:0 0 18px;height:18px;margin-top:2px;border-radius:50%;background:${T.accentSoft} url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235468FF' stroke-width='3.2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 12.5l4 4 8-9'/%3E%3C/svg%3E") center/11px no-repeat}
.bd .foot{font-size:14px}
.bd .burger{display:none;margin-left:auto;background:none;border:1px solid ${T.line};border-radius:9px;width:40px;height:40px;cursor:pointer}
.bd details{border-bottom:1px solid ${T.line};padding:18px 0}
.bd summary{cursor:pointer;font-weight:600;color:${T.ink};font-size:17px;list-style:none;display:flex;justify-content:space-between;gap:12px}
.bd summary::-webkit-details-marker{display:none}
.bd summary:after{content:"+";color:${T.muted};font-weight:400;font-size:22px;line-height:1}
.bd details[open] summary:after{content:"–"}
.bd .legal h2{font-size:24px;margin:34px 0 10px}.bd .legal p,.bd .legal li{line-height:1.7;margin-bottom:10px}
@media (max-width:900px){
  .bd h1{font-size:40px}.bd h2{font-size:30px}
  .bd .grid3{grid-template-columns:1fr}
  .bd .cats{grid-template-columns:1fr 1fr}
  .bd .split{grid-template-columns:1fr;gap:36px}
  .bd .nav .links,.bd .nav .hide-m{display:none}
  .bd .burger{display:inline-flex;align-items:center;justify-content:center}
  .bd .mnav{display:flex!important}
  .bd .rev>:first-child{order:2}
  .bd .wrap{padding:0 16px}
}
@media (max-width:520px){
  .bd h1{font-size:36px}
  .bd .mockgrid{grid-template-columns:1fr}
  .bd .cats{grid-template-columns:1fr}
  .bd .kpis>:nth-child(n+5){display:none}
  .bd .lede{font-size:17px}
}
`;

// ── tiny product widgets (BodyData's own KPI look) ──
const Delta = ({ v, good, unit = "%" }) => (
  <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: good ? "rgba(31,157,107,.1)" : "rgba(214,69,69,.09)", color: good ? T.green : T.red }}>
    {v > 0 ? "↑" : "↓"}{Math.abs(v)}{unit}</span>);
function Spark({ pts, color = T.accent, h = 70, fill = true }) {
  const w = 300, mx = Math.max(...pts), mn = Math.min(...pts), s = (mx - mn) || 1;
  const P = pts.map((v, i) => [i / (pts.length - 1) * w, 6 + (1 - (v - mn) / s) * (h - 12)]);
  const d = "M" + P.map(p => p.map(n => n.toFixed(1)).join(",")).join(" L");
  return (<svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
    {fill && <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity=".09"/>}
    <path d={d} fill="none" stroke={color} strokeWidth="2.4" vectorEffect="non-scaling-stroke" strokeLinejoin="round"/></svg>);
}
function Kpi({ label, value, from, delta, good, pts, unit, sub }) {
  return (<div className="card" style={{ padding: "18px 20px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: T.muted }}>{label}</span>
      <Delta v={delta} good={good} unit={unit}/></div>
    <div style={{ display: "flex", alignItems: "baseline", gap: "0 8px", marginTop: 8, flexWrap: "wrap" }}>
      <span style={{ fontSize: 30, fontWeight: 800, color: T.ink, letterSpacing: "-.03em" }}>{value}</span>
      <span style={{ fontSize: 13, color: T.muted }}>from {from}</span></div>
    {sub && <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>{sub}</div>}
    <div style={{ marginTop: 12 }}><Spark pts={pts}/></div>
  </div>);
}
function Bars({ vals, color = T.accent, h = 120 }) {
  const mx = Math.max(...vals);
  return (<div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: h }}>
    {vals.map((v, i) => <div key={i} style={{ flex: 1, height: `${v / mx * 100}%`, background: i === vals.length - 1 ? color : `${color}88`, borderRadius: 4 }}/>)}</div>);
}
function Widget({ icon, title, children, caption }) {
  return (<div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontWeight: 600, color: T.accent, fontSize: 14.5, marginBottom: 14 }}>
      <span style={{ width: 26, height: 26, borderRadius: 8, background: T.accentSoft, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>{title}</div>
    <div className="card" style={{ padding: 20, minHeight: 250 }}>{children}</div>
    <p style={{ textAlign: "center", fontSize: 14, color: T.muted, marginTop: 14, padding: "0 10px" }}>{caption}</p>
  </div>);
}
const Row = ({ l, v, c }) => (<div style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: `1px solid ${T.line}`, fontSize: 14 }}>
  <span style={{ color: T.body }}>{l}</span><span style={{ fontWeight: 700, color: c || T.ink }}>{v}</span></div>);

function DashboardMock() {
  return (<div className="card" style={{ padding: 18, background: "#fff" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
      <span style={{ fontWeight: 800, color: T.ink }}>Health performance</span>
      <span style={{ marginLeft: "auto", fontSize: 12.5, color: T.muted, border: `1px solid ${T.line}`, borderRadius: 7, padding: "4px 9px" }}>This month · vs last month</span></div>
    <div className="mockgrid">
      <Kpi label="Body fat" value="15.8%" from="16.9%" delta={-1.1} good unit=" pts" pts={[17, 16.9, 16.8, 16.6, 16.7, 16.4, 16.2, 16.1, 15.9, 15.8]}/>
      <Kpi label="Lean mass" value="151.2 lb" from="149.6 lb" delta={1.1} good pts={[149, 149.4, 149.3, 149.9, 150.2, 150.1, 150.6, 150.9, 151.0, 151.2]}/>
      <Kpi label="HRV" value="58 ms" from="51 ms" delta={13.7} good pts={[49, 52, 50, 54, 53, 56, 55, 57, 59, 58]}/>
      <Kpi label="Resting HR" value="47 bpm" from="51 bpm" delta={-7.8} good pts={[52, 51, 51, 50, 49, 49, 48, 48, 47, 47]}/>
    </div></div>);
}
function ChatMock() {
  return (<div className="card" style={{ padding: 20 }}>
    <div style={{ marginLeft: "auto", maxWidth: "80%", background: T.ink, color: "#fff", borderRadius: "14px 14px 4px 14px", padding: "10px 14px", fontSize: 14 }}>
      Why did my recovery drop this week?</div>
    <div style={{ marginTop: 14, fontSize: 14, color: T.body, lineHeight: 1.6 }}>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>Looked at HRV, sleep, training volume (daily, last 6 weeks)</div>
      Your HRV fell <b style={{ color: T.ink }}>18%</b> (58 → 47 ms) after three days over <b style={{ color: T.ink }}>30,000 lb</b> of leg volume, while deep sleep averaged
      only <b style={{ color: T.ink }}>52 min</b>, your lowest in two months.
      <div style={{ marginTop: 10 }}><b style={{ color: T.ink }}>Do this:</b> keep tomorrow under 15,000 lb, lights out by 10:30, and recheck HRV in 48 h.</div>
    </div></div>);
}
function SourcesMock() {
  const rows = [["Apple Watch", "Automatic", "Today", T.green], ["Oura", "Automatic", "Today", T.green], ["Hume scale", "Automatic", "Today", T.green],
    ["Fitbod", "Export reminder · Sun 7 PM", "2 days ago", T.amber], ["MyFitnessPal", "Automatic", "Today", T.green]];
  return (<div className="card" style={{ padding: "8px 20px 14px" }}>
    {rows.map(([a, how, last, c], i) => <div key={a} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${T.line}` : 0, fontSize: 14 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: c }}/>
      <span style={{ fontWeight: 700, color: T.ink, flex: 1 }}>{a}</span>
      <span style={{ color: T.muted, flex: 1.4 }}>{how}</span>
      <span style={{ color: T.body }}>{last}</span></div>)}
  </div>);
}

// ── layout ──
function Header() {
  const [scrolled, setScrolled] = useState(false), [open, setOpen] = useState(false);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); window.addEventListener("scroll", f); return () => window.removeEventListener("scroll", f); }, []);
  const links = [["Product", "/features"], ["Integrations", "/integrations"], ["Pricing", "/pricing"], ["Security", "/security"]];
  return (<header className={"top" + (scrolled ? " scrolled" : "")}>
    <div className="wrap nav">
      <Link to="/" className="logo"><Mark/>BodyData</Link>
      <nav className="links">{links.map(([l, h]) => <Link key={h} to={h}>{l}</Link>)}</nav>
      <a href={APP_URL} className="hide-m" style={{ fontSize: 15, fontWeight: 500 }}>Sign in</a>
      <a href={APP_URL} className="btn btn-p btn-sm hide-m">Join the free beta</a>
      <button className="burger" aria-label="Menu" onClick={() => setOpen(o => !o)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.ink} strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
    {open && <div className="mnav wrap" style={{ display: "none", flexDirection: "column", gap: 4, paddingBottom: 16 }}>
      {links.map(([l, h]) => <Link key={h} to={h} onClick={() => setOpen(false)} style={{ padding: "10px 0", fontWeight: 600, color: T.ink }}>{l}</Link>)}
      <a href={APP_URL} style={{ padding: "10px 0", fontWeight: 600, color: T.ink }}>Sign in</a>
      <a href={APP_URL} className="btn btn-p" style={{ justifyContent: "center", marginTop: 6 }}>Join the free beta</a></div>}
  </header>);
}
function Mark({ size = 28 }) {
  return (<svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill={T.accent}/>
    <path d="M7 19.5l4.5-5 4 3.5 4.5-7 5 6" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>);
}
function Footer() {
  const cols = [["Product", [["Dashboards", "/features"], ["Ask AI", "/features#ai"], ["Automations", "/features#automations"], ["Integrations", "/integrations"], ["Pricing", "/pricing"]]],
    ["Company", [["Security", "/security"], ["Contact", "mailto:hello@bodydata.ai"]]],
    ["Get started", [["Join the free beta", APP_URL], ["Sign in", APP_URL], ["iPhone app", "/features#iphone"]]],
    ["Legal", [["Privacy", "/privacy"], ["Terms", "/terms"]]]];
  return (<footer className="foot" style={{ borderTop: `1px solid ${T.line}`, padding: "56px 0 40px" }}>
    <div className="wrap" style={{ display: "grid", gridTemplateColumns: "1.4fr repeat(4,1fr)", gap: 28 }}>
      <div><Link to="/" className="logo"><Mark size={24}/>BodyData</Link>
        <p style={{ marginTop: 12, color: T.muted, maxWidth: 260 }}>Every metric your body produces, in one dashboard.</p></div>
      {cols.map(([h, ls]) => <div key={h}><div style={{ fontWeight: 700, color: T.ink, marginBottom: 12 }}>{h}</div>
        {ls.map(([l, u]) => <div key={l} style={{ marginBottom: 9 }}>{u.startsWith("/") && !u.startsWith("/dashboard") ? <Link to={u} style={{ color: T.muted }}>{l}</Link> : <a href={u} style={{ color: T.muted }}>{l}</a>}</div>)}</div>)}
    </div>
    <div className="wrap" style={{ marginTop: 40, color: T.muted, fontSize: 13 }}>© {new Date().getFullYear()} BodyData. Not a medical device; not medical advice.</div>
    <style>{`@media(max-width:900px){.bd footer .wrap:first-child{grid-template-columns:1fr 1fr!important}}`}</style>
  </footer>);
}
function CTA() {
  return (<section style={{ background: `linear-gradient(135deg, ${T.accent}, #6C5CFF)`, color: "#fff", padding: "84px 0", overflow: "hidden" }}>
    <div className="wrap split">
      <div><h2 style={{ color: "#fff" }}>Get BodyData for your body</h2>
        <p style={{ color: "rgba(255,255,255,.85)", fontSize: 18, marginTop: 14 }}>Connect Apple Health in two minutes. Every app you already use flows in on its own.</p>
        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <a href={APP_URL} className="btn" style={{ background: "#fff", color: T.accent2 }}>Join the free beta</a>
          <Link to="/pricing" className="btn" style={{ border: "1px solid rgba(255,255,255,.5)", color: "#fff" }}>See pricing</Link></div></div>
      <div style={{ transform: "rotate(-1.5deg)" }}><DashboardMock/></div>
    </div></section>);
}
// Categories of data BodyData brings together, and apps it works with in each
const CATEGORIES = [
  ["⌚", "Wearables", "Readiness, HRV, resting heart rate, strain and all-day activity.", ["Apple Watch", "Oura", "WHOOP", "Garmin", "Fitbit", "Polar", "Ultrahuman"]],
  ["◐", "Nutrition", "Calories, protein, macros and micronutrients, day by day.", ["MyFitnessPal", "Cronometer", "Lose It!", "MacroFactor"]],
  ["☾", "Sleep", "Duration, stages, consistency and overnight vitals.", ["Apple Watch", "Oura", "WHOOP", "Eight Sleep"]],
  ["▲", "Training", "Workouts, sets, reps, weights and volume per muscle group.", ["Fitbod", "Strong", "Hevy", "Peloton", "Strava"]],
  ["◎", "Body Composition", "Weight, body fat, lean mass, visceral fat and segmental scans.", ["Withings", "Hume", "Renpho", "InBody", "DEXA scans"]],
  ["◆", "Glucose", "Continuous glucose readings and daily averages.", ["Dexcom", "Stelo", "FreeStyle Libre", "Lingo"]],
  ["✚", "Labs", "Every biomarker from your blood work, tracked across each draw.", ["Function Health", "InsideTracker", "Quest", "Labcorp"]],
];
// Example KPI cards per category: [label, value, from, change, good?, change unit]
const KPI_LIB = {
  Wearables: [["Readiness", "86", "79", 8.9, true], ["HRV", "58 ms", "51 ms", 13.7, true], ["Resting HR", "47 bpm", "51 bpm", -7.8, true], ["Recovery", "74%", "66%", 8, true, " pts"],
    ["Strain", "13.2", "11.8", 11.9, true], ["Steps", "11,240", "9,860", 14, true], ["Active energy", "742 kcal", "655 kcal", 13.3, true], ["VO2 max", "48.6", "47.1", 3.2, true]],
  Nutrition: [["Calories", "2,310", "2,540", -9.1, true], ["Protein", "196 g", "164 g", 19.5, true], ["Carbs", "212 g", "248 g", -14.5, true], ["Fat", "71 g", "82 g", -13.4, true],
    ["Fiber", "34 g", "26 g", 30.8, true], ["Sugar", "38 g", "52 g", -26.9, true], ["Sodium", "2,480 mg", "2,910 mg", -14.8, true], ["Water", "3.4 L", "2.9 L", 17.2, true]],
  Sleep: [["Time asleep", "7h 32m", "6h 58m", 8.1, true], ["Deep sleep", "1h 21m", "1h 09m", 17.4, true], ["REM sleep", "1h 48m", "1h 36m", 12.5, true], ["Sleep score", "84", "78", 7.7, true],
    ["Efficiency", "92%", "88%", 4, true, " pts"], ["Bedtime consistency", "±22 min", "±41 min", -46.3, true], ["Respiratory rate", "13.9 /min", "14.4 /min", -3.5, true], ["Awake time", "24 min", "37 min", -35.1, true]],
  Training: [["Workouts", "18", "14", 28.6, true], ["Weekly volume", "142,560 lb", "121,300 lb", 17.5, true], ["Working sets", "212", "184", 15.2, true], ["Total reps", "2,140", "1,880", 13.8, true],
    ["Bench press 1RM", "245 lb", "235 lb", 4.3, true], ["Squat 1RM", "325 lb", "310 lb", 4.8, true], ["Training time", "16h 40m", "13h 10m", 26.6, true], ["Zone 2 minutes", "184 min", "126 min", 46, true]],
  "Body Composition": [["Weight", "172.4 lb", "176.8 lb", -2.5, true], ["Body fat", "15.8%", "17.6%", -1.8, true, " pts"], ["Lean mass", "145.2 lb", "143.6 lb", 1.1, true], ["Fat mass", "27.2 lb", "31.1 lb", -12.5, true],
    ["Visceral fat", "0.82 lb", "1.04 lb", -21.2, true], ["Skeletal muscle", "83.1 lb", "82.2 lb", 1.1, true], ["Bone density", "1.31 g/cm²", "1.30 g/cm²", 0.8, true], ["Waist", "32.5 in", "33.75 in", -3.7, true]],
  Glucose: [["Average glucose", "94 mg/dL", "101 mg/dL", -6.9, true], ["Time in range", "96%", "89%", 7, true, " pts"], ["Fasting glucose", "86 mg/dL", "92 mg/dL", -6.5, true], ["Glucose variability", "14%", "19%", -5, true, " pts"],
    ["Post-meal peak", "128 mg/dL", "142 mg/dL", -9.9, true], ["Time above 140", "1.2%", "4.8%", -3.6, true, " pts"], ["Lowest overnight", "76 mg/dL", "71 mg/dL", 7, true], ["HbA1c (est.)", "5.0%", "5.2%", -0.2, true, " pts"]],
  Labs: [["LDL cholesterol", "92 mg/dL", "118 mg/dL", -22, true], ["ApoB", "78 mg/dL", "96 mg/dL", -18.8, true], ["HbA1c", "5.1%", "5.4%", -0.3, true, " pts"], ["hs-CRP", "0.6 mg/L", "1.4 mg/L", -57.1, true],
    ["Testosterone", "712 ng/dL", "586 ng/dL", 21.5, true], ["Vitamin D", "52 ng/mL", "31 ng/mL", 67.7, true], ["Triglycerides", "68 mg/dL", "104 mg/dL", -34.6, true], ["Ferritin", "118 ng/mL", "96 ng/mL", 22.9, true]],
};
// Gentle, deterministic trend from the previous value to the current one
const trendPts = (seed, up) => Array.from({ length: 12 }, (_, i) => (up ? i : 11 - i) * 1.2 + Math.sin(i * 1.7 + seed) * 1.6 + 20);
function KpiShowcase() {
  const [tab, setTab] = useState("Wearables");
  const cats = Object.keys(KPI_LIB);
  return (<section style={{ padding: "40px 0 96px" }}><div className="wrap">
    <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 28px" }}>
      <div className="eyebrow">KPIs</div>
      <h2 style={{ marginTop: 10 }}>The numbers that matter, tracked for you</h2>
      <p className="lede" style={{ marginTop: 14 }}>Every category gets its own KPI board: the current value, where it was, and whether it moved the right way.</p>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, marginBottom: 28 }}>
      {cats.map(c => <button key={c} onClick={() => setTab(c)} className="btn btn-sm" style={{ background: tab === c ? T.ink : "#fff", color: tab === c ? "#fff" : T.ink, borderColor: tab === c ? T.ink : T.line }}>{c}</button>)}
    </div>
    <div className="cats kpis">
      {KPI_LIB[tab].map(([label, value, from, delta, good, unit], i) => (
        <Kpi key={tab + label} label={label} value={value} from={from} delta={delta} good={good} unit={unit || "%"} pts={trendPts(i + tab.length, delta > 0)}/>))}
    </div>
    <p style={{ fontSize: 12.5, color: T.muted, textAlign: "center", marginTop: 18 }}>Example data. Green means it moved in the healthy direction, so lower body fat, LDL and resting heart rate count as wins.</p>
  </div></section>);
}
function Categories() {
  return (<section style={{ padding: "16px 0 80px" }}><div className="wrap">
    <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 36px" }}>
      <div className="eyebrow">Integrations</div>
      <h2 style={{ marginTop: 10 }}>All your health data, together for the first time</h2>
      <p className="lede" style={{ marginTop: 14 }}>BodyData connects through Apple Health, the apps' own connections, and the exports, PDFs and screenshots they give you.</p>
    </div>
    <div className="cats">
      {CATEGORIES.map(([ic, name, desc, apps]) => (
        <div key={name} className="card cat">
          <div className="ic">{ic}</div>
          <h3 style={{ fontSize: 18 }}>{name}</h3>
          <p style={{ fontSize: 14.5 }}>{desc}</p>
          <div className="chips">{apps.map(a => <span key={a}>{a}</span>)}</div>
        </div>))}
      <Link to="/integrations" className="card cat" style={{ background: T.soft, borderStyle: "dashed" }}>
        <div className="ic">+</div>
        <h3 style={{ fontSize: 18 }}>Anything else</h3>
        <p style={{ fontSize: 14.5 }}>Upload a CSV, PDF or screenshot and AI turns it into KPIs you can track over time.</p>
        <div style={{ marginTop: "auto", paddingTop: 6, fontSize: 14, fontWeight: 600, color: T.accent }}>See all integrations →</div>
      </Link>
    </div>
    <p style={{ fontSize: 12, color: T.muted, textAlign: "center", marginTop: 20 }}>Product names are trademarks of their respective owners, listed to describe compatibility. BodyData is not affiliated with or endorsed by them.</p>
  </div></section>);
}

// ── pages ──
function Home() {
  return (<>
    <section style={{ padding: "72px 0 56px" }}>
      <div className="wrap split">
        <div>
          <span className="pill">● New: Ask AI about your entire history</span>
          <h1 style={{ marginTop: 18 }}>Every metric your body produces. One dashboard.</h1>
          <p className="lede" style={{ marginTop: 20, maxWidth: 520 }}>BodyData pulls everything from all the apps you use (Steps, sleep, workout, HRV, body composition, training, nutrition) and shows you exactly what's changing, why, and how to improve!</p>
          <div style={{ display: "flex", gap: 12, marginTop: 30, flexWrap: "wrap" }}>
            <a href={APP_URL} className="btn btn-p">Join the free beta</a>
            <Link to="/features" className="btn btn-s">See how it works</Link></div>
          <p style={{ fontSize: 13.5, color: T.muted, marginTop: 14 }}>Free during the beta · No credit card · iPhone + web</p>
        </div>
        <DashboardMock/>
      </div>
    </section>
    <Categories/>
    <KpiShowcase/>

    <section className="band" style={{ padding: "88px 0" }}><div className="wrap">
      <div className="grid3">
        <Widget icon="◎" title="Body composition" caption="Fat, lean mass and segmental scans: every reading, with the trend that matters.">
          <div style={{ fontSize: 13, color: T.muted, textAlign: "center" }}>Body fat · 90 days</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: T.ink, textAlign: "center", margin: "4px 0 10px" }}>15.8%</div>
          <Spark pts={[18.2, 18, 17.9, 17.6, 17.4, 17.3, 17, 16.8, 16.5, 16.3, 16.1, 15.8]} color={T.green}/>
          <Row l="Fat mass" v="−4.9 lb" c={T.green}/><Row l="Lean mass" v="+1.6 lb" c={T.green}/></Widget>
        <Widget icon="♡" title="Recovery" caption="HRV, resting heart rate and sleep stages lined up against your training load.">
          <Row l="HRV" v="58 ms ↑14%" c={T.green}/><Row l="Resting HR" v="47 bpm ↓8%" c={T.green}/><Row l="Deep sleep" v="1 h 21 m" /><Row l="Readiness" v="86 / 100"/>
          <div style={{ marginTop: 12 }}><Bars vals={[62, 70, 58, 74, 81, 77, 86]} color={T.green} h={70}/></div></Widget>
        <Widget icon="▲" title="Training" caption="Sets, reps and volume per muscle group, synced from your workout app.">
          <div style={{ fontSize: 13, color: T.muted, textAlign: "center" }}>Weekly volume</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: T.ink, textAlign: "center", margin: "4px 0 12px" }}>142,560 lb</div>
          <Bars vals={[88, 96, 101, 94, 112, 120, 128, 143]}/></Widget>
      </div></div></section>

    <section style={{ padding: "96px 0 40px" }}><div className="wrap split">
      <h2>Stop guessing. Know what's actually moving the needle.</h2>
      <p className="lede">Most health apps show you today's number. BodyData compares every metric with the period before, flags what changed, and shows the history behind it. Weight from 182 to 172. Body fat down 1.8 points. HRV up 14%. All on one screen.</p>
    </div></section>
    <section style={{ padding: "40px 0 96px" }}><div className="wrap"><div className="grid3">
      <Widget icon="◷" title="Any date range" caption="This month vs last, this quarter, trailing 12 months, or any custom range.">
        <Row l="This month" v="vs last month"/><Row l="This quarter" v="vs last quarter"/><Row l="Trailing 12 months" v="vs the 12 before"/><Row l="Custom" v="Jun 3 – Aug 30"/></Widget>
      <Widget icon="⇅" title="Drill into anything" caption="Click any KPI for its full history: trend, bars, histogram and period highs and lows.">
        <Bars vals={[3, 6, 11, 17, 22, 19, 12, 7, 3]} color="#8A7CFF"/><div style={{ fontSize: 12.5, color: T.muted, textAlign: "center", marginTop: 10 }}>Days at each sleep duration</div></Widget>
      <Widget icon="✦" title="Your layout" caption="Show the KPIs you care about and drag them into the order you want, on web and iPhone.">
        {["Body fat %", "HRV", "Protein", "Steps"].map((x, i) => <div key={x} style={{ border: `1px solid ${T.line}`, borderRadius: 9, padding: "10px 12px", marginBottom: 8, fontSize: 14, fontWeight: 600, color: T.ink, display: "flex", justifyContent: "space-between", boxShadow: i === 1 ? "0 8px 20px rgba(43,46,74,.12)" : "none", transform: i === 1 ? "rotate(-1.5deg)" : "none" }}>{x}<span style={{ color: T.muted }}>⋮⋮</span></div>)}</Widget>
    </div></div></section>

    <Spotlight id="ai" eyebrow="Ask AI" title="Ask anything about your body" text="Ask why your recovery dropped, whether you're eating enough protein for your training, or what your best month did differently. BodyData's AI coach reads your full history, every metric back to day one, and current research, then answers with your actual numbers and a specific next step." mock={<ChatMock/>}/>
    <Spotlight id="automations" eyebrow="Automations" title="Everything flows in on its own" text="Anything that writes to Apple Health syncs automatically, within minutes. For the few apps that keep detail to themselves, BodyData reminds you to export and imports the file in one tap, then tells you the moment any source goes quiet." mock={<SourcesMock/>} reverse/>
    <Spotlight id="iphone" eyebrow="iPhone + web" title="In your pocket and on your desk" text="The iPhone app syncs Apple Health in the background and backfills your entire history, years of it, on day one. The web dashboard shows the same KPIs, in the same order, wherever you sign in." mock={<DashboardMock/>}/>
    <CTA/>
  </>);
}
function Spotlight({ id, eyebrow, title, text, mock, reverse }) {
  return (<section id={id} className={reverse ? "band" : ""} style={{ padding: "96px 0" }}>
    <div className={"wrap split" + (reverse ? " rev" : "")}>
      {reverse && mock}
      <div><div className="eyebrow">{eyebrow}</div><h2 style={{ marginTop: 10 }}>{title}</h2>
        <p className="lede" style={{ marginTop: 18 }}>{text}</p>
        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <a href={APP_URL} className="btn btn-p">Get started</a><Link to="/features" className="btn btn-s">Learn more</Link></div></div>
      {!reverse && mock}
    </div></section>);
}
function PageHero({ eyebrow, title, text }) {
  return (<section style={{ padding: "76px 0 40px", textAlign: "center" }}><div className="wrap" style={{ maxWidth: 820 }}>
    <div className="eyebrow">{eyebrow}</div><h1 style={{ marginTop: 12, fontSize: 48 }}>{title}</h1>
    {text && <p className="lede" style={{ marginTop: 18 }}>{text}</p>}</div></section>);
}
function Features() {
  return (<>
    <PageHero eyebrow="Product" title="A complete picture of your health, finally in one place" text="Dashboards, drill-downs, an AI coach and automations, built on top of the data you already collect."/>
    <section style={{ padding: "20px 0 40px" }}><div className="wrap"><DashboardMock/></div></section>
    <Spotlight id="ai" eyebrow="Ask AI" title="A coach that has read every data point" text="Ask in plain English. The AI looks up exactly the metrics and date ranges it needs, compares periods, spots what changed, and answers with your numbers, a clear explanation and what to do next." mock={<ChatMock/>}/>
    <Spotlight id="automations" eyebrow="Automations" title="A live map of every source" text="See which apps are sending data, what arrives automatically, and what needs an export. Set export reminders, import CSVs from any app (AI maps the columns), and get warned when a source stops." mock={<SourcesMock/>} reverse/>
    <section style={{ padding: "90px 0" }}><div className="wrap">
      <h2 style={{ textAlign: "center" }}>Everything that's included</h2>
      <div className="grid3" style={{ marginTop: 44 }}>
        {[["200+ Apple Health metrics", "Activity, heart, sleep, body, mobility, nutrition, environment and symptoms, each with its own KPI."],
          ["Period-over-period comparisons", "Every card shows the current value, the previous period and the change, coloured by whether it's good."],
          ["Lifetime history", "Backfill every day the iPhone has, often 10+ years, on the first sync."],
          ["Custom metrics", "Add DEXA, Bod Pod, InBody, RMR tests, tape measurements, or anything else, by hand or by spreadsheet."],
          ["Source tracking", "Each card shows which apps the number came from: Apple Watch, Oura, Hume, Fitbod and more."],
          ["Private by design", "Your data is yours: encrypted in transit and at rest, never sold, deletable in one tap."]]
          .map(([t, d]) => <div key={t} className="card" style={{ padding: 24 }}><h3 style={{ fontSize: 18 }}>{t}</h3><p style={{ marginTop: 8, fontSize: 15 }}>{d}</p></div>)}
      </div></div></section>
    <CTA/>
  </>);
}
function Integrations() {
  const groups = [["Automatic via Apple Health", "Anything that writes to Apple Health syncs on its own, usually within minutes.", ["Apple Watch", "iPhone", "Oura", "WHOOP", "Withings", "Hume", "Eight Sleep", "Garmin", "Strava", "Peloton", "MyFitnessPal", "Cronometer", "Lose It!", "Zero", "Stryd"]],
    ["Detailed exports", "Apps that keep detail to themselves: BodyData imports their export in one tap and reminds you on a schedule.", ["Fitbod (sets, reps, weights)", "Strong", "Hevy", "Any CSV: AI maps the columns"]],
    ["Manual & scans", "Lab-grade measurements you add yourself.", ["DEXA", "Bod Pod", "InBody", "RMR / metabolic tests", "Tape measurements", "Custom metrics"]]];
  return (<>
    <PageHero eyebrow="Integrations" title="Works with the apps you already use" text="If it writes to Apple Health, it's already in BodyData. For everything else there's one-tap import."/>
    <section style={{ padding: "20px 0 90px" }}><div className="wrap" style={{ display: "grid", gap: 24 }}>
      {groups.map(([t, d, apps]) => <div key={t} className="card" style={{ padding: 28 }}>
        <h3>{t}</h3><p style={{ marginTop: 6 }}>{d}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>{apps.map(a => <span key={a} style={{ border: `1px solid ${T.line}`, borderRadius: 999, padding: "7px 14px", fontSize: 14, fontWeight: 600, color: T.ink }}>{a}</span>)}</div></div>)}
      <p style={{ fontSize: 13, color: T.muted }}>Product names are trademarks of their respective owners and are listed to describe compatibility; BodyData is not affiliated with or endorsed by them.</p>
    </div></section>
    <CTA/>
  </>);
}
function Pricing() {
  const feats = ["Every Apple Health metric, 200+ KPIs", "Lifetime history backfill", "Ask AI: your personal coach", "Automations, export reminders & CSV import", "Custom metrics & body scans", "iPhone app + web dashboard", "Export or delete your data anytime"];
  return (<>
    <PageHero eyebrow="Pricing" title="Free during the beta." text="Everything is included while we build BodyData with our first members. No card needed."/>
    <section style={{ padding: "0 0 60px" }}><div className="wrap" style={{ maxWidth: 560 }}>

      <div className="card" style={{ padding: 34, borderColor: T.accent, boxShadow: "0 14px 40px rgba(84,104,255,.14)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><h3>BodyData Beta</h3><span className="pill">No card needed</span></div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 18 }}>
          <span style={{ fontSize: 52, fontWeight: 800, color: T.ink, letterSpacing: "-.04em" }}>$0</span>
          <span style={{ color: T.muted }}>during the beta</span></div>
        <p style={{ marginTop: 10, fontSize: 14, color: T.muted }}>Dashboards, syncing and imports are unlimited. Ask AI includes $1 of AI each month (about 20 questions plus your weekly reviews); extra AI credits will be available if you need more.</p>
        <a href={APP_URL} className="btn btn-p" style={{ width: "100%", justifyContent: "center", marginTop: 22 }}>Join the free beta</a>
        <div style={{ display: "grid", gap: 12, marginTop: 26 }}>{feats.map(f => <div key={f} className="chk">{f}</div>)}</div>
      </div></div></section>
    <section className="band" style={{ padding: "80px 0" }}><div className="wrap" style={{ maxWidth: 780 }}>
      <h2 style={{ textAlign: "center", marginBottom: 26 }}>Questions</h2>
      {[["Do I need an iPhone?", "The iPhone app is what reads Apple Health, so you need one to sync. Once synced, you can use the web dashboard from any computer."],
        ["Which apps does it work with?", "Anything that writes to Apple Health (Apple Watch, Oura, WHOOP, Withings, MyFitnessPal, Strava and hundreds more) syncs automatically. Apps that keep detail to themselves, like Fitbod's sets and reps, import in one tap."],
        ["How far back does my history go?", "As far back as your iPhone has data. The first sync backfills every day, often 10+ years."],
        ["Is my health data private?", "Yes. It's encrypted in transit and at rest, never sold or used for advertising, and you can export or permanently delete it at any time. See Security for details."],
        ["Is BodyData medical advice?", "No. BodyData helps you understand your own data. It isn't a medical device and doesn't diagnose or treat anything; talk to a doctor about medical decisions."],
        ["Is it really free?", "Yes, during the beta. Everything is included and there's no card to enter. Each month includes $1 of AI for Ask AI and weekly reviews; if you use more, you can add credits. We'll tell you well before any paid plan starts."]]
        .map(([q, a]) => <details key={q}><summary>{q}</summary><p style={{ marginTop: 10 }}>{a}</p></details>)}
    </div></section>
    <CTA/>
  </>);
}
function Security() {
  return (<>
    <PageHero eyebrow="Security & privacy" title="Your body's data stays yours" text="Health data is the most personal data there is. Here's exactly how we treat it."/>
    <section style={{ padding: "10px 0 90px" }}><div className="wrap grid3">
      {[["Encrypted in transit", "TLS on every connection; data lives in access-controlled databases."],
        ["Never sold, never ads", "We don't sell, rent or share your data, and we don't use it for advertising."],
        ["You're in control", "Export everything or permanently delete your account and data from settings, at any time."],
        ["Least access", "Apple Health access is read-only and limited to what you approve on your iPhone."],
        ["AI with guardrails", "AI features only see the data needed for your request, and our AI provider doesn't train on it."],
        ["Revocable access", "Every device and script has its own access key that you can revoke at any time."]]
        .map(([t, d]) => <div key={t} className="card" style={{ padding: 24 }}><h3 style={{ fontSize: 18 }}>{t}</h3><p style={{ marginTop: 8, fontSize: 15 }}>{d}</p></div>)}
    </div></section>
    <CTA/>
  </>);
}
function Legal({ kind }) {
  const privacy = kind === "privacy";
  return (<>
    <PageHero eyebrow="Legal" title={privacy ? "Privacy Policy" : "Terms of Service"}/>
    <section style={{ padding: "0 0 90px" }}><div className="wrap legal" style={{ maxWidth: 760 }}>
      {privacy ? <PrivacyText/> : <TermsText/>}
    </div></section>
  </>);
}

export default function Site({ page = "home" }) {
  const loc = useLocation();
  useEffect(() => {
    const h = loc.hash && document.querySelector(loc.hash);
    if (h) h.scrollIntoView({ behavior: "smooth" }); else window.scrollTo(0, 0);
    const titles = { home: "BodyData: every metric your body produces, in one dashboard", features: "Product · BodyData", pricing: "Pricing · BodyData", integrations: "Integrations · BodyData", security: "Security · BodyData", privacy: "Privacy · BodyData", terms: "Terms · BodyData" };
    document.title = titles[page] || titles.home;
  }, [loc.pathname, loc.hash, page]);
  const P = { home: Home, features: Features, pricing: Pricing, integrations: Integrations, security: Security }[page];
  return (<div className="bd"><style>{css}</style><Header/>
    <main>{P ? <P/> : <Legal kind={page}/>}</main><Footer/></div>);
}
