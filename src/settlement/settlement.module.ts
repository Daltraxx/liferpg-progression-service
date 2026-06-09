import { Module } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { TimezoneDetectorService } from './pipeline/timezone-detector.service';
import { UserAggregatorService } from './pipeline/user-aggregator.service';

@Module({
  providers: [
    SettlementService,
    TimezoneDetectorService,
    UserAggregatorService,
  ],
})
export class SettlementModule {}
