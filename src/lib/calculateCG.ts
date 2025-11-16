export interface ULDPlacement {
    weight: number;
    xpos: number;
  }
  
  export function calculateCG(placements: ULDPlacement[]) {
    const totalWeight = placements.reduce((s, p) => s + p.weight, 0);
    if (totalWeight === 0) return 0;
  
    const moment = placements.reduce(
      (s, p) => s + p.weight * p.xpos,
      0
    );
  
    return moment / totalWeight;
  }