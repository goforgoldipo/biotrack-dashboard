import React, { useEffect, useState, useCallback } from "react";
import { btFmt, fmtDate } from "./shared/kpi.js";
import { track } from "./analytics.js";

// Profile & goal, feedback, and the goal card — web versions of the iPhone screens
const C = { ink: "#2B2E4A", body: "#4A4F6E", muted: "#7A80A6", line: "#E7E8F1", bg: "#F5F6FA", accent: "#5468FF", soft: "#EEF0FF", green: "#1F9D6B", red: "#D64545", amber: "#B7791F" };
const card = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 18 };
const h2 = { fontSize: 15, fontWeight: 700, color: C.ink };
const lbl = { fontSize: 12, color: C.muted, display: "block", marginBottom: 6 };
const DIETS = ["No specific diet", "High protein", "Low carb", "Keto", "Mediterranean", "Vegetarian", "Vegan", "Intermittent fasting", "Carnivore"];

function useApi(apiURL, apiSecret) {
  const base = (apiURL || "").replace(/\/sync\/?$/, "");
  return useCallback(async (path, body) => {
    const r = await fetch(base + path, { method: body ? "POST" : "GET", headers: { "x-api-secret": apiSecret, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `Server error ${r.status}`); return j;
  }, [base, apiSecret]);
}
const Chip = ({ on, children, onClick }) => (
  <button onClick={onClick} style={{ border: `1px solid ${on ? C.accent : C.line}`, background: on ? C.accent : "#fff", color: on ? "#fff" : C.ink, borderRadius: 999, padding: "7px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>{children}</button>);

export function GoalCard({ goal, onEdit }) {
  if (!goal) return null;
  const v = x => btFmt(x, goal.unit === "lbs" ? "lbs" : goal.unit);
  const tag = goal.reached ? ["Reached", C.green] : goal.current == null ? null : goal.onTrack ? ["On track", C.green] : ["Behind pace", C.amber];
  return (
    <div style={{ ...card, marginTop: 16, cursor: onEdit ? "pointer" : "default" }} onClick={onEdit}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: C.accent, flex: 1 }}>Goal · {goal.label}</span>
        {tag && <span style={{ fontSize: 11.5, fontWeight: 700, color: tag[1], background: tag[1] + "18", borderRadius: 999, padding: "2px 9px" }}>{tag[0]}</span>}
      </div>
      {goal.current == null ? <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>{goal.note || "No recent data for this metric yet."}</div> : <>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 28, fontWeight: 800, color: C.ink, letterSpacing: "-.02em" }}>{v(goal.current)}</span>
          <span style={{ fontSize: 13.5, color: C.muted, fontWeight: 600 }}>→ {v(goal.target)}{goal.by ? ` by ${fmtDate(goal.by)}` : ""}</span>
        </div>
        <div style={{ height: 8, background: C.soft, borderRadius: 99, marginTop: 10 }}><div style={{ height: 8, width: `${Math.max(2, Math.min(100, goal.pct || 0))}%`, background: C.accent, borderRadius: 99 }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, marginTop: 6, gap: 10, flexWrap: "wrap" }}>
          <span>Started at {v(goal.start)} · {goal.pct}% of the way</span>
          <span>{goal.perWeek != null ? `${goal.perWeek >= 0 ? "+" : ""}${goal.unit === "%" ? btFmt(goal.perWeek, "") + " pts" : v(goal.perWeek)} / week` : ""}{goal.projected && !goal.reached ? ` · there by ${fmtDate(goal.projected)} at this pace` : ""}</span>
        </div></>}
    </div>);
}

