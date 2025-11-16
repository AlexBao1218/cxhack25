'use client';

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { Search, X } from "lucide-react";

import { useLayoutStore } from "@/store/useLayoutStore";
import toast from "react-hot-toast";
import type { Position, ULD } from "@/types";
import DraggableULD from "@/components/DraggableULD";

const MAIN_DECK_ROWS = [
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
] as const;
const TAIL_POSITION_IDS = ["R1"] as const;
const FLIGHT_NUMBER_REGEX = /^CX\d{4}$/;
const FLIGHT_NUMBER_ERROR = "格式错误，请输入CX+4位数字";

const PositionCard: React.FC<{
  position: Position;
  uld?: ULD;
  onUnassign: (positionId: string) => void;
  isHighlighted?: boolean;
}> = ({ position, uld, onUnassign, isHighlighted = false }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: position.id,
    data: { position },
  });
  const hovering = isOver;
  const baseBorder = "border-uld-border";
  const borderColor = hovering ? "border-blue-400" : baseBorder;

  const background = uld ? "bg-uld-assigned" : "bg-white";
  const cursorClass = uld ? "" : "cursor-default";
  const highlightClass = isHighlighted
    ? "ring-4 ring-uld-border/50 shadow-uld-border/40"
    : "shadow-sm";

  const handleUnassign = () => {
    if (uld) {
      onUnassign(position.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`relative flex h-[72px] w-[176px] items-center justify-between rounded-lg border-2 ${borderColor} ${background} px-3 py-2 transition-all duration-75 ${cursorClass} ${highlightClass}`}
    >
      <div className={`flex-shrink-0 text-lg font-bold ${uld ? "text-white" : "text-gray-900"}`}>
        {position.id}
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {uld ? (
          <>
            <DraggableULD
              uld={uld}
              source="position"
              positionId={position.id}
              className="flex-1"
            >
              <div className="flex flex-1 flex-col items-end text-right text-white">
                <span className="text-lg font-semibold">{uld.id}</span>
                <span className="text-base font-semibold">
                  {position.current_weight.toLocaleString()} kg
                </span>
              </div>
            </DraggableULD>
            <button
              type="button"
              aria-label="移除ULD"
              className="rounded-full bg-white/20 p-1 text-white transition hover:bg-white/40"
              onClick={(event) => {
                event.stopPropagation();
                handleUnassign();
              }}
            >
              <X size={14} />
            </button>
          </>
        ) : (
          <span className="text-base font-medium text-gray-400">待装载</span>
        )}
      </div>

      {hovering && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl bg-blue-500/10 text-xs font-semibold text-blue-800">
          放置在此
        </div>
      )}
    </div>
  );
};

interface AircraftCabinProps {
  highlightPositionId?: string | null;
  highlightPositions?: string[];
}

