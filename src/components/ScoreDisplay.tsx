'use client';

import React from "react";
import CountUp from "react-countup";

import { useLayoutStore } from "@/store/useLayoutStore";

const LEVELS = [
  {
    min: 80,
    label: "优秀",
    color: {
      text: "text-emerald-600",
      bg: "bg-emerald-100",
      bar: "from-emerald-400 to-emerald-500",
    },
  },
  {
    min: 60,
    label: "良好",
    color: {
      text: "text-yellow-600",
      bg: "bg-yellow-100",
      bar: "from-yellow-400 to-yellow-500",
    },
  },
  {
    min: 40,
    label: "一般",
    color: {
      text: "text-orange-600",
      bg: "bg-orange-100",
      bar: "from-orange-400 to-orange-500",
    },
  },
  {
    min: 0,
    label: "较差",
    color: {
      text: "text-red-600",
      bg: "bg-red-100",
      bar: "from-red-400 to-red-500",
    },
  },
];

const getLevel = (score: number) =>
  LEVELS.find((level) => score >= level.min) ?? LEVELS[LEVELS.length - 1];

const ScoreDisplay: React.FC = () => {
  const score = useLayoutStore((state) => state.score);
  const [progressWidth, setProgressWidth] = React.useState(`${score}%`);

  const level = React.useMemo(() => getLevel(score), [score]);

  React.useEffect(() => {
    const handle = window.requestAnimationFrame(() => {
      setProgressWidth(`${Math.min(Math.max(score, 0), 100)}%`);
    });
    return () => window.cancelAnimationFrame(handle);
  }, [score]);

  return (
    <section className="rounded-[28px] bg-cabin-interior p-6 text-text-main shadow-2xl ring-1 ring-uld-border/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(54,120,120,0.15)] sm:p-7">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-baseline gap-3">
            <span className={`text-5xl font-bold ${level.color.text}`}>
              <CountUp key={score} end={score} duration={1} />
            </span>
            <span className="text-sm text-text-main">/ 100</span>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-4 py-1 text-sm font-semibold ${level.color.bg} ${level.color.text}`}
          >
            {level.label}
          </span>
        </div>

        <p className="text-sm text-text-main">
          基于重心优化、重量分布和装载效率综合评估
        </p>

        <div className="mt-2">
          <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-200/70">
            <div
              className={`absolute left-0 top-0 h-full rounded-full bg-gradient-to-r ${level.color.bar} transition-all duration-500 ease-out`}
              style={{ width: progressWidth }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs font-medium text-slate-400">
            <span>0</span>
            <span>100</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ScoreDisplay;

