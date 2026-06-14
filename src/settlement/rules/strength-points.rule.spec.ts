import {
  calculateStrengthPointGain,
  calculateStrengthPointLoss,
} from './strength-points.rule';

import { STRENGTH_POINT_LOSS_MAP } from '../../common/constants';

describe('strength-points.rule', () => {
  describe('calculateStrengthPointGain', () => {
    it('returns the streak value when streak is 5 or less', () => {
      expect(calculateStrengthPointGain(0)).toBe(0);
      expect(calculateStrengthPointGain(4)).toBe(4);
    });

    it('returns the maximum gain of 5 when streak is above 5', () => {
      expect(calculateStrengthPointGain(5)).toBe(5);
      expect(calculateStrengthPointGain(9)).toBe(5);
    });
  });

  describe('calculateStrengthPointLoss', () => {
    it('returns the configured loss for each strength level', () => {
      expect(calculateStrengthPointLoss('E')).toBe(
        STRENGTH_POINT_LOSS_MAP['E'],
      );
      expect(calculateStrengthPointLoss('D')).toBe(
        STRENGTH_POINT_LOSS_MAP['D'],
      );
      expect(calculateStrengthPointLoss('C')).toBe(
        STRENGTH_POINT_LOSS_MAP['C'],
      );
      expect(calculateStrengthPointLoss('B')).toBe(
        STRENGTH_POINT_LOSS_MAP['B'],
      );
      expect(calculateStrengthPointLoss('A')).toBe(
        STRENGTH_POINT_LOSS_MAP['A'],
      );
      expect(calculateStrengthPointLoss('S')).toBe(
        STRENGTH_POINT_LOSS_MAP['S'],
      );
    });
  });
});
