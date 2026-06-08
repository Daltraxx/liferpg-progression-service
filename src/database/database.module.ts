import { Module, Global } from '@nestjs/common';
import { SupabaseProvider } from './supabase.provider';

/**
 * Global Database module that provides database connectivity.
 *
 * This module handles the configuration and initialization of database providers,
 * specifically Supabase, making them available throughout the application.
 *
 * @module DatabaseModule
 */
@Global()
@Module({
  providers: [SupabaseProvider],
  exports: [SupabaseProvider],
})
export class DatabaseModule {}
