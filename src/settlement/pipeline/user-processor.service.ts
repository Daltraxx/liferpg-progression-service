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
import getActivityDate from '../utils/get-activity-date';

@Injectable()
export class UserProcessorService {
  processUsers(settlementData: SettlementDataArray): ProcessedUserData[] {
    if (settlementData.length === 0) {
      return [];
    }
    const activityDate = getActivityDate(settlementData[0].user.timezone);
    return settlementData.map((userData) =>
      this.processUser(userData, activityDate),
    );
  }

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
    // Create a map of quest completions for easy lookup
    const questCompletions = new Map<number, SettlementQuestCompletionData>();
    userData.quest_completions.forEach((qc) => {
      questCompletions.set(qc.id, qc);
      processedUser.processedQuestCompletionIds.push(qc.id);
    });

    // Create a map of attributes for easy lookup and updating
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

    // Create a map of quest-attribute relationships for easy lookup
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
        affectedAttributes!.forEach(({ attributeId, attributePower }) => {
          const affectedAttribute = attributeMap.get(attributeId)!;
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
        const strengthPointGain = calculateStrengthPointGain(streak);
        const newStrengthPoints = strengthPoints + strengthPointGain;
        processedUser.progressionLogs.push(
          createQuestStrengthProgressionLog(
            processedUser.userId,
            questId,
            questName,
            strengthPointGain,
            newStrengthPoints,
            streak,
          ),
        );
        const newStrengthLevel = calculateStrengthLevel(newStrengthPoints);
        const newStreak = streak + 1;
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
          if (restProgress < restFrequency) {
            // Apply penalties for missed completion
            const strengthPointLoss = calculateStrengthPointLoss(strengthLevel);
            newStrengthPoints = Math.max(strengthPoints - strengthPointLoss, 0);
            processedUser.progressionLogs.push(
              createQuestStrengthProgressionLog(
                processedUser.userId,
                questId,
                questName,
                -strengthPointLoss,
                newStrengthPoints,
                streak,
              ),
            );
            newStrengthLevel = calculateStrengthLevel(newStrengthPoints);
          }
          const processedQuest = {
            questId,
            name: questName,
            strengthLevel: newStrengthLevel,
            strengthPoints: newStrengthPoints,
            streak: 0,
            restProgress: 0,
            lastCompletedDate: lastCompletedDate,
          };
          processedUser.quests.push(processedQuest);
        }
      }

      // Calculate final attribute levels after processing all quests
      attributeMap.forEach((attribute) => {
        const newLevel = calculateAttributeLevel(attribute.experience);
        attribute.level = newLevel;
        processedUser.attributes.push(attribute);
      });
    });

    // Calculate final user level after processing all quests
    processedUser.level = calculateUserLevel(processedUser.experience);

    return processedUser;
  }
}
