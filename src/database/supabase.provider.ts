import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

/**
 * Provider for Supabase client initialization and management.
 * Handles Supabase configuration and environment variable validation.
 * @remarks This provider ensures that the Supabase client is properly initialized 
 * with the required environment variables and 
 * provides a centralized access point for the client throughout the application.
 */
@Injectable()
export class SupabaseProvider {
  private readonly supabaseClient: ReturnType<typeof createClient<Database>>;

  /**
   * Initializes the Supabase provider with environment variables.
   * @throws {Error} If SUPABASE_URL or SUPABASE_KEY environment variables are not set.
   */
  constructor() {
    const supabaseUrl = this.getEnv('SUPABASE_URL');
    const supabaseKey = this.getEnv('SUPABASE_KEY');
    this.supabaseClient = createClient<Database>(supabaseUrl, supabaseKey);
  }

  /**
   * Retrieves an environment variable value.
   * @param name - The name of the environment variable.
   * @returns The value of the environment variable.
   * @throws {Error} If the environment variable is not set.
   */
  private getEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Environment variable ${name} is not set`);
    }
    return value;
  }

  /**
   * Returns the Supabase client instance.
   * @returns The initialized Supabase client.
   */
  get client() {
    return this.supabaseClient;
  }
}
