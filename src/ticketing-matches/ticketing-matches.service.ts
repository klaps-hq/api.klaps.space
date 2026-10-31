import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TicketingMatchRow } from '../database/schemas/ticketing_matches.schema';
import { TicketingMatchesRepository } from './ticketing-matches.repository';
import type {
  GetTicketingMatchesQueryDto,
  ReviewTicketingMatchDto,
  SaveTicketingMatchesDto,
} from './dto/ticketing-matches.dto';
import type { TicketingMatchResponse } from './ticketing-matches.types';

// Same cut-off as the scraper's isRetroMovieByYear (3 years).
const RETRO_MIN_AGE_YEARS = 3;

const toResponse = (row: TicketingMatchRow): TicketingMatchResponse => ({
  key: row.key,
  provider: row.provider,
  rawTitle: row.rawTitle,
  status: row.status as TicketingMatchResponse['status'],
  filmwebId: row.filmwebId,
  title: row.title,
  year: row.year,
  method: row.method,
  confidence: row.confidence,
  note: row.note,
  result: row.result,
  manual: row.manual,
  reviewedAt: row.reviewedAt?.toISOString() ?? null,
  cinemas: row.cinemas,
  screenings: row.screenings,
  checkedAt: row.checkedAt.toISOString(),
  lastSeenAt: row.lastSeenAt.toISOString(),
});

@Injectable()
export class TicketingMatchesService {
  constructor(private readonly repo: TicketingMatchesRepository) {}

  async getMatches(
    query: GetTicketingMatchesQueryDto,
  ): Promise<TicketingMatchResponse[]> {
    const retroYear = new Date().getFullYear() - RETRO_MIN_AGE_YEARS;
    const rows = await this.repo.findAll(query.review, retroYear);
    return rows.map(toResponse);
  }

  async saveMatches(dto: SaveTicketingMatchesDto): Promise<{ saved: number }> {
    const now = new Date();
    await this.repo.upsertMany(
      dto.matches.map((m) => ({
        key: m.key,
        provider: m.provider,
        rawTitle: m.rawTitle,
        status: m.status,
        filmwebId: m.filmwebId ?? null,
        title: m.title ?? null,
        year: m.year ?? null,
        method: m.method ?? null,
        confidence: m.confidence ?? null,
        note: m.note ?? null,
        result: m.result,
        cinemas: m.cinemas,
        screenings: m.screenings,
        checkedAt: m.checkedAt ? new Date(m.checkedAt) : now,
        lastSeenAt: now,
      })),
    );
    return { saved: dto.matches.length };
  }

  async reviewMatch(
    dto: ReviewTicketingMatchDto,
  ): Promise<TicketingMatchResponse> {
    const row = await this.repo.findByKey(dto.key);
    if (!row) throw new NotFoundException(`Match "${dto.key}" not found`);
    const now = new Date();

    if (dto.reviewed) {
      return toResponse(
        (await this.repo.update(dto.key, { reviewedAt: now }))!,
      );
    }
    if (dto.notFilm) {
      return toResponse(
        (await this.repo.update(dto.key, {
          manual: true,
          reviewedAt: now,
          status: 'not-film',
          filmwebId: null,
          title: null,
          year: null,
          method: 'override',
          confidence: 1,
          note: 'Marked as not a film in the panel',
          result: { status: 'not-film', method: 'override' },
        }))!,
      );
    }
    if (dto.filmwebId) {
      return toResponse(
        (await this.repo.update(dto.key, {
          manual: true,
          reviewedAt: now,
          status: 'matched',
          filmwebId: dto.filmwebId,
          title: dto.title ?? null,
          year: dto.year ?? null,
          method: 'override',
          confidence: 1,
          note: 'Set in the panel',
          result: {
            status: 'matched',
            filmwebId: dto.filmwebId,
            title: dto.title ?? row.rawTitle,
            year: dto.year ?? null,
            method: 'override',
            confidence: 1,
          },
        }))!,
      );
    }
    throw new BadRequestException('Pass filmwebId, notFilm or reviewed');
  }
}
