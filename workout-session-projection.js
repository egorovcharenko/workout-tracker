function PercentileProjectionSparkline({ exerciseName, ormHistory, color, label, showTip, hideTip }) {
  const sortedHistory = [...(ormHistory || [])]
    .filter(h => h.date && h.orm > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (sortedHistory.length === 0) {
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>
          <span style={{ color: T.disabled, fontFamily: T.mono, fontSize: 10 }}>—</span>
        </div>
        <div style={{ height: 38, display: "flex", alignItems: "center", justifyContent: "center", color: T.disabled, fontFamily: T.mono, fontSize: 10, border: `1px dashed ${T.cardBorder}`, borderRadius: 4 }}>no history for projection</div>
      </div>
    );
  }

  const N = sortedHistory.length;
  let slope = 0;
  const last = sortedHistory[N - 1].orm;
  
  if (N >= 2) {
    const d0 = Date.parse(sortedHistory[0].date + 'T00:00:00Z');
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    sortedHistory.forEach(h => {
      const xi = (Date.parse(h.date + 'T00:00:00Z') - d0) / 86400000;
      const yi = h.orm;
      sumX += xi;
      sumY += yi;
      sumXY += xi * yi;
      sumXX += xi * xi;
    });
    const denom = N * sumXX - sumX * sumX;
    if (denom !== 0) {
      const calculatedSlope = (N * sumXY - sumX * sumY) / denom;
      const maxDailyIncrement = last * 0.0015; // Realistic cap of 0.15% daily (4.5% monthly) progress
      slope = Math.max(0, Math.min(calculatedSlope, maxDailyIncrement));
    }
  } else {
    slope = last * 0.0005; // default conservative 0.05% daily increase (1.5% monthly) for sparse data
  }

  const today = localDate();
  const todayMs = Date.parse(today + 'T00:00:00Z');
  const sixtyDaysAgoMs = todayMs - 60 * 86400000;
  const sixtyDaysAgoStr = new Date(sixtyDaysAgoMs).toISOString().slice(0, 10);

  const filteredHistory = sortedHistory.filter(h => h.date >= sixtyDaysAgoStr);

  const historyPoints = filteredHistory.map(h => {
    const ms = Date.parse(h.date + 'T00:00:00Z');
    const pctInfo = getStrengthPercentile(exerciseName, h.orm, h.date) || { percentile: 0, tier: "Untrained" };
    return {
      ms,
      date: h.date,
      percentile: pctInfo.percentile,
      tier: pctInfo.tier,
      isFuture: false,
      label: h.date,
    };
  });

  const projectionPoints = [];
  for (let i = 0; i <= 30; i++) {
    const ms = todayMs + i * 86400000;
    const projectedOrm = last + slope * i;
    const dateStr = new Date(ms).toISOString().slice(0, 10);
    const pctInfo = getStrengthPercentile(exerciseName, projectedOrm, dateStr) || { percentile: 0, tier: "Untrained" };
    projectionPoints.push({
      ms,
      date: new Date(ms).toISOString().slice(0, 10),
      percentile: pctInfo.percentile,
      tier: pctInfo.tier,
      isFuture: i > 0,
      label: i === 0 ? "Today" : `+${i}d`,
    });
  }

  const historyFiltered = historyPoints.filter(hp => hp.date < today);
  const allPoints = [...historyFiltered, ...projectionPoints];

  let startDateMs = todayMs;
  if (filteredHistory.length > 0) {
    const firstHistMs = Date.parse(filteredHistory[0].date + 'T00:00:00Z');
    if (firstHistMs < todayMs) {
      startDateMs = firstHistMs;
    }
  }
  const endDateMs = todayMs + 30 * 86400000;
  const totalDays = (endDateMs - startDateMs) / 86400000 || 1;

  const percentiles = allPoints.map(p => p.percentile);
  const minPct = Math.min(...percentiles);
  const maxPct = Math.max(...percentiles);
  const range = maxPct - minPct || 10;
  const w = 280, h = 48, padX = 8, padY = 4;
  
  const dayX = (ms) => padX + ((ms - startDateMs) / 86400000 / totalDays) * (w - 2 * padX);
  const yFor = (v) => (h - 14) - padY - ((v - minPct) / range) * (h - 14 - 2 * padY);

  const linePathForArea = allPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${dayX(p.ms).toFixed(1)} ${yFor(p.percentile).toFixed(1)}`).join(" ");
  const areaPath = `${linePathForArea} L ${dayX(endDateMs).toFixed(1)} ${h - 14} L ${dayX(startDateMs).toFixed(1)} ${h - 14} Z`;
  const gradId = `spark-proj-pct-${color.replace(/[^a-z0-9]/gi, "")}`;

  const historyLinePoints = [...historyFiltered, projectionPoints[0]];
  const histLinePath = historyLinePoints.length >= 2
    ? historyLinePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${dayX(p.ms).toFixed(1)} ${yFor(p.percentile).toFixed(1)}`).join(" ")
    : "";

  const projLinePath = projectionPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${dayX(p.ms).toFixed(1)} ${yFor(p.percentile).toFixed(1)}`).join(" ");

  const histMarkers = historyFiltered;
  const projMarkers = [0, 7, 14, 21, 28, 30].map(idx => projectionPoints[idx]);
  const markers = [...histMarkers, ...projMarkers];

  const firstHist = historyFiltered[0];
  const startLabel = firstHist ? firstHist.date.slice(5) : ""; // MM-DD

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ color: T.muted, fontFamily: T.mono, fontSize: 10, fontWeight: 700, letterSpacing: 0.3 }}>{label}</span>
        <span style={{ fontFamily: T.mono, fontSize: 11, fontWeight: 800, color: T.strong }}>
          {projectionPoints[0].percentile}%
          <span style={{ color: T.muted, fontWeight: 600, fontSize: 9.5, marginLeft: 6 }}>
            ({projectionPoints[0].tier})
          </span>
        </span>
      </div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block", height: h }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        
        {histLinePath && (
          <path d={histLinePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        <path d={projLinePath} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Today vertical line */}
        <line x1={dayX(todayMs)} y1={padY} x2={dayX(todayMs)} y2={h - 14} stroke="rgba(255,255,255,0.15)" strokeWidth={1} strokeDasharray="3 3" />

        {/* Weekly projection grid lines */}
        {[7, 14, 21, 28, 30].map(d => {
          const ms = todayMs + d * 86400000;
          return (
            <line key={`projg${d}`} x1={dayX(ms)} y1={padY} x2={dayX(ms)} y2={h - 14}
              stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} strokeDasharray="2 3" />
          );
        })}

        {/* Weekly historical grid lines */}
        {[7, 14, 21, 28, 35, 42, 49, 56].map(d => {
          const ms = todayMs - d * 86400000;
          if (ms < startDateMs) return null;
          return (
            <line key={`histg${d}`} x1={dayX(ms)} y1={padY} x2={dayX(ms)} y2={h - 14}
              stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} strokeDasharray="2 3" />
          );
        })}

        {/* Hover/Interactive points */}
        {markers.map((d, i) => (
          <g key={`m${i}`}>
            <circle cx={dayX(d.ms)} cy={yFor(d.percentile)} r={d.isFuture ? (d.label === "+30d" ? 2.4 : 1.8) : 1.8} fill={color} />
            {d.label === "+30d" && (
              <circle cx={dayX(d.ms)} cy={yFor(d.percentile)} r="5" fill="none" stroke={color} strokeWidth="1" />
            )}
            <circle cx={dayX(d.ms)} cy={yFor(d.percentile)} r="8" fill="transparent"
              style={{ cursor: "default" }}
              onMouseEnter={(e) => showTip(e, d.isFuture
                ? `Projected ${d.label}: ${d.percentile}% (${d.tier})`
                : `${d.date} · ${d.percentile}% (${d.tier})`
              )}
              onMouseLeave={hideTip} />
          </g>
        ))}

        <text x={dayX(endDateMs)} y={yFor(projectionPoints[30].percentile) - 7} textAnchor="end" fill={color} style={{ fontSize: 8.5, fontFamily: T.mono, fontWeight: 800 }}>
          🎯 {projectionPoints[30].percentile}%
        </text>

        {/* X-axis Labels */}
        {startLabel && (
          <text x={dayX(startDateMs)} y={h - 2} textAnchor="start" fill={T.disabled} style={{ fontSize: 8.5, fontFamily: T.mono, fontWeight: 500 }}>
            {startLabel}
          </text>
        )}
        <text x={dayX(todayMs)} y={h - 2} textAnchor="middle" fill={T.accentLight} style={{ fontSize: 8.5, fontFamily: T.mono, fontWeight: 800 }}>
          Today
        </text>
        <text x={dayX(endDateMs)} y={h - 2} textAnchor="end" fill={T.disabled} style={{ fontSize: 8.5, fontFamily: T.mono, fontWeight: 500 }}>
          +30d
        </text>
      </svg>
    </div>
  );
}

window.PercentileProjectionSparkline = PercentileProjectionSparkline;
