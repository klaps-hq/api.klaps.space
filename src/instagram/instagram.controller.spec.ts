import { Test } from '@nestjs/testing';
import { InstagramController } from './instagram.controller';
import { InstagramService } from './instagram.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';
import type { InstagramCandidateResponse } from '../lib/response-types';

describe('InstagramController', () => {
  let controller: InstagramController;
  let service: jest.Mocked<InstagramService>;

  beforeEach(async () => {
    const mockService = { getCandidate: jest.fn() };

    const module = await Test.createTestingModule({
      controllers: [InstagramController],
      providers: [{ provide: InstagramService, useValue: mockService }],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(InstagramController);
    service = module.get(InstagramService);
  });

  it('delegates date param to service', async () => {
    const expected: InstagramCandidateResponse = {
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
    const expected: InstagramCandidateResponse = {
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
