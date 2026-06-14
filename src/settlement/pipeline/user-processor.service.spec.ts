import { Test } from '@nestjs/testing';
import { UserProcessorService } from './user-processor.service';
import type { SettlementDataArray } from '../schemas/settlement-data.schema';
import {
  calculateAttributeLevel,
  calculateUserLevel,
} from '../rules/levels.rule';
import {
  calculateStrengthPointGain,
  calculateStrengthPointLoss,
} from '../rules/strength-points.rule';

/**
 * Test suite for UserProcessorService
 *
 * Tests the user processing pipeline which handles quest completions,
 * experience gain, level progression, attribute updates, and quest strength points.
 */
describe('UserProcessorService', () => {
  let service: UserProcessorService;

  const activityDate = '2026-06-13';

  /**
   * Factory function to build settlement test data that, 
   * by default, includes a single user with one quest, one attribute, and one quest completion.
   *
   * Creates a default settlement data structure with a user, quests, attributes,
   * and quest completions that can be customized via overrides.
   *
   * @param overrides - Partial settlement data to override defaults
   * @returns Array containing a single settlement data object
   */
  const buildSettlementData = (
    overrides?: Partial<SettlementDataArray[0]>,
  ): SettlementDataArray => {
    const base: SettlementDataArray[0] = {
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        experience: 100,
        level: 1,
        timezone: 'UTC',
      },
      quests: [
        {
          id: 1,
          name: 'Morning Run',
          strength_level: 'E',
          strength_points: 10,
          frequency: 1,
          rest_frequency: 1,
          rest_progress: 0,
          streak: 4,
          last_completed_date: '2026-06-10',
        },
      ],
      attributes: [
        {
          id: 10,
          name: 'Discipline',
          experience: 20,
          level: 1,
        },
      ],
      quests_attributes: [
        {
          quest_id: 1,
          attribute_id: 10,
          attribute_power: 2,
        },
      ],
      quest_completions: [
        {
          id: 1,
          quest_id: 1,
          experience_earned: 25,
          processed_at: null,
          completed_at: '2026-06-13T00:00:00.000Z',
        },
      ],
    };

    return [
      {
        ...base,
        ...overrides,
      },
    ];
  };

  /**
   * Sets up the test module before each test case
   *
   * Initializes a NestJS testing module with the UserProcessorService provider
   * and retrieves the service instance for use in tests.
   */
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [UserProcessorService],
    }).compile();

    service = moduleRef.get<UserProcessorService>(UserProcessorService);
  });

  // TEST CASES

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns an empty array when settlementData is empty', () => {
    const result = service.processUsers([], activityDate);
    expect(result).toEqual([]);
  });

  it('processes completed quests and updates user, attribute, and quest state', () => {
    const settlementData = buildSettlementData();

    const result = service.processUsers(settlementData, activityDate);

    expect(result).toHaveLength(1);

    const processed = result[0];
    expect(processed.userId).toBe(settlementData[0].user.id);
    expect(processed.experience).toBe(125);
    expect(processed.level).toBe(calculateUserLevel(125));
    expect(processed.processedQuestCompletionIds).toEqual([1]);
    expect(processed.timezone).toBe('UTC');

    const expectedStreak = settlementData[0].quests[0].streak + 1;
    const strengthPointGain = calculateStrengthPointGain(settlementData[0].quests[0].streak);
    const expectedStrengthPoints = settlementData[0].quests[0].strength_points + strengthPointGain;

    expect(processed.quests).toEqual([
      expect.objectContaining({
        questId: 1,
        strengthPoints: expectedStrengthPoints,
        streak: expectedStreak,
        restProgress: 1,
        lastCompletedDate: activityDate,
      }),
    ]);

    expect(processed.attributes).toEqual([
      expect.objectContaining({
        attributeId: 10,
        experience: 22,
        level: calculateAttributeLevel(22),
      }),
    ]);

    expect(processed.progressionLogs).toHaveLength(3);
    expect(processed.progressionLogs.map((log) => log.target)).toEqual([
      'user',
      'attribute',
      'quest_strength',
    ]);
  });

  it('applies overdue penalty when quest is overdue and rest progress is below rest frequency', () => {
    const settlementData = buildSettlementData({
      quest_completions: [],
      quests: [
        {
          id: 1,
          name: 'Morning Run',
          strength_level: 'E',
          strength_points: 10,
          frequency: 1,
          rest_frequency: 2,
          rest_progress: 0,
          streak: 4,
          last_completed_date: '2026-06-10',
        },
      ],
    });

    const result = service.processUsers(settlementData, activityDate);
    const processedQuest = result[0].quests[0];
    const expectedQuestId = settlementData[0].quests[0].id;
    const strengthPointLoss = calculateStrengthPointLoss(
      settlementData[0].quests[0].strength_level,
    );
    const expectedStrengthPoints =
      settlementData[0].quests[0].strength_points - strengthPointLoss;
    const expectedStreak = 0;
    const expectedRestProgress = 0;
    const expectedLastCompletedDate =
      settlementData[0].quests[0].last_completed_date;

    expect(processedQuest).toEqual(
      expect.objectContaining({
        questId: expectedQuestId,
        strengthPoints: expectedStrengthPoints,
        streak: expectedStreak,
        restProgress: expectedRestProgress,
        lastCompletedDate: expectedLastCompletedDate,
      }),
    );
    expect(result[0].progressionLogs).toHaveLength(1);
    expect(result[0].progressionLogs[0]).toEqual(
      expect.objectContaining({
        target: 'quest_strength',
        points: -strengthPointLoss,
      }),
    );
  });

  it('applies overdue penalty when quest is overdue and rest progress is below rest frequency, and strength_points cannot be reduced below 0', () => {
    const settlementData = buildSettlementData({
      quest_completions: [],
      quests: [
        {
          id: 1,
          name: 'Morning Run',
          strength_level: 'E',
          strength_points: 1,
          frequency: 1,
          rest_frequency: 2,
          rest_progress: 0,
          streak: 4,
          last_completed_date: '2026-06-10',
        },
      ],
    });

    const result = service.processUsers(settlementData, activityDate);
    const processedQuest = result[0].quests[0];
    const expectedQuestId = settlementData[0].quests[0].id;
    const strengthPointLoss = calculateStrengthPointLoss(
      settlementData[0].quests[0].strength_level,
    );
    const expectedStrengthPoints = Math.max(
      settlementData[0].quests[0].strength_points - strengthPointLoss,
      0,
    );
    const expectedStreak = 0;
    const expectedRestProgress = 0;
    const expectedLastCompletedDate =
      settlementData[0].quests[0].last_completed_date;

    expect(processedQuest).toEqual(
      expect.objectContaining({
        questId: expectedQuestId,
        strengthPoints: expectedStrengthPoints,
        streak: expectedStreak,
        restProgress: expectedRestProgress,
        lastCompletedDate: expectedLastCompletedDate,
      }),
    );
    expect(result[0].progressionLogs).toHaveLength(1);
    expect(result[0].progressionLogs[0]).toEqual(
      expect.objectContaining({
        target: 'quest_strength',
        points: -strengthPointLoss,
      }),
    );
  });

  it('only updates rest_progress for incomplete overdue quest when rest progress has reached rest frequency', () => {
    const settlementData = buildSettlementData({
      quest_completions: [],
      quests: [
        {
          id: 1,
          name: 'Morning Run',
          strength_level: 'D',
          strength_points: 10,
          frequency: 1,
          rest_frequency: 1,
          rest_progress: 1,
          streak: 4,
          last_completed_date: '2026-06-10',
        },
      ],
    });

    const result = service.processUsers(settlementData, activityDate);
    const processedQuest = result[0].quests[0];
    const expectedStrengthPoints = settlementData[0].quests[0].strength_points;
    const expectedStrengthLevel = settlementData[0].quests[0].strength_level;
    const expectedStreak = settlementData[0].quests[0].streak;
    const expectedRestProgress = 0;
    const expectedLastCompletedDate =
      settlementData[0].quests[0].last_completed_date;

    expect(processedQuest).toEqual(
      expect.objectContaining({
        strengthPoints: expectedStrengthPoints,
        strengthLevel: expectedStrengthLevel,
        streak: expectedStreak,
        restProgress: expectedRestProgress,
        lastCompletedDate: expectedLastCompletedDate,
      }),
    );
    expect(result[0].progressionLogs).toHaveLength(0);
  });

  it('does not add quest update when quest is not completed and not overdue', () => {
    const settlementData = buildSettlementData({
      quest_completions: [],
      quests: [
        {
          id: 1,
          name: 'Morning Run',
          strength_level: 'D',
          strength_points: 10,
          frequency: 10,
          rest_frequency: 1,
          rest_progress: 0,
          streak: 4,
          last_completed_date: '2026-06-10',
        },
      ],
    });

    const result = service.processUsers(settlementData, activityDate);

    expect(result[0].quests).toEqual([]);
    expect(result[0].progressionLogs).toEqual([]);
    expect(result[0].experience).toBe(100);
  });

  it('throws when a completed quest has no associated attributes', () => {
    const settlementData = buildSettlementData({
      quests_attributes: [],
    });

    expect(() => service.processUsers(settlementData, activityDate)).toThrow(
      'Completed quest 1 (Morning Run) has no associated attributes',
    );
  });

  it('throws when a quest references an attribute that does not exist', () => {
    const settlementData = buildSettlementData({
      quests_attributes: [
        {
          quest_id: 1,
          attribute_id: 999,
          attribute_power: 2,
        },
      ],
    });

    expect(() => service.processUsers(settlementData, activityDate)).toThrow(
      'Attribute 999 not found for quest 1 (Morning Run)',
    );
  });
});
