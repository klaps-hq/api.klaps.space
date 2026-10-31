import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SeriesService } from './series.service';
import { SeriesRepository } from './series.repository';
import { ScreeningsService } from '../screenings/screenings.service';
import type { Series } from '../database/schemas/series.schema';

const makeSeries = (over: Partial<Series> = {}): Series => ({
  id: 7,
  slug: 'helios-replay',
  name: 'Helios RePlay',
  type: 'cycle',
  organizer: 'Helios',
  isChainProgramme: true,
  description: null,
  firstSeenAt: new Date('2026-10-01'),
  lastSeenAt: new Date('2026-10-30'),
  createdAt: new Date('2026-10-01'),
  updatedAt: new Date('2026-10-01'),
  ...over,
});

describe('SeriesService', () => {
  let service: SeriesService;
  let repo: jest.Mocked<SeriesRepository>;
  let screenings: jest.Mocked<ScreeningsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SeriesService,
        {
          provide: SeriesRepository,
          useValue: {
            findAll: jest.fn(),
            findBySlug: jest.fn(),
            countScreenings: jest.fn().mockResolvedValue([]),
            findPastMovies: jest.fn().mockResolvedValue([]),
            update: jest.fn(),
            addAliases: jest.fn(),
          },
        },
        { provide: ScreeningsService, useValue: { getScreenings: jest.fn() } },
      ],
    }).compile();
    service = module.get(SeriesService);
    repo = module.get(SeriesRepository);
    screenings = module.get(ScreeningsService);
  });

  it('lists series with their counts, zero when nothing is scheduled', async () => {
    repo.findAll.mockResolvedValue([
      makeSeries(),
      makeSeries({ id: 8, slug: 'dkf' }),
    ]);
    repo.countScreenings.mockResolvedValue([
      {
        seriesId: 7,
        upcomingCount: 12,
        upcomingVenues: 3,
        upcomingCities: 2,
        independentUpcomingCount: 0,
        pastCount: 40,
        lastScreeningAddedAt: new Date('2026-10-30T10:00:00Z'),
      },
    ]);

    const res = await service.getSeries();

    expect(res[0]).toMatchObject({
      slug: 'helios-replay',
      upcomingCount: 12,
      pastCount: 40,
      lastScreeningAddedAt: '2026-10-30T10:00:00.000Z',
    });
    expect(res[1]).toMatchObject({
      slug: 'dkf',
      upcomingCount: 0,
      pastCount: 0,
    });
  });

  it('builds the series page from its screenings and past films', async () => {
    repo.findBySlug.mockResolvedValue(makeSeries());
    screenings.getScreenings.mockResolvedValue([]);

    const res = await service.getSeriesBySlug('helios-replay');

    expect(screenings.getScreenings).toHaveBeenCalledWith(
      expect.objectContaining({ seriesSlug: 'helios-replay' }),
    );
    expect(res).toMatchObject({
      slug: 'helios-replay',
      screenings: [],
      pastMovies: [],
    });
  });

  it('adds aliases as slugs and keeps the slug on rename', async () => {
    repo.findBySlug.mockResolvedValue(makeSeries());
    repo.update.mockResolvedValue(makeSeries({ name: 'Helios RePlay!' }));

    const res = await service.updateSeries('helios-replay', {
      name: 'Helios RePlay!',
      aliases: ['w Helios RePlay', 'Helios Re-Play'],
    });

    expect(repo.addAliases).toHaveBeenCalledWith(7, [
      'w-helios-replay',
      'helios-re-play',
    ]);
    expect(res.slug).toBe('helios-replay');
  });

  it('throws NotFound for an unknown slug', async () => {
    repo.findBySlug.mockResolvedValue(undefined);
    await expect(service.getSeriesBySlug('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
