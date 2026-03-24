import { useState, useEffect, useRef } from "react";

// ─── i18n ─────────────────────────────────────────────────────────
// Change any string here to translate the entire UI
const L = {
  appName:            "Workout Tracker",
  // Nav
  navTimer:           "Timer",
  navPrograms:        "Programs",
  navExercises:       "Exercises",
  navLight:           "Light",
  navDark:            "Dark",
  // Timer screen
  timerHeadline:      "Start a\nworkout",
  timerSelectProgram: "Select program",
  timerNoProgramsYet: "No programs yet",
  timerNoProgramsHint:"Create one in Programs tab",
  timerExercisesLabel: (n) => `${n} exercise${n !== 1 ? "s" : ""}`,
  timerStartBtn:      "Start Workout",
  // Active session
  sessionExerciseOf:  (cur, total) => `Exercise ${cur} of ${total}`,
  sessionSetOf:       (cur, total) => `Set ${cur} of ${total}`,
  sessionMaxLabel:    (n) => `Max: ${n} reps`,
  sessionRepsDone:    "Reps done",
  sessionPlan:        (n) => `Plan: ${n}`,
  sessionDoneBtn:     "Done",
  sessionSetsLabel:   "Sets",
  sessionRestBetweenSets: "Rest between sets",
  sessionRestBetweenEx:   "Rest between exercises",
  sessionSetLabel:    (cur, total) => `Set ${cur}/${total}`,
  sessionNextEx:      (name) => `Next: ${name}`,
  sessionSeconds:     "seconds",
  sessionAdjust:      "± 30 sec",
  sessionContinue:    "Continue",
  sessionSkipRest:    "Skip Rest",
  // Done screen
  doneTitle:          "Workout done!",
  doneSets:           (n) => `${n} sets completed`,
  doneAutoProgLabel:  "Auto-progression",
  doneMaxCount:       "Max count:",
  doneNoChanges:      "No changes this session",
  doneNoChangesHint:  "Algorithm tracks last 3 workouts",
  doneBackBtn:        "Back to Home",
  // Progression reasons
  progUp2:            "Crushed it 3 workouts in a row! +2 to max",
  progUp1:            "Hitting the plan consistently! +1 to max",
  progDown1:          "Struggling to hit the plan. Adjusting max down by 1",
  // Programs screen
  programsManage:     "Manage",
  programsTitle:      "Programs",
  programsNoExercises:"No exercises",
  programsNone:       "No programs yet",
  programsExCount:    (n) => `${n} exercise${n !== 1 ? "s" : ""}`,
  // Program editor
  programEditTitle:   "Edit Program",
  programNewTitle:    "New Program",
  programNameLabel:   "Program name",
  programNamePlaceholder: "e.g. Full Body A",
  programExLabel:     "Exercises",
  programSets:        "Sets",
  programSetRest:     "Set rest",
  programExRest:      "Ex rest",
  programAddBtn:      "Add",
  programSaveBtn:     "Save",
  // Exercises screen
  exercisesManage:    "Manage",
  exercisesTitle:     "Exercises",
  exercisesAll:       "All",
  exercisesNone:      "No exercises",
  exercisesMaxLabel:  "max",
  // Exercise editor
  exerciseEditTitle:  "Edit Exercise",
  exerciseNewTitle:   "New Exercise",
  exerciseNameLabel:  "Name",
  exerciseNamePlaceholder: "e.g. Pull-ups",
  exerciseMaxLabel:   "Max count",
  exerciseCategoryLabel: "Category",
  exerciseNewCatBtn:  "+ New",
  exerciseCatPlaceholder: "Category name",
  exerciseCatOkBtn:   "OK",
  exerciseSaveBtn:    "Save",
  // Exercise detail
  exerciseDetailMaxLabel: "Max count",
  exerciseDetailRecord: (n) => `Record: ${n} — update your max!`,
  exerciseDetailProgLabel: "Progression plan",
  exerciseDetailSetLabel: (n) => `Set ${n}`,
  exerciseDetailTotal: (n) => `Total: ${n} reps`,
  exerciseDetailHistory: "History",
  exerciseDetailHistorySet: (n) => `Set ${n}`,
  exerciseDetailReps: (done, plan) => `${done} / ${plan} reps`,
  exerciseEditBtn:    "Edit",
};

// ─── STORAGE ───────────────────────────────────────────────────────
const load = (key, fb) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} };

// ─── DEFAULT DATA ──────────────────────────────────────────────────
const defaultCategories = ["Back", "Chest", "Legs", "Core", "Shoulders", "Arms", "Cardio"];
const defaultExercises = [
  { id: "e1", name: "Pull-ups", category: "Back", max: 10 },
  { id: "e2", name: "Push-ups", category: "Chest", max: 20 },
  { id: "e3", name: "Squats", category: "Legs", max: 15 },
  { id: "e4", name: "Leg raises", category: "Core", max: 12 },
];
const defaultPrograms = [
  {
    id: "p1", name: "Circuit #1",
    exercises: [
      { exerciseId: "e1", sets: 5, restBetweenSets: 90, restAfterExercise: 120 },
      { exerciseId: "e2", sets: 4, restBetweenSets: 60, restAfterExercise: 120 },
      { exerciseId: "e3", sets: 4, restBetweenSets: 90, restAfterExercise: 0 },
    ]
  }
];

// ─── THEME TOKENS ─────────────────────────────────────────────────
const T = {
  bgPage: "#f5f4f0", bgCard: "#ffffff", bgCardAlt: "#f0efe9",
  bgDark: "#151518", bgDarkCard: "#1e1e24", bgDarkCardAlt: "#28282f",
  textPrimary: "#111111", textSecondary: "#555550", textMuted: "#999994",
  dTextPrimary: "#f0ede6", dTextSecondary: "#c8c4bc", dTextMuted: "#807e78",
  accent: "#2563eb", accentLight: "#dbeafe",
  success: "#16a34a", successLight: "#dcfce7",
  danger: "#dc2626", dangerLight: "#fee2e2",
  border: "#e4e2db", borderDark: "#2e2e36",
};

