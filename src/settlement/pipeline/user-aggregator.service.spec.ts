import { Test } from '@nestjs/testing';
import { UserAggregatorService } from './user-aggregator.service';
import { SupabaseProvider } from '../../database/supabase.provider';
import { SettlementDataArray } from '../schemas/settlement-data.schema';

/**
 * Test suite for {@link UserAggregatorService}
 *
 * Tests the service's ability to:
 * - Fetch and validate settlement user data via RPC calls
 * - Parse stringified JSON responses
 * - Handle errors from RPC calls
 * - Validate data against the settlement schema
 * - Parse JSON data with appropriate error handling
 */
describe('UserAggregatorService', () => {
  let service: UserAggregatorService;
  let rpcMock: jest.Mock;

  /**
   * A valid settlement data object used for testing successful data retrieval and validation.
   * Contains a user with experience, level, timezone, quests, attributes, and quest completions.
   * This data structure adheres to the SettlementDataArray schema expected by the service.
   */
  const validSettlementData: SettlementDataArray = [
    {
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        experience: 350,
        level: 2,
        timezone: 'UTC',
      },
      quests: [
        {
          id: 1,
          name: 'Morning Run',
          strength_level: 'E',
          strength_points: 10,
          frequency: 1,
          rest_frequency: 0,
          rest_progress: 0,
          streak: 2,
          last_completed_date: '2026-06-12',
        },
      ],
      attributes: [
        {
          id: 1,
          name: 'Discipline',
          experience: 45,
          level: 2,
        },
      ],
      quests_attributes: [
        {
          quest_id: 1,
          attribute_id: 1,
          attribute_power: 2,
        },
      ],
      quest_completions: [
        {
          id: 10,
          quest_id: 1,
          experience_earned: 25,
          processed_at: null,
          completed_at: '2026-06-12T22:00:00.000Z',
        },
      ],
    },
  ];

  /**
   * An invalid settlement data object used for testing schema validation failures.
   * Contains a user with negative experience, which violates the expected schema constraints.
   * This data structure is intentionally malformed to trigger validation errors in the service.
   */
  const invalidSettlementData = [
    {
      user: {
        id: '11111111-1111-1111-1111-111111111111',
        experience: -1,
        level: 3,
        timezone: 'UTC',
      },
      quests: [],
      attributes: [],
      quests_attributes: [],
      quest_completions: [],
    },
  ];

  /**
   * Sets up the test module before each test.
   * Creates a mock RPC function and initializes the UserAggregatorService with the SupabaseProvider mock.
   */
  beforeEach(async () => {
    rpcMock = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserAggregatorService,
        {
          provide: SupabaseProvider,
          useValue: {
            client: {
              rpc: rpcMock,
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get<UserAggregatorService>(UserAggregatorService);
  });

  /**
   * Cleans up mocks after each test to prevent test pollution.
   */
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calls the settlement RPC with the provided timezones and returns validated data', async () => {
    rpcMock.mockResolvedValue({
      data: validSettlementData,
      error: null,
    });

    const result = await service.getSettlementData(['UTC', 'Europe/London']);

    expect(rpcMock).toHaveBeenCalledWith('get_settlement_users_data', {
      p_timezones: ['UTC', 'Europe/London'],
    });
    expect(result).toEqual(validSettlementData);
  });

  it('parses stringified RPC data before validating it', async () => {
    rpcMock.mockResolvedValue({
      data: JSON.stringify(validSettlementData),
      error: null,
    });

    const result = await service.getSettlementData(['UTC']);

    expect(result).toEqual(validSettlementData);
  });

  it('throws when the RPC call returns an error', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: { message: 'database offline' },
    });

    await expect(service.getSettlementData(['UTC'])).rejects.toThrow(
      'Error fetching settlement users data: database offline',
    );
  });

  it('throws when the RPC returns null data', async () => {
    rpcMock.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(service.getSettlementData(['UTC'])).rejects.toThrow(
      'null data received from get_settlement_users_data rpc call',
    );
  });

  it('throws when the RPC payload fails schema validation', async () => {
    rpcMock.mockResolvedValue({
      data: invalidSettlementData,
      error: null,
    });

    await expect(service.getSettlementData(['UTC'])).rejects.toThrow(
      'Error parsing or validating settlement users data',
    );
  });

  it('throws when string data cannot be parsed as JSON', async () => {
    rpcMock.mockResolvedValue({
      data: 'not json',
      error: null,
    });

    await expect(service.getSettlementData(['UTC'])).rejects.toThrow(
      'Error parsing or validating settlement users data',
    );
  });
});
