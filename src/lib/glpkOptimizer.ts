import GLPKFactory, { GLPK, LP } from "glpk.js";

import { OptimizationError } from "@/lib/errors";

const glpk: GLPK = GLPKFactory();

const MODEL_NAME = "cg_optimizer";
const CG_VAR_NAME = "cg_long";
const DEV_VAR_NAME = "cg_dev";
const DEFAULT_TARGET_LONG = 22;
const OPEN_LOWER_BOUND = -Number.MAX_VALUE;
const CG_TOLERANCE_INCHES = 5;

export interface ULDInput {
  id: string;
  weight: number;
}

export interface PositionInput {
  id: string;
  xpos: number;
  ypos: number;
}

export interface OptimizationPayload {
  uldList?: ULDInput[];
  positions?: PositionInput[];
  cgTargetLong?: number;
}

export interface LayoutItem {
  uldId: string;
  positionId: string;
  weight: number;
  xpos: number;
  ypos: number;
}

export interface GlpkOptimizationResult {
  layout: LayoutItem[];
  cgLong: number;
  deviation: number;
  score: number;
}

interface ValidatedInput {
  uldList: ULDInput[];
  positions: PositionInput[];
  cgTargetLong: number;
  totalWeight: number;
}

interface VarMeta {
  uldIndex: number;
  positionIndex: number;
}

const solverOptions = {
  msglev: glpk.GLP_MSG_ERR,
  presol: true,
};

export function runGlpkOptimization(payload: OptimizationPayload): GlpkOptimizationResult {
  const validated = validateInput(payload);
  const { lp, varMap } = buildModel(validated);
  const result = glpk.solve(lp, solverOptions);
  const status = result.result.status;

  if (status !== glpk.GLP_OPT) {
    throw new OptimizationError("求解器未找到最优解，请检查输入数据。", 422);
  }

  const vars = result.result.vars;
  const layout: Array<LayoutItem | null> = Array(validated.uldList.length).fill(null);

  Object.entries(varMap).forEach(([name, meta]) => {
    const value = vars[name] ?? 0;
    if (value > 0.5) {
      const uld = validated.uldList[meta.uldIndex];
      const position = validated.positions[meta.positionIndex];
      layout[meta.uldIndex] = {
        uldId: uld.id,
        positionId: position.id,
        weight: uld.weight,
        xpos: position.xpos,
        ypos: position.ypos,
      };
    }
  });

  if (layout.some(item => item === null)) {
    throw new OptimizationError("优化结果不完整，未能为所有 ULD 分配位置。", 500);
  }

  const deviation = vars[DEV_VAR_NAME] ?? 0;
  const score = Math.max(0, Math.min(100, 100 - (deviation / CG_TOLERANCE_INCHES) * 100));

  return {
    layout: layout.filter((item): item is LayoutItem => Boolean(item)),
    cgLong: vars[CG_VAR_NAME] ?? 0,
    deviation,
    score,
  };
}

function validateInput(payload: OptimizationPayload): ValidatedInput {
  if (!payload || !Array.isArray(payload.uldList) || payload.uldList.length === 0) {
    throw new OptimizationError("ULD 列表不能为空。", 400);
  }

  if (!Array.isArray(payload.positions) || payload.positions.length === 0) {
    throw new OptimizationError("Position 列表不能为空。", 400);
  }

  const uldList = payload.uldList.map((uld, index) => {
    const id = validateId(uld?.id, `ULD[${index}]`);
    const weight = validatePositiveNumber(uld?.weight, `ULD ${id} 重量`);
    return { id, weight };
  });

  const positions = payload.positions.map((pos, index) => {
    const id = validateId(pos?.id, `Position[${index}]`);
    const xpos = validateNumber(pos?.xpos, `Position ${id} X 坐标`);
    const ypos = validateNumber(pos?.ypos, `Position ${id} Y 坐标`);
    return { id, xpos, ypos };
  });

  ensureUniqueIds(uldList.map(uld => uld.id), "ULD");
  ensureUniqueIds(positions.map(pos => pos.id), "Position");

  if (uldList.length > positions.length) {
    throw new OptimizationError("ULD 数量不能超过可用位置数量。", 400);
  }

  const totalWeight = uldList.reduce((sum, uld) => sum + uld.weight, 0);
  if (totalWeight <= 0) {
    throw new OptimizationError("总重量必须大于 0。", 400);
  }

  const cgTargetLong =
    typeof payload.cgTargetLong === "number" && Number.isFinite(payload.cgTargetLong)
      ? payload.cgTargetLong
      : DEFAULT_TARGET_LONG;

  return {
    uldList,
    positions,
    cgTargetLong,
    totalWeight,
  };
}

