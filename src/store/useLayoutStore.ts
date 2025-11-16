import { create } from "zustand";

import cx2025Data from "@/data/cx2025.json";
import type { LayoutState, Position, ULD } from "@/types";

type ActionResult = {
  success: boolean;
  message: string;
};

type LayoutSnapshot = Omit<LayoutState, "currentFlightNumber">;

type FlightApiPosition = {
  id: string;
  xpos: number;
  ypos: number;
};

type FlightApiUld = {
  id: string;
  weight: number;
};

type FlightApiResponse = {
  flight?: {
    id: number;
    targetCgLong?: number | null;
  };
  positions?: FlightApiPosition[];
  ulds?: FlightApiUld[];
};

const FLIGHT_NUMBER_REGEX = /^CX\d{4}$/i;
const OPTIMIZATION_API_PATH = "/api/optimize";
const FLIGHT_API_PATH = "/api/flight";
const INVALID_FLIGHT_INPUT_MESSAGE = "航班号格式应为 CX+4 位数字";
const DEFAULT_POSITION_MAX_WEIGHT = 5000;
const DEFAULT_ULD_TYPE: ULD["type"] = "AKE";

type OptimizationLayoutEntry = {
  uldId: string;
  positionId: string;
  weight: number;
  xpos: number;
  ypos: number;
};

type OptimizationCgSummary = {
  long?: number;
  zLong?: number;
  score?: number;
  pure?: number;
};

type OptimizationResponse = {
  layout?: OptimizationLayoutEntry[];
  cg?: OptimizationCgSummary;
};

class OptimizationApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OptimizationApiError";
    this.status = status;
  }
}

const normalizeFlightNumber = (value: string) => value.trim().toUpperCase();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const extractErrorMessage = (payload: unknown, fallback: string) => {
  if (isRecord(payload)) {
    const maybeError = payload.error;
    if (typeof maybeError === "string" && maybeError.trim() !== "") {
      return maybeError;
    }
  }
  return fallback;
};

const requestServerOptimization = async (
  flightNumber: string,
): Promise<OptimizationResponse> => {
  const response = await fetch(OPTIMIZATION_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flight_no: flightNumber }),
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "网络异常";
    throw new OptimizationApiError(`请求失败：${message}`, 500);
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = extractErrorMessage(payload, "后端优化失败");
    throw new OptimizationApiError(message, response.status);
  }

  if (!isRecord(payload)) {
    return { layout: [] };
  }

  return payload as OptimizationResponse;
};

const requestFlightData = async (
  flightNumber: string,
): Promise<FlightApiResponse> => {
  const response = await fetch(FLIGHT_API_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ flight_no: flightNumber }),
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "网络异常";
    throw new OptimizationApiError(`请求失败：${message}`, 500);
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = extractErrorMessage(payload, "航班数据加载失败");
    throw new OptimizationApiError(message, response.status);
  }

  if (!isRecord(payload)) {
    throw new OptimizationApiError("航班数据格式异常", 500);
  }

  return payload as FlightApiResponse;
};

const buildPositionsFromServer = (positionsResponse: FlightApiPosition[]): Position[] => {
  if (!positionsResponse.length) {
    return cx2025Snapshot.positions.map((pos) => ({
      ...pos,
      assigned_uld: null,
      current_weight: 0,
    }));
  }

  const normalized = positionsResponse
    .map((pos) => {
      const meta = positionMetaMap.get(pos.id);
      if (!meta) {
        console.warn(`[flight] 未找到仓位 ${pos.id} 的元数据，已使用默认值`);
      }
      return {
        id: pos.id,
        x: Number(pos.xpos),
        y: Number(pos.ypos),
        max_weight: meta?.max_weight ?? DEFAULT_POSITION_MAX_WEIGHT,
        current_weight: 0,
        assigned_uld: null,
        isFixed: meta?.isFixed ?? false,
      } satisfies Position;
    })
    .sort((a, b) => {
      if (a.y === b.y) {
        return a.x - b.x;
      }
      return a.y - b.y;
    });

  return normalized;
};

