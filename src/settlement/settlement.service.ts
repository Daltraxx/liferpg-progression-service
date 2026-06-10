import { Injectable, Logger } from '@nestjs/common';
import { TimezoneDetectorService } from './pipeline/timezone-detector.service';
import { UserAggregatorService } from './pipeline/user-aggregator.service';
import type { AggregatedUserData } from './settlement.types';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Orchestrates the settlement service pipeline, which includes the following steps:
  * 1. Determine which timezone day just ended to determine which users need to be processed
  * 2. Gather aggregated user data for those users, including:
  *    a. Basic user data such as experience and level
  *    b. All quests for the user, including strength points and other relevant data for settlement calculations
  *    c. All attributes for the user, including experience and level for settlement calculations
  *    d. Mapping of quests to attributes with corresponding power for settlement calculations
 * 3. Transform aggregated data into a single pre-transaction object for each user which includes updates based on quest completions
 * 4. For each user, commit update to the database in a transaction via rpc call with the pre-transaction object as the payload
 *
 * @module SettlementService
 * @remarks
 * - The settlement pipeline is currently scheduled to run every hour, but this can be adjusted as needed. 
 *   The end of day for each timezone is currently defined as 2am in that timezone, but this can also be adjusted as needed.
 * - Consider reducing batch sizes when processing users in the settlement pipeline if necessary 
 */
@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly timezoneDetectorService: TimezoneDetectorService,
    private readonly userAggregatorService: UserAggregatorService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runSettlementPipeline() {
    try {
      this.logger.log('Settlement pipeline started');

      // Step 1: Gather timezones whose day has just ended (end of day in this context is currently defined as 2am)
      const timezonesToProcess =
        this.timezoneDetectorService.getTimezonesWithDayJustEnded(2);
      this.logger.debug(`Timezones to process: ${timezonesToProcess.join(', ')}`);
      
      if (timezonesToProcess.length === 0) {
        this.logger.log('No timezones to process. Settlement pipeline completed.');
        return;
      }

      // Step 2: Get aggregated user data for users in those timezones
      const aggregatedUserData: AggregatedUserData[] =
        await this.userAggregatorService.getAggregatedUserData(timezonesToProcess);
      
      this.logger.debug(`Aggregated user data retrieved for ${aggregatedUserData.length} users`);
      if (aggregatedUserData.length === 0) {
        this.logger.log('No users to process. Settlement pipeline completed.');
        return;
      }

      // Step 4: Use aggregated user data to create a single pre-transaction object

      // Step 5: For each user, commit update to the database in a transaction via rpc call with the pre-transaction object as the payload
    } catch (error) {
      this.logger.error('Settlement pipeline error:', error);
      // Depending on the error, we may want to implement retry logic here or alert via an external system, 
      // but for now we will just throw the error to be caught by NestJS's default error handling 
      // which will log it to the console and allow for retries on the next cron execution
      throw error;
    }
  }
}
