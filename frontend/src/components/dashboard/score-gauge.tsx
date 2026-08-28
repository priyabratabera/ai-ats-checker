"use client";

import { scoreBand, SCORE_BAND_COLORS, SCORE_BAND_LABELS } from "./score-band";

const SIZE = 176;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const band = scoreBand(clamped);
  const color = SCORE_BAND_COLORS[band];
  const offset = CIRCUMFERENCE * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center gap-3" role="img" aria-label={`Overall ATS score: ${clamped} out of 100, ${SCORE_BAND_LABELS[band]}`}>
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            className="stroke-slate-100 dark:stroke-slate-800"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 700ms ease-out, stroke 300ms ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-semibold text-slate-900 dark:text-slate-50">{clamped}</span>
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">/ 100</span>
        </div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>
        {SCORE_BAND_LABELS[band]} ATS match
      </span>
    </div>
  );
}
