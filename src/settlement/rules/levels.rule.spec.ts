import {
  calculateUserLevel,
  calculateExperienceForUserLevel,
  calculateAttributeLevel,
  calculateExperienceForAttributeLevel,
  calculateStrengthLevel,
} from './levels.rule';

import {
  STRENGTH_LEVEL_THRESHOLDS,
  ATTRIBUTE_LEVEL_BASE_XP,
  USER_LEVEL_BASE_XP,
} from '../../common/constants';

describe('levels.rule', () => {
  describe('calculateUserLevel', () => {
    it('returns level 1 below the base experience threshold', () => {
      expect(calculateUserLevel(0)).toBe(1);
      expect(calculateUserLevel(USER_LEVEL_BASE_XP - 1)).toBe(1);
    });

    it('increases at the exact user level threshold boundaries', () => {
      expect(calculateUserLevel(USER_LEVEL_BASE_XP)).toBe(2);
      expect(calculateUserLevel(calculateExperienceForUserLevel(3) - 1)).toBe(
        2,
      );
      expect(calculateUserLevel(calculateExperienceForUserLevel(3))).toBe(3);
    });
  });

  describe('calculateExperienceForUserLevel', () => {
    it('returns 0 for level 1 and below', () => {
      expect(calculateExperienceForUserLevel(0)).toBe(0);
      expect(calculateExperienceForUserLevel(1)).toBe(0);
    });

    it('matches the inverse of calculateUserLevel at key boundaries', () => {
      expect(calculateExperienceForUserLevel(2)).toBe(USER_LEVEL_BASE_XP);
      expect(calculateExperienceForUserLevel(3)).toBe(2400);
      expect(calculateExperienceForUserLevel(4)).toBe(8100);
    });
  });

  describe('calculateAttributeLevel', () => {
    it('returns level 1 below the base experience threshold', () => {
      expect(calculateAttributeLevel(0)).toBe(1);
      expect(calculateAttributeLevel(ATTRIBUTE_LEVEL_BASE_XP - 1)).toBe(1);
    });

    it('increases at the exact attribute level threshold boundaries', () => {
      expect(calculateAttributeLevel(ATTRIBUTE_LEVEL_BASE_XP)).toBe(2);
      expect(
        calculateAttributeLevel(calculateExperienceForAttributeLevel(3) - 1),
      ).toBe(2);
      expect(
        calculateAttributeLevel(calculateExperienceForAttributeLevel(3)),
      ).toBe(3);
    });
  });

  describe('calculateExperienceForAttributeLevel', () => {
    it('returns 0 for level 1 and below', () => {
      expect(calculateExperienceForAttributeLevel(0)).toBe(0);
      expect(calculateExperienceForAttributeLevel(1)).toBe(0);
    });

    it('matches the inverse of calculateAttributeLevel at key boundaries', () => {
      expect(calculateExperienceForAttributeLevel(2)).toBe(10);
      expect(calculateExperienceForAttributeLevel(3)).toBe(80);
      expect(calculateExperienceForAttributeLevel(4)).toBe(270);
    });
  });

  describe('calculateStrengthLevel', () => {
    const { S, A, B, C, D, E } = STRENGTH_LEVEL_THRESHOLDS;
    it('returns E below the first threshold', () => {
      expect(calculateStrengthLevel(0)).toBe('E');
      expect(calculateStrengthLevel((E + D) / 2)).toBe('E');
      expect(calculateStrengthLevel(E - 1)).toBe('E');
    });

    it('returns the expected strength level at each value', () => {
      expect(calculateStrengthLevel(D)).toBe('D');
      expect(calculateStrengthLevel((D + C) / 2)).toBe('D');
      expect(calculateStrengthLevel(C)).toBe('C');
      expect(calculateStrengthLevel((C + B) / 2)).toBe('C');
      expect(calculateStrengthLevel(B)).toBe('B');
      expect(calculateStrengthLevel((B + A) / 2)).toBe('B');
      expect(calculateStrengthLevel(A)).toBe('A');
      expect(calculateStrengthLevel((A + S) / 2)).toBe('A');
      expect(calculateStrengthLevel(S)).toBe('S');
    });

    it('returns the highest level for values above the top threshold', () => {
      expect(calculateStrengthLevel(S + 1)).toBe('S');
    });
  });
});
