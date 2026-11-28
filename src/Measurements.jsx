import React, { useEffect, useState, useCallback, useRef } from "react";
import { track } from "./analytics.js";

// Body measurements: paste / photo / PDF → AI fills the form → review → save. Every entry is kept with
// the date taken and the time it was logged; values are stored in inches and shown in in or cm.
const C = { ink: "#2B2E4A", body: "#4A4F6E", muted: "#7A80A6", line: "#E7E8F1", bg: "#F5F6FA", accent: "#5468FF", soft: "#EEF0FF", green: "#1F9D6B", red: "#D64545" };
const card = { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 12, padding: 18, marginBottom: 16 };
const h2 = { fontSize: 15, fontWeight: 700, color: C.ink };
const SITES = [
  ["neckIn", "Neck"], ["shouldersIn", "Shoulders"], ["chestIn", "Chest"], ["waistIn", "Waist"], ["hipsIn", "Hips"],
  ["leftBicepIn", "Left bicep"], ["rightBicepIn", "Right bicep"], ["leftForearmIn", "Left forearm"], ["rightForearmIn", "Right forearm"],
  ["leftThighIn", "Left thigh"], ["rightThighIn", "Right thigh"], ["leftCalfIn", "Left calf"], ["rightCalfIn", "Right calf"],
];
const LOWER_BETTER = new Set(["waistIn", "hipsIn"]);   // the rest: growth is usually the goal
const today = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); };
const fmtDay = (s) => s ? new Date(s + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";
const fmtStamp = (t) => new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

// Shrink big phone photos before upload (max 2000px JPEG); PDFs go as they are
async function fileToAttachment(file) {
  if (file.type === "application/pdf") {
    if (file.size > 18e6) throw new Error("That PDF is over 18 MB.");
    const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = no; r.readAsDataURL(file); });
    return { data, mediaType: "application/pdf", filename: file.name };
  }
  if (!/^image\//.test(file.type)) throw new Error("Use a photo, screenshot or PDF.");
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => no(new Error("Couldn't open that image (HEIC? take a screenshot instead).")); i.src = URL.createObjectURL(file); });
  const s = Math.min(1, 2000 / Math.max(img.width, img.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(img.width * s); cv.height = Math.round(img.height * s);
  cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
  return { data: cv.toDataURL("image/jpeg", 0.88).split(",")[1], mediaType: "image/jpeg", filename: file.name };
}

export function MeasurementsPanel({ apiURL, apiSecret, onSaved }) {
  const base = (apiURL || "").replace(/\/sync\/?$/, "");
  const api = useCallback(async (path, body) => {
    const r = await fetch(base + path, { method: body ? "POST" : "GET", headers: { "x-api-secret": apiSecret, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `Server error ${r.status}`); return j;
  }, [base, apiSecret]);
  const [unit, setUnitS] = useState(() => { try { return localStorage.getItem("bt_meas_unit") || "in"; } catch { return "in"; } });
  const setUnit = (u) => {
    if (u === unit) return;
    // convert anything already typed or read so the numbers stay the same length
    setVals(v => Object.fromEntries(Object.entries(v).map(([k, x]) => { const n = Number(String(x).replace(",", ".")); return [k, String(x).trim() === "" || !isFinite(n) ? x : String(Math.round((u === "cm" ? n * 2.54 : n / 2.54) * (u === "cm" ? 10 : 100)) / (u === "cm" ? 10 : 100))]; })));
    setUnitS(u); try { localStorage.setItem("bt_meas_unit", u); } catch {}
  };
  const conv = (inch) => inch == null ? null : unit === "cm" ? Math.round(inch * 2.54 * 10) / 10 : Math.round(inch * 100) / 100;
  const fmt = (inch) => inch == null ? "—" : `${conv(inch)} ${unit}`;

  const [entries, setEntries] = useState(null);
  const load = () => api("/measurements").then(j => setEntries(j.entries)).catch(e => setMsg("⚠ " + e.message));
  useEffect(() => { if (apiSecret) load(); }, [apiSecret]);

  // Add form: values held in the DISPLAY unit as strings
  const [text, setText] = useState(""), [file, setFile] = useState(null), [drag, setDrag] = useState(false);
  const [date, setDate] = useState(today()), [source, setSource] = useState(""), [vals, setVals] = useState({}), [notes, setNotes] = useState({});
  const [busy, setBusy] = useState(""), [msg, setMsg] = useState(""), [extra, setExtra] = useState([]);
  const fileRef = useRef();
  const filled = Object.values(vals).filter(v => String(v).trim() !== "").length;

  const read = async () => {
    setBusy("read"); setMsg("");
    try {
      const body = { text: text.trim() || undefined };
      if (file) body.attachment = await fileToAttachment(file);
      const { draft } = await api("/measurements/extract", body);
      const v = {}; for (const [k, inch] of Object.entries(draft.values)) v[k] = String(conv(inch));
      setVals(v); setNotes(draft.notes || {}); setExtra(draft.unrecognized || []);
      if (draft.date) setDate(draft.date); if (draft.source) setSource(draft.source);
      setMsg(`Found ${Object.keys(v).length} measurement${Object.keys(v).length === 1 ? "" : "s"}${draft.unit !== unit ? ` (converted from ${draft.unit})` : ""}. Check them, then save.`);
      track("measurements_read", { via: file ? (file.type === "application/pdf" ? "pdf" : "image") : "text", found: Object.keys(v).length });
    } catch (e) { setMsg("⚠ " + e.message); }
    setBusy("");
  };
  const save = async () => {
    setBusy("save"); setMsg("");
    try {
      const values = {};
      for (const [k, v] of Object.entries(vals)) if (String(v).trim() !== "") { const n = Number(String(v).replace(",", ".")); values[k] = unit === "cm" ? n / 2.54 : n; }
      await api("/measurements", { date, values, source: source || undefined });
      setVals({}); setNotes({}); setExtra([]); setText(""); setFile(null); setSource(""); setDate(today());
      setMsg("✓ Saved. It's on your dashboard under Body Measurements.");
      track("measurements_saved", { sites: Object.keys(values).length });
      await load(); onSaved?.();
    } catch (e) { setMsg("⚠ " + e.message); }
    setBusy("");
  };
  const del = async (id) => { if (!confirm("Delete this entry?")) return; try { await api(`/measurements/${id}/delete`, {}); await load(); onSaved?.(); } catch (e) { setMsg("⚠ " + e.message); } };

  // Progress per site: latest, previous and first reading (entries arrive newest first)
  const progress = SITES.map(([k, l]) => {
    const pts = (entries || []).filter(e => e.values[k] != null).map(e => ({ d: e.date, v: e.values[k] }));
    return { k, l, latest: pts[0], prev: pts[1], first: pts.length > 1 ? pts[pts.length - 1] : null };
  }).filter(p => p.latest);
  const Delta = ({ k, a, b }) => {
    if (!a || !b) return <span style={{ color: C.muted }}>—</span>;
    const d = a.v - b.v; if (Math.abs(d) < 0.005) return <span style={{ color: C.muted }}>no change</span>;
    const good = LOWER_BETTER.has(k) ? d < 0 : d > 0, col = k === "neckIn" ? C.body : good ? C.green : C.red;
    return <span style={{ color: col, fontWeight: 600 }}>{d > 0 ? "↑" : "↓"}{Math.abs(conv(Math.abs(d)) || 0)} {unit} <span style={{ fontWeight: 500, opacity: .8 }}>({d > 0 ? "+" : "−"}{Math.abs(d / b.v * 100).toFixed(1)}%)</span></span>;
  };

  const onDrop = (e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); };
  const onPaste = (e) => { const f = [...(e.clipboardData?.files || [])][0]; if (f) { e.preventDefault(); setFile(f); } };
  const input = { border: `1px solid ${C.line}`, borderRadius: 8, padding: "8px 10px", fontSize: 14, fontFamily: "inherit", color: C.ink, width: "100%", boxSizing: "border-box", background: "#fff" };

  return (
    <div className="bt-pad" style={{ padding: "20px 28px 40px", maxWidth: 900, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, fontSize: 13, color: C.muted }}>Track tape-measure, DEXA or coach measurements over time. Every entry is saved with the date it was taken and when you logged it.</div>
        <div style={{ display: "flex", border: `1px solid ${C.line}`, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}>
          {["in", "cm"].map(u => <button key={u} onClick={() => setUnit(u)} style={{ border: 0, padding: "6px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer", background: unit === u ? C.accent : "#fff", color: unit === u ? "#fff" : C.ink, fontFamily: "inherit" }}>{u}</button>)}
        </div>
      </div>

      <div style={card}>
        <div style={h2}>Add measurements</div>
        <div style={{ fontSize: 12.5, color: C.muted, margin: "2px 0 12px" }}>Paste them from an email or note, or add a photo, screenshot or PDF. The AI fills in the boxes below and you check them before saving. You can also just type them in.</div>
        <div onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
          style={{ border: `1.5px dashed ${drag ? C.accent : C.line}`, background: drag ? C.soft : C.bg, borderRadius: 10, padding: 10 }}>
          <textarea value={text} onChange={e => setText(e.target.value)} onPaste={onPaste} rows={4}
            placeholder={"e.g. Neck 40.6 cm, Chest 108 cm, Waist 84.5 cm, Biceps L 37 / R 37.5…\nor drop a photo or PDF here"}
            style={{ ...input, border: 0, background: "transparent", resize: "vertical", padding: 4 }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <button className="bt-btn" onClick={() => fileRef.current?.click()}>📎 Photo or PDF</button>
            <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => { setFile(e.target.files?.[0] || null); e.target.value = ""; }} />
            {file && <span style={{ fontSize: 12.5, color: C.body, background: "#fff", border: `1px solid ${C.line}`, borderRadius: 999, padding: "3px 10px" }}>{file.name} <button onClick={() => setFile(null)} style={{ border: 0, background: "none", cursor: "pointer", color: C.muted }}>✕</button></span>}
            <span style={{ flex: 1 }} />
            <button className="bt-btn" disabled={busy || (!text.trim() && !file)} onClick={read}
              style={{ background: C.accent, borderColor: C.accent, color: "#fff", opacity: busy || (!text.trim() && !file) ? .5 : 1 }}>{busy === "read" ? "Reading…" : "✨ Read it"}</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginTop: 16 }}>
          <label><span style={{ fontSize: 12, color: C.muted }}>Date taken</span><input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} style={input} /></label>
          <label><span style={{ fontSize: 12, color: C.muted }}>Measured by (optional)</span><input value={source} onChange={e => setSource(e.target.value)} placeholder="Tape measure, DexaFit…" style={input} /></label>
        </div>
        {(() => {
          const box = (k, l) => (
            <label key={k} title={notes[k] || ""} style={{ display: "block" }}>
              {l && <span style={{ fontSize: 12, color: C.muted }}>{l}</span>}
              <div style={{ position: "relative" }}>
                <input inputMode="decimal" aria-label={SITES.find(s => s[0] === k)[1]} value={vals[k] ?? ""} onChange={e => setVals(v => ({ ...v, [k]: e.target.value }))} style={{ ...input, paddingRight: 34, borderColor: vals[k] ? C.accent + "88" : C.line }} />
                <span style={{ position: "absolute", right: 10, top: 9, fontSize: 12, color: C.muted }}>{unit}</span>
              </div>
              {notes[k] && <span style={{ fontSize: 11, color: C.muted }}>{notes[k]}</span>}
            </label>);
          const PAIRS = [["Bicep", "leftBicepIn", "rightBicepIn"], ["Forearm", "leftForearmIn", "rightForearmIn"], ["Thigh", "leftThighIn", "rightThighIn"], ["Calf", "leftCalfIn", "rightCalfIn"]];
          return <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10, marginTop: 12 }}>
              {[["neckIn", "Neck"], ["shouldersIn", "Shoulders"], ["chestIn", "Chest"], ["waistIn", "Waist"], ["hipsIn", "Hips"]].map(([k, l]) => box(k, l))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr", gap: "8px 10px", alignItems: "start", marginTop: 14, maxWidth: 520 }}>
              <span /><span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Left</span><span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>Right</span>
              {PAIRS.map(([l, a, b]) => <React.Fragment key={l}><span style={{ fontSize: 13, color: C.ink, fontWeight: 600, paddingTop: 9 }}>{l}</span>{box(a)}{box(b)}</React.Fragment>)}
            </div>
          </>;
        })()}
        {extra.length > 0 && <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Also in your note (not tracked yet): {extra.join(", ")}</div>}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button className="bt-btn" disabled={!filled || busy} onClick={save} style={{ background: C.accent, borderColor: C.accent, color: "#fff", opacity: !filled || busy ? .5 : 1 }}>{busy === "save" ? "Saving…" : `Save ${filled || ""} measurement${filled === 1 ? "" : "s"}`}</button>
          {filled > 0 && <button className="bt-btn" onClick={() => { setVals({}); setNotes({}); setExtra([]); }}>Clear</button>}
          {msg && <span style={{ fontSize: 13, color: msg.startsWith("⚠") ? C.red : C.green }}>{msg}</span>}
        </div>
      </div>

      {progress.length > 0 && <div style={card}>
        <div style={h2}>Progress</div>
        <div style={{ overflowX: "auto", marginTop: 8 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, color: C.ink }}>
            <thead><tr style={{ color: C.muted, fontSize: 12, textAlign: "left" }}>
              <th style={{ padding: "6px 8px 6px 0", fontWeight: 600 }}>Site</th><th style={{ padding: 6, fontWeight: 600 }}>Latest</th>
              <th style={{ padding: 6, fontWeight: 600 }}>vs previous</th><th style={{ padding: 6, fontWeight: 600 }}>vs first</th></tr></thead>
            <tbody>{progress.map(p => (
              <tr key={p.k} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "8px 8px 8px 0", fontWeight: 600 }}>{SITES.find(s => s[0] === p.k)[1]}</td>
                <td style={{ padding: 6 }}>{fmt(p.latest.v)} <span style={{ color: C.muted, fontSize: 12 }}>{fmtDay(p.latest.d)}</span></td>
                <td style={{ padding: 6 }}><Delta k={p.k} a={p.latest} b={p.prev} /></td>
                <td style={{ padding: 6 }}><Delta k={p.k} a={p.latest} b={p.first} />{p.first && <span style={{ color: C.muted, fontSize: 12 }}> since {fmtDay(p.first.d)}</span>}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </div>}

      <div style={card}>
        <div style={h2}>History</div>
        {entries == null ? <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Loading…</div>
          : !entries.length ? <div style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>No measurements yet. Add your first set above.</div>
          : entries.map(e => (
            <div key={e.id} style={{ borderTop: `1px solid ${C.line}`, padding: "10px 0", marginTop: 6 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: C.ink }}>{fmtDay(e.date)}</span>
                {e.source && <span style={{ fontSize: 12, color: C.accent, background: C.soft, borderRadius: 999, padding: "1px 8px" }}>{e.source}</span>}
                <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>logged {fmtStamp(e.loggedAt)}</span>
                {e.deletable && <button onClick={() => del(e.id)} style={{ border: 0, background: "none", color: C.muted, cursor: "pointer", fontSize: 12.5 }}>Delete</button>}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 6, fontSize: 13, color: C.body }}>
                {SITES.filter(([k]) => e.values[k] != null).map(([k, l]) => <span key={k}>{l} <b style={{ color: C.ink }}>{fmt(e.values[k])}</b></span>)}
              </div>
              {e.note && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 4 }}>{e.note}</div>}
            </div>))}
      </div>
    </div>);
}
