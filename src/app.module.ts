import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { SettlementModule } from './settlement/settlement.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // ScheduleModule.forRoot(),
    // We are not currently using NestJS's scheduling module to trigger the settlement pipeline, 
    // but we may want to add this back in if we want to switch to using NestJS's scheduling in the future
    DatabaseModule,
    SettlementModule,
  ],

  controllers: [],
  providers: [],
})
export class AppModule {}
