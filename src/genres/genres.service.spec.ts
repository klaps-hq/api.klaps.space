import { Test } from '@nestjs/testing';
import { GenresService } from './genres.service';
import { GenresRepository } from './genres.repository';

const mockGenre = {
  id: 1,
  sourceId: 10,
  slug: 'action',
  name: 'Action',
  description: 'Action movies',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockGenreNoDesc = {
  id: 2,
  sourceId: 20,
  slug: 'comedy',
  name: 'Comedy',
  description: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

describe('GenresService', () => {
  let service: GenresService;
  let repo: jest.Mocked<GenresRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        GenresService,
        {
          provide: GenresRepository,
          useValue: {
            findAll: jest.fn(),
            findBySlug: jest.fn(),
            updateBySlug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(GenresService);
    repo = module.get(GenresRepository);
  });

  describe('getGenres', () => {
    it('should return mapped genre responses', async () => {
      repo.findAll.mockResolvedValue([mockGenre, mockGenreNoDesc]);

      const result = await service.getGenres();

      expect(result).toEqual([
        { id: 1, slug: 'action', name: 'Action', description: 'Action movies' },
        { id: 2, slug: 'comedy', name: 'Comedy', description: null },
      ]);
      expect(repo.findAll).toHaveBeenCalled();
    });

    it('should return empty array when no genres exist', async () => {
      repo.findAll.mockResolvedValue([]);

      const result = await service.getGenres();

      expect(result).toEqual([]);
    });
  });

  describe('findBySlug', () => {
    it('should return genre when found', async () => {
      repo.findBySlug.mockResolvedValue(mockGenre);

      const result = await service.findBySlug('action');

      expect(result).toEqual(mockGenre);
      expect(repo.findBySlug).toHaveBeenCalledWith('action');
    });

    it('should return null when genre not found', async () => {
      repo.findBySlug.mockResolvedValue(undefined);

      const result = await service.findBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getGenreBySlug', () => {
    it('should return mapped genre response', async () => {
      repo.findBySlug.mockResolvedValue(mockGenre);

      const result = await service.getGenreBySlug('action');

      expect(result).toEqual({
        id: 1,
        slug: 'action',
        name: 'Action',
        description: 'Action movies',
      });
    });

    it('should return null description as null in mapped response', async () => {
      repo.findBySlug.mockResolvedValue(mockGenreNoDesc);

      const result = await service.getGenreBySlug('comedy');

      expect(result).toEqual({
        id: 2,
        slug: 'comedy',
        name: 'Comedy',
        description: null,
      });
    });

    it('should return null when genre not found', async () => {
      repo.findBySlug.mockResolvedValue(undefined);

      const result = await service.getGenreBySlug('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateGenreBySlug', () => {
    it('should return mapped genre response after update', async () => {
      const updated = { ...mockGenre, description: 'Updated description' };
      repo.updateBySlug.mockResolvedValue(updated);

      const result = await service.updateGenreBySlug('action', {
        description: 'Updated description',
      });

      expect(result).toEqual({
        id: 1,
        slug: 'action',
        name: 'Action',
        description: 'Updated description',
      });
      expect(repo.updateBySlug).toHaveBeenCalledWith('action', {
        description: 'Updated description',
      });
    });

    it('should return null when genre to update not found', async () => {
      repo.updateBySlug.mockResolvedValue(null);

      const result = await service.updateGenreBySlug('nonexistent', {
        name: 'New',
      });

      expect(result).toBeNull();
    });
  });
});
