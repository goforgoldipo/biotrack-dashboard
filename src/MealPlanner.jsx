import { useState, useEffect, useRef, useCallback } from "react";

const VOTES_KEY = "biotrack-meal-votes-v1";
const GOALS_KEY = "biotrack-meal-goals-v1";
const PLANS_KEY = "biotrack-meal-plans-v1";

const TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const TYPE_EMOJI = { Breakfast: "☀️", Lunch: "🌤️", Dinner: "🌙", Snack: "🍎" };
const TYPE_COLOR = { Breakfast: "#f59e0b", Lunch: "#10b981", Dinner: "#6366f1", Snack: "#f43f5e" };

const C = {
  bg: "#07070e", panel: "#0d0d1a", surf: "#12121f", surf2: "#1a1a2e",
  bord: "#1e1e3a", bord2: "#2a2a4a", text1: "#e2e2f0", text2: "#a0a0b8", text3: "#606078",
  green: "#00ff9d", blue: "#00b8ff",
};

const STOP_WORDS = new Set(['and','with','the','a','an','in','of','on','for','or','low','high','carb','fat','balanced','style','vegan','vegetarian','easy','quick','simple','homemade','baked','fried','grilled','roasted','fresh','creamy','spicy','sweet','crispy','stuffed','loaded','healthy']);

function getDriveImageUrl(driveId) {
  return `https://drive.google.com/thumbnail?id=${driveId}&sz=w500-h500`;
}

function getFallbackImageUrl(recipe) {
  const keywords = recipe.name.toLowerCase()
    .replace(/[()'"]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))
    .slice(0, 2)
    .join(',');
  const query = keywords || recipe.types[0].toLowerCase();
  return `https://loremflickr.com/500/500/food,${encodeURIComponent(query)}`;
}

function getImageUrl(recipe) {
  return recipe.driveId ? getDriveImageUrl(recipe.driveId) : getFallbackImageUrl(recipe);
}

function hashColor(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  const colors = ["#1e3a5f","#1a3d2e","#3d1a2e","#2e1a3d","#3d2e1a","#1a2e3d","#3a1e1e"];
  return colors[Math.abs(h) % colors.length];
}

function loadJSON(key, def) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; } catch { return def; }
}
function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

function scoreRecipe(recipe, votes, goals, remainingMacros) {
  const v = votes[recipe.id] || { up: 0, down: 0 };
  const total = v.up + v.down;
  const voteScore = total === 0 ? 0 : (v.up - v.down) / total;

  let macroScore = 0;
  if (goals && remainingMacros) {
    const calFit = remainingMacros.calories > 0
      ? Math.max(0, 1 - Math.abs(recipe.calories - remainingMacros.calories * 0.3) / (remainingMacros.calories * 0.3))
      : 0;
    const protFit = remainingMacros.protein > 0
      ? Math.max(0, 1 - Math.abs(recipe.protein - remainingMacros.protein * 0.3) / (remainingMacros.protein * 0.3))
      : 0;
    macroScore = (calFit + protFit) / 2;
  }

  const freshBonus = total === 0 ? 0.1 : 0;
  return voteScore * 0.5 + macroScore * 0.4 + freshBonus + Math.random() * 0.05;
}

function buildQueue(allRecipes, mealType, votes, goals, remainingMacros, swipedIds) {
  const candidates = allRecipes.filter(r =>
    r.types.includes(mealType) &&
    !swipedIds[r.id] &&
    (votes[r.id]?.down || 0) < 2
  );
  return [...candidates]
    .map(r => ({ r, s: scoreRecipe(r, votes, goals, remainingMacros) }))
    .sort((a, b) => b.s - a.s)
    .map(x => x.r);
}

function MacroBar({ label, val, goal, color }) {
  const pct = goal > 0 ? Math.min(100, Math.round((val / goal) * 100)) : 0;
  return (
    <div style={{ flex: 1, minWidth: 60 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.text3, marginBottom: 3 }}>
        <span>{label}</span>
        <span style={{ color: pct >= 95 ? C.green : C.text2 }}>{val}{label === "CAL" ? "" : "g"}</span>
      </div>
      <div style={{ height: 4, background: C.surf2, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 2, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 9, color: C.text3, marginTop: 2, textAlign: "right" }}>/ {goal}{label === "CAL" ? "" : "g"}</div>
    </div>
  );
}

