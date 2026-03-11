import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';

const mockGenre = {
  id: 1,
  sourceId: 10,
  slug: 'action',
  name: 'Action',
  description: 'Action movies',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockGenreResponse = {
  id: 1,
  slug: 'action',
  name: 'Action',
  description: 'Action movies',
};

describe('GenresController', () => {
  let controller: GenresController;
  let service: jest.Mocked<GenresService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GenresController],
      providers: [
        {
          provide: GenresService,
          useValue: {
            getGenres: jest.fn(),
            getGenreBySlug: jest.fn(),
            updateGenreBySlug: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    controller = module.get(GenresController);
    service = module.get(GenresService);
  });

  describe('getGenres', () => {
    it('should return all genres from service', async () => {
      service.getGenres.mockResolvedValue([mockGenre]);

      const result = await controller.getGenres();

      expect(result).toEqual([mockGenre]);
      expect(service.getGenres).toHaveBeenCalled();
    });
  });

  describe('getGenreBySlug', () => {
    it('should return genre when found', async () => {
      service.getGenreBySlug.mockResolvedValue(mockGenreResponse);

      const result = await controller.getGenreBySlug('action');

      expect(result).toEqual(mockGenreResponse);
      expect(service.getGenreBySlug).toHaveBeenCalledWith('action');
    });

    it('should throw NotFoundException when genre not found', async () => {
      service.getGenreBySlug.mockResolvedValue(null);

      await expect(controller.getGenreBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getGenreBySlug('nonexistent')).rejects.toThrow(
        'Genre "nonexistent" not found',
      );
    });
  });

  describe('updateGenreBySlug', () => {
    it('should return updated genre', async () => {
      const updated = { ...mockGenre, description: 'Updated' };
      service.updateGenreBySlug.mockResolvedValue(updated);

      const result = await controller.updateGenreBySlug('action', {
        description: 'Updated',
      });

      expect(result).toEqual(updated);
      expect(service.updateGenreBySlug).toHaveBeenCalledWith('action', {
        description: 'Updated',
      });
    });

    it('should throw NotFoundException when genre to update not found', async () => {
      service.updateGenreBySlug.mockResolvedValue(null);

      await expect(
        controller.updateGenreBySlug('nonexistent', { name: 'New' }),
      ).rejects.toThrow(NotFoundException);
      await expect(
        controller.updateGenreBySlug('nonexistent', { name: 'New' }),
      ).rejects.toThrow('Genre "nonexistent" not found');
    });
  });
});
