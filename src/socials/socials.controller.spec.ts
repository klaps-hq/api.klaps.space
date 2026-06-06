import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { SocialsController } from './socials.controller';
import { SocialsService } from './socials.service';

describe('SocialsController', () => {
  let controller: SocialsController;
  let service: jest.Mocked<SocialsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SocialsController],
      providers: [
        {
          provide: SocialsService,
          useValue: {
            getCandidate: jest.fn(),
            reserveCandidate: jest.fn(),
            publishCandidate: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(SocialsController);
    service = module.get(SocialsService);
  });

  describe('getCandidate', () => {
    it('should delegate query fields to service.getCandidate', async () => {
      const mockResponse = {
        publish: true,
        date: { from: '2025-03-10', to: '2025-03-12' },
        reason: 'HAS_HIGH_QUALITY_CANDIDATE' as const,
        meta: { candidatesChecked: 5, bestScore: 40, minScore: 20 },
        candidates: [],
      };
      service.getCandidate.mockResolvedValue(mockResponse);

      const query = {
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 20,
        platform: 'instagram',
        numberOfCandidates: 5,
      };

      const result = await controller.getCandidate(query);

      expect(service.getCandidate).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResponse);
    });

    it('should pass undefined numberOfCandidates when not provided', async () => {
      service.getCandidate.mockResolvedValue({
        publish: false,
        date: { from: '2025-03-10', to: '2025-03-12' },
        reason: 'NO_SCREENINGS_IN_RANGE',
        meta: { candidatesChecked: 0, bestScore: null, minScore: 20 },
        candidates: [],
      });

      const query = {
        dateFrom: '2025-03-10',
        dateTo: '2025-03-12',
        minScore: 20,
        platform: 'instagram',
      };

      await controller.getCandidate(query as any);

      expect(service.getCandidate).toHaveBeenCalledWith(query);
    });
  });

  describe('reserve', () => {
    it('should delegate body fields to service.reserveCandidate', async () => {
      service.reserveCandidate.mockResolvedValue(undefined);

      const body = { platform: 'instagram', screeningId: 42 };

      await controller.reserve(body);

      expect(service.reserveCandidate).toHaveBeenCalledWith(body);
    });
  });

  describe('publish', () => {
    it('should delegate body fields to service.publishCandidate', async () => {
      service.publishCandidate.mockResolvedValue(undefined);

      const body = { platform: 'twitter', screeningId: 99 };

      await controller.publish(body);

      expect(service.publishCandidate).toHaveBeenCalledWith(body);
    });
  });
});
