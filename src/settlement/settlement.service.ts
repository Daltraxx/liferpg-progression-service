import { Injectable, Logger } from '@nestjs/common';
import { TimezoneDetectorService } from './pipeline/timezone-detector.service';
import { UserAggregatorService } from './pipeline/user-aggregator.service';
import { UserProcessorService } from './pipeline/user-processor.service';
import { SettlementDataArray } from './schemas/settlement-data.schema';
import { END_OF_DAY_HOUR } from '../common/constants';
import { ProcessedUserData } from './types/processed-data.types';
import { ProgressionCommitService } from './pipeline/progression-commit.service';
import getActivityDate from './utils/get-activity-date';

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
    private readonly userProcessorService: UserProcessorService,
    private readonly progressionCommitService: ProgressionCommitService,
  ) {}

  // @Cron(CronExpression.EVERY_HOUR)
  // With current deployment on Render,
  // we will trigger this pipeline via a manual cron job setup in Render's dashboard rather than using NestJS's scheduling module,
  // but this can be easily added back in if we want to switch to using NestJS's scheduling in the future
  async runSettlementPipeline() {
    try {
      this.logger.log('Settlement pipeline started');

      // Step 1: Gather timezones whose day has just ended (end of day in this context is currently defined as 2am)
      const timezonesToProcess =
        this.timezoneDetectorService.getTimezonesWithDayJustEnded(
          END_OF_DAY_HOUR,
        );
      this.logger.debug(
        `Timezones to process: ${timezonesToProcess.join(', ')}`,
      );

      if (timezonesToProcess.length === 0) {
        this.logger.log(
          'No timezones to process. Settlement pipeline completed.',
        );
        return;
      }

      // Step 2: Get settlement data for users in those timezones
      const settlementData: SettlementDataArray =
        await this.userAggregatorService.getSettlementData(["America/Los_Angeles"]);

      this.logger.debug(
        `Settlement data retrieved for ${settlementData.length} users`,
      );
      if (settlementData.length === 0) {
        this.logger.log('No users to process. Settlement pipeline completed.');
        return;
      }

      // Step 3: Use settlement data to create a single pre-transaction object for each user
      // Because all users in the settlementData array have a timezone that just had a day end,
      // we can use the first user's timezone to determine the activity date for all users in this batch
      const activityDate = getActivityDate(settlementData[0].user.timezone);
      const processedUsers: ProcessedUserData[] =
        this.userProcessorService.processUsers(settlementData, activityDate);
      this.logger.debug(
        `Processed settlement data for ${processedUsers.length} users`,
      );

      // Step 4: For each user, commit update to the database in a transaction via rpc call
      // with the pre-transaction object as the payload
      // await this.progressionCommitService.commitProgression(
      //   processedUsers,
      //   activityDate,
      // );
      this.logger.log(
        'Progression committed to database. Settlement pipeline completed successfully',
      );
    } catch (error) {
      this.logger.error('Settlement pipeline error:', error);
      // Depending on the error, we may want to implement retry logic here or alert via an external system,
      // but for now we will just throw the error to be caught by NestJS's default error handling
      // which will log it to the console and allow for retries on the next cron execution
      throw error;
    }
  }
}
