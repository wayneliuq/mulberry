/** 12-axis style vector for friend-group vs pro-pool matching ([0, 1] each). */
export type ComparisonVector = {
  winImpact: number;
  carryBias: number;
  consistency: number;
  clutchDelta: number;
  upsetFactor: number;
  chemistryBias: number;
  personaIntensity: number;
  overperformance: number;
  /** Mean |ledger delta| per round (cohort-relative). */
  swingMagnitude: number;
  /** Win rate in blowout-margin games minus win rate in tight games. */
  marginSpread: number;
  /** Win rate when pre-round team win prob is high (favorite). */
  chalkReliability: number;
  /** Mean delta on wins minus mean |delta| on losses. */
  ledgerAsymmetry: number;
};

export type NbaComparisonPlayer = {
  id: string;
  displayName: string;
  vector: ComparisonVector;
};
