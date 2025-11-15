'use client';

import React from "react";
import Image from "next/image";

import CGDisplay from "@/components/CGDisplay";
import ScoreDisplay from "@/components/ScoreDisplay";
const Dashboard: React.FC = () => {
  return (
    <section className="rounded-[32px] bg-cabin-bg/60 p-6 shadow-inner ring-1 ring-uld-border/10 transition-all duration-200 hover:-translate-y-0.5 sm:p-8">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/Cathay Cargo_logo.png"
              alt="Cathay Pacific Logo"
              width={128}
              height={128}
              priority
              className="h-20 w-auto"
            />
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-text-main">
                Cathay Hackathon
              </p>
              <h1 className="text-3xl font-semibold text-uld-border sm:text-4xl">
                智能ULD装载系统
              </h1>
            </div>
          </div>
          <div className="rounded-lg bg-white px-4 py-2 text-sm text-gray-600 shadow">
            <p className="text-xs uppercase tracking-[0.2em] text-gray-400">
              Developed by
            </p>
            <p className="text-sm font-semibold text-cathay-jade">
              Neochain
            </p>
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

