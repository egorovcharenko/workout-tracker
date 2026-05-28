var { useState, useEffect } = React;

const Section = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ color: T.muted, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 0.9, marginBottom: 8 }}>
      {label}
    </div>
    {children}
  </div>
);

const KV = ({ k, v }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11, borderBottom: `1px solid ${T.cardBorder}` }}>
    <span style={{ color: T.faint, fontFamily: T.mono }}>{k}</span>
    <span style={{ color: T.strong, fontFamily: T.mono, fontWeight: 700 }}>{v}</span>
  </div>
);

function StatsPane({ exercise, history, statHistory, exercises }) {
  if (!exercise) return null;
  const today = localDate();
  const todayMs = Date.parse(today + 'T00:00:00Z');
  const sevenDaysAgoMs = todayMs - 7 * 86400000;
  
  const [tip, setTip] = useState(null);
  const showTip = (e, content) => {
    const r = e.currentTarget.getBoundingClientRect();
    setTip({ content, x: r.left + r.width / 2, y: r.top - 4 });
  };
  const hideTip = () => setTip(null);

  useEffect(() => {
    setTip(null);
  }, [exercise]);

  const muscleInfo = EXERCISE_MUSCLES[exercise.name] || { primary: [], secondary: [] };

  const muscleSets7d = {};
  (muscleInfo.primary || []).forEach(m => muscleSets7d[m] = []);
  (muscleInfo.secondary || []).forEach(m => muscleSets7d[m] = []);
  for (const sess of (history || [])) {
    if (!sess.date || sess.date === today) continue;
    const sessMs = Date.parse(sess.date + 'T00:00:00Z');
    if (sessMs <= sevenDaysAgoMs || sessMs > todayMs) continue;
    for (const st of (sess.sets || [])) {
      if (st.set_type !== 'working') continue;
      const mm = EXERCISE_MUSCLES[st.exercise];
      if (!mm) continue;
      for (const muscle of (mm.primary || [])) {
        if (muscle in muscleSets7d) muscleSets7d[muscle].push({
          date: sess.date, isToday: false,
          exercise: st.exercise,
          weight: +st.weight_lb || 0,
          reps: parseInt(st.reps) || 0,
          weightage: getMuscleImpact(st.exercise, muscle, true),
        });
      }
      for (const muscle of (mm.secondary || [])) {
        if (muscle in muscleSets7d) muscleSets7d[muscle].push({
          date: sess.date, isToday: false,
          exercise: st.exercise,
          weight: +st.weight_lb || 0,
          reps: parseInt(st.reps) || 0,
          weightage: getMuscleImpact(st.exercise, muscle, false),
        });
      }
    }
  }

  const chartTodayDate = new Date(todayMs).toISOString().slice(0, 10);
  for (const e of exercises) {
    const em = EXERCISE_MUSCLES[e.name];
    if (!em || e.skipped) continue;
    for (const s of e.sets) {
      if (!s.completed || s.kind !== 'work') continue;
      const bs = (s.bands || []).reduce((a, b) => a + b, 0);
      const weight = e.assist ? Math.max(0, (s.bodyweight || 0) - bs)
                    : e.isBandsOnly ? bs
                    : e.bandAddon ? (s.weight || 0) + bs
                    : (s.weight || 0);
      for (const muscle of (em.primary || [])) {
        if (muscle in muscleSets7d) muscleSets7d[muscle].push({
          date: chartTodayDate, isToday: true,
          exercise: e.name,
          weight,
          reps: parseInt(s.reps) || 0,
          weightage: getMuscleImpact(e.name, muscle, true),
        });
      }
      for (const muscle of (em.secondary || [])) {
        if (muscle in muscleSets7d) muscleSets7d[muscle].push({
          date: chartTodayDate, isToday: true,
          exercise: e.name,
          weight,
          reps: parseInt(s.reps) || 0,
          weightage: getMuscleImpact(e.name, muscle, false),
        });
      }
    }
  }

  Object.values(muscleSets7d).forEach(arr => arr.sort((a, b) => a.date.localeCompare(b.date)));

  const stat = statHistory || {};
  const pickSiblingForStats = () => {
    const grp = getSwapGroup(exercise.name);
    if (!grp) return null;
    const statOwn = ((stat.orm || {})[exercise.name] || []).length;
    const histOwn = (history || []).some(s =>
      (s.sets || []).some(st => st.exercise === exercise.name && st.set_type === 'working'));
    if (statOwn > 0 || histOwn) return null;
    let best = null, bestCount = 0;
    for (const member of grp) {
      if (member.name === exercise.name) continue;
      const statCnt = ((stat.orm || {})[member.name] || []).length;
      const histCnt = (history || []).filter(s =>
        (s.sets || []).some(st => st.exercise === member.name && st.set_type === 'working')).length;
      const cnt = statCnt + histCnt;
      if (cnt > bestCount) { bestCount = cnt; best = member.name; }
    }
    return bestCount > 0 ? best : null;
  };
  const sibling = pickSiblingForStats();
  const lookupName = sibling || exercise.name;

  const lookupIsAssist = lookupName === "Bench Dips" || lookupName === "Assisted Pull-Ups";
  const histByDate = {};
  (history || []).forEach(sess => {
    if (!sess.date) return;
    const sets = (sess.sets || []).filter(st => st.exercise === lookupName && st.set_type === 'working');
    if (!sets.length) return;
    let mo = lookupIsAssist ? -Infinity : 0, sv = 0, mw = lookupIsAssist ? -Infinity : 0, mr = 0;
    sets.forEach(st => {
      const w = +st.weight_lb || 0, r = parseInt(st.reps) || 0;
      let bandSum = 0;
      if (lookupIsAssist && st.bands_json) {
        try {
          const b = JSON.parse(st.bands_json);
          if (Array.isArray(b)) bandSum = b.reduce((a, x) => a + (+x || 0), 0);
        } catch(e){}
      }
      const displayW = lookupIsAssist ? -bandSum : w;
      if (displayW > mw) mw = displayW;
      if (r > mr) mr = r;
      if (w > 0 && r > 0) {
        const o = lookupIsAssist ? (r > 1 ? (w * r / 30.0) - bandSum : -bandSum) : (r > 1 ? w * (1 + r / 30) : w);
        if (o > mo) mo = o;
        sv += w * r;
      }
    });
    histByDate[sess.date] = { date: sess.date, orm: mo === -Infinity ? 0 : mo, vol: sv, wt: mw === -Infinity ? 0 : mw, reps: mr };
  });

  const mergeMetric = (statArr, key) => {
    const byDate = {};
    (statArr || []).forEach(d => { byDate[d.date] = +d[key] || 0; });
    Object.values(histByDate).forEach(h => { byDate[h.date] = h[key]; });
    return Object.entries(byDate)
      .map(([date, v]) => ({ date, [key]: v }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };
  const ormHistRaw = mergeMetric((stat.orm || {})[lookupName], "orm");
  const wtHist     = mergeMetric((stat.wt  || {})[lookupName], "wt");
  const repsHist   = mergeMetric((stat.reps|| {})[lookupName], "reps");
  const volHistRaw = mergeMetric((stat.vol || {})[lookupName], "vol");

  let todayOrm = exercise.assist ? -Infinity : 0, todayVol = 0;
  (exercise.sets || []).forEach(s => {
    if (!s.completed || s.kind !== 'work') return;
    const bs = (s.bands || []).reduce((a, b) => a + b, 0);
    const w = exercise.assist ? Math.max(0, (s.bodyweight || 0) - bs)
            : exercise.isBandsOnly ? bs
            : exercise.bandAddon ? (s.weight || 0) + bs
            : (s.weight || 0);
    const r = parseInt(s.reps) || 0;
    if (r > 0 && w > 0) {
      const isAssist = exercise.assist;
      let o;
      if (isAssist) {
        const bw = s.bodyweight || 175;
        const totalOrm = r > 1 ? w * (1 + r / 30) : w;
        o = totalOrm - bw;
      } else {
        o = r > 1 ? w * (1 + r / 30) : w;
      }
      if (o > todayOrm) todayOrm = o;
      todayVol += w * r;
    }
  });
  const chartTodayDateStr = new Date(todayMs).toISOString().slice(0, 10);

  const ormHist = (!sibling && todayOrm !== -Infinity)
    ? [...ormHistRaw.filter(d => d.date !== chartTodayDateStr), { date: chartTodayDateStr, orm: todayOrm }]
    : ormHistRaw;
  const volHist = (!sibling && todayVol > 0)
    ? [...volHistRaw.filter(d => d.date !== chartTodayDateStr), { date: chartTodayDateStr, vol: todayVol }]
    : volHistRaw;
  const bestOrm = ormHist.length ? Math.max(...ormHist.map(d => d.orm !== undefined ? +d.orm : -Infinity)) : (exercise.assist ? -Infinity : 0);
  const bestWt = wtHist.length ? Math.max(...wtHist.map(d => d.wt !== undefined ? +d.wt : -Infinity)) : (exercise.assist ? -Infinity : 0);
  const bestReps = repsHist.length ? Math.max(...repsHist.map(d => +d.reps || 0)) : 0;
  const bestVol = volHist.length ? Math.max(...volHist.map(d => +d.vol || 0)) : 0;

  const hasPRs = exercise.assist
    ? (bestOrm !== -Infinity || bestWt !== -Infinity || bestVol > 0)
    : (bestOrm > 0 || bestWt > 0 || bestVol > 0);
  const primaryList = (muscleInfo.primary || []);
  const secondaryList = (muscleInfo.secondary || []);

  return (
    <div
      onMouseLeave={hideTip}
      style={{
        padding: 14, borderRadius: 14,
        background: T.cardBg, border: `1px solid ${T.cardBorder}`,
        color: T.text,
        position: "relative",
      }}
    >
      <div style={{ marginBottom: 12 }}>
        <div style={{ color: T.faint, fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 1.0, marginBottom: 4 }}>STATS</div>
        <div style={{ color: T.strong, fontSize: 16, fontWeight: 800, letterSpacing: -0.3, lineHeight: 1.2 }}>{exercise.name}</div>
        {(primaryList.length > 0 || secondaryList.length > 0) && (
          <div style={{ marginTop: 5, display: "flex", flexWrap: "wrap", gap: 4 }}>
            {primaryList.map(m => (
              <span key={m} style={{
                color: T.bandsText, background: "rgba(192,132,252,0.12)",
                border: "1px solid rgba(192,132,252,0.25)",
                fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 0.4,
                padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
              }}>{m.replace("_", " ")}</span>
            ))}
            {secondaryList.map(m => (
              <span key={m} style={{
                color: T.muted, background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.15)",
                fontFamily: T.mono, fontSize: 9, fontWeight: 800, letterSpacing: 0.4,
                padding: "2px 6px", borderRadius: 4, textTransform: "uppercase",
              }}>{m.replace("_", " ")} ({Math.round(getMuscleImpact(exercise.name, m, false) * 100)}%)</span>
            ))}
          </div>
        )}
      </div>

      {(primaryList.length > 0 || secondaryList.length > 0) && (
        <Section label="HARD SETS · LAST 7 DAYS">
          {primaryList.map(m => (
            <VolumeBar key={m} exerciseName={exercise.name} muscle={m} events={muscleSets7d[m] || []} isPrimary={true} showTip={showTip} hideTip={hideTip} />
          ))}
          {secondaryList.map(m => (
            <VolumeBar key={m} exerciseName={exercise.name} muscle={m} events={muscleSets7d[m] || []} isPrimary={false} showTip={showTip} hideTip={hideTip} />
          ))}
        </Section>
      )}

      <Section label={sibling ? `PROGRESS · OVER LAST 30 DAYS · ${sibling.toUpperCase()}` : "PROGRESS · OVER LAST 30 DAYS"}>
        {sibling && (
          <div style={{ color: T.faint, fontFamily: T.mono, fontSize: 9.5, marginBottom: 6, lineHeight: 1.4 }}>
            {exercise.name} is new — showing your <span style={{ color: T.muted, fontWeight: 700 }}>{sibling}</span> history (same swap group).
          </div>
        )}
        <Sparkline exerciseName={lookupName} data={ormHist} valueKey="orm" color="#60A5FA" label="1RM EST" fmt={v => `${Math.round(v)} lb`} showTip={showTip} hideTip={hideTip} />
        <Sparkline exerciseName={lookupName} data={volHist} valueKey="vol" color="#34D399" label="VOLUME" fmt={v => `${Math.round(v).toLocaleString()} lb`} showTip={showTip} hideTip={hideTip} />
        <PercentileProjectionSparkline exerciseName={lookupName} ormHistory={ormHist} color="#FBBF24" label="PROJECTED PERCENTILE (30D)" showTip={showTip} hideTip={hideTip} />
      </Section>

      {hasPRs && (
        <Section label="PRS">
          {(exercise.assist ? bestOrm !== -Infinity : bestOrm > 0) && <KV k="1RM est" v={`${Math.round(bestOrm)} lb`} />}
          {(exercise.assist ? bestWt !== -Infinity : bestWt > 0) && <KV k="Top weight" v={`${bestWt} lb`} />}
          {bestReps > 0 && <KV k="Top reps" v={String(bestReps)} />}
          {bestVol > 0 && <KV k="Top volume" v={`${bestVol.toLocaleString()} lb`} />}
        </Section>
      )}

      {tip && (
        <div style={{
          position: "fixed", left: tip.x, top: tip.y, transform: "translate(-50%, -100%)",
          background: "#1f2937", border: "1px solid rgba(255,255,255,0.08)",
          padding: "5px 8px 4px", borderRadius: 6, pointerEvents: "none", zIndex: 100,
          boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
          color: T.strong, fontFamily: T.mono, fontSize: 10, fontWeight: 600,
          whiteSpace: "nowrap",
        }}>
          {tip.content}
        </div>
      )}
    </div>
  );
}

window.Section = Section;
window.KV = KV;
window.StatsPane = StatsPane;
