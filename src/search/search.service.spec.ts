import { Test } from '@nestjs/testing';
import { SearchService } from './search.service';
import { CitiesService } from '../cities/cities.service';
import { CinemasService } from '../cinemas/cinemas.service';
import { DEFAULT_SEARCH_LIMIT } from './search.constants';

describe('SearchService', () => {
  let service: SearchService;
  let citiesService: jest.Mocked<CitiesService>;
  let cinemasService: jest.Mocked<CinemasService>;

  const mockCityResponse = {
    id: 5,
    slug: 'warszawa',
    name: 'Warszawa',
    nameDeclinated: 'Warszawie',
    population: 1800000,
    description: null,
    voivodeship: 'mazowieckie',
  };

  const mockCinemaSummaryResponse = {
    id: 1,
    sourceId: 101,
    slug: 'kino-muranow',
    name: 'Kino Muranow',
    street: 'ul. Andersa 1',
    description: null,
    city: mockCityResponse,
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: CitiesService,
          useValue: { searchCities: jest.fn() },
        },
        {
          provide: CinemasService,
          useValue: { searchCinemas: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(SearchService);
    citiesService = module.get(CitiesService);
    cinemasService = module.get(CinemasService);
  });

  describe('search', () => {
    it('should return matching cities and cinemas', async () => {
      citiesService.searchCities.mockResolvedValue([mockCityResponse]);
      cinemasService.searchCinemas.mockResolvedValue([
        mockCinemaSummaryResponse,
      ]);

      const result = await service.search({ query: 'war' });

      expect(result).toEqual({
        cities: [mockCityResponse],
        cinemas: [mockCinemaSummaryResponse],
      });
      expect(citiesService.searchCities).toHaveBeenCalledWith(
        'war',
        DEFAULT_SEARCH_LIMIT,
      );
      expect(cinemasService.searchCinemas).toHaveBeenCalledWith(
        'war',
        DEFAULT_SEARCH_LIMIT,
      );
    });

    it('should pass custom limit to both services', async () => {
      citiesService.searchCities.mockResolvedValue([]);
      cinemasService.searchCinemas.mockResolvedValue([]);

      await service.search({ query: 'kino', limit: 3 });

      expect(citiesService.searchCities).toHaveBeenCalledWith('kino', 3);
      expect(cinemasService.searchCinemas).toHaveBeenCalledWith('kino', 3);
    });

    it('should return empty arrays when nothing matches', async () => {
      citiesService.searchCities.mockResolvedValue([]);
      cinemasService.searchCinemas.mockResolvedValue([]);

      const result = await service.search({ query: 'xyz' });

      expect(result).toEqual({ cities: [], cinemas: [] });
    });
  });
});
