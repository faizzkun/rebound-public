// Dependency-free SVG bar chart for the published discipline-score trend.
// Bars are scaled relative to the largest value in the displayed set;
// each bar is labelled with its exact published value.

export type ScorePoint = { date: string; score: number };

export function ScoreChart({ points }: { points: ScorePoint[] }) {
  if (points.length === 0) return null;
  const max = Math.max(...points.map((p) => p.score), 1);
  const width = 640;
  const height = 200;
  const pad = 28;
  const plotWidth = width - pad * 2;
  const plotHeight = height - pad * 2;
  const slot = plotWidth / points.length;
  const barWidth = Math.max(4, Math.min(28, slot * 0.6));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Published discipline score trend"
      className="chart"
    >
      {points.map((p, i) => {
        const barHeight = (p.score / max) * plotHeight;
        const x = pad + i * slot + (slot - barWidth) / 2;
        const y = pad + (plotHeight - barHeight);
        return (
          <g key={`${p.date}-${i}`}>
            <title>
              {p.date}: {p.score}
            </title>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={3}
              fill="#D7E317"
            />
            <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="chart-value">
              {p.score}
            </text>
            {i % Math.ceil(points.length / 8) === 0 && (
              <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" className="chart-date">
                {p.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
