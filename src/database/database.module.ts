import { Module } from '@nestjs/common';
import { SupabaseProvider } from './supabase.provider';
import { ConfigService } from '@nestjs/config';

/**
 * Database module that provides database connectivity.
 *
 * This module handles the configuration and initialization of database providers,
 * specifically Supabase, making them available throughout the application.
 *
 * @module DatabaseModule
 */
@Module({
  providers: [SupabaseProvider],
  exports: [SupabaseProvider],
})
export class DatabaseModule {
  constructor(private configService: ConfigService) {}
}
