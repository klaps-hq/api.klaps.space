import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SocialsActionDto } from './socials-action.dto';
import { GetSocialCandidateQueryDto } from './get-socials-candidate-query.dto';

const platformErrors = async (dto: object) =>
  (await validate(dto)).filter((e) => e.property === 'platform');

describe('socials platforms', () => {
  it.each(['instagram_reel', 'instagram_carousel', 'instagram_post'])(
    'reserve/publish accept %s',
    async (platform) => {
      const dto = plainToInstance(SocialsActionDto, {
        platform,
        screeningId: 1,
      });
      expect(await platformErrors(dto)).toHaveLength(0);
    },
  );

  it('reserve/publish reject an unknown platform', async () => {
    const dto = plainToInstance(SocialsActionDto, {
      platform: 'myspace_post',
      screeningId: 1,
    });
    expect(await platformErrors(dto)).toHaveLength(1);
  });

  it('candidate lookups accept the same new platforms', async () => {
    for (const platform of ['instagram_reel', 'instagram_carousel']) {
      const dto = plainToInstance(GetSocialCandidateQueryDto, {
        platform,
        minScore: 20,
      });
      expect(await platformErrors(dto)).toHaveLength(0);
    }
  });
});
