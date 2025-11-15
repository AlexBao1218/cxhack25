import { create } from "zustand";

import cx2025Data from "@/data/cx2025.json";
import type { LayoutState, Position, ULD } from "@/types";

type ActionResult = {
  success: boolean;
  message: string;
};

type LayoutSnapshot = Omit<LayoutState, "currentFlightNumber">;

const FLIGHT_NUMBER_REGEX = /^CX\d{4}$/i;

const cloneLayoutFromSnapshot = (
  snapshot: LayoutSnapshot,
): LayoutSnapshot => {
  const positions = snapshot.positions.map((pos) => ({ ...pos }));
  const ulds = snapshot.ulds.map((uld) => ({ ...uld }));
  const unassignedUlds = snapshot.unassignedUlds.map((uld) => ({ ...uld }));

  const cgValue = computeCGValue(positions);
  const score = computeScoreValue(positions, unassignedUlds);
  const suggestion = buildSuggestion(positions, unassignedUlds);

  return {
    positions,
    ulds,
    unassignedUlds,
    cgValue,
    score,
    suggestion,
    isLoading: false,
  };
};

const createLayoutStateFromSnapshot = (
  snapshot: LayoutSnapshot,
  flightNumber: string,
): LayoutState => ({
  ...cloneLayoutFromSnapshot(snapshot),
  currentFlightNumber: flightNumber,
});

interface LayoutStore extends LayoutState {
  assignULD: (uldId: string, positionId: string) => ActionResult;
  unassignULD: (positionId: string) => ActionResult;
  swapULD: (uldId: string, positionId: string) => ActionResult;
  calculateCG: () => number;
  calculateScore: () => number;
  generateSuggestion: () => string;
  optimizeLayout: () => void;
  resetLayout: () => void;
  clearRecentOptimizedPositions: () => void;
  loadFlightData: (flightNumber: string) => Promise<boolean>;
  clearAllAssignments: () => void;
  recentOptimizedPositions: string[];
}

const computeCGValue = (positions: Position[]): number => {
  const totalWeight = positions.reduce(
    (sum, pos) => sum + pos.current_weight,
    0,
  );

  if (totalWeight === 0) {
    return 50;
  }

  const weighted = positions.reduce(
    (sum, pos) => sum + pos.current_weight * pos.x,
    0,
  );

  return Number((weighted / totalWeight).toFixed(1));
};

const computeScoreValue = (positions: Position[], unassigned: ULD[]): number => {
  const filled = positions.filter((pos) => pos.assigned_uld !== null).length;
  const totalPositions = positions.length || 1;
  const occupancyScore = (filled / totalPositions) * 60;
  const priorityWaiting = unassigned.filter((uld) => uld.isPriority).length;
  const balanceScore = Math.max(0, 40 - priorityWaiting * 5);

  return Math.round(occupancyScore + balanceScore);
};

const buildSuggestion = (positions: Position[], unassigned: ULD[]): string => {
  const priorityWaiting = unassigned.filter((uld) => uld.isPriority);
  if (priorityWaiting.length > 0) {
    return `优先安排 ${priorityWaiting.map((u) => u.id).join("、")} 到可用仓位。`;
  }

  const availableSlots = positions.filter(
    (pos) => !pos.assigned_uld && !pos.isFixed,
  );
  if (availableSlots.length > 0) {
    return `仍有空余仓位：${availableSlots.map((pos) => pos.id).join(", ")}，可继续装载。`;
  }

  return "布局均衡，保持当前装载策略。";
};

const DEFAULT_FLIGHT_NUMBER = "CX2025";
const cx2025Snapshot = cx2025Data.layoutState as LayoutSnapshot;

