import { Test } from '@nestjs/testing';
import { GenresRepository } from './genres.repository';
import { DRIZZLE } from '../database/constants';

const mockGenre = {
  id: 1,
  sourceId: 10,
  slug: 'action',
  name: 'Action',
  description: 'Action movies',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockGenreComedy = {
  id: 2,
  sourceId: 20,
  slug: 'comedy',
  name: 'Comedy',
  description: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockDb = {
  query: {
    genres: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
  update: jest.fn(),
};

const mockSet = jest.fn();
const mockWhere = jest.fn();

describe('GenresRepository', () => {
  let repository: GenresRepository;

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb.update.mockReturnValue({ set: mockSet });
    mockSet.mockReturnValue({ where: mockWhere });
    mockWhere.mockResolvedValue(undefined);

    const module = await Test.createTestingModule({
      providers: [GenresRepository, { provide: DRIZZLE, useValue: mockDb }],
    }).compile();

    repository = module.get(GenresRepository);
  });

  describe('findAll', () => {
    it('should return all genres', async () => {
      mockDb.query.genres.findMany.mockResolvedValue([
        mockGenre,
        mockGenreComedy,
      ]);

      const result = await repository.findAll();

      expect(result).toEqual([mockGenre, mockGenreComedy]);
      expect(mockDb.query.genres.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no genres exist', async () => {
      mockDb.query.genres.findMany.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findBySlug', () => {
    it('should return genre matching the slug', async () => {
      mockDb.query.genres.findFirst.mockResolvedValue(mockGenre);

      const result = await repository.findBySlug('action');

      expect(result).toEqual(mockGenre);
      expect(mockDb.query.genres.findFirst).toHaveBeenCalledWith({
        where: expect.anything(),
      });
    });

    it('should return undefined when genre not found', async () => {
      mockDb.query.genres.findFirst.mockResolvedValue(undefined);

      const result = await repository.findBySlug('nonexistent');

      expect(result).toBeUndefined();
    });
  });

  describe('updateBySlug', () => {
    it('should update description and return re-fetched genre', async () => {
      const updated = { ...mockGenre, description: 'Updated description' };
      mockDb.query.genres.findFirst.mockResolvedValue(updated);

      const result = await repository.updateBySlug('action', {
        description: 'Updated description',
      });

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Updated description',
          updatedAt: expect.any(Date),
        }),
      );
      expect(mockWhere).toHaveBeenCalled();
      expect(result).toEqual(updated);
    });

    it('should update name and slug when provided', async () => {
      const updated = { ...mockGenre, name: 'New Name', slug: 'new-name' };
      mockDb.query.genres.findFirst.mockResolvedValue(updated);

      const result = await repository.updateBySlug('action', {
        name: 'New Name',
        slug: 'new-name',
      });

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
          slug: 'new-name',
          updatedAt: expect.any(Date),
        }),
      );
      expect(result).toEqual(updated);
    });

    it('should return null when genre not found after update', async () => {
      mockDb.query.genres.findFirst.mockResolvedValue(undefined);

      const result = await repository.updateBySlug('nonexistent', {
        name: 'New',
      });

      expect(result).toBeNull();
    });

    it('should set description to null when explicitly passed as null', async () => {
      const updated = { ...mockGenre, description: null };
      mockDb.query.genres.findFirst.mockResolvedValue(updated);

      const result = await repository.updateBySlug('action', {
        description: null,
      });

      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          description: null,
          updatedAt: expect.any(Date),
        }),
      );
      expect(result).toEqual(updated);
    });
  });
});
