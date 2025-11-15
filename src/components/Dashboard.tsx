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
              width={300}
              height={120}
              priority
              className="w-full max-w-[300px] h-auto"
            />
            <div>
              <h1 className="mt-3 text-3xl font-semibold text-uld-border sm:text-4xl">
                智能ULD配载方案
              </h1>
            </div>
          </div>
          <div className="rounded-lg bg-white px-4 py-3 text-gray-600 shadow">
            <p className="text-sm uppercase tracking-[0.2em] text-gray-400">
              Developed by
            </p>
            <p className="text-base font-semibold text-cathay-jade">
              Neochain
            </p>
          </div>
        </div>
        <p className="text-base text-text-main/80">
          通过使用AI算法，智能化调节ULD配载方案，节省燃油成本。
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

