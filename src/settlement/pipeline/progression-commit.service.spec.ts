import { Test } from '@nestjs/testing';
import { ProgressionCommitService } from './progression-commit.service';
import { SupabaseProvider } from '../../database/supabase.provider';
import { ProcessedUserData } from '../types/processed-data.types';

/**
 * Unit tests for {@link ProgressionCommitService}.
 *
 * These tests verify RPC invocation, payload serialization behavior,
 * and error propagation from the Supabase layer.
 */
describe('ProgressionCommitService', () => {
  let service: ProgressionCommitService;
  let rpcMock: jest.Mock;

  /**
   * Baseline valid payload used by most tests.
   *
   * This mirrors the shape expected by commit_progression so assertions
   * can focus on service behavior instead of fixture construction.
   */
  const processedUserData: ProcessedUserData[] = [
    {
      userId: '11111111-1111-1111-1111-111111111111',
      experience: 420,
      level: 2,
      quests: [
        {
          questId: 1,
          name: 'Morning Run',
          strengthLevel: 'D',
          strengthPoints: 120,
          restProgress: 1,
          streak: 7,
          lastCompletedDate: '2026-06-12',
        },
      ],
      attributes: [
        {
          attributeId: 10,
          name: 'Discipline',
          experience: 200,
          level: 3,
        },
      ],
      progressionLogs: [
        {
          userId: '11111111-1111-1111-1111-111111111111',
          target: 'user',
          questId: 1,
          questName: 'Morning Run',
          attributeId: null,
          attributeName: null,
          points: 50,
          reason: 'Daily settlement',
        },
      ],
      processedQuestCompletionIds: [101, 102],
      processedAt: '2026-06-13T01:00:00.000Z',
      activityDate: '2026-06-12',
      timezone: 'UTC',
    },
  ];

  /**
   * Builds a fresh testing module and mock RPC function before each test.
   *
   * The SupabaseProvider is replaced with a lightweight test double so all
   * tests remain deterministic and do not call external services.
   */
  beforeEach(async () => {
    rpcMock = jest.fn();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProgressionCommitService,
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

    service = moduleRef.get<ProgressionCommitService>(ProgressionCommitService);
  });

  /**
   * Resets mock state after each test to prevent cross-test pollution.
   */
  afterEach(() => {
    jest.clearAllMocks();
  });

  // TEST CASES

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('calls commit_progression RPC with serialized payload and activity date', async () => {
    rpcMock.mockResolvedValue({ error: null });

    await service.commitProgression(processedUserData, '2026-06-12');

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('commit_progression', {
      p_processed_progression_data: JSON.parse(
        JSON.stringify(processedUserData),
      ),
      p_activity_date: '2026-06-12',
    });
  });

  it('handles an empty processedUserData batch', async () => {
    rpcMock.mockResolvedValue({ error: null });

    await service.commitProgression([], '2026-06-12');

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith('commit_progression', {
      p_processed_progression_data: [],
      p_activity_date: '2026-06-12',
    });
  });

  it('normalizes Date values in payload into JSON-safe strings before RPC', async () => {
    rpcMock.mockResolvedValue({ error: null });

    const dateValue = new Date('2026-06-13T01:00:00.000Z');
    const payloadWithDate = [
      {
        ...processedUserData[0],
        processedAt: dateValue as unknown as string,
      },
    ] as ProcessedUserData[];

    await service.commitProgression(payloadWithDate, '2026-06-12');

    expect(rpcMock).toHaveBeenCalledWith('commit_progression', {
      p_processed_progression_data: [
        {
          ...processedUserData[0],
          processedAt: dateValue.toISOString(),
        },
      ],
      p_activity_date: '2026-06-12',
    });
  });

  it('throws when commit_progression RPC returns an error', async () => {
    rpcMock.mockResolvedValue({
      error: { message: 'permission denied' },
    });

    await expect(
      service.commitProgression(processedUserData, '2026-06-12'),
    ).rejects.toThrow('Error committing user progression: permission denied');
  });
});
