import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SocialsPlansService } from './socials-plans.service';
import { SocialsPlansRepository } from './socials-plans.repository';

const plan = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  slotKey: '2026-10-30T10:30:00.000Z|instagram_post|Post IG',
  slotAt: new Date('2026-10-30T10:30:00.000Z'),
  platform: 'instagram_post',
  format: 'Post IG',
  status: 'planned',
  reason: null,
  screeningIds: [7],
  caption: 'Caption',
  publishedAt: null,
  externalId: null,
  permalink: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  media: [{ id: 'm1', position: 0 }],
  ...overrides,
});

const screening = {
  id: 7,
  date: new Date('2026-11-02T16:45:00.000Z'),
  movie: {
    id: 1,
    slug: 'ziemia-obiecana',
    title: 'Ziemia obiecana',
    posterUrl: '/p.jpg',
    productionYear: 1975,
  },
  cinema: {
    name: 'MCSW Elektrownia',
    slug: 'mcsw',
    street: 'Kopernika 1',
    city: { name: 'Radom' },
  },
};

describe('SocialsPlansService', () => {
  let service: SocialsPlansService;
  let repo: jest.Mocked<SocialsPlansRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SocialsPlansService,
        {
          provide: SocialsPlansRepository,
          useValue: {
            findPlansInRange: jest.fn(),
            findPlanById: jest.fn(),
            findMediaById: jest.fn(),
            findScreeningsByIds: jest.fn(),
            findPostsInRange: jest.fn(),
            replaceWindow: jest.fn(),
            insertMedia: jest.fn(),
            updateBySlotKey: jest.fn(),
            prune: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(SocialsPlansService);
    repo = module.get(SocialsPlansRepository);
  });

  it('returns plans with media ids and joined screenings', async () => {
    repo.findPlansInRange.mockResolvedValue([plan()] as never);
    repo.findScreeningsByIds.mockResolvedValue([screening] as never);

    const [result] = await service.getPlans(
      '2026-10-29T00:00:00.000Z',
      '2026-11-05T00:00:00.000Z',
    );

    expect(result.mediaIds).toEqual(['m1']);
    expect(result.screenings[0]).toEqual(
      expect.objectContaining({
        id: 7,
        movie: expect.objectContaining({ slug: 'ziemia-obiecana' }),
        cinema: expect.objectContaining({ city: 'Radom' }),
      }),
    );
  });

  it('rejects an inverted or too long range', async () => {
    await expect(
      service.getPlans('2026-11-05T00:00:00Z', '2026-10-29T00:00:00Z'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.getPlans('2026-01-01T00:00:00Z', '2026-06-01T00:00:00Z'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prunes and replaces the window with the radar plans', async () => {
    repo.replaceWindow.mockResolvedValue([{ slotKey: 'k', id: 'p1' }]);
    const result = await service.replacePlans({
      from: '2026-10-29T00:00:00.000Z',
      to: '2026-11-12T00:00:00.000Z',
      plans: [
        {
          slotKey: 'k',
          slotAt: '2026-10-30T10:30:00.000Z',
          platform: 'instagram_post',
          format: 'Post IG',
          status: 'planned',
          screeningIds: [7],
          caption: 'x',
        },
      ],
    });
    expect(repo.prune).toHaveBeenCalled();
    expect(repo.replaceWindow).toHaveBeenCalledWith(
      new Date('2026-10-29T00:00:00.000Z'),
      new Date('2026-11-12T00:00:00.000Z'),
      [
        expect.objectContaining({
          slotKey: 'k',
          status: 'planned',
          reason: null,
        }),
      ],
    );
    expect(result).toEqual([{ slotKey: 'k', id: 'p1' }]);
  });

  it('marks a plan as published with a timestamp', async () => {
    repo.updateBySlotKey.mockResolvedValue(plan());
    await service.updatePlan({
      slotKey: 'k',
      status: 'published',
      permalink: 'https://x',
    });
    expect(repo.updateBySlotKey).toHaveBeenCalledWith(
      'k',
      expect.objectContaining({
        status: 'published',
        publishedAt: expect.any(Date),
      }),
    );
  });

  it('throws NotFound for an unknown slot or plan', async () => {
    repo.updateBySlotKey.mockResolvedValue(undefined);
    await expect(
      service.updatePlan({ slotKey: 'nope', status: 'failed' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    repo.findPlanById.mockResolvedValue(undefined);
    await expect(
      service.addMedia(
        'p1',
        { buffer: Buffer.from(''), mimetype: 'image/jpeg' },
        0,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
