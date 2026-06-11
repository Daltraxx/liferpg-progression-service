import { z } from 'zod';
import { STRENGTH_LEVELS } from '../../../common/constants';

/**
 * Schema for user settlement data.
 * Includes user ID, experience points, current level, and timezone.
 */
export const SettlementUserDataSchema = z.object({
  id: z.string(),
  experience: z.number(),
  level: z.number(),
  timezone: z.string(),
});

export type SettlementUserData = z.infer<typeof SettlementUserDataSchema>;

/**
 * Schema for quest settlement data.
 * Includes quest metadata, strength level, completion tracking, and frequency information.
 */
export const SettlementQuestDataSchema = z.object({
  id: z.number(),
  name: z.string(),
  strength_level: z.enum(STRENGTH_LEVELS),
  strength_points: z.number(),
  last_rest_date: z.string().nullable(),
  frequency: z.number(),
  rest_frequency: z.number(),
  rest_progress: z.number(),
  streak: z.number(),
  last_completed_at: z.string().nullable(),
});
export type SettlementQuestData = z.infer<typeof SettlementQuestDataSchema>;

/**
 * Schema for attribute settlement data.
 * Includes attribute ID, name, experience points, and current level.
 */
export const SettlementAttributeDataSchema = z.object({
  id: z.number(),
  name: z.string(),
  experience: z.number(),
  level: z.number(),
});
export type SettlementAttributeData = z.infer<typeof SettlementAttributeDataSchema>;

/**
 * Schema for quest-attribute mapping data.
 * Represents the relationship between quests and attributes with associated power values.
 */
export const SettlementQuestAttributeMappingDataSchema = z.object({
  quest_id: z.number(),
  attribute_id: z.number(),
  attribute_power: z.number(),
});
export type SettlementQuestAttributeMappingData = z.infer<typeof SettlementQuestAttributeMappingDataSchema>;

/**
 * Schema for quest completion data.
 * Tracks completed quests, experience earned, and processing timestamps.
 */
export const SettlementQuestCompletionDataSchema = z.object({
  id: z.number(),
  quest_id: z.number(),
  experience_earned: z.number(),
  processed_at: z.string().nullable(),
  completed_at: z.string(),
});
export type SettlementQuestCompletionData = z.infer<typeof SettlementQuestCompletionDataSchema>;

/**
 * Schema for the aggregated user data object, which includes all relevant data for a user that is needed for settlement calculations. 
 * This schema can be used for validation and type inference throughout the settlement service.
 */
export const AggregatedUserDataSchema = z.object({
  user: SettlementUserDataSchema,
  quests: z.array(SettlementQuestDataSchema),
  attributes: z.array(SettlementAttributeDataSchema),
  quests_attributes: z.array(SettlementQuestAttributeMappingDataSchema),
  quest_completions: z.array(SettlementQuestCompletionDataSchema),
});
export type AggregatedUserData = z.infer<typeof AggregatedUserDataSchema>;

/**
 * Schema for an array of AggregatedUserData objects, which is the expected output of the user aggregation step in the settlement pipeline. 
 * This schema can be used for validation and type inference throughout the settlement service.
 */
export const AggregatedUserDataArraySchema = z.array(AggregatedUserDataSchema);
export type AggregatedUserDataArray = z.infer<typeof AggregatedUserDataArraySchema>;