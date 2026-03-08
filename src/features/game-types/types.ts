export type GameTypeId = "texas-holdem" | "fight-the-landlord" | "werewolves";

export type PointEntry = {
  playerId: string | number;
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
