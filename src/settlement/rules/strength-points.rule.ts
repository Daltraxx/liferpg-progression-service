import {
  type StrengthLevel,
  STRENGTH_POINT_LOSS_MAP,
} from '../../common/constants';

/**
 * Calculates the strength point gain for quest completion based on a streak value.
 * @param streak - The streak count to calculate gain from.
 * @returns The strength point gain, with a maximum of 5.
 */
export const calculateStrengthPointGain = (streak: number) => {
  return Math.min(streak, 5);
};

/**
 * Calculates the strength point loss for not completing quest based on the current strength level.
 * @param strengthLevel - The strength level tier (E, D, C, B, A, S).
 * @returns The number of strength points to lose for the given level.
 */
export const calculateStrengthPointLoss = (strengthLevel: StrengthLevel) => {
  return STRENGTH_POINT_LOSS_MAP[strengthLevel];
};
