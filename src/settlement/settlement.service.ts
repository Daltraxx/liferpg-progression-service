import { Injectable, Logger } from '@nestjs/common';
import { TimezoneDetectorService } from './pipeline/timezone-detector.service';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Orchestrates the settlement service pipeline, which includes the following steps:
 * 1. Determine which timezone day just ended to determine which users need to be processed
 * 2. Gather users with applicable timezones
 * 3. For each applicable user, get their...
 *    a. quest_completions for the day (where processed_at is null)
 *    b. quests for for determining updates (strength_points) as well as which quests have not been completed
 *    c. attributes whose experience needs to be updated based on quest completions
 * 4. Aggregate data into a single pre-transaction object
 * 5. For each user, commit update to the database in a transaction via rpc call with the pre-transaction object as the payload
 *
 * @module SettlementService
 */
@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private readonly timezoneDetectorService: TimezoneDetectorService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runSettlementPipeline() {
    this.logger.log('Settlement pipeline started');

    // Step 1: Gather timezones whose day has just ended (end of day in this context is currently defined as 2am)
    const timezonesToProcess =
      this.timezoneDetectorService.getTimezonesWithDayJustEnded(2);
    this.logger.debug(`Timezones to process: ${timezonesToProcess.join(', ')}`);
    
    if (timezonesToProcess.length === 0) {
      this.logger.log('No timezones to process. Settlement pipeline completed.');
      return;
    }

    // Step 2: Gather users with applicable timezones

    // Step 3: For each applicable user, get their...
    //    a. quest_completions for the day (where processed_at is null)
    //    b. quests for for determining updates (strength_points) as well as which quests have not been completed
    //    c. attributes whose experience needs to be updated based on quest completions

    // Step 4: Aggregate data into a single pre-transaction object

    // Step 5: For each user, commit update to the database in a transaction via rpc call with the pre-transaction object as the payload
  }
}
