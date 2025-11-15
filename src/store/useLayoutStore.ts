import { create } from "zustand";

import mockData from "@/data/mockData.json";
import type { LayoutState, Position, ULD } from "@/types";

type ActionResult = {
  success: boolean;
  message: string;
};

interface LayoutStore extends LayoutState {
  assignULD: (uldId: string, positionId: string) => ActionResult;
  unassignULD: (positionId: string) => ActionResult;
  swapULD: (uldId: string, positionId: string) => ActionResult;
  calculateCG: () => number;
  calculateScore: () => number;
  generateSuggestion: () => string;
  optimizeLayout: () => void;
}

const FIXED_POSITIONS = new Set(["A1", "A2", "B1"]);

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

const mockLayoutState = mockData.layoutState as LayoutState;

const initialLayoutState: LayoutState = {
  ...mockLayoutState,
  positions: mockLayoutState.positions.map((pos) => ({ ...pos })),
  ulds: mockLayoutState.ulds.map((uld) => ({ ...uld })),
  unassignedUlds: mockLayoutState.unassignedUlds.map((uld) => ({ ...uld })),
};

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  ...initialLayoutState,
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

      if (FIXED_POSITIONS.has(targetPosition.id)) {
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

      if (uldToAssign.weight > targetPosition.max_weight) {
        result = { success: false, message: `${positionId} 承重不足` };
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

      if (FIXED_POSITIONS.has(targetPosition.id)) {
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

      if (FIXED_POSITIONS.has(targetPosition.id)) {
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

      if (incomingULD.weight > targetPosition.max_weight) {
        result = { success: false, message: `${positionId} 承重不足` };
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
    const { positions, unassignedUlds } = get();
    const cgValue = computeCGValue(positions);
    const score = computeScoreValue(positions, unassignedUlds);
    const suggestion =
      "AI优化（模拟）：已重新评估装载优先级，如需进一步调整请查看空余仓位。";

    set({ cgValue, score, suggestion });
  },
}));

