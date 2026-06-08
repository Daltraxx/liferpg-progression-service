import { Module } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { TimezoneDetectorService } from './pipeline/timezone-detector.service';

@Module({
  providers: [SettlementService, TimezoneDetectorService],
})
export class SettlementModule {}