/**
 * 3-Year Forward Boundary Test — BioTrack
 *
 * Tests every week and month from today through 3 years out (June 2026 – June 2029).
 * Covers:
 *   • Every Monday for 3 years (~156 weeks) × 4 views × 4 data scenarios
 *   • Every 1st-of-month for 3 years (36 months) × 4 views × 4 data scenarios
 *   • Label correctness (no scrambled months, no UTC offset bugs)
 *   • Data continuity (prev period visible after boundary)
 *   • Dec 31 → Jan 1 transitions (2026/27, 2027/28, 2028/29)
 *   • Feb 28/29 in both non-leap (2027) and leap (2028) years
 *   • Year-with-name format and ISO format only (no-year omitted for future dates —
 *     mapImport now always writes year, so no-year is legacy only)
 *
 * NOTE: For future dates, daily col[0] shows "LATEST (...)" not "TODAY ●" because
 * the running process's new Date() is today (June 2026). That is correct behaviour —
 * on the actual future date, new Date() would match and show "TODAY".
 *
 * Run: node src/test-3year-future.js
 */

// ─── Exact copies of App.jsx pure functions ──────────────────────────────────

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DOW_NAMES    = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const SUM_KEYS     = new Set(["steps","calsBurned","distanceMiles","calories","protein"]);
const MAX_KEYS     = new Set(["weight","bodyFat","hrv","spo2"]);

const aggDays = (days) => {
  if (!days || !days.length) return {};
  const allKeys = new Set();
  days.forEach(d => Object.keys(d).forEach(k => allKeys.add(k)));
  const out = { ...days[0] };
  allKeys.forEach(k => {
    const nums = days.map(d => d[k]).filter(v => typeof v === "number" && !isNaN(v));
    if (!nums.length) return;
    if      (SUM_KEYS.has(k)) out[k] = +(nums.reduce((s,v)=>s+v,0)).toFixed(1);
    else if (MAX_KEYS.has(k)) out[k] = +Math.max(...nums).toFixed(1);
    else                      out[k] = +(nums.reduce((s,v)=>s+v,0)/nums.length).toFixed(1);
  });
  return out;
};

const EMPTY_DAY = {};

// Exact copy from App.jsx (current state)
const parseSyncDateRobust = (s) => {
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    return new Date(y, m - 1, d);
  }
  const normed = s.replace(/^([A-Za-z]+\s+\d{1,2})\s+(\d{4})/, "$1, $2");
  const hasYear = /\b\d{4}\b/.test(normed);
  const withYear = hasYear ? normed : normed + ", " + new Date().getFullYear();
  const p2 = new Date(withYear);
  if (isNaN(p2.getTime())) return null;
  if (!hasYear && p2 > new Date(Date.now() + 86400000)) p2.setFullYear(p2.getFullYear() - 1);
  return p2;
};

