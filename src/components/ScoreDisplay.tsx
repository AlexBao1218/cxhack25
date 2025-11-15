'use client';

import React from "react";

import { useLayoutStore } from "@/store/useLayoutStore";

const HIGHLIGHT_RED = "#C2262E";

const getColor = (score: number) => {
  if (score >= 80) return "#059669";
  if (score >= 60) return "#10B981";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
};

const getRating = (score: number) => {
  if (score >= 80) return "优秀";
  if (score >= 60) return "良好";
  if (score >= 40) return "一般";
  return "较差";
};

const ScoreDisplay: React.FC = () => {
  const score = useLayoutStore((state) => state.score);
  const [displayScore, setDisplayScore] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDisplayScore(score);
    }, 100);
    return () => clearTimeout(timer);
  }, [score]);

  const clampedScore = Math.min(Math.max(displayScore, 0), 100);
  const needleAngle = -90 + clampedScore * 1.8;
  const needleColor = getColor(displayScore);
  const rating = getRating(displayScore);
  const scoreColor = rating === "较差" ? HIGHLIGHT_RED : needleColor;
  const ratingColor = rating === "较差" ? HIGHLIGHT_RED : needleColor;

  return (
    <section className="rounded-[28px] bg-cabin-interior px-6 pb-6 pt-4 text-text-main shadow-2xl ring-1 ring-uld-border/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(54,120,120,0.15)] sm:px-7 sm:pb-7 sm:pt-5">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1 text-left">
          <p className="text-xs uppercase tracking-[0.4em] text-text-main">
            Performance Score
          </p>
          <h3 className="text-2xl font-semibold text-uld-border">
            智能装载评分
          </h3>
        </div>

        <div className="relative mx-auto -mt-1">
          <svg
            width="260"
            height="170"
            viewBox="0 0 260 170"
            className="max-w-full"
          >
            <defs>
              <filter id="needleShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2" />
                <feOffset dx="1" dy="2" result="offsetblur" />
                <feComponentTransfer>
                  <feFuncA type="linear" slope="0.3" />
                </feComponentTransfer>
                <feMerge>
                  <feMergeNode />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              d="M 40 130 A 90 90 0 0 1 220 130"
              fill="none"
              stroke="#BCBEC0"
              strokeWidth="24"
              strokeLinecap="round"
              pathLength="100"
            />

            <path
              d="M 40 130 A 90 90 0 0 1 220 130"
              fill="none"
              stroke="#005D63"
              strokeWidth="24"
              pathLength="100"
              strokeDasharray="100"
              strokeDashoffset={100 - clampedScore}
              strokeLinecap={clampedScore === 0 ? "butt" : "round"}
              style={{ transition: "stroke-dashoffset 1s ease" }}
            />

            <g
              style={{
                transform: `rotate(${needleAngle}deg)`,
                transformOrigin: "130px 130px",
                transition: "transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              filter="url(#needleShadow)"
            >
              <path
                d="M 130 130 L 118 75 A 8 8 0 0 1 142 75 Z"
                fill={needleColor}
              />
              <circle cx="130" cy="130" r="6" fill="#374151" stroke="white" strokeWidth="2" />
            </g>

            <text
              x="15"
              y="165"
              textAnchor="start"
              className="text-sm font-semibold fill-gray-600"
            >
              0
            </text>
            <text
              x="130"
              y="18"
              textAnchor="middle"
              className="text-sm font-semibold fill-gray-600"
            >
              50
            </text>
            <text
              x="245"
              y="165"
              textAnchor="end"
              className="text-sm font-semibold fill-gray-600"
            >
              100
            </text>
          </svg>
        </div>

        <div className="text-center -mt-4">
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span
              className="text-4xl font-bold tabular-nums"
              style={{ color: scoreColor, transition: "color 0.5s ease" }}
            >
              {Math.round(displayScore)}
            </span>
            <span className="text-3xl font-semibold text-gray-900 leading-tight">
              / 100
            </span>
          </div>
          <div
            className="mt-0 text-xl font-semibold"
            style={{ color: ratingColor, transition: "color 0.5s ease" }}
          >
            {rating}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScoreDisplay;

