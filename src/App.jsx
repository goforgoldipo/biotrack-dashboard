import { useState, useCallback, useRef, Fragment, useEffect } from "react";

// ─── COLOR SYSTEM ─────────────────────────────────────────────────────────────
// text1: primary white text
// text2: secondary readable text
// text3: muted but still visible
// dim:   truly secondary/label
const C = {
  text1: "#f0f0f0",   // bright white — all primary labels, values
  text2: "#c8c8c8",   // light gray — secondary content
  text3: "#a0a0a0",   // medium gray — units, subtitles
  dim:   "#707070",   // muted — truly secondary info
  bg:    "#050509",
  surf:  "#0e0e18",
  surf2: "#12121e",
  bord:  "#1e1e2e",
  bord2: "#2a2a3e",
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
const DEMO = Array.from({ length: 3650 }, (_, i) => genDay(i));

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
const GROUPS = [
  { id:"body", name:"BODY COMPOSITION", src:"HUME", col:"#ff6b35", rows:[
    {k:"weight",l:"Weight",u:"lbs",hi:true},{k:"bodyFat",l:"Body Fat %",u:"%",hi:true,fat:true},
    {k:"leanMass",l:"Lean Mass",u:"lbs"},{k:"muscleMass",l:"Muscle Mass",u:"lbs",hi:true},
    {k:"muscleRate",l:"Muscle Rate",u:"%"},{k:"fatMass",l:"Fat Mass",u:"lbs",fat:true},
    {k:"bmi",l:"BMI",u:""},{k:"visceralFat",l:"Visceral Fat",u:"",fat:true},
    {k:"subcutaneousFat",l:"Subcutaneous Fat",u:"",fat:true},
    {k:"boneMass",l:"Bone Mass",u:"lbs"},
    {k:"proteinMass",l:"Protein Mass",u:"lbs"},{k:"proteinRate",l:"Protein Rate",u:"%"},
    {k:"moisture",l:"Body Water",u:"%"},
    {k:"bmr",l:"BMR",u:"kcal"},{k:"metabolicAge",l:"Metabolic Age",u:"yrs"},
  ]},
  { id:"segmental", name:"SEGMENTAL BODY FAT", src:"HUME BODY POD", col:"#00e5ff", rows:[
    {k:"trunkFat",   l:"Trunk",     u:"%", hi:true, fat:true},
    {k:"rightArmFat",l:"Right Arm", u:"%", fat:true},
    {k:"leftArmFat", l:"Left Arm",  u:"%", fat:true},
    {k:"rightLegFat",l:"Right Leg", u:"%", fat:true},
    {k:"leftLegFat", l:"Left Leg",  u:"%", fat:true},
    {k:"trunkMuscle",    l:"Trunk Muscle",    u:"lbs"},
    {k:"rightArmMuscle", l:"Right Arm Muscle",u:"lbs"},
    {k:"leftArmMuscle",  l:"Left Arm Muscle", u:"lbs"},
    {k:"rightLegMuscle", l:"Right Leg Muscle",u:"lbs"},
    {k:"leftLegMuscle",  l:"Left Leg Muscle", u:"lbs"},
  ]},
  { id:"sleep", name:"SLEEP & RECOVERY", src:"OURA", col:"#a78bfa", rows:[
    {k:"sleepScore",l:"Sleep Score",u:"/100",hi:true},{k:"sleepDur",l:"Duration",u:"hrs"},
    {k:"deepSleep",l:"Deep Sleep",u:"hrs"},{k:"remSleep",l:"REM Sleep",u:"hrs"},
    {k:"lightSleep",l:"Light Sleep",u:"hrs"},
    {k:"hrv",l:"HRV",u:"ms",hi:true},{k:"restingHR",l:"Resting HR",u:"bpm"},
    {k:"hrRecovery",l:"HR Recovery 1min",u:"bpm"},{k:"respiratoryRate",l:"Respiratory Rate",u:"/min"},
    {k:"spo2",l:"SpO2",u:"%"},{k:"sleepingWristTemp",l:"Wrist Temp",u:"°C"},
    {k:"readiness",l:"Readiness",u:"/100"},
  ]},
  { id:"nutrition", name:"NUTRITION", src:"MYFITNESSPAL", col:"#34d399", rows:[
    {k:"calories",l:"Calories In",u:"kcal",hi:true},{k:"protein",l:"Protein",u:"g",hi:true},
    {k:"carbs",l:"Carbs",u:"g"},{k:"fat",l:"Fat",u:"g"},{k:"saturatedFat",l:"Saturated Fat",u:"g"},
    {k:"sugar",l:"Sugar",u:"g"},{k:"fiber",l:"Fiber",u:"g"},{k:"cholesterol",l:"Cholesterol",u:"mg"},
    {k:"sodium",l:"Sodium",u:"mg"},{k:"potassium",l:"Potassium",u:"mg"},
    {k:"calcium",l:"Calcium",u:"mg"},{k:"iron",l:"Iron",u:"mg"},{k:"vitaminC",l:"Vitamin C",u:"mg"},
    {k:"water",l:"Water",u:"L"},
  ]},
  { id:"activity", name:"ACTIVITY", src:"APPLE HEALTH", col:"#f43f5e", rows:[
    {k:"steps",l:"Steps",u:"",hi:true},{k:"calsBurned",l:"Cals Burned",u:"kcal"},
    {k:"activeMins",l:"Active Mins",u:"min"},{k:"avgHR",l:"Avg Heart Rate",u:"bpm"},
    {k:"standHours",l:"Stand Hours",u:"hrs"},{k:"flightsClimbed",l:"Flights Climbed",u:""},
    {k:"vo2max",l:"VO2 Max",u:""},{k:"walkingSteadiness",l:"Walking Steadiness",u:"%"},
  ]},
  { id:"training", name:"TRAINING", src:"FITBOD", col:"#fbbf24", rows:[
    {k:"workoutType",l:"Workout Type",u:"",hi:true},{k:"workoutVol",l:"Total Volume",u:"lbs",hi:true},
    {k:"workoutDur",l:"Duration",u:"min"},{k:"fitbodSets",l:"Total Sets",u:""},
    {k:"fitbodWorkingSets",l:"Working Sets",u:""},{k:"fitbodTotalReps",l:"Total Reps",u:""},
    {k:"fitbodExerciseCount",l:"Exercises",u:""},{k:"fitbodMaxWeightLbs",l:"Max Weight",u:"lbs",hi:true},
    {k:"fitbodMuscleGroups",l:"Muscle Groups",u:""},
  ]},
  { id:"volByGroup", name:"VOLUME BY MUSCLE GROUP", src:"FITBOD", col:"#fbbf24", rows:[
    {k:"volChest",l:"Chest Vol",u:"lbs",hi:true},{k:"repsChest",l:"Chest Reps",u:""},{k:"setsChest",l:"Chest Sets",u:""},{k:"maxChest",l:"Chest Max",u:"lbs"},
    {k:"volBack",l:"Back Vol",u:"lbs",hi:true},{k:"repsBack",l:"Back Reps",u:""},{k:"setsBack",l:"Back Sets",u:""},{k:"maxBack",l:"Back Max",u:"lbs"},
    {k:"volShoulders",l:"Shoulders Vol",u:"lbs",hi:true},{k:"repsShoulders",l:"Shoulders Reps",u:""},{k:"setsShoulders",l:"Shoulders Sets",u:""},{k:"maxShoulders",l:"Shoulders Max",u:"lbs"},
    {k:"volBiceps",l:"Biceps Vol",u:"lbs",hi:true},{k:"repsBiceps",l:"Biceps Reps",u:""},{k:"setsBiceps",l:"Biceps Sets",u:""},{k:"maxBiceps",l:"Biceps Max",u:"lbs"},
    {k:"volTriceps",l:"Triceps Vol",u:"lbs",hi:true},{k:"repsTriceps",l:"Triceps Reps",u:""},{k:"setsTriceps",l:"Triceps Sets",u:""},{k:"maxTriceps",l:"Triceps Max",u:"lbs"},
    {k:"volLegs",l:"Legs Vol",u:"lbs",hi:true},{k:"repsLegs",l:"Legs Reps",u:""},{k:"setsLegs",l:"Legs Sets",u:""},{k:"maxLegs",l:"Legs Max",u:"lbs"},
    {k:"volCore",l:"Core Vol",u:"lbs",hi:true},{k:"repsCore",l:"Core Reps",u:""},{k:"setsCore",l:"Core Sets",u:""},{k:"maxCore",l:"Core Max",u:"lbs"},
    {k:"trunkFat",l:"Trunk Fat",u:"%"},{k:"rightArmFat",l:"Right Arm Fat",u:"%"},
    {k:"leftArmFat",l:"Left Arm Fat",u:"%"},{k:"rightLegFat",l:"Right Leg Fat",u:"%"},
    {k:"leftLegFat",l:"Left Leg Fat",u:"%"},
  ]},
];

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
      'Tap the blue + button top-right → name it "BioTrack Daily Sync"',
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
  { color:"#a78bfa", phase:"PHASE 4 — SAVE & AUTO-OPEN", title:"Copy Data & Auto-Open BioTrack",
    note:"After this phase, the Shortcut copies your health data AND opens BioTrack automatically — all you do is tap Paste.",
    steps:[
      'Add action: "Get Text from Dictionary" → Input: the Dictionary above',
      'Add action: "Copy to Clipboard" → Input: Dictionary as Text',
      'Add action: "Open URLs" → paste your BioTrack URL (open BioTrack in Safari → Share → Copy Link → paste here)',
      'Add action: "Show Notification" → Title: "BioTrack Synced ✓" · Body: "Data copied — tap Paste to go live"',
    ]
  },
  { color:"#f43f5e", phase:"PHASE 5 — AUTOMATE", title:"Schedule 4 Daily Automations",
    note:"Create 4 separate automations — each one points to the same 'BioTrack Daily Sync' shortcut.",
    steps:[
      "Tap the Automation tab (bottom of Shortcuts app)",
      "Tap + → Personal Automation → Time of Day",
      "1st → 4:00 AM · Daily → add 'BioTrack Daily Sync' → turn OFF 'Ask Before Running' → Done ✓",
      "2nd → 12:00 PM · Daily → add 'BioTrack Daily Sync' → turn OFF 'Ask Before Running' → Done ✓",
      "3rd → 5:00 PM · Daily → add 'BioTrack Daily Sync' → turn OFF 'Ask Before Running' → Done ✓",
      "4th → 11:00 PM · Daily → add 'BioTrack Daily Sync' → turn OFF 'Ask Before Running' → Done ✓",
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
  const realDays = (history||[]).map(h=>({...h, isDemo:false}));
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
    // Check if date is from a prior year
    const parsed = new Date(d.date+", "+thisYear);
    if(parsed > new Date(Date.now()+86400000)) parsed.setFullYear(thisYear-1);
    const yr = parsed.getFullYear();
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
    const parseDate = (s) => {
      if(!s) return null;
      const hasYear = /\b\d{4}\b/.test(s);
      let p;
      if(hasYear) {
        p = new Date(s);
      } else {
        p = new Date(s+", "+thisYear);
        if(!isNaN(p.getTime()) && p > new Date(Date.now()+86400000)) p.setFullYear(thisYear-1);
      }
      return isNaN(p.getTime()) ? null : p;
    };
    const byDateKey = {};
    all.forEach(d => {
      if(!d||!d.syncDate) return;
      const parsed = parseDate(d.syncDate);
      if(parsed) byDateKey[localKey(parsed)] = d;
    });
    // Also index live data's date if present
    if(live && live.syncDate) {
      const liveParsed = parseDate(live.syncDate);
      if(liveParsed) {
        const k = localKey(liveParsed);
        byDateKey[k] = { ...byDateKey[k], ...live, isDemo:false };
      }
    }
    // Generate 30 consecutive calendar days starting from today
    const todayJs = new Date();
    return Array.from({length:30},(_,i)=>{
      const date = new Date(todayJs.getFullYear(), todayJs.getMonth(), todayJs.getDate() - i);
      const key = localKey(date);
      // For i===0 (TODAY), always include live data if it exists
      let d = byDateKey[key] || EMPTY_DAY;
      if(i===0 && live) d = { ...d, ...live, isDemo:false };
      const dow = DOW[date.getDay()];
      const dateStr = `${MONTHS[date.getMonth()]} ${date.getDate()}`;
      const yr = date.getFullYear();
      let label;
      if(yr < thisYear) label = `${dow} ${dateStr} ${yr}`;
      else label = `${dow} ${dateStr}`;
      if(i===0 && live) label = `${label} ●`;
      return {
        label,
        data: d,
        live: i===0&&!!live,
        dayIndex:i,
        allDays:all,
      };
    });
  }
  if(view==="weekly") { const weeks=Math.min(Math.max(Math.ceil(all.length/7),1),52); return Array.from({length:weeks},(_,w)=>({label:weekLabel(w),data:aggDays(all.slice(w*7,w*7+7).filter(Boolean))})); }
  if(view==="monthly") { const months=Math.min(Math.max(Math.ceil(all.length/30),1),120); return Array.from({length:months},(_,m)=>({label:monthLabel(m),data:aggDays(all.slice(m*30,m*30+30).filter(Boolean))})); }
  const years=Math.min(Math.max(Math.ceil(all.length/365),1),20); return Array.from({length:years},(_,y)=>({label:yearLabel(y),data:aggDays(all.slice(y*365,y*365+365).filter(Boolean))}));
};

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


const mapImport = (p) => {
  // Derive dow/date — prefer syncDate (actual data date) over _receivedAt (import time)
  // syncDate can be "Apr 12 2025" (with year) or "Apr 12" (without year)
  let refDate;
  if (p.syncDate) {
    // Does syncDate contain a 4-digit year?
    const hasYear = /\b\d{4}\b/.test(p.syncDate);
    let parsed;
    if (hasYear) {
      parsed = new Date(p.syncDate);
    } else {
      parsed = new Date(p.syncDate + ", " + new Date().getFullYear());
      if (!isNaN(parsed.getTime()) && parsed > new Date(Date.now() + 86400000)) {
        parsed.setFullYear(parsed.getFullYear() - 1);
      }
    }
    refDate = parsed;
  } else if (p._receivedAt) {
    refDate = new Date(p._receivedAt);
  } else {
    refDate = new Date();
  }
  const m = {
    syncDate: p.syncDate||new Date().toLocaleDateString("en-US",{month:"short",day:"numeric"}),
    syncTime: p.syncTime||new Date().toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"}),
    dow: p.dow||["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][refDate.getDay()],
    date: p.date||refDate.toLocaleDateString("en-US",{month:"short",day:"numeric"}),
    steps: p.steps||p.stepCount, calsBurned: p.activeCalories||p.calsBurned||p.totalCaloriesBurned,
    restingHR: p.restingHR||p.restingHeartRate, avgHR: p.avgHR||p.averageHeartRate,
    vo2max: p.vo2max||p.vo2Max, standHours: p.standHours,
    weight: p.weight||p.bodyWeight, bodyFat: p.bodyFat||p.bodyFatPercentage,
    leanMass: p.leanMass||p.leanBodyMass, bmi: p.bmi, visceralFat: p.visceralFat,
    muscleMass: p.muscleMass, muscleRate: p.muscleRate, fatMass: p.fatMass,
    subcutaneousFat: p.subcutaneousFat, boneMass: p.boneMass,
    proteinMass: p.proteinMass, proteinRate: p.proteinRate, moisture: p.moisture,
    bmr: p.bmr||p.basalMetabolicRate||p.basalCalories, metabolicAge: p.metabolicAge||p.metabolic_age,
    calories: p.calories||p.dietaryCalories, protein: p.protein,
    carbs: p.carbs||p.carbohydrates, fat: p.fat, fiber: p.fiber, water: p.water,
    sleepDur: p.sleepDur||p.sleepDuration, deepSleep: p.deepSleep, remSleep: p.remSleep,
    lightSleep: p.lightSleep, spo2: p.spo2, sleepingWristTemp: p.sleepingWristTemp,
    hrRecovery: p.hrRecovery, walkingSteadiness: p.walkingSteadiness,
    respiratoryRate: p.respiratoryRate, flightsClimbed: p.flightsClimbed,
    sugar: p.sugar, cholesterol: p.cholesterol, saturatedFat: p.saturatedFat,
    potassium: p.potassium, calcium: p.calcium, iron: p.iron, vitaminC: p.vitaminC,
    sodium: p.sodium,
    sleepScore: p.sleepScore, hrv: p.hrv, readiness: p.readiness,
    workoutType: (p.workoutType||"").replace("Traditional Strength Training","Strength").replace("High Intensity Interval Training","HIIT").replace("Functional Strength Training","Functional"), workoutDur: p.workoutDur||p.workoutDuration,
    workoutVol: p.workoutVol||p.workoutCalories, exercises: p.exercises||p.fitbodExercises,
    fitbodSets: p.fitbodSets, fitbodWorkingSets: p.fitbodWorkingSets, fitbodWarmupSets: p.fitbodWarmupSets,
    fitbodTotalReps: p.fitbodTotalReps, fitbodExerciseCount: p.fitbodExerciseCount,
    fitbodMaxWeightLbs: p.fitbodMaxWeightLbs, fitbodMuscleGroups: p.fitbodMuscleGroups,
    // Per-muscle-group volume, reps, sets, max
    volChest: p.volChest, volBack: p.volBack, volShoulders: p.volShoulders,
    volBiceps: p.volBiceps, volTriceps: p.volTriceps, volLegs: p.volLegs, volCore: p.volCore,
    repsChest: p.repsChest, repsBack: p.repsBack, repsShoulders: p.repsShoulders,
    repsBiceps: p.repsBiceps, repsTriceps: p.repsTriceps, repsLegs: p.repsLegs, repsCore: p.repsCore,
    setsChest: p.setsChest, setsBack: p.setsBack, setsShoulders: p.setsShoulders,
    setsBiceps: p.setsBiceps, setsTriceps: p.setsTriceps, setsLegs: p.setsLegs, setsCore: p.setsCore,
    maxChest: p.maxChest, maxBack: p.maxBack, maxShoulders: p.maxShoulders,
    maxBiceps: p.maxBiceps, maxTriceps: p.maxTriceps, maxLegs: p.maxLegs, maxCore: p.maxCore,
    // Hume segmental — accept multiple naming conventions
    trunkFat:    p.trunkFat    || p.trunk_fat    || p.torsoFat  || p.torso_fat,
    rightArmFat: p.rightArmFat || p.right_arm_fat|| p.rightArm,
    leftArmFat:  p.leftArmFat  || p.left_arm_fat || p.leftArm,
    rightLegFat: p.rightLegFat || p.right_leg_fat|| p.rightLeg,
    leftLegFat:  p.leftLegFat  || p.left_leg_fat || p.leftLeg,
    trunkMuscle:    p.trunkMuscle    || p.trunk_muscle,
    rightArmMuscle: p.rightArmMuscle || p.right_arm_muscle,
    leftArmMuscle:  p.leftArmMuscle  || p.left_arm_muscle,
    rightLegMuscle: p.rightLegMuscle || p.right_leg_muscle,
    leftLegMuscle:  p.leftLegMuscle  || p.left_leg_muscle,
  };
  // Compute leanMass from weight and bodyFat if not provided
  if(!m.leanMass && m.weight && m.bodyFat) m.leanMass = +(m.weight * (1 - m.bodyFat/100)).toFixed(1);
  if(!m.fatMass && m.weight && m.bodyFat) m.fatMass = +(m.weight * m.bodyFat/100).toFixed(1);
  // Compute activeMins from workoutDur if not provided
  if(!m.activeMins && m.workoutDur) m.activeMins = Math.round(m.workoutDur);
  Object.keys(m).forEach(k=>{ if(m[k]===null||m[k]===undefined) delete m[k]; });
  return m;
};

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState("daily");
  const [tab,setTab]=useState("dashboard");
  const [activeLLM,setActiveLLM]=useState("claude");
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
  const [expanded,setExpanded]=useState({body:true,segmental:true,sleep:true,nutrition:true,activity:true,training:true,volByGroup:true});
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
  const [apiSecret,setApiSecret]=useState(()=>localStorage.getItem("bt_api_secret")||"8da2e9f068632f6b113688c222e09d5fae01c15121ea7afafe3d6931a884ba2a");
  const [apiStatus,setApiStatus]=useState("idle");
  const [apiError,setApiError]=useState("");
  const [showApiSetup,setShowApiSetup]=useState(false);
  const [liveHistory,setLiveHistory]=useState([]); // real 90-day history from API
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
      if(r.status===404) { setApiStatus("polling"); setApiError("Waiting for first iOS sync — open BioTrack Health app and tap Sync Now"); return; }
      if(!r.ok) throw new Error(`HTTP ${r.status}`);
      const latest = await r.json();
      setLiveData(mapImport(latest));
      setApiStatus("live");
      setApiError("");

      // Fetch history in background (non-blocking)
      fetch(`${base}/history?days=3650`, { headers })
        .then(h => h.ok ? h.json() : null)
        .then(h => {
          if(h?.snapshots?.length) {
            setLiveHistory(h.snapshots.map(mapImport));
          }
        })
        .catch(() => {}); // silent — history is bonus
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
      if(!s) return null;
      // Does the string explicitly contain a 4-digit year? e.g. "Apr 16 2026"
      const hasYear = /\b\d{4}\b/.test(s);
      let p;
      if(hasYear) {
        p = new Date(s);
      } else {
        // No year in string — assume current year, roll back if that's in the future
        p = new Date(s+", "+now.getFullYear());
        if(!isNaN(p.getTime()) && p > new Date(Date.now()+86400000)) {
          p.setFullYear(p.getFullYear()-1);
        }
      }
      if(isNaN(p.getTime())) return null;
      return `${p.getFullYear()}-${String(p.getMonth()+1).padStart(2,"0")}-${String(p.getDate()).padStart(2,"0")}`;
    };
    // Check if liveData is from today
    if(liveData && parseSyncDate(liveData.syncDate) === nowKey) return { ...liveData };
    // Search history for today's entry
    const todayInHistory = (liveHistory||[]).find(h => parseSyncDate(h.syncDate) === nowKey);
    if(todayInHistory) return { ...todayInHistory, ...(liveData && parseSyncDate(liveData.syncDate) === nowKey ? liveData : {}) };
    // Fall back to liveData even if stale (for KPI display)
    return liveData ? { ...liveData } : DEMO[0];
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
    const hist = (liveHistory && liveHistory.length > 0 ? liveHistory : DEMO).slice(0, 30);
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
    const snapshot = `━━ TODAY'S SNAPSHOT ${liveData?"[LIVE]":"[DEMO]"} ━━
BODY (Hume): Weight ${d.weight}lbs | Body Fat ${d.bodyFat}% | Lean Mass ${d.leanMass}lbs | BMI ${d.bmi||"—"} | Visceral Fat ${d.visceralFat||"—"}
SEGMENTAL FAT: ${seg||"not yet entered — remind user to log Hume scan"}
SEGMENTAL MUSCLE: ${mus||"not yet entered"}
SLEEP (Oura): Score ${d.sleepScore}/100 | ${d.sleepDur}h total | Deep ${d.deepSleep}h | REM ${d.remSleep}h | HRV ${d.hrv}ms | RHR ${d.restingHR}bpm | Readiness ${d.readiness}/100
NUTRITION (MFP): ${d.calories}kcal | Protein ${d.protein}g | Carbs ${d.carbs}g | Fat ${d.fat}g | Fiber ${d.fiber}g | Water ${d.water}L
ACTIVITY (Apple): ${Number(d.steps).toLocaleString()} steps | ${d.calsBurned}kcal burned | Avg HR ${d.avgHR}bpm | VO2 ${d.vo2max}
TRAINING: ${d.workoutType||"Rest"} ${d.workoutDur?d.workoutDur+"min":""} | Volume ${d.workoutVol?Math.round(d.workoutVol).toLocaleString()+"lbs":"—"} | Sets ${d.fitbodSets||"—"} | Reps ${d.fitbodTotalReps||"—"} | Max ${d.fitbodMaxWeightLbs||"—"}lbs
GOAL: Minimize body fat → 10%, preserve lean mass. Vegan athlete.`;
    const history = buildHistory(coachId||"progress");
    return `${snapshot}\n\n${history}`;
  },[today,manual,liveData,buildHistory]);

  const [claudeKey,setClaudeKey]=useState(()=>localStorage.getItem("bt_claude_key")||"");
  const callClaude = async (sys,prompt,content) => {
    const key = claudeKey;
    if(!key) throw new Error("Enter your Anthropic API key in the AI Coach tab to enable Claude");
    const msgs = content ? [{role:"user",content}] : [{role:"user",content:prompt}];
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":key,"anthropic-dangerous-direct-browser-access":"true"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:2000,system:sys,messages:msgs})});
    const j=await r.json(); if(j.error)throw new Error(j.error.message); return j.content[0].text;
  };
  const callGPT = async (sys,prompt,key) => {
    const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},
      body:JSON.stringify({model:"gpt-4o",messages:[{role:"system",content:sys},{role:"user",content:prompt}]})});
    const j=await r.json(); if(j.error)throw new Error(j.error.message); return j.choices[0].message.content;
  };

  const COACHES = [
    {
      id:"workout", icon:"💪", name:"WORKOUT COACH", col:"#fbbf24",
      sys:"You are an elite strength & conditioning coach specializing in body recomposition for a vegan athlete targeting 10% body fat. You design evidence-based programs that maximize muscle retention during a caloric deficit. Be specific with exercises, sets×reps, load, tempo, and rest. Reference actual numbers from the client's training history and recovery data.",
      defaultDailyPrompt:"Based on my recovery data (HRV, sleep, resting HR) and my last 7 days of training, give me today's exact workout. Include warm-up → main lifts (sets×reps×load) → accessories → finisher. Identify which muscle groups need priority based on my historical volume and weak points. Keep it specific and actionable — I want to execute this today.",
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
      defaultDailyPrompt:"Based on my macros, training schedule, and body fat goal, give me exactly what to eat today. Specify breakfast, lunch, dinner, and 2 snacks with exact foods, portions, calories, and macros. Target 180g+ protein in a caloric deficit. Whole food plant-powered vegan only — no processed fake meats. Include total daily calories, protein, carbs, fats.",
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
      defaultDailyPrompt:"Analyze my last 7 nights of sleep + HRV data and give me tonight's exact protocol: wind-down routine start time, bedtime, room temperature, nutrition cutoff, caffeine cutoff, blue light cutoff, and any supplements. Also identify the top 1 behavior to change today to improve tonight's sleep. Target 8+ hrs total, 1.5+ deep, 1.5+ REM.",
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
      defaultDailyPrompt:"Give me today's motivational brief. Reference my biggest measurable wins from the last 30 days (with specific numbers from my data), identify today's #1 focus area, and give me 3 actionable commitments for today that will move the needle toward 10% body fat. Be direct and inspiring — make me feel the momentum.",
      questions:[
        {id:"today",label:"🔥 DAILY MOTIVATION",prompt:"Give me today's motivational brief. Acknowledge what I've achieved (reference specific data milestones), identify today's key focus area, and give me 3 actionable commitments for today that will move the needle toward 10% body fat."},
        {id:"wins",label:"🏅 MY WINS THIS MONTH",prompt:"Analyze my data and call out every measurable win from the past 30 days — body comp changes, training PRs, consistency streaks, sleep improvements. Make me feel the progress I've made. Be specific with numbers."},
        {id:"trajectory",label:"🚀 MY TRAJECTORY",prompt:"Project my trajectory to 10% body fat based on my current pace. When will I hit 14%, 12%, 10%? What needs to change to accelerate? Create a visual timeline and milestone plan. Make it ambitious but achievable."},
        {id:"reframe",label:"💡 REFRAME & REFOCUS",prompt:"If I'm feeling stuck, unmotivated, or frustrated — diagnose what's really going on from my data. Is it actually stalled progress, or am I being too hard on myself? Give me perspective and a path forward."},
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

  const analyze = async (llmId, coachId, questionId) => {
    const l=LLMS.find(x=>x.id===llmId);
    if(!l.native&&!apiKeys[llmId]){setKeyModal(llmId);return;}
    const coach = COACHES.find(c=>c.id===coachId);
    // For daily coaching, use the saved custom prompt (or default) and key by today's date
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
    const sys = coach.sys;
    try {
      let res;
      const dataCtx = ctx(coachId);
      if(llmId==="claude") res=await callClaude(sys,`${promptText}\n\n${dataCtx}`);
      else if(llmId==="gpt4"&&apiKeys.gpt4) res=await callGPT(sys,`${promptText}\n\n${dataCtx}`,apiKeys.gpt4);
      else res=`[${l.name} — tap 🔑 ADD KEY to enable]`;
      setAnalyses(p=>({...p,[qKey]:res}));
    } catch(e){setAnalyses(p=>({...p,[qKey]:`⚠ ${e.message}`}));}
    setLoading(p=>({...p,[qKey]:false}));
  };

  const getWorkout = async () => {
    setLoading(p=>({...p,workout:true}));
    try {
      const recent=DEMO.slice(0,7).map(x=>`${x.date} ${x.workoutType}`).join(", ");
      const r=await callClaude(
        "You are an elite strength coach for fat loss. Prescribe today's exact workout: Warm-Up → Main → Accessory → Finisher. Include exercises, sets×reps, load, tempo, rest.",
        `Readiness: ${today.readiness}/100 | HRV: ${today.hrv}ms | Sleep: ${today.sleepScore}/100\nRecent: ${recent}\n${ctx("workout")}`
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
      const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":claudeKey,"anthropic-dangerous-direct-browser-access":"true"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
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
          model: "claude-sonnet-4-20250514",
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
  const panel={background:C.surf,border:`1px solid ${C.bord}`,borderRadius:"6px",padding:"16px"};
  const inp={background:"#0a0a16",border:`1px solid ${C.bord2}`,color:C.text1,padding:"8px 12px",fontSize:"13px",borderRadius:"4px",outline:"none"};
  const bFill=(col)=>({padding:"9px 20px",background:col,border:"none",color:"#000",cursor:"pointer",fontSize:"11px",letterSpacing:"2px",borderRadius:"3px",fontWeight:"bold"});
  const bOut=(col)=>({padding:"9px 14px",background:"transparent",border:`1px solid ${col}`,color:col,cursor:"pointer",fontSize:"11px",letterSpacing:"1px",borderRadius:"3px"});
  const TH={padding:"6px 6px",textAlign:"right",fontSize:"11px",color:C.text1,letterSpacing:"1px",borderBottom:`1px solid ${C.bord}`,whiteSpace:"nowrap",fontWeight:"600",opacity:0.8};
  const TD={padding:"6px 6px",textAlign:"right",borderBottom:`1px solid ${C.surf2}`,whiteSpace:"normal",wordBreak:"break-word",verticalAlign:"middle"};

  const r1=v=>(v==null||v===undefined||Number.isNaN(v))?"—":typeof v==="number"&&!Number.isInteger(v)?+v.toFixed(1):v;
  const kv=(v,suffix)=>{ const f=r1(v); return f==="—"?"—":`${f}${suffix}`; };
  const kpis=[
    {l:"BODY FAT",v:kv(today.bodyFat,"%"),c:"#ff6b35"},{l:"WEIGHT",v:kv(today.weight," lbs"),c:"#fbbf24"},
    {l:"FAT MASS",v:kv(today.fatMass||(today.weight&&today.bodyFat?+(today.weight*today.bodyFat/100).toFixed(1):null)," lbs"),c:"#ff6b35"},{l:"LEAN MASS",v:kv(today.leanMass," lbs"),c:"#34d399"},
    {l:"HRV",v:kv(today.hrv," ms"),c:"#a78bfa"},{l:"READINESS",v:kv(today.readiness,"/100"),c:"#00e5ff"},
    {l:"SLEEP",v:kv(today.sleepScore,"/100"),c:"#818cf8"},
    {l:"STEPS",v:today.steps?Math.round(Number(today.steps)).toLocaleString():"—",c:"#f43f5e"},{l:"PROTEIN",v:kv(today.protein,"g"),c:"#34d399"},
  ];

  const sectionLabel = (txt) => (
    <div style={{fontSize:"10px",color:C.text3,letterSpacing:"2px",marginBottom:"12px",fontWeight:"600"}}>{txt}</div>
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text1,fontFamily:"'Courier New',monospace",fontSize:"13px"}}>

      {/* ── HEADER */}
      <div style={{background:"#08080f",borderBottom:`1px solid ${C.bord}`,padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
          <div style={{fontSize:"18px",fontWeight:"900",letterSpacing:"5px",color:"#00ff9d"}}>⬡ BIOTRACK</div>
          {liveData ? (
            <div style={{display:"flex",alignItems:"center",gap:"6px",background:"#00ff9d15",border:"1px solid #00ff9d40",borderRadius:"4px",padding:"4px 12px"}}>
              <div style={{width:"6px",height:"6px",borderRadius:"50%",background:"#00ff9d",animation:"pulse 2s infinite"}}/>
              <span style={{fontSize:"10px",color:"#00ff9d",letterSpacing:"2px"}}>LIVE · {liveData.syncDate} {liveData.syncTime}</span>
            </div>
          ) : (
            <div onClick={()=>setTab("sync")} style={{fontSize:"10px",color:"#fbbf24",letterSpacing:"2px",cursor:"pointer",background:"#fbbf2412",border:"1px solid #fbbf2440",borderRadius:"4px",padding:"4px 12px"}}>
              ◉ DEMO · TAP TO CONNECT
            </div>
          )}
          <button onClick={()=>window.location.reload()} style={{background:"transparent",border:`1px solid ${C.bord2}`,color:C.text3,cursor:"pointer",fontSize:"11px",letterSpacing:"1px",borderRadius:"3px",padding:"4px 10px",fontFamily:"'Courier New',monospace"}}>↻</button>
        </div>
        <div style={{display:"flex",gap:"20px",flexWrap:"wrap"}}>
          {kpis.map(k=>(
            <div key={k.l} style={{textAlign:"center"}}>
              <div style={{fontSize:"17px",fontWeight:"bold",color:k.c}}>{k.v}</div>
              <div style={{fontSize:"10px",color:C.text1,letterSpacing:"1px",opacity:0.7}}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── NAV */}
      <div style={{background:"#07070e",borderBottom:`1px solid ${C.bord}`,display:"flex",overflowX:"auto"}}>
        {[["dashboard","📊 DASHBOARD"],["coach","🧠 AI COACH"],["workout","💪 WORKOUT"],["photos","📷 PHOTOS"],["manual","✏️ MANUAL"],["sync","⚡ SYNC"]].map(([id,l])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"11px 20px",background:"none",border:"none",borderBottom:`2px solid ${tab===id?"#00ff9d":"transparent"}`,color:tab===id?"#00ff9d":C.text3,cursor:"pointer",fontSize:"11px",letterSpacing:"2px",whiteSpace:"nowrap",transition:"color 0.15s"}}>
            {l}{id==="sync"&&liveData&&<span style={{color:"#00ff9d",marginLeft:"5px"}}>●</span>}
          </button>
        ))}
      </div>

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
                   apiStatus==="polling" ? "API connected · Open BioTrack Health on iPhone and tap Sync Now" :
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
                        → <span style={{color:"#a78bfa"}}>BioTrack opens automatically in Safari</span><br/>
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

      {/* ══════════ DASHBOARD TAB ══════════ */}
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
                    <tr><td colSpan={cols.length+2} style={{padding:0}}>
                      <div style={{padding:"8px 16px",background:"#0c0c1a",display:"flex",alignItems:"center",gap:"8px",borderTop:`1px solid ${C.bord}`,borderBottom:`1px solid ${C.bord}`}}>
                        <div style={{display:"flex",flexDirection:"column",gap:"1px",marginRight:"4px"}}>
                          <button onClick={(e)=>{e.stopPropagation();moveGroup(g.id,-1)}} style={{background:"none",border:"none",color:gi===0?C.dim:C.text3,cursor:gi===0?"default":"pointer",fontSize:"8px",padding:"2px 4px",lineHeight:"1"}}>▲</button>
                          <button onClick={(e)=>{e.stopPropagation();moveGroup(g.id,1)}} style={{background:"none",border:"none",color:gi===sortedGroups.length-1?C.dim:C.text3,cursor:gi===sortedGroups.length-1?"default":"pointer",fontSize:"8px",padding:"2px 4px",lineHeight:"1"}}>▼</button>
                        </div>
                        <div onClick={()=>setExpanded(p=>({...p,[g.id]:!p[g.id]}))} style={{display:"flex",alignItems:"center",gap:"12px",cursor:"pointer",flex:1}}>
                          <span style={{color:g.col,fontSize:"11px"}}>{expanded[g.id]?"▾":"▸"}</span>
                          <span style={{color:g.col,fontSize:"11px",letterSpacing:"3px",fontWeight:"bold"}}>{g.name}</span>
                          <span style={{fontSize:"9px",background:g.col+"22",color:g.col,padding:"2px 10px",borderRadius:"3px",letterSpacing:"1.5px",fontWeight:"600"}}>{g.src}</span>
                        </div>
                      </div>
                    </td></tr>
                    {expanded[g.id] && g.rows.map(row=>{
                      const vals=cols.map(c=>c.data[row.k]);
                      const nums=vals.filter(v=>typeof v==="number");
                      const trend=nums.length>=2?(nums[0]>nums[nums.length-1]?"↑":nums[0]<nums[nums.length-1]?"↓":"—"):"—";
                      const fatKey=row.fat||["chestFat","absFat","legFat","visceralFat","trunkFat","rightArmFat","leftArmFat","rightLegFat","leftLegFat"].includes(row.k);
                      const trendGood=fatKey?trend==="↓":trend==="↑";

                      // % change: each col vs the next col (current vs prior period)
                      const pctChanges = vals.map((v,ci)=>{
                        if(typeof v!=="number") return null;
                        const prev = vals[ci+1];
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
                          {vals.map((v,ci)=>{
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
                            const pctGood = fatKey ? (pct !== null && pct < 0) : (pct !== null && pct > 0);
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

      {/* ══════════ AI COACH TAB ══════════ */}
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
          {!claudeKey && (
            <div style={{...panel,marginBottom:"16px",borderColor:"#cc785c40"}}>
              {sectionLabel("🔑 ANTHROPIC API KEY — REQUIRED FOR AI COACH")}
              <div style={{display:"flex",gap:"10px",alignItems:"center"}}>
                <input type="password" placeholder="sk-ant-..." value={claudeKey}
                  onChange={e=>{setClaudeKey(e.target.value);localStorage.setItem("bt_claude_key",e.target.value);}}
                  style={{...inp,flex:1}} />
                <span style={{fontSize:"11px",color:C.text3}}>Get key at <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" style={{color:"#cc785c"}}>console.anthropic.com</a></span>
              </div>
            </div>
          )}
          {claudeKey && (
            <div style={{marginBottom:"12px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"10px"}}>
              <span style={{fontSize:"11px",color:"#4ade80"}}>✓ Claude API connected · 4 coaches ready</span>
              <div style={{display:"flex",gap:"8px"}}>
                <button onClick={async ()=>{
                  for(const coach of COACHES){
                    const llm = coachLLMs[coach.id]||"claude";
                    await analyze(llm, coach.id, "daily");
                  }
                }} style={{...bFill("#00ff9d"),padding:"6px 14px",fontSize:"10px"}}>☰ COACH ME ON ALL 4 TODAY</button>
                <button onClick={()=>{setClaudeKey("");localStorage.removeItem("bt_claude_key");}} style={{...bOut(C.dim),padding:"4px 10px",fontSize:"9px"}}>CHANGE KEY</button>
              </div>
            </div>
          )}

          {/* Coach Tab Bar */}
          <div style={{display:"flex",gap:"0",marginBottom:"16px",borderBottom:`1px solid ${C.bord}`,overflowX:"auto"}}>
            {COACHES.map(coach => {
              const isActive = activeCoach === coach.id;
              const hasDaily = analyses[`daily_${coach.id}_${coachLLMs[coach.id]||"claude"}_${todayDateKey}`];
              return (
                <button key={coach.id} onClick={()=>setActiveCoach(coach.id)}
                  style={{
                    padding:"12px 20px",
                    background:isActive?coach.col+"20":"transparent",
                    border:"none",
                    borderBottom:`3px solid ${isActive?coach.col:"transparent"}`,
                    color:isActive?coach.col:C.text2,
                    cursor:"pointer",
                    fontSize:"12px",
                    fontWeight:isActive?"bold":"normal",
                    letterSpacing:"1px",
                    fontFamily:"'Courier New',monospace",
                    whiteSpace:"nowrap",
                    display:"flex",
                    alignItems:"center",
                    gap:"6px"
                  }}>
                  <span style={{fontSize:"16px"}}>{coach.icon}</span>
                  {coach.name}
                  {hasDaily && <span style={{color:"#4ade80",fontSize:"10px"}}>●</span>}
                </button>
              );
            })}
          </div>

          {/* Active Coach Panel */}
          <div style={{...panel,borderColor:activeCoachObj.col+"40"}}>
            {/* Header with model picker */}
            <div style={{marginBottom:"14px",paddingBottom:"10px",borderBottom:`1px solid ${activeCoachObj.col}30`,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"12px"}}>
              <div>
                <div style={{color:activeCoachObj.col,fontSize:"18px",letterSpacing:"2px",fontWeight:"bold",marginBottom:"4px"}}>
                  {activeCoachObj.icon} {activeCoachObj.name}
                </div>
                <div style={{fontSize:"11px",color:C.text3}}>
                  {liveData?"LIVE DATA":"DEMO DATA"} · Today: {todayDateKey}
                </div>
              </div>
              {/* Model picker */}
              <div style={{display:"flex",gap:"4px",flexWrap:"wrap"}}>
                {LLMS.map(l=>(
                  <button key={l.id} onClick={()=>setCoachLLMs(p=>({...p,[activeCoachObj.id]:l.id}))}
                    style={{padding:"5px 10px",background:activeLLM===l.id?l.col+"30":"transparent",
                      border:`1px solid ${activeLLM===l.id?l.col:C.bord2}`,color:activeLLM===l.id?l.col:C.text3,
                      cursor:"pointer",fontSize:"10px",borderRadius:"3px",fontWeight:activeLLM===l.id?"bold":"normal"}}>
                    {l.icon} {l.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt Editor */}
            <div style={{marginBottom:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px"}}>
                <span style={{fontSize:"10px",color:C.text3,letterSpacing:"2px",fontWeight:"600"}}>📝 YOUR DAILY COACHING PROMPT (AUTO-SAVES)</span>
                <button onClick={()=>setCoachPrompts(p=>{const n={...p};delete n[activeCoachObj.id];return n;})}
                  style={{...bOut(C.dim),padding:"3px 8px",fontSize:"9px"}}>
                  ↻ RESET TO DEFAULT
                </button>
              </div>
              <textarea
                value={currentPrompt}
                onChange={e=>setCoachPrompts(p=>({...p,[activeCoachObj.id]:e.target.value}))}
                style={{...inp,width:"100%",minHeight:"100px",boxSizing:"border-box",fontSize:"12px",lineHeight:"1.6",resize:"vertical",fontFamily:"'Courier New',monospace"}}
                placeholder="Write your custom daily coaching prompt here..."
              />
            </div>

            {/* Get Daily Coaching Button */}
            <button onClick={()=>analyze(activeLLM, activeCoachObj.id, "daily")} disabled={loading[dailyKey]}
              style={{...bFill(activeCoachObj.col),width:"100%",padding:"14px",fontSize:"13px",marginBottom:"14px",opacity:loading[dailyKey]?0.5:1,cursor:loading[dailyKey]?"wait":"pointer"}}>
              {loading[dailyKey]?"⟳ COACHING IN PROGRESS...":"▶ GET TODAY'S COACHING"}
            </button>

            {/* Today's Response */}
            {analyses[dailyKey] ? (
              <div style={{marginBottom:"14px"}}>
                <div style={{fontSize:"10px",color:activeCoachObj.col,fontWeight:"bold",letterSpacing:"2px",marginBottom:"6px"}}>
                  📅 TODAY'S COACHING ({todayDateKey})
                </div>
                <div style={{background:"#080814",border:`1px solid ${activeCoachObj.col}30`,borderRadius:"4px",padding:"14px",fontSize:"13px",lineHeight:"1.8",whiteSpace:"pre-wrap",color:C.text1,maxHeight:"600px",overflowY:"auto"}}>
                  {analyses[dailyKey]}
                </div>
              </div>
            ) : (
              <div style={{background:"#080814",border:`1px solid ${C.bord}`,borderRadius:"4px",padding:"30px",textAlign:"center",marginBottom:"14px"}}>
                <div style={{fontSize:"36px",marginBottom:"8px",opacity:0.3}}>{activeCoachObj.icon}</div>
                <div style={{fontSize:"12px",color:C.text3}}>Tap "GET TODAY'S COACHING" to receive personalized guidance</div>
                <div style={{fontSize:"10px",color:C.dim,marginTop:"4px"}}>Your prompt and response auto-save for today</div>
              </div>
            )}

            {/* Collapsible Preset Questions */}
            <div style={{borderTop:`1px solid ${C.bord}`,paddingTop:"14px"}}>
              <button onClick={()=>setShowPresets(!showPresets)}
                style={{background:"transparent",border:"none",color:C.text3,cursor:"pointer",fontSize:"10px",letterSpacing:"2px",padding:"4px 0",fontFamily:"'Courier New',monospace"}}>
                {showPresets?"▾":"▸"} PRESET QUESTIONS ({activeCoachObj.questions.length})
              </button>
              {showPresets && (
                <div style={{marginTop:"10px"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:"6px",marginBottom:"12px"}}>
                    {activeCoachObj.questions.map(q=>{
                      const qKey=`${activeCoachObj.id}_${activeLLM}_${q.id}`;
                      return (
                        <button key={q.id} onClick={()=>analyze(activeLLM,activeCoachObj.id,q.id)} disabled={loading[qKey]}
                          style={{padding:"8px 10px",background:analyses[qKey]?"#0e0e1e":"transparent",
                            border:`1px solid ${analyses[qKey]?"#4ade8060":activeCoachObj.col+"40"}`,
                            color:analyses[qKey]?"#4ade80":C.text1,cursor:loading[qKey]?"wait":"pointer",
                            fontSize:"11px",borderRadius:"3px",fontWeight:"600",fontFamily:"'Courier New',monospace",
                            textAlign:"left",opacity:loading[qKey]?0.5:1}}>
                          {loading[qKey]?"⟳ analyzing...":q.label}
                          {analyses[qKey]&&" ✓"}
                        </button>
                      );
                    })}
                  </div>
                  {activeCoachObj.questions.map(q=>{
                    const qKey=`${activeCoachObj.id}_${activeLLM}_${q.id}`;
                    if(!analyses[qKey]) return null;
                    return (
                      <div key={q.id} style={{marginBottom:"10px"}}>
                        <div style={{fontSize:"10px",color:activeCoachObj.col,fontWeight:"bold",letterSpacing:"1px",marginBottom:"4px"}}>{q.label}</div>
                        <div style={{background:"#080814",border:`1px solid ${C.bord}`,borderRadius:"3px",padding:"10px",fontSize:"11px",lineHeight:"1.7",whiteSpace:"pre-wrap",color:C.text1}}>
                          {analyses[qKey]}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div style={{...panel,marginTop:"16px"}}>
            {sectionLabel("LIVE DATA CONTEXT SENT TO AI:")}
            <pre style={{fontSize:"11px",color:C.text2,overflow:"auto",margin:0,lineHeight:"1.8"}}>{ctx()}</pre>
          </div>
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
                <div style={{width:"100%",fontSize:"11px",color:"#4ade80",marginTop:"4px"}}>✓ Values auto-filled below — tap SAVE MEASUREMENTS to confirm</div>
              </div>
            )}
          </div>

          {sectionLabel("MANUAL DATA ENTRY — OVERRIDES SENSOR DATA IN AI CONTEXT")}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(210px,1fr))",gap:"14px",marginBottom:"16px"}}>
            {GROUPS.map(g=>(
              <div key={g.id} style={{...panel,margin:0,borderColor:g.col+"40"}}>
                <div style={{fontSize:"11px",letterSpacing:"2px",color:g.col,marginBottom:"14px",fontWeight:"bold"}}>{g.name}</div>
                {g.rows.filter(r=>r.k!=="workoutType").map(r=>(
                  <div key={r.k} style={{marginBottom:"10px"}}>
                    <label style={{fontSize:"11px",color:C.text2,letterSpacing:"0.5px",display:"block",marginBottom:"4px",fontWeight:"600"}}>
                      {r.l}{r.u&&<span style={{color:C.text3,marginLeft:"4px",fontWeight:"normal"}}>({r.u})</span>}
                    </label>
                    <input type="number" placeholder={String(today[r.k]||"")}
                      value={manualDraft[r.k]||""}
                      onChange={e=>setManualDraft(p=>({...p,[r.k]:parseFloat(e.target.value)||""}))}
                      style={{...inp,width:"100%",boxSizing:"border-box"}}/>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:"10px",marginBottom:"16px"}}>
            <button onClick={()=>{setManual(p=>({...p,...manualDraft}));setManualDraft({});}} style={bFill("#00ff9d")}>💾 SAVE MEASUREMENTS</button>
            <button onClick={()=>setManualDraft({})} style={bOut(C.text3)}>CLEAR</button>
          </div>
          {Object.keys(manual).length>0 && (
            <div style={{...panel,borderColor:"#00ff9d30"}}>
              {sectionLabel("SAVED VALUES — ACTIVE IN AI CONTEXT:")}
              <div style={{display:"flex",flexWrap:"wrap",gap:"20px"}}>
                {Object.entries(manual).map(([k,v])=>{
                  const field=GROUPS.flatMap(g=>g.rows).find(r=>r.k===k);
                  return (
                    <div key={k} style={{textAlign:"center"}}>
                      <div style={{fontSize:"18px",color:"#00ff9d",fontWeight:"bold"}}>{v}{field?.u||""}</div>
                      <div style={{fontSize:"10px",color:C.text3,marginTop:"2px",letterSpacing:"1px"}}>{field?.l||k}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── API KEY MODAL */}
      {keyModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{...panel,width:"400px",maxWidth:"92vw",border:`1px solid ${C.bord2}`}}>
            <div style={{color:C.text1,fontSize:"15px",letterSpacing:"2px",fontWeight:"bold",marginBottom:"6px"}}>
              {LLMS.find(l=>l.id===keyModal)?.icon} Connect {LLMS.find(l=>l.id===keyModal)?.name}
            </div>
            <div style={{fontSize:"12px",color:C.text3,marginBottom:"18px"}}>Your key is stored locally and never shared</div>
            <label style={{fontSize:"11px",color:C.text2,display:"block",marginBottom:"6px",fontWeight:"600"}}>API KEY</label>
            <input type="password" placeholder="sk-..." value={keyDraft} onChange={e=>setKeyDraft(e.target.value)}
              style={{...inp,width:"100%",boxSizing:"border-box",marginBottom:"16px"}}/>
            <div style={{display:"flex",gap:"8px"}}>
              <button onClick={()=>{setApiKeys(p=>({...p,[keyModal]:keyDraft}));setKeyModal(null);setKeyDraft("");}} style={bFill("#00ff9d")}>SAVE & CONNECT</button>
              <button onClick={()=>{setKeyModal(null);setKeyDraft("");}} style={bOut(C.text3)}>CANCEL</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}} * { box-sizing: border-box; }`}</style>
    </div>
  );
}
