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

// ─── NOTES SYSTEM ─────────────────────────────────────────────────────────────

describe("📓 Notes system — code presence checks", () => {
  test("NOTE_TAGS array exists with sleep tag",    () => expect(APP).toContain(`"sleep"`));
  test("NOTE_TAGS array exists with food tag",     () => expect(APP).toContain(`"food"`));
  test("NOTE_TAGS array exists with workout tag",  () => expect(APP).toContain(`"workout"`));
  test("NOTE_TAGS array exists with mindset tag",  () => expect(APP).toContain(`"mindset"`));
  test("NOTE_TAGS array exists with goals tag",    () => expect(APP).toContain(`"goals"`));
  test("NOTE_TAGS array exists with recovery tag", () => expect(APP).toContain(`"recovery"`));
  test("NOTE_TAGS array exists with body tag",     () => expect(APP).toContain(`"body"`));
  test("NOTE_TAGS array exists with general tag",  () => expect(APP).toContain(`"general"`));
  test("NOTE_TAGS is defined as a const",          () => expect(APP).toContain("NOTE_TAGS"));
  test("bt_notes localStorage key used",           () => expect(APP).toContain(`"bt_notes"`));
  test("buildNotesContext function exists",         () => expect(APP).toContain("buildNotesContext"));
  test("addNote function exists",                  () => expect(APP).toContain("const addNote"));
  test("deleteNote function exists",               () => expect(APP).toContain("const deleteNote"));
  test("noteFilter state exists",                  () => expect(APP).toContain("noteFilter"));
});

// ─── MEAL TIMING SCHEMA ───────────────────────────────────────────────────────

describe("⏰ Meal timing — schema presence", () => {
  test("MEAL TIMING group exists",           () => expect(APP).toContain(`name:"MEAL TIMING"`));
  test("breakfastTime key exists",           () => expect(APP).toContain(`k:"breakfastTime"`));
  test("lunchTime key exists",               () => expect(APP).toContain(`k:"lunchTime"`));
  test("dinnerTime key exists",              () => expect(APP).toContain(`k:"dinnerTime"`));
  test("lastMealTime key exists",            () => expect(APP).toContain(`k:"lastMealTime"`));
  test("breakfastCals key exists",           () => expect(APP).toContain(`k:"breakfastCals"`));
  test("type:\"time\" rows exist",           () => expect(APP).toContain(`type:"time"`));
  test("MEAL TIMING src is MANUAL",          () => {
    const mealTimingIdx = APP.indexOf(`name:"MEAL TIMING"`);
    const srcManualIdx  = APP.indexOf(`src:"MANUAL"`, mealTimingIdx);
    expect(mealTimingIdx).toBeGreaterThan(-1);
    expect(srcManualIdx).toBeGreaterThan(-1);
    expect(srcManualIdx - mealTimingIdx).toBeLessThan(200);
  });
  test("MEAL TIMING appears in buildHistory output", () => expect(APP).toContain("MEAL TIMING:"));
  test("breakfastTime in mapImport",         () => expect(APP).toContain("breakfastTime: p.breakfastTime"));
  test("lunchTime in mapImport",             () => expect(APP).toContain("lunchTime:     p.lunchTime"));
  test("dinnerTime in mapImport",            () => expect(APP).toContain("dinnerTime:    p.dinnerTime"));
  test("snackCals in mapImport",             () => expect(APP).toContain("snackCals:     p.snackCals"));
  test("MEAL TIMING in ctx snapshot",        () => expect(APP).toContain("MEAL TIMING:"));
  test("breakfastTime in buildCSV30",        () => expect(APP).toContain(`{k:"breakfastTime"`));
});

// ─── CHAT SYSTEM ──────────────────────────────────────────────────────────────

describe("💬 Chat system — code presence", () => {
  test("bt_chat_threads localStorage key",   () => expect(APP).toContain(`"bt_chat_threads"`));
  test("sendChat function exists",           () => expect(APP).toContain("const sendChat"));
  test("callClaudeChat function exists",     () => expect(APP).toContain("const callClaudeChat"));
  test("callGPTChat function exists",        () => expect(APP).toContain("const callGPTChat"));
  test("callGrokChat function exists",       () => expect(APP).toContain("const callGrokChat"));
  test("callGeminiChat function exists",     () => expect(APP).toContain("const callGeminiChat"));
  test("thread_ key prefix used",            () => expect(APP).toContain("`thread_${coachId}_${llmId}`"));
  test("type:\"daily\" in thread entries",   () => expect(APP).toContain(`type:"daily"`));
  test("type:\"qa\" in thread entries",      () => expect(APP).toContain(`type:"qa"`));
  test("chatThreads state exists",           () => expect(APP).toContain("chatThreads"));
  test("chatDraft state exists",             () => expect(APP).toContain("chatDraft"));
});

