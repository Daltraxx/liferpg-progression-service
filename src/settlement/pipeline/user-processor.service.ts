import { Injectable } from '@nestjs/common';
import type {
  SettlementData,
  SettlementDataArray,
} from '../schemas/settlement-data.schema';
import type {
  ProcessedUserData,
  ProcessedAttributeData,
} from '../types/processed-data.types';
import { SettlementQuestCompletionData } from '../schemas/settlement-data.schema';
import {
  createUserProgressionLog,
  createAttributeProgressionLog,
  createQuestStrengthProgressionLog,
} from '../rules/progression-log.rule';
import isOverdue from '../rules/is-overdue.rule';
import {
  calculateStrengthPointGain,
  calculateStrengthPointLoss,
} from '../rules/strength-points.rule';
import {
  calculateAttributeLevel,
  calculateStrengthLevel,
  calculateUserLevel,
} from '../rules/levels.rule';

/**
 * Service for processing settlement user data including quests, attributes, and progression tracking.
 *
 * This service handles the batch processing of user settlement data, calculating experience gains,
 * strength point adjustments, and level calculations based on quest completion status and frequency rules.
 */
@Injectable()
export class UserProcessorService {
  /**
   * Processes a batch of settlement user data for a given activity date.
   *
   * @param settlementData - Array of settlement data containing user and quest information
   * @param activityDate - The date of the activity being processed (ISO string format)
   * @returns Array of processed user data with updated experience, levels, and progression logs
   */
  processUsers(
    settlementData: SettlementDataArray,
    activityDate: string,
  ): ProcessedUserData[] {
    if (settlementData.length === 0) {
      return [];
    }

    // Because all users in the settlementData array have a timezone that just had a day end,
    // we can use the first user's timezone to determine the activity date for all users in this batch
    return settlementData.map((userData) =>
      this.processUser(userData, activityDate),
    );
  }

