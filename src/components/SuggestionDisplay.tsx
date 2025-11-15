'use client';

import React from "react";
import {
  AlertTriangle,
  Lightbulb,
  Sparkles,
  ThumbsUp,
  Info,
} from "lucide-react";

import { useLayoutStore } from "@/store/useLayoutStore";

const detectSuggestionType = (text: string) => {
  const normalized = text.toLowerCase();
  if (
    normalized.includes("超重") ||
    normalized.includes("警告") ||
    normalized.includes("风险")
  ) {
    return "warning" as const;
  }
  if (normalized.includes("保持") || normalized.includes("均衡")) {
    return "success" as const;
  }
  if (normalized.trim().length === 0 || normalized === "暂无优化建议") {
    return "empty" as const;
  }
  return "info" as const;
};

const TYPE_CONFIG = {
  warning: {
    icon: AlertTriangle,
    textColor: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    label: "警告",
  },
  info: {
    icon: Sparkles,
    textColor: "text-sky-600",
    bg: "bg-sky-50",
    border: "border-sky-200",
    label: "优化建议",
  },
  success: {
    icon: ThumbsUp,
    textColor: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "表现良好",
  },
  empty: {
    icon: Info,
    textColor: "text-slate-500",
    bg: "bg-slate-50",
    border: "border-slate-200",
    label: "暂无建议",
  },
};

const SuggestionDisplay: React.FC = () => {
  const suggestion = useLayoutStore((state) => state.suggestion);
  const optimizeLayout = useLayoutStore((state) => state.optimizeLayout);

  const type = detectSuggestionType(suggestion);
  const typeConfig = TYPE_CONFIG[type];
  const Icon = typeConfig.icon;
  const isEmpty = type === "empty";

  const handleApply = () => {
    optimizeLayout();
  };

  return (
    <section className="rounded-[28px] bg-cabin-interior p-6 text-text-main shadow-2xl ring-1 ring-uld-border/10 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_60px_rgba(54,120,120,0.15)] sm:p-7">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-uld-border/10 text-uld-border">
          <Lightbulb size={24} />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-text-main">
            AI Optimization
          </p>
          <h3 className="text-2xl font-semibold text-uld-border">
            AI优化建议
          </h3>
        </div>
      </div>

      <div
        className={`mt-5 rounded-2xl border px-4 py-3 ${typeConfig.bg} ${typeConfig.border}`}
      >
        <div className="flex items-center gap-2">
          <Icon className={`${typeConfig.textColor}`} size={18} />
          <span className={`text-sm font-semibold ${typeConfig.textColor}`}>
            {typeConfig.label}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
          {suggestion || "暂无优化建议"}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-text-main">
        <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium">
          由 AI 模型综合重心、重量分布和历史数据生成
        </span>
      </div>

      <button
        type="button"
        onClick={handleApply}
        disabled={isEmpty}
        className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
          isEmpty
            ? "cursor-not-allowed bg-slate-300 text-slate-500"
            : "bg-uld-border hover:bg-uld-border/90 shadow-lg"
        }`}
      >
        {isEmpty ? "当前无需操作" : "应用建议"}
      </button>
    </section>
  );
};

export default SuggestionDisplay;

