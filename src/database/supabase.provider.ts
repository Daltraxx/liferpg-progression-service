import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Provider for Supabase client initialization and management.
 * Handles Supabase configuration and environment variable validation.
 * @remarks 
 * - This provider ensures that the Supabase client is properly initialized 
 *   with the required environment variables and 
 *   provides a centralized access point for the client throughout the application.
 * - The provider is designed to be used as a singleton, 
 *   ensuring that only one instance of the Supabase client exists in the application.
 * - The service role key is used, bypassing RLS policies, 
 *   which is necessary for the settlement pipeline to function correctly.
 * @module SupabaseProvider
 */
@Injectable()
export class SupabaseProvider {
  private readonly supabaseClient: ReturnType<typeof createClient<Database>>;

  /**
   * Initializes the Supabase provider with environment variables.
   * @throws {Error} If SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are not set.
   */
  constructor(private readonly configService: ConfigService) {
    const supabaseUrl = this.configService.getOrThrow<string>('SUPABASE_URL');
    const supabaseKey = this.configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);
  }


  /**
   * Returns the Supabase client instance.
   * @returns The initialized Supabase client.
   */
  get client() {
    return this.supabaseClient;
  }
}
