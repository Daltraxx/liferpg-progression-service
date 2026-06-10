import type { StrengthLevel } from '../../../common/constants';
import { ProgressionLogEntry } from '../interfaces/processed-data.types';

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
