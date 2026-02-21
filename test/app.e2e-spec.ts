import { Test } from '@nestjs/testing';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from '../src/health/health.controller';
import { DrizzleHealthIndicator } from '../src/health/drizzle.health';
import { DRIZZLE } from '../src/database/constants';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const mockDb = {
      execute: jest.fn().mockResolvedValue([{ '1': 1 }]),
    };

    const moduleFixture = await Test.createTestingModule({
      imports: [TerminusModule],
      controllers: [HealthController],
      providers: [
        DrizzleHealthIndicator,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health returns 200', () => {
    return request(app.getHttpServer()).get('/health').expect(200);
  });
});
