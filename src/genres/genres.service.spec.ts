import { Test } from '@nestjs/testing';
import { GenresService } from './genres.service';
import { DRIZZLE } from '../database/constants';

describe('GenresService', () => {
  let service: GenresService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      query: {
        genres: { findMany: jest.fn() },
      },
    };

    const module = await Test.createTestingModule({
      providers: [
        GenresService,
        { provide: DRIZZLE, useValue: mockDb },
      ],
    }).compile();

    service = module.get(GenresService);
  });

  describe('getGenres', () => {
    it('returns mapped genres', async () => {
      mockDb.query.genres.findMany.mockResolvedValue([
        { id: 1, name: 'Drama', sourceId: 100, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: 'Comedy', sourceId: 101, createdAt: new Date(), updatedAt: new Date() },
      ]);

      const result = await service.getGenres();

      expect(result).toEqual([
        { id: 1, name: 'Drama' },
        { id: 2, name: 'Comedy' },
      ]);
    });

    it('returns empty array when no genres exist', async () => {
      mockDb.query.genres.findMany.mockResolvedValue([]);

      const result = await service.getGenres();

      expect(result).toEqual([]);
    });
  });
});
