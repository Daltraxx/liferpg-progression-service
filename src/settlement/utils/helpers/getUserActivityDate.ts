import { TZDate } from '@date-fns/tz';
import { subDays, format } from 'date-fns';

export default function getUserActivityDate(timezone: string): string {
  const now = new Date();
  const userTime = new TZDate(now, timezone);
  const activityDate = subDays(userTime, 1)
  const formattedDate = format(activityDate, 'yyyy-MM-dd');
  return formattedDate;
}