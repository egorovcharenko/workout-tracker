// All trackable muscle groups with display info
const MUSCLE_GROUPS = {
  shoulders:  { label: "Shoulders",   side: "front" },
  chest:      { label: "Chest",       side: "front" },
  biceps:     { label: "Biceps",      side: "front" },
  triceps:    { label: "Triceps",     side: "back"  },
  forearms:   { label: "Forearms",    side: "front" },
  core:       { label: "Core",        side: "front" },
  quads:      { label: "Quads",       side: "front" },
  upper_back: { label: "Upper Back",  side: "back"  },
  lats:       { label: "Lats",        side: "back"  },
  rear_delts: { label: "Rear Delts",  side: "back"  },
  lower_back: { label: "Lower Back",  side: "back"  },
  glutes:     { label: "Glutes",      side: "back"  },
  hamstrings: { label: "Hamstrings",  side: "back"  },
  calves:     { label: "Calves",      side: "back"  },
};

const WEIGHTS_LB = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];
const lbToKg = lb => (lb * 0.453592).toFixed(1);

const ALL_WEIGHT_COLORS = {
  5:["#ecfdf5","#047857","#a7f3d0"], 10:["#d1fae5","#065f46","#6ee7b7"],
  15:["#ecfccb","#3f6212","#bef264"], 20:["#fef9c3","#854d0e","#fde047"],
  25:["#fef3c7","#92400e","#fcd34d"], 30:["#ffedd5","#9a3412","#fdba74"],
  35:["#fed7aa","#7c2d12","#fb923c"], 40:["#fee2e2","#991b1b","#fca5a5"],
  45:["#fecaca","#7f1d1d","#f87171"], 50:["#fca5a5","#450a0a","#ef4444"],
  55:["#e9d5ff","#6b21a8","#c084fc"], 60:["#d8b4fe","#581c87","#a855f7"],
};
function weightBtnStyle(lb, selected, hinted) {
  if (selected) return 'background:#3b82f6;color:white;box-shadow:0 1px 3px rgba(59,130,246,0.4);outline:2px solid #93c5fd;';
  if (hinted) return 'background:white;color:#93c5fd;border:2px dashed #93c5fd;';
  const c = ALL_WEIGHT_COLORS[lb] || ["#f3f4f6","#374151","#d1d5db"];
  return `background:${c[0]};color:${c[1]};border:1px solid ${c[2]};`;
}

// State
let state = {
  screen: "home", // home | workout | history
  workout: null,
  completed: {},
  weights: {},
  elapsed: 0,
  running: false,
  resting: false,
  restLeft: 0,
  restPaused: false,
  showGif: {},
  lastSession: {},
  reps: {},
  expandedPicker: {},
  history: [],
  saved: false,
  sessionId: null,
  lastSaved: null,
  bodyweight: parseInt(localStorage.getItem('bodyweight')) || 175,
  grip: {},
  exerciseNotes: {},
  editingNote: null,
};
function formatTime(s) { return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`; }

function startWorkout(w) {
  window.location.assign('/workout?w=' + encodeURIComponent(w.id));
}

// Render
function render() {
  const app = document.getElementById("app");
  if (state.screen === "home") app.innerHTML = renderHome();
  else if (state.screen === "workout") app.innerHTML = renderWorkout();
  else if (state.screen === "measurements") app.innerHTML = renderMeasurements();
  requestAnimationFrame(scrollToSelected);
}

// Initial render — check URL hash for deep link
const initHash = location.hash.replace('#', '');
const initWorkout = initHash ? WORKOUTS.find(w => w.id === initHash) : null;
if (initWorkout) {
  startWorkout(initWorkout);
} else {
  render();
  loadHomeData();
}