const buildUldsFromServer = (uldsResponse: FlightApiUld[]): ULD[] =>
  uldsResponse.map((item) => ({
    id: item.id,
    weight: Number(item.weight),
    volume: 0,
    isPriority: false,
    type: DEFAULT_ULD_TYPE,
  }));

const createSnapshotFromFlightPayload = (payload: FlightApiResponse): LayoutSnapshot => {
  const positions = buildPositionsFromServer(payload.positions ?? []);
  const ulds = buildUldsFromServer(payload.ulds ?? []);
  const unassignedUlds = ulds.map((uld) => ({ ...uld }));
  return {
    positions,
    ulds,
    unassignedUlds,
    cgValue: computeCGValue(positions),
    score: computeScoreValue(positions, unassignedUlds),
    suggestion: buildSuggestion(positions, unassignedUlds),
    isLoading: false,
  };
};

const fetchFlightSnapshot = async (
  flightNumber: string,
): Promise<LayoutSnapshot> => {
  const payload = await requestFlightData(flightNumber);
  return createSnapshotFromFlightPayload(payload);
};

const buildServerSuggestion = (cg?: OptimizationCgSummary) => {
  if (!cg || typeof cg.long !== "number") {
    return "已应用后端优化方案，请在舱位图中确认布局。";
  }

  const cgLabel = cg.long.toFixed(2);
  const deviationLabel =
    typeof cg.zLong === "number"
      ? `，偏差 ${Math.abs(cg.zLong).toFixed(2)} ft`
      : "";
  const scoreLabel =
    typeof cg.score === "number"
      ? `，得分 ${Math.round(cg.score)}`
      : "";

  return `求解 CG 为 ${cgLabel} ft${deviationLabel}${scoreLabel}。`;
};

const assignLayoutToPositions = (
  positions: Position[],
  layout: OptimizationLayoutEntry[],
) => {
  const basePositions: Position[] = positions.map((pos) => ({
    ...pos,
    assigned_uld: null,
    current_weight: 0,
  }));
  const positionMap = new Map(basePositions.map((pos) => [pos.id, pos]));
  const touched: string[] = [];

  layout.forEach((entry) => {
    const target = positionMap.get(entry.positionId);
    if (!target) {
      console.warn(`[optimize] 未找到仓位 ${entry.positionId}`);
      return;
    }
    target.assigned_uld = entry.uldId;
    target.current_weight = entry.weight;
    touched.push(target.id);
  });

  return {
    positions: Array.from(positionMap.values()),
    touchedPositions: Array.from(new Set(touched)),
  };
};

const buildUldsFromLayout = (
  existingUlds: ULD[],
  layout: OptimizationLayoutEntry[],
) => {
  const map = new Map(existingUlds.map((uld) => [uld.id, { ...uld }]));
  layout.forEach((entry) => {
    const found = map.get(entry.uldId);
    if (found) {
      found.weight = entry.weight;
    } else {
      map.set(entry.uldId, {
        id: entry.uldId,
        weight: entry.weight,
        volume: 0,
        isPriority: false,
        type: "AKE",
      });
    }
  });

  const uniqueIds = Array.from(new Set(layout.map((entry) => entry.uldId)));
  return uniqueIds
    .map((id) => map.get(id))
    .filter((value): value is ULD => Boolean(value));
};

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
  moveULDWithinPositions: (
    fromPositionId: string,
    toPositionId: string,
  ) => ActionResult;
  swapPositions: (positionAId: string, positionBId: string) => ActionResult;
  calculateCG: () => number;
  calculateScore: () => number;
  generateSuggestion: () => string;
  optimizeLayout: (flightNumber?: string) => Promise<ActionResult>;
  resetLayout: () => void;
  clearRecentOptimizedPositions: () => void;
  loadFlightData: (flightNumber: string) => Promise<ActionResult>;
  clearAllAssignments: () => void;
  getULDById: (uldId: string) => ULD | undefined;
  recentOptimizedPositions: string[];
}

