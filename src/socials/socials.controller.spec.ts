import { Test } from '@nestjs/testing';
import { SocialsController } from './socials.controller';
import { SocialsService } from './socials.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { SocialsCandidateResponse } from '../lib/response-types';

describe('SocialsController', () => {
  let controller: SocialsController;
  let service: jest.Mocked<SocialsService>;

  beforeEach(async () => {
    const mockService = { getCandidate: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [SocialsController],
      providers: [{ provide: SocialsService, useValue: mockService }],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SocialsController);
    service = module.get(SocialsService);
  });

  it('delegates date param to service', async () => {
    const expected: SocialsCandidateResponse = {
      publish: false,
      date: '2026-03-01',
      reason: 'NO_HIGH_QUALITY_CANDIDATE',
      meta: { candidatesChecked: 0, bestScore: null, minScore: 60 },
    };
    service.getCandidate.mockResolvedValue(expected);

    const result = await controller.getCandidate({
      date: '2026-03-01',
      platform: 'instagram',
    });

    expect(result).toEqual(expected);
    expect(service.getCandidate).toHaveBeenCalledWith(
      '2026-03-01',
      undefined,
      'instagram',
    );
  });

  it('passes undefined when no date provided', async () => {
    const expected: SocialsCandidateResponse = {
      publish: false,
      date: '2026-02-27',
      reason: 'NO_HIGH_QUALITY_CANDIDATE',
      meta: { candidatesChecked: 0, bestScore: null, minScore: 60 },
    };
    service.getCandidate.mockResolvedValue(expected);

    const result = await controller.getCandidate({ platform: 'instagram' });

    expect(result).toEqual(expected);
    expect(service.getCandidate).toHaveBeenCalledWith(
      undefined,
      undefined,
      'instagram',
    );
  });

  it('delegates minScore param to service', async () => {
    const expected: SocialsCandidateResponse = {
      publish: false,
      date: '2026-03-01',
      reason: 'NO_HIGH_QUALITY_CANDIDATE',
      meta: { candidatesChecked: 0, bestScore: null, minScore: 75 },
    };
    service.getCandidate.mockResolvedValue(expected);

    const result = await controller.getCandidate({
      date: '2026-03-01',
      minScore: 75,
      platform: 'instagram',
    });

    expect(result).toEqual(expected);
    expect(service.getCandidate).toHaveBeenCalledWith(
      '2026-03-01',
      75,
      'instagram',
    );
  });

  it('delegates platform param to service', async () => {
    const expected: SocialsCandidateResponse = {
      publish: false,
      date: '2026-03-01',
      reason: 'NO_HIGH_QUALITY_CANDIDATE',
      meta: { candidatesChecked: 0, bestScore: null, minScore: 60 },
    };
    service.getCandidate.mockResolvedValue(expected);

    const result = await controller.getCandidate({
      date: '2026-03-01',
      platform: 'facebook',
    });

    expect(result).toEqual(expected);
    expect(service.getCandidate).toHaveBeenCalledWith(
      '2026-03-01',
      undefined,
      'facebook',
    );
  });
});