// ─── PROGRESSION ──────────────────────────────────────────────────
function generateSets(max) {
  if (!max || max < 1) return [{ reps: 5 }];
  const m = Math.max(1, max);
  if (m <= 5) return [3,3,3,2,2].map(r => ({ reps: Math.min(r, m) }));
  if (m <= 10) return [0.5,0.6,0.7,0.6,0.5].map(r => ({ reps: Math.round(m * r) }));
  if (m <= 20) return [0.4,0.55,0.65,0.55,0.45].map(r => ({ reps: Math.round(m * r) }));
  return [0.35,0.45,0.55,0.45,0.35].map(r => ({ reps: Math.round(m * r) }));
}

function calcProgressionAdjustment(exerciseId, history) {
  const workouts = history.filter(h => h.sets.some(s => s.exerciseId === exerciseId)).slice(0, 3);
  if (workouts.length < 3) return { delta: 0, reason: null };
  const scores = workouts.map(w => {
    const es = w.sets.filter(s => s.exerciseId === exerciseId);
    return es.length ? es.reduce((a, s) => a + (s.planned > 0 ? s.reps / s.planned : 1), 0) / es.length : 0;
  });
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const allStrong = scores.every(s => s >= 0.95);
  const manyWeak = scores.filter(s => s < 0.70).length >= 2;
  if (allStrong && avg >= 1.05) return { delta: 2, reason: L.progUp2 };
  if (allStrong) return { delta: 1, reason: L.progUp1 };
  if (manyWeak) return { delta: -1, reason: L.progDown1 };
  return { delta: 0, reason: null };
}

// ─── AUDIO ────────────────────────────────────────────────────────
let audioCtx = null;
function getACtx() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); return audioCtx; }
function playBeep({ frequency = 880, duration = 0.12, volume = 0.4 } = {}) {
  try {
    const ctx = getACtx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + duration);
  } catch {}
}
function beepTick() { playBeep({ frequency: 880, duration: 0.1, volume: 0.35 }); }
function beepStart() { playBeep({ frequency: 1100, duration: 0.55, volume: 0.5 }); }
function beepExerciseDone() {
  try {
    const ctx = getACtx(); const t = ctx.currentTime;
    [{ f: 880, o: 0 }, { f: 550, o: 0.18 }].forEach(({ f, o }) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
      osc.frequency.setValueAtTime(f, t + o); gain.gain.setValueAtTime(0.4, t + o);
      gain.gain.exponentialRampToValueAtTime(0.001, t + o + 0.22);
      osc.start(t + o); osc.stop(t + o + 0.22);
    });
  } catch {}
}
function beepExerciseStart() {
  try {
    const ctx = getACtx(); const t = ctx.currentTime;
    [{ f: 550, o: 0 }, { f: 770, o: 0.16 }, { f: 1100, o: 0.32 }].forEach(({ f, o }) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
      osc.frequency.setValueAtTime(f, t + o); gain.gain.setValueAtTime(0.4, t + o);
      gain.gain.exponentialRampToValueAtTime(0.001, t + o + 0.18);
      osc.start(t + o); osc.stop(t + o + 0.18);
    });
  } catch {}
}

// ─── ICONS ────────────────────────────────────────────────────────
const Icon = ({ name, size = 20 }) => {
  const icons = {
    timer: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 3h6M12 3v2"/></svg>,
    programs: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
    exercises: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 5v14M18 5v14M6 12h12M3 8h3M18 8h3M3 16h3M18 16h3"/></svg>,
    plus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>,
    minus: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14"/></svg>,
    check: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>,
    trash: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>,
    edit: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
    back: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>,
    fire: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2c0 6-6 8-6 13a6 6 0 0012 0c0-5-6-7-6-13z"/></svg>,
    moon: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>,
    sun: <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>,
  };
  return icons[name] || null;
};

