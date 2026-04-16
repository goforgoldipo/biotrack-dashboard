/**
 * BIOTRACK — UI REGRESSION TESTS
 * Run these after ANY change to App.jsx
 * Fails loudly if colors, fonts, or layout constants are changed
 *
 * Run: cd biotrack-dashboard && npm test
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const APP = readFileSync(resolve(__dirname, "../App.jsx"), "utf8");

// ─── COLOR SYSTEM ─────────────────────────────────────────────────────────────

describe("🎨 Color system — C constants must be exact", () => {
  test("text1 primary white is #f0f0f0",  () => expect(APP).toContain(`text1: "#f0f0f0"`));
  test("text2 secondary is #c8c8c8",      () => expect(APP).toContain(`text2: "#c8c8c8"`));
  test("text3 muted is #a0a0a0",          () => expect(APP).toContain(`text3: "#a0a0a0"`));
  test("dim is #707070",                  () => expect(APP).toContain(`dim:   "#707070"`));
  test("bg is #050509",                   () => expect(APP).toContain(`bg:    "#050509"`));
  test("surf is #0e0e18",                 () => expect(APP).toContain(`surf:  "#0e0e18"`));
  test("surf2 is #12121e",                () => expect(APP).toContain(`surf2: "#12121e"`));
  test("bord is #1e1e2e",                 () => expect(APP).toContain(`bord:  "#1e1e2e"`));
  test("bord2 is #2a2a3e",                () => expect(APP).toContain(`bord2: "#2a2a3e"`));
});

describe("🏷️ Source accent colors must be exact", () => {
  test("Hume orange-red #ff6b35",         () => expect(APP).toContain("#ff6b35"));
  test("Oura purple #a78bfa",             () => expect(APP).toContain("#a78bfa"));
  test("MFP green #34d399",               () => expect(APP).toContain("#34d399"));
  test("Apple Health red #f43f5e",        () => expect(APP).toContain("#f43f5e"));
  test("Fitbod yellow #fbbf24",           () => expect(APP).toContain("#fbbf24"));
  test("Hume segmental cyan #00e5ff",     () => expect(APP).toContain("#00e5ff"));
  test("Live green #00ff9d",              () => expect(APP).toContain("#00ff9d"));
});

describe("🚦 Semantic colors preserved", () => {
  test("Good green #4ade80",              () => expect(APP).toContain("#4ade80"));
  test("Bad red body fat #ff6b35",        () => expect(APP).toContain(`v>19?"#ff6b35"`));
  test("Warning yellow #fbbf24 on fat",   () => expect(APP).toContain(`v>16?"#fbbf24"`));
  test("Salmon warning #ff8c69",          () => expect(APP).toContain("#ff8c69"));
  test("Protein threshold 170",           () => expect(APP).toContain("v<170"));
  test("Steps low threshold 6000",        () => expect(APP).toContain("v<6000"));
  test("Steps high threshold 10000",      () => expect(APP).toContain("v>10000"));
  test("Sleep/readiness low threshold 72",() => expect(APP).toContain("v<72"));
  test("Sleep/readiness high threshold 85",()=> expect(APP).toContain("v>85"));
  test("HRV low threshold 40",            () => expect(APP).toContain("v<40"));
  test("HRV high threshold 52",           () => expect(APP).toContain("v>52"));
});

// ─── TYPOGRAPHY ───────────────────────────────────────────────────────────────

describe("🔤 Typography — Courier New monospace everywhere", () => {
  test("Courier New is the font",         () => expect(APP).toContain("Courier New"));
  test("monospace fallback present",      () => expect(APP).toContain("monospace"));
  test("No Inter font",                   () => expect(APP).not.toContain("'Inter'"));
  test("No Roboto font",                  () => expect(APP).not.toContain("Roboto"));
  test("No system-ui font",              () => expect(APP).not.toContain("system-ui"));
  test("App title letter-spacing 5px",   () => expect(APP).toContain("letterSpacing:\"5px\"")
                                              || expect(APP).toContain("letterSpacing: \"5px\""));
});

// ─── BRANDING ─────────────────────────────────────────────────────────────────

describe("🏷️ Brand identity", () => {
  test("Logo is ⬡ BIOTRACK",             () => expect(APP).toContain("⬡ BIOTRACK"));
  test("Live dot is #00ff9d",             () => expect(APP).toContain("LIVE"));
  test("DEMO label present",              () => expect(APP).toContain("DEMO"));
});

// ─── TAB ORDER ────────────────────────────────────────────────────────────────

describe("🗂️ Tab order — SYNC must be last", () => {
  const tabMatch = APP.match(/\["dashboard".*?\].*?\["sync".*?\]/s);
  const tabSection = APP.match(/\[\["dashboard"[^]]*?"sync"/s);

  test("dashboard tab is defined",        () => expect(APP).toContain(`"dashboard"`));
  test("coach tab is defined",            () => expect(APP).toContain(`"coach"`));
  test("workout tab is defined",          () => expect(APP).toContain(`"workout"`));
  test("photos tab is defined",           () => expect(APP).toContain(`"photos"`));
  test("manual tab is defined",           () => expect(APP).toContain(`"manual"`));
  test("sync tab is defined",             () => expect(APP).toContain(`"sync"`));

  test("SYNC tab appears AFTER dashboard in nav array", () => {
    const dashIdx = APP.indexOf(`["dashboard"`);
    const syncIdx = APP.lastIndexOf(`["sync"`);
    expect(dashIdx).toBeGreaterThan(-1);
    expect(syncIdx).toBeGreaterThan(-1);
    expect(syncIdx).toBeGreaterThan(dashIdx);
  });

  test("default tab is dashboard", () => {
    expect(APP).toContain(`useState("dashboard")`);
  });
});

// ─── DATA GROUPS ──────────────────────────────────────────────────────────────

describe("📊 Data groups — all 5 must exist with correct source labels", () => {
  test("BODY COMPOSITION group exists",       () => expect(APP).toContain("BODY COMPOSITION"));
  test("SEGMENTAL BODY FAT group exists",     () => expect(APP).toContain("SEGMENTAL BODY FAT"));
  test("SLEEP group exists",                  () => expect(APP).toContain(`name:"SLEEP & RECOVERY"`));
  test("NUTRITION group exists",              () => expect(APP).toContain("NUTRITION"));
  test("ACTIVITY group exists",               () => expect(APP).toContain("ACTIVITY"));
  test("TRAINING group exists",               () => expect(APP).toContain("TRAINING"));
  test("HUME source label",                   () => expect(APP).toContain(`src:"HUME"`));
  test("OURA source label",                   () => expect(APP).toContain(`src:"OURA"`));
  test("MYFITNESSPAL source label",           () => expect(APP).toContain("MYFITNESSPAL"));
  test("APPLE HEALTH source label",           () => expect(APP).toContain("APPLE HEALTH"));
  test("FITBOD source label",                 () => expect(APP).toContain(`src:"FITBOD"`));
  test("HUME BODY POD source label",          () => expect(APP).toContain("HUME BODY POD"));
});

describe("📐 Key metrics — all must exist in schema", () => {
  const mustHave = [
    "bodyFat","weight","leanMass","bmi","visceralFat",
    "trunkFat","rightArmFat","leftArmFat","rightLegFat","leftLegFat",
    "sleepScore","hrv","restingHR","readiness","sleepDur","deepSleep","remSleep",
    "calories","protein","carbs","fat","fiber","water",
    "steps","calsBurned","avgHR","vo2max","standHours",
    "workoutType","workoutVol","workoutDur",
    "fitbodSets","fitbodWorkingSets","fitbodTotalReps","fitbodExerciseCount","fitbodMaxWeightLbs","fitbodMuscleGroups",
  ];
  mustHave.forEach(k => {
    test(`metric "${k}" exists in schema`, () => expect(APP).toContain(`k:"${k}"`));
  });
});

// ─── HUME BODY MAP ────────────────────────────────────────────────────────────

describe("🫀 Hume Body Map component", () => {
  test("HumeBodyMap component defined",   () => expect(APP).toContain("function HumeBodyMap"));
  test("SVG body map present",            () => expect(APP).toContain("<svg"));
  test("5 segment cards: Trunk",          () => expect(APP).toContain(`"Trunk"`));
  test("5 segment cards: Right Arm",      () => expect(APP).toContain(`"Right Arm"`));
  test("5 segment cards: Left Arm",       () => expect(APP).toContain(`"Left Arm"`));
  test("5 segment cards: Right Leg",      () => expect(APP).toContain(`"Right Leg"`));
  test("5 segment cards: Left Leg",       () => expect(APP).toContain(`"Left Leg"`));
  test("UPDATE SCAN button present",      () => expect(APP).toContain("UPDATE SCAN"));
  test("Targeting insight present",       () => expect(APP).toContain("TARGETING INSIGHT"));
  test("humeStatus function defined",     () => expect(APP).toContain("const humeStatus"));
});

// ─── PROGRESS BARS ────────────────────────────────────────────────────────────

describe("📊 Progress bars — 6 metrics with correct targets", () => {
  test("BODY FAT % bar target 12",        () => expect(APP).toContain("target:12"));
  test("PROTEIN bar target 200",          () => expect(APP).toContain("target:200"));
  test("STEPS bar target 10000",          () => expect(APP).toContain("target:10000"));
  test("SLEEP SCORE bar target 85",       () => expect(APP).toContain("target:85"));
  test("READINESS bar target 80",         () => expect(APP).toContain("target:80"));
  test("CALORIES bar target 2100",        () => expect(APP).toContain("target:2100"));
});

// ─── KPI HEADER ───────────────────────────────────────────────────────────────

describe("💪 KPI header — 8 metrics in correct order", () => {
  const kpiSection = APP.match(/const kpis=\[([\s\S]*?)\];/);
  const kpis = kpiSection ? kpiSection[1] : "";
  const ordered = ["BODY FAT","WEIGHT","LEAN MASS","HRV","READINESS","SLEEP","STEPS","PROTEIN"];
  let lastIdx = -1;
  ordered.forEach(k => {
    test(`KPI "${k}" present`, () => expect(APP).toContain(`l:"${k}"`));
  });
});

// ─── API POLLING ──────────────────────────────────────────────────────────────

describe("🔄 API integration", () => {
  test("polls /latest endpoint",          () => expect(APP).toContain("/latest"));
  test("polls /history endpoint",         () => expect(APP).toContain("/history"));
  test("uses x-api-secret header",        () => expect(APP).toContain("x-api-secret"));
  test("2 minute polling interval",       () => expect(APP).toContain("120000"));
  test("localStorage for API config",     () => expect(APP).toContain("localStorage"));
  test("mapImport function exists",       () => expect(APP).toContain("const mapImport"));
});

// ─── LLM MODELS ───────────────────────────────────────────────────────────────

describe("🧠 AI Coach — all 5 LLMs defined", () => {
  test("Claude LLM defined",              () => expect(APP).toContain(`id:"claude"`));
  test("ChatGPT LLM defined",             () => expect(APP).toContain(`id:"gpt4"`));
  test("Gemini LLM defined",              () => expect(APP).toContain(`id:"gemini"`));
  test("Grok LLM defined",               () => expect(APP).toContain(`id:"grok"`));
  test("Perplexity LLM defined",          () => expect(APP).toContain(`id:"perplexity"`));
  test("Claude is native (no key needed)",() => expect(APP).toContain(`native:true`));
});

// ─── PURITY CHECKS ────────────────────────────────────────────────────────────

describe("🚫 Anti-patterns — things that must NOT be in the code", () => {
  test("No white backgrounds",            () => {
    const whites = (APP.match(/background:\s*["']#fff["']/g) || []).length;
    expect(whites).toBe(0);
  });
  test("No light theme colors",           () => {
    // #ffffff10 (6% opacity SVG spine line) is allowed — pure white backgrounds are not
    const pureWhite = (APP.match(/background.*#ffffff(?!10)/gi) || []);
    expect(pureWhite.length).toBe(0);
    expect(APP).not.toContain("#FFFFFF");
  });
  test("No border-radius > 10px",        () => {
    const bigRadius = APP.match(/borderRadius:\s*["']\d{2,}px["']/g) || [];
    const tooLarge = bigRadius.filter(r => parseInt(r.match(/\d+/)[0]) > 10);
    expect(tooLarge.length).toBe(0);
  });
  test("No box-shadow",                   () => expect(APP).not.toContain("boxShadow"));
  test("No gradient backgrounds",        () => expect(APP).not.toContain("linear-gradient"));
  test("Monospaced font in global style", () => expect(APP).toContain("monospace"));
});
