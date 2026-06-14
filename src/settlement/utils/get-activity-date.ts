import { TZDate } from '@date-fns/tz';
import { subDays, format } from 'date-fns';
import isValidIanaTimezone from './is-valid-timezone';

/**
 * Gets the activity date from a provided timezone. Because settlement runs at the end of the day,
 * we consider the activity date to be the previous day in the user's local timezone.
 * @param timezone - The user's timezone string (e.g., 'America/New_York')
 * @returns The activity date formatted as 'yyyy-MM-dd'
 * @throws Error if the provided timezone is invalid
 * @example
 * getActivityDate('America/New_York')
 * // returns the previous day's date in 'yyyy-MM-dd' format based on New York time
 */
export default function getActivityDate(timezone: string): string {
  if (!isValidIanaTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }
  const now = new Date();
  const userTime = new TZDate(now, timezone);
  const activityDate = subDays(userTime, 1);
  const formattedDate = format(activityDate, 'yyyy-MM-dd');
  return formattedDate;
}
