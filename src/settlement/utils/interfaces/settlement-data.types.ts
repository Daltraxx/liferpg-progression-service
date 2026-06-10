import type { Database } from '../../../database/database.types';

/**
 * Full row shape for the users table.
 */
export type UserRow = Database['public']['Tables']['users']['Row'];

/**
 * Utility type for selecting a subset of user columns.
 */
export type UserProjection<K extends keyof UserRow> = Pick<UserRow, K>;

/**
 * User columns required by the settlement pipeline.
 */
export type QueriedUserFields = 'id' | 'experience' | 'level' | 'timezone';

/**
 * User data returned by settlement queries.
 */
export type UserData = UserProjection<QueriedUserFields>;

/**
 * Full row shape for the quests table.
 */
export type QuestRow = Database['public']['Tables']['quests']['Row'];

/**
 * Utility type for selecting a subset of quest columns.
 */
export type QuestProjection<K extends keyof QuestRow> = Pick<QuestRow, K>;

/**
 * Quest columns required by the settlement pipeline.
 */
export type QueriedQuestFields =
  | 'id'
  | 'name'
  | 'strength_level'
  | 'strength_points'
  | 'last_rest_date'
  | 'frequency'
  | 'rest_frequency'
  | 'streak'
  | 'last_completed_at';

/**
 * Quest data returned by settlement queries.
 */
export type QuestData = QuestProjection<QueriedQuestFields>;

/**
 * Full row shape for the attributes table.
 */
export type AttributeRow = Database['public']['Tables']['attributes']['Row'];

/**
 * Utility type for selecting a subset of attribute columns.
 */
export type AttributeProjection<K extends keyof AttributeRow> = Pick<
  AttributeRow,
  K
>;

/**
 * Attribute columns required by the settlement pipeline.
 */
export type QueriedAttributeFields = 'id' | 'name' | 'experience' | 'level';

/**
 * Attribute data returned by settlement queries.
 */
export type AttributeData = AttributeProjection<QueriedAttributeFields>;

/**
 * Full row shape for the quests_attributes join table.
 */
export type QuestsAttributesRow =
  Database['public']['Tables']['quests_attributes']['Row'];

/**
 * Utility type for selecting a subset of quests_attributes columns.
 */
export type QuestsAttributesProjection<K extends keyof QuestsAttributesRow> =
  Pick<QuestsAttributesRow, K>;

/**
 * quests_attributes columns required by the settlement pipeline.
 */
export type QueriedQuestsAttributesFields =
  | 'quest_id'
  | 'attribute_id'
  | 'attribute_power';

/**
 * Quest-to-attribute mapping data returned by settlement queries.
 */
export type QuestAttributeData =
  QuestsAttributesProjection<QueriedQuestsAttributesFields>;

/**
 * Full row shape for the quest_completions table.
 */
export type QuestCompletionsRow =
  Database['public']['Tables']['quest_completions']['Row'];

/**
 * Utility type for selecting a subset of quest_completions columns.
 */
export type QuestCompletionsProjection<K extends keyof QuestCompletionsRow> =
  Pick<QuestCompletionsRow, K>;

/**
 * quest_completions columns required by the settlement pipeline.
 */
export type QueriedQuestCompletionsFields =
  | 'id'
  | 'quest_id'
  | 'experience_earned'
  | 'processed_at'
  | 'completed_at';

/**
 * Quest completion data returned by settlement queries.
 */
export type QuestCompletionData =
  QuestCompletionsProjection<QueriedQuestCompletionsFields>;

/**
 * Aggregated settlement input for a single user.
 * @property user - Basic user data such as experience and level
 * @property quests[] - All quests for the user, including strength points and other relevant data for settlement calculations
 * @property attributes[] - All attributes for the user, including experience and level for settlement calculations
 * @property quests_attributes[] - Mapping of quests to attributes with corresponding power for settlement calculations
 * @property quest_completions[] - Quest completions for the user that have not yet been processed, including experience earned for settlement calculations
 */
export interface AggregatedUserData {
  user: UserData;
  quests: QuestData[];
  attributes: AttributeData[];
  quests_attributes: QuestAttributeData[];
  quest_completions: QuestCompletionData[];
}