const AircraftCabin: React.FC<AircraftCabinProps> = ({
  highlightPositionId = null,
  highlightPositions = [],
}) => {
  const positions = useLayoutStore((state) => state.positions);
  const unassignULD = useLayoutStore((state) => state.unassignULD);
  const getULDById = useLayoutStore((state) => state.getULDById);
  const currentFlightNumber = useLayoutStore(
    (state) => state.currentFlightNumber,
  );
  const loadFlightData = useLayoutStore((state) => state.loadFlightData);
  const isLoading = useLayoutStore((state) => state.isLoading);
  const [flightInput, setFlightInput] = React.useState(currentFlightNumber);
  const [inputError, setInputError] = React.useState("");

  React.useEffect(() => {
    setFlightInput(currentFlightNumber);
    setInputError("");
  }, [currentFlightNumber]);

  const handleUnassign = React.useCallback(
    (positionId: string) => {
      const result = unassignULD(positionId);
      if (!result.success) {
        toast.error(result.message);
      } else {
        toast.success(result.message);
      }
    },
    [unassignULD],
  );
  const handleInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      let value = event.target.value.toUpperCase();
      value = value.replace(/[^CX0-9]/g, "");
      if (value.length > 6) {
        value = value.slice(0, 6);
      }
      setFlightInput(value);

      if (value.length === 6) {
        if (FLIGHT_NUMBER_REGEX.test(value)) {
          setInputError("");
        } else {
          setInputError(FLIGHT_NUMBER_ERROR);
        }
      } else {
        setInputError("");
      }
    },
    [],
  );

  const handleLoadFlight = React.useCallback(async () => {
    if (isLoading || flightInput.length === 0) {
      return;
    }

    if (!FLIGHT_NUMBER_REGEX.test(flightInput)) {
      setInputError(FLIGHT_NUMBER_ERROR);
      return;
    }

    const result = await loadFlightData(flightInput);
    if (!result.success) {
      setInputError(result.message);
      toast.error(result.message);
      return;
    }

    setInputError("");
    toast.success(result.message ?? `已加载航班 ${flightInput}`);
  }, [flightInput, isLoading, loadFlightData]);

  const mainDeckRows = React.useMemo(
    () =>
      MAIN_DECK_ROWS.map((row) => {
        const left = positions.find((position) => position.id === `${row}L`);
        const right = positions.find((position) => position.id === `${row}R`);
        return { row, left, right };
      }).filter((row) => row.left || row.right),
    [positions],
  );

  const findULDById = React.useCallback(
    (id: string | null | undefined) =>
      id ? getULDById(id) ?? undefined : undefined,
    [getULDById],
  );

  return (
    <section className="w-full text-text-main">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-uld-border">
            Boeing 747-8F Cabin Layout
          </h2>
          <p className="text-sm text-slate-600">
            查看机头、主货舱与尾段 34 个仓位的实时装载情况。
          </p>
        </div>
        <div className="flex w-full flex-col gap-1 sm:w-auto">
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            航班号
          </span>
          <div className="flex w-full flex-col gap-2 sm:w-[360px] sm:flex-row">
            <div
              className={`flex flex-1 items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-semibold text-text-main shadow-inner transition focus-within:ring-2 ${
                inputError
                  ? "border-red-500 focus-within:border-red-500 focus-within:ring-red-200"
                  : "border-uld-border hover:border-uld-border/80 focus-within:border-blue-500 focus-within:ring-blue-200"
              } ${isLoading ? "opacity-70" : ""}`}
            >
              <Search
                className={`h-4 w-4 ${
                  isLoading ? "text-gray-300" : "text-gray-400"
                }`}
              />
              <input
                id="flight-search"
                type="text"
                value={flightInput}
                onChange={handleInputChange}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void handleLoadFlight();
                  }
                }}
                placeholder="输入航班号 (如:CX2025)"
                maxLength={6}
                disabled={isLoading}
                className="w-full bg-transparent text-sm font-semibold text-text-main placeholder:text-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:text-gray-400"
                autoComplete="off"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                void handleLoadFlight();
              }}
              disabled={isLoading || !FLIGHT_NUMBER_REGEX.test(flightInput)}
              className="flex-1 rounded-lg bg-cathay-jade px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-cathay-jade/90 disabled:cursor-not-allowed disabled:bg-cathay-jade/50"
            >
              {isLoading ? "加载中..." : "加载航班"}
            </button>
          </div>
          {inputError && (
            <p className="text-xs text-red-500">{inputError}</p>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            A1，A2，B1舱位
          </div>
          <div className="space-y-2">
            {["A1", "A2", "B1"].map((id) => {
              const nosePosition = positions.find((position) => position.id === id);
              if (!nosePosition) return null;
              return (
                <div key={id} className="flex justify-center">
                  <PositionCard
                    position={nosePosition}
                    uld={findULDById(nosePosition.assigned_uld)}
                    onUnassign={handleUnassign}
                    isHighlighted={
                      nosePosition.id === highlightPositionId ||
                      highlightPositions.includes(nosePosition.id)
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            主要舱位
          </div>
          <div className="space-y-2">
            {mainDeckRows.map(({ row, left, right }) => (
              <div key={row} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="flex justify-center sm:justify-end">
                  {left && (
                    <PositionCard
                      position={left}
                      uld={findULDById(left.assigned_uld)}
                      onUnassign={handleUnassign}
                      isHighlighted={
                        left.id === highlightPositionId ||
                        highlightPositions.includes(left.id)
                      }
                    />
                  )}
                </div>
                <div className="flex justify-center sm:justify-start">
                  {right && (
                    <PositionCard
                      position={right}
                      uld={findULDById(right.assigned_uld)}
                      onUnassign={handleUnassign}
                      isHighlighted={
                        right.id === highlightPositionId ||
                        highlightPositions.includes(right.id)
                      }
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            尾部舱位
          </div>
          <div className="flex justify-center">
            {TAIL_POSITION_IDS.map((id) => {
              const tail = positions.find((position) => position.id === id);
              if (!tail) {
                return null;
              }
              return (
                <PositionCard
                  key={tail.id}
                  position={tail}
                  uld={findULDById(tail.assigned_uld)}
                  onUnassign={handleUnassign}
                  isHighlighted={
                    tail.id === highlightPositionId ||
                    highlightPositions.includes(tail.id)
                  }
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AircraftCabin;

