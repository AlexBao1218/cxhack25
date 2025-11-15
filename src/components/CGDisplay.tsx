'use client';

import React from "react";
import { ArrowRight } from "lucide-react";

import { useLayoutStore } from "@/store/useLayoutStore";

const BEST_RANGE = { min: 40, max: 50 }; // 单位：英尺
const BAR_OFFSET_FROM_CENTER = 18;
const TRIANGLE_HEIGHT = 14;
const TRIANGLE_WIDTH = 18;
const TRIANGLE_COLOR = "#f97316";
const TRIANGLE_BAR_GAP = 18;
const BASE_BADGE_PADDING = 14; // px baseline padding
const EXTRA_PADDING_PER_PERCENT = 2; // px increase per percent offset

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const CGDisplay: React.FC = () => {
  const cgValue = useLayoutStore((state) => state.cgValue);

  const cgFeet = clamp(cgValue ?? 0, 0, 100);
  const indicatorLeft = `calc(${cgFeet}% - 10px)`;
  const isWithinBestRange =
    cgFeet >= BEST_RANGE.min && cgFeet <= BEST_RANGE.max;
  const offsetFeet =
    cgFeet < BEST_RANGE.min
      ? cgFeet - BEST_RANGE.min
      : cgFeet > BEST_RANGE.max
        ? cgFeet - BEST_RANGE.max
        : 0;
  const offsetLabel =
    offsetFeet === 0
      ? ""
      : `${offsetFeet > 0 ? "+" : ""}${Math.abs(offsetFeet).toFixed(1)} ft`;

  const arrowDirection = offsetFeet < 0 ? "left" : "right";
  const arrowStyle =
    arrowDirection === "left"
      ? "rotate-180 origin-center"
      : "origin-center";

  const absOffsetFeet = Math.abs(offsetFeet);
  const extraPadding = absOffsetFeet * EXTRA_PADDING_PER_PERCENT;
  const dynamicPadding = BASE_BADGE_PADDING + extraPadding / 2;

  const triangleTop = `calc(50% + ${BAR_OFFSET_FROM_CENTER - TRIANGLE_BAR_GAP}px)`;

  return (
    <section className="rounded-[28px] bg-cabin-interior p-6 text-text-main shadow-2xl ring-1 ring-uld-border/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(54,120,120,0.15)] sm:p-7">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-uld-border">重心监控</h3>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-uld-border">
            {cgValue?.toFixed(1) ?? "--"} ft
          </span>
          <span className="text-sm text-text-main">当前重心（纵向）</span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="relative mx-auto w-full max-w-4xl px-2">
          <div className="relative w-full rounded-[32px] bg-gradient-to-b from-cabin-bg/40 to-white p-6 shadow-inner">
            <div className="relative h-28 w-full">
              <div className="absolute inset-x-0 top-1/2">
                <div className="relative h-8 -translate-y-1/2 rounded-full border-2 border-slate-300 bg-white">
                  <div
                    className="absolute top-1/2 h-8 -translate-y-1/2 rounded-full bg-light-jade"
                    style={{
                      left: `${BEST_RANGE.min}%`,
                      width: `${BEST_RANGE.max - BEST_RANGE.min}%`,
                    }}
                  />
                </div>
                <div
                  className={`absolute z-10 flex h-6 items-center rounded-full px-2 text-xs font-semibold text-white transition-all duration-300 ${
                    isWithinBestRange ? "bg-green-500" : "bg-orange-500"
                  }`}
                  style={{
                    left: indicatorLeft,
                    top: "-12px",
                    transform: "translateX(-50%)",
                  }}
                >
                  CG: {cgFeet.toFixed(1)} ft
                </div>
                <div
                  className="absolute z-20 flex items-center justify-center transition-all duration-300"
                  style={{
                    left: indicatorLeft,
                    top: triangleTop,
                    transform: "translateX(-50%)",
                  }}
                >
                  <div
                    className="h-0 w-0"
                    style={{
                      borderLeft: `${TRIANGLE_WIDTH / 2}px solid transparent`,
                      borderRight: `${TRIANGLE_WIDTH / 2}px solid transparent`,
                      borderBottom: `${TRIANGLE_HEIGHT}px solid ${TRIANGLE_COLOR}`,
                      filter: "drop-shadow(0px 3px 6px rgba(249, 115, 22, 0.35))",
                    }}
                  />
                </div>
                <span className="absolute left-0 -top-8 text-xs font-semibold text-slate-400">
                  Nose
                </span>
                <span className="absolute right-0 -top-8 text-xs font-semibold text-slate-400">
                  Tail
                </span>
                {!isWithinBestRange && (
                  <div
                    className="absolute z-20 flex h-8 items-center justify-center gap-2 rounded-full bg-yellow-400/90 py-1 text-xs font-semibold text-yellow-900 transition-all duration-300"
                    style={{
                      left: indicatorLeft,
                      top: "calc(100% + 12px)",
                      transform: "translateX(-50%)",
                      paddingLeft: `${dynamicPadding}px`,
                      paddingRight: `${dynamicPadding}px`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <ArrowRight
                      size={16}
                      className={arrowStyle}
                    />
                    偏移 {offsetLabel}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 text-base font-medium text-text-main">
          <div className="flex flex-wrap items-center gap-2">
            <span className="block h-3 w-3 rounded-full bg-light-jade" />
            可接受重心范围 {BEST_RANGE.min} ft - {BEST_RANGE.max} ft
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isWithinBestRange ? (
              <>
                <span className="block h-3 w-3 rounded-full bg-green-500" />
                <span className="text-green-600">重心表现良好</span>
              </>
            ) : (
              <>
                <span className="block h-3 w-3 rounded-full bg-yellow-400" />
                <span className="font-semibold text-yellow-700">
                  已偏离可接受范围，请调整装载
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CGDisplay;

