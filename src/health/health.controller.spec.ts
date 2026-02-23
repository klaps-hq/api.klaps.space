import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService } from '@nestjs/terminus';
import { DrizzleHealthIndicator } from './drizzle.health';

describe('HealthController', () => {
  let controller: HealthController;
  let healthCheckService: jest.Mocked<HealthCheckService>;
  let drizzleHealth: jest.Mocked<DrizzleHealthIndicator>;

  beforeEach(async () => {
    const mockHealthCheck = {
      check: jest.fn(),
    };
    const mockDrizzle = {
      isHealthy: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheck },
        { provide: DrizzleHealthIndicator, useValue: mockDrizzle },
      ],
    }).compile();

    controller = module.get(HealthController);
    healthCheckService = module.get(HealthCheckService);
    drizzleHealth = module.get(DrizzleHealthIndicator);
  });

  describe('check', () => {
    it('delegates to HealthCheckService', async () => {
      const expected = {
        status: 'ok',
        details: { database: { status: 'up' } },
      };
      healthCheckService.check.mockResolvedValue(expected as any);

      const result = await controller.check();

      expect(result).toEqual(expected);
      expect(healthCheckService.check).toHaveBeenCalledWith([
        expect.any(Function),
      ]);
    });

    it('passes drizzle health indicator to check', async () => {
      drizzleHealth.isHealthy.mockResolvedValue({ database: { status: 'up' } });
      healthCheckService.check.mockImplementation(async (indicators) => {
        for (const fn of indicators) {
          await fn();
        }
        return { status: 'ok', details: { database: { status: 'up' } } } as any;
      });

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(drizzleHealth.isHealthy).toHaveBeenCalled();
    });
  });
});
