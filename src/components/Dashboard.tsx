'use client';

import React from "react";

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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-text-main">
            Load Analytics
          </p>
          <h2 className="text-2xl font-semibold text-uld-border">
            装载方案分析
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-text-main shadow">
          已装载 ULD：{" "}
          <span className="text-uld-border">{loadedCount}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <CGDisplay />
        <ScoreDisplay />
      </div>
    </section>
  );
};

export default Dashboard;

