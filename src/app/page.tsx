'use client';

import React from "react";
import { Sparkles } from "lucide-react";
import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import toast from "react-hot-toast";

import AircraftCabin from "@/components/AircraftCabin";
import Dashboard from "@/components/Dashboard";
import LoadingOverlay from "@/components/Loading";
import ULDList from "@/components/ULDList";
import { useLayoutStore } from "@/store/useLayoutStore";
import type { Position, ULD } from "@/types";

export default function Home() {
  const assignULD = useLayoutStore((state) => state.assignULD);
  const swapULD = useLayoutStore((state) => state.swapULD);
  const optimizeLayout = useLayoutStore((state) => state.optimizeLayout);
  const isLoading = useLayoutStore((state) => state.isLoading);
  const recentOptimizedPositions = useLayoutStore(
    (state) => state.recentOptimizedPositions,
  );
  const clearRecentOptimizedPositions = useLayoutStore(
    (state) => state.clearRecentOptimizedPositions,
  );
  const [highlightPositionId, setHighlightPositionId] = React.useState<
    string | null
  >(null);
  const [optimizedHighlights, setOptimizedHighlights] = React.useState<
    string[]
  >([]);

  React.useEffect(() => {
    if (!highlightPositionId) {
      return;
    }
    const timer = window.setTimeout(() => setHighlightPositionId(null), 1400);
    return () => window.clearTimeout(timer);
  }, [highlightPositionId]);

  React.useEffect(() => {
    if (recentOptimizedPositions.length === 0) {
      return;
    }
    setOptimizedHighlights(recentOptimizedPositions);
    toast.success("优化完成！");
    const timer = window.setTimeout(() => {
      setOptimizedHighlights([]);
      clearRecentOptimizedPositions();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [recentOptimizedPositions, clearRecentOptimizedPositions]);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const activeItem = active.data.current as ULD | undefined;

      if (!activeItem) {
        return;
      }

      if (!over) {
        toast("未放置到有效仓位，保持在列表中");
        return;
      }

      const targetData = over.data.current as
        | { position?: Position }
        | undefined;
      const targetPositionId = targetData?.position?.id;
      if (!targetPositionId) {
        console.warn("目标区域缺少仓位数据");
        return;
      }

      const store = useLayoutStore.getState();
      const targetPosition = store.positions.find(
        (pos) => pos.id === targetPositionId,
      );

      if (!targetPosition) {
        toast.error("未找到目标仓位");
        return;
      }

      if (targetPosition.isFixed) {
        toast.error("此仓位为固定仓位，不可更改");
        return;
      }

      const overweight = activeItem.weight > targetPosition.max_weight;
      if (overweight) {
        const confirmOverweight = window.confirm(
          `此操作将导致超重，是否继续？（最大承重 ${targetPosition.max_weight.toLocaleString()} kg）`,
        );
        if (!confirmOverweight) {
          toast("已取消超重操作");
          return;
        }
      }

      const action = targetPosition.assigned_uld ? swapULD : assignULD;
      const result = action(activeItem.id, targetPosition.id);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      setHighlightPositionId(targetPosition.id);
    },
    [assignULD, swapULD],
  );

  return (
    <main className="min-h-screen bg-gradient-to-b from-cabin-bg to-white">
      <DndContext onDragEnd={handleDragEnd}>
        <div className="mx-auto flex h-screen max-w-[1400px] flex-col gap-6 px-4 py-8 sm:px-8">
          <header className="flex flex-col gap-4 rounded-[32px] bg-cabin-interior/90 p-4 text-text-main shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-uld-border/20 bg-cabin-bg text-uld-border">
                <Sparkles size={22} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-text-main">
                  Cathay Cargo Control
                </p>
                <h1 className="text-2xl font-semibold text-uld-border sm:text-3xl">
                  Cathay Cargo - ULD装载优化系统
                </h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isLoading) return;
                const confirmed = window.confirm(
                  "是否要应用AI优化？当前配置将被覆盖。",
                );
                if (!confirmed) return;
                optimizeLayout();
              }}
              disabled={isLoading}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-uld-border/40 ${
                isLoading
                  ? "cursor-not-allowed bg-uld-border/60"
                  : "bg-gradient-to-r from-uld-border to-emerald-500 hover:-translate-y-0.5 hover:shadow-2xl active:scale-95"
              }`}
            >
              {isLoading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  优化中...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  AI一键优化
                </>
              )}
            </button>
          </header>

          <div className="flex flex-1 flex-col gap-6">
            <div className="flex-none">
              <Dashboard />
            </div>
            <div className="flex flex-1 flex-col gap-6 lg:flex-row">
              <div className="flex min-h-[55vh] flex-1 rounded-[40px] bg-cabin-interior p-4 shadow-2xl transition-all sm:p-6">
                <AircraftCabin
                  highlightPositionId={highlightPositionId}
                  highlightPositions={optimizedHighlights}
                />
              </div>
              <div className="flex min-h-[45vh] w-full flex-col lg:w-[420px]">
                <ULDList />
              </div>
            </div>
          </div>
        </div>
      </DndContext>
      <LoadingOverlay />
    </main>
  );
}
