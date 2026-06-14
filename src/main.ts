import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SettlementService } from './settlement/settlement.service';

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    // Application context is created, but we don't need to start an HTTP server since this is a background service

    // We no longer need to set up manual shutdown hooks since
    // we will be triggering the settlement pipeline via a manual cron job in Render's dashboard
    // rather than running this as a continuously running service,
    // but if we wanted to switch back to running this as a continuously running service in the future,
    // we can easily add this back in by uncommenting the following lines:
    // const shutdownSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    // shutdownSignals.forEach((signal) => {
    //   process.on(signal, async () => {
    //     console.log(`Received ${signal}, shutting down gracefully...`);
    //     await app.close();
    //     process.exit(0);
    //   });
    // });

    const settlementService = app.get(SettlementService);
    await settlementService.runSettlementPipeline();

    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during application bootstrap:', error);
    process.exit(1);
  }
}
void bootstrap();
