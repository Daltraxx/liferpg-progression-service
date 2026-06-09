import { Injectable } from '@nestjs/common';
import { SupabaseProvider } from '../../database/supabase.provider';
import type { AggregatedUserData, UserData } from '../settlement.types';

/**
 * Service for aggregating user data from settlements.
 * Handles fetching and parsing settlement user information based on timezones.
 */
@Injectable()
export class UserAggregatorService {
  constructor(private readonly supabaseProvider: SupabaseProvider) {}

  /**
   * Aggregates user data for specified timezones.
   * @param timezones - Array of timezone strings to filter users by
   * @returns Promise resolving to an array of aggregated user data
   * @throws Error if fetching settlement users data fails
   */
  async aggregateUsers(timezones: string[]): Promise<AggregatedUserData[]> {
    const supabase = this.supabaseProvider.client;
    const { data: userData, error } = await supabase.rpc(
      'get_settlement_users_data',
      { p_timezones: timezones },
    );

    if (error) {
      throw new Error(`Error fetching settlement users data: ${error.message}`);
    }

    const aggregatedData: AggregatedUserData[] = JSON.parse(userData as string);
    return aggregatedData;
  }
}