const initialLayoutState = createLayoutStateFromSnapshot(
  cx2025Snapshot,
  DEFAULT_FLIGHT_NUMBER,
);

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  ...initialLayoutState,
  recentOptimizedPositions: [],
  loadFlightData: async (flightNumber) => {
    const normalized = flightNumber.toUpperCase();
    if (!FLIGHT_NUMBER_REGEX.test(normalized)) {
      return false;
    }

    const state = get();
    if (state.isLoading) {
      return false;
    }

    if (state.currentFlightNumber === normalized) {
      return true;
    }

    set({ isLoading: true, recentOptimizedPositions: [] });

    try {
      const fileName = normalized.toLowerCase();
      const dataModule = (await import(`../data/${fileName}.json`)) as {
        default: { layoutState: LayoutSnapshot };
      };
      const snapshot = dataModule.default.layoutState;
      const nextState = createLayoutStateFromSnapshot(snapshot, normalized);

      set({
        ...nextState,
        recentOptimizedPositions: [],
      });
      return true;
    } catch (error) {
      console.error(`航班数据 ${normalized} 加载失败`, error);
      set({ isLoading: false });
      return false;
    }
  },
  assignULD: (uldId, positionId) => {
    let result: ActionResult = { success: true, message: "操作成功" };

    set((state) => {
      const targetPosition = state.positions.find(
        (pos) => pos.id === positionId,
      );
      if (!targetPosition) {
        result = { success: false, message: `仓位 ${positionId} 不存在` };
        return {};
      }

      if (targetPosition.isFixed) {
        result = { success: false, message: `${positionId} 为固定仓位，无法调整` };
        return {};
      }

      if (targetPosition.assigned_uld) {
        result = {
          success: false,
          message: `${positionId} 已分配ULD，请使用 swap 功能`,
        };
        return {};
      }

      const uldToAssign = state.unassignedUlds.find((uld) => uld.id === uldId);
      if (!uldToAssign) {
        result = { success: false, message: `ULD ${uldId} 当前不可用` };
        return {};
      }

      const updatedPositions = state.positions.map((pos) =>
        pos.id === positionId
          ? {
              ...pos,
              assigned_uld: uldToAssign.id,
              current_weight: uldToAssign.weight,
            }
          : pos,
      );

      const updatedUnassigned = state.unassignedUlds.filter(
        (uld) => uld.id !== uldId,
      );

      result = { success: true, message: `${uldId} 已分配到 ${positionId}` };

      return {
        positions: updatedPositions,
        unassignedUlds: updatedUnassigned,
        cgValue: computeCGValue(updatedPositions),
        score: computeScoreValue(updatedPositions, updatedUnassigned),
        suggestion: buildSuggestion(updatedPositions, updatedUnassigned),
      };
    });

    return result;
  },
  unassignULD: (positionId) => {
    let result: ActionResult = { success: true, message: "操作成功" };

    set((state) => {
      const targetPosition = state.positions.find(
        (pos) => pos.id === positionId,
      );
      if (!targetPosition) {
        result = { success: false, message: `仓位 ${positionId} 不存在` };
        return {};
      }

      if (targetPosition.isFixed) {
        result = { success: false, message: `${positionId} 为固定仓位，无法调整` };
        return {};
      }

      if (!targetPosition.assigned_uld) {
        result = { success: false, message: `${positionId} 当前没有ULD` };
        return {};
      }

      const releasedULD = state.ulds.find(
        (uld) => uld.id === targetPosition.assigned_uld,
      );
      if (!releasedULD) {
        result = { success: false, message: `未找到对应的ULD` };
        return {};
      }

      const updatedPositions = state.positions.map((pos) =>
        pos.id === positionId
          ? { ...pos, assigned_uld: null, current_weight: 0 }
          : pos,
      );

      const updatedUnassigned = [...state.unassignedUlds, { ...releasedULD }];

      result = { success: true, message: `${positionId} 已释放` };

      return {
        positions: updatedPositions,
        unassignedUlds: updatedUnassigned,
        cgValue: computeCGValue(updatedPositions),
        score: computeScoreValue(updatedPositions, updatedUnassigned),
        suggestion: buildSuggestion(updatedPositions, updatedUnassigned),
      };
    });

    return result;
  },
  swapULD: (uldId, positionId) => {
    let result: ActionResult = { success: true, message: "操作成功" };

    set((state) => {
      const targetPosition = state.positions.find(
        (pos) => pos.id === positionId,
      );
      if (!targetPosition) {
        result = { success: false, message: `仓位 ${positionId} 不存在` };
        return {};
      }

      if (targetPosition.isFixed) {
        result = { success: false, message: `${positionId} 为固定仓位，无法调整` };
        return {};
      }

      if (!targetPosition.assigned_uld) {
        result = { success: false, message: `${positionId} 尚未装载ULD，可使用 assign` };
        return {};
      }

      const incomingULD = state.unassignedUlds.find((uld) => uld.id === uldId);
      if (!incomingULD) {
        result = { success: false, message: `ULD ${uldId} 当前不可用` };
        return {};
      }

      const outgoingULD = state.ulds.find(
        (uld) => uld.id === targetPosition.assigned_uld,
      );
      if (!outgoingULD) {
        result = { success: false, message: `未找到原ULD ${targetPosition.assigned_uld}` };
        return {};
      }

      const updatedPositions = state.positions.map((pos) =>
        pos.id === positionId
          ? {
              ...pos,
              assigned_uld: incomingULD.id,
              current_weight: incomingULD.weight,
            }
          : pos,
      );

      const updatedUnassigned = state.unassignedUlds
        .filter((uld) => uld.id !== incomingULD.id)
        .concat({ ...outgoingULD });

      result = { success: true, message: `${positionId} 已替换为 ${uldId}` };

      return {
        positions: updatedPositions,
        unassignedUlds: updatedUnassigned,
        cgValue: computeCGValue(updatedPositions),
        score: computeScoreValue(updatedPositions, updatedUnassigned),
        suggestion: buildSuggestion(updatedPositions, updatedUnassigned),
      };
    });

    return result;
  },
  calculateCG: () => {
    const positions = get().positions;
    const value = computeCGValue(positions);
    set({ cgValue: value });
    return value;
  },
  calculateScore: () => {
    const { positions, unassignedUlds } = get();
    const value = computeScoreValue(positions, unassignedUlds);
    set({ score: value });
    return value;
  },
  generateSuggestion: () => {
    const { positions, unassignedUlds } = get();
    const suggestion = buildSuggestion(positions, unassignedUlds);
    set({ suggestion });
    return suggestion;
  },
  optimizeLayout: () => {
    const currentState = get();
    if (currentState.isLoading) {
      return;
    }

    set({ isLoading: true, suggestion: "AI优化进行中，请稍候..." });

    setTimeout(() => {
      const state = get();
      const positionsClone = state.positions.map((pos) => ({ ...pos }));
      const fixedAssigned = new Set(
        positionsClone
          .filter((pos) => pos.isFixed && pos.assigned_uld)
          .map((pos) => pos.assigned_uld as string),
      );

      const movablePositions = positionsClone.filter((pos) => !pos.isFixed);
      movablePositions.forEach((pos) => {
        pos.assigned_uld = null;
        pos.current_weight = 0;
      });

      const leftSlots = movablePositions
        .filter((pos) => pos.x <= 40)
        .sort((a, b) => a.y - b.y);
      const rightSlots = movablePositions
        .filter((pos) => pos.x > 40)
        .sort((a, b) => a.y - b.y);

      const sortedCandidates = state.ulds
        .filter((uld) => !fixedAssigned.has(uld.id))
        .sort((a, b) => b.weight - a.weight);

      let leftIndex = 0;
      let rightIndex = 0;
      let leftLoad = 0;
      let rightLoad = 0;
      const touchedPositions = new Set<string>();

      sortedCandidates.forEach((uld) => {
        const leftAvailable = leftIndex < leftSlots.length;
        const rightAvailable = rightIndex < rightSlots.length;

        if (!leftAvailable && !rightAvailable) {
          return;
        }

        let targetSide: "left" | "right" = "left";
        if (!leftAvailable) {
          targetSide = "right";
        } else if (!rightAvailable) {
          targetSide = "left";
        } else {
          targetSide = leftLoad <= rightLoad ? "left" : "right";
        }

        const slot =
          targetSide === "left" ? leftSlots[leftIndex] : rightSlots[rightIndex];
        if (!slot) {
          return;
        }

        slot.assigned_uld = uld.id;
        slot.current_weight = uld.weight;
        touchedPositions.add(slot.id);

        if (targetSide === "left") {
          leftLoad += uld.weight;
          leftIndex += 1;
        } else {
          rightLoad += uld.weight;
          rightIndex += 1;
        }
      });

      const updatedUnassigned = state.ulds.filter(
        (uld) =>
          !positionsClone.some(
            (pos) => pos.assigned_uld && pos.assigned_uld === uld.id,
          ),
      );

      const cgValue = computeCGValue(positionsClone);
      const score = computeScoreValue(positionsClone, updatedUnassigned);

      set({
        positions: positionsClone,
        unassignedUlds: updatedUnassigned,
        cgValue,
        score,
        suggestion: "已应用AI优化方案，可继续根据需要微调。",
        isLoading: false,
        recentOptimizedPositions: Array.from(touchedPositions),
      });
    }, 1500);
  },
  resetLayout: () => {
    set((state) => {
      const releasedUlds = state.positions
        .filter((pos) => !pos.isFixed && pos.assigned_uld)
        .map(
          (pos) =>
            state.ulds.find((uld) => uld.id === pos.assigned_uld) ?? null,
        )
        .filter((uld): uld is ULD => Boolean(uld))
        .map((uld) => ({ ...uld }));

      const unassignedClones = state.unassignedUlds.map((uld) => ({
        ...uld,
      }));

      const restoredUnassigned = [...unassignedClones, ...releasedUlds];

      const resetPositions = state.positions.map((pos) =>
        pos.isFixed
          ? { ...pos }
          : { ...pos, assigned_uld: null, current_weight: 0 },
      );

      const cgValue = computeCGValue(resetPositions);
      const score = computeScoreValue(resetPositions, restoredUnassigned);
      const suggestion = buildSuggestion(resetPositions, restoredUnassigned);

      return {
        positions: resetPositions,
        unassignedUlds: restoredUnassigned,
        cgValue,
        score,
        suggestion,
        isLoading: false,
        recentOptimizedPositions: [],
      };
    });
  },
  clearAllAssignments: () => {
    set((state) => {
      const resetPositions = state.positions.map((pos) => ({
        ...pos,
        assigned_uld: null,
        current_weight: 0,
      }));

      const unassignedUlds = state.ulds.map((uld) => ({ ...uld }));

      return {
        positions: resetPositions,
        unassignedUlds,
        cgValue: 50,
        score: 0,
        suggestion: "所有ULD已清空，请开始装载",
        isLoading: false,
        recentOptimizedPositions: [],
      };
    });
  },
  clearRecentOptimizedPositions: () => set({ recentOptimizedPositions: [] }),
}));

