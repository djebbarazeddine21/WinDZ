import React from 'react';
import { Verdict } from '../types';

interface ScoreGaugeProps {
  score: number;
  verdict: Verdict;
  lang?: 'fr' | 'ar';
}

export const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, verdict, lang = 'fr' }) => {
  // Clamp score between 0 and 100
  const cleanScore = Math.max(0, Math.min(100, Math.round(score)));

  // Determine color scheme based on score
  let strokeColor = '#EF4444'; // Red < 45
  let glowColor = 'rgba(239, 68, 68, 0.25)';
  let verdictText = lang === 'ar' ? 'يحتاج مراجعة' : 'À revoir';
  let badgeBg = 'bg-red-500/15 border-red-500/30 text-red-400';

  if (cleanScore >= 71) {
    strokeColor = '#10B981'; // Green > 70
    glowColor = 'rgba(16, 185, 129, 0.25)';
    verdictText = lang === 'ar' ? 'إمكانات ممتازة' : 'Excellent potentiel';
    badgeBg = 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400';
  } else if (cleanScore >= 45) {
    strokeColor = '#D4A34A'; // Gold / Orange 45-70
    glowColor = 'rgba(212, 163, 74, 0.25)';
    verdictText = lang === 'ar' ? 'إمكانات مقبولة' : 'Potentiel correct';
    badgeBg = 'bg-amber-500/15 border-amber-500/30 text-amber-300';
  }

  // Semi-circle math:
  // Radius R = 90, Center cx = 120, cy = 110
  // Arc path: starts at (cx - R, cy) = (30, 110), goes clockwise through top (120, 20) to (cx + R, cy) = (210, 110)
  // Total arc length = PI * R = 3.14159 * 90 = ~282.74
  const radius = 90;
  const cx = 120;
  const cy = 105;
  const arcLength = Math.PI * radius; // 282.74
  const strokeDashoffset = arcLength - (cleanScore / 100) * arcLength;

  return (
    <div className="flex flex-col items-center justify-center p-3">
      {/* SVG 180° Half-Circle Gauge */}
      <div className="relative w-64 h-36 flex items-center justify-center overflow-visible">
        <svg viewBox="0 0 240 125" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              {cleanScore < 45 ? (
                <>
                  <stop offset="0%" stopColor="#F87171" />
                  <stop offset="100%" stopColor="#EF4444" />
                </>
              ) : cleanScore <= 70 ? (
                <>
                  <stop offset="0%" stopColor="#EAB308" />
                  <stop offset="100%" stopColor="#D4A34A" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#34D399" />
                  <stop offset="100%" stopColor="#10B981" />
                </>
              )}
            </linearGradient>
            <filter id="gaugeShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor={strokeColor} floodOpacity="0.35" />
            </filter>
          </defs>

          {/* Background track (semi-circle) */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="#1E2F35"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Active progress path */}
          <path
            d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeDashoffset}
            filter="url(#gaugeShadow)"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />

          {/* Discreet 0 and 100 markers at extremities without clutter */}
          <text
            x={cx - radius + 2}
            y={cy + 16}
            fill="#64748B"
            fontSize="11"
            fontFamily="sans-serif"
            fontWeight="600"
            textAnchor="middle"
          >
            0
          </text>
          <text
            x={cx + radius - 2}
            y={cy + 16}
            fill="#64748B"
            fontSize="11"
            fontFamily="sans-serif"
            fontWeight="600"
            textAnchor="middle"
          >
            100
          </text>
        </svg>

        {/* Centered Score Display without overlapping "/100" */}
        <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex items-baseline gap-1">
            <span
              className="text-4xl font-extrabold tracking-tight font-serif"
              style={{ color: strokeColor }}
            >
              {cleanScore}
            </span>
            <span className="text-xs font-semibold text-slate-400 tracking-wider">
              / 100
            </span>
          </div>
        </div>
      </div>

      {/* Under the gauge: colored textual badge indicating the verdict */}
      <div className="mt-1">
        <span
          className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold border tracking-wide uppercase shadow-sm ${badgeBg}`}
        >
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: strokeColor }}
          />
          {verdictText}
        </span>
      </div>
    </div>
  );
};
