'use client';

import React from "react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import toast from "react-hot-toast";

import AircraftCabin from "@/components/AircraftCabin";
import Dashboard from "@/components/Dashboard";
import LoadingOverlay from "@/components/Loading";
import ULDList, { ULDCard } from "@/components/ULDList";
import { useLayoutStore } from "@/store/useLayoutStore";
import type { Position, ULD } from "@/types";

type DragPayload = {
  type: "ULD";
  uld: ULD;
  source: "list" | "position";
  positionId?: string;
};

export default function Home() {
  const assignULD = useLayoutStore((state) => state.assignULD);
  const swapULD = useLayoutStore((state) => state.swapULD);
  const unassignULD = useLayoutStore((state) => state.unassignULD);
  const moveULDWithinPositions = useLayoutStore(
    (state) => state.moveULDWithinPositions,
  );
  const swapPositions = useLayoutStore((state) => state.swapPositions);
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
  const [activeDragItem, setActiveDragItem] = React.useState<DragPayload | null>(
    null,
  );

  React.useEffect(() => {
    if (!highlightPositionId) {
      return;
    }
    const timer = window.setTimeout(() => setHighlightPositionId(null), 700);
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
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [recentOptimizedPositions, clearRecentOptimizedPositions]);

  const handleDragStart = React.useCallback((event: DragStartEvent) => {
    const payload = event.active.data.current as DragPayload | undefined;
    if (payload?.uld) {
      setActiveDragItem(payload);
    }
  }, []);

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      const payload = active.data.current as DragPayload | undefined;
      setActiveDragItem(null);

      if (!payload?.uld) {
        return;
      }

      if (!over) {
        if (payload.source === "position" && payload.positionId) {
          const result = unassignULD(payload.positionId);
          if (result.success) {
            toast.success(result.message);
          } else {
            toast.error(result.message);
          }
        } else {
          toast("未放置到有效仓位，保持在列表中");
        }
        return;
      }

      const targetData = over.data.current as
        | { position?: Position }
        | undefined;
      const targetPositionId = targetData?.position?.id;
      if (!targetPositionId) {
        toast.error("目标区域缺少仓位数据");
        return;
      }

      if (payload.positionId === targetPositionId) {
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

      if (payload.source === "list") {
        const action = targetPosition.assigned_uld ? swapULD : assignULD;
        const result = action(payload.uld.id, targetPosition.id);

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        setHighlightPositionId(targetPosition.id);
        return;
      }

      if (payload.source === "position" && payload.positionId) {
        const sourcePosition = store.positions.find(
          (pos) => pos.id === payload.positionId,
        );

        if (!sourcePosition) {
          toast.error("未找到原仓位");
          return;
        }

        if (sourcePosition.isFixed) {
          toast.error("此仓位为固定仓位，不可更改");
          return;
        }

        if (!targetPosition.assigned_uld) {
          const result = moveULDWithinPositions(
            payload.positionId,
            targetPositionId,
          );

          if (!result.success) {
            toast.error(result.message);
            return;
          }

          toast.success(result.message);
          setHighlightPositionId(targetPositionId);
          return;
        }

        const result = swapPositions(payload.positionId, targetPositionId);
        if (!result.success) {
          toast.error(result.message);
          return;
        }
        toast.success(result.message);
        setHighlightPositionId(targetPositionId);
        return;
      }
    },
    [
      assignULD,
      swapULD,
      unassignULD,
      moveULDWithinPositions,
      swapPositions,
    ],
  );

  const handleDragCancel = React.useCallback(() => {
    setActiveDragItem(null);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-cabin-bg to-white">
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
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
        <DragOverlay>
          {activeDragItem?.uld ? (
            <div className="w-[240px] max-w-xs opacity-90 shadow-2xl">
              <ULDCard
                uld={activeDragItem.uld}
                withHandle={activeDragItem.source === "list"}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      <LoadingOverlay />
    </main>
  );
}
