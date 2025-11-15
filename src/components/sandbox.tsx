'use client';

import React from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

const INITIAL_ITEMS = [
  { id: "cargo-1", label: "红方块 1" },
  { id: "cargo-2", label: "红方块 2" },
  { id: "cargo-3", label: "红方块 3" },
] as const;

const TARGET_IDS = ["slot-1", "slot-2", "slot-3"] as const;

const ITEM_MAP: Record<string, (typeof INITIAL_ITEMS)[number]> =
  INITIAL_ITEMS.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<string, (typeof INITIAL_ITEMS)[number]>,
  );

const DraggableSquare: React.FC<{
  id: string;
  label: string;
  disabled?: boolean;
}> = ({ id, label, disabled }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id,
      disabled,
    });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      className="flex h-20 w-20 items-center justify-center rounded-2xl border border-red-200 bg-red-500 text-white shadow-md transition hover:scale-105 focus:outline-none"
      {...listeners}
      {...attributes}
    >
      {label}
    </button>
  );
};

const DroppableSquare: React.FC<{
  id: string;
  label?: string;
}> = ({ id, label }) => {
  const { isOver, setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-24 w-24 items-center justify-center rounded-2xl border-2 border-blue-200 bg-blue-500/70 text-center text-sm text-white shadow-inner transition ${
        isOver ? "scale-105 border-blue-400 bg-blue-500" : ""
      }`}
    >
      {label ?? "空槽"}
    </div>
  );
};

const Sandbox: React.FC = () => {
  const [availableIds, setAvailableIds] = React.useState<string[]>(
    INITIAL_ITEMS.map((item) => item.id),
  );
  const [slots, setSlots] = React.useState<Record<string, string | null>>({
    "slot-1": null,
    "slot-2": null,
    "slot-3": null,
  });
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      console.log(`拖拽取消：${active.id} 未放到有效区域`);
      return;
    }

    if (!TARGET_IDS.includes(over.id as (typeof TARGET_IDS)[number])) {
      console.log(`无效目标：${String(over.id)}`);
      return;
    }

    setSlots((prevSlots) => {
      const nextSlots = { ...prevSlots };
      const replaced = nextSlots[over.id] ?? null;
      nextSlots[over.id] = active.id as string;

      setAvailableIds((prev) => {
        let result = prev.filter((id) => id !== active.id);
        if (replaced) {
          result = [...result, replaced];
        }
        return result;
      });

      const incomingLabel = ITEM_MAP[active.id as string]?.label ?? active.id;
      if (replaced) {
        const replacedLabel = ITEM_MAP[replaced]?.label ?? replaced;
        console.log(
          `将 ${incomingLabel} 放到 ${over.id}，替换 ${replacedLabel}`,
        );
      } else {
        console.log(`将 ${incomingLabel} 放到 ${over.id}`);
      }

      return nextSlots;
    });
  };

  const handleReset = () => {
    setSlots({
      "slot-1": null,
      "slot-2": null,
      "slot-3": null,
    });
    setAvailableIds(INITIAL_ITEMS.map((item) => item.id));
    setActiveId(null);
    console.log("重置测试环境");
  };

  const overlayItem = activeId ? ITEM_MAP[activeId] : null;

  return (
    <section className="space-y-6 rounded-3xl border border-dashed border-uld-border/40 bg-white p-6 shadow-xl">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <p className="text-sm font-semibold text-uld-border">
            dnd-kit 拖拽沙盒
          </p>
          <p className="text-xs text-text-main">
            测试拖拽到空槽、覆盖已有内容或拖到无效区域（取消）。
          </p>
        </div>
        <button
          onClick={handleReset}
          className="ml-auto rounded-full bg-uld-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow hover:bg-uld-border/90"
        >
          重置测试
        </button>
      </div>

      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="flex flex-1 flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50/80 p-4">
            <h3 className="text-sm font-semibold text-red-600">可拖拽项目</h3>
            <div className="flex flex-wrap gap-4">
              {availableIds.length === 0 ? (
                <span className="text-xs text-red-400">全部已放置</span>
              ) : (
                availableIds.map((id) => (
                  <DraggableSquare key={id} id={id} label={ITEM_MAP[id].label} />
                ))
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center gap-4 rounded-2xl border border-blue-200 bg-blue-50/80 p-4">
            <h3 className="text-sm font-semibold text-blue-600">
              目标区域（可覆盖）
            </h3>
            <div className="grid grid-cols-3 gap-4">
              {TARGET_IDS.map((slotId) => (
                <DroppableSquare
                  key={slotId}
                  id={slotId}
                  label={
                    slots[slotId]
                      ? ITEM_MAP[slots[slotId] as string]?.label
                      : undefined
                  }
                />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>
          {overlayItem ? (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/70 text-white shadow-2xl backdrop-blur">
              {overlayItem.label}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
};

export default Sandbox;

