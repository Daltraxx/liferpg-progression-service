import {
  calculateUserLevel,
  calculateExperienceForUserLevel,
  calculateAttributeLevel,
  calculateExperienceForAttributeLevel,
  calculateStrengthLevel,
} from './levels.rule';

describe('levels.rule', () => {
  describe('calculateUserLevel', () => {
    it('returns level 1 below the base experience threshold', () => {
      expect(calculateUserLevel(0)).toBe(1);
      expect(calculateUserLevel(299)).toBe(1);
    });

    it('increases at the exact user level threshold boundaries', () => {
      expect(calculateUserLevel(300)).toBe(2);
      expect(calculateUserLevel(2399)).toBe(2);
      expect(calculateUserLevel(2400)).toBe(3);
    });
  });

  describe('calculateExperienceForUserLevel', () => {
    it('returns 0 for level 1 and below', () => {
      expect(calculateExperienceForUserLevel(0)).toBe(0);
      expect(calculateExperienceForUserLevel(1)).toBe(0);
    });

    it('matches the inverse of calculateUserLevel at key boundaries', () => {
      expect(calculateExperienceForUserLevel(2)).toBe(300);
      expect(calculateExperienceForUserLevel(3)).toBe(2400);
      expect(calculateExperienceForUserLevel(4)).toBe(8100);
    });
  });

  describe('calculateAttributeLevel', () => {
    it('returns level 1 below the base experience threshold', () => {
      expect(calculateAttributeLevel(0)).toBe(1);
      expect(calculateAttributeLevel(9)).toBe(1);
    });

    it('increases at the exact attribute level threshold boundaries', () => {
      expect(calculateAttributeLevel(10)).toBe(2);
      expect(calculateAttributeLevel(79)).toBe(2);
      expect(calculateAttributeLevel(80)).toBe(3);
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
    it('returns E below the first threshold', () => {
      expect(calculateStrengthLevel(0)).toBe('E');
      expect(calculateStrengthLevel(99)).toBe('E');
    });

    it('returns the expected strength level at each threshold boundary', () => {
      expect(calculateStrengthLevel(100)).toBe('D');
      expect(calculateStrengthLevel(200)).toBe('C');
      expect(calculateStrengthLevel(300)).toBe('B');
      expect(calculateStrengthLevel(400)).toBe('A');
      expect(calculateStrengthLevel(500)).toBe('S');
    });

    it('returns the highest level for values above the top threshold', () => {
      expect(calculateStrengthLevel(999)).toBe('S');
    });
  });
});