export function ProfilePanel({ apiURL, apiSecret, onSaved }) {
  const api = useApi(apiURL, apiSecret);
  const [r, setR] = useState(null), [p, setP] = useState({}), [err, setErr] = useState(""), [msg, setMsg] = useState(""), [saving, setSaving] = useState(false);
  const [tMetric, setTMetric] = useState(""), [tValue, setTValue] = useState(""), [tBy, setTBy] = useState("");
  const load = useCallback(async () => {
    try { const j = await api("/profile"); setR(j); setP(j.profile || {}); const t = j.profile?.target;
      setTMetric(t?.metric || j.options.goals.find(g => g.id === j.profile?.goal)?.metrics[0] || "bodyFat"); setTValue(t?.value ?? ""); setTBy(t?.by || ""); setErr(""); }
    catch (e) { setErr(e.message); }
  }, [api]);
  useEffect(() => { load(); }, [load]);
  if (!r) return <div style={{ padding: 28, color: err ? C.red : C.muted }}>{err || "Loading…"}</div>;
  const o = r.options;
  const goalIds = p.goals?.length ? p.goals : p.goal ? [p.goal] : [];
  const gm = [...new Set(goalIds.flatMap(id => o.goals.find(g => g.id === id)?.metrics || []))];
  const metrics = (gm.length ? gm : o.targets.map(t => t.id)).map(id => o.targets.find(t => t.id === id)).filter(Boolean);
  const toggleGoal = (id) => { const gs = goalIds.includes(id) ? goalIds.filter(x => x !== id) : [...goalIds, id];
    setP(x => ({ ...x, goals: gs, goal: gs[0] || null })); setMsg("");
    const ms = [...new Set(gs.flatMap(g => o.goals.find(x => x.id === g)?.metrics || []))]; if (ms.length && !ms.includes(tMetric)) setTMetric(ms[0]); };
  const set = (k, v) => { setP(x => ({ ...x, [k]: v })); setMsg(""); };
  const save = async () => {
    setSaving(true); setMsg("");
    try {
      const body = { ...p, goals: goalIds, completed: true, target: tValue === "" ? null : { metric: tMetric, value: parseFloat(tValue), by: tBy || null } };
      delete body.completedAt;
      const j = await api("/profile", body); setR(x => ({ ...x, profile: j.profile, goal: j.goal })); setMsg("Saved."); track("profile_completed", { goal: goalIds[0] || "none", goals: goalIds.length, apps: (p.apps || []).length, platform: "web" }); onSaved?.();
    } catch (e) { setMsg("⚠ " + e.message); }
    setSaving(false);
  };
  const heightFt = p.heightIn ? Math.floor(p.heightIn / 12) : "", heightIn = p.heightIn ? Math.round(p.heightIn % 12) : "";
  const cats = [...new Set(o.apps.map(a => a.cat))];
  return (
    <div className="bt-pad" style={{ padding: "18px 28px 40px", maxWidth: 900, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Profile & goal</div>
      <div style={{ fontSize: 12.5, color: C.muted, margin: "2px 0 16px" }}>Shapes your Home order, goal tracking, benchmarks and how the AI coaches you. Saved to your account; the iPhone app uses the same answers.</div>
      <GoalCard goal={r.goal} />
      <div style={{ ...card, marginTop: 16 }}>
        <div style={h2}>Your goals</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>Pick as many as you like. The first one is your main goal and leads your board and coaching.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>{o.goals.map(g => { const i = goalIds.indexOf(g.id);
          return <Chip key={g.id} on={i >= 0} onClick={() => toggleGoal(g.id)}>{g.label}{i === 0 && goalIds.length > 1 ? " · Main" : ""}</Chip>; })}</div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 16, alignItems: "flex-end" }}>
          <label style={{ fontSize: 12, color: C.muted }}>Target metric<select className="bt-date" value={tMetric} onChange={e => setTMetric(e.target.value)}>{metrics.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
          <label style={{ fontSize: 12, color: C.muted, width: 120 }}>Target value<input className="bt-date" inputMode="decimal" value={tValue} onChange={e => setTValue(e.target.value.replace(/[^0-9.]/g, ""))} placeholder={o.targets.find(t => t.id === tMetric)?.unit || ""} /></label>
          <label style={{ fontSize: 12, color: C.muted }}>By (optional)<input type="date" className="bt-date" value={tBy} onChange={e => setTBy(e.target.value)} /></label>
          {tValue !== "" && <button className="bt-btn" onClick={() => setTValue("")}>Clear target</button>}
        </div>
      </div>
      <div style={{ ...card, marginTop: 16 }}>
        <div style={h2}>About you</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, alignItems: "flex-end" }}>
          <div><span style={lbl}>Sex</span><div style={{ display: "flex", gap: 6 }}>{["male", "female"].map(s => <Chip key={s} on={p.sex === s} onClick={() => set("sex", s)}>{s === "male" ? "Male" : "Female"}</Chip>)}</div></div>
          <label style={{ fontSize: 12, color: C.muted, width: 110 }}>Birth year<input className="bt-date" inputMode="numeric" value={p.birthYear || ""} onChange={e => set("birthYear", e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="1988" /></label>
          <label style={{ fontSize: 12, color: C.muted, width: 80 }}>Height ft<input className="bt-date" inputMode="numeric" value={heightFt} onChange={e => set("heightIn", (parseInt(e.target.value) || 0) * 12 + (heightIn || 0))} /></label>
          <label style={{ fontSize: 12, color: C.muted, width: 80 }}>in<input className="bt-date" inputMode="numeric" value={heightIn} onChange={e => set("heightIn", (heightFt || 0) * 12 + (parseInt(e.target.value) || 0))} /></label>
          <div><span style={lbl}>Units</span><div style={{ display: "flex", gap: 6 }}><Chip on={p.units !== "metric"} onClick={() => set("units", "imperial")}>lb · in</Chip><Chip on={p.units === "metric"} onClick={() => set("units", "metric")}>kg · cm</Chip></div></div>
        </div>
      </div>
      <div style={{ ...card, marginTop: 16 }}>
        <div style={h2}>Apps & devices you use</div>
        <div style={{ fontSize: 12.5, color: C.muted, margin: "2px 0 4px" }}>Pick yours to see exactly how each one gets into BodyData.</div>
        {cats.map(c => <div key={c} style={{ marginTop: 12 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: C.accent, marginBottom: 6 }}>{c}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{o.apps.filter(a => a.cat === c).map(a => { const on = (p.apps || []).includes(a.id);
            return <Chip key={a.id} on={on} onClick={() => set("apps", on ? p.apps.filter(x => x !== a.id) : [...(p.apps || []), a.id])}>{a.name}</Chip>; })}</div>
        </div>)}
        {(p.apps || []).length > 0 && <div style={{ marginTop: 16, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
          {o.apps.filter(a => p.apps.includes(a.id)).map(a => <div key={a.id} style={{ padding: "6px 0", fontSize: 13 }}><b style={{ color: C.ink }}>{a.name}</b> <span style={{ color: C.body }}>{a.how}</span></div>)}
        </div>}
      </div>
      <div style={{ ...card, marginTop: 16 }}>
        <div style={h2}>Training & nutrition</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10, alignItems: "flex-end" }}>
          <label style={{ fontSize: 12, color: C.muted, width: 150 }}>Workouts per week<select className="bt-date" value={p.trainingDays ?? ""} onChange={e => set("trainingDays", e.target.value === "" ? null : +e.target.value)}><option value="">—</option>{[0, 1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
        </div>
        <span style={{ ...lbl, marginTop: 12 }}>Diet style</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>{DIETS.map(d => <Chip key={d} on={p.diet === d} onClick={() => set("diet", d)}>{d}</Chip>)}</div>
        <textarea className="bt-date" rows={3} style={{ marginTop: 12, width: "100%", resize: "vertical", fontFamily: "inherit" }} value={p.notes || ""} onChange={e => set("notes", e.target.value)} placeholder="Anything else? Injuries, schedule, what you've tried… (optional)" />
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
        <button className="bt-btn" disabled={saving || !goalIds.length} onClick={save} style={{ background: C.accent, borderColor: C.accent, color: "#fff", height: 40, padding: "0 20px" }}>{saving ? "Saving…" : "Save profile"}</button>
        {!goalIds.length && <span style={{ fontSize: 12.5, color: C.muted }}>Pick at least one goal to save.</span>}
        {msg && <span style={{ fontSize: 13, fontWeight: 600, color: msg.startsWith("⚠") ? C.red : C.green }}>{msg}</span>}
      </div>
    </div>);
}

const STATUS = [["new", "New"], ["planned", "Planned"], ["in_progress", "In progress"], ["done", "Done"], ["wont_do", "Won't do"]];
const PRIO = {
  bug: [["blocking", "Blocks me"], ["annoying", "Annoying"], ["minor", "Minor"]],
  feature: [["must_have", "Must have"], ["nice_to_have", "Nice to have"], ["idea", "Just an idea"]],
};
const PRIO_LABEL = Object.fromEntries([...PRIO.bug, ...PRIO.feature]);
const area = { marginTop: 8, width: "100%", resize: "vertical", fontFamily: "inherit" };

// One form per kind: a bug report and a feature request ask different questions
function FeedbackForm({ kind, api, onSent }) {
  const bug = kind === "bug";
  const [title, setTitle] = useState(""), [a, setA] = useState(""), [b, setB] = useState(""), [prio, setPrio] = useState(bug ? "annoying" : "nice_to_have");
  const [shot, setShot] = useState(null), [sending, setSending] = useState(false), [msg, setMsg] = useState("");
  const pick = (f) => { if (!f) return; if (f.size > 5e6) { setMsg("⚠ Screenshot must be under 5 MB."); return; }
    const rd = new FileReader(); rd.onload = () => setShot({ name: f.name, data: String(rd.result).split(",")[1] }); rd.readAsDataURL(f); };
  const send = async () => {
    setSending(true); setMsg("");
    const body = bug
      ? [a.trim() && `Steps to reproduce:\n${a.trim()}`, b.trim() && `Expected vs what happened:\n${b.trim()}`].filter(Boolean).join("\n\n")
      : [a.trim() && `Why it matters:\n${a.trim()}`, b.trim() && `How it could work:\n${b.trim()}`].filter(Boolean).join("\n\n");
    try {
      await api("/feedback", { kind, title, body, priority: prio, platform: "web", appVersion: "web", device: navigator.userAgent.replace(/^Mozilla\/5\.0 /, "").slice(0, 80),
        screen: new URLSearchParams(location.search).get("from") || "Feedback", screenshot: shot?.data });
      track("feedback_sent", { kind, priority: prio, screenshot: !!shot, platform: "web" });
      setTitle(""); setA(""); setB(""); setShot(null); setMsg(bug ? "Thanks! Your bug report was sent." : "Thanks! Your request was sent."); onSent();
    } catch (e) { setMsg("⚠ " + e.message); }
    setSending(false);
  };
  return (
    <div style={{ ...card, flex: "1 1 340px", minWidth: 0 }}>
      <div style={h2}>{bug ? "🐞 Report a bug" : "💡 Request a feature"}</div>
      <div style={{ fontSize: 12.5, color: C.muted, margin: "2px 0 10px" }}>{bug ? "Something broken, wrong or confusing? Tell us what happened." : "What would make BodyData more useful to you?"}</div>
      <input className="bt-date" style={{ width: "100%" }} value={title} onChange={e => setTitle(e.target.value)} maxLength={140}
        placeholder={bug ? "What went wrong? (e.g. sleep shows 14 h)" : "What should BodyData do? (e.g. connect Garmin)"} />
      <textarea className="bt-date" rows={3} style={area} value={a} onChange={e => setA(e.target.value)}
        placeholder={bug ? "Steps to reproduce: what you clicked or opened" : "Why it matters: what you're trying to do"} />
      <textarea className="bt-date" rows={2} style={area} value={b} onChange={e => setB(e.target.value)}
        placeholder={bug ? "What you expected vs what happened" : "How it could work (optional)"} />
      <div style={{ ...lbl, marginTop: 10 }}>{bug ? "How much does it get in your way?" : "How much do you want it?"}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{PRIO[kind].map(([k, l]) => <Chip key={k} on={prio === k} onClick={() => setPrio(k)}>{l}</Chip>)}</div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <label className="bt-btn" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>{shot ? "✓ " + shot.name : bug ? "Attach screenshot" : "Attach image"}<input type="file" accept="image/png,image/jpeg" style={{ display: "none" }} onChange={e => { pick(e.target.files?.[0]); e.target.value = ""; }} /></label>
        <button className="bt-btn" disabled={!title.trim() || sending} onClick={send} style={{ background: C.accent, borderColor: C.accent, color: "#fff" }}>{sending ? "Sending…" : bug ? "Send bug report" : "Send request"}</button>
      </div>
      {msg && <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8, color: msg.startsWith("⚠") ? C.red : C.green }}>{msg}</div>}
      {bug && <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>We include your browser and app version so we can reproduce it. No health data is sent.</div>}
    </div>);
}

export function FeedbackPanel({ apiURL, apiSecret }) {
  const api = useApi(apiURL, apiSecret);
  const [items, setItems] = useState(null), [owner, setOwner] = useState(false), [filter, setFilter] = useState("all");
  const load = useCallback(async () => { try { const j = await api("/feedback"); setItems(j.items); setOwner(!!j.isOwner); } catch { setItems([]); } }, [api]);
  useEffect(() => { load(); }, [load]);
  const setStatus = async (id, status) => { await api(`/feedback/${id}/status`, { status }).catch(() => {}); setItems(xs => xs.map(x => x.id === id ? { ...x, status } : x)); };
  const shown = (items || []).filter(x => filter === "all" || x.kind === filter);
  const statusLabel = Object.fromEntries(STATUS);
  return (
    <div className="bt-pad" style={{ padding: "18px 28px 40px", maxWidth: 980, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.ink }}>Feedback</div>
      <div style={{ fontSize: 12.5, color: C.muted, margin: "2px 0 16px" }}>BodyData is in beta. Every bug report and request goes straight to the team.</div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <FeedbackForm kind="bug" api={api} onSent={load} />
        <FeedbackForm kind="feature" api={api} onSent={load} />
      </div>
      <div style={{ ...card, marginTop: 16, padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 18px", borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}>
          <div style={{ ...h2, flex: 1 }}>{owner ? "Inbox (all users)" : "Your submissions"} {items ? `(${items.length})` : ""}</div>
          {[["all", "All"], ["bug", "Bugs"], ["feature", "Features"]].map(([k, l]) => <Chip key={k} on={filter === k} onClick={() => setFilter(k)}>{l}</Chip>)}
        </div>
        {items == null ? <div style={{ padding: 18, color: C.muted, fontSize: 13 }}>Loading…</div> : !shown.length ? <div style={{ padding: 18, color: C.muted, fontSize: 13 }}>Nothing yet.</div> :
          shown.map(x => <div key={x.id} style={{ padding: "12px 18px", borderTop: `1px solid #F1F2F8`, display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ fontSize: 16 }}>{x.kind === "bug" ? "🐞" : "💡"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: C.ink, fontSize: 14 }}>{x.title}
                {x.priority && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "1px 8px", color: x.priority === "blocking" || x.priority === "must_have" ? C.red : C.muted, background: C.bg }}>{PRIO_LABEL[x.priority] || x.priority}</span>}</div>
              {x.body && <div style={{ fontSize: 13, color: C.body, marginTop: 2, whiteSpace: "pre-wrap" }}>{x.body}</div>}
              <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>{new Date(x.created_at).toLocaleString()} · {x.platform || "?"} {x.app_version} · {x.device}{x.screen ? ` · ${x.screen}` : ""}
                {x.has_screenshot && <> · <a href={`${(apiURL || "").replace(/\/sync\/?$/, "")}/feedback/${x.id}/screenshot`} onClick={async e => { e.preventDefault();
                  const r = await fetch(e.currentTarget.href, { headers: { "x-api-secret": apiSecret } }); window.open(URL.createObjectURL(await r.blob()), "_blank"); }} style={{ color: C.accent }}>screenshot</a></>}</div>
            </div>
            {owner
              ? <select className="bt-date" style={{ width: "auto", marginTop: 0 }} value={x.status} onChange={e => setStatus(x.id, e.target.value)}>{STATUS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              : <span style={{ fontSize: 11.5, fontWeight: 700, color: x.status === "done" ? C.green : C.muted, background: C.bg, borderRadius: 999, padding: "3px 10px", whiteSpace: "nowrap" }}>{statusLabel[x.status] || "New"}</span>}
          </div>)}
      </div>
    </div>);
}

// Terms + health-data consent: shown until the current version is accepted (recorded server-side)
export function ConsentGate({ apiURL, apiSecret }) {
  const api = useApi(apiURL, apiSecret);
  const [need, setNeed] = useState(null), [terms, setTerms] = useState(false), [health, setHealth] = useState(false), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => { if (!apiSecret) return; api("/consent").then(j => setNeed(j.required ? j.current : null)).catch(() => {}); }, [api, apiSecret]);
  if (!need) return null;
  const accept = async () => { setBusy(true); setErr("");
    try { await api("/consent", { version: need, terms: true, health: true, platform: "web" }); track("consent_accepted", { version: need }); setNeed(null); } catch (e) { setErr(e.message); }
    setBusy(false); };
  const box = (on, set, children) => (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13.5, color: C.body, lineHeight: 1.5, marginTop: 12, cursor: "pointer" }}>
      <input type="checkbox" checked={on} onChange={e => set(e.target.checked)} style={{ marginTop: 3, width: 16, height: 16, accentColor: C.accent }} /><span>{children}</span></label>);
  const a = (href, t) => <a href={href} target="_blank" rel="noreferrer" style={{ color: C.accent }}>{t}</a>;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(20,22,40,.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ ...card, maxWidth: 520, width: "100%", padding: 24 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: C.ink }}>Before you start</div>
        <div style={{ fontSize: 13.5, color: C.body, marginTop: 6, lineHeight: 1.55 }}>BodyData stores the health data you choose to share and uses service providers (hosting and AI) to run the app. It's not medical advice. Please review and agree to continue.</div>
        {box(terms, setTerms, <>I'm 18 or older and I agree to the {a("/terms", "Terms of Service")} (including the arbitration agreement) and the {a("/privacy", "Privacy Policy")}.</>)}
        {box(health, setHealth, <>I consent to BodyData collecting, storing and processing the health data I choose to share, including sending it to its hosting and AI providers to run the features I use, as described in the Privacy Policy. I understand I share it at my own risk and can withdraw by deleting my account.</>)}
        {err && <div style={{ color: C.red, fontSize: 13, marginTop: 10 }}>{err}</div>}
        <button className="bt-btn" disabled={!terms || !health || busy} onClick={accept} style={{ marginTop: 18, width: "100%", padding: "10px", background: C.accent, borderColor: C.accent, color: "#fff", opacity: !terms || !health ? .5 : 1 }}>{busy ? "Saving…" : "Agree and continue"}</button>
      </div>
    </div>);
}

