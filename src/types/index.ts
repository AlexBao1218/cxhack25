export interface ULD {
  id: string;
  weight: number;
  volume: number;
  isPriority: boolean;
  type: "AKE" | "AMA";
}

export interface Position {
  id: string;
  x: number;
  y: number;
  max_weight: number;
  current_weight: number;
  assigned_uld: string | null;
  isFixed: boolean;
}

export interface LayoutState {
  positions: Position[];
  ulds: ULD[];
  unassignedUlds: ULD[];
  cgValue: number;
  score: number;
  suggestion: string;
  isLoading: boolean;
  currentFlightNumber: string;
}

