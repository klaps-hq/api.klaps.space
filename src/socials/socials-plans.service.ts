import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SocialsPlansRepository } from './socials-plans.repository';
import type {
  PlanStatus,
  ReplacePlansDto,
  UpdatePlanDto,
} from './dto/socials-plans.dto';

// A screening as the admin panel needs it next to a post.
export interface PlanScreeningResponse {
  id: number;
  date: string;
  movie: {
    id: number;
    slug: string;
    title: string;
    posterUrl: string | null;
    productionYear: number | null;
  } | null;
  cinema: {
    name: string;
    slug: string;
    street: string | null;
    city: string | null;
  } | null;
}

export interface PlanResponse {
  id: string;
  slotKey: string;
  slotAt: string;
  platform: string;
  format: string;
  status: PlanStatus;
  reason: string | null;
  caption: string | null;
  publishedAt: string | null;
  permalink: string | null;
  mediaIds: string[];
  screenings: PlanScreeningResponse[];
}

/** Published post from socials_posts (before plans were recorded). */
export interface HistoryPostResponse {
  platform: string;
  publishedAt: string;
  published: boolean;
  screening: PlanScreeningResponse | null;
}

const MAX_RANGE_MS = 62 * 24 * 60 * 60 * 1000;

type ScreeningRow = Awaited<
  ReturnType<SocialsPlansRepository['findScreeningsByIds']>
>[number];

const toScreening = (s: ScreeningRow): PlanScreeningResponse => ({
  id: s.id,
  // Screenings are stored as Polish wall-clock time; keep the raw value.
  date: s.date.toISOString(),
  movie: s.movie
    ? {
        id: s.movie.id,
        slug: s.movie.slug,
        title: s.movie.title,
        posterUrl: s.movie.posterUrl,
        productionYear: s.movie.productionYear,
      }
    : null,
  cinema: s.cinema
    ? {
        name: s.cinema.name,
        slug: s.cinema.slug,
        street: s.cinema.street,
        city: s.cinema.city?.name ?? null,
      }
    : null,
});

@Injectable()
export class SocialsPlansService {
  constructor(private readonly repo: SocialsPlansRepository) {}

  private range(from: string, to: string): [Date, Date] {
    const a = new Date(from);
    const b = new Date(to);
    if (!(a < b) || b.getTime() - a.getTime() > MAX_RANGE_MS) {
      throw new BadRequestException('Invalid range (max 62 days)');
    }
    return [a, b];
  }

  async getPlans(from: string, to: string): Promise<PlanResponse[]> {
    const [a, b] = this.range(from, to);
    const plans = await this.repo.findPlansInRange(a, b);
    const screenings = await this.repo.findScreeningsByIds([
      ...new Set(plans.flatMap((p) => p.screeningIds)),
    ]);
    const byId = new Map(screenings.map((s) => [s.id, toScreening(s)]));

    return plans.map((p) => ({
      id: p.id,
      slotKey: p.slotKey,
      slotAt: p.slotAt.toISOString(),
      platform: p.platform,
      format: p.format,
      status: p.status as PlanStatus,
      reason: p.reason,
      caption: p.caption,
      publishedAt: p.publishedAt?.toISOString() ?? null,
      permalink: p.permalink,
      mediaIds: p.media.map((m) => m.id),
      screenings: p.screeningIds
        .map((id) => byId.get(id))
        .filter((s): s is PlanScreeningResponse => Boolean(s)),
    }));
  }

  async getHistory(from: string, to: string): Promise<HistoryPostResponse[]> {
    const [a, b] = this.range(from, to);
    const posts = await this.repo.findPostsInRange(a, b);
    const screenings = await this.repo.findScreeningsByIds([
      ...new Set(
        posts
          .map((p) => p.screeningId)
          .filter((id): id is number => id !== null),
      ),
    ]);
    const byId = new Map(screenings.map((s) => [s.id, toScreening(s)]));
    return posts.map((p) => ({
      platform: p.platform,
      publishedAt: p.createdAt.toISOString(),
      published: p.published,
      screening: p.screeningId ? (byId.get(p.screeningId) ?? null) : null,
    }));
  }

  async replacePlans(
    dto: ReplacePlansDto,
  ): Promise<{ slotKey: string; id: string }[]> {
    const [a, b] = this.range(dto.from, dto.to);
    await this.repo.prune();
    return this.repo.replaceWindow(
      a,
      b,
      dto.plans.map((p) => ({
        slotKey: p.slotKey,
        slotAt: new Date(p.slotAt),
        platform: p.platform,
        format: p.format,
        status: p.status,
        reason: p.reason ?? null,
        screeningIds: p.screeningIds,
        caption: p.caption ?? null,
      })),
    );
  }

  async addMedia(
    planId: string,
    file: { buffer: Buffer; mimetype: string },
    position: number,
  ): Promise<{ id: string }> {
    if (!(await this.repo.findPlanById(planId))) {
      throw new NotFoundException('Plan not found');
    }
    return this.repo.insertMedia({
      planId,
      position,
      contentType: file.mimetype,
      data: file.buffer,
    });
  }

  async updatePlan(dto: UpdatePlanDto): Promise<void> {
    const row = await this.repo.updateBySlotKey(dto.slotKey, {
      status: dto.status,
      externalId: dto.externalId ?? null,
      permalink: dto.permalink ?? null,
      reason: dto.reason ?? null,
      ...(dto.status === 'published' ? { publishedAt: new Date() } : {}),
    });
    if (!row) throw new NotFoundException('Plan not found');
  }

  async getMedia(id: string): Promise<{ data: Buffer; contentType: string }> {
    const media = await this.repo.findMediaById(id);
    if (!media) throw new NotFoundException('Media not found');
    return { data: media.data, contentType: media.contentType };
  }
}
