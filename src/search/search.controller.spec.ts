import { Test } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { ConfigService } from '@nestjs/config';

describe('SearchController', () => {
  let controller: SearchController;
  let service: jest.Mocked<SearchService>;

  const mockSearchResponse = {
    cities: [
      {
        id: 5,
        slug: 'warszawa',
        name: 'Warszawa',
        nameDeclinated: 'Warszawie',
        population: 1800000,
        description: null,
      },
    ],
    cinemas: [],
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: { search: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get(SearchController);
    service = module.get(SearchService);
  });

  describe('search', () => {
    it('should return search results from service', async () => {
      service.search.mockResolvedValue(mockSearchResponse);

      const result = await controller.search({ query: 'war' });

      expect(result).toEqual(mockSearchResponse);
      expect(service.search).toHaveBeenCalledWith({ query: 'war' });
    });
  });
});
