'use client';

import React from "react";

import { useLayoutStore } from "@/store/useLayoutStore";

const LoadingOverlay: React.FC = () => {
  const isLoading = useLayoutStore((state) => state.isLoading);

  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-cabin-bg/80 backdrop-blur-sm transition-opacity">
      <div className="flex flex-col items-center gap-4 rounded-[28px] border border-uld-border/20 bg-cabin-interior px-8 py-6 text-text-main shadow-2xl">
        <span className="h-10 w-10 animate-spin rounded-full border-4 border-uld-border/30 border-t-uld-border" />
        <div className="text-center text-sm font-semibold">
          计算中，请稍候...
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;

