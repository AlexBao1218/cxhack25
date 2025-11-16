import { OptimizationError } from "@/lib/errors";
import { supabaseServer } from "@/lib/supabaseServer";
import type { Database } from "@/types/supabase";

type FlightsRow = Database["public"]["Tables"]["flights"]["Row"];
type UldManifestRow = Database["public"]["Tables"]["uld_manifest"]["Row"];
type PositionsRow = Database["public"]["Tables"]["positions"]["Row"];

export async function fetchFlightMeta(flightNo: string) {
  const { data, error } = await supabaseServer
    .from("flights")
    .select("id,target_cg_long")
    .eq("flight_no", flightNo)
    .single();

  if (error || !data) {
    throw new OptimizationError("未找到对应航班", 404);
  }

  const record = data as FlightsRow;
  return {
    flightId: record.id,
    targetCgLong: record.target_cg_long ?? undefined,
  };
}

export async function fetchUldList(flightId: number) {
  const { data, error } = await supabaseServer
    .from("uld_manifest")
    .select("uld_id,weight")
    .eq("flight_id", flightId);

  if (error) {
    throw new OptimizationError("查询 ULD 数据失败", 500);
  }
  if (!data || data.length === 0) {
    throw new OptimizationError("该航班没有可用的 ULD 数据", 422);
  }

  return (data as UldManifestRow[]).map((record) => ({
    id: record.uld_id as string,
    weight: Number(record.weight),
  }));
}

export async function fetchPositions() {
  const { data, error } = await supabaseServer
    .from("positions")
    .select("position_code,xpos,ypos");

  if (error) {
    throw new OptimizationError("查询舱位数据失败", 500);
  }
  if (!data || data.length === 0) {
    throw new OptimizationError("该航班没有可用的舱位数据", 422);
  }

  return (data as PositionsRow[]).map((record) => ({
    id: record.position_code as string,
    xpos: Number(record.xpos),
    ypos: Number(record.ypos),
  }));
}

