import React from "react";
import Svg, { Polygon, Circle, Line, Text as SvgText } from "react-native-svg";
import { C } from "@/constants/colors";

const ENNEAGRAM_TYPES = [
  { label: "完璧主義者", num: 1, color: "#ff4d00" },
  { label: "世話好き", num: 2, color: "#FB8C00" },
  { label: "達成者", num: 3, color: "#F9A825" },
  { label: "個人主義者", num: 4, color: "#8E24AA" },
  { label: "研究家", num: 5, color: "#1E88E5" },
  { label: "忠実者", num: 6, color: "#00ACC1" },
  { label: "楽観主義者", num: 7, color: "#43A047" },
  { label: "挑戦者", num: 8, color: "#E91E63" },
  { label: "平和主義者", num: 9, color: "#9E9E9E" },
];

function getPolygonPoints(
  cx: number,
  cy: number,
  radius: number,
  scores: number[],
  max = 10
): string {
  const n = scores.length;
  return scores
    .map((s, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = (s / max) * radius;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      return `${x},${y}`;
    })
    .join(" ");
}

function getAxisPoints(cx: number, cy: number, radius: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  });
}

function getLabelPoints(cx: number, cy: number, radius: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = radius + 18;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });
}

export function EnneagramChart({ scores }: { scores: number[] }) {
  const SIZE = 240;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const RADIUS = 80;
  const rings = [2, 4, 6, 8, 10];

  const axisPoints = getAxisPoints(cx, cy, RADIUS, 9);
  const labelPoints = getLabelPoints(cx, cy, RADIUS, 9);
  const filledPoints = getPolygonPoints(cx, cy, RADIUS, scores);

  return (
    <Svg width={SIZE} height={SIZE}>
      {rings.map((r) => {
        const pts = getPolygonPoints(cx, cy, RADIUS, Array(9).fill(r));
        return (
          <Polygon
            key={r}
            points={pts}
            fill="none"
            stroke={r === 10 ? C.border : "rgba(255,255,255,0.06)"}
            strokeWidth={r === 10 ? 1 : 0.8}
          />
        );
      })}

      {axisPoints.map((pt, i) => (
        <Line
          key={i}
          x1={cx}
          y1={cy}
          x2={pt.x}
          y2={pt.y}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={1}
        />
      ))}

      <Polygon
        points={filledPoints}
        fill="rgba(41,182,207,0.25)"
        stroke={C.accent}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {scores.map((s, i) => {
        const angle = (Math.PI * 2 * i) / 9 - Math.PI / 2;
        const r = (s / 10) * RADIUS;
        return (
          <Circle
            key={i}
            cx={cx + r * Math.cos(angle)}
            cy={cy + r * Math.sin(angle)}
            r={4}
            fill={ENNEAGRAM_TYPES[i].color}
            stroke="#0A1218"
            strokeWidth={1.5}
          />
        );
      })}

      {labelPoints.map((pt, i) => (
        <SvgText
          key={i}
          x={pt.x}
          y={pt.y}
          fill="rgba(255,255,255,0.65)"
          fontSize="9"
          fontWeight="700"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {ENNEAGRAM_TYPES[i].num}
        </SvgText>
      ))}
    </Svg>
  );
}

export { ENNEAGRAM_TYPES };
