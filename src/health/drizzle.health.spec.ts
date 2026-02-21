import { Test } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { DrizzleHealthIndicator } from './drizzle.health';
import { DRIZZLE } from '../database/constants';

describe('DrizzleHealthIndicator', () => {
  let indicator: DrizzleHealthIndicator;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      execute: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        DrizzleHealthIndicator,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    indicator = module.get(DrizzleHealthIndicator);
  });

  it('returns healthy status when DB responds', async () => {
    mockDb.execute.mockResolvedValue([{ '1': 1 }]);

    const result = await indicator.isHealthy();

    expect(result).toEqual({ database: { status: 'up' } });
  });

  it('throws HealthCheckError when DB fails', async () => {
    mockDb.execute.mockRejectedValue(new Error('Connection refused'));

    await expect(indicator.isHealthy()).rejects.toThrow(HealthCheckError);
  });

  it('uses custom key when provided', async () => {
    mockDb.execute.mockResolvedValue([{ '1': 1 }]);

    const result = await indicator.isHealthy('mysql');

    expect(result).toEqual({ mysql: { status: 'up' } });
  });
});
