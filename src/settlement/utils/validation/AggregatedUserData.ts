import { z } from 'zod';
import { STRENGTH_LEVELS } from '../../../common/constants';

export const AggregatedUserDataSchema = z.object({
  user: z.object({
    id: z.string(),
    experience: z.number(),
    level: z.number(),
  }),
  quests: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      strength_level: z.enum(STRENGTH_LEVELS),
      strength_points: z.number(),
      last_rest_date: z.string().nullable(),
      frequency: z.number(),
      rest_frequency: z.number(),
      streak: z.number(),
      last_completed_at: z.string().nullable(),
    }),
  ),
  attributes: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      experience: z.number(),
      level: z.number(),
    }),
  ),
  quests_attributes: z.array(
    z.object({
      quest_id: z.number(),
      attribute_id: z.number(),
      attribute_power: z.number(),
    }),
  ),
  quest_completions: z.array(
    z.object({
      id: z.number(),
      quest_id: z.number(),
      experience_earned: z.number(),
      processed_at: z.string().nullable(),
    }),
  ),
});

export const AggregatedUserDataArraySchema = z.array(AggregatedUserDataSchema);