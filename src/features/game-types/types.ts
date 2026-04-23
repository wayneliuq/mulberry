export type GameTypeId =
  | "texas-holdem"
  | "fight-the-landlord"
  | "werewolves"
  | "dixit"
  | "basketball";

export type GameTypeIconId = "cards" | "meeple" | "basketball";

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
  icon: GameTypeIconId;
  calculateRound: (input: TInput) => RoundCalculationResult;
};
