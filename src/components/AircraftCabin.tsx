'use client';

import React from "react";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import { Ban, Lock } from "lucide-react";

import { useLayoutStore } from "@/store/useLayoutStore";
import type { Position, ULD } from "@/types";

const sortPositions = (positions: Position[], prefix: string) =>
  positions
    .filter((pos) => pos.id.startsWith(prefix))
    .sort((a, b) => {
      const aNum = parseInt(a.id.replace(/\D/g, ""), 10);
      const bNum = parseInt(b.id.replace(/\D/g, ""), 10);
      return aNum - bNum;
    });

const PositionCard: React.FC<{
  position: Position;
  uld?: ULD;
  onUnassign: (positionId: string) => void;
}> = ({ position, uld, onUnassign }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: position.id,
    data: { position },
    disabled: position.isFixed,
  });
  const { active } = useDndContext();
  const draggingULD = active?.data.current as ULD | undefined;

  const assignedOverweight =
    typeof uld !== "undefined" && uld.weight > position.max_weight;
  const hovering = isOver && !position.isFixed;
  const hoverOverweight =
    hovering && draggingULD
      ? draggingULD.weight > position.max_weight
      : false;

  let borderColor = assignedOverweight ? "border-red-500" : "border-uld-border";
  let borderWidth = "border";
  if (hovering) {
    borderWidth = "border-2";
    borderColor = hoverOverweight ? "border-red-500" : "border-blue-400";
  }

  const background = uld ? "bg-uld-assigned text-white" : "bg-cabin-interior";
  const textColor = uld ? "text-white/90" : "text-text-main";
  const cursorClass = position.isFixed
    ? "cursor-not-allowed"
    : uld
      ? "cursor-pointer"
      : "cursor-default";

  const handleUnassign = () => {
    if (!position.isFixed && uld) {
      onUnassign(position.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleUnassign}
      role={uld && !position.isFixed ? "button" : undefined}
      className={`relative flex h-28 w-full flex-col justify-between rounded-2xl ${borderWidth} ${borderColor} ${background} px-3 py-3 text-sm shadow-sm transition ${cursorClass}`}
      aria-disabled={position.isFixed}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className={`text-xs font-medium ${textColor}`}>
            {position.id}
          </span>
          {uld ? (
            <>
              <span className="text-lg font-semibold">{uld.id}</span>
              <span className={`text-xs ${textColor}`}>
                {uld.weight.toLocaleString()} kg
              </span>
            </>
          ) : (
            <span className={`text-xs ${textColor}`}>
              最大承重 {position.max_weight.toLocaleString()} kg
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {uld?.isPriority && (
            <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-[10px] font-semibold uppercase text-black">
              Priority
            </span>
          )}
          {position.isFixed && (
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium ${textColor}`}
            >
              <Lock size={12} />
              <Ban size={12} />
              固定
            </span>
          )}
        </div>
      </div>
      <div className={`flex items-center justify-between text-[11px] ${textColor}`}>
        <span>
          当前 {position.current_weight.toLocaleString()}/
          {position.max_weight.toLocaleString()} kg
        </span>
        {assignedOverweight && <span className="text-red-200">超重!</span>}
      </div>

      {hovering && !hoverOverweight && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-blue-500/10 text-xs font-semibold text-blue-800">
          放置在此
        </div>
      )}
      {hoverOverweight && (
        <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-xl bg-red-600/85 px-2 py-1 text-center text-[10px] text-white">
          超重！最大承重: {position.max_weight.toLocaleString()} kg
        </div>
      )}
    </div>
  );
};

const Section: React.FC<{
  title: string;
  left: Position[];
  right: Position[];
  ulds: ULD[];
  onUnassign: (positionId: string) => void;
}> = ({ title, left, right, ulds, onUnassign }) => (
  <div>
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-text-main">
        {title}
      </h3>
      <div className="h-px flex-1 bg-uld-border/40" />
    </div>
    <div className="flex flex-col gap-6 sm:flex-row">
      <div className="flex flex-1 flex-col gap-3">
        {left.map((position) => (
          <PositionCard
            key={position.id}
            position={position}
            uld={
              position.assigned_uld
                ? ulds.find((item) => item.id === position.assigned_uld)
                : undefined
            }
            onUnassign={onUnassign}
          />
        ))}
      </div>
      <div className="hidden h-full w-px bg-uld-border/30 sm:block" />
      <div className="flex flex-1 flex-col gap-3">
        {right.map((position) => (
          <PositionCard
            key={position.id}
            position={position}
            uld={
              position.assigned_uld
                ? ulds.find((item) => item.id === position.assigned_uld)
                : undefined
            }
            onUnassign={onUnassign}
          />
        ))}
      </div>
    </div>
  </div>
);

const AircraftCabin: React.FC = () => {
  const positions = useLayoutStore((state) => state.positions);
  const ulds = useLayoutStore((state) => state.ulds);
  const unassignULD = useLayoutStore((state) => state.unassignULD);

  const handleUnassign = React.useCallback(
    (positionId: string) => {
      const result = unassignULD(positionId);
      if (!result.success) {
        console.warn(result.message);
      }
    },
    [unassignULD],
  );

  const mainLeft = React.useMemo(
    () => sortPositions(positions, "L"),
    [positions],
  );
  const mainRight = React.useMemo(
    () => sortPositions(positions, "R"),
    [positions],
  );
  const lowerLeft = React.useMemo(
    () => sortPositions(positions, "A"),
    [positions],
  );
  const lowerRight = React.useMemo(
    () => sortPositions(positions, "B"),
    [positions],
  );

  return (
    <section className="bg-cabin-bg py-8 px-4 sm:px-8">
      <div className="mx-auto w-full max-w-6xl rounded-[60px] border border-uld-border/40 bg-cabin-interior p-6 sm:p-10 shadow-2xl">
        <div className="mb-6 flex flex-col gap-2 text-text-main">
          <h2 className="text-2xl font-semibold text-uld-border">
            Boeing 747-8F Cabin Layout
          </h2>
          <p className="text-sm">
            查看当前主甲板与下甲板的ULD分布、优先货状态以及固定仓位。
          </p>
        </div>

        <div className="relative overflow-hidden rounded-[50px] border border-uld-border/30 bg-gradient-to-b from-cabin-interior to-cabin-bg p-6">
          <div className="absolute -left-12 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full border border-uld-border/20 bg-cabin-bg" />
          <div className="absolute -right-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full border border-uld-border/20 bg-cabin-bg/80" />

          <div className="space-y-10">
            <Section
              title="Main Deck"
              left={mainLeft}
              right={mainRight}
              ulds={ulds}
              onUnassign={handleUnassign}
            />
            <Section
              title="Lower Deck"
              left={lowerLeft}
              right={lowerRight}
              ulds={ulds}
              onUnassign={handleUnassign}
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AircraftCabin;

