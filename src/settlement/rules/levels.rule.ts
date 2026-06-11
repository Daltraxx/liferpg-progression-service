import {
  type StrengthLevel,
  STRENGTH_LEVEL_THRESHOLDS,
  ATTRIBUTE_BASE_LEVEL_EXP,
  ATTRIBUTE_LEVEL_EXPONENT_STEEPNESS,
} from '../../common/constants';

/**
 * Calculates the strength level based on the provided strength points.
 * @param strengthPoints - The number of strength points to evaluate
 * @returns The corresponding {@link StrengthLevel} ('S', 'A', 'B', 'C', 'D', or 'E')
 * @example
 * calculateStrengthLevel(500); // returns 'S'
 * calculateStrengthLevel(250); // returns 'C'
 * calculateStrengthLevel(50);  // returns 'E'
 */
export const calculateStrengthLevel = (
  strengthPoints: number,
): StrengthLevel => {
  const { S, A, B, C, D } = STRENGTH_LEVEL_THRESHOLDS;
  if (strengthPoints >= S) return 'S';
  if (strengthPoints >= A) return 'A';
  if (strengthPoints >= B) return 'B';
  if (strengthPoints >= C) return 'C';
  if (strengthPoints >= D) return 'D';
  return 'E';
};

/**
 * Calculates the attribute level based on the provided experience points.
 * Uses a cube root formula to determine the level from experience.
 * @param experience - The number of experience points to evaluate
 * @returns The corresponding attribute level (starts at 1)
 * @example
 * calculateAttributeLevel(0);      // returns 1
 * calculateAttributeLevel(1000);   // returns 11
 * calculateAttributeLevel(8000);   // returns 21
 */
export const calculateAttributeLevel = (experience: number): number => {
  const startingLevel = 1;
  if (experience < ATTRIBUTE_BASE_LEVEL_EXP) return startingLevel;
  const rawLevel = Math.cbrt(experience / ATTRIBUTE_BASE_LEVEL_EXP);
  return Math.floor(rawLevel) + startingLevel;
};

/**
 * Calculates the experience points required to reach a given attribute level.
 * Uses an exponential formula to determine the experience needed based on level.
 * @param level - The attribute level to calculate experience for
 * @returns The total experience points required to reach the given level
 * @example
 * calculateExperienceForLevel(1);  // returns 0
 * calculateExperienceForLevel(11); // returns 1000
 * calculateExperienceForLevel(21); // returns 8000
 */
export const calculateExperienceForLevel = (level: number): number => {
  const startingLevel = 1;
  if (level <= startingLevel) return 0;
  return (
    ATTRIBUTE_BASE_LEVEL_EXP *
    Math.pow(level - startingLevel, ATTRIBUTE_LEVEL_EXPONENT_STEEPNESS)
  );
};
