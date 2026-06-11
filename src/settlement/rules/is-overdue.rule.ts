/**
 * Determines if an activity is overdue based on frequency and last completed date.
 * @param frequency - The number of days between required activity completions.
 * @param lastCompletedDate - The ISO string date of the last completed activity, or null if never completed.
 * @param activityDate - The ISO string date to check against.
 * @returns True if the activity is overdue, false otherwise.
 */
export default function isOverdue(
  frequency: number,
  lastCompletedDate: string | null,
  activityDate: string,
): boolean {
  if (!lastCompletedDate) return true; // If never completed, treat as overdue
  const lastCompleted = new Date(lastCompletedDate);
  const current = new Date(activityDate);
  const msDiff = current.getTime() - lastCompleted.getTime();
  const msPerDay = 86_400_000;
  const daysElapsed = Math.floor(msDiff / msPerDay);
  return daysElapsed >= frequency;
}
