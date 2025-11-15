'use client';

import React from "react";
import {
  DragOverlay,
  useDraggable,
  useDndMonitor,
} from "@dnd-kit/core";
import { Package, Weight, Box, Tag, GripVertical } from "lucide-react";

import type { ULD } from "@/types";
import { useLayoutStore } from "@/store/useLayoutStore";

const CARD_BASE_STYLE =
  "group rounded-2xl border border-uld-border/20 bg-cabin-interior px-4 py-4 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-lg";

const ULDCard: React.FC<{ uld: ULD; withHandle?: boolean }> = ({
  uld,
  withHandle = false,
}) => {
  return (
    <div className={CARD_BASE_STYLE}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-text-main">{uld.id}</h3>
          <div className="mt-1 flex items-center gap-1 text-xs uppercase tracking-wide text-uld-border">
            <Tag size={14} />
            {uld.type}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {uld.isPriority && (
            <span className="rounded-full bg-yellow-300/80 px-2 py-0.5 text-[11px] font-semibold text-black">
              优先
            </span>
          )}
          {withHandle && (
            <GripVertical size={16} className="text-uld-border/70" />
          )}
        </div>
      </div>
      <div className="mt-4 space-y-2 text-sm text-text-main">
        <div className="flex items-center gap-2">
          <Weight size={16} className="text-uld-border" />
          <span>{uld.weight.toLocaleString()} kg</span>
        </div>
        <div className="flex items-center gap-2">
          <Box size={16} className="text-uld-border" />
          <span>{uld.volume} m³</span>
        </div>
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
      className={`w-full cursor-grab ${isDragging ? "opacity-50" : ""}`}
      {...listeners}
      {...attributes}
    >
      <ULDCard uld={uld} withHandle />
    </button>
  );
};

const ULDList: React.FC = () => {
  const unassignedUlds = useLayoutStore((state) => state.unassignedUlds);
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
      <aside className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-uld-border/10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-text-main">
              Unassigned
            </p>
            <h2 className="text-xl font-semibold text-uld-border">ULD 列表</h2>
          </div>
          <Package size={24} className="text-uld-border/70" />
        </div>

        {sortedUlds.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center rounded-2xl bg-cabin-bg/50 text-center text-sm text-text-main">
            <span role="img" aria-label="done">
              ✅
            </span>
            所有ULD已分配
          </div>
        ) : (
          <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
            {sortedUlds.map((uld) => (
              <DraggableCard key={uld.id} uld={uld} />
            ))}
          </div>
        )}
      </aside>
      <DragOverlay>
        {activeULD ? (
          <div className="max-w-sm opacity-90 shadow-2xl">
            <ULDCard uld={activeULD} withHandle />
          </div>
        ) : null}
      </DragOverlay>
    </>
  );
};

export default ULDList;

