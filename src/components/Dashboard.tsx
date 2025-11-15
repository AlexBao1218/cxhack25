'use client';

import React from "react";
import { Plane } from "lucide-react";

import CGDisplay from "@/components/CGDisplay";
import ScoreDisplay from "@/components/ScoreDisplay";
import { useLayoutStore } from "@/store/useLayoutStore";

const Dashboard: React.FC = () => {
  const loadedCount = useLayoutStore(
    (state) =>
      state.positions.filter((position) => position.assigned_uld !== null)
        .length,
  );

  return (
    <section className="rounded-[32px] bg-cabin-bg/60 p-6 shadow-inner ring-1 ring-uld-border/10 transition-all duration-200 hover:-translate-y-0.5 sm:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-uld-border/40 bg-white/80 text-uld-border">
              <Plane size={22} />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-text-main">
                Cathay Cargo Control
              </p>
              <h1 className="text-3xl font-semibold text-uld-border sm:text-4xl">
                Cathay Cargo - ULD装载优化系统
              </h1>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-text-main shadow">
            已装载 ULD：
            <span className="text-uld-border">{loadedCount}</span>
          </div>
        </div>
        <p className="text-sm text-text-main/80">
          实时洞察重心、装载得分与AI建议，确保主/下甲板的安全高效装载。
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <CGDisplay />
        <ScoreDisplay />
      </div>
    </section>
  );
};

export default Dashboard;