  /**
   * Processes a single user's settlement data including quest completion tracking and attribute progression.
   *
   * For completed quests, awards experience to the user and affected attributes, updates strength points and streak.
   * For incomplete quests, applies penalties if overdue based on frequency and rest progress rules.
   *
   * @param userData - The settlement data for a single user
   * @param activityDate - The date of the activity being processed (ISO string format)
   * @returns Processed user data with updated experience, levels, quests, attributes, and progression logs
   *
   * @throws Error if a completed quest has no associated attributes
   * @throws Error if a quest references an attribute that doesn't exist
   */
  private processUser(
    userData: SettlementData,
    activityDate: string,
  ): ProcessedUserData {
    const processedUser: ProcessedUserData = {
      userId: userData.user.id,
      experience: userData.user.experience,
      level: userData.user.level,
      quests: [],
      attributes: [],
      progressionLogs: [],
      processedQuestCompletionIds: [],
      processedAt: new Date().toISOString(),
      activityDate: activityDate,
      timezone: userData.user.timezone,
    };

    // PROCESS USER
    // Create a map of quest completions for easy lookup by quest ID
    const questCompletions = new Map<number, SettlementQuestCompletionData>();
    userData.quest_completions.forEach((qc) => {
      questCompletions.set(qc.quest_id, qc);
      processedUser.processedQuestCompletionIds.push(qc.id);
    });

    // Create a map of attributes for easy lookup and updating by attribute ID
    const attributeMap = new Map<number, ProcessedAttributeData>();
    userData.attributes.forEach((attribute) => {
      const processedAttribute: ProcessedAttributeData = {
        attributeId: attribute.id,
        name: attribute.name,
        experience: attribute.experience,
        level: attribute.level,
      };
      attributeMap.set(attribute.id, processedAttribute);
    });

    // Create a map of quest-attribute relationships for easy lookup by quest ID 
    // to determine which attributes are affected by each quest
    const affectedAttributeMap = new Map<
      number,
      { attributeId: number; attributePower: number }[]
    >();
    userData.quests_attributes.forEach((qa) => {
      if (!affectedAttributeMap.has(qa.quest_id))
        affectedAttributeMap.set(qa.quest_id, []);
      affectedAttributeMap.get(qa.quest_id)!.push({
        attributeId: qa.attribute_id,
        attributePower: qa.attribute_power,
      });
    });

    // Process quests to determine point allocation
    userData.quests.forEach((quest) => {
      const {
        id: questId,
        name: questName,
        strength_level: strengthLevel,
        strength_points: strengthPoints,
        streak,
        frequency,
        rest_frequency: restFrequency,
        rest_progress: restProgress,
        last_completed_date: lastCompletedDate,
      } = quest;

      const isCompleted = questCompletions.has(quest.id);
      if (isCompleted) {
        /**
         * If the quest is completed, need to:
         * - Award user experience for quest completion
         * - Award experience to affected attributes based on their attribute power
         * - Award quest strength points
         * - Update quest's last completed date from the quest completion record
         * - Update quest's streak
         * - Increment rest_progress
         * - Leave last rest date unchanged
         * - Log all point awards in the progression log
         */
        const questCompletion = questCompletions.get(quest.id)!;

        // Award user experience for quest completion
        processedUser.experience += questCompletion.experience_earned;
        processedUser.progressionLogs.push(
          createUserProgressionLog(
            processedUser.userId,
            questId,
            questName,
            strengthLevel,
            questCompletion.experience_earned,
            processedUser.experience,
          ),
        );

        // Award affected attribute experience
        const affectedAttributes = affectedAttributeMap.get(questId);
        if (!affectedAttributes || affectedAttributes.length === 0) {
          throw new Error(
            `Completed quest ${questId} (${questName}) has no associated attributes`,
          );
        }
        affectedAttributes.forEach(({ attributeId, attributePower }) => {
          const affectedAttribute = attributeMap.get(attributeId);
          if (!affectedAttribute) {
            throw new Error(
              `Attribute ${attributeId} not found for quest ${questId} (${questName})`,
            );
          }
          affectedAttribute.experience += attributePower;
          processedUser.progressionLogs.push(
            createAttributeProgressionLog(
              processedUser.userId,
              questId,
              questName,
              attributeId,
              affectedAttribute.name,
              affectedAttribute.level,
              attributePower,
              affectedAttribute.experience,
            ),
          );
        });

        // Award quest strength progression points
        const newStreak = streak + 1;
        const strengthPointGain = calculateStrengthPointGain(newStreak);
        const newStrengthPoints = strengthPoints + strengthPointGain;
        processedUser.progressionLogs.push(
          createQuestStrengthProgressionLog(
            processedUser.userId,
            questId,
            questName,
            strengthPointGain,
            newStrengthPoints,
            newStreak,
          ),
        );
        const newStrengthLevel = calculateStrengthLevel(newStrengthPoints);
        const newRestProgress = restProgress + 1;
        
        const processedQuest = {
          questId,
          name: questName,
          strengthLevel: newStrengthLevel,
          strengthPoints: newStrengthPoints,
          streak: newStreak,
          restProgress: newRestProgress,
          lastCompletedDate: activityDate,
        };
        processedUser.quests.push(processedQuest);
      } else {
        /**
         * If the quest is not completed, need to:
         * - If days since last completion exceeds frequency...
         *   - If rest_progress < rest_frequency...
         *     - Reset streak to 0
         *     - Reduce strength points
         *   - set rest_progress to 0
         * - leave user unchanged
         * - leave attributes unchanged
         * - leave last completed at unchanged
         * - log the strength point loss in the progression log
         */
        const isQuestOverdue = isOverdue(
          frequency,
          lastCompletedDate,
          activityDate,
        );
        if (isQuestOverdue) {
          let newStrengthLevel = strengthLevel;
          let newStrengthPoints = strengthPoints;
          let newStreak = streak;
          if (restProgress < restFrequency) {
            // Apply penalties for missed completion
            const strengthPointLoss = calculateStrengthPointLoss(strengthLevel);
            newStrengthPoints = Math.max(strengthPoints - strengthPointLoss, 0);
            newStreak = 0;
            processedUser.progressionLogs.push(
              createQuestStrengthProgressionLog(
                processedUser.userId,
                questId,
                questName,
                -strengthPointLoss,
                newStrengthPoints,
                newStreak,
              ),
            );
            newStrengthLevel = calculateStrengthLevel(newStrengthPoints);
          }
          const processedQuest = {
            questId,
            name: questName,
            strengthLevel: newStrengthLevel,
            strengthPoints: newStrengthPoints,
            streak: newStreak,
            restProgress: 0,
            lastCompletedDate: lastCompletedDate,
          };
          processedUser.quests.push(processedQuest);
        }
      }
    });

    // Calculate final attribute levels after processing all quests
    attributeMap.forEach((attribute) => {
      const newLevel = calculateAttributeLevel(attribute.experience);
      attribute.level = newLevel;
      processedUser.attributes.push(attribute);
    });

    // Calculate final user level after processing all quests
    processedUser.level = calculateUserLevel(processedUser.experience);

    return processedUser;
  }
}
