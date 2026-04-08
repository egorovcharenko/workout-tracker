import { useState, useEffect, useRef } from "react";

const WORKOUTS = [
  {
    id: "arms-shoulders",
    name: "Arms & Shoulders",
    duration: "~15 min",
    exercises: [
      {
        name: "Overhead Dumbbell Press",
        sets: 3, reps: "10-12",
        notes: "Seated or standing",
        superset: false,
        gif: "https://gymvisual.com/img/p/5/1/4/6/5146.gif",
      },
      {
        name: "Dumbbell Bicep Curls",
        sets: 3, reps: "10-12",
        notes: "Superset with next",
        superset: "A",
        gif: "https://gymvisual.com/img/p/5/0/2/7/5027.gif",
      },
      {
        name: "Overhead Tricep Extension",
        sets: 3, reps: "10-12",
        notes: "Single DB, both hands",
        superset: "A",
        gif: "https://gymvisual.com/img/p/2/7/3/4/2/27342.gif",
      },
    ],
    rest: 60,
    warmup: "A few light sets to warm up elbows and wrists",
  },
];

const WEIGHTS_LB = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50];
const lbToKg = (lb) => (lb * 0.453592).toFixed(1);

const weightColor = (lb, selected) => {
  if (selected) return "bg-blue-500 text-white shadow-sm ring-2 ring-blue-300";
  const i = WEIGHTS_LB.indexOf(lb);
  const colors = [
    "bg-emerald-50 text-emerald-700 border border-emerald-200",
    "bg-emerald-100 text-emerald-800 border border-emerald-300",
    "bg-lime-100 text-lime-800 border border-lime-300",
    "bg-yellow-100 text-yellow-800 border border-yellow-300",
    "bg-amber-100 text-amber-800 border border-amber-300",
    "bg-orange-100 text-orange-800 border border-orange-300",
    "bg-orange-200 text-orange-900 border border-orange-400",
    "bg-red-100 text-red-800 border border-red-300",
    "bg-red-200 text-red-900 border border-red-400",
    "bg-red-300 text-red-950 border border-red-500",
  ];
  return colors[i] || colors[0];
};

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function RestTimer({ duration, onDone }) {
  const [left, setLeft] = useState(duration);
  const ref = useRef(null);
  useEffect(() => {
    ref.current = setInterval(() => setLeft((l) => l - 1), 1000);
    return () => clearInterval(ref.current);
  }, []);
  useEffect(() => {
    if (left <= 0) { clearInterval(ref.current); onDone(); }
  }, [left, onDone]);
  const pct = ((duration - left) / duration) * 100;
  const isLow = left <= 10;
  return (
    <div className="flex flex-col items-center gap-3 py-6">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Rest</p>
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle cx="50" cy="50" r="45" fill="none" stroke={isLow ? "#ef4444" : "#3b82f6"} strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 45}`} strokeDashoffset={`${2 * Math.PI * 45 * (1 - pct / 100)}`}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <span className={`text-3xl font-bold ${isLow ? "text-red-500" : "text-blue-600"}`}>{left}</span>
      </div>
      <button onClick={onDone} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">Skip →</button>
    </div>
  );
}

function SetRow({ label, labelStyle, done, onToggle, weight, onWeightChange, reps }) {
  return (
    <div className="border-b border-gray-50 last:border-0 py-2">
      <div className="flex items-center gap-2 mb-1.5">
        <button onClick={onToggle}
          className={`w-8 h-8 rounded-full font-semibold text-xs transition-all duration-200 shrink-0 ${
            done ? labelStyle.done : labelStyle.idle
          }`}>
          {done ? "✓" : label}
        </button>
        <span className="text-xs text-gray-500">{reps} reps</span>
        {weight && (
          <span className="text-xs font-mono text-blue-600 ml-auto">
            {weight}lb / {lbToKg(weight)}kg
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1 pl-10">
        {WEIGHTS_LB.map((lb) => (
          <button key={lb} onClick={() => onWeightChange(weight === lb ? null : lb)}
            className={`px-1.5 py-0.5 rounded text-xs font-medium transition-all duration-150 ${weightColor(lb, weight === lb)}`}>
            {lb}
          </button>
        ))}
      </div>
    </div>
  );
}

function WorkoutView({ workout, onBack }) {
  const [completed, setCompleted] = useState({});
  const [resting, setResting] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [weights, setWeights] = useState({});
  const [showGif, setShowGif] = useState({});
  const timerRef = useRef(null);

  const getSetWeight = (exIdx, setKey) => {
    const k = `${exIdx}-${setKey}`;
    if (weights[k] != null) return weights[k];
    if (typeof setKey === "number" && setKey > 0) return getSetWeight(exIdx, setKey - 1);
    if (typeof setKey === "number" && setKey === 0) {
      const wk = `${exIdx}-warmup`;
      if (weights[wk] != null) return weights[wk];
    }
    if (exIdx > 0) {
      const prev = workout.exercises[exIdx - 1];
      return getSetWeight(exIdx - 1, prev.sets - 1);
    }
    return null;
  };

  const setWeight = (exIdx, setKey, lb) => setWeights((w) => ({ ...w, [`${exIdx}-${setKey}`]: lb }));

  useEffect(() => {
    if (running) { timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000); }
    else { clearInterval(timerRef.current); }
    return () => clearInterval(timerRef.current);
  }, [running]);

  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets + 1, 0);
  const completedCount = Object.values(completed).filter(Boolean).length;
  const allDone = completedCount === totalSets;

  const toggleSet = (exIdx, setIdx) => {
    const key = `${exIdx}-${setIdx}`;
    const was = completed[key];
    setCompleted((c) => ({ ...c, [key]: !c[key] }));
    if (!running && !was) setRunning(true);
    if (!was) {
      const ex = workout.exercises[exIdx];
      if (setIdx === ex.sets - 1 && !(ex.superset && workout.exercises[exIdx + 1]?.superset === ex.superset)) {
        setResting(true);
      }
    }
  };

  if (allDone && running) setRunning(false);

  const warmupStyle = { done: "bg-amber-400 text-white shadow-sm scale-95", idle: "bg-amber-50 text-amber-600 border-2 border-dashed border-amber-300 hover:bg-amber-100" };
  const workingStyle = { done: "bg-green-500 text-white shadow-sm scale-95", idle: "bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600" };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 z-10">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-blue-600 text-sm font-medium">← Back</button>
          <span className="text-sm font-mono text-gray-500">{formatTime(elapsed)}</span>
        </div>
        <h2 className="text-lg font-bold mt-1">{workout.name}</h2>
        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${totalSets ? (completedCount / totalSets) * 100 : 0}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{completedCount}/{totalSets} sets</p>
      </div>

      {resting && (
        <div className="border-b border-gray-100">
          <RestTimer duration={workout.rest} onDone={() => setResting(false)} />
        </div>
      )}

      <div className="p-4 space-y-4">
        {workout.warmup && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-800">🔥 <strong>Warm-up:</strong> {workout.warmup}</p>
          </div>
        )}

        {workout.exercises.map((ex, exIdx) => {
          const warmupDone = completed[`${exIdx}-warmup`];
          const exDone = warmupDone && Array.from({ length: ex.sets }).every((_, i) => completed[`${exIdx}-${i}`]);
          const gifVisible = showGif[exIdx];
          return (
            <div key={exIdx} className={`rounded-xl border transition-all duration-300 ${exDone ? "bg-green-50 border-green-200" : "bg-white border-gray-200"}`}>
              {/* Header */}
              <div className="p-4 pb-2">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex-1">
                    <h3 className={`font-semibold ${exDone ? "text-green-700" : "text-gray-900"}`}>{ex.name}</h3>
                    <p className="text-xs text-gray-500">{ex.sets} × {ex.reps} reps</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {ex.superset && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Superset</span>
                    )}
                    {ex.gif && (
                      <button onClick={() => setShowGif((g) => ({ ...g, [exIdx]: !g[exIdx] }))}
                        className={`text-xs px-2 py-0.5 rounded-full font-medium transition-colors ${
                          gifVisible ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500 hover:bg-blue-50"
                        }`}>
                        {gifVisible ? "Hide demo" : "How to"}
                      </button>
                    )}
                  </div>
                </div>
                {ex.notes && <p className="text-xs text-gray-400">{ex.notes}</p>}
              </div>

              {/* Exercise demo GIF */}
              {gifVisible && ex.gif && (
                <div className="px-4 pb-3">
                  <div className="rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    <img src={ex.gif} alt={`${ex.name} demonstration`} className="w-full max-h-48 object-contain" />
                  </div>
                </div>
              )}

              {/* Sets as rows */}
              <div className="px-4 pb-3">
                <SetRow label="W" labelStyle={warmupStyle} done={warmupDone} reps={ex.reps}
                  onToggle={() => { const k = `${exIdx}-warmup`; const was = completed[k]; setCompleted((c) => ({ ...c, [k]: !c[k] })); if (!running && !was) setRunning(true); }}
                  weight={getSetWeight(exIdx, "warmup")} onWeightChange={(lb) => setWeight(exIdx, "warmup", lb)} />
                {Array.from({ length: ex.sets }).map((_, setIdx) => (
                  <SetRow key={setIdx} label={`${setIdx + 1}`} labelStyle={workingStyle}
                    done={!!completed[`${exIdx}-${setIdx}`]} reps={ex.reps}
                    onToggle={() => toggleSet(exIdx, setIdx)}
                    weight={getSetWeight(exIdx, setIdx)} onWeightChange={(lb) => setWeight(exIdx, setIdx, lb)} />
                ))}
              </div>
            </div>
          );
        })}

        {allDone && (
          <div className="py-6">
            <div className="text-center mb-4">
              <p className="text-4xl mb-2">💪</p>
              <h3 className="text-xl font-bold text-green-700">Workout Complete!</h3>
              <p className="text-sm text-gray-500 mt-1">Time: {formatTime(elapsed)}</p>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Session Summary</p>
              {workout.exercises.map((ex, exIdx) => (
                <div key={exIdx} className="text-sm">
                  <p className="font-medium text-gray-700">{ex.name}</p>
                  <div className="ml-2 mt-0.5 space-y-0.5">
                    {completed[`${exIdx}-warmup`] && (
                      <p className="text-xs text-amber-600 font-mono">W: {ex.reps} reps {getSetWeight(exIdx, "warmup") ? `@ ${getSetWeight(exIdx, "warmup")}lb / ${lbToKg(getSetWeight(exIdx, "warmup"))}kg` : ""}</p>
                    )}
                    {Array.from({ length: ex.sets }).map((_, i) => completed[`${exIdx}-${i}`] ? (
                      <p key={i} className="text-xs text-gray-500 font-mono">
                        #{i+1}: {ex.reps} reps {getSetWeight(exIdx, i) ? `@ ${getSetWeight(exIdx, i)}lb / ${lbToKg(getSetWeight(exIdx, i))}kg` : ""}
                      </p>
                    ) : null)}
                  </div>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between text-xs text-gray-400">
                <span>Total time: {formatTime(elapsed)}</span>
                <span>{new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
              </div>
            </div>
            <div className="text-center mt-4 space-y-2">
              <p className="text-xs text-gray-400">Tell Claude <strong>"save it"</strong> and paste the summary to log this session</p>
              <button onClick={() => {
                  const lines = workout.exercises.flatMap((ex, i) => {
                    const out = [];
                    if (completed[`${i}-warmup`]) { const w = getSetWeight(i, "warmup"); out.push(`${ex.name} [W]: ${ex.reps} reps @ ${w || "?"}lb`); }
                    for (let s = 0; s < ex.sets; s++) { if (completed[`${i}-${s}`]) { const w = getSetWeight(i, s); out.push(`${ex.name} [#${s+1}]: ${ex.reps} reps @ ${w || "?"}lb`); } }
                    return out;
                  });
                  const summary = `Workout: ${workout.name}\nDate: ${new Date().toISOString().split("T")[0]}\nDuration: ${formatTime(elapsed)} (${elapsed}s)\n\n${lines.join("\n")}`;
                  if (navigator.clipboard) { navigator.clipboard.writeText(summary); setCopied(true); setTimeout(() => setCopied(false), 2000); }
                }}
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${copied ? "bg-green-100 text-green-700" : "bg-blue-50 text-blue-600 hover:bg-blue-100"}`}>
                {copied ? "Copied!" : "Copy summary to clipboard"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState(null);

  if (active) return <WorkoutView workout={active} onBack={() => setActive(null)} />;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50">
      <div className="px-4 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">My Workouts</h1>
        <p className="text-sm text-gray-500 mt-1">Tap a workout to start</p>
      </div>
      <div className="px-4 space-y-3">
        {WORKOUTS.map((w) => (
          <button key={w.id} onClick={() => setActive(w)}
            className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{w.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{w.exercises.length} exercises · {w.duration}</p>
              </div>
              <span className="text-gray-300 text-xl">→</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
