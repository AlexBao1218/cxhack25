import { NextRequest, NextResponse } from "next/server";

import { calculateCG } from "@/lib/calculateCG";
import { OptimizationError } from "@/lib/errors";
import {
  OptimizationPayload,
  runGlpkOptimization,
} from "@/lib/glpkOptimizer";
import { fetchFlightMeta, fetchPositions, fetchUldList } from "@/lib/flightData";
import { supabaseServer } from "@/lib/supabaseServer";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const flightNo: string | undefined = body?.flight_no ?? body?.flightNo;
    if (!flightNo) {
      throw new OptimizationError("flight_no 字段不能为空", 400);
    }

    const { flightId, targetCgLong } = await fetchFlightMeta(flightNo);
    const uldList = await fetchUldList(flightId);
    const positions = await fetchPositions();

    const payload: OptimizationPayload = {
      uldList,
      positions,
      cgTargetLong: targetCgLong,
    };

    const { layout, cgLong, deviation, score } = runGlpkOptimization(payload);

    const cgPure = calculateCG(
      layout.map(entry => ({
        weight: entry.weight,
        xpos: entry.xpos,
      })),
    );

    await saveOptimizationLayout(flightId, layout);

    return NextResponse.json({
      layout,
      cg: {
        long: cgLong,
        zLong: deviation,
        score,
        pure: cgPure,
      },
    });
  } catch (error) {
    if (error instanceof OptimizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[api/optimize] unexpected error", error);
    return NextResponse.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

async function saveOptimizationLayout(
  flightId: number,
  layout: Array<{
    uldId: string;
    positionId: string;
    xpos: number;
    ypos: number;
    weight: number;
  }>,
) {
  if (!layout.length) return;

  const rows: Database["public"]["Tables"]["optimization_layout"]["Insert"][] = layout.map(
    item => ({
      flight_id: flightId,
      job_id: null,
      uld_id: item.uldId,
      position_code: item.positionId,
      xpos: item.xpos,
      ypos: item.ypos,
      weight: item.weight,
    }),
  );

  const { error } = await supabaseServer.from("optimization_layout").insert(rows);
  if (error) {
    console.error("[api/optimize] failed to save layout", error);
  }
}