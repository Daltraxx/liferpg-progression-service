/**
 * This file contains constants used across the application. 
 * By centralizing these values, we can ensure consistency and make it easier to manage changes in the future.
 */

/*
  * Strength levels for quests, ordered from weakest to strongest.
  * These levels are used to categorize quests and determine the strength points awarded for completion.
  * The 'as const' assertion ensures that the array is treated as a tuple of string literals, 
  * allowing for type safety when using these values elsewhere in the codebase.
*/
export const STRENGTH_LEVELS = ['E', 'D', 'C', 'B', 'A', 'S'] as const;
export type StrengthLevel = typeof STRENGTH_LEVELS[number];

/**
 * Thresholds for each quest strength level, 
 * defining the minimum strength points required to achieve each level.
 * These thresholds can be used in the settlement calculations 
 * to determine when a quest's strength level should be upgraded or downgraded 
 * based on the user's quest completion.
 */
export const STRENGTH_LEVEL_THRESHOLDS: Record<StrengthLevel, number> = {
  E: 0,
  D: 100,
  C: 200,
  B: 300,
  A: 400,
  S: 500,
};