import { Test } from '@nestjs/testing';
import { GenresController } from './genres.controller';
import { GenresService } from './genres.service';
import { InternalApiKeyGuard } from '../guards/internal-api-key.guard';

describe('GenresController', () => {
  let controller: GenresController;
  let service: jest.Mocked<GenresService>;

  beforeEach(async () => {
    const mockService = {
      getGenres: jest.fn(),
    };

    const module = await Test.createTestingModule({
      controllers: [GenresController],
      providers: [{ provide: GenresService, useValue: mockService }],
    })
      .overrideGuard(InternalApiKeyGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(GenresController);
    service = module.get(GenresService) as jest.Mocked<GenresService>;
  });

  describe('getGenres', () => {
    it('returns genres from service', async () => {
      const genres = [
        { id: 1, name: 'Drama' },
        { id: 2, name: 'Comedy' },
      ];
      service.getGenres.mockResolvedValue(genres);

      const result = await controller.getGenres();

      expect(result).toEqual(genres);
    });
  });
});
