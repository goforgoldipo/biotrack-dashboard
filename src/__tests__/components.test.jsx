/**
 * BIOTRACK DASHBOARD — Frontend Test Suite
 * Run: npm test  (from biotrack-dashboard/)
 * Framework: Vitest + React Testing Library + jsdom
 *
 * Tests: pure logic helpers, React components, color-coding,
 *        form validation, user interactions, accessibility
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import React, { useState } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ─── PURE LOGIC (mirrors App.jsx) ────────────────────────────────────────────

const C = {
  text1:"#f0f0f0", text2:"#c8c8c8", text3:"#a0a0a0", dim:"#707070",
};

const fmtV = (k, v) => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") return v;
  if (["steps","calsBurned","workoutVol"].includes(k)) return Number(v).toLocaleString();
  return v;
};

const cellCol = (k, v) => {
  if (typeof v !== "number") return C.text1;
  if (k === "bodyFat") return v > 19 ? "#ff6b35" : v > 16 ? "#fbbf24" : "#4ade80";
  if (["trunkFat","rightArmFat","leftArmFat","rightLegFat","leftLegFat"].includes(k))
    return v > 22 ? "#ff6b35" : v > 17 ? "#fbbf24" : v > 12 ? "#4ade80" : "#00e5ff";
  if (k === "protein")    return v < 170 ? "#ff8c69" : C.text1;
  if (k === "calories")   return v > 2350 ? "#fbbf24" : v < 1700 ? "#ff8c69" : C.text1;
  if (k === "steps")      return v < 6000 ? "#ff8c69" : v > 10000 ? "#4ade80" : C.text1;
  if (["sleepScore","readiness"].includes(k)) return v < 72 ? "#fbbf24" : v > 85 ? "#4ade80" : C.text1;
  if (k === "hrv")        return v < 40 ? "#fbbf24" : v > 52 ? "#4ade80" : C.text1;
  return C.text1;
};

const humeStatus = (pct, region) => {
  if (pct === null || pct === undefined) return { label: "—", color: "#707070" };
  const isLeg = String(region).includes("Leg");
  if (pct < (isLeg ? 8 : 12))  return { label: "Very Low",  color: "#00e5ff" };
  if (pct < 14)                 return { label: "Low",       color: "#4ade80" };
  if (pct < (isLeg ? 18 : 22)) return { label: "Standard",  color: "#fbbf24" };
  if (pct < 25)                 return { label: "High",      color: "#ff8c69" };
  return                               { label: "Very High", color: "#ff6b35" };
};

const mapImport = (p) => {
  const m = {
    syncDate:    p.syncDate    || new Date().toLocaleDateString("en-US", { month:"short", day:"numeric" }),
    syncTime:    p.syncTime    || "12:00 PM",
    steps:       p.steps       || p.stepCount,
    calsBurned:  p.activeCalories || p.calsBurned,
    restingHR:   p.restingHR   || p.restingHeartRate,
    avgHR:       p.avgHR       || p.averageHeartRate,
    vo2max:      p.vo2max      || p.vo2Max,
    weight:      p.weight      || p.bodyWeight,
    bodyFat:     p.bodyFat     || p.bodyFatPercentage,
    leanMass:    p.leanMass    || p.leanBodyMass,
    calories:    p.calories    || p.dietaryCalories,
    protein:     p.protein,
    carbs:       p.carbs       || p.carbohydrates,
    fat:         p.fat,
    hrv:         p.hrv,
    sleepScore:  p.sleepScore,
    workoutType: p.workoutType,
    workoutDur:  p.workoutDur  || p.workoutDuration,
    trunkFat:    p.trunkFat    || p.trunk_fat,
    rightArmFat: p.rightArmFat || p.right_arm_fat,
    leftArmFat:  p.leftArmFat  || p.left_arm_fat,
    rightLegFat: p.rightLegFat || p.right_leg_fat,
    leftLegFat:  p.leftLegFat  || p.left_leg_fat,
  };
  Object.keys(m).forEach(k => { if (m[k] === null || m[k] === undefined) delete m[k]; });
  return m;
};

const pctChange = (current, prev) => {
  if (typeof current !== "number" || typeof prev !== "number" || prev === 0) return null;
  return ((current - prev) / Math.abs(prev)) * 100;
};

// ─── TEST COMPONENTS ─────────────────────────────────────────────────────────

function MetricCell({ metricKey, value }) {
  return <span data-testid="metric-cell" style={{ color: cellCol(metricKey, value) }}>{fmtV(metricKey, value)}</span>;
}

function HumeStatusBadge({ value, region }) {
  const st = humeStatus(value, region);
  return <span data-testid="hume-badge" style={{ color: st.color }}>{st.label}</span>;
}

function PctChange({ current, previous, fatMetric = false }) {
  const pct = pctChange(current, previous);
  if (pct === null) return null;
  const good = fatMetric ? pct < 0 : pct > 0;
  return (
    <span data-testid="pct-change" style={{ color: good ? "#4ade80" : "#ff6b35" }}>
      {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

function SegmentCard({ label, fatValue, muscleValue, region, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [fat, setFat]         = useState(fatValue ?? "");
  const [mus, setMus]         = useState(muscleValue ?? "");
  const st = humeStatus(fatValue, region);
  return (
    <div data-testid={`seg-${label}`}>
      <div data-testid="seg-label">{label}</div>
      {!editing ? (
        <>
          <div data-testid="seg-fat">{fatValue != null ? `${fatValue}%` : "—"}</div>
          <div data-testid="seg-status" style={{ color: st.color }}>{st.label}</div>
          {muscleValue && <div data-testid="seg-muscle">{muscleValue} lbs</div>}
          <button data-testid="edit-btn" onClick={() => setEditing(true)}>Edit</button>
        </>
      ) : (
        <>
          <input data-testid="fat-input" type="number" value={fat} onChange={e => setFat(e.target.value)} />
          <input data-testid="mus-input" type="number" value={mus} onChange={e => setMus(e.target.value)} />
          <button data-testid="save-btn" onClick={() => { onEdit({ fat: parseFloat(fat), muscle: parseFloat(mus) }); setEditing(false); }}>Save</button>
          <button data-testid="cancel-btn" onClick={() => setEditing(false)}>Cancel</button>
        </>
      )}
    </div>
  );
}

function ApiForm({ onSave }) {
  const [url, setUrl]     = useState("");
  const [key, setKey]     = useState("");
  const [err, setErr]     = useState("");
  const submit = () => {
    if (!url.trim())               { setErr("URL required"); return; }
    if (!url.startsWith("http"))   { setErr("URL must start with http"); return; }
    if (!key.trim())               { setErr("Secret key required"); return; }
    setErr(""); onSave(url.trim(), key.trim());
  };
  return (
    <div data-testid="api-form">
      <input data-testid="url-input"    value={url} onChange={e => setUrl(e.target.value)} placeholder="Railway URL" />
      <input data-testid="key-input"    value={key} onChange={e => setKey(e.target.value)} placeholder="Secret" type="password" />
      {err && <div data-testid="form-error">{err}</div>}
      <button data-testid="submit-btn" onClick={submit}>Connect</button>
    </div>
  );
}

function SyncBadge({ status }) {
  const map = { live:["LIVE","#00ff9d"], error:["ERROR","#ff6b35"], polling:["SYNCING","#fbbf24"], idle:["IDLE","#707070"] };
  const [label, color] = map[status] || ["UNKNOWN","#707070"];
  return <span data-testid="sync-badge" style={{ color }}>{label}</span>;
}

function ProgressBar({ label, value, max, target }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div data-testid={`bar-${label}`}>
      <span data-testid="bar-label">{label}</span>
      <span data-testid="bar-value">{typeof value === "number" ? value.toLocaleString() : value}</span>
      <div data-testid="bar-fill" style={{ width: `${pct}%` }} />
      <span data-testid="bar-target">TARGET: {target.toLocaleString()}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe("fmtV — value formatter", () => {
  test("null → —",            () => expect(fmtV("weight", null)).toBe("—"));
  test("undefined → —",       () => expect(fmtV("steps", undefined)).toBe("—"));
  test("string passes through",() => expect(fmtV("workoutType","Push")).toBe("Push"));
  test("steps gets commas",   () => expect(fmtV("steps", 10241)).toBe("10,241"));
  test("calsBurned gets commas",()=> expect(fmtV("calsBurned", 2500)).toBe("2,500"));
  test("workoutVol gets commas",()=> expect(fmtV("workoutVol", 12000)).toBe("12,000"));
  test("bodyFat returns as-is",() => expect(fmtV("bodyFat", 17.9)).toBe(17.9));
  test("zero steps → '0'",    () => expect(fmtV("steps", 0)).toBe("0"));
});

describe("cellCol — color coding", () => {
  test("bodyFat > 19 → red",       () => expect(cellCol("bodyFat", 20)).toBe("#ff6b35"));
  test("bodyFat 16–19 → yellow",   () => expect(cellCol("bodyFat", 17)).toBe("#fbbf24"));
  test("bodyFat < 16 → green",     () => expect(cellCol("bodyFat", 14)).toBe("#4ade80"));
  test("steps > 10000 → green",    () => expect(cellCol("steps", 11000)).toBe("#4ade80"));
  test("steps < 6000 → salmon",    () => expect(cellCol("steps", 4000)).toBe("#ff8c69"));
  test("protein < 170 → salmon",   () => expect(cellCol("protein", 150)).toBe("#ff8c69"));
  test("hrv > 52 → green",         () => expect(cellCol("hrv", 55)).toBe("#4ade80"));
  test("hrv < 40 → yellow",        () => expect(cellCol("hrv", 35)).toBe("#fbbf24"));
  test("sleepScore > 85 → green",  () => expect(cellCol("sleepScore", 90)).toBe("#4ade80"));
  test("string value → white",     () => expect(cellCol("workoutType","Push")).toBe(C.text1));
  test("trunkFat > 22 → red",      () => expect(cellCol("trunkFat", 24)).toBe("#ff6b35"));
  test("trunkFat 12–17 → green",   () => expect(cellCol("trunkFat", 14)).toBe("#4ade80"));
});

describe("humeStatus — segmental rating", () => {
  test("trunk 15.6% → Standard",    () => expect(humeStatus(15.6, "Trunk").label).toBe("Standard"));
  test("arm 15.1% → Standard",      () => expect(humeStatus(15.1, "Arm").label).toBe("Standard"));
  test("right leg 10.8% → Low",     () => expect(humeStatus(10.8, "Right Leg").label).toBe("Low"));
  test("left leg 10.2% → Low",      () => expect(humeStatus(10.2, "Left Leg").label).toBe("Low"));
  test("arm 5% → Very Low",         () => expect(humeStatus(5, "Arm").label).toBe("Very Low"));
  test("arm 30% → Very High",       () => expect(humeStatus(30, "Arm").label).toBe("Very High"));
  test("arm 30% is red",            () => expect(humeStatus(30, "Arm").color).toBe("#ff6b35"));
  test("Very Low is cyan",          () => expect(humeStatus(3, "Leg").color).toBe("#00e5ff"));
  test("null → —",                  () => expect(humeStatus(null, "Trunk").label).toBe("—"));
  test("undefined → —",             () => expect(humeStatus(undefined, "Arm").label).toBe("—"));
});

describe("mapImport — field normalization", () => {
  test("direct fields pass through",        () => expect(mapImport({ steps:9000 }).steps).toBe(9000));
  test("activeCalories → calsBurned",       () => expect(mapImport({ activeCalories:720 }).calsBurned).toBe(720));
  test("stepCount → steps",                 () => expect(mapImport({ stepCount:8500 }).steps).toBe(8500));
  test("restingHeartRate → restingHR",      () => expect(mapImport({ restingHeartRate:52 }).restingHR).toBe(52));
  test("vo2Max → vo2max",                   () => expect(mapImport({ vo2Max:43.2 }).vo2max).toBe(43.2));
  test("bodyWeight → weight",               () => expect(mapImport({ bodyWeight:198 }).weight).toBe(198));
  test("bodyFatPercentage → bodyFat",       () => expect(mapImport({ bodyFatPercentage:17.9 }).bodyFat).toBe(17.9));
  test("carbohydrates → carbs",             () => expect(mapImport({ carbohydrates:175 }).carbs).toBe(175));
  test("trunk_fat → trunkFat",              () => expect(mapImport({ trunk_fat:15.6 }).trunkFat).toBe(15.6));
  test("right_arm_fat → rightArmFat",      () => expect(mapImport({ right_arm_fat:15.1 }).rightArmFat).toBe(15.1));
  test("left_leg_fat → leftLegFat",        () => expect(mapImport({ left_leg_fat:10.2 }).leftLegFat).toBe(10.2));
  test("null/undefined keys stripped",     () => { const m=mapImport({steps:9000, bodyFat:undefined}); expect(m).toHaveProperty("steps"); expect(m).not.toHaveProperty("bodyFat"); });
  test("empty object gets defaults",        () => { const m=mapImport({}); expect(m.syncDate).toBeTruthy(); expect(m.syncTime).toBeTruthy(); });
  test("prefers primary over alias",        () => expect(mapImport({ steps:9000, stepCount:5000 }).steps).toBe(9000));
});

describe("pctChange — percentage math", () => {
  test("+10% up",                   () => expect(pctChange(110, 100)).toBeCloseTo(10));
  test("-10% down",                  () => expect(pctChange(90, 100)).toBeCloseTo(-10));
  test("div by zero → null",        () => expect(pctChange(50, 0)).toBeNull());
  test("string current → null",     () => expect(pctChange("Push", 100)).toBeNull());
  test("undefined prev → null",     () => expect(pctChange(100, undefined)).toBeNull());
  test("BF 18.4→17.9 = -2.72%",    () => expect(pctChange(17.9, 18.4)).toBeCloseTo(-2.72, 1));
  test("200% gain",                  () => expect(pctChange(200, 100)).toBeCloseTo(100));
});

// ─── COMPONENT TESTS ─────────────────────────────────────────────────────────

describe("MetricCell component", () => {
  test("renders — for null",         () => { render(<MetricCell metricKey="bodyFat" value={null} />); expect(screen.getByTestId("metric-cell")).toHaveTextContent("—"); });
  test("bodyFat 20 is red",          () => { render(<MetricCell metricKey="bodyFat" value={20} />); expect(screen.getByTestId("metric-cell")).toHaveStyle({ color:"#ff6b35" }); });
  test("bodyFat 17 is yellow",       () => { render(<MetricCell metricKey="bodyFat" value={17} />); expect(screen.getByTestId("metric-cell")).toHaveStyle({ color:"#fbbf24" }); });
  test("steps 11000 is green",       () => { render(<MetricCell metricKey="steps" value={11000} />); expect(screen.getByTestId("metric-cell")).toHaveStyle({ color:"#4ade80" }); });
  test("steps 9241 formatted",       () => { render(<MetricCell metricKey="steps" value={9241} />); expect(screen.getByTestId("metric-cell")).toHaveTextContent("9,241"); });
  test("workout type as string",     () => { render(<MetricCell metricKey="workoutType" value="Push" />); expect(screen.getByTestId("metric-cell")).toHaveTextContent("Push"); });
});

describe("HumeStatusBadge component", () => {
  test("15.6% trunk → Standard",     () => { render(<HumeStatusBadge value={15.6} region="Trunk" />); expect(screen.getByTestId("hume-badge")).toHaveTextContent("Standard"); });
  test("10.8% leg → Low",            () => { render(<HumeStatusBadge value={10.8} region="Right Leg" />); expect(screen.getByTestId("hume-badge")).toHaveTextContent("Low"); });
  test("30% arm → Very High + red",  () => { render(<HumeStatusBadge value={30} region="Arm" />); const el=screen.getByTestId("hume-badge"); expect(el).toHaveTextContent("Very High"); expect(el).toHaveStyle({ color:"#ff6b35" }); });
  test("null → —",                   () => { render(<HumeStatusBadge value={null} region="Trunk" />); expect(screen.getByTestId("hume-badge")).toHaveTextContent("—"); });
});

describe("PctChange component", () => {
  test("+10% non-fat → green",       () => { render(<PctChange current={110} previous={100} />); const el=screen.getByTestId("pct-change"); expect(el).toHaveTextContent("+10.0%"); expect(el).toHaveStyle({ color:"#4ade80" }); });
  test("-10% non-fat → red",         () => { render(<PctChange current={90} previous={100} />); expect(screen.getByTestId("pct-change")).toHaveStyle({ color:"#ff6b35" }); });
  test("-2.7% fat → green (good)",   () => { render(<PctChange current={17.9} previous={18.4} fatMetric />); expect(screen.getByTestId("pct-change")).toHaveStyle({ color:"#4ade80" }); });
  test("+1% fat → red (bad)",        () => { render(<PctChange current={18.5} previous={18.4} fatMetric />); expect(screen.getByTestId("pct-change")).toHaveStyle({ color:"#ff6b35" }); });
  test("div by zero → nothing",      () => { const {container}=render(<PctChange current={50} previous={0} />); expect(container.firstChild).toBeNull(); });
});

describe("SegmentCard — Hume edit flow", () => {
  const onEdit = vi.fn();
  beforeEach(() => onEdit.mockClear());

  test("renders label + fat + status",async () => {
    render(<SegmentCard label="Trunk" fatValue={15.6} muscleValue={72} region="Trunk" onEdit={onEdit} />);
    expect(screen.getByTestId("seg-label")).toHaveTextContent("Trunk");
    expect(screen.getByTestId("seg-fat")).toHaveTextContent("15.6%");
    expect(screen.getByTestId("seg-status")).toHaveTextContent("Standard");
    expect(screen.getByTestId("seg-muscle")).toHaveTextContent("72 lbs");
  });
  test("null fat shows —", () => {
    render(<SegmentCard label="Leg" fatValue={null} region="Leg" onEdit={onEdit} />);
    expect(screen.getByTestId("seg-fat")).toHaveTextContent("—");
  });
  test("Edit click shows inputs", async () => {
    const user = userEvent.setup();
    render(<SegmentCard label="Trunk" fatValue={15.6} muscleValue={72} region="Trunk" onEdit={onEdit} />);
    await user.click(screen.getByTestId("edit-btn"));
    expect(screen.getByTestId("fat-input")).toBeInTheDocument();
    expect(screen.getByTestId("mus-input")).toBeInTheDocument();
  });
  test("Save calls onEdit with parsed floats", async () => {
    const user = userEvent.setup();
    render(<SegmentCard label="Trunk" fatValue={15.6} muscleValue={72} region="Trunk" onEdit={onEdit} />);
    await user.click(screen.getByTestId("edit-btn"));
    await user.clear(screen.getByTestId("fat-input"));
    await user.type(screen.getByTestId("fat-input"), "14.8");
    await user.click(screen.getByTestId("save-btn"));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ fat: 14.8 }));
  });
  test("Save exits edit mode", async () => {
    const user = userEvent.setup();
    render(<SegmentCard label="Trunk" fatValue={15.6} muscleValue={72} region="Trunk" onEdit={onEdit} />);
    await user.click(screen.getByTestId("edit-btn"));
    await user.click(screen.getByTestId("save-btn"));
    expect(screen.queryByTestId("fat-input")).not.toBeInTheDocument();
  });
  test("Cancel exits without calling onEdit", async () => {
    const user = userEvent.setup();
    render(<SegmentCard label="Trunk" fatValue={15.6} muscleValue={72} region="Trunk" onEdit={onEdit} />);
    await user.click(screen.getByTestId("edit-btn"));
    await user.click(screen.getByTestId("cancel-btn"));
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.queryByTestId("fat-input")).not.toBeInTheDocument();
  });
});

describe("ApiForm — connect form validation", () => {
  const onSave = vi.fn();
  beforeEach(() => onSave.mockClear());

  test("renders URL + password inputs", () => {
    render(<ApiForm onSave={onSave} />);
    expect(screen.getByTestId("url-input")).toBeInTheDocument();
    expect(screen.getByTestId("key-input")).toHaveAttribute("type","password");
  });
  test("empty URL → error", async () => {
    const user = userEvent.setup();
    render(<ApiForm onSave={onSave} />);
    await user.click(screen.getByTestId("submit-btn"));
    expect(screen.getByTestId("form-error")).toHaveTextContent("URL required");
  });
  test("non-http URL → error", async () => {
    const user = userEvent.setup();
    render(<ApiForm onSave={onSave} />);
    await user.type(screen.getByTestId("url-input"), "railway.app/sync");
    await user.type(screen.getByTestId("key-input"), "secret");
    await user.click(screen.getByTestId("submit-btn"));
    expect(screen.getByTestId("form-error")).toHaveTextContent("http");
  });
  test("missing secret → error", async () => {
    const user = userEvent.setup();
    render(<ApiForm onSave={onSave} />);
    await user.type(screen.getByTestId("url-input"), "https://test.railway.app");
    await user.click(screen.getByTestId("submit-btn"));
    expect(screen.getByTestId("form-error")).toHaveTextContent("Secret");
  });
  test("valid inputs → onSave called", async () => {
    const user = userEvent.setup();
    render(<ApiForm onSave={onSave} />);
    await user.type(screen.getByTestId("url-input"), "https://biotrack.railway.app");
    await user.type(screen.getByTestId("key-input"), "abc123");
    await user.click(screen.getByTestId("submit-btn"));
    expect(onSave).toHaveBeenCalledWith("https://biotrack.railway.app","abc123");
  });
  test("invalid → onSave not called", async () => {
    const user = userEvent.setup();
    render(<ApiForm onSave={onSave} />);
    await user.click(screen.getByTestId("submit-btn"));
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe("SyncBadge", () => {
  test("live → LIVE + green",    () => { render(<SyncBadge status="live" />); const el=screen.getByTestId("sync-badge"); expect(el).toHaveTextContent("LIVE"); expect(el).toHaveStyle({ color:"#00ff9d" }); });
  test("error → ERROR + red",    () => { render(<SyncBadge status="error" />); expect(screen.getByTestId("sync-badge")).toHaveStyle({ color:"#ff6b35" }); });
  test("polling → SYNCING + yellow",()=>{ render(<SyncBadge status="polling" />); expect(screen.getByTestId("sync-badge")).toHaveStyle({ color:"#fbbf24" }); });
  test("idle → IDLE + dim",      () => { render(<SyncBadge status="idle" />); expect(screen.getByTestId("sync-badge")).toHaveTextContent("IDLE"); });
});

describe("ProgressBar", () => {
  test("renders label + value", () => {
    render(<ProgressBar label="STEPS" value={9241} max={15000} target={10000} />);
    expect(screen.getByTestId("bar-label")).toHaveTextContent("STEPS");
    expect(screen.getByTestId("bar-value")).toHaveTextContent("9,241");
  });
  test("shows target with comma", () => {
    render(<ProgressBar label="STEPS" value={9241} max={15000} target={10000} />);
    expect(screen.getByTestId("bar-target")).toHaveTextContent("TARGET: 10,000");
  });
  test("fill width capped at 100%", () => {
    render(<ProgressBar label="BF" value={50} max={30} target={12} />);
    const fill = screen.getByTestId("bar-fill");
    expect(parseFloat(fill.style.width)).toBeLessThanOrEqual(100);
  });
});

describe("Accessibility", () => {
  test("SegmentCard edit btn is a BUTTON element", () => {
    render(<SegmentCard label="Arm" fatValue={15.1} region="Arm" onEdit={vi.fn()} />);
    expect(screen.getByTestId("edit-btn").tagName).toBe("BUTTON");
  });
  test("ApiForm inputs are keyboard-tabbable", async () => {
    const user = userEvent.setup();
    render(<ApiForm onSave={vi.fn()} />);
    await user.tab();
    expect(screen.getByTestId("url-input")).toHaveFocus();
    await user.tab();
    expect(screen.getByTestId("key-input")).toHaveFocus();
  });
  test("ProgressBar renders with zero value without crash", () => {
    expect(() => render(<ProgressBar label="X" value={0} max={100} target={50} />)).not.toThrow();
  });
});
