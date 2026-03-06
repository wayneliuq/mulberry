export type GameTypeId = "texas-holdem" | "fight-the-landlord";

export type PointEntry = {
  playerId: string;
  pointDelta: number;
};

export type RoundCalculationResult = {
  entries: PointEntry[];
  total: number;
  isZeroSum: boolean;
  summary: string;
};

export type GameTypeDefinition<TInput> = {
  id: GameTypeId;
  name: string;
  icon: string;
  calculateRound: (input: TInput) => RoundCalculationResult;
};
