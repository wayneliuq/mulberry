/** 8-axis style vector for friend-group vs pro-pool matching ([0, 1] each). */
export type ComparisonVector = {
  winImpact: number;
  carryBias: number;
  consistency: number;
  clutchDelta: number;
  upsetFactor: number;
  chemistryBias: number;
  personaIntensity: number;
  overperformance: number;
};

export type NbaComparisonPlayer = {
  id: string;
  displayName: string;
  vector: ComparisonVector;
};
