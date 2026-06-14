import {
  createAttributeProgressionLog,
  createQuestStrengthProgressionLog,
  createUserProgressionLog,
} from './progression-log.rule';

describe('progression-log.rule', () => {
  describe('createUserProgressionLog', () => {
    it('creates a user progression log entry with expected fields and reason', () => {
      const result = createUserProgressionLog(
        'user-1',
        10,
        'Morning Run',
        'B',
        25,
        1025,
      );

      expect(result).toEqual({
        userId: 'user-1',
        target: 'user',
        questId: 10,
        questName: 'Morning Run',
        attributeId: null,
        attributeName: null,
        points: 25,
        reason:
          'Delta: 25; New Total: 1025; Quest Morning Run (strength_level: B).',
      });
    });
  });

  describe('createQuestStrengthProgressionLog', () => {
    it('creates a quest strength progression log entry with expected fields and reason', () => {
      const result = createQuestStrengthProgressionLog(
        'user-2',
        11,
        'Read Book',
        -5,
        195,
        0,
      );

      expect(result).toEqual({
        userId: 'user-2',
        target: 'quest_strength',
        questId: 11,
        questName: 'Read Book',
        attributeId: null,
        attributeName: null,
        points: -5,
        reason: 'Delta: -5; New Total: 195; Quest Read Book (streak: 0).',
      });
    });
  });

  describe('createAttributeProgressionLog', () => {
    it('creates an attribute progression log entry with expected fields and reason', () => {
      const result = createAttributeProgressionLog(
        'user-3',
        12,
        'Practice Piano',
        7,
        'Creativity',
        3,
        15,
        640,
      );

      expect(result).toEqual({
        userId: 'user-3',
        target: 'attribute',
        questId: 12,
        questName: 'Practice Piano',
        attributeId: 7,
        attributeName: 'Creativity',
        points: 15,
        reason:
          'Delta: 15; New Total: 640; Attribute Creativity; Quest: Practice Piano (attribute_power: 3).',
      });
    });
  });
});
