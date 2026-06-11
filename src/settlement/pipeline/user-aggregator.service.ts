import { Injectable } from '@nestjs/common';
import { SupabaseProvider } from '../../database/supabase.provider';
import { SettlementDataArray, SettlementDataArraySchema } from '../utils/schemas/SettlementData';

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
  async getSettlementData(
    timezones: string[],
  ): Promise<SettlementDataArray> {
    const supabase = this.supabaseProvider.client;
    const { data, error } = await supabase.rpc('get_settlement_users_data', {
      p_timezones: timezones,
    });

    if (error) {
      throw new Error(`Error fetching settlement users data: ${error.message}`);
    }

    if (data === null) {
      throw new Error(
        'null data received from get_settlement_users_data rpc call',
      );
    }

    const payload = typeof data === 'string' ? JSON.parse(data) : data;
    try {
      const validatedUserData: SettlementDataArray =
        SettlementDataArraySchema.parse(payload);
      return validatedUserData;
    } catch (error) {
      throw new Error(`Settlement users data validation failed:`, {
        cause: error,
      });
    }
  }
}