// ─── COACHING LOG ─────────────────────────────────────────────────────────────

describe("📚 Coaching log — code presence", () => {
  test("log tab defined in nav",             () => expect(APP).toContain(`["log",`));
  test("LOG text in nav array",              () => expect(APP).toContain("LOG"));
  test("coaching-log.txt export filename",   () => expect(APP).toContain(`"coaching-log.txt"`));
  test("filter by coach logic exists",       () => expect(APP).toContain("logCoachFilter"));
  test("DAILY BRIEFS filter option",         () => expect(APP).toContain("DAILY BRIEFS"));
  test("log tab section defined",            () => expect(APP).toContain(`tab==="log"`));
  test("Q&A filter option",                  () => expect(APP).toContain(`"Q&A"`));
  test("logTypeFilter state exists",         () => expect(APP).toContain("logTypeFilter"));
});

// ─── SOURCE META ──────────────────────────────────────────────────────────────

describe("🔖 Source meta — code presence", () => {
  test("SOURCE_SIGNAL object defined",       () => expect(APP).toContain("SOURCE_SIGNAL"));
  test("SOURCE_STALE object defined",        () => expect(APP).toContain("SOURCE_STALE"));
  test("importMeta state exists",            () => expect(APP).toContain("importMeta"));
  test("/meta endpoint fetched",             () => expect(APP).toContain("/meta"));
  test("sourceMeta useMemo exists",          () => expect(APP).toContain("sourceMeta"));
  test("fitbod_last_import key referenced",  () => expect(APP).toContain("fitbod_last_import"));
  test("never imported warning text",        () => expect(APP).toContain("never imported"));
  test("HUME stale threshold 14 days",       () => expect(APP).toContain(`"HUME":14`));
  test("OURA stale threshold 2 days",        () => expect(APP).toContain(`"OURA":2`));
  test("FITBOD stale threshold 7 days",      () => expect(APP).toContain(`"FITBOD":7`));
});

// ─── NEW TABS ─────────────────────────────────────────────────────────────────

describe("🗂️ New tabs — all defined", () => {
  test("notes tab defined",                  () => expect(APP).toContain(`"notes"`));
  test("log tab defined",                    () => expect(APP).toContain(`"log"`));
  test("Tab order: dashboard first",         () => {
    const dashIdx  = APP.indexOf(`["dashboard"`);
    const notesIdx = APP.indexOf(`["notes"`);
    const logIdx   = APP.indexOf(`["log"`);
    expect(dashIdx).toBeGreaterThan(-1);
    expect(notesIdx).toBeGreaterThan(dashIdx);
    expect(logIdx).toBeGreaterThan(dashIdx);
  });
  test("Tab order: notes before sync",       () => {
    const notesIdx = APP.indexOf(`["notes"`);
    const syncIdx  = APP.lastIndexOf(`["sync"`);
    expect(notesIdx).toBeGreaterThan(-1);
    expect(syncIdx).toBeGreaterThan(notesIdx);
  });
  test("Tab order: log before workout",      () => {
    const logIdx     = APP.indexOf(`["log"`);
    const workoutIdx = APP.indexOf(`["workout"`);
    expect(logIdx).toBeGreaterThan(-1);
    expect(workoutIdx).toBeGreaterThan(logIdx);
  });
  test("Tab order: coach before log",        () => {
    const coachIdx = APP.indexOf(`["coach"`);
    const logIdx   = APP.indexOf(`["log"`);
    expect(coachIdx).toBeGreaterThan(-1);
    expect(logIdx).toBeGreaterThan(coachIdx);
  });
  test("notes section rendered",             () => expect(APP).toContain(`tab==="notes"`));
  test("log section rendered",               () => expect(APP).toContain(`tab==="log"`));
});
