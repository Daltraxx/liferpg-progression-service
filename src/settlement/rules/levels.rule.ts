import { StrengthLevel } from '../../../common/constants';

/**
 * Calculates the strength level based on the provided strength points.
 * @param strengthPoints - The number of strength points to evaluate
 * @returns The corresponding {@link StrengthLevel} ('S', 'A', 'B', 'C', 'D', or 'E')
 * @example
 * calculateStrengthLevel(500); // returns 'S'
 * calculateStrengthLevel(250); // returns 'C'
 * calculateStrengthLevel(50);  // returns 'E'
 */
export const calculateStrengthLevel = (
  strengthPoints: number,
): StrengthLevel => {
  if (strengthPoints >= 500) return 'S';
  if (strengthPoints >= 400) return 'A';
  if (strengthPoints >= 300) return 'B';
  if (strengthPoints >= 200) return 'C';
  if (strengthPoints >= 100) return 'D';
  return 'E';
};
