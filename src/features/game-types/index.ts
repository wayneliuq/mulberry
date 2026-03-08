import {
  fightTheLandlordGameType,
  type FightTheLandlordRoundInput,
} from "./fightTheLandlord";
import {
  texasHoldemGameType,
  type TexasHoldemRoundInput,
} from "./texasHoldem";
import {
  werewolvesGameType,
  type WerewolvesRoundInput,
} from "./werewolves";
import type { GameTypeId } from "./types";

export const gameTypes = [
  texasHoldemGameType,
  fightTheLandlordGameType,
  werewolvesGameType,
] as const;

export const gameTypeOptions = gameTypes.map((gameType) => ({
  id: gameType.id,
  name: gameType.name,
  icon: gameType.icon,
}));

export type GameTypeRoundInputMap = {
  "texas-holdem": TexasHoldemRoundInput;
  "fight-the-landlord": FightTheLandlordRoundInput;
  werewolves: WerewolvesRoundInput;
};

export function getGameTypeOption(gameTypeId: GameTypeId) {
  return gameTypeOptions.find((option) => option.id === gameTypeId);
}
