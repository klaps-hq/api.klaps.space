import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TicketingMatchesService } from './ticketing-matches.service';
import { TicketingMatchesRepository } from './ticketing-matches.repository';
import type { TicketingMatchRow } from '../database/schemas/ticketing_matches.schema';

const makeRow = (over: Partial<TicketingMatchRow> = {}): TicketingMatchRow => ({
  key: 'msi:https://bilety.charlie.pl:Lalka',
  provider: 'msi',
  rawTitle: 'Lalka',
  status: 'matched',
  filmwebId: 1174,
  title: 'Lalka',
  year: 1968,
  method: 'ai',
  confidence: 0.9,
  note: null,
  result: { status: 'matched', filmwebId: 1174 },
  manual: false,
  reviewedAt: null,
  cinemas: [92],
  screenings: 35,
  checkedAt: new Date('2026-10-30'),
  lastSeenAt: new Date('2026-10-30'),
  createdAt: new Date('2026-10-30'),
  ...over,
});

describe('TicketingMatchesService', () => {
  let service: TicketingMatchesService;
  let repo: jest.Mocked<TicketingMatchesRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TicketingMatchesService,
        {
          provide: TicketingMatchesRepository,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            findByKey: jest.fn(),
            upsertMany: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(TicketingMatchesService);
    repo = module.get(TicketingMatchesRepository);
  });

  it('passes the retro cut-off year to the suspicious filter', async () => {
    await service.getMatches({ review: 'suspicious' });
    expect(repo.findAll).toHaveBeenCalledWith(
      'suspicious',
      new Date().getFullYear() - 3,
    );
  });

  it('saves the scraper matches with the run time', async () => {
    const res = await service.saveMatches({
      matches: [
        {
          key: 'helios:1',
          provider: 'helios',
          rawTitle: 'Diabły',
          status: 'matched',
          filmwebId: 1,
          result: { status: 'matched' },
          cinemas: [1],
          screenings: 3,
        },
      ],
    });
    expect(res).toEqual({ saved: 1 });
    expect(repo.upsertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        key: 'helios:1',
        filmwebId: 1,
        title: null,
        lastSeenAt: expect.any(Date),
      }),
    ]);
  });

  it('turns a panel pick into a manual override', async () => {
    repo.findByKey.mockResolvedValue(makeRow());
    repo.update.mockImplementation((_key, set) =>
      Promise.resolve(makeRow(set as Partial<TicketingMatchRow>)),
    );

    const res = await service.reviewMatch({
      key: makeRow().key,
      filmwebId: 10057628,
      title: 'Lalka',
      year: 2026,
    });

    expect(res).toMatchObject({
      manual: true,
      status: 'matched',
      filmwebId: 10057628,
      year: 2026,
      method: 'override',
    });
  });

  it('marks a match as not a film', async () => {
    repo.findByKey.mockResolvedValue(makeRow());
    repo.update.mockImplementation((_key, set) =>
      Promise.resolve(makeRow(set as Partial<TicketingMatchRow>)),
    );

    const res = await service.reviewMatch({
      key: makeRow().key,
      notFilm: true,
    });

    expect(res).toMatchObject({
      manual: true,
      status: 'not-film',
      filmwebId: null,
    });
  });

  it('rejects an empty review and an unknown key', async () => {
    repo.findByKey.mockResolvedValueOnce(makeRow());
    await expect(service.reviewMatch({ key: 'x' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    repo.findByKey.mockResolvedValueOnce(undefined);
    await expect(
      service.reviewMatch({ key: 'x', reviewed: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
