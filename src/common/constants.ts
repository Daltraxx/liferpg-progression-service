/**
 * This file contains constants used across the application.
 * By centralizing these values, we can ensure consistency and make it easier to manage changes in the future.
 */

/**
 * The hour at which the settlement pipeline should consider the previous day to have ended for each user,
 * based on their local timezone.
 * For example, if END_OF_DAY_HOUR is set to 2,
 * then the settlement pipeline will consider the previous day to have ended for a user
 * when it is 2am in that user's timezone.
 */
export const END_OF_DAY_HOUR = 2;

/**
 * Base experience required for the first level of a user, and the exponent for calculating experience requirements for subsequent levels.
 *
 * The experience required to level up can be calculated using the formula:
 * experienceRequired = USER_LEVEL_BASE_XP * ((level - startingLevel) ^ USER_LEVEL_EXPONENT_STEEPNESS),
 * where startingLevel = 1
 *
 * To calculate the level for a given amount of experience, you can use the inverse of this formula:
 * level = Math.floor((experience / USER_LEVEL_BASE_XP) ^ (1 / USER_LEVEL_EXPONENT_STEEPNESS)) + startingLevel, where startingLevel = 1 */
export const USER_LEVEL_BASE_XP = 300;
export const USER_LEVEL_EXPONENT_STEEPNESS = 3;

/**
 * Base experience required for the first level of an attribute,
 * and the exponent for calculating experience requirements for subsequent levels.
 *
 * The experience required to level up an attribute can be calculated using the formula:
 * experienceRequired = ATTRIBUTE_LEVEL_BASE_XP * ((level - startingLevel) ^ ATTRIBUTE_LEVEL_EXPONENT_STEEPNESS),
 * where startingLevel = 1
 *
 * To calculate the level for a given amount of experience, you can use the inverse of this formula:
 * level = Math.floor((experience / ATTRIBUTE_LEVEL_BASE_XP) ^ (1 / ATTRIBUTE_LEVEL_EXPONENT_STEEPNESS)) + startingLevel,
 * where startingLevel = 1
 */
export const ATTRIBUTE_LEVEL_BASE_XP = 10;
export const ATTRIBUTE_LEVEL_EXPONENT_STEEPNESS = 3;

/*
 * Strength levels for quests, ordered from weakest to strongest.
 * These levels are used to categorize quests and determine the strength points awarded for completion.
 * The 'as const' assertion ensures that the array is treated as a tuple of string literals,
 * allowing for type safety when using these values elsewhere in the codebase.
 */
export const STRENGTH_LEVELS = ['E', 'D', 'C', 'B', 'A', 'S'] as const;
export type StrengthLevel = (typeof STRENGTH_LEVELS)[number];

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

/**
 * The strength points lost for not completing a quest, based on the current strength level of the quest.
 * This mapping defines how many strength points a user will lose if they fail to complete a quest,
 * depending on the quest's current strength level. Higher strength levels result in greater point losses.
 */
export const STRENGTH_POINT_LOSS_MAP: Record<StrengthLevel, number> = {
  E: 2,
  D: 5,
  C: 10,
  B: 15,
  A: 18,
  S: 20,
};
