import { Injectable } from '@nestjs/common';
import { ProcessedUserData } from '../types/processed-data.types';
import { SupabaseProvider } from '../../database/supabase.provider';

/**
 * Service responsible for committing processed user progression data to the database.
 * Delegates to a Supabase RPC function to persist progression changes.
 */
@Injectable()
export class ProgressionCommitService {
  constructor(private readonly supabaseProvider: SupabaseProvider) {}

  /**
   * Commits processed user progression data to the database.
   * @param processedUserData - Array of processed user data objects to commit
   * @throws {Error} If the RPC call fails
   * @returns Promise that resolves when the progression is successfully committed
   */
  async commitProgression(
    processedUserData: ProcessedUserData[],
    activityDate: string
  ): Promise<void> {
    const supabase = this.supabaseProvider.client;
    const { error } = await supabase.rpc('commit_progression', {
      p_processed_progression_data: processedUserData,
      p_activity_date: activityDate,
    });
    if (error) {
      throw new Error(`Error committing user progression: ${error.message}`);
    }
  }
}
