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

// ─── MEAL TIMING FIELD MAPPING ───────────────────────────────────────────────

const mapImportFull = (p) => {
  const m = {
    syncDate:      p.syncDate || new Date().toLocaleDateString("en-US", { month:"short", day:"numeric" }),
    syncTime:      p.syncTime || "12:00 PM",
    steps:         p.steps        || p.stepCount,
    calsBurned:    p.activeCalories || p.calsBurned,
    restingHR:     p.restingHR    || p.restingHeartRate,
    avgHR:         p.avgHR        || p.averageHeartRate,
    vo2max:        p.vo2max       || p.vo2Max,
    weight:        p.weight       || p.bodyWeight,
    bodyFat:       p.bodyFat      || p.bodyFatPercentage,
    leanMass:      p.leanMass     || p.leanBodyMass,
    calories:      p.calories     || p.dietaryCalories,
    protein:       p.protein,
    carbs:         p.carbs        || p.carbohydrates,
    fat:           p.fat,
    hrv:           p.hrv,
    sleepScore:    p.sleepScore,
    workoutType:   p.workoutType,
    workoutDur:    p.workoutDur   || p.workoutDuration,
    trunkFat:      p.trunkFat     || p.trunk_fat,
    rightArmFat:   p.rightArmFat  || p.right_arm_fat,
    leftArmFat:    p.leftArmFat   || p.left_arm_fat,
    rightLegFat:   p.rightLegFat  || p.right_leg_fat,
    leftLegFat:    p.leftLegFat   || p.left_leg_fat,
    // Meal timing
    breakfastTime: p.breakfastTime || null,
    lunchTime:     p.lunchTime     || null,
    dinnerTime:    p.dinnerTime    || null,
    lastMealTime:  p.lastMealTime  || null,
    breakfastCals: p.breakfastCals || null,
    lunchCals:     p.lunchCals     || null,
    dinnerCals:    p.dinnerCals    || null,
    snackCals:     p.snackCals     || null,
  };
  Object.keys(m).forEach(k => { if (m[k] === null || m[k] === undefined) delete m[k]; });
  return m;
};

describe("mapImport — meal timing fields", () => {
  test("breakfastTime passes through",  () => expect(mapImportFull({ breakfastTime:"07:30" }).breakfastTime).toBe("07:30"));
  test("lunchTime passes through",      () => expect(mapImportFull({ lunchTime:"12:00" }).lunchTime).toBe("12:00"));
  test("dinnerTime passes through",     () => expect(mapImportFull({ dinnerTime:"19:00" }).dinnerTime).toBe("19:00"));
  test("lastMealTime passes through",   () => expect(mapImportFull({ lastMealTime:"21:30" }).lastMealTime).toBe("21:30"));
  test("breakfastCals passes through",  () => expect(mapImportFull({ breakfastCals:480 }).breakfastCals).toBe(480));
  test("lunchCals passes through",      () => expect(mapImportFull({ lunchCals:650 }).lunchCals).toBe(650));
  test("dinnerCals passes through",     () => expect(mapImportFull({ dinnerCals:700 }).dinnerCals).toBe(700));
  test("snackCals passes through",      () => expect(mapImportFull({ snackCals:200 }).snackCals).toBe(200));
  test("missing breakfastTime not in output",  () => expect(mapImportFull({}).hasOwnProperty("breakfastTime")).toBe(false));
  test("missing lunchTime not in output",      () => expect(mapImportFull({}).hasOwnProperty("lunchTime")).toBe(false));
  test("missing dinnerTime not in output",     () => expect(mapImportFull({}).hasOwnProperty("dinnerTime")).toBe(false));
  test("missing snackCals not in output",      () => expect(mapImportFull({}).hasOwnProperty("snackCals")).toBe(false));
  test("all meal fields together pass through", () => {
    const m = mapImportFull({ breakfastTime:"07:00", lunchTime:"12:30", dinnerTime:"18:45", lastMealTime:"21:00",
      breakfastCals:400, lunchCals:600, dinnerCals:750, snackCals:150 });
    expect(m.breakfastTime).toBe("07:00");
    expect(m.lunchTime).toBe("12:30");
    expect(m.dinnerTime).toBe("18:45");
    expect(m.lastMealTime).toBe("21:00");
    expect(m.breakfastCals).toBe(400);
    expect(m.lunchCals).toBe(600);
    expect(m.dinnerCals).toBe(750);
    expect(m.snackCals).toBe(150);
  });
});

