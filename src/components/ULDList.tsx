'use client';

import React from "react";
import { Package, GripVertical, RotateCcw, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

import type { ULD } from "@/types";
import { useLayoutStore } from "@/store/useLayoutStore";
import DraggableULD from "@/components/DraggableULD";

const CARD_BASE_STYLE =
  "group min-h-[90px] rounded-2xl border border-uld-border/30 bg-white px-3 py-3 text-sm text-text-main shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl";

const DND_INSTRUCTIONS_ID = "dnd-kit-cargo-describedby";

export const ULDCard: React.FC<{ uld: ULD; withHandle?: boolean }> = ({
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

const DraggableCard: React.FC<{ uld: ULD }> = ({ uld }) => (
  <DraggableULD
    uld={uld}
    source="list"
    ariaDescribedBy={DND_INSTRUCTIONS_ID}
    className="w-full"
  >
    <ULDCard uld={uld} withHandle />
  </DraggableULD>
);

const ULDList: React.FC = () => {
  const unassignedUlds = useLayoutStore((state) => state.unassignedUlds);
  const positions = useLayoutStore((state) => state.positions);
  const optimizeLayout = useLayoutStore((state) => state.optimizeLayout);
  const clearAllAssignments = useLayoutStore(
    (state) => state.clearAllAssignments,
  );
  const isLoading = useLayoutStore((state) => state.isLoading);

  const sortedUlds = React.useMemo(() => {
    return [...unassignedUlds].sort((a, b) => {
      if (a.isPriority !== b.isPriority) {
        return a.isPriority ? -1 : 1;
      }
      return a.id.localeCompare(b.id, "en");
    });
  }, [unassignedUlds]);
  const totalCount = positions.length;
  const assignedCount = positions.filter((pos) => pos.assigned_uld).length;

  return (
    <>
      <span id={DND_INSTRUCTIONS_ID} className="sr-only">
        按空格选中ULD后，可通过箭头键在布局中移动并在目标仓位释放。
      </span>
      <div className="flex w-full flex-col text-text-main">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package size={20} className="text-uld-border/70" />
            <h2 className="text-lg font-semibold text-gray-900">ULD 列表</h2>
          </div>
          <div className="text-sm text-gray-600">
            已装载:
            <span className="ml-1 text-lg font-semibold text-gray-900">
              {assignedCount}/{totalCount}
            </span>
          </div>
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
    </>
  );
};

export default ULDList;

