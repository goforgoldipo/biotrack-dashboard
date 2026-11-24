import React, { useMemo, useState } from "react";
import { BENCH_REF } from "./shared/benchRef.js";
import { CROWD_MIN, BENCH_METRICS, ageBand, bandLabel, percentileOf, fmtBench as fmt, userValues } from "./shared/bench.js";

// ─── BENCHMARKS: where you stand against people your age and sex ───
// Until BodyData has enough members per cohort, the cohort is a published population
// reference (BENCH_REF). Crowd stats replace it per metric once a cohort has CROWD_MIN members.
const C = { text1: "#2B2E4A", text2: "#4A4F6E", text3: "#7A80A6", bord: "#E7E8F1", teal: "#5468FF", green: "#1F9D6B", red: "#D64545", bar: "#5468FF", barSoft: "#E4E7FF" };

function Standing({ m, you, ps, cohort }) {
  const pct = percentileOf(you.value, ps);
  const rank = pct == null ? null : m.dir === "down" ? 100 - pct : pct;          // % of the cohort you're doing better than
  const verdict = m.dir === "neutral"
    ? { tone: "neu", text: `You're at the ${Math.round(pct)}th percentile for ${cohort}.` }
    : rank >= 60 ? { tone: "good", text: `You're outranking ${Math.round(rank)}% of ${cohort}. Good job!` }
    : rank >= 40 ? { tone: "neu", text: `You're right on target with ${cohort}.` }
    : { tone: "bad", text: `Your ${/^[A-Z0-9]{2,}/.test(m.label) ? m.label : m.label.toLowerCase()} is on the ${m.dir === "down" ? "higher" : "lower"} end for ${cohort}.` };
  const rows = [["Lower", ps[1]], ["Median", ps[2]], ["Upper", ps[3]]].filter(r => r[1] != null).map(([l, v]) => ({ l, v }));
  rows.push({ l: "You", v: you.value, you: true });
  const asc = m.dir !== "down";                                                // best performers at the bottom, like the cohort chart
  rows.sort((a, b) => asc ? a.v - b.v : b.v - a.v);
  const max = Math.max(...rows.map(r => r.v)) || 1;
  const icon = { good: ["👍", "rgba(31,138,91,.1)"], neu: ["≈", "#EEF0FF"], bad: ["👎", "rgba(180,35,44,.08)"] }[verdict.tone];
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.bord}`, borderRadius: 12, marginBottom: 14 }}>
      <div style={{ padding: "12px 18px", borderBottom: "1px solid #EEF0F6", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 700, color: C.text1, fontSize: 14.5, flex: 1 }}>{m.label}</div>
        <span style={{ fontSize: 11.5, color: C.text3 }}>{you.note}</span>
      </div>
      <div className="bt-bench" style={{ display: "grid", gridTemplateColumns: "minmax(0,220px) minmax(0,1fr)", gap: 18, padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5, color: C.text2, lineHeight: 1.5 }}>
          <span style={{ flex: "0 0 26px", height: 22, borderRadius: 6, background: icon[1], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>{icon[0]}</span>
          <span>{verdict.text}</span>
        </div>
        <div>
          {rows.map(r => (
            <div key={r.l} style={{ display: "grid", gridTemplateColumns: "54px 1fr", alignItems: "center", gap: 10, margin: "5px 0" }}>
              <span style={{ fontSize: 11.5, color: r.you ? C.text1 : C.text3, fontWeight: r.you ? 700 : 400 }}>{r.l}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <div style={{ height: r.you ? 16 : 14, width: `${Math.max(4, r.v / max * 78)}%`, background: r.you ? C.bar : C.barSoft, borderRadius: 3 }}/>
                <span style={{ fontSize: r.you ? 14 : 11.5, fontWeight: r.you ? 700 : 400, color: r.you ? C.bar : C.text3, whiteSpace: "nowrap" }}>{fmt(r.v, m.unit)}</span>
              </div>
            </div>))}
        </div>
      </div>
    </div>);
}

export default function Benchmarks({ days, sections, profile, optIn, onProfile, crowd }) {
  const [draft, setDraft] = useState(profile || {});
  // "public" = published population data; "members" = anonymized BodyData members who opted in (needs CROWD_MIN per cohort)
  const [cohortSrc, setCohortSrc] = useState("public");
  const membersReady = !!crowd?.ready;
  const age = profile?.birthYear ? new Date().getFullYear() - profile.birthYear : null;
  const you = useMemo(() => userValues(days, sections), [days, sections]);
  const ready = profile?.sex && age;
  const list = !ready ? [] : BENCH_METRICS.filter(m => (!m.sex || m.sex === profile.sex) && you[m.key] && BENCH_REF[m.key]).map(m => {
    const ref = BENCH_REF[m.key], band = ageBand(age, Object.keys(ref[profile.sex] || {}));
    const ps = band && ref[profile.sex][band];
    return ps && ps.filter(x => x != null).length >= 2 ? { m, ps, band, ref } : null;
  }).filter(Boolean);
  const sexWord = profile?.sex === "female" ? "women" : "men";
  const scored = list.map(x => { const p = percentileOf(you[x.m.key].value, x.ps); return x.m.dir === "down" ? 100 - p : p; });
  const top = scored.filter(r => r >= 75).length;
  const missing = ready ? BENCH_METRICS.filter(m => (!m.sex || m.sex === profile.sex) && BENCH_REF[m.key] && !you[m.key]) : [];
  const card = { background: "#fff", border: `1px solid ${C.bord}`, borderRadius: 12 };

  return (
    <div className="bt-pad" style={{ padding: "18px 28px 28px", fontFamily: "'Inter',system-ui,sans-serif", maxWidth: 1180 }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontFamily: "'Inter',system-ui,sans-serif", fontSize: 18, fontWeight: 700, color: C.text1 }}>Benchmarks</div>
          <div style={{ fontSize: 12.5, color: C.text3, marginTop: 2 }}>How your numbers stack up against people your age and sex.</div>
        </div>
        {ready && <div style={{ fontSize: 12.5, color: C.text2 }}>You're in the <b style={{ color: C.bar }}>{sexWord}, age {age}</b> cohort</div>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12.5, color: C.text3 }}>Compare with</span>
        <div style={{ display: "inline-flex", border: `1px solid ${C.bord}`, borderRadius: 9, padding: 3, background: "#fff" }}>
          {[["public", "Public health data"], ["members", "BodyData members"]].map(([k, l]) => (
            <button key={k} onClick={() => setCohortSrc(k)} style={{ border: 0, borderRadius: 7, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              background: cohortSrc === k ? C.bar : "transparent", color: cohortSrc === k ? "#fff" : C.text2 }}>{l}</button>))}
        </div>
      </div>

      <div style={{ ...card, padding: "12px 16px", marginTop: 14, display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: C.text3 }}>Sex<br/>
          <select className="bt-date" style={{ width: 120, marginTop: 4 }} value={draft.sex || ""} onChange={e => setDraft(d => ({ ...d, sex: e.target.value }))}>
            <option value="">Choose…</option><option value="male">Male</option><option value="female">Female</option></select></label>
        <label style={{ fontSize: 12, color: C.text3 }}>Birth year<br/>
          <input className="bt-date" style={{ width: 110, marginTop: 4 }} inputMode="numeric" value={draft.birthYear || ""} onChange={e => setDraft(d => ({ ...d, birthYear: e.target.value.replace(/\D/g, "").slice(0, 4) }))} placeholder="1988"/></label>
        <label style={{ fontSize: 12.5, color: C.text2, display: "flex", gap: 6, alignItems: "center", height: 34 }}>
          <input type="checkbox" checked={!!optIn} onChange={e => onProfile(profile || draft, e.target.checked)}/> Contribute my numbers anonymously to member benchmarks</label>
        <div style={{ flex: 1 }}/>
        {(draft.sex !== profile?.sex || String(draft.birthYear || "") !== String(profile?.birthYear || "")) &&
          <button className="bt-btn" onClick={() => onProfile({ sex: draft.sex, birthYear: +draft.birthYear }, optIn)} style={{ background: C.teal, borderColor: C.teal, color: "#fff" }}>Save</button>}
      </div>

      {cohortSrc === "members" && !membersReady ? (
        <div style={{ ...card, padding: 22, marginTop: 14, fontSize: 13.5, color: C.text2, lineHeight: 1.6 }}>
          <b style={{ color: C.text1 }}>Member benchmarks unlock as people join.</b> Each cohort needs at least {CROWD_MIN} members who chose to contribute before we show it, so no one can be identified. {optIn ? "You're contributing: thank you." : "Tick \u201cContribute my numbers anonymously\u201d above to help unlock it."} Until then, compare with public health data.
          <div><button className="bt-btn" style={{ marginTop: 12 }} onClick={() => setCohortSrc("public")}>Show public data</button></div>
        </div>
      ) : !ready ? <div style={{ ...card, padding: 22, marginTop: 14, fontSize: 13.5, color: C.text2 }}>Add your sex and birth year to see your cohort. They're only used to pick the comparison group.</div> : (
        <div className="bt-benchgrid" style={{ display: "grid", gridTemplateColumns: "minmax(0,260px) minmax(0,1fr)", gap: 18, marginTop: 14, alignItems: "start" }}>
          <div style={{ ...card, position: "sticky", top: 12 }}>
            <div style={{ padding: "12px 16px", fontWeight: 700, fontSize: 14, color: C.text1, borderBottom: "1px solid #EEF0F6" }}>Your standings</div>
            <div style={{ margin: "12px 16px", padding: "8px 12px", borderLeft: `3px solid ${C.green}`, background: "#F3FBF7", fontSize: 12.5, color: C.text2, lineHeight: 1.5 }}>
              {list.length ? `You're in the top quarter of your cohort on ${top} of ${list.length} metrics.` : "No benchmarkable metrics yet."}</div>
            {list.map((x, i) => (
              <a key={x.m.key} href={"#bench-" + x.m.key} style={{ display: "grid", gridTemplateColumns: "90px 1fr", gap: 10, alignItems: "center", padding: "8px 16px", borderTop: "1px solid #F1F2F8", textDecoration: "none" }}>
                <div style={{ position: "relative", height: 6, background: C.barSoft, borderRadius: 3 }}>
                  <div style={{ position: "absolute", left: `calc(${Math.min(97, Math.max(0, scored[i]))}% - 1.5px)`, top: -4, width: 3, height: 14, borderRadius: 2, background: C.bar }}/></div>
                <span style={{ fontSize: 12.5, color: C.text2, textAlign: "right" }}>{x.m.label}</span>
              </a>))}
            <div style={{ padding: "10px 16px 14px", fontSize: 11.5, color: C.text3, lineHeight: 1.5 }}>Marker further right = better than more of your cohort.</div>
          </div>
          <div>
            {list.map(x => <div key={x.m.key} id={"bench-" + x.m.key}><Standing m={x.m} you={you[x.m.key]} ps={x.ps} cohort={`${sexWord} ${bandLabel(x.band)}`}/></div>)}
            {missing.length > 0 && <div style={{ fontSize: 12.5, color: C.text3, margin: "4px 2px 14px" }}>Add data to unlock: {missing.map(m => m.label).join(", ")}. Labs come from a Bloodwork section; attach a lab PDF in Ask AI.</div>}
            <div style={{ ...card, padding: "14px 16px", fontSize: 12, color: C.text3, lineHeight: 1.6 }}>
              <b style={{ color: C.text2 }}>Where the cohort numbers come from.</b> Until enough BodyData members opt in ({CROWD_MIN}+ per cohort), each metric compares you with published population data: {[...new Set(list.map(x => x.ref.source))].join("; ")}. Lower / Median / Upper are the 25th, 50th and 75th percentiles. Population norms describe typical people, not optimal health. Not medical advice.
            </div>
          </div>
        </div>)}
    </div>);
}
