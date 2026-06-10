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

export interface ProcessedQuestData {
  questId: number;
  name: string;
  strengthLevel: string;
  strengthPoints: number;
  lastRestDate: string | null; // UTC ISO string or null
  streak: number;
  lastCompletedAt: string | null; // UTC ISO string or null
}

export interface ProcessedAttributeData {
  attributeId: number;
  name: string;
  experience: number;
  level: number;
}

export interface ProgressionLogEntry {
  userId: string;
  target: 'user' | 'quest_strength' | 'attribute';
  questId: number;
  quest_name: string;
  attributeId: number | null; // null if progression is not related to a specific attribute
  attribute_name: string | null; // null if progression is not related to a specific attribute
  points: number;
  reason: string; // Details about the progression event
  timestamp: string; // UTC ISO string
}
