import { Test } from '@nestjs/testing';
import { LandingIntrosService } from './landing-intros.service';
import { LandingIntrosRepository } from './landing-intros.repository';

const row = {
  key: 'classic',
  content: 'Klasyka w kinach.',
  createdAt: new Date('2026-10-01T10:00:00.000Z'),
  updatedAt: new Date('2026-10-28T10:00:00.000Z'),
};

describe('LandingIntrosService', () => {
  let service: LandingIntrosService;
  let repo: jest.Mocked<LandingIntrosRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LandingIntrosService,
        {
          provide: LandingIntrosRepository,
          useValue: {
            findAll: jest.fn(),
            findByKey: jest.fn(),
            upsert: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(LandingIntrosService);
    repo = module.get(LandingIntrosRepository);
  });

  it('should map rows with an ISO updatedAt', async () => {
    repo.findAll.mockResolvedValue([row]);

    await expect(service.getLandingIntros()).resolves.toEqual([
      {
        key: 'classic',
        content: 'Klasyka w kinach.',
        updatedAt: '2026-10-28T10:00:00.000Z',
      },
    ]);
  });

  it('should return null for a missing key', async () => {
    repo.findByKey.mockResolvedValue(undefined);

    await expect(service.getLandingIntro('classic')).resolves.toBeNull();
  });

  it('should trim content before saving', async () => {
    repo.upsert.mockResolvedValue(row);

    await service.upsertLandingIntro('classic', '  Klasyka w kinach.\n');

    expect(repo.upsert).toHaveBeenCalledWith('classic', 'Klasyka w kinach.');
  });
});
