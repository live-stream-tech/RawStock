interface EnneagramGraphProps {
  scores: number[]; // 9 values
}

export default function EnneagramGraph({ scores }: EnneagramGraphProps) {
  const maxScore = 10;
  const centerX = 150;
  const centerY = 150;
  const radius = 100;

  // Calculate points for the enneagram (9 points in a circle)
  const points = scores.map((score, i) => {
    const angle = (i * 2 * Math.PI) / 9 - Math.PI / 2;
    const distance = (score / maxScore) * radius;
    return {
      x: centerX + distance * Math.cos(angle),
      y: centerY + distance * Math.sin(angle),
      label: `タイプ${i + 1}`,
    };
  });

  // Create polygon path
  const polygonPath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  // Grid circles
  const gridCircles = [0.25, 0.5, 0.75, 1].map((factor) => factor * radius);

  return (
    <div className="flex justify-center items-center py-8">
      <svg width="300" height="300" viewBox="0 0 300 300">
        {/* Define radial gradient for Pearl Silver effect */}
        <defs>
          <radialGradient id="pearlGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E5E4E2" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#C0C0C0" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#A8A8A8" stopOpacity="0.2" />
          </radialGradient>
        </defs>

        {/* Grid circles */}
        {gridCircles.map((r, i) => (
          <circle
            key={i}
            cx={centerX}
            cy={centerY}
            r={r}
            fill="none"
            stroke="var(--pearl-light)"
            strokeWidth="1"
          />
        ))}

        {/* Grid lines */}
        {points.map((_, i) => {
          const angle = (i * 2 * Math.PI) / 9 - Math.PI / 2;
          const endX = centerX + radius * Math.cos(angle);
          const endY = centerY + radius * Math.sin(angle);
          return (
            <line
              key={i}
              x1={centerX}
              y1={centerY}
              x2={endX}
              y2={endY}
              stroke="var(--pearl-light)"
              strokeWidth="1"
            />
          );
        })}

        {/* Score polygon with gradient fill */}
        <path d={polygonPath} fill="url(#pearlGradient)" stroke="#4FC3F7" strokeWidth="2" />

        {/* Score points */}
        {points.map((point, i) => (
          <circle key={i} cx={point.x} cy={point.y} r="4" fill="#4FC3F7" />
        ))}

        {/* Labels */}
        {points.map((_, i) => {
          const angle = (i * 2 * Math.PI) / 9 - Math.PI / 2;
          const labelDistance = radius + 20;
          const labelX = centerX + labelDistance * Math.cos(angle);
          const labelY = centerY + labelDistance * Math.sin(angle);
          return (
            <text
              key={i}
              x={labelX}
              y={labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[10px] font-black fill-[#94A3B8]"
            >
              TYPE {i + 1}
            </text>
          );
        })}
      </svg>
    </div>
  );
}