/**
 * Validates if the provided string is a valid IANA timezone identifier.
 * @param timeZone - The timezone string to validate (e.g., "America/New_York", "UTC")
 * @returns `true` if the timezone is valid, `false` otherwise
 * @example
 * isValidIanaTimezone("America/New_York") // true
 * isValidIanaTimezone("Invalid/Timezone") // false
 */
export default function isValidIanaTimezone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch (error) {
    return false;
  }
}
