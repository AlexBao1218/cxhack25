'use client';

import React from "react";
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
        <div className="mx-auto flex w-full max-w-[68rem] flex-col gap-6 px-4 py-8 sm:px-6">
          <Dashboard />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <div className="col-span-12 rounded-3xl bg-white p-5 shadow-lg ring-1 ring-uld-border/10 lg:col-span-7">
              <AircraftCabin
                highlightPositionId={highlightPositionId}
                highlightPositions={optimizedHighlights}
              />
            </div>

            <div className="col-span-12 rounded-3xl bg-white p-5 shadow-lg ring-1 ring-uld-border/10 lg:col-span-5">
              <ULDList />
            </div>
          </div>
        </div>
      </DndContext>
      <LoadingOverlay />
    </main>
  );
}
