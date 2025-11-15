'use client';

import React from "react";
import {
  DndContext,
  type DragEndEvent,
} from "@dnd-kit/core";

import AircraftCabin from "./AircraftCabin";
import ULDList from "./ULDList";
import { useLayoutStore } from "@/store/useLayoutStore";
import type { Position, ULD } from "@/types";

const AircraftCabinClient: React.FC = () => {
  const assignULD = useLayoutStore((state) => state.assignULD);
  const swapULD = useLayoutStore((state) => state.swapULD);

  const performDrop = React.useCallback(
    (activeItem: ULD | undefined, targetPosition: Position | undefined) => {
      if (!activeItem || !targetPosition || targetPosition.isFixed) {
        return;
      }

      const { positions } = useLayoutStore.getState();
      const current = positions.find((pos) => pos.id === targetPosition.id);
      if (!current) {
        return;
      }

      const result = current.assigned_uld
        ? swapULD(activeItem.id, targetPosition.id)
        : assignULD(activeItem.id, targetPosition.id);

      if (!result.success) {
        console.warn(result.message);
      }
    },
    [assignULD, swapULD],
  );

  const handleDragStart = () => {
    // 可在此扩展拖拽开始的提示
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const activeItem = event.active.data.current as ULD | undefined;
    const target = event.over?.data.current as
      | { position: Position }
      | undefined;

    if (!event.over) {
      console.log("未放置到有效仓位");
    }

    performDrop(activeItem, target?.position);
  };

  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex-1">
          <AircraftCabin />
        </div>
        <div className="flex justify-center lg:w-[360px]">
          <ULDList />
        </div>
      </div>
    </DndContext>
  );
};

export default AircraftCabinClient;