// ─── SHARED ───────────────────────────────────────────────────────
function Card({ d, children, style = {} }) {
  return <div style={{ background: d ? T.bgDarkCard : T.bgCard, border: `1px solid ${d ? T.borderDark : T.border}`, borderRadius: 14, padding: "16px 18px", ...style }}>{children}</div>;
}
function Lbl({ d, children, style = {} }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: d ? T.dTextMuted : T.textMuted, letterSpacing: "0.06em", textTransform: "uppercase", ...style }}>{children}</div>;
}
function RBtn({ d, onClick, children, size = 44, accent = false }) {
  return (
    <button className="btn" onClick={onClick} style={{ width: size, height: size, borderRadius: "50%", background: accent ? T.accent : (d ? T.bgDarkCardAlt : T.bgCardAlt), border: accent ? "none" : `1px solid ${d ? T.borderDark : T.border}`, color: accent ? "#fff" : (d ? T.dTextPrimary : T.textPrimary), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      {children}
    </button>
  );
}
function HeroHeader({ d, gradient, children }) {
  return <div style={{ background: gradient, padding: "52px 20px 24px" }}>{children}</div>;
}

// ─── APP ──────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("timer");
  const [dark, setDark] = useState(() => load("darkMode", false));
  const [exercises, setExercises] = useState(() => load("exercises", defaultExercises));
  const [programs, setPrograms] = useState(() => load("programs", defaultPrograms));
  const [categories, setCategories] = useState(() => load("categories", defaultCategories));
  const [history, setHistory] = useState(() => load("history", []));
  const [restPrefs, setRestPrefs] = useState(() => load("restPrefs", {}));
  const [safeBottom, setSafeBottom] = useState(0);

  useEffect(() => { save("exercises", exercises); }, [exercises]);
  useEffect(() => { save("programs", programs); }, [programs]);
  useEffect(() => { save("categories", categories); }, [categories]);
  useEffect(() => { save("history", history); }, [history]);
  useEffect(() => { save("restPrefs", restPrefs); }, [restPrefs]);
  useEffect(() => { save("darkMode", dark); }, [dark]);

  // Measure real safe area inset — works reliably in iOS PWA
  useEffect(() => {
    function measure() {
      const el = document.createElement("div");
      el.style.cssText = "position:fixed;bottom:0;left:0;width:1px;height:env(safe-area-inset-bottom,0px);pointer-events:none;visibility:hidden";
      document.body.appendChild(el);
      const h = el.offsetHeight;
      document.body.removeChild(el);
      setSafeBottom(h > 0 ? h : 0);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const d = dark;
  const navBg = d ? "#111114" : "#ffffff";
  const navBorder = d ? T.borderDark : T.border;
  const NAV_H = 58 + safeBottom;

  return (
    <div style={{ fontFamily: "-apple-system, 'Inter', 'Segoe UI', sans-serif", background: d ? T.bgDark : T.bgPage, minHeight: "100vh", color: d ? T.dTextPrimary : T.textPrimary, width: "100%" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
        input,select,textarea{font-family:inherit;font-size:16px!important}
        .btn{border:none;cursor:pointer;font-family:inherit;transition:transform 0.1s,opacity 0.1s}
        .btn:active{transform:scale(0.93);opacity:0.82}
        @keyframes fu{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        .fu{animation:fu 0.22s ease forwards}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#ccc;border-radius:2px}
      `}</style>

      <div style={{ paddingBottom: NAV_H }}>
        {tab === "timer" && <TimerScreen d={d} programs={programs} exercises={exercises} setExercises={setExercises} history={history} setHistory={setHistory} restPrefs={restPrefs} setRestPrefs={setRestPrefs} />}
        {tab === "programs" && <ProgramsScreen d={d} programs={programs} setPrograms={setPrograms} exercises={exercises} />}
        {tab === "exercises" && <ExercisesScreen d={d} exercises={exercises} setExercises={setExercises} categories={categories} setCategories={setCategories} history={history} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: navBg, borderTop: `1px solid ${navBorder}`, display: "flex", zIndex: 100, paddingBottom: safeBottom }}>
        {[{ id: "timer", label: L.navTimer, icon: "timer" }, { id: "programs", label: L.navPrograms, icon: "programs" }, { id: "exercises", label: L.navExercises, icon: "exercises" }].map(t => (
          <button key={t.id} className="btn" onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "10px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", color: tab === t.id ? T.accent : (d ? T.dTextMuted : T.textMuted) }}>
            <Icon name={t.icon} size={21} />
            <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
          </button>
        ))}
        <button className="btn" onClick={() => setDark(v => !v)}
          style={{ width: 56, padding: "10px 0 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", color: d ? T.dTextMuted : T.textMuted, borderLeft: `1px solid ${navBorder}` }}>
          <Icon name={d ? "sun" : "moon"} size={21} />
          <span style={{ fontSize: 10, fontWeight: 600 }}>{d ? L.navLight : L.navDark}</span>
        </button>
      </div>
    </div>
  );
}

// ─── TIMER SCREEN ─────────────────────────────────────────────────
function TimerScreen({ d, programs, exercises, setExercises, history, setHistory, restPrefs, setRestPrefs }) {
  const [selectedId, setSelectedId] = useState(null);
  const [session, setSession] = useState(null);

  if (session) return <ActiveSession d={d} session={session} setSession={setSession} exercises={exercises} setExercises={setExercises} history={history} setHistory={setHistory} restPrefs={restPrefs} setRestPrefs={setRestPrefs} />;

  const grad = d ? "linear-gradient(160deg,#1a1f3a 0%,#151518 58%)" : "linear-gradient(160deg,#1e3a8a 0%,#2563eb 48%,#f5f4f0 100%)";

  return (
    <div className="fu">
      <HeroHeader d={d} gradient={grad}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{L.appName}</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: "#fff", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{L.timerHeadline.split("\n").map((l,i)=><span key={i}>{l}{i===0&&<br/>}</span>)}</div>
      </HeroHeader>

      <div style={{ padding: "20px 16px" }}>
        <Lbl d={d} style={{ marginBottom: 12 }}>{L.timerSelectProgram}</Lbl>
        {programs.length === 0 ? (
          <Card d={d} style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 13, color: d ? T.dTextMuted : T.textMuted }}>{L.timerNoProgramsYet}</div>
            <div style={{ fontSize: 12, marginTop: 6, color: d ? T.dTextMuted : T.textMuted, opacity: 0.6 }}>{L.timerNoProgramsHint}</div>
          </Card>
        ) : programs.map(p => {
          const sel = selectedId === p.id;
          const names = p.exercises.slice(0, 3).map(pe => exercises.find(e => e.id === pe.exerciseId)?.name || "?").join(", ");
          return (
            <div key={p.id} onClick={() => setSelectedId(sel ? null : p.id)}
              style={{ background: sel ? (d ? "#1e2d4a" : "#eff6ff") : (d ? T.bgDarkCard : T.bgCard), border: `1.5px solid ${sel ? T.accent : (d ? T.borderDark : T.border)}`, borderRadius: 14, padding: "16px 18px", marginBottom: 10, cursor: "pointer", transition: "all 0.15s" }}>
              <div style={{ fontWeight: 600, fontSize: 16, color: sel ? T.accent : (d ? T.dTextPrimary : T.textPrimary) }}>{p.name}</div>
              <div style={{ fontSize: 12, color: d ? T.dTextMuted : T.textMuted, marginTop: 4 }}>{L.timerExercisesLabel(p.exercises.length)} · {names}{p.exercises.length > 3 ? "…" : ""}</div>
            </div>
          );
        })}
        {selectedId && (
          <button className="btn" onClick={() => {
            const prog = programs.find(p => p.id === selectedId);
            if (prog) setSession({ prog, exIdx: 0, setIdx: 0, phase: "work", sets: [] });
          }} style={{ width: "100%", marginTop: 8, padding: "15px", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 16, borderRadius: 14 }}>
            {L.timerStartBtn}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ACTIVE SESSION ───────────────────────────────────────────────
function ActiveSession({ d, session, setSession, exercises, setExercises, history, setHistory, restPrefs, setRestPrefs }) {
  const wakeLockRef = useRef(null);
  useEffect(() => {
    async function lock() {
      try { if ("wakeLock" in navigator) { wakeLockRef.current = await navigator.wakeLock.request("screen"); wakeLockRef.current.addEventListener("release", lock); } } catch {}
    }
    lock();
    return () => { if (wakeLockRef.current) { wakeLockRef.current.release().catch(() => {}); wakeLockRef.current = null; } };
  }, []);

  if (session.done) {
    const { changes, totalSets: ts, prog: p } = session;
    return (
      <div className="fu" style={{ padding: "24px 16px", minHeight: "100vh", background: d ? T.bgDark : T.bgPage }}>
        <div style={{ textAlign: "center", marginBottom: 32, marginTop: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.successLight, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: T.success }}>
            <Icon name="check" size={28} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em" }}>{L.doneTitle}</div>
          <div style={{ fontSize: 13, color: d ? T.dTextMuted : T.textMuted, marginTop: 6 }}>{p.name} · {L.doneSets(ts)}</div>
        </div>
        {changes.length > 0 ? (
          <div style={{ marginBottom: 24 }}>
            <Lbl d={d} style={{ marginBottom: 12 }}>{L.doneAutoProgLabel}</Lbl>
            {changes.map((c, i) => (
              <Card d={d} key={i} style={{ marginBottom: 10, borderColor: c.delta > 0 ? "#86efac" : "#fca5a5", background: c.delta > 0 ? (d ? "#0f2318" : T.successLight) : (d ? "#2a0f0f" : T.dangerLight) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</span>
                  <span style={{ fontWeight: 700, fontSize: 18, color: c.delta > 0 ? T.success : T.danger }}>{c.delta > 0 ? "+" : ""}{c.delta}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: d ? T.dTextMuted : T.textMuted }}>{L.doneMaxCount}</span>
                  <span style={{ fontSize: 13, color: d ? T.dTextMuted : T.textMuted, textDecoration: "line-through" }}>{c.oldMax}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: c.delta > 0 ? T.success : T.danger }}>→ {c.newMax}</span>
                </div>
                <div style={{ fontSize: 12, color: d ? T.dTextSecondary : T.textSecondary }}>{c.reason}</div>
              </Card>
            ))}
          </div>
        ) : (
          <Card d={d} style={{ marginBottom: 24, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: d ? T.dTextMuted : T.textMuted }}>{L.doneNoChanges}</div>
            <div style={{ fontSize: 12, marginTop: 6, color: d ? T.dTextMuted : T.textMuted, opacity: 0.6 }}>{L.doneNoChangesHint}</div>
          </Card>
        )}
        <button className="btn" onClick={() => setSession(null)} style={{ width: "100%", padding: "15px", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 16, borderRadius: 14 }}>
          {L.doneBackBtn}
        </button>
      </div>
    );
  }

  const { prog, exIdx, setIdx, phase, sets } = session;
  const progEx = prog.exercises[exIdx];
  const exercise = exercises.find(e => e.id === progEx?.exerciseId);
  const plannedSets = generateSets(exercise?.max || 10);
  const totalSets = progEx?.sets || plannedSets.length;
  const plannedReps = plannedSets[setIdx]?.reps || plannedSets[plannedSets.length - 1]?.reps || 8;
  const restKey = `${prog.id}_${progEx?.exerciseId}`;
  const isLastSet = setIdx >= totalSets - 1;
  const isLastEx = exIdx >= prog.exercises.length - 1;
  const defSetRest = restPrefs[restKey + "_set"] ?? (progEx?.restBetweenSets || 90);
  const defExRest = restPrefs[restKey + "_ex"] ?? (progEx?.restAfterExercise || 120);
  const restDur = phase === "rest_set" ? defSetRest : defExRest;

  const [reps, setReps] = useState(plannedReps);
  const [timerVal, setTimerVal] = useState(restDur);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => { setReps(plannedReps); }, [exIdx, setIdx]);
  useEffect(() => {
    if (phase === "rest_set" || phase === "rest_ex") { setTimerVal(restDur); setTimerRunning(true); }
    else setTimerRunning(false);
  }, [phase, exIdx, setIdx]);
  useEffect(() => {
    if (timerRunning && timerVal > 0) {
      if (timerVal <= 3) beepTick();
      timerRef.current = setTimeout(() => setTimerVal(v => v - 1), 1000);
    } else if (timerRunning && timerVal === 0) {
      setTimerRunning(false);
      if (phase === "rest_ex") beepExerciseStart(); else beepStart();
    }
    return () => clearTimeout(timerRef.current);
  }, [timerRunning, timerVal]);

  const saveRest = (key, val) => setRestPrefs(p => ({ ...p, [key]: val }));

  const handleDone = () => {
    const newSet = { exerciseId: progEx.exerciseId, setIdx, reps, planned: plannedReps };
    const newSets = [...sets, newSet];
    if (!isLastSet) {
      setSession(s => ({ ...s, setIdx: s.setIdx + 1, phase: "rest_set", sets: newSets }));
    } else if (!isLastEx) {
      beepExerciseDone();
      setSession(s => ({ ...s, exIdx: s.exIdx + 1, setIdx: 0, phase: "rest_ex", sets: newSets }));
    } else {
      const record = { date: new Date().toISOString(), programId: prog.id, programName: prog.name, sets: newSets };
      const newHistory = [record, ...history].slice(0, 100);
      setHistory(newHistory);
      const exIds = [...new Set(newSets.map(s => s.exerciseId))];
      const changes = []; const updated = [...exercises];
      exIds.forEach(eid => {
        const idx = updated.findIndex(e => e.id === eid); if (idx === -1) return;
        const ex = updated[idx];
        const { delta, reason } = calcProgressionAdjustment(eid, newHistory);
        if (delta !== 0) { const newMax = Math.max(1, (ex.max || 1) + delta); updated[idx] = { ...ex, max: newMax }; changes.push({ name: ex.name, oldMax: ex.max || 1, newMax, delta, reason }); }
      });
      if (changes.length > 0) setExercises(updated);
      setSession({ done: true, changes, totalSets: newSets.length, prog });
    }
  };

  const handleRestDone = () => {
    saveRest(phase === "rest_set" ? restKey + "_set" : restKey + "_ex", timerVal === 0 ? (phase === "rest_set" ? defSetRest : defExRest) : timerVal);
    setSession(s => ({ ...s, phase: "work" })); setTimerRunning(false);
  };

  const mins = Math.floor(timerVal / 60);
  const secs = timerVal % 60;

  if (phase === "work") {
    const grad = d ? "linear-gradient(160deg,#1a2540 0%,#151518 60%)" : "linear-gradient(160deg,#1e3a8a 0%,#2563eb 55%,#f5f4f0 100%)";
    return (
      <div style={{ background: d ? T.bgDark : T.bgPage, minHeight: "100vh" }}>
        <HeroHeader d={d} gradient={grad}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
            <button className="btn" onClick={() => setSession(null)} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
              <Icon name="back" size={18} />
            </button>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{prog.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", marginTop: 2 }}>{L.sessionExerciseOf(exIdx + 1, prog.exercises.length)}</div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{L.sessionSetOf(setIdx + 1, totalSets)}</div>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", lineHeight: 1.1 }}>{exercise?.name || "?"}</div>
          {exercise?.max > 0 && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 5 }}>{L.sessionMaxLabel(exercise.max)}</div>}
        </HeroHeader>

        <div style={{ padding: "28px 16px" }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <Lbl d={d} style={{ marginBottom: 16, textAlign: "center" }}>{L.sessionRepsDone}</Lbl>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 28 }}>
              <RBtn d={d} onClick={() => setReps(v => Math.max(0, v - 1))} size={52}><Icon name="minus" size={20} /></RBtn>
              <div>
                <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1, letterSpacing: "-0.04em", color: reps > plannedReps ? T.success : reps < plannedReps ? T.danger : T.accent }}>{reps}</div>
                <div style={{ fontSize: 12, color: d ? T.dTextMuted : T.textMuted, marginTop: 2 }}>{L.sessionPlan(plannedReps)}</div>
              </div>
              <RBtn d={d} onClick={() => setReps(v => v + 1)} size={52}><Icon name="plus" size={20} /></RBtn>
            </div>
          </div>

          <button className="btn" onClick={handleDone} style={{ width: "100%", padding: "15px", background: T.accent, color: "#fff", fontWeight: 700, fontSize: 17, borderRadius: 14, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Icon name="check" size={20} /> {L.sessionDoneBtn}
          </button>

          <Lbl d={d} style={{ marginBottom: 10 }}>{L.sessionSetsLabel}</Lbl>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {Array.from({ length: totalSets }, (_, i) => {
              const done = i < setIdx; const cur = i === setIdx;
              const rep = plannedSets[i]?.reps || plannedReps;
              return (
                <div key={i} style={{ width: 48, height: 48, borderRadius: 10, border: `1.5px solid ${cur ? T.accent : done ? (d ? "#2a4a2a" : "#86efac") : (d ? T.borderDark : T.border)}`, background: done ? (d ? "#0f2318" : T.successLight) : cur ? (d ? "#1e2d4a" : T.accentLight) : (d ? T.bgDarkCard : T.bgCard), display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {done ? <span style={{ color: T.success }}><Icon name="check" size={18} /></span> : <span style={{ fontSize: 16, fontWeight: 700, color: cur ? T.accent : (d ? T.dTextMuted : T.textMuted) }}>{rep}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // REST
  const isRestSet = phase === "rest_set";
  const progress = restDur > 0 ? timerVal / restDur : 0;
  const nextEx = exercises.find(e => e.id === prog.exercises[exIdx + 1]?.exerciseId);
  const restGrad = isRestSet
    ? (d ? "linear-gradient(160deg,#1a2a1a 0%,#151518 60%)" : "linear-gradient(160deg,#14532d 0%,#16a34a 55%,#f5f4f0 100%)")
    : (d ? "linear-gradient(160deg,#2a1a1a 0%,#151518 60%)" : "linear-gradient(160deg,#7c2d12 0%,#ea580c 55%,#f5f4f0 100%)");

  return (
    <div style={{ background: d ? T.bgDark : T.bgPage, minHeight: "100vh" }}>
      <HeroHeader d={d} gradient={restGrad}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
          {isRestSet ? L.sessionRestBetweenSets : L.sessionRestBetweenEx}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
          {isRestSet ? `${exercise?.name || "?"} · ${L.sessionSetLabel(setIdx + 1, totalSets)}` : L.sessionNextEx(nextEx?.name || "?")}
        </div>
      </HeroHeader>

      <div style={{ padding: "32px 16px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ position: "relative", width: 200, height: 200, marginBottom: 24 }}>
          <svg width="200" height="200" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
            <circle cx="100" cy="100" r="88" fill="none" stroke={d ? T.borderDark : T.border} strokeWidth="6" />
            <circle cx="100" cy="100" r="88" fill="none" stroke={isRestSet ? T.accent : "#ea580c"} strokeWidth="6"
              strokeDasharray={`${2 * Math.PI * 88}`} strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress)}`}
              strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: 58, fontWeight: 700, letterSpacing: "-0.04em", color: timerVal <= 3 ? T.danger : (d ? T.dTextPrimary : T.textPrimary), transition: "color 0.3s", lineHeight: 1 }}>
              {mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : secs}
            </div>
            <div style={{ fontSize: 11, color: d ? T.dTextMuted : T.textMuted, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>{L.sessionSeconds}</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 28 }}>
          <RBtn d={d} onClick={() => { const nv = Math.max(0, timerVal - 30); setTimerVal(nv); saveRest(isRestSet ? restKey + "_set" : restKey + "_ex", nv); }}><Icon name="minus" size={16} /></RBtn>
          <span style={{ fontSize: 12, color: d ? T.dTextMuted : T.textMuted, fontWeight: 500 }}>{L.sessionAdjust}</span>
          <RBtn d={d} onClick={() => { const nv = timerVal + 30; setTimerVal(nv); saveRest(isRestSet ? restKey + "_set" : restKey + "_ex", nv); }}><Icon name="plus" size={16} /></RBtn>
        </div>

        <button className="btn" onClick={handleRestDone}
          style={{ width: "100%", padding: "15px", background: timerVal === 0 ? T.accent : (d ? T.bgDarkCard : T.bgCard), border: timerVal === 0 ? "none" : `1px solid ${d ? T.borderDark : T.border}`, color: timerVal === 0 ? "#fff" : (d ? T.dTextPrimary : T.textPrimary), fontWeight: 700, fontSize: 16, borderRadius: 14, transition: "all 0.25s" }}>
          {timerVal === 0 ? L.sessionContinue : L.sessionSkipRest}
        </button>
      </div>
    </div>
  );
}

// ─── PROGRAMS SCREEN ──────────────────────────────────────────────
function ProgramsScreen({ d, programs, setPrograms, exercises }) {
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);

  if (creating || editing) return (
    <ProgramEditor d={d} program={editing} exercises={exercises}
      onSave={prog => { if (editing) setPrograms(ps => ps.map(p => p.id === prog.id ? prog : p)); else setPrograms(ps => [...ps, { ...prog, id: "p" + Date.now() }]); setEditing(null); setCreating(false); }}
      onCancel={() => { setEditing(null); setCreating(false); }}
    />
  );

  const grad = d ? "linear-gradient(160deg,#1a1a2e 0%,#151518 58%)" : "linear-gradient(160deg,#312e81 0%,#4f46e5 48%,#f5f4f0 100%)";

  return (
    <div style={{ background: d ? T.bgDark : T.bgPage, minHeight: "100vh" }}>
      <HeroHeader d={d} gradient={grad}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{L.programsManage}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{L.programsTitle}</div>
          </div>
          <button className="btn" onClick={() => setCreating(true)} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="plus" size={20} />
          </button>
        </div>
      </HeroHeader>

      <div style={{ padding: "16px 16px" }}>
        {programs.length === 0 && <Card d={d} style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 13, color: d ? T.dTextMuted : T.textMuted }}>{L.programsNone}</div></Card>}
        {programs.map(p => {
          const names = p.exercises.map(pe => exercises.find(e => e.id === pe.exerciseId)?.name || "?").join(" → ");
          return (
            <Card d={d} key={p.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 16, color: d ? T.dTextPrimary : T.textPrimary }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: d ? T.dTextMuted : T.textMuted, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{names || L.programsNoExercises}</div>
                  <div style={{ fontSize: 11, color: T.accent, marginTop: 6, fontWeight: 600 }}>{L.programsExCount(p.exercises.length)}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => setEditing(p)} style={{ width: 34, height: 34, borderRadius: 9, background: d ? T.bgDarkCardAlt : T.bgCardAlt, border: `1px solid ${d ? T.borderDark : T.border}`, color: T.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="edit" size={14} /></button>
                  <button className="btn" onClick={() => setPrograms(ps => ps.filter(x => x.id !== p.id))} style={{ width: 34, height: 34, borderRadius: 9, background: d ? "#2a0f0f" : T.dangerLight, border: `1px solid ${d ? "#5a1a1a" : "#fca5a5"}`, color: T.danger, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="trash" size={14} /></button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function ProgramEditor({ d, program, exercises, onSave, onCancel }) {
  const [name, setName] = useState(program?.name || "");
  const [items, setItems] = useState(program?.exercises || []);
  const [selEx, setSelEx] = useState(exercises[0]?.id || "");
  const inp = { width: "100%", background: d ? T.bgDarkCard : T.bgCard, border: `1px solid ${d ? T.borderDark : T.border}`, borderRadius: 10, padding: "11px 14px", color: d ? T.dTextPrimary : T.textPrimary, fontSize: 14, outline: "none" };
  const upd = (i, f, v) => setItems(p => p.map((it, idx) => idx === i ? { ...it, [f]: v } : it));

  return (
    <div style={{ background: d ? T.bgDark : T.bgPage, minHeight: "100vh", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <RBtn d={d} onClick={onCancel}><Icon name="back" size={20} /></RBtn>
        <div style={{ fontWeight: 700, fontSize: 20, color: d ? T.dTextPrimary : T.textPrimary }}>{program ? L.programEditTitle : L.programNewTitle}</div>
      </div>
      <Lbl d={d} style={{ marginBottom: 6 }}>{L.programNameLabel}</Lbl>
      <input value={name} onChange={e => setName(e.target.value)} placeholder={L.programNamePlaceholder} style={{ ...inp, marginBottom: 20 }} />
      <Lbl d={d} style={{ marginBottom: 10 }}>{L.programExLabel}</Lbl>
      {items.map((item, i) => {
        const ex = exercises.find(e => e.id === item.exerciseId);
        return (
          <Card d={d} key={i} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 600, fontSize: 14, color: T.accent }}>{ex?.name || "?"}</span>
              <button className="btn" onClick={() => setItems(p => p.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: T.danger, padding: 4 }}><Icon name="trash" size={16} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              {[[L.programSets, "sets"], [L.programSetRest, "restBetweenSets"], [L.programExRest, "restAfterExercise"]].map(([label, f]) => (
                <div key={f}>
                  <div style={{ fontSize: 10, color: d ? T.dTextMuted : T.textMuted, fontWeight: 600, marginBottom: 4 }}>{label}</div>
                  <input type="number" value={item[f]} onChange={e => upd(i, f, parseInt(e.target.value) || 0)}
                    style={{ width: "100%", background: d ? T.bgDarkCardAlt : T.bgCardAlt, border: `1px solid ${d ? T.borderDark : T.border}`, borderRadius: 8, padding: "7px 8px", color: d ? T.dTextPrimary : T.textPrimary, fontSize: 16, textAlign: "center", outline: "none" }} />
                </div>
              ))}
            </div>
          </Card>
        );
      })}
      <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
        <select value={selEx} onChange={e => setSelEx(e.target.value)} style={{ ...inp, flex: 1 }}>
          {exercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
        <button className="btn" onClick={() => selEx && setItems(p => [...p, { exerciseId: selEx, sets: 5, restBetweenSets: 90, restAfterExercise: 120 }])}
          style={{ padding: "11px 16px", background: d ? T.bgDarkCard : T.bgCard, border: `1px solid ${d ? T.borderDark : T.border}`, borderRadius: 10, color: T.accent, fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
          <Icon name="plus" size={16} /> {L.programAddBtn}
        </button>
      </div>
      <button className="btn" onClick={() => name && onSave({ ...(program || {}), name, exercises: items })}
        disabled={!name} style={{ width: "100%", padding: "15px", background: name ? T.accent : (d ? T.bgDarkCard : T.bgCardAlt), color: name ? "#fff" : (d ? T.dTextMuted : T.textMuted), fontWeight: 700, fontSize: 16, borderRadius: 14 }}>
        {L.programSaveBtn}
      </button>
    </div>
  );
}

// ─── EXERCISES SCREEN ─────────────────────────────────────────────
function ExercisesScreen({ d, exercises, setExercises, categories, setCategories, history }) {
  const [view, setView] = useState("list");
  const [sel, setSel] = useState(null);
  const [filterCat, setFilterCat] = useState(() => L.exercisesAll);

  if (view === "edit") return (
    <ExerciseEditor d={d} exercise={sel} categories={categories} setCategories={setCategories} exercises={exercises}
      onSave={ex => { if (sel) setExercises(es => es.map(e => e.id === ex.id ? ex : e)); else setExercises(es => [...es, { ...ex, id: "e" + Date.now() }]); setView("list"); setSel(null); }}
      onCancel={() => { setView("list"); setSel(null); }}
    />
  );
  if (view === "detail" && sel) return (
    <ExerciseDetail d={d} exercise={sel} history={history}
      onEdit={() => setView("edit")}
      onBack={() => { setView("list"); setSel(null); }}
      onUpdateMax={max => { setExercises(es => es.map(e => e.id === sel.id ? { ...e, max } : e)); setSel(s => ({ ...s, max })); }}
    />
  );

  const allCats = [L.exercisesAll, ...[...new Set(exercises.map(e => e.category))]];
  const filtered = filterCat === L.exercisesAll ? exercises : exercises.filter(e => e.category === filterCat);
  const grad = d ? "linear-gradient(160deg,#1a1228 0%,#151518 58%)" : "linear-gradient(160deg,#4c1d95 0%,#7c3aed 48%,#f5f4f0 100%)";

  return (
    <div style={{ background: d ? T.bgDark : T.bgPage, minHeight: "100vh" }}>
      <HeroHeader d={d} gradient={grad}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>{L.exercisesManage}</div>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{L.exercisesTitle}</div>
          </div>
          <button className="btn" onClick={() => { setSel(null); setView("edit"); }} style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="plus" size={20} />
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
          {allCats.map(cat => (
            <button key={cat} className="btn" onClick={() => setFilterCat(cat)}
              style={{ whiteSpace: "nowrap", padding: "6px 14px", borderRadius: 20, background: filterCat === cat ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.15)", border: "none", color: filterCat === cat ? "#1e1e24" : "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: 600 }}>
              {cat}
            </button>
          ))}
        </div>
      </HeroHeader>

      <div style={{ padding: "16px 16px" }}>
        {filtered.map(ex => (
          <div key={ex.id} onClick={() => { setSel(ex); setView("detail"); }}
            style={{ background: d ? T.bgDarkCard : T.bgCard, border: `1px solid ${d ? T.borderDark : T.border}`, borderRadius: 14, padding: "14px 18px", marginBottom: 8, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: d ? T.dTextPrimary : T.textPrimary }}>{ex.name}</div>
              <div style={{ fontSize: 12, color: d ? T.dTextMuted : T.textMuted, marginTop: 3 }}>{ex.category}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: T.accent, lineHeight: 1 }}>{ex.max || "–"}</div>
              <div style={{ fontSize: 10, color: d ? T.dTextMuted : T.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{L.exercisesMaxLabel}</div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <Card d={d} style={{ textAlign: "center", padding: 40 }}><div style={{ fontSize: 13, color: d ? T.dTextMuted : T.textMuted }}>{L.exercisesNone}</div></Card>}
      </div>
    </div>
  );
}

function ExerciseEditor({ d, exercise, categories, setCategories, exercises, onSave, onCancel }) {
  // Only show categories that have at least one exercise (excluding the current one being edited)
  const usedCats = [...new Set(
    (exercises || [])
      .filter(e => !exercise || e.id !== exercise.id)
      .map(e => e.category)
  )];
  // If editing, always include the current exercise's own category
  const availableCats = exercise?.category && !usedCats.includes(exercise.category)
    ? [...usedCats, exercise.category]
    : usedCats;

  const [name, setName] = useState(exercise?.name || "");
  const [category, setCategory] = useState(exercise?.category || availableCats[0] || "");
  const [max, setMax] = useState(exercise?.max || 0);
  const [newCat, setNewCat] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const inp = { width: "100%", background: d ? T.bgDarkCard : T.bgCard, border: `1px solid ${d ? T.borderDark : T.border}`, borderRadius: 10, padding: "11px 14px", color: d ? T.dTextPrimary : T.textPrimary, fontSize: 16, outline: "none" };

  return (
    <div style={{ background: d ? T.bgDark : T.bgPage, minHeight: "100vh", padding: "24px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <RBtn d={d} onClick={onCancel}><Icon name="back" size={20} /></RBtn>
        <div style={{ fontWeight: 700, fontSize: 20, color: d ? T.dTextPrimary : T.textPrimary }}>{exercise ? L.exerciseEditTitle : L.exerciseNewTitle}</div>
      </div>
      <Lbl d={d} style={{ marginBottom: 6 }}>{L.exerciseNameLabel}</Lbl>
      <input value={name} onChange={e => setName(e.target.value)} placeholder={L.exerciseNamePlaceholder} style={{ ...inp, marginBottom: 20 }} />
      <Lbl d={d} style={{ marginBottom: 10 }}>{L.exerciseMaxLabel}</Lbl>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <RBtn d={d} onClick={() => setMax(v => Math.max(0, v - 1))} size={48}><Icon name="minus" size={18} /></RBtn>
        <div style={{ flex: 1, textAlign: "center", fontSize: 56, fontWeight: 700, color: T.accent, letterSpacing: "-0.04em" }}>{max}</div>
        <RBtn d={d} onClick={() => setMax(v => v + 1)} size={48}><Icon name="plus" size={18} /></RBtn>
      </div>
      <Lbl d={d} style={{ marginBottom: 10 }}>{L.exerciseCategoryLabel}</Lbl>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {availableCats.map(cat => (
          <button key={cat} className="btn" onClick={() => setCategory(cat)}
            style={{ padding: "7px 16px", borderRadius: 20, background: category === cat ? T.accent : (d ? T.bgDarkCard : T.bgCardAlt), border: `1px solid ${category === cat ? T.accent : (d ? T.borderDark : T.border)}`, color: category === cat ? "#fff" : (d ? T.dTextSecondary : T.textSecondary), fontSize: 13, fontWeight: 500 }}>
            {cat}
          </button>
        ))}
        <button className="btn" onClick={() => setAddingCat(v => !v)}
          style={{ padding: "7px 16px", borderRadius: 20, background: "transparent", border: `1px dashed ${d ? T.borderDark : T.border}`, color: d ? T.dTextMuted : T.textMuted, fontSize: 13 }}>
          {L.exerciseNewCatBtn}
        </button>
      </div>
      {addingCat && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input value={newCat} onChange={e => setNewCat(e.target.value)} placeholder={L.exerciseCatPlaceholder} style={{ ...inp, flex: 1 }} />
          <button className="btn" onClick={() => { if (newCat.trim()) { setCategories(cs => [...cs, newCat.trim()]); setCategory(newCat.trim()); setNewCat(""); setAddingCat(false); } }}
            style={{ padding: "11px 16px", background: T.accent, color: "#fff", borderRadius: 10, fontWeight: 600, fontSize: 14, whiteSpace: "nowrap" }}>{L.exerciseCatOkBtn}</button>
        </div>
      )}
      <button className="btn" onClick={() => name && onSave({ ...(exercise || {}), name, category, max })}
        disabled={!name} style={{ width: "100%", padding: "15px", marginTop: 8, background: name ? T.accent : (d ? T.bgDarkCard : T.bgCardAlt), color: name ? "#fff" : (d ? T.dTextMuted : T.textMuted), fontWeight: 700, fontSize: 16, borderRadius: 14 }}>
        {L.exerciseSaveBtn}
      </button>
    </div>
  );
}

function ExerciseDetail({ d, exercise, history, onEdit, onBack, onUpdateMax }) {
  const sets = generateSets(exercise.max);
  const exHistory = history.flatMap(h => h.sets.filter(s => s.exerciseId === exercise.id)).slice(0, 20);
  const bestRecent = exHistory.length > 0 ? Math.max(...exHistory.map(s => s.reps)) : null;
  const grad = d ? "linear-gradient(160deg,#1a1228 0%,#151518 58%)" : "linear-gradient(160deg,#4c1d95 0%,#7c3aed 48%,#f5f4f0 100%)";

  return (
    <div style={{ background: d ? T.bgDark : T.bgPage, minHeight: "100vh" }}>
      <HeroHeader d={d} gradient={grad}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <button className="btn" onClick={onBack} style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>
            <Icon name="back" size={18} />
          </button>
          <button className="btn" onClick={onEdit} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.2)", border: "none", borderRadius: 10, color: "#fff", fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="edit" size={14} /> {L.exerciseEditBtn}
          </button>
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>{exercise.category}</div>
        <div style={{ fontSize: 30, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>{exercise.name}</div>
      </HeroHeader>

      <div style={{ padding: "20px 16px" }}>
        <Card d={d} style={{ marginBottom: 14 }}>
          <Lbl d={d} style={{ marginBottom: 14 }}>{L.exerciseDetailMaxLabel}</Lbl>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <RBtn d={d} onClick={() => onUpdateMax(Math.max(0, (exercise.max || 0) - 1))} size={48}><Icon name="minus" size={18} /></RBtn>
            <div style={{ flex: 1, textAlign: "center", fontSize: 68, fontWeight: 700, color: T.accent, letterSpacing: "-0.04em", lineHeight: 1 }}>{exercise.max || 0}</div>
            <RBtn d={d} onClick={() => onUpdateMax((exercise.max || 0) + 1)} size={48}><Icon name="plus" size={18} /></RBtn>
          </div>
          {bestRecent && bestRecent > exercise.max && (
            <div style={{ marginTop: 14, fontSize: 13, color: T.success, textAlign: "center", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon name="fire" size={14} /> {L.exerciseDetailRecord(bestRecent)}
            </div>
          )}
        </Card>

        {exercise.max > 0 && (
          <Card d={d} style={{ marginBottom: 14 }}>
            <Lbl d={d} style={{ marginBottom: 14 }}>{L.exerciseDetailProgLabel}</Lbl>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              {sets.map((s, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ width: 48, height: 48, borderRadius: 10, background: d ? T.bgDarkCardAlt : T.accentLight, border: `1px solid ${d ? T.borderDark : "#bfdbfe"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: T.accent }}>{s.reps}</div>
                  <div style={{ fontSize: 10, color: d ? T.dTextMuted : T.textMuted, marginTop: 5, fontWeight: 600 }}>{L.exerciseDetailSetLabel(i + 1)}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: d ? T.dTextMuted : T.textMuted, marginTop: 14, textAlign: "center" }}>{L.exerciseDetailTotal(sets.reduce((a, s) => a + s.reps, 0))}</div>
          </Card>
        )}

        {exHistory.length > 0 && (
          <Card d={d}>
            <Lbl d={d} style={{ marginBottom: 14 }}>{L.exerciseDetailHistory}</Lbl>
            {exHistory.slice(0, 10).map((s, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: i < Math.min(exHistory.length, 10) - 1 ? `1px solid ${d ? T.borderDark : T.border}` : "none" }}>
                <span style={{ fontSize: 13, color: d ? T.dTextMuted : T.textMuted }}>{L.exerciseDetailHistorySet(s.setIdx + 1)}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: s.reps > s.planned ? T.success : s.reps < s.planned ? T.danger : (d ? T.dTextPrimary : T.textPrimary) }}>
                  {L.exerciseDetailReps(s.reps, s.planned)}
                </span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}