function RecipeModal({ recipe, onClose, onYes, onNo }) {
  if (!recipe) return null;
  const typeColor = TYPE_COLOR[recipe.types[0]] || "#a0a0b8";
  const [modalImgSrc, setModalImgSrc] = useState(() => getImageUrl(recipe));
  const [modalImgFailed, setModalImgFailed] = useState(false);
  const handleModalImgError = () => {
    if (recipe.driveId && modalImgSrc === getDriveImageUrl(recipe.driveId)) {
      setModalImgSrc(getFallbackImageUrl(recipe));
    } else {
      setModalImgFailed(true);
    }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div style={{ background: C.panel, border: `1px solid ${C.bord2}`, borderRadius: 12, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>
        {/* Hero image */}
        <div style={{ height: 200, background: hashColor(recipe.name), position: "relative", overflow: "hidden", borderRadius: "12px 12px 0 0" }}>
          {!modalImgFailed && (
            <img src={modalImgSrc} alt={recipe.name} onError={handleModalImgError}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          )}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80, background: "linear-gradient(transparent, rgba(0,0,0,0.8))" }} />
          <button onClick={onClose} style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", cursor: "pointer", fontSize: 18, width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: 1.5, color: typeColor, fontWeight: 700, marginBottom: 6 }}>
              {recipe.types.map(t => `${TYPE_EMOJI[t] || "🍽️"} ${t.toUpperCase()}`).join(" · ")}
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text1, lineHeight: 1.3 }}>{recipe.name}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 20, padding: 4, marginLeft: 8 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[["CAL", recipe.calories, ""], ["PRO", recipe.protein, "g"], ["FAT", recipe.fat, "g"], ["CARB", recipe.carbs, "g"]].map(([l, v, u]) => (
            <div key={l} style={{ background: C.surf, border: `1px solid ${C.bord}`, borderRadius: 6, padding: "6px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.text3, letterSpacing: 1 }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.text1 }}>{v}{u}</div>
            </div>
          ))}
          {recipe.prepTime && (
            <div style={{ background: C.surf, border: `1px solid ${C.bord}`, borderRadius: 6, padding: "6px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.text3, letterSpacing: 1 }}>PREP</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: C.text2 }}>{recipe.prepTime.replace(/minutes?/i, "min")}</div>
            </div>
          )}
        </div>

        {recipe.ingredients && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: C.text3, letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>INGREDIENTS</div>
            <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.8, whiteSpace: "pre-line" }}>{recipe.ingredients}</div>
          </div>
        )}

        {recipe.recipe && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: C.text3, letterSpacing: 1.5, marginBottom: 8, fontWeight: 700 }}>INSTRUCTIONS</div>
            <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.8 }}>{recipe.recipe}</div>
          </div>
        )}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button onClick={onNo} style={{ flex: 1, padding: "12px", background: "#ff6b3510", border: "1px solid #ff6b3540", borderRadius: 8, color: "#ff6b35", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            👎 Skip
          </button>
          <button onClick={onYes} style={{ flex: 1, padding: "12px", background: `${C.green}15`, border: `1px solid ${C.green}50`, borderRadius: 8, color: C.green, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
            ✓ Add to Plan
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}

function SwipeCard({ recipe, votes, onSwipe, onExpand, typeColor }) {
  const cardRef = useRef(null);
  const startX = useRef(null);
  const currentX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [deciding, setDeciding] = useState(null);

  const applySwipe = useCallback((dir) => {
    const target = dir === "yes" ? 600 : -600;
    setOffset(target);
    setTimeout(() => {
      setOffset(0);
      setDeciding(null);
      onSwipe(dir);
    }, 300);
  }, [onSwipe]);

  const handlePointerDown = (e) => {
    startX.current = e.clientX ?? e.touches?.[0]?.clientX;
    currentX.current = 0;
  };

  const handlePointerMove = (e) => {
    if (startX.current === null) return;
    const x = (e.clientX ?? e.touches?.[0]?.clientX) - startX.current;
    currentX.current = x;
    setOffset(x);
    setDeciding(x > 40 ? "yes" : x < -40 ? "no" : null);
  };

  const handlePointerUp = () => {
    if (startX.current === null) return;
    startX.current = null;
    const x = currentX.current;
    if (x > 80) applySwipe("yes");
    else if (x < -80) applySwipe("no");
    else { setOffset(0); setDeciding(null); }
  };

  const rotation = offset * 0.06;
  const yesOpacity = Math.min(1, Math.max(0, offset / 120));
  const noOpacity = Math.min(1, Math.max(0, -offset / 120));

  const [imgSrc, setImgSrc] = useState(() => getImageUrl(recipe));
  const [imgFailed, setImgFailed] = useState(false);

  const handleImgError = () => {
    if (recipe.driveId && imgSrc === getDriveImageUrl(recipe.driveId)) {
      setImgSrc(getFallbackImageUrl(recipe));
    } else {
      setImgFailed(true);
    }
  };

  if (!recipe) return null;

  return (
    <div
      ref={cardRef}
      style={{
        position: "absolute", width: "100%",
        transform: `translateX(${offset}px) rotate(${rotation}deg)`,
        transition: Math.abs(offset) > 100 && startX.current === null ? "transform 0.3s ease-out" : "none",
        cursor: "grab", userSelect: "none", touchAction: "pan-y",
      }}
      onMouseDown={handlePointerDown}
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchStart={handlePointerDown}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      <div style={{
        background: C.panel, border: `1px solid ${C.bord2}`, borderRadius: 16,
        overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        display: "flex", flexDirection: "column", height: 420,
      }}>
        {/* HEADER: Title + Macros row */}
        <div style={{ padding: "14px 20px 12px", borderBottom: `1px solid ${C.bord}`, background: C.surf, flexShrink: 0 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.text1, lineHeight: 1.25, marginBottom: 10 }}>
            {recipe.name}
          </div>
          <div style={{ display: "flex", gap: 28, alignItems: "flex-end" }}>
            {[
              { l: "CALORIES", v: recipe.calories, u: "",  c: "#f59e0b" },
              { l: "PROTEIN",  v: recipe.protein,  u: "g", c: "#10b981" },
              { l: "FAT",      v: recipe.fat,       u: "g", c: "#f97316" },
              { l: "CARBS",    v: recipe.carbs,     u: "g", c: "#6366f1" },
            ].map(({ l, v, u, c }) => (
              <div key={l}>
                <div style={{ fontSize: 9, color: C.text3, letterSpacing: 1.5, fontWeight: 700, marginBottom: 1 }}>{l}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c, lineHeight: 1 }}>{v}<span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{u}</span></div>
              </div>
            ))}
            {recipe.prepTime && (
              <div>
                <div style={{ fontSize: 9, color: C.text3, letterSpacing: 1.5, fontWeight: 700, marginBottom: 1 }}>PREP</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.text2, lineHeight: 1 }}>
                  {recipe.prepTime.replace(/ready in:?\s*/i, "").replace(/minutes?/i, "min").trim()}
                </div>
              </div>
            )}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              {(() => {
                const v = (votes || {})[recipe.id] || { up: 0, down: 0 };
                return (v.up > 0 || v.down > 0) ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {v.up   > 0 && <span style={{ fontSize: 11, color: C.green,    fontWeight: 700 }}>👍 {v.up}</span>}
                    {v.down > 0 && <span style={{ fontSize: 11, color: "#ff6b35", fontWeight: 700 }}>👎 {v.down}</span>}
                  </div>
                ) : null;
              })()}
              {recipe.types.slice(0, 1).map(t => (
                <span key={t} style={{
                  background: `${TYPE_COLOR[t] || "#666"}30`, color: TYPE_COLOR[t] || C.text2,
                  fontSize: 10, fontWeight: 700, letterSpacing: 0.8,
                  padding: "3px 10px", borderRadius: 20, border: `1px solid ${TYPE_COLOR[t] || "#666"}50`,
                }}>
                  {TYPE_EMOJI[t]} {t.toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* BODY: 3 columns */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

          {/* COL 1: Photo */}
          <div style={{ width: "32%", flexShrink: 0, position: "relative", background: hashColor(recipe.name) }}>
            {!imgFailed && (
              <img src={imgSrc} alt={recipe.name} onError={handleImgError}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            )}
            {imgFailed && (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, opacity: 0.25 }}>🍽️</div>
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.4) 0%, transparent 40%)" }} />
            <div style={{ position: "absolute", inset: 0, background: `${C.green}50`, opacity: yesOpacity, transition: "opacity 0.1s", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 80, filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.6))" }}>✓</div>
            </div>
            <div style={{ position: "absolute", inset: 0, background: "#ff6b3550", opacity: noOpacity, transition: "opacity 0.1s", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 80, filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.6))" }}>✕</div>
            </div>
          </div>

          {/* COL 2: Prep + Ingredients */}
          <div style={{
            width: 260, flexShrink: 0, padding: "14px 16px",
            display: "flex", flexDirection: "column", overflow: "hidden",
            borderLeft: `1px solid ${C.bord}`, borderRight: `1px solid ${C.bord}`,
          }}>
            {recipe.prepTime && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, color: C.text3, letterSpacing: 1.5, fontWeight: 700, marginBottom: 3 }}>PREP TIME</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>⏱ {recipe.prepTime.replace(/minutes?/i, "min")}</div>
              </div>
            )}
            <div style={{ height: 1, background: C.bord, marginBottom: 12 }} />
            {recipe.ingredients && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <div style={{ fontSize: 9, color: C.text3, letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>INGREDIENTS</div>
                <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.65 }}>
                  {recipe.ingredients}
                </div>
              </div>
            )}
          </div>

          {/* COL 3: Recipe steps */}
          <div style={{ flex: 1, padding: "14px 16px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ fontSize: 9, color: C.text3, letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>RECIPE</div>
            {recipe.recipe && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.7 }}>
                  {recipe.recipe}
                </div>
              </div>
            )}
            <div style={{ paddingTop: 10, flexShrink: 0 }}>
              <div style={{ fontSize: 9, color: C.text3, marginBottom: 6, textAlign: "right" }}>{recipe.source}</div>
              <button
                onClick={e => { e.stopPropagation(); onExpand(); }}
                onMouseDown={e => e.stopPropagation()}
                style={{
                  width: "100%", padding: "8px", background: `${C.green}10`,
                  border: `1px solid ${C.green}40`, borderRadius: 8,
                  color: C.green, cursor: "pointer", fontSize: 12, fontWeight: 600,
                }}
              >
                View Full Recipe →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DayPlanView({ plan, goals, onRemoveMeal, onSavePlan, onClone, onClear }) {
  const totals = { calories: 0, protein: 0, fat: 0, carbs: 0 };
  Object.values(plan).forEach(meals => meals.forEach(r => {
    totals.calories += r.calories || 0;
    totals.protein += r.protein || 0;
    totals.fat += r.fat || 0;
    totals.carbs += r.carbs || 0;
  }));

  const [cloneDays, setCloneDays] = useState(1);

  return (
    <div>
      {/* Macro progress */}
      <div style={{ background: C.panel, border: `1px solid ${C.bord}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: C.text3, letterSpacing: 2, marginBottom: 10, fontWeight: 700 }}>TODAY'S MACROS</div>
        <div style={{ display: "flex", gap: 12 }}>
          <MacroBar label="CAL" val={totals.calories} goal={goals.calories} color="#f59e0b" />
          <MacroBar label="PRO" val={totals.protein} goal={goals.protein} color="#10b981" />
          <MacroBar label="FAT" val={totals.fat} goal={goals.fat} color="#f97316" />
          <MacroBar label="CARB" val={totals.carbs} goal={goals.carbs} color="#6366f1" />
        </div>
      </div>

      {/* Meals by type */}
      {TYPES.map(type => {
        const meals = plan[type] || [];
        return (
          <div key={type} style={{ background: C.panel, border: `1px solid ${C.bord}`, borderRadius: 10, padding: 14, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: TYPE_COLOR[type], letterSpacing: 1.5, marginBottom: meals.length ? 10 : 0 }}>
              {TYPE_EMOJI[type]} {type.toUpperCase()}
            </div>
            {meals.length === 0 && (
              <div style={{ fontSize: 12, color: C.text3, fontStyle: "italic" }}>No {type.toLowerCase()} selected</div>
            )}
            {meals.map((r, i) => (
              <div key={r.id + i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderTop: i > 0 ? `1px solid ${C.bord}` : "none" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text1 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: C.text3 }}>{r.calories} cal · {r.protein}g pro · {r.carbs}g carb · {r.fat}g fat</div>
                </div>
                <button onClick={() => onRemoveMeal(type, i)}
                  style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
              </div>
            ))}
          </div>
        );
      })}

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={onClear}
          style={{ padding: "8px 14px", background: "none", border: `1px solid ${C.bord}`, borderRadius: 6, color: C.text3, cursor: "pointer", fontSize: 11 }}>
          🗑 Clear Day
        </button>
        <button onClick={onSavePlan}
          style={{ padding: "8px 14px", background: `${C.green}15`, border: `1px solid ${C.green}50`, borderRadius: 6, color: C.green, cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
          💾 Save Plan
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <span style={{ fontSize: 11, color: C.text3 }}>Clone for</span>
          <select value={cloneDays} onChange={e => setCloneDays(Number(e.target.value))}
            style={{ background: C.surf, border: `1px solid ${C.bord}`, color: C.text1, borderRadius: 4, padding: "4px 8px", fontSize: 11 }}>
            {[1, 2, 3, 4, 5, 6, 7].map(n => <option key={n} value={n}>{n} day{n > 1 ? "s" : ""}</option>)}
          </select>
          <button onClick={() => onClone(cloneDays)}
            style={{ padding: "6px 12px", background: "#6366f130", border: "1px solid #6366f160", borderRadius: 6, color: "#a5b4fc", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
            📋 Clone
          </button>
        </div>
      </div>
    </div>
  );
}

function SavedPlans({ plans, onDelete }) {
  if (!plans.length) return (
    <div style={{ color: C.text3, fontSize: 13, textAlign: "center", padding: 40 }}>No saved meal plans yet. Build a day and save it!</div>
  );
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div>
      {plans.map((p, pi) => {
        const totals = { calories: 0, protein: 0, fat: 0, carbs: 0 };
        Object.values(p.meals).forEach(meals => meals.forEach(r => {
          totals.calories += r.calories || 0; totals.protein += r.protein || 0;
          totals.fat += r.fat || 0; totals.carbs += r.carbs || 0;
        }));
        return (
          <div key={p.id} style={{ background: C.panel, border: `1px solid ${C.bord}`, borderRadius: 10, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text1 }}>{p.label || `Plan ${pi + 1}`}</div>
                <div style={{ fontSize: 11, color: C.text3 }}>{p.savedAt} · {p.days?.length || 1} day{(p.days?.length || 1) > 1 ? "s" : ""}</div>
              </div>
              <button onClick={() => onDelete(pi)}
                style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 14 }}>🗑</button>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {[["CAL", totals.calories, "#f59e0b"], ["PRO", totals.protein + "g", "#10b981"], ["FAT", totals.fat + "g", "#f97316"], ["CARB", totals.carbs + "g", "#6366f1"]].map(([l, v, c]) => (
                <div key={l} style={{ background: C.surf, borderRadius: 6, padding: "5px 10px", textAlign: "center", flex: 1 }}>
                  <div style={{ fontSize: 9, color: C.text3 }}>{l}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            {p.days && p.days.length > 1 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {p.days.map((d, di) => (
                  <span key={di} style={{ background: C.surf2, color: C.text2, fontSize: 10, padding: "3px 8px", borderRadius: 4 }}>
                    {days[di % 7] || `Day ${di + 1}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GoalsForm({ goals, onSave }) {
  const [draft, setDraft] = useState({
    calories: String(goals.calories),
    protein: String(goals.protein),
    carbs: String(goals.carbs),
    fat: String(goals.fat),
  });

  const fields = [
    { key: "calories", label: "Calories", unit: "kcal", color: "#f59e0b", placeholder: "e.g. 2000" },
    { key: "protein",  label: "Protein",  unit: "g",    color: "#10b981", placeholder: "e.g. 140" },
    { key: "carbs",    label: "Carbs",    unit: "g",    color: "#6366f1", placeholder: "e.g. 200" },
    { key: "fat",      label: "Fat",      unit: "g",    color: "#f97316", placeholder: "e.g. 65" },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsed = {
      calories: Math.max(0, parseInt(draft.calories) || 0),
      protein:  Math.max(0, parseInt(draft.protein)  || 0),
      carbs:    Math.max(0, parseInt(draft.carbs)    || 0),
      fat:      Math.max(0, parseInt(draft.fat)      || 0),
    };
    onSave(parsed);
  };

  return (
    <form onSubmit={handleSubmit} style={{ background: C.panel, border: `1px solid ${C.bord}`, borderRadius: 10, padding: 20 }}>
      <div style={{ fontSize: 10, color: C.text3, letterSpacing: 2, marginBottom: 20, fontWeight: 700 }}>DAILY MACRO GOALS</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {fields.map(({ key, label, unit, color, placeholder }) => (
          <div key={key}>
            <div style={{ fontSize: 10, color: C.text3, letterSpacing: 1.5, marginBottom: 6, fontWeight: 700 }}>
              {label.toUpperCase()} <span style={{ color, fontWeight: 400 }}>({unit})</span>
            </div>
            <input
              type="number"
              min="0"
              value={draft[key]}
              placeholder={placeholder}
              onChange={e => setDraft(p => ({ ...p, [key]: e.target.value }))}
              style={{
                width: "100%", padding: "10px 12px", background: C.surf,
                border: `1px solid ${C.bord2}`, borderRadius: 8, color: C.text1,
                fontSize: 20, fontWeight: 700, outline: "none", boxSizing: "border-box",
                accentColor: color,
              }}
              onFocus={e => e.target.style.borderColor = color}
              onBlur={e => e.target.style.borderColor = C.bord2}
            />
          </div>
        ))}
      </div>
      <button type="submit"
        style={{ width: "100%", padding: "12px", background: `${C.green}15`, border: `1px solid ${C.green}50`, borderRadius: 8, color: C.green, cursor: "pointer", fontSize: 13, fontWeight: 700, letterSpacing: 1 }}>
        🍽️ START MEAL PLANNING
      </button>
    </form>
  );
}

function RecipeTableRow({ recipe, swipedId, onVote, onSkip, onUndo, onExpand }) {
  const [imgSrc, setImgSrc] = useState(() => getImageUrl(recipe));
  const [imgFailed, setImgFailed] = useState(false);
  const [showIng, setShowIng] = useState(false);
  const [showRec, setShowRec] = useState(false);

  const handleImgError = () => {
    if (recipe.driveId && imgSrc === getDriveImageUrl(recipe.driveId)) {
      setImgSrc(getFallbackImageUrl(recipe));
    } else {
      setImgFailed(true);
    }
  };

  const rowBg = swipedId === "yes" ? `${C.green}0d` : swipedId === "no" ? "#ff6b350d" : "transparent";
  const tdBase = { padding: "8px 10px", borderBottom: `1px solid ${C.bord}`, verticalAlign: "top" };

  return (
    <tr style={{ background: rowBg, transition: "background 0.2s" }}>
      {/* Photo */}
      <td style={{ ...tdBase, width: 236, verticalAlign: "middle", padding: "8px" }}>
        <div style={{ width: 220, height: 220, borderRadius: 10, overflow: "hidden", background: hashColor(recipe.name), cursor: "pointer" }}
          onClick={() => onExpand(recipe)}>
          {!imgFailed
            ? <img src={imgSrc} alt={recipe.name} onError={handleImgError} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, opacity: 0.35 }}>🍽️</div>
          }
        </div>
      </td>
      {/* Name */}
      <td style={{ ...tdBase, minWidth: 180, verticalAlign: "middle" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, lineHeight: 1.35, cursor: "pointer", marginBottom: 4 }}
          onClick={() => onExpand(recipe)}>{recipe.name}</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {recipe.types.map(t => (
            <span key={t} style={{ fontSize: 9, color: TYPE_COLOR[t], fontWeight: 700 }}>{TYPE_EMOJI[t]} {t}</span>
          ))}
        </div>
      </td>
      {/* Macros */}
      {[
        { v: recipe.calories, u: "kcal", c: "#f59e0b" },
        { v: recipe.protein,  u: "g pro", c: "#10b981" },
        { v: recipe.fat,      u: "g fat", c: "#f97316" },
        { v: recipe.carbs,    u: "g carb", c: "#6366f1" },
      ].map(({ v, u, c }) => (
        <td key={u} style={{ ...tdBase, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: c, lineHeight: 1 }}>{v}</div>
          <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>{u}</div>
        </td>
      ))}
      {/* Prep */}
      <td style={{ ...tdBase, textAlign: "center", verticalAlign: "middle", whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 12, color: C.text2 }}>⏱ {recipe.prepTime?.replace(/minutes?/i, "min") || "—"}</div>
      </td>
      {/* Ingredients */}
      <td style={{ ...tdBase, minWidth: 200, maxWidth: 260 }}>
        <div style={{
          fontSize: 12, color: C.text2, lineHeight: 1.6,
          ...(showIng ? {} : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }),
        }}>{recipe.ingredients}</div>
        {(recipe.ingredients?.length || 0) > 80 && (
          <button onClick={() => setShowIng(v => !v)}
            style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 10, padding: "2px 0", marginTop: 2 }}>
            {showIng ? "▲ less" : "▼ more"}
          </button>
        )}
      </td>
      {/* Recipe steps */}
      <td style={{ ...tdBase, minWidth: 200, maxWidth: 280 }}>
        <div style={{
          fontSize: 12, color: C.text2, lineHeight: 1.6,
          ...(showRec ? {} : { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }),
        }}>{recipe.recipe}</div>
        {(recipe.recipe?.length || 0) > 80 && (
          <button onClick={() => setShowRec(v => !v)}
            style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 10, padding: "2px 0", marginTop: 2 }}>
            {showRec ? "▲ less" : "▼ more"}
          </button>
        )}
      </td>
      {/* Actions */}
      <td style={{ ...tdBase, verticalAlign: "middle", textAlign: "center", position: "sticky", right: 0, background: rowBg || C.panel, boxShadow: "-2px 0 8px rgba(0,0,0,0.4)" }}>
        {swipedId ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 20 }}>{swipedId === "yes" ? "👍" : swipedId === "no" ? "👎" : "⏭"}</span>
            <button onClick={() => onUndo(recipe, swipedId)}
              style={{ background: "none", border: `1px solid ${C.bord}`, borderRadius: 4, color: C.text3, cursor: "pointer", fontSize: 10, padding: "2px 6px" }}>
              Undo
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
            <button onClick={() => onVote(recipe, "no")}
              title="Skip — don't add"
              style={{ width: 34, height: 34, borderRadius: "50%", background: "#ff6b3515", border: "1px solid #ff6b3540", color: "#ff6b35", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              👎
            </button>
            <button onClick={() => onSkip(recipe)}
              title="Skip for now"
              style={{ width: 34, height: 34, borderRadius: "50%", background: C.surf, border: `1px solid ${C.bord2}`, color: C.text3, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ⏭
            </button>
            <button onClick={() => onVote(recipe, "yes")}
              title="Add to day plan"
              style={{ width: 34, height: 34, borderRadius: "50%", background: `${C.green}15`, border: `1px solid ${C.green}40`, color: C.green, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              👍
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}

function TableView({ allRecipes, mealType, swipedIds, onVote, onSkip, onUndo, onExpand }) {
  const [filter, setFilter] = useState("unvoted");

  const allForType = allRecipes.filter(r => r.types.includes(mealType));
  const counts = {
    unvoted: allForType.filter(r => !swipedIds[r.id]).length,
    yes:     allForType.filter(r => swipedIds[r.id] === "yes").length,
    no:      allForType.filter(r => swipedIds[r.id] && swipedIds[r.id] !== "yes").length,
    all:     allForType.length,
  };

  const filtered = allForType.filter(r => {
    if (filter === "unvoted") return !swipedIds[r.id];
    if (filter === "yes")     return swipedIds[r.id] === "yes";
    if (filter === "no")      return swipedIds[r.id] && swipedIds[r.id] !== "yes";
    return true;
  }).slice(0, 300);

  const thStyle = {
    padding: "10px 10px", fontSize: 10, fontWeight: 700, letterSpacing: 1.2,
    color: C.text3, whiteSpace: "nowrap", background: C.surf,
    borderBottom: `2px solid ${C.bord2}`, position: "sticky", top: 0, zIndex: 5,
  };

  return (
    <div>
      {/* Filter chips */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { k: "unvoted", label: `Unreviewed · ${counts.unvoted}` },
          { k: "yes",     label: `✓ Added · ${counts.yes}` },
          { k: "no",      label: `✗ Skipped · ${counts.no}` },
          { k: "all",     label: `All · ${counts.all}` },
        ].map(({ k, label }) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            padding: "5px 13px", borderRadius: 20,
            background: filter === k ? `${C.green}20` : C.surf,
            border: `1px solid ${filter === k ? C.green + "70" : C.bord}`,
            color: filter === k ? C.green : C.text3,
            cursor: "pointer", fontSize: 11, fontWeight: filter === k ? 700 : 400,
          }}>{label}</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: C.text3, alignSelf: "center" }}>
          Showing {Math.min(filtered.length, 300)} of {filtered.length}
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 260px)", overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1000 }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: "center" }}>Photo</th>
              <th style={{ ...thStyle, textAlign: "left", minWidth: 180 }}>Recipe</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Calories</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Protein</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Fat</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Carbs</th>
              <th style={{ ...thStyle, textAlign: "center" }}>Prep</th>
              <th style={{ ...thStyle, textAlign: "left", minWidth: 200 }}>Ingredients</th>
              <th style={{ ...thStyle, textAlign: "left", minWidth: 200 }}>Recipe Steps</th>
              <th style={{ ...thStyle, textAlign: "center", position: "sticky", right: 0, background: C.surf, boxShadow: "-2px 0 8px rgba(0,0,0,0.4)" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: "center", color: C.text3, fontSize: 13 }}>
                No recipes in this category yet
              </td></tr>
            ) : filtered.map(recipe => (
              <RecipeTableRow
                key={recipe.id}
                recipe={recipe}
                swipedId={swipedIds[recipe.id]}
                onVote={onVote}
                onSkip={onSkip}
                onUndo={onUndo}
                onExpand={onExpand}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MealPlanner() {
  const [allRecipes, setAllRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votes, setVotes] = useState(() => loadJSON(VOTES_KEY, {}));
  const [goals, setGoals] = useState(() => loadJSON(GOALS_KEY, { calories: 2000, protein: 140, carbs: 200, fat: 65 }));
  const [savedPlans, setSavedPlans] = useState(() => loadJSON(PLANS_KEY, []));
  const [swipedIds, setSwipedIds] = useState({});

  const [activeType, setActiveType] = useState("Breakfast");
  const [dayPlan, setDayPlan] = useState({ Breakfast: [], Lunch: [], Dinner: [], Snack: [] });
  const [queue, setQueue] = useState([]);
  const [queueIdx, setQueueIdx] = useState(0);

  const [view, setView] = useState("swipe"); // "swipe" | "table" | "plan" | "saved" | "goals" | "search"
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [expandedRecipe, setExpandedRecipe] = useState(null);

  useEffect(() => {
    fetch("/recipes.json")
      .then(r => r.json())
      .then(data => { setAllRecipes(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const remainingMacros = useCallback(() => {
    const used = { calories: 0, protein: 0, fat: 0, carbs: 0 };
    Object.values(dayPlan).forEach(meals => meals.forEach(r => {
      used.calories += r.calories || 0; used.protein += r.protein || 0;
      used.fat += r.fat || 0; used.carbs += r.carbs || 0;
    }));
    return {
      calories: Math.max(0, goals.calories - used.calories),
      protein: Math.max(0, goals.protein - used.protein),
      fat: Math.max(0, goals.fat - used.fat),
      carbs: Math.max(0, goals.carbs - used.carbs),
    };
  }, [dayPlan, goals]);

  useEffect(() => {
    if (!allRecipes.length) return;
    const q = buildQueue(allRecipes, activeType, votes, goals, remainingMacros(), swipedIds);
    setQueue(q);
    setQueueIdx(0);
  }, [allRecipes, activeType, votes, swipedIds]);

  useEffect(() => { saveJSON(VOTES_KEY, votes); }, [votes]);
  useEffect(() => { saveJSON(GOALS_KEY, goals); }, [goals]);
  useEffect(() => { saveJSON(PLANS_KEY, savedPlans); }, [savedPlans]);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const q = search.toLowerCase();
    setSearchResults(
      allRecipes.filter(r => r.name.toLowerCase().includes(q) || r.ingredients?.toLowerCase().includes(q))
        .slice(0, 30)
    );
  }, [search, allRecipes]);

  const handleSwipe = (dir) => {
    const recipe = queue[queueIdx];
    if (!recipe) return;
    setSwipedIds(p => ({ ...p, [recipe.id]: dir }));
    setVotes(p => {
      const prev = p[recipe.id] || { up: 0, down: 0 };
      return { ...p, [recipe.id]: dir === "yes" ? { ...prev, up: prev.up + 1 } : { ...prev, down: prev.down + 1 } };
    });
    if (dir === "yes") {
      setDayPlan(p => ({ ...p, [activeType]: [...p[activeType], recipe] }));
    }
    setQueueIdx(i => i + 1);
  };

  const handleTableVote = (recipe, dir) => {
    setSwipedIds(p => ({ ...p, [recipe.id]: dir }));
    setVotes(p => {
      const prev = p[recipe.id] || { up: 0, down: 0 };
      return { ...p, [recipe.id]: dir === "yes" ? { ...prev, up: prev.up + 1 } : { ...prev, down: prev.down + 1 } };
    });
    if (dir === "yes") {
      setDayPlan(p => ({ ...p, [activeType]: [...p[activeType].filter(r => r.id !== recipe.id), recipe] }));
    }
  };

  const handleTableSkip = (recipe) => {
    setSwipedIds(p => ({ ...p, [recipe.id]: "skip" }));
  };

  const handleTableUndo = (recipe, prevDecision) => {
    setSwipedIds(p => { const n = { ...p }; delete n[recipe.id]; return n; });
    if (prevDecision === "yes") {
      setDayPlan(p => ({ ...p, [activeType]: p[activeType].filter(r => r.id !== recipe.id) }));
    }
  };

  const handleAddFromSearch = (recipe, mealType) => {
    setDayPlan(p => ({ ...p, [mealType]: [...p[mealType], recipe] }));
    setVotes(p => {
      const prev = p[recipe.id] || { up: 0, down: 0 };
      return { ...p, [recipe.id]: { ...prev, up: prev.up + 1 } };
    });
  };

  const handleSavePlan = () => {
    const plan = {
      id: Date.now(),
      label: `Day Plan ${savedPlans.length + 1}`,
      savedAt: new Date().toLocaleDateString(),
      meals: dayPlan,
      days: [dayPlan],
    };
    setSavedPlans(p => [plan, ...p]);
    setView("saved");
  };

  const handleClone = (numDays) => {
    const plan = {
      id: Date.now(),
      label: `${numDays}-Day Plan`,
      savedAt: new Date().toLocaleDateString(),
      meals: dayPlan,
      days: Array.from({ length: numDays }, () => dayPlan),
    };
    setSavedPlans(p => [plan, ...p]);
    setView("saved");
  };

  const handleDeletePlan = (i) => setSavedPlans(p => p.filter((_, j) => j !== i));

  const handleRemoveMeal = (type, idx) => {
    setDayPlan(p => ({ ...p, [type]: p[type].filter((_, i) => i !== idx) }));
  };

  const handleClearDay = () => {
    setDayPlan({ Breakfast: [], Lunch: [], Dinner: [], Snack: [] });
    setSwipedIds({});
  };

  const totalSelected = Object.values(dayPlan).reduce((s, a) => s + a.length, 0);

  const currentRecipe = queue[queueIdx];
  const queueLeft = Math.max(0, queue.length - queueIdx);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, color: C.text3, fontSize: 14 }}>
      Loading 5,017 recipes...
    </div>
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px 80px" }}>

      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text1, letterSpacing: 2 }}>🍽️ MEAL PLANNER</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setView("goals")}
              style={{ padding: "5px 10px", background: view === "goals" ? `${C.green}20` : C.surf, border: `1px solid ${view === "goals" ? C.green + "60" : C.bord}`, borderRadius: 6, color: view === "goals" ? C.green : C.text2, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>
              🎯 GOALS
            </button>
            <button onClick={() => setView(v => v === "swipe" ? "table" : "swipe")}
              style={{ padding: "5px 10px", background: (view === "swipe" || view === "table") ? "#f59e0b20" : C.surf, border: `1px solid ${(view === "swipe" || view === "table") ? "#f59e0b60" : C.bord}`, borderRadius: 6, color: (view === "swipe" || view === "table") ? "#f59e0b" : C.text2, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>
              {view === "table" ? "🃏 SWIPE" : "⊞ TABLE"}
            </button>
            <button onClick={() => setView(v => v === "search" ? "swipe" : "search")}
              style={{ padding: "5px 10px", background: view === "search" ? "#00b8ff20" : C.surf, border: `1px solid ${view === "search" ? "#00b8ff60" : C.bord}`, borderRadius: 6, color: view === "search" ? C.blue : C.text2, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>
              🔍 SEARCH
            </button>
            <button onClick={() => setView("saved")}
              style={{ padding: "5px 10px", background: view === "saved" ? "#6366f120" : C.surf, border: `1px solid ${view === "saved" ? "#6366f160" : C.bord}`, borderRadius: 6, color: view === "saved" ? "#a5b4fc" : C.text2, cursor: "pointer", fontSize: 10, fontWeight: 600 }}>
              📋 SAVED
            </button>
          </div>
        </div>

        {/* Meal type tabs */}
        <div style={{ display: "flex", gap: 6 }}>
          {TYPES.map(t => {
            const count = (dayPlan[t] || []).length;
            const isActive = activeType === t && (view === "swipe" || view === "plan");
            return (
              <button key={t} onClick={() => { setActiveType(t); setView("swipe"); }}
                style={{
                  flex: 1, padding: "8px 0", background: isActive ? `${TYPE_COLOR[t]}20` : C.surf,
                  border: `1px solid ${isActive ? TYPE_COLOR[t] + "60" : C.bord}`,
                  borderRadius: 8, color: isActive ? TYPE_COLOR[t] : C.text3,
                  cursor: "pointer", fontSize: 10, fontWeight: 700, letterSpacing: 1,
                  position: "relative",
                }}>
                <div>{TYPE_EMOJI[t]}</div>
                <div>{t.toUpperCase()}</div>
                {count > 0 && (
                  <div style={{
                    position: "absolute", top: -4, right: -4, background: TYPE_COLOR[t],
                    color: "#000", borderRadius: "50%", width: 16, height: 16,
                    fontSize: 9, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{count}</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Goals view */}
      {view === "goals" && (
        <GoalsForm goals={goals} onSave={(g) => { setGoals(g); setView("swipe"); }} />
      )}

      {/* Search view */}
      {view === "search" && (
        <div>
          <input
            type="text"
            placeholder="Search 5,017 recipes by name or ingredient..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
            style={{
              width: "100%", padding: "11px 14px", background: C.surf, border: `1px solid ${C.bord2}`,
              borderRadius: 8, color: C.text1, fontSize: 13, outline: "none", boxSizing: "border-box",
              marginBottom: 12,
            }}
          />
          {search && searchResults.length === 0 && (
            <div style={{ color: C.text3, fontSize: 13, textAlign: "center", padding: 20 }}>No recipes found for "{search}"</div>
          )}
          {searchResults.map(r => (
            <div key={r.id} style={{ background: C.panel, border: `1px solid ${C.bord}`, borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text1, marginBottom: 4 }}>{r.name}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {r.types.map(t => (
                      <span key={t} style={{ fontSize: 9, color: TYPE_COLOR[t], fontWeight: 700 }}>{TYPE_EMOJI[t]} {t}</span>
                    ))}
                  </div>
                </div>
                <button onClick={() => setExpandedRecipe(r)}
                  style={{ background: "none", border: `1px solid ${C.bord}`, borderRadius: 5, padding: "3px 8px", color: C.text3, cursor: "pointer", fontSize: 10, marginLeft: 8, whiteSpace: "nowrap" }}>
                  Details
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                {[["CAL", r.calories, "#f59e0b"], ["PRO", r.protein + "g", "#10b981"], ["FAT", r.fat + "g", "#f97316"], ["CARB", r.carbs + "g", "#6366f1"]].map(([l, v, c]) => (
                  <div key={l} style={{ background: C.surf, borderRadius: 4, padding: "3px 6px", textAlign: "center", flex: 1 }}>
                    <div style={{ fontSize: 8, color: C.text3 }}>{l}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {r.types.map(t => (
                  <button key={t} onClick={() => handleAddFromSearch(r, t)}
                    style={{ flex: 1, padding: "6px 8px", background: `${TYPE_COLOR[t]}15`, border: `1px solid ${TYPE_COLOR[t]}40`, borderRadius: 6, color: TYPE_COLOR[t], cursor: "pointer", fontSize: 10, fontWeight: 700, minWidth: 60 }}>
                    + Add to {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {!search && (
            <div style={{ color: C.text3, fontSize: 13, textAlign: "center", padding: 40 }}>
              Type to search 5,017 recipes
            </div>
          )}
        </div>
      )}

      {/* Saved plans view */}
      {view === "saved" && (
        <SavedPlans plans={savedPlans} onDelete={handleDeletePlan} />
      )}

      {/* Table view */}
      {view === "table" && (
        <TableView
          allRecipes={allRecipes}
          mealType={activeType}
          swipedIds={swipedIds}
          onVote={handleTableVote}
          onSkip={handleTableSkip}
          onUndo={handleTableUndo}
          onExpand={setExpandedRecipe}
        />
      )}

      {/* Swipe view */}
      {view === "swipe" && (
        <div>
          {/* Queue counter */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: C.text3 }}>
              {queueLeft > 0 ? `${queueLeft} recipes to review` : "All reviewed!"}
            </div>
            <button onClick={() => setView("plan")}
              style={{ padding: "5px 12px", background: totalSelected > 0 ? `${C.green}20` : C.surf, border: `1px solid ${totalSelected > 0 ? C.green + "50" : C.bord}`, borderRadius: 6, color: totalSelected > 0 ? C.green : C.text3, cursor: "pointer", fontSize: 10, fontWeight: 700 }}>
              📋 View Day Plan {totalSelected > 0 ? `(${totalSelected})` : ""}
            </button>
          </div>

          {/* Card stack */}
          {currentRecipe ? (
            <div>
              <div style={{ position: "relative", height: 440, marginBottom: 16 }}>
                {/* Background cards */}
                {queue[queueIdx + 2] && (
                  <div style={{ position: "absolute", width: "100%", transform: "scale(0.9) translateY(16px)", opacity: 0.3, pointerEvents: "none" }}>
                    <div style={{ background: C.panel, border: `1px solid ${C.bord}`, borderRadius: 16, height: 420 }} />
                  </div>
                )}
                {queue[queueIdx + 1] && (
                  <div style={{ position: "absolute", width: "100%", transform: "scale(0.95) translateY(8px)", opacity: 0.5, pointerEvents: "none" }}>
                    <div style={{ background: C.panel, border: `1px solid ${C.bord}`, borderRadius: 16, height: 420 }} />
                  </div>
                )}
                <SwipeCard
                  key={currentRecipe.id}
                  recipe={currentRecipe}
                  votes={votes}
                  onSwipe={handleSwipe}
                  onExpand={() => setExpandedRecipe(currentRecipe)}
                  typeColor={TYPE_COLOR[activeType]}
                />
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 20, justifyContent: "center", alignItems: "center" }}>
                <button onClick={() => handleSwipe("no")}
                  style={{ width: 58, height: 58, borderRadius: "50%", background: "#ff6b3515", border: "2px solid #ff6b3550", color: "#ff6b35", cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#ff6b3530"}
                  onMouseLeave={e => e.currentTarget.style.background = "#ff6b3515"}>
                  👎
                </button>
                <button onClick={() => handleSwipe("yes")}
                  style={{ width: 58, height: 58, borderRadius: "50%", background: `${C.green}15`, border: `2px solid ${C.green}50`, color: C.green, cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = `${C.green}30`}
                  onMouseLeave={e => e.currentTarget.style.background = `${C.green}15`}>
                  👍
                </button>
                <button onClick={() => { setQueueIdx(i => i + 1); }}
                  style={{ padding: "8px 16px", background: C.surf, border: `1px solid ${C.bord}`, borderRadius: 20, color: C.text3, cursor: "pointer", fontSize: 11 }}>
                  ⏭ Skip
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text1, marginBottom: 8 }}>All {activeType} recipes reviewed!</div>
              <div style={{ fontSize: 13, color: C.text3, marginBottom: 20 }}>
                {(dayPlan[activeType] || []).length > 0
                  ? `You selected ${dayPlan[activeType].length} ${activeType.toLowerCase()} meal${dayPlan[activeType].length > 1 ? "s" : ""}.`
                  : "No meals selected for this type yet."}
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => { setSwipedIds(p => { const n = { ...p }; queue.forEach(r => delete n[r.id]); return n; }); setQueueIdx(0); }}
                  style={{ padding: "8px 16px", background: C.surf, border: `1px solid ${C.bord}`, borderRadius: 6, color: C.text2, cursor: "pointer", fontSize: 12 }}>
                  🔄 Review Again
                </button>
                <button onClick={() => setView("plan")}
                  style={{ padding: "8px 16px", background: `${C.green}15`, border: `1px solid ${C.green}50`, borderRadius: 6, color: C.green, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
                  📋 View Day Plan
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Plan view */}
      {view === "plan" && (
        <DayPlanView
          plan={dayPlan}
          goals={goals}
          onRemoveMeal={handleRemoveMeal}
          onSavePlan={handleSavePlan}
          onClone={handleClone}
          onClear={handleClearDay}
        />
      )}

      {/* Recipe detail modal */}
      {expandedRecipe && (
        <RecipeModal
          recipe={expandedRecipe}
          onClose={() => setExpandedRecipe(null)}
          onYes={() => {
            handleAddFromSearch(expandedRecipe, expandedRecipe.types[0]);
            setExpandedRecipe(null);
            setView("plan");
          }}
          onNo={() => {
            setVotes(p => {
              const prev = p[expandedRecipe.id] || { up: 0, down: 0 };
              return { ...p, [expandedRecipe.id]: { ...prev, down: prev.down + 1 } };
            });
            setExpandedRecipe(null);
          }}
        />
      )}
    </div>
  );
}
