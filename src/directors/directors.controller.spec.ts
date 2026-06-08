import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DirectorsController } from './directors.controller';
import { DirectorsService } from './directors.service';
import type { DirectorResponse } from './directors.types';
import type { PaginatedResponse } from '../lib/paginate';

const mockDirector: DirectorResponse = {
  id: 1,
  slug: 'pawel-pawlikowski',
  name: 'Paweł Pawlikowski',
  sourceId: 555,
  role: 'director',
  bio: null,
  photoUrl: null,
  upcomingScreeningsCount: 7,
  moviesCount: 4,
  updatedAt: '2026-06-01T12:00:00.000Z',
};

const paginated: PaginatedResponse<DirectorResponse> = {
  data: [mockDirector],
  meta: { total: 1, page: 1, limit: 1, totalPages: 1 },
};

describe('DirectorsController', () => {
  let controller: DirectorsController;
  let service: jest.Mocked<DirectorsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [DirectorsController],
      providers: [
        {
          provide: DirectorsService,
          useValue: {
            getDirectors: jest.fn(),
            getDirectorBySlug: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-api-key') },
        },
      ],
    }).compile();

    controller = module.get(DirectorsController);
    service = module.get(DirectorsService);
  });

  describe('getDirectors', () => {
    it('returns the paginated envelope from the service', async () => {
      service.getDirectors.mockResolvedValue(paginated);

      const result = await controller.getDirectors({});

      expect(result).toEqual(paginated);
      expect(service.getDirectors).toHaveBeenCalledWith({});
    });
  });

  describe('getDirectorBySlug', () => {
    it('returns the director when found', async () => {
      service.getDirectorBySlug.mockResolvedValue(mockDirector);

      const result = await controller.getDirectorBySlug('pawel-pawlikowski');

      expect(result).toEqual(mockDirector);
      expect(service.getDirectorBySlug).toHaveBeenCalledWith(
        'pawel-pawlikowski',
      );
    });

    it('throws NotFoundException when the director is missing', async () => {
      service.getDirectorBySlug.mockResolvedValue(null);

      await expect(controller.getDirectorBySlug('nieistnieje')).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getDirectorBySlug('nieistnieje')).rejects.toThrow(
        'Director "nieistnieje" not found',
      );
    });
  });
});
