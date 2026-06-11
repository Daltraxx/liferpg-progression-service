import { Module } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { TimezoneDetectorService } from './pipeline/timezone-detector.service';
import { UserAggregatorService } from './pipeline/user-aggregator.service';
import { UserProcessorService } from './pipeline/user-processor.service';

@Module({
  providers: [
    SettlementService,
    TimezoneDetectorService,
    UserAggregatorService,
    UserProcessorService,
  ],
})
export class SettlementModule {}
