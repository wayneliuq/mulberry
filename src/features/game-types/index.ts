import {
  fightTheLandlordGameType,
  type FightTheLandlordRoundInput,
} from "./fightTheLandlord";
import {
  texasHoldemGameType,
  type TexasHoldemRoundInput,
} from "./texasHoldem";
import type { GameTypeId } from "./types";

export const gameTypes = [
  texasHoldemGameType,
  fightTheLandlordGameType,
] as const;

export const gameTypeOptions = gameTypes.map((gameType) => ({
  id: gameType.id,
  name: gameType.name,
  icon: gameType.icon,
}));

export type GameTypeRoundInputMap = {
  "texas-holdem": TexasHoldemRoundInput;
  "fight-the-landlord": FightTheLandlordRoundInput;
};

export function getGameTypeOption(gameTypeId: GameTypeId) {
  return gameTypeOptions.find((option) => option.id === gameTypeId);
}