const applyServerOptimization = (
  state: LayoutState,
  response: OptimizationResponse,
  flightNumber: string,
): Partial<LayoutStore> => {
  const layout = response.layout ?? [];
  const { positions, touchedPositions } = assignLayoutToPositions(
    state.positions,
    layout,
  );
  const ulds = buildUldsFromLayout(state.ulds, layout);
  const unassignedUlds: ULD[] = [];
  const cgValue =
    typeof response.cg?.long === "number"
      ? Number(response.cg.long.toFixed(1))
      : computeCGValue(positions);
  const score =
    typeof response.cg?.score === "number"
      ? Math.round(response.cg.score)
      : computeScoreValue(positions, unassignedUlds);

  return {
    positions,
    ulds,
    unassignedUlds,
    cgValue,
    score,
    suggestion: buildServerSuggestion(response.cg),
    isLoading: false,
    currentFlightNumber: flightNumber,
    recentOptimizedPositions: touchedPositions,
  };
};

const computeCGValue = (positions: Position[]): number => {
  const totalWeight = positions.reduce(
    (sum, pos) => sum + pos.current_weight,
    0,
  );

  if (totalWeight === 0) {
    return 40;
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

const positionMetaMap = new Map<
  string,
  Pick<Position, "max_weight" | "isFixed">
>(
  cx2025Snapshot.positions.map((pos) => [
    pos.id,
    { max_weight: pos.max_weight, isFixed: pos.isFixed },
  ]),
);

const initialLayoutState = createLayoutStateFromSnapshot(
  cx2025Snapshot,
  DEFAULT_FLIGHT_NUMBER,
);

export const useLayoutStore = create<LayoutStore>((set, get) => ({
  ...initialLayoutState,
  recentOptimizedPositions: [],
  getULDById: (uldId) => get().ulds.find((uld) => uld.id === uldId),
  loadFlightData: async (flightNumber) => {
    const normalized = normalizeFlightNumber(flightNumber);
    if (!FLIGHT_NUMBER_REGEX.test(normalized)) {
      return {
        success: false,
        message: INVALID_FLIGHT_INPUT_MESSAGE,
      };
    }

    const state = get();
    if (state.isLoading) {
      return {
        success: false,
        message: "数据加载中，请稍候...",
      };
    }

    if (state.currentFlightNumber === normalized && state.positions.length > 0) {
      return {
        success: true,
        message: `航班 ${normalized} 数据已加载`,
      };
    }

    set({ isLoading: true, recentOptimizedPositions: [] });

    try {
      const snapshot = await fetchFlightSnapshot(normalized);
      const nextState = createLayoutStateFromSnapshot(snapshot, normalized);
      set({
        ...nextState,
        recentOptimizedPositions: [],
      });
      return {
        success: true,
        message: `航班 ${normalized} 数据已就绪`,
      };
    } catch (error) {
      const message =
        error instanceof OptimizationApiError
          ? error.message
          : `航班 ${normalized} 数据加载失败`;
      console.error(`[flight] load ${normalized} failed`, error);
      set({ isLoading: false });
      return {
        success: false,
        message,
      };
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
  moveULDWithinPositions: (fromPositionId, toPositionId) => {
    let result: ActionResult = { success: true, message: "操作成功" };

    set((state) => {
      const fromPosition = state.positions.find(
        (pos) => pos.id === fromPositionId,
      );
      const toPosition = state.positions.find((pos) => pos.id === toPositionId);

      if (!fromPosition || !toPosition) {
        result = { success: false, message: "仓位信息无效" };
        return {};
      }

      if (fromPosition.isFixed || toPosition.isFixed) {
        result = { success: false, message: "固定仓位无法调整" };
        return {};
      }

      if (!fromPosition.assigned_uld) {
        result = { success: false, message: `${fromPositionId} 当前没有ULD` };
        return {};
      }

      if (toPosition.assigned_uld) {
        result = {
          success: false,
          message: `${toPositionId} 已有ULD，请尝试交换操作`,
        };
        return {};
      }

      const movingULD = state.ulds.find(
        (uld) => uld.id === fromPosition.assigned_uld,
      );
      if (!movingULD) {
        result = { success: false, message: "未找到对应的ULD" };
        return {};
      }

      if (movingULD.weight > toPosition.max_weight) {
        result = { success: false, message: `${toPositionId} 承重不足` };
        return {};
      }

      const updatedPositions = state.positions.map((pos) => {
        if (pos.id === fromPositionId) {
          return { ...pos, assigned_uld: null, current_weight: 0 };
        }
        if (pos.id === toPositionId) {
          return {
            ...pos,
            assigned_uld: movingULD.id,
            current_weight: movingULD.weight,
          };
        }
        return pos;
      });

      const updatedUnassigned = state.unassignedUlds;
      const cgValue = computeCGValue(updatedPositions);
      const score = computeScoreValue(updatedPositions, updatedUnassigned);
      const suggestion = buildSuggestion(updatedPositions, updatedUnassigned);

      result = { success: true, message: `${movingULD.id} 已移动到 ${toPositionId}` };

      return {
        positions: updatedPositions,
        cgValue,
        score,
        suggestion,
      };
    });

    return result;
  },
  swapPositions: (positionAId, positionBId) => {
    let result: ActionResult = { success: true, message: "操作成功" };

    set((state) => {
      const positionA = state.positions.find((pos) => pos.id === positionAId);
      const positionB = state.positions.find((pos) => pos.id === positionBId);

      if (!positionA || !positionB) {
        result = { success: false, message: "仓位信息无效" };
        return {};
      }

      if (positionA.isFixed || positionB.isFixed) {
        result = { success: false, message: "固定仓位无法交换" };
        return {};
      }

      if (!positionA.assigned_uld || !positionB.assigned_uld) {
        result = { success: false, message: "需两个仓位均有ULD才可交换" };
        return {};
      }

      const uldA = state.ulds.find((uld) => uld.id === positionA.assigned_uld);
      const uldB = state.ulds.find((uld) => uld.id === positionB.assigned_uld);

      if (!uldA || !uldB) {
        result = { success: false, message: "未找到ULD信息" };
        return {};
      }

      if (uldA.weight > positionB.max_weight || uldB.weight > positionA.max_weight) {
        result = { success: false, message: "交换后将导致超重，已阻止操作" };
        return {};
      }

      const updatedPositions = state.positions.map((pos) => {
        if (pos.id === positionAId) {
          return {
            ...pos,
            assigned_uld: positionB.assigned_uld,
            current_weight: uldB.weight,
          };
        }
        if (pos.id === positionBId) {
          return {
            ...pos,
            assigned_uld: positionA.assigned_uld,
            current_weight: uldA.weight,
          };
        }
        return pos;
      });

      const updatedUnassigned = state.unassignedUlds;
      const cgValue = computeCGValue(updatedPositions);
      const score = computeScoreValue(updatedPositions, updatedUnassigned);
      const suggestion = buildSuggestion(updatedPositions, updatedUnassigned);
      result = { success: true, message: `${positionA.assigned_uld} 与 ${positionB.assigned_uld} 已交换` };

      return {
        positions: updatedPositions,
        cgValue,
        score,
        suggestion,
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
  optimizeLayout: async (flightNumber) => {
    const normalized = normalizeFlightNumber(
      flightNumber ?? get().currentFlightNumber,
    );

    if (!FLIGHT_NUMBER_REGEX.test(normalized)) {
      return {
        success: false,
        message: "请先输入格式为 CX1234 的航班号",
      };
    }

    const state = get();
    if (state.isLoading) {
      return { success: false, message: "已有任务执行中，请稍候..." };
    }

    set({
      isLoading: true,
      suggestion: "AI优化进行中，请稍候...",
      recentOptimizedPositions: [],
    });

    try {
      const response = await requestServerOptimization(normalized);
      set((currentState) =>
        applyServerOptimization(currentState, response, normalized),
      );
      return {
        success: true,
        message: `航班 ${normalized} 优化完成`,
      };
    } catch (error) {
      const message =
        error instanceof OptimizationApiError
          ? error.message
          : "优化请求失败，请稍后再试";
      set({ isLoading: false });
      return { success: false, message };
    }
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