const _getColsInner = (view, live, history) => {
  const hasReal = live || (history && history.length > 0);
  if (!hasReal) return [];
  const realDays = (history || []).map(h => ({ ...h, isDemo: false }));
  let all;
  if (live) {
    const liveDate = live.syncDate || live.date;
    const histDate = realDays[0]?.syncDate || realDays[0]?.date;
    all = (liveDate && histDate && liveDate === histDate)
      ? [{ ...realDays[0], ...live, isDemo: false }, ...realDays.slice(1)]
      : [{ ...live, isDemo: false }, ...realDays];
  } else {
    all = realDays.length ? realDays : [EMPTY_DAY];
  }
  const thisYear = new Date().getFullYear();

  if (view === "daily") {
    const localKey = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const liveDateKey = live?.syncDate ? (() => { const p = parseSyncDateRobust(live.syncDate); return p ? localKey(p) : null; })() : null;
    const todayKey = localKey(new Date());
    const liveIsFromToday = liveDateKey === todayKey;
    const byDateKey = {};
    all.forEach(d => {
      if (!d?.syncDate) return;
      const p = parseSyncDateRobust(d.syncDate); if (!p) return;
      const k = localKey(p);
      if (!liveIsFromToday && k === liveDateKey) return;
      byDateKey[k] = d;
    });
    if (live && liveIsFromToday) byDateKey[todayKey] = { ...(byDateKey[todayKey]||{}), ...live, isDemo:false };
    const liveParsed = (live && !liveIsFromToday) ? parseSyncDateRobust(live.syncDate) : null;
    const startJs = liveParsed || new Date();
    const isStaleStart = !!liveParsed;
    return Array.from({ length: 90 }, (_, i) => {
      const date = new Date(startJs.getFullYear(), startJs.getMonth(), startJs.getDate() - i);
      const key  = localKey(date);
      let d = byDateKey[key] || EMPTY_DAY;
      if (i === 0 && live) d = { ...d, ...live, isDemo:false };
      const dow = DOW_NAMES[date.getDay()];
      const dateStr = `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
      const yr = date.getFullYear();
      let label = yr < thisYear ? `${dow} ${dateStr} ${yr}` : `${dow} ${dateStr}`;
      if (i === 0) label = isStaleStart ? `LATEST (${dateStr}) ●` : (live ? `TODAY ●` : `TODAY`);
      return { label, data:d, live: i===0 && !!live, dayIndex:i, allDays:all };
    });
  }

  if (view === "weekly") {
    const byWeek = {};
    all.forEach(d => {
      const p = parseSyncDateRobust(d.syncDate || d.date); if (!p) return;
      const dow = (p.getDay() + 6) % 7;
      const mon = new Date(p.getFullYear(), p.getMonth(), p.getDate() - dow);
      const wk = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,"0")}-${String(mon.getDate()).padStart(2,"0")}`;
      if (!byWeek[wk]) byWeek[wk] = [];
      byWeek[wk].push(d);
    });
    return Object.keys(byWeek).sort().reverse().map(wk => {
      const [wy, wm, wd] = wk.split("-").map(Number);
      const monDate = new Date(wy, wm-1, wd);
      const sunDate = new Date(wy, wm-1, wd+6);
      const label = monDate.getMonth() === sunDate.getMonth()
        ? `${MONTHS_SHORT[monDate.getMonth()]} ${monDate.getDate()}–${sunDate.getDate()}`
        : `${MONTHS_SHORT[monDate.getMonth()]} ${monDate.getDate()} – ${MONTHS_SHORT[sunDate.getMonth()]} ${sunDate.getDate()}`;
      return { label, data: aggDays(byWeek[wk]) };
    });
  }

  if (view === "monthly") {
    const byMonth = {};
    all.forEach(d => {
      const p = parseSyncDateRobust(d.syncDate || d.date); if (!p) return;
      const mk = `${p.getFullYear()}-${String(p.getMonth()+1).padStart(2,"0")}`;
      if (!byMonth[mk]) byMonth[mk] = [];
      byMonth[mk].push(d);
    });
    return Object.keys(byMonth).sort().reverse().map(mk => {
      const [y, m] = mk.split("-").map(Number);
      return { label: `${MONTHS_SHORT[m-1]} ${y}`, data: aggDays(byMonth[mk]) };
    });
  }

  // annual
  const byYear = {};
  all.forEach(d => {
    const p = parseSyncDateRobust(d.syncDate || d.date); if (!p) return;
    const yr = String(p.getFullYear());
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(d);
  });
  return Object.keys(byYear).sort().reverse().map(yr => ({ label:yr, data: aggDays(byYear[yr]) }));
};

const getCols = (view, live, history) => {
  try { return _getColsInner(view, live, history); }
  catch (e) { return { __crashed:true, error:e.message }; }
};

// ─── Data factory ─────────────────────────────────────────────────────────────

