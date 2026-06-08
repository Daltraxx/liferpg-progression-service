import { Injectable } from '@nestjs/common';

/**
 * Orchestrates the settlement service pipeline, which includes the following steps:
 * 1. Determine which timezone day just ended to determine which users need to be processed
 * 2. For each applicable user, get their...
 *    a. quest_completions for the day (where processed_at is null)
 *    b. quests for for determining updates (strength_points) as well as which quests have not been completed
 *    c. attributes whose experience needs to be updated based on quest completions
 * 3. Aggregate data into a single pre-transaction object
 * 4. For each user, commit update to the database in a transaction via rpc call with the pre-transaction object as the payload
 *
 * @module SettlementService
 */
@Injectable()
export class SettlementService {}
