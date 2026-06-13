import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  // Application context is created, but we don't need to start an HTTP server since this is a background service
}
bootstrap();