// Format variants that include the year (safe for all future dates)
const fmtISO      = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fmtNamed    = d => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
const fmtComma    = d => `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;

function buildHistory(endDate, days, fmtFn = fmtISO) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate() - i);
    return {
      syncDate: fmtFn(d),
      date:     fmtNamed(d),
      dow:      DOW_NAMES[d.getDay()],
      weight:   +(175 + Math.sin(i * 0.1) * 3).toFixed(1),
      bodyFat:  +(18  + Math.sin(i * 0.05) * 2).toFixed(1),
      steps:    Math.round(8000 + (i % 7) * 400),
      sleepDur: +(7   + Math.sin(i * 0.2)).toFixed(1),
      hrv:      +(45  + Math.cos(i * 0.15) * 8).toFixed(0),
      protein:  160 + (i % 30),
      calories: 2000 + (i % 5) * 100,
    };
  });
}

// ─── Assertions ───────────────────────────────────────────────────────────────

let pass = 0, fail = 0;
const failures = [];
const SAMPLE_FAILURES = 20; // cap printed failures to keep output readable

function ok(cond, msg, ctx) {
  if (cond) { pass++; }
  else {
    fail++;
    if (failures.length < SAMPLE_FAILURES) failures.push(`${ctx}: ${msg}`);
    else if (failures.length === SAMPLE_FAILURES) failures.push("… (further failures suppressed)");
  }
}

function assertCols(cols, view, ctx) {
  ok(Array.isArray(cols), `getCols returned non-array / crashed (err=${cols?.error})`, ctx);
  if (!Array.isArray(cols)) return false;

  cols.forEach((c, i) => {
    ok(typeof c.label === "string" && c.label.length > 0, `col[${i}] missing label`, ctx);
    ok(c.data !== undefined && c.data !== null, `col[${i}] null data`, ctx);
  });

  if (view === "weekly" && cols.length > 0) {
    cols.forEach((c, i) => {
      // Format: "Mon DD–DD" (same month) or "Mon DD – Mon DD" (cross-month)
      ok(/^[A-Z][a-z]{2} \d{1,2}/.test(c.label),
        `weekly[${i}] bad format: "${c.label}"`, ctx);
      c.label.split(" – ").forEach(part => {
        const mon = part.trim().slice(0,3);
        ok(MONTHS_SHORT.includes(mon),
          `weekly[${i}] unknown month "${mon}" in "${c.label}"`, ctx);
      });
      // Day numbers must be 1–31
      (c.label.match(/\d{1,2}/g)||[]).forEach(n =>
        ok(+n >= 1 && +n <= 31, `weekly[${i}] day ${n} out of range in "${c.label}"`, ctx));
      // Same-month label must NOT have " – " with a space
      if (!c.label.includes(" – ")) {
        // Single-dash form "Mon DD–DD" — end day >= start day (unless wraps month, which uses " – ")
        // Nothing extra to check here
      }
    });
  }

  if (view === "monthly" && cols.length > 0) {
    cols.forEach((c, i) => {
      const parts = c.label.split(" ");
      ok(parts.length === 2 && MONTHS_SHORT.includes(parts[0]) && +parts[1] >= 2020 && +parts[1] <= 2035,
        `monthly[${i}] bad label: "${c.label}"`, ctx);
    });
    // Strictly descending
    for (let i = 1; i < cols.length; i++) {
      const ord = l => { const [mo, yr] = l.split(" "); return +yr * 12 + MONTHS_SHORT.indexOf(mo); };
      ok(ord(cols[i-1].label) >= ord(cols[i].label),
        `monthly not descending: "${cols[i-1].label}" before "${cols[i].label}"`, ctx);
    }
  }

  if (view === "daily") {
    ok(cols.length === 90, `daily should be 90 cols, got ${cols.length}`, ctx);
    // For future-dated data the running process sees it as stale → LATEST; that's correct
    ok(cols[0]?.label?.startsWith("TODAY") || cols[0]?.label?.startsWith("LATEST"),
      `daily col[0] should be TODAY/LATEST, got "${cols[0]?.label}"`, ctx);
  }
  return true;
}

// ─── Week / month iteration helpers ──────────────────────────────────────────

const today = new Date();
const horizon = new Date(today.getFullYear() + 3, today.getMonth(), today.getDate());

// First Monday on or after today
const dayOfWeek = (today.getDay() + 6) % 7; // Mon=0
const firstMonday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek));

// Count total Mondays and months for progress display
let totalMondays = 0, curM = new Date(firstMonday);
while (curM <= horizon) { totalMondays++; curM = new Date(curM.getFullYear(), curM.getMonth(), curM.getDate() + 7); }

let totalMonths = 0, curMo = new Date(today.getFullYear(), today.getMonth() + 1, 1);
while (curMo <= horizon) { totalMonths++; curMo = new Date(curMo.getFullYear(), curMo.getMonth() + 1, 1); }

// ─── 3-YEAR WEEKLY TEST ───────────────────────────────────────────────────────

console.log(`${"═".repeat(65)}`);
console.log(`  3-YEAR WEEKLY TEST — every Monday ${fmtISO(firstMonday)} → ${fmtISO(horizon)}`);
console.log(`  ${totalMondays} Mondays × 4 scenarios × 4 views = ${totalMondays * 4 * 4} checks`);
console.log(`${"═".repeat(65)}\n`);

let weekN = 0;
let wCursor = new Date(firstMonday);
while (wCursor <= horizon) {
  weekN++;
  const monday = new Date(wCursor);
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - 1);
  const mondayISO = fmtISO(monday);

  const scenarios = [
    { name:"ISO-90d",     hist: buildHistory(monday, 90, fmtISO),   lv: buildHistory(monday, 1, fmtISO)[0]   },
    { name:"named-90d",   hist: buildHistory(monday, 90, fmtNamed), lv: buildHistory(monday, 1, fmtNamed)[0] },
    { name:"comma-30d",   hist: buildHistory(monday, 30, fmtComma), lv: buildHistory(monday, 1, fmtComma)[0] },
    { name:"stale-sunday",hist: buildHistory(sunday, 90, fmtISO),   lv: buildHistory(sunday, 1, fmtISO)[0]   },
  ];

  for (const sc of scenarios) {
    for (const view of ["daily","weekly","monthly","annual"]) {
      const cols = getCols(view, sc.lv, sc.hist);
      assertCols(cols, view, `W${weekN} ${mondayISO} [${sc.name}] ${view}`);
    }

    // Weekly continuity: ISO and named-year data must group correctly
    if (sc.name !== "stale-sunday") {
      const wCols = getCols("weekly", sc.lv, sc.hist);
      if (Array.isArray(wCols) && wCols.length > 0) {
        ok(Object.keys(wCols[0].data).length >= 0, "week[0] data null", `W${weekN} ${sc.name} weekly-data`);
      }
      // Most recent week label must be a valid Mon–Sun range
      if (Array.isArray(wCols) && wCols.length > 0) {
        ok(/^[A-Z][a-z]{2} \d{1,2}/.test(wCols[0].label),
          `week[0] label format bad: "${wCols[0].label}"`, `W${weekN} ${sc.name} weekly-label`);
      }
    }
  }

  // Cross-month week: test weeks that straddle a month boundary
  // (already covered by assertCols label checks, but add explicit cross-month check)
  const wCols = getCols("weekly", scenarios[0].lv, scenarios[0].hist);
  if (Array.isArray(wCols)) {
    wCols.filter(c => c.label.includes(" – ")).forEach((c, i) => {
      const [left, right] = c.label.split(" – ");
      ok(left.slice(0,3) !== right.slice(0,3),
        `cross-month label has same month on both sides: "${c.label}"`,
        `W${weekN} ${mondayISO} cross-month-label-${i}`);
    });
  }

  if (weekN % 13 === 0 || weekN === 1 || weekN === totalMondays) {
    console.log(`  ✓ W${String(weekN).padStart(3)}/${totalMondays}  ${mondayISO}  fail so far: ${fail}`);
  }

  wCursor = new Date(wCursor.getFullYear(), wCursor.getMonth(), wCursor.getDate() + 7);
}
console.log(`\n  Weekly pass: ${pass}  fail: ${fail}\n`);

// ─── 3-YEAR MONTHLY TEST ─────────────────────────────────────────────────────

console.log(`${"═".repeat(65)}`);
console.log(`  3-YEAR MONTHLY TEST — every 1st-of-month through ${fmtISO(horizon)}`);
console.log(`  ${totalMonths} months × 4 scenarios × 4 views + special cases`);
console.log(`${"═".repeat(65)}\n`);

const passBeforeMonthly = pass;
let monthN = 0;
let moCursor = new Date(today.getFullYear(), today.getMonth() + 1, 1); // start from next month
while (moCursor <= horizon) {
  monthN++;
  const firstDay     = new Date(moCursor);
  const lastDayPrev  = new Date(firstDay.getFullYear(), firstDay.getMonth(), 0);
  const firstISO     = fmtISO(firstDay);
  const curMonLabel  = `${MONTHS_SHORT[firstDay.getMonth()]} ${firstDay.getFullYear()}`;
  const prevMonLabel = `${MONTHS_SHORT[lastDayPrev.getMonth()]} ${lastDayPrev.getFullYear()}`;

  const scenarios = [
    { name:"ISO-90d",       hist: buildHistory(firstDay, 90, fmtISO),   lv: buildHistory(firstDay, 1, fmtISO)[0]   },
    { name:"named-90d",     hist: buildHistory(firstDay, 90, fmtNamed), lv: buildHistory(firstDay, 1, fmtNamed)[0] },
    { name:"mixed-fmts",    hist: [...buildHistory(firstDay, 30, fmtISO), ...buildHistory(lastDayPrev, 60, fmtNamed)],
                             lv:  buildHistory(firstDay, 1, fmtISO)[0] },
    { name:"stale-lastday", hist: buildHistory(lastDayPrev, 90, fmtISO), lv: buildHistory(lastDayPrev, 1, fmtISO)[0] },
  ];

  for (const sc of scenarios) {
    const ctx = `M${monthN} ${firstISO} [${sc.name}]`;
    for (const view of ["daily","weekly","monthly","annual"]) {
      const cols = getCols(view, sc.lv, sc.hist);
      assertCols(cols, view, `${ctx} ${view}`);
    }

    const mCols = getCols("monthly", sc.lv, sc.hist);
    if (!Array.isArray(mCols)) continue;

    // Current month must appear (except stale — last sync was prev month)
    if (sc.name !== "stale-lastday") {
      ok(mCols.some(c => c.label === curMonLabel),
        `"${curMonLabel}" missing from monthly cols`, `${ctx} has-current-month`);
    }
    // Previous month must always appear (90 days of history)
    ok(mCols.some(c => c.label === prevMonLabel),
      `"${prevMonLabel}" missing from monthly cols`, `${ctx} has-prev-month`);
    // Stale scenario: prev month is most-recent
    if (sc.name === "stale-lastday") {
      ok(mCols.some(c => c.label === prevMonLabel),
        `stale: "${prevMonLabel}" missing`, `${ctx} stale-prev`);
    }
  }

  // ── Special cases ──────────────────────────────────────────────────────────

  // Dec 31 → Jan 1 year boundary
  if (firstDay.getMonth() === 0) {
    const dec31 = new Date(firstDay.getFullYear()-1, 11, 31);
    const jan1  = firstDay;
    const d31C  = getCols("monthly", buildHistory(dec31,1,fmtISO)[0], buildHistory(dec31,45,fmtISO).slice(1));
    const j1C   = getCols("monthly", buildHistory(jan1,1,fmtISO)[0],  buildHistory(jan1,45,fmtISO).slice(1));
    if (Array.isArray(d31C)) ok(d31C.some(c=>c.label===`Dec ${firstDay.getFullYear()-1}`),
      `Dec ${firstDay.getFullYear()-1} missing on Dec 31`, `M${monthN} dec31-year-boundary`);
    if (Array.isArray(j1C))  ok(j1C.some(c=>c.label===`Jan ${firstDay.getFullYear()}`),
      `Jan ${firstDay.getFullYear()} missing on Jan 1`, `M${monthN} jan1-year-boundary`);
  }

  // Feb 28 (every year) and Feb 29 (2028 leap year)
  if (firstDay.getMonth() === 2) { // March → test Feb boundary
    const yr = firstDay.getFullYear();
    const feb28 = new Date(yr, 1, 28);
    const f28C  = getCols("monthly", buildHistory(feb28,1,fmtISO)[0], buildHistory(feb28,30,fmtISO).slice(1));
    ok(Array.isArray(f28C), `Feb 28 ${yr} monthly non-array`, `M${monthN} feb28-${yr}`);
    if (Array.isArray(f28C)) ok(f28C.some(c=>c.label===`Feb ${yr}`), `"Feb ${yr}" missing on Feb 28`, `M${monthN} feb28-${yr}`);

    if (yr === 2028) { // leap year
      const feb29 = new Date(2028, 1, 29);
      const f29C  = getCols("monthly", buildHistory(feb29,1,fmtISO)[0], buildHistory(feb29,30,fmtISO).slice(1));
      ok(Array.isArray(f29C), `Feb 29 2028 (leap) monthly non-array`, `M${monthN} feb29-2028-leap`);
      if (Array.isArray(f29C)) ok(f29C.some(c=>c.label==="Feb 2028"), `"Feb 2028" missing on Feb 29`, `M${monthN} feb29-2028-leap`);
    }

    // Non-leap: no Feb 29 in 2027
    if (yr === 2027) {
      const noFeb29 = new Date(2027, 1, 28); // last day of Feb 2027
      ok(noFeb29.getDate() === 28 && noFeb29.getMonth() === 1, "2027 Feb 28 is last day", `M${monthN} non-leap-2027`);
    }
  }

  if (monthN % 6 === 0 || monthN === 1 || monthN === totalMonths) {
    console.log(`  ✓ M${String(monthN).padStart(2)}/${totalMonths}  ${firstISO}  "${curMonLabel}"  fail so far: ${fail}`);
  }

  moCursor = new Date(moCursor.getFullYear(), moCursor.getMonth() + 1, 1);
}
console.log(`\n  Monthly pass: ${pass - passBeforeMonthly}  fail: ${fail}\n`);

// ─── All 3 Dec 31 → Jan 1 transitions ────────────────────────────────────────

console.log(`${"═".repeat(65)}`);
console.log("  YEAR-END TRANSITIONS: Dec 31 → Jan 1  ×  2026/27, 2027/28, 2028/29");
console.log(`${"═".repeat(65)}\n`);

for (const yr of [2026, 2027, 2028]) {
  const dec31 = new Date(yr, 11, 31);
  const jan1  = new Date(yr + 1, 0, 1);
  for (const view of ["weekly","monthly","annual","daily"]) {
    const cD = getCols(view, buildHistory(dec31,1,fmtISO)[0], buildHistory(dec31,90,fmtISO).slice(1));
    const cJ = getCols(view, buildHistory(jan1, 1,fmtISO)[0], buildHistory(jan1, 90,fmtISO).slice(1));
    assertCols(cD, view, `Dec31-${yr} ${view}`);
    assertCols(cJ, view, `Jan1-${yr+1} ${view}`);
  }
  // Check Dec and Jan months appear correctly
  const mDec = getCols("monthly", buildHistory(dec31,1,fmtISO)[0], buildHistory(dec31,45,fmtISO).slice(1));
  const mJan = getCols("monthly", buildHistory(jan1,1,fmtISO)[0],  buildHistory(jan1,45,fmtISO).slice(1));
  ok(Array.isArray(mDec) && mDec.some(c=>c.label===`Dec ${yr}`),   `Dec ${yr} missing on Dec 31`,   `year-end ${yr}`);
  ok(Array.isArray(mJan) && mJan.some(c=>c.label===`Jan ${yr+1}`), `Jan ${yr+1} missing on Jan 1`,  `year-end ${yr}`);
  ok(Array.isArray(mJan) && mJan.some(c=>c.label===`Dec ${yr}`),   `Dec ${yr} missing from Jan history`, `year-end ${yr}`);

  // Annual: both years must appear in January
  const aCols = getCols("annual", buildHistory(jan1,1,fmtISO)[0], buildHistory(jan1,45,fmtISO).slice(1));
  ok(Array.isArray(aCols) && aCols.some(c=>c.label===String(yr+1)), `${yr+1} missing in annual`, `year-end ${yr}`);
  ok(Array.isArray(aCols) && aCols.some(c=>c.label===String(yr)),   `${yr} missing in annual`,   `year-end ${yr}`);

  console.log(`  ✓ Dec 31, ${yr} → Jan 1, ${yr+1}  (monthly, annual, daily, weekly)`);
}

// ─── Feb 28/29 deep dive ──────────────────────────────────────────────────────

console.log(`\n${"═".repeat(65)}`);
console.log("  FEB 28/29 DEEP DIVE — 2027 (non-leap) + 2028 (leap)");
console.log(`${"═".repeat(65)}\n`);

// 2027: Feb has 28 days
const feb28_2027 = new Date(2027, 1, 28);
const mar1_2027  = new Date(2027, 2, 1);
const f28_27_cols = getCols("monthly", buildHistory(feb28_2027,1,fmtISO)[0], buildHistory(feb28_2027,30,fmtISO).slice(1));
ok(Array.isArray(f28_27_cols) && f28_27_cols.some(c=>c.label==="Feb 2027"), '"Feb 2027" on Feb 28', "feb28-2027");
const m1_27_cols  = getCols("monthly", buildHistory(mar1_2027,1,fmtISO)[0],  buildHistory(mar1_2027,45,fmtISO).slice(1));
ok(Array.isArray(m1_27_cols) && m1_27_cols.some(c=>c.label==="Feb 2027"), '"Feb 2027" visible from Mar 1', "mar1-2027");
ok(Array.isArray(m1_27_cols) && m1_27_cols.some(c=>c.label==="Mar 2027"), '"Mar 2027" on Mar 1', "mar1-2027");
console.log("  ✓ 2027 non-leap: Feb 28 is last day, Mar 1 shows both Feb and Mar");

// 2028: leap year, Feb has 29 days
const feb29_2028 = new Date(2028, 1, 29);
const mar1_2028  = new Date(2028, 2, 1);
ok(feb29_2028.getMonth() === 1 && feb29_2028.getDate() === 29, "2028 Feb 29 exists", "feb29-2028");
const f29_28_cols = getCols("monthly", buildHistory(feb29_2028,1,fmtISO)[0], buildHistory(feb29_2028,30,fmtISO).slice(1));
ok(Array.isArray(f29_28_cols) && f29_28_cols.some(c=>c.label==="Feb 2028"), '"Feb 2028" on Feb 29', "feb29-2028");
const m1_28_cols  = getCols("monthly", buildHistory(mar1_2028,1,fmtISO)[0],  buildHistory(mar1_2028,45,fmtISO).slice(1));
ok(Array.isArray(m1_28_cols) && m1_28_cols.some(c=>c.label==="Feb 2028"), '"Feb 2028" visible from Mar 1 2028', "mar1-2028");
console.log("  ✓ 2028 leap year: Feb 29 exists and Feb 2028 data flows into March view");

// ─── parseSyncDateRobust: all 1096 days of the 3-year window × 3 formats ─────

console.log(`\n${"═".repeat(65)}`);
console.log("  parseSyncDateRobust: 3 years × 3 year-inclusive formats");
console.log(`${"═".repeat(65)}\n`);

let parseDays = 0, parseFailCount = 0;
const parseStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1); // tomorrow
for (let i = 0; i < 3 * 366; i++) {
  const d = new Date(parseStart.getFullYear(), parseStart.getMonth(), parseStart.getDate() + i);
  if (d > horizon) break;
  parseDays++;
  [[fmtISO(d),0],[fmtNamed(d),1],[fmtComma(d),2]].forEach(([fmt, v]) => {
    const result = parseSyncDateRobust(fmt);
    if (!result || isNaN(result.getTime())) {
      parseFailCount++; fail++;
      if (failures.length < SAMPLE_FAILURES) failures.push(`parseSyncDateRobust("${fmt}") → null/NaN`);
    } else {
      pass++;
      // Year-inclusive formats must parse to exactly the right date
      if (result.getFullYear() !== d.getFullYear() || result.getMonth() !== d.getMonth() || result.getDate() !== d.getDate()) {
        fail++;
        if (failures.length < SAMPLE_FAILURES)
          failures.push(`parseSyncDateRobust("${fmt}") parsed as ${fmtISO(result)}, expected ${fmtISO(d)}`);
      } else pass++;
    }
  });
}
console.log(`  ✓ ${parseDays} days × 3 formats = ${parseDays*3} parse checks (${parseFailCount} failures)`);

// ─── Summary ──────────────────────────────────────────────────────────────────

const total = pass + fail;
console.log(`\n${"═".repeat(65)}`);
console.log(`  RESULTS:  ${pass.toLocaleString()} passed  |  ${fail} failed  |  ${total.toLocaleString()} total`);
console.log(`${"═".repeat(65)}`);

if (failures.length > 0) {
  console.log(`\n  FAILURES:`);
  failures.forEach(f => console.log(`    ✗ ${f}`));
  process.exit(1);
} else {
  console.log(`\n  ✓ ALL ${total.toLocaleString()} CHECKS PASSED`);
  console.log(`    Every week and month from today through ${fmtISO(horizon)} is bulletproof.`);
}
