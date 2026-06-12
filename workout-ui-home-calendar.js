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

  const monthNames = new Set();
  let cells = "";
  for (let i = 0; i < firstDay; i++) {
    cells += `<div></div>`;
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const workouts = dateMap[dateStr] || [];
    workouts.forEach(w => monthNames.add(w));
    const badges = workouts.map(w => {
      const b = WORKOUT_BADGES[w];
      if (!b) return `<span style="width:5px;height:5px;border-radius:50%;background:#6b7280;display:inline-block"></span>`;
      return `<span style="font-size:8px;font-weight:800;line-height:1;color:#fff;background:${b.color};border-radius:4px;padding:2px 3px;letter-spacing:0.02em">${b.label}</span>`;
    }).join("");
    const bg = isToday ? "background:#eff6ff;border-radius:8px;" : "";
    const fw = isToday ? "font-weight:700;color:#2563eb;" : "color:#374151;";
    cells += `<div style="text-align:center;padding:4px 0;${bg}">
      <div style="font-size:12px;${fw}">${d}</div>
      <div style="display:flex;justify-content:center;align-items:center;gap:2px;min-height:12px;flex-wrap:wrap">${badges}</div>
    </div>`;
  }

  // Legend only lists workouts that actually appear in the displayed month.
  const colorLegend = Object.entries(WORKOUT_BADGES)
    .filter(([name]) => monthNames.has(name))
    .map(([name, b]) =>
      `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;color:#6b7280">
        <span style="font-size:8px;font-weight:800;line-height:1;color:#fff;background:${b.color};border-radius:4px;padding:2px 3px">${b.label}</span>${name}
      </span>`
    ).join("");

  return `
    <div class="card" style="padding:16px;margin-bottom:16px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px">
        <h3 style="font-size:14px;font-weight:600;color:#111827;margin:0">${monthName}</h3>
        <div style="display:flex;gap:4px">
          <button onclick="changeCalendarMonth(-1)" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#111827;cursor:pointer;padding:4px 8px;font-size:12px;font-weight:bold;border-radius:6px;display:flex;align-items:center;justify-content:center">&lt;</button>
          <button onclick="changeCalendarMonth(1)" ${offset === 0 ? 'disabled style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.2);cursor:default;border-radius:6px;display:flex;align-items:center;justify-content:center"' : 'style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#111827;cursor:pointer;padding:4px 8px;font-size:12px;font-weight:bold;border-radius:6px;display:flex;align-items:center;justify-content:center"'} onclick="changeCalendarMonth(1)">&gt;</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:8px">
        ${dayHeaders}
        ${cells}
      </div>
      <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap">${colorLegend}</div>
    </div>
  `;
}

window.changeCalendarMonth = function(delta) {
  state.calendarMonthOffset = (state.calendarMonthOffset || 0) + delta;
  render();
};