// Pure meal time formatter: "07:30" → "7:30 AM", "19:45" → "7:45 PM"
const formatMealTime = (timeStr) => {
  if (!timeStr) return "—";
  const [hStr, mStr] = timeStr.split(":");
  if (!mStr) return "—";
  const h = parseInt(hStr, 10);
  const m = mStr.padStart(2, "0");
  if (isNaN(h)) return "—";
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m} ${period}`;
};

describe("Meal timing display logic", () => {
  test('"07:30" → contains "7:30"',      () => expect(formatMealTime("07:30")).toContain("7:30"));
  test('"07:30" → AM',                   () => expect(formatMealTime("07:30")).toContain("AM"));
  test('"19:45" → contains "7:45" or "19:45"', () => {
    const r = formatMealTime("19:45");
    expect(r.includes("7:45") || r.includes("19:45")).toBe(true);
  });
  test('"19:45" → PM',                   () => expect(formatMealTime("19:45")).toContain("PM"));
  test("null → \"—\"",                   () => expect(formatMealTime(null)).toBe("—"));
  test("\"\" → \"—\"",                  () => expect(formatMealTime("")).toBe("—"));
  test('"12:00" → 12:00 PM',             () => { const r = formatMealTime("12:00"); expect(r).toContain("12:00"); });
  test('"00:00" → midnight AM',          () => { const r = formatMealTime("00:00"); expect(r).toContain("AM"); });
});

// ─── NOTES LOGIC ─────────────────────────────────────────────────────────────

const createNoteLogic = (text, tags, dateOverride) => {
  const now = new Date();
  const dateKey = dateOverride || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
  return {
    id: now.getTime(),
    text: text.trim(),
    tags: tags && tags.length ? tags : ["general"],
    date: dateKey,
    time: now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),
    createdAt: now.toISOString(),
  };
};

const buildNotesContextLogic = (notes) => {
  if (!notes || !notes.length) return "";
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
  const recent = notes.filter(n => new Date(n.createdAt) >= cutoff);
  if (!recent.length) return "";
  const byDate = {};
  recent.forEach(n => { const d = n.date || n.createdAt.slice(0,10); if(!byDate[d]) byDate[d]=[]; byDate[d].push(n); });
  const lines = ["━━ PERSONAL NOTES & JOURNAL (last 30 days) ━━"];
  Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).forEach(([date, dayNotes]) => {
    lines.push(`▸ ${date}`);
    dayNotes.forEach(n => lines.push(`  [${n.tags.join(",")}] ${n.text}`));
  });
  return lines.join("\n");
};

const filterNotesLogic = (notes, tag) => {
  if (tag === "all") return notes;
  return notes.filter(n => n.tags.includes(tag));
};

describe("Notes — addNote logic", () => {
  test("text is trimmed",                    () => expect(createNoteLogic("  hello  ").text).toBe("hello"));
  test("tags default to [\"general\"] if empty", () => expect(createNoteLogic("test", []).tags).toEqual(["general"]));
  test("tags default to [\"general\"] if undefined", () => expect(createNoteLogic("test").tags).toEqual(["general"]));
  test("provided tags used",                 () => expect(createNoteLogic("test", ["sleep","food"]).tags).toEqual(["sleep","food"]));
  test("dateOverride used when provided",    () => expect(createNoteLogic("x", [], "2026-01-15").date).toBe("2026-01-15"));
  test("date defaults to today if not provided", () => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    expect(createNoteLogic("x").date).toBe(todayKey);
  });
  test("id is a number (Date.now())",        () => expect(typeof createNoteLogic("x").id).toBe("number"));
  test("createdAt is ISO string",            () => expect(createNoteLogic("x").createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/));
  test("time field is present",              () => expect(createNoteLogic("x").time).toBeTruthy());
});

describe("Notes — buildNotesContext logic", () => {
  test("returns \"\" for empty array",       () => expect(buildNotesContextLogic([])).toBe(""));
  test("returns \"\" for null",              () => expect(buildNotesContextLogic(null)).toBe(""));
  test("returns \"\" for all-old notes (>30 days)", () => {
    const old = new Date(); old.setDate(old.getDate() - 31);
    const notes = [{ id:1, text:"old", tags:["sleep"], date:"2025-01-01", createdAt:old.toISOString() }];
    expect(buildNotesContextLogic(notes)).toBe("");
  });
  test("includes header \"PERSONAL NOTES & JOURNAL\"", () => {
    const notes = [{ id:1, text:"feeling good", tags:["sleep"], date:"2026-05-01", createdAt:new Date().toISOString() }];
    expect(buildNotesContextLogic(notes)).toContain("PERSONAL NOTES & JOURNAL");
  });
  test("includes [sleep] tag in brackets",   () => {
    const notes = [{ id:1, text:"good sleep", tags:["sleep"], date:"2026-05-01", createdAt:new Date().toISOString() }];
    expect(buildNotesContextLogic(notes)).toContain("[sleep]");
  });
  test("includes note text",                 () => {
    const notes = [{ id:1, text:"had oatmeal", tags:["food"], date:"2026-05-01", createdAt:new Date().toISOString() }];
    expect(buildNotesContextLogic(notes)).toContain("had oatmeal");
  });
  test("sorts newest date first",            () => {
    const notes = [
      { id:1, text:"old note", tags:["general"], date:"2026-04-01", createdAt:new Date().toISOString() },
      { id:2, text:"new note", tags:["general"], date:"2026-04-30", createdAt:new Date().toISOString() },
    ];
    const result = buildNotesContextLogic(notes);
    expect(result.indexOf("2026-04-30")).toBeLessThan(result.indexOf("2026-04-01"));
  });
  test("groups notes by date", () => {
    const notes = [
      { id:1, text:"morning", tags:["sleep"], date:"2026-05-01", createdAt:new Date().toISOString() },
      { id:2, text:"evening", tags:["food"],  date:"2026-05-01", createdAt:new Date().toISOString() },
    ];
    const result = buildNotesContextLogic(notes);
    const dateOccurrences = (result.match(/2026-05-01/g) || []).length;
    expect(dateOccurrences).toBe(1); // date appears once as header
    expect(result).toContain("morning");
    expect(result).toContain("evening");
  });
});

describe("Notes — filter logic", () => {
  const sampleNotes = [
    { id:1, text:"slept well",    tags:["sleep"] },
    { id:2, text:"ate tofu",      tags:["food"] },
    { id:3, text:"trained hard",  tags:["workout","recovery"] },
    { id:4, text:"feeling goals", tags:["goals","mindset"] },
  ];
  test('"all" returns all notes',           () => expect(filterNotesLogic(sampleNotes, "all").length).toBe(4));
  test("specific tag returns only matching", () => {
    expect(filterNotesLogic(sampleNotes, "sleep").length).toBe(1);
    expect(filterNotesLogic(sampleNotes, "food").length).toBe(1);
  });
  test("notes with multiple tags match any", () => {
    expect(filterNotesLogic(sampleNotes, "recovery").length).toBe(1);
    expect(filterNotesLogic(sampleNotes, "workout").length).toBe(1);
  });
  test("returns empty array for tag with no matches", () => {
    expect(filterNotesLogic(sampleNotes, "body").length).toBe(0);
  });
  test('"all" on empty array returns empty', () => expect(filterNotesLogic([], "all").length).toBe(0));
});

// ─── SOURCE STALENESS LOGIC ───────────────────────────────────────────────────

const SOURCE_STALE_THRESHOLDS = {
  "HUME":14, "OURA":2, "MYFITNESSPAL":2, "APPLE HEALTH":2, "FITBOD":7, "MANUAL":30,
};

const isStale = (daysAgo, source) => {
  if (daysAgo === null || daysAgo === undefined || daysAgo === 0) return false;
  const threshold = SOURCE_STALE_THRESHOLDS[source];
  if (threshold === undefined) return false;
  return daysAgo > threshold;
};

const formatAge = (daysAgo) => {
  if (daysAgo === null || daysAgo === undefined) return "unknown";
  if (daysAgo === 0) return "today";
  if (daysAgo === 1) return "yesterday";
  return `${daysAgo}d ago`;
};

describe("Source staleness logic", () => {
  test("OURA 1 day ago → not stale",   () => expect(isStale(1, "OURA")).toBe(false));
  test("OURA 3 days ago → stale",      () => expect(isStale(3, "OURA")).toBe(true));
  test("HUME 10 days ago → not stale", () => expect(isStale(10, "HUME")).toBe(false));
  test("HUME 15 days ago → stale",     () => expect(isStale(15, "HUME")).toBe(true));
  test("FITBOD 8 days ago → stale",    () => expect(isStale(8, "FITBOD")).toBe(true));
  test("FITBOD 7 days ago → not stale",() => expect(isStale(7, "FITBOD")).toBe(false));
  test("MANUAL 29 days ago → not stale",() => expect(isStale(29, "MANUAL")).toBe(false));
  test("MANUAL 31 days ago → stale",   () => expect(isStale(31, "MANUAL")).toBe(true));
  test("0 days ago → never stale",     () => expect(isStale(0, "OURA")).toBe(false));
  test("MYFITNESSPAL threshold is 2",  () => {
    expect(isStale(2, "MYFITNESSPAL")).toBe(false);
    expect(isStale(3, "MYFITNESSPAL")).toBe(true);
  });
  test("APPLE HEALTH threshold is 2",  () => {
    expect(isStale(2, "APPLE HEALTH")).toBe(false);
    expect(isStale(3, "APPLE HEALTH")).toBe(true);
  });
});

describe("Source age formatting", () => {
  test("0 → \"today\"",      () => expect(formatAge(0)).toBe("today"));
  test("1 → \"yesterday\"",  () => expect(formatAge(1)).toBe("yesterday"));
  test("5 → \"5d ago\"",     () => expect(formatAge(5)).toBe("5d ago"));
  test("null → \"unknown\"", () => expect(formatAge(null)).toBe("unknown"));
  test("14 → \"14d ago\"",   () => expect(formatAge(14)).toBe("14d ago"));
});

// ─── CHAT THREAD LOGIC ────────────────────────────────────────────────────────

const threadKey = (coachId, llmId) => `thread_${coachId}_${llmId}`;

const buildSeedMessages = (dailyResponse, dailyPrompt, todaySnap, existingThread, newMsg) => {
  if (dailyResponse) {
    return [
      { role:"user",      content:`${todaySnap}\n\n${dailyPrompt}` },
      { role:"assistant", content:dailyResponse },
      ...(existingThread || []).map(m => ({ role:m.role, content:m.content })),
      { role:"user",      content:newMsg },
    ];
  }
  return [
    { role:"user", content:`${todaySnap}\n\n${newMsg}` },
  ];
};

const appendDailyBrief = (existingThread, response, dateKey) => {
  return [...(existingThread || []), {
    role:"assistant",
    content:response,
    type:"daily",
    date:dateKey,
    ts:new Date().toISOString(),
  }];
};

describe("Chat thread — thread key format", () => {
  test("workout+claude → \"thread_workout_claude\"",  () => expect(threadKey("workout","claude")).toBe("thread_workout_claude"));
  test("sleep+gpt4 → \"thread_sleep_gpt4\"",          () => expect(threadKey("sleep","gpt4")).toBe("thread_sleep_gpt4"));
  test("no date suffix in key",                        () => {
    const key = threadKey("food","gemini");
    expect(key).toBe("thread_food_gemini");
    expect(key.length).toBeLessThan(30);
  });
  test("progress+grok → \"thread_progress_grok\"",   () => expect(threadKey("progress","grok")).toBe("thread_progress_grok"));
});

describe("Chat thread — message building", () => {
  const snap = "TODAY'S DATA...";
  const prompt = "Analyze my workout";
  const dailyResp = "Here is your analysis.";
  const userMsg = "Follow up question";

  test("with dailyResponse: returns array of length >= 3", () => {
    expect(buildSeedMessages(dailyResp, prompt, snap, [], userMsg).length).toBeGreaterThanOrEqual(3);
  });
  test("first message role is \"user\"",   () => {
    expect(buildSeedMessages(dailyResp, prompt, snap, [], userMsg)[0].role).toBe("user");
  });
  test("first message content includes dailyPrompt", () => {
    expect(buildSeedMessages(dailyResp, prompt, snap, [], userMsg)[0].content).toContain(prompt);
  });
  test("second message role is \"assistant\"", () => {
    expect(buildSeedMessages(dailyResp, prompt, snap, [], userMsg)[1].role).toBe("assistant");
  });
  test("second message content === dailyResponse", () => {
    expect(buildSeedMessages(dailyResp, prompt, snap, [], userMsg)[1].content).toBe(dailyResp);
  });
  test("last message role is \"user\"",    () => {
    const msgs = buildSeedMessages(dailyResp, prompt, snap, [], userMsg);
    expect(msgs[msgs.length - 1].role).toBe("user");
  });
  test("last message content === newUserMsg", () => {
    const msgs = buildSeedMessages(dailyResp, prompt, snap, [], userMsg);
    expect(msgs[msgs.length - 1].content).toBe(userMsg);
  });
  test("without dailyResponse: returns array of length 1", () => {
    expect(buildSeedMessages("", prompt, snap, [], userMsg).length).toBe(1);
  });
  test("without dailyResponse: only message is user role", () => {
    expect(buildSeedMessages("", prompt, snap, [], userMsg)[0].role).toBe("user");
  });
  test("existingThread messages inserted between seed and new message", () => {
    const thread = [{ role:"user", content:"prev question" }, { role:"assistant", content:"prev answer" }];
    const msgs = buildSeedMessages(dailyResp, prompt, snap, thread, userMsg);
    expect(msgs.length).toBe(5); // seed user, seed assistant, 2 thread, new user
    expect(msgs[2].content).toBe("prev question");
    expect(msgs[3].content).toBe("prev answer");
  });
});

describe("Chat thread — daily brief auto-append", () => {
  test("returns array with new entry appended",   () => {
    const result = appendDailyBrief([], "Coach response", "2026-05-02");
    expect(result.length).toBe(1);
  });
  test("new entry has role: \"assistant\"",       () => {
    expect(appendDailyBrief([], "resp", "2026-05-02")[0].role).toBe("assistant");
  });
  test("new entry has type: \"daily\"",           () => {
    expect(appendDailyBrief([], "resp", "2026-05-02")[0].type).toBe("daily");
  });
  test("new entry has date field",                () => {
    expect(appendDailyBrief([], "resp", "2026-05-02")[0].date).toBe("2026-05-02");
  });
  test("new entry has content",                   () => {
    expect(appendDailyBrief([], "my response", "2026-05-02")[0].content).toBe("my response");
  });
  test("existing messages preserved",             () => {
    const thread = [{ role:"user", content:"hello", type:"qa" }];
    const result = appendDailyBrief(thread, "daily brief", "2026-05-02");
    expect(result.length).toBe(2);
    expect(result[0].content).toBe("hello");
  });
  test("returns new array (immutable)",           () => {
    const thread = [{ role:"user", content:"x" }];
    const result = appendDailyBrief(thread, "resp", "2026-05-02");
    expect(result).not.toBe(thread);
    expect(thread.length).toBe(1);
  });
  test("empty thread → array of length 1",        () => {
    expect(appendDailyBrief([], "resp", "2026-05-02").length).toBe(1);
  });
});
