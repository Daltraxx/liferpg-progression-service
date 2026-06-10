import type { StrengthLevel } from '../../../common/constants';
import { ProgressionLogEntry } from '../interfaces/processed-data.types';

/**
 * Creates a progression log entry for user experience gain.
 * @param userId - The ID of the user
 * @param questId - The ID of the quest
 * @param questName - The name of the quest
 * @param questStrengthLevel - The strength level of the quest
 * @param points - The experience points gained
 * @returns A progression log entry for user experience
 */
export const createUserProgressionLog = (
  userId: string,
  questId: number,
  questName: string,
  questStrengthLevel: StrengthLevel,
  points: number,
): ProgressionLogEntry => {
  return {
    userId,
    target: 'user',
    questId,
    questName,
    attributeId: null,
    attributeName: null,
    points,
    reason: `User gained ${points} experience for quest ${questName} (quest_id: ${questId}) (strength_level: ${questStrengthLevel}).`,
  };
};

/**
 * Creates a progression log entry for quest strength points.
 * @param userId - The ID of the user
 * @param questId - The ID of the quest
 * @param questName - The name of the quest
 * @param points - The strength points gained or lost
 * @param streak - The current streak count
 * @returns A progression log entry for quest strength points
 */
export const createQuestStrengthProgressionLog = (
  userId: string,
  questId: number,
  questName: string,
  points: number,
  streak: number,
): ProgressionLogEntry => {
  const verb = points > 0 ? 'gained' : 'lost';
  return {
    userId,
    target: 'quest_strength',
    questId,
    questName,
    attributeId: null,
    attributeName: null,
    points,
    reason: `User ${verb} ${Math.abs(points)} strength points for quest ${questName} (quest_id: ${questId}) (streak: ${streak}).`,
  };
};

/**
 * Creates a progression log entry for attribute points.
 * @param userId - The ID of the user
 * @param questId - The ID of the quest
 * @param questName - The name of the quest
 * @param attributeId - The ID of the attribute
 * @param attributeName - The name of the attribute
 * @param attributePower - The power level of the attribute
 * @param points - The points gained for the attribute
 * @returns A progression log entry for attribute points
 */
export const createAttributeProgressionLog = (
  userId: string,
  questId: number,
  questName: string,
  attributeId: number,
  attributeName: string,
  attributePower: number,
  points: number,
): ProgressionLogEntry => {
  return {
    userId,
    target: 'attribute',
    questId,
    questName,
    attributeId,
    attributeName,
    points,
    reason: `User gained ${points} points for attribute ${attributeName} (attribute_id: ${attributeId}) (attribute_power: ${attributePower}).`,
  };
};
