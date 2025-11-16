import { NextRequest, NextResponse } from "next/server";

import { fetchFlightMeta, fetchPositions, fetchUldList } from "@/lib/flightData";
import { OptimizationError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const flightNo: string | undefined = body?.flight_no ?? body?.flightNo;
    if (!flightNo) {
      throw new OptimizationError("flight_no 字段不能为空", 400);
    }

    const { flightId, targetCgLong } = await fetchFlightMeta(flightNo);
    const [uldList, positions] = await Promise.all([
      fetchUldList(flightId),
      fetchPositions(),
    ]);

    return NextResponse.json({
      flight: { id: flightId, targetCgLong },
      ulds: uldList,
      positions,
    });
  } catch (error) {
    if (error instanceof OptimizationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("[api/flight] unexpected error", error);
    return NextResponse.json({ error: "内部服务器错误" }, { status: 500 });
  }
}

