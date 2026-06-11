/**
 * Processed user progression data containing experience, level, quests, attributes, and activity logs.
 * @interface ProcessedUserData
 * @property {string} userId - Unique identifier for the user
 * @property {number} experience - Total user experience points
 * @property {number} level - Current user level
 * @property {ProcessedQuestData[]} quests - Array of processed quest data
 * @property {ProcessedAttributeData[]} attributes - Array of processed attribute data
 * @property {ProgressionLogEntry[]} progressionLogs - Array of progression log entries
 * @property {number[]} processedQuestCompletionIds - Array of processed quest completion IDs
 * @property {string} processedAt - UTC ISO string of when data was processed
 * @property {string} activityDate - Date of activity in user's local timezone (e.g. "2024-06-01")
 * @property {string} timezone - User's timezone (e.g. "America/New_York")
 */
export interface ProcessedUserData {
  userId: string;
  experience: number;
  level: number;
  quests: ProcessedQuestData[];
  attributes: ProcessedAttributeData[];
  progressionLogs: ProgressionLogEntry[];
  processedQuestCompletionIds: number[];
  processedAt: string; // UTC ISO string
  activityDate: string; // Date of activity in user's local timezone (e.g. "2024-06-01")
  timezone: string; // User's timezone (e.g. "America/New_York")
}

/**
 * Processed quest data with strength progression and completion tracking.
 * @interface ProcessedQuestData
 * @property {number} questId - Unique identifier for the quest
 * @property {string} name - Quest name
 * @property {string} strengthLevel - Current strength level of the quest
 * @property {number} strengthPoints - Points earned for strength progression
 * @property {number} restProgress - Progress towards next rest period
 * @property {number} streak - Current completion streak count
 * @property {string | null} lastCompletedDate - Activity date of last completion in user's local timezone (e.g. "2024-06-01") or null if never completed
 */
export interface ProcessedQuestData {
  questId: number;
  name: string;
  strengthLevel: string;
  strengthPoints: number;
  restProgress: number;
  streak: number;
  lastCompletedDate: string | null; // Activity date of last completion in user's local timezone (e.g. "2024-06-01") or null if never completed
}

/**
 * Processed attribute data with experience and level tracking.
 * @interface ProcessedAttributeData
 * @property {number} attributeId - Unique identifier for the attribute
 * @property {string} name - Attribute name
 * @property {number} experience - Total experience points for the attribute
 * @property {number} level - Current level of the attribute
 */
export interface ProcessedAttributeData {
  attributeId: number;
  name: string;
  experience: number;
  level: number;
}

/**
 * Progression log entry tracking experience and level gains.
 * @interface ProgressionLogEntry
 * @property {string} userId - Unique identifier for the user
 * @property {'user' | 'quest_strength' | 'attribute'} target - Type of progression target
 * @property {number} questId - Associated quest identifier
 * @property {string} quest_name - Name of the associated quest
 * @property {number | null} attributeId - Associated attribute identifier or null if not attribute-related
 * @property {string | null} attribute_name - Name of the associated attribute or null if not attribute-related
 * @property {number} points - Points gained in this progression event
 * @property {string} reason - Details about the progression event
 * @property {string} timestamp - UTC ISO string of when the progression occurred
 */
export interface ProgressionLogEntry {
  userId: string;
  target: 'user' | 'quest_strength' | 'attribute';
  questId: number;
  questName: string;
  attributeId: number | null; // null if progression is not related to a specific attribute
  attributeName: string | null; // null if progression is not related to a specific attribute
  points: number;
  reason: string; // Details about the progression event
}
