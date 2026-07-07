import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { AppModule } from './app.module.js';

describe('health API', () => {
  let app: INestApplication | undefined;
  afterEach(async () => app?.close());
  it('reports readiness without exposing configuration', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
    const response = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', service: 'tadkar-prototype' });
  });
});
