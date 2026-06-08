import { Test } from '@nestjs/testing';
import { DirectorsService } from './directors.service';
import { DirectorsRepository } from './directors.repository';

const mockDirectorRow = {
  id: 1,
  slug: 'pawel-pawlikowski',
  name: 'Paweł Pawlikowski',
  sourceId: 555,
  role: 'director',
  bio: null,
  photoUrl: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

describe('DirectorsService', () => {
  let service: DirectorsService;
  let repo: jest.Mocked<DirectorsRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DirectorsService,
        {
          provide: DirectorsRepository,
          useValue: {
            findAll: jest.fn().mockResolvedValue([]),
            count: jest.fn(),
            findBySlug: jest.fn(),
            updateBySlug: jest.fn(),
            findStats: jest.fn().mockResolvedValue(new Map()),
            findContentUpdatedAt: jest.fn().mockResolvedValue(new Map()),
          },
        },
      ],
    }).compile();

    service = module.get(DirectorsService);
    repo = module.get(DirectorsRepository);
  });

  describe('getDirectors', () => {
    it('returns a paginated envelope when limit provided', async () => {
      repo.findAll.mockResolvedValue([mockDirectorRow] as never);
      repo.count.mockResolvedValue(1);
      repo.findStats.mockResolvedValue(
        new Map([[1, { moviesCount: 4, upcomingScreeningsCount: 7 }]]),
      );

      const result = await service.getDirectors({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].slug).toBe('pawel-pawlikowski');
      expect(result.data[0].upcomingScreeningsCount).toBe(7);
      expect(result.data[0].moviesCount).toBe(4);
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(repo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 0 }),
      );
      expect(repo.count).toHaveBeenCalled();
    });

    it('returns all directors in one page when no limit provided', async () => {
      repo.findAll.mockResolvedValue([mockDirectorRow] as never);

      const result = await service.getDirectors();

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(repo.count).not.toHaveBeenCalled();
    });

    it('defaults missing stats and updatedAt', async () => {
      repo.findAll.mockResolvedValue([mockDirectorRow] as never);

      const result = await service.getDirectors();

      expect(result.data[0].upcomingScreeningsCount).toBe(0);
      expect(result.data[0].moviesCount).toBe(0);
      expect(result.data[0].updatedAt).toBeNull();
    });

    it('includes effective updatedAt from the content map', async () => {
      const date = new Date('2026-06-01T12:00:00.000Z');
      repo.findAll.mockResolvedValue([mockDirectorRow] as never);
      repo.findContentUpdatedAt.mockResolvedValue(new Map([[1, date]]));

      const result = await service.getDirectors();

      expect(result.data[0].updatedAt).toBe('2026-06-01T12:00:00.000Z');
      expect(repo.findContentUpdatedAt).toHaveBeenCalledWith([1]);
    });
  });

  describe('getDirectorBySlug', () => {
    it('returns a mapped director when found', async () => {
      repo.findBySlug.mockResolvedValue(mockDirectorRow as never);
      repo.findStats.mockResolvedValue(
        new Map([[1, { moviesCount: 2, upcomingScreeningsCount: 0 }]]),
      );

      const result = await service.getDirectorBySlug('pawel-pawlikowski');

      expect(result).not.toBeNull();
      expect(result!.slug).toBe('pawel-pawlikowski');
      expect(result!.moviesCount).toBe(2);
      expect(repo.findBySlug).toHaveBeenCalledWith('pawel-pawlikowski');
    });

    it('returns null when not found', async () => {
      repo.findBySlug.mockResolvedValue(undefined);

      const result = await service.getDirectorBySlug('nieistnieje');

      expect(result).toBeNull();
    });
  });

  describe('updateDirectorBySlug', () => {
    it('returns the mapped director after update', async () => {
      const updatedRow = { ...mockDirectorRow, bio: 'Polski reżyser.' };
      repo.updateBySlug.mockResolvedValue(updatedRow as never);

      const result = await service.updateDirectorBySlug('pawel-pawlikowski', {
        bio: 'Polski reżyser.',
      });

      expect(result).not.toBeNull();
      expect(result!.bio).toBe('Polski reżyser.');
      expect(repo.updateBySlug).toHaveBeenCalledWith('pawel-pawlikowski', {
        bio: 'Polski reżyser.',
      });
    });

    it('returns null when the director is not found', async () => {
      repo.updateBySlug.mockResolvedValue(null);

      const result = await service.updateDirectorBySlug('nieistnieje', {
        bio: 'x',
      });

      expect(result).toBeNull();
    });
  });
});