function buildModel(input: ValidatedInput): { lp: LP; varMap: Record<string, VarMeta> } {
  const { uldList, positions, totalWeight, cgTargetLong } = input;
  const binaries: string[] = [];
  const varMap: Record<string, VarMeta> = {};

  const bounds: NonNullable<LP["bounds"]> = [
    { name: CG_VAR_NAME, type: glpk.GLP_FR, lb: 0, ub: 0 },
    { name: DEV_VAR_NAME, type: glpk.GLP_LO, lb: 0, ub: 0 },
  ];

  uldList.forEach((_, i) => {
    positions.forEach((_, j) => {
      const name = buildVarName(i, j);
      binaries.push(name);
      varMap[name] = { uldIndex: i, positionIndex: j };
    });
  });

  const subjectTo: LP["subjectTo"] = [
    ...uldList.map((_, i) => ({
      name: `assign_uld_${i}`,
      vars: positions.map((_, j) => ({
        name: buildVarName(i, j),
        coef: 1,
      })),
      bnds: { type: glpk.GLP_FX, lb: 1, ub: 1 },
    })),
    ...positions.map((_, j) => ({
      name: `position_capacity_${j}`,
      vars: uldList.map((_, i) => ({
        name: buildVarName(i, j),
        coef: 1,
      })),
      bnds: { type: glpk.GLP_UP, lb: 0, ub: 1 },
    })),
    {
      name: "cg_balance",
      vars: [
        { name: CG_VAR_NAME, coef: totalWeight },
        ...uldList.flatMap((uld, i) =>
          positions.map((pos, j) => ({
            name: buildVarName(i, j),
            coef: -uld.weight * pos.xpos,
          })),
        ),
      ],
      bnds: { type: glpk.GLP_FX, lb: 0, ub: 0 },
    },
    {
      name: "cg_above_target",
      vars: [
        { name: CG_VAR_NAME, coef: 1 },
        { name: DEV_VAR_NAME, coef: -1 },
      ],
      bnds: { type: glpk.GLP_UP, lb: OPEN_LOWER_BOUND, ub: cgTargetLong },
    },
    {
      name: "cg_below_target",
      vars: [
        { name: CG_VAR_NAME, coef: -1 },
        { name: DEV_VAR_NAME, coef: -1 },
      ],
      bnds: { type: glpk.GLP_UP, lb: OPEN_LOWER_BOUND, ub: -cgTargetLong },
    },
  ];

  const lp: LP = {
    name: MODEL_NAME,
    objective: {
      direction: glpk.GLP_MIN,
      name: "deviation",
      vars: [{ name: DEV_VAR_NAME, coef: 1 }],
    },
    subjectTo,
    bounds,
    binaries,
  };

  return { lp, varMap };
}

function buildVarName(uldIndex: number, positionIndex: number) {
  return `x_u${uldIndex}_p${positionIndex}`;
}

function validateId(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new OptimizationError(`${label} 的 ID 无效。`, 400);
  }
  return value.trim();
}

function validateNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || Number.isNaN(value) || !Number.isFinite(value)) {
    throw new OptimizationError(`${label} 不是有效的数字。`, 400);
  }
  return value;
}

function validatePositiveNumber(value: unknown, label: string): number {
  const num = validateNumber(value, label);
  if (num <= 0) {
    throw new OptimizationError(`${label} 必须大于 0。`, 400);
  }
  return num;
}

function ensureUniqueIds(ids: string[], label: string) {
  const seen = new Set<string>();
  ids.forEach(id => {
    if (seen.has(id)) {
      throw new OptimizationError(`${label} ID "${id}" 存在重复。`, 400);
    }
    seen.add(id);
  });
}