// Export everything / permanently delete the account
export function AccountCard({ apiURL, apiSecret }) {
  const base = (apiURL || "").replace(/\/sync\/?$/, "");
  const [confirm, setConfirm] = useState(""), [msg, setMsg] = useState(""), [busy, setBusy] = useState(false);
  const exportAll = async () => { setBusy(true); setMsg("");
    try { const r = await fetch(base + "/export", { headers: { "x-api-secret": apiSecret } }); if (!r.ok) throw new Error(`Error ${r.status}`);
      const u = URL.createObjectURL(await r.blob()), el = document.createElement("a"); el.href = u; el.download = `bodydata-export-${new Date().toISOString().slice(0, 10)}.json`; el.click(); URL.revokeObjectURL(u); }
    catch (e) { setMsg("⚠ " + e.message); } setBusy(false); };
  const del = async () => { setBusy(true); setMsg("");
    try { const r = await fetch(base + "/account/delete", { method: "POST", headers: { "x-api-secret": apiSecret, "Content-Type": "application/json" }, body: JSON.stringify({ confirm }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
      try { localStorage.clear(); } catch {} window.location.href = "/"; }
    catch (e) { setMsg("⚠ " + e.message); setBusy(false); } };
  return (
    <div className="bt-pad" style={{ padding: "0 28px 40px", maxWidth: 900, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={card}>
        <div style={h2}>Your data</div>
        <div style={{ fontSize: 12.5, color: C.muted, margin: "2px 0 12px" }}>Download everything BodyData stores for you, or permanently delete your account. See the <a href="/privacy" style={{ color: C.accent }}>Privacy Policy</a>.</div>
        <button className="bt-btn" disabled={busy} onClick={exportAll}>Export my data (JSON)</button>
        <div style={{ borderTop: `1px solid ${C.line}`, marginTop: 16, paddingTop: 14 }}>
          <div style={{ fontWeight: 600, color: C.red, fontSize: 14 }}>Delete account</div>
          <div style={{ fontSize: 12.5, color: C.muted, margin: "2px 0 8px" }}>Permanently deletes your account and all your data: synced health data, uploads, sections, goals, alerts, chats and feedback. This can't be undone. Your Apple Health data on your iPhone isn't affected.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input className="bt-date" style={{ width: 180, marginTop: 0 }} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Type DELETE" />
            <button className="bt-btn" disabled={confirm !== "DELETE" || busy} onClick={del} style={{ background: C.red, borderColor: C.red, color: "#fff", opacity: confirm !== "DELETE" ? .5 : 1 }}>Delete my account</button>
          </div>
        </div>
        {msg && <div style={{ fontSize: 13, color: C.red, marginTop: 8 }}>{msg}</div>}
      </div>
    </div>);
}

// Owner only: invite-only switch, invites and the waitlist
export function BetaAccessCard({ apiURL, apiSecret }) {
  const base = (apiURL || "").replace(/\/sync\/?$/, "");
  const [d, setD] = useState(null), [emails, setEmails] = useState(""), [msg, setMsg] = useState("");
  const call = async (path, body) => {
    const r = await fetch(base + path, body ? { method: "POST", headers: { "x-api-secret": apiSecret, "Content-Type": "application/json" }, body: JSON.stringify(body) } : { headers: { "x-api-secret": apiSecret } });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `Error ${r.status}`); return j;
  };
  const load = () => call("/admin/signup").then(setD).catch(e => setMsg("⚠ " + e.message));
  useEffect(() => { if (apiSecret) load(); }, [apiSecret]);
  const act = async (path, body, done) => { setMsg(""); try { await call(path, body); done?.(); await load(); } catch (e) { setMsg("⚠ " + e.message); } };
  if (!d) return msg ? <div className="bt-pad" style={{ padding: "0 28px 20px", color: C.red, fontSize: 13 }}>{msg}</div> : null;
  const invite = d.mode === "invite";
  const row = { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: `1px solid ${C.line}`, fontSize: 13 };
  const when = (t) => new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return (
    <div className="bt-pad" style={{ padding: "0 28px 24px", maxWidth: 900, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={h2}>Beta access <span style={{ fontSize: 11, color: C.muted, fontWeight: 500 }}>· only you see this</span></div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 2 }}>
              {invite ? "Invite-only: new people need an invite to create an account. Everyone else joins the waitlist." : "Open: anyone can create an account."} {d.users} user{d.users === 1 ? "" : "s"} besides you.
            </div>
          </div>
          <button className="bt-btn" onClick={() => act("/admin/signup", { mode: invite ? "open" : "invite" })}>{invite ? "Open sign-up to everyone" : "Switch to invite-only"}</button>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <input className="bt-date" style={{ flex: "1 1 260px", marginTop: 0 }} value={emails} onChange={e => setEmails(e.target.value)} placeholder="Emails to invite (comma separated)" />
          <button className="bt-btn" disabled={!emails.trim()} onClick={() => act("/admin/invites", { email: emails }, () => setEmails(""))}>Invite</button>
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>This lets them sign up with that email. It doesn't send an email yet, so tell them yourself.</div>
        {d.waitlist.length > 0 && <div style={{ marginTop: 16 }}>
          <div className="bt-eyebrow" style={{ marginBottom: 4 }}>Waitlist ({d.waitlist.length})</div>
          {d.waitlist.map(w => <div key={w.email} style={row}><span style={{ flex: 1 }}>{w.email}</span><span style={{ color: C.muted }}>{when(w.first_at)}</span><button className="bt-btn" onClick={() => act("/admin/invites", { email: w.email })}>Invite</button></div>)}
        </div>}
        {d.invites.length > 0 && <div style={{ marginTop: 16 }}>
          <div className="bt-eyebrow" style={{ marginBottom: 4 }}>Invited ({d.invites.length})</div>
          {d.invites.map(i => <div key={i.email} style={row}><span style={{ flex: 1 }}>{i.email}</span><span style={{ color: i.used_at ? C.accent : C.muted }}>{i.used_at ? "Joined " + when(i.used_at) : "Invited " + when(i.invited_at)}</span>
            {!i.used_at && <button className="bt-btn" onClick={() => act("/admin/invites/remove", { email: i.email })}>Remove</button>}</div>)}
        </div>}
        {msg && <div style={{ fontSize: 13, color: C.red, marginTop: 8 }}>{msg}</div>}
      </div>
    </div>);
}
