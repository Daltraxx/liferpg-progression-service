import { Test } from '@nestjs/testing';
import { TimezoneDetectorService } from '../timezone-detector.service';
import { TZDate } from '@date-fns/tz';

/**
 * Map to track the local hour for each timezone during testing.
 * Used to mock the behavior of TZDate.getHours() for different timezones.
 */
const timezoneHourMap: Record<string, number> = {};

jest.mock('@date-fns/tz', () => ({
  TZDate: jest.fn().mockImplementation((_date: Date, timezone: string) => ({
    getHours: () => timezoneHourMap[timezone],
  })),
}));

/**
 * Test suite for the TimezoneDetectorService.
 * Tests the functionality of detecting timezones based on local hour matching.
 */
describe('TimezoneDetectorService', () => {
  let service: TimezoneDetectorService;
  /** Spy on the Intl.supportedValuesOf method to control supported timezones */
  let supportedValuesOfSpy: jest.SpiedFunction<typeof Intl.supportedValuesOf>;

  /**
   * Set up test fixtures before each test.
   * Clears the timezone hour map and mocks the supported timezones.
   */
  beforeEach(() => {
    Object.keys(timezoneHourMap).forEach((key) => {
      delete timezoneHourMap[key];
    });

    supportedValuesOfSpy = jest
      .spyOn(Intl, 'supportedValuesOf')
      .mockReturnValue(['America/New_York', 'Europe/London', 'Asia/Tokyo']);
  });

  /**
   * Clean up after each test.
   * Restores the spy and clears all mocks.
   */
  afterEach(() => {
    supportedValuesOfSpy.mockRestore();
    jest.clearAllMocks();
  });

  /**
   * Initialize the TimezoneDetectorService for testing.
   * Creates the testing module and retrieves the service instance.
   */
  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [TimezoneDetectorService],
    }).compile();

    service = moduleRef.get<TimezoneDetectorService>(TimezoneDetectorService);
  });

  // TEST CASES

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns only timezones whose local hour matches the provided endOfDayHour', () => {
    timezoneHourMap['America/New_York'] = 2;
    timezoneHourMap['Europe/London'] = 3;
    timezoneHourMap['Asia/Tokyo'] = 2;

    const result = service.getTimezonesWithDayJustEnded(2);

    expect(result).toEqual(['America/New_York', 'Asia/Tokyo']);
    expect(TZDate).toHaveBeenCalledTimes(3);
  });

  it('uses 0 as the default endOfDayHour when omitted', () => {
    timezoneHourMap['America/New_York'] = 0;
    timezoneHourMap['Europe/London'] = 10;
    timezoneHourMap['Asia/Tokyo'] = 11;

    const result = service.getTimezonesWithDayJustEnded();

    expect(result).toEqual(['America/New_York']);
  });

  it('returns an empty array when no timezone matches the provided hour', () => {
    timezoneHourMap['America/New_York'] = 6;
    timezoneHourMap['Europe/London'] = 7;
    timezoneHourMap['Asia/Tokyo'] = 8;

    const result = service.getTimezonesWithDayJustEnded(2);

    expect(result).toEqual([]);
  });

  it('throws when endOfDayHour is less than 0', () => {
    expect(() => service.getTimezonesWithDayJustEnded(-1)).toThrow(
      'endOfDayHour must be between 0 and 23',
    );
  });

  it('throws when endOfDayHour is greater than 23', () => {
    expect(() => service.getTimezonesWithDayJustEnded(24)).toThrow(
      'endOfDayHour must be between 0 and 23',
    );
  });
});
