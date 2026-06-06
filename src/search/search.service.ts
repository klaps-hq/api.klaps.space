import { Injectable } from '@nestjs/common';
import { CitiesService } from '../cities/cities.service';
import { CinemasService } from '../cinemas/cinemas.service';
import type { SearchQueryDto } from './dto/search-query.dto';
import type { SearchResponse } from './search.types';
import { DEFAULT_SEARCH_LIMIT } from './search.constants';

@Injectable()
export class SearchService {
  constructor(
    private readonly citiesService: CitiesService,
    private readonly cinemasService: CinemasService,
  ) {}

  // === READ ===

  async search(dto: SearchQueryDto): Promise<SearchResponse> {
    const limit = dto.limit ?? DEFAULT_SEARCH_LIMIT;

    const [cities, cinemas] = await Promise.all([
      this.citiesService.searchCities(dto.query, limit),
      this.cinemasService.searchCinemas(dto.query, limit),
    ]);

    return { cities, cinemas };
  }
}
