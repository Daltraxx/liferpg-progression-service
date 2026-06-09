import { Injectable } from '@nestjs/common';
import { TZDate } from '@date-fns/tz';

/**
 * Service for detecting timezones based on day end criteria.
 */
@Injectable()
export class TimezoneDetectorService {
  // List of all supported timezones in IANA format
  private readonly timezones: string[] = Intl.supportedValuesOf('timeZone');

  /**
   * Detects and returns timezones (in IANA format) whose days have just ended.
   * @param endOfDayHour - The hour when end-of-day is determined (defaults to 0 for midnight)
   * @returns Array of timezone identifiers where the day has just ended
   */
  getTimezonesWithDayJustEnded(endOfDayHour: number = 0): string[] {
    const now = new Date();
    return this.timezones.filter((timezone) => {
      const currentTimeInTimezone = new TZDate(now, timezone);
      return currentTimeInTimezone.getHours() === endOfDayHour;
    });
  }
}
