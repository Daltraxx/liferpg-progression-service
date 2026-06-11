import { TZDate } from '@date-fns/tz';
import { subDays, format } from 'date-fns';

/**
 * Gets the user's activity date. Because settlement runs at the end of the day, 
 * we consider the activity date to be the previous day in the user's local timezone.
 * @param timezone - The user's timezone string (e.g., 'America/New_York')
 * @returns The activity date formatted as 'yyyy-MM-dd'
 */
export default function getUserActivityDate(timezone: string): string {
  const now = new Date();
  const userTime = new TZDate(now, timezone);
  const activityDate = subDays(userTime, 1);
  const formattedDate = format(activityDate, 'yyyy-MM-dd');
  return formattedDate;
}
