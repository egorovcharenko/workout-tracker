// Calendar rendering logic for the Home tab of Workout Tracker

function renderCalendar() {
  const offset = state.calendarMonthOffset || 0;
  const today = new Date();
  const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthName = targetDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Short badge per workout so the calendar shows WHICH session happened,
  // not just that one did. Unknown/legacy names fall back to a gray dot.
  const WORKOUT_BADGES = {
    "Main A": { label: "A", color: "#3b82f6" },
    "Main B": { label: "B", color: "#10b981" },
    "Micro: Arms & Core": { label: "ARM", color: "#8b5cf6" },
    "Micro: Delts & Traps": { label: "DLT", color: "#f59e0b" },
    "Squat Day": { label: "SQ", color: "#60a5fa" },
    "Deadlift Day": { label: "DL", color: "#34d399" },
    "Full Body": { label: "FB", color: "#6b7280" },
    "Full Body B": { label: "FB", color: "#6b7280" },
  };
  const dateMap = {};
  (state.history || []).forEach(s => {
    if (!dateMap[s.date]) dateMap[s.date] = [];
    dateMap[s.date].push(s.workout_name);
  });

  const dayHeaders = ["Su","Mo","Tu","We","Th","Fr","Sa"].map(d =>
    `<div style="font-size:10px;color:#9ca3af;text-align:center;font-weight:600">${d}</div>`
  ).join("");

  let cells = "";
  for (let i = 0; i < firstDay; i++) {
    cells += `<div></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const workouts = dateMap[dateStr] || [];
    const badges = workouts.map(w => {
      const b = WORKOUT_BADGES[w];
      const color = b ? b.color : "#6b7280";
      return `<span style="font-size:7px;font-weight:700;line-height:1.1;color:#fff;background:${color};border-radius:3px;padding:2px 3px;display:block;text-align:center;word-break:break-word">${w}</span>`;
    }).join("");
    const bg = isToday ? "background:#eff6ff;border-radius:8px;" : "";
    const fw = isToday ? "font-weight:700;color:#2563eb;" : "color:#374151;";
    cells += `<div style="text-align:center;padding:4px 2px;${bg};min-height:48px;display:flex;flex-direction:column;justify-content:flex-start">
      <div style="font-size:11px;${fw};margin-bottom:2px">${d}</div>
      <div style="display:flex;flex-direction:column;gap:2px;align-items:stretch">${badges}</div>
    </div>`;
  }

  return `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
        <h3 style="font-size:14px;font-weight:600;color:#111827;margin:0">${monthName}</h3>
        <div style="display:flex;gap:4px">
          <button onclick="changeCalendarMonth(-1)" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#111827;cursor:pointer;padding:4px 8px;font-size:12px;font-weight:bold;border-radius:6px;display:flex;align-items:center;justify-content:center">&lt;</button>
          <button onclick="changeCalendarMonth(1)" ${offset === 0 ? 'disabled style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.2);cursor:default;border-radius:6px;display:flex;align-items:center;justify-content:center"' : 'style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#111827;cursor:pointer;padding:4px 8px;font-size:12px;font-weight:bold;border-radius:6px;display:flex;align-items:center;justify-content:center"'} onclick="changeCalendarMonth(1)">&gt;</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px">
        ${dayHeaders}
        ${cells}
      </div>
    </div>
  `;
}

window.changeCalendarMonth = function(delta) {
  state.calendarMonthOffset = (state.calendarMonthOffset || 0) + delta;
  render();
};
