import { Injectable } from '@nestjs/common';
import type { LandingIntro } from '../database/schemas/landing_intros.schema';
import type { LandingIntroResponse } from './landing-intros.types';
import { LandingIntrosRepository } from './landing-intros.repository';

const mapLandingIntro = (intro: LandingIntro): LandingIntroResponse => ({
  key: intro.key,
  content: intro.content,
  updatedAt: intro.updatedAt.toISOString(),
});

@Injectable()
export class LandingIntrosService {
  constructor(private readonly repo: LandingIntrosRepository) {}

  // === READ ===

  async getLandingIntros(): Promise<LandingIntroResponse[]> {
    const intros = await this.repo.findAll();
    return intros.map(mapLandingIntro);
  }

  async getLandingIntro(key: string): Promise<LandingIntroResponse | null> {
    const intro = await this.repo.findByKey(key);
    return intro ? mapLandingIntro(intro) : null;
  }

  // === WRITE ===

  async upsertLandingIntro(
    key: string,
    content: string,
  ): Promise<LandingIntroResponse> {
    return mapLandingIntro(await this.repo.upsert(key, content.trim()));
  }
}
