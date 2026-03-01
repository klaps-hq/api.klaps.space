import { Test } from '@nestjs/testing';
import { SocialsController } from './socials.controller';
import { SocialService } from './social.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { SocialsCandidateResponse } from '../lib/response-types';

describe('SocialsController', () => {
  let controller: SocialsController;
  let service: jest.Mocked<SocialService>;

  beforeEach(async () => {
    const mockService = { getCandidate: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [SocialsController],
      providers: [{ provide: SocialService, useValue: mockService }],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(SocialsController);
    service = module.get(SocialService);
  });

  it('delegates date param to service', async () => {
    const expected: SocialsCandidateResponse = {
      publish: false,
      date: '2026-03-01',
      reason: 'NO_HIGH_QUALITY_CANDIDATE',
      meta: { candidatesChecked: 0, bestScore: null, minScore: 60 },
    };
    service.getCandidate.mockResolvedValue(expected);

    const result = await controller.getCandidate({ date: '2026-03-01' });

    expect(result).toEqual(expected);
    expect(service.getCandidate).toHaveBeenCalledWith('2026-03-01');
  });

  it('passes undefined when no date provided', async () => {
    const expected: SocialsCandidateResponse = {
      publish: false,
      date: '2026-02-27',
      reason: 'NO_HIGH_QUALITY_CANDIDATE',
      meta: { candidatesChecked: 0, bestScore: null, minScore: 60 },
    };
    service.getCandidate.mockResolvedValue(expected);

    const result = await controller.getCandidate({});

    expect(result).toEqual(expected);
    expect(service.getCandidate).toHaveBeenCalledWith(undefined);
  });
});
