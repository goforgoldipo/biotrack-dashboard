import React, { useState, useCallback, useRef, Fragment, useEffect, useMemo } from "react";
import MealPlanner from "./MealPlanner.jsx";
import { WD, dayIndex, resolveRange, mxBuckets, metricDetail, GROUPS, parseSyncDateRobust, mapImport, MON, ymdOf, todayYmd, addDay, mStart, mEnd, shiftM, daysIncl, dayList, shortDay, fmtDate, DK_PRESETS, dkRange, dkLabel, fmtSpan, SUMMARY_RANGES, SUMMARY_METRICS, GROUP_DESC, SRC_NAME, KPI_TEXT_KEYS, KPI_LAST_GROUPS, KPI_LAST_KEYS, KPI_SUM_RE, kpiMode, aggVals, btFmt, dayKey, appName, HK_SECTIONS, HK_LOWER, HK_NEUTRAL, HKC_HIGHER, HKC_NEUTRAL, hkDirection, hkUnit, hkLabel, hkGroups, SEC_SRC, buildKpiBoard, COMPARABLE, sourceCompare } from "./shared/kpi.js";
import Benchmarks from "./Benchmarks.jsx";
import { ProfilePanel, FeedbackPanel, GoalCard, ConsentGate, AccountCard, BetaAccessCard } from "./ProfileFeedback.jsx";
import { MeasurementsPanel } from "./Measurements.jsx";
import { screen as trackScreen } from "./analytics.js";
import { BENCH_REF } from "./shared/benchRef.js";
import { marked } from "marked";
import DOMPurify from "dompurify";

// ─── COLOR SYSTEM ─────────────────────────────────────────────────────────────
// text1: primary white text
// text2: secondary readable text
// text3: muted but still visible
// dim:   truly secondary/label
const C = {
  // Baremetrics-style palette: indigo accent, cool grays, white surfaces
  text1: "#2B2E4A",   // ink — primary text
  text2: "#4A4F6E",   // body — secondary text
  text3: "#7A80A6",   // muted labels, units
  dim:   "#A9AECB",   // very muted
  bg:    "#F5F6FA",   // page background
  surf:  "#FFFFFF",   // card surface
  surf2: "#EEF0F6",   // subtle row separator
  bord:  "#E7E8F1",   // border
  bord2: "#D3D6E6",   // border hover
  nav:   "#FFFFFF",   // sidebar background
  teal:  "#5468FF",   // primary accent (name kept for compatibility)
  green: "#1F9D6B",
  red:   "#D64545",
};

// ─── DATA ENGINE ──────────────────────────────────────────────────────────────
const rng = (seed, lo, hi) => lo + ((Math.sin(seed * 9301 + 49297) + 1) / 2) * (hi - lo);
const genDay = (offset) => {
  const s = offset + 1;
  const date = new Date(Date.now() - offset * 86400000);
  const dow = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][date.getDay()];
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const wt = ["Push","Pull","Legs","Cardio","Rest","Full Body","Core"][Math.floor(rng(s*7,0,6.99))];
  return {
    date: dateStr, dow, isDemo: true,
    ymd: `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`,
    weight: +(198-offset*0.06+rng(s,-0.6,0.6)).toFixed(1),
    bodyFat: +(18.4-offset*0.022+rng(s+1,-0.25,0.25)).toFixed(1),
    leanMass: +(162+offset*0.012+rng(s+2,-0.3,0.3)).toFixed(1),
    bmi: +(24.2-offset*0.004).toFixed(1),
    visceralFat: +(8.2-offset*0.009).toFixed(1),
    chestFat: +(19-offset*0.02+rng(s+20,-0.3,0.3)).toFixed(1),
    absFat: +(23-offset*0.03+rng(s+21,-0.4,0.4)).toFixed(1),
    legFat: +(16.5-offset*0.015+rng(s+22,-0.3,0.3)).toFixed(1),
    sleepScore: Math.round(rng(s+3,70,92)),
    sleepDur: +(rng(s+4,6.3,8.6)).toFixed(1),
    deepSleep: +(rng(s+5,0.9,2.2)).toFixed(1),
    remSleep: +(rng(s+6,1.1,2.6)).toFixed(1),
    hrv: Math.round(rng(s+7,36,58)),
    restingHR: Math.round(rng(s+8,48,57)),
    readiness: Math.round(rng(s+9,66,93)),
    calories: Math.round(rng(s+10,1850,2450)),
    protein: Math.round(rng(s+11,160,215)),
    carbs: Math.round(rng(s+12,130,230)),
    fat: Math.round(rng(s+13,52,82)),
    fiber: Math.round(rng(s+14,20,38)),
    water: +(rng(s+15,2.4,4.1)).toFixed(1),
    steps: Math.round(rng(s+16,5800,12500)),
    calsBurned: Math.round(rng(s+17,2300,3200)),
    activeMins: Math.round(rng(s+18,28,78)),
    avgHR: Math.round(rng(s+19,63,76)),
    standHours: Math.round(rng(s+20,7,14)),
    vo2max: +(rng(s+25,40,46)).toFixed(1),
    workoutType: wt,
    workoutVol: wt==="Rest"?0:Math.round(rng(s+22,7500,17000)),
    workoutDur: wt==="Rest"?0:Math.round(rng(s+23,32,75)),
    exercises: wt==="Rest"?0:Math.round(rng(s+24,4,10)),
    bmr: Math.round(rng(s+26,1850,2100)),
    metabolicAge: Math.round(rng(s+27,28,36)),
    // Hume segmental — based on Brandon's real scan as starting point
    trunkFat:    +(15.6 - offset*0.025 + rng(s+30,-0.2,0.2)).toFixed(1),
    rightArmFat: +(15.1 - offset*0.018 + rng(s+31,-0.15,0.15)).toFixed(1),
    leftArmFat:  +(15.1 - offset*0.018 + rng(s+32,-0.15,0.15)).toFixed(1),
    rightLegFat: +(10.8 - offset*0.012 + rng(s+33,-0.12,0.12)).toFixed(1),
    leftLegFat:  +(10.2 - offset*0.012 + rng(s+34,-0.12,0.12)).toFixed(1),
    trunkMuscle:    +(72 + offset*0.01 + rng(s+35,-0.4,0.4)).toFixed(1),
    rightArmMuscle: +(17.2 + offset*0.008 + rng(s+36,-0.2,0.2)).toFixed(1),
    leftArmMuscle:  +(16.9 + offset*0.008 + rng(s+37,-0.2,0.2)).toFixed(1),
    rightLegMuscle: +(28.1 + offset*0.009 + rng(s+38,-0.2,0.2)).toFixed(1),
    leftLegMuscle:  +(27.6 + offset*0.009 + rng(s+39,-0.2,0.2)).toFixed(1),
  };
};
// No generated sample data anywhere: people only ever see their own numbers (or an empty state)
const DEMO = [];

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
const LLMS = [
  {id:"claude",name:"Claude",icon:"◆",col:"#cc785c",native:true},
  {id:"gpt4",name:"ChatGPT",icon:"⬡",col:"#10a37f",native:false},
  {id:"gemini",name:"Gemini",icon:"✦",col:"#4285f4",native:false},
  {id:"grok",name:"Grok",icon:"✕",col:"#aaaaaa",native:false},
  {id:"perplexity",name:"Perplexity",icon:"◎",col:"#20b2aa",native:false},
];

const PHASES = [
  { color:"#00ff9d", phase:"PHASE 1 — CREATE", title:"Create a New Shortcut",
    steps:[
      "Open the Shortcuts app on your iPhone",
      'Tap the blue + button top-right → name it "BodyData Daily Sync"',
      "Tap the search bar at the bottom to add actions",
    ]
  },
  { color:"#00b4ff", phase:"PHASE 2 — HEALTH READS", title:"Add 16 Health Sample Actions",
    note:'For each metric: tap +, search "Find Health Samples", configure as shown. You\'ll have 16 of these actions total.',
    steps:[
      'Steps → Aggregate: Sum · Period: Today → Set Variable "steps"',
      'Active Energy Burned → Aggregate: Sum · Period: Today → Set Variable "activeCalories"',
      'Resting Heart Rate → Aggregate: Latest · Period: Last 7 days → Set Variable "restingHR"',
      'Heart Rate → Aggregate: Average · Period: Today → Set Variable "avgHR"',
      'VO2 Max → Aggregate: Latest · Period: Last 30 days → Set Variable "vo2max"',
      'Apple Stand Hour → Aggregate: Count · Period: Today → Set Variable "standHours"',
      'Body Mass → Aggregate: Latest · Period: Last 30 days → Set Variable "weight"',
      'Body Fat Percentage → Aggregate: Latest · Period: Last 30 days → Set Variable "bodyFat"',
      'Lean Body Mass → Aggregate: Latest · Period: Last 30 days → Set Variable "leanMass"',
      'Dietary Energy Consumed → Aggregate: Sum · Period: Today → Set Variable "calories"',
      'Dietary Protein → Aggregate: Sum · Period: Today → Set Variable "protein"',
      'Dietary Carbohydrates → Aggregate: Sum · Period: Today → Set Variable "carbs"',
      'Dietary Fat Total → Aggregate: Sum · Period: Today → Set Variable "fat"',
      'Dietary Fiber → Aggregate: Sum · Period: Today → Set Variable "fiber"',
      'Dietary Water → Aggregate: Sum · Period: Today → Set Variable "water"',
      'Find Workouts → Sort: Newest First · Limit: 1 → Set Variable "lastWorkout"',
    ]
  },
  { color:"#fbbf24", phase:"PHASE 3 — BUILD JSON", title:"Build the Dictionary",
    steps:[
      'Add action: Dictionary',
      'Add key "syncDate" → Current Date formatted as: MMM d',
      'Add key "syncTime" → Current Date formatted as: h:mm a',
      'Add key "steps" → Variable: steps',
      'Add key "activeCalories" → Variable: activeCalories',
      'Add key "restingHR" → Variable: restingHR',
      'Add key "avgHR" → Variable: avgHR',
      'Add key "vo2max" → Variable: vo2max',
      'Add key "standHours" → Variable: standHours',
      'Add key "weight" → Variable: weight',
      'Add key "bodyFat" → Variable: bodyFat',
      'Add key "leanMass" → Variable: leanMass',
      'Add key "calories" → Variable: calories',
      'Add key "protein" → Variable: protein',
      'Add key "carbs" → Variable: carbs',
      'Add key "fat" → Variable: fat',
      'Add key "water" → Variable: water',
      'Add key "workoutType" → Variable: lastWorkout → tap to select "Workout Type"',
      'Add key "workoutDur" → Variable: lastWorkout → tap to select "Duration" → set unit: Minutes',
    ]
  },
  { color:"#a78bfa", phase:"PHASE 4 — POST TO API", title:"Send Data Directly to BodyData (No Paste Needed)",
    note:"This replaces the old clipboard approach — the Shortcut now POSTs directly to your Railway API so automations run 100% silently in the background.",
    steps:[
      'Add action: "Get Text from Dictionary" → Input: the Dictionary above',
      'Add action: "Get Contents of URL" → tap the URL field and paste your Railway API URL (e.g. https://biotrack-api-production.up.railway.app/sync)',
      'In the "Get Contents of URL" action → tap "Show More" → set Method: POST · Request Body: JSON',
      'Tap "Add new field" → Text → key: "secret" → value: your BodyData secret key (same as in the SYNC tab config above)',
      'Tap "Add new field" → Dictionary → key: "data" → value: Dictionary (tap the variable from Phase 3)',
      'Add action: "Show Notification" → Title: "BodyData Synced ✓" · Body: "Health data sent to dashboard" · set "Play Sound": OFF',
    ]
  },
  { color:"#f43f5e", phase:"PHASE 5 — HOURLY AUTOMATION", title:"Schedule Hourly Automations",
    note:"Create automations every hour from 5am–11pm — each runs the same shortcut silently. iOS fires these even when your phone is locked.",
    steps:[
      "Tap the Automation tab (bottom of Shortcuts app)",
      "Tap + → Personal Automation → Time of Day",
      "Set time → Daily → add 'BodyData Daily Sync' → turn OFF 'Ask Before Running' → Done ✓",
      "Repeat for: 5am · 6am · 7am · 8am · 9am · 10am · 11am · 12pm · 1pm · 2pm · 3pm · 4pm · 5pm · 6pm · 7pm · 8pm · 9pm · 10pm · 11pm",
      "Tip: copy the 5am automation and edit the time — faster than creating each from scratch",
    ]
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
// Fields to SUM (totals are more useful for coaching — "you did X this week")
const SUM_KEYS = new Set([
  "steps","activeCalories","basalCalories","totalCaloriesBurned","calsBurned",
  "calories","protein","carbs","fat","fiber","water","sodium","sugar",
  "cholesterol","saturatedFat","potassium","calcium","iron","vitaminC",
  "flightsClimbed","activeMins",
  "workoutVol","fitbodSets","fitbodWorkingSets","fitbodWarmupSets","fitbodTotalReps","fitbodExerciseCount",
  "volChest","volBack","volShoulders","volBiceps","volTriceps","volLegs","volCore",
  "repsChest","repsBack","repsShoulders","repsBiceps","repsTriceps","repsLegs","repsCore",
  "setsChest","setsBack","setsShoulders","setsBiceps","setsTriceps","setsLegs","setsCore",
]);
// Fields to MAX (peak performance matters more than average)
const MAX_KEYS = new Set([
  "fitbodMaxWeightLbs","maxChest","maxBack","maxShoulders","maxBiceps","maxTriceps","maxLegs","maxCore",
]);
// Everything else: AVERAGE (body metrics, sleep quality, heart data)

const aggDays = (days) => {
  if(!days||!days.length) return {};
  const allKeys = new Set();
  days.forEach(d=>Object.keys(d).forEach(k=>allKeys.add(k)));
  const out = { ...days[0] };
  allKeys.forEach(k => {
    const nums = days.map(d=>d[k]).filter(v=>typeof v==="number"&&!isNaN(v));
    if(nums.length===0) return;
    if(SUM_KEYS.has(k)) {
      out[k] = +(nums.reduce((s,v)=>s+v,0)).toFixed(1);
    } else if(MAX_KEYS.has(k)) {
      out[k] = +Math.max(...nums).toFixed(1);
    } else {
      out[k] = +(nums.reduce((s,v)=>s+v,0)/nums.length).toFixed(1);
    }
  });
  return out;
};

const EMPTY_DAY = {};
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthLabel = (monthsAgo) => {
  const d = new Date(); d.setMonth(d.getMonth() - monthsAgo);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};
const yearLabel = (yearsAgo) => `${new Date().getFullYear() - yearsAgo}`;

const getCols = (view, live, history) => {
  try {
  return _getColsInner(view, live, history);
  } catch(e) {
    console.error("[BodyData] getCols crashed — falling back to empty cols:", e);
    return [];
  }
};
const _getColsInner = (view, live, history) => {
  const hasReal = live || (history && history.length > 0);
  if(!hasReal) {
    const all = DEMO;
    if(view==="daily") return Array.from({length:30},(_,i)=>({
      label: i===0?"TODAY":all[i]?.dow+" "+all[i]?.date,
      data: all[i]||all[0], live:false, dayIndex:i, allDays:all,
    }));
    if(view==="weekly") return Array.from({length:30},(_,w)=>({label:w===0?"THIS WEEK":`${w}W AGO`,data:aggDays(all.slice(w*7,w*7+7).filter(Boolean))}));
    if(view==="monthly") return Array.from({length:30},(_,m)=>({label:monthLabel(m),data:aggDays(all.slice(m*30,m*30+30).filter(Boolean))}));
    return Array.from({length:10},(_,y)=>({label:yearLabel(y),data:aggDays(all.slice(y*365,y*365+365).filter(Boolean))}));
  }
  const _nowMs = Date.now();
  const realDays = (history||[])
    .map(h => ({...h, isDemo:false}))
    .filter(h => { const pd = parseSyncDateRobust(h.syncDate||h.date); return pd && pd.getTime() <= _nowMs; })
    .sort((a,b) => (parseSyncDateRobust(b.syncDate||b.date)||new Date(0)) - (parseSyncDateRobust(a.syncDate||a.date)||new Date(0)));
  let all;
  if (live) {
    const liveDate = live.syncDate || live.date;
    const histDate = realDays[0]?.syncDate || realDays[0]?.date;
    if (liveDate && histDate && liveDate === histDate) {
      all = [{ ...realDays[0], ...live, isDemo:false }, ...realDays.slice(1)];
    } else {
      all = [{ ...live, isDemo:false }, ...realDays];
    }
  } else {
    all = realDays.length ? realDays : [EMPTY_DAY];
  }
  const thisYear = new Date().getFullYear();
  const dayLabel = (i, d) => {
    if(i===0) return live?"TODAY ◉ LIVE":"TODAY";
    if(!d.dow||!d.date) return `${i}D AGO`;
    // Use robust parser to get year — handles "Apr 12 2026", "Apr 12, 2026", "Apr 12" etc.
    const parsed = parseSyncDateRobust(d.date) || parseSyncDateRobust(d.syncDate);
    const yr = parsed ? parsed.getFullYear() : thisYear;
    return yr < thisYear ? `${d.dow} ${d.date} ${yr}` : `${d.dow} ${d.date}`;
  };
  const weekLabel = (w) => {
    if(w===0) return "THIS WEEK";
    const weekStart = new Date(Date.now()-w*7*86400000);
    const yr = weekStart.getFullYear();
    return yr < thisYear ? `${w}W AGO '${String(yr).slice(2)}` : `${w}W AGO`;
  };
  if(view==="daily") {
    // Build a map of history by local date key (YYYY-MM-DD in local timezone)
    const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const localKey = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const parseDate = (s) => parseSyncDateRobust(s);
    // Compute the live data's actual date key (may be older than today)
    const liveDateKey = live?.syncDate ? (() => {
      const lp = parseDate(live.syncDate);
      return lp ? localKey(lp) : null;
    })() : null;
    const todayKey = localKey(new Date());
    const liveIsFromToday = liveDateKey === todayKey;

    // Build byDateKey from all history entries.
    // When live is stale (not from today), exclude its date from the grid — it will
    // appear in column 0 (TODAY) instead, so it doesn't show up twice.
    const byDateKey = {};
    all.forEach(d => {
      if(!d||!d.syncDate) return;
      const parsed = parseDate(d.syncDate);
      if(!parsed) return;
      const k = localKey(parsed);
      // If live is stale, don't put its date in the grid (column 0 owns it)
      if(!liveIsFromToday && k === liveDateKey) return;
      byDateKey[k] = d;
    });
    // If live is from today, merge it into today's slot
    if(live && liveIsFromToday) {
      byDateKey[todayKey] = { ...(byDateKey[todayKey]||{}), ...live, isDemo:false };
    }

    // When live data is stale (gap > 1 day), start the calendar from the
    // live data's date so column 0 shows real data immediately — no empty scroll.
    // When live is from today, start from today as usual.
    const liveParsed = (live && !liveIsFromToday) ? parseSyncDateRobust(live.syncDate) : null;
    const startJs = liveParsed || new Date();
    const isStaleStart = !!liveParsed;
    return Array.from({length:90},(_,i)=>{
      const date = new Date(startJs.getFullYear(), startJs.getMonth(), startJs.getDate() - i);
      const key = localKey(date);
      let d = byDateKey[key] || EMPTY_DAY;
      if(i===0 && live) d = { ...d, ...live, isDemo:false };
      const dow = DOW[date.getDay()];
      const dateStr = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
      const yr = date.getFullYear();
      let label;
      if(yr < thisYear) label = `${dow} ${dateStr} ${yr}`;
      else label = `${dow} ${dateStr}`;
      if(i===0) label = isStaleStart ? `LATEST (${dateStr}) ●` : (live ? `TODAY ●` : `TODAY`);
      return {
        label,
        data: d,
        live: i===0 && !!live,
        dayIndex:i,
        allDays:all,
        dateKey: key,
      };
    });
  }
  if(view==="weekly") {
    // Group by actual ISO calendar week (Mon–Sun) so weeks don't shift at month/year boundaries
    const byWeek = {};
    all.forEach(d => {
      const parsed = parseSyncDateRobust(d.syncDate || d.date);
      if(!parsed) return;
      // ISO week: shift so Mon=0
      const dow = (parsed.getDay() + 6) % 7;
      // Use local-time Date constructor to avoid UTC-offset off-by-one
      const mon = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate() - dow);
      const wk = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,"0")}-${String(mon.getDate()).padStart(2,"0")}`;
      if(!byWeek[wk]) byWeek[wk] = [];
      byWeek[wk].push(d);
    });
    return Object.keys(byWeek).sort().reverse().map(wk => {
      // Parse week key as local time (not UTC) to avoid off-by-one in US timezones
      const [wy, wm, wd] = wk.split("-").map(Number);
      const monDate = new Date(wy, wm - 1, wd);
      const sunDate = new Date(wy, wm - 1, wd + 6);
      // Show both month names when week crosses a month boundary
      const label = monDate.getMonth() === sunDate.getMonth()
        ? `${MONTHS_SHORT[monDate.getMonth()]} ${monDate.getDate()}–${sunDate.getDate()}`
        : `${MONTHS_SHORT[monDate.getMonth()]} ${monDate.getDate()} – ${MONTHS_SHORT[sunDate.getMonth()]} ${sunDate.getDate()}`;
      return {label, data: aggDays(byWeek[wk])};
    });
  }
  if(view==="monthly") {
    // Group by actual calendar month — never scrambles at month boundaries
    const byMonth = {};
    all.forEach(d => {
      const parsed = parseSyncDateRobust(d.syncDate || d.date);
      if(!parsed) return;
      const mk = `${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,"0")}`;
      if(!byMonth[mk]) byMonth[mk] = [];
      byMonth[mk].push(d);
    });
    return Object.keys(byMonth).sort().reverse().map(mk => {
      const [y, m] = mk.split("-").map(Number);
      return {label: `${MONTHS_SHORT[m-1]} ${y}`, data: aggDays(byMonth[mk])};
    });
  }
  // Annual — group by actual calendar year
  const byYear = {};
  all.forEach(d => {
    const parsed = parseSyncDateRobust(d.syncDate || d.date);
    if(!parsed) return;
    const yr = String(parsed.getFullYear());
    if(!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(d);
  });
  return Object.keys(byYear).sort().reverse().map(yr => ({label: yr, data: aggDays(byYear[yr])}));
}; // end _getColsInner

// Find the previous day with the same workout type, starting after startIdx
const findPrevSameWorkout = (workoutType, startIdx, allDays) => {
  if(!workoutType || workoutType === "Rest" || !allDays) return null;
  for(let i = startIdx + 1; i < allDays.length; i++) {
    if(allDays[i].workoutType === workoutType) return allDays[i];
  }
  return null;
};

const fmtV = (k,v) => {
  if(v===null||v===undefined||Number.isNaN(v)) return "—";
  if(typeof v==="string") return v;
  if(k==="steps"||k==="calsBurned"||k==="workoutVol"||k==="fitbodTotalReps"||k.startsWith("vol")) return Math.round(Number(v)).toLocaleString();
  if(typeof v==="number") return Number.isInteger(v) ? v : +v.toFixed(1);
  return v;
};

const cellCol = (k,v) => {
  if(typeof v!=="number") return C.text1;
  if(k==="bodyFat") return v>19?"#ff6b35":v>16?"#fbbf24":"#4ade80";
  if(["trunkFat","rightArmFat","leftArmFat","rightLegFat","leftLegFat"].includes(k))
    return v>22?"#ff6b35":v>17?"#fbbf24":v>12?"#4ade80":"#00e5ff";
  if(k==="protein") return v<170?"#ff8c69":C.text1;
  if(k==="calories") return v>2350?"#fbbf24":v<1700?"#ff8c69":C.text1;
  if(k==="steps") return v<6000?"#ff8c69":v>10000?"#4ade80":C.text1;
  if(k==="sleepScore"||k==="readiness") return v<72?"#fbbf24":v>85?"#4ade80":C.text1;
  if(k==="hrv") return v<40?"#fbbf24":v>52?"#4ade80":C.text1;
  return C.text1;
};

// ─── HUME SEGMENTAL STATUS ───────────────────────────────────────────────────
const humeStatus = (pct, region) => {
  // Thresholds vary slightly by region (arms tend to be higher than legs)
  const isLeg = region.includes("Leg");
  const lo = isLeg ? 8  : 12;
  const hi = isLeg ? 18 : 22;
  if (pct === null || pct === undefined) return { label: "—",     color: C.dim };
  if (pct < lo)  return { label: "Very Low",  color: "#00e5ff" };
  if (pct < 14)  return { label: "Low",       color: "#4ade80" };
  if (pct < hi)  return { label: "Standard",  color: "#fbbf24" };
  if (pct < 25)  return { label: "High",      color: "#ff8c69" };
  return           { label: "Very High", color: "#ff6b35" };
};

// ─── HUME BODY MAP COMPONENT ─────────────────────────────────────────────────
function HumeBodyMap({ data, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});

  const segments = [
    { key:"trunkFat",    mKey:"trunkMuscle",    label:"TRUNK",     region:"Trunk" },
    { key:"rightArmFat", mKey:"rightArmMuscle", label:"RIGHT ARM", region:"Arm"   },
    { key:"leftArmFat",  mKey:"leftArmMuscle",  label:"LEFT ARM",  region:"Arm"   },
    { key:"rightLegFat", mKey:"rightLegMuscle", label:"RIGHT LEG", region:"Leg"   },
    { key:"leftLegFat",  mKey:"leftLegMuscle",  label:"LEFT LEG",  region:"Leg"   },
  ];

  const save = () => {
    const clean = {};
    Object.entries(draft).forEach(([k,v])=>{ if(v!=="") clean[k]=parseFloat(v); });
    if(Object.keys(clean).length) onUpdate(clean);
    setEditing(false);
    setDraft({});
  };

  const fatColor = (pct) => {
    if(!pct) return "#1a1a2e";
    if(pct < 10) return "#00e5ff";
    if(pct < 14) return "#4ade80";
    if(pct < 18) return "#fbbf24";
    if(pct < 22) return "#ff8c69";
    return "#ff6b35";
  };

  // Body SVG segments mapped to actual data
  const bodyParts = [
    // [svgPath, dataKey, label, x%, y%]
    { d:"M 140,40 Q 130,35 125,55 L 125,110 Q 140,115 155,110 L 155,55 Q 150,35 140,40 Z",
      key:"trunkFat", label:"Trunk" },
    { d:"M 100,55 Q 88,55 83,70 L 80,105 Q 90,110 100,108 L 105,70 Q 108,57 100,55 Z",
      key:"rightArmFat", label:"R.Arm" },
    { d:"M 180,55 Q 192,55 197,70 L 200,105 Q 190,110 180,108 L 175,70 Q 172,57 180,55 Z",
      key:"leftArmFat", label:"L.Arm" },
    { d:"M 128,115 Q 122,115 120,130 L 118,170 Q 125,172 132,170 L 133,130 Q 134,115 128,115 Z",
      key:"rightLegFat", label:"R.Leg" },
    { d:"M 152,115 Q 158,115 160,130 L 162,170 Q 155,172 148,170 L 147,130 Q 146,115 152,115 Z",
      key:"leftLegFat", label:"L.Leg" },
  ];

  return (
    <div style={{padding:"16px",borderTop:`1px solid ${C.bord}`,background:"#07070e"}}>
      {/* Header */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px",flexWrap:"wrap",gap:"10px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
          <div style={{fontSize:"11px",color:"#00e5ff",letterSpacing:"3px",fontWeight:"bold"}}>HUME BODY POD</div>
          <div style={{fontSize:"9px",background:"#00e5ff22",color:"#00e5ff",padding:"2px 10px",borderRadius:"3px",letterSpacing:"1.5px"}}>SEGMENTAL FAT %</div>
          <div style={{fontSize:"10px",color:C.dim}}>Scan after each Hume weigh-in · update takes 30 sec</div>
        </div>
        <button onClick={()=>setEditing(!editing)} style={{padding:"7px 16px",background:editing?"transparent":"#00e5ff",border:`1px solid #00e5ff`,color:editing?C.text3:"#000",cursor:"pointer",fontSize:"10px",letterSpacing:"2px",borderRadius:"4px",fontWeight:"bold"}}>
          {editing?"✕ CANCEL":"✏ UPDATE SCAN"}
        </button>
      </div>

      <div style={{display:"flex",gap:"20px",flexWrap:"wrap",alignItems:"flex-start"}}>

        {/* SVG Body Map */}
        <div style={{flexShrink:0}}>
          <svg viewBox="50 20 180 165" width="160" height="145" style={{display:"block"}}>
            {/* Head */}
            <ellipse cx="140" cy="32" rx="12" ry="11" fill="#1a1a2e" stroke="#2a2a3e" strokeWidth="1"/>
            {/* Body parts colored by fat level */}
            {bodyParts.map(bp=>{
              const val = data[bp.key];
              const col = fatColor(val);
              return (
                <g key={bp.key}>
                  <path d={bp.d} fill={col} fillOpacity="0.7" stroke={col} strokeWidth="0.5"/>
                  <title>{bp.label}: {val ? val+"%" : "—"}</title>
                </g>
              );
            })}
            {/* Spine line */}
            <line x1="140" y1="43" x2="140" y2="115" stroke="#ffffff10" strokeWidth="1"/>
          </svg>
          {/* Fat legend */}
          <div style={{display:"flex",flexDirection:"column",gap:"3px",marginTop:"6px"}}>
            {[["Very Low","#00e5ff"],["Low","#4ade80"],["Standard","#fbbf24"],["High","#ff8c69"],["Very High","#ff6b35"]].map(([l,c])=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:"5px"}}>
                <div style={{width:"8px",height:"8px",borderRadius:"2px",background:c,opacity:0.8}}/>
                <span style={{fontSize:"9px",color:C.dim}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Segment cards */}
        <div style={{flex:1,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:"10px"}}>
          {segments.map(seg=>{
            const fatVal  = data[seg.key];
            const musVal  = data[seg.mKey];
            const st      = humeStatus(fatVal, seg.region);
            const fc      = fatColor(fatVal);
            return (
              <div key={seg.key} style={{background:"#0e0e18",border:`1px solid ${fc}40`,borderRadius:"8px",padding:"12px"}}>
                <div style={{fontSize:"9px",color:C.text3,letterSpacing:"2px",marginBottom:"6px",fontWeight:"600"}}>{seg.label}</div>
                {editing ? (
                  <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                    <div>
                      <div style={{fontSize:"9px",color:C.dim,marginBottom:"3px"}}>FAT %</div>
                      <input type="number" step="0.1"
                        placeholder={fatVal ?? "e.g. 15.6"}
                        value={draft[seg.key]??""} onChange={e=>setDraft(p=>({...p,[seg.key]:e.target.value}))}
                        style={{background:"#080814",border:`1px solid ${C.bord2}`,color:C.text1,padding:"5px 8px",fontSize:"12px",borderRadius:"3px",width:"100%",outline:"none",boxSizing:"border-box"}}/>
                    </div>
                    <div>
                      <div style={{fontSize:"9px",color:C.dim,marginBottom:"3px"}}>MUSCLE (lbs)</div>
                      <input type="number" step="0.1"
                        placeholder={musVal ?? "e.g. 72.0"}
                        value={draft[seg.mKey]??""} onChange={e=>setDraft(p=>({...p,[seg.mKey]:e.target.value}))}
                        style={{background:"#080814",border:`1px solid ${C.bord2}`,color:C.text1,padding:"5px 8px",fontSize:"12px",borderRadius:"3px",width:"100%",outline:"none",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                ) : (
                  <>
                    <div style={{fontSize:"26px",fontWeight:"bold",color:fc,lineHeight:"1",marginBottom:"4px"}}>
                      {fatVal != null ? `${fatVal}%` : "—"}
                    </div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontSize:"11px",color:st.color,fontWeight:"600"}}>{st.label}</span>
                      {musVal != null && <span style={{fontSize:"10px",color:C.dim}}>{musVal} lbs</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save button */}
      {editing && (
        <div style={{marginTop:"14px",display:"flex",gap:"8px"}}>
          <button onClick={save} style={{padding:"9px 22px",background:"#00e5ff",border:"none",color:"#000",cursor:"pointer",fontSize:"11px",letterSpacing:"2px",borderRadius:"4px",fontWeight:"bold"}}>
            💾 SAVE HUME SCAN
          </button>
          <div style={{fontSize:"11px",color:C.dim,display:"flex",alignItems:"center"}}>
            Enter the values shown in your Hume app after stepping on the scale
          </div>
        </div>
      )}

      {/* Workout targeting note */}
      {!editing && (
        <div style={{marginTop:"14px",background:"#0a0a14",border:`1px solid ${C.bord}`,borderRadius:"6px",padding:"12px",display:"flex",flexWrap:"wrap",gap:"16px",alignItems:"center"}}>
          <div style={{fontSize:"10px",color:"#00e5ff",letterSpacing:"1px",fontWeight:"600"}}>⚡ TARGETING INSIGHT</div>
          <div style={{fontSize:"11px",color:C.text2,flex:1}}>
            {(() => {
              const trunk = data.trunkFat;
              const arms  = ((data.rightArmFat||0)+(data.leftArmFat||0))/2;
              const legs  = ((data.rightLegFat||0)+(data.leftLegFat||0))/2;
              const highest = trunk>arms && trunk>legs ? "Trunk" : arms>legs ? "Arms" : "Legs";
              const focus = highest==="Trunk"
                ? "HIIT cardio + compound lifts (squats, deadlifts) to target trunk. Minimize direct ab isolation."
                : highest==="Arms"
                ? "Push/pull supersets with metabolic conditioning. Focus on arm volume."
                : "Leg-focused sessions — lunges, leg press, Bulgarian splits. High rep ranges.";
              return `Highest fat region: ${highest} — AI recommends: ${focus}`;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}


// ── Robust cross-browser syncDate parser ──────────────────────────────────
// Safari/WebKit rejects "Apr 12 2026" (no comma) — must normalize to "Apr 12, 2026"
// Handles: "Apr 12 2026", "Apr 12, 2026", "Apr 12", "2026-04-12"
function summarySparkline(vals, col, h, w) {
  const nums = (vals||[]).filter(v => typeof v === "number" && !isNaN(v));
  if (nums.length < 2) {
    return <div style={{height:h,width:w,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:"10px",color:"#444"}}>—</span></div>;
  }
  const mn = Math.min(...nums), mx = Math.max(...nums);
  const rng = mx - mn || 1;
  const pts = nums.slice().reverse().map((v,i) => {
    const x = (i / (nums.length - 1)) * w;
    const y = h - ((v - mn) / rng) * (h - 6) - 3;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  const lastY = (h - ((nums[0] - mn) / rng) * (h - 6) - 3).toFixed(1);
  return (
    <svg width={w} height={h} style={{overflow:"visible",display:"block"}}>
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={w} cy={lastY} r="3" fill={col}/>
    </svg>
  );
}

function summaryFmtVal(v, unit) {
  if (v == null) return "—";
  if (unit === "%")    return v.toFixed(1) + "%";
  if (unit === "lbs" || unit === "lb") return v.toFixed(1) + " lbs";
  if (unit === "hrs")  return v.toFixed(1) + "h";
  if (unit === "ms")   return Math.round(v) + " ms";
  if (unit === "bpm")  return Math.round(v) + " bpm";
  if (unit === "kcal") return Math.round(v).toLocaleString() + " kcal";
  if (unit === "g")    return Math.round(v) + "g";
  if (unit === "k")    return (v / 1000).toFixed(1) + "k";
  if (unit === "min")  return Math.round(v) + " min";
  if (unit === "mi")   return v.toFixed(1) + " mi";
  if (unit === "brpm") return v.toFixed(1) + " brpm";
  if (unit === "L")    return v.toFixed(1) + "L";
  if (unit === "mg")   return Math.round(v).toLocaleString() + " mg";
  return typeof v === "number" ? v.toFixed(1) : String(v);
}

function summaryPct(cur, old) {
  if (cur == null || old == null || old === 0) return null;
  return ((cur - old) / Math.abs(old) * 100).toFixed(1);
}

// ─── MARKDOWN RENDERER ────────────────────────────────────────────────────────
function renderMarkdown(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // H1
    if (/^# /.test(line)) {
      out.push(<div key={i} style={{fontSize:15,fontWeight:"bold",color:"#f0f0f0",margin:"14px 0 6px",letterSpacing:"0.5px"}}>{line.slice(2)}</div>);
    // H2
    } else if (/^## /.test(line)) {
      out.push(<div key={i} style={{fontSize:13,fontWeight:"bold",color:"#c8c8c8",margin:"12px 0 4px",letterSpacing:"0.5px"}}>{line.slice(3)}</div>);
    // H3
    } else if (/^### /.test(line)) {
      out.push(<div key={i} style={{fontSize:12,fontWeight:"bold",color:"#a0a0a0",margin:"10px 0 3px"}}>{line.slice(4)}</div>);
    // HR
    } else if (/^---+$/.test(line.trim())) {
      out.push(<div key={i} style={{borderTop:"1px solid #2a2a3e",margin:"10px 0"}}/>);
    // Bullet list
    } else if (/^[-•*] /.test(line)) {
      out.push(
        <div key={i} style={{display:"flex",gap:"8px",margin:"2px 0",paddingLeft:4}}>
          <span style={{color:"#a78bfa",flexShrink:0,marginTop:1}}>▸</span>
          <span>{inlineMarkdown(line.replace(/^[-•*] /,""))}</span>
        </div>
      );
    // Numbered list
    } else if (/^\d+\. /.test(line)) {
      const num = line.match(/^(\d+)\. /)[1];
      out.push(
        <div key={i} style={{display:"flex",gap:"8px",margin:"2px 0",paddingLeft:4}}>
          <span style={{color:"#a78bfa",flexShrink:0,minWidth:16,fontWeight:"bold"}}>{num}.</span>
          <span>{inlineMarkdown(line.replace(/^\d+\. /,""))}</span>
        </div>
      );
    // Table row
    } else if (/^\|/.test(line)) {
      const cells = line.split("|").filter((_,ci)=>ci>0&&ci<line.split("|").length-1).map(c=>c.trim());
      const isHeader = lines[i+1]&&/^\|[-| ]+\|$/.test(lines[i+1]);
      if(!/^[-| ]+$/.test(line.replace(/\|/g,"").trim())) {
        out.push(
          <div key={i} style={{display:"grid",gridTemplateColumns:`repeat(${cells.length},1fr)`,gap:1,marginBottom:1}}>
            {cells.map((c,ci)=>(
              <div key={ci} style={{
                background:isHeader?"#1a1a2e":"#0e0e18",
                padding:"5px 10px",fontSize:11,
                color:isHeader?"#c8c8c8":"#f0f0f0",
                fontWeight:isHeader?"bold":"normal",
                border:"1px solid #2a2a3e",
              }}>{inlineMarkdown(c)}</div>
            ))}
          </div>
        );
      } else {
        // skip separator row
      }
    // Empty line → spacer
    } else if (line.trim()==="") {
      out.push(<div key={i} style={{height:6}}/>);
    // Regular paragraph
    } else {
      out.push(<div key={i} style={{margin:"1px 0",lineHeight:1.8}}>{inlineMarkdown(line)}</div>);
    }
    i++;
  }
  return <div style={{fontSize:13,color:"#c8c8c8"}}>{out}</div>;
}
function inlineMarkdown(text) {
  // Process inline: **bold**, *italic*, `code`
  const parts = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[2]) parts.push(<strong key={m.index} style={{color:"#f0f0f0",fontWeight:"bold"}}>{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={m.index} style={{color:"#e0d0ff"}}>{m[3]}</em>);
    else if (m[4]) parts.push(<code key={m.index} style={{background:"#1a1a2e",padding:"1px 5px",borderRadius:3,fontSize:11,color:"#a78bfa",fontFamily:"'Courier New',monospace"}}>{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

// ─── KPI BOARD (card, trend chart and drilldown ported from sellmore.me/crm) ──
const IcSvg = ({children}) => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>{children}</svg>;
const IcSearch = () => <IcSvg><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></IcSvg>;
const IcSliders = () => <IcSvg><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></IcSvg>;
const IcCal = () => <IcSvg><rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/></IcSvg>;
const IcChev = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m6 9 6 6 6-6"/></svg>;
const IcBack = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 6-6 6 6 6"/></svg>;

function BtDelta({d, pts, lb, neu}) {
  if (d == null || !isFinite(d)) return null;
  const good = lb ? d < 0 : d > 0, zero = neu || Math.abs(d) < .05;   // neutral metrics: gray, no good/bad
  return <span style={{fontSize:"11px",fontWeight:600,padding:"2px 6px",borderRadius:"6px",whiteSpace:"nowrap",
    background:zero?"#F1F2F8":good?"rgba(31,157,107,.1)":"rgba(214,69,69,.08)",color:zero?"#7A80A6":good?C.green:C.red}}>
    {d >= 0 ? "↑" : "↓"}{Math.abs(d).toFixed(1)}{pts ? " pts" : "%"}</span>;
}
function btSmooth(P) {
  if (P.length < 3) return "M" + P.map(p => p.join(",")).join(" L");
  let d = "M" + P[0][0] + "," + P[0][1];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2, t = .18;
    d += " C" + (p1[0] + (p2[0] - p0[0]) * t) + "," + (p1[1] + (p2[1] - p0[1]) * t) + " " + (p2[0] - (p3[0] - p1[0]) * t) + "," + (p2[1] - (p3[1] - p1[1]) * t) + " " + p2[0] + "," + p2[1];
  }
  return d;
}
// card chart: line between min/max gridlines, max label, first/middle/last date, dashed last step while today is still in progress
function BtTrendChart({vals, labels, unit, partial}) {
  const W = 300, H = 92, L = 4, B = 16, n = vals.length;
  const nums = vals.filter(v => v != null);
  if (!nums.length) return <div style={{marginTop:"10px",height:H + 13,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11.5px",color:C.text3,border:"1px dashed #E7E8F1",borderRadius:"8px"}}>No data in this range</div>;
  const top = Math.max(...nums), low = Math.min(...nums);
  let hi = top, lo = low; if (hi === lo) { const p = Math.abs(hi) * .05 || 1; hi += p; lo -= p; }
  const x = i => n === 1 ? W / 2 : L + i / (n - 1) * (W - 2 * L), y = v => 6 + (1 - (v - lo) / (hi - lo)) * (H - B - 10);
  const P = vals.map((v, i) => v == null ? null : [x(i), y(v)]).filter(Boolean), m = P.length;
  const dash = partial && m > 1 && vals[n - 1] != null, solid = dash ? P.slice(0, -1) : P;
  const tick = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <div style={{position:"relative",marginTop:"10px"}}>
      <div style={{position:"absolute",right:0,top:"-2px",fontSize:"10px",color:C.text3}}>{btFmt(top, unit)}</div>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{display:"block",overflow:"visible"}}>
        <line x1="0" x2={W} y1={y(hi === top ? top : hi)} y2={y(hi === top ? top : hi)} stroke="#E7E8F1" strokeDasharray="2 3" vectorEffect="non-scaling-stroke"/>
        <line x1="0" x2={W} y1={y(lo)} y2={y(lo)} stroke="#E4E2DC" vectorEffect="non-scaling-stroke"/>
        {m === 1 ? <circle cx={P[0][0]} cy={P[0][1]} r="3.5" fill={C.teal}/> : <>
          <path d={btSmooth(solid)} fill="none" stroke={C.teal} strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>
          {dash && <path d={"M" + P[m - 2].join(",") + " L" + P[m - 1].join(",")} fill="none" stroke={C.teal} strokeWidth="1.8" strokeDasharray="3 3" vectorEffect="non-scaling-stroke"/>}
        </>}
      </svg>
      <div style={{position:"relative",height:"13px",fontSize:"10px",color:C.text3}}>
        {tick.map(i => <span key={i} style={{position:"absolute",top:0,whiteSpace:"nowrap",...(n === 1 || (i !== 0 && i !== n - 1) ? {left:"50%",transform:"translateX(-50%)"} : i === 0 ? {left:0} : {right:0})}}>{labels[i]}</span>)}
      </div>
    </div>
  );
}
function BtKpiCard({c, cmpLbl, onOpen}) {
  return (
    <div className="bt-kcard" tabIndex={0} onClick={onOpen} onKeyDown={e => { if (e.key === "Enter") onOpen(); }}>
      <div style={{display:"flex",alignItems:"flex-start",gap:"8px"}}>
        <span className="bt-eyebrow" style={{flex:1,minWidth:0,lineHeight:1.35,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}} title={c.label}>{c.label}</span>
        {c.delta != null ? <BtDelta d={c.delta} pts={c.pts} lb={c.lb} neu={c.neu}/>
          : c.text || c.mode === "last" ? <span style={{fontSize:"10.5px",color:C.text3,whiteSpace:"nowrap"}}>latest</span> : null}
      </div>
      <div style={{display:"flex",alignItems:"baseline",gap:"8px",marginTop:"6px",flexWrap:"nowrap",minWidth:0}}>
        <span className="bt-num" style={{fontSize:c.text ? "22px" : "28px",lineHeight:1.1,color:C.text1,whiteSpace:"nowrap",flexShrink:0}}>{c.fmt}</span>
        {!c.text && <span style={{fontSize:"12.5px",color:C.text3,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0}} title={"Compared with " + cmpLbl}>from {c.prevFmt}</span>}
      </div>
      <div style={{fontSize:"11.5px",color:C.text3,marginTop:"3px",minHeight:"15px"}}>{c.sub}</div>
      {c.apps?.length > 0 && <div title={c.apps.join(", ")} style={{fontSize:"11px",color:C.text2,marginTop:"2px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
        via {c.apps.slice(0, 3).join(" · ")}{c.apps.length > 3 ? ` +${c.apps.length - 3}` : ""}</div>}
      {!c.text && <div style={{marginTop:"auto"}}><BtTrendChart vals={c.vals} labels={c.labels} unit={c.unit} partial={c.partial}/></div>}
    </div>
  );
}
function BtBigChart({labels, vals, unit}) {
  const W = 720, H = 240, L = 62, R = 12, T = 12, B = 28;
  const pts = vals.map((v, i) => [i, v]).filter(p => p[1] != null);
  if (!pts.length) return <div style={{height:H,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontSize:"13px"}}>No data in this range.</div>;
  let mn = Math.min(...pts.map(p => p[1])), mx = Math.max(...pts.map(p => p[1]));
  if (mx === mn) { const p = Math.abs(mx) * .05 || 1; mx += p; mn -= p; }
  const step = Math.pow(10, Math.floor(Math.log10((mx - mn) / 4)));
  const st = [1, 2, 5, 10].map(s => s * step).find(s => (mx - mn) / s <= 5) || step * 10;
  const bot = Math.floor(mn / st) * st, top = Math.ceil(mx / st) * st || bot + st;
  const xs = (vals.length - 1) || 1, X = i => vals.length === 1 ? (L + W - R) / 2 : L + i / xs * (W - L - R), Y = v => T + (1 - (v - bot) / (top - bot)) * (H - T - B);
  const P = pts.map(p => [X(p[0]), Y(p[1])]), d = btSmooth(P);
  const ticks = []; for (let v = bot; v <= top + st * 1e-6; v += st) ticks.push(+v.toFixed(8));
  const every = Math.ceil(labels.length / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{display:"block",maxWidth:"100%"}}>
      {ticks.map(t => <g key={t}><line x1={L} x2={W - R} y1={Y(t)} y2={Y(t)} stroke="#EFEEEA"/><text x={L - 8} y={Y(t) + 4} textAnchor="end" fontSize="10.5" fill="#7A80A6" fontFamily="Inter">{btFmt(t, unit)}</text></g>)}
      {P.length > 1 && <path d={d + ` L${P[P.length - 1][0]},${Y(bot)} L${P[0][0]},${Y(bot)} Z`} fill="rgba(12,70,75,.08)"/>}
      {P.length > 1 && <path d={d} fill="none" stroke={C.teal} strokeWidth="2"/>}
      {pts.map((p, i) => <circle key={i} cx={P[i][0]} cy={P[i][1]} r="3" fill="#fff" stroke={C.teal} strokeWidth="1.5"><title>{labels[p[0]]}: {btFmt(p[1], unit)}</title></circle>)}
      {labels.map((l, i) => i % every === 0 || i === labels.length - 1 ? <text key={i} x={X(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#7A80A6" fontFamily="Inter">{l}</text> : null)}
    </svg>
  );
}
// Bars over time (same buckets as the trend line)
function BtBars({labels, vals, unit}) {
  const W = 720, H = 240, L = 62, R = 12, T = 12, B = 28, n = vals.length;
  const nums = vals.filter(v => v != null);
  if (!nums.length) return <div style={{height:H,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontSize:"13px"}}>No data in this range.</div>;
  const mx = Math.max(...nums, 0), mn = Math.min(...nums, 0), span = (mx - mn) || 1;
  const bw = (W - L - R) / n, y = v => T + (1 - (v - mn) / span) * (H - T - B), y0 = y(0);
  const ticks = [mn, mn + span / 2, mx];
  const lab = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
      {ticks.map((t, i) => <g key={i}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#EEF0F6"/>
        <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={C.text3}>{btFmt(t, unit)}</text></g>)}
      {vals.map((v, i) => v == null ? null : <rect key={i} x={L + i * bw + bw * .15} width={Math.max(1, bw * .7)} y={Math.min(y(v), y0)} height={Math.max(1, Math.abs(y0 - y(v)))} rx="2" fill={C.teal} opacity=".85"><title>{labels[i]}: {btFmt(v, unit)}</title></rect>)}
      {lab.map(i => <text key={i} x={L + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill={C.text3}>{labels[i]}</text>)}
    </svg>
  );
}
// Histogram: how often each value range occurred, from the daily readings in the range
function BtHistogram({values, unit}) {
  const W = 720, H = 240, L = 46, R = 12, T = 12, B = 34;
  if (values.length < 2) return <div style={{height:H,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontSize:"13px"}}>Need at least two days of data for a histogram.</div>;
  const lo = Math.min(...values), hi = Math.max(...values);
  const k = Math.min(16, Math.max(5, Math.round(Math.sqrt(values.length)))), w = (hi - lo) / k || 1;
  const bins = Array.from({length: k}, (_, i) => ({a: lo + i * w, b: lo + (i + 1) * w, n: 0}));
  for (const v of values) bins[Math.min(k - 1, Math.floor((v - lo) / w))].n++;
  const top = Math.max(...bins.map(b => b.n)), bw = (W - L - R) / k, y = n => T + (1 - n / top) * (H - T - B);
  const mean = values.reduce((a, b) => a + b, 0) / values.length, mx = L + (mean - lo) / ((hi - lo) || 1) * (W - L - R);
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display:"block"}}>
      {[0, Math.round(top / 2), top].map((t, i) => <g key={i}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#EEF0F6"/>
        <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill={C.text3}>{t}</text></g>)}
      {bins.map((b, i) => <rect key={i} x={L + i * bw + 1} width={bw - 2} y={y(b.n)} height={H - B - y(b.n)} rx="2" fill={C.teal} opacity=".85">
        <title>{btFmt(b.a, unit)} – {btFmt(b.b, unit)}: {b.n} day{b.n === 1 ? "" : "s"}</title></rect>)}
      <line x1={mx} x2={mx} y1={T} y2={H - B} stroke={C.text1} strokeDasharray="4 3"/>
      <text x={mx + 4} y={T + 10} fontSize="11" fill={C.text1}>avg {btFmt(mean, unit)}</text>
      {[0, Math.floor(k / 2), k].map(i => <text key={i} x={L + i * bw} y={H - 12} textAnchor="middle" fontSize="11" fill={C.text3}>{btFmt(lo + i * w, unit)}</text>)}
      <text x={(W + L) / 2} y={H} textAnchor="middle" fontSize="10.5" fill={C.text3}>days at each value</text>
    </svg>
  );
}
// ─── METRICS EXPLORER: every metric in a left nav; trend, comparisons, weekday pattern, histogram, sources ───
function BtBigLine({labels, vals, unit, color = "#5468FF"}) {
  const [hov, setHov] = useState(null), [W, setW] = useState(900), box = useRef(null);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width)))); ro.observe(el); return () => ro.disconnect(); }, []);
  const H = W < 500 ? 220 : 300, L = W < 500 ? 52 : 70, R = 16, T = 14, B = 30, n = vals.length;
  const nums = vals.filter(v => v != null);
  if (!nums.length) return <div style={{height: H, display: "flex", alignItems: "center", justifyContent: "center", color: C.text3, fontSize: "13px"}}>No data in this range.</div>;
  let hi = Math.max(...nums), lo = Math.min(...nums); if (hi === lo) { const p = Math.abs(hi) * .05 || 1; hi += p; lo -= p; }
  const pad = (hi - lo) * .08; hi += pad; lo = Math.max(lo - pad, Math.min(...nums) >= 0 ? 0 : -Infinity);
  const x = i => n === 1 ? (L + W - R) / 2 : L + i / (n - 1) * (W - L - R), y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const pts = vals.map((v, i) => v == null ? null : [x(i), y(v)]);
  const segs = []; let cur = [];
  for (const p of pts) { if (p) cur.push(p); else if (cur.length) { segs.push(cur); cur = []; } } if (cur.length) segs.push(cur);
  const path = s => "M" + s.map(p => p.map(v => v.toFixed(1)).join(",")).join(" L");
  const ticks = [0, 1, 2, 3, 4].map(i => lo + (hi - lo) * i / 4);
  const step = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(W / 100))));
  const move = e => { const r = e.currentTarget.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width * W; let best = null, bd = 1e9;
    vals.forEach((v, i) => { if (v != null && Math.abs(x(i) - px) < bd) { bd = Math.abs(x(i) - px); best = i; } }); setHov(best); };
  return (
    <div ref={box} style={{position: "relative"}}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display: "block"}} onMouseMove={move} onMouseLeave={() => setHov(null)}>
        {ticks.map((t, i) => <g key={i}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#EEF0F6" strokeDasharray="4 4"/>
          <text x={L - 10} y={y(t) + 4} textAnchor="end" fontSize="11.5" fill={C.text3}>{btFmt(t, unit)}</text></g>)}
        {segs.map((s, i) => <g key={i}>
          {s.length > 1 && <path d={`${path(s)} L${s[s.length - 1][0]},${H - B} L${s[0][0]},${H - B} Z`} fill={color} opacity=".07"/>}
          <path d={path(s)} fill="none" stroke={color} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round"/>
          {s.length === 1 && <circle cx={s[0][0]} cy={s[0][1]} r="3.5" fill={color}/>}</g>)}
        {labels.map((l, i) => i % step === 0 && <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11.5" fill={C.text3}>{l}</text>)}
        {hov != null && <g><line x1={x(hov)} x2={x(hov)} y1={T} y2={H - B} stroke="#C9CDE0"/><circle cx={x(hov)} cy={y(vals[hov])} r="5" fill="#fff" stroke={color} strokeWidth="2.5"/></g>}
      </svg>
      {hov != null && <div style={{position: "absolute", left: `${x(hov) / W * 100}%`, top: `${y(vals[hov]) / H * 100}%`, transform: `translate(${x(hov) > W * .8 ? "-110%" : "12px"},-110%)`, background: "#2B2E4A", color: "#fff", borderRadius: 8, padding: "6px 10px", fontSize: 12, pointerEvents: "none", whiteSpace: "nowrap"}}>
        <div style={{opacity: .7}}>{labels[hov]}</div><div style={{fontWeight: 700, fontSize: 14}}>{btFmt(vals[hov], unit)}</div></div>}
    </div>);
}
function MxWeekday({vals, labels: full, unit, lb}) {
  const [W, setW] = useState(900), box = useRef(null);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width)))); ro.observe(el); return () => ro.disconnect(); }, []);
  const labels = W < 560 ? full.map(l => l.slice(0, 3)) : full, fs = W < 420 ? 10.5 : 13;
  const H = 230, T = 26, B = 30, L = 8, R = 8, n = vals.length;
  const nums = vals.filter(v => v != null);
  if (!nums.length) return <div style={{height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: C.text3, fontSize: "13px"}}>Not enough days in this range.</div>;
  const mx = Math.max(...nums), bw = (W - L - R) / n, y = v => T + (1 - v / (mx || 1)) * (H - T - B);
  const best = vals.indexOf(lb ? Math.min(...nums) : mx);
  return (<div ref={box}><svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display: "block"}}>
    <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#EEF0F6"/>
    {vals.map((v, i) => v == null ? null : <g key={i}>
      <rect x={L + i * bw + bw * .18} width={bw * .64} y={y(v)} height={H - B - y(v)} rx="4" fill="#5468FF" opacity={i === best ? 1 : .55}/>
      <text x={L + i * bw + bw / 2} y={y(v) - 7} textAnchor="middle" fontSize={fs} fontWeight="600" fill={C.text1}>{btFmt(v, unit)}</text></g>)}
    {labels.map((l, i) => <text key={i} x={L + i * bw + bw / 2} y={H - 9} textAnchor="middle" fontSize={fs} fill={C.text3}>{l}</text>)}
  </svg></div>);
}
function MxHistogram({values, unit}) {
  const [W, setW] = useState(900), box = useRef(null);
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.round(e.contentRect.width)))); ro.observe(el); return () => ro.disconnect(); }, []);
  if (values.length < 2) return <div style={{height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: C.text3, fontSize: "13px"}}>Need at least two days of data.</div>;
  const H = 230, L = 34, R = 10, T = 22, B = 34, fs = W < 420 ? 10.5 : 12;
  const lo = Math.min(...values), hi = Math.max(...values);
  const k = Math.min(W < 500 ? 10 : 18, Math.max(5, Math.round(Math.sqrt(values.length)))), w = (hi - lo) / k || 1;
  const bins = Array.from({length: k}, (_, i) => ({a: lo + i * w, b: lo + (i + 1) * w, n: 0}));
  for (const v of values) bins[Math.min(k - 1, Math.floor((v - lo) / w))].n++;
  const top = Math.max(...bins.map(b => b.n)), bw = (W - L - R) / k, y = n => T + (1 - n / top) * (H - T - B);
  const mean = values.reduce((a, b) => a + b, 0) / values.length, mx = L + (mean - lo) / ((hi - lo) || 1) * (W - L - R);
  return (<div ref={box}><svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{display: "block"}}>
    {[0, Math.round(top / 2), top].map((t, i) => <g key={i}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#EEF0F6" strokeDasharray="4 4"/>
      <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={fs} fill={C.text3}>{t}</text></g>)}
    {bins.map((b, i) => <rect key={i} x={L + i * bw + 2} width={Math.max(1, bw - 4)} y={y(b.n)} height={H - B - y(b.n)} rx="3" fill="#5468FF" opacity=".8">
      <title>{btFmt(b.a, unit)} – {btFmt(b.b, unit)}: {b.n} day{b.n === 1 ? "" : "s"}</title></rect>)}
    <line x1={mx} x2={mx} y1={T - 6} y2={H - B} stroke={C.text1} strokeDasharray="4 3"/>
    <text x={Math.min(mx + 5, W - 90)} y={T - 8} fontSize={fs} fill={C.text1} fontWeight="600">avg {btFmt(mean, unit)}</text>
    {[0, Math.floor(k / 2), k].map(i => <text key={i} x={Math.min(W - R - 20, Math.max(L + 20, L + i * bw))} y={H - 12} textAnchor="middle" fontSize={fs} fill={C.text3}>{btFmt(lo + i * w, unit)}</text>)}
  </svg></div>);
}
function MxDelta({d, pts, lb, neu}) {
  if (d == null || !isFinite(d)) return <span style={{fontSize: 12, color: C.text3}}>—</span>;
  const good = lb ? d < 0 : d > 0, flat = Math.abs(d) < .05;
  const [bg, fg] = neu || flat ? ["#F1F2F8", "#7A80A6"] : good ? ["rgba(31,157,107,.1)", C.green] : ["rgba(214,69,69,.08)", C.red];
  return <span style={{fontSize: 12, fontWeight: 700, padding: "2px 7px", borderRadius: 6, background: bg, color: fg, whiteSpace: "nowrap"}}>{d >= 0 ? "▲" : "▼"} {Math.abs(d).toFixed(pts ? 1 : 2)}{pts ? " pts" : "%"}</span>;
}
function MetricsExplorer({allData, sections}) {
  const [range, setRange] = useState({p: "l90"});
  const [sel, setSel] = useState(() => { try { return localStorage.getItem("bt.metrics.sel") || ""; } catch { return ""; } });
  const [q, setQ] = useState(""), [gran, setGran] = useState("auto"), [navOpen, setNavOpen] = useState(false), [showDays, setShowDays] = useState(false);
  const idx = useMemo(() => dayIndex(allData), [allData]);
  const r = useMemo(() => resolveRange(range, idx), [range, idx]);
  const board = useMemo(() => buildKpiBoard(allData, r, sections), [allData, r, sections]);
  const has = useMemo(() => { const s = new Set(); for (const d of idx.values()) for (const k in d) if (typeof d[k] === "number" && isFinite(d[k])) s.add(k); return s; }, [idx]);
  const groups = [...GROUPS, ...board.extraGroups].map(g => ({...g, cards: (board.groups[g.id] || []).filter(c => !c.text && has.has(c.k))})).filter(g => g.cards.length);
  const all = groups.flatMap(g => g.cards);
  const c = all.find(x => x.id === sel) || all.find(x => x.k === "weight") || all[0];
  useEffect(() => { if (c) try { localStorage.setItem("bt.metrics.sel", c.id); } catch {} }, [c?.id]);
  if (!c) return <div style={{padding: 28, color: C.text3}}>No metrics yet. Sync your iPhone or import data first.</div>;

  // all numbers come from the shared engine, so the iPhone app shows exactly the same
  const det = metricDetail(idx, c, r, gran);
  // Same measure from several sources (DexaFit vs Apple Health…)
  const cmpKey = COMPARABLE.includes(c.k) ? c.k : (sections || []).flatMap(s => s.kpis).find(k => k.key === c.k)?.sameAs;
  const bySrc = cmpKey ? sourceCompare(idx, sections, cmpKey, SUMMARY_METRICS.find(m => m.key === cmpKey)?.unit || c.unit) : [];
  const g = det.g, perDay = det.perDay, buckets = det.buckets, vals = det.buckets.map(b => b.v), daily = det.daily, cmp = det.cmp, srcs = det.sources;
  const days = {length: det.days};
  const card = {background: "#fff", border: `1px solid ${C.bord}`, borderRadius: 12};
  const how = det.how;
  const ql = q.trim().toLowerCase();

  return (
    <div className="bt-mx" style={{display: "grid", gridTemplateColumns: "250px minmax(0,1fr)", minHeight: "100%", fontFamily: "'Inter',system-ui,sans-serif"}}>
      <div className={"bt-mxnav" + (navOpen ? " open" : "")} style={{borderRight: `1px solid ${C.bord}`, background: "#fff", padding: "16px 10px 30px", overflowY: "auto", maxHeight: "calc(100vh - 60px)", position: "sticky", top: 0}}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search metrics" className="bt-date" style={{width: "100%", marginTop: 0, marginBottom: 6}}/>
        {groups.map(gr => { const cs = gr.cards.filter(x => !ql || x.label.toLowerCase().includes(ql)); if (!cs.length) return null;
          return <div key={gr.id} style={{marginTop: 12}}>
            <div style={{fontSize: 10.5, fontWeight: 700, letterSpacing: ".08em", color: "#5468FF", padding: "0 8px 4px", textTransform: "uppercase"}}>{gr.name.replace(/^APPLE HEALTH · /, "")}</div>
            {cs.map(x => <button key={x.id} onClick={() => { setSel(x.id); setNavOpen(false); }}
              style={{display: "block", width: "100%", textAlign: "left", border: 0, borderRadius: 7, padding: "6px 10px", fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                background: x.id === c.id ? "#5468FF" : "transparent", color: x.id === c.id ? "#fff" : C.text2, fontWeight: x.id === c.id ? 600 : 400}}>{x.label}</button>)}
          </div>; })}
      </div>

      <div className="bt-pad" style={{padding: "18px 28px 40px", minWidth: 0}}>
        <div style={{display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap"}}>
          <button className="bt-btn bt-mxburger" onClick={() => setNavOpen(o => !o)}>☰ Metrics</button>
          <div style={{flex: 1, minWidth: 200}}>
            <div style={{fontFamily: "'Inter',system-ui,sans-serif", fontSize: 24, fontWeight: 700, color: C.text1, letterSpacing: "-.01em"}}>{c.label}</div>
            <div style={{fontSize: 12, color: C.text3}}>{SRC_NAME[c.src] || c.src}{c.apps?.length ? " · " + c.apps.join(", ") : ""}</div>
          </div>
          <select className="bt-date" style={{width: "auto", marginTop: 0}} value={range.p} onChange={e => setRange({p: e.target.value})}>
            {DK_PRESETS.filter(p => !["today", "yesterday"].includes(p[0])).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            <option value="all">All time</option></select>
        </div>

        <div style={{...card, padding: "20px 22px", marginTop: 16}}>
          <div style={{display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap"}}>
            <div style={{flex: 1}}>
              <div style={{fontSize: 12, fontWeight: 600, letterSpacing: ".06em", color: "#5468FF", textTransform: "uppercase"}}>{c.label} · {how}</div>
              <div style={{fontSize: 36, fontWeight: 800, color: C.text1, letterSpacing: "-.02em", marginTop: 4}}>{c.fmt}</div>
              <div style={{display: "flex", gap: 8, alignItems: "center", marginTop: 4, fontSize: 13, color: C.text3}}>
                <MxDelta d={c.delta} pts={c.pts} lb={c.lb} neu={c.neu}/> vs {r.cmpLbl} ({c.prevFmt}) · {fmtSpan(r.a, r.b)}</div>
            </div>
            <select className="bt-date" style={{width: "auto", marginTop: 0}} value={gran} onChange={e => setGran(e.target.value)}>
              <option value="auto">Auto</option><option value="days">Days</option><option value="weeks">Weeks</option><option value="months">Months</option></select>
          </div>
          <div style={{marginTop: 14}}><BtBigLine labels={buckets.map(b => b.label)} vals={vals} unit={c.unit}/></div>
          {perDay && <div style={{fontSize: 12, color: C.text3, marginTop: 4}}>Each point is the daily average for that {g === "weeks" ? "week" : "month"}.</div>}
        </div>

        {bySrc.length > 1 && <div style={{...card, marginTop: 16, padding: "16px 20px"}}>
          <div style={{fontSize: 12, fontWeight: 600, letterSpacing: ".06em", color: "#5468FF", textTransform: "uppercase"}}>By source · latest reading</div>
          <div style={{fontSize: 12.5, color: C.text3, margin: "4px 0 10px"}}>Different devices measure {(SUMMARY_METRICS.find(m => m.key === cmpKey)?.label || c.label).toLowerCase()} differently. Track each one's trend against itself; the gap shows how they compare.</div>
          {bySrc.map((o, i) => <div key={o.key} style={{display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 14, alignItems: "baseline", padding: "9px 0", borderTop: i ? `1px solid ${C.bord}` : "none"}}>
            <div style={{minWidth: 0}}>
              <div style={{fontSize: 14, fontWeight: 600, color: C.text1}}>{o.source}</div>
              <div style={{fontSize: 12, color: C.text3}}>{o.via !== o.source ? o.via + " · " : ""}{fmtDate(o.date)} · {o.readings} reading{o.readings === 1 ? "" : "s"}</div>
            </div>
            <div style={{fontSize: 20, fontWeight: 800, color: C.text1}}>{o.fmt}</div>
            <div style={{fontSize: 12, fontWeight: 600, color: C.text3, minWidth: 64, textAlign: "right"}}>{i ? o.diffFmt + " vs " + bySrc[0].source.split(",")[0] : "reference"}</div>
          </div>)}
        </div>}

        <div style={{...card, marginTop: 16, padding: "18px 10px"}}>
          <div className="bt-mxcmp" style={{display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", textAlign: "center"}}>
            {cmp.map(x => <div key={x.l} style={{padding: "4px 6px"}}>
              <div style={{fontSize: 13, color: C.text3}}>{x.l}</div>
              <div style={{fontSize: 24, fontWeight: 800, color: C.text1, margin: "6px 0"}}>{btFmt(x.v, c.unit)}</div>
              {x.l !== "Current" && <MxDelta d={x.d} pts={c.pts} lb={c.lb} neu={c.neu}/>}</div>)}
          </div>
          <div style={{fontSize: 12, color: C.text3, textAlign: "center", marginTop: 12}}>Current is the {how} for the 30 days ending {fmtDate(r.b)}; each column compares it with the same 30 days back then.</div>
        </div>

        <div style={{display: "grid", gap: 16, marginTop: 16}}>
          {c.mode !== "last" && <div style={{...card, padding: "16px 18px"}}>
            <div style={{fontWeight: 700, color: C.text1, fontSize: 15}}>{c.label} by day of week</div>
            <div style={{fontSize: 12, color: C.text3, margin: "2px 0 8px"}}>Your typical {c.mode === "sum" ? "daily total" : "value"} on each weekday, {fmtSpan(r.a, r.b)}. The darkest bar is your best day.</div>
            <MxWeekday labels={det.weekday.map(w => w.day)} vals={det.weekday.map(w => w.v)} unit={c.unit} lb={c.lb}/>
          </div>}
          <div style={{...card, padding: "16px 18px"}}>
            <div style={{fontWeight: 700, color: C.text1, fontSize: 15}}>Distribution</div>
            <div style={{fontSize: 12, color: C.text3, margin: "2px 0 8px"}}>How many days landed at each value ({daily.length} days)</div>
            <MxHistogram values={daily.map(p => p[1])} unit={c.unit}/>
          </div>
        </div>

        {srcs.length > 0 && <div style={{...card, marginTop: 16}}>
          <div style={{padding: "14px 18px", fontWeight: 700, color: C.text1, fontSize: 15, borderBottom: "1px solid #EEF0F6"}}>Sources</div>
          {srcs.map(([name, n]) => <div key={name} style={{display: "grid", gridTemplateColumns: "minmax(0,1fr) 90px minmax(80px,200px)", gap: 14, alignItems: "center", padding: "10px 18px", borderTop: "1px solid #F1F2F8", fontSize: 13}}>
            <span style={{fontWeight: 600, color: C.text1}}>{name}</span><span style={{color: C.text2, textAlign: "right"}}>{n} day{n === 1 ? "" : "s"}</span>
            <div style={{height: 6, background: "#EEF0FF", borderRadius: 3}}><div style={{height: 6, width: `${n / days.length * 100}%`, background: "#5468FF", borderRadius: 3}}/></div></div>)}
        </div>}

        <div style={{...card, marginTop: 16}}>
          <button onClick={() => setShowDays(v => !v)} style={{width: "100%", textAlign: "left", border: 0, background: "none", padding: "14px 18px", fontWeight: 700, color: C.text1, fontSize: 15, cursor: "pointer", fontFamily: "inherit", display: "flex"}}>
            <span style={{flex: 1}}>Daily values</span><span style={{color: C.text3, fontWeight: 400, fontSize: 13}}>{showDays ? "Hide" : `Show ${Math.min(daily.length, 60)} most recent`}</span></button>
          {showDays && [...daily].reverse().slice(0, 60).map(([s, v]) => <div key={s} style={{display: "flex", justifyContent: "space-between", padding: "8px 18px", borderTop: "1px solid #F1F2F8", fontSize: 13}}>
            <span style={{color: C.text2}}>{WD[new Date(s + "T12:00:00").getDay()].slice(0, 3)}, {fmtDate(s)}</span><span style={{fontWeight: 600, color: C.text1}}>{btFmt(v, c.unit)}</span></div>)}
        </div>
      </div>
    </div>);
}

function BtKpiDetail({c, r, rangeLbl, onBack}) {
  const [view, setView] = useState("trend");
  const nums = c.text ? [] : c.vals.filter(v => v != null);
  const tiles = c.text ? [] : [
    ["Period high", nums.length ? Math.max(...nums) : null],
    ["Period low", nums.length ? Math.min(...nums) : null],
    ["Average", nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null],
    ["Period total", c.mode === "sum" && nums.length ? nums.reduce((a, b) => a + b, 0) : null],
  ].filter(x => x[1] != null);
  const rows = [...c.curPts].reverse();
  const how = c.text ? "latest entry" : c.mode === "sum" ? "total for the range" : c.mode === "avg" ? "average of the days logged" : "latest reading in the range";
  return (
    <div style={{padding:"0 28px 24px",fontFamily:"'Inter',system-ui,sans-serif"}}>
      <button onClick={onBack} style={{border:0,background:"none",display:"flex",alignItems:"center",gap:"6px",color:"#4A4F6E",fontSize:"13px",cursor:"pointer",margin:"16px 0 12px",padding:0,fontFamily:"inherit"}}><IcBack/> All KPIs</button>
      <div className="bt-card" style={{padding:"20px 22px"}}>
        <div className="bt-eyebrow">{c.label}</div>
        <div style={{display:"flex",alignItems:"baseline",gap:"10px",marginTop:"6px",flexWrap:"wrap"}}>
          <span className="bt-num" style={{fontSize:"38px",lineHeight:1.1,color:C.text1}}>{c.fmt}</span>
          {c.delta != null && <BtDelta d={c.delta} pts={c.pts} lb={c.lb} neu={c.neu}/>}
        </div>
        <div style={{fontSize:"12.5px",color:C.text3,marginTop:"2px"}}>{c.sub}{c.delta != null ? ` · vs ${r.cmpLbl} (${c.prevFmt})` : ""}</div>
        <div style={{fontSize:"12px",color:C.text3,marginTop:"4px"}}>Source: {c.apps?.length ? c.apps.join(", ") + " (via Apple Health)" : SRC_NAME[c.src] || c.src} · {how} · {rangeLbl}</div>
        {!c.text && <div style={{display:"flex",gap:"6px",marginTop:"14px"}}>
          {[["trend","Trend"],["bars","Bars"],["hist","Histogram"]].map(([k, l]) => (
            <button key={k} className="bt-btn" onClick={() => setView(k)}
              style={{height:"30px",fontSize:"12.5px",...(view === k ? {background:C.text1,borderColor:C.text1,color:"#fff"} : {})}}>{l}</button>))}
        </div>}
        {!c.text && <div style={{marginTop:"10px"}}>
          {view === "trend" ? <BtBigChart labels={c.labels} vals={c.vals} unit={c.unit}/>
            : view === "bars" ? <BtBars labels={c.labels} vals={c.vals} unit={c.unit}/>
            : <BtHistogram values={c.curPts.map(p => p[1])} unit={c.unit}/>}
        </div>}
      </div>
      {tiles.length > 0 && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:"12px",marginTop:"12px"}}>
          {tiles.map(([l, v]) => (
            <div key={l} className="bt-card" style={{padding:"12px 14px",borderRadius:"12px"}}>
              <div className="bt-eyebrow">{l}</div>
              <div className="bt-num" style={{fontSize:"22px",marginTop:"4px",color:C.text1}}>{btFmt(v, c.unit)}</div>
            </div>
          ))}
        </div>
      )}
      <div className="bt-card" style={{marginTop:"12px",overflow:"hidden"}}>
        <div style={{padding:"14px 18px",borderBottom:"1px solid #EEF0F6"}}>
          <div className="bt-eyebrow" style={{color:C.text1}}>History · {c.label}</div>
          <div style={{fontSize:"12px",color:C.text3,marginTop:"2px"}}>Newest first · {rows.length} day{rows.length === 1 ? "" : "s"} logged · {rangeLbl}</div>
        </div>
        {!rows.length ? <div style={{padding:"18px",fontSize:"13px",color:C.text3}}>No entries in this range.</div> : (
          <div style={{maxHeight:"520px",overflowY:"auto"}}>
            {rows.map(([s, v], i) => {
              const nxt = rows[i + 1]?.[1];
              const chg = typeof v === "number" && typeof nxt === "number" ? v - nxt : null;
              const good = chg != null && (c.lb ? chg < 0 : chg > 0), bad = chg != null && (c.lb ? chg > 0 : chg < 0);
              return (
                <div key={s} style={{display:"grid",gridTemplateColumns:"minmax(120px,1fr) minmax(90px,1fr) 110px",alignItems:"center",gap:"10px",padding:"9px 18px",borderBottom:"1px solid #EEF0F6"}}>
                  <span style={{fontSize:"13px",color:C.text2}}>{new Date(s + "T12:00:00").toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}</span>
                  <span className="bt-num" style={{fontSize:"15px",color:C.text1}}>{typeof v === "number" ? btFmt(v, c.unit) : String(v)}</span>
                  <span style={{fontSize:"11.5px",fontWeight:600,textAlign:"right",color:good?C.green:bad?C.red:C.text3}}>{chg == null ? "" : Math.abs(chg) < 0.05 ? "no change" : `${chg > 0 ? "+" : "−"}${btFmt(Math.abs(chg), c.unit)}`}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ASK AI: chat with Claude about the whole health history (server /ask, streamed) ───
const ASK_STARTERS = [
  "What's the single biggest thing holding back my body composition right now?",
  "How has my sleep, HRV and resting heart rate trended this year, and what's driving it?",
  "Create a Bloodwork section that tracks LDL, HbA1c, testosterone and vitamin D from my lab results.",
  "Which habits in my data line up with my best recovery days?",
  "Compare this month to my best month ever. What was different?",
  "Build me a metric for protein per pound of body weight, and alert me when my 7-day resting heart rate goes above 60.",
  "Set a goal to reach 15% body fat by June and tell me if I'm on track.",
];
function mdHtml(t) { return { __html: DOMPurify.sanitize(marked.parse(t || "", { gfm: true, breaks: true })) }; }
function AskAI({apiURL, apiSecret, onSections}) {
  const [msgs, setMsgs] = useState(() => { try { return JSON.parse(localStorage.getItem("bt.ask.history")) || []; } catch { return []; } });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [file, setFile] = useState(null), [fileErr, setFileErr] = useState("");
  const endRef = useRef(null), abortRef = useRef(null), attachRef = useRef(null);
  useEffect(() => { try { localStorage.setItem("bt.ask.history", JSON.stringify(msgs.slice(-40))); } catch {} }, [msgs]);
  useEffect(() => { endRef.current?.scrollIntoView({block: "end"}); }, [msgs, status]);
  // Weekly review (written Sunday evenings; or on demand)
  const [review, setReview] = useState(null), [revBusy, setRevBusy] = useState(false), [revErr, setRevErr] = useState(""), [revOpen, setRevOpen] = useState(true);
  const apiBase = (apiURL || "").replace(/\/sync\/?$/, "");
  useEffect(() => { fetch(`${apiBase}/reviews`, {headers: {"x-api-secret": apiSecret}}).then(r => r.ok ? r.json() : null).then(j => j && setReview(j.reviews?.[0] || false)).catch(() => {}); }, [apiBase]);
  const runReview = async () => {
    setRevBusy(true); setRevErr("");
    try { const r = await fetch(`${apiBase}/reviews/run`, {method: "POST", headers: {"Content-Type": "application/json", "x-api-secret": apiSecret}, body: JSON.stringify({force: !!review})});
      const j = await r.json(); if (!r.ok) throw new Error(j.error || `Error ${r.status}`); setReview(j.review); setRevOpen(true); }
    catch (e) { setRevErr(e.message); }
    setRevBusy(false);
  };

  const ask = async (text) => {
    const att = text == null ? file : null;
    const q = (text ?? draft).trim() || (att ? `Here's my ${att.filename}. Add it to the right KPI section (create one if needed) and tell me the key results.` : ""); if (!q || busy) return;
    const convo = [...msgs, {role: "user", content: q, ...(att ? {file: att.filename} : {})}];
    setMsgs([...convo, {role: "assistant", content: ""}]); setDraft(""); setFile(null); setBusy(true); setStatus(att ? `Reading ${att.filename}…` : "Reading your data…");
    const ctrl = new AbortController(); abortRef.current = ctrl;
    let answer = "";
    const put = (t, err) => setMsgs(m => { const n = [...m]; n[n.length - 1] = {...n[n.length - 1], role: "assistant", content: t, error: err}; return n; });
    const addCard = (c) => setMsgs(m => { const n = [...m], last = n[n.length - 1]; n[n.length - 1] = {...last, cards: [...(last.cards || []), c]}; return n; });
    try {
      const r = await fetch(`${(apiURL || "").replace(/\/sync\/?$/, "")}/ask`, {method: "POST", signal: ctrl.signal,
        headers: {"Content-Type": "application/json", "x-api-secret": apiSecret}, body: JSON.stringify({messages: convo.map(({role, content}) => ({role, content})), ...(att ? {attachment: att} : {})})});
      if (!r.ok || !r.body) throw new Error(r.status === 401 ? "Access key rejected." : `Server error ${r.status}`);
      const reader = r.body.getReader(), dec = new TextDecoder(); let buf = "";
      for (;;) {
        const {value, done} = await reader.read(); if (done) break;
        buf += dec.decode(value, {stream: true});
        let i; while ((i = buf.indexOf("\n\n")) >= 0) {
          const line = buf.slice(0, i).replace(/^data: /, ""); buf = buf.slice(i + 2);
          let ev; try { ev = JSON.parse(line); } catch { continue; }
          if (ev.type === "text") { answer += ev.text; setStatus(""); put(answer); }
          else if (ev.type === "status") setStatus(ev.text);
          else if (ev.type === "sections") onSections?.();
          else if (ev.type === "change" || ev.type === "approve") { addCard({kind: ev.type, id: ev.id, summary: ev.summary}); onSections?.(); }
          else if (ev.type === "error") { answer += (answer ? "\n\n" : "") + "⚠ " + ev.text; put(answer, true); if (ev.code === "credits_needed") addCard({kind: "credits", id: "credits", summary: ""}); }
        }
      }
    } catch (e) { if (e.name !== "AbortError") { answer += (answer ? "\n\n" : "") + "⚠ " + e.message; put(answer, true); } }
    setBusy(false); setStatus("");
  };

  const card = {background: "#fff", border: `1px solid ${C.bord}`, borderRadius: "12px"};
  // Undo a change the agent made / approve a removal it proposed
  const act = async (mi, c, what) => {
    const base = (apiURL || "").replace(/\/sync\/?$/, ""), H = {"Content-Type": "application/json", "x-api-secret": apiSecret};
    const set = (patch) => setMsgs(m => m.map((x, i) => i !== mi ? x : {...x, cards: x.cards.map(y => y.id === c.id ? {...y, ...patch} : y)}));
    set({busy: true});
    try {
      if (what === "credits") {
        const r = await fetch(`${base}/usage/request-credits`, {method: "POST", headers: H, body: "{}"}); const j = await r.json();
        return set({busy: false, state: j.message || "Request sent."});
      }
      const r = await fetch(`${base}/builder/${what === "undo" ? "undo" : "approve"}/${c.id}`, {method: "POST", headers: H, body: JSON.stringify(what === "deny" ? {deny: true} : {})});
      const j = await r.json(); if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
      set({busy: false, state: what === "undo" ? "undone" : what === "deny" ? "cancelled" : "approved", undoId: j.change_id});
      onSections?.();
    } catch (e) { set({busy: false, err: e.message}); }
  };
  const Cards = ({m, mi}) => !m.cards?.length ? null : (
    <div style={{display: "flex", flexDirection: "column", gap: "6px", marginTop: m.content ? "12px" : 0}}>
      {m.cards.map(c => c.kind === "credits" ? (
        <div key={c.id} style={{display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "9px", fontSize: "12.5px", background: "rgba(20,150,140,.07)", border: "1px solid rgba(20,150,140,.3)"}}>
          <span style={{flex: 1, color: C.text1}}>{c.state || "Need more AI this month? Credits are coming soon; tell us and we'll top you up."}</span>
          {!c.state && <button className="bt-btn" disabled={c.busy} onClick={() => act(mi, c, "credits")} style={{padding: "2px 10px", fontSize: "12px", background: C.teal, borderColor: C.teal, color: "#fff"}}>Add credits</button>}
        </div>
      ) : (
        <div key={c.id} style={{display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "9px", fontSize: "12.5px",
          background: c.kind === "approve" && !c.state ? "rgba(232,163,23,.08)" : "#F6F8FB", border: `1px solid ${c.kind === "approve" && !c.state ? "rgba(232,163,23,.35)" : C.bord}`}}>
          <span style={{flex: 1, color: C.text1}}>{c.kind === "approve" && !c.state ? "Needs your OK: " : c.state === "undone" ? "↶ Undone: " : "✓ "}{c.summary}{c.err && <span style={{color: C.red}}> · {c.err}</span>}</span>
          {c.kind === "change" && !c.state && <button className="bt-btn" disabled={c.busy} onClick={() => act(mi, c, "undo")} style={{padding: "2px 10px", fontSize: "12px"}}>Undo</button>}
          {c.kind === "approve" && !c.state && <>
            <button className="bt-btn" disabled={c.busy} onClick={() => act(mi, c, "approve")} style={{padding: "2px 10px", fontSize: "12px", background: C.teal, borderColor: C.teal, color: "#fff"}}>Approve</button>
            <button className="bt-btn" disabled={c.busy} onClick={() => act(mi, c, "deny")} style={{padding: "2px 10px", fontSize: "12px"}}>Cancel</button></>}
          {c.state === "approved" && <span style={{color: C.text3}}>Done</span>}
          {c.state === "cancelled" && <span style={{color: C.text3}}>Cancelled</span>}
        </div>))}
    </div>);
  return (
    <div style={{padding: "18px 28px 28px", maxWidth: "900px", margin: "0 auto", fontFamily: "'Inter',system-ui,sans-serif", display: "flex", flexDirection: "column", gap: "14px"}}>
      <div style={{display: "flex", alignItems: "flex-end", gap: "12px"}}>
        <div style={{flex: 1}}>
          <div style={{fontFamily: "'Inter',system-ui,sans-serif", fontSize: "18px", fontWeight: 700, color: C.text1}}>Ask AI</div>
          <div style={{fontSize: "12.5px", color: C.text3, marginTop: "2px"}}>Ask anything about your health. Claude reads your full history (every Apple Health metric back to 2015, nutrition, training, body scans) and current research before answering.</div>
        </div>
        {msgs.length > 0 && <button className="bt-btn" disabled={busy} onClick={() => setMsgs([])}>New chat</button>}
      </div>

      {msgs.length === 0 && review !== null && (
        <div style={{...card, padding: "16px 20px", borderColor: "rgba(20,150,140,.3)"}}>
          <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <div style={{flex: 1, fontSize: "14px", fontWeight: 700, color: C.text1, cursor: review ? "pointer" : "default"}} onClick={() => setRevOpen(o => !o)}>
              Weekly review {review && <span style={{fontWeight: 500, color: C.text3, fontSize: "12.5px"}}>· {fmtDate(review.week)} – {fmtDate(review.end)}</span>}</div>
            <button className="bt-btn" disabled={revBusy} onClick={runReview} style={{padding: "2px 10px", fontSize: "12px"}}>{revBusy ? "Writing… (about a minute)" : review ? "Rewrite" : "Write my review"}</button>
          </div>
          {revErr && <div style={{fontSize: "12.5px", color: C.red, marginTop: "6px"}}>⚠ {revErr}</div>}
          {!review && !revErr && <div style={{fontSize: "12.5px", color: C.text3, marginTop: "4px"}}>Every Sunday evening: your week vs the 4 weeks before, what to watch, and 3 actions for next week.</div>}
          {review && revOpen && <div className="bt-md" style={{marginTop: "8px"}} dangerouslySetInnerHTML={mdHtml(review.text)}/>}
        </div>
      )}
      {msgs.length === 0 && (
        <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(260px,100%),1fr))", gap: "10px"}}>
          {ASK_STARTERS.map(q => <button key={q} onClick={() => ask(q)} className="bt-menuitem"
            style={{...card, padding: "14px 16px", textAlign: "left", fontSize: "13.5px", color: C.text1, lineHeight: 1.45, cursor: "pointer", alignItems: "flex-start"}}>{q}</button>)}
        </div>
      )}

      {msgs.map((m, i) => m.role === "user"
        ? <div key={i} style={{alignSelf: "flex-end", maxWidth: "80%", background: C.text1, color: "#fff", borderRadius: "14px 14px 4px 14px", padding: "10px 14px", fontSize: "14px", lineHeight: 1.5, whiteSpace: "pre-wrap"}}>
            {m.file && <div style={{fontSize: "12px", opacity: .75, marginBottom: "4px"}}>📎 {m.file}</div>}{m.content}</div>
        : <div key={i} style={{...card, padding: "16px 20px", borderColor: m.error ? "rgba(214,69,69,.35)" : C.bord}}>
            {m.content ? <div className="bt-md" dangerouslySetInnerHTML={mdHtml(m.content)}/>
              : !m.cards?.length && <div style={{fontSize: "13px", color: C.text3}}>{status || "Thinking…"}</div>}
            <Cards m={m} mi={i}/>
            {busy && i === msgs.length - 1 && m.content && status && <div style={{fontSize: "12px", color: C.text3, marginTop: "8px"}}>{status}</div>}
          </div>)}
      <div ref={endRef}/>

      {(file || fileErr) && <div style={{alignSelf: "flex-start", fontSize: "12.5px", display: "flex", gap: "8px", alignItems: "center", color: fileErr ? C.red : C.text2}}>
        {fileErr ? "⚠ " + fileErr : <>📎 {file.filename} <button type="button" onClick={() => setFile(null)} style={{border: 0, background: "none", color: C.text3, cursor: "pointer", fontFamily: "inherit"}}>Remove</button></>}</div>}
      <form onSubmit={e => { e.preventDefault(); ask(); }} style={{...card, display: "flex", gap: "8px", padding: "8px", position: "sticky", bottom: "8px", boxShadow: "0 6px 24px rgba(0,0,0,.06)"}}>
        <input ref={attachRef} type="file" accept={UPLOAD_ACCEPT} style={{display: "none"}} onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
          try { setFile(await readUpload(f)); setFileErr(""); } catch (err) { setFile(null); setFileErr(err.message); } }}/>
        <button type="button" className="bt-btn" title="Attach a report, screenshot or CSV" disabled={busy} onClick={() => attachRef.current?.click()} style={{alignSelf: "flex-end", padding: "0 10px"}}>📎</button>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2} placeholder="Ask about your health, or attach a DEXA / lab report with 📎…"
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
          style={{flex: 1, border: 0, outline: 0, resize: "none", font: "14px/1.5 inherit", fontFamily: "inherit", padding: "6px 8px", color: C.text1, background: "transparent"}}/>
        {busy ? <button type="button" className="bt-btn" onClick={() => abortRef.current?.abort()}>Stop</button>
          : <button type="submit" className="bt-btn" disabled={!draft.trim() && !file} style={{background: C.teal, borderColor: C.teal, color: "#fff", alignSelf: "flex-end"}}>Ask</button>}
      </form>
    </div>
  );
}

// ─── AUTOMATIONS: what feeds BodyData, file imports, and export reminders ───
const REMINDER_PRESETS = [
  {app: "Fitbod", openURL: "fitbod://", note: "Sets, reps and weights. In Fitbod: Log → ⋯ → Export workout data → Share → BodyData."},
  {app: "MyFitnessPal", openURL: "mfp://", note: "Only needed if nutrition stops showing up. In MyFitnessPal: More → Settings → Export data."},
  {app: "Hume", openURL: "", note: "Segmental body scans. Export the scan CSV and share it to BodyData."},
];
const WEEKDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
// PDFs and images go up as base64 (AI reads them); CSV/JSON/text as text
const DOC_RE = /\.(pdf|png|jpe?g|webp|gif)$/i;
const readUpload = (f) => new Promise((res, rej) => {
  const r = new FileReader(); r.onerror = () => rej(new Error("Couldn't read the file"));
  if (DOC_RE.test(f.name) || /^(application\/pdf|image\/)/.test(f.type)) {
    if (f.size > 15e6) return rej(new Error("That file is over 15 MB. Export a smaller PDF or a screenshot."));
    if (/heic|heif/i.test(f.type + f.name)) return rej(new Error("HEIC photos aren't supported. Take a screenshot (PNG) instead."));
    r.onload = () => res({filename: f.name, mediaType: f.type || (/\.pdf$/i.test(f.name) ? "application/pdf" : "image/png"), data: String(r.result).split(",")[1]});
    r.readAsDataURL(f);
  } else { r.onload = () => res({filename: f.name, text: String(r.result)}); r.readAsText(f); }
});
// Long uploads run as background jobs on the server: post with async, then poll until done
async function postJob(url, H, body, onWait) {
  const r = await fetch(url, {method: "POST", headers: {...H, "Content-Type": "application/json"}, body: JSON.stringify({...body, async: true})});
  const j = await r.json(); if (!r.ok) throw new Error(j.error || `Server error ${r.status}`);
  if (!j.job) return j;
  const base = url.replace(/\/sections\/.*$/, "");
  for (let t = 0; t < 600; t++) {   // up to 10 minutes
    await new Promise(res => setTimeout(res, t < 10 ? 1500 : 3000));
    const q = await fetch(`${base}/jobs/${j.job}`, {headers: H}).then(x => x.json()).catch(() => null);
    if (q?.status === "done") return q.result;
    if (q?.status === "failed") throw new Error(q.error || "Import failed");
    onWait?.(t);
  }
  throw new Error("Still working on it. Check back in a few minutes.");
}
const UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.csv,.tsv,.txt,.json,application/pdf,image/*,text/csv,application/json";
const SEC_TYPE_LABEL = {existing: "Existing metrics", manual: "File upload", api: "API", mcp: "MCP server", agent: "BodyData Agent", derived: "Calculated"};
// One-tap OAuth connections (Withings, WHOOP): sign in at the service, data syncs hourly
function ConnectionsCard({base, H, onSections, onData, card, h2}) {
  const [list, setList] = useState(null), [busy, setBusy] = useState(""), [msg, setMsg] = useState(() => {
    const q = new URLSearchParams(window.location.search); if (!q.get("connected")) return null;
    const m = {ok: q.get("ok") === "1", text: q.get("msg") || ""}; window.history.replaceState(null, "", window.location.pathname); return m; });
  const load = () => fetch(`${base}/connect`, {headers: H}).then(r => r.ok ? r.json() : null).then(j => j && setList(j.providers)).catch(() => {});
  useEffect(() => { load(); if (msg?.ok) { onSections?.(); onData?.(); } }, [base]);
  const post = async (p, path, body, label) => {
    setBusy(p + path); setMsg(null);
    try {
      const r = await fetch(`${base}/connect/${p}/${path}`, {method: "POST", headers: {...H, "Content-Type": "application/json"}, body: JSON.stringify(body || {})});
      const j = await r.json(); if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
      if (path === "start") { window.location.href = j.url; return; }
      setMsg({ok: true, text: label(j)}); load(); onSections?.(); onData?.();
    } catch (e) { setMsg({ok: false, text: e.message}); }
    setBusy("");
  };
  if (!list) return null;
  const small = {padding: "3px 10px", fontSize: "12px"};
  return (
    <div style={card}>
      <div style={h2}>Connected services</div>
      <div style={{fontSize: "12.5px", color: C.text3, margin: "2px 0 8px"}}>Sign in once at the service. BodyData pulls new data every hour; your password never reaches BodyData.</div>
      {msg && <div style={{fontSize: "12.5px", color: msg.ok ? C.green : C.red, marginBottom: "6px"}}>{msg.ok ? "✓ " : "⚠ "}{msg.text}</div>}
      {list.map(p => (
        <div key={p.id} style={{display: "flex", alignItems: "center", gap: "10px", padding: "10px 0", borderTop: "1px solid #EEF0F6", flexWrap: "wrap"}}>
          <div style={{flex: "1 1 240px"}}>
            <div style={{fontSize: "13.5px", fontWeight: 600, color: C.text1}}>{p.name} {p.connected && <span style={{fontSize: "11.5px", fontWeight: 500, color: p.error ? C.red : C.green}}>· {p.error ? "needs attention" : "connected"}</span>}</div>
            <div style={{fontSize: "12px", color: C.text3}}>{p.error || (p.connected ? `Last sync ${p.lastSync ? new Date(p.lastSync).toLocaleString("en-US", {month: "short", day: "numeric", hour: "numeric", minute: "2-digit"}) : "pending"}${p.newest ? ` · data through ${fmtDate(p.newest)}` : ""}` : p.about)}</div>
            {p.connected && p.ai === "optin" && <label style={{fontSize: "12px", color: C.text2, display: "flex", gap: "6px", alignItems: "center", marginTop: "4px"}}>
              <input type="checkbox" checked={p.aiAllowed} onChange={e => post(p.id, "ai", {allow: e.target.checked}, j => j.aiAllowed ? `Ask AI can now read your ${p.name} data.` : `Ask AI won't read your ${p.name} data.`)}/>
              Let Ask AI read my {p.name} data ({p.name}'s terms need your OK; it's never used to train AI)</label>}
          </div>
          {!p.available ? <span style={{fontSize: "12px", color: C.text3}}>Coming soon</span>
            : !p.connected || p.error ? <button className="bt-btn" disabled={!!busy} style={{...small, background: C.teal, borderColor: C.teal, color: "#fff"}} onClick={() => post(p.id, "start", {}, () => "")}>{p.connected ? "Reconnect" : "Connect"}</button>
            : <>
              <button className="bt-btn" disabled={!!busy} style={small} onClick={() => post(p.id, "sync", {}, j => `${p.name}: ${j.stored} day${j.stored === 1 ? "" : "s"} updated.`)}>{busy === p.id + "sync" ? "Syncing…" : "Sync now"}</button>
              <button className="bt-btn" disabled={!!busy} style={small} onClick={() => { if (confirm(`Disconnect ${p.name}? Data already imported stays.`)) post(p.id, "disconnect", {}, () => `${p.name} disconnected.`); }}>Disconnect</button>
            </>}
        </div>))}
    </div>
  );
}
// Goals, alerts and the agent's change log (each change can be undone)
function BuilderCard({base, H, sections, onSections, card, h2}) {
  const [st, setSt] = useState(null), [err, setErr] = useState("");
  const load = () => fetch(`${base}/builder/state`, {headers: H}).then(r => r.ok ? r.json() : null).then(j => j && setSt(j)).catch(() => {});
  useEffect(() => { load(); }, [base, sections]);
  const post = async (path, body) => {
    setErr("");
    try { const r = await fetch(`${base}${path}`, {method: "POST", headers: {...H, "Content-Type": "application/json"}, body: JSON.stringify(body || {})});
      const j = await r.json(); if (!r.ok) throw new Error(j.error || `Error ${r.status}`); load(); onSections?.(); }
    catch (e) { setErr(e.message); }
  };
  if (!st || (!st.goals.length && !st.alerts.length && !st.changes.length && !st.pending.length)) return null;
  const row = {display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderTop: "1px solid #EEF0F6", fontSize: "13px"};
  const small = {padding: "2px 10px", fontSize: "12px"};
  return (
    <div style={card}>
      <div style={h2}>Goals, alerts &amp; changes</div>
      <div style={{fontSize: "12.5px", color: C.text3, margin: "2px 0 8px"}}>Ask AI builds these for you. Every change can be undone.</div>
      {err && <div style={{fontSize: "12.5px", color: C.red}}>⚠ {err}</div>}
      {st.pending.map(p => <div key={p.id} style={row}><span style={{flex: 1}}>Needs your OK: {p.summary}</span>
        <button className="bt-btn" style={{...small, background: C.teal, borderColor: C.teal, color: "#fff"}} onClick={() => post(`/builder/approve/${p.id}`)}>Approve</button>
        <button className="bt-btn" style={small} onClick={() => post(`/builder/approve/${p.id}`, {deny: true})}>Cancel</button></div>)}
      {st.goals.map(g => <div key={g.id} style={row}>
        <span style={{flex: 1}}><b style={{fontWeight: 600}}>{g.label}</b> <span style={{color: C.text3}}>· now {g.current ? btFmt(g.current.value) : "no data"} → {btFmt(g.target)}{g.by ? ` by ${fmtDate(g.by)}` : ""}</span></span>
        <span style={{width: "90px", height: "6px", borderRadius: "3px", background: "#EEF0F6", overflow: "hidden"}}><span style={{display: "block", height: "100%", width: `${g.progress || 0}%`, background: g.onTrack === false ? C.red : C.teal}}/></span>
        <span style={{fontSize: "12px", width: "86px", color: g.reached ? C.green : g.onTrack === false ? C.red : C.text3}}>{g.reached ? "Reached" : g.onTrack === false ? "Off track" : g.onTrack ? "On track" : `${g.progress || 0}%`}</span>
        <button className="bt-btn" style={small} onClick={() => post(`/builder/goal/${g.id}/delete`)}>Remove</button></div>)}
      {st.alerts.map(a => <div key={a.id} style={row}>
        <span style={{flex: 1}}><b style={{fontWeight: 600}}>{a.label}</b> <span style={{color: C.text3}}>· {a.basis === "avg7" ? "7-day avg" : "daily"} {a.op} {btFmt(a.value)} · now {a.current ? btFmt(a.current.value) : "no data"}</span></span>
        {a.triggered && <span style={{fontSize: "12px", color: C.red}}>Triggered</span>}
        <button className="bt-btn" style={small} onClick={() => post(`/builder/alert/${a.id}/delete`)}>Remove</button></div>)}
      {st.changes.length > 0 && <details style={{marginTop: "8px"}}><summary style={{fontSize: "12.5px", color: C.text2, cursor: "pointer"}}>Recent changes ({st.changes.length})</summary>
        {st.changes.map(c => <div key={c.id} style={row}><span style={{flex: 1, color: c.undone ? C.text3 : C.text1, textDecoration: c.undone ? "line-through" : "none"}}>{c.summary}</span>
          <span style={{fontSize: "12px", color: C.text3}}>{new Date(c.at).toLocaleDateString("en-US", {month: "short", day: "numeric"})}</span>
          {!c.undone && <button className="bt-btn" style={small} onClick={() => post(`/builder/undo/${c.id}`)}>Undo</button>}</div>)}
      </details>}
    </div>
  );
}
function SectionsCard({base, H, sections, onSections, onData, card, h2}) {
  const [open, setOpen] = useState(null), [token, setToken] = useState(""), [msg, setMsg] = useState({}), [busy, setBusy] = useState("");
  const fileRefs = useRef({}), newRef = useRef();
  const [newMsg, setNewMsg] = useState(null);
  const [templates, setTemplates] = useState([]);
  useEffect(() => { fetch(`${base}/sections/templates`, {headers: H}).then(r => r.ok ? r.json() : null).then(j => j && setTemplates(j.templates)).catch(() => {}); }, [base]);
  const fromTemplate = async (id) => {
    if (!id) return; setBusy("new"); setNewMsg({text: "Setting it up…"});
    try {
      const r = await fetch(`${base}/sections/from-template`, {method: "POST", headers: {...H, "Content-Type": "application/json"}, body: JSON.stringify({id})});
      const j = await r.json(); if (!r.ok) throw new Error(j.error || `Server error ${r.status}`);
      const t = templates.find(x => x.id === id);
      setNewMsg({ok: true, text: j.existed ? `“${j.section.name}” already exists.` : `Added “${j.section.name}”. ${t?.type === "agent" ? "Open Agent setup below to sign in once; it then runs on schedule." : "Upload or share a report to fill it in."}`}); onSections?.();
    } catch (e) { setNewMsg({ok: false, text: e.message}); }
    setBusy("");
  };
  // One or many reports at once (e.g. DEXA + RMR + VO2 PDFs): each is routed to the matching section, or a new one
  const fromFiles = async (list) => {
    const files = [...(list || [])]; if (!files.length) return; setBusy("new");
    const done = [];
    for (const [i, f] of files.entries()) {
      setNewMsg({text: `Reading ${f.name}${files.length > 1 ? ` (${i + 1} of ${files.length})` : ""}… reports take 20–60 seconds each`});
      try {
        const j = await postJob(`${base}/sections/from-file`, H, await readUpload(f));
        done.push(j.existed ? `Added to “${j.name}”${j.added ? ` (+${j.added} new KPI${j.added === 1 ? "" : "s"})` : ""}` : `Created “${j.name}” with ${j.kpis} KPIs`);
        onSections?.(); onData?.();
      } catch (e) { done.push(`⚠ ${f.name}: ${e.message}`); }
    }
    setNewMsg({ok: !done.some(d => d.startsWith("⚠")), text: done.join(" · ") + ". It's on your KPI board now."});
    setBusy("");
  };
  const [drag, setDrag] = useState(false);
  const call = async (id, path, body, label) => {
    setBusy(id + path); setMsg(m => ({...m, [id]: {text: label + "…"}}));
    try {
      let j;
      if (path === "import") j = await postJob(`${base}/sections/${id}/import`, H, body || {});
      else { const r = await fetch(`${base}/sections/${id}/${path}`, {method: "POST", headers: {...H, "Content-Type": "application/json"}, body: JSON.stringify(body || {})});
        j = await r.json(); if (!r.ok) throw new Error(j.error || `Server error ${r.status}`); }
      setMsg(m => ({...m, [id]: {ok: true, text: path === "secret" ? "Token saved." : path === "delete" ? "Deleted." : `${j.stored} date${j.stored === 1 ? "" : "s"} updated${j.added ? `, ${j.added} new KPI${j.added === 1 ? "" : "s"}` : ""}${j.newest ? ` · latest ${fmtDate(j.newest)}` : ""}.`}}));
      if (path !== "secret") onData?.();
      onSections?.();
    } catch (e) { setMsg(m => ({...m, [id]: {ok: false, text: e.message}})); }
    setBusy("");
  };
  const tag = {fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", background: "#F1F2F8", color: C.text2, whiteSpace: "nowrap"};
  return (
    <div style={{...card, ...(drag ? {outline: `2px dashed ${C.teal}`, outlineOffset: "-6px"} : {})}}
      onDragOver={e => { if (e.dataTransfer?.types?.includes("Files")) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); if (!busy) fromFiles(e.dataTransfer.files); }}>
      <div style={{display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap"}}>
        <div style={{...h2, flex: 1}}>Custom KPI sections</div>
        <input ref={newRef} type="file" multiple accept={UPLOAD_ACCEPT} style={{display: "none"}} onChange={e => { const fs = [...(e.target.files || [])]; e.target.value = ""; fromFiles(fs); }}/>
        {templates.length > 0 && <select className="bt-date" style={{width: "auto", marginTop: 0}} value="" disabled={!!busy} onChange={e => fromTemplate(e.target.value)}>
          <option value="">+ Add an app…</option>
          {templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.type === "agent" ? " (agent)" : ""}</option>)}
        </select>}
        <button className="bt-btn" disabled={!!busy} onClick={() => newRef.current?.click()} style={{background: C.teal, borderColor: C.teal, color: "#fff"}}>{busy === "new" ? "Reading…" : "Upload reports"}</button>
      </div>
      <div style={{fontSize: "12.5px", color: C.text3, margin: "4px 0 12px", lineHeight: 1.5}}>
        Drag in or upload one or more reports: DEXA scans, RMR and VO2 max tests, Function Health or other lab PDFs, InBody printouts, screenshots or CSVs. AI creates a KPI for every result and fills in each date it finds. Next time, just upload the new report: it's added to the matching section automatically so you can track it over time. You can also attach reports in Ask AI, or ask it to connect an app's API, MCP server or the BodyData Agent.
      </div>
      {newMsg && <div style={{fontSize: "12.5px", fontWeight: 600, marginBottom: "10px", color: newMsg.ok === false ? C.red : newMsg.ok ? C.green : C.text3}}>{newMsg.ok === false ? "⚠ " : newMsg.ok ? "✓ " : ""}{newMsg.text}</div>}
      {!sections.length && <div style={{fontSize: "13px", color: C.text3}}>No custom sections yet.</div>}
      {sections.map((s, i) => {
        const t = s.source?.type, m = msg[s.id], st = s.lastStatus;
        return (
          <div key={s.id} style={{padding: "12px 0", borderTop: i ? "1px solid #EEF0F6" : 0}}>
            <div style={{display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap"}}>
              <div style={{fontWeight: 700, fontSize: "14px", color: C.text1, flex: "1 1 160px"}}>{s.name}{s.source?.app && <span style={{fontWeight: 400, color: C.text3}}> · {s.source.app}</span>}</div>
              <span style={tag}>{SEC_TYPE_LABEL[t] || t}</span>
              {s.schedule !== "none" && <span style={tag}>{s.schedule}</span>}
              {(t === "api" || t === "mcp") && <span style={{...tag, background: s.connected ? "rgba(31,157,107,.1)" : "#FFF6E5", color: s.connected ? C.green : "#9A6700"}}>{s.connected ? "Connected" : t === "api" ? "Needs token" : "No token"}</span>}
            </div>
            <div style={{fontSize: "12.5px", color: C.text2, marginTop: "4px"}}>{s.kpis.map(k => k.label + (k.direction === "down" ? " ↓" : "")).join(" · ")}</div>
            {st && <div style={{fontSize: "12px", marginTop: "4px", color: st.ok ? C.text3 : C.red}}>{st.ok ? "✓ " : "⚠ "}{st.text}{s.lastRun ? ` · ${new Date(s.lastRun).toLocaleString()}` : ""}</div>}
            <div style={{display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px"}}>
              {(t === "api" || t === "mcp") && <>
                <button className="bt-btn" onClick={() => { setOpen(open === s.id + "c" ? null : s.id + "c"); setToken(""); }}>{s.connected ? "Change token" : "Connect"}</button>
                <button className="bt-btn" disabled={!!busy} onClick={() => call(s.id, "run", {}, "Pulling data")}>{busy === s.id + "run" ? "Pulling…" : "Run now"}</button>
              </>}
              {t !== "existing" && <>
                <input type="file" accept={UPLOAD_ACCEPT} style={{display: "none"}} ref={el => { fileRefs.current[s.id] = el; }}
                  onChange={async e => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
                    try { call(s.id, "import", await readUpload(f), "Reading " + f.name); } catch (err) { setMsg(m => ({...m, [s.id]: {ok: false, text: err.message}})); } }}/>
                <button className="bt-btn" disabled={!!busy} onClick={() => fileRefs.current[s.id]?.click()}>Upload report or file</button>
              </>}
              {t === "agent" && <button className="bt-btn" onClick={() => setOpen(open === s.id + "a" ? null : s.id + "a")}>Agent setup</button>}
              <button className="bt-btn" disabled={!!busy} onClick={() => { if (!window.confirm(`Delete the “${s.name}” section?`)) return;
                const purge = s.source?.type !== "existing" && window.confirm(`Also delete the values “${s.name}” imported? This can't be undone.\n\nOK = delete the data too · Cancel = keep the data in your history`);
                call(s.id, "delete", {purge}, "Deleting"); }}>Delete</button>
            </div>
            {open === s.id + "c" && <form onSubmit={e => { e.preventDefault(); call(s.id, "secret", {value: token}, "Saving"); setOpen(null); setToken(""); }}
              style={{display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", marginTop: "10px"}}>
              <input type="password" autoComplete="off" className="bt-date" style={{flex: "1 1 240px", marginTop: 0}} value={token} onChange={e => setToken(e.target.value)}
                placeholder={t === "api" ? `${s.source.app || "API"} personal access token` : "MCP bearer token (leave empty if none)"}/>
              <button className="bt-btn" type="submit" style={{background: C.teal, borderColor: C.teal, color: "#fff"}}>Save token</button>
              <div style={{width: "100%", fontSize: "12px", color: C.text3}}>Kept on the BodyData server, used only to read this data, and never shown again.{s.source.docsUrl && <> <a href={s.source.docsUrl} target="_blank" rel="noreferrer" style={{color: C.teal}}>Where to get it</a></>}</div>
            </form>}
            {open === s.id + "a" && <div style={{marginTop: "10px", fontSize: "12.5px", color: C.text2, lineHeight: 1.6, background: "#F8F9FC", border: "1px solid #EEF0F6", borderRadius: "8px", padding: "10px 12px"}}>
              The BodyData Agent runs on <b>your</b> computer. You sign in to {s.source.app || "the app"} yourself, once, in the agent's own browser window; your password never reaches BodyData. On schedule it opens {s.source.startUrl ? <a href={s.source.startUrl} target="_blank" rel="noreferrer" style={{color: C.teal}}>the export page</a> : "the export page"}, downloads the export and uploads it here.
              <pre style={{margin: "8px 0 0", whiteSpace: "pre-wrap", fontSize: "12px", background: "#fff", border: "1px solid #E7E8F1", borderRadius: "6px", padding: "8px"}}>{`cd ~/Biotracker/bodydata-agent && npm install
node agent.js login ${s.id}     # sign in once
node agent.js run ${s.id}       # test it
node agent.js install           # run due jobs every hour`}</pre>
              {s.source.instructions && <div style={{marginTop: "6px"}}>Export steps: {s.source.instructions}</div>}
            </div>}
            {m && <div style={{fontSize: "12.5px", fontWeight: 600, marginTop: "8px", color: m.ok === false ? C.red : m.ok ? C.green : C.text3}}>{m.ok === false ? "⚠ " : ""}{m.text}</div>}
          </div>);
      })}
    </div>
  );
}
function Automations({apiURL, apiSecret, sections = [], onSections, onData}) {
  const base = (apiURL || "").replace(/\/sync\/?$/, "");
  const H = {"x-api-secret": apiSecret};
  const [src, setSrc] = useState(null), [err, setErr] = useState("");
  const [rem, setRem] = useState([]), [remDirty, setRemDirty] = useState(false), [remMsg, setRemMsg] = useState("");
  const [imp, setImp] = useState(null), [busy, setBusy] = useState(false), [showOld, setShowOld] = useState(false);
  const fileRef = useRef();
  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([fetch(`${base}/sources`, {headers: H}), fetch(`${base}/automations`, {headers: H})]);
      if (!a.ok) throw new Error(`Server error ${a.status}`);
      setSrc(await a.json()); if (b.ok) setRem((await b.json()).reminders || []); setErr("");
    } catch (e) { setErr(e.message); }
  }, [base, apiSecret]);
  useEffect(() => { load(); }, [load]);

  const upload = async (f) => {
    if (!f) return; setBusy(true); setImp(null);
    try {
      const r = await fetch(`${base}/import/file`, {method: "POST", headers: {...H, "Content-Type": "application/json"}, body: JSON.stringify({filename: f.name, text: await f.text()})});
      const j = await r.json(); if (!r.ok) throw new Error(j.error || `Server error ${r.status}`);
      setImp({ok: true, text: `${j.source}: imported ${j.imported} new or updated day${j.imported === 1 ? "" : "s"} (file covers ${fmtDate(j.first)} – ${fmtDate(j.newest)}).`}); load();
    } catch (e) { setImp({ok: false, text: e.message}); }
    setBusy(false);
  };
  const saveRem = async () => {
    setRemMsg("Saving…");
    try {
      const r = await fetch(`${base}/automations`, {method: "POST", headers: {...H, "Content-Type": "application/json"}, body: JSON.stringify({reminders: rem})});
      const j = await r.json(); if (!r.ok) throw new Error(j.error); setRem(j.reminders); setRemDirty(false);
      setRemMsg("Saved. Your iPhone schedules these the next time BodyData opens.");
    } catch (e) { setRemMsg("⚠ " + e.message); }
  };
  const edit = (i, patch) => { setRem(r => r.map((x, j) => j === i ? {...x, ...patch} : x)); setRemDirty(true); setRemMsg(""); };

  // merge device-name variants ("Brandon’s iPhone (3)" → "iPhone")
  const rows = useMemo(() => {
    const m = new Map();
    for (const x of src?.sources || []) {
      const name = x.mode === "manual" ? x.name : appName(x.name);
      const e = m.get(name);
      if (!e || (x.last || "") > (e.last || "")) m.set(name, {...x, name, metrics: Math.max(x.metrics || 0, e?.metrics || 0)});
    }
    return [...m.values()];
  }, [src]);
  const active = rows.filter(x => x.mode === "manual" || (x.daysSince ?? 999) <= 90);
  const old = rows.filter(x => !(x.mode === "manual" || (x.daysSince ?? 999) <= 90));
  const chip = (x) => {
    const d = x.daysSince ?? 999, manual = x.mode === "manual";
    const [t, bg, fg] = d <= 2 ? ["Up to date", "rgba(31,157,107,.1)", C.green] : d <= 14 ? [`${d} days ago`, "#FFF6E5", "#9A6700"] : [manual ? "Export needed" : "Stopped sending", "rgba(214,69,69,.08)", C.red];
    return <span style={{fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "6px", background: bg, color: fg, whiteSpace: "nowrap"}}>{t}</span>;
  };
  const card = {background: "#fff", border: `1px solid ${C.bord}`, borderRadius: "12px", padding: "18px", marginBottom: "16px"};
  const h2 = {fontFamily: "'Inter',system-ui,sans-serif", fontSize: "15px", fontWeight: 700, color: C.text1};
  const td = {padding: "9px 10px", borderTop: "1px solid #EEF0F6", fontSize: "13px", verticalAlign: "top"};
  const Table = ({list}) => (
    <div style={{overflowX: "auto"}}><table style={{borderCollapse: "collapse", width: "100%"}}>
      <thead><tr>{["App", "How it arrives", "Latest data", "Metrics", "Status"].map(h => <th key={h} style={{textAlign: "left", fontSize: "11px", color: C.text3, fontWeight: 600, padding: "0 10px 6px", textTransform: "uppercase", letterSpacing: ".06em"}}>{h}</th>)}</tr></thead>
      <tbody>{list.map(x => <tr key={x.name}>
        <td style={{...td, fontWeight: 600, color: C.text1}}>{x.name}{x.note && <div style={{fontWeight: 400, fontSize: "12px", color: C.text3, marginTop: "2px", maxWidth: "380px"}}>{x.note}</div>}</td>
        <td style={{...td, color: C.text2}}>{x.mode === "manual" ? "File export" : "Automatic (Apple Health)"}</td>
        <td style={{...td, color: C.text2, whiteSpace: "nowrap"}}>{x.last ? fmtDate(x.last) : "—"}</td>
        <td style={{...td, color: C.text2}}>{x.metrics || x.days ? (x.metrics ? `${x.metrics} types` : `${x.days} days`) : "—"}</td>
        <td style={td}>{chip(x)}</td></tr>)}</tbody>
    </table></div>);

  return (
    <div style={{padding: "18px 28px 28px", maxWidth: "1000px", fontFamily: "'Inter',system-ui,sans-serif"}}>
      <div style={{fontFamily: "'Inter',system-ui,sans-serif", fontSize: "18px", fontWeight: 700, color: C.text1}}>Automations</div>
      <div style={{fontSize: "12.5px", color: C.text3, margin: "2px 0 16px"}}>Every app feeding BodyData, whether it arrives on its own, and reminders for the ones that need an export.</div>
      {err && <div style={{...card, color: C.red, fontSize: "13px"}}>⚠ {err}</div>}

      <div style={card}>
        <div style={{display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px"}}>
          <div style={{...h2, flex: 1}}>Data sources</div>
          {src?.lastPhoneSync && <span style={{fontSize: "12px", color: C.text3}}>Last iPhone sync {fmtDate(src.lastPhoneSync)}</span>}
          <button className="bt-btn" onClick={load}>Refresh</button>
        </div>
        {!src ? <div style={{fontSize: "13px", color: C.text3}}>Loading…</div> : <>
          <Table list={active}/>
          {old.length > 0 && <button onClick={() => setShowOld(v => !v)} style={{border: 0, background: "none", color: C.teal, fontWeight: 600, fontSize: "12.5px", cursor: "pointer", marginTop: "10px", padding: 0, fontFamily: "inherit"}}>
            {showOld ? "Hide" : "Show"} {old.length} app{old.length === 1 ? "" : "s"} with no data in 90+ days</button>}
          {showOld && <div style={{marginTop: "8px"}}><Table list={old}/></div>}
        </>}
      </div>

      <SectionsCard base={base} H={H} sections={sections} onSections={onSections} onData={onData} card={card} h2={h2}/>
      <ConnectionsCard base={base} H={H} onSections={onSections} onData={onData} card={card} h2={h2}/>
      <BuilderCard base={base} H={H} sections={sections} onSections={onSections} card={card} h2={h2}/>

      <div style={card}>
        <div style={h2}>Import an export file</div>
        <div style={{fontSize: "12.5px", color: C.text3, margin: "2px 0 12px", lineHeight: 1.5}}>
          <b>From your iPhone (easiest):</b> in the app, export → <b>Share</b> → <b>BodyData</b>. BodyData uploads it for you.<br/>
          <b>From this computer:</b> choose the CSV below. Fitbod exports are recognised automatically; for any other app, AI maps the columns the first time and remembers the format.
        </div>
        <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" style={{display: "none"}} onChange={e => { upload(e.target.files?.[0]); e.target.value = ""; }}/>
        <button className="bt-btn" disabled={busy} onClick={() => fileRef.current.click()} style={{background: C.teal, borderColor: C.teal, color: "#fff"}}>{busy ? "Importing…" : "Choose export file"}</button>
        {imp && <div style={{marginTop: "10px", fontSize: "13px", fontWeight: 600, color: imp.ok ? C.green : C.red}}>{imp.ok ? "✓ " : "⚠ "}{imp.text}</div>}
      </div>

      <div style={card}>
        <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
          <div style={{...h2, flex: 1}}>Export reminders</div>
          <select className="bt-date" style={{width: "auto", marginTop: 0}} value="" onChange={e => {
            const p = REMINDER_PRESETS.find(x => x.app === e.target.value) || {app: "", openURL: ""};
            setRem(r => [...r, {id: "r" + Date.now(), app: p.app, title: "", openURL: p.openURL, frequency: "weekly", weekday: 1, hour: 19, minute: 0, enabled: true}]); setRemDirty(true);
          }}>
            <option value="">+ Add reminder…</option>
            {REMINDER_PRESETS.map(p => <option key={p.app} value={p.app}>{p.app}</option>)}
            <option value="Other">Other app</option>
          </select>
        </div>
        <div style={{fontSize: "12.5px", color: C.text3, margin: "4px 0 12px"}}>For apps that can't send their detail on their own. Your iPhone shows the reminder on schedule; tapping it opens the app so you can export and share to BodyData (~10 seconds).</div>
        {rem.length === 0 && <div style={{fontSize: "13px", color: C.text3}}>No reminders yet. Fitbod is the one to add: weekly is enough, since each export includes your full history.</div>}
        {rem.map((r, i) => (
          <div key={r.id} style={{display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "flex-end", padding: "10px 0", borderTop: i ? "1px solid #EEF0F6" : 0}}>
            <label style={{fontSize: "12px", color: "#7A80A6", width: "150px"}}>App<input className="bt-date" value={r.app} onChange={e => edit(i, {app: e.target.value})}/></label>
            <label style={{fontSize: "12px", color: "#7A80A6", width: "110px"}}>How often
              <select className="bt-date" value={r.frequency} onChange={e => edit(i, {frequency: e.target.value})}><option value="weekly">Weekly</option><option value="daily">Daily</option></select></label>
            {r.frequency === "weekly" && <label style={{fontSize: "12px", color: "#7A80A6", width: "90px"}}>Day
              <select className="bt-date" value={r.weekday} onChange={e => edit(i, {weekday: +e.target.value})}>{WEEKDAYS.map((d, j) => <option key={d} value={j + 1}>{d}</option>)}</select></label>}
            <label style={{fontSize: "12px", color: "#7A80A6", width: "110px"}}>Time<input type="time" className="bt-date" value={`${String(r.hour).padStart(2, "0")}:${String(r.minute).padStart(2, "0")}`}
              onChange={e => { const [h, m] = e.target.value.split(":"); edit(i, {hour: +h, minute: +m}); }}/></label>
            <label style={{fontSize: "12px", color: "#7A80A6", display: "flex", alignItems: "center", gap: "6px", height: "34px"}}>
              <input type="checkbox" checked={r.enabled} onChange={e => edit(i, {enabled: e.target.checked})}/> On</label>
            <button className="bt-btn" onClick={() => { setRem(x => x.filter((_, j) => j !== i)); setRemDirty(true); }}>Remove</button>
            {REMINDER_PRESETS.find(p => p.app === r.app)?.note && <div style={{width: "100%", fontSize: "12px", color: C.text3}}>{REMINDER_PRESETS.find(p => p.app === r.app).note}</div>}
          </div>))}
        {(remDirty || remMsg) && <div style={{display: "flex", gap: "10px", alignItems: "center", marginTop: "12px"}}>
          {remDirty && <button className="bt-btn" onClick={saveRem} style={{background: C.teal, borderColor: C.teal, color: "#fff"}}>Save reminders</button>}
          <span style={{fontSize: "12.5px", color: remMsg.startsWith("⚠") ? C.red : C.text3}}>{remMsg}</span></div>}
      </div>
    </div>
  );
}

// ─── MANUAL UPLOAD (measurements, BF%, RMR, custom metrics → saved to the API by date) ───
const MU_GROUPS = ["body","segmental","measurements"];
const MU_SOURCES = ["Manual","DEXA scan","Bod Pod","InBody","Hume","Metabolic test (RMR)","Tape measure","Other"];
const muNorm = s => String(s || "").toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
const muSlug = s => "c_" + String(s).trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const MU_ALIASES = {bf:"bodyFat",bfp:"bodyFat",bodyfatpercent:"bodyFat",bodyfatpct:"bodyFat",fat:"bodyFat",
  restingmetabolicrate:"rmr",basalmetabolicrate:"bmr",lbm:"leanMass",leanbodymass:"leanMass",waist:"waistIn",chest:"chestIn",
  hips:"hipsIn",neck:"neckIn",shoulders:"shouldersIn",weightlbs:"weight",bodyweight:"weight",vat:"visceralFat"};
function muFieldIndex() {
  const idx = {};
  for (const g of GROUPS) for (const r of g.rows) { idx[muNorm(r.k)] = r.k; idx[muNorm(r.l)] = r.k; }
  for (const [a, k] of Object.entries(MU_ALIASES)) idx[a] = k;
  return idx;
}
// "2026-11-03", "11/3/2026", "Nov 3 2026" → "2026-11-03"
function muDate(v) {
  const t = String(v || "").trim(); if (!t) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
  const m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? "20" + m[3] : m[3]; return `${y}-${m[1].padStart(2,"0")}-${m[2].padStart(2,"0")}`; }
  const d = new Date(t); return isNaN(d) ? null : ymdOf(d);
}
function muParse(text) {
  const lines = String(text).trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return {error: "Need a header row plus at least one data row."};
  const delim = lines[0].includes("\t") ? "\t" : ",";
  const split = l => { const out = []; let cur = "", q = false;
    for (const ch of l) { if (ch === '"') q = !q; else if (ch === delim && !q) { out.push(cur); cur = ""; } else cur += ch; }
    out.push(cur); return out.map(x => x.trim()); };
  const head = split(lines[0]), fi = muFieldIndex();
  const di = head.findIndex(h => /^(date|day|measured|scan ?date)$/i.test(h.trim()));
  if (di < 0) return {error: 'The first row needs a "date" column.'};
  const cols = head.map((h, i) => {
    if (i === di) return null;
    const unit = (h.match(/\(([^)]+)\)/) || [])[1] || "";
    const known = fi[muNorm(h)];
    return known ? {h, k: known, known: true} : {h, k: muSlug(h.replace(/\(.*?\)/g, "")), l: h.replace(/\(.*?\)/g, "").trim(), u: unit, known: false};
  });
  const rows = []; const bad = [];
  lines.slice(1).forEach((l, n) => {
    const v = split(l), date = muDate(v[di]);
    if (!date) { bad.push(n + 2); return; }
    const vals = {};
    cols.forEach((c, i) => { if (!c) return; const x = parseFloat(String(v[i] || "").replace(/[^0-9.\-]/g, "")); if (isFinite(x)) vals[c.k] = x; });
    if (Object.keys(vals).length) rows.push({date, vals});
  });
  return {cols: cols.filter(Boolean), rows, bad};
}

function ManualUpload({apiURL, apiSecret, prefill, history, onSaved}) {
  const fields = GROUPS.filter(g => MU_GROUPS.includes(g.id));
  const [date, setDate] = useState(todayYmd());
  const [source, setSource] = useState("Manual");
  const [vals, setVals] = useState({});
  const [custom, setCustom] = useState([]);           // [{l,u,v}]
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);                // {ok,text}
  const [bulk, setBulk] = useState(null);              // parsed CSV
  const [paste, setPaste] = useState("");
  const fileRef = useRef();
  useEffect(() => { if (prefill && Object.keys(prefill).length) setVals(v => ({...v, ...prefill})); }, [prefill]);

  const base = (apiURL || "").replace(/\/sync\/?$/, "");
  const post = async (body) => {
    const r = await fetch(`${base}/sync`, {method: "POST", headers: {"Content-Type": "application/json", "x-api-secret": apiSecret}, body: JSON.stringify(body)});
    if (!r.ok) throw new Error(r.status === 401 ? "Wrong API secret (check the Sync & Connect tab)" : `Server error ${r.status}`);
  };
  const stamp = () => new Date().toLocaleTimeString("en-US", {hour: "numeric", minute: "2-digit"});

  const saveOne = async () => {
    const body = {};
    for (const [k, v] of Object.entries(vals)) { const x = parseFloat(v); if (isFinite(x)) body[k] = x; }
    const defs = {};
    for (const c of custom) { const x = parseFloat(c.v); if (!c.l.trim() || !isFinite(x)) continue; const k = muSlug(c.l); body[k] = x; defs[k] = {l: c.l.trim(), u: c.u.trim()}; }
    const n = Object.keys(body).length;
    if (!n) { setMsg({ok: false, text: "Enter at least one value."}); return; }
    setBusy(true); setMsg(null);
    try {
      await post({...body, ...(Object.keys(defs).length ? {customDefs: defs} : {}), syncDate: date, syncTime: stamp(), source});
      setMsg({ok: true, text: `Saved ${n} value${n === 1 ? "" : "s"} for ${fmtDate(date)}. They're on the KPI board now.`});
      setVals({}); setCustom([]); onSaved && onSaved();
    } catch (e) { setMsg({ok: false, text: e.message}); }
    setBusy(false);
  };

  const loadBulk = (text) => { const r = muParse(text); setBulk(r); setMsg(r.error ? {ok: false, text: r.error} : null); };
  const uploadBulk = async () => {
    if (!bulk?.rows?.length) return;
    const defs = {}; for (const c of bulk.cols) if (!c.known) defs[c.k] = {l: c.l, u: c.u};
    setBusy(true); setMsg(null);
    let done = 0;
    try {
      for (const r of bulk.rows) {
        await post({...r.vals, ...(Object.keys(defs).length ? {customDefs: defs} : {}), syncDate: r.date, syncTime: stamp(), source});
        done++;
      }
      setMsg({ok: true, text: `Uploaded ${done} date${done === 1 ? "" : "s"}. They're on the KPI board now.`});
      setBulk(null); setPaste(""); onSaved && onSaved();
    } catch (e) { setMsg({ok: false, text: `${e.message} — ${done} of ${bulk.rows.length} uploaded.`}); }
    setBusy(false);
  };

  const recent = (history || []).filter(d => d.src && d.src !== "apple-health").slice().sort((a, b) => String(b._rx || "").localeCompare(String(a._rx || ""))).slice(0, 8);
  const lbl = k => GROUPS.flatMap(g => g.rows).find(r => r.k === k)?.l || k;
  const card = {background: "#fff", border: `1px solid ${C.bord}`, borderRadius: "12px", padding: "18px", marginBottom: "16px"};
  const h2 = {fontFamily: "'Inter',system-ui,sans-serif", fontSize: "15px", fontWeight: 700, color: C.text1};
  const lab = {fontSize: "12px", color: "#7A80A6", display: "block"};

  return (
    <div style={{fontFamily: "'Inter',system-ui,sans-serif"}}>
      {msg && <div style={{...card, padding: "12px 16px", borderColor: msg.ok ? "rgba(31,157,107,.35)" : "rgba(214,69,69,.35)", background: msg.ok ? "rgba(31,157,107,.06)" : "rgba(214,69,69,.05)", color: msg.ok ? C.green : C.red, fontSize: "13px", fontWeight: 600}}>{msg.ok ? "✓ " : "⚠ "}{msg.text}</div>}

      <div style={card}>
        <div style={{display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "4px"}}>
          <div style={{flex: "1 1 220px"}}>
            <div style={h2}>Add a measurement</div>
            <div style={{fontSize: "12.5px", color: C.text3, marginTop: "2px"}}>Fill in only what you measured. Saved to your account by date and shown on the KPI board.</div>
          </div>
          <label style={{...lab, width: "160px"}}>Date measured<input type="date" className="bt-date" value={date} max={todayYmd()} onChange={e => e.target.value && setDate(e.target.value)}/></label>
          <label style={{...lab, width: "190px"}}>Source
            <select className="bt-date" value={source} onChange={e => setSource(e.target.value)}>{MU_SOURCES.map(s => <option key={s}>{s}</option>)}</select>
          </label>
        </div>
        {fields.map(g => (
          <div key={g.id} style={{marginTop: "18px"}}>
            <div className="bt-eyebrow" style={{marginBottom: "8px"}}>{g.name}</div>
            <div style={{display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: "10px"}}>
              {g.rows.map(r => (
                <label key={r.k} style={lab}>{r.l}{r.u && <span style={{color: C.text3}}> ({r.u})</span>}
                  <input type="number" step="any" inputMode="decimal" className="bt-date" value={vals[r.k] ?? ""}
                    onChange={e => setVals(v => { const n = {...v}; if (e.target.value === "") delete n[r.k]; else n[r.k] = e.target.value; return n; })}/>
                </label>
              ))}
            </div>
          </div>
        ))}
        <div style={{marginTop: "18px"}}>
          <div className="bt-eyebrow" style={{marginBottom: "8px"}}>Custom metrics</div>
          {custom.map((c, i) => (
            <div key={i} style={{display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: "8px", marginBottom: "8px", alignItems: "end"}}>
              <label style={lab}>Name<input className="bt-date" placeholder="e.g. Grip strength" value={c.l} onChange={e => setCustom(a => a.map((x, j) => j === i ? {...x, l: e.target.value} : x))}/></label>
              <label style={lab}>Value<input type="number" step="any" className="bt-date" value={c.v} onChange={e => setCustom(a => a.map((x, j) => j === i ? {...x, v: e.target.value} : x))}/></label>
              <label style={lab}>Unit<input className="bt-date" placeholder="lbs, %, kcal" value={c.u} onChange={e => setCustom(a => a.map((x, j) => j === i ? {...x, u: e.target.value} : x))}/></label>
              <button className="bt-btn" onClick={() => setCustom(a => a.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
            </div>
          ))}
          <button className="bt-btn" onClick={() => setCustom(a => [...a, {l: "", u: "", v: ""}])}>+ Add custom metric</button>
        </div>
        <div style={{display: "flex", gap: "10px", marginTop: "20px", alignItems: "center"}}>
          <button className="bt-btn" disabled={busy} onClick={saveOne} style={{background: C.teal, borderColor: C.teal, color: "#fff", opacity: busy ? .6 : 1}}>{busy ? "Saving…" : `Save for ${shortDay(date)}`}</button>
          <button className="bt-btn" onClick={() => { setVals({}); setCustom([]); }}>Clear</button>
        </div>
      </div>

      <div style={card}>
        <div style={h2}>Upload a spreadsheet</div>
        <div style={{fontSize: "12.5px", color: C.text3, margin: "2px 0 12px", lineHeight: 1.5}}>
          CSV, or paste straight from Excel / Google Sheets. One row per date, first column <b>date</b>. Columns are matched by name
          (Weight, Body Fat %, RMR, Lean Mass, Waist…). Any column BodyData doesn't know becomes a custom metric — put the unit in brackets, e.g. <code>Grip (lbs)</code>.
        </div>
        <div style={{display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "10px"}}>
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,text/csv" style={{display: "none"}}
            onChange={e => { const f = e.target.files?.[0]; if (f) f.text().then(loadBulk); e.target.value = ""; }}/>
          <button className="bt-btn" onClick={() => fileRef.current.click()}>Choose CSV file</button>
          <button className="bt-btn" onClick={() => { const t = "date,Weight (lbs),Body Fat %,Lean Mass (lbs),RMR (kcal),Waist (in)\n" + todayYmd() + ",180.4,15.2,153.0,1950,33.5\n";
            const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([t], {type: "text/csv"})); a.download = "biotrack-measurements-template.csv"; a.click(); }}>Download template</button>
        </div>
        <textarea value={paste} onChange={e => setPaste(e.target.value)} placeholder={"date\tWeight (lbs)\tBody Fat %\tRMR (kcal)\n11/3/2026\t181.2\t15.8\t1940"}
          style={{width: "100%", boxSizing: "border-box", minHeight: "90px", border: `1px solid ${C.bord}`, borderRadius: "8px", padding: "10px", font: "12.5px ui-monospace,Menlo,monospace", color: C.text1}}/>
        {paste.trim() && <button className="bt-btn" style={{marginTop: "8px"}} onClick={() => loadBulk(paste)}>Preview pasted data</button>}
        {bulk && !bulk.error && (
          <div style={{marginTop: "14px"}}>
            <div style={{fontSize: "12.5px", color: C.text2, marginBottom: "8px"}}>
              <b>{bulk.rows.length}</b> date{bulk.rows.length === 1 ? "" : "s"} ready · columns: {bulk.cols.map(c => (
                <span key={c.h} style={{display: "inline-block", margin: "2px 4px 2px 0", padding: "1px 7px", borderRadius: "6px", fontSize: "11.5px",
                  background: c.known ? "rgba(31,157,107,.1)" : "#F1F2F8", color: c.known ? C.green : C.text2}}>{c.known ? lbl(c.k) : c.l + " (custom)"}</span>))}
              {bulk.bad.length > 0 && <div style={{color: C.red, marginTop: "4px"}}>Skipped row{bulk.bad.length === 1 ? "" : "s"} {bulk.bad.join(", ")}: date not recognised.</div>}
            </div>
            <div style={{maxHeight: "220px", overflow: "auto", border: `1px solid ${C.bord}`, borderRadius: "8px"}}>
              <table style={{borderCollapse: "collapse", width: "100%", fontSize: "12px"}}>
                <thead><tr>{["Date", ...bulk.cols.map(c => c.known ? lbl(c.k) : c.l)].map(h => <th key={h} style={{textAlign: "left", padding: "6px 10px", background: "#F7F6F3", position: "sticky", top: 0, color: C.text2}}>{h}</th>)}</tr></thead>
                <tbody>{bulk.rows.map(r => <tr key={r.date}><td style={{padding: "5px 10px", borderTop: "1px solid #EEF0F6"}}>{fmtDate(r.date)}</td>
                  {bulk.cols.map(c => <td key={c.k} style={{padding: "5px 10px", borderTop: "1px solid #EEF0F6"}}>{r.vals[c.k] ?? "—"}</td>)}</tr>)}</tbody>
              </table>
            </div>
            <div style={{display: "flex", gap: "10px", marginTop: "12px"}}>
              <button className="bt-btn" disabled={busy || !bulk.rows.length} onClick={uploadBulk} style={{background: C.teal, borderColor: C.teal, color: "#fff", opacity: busy ? .6 : 1}}>{busy ? "Uploading…" : `Upload ${bulk.rows.length} date${bulk.rows.length === 1 ? "" : "s"}`}</button>
              <button className="bt-btn" onClick={() => setBulk(null)}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {recent.length > 0 && (
        <div style={card}>
          <div style={h2}>Recent uploads</div>
          {recent.map((d, i) => {
            const keys = Object.keys(d).filter(k => typeof d[k] === "number" && !["dow"].includes(k));
            return <div key={i} style={{display: "flex", gap: "12px", padding: "9px 0", borderTop: i ? "1px solid #EEF0F6" : 0, fontSize: "12.5px"}}>
              <div style={{width: "110px", flexShrink: 0, fontWeight: 600, color: C.text1}}>{fmtDate(dayKey(d))}</div>
              <div style={{width: "130px", flexShrink: 0, color: C.text3}}>{d.src}</div>
              <div style={{color: C.text2}}>{keys.slice(0, 8).map(k => `${d.customDefs?.[k]?.l || lbl(k)} ${d[k]}`).join(" · ")}{keys.length > 8 ? ` +${keys.length - 8} more` : ""}</div>
            </div>;
          })}
        </div>
      )}
    </div>
  );
}

// ─── METRIC DRILL-DOWN PANEL ──────────────────────────────────────────────────
function MetricDrillDown({ metric, allData, onClose }) {
  const [range, setRange] = useState("30d");
  const [hovIdx, setHovIdx] = useState(null);

  const days = range==="7d"?7:range==="30d"?30:range==="90d"?90:range==="180d"?180:range==="365d"?365:99999;
  const rangeSlice = allData.slice(0, Math.min(days, allData.length));
  const plotData = [...rangeSlice]
    .map(d => ({ date: d.syncDate || d.date, val: d[metric.key] }))
    .filter(d => typeof d.val === "number" && !isNaN(d.val))
    .reverse(); // oldest first for chart

  const vals = plotData.map(d => d.val);
  const cur  = vals.length ? vals[vals.length - 1] : null;
  const avg  = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : null;
  const best = vals.length ? (metric.lowerBetter ? Math.min(...vals) : Math.max(...vals)) : null;
  const worst= vals.length ? (metric.lowerBetter ? Math.max(...vals) : Math.min(...vals)) : null;
  const startVal = vals.length > 1 ? vals[0] : null;
  const pct  = cur!=null&&startVal!=null&&startVal!==0 ? ((cur-startVal)/Math.abs(startVal)*100) : null;
  const isGood = pct!=null&&(metric.lowerBetter?pct<0:pct>0);
  const isBad  = pct!=null&&(metric.lowerBetter?pct>0:pct<0);

  // Historical comparison points
  const compAt = (d) => allData[Math.min(d-1,allData.length-1)]?.[metric.key] ?? null;
  const comps = [{label:"1 week ago",d:7},{label:"1 month ago",d:30},{label:"3 months ago",d:90},{label:"6 months ago",d:180},{label:"1 year ago",d:365}]
    .map(c=>({...c,val:compAt(c.d)})).filter(c=>c.val!=null);

  // Pearson correlation vs other metrics (90d window)
  const CORR_KEYS = ["hrv","sleepDur","protein","calories","steps","restingHR","bodyFat","weight","leanMass","deepSleep","workoutVol","readiness"];
  const correlations = CORR_KEYS.filter(k=>k!==metric.key).map(k=>{
    const pairs = allData.slice(0,90).filter(d=>d[metric.key]!=null&&d[k]!=null).map(d=>[d[metric.key],d[k]]);
    if(pairs.length<6) return null;
    const xs=pairs.map(p=>p[0]),ys=pairs.map(p=>p[1]);
    const mx=xs.reduce((a,b)=>a+b)/xs.length, my=ys.reduce((a,b)=>a+b)/ys.length;
    const num=pairs.reduce((s,[x,y])=>s+(x-mx)*(y-my),0);
    const den=Math.sqrt(xs.reduce((s,x)=>s+(x-mx)**2,0)*ys.reduce((s,y)=>s+(y-my)**2,0));
    return den?{key:k,r:num/den}:null;
  }).filter(Boolean).sort((a,b)=>Math.abs(b.r)-Math.abs(a.r)).slice(0,3);

  // Chart geometry
  const W=520, H=140;
  const mn=vals.length?Math.min(...vals):0, mx2=vals.length?Math.max(...vals):1;
  const rng2=mx2-mn||1;
  const toX=i=>(i/Math.max(plotData.length-1,1))*W;
  const toY=v=>H-10-((v-mn)/rng2)*(H-24);
  const linePts=plotData.map((d,i)=>`${toX(i).toFixed(1)},${toY(d.val).toFixed(1)}`).join(" ");
  const areaPath=plotData.length>1
    ?`M${toX(0).toFixed(1)},${H} `+plotData.map((d,i)=>`L${toX(i).toFixed(1)},${toY(d.val).toFixed(1)}`).join(" ")+` L${toX(plotData.length-1).toFixed(1)},${H} Z`
    :"";

  // Goal definitions for specific metrics
  const GOALS = {bodyFat:{target:10,label:"Goal: 10% Body Fat"}};
  const goal = GOALS[metric.key];

  const keyLabel = k => SUMMARY_METRICS.find(m=>m.key===k)?.label || k;

  const D={
    bg:"#F8F9FC",surf:"#FFFFFF",nav:"#F1F2F8",
    bord:"#E7E8F1",bord2:"#D3D6E6",
    t1:"#2B2E4A",t2:"#4A4F6E",t3:"#7A80A6",dim:"#A9AECB",
    teal:"#5468FF",green:"#1F9D6B",red:"#B4232C",
  };

  return (
    <div style={{background:D.bg,display:"flex",flexDirection:"column",fontFamily:"'Inter',system-ui,sans-serif",minHeight:"100%"}}>
        {/* Back / close header */}
        <div style={{padding:"14px 24px",borderBottom:`1px solid ${D.bord}`,background:D.surf,position:"sticky",top:0,zIndex:1,display:"flex",alignItems:"center",gap:"12px"}}>
          <button onClick={onClose} style={{background:"transparent",border:`1px solid ${D.bord}`,color:D.t2,cursor:"pointer",fontSize:"12px",padding:"5px 12px",borderRadius:"8px",fontFamily:"inherit",display:"flex",alignItems:"center",gap:"5px",flexShrink:0}}>← Back</button>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"10.5px",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:D.t3,marginBottom:"2px"}}>{metric.label}</div>
            <div style={{display:"flex",alignItems:"baseline",gap:"10px",flexWrap:"wrap"}}>
              <span style={{fontSize:"34px",fontFamily:"'Jomolhari','Georgia',serif",color:D.t1,lineHeight:1}}>
                {summaryFmtVal(cur,metric.unit)}
              </span>
              {pct!=null&&(
                <span style={{fontSize:"13px",fontWeight:600,color:isGood?D.green:isBad?D.red:D.t3,background:isGood?"rgba(31,157,107,.09)":isBad?"rgba(214,69,69,.09)":"transparent",padding:"3px 9px",borderRadius:"6px"}}>
                  {isGood?"↑":isBad?"↓":"→"} {Math.abs(pct).toFixed(1)}%
                </span>
              )}
            </div>
            {startVal!=null&&cur!=null&&<div style={{fontSize:"12px",color:D.t3,marginTop:"2px"}}>from {summaryFmtVal(startVal,metric.unit)} · {range.toUpperCase()}</div>}
          </div>
        </div>

        <div style={{padding:"20px 24px",display:"flex",flexDirection:"column",gap:20}}>

          {/* Range chips */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {[["7d","7D"],["30d","30D"],["90d","90D"],["180d","6M"],["365d","1Y"],["all","ALL"]].map(([id,lbl])=>(
              <button key={id} onClick={()=>setRange(id)} style={{
                height:"30px",padding:"0 12px",borderRadius:"20px",cursor:"pointer",fontSize:"12.5px",fontFamily:"inherit",
                background:range===id?D.t1:"#fff",
                border:`1px solid ${range===id?D.t1:D.bord}`,
                color:range===id?"#F8F9FC":D.t2,
                fontWeight:range===id?600:400,
              }}>{lbl}</button>
            ))}
          </div>

          {/* BigChart */}
          {plotData.length>1&&(
            <div style={{background:D.surf,borderRadius:"12px",padding:"16px 12px 10px",border:`1px solid ${D.bord}`,position:"relative"}}>
              <svg
                width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
                style={{display:"block",cursor:"crosshair"}}
                onMouseLeave={()=>setHovIdx(null)}
                onMouseMove={e=>{
                  const rect=e.currentTarget.getBoundingClientRect();
                  const idx=Math.round(((e.clientX-rect.left)/rect.width)*(plotData.length-1));
                  setHovIdx(Math.max(0,Math.min(plotData.length-1,idx)));
                }}
              >
                <defs>
                  <linearGradient id={`ddGrad_${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metric.col} stopOpacity="0.14"/>
                    <stop offset="100%" stopColor={metric.col} stopOpacity="0.01"/>
                  </linearGradient>
                </defs>
                {/* Y-axis grid lines */}
                {[0.25,0.5,0.75].map(f=>{
                  const y=10+(1-f)*(H-24);
                  return <line key={f} x1={0} y1={y} x2={W} y2={y} stroke={D.bord} strokeWidth="1"/>;
                })}
                {areaPath&&<path d={areaPath} fill={`url(#ddGrad_${metric.key})`}/>}
                <polyline points={linePts} fill="none" stroke={metric.col} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
                {/* Hover */}
                {hovIdx!=null&&plotData[hovIdx]&&(
                  <>
                    <line x1={toX(hovIdx)} y1={0} x2={toX(hovIdx)} y2={H} stroke={D.bord2} strokeWidth="1"/>
                    <circle cx={toX(hovIdx)} cy={toY(plotData[hovIdx].val)} r={5} fill={metric.col} stroke={D.surf} strokeWidth="2"/>
                  </>
                )}
                {/* Y labels */}
                <text x={2} y={H-2} fontSize={9} fill={D.t3}>{summaryFmtVal(mn,metric.unit)}</text>
                <text x={W-2} y={H-2} fontSize={9} fill={D.t3} textAnchor="end">{summaryFmtVal(mx2,metric.unit)}</text>
              </svg>
              {/* Hover tooltip */}
              {hovIdx!=null&&plotData[hovIdx]&&(
                <div style={{position:"absolute",top:10,left:16,background:D.surf,border:`1px solid ${D.bord}`,borderRadius:"8px",padding:"8px 14px",fontSize:"12px",color:D.t1,pointerEvents:"none",minWidth:110,boxShadow:"0 4px 12px rgba(43,46,74,.08)"}}>
                  <div style={{color:D.t3,marginBottom:"3px",fontSize:"11px"}}>{plotData[hovIdx].date}</div>
                  <div style={{fontWeight:600,color:metric.col,fontFamily:"'Jomolhari','Georgia',serif",fontSize:"16px"}}>{summaryFmtVal(plotData[hovIdx].val,metric.unit)}</div>
                </div>
              )}
            </div>
          )}
          {plotData.length<=1&&<div style={{background:D.surf,borderRadius:"12px",padding:"24px",border:`1px solid ${D.bord}`,textAlign:"center",color:D.t3,fontSize:"13px"}}>Not enough data for this range</div>}

          {/* Stats row */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"10px"}}>
            {[
              {label:"Current",val:summaryFmtVal(cur,metric.unit)},
              {label:"Avg",val:summaryFmtVal(avg!=null?+avg.toFixed(2):null,metric.unit)},
              {label:metric.lowerBetter?"Best ↓":"Best ↑",val:summaryFmtVal(best,metric.unit)},
              {label:metric.lowerBetter?"Worst ↑":"Worst ↓",val:summaryFmtVal(worst,metric.unit)},
            ].map(s=>(
              <div key={s.label} style={{background:D.surf,borderRadius:"10px",padding:"12px 10px",border:`1px solid ${D.bord}`,textAlign:"center"}}>
                <div style={{fontSize:"10.5px",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:D.t3,marginBottom:"6px"}}>{s.label}</div>
                <div style={{fontSize:"16px",fontFamily:"'Jomolhari','Georgia',serif",color:D.t1}}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Historical comparisons */}
          {comps.length>0&&(
            <div>
              <div style={{fontSize:"10.5px",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:D.t3,marginBottom:"10px"}}>Vs Past</div>
              <div style={{background:D.surf,borderRadius:"10px",border:`1px solid ${D.bord}`,overflow:"hidden"}}>
                {comps.map((c,i)=>{
                  const diff=cur!=null?cur-c.val:null;
                  const dp=diff!=null&&c.val!==0?(diff/Math.abs(c.val)*100):null;
                  const good=dp!=null&&(metric.lowerBetter?dp<0:dp>0);
                  const bad =dp!=null&&(metric.lowerBetter?dp>0:dp<0);
                  return (
                    <div key={c.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",borderBottom:i<comps.length-1?`1px solid ${D.bord}`:"none"}}>
                      <div style={{fontSize:"13px",color:D.t2}}>{c.label}</div>
                      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                        <div style={{fontSize:"13px",color:D.t3,fontFamily:"'Jomolhari','Georgia',serif"}}>{summaryFmtVal(c.val,metric.unit)}</div>
                        {dp!=null&&<div style={{fontSize:"12px",fontWeight:600,color:good?D.green:bad?D.red:D.t3,minWidth:"52px",textAlign:"right"}}>{good?"↑":bad?"↓":"→"} {Math.abs(dp).toFixed(1)}%</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Goal tracker */}
          {goal&&cur!=null&&(
            <div>
              <div style={{fontSize:"10.5px",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:D.t3,marginBottom:"10px"}}>Goal Progress</div>
              <div style={{background:D.surf,borderRadius:"10px",padding:"16px",border:`1px solid ${D.bord}`}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"12px"}}>
                  <span style={{fontSize:"13px",color:D.t2}}>{goal.label}</span>
                  <span style={{fontSize:"13px",color:metric.col,fontFamily:"'Jomolhari','Georgia',serif"}}>{summaryFmtVal(cur,metric.unit)} → {summaryFmtVal(goal.target,metric.unit)}</span>
                </div>
                <div style={{background:D.bord,borderRadius:"4px",height:"8px",overflow:"hidden"}}>
                  {(()=>{
                    const start=allData[allData.length-1]?.[metric.key]??cur;
                    const totalDrop=start-goal.target;
                    const doneDrop=start-cur;
                    const pctDone=totalDrop>0?Math.min(100,Math.max(0,(doneDrop/totalDrop)*100)):0;
                    return <div style={{height:"100%",background:metric.col,borderRadius:"4px",width:`${pctDone}%`,transition:"width 0.5s ease"}}/>;
                  })()}
                </div>
                {metric.lowerBetter&&cur>goal.target&&allData.length>7&&(()=>{
                  const recent7=allData.slice(0,7).filter(d=>d[metric.key]!=null);
                  const rate=recent7.length>1?(recent7[0][metric.key]-recent7[recent7.length-1][metric.key])/recent7.length:0;
                  const weeks=rate>0?Math.ceil((cur-goal.target)/(rate*7)):null;
                  return <div style={{fontSize:"11.5px",color:D.t3,marginTop:"8px"}}>{(cur-goal.target).toFixed(1)}{metric.unit} to go{weeks?` · ~${weeks} weeks at current pace`:""}</div>;
                })()}
              </div>
            </div>
          )}

          {/* Correlations */}
          {correlations.length>0&&(
            <div>
              <div style={{fontSize:"10.5px",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:D.t3,marginBottom:"10px"}}>Correlated Metrics</div>
              <div style={{background:D.surf,borderRadius:"10px",border:`1px solid ${D.bord}`,overflow:"hidden"}}>
                {correlations.map((c,i)=>{
                  const strong=Math.abs(c.r)>0.55;
                  const pos=c.r>0;
                  const insight=metric.lowerBetter
                    ?(pos?`Higher ${keyLabel(c.key)} → higher ${metric.label} (worse)`:`Higher ${keyLabel(c.key)} → lower ${metric.label} (better)`)
                    :(pos?`Higher ${keyLabel(c.key)} → higher ${metric.label} (better)`:`Higher ${keyLabel(c.key)} → lower ${metric.label}`);
                  return (
                    <div key={c.key} style={{padding:"12px 16px",borderBottom:i<correlations.length-1?`1px solid ${D.bord}`:"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"4px"}}>
                        <div style={{fontSize:"13px",color:D.t1,fontWeight:600}}>{keyLabel(c.key)}</div>
                        <div style={{fontSize:"12px",fontWeight:600,color:strong?"#6B4FBB":D.t3,background:strong?"rgba(107,79,187,.08)":"transparent",padding:"2px 8px",borderRadius:"5px"}}>
                          r = {c.r.toFixed(2)}
                        </div>
                      </div>
                      <div style={{fontSize:"12px",color:D.t3}}>{insight}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Day-by-day table */}
          {plotData.length>0&&(
            <div>
              <div style={{fontSize:"10.5px",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:600,letterSpacing:".1em",textTransform:"uppercase",color:D.t3,marginBottom:"10px"}}>Recent Data</div>
              <div style={{background:D.surf,borderRadius:"10px",border:`1px solid ${D.bord}`,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"9px 16px",borderBottom:`1px solid ${D.bord}`,background:D.nav}}>
                  {["Date","Value","Change"].map(h=>(
                    <div key={h} style={{fontSize:"10.5px",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:600,letterSpacing:".08em",textTransform:"uppercase",color:D.t3}}>{h}</div>
                  ))}
                </div>
                {[...plotData].reverse().slice(0,20).map((d,i,arr)=>{
                  const prev2=arr[i+1]?.val??null;
                  const chg=prev2!=null?d.val-prev2:null;
                  const g2=chg!=null&&(metric.lowerBetter?chg<0:chg>0);
                  const b2=chg!=null&&(metric.lowerBetter?chg>0:chg<0);
                  return (
                    <div key={d.date+i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",padding:"9px 16px",borderBottom:i<Math.min([...plotData].length,20)-1?`1px solid ${D.bord}`:"none",background:i%2===0?"transparent":D.nav}}>
                      <div style={{fontSize:"12.5px",color:D.t3}}>{d.date}</div>
                      <div style={{fontSize:"12.5px",fontFamily:"'Jomolhari','Georgia',serif",color:D.t1}}>{summaryFmtVal(d.val,metric.unit)}</div>
                      <div style={{fontSize:"12.5px",fontWeight:600,color:g2?D.green:b2?D.red:D.t3}}>
                        {chg!=null?`${g2?"↑":b2?"↓":"→"} ${summaryFmtVal(Math.abs(chg),metric.unit)}`:"—"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
  );
}

// ─── DAILY HABITS ─────────────────────────────────────────────────────────────
const DEFAULT_HABITS = [
  {id:"no_bread",       label:"No Bread",          icon:"🍞", avoid:true},
  {id:"no_pasta",       label:"No Pasta",           icon:"🍝", avoid:true},
  {id:"no_chocolate",   label:"No Chocolate",       icon:"🍫", avoid:true},
  {id:"no_breakfast",   label:"No Breakfast (IF)",  icon:"⏰", avoid:true},
  {id:"protein_shakes", label:"3 Protein Shakes",   icon:"🥤", avoid:false},
  {id:"vegetables",     label:"Vegetables",         icon:"🥦", avoid:false},
  {id:"fruit",          label:"Fruit",              icon:"🍎", avoid:false},
  {id:"nuts",           label:"Nuts",               icon:"🥜", avoid:false},
  {id:"beans",          label:"Beans",              icon:"🫘", avoid:false},
  {id:"no_eating_out",  label:"No Eating Out",      icon:"🍔", avoid:true},
];

// ─── COACHING SETTINGS (extracted — hooks cannot live in an IIFE) ─────────────
function CoachingSettings({ apiURL, apiSecret, panel, inp, bFill, bOut }) {
  const [cs, setCs] = React.useState({});
  const [saving, setSaving] = React.useState(false);
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    if (!apiURL || !apiSecret || loaded) return;
    fetch(`${apiURL}/coaching/settings`, { headers: { "x-api-secret": apiSecret } })
      .then(r => r.json()).then(d => { setCs(d); setLoaded(true); }).catch(() => {});
  }, [apiURL, apiSecret]);
  const save = async () => {
    setSaving(true); setTestResult("");
    try {
      await fetch(`${apiURL}/coaching/settings`, { method: "POST", headers: { "Content-Type": "application/json", "x-api-secret": apiSecret }, body: JSON.stringify({
        anthropicKey: cs.anthropicKey || undefined,
        email: cs.email,
        resendKey: cs.resendKey || undefined,
        ntfyTopic: cs.ntfyTopic,
        enabled: cs.enabled !== false,
      }) });
      setTestResult("✓ Settings saved!");
      setLoaded(false);
    } catch (e) { setTestResult("⚠ Save failed: " + e.message); }
    setSaving(false);
  };
  const testNow = async () => {
    setTesting(true); setTestResult("⟳ Running coaching brief... (takes ~15s)");
    try {
      const r = await fetch(`${apiURL}/coaching/run`, { method: "POST", headers: { "x-api-secret": apiSecret } });
      const j = await r.json();
      if (j.error) setTestResult("⚠ " + j.error);
      else setTestResult("✓ Done! Check your email & ntfy app. Brief preview:\n\n" + j.brief?.slice(0, 300) + "...");
    } catch (e) { setTestResult("⚠ " + e.message); }
    setTesting(false);
  };
  const isConfigured = cs.anthropicKeySet && cs.email;
  return (
    <div style={{ ...panel, marginBottom: "16px", borderColor: "#a78bfa40" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
        <div>
          <div style={{ fontSize: "13px", fontWeight: "bold", letterSpacing: "2px", color: "#a78bfa" }}>🧠 DAILY COACHING BRIEF</div>
          <div style={{ fontSize: "11px", color: C.dim, marginTop: "3px" }}>Claude analyzes your data every morning → email + iPhone push notification</div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
          <div onClick={() => setCs(p => ({ ...p, enabled: !p.enabled }))} style={{ width: "36px", height: "20px", borderRadius: "10px", background: cs.enabled !== false ? "#a78bfa" : "#333", position: "relative", transition: "background 0.2s", cursor: "pointer" }}>
            <div style={{ position: "absolute", top: "3px", left: cs.enabled !== false ? "19px" : "3px", width: "14px", height: "14px", borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
          </div>
          <span style={{ fontSize: "11px", color: C.text2 }}>{cs.enabled !== false ? "Enabled" : "Disabled"}</span>
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "10px", color: C.text3, letterSpacing: "1px", marginBottom: "4px" }}>ANTHROPIC API KEY {cs.anthropicKeySet && <span style={{ color: "#4ade80" }}>✓ SET</span>}</div>
          <input type="password" placeholder={cs.anthropicKeyHint || "sk-ant-api03-..."} value={cs.anthropicKey || ""}
            onChange={e => setCs(p => ({ ...p, anthropicKey: e.target.value }))}
            style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
          <div style={{ fontSize: "9px", color: C.dim, marginTop: "3px" }}>Get at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{ color: "#a78bfa" }}>console.anthropic.com</a></div>
        </div>
        <div>
          <div style={{ fontSize: "10px", color: C.text3, letterSpacing: "1px", marginBottom: "4px" }}>COACHING EMAIL</div>
          <input type="email" placeholder="you@example.com" value={cs.email || ""}
            onChange={e => setCs(p => ({ ...p, email: e.target.value }))}
            style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
          <div style={{ fontSize: "9px", color: C.dim, marginTop: "3px" }}>Where to send your daily brief</div>
        </div>
        <div>
          <div style={{ fontSize: "10px", color: C.text3, letterSpacing: "1px", marginBottom: "4px" }}>RESEND API KEY {cs.resendKeySet && <span style={{ color: "#4ade80" }}>✓ SET</span>} <span style={{ color: C.dim }}>(free email)</span></div>
          <input type="password" placeholder={cs.resendKeySet ? "re_...already set" : "re_..."} value={cs.resendKey || ""}
            onChange={e => setCs(p => ({ ...p, resendKey: e.target.value }))}
            style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
          <div style={{ fontSize: "9px", color: C.dim, marginTop: "3px" }}>Free at <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color: "#a78bfa" }}>resend.com</a> — 3k emails/month free</div>
        </div>
        <div>
          <div style={{ fontSize: "10px", color: C.text3, letterSpacing: "1px", marginBottom: "4px" }}>NTFY PUSH TOPIC <span style={{ color: C.dim }}>(iPhone push)</span></div>
          <input type="text" placeholder="bodydata-yourname-1234" value={cs.ntfyTopic || ""}
            onChange={e => setCs(p => ({ ...p, ntfyTopic: e.target.value }))}
            style={{ ...inp, width: "100%", boxSizing: "border-box" }} />
          <div style={{ fontSize: "9px", color: C.dim, marginTop: "3px" }}>Free at <a href="https://ntfy.sh" target="_blank" rel="noreferrer" style={{ color: "#a78bfa" }}>ntfy.sh</a> — install app, subscribe to this topic</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={save} disabled={saving} style={{ ...bFill("#a78bfa"), padding: "8px 20px", fontSize: "11px" }}>
          {saving ? "SAVING..." : "💾 SAVE SETTINGS"}
        </button>
        <button onClick={testNow} disabled={testing || !isConfigured} title={!isConfigured ? "Set Anthropic key + email first" : ""} style={{ ...bOut("#a78bfa"), padding: "8px 20px", fontSize: "11px", opacity: isConfigured ? 1 : 0.4 }}>
          {testing ? "RUNNING..." : "▶ TEST BRIEF NOW"}
        </button>
        <span style={{ fontSize: "10px", color: C.dim }}>Runs daily at 7 AM ET · <a href="https://apps.apple.com/app/ntfy/id1625stopping" target="_blank" rel="noreferrer" style={{ color: "#a78bfa" }}>Get ntfy for iPhone →</a></span>
      </div>
      {testResult && (
        <div style={{ marginTop: "12px", padding: "12px", background: C.surf2, borderRadius: "6px", fontSize: "11px", color: testResult.startsWith("✓") ? C.text1 : "#f87171", whiteSpace: "pre-wrap", lineHeight: "1.6" }}>
          {testResult}
        </div>
      )}
    </div>
  );
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState("daily");
  const [tab,setTab]=useState(()=>{ try { const t=new URLSearchParams(window.location.search).get("tab"); return t==="automations"||t==="ask"?t:"kpis"; } catch { return "kpis"; } });   // ?tab= (e.g. back from connecting a service)
  useEffect(()=>{ trackScreen(tab); },[tab]);
  const [kpiRange,setKpiRange]=useState({p:"thismonth"});
  const kr=useMemo(()=>dkRange(kpiRange),[kpiRange]);
  const [kpiRangeOpen,setKpiRangeOpen]=useState(false);
  const [kpiSearch,setKpiSearch]=useState("");
  const [kpiDetail,setKpiDetail]=useState(null);
  const [kpiOrder,setKpiOrder]=useState(()=>{try{return JSON.parse(localStorage.getItem("bt.kpi.order"))||{};}catch{return{};}});
  useEffect(()=>{try{localStorage.setItem("bt.kpi.order",JSON.stringify(kpiOrder));}catch{}},[kpiOrder]);
  // Press-and-drag reordering (mouse: drag; touch: hold ~0.3s, then drag)
  const [drag,setDrag]=useState(null);              // {id,gid,x,y,offX,offY,w}
  const dragRef=useRef({});
  const boardRef=useRef(null);
  const [navOpen,setNavOpen]=useState(false);
  const [kpiHidden,setKpiHidden]=useState(()=>{try{return JSON.parse(localStorage.getItem("bt.kpi.hidden"))||[];}catch{return[];}});
  const [kpiCustOpen,setKpiCustOpen]=useState(false);
  const [kpiGroup,setKpiGroup]=useState("all");
  const [activeSection,setActiveSection]=useState("body");
  const scrollAreaRef=useRef(null);
  const [activeLLM,setActiveLLM]=useState("claude");

  // ── Notes / Journal — persisted to localStorage ──────────────────────────
  const NOTE_TAGS = ["sleep","food","workout","mindset","goals","recovery","body","general"];
  const [notes,setNotes]=useState(()=>{
    try { return JSON.parse(localStorage.getItem("bt_notes")) || []; } catch { return []; }
  });
  useEffect(()=>{ localStorage.setItem("bt_notes", JSON.stringify(notes)); }, [notes]);
  useEffect(()=>{ localStorage.setItem("bt.kpi.hidden", JSON.stringify(kpiHidden)); },[kpiHidden]);

  // Close date picker / customize popover on outside click
  useEffect(()=>{
    if(!kpiRangeOpen&&!kpiCustOpen) return;
    const handler=()=>{setKpiRangeOpen(false);setKpiCustOpen(false);};
    document.addEventListener('click',handler);
    return ()=>document.removeEventListener('click',handler);
  },[kpiRangeOpen,kpiCustOpen]);

  // Track active section via IntersectionObserver
  useEffect(()=>{
    if(tab!=="kpis") return;
    const obs=new IntersectionObserver(entries=>{
      entries.forEach(e=>{ if(e.isIntersecting) setActiveSection(e.target.dataset.section); });
    },{threshold:0.3,rootMargin:"-80px 0px -60% 0px"});
    document.querySelectorAll('[data-section]').forEach(el=>obs.observe(el));
    return ()=>obs.disconnect();
  },[tab,kpiDetail]);

  const [noteDraft,setNoteDraft]=useState({text:"",tags:[],date:""});
  const [noteFilter,setNoteFilter]=useState("all"); // "all" or a tag
  const addNote = () => {
    if(!noteDraft.text.trim()) return;
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const timeStr = now.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
    setNotes(prev => [{
      id: Date.now(),
      text: noteDraft.text.trim(),
      tags: noteDraft.tags.length ? noteDraft.tags : ["general"],
      date: noteDraft.date || dateKey,
      time: timeStr,
      createdAt: now.toISOString(),
    }, ...prev]);
    setNoteDraft({text:"",tags:[],date:""});
  };
  const deleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id));
  // Build notes context string for AI coaches — last 30 days of notes grouped by date
  const buildNotesContext = useCallback(() => {
    if (!notes.length) return "";
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const recent = notes.filter(n => new Date(n.createdAt) >= cutoff);
    if (!recent.length) return "";
    // Group by date
    const byDate = {};
    recent.forEach(n => {
      const d = n.date || n.createdAt.slice(0,10);
      if(!byDate[d]) byDate[d]=[];
      byDate[d].push(n);
    });
    const lines = ["━━ PERSONAL NOTES & JOURNAL (last 30 days) ━━"];
    Object.entries(byDate).sort((a,b)=>b[0].localeCompare(a[0])).forEach(([date,dayNotes])=>{
      lines.push(`▸ ${date}`);
      dayNotes.forEach(n=>{
        lines.push(`  [${n.tags.join(",")}] ${n.text}`);
      });
    });
    return lines.join("\n");
  }, [notes]);
  const [analyses,setAnalyses]=useState({});
  const [workout,setWorkout]=useState("");
  const [loading,setLoading]=useState({});
  const [apiKeys,setApiKeys]=useState({});
  const [keyModal,setKeyModal]=useState(null);
  const [keyDraft,setKeyDraft]=useState("");
  const [liveData,setLiveData]=useState(null);
  const [jsonDraft,setJsonDraft]=useState("");
  const [jsonError,setJsonError]=useState("");
  const [pasteMode,setPasteMode]=useState(false);
  const [manual,setManual]=useState({});
  const [manualDraft,setManualDraft]=useState({});
  const [photos,setPhotos]=useState([]);
  const [photoLabels,setPhotoLabels]=useState([]);
  const [photoAnalysis,setPhotoAnalysis]=useState("");
  const [expanded,setExpanded]=useState({body:true,segmental:true,sleep:true,nutrition:true,mealTiming:true,activity:true,training:true,volByGroup:true,measurements:true});
  const [groupOrder,setGroupOrder]=useState(()=>{
    try { return JSON.parse(localStorage.getItem("bt_group_order")) || GROUPS.map(g=>g.id); }
    catch { return GROUPS.map(g=>g.id); }
  });
  const moveGroup=(id,dir)=>{
    setGroupOrder(prev=>{
      const i=prev.indexOf(id); if(i<0) return prev;
      const ni=i+dir; if(ni<0||ni>=prev.length) return prev;
      const next=[...prev]; [next[i],next[ni]]=[next[ni],next[i]];
      localStorage.setItem("bt_group_order",JSON.stringify(next));
      return next;
    });
  };
  const sortedGroups=groupOrder.map(id=>GROUPS.find(g=>g.id===id)).filter(Boolean);
  const [openPhase,setOpenPhase]=useState(0);
  // API connector state
  const [apiURL,setApiURL]=useState(()=>localStorage.getItem("bt_api_url")||"https://biotrack-api-production.up.railway.app");
  const [apiSecret,setApiSecret]=useState(()=>{ const v=localStorage.getItem("bt_api_secret"); return v&&v!=="lambo"?v:""; });
  const [unlockDraft,setUnlockDraft]=useState("");
  // Owner-only legacy tools (coach, meal planner, habits…) are hidden from everyone else
  const [isOwner,setIsOwner]=useState(false);
  useEffect(()=>{ if(!apiSecret) return; fetch(`${(apiURL||"").replace(/\/sync\/?$/,"")}/me`,{headers:{"x-api-secret":apiSecret}}).then(r=>r.ok?r.json():null).then(j=>setIsOwner(!!j?.user?.owner)).catch(()=>{}); },[apiURL,apiSecret]);
  // Benchmarks cohort (sex + birth year) and crowd opt-in, stored with the dashboard prefs
  const [benchProfile,setBenchProfile]=useState(null), [benchOptIn,setBenchOptIn]=useState(false);
  const saveBench=useCallback(async(profile,optIn)=>{
    setBenchProfile(profile); setBenchOptIn(optIn);
    try{ await fetch(`${(apiURL||"").replace(/\/sync\/?$/,"")}/prefs`,{method:"POST",headers:{"x-api-secret":apiSecret,"Content-Type":"application/json"},body:JSON.stringify({profile,benchmarkOptIn:optIn})}); }catch{}
  },[apiURL,apiSecret]);
  // Profile (onboarding answers) + goal progress, shown on the KPI board
  const [userProfile,setUserProfile]=useState(null);
  const loadProfile=useCallback(async()=>{
    if(!apiSecret) return;
    try{ const r=await fetch(`${(apiURL||"").replace(/\/sync\/?$/,"")}/profile`,{headers:{"x-api-secret":apiSecret}}); if(r.ok) setUserProfile(await r.json()); }catch{}
  },[apiURL,apiSecret]);
  useEffect(()=>{ loadProfile(); },[loadProfile]);
  // Custom KPI sections (created in Ask AI or Automations)
  const [kpiSections,setKpiSections]=useState([]);
  const loadSections=useCallback(async()=>{
    if(!apiSecret) return;
    try{ const r=await fetch(`${(apiURL||"").replace(/\/sync\/?$/,"")}/sections`,{headers:{"x-api-secret":apiSecret}}); if(r.ok) setKpiSections((await r.json()).sections||[]); }catch{}
  },[apiURL,apiSecret]);
  useEffect(()=>{ loadSections(); },[loadSections]);
  // Card order + hidden KPIs live on the server so phone and desktop always match
  const [prefsReady,setPrefsReady]=useState(false);
  useEffect(()=>{
    if(!apiSecret) return; let dead=false; setPrefsReady(false);
    fetch(`${apiURL.replace(/\/sync\/?$/,"")}/prefs`,{headers:{"x-api-secret":apiSecret}})
      .then(r=>r.ok?r.json():null)
      .then(p=>{ if(dead) return;
        if(p&&p.updatedAt){ setKpiOrder(p.kpiOrder||{}); setKpiHidden(p.kpiHidden||[]); setBenchProfile(p.profile||null); setBenchOptIn(!!p.benchmarkOptIn); }
        setPrefsReady(true); })
      .catch(()=>{ if(!dead) setPrefsReady(true); });
    return ()=>{dead=true;};
  },[apiSecret,apiURL]);
  useEffect(()=>{
    if(!prefsReady||!apiSecret) return;
    const t=setTimeout(()=>{
      fetch(`${apiURL.replace(/\/sync\/?$/,"")}/prefs`,{method:"POST",headers:{"x-api-secret":apiSecret,"Content-Type":"application/json"},
        body:JSON.stringify({kpiOrder,kpiHidden})}).catch(()=>{});
    },700);
    return ()=>clearTimeout(t);
  },[kpiOrder,kpiHidden,prefsReady,apiSecret,apiURL]);
  const [apiStatus,setApiStatus]=useState("idle");
  const [apiError,setApiError]=useState("");
  const [showApiSetup,setShowApiSetup]=useState(false);
  const [liveHistory,setLiveHistory]=useState([]); // real 90-day history from API
  const [importMeta,setImportMeta]=useState({}); // { fitbod_last_import, trainerize_last_import, ... }
  const pollRef=useRef(null);
  const fileRef=useRef();

  // ─ API base URL (strip /sync suffix if present)
  const apiBase = useCallback((url) => url.replace(/\/sync\/?$/, ""), []);

  // ─ Fetch latest + history from API
  const fetchFromAPI = useCallback(async (url, secret) => {
    if(!url||!secret) return;
    const base = url.replace(/\/sync\/?$/,"");
    const headers = {"x-api-secret": secret};
    try {
      // Fetch latest snapshot
      const r = await fetch(`${base}/latest`, { headers });
      if(r.status===401) { setApiStatus("error"); setApiError("Wrong secret key — check it matches Railway SECRET_KEY"); return; }
      if(r.status===404) { setApiStatus("polling"); setApiError("Waiting for first iOS sync — open BodyData Health app and tap Sync Now"); return; }
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const latest = await r.json();
      setLiveData(mapImport(latest));
      setApiStatus("live");
      setApiError("");

      // Fetch history in background (non-blocking)
      fetch(`${base}/history?days=20000`, { headers })
        .then(h => h.ok ? h.json() : null)
        .then(h => {
          if(h?.snapshots?.length) {
            setLiveHistory(h.snapshots.map(mapImport));
          }
        })
        .catch(() => {}); // silent — history is bonus

      // Fetch import metadata (last Fitbod/Trainerize import timestamps)
      fetch(`${base}/meta`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(m => { if(m) setImportMeta(m); })
        .catch(() => {}); // silent
    } catch(e) {
      setApiStatus("error");
      const msg = e.message;
      setApiError(msg.includes("fetch")||msg.includes("Load")||msg.includes("network")
        ? "Can't reach API — check your Railway URL"
        : msg);
    }
  }, []);

  useEffect(() => {
    if(!apiURL||!apiSecret) return;
    fetchFromAPI(apiURL, apiSecret);
    pollRef.current = setInterval(()=>fetchFromAPI(apiURL,apiSecret), 120000); // every 2 min
    return () => clearInterval(pollRef.current);
  }, [apiURL, apiSecret, fetchFromAPI]);

  const kpiBoard = useMemo(()=>{
    if(tab!=="kpis") return null;
    const allData=liveHistory.length>0?liveHistory:liveData?[liveData]:(apiSecret?[]:DEMO);
    return buildKpiBoard(allData,kr,kpiSections);
  },[tab,liveHistory,liveData,kr,kpiSections,apiSecret]);
  boardRef.current = kpiBoard;
  const benchDays = useMemo(()=>{
    if(tab!=="benchmarks") return [];
    const m=new Map();
    const src=liveHistory.length>0?liveHistory:liveData?[liveData]:(apiSecret?[]:DEMO);
    for(const d of [...src].sort((a,b)=>String(a._rx||"").localeCompare(String(b._rx||"")))){ const k=dayKey(d); if(k) m.set(k,{...(m.get(k)||{}),...d,date:k}); }
    return [...m.values()];
  },[tab,liveHistory,liveData,apiSecret]);
  const reorderKpi = useCallback((gid, fromId, toId) => {
    setKpiOrder(o => {
      const board = boardRef.current; if (!board?.groups[gid]) return o;
      const saved = o[gid] || []; const pos = id => { const k = saved.indexOf(id); return k < 0 ? 1e6 : k; };
      const ids = board.groups[gid].map((c, k) => [c.id, k]).sort((a, b) => (pos(a[0]) - pos(b[0])) || (a[1] - b[1])).map(x => x[0]);
      const fi = ids.indexOf(fromId), ti = ids.indexOf(toId); if (fi < 0 || ti < 0 || fi === ti) return o;
      ids.splice(fi, 1); ids.splice(ti, 0, fromId);
      return {...o, [gid]: ids};
    });
  }, []);
  const dragStart = useCallback((e, id, gid, kind) => {
    if (kind === "mouse" && e.button !== 0) return;
    const pt = kind === "touch" ? e.touches[0] : e; if (!pt) return;
    const r = e.currentTarget.getBoundingClientRect();
    const d = dragRef.current = {id, gid, kind, sx: pt.clientX, sy: pt.clientY, offX: pt.clientX - r.left, offY: pt.clientY - r.top, w: r.width, active: false, last: id};
    const activate = () => { d.active = true; setDrag({id, gid, x: d.sx, y: d.sy, offX: d.offX, offY: d.offY, w: d.w}); try { navigator.vibrate?.(12); } catch {} };
    if (kind === "touch") d.timer = setTimeout(activate, 300);
    let raf = 0;
    const autoscroll = (y) => {
      cancelAnimationFrame(raf); const el = scrollAreaRef.current; if (!el || !d.active) return;
      const b = el.getBoundingClientRect(), edge = 70;
      const v = y < b.top + edge ? -Math.ceil((b.top + edge - y) / 6) : y > b.bottom - edge ? Math.ceil((y - (b.bottom - edge)) / 6) : 0;
      if (v) { el.scrollTop += v; raf = requestAnimationFrame(() => autoscroll(d.y)); }
    };
    const move = (ev) => {
      const p = kind === "touch" ? ev.touches[0] : ev; if (!p) return;
      if (!d.active) {
        const dist = Math.hypot(p.clientX - d.sx, p.clientY - d.sy);
        if (kind === "mouse" && dist > 6) activate();
        else if (kind === "touch" && dist > 10) { clearTimeout(d.timer); end(); return; }   // it was a scroll
        if (!d.active) return;
      }
      if (ev.cancelable) ev.preventDefault();
      d.y = p.clientY;
      setDrag(g => g && {...g, x: p.clientX, y: p.clientY});
      const hit = document.elementFromPoint(p.clientX, p.clientY)?.closest?.("[data-kcard]");
      const to = hit?.getAttribute("data-kcard");
      if (to && to !== d.id && hit.getAttribute("data-gid") === d.gid && to !== d.last) { d.last = to; reorderKpi(d.gid, d.id, to); }
      else if (to === d.id) d.last = d.id;
      autoscroll(p.clientY);
    };
    const end = () => {
      clearTimeout(d.timer); cancelAnimationFrame(raf);
      window.removeEventListener(kind === "touch" ? "touchmove" : "mousemove", move);
      window.removeEventListener(kind === "touch" ? "touchend" : "mouseup", end);
      window.removeEventListener("touchcancel", end);
      if (d.active) { d.suppress = true; setTimeout(() => { d.suppress = false; }, 80); }
      d.active = false; setDrag(null);
    };
    window.addEventListener(kind === "touch" ? "touchmove" : "mousemove", move, {passive: false});
    window.addEventListener(kind === "touch" ? "touchend" : "mouseup", end);
    if (kind === "touch") window.addEventListener("touchcancel", end);
  }, [reorderKpi]);

  const saveAPIConfig = (url, secret) => {
    localStorage.setItem("bt_api_url", url);
    localStorage.setItem("bt_api_secret", secret);
    setApiURL(url); setApiSecret(secret);
    setShowApiSetup(false);
    setApiStatus("polling");
    fetchFromAPI(url, secret);
  };

  // Find today's actual data — prefer liveData if it's from today, else check history
  const today = (() => {
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const parseSyncDate = (s) => {
      const d = parseSyncDateRobust(s);
      if (!d) return null;
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    };
    // Check if liveData is from today
    if(liveData && parseSyncDate(liveData.syncDate) === nowKey) return { ...liveData };
    // Search history for today's entry
    const todayInHistory = (liveHistory||[]).find(h => parseSyncDate(h.syncDate) === nowKey);
    if(todayInHistory) return { ...todayInHistory, ...(liveData && parseSyncDate(liveData.syncDate) === nowKey ? liveData : {}) };
    // Fall back to liveData even if stale (for KPI display)
    return liveData ? { ...liveData } : {};
  })();

  const importJSON = () => {
    setJsonError("");
    try {
      setLiveData(mapImport(JSON.parse(jsonDraft)));
      setJsonDraft(""); setPasteMode(false); setTab("dashboard");
    } catch(e) { setJsonError("Invalid JSON — copy the Dictionary text from your Shortcut and paste it here."); }
  };

  // Build complete 30-day history — every non-null field for every day.
  // One structured block per day so the AI has the full picture.
  const buildHistory = useCallback((coachId) => {
    const rawHist = (liveHistory && liveHistory.length > 0 ? liveHistory : DEMO).slice(0, 30);
    if (!rawHist.length) return "";

    // Apply the same body-comp carry-forward suppression used in the table display.
    // hist[0] = newest, hist[i+1] = older. If a value equals the next (older) day's value
    // and no bodyCompMeasuredDate proves it was actually taken that day, it's carry-forward.
    const BODY_CF = ["weight","bodyFat","fatMass","leanMass","bmi","fatMass","muscleMass","boneMass","waistCircumference"];
    const hist = rawHist.map((h, i) => {
      const older = rawHist[i + 1];
      const patch = {};
      for (const k of BODY_CF) {
        const v = h[k];
        if (typeof v !== "number") continue;
        const mDate = h.bodyCompMeasuredDate;
        const sDate = h.syncDate;
        if (mDate && sDate && mDate !== sDate) { patch[k] = undefined; continue; }
        if (!mDate && older && typeof older[k] === "number" && v === older[k]) { patch[k] = undefined; }
      }
      return Object.keys(patch).length ? { ...h, ...patch } : h;
    });

    if (!hist.length) return "";
    const f1  = v => (v===null||v===undefined||isNaN(Number(v))) ? null : Number(v).toFixed(1);
    const fi  = v => (v===null||v===undefined||isNaN(Number(v))) ? null : String(Math.round(Number(v)));
    const avg = arr => arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(1) : "—";

    // ── 30-day aggregate stats ──────────────────────────────────────────────
    const pull  = (key) => hist.map(h=>h[key]).filter(v=>v!==null&&v!==undefined&&!isNaN(Number(v))).map(Number);
    const wtArr = pull("weight"), bfArr = pull("bodyFat"), leArr = pull("leanMass");
    const mgVol = {Chest:0,Back:0,Shoulders:0,Biceps:0,Triceps:0,Legs:0,Core:0};
    hist.forEach(h=>{ for(const mg of Object.keys(mgVol)){ const k="vol"+mg; if(h[k]) mgVol[mg]+=Number(h[k]); }});
    const mgStr = Object.entries(mgVol).filter(([,v])=>v>0).map(([k,v])=>`${k}:${Math.round(v).toLocaleString()}`).join(" | ");
    const wkCnt = hist.filter(h=>h.workoutType&&h.workoutType!=="Rest").length;

    const stats = [
      `BODY COMP:  Weight ${wtArr.length?wtArr[wtArr.length-1].toFixed(1):"—"}→${wtArr.length?wtArr[0].toFixed(1):"—"} lbs | BF ${bfArr.length?bfArr[bfArr.length-1].toFixed(1):"—"}→${bfArr.length?bfArr[0].toFixed(1):"—"}% | Lean ${leArr.length?leArr[leArr.length-1].toFixed(1):"—"}→${leArr.length?leArr[0].toFixed(1):"—"} lbs (oldest→newest)`,
      `SLEEP:      Avg score ${avg(pull("sleepScore"))}/100 | Avg ${avg(pull("sleepDur"))}h | Avg deep ${avg(pull("deepSleep"))}h | Avg REM ${avg(pull("remSleep"))}h`,
      `RECOVERY:   Avg HRV ${avg(pull("hrv"))}ms (best ${pull("hrv").length?Math.max(...pull("hrv")):"—"}, worst ${pull("hrv").length?Math.min(...pull("hrv")):"—"}) | Avg Readiness ${avg(pull("readiness"))}/100`,
      `NUTRITION:  Avg ${avg(pull("calories"))} kcal | Avg protein ${avg(pull("protein"))}g | Avg carbs ${avg(pull("carbs"))}g | Avg fat ${avg(pull("fat"))}g`,
      `ACTIVITY:   Avg ${Math.round(Number(avg(pull("steps")))||0).toLocaleString()} steps/day | Avg ${avg(pull("calsBurned"))} kcal burned`,
      `TRAINING:   ${wkCnt} workouts in 30 days | Avg vol ${avg(pull("workoutVol").filter(v=>v>0))} lbs/session`,
      mgStr ? `MUSCLE VOL: ${mgStr}` : null,
    ].filter(Boolean).join("\n");

    // ── Per-day full data blocks ────────────────────────────────────────────
    // Every non-null field is emitted; fields are grouped by source for readability
    const dayBlocks = hist.map(h => {
      const lines = [`▸ ${h.syncDate||"unknown date"}`];

      // Body composition
      const body = [
        h.weight     ? `weight:${f1(h.weight)}lbs`       : null,
        h.bodyFat    ? `bodyFat:${f1(h.bodyFat)}%`        : null,
        h.leanMass   ? `lean:${f1(h.leanMass)}lbs`        : null,
        h.fatMass    ? `fatMass:${f1(h.fatMass)}lbs`      : null,
        h.muscleMass ? `muscle:${f1(h.muscleMass)}lbs`    : null,
        h.bmi        ? `bmi:${f1(h.bmi)}`                 : null,
        h.visceralFat? `viscFat:${fi(h.visceralFat)}`     : null,
        h.bmr        ? `bmr:${fi(h.bmr)}kcal`             : null,
        h.metabolicAge?`metAge:${fi(h.metabolicAge)}yrs`  : null,
      ].filter(Boolean);
      if (body.length) lines.push(`  BODY:      ${body.join(" | ")}`);

      // Segmental fat
      const seg = [
        h.trunkFat    ? `trunk:${f1(h.trunkFat)}%`        : null,
        h.rightArmFat ? `rArm:${f1(h.rightArmFat)}%`      : null,
        h.leftArmFat  ? `lArm:${f1(h.leftArmFat)}%`       : null,
        h.rightLegFat ? `rLeg:${f1(h.rightLegFat)}%`      : null,
        h.leftLegFat  ? `lLeg:${f1(h.leftLegFat)}%`       : null,
        h.trunkMuscle    ? `trunkMuscle:${f1(h.trunkMuscle)}lbs`       : null,
        h.rightArmMuscle ? `rArmMuscle:${f1(h.rightArmMuscle)}lbs`     : null,
        h.leftArmMuscle  ? `lArmMuscle:${f1(h.leftArmMuscle)}lbs`      : null,
        h.rightLegMuscle ? `rLegMuscle:${f1(h.rightLegMuscle)}lbs`     : null,
        h.leftLegMuscle  ? `lLegMuscle:${f1(h.leftLegMuscle)}lbs`      : null,
      ].filter(Boolean);
      if (seg.length) lines.push(`  SEGMENTAL: ${seg.join(" | ")}`);

      // Sleep & recovery
      const sleep = [
        h.sleepScore    ? `score:${fi(h.sleepScore)}/100`      : null,
        h.sleepDur      ? `dur:${f1(h.sleepDur)}h`             : null,
        h.deepSleep     ? `deep:${f1(h.deepSleep)}h`           : null,
        h.remSleep      ? `rem:${f1(h.remSleep)}h`             : null,
        h.lightSleep    ? `light:${f1(h.lightSleep)}h`         : null,
        h.hrv           ? `hrv:${fi(h.hrv)}ms`                 : null,
        h.restingHR     ? `rhr:${fi(h.restingHR)}bpm`          : null,
        h.readiness     ? `readiness:${fi(h.readiness)}/100`   : null,
        h.respiratoryRate?`respRate:${f1(h.respiratoryRate)}`  : null,
        h.spo2          ? `spo2:${f1(h.spo2)}%`               : null,
        h.sleepingWristTemp?`wristTemp:${f1(h.sleepingWristTemp)}°C`: null,
      ].filter(Boolean);
      if (sleep.length) lines.push(`  SLEEP:     ${sleep.join(" | ")}`);

      // Nutrition
      const nutr = [
        h.calories    ? `cals:${fi(h.calories)}kcal`       : null,
        h.protein     ? `protein:${fi(h.protein)}g`        : null,
        h.carbs       ? `carbs:${fi(h.carbs)}g`            : null,
        h.fat         ? `fat:${fi(h.fat)}g`                : null,
        h.fiber       ? `fiber:${fi(h.fiber)}g`            : null,
        h.sugar       ? `sugar:${fi(h.sugar)}g`            : null,
        h.saturatedFat? `satFat:${fi(h.saturatedFat)}g`    : null,
        h.sodium      ? `sodium:${fi(h.sodium)}mg`         : null,
        h.potassium   ? `potassium:${fi(h.potassium)}mg`   : null,
        h.water       ? `water:${f1(h.water)}L`            : null,
      ].filter(Boolean);
      if (nutr.length) lines.push(`  NUTRITION: ${nutr.join(" | ")}`);

      // Meal timing
      const mealT = [
        h.breakfastTime ? `breakfast@${h.breakfastTime}${h.breakfastCals?`(${fi(h.breakfastCals)}kcal)`:""}` : null,
        h.lunchTime     ? `lunch@${h.lunchTime}${h.lunchCals?`(${fi(h.lunchCals)}kcal)`:""}` : null,
        h.dinnerTime    ? `dinner@${h.dinnerTime}${h.dinnerCals?`(${fi(h.dinnerCals)}kcal)`:""}` : null,
        h.lastMealTime  ? `lastMeal@${h.lastMealTime}` : null,
        h.snackCals     ? `snacks:${fi(h.snackCals)}kcal` : null,
      ].filter(Boolean);
      if (mealT.length) lines.push(`  MEAL TIMING: ${mealT.join(" | ")}`);

      // Activity
      const act = [
        h.steps          ? `steps:${Math.round(Number(h.steps)).toLocaleString()}` : null,
        h.calsBurned     ? `burned:${fi(h.calsBurned)}kcal`     : null,
        h.activeMins     ? `activeMins:${fi(h.activeMins)}`     : null,
        h.avgHR          ? `avgHR:${fi(h.avgHR)}bpm`            : null,
        h.standHours     ? `stand:${fi(h.standHours)}hrs`       : null,
        h.flightsClimbed ? `flights:${fi(h.flightsClimbed)}`    : null,
        h.vo2max         ? `vo2max:${f1(h.vo2max)}`             : null,
      ].filter(Boolean);
      if (act.length) lines.push(`  ACTIVITY:  ${act.join(" | ")}`);

      // Training
      const trn = [
        h.workoutType        ? `type:${h.workoutType}`                      : null,
        h.workoutVol>0       ? `vol:${Math.round(Number(h.workoutVol)).toLocaleString()}lbs` : null,
        h.workoutDur         ? `dur:${fi(h.workoutDur)}min`                 : null,
        h.fitbodSets         ? `sets:${fi(h.fitbodSets)}`                   : null,
        h.fitbodWorkingSets  ? `workSets:${fi(h.fitbodWorkingSets)}`        : null,
        h.fitbodTotalReps    ? `reps:${fi(h.fitbodTotalReps)}`              : null,
        h.fitbodExerciseCount? `exercises:${fi(h.fitbodExerciseCount)}`     : null,
        h.fitbodMaxWeightLbs ? `maxWeight:${f1(h.fitbodMaxWeightLbs)}lbs`  : null,
        h.fitbodMuscleGroups ? `muscleGroups:${h.fitbodMuscleGroups}`       : null,
      ].filter(Boolean);
      if (trn.length) lines.push(`  TRAINING:  ${trn.join(" | ")}`);

      // Body measurements
      const meas = [
        h.waistIn      ? `waist:${f1(h.waistIn)}"`      : null,
        h.chestIn      ? `chest:${f1(h.chestIn)}"`      : null,
        h.hipsIn       ? `hips:${f1(h.hipsIn)}"`        : null,
        h.shouldersIn  ? `shoulders:${f1(h.shouldersIn)}"` : null,
        h.rightBicepIn ? `rBicep:${f1(h.rightBicepIn)}"` : null,
        h.leftBicepIn  ? `lBicep:${f1(h.leftBicepIn)}"` : null,
        h.rightThighIn ? `rThigh:${f1(h.rightThighIn)}"` : null,
        h.leftThighIn  ? `lThigh:${f1(h.leftThighIn)}"` : null,
        h.rightCalfIn  ? `rCalf:${f1(h.rightCalfIn)}"`  : null,
        h.leftCalfIn   ? `lCalf:${f1(h.leftCalfIn)}"`   : null,
      ].filter(Boolean);
      if (meas.length) lines.push(`  MEASUREMENTS: ${meas.join(" | ")}`);

      // Per-muscle-group volume (only show groups with data)
      const mgLine = [
        ["Chest",     h.volChest,     h.repsChest,     h.setsChest,     h.maxChest],
        ["Back",      h.volBack,      h.repsBack,       h.setsBack,      h.maxBack],
        ["Shoulders", h.volShoulders, h.repsShoulders,  h.setsShoulders, h.maxShoulders],
        ["Biceps",    h.volBiceps,    h.repsBiceps,     h.setsBiceps,    h.maxBiceps],
        ["Triceps",   h.volTriceps,   h.repsTriceps,    h.setsTriceps,   h.maxTriceps],
        ["Legs",      h.volLegs,      h.repsLegs,       h.setsLegs,      h.maxLegs],
        ["Core",      h.volCore,      h.repsCore,       h.setsCore,      h.maxCore],
      ].filter(([,vol])=>vol>0).map(([mg,vol,reps,sets,max])=>
        `${mg}[vol:${Math.round(vol).toLocaleString()}lbs${reps?` reps:${reps}`:""}${sets?` sets:${sets}`:""}${max?` max:${max}lbs`:""}]`
      ).join(" ");
      if (mgLine) lines.push(`  MG VOLUME: ${mgLine}`);

      return lines.join("\n");
    }).join("\n");

    // Coach-specific focus note
    const focus = {
      workout:  "COACHING FOCUS: Recovery (HRV/sleep/readiness) sets today's intensity ceiling. Protein + calories determine muscle retention. Training history and per-muscle-group volume reveal what needs priority.",
      food:     "COACHING FOCUS: Training days need higher carbs/protein. Sleep quality correlates with cravings and adherence. Steps + cals burned determine the deficit. Body weight and BF% trend validate the plan.",
      sleep:    "COACHING FOCUS: Training volume and timing affect sleep architecture. Caloric deficit depth impacts sleep quality. Body fat % affects hormones and deep sleep. Identify what behaviors preceded best/worst nights.",
      progress: "COACHING FOCUS: Every metric feeds the 10% BF goal. Find the correlations — what combinations of sleep, nutrition, training, and recovery produce the fastest body recomposition?",
    };

    return `━━ COMPLETE 30-DAY BIOMETRIC DATA ━━
${focus[coachId]||focus.progress}

30-DAY SUMMARY STATS:
${stats}

━━ DAILY DETAIL (newest first) ━━
${dayBlocks}`;
  }, [liveHistory]);

  // ctx(coachId) — today's snapshot + 30-day coach-specific history table
  const ctx = useCallback((coachId) => {
    const d = { ...today, ...manual };
    const seg = [
      d.trunkFat    ? `Trunk ${d.trunkFat}%`    : null,
      d.rightArmFat ? `R.Arm ${d.rightArmFat}%` : null,
      d.leftArmFat  ? `L.Arm ${d.leftArmFat}%`  : null,
      d.rightLegFat ? `R.Leg ${d.rightLegFat}%` : null,
      d.leftLegFat  ? `L.Leg ${d.leftLegFat}%`  : null,
    ].filter(Boolean).join(" | ");
    const mus = [
      d.trunkMuscle    ? `Trunk ${d.trunkMuscle}lbs`    : null,
      d.rightArmMuscle ? `R.Arm ${d.rightArmMuscle}lbs` : null,
      d.leftArmMuscle  ? `L.Arm ${d.leftArmMuscle}lbs`  : null,
      d.rightLegMuscle ? `R.Leg ${d.rightLegMuscle}lbs` : null,
      d.leftLegMuscle  ? `L.Leg ${d.leftLegMuscle}lbs`  : null,
    ].filter(Boolean).join(" | ");
    const measurementFields = [
      d.waistIn      ? `Waist ${d.waistIn}"`      : null,
      d.chestIn      ? `Chest ${d.chestIn}"`      : null,
      d.hipsIn       ? `Hips ${d.hipsIn}"`        : null,
      d.shouldersIn  ? `Shoulders ${d.shouldersIn}"` : null,
      d.rightBicepIn ? `R.Bicep ${d.rightBicepIn}"` : null,
      d.leftBicepIn  ? `L.Bicep ${d.leftBicepIn}"` : null,
      d.rightThighIn ? `R.Thigh ${d.rightThighIn}"` : null,
      d.leftThighIn  ? `L.Thigh ${d.leftThighIn}"` : null,
      d.rightCalfIn  ? `R.Calf ${d.rightCalfIn}"`  : null,
      d.leftCalfIn   ? `L.Calf ${d.leftCalfIn}"`   : null,
    ].filter(Boolean).join(" | ");
    const snapshot = `━━ TODAY'S SNAPSHOT ${liveData?"[LIVE]":"[DEMO]"} ━━
BODY (Hume): Weight ${d.weight}lbs | Body Fat ${d.bodyFat}% | Lean Mass ${d.leanMass}lbs | BMI ${d.bmi||"—"} | Visceral Fat ${d.visceralFat||"—"}
SEGMENTAL FAT: ${seg||"not yet entered — remind user to log Hume scan"}
SEGMENTAL MUSCLE: ${mus||"not yet entered"}
MEASUREMENTS: ${measurementFields||"not yet entered — add in Manual tab"}
SLEEP (Oura): Score ${d.sleepScore}/100 | ${d.sleepDur}h total | Deep ${d.deepSleep}h | REM ${d.remSleep}h | HRV ${d.hrv}ms | RHR ${d.restingHR}bpm | Readiness ${d.readiness}/100
NUTRITION (MFP): ${d.calories}kcal | Protein ${d.protein}g | Carbs ${d.carbs}g | Fat ${d.fat}g | Fiber ${d.fiber}g | Water ${d.water}L
MEAL TIMING: Breakfast ${d.breakfastTime||"—"} ${d.breakfastCals?`(${d.breakfastCals}kcal)`:""}| Lunch ${d.lunchTime||"—"} ${d.lunchCals?`(${d.lunchCals}kcal)`:""}| Dinner ${d.dinnerTime||"—"} ${d.dinnerCals?`(${d.dinnerCals}kcal)`:""}| Last meal ${d.lastMealTime||"—"} | Snacks ${d.snackCals||"—"}kcal
ACTIVITY (Apple): ${Number(d.steps).toLocaleString()} steps | ${d.calsBurned}kcal burned | Avg HR ${d.avgHR}bpm | VO2 ${d.vo2max}
TRAINING: ${d.workoutType||"Rest"} ${d.workoutDur?d.workoutDur+"min":""} | Volume ${d.workoutVol?Math.round(d.workoutVol).toLocaleString()+"lbs":"—"} | Sets ${d.fitbodSets||"—"} | Reps ${d.fitbodTotalReps||"—"} | Max ${d.fitbodMaxWeightLbs||"—"}lbs
GOAL: Minimize body fat → 10%, preserve lean mass. Vegan athlete.`;
    const history = buildHistory(coachId||"progress");
    const notesCtx = buildNotesContext();
    return `${snapshot}\n\n${history}${notesCtx?`\n\n${notesCtx}`:""}`;
  },[today,manual,liveData,buildHistory,buildNotesContext]);

  const [claudeKey,setClaudeKey]=useState(()=>localStorage.getItem("bt_claude_key")||"");
  const [changingKey,setChangingKey]=useState(false);
  const [newKeyDraft,setNewKeyDraft]=useState("");
  // Generate a complete CSV of all 30-day data — every field, every source.
  // Used as a document attachment for Claude and embedded as text for other LLMs.
  const buildCSV30 = useCallback(() => {
    const hist = (liveHistory && liveHistory.length > 0 ? liveHistory : DEMO).slice(0, 30);
    const FIELDS = [
      // Identity
      {k:"syncDate",l:"Date"},{k:"dow",l:"Day of Week"},
      // Body composition (Hume)
      {k:"weight",l:"Weight (lbs)"},{k:"bodyFat",l:"Body Fat %"},{k:"leanMass",l:"Lean Mass (lbs)"},
      {k:"fatMass",l:"Fat Mass (lbs)"},{k:"muscleMass",l:"Muscle Mass (lbs)"},{k:"muscleRate",l:"Muscle Rate %"},
      {k:"bmi",l:"BMI"},{k:"visceralFat",l:"Visceral Fat"},{k:"subcutaneousFat",l:"Subcutaneous Fat"},
      {k:"boneMass",l:"Bone Mass (lbs)"},{k:"proteinMass",l:"Protein Mass (lbs)"},
      {k:"moisture",l:"Body Water %"},{k:"bmr",l:"BMR (kcal)"},{k:"metabolicAge",l:"Metabolic Age (yrs)"},
      // Segmental fat (Hume)
      {k:"trunkFat",l:"Trunk Fat %"},{k:"rightArmFat",l:"Right Arm Fat %"},
      {k:"leftArmFat",l:"Left Arm Fat %"},{k:"rightLegFat",l:"Right Leg Fat %"},{k:"leftLegFat",l:"Left Leg Fat %"},
      // Segmental muscle (Hume)
      {k:"trunkMuscle",l:"Trunk Muscle (lbs)"},{k:"rightArmMuscle",l:"Right Arm Muscle (lbs)"},
      {k:"leftArmMuscle",l:"Left Arm Muscle (lbs)"},{k:"rightLegMuscle",l:"Right Leg Muscle (lbs)"},{k:"leftLegMuscle",l:"Left Leg Muscle (lbs)"},
      // Sleep & recovery (Oura)
      {k:"sleepScore",l:"Sleep Score (/100)"},{k:"sleepDur",l:"Sleep Duration (h)"},
      {k:"deepSleep",l:"Deep Sleep (h)"},{k:"remSleep",l:"REM Sleep (h)"},{k:"lightSleep",l:"Light Sleep (h)"},
      {k:"hrv",l:"HRV (ms)"},{k:"restingHR",l:"Resting HR (bpm)"},{k:"readiness",l:"Readiness (/100)"},
      {k:"respiratoryRate",l:"Respiratory Rate"},{k:"spo2",l:"SpO2 %"},{k:"sleepingWristTemp",l:"Wrist Temp (deg C)"},
      // Nutrition (MyFitnessPal)
      {k:"calories",l:"Calories (kcal)"},{k:"protein",l:"Protein (g)"},{k:"carbs",l:"Carbs (g)"},
      {k:"fat",l:"Fat (g)"},{k:"fiber",l:"Fiber (g)"},{k:"sugar",l:"Sugar (g)"},
      {k:"saturatedFat",l:"Saturated Fat (g)"},{k:"sodium",l:"Sodium (mg)"},{k:"potassium",l:"Potassium (mg)"},
      {k:"calcium",l:"Calcium (mg)"},{k:"iron",l:"Iron (mg)"},{k:"vitaminC",l:"Vitamin C (mg)"},
      {k:"water",l:"Water (L)"},
      // Activity (Apple Health)
      {k:"steps",l:"Steps"},{k:"calsBurned",l:"Cals Burned (kcal)"},{k:"activeMins",l:"Active Mins"},
      {k:"avgHR",l:"Avg Heart Rate (bpm)"},{k:"standHours",l:"Stand Hours"},
      {k:"flightsClimbed",l:"Flights Climbed"},{k:"vo2max",l:"VO2 Max"},
      // Training (Fitbod)
      {k:"workoutType",l:"Workout Type"},{k:"fitbodMuscleGroups",l:"Muscle Groups"},
      {k:"workoutVol",l:"Total Volume (lbs)"},{k:"workoutDur",l:"Duration (min)"},
      {k:"fitbodSets",l:"Total Sets"},{k:"fitbodWorkingSets",l:"Working Sets"},
      {k:"fitbodWarmupSets",l:"Warmup Sets"},{k:"fitbodTotalReps",l:"Total Reps"},
      {k:"fitbodExerciseCount",l:"Exercise Count"},{k:"fitbodMaxWeightLbs",l:"Max Weight (lbs)"},
      // Body measurements (inches)
      {k:"waistIn",l:"Waist (in)"},{k:"chestIn",l:"Chest (in)"},{k:"hipsIn",l:"Hips (in)"},
      {k:"neckIn",l:"Neck (in)"},{k:"shouldersIn",l:"Shoulders (in)"},
      {k:"rightBicepIn",l:"Right Bicep (in)"},{k:"leftBicepIn",l:"Left Bicep (in)"},
      {k:"rightForearmIn",l:"Right Forearm (in)"},{k:"leftForearmIn",l:"Left Forearm (in)"},
      {k:"rightThighIn",l:"Right Thigh (in)"},{k:"leftThighIn",l:"Left Thigh (in)"},
      {k:"rightCalfIn",l:"Right Calf (in)"},{k:"leftCalfIn",l:"Left Calf (in)"},
      // Meal timing (manual)
      {k:"breakfastTime",l:"Breakfast Time"},{k:"lunchTime",l:"Lunch Time"},
      {k:"dinnerTime",l:"Dinner Time"},{k:"lastMealTime",l:"Last Meal Time"},
      {k:"breakfastCals",l:"Breakfast Cals (kcal)"},{k:"lunchCals",l:"Lunch Cals (kcal)"},
      {k:"dinnerCals",l:"Dinner Cals (kcal)"},{k:"snackCals",l:"Snack Cals (kcal)"},
      // Per-muscle volume (Fitbod)
      {k:"volChest",l:"Chest Vol (lbs)"},{k:"repsChest",l:"Chest Reps"},{k:"setsChest",l:"Chest Sets"},{k:"maxChest",l:"Chest Max (lbs)"},
      {k:"volBack",l:"Back Vol (lbs)"},{k:"repsBack",l:"Back Reps"},{k:"setsBack",l:"Back Sets"},{k:"maxBack",l:"Back Max (lbs)"},
      {k:"volShoulders",l:"Shoulders Vol (lbs)"},{k:"repsShoulders",l:"Shoulders Reps"},{k:"setsShoulders",l:"Shoulders Sets"},{k:"maxShoulders",l:"Shoulders Max (lbs)"},
      {k:"volBiceps",l:"Biceps Vol (lbs)"},{k:"repsBiceps",l:"Biceps Reps"},{k:"setsBiceps",l:"Biceps Sets"},{k:"maxBiceps",l:"Biceps Max (lbs)"},
      {k:"volTriceps",l:"Triceps Vol (lbs)"},{k:"repsTriceps",l:"Triceps Reps"},{k:"setsTriceps",l:"Triceps Sets"},{k:"maxTriceps",l:"Triceps Max (lbs)"},
      {k:"volLegs",l:"Legs Vol (lbs)"},{k:"repsLegs",l:"Legs Reps"},{k:"setsLegs",l:"Legs Sets"},{k:"maxLegs",l:"Legs Max (lbs)"},
      {k:"volCore",l:"Core Vol (lbs)"},{k:"repsCore",l:"Core Reps"},{k:"setsCore",l:"Core Sets"},{k:"maxCore",l:"Core Max (lbs)"},
    ];
    const esc = v => { if(v===null||v===undefined) return ""; const s=String(v); return (s.includes(",")||s.includes('"')||s.includes("\n"))?`"${s.replace(/"/g,'""')}"`:`s`; };
    const header = FIELDS.map(f=>f.l).join(",");
    const rows = hist.map(h => FIELDS.map(f => { const v=h[f.k]; return (v===null||v===undefined)?"":String(v); }).join(","));
    return [header,...rows].join("\n");
  }, [liveHistory]);

  // ── Per-source last-seen dates — derived from liveHistory ─────────────────
  // For auto-synced sources (Oura, MFP, Apple, Hume) we derive the most recent
  // day that source contributed data. For FITBOD we prefer the explicit
  // import timestamp from importMeta (set by the import script).
  const SOURCE_SIGNAL = {
    "HUME":          h => h.weight>0 || h.bodyFat>0,
    "OURA":          h => h.sleepScore>0 || h.hrv>0,
    "MYFITNESSPAL":  h => h.calories>0 || h.protein>0,
    "APPLE HEALTH":  h => h.steps>0 || h.calsBurned>0,
    "FITBOD":        h => h.fitbodSets>0 || h.workoutVol>0,
    "MANUAL":        h => h.waistIn>0 || h.chestIn>0 || h.trunkFat>0,
  };
  // Staleness thresholds (days) — warn if last seen more than N days ago
  const SOURCE_STALE = {
    "HUME":14, "OURA":2, "MYFITNESSPAL":2, "APPLE HEALTH":2, "FITBOD":7, "MANUAL":30,
  };

  const sourceMeta = useMemo(() => {
    const hist = liveHistory && liveHistory.length > 0 ? liveHistory : [];
    const result = {};
    for (const [src, signal] of Object.entries(SOURCE_SIGNAL)) {
      // For FITBOD: prefer the explicit import timestamp from /meta API
      if (src === "FITBOD" && importMeta.fitbod_last_import) {
        result[src] = {
          lastDate:   importMeta.fitbod_newest_date || null,
          lastRun:    importMeta.fitbod_last_import,   // ISO timestamp of import script
          daysAgo:    Math.floor((Date.now() - new Date(importMeta.fitbod_last_import).getTime()) / 86400000),
          source:     "import",
          extra:      importMeta.fitbod_date_range || null,
        };
        continue;
      }
      // For all others: find most recent history entry that has this source's data
      const match = hist.find(h => signal(h));
      if (!match) { result[src] = null; continue; }
      // Derive a date key from the entry
      const raw = match.syncDate || match.date || null;
      let dateKey = null;
      if (raw) {
        const p = parseSyncDateRobust(raw);
        if (p) dateKey = `${p.getFullYear()}-${String(p.getMonth()+1).padStart(2,"0")}-${String(p.getDate()).padStart(2,"0")}`;
      }
      const daysAgo = dateKey ? Math.floor((Date.now() - new Date(dateKey).getTime()) / 86400000) : null;
      result[src] = { lastDate: dateKey, daysAgo, source: "history" };
    }
    return result;
  }, [liveHistory, importMeta]); // eslint-disable-line react-hooks/exhaustive-deps

  // callClaude: when csvData is provided, sends it as a proper document attachment
  // so Claude can reference it as a structured file (not just text in the prompt).
  const callClaude = async (sys, prompt, csvData) => {
    const key = claudeKey;
    if(!key) throw new Error("Enter your Anthropic API key in the AI Coach tab to enable Claude");
    let userContent;
    if (csvData) {
      // Encode CSV as base64 for document attachment
      const bytes = new TextEncoder().encode(csvData);
      const binStr = Array.from(bytes, b => String.fromCharCode(b)).join("");
      const b64 = btoa(binStr);
      userContent = [
        {
          type: "document",
          source: { type: "base64", media_type: "text/plain", data: b64 },
          title: "BodyData — Last 30 Days Complete Biometric Data",
          context: "All sources: Hume Body Pod (body comp + segmental fat/muscle), Oura Ring (sleep + HRV + readiness), MyFitnessPal (nutrition), Apple Health (activity + steps), Fitbod (training + per-muscle-group volume). Goal: minimize body fat to 10%, preserve lean mass. Vegan athlete.",
        },
        { type: "text", text: prompt },
      ];
    } else {
      userContent = prompt;
    }
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:2000,system:sys,messages:[{role:"user",content:userContent}]})});
    const j=await r.json(); if(j.error)throw new Error(j.error.message); return j.content[0].text;
  };
  const callGPT = async (sys,prompt,key) => {
    const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
      body:JSON.stringify({model:"gpt-4o",messages:[{role:"system",content:sys},{role:"user",content:prompt}]})});
    const j=await r.json(); if(j.error)throw new Error(j.error.message); return j.choices[0].message.content;
  };

  // Grok — xAI API (OpenAI-compatible endpoint)
  const callGrok = async (sys,prompt,key) => {
    const r=await fetch("https://api.x.ai/v1/chat/completions",{method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
      body:JSON.stringify({model:"grok-3",messages:[{role:"system",content:sys},{role:"user",content:prompt}]})});
    const j=await r.json(); if(j.error)throw new Error(j.error.message||j.error); return j.choices[0].message.content;
  };

  // Gemini — Google Generative Language API
  const callGemini = async (sys,prompt,key) => {
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        system_instruction:{parts:[{text:sys}]},
        contents:[{role:"user",parts:[{text:prompt}]}],
        generationConfig:{maxOutputTokens:2000},
      })});
    const j=await r.json();
    if(j.error) throw new Error(j.error.message||JSON.stringify(j.error));
    return j.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
  };

  // ── Multi-turn chat variants — accept full messages[] array ───────────────
  const callClaudeChat = async (sys, messages) => {
    const key = claudeKey;
    if(!key) throw new Error("Enter your Anthropic API key to use Claude");
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:2000,system:sys,
        messages:messages.map(m=>({role:m.role,content:m.content}))})});
    const j=await r.json(); if(j.error)throw new Error(j.error.message||JSON.stringify(j.error));
    return j.content[0].text;
  };
  const callGPTChat = async (sys, messages, key) => {
    const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
      body:JSON.stringify({model:"gpt-4o",messages:[{role:"system",content:sys},...messages.map(m=>({role:m.role,content:m.content}))]})});
    const j=await r.json(); if(j.error)throw new Error(j.error.message||JSON.stringify(j.error));
    return j.choices[0].message.content;
  };
  const callGrokChat = async (sys, messages, key) => {
    const r=await fetch("https://api.x.ai/v1/chat/completions",{method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
      body:JSON.stringify({model:"grok-3",messages:[{role:"system",content:sys},...messages.map(m=>({role:m.role,content:m.content}))]})});
    const j=await r.json(); if(j.error)throw new Error(j.error.message||j.error); return j.choices[0].message.content;
  };
  const callGeminiChat = async (sys, messages, key) => {
    // Gemini requires alternating user/model turns and uses "model" not "assistant"
    const contents = messages.map(m=>({role:m.role==="assistant"?"model":"user",parts:[{text:m.content}]}));
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,{
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({system_instruction:{parts:[{text:sys}]},contents,generationConfig:{maxOutputTokens:2000}})});
    const j=await r.json();
    if(j.error) throw new Error(j.error.message||JSON.stringify(j.error));
    return j.candidates?.[0]?.content?.parts?.[0]?.text||"No response";
  };

  // ── Chat thread state ─────────────────────────────────────────────────────
  const [chatThreads,setChatThreads]=useState(()=>{
    try{return JSON.parse(localStorage.getItem("bt_chat_threads"))||{};}catch{return {};}
  });
  useEffect(()=>{localStorage.setItem("bt_chat_threads",JSON.stringify(chatThreads));},[chatThreads]);
  const [chatDraft,setChatDraft]=useState({});
  const [chatLoading,setChatLoading]=useState({});

  // ── Chat fullscreen ──────────────────────────────────────────────────────
  const [chatFullscreen,setChatFullscreen]=useState(false);

  // ── Floating AI Chat Bubble ──────────────────────────────────────────────
  const [floatOpen,setFloatOpen]=useState(false);
  const [floatThread,setFloatThread]=useState([]);
  const [floatDraft,setFloatDraft]=useState("");
  const [floatLoading,setFloatLoading]=useState(false);
  const [floatStream,setFloatStream]=useState("");
  const floatScrollRef=useRef(null);
  useEffect(()=>{if(floatScrollRef.current)floatScrollRef.current.scrollTop=floatScrollRef.current.scrollHeight;},[floatThread,floatLoading,floatStream]);
  const [streamText,setStreamText]=useState({}); // { [threadKey]: string } — live streaming content
  const chatScrollRef = useRef(null);

  useEffect(()=>{
    if(chatScrollRef.current) chatScrollRef.current.scrollTop=chatScrollRef.current.scrollHeight;
  },[chatThreads,chatLoading,streamText]);

  // ── Streaming Claude call ─────────────────────────────────────────────────
  const callClaudeStream = async (sys, messages, onChunk) => {
    const key = claudeKey;
    if(!key) throw new Error("Enter your Anthropic API key to use Claude");
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:2000,stream:true,system:sys,
        messages:messages.map(m=>({role:m.role,content:m.content}))})
    });
    if(!r.ok){const j=await r.json();throw new Error(j.error?.message||"API error");}
    const reader=r.body.getReader();
    const dec=new TextDecoder();
    let buf="",full="";
    while(true){
      const{done,value}=await reader.read();
      if(done) break;
      buf+=dec.decode(value,{stream:true});
      const lines=buf.split("\n");
      buf=lines.pop()||"";
      for(const line of lines){
        if(!line.startsWith("data: ")) continue;
        const data=line.slice(6).trim();
        if(data==="[DONE]") continue;
        try{
          const ev=JSON.parse(data);
          if(ev.type==="content_block_delta"&&ev.delta?.type==="text_delta"){
            full+=ev.delta.text;
            onChunk(full);
          }
        }catch{}
      }
    }
    return full;
  };

  const sendChat = async (coachId, llmId, directMsg) => {
    const msg=(directMsg||(chatDraft[coachId]||"")).trim(); if(!msg) return;
    const l=LLMS.find(x=>x.id===llmId);
    if(!l.native&&!apiKeys[llmId]){setKeyModal(llmId);return;}
    const coach=COACHES.find(c=>c.id===coachId);
    const now=new Date();
    const dateKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const threadKey=`thread_${coachId}_${llmId}`;
    const existingThread=chatThreads[threadKey]||[];

    const userMsg={role:"user",content:msg,ts:now.toISOString(),type:"qa"};
    const newThread=[...existingThread,userMsg];
    setChatThreads(p=>({...p,[threadKey]:newThread}));
    setChatDraft(p=>({...p,[coachId]:""}));
    setChatLoading(p=>({...p,[threadKey]:true}));
    setStreamText(p=>({...p,[threadKey]:""}));

    try {
      const todaySnap=ctx(coachId);
      const sysWithData=`${coach.sys}\n\n━━ CLIENT DATA SNAPSHOT (refreshed ${dateKey}) ━━\n${todaySnap}`;
      const historyMsgs=existingThread.map(m=>({role:m.role,content:m.content}));
      const conversationMsgs=[...historyMsgs,{role:"user",content:msg}];

      let res;
      if(llmId==="claude"){
        res=await callClaudeStream(sysWithData,conversationMsgs,(chunk)=>{
          setStreamText(p=>({...p,[threadKey]:chunk}));
        });
        setStreamText(p=>({...p,[threadKey]:""}));
      } else if(llmId==="gpt4")   res=await callGPTChat(sysWithData,conversationMsgs,apiKeys.gpt4);
      else if(llmId==="grok")     res=await callGrokChat(sysWithData,conversationMsgs,apiKeys.grok);
      else if(llmId==="gemini")   res=await callGeminiChat(sysWithData,conversationMsgs,apiKeys.gemini);
      else throw new Error(`Unknown LLM: ${llmId}`);

      const assistantMsg={role:"assistant",content:res,ts:new Date().toISOString(),type:"qa"};
      setChatThreads(p=>({...p,[threadKey]:[...newThread,assistantMsg]}));
    } catch(e) {
      setStreamText(p=>({...p,[threadKey]:""}));
      const errMsg={role:"assistant",content:`⚠ ${e.message}`,ts:new Date().toISOString(),type:"qa"};
      setChatThreads(p=>({...p,[threadKey]:[...newThread,errMsg]}));
    }
    setChatLoading(p=>({...p,[threadKey]:false}));
  };

  const sendFloatChat = async (directMsg) => {
    const msg=(directMsg||floatDraft).trim(); if(!msg||floatLoading) return;
    if(!claudeKey){alert("Add your Claude API key in the AI Coach tab first.");return;}
    const now=new Date();
    const dateKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const userMsg={role:"user",content:msg,ts:now.toISOString()};
    const newThread=[...floatThread,userMsg];
    setFloatThread(newThread);
    setFloatDraft("");
    setFloatLoading(true);
    setFloatStream("");
    try {
      const dataCtx=ctx("progress");
      const sys=`You are BodyData AI — a world-class personal health and performance coach with access to the user's complete biometric, nutrition, sleep, and training data. Answer questions directly, be specific with numbers, and give actionable advice. Today is ${dateKey}.\n\n━━ CLIENT DATA SNAPSHOT ━━\n${dataCtx}`;
      const historyMsgs=floatThread.map(m=>({role:m.role,content:m.content}));
      const res=await callClaudeStream(sys,[...historyMsgs,{role:"user",content:msg}],(chunk)=>{setFloatStream(chunk);});
      setFloatStream("");
      const assistantMsg={role:"assistant",content:res,ts:new Date().toISOString()};
      setFloatThread(p=>[...newThread,assistantMsg]);
    } catch(e) {
      setFloatStream("");
      setFloatThread(p=>[...newThread,{role:"assistant",content:`⚠ ${e.message}`,ts:new Date().toISOString()}]);
    }
    setFloatLoading(false);
  };

  const COACHES = [
    {
      id:"workout", icon:"💪", name:"WORKOUT COACH", col:"#fbbf24",
      sys:"You are an elite strength & conditioning coach specializing in body recomposition for a vegan athlete targeting 10% body fat. You design evidence-based programs that maximize muscle retention during a caloric deficit. Be specific with exercises, sets×reps, load, tempo, and rest. Reference actual numbers from the client's training history and recovery data.",
      defaultDailyPrompt:`Analyze ALL of my body data — segmental body fat % by region (trunk, right arm, left arm, right leg, left leg), body measurements (waist, chest, hips, shoulders, biceps, thighs, calves), per-muscle-group training volume over 30 days, body composition trend (weight, body fat %, lean mass), recovery (HRV, sleep score, readiness), and nutrition — then design the best possible workout for me today and a 1–4 week training plan.

HARD CONSTRAINTS (non-negotiable):
• Maximum 7 exercises per session
• Maximum 4 sets per exercise
• Maximum 75 minutes total

Everything else — exercise selection, exercise type, movement patterns, order, rep ranges, tempo, rest periods, training split — you decide entirely based on what my body data tells you I need most. Use my segmental fat % to identify which regions need priority work. Use my 30-day per-muscle volume to identify what has been undertrained or overtrained. Use my recovery metrics to calibrate today's intensity. Let the data drive every decision — do not default to generic program templates.

Structure your response as:
1. BODY COMPOSITION ANALYSIS: What does my segmental fat % (by region) and body measurements reveal about where I carry fat and which muscle groups are underdeveloped? Be specific — use the actual % numbers.
2. TRAINING HISTORY ANALYSIS: Which muscle groups are lagging in volume over the last 30 days? What's the distribution? What does that tell you about what needs priority?
3. RECOVERY ANALYSIS: What do my HRV, readiness, and sleep scores over the last 7 days tell you about appropriate intensity today?
4. 1–4 WEEK PROGRAM: Your recommended training plan based on my data — day-by-day, showing exercises, sets×reps×load. Justify every choice with my body data.
5. TODAY'S WORKOUT: Exactly what to do today — up to 7 exercises, up to 4 sets each. For each exercise: sets×reps×weight, rest period, why this exercise was chosen based on my data.

All decisions must be justified by my actual numbers. Do not prescribe a generic program — design this for my specific body.`,
      questions:[
        {id:"today",label:"🎯 TODAY'S WORKOUT",prompt:"Based on my recovery data (HRV, sleep, resting HR, prior day volume) and training history, give me the exact workout to do today. Include warm-up, main lifts with sets×reps×load, accessories, and finisher. Consider which muscle groups I've trained recently."},
        {id:"next7",label:"📅 NEXT 7 DAYS",prompt:"Design my complete 7-day workout plan optimized for my body fat goal. Balance muscle groups (push/pull/legs/core), include rest days based on my recovery patterns, and specify exact exercises, sets×reps×load for each day. Identify weak points from my historical volume data."},
        {id:"feedback",label:"📊 YESTERDAY'S FEEDBACK",prompt:"Review yesterday's workout performance. Analyze volume vs historical averages per muscle group, compare to my recovery state. Grade the session A-F and tell me what to adjust today."},
        {id:"weak",label:"🔍 MY WEAK POINTS",prompt:"Analyze my training history across all muscle groups and identify the 3 weakest areas that are limiting my physique. Give specific programming changes to bring them up."},
      ]
    },
    {
      id:"food", icon:"🥗", name:"FOOD COACH", col:"#34d399",
      sys:"You are an elite sports nutritionist and registered dietitian specializing in whole food plant-powered vegan athletes targeting body recomposition. You design meal plans that maximize protein (180g+), optimize macros for fat loss, and use real whole foods — not processed fake meats. Be specific with foods, portions, calories, and macros per meal.",
      defaultDailyPrompt:`Analyze ALL of my data — nutrition history, body composition trend, training load, activity, sleep, and recovery — then build me the optimal daily macro eating plan to hit 10% body fat while preserving maximum lean muscle.

Structure your response as:
1. DATA ANALYSIS: What does my last 30 days of nutrition tell you? How is my caloric intake tracking against my body weight trend? How often am I hitting protein targets? Where are the biggest macro gaps?
2. MACRO TARGETS: Based on my current stats (weight, body fat %, lean mass, activity level, training volume), calculate my exact daily targets for calories, protein, carbs, and fat. Show your math.
3. DAILY MACRO PLAN: Break out the macros across every meal — breakfast, lunch, dinner, and snacks — with exact grams of protein, carbs, and fat per meal. Build it around whole food plant-powered vegan foods only (legumes, tofu, tempeh, seitan, quinoa, edamame, lentils — no processed fake meats).
4. MEAL TIMING: Based on my training schedule and sleep data, recommend when to eat each meal relative to my workouts for optimal performance and fat loss.
5. BIGGEST NUTRITION LEVER: What is the single most impactful nutrition change I can make right now based on my data?

Be specific — use my actual weight, BF%, and training data to calculate everything.`,
      questions:[
        {id:"today",label:"🍽️ TODAY'S MEALS",prompt:"Based on my current body comp, training schedule, and macro targets, give me exactly what to eat today. Specify breakfast, lunch, dinner, snacks with exact portions, calories, and macros. Total daily calories, protein (180g+), carbs, fats."},
        {id:"next7",label:"📅 NEXT 7 DAY MEAL PLAN",prompt:"Create a complete 7-day whole food plant-powered vegan meal plan optimized for fat loss and muscle preservation. Each day: breakfast, lunch, dinner, 2 snacks with exact foods, portions, calories, and macros. Target 180g+ protein daily in a caloric deficit. Use legumes, tofu, tempeh, seitan, quinoa, etc."},
        {id:"feedback",label:"📊 YESTERDAY'S NUTRITION",prompt:"Review yesterday's MyFitnessPal nutrition data. Calculate protein timing/distribution, macro compliance vs targets, micronutrient gaps. Grade A-F and give 3 specific changes for today."},
        {id:"groceries",label:"🛒 GROCERY LIST",prompt:"Give me a grocery list for this week's meals organized by category (produce, proteins, grains, pantry, spices). Include quantities and budget-friendly tips."},
      ]
    },
    {
      id:"sleep", icon:"😴", name:"SLEEP COACH", col:"#a78bfa",
      sys:"You are an elite sleep performance coach who analyzes circadian rhythm, sleep architecture, HRV, and lifestyle factors. You help athletes optimize sleep for recovery, fat loss, and performance. Be specific about bedtime routines, environmental factors, nutrition timing, and lifestyle changes. Reference actual Oura data.",
      defaultDailyPrompt:`Analyze ALL of my data — sleep architecture, HRV, readiness, nutrition (especially meal timing, calories, and macros), training load, steps, body composition, and recovery — then give me a complete plan to optimize my sleep quality.

Structure your response as:
1. SLEEP DATA ANALYSIS: What are my average sleep score, total duration, deep sleep, and REM over the last 30 days vs optimal targets? Which nights were best and worst — and what was different about those days?
2. CORRELATION ANALYSIS: Using the actual dates and numbers from my data, identify what is hurting my sleep. Cross-reference: Does heavy training suppress deep sleep? Does eating late reduce sleep score? Does high caloric intake affect HRV? Does low step count correlate with worse readiness? Be specific with dates.
3. MEAL TIMING IMPACT: Based on my nutrition and sleep data together, what time should I have my last meal, last carbs, and last protein to optimize sleep quality and recovery?
4. SLEEP IMPROVEMENT PLAN: Give me a specific, prioritized list of changes to make — ranked by expected impact based on what my data shows.
5. TONIGHT'S PROTOCOL: Exact wind-down start time, bedtime, room temperature, last meal cutoff, caffeine cutoff, and any other specific actions for tonight.

Reference my actual numbers — tell me what my data says, not generic sleep hygiene advice.`,
      questions:[
        {id:"today",label:"🌙 TONIGHT'S PROTOCOL",prompt:"Based on my recent sleep data (duration, deep/REM/light, HRV, readiness) and today's activities, give me an exact protocol for tonight: wind-down routine start time, bedtime, temperature, supplements, nutrition cutoff, blue light cutoff. Target optimal deep and REM sleep."},
        {id:"next7",label:"📅 NEXT 7 DAY SLEEP PLAN",prompt:"Analyze my sleep patterns and create a 7-day plan to improve sleep quality and HRV. Identify the biggest limiters (late meals, stress, training timing, inconsistent bedtime) and give specific daily changes. Target 8+ hours, 1.5+ deep, 1.5+ REM."},
        {id:"feedback",label:"📊 LAST NIGHT'S ANALYSIS",prompt:"Deep analysis of last night's sleep. Compare to my baseline, identify what hurt quality, correlate with yesterday's behaviors (training intensity, caffeine, meals, stress). Give 3 changes to improve tonight."},
        {id:"correlate",label:"🔗 SLEEP CORRELATIONS",prompt:"Analyze my historical data to find what correlates with my best and worst sleep. Identify patterns: 'your deep sleep is 25% higher when X' or 'HRV drops 20% when Y'. Give me the rules to live by."},
      ]
    },
    {
      id:"progress", icon:"🏆", name:"PROGRESS COACH", col:"#f43f5e",
      sys:"You are an elite mindset coach and body recomposition psychologist. You motivate, inspire, and hold athletes accountable to their goals while celebrating wins and reframing setbacks. Be direct, data-driven, and emotionally intelligent. Reference specific achievements from the client's historical data to build momentum. The client's goal is 10% body fat.",
      defaultDailyPrompt:`Analyze ALL of my data across every dimension — body composition, training, nutrition, sleep, recovery, activity — then give me a complete action plan to hit 10% body fat as fast as possible while maximizing muscle retention.

Structure your response as:
1. FULL DATA ANALYSIS: Review every metric over the last 30 days. Where am I improving? Where am I stalling? What does my body composition trend actually show?
2. WHAT'S WORKING: My top 3 measurable wins from the data with exact numbers and dates.
3. WHAT'S HOLDING ME BACK: The top 3 things the data shows are limiting my progress — be specific with numbers, not generic.
4. PRIORITY CHANGES: Ranked list of the highest-impact changes I need to make right now across training, nutrition, sleep, and recovery — ordered by expected impact on reaching 10% body fat.
5. TIMELINE PROJECTION: Based on my current body fat %, rate of change over the last 30 days, and recommended adjustments — when will I realistically hit 14%, 12%, and 10% body fat?
6. THIS WEEK'S COMMITMENTS: 5 specific, measurable, non-negotiable actions for this week — one for training, one for nutrition, one for sleep, one for recovery, one wildcard — each tied directly to a gap found in my data.

Be brutally honest and data-driven. I want the truth from my numbers, not motivation.`,
      questions:[
        {id:"today",label:"🔥 DAILY MOTIVATION",prompt:"Give me today's motivational brief. Acknowledge what I've achieved (reference specific data milestones), identify today's key focus area, and give me 3 actionable commitments for today that will move the needle toward 10% body fat."},
        {id:"wins",label:"🏅 MY WINS THIS MONTH",prompt:"Analyze my data and call out every measurable win from the past 30 days — body comp changes, training PRs, consistency streaks, sleep improvements. Make me feel the progress I've made. Be specific with numbers."},
        {id:"trajectory",label:"🚀 MY TRAJECTORY",prompt:"Project my trajectory to 10% body fat based on my current pace. When will I hit 14%, 12%, 10%? What needs to change to accelerate? Create a visual timeline and milestone plan. Make it ambitious but achievable."},
        {id:"reframe",label:"💡 REFRAME & REFOCUS",prompt:"If I'm feeling stuck, unmotivated, or frustrated — diagnose what's really going on from my data. Is it actually stalled progress, or am I being too hard on myself? Give me perspective and a path forward."},
      ]
    },
    {
      id:"celebrate", icon:"🏅", name:"CELEBRATION COACH", col:"#00ff9d",
      sys:"You are an elite performance psychologist and celebration coach who specializes in recognizing and amplifying wins — big and small — to build momentum toward peak physical transformation. You scan data for every measurable improvement, streak, milestone, and personal record. You are enthusiastic, specific, and grounded in the numbers. Your job is to make the athlete feel the weight of their progress so they attack the next phase with full confidence.",
      defaultDailyPrompt:`Scan ALL of my last 30 days of data across every metric — body composition, training, nutrition, sleep, recovery, activity, and measurements — and find every single win worth celebrating.

Structure your response as:
1. THIS WEEK'S HEADLINE WIN: The single most impressive data point or trend from the last 7 days. Be specific with the number and why it matters.
2. 30-DAY WINS BOARD: List every measurable improvement over the last 30 days — body fat down, lean mass up, training PRs, volume milestones, sleep streaks, protein targets hit, HRV improvements, step streaks. No win is too small. Give the exact before/after numbers.
3. PERSONAL RECORDS: Any new PRs in max weight lifted (by muscle group), highest single-day volume, longest training streak, best sleep score, highest HRV, best readiness score.
4. CONSISTENCY AWARD: How many days did I train, hit protein target, get 7.5+ hours sleep, hit 10k steps? Call out any streaks.
5. MOMENTUM MESSAGE: A powerful, data-backed statement about where I am on my journey to 10% body fat — what the numbers prove about my capability.

Be specific, be enthusiastic, and reference exact numbers from my data. Make me feel this.`,
      questions:[
        {id:"week",label:"🏆 THIS WEEK'S WINS",prompt:"Scan my last 7 days of data and call out every win — PRs, improvements, streaks, milestones. Be specific with numbers. What should I be proud of this week?"},
        {id:"month",label:"📈 30-DAY WINS BOARD",prompt:"Give me a complete 30-day wins board. Every measurable improvement across body comp, training, nutrition, sleep, and recovery. Before/after numbers for everything."},
        {id:"prs",label:"🎯 MY PERSONAL RECORDS",prompt:"Find all my personal records across every metric in my data — max weights lifted per muscle group, highest volume day, best sleep score, highest HRV, best readiness, longest streaks."},
        {id:"momentum",label:"⚡ MOMENTUM CHECK",prompt:"Based on my data trajectory, where am I headed? Project my momentum — if I keep this up, what will my stats look like in 30, 60, 90 days? Make it inspiring but grounded in my actual data."},
      ]
    },
  ];

  const [activeCoach,setActiveCoach]=useState("workout");
  const [coachLLMs,setCoachLLMs]=useState(()=>{
    try { return JSON.parse(localStorage.getItem("bt_coach_llms")) || {}; } catch { return {}; }
  });
  useEffect(()=>{ localStorage.setItem("bt_coach_llms",JSON.stringify(coachLLMs)); },[coachLLMs]);
  const [coachPrompts,setCoachPrompts]=useState(()=>{
    try { return JSON.parse(localStorage.getItem("bt_coach_prompts")) || {}; } catch { return {}; }
  });
  useEffect(()=>{ localStorage.setItem("bt_coach_prompts",JSON.stringify(coachPrompts)); },[coachPrompts]);

  // ── #3 Coach Memory — persistent per-coach knowledge that grows every session ─
  const [coachMemory,setCoachMemory]=useState(()=>{
    try { return JSON.parse(localStorage.getItem("bt_coach_memory")) || {}; } catch { return {}; }
  });
  useEffect(()=>{ localStorage.setItem("bt_coach_memory",JSON.stringify(coachMemory)); },[coachMemory]);
  const [memoryUpdating,setMemoryUpdating]=useState({});
  const [showMemory,setShowMemory]=useState({});

  // ── #4 Auto-Brief — auto-generate today's coaching on tab open ─────────────
  const [autoBrief,setAutoBrief]=useState(()=>localStorage.getItem("bt_auto_brief")!=="false");
  useEffect(()=>{ localStorage.setItem("bt_auto_brief",autoBrief); },[autoBrief]);

  // ── Notification permission state ──────────────────────────────────────────
  const [notifPermission, setNotifPermission] = useState(() =>
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
  };

  // Refs so the notification interval always has the latest analyze/key/llm state
  // without needing to re-create the interval on every render.
  const analyzeRef    = useRef(null);
  const claudeKeyRef  = useRef(claudeKey);
  const coachLLMsRef  = useRef(coachLLMs);
  claudeKeyRef.current  = claudeKey;   // updated every render — no stale closure
  coachLLMsRef.current  = coachLLMs;

  // Fire coaching notifications + auto-run scheduled coach (weekdays 5am, weekends 8am)
  // Only fires if the tab is open and permission is granted
  useEffect(() => {
    if (notifPermission !== "granted") return;
    const NOTIFY_HOUR_WEEKDAY = 5;  // 5:00 AM Mon–Fri
    const NOTIFY_HOUR_WEEKEND = 8;  // 8:00 AM Sat–Sun
    const SCHEDULE = { workout:"Saturday", food:"Sunday", sleep:"Monday", progress:"Tuesday", celebrate:"Wednesday" };
    const DOW_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    let lastFiredDate = "";
    const check = () => {
      const now = new Date();
      const dow = now.getDay(); // 0=Sun, 6=Sat
      const isWeekend = dow === 0 || dow === 6;
      const targetHour = isWeekend ? NOTIFY_HOUR_WEEKEND : NOTIFY_HOUR_WEEKDAY;
      const dateKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      if (now.getHours() === targetHour && now.getMinutes() === 0 && dateKey !== lastFiredDate) {
        lastFiredDate = dateKey;
        // Find today's scheduled coach
        const todayName = DOW_NAMES[dow];
        const todayCoachId = Object.entries(SCHEDULE).find(([,day])=>day===todayName)?.[0];
        const coachObj = todayCoachId ? COACHES.find(c=>c.id===todayCoachId) : null;
        // 1. Fire browser notification
        new Notification("BodyData Daily Coaching", {
          body: coachObj
            ? `⚡ Auto-running ${coachObj.name} with your latest data...`
            : "BodyData is running your daily coaching session.",
          icon: "/favicon.ico",
          tag: "biotrack-coaching",
        });
        // 2. Auto-run the scheduled coach (requires app to be open + API key set)
        if (todayCoachId && analyzeRef.current) {
          const llm = coachLLMsRef.current[todayCoachId] || "claude";
          if (llm === "claude" && claudeKeyRef.current) {
            analyzeRef.current(llm, todayCoachId, "daily");
          } else if (llm !== "claude") {
            // Non-Claude LLMs — try regardless (analyze handles missing key modal)
            analyzeRef.current(llm, todayCoachId, "daily");
          }
        }
      }
    };
    const interval = setInterval(check, 60000); // check every minute
    check(); // also check immediately on mount/permission grant
    return () => clearInterval(interval);
  }, [notifPermission]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── #3 Coach Memory updater — runs silently after each daily response ────────
  const updateCoachMemory = async (coachId, promptText, response) => {
    if (!claudeKey) return;
    setMemoryUpdating(p=>({...p,[coachId]:true}));
    try {
      const existing = coachMemory[coachId] || "(no memory yet)";
      const memPrompt = `You maintain a concise persistent memory for an elite athletic coaching AI.\n\nEXISTING MEMORY:\n${existing}\n\nNEW COACHING EXCHANGE:\nUser prompt: ${promptText.slice(0,600)}\nCoach response: ${response.slice(0,1200)}\n\nUpdate the memory to incorporate new insights. Keep it under 350 words. Structure it as:\n🎯 GOALS: (primary objectives, target metrics)\n📊 KEY PATTERNS: (what's working, what isn't, recurring themes)\n⚙️ PREFERENCES: (training style, dietary needs, scheduling)\n🚧 CONSTRAINTS: (injuries, limitations, lifestyle factors)\n💡 INSIGHTS: (breakthroughs, correlations discovered)\n\nReturn only the updated memory text, no commentary.`;
      const newMem = await callClaude("You are a precise athletic coaching memory system. Extract and retain only persistent, actionable facts about this athlete. Never include specific daily numbers (those come from live data). Focus on patterns, goals, preferences, and insights.", memPrompt);
      setCoachMemory(p=>({...p,[coachId]:newMem}));
    } catch(e){ console.warn("Memory update failed:", e.message); }
    setMemoryUpdating(p=>({...p,[coachId]:false}));
  };

  const analyze = async (llmId, coachId, questionId) => { // eslint-disable-line no-use-before-define
    const l=LLMS.find(x=>x.id===llmId);
    if(!l.native&&!apiKeys[llmId]){setKeyModal(llmId);return;}
    const coach = COACHES.find(c=>c.id===coachId);
    let promptText, qKey;
    if(questionId === "daily") {
      promptText = coachPrompts[coachId] || coach.defaultDailyPrompt;
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
      qKey = `daily_${coachId}_${llmId}_${dateKey}`;
    } else {
      const q = coach.questions.find(q=>q.id===questionId);
      promptText = q.prompt;
      qKey = `${coachId}_${llmId}_${questionId}`;
    }
    setLoading(p=>({...p,[qKey]:true}));
    // #3 Inject coach memory into system prompt so every session builds on the last
    const mem = coachMemory[coachId];
    const sys = mem
      ? `${coach.sys}\n\n🧠 PERSISTENT COACH MEMORY (accumulated knowledge about this athlete — use this to personalise every response):\n${mem}`
      : coach.sys;
    try {
      let res;
      const todaySnap = ctx(coachId);
      const histText  = buildHistory(coachId);
      const csv30     = buildCSV30();
      const fullPrompt = `${promptText}\n\n${todaySnap}\n\n${histText}`;
      if(llmId==="claude") {
        res=await callClaude(sys,`${promptText}\n\n${todaySnap}`, csv30);
      } else if(llmId==="gpt4") {
        res=await callGPT(sys, fullPrompt, apiKeys.gpt4);
      } else if(llmId==="grok") {
        res=await callGrok(sys, fullPrompt, apiKeys.grok);
      } else if(llmId==="gemini") {
        res=await callGemini(sys, fullPrompt, apiKeys.gemini);
      } else {
        res=`[${l.name} — tap 🔑 ADD KEY to enable]`;
      }
      setAnalyses(p=>({...p,[qKey]:res}));
      if(questionId === "daily") {
        const persistKey = `thread_${coachId}_${llmId}`;
        const now2 = new Date();
        const dateKey2 = `${now2.getFullYear()}-${String(now2.getMonth()+1).padStart(2,"0")}-${String(now2.getDate()).padStart(2,"0")}`;
        setChatThreads(p => ({
          ...p,
          [persistKey]: [...(p[persistKey]||[]),
            {role:"user",      content:promptText, ts:now2.toISOString(), type:"daily_prompt", date:dateKey2},
            {role:"assistant", content:res,        ts:now2.toISOString(), type:"daily",        date:dateKey2},
          ]
        }));
        // #3 Update coach memory silently in background after daily response
        updateCoachMemory(coachId, promptText, res);
      }
    } catch(e){setAnalyses(p=>({...p,[qKey]:`⚠ ${e.message}`}));}
    setLoading(p=>({...p,[qKey]:false}));
  };
  analyzeRef.current = analyze;

  // ── #4 Auto-Brief — generate today's coaching automatically when tab opens ──
  useEffect(() => {
    if (tab !== "coach" || !autoBrief || !claudeKey) return;
    const llmId = coachLLMs[activeCoach] || "claude";
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    const dailyKey = `daily_${activeCoach}_${llmId}_${dateKey}`;
    if (!analyses[dailyKey] && !loading[dailyKey]) {
      const t = setTimeout(() => analyzeRef.current && analyzeRef.current(llmId, activeCoach, "daily"), 1200);
      return () => clearTimeout(t);
    }
  }, [tab, activeCoach, autoBrief, claudeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const getWorkout = async () => {
    setLoading(p=>({...p,workout:true}));
    try {
      const r=await callClaude(
        "You are an elite strength coach for fat loss. Prescribe today's exact workout: Warm-Up → Main → Accessory → Finisher. Include exercises, sets×reps, load, tempo, rest.",
        `${ctx("workout")}`, buildCSV30()
      );
      setWorkout(r);
    } catch(e){setWorkout(`⚠ ${e.message}`);}
    setLoading(p=>({...p,workout:false}));
  };

  const handlePhotos = (e) => Array.from(e.target.files).forEach((file,i)=>{
    const reader=new FileReader();
    reader.onload=ev=>{
      setPhotos(prev=>[...prev,{name:file.name,url:ev.target.result,base64:ev.target.result.split(",")[1],mime:file.type||"image/jpeg"}]);
      setPhotoLabels(prev=>[...prev,["FRONT","BACK","LEFT SIDE","RIGHT SIDE","FLEX"][i%5]]);
    };
    reader.readAsDataURL(file);
  });

  const analyzePhotos = async () => {
    if(!photos.length) return;
    setLoading(p=>({...p,photo:true}));
    try {
      const imgs=photos.map(p=>({type:"image",source:{type:"base64",media_type:p.mime,data:p.base64}}));
      if(!claudeKey) throw new Error("Enter your Anthropic API key in the AI Coach tab");
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":claudeKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,
          messages:[{role:"user",content:[...imgs,{type:"text",text:`Analyze body composition. BF ${today.bodyFat}%, Weight ${today.weight}lbs. Assess fat distribution, muscle development, target areas, give 3 specific adjustments.`}]}]})});
      const j=await r.json(); if(j.error)throw new Error(j.error.message);
      setPhotoAnalysis(j.content[0].text);
    } catch(e){setPhotoAnalysis(`⚠ ${e.message}`);}
    setLoading(p=>({...p,photo:false}));
  };

  // Hume screenshot OCR scanner
  const [humeScanning, setHumeScanning] = useState(false);
  const [humeScanResult, setHumeScanResult] = useState(null);
  const [humeScanError, setHumeScanError] = useState("");
  const [summaryRange, setSummaryRange] = useState("30d");
  const [drillMetric, setDrillMetric] = useState(null);
  const [summaryOrder, setSummaryOrder] = useState(() => {
    try { return JSON.parse(localStorage.getItem("bt_summary_order")) || null; } catch { return null; }
  });
  useEffect(() => {
    if (summaryOrder) localStorage.setItem("bt_summary_order", JSON.stringify(summaryOrder));
  }, [summaryOrder]);
  const summaryDragRef = useRef(null);
  const [summaryEdit, setSummaryEdit] = useState(false);
  // ── Daily Habits ──────────────────────────────────────────────────────────
  const [habitData,setHabitData]=useState(()=>{
    try { return JSON.parse(localStorage.getItem("bt_habit_data")) || {}; } catch { return {}; }
  });
  useEffect(()=>{ localStorage.setItem("bt_habit_data",JSON.stringify(habitData)); },[habitData]);
  const [customHabits,setCustomHabits]=useState(()=>{
    try { return JSON.parse(localStorage.getItem("bt_custom_habits")) || []; } catch { return []; }
  });
  useEffect(()=>{ localStorage.setItem("bt_custom_habits",JSON.stringify(customHabits)); },[customHabits]);
  const [newHabitDraft,setNewHabitDraft]=useState("");
  const [habitHistoryDays,setHabitHistoryDays]=useState(30);

  const [logCoachFilter,setLogCoachFilter]=useState("all");
  const [logTypeFilter,setLogTypeFilter]=useState("all");
  const [expandedEntries,setExpandedEntries]=useState({});
  const humeFileRef = useRef(null);

  const scanHumeScreenshot = async (files) => {
    if (!files || !files.length) return;
    setHumeScanning(true);
    setHumeScanError("");
    setHumeScanResult(null);
    try {
      const imgs = [];
      for (const file of files) {
        const b64 = await new Promise((res) => {
          const r = new FileReader();
          r.onload = (e) => res(e.target.result.split(",")[1]);
          r.readAsDataURL(file);
        });
        imgs.push({ type: "image", source: { type: "base64", media_type: file.type || "image/png", data: b64 } });
      }
      if(!claudeKey) throw new Error("Enter your Anthropic API key in the AI Coach tab");
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": claudeKey, "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 500,
          messages: [{
            role: "user",
            content: [
              ...imgs,
              {
                type: "text",
                text: `Extract ALL numbers from this Hume Body Pod screenshot. Return ONLY a JSON object with these exact keys and numeric values (no text, no explanation):
{"trunkFat":0,"rightArmFat":0,"leftArmFat":0,"rightLegFat":0,"leftLegFat":0,"trunkMuscle":0,"rightArmMuscle":0,"leftArmMuscle":0,"rightLegMuscle":0,"leftLegMuscle":0}
If a screenshot shows Fat Percentage, fill the fat fields. If it shows Muscle Mass (lbs), fill the muscle fields. Fill only what you see, leave others as 0.`
              }
            ]
          }]
        })
      });
      const j = await r.json();
      if (j.error) throw new Error(j.error.message);
      const text = j.content[0].text;
      // Extract JSON from response
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse response");
      const parsed = JSON.parse(match[0]);
      // Filter out zeros
      const result = {};
      Object.entries(parsed).forEach(([k, v]) => { if (v && v > 0) result[k] = v; });
      setHumeScanResult(result);
      // Auto-fill into manual draft
      setManualDraft(p => ({ ...p, ...result }));
    } catch (e) {
      setHumeScanError(`⚠ ${e.message}`);
    }
    setHumeScanning(false);
  };

  const cols=getCols(view,liveData,liveHistory);

  // ─ CSV Download — exports all groups × all columns for the current view period
  const downloadCSV = () => {
    const escCSV = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g,'""')}"` : s;
    };
    const colLabels = cols.map(c => c.label);
    // Header row: Metric, Unit, Group, [col labels...]
    const headerRow = ["Metric","Unit","Group",...colLabels].map(escCSV).join(",");
    const dataRows = [];
    for (const g of sortedGroups) {
      for (const row of g.rows) {
        const vals = cols.map(c => {
          const v = c.data[row.k];
          if (v === null || v === undefined) return "";
          if (typeof v === "number") return Number.isInteger(v) ? v : +v.toFixed(2);
          return v;
        });
        dataRows.push([row.l, row.u||"", g.name, ...vals].map(escCSV).join(","));
      }
    }
    const csvContent = [headerRow, ...dataRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const dateStamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}${String(now.getDate()).padStart(2,"0")}`;
    a.href = url;
    a.download = `biotrack_${view}_${dateStamp}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─ Shared style objects
  const panel={background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"12px",padding:"20px"};
  const inp={background:C.surf,border:`1px solid ${C.bord}`,color:C.text1,padding:"8px 12px",fontSize:"13px",borderRadius:"8px",outline:"none",fontFamily:"'Inter',system-ui,sans-serif"};
  const bFill=(col)=>({padding:"9px 20px",background:col,border:"none",color:"#fff",cursor:"pointer",fontSize:"12px",letterSpacing:"0.5px",borderRadius:"8px",fontWeight:"600",fontFamily:"'Inter',system-ui,sans-serif"});
  const bOut=(col)=>({padding:"8px 16px",background:"transparent",border:`1px solid ${C.bord}`,color:C.text2,cursor:"pointer",fontSize:"12px",letterSpacing:"0.3px",borderRadius:"8px",fontFamily:"'Inter',system-ui,sans-serif"});
  const TH={padding:"6px 6px",textAlign:"right",fontSize:"11px",color:C.text1,letterSpacing:"1px",borderBottom:`1px solid ${C.bord}`,whiteSpace:"nowrap",fontWeight:"600",opacity:0.8};
  const TD={padding:"6px 6px",textAlign:"right",borderBottom:`1px solid ${C.surf2}`,whiteSpace:"normal",wordBreak:"break-word",verticalAlign:"middle"};

  const r1=v=>(v==null||v===undefined||Number.isNaN(v))?"—":typeof v==="number"&&!Number.isInteger(v)?+v.toFixed(1):v;
  const kv=(v,suffix)=>{ const f=r1(v); return f==="—"?"—":`${f}${suffix}`; };
  // HRV-based readiness: ≥80=elite, 60-79=good, 40-59=moderate, <40=recover
  const hrvReadiness = today.hrv!=null
    ? today.hrv>=80?"ELITE":today.hrv>=60?"GOOD":today.hrv>=40?"MOD":"LOW"
    : "—";
  const hrvReadinessColor = today.hrv!=null
    ? today.hrv>=80?"#00ff9d":today.hrv>=60?"#34d399":today.hrv>=40?"#fbbf24":"#f87171"
    : "#666";
  const sleepHours = today.sleepDuration ?? today.sleepDur ?? null;
  const totalBurn = today.totalCaloriesBurned ?? (today.activeCalories!=null&&today.basalCalories!=null ? today.activeCalories+today.basalCalories : today.activeCalories) ?? null;

  const kpis=[
    {l:"BODY FAT",   v:kv(today.bodyFat,"%"),                                          c:"#ff6b35"},
    {l:"WEIGHT",     v:kv(today.weight," lbs"),                                         c:"#fbbf24"},
    {l:"LEAN MASS",  v:kv(today.leanMass," lbs"),                                       c:"#34d399"},
    {l:"HRV",        v:kv(today.hrv," ms"),                                             c:"#a78bfa"},
    {l:"READINESS",  v:hrvReadiness,                                                    c:hrvReadinessColor},
    {l:"SLEEP",      v:sleepHours!=null?sleepHours.toFixed(1)+"h":"—",                  c:"#818cf8"},
    {l:"STEPS",      v:today.steps?Math.round(Number(today.steps)).toLocaleString():"—",c:"#f43f5e"},
    {l:"PROTEIN",    v:kv(today.protein,"g"),                                           c:"#f97316"},
    {l:"CALORIES",   v:today.calories!=null?Math.round(today.calories)+" kcal":"—",     c:"#fbbf24"},
    {l:"TOTAL BURN", v:totalBurn!=null?Math.round(totalBurn)+" kcal":"—",               c:"#60a5fa"},
    {l:"WATER",      v:kv(today.water," oz"),                                           c:"#22d3ee"},
    {l:"EXERCISE",   v:today.exerciseMinutes!=null?Math.round(today.exerciseMinutes)+" min":"—", c:"#a3e635"},
    {l:"STAND HRS",  v:kv(today.standHours," hrs"),                                    c:"#34d399"},
    {l:"RESTING HR", v:kv(today.restingHR," bpm"),                                     c:"#fb7185"},
    {l:"SPO2",       v:kv(today.spo2,"%"),                                             c:"#67e8f9"},
    {l:"VO2 MAX",    v:kv(today.vo2max,""),                                            c:"#c084fc"},
  ];

  const sectionLabel = (txt) => (
    <div style={{fontSize:"10px",color:C.text3,letterSpacing:"2px",marginBottom:"12px",fontWeight:"600"}}>{txt}</div>
  );

  return (
    <div style={{display:"flex",height:"100vh",background:C.bg,color:C.text1,fontFamily:"'Inter',system-ui,-apple-system,sans-serif",fontSize:"14px",overflow:"hidden",WebkitFontSmoothing:"antialiased"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=Inter:wght@400;500;600;700&family=Jomolhari&display=swap');
        .bt-num{font-family:'Inter',system-ui,sans-serif;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
        .bt-eyebrow{font-family:'Inter',system-ui,sans-serif;font-size:10.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:#5468FF}
        .bt-card{background:#fff;border:1px solid ${C.bord};border-radius:14px}
        .bt-ctl{height:38px;display:inline-flex;align-items:center;gap:8px;padding:0 12px;background:#fff;border:1px solid ${C.bord};border-radius:9px;font-size:13px;cursor:pointer;white-space:nowrap;flex-shrink:0;color:${C.text1};font-family:'Inter',system-ui,sans-serif}
        .bt-ctl:hover{border-color:${C.bord2}}
        .bt-pop{position:absolute;z-index:30;background:#fff;border:1px solid ${C.bord};border-radius:12px;box-shadow:0 12px 30px rgba(43,46,74,.13)}
        .bt-menuitem{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:7px;cursor:pointer;font-size:13px;color:${C.text1};border:0;background:transparent;width:100%;text-align:left;font-family:'Inter',system-ui,sans-serif}
        .bt-menuitem:hover{background:#F4F3EF}
        .bt-md{font-size:14px;line-height:1.6;color:${C.text1}}
        .bt-md h1,.bt-md h2,.bt-md h3{font-family:'Inter',system-ui,sans-serif;margin:16px 0 6px;line-height:1.3}
        .bt-md h1{font-size:18px}.bt-md h2{font-size:16px}.bt-md h3{font-size:14.5px}
        .bt-md p{margin:0 0 10px}.bt-md ul,.bt-md ol{margin:0 0 10px;padding-left:22px}.bt-md li{margin:3px 0}
        .bt-md table{border-collapse:collapse;margin:8px 0 12px;font-size:13px;display:block;overflow-x:auto}
        .bt-md th,.bt-md td{border:1px solid #E7E8F1;padding:6px 10px;text-align:left}.bt-md th{background:#F7F6F3}
        .bt-md code{background:#F4F3EF;padding:1px 5px;border-radius:4px;font-size:12.5px}
        .bt-md a{color:${C.teal}}.bt-md>*:last-child{margin-bottom:0}
        .bt-btn{height:34px;padding:0 14px;border-radius:9px;border:1px solid ${C.bord};background:#fff;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;color:${C.text1};font-family:'Inter',system-ui,sans-serif}
        .bt-search{height:38px;display:flex;align-items:center;gap:8px;padding:0 12px;background:#fff;border:1px solid ${C.bord};border-radius:9px;color:${C.text3};width:250px;min-width:160px;flex:0 1 250px}
        .bt-search input{border:0;outline:0;background:transparent;font-size:13px;flex:1;min-width:0;color:${C.text1};font-family:'Inter',system-ui,sans-serif}
        .bt-date{display:block;width:100%;margin-top:4px;height:34px;border:1px solid ${C.bord};border-radius:8px;padding:0 8px;background:#fff;font:inherit;color:${C.text1}}
        .bt-navitem{display:flex;align-items:center;gap:10px;height:34px;padding:0 10px;border-radius:8px;cursor:pointer;color:${C.text2};font-size:13.5px;font-weight:500;border:0;background:transparent;width:100%;text-align:left;white-space:nowrap;overflow:hidden;transition:background .1s;font-family:'Inter',system-ui,sans-serif}
        .bt-navitem:hover{background:#F1F2F8}
        .bt-navitem.on{background:#5468FF;color:#fff;font-weight:600;box-shadow:0 1px 6px rgba(84,104,255,.28)}
        .bt-kcard{background:#fff;border:1px solid ${C.bord};border-radius:14px;padding:14px 15px 12px;cursor:pointer;position:relative;transition:box-shadow .15s,border-color .15s;min-width:0;display:flex;flex-direction:column;flex:1}
        .bt-kcard:hover{box-shadow:0 6px 20px rgba(43,46,74,.06);border-color:${C.bord2}}
        .bt-chipbtn{height:30px;padding:0 12px;border-radius:20px;border:1px solid ${C.bord};background:#fff;font-size:12.5px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-family:'Inter',system-ui,sans-serif}
        .bt-chipbtn.on{background:${C.text1};color:#F8F9FC;border-color:${C.text1}}
        .bt-dragcell{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
        @media (hover:hover){.bt-dragcell{cursor:grab}.bt-dragcell:active{cursor:grabbing}}
        .bt-burger{display:none;align-items:center;justify-content:center;width:38px;height:38px;border:1px solid ${C.bord};border-radius:9px;background:#fff;color:${C.text1};cursor:pointer;flex-shrink:0;padding:0}
        .bt-scrim{display:none}
        .bt-mxburger{display:none !important}
        @media (max-width:768px){
          .bt-side{position:fixed;top:0;bottom:0;left:0;z-index:1500;transform:translateX(-105%);transition:transform .2s ease;box-shadow:0 0 40px rgba(0,0,0,.18)}
          .bt-side.open{transform:none}
          .bt-scrim{display:block;position:fixed;inset:0;background:rgba(43,46,74,.35);z-index:1400}
          .bt-burger{display:inline-flex}
          .bt-topbar{padding:10px 16px !important;flex-wrap:wrap}
          .bt-topctl{width:100%;justify-content:flex-start !important}
          .bt-topctl .bt-search{flex:1 1 100%}
          .bt-pad{padding-left:16px !important;padding-right:16px !important}
          .bt-benchgrid,.bt-bench{grid-template-columns:1fr !important}
          .bt-mx{grid-template-columns:1fr !important}
          .bt-mxnav{display:none}.bt-mxnav.open{display:block;position:static !important;max-height:60vh !important;border-right:0 !important;border-bottom:1px solid #E7E8F1}
          .bt-mxburger{display:inline-flex !important}
          .bt-mxcmp{grid-template-columns:repeat(3,minmax(0,1fr)) !important;row-gap:14px}
          .bt-benchgrid>div:first-child{position:static !important}
          .bt-hide-sm{display:none}
        }
        @keyframes bt-pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>

      {/* ── SIDEBAR (slides in from ☰ on phones) */}
      {navOpen&&<div className="bt-scrim" onClick={()=>setNavOpen(false)}/>}
      <div className={"bt-side"+(navOpen?" open":"")} style={{width:"224px",flexShrink:0,background:C.nav,borderRight:`1px solid ${C.bord}`,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{padding:"14px 10px 14px",display:"flex",alignItems:"center",gap:"9px"}}>
          <div style={{width:"26px",height:"26px",borderRadius:"7px",background:C.teal,color:"#F8F9FC",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter',system-ui,sans-serif",fontWeight:"700",fontSize:"13px",flexShrink:0}}>B</div>
          <span style={{fontFamily:"'Inter',system-ui,sans-serif",fontWeight:"700",fontSize:"14px",flex:1,whiteSpace:"nowrap",color:C.text1}}>BodyData</span>
          {liveData&&<div style={{width:"7px",height:"7px",borderRadius:"50%",background:"#1F9D6B",flexShrink:0,animation:"bt-pulse 2s infinite"}}/>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"4px 10px 14px"}}>
          {!(apiSecret&&!liveHistory.length&&!liveData)&&<div className="bt-eyebrow" style={{padding:"8px 10px 6px",fontSize:"9.5px"}}>Health Analytics</div>}
          {[
            {gid:"body",        label:"Body Composition"},
            {gid:"segmental",   label:"Segmental Fat"},
            {gid:"sleep",       label:"Sleep & Recovery"},
            {gid:"nutrition",   label:"Nutrition"},
            {gid:"mealTiming",  label:"Meal Timing"},
            {gid:"activity",    label:"Activity"},
            {gid:"training",    label:"Training"},
            {gid:"measurements",label:"Measurements"},
          ].filter(item=>!(apiSecret&&!liveHistory.length&&!liveData)&&!kpiBoard?.emptyGroups?.has(item.gid)).map(item=>{
            const isActive=tab==="kpis"&&activeSection===item.gid;
            return (
              <button key={item.gid}
                onClick={()=>{
                  setTab("kpis");setNavOpen(false);
                  setKpiDetail(null);
                  const el=document.getElementById("section-"+item.gid);
                  if(el) el.scrollIntoView({behavior:"smooth",block:"start"});
                  setActiveSection(item.gid);
                }}
                className={"bt-navitem"+(isActive?" on":"")}>
                {item.label}
              </button>
            );
          })}
          <div className="bt-eyebrow" style={{padding:"12px 10px 6px",fontSize:"9.5px"}}>Tools</div>
          {[
            {id:"metrics",  label:"Metrics"},
            {id:"ask",      label:"Ask AI"},
            {id:"measurements",label:"Measurements"},
            {id:"automations",label:"Automations"},
            ...(Object.keys(BENCH_REF).length?[{id:"benchmarks",label:"Benchmarks"}]:[]),
            {id:"profile",  label:"Profile & goal"},
            {id:"feedback", label:"Feedback"},
            {id:"manual",   label:"Manual Entry"},
            {id:"sync",     label:"Sync"},
            ...(isOwner?[
            {id:"coach",    label:"AI Coach"},
            {id:"meals",    label:"Meal Planner"},
            {id:"habits",   label:"Habits"},
            {id:"log",      label:"Log"},
            {id:"workout",  label:"Workout"},
            {id:"notes",    label:"Notes"},
            {id:"photos",   label:"Photos"},
            {id:"summary",  label:"Summary"},
            {id:"dashboard",label:"Dashboard"}]:[]),
          ].map(item=>{
            const isActive=tab===item.id;
            return (
              <button key={item.id} onClick={()=>{setTab(item.id);setNavOpen(false);}}
                className={"bt-navitem"+(isActive?" on":"")}>
                <span style={{flex:1}}>{item.label}</span>
                {item.id==="sync"&&liveData&&<span style={{width:"6px",height:"6px",borderRadius:"50%",background:"#1F9D6B",flexShrink:0}}/>}
              </button>
            );
          })}
        </div>
        <button onClick={()=>window.location.reload()} className="bt-navitem" style={{margin:"0 10px 10px",width:"auto"}}>
          ↻ Refresh data
        </button>
      </div>

      {/* ── MAIN CONTENT */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Top bar */}
        <div className="bt-topbar" style={{background:C.bg,borderBottom:`1px solid ${C.bord}`,padding:"10px 28px",display:"flex",alignItems:"center",gap:"12px",flexShrink:0}}>
          <button className="bt-burger" aria-label="Menu" onClick={()=>setNavOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div style={{flex:1,minWidth:0}}>
            <div className="bt-eyebrow" style={{marginBottom:"2px"}}>
              {tab==="kpis"?"Health KPIs":tab==="coach"?"Tools":tab==="meals"?"Tools":"Tools"}
            </div>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontWeight:"700",fontSize:"20px",lineHeight:1.2,color:C.text1}}>
              {tab==="kpis"?"All Health KPIs"
                :tab==="ask"?"Ask AI":tab==="metrics"?"Metrics":tab==="automations"?"Automations":tab==="benchmarks"?"Benchmarks":tab==="profile"?"Profile & goal":tab==="measurements"?"Measurements":tab==="feedback"?"Feedback":tab==="coach"?"AI Coach":tab==="meals"?"Meal Planner":tab==="habits"?"Habits"
                :tab==="log"?"Log":tab==="workout"?"Workout":tab==="notes"?"Notes"
                :tab==="photos"?"Photos":tab==="manual"?"Manual Entry":tab==="sync"?"Sync & Connect"
                :tab==="summary"?"Summary":"Dashboard"}
            </div>
            {tab==="kpis"&&liveData&&<div style={{fontSize:"12px",color:C.text3,marginTop:"1px"}}>
              Last sync {liveData.syncDate}{liveData.syncTime?` · ${liveData.syncTime}`:""}
            </div>}
          </div>
          {tab==="kpis"&&(
            <div className="bt-topctl" style={{display:"flex",justifyContent:"flex-end",gap:"10px",flexWrap:"wrap",flexShrink:0}}>
              <label className="bt-search">
                <IcSearch/>
                <input value={kpiSearch} onChange={e=>setKpiSearch(e.target.value)} placeholder="Search KPIs"/>
              </label>
              <div style={{position:"relative"}} onClick={e=>e.stopPropagation()}>
                <button className="bt-ctl" onClick={()=>{setKpiCustOpen(o=>!o);setKpiRangeOpen(false);}}>
                  <IcSliders/>Customize
                  {kpiHidden.length>0&&<span style={{background:C.teal,color:"#fff",fontSize:"10.5px",fontWeight:700,borderRadius:"10px",padding:"1px 6px"}}>{kpiHidden.length} hidden</span>}
                </button>
                {kpiCustOpen&&(()=>{
                  const ALLG=[...GROUPS,...(kpiBoard?.extraGroups||[])];
                  const total=ALLG.reduce((a,g)=>a+g.rows.length,0);
                  const shown=ALLG.reduce((a,g)=>a+g.rows.filter(r=>!kpiHidden.includes(r.k)).length,0);
                  return (
                    <div className="bt-pop" style={{top:"44px",right:0,width:"340px",maxHeight:"70vh",display:"flex",flexDirection:"column"}}>
                      <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #EEF0F6",display:"flex",alignItems:"center",gap:"8px"}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:600,fontSize:"14px",color:C.text1}}>Customize dashboard</div>
                          <div style={{fontSize:"12px",color:C.text3}}>{shown} of {total} KPIs shown</div>
                        </div>
                        <button className="bt-btn" onClick={()=>setKpiHidden([])}>Show all</button>
                      </div>
                      <div style={{overflow:"auto",padding:"6px 10px 12px"}}>
                        {ALLG.map(g=>{
                          const keys=g.rows.map(r=>r.k);
                          const allOn=keys.every(k=>!kpiHidden.includes(k));
                          return (
                            <div key={g.id} style={{marginTop:"10px"}}>
                              <div style={{display:"flex",alignItems:"center",padding:"0 6px 4px"}}>
                                <span className="bt-eyebrow" style={{flex:1}}>{g.name}</span>
                                <button onClick={()=>setKpiHidden(h=>allOn?[...new Set([...h,...keys])]:h.filter(k=>!keys.includes(k)))}
                                  style={{border:0,background:"none",color:C.teal,fontSize:"12px",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{allOn?"Hide all":"Show all"}</button>
                              </div>
                              {g.rows.map(r=>{
                                const on=!kpiHidden.includes(r.k);
                                return (
                                  <button key={r.k} className="bt-menuitem" aria-pressed={on}
                                    onClick={()=>setKpiHidden(h=>on?[...h,r.k]:h.filter(x=>x!==r.k))}>
                                    <span style={{flex:1,color:on?C.text1:C.text3}}>{r.l}</span>
                                    <span style={{width:"30px",height:"18px",borderRadius:"10px",background:on?C.teal:"#D9D7D1",position:"relative",flexShrink:0}}>
                                      <span style={{position:"absolute",top:"2px",left:on?"14px":"2px",width:"14px",height:"14px",borderRadius:"50%",background:"#fff",transition:"left .15s"}}/>
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div style={{position:"relative"}} onClick={e=>e.stopPropagation()}>
                <button className="bt-ctl" onClick={()=>{setKpiRangeOpen(o=>!o);setKpiCustOpen(false);}}>
                  <IcCal/>{dkLabel(kpiRange)}
                  <span className="bt-hide-sm" style={{color:C.text3,fontWeight:400}}>· {fmtSpan(kr.a,kr.b)}</span>
                  <span style={{color:C.text3,display:"flex"}}><IcChev/></span>
                </button>
                {kpiRangeOpen&&(
                  <div className="bt-pop" style={{top:"44px",right:0,width:"min(440px,calc(100vw - 32px))",display:"flex",flexWrap:"wrap"}}>
                    <div style={{padding:"6px",borderRight:"1px solid #EEF0F6",flex:"1 1 170px"}}>
                      {DK_PRESETS.map(([k,l])=>(
                        <button key={k} className="bt-menuitem" onClick={()=>{setKpiRange({p:k});setKpiRangeOpen(false);setKpiDetail(null);}}>
                          <span style={{flex:1}}>{l}</span>
                          {kpiRange.p===k&&<span style={{color:C.teal,fontWeight:700}}>✓</span>}
                        </button>
                      ))}
                    </div>
                    <div style={{padding:"14px",flex:"1 1 200px",display:"flex",flexDirection:"column",gap:"10px"}}>
                      <div className="bt-eyebrow">Custom range</div>
                      <label style={{fontSize:"12px",color:"#7A80A6"}}>From
                        <input type="date" className="bt-date" value={kr.a} max={todayYmd()}
                          onChange={e=>{if(e.target.value){setKpiRange({p:"custom",a:e.target.value,b:kr.b});setKpiRangeOpen(false);}}}/>
                      </label>
                      <label style={{fontSize:"12px",color:"#7A80A6"}}>To
                        <input type="date" className="bt-date" value={kr.b} max={todayYmd()}
                          onChange={e=>{if(e.target.value){setKpiRange({p:"custom",a:kr.a,b:e.target.value});setKpiRangeOpen(false);}}}/>
                      </label>
                      <div style={{fontSize:"11.5px",color:C.text3,lineHeight:1.45}}>
                        Compared with {kr.cmpLbl}: {fmtSpan(kr.ca,kr.cb)}.<br/>{daysIncl(kr.a,kr.b)<=45?"Daily trend.":"Monthly trend."}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content scroll */}
        <div ref={scrollAreaRef} style={{flex:1,overflowY:"auto",background:C.bg}}>

      {/* ══════════ KPI GRID TAB ══════════ */}
      {tab==="kpis"&&kpiBoard&&(()=>{
        if(kpiDetail){
          const c=kpiBoard.byId[kpiDetail.id];
          if(c) return <BtKpiDetail c={c} r={kr} rangeLbl={`${dkLabel(kpiRange)} · ${fmtSpan(kr.a,kr.b)}`} onBack={()=>setKpiDetail(null)}/>;
        }
        const q=kpiSearch.trim().toLowerCase();
        return (
          <div className="bt-pad" style={{padding:"18px 28px 28px",fontFamily:"'Inter',system-ui,sans-serif"}}>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:"18px",fontWeight:700,color:C.text1}}>Health performance</div>
            <div style={{fontSize:"12.5px",color:C.text3,marginTop:"2px"}}>
              {dkLabel(kpiRange)} · {fmtSpan(kr.a,kr.b)} · compared with {kr.cmpLbl} · click any KPI for its full history · hold and drag to rearrange
            </div>
            {apiSecret&&!liveHistory.length&&!liveData&&(
              <div className="bt-card" style={{marginTop:"16px",padding:"18px 20px"}}>
                <b style={{color:C.text1,fontSize:"15px"}}>No data yet</b>
                <div style={{fontSize:"13px",color:C.text2,marginTop:"6px",lineHeight:1.55}}>Your board fills in as soon as data arrives. Two ways to start:<br/>
                  1. <b>iPhone:</b> install the BodyData app and allow Apple Health. Your full history comes in on the first sync.<br/>
                  2. <b>Upload a file:</b> a lab report, DEXA scan or an export from MyFitnessPal, Strava, WHOOP and others.</div>
                <div style={{display:"flex",gap:"8px",marginTop:"12px",flexWrap:"wrap"}}>
                  <button className="bt-btn" onClick={()=>setTab("automations")} style={{background:C.teal,borderColor:C.teal,color:"#fff"}}>Upload a file</button>
                  <button className="bt-btn" onClick={()=>setTab("ask")}>Ask AI how to connect a device</button>
                </div>
              </div>)}
            {userProfile&&!userProfile.profile?.completedAt&&(
              <button onClick={()=>setTab("profile")} className="bt-card" style={{display:"flex",alignItems:"center",gap:"12px",width:"100%",marginTop:"16px",padding:"14px 18px",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                <span style={{fontSize:"20px"}}>🎯</span>
                <span style={{flex:1}}><b style={{color:C.text1,fontSize:"14px"}}>Personalize BodyData</b><br/><span style={{fontSize:"12.5px",color:C.text3}}>Set your goal, target and apps (60 seconds). Your board, benchmarks and AI coach adapt to it.</span></span>
                <span style={{color:C.teal,fontWeight:600,fontSize:"13px"}}>Start →</span>
              </button>)}
            <GoalCard goal={userProfile?.goal} onEdit={()=>setTab("profile")}/>
            {(()=>{ const gids=userProfile?.profile?.goals?.length?userProfile.profile.goals:userProfile?.profile?.goal?[userProfile.profile.goal]:[];
              const pri=[...new Set(gids.flatMap(id=>userProfile?.options?.goals?.find(x=>x.id===id)?.groups||[]))];   // same order the iPhone uses (server-defined)   // same order the iPhone uses (server-defined)
              const rank=id=>{const i=pri.indexOf(id);return i<0?99:i;};
              return [...GROUPS,...kpiBoard.extraGroups].map((g,i)=>[g,i]).sort((a,b)=>(rank(a[0].id)-rank(b[0].id))||(a[1]-b[1])).map(x=>x[0]); })().map(g=>{
              const saved=kpiOrder[g.id]||[];
              const pos=id=>{const i=saved.indexOf(id);return i<0?1e6:i;};
              const cards=kpiBoard.groups[g.id].map((c,i)=>[c,i]).sort((a,b)=>(pos(a[0].id)-pos(b[0].id))||(a[1]-b[1])).map(x=>x[0])
                .filter(c=>!kpiHidden.includes(c.k)&&(!q||c.label.toLowerCase().includes(q)));
              if(!cards.length||kpiBoard.emptyGroups?.has(g.id)) return null;
              return (
                <div key={g.id} id={"section-"+g.id} data-section={g.id} style={{marginTop:"26px",scrollMarginTop:"16px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"12px",flexWrap:"wrap"}}>
                    <span style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:"12px",fontWeight:700,letterSpacing:".09em",textTransform:"uppercase",color:C.text1}}>{g.name}</span>
                    {(GROUP_DESC[g.id]||g.desc)&&<span style={{fontSize:"12px",color:C.text3}}>{GROUP_DESC[g.id]||g.desc}</span>}
                    <span style={{flex:1,height:"1px",background:C.bord,minWidth:"20px"}}/>
                    {saved.length>0&&<button onClick={()=>setKpiOrder(o=>{const n={...o};delete n[g.id];return n;})}
                      style={{border:0,background:"none",color:C.teal,fontSize:"11.5px",fontWeight:600,cursor:"pointer",padding:0,fontFamily:"inherit"}}>Reset order</button>}
                    <span style={{fontSize:"11.5px",color:C.text3}}>{cards.length} metrics</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(260px,100%),1fr))",gap:"14px"}}>
                    {cards.map(c=>(
                      <div key={c.id} data-kcard={c.id} data-gid={g.id}
                        onMouseDown={e=>dragStart(e,c.id,g.id,"mouse")}
                        onTouchStart={e=>dragStart(e,c.id,g.id,"touch")}
                        onContextMenu={e=>{ if(drag) e.preventDefault(); }}
                        onClickCapture={e=>{ if(dragRef.current.suppress){ e.stopPropagation(); e.preventDefault(); } }}
                        className="bt-dragcell"
                        style={{display:"flex",opacity:drag?.id===c.id?.25:1,transition:"opacity .15s"}}>
                        <div style={{flex:1,display:"flex",minWidth:0}}>
                          <BtKpiCard c={c} cmpLbl={kr.cmpLbl}
                            onOpen={()=>{setKpiDetail({id:c.id});if(scrollAreaRef.current)scrollAreaRef.current.scrollTop=0;}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* ══════════ SYNC TAB ══════════ */}
      {tab==="sync" && (
        <div style={{padding:"16px",maxWidth:"820px",margin:"0 auto"}}>

          {/* API Connector card */}
          <div style={{...panel,marginBottom:"16px",borderColor:apiStatus==="live"?"#00ff9d50":apiStatus==="error"?"#ff6b3550":"#fbbf2440"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"12px",marginBottom:"14px"}}>
              <div>
                <div style={{fontSize:"14px",fontWeight:"bold",letterSpacing:"2px",marginBottom:"6px",
                  color:apiStatus==="live"?"#00ff9d":apiStatus==="error"?"#ff6b35":apiStatus==="polling"?"#fbbf24":"#a0a0a0"}}>
                  {apiStatus==="live"?"✓ LIVE — AUTO-POLLING APPLE HEALTH":
                   apiStatus==="error"?"⚠ CONNECTION ERROR":
                   apiStatus==="polling"?"⟳ CONNECTED — WAITING FOR iOS SYNC":
                   "◉ CONNECT YOUR iOS APP"}
                </div>
                <div style={{fontSize:"12px",color:C.text2,lineHeight:"1.7"}}>
                  {apiStatus==="live" ? `Polling every 2 min · Last sync: ${liveData?.syncDate} ${liveData?.syncTime}` :
                   apiStatus==="error" ? apiError :
                   apiStatus==="polling" ? "API connected · Open BodyData Health on iPhone and tap Sync Now" :
                   "Enter your Railway API URL and secret key to enable automatic sync"}
                </div>
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap"}}>
                <button onClick={()=>setShowApiSetup(!showApiSetup)} style={bOut(apiStatus==="live"?"#00ff9d":C.text3)}>
                  {apiStatus==="live"?"⚙ EDIT CONFIG":"⚡ CONNECT API"}
                </button>
                {apiStatus==="live"&&<button onClick={()=>fetchFromAPI(apiURL,apiSecret)} style={bFill("#00ff9d")}>↻ REFRESH</button>}
              </div>
            </div>

            {/* API Setup form */}
            {showApiSetup && (
              <div style={{borderTop:`1px solid ${C.bord}`,paddingTop:"14px",marginTop:"4px"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px",marginBottom:"12px"}}>
                  <div>
                    <label style={{fontSize:"10px",color:C.text3,letterSpacing:"1px",display:"block",marginBottom:"5px",fontWeight:"600"}}>RAILWAY API URL</label>
                    <input defaultValue={apiURL} id="api-url-input"
                      placeholder="https://your-app.railway.app/sync"
                      style={{...inp,width:"100%",boxSizing:"border-box",fontSize:"12px"}}/>
                    <div style={{fontSize:"10px",color:C.dim,marginTop:"4px"}}>From Railway dashboard → your service → Settings</div>
                  </div>
                  <div>
                    <label style={{fontSize:"10px",color:C.text3,letterSpacing:"1px",display:"block",marginBottom:"5px",fontWeight:"600"}}>SECRET KEY</label>
                    <input defaultValue={apiSecret} id="api-secret-input" type="password"
                      placeholder="BIOTRACK_SECRET_2024"
                      style={{...inp,width:"100%",boxSizing:"border-box",fontSize:"12px"}}/>
                    <div style={{fontSize:"10px",color:C.dim,marginTop:"4px"}}>Must match Railway SECRET_KEY env var and iOS app</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:"8px"}}>
                  <button onClick={()=>{
                    const u=document.getElementById("api-url-input").value.trim();
                    const s=document.getElementById("api-secret-input").value.trim();
                    if(u&&s) saveAPIConfig(u,s);
                  }} style={bFill("#00ff9d")}>⚡ SAVE & CONNECT</button>
                  <button onClick={()=>setShowApiSetup(false)} style={bOut(C.text3)}>CANCEL</button>
                </div>
              </div>
            )}

            {/* Source status dots */}
            {liveData && (
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",marginTop:"14px"}}>
                {[
                  {n:"HUME",c:"#ff6b35",keys:["weight","bodyFat"]},
                  {n:"OURA",c:"#a78bfa",keys:["sleepScore","hrv"]},
                  {n:"MYFITNESSPAL",c:"#34d399",keys:["calories","protein"]},
                  {n:"APPLE HEALTH",c:"#f43f5e",keys:["steps","calsBurned"]},
                  {n:"FITBOD",c:"#fbbf24",keys:["workoutType"]},
                ].map(s=>{
                  const has=s.keys.some(k=>liveData[k]!==undefined&&liveData[k]!==null);
                  return (
                    <div key={s.n} style={{background:has?s.c+"18":C.surf2,border:`1px solid ${has?s.c+"60":C.bord}`,borderRadius:"4px",padding:"5px 12px",display:"flex",alignItems:"center",gap:"6px"}}>
                      <div style={{width:"6px",height:"6px",borderRadius:"50%",background:has?s.c:C.dim}}/>
                      <span style={{fontSize:"10px",color:has?s.c:C.text3,letterSpacing:"1px",fontWeight:"600"}}>{s.n}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Manual paste fallback */}
          <div style={{...panel,marginBottom:"16px",borderColor:C.bord}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:pasteMode?"14px":"0"}}>
              <div>
                <div style={{fontSize:"12px",color:C.text2,fontWeight:"600"}}>📋 Manual Paste (fallback)</div>
                <div style={{fontSize:"11px",color:C.dim,marginTop:"3px"}}>Use if iOS Shortcut data is easier than deploying API</div>
              </div>
              <button onClick={()=>setPasteMode(!pasteMode)} style={bOut(C.text3)}>{pasteMode?"CANCEL":"PASTE DATA"}</button>
            </div>
            {pasteMode&&(
              <div style={{marginTop:"14px"}}>
                <textarea value={jsonDraft} onChange={e=>setJsonDraft(e.target.value)}
                  placeholder={'{\n  "steps": 9241,\n  "bodyFat": 17.9,\n  "protein": 192,\n  ...\n}'}
                  style={{...inp,width:"100%",height:"130px",resize:"vertical",boxSizing:"border-box",lineHeight:"1.7",fontSize:"12px"}}/>
                {jsonError&&<div style={{color:"#ff6b35",fontSize:"12px",marginTop:"6px"}}>⚠ {jsonError}</div>}
                <div style={{display:"flex",gap:"8px",marginTop:"10px"}}>
                  <button onClick={importJSON} disabled={!jsonDraft.trim()} style={bFill("#00ff9d")}>IMPORT</button>
                  <button onClick={()=>{setPasteMode(false);setJsonDraft("");setJsonError("");}} style={bOut(C.text3)}>CANCEL</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Daily Coaching Settings ── */}
          <CoachingSettings apiURL={apiURL} apiSecret={apiSecret} panel={panel} inp={inp} bFill={bFill} bOut={bOut} />

          {/* Shortcut guide */}
          {sectionLabel("iOS SHORTCUT SETUP GUIDE — 5 PHASES · ~10 MINUTES")}
          {PHASES.map((ph,pi)=>(
            <div key={pi} style={{...panel,marginBottom:"8px",borderColor:openPhase===pi?ph.color+"60":C.bord,padding:"0"}}>
              <div onClick={()=>setOpenPhase(openPhase===pi?-1:pi)} style={{padding:"14px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer"}}>
                <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                  <div style={{width:"30px",height:"30px",borderRadius:"50%",background:ph.color+"20",border:`2px solid ${ph.color}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"12px",color:ph.color,fontWeight:"bold",flexShrink:0}}>
                    {pi+1}
                  </div>
                  <div>
                    <div style={{fontSize:"10px",color:ph.color,letterSpacing:"2px",fontWeight:"600"}}>{ph.phase}</div>
                    <div style={{fontSize:"13px",color:C.text1,marginTop:"2px",fontWeight:"600"}}>{ph.title}</div>
                  </div>
                </div>
                <span style={{color:C.text3,fontSize:"14px"}}>{openPhase===pi?"▲":"▼"}</span>
              </div>
              {openPhase===pi && (
                <div style={{padding:"0 16px 16px",borderTop:`1px solid ${C.bord}`}}>
                  {ph.note && (
                    <div style={{background:"#0d0d1e",border:`1px solid ${C.bord2}`,borderRadius:"4px",padding:"10px 14px",margin:"12px 0",fontSize:"12px",color:C.text2,lineHeight:"1.7"}}>
                      💡 {ph.note}
                    </div>
                  )}
                  <div style={{marginTop:ph.note?"0":"14px"}}>
                    {ph.steps.map((step,si)=>(
                      <div key={si} style={{display:"flex",gap:"12px",padding:"10px 0",borderBottom:`1px solid ${C.surf2}`}}>
                        <div style={{minWidth:"24px",height:"24px",borderRadius:"50%",background:ph.color+"18",border:`1px solid ${ph.color}60`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"10px",color:ph.color,flexShrink:0,marginTop:"1px",fontWeight:"bold"}}>
                          {si+1}
                        </div>
                        <div style={{fontSize:"12px",lineHeight:"1.8",paddingTop:"2px"}}>
                          {step.split("→").map((part,i)=>(
                            <span key={i}>
                              {i>0&&<span style={{color:ph.color,margin:"0 6px",fontWeight:"bold"}}>→</span>}
                              <span style={{color:i===0?C.text1:C.text2}}>{part.trim()}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  {pi===4 && (
                    <div style={{marginTop:"14px",background:"#0d2010",border:"1px solid #00ff9d30",borderRadius:"4px",padding:"14px"}}>
                      <div style={{fontSize:"11px",color:"#00ff9d",letterSpacing:"1px",marginBottom:"8px",fontWeight:"600"}}>✓ DAILY SYNC FLOW — WHAT HAPPENS AUTOMATICALLY</div>
                      <div style={{fontSize:"12px",color:"#90c890",lineHeight:"2.2"}}>
                        4am · 12pm · 5pm · 11pm → Shortcut runs automatically<br/>
                        → reads all Apple Health data → copies JSON to clipboard<br/>
                        → <span style={{color:"#a78bfa"}}>BodyData opens automatically in Safari</span><br/>
                        → tap <span style={{color:"#00ff9d"}}>📋 PASTE SHORTCUT DATA</span> → paste → <span style={{color:"#00ff9d"}}>IMPORT & GO LIVE</span> ✓
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Sample JSON */}
          <div style={{...panel,marginTop:"14px"}}>
            {sectionLabel("EXPECTED JSON FORMAT FROM YOUR SHORTCUT:")}
            <pre style={{fontSize:"11px",color:C.text2,overflow:"auto",margin:0,lineHeight:"1.9"}}>{`{
  "syncDate":       "Apr 8",      ← Current Date
  "syncTime":       "11:00 PM",   ← Current Date
  "steps":           9241,         ← Apple Health
  "activeCalories":  720,          ← Apple Watch
  "restingHR":       51,           ← Oura / Apple Watch
  "avgHR":           67,           ← Apple Watch
  "vo2max":          43.2,         ← Apple Watch
  "standHours":      11,           ← Apple Watch
  "weight":          197.4,        ← Hume → Apple Health
  "bodyFat":         17.9,         ← Hume → Apple Health
  "leanMass":        162.1,        ← Hume → Apple Health
  "calories":        2210,         ← MFP → Apple Health
  "protein":         192,          ← MFP → Apple Health
  "carbs":           175,          ← MFP → Apple Health
  "fat":             68,           ← MFP → Apple Health
  "water":           3.4,          ← MFP → Apple Health
  "workoutType":     "Push",       ← Fitbod → Apple Health
  "workoutDur":      54            ← Fitbod → Apple Health
}`}</pre>
          </div>
        </div>
      )}

      {/* ══════════ SUMMARY TAB ══════════ */}
      {tab==="summary" && (()=>{
        const rdDays = summaryRange==="7d"?7:summaryRange==="30d"?30:summaryRange==="90d"?90:summaryRange==="180d"?180:summaryRange==="365d"?365:99999;
        // Fall back to DEMO data when not connected (same as Dashboard)
        const histSrc = (liveHistory && liveHistory.length > 0) ? liveHistory : (apiSecret ? [] : DEMO);
        const nowMs = Date.now();
        const allDays2 = histSrc
          .map(h => ({...h, _ms: (parseSyncDateRobust(h.syncDate)||new Date(0)).getTime(), isDemo:!liveHistory?.length}))
          .filter(h => h._ms <= nowMs)
          .sort((a, b) => b._ms - a._ms);
        const rangeData2 = allDays2.slice(0, Math.min(rdDays, allDays2.length));
        // Use most-recent non-null value for each metric (avoids partial today data like 76 steps at 6am)
        const latestVal = (key) => rangeData2.find(d => d[key] != null && d[key] !== 0)?.[key] ?? null;
        const oldestVal = (key) => {
          for (let i = rangeData2.length - 1; i >= 0; i--) {
            if (rangeData2[i][key] != null && rangeData2[i][key] !== 0) return rangeData2[i][key];
          }
          return null;
        };
        const highlights2 = SUMMARY_METRICS.map(m=>{
          const cur=latestVal(m.key), prev=oldestVal(m.key), p=summaryPct(cur,prev);
          return {...m,cur,prev,p};
        }).filter(m=>m.cur!=null);

        // Build ordered metric list — respect saved order, append any new metrics at end
        // Always include core nutrition KPIs even when null (show "—" until food is logged)
        const ALWAYS_SHOW = new Set(["calories","protein","carbs","fat"]);
        const orderedMetrics = (() => {
          const hasData = SUMMARY_METRICS.filter(m => latestVal(m.key) != null || ALWAYS_SHOW.has(m.key));
          if (!summaryOrder) return hasData;
          const saved = summaryOrder.filter(k => hasData.find(m => m.key === k));
          const unsaved = hasData.filter(m => !saved.includes(m.key)).map(m => m.key);
          return [...saved, ...unsaved].map(k => hasData.find(m => m.key === k)).filter(Boolean);
        })();

        const handleDragStart = (e, idx) => {
          summaryDragRef.current = idx;
          e.dataTransfer.effectAllowed = "move";
        };
        const handleDragOver = (e, idx) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        };
        const handleDrop = (e, idx) => {
          e.preventDefault();
          const from = summaryDragRef.current;
          if (from === idx || from == null) return;
          const next = [...orderedMetrics];
          const [moved] = next.splice(from, 1);
          next.splice(idx, 0, moved);
          setSummaryOrder(next.map(m => m.key));
          summaryDragRef.current = null;
        };
        const handleDragEnd = () => { summaryDragRef.current = null; };
        const rl = rangeData2.length ? `${(rangeData2[rangeData2.length-1]?.syncDate||"")} – ${(rangeData2[0]?.syncDate||"")}` : "";
        return (
          <div style={{minHeight:"100vh",background:C.bg}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${C.bord}`,background:"#07070e",flexWrap:"wrap",gap:"10px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <span style={{fontSize:"18px",fontWeight:"bold",color:C.text1,letterSpacing:"1px"}}>📈 Summary</span>
                {rl && <span style={{fontSize:"11px",color:C.dim,background:C.surf,padding:"4px 10px",borderRadius:"4px"}}>{rl}</span>}
              </div>
              <div style={{display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}></div>
              <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
                {SUMMARY_RANGES.map(r=>(
                  <button key={r.id} onClick={()=>setSummaryRange(r.id)}
                    style={{padding:"6px 14px",background:summaryRange===r.id?"#00ff9d":"transparent",
                      border:`1px solid ${summaryRange===r.id?"#00ff9d":C.bord2}`,
                      color:summaryRange===r.id?"#000":C.text2,
                      cursor:"pointer",fontSize:"10px",borderRadius:"4px",
                      fontWeight:summaryRange===r.id?"bold":"normal"}}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:"flex",flexWrap:"wrap"}}>
              <div style={{flex:"1 1 300px",padding:"16px",display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(min(260px,100%),1fr))",gap:"12px",alignContent:"start"}}>
                {orderedMetrics.map((m, idx)=>{
                  const vals=rangeData2.map(d=>d[m.key]).filter(v=>typeof v==="number"&&!isNaN(v));
                  const cur=latestVal(m.key), prev=oldestVal(m.key);
                  const p=summaryPct(cur,prev);
                  const pNum=p!=null?parseFloat(p):null;
                  const isGood=m.lowerBetter?(pNum!=null&&pNum<0):(pNum!=null&&pNum>0);
                  const isBad=m.lowerBetter?(pNum!=null&&pNum>0):(pNum!=null&&pNum<0);
                  return (
                    <div key={m.key}
                      draggable={summaryEdit}
                      onDragStart={summaryEdit?e=>{summaryDragRef.current=idx;e.dataTransfer.effectAllowed="move";}:undefined}
                      onDragOver={summaryEdit?e=>handleDragOver(e,idx):undefined}
                      onDrop={summaryEdit?e=>handleDrop(e,idx):undefined}
                      onDragEnd={summaryEdit?handleDragEnd:undefined}
                      onClick={()=>{ if(!summaryEdit&&summaryDragRef.current==null) setDrillMetric(m); }}
                      style={{background:C.surf,border:`1px solid ${summaryEdit?C.bord2:C.bord}`,borderRadius:"10px",padding:"18px 20px",display:"flex",flexDirection:"column",gap:"6px",cursor:summaryEdit?"grab":"pointer",userSelect:"none",transition:"opacity 0.15s,box-shadow 0.15s"}}
                      onMouseEnter={e=>{e.currentTarget.style.boxShadow=summaryEdit?`0 0 0 2px #00ff9d44`:`0 0 0 2px ${m.col}66`;}}
                      onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";}}
                    >
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <div style={{fontSize:"11px",color:C.text3,letterSpacing:"1.5px",fontWeight:"600"}}>{m.label.toUpperCase()}</div>
                        {summaryEdit
                          ? <span style={{fontSize:"14px",color:C.dim,letterSpacing:"2px",cursor:"grab"}}>⠿</span>
                          : pNum!=null
                            ? <div style={{display:"flex",alignItems:"center",gap:"3px",background:isGood?"#4ade8020":isBad?"#f8717120":"#ffffff10",border:`1px solid ${isGood?"#4ade8040":isBad?"#f8717140":"#ffffff15"}`,borderRadius:"6px",padding:"3px 8px"}}>
                                <span style={{fontSize:"11px"}}>{isGood?"↑":isBad?"↓":"→"}</span>
                                <span style={{fontSize:"11px",fontWeight:"bold",color:isGood?"#4ade80":isBad?"#f87171":C.text3}}>{Math.abs(pNum)}%</span>
                              </div>
                            : null
                        }
                      </div>
                      <div>
                        <div style={{fontSize:"26px",fontWeight:"bold",color:C.text1,lineHeight:"1.1",fontFamily:"'Courier New',monospace"}}>{summaryFmtVal(cur,m.unit)}</div>
                        {prev!=null&&cur!=null&&<div style={{fontSize:"11px",color:C.text2,marginTop:"3px"}}>from {summaryFmtVal(prev,m.unit)}</div>}
                      </div>
                      <div style={{marginTop:"6px"}}>{summarySparkline(vals,m.col,48,240)}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{flex:"1 1 280px",borderLeft:`1px solid ${C.bord}`,padding:"16px",display:"flex",flexDirection:"column",gap:"16px"}}>
                <div>
                  <div style={{fontSize:"16px",fontWeight:"bold",color:C.text1,marginBottom:"14px"}}>Today's Breakdown</div>
                  {highlights2.slice(0,8).map(m=>{
                    const pNum=m.p!=null?parseFloat(m.p):null;
                    const isGood=m.lowerBetter?(pNum!=null&&pNum<0):(pNum!=null&&pNum>0);
                    const isBad=m.lowerBetter?(pNum!=null&&pNum>0):(pNum!=null&&pNum<0);
                    return (
                      <div key={m.key} style={{display:"flex",alignItems:"center",padding:"8px 0",borderBottom:`1px solid ${C.bord}`,gap:"8px"}}>
                        <div style={{width:"7px",height:"7px",borderRadius:"50%",background:m.col,flexShrink:0}}/>
                        <span style={{fontSize:"12px",color:C.text2,minWidth:"90px"}}>{m.label}</span>
                        <span style={{fontSize:"12px",fontWeight:"600",color:C.text1,fontFamily:"'Courier New',monospace"}}>{summaryFmtVal(m.cur,m.unit)}</span>
                        {pNum!=null&&<span style={{fontSize:"10px",color:isGood?"#4ade80":isBad?"#f87171":C.dim}}>{pNum>0?"+":""}{pNum}%</span>}
                      </div>
                    );
                  })}
                </div>
                <div>
                  <div style={{fontSize:"14px",fontWeight:"bold",color:C.text1,marginBottom:"10px"}}>Biggest Changes</div>
                  {highlights2.filter(m=>m.p!=null).sort((a,b)=>Math.abs(parseFloat(b.p))-Math.abs(parseFloat(a.p))).slice(0,6).map(m=>{
                    const pNum=parseFloat(m.p);
                    const isGood=m.lowerBetter?pNum<0:pNum>0;
                    return (
                      <div key={m.key} style={{display:"flex",alignItems:"center",padding:"6px 0",borderBottom:`1px solid ${C.bord}`,gap:"8px"}}>
                        <span style={{fontSize:"11px",color:C.text2,minWidth:"90px"}}>{m.label}</span>
                        <span style={{fontSize:"11px",fontWeight:"bold",color:isGood?"#4ade80":"#f87171"}}>{pNum>0?"+":""}{pNum}%</span>
                      </div>
                    );
                  })}
                </div>
                <div style={{background:C.surf2,border:`1px solid ${C.bord}`,borderRadius:"8px",padding:"12px"}}>
                  <div style={{fontSize:"11px",color:C.text3,letterSpacing:"1px",marginBottom:"8px"}}>DATA COVERAGE</div>
                  <div style={{fontSize:"13px",color:C.text1,marginBottom:"4px"}}>{rangeData2.length} days</div>
                  <div style={{fontSize:"10px",color:C.dim}}>{SUMMARY_METRICS.filter(m=>latestVal(m.key)!=null).length} of {SUMMARY_METRICS.length} metrics with data</div>
                </div>
              </div>
            </div>
            {drillMetric && <MetricDrillDown metric={drillMetric} allData={allDays2} onClose={()=>setDrillMetric(null)}/>}
          </div>
        );
      })()}

      {tab==="dashboard" && (
        <>
          {/* Period selector */}
          <div style={{display:"flex",alignItems:"center",gap:"8px",padding:"10px 16px",borderBottom:`1px solid ${C.bord}`,background:"#07070e",flexWrap:"wrap"}}>
            <span style={{fontSize:"10px",color:C.text3,letterSpacing:"2px",fontWeight:"600"}}>PERIOD:</span>
            {["daily","weekly","monthly","annual"].map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{padding:"6px 14px",background:view===v?"#00ff9d":"transparent",border:`1px solid ${view===v?"#00ff9d":C.bord2}`,color:view===v?"#000":C.text2,cursor:"pointer",fontSize:"10px",letterSpacing:"2px",borderRadius:"3px",fontWeight:view===v?"bold":"normal"}}>
                {v.toUpperCase()}
              </button>
            ))}
            <button onClick={downloadCSV} title={`Download ${view} data as CSV`} style={{marginLeft:"auto",padding:"6px 14px",background:"transparent",border:`1px solid ${C.bord2}`,color:C.text3,cursor:"pointer",fontSize:"10px",letterSpacing:"1px",borderRadius:"3px",display:"flex",alignItems:"center",gap:"6px"}}>
              ⬇ CSV
            </button>
            {!liveData && (
              <span onClick={()=>setTab("sync")} style={{fontSize:"10px",color:"#fbbf24",cursor:"pointer",letterSpacing:"1px"}}>
                ⚡ CONNECT APPLE HEALTH
              </span>
            )}
          </div>

          {/* Data gap banner — shown when last sync was more than 2 days ago */}
          {(()=>{
            if(!liveData?.syncDate) return null;
            const parsed = parseSyncDateRobust(liveData.syncDate);
            if(!parsed) return null;
            const daysAgo = Math.floor((Date.now() - parsed.getTime()) / 86400000);
            if(daysAgo <= 2) return null;
            return (
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 16px",background:"#fbbf2412",borderBottom:`1px solid #fbbf2430`,flexWrap:"wrap",gap:"8px"}}>
                <span style={{fontSize:"11px",color:"#fbbf24"}}>
                  ⚠ Last sync was <strong>{daysAgo} days ago</strong> ({liveData.syncDate}) — scroll right to see your data, or sync to fill the gap
                </span>
                <button onClick={()=>setTab("sync")} style={{padding:"4px 12px",background:"transparent",border:"1px solid #fbbf2460",color:"#fbbf24",cursor:"pointer",fontSize:"10px",borderRadius:"4px"}}>SYNC NOW →</button>
              </div>
            );
          })()}

          {/* Table */}
          <div style={{overflowX:"auto"}}>
            <table style={{borderCollapse:"collapse",fontSize:"13px",tableLayout:"fixed"}}>
              <thead>
                <tr style={{background:"#07070e"}}>
                  <th style={{...TH,textAlign:"left",minWidth:"130px",position:"sticky",left:0,background:"#07070e",zIndex:1,color:C.text1}}>METRIC</th>
                  {cols.map(c=><th key={c.label} style={{...TH,color:c.live?"#00ff9d":c.label==="TODAY"?C.text1:C.text3,width:"80px",minWidth:"70px",maxWidth:"90px",fontSize:c.label==="TODAY"?"11px":"9px",overflow:"hidden",textOverflow:"ellipsis"}}>{c.label}</th>)}
                  <th style={{...TH,textAlign:"center"}}>TREND</th>
                </tr>
              </thead>
              <tbody>
                {sortedGroups.map((g,gi)=>(
                  <Fragment key={g.id}>
                    <tr style={{background:"#0c0c1a",borderTop:`1px solid ${C.bord}`,borderBottom:`1px solid ${C.bord}`}}>
                      {/* Group label cell */}
                      <td style={{padding:"6px 8px",position:"sticky",left:0,background:"#0c0c1a",zIndex:1,whiteSpace:"nowrap"}}>
                        <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                          <div style={{display:"flex",flexDirection:"column",gap:"1px"}}>
                            <button onClick={(e)=>{e.stopPropagation();moveGroup(g.id,-1)}} style={{background:"none",border:"none",color:gi===0?C.dim:C.text3,cursor:gi===0?"default":"pointer",fontSize:"8px",padding:"1px 3px",lineHeight:"1"}}>▲</button>
                            <button onClick={(e)=>{e.stopPropagation();moveGroup(g.id,1)}} style={{background:"none",border:"none",color:gi===sortedGroups.length-1?C.dim:C.text3,cursor:gi===sortedGroups.length-1?"default":"pointer",fontSize:"8px",padding:"1px 3px",lineHeight:"1"}}>▼</button>
                          </div>
                          <div onClick={()=>setExpanded(p=>({...p,[g.id]:!p[g.id]}))} style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer",flexWrap:"wrap"}}>
                            <span style={{color:g.col,fontSize:"11px"}}>{expanded[g.id]?"▾":"▸"}</span>
                            <span style={{color:g.col,fontSize:"10px",letterSpacing:"2px",fontWeight:"bold"}}>{g.name}</span>
                            <span style={{fontSize:"8px",background:g.col+"22",color:g.col,padding:"2px 8px",borderRadius:"3px",letterSpacing:"1px",fontWeight:"600"}}>{g.src}</span>
                            {(() => {
                              const meta = sourceMeta[g.src];
                              const staleThresh = SOURCE_STALE[g.src] ?? 7;
                              const neverMsg = {
                                "FITBOD":       "⚠ never imported — run import-fitbod.js",
                                "MANUAL":       "no measurements entered yet",
                                "HUME":         "no body scan data yet",
                                "OURA":         "no Oura data yet",
                                "MYFITNESSPAL": "no MFP data yet",
                                "APPLE HEALTH": "no Apple Health data yet",
                              };
                              if (!meta) {
                                if (g.src === "FITBOD" || g.src === "MANUAL") {
                                  return <span style={{fontSize:"9px",color:"#f87171",letterSpacing:"1px"}}>{neverMsg[g.src]||"no data yet"}</span>;
                                }
                                return null;
                              }
                              const { daysAgo, lastDate, source } = meta;
                              const stale = daysAgo !== null && daysAgo > staleThresh;
                              const age = daysAgo === null ? "unknown"
                                : daysAgo === 0 ? "today"
                                : daysAgo === 1 ? "yesterday"
                                : `${daysAgo}d ago`;
                              const verb = source === "import" ? "imported" : "synced";
                              const through = lastDate ? ` · through ${lastDate}` : "";
                              return (
                                <span style={{fontSize:"9px",color:stale?"#f87171":"#4ade80",letterSpacing:"1px",display:"flex",alignItems:"center",gap:"4px"}}>
                                  {stale ? "⚠" : "✓"} {verb} {age}{through}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </td>
                      {/* Date label cells — one per column */}
                      {cols.map(c=>(
                        <td key={c.label} style={{padding:"6px 4px",textAlign:"center",width:"80px",minWidth:"70px",maxWidth:"90px"}}>
                          <span style={{fontSize:"9px",color:c.live?"#00ff9d":c.label==="TODAY"?C.text2:C.dim,fontWeight:c.live||c.label==="TODAY"?"600":"normal",letterSpacing:"0.5px"}}>
                            {c.label}
                          </span>
                        </td>
                      ))}
                      {/* Trend column placeholder */}
                      <td style={{padding:"6px 4px",textAlign:"center"}}>
                        <span style={{fontSize:"9px",color:C.dim}}>TREND</span>
                      </td>
                    </tr>
                    {expanded[g.id] && g.rows.map(row=>{
                      const vals=cols.map(c=>c.data[row.k]);

                      // Body comp carry-forward suppression:
                      // A daily sync used to send the most-recent HealthKit reading regardless of
                      // when it was taken, filling every day with stale data. Suppress a value when:
                      //   (a) bodyCompMeasuredDate exists and doesn't match this column's date, OR
                      //   (b) no bodyCompMeasuredDate (old data) and the value is identical to the
                      //       next (older) column — indicating the iOS app carried it forward.
                      const displayVals = g.id === "body" ? vals.map((v, ci) => {
                        if (typeof v !== "number") return v;
                        const col = cols[ci];
                        const measuredDate = col.data?.bodyCompMeasuredDate;
                        if (measuredDate) {
                          return measuredDate === col.dateKey ? v : undefined;
                        }
                        // Historical heuristic: same value as older day = likely carry-forward
                        const olderVal = vals[ci + 1];
                        return (typeof olderVal === "number" && v === olderVal) ? undefined : v;
                      }) : vals;

                      const nums=displayVals.filter(v=>typeof v==="number");
                      const trend=nums.length>=2?(nums[0]>nums[nums.length-1]?"↑":nums[0]<nums[nums.length-1]?"↓":"—"):"—";
                      const lowerIsBetter = row.fat || row.lib;
                      const trendGood = lowerIsBetter ? trend==="↓" : trend==="↑";

                      // % change: each col vs the next col (current vs prior period)
                      const pctChanges = displayVals.map((v,ci)=>{
                        if(typeof v!=="number") return null;
                        const prev = displayVals[ci+1];
                        if(typeof prev!=="number"||prev===0) return null;
                        return ((v - prev) / Math.abs(prev)) * 100;
                      });

                      // For workoutType row: find previous same workout and compare vol+dur
                      const workoutComparisons = row.k === "workoutType"
                        ? cols.map((col, ci) => {
                            const wType = col.data?.workoutType;
                            if(!wType || wType === "Rest" || !col.allDays) return null;
                            const prev = findPrevSameWorkout(wType, col.dayIndex ?? ci, col.allDays);
                            if(!prev) return null;
                            const curVol = col.data.workoutVol;
                            const curDur = col.data.workoutDur;
                            const prevVol = prev.workoutVol;
                            const prevDur = prev.workoutDur;
                            const volPct = (curVol && prevVol && prevVol > 0) ? ((curVol - prevVol) / prevVol) * 100 : null;
                            const durPct = (curDur && prevDur && prevDur > 0) ? ((curDur - prevDur) / prevDur) * 100 : null;
                            return { volPct, durPct, prevDate: prev.date };
                          })
                        : null;

                      return (
                        <tr key={row.k} style={{background:row.hi?"#0e0e1e":C.bg,borderBottom:`1px solid ${C.surf2}`}}>
                          <td style={{padding:"6px 6px 6px 12px",textAlign:"left",color:C.text1,fontSize:"14px",position:"sticky",left:0,background:row.hi?"#0e0e1e":C.bg,zIndex:1,whiteSpace:"nowrap",fontWeight:row.hi?"600":"normal"}}>
                            {row.l}{row.u&&<span style={{color:C.text1,marginLeft:"4px",fontWeight:"normal",opacity:0.7}}>{row.u}</span>}
                          </td>
                          {displayVals.map((v,ci)=>{
                            // Workout type cell — show vol% and dur% vs last same workout
                            if(row.k === "workoutType") {
                              const cmp = workoutComparisons?.[ci];
                              const isRest = v === "Rest" || !v;
                              return (
                                <td key={ci} style={{...TD,verticalAlign:"middle",color:ci===0?C.text1:C.text2,fontWeight:ci===0?"600":"normal",fontSize:ci===0?"15px":"14px"}}>
                                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"2px"}}>
                                    <span>{fmtV(row.k,v)}</span>
                                    {!isRest && cmp && (
                                      <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"1px"}}>
                                        {cmp.volPct !== null && (
                                          <span style={{fontSize:"10px",fontWeight:"600",color:cmp.volPct>=0?"#4ade80":"#ff6b35",letterSpacing:"0.3px",lineHeight:"1"}}>
                                            {cmp.volPct>=0?"+":""}{cmp.volPct.toFixed(1)}% vol
                                          </span>
                                        )}
                                        {cmp.durPct !== null && (
                                          <span style={{fontSize:"10px",fontWeight:"600",color:cmp.durPct>=0?"#4ade80":"#ff6b35",letterSpacing:"0.3px",lineHeight:"1"}}>
                                            {cmp.durPct>=0?"+":""}{cmp.durPct.toFixed(1)}% dur
                                          </span>
                                        )}
                                        {cmp.prevDate && (
                                          <span style={{fontSize:"9px",color:C.dim,lineHeight:"1",marginTop:"1px"}}>
                                            vs {cmp.prevDate}
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    {!isRest && !cmp && (
                                      <span style={{fontSize:"9px",color:C.dim,lineHeight:"1"}}>first session</span>
                                    )}
                                  </div>
                                </td>
                              );
                            }

                            // All other rows — standard value + % change
                            const pct = pctChanges[ci];
                            const pctGood = lowerIsBetter ? (pct !== null && pct < 0) : (pct !== null && pct > 0);
                            const pctColor = pct === null ? "transparent"
                              : Math.abs(pct) < 0.05 ? C.dim
                              : pctGood ? "#4ade80" : "#ff6b35";
                            const pctLabel = pct === null ? null
                              : `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
                            return (
                              <td key={ci} style={{...TD,verticalAlign:"middle",color:ci===0?cellCol(row.k,v):C.text2,fontWeight:ci===0?"bold":"normal",fontSize:ci===0?"15px":"14px"}}>
                                <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"1px"}}>
                                  <span>
                                    {fmtV(row.k,v)}
                                    {ci===0&&cols[0].live&&v!==null&&v!==undefined&&<span style={{fontSize:"8px",color:"#00ff9d",marginLeft:"4px"}}>●</span>}
                                  </span>
                                  {pctLabel && typeof v === "number" && (
                                    <span style={{fontSize:"10px",color:pctColor,fontWeight:"600",letterSpacing:"0.5px",lineHeight:"1"}}>
                                      {pctLabel}
                                    </span>
                                  )}
                                </div>
                              </td>
                            );
                          })}
                          <td style={{...TD,textAlign:"center",color:trend==="—"?C.dim:trendGood?"#4ade80":"#ff6b35",fontSize:"15px",fontWeight:"bold"}}>{trend}</td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Progress bars */}
          <div style={{padding:"16px",borderTop:`1px solid ${C.bord}`,display:"flex",gap:"16px",flexWrap:"wrap",background:"#07070e"}}>
            {[
              {l:"BODY FAT %",v:today.bodyFat,max:30,target:12,col:"#ff6b35"},
              {l:"PROTEIN",v:today.protein,max:250,target:200,col:"#34d399"},
              {l:"STEPS",v:today.steps,max:15000,target:10000,col:"#f43f5e"},
              {l:"SLEEP SCORE",v:today.sleepScore,max:100,target:85,col:"#a78bfa"},
              {l:"READINESS",v:today.readiness,max:100,target:80,col:"#00e5ff"},
              {l:"CALORIES",v:today.calories,max:3000,target:2100,col:"#fbbf24"},
            ].map(bar=>(
              <div key={bar.l} style={{flex:"1",minWidth:"130px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
                  <span style={{fontSize:"10px",color:C.text2,letterSpacing:"1px",fontWeight:"600"}}>{bar.l}</span>
                  <span style={{fontSize:"11px",color:bar.col,fontWeight:"bold"}}>{typeof bar.v==="number"?bar.v.toLocaleString():bar.v}</span>
                </div>
                <div style={{height:"5px",background:C.surf2,borderRadius:"3px",position:"relative"}}>
                  <div style={{height:"100%",width:`${Math.min((bar.v/bar.max)*100,100)}%`,background:bar.col,borderRadius:"3px"}}/>
                  <div style={{position:"absolute",top:"-3px",left:`${(bar.target/bar.max)*100}%`,width:"2px",height:"11px",background:"rgba(255,255,255,0.4)",borderRadius:"1px"}}/>
                </div>
                <div style={{fontSize:"9px",color:C.text3,marginTop:"3px"}}>TARGET: {bar.target.toLocaleString()}</div>
              </div>
            ))}
          </div>

          {/* ── HUME SEGMENTAL BODY MAP */}
          <HumeBodyMap data={today} onUpdate={(fields) => setManual(p=>({...p,...fields}))} />

        </>
      )}

      {/* ══════════ HABITS TAB ══════════ */}
      {tab==="habits" && (()=>{
        const allHabits = [...DEFAULT_HABITS, ...customHabits];
        const now = new Date();
        const todayKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;

        const toggle = (dateKey, habitId) => {
          setHabitData(p => {
            const day = p[dateKey] || {};
            return {...p, [dateKey]: {...day, [habitId]: !day[habitId]}};
          });
        };

        const todayData = habitData[todayKey] || {};
        const todayScore = allHabits.filter(h => todayData[h.id]).length;
        const todayPct = Math.round((todayScore / allHabits.length) * 100);

        // Build last N days for history
        const histDays = [];
        for (let i = 0; i < habitHistoryDays; i++) {
          const d = new Date(now); d.setDate(d.getDate() - i);
          const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          const label = i===0?"Today":i===1?"Yesterday":d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
          histDays.push({key:k, label, d});
        }

        // Streak per habit
        const streak = (habitId) => {
          let s = 0;
          for (let i = 0; i < 365; i++) {
            const d = new Date(now); d.setDate(d.getDate() - i);
            const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
            if (habitData[k]?.[habitId]) s++;
            else break;
          }
          return s;
        };

        // Overall compliance % per habit over habitHistoryDays
        const compliance = (habitId) => {
          const tracked = histDays.filter(d => habitData[d.key] !== undefined);
          if (!tracked.length) return null;
          const done = tracked.filter(d => habitData[d.key]?.[habitId]).length;
          return Math.round((done / tracked.length) * 100);
        };

        const scoreColor = todayPct >= 80 ? "#4ade80" : todayPct >= 50 ? "#fbbf24" : "#f87171";

        return (
          <div style={{minHeight:"100vh",background:C.bg,padding:"20px"}}>

            {/* Header */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"20px",flexWrap:"wrap",gap:"12px"}}>
              <div>
                <div style={{fontSize:"20px",fontWeight:"bold",color:C.text1,letterSpacing:"1px"}}>✅ Daily Habits</div>
                <div style={{fontSize:"11px",color:C.dim,marginTop:"2px"}}>{now.toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric",year:"numeric"})}</div>
              </div>
              {/* Today's score ring */}
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{textAlign:"center",background:C.surf,border:`2px solid ${scoreColor}`,borderRadius:"50%",width:"72px",height:"72px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <div style={{fontSize:"20px",fontWeight:"bold",color:scoreColor}}>{todayScore}</div>
                  <div style={{fontSize:"9px",color:C.dim}}>/ {allHabits.length}</div>
                </div>
                <div>
                  <div style={{fontSize:"24px",fontWeight:"bold",color:scoreColor}}>{todayPct}%</div>
                  <div style={{fontSize:"10px",color:C.dim}}>today's score</div>
                </div>
              </div>
            </div>

            <div style={{display:"flex",gap:"20px",alignItems:"flex-start",flexWrap:"wrap"}}>

              {/* ── Left: Today's checklist ── */}
              <div style={{flex:"0 0 340px",minWidth:"280px"}}>
                <div style={{fontSize:"11px",color:C.text3,letterSpacing:"2px",fontWeight:"600",marginBottom:"10px"}}>TODAY'S CHECKLIST</div>
                <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                  {allHabits.map(h => {
                    const done = !!todayData[h.id];
                    const s = streak(h.id);
                    return (
                      <button key={h.id} onClick={()=>toggle(todayKey, h.id)}
                        style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",
                          background:done?"#4ade8012":C.surf,
                          border:`1px solid ${done?"#4ade8050":C.bord}`,
                          borderRadius:"10px",cursor:"pointer",textAlign:"left",transition:"all 0.15s"}}>
                        {/* Checkbox */}
                        <div style={{width:"22px",height:"22px",borderRadius:"6px",flexShrink:0,
                          background:done?"#4ade80":"transparent",
                          border:`2px solid ${done?"#4ade80":C.bord2}`,
                          display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                          {done && <span style={{color:"#000",fontSize:"13px",fontWeight:"bold"}}>✓</span>}
                        </div>
                        {/* Icon + Label */}
                        <span style={{fontSize:"16px"}}>{h.icon}</span>
                        <div style={{flex:1}}>
                          <div style={{fontSize:"13px",fontWeight:"600",color:done?C.text1:C.text2,
                            textDecoration:done&&h.avoid?"none":"none"}}>{h.label}</div>
                          <div style={{fontSize:"10px",color:C.dim,marginTop:"1px"}}>
                            {h.avoid ? "avoid" : "do daily"}
                          </div>
                        </div>
                        {/* Streak */}
                        {s > 0 && (
                          <div style={{fontSize:"10px",color:"#fbbf24",fontWeight:"bold",textAlign:"right",flexShrink:0}}>
                            🔥 {s}d
                          </div>
                        )}
                      </button>
                    );
                  })}

                  {/* Add custom habit */}
                  <div style={{display:"flex",gap:"8px",marginTop:"6px"}}>
                    <input value={newHabitDraft} onChange={e=>setNewHabitDraft(e.target.value)}
                      onKeyDown={e=>{
                        if(e.key==="Enter"&&newHabitDraft.trim()){
                          setCustomHabits(p=>[...p,{id:`custom_${Date.now()}`,label:newHabitDraft.trim(),icon:"📌",avoid:false}]);
                          setNewHabitDraft("");
                        }
                      }}
                      placeholder="+ Add custom habit…"
                      style={{...inp,flex:1,fontSize:"12px",padding:"8px 12px"}}/>
                    <button onClick={()=>{
                      if(!newHabitDraft.trim()) return;
                      setCustomHabits(p=>[...p,{id:`custom_${Date.now()}`,label:newHabitDraft.trim(),icon:"📌",avoid:false}]);
                      setNewHabitDraft("");
                    }} style={{...bFill("#00ff9d"),padding:"8px 14px",fontSize:"11px"}}>ADD</button>
                  </div>
                </div>
              </div>

              {/* ── Right: Stats per habit ── */}
              <div style={{flex:1,minWidth:"260px"}}>
                <div style={{fontSize:"11px",color:C.text3,letterSpacing:"2px",fontWeight:"600",marginBottom:"10px"}}>HABIT STATS · LAST {habitHistoryDays} DAYS</div>
                <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
                  {allHabits.map(h => {
                    const s = streak(h.id);
                    const c = compliance(h.id);
                    const barColor = c == null ? C.bord2 : c>=80?"#4ade80":c>=50?"#fbbf24":"#f87171";
                    return (
                      <div key={h.id} style={{background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"8px",padding:"10px 14px"}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"6px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                            <span style={{fontSize:"14px"}}>{h.icon}</span>
                            <span style={{fontSize:"12px",fontWeight:"600",color:C.text1}}>{h.label}</span>
                          </div>
                          <div style={{display:"flex",gap:"12px",alignItems:"center"}}>
                            {s>0&&<span style={{fontSize:"11px",color:"#fbbf24"}}>🔥 {s} day streak</span>}
                            <span style={{fontSize:"12px",fontWeight:"bold",color:barColor}}>{c!=null?`${c}%`:"—"}</span>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div style={{height:"4px",background:C.bord,borderRadius:"2px",overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${c||0}%`,background:barColor,borderRadius:"2px",transition:"width 0.4s"}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ── History grid ── */}
            <div style={{marginTop:"28px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px",flexWrap:"wrap",gap:"8px"}}>
                <div style={{fontSize:"11px",color:C.text3,letterSpacing:"2px",fontWeight:"600"}}>HISTORY</div>
                <div style={{display:"flex",gap:"6px"}}>
                  {[7,14,30,60].map(d=>(
                    <button key={d} onClick={()=>setHabitHistoryDays(d)}
                      style={{padding:"4px 10px",fontSize:"10px",cursor:"pointer",borderRadius:"4px",
                        background:habitHistoryDays===d?"#00ff9d":"transparent",
                        border:`1px solid ${habitHistoryDays===d?"#00ff9d":C.bord2}`,
                        color:habitHistoryDays===d?"#000":C.text2}}>
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              <div style={{overflowX:"auto"}}>
                <table style={{borderCollapse:"collapse",minWidth:"100%",fontSize:"11px"}}>
                  <thead>
                    <tr>
                      <th style={{padding:"6px 10px",color:C.text3,textAlign:"left",fontWeight:"600",whiteSpace:"nowrap",borderBottom:`1px solid ${C.bord}`,minWidth:"150px"}}>HABIT</th>
                      {histDays.map(d=>(
                        <th key={d.key} style={{padding:"4px 6px",color:d.key===todayKey?"#00ff9d":C.dim,textAlign:"center",fontWeight:d.key===todayKey?"bold":"normal",borderBottom:`1px solid ${C.bord}`,minWidth:"48px",whiteSpace:"nowrap"}}>
                          {d.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allHabits.map(h=>(
                      <tr key={h.id} style={{borderBottom:`1px solid ${C.bord}20`}}>
                        <td style={{padding:"7px 10px",color:C.text2,whiteSpace:"nowrap"}}>
                          <span style={{marginRight:"6px"}}>{h.icon}</span>{h.label}
                        </td>
                        {histDays.map(d=>{
                          const val = habitData[d.key]?.[h.id];
                          const logged = habitData[d.key] !== undefined;
                          return (
                            <td key={d.key} style={{padding:"4px 6px",textAlign:"center"}}>
                              <button onClick={()=>toggle(d.key, h.id)}
                                title={val?"✓ Done — click to uncheck":"Not done — click to check"}
                                style={{width:"28px",height:"28px",borderRadius:"6px",border:"none",cursor:"pointer",
                                  background:val?"#4ade8030":logged?"#f8717120":"transparent",
                                  fontSize:"13px",display:"inline-flex",alignItems:"center",justifyContent:"center",
                                  transition:"background 0.1s"}}>
                                {val ? "✅" : logged ? "❌" : <span style={{color:C.bord2}}>·</span>}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    {/* Score row */}
                    <tr style={{borderTop:`1px solid ${C.bord}`}}>
                      <td style={{padding:"7px 10px",color:C.text3,fontWeight:"600",fontSize:"10px",letterSpacing:"1px"}}>SCORE</td>
                      {histDays.map(d=>{
                        const day = habitData[d.key];
                        if(!day) return <td key={d.key} style={{padding:"4px 6px",textAlign:"center",color:C.bord2}}>·</td>;
                        const sc = allHabits.filter(h=>day[h.id]).length;
                        const pct = Math.round(sc/allHabits.length*100);
                        const col = pct>=80?"#4ade80":pct>=50?"#fbbf24":"#f87171";
                        return (
                          <td key={d.key} style={{padding:"4px 6px",textAlign:"center"}}>
                            <div style={{fontSize:"10px",fontWeight:"bold",color:col}}>{pct}%</div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

      {/* ══════════ AI COACH TAB ══════════ */}
      {tab==="ask" && <AskAI apiURL={apiURL} apiSecret={apiSecret} onSections={loadSections}/>}
      {tab==="metrics" && <MetricsExplorer allData={liveHistory.length>0?liveHistory:liveData?[liveData]:(apiSecret?[]:DEMO)} sections={kpiSections}/>}
      <ConsentGate apiURL={apiURL} apiSecret={apiSecret}/>
      {tab==="profile" && <><ProfilePanel apiURL={apiURL} apiSecret={apiSecret} onSaved={loadProfile}/>{isOwner&&<BetaAccessCard apiURL={apiURL} apiSecret={apiSecret}/>}<AccountCard apiURL={apiURL} apiSecret={apiSecret}/></>}
      {tab==="feedback" && <FeedbackPanel apiURL={apiURL} apiSecret={apiSecret}/>}
      {tab==="measurements" && <MeasurementsPanel apiURL={apiURL} apiSecret={apiSecret} onSaved={()=>fetchFromAPI(apiURL,apiSecret)}/>}
      {tab==="benchmarks" && <Benchmarks days={benchDays} sections={kpiSections} profile={benchProfile} optIn={benchOptIn} onProfile={saveBench}/>}
      {tab==="automations" && <Automations apiURL={apiURL} apiSecret={apiSecret} sections={kpiSections} onSections={loadSections} onData={()=>fetchFromAPI(apiURL,apiSecret)}/>}

      {tab==="coach" && (() => {
        const activeCoachObj = COACHES.find(c=>c.id===activeCoach) || COACHES[0];
        const activeLLM = coachLLMs[activeCoachObj.id] || "claude";
        const now = new Date();
        const todayDateKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
        const dailyKey = `daily_${activeCoachObj.id}_${activeLLM}_${todayDateKey}`;
        const currentPrompt = coachPrompts[activeCoachObj.id] || activeCoachObj.defaultDailyPrompt;
        const [showPresets,setShowPresets] = [loading["_showPresets_"+activeCoachObj.id], v=>setLoading(p=>({...p,["_showPresets_"+activeCoachObj.id]:v}))];
        return (
        <div style={{padding:"16px",maxWidth:"1000px",margin:"0 auto"}}>
          {/* ── #1 API Key onboarding ── */}
          {!claudeKey ? (
            <div style={{...panel,marginBottom:"16px",borderColor:"#f59e0b60",background:"#f59e0b08"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}>
                <span style={{fontSize:"22px"}}>🔑</span>
                <div>
                  <div style={{fontSize:"14px",fontWeight:"bold",color:C.text1}}>Connect Claude to unlock AI coaching</div>
                  <div style={{fontSize:"11px",color:C.text3,marginTop:"2px"}}>Your Anthropic API key is stored locally — never sent anywhere except Anthropic's servers.</div>
                </div>
              </div>
              <div style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:"10px"}}>
                <input type="password" placeholder="sk-ant-api03-..." value={claudeKey}
                  onChange={e=>{setClaudeKey(e.target.value);localStorage.setItem("bt_claude_key",e.target.value);}}
                  style={{...inp,flex:1,borderColor:"#f59e0b60"}} />
                <button onClick={()=>window.open("https://console.anthropic.com/settings/keys","_blank")}
                  style={{...bFill("#f59e0b"),padding:"8px 14px",fontSize:"11px",whiteSpace:"nowrap"}}>
                  Get Key →
                </button>
              </div>
              <div style={{display:"flex",gap:"16px",flexWrap:"wrap"}}>
                {["1. Go to console.anthropic.com/settings/keys","2. Click Create Key","3. Paste it above"].map((s,i)=>(
                  <div key={i} style={{fontSize:"10px",color:C.text3,display:"flex",alignItems:"center",gap:"4px"}}>
                    <span style={{color:"#f59e0b"}}>›</span> {s}
                  </div>
                ))}
              </div>
            </div>
          ) : changingKey ? (
            <div style={{marginBottom:"12px",padding:"10px 14px",background:"#f59e0b08",border:"1px solid #f59e0b40",borderRadius:"8px",display:"flex",gap:"8px",alignItems:"center",flexWrap:"wrap"}}>
              <input type="password" autoFocus placeholder="Paste new API key…" value={newKeyDraft}
                onChange={e=>setNewKeyDraft(e.target.value)}
                onKeyDown={e=>{
                  if(e.key==="Enter"&&newKeyDraft.trim()){setClaudeKey(newKeyDraft.trim());localStorage.setItem("bt_claude_key",newKeyDraft.trim());setChangingKey(false);setNewKeyDraft("");}
                  if(e.key==="Escape"){setChangingKey(false);setNewKeyDraft("");}
                }}
                style={{...inp,flex:1,minWidth:200,borderColor:"#f59e0b60"}}/>
              <button onClick={()=>{if(newKeyDraft.trim()){setClaudeKey(newKeyDraft.trim());localStorage.setItem("bt_claude_key",newKeyDraft.trim());setChangingKey(false);setNewKeyDraft("");}}}
                style={{...bFill("#f59e0b"),padding:"6px 14px",fontSize:"11px"}}>SAVE</button>
              <button onClick={()=>{setChangingKey(false);setNewKeyDraft("");}}
                style={{...bOut(C.dim),padding:"6px 10px",fontSize:"11px"}}>CANCEL</button>
            </div>
          ) : (
            <div style={{marginBottom:"12px",display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 14px",background:"#4ade8010",border:"1px solid #4ade8030",borderRadius:"8px",flexWrap:"wrap",gap:"8px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <span style={{color:"#4ade80",fontSize:"16px"}}>✓</span>
                <div>
                  <div style={{fontSize:"12px",color:"#4ade80",fontWeight:"600"}}>Claude API connected</div>
                  <div style={{fontSize:"10px",color:C.dim}}>{COACHES.length} coaches ready · Memory active · Auto-brief {autoBrief?"on":"off"}</div>
                </div>
              </div>
              <button onClick={()=>{setChangingKey(true);setNewKeyDraft("");}} style={{...bOut(C.dim),padding:"4px 10px",fontSize:"9px"}}>CHANGE KEY</button>
            </div>
          )}

          {/* Notifications only — coach selected via bubbles in chat */}
          {notifPermission !== "granted" && (
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"12px"}}>
              <button onClick={requestNotifPermission}
                style={{...bOut("#60a5fa"),padding:"7px 12px",fontSize:"10px"}}>
                🔔 Enable Notifs
              </button>
            </div>
          )}
          {notifPermission === "granted" && (
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"12px"}}>
              <span style={{fontSize:"10px",color:"#4ade80"}}>🔔 ON</span>
            </div>
          )}

          {/* ── #4 Auto-Brief + #2 iOS status bar ────────────────────────────── */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px",padding:"10px 14px",background:C.surf2,border:`1px solid ${C.bord}`,borderRadius:"8px",flexWrap:"wrap",gap:"10px"}}>
            <div style={{display:"flex",alignItems:"center",gap:"16px",flexWrap:"wrap"}}>
              {/* Auto-brief toggle */}
              <label style={{display:"flex",alignItems:"center",gap:"8px",cursor:"pointer"}}>
                <div onClick={()=>setAutoBrief(v=>!v)} style={{width:"36px",height:"20px",borderRadius:"10px",background:autoBrief?"#00ff9d":"#333",position:"relative",transition:"background 0.2s",cursor:"pointer",flexShrink:0}}>
                  <div style={{position:"absolute",top:"3px",left:autoBrief?"19px":"3px",width:"14px",height:"14px",borderRadius:"50%",background:"#000",transition:"left 0.2s"}}/>
                </div>
                <span style={{fontSize:"11px",color:C.text2}}>⚡ Auto-brief on tab open</span>
              </label>
              {/* iOS sync status */}
              <div style={{fontSize:"11px",color:C.dim,display:"flex",alignItems:"center",gap:"6px"}}>
                <span style={{width:"7px",height:"7px",borderRadius:"50%",background:liveData?"#4ade80":"#666",display:"inline-block"}}/>
                {liveData ? <span style={{color:"#4ade80"}}>iOS syncing</span> : <span>iOS app not syncing — <a href="https://github.com/goforgoldipo/BodyDataHealth" target="_blank" rel="noreferrer" style={{color:"#60a5fa"}}>set up →</a></span>}
              </div>
            </div>
            {autoBrief && claudeKey && <span style={{fontSize:"10px",color:C.dim}}>Today's brief auto-generates when you open this tab</span>}
          </div>

          {/* ── Active Coach Panel — chat-first design ── */}
          {(()=>{
            const threadKey=`thread_${activeCoachObj.id}_${activeLLM}`;
            const thread=chatThreads[threadKey]||[];
            const isWaiting=chatLoading[threadKey];
            const showPromptEditor=loading["_showPrompt_"+activeCoachObj.id];
            return (
            <>
            {chatFullscreen && <div onClick={()=>setChatFullscreen(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:499}}/>}
            <div style={{
              ...(chatFullscreen
                ? {position:"fixed",top:"16px",left:"16px",right:"16px",bottom:"16px",zIndex:500,
                   background:C.surf,border:`1px solid ${activeCoachObj.col}40`,borderRadius:"10px",
                   padding:"16px",display:"flex",flexDirection:"column",gap:0,overflow:"hidden"}
                : {...panel,borderColor:activeCoachObj.col+"40",display:"flex",flexDirection:"column",gap:0})
            }}>

              {/* Header: data status */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"10px",paddingBottom:"8px",borderBottom:`1px solid ${activeCoachObj.col}25`,flexShrink:0}}>
                <div style={{fontSize:"10px",color:liveData?"#4ade80":C.dim,display:"flex",alignItems:"center",gap:"8px"}}>
                  <span>{liveData?"✓ Live data loaded":"Demo data"} · {todayDateKey}</span>
                  <span style={{color:C.bord2}}>|</span>
                  <span style={{color:C.text3}}>30-day context active</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                  <div style={{fontSize:"10px",color:C.dim,fontFamily:"'Courier New',monospace"}}>
                    {thread.length > 0 ? `${thread.filter(m=>m.role==="assistant").length} response${thread.filter(m=>m.role==="assistant").length!==1?"s":""}` : ""}
                  </div>
                  <button onClick={()=>setChatFullscreen(v=>!v)}
                    title={chatFullscreen?"Exit fullscreen":"Expand chat"}
                    style={{background:"none",border:`1px solid ${C.bord2}`,borderRadius:"6px",
                      color:chatFullscreen?activeCoachObj.col:C.text3,cursor:"pointer",
                      padding:"4px 8px",fontSize:"14px",lineHeight:1,
                      transition:"color 0.15s,border-color 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=activeCoachObj.col;e.currentTarget.style.color=activeCoachObj.col;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=C.bord2;e.currentTarget.style.color=chatFullscreen?activeCoachObj.col:C.text3;}}>
                    {chatFullscreen ? "⊡" : "⛶"}
                  </button>
                </div>
              </div>

              {/* ── #3 Coach Memory panel ── */}
              {(()=>{
                const mem = coachMemory[activeCoachObj.id];
                const isOpen = showMemory[activeCoachObj.id];
                const isUpdating = memoryUpdating[activeCoachObj.id];
                return (
                  <div style={{marginBottom:"10px",border:`1px solid ${activeCoachObj.col}30`,borderRadius:"8px",overflow:"hidden"}}>
                    <button onClick={()=>setShowMemory(p=>({...p,[activeCoachObj.id]:!p[activeCoachObj.id]}))}
                      style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 12px",background:activeCoachObj.col+"12",border:"none",cursor:"pointer",color:C.text2}}>
                      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                        <span style={{fontSize:"12px"}}>🧠</span>
                        <span style={{fontSize:"11px",fontWeight:"600",letterSpacing:"1px"}}>COACH MEMORY</span>
                        {mem && <span style={{fontSize:"9px",background:activeCoachObj.col+"30",color:activeCoachObj.col,padding:"2px 6px",borderRadius:"4px"}}>ACTIVE</span>}
                        {isUpdating && <span style={{fontSize:"9px",color:C.dim,animation:"pulse 1s infinite"}}>updating…</span>}
                      </div>
                      <span style={{fontSize:"10px",color:C.dim}}>{isOpen?"▲":"▼"}</span>
                    </button>
                    {isOpen && (
                      <div style={{padding:"10px 12px",background:C.surf2}}>
                        <p style={{fontSize:"10px",color:C.dim,marginBottom:"8px"}}>This memory is automatically updated after every coaching session and injected into every prompt — your coach remembers you across sessions.</p>
                        <textarea
                          value={mem||""}
                          onChange={e=>setCoachMemory(p=>({...p,[activeCoachObj.id]:e.target.value}))}
                          placeholder="No memory yet — run your first coaching session and memory will be captured automatically…"
                          rows={8}
                          style={{width:"100%",background:C.surf,border:`1px solid ${C.bord2}`,borderRadius:"6px",color:C.text1,fontSize:"11px",padding:"10px",resize:"vertical",lineHeight:"1.6",boxSizing:"border-box"}}
                        />
                        <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
                          <button onClick={()=>setCoachMemory(p=>({...p,[activeCoachObj.id]:""}))}
                            style={{...bOut(C.dim),padding:"4px 10px",fontSize:"9px"}}>CLEAR MEMORY</button>
                          <span style={{fontSize:"10px",color:C.dim,alignSelf:"center"}}>Memory updates automatically after each daily brief</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Chat thread — primary UI */}
              <div ref={chatScrollRef} style={{
                display:"flex",flexDirection:"column",gap:"10px",
                minHeight:"280px",
                maxHeight:chatFullscreen?"calc(100vh - 280px)":"560px",
                flex:chatFullscreen?"1":"unset",
                overflowY:"auto",
                marginBottom:"12px",paddingRight:"2px",
              }}>
                {thread.length===0 && !isWaiting ? (
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,padding:"32px 16px",minHeight:"220px"}}>
                    {/* Greeting */}
                    <div style={{fontSize:"13px",color:C.text3,marginBottom:"24px",textAlign:"center"}}>
                      {liveData ? <span style={{color:"#4ade80"}}>✓ Live data loaded · {todayDateKey}</span> : "Demo data active"}
                      <span style={{color:C.dim}}> · 30-day context ready</span>
                    </div>
                    {/* Coach selection bubbles */}
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:"10px",width:"100%",maxWidth:"700px"}}>
                      {COACHES.map(coach=>{
                        const hasDaily=analyses[`daily_${coach.id}_${coachLLMs[coach.id]||"claude"}_${todayDateKey}`];
                        const isActive=activeCoach===coach.id;
                        return (
                          <button key={coach.id}
                            onClick={()=>{ setActiveCoach(coach.id); }}
                            style={{
                              background:isActive?coach.col+"20":C.surf,
                              border:`1px solid ${isActive?coach.col:C.bord2}`,
                              borderRadius:"10px",padding:"14px 16px",
                              cursor:"pointer",textAlign:"left",
                              transition:"border-color 0.15s",
                            }}>
                            <div style={{fontSize:"20px",marginBottom:"6px"}}>{coach.icon}</div>
                            <div style={{fontSize:"12px",color:isActive?coach.col:C.text1,fontWeight:"bold",letterSpacing:"0.5px",marginBottom:"4px"}}>
                              {coach.name}
                              {hasDaily && <span style={{color:"#4ade80",fontSize:"10px",marginLeft:"6px"}}>✓</span>}
                            </div>
                            <div style={{fontSize:"10px",color:C.text3,lineHeight:"1.5"}}>
                              {coach.id==="workout" && "Training plan, volume, muscle groups"}
                              {coach.id==="food" && "Macros, nutrition, daily meal plan"}
                              {coach.id==="sleep" && "Sleep quality, HRV, recovery protocol"}
                              {coach.id==="progress" && "Body recomposition wins & focus"}
                              {coach.id==="celebrate" && "Milestones, PRs & momentum"}
                              {!["food","sleep","progress","celebrate"].includes(coach.id) && "Ask me anything"}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div style={{marginTop:"20px",fontSize:"11px",color:C.dim,textAlign:"center"}}>
                      Select a coach above, then ask anything or tap <span style={{color:activeCoachObj.col}}>▶ Daily Brief</span>
                    </div>
                  </div>
                ) : (
                  thread.map((msg,i)=>{
                    const isUser=msg.role==="user";
                    const isDaily=msg.type==="daily";
                    const isDailyPrompt=msg.type==="daily_prompt";
                    if(isDailyPrompt) return (
                      <div key={i} style={{display:"flex",justifyContent:"flex-end"}}>
                        <div style={{fontSize:"9px",color:activeCoachObj.col,background:activeCoachObj.col+"18",border:`1px solid ${activeCoachObj.col}40`,borderRadius:"8px",padding:"3px 10px",letterSpacing:"1px",fontWeight:"bold"}}>
                          📅 DAILY BRIEF REQUEST · {msg.date||todayDateKey}
                        </div>
                      </div>
                    );
                    return (
                      <div key={i} style={{display:"flex",flexDirection:"column",alignItems:isUser?"flex-end":"flex-start"}}>
                        {isDaily && (
                          <div style={{fontSize:"9px",color:activeCoachObj.col,fontWeight:"bold",letterSpacing:"2px",marginBottom:"5px",alignSelf:"flex-start"}}>
                            <span style={{background:activeCoachObj.col+"25",border:`1px solid ${activeCoachObj.col}50`,borderRadius:"8px",padding:"2px 8px"}}>
                              📅 DAILY BRIEF · {msg.date||todayDateKey}
                            </span>
                          </div>
                        )}
                        <div style={{
                          maxWidth:"90%",
                          background:isUser?"#0e0e1e":isDaily?activeCoachObj.col+"18":activeCoachObj.col+"12",
                          border:`1px solid ${isUser?"#ffffff15":activeCoachObj.col+(isDaily?"50":"35")}`,
                          borderLeft:isUser?undefined:`3px solid ${activeCoachObj.col}`,
                          borderRadius:"4px",padding:"10px 14px",
                          fontSize:"13px",lineHeight:"1.8",
                          color:isUser?C.text2:C.text1,
                          whiteSpace:isUser?"pre-wrap":undefined,
                        }}>
                          {!isUser && (
                            <div style={{fontSize:"9px",color:activeCoachObj.col,fontWeight:"bold",letterSpacing:"1.5px",marginBottom:"6px"}}>
                              {activeCoachObj.icon} {activeCoachObj.name}
                            </div>
                          )}
                          {isUser ? msg.content : renderMarkdown(msg.content)}
                        </div>
                        <div style={{fontSize:"9px",color:C.dim,marginTop:"3px",paddingLeft:"3px",paddingRight:"3px"}}>
                          {isUser?"You":"Coach"} · {msg.ts?new Date(msg.ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}):""}
                        </div>
                      </div>
                    );
                  })
                )}
                {!isWaiting && thread.length>0 && thread[thread.length-1].role==="assistant" && (
                  <div style={{display:"flex",flexWrap:"wrap",gap:"6px",paddingLeft:"4px",marginTop:"-4px"}}>
                    {activeCoachObj.questions.slice(0,3).map(q=>(
                      <button key={q.id}
                        onClick={()=>sendChat(activeCoachObj.id,activeLLM,q.prompt)}
                        style={{
                          background:"transparent",border:`1px solid ${activeCoachObj.col}35`,
                          color:activeCoachObj.col,borderRadius:"20px",
                          padding:"5px 12px",fontSize:"10px",cursor:"pointer",
                          letterSpacing:"0.3px",transition:"background 0.15s",
                          fontFamily:"'Courier New',monospace",
                        }}>
                        {q.label}
                      </button>
                    ))}
                  </div>
                )}
                {isWaiting && (
                  <div style={{display:"flex",alignItems:"flex-start"}}>
                    <div style={{maxWidth:"90%",background:activeCoachObj.col+"12",border:`1px solid ${activeCoachObj.col}40`,borderLeft:`3px solid ${activeCoachObj.col}`,borderRadius:"4px",padding:"10px 14px"}}>
                      <div style={{fontSize:"9px",color:activeCoachObj.col,fontWeight:"bold",letterSpacing:"1.5px",marginBottom:"6px"}}>{activeCoachObj.icon} {activeCoachObj.name}</div>
                      {streamText[threadKey] ? (
                        <div style={{fontSize:"13px",lineHeight:"1.8",color:C.text1}}>
                          {renderMarkdown(streamText[threadKey])}
                          <span style={{display:"inline-block",width:"8px",height:"14px",background:activeCoachObj.col,marginLeft:"2px",verticalAlign:"text-bottom",animation:"pulse 0.8s ease-in-out infinite",opacity:0.9,borderRadius:"1px"}}/>
                        </div>
                      ) : (
                        <div style={{display:"flex",gap:"4px",alignItems:"center"}}>
                          {[0,1,2].map(j=>(
                            <div key={j} style={{width:"6px",height:"6px",borderRadius:"50%",background:activeCoachObj.col,
                              animation:`pulse 1.2s ease-in-out ${j*0.2}s infinite`,opacity:0.7}}/>
                          ))}
                          <span style={{fontSize:"11px",color:C.text3,marginLeft:"6px"}}>thinking...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick action chips: Daily Brief + preset questions */}
              <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"10px",paddingBottom:"10px",borderBottom:`1px solid ${C.bord}`}}>
                <button onClick={()=>analyze(activeLLM,activeCoachObj.id,"daily")} disabled={loading[dailyKey]}
                  style={{padding:"7px 14px",background:analyses[dailyKey]?"#4ade8015":"transparent",
                    border:`1px solid ${analyses[dailyKey]?"#4ade8055":activeCoachObj.col}`,
                    color:analyses[dailyKey]?"#4ade80":activeCoachObj.col,
                    cursor:loading[dailyKey]?"wait":"pointer",fontSize:"11px",borderRadius:"4px",
                    fontWeight:"bold",opacity:loading[dailyKey]?0.5:1,fontFamily:"'Courier New',monospace"}}>
                  {loading[dailyKey]?"⟳ analyzing...":analyses[dailyKey]?"✓ Daily Brief":"▶ Daily Brief"}
                </button>
                {activeCoachObj.questions.map(q=>{
                  const qKey=`${activeCoachObj.id}_${activeLLM}_${q.id}`;
                  return (
                    <button key={q.id} onClick={()=>analyze(activeLLM,activeCoachObj.id,q.id)} disabled={loading[qKey]}
                      style={{padding:"7px 12px",background:analyses[qKey]?"#4ade8015":"transparent",
                        border:`1px solid ${analyses[qKey]?"#4ade8055":C.bord2}`,
                        color:analyses[qKey]?"#4ade80":C.text2,
                        cursor:loading[qKey]?"wait":"pointer",fontSize:"10px",borderRadius:"4px",
                        opacity:loading[qKey]?0.5:1,fontFamily:"'Courier New',monospace"}}>
                      {loading[qKey]?"⟳ ...":`${q.label}${analyses[qKey]?" ✓":""}`}
                    </button>
                  );
                })}
              </div>

              {/* Chat input — always visible */}
              <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"8px"}}>
                <textarea
                  value={chatDraft[activeCoachObj.id]||""}
                  onChange={e=>setChatDraft(p=>({...p,[activeCoachObj.id]:e.target.value}))}
                  onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat(activeCoachObj.id,activeLLM);}}}
                  placeholder={`Ask ${activeCoachObj.name} anything… (Enter to send, Shift+Enter for new line)`}
                  disabled={isWaiting}
                  style={{...inp,width:"100%",boxSizing:"border-box",minHeight:"54px",maxHeight:"180px",resize:"vertical",
                    fontSize:"13px",lineHeight:"1.6",opacity:isWaiting?0.5:1}}
                />
                {/* Bottom row: model selector (left) + send button (right) */}
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"8px"}}>
                  {/* Model dropdown */}
                  <div style={{position:"relative"}}>
                    <select
                      value={activeLLM}
                      onChange={e=>setCoachLLMs(p=>({...p,[activeCoachObj.id]:e.target.value}))}
                      style={{
                        background:"#0e0e18",
                        border:`1px solid ${C.bord2}`,
                        borderRadius:"6px",
                        color:C.text2,
                        fontSize:"11px",
                        padding:"6px 28px 6px 10px",
                        cursor:"pointer",
                        appearance:"none",
                        outline:"none",
                        fontFamily:"'Courier New',monospace",
                      }}>
                      {LLMS.map(l=>(
                        <option key={l.id} value={l.id} style={{background:"#0e0e18"}}>
                          {l.icon} {l.name}
                        </option>
                      ))}
                    </select>
                    <span style={{position:"absolute",right:"8px",top:"50%",transform:"translateY(-50%)",color:C.text3,pointerEvents:"none",fontSize:"10px"}}>▾</span>
                  </div>
                  {/* Send button */}
                  <button onClick={()=>sendChat(activeCoachObj.id,activeLLM)}
                    disabled={isWaiting||!chatDraft[activeCoachObj.id]?.trim()}
                    style={{...bFill(activeCoachObj.col),padding:"8px 22px",fontSize:"12px",flexShrink:0,
                      opacity:(isWaiting||!chatDraft[activeCoachObj.id]?.trim())?0.4:1,
                      cursor:(isWaiting||!chatDraft[activeCoachObj.id]?.trim())?"default":"pointer",
                      letterSpacing:"1px"}}>
                    {isWaiting?"⟳":"▶ SEND"}
                  </button>
                </div>
              </div>

              {thread.length>0 && (
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"4px"}}>
                  <button onClick={()=>setChatThreads(p=>{const n={...p};delete n[threadKey];return n;})}
                    style={{background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontSize:"9px",letterSpacing:"1px",padding:"2px 0"}}>
                    ✕ clear conversation
                  </button>
                </div>
              )}

              {/* Collapsible: customize daily brief prompt */}
              <div style={{borderTop:`1px solid ${C.bord}`,paddingTop:"10px",marginTop:"4px"}}>
                <button onClick={()=>setLoading(p=>({...p,["_showPrompt_"+activeCoachObj.id]:!showPromptEditor}))}
                  style={{background:"transparent",border:"none",color:C.text3,cursor:"pointer",fontSize:"10px",letterSpacing:"2px",padding:"4px 0",fontFamily:"'Courier New',monospace",display:"flex",alignItems:"center",gap:"6px"}}>
                  <span>{showPromptEditor?"▾":"▸"}</span>
                  <span>CUSTOMIZE DAILY BRIEF PROMPT</span>
                </button>
                {showPromptEditor && (
                  <div style={{marginTop:"10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                      <span style={{fontSize:"10px",color:C.text3,letterSpacing:"1px"}}>📝 Edits auto-save to localStorage</span>
                      <button onClick={()=>setCoachPrompts(p=>{const n={...p};delete n[activeCoachObj.id];return n;})}
                        style={{...bOut(C.dim),padding:"3px 10px",fontSize:"9px"}}>↻ Reset to default</button>
                    </div>
                    <textarea
                      value={currentPrompt}
                      onChange={e=>setCoachPrompts(p=>({...p,[activeCoachObj.id]:e.target.value}))}
                      style={{...inp,width:"100%",minHeight:"120px",boxSizing:"border-box",fontSize:"12px",lineHeight:"1.6",resize:"vertical",fontFamily:"'Courier New',monospace"}}
                      placeholder="Write your custom daily coaching prompt here..."
                    />
                  </div>
                )}
              </div>

            </div>
            </>
            );
          })()}

          <div style={{...panel,marginTop:"16px"}}>
            {sectionLabel("LIVE DATA CONTEXT SENT TO AI:")}
            <pre style={{fontSize:"11px",color:C.text2,overflow:"auto",margin:0,lineHeight:"1.8"}}>{ctx()}</pre>
          </div>
        </div>
        );
      })()}

      {/* ══════════ LOG TAB ══════════ */}
      {tab==="log" && (() => {
        // Gather all persistent thread entries
        const allEntries = [];
        Object.keys(chatThreads).forEach(key => {
          if(!key.startsWith("thread_")) return;
          const parts = key.replace("thread_","").split("_");
          // key format: thread_${coachId}_${llmId}
          // coachId could be multi-part (e.g. "workout"), llmId is last part
          const llmId = parts[parts.length-1];
          const coachId = parts.slice(0,parts.length-1).join("_");
          const coachObj = COACHES.find(c=>c.id===coachId);
          const llmObj = LLMS.find(l=>l.id===llmId);
          const msgs = chatThreads[key]||[];
          msgs.forEach(m => {
            allEntries.push({...m, coachId, llmId, coachObj, llmObj, threadKey:key});
          });
        });

        // Sort newest first
        allEntries.sort((a,b)=>new Date(b.ts)-new Date(a.ts));

        const filtered = allEntries.filter(e=>{
          if(logCoachFilter!=="all" && e.coachId!==logCoachFilter) return false;
          if(logTypeFilter==="daily" && e.type!=="daily") return false;
          if(logTypeFilter==="qa" && e.type!=="qa") return false;
          return true;
        });

        // Group by date
        const groupedByDate = {};
        filtered.forEach(e => {
          const d = e.ts ? new Date(e.ts) : new Date();
          const dk = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
          if(!groupedByDate[dk]) groupedByDate[dk] = [];
          groupedByDate[dk].push(e);
        });
        const dateKeys = Object.keys(groupedByDate).sort((a,b)=>b.localeCompare(a));

        const fmtDate = (dk) => {
          const d = new Date(dk+"T12:00:00");
          return d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
        };

        const exportLog = () => {
          const lines = [];
          allEntries.sort((a,b)=>new Date(a.ts)-new Date(b.ts)).forEach(e => {
            const coachName = e.coachObj?.name || e.coachId;
            const llmName = e.llmObj?.name || e.llmId;
            const ts = e.ts ? new Date(e.ts).toLocaleString() : "";
            lines.push(`────────────────────────────────────────`);
            lines.push(`[${ts}] ${coachName} / ${llmName} / ${e.type||"qa"} / ${e.role}`);
            lines.push(e.content||"");
            lines.push("");
          });
          const blob = new Blob([lines.join("\n")],{type:"text/plain"});
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href=url; a.download="coaching-log.txt"; a.click();
          URL.revokeObjectURL(url);
        };

        return (
          <div style={{padding:"16px",maxWidth:"900px",margin:"0 auto"}}>
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"10px"}}>
              <div>
                <div style={{fontSize:"16px",fontWeight:"bold",letterSpacing:"3px",color:C.text1}}>📚 COACHING LOG</div>
                <div style={{fontSize:"11px",color:C.text3,marginTop:"3px"}}>PERSISTENT HISTORY · ALL COACHES</div>
              </div>
              <button onClick={exportLog} style={{...bOut(C.text3),fontSize:"10px",padding:"7px 14px"}}>⬇ EXPORT .TXT</button>
            </div>

            {/* Filter bar */}
            <div style={{...panel,marginBottom:"16px",padding:"12px 14px"}}>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center",marginBottom:"10px"}}>
                <span style={{fontSize:"10px",color:C.dim,letterSpacing:"1px",marginRight:"2px"}}>COACH:</span>
                <button onClick={()=>setLogCoachFilter("all")}
                  style={{...logCoachFilter==="all"?bFill("#00ff9d"):bOut(C.text3),padding:"4px 10px",fontSize:"10px"}}>
                  ALL COACHES
                </button>
                {COACHES.map(c=>(
                  <button key={c.id} onClick={()=>setLogCoachFilter(c.id)}
                    style={{...logCoachFilter===c.id?bFill(c.col):bOut(c.col),padding:"4px 10px",fontSize:"10px"}}>
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:"8px",flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:"10px",color:C.dim,letterSpacing:"1px",marginRight:"2px"}}>TYPE:</span>
                {[["all","ALL TYPES"],["daily","DAILY BRIEFS"],["qa","Q&A"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setLogTypeFilter(v)}
                    style={{...logTypeFilter===v?bFill("#a78bfa"):bOut(C.text3),padding:"4px 10px",fontSize:"10px"}}>
                    {l}
                  </button>
                ))}
                <span style={{fontSize:"10px",color:C.dim,marginLeft:"8px"}}>{filtered.length} entries</span>
              </div>
            </div>

            {/* Timeline */}
            {filtered.length===0 ? (
              <div style={{...panel,textAlign:"center",padding:"40px"}}>
                <div style={{fontSize:"36px",marginBottom:"12px",opacity:0.3}}>📚</div>
                <div style={{fontSize:"13px",color:C.text2}}>No coaching history yet — run your first coach in the AI COACH tab</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:"0px"}}>
                {dateKeys.map(dk=>{
                  const entries = groupedByDate[dk];
                  return (
                    <div key={dk}>
                      {/* Date divider */}
                      <div style={{display:"flex",alignItems:"center",gap:"10px",margin:"16px 0 10px"}}>
                        <div style={{flex:1,height:"1px",background:C.bord2}}/>
                        <div style={{fontSize:"10px",color:C.text3,letterSpacing:"2px",fontWeight:"bold",whiteSpace:"nowrap"}}>━━ {fmtDate(dk)} ━━</div>
                        <div style={{flex:1,height:"1px",background:C.bord2}}/>
                      </div>

                      {/* Entries for this date */}
                      <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
                        {entries.map((e,i)=>{
                          const eKey = `${e.threadKey}_${e.ts}_${i}`;
                          const isExpanded = expandedEntries[eKey];
                          const coachCol = e.coachObj?.col||C.text3;
                          const ts = e.ts ? new Date(e.ts).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}) : "";

                          if(e.type==="daily") {
                            const text = e.content||"";
                            const preview = text.length>300 ? text.slice(0,300)+"…" : text;
                            return (
                              <div key={eKey} style={{...panel,borderColor:coachCol+"40",padding:"14px"}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"10px",flexWrap:"wrap",gap:"6px"}}>
                                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                                    <span style={{fontSize:"18px"}}>{e.coachObj?.icon||"🤖"}</span>
                                    <div>
                                      <div style={{fontSize:"11px",color:coachCol,fontWeight:"bold",letterSpacing:"2px"}}>{e.coachObj?.name||e.coachId}</div>
                                      <div style={{fontSize:"9px",color:C.dim,marginTop:"1px"}}>DAILY BRIEF · {ts}</div>
                                    </div>
                                  </div>
                                  <div style={{display:"flex",alignItems:"center",gap:"6px"}}>
                                    {e.llmObj && (
                                      <span style={{fontSize:"9px",color:e.llmObj.col,border:`1px solid ${e.llmObj.col}60`,borderRadius:"3px",padding:"2px 7px",letterSpacing:"1px",fontWeight:"bold"}}>
                                        {e.llmObj.icon} {e.llmObj.name}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div style={{fontSize:"12px",lineHeight:"1.75",whiteSpace:"pre-wrap",color:C.text1}}>
                                  {isExpanded ? text : preview}
                                </div>
                                {text.length>300 && (
                                  <button onClick={()=>setExpandedEntries(p=>({...p,[eKey]:!p[eKey]}))}
                                    style={{background:"transparent",border:"none",color:coachCol,cursor:"pointer",fontSize:"10px",marginTop:"8px",padding:"0",letterSpacing:"1px"}}>
                                    {isExpanded?"▴ show less":"▾ show more"}
                                  </button>
                                )}
                              </div>
                            );
                          }

                          // Q&A entry
                          const isUser = e.role==="user";
                          return (
                            <div key={eKey} style={{display:"flex",flexDirection:"column",alignItems:isUser?"flex-end":"flex-start"}}>
                              <div style={{
                                maxWidth:"88%",
                                background: isUser?"#0e0e1e":coachCol+"12",
                                border:`1px solid ${isUser?"#ffffff18":coachCol+"40"}`,
                                borderLeft: isUser?undefined:`3px solid ${coachCol}`,
                                borderRadius:"4px",
                                padding:"10px 14px",
                                fontSize:"12px",
                                lineHeight:"1.75",
                                whiteSpace:"pre-wrap",
                                color: isUser?C.text2:C.text1,
                              }}>
                                {!isUser && e.coachObj && (
                                  <div style={{fontSize:"9px",color:coachCol,fontWeight:"bold",letterSpacing:"1.5px",marginBottom:"6px"}}>
                                    {e.coachObj.icon} {e.coachObj.name}
                                  </div>
                                )}
                                {e.content}
                              </div>
                              <div style={{fontSize:"9px",color:C.dim,marginTop:"3px",paddingLeft:"4px",paddingRight:"4px"}}>
                                {isUser?"You":"Coach"} · {ts}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ══════════ WORKOUT TAB ══════════ */}
      {tab==="workout" && (
        <div style={{padding:"16px",maxWidth:"900px",margin:"0 auto"}}>
          <div style={{...panel,marginBottom:"16px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"16px",flexWrap:"wrap",gap:"12px"}}>
              <div>
                <div style={{color:"#fbbf24",fontSize:"16px",letterSpacing:"3px",fontWeight:"bold"}}>TODAY'S WORKOUT</div>
                <div style={{fontSize:"11px",color:C.text3,marginTop:"4px"}}>AI-PERSONALIZED · ADAPTED TO YOUR RECOVERY STATUS</div>
              </div>
              <button onClick={getWorkout} disabled={loading.workout} style={bFill("#fbbf24")}>
                {loading.workout?"⟳ GENERATING...":"⚡ GET TODAY'S WORKOUT"}
              </button>
            </div>

            <div style={{display:"flex",gap:"12px",flexWrap:"wrap",marginBottom:"16px"}}>
              {[
                {l:"READINESS",v:today.readiness,max:100,col:today.readiness>80?"#4ade80":today.readiness>65?"#fbbf24":"#ff6b35",note:"Recovery capacity"},
                {l:"HRV",v:today.hrv,max:60,col:"#a78bfa",note:"Nervous system"},
                {l:"SLEEP SCORE",v:today.sleepScore,max:100,col:today.sleepScore>80?"#4ade80":"#fbbf24",note:"Restoration quality"},
                {l:"RESTING HR",v:today.restingHR,max:70,col:"#f43f5e",note:"Baseline cardiac"},
              ].map(i=>(
                <div key={i.l} style={{flex:"1",minWidth:"110px",background:"#080814",padding:"12px",borderRadius:"4px",border:`1px solid ${i.col}30`}}>
                  <div style={{fontSize:"10px",color:C.text3,letterSpacing:"1px",marginBottom:"6px",fontWeight:"600"}}>{i.l}</div>
                  <div style={{fontSize:"22px",color:i.col,fontWeight:"bold",marginBottom:"5px"}}>{i.v}</div>
                  <div style={{height:"4px",background:C.surf2,borderRadius:"2px"}}>
                    <div style={{height:"100%",width:`${Math.min((i.v/i.max)*100,100)}%`,background:i.col,borderRadius:"2px"}}/>
                  </div>
                  <div style={{fontSize:"9px",color:C.dim,marginTop:"5px"}}>{i.note}</div>
                </div>
              ))}
            </div>

            {workout ? (
              <div style={{fontSize:"13px",lineHeight:"2",whiteSpace:"pre-wrap",color:C.text1}}>{workout}</div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"120px",color:C.text3,textAlign:"center"}}>
                <div style={{fontSize:"32px",marginBottom:"10px"}}>💪</div>
                <div style={{fontSize:"13px"}}>Generate your AI-optimized workout prescription</div>
                <div style={{fontSize:"11px",color:C.dim,marginTop:"6px"}}>Accounts for readiness · HRV · sleep · recent training history</div>
              </div>
            )}
          </div>

          <div style={panel}>
            {sectionLabel("TRAINING HISTORY — LAST 14 DAYS")}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:"12px"}}>
                <thead><tr>{["DATE","TYPE","VOLUME","DURATION","EXERCISES","READINESS"].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
                <tbody>
                  {DEMO.slice(0,14).map((d,i)=>(
                    <tr key={i} style={{borderBottom:`1px solid ${C.surf2}`,background:i===0?"#0e0e1e":"transparent"}}>
                      <td style={{...TD,color:i===0?"#fbbf24":C.text2,fontWeight:i===0?"bold":"normal"}}>{i===0?"TODAY":d.date}</td>
                      <td style={{...TD,color:d.workoutType==="Rest"?C.dim:C.text1,fontWeight:d.workoutType!=="Rest"?"600":"normal"}}>{d.workoutType}</td>
                      <td style={{...TD,color:C.text2}}>{d.workoutVol>0?d.workoutVol.toLocaleString():"—"}</td>
                      <td style={{...TD,color:C.text2}}>{d.workoutDur>0?`${d.workoutDur}m`:"—"}</td>
                      <td style={{...TD,color:C.text2}}>{d.exercises>0?d.exercises:"—"}</td>
                      <td style={{...TD,color:d.readiness>80?"#4ade80":d.readiness>65?"#fbbf24":"#ff6b35",fontWeight:"bold"}}>{d.readiness}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ NOTES TAB ══════════ */}
      {tab==="notes" && (
        <div style={{padding:"16px",maxWidth:"800px",margin:"0 auto"}}>

          {/* Composer */}
          <div style={{...panel,marginBottom:"16px",borderColor:"#a78bfa40"}}>
            {sectionLabel("📓 NEW NOTE")}

            {/* Tag selector */}
            <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"12px"}}>
              {NOTE_TAGS.map(tag=>{
                const active = noteDraft.tags.includes(tag);
                const TAG_COL = {sleep:"#a78bfa",food:"#34d399",workout:"#fbbf24",mindset:"#f43f5e",goals:"#00ff9d",recovery:"#60a5fa",body:"#00e5ff",general:"#888"};
                const col = TAG_COL[tag]||"#888";
                return (
                  <button key={tag} onClick={()=>setNoteDraft(p=>({...p,tags:active?p.tags.filter(t=>t!==tag):[...p.tags,tag]}))}
                    style={{padding:"4px 12px",background:active?col+"25":"transparent",border:`1px solid ${active?col:C.bord2}`,
                      color:active?col:C.text3,cursor:"pointer",fontSize:"10px",borderRadius:"8px",fontWeight:active?"bold":"normal",
                      letterSpacing:"1px",fontFamily:"'Courier New',monospace",transition:"all 0.15s"}}>
                    {tag.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* Date override (defaults to today) */}
            <div style={{display:"flex",gap:"10px",alignItems:"center",marginBottom:"10px",flexWrap:"wrap"}}>
              <span style={{fontSize:"10px",color:C.text3,letterSpacing:"1px"}}>DATE:</span>
              <input type="date" value={noteDraft.date}
                onChange={e=>setNoteDraft(p=>({...p,date:e.target.value}))}
                style={{...inp,padding:"4px 8px",fontSize:"11px",colorScheme:"dark",width:"140px"}}
                placeholder="today"/>
              <span style={{fontSize:"10px",color:C.dim}}>leave blank for today</span>
            </div>

            {/* Text area */}
            <textarea
              value={noteDraft.text}
              onChange={e=>setNoteDraft(p=>({...p,text:e.target.value}))}
              onKeyDown={e=>{ if(e.key==="Enter"&&(e.metaKey||e.ctrlKey)) addNote(); }}
              placeholder="Write your note here... e.g. 'Worked late until 8:30pm coding, couldn't fall asleep till 2am. Training felt sluggish today — probably undertapered.' ⌘+Enter to save."
              style={{...inp,width:"100%",minHeight:"90px",boxSizing:"border-box",fontSize:"13px",lineHeight:"1.7",resize:"vertical",fontFamily:"inherit"}}
            />
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"10px"}}>
              <span style={{fontSize:"10px",color:C.dim}}>
                {noteDraft.tags.length ? `Tagged: ${noteDraft.tags.join(", ")}` : "No tags selected — will save as general"}
              </span>
              <button onClick={addNote} disabled={!noteDraft.text.trim()}
                style={{...bFill("#a78bfa"),padding:"8px 20px",opacity:noteDraft.text.trim()?1:0.4}}>
                💾 SAVE NOTE
              </button>
            </div>
          </div>

          {/* Filter bar */}
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap",marginBottom:"12px",alignItems:"center"}}>
            <span style={{fontSize:"10px",color:C.text3,letterSpacing:"1px",marginRight:"4px"}}>FILTER:</span>
            {["all",...NOTE_TAGS].map(tag=>{
              const TAG_COL = {sleep:"#a78bfa",food:"#34d399",workout:"#fbbf24",mindset:"#f43f5e",goals:"#00ff9d",recovery:"#60a5fa",body:"#00e5ff",general:"#888",all:"#00ff9d"};
              const col = TAG_COL[tag]||"#888";
              const count = tag==="all" ? notes.length : notes.filter(n=>n.tags.includes(tag)).length;
              if(tag!=="all"&&count===0) return null;
              return (
                <button key={tag} onClick={()=>setNoteFilter(tag)}
                  style={{padding:"3px 10px",background:noteFilter===tag?col+"25":"transparent",
                    border:`1px solid ${noteFilter===tag?col:C.bord2}`,color:noteFilter===tag?col:C.text3,
                    cursor:"pointer",fontSize:"10px",borderRadius:"8px",fontWeight:noteFilter===tag?"bold":"normal",letterSpacing:"1px"}}>
                  {tag.toUpperCase()} ({count})
                </button>
              );
            })}
          </div>

          {/* Notes feed */}
          {notes.length === 0 ? (
            <div style={{...panel,textAlign:"center",padding:"40px",color:C.text3}}>
              <div style={{fontSize:"32px",marginBottom:"8px",opacity:0.3}}>📓</div>
              <div style={{fontSize:"13px"}}>No notes yet — write your first one above</div>
              <div style={{fontSize:"11px",color:C.dim,marginTop:"6px"}}>Notes are shared with all AI coaches as personal context</div>
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
              {notes
                .filter(n => noteFilter==="all" || n.tags.includes(noteFilter))
                .map(note=>{
                  const TAG_COL = {sleep:"#a78bfa",food:"#34d399",workout:"#fbbf24",mindset:"#f43f5e",goals:"#00ff9d",recovery:"#60a5fa",body:"#00e5ff",general:"#888"};
                  const primaryTag = note.tags[0]||"general";
                  const col = TAG_COL[primaryTag]||"#888";
                  return (
                    <div key={note.id} style={{...panel,margin:0,borderColor:col+"40",borderLeft:`3px solid ${col}`,padding:"12px 16px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"8px",gap:"12px"}}>
                        <div style={{display:"flex",gap:"6px",flexWrap:"wrap",flex:1}}>
                          {note.tags.map(tag=>(
                            <span key={tag} style={{fontSize:"9px",background:TAG_COL[tag]+"22",color:TAG_COL[tag]||"#888",padding:"2px 8px",borderRadius:"4px",letterSpacing:"1px",fontWeight:"bold"}}>
                              {tag.toUpperCase()}
                            </span>
                          ))}
                          <span style={{fontSize:"10px",color:C.dim,letterSpacing:"0.5px"}}>
                            {note.date} {note.time}
                          </span>
                        </div>
                        <button onClick={()=>deleteNote(note.id)}
                          style={{background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontSize:"14px",padding:"0 4px",flexShrink:0}}
                          title="Delete note">×</button>
                      </div>
                      <div style={{fontSize:"13px",lineHeight:"1.7",color:C.text1,whiteSpace:"pre-wrap"}}>
                        {note.text}
                      </div>
                    </div>
                  );
                })
              }
            </div>
          )}

          {notes.length > 0 && (
            <div style={{marginTop:"12px",fontSize:"10px",color:C.dim,textAlign:"center"}}>
              {notes.length} note{notes.length!==1?"s":""} total · All notes are shared with AI coaches as personal context
            </div>
          )}
        </div>
      )}

      {/* ══════════ MEALS TAB ══════════ */}
      {tab==="meals" && <MealPlanner />}

      {/* ══════════ PHOTOS TAB ══════════ */}
      {tab==="photos" && (
        <div style={{padding:"16px",maxWidth:"900px",margin:"0 auto"}}>
          <div style={{...panel,marginBottom:"16px"}}>
            {sectionLabel("WEEKLY PROGRESS PHOTOS · AI BODY COMPOSITION ANALYSIS")}
            <div onClick={()=>fileRef.current.click()}
              style={{border:`2px dashed ${C.bord2}`,borderRadius:"6px",padding:"40px",textAlign:"center",cursor:"pointer",transition:"border-color 0.2s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#00ff9d"}
              onMouseLeave={e=>e.currentTarget.style.borderColor=C.bord2}>
              <div style={{fontSize:"36px",marginBottom:"10px"}}>📷</div>
              <div style={{color:C.text1,fontSize:"14px",fontWeight:"600",marginBottom:"6px"}}>Upload progress photos</div>
              <div style={{color:C.text3,fontSize:"12px"}}>Front · Back · Left Side · Right Side · Flex — multiple files supported</div>
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotos} style={{display:"none"}}/>
            </div>
          </div>

          {photos.length>0 && (
            <div style={{...panel,marginBottom:"16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <div style={{fontSize:"12px",color:C.text2,letterSpacing:"2px",fontWeight:"600"}}>{photos.length} PHOTO{photos.length>1?"S":""} UPLOADED</div>
                <button onClick={analyzePhotos} disabled={loading.photo} style={bFill("#00ff9d")}>
                  {loading.photo?"⟳ ANALYZING...":"⚡ AI ANALYZE PHOTOS"}
                </button>
              </div>
              <div style={{display:"flex",gap:"12px",flexWrap:"wrap",marginBottom:photoAnalysis?"16px":"0"}}>
                {photos.map((p,i)=>(
                  <div key={i} style={{position:"relative",width:"145px"}}>
                    <img src={p.url} alt="" style={{width:"145px",height:"190px",objectFit:"cover",borderRadius:"4px",border:`1px solid ${C.bord}`,display:"block"}}/>
                    <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.8)",padding:"5px 8px",textAlign:"center",borderRadius:"0 0 4px 4px"}}>
                      <select value={photoLabels[i]||"FRONT"} onChange={e=>{const n=[...photoLabels];n[i]=e.target.value;setPhotoLabels(n);}} style={{background:"transparent",border:"none",color:C.text2,fontSize:"10px",cursor:"pointer",width:"100%"}}>
                        {["FRONT","BACK","LEFT SIDE","RIGHT SIDE","FLEX"].map(o=><option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <button onClick={()=>setPhotos(p=>p.filter((_,j)=>j!==i))} style={{position:"absolute",top:"6px",right:"6px",background:"rgba(220,50,50,0.8)",border:"none",color:"#fff",width:"22px",height:"22px",cursor:"pointer",borderRadius:"3px",fontSize:"11px",fontWeight:"bold"}}>✕</button>
                  </div>
                ))}
              </div>
              {photoAnalysis && (
                <div style={{background:"#080814",border:`1px solid ${C.bord}`,borderRadius:"4px",padding:"16px",fontSize:"13px",lineHeight:"2",whiteSpace:"pre-wrap",color:C.text1}}>
                  {photoAnalysis}
                </div>
              )}
            </div>
          )}

          <div style={panel}>
            {sectionLabel("PHOTO PROTOCOL FOR ACCURATE TRACKING")}
            {[
              "📅  Same day each week — Sunday morning recommended",
              "🕖  Same time of day — morning, before food or water",
              "💡  Consistent lighting — natural light preferred",
              "📐  Same distance from camera, same pose each time",
              "🩲  Minimal clothing for accurate visual comparison",
              "📸  Take front, back, and both sides every session",
            ].map((line,i)=>(
              <div key={i} style={{padding:"8px 0",borderBottom:i<5?`1px solid ${C.surf2}`:"none",fontSize:"12px",color:C.text2,lineHeight:"1.6"}}>{line}</div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════ MANUAL TAB ══════════ */}
      {tab==="manual" && (
        <div style={{padding:"16px",maxWidth:"900px",margin:"0 auto"}}>

          {/* Hume Screenshot Scanner */}
          <div style={{...panel,marginBottom:"16px",borderColor:"#00e5ff40"}}>
            {sectionLabel("📷 SCAN HUME SCREENSHOT — AUTO-EXTRACT BODY COMPOSITION")}
            <div style={{display:"flex",gap:"12px",alignItems:"center",flexWrap:"wrap"}}>
              <input type="file" accept="image/*" multiple ref={humeFileRef} style={{display:"none"}}
                onChange={(e)=>scanHumeScreenshot(Array.from(e.target.files))} />
              <button onClick={()=>humeFileRef.current.click()} disabled={humeScanning}
                style={{...bFill("#00e5ff"),opacity:humeScanning?0.5:1}}>
                {humeScanning ? "⟳ SCANNING..." : "📷 UPLOAD HUME SCREENSHOT"}
              </button>
              <span style={{fontSize:"11px",color:C.text3}}>Upload 1-2 screenshots (Fat % and/or Muscle lbs) → AI reads the numbers</span>
            </div>
            {humeScanError && <div style={{color:"#ff6b35",fontSize:"12px",marginTop:"8px"}}>{humeScanError}</div>}
            {humeScanResult && (
              <div style={{marginTop:"12px",display:"flex",flexWrap:"wrap",gap:"12px"}}>
                {Object.entries(humeScanResult).map(([k,v])=>{
                  const isFat = k.includes("Fat");
                  const label = k.replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase());
                  return (
                    <div key={k} style={{background:isFat?"#ff6b3515":"#00e5ff15",border:`1px solid ${isFat?"#ff6b3540":"#00e5ff40"}`,borderRadius:"6px",padding:"8px 14px",textAlign:"center"}}>
                      <div style={{fontSize:"18px",fontWeight:"bold",color:isFat?"#ff6b35":"#00e5ff"}}>{v}{isFat?"%":" lbs"}</div>
                      <div style={{fontSize:"9px",color:C.text3,letterSpacing:"1px",marginTop:"2px"}}>{label}</div>
                    </div>
                  );
                })}
                <div style={{width:"100%",fontSize:"11px",color:"#4ade80",marginTop:"4px"}}>✓ Values filled in below. Check them, then tap Save.</div>
              </div>
            )}
          </div>

          <ManualUpload apiURL={apiURL} apiSecret={apiSecret} prefill={manualDraft} history={liveHistory}
            onSaved={()=>{setManualDraft({});fetchFromAPI(apiURL,apiSecret);}}/>
        </div>
      )}

        </div>{/* end content scroll */}
      </div>{/* end main content */}

      {drag&&kpiBoard?.byId[drag.id]&&(
        <div style={{position:"fixed",left:drag.x-drag.offX,top:drag.y-drag.offY,width:drag.w,zIndex:3000,pointerEvents:"none",
          transform:"scale(1.03) rotate(-1deg)",boxShadow:"0 20px 45px rgba(43,46,74,.22)",borderRadius:"14px",display:"flex"}}>
          <BtKpiCard c={kpiBoard.byId[drag.id]} cmpLbl={kr.cmpLbl} onOpen={()=>{}}/>
        </div>)}
      {/* ── ACCESS KEY GATE: the API password is never shipped in the site's code */}
      {(!apiSecret || apiStatus==="error" && /secret/i.test(apiError||"")) && (
        <div style={{position:"fixed",inset:0,background:"rgba(43,46,74,.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:"16px"}}>
          <form onSubmit={e=>{e.preventDefault();const v=unlockDraft.trim();if(!v)return;localStorage.setItem("bt_api_secret",v);setApiSecret(v);setUnlockDraft("");fetchFromAPI(apiURL,v);}}
            style={{background:"#fff",borderRadius:"14px",padding:"24px",width:"380px",maxWidth:"100%",fontFamily:"'Inter',system-ui,sans-serif",boxShadow:"0 20px 60px rgba(0,0,0,.25)"}}>
            <div style={{fontFamily:"'Inter',system-ui,sans-serif",fontSize:"18px",fontWeight:700,color:C.text1}}>Unlock BodyData</div>
            <div style={{fontSize:"13px",color:C.text3,margin:"4px 0 16px",lineHeight:1.5}}>
              {apiSecret?"That access key was rejected. Paste your current key.":"Paste your BodyData access key. It's saved in this browser only."}
            </div>
            <input type="password" autoFocus value={unlockDraft} onChange={e=>setUnlockDraft(e.target.value)} placeholder="Access key"
              style={{width:"100%",boxSizing:"border-box",height:"40px",border:`1px solid ${C.bord}`,borderRadius:"9px",padding:"0 12px",font:"inherit",color:C.text1}}/>
            <button type="submit" className="bt-btn" style={{marginTop:"12px",width:"100%",height:"40px",background:C.teal,borderColor:C.teal,color:"#fff"}}>Unlock</button>
          </form>
        </div>
      )}

      {/* ── API KEY MODAL */}
      {keyModal && (()=>{
        const LLM_META = {
          gpt4:      { placeholder:"sk-...", hint:"Starts with sk-", link:"https://platform.openai.com/api-keys", linkLabel:"platform.openai.com/api-keys" },
          gemini:    { placeholder:"AIza...", hint:"Starts with AIza", link:"https://aistudio.google.com/apikey", linkLabel:"aistudio.google.com/apikey" },
          grok:      { placeholder:"xai-...", hint:"Starts with xai-", link:"https://console.x.ai/", linkLabel:"console.x.ai" },
          perplexity:{ placeholder:"pplx-...", hint:"Starts with pplx-", link:"https://www.perplexity.ai/settings/api", linkLabel:"perplexity.ai/settings/api" },
        };
        const meta = LLM_META[keyModal] || { placeholder:"...", hint:"", link:"", linkLabel:"" };
        const llm  = LLMS.find(l=>l.id===keyModal);
        return (
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
            <div style={{...panel,width:"420px",maxWidth:"92vw",border:`1px solid ${llm?.col||C.bord2}`}}>
              <div style={{color:llm?.col||C.text1,fontSize:"15px",letterSpacing:"2px",fontWeight:"bold",marginBottom:"4px"}}>
                {llm?.icon} Connect {llm?.name}
              </div>
              <div style={{fontSize:"12px",color:C.text3,marginBottom:"16px"}}>
                Stored locally in your browser — never sent anywhere except {llm?.name}'s API
              </div>
              {meta.link && (
                <div style={{background:"#0a0a16",border:`1px solid ${C.bord}`,borderRadius:"4px",padding:"10px 14px",marginBottom:"14px",fontSize:"11px",color:C.text2,lineHeight:"1.8"}}>
                  Get your key at: <a href={meta.link} target="_blank" rel="noreferrer"
                    style={{color:llm?.col||"#00ff9d",textDecoration:"none"}}>{meta.linkLabel} ↗</a>
                  {meta.hint && <><br/><span style={{color:C.dim}}>{meta.hint}</span></>}
                </div>
              )}
              <label style={{fontSize:"11px",color:C.text2,display:"block",marginBottom:"6px",fontWeight:"600",letterSpacing:"1px"}}>API KEY</label>
              <input type="password" placeholder={meta.placeholder} value={keyDraft} onChange={e=>setKeyDraft(e.target.value)}
                onKeyDown={e=>{ if(e.key==="Enter"&&keyDraft.trim()){ setApiKeys(p=>({...p,[keyModal]:keyDraft})); setKeyModal(null); setKeyDraft(""); }}}
                style={{...inp,width:"100%",boxSizing:"border-box",marginBottom:"16px"}} autoFocus/>
              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={()=>{setApiKeys(p=>({...p,[keyModal]:keyDraft.trim()}));setKeyModal(null);setKeyDraft("");}}
                  disabled={!keyDraft.trim()} style={bFill(llm?.col||"#00ff9d")}>⚡ SAVE & CONNECT</button>
                <button onClick={()=>{setKeyModal(null);setKeyDraft("");}} style={bOut(C.text3)}>CANCEL</button>
                {apiKeys[keyModal] && (
                  <button onClick={()=>{setApiKeys(p=>{const n={...p};delete n[keyModal];return n;});setKeyModal(null);}}
                    style={{...bOut("#ff6b35"),marginLeft:"auto"}}>✕ REMOVE KEY</button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Floating AI Chat Bubble ── */}
      <div style={{position:"fixed",bottom:"24px",right:"24px",zIndex:9999,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:"12px"}}>
        {floatOpen && (
          <div style={{width:"380px",height:"560px",background:"#0d0d1a",border:"1px solid #00ff9d40",borderRadius:"16px",boxShadow:"0 20px 60px rgba(0,0,0,0.8)",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            {/* Header */}
            <div style={{padding:"14px 16px",background:"#0a0a15",borderBottom:"1px solid #1a1a2e",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <div style={{width:"32px",height:"32px",borderRadius:"50%",background:"linear-gradient(135deg,#5468FF,#6C5CFF)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px"}}>🧠</div>
                <div>
                  <div style={{fontSize:"13px",fontWeight:"bold",color:"#fff"}}>BodyData AI</div>
                  <div style={{fontSize:"10px",color:"#4ade80"}}>{claudeKey?"● Connected · All data loaded":"○ Add API key in AI Coach tab"}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:"8px",alignItems:"center"}}>
                {floatThread.length>0&&<button onClick={()=>setFloatThread([])} style={{background:"transparent",border:"none",color:"#555",cursor:"pointer",fontSize:"11px",padding:"4px 6px"}}>Clear</button>}
                <button onClick={()=>setFloatOpen(false)} style={{background:"transparent",border:"none",color:"#888",cursor:"pointer",fontSize:"18px",lineHeight:1,padding:"2px 6px"}}>×</button>
              </div>
            </div>
            {/* Messages */}
            <div ref={floatScrollRef} style={{flex:1,overflowY:"auto",padding:"14px",display:"flex",flexDirection:"column",gap:"10px"}}>
              {floatThread.length===0&&(
                <div style={{textAlign:"center",padding:"30px 16px"}}>
                  <div style={{fontSize:"28px",marginBottom:"10px"}}>🧠</div>
                  <div style={{fontSize:"13px",color:"#ccc",marginBottom:"6px",fontWeight:"600"}}>Ask me anything about your health</div>
                  <div style={{fontSize:"11px",color:"#555",lineHeight:"1.5"}}>I have your weight, body fat, sleep, HRV, nutrition, workouts and more. Try:</div>
                  <div style={{marginTop:"14px",display:"flex",flexDirection:"column",gap:"6px"}}>
                    {["How is my sleep trending?","What should I eat today?","Am I overtraining?","How close am I to 10% body fat?"].map(q=>(
                      <button key={q} onClick={()=>sendFloatChat(q)} style={{background:"#1a1a2e",border:"1px solid #2a2a4a",borderRadius:"8px",color:"#aaa",fontSize:"11px",padding:"8px 12px",cursor:"pointer",textAlign:"left"}}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {floatThread.map((m,i)=>(
                <div key={i} style={{display:"flex",flexDirection:"column",alignItems:m.role==="user"?"flex-end":"flex-start"}}>
                  <div style={{maxWidth:"88%",padding:"10px 13px",borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",background:m.role==="user"?"#00ff9d20":"#1a1a2e",border:`1px solid ${m.role==="user"?"#00ff9d40":"#2a2a4a"}`,color:m.role==="user"?"#e0ffe0":"#ddd",fontSize:"12px",lineHeight:"1.55",whiteSpace:"pre-wrap"}}>
                    {m.content}
                  </div>
                </div>
              ))}
              {(floatLoading||floatStream)&&(
                <div style={{display:"flex",alignItems:"flex-start"}}>
                  <div style={{maxWidth:"88%",padding:"10px 13px",borderRadius:"14px 14px 14px 4px",background:"#1a1a2e",border:"1px solid #2a2a4a",color:"#ddd",fontSize:"12px",lineHeight:"1.55",whiteSpace:"pre-wrap"}}>
                    {floatStream||<span style={{animation:"pulse 1.2s ease infinite",display:"inline-block"}}>●●●</span>}
                  </div>
                </div>
              )}
            </div>
            {/* Input */}
            <div style={{padding:"12px",borderTop:"1px solid #1a1a2e",flexShrink:0,display:"flex",gap:"8px",alignItems:"flex-end"}}>
              <textarea
                value={floatDraft}
                onChange={e=>setFloatDraft(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendFloatChat();}}}
                placeholder="Ask anything… (Enter to send)"
                rows={2}
                style={{flex:1,background:"#12121f",border:"1px solid #2a2a4a",borderRadius:"10px",color:"#fff",fontSize:"12px",padding:"10px 12px",resize:"none",outline:"none",fontFamily:"inherit",lineHeight:"1.4"}}
              />
              <button onClick={()=>sendFloatChat()} disabled={floatLoading||!floatDraft.trim()}
                style={{width:"38px",height:"38px",borderRadius:"50%",background:floatDraft.trim()&&!floatLoading?"#00ff9d":"#1a1a2e",border:"none",cursor:floatDraft.trim()&&!floatLoading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"16px",flexShrink:0,transition:"background 0.2s"}}>
                ↑
              </button>
            </div>
          </div>
        )}
        {/* Toggle button */}
        <button onClick={()=>setFloatOpen(o=>!o)}
          style={{width:"56px",height:"56px",borderRadius:"50%",background:floatOpen?"#2B2E4A":"linear-gradient(135deg,#5468FF,#6C5CFF)",border:floatOpen?"2px solid #5468FF40":"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"24px",boxShadow:"0 4px 20px rgba(84,104,255,.35)",transition:"all 0.2s"}}>
          {floatOpen?"×":"🧠"}
        </button>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} * { box-sizing: border-box; }`}</style>
    </div>
  );
}
