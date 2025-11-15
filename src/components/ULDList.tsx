'use client';

import React from "react";
import {
  DragOverlay,
  useDraggable,
  useDndMonitor,
} from "@dnd-kit/core";
import { Package, GripVertical, RotateCcw, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

import type { ULD } from "@/types";
import { useLayoutStore } from "@/store/useLayoutStore";

const CARD_BASE_STYLE =
  "group min-h-[90px] rounded-2xl border border-uld-border/30 bg-white px-3 py-3 text-sm text-text-main shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl";

const DND_INSTRUCTIONS_ID = "dnd-kit-cargo-describedby";

const ULDCard: React.FC<{ uld: ULD; withHandle?: boolean }> = ({
  uld,
  withHandle = false,
}) => {
  return (
    <div className={CARD_BASE_STYLE}>
      <div className="flex items-start justify-between">
        <h3 className="text-xl font-semibold text-text-main">{uld.id}</h3>
        {withHandle && (
          <GripVertical size={16} className="text-uld-border/70" />
        )}
      </div>
      <div className="mt-4 text-base font-semibold text-text-main">
        {uld.weight.toLocaleString()} kg
      </div>
    </div>
  );
};

const DraggableCard: React.FC<{ uld: ULD }> = ({ uld }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: uld.id,
      data: uld,
    });

  const draggableAttributes = React.useMemo(
    () => ({
      ...attributes,
      "aria-describedby": DND_INSTRUCTIONS_ID,
    }),
    [attributes],
  );

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  };

  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className={`w-full cursor-grab transition active:scale-95 ${
        isDragging ? "opacity-50" : ""
      }`}
      {...listeners}
      {...draggableAttributes}
    >
      <ULDCard uld={uld} withHandle />
    </button>
  );
};

const ULDList: React.FC = () => {
  const unassignedUlds = useLayoutStore((state) => state.unassignedUlds);
  const optimizeLayout = useLayoutStore((state) => state.optimizeLayout);
  const clearAllAssignments = useLayoutStore(
    (state) => state.clearAllAssignments,
  );
  const isLoading = useLayoutStore((state) => state.isLoading);
  const loadedCount = useLayoutStore(
    (state) =>
      state.positions.filter((position) => position.assigned_uld).length,
  );
  const [activeULD, setActiveULD] = React.useState<ULD | null>(null);

  useDndMonitor({
    onDragStart(event) {
      const payload = event.active.data.current as ULD | undefined;
      if (payload) {
        setActiveULD(payload);
      }
    },
    onDragEnd() {
      setActiveULD(null);
    },
    onDragCancel() {
      setActiveULD(null);
    },
  });

  const sortedUlds = React.useMemo(() => {
    return [...unassignedUlds].sort((a, b) => {
      if (a.isPriority !== b.isPriority) {
        return a.isPriority ? -1 : 1;
      }
      return a.id.localeCompare(b.id, "en");
    });
  }, [unassignedUlds]);

  return (
    <>
      <span id={DND_INSTRUCTIONS_ID} className="sr-only">
        按空格选中ULD后，可通过箭头键在布局中移动并在目标仓位释放。
      </span>
      <div className="flex w-full flex-col text-text-main">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Package size={22} className="text-uld-border/70" />
            <div>
              <h2 className="text-xl font-semibold text-uld-border">ULD 列表</h2>
              <p className="text-xs uppercase tracking-[0.3em] text-text-main/70">
                Unassigned Pool
              </p>
            </div>
          </div>
          <p className="text-sm font-medium text-text-main">
            已装载 ULD：
            <span className="ml-1 text-uld-border">{loadedCount}</span>
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              if (isLoading) {
                return;
              }
              const confirmed = window.confirm(
                "是否要应用AI一键装载？当前布局将被覆盖。",
              );
              if (!confirmed) {
                return;
              }
              optimizeLayout();
            }}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-cathay-jade px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-cathay-jade/90 disabled:cursor-not-allowed disabled:bg-cathay-jade/60"
          >
            <span className="flex items-center justify-center gap-2">
              {isLoading ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              AI一键装载
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isLoading) {
                return;
              }
              const confirmed = window.confirm(
                "是否清空所有ULD并重置仓位？",
              );
              if (!confirmed) {
                return;
              }
              clearAllAssignments();
              toast.success("已清空所有ULD分配");
            }}
            disabled={isLoading}
            className="flex-1 rounded-xl bg-cathay-saffron px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-cathay-saffron/90 disabled:cursor-not-allowed disabled:bg-cathay-saffron/60"
          >
            <span className="flex items-center justify-center gap-2">
              <RotateCcw className="h-4 w-4" />
              一键清空
            </span>
          </button>
        </div>

        {sortedUlds.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-cabin-bg/30 py-8 text-center text-sm text-text-main">
            <span role="img" aria-label="done">
              ✅
            </span>
            所有ULD已分配
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sortedUlds.map((uld) => (
              <DraggableCard key={uld.id} uld={uld} />
            ))}
          </div>
        )}
      </div>
      <DragOverlay>
        {activeULD ? (
          <div className="w-[260px] max-w-xs opacity-90 shadow-2xl">
            <ULDCard uld={activeULD} withHandle />
          </div>
        ) : null}
      </DragOverlay>
    </>
  );
};

export default ULDList;

