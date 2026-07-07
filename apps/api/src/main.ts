import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

const bootstrap = async (): Promise<void> => {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env['WEB_ORIGIN'] ?? 'http://localhost:4200',
    credentials: true,
  });
  await app.listen(Number(process.env['PORT'] ?? 3000), '0.0.0.0');
};
void bootstrap();